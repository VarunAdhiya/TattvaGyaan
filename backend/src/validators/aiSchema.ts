import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
  editionId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  passageId: z.string().uuid().optional(),
  selectedText: z.string().max(5000).optional(),
  responseLang: z.string().default('en'),
  conversationId: z.string().uuid().optional(),
  style: z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
});

export const summarizeSchema = z.object({
  editionId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  passageIds: z.array(z.string().uuid()).optional(),
  responseLang: z.string().default('en'),
});