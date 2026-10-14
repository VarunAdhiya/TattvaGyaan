const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { documentPaths, archivePdf, assertStoredText, loadDocumentText } = require('../scripts/document-text.cjs');
const { pageChecksum, validateTranscription } = require('../scripts/reviewed-transcription.cjs');

test('archives only a checksum-verified source and safely resumes after removal', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tattvagyaan-archive-'));
  const bytes = Buffer.from('%PDF-synthetic-test-fixture');
  const document = { source: '/library/test-book.pdf', sha256: createHash('sha256').update(bytes).digest('hex') };
  const { publicFile, archiveFile } = documentPaths(document, workspace);
  fs.mkdirSync(path.dirname(publicFile), { recursive: true });
  fs.writeFileSync(publicFile, bytes);
  archivePdf(document, workspace);
  assert.equal(fs.existsSync(publicFile), false);
  assert.deepEqual(fs.readFileSync(archiveFile), bytes);
  archivePdf(document, workspace);
  fs.writeFileSync(publicFile, bytes);
  fs.writeFileSync(archiveFile, '%PDF-wrong-source');
  assert.throws(() => archivePdf(document, workspace), /checksum/);
  assert.deepEqual(fs.readFileSync(publicFile), bytes, 'a bad recovery copy must not remove the public original');
  assert.throws(() => documentPaths({ source: '/library/../../secret.pdf' }, workspace), /Invalid/);
  fs.unlinkSync(publicFile);
  fs.unlinkSync(archiveFile);
});

test('requires exact text, references, source identity and order before removing PDFs', () => {
  const transcription = { checksum: 'verified-checksum', textPages: [
    { number: 2, text: 'Synthetic page two.' }, { number: 4, text: 'Synthetic page four.' },
  ] };
  const edition = { contentStatus: 'transcribed', expectedPassages: 2,
    provenance: 'Reviewed transcription SHA-256: verified-checksum',
    sections: transcription.textPages.map(page => ({ slug: `pdf-page-${page.number}`, sortOrder: page.number - 1,
      passages: [{ text: page.text, reference: `PDF page ${page.number}`, sortOrder: 0 }] })) };
  assertStoredText(edition, transcription);
  for (const change of [
    value => { value.contentStatus = 'scanned'; },
    value => { value.expectedPassages = 3; },
    value => { value.sections.pop(); },
    value => { value.sections[0].passages[0].text += ' altered'; },
    value => { value.sections[0].passages[0].reference = 'Invented verse'; },
    value => { value.sections[0].sortOrder = 99; },
    value => { value.sections[0] = value.sections[1]; },
    value => { value.provenance = ''; },
  ]) {
    const modified = structuredClone(edition);
    change(modified);
    assert.throws(() => assertStoredText(modified, transcription), /differs/);
  }
});

test('replacement lookup rejects incomplete reviews and matches manifest source, not filename', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tattvagyaan-text-'));
  const document = { source: '/library/test-book.pdf', sha256: 'a'.repeat(64), pageCount: 1 };
  assert.equal(loadDocumentText(document, workspace), null);
  const directory = path.join(workspace, 'library/transcriptions');
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, 'different-name.json');
  const page = { number: 1, kind: 'text', text: 'Synthetic reviewed text.' };
  page.review = { by: 'Test reviewer', at: '2026-10-14T00:00:00Z', sha256: pageChecksum(page) };
  const input = { formatVersion: 1, source: document.source, sourceSha256: document.sha256, pageCount: 1, pages: [page] };
  fs.writeFileSync(filename, JSON.stringify(input));
  assert.equal(loadDocumentText(document, workspace).checksum, validateTranscription(input, document).checksum);
  input.pages[0].review = null;
  fs.writeFileSync(filename, JSON.stringify(input));
  assert.throws(() => loadDocumentText(document, workspace), /review.*required/);
  fs.unlinkSync(filename);
});
