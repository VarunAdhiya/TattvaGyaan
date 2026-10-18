const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pageChecksum, validateTranscription, mapReadingPosition } = require('../scripts/reviewed-transcription.cjs');
const { applyTranscription } = require('../scripts/import-transcription.cjs');
const { syncDocuments } = require('../scripts/import-documents.cjs');

// Synthetic fixtures only; no generated scripture is imported by these tests.
const document = { source: '/library/test-book.pdf', sha256: 'a'.repeat(64), pageCount: 4,
  language: 'hi', scriptureSlug: 'test-book', title: 'Test book' };
function fixture() {
  const pages = ['', 'Reviewed fixture paragraph\nSecond line.', '', 'Reviewed final fixture paragraph.'].map((text, index) => {
    const page = { number: index + 1, kind: text ? 'text' : 'no_text', text, extractedText: 'Deliberately corrupt raw extraction' };
    page.review = { by: 'Test reviewer', at: '2026-10-14T00:00:00Z', sha256: pageChecksum(page) };
    return page;
  });
  return { formatVersion: 1, source: document.source, sourceSha256: document.sha256, pageCount: 4, pages };
}
function database() {
  const state = { edition: { id: 'existing-scan', contentStatus: 'scanned', provenance: `Original provenance\nSHA-256: ${document.sha256}` },
    sections: [], passages: [], progress: [{ id: 'saved', editionId: 'existing-scan', pageIndex: 4, updatedAt: 'unchanged' }], events: [] };
  const tx = {
    $queryRaw: async () => state.events.push('lock'),
    scriptureEdition: {
      findMany: async () => [{ id: state.edition.id }],
      findUniqueOrThrow: async () => ({ ...state.edition, sections: state.sections.map(section => ({ ...section,
        passages: state.passages.filter(passage => passage.sectionId === section.id) })) }),
      update: async ({ data }) => { state.events.push('activate'); Object.assign(state.edition, data); },
    },
    scriptureSection: { createMany: async ({ data }) => { state.events.push('sections'); state.sections.push(...data); } },
    scripturePassage: { createMany: async ({ data }) => { state.events.push('passages'); state.passages.push(...data); } },
    readingProgress: {
      findMany: async () => structuredClone(state.progress),
      updateMany: async ({ where, data }) => { Object.assign(state.progress.find(item => item.id === where.id), data); },
    },
  };
  return { tx, state };
}

test('only corrected text is imported; raw extraction is excluded from content and identity', () => {
  const source = fixture();
  const validated = validateTranscription(source, document);
  assert.equal(validated.textPages.length, 2);
  assert.equal(validated.textPages[0].text, source.pages[1].text);
  source.pages[1].extractedText = 'Different extraction';
  assert.equal(validateTranscription(source, document).checksum, validated.checksum);
});

test('rejects missing reviews, missing pages, duplicate pages, changed text, and a different original', () => {
  const cases = [
    [value => { value.pages[0].review = null; }, /review.*required/],
    [value => { value.pages.pop(); }, /Every original PDF page/],
    [value => { value.pages[1].number = 1; }, /unique, consecutive/],
    [value => { value.pages[1].text += ' changed'; }, /changed after review/],
    [value => { value.sourceSha256 = 'b'.repeat(64); }, /does not match/],
  ];
  for (const [mutate, error] of cases) {
    const source = fixture(); mutate(source);
    assert.throws(() => validateTranscription(source, document), error);
  }
});

test('requires explicit no-text classification and rejects corrupted or placeholder corrected text', () => {
  for (const text of ['\ufffd', '\ue000', 'OCR_REQUIRED', '']) {
    const source = fixture();
    source.pages[1].text = text;
    source.pages[1].review.sha256 = pageChecksum(source.pages[1]);
    assert.throws(() => validateTranscription(source, document), /require correction|classification/);
  }
  const source = fixture();
  source.pages[0].text = 'This is not a blank page';
  source.pages[0].review.sha256 = pageChecksum(source.pages[0]);
  assert.throws(() => validateTranscription(source, document), /classification/);
});

