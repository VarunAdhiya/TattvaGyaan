import { z } from 'zod';

export const createReadingPlanSchema = z.object({
  editionId: z.string().uuid(),
  title: z.string().min(1).max(200),
  targetDays: z.number().int().min(1).max(365),
  minutesPerDay: z.number().int().min(1).max(480).optional(),
  startDate: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (expected YYYY-MM-DD)')])
    .optional(),
});

export const updateReadingPlanSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  targetDays: z.number().int().min(1).max(365).optional(),
});

export const completePlanItemSchema = z.object({
  completed: z.boolean(),
});