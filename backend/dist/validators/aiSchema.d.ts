import { z } from 'zod';
export declare const libraryQuestionSchema: z.ZodObject<{
    question: z.ZodString;
    responseLang: z.ZodDefault<z.ZodEnum<["hi", "en"]>>;
    editionId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    question: string;
    responseLang: "en" | "hi";
    editionId?: string | undefined;
}, {
    question: string;
    editionId?: string | undefined;
    responseLang?: "en" | "hi" | undefined;
}>;
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
    passageId?: string | undefined;
    sectionId?: string | undefined;
    editionId?: string | undefined;
    selectedText?: string | undefined;
    question?: string | undefined;
    conversationId?: string | undefined;
}, {
    passageId?: string | undefined;
    sectionId?: string | undefined;
    editionId?: string | undefined;
    selectedText?: string | undefined;
    question?: string | undefined;
    responseLang?: string | undefined;
    style?: "simple" | "detailed" | "scholarly" | undefined;
    conversationId?: string | undefined;
}>;
export declare const askQuestionSchema: z.ZodObject<{
    chapterKey: z.ZodOptional<z.ZodString>;
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
    passageId?: string | undefined;
    sectionId?: string | undefined;
    editionId?: string | undefined;
    selectedText?: string | undefined;
    chapterKey?: string | undefined;
    conversationId?: string | undefined;
}, {
    question: string;
    passageId?: string | undefined;
    sectionId?: string | undefined;
    editionId?: string | undefined;
    selectedText?: string | undefined;
    responseLang?: string | undefined;
    style?: "simple" | "detailed" | "scholarly" | undefined;
    chapterKey?: string | undefined;
    conversationId?: string | undefined;
}>;
export declare const summarizeSchema: z.ZodObject<{
    chapterKey: z.ZodOptional<z.ZodString>;
    editionId: z.ZodString;
    sectionId: z.ZodString;
    responseLang: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sectionId: string;
    editionId: string;
    responseLang: string;
    chapterKey?: string | undefined;
}, {
    sectionId: string;
    editionId: string;
    responseLang?: string | undefined;
    chapterKey?: string | undefined;
}>;
//# sourceMappingURL=aiSchema.d.ts.map