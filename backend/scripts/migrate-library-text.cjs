const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { loadDocuments } = require('./library-sources.cjs');
const { applyTranscription } = require('./import-transcription.cjs');
const { loadDocumentText, assertStoredText, archivePdf } = require('./document-text.cjs');

async function migrateLibraryText(args) {
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/migrate-library-text.cjs [--apply]');
  const apply = args.includes('--apply');
  const documents = loadDocuments();
  const prepared = documents.map(document => ({ document, transcription: loadDocumentText(document) }));
  const missing = prepared.filter(item => !item.transcription).map(item => item.document.source);
  console.log(JSON.stringify({ books: documents.length, ready: prepared.length - missing.length, missing, apply }));
  if (missing.length) throw new Error('All source pages need corrected, reviewed text before migrating or removing any PDFs.');

  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    // A dry run verifies imports inside a transaction, then deliberately rolls it back.
    const dryRun = new Error('Dry run complete');
    try {
      await prisma.$transaction(async tx => {
        for (const { document, transcription } of prepared) {
          const { textPages, checksum, ...input } = transcription;
          const imported = await applyTranscription(tx, document, input, snapshot => {
            if (!apply) return;
            const directory = path.resolve(__dirname, '../backups');
            fs.mkdirSync(directory, { recursive: true });
            fs.writeFileSync(path.join(directory, `before-text-${Date.now()}-${randomUUID()}.json`),
              JSON.stringify(snapshot), { flag: 'wx' });
          });
          const edition = await tx.scriptureEdition.findUniqueOrThrow({ where: { id: imported.editionId },
            include: { sections: { include: { passages: true } } } });
          assertStoredText(edition, transcription);
          console.log(JSON.stringify({ source: document.source, ...imported }));
        }
        if (!apply) throw dryRun;
      }, { timeout: 300000, maxWait: 10000 });
    } catch (error) { if (error !== dryRun) throw error; }
    if (!apply) {
      console.log('Dry run passed; database writes rolled back and PDFs preserved.');
      return;
    }
    // The transaction committed successfully before touching any public files.
    // Copy/check/remove is resumable if a filesystem operation is interrupted.
    for (const { document } of prepared) archivePdf(document);
    console.log('All seven PDF editions now read from database text. Frontend PDFs removed; originals archived in backend/data/source-pdfs.');
  } finally { await prisma.$disconnect(); }
}

if (require.main === module) migrateLibraryText(process.argv.slice(2)).catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Text migration failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
