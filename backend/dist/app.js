"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const religions_1 = __importDefault(require("./routes/religions"));
const scriptures_1 = __importDefault(require("./routes/scriptures"));
const editions_1 = __importDefault(require("./routes/editions"));
const passages_1 = __importDefault(require("./routes/passages"));
const readingProgress_1 = __importDefault(require("./routes/readingProgress"));
const readingPlans_1 = __importDefault(require("./routes/readingPlans"));
const bookmarks_1 = __importDefault(require("./routes/bookmarks"));
const notes_1 = __importDefault(require("./routes/notes"));
const highlights_1 = __importDefault(require("./routes/highlights"));
const search_1 = __importDefault(require("./routes/search"));
const ai_1 = __importDefault(require("./routes/ai"));
const app = (0, express_1.default)();
// Security
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origin,
    credentials: true,
}));
// General rate limiting
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
    skip: (req) => config_1.config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
});
// Auth-specific rate limiting (more generous for login attempts)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.authRateLimit.windowMs,
    max: config_1.config.authRateLimit.max,
    skip: (req) => config_1.config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
    message: {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil(config_1.config.authRateLimit.windowMs / 1000)
    }
});
// Apply general rate limiting to all routes except auth
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth')) {
        return next(); // Skip general limiter for auth routes
    }
    return generalLimiter(req, res, next);
});
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Session
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    store: config_1.config.database.url ? new PgSession({
        conString: config_1.config.database.url,
        tableName: 'sessions',
        createTableIfMissing: true,
    }) : undefined,
    secret: config_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    name: 'tattva.sid',
    cookie: {
        secure: config_1.config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: config_1.config.session.maxAge,
        sameSite: config_1.config.nodeEnv === 'production' ? 'strict' : 'lax',
    },
}));
// Routes
app.use('/api/auth', authLimiter, auth_1.default); // Apply auth rate limiter to auth routes
app.use('/api/religions', religions_1.default);
app.use('/api/scriptures', scriptures_1.default);
app.use('/api/scripture-editions', editions_1.default);
app.use('/api/passages', passages_1.default);
app.use('/api/reading-progress', readingProgress_1.default);
app.use('/api/reading-plans', readingPlans_1.default);
app.use('/api/bookmarks', bookmarks_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/highlights', highlights_1.default);
app.use('/api/search', search_1.default);
app.use('/api/ai', ai_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map