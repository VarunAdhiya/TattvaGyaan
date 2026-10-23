import { Request, Response, NextFunction } from 'express';
export declare class GoogleAuthController {
    status(req: Request, res: Response): void;
    start(req: Request, res: Response, next: NextFunction): Promise<void>;
    callback(req: Request, res: Response): Promise<void>;
}
export declare const googleAuthController: GoogleAuthController;
//# sourceMappingURL=googleAuthController.d.ts.map