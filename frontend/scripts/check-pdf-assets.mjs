import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadDocumentText } = require('../../backend/scripts/document-text.cjs');

const manifests = new URL('../../library/documents/', import.meta.url);
const publicDirectory = new URL('../public/', import.meta.url);
const failures = [];
const files = readdirSync(manifests).filter(file => file.endsWith('.json'));
let databaseBooks = 0;

for (const file of files) {
  const document = JSON.parse(readFileSync(new URL(file, manifests), 'utf8'));
  if (!/^\/library\/[a-z0-9][a-z0-9-]*\.pdf$/.test(document.source)) {
    failures.push(`${file}: invalid local PDF source`);
    continue;
  }
  const asset = `public${document.source}`;
  try {
    if (!existsSync(new URL(document.source.slice(1), publicDirectory)) && loadDocumentText(document)) {
      databaseBooks++;
      continue;
    }
    const bytes = readFileSync(new URL(document.source.slice(1), publicDirectory));
    if (bytes.subarray(0, 5).toString() !== '%PDF-') {
      failures.push(`${asset}: not a PDF`);
    } else if (createHash('sha256').update(bytes).digest('hex') !== document.sha256) {
      failures.push(`${asset}: checksum does not match ${file}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    failures.push(`${asset}: missing`);
  }
}

if (failures.length) {
  console.error(`PDF asset validation failed:\n${failures.map(failure => `  ${failure}`).join('\n')}`);
  console.error('Each edition needs its original PDF or a fully reviewed text replacement. See library/README.md.');
  process.exitCode = 1;
} else {
  console.log(`Verified ${files.length - databaseBooks} library PDFs and ${databaseBooks} database text replacements.`);
}
