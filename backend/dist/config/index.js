"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
    aiRateLimit: {
        windowMs: 60 * 1000,
        max: 10,
    },
};
//# sourceMappingURL=index.js.map