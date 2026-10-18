import { createRequire } from 'node:module';
import { readdirSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { loadReaderEditions } = require('../../backend/scripts/reader-editions.cjs');
try {
  const editions = loadReaderEditions();
  const directory = new URL('../public/library/', import.meta.url);
  if (existsSync(directory) && readdirSync(directory).some(file => /\.pdf$/i.test(file))) {
    throw new Error('Public PDF files are retired. Remove them from frontend/public/library before building.');
  }
  console.log(`Verified ${editions.length} text editions; no public PDFs required.`);
} catch (error) {
  console.error('Library validation failed: ' + error.message);
  process.exitCode = 1;
}
