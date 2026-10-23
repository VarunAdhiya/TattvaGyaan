"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeSchema = exports.askQuestionSchema = exports.explainSchema = exports.libraryQuestionSchema = void 0;
const zod_1 = require("zod");
exports.libraryQuestionSchema = zod_1.z.object({
    question: zod_1.z.string().trim().min(3).max(1000),
    responseLang: zod_1.z.enum(['hi', 'en']).default('hi'),
    editionId: zod_1.z.string().min(1).max(100).optional(),
}).strict();
exports.explainSchema = zod_1.z.object({
    passageId: zod_1.z.string().optional(),
    selectedText: zod_1.z.string().trim().min(1).max(5000).optional(),
    question: zod_1.z.string().max(2000).optional(),
    responseLang: zod_1.z.string().default('en'),
    style: zod_1.z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
    editionId: zod_1.z.string().optional(),
    sectionId: zod_1.z.string().optional(),
    conversationId: zod_1.z.string().optional(),
});
exports.askQuestionSchema = zod_1.z.object({
    chapterKey: zod_1.z.string().max(100).optional(),
    question: zod_1.z.string().trim().min(1).max(2000),
    editionId: zod_1.z.string().optional(),
    sectionId: zod_1.z.string().optional(),
    passageId: zod_1.z.string().optional(),
    selectedText: zod_1.z.string().trim().min(1).max(5000).optional(),
    responseLang: zod_1.z.string().default('en'),
    conversationId: zod_1.z.string().optional(),
    style: zod_1.z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
});
exports.summarizeSchema = zod_1.z.object({
    chapterKey: zod_1.z.string().max(100).optional(),
    editionId: zod_1.z.string(),
    sectionId: zod_1.z.string().min(1),
    responseLang: zod_1.z.string().default('en'),
});
//# sourceMappingURL=aiSchema.js.map