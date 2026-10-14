const fs = require('node:fs');
const path = require('node:path');
const { loadDocuments } = require('./library-sources.cjs');
const { pageChecksum } = require('./reviewed-transcription.cjs');

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  console.log(JSON.stringify({ databaseConfigured: Boolean(process.env.DATABASE_URL),
    localOcrModelsPresent: ['hin', 'san', 'eng'].every(language =>
      fs.existsSync(path.resolve(__dirname, `../data/ocr-models/${language}.traineddata`))) }));
  for (const document of loadDocuments()) {
    const directory = path.resolve(__dirname, '../data/transcription-drafts');
    const draft = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => file.endsWith('.json'))
      .map(file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')))
      .find(item => item.source === document.source) : null;
    console.log(JSON.stringify({ source: document.source, pages: document.pageCount,
      reviewedPages: draft?.pages.filter(page => page.review?.sha256 === pageChecksum(page)).length || 0 }));
  }
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const editions = await prisma.scriptureEdition.findMany({ select: {
      id: true, source: true, contentStatus: true, expectedPassages: true,
      scripture: { select: { slug: true } }, sections: { select: { _count: { select: { passages: true } } } },
    } });
    for (const edition of editions) console.log(JSON.stringify({ book: edition.scripture.slug,
      editionId: edition.id, status: edition.contentStatus,
      expectedPassages: edition.expectedPassages,
      storedPassages: edition.sections.reduce((sum, section) => sum + section._count.passages, 0) }));
  } finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Database assessment failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
