"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptureService = exports.ScriptureService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const bookLayoutService_1 = require("./bookLayoutService");
const ramayanCatalog_1 = require("./ramayanCatalog");
const readerCatalog_1 = require("./readerCatalog");
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
                    where: { slug: { in: readerCatalog_1.readerSlugs } },
                    include: {
                        editions: {
                            where: readerCatalog_1.readerEditionWhere,
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
        const where = { slug: { in: readerCatalog_1.readerSlugs } };
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
                        where: readerCatalog_1.readerEditionWhere,
                        orderBy: [{ contentStatus: 'asc' }, { isOriginal: 'desc' }],
                        select: { id: true, title: true, language: true, isOriginal: true, textDirection: true, contentStatus: true, expectedPassages: true, source: true },
                    },
                },
                orderBy: { title: 'asc' },
                skip: (filters.page - 1) * filters.limit,
                take: filters.limit,
            }),
            prisma_1.default.scripture.count({ where }),
        ]);
        return {
            scriptures: scriptures.map(scripture => ({ ...scripture, editions: (0, ramayanCatalog_1.preferRamayanText)(scripture.editions) })),
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
            where: (0, ramayanCatalog_1.isLegacyRamayan)(id) ? { slug: 'ramayana' } : { id },
            include: {
                religion: true,
                editions: {
                    where: readerCatalog_1.readerEditionWhere,
                    orderBy: [{ contentStatus: 'asc' }, { isOriginal: 'desc' }],
                    include: {
                        _count: { select: { sections: true } },
                    },
                },
            },
        });
        if (!scripture || !readerCatalog_1.readerSlugs.includes(scripture.slug))
            throw new errorHandler_1.AppError('Scripture not found', 404);
        return { ...scripture, editions: (0, ramayanCatalog_1.preferRamayanText)(scripture.editions) };
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
        (0, readerCatalog_1.assertReaderEdition)(edition);
        return edition;
    }
    async getSectionPassages(sectionId, page = 1, limit = 50) {
        const section = await prisma_1.default.scriptureSection.findUnique({
            where: { id: sectionId },
            include: {
                edition: { select: { id: true, source: true, language: true, textDirection: true, scripture: { select: { title: true } } } },
            },
        });
        if (!section)
            throw new errorHandler_1.AppError('Section not found', 404);
        (0, readerCatalog_1.assertReaderEdition)(section.edition);
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
        (0, readerCatalog_1.assertReaderEdition)(passage.section.edition);
        return passage;
    }
    async getEditionsByScripture(scriptureId) {
        if ((0, ramayanCatalog_1.isLegacyRamayan)(scriptureId)) {
            scriptureId = (await prisma_1.default.scripture.findUniqueOrThrow({ where: { slug: 'ramayana' }, select: { id: true } })).id;
        }
        const editions = await prisma_1.default.scriptureEdition.findMany({
            where: { scriptureId, ...readerCatalog_1.readerEditionWhere },
            orderBy: { isOriginal: 'desc' },
        });
        return (0, ramayanCatalog_1.preferRamayanText)(editions);
    }
    async getPassagesForReader(editionId, includeBookText = false) {
        const edition = await prisma_1.default.scriptureEdition.findUnique({ where: { id: editionId }, select: { id: true, source: true, language: true } });
        if (!edition)
            throw new errorHandler_1.AppError('Edition not found', 404);
        (0, readerCatalog_1.assertReaderEdition)(edition);
        // Source-identified typeset editions use complete, ordered text. Position
        // lookups and other editions keep their lightweight paginated behavior.
        const bookText = includeBookText && edition.language === 'hi' && bookLayoutService_1.TYPESET_SOURCES.includes(edition.source || '');
        const sections = await prisma_1.default.scriptureSection.findMany({
            where: { editionId },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: { id: true, title: true, slug: true, parentId: true, _count: { select: { passages: true } },
                passages: bookText ? {
                    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                    select: { id: true, sectionId: true, reference: true, text: true, sourceNotes: true },
                } : false,
            },
        });
        return sections.map(section => ({ ...section,
            ...(bookText ? { readerBlocks: (0, bookLayoutService_1.bookReadingBlocks)(edition.source, section.slug, section.passages) } : {}),
        }));
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