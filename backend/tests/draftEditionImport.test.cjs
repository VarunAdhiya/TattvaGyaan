const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateDraftEdition, applyDraftEdition } = require('../scripts/import-draft-edition.cjs');

const document = { scriptureSlug: 'fixture', language: 'hi', source: '/library/fixture.pdf',
  sha256: 'a'.repeat(64), pageCount: 2, license: 'Fixture attribution' };
function fixture() {
  return { scriptureSlug: 'fixture', title: 'Synthetic draft fixture', language: 'hi', script: 'Devanagari',
    isOriginal: false, textDirection: 'ltr', source: `urn:sha256:${document.sha256}`, license: document.license,
    provenance: 'Synthetic test only', reviewStatus: 'unreviewed-draft', sourceDocument: document.source,
    sourceSha256: document.sha256, sourcePageCount: 2, illustrationOnlyPages: [2], expectedPassages: 1,
    sections: [{ slug: 'chapter-1', title: 'Fixture chapter', sortOrder: 1, expectedPassages: 1,
      passages: [{ reference: '1.1', text: 'Synthetic fixture text.', sortOrder: 1, sourcePage: 1 }] }] };
}
function database() {
  const state = { scripture: { id: 'book', availabilityStatus: 'partial' }, editions: [], sections: [], passages: [], backups: 0 };
  const hydrate = edition => ({ ...edition, sections: state.sections.filter(s => s.editionId === edition.id)
    .map(s => ({ ...s, passages: state.passages.filter(p => p.sectionId === s.id) })) });
  const tx = {
    $queryRaw: async () => [],
    scripture: { findUniqueOrThrow: async () => state.scripture,
      update: async ({ data }) => Object.assign(state.scripture, data) },
    scriptureEdition: {
      findMany: async () => state.editions.map(hydrate),
      create: async ({ data }) => { state.editions.push(data); return data; },
      findUniqueOrThrow: async ({ where }) => hydrate(state.editions.find(e => e.id === where.id)),
      count: async () => 0,
    },
    scripturePassage: {
      createMany: async ({ data }) => state.passages.push(...data.map((p, i) => ({ ...p, id: 'passage-' + i }))),
      findMany: async ({ where, orderBy, skip, take }) => state.passages
        .filter(passage => passage.sectionId === where.sectionId)
        .sort((a, b) => orderBy.sortOrder === 'asc' ? a.sortOrder - b.sortOrder : b.sortOrder - a.sortOrder)
        .slice(skip, skip + take),
    },
    scriptureSection: { createMany: async ({ data }) => state.sections.push(...data) },
  };
  return { state, tx, backup: async () => { state.backups++; } };
}

test('draft import preserves draft status, exact text, source notes and IDs on reruns', async () => {
  const { tx, state, backup } = database();
  const first = await applyDraftEdition(tx, fixture(), document, backup);
  assert.equal(state.editions[0].contentStatus, 'draft');
  assert.equal(state.scripture.availabilityStatus, 'partial');
  assert.equal(state.passages[0].text, fixture().sections[0].passages[0].text);
  assert.match(state.passages[0].sourceNotes, /page 1.*SHA-256/);
  const passageId = state.passages[0].id;
  const repeated = await applyDraftEdition(tx, fixture(), document, backup);
  assert.equal(repeated.editionId, first.editionId);
  assert.equal(repeated.unchanged, true);
  assert.equal(state.passages[0].id, passageId);
  assert.equal(state.backups, 1);
  state.passages[0].text = 'An existing annotated passage changed';
  await assert.rejects(applyDraftEdition(tx, fixture(), document, backup), /refusing to overwrite/);
  assert.equal(state.passages[0].text, 'An existing annotated passage changed');
});

test('draft import rejects false review status, mismatched source, missing pages and broken ordering before database access', async () => {
  for (const mutate of [
    input => { input.reviewStatus = 'reviewed'; },
    input => { input.sourceSha256 = 'b'.repeat(64); },
    input => { input.illustrationOnlyPages = []; },
    input => { input.sections[0].sortOrder = 5; },
    input => { input.sections[0].passages[0].sourcePage = 2; },
  ]) {
    const input = fixture(); mutate(input);
    await assert.rejects(applyDraftEdition({}, input, document, () => assert.fail('Must not write')));
  }
});

test('the supplied Mahabharata draft validates without changing any scripture text', () => {
  const input = require('../../library/editions/drafts/bal-mahabharat-katha-hi.json');
  const manifest = require('../../library/documents/bal-mahabharat-katha-hi.json');
  const source = validateDraftEdition(input, manifest);
  assert.equal(source.sections.length, 41);
  assert.equal(source.expectedPassages, 725);
  assert.deepEqual(source.sections.flatMap(s => s.passages.map(p => p.text)), input.sections.flatMap(s => s.passages.map(p => p.text)));
});

test('visually checked blank pages cover source pages without invented passages', () => {
  const input = fixture();
  input.illustrationOnlyPages = [];
  input.blankPages = [2];
  input.blankPageVerification = 'Source page 2 was rendered and visually checked: blank.';
  const result = validateDraftEdition(input, document);
  assert.equal(result.expectedPassages, 1);
  assert.match(result.provenance, /Blank source PDF pages: 2/);
  for (const mutate of [
    draft => { delete draft.blankPageVerification; },
    draft => { draft.blankPages = [2, 2]; },
    draft => { draft.blankPages = [3]; },
    draft => { draft.blankPages = [1]; },
    draft => { draft.illustrationOnlyPages = [2]; },
  ]) {
    const changed = structuredClone(input);
    mutate(changed);
    assert.throws(() => validateDraftEdition(changed, document));
  }
});

test('large drafts insert every passage across batch boundaries before verification', async () => {
  const input = fixture();
  const count = 1001;
  const sample = input.sections[0].passages[0];
  input.expectedPassages = count;
  input.sections[0].expectedPassages = count;
  input.sections[0].passages = Array.from({ length: count }, (_, index) => ({
    ...sample, reference: `1.${index + 1}`, sortOrder: index + 1,
  }));
  const { tx, state, backup } = database();
  const progress = [];
  await applyDraftEdition(tx, input, document, backup, step => progress.push(step));
  assert.equal(state.passages.length, count);
  assert.equal(state.passages.at(-1).reference, '1.1001');
  assert.deepEqual(progress.filter(p => p.stage === 'passages').map(p => p.inserted), [1000, 1001]);
  assert.equal(progress.at(-1).stage, 'verifying-stored-text');
  const rerun = await applyDraftEdition(tx, input, document, backup);
  assert.equal(rerun.unchanged, true);
  state.passages.reverse();
  assert.equal((await applyDraftEdition(tx, input, document, backup)).unchanged, true);
});
