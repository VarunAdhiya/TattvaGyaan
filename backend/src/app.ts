import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import religionRoutes from './routes/religions';
import scriptureRoutes from './routes/scriptures';
import editionRoutes from './routes/editions';
import passageRoutes from './routes/passages';
import readingProgressRoutes from './routes/readingProgress';
import readingPlanRoutes from './routes/readingPlans';
import bookmarkRoutes from './routes/bookmarks';
import noteRoutes from './routes/notes';
import highlightRoutes from './routes/highlights';
import searchRoutes from './routes/search';
import aiRoutes from './routes/ai';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: (req) => config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
});

// Auth-specific rate limiting (more generous for login attempts)
const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  skip: (req) => config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: Math.ceil(config.authRateLimit.windowMs / 1000)
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
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Session
const PgSession = connectPgSimple(session);
app.use(session({
  store: config.database.url ? new PgSession({
    conString: config.database.url,
    tableName: 'sessions',
    createTableIfMissing: true,
  }) : undefined,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: 'tattva.sid',
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  },
}));

// Routes
app.use('/api/auth', authLimiter, authRoutes); // Apply auth rate limiter to auth routes
app.use('/api/religions', religionRoutes);
app.use('/api/scriptures', scriptureRoutes);
app.use('/api/scripture-editions', editionRoutes);
app.use('/api/passages', passageRoutes);
app.use('/api/reading-progress', readingProgressRoutes);
app.use('/api/reading-plans', readingPlanRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;