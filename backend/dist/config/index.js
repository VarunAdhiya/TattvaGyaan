"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const defaultGeminiTimeoutMs = 90000;
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || defaultGeminiTimeoutMs);
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL || '',
    },
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
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    },
    authRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 50 : 500, // higher limit in dev
    },
    aiRateLimit: {
        windowMs: 60 * 1000,
        max: process.env.NODE_ENV === 'production' ? 10 : 60,
    },
};
//# sourceMappingURL=index.js.map