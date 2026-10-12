// Source ingestion is an editorial operation. Validate attributed edition JSON
// placed in library/editions before any database import; never generate verses.
const { loadEditions } = require('./library-sources.cjs');
for (const edition of loadEditions()) console.log(edition.title + ': ' + edition.expectedPassages + ' validated passages');
