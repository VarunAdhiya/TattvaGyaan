import { Request, Response, NextFunction } from 'express';
export declare class SearchController {
    search(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    searchScriptures(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const searchController: SearchController;
//# sourceMappingURL=searchController.d.ts.map