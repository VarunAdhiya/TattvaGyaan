"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = exports.ProfileService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const editionSelect = { id: true, scriptureId: true, scripture: { select: { title: true } } };
const savedSelect = { passage: { select: { section: { select: { edition: { select: editionSelect } } } } } };
class ProfileService {
    async activity(userId) {
        // Select only location metadata, never all passage text or private note contents.
        const [bookmarks, notes, progress, completedPlans] = await Promise.all([
            prisma_1.default.bookmark.findMany({ where: { userId }, select: savedSelect }),
            prisma_1.default.note.findMany({ where: { userId }, select: savedSelect }),
            prisma_1.default.readingProgress.findMany({ where: { userId }, orderBy: { lastReadAt: 'desc' },
                select: { editionId: true, percentage: true, lastReadAt: true } }),
            prisma_1.default.readingPlan.count({ where: { userId, status: 'completed' } }),
        ]);
        const editions = progress.length ? await prisma_1.default.scriptureEdition.findMany({
            where: { id: { in: progress.map(item => item.editionId) } }, select: editionSelect,
        }) : [];
        const books = new Map();
        const ensureBook = (edition) => {
            if (!books.has(edition.scriptureId))
                books.set(edition.scriptureId, { scriptureId: edition.scriptureId,
                    editionId: edition.id, title: edition.scripture.title, bookmarks: 0, notes: 0, percentage: null, lastReadAt: null });
            return books.get(edition.scriptureId);
        };
        for (const item of progress) {
            const edition = editions.find(edition => edition.id === item.editionId);
            if (!edition)
                continue; // Ignore retired editions rather than offering a broken reader link.
            const book = ensureBook(edition);
            if (!book.lastReadAt) {
                book.lastReadAt = item.lastReadAt;
                book.percentage = Math.min(100, Math.max(0, item.percentage));
            }
        }
        for (const item of bookmarks)
            ensureBook(item.passage.section.edition).bookmarks++;
        for (const item of notes)
            ensureBook(item.passage.section.edition).notes++;
        return { stats: { booksOpened: [...books.values()].filter(book => book.lastReadAt).length,
                bookmarks: bookmarks.length, notes: notes.length, completedPlans }, books: [...books.values()] };
    }
}
exports.ProfileService = ProfileService;
exports.profileService = new ProfileService();
//# sourceMappingURL=profileService.js.map