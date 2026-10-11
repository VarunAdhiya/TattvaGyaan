import { z } from 'zod';

export const explainSchema = z.object({
  passageId: z.string().optional(),
  selectedText: z.string().max(5000).optional(),
  question: z.string().max(2000).optional(),
  responseLang: z.string().default('en'),
  style: z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
  editionId: z.string().optional(),
  sectionId: z.string().optional(),
  conversationId: z.string().optional(),
});

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
  editionId: z.string().optional(),
  sectionId: z.string().optional(),
  passageId: z.string().optional(),
  selectedText: z.string().max(5000).optional(),
  responseLang: z.string().default('en'),
  conversationId: z.string().optional(),
  style: z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
});

export const summarizeSchema = z.object({
  editionId: z.string(),
  sectionId: z.string().optional(),
  passageIds: z.array(z.string()).optional(),
  responseLang: z.string().default('en'),
});