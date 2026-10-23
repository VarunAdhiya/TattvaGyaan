import { Request } from 'express';
export declare const saveSession: (req: Request) => Promise<void>;
export declare function createUserSession(req: Request, userId: string): Promise<void>;
//# sourceMappingURL=sessionService.d.ts.map