import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
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
import devotionalRoutes from './routes/devotionals';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Session
const PgSession = connectPgSimple(session);
export const sessionStore = config.database.url ? new PgSession({
  conObject: config.database.sessionPool,
  tableName: 'sessions',
  createTableIfMissing: true,
}) : undefined;
app.use(session({
  store: sessionStore,
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
app.use('/api/auth', authRoutes);
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
app.use('/api/devotionals', devotionalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;
