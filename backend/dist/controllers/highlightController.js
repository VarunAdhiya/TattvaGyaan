"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightController = exports.HighlightController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
class HighlightController {
    async getByEdition(req, res, next) {
        try {
            const editionId = Array.isArray(req.params.editionId) ? req.params.editionId[0] : req.params.editionId;
            const highlights = await prisma_1.default.highlight.findMany({
                where: {
                    userId: req.userId,
                    passage: {
                        section: {
                            editionId,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json({ highlights });
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const { passageId, startOffset, endOffset, color } = req.body;
            const highlight = await prisma_1.default.highlight.create({
                data: {
                    userId: req.userId,
                    passageId,
                    startOffset,
                    endOffset,
                    color,
                },
            });
            res.status(201).json({ highlight });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const highlight = await prisma_1.default.highlight.findUnique({ where: { id } });
            if (!highlight)
                throw new errorHandler_1.AppError('Highlight not found', 404);
            if (highlight.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            await prisma_1.default.highlight.delete({ where: { id } });
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.HighlightController = HighlightController;
exports.highlightController = new HighlightController();
//# sourceMappingURL=highlightController.js.map