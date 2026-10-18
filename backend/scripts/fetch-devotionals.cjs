const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { callSource } = require('./hinduaarti-client.cjs');

// These modern songs need a specific republication grant. Keep their catalog
// entries and canonical links; never copy their lyrics into the data snapshot.
const SOURCE_ONLY = new Set([
  'hey-ram-hey-ram', 'tum-hi-ho-mata-pita', 'aisi-lagi-lagan',
  'kanha-so-ja-zara', 'jag-mein-sundar-hai-do-naam', 'ram-ayenge',
  'bam-bam-bhole', 'shiv-shiv-shankar', 'jai-bholenath', 'sai-ram-sai-shyam',
]);

const canonicalUrl = value => {
  const url = new URL(value);
  if (url.origin !== 'https://www.hinduaarti.com') throw new Error('Unexpected source host');
  url.search = '';
  url.hash = '';
  return url.href;
};

function parseText(entry, detail) {
  const [category, slug] = entry.id.split(':');
  if (!['chalisa', 'bhajan', 'mantra'].includes(category) || !/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid source identity');
  const base = {
    sourceId: entry.id, category, slug, title: entry.title, titleHindi: entry.titleHindi,
    deity: entry.deity, sourceUrl: canonicalUrl(entry.url),
    attribution: 'Traditional text sourced from Hindu Aarti; Roman transliteration by Hindu Aarti.',
    contentStatus: SOURCE_ONLY.has(slug) ? 'source_link' : 'source_text',
    hindi: null, transliteration: null,
  };
  if (base.contentStatus === 'source_text') {
    if (detail?.id !== entry.id) throw new Error(`Source identity mismatch: ${entry.id}`);
    const match = detail.text.match(/Lyrics \(Devanagari\):\n([\s\S]*?)\n\nLyrics \(transliteration\):\n([\s\S]*?)(?:\n\nMeaning:|$)/);
    if (!match || !match[1].trim() || !match[2].trim() || !/[\u0900-\u097f]/u.test(match[1])) throw new Error(`Missing source lyrics: ${entry.id}`);
    base.hindi = match[1].trim();
    base.transliteration = match[2].trim();
  } else {
    base.attribution = 'Catalog reference: Hindu Aarti. Full lyrics are available at the source.';
  }
  base.checksum = createHash('sha256').update(JSON.stringify([base.hindi, base.transliteration])).digest('hex');
  return base;
}

async function fetchSnapshot(year) {
  const texts = [];
  for (const category of ['chalisa', 'bhajan', 'mantra']) {
    const index = await callSource('list_texts', { type: category });
    if (!index.count || index.count !== index.texts.length) throw new Error('Incomplete source catalog');
    for (const entry of index.texts) {
      const slug = entry.id.split(':')[1];
      const detail = SOURCE_ONLY.has(slug) ? null : await callSource('fetch', { id: entry.id });
      texts.push(parseText(entry, detail));
    }
    console.log(`Fetched ${index.count} ${category} entries`);
  }
  const festivalSource = await callSource('get_festivals');
  const days = [];
  // Bounded batches avoid overwhelming the public source. Every date is fetched,
  // including leap days; dates and timings are never calculated or invented here.
  const dates = [];
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10));
  for (let start = 0; start < dates.length; start += 3) {
    const batch = await Promise.all(dates.slice(start, start + 3).map(async date => {
      const data = await callSource('get_panchang', { date });
      if (data.date !== date || !data.tithi?.name || !data.nakshatra?.name || !data.sunrise || !data.sunset) throw new Error(`Incomplete calendar: ${date}`);
      return { date, data, sourceUrl: `https://www.hinduaarti.com/hindu-calendar?year=${year}&month=${Number(date.slice(5, 7)) - 1}` };
    }));
    days.push(...batch);
    if (start % 60 === 0) console.log(`Fetched calendar days ${days.length}/${dates.length}`);
  }
  return { version: 1, source: 'https://www.hinduaarti.com/', rightsSource: 'https://www.hinduaarti.com/about', fetchedAt: new Date().toISOString(), year, festivalYear: festivalSource.year, calendarNote: festivalSource.note, texts, days };
}

module.exports = { parseText, canonicalUrl, SOURCE_ONLY, fetchSnapshot };
if (require.main === module) {
  const year = Number(process.argv[2] || new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Year must be 2000–2100');
  fetchSnapshot(year).then(snapshot => {
    const directory = path.resolve(__dirname, '../../library/devotionals');
    fs.mkdirSync(directory, { recursive: true });
    const filename = path.join(directory, `hinduaarti-${year}.json`);
    fs.writeFileSync(`${filename}.tmp`, JSON.stringify(snapshot, null, 2) + '\n');
    fs.renameSync(`${filename}.tmp`, filename);
    console.log(JSON.stringify({ texts: snapshot.texts.length, sourceLinks: snapshot.texts.filter(t => t.contentStatus === 'source_link').length, days: snapshot.days.length, filename }));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
