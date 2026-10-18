const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Prisma } = require('@prisma/client');
const { loadCatalog, loadDocuments } = require('./library-sources.cjs');
const { applyDraftEdition, validateDraftEdition } = require('./import-draft-edition.cjs');
const OLD_SLUG = 'valmiki-ramayana-ramakien-study';

async function requireRamayanConsolidation(tx) {
  if (await tx.scripture.findUnique({ where: { slug: OLD_SLUG }, select: { id: true } })) {
    throw new Error('Run node scripts/consolidate-ramayan.cjs --apply first. Refusing to recreate or remove existing Ramayan editions and saved data.');
  }
}

async function consolidate(tx, book, draft, document, backup, progress = () => {}) {
  await tx.$queryRaw`SELECT set_config('idle_in_transaction_session_timeout', '30s', true)`;
  const existing = await tx.scripture.findMany({ where: { slug: { in: ['ramayana', OLD_SLUG] } }, include: { editions: true } });
  const canonical = existing.find(s => s.slug === 'ramayana');
  const legacy = existing.find(s => s.slug === OLD_SLUG);
  if (!canonical) throw new Error('Import the base Ramayan catalog before consolidation.');
  for (const scripture of [...existing].sort((a,b) => a.id.localeCompare(b.id))) {
    await tx.$queryRaw`SELECT id FROM scriptures WHERE id = ${scripture.id} FOR UPDATE`;
  }
  if (legacy?.editions.some(old => canonical.editions.some(e => e.source === old.source && e.language === old.language))) {
    throw new Error('Duplicate editions exist across the two collections; refusing to replace annotated content.');
  }
  // Only collection ownership and catalog metadata change. Snapshot all private
  // reading data before writes; none of these rows are deleted or recreated.
  const editionIds = existing.flatMap(s => s.editions.map(e => e.id));
  const passageFilter = { section: { editionId: { in: editionIds } } };
  const fingerprints = () => tx.$queryRaw`SELECT s.edition_id, count(p.id)::int AS count,
    md5(string_agg(p.id || chr(31) || p.section_id || chr(31) || p.reference || chr(31) || p.sort_order::text || chr(31) || p.text || chr(31) || coalesce(p.source_notes, ''), chr(30) ORDER BY p.id)) AS hash
    FROM scripture_passages p JOIN scripture_sections s ON s.id = p.section_id
    WHERE s.edition_id IN (${Prisma.join(editionIds)}) GROUP BY s.edition_id ORDER BY s.edition_id`;
  const snapshot = { scriptures: existing,
    passageFingerprints: await fingerprints(),
    sections: await tx.scriptureSection.findMany({ where: { editionId: { in: editionIds } } }),
    notes: await tx.note.findMany({ where: { passage: passageFilter } }),
    bookmarks: await tx.bookmark.findMany({ where: { passage: passageFilter } }),
    highlights: await tx.highlight.findMany({ where: { passage: passageFilter } }),
    progress: await tx.readingProgress.findMany({ where: { editionId: { in: editionIds } } }),
    plans: await tx.readingPlan.findMany({ where: { editionId: { in: editionIds } }, include: { items: true } }),
    conversations: await tx.chatConversation.findMany({ where: { editionId: { in: editionIds } }, include: { messages: true } }),
  };
  await backup(snapshot);
  if (legacy) {
    await tx.scriptureEdition.updateMany({ where: { scriptureId: legacy.id }, data: { scriptureId: canonical.id } });
    if (await tx.scriptureEdition.count({ where: { scriptureId: legacy.id } })) throw new Error('Legacy collection is not empty.');
    await tx.scripture.delete({ where: { id: legacy.id } });
  }
  const { aliases, ...metadata } = book;
  await tx.scripture.update({ where: { id: canonical.id }, data: { ...metadata,
    searchText: [book.title, book.slug.replaceAll('-', ' '), ...aliases, ...book.themes, book.description].join(' ').normalize('NFC'),
  } });
  const result = await applyDraftEdition(tx, draft, document, backup, progress);
  if (JSON.stringify(await fingerprints()) !== JSON.stringify(snapshot.passageFingerprints)) throw new Error('Existing passage identity or content changed.');
  // Verify original edition/section IDs and ownership after the move.
  const retained = await tx.scriptureEdition.findMany({ where: { id: { in: editionIds } } });
  if (retained.length !== editionIds.length || retained.some(e => e.scriptureId !== canonical.id)) throw new Error('Existing edition verification failed.');
  for (const edition of retained) {
    const before = existing.flatMap(s => s.editions).find(e => e.id === edition.id);
    for (const key of Object.keys(before).filter(key => key !== 'scriptureId')) {
      if (JSON.stringify(edition[key]) !== JSON.stringify(before[key])) throw new Error('Existing edition metadata changed: ' + key);
    }
  }
  return { ...result, retainedEditionIds: editionIds, movedEditionIds: legacy?.editions.map(e => e.id) || [], removedEmptyCollection: legacy?.id || null };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const book = loadCatalog().scriptures.find(s => s.slug === 'ramayana');
  const document = loadDocuments().find(d => d.source === '/library/valmiki-ramayana-ramakien-study.pdf');
  const draft = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../library/editions/drafts/ramayan-study-hi.json'), 'utf8'));
  validateDraftEdition(draft, document);
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1'); url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const books = await prisma.scripture.findMany({ where: { slug: { in: ['ramayana', OLD_SLUG] } },
      select: { id: true, slug: true, editions: { select: { id: true, title: true, contentStatus: true } } } });
    console.log(JSON.stringify({ apply, books, newDraftPassages: draft.expectedPassages }));
    if (!apply) return;
    const backup = data => {
      const directory = path.resolve(__dirname, '../backups'); fs.mkdirSync(directory, { recursive: true });
      const filename = path.join(directory, `ramayan-merge-${Date.now()}-${randomUUID()}.json`);
      fs.writeFileSync(filename, JSON.stringify(data), { flag: 'wx' });
      console.log('Recovery snapshot: ' + filename);
    };
    const result = await prisma.$transaction(tx => consolidate(tx, book, draft, document, backup,
      progress => console.log(JSON.stringify(progress))), { timeout: 180000, maxWait: 10000 });
    console.log(JSON.stringify(result));
  } finally { await prisma.$disconnect(); }
}
module.exports = { consolidate, requireRamayanConsolidation };
if (require.main === module) main().catch(error => { console.error(error.name?.startsWith('Prisma') ? `Database update failed (${error.code || error.name})` : error.message); process.exitCode = 1; });
