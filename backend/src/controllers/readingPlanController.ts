import { Request, Response, NextFunction } from 'express';
import { readingPlanService } from '../services/readingPlanService';
import { AppError } from '../middleware/errorHandler';

export class ReadingPlanController {
  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { editionId, title, targetDays, startDate, minutesPerDay } = req.body;
      const plan = await readingPlanService.createPlan((req as any).userId, {
        editionId,
        title,
        targetDays,
        startDate,
        minutesPerDay,
      });
      res.status(201).json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async getUserPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await readingPlanService.getUserPlans((req as any).userId);
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  }

  async getPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const plan = await readingPlanService.getPlan(id, (req as any).userId);
      res.json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, targetDays } = req.body;
      const plan = await readingPlanService.updatePlan(id, (req as any).userId, { status, targetDays });
      res.json({ plan });
    } catch (err) {
      next(err);
    }
  }

  async completePlanItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
      const { completed } = req.body;
      const item = await readingPlanService.completePlanItem(id, (req as any).userId, completed);
      res.json({ item });
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await readingPlanService.deletePlan(id, (req as any).userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const readingPlanController = new ReadingPlanController();
