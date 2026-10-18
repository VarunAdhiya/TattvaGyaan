require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadCatalog, loadEditions, loadDocuments } = require('./library-sources.cjs');
const { syncDocuments } = require('./import-documents.cjs');

// Catalog policy is data, outside both applications. Runtime readers query PostgreSQL.
async function syncLibrary(apply = false) {
  const catalog = loadCatalog();
  const sources = loadEditions(); // Validate the entire import before opening a transaction.
  const documents = loadDocuments();
  // Imports are sequential and need only one connection, leaving capacity for
  // the running API and session store even on small hosted database pools.
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('connection_limit', '1');
  databaseUrl.searchParams.set('pool_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  try {
    await require('./consolidate-ramayan.cjs').requireRamayanConsolidation(prisma);
    const allowedSlugs = catalog.scriptures.map(book => book.slug);
    const editions = await prisma.scriptureEdition.findMany({ include: { scripture: true } });
    const removed = editions.filter(edition => !allowedSlugs.includes(edition.scripture.slug) ||
      ![catalog.language, 'hindi'].includes(edition.language.toLowerCase()));
    console.log(JSON.stringify({ catalogBooks: allowedSlugs.length, importedEditions: sources.length, documentEditions: documents.length, removedEditions: removed.length, apply }));
    if (!apply) return;
    await prisma.$transaction(async tx => {
      const removedIds = removed.map(edition => edition.id);
      const passageFilter = { section: { editionId: { in: removedIds } } };
      // Preserve a local recovery snapshot before the explicitly requested removal.
      const snapshot = {
        religions: await tx.religion.findMany(),
        scriptures: await tx.scripture.findMany(),
        editions: removed,
        sections: await tx.scriptureSection.findMany({ where: { editionId: { in: removedIds } } }),
        passages: await tx.scripturePassage.findMany({ where: passageFilter }),
        notes: await tx.note.findMany({ where: { passage: passageFilter } }),
        bookmarks: await tx.bookmark.findMany({ where: { passage: passageFilter } }),
        highlights: await tx.highlight.findMany({ where: { passage: passageFilter } }),
        progress: await tx.readingProgress.findMany({ where: { editionId: { in: removedIds } } }),
        plans: await tx.readingPlan.findMany({ where: { editionId: { in: removedIds } }, include: { items: true } }),
        conversations: await tx.chatConversation.findMany({ where: { editionId: { in: removedIds } }, include: { messages: true } }),
      };
      const backupDir = path.resolve(__dirname, '../backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const backup = path.join(backupDir, 'library-' + Date.now() + '.json');
      fs.writeFileSync(backup, JSON.stringify(snapshot), { flag: 'wx' });
      console.log('Recovery snapshot: ' + backup);
      await tx.note.deleteMany({ where: { passage: passageFilter } });
      await tx.bookmark.deleteMany({ where: { passage: passageFilter } });
      await tx.highlight.deleteMany({ where: { passage: passageFilter } });
      await tx.readingProgress.deleteMany({ where: { editionId: { in: removedIds } } });
      await tx.readingPlan.deleteMany({ where: { editionId: { in: removedIds } } });
      await tx.chatConversation.deleteMany({ where: { editionId: { in: removedIds } } });
      await tx.scripturePassage.deleteMany({ where: passageFilter });
      await tx.scriptureSection.deleteMany({ where: { editionId: { in: removedIds } } });
      await tx.scriptureEdition.deleteMany({ where: { id: { in: removedIds } } });
      await tx.scripture.deleteMany({ where: { slug: { notIn: allowedSlugs } } });
      const religion = await tx.religion.upsert({
        where: { slug: catalog.religion.slug }, update: catalog.religion, create: catalog.religion,
      });
      for (const book of catalog.scriptures) {
        const { aliases, ...metadata } = book;
        const data = { ...metadata, religionId: religion.id,
          searchText: [book.title, book.slug.replaceAll('-', ' '), ...aliases, ...book.themes, book.description].join(' ').normalize('NFC') };
        await tx.scripture.upsert({ where: { slug: book.slug }, update: data, create: data });
      }
      await tx.religion.deleteMany({ where: { id: { not: religion.id } } });
      await tx.scriptureEdition.updateMany({ data: { language: catalog.language } });
      for (const source of sources) {
        const scripture = await tx.scripture.findUniqueOrThrow({ where: { slug: source.scriptureSlug } });
        const { sections, scriptureSlug, checksum, ...metadata } = source;
        const provenance = source.provenance + '\nSHA-256: ' + checksum;
        const existing = await tx.scriptureEdition.findFirst({
          where: { scriptureId: scripture.id, source: source.source, language: source.language },
          include: { sections: { include: { passages: true } } },
        });
        if (existing) {
          const stored = new Map(existing.sections.flatMap(section => section.passages).map(passage => [passage.reference, passage]));
          const incoming = sections.flatMap(section => section.passages);
          if (stored.size !== incoming.length || incoming.some(passage =>
            stored.get(passage.reference)?.text !== passage.text ||
            (stored.get(passage.reference)?.sourceNotes || '') !== (passage.sourceNotes || ''))) {
            throw new Error(source.title + ': source changed; review before replacing annotated text');
          }
          await tx.scriptureEdition.update({ where: { id: existing.id }, data: { ...metadata, provenance, contentStatus: 'complete' } });
          for (const section of sections) {
            await tx.scriptureSection.update({ where: { editionId_slug: { editionId: existing.id, slug: section.slug } },
              data: { title: section.title, sortOrder: section.sortOrder } });
          }
          continue;
        }
        const edition = await tx.scriptureEdition.create({ data: { ...metadata, scriptureId: scripture.id, provenance, contentStatus: 'complete' } });
        const records = sections.map(section => ({ ...section, id: randomUUID() }));
        await tx.scriptureSection.createMany({ data: records.map(({ id, title, slug, sortOrder }) => ({ id, editionId: edition.id, title, slug, sortOrder })) });
        const passages = records.flatMap(section => section.passages.map(passage => ({
          ...passage, sectionId: section.id, wordCount: passage.text.trim().split(/\s+/u).length,
        })));
        for (let index = 0; index < passages.length; index += 500) {
          await tx.scripturePassage.createMany({ data: passages.slice(index, index + 500) });
        }
      }
      await syncDocuments(tx, catalog, documents);
      // A scan is available to read, but does not establish textual completeness.
      for (const book of catalog.scriptures) {
        const scripture = await tx.scripture.findUniqueOrThrow({ where: { slug: book.slug } });
        const editions = await tx.scriptureEdition.findMany({ where: { scriptureId: scripture.id } });
        const count = await tx.scripturePassage.count({ where: { section: { edition: { scriptureId: scripture.id } } } });
        const complete = editions.some(edition => edition.contentStatus === 'complete');
        await tx.scripture.update({ where: { id: scripture.id }, data: {
          availabilityStatus: complete ? 'complete' : count || editions.some(edition => edition.contentStatus === 'scanned') ? 'partial' : 'metadata_only',
        } });
      }
    }, { timeout: 180000, maxWait: 10000 });
  } finally { await prisma.$disconnect(); }
}
module.exports = { syncLibrary };
if (require.main === module) syncLibrary(process.argv.includes('--apply')).catch(error => { console.error(error.message); process.exitCode = 1; });
