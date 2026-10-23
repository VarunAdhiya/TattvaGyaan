import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    preferredLang: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    preferredLang: string;
    password: string;
    displayName?: string | undefined;
}, {
    email: string;
    username: string;
    password: string;
    displayName?: string | undefined;
    preferredLang?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    connectGoogle: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    connectGoogle?: boolean | undefined;
}, {
    email: string;
    password: string;
    connectGoogle?: boolean | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    preferredLang: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    preferredLang?: string | undefined;
}, {
    displayName?: string | undefined;
    preferredLang?: string | undefined;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
//# sourceMappingURL=authSchema.d.ts.map