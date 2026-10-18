const test = require('node:test');
const assert = require('node:assert/strict');
const { policy, loadReaderEditions, assertActiveEdition, planEditions, assertStoredText } = require('../scripts/reader-editions.cjs');
const { applyCatalog, fingerprint } = require('../scripts/sync-library.cjs');

test('six books each retain exactly one attributed text edition without PDF dependencies', () => {
  const sources = loadReaderEditions();
  assert.equal(sources.length, 6);
  assert.deepEqual(sources.map(source => source.expectedPassages), [725, 700, 1189, 5277, 4292, 1867]);
  assert.equal(sources.filter(source => source.contentStatus === 'complete').length, 1);
  assert.ok(sources.every(source => !source.source.endsWith('.pdf')));
  assert.throws(() => assertActiveEdition({ scriptureSlug: 'vedas', source: '/library/rigved.pdf', language: 'hi' }), /retired/);
  assert.throws(() => assertActiveEdition({ scriptureSlug: 'bhagavad-gita', source: 'Authentic Canonical Repository', language: 'hi' }), /retired/);
  assert.throws(() => assertActiveEdition({ scriptureSlug: 'ramayana', source: 'urn:sha256:1a40463ae7632cecd9069508e4fb9cc4baae757829a838ee8414c9277c9a2725', language: 'hi' }), /retired/);
  for (const entry of policy) assert.doesNotThrow(() => assertActiveEdition({ ...entry, language: 'hi' }));
});

function fixture() {
  const source = { scriptureSlug: 'book', source: 'source', language: 'hi', contentStatus: 'draft',
    sections: [{ slug: 'chapter', title: 'Chapter', sortOrder: 1, passages: [{ reference: '1.1', text: 'Synthetic test text.', sortOrder: 1 }] }] };
  const edition = { id: 'keep', source: 'source', language: 'hi', contentStatus: 'draft', scripture: { slug: 'book' },
    sections: [{ ...source.sections[0], id: 'keep-section', passages: [{ ...source.sections[0].passages[0], id: 'keep-passage' }] }] };
  const removed = { ...structuredClone(edition), id: 'remove', source: '/library/old.pdf',
    sections: [{ ...structuredClone(edition.sections[0]), id: 'remove-section' }] };
  return { source, edition, removed };
}

test('cleanup selects exact source identities and refuses duplicates or changed text', () => {
  const { source, edition, removed } = fixture();
  const plan = planEditions([removed, edition], [source]);
  assert.deepEqual(plan.removed.map(item => item.id), ['remove']);
  assert.equal(plan.retained[0].edition.id, 'keep');
  assert.throws(() => planEditions([edition, { ...edition, id: 'duplicate' }], [source]), /Duplicate/);
  assert.doesNotThrow(() => assertStoredText(edition, source));
  edition.sections[0].passages[0].text += ' changed';
  assert.throws(() => assertStoredText(edition, source), /stored text differs/);
});

test('cleanup snapshots before deletion, preserves retained records, and is repeatable', async () => {
  const { source, edition, removed } = fixture();
  const original = fingerprint(edition);
  let stored = [edition, removed];
  const events = [];
  const model = name => ({ findMany: async () => [], deleteMany: async args => { events.push([name, args]); } });
  const tx = {
    note: model('notes'), bookmark: model('bookmarks'), highlight: model('highlights'),
    readingProgress: model('progress'), readingPlan: model('plans'), chatConversation: model('conversations'),
    scripturePassage: model('passages'),
    scriptureSection: { ...model('sections'), updateMany: async () => events.push(['unlink-section-parents']) },
    scriptureEdition: { findMany: async () => structuredClone(stored), deleteMany: async ({ where }) => {
      events.push(['editions']); stored = stored.filter(item => !where.id.in.includes(item.id));
    } },
    scripture: { ...model('books'), upsert: async () => ({ id: 'book' }) },
    religion: { upsert: async () => ({ id: 'religion' }) },
  };
  const catalog = { religion: { slug: 'hinduism' }, scriptures: [{ slug: 'book', title: 'Book', aliases: [], themes: [], description: '' }] };
  await assert.rejects(applyCatalog(tx, catalog, [source], () => { throw new Error('Backup failed'); }), /Backup failed/);
  assert.deepEqual(events, []);
  const snapshots = [];
  const result = await applyCatalog(tx, catalog, [source], snapshot => { snapshots.push(snapshot); events.push(['backup']); });
  assert.equal(events[0][0], 'backup');
  assert.deepEqual(result.removedEditions, ['remove']);
  assert.equal(snapshots[0].editions[0].id, 'remove');
  assert.equal(fingerprint(stored[0]), original);
  const repeated = await applyCatalog(tx, catalog, [source], () => {});
  assert.deepEqual(repeated.removedEditions, []);
  assert.equal(fingerprint(stored[0]), original);
});
