const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const source = require('../../library/editions/drafts/manusmriti-hi.json');
const layout = require('../data/layouts/manusmriti.json');
const { bookReadingBlocks, chapterContext } = require('../dist/services/bookLayoutService');
const sha = text => createHash('sha256').update(text).digest('hex');

test('Manusmriti layout preserves every source character and separates Sanskrit, Hindi, topics and contents', () => {
  assert.equal(layout.source, source.source);
  let passages = 0;
  for (const section of source.sections) {
    const blocks = bookReadingBlocks(source.source, section.slug, section.passages);
    for (const passage of section.passages) {
      passages += 1;
      assert.equal(layout.sections[section.slug].hashes[passage.reference], sha(passage.text));
      let offset = 0;
      for (const part of blocks.flatMap(b => b.parts).filter(p => p.reference === passage.reference)) {
        assert.equal(part.start, offset);
        assert.ok(part.end > offset);
        offset = part.end;
      }
      assert.equal(offset, passage.text.length, passage.reference);
    }
  }
  assert.equal(passages, 1867);
  assert.equal(layout.sections['front-matter'].blocks.filter(b => b.kind === 'contents-entry').length, 76);
  const first = layout.sections['chapter-1'].blocks;
  assert.deepEqual(first.slice(2, 6).map(b => b.kind), ['verse', 'verse', 'verse', 'paragraph']);
  const second = layout.sections['chapter-2'].blocks;
  assert.ok(second.some(b => b.kind === 'verse' && new Set(b.parts.map(p => p.reference)).size === 2), 'A shloka spanning PDF pages must be joined');
  assert.ok(second.some(b => b.kind === 'topic' && b.keepWithNext));
  assert.ok(!Object.values(layout.sections).flatMap(s => s.blocks).some(b => b.kind === 'tree'));
});

test('all Manusmriti chapters start on fresh leaves and pagination keeps original passage offsets', async () => {
  const { paginateMahabharata, isTypesetBook, pageForPassage } = await import('../../frontend/src/lib/mahabharataLayout.js');
  assert.equal(isTypesetBook(source), true);
  assert.equal(isTypesetBook({ ...source, source: '/library/manusmriti-sampurna.pdf' }), false);
  const sections = source.sections.map(s => ({ ...s, id: s.slug, readerBlocks: layout.sections[s.slug].blocks,
    passages: s.passages.map(p => ({ ...p, id: p.reference, sectionId: s.slug })) }));
  for (const columns of [24, 70]) {
    const pages = paginateMahabharata(sections, { height: 480, lineHeight: 34, gap: 12, treeHeight: 320 },
      text => text.split('\n').reduce((height, line) => height + Math.max(1, Math.ceil(line.length / columns)) * 34, 0));
    const offsets = new Map();
    for (const page of pages.slice(2)) {
      assert.equal(page.sectionIds.length, 1);
      for (const block of page.blocks) for (const part of block.parts) {
        assert.equal(part.start, offsets.get(part.passage.id) || 0);
        offsets.set(part.passage.id, part.end);
      }
    }
    for (const section of sections) {
      const first = pages[pageForPassage(pages, section.passages[0].id)];
      assert.equal(first.blocks[0].parts[0].passage.id, section.passages[0].id);
      for (const passage of section.passages) assert.equal(offsets.get(passage.id), passage.text.length);
    }
  }
});

test('short verse units move intact and topic headings retain following content', async () => {
  const { paginateMahabharata } = await import('../../frontend/src/lib/mahabharataLayout.js');
  const paragraphs = ['filler', 'verse', 'topic', 'explanation'].map((text, i) => ({ id: String(i), reference: String(i), text }));
  const section = { id: 'chapter', passages: paragraphs, readerBlocks: paragraphs.map((p, i) => ({
    kind: ['paragraph', 'verse', 'topic', 'paragraph'][i], keepTogether: i === 1, keepWithNext: i === 2,
    parts: [{ reference: p.reference, start: 0, end: p.text.length }],
  })) };
  const heights = { filler: 80, verse: 40, topic: 20, explanation: 40 };
  const pages = paginateMahabharata([section], { height: 100, lineHeight: 20, gap: 10 }, text => heights[text] || 20);
  assert.deepEqual(pages.slice(2).map(p => p.blocks.map(b => b.kind)), [['paragraph'], ['verse'], ['topic', 'paragraph']]);
});

test('Manusmriti rejects stale layouts and summaries retain the exact selected chapter', () => {
  const section = source.sections.find(s => s.slug === 'chapter-8');
  const context = chapterContext(source.source, section);
  assert.deepEqual(context.passages, section.passages);
  assert.throws(() => bookReadingBlocks(source.source, section.slug, section.passages.map((p, i) => i ? p : { ...p, text: p.text + ' ' })), /differs/);
  assert.throws(() => chapterContext(source.source, section, 'pdf-20-line-23'), /does not belong/);
});

test('verse numbers and contents leaders keep exact selectable text', async () => {
  const { bookTextRuns } = await import('../../frontend/src/lib/bookTextRuns.js');
  for (const [kind, text, className] of [['verse', 'श्लोक ।\nदूसरी पंक्ति ॥१२॥\n', 'book-verse-number'],
    ['contents-entry', 'प्रस्तावना ........................................ 6', 'book-contents-leader']]) {
    const runs = bookTextRuns(text, kind);
    assert.equal(runs.map(r => r.text).join(''), text);
    assert.ok(runs.some(r => r.className === className));
  }
});
