import prisma from '../lib/prisma';

const editionSelect = { id: true, scriptureId: true, scripture: { select: { title: true } } } as const;
const savedSelect = { passage: { select: { section: { select: { edition: { select: editionSelect } } } } } } as const;

export class ProfileService {
  async activity(userId: string) {
    // Select only location metadata, never all passage text or private note contents.
    const [bookmarks, notes, progress, completedPlans] = await Promise.all([
      prisma.bookmark.findMany({ where: { userId }, select: savedSelect }),
      prisma.note.findMany({ where: { userId }, select: savedSelect }),
      prisma.readingProgress.findMany({ where: { userId }, orderBy: { lastReadAt: 'desc' },
        select: { editionId: true, percentage: true, lastReadAt: true } }),
      prisma.readingPlan.count({ where: { userId, status: 'completed' } }),
    ]);
    const editions = progress.length ? await prisma.scriptureEdition.findMany({
      where: { id: { in: progress.map(item => item.editionId) } }, select: editionSelect,
    }) : [];
    type Book = { scriptureId: string; editionId: string; title: string; bookmarks: number; notes: number; percentage: number | null; lastReadAt: Date | null };
    const books = new Map<string, Book>();
    const ensureBook = (edition: typeof editions[number]) => {
      if (!books.has(edition.scriptureId)) books.set(edition.scriptureId, { scriptureId: edition.scriptureId,
        editionId: edition.id, title: edition.scripture.title, bookmarks: 0, notes: 0, percentage: null, lastReadAt: null });
      return books.get(edition.scriptureId)!;
    };
    for (const item of progress) {
      const edition = editions.find(edition => edition.id === item.editionId);
      if (!edition) continue; // Ignore retired editions rather than offering a broken reader link.
      const book = ensureBook(edition);
      if (!book.lastReadAt) {
        book.lastReadAt = item.lastReadAt;
        book.percentage = Math.min(100, Math.max(0, item.percentage));
      }
    }
    for (const item of bookmarks) ensureBook(item.passage.section.edition).bookmarks++;
    for (const item of notes) ensureBook(item.passage.section.edition).notes++;
    return { stats: { booksOpened: [...books.values()].filter(book => book.lastReadAt).length,
      bookmarks: bookmarks.length, notes: notes.length, completedPlans }, books: [...books.values()] };
  }
}
export const profileService = new ProfileService();
