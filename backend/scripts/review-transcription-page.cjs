const fs = require('node:fs');
const path = require('node:path');
const { pageChecksum } = require('./reviewed-transcription.cjs');

// This records a completed editorial review; it does not perform one.
function recordReview(filename, number, reviewer) {
  const draft = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const page = draft.pages.find(item => item.number === number);
  if (!page || !reviewer?.trim()) throw new Error('An existing source page and a reviewer name are required.');
  if (typeof page.text !== 'string' || !['text', 'no_text'].includes(page.kind) ||
      (page.kind === 'text' ? !page.text.trim() : page.text !== '')) {
    throw new Error('Correct the page text and classification before recording review. Raw extraction is not accepted.');
  }
  page.review = { by: reviewer.trim(), at: new Date().toISOString(), sha256: pageChecksum(page) };
  // Keep the previous editorial state before updating this page's attestation.
  const backup = path.resolve(__dirname, '../backups/transcription-reviews');
  fs.mkdirSync(backup, { recursive: true });
  fs.copyFileSync(filename, path.join(backup, `${Date.now()}-${require('node:crypto').randomUUID()}.json`), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(filename, JSON.stringify(draft, null, 2) + '\n');
  return page.review;
}

module.exports = { recordReview };
if (require.main === module) {
  try {
    const [filename, pageNumber, reviewer, ...extra] = process.argv.slice(2);
    if (!filename || !/^\d+$/.test(pageNumber || '') || !reviewer || extra.length) {
      throw new Error('Usage: node scripts/review-transcription-page.cjs <corrected-book.json> <page-number> "Reviewer name"');
    }
    console.log(JSON.stringify(recordReview(path.resolve(filename), Number(pageNumber), reviewer)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
