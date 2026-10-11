import { Request, Response, NextFunction } from 'express';
import { scriptureService } from '../services/scriptureService';

export class ReligionController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const religions = await scriptureService.getReligions();
      res.json({ religions });
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const religion = await scriptureService.getReligion(id);
      res.json({ religion });
    } catch (err) {
      next(err);
    }
  }
}

export const religionController = new ReligionController();