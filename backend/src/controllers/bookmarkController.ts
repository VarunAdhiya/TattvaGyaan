import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class BookmarkController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookmarks = await prisma.bookmark.findMany({
        where: { userId: req.userId! },
        include: {
          passage: {
            include: {
              section: {
                include: {
                  edition: {
                    include: { scripture: { select: { title: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ bookmarks });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { passageId, label } = req.body;
      const bookmark = await prisma.bookmark.upsert({
        where: { userId_passageId: { userId: req.userId!, passageId } },
        update: { label },
        create: {
          userId: req.userId!,
          passageId,
          label,
        },
      });
      res.status(201).json({ bookmark });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bookmark = await prisma.bookmark.findUnique({
        where: { id },
      });
      if (!bookmark) throw new AppError('Bookmark not found', 404);
      if (bookmark.userId !== req.userId) throw new AppError('Access denied', 403);

      await prisma.bookmark.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const bookmarkController = new BookmarkController();
