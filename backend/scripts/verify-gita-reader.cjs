// Read-only verification of the existing edition; never imports or replaces IDs.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHash } = require('node:crypto');
const source = require('./library-sources.cjs').loadEditions().find(edition => edition.scriptureSlug === 'bhagavad-gita');

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const editions = await prisma.scriptureEdition.findMany({
      where: { scripture: { slug: source.scriptureSlug }, language: source.language, source: source.source },
      include: { sections: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: { passages: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } } },
    });
    assert.equal(editions.length, 1, 'Expected exactly one attributed Hindi Gita edition');
    const edition = editions[0];
    assert.equal(edition.contentStatus, 'complete');
    assert.equal(edition.provenance, source.provenance + '\nSHA-256: ' + source.checksum);
    for (const key of ['title', 'translator', 'license', 'textDirection', 'expectedPassages']) {
      assert.equal(edition[key], source[key], `Edition metadata differs: ${key}`);
    }
    assert.equal(edition.sections.length, 18);
    const hash = createHash('sha256');
    for (const [index, section] of edition.sections.entries()) {
      const original = source.sections[index];
      assert.equal(section.slug, original.slug);
      assert.equal(section.title, original.title);
      assert.deepEqual(section.passages.map(({ reference, text }) => ({ reference, text })),
        original.passages.map(({ reference, text }) => ({ reference, text })), `Text differs in ${section.slug}`);
      hash.update(JSON.stringify(section.passages.map(({ reference, text }) => ({ reference, text }))));
    }
    const passages = edition.sections.flatMap(section => section.passages);
    assert.equal(passages.length, 700);
    console.log(JSON.stringify({ editionId: edition.id, source: edition.source, status: edition.contentStatus,
      chapters: edition.sections.length, passages: passages.length, textSha256: hash.digest('hex'),
      databaseChanges: 0, sourceTextAndMetadataMatch: true }, null, 2));
  } finally { await prisma.$disconnect(); }
}

main().catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Gita verification failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
