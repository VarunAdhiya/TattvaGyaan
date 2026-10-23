import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const libraryAiController: {
    catalog(_req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    ask(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    history(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    clearHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=libraryAiController.d.ts.map