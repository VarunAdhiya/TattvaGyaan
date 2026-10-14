const { loadCatalog, loadDocuments } = require('./library-sources.cjs');
const { loadDocumentText } = require('./document-text.cjs');
const fs = require('node:fs');

// Add document editions without removing any existing content or annotations.
async function syncDocuments(tx, catalog, documents) {
  const religion = await tx.religion.upsert({
    where: { slug: catalog.religion.slug }, update: catalog.religion, create: catalog.religion,
  });
  for (const document of documents) {
    const book = catalog.scriptures.find(item => item.slug === document.scriptureSlug);
    const { aliases, ...metadata } = book;
    const data = { ...metadata, religionId: religion.id,
      searchText: [book.title, book.slug.replaceAll('-', ' '), ...aliases, ...book.themes, book.description].join(' ').normalize('NFC') };
    const scripture = await tx.scripture.upsert({ where: { slug: book.slug }, update: data, create: data });
    const { scriptureSlug, pageCount, sha256, ...editionMetadata } = document;
    const editionData = { ...editionMetadata, contentStatus: 'scanned', expectedPassages: null,
      provenance: document.provenance + '\nPDF pages: ' + pageCount + '\nSHA-256: ' + sha256 };
    const existing = await tx.scriptureEdition.findFirst({
      where: { scriptureId: scripture.id, source: document.source, language: document.language },
      include: { _count: { select: { sections: true } } },
    });
    if (existing) {
      const transcribed = existing.contentStatus === 'transcribed' && existing._count.sections > 0 &&
        existing.provenance?.match(/^SHA-256: ([a-f0-9]{64})$/m)?.[1] === sha256;
      // Preserve reviewed text, but still refresh the book's availability below.
      if (!transcribed) {
        if (existing.contentStatus !== 'scanned' || existing._count.sections > 0) {
          throw new Error(document.title + ': refusing to replace a text edition with a scan');
        }
        const priorChecksum = existing.provenance?.match(/SHA-256: ([a-f0-9]{64})/);
        if (priorChecksum && priorChecksum[1] !== sha256) throw new Error(document.title + ': source PDF changed; review before replacing');
        await tx.scriptureEdition.update({ where: { id: existing.id }, data: editionData });
      }
    } else {
      await tx.scriptureEdition.create({ data: { ...editionData, scriptureId: scripture.id } });
    }
    // Restoring/seeding an archived edition must restore its text as well.
    const transcription = loadDocumentText(document);
    if (transcription) {
      const { textPages, checksum, ...input } = transcription;
      const { applyTranscription } = require('./import-transcription.cjs');
      await applyTranscription(tx, document, input, snapshot => {
        const path = require('node:path');
        const { randomUUID } = require('node:crypto');
        const directory = path.resolve(__dirname, '../backups');
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, `restore-text-${randomUUID()}.json`), JSON.stringify(snapshot), { flag: 'wx' });
      });
    }
    const complete = await tx.scriptureEdition.count({ where: { scriptureId: scripture.id, contentStatus: 'complete' } });
    await tx.scripture.update({ where: { id: scripture.id }, data: { availabilityStatus: complete ? 'complete' : 'partial' } });
  }
}

async function importDocuments(apply = false) {
  require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const catalog = loadCatalog();
  const documents = loadDocuments();
  console.log(JSON.stringify({ documents: documents.map(({ title, source, pageCount }) => ({ title, source, pageCount })), apply }));
  if (!apply) return;
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('connection_limit', '1');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  try {
    await prisma.$transaction(tx => syncDocuments(tx, catalog, documents), { timeout: 30000 });
    console.log('PDF editions imported; existing content and annotations preserved.');
  } finally { await prisma.$disconnect(); }
}

module.exports = { syncDocuments };
if (require.main === module) importDocuments(process.argv.includes('--apply')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
