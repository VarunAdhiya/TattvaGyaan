const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../../library/editions/drafts/garuda-purana-hi.json');
const audit = require('../../library/editions/drafts/garuda-purana-hi.audit.json');
const manifest = require('../data/layouts/garuda-purana.json');
const { buildLayout } = require('../scripts/build-garuda-layout.cjs');
const { bookReadingBlocks, chapterContext } = require('../dist/services/bookLayoutService');

test('Garuda layout is reproducible from its complete source audit', () => {
  assert.deepEqual(buildLayout(source, audit), manifest);
  assert.equal(Object.values(manifest.sections).flatMap(s => s.blocks).filter(b => b.kind === 'chapter').length, 273);
  const contents = manifest.sections.contents.blocks;
  assert.ok(contents.filter(b => b.kind === 'contents-entry').length > 200);
  assert.ok(contents.every(b => ['contents-entry', 'source-note'].includes(b.kind)), 'Printed index entries must not be merged into prose');
});

test('Garuda pagination preserves every source offset and starts each topic on a new leaf', async () => {
  const { paginateMahabharata, isTypesetBook } = await import('../../frontend/src/lib/mahabharataLayout.js');
  assert.equal(isTypesetBook(source), true);
  assert.equal(isTypesetBook({ ...source, source: '/library/garuda-purana.pdf' }), false);
  const sections = source.sections.map(section => ({ ...section, id: section.slug,
    passages: section.passages.map(p => ({ ...p, id: p.reference, sectionId: section.slug })),
    readerBlocks: bookReadingBlocks(source.source, section.slug, section.passages),
  }));
  for (const chars of [24, 70]) {
    const pages = paginateMahabharata(sections, { height: 480, lineHeight: 34, gap: 12, treeHeight: 320 }, text => Math.max(1, Math.ceil(text.length / chars)) * 34);
    const recovered = new Map();
    for (const page of pages.slice(2)) {
      assert.equal(page.sectionIds.length, 1);
      for (let i = 0; i < page.blocks.length; i += 1) {
        const block = page.blocks[i];
        if (block.kind === 'chapter' && !block.continued) assert.equal(i, 0, 'New topics cannot begin halfway down a leaf');
        assert.notEqual(block.kind, 'tree', 'Garuda must never use the Mahabharat family tree');
        for (const part of block.parts) {
          assert.equal(part.start, recovered.get(part.passage.id) || 0, part.passage.id);
          recovered.set(part.passage.id, part.end);
        }
      }
    }
    assert.equal(recovered.size, 5277);
    for (const section of sections) for (const p of section.passages) assert.equal(recovered.get(p.id), p.text.length, p.id);
  }
});

test('chapter summaries select exact source ranges and reject stale text or foreign chapters', () => {
  const section = source.sections.find(s => s.slug === 'achara-kanda');
  const selected = chapterContext(source.source, section, 'pdf-20-line-23');
  assert.equal(selected.title, 'सृष्टि-वर्णन');
  assert.ok(selected.passages.length > 1 && selected.passages.length < section.passages.length);
  assert.equal(selected.passages[0].text.trim(), 'सृष्टि-वर्णन');
  const next = chapterContext(source.source, section, 'pdf-22-line-39');
  // The next title also occurs in a printed running header before the boundary.
  // Its actual opening narration must not leak into the preceding summary.
  assert.ok(!selected.passages.some(p => p.text.includes(next.passages[1].text)));
  assert.throws(() => chapterContext('/library/other.pdf', section, 'pdf-20-line-23'));
  assert.throws(() => chapterContext(source.source, section, 'pdf-615-line-44'));
  const changed = section.passages.map((p, i) => i ? p : { ...p, text: p.text + 'changed' });
  assert.throws(() => bookReadingBlocks(source.source, section.slug, changed), /differs/);
});
