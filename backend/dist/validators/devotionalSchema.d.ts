import { z } from 'zod';
export declare const devotionalCategory: z.ZodEnum<["chalisa", "bhajan", "mantra"]>;
export declare const devotionalFilterSchema: z.ZodObject<{
    category: z.ZodEnum<["chalisa", "bhajan", "mantra"]>;
    search: z.ZodDefault<z.ZodString>;
    deity: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search: string;
    page: number;
    limit: number;
    category: "chalisa" | "bhajan" | "mantra";
    deity?: string | undefined;
}, {
    category: "chalisa" | "bhajan" | "mantra";
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    deity?: string | undefined;
}>;
export declare const devotionalParamsSchema: z.ZodObject<{
    category: z.ZodEnum<["chalisa", "bhajan", "mantra"]>;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
    category: "chalisa" | "bhajan" | "mantra";
}, {
    slug: string;
    category: "chalisa" | "bhajan" | "mantra";
}>;
export declare const calendarMonthSchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    year: number;
    month: number;
}, {
    year: number;
    month: number;
}>;
//# sourceMappingURL=devotionalSchema.d.ts.map