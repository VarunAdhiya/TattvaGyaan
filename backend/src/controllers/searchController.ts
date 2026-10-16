import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { scriptureService } from '../services/scriptureService';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  editionId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q: query, editionId, limit } = searchQuerySchema.parse(req.query);

      if (!query) {
        return res.json({ results: [] });
      }

      const where: any = {
        OR: [
          { text: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
        ],
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
      const { q: query, limit } = searchQuerySchema.parse(req.query);
      if (!query) {
        return res.json({ results: [] });
      }

      const result = await scriptureService.getScriptures({ search: query, page: 1, limit });
      res.json({ results: result.scriptures });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
