import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
  preferredLang: z.string().default('en'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  connectGoogle: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your display name').max(100, 'Use 100 characters or fewer').optional(),
  preferredLang: z.enum(['en', 'hi', 'mr', 'sa', 'ar', 'ur', 'pa']).optional(),
}).strict().refine(data => Object.keys(data).length > 0, 'Choose a profile field to update');

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