test('maps reading position past reviewed blank pages and preserves cover and contents', () => {
  const { textPages } = validateTranscription(fixture(), document);
  assert.equal(mapReadingPosition(0, textPages).pageIndex, 0);
  assert.equal(mapReadingPosition(1, textPages).pageIndex, 1);
  assert.equal(mapReadingPosition(2, textPages).pageIndex, 2);
  assert.equal(mapReadingPosition(3, textPages).pageIndex, 2);
  assert.deepEqual(mapReadingPosition(4, textPages), { pageIndex: 3, percentage: 100, textPageIndex: 1 });
  assert.equal(mapReadingPosition(999, textPages).pageIndex, 3);
});

test('drafts cannot touch the database, even when the apply function is called directly', async () => {
  const source = fixture(); source.pages[0].review = null;
  const { tx, state } = database();
  await assert.rejects(applyTranscription(tx, document, source, () => {}), /review.*required/);
  assert.deepEqual(state.events, []);
});

test('imports corrected pages before switching the same edition; reruns preserve passage IDs', async () => {
  const { tx, state } = database();
  const backup = snapshot => {
    assert.equal(snapshot.edition.contentStatus, 'scanned');
    assert.equal(snapshot.progress[0].pageIndex, 4);
    state.events.push('backup');
  };
  await applyTranscription(tx, document, fixture(), backup);
  assert.equal(state.edition.id, 'existing-scan');
  assert.equal(state.edition.contentStatus, 'transcribed');
  assert.equal(state.edition.expectedPassages, 2);
  assert.deepEqual(state.events, ['lock', 'backup', 'sections', 'passages', 'activate']);
  assert.deepEqual(state.passages.map(passage => passage.text), fixture().pages.filter(page => page.kind === 'text').map(page => page.text));
  assert.equal(state.progress[0].pageIndex, 3);
  assert.equal(state.progress[0].passageId, state.passages[1].id);
  const ids = state.passages.map(passage => passage.id);
  const repeated = await applyTranscription(tx, document, fixture(), () => assert.fail('No backup needed for unchanged import'));
  assert.equal(repeated.unchanged, true);
  assert.deepEqual(state.passages.map(passage => passage.id), ids);
  state.passages[0].text = 'An annotated passage was edited';
  await assert.rejects(applyTranscription(tx, document, fixture(), backup), /Stored text.*differs/);
});

test('an import error never activates a text edition; an existing text edition is never overwritten', async () => {
  const { tx, state } = database();
  tx.scripturePassage.createMany = async () => { throw new Error('Database write failed'); };
  await assert.rejects(applyTranscription(tx, document, fixture(), () => {}), /Database write failed/);
  assert.equal(state.edition.contentStatus, 'scanned');
  assert.ok(!state.events.includes('activate'));
  state.edition.contentStatus = 'complete';
  await assert.rejects(applyTranscription(tx, document, fixture(), () => {}), /overwrite an existing text edition/);
});

test('catalog synchronization cannot revert a reviewed transcription to scan mode', async () => {
  let updates = 0;
  let availability;
  const tx = {
    religion: { upsert: async () => ({ id: 'religion' }) },
    scripture: {
      upsert: async () => ({ id: 'book' }),
      update: async ({ data }) => { availability = data.availabilityStatus; },
    },
    scriptureEdition: {
      findFirst: async () => ({ contentStatus: 'transcribed', _count: { sections: 2 }, provenance: `SHA-256: ${document.sha256}` }),
      update: async () => { updates++; },
      count: async () => 0,
    },
  };
  await assert.rejects(syncDocuments(tx, { religion: {}, scriptures: [{ slug: 'test-book', aliases: [], themes: [] }] }, [document]), /PDF editions are retired/);
  assert.equal(updates, 0);
  assert.equal(availability, undefined);
});
