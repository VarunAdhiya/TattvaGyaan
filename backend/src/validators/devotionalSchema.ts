import { z } from 'zod';

export const devotionalCategory = z.enum(['chalisa', 'bhajan', 'mantra']);
export const devotionalFilterSchema = z.object({
  category: devotionalCategory,
  search: z.string().trim().max(100).default(''),
  deity: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
export const devotionalParamsSchema = z.object({
  category: devotionalCategory,
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120),
});
export const calendarMonthSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
