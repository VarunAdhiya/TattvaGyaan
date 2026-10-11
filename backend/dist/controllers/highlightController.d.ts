import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class HighlightController {
    getByEdition(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const highlightController: HighlightController;
//# sourceMappingURL=highlightController.d.ts.map