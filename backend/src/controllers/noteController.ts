import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { annotationQuerySchema } from '../validators/annotationSchema';

export class NoteController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scriptureId } = annotationQuerySchema.parse(req.query);
      const notes = await prisma.note.findMany({
        where: { userId: req.userId!, ...(scriptureId ? { passage: { section: { edition: { scriptureId } } } } : {}) },
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
      res.json({ notes });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { passageId, content } = req.body;
      const note = await prisma.note.create({
        data: {
          userId: req.userId!,
          passageId,
          content,
        },
      });
      res.status(201).json({ note });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) throw new AppError('Note not found', 404);
      if (note.userId !== req.userId) throw new AppError('Access denied', 403);

      const updated = await prisma.note.update({
        where: { id },
        data: { content: req.body.content },
      });
      res.json({ note: updated });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) throw new AppError('Note not found', 404);
      if (note.userId !== req.userId) throw new AppError('Access denied', 403);

      await prisma.note.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const noteController = new NoteController();
