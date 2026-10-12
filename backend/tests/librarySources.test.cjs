const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadCatalog, loadEditions, validateEdition } = require('../scripts/library-sources.cjs');
test('imports only attributed editions in the configured catalog and language', () => {
  const catalog = loadCatalog();
  const editions = loadEditions();
  assert.equal(catalog.scriptures.length, 6);
  assert.ok(editions.length > 0);
  for (const edition of editions) {
    assert.equal(edition.language, catalog.language);
    assert.ok(catalog.scriptures.some(book => book.slug === edition.scriptureSlug));
    assert.equal(edition.sections.flatMap(section => section.passages).length, edition.expectedPassages);
    assert.match(edition.checksum, /^[a-f0-9]{64}$/);
  }
});
test('rejects incomplete, duplicated and placeholder scripture before import', () => {
  const edition = loadEditions()[0];
  edition.sections[0].passages.pop();
  assert.throws(() => validateEdition(edition), /incomplete/);
  const other = loadEditions()[0];
  other.sections[0].passages[0].text = 'Chapter verses to be added...';
  assert.throws(() => validateEdition(other), /placeholder/);
  const duplicate = loadEditions()[0];
  duplicate.sections[0].passages[1].reference = duplicate.sections[0].passages[0].reference;
  assert.throws(() => validateEdition(duplicate), /duplicate/);
});
