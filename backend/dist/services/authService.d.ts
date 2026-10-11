export declare class AuthService {
    register(data: {
        email: string;
        username: string;
        password: string;
        displayName?: string;
        preferredLang?: string;
    }): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
    }>;
    updateProfile(userId: string, data: {
        displayName?: string;
        preferredLang?: string;
    }): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
    }>;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map