import { Request, Response, NextFunction } from 'express';
export declare class ReadingPlanController {
    createPlan(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUserPlans(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPlan(req: Request, res: Response, next: NextFunction): Promise<void>;
    updatePlan(req: Request, res: Response, next: NextFunction): Promise<void>;
    completePlanItem(req: Request, res: Response, next: NextFunction): Promise<void>;
    deletePlan(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const readingPlanController: ReadingPlanController;
//# sourceMappingURL=readingPlanController.d.ts.map