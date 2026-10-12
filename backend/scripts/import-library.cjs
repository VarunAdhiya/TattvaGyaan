require('../dist/config');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const { loadEditions } = require('./library-sources.cjs');
const prisma = new PrismaClient();

async function main() {
  const editions = loadEditions();
  for (const edition of editions) console.log(`${edition.scriptureSlug} ${edition.language}: ${edition.sections.length} sections, ${edition.expectedPassages} verified passages`);
  if (!process.argv.includes('--apply')) return;
  for (const source of editions) {
    await prisma.$transaction(async tx => {
      const scripture = await tx.scripture.findUnique({ where: { slug: source.scriptureSlug } });
      if (!scripture) throw new Error(`Missing catalog entry: ${source.scriptureSlug}`);
      const provenance = `${source.provenance}\nSHA-256: ${source.checksum}`;
      const existing = await tx.scriptureEdition.findFirst({ where: { scriptureId: scripture.id, source: source.source, language: source.language } });
      if (existing?.provenance === provenance && existing.contentStatus === 'complete') {
        const count = await tx.scripturePassage.count({ where: { section: { editionId: existing.id } } });
        if (count === source.expectedPassages) return;
      }
      // Import separate, attributed editions; existing annotated passages keep their IDs and text.
      if (existing) throw new Error(`${source.title}: existing imported content changed; review before replacing it`);
      const { sections, scriptureSlug, checksum, ...metadata } = source;
      const edition = await tx.scriptureEdition.create({ data: { ...metadata, scriptureId: scripture.id, provenance, contentStatus: 'complete' } });
      const records = sections.map(section => ({ ...section, id: randomUUID() }));
      await tx.scriptureSection.createMany({ data: records.map(({ id, title, slug, sortOrder }) => ({ id, editionId: edition.id, title, slug, sortOrder })) });
      const passages = records.flatMap(section => section.passages.map(passage => ({
        ...passage, sectionId: section.id, wordCount: passage.text.trim().split(/\s+/u).length,
      })));
      for (let i = 0; i < passages.length; i += 500) await tx.scripturePassage.createMany({ data: passages.slice(i, i + 500) });
      const count = await tx.scripturePassage.count({ where: { section: { editionId: edition.id } } });
      if (count !== source.expectedPassages) throw new Error(`Stored count mismatch for ${source.title}`);
    }, { timeout: 180000, maxWait: 10000 });
    console.log(`Imported ${source.scriptureSlug} ${source.language}`);
  }
  for (const slug of new Set(editions.map(edition => edition.scriptureSlug))) {
    await prisma.scripture.update({ where: { slug }, data: { availabilityStatus: 'complete' } });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
