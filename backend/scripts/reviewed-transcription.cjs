const { createHash } = require('node:crypto');
const { z } = require('zod');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const pageChecksum = page => sha256(JSON.stringify([page.number, page.kind, page.text]));
const pageSchema = z.object({
  number: z.number().int().positive(),
  extractedText: z.string().optional(), // An editor's reference only; never imported.
  text: z.string(),
  kind: z.enum(['text', 'no_text']),
  review: z.object({
    by: z.string().trim().min(1),
    at: z.string().datetime({ offset: true }),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
}).strict();
const transcriptionSchema = z.object({
  formatVersion: z.literal(1),
  source: z.string(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pageCount: z.number().int().positive(),
  pages: z.array(pageSchema).min(1),
}).strict();

function validateTranscription(input, document) {
  const parsed = transcriptionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`Corrected text and review are required for every page (${first.path.join('.')}: ${first.message}).`);
  }
  const transcription = parsed.data;
  if (transcription.source !== document.source || transcription.sourceSha256 !== document.sha256) {
    throw new Error('Transcription does not match the original PDF source and SHA-256.');
  }
  if (transcription.pageCount !== document.pageCount || transcription.pages.length !== document.pageCount) {
    throw new Error('Every original PDF page must be accounted for, including pages without text.');
  }
  for (const [index, page] of transcription.pages.entries()) {
    if (page.number !== index + 1) throw new Error('Source pages must be unique, consecutive, and ordered from page 1.');
    if (page.review.sha256 !== pageChecksum(page)) throw new Error(`Page ${page.number}: text changed after review.`);
    if (page.kind === 'no_text' ? page.text !== '' : !page.text.trim()) {
      throw new Error(`Page ${page.number}: text does not match the reviewed page classification.`);
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd\ue000-\uf8ff]/u.test(page.text) ||
        /\b(?:OCR_REQUIRED|TODO|content coming soon|verses to be added)\b/i.test(page.text)) {
      throw new Error(`Page ${page.number}: unresolved characters or placeholder text require correction.`);
    }
  }
  const textPages = transcription.pages.filter(page => page.kind === 'text');
  if (!textPages.length) throw new Error('A text edition must contain reviewed text.');
  // Raw extraction changes cannot alter an approved import or its identity.
  const checksum = sha256(JSON.stringify({ sourceSha256: transcription.sourceSha256,
    pages: transcription.pages.map(({ number, kind, text, review }) => ({ number, kind, text, review })) }));
  return { ...transcription, textPages, checksum };
}

function mapReadingPosition(pageIndex, textPages) {
  const lastIndex = textPages.length + 1;
  if (pageIndex <= 1) return { pageIndex, percentage: Math.round(pageIndex / lastIndex * 100) };
  const originalPage = pageIndex - 1;
  const next = textPages.findIndex(page => page.number >= originalPage);
  const index = next < 0 ? textPages.length - 1 : next;
  return { pageIndex: index + 2, percentage: Math.round((index + 2) / lastIndex * 100), textPageIndex: index };
}

module.exports = { pageChecksum, validateTranscription, mapReadingPosition };
