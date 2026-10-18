// Narrow, reversible data correction. Never deletes/recreates passage records.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = text => createHash('sha256').update(text).digest('hex');

function originalText(corrected, patch) {
  if (hash(corrected) !== patch.afterSha256) throw new Error('Corrected text checksum mismatch');
  const characters = Array.from(corrected);
  let previous = -1;
  patch.insertions.forEach((offset, index) => {
    if (!Number.isInteger(offset) || offset <= previous || characters[offset + index] !== ' ') throw new Error('Invalid spacing insertion ledger');
    previous = offset;
  });
  const inserted = new Set(patch.insertions.map((offset, index) => offset + index));
  const original = characters.filter((_, index) => !inserted.has(index)).join('');
  if (hash(original) !== patch.beforeSha256) throw new Error('Original text checksum mismatch');
  return original;
}

function utf16Insertions(original, insertions) {
  const offsets = new Set(insertions), result = [];
  let index = 0, offset = 0;
  for (const character of original) {
    if (offsets.has(index)) result.push(offset);
    index += 1;
    offset += character.length;
  }
  return result;
}

function remapRange(start, end, insertions) {
  return { startOffset: start + insertions.filter(position => position <= start).length,
    endOffset: end + insertions.filter(position => position < end || (start === end && position === end)).length };
}

function planChanges(stored, draft, ledger) {
  if (stored.source !== draft.source || stored.contentStatus !== 'draft' || stored.expectedPassages !== 5277 ||
      ledger.sourceSha256 !== draft.sourceSha256 || ledger.pages.length !== 620) throw new Error('Unexpected edition or incomplete recovery');
  const updates = [], positions = new Map();
  if (stored.sections.length !== draft.sections.length) throw new Error('Section count changed');
  for (const section of draft.sections) {
    const saved = stored.sections.find(s => s.slug === section.slug);
    if (!saved || saved.passages.length !== section.passages.length) throw new Error('Passage count changed');
    for (const passage of section.passages) {
      const record = saved.passages.find(p => p.reference === passage.reference);
      if (!record || record.sortOrder !== passage.sortOrder) throw new Error('Passage identity/order changed');
      const patch = ledger.passages[passage.reference];
      if (!patch) {
        if (record.text !== passage.text) throw new Error('Unrelated stored passage changed');
        continue;
      }
      const original = originalText(passage.text, patch);
      if (record.text === passage.text) continue; // Idempotent rerun.
      if (record.text !== original) throw new Error('Stored text differs from the reviewed spacing patch');
      updates.push({ id: record.id, text: passage.text, word_count: passage.text.trim().split(/\s+/u).length });
      positions.set(record.id, utf16Insertions(original, patch.insertions));
    }
  }
  if (![draft.provenance, ledger.originalProvenance].includes(stored.provenance)) throw new Error('Edition provenance changed');
  return { updates, positions };
}

async function main() {
  const draftFile = path.join(root, 'library/editions/drafts/garuda-purana-hi.json');
  const draftText = fs.readFileSync(draftFile, 'utf8');
  const draft = JSON.parse(draftText);
  const ledger = JSON.parse(fs.readFileSync(draftFile.replace('.json', '.spacing.json'), 'utf8'));
  if (hash(draftText) !== ledger.correctedDraftSha256) throw new Error('Draft does not match spacing ledger');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'library/documents/garuda-purana-hi.json'), 'utf8'));
  const { validateDraftEdition, assertStoredDraft } = require('./import-draft-edition.cjs');
  const validated = validateDraftEdition(JSON.parse(draftText), manifest);
  const original = JSON.parse(draftText);
  original.provenance = ledger.originalProvenance;
  for (const section of original.sections) for (const passage of section.passages) {
    const patch = ledger.passages[passage.reference];
    if (patch) passage.text = originalText(passage.text, patch);
  }
  if (hash(JSON.stringify(original, null, 2) + '\n') !== ledger.originalDraftSha256) throw new Error('Reconstructed original draft checksum mismatch');
  // The importer appends source-page verification and a normalized edition
  // checksum. Preserve that full attribution in both preflight and update.
  const previous = validateDraftEdition(original, manifest);
  const correction = { ...draft, provenance: validated.provenance };
  const checkedLedger = { ...ledger, originalProvenance: previous.provenance };
  require('dotenv').config({ path: path.join(root, 'backend/.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const load = tx => tx.scriptureEdition.findFirstOrThrow({
    where: { source: draft.source, language: 'hi', scripture: { slug: 'garuda-purana' } },
    include: { sections: { orderBy: { sortOrder: 'asc' }, include: { passages: { orderBy: { sortOrder: 'asc' } } } } },
  });
  try {
    const stored = await load(prisma);
    const initial = planChanges(stored, correction, checkedLedger);
    console.log(JSON.stringify({ editionId: stored.id, passagesToUpdate: initial.updates.length, mode: process.argv.includes('--apply') ? 'apply' : 'dry-run' }));
    if (!process.argv.includes('--apply')) return;
    await prisma.$transaction(async tx => {
      // Lock the specific edition and existing passages during the correction.
      await tx.$queryRaw`SELECT id FROM scripture_editions WHERE id = ${stored.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT p.id FROM scripture_passages p JOIN scripture_sections s ON s.id = p.section_id WHERE s.edition_id = ${stored.id} FOR UPDATE OF p`;
      const current = await load(tx);
      const plan = planChanges(current, correction, checkedLedger);
      const ids = plan.updates.map(p => p.id);
      const highlights = ids.length ? await tx.highlight.findMany({ where: { passageId: { in: ids } } }) : [];
      const backupDir = path.join(root, 'backend/backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const backup = path.join(backupDir, `garuda-spacing-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify({ edition: current, highlights }), { flag: 'wx' });
      for (let i = 0; i < plan.updates.length; i += 400) {
        const batch = plan.updates.slice(i, i + 400);
        const count = await tx.$executeRaw`UPDATE scripture_passages p SET text = u.text, word_count = u.word_count FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS u(id text, text text, word_count integer) WHERE p.id = u.id`;
        if (count !== batch.length) throw new Error('Unexpected update count');
      }
      for (const highlight of highlights) {
        const range = remapRange(highlight.startOffset, highlight.endOffset, plan.positions.get(highlight.passageId));
        await tx.highlight.update({ where: { id: highlight.id }, data: range });
      }
      await tx.scriptureEdition.update({ where: { id: stored.id }, data: { provenance: validated.provenance } });
      const after = await load(tx);
      assertStoredDraft(after, validated);
      const beforeIds = current.sections.flatMap(s => s.passages.map(p => p.id));
      if (JSON.stringify(beforeIds) !== JSON.stringify(after.sections.flatMap(s => s.passages.map(p => p.id)))) throw new Error('Passage IDs changed');
      console.log(JSON.stringify({ verifiedPassages: beforeIds.length, remappedHighlights: highlights.length, backup }));
    }, { timeout: 120000, maxWait: 20000 });
    console.log('Spacing correction committed; all passage IDs preserved.');
  } finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Database correction failed (${error.code || error.name})` : error.message);
  process.exitCode = 1;
});
module.exports = { originalText, utf16Insertions, remapRange, planChanges };
