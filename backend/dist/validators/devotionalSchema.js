"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarMonthSchema = exports.devotionalParamsSchema = exports.devotionalFilterSchema = exports.devotionalCategory = void 0;
const zod_1 = require("zod");
exports.devotionalCategory = zod_1.z.enum(['chalisa', 'bhajan', 'mantra']);
exports.devotionalFilterSchema = zod_1.z.object({
    category: exports.devotionalCategory,
    search: zod_1.z.string().trim().max(100).default(''),
    deity: zod_1.z.string().trim().max(60).optional(),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(60).default(24),
});
exports.devotionalParamsSchema = zod_1.z.object({
    category: exports.devotionalCategory,
    slug: zod_1.z.string().regex(/^[a-z0-9-]+$/).max(120),
});
exports.calendarMonthSchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2000).max(2100),
    month: zod_1.z.coerce.number().int().min(1).max(12),
});
//# sourceMappingURL=devotionalSchema.js.map