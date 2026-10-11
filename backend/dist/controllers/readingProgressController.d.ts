import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReadingProgressController {
    get(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getByEdition(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    upsert(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const readingProgressController: ReadingProgressController;
//# sourceMappingURL=readingProgressController.d.ts.map