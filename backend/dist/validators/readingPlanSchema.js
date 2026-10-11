"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completePlanItemSchema = exports.updateReadingPlanSchema = exports.createReadingPlanSchema = void 0;
const zod_1 = require("zod");
exports.createReadingPlanSchema = zod_1.z.object({
    editionId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    targetDays: zod_1.z.number().int().min(1).max(365),
    minutesPerDay: zod_1.z.number().int().min(1).max(480).optional(),
    startDate: zod_1.z.string().datetime().optional(),
});
exports.updateReadingPlanSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
    targetDays: zod_1.z.number().int().min(1).max(365).optional(),
});
exports.completePlanItemSchema = zod_1.z.object({
    completed: zod_1.z.boolean(),
});
//# sourceMappingURL=readingPlanSchema.js.map