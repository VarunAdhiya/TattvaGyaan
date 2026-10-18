const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const policy = require('../data/reader-editions.json');
const { loadCatalog, validateEdition } = require('./library-sources.cjs');

function assertActiveEdition(input) {
  if (!policy.some(entry => entry.scriptureSlug === input.scriptureSlug && entry.source === input.source) || input.language !== 'hi') {
    throw new Error('This edition is retired or outside the single-text-edition catalog.');
  }
}

function loadReaderEditions() {
  const catalog = loadCatalog();
  if (new Set(policy.map(entry => entry.scriptureSlug)).size !== policy.length ||
      policy.length !== catalog.scriptures.length || policy.some(entry => !catalog.scriptures.some(book => book.slug === entry.scriptureSlug))) {
    throw new Error('Each catalog book must have exactly one configured text edition.');
  }
  return policy.map(entry => {
    const input = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../library/editions', entry.file), 'utf8'));
    assertActiveEdition(input);
    if (input.scriptureSlug !== entry.scriptureSlug || input.source !== entry.source) throw new Error('Reader edition identity differs from policy.');
    let edition;
    if (entry.contentStatus === 'draft') {
      const document = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../library/documents', entry.document), 'utf8'));
      edition = require('./import-draft-edition.cjs').validateDraftEdition(input, document);
    } else {
      edition = validateEdition(input);
      edition.provenance += '\nSHA-256: ' + createHash('sha256').update(JSON.stringify(edition.sections)).digest('hex');
    }
    return { ...edition, contentStatus: entry.contentStatus };
  });
}

function planEditions(editions, sources) {
  const retained = sources.map(source => {
    const matches = editions.filter(edition => edition.scripture.slug === source.scriptureSlug &&
      edition.source === source.source && edition.language === source.language);
    if (matches.length > 1) throw new Error('Duplicate preferred editions; resolve their identities before cleanup.');
    return { source, edition: matches[0] };
  });
  const keepIds = new Set(retained.map(item => item.edition?.id));
  return { retained, removed: editions.filter(edition => !keepIds.has(edition.id)) };
}

function assertStoredText(stored, source) {
  if (stored.contentStatus !== source.contentStatus || stored.sections.length !== source.sections.length) {
    throw new Error(source.scriptureSlug + ': stored status or chapter count differs; no content will be overwritten.');
  }
  for (const section of source.sections) {
    const saved = stored.sections.find(item => item.slug === section.slug);
    if (!saved || saved.passages.length !== section.passages.length || saved.sortOrder !== section.sortOrder) {
      throw new Error(source.scriptureSlug + ': stored chapter differs: ' + section.slug);
    }
    const passages = new Map(saved.passages.map(passage => [passage.reference, passage]));
    for (const passage of section.passages) {
      const prior = passages.get(passage.reference);
      if (!prior || prior.text !== passage.text || prior.sortOrder !== passage.sortOrder) {
        throw new Error(source.scriptureSlug + ': stored text differs at ' + passage.reference);
      }
    }
  }
}

module.exports = { policy, loadReaderEditions, assertActiveEdition, planEditions, assertStoredText };
