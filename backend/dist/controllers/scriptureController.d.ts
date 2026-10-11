import { Request, Response, NextFunction } from 'express';
export declare class ScriptureController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getOne(req: Request, res: Response, next: NextFunction): Promise<void>;
    getEdition(req: Request, res: Response, next: NextFunction): Promise<void>;
    getEditions(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReaderContent(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const scriptureController: ScriptureController;
//# sourceMappingURL=scriptureController.d.ts.map