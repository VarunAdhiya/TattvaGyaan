// Read-only comparison of every imported passage through the application's API.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { validateDraftEdition } = require('./import-draft-edition.cjs');

async function main() {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/verify-draft-api.cjs <draft.json>');
  const input = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
  const directory = path.resolve(__dirname, '../../library/documents');
  const document = fs.readdirSync(directory).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(directory, f), 'utf8')))
    .find(d => d.source === input.sourceDocument);
  const source = validateDraftEdition(input, document);
  const base = process.env.LIBRARY_API_BASE || 'http://127.0.0.1:3001/api';
  async function get(endpoint) {
    const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(60000) });
    assert.ok(response.ok, `API ${endpoint}: HTTP ${response.status}`);
    return response.json();
  }
  // Search matches title/aliases, not slugs (e.g. shiva-purana). Resolve the
  // exact slug in the paginated catalog without relying on display spelling.
  let book;
  for (let page = 1; !book; page++) {
    const catalog = await get(`/scriptures?page=${page}&limit=100`);
    book = catalog.scriptures.find(s => s.slug === source.scriptureSlug);
    if (page >= catalog.pagination.totalPages) break;
  }
  assert.ok(book, 'Catalog book exists');
  const { scripture } = await get('/scriptures/' + book.id);
  const matches = scripture.editions.filter(e => e.source === source.source && e.language === source.language);
  assert.equal(matches.length, 1);
  const edition = matches[0];
  assert.equal(edition.contentStatus, 'draft');
  assert.equal(edition.expectedPassages, source.expectedPassages);
  assert.ok(scripture.editions.some(e => e.source === input.sourceDocument), 'Original PDF edition retained');
  const { sections } = await get('/passages/edition/' + edition.id);
  assert.equal(sections.length, source.sections.length);
  let count = 0;
  const pages = new Set([...(input.blankPages || []), ...(input.illustrationOnlyPages || [])]);
  for (let index = 0; index < sections.length; index++) {
    const saved = sections[index];
    const expected = source.sections[index];
    assert.equal(saved.slug, expected.slug);
    assert.equal(saved.title, expected.title);
    // The metadata endpoint omits sortOrder; the matching slug at each array
    // index verifies its ordered result without requiring an unexposed field.
    assert.equal(saved._count.passages, expected.expectedPassages);
    const passages = [];
    const totalPages = Math.ceil(expected.expectedPassages / 100);
    for (let page = 1; page <= totalPages; page += 3) {
      const numbers = Array.from({ length: Math.min(3, totalPages - page + 1) }, (_, i) => page + i);
      const results = await Promise.all(numbers.map(n => get(`/passages/section/${saved.id}?page=${n}&limit=100`)));
      passages.push(...results.flatMap(r => r.passages));
    }
    assert.equal(passages.length, expected.passages.length);
    passages.forEach((passage, position) => {
      const original = expected.passages[position];
      for (const field of ['text', 'reference', 'sortOrder', 'sourceNotes']) {
        assert.equal(passage[field], original[field], `${saved.slug}/${position + 1}: ${field}`);
      }
      pages.add(input.sections[index].passages[position].sourcePage);
    });
    count += passages.length;
    console.log(JSON.stringify({ verifiedSection: saved.slug, passages: passages.length, totalVerified: count }));
  }
  assert.equal(count, source.expectedPassages);
  assert.equal(pages.size, input.sourcePageCount);
  const result = { allTextMatches: true, sections: sections.length, passages: count,
    sourcePages: pages.size, defaultEdition: scripture.editions[0].id === edition.id,
    readerPath: `/reader/${book.id}/${edition.id}` };
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
