"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeSchema = exports.askQuestionSchema = void 0;
const zod_1 = require("zod");
exports.askQuestionSchema = zod_1.z.object({
    question: zod_1.z.string().min(1).max(2000),
    editionId: zod_1.z.string().uuid().optional(),
    sectionId: zod_1.z.string().uuid().optional(),
    passageId: zod_1.z.string().uuid().optional(),
    selectedText: zod_1.z.string().max(5000).optional(),
    responseLang: zod_1.z.string().default('en'),
    conversationId: zod_1.z.string().uuid().optional(),
    style: zod_1.z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
});
exports.summarizeSchema = zod_1.z.object({
    editionId: zod_1.z.string().uuid(),
    sectionId: zod_1.z.string().uuid().optional(),
    passageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    responseLang: zod_1.z.string().default('en'),
});
//# sourceMappingURL=aiSchema.js.map