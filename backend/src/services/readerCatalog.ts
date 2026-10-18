import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppError } from '../middleware/errorHandler';

type ReaderEdition = { scriptureSlug: string; source: string; contentStatus: string };
const editions = JSON.parse(readFileSync(resolve(__dirname, '../../data/reader-editions.json'), 'utf8')) as ReaderEdition[];
export const readerSlugs = editions.map(edition => edition.scriptureSlug);
export const readerEditionWhere = {
  language: 'hi',
  OR: editions.map(edition => ({ source: edition.source, contentStatus: edition.contentStatus, scripture: { slug: edition.scriptureSlug } })),
};

export function assertReaderEdition(edition: { source: string | null; language: string }) {
  if (edition.language !== 'hi' || !editions.some(item => item.source === edition.source)) {
    throw new AppError('Edition not found', 404);
  }
}
