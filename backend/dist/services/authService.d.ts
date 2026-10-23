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
        signInMethods: {
            google: boolean;
            password: boolean;
        };
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, data: {
        displayName?: string;
        preferredLang?: string;
    }): Promise<{
        signInMethods: {
            google: boolean;
            password: boolean;
        };
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        preferredLang: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map