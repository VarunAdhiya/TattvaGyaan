"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchController = exports.SearchController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class SearchController {
    async search(req, res, next) {
        try {
            const query = req.query.q;
            const editionId = req.query.editionId;
            const limit = parseInt(req.query.limit) || 20;
            if (!query || query.length < 2) {
                return res.json({ results: [] });
            }
            const where = {
                text: { contains: query, mode: 'insensitive' },
            };
            if (editionId) {
                where.section = { editionId };
            }
            const results = await prisma_1.default.scripturePassage.findMany({
                where,
                include: {
                    section: {
                        include: {
                            edition: {
                                include: {
                                    scripture: { select: { id: true, title: true } },
                                },
                            },
                        },
                    },
                },
                take: limit,
            });
            res.json({
                results: results.map((r) => ({
                    id: r.id,
                    reference: r.reference,
                    text: r.text.substring(0, 200),
                    section: r.section.title,
                    scripture: r.section.edition.scripture.title,
                    editionId: r.section.editionId,
                })),
            });
        }
        catch (err) {
            next(err);
        }
    }
    async searchScriptures(req, res, next) {
        try {
            const query = req.query.q;
            if (!query || query.length < 2) {
                return res.json({ results: [] });
            }
            const results = await prisma_1.default.scripture.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                include: {
                    religion: { select: { name: true, slug: true } },
                },
                take: 10,
            });
            res.json({ results });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SearchController = SearchController;
exports.searchController = new SearchController();
//# sourceMappingURL=searchController.js.map