"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchController = exports.SearchController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const scriptureService_1 = require("../services/scriptureService");
const zod_1 = require("zod");
const searchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().max(200).default(''),
    editionId: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
class SearchController {
    async search(req, res, next) {
        try {
            const { q: query, editionId, limit } = searchQuerySchema.parse(req.query);
            if (!query) {
                return res.json({ results: [] });
            }
            const where = {
                OR: [
                    { text: { contains: query, mode: 'insensitive' } },
                    { reference: { contains: query, mode: 'insensitive' } },
                ],
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
            const { q: query, limit } = searchQuerySchema.parse(req.query);
            if (!query) {
                return res.json({ results: [] });
            }
            const result = await scriptureService_1.scriptureService.getScriptures({ search: query, page: 1, limit });
            res.json({ results: result.scriptures });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SearchController = SearchController;
exports.searchController = new SearchController();
//# sourceMappingURL=searchController.js.map