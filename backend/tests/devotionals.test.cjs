const test = require('node:test');
const assert = require('node:assert/strict');
const snapshot = require('../../library/devotionals/hinduaarti-2026.json');
const { validateSnapshot, importSnapshot } = require('../scripts/import-devotionals.cjs');
const { parseText, canonicalUrl } = require('../scripts/fetch-devotionals.cjs');
const { devotionalFilterSchema, calendarMonthSchema } = require('../dist/validators/devotionalSchema');

test('devotional snapshot has complete, unique catalogs and every day of 2026', () => {
  const data = validateSnapshot(snapshot);
  assert.equal(data.texts.length, 154);
  assert.equal(data.texts.filter(text => text.contentStatus === 'source_link').length, 10);
  assert.equal(data.days.length, 365);
  assert.equal(data.days[0].date, '2026-01-01');
  assert.equal(data.days.at(-1).date, '2026-12-31');
  for (const text of data.texts.filter(text => text.contentStatus === 'source_text')) {
    assert.match(text.hindi, /[\u0900-\u097f]/u);
    assert.ok(text.transliteration.trim());
  }
});

test('import rejects corrupt text, missing days, duplicates, and unsupported locations', () => {
  for (const mutate of [
    data => { data.texts[0].hindi += 'changed'; },
    data => { data.texts[1] = data.texts[0]; },
    data => { data.days.splice(100, 1); },
    data => { data.days[0].data.location = 'Mumbai'; },
    data => { data.days[0].data.date = '2026-02-01'; },
  ]) {
    const data = structuredClone(snapshot);
    mutate(data);
    assert.throws(() => validateSnapshot(data));
  }
});

test('source parser preserves line breaks and never copies source-only lyrics', () => {
  const entry = { id: 'chalisa:example', title: 'Example', titleHindi: 'प्रार्थना', deity: 'Shiva', url: 'https://www.hinduaarti.com/chalisa/example?utm_source=test' };
  const detail = { id: entry.id, text: 'Lyrics (Devanagari):\nप्रार्थना\nपंक्ति\n\nLyrics (transliteration):\nPrarthana\nPankti\n\nMeaning: editorial explanation' };
  const parsed = parseText(entry, detail);
  assert.equal(parsed.hindi, 'प्रार्थना\nपंक्ति');
  assert.equal(parsed.transliteration, 'Prarthana\nPankti');
  assert.equal(parsed.sourceUrl, 'https://www.hinduaarti.com/chalisa/example');
  assert.throws(() => canonicalUrl('https://other.example/prayer'));
  assert.throws(() => parseText(entry, { ...detail, id: 'different' }));
  const linked = parseText({ ...entry, id: 'bhajan:hey-ram-hey-ram' }, detail);
  assert.equal(linked.contentStatus, 'source_link');
  assert.equal(linked.hindi, null);
  assert.equal(linked.transliteration, null);
});

test('reimport preserves existing IDs and performs no writes for unchanged data', async () => {
  const texts = snapshot.texts.map((text, i) => ({ ...text, id: `existing-${i}` }));
  const days = snapshot.days.map(day => ({ ...day, date: new Date(`${day.date}T00:00:00Z`) }));
  const unexpectedWrite = () => { throw new Error('Unexpected write'); };
  const tx = {
    devotionalText: { findMany: async () => texts, createMany: unexpectedWrite, update: unexpectedWrite },
    calendarDay: { findMany: async () => days, createMany: unexpectedWrite, update: unexpectedWrite },
  };
  const result = await importSnapshot({ $transaction: callback => callback(tx) }, snapshot);
  assert.deepEqual(result, { addedTexts: 0, addedDays: 0, updated: 0 });
});

test('API filters reject invalid categories, unbounded pages and invalid calendar dates', () => {
  assert.equal(devotionalFilterSchema.parse({ category: 'mantra' }).limit, 24);
  for (const query of [{ category: 'book' }, { category: 'bhajan', limit: 1000 }, { category: 'chalisa', page: 1.5 }]) {
    assert.equal(devotionalFilterSchema.safeParse(query).success, false);
  }
  assert.equal(calendarMonthSchema.safeParse({ year: 2026, month: 13 }).success, false);
  assert.equal(calendarMonthSchema.safeParse({ year: 2026, month: 0 }).success, false);
});

test('live API serves the imported catalogs, exact prayer text, and full calendar', { skip: !process.env.RUN_LIVE_DEVOTIONALS, timeout: 120000 }, async () => {
  async function get(path) {
    const response = await fetch(`http://localhost:3001/api/devotionals${path}`, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    return response.json();
  }
  for (const category of ['chalisa', 'bhajan', 'mantra']) {
    const expected = snapshot.texts.filter(text => text.category === category);
    const result = await get(`?category=${category}&limit=60`);
    assert.equal(result.total, expected.length);
    assert.deepEqual(result.texts.map(text => text.slug).sort(), expected.map(text => text.slug).sort());
    for (const text of [expected[0], expected.at(-1)]) {
      const { text: actual } = await get(`/${category}/${text.slug}`);
      assert.equal(actual.hindi, text.hindi);
      assert.equal(actual.transliteration, text.transliteration);
      assert.equal(actual.checksum, text.checksum);
    }
  }
  for (let month = 1; month <= 12; month++) {
    const result = await get(`/calendar?year=2026&month=${month}`);
    const expected = snapshot.days.filter(day => Number(day.date.slice(5, 7)) === month);
    assert.deepEqual(result.days.map(day => day.data), expected.map(day => day.data));
    assert.equal(result.timezone, 'Asia/Kolkata');
  }
  const linked = await get('/bhajan/hey-ram-hey-ram');
  assert.equal(linked.text.hindi, null);
  assert.equal((await get('/calendar?year=2027&month=1')).days.length, 0);
  for (const path of ['?category=invalid', '/calendar?year=2026&month=13']) {
    assert.equal((await fetch(`http://localhost:3001/api/devotionals${path}`)).status, 400);
  }
  assert.equal((await fetch('http://localhost:3001/api/devotionals/mantra/not-a-prayer')).status, 404);
});
