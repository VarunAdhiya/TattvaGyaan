import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const scriptureFilterSchema: z.ZodObject<{
    religionId: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
    language?: string | undefined;
    religionId?: string | undefined;
}, {
    search?: string | undefined;
    language?: string | undefined;
    religionId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
//# sourceMappingURL=scriptureSchema.d.ts.map