import { z } from 'zod';
export declare const explainSchema: z.ZodObject<{
    passageId: z.ZodOptional<z.ZodString>;
    selectedText: z.ZodOptional<z.ZodString>;
    question: z.ZodOptional<z.ZodString>;
    responseLang: z.ZodDefault<z.ZodString>;
    style: z.ZodDefault<z.ZodEnum<["simple", "detailed", "scholarly"]>>;
    editionId: z.ZodOptional<z.ZodString>;
    sectionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    responseLang: string;
    style: "simple" | "detailed" | "scholarly";
    editionId?: string | undefined;
    sectionId?: string | undefined;
    passageId?: string | undefined;
    selectedText?: string | undefined;
    question?: string | undefined;
    conversationId?: string | undefined;
}, {
    editionId?: string | undefined;
    sectionId?: string | undefined;
    passageId?: string | undefined;
    selectedText?: string | undefined;
    question?: string | undefined;
    responseLang?: string | undefined;
    style?: "simple" | "detailed" | "scholarly" | undefined;
    conversationId?: string | undefined;
}>;
export declare const askQuestionSchema: z.ZodObject<{
    question: z.ZodString;
    editionId: z.ZodOptional<z.ZodString>;
    sectionId: z.ZodOptional<z.ZodString>;
    passageId: z.ZodOptional<z.ZodString>;
    selectedText: z.ZodOptional<z.ZodString>;
    responseLang: z.ZodDefault<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    style: z.ZodDefault<z.ZodEnum<["simple", "detailed", "scholarly"]>>;
}, "strip", z.ZodTypeAny, {
    question: string;
    responseLang: string;
    style: "simple" | "detailed" | "scholarly";
    editionId?: string | undefined;
    sectionId?: string | undefined;
    passageId?: string | undefined;
    selectedText?: string | undefined;
    conversationId?: string | undefined;
}, {
    question: string;
    editionId?: string | undefined;
    sectionId?: string | undefined;
    passageId?: string | undefined;
    selectedText?: string | undefined;
    responseLang?: string | undefined;
    style?: "simple" | "detailed" | "scholarly" | undefined;
    conversationId?: string | undefined;
}>;
export declare const summarizeSchema: z.ZodObject<{
    editionId: z.ZodString;
    sectionId: z.ZodString;
    responseLang: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    editionId: string;
    sectionId: string;
    responseLang: string;
}, {
    editionId: string;
    sectionId: string;
    responseLang?: string | undefined;
}>;
//# sourceMappingURL=aiSchema.d.ts.map