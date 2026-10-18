require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadCatalog } = require('./library-sources.cjs');
const { loadReaderEditions, planEditions, assertStoredText } = require('./reader-editions.cjs');

const editionQuery = { include: { scripture: true, sections: { include: { passages: true } } } };
function fingerprint(edition) {
  return createHash('sha256').update(JSON.stringify({ ...edition, scripture: undefined,
    sections: [...edition.sections].sort((a, b) => a.id.localeCompare(b.id)).map(section => ({ ...section,
      passages: [...section.passages].sort((a, b) => a.id.localeCompare(b.id)),
    })),
  })).digest('hex');
}

async function applyCatalog(tx, catalog, sources, writeBackup) {
  const before = await tx.scriptureEdition.findMany(editionQuery);
  const { retained, removed } = planEditions(before, sources);
  for (const item of retained) if (item.edition) assertStoredText(item.edition, item.source);
  const keptHashes = new Map(retained.filter(item => item.edition).map(item => [item.edition.id, fingerprint(item.edition)]));
  const editionIds = removed.map(item => item.id);
  const sectionIds = removed.flatMap(item => item.sections.map(section => section.id));
  const passageFilter = { sectionId: { in: sectionIds } };
  const progressFilter = { OR: [{ editionId: { in: editionIds } }, { sectionId: { in: sectionIds } }] };
  const planFilter = { OR: [{ editionId: { in: editionIds } }, { items: { some: { sectionId: { in: sectionIds } } } }] };
  const snapshot = {
    createdAt: new Date().toISOString(), reason: 'User-requested single text edition catalog; remove PDFs, Ramcharitmanas, Vedas and legacy Gita sample',
    scriptures: await tx.scripture.findMany(), editions: removed,
    notes: await tx.note.findMany({ where: { passage: passageFilter } }),
    bookmarks: await tx.bookmark.findMany({ where: { passage: passageFilter } }),
    highlights: await tx.highlight.findMany({ where: { passage: passageFilter } }),
    progress: await tx.readingProgress.findMany({ where: progressFilter }),
    plans: await tx.readingPlan.findMany({ where: planFilter, include: { items: true } }),
    conversations: await tx.chatConversation.findMany({ where: { editionId: { in: editionIds } }, include: { messages: true } }),
  };
  await writeBackup(snapshot);
  await tx.note.deleteMany({ where: { passage: passageFilter } });
  await tx.bookmark.deleteMany({ where: { passage: passageFilter } });
  await tx.highlight.deleteMany({ where: { passage: passageFilter } });
  await tx.readingProgress.deleteMany({ where: progressFilter });
  await tx.readingPlan.deleteMany({ where: planFilter });
  await tx.chatConversation.deleteMany({ where: { editionId: { in: editionIds } } });
  await tx.scripturePassage.deleteMany({ where: passageFilter });
  await tx.scriptureSection.updateMany({ where: { id: { in: sectionIds } }, data: { parentId: null } });
  await tx.scriptureSection.deleteMany({ where: { id: { in: sectionIds } } });
  await tx.scriptureEdition.deleteMany({ where: { id: { in: editionIds } } });
  await tx.scripture.deleteMany({ where: { slug: { notIn: catalog.scriptures.map(book => book.slug) } } });
  const religion = await tx.religion.upsert({ where: { slug: catalog.religion.slug }, update: catalog.religion, create: catalog.religion });
  for (const book of catalog.scriptures) {
    const { aliases, ...metadata } = book;
    const source = sources.find(item => item.scriptureSlug === book.slug);
    const data = { ...metadata, religionId: religion.id, availabilityStatus: source.contentStatus === 'complete' ? 'complete' : 'partial',
      ...(book.slug === 'ramayana' ? { summary: null } : {}),
      searchText: [book.title, book.slug.replaceAll('-', ' '), ...aliases, ...book.themes, book.description].join(' ').normalize('NFC') };
    const scripture = await tx.scripture.upsert({ where: { slug: book.slug }, update: data, create: data });
    if (retained.find(item => item.source.scriptureSlug === book.slug).edition) continue;
    const { sections, scriptureSlug, ...editionData } = source;
    const edition = await tx.scriptureEdition.create({ data: { ...editionData, scriptureId: scripture.id } });
    const records = sections.map(section => ({ ...section, id: randomUUID() }));
    await tx.scriptureSection.createMany({ data: records.map(({ id, title, slug, sortOrder }) => ({ id, title, slug, sortOrder, editionId: edition.id })) });
    const passages = records.flatMap(section => section.passages.map(passage => ({ ...passage, sectionId: section.id,
      wordCount: passage.text.trim().split(/\s+/u).length })));
    for (let index = 0; index < passages.length; index += 500) await tx.scripturePassage.createMany({ data: passages.slice(index, index + 500) });
  }
  const after = await tx.scriptureEdition.findMany(editionQuery);
  if (after.length !== sources.length) throw new Error('Expected exactly one edition per catalog book.');
  for (const item of planEditions(after, sources).retained) {
    if (!item.edition) throw new Error('A preferred edition is missing after cleanup.');
    assertStoredText(item.edition, item.source);
    if (keptHashes.has(item.edition.id) && keptHashes.get(item.edition.id) !== fingerprint(item.edition)) {
      throw new Error('Retained edition text, IDs or metadata changed; rolling back.');
    }
  }
  return { removedEditions: editionIds, retained: after.map(edition => ({ id: edition.id, book: edition.scripture.slug,
    status: edition.contentStatus, passages: edition.sections.reduce((sum, section) => sum + section.passages.length, 0) })) };
}

async function syncLibrary(apply = false) {
  const catalog = loadCatalog();
  const sources = loadReaderEditions();
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    if (!apply) {
      const editions = await prisma.scriptureEdition.findMany(editionQuery);
      const plan = planEditions(editions, sources);
      for (const item of plan.retained) if (item.edition) assertStoredText(item.edition, item.source);
      console.log(JSON.stringify({ apply: false, retained: plan.retained.map(item => ({ book: item.source.scriptureSlug,
        id: item.edition?.id, passages: item.source.expectedPassages, action: item.edition ? 'preserve' : 'import' })),
      removed: plan.removed.map(item => ({ id: item.id, title: item.title, source: item.source,
        passages: item.sections.reduce((sum, section) => sum + section.passages.length, 0) })) }, null, 2));
      return;
    }
    const result = await prisma.$transaction(tx => applyCatalog(tx, catalog, sources, snapshot => {
      const directory = path.resolve(__dirname, '../backups');
      fs.mkdirSync(directory, { recursive: true });
      const backup = path.join(directory, `single-edition-${Date.now()}-${randomUUID()}.json`);
      fs.writeFileSync(backup, JSON.stringify(snapshot), { flag: 'wx' });
      console.log('Recovery snapshot: ' + backup);
    }), { timeout: 180000, maxWait: 10000, isolationLevel: 'Serializable' });
    console.log(JSON.stringify(result, null, 2));
  } finally { await prisma.$disconnect(); }
}

module.exports = { syncLibrary, applyCatalog, fingerprint };
if (require.main === module) syncLibrary(process.argv.includes('--apply')).catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Catalog sync failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
