const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadEditions, validateEdition } = require('../scripts/library-sources.cjs');
test('every imported edition has complete chapter counts and unique source references', () => {
  const editions = loadEditions();
  assert.equal(editions.length, 6);
  for (const edition of editions) {
    assert.equal(edition.sections.flatMap(section => section.passages).length, edition.expectedPassages);
    assert.match(edition.checksum, /^[a-f0-9]{64}$/);
  }
  const quran = editions.find(edition => edition.scriptureSlug === 'quran' && edition.language === 'hi');
  assert.ok(quran.sections[0].passages.some(passage => passage.sourceNotes));
});
test('incomplete or placeholder imports are rejected before writing to the database', () => {
  const edition = loadEditions()[0];
  edition.sections[0].passages.pop();
  assert.throws(() => validateEdition(edition), /incomplete/);
  const other = loadEditions()[0];
  other.sections[0].passages[0].text = 'Chapter verses to be added...';
  assert.throws(() => validateEdition(other), /placeholder/);
});
