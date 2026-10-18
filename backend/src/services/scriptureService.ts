import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { TYPESET_SOURCES, bookReadingBlocks } from './bookLayoutService';
import { isLegacyRamayan, preferRamayanText } from './ramayanCatalog';

export class ScriptureService {
  async getReligions() {
    return prisma.religion.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { scriptures: true } },
      },
    });
  }

  async getReligion(id: string) {
    const religion = await prisma.religion.findUnique({
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
    if (!religion) throw new AppError('Religion not found', 404);
    return religion;
  }

  async getScriptures(filters: { religionId?: string; language?: string; search?: string; page: number; limit: number }) {
    const where: Prisma.ScriptureWhereInput = {};
    if (filters.religionId) where.religionId = filters.religionId;
    if (filters.language) {
      where.editions = { some: { language: filters.language } };
    }
    if (filters.search) {
      where.AND = filters.search.normalize('NFC').trim().split(/\s+/u).map(term => ({
        searchText: { contains: term, mode: 'insensitive' },
      }));
    }

    const [scriptures, total] = await Promise.all([
      prisma.scripture.findMany({
        where,
        include: {
          religion: { select: { id: true, name: true, slug: true } },
          editions: {
            orderBy: [{ contentStatus: 'asc' }, { isOriginal: 'desc' }],
            select: { id: true, title: true, language: true, isOriginal: true, textDirection: true, contentStatus: true, expectedPassages: true, source: true },
          },
        },
        orderBy: { title: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.scripture.count({ where }),
    ]);

    return {
      scriptures: scriptures.map(scripture => ({ ...scripture, editions: preferRamayanText(scripture.editions) })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getScripture(id: string) {
    const scripture = await prisma.scripture.findUnique({
      where: isLegacyRamayan(id) ? { slug: 'ramayana' } : { id },
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
    if (!scripture) throw new AppError('Scripture not found', 404);
    return { ...scripture, editions: preferRamayanText(scripture.editions) };
  }

  async getEdition(id: string) {
    const edition = await prisma.scriptureEdition.findUnique({
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
    if (!edition) throw new AppError('Edition not found', 404);
    return edition;
  }

  async getSectionPassages(sectionId: string, page: number = 1, limit: number = 50) {
    const section = await prisma.scriptureSection.findUnique({
      where: { id: sectionId },
      include: {
        edition: { select: { id: true, language: true, textDirection: true, scripture: { select: { title: true } } } },
      },
    });
    if (!section) throw new AppError('Section not found', 404);

    const [passages, total] = await Promise.all([
      prisma.scripturePassage.findMany({
        where: { sectionId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.scripturePassage.count({ where: { sectionId } }),
    ]);

    return {
      section,
      passages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPassage(id: string) {
    const passage = await prisma.scripturePassage.findUnique({
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
    if (!passage) throw new AppError('Passage not found', 404);
    return passage;
  }

  async getEditionsByScripture(scriptureId: string) {
    if (isLegacyRamayan(scriptureId)) {
      scriptureId = (await prisma.scripture.findUniqueOrThrow({ where: { slug: 'ramayana' }, select: { id: true } })).id;
    }
    const editions = await prisma.scriptureEdition.findMany({
      where: { scriptureId },
      orderBy: { isOriginal: 'desc' },
    });
    return preferRamayanText(editions);
  }

  async getPassagesForReader(editionId: string, includeBookText = false) {
    const edition = await prisma.scriptureEdition.findUnique({ where: { id: editionId }, select: { id: true, source: true, language: true } });
    if (!edition) throw new AppError('Edition not found', 404);
    // Source-identified typeset editions use complete, ordered text. Position
    // lookups and other editions keep their lightweight paginated behavior.
    const bookText = includeBookText && edition.language === 'hi' && TYPESET_SOURCES.includes(edition.source || '');
    const sections = await prisma.scriptureSection.findMany({
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
      ...(bookText ? { readerBlocks: bookReadingBlocks(edition.source, section.slug, section.passages) } : {}),
    }));
  }

  async getPassagePosition(id: string) {
    const passage = await prisma.scripturePassage.findUnique({ where: { id }, include: { section: { select: { editionId: true } } } });
    if (!passage) throw new AppError('Passage not found', 404);
    const [sections, preceding] = await Promise.all([
      this.getPassagesForReader(passage.section.editionId),
      prisma.scripturePassage.count({ where: { sectionId: passage.sectionId, OR: [
        { sortOrder: { lt: passage.sortOrder } },
        { sortOrder: passage.sortOrder, id: { lt: passage.id } },
      ] } }),
    ]);
    let pageIndex = 2; // Cover and contents precede stable, two-passage reading pages.
    for (const section of sections) {
      if (section.id === passage.sectionId) break;
      pageIndex += Math.ceil(section._count.passages / 2);
    }
    return { editionId: passage.section.editionId, pageIndex: pageIndex + Math.floor(preceding / 2) };
  }
}

export const scriptureService = new ScriptureService();
