const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { validateEdition } = require('./library-sources.cjs');
const { documentPaths, verifyPdf } = require('./document-text.cjs');

// Explicit imports only. Drafts never enter the verified-edition loader.
function validateDraftEdition(input, document) {
  if (input.reviewStatus !== 'unreviewed-draft') throw new Error('Expected an explicitly labeled unreviewed draft.');
  if (!document || input.sourceDocument !== document.source || input.sourceSha256 !== document.sha256 ||
      input.sourcePageCount !== document.pageCount || input.scriptureSlug !== document.scriptureSlug ||
      input.language !== document.language || input.license !== document.license ||
      input.source !== `urn:sha256:${document.sha256}`) {
    throw new Error('Draft identity, attribution or checksum does not match the source document.');
  }
  const edition = validateEdition(input);
  const pages = new Set();
  const illustrations = new Set(input.illustrationOnlyPages || []);
  const checkPage = page => {
    if (!Number.isInteger(page) || page < 1 || page > document.pageCount) throw new Error('Invalid source page.');
  };
  for (const page of illustrations) checkPage(page);
  let lastPage = 0;
  edition.sections.forEach((section, sectionIndex) => {
    if (section.sortOrder !== sectionIndex + 1) throw new Error('Chapters must be in consecutive source order.');
    section.passages.forEach((passage, passageIndex) => {
      const page = input.sections[sectionIndex].passages[passageIndex].sourcePage;
      checkPage(page);
      if (page < lastPage || illustrations.has(page)) throw new Error('Passage source pages are out of order or illustration-only.');
      if (passage.sortOrder !== passageIndex + 1) throw new Error('Passages must be in consecutive source order.');
      if (/[\uE000-\uF8FF\uFFFD]/u.test(passage.text)) throw new Error('Unconverted font characters remain in the draft.');
      lastPage = page;
      pages.add(page);
      passage.sourceNotes = [passage.sourceNotes,
        `Source PDF: ${document.source}; page ${page}. Source SHA-256: ${document.sha256}. Draft text; not fully proofread.`,
      ].filter(Boolean).join('\n');
    });
  });
  if (new Set([...pages, ...illustrations]).size !== document.pageCount) throw new Error('Some source pages are missing.');
  const checksum = createHash('sha256').update(JSON.stringify(edition)).digest('hex');
  edition.provenance += `\nExplicitly imported as a separate draft text edition; no review attestation is implied.\nSource PDF: ${document.source}\nSource PDF SHA-256: ${document.sha256}\nDraft edition SHA-256: ${checksum}`;
  return edition;
}

function assertStoredDraft(stored, source) {
  const { sections, scriptureSlug, ...metadata } = source;
  if (stored.contentStatus !== 'draft' || Object.entries(metadata).some(([key, value]) => stored[key] !== value) ||
      stored.sections.length !== sections.length) throw new Error('Stored draft metadata differs; refusing to overwrite existing content.');
  for (const section of sections) {
    const saved = stored.sections.find(item => item.slug === section.slug);
    if (!saved || saved.title !== section.title || saved.sortOrder !== section.sortOrder || saved.passages.length !== section.passages.length) {
      throw new Error('Stored draft chapters differ; refusing to overwrite existing content.');
    }
    for (const passage of section.passages) {
      const savedPassage = saved.passages.find(item => item.reference === passage.reference);
      if (!savedPassage || savedPassage.text !== passage.text || savedPassage.sortOrder !== passage.sortOrder ||
          savedPassage.sourceNotes !== passage.sourceNotes) throw new Error('Stored draft passages differ; refusing to overwrite annotated text.');
    }
  }
}

async function applyDraftEdition(tx, input, document, writeBackup) {
  const source = validateDraftEdition(input, document);
  const scripture = await tx.scripture.findUniqueOrThrow({ where: { slug: source.scriptureSlug } });
  // Serialize imports for this book, including concurrent first-time imports.
  await tx.$queryRaw`SELECT id FROM scriptures WHERE id = ${scripture.id} FOR UPDATE`;
  const matches = await tx.scriptureEdition.findMany({
    where: { scriptureId: scripture.id, source: source.source, language: source.language },
    include: { sections: { include: { passages: true } } },
  });
  if (matches.length > 1) throw new Error('Multiple editions match this draft source; no changes made.');
  if (matches.length) {
    assertStoredDraft(matches[0], source);
    return { editionId: matches[0].id, scriptureId: scripture.id, unchanged: true, chapters: source.sections.length, passages: source.expectedPassages };
  }
  const id = randomUUID();
  await writeBackup({ scripture, newEditionId: id, source: source.source, sourceSha256: document.sha256 });
  const { sections, scriptureSlug, ...metadata } = source;
  await tx.scriptureEdition.create({ data: { id, scriptureId: scripture.id, ...metadata, contentStatus: 'draft' } });
  const records = sections.map(section => ({ ...section, id: randomUUID() }));
  await tx.scriptureSection.createMany({ data: records.map(({ id: sectionId, title, slug, sortOrder }) => ({
    id: sectionId, editionId: id, title, slug, sortOrder,
  })) });
  const passages = records.flatMap(section => section.passages.map(passage => ({
    ...passage, sectionId: section.id, wordCount: passage.text.trim().split(/\s+/u).length,
  })));
  for (let index = 0; index < passages.length; index += 250) {
    await tx.scripturePassage.createMany({ data: passages.slice(index, index + 250) });
  }
  const stored = await tx.scriptureEdition.findUniqueOrThrow({ where: { id }, include: { sections: { include: { passages: true } } } });
  assertStoredDraft(stored, source);
  const complete = await tx.scriptureEdition.count({ where: { scriptureId: scripture.id, contentStatus: 'complete' } });
  await tx.scripture.update({ where: { id: scripture.id }, data: { availabilityStatus: complete ? 'complete' : 'partial' } });
  return { editionId: id, scriptureId: scripture.id, unchanged: false, chapters: sections.length, passages: passages.length };
}

async function main(args) {
  const apply = args.includes('--apply');
  const filenames = args.filter(arg => arg !== '--apply');
  if (filenames.length !== 1 || filenames[0].startsWith('--')) throw new Error('Usage: node scripts/import-draft-edition.cjs <draft.json> [--apply]');
  const input = JSON.parse(fs.readFileSync(path.resolve(filenames[0]), 'utf8'));
  const directory = path.resolve(__dirname, '../../library/documents');
  const document = fs.readdirSync(directory).filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))).find(item => item.source === input.sourceDocument);
  const source = validateDraftEdition(input, document);
  const { publicFile, archiveFile } = documentPaths(document);
  verifyPdf(fs.existsSync(publicFile) ? publicFile : archiveFile, document);
  console.log(JSON.stringify({ title: source.title, chapters: source.sections.length, passages: source.expectedPassages, status: 'draft', apply }));
  if (!apply) return;
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const result = await prisma.$transaction(tx => applyDraftEdition(tx, input, document, snapshot => {
      const backups = path.resolve(__dirname, '../backups');
      fs.mkdirSync(backups, { recursive: true });
      fs.writeFileSync(path.join(backups, `draft-edition-${Date.now()}-${randomUUID()}.json`), JSON.stringify(snapshot), { flag: 'wx' });
    }), { timeout: 120000, maxWait: 10000 });
    console.log(JSON.stringify({ ...result, readerPath: `/reader/${result.scriptureId}/${result.editionId}` }));
  } finally { await prisma.$disconnect(); }
}

module.exports = { validateDraftEdition, assertStoredDraft, applyDraftEdition };
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Database import failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
