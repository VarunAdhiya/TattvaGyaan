const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../../library/editions/gita-hi.json');
const { bookReadingBlocks, GITA_SOURCE, TYPESET_SOURCES } = require('../dist/services/bookLayoutService');
const sections = source.sections.map(section => ({ ...section, id: section.slug,
  passages: section.passages.map(passage => ({ ...passage, id: passage.reference, sectionId: section.slug })),
  readerBlocks: bookReadingBlocks(source.source, section.slug, section.passages),
}));

test('Gita uses one explicit block per verse, including chapter 3, and only the attributed Hindi source opts in', async () => {
  const { readingBlocks, isTypesetBook, requiresBookLayout, GITA_SOURCE: frontendSource } = await import('../../frontend/src/lib/mahabharataLayout.js');
  assert.equal(frontendSource, GITA_SOURCE);
  assert.ok(TYPESET_SOURCES.includes(source.source));
  assert.ok(isTypesetBook(source));
  assert.ok(requiresBookLayout(source));
  assert.equal(isTypesetBook({ ...source, language: 'en' }), false);
  assert.equal(isTypesetBook({ ...source, source: 'unverified-sample' }), false);
  for (const section of sections) {
    const blocks = readingBlocks(section);
    assert.equal(blocks.length, section.passages.length);
    blocks.forEach((block, index) => {
      assert.equal(block.kind, 'translation');
      assert.equal(block.keepTogether, true);
      assert.equal(block.parts.length, 1);
      assert.equal(block.parts[0].passage.id, section.passages[index].id);
    });
  }
});

test('all 700 Gita verses survive reflow exactly, retain navigable IDs, and start chapters on separate leaves', async () => {
  const { paginateMahabharata, pageForPassage } = await import('../../frontend/src/lib/mahabharataLayout.js');
  for (const charsPerLine of [16, 40, 75]) {
    const pages = paginateMahabharata(sections, { height: 420, lineHeight: 36, gap: 12, treeHeight: 320 },
      text => Math.ceil(text.length / charsPerLine) * 36);
    const recovered = new Map();
    for (const page of pages.slice(2)) {
      assert.equal(page.sectionIds.length, 1);
      for (const block of page.blocks) {
        assert.equal(block.kind, 'translation');
        for (const part of block.parts) {
          const parts = recovered.get(part.passage.id) || [];
          parts.push(part);
          recovered.set(part.passage.id, parts);
          assert.ok(pageForPassage(pages, part.passage.id, part.start) >= 2);
        }
      }
    }
    assert.equal(recovered.size, 700);
    for (const section of sections) {
      assert.equal(pages[pageForPassage(pages, section.passages[0].id)].blocks[0].parts[0].passage.id, section.passages[0].id);
      for (const passage of section.passages) {
        let end = 0;
        const parts = recovered.get(passage.id);
        for (const part of parts) { assert.equal(part.start, end); end = part.end; }
        assert.equal(end, passage.text.length);
        assert.equal(parts.map(part => passage.text.slice(part.start, part.end)).join(''), passage.text);
      }
    }
  }
});

test('reader API serves Gita text and verse blocks while position lookups stay lightweight', async () => {
  const prisma = require('../dist/lib/prisma').default;
  const { scriptureService } = require('../dist/services/scriptureService');
  const originalEdition = prisma.scriptureEdition.findUnique;
  const originalSections = prisma.scriptureSection.findMany;
  let query;
  prisma.scriptureEdition.findUnique = async () => ({ id: 'gita', ...source });
  prisma.scriptureSection.findMany = async options => { query = options; return sections; };
  try {
    const result = await scriptureService.getPassagesForReader('gita', true);
    assert.equal(query.select.passages.select.text, true);
    assert.deepEqual(result.map(section => section.readerBlocks), sections.map(section => section.readerBlocks));
    await scriptureService.getPassagesForReader('gita');
    assert.equal(query.select.passages, false);
  } finally {
    prisma.scriptureEdition.findUnique = originalEdition;
    prisma.scriptureSection.findMany = originalSections;
  }
});
