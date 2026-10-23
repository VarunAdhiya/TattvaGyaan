import { createHash } from 'node:crypto';

export const sourceHash = (text: string) => createHash('md5').update(text).digest('hex');

// Preserve exact source substrings and offsets. Never normalize/rewrite scripture.
export function splitPassage(text: string, size = 600, overlap = 80) {
  if (size < 100 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk bounds');
  const chunks: { text: string; start: number; end: number }[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      if (boundary > start + size / 2) end = boundary;
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    if (text.slice(start, end).trim()) chunks.push({ text: text.slice(start, end), start, end });
    if (end === text.length) break;
    const next = Math.max(start + 1, end - overlap);
    const boundary = text.indexOf(' ', next);
    start = boundary >= next && boundary < end ? boundary + 1 : end;
  }
  return chunks;
}
