import dotenv from 'dotenv';
import path from 'path';
import { createDatabaseConfig } from './database';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultGeminiTimeoutMs = 90000;
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || defaultGeminiTimeoutMs);

export const config = {
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
