import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class BookmarkController {
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const bookmarkController: BookmarkController;
//# sourceMappingURL=bookmarkController.d.ts.map