import { z } from 'zod';
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
    sectionId: z.ZodOptional<z.ZodString>;
    passageIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    responseLang: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    editionId: string;
    responseLang: string;
    sectionId?: string | undefined;
    passageIds?: string[] | undefined;
}, {
    editionId: string;
    sectionId?: string | undefined;
    passageIds?: string[] | undefined;
    responseLang?: string | undefined;
}>;
//# sourceMappingURL=aiSchema.d.ts.map