import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      const editionId = req.query.editionId as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      const where: any = {
        text: { contains: query, mode: 'insensitive' },
      };
      if (editionId) {
        where.section = { editionId };
      }

      const results = await prisma.scripturePassage.findMany({
        where,
        include: {
          section: {
            include: {
              edition: {
                include: {
                  scripture: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
        take: limit,
      });

      res.json({
        results: results.map((r: any) => ({
          id: r.id,
          reference: r.reference,
          text: r.text.substring(0, 200),
          section: r.section.title,
          scripture: r.section.edition.scripture.title,
          editionId: r.section.editionId,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  async searchScriptures(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      const results = await prisma.scripture.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          religion: { select: { name: true, slug: true } },
        },
        take: 10,
      });

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();