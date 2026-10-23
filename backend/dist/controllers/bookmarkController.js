"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookmarkController = exports.BookmarkController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const annotationSchema_1 = require("../validators/annotationSchema");
class BookmarkController {
    async getAll(req, res, next) {
        try {
            const { scriptureId } = annotationSchema_1.annotationQuerySchema.parse(req.query);
            const bookmarks = await prisma_1.default.bookmark.findMany({
                where: { userId: req.userId, ...(scriptureId ? { passage: { section: { edition: { scriptureId } } } } : {}) },
                include: {
                    passage: {
                        include: {
                            section: {
                                include: {
                                    edition: {
                                        include: { scripture: { select: { title: true } } },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json({ bookmarks });
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const { passageId, label } = req.body;
            const bookmark = await prisma_1.default.bookmark.upsert({
                where: { userId_passageId: { userId: req.userId, passageId } },
                update: { label },
                create: {
                    userId: req.userId,
                    passageId,
                    label,
                },
            });
            res.status(201).json({ bookmark });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const bookmark = await prisma_1.default.bookmark.findUnique({
                where: { id },
            });
            if (!bookmark)
                throw new errorHandler_1.AppError('Bookmark not found', 404);
            if (bookmark.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            await prisma_1.default.bookmark.delete({ where: { id } });
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BookmarkController = BookmarkController;
exports.bookmarkController = new BookmarkController();
//# sourceMappingURL=bookmarkController.js.map