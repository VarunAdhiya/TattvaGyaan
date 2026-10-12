const fs = require('node:fs/promises');
const path = require('node:path');
const sources = {
  'gita.json': 'https://gitabhawan.org.in/data/gita-corpus.json',
  'quran-translations.json': 'https://quran-json.risanb.com/translations/index.json',
  'quran-manifest.json': 'https://quran-json.risanb.com/manifest.json',
  'quran-chapters.json': 'https://quran-json.risanb.com/chapters.json',
  'quran-ar.json': 'https://quran-json.risanb.com/text/uthmani/quran.json',
};
(async () => {
  const directory = path.resolve(__dirname, '../data/sources');
  await fs.mkdir(directory, { recursive: true });
  for (const [file, url] of Object.entries(sources)) {
    if (await fs.access(path.join(directory, file)).then(() => true, () => false)) continue;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    const data = await response.json();
    await fs.writeFile(path.join(directory, file), JSON.stringify(data, null, 2) + '\n');
    console.log(file, Array.isArray(data) ? `array: ${data.length}` : `keys: ${Object.keys(data).join(', ')}`);
  }
  const index = JSON.parse(await fs.readFile(path.join(directory, 'quran-translations.json'), 'utf8'));
  for (const code of ['en', 'hi']) {
    const entry = index.editions.find(edition => edition.code === code && edition.license.status === 'granted');
    if (!entry) throw new Error(`No licensed Quran edition for ${code}`);
    const response = await fetch('https://quran-json.risanb.com' + entry.files.quran, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Quran ${code}: HTTP ${response.status}`);
    const data = await response.json();
    await fs.writeFile(path.join(directory, `quran-${code}.json`), JSON.stringify({ metadata: entry, data }, null, 2) + '\n');
    console.log(`quran-${code}.json downloaded`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
