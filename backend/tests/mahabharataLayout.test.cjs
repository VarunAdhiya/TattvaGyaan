const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../../library/editions/drafts/bal-mahabharat-katha-hi.json');
const sections = source.sections.map(section => ({ ...section, id: section.slug,
  passages: section.passages.map(passage => ({ ...passage, id: passage.reference, sectionId: section.slug })) }));

test('book pagination preserves all 725 passages without character loss or duplication at multiple sizes', async () => {
  const { paginateMahabharata, familyTreeNodes, pageForPassage } = await import('../../frontend/src/lib/mahabharataLayout.js');
  for (const charsPerLine of [20, 42, 75]) {
    const pages = paginateMahabharata(sections, { height: 420, lineHeight: 36, gap: 12, treeHeight: 320 },
      text => Math.ceil(text.length / charsPerLine) * 36);
    const recovered = new Map();
    for (const page of pages.slice(2)) {
      assert.ok(page.blocks.length);
      for (const block of page.blocks) {
        const parts = block.kind === 'tree' ? familyTreeNodes(block.parts.map(part => part.passage)) : block.parts;
        for (const part of parts) {
          const entries = recovered.get(part.passage.id) || [];
          entries.push(part);
          recovered.set(part.passage.id, entries);
        }
      }
    }
    assert.equal(recovered.size, 725);
    for (const section of sections) for (const passage of section.passages) {
      const parts = recovered.get(passage.id).sort((a, b) => a.start - b.start);
      let end = 0;
      for (const part of parts) {
        assert.equal(part.start, end, 'Gap or duplication in ' + passage.id);
        end = part.end;
        assert.ok(pageForPassage(pages, passage.id, part.start) >= 2);
      }
      assert.equal(end, passage.text.length);
      assert.equal(parts.map(part => passage.text.slice(part.start, part.end)).join(''), passage.text);
    }
    const treePage = pages[pageForPassage(pages, '3.19')];
    assert.ok(treePage.blocks.some(block => block.kind === 'tree'));
    assert.ok(treePage.passages.some(passage => passage.id === '3.27'));
  }
});

test('column continuations join and the family tree follows its introductory paragraphs', async () => {
  const { readingBlocks, isMahabharataProse } = await import('../../frontend/src/lib/mahabharataLayout.js');
  assert.ok(readingBlocks(sections[0]).some(block => block.parts.map(part => part.passage.id).join(',') === '1.3,1.4'));
  const chapter = readingBlocks(sections[2]);
  assert.equal(chapter.at(-1).kind, 'tree');
  assert.equal(chapter.at(-2).parts.at(-1).passage.id, '3.23');
  assert.ok(isMahabharataProse(source));
  assert.equal(isMahabharataProse({ ...source, source: '/library/ramcharitmanas.pdf' }), false);
});

test('every chapter starts on a new leaf without losing chapter navigation', async () => {
  const { paginateMahabharata, pageForPassage } = await import('../../frontend/src/lib/mahabharataLayout.js');
  const chapters = Array.from({ length: 12 }, (_, index) => ({ id: `chapter-${index}`, title: `Chapter ${index}`,
    passages: [{ id: `short-${index}`, sectionId: `chapter-${index}`, text: 'A complete short paragraph.' }] }));
  const pages = paginateMahabharata(chapters, { height: 420, lineHeight: 36, gap: 12, treeHeight: 320 }, () => 36);
  assert.equal(pages.length, chapters.length + 2, 'Each chapter needs its own leaf');
  for (const page of pages.slice(2)) {
    assert.notEqual(page.blocks.at(-1).kind, 'heading');
    assert.notEqual(page.blocks[0].kind, 'heading', 'The existing running header labels the first chapter');
  }
  for (const chapter of chapters) {
    const page = pages[pageForPassage(pages, chapter.passages[0].id)];
    assert.deepEqual(page.sectionIds, [chapter.id]);
    assert.equal(page.sectionId, chapter.id);
    assert.equal(page.blocks[0].parts[0].passage.id, chapter.passages[0].id);
  }
});

test('complete reader text is limited to supported typeset sources and position lookups remain lightweight', async () => {
  const prisma = require('../dist/lib/prisma').default;
  const { scriptureService } = require('../dist/services/scriptureService');
  const originalEdition = prisma.scriptureEdition.findUnique;
  const originalSections = prisma.scriptureSection.findMany;
  let edition = { id: 'book', ...source };
  let query;
  prisma.scriptureEdition.findUnique = async () => edition;
  prisma.scriptureSection.findMany = async options => { query = options; return []; };
  try {
    await scriptureService.getPassagesForReader('book', true);
    assert.equal(query.select.passages.select.text, true);
    assert.deepEqual(query.select.passages.orderBy, [{ sortOrder: 'asc' }, { id: 'asc' }]);
    await scriptureService.getPassagesForReader('book');
    assert.equal(query.select.passages, false);
    edition = { ...edition, source: require('../dist/services/bookLayoutService').GARUDA_SOURCE };
    await scriptureService.getPassagesForReader('book', true);
    assert.equal(query.select.passages.select.text, true);
    edition = { ...edition, source: require('../dist/services/bookLayoutService').MANUSMRITI_SOURCE };
    await scriptureService.getPassagesForReader('book', true);
    assert.equal(query.select.passages.select.text, true);
    edition = { ...edition, source: '/library/other-book.pdf' };
    await assert.rejects(scriptureService.getPassagesForReader('book', true), /Edition not found/);
  } finally {
    prisma.scriptureEdition.findUnique = originalEdition;
    prisma.scriptureSection.findMany = originalSections;
  }
});
