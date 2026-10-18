import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { AppError } from '../middleware/errorHandler';

export const GARUDA_SOURCE = 'urn:sha256:c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0';
export const MANUSMRITI_SOURCE = 'urn:sha256:992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3';
export const RAMAYAN_SOURCE = 'urn:sha256:759f2adbfd2fc1191ff8576401d1cbc34bbfefaf79a573e8747c53d4c858af75';
export const GITA_SOURCE = 'https://gitabhawan.org.in/gita/research';
export const TYPESET_SOURCES = [GARUDA_SOURCE, MANUSMRITI_SOURCE, RAMAYAN_SOURCE, GITA_SOURCE, 'urn:sha256:eb00713009dd7b6a81feec459c7518a494f851dc79d77e5d67856e4d8d70d809'];
const layoutFiles: Record<string, string> = { [GARUDA_SOURCE]: 'garuda-purana.json', [MANUSMRITI_SOURCE]: 'manusmriti.json', [RAMAYAN_SOURCE]: 'ramayan-study.json' };
type Passage = { reference: string; text: string };
type Block = { kind: string; chapterKey?: string; title?: string; keepTogether?: boolean; keepWithNext?: boolean; pageBreakBefore?: boolean; sourcePage?: number; printedPage?: string | null; parts: { reference: string; start: number; end: number }[] };
type Layout = { source: string; sections: Record<string, { hashes: Record<string, string>; blocks: Block[] }> };
const layouts = new Map<string, Layout>();

export function bookReadingBlocks(source: string | null, slug: string, passages: Passage[]): Block[] | undefined {
  // This attributed text edition already stores one translation per verse.
  // Derive ranges from the actual database text, without prose joins or the
  // Mahabharat family-tree heuristic (whose references overlap Gita chapter 3).
  if (source === GITA_SOURCE) return passages.map(passage => ({
    kind: 'translation', keepTogether: true,
    parts: [{ reference: passage.reference, start: 0, end: passage.text.length }],
  }));
  if (!source || !layoutFiles[source]) return undefined;
  if (!layouts.has(source)) layouts.set(source, JSON.parse(readFileSync(resolve(__dirname, '../../data/layouts', layoutFiles[source]), 'utf8')) as Layout);
  const layout = layouts.get(source)!;
  const section = layout.sections[slug];
  if (layout.source !== source || !section || passages.length !== Object.keys(section.hashes).length ||
      passages.some(passage => createHash('sha256').update(passage.text).digest('hex') !== section.hashes[passage.reference])) {
    throw new AppError('Source text differs from its reading layout. Please rebuild and verify the layout before reading.', 409);
  }
  return section.blocks;
}

export function chapterContext(source: string | null, section: { slug: string; title: string; passages: Passage[] }, chapterKey?: string) {
  if (!chapterKey) return { title: section.title, passages: section.passages };
  const blocks = bookReadingBlocks(source, section.slug, section.passages);
  const first = blocks?.findIndex(block => block.chapterKey === chapterKey) ?? -1;
  if (!blocks || first < 0) throw new AppError('Chapter does not belong to this source section', 400);
  let end = first + 1;
  while (end < blocks.length && blocks[end].kind !== 'chapter') end += 1;
  const byReference = new Map(section.passages.map(passage => [passage.reference, passage]));
  return { title: blocks[first].title || section.title, passages: blocks.slice(first, end).map(block => ({
    reference: [...new Set(block.parts.map(part => part.reference))].join(', '),
    text: block.parts.map((part, index) => (index && block.parts[index - 1].reference !== part.reference ? '\n' : '') +
      byReference.get(part.reference)!.text.slice(part.start, part.end)).join(''),
  })) };
}
