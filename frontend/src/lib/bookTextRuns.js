// Decorative typography only: concatenating these runs always reproduces the
// exact source slice, including its whitespace, punctuation and verse labels.
export function bookTextRuns(text, kind) {
  const pattern = kind === 'contents-entry' ? /\.{4,}/gu
    : kind === 'verse' ? /॥[ \t]*[०-९0-9]+[ \t]*॥/gu : null;
  if (!pattern) return [{ text }];
  const runs = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) runs.push({ text: text.slice(start, match.index) });
    runs.push({ text: match[0], className: kind === 'verse' ? 'book-verse-number' : 'book-contents-leader' });
    start = match.index + match[0].length;
  }
  if (start < text.length) runs.push({ text: text.slice(start) });
  return runs;
}
