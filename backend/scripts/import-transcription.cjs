const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { loadDocuments } = require('./library-sources.cjs');
const { validateTranscription, mapReadingPosition } = require('./reviewed-transcription.cjs');
const { assertStoredText } = require('./document-text.cjs');

async function applyTranscription(tx, document, input, writeBackup) {
  const transcription = validateTranscription(input, document);
  const matches = await tx.scriptureEdition.findMany({
    where: { source: document.source, language: document.language, scripture: { slug: document.scriptureSlug } },
    select: { id: true },
  });
  if (matches.length !== 1) throw new Error('Expected exactly one existing PDF edition; no content was changed.');
  const id = matches[0].id;
  await tx.$queryRaw`SELECT id FROM scripture_editions WHERE id = ${id} FOR UPDATE`;
  const edition = await tx.scriptureEdition.findUniqueOrThrow({ where: { id }, include: { sections: { include: { passages: true } } } });
  const marker = `Reviewed transcription SHA-256: ${transcription.checksum}`;
  if (edition.contentStatus === 'transcribed' && edition.provenance?.split('\n').includes(marker)) {
    assertStoredText(edition, transcription);
    return { editionId: id, unchanged: true, passages: transcription.textPages.length };
  }
  if (edition.contentStatus !== 'scanned' || edition.sections.length) {
    throw new Error('Refusing to overwrite an existing text edition or its annotations.');
  }
  const priorChecksum = edition.provenance?.match(/^SHA-256: ([a-f0-9]{64})$/m)?.[1];
  if (priorChecksum !== document.sha256) throw new Error('Database edition does not match the verified source PDF.');
  const progress = await tx.readingProgress.findMany({ where: { editionId: id } });
  await writeBackup({ edition, progress, sourceSha256: document.sha256, transcription });

  const sections = transcription.textPages.map(page => ({
    id: randomUUID(), editionId: id, title: `Source PDF page ${page.number}`,
    slug: `pdf-page-${page.number}`, sortOrder: page.number - 1,
  }));
  const passages = transcription.textPages.map((page, index) => ({
    id: randomUUID(), sectionId: sections[index].id, reference: `PDF page ${page.number}`,
    text: page.text, wordCount: page.text.trim().split(/\s+/u).length, sortOrder: 0,
    sourceNotes: `Original PDF page ${page.number}. Corrected transcription reviewed by ${page.review.by} on ${page.review.at}. Source SHA-256: ${document.sha256}.`,
  }));
  for (let index = 0; index < sections.length; index += 200) {
    await tx.scriptureSection.createMany({ data: sections.slice(index, index + 200) });
    await tx.scripturePassage.createMany({ data: passages.slice(index, index + 200) });
  }
  for (const saved of progress) {
    const position = mapReadingPosition(saved.pageIndex, transcription.textPages);
    const { textPageIndex, ...data } = position;
    await tx.readingProgress.updateMany({
      where: { id: saved.id, updatedAt: saved.updatedAt },
      data: { ...data, sectionId: sections[textPageIndex]?.id || null, passageId: passages[textPageIndex]?.id || null },
    });
  }
  // Only this final transaction step activates the existing database text reader.
  // Transcribed describes source fidelity, not completeness of the entire work.
  await tx.scriptureEdition.update({ where: { id }, data: {
    contentStatus: 'transcribed', expectedPassages: passages.length,
    provenance: `${edition.provenance}\n${marker}\nAll ${document.pageCount} source pages reviewed; ${passages.length} contain text. Page references preserve the supplied edition; no verse numbering was inferred.`,
  } });
  return { editionId: id, unchanged: false, passages: passages.length, reviewedPages: document.pageCount };
}

async function main(args) {
  const apply = args.includes('--apply');
  const filenames = args.filter(arg => arg !== '--apply');
  if (filenames.length !== 1 || filenames[0].startsWith('--')) {
    throw new Error('Usage: node scripts/import-transcription.cjs <corrected-book.json> [--apply]');
  }
  const input = JSON.parse(fs.readFileSync(path.resolve(filenames[0]), 'utf8'));
  const document = loadDocuments().find(item => item.source === input.source);
  if (!document) throw new Error('The transcription source is outside the document catalog.');
  const result = validateTranscription(input, document);
  console.log(JSON.stringify({ source: document.source, reviewedPages: result.pages.length,
    textPages: result.textPages.length, checksum: result.checksum, apply }));
  if (!apply) return;

  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const imported = await prisma.$transaction(tx => applyTranscription(tx, document, input, snapshot => {
      const directory = path.resolve(__dirname, '../backups');
      fs.mkdirSync(directory, { recursive: true });
      const filename = path.join(directory, `transcription-${Date.now()}-${randomUUID()}.json`);
      fs.writeFileSync(filename, JSON.stringify(snapshot), { flag: 'wx' });
      console.log(`Recovery snapshot: ${filename}`);
    }), { timeout: 180000, maxWait: 10000 });
    console.log(JSON.stringify(imported));
  } finally { await prisma.$disconnect(); }
}

module.exports = { applyTranscription };
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  // Prisma errors may include connection details; only validation text is public.
  console.error(error.name?.startsWith('Prisma') ? `Database import failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
