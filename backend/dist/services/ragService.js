"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragService = exports.RAGService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class RAGService {
    async searchPassages(query, editionId, limit = 5) {
        const where = {};
        if (editionId) {
            where.section = { editionId };
        }
        const passages = await prisma_1.default.scripturePassage.findMany({
            where: {
                ...where,
                text: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            include: {
                section: {
                    include: {
                        edition: {
                            include: { scripture: true },
                        },
                    },
                },
            },
            take: limit,
        });
        return passages;
    }
    async getContextForPassage(passageId, contextSize = 3) {
        const passage = await prisma_1.default.scripturePassage.findUnique({
            where: { id: passageId },
            include: { section: true },
        });
        if (!passage)
            return null;
        const surroundingPassages = await prisma_1.default.scripturePassage.findMany({
            where: {
                sectionId: passage.sectionId,
                sortOrder: {
                    gte: Math.max(0, passage.sortOrder - contextSize),
                    lte: passage.sortOrder + contextSize,
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        return {
            target: passage,
            context: surroundingPassages,
            section: passage.section,
        };
    }
    async retrieveForQuestion(question, editionId) {
        const passages = await this.searchPassages(question, editionId, 5);
        return passages.map((p) => ({
            id: p.id,
            reference: p.reference,
            text: p.text,
            section: p.section.title,
            scripture: p.section.edition.scripture.title,
        }));
    }
}
exports.RAGService = RAGService;
exports.ragService = new RAGService();
//# sourceMappingURL=ragService.js.map