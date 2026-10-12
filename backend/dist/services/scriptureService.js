"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptureService = exports.ScriptureService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
class ScriptureService {
    async getReligions() {
        return prisma_1.default.religion.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: { select: { scriptures: true } },
            },
        });
    }
    async getReligion(id) {
        const religion = await prisma_1.default.religion.findUnique({
            where: { id },
            include: {
                scriptures: {
                    include: {
                        editions: {
                            select: { id: true, title: true, language: true, isOriginal: true },
                        },
                    },
                },
            },
        });
        if (!religion)
            throw new errorHandler_1.AppError('Religion not found', 404);
        return religion;
    }
    async getScriptures(filters) {
        const where = {};
        if (filters.religionId)
            where.religionId = filters.religionId;
        if (filters.language) {
            where.editions = { some: { language: filters.language } };
        }
        if (filters.search) {
            where.AND = filters.search.normalize('NFC').trim().split(/\s+/u).map(term => ({
                searchText: { contains: term, mode: 'insensitive' },
            }));
        }
        const [scriptures, total] = await Promise.all([
            prisma_1.default.scripture.findMany({
                where,
                include: {
                    religion: { select: { id: true, name: true, slug: true } },
                    editions: {
                        orderBy: [{ contentStatus: 'asc' }, { isOriginal: 'desc' }],
                        select: { id: true, title: true, language: true, isOriginal: true, textDirection: true, contentStatus: true, expectedPassages: true },
                    },
                },
                orderBy: { title: 'asc' },
                skip: (filters.page - 1) * filters.limit,
                take: filters.limit,
            }),
            prisma_1.default.scripture.count({ where }),
        ]);
        return {
            scriptures,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    }
    async getScripture(id) {
        const scripture = await prisma_1.default.scripture.findUnique({
            where: { id },
            include: {
                religion: true,
                editions: {
                    orderBy: [{ contentStatus: 'asc' }, { isOriginal: 'desc' }],
                    include: {
                        _count: { select: { sections: true } },
                    },
                },
            },
        });
        if (!scripture)
            throw new errorHandler_1.AppError('Scripture not found', 404);
        return scripture;
    }
    async getEdition(id) {
        const edition = await prisma_1.default.scriptureEdition.findUnique({
            where: { id },
            include: {
                scripture: {
                    include: { religion: true },
                },
                sections: {
                    where: { parentId: null },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        children: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            },
        });
        if (!edition)
            throw new errorHandler_1.AppError('Edition not found', 404);
        return edition;
    }
    async getSectionPassages(sectionId, page = 1, limit = 50) {
        const section = await prisma_1.default.scriptureSection.findUnique({
            where: { id: sectionId },
            include: {
                edition: { select: { id: true, language: true, textDirection: true, scripture: { select: { title: true } } } },
            },
        });
        if (!section)
            throw new errorHandler_1.AppError('Section not found', 404);
        const [passages, total] = await Promise.all([
            prisma_1.default.scripturePassage.findMany({
                where: { sectionId },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.default.scripturePassage.count({ where: { sectionId } }),
        ]);
        return {
            section,
            passages,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getPassage(id) {
        const passage = await prisma_1.default.scripturePassage.findUnique({
            where: { id },
            include: {
                section: {
                    include: {
                        edition: {
                            include: { scripture: true },
                        },
                    },
                },
            },
        });
        if (!passage)
            throw new errorHandler_1.AppError('Passage not found', 404);
        return passage;
    }
    async getEditionsByScripture(scriptureId) {
        const editions = await prisma_1.default.scriptureEdition.findMany({
            where: { scriptureId },
            orderBy: { isOriginal: 'desc' },
        });
        return editions;
    }
    async getPassagesForReader(editionId) {
        const edition = await prisma_1.default.scriptureEdition.findUnique({ where: { id: editionId }, select: { id: true } });
        if (!edition)
            throw new errorHandler_1.AppError('Edition not found', 404);
        const sections = await prisma_1.default.scriptureSection.findMany({
            where: { editionId },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: { id: true, title: true, slug: true, parentId: true, _count: { select: { passages: true } } },
        });
        return sections;
    }
    async getPassagePosition(id) {
        const passage = await prisma_1.default.scripturePassage.findUnique({ where: { id }, include: { section: { select: { editionId: true } } } });
        if (!passage)
            throw new errorHandler_1.AppError('Passage not found', 404);
        const [sections, preceding] = await Promise.all([
            this.getPassagesForReader(passage.section.editionId),
            prisma_1.default.scripturePassage.count({ where: { sectionId: passage.sectionId, OR: [
                        { sortOrder: { lt: passage.sortOrder } },
                        { sortOrder: passage.sortOrder, id: { lt: passage.id } },
                    ] } }),
        ]);
        let pageIndex = 2; // Cover and contents precede stable, two-passage reading pages.
        for (const section of sections) {
            if (section.id === passage.sectionId)
                break;
            pageIndex += Math.ceil(section._count.passages / 2);
        }
        return { editionId: passage.section.editionId, pageIndex: pageIndex + Math.floor(preceding / 2) };
    }
}
exports.ScriptureService = ScriptureService;
exports.scriptureService = new ScriptureService();
//# sourceMappingURL=scriptureService.js.map