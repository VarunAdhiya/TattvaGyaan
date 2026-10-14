const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { z } = require('zod');
const { documentPaths, verifyPdf, loadDocumentText } = require('./document-text.cjs');
const directory = path.resolve(__dirname, '../../library');
const catalogSchema = z.object({
  religion: z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string(), sortOrder: z.number().int() }),
  language: z.string().min(2),
  scriptures: z.array(z.object({
    slug: z.string().min(1), title: z.string().min(1), aliases: z.array(z.string()),
    originalLang: z.string().min(1), description: z.string(), themes: z.array(z.string()),
  })).min(1),
});
const passageSchema = z.object({
  reference: z.string().min(1), text: z.string().min(1), sortOrder: z.number().int().nonnegative(),
  sourceNotes: z.string().nullable().optional(),
});
const editionSchema = z.object({
  scriptureSlug: z.string().min(1), title: z.string().min(1), language: z.string().min(2),
  source: z.string().url(), license: z.string().min(1), provenance: z.string().min(1),
  translator: z.string().nullable().optional(), script: z.string().optional(),
  isOriginal: z.boolean(), textDirection: z.enum(['ltr', 'rtl']),
  expectedPassages: z.number().int().positive(),
  sections: z.array(z.object({
    slug: z.string().min(1), title: z.string().min(1), sortOrder: z.number().int().nonnegative(),
    expectedPassages: z.number().int().positive(), passages: z.array(passageSchema),
  })).min(1),
});

function loadCatalog() {
  const catalog = catalogSchema.parse(JSON.parse(fs.readFileSync(path.join(directory, 'catalog.json'), 'utf8')));
  if (new Set(catalog.scriptures.map(book => book.slug)).size !== catalog.scriptures.length) throw new Error('Duplicate catalog slug');
  return catalog;
}

function validateEdition(input) {
  const edition = editionSchema.parse(input);
  const refs = new Set();
  const slugs = new Set();
  for (const section of edition.sections) {
    if (slugs.has(section.slug)) throw new Error('Duplicate section slug');
    slugs.add(section.slug);
    if (section.passages.length !== section.expectedPassages) throw new Error(edition.title + ': incomplete ' + section.title);
    const orders = new Set();
    for (const passage of section.passages) {
      if (!passage.text.trim() || /verses to be added|content coming soon/i.test(passage.text) || refs.has(passage.reference)) {
        throw new Error(edition.title + ': missing, duplicate or placeholder passage ' + passage.reference);
      }
      if (orders.has(passage.sortOrder)) throw new Error('Duplicate passage order');
      orders.add(passage.sortOrder);
      refs.add(passage.reference);
    }
  }
  if (refs.size !== edition.expectedPassages) throw new Error(edition.title + ': incomplete edition');
  return edition;
}

function loadEditions() {
  const catalog = loadCatalog();
  const sourceDir = path.join(directory, 'editions');
  return fs.readdirSync(sourceDir).filter(file => file.endsWith('.json')).sort().map(file => {
    const edition = validateEdition(JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8')));
    if (edition.language !== catalog.language || !catalog.scriptures.some(book => book.slug === edition.scriptureSlug)) {
      throw new Error(file + ': edition is outside the configured catalog');
    }
    return { ...edition, checksum: createHash('sha256').update(JSON.stringify(edition.sections)).digest('hex') };
  });
}
const documentSchema = z.object({
  scriptureSlug: z.string().min(1), title: z.string().min(1), language: z.string().min(2),
  script: z.string().optional(), isOriginal: z.boolean(), textDirection: z.enum(['ltr', 'rtl']),
  source: z.string().regex(/^\/library\/[a-z0-9][a-z0-9-]*\.pdf$/),
  license: z.string().min(1), provenance: z.string().min(1),
  pageCount: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

function loadDocuments() {
  const catalog = loadCatalog();
  const sources = new Set();
  return fs.readdirSync(path.join(directory, 'documents')).filter(file => file.endsWith('.json')).sort().map(file => {
    const document = documentSchema.parse(JSON.parse(fs.readFileSync(path.join(directory, 'documents', file), 'utf8')));
    if (document.language !== catalog.language || !catalog.scriptures.some(book => book.slug === document.scriptureSlug)) {
      throw new Error(file + ': document is outside the configured catalog');
    }
    if (sources.has(document.source)) throw new Error(file + ': duplicate document source');
    sources.add(document.source);
    const { publicFile, archiveFile } = documentPaths(document);
    if (fs.existsSync(publicFile)) verifyPdf(publicFile, document);
    else {
      if (!loadDocumentText(document)) throw new Error(file + ': PDF missing without a reviewed text replacement');
      verifyPdf(archiveFile, document);
    }
    return document;
  });
}

module.exports = { loadCatalog, loadEditions, validateEdition, loadDocuments };
