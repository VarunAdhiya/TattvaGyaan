import { Request, Response, NextFunction } from 'express';
export declare class PassageController {
    getBySection(req: Request, res: Response, next: NextFunction): Promise<void>;
    getOne(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const passageController: PassageController;
//# sourceMappingURL=passageController.d.ts.map