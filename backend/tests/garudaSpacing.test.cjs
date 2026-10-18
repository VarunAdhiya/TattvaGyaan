const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { originalText, utf16Insertions, remapRange, planChanges } = require('../scripts/apply-garuda-spacing.cjs');
const hash = text => createHash('sha256').update(text).digest('hex');

test('complete Garuda recovery is checksummed and reversible without changing scripture characters', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const file = path.join(__dirname, '../../library/editions/drafts/garuda-purana-hi.json');
  const raw = fs.readFileSync(file, 'utf8');
  const draft = JSON.parse(raw);
  const ledger = JSON.parse(fs.readFileSync(file.replace('.json', '.spacing.json'), 'utf8'));
  // The export ledger hashes LF JSON; Windows Git checkouts may use CRLF.
  // JSON string values retain their escaped scripture whitespace unchanged.
  assert.equal(hash(raw.replace(/\r\n/g, '\n')), ledger.correctedDraftSha256);
  assert.equal(new Set(ledger.pages.map(p => p.page)).size, 620);
  assert.equal(draft.sections.flatMap(s => s.passages).length, 5277);
  let changed = 0;
  for (const section of draft.sections) for (const passage of section.passages) {
    const patch = ledger.passages[passage.reference];
    if (!patch) continue;
    const before = originalText(passage.text, patch);
    assert.equal(before.replace(/\s/gu, ''), passage.text.replace(/\s/gu, ''));
    assert.equal(before.split('\n').length, passage.text.split('\n').length);
    passage.text = before;
    changed += 1;
  }
  assert.equal(changed, Object.keys(ledger.passages).length);
  assert.ok(changed > 4000);
  draft.provenance = ledger.originalProvenance;
  assert.equal(hash(JSON.stringify(draft, null, 2) + '\n'), ledger.originalDraftSha256);
  const manifest = require('../../library/documents/garuda-purana-hi.json');
  const { validateDraftEdition } = require('../scripts/import-draft-edition.cjs');
  const previous = validateDraftEdition(draft, manifest);
  assert.ok(previous.provenance.includes('Blank source PDF pages: 3, 636.'));
  assert.match(previous.provenance, /Draft edition SHA-256: [a-f0-9]{64}$/);
});

test('spacing ledger reverses only inserted spaces and rejects altered scripture', () => {
  const before = 'प्रविष्टहोजाताहै';
  const after = 'प्रविष्ट हो जाता है';
  const insertions = [8, 10, 14];
  const patch = { beforeSha256: hash(before), afterSha256: hash(after), insertions };
  assert.equal(originalText(after, patch), before);
  assert.throws(() => originalText(after.replace('हो', 'था'), patch), /checksum/);
  assert.throws(() => originalText(after, { ...patch, insertions: [1] }), /ledger/);
});

test('existing highlight ranges follow the same characters after space insertion', () => {
  const before = 'एकदोतीन';
  const after = 'एक दो तीन';
  const insertions = [2, 4];
  const mapped = remapRange(2, 4, insertions);
  assert.equal(after.slice(mapped.startOffset, mapped.endOffset), before.slice(2, 4));
  assert.deepEqual(remapRange(2, 2, insertions), { startOffset: 3, endOffset: 3 });
  // Browser offsets are UTF-16, while the Python ledger uses Unicode characters.
  assert.deepEqual(utf16Insertions('😀एकदो', [1, 3]), [2, 4]);
});

test('data repair preserves record identity, is idempotent, and rejects stale text', () => {
  const before = 'एकदो'; const after = 'एक दो';
  const draft = { source: 'garuda', sourceSha256: 'source', provenance: 'new', sections: [{ slug: 'kanda', passages: [{ reference: '1.1', text: after, sortOrder: 1 }] }] };
  const stored = { source: 'garuda', contentStatus: 'draft', expectedPassages: 5277, provenance: 'old', sections: [{ slug: 'kanda', passages: [{ id: 'existing', reference: '1.1', text: before, sortOrder: 1 }] }] };
  const ledger = { sourceSha256: 'source', pages: Array(620).fill({}), originalProvenance: 'old', passages: { '1.1': { beforeSha256: hash(before), afterSha256: hash(after), insertions: [2] } } };
  assert.deepEqual(planChanges(stored, draft, ledger).updates, [{ id: 'existing', text: after, word_count: 2 }]);
  stored.sections[0].passages[0].text = after;
  assert.deepEqual(planChanges(stored, draft, ledger).updates, []);
  stored.sections[0].passages[0].text = 'अन्य पाठ';
  assert.throws(() => planChanges(stored, draft, ledger), /Stored text differs/);
});
