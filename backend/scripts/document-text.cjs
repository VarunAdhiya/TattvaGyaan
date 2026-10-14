const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { validateTranscription } = require('./reviewed-transcription.cjs');

const root = path.resolve(__dirname, '../..');

function documentPaths(document, workspace = root) {
  if (!/^\/library\/[a-z0-9][a-z0-9-]*\.pdf$/.test(document.source)) throw new Error('Invalid PDF source path.');
  const filename = path.basename(document.source);
  return { publicFile: path.join(workspace, 'frontend/public/library', filename),
    archiveFile: path.join(workspace, 'backend/data/source-pdfs', filename) };
}

function verifyPdf(filename, document) {
  const bytes = fs.readFileSync(filename);
  if (bytes.subarray(0, 5).toString() !== '%PDF-' ||
      createHash('sha256').update(bytes).digest('hex') !== document.sha256) {
    throw new Error(`${document.source}: PDF header or checksum does not match.`);
  }
}

function loadDocumentText(document, workspace = root) {
  const directory = path.join(workspace, 'library/transcriptions');
  if (!fs.existsSync(directory)) return null;
  const matches = fs.readdirSync(directory).filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')))
    .filter(input => input.source === document.source);
  if (matches.length > 1) throw new Error(`${document.source}: multiple transcriptions found.`);
  return matches.length ? validateTranscription(matches[0], document) : null;
}

function assertStoredText(edition, transcription) {
  const expected = new Map(transcription.textPages.map(page => [`pdf-page-${page.number}`, page]));
  const marker = `Reviewed transcription SHA-256: ${transcription.checksum}`;
  const seen = new Set();
  if (edition.contentStatus !== 'transcribed' || edition.expectedPassages !== expected.size ||
      !edition.provenance?.split('\n').includes(marker) || edition.sections.length !== expected.size ||
      edition.sections.some(section => {
        const page = expected.get(section.slug);
        if (!page || seen.has(section.slug)) return true;
        seen.add(section.slug);
        return section.sortOrder !== page.number - 1 || section.passages.length !== 1 ||
          section.passages[0].text !== page.text || section.passages[0].reference !== `PDF page ${page.number}` ||
          section.passages[0].sortOrder !== 0;
      })) {
    throw new Error('Stored text, page order, or provenance differs from the reviewed transcription.');
  }
}

function archivePdf(document, workspace = root) {
  const { publicFile, archiveFile } = documentPaths(document, workspace);
  if (!fs.existsSync(publicFile)) {
    verifyPdf(archiveFile, document);
    return;
  }
  verifyPdf(publicFile, document);
  fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
  if (!fs.existsSync(archiveFile)) fs.copyFileSync(publicFile, archiveFile, fs.constants.COPYFILE_EXCL);
  verifyPdf(archiveFile, document);
  // Only remove the exact catalog file after checking the independent recovery copy.
  fs.unlinkSync(publicFile);
}

module.exports = { documentPaths, verifyPdf, loadDocumentText, assertStoredText, archivePdf };
