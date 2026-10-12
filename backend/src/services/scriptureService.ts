import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

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
    const where: any = {};
    if (filters.religionId) where.religionId = filters.religionId;
    if (filters.language) {
      where.editions = { some: { language: filters.language } };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [scriptures, total] = await Promise.all([
      prisma.scripture.findMany({
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
      prisma.scripture.count({ where }),
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

  async getScripture(id: string) {
    const scripture = await prisma.scripture.findUnique({
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
    if (!scripture) throw new AppError('Scripture not found', 404);
    return scripture;
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
        orderBy: { sortOrder: 'asc' },
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
    const editions = await prisma.scriptureEdition.findMany({
      where: { scriptureId },
      orderBy: { isOriginal: 'desc' },
    });
    if (editions.length === 0) throw new AppError('No editions found for this scripture', 404);
    return editions;
  }

  async getPassagesForReader(editionId: string) {
    const sections = await prisma.scriptureSection.findMany({
      where: { editionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        passages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return sections;
  }
}

export const scriptureService = new ScriptureService();
