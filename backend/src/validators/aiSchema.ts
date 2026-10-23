import { z } from 'zod';

export const libraryQuestionSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  responseLang: z.enum(['hi', 'en']).default('hi'),
  editionId: z.string().min(1).max(100).optional(),
}).strict();

export const explainSchema = z.object({
  passageId: z.string().optional(),
  selectedText: z.string().trim().min(1).max(5000).optional(),
  question: z.string().max(2000).optional(),
  responseLang: z.string().default('en'),
  style: z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
  editionId: z.string().optional(),
  sectionId: z.string().optional(),
  conversationId: z.string().optional(),
});

export const askQuestionSchema = z.object({
  chapterKey: z.string().max(100).optional(),
  question: z.string().trim().min(1).max(2000),
  editionId: z.string().optional(),
  sectionId: z.string().optional(),
  passageId: z.string().optional(),
  selectedText: z.string().trim().min(1).max(5000).optional(),
  responseLang: z.string().default('en'),
  conversationId: z.string().optional(),
  style: z.enum(['simple', 'detailed', 'scholarly']).default('simple'),
});

export const summarizeSchema = z.object({
  chapterKey: z.string().max(100).optional(),
  editionId: z.string(),
  sectionId: z.string().min(1),
  responseLang: z.string().default('en'),
});
