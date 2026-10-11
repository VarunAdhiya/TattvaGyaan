import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class NoteController {
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const noteController: NoteController;
//# sourceMappingURL=noteController.d.ts.map