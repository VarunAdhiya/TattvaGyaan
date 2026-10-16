import { Request, Response, NextFunction } from 'express';
import { scriptureService } from '../services/scriptureService';

export class ScriptureController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scriptureService.getScriptures({
        religionId: req.query.religionId as string,
        language: req.query.language as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const scripture = await scriptureService.getScripture(id);
      res.json({ scripture });
    } catch (err) {
      next(err);
    }
  }

  async getEdition(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const edition = await scriptureService.getEdition(id);
      res.json({ edition });
    } catch (err) {
      next(err);
    }
  }

  async getEditions(req: Request, res: Response, next: NextFunction) {
    try {
      const scriptureId = Array.isArray(req.params.scriptureId) ? req.params.scriptureId[0] : req.params.scriptureId;
      const editions = await scriptureService.getEditionsByScripture(scriptureId);
      res.json({ editions });
    } catch (err) {
      next(err);
    }
  }

  async getReaderContent(req: Request, res: Response, next: NextFunction) {
    try {
      const editionId = Array.isArray(req.params.editionId) ? req.params.editionId[0] : req.params.editionId;
      const sections = await scriptureService.getPassagesForReader(editionId, true);
      res.json({ sections });
    } catch (err) {
      next(err);
    }
  }
}

export const scriptureController = new ScriptureController();
