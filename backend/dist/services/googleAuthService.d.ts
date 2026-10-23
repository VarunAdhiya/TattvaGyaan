import { OAuth2Client } from 'google-auth-library';
export type GoogleIdentity = {
    sub: string;
    email: string;
    name?: string;
};
export type GoogleFlow = {
    stateHash: string;
    nonce: string;
    verifier: string;
    expires: number;
    intent: 'login' | 'register';
};
export declare const GOOGLE_FLOW_TTL: number;
declare module 'express-session' {
    interface SessionData {
        userId?: string;
        googleFlow?: GoogleFlow;
        googleLink?: GoogleIdentity & {
            expires: number;
        };
    }
}
export declare function secureEqual(left: string, right: string): boolean;
export declare function stateHash(state: string): string;
export declare class GoogleAuthService {
    enabled(): boolean;
    client(): OAuth2Client;
    begin(intent: 'login' | 'register'): {
        flow: GoogleFlow;
        url: string;
    };
    identity(code: string, flow: GoogleFlow): Promise<GoogleIdentity>;
    resolve(identity: GoogleIdentity): Promise<{
        user: {
            id: string;
            email: string;
            username: string;
            displayName: string | null;
            preferredLang: string;
            createdAt: Date;
        };
        linkRequired: boolean;
    } | {
        user: null;
        linkRequired: boolean;
    }>;
    link(userId: string, identity: GoogleIdentity & {
        expires: number;
    }): Promise<void>;
}
export declare const googleAuthService: GoogleAuthService;
//# sourceMappingURL=googleAuthService.d.ts.map