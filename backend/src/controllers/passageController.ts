import { Request, Response, NextFunction } from 'express';
import { scriptureService } from '../services/scriptureService';

export class PassageController {
  async getBySection(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = Array.isArray(req.params.sectionId) ? req.params.sectionId[0] : req.params.sectionId;
      const result = await scriptureService.getSectionPassages(
        sectionId,
        parseInt(req.query.page as string) || 1,
        parseInt(req.query.limit as string) || 50
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const passage = await scriptureService.getPassage(id);
      res.json({ passage });
    } catch (err) {
      next(err);
    }
  }
}

export const passageController = new PassageController();