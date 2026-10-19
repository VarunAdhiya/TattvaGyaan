const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { z } = require('zod');
const { SOURCE_ONLY } = require('./fetch-devotionals.cjs');

const sourceUrl = z.string().url().refine(url => new URL(url).origin === 'https://www.hinduaarti.com');
const textSchema = z.object({
  sourceId: z.string(), category: z.enum(['chalisa', 'bhajan', 'mantra']),
  slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1), titleHindi: z.string().min(1), deity: z.string().min(1),
  hindi: z.string().min(1).nullable(), transliteration: z.string().min(1).nullable(),
  contentStatus: z.enum(['source_text', 'source_link']), sourceUrl, attribution: z.string().min(1), checksum: z.string().length(64),
});
const panchangSchema = z.object({
  date: z.string(), location: z.literal('New Delhi, India (times in IST)'),
  tithi: z.object({ name: z.string().min(1), hindi: z.string(), endsAt: z.string(), next: z.string() }),
  nakshatra: z.object({ name: z.string().min(1), hindi: z.string(), endsAt: z.string(), next: z.string() }),
  sunrise: z.string().min(1), sunset: z.string().min(1), festivals: z.array(z.string()),
}).passthrough();

function validateSnapshot(input) {
  const snapshot = z.object({
    version: z.literal(1), year: z.number().int().min(2000).max(2100), fetchedAt: z.string().datetime(),
    texts: z.array(textSchema), days: z.array(z.object({ date: z.string(), data: panchangSchema, sourceUrl })),
  }).parse(input);
  const counts = { chalisa: 50, bhajan: 50, mantra: 54 };
  const ids = new Set();
  for (const text of snapshot.texts) {
    if (ids.has(text.sourceId) || text.sourceId !== `${text.category}:${text.slug}`) throw new Error('Duplicate or mismatched prayer identity');
    ids.add(text.sourceId);
    const hash = createHash('sha256').update(JSON.stringify([text.hindi, text.transliteration])).digest('hex');
    if (hash !== text.checksum) throw new Error(`Text checksum mismatch: ${text.sourceId}`);
    const restricted = SOURCE_ONLY.has(text.slug);
    if (restricted !== (text.contentStatus === 'source_link') ||
        (restricted && (text.hindi !== null || text.transliteration !== null)) ||
        (!restricted && (!text.hindi || !text.transliteration))) throw new Error('Invalid content availability');
  }
  for (const [category, count] of Object.entries(counts)) {
    if (snapshot.texts.filter(t => t.category === category).length !== count) throw new Error(`Incomplete ${category} catalog; review source changes before import`);
  }
  const expected = [];
  for (let d = new Date(Date.UTC(snapshot.year, 0, 1)); d.getUTCFullYear() === snapshot.year; d.setUTCDate(d.getUTCDate() + 1)) expected.push(d.toISOString().slice(0, 10));
  if (snapshot.days.length !== expected.length || snapshot.days.some((day, i) => day.date !== expected[i] || day.data.date !== day.date)) throw new Error('Incomplete or mismatched calendar dates');
  return snapshot;
}

async function importSnapshot(prisma, input) {
  const snapshot = validateSnapshot(input);
  const fetchedAt = new Date(snapshot.fetchedAt);
  return prisma.$transaction(async tx => {
    const existingTexts = await tx.devotionalText.findMany();
    const existingDays = await tx.calendarDay.findMany({ where: { date: { gte: new Date(Date.UTC(snapshot.year, 0, 1)), lt: new Date(Date.UTC(snapshot.year + 1, 0, 1)) } } });
    const textMap = new Map(existingTexts.map(t => [t.sourceId, t]));
    const dayMap = new Map(existingDays.map(d => [d.date.toISOString().slice(0, 10), d]));
    const addedTexts = snapshot.texts.filter(t => !textMap.has(t.sourceId)).map(t => ({ ...t, id: randomUUID(), fetchedAt }));
    const addedDays = snapshot.days.filter(d => !dayMap.has(d.date)).map(d => ({ ...d, date: new Date(`${d.date}T00:00:00.000Z`), fetchedAt }));
    if (addedTexts.length) await tx.devotionalText.createMany({ data: addedTexts });
    if (addedDays.length) await tx.calendarDay.createMany({ data: addedDays });
    let updated = 0;
    for (const text of snapshot.texts) {
      const prior = textMap.get(text.sourceId);
      if (prior && Object.keys(text).some(key => prior[key] !== text[key])) {
        await tx.devotionalText.update({ where: { sourceId: text.sourceId }, data: { ...text, fetchedAt } });
        updated++;
      }
    }
    for (const day of snapshot.days) {
      const prior = dayMap.get(day.date);
      if (prior && (!isDeepStrictEqual(prior.data, day.data) || prior.sourceUrl !== day.sourceUrl)) {
        await tx.calendarDay.update({ where: { date: prior.date }, data: { data: day.data, sourceUrl: day.sourceUrl, fetchedAt } });
        updated++;
      }
    }
    return { addedTexts: addedTexts.length, addedDays: addedDays.length, updated };
  }, { timeout: 120000 });
}

module.exports = { validateSnapshot, importSnapshot };
if (require.main === module) {
  const year = process.argv.find(arg => /^20\d\d$/.test(arg)) || '2026';
  const snapshot = validateSnapshot(JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../library/devotionals/hinduaarti-${year}.json`), 'utf8')));
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'preview', texts: snapshot.texts.length, days: snapshot.days.length, sourceLinks: snapshot.texts.filter(t => t.contentStatus === 'source_link').length }));
  } else {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    const { PrismaClient } = require('@prisma/client');
    const { createDatabaseConfig } = require('../dist/config/database');
    const prisma = new PrismaClient({ datasources: { db: { url: createDatabaseConfig(process.env).prismaUrl } } });
    importSnapshot(prisma, snapshot).then(result => console.log(JSON.stringify(result)))
      .catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
  }
}
