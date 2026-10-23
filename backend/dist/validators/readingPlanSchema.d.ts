import { z } from 'zod';
export declare const createReadingPlanSchema: z.ZodObject<{
    editionId: z.ZodString;
    title: z.ZodString;
    targetDays: z.ZodNumber;
    minutesPerDay: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"">, z.ZodString]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    editionId: string;
    targetDays: number;
    startDate?: string | undefined;
    minutesPerDay?: number | undefined;
}, {
    title: string;
    editionId: string;
    targetDays: number;
    startDate?: string | undefined;
    minutesPerDay?: number | undefined;
}>;
export declare const updateReadingPlanSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["active", "paused", "completed", "cancelled"]>>;
    targetDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "cancelled" | "completed" | "active" | "paused" | undefined;
    targetDays?: number | undefined;
}, {
    status?: "cancelled" | "completed" | "active" | "paused" | undefined;
    targetDays?: number | undefined;
}>;
export declare const completePlanItemSchema: z.ZodObject<{
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    completed: boolean;
}, {
    completed: boolean;
}>;
//# sourceMappingURL=readingPlanSchema.d.ts.map