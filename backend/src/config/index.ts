import dotenv from 'dotenv';
import path from 'path';
import { createDatabaseConfig } from './database';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultGeminiTimeoutMs = 90000;
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || defaultGeminiTimeoutMs);
const aiProvider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
if (!['gemini', 'groq'].includes(aiProvider)) throw new Error('AI_PROVIDER must be gemini or groq');
const groqTimeout = Number(process.env.GROQ_TIMEOUT_MS || 90000);

export const config = {
  google: {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.GOOGLE_REDIRECT_URI || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/api/auth/google/callback`).trim(),
  },
  aiProvider,
  groq: {
    apiKey: (process.env.GROQ_API_KEY || '').trim(),
    model: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
    timeoutMs: Number.isInteger(groqTimeout) && groqTimeout > 0 && groqTimeout <= 4294967295 ? groqTimeout : 90000,
  },
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: createDatabaseConfig(process.env),
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-tattvagyaan',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  gemini: {
    apiKey: (process.env.GEMINI_API_KEY || process.env.gemini_api_key || '').trim(),
    model: (process.env.GEMINI_MODEL || process.env.gemini_model || '').trim().replace(/^models\//, '') || 'gemini-3.1-flash-lite',
    timeoutMs: Number.isInteger(geminiTimeoutMs) && geminiTimeoutMs > 0 && geminiTimeoutMs <= 4294967295 ? geminiTimeoutMs : defaultGeminiTimeoutMs,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
