import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReadingPlanController {
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOne(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    completeItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const readingPlanController: ReadingPlanController;
//# sourceMappingURL=readingPlanController.d.ts.map