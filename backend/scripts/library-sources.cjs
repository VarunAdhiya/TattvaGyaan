const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const directory = path.resolve(__dirname, '../data/sources');
function read(file) { return JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')); }

function validateEdition(edition) {
  if (!edition.source || !edition.license || !edition.provenance) throw new Error('Source, license and provenance are required');
  const refs = new Set();
  for (const section of edition.sections) {
    if (section.passages.length !== section.expectedPassages) throw new Error(`${edition.title}: incomplete ${section.title}`);
    for (const passage of section.passages) {
      if (!passage.text?.trim() || /verses to be added|content coming soon/i.test(passage.text) || refs.has(passage.reference)) {
        throw new Error(`${edition.title}: missing, duplicate or placeholder passage ${passage.reference}`);
      }
      refs.add(passage.reference);
    }
  }
  if (refs.size !== edition.expectedPassages) throw new Error(`${edition.title}: expected ${edition.expectedPassages}, received ${refs.size}`);
  return edition;
}

function loadEditions() {
  const gita = read('gita.json');
  const expectedGita = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];
  const editions = ['sanskrit', 'hindi', 'english'].map(language => ({
    scriptureSlug: 'bhagavad-gita', title: `Bhagavad Gita — ${language} (Hansi Gita Bhawan Trust)`,
    language: { sanskrit: 'sa', hindi: 'hi', english: 'en' }[language], script: language === 'english' ? 'Latin' : 'Devanagari',
    isOriginal: language === 'sanskrit', textDirection: 'ltr', translator: language === 'sanskrit' ? null : gita.publisher,
    source: gita.url, license: language === 'sanskrit' ? 'Public domain' : 'Reuse permitted with attribution to Hansi Gita Bhawan Trust',
    provenance: `${gita.publisher}. Source snapshot: ${gita.generated}. ${gita.notes[language === 'sanskrit' ? 'sanskrit' : 'translations']}`,
    expectedPassages: 700,
    sections: expectedGita.map((expectedPassages, index) => ({
      slug: `chapter-${index + 1}`, title: `Chapter ${index + 1}: ${gita.chapters[index][language]}`, sortOrder: index + 1, expectedPassages,
      passages: gita.verses.filter(verse => verse.chapter === index + 1).map(verse => ({ reference: verse.ref, text: verse[language], sortOrder: verse.verse })),
    })),
  }));
  const chapters = read('quran-chapters.json');
  for (const language of ['ar', 'en', 'hi']) {
    const source = read(`quran-${language}.json`);
    const metadata = source.metadata;
    const data = source.data || source;
    const arabic = read('quran-manifest.json').scripts.find(script => script.id === 'uthmani');
    editions.push({
      scriptureSlug: 'quran', title: `Quran — ${language === 'ar' ? 'Tanzil Uthmani' : metadata.author}`,
      language, script: { ar: 'Arabic', hi: 'Devanagari', en: 'Latin' }[language], isOriginal: language === 'ar',
      textDirection: language === 'ar' ? 'rtl' : 'ltr', translator: metadata?.author || null,
      source: metadata?.source || 'https://tanzil.net', license: metadata?.license.text || arabic.license.notice,
      provenance: language === 'ar' ? arabic.license.notice : `${metadata.author}. QuranEnc.com. Version ${metadata.version}. ${metadata.license.url}`,
      expectedPassages: 6236,
      sections: chapters.map(chapter => ({
        slug: `surah-${chapter.id}`, title: `${chapter.id}. ${chapter.transliteration} — ${chapter.name}`,
        sortOrder: chapter.id, expectedPassages: chapter.total_verses,
        passages: (data.find(item => item.id === chapter.id)?.verses || []).map(verse => ({
          reference: `${chapter.id}:${verse.id}`, text: verse.text || verse.translation,
          sourceNotes: verse.footnotes || null, sortOrder: verse.id,
        })),
      })),
    });
  }
  return editions.map(edition => {
    validateEdition(edition);
    edition.checksum = createHash('sha256').update(JSON.stringify(edition.sections)).digest('hex');
    return edition;
  });
}
module.exports = { loadEditions, validateEdition };
