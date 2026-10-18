const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sha = text => createHash('sha256').update(text).digest('hex');
const SOURCE = 'c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0';
// Two-line top bands checked against the source audit: running title, then a
// separate topic heading. Other two-line top bands are running heads/ornaments.
const topHeadings = new Set([30,35,52,78,81,85,93,140,151,166,168,187,189,200,202,208,232,236,255,261,272,275,281,289,301,303,311,322,326,377,389,391,405,413,422,430,438,445,448,520,532,558,584,589,619,626,627,630]);

function buildLayout(draft, audit) {
  if (draft.sourceSha256 !== SOURCE || audit.sourceSha256 !== SOURCE) throw new Error('Unexpected Garuda source');
  const pages = new Map(audit.pages.map(page => [page.page, page]));
  const result = { version: 1, source: draft.source, status: 'unreviewed-draft', sections: {} };
  for (const section of draft.sections) {
    const blocks = [], hashes = {};
    const pagePassages = new Map();
    for (const passage of section.passages) {
      hashes[passage.reference] = sha(passage.text);
      if (!pagePassages.has(passage.sourcePage)) pagePassages.set(passage.sourcePage, []);
      pagePassages.get(passage.sourcePage).push(passage);
    }
    for (const [number, passages] of pagePassages) {
      const lines = passages.flatMap(passage => {
        let start = 0;
        return passage.text.split('\n').map((text, index, all) => {
          const end = start + text.length + (index < all.length - 1 ? 1 : 0);
          const line = { text, reference: passage.reference, start, end };
          start = end;
          return line;
        });
      });
      const page = pages.get(number);
      if (sha(lines.map(line => line.text).join('\n')) !== page.textSha256) throw new Error('Source audit mismatch on page ' + number);
      const parts = rows => rows.map(({ reference, start, end }) => ({ reference, start, end }));
      const add = (kind, rows, extra = {}) => {
        if (!rows.length) return;
        const previous = blocks.at(-1);
        // A column break can divide a sentence. Join its exact ranges without
        // changing a character; headings, notes and new speakers remain separate.
        if (kind === 'paragraph' && previous?.kind === 'paragraph' && previous.sourcePage === number && section.slug.endsWith('-kanda')) {
          const last = previous.parts.at(-1);
          const tail = passages.find(p => p.reference === last.reference).text.slice(last.start, last.end);
          if (!/[।॥!?][\s'”"’()०-९0-9।॥.-]*$/u.test(tail) && !/(?:बोले|कहा|पूछा)\s*[—–-]/u.test(rows[0].text)) {
            previous.parts.push(...parts(rows));
            return;
          }
        }
        blocks.push({ kind, parts: parts(rows), sourcePage: number, ...extra });
      };
      const prose = rows => {
        let paragraph = [];
        for (let i = 0; i < rows.length; i += 1) {
          const line = rows[i];
          if (paragraph.length && /(?:बोले|कहा|पूछा)\s*[—–-]/u.test(line.text)) { add('paragraph', paragraph); paragraph = []; }
          paragraph.push(line);
          const verse = /॥/u.test(line.text);
          const stop = /[।॥!?][\s'”"’()०-९0-9।॥.-]*$/u.test(line.text);
          if (verse || (stop && !rows[i + 1]?.text.includes('॥')) || paragraph.length >= 16) {
            add(verse ? 'verse' : 'paragraph', paragraph); paragraph = [];
          }
        }
        add('paragraph', paragraph);
      };
      if (section.slug === 'contents' && page.regions?.length) {
        for (const region of page.regions) {
          if (!region.firstLine || !region.lineCount) continue;
          const rows = lines.slice(region.firstLine - 1, region.firstLine - 1 + region.lineCount);
          if (region.kind === 'full-width') { add('source-note', rows); continue; }
          let entry = [];
          for (const row of rows) {
            // Printed entries can wrap; a new numbered item or its final page
            // number ends the previous row. Keep every original character.
            if (entry.length && /^[०-९0-9][०-९0-9.]*\s*[-–—]/u.test(row.text)) {
              add('contents-entry', entry); entry = [];
            }
            entry.push(row);
            if (/[०-९0-9]+\s*$/u.test(row.text)) { add('contents-entry', entry); entry = []; }
          }
          add('contents-entry', entry);
        }
        continue;
      }
      if (!section.slug.endsWith('-kanda') || !page.regions?.length || number === 160) {
        prose(lines); continue;
      }
      for (let i = 0; i < page.regions.length; i += 1) {
        const region = page.regions[i];
        if (!region.firstLine || !region.lineCount) continue;
        const rows = lines.slice(region.firstLine - 1, region.firstLine - 1 + region.lineCount);
        const next = page.regions[i + 1];
        if (region.kind !== 'full-width') { prose(rows); continue; }
        const topic = next?.kind === 'left-column' && (i > 0 || region.lineCount > 2 || topHeadings.has(number));
        if (!topic) { add('source-note', rows); continue; }
        let skip = 0;
        if (number === 14) skip = 3;
        else if (number === 614 || (i === 0 && number !== 512)) skip = number === 114 ? 2 : 1;
        else if (number === 456) skip = 1;
        else if (rows.length > 1 && (rows[0].text.length < 15 || /[#/]|कि.*ि.*ि/u.test(rows[0].text))) skip = 1;
        // Page 263 includes a full-width editorial introduction before its topic.
        if (number === 263) skip = rows.length - 1;
        if (number === 452 && region.firstLine === 14) skip = 2;
        add('source-note', rows.slice(0, skip));
        const heading = rows.slice(skip);
        const title = heading.map(line => line.text).join(' ').trim();
        if (!title) throw new Error('Empty heading on page ' + number);
        add('chapter', heading, { chapterKey: `pdf-${number}-line-${region.firstLine + skip}`, title });
      }
    }
    // Exact offset coverage proves that layout did not delete, duplicate or
    // edit any OCR characters, including running heads and footnotes.
    for (const passage of section.passages) {
      const ranges = blocks.flatMap(block => block.parts).filter(part => part.reference === passage.reference);
      let end = 0;
      for (const part of ranges) {
        if (part.start !== end || part.end <= part.start) throw new Error('Invalid source coverage: ' + passage.reference);
        end = part.end;
      }
      if (end !== passage.text.length) throw new Error('Missing source text: ' + passage.reference);
    }
    result.sections[section.slug] = { hashes, blocks };
  }
  return result;
}

if (require.main === module) {
  const draft = JSON.parse(fs.readFileSync(path.join(root, 'library/editions/drafts/garuda-purana-hi.json'), 'utf8'));
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'library/editions/drafts/garuda-purana-hi.audit.json'), 'utf8'));
  const result = buildLayout(draft, audit);
  const target = path.join(root, 'backend/data/layouts/garuda-purana.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result) + '\n');
  console.log(JSON.stringify({ sections: Object.keys(result.sections).length, headings: Object.values(result.sections).flatMap(s => s.blocks).filter(b => b.kind === 'chapter').length, passages: draft.expectedPassages, target }));
}
module.exports = { buildLayout };
