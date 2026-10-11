import { z } from 'zod';

export const createReadingPlanSchema = z.object({
  editionId: z.string().uuid(),
  title: z.string().min(1).max(200),
  targetDays: z.number().int().min(1).max(365),
  minutesPerDay: z.number().int().min(1).max(480).optional(),
  startDate: z.string().datetime().optional(),
});

export const updateReadingPlanSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  targetDays: z.number().int().min(1).max(365).optional(),
});

export const completePlanItemSchema = z.object({
  completed: z.boolean(),
});