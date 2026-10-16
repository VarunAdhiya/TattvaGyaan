import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export class ReadingProgressController {
  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const progress = await prisma.readingProgress.findMany({
        where: { userId: req.userId! },
        orderBy: { lastReadAt: 'desc' },
      });
      res.json({ progress });
    } catch (err) {
      next(err);
    }
  }

  async getByEdition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_editionId: {
            userId: req.userId!,
            editionId: req.params.editionId as string,
          },
        },
      });
      res.json({ progress });
    } catch (err) {
      next(err);
    }
  }

  async upsert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { editionId, sectionId, passageId, pageIndex, percentage } = req.body;
      const progress = await prisma.readingProgress.upsert({
        where: {
          userId_editionId: {
            userId: req.userId!,
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
          userId: req.userId!,
          editionId,
          sectionId,
          passageId,
          pageIndex,
          percentage,
        },
      });
      res.json({ progress });
    } catch (err) {
      next(err);
    }
  }
}

export const readingProgressController = new ReadingProgressController();
