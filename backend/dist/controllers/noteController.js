"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteController = exports.NoteController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const annotationSchema_1 = require("../validators/annotationSchema");
class NoteController {
    async getAll(req, res, next) {
        try {
            const { scriptureId } = annotationSchema_1.annotationQuerySchema.parse(req.query);
            const notes = await prisma_1.default.note.findMany({
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
            res.json({ notes });
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const { passageId, content } = req.body;
            const note = await prisma_1.default.note.create({
                data: {
                    userId: req.userId,
                    passageId,
                    content,
                },
            });
            res.status(201).json({ note });
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const note = await prisma_1.default.note.findUnique({ where: { id } });
            if (!note)
                throw new errorHandler_1.AppError('Note not found', 404);
            if (note.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            const updated = await prisma_1.default.note.update({
                where: { id },
                data: { content: req.body.content },
            });
            res.json({ note: updated });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const note = await prisma_1.default.note.findUnique({ where: { id } });
            if (!note)
                throw new errorHandler_1.AppError('Note not found', 404);
            if (note.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            await prisma_1.default.note.delete({ where: { id } });
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.NoteController = NoteController;
exports.noteController = new NoteController();
//# sourceMappingURL=noteController.js.map