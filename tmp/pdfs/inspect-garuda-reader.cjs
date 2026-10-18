const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env') });
const { PrismaClient } = require(path.join(root, 'backend/node_modules/@prisma/client'));
const { validateDraftEdition, assertStoredDraft } = require(path.join(root, 'backend/scripts/import-draft-edition.cjs'));
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(async () => {
  for (const slug of ['garuda-purana', 'mahabharata']) {
    const book = await prisma.scripture.findUniqueOrThrow({ where: { slug }, include: { editions: { include: { sections: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { passages: true } } } } } } } });
    console.log(JSON.stringify({ slug, scriptureId: book.id, editions: book.editions.map(e => ({ id: e.id, source: e.source, status: e.contentStatus, expectedPassages: e.expectedPassages, sections: e.sections.map(s => ({ id: s.id, slug: s.slug, title: s.title, count: s._count.passages })) })) }));
    if (slug === 'garuda-purana') {
      const draft = book.editions.find(e => e.source.startsWith('urn:sha256:'));
      if (!draft) throw new Error('Garuda draft missing');
      const records = await prisma.scriptureSection.findMany({ where: { editionId: draft.id }, orderBy: { sortOrder: 'asc' }, include: { passages: { orderBy: { sortOrder: 'asc' } } } });
      const input = JSON.parse(fs.readFileSync(path.join(root, 'library/editions/drafts/garuda-purana-hi.json'), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'library/documents/garuda-purana-hi.json'), 'utf8'));
      assertStoredDraft({ ...draft, sections: records }, validateDraftEdition(input, manifest));
      fs.mkdirSync(path.join(root, 'tmp/pdfs/garuda-reader'), { recursive: true });
      fs.writeFileSync(path.join(root, 'tmp/pdfs/garuda-reader/database-book.json'), JSON.stringify({ ...draft, sections: records }));
      console.log('Garuda database matches all 5,277 source passages, metadata, references and source notes.');
    }
  }
})().catch(e => { console.error(e.name?.startsWith('Prisma') ? `Database check failed (${e.code || e.name})` : e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
