"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptureFilterSchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.scriptureFilterSchema = zod_1.z.object({
    religionId: zod_1.z.string().uuid().optional(),
    language: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=scriptureSchema.js.map