"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingProgressController = exports.ReadingProgressController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class ReadingProgressController {
    async get(req, res, next) {
        try {
            const progress = await prisma_1.default.readingProgress.findMany({
                where: { userId: req.userId },
                orderBy: { lastReadAt: 'desc' },
            });
            res.json({ progress });
        }
        catch (err) {
            next(err);
        }
    }
    async getByEdition(req, res, next) {
        try {
            const progress = await prisma_1.default.readingProgress.findUnique({
                where: {
                    userId_editionId: {
                        userId: req.userId,
                        editionId: req.params.editionId,
                    },
                },
            });
            res.json({ progress });
        }
        catch (err) {
            next(err);
        }
    }
    async upsert(req, res, next) {
        try {
            const { editionId, sectionId, passageId, pageIndex, percentage } = req.body;
            const progress = await prisma_1.default.readingProgress.upsert({
                where: {
                    userId_editionId: {
                        userId: req.userId,
                        editionId,
                    },
                },
                update: {
                    sectionId: sectionId || null,
                    passageId: passageId || null,
                    pageIndex,
                    percentage,
                    lastReadAt: new Date(),
                },
                create: {
                    userId: req.userId,
                    editionId,
                    sectionId,
                    passageId,
                    pageIndex,
                    percentage,
                },
            });
            res.json({ progress });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReadingProgressController = ReadingProgressController;
exports.readingProgressController = new ReadingProgressController();
//# sourceMappingURL=readingProgressController.js.map