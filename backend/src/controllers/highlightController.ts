import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class HighlightController {
  async getByEdition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const editionId = Array.isArray(req.params.editionId) ? req.params.editionId[0] : req.params.editionId;
      const highlights = await prisma.highlight.findMany({
        where: {
          userId: req.userId!,
          passage: {
            section: {
              editionId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ highlights });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { passageId, startOffset, endOffset, color } = req.body;
      const highlight = await prisma.highlight.create({
        data: {
          userId: req.userId!,
          passageId,
          startOffset,
          endOffset,
          color,
        },
      });
      res.status(201).json({ highlight });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const highlight = await prisma.highlight.findUnique({ where: { id } });
      if (!highlight) throw new AppError('Highlight not found', 404);
      if (highlight.userId !== req.userId) throw new AppError('Access denied', 403);

      await prisma.highlight.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const highlightController = new HighlightController();