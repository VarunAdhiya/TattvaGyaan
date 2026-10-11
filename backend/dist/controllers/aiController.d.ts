import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class AIController {
    explain(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    summarize(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const aiController: AIController;
//# sourceMappingURL=aiController.d.ts.map