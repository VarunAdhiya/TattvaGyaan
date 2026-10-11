import { Request, Response, NextFunction } from 'express';
import { readingPlanService } from '../services/readingPlanService';
import { AuthRequest } from '../middleware/auth';

export class ReadingPlanController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plan = await readingPlanService.createPlan(req.userId!, req.body);
      res.status(201).json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plans = await readingPlanService.getUserPlans(req.userId!);
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const plan = await readingPlanService.getPlan(id, req.userId!);
      res.json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const plan = await readingPlanService.updatePlan(id, req.userId!, req.body);
      res.json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await readingPlanService.deletePlan(id, req.userId!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async completeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      const item = await readingPlanService.completePlanItem(
        itemId,
        req.userId!,
        req.body.completed
      );
      res.json({ item });
    } catch (err) {
      next(err);
    }
  }
}

export const readingPlanController = new ReadingPlanController();