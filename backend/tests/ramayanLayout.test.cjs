const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const source = require('../../library/editions/drafts/ramayan-study-hi.json');
const layout = require('../data/layouts/ramayan-study.json');
const document = require('../../library/documents/valmiki-ramayana-ramakien-study-hi.json');
const { bookReadingBlocks, chapterContext } = require('../dist/services/bookLayoutService');
const { validateDraftEdition } = require('../scripts/import-draft-edition.cjs');
const { loadCatalog } = require('../scripts/library-sources.cjs');
const { preferRamayanText, isLegacyRamayan } = require('../dist/services/ramayanCatalog');
const { requireRamayanConsolidation } = require('../scripts/consolidate-ramayan.cjs');

test('Ramayan accounts for all original pages and keeps the comparative study attributed', () => {
  const validated = validateDraftEdition(source, document);
  assert.equal(validated.sections.length, 60);
  assert.equal(validated.expectedPassages, 1189);
  assert.match(source.title, /करुणा शर्मा/);
  assert.match(source.provenance, /not represented as the primary/);
  const pages = new Set(source.sections.flatMap(s => s.passages.map(p => p.sourcePage)));
  for (const p of source.blankPages) { assert.equal(pages.has(p), false); pages.add(p); }
  assert.deepEqual([...pages].sort((a,b) => a-b), Array.from({ length:266 }, (_,i) => i+1));
  for (const section of source.sections) {
    const blocks = bookReadingBlocks(source.source, section.slug, section.passages);
    assert.equal(blocks.length, section.passages.length);
    for (const [i, passage] of section.passages.entries()) {
      assert.equal(blocks[i].sourcePage, passage.sourcePage);
      assert.deepEqual(blocks[i].parts, [{ reference: passage.reference, start: 0, end: passage.text.length }]);
      assert.equal(layout.sections[section.slug].hashes[passage.reference], createHash('sha256').update(passage.text).digest('hex'));
      assert.doesNotMatch(passage.text, /[\ue000-\uf8ff\ufffd]|््/u);
    }
  }
  const final = source.sections.at(-1);
  assert.equal(layout.sections[final.slug].blocks.at(-1).kind, 'source-note');
  assert.match(final.passages.at(-1).text, /कैयाकेश/);
});

test('Ramayan pagination never mixes original PDF pages or chapters and preserves every source offset', async () => {
  const { paginateMahabharata, isTypesetBook, requiresBookLayout, pageForPassage } = await import('../../frontend/src/lib/mahabharataLayout.js');
  assert.ok(isTypesetBook(source)); assert.ok(requiresBookLayout(source));
  assert.equal(isTypesetBook({ ...source, source: source.sourceDocument }), false);
  const sections = source.sections.map(s => ({ ...s, id:s.slug, readerBlocks:layout.sections[s.slug].blocks,
    passages:s.passages.map(p => ({ ...p, id:p.reference, sectionId:s.slug })) }));
  for (const columns of [24,70]) {
    const pages = paginateMahabharata(sections, { height:480, lineHeight:34, gap:12, treeHeight:320 },
      text => text.split('\n').reduce((h,line) => h+Math.max(1,Math.ceil(line.length/columns))*34,0));
    const offsets = new Map();
    for (const page of pages.slice(2)) {
      assert.equal(page.sectionIds.length,1);
      assert.equal(new Set(page.blocks.map(b => b.sourcePage)).size,1);
      for (const block of page.blocks) for (const part of block.parts) {
        assert.equal(part.passage.sourcePage,page.sourcePage);
        assert.equal(part.start,offsets.get(part.passage.id)||0);
        offsets.set(part.passage.id,part.end);
      }
    }
    for (const section of sections) {
      assert.equal(pages[pageForPassage(pages,section.passages[0].id)].blocks[0].parts[0].passage.id,section.passages[0].id);
      for (const p of section.passages) assert.equal(offsets.get(p.id),p.text.length,p.reference);
    }
  }
});

test('one Ramayan catalog retains searchable names, old links and deterministic preferred text edition', async () => {
  const books = loadCatalog().scriptures;
  assert.equal(books.filter(b => /ramayan/.test(b.slug)).length,1);
  const book = books.find(b => b.slug==='ramayana');
  assert.equal(book.title,'Ramayan'); assert.ok(book.aliases.includes('रामायण'));
  assert.ok(book.aliases.includes('Valmiki Ramayana'));
  assert.equal(document.scriptureSlug,'ramayana');
  assert.ok(isLegacyRamayan('7ef9d10a-ac5f-460b-8bf7-b08d1cb6469a'));
  const editions = [{ id:'scan',source:source.sourceDocument },{ id:'manas',source:'other' },{ id:'text',source:source.source }];
  assert.deepEqual(preferRamayanText(editions).map(e=>e.id),['text','scan','manas']);
  assert.equal(editions[0].id,'scan');
  await assert.rejects(requireRamayanConsolidation({ scripture:{ findUnique:async()=>({ id:'legacy' }) } }),/Refusing/);
  await requireRamayanConsolidation({ scripture:{ findUnique:async()=>null } });
});

test('Ramayan rejects stale text and AI chapter context stays in the selected topic', () => {
  const section = source.sections.find(s=>s.title==='अयोध्या का प्रथम राजा');
  assert.deepEqual(chapterContext(source.source,section).passages,section.passages);
  assert.throws(()=>bookReadingBlocks(source.source,section.slug,section.passages.map((p,i)=>i?p:{ ...p,text:p.text+' ' })),/differs/);
});
