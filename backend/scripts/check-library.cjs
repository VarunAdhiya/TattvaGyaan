require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const { loadCatalog } = require('./library-sources.cjs');
const { scriptureService } = require('../dist/services/scriptureService');
const prisma = require('../dist/lib/prisma').default;
(async () => {
  const catalog = loadCatalog();
  const religions = await prisma.religion.findMany();
  assert.deepEqual(religions.map(item => item.slug), [catalog.religion.slug]);
  const books = await prisma.scripture.findMany({ include: { editions: true } });
  assert.deepEqual(books.map(book => book.slug).sort(), catalog.scriptures.map(book => book.slug).sort());
  assert.ok(books.every(book => book.editions.every(edition => edition.language === catalog.language)));
  for (const book of catalog.scriptures) {
    for (const term of [book.title, ...book.aliases]) {
      const result = await scriptureService.getScriptures({ search: term, page: 1, limit: 20 });
      assert.ok(result.scriptures.some(item => item.slug === book.slug), term + ' must match its catalog entry');
    }
  }
  const full = books.flatMap(book => book.editions).find(edition => edition.contentStatus === 'complete');
  assert.ok(full);
  const sections = await scriptureService.getPassagesForReader(full.id);
  assert.ok(sections.every(section => !('passages' in section)));
  const section = sections.find(section => section._count.passages > 4);
  const secondPage = await scriptureService.getSectionPassages(section.id, 2, 2);
  assert.equal(secondPage.passages.length, 2);
  const position = await scriptureService.getPassagePosition(secondPage.passages[0].id);
  const previous = sections.slice(0, sections.findIndex(item => item.id === section.id));
  assert.equal(position.pageIndex, 3 + previous.reduce((sum, item) => sum + Math.ceil(item._count.passages / 2), 0));
  console.log(JSON.stringify(books.map(book => ({ title: book.title, status: book.availabilityStatus,
    editions: book.editions.map(edition => ({ language: edition.language, status: edition.contentStatus, expectedPassages: edition.expectedPassages })) })), null, 2));
  console.log('Database invariants, title aliases, paginated retrieval, and passage positions passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await prisma.$disconnect();
});
