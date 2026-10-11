import prisma from '../lib/prisma';

export class RAGService {
  async searchPassages(query: string, editionId?: string, limit: number = 5) {
    const where: any = {};
    if (editionId) {
      where.section = { editionId };
    }

    const passages = await prisma.scripturePassage.findMany({
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

  async getContextForPassage(passageId: string, contextSize: number = 3) {
    const passage = await prisma.scripturePassage.findUnique({
      where: { id: passageId },
      include: { section: true },
    });

    if (!passage) return null;

    const surroundingPassages = await prisma.scripturePassage.findMany({
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

  async retrieveForQuestion(question: string, editionId?: string) {
    const passages = await this.searchPassages(question, editionId, 5);
    return passages.map((p: any) => ({
      id: p.id,
      reference: p.reference,
      text: p.text,
      section: p.section.title,
      scripture: p.section.edition.scripture.title,
    }));
  }
}

export const ragService = new RAGService();