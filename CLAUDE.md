# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TattvaGyaan is an AI-powered multilingual religious scripture library. It allows users to explore scriptures from six major religions (Hinduism, Islam, Buddhism, Sikhism, Jainism, Christianity), read them in immersive 3D book interfaces, create personalized reading plans, and use OpenAI to understand passages in their preferred language.

The application is built as a monorepo with separate frontend (React/Vite) and backend (Express/TypeScript) directories, backed by PostgreSQL and Prisma ORM.

## Repository Structure

```
TattvaGyaan/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── pages/           # Page components (Login, Register, Dashboard, ReaderPage)
│   │   ├── components/      # Reusable components (Reader3D, AIAssistantDrawer, etc.)
│   │   ├── context/         # AuthContext for session management
│   │   ├── api/             # Centralized API client (client.js)
│   │   └── App.jsx          # Main router and entry point
│   └── package.json
├── backend/                  # Express + TypeScript API
│   ├── src/
│   │   ├── routes/          # API endpoint groupings (/auth, /religions, /scriptures, etc.)
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic (authService, aiService, readingPlanService, ragService)
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── validators/      # Zod schemas for request validation
│   │   ├── config/          # Environment configuration
│   │   └── lib/             # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Database seeding
│   └── package.json
└── Readme.md                # Product vision and requirements
```

## Key Architecture Patterns

### Frontend

- **State Management**: React Context (AuthContext) for user sessions; component-level state for UI
- **API Communication**: Centralized `api` client in `src/api/client.js` with credential-included requests (HTTP-only cookies)
- **Protected Routes**: `ProtectedRoute` component wraps dashboard and reader pages
- **Page-Flip Library**: Uses `react-pageflip` for 3D book reading experience
- **Styling**: Tailwind CSS with responsive design

### Backend

- **Route Handlers**: Routes grouped by resource (`/auth`, `/religions`, `/scriptures`, `/reading-plans`, `/ai`, etc.)
- **Service Layer**: Business logic separated into services:
  - `authService`: User registration, login, password hashing (Argon2id)
  - `scriptureService`: Scripture and edition retrieval
  - `readingPlanService`: Reading plan generation and scheduling
  - `aiService`: OpenAI integration with RAG support
  - `ragService`: Retrieval-augmented generation for grounded AI responses
- **Validation**: Zod schemas (`validators/` folder) for all request bodies and query params
- **Error Handling**: Centralized `errorHandler` middleware with `AppError` class for consistent responses
- **Authentication**: Session-based with PostgreSQL store (`connect-pg-simple`), HTTP-only secure cookies
- **Rate Limiting**: Global rate limiter + separate AI endpoint rate limiting

### Database (PostgreSQL + Prisma)

Core entities:
- **User**: Credentials, preferences, ownership relationships
- **Religion**, **Scripture**, **ScriptureEdition**: Content hierarchy
- **ScriptureSection**, **ScripturePassage**: Flexible hierarchical structure supporting multiple organizational patterns
- **ReadingProgress**: Tracks current position per user per edition
- **ReadingPlan**, **ReadingPlanItem**: User-generated schedules with daily assignments
- **Bookmark**, **Highlight**, **Note**: User annotations on passages
- **ChatConversation**, **ChatMessage**: AI chat history for each scripture/edition

Key design decisions:
- Separate table for sessions (PostgreSQL store for express-session)
- Hierarchical sections support non-Bible structures (e.g., Vedas, Quran)
- Passage references stored as text for historical accuracy
- Word counts and sort orders enable proper pagination and scheduling

## Common Commands

### Frontend

```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Dev server (port 5173)
npm run build           # Production build
npm run lint            # Run oxlint
npm run preview         # Preview production build
```

### Backend

```bash
cd backend
npm install             # Install dependencies
npm run dev             # Dev server with hot reload (port 3001)
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled server
npm prisma:generate    # Generate Prisma client
npm prisma:migrate     # Run pending migrations
npm prisma:seed        # Seed database with religions and sample data
npm prisma:studio     # Open Prisma Studio UI (localhost:5555)
```

### Development Workflow

**Initial setup**:
1. Copy `.env.example` to `.env` in both frontend and backend
2. Set `DATABASE_URL` and `OPENAI_API_KEY` in backend `.env`
3. Run `npm install` in both directories
4. Run `npm prisma:migrate` and `npm prisma:seed` in backend
5. Start backend: `npm run dev` in backend/
6. Start frontend: `npm run dev` in frontend/
7. Frontend will proxy to `http://localhost:3001`

## Environment Variables

**Backend (.env)**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (change in production)
- `OPENAI_API_KEY`: OpenAI API key (required for AI features)
- `OPENAI_MODEL`: Model ID (default: `gpt-4o-mini`)
- `OPENAI_EMBEDDING_MODEL`: Embedding model (default: `text-embedding-3-small`)
- `CORS_ORIGIN`: Frontend origin (default: `http://localhost:5173`)
- `PORT`: Backend port (default: 3001)
- `NODE_ENV`: `development` or `production`

**Frontend (Vite)**:
- No secrets in frontend; API calls use relative paths and rely on backend session cookies

## API Endpoints

Group by resource:
- `/api/auth`: Register, login, logout, current user, profile
- `/api/religions`: List religions
- `/api/scriptures`: Fetch scripture metadata
- `/api/scripture-editions`: Edition details with language/script info
- `/api/passages`: Fetch passage content by section or edition
- `/api/reading-progress`: Track user's reading position
- `/api/reading-plans`: Create, read, update, delete schedules
- `/api/bookmarks`, `/api/notes`, `/api/highlights`: User annotations
- `/api/search`: Full-text search within and across scriptures
- `/api/ai`: OpenAI-powered endpoints (explain, summarize, chat with history)
- `/api/health`: Health check

All endpoints require authentication (checked via session middleware) except `/api/auth/register`, `/api/auth/login`, and `/api/health`.

## Security & Authentication

- **Session-based auth**: HTTP-only cookies with secure flag (production), SameSite=strict (production) / lax (dev)
- **Password hashing**: Argon2id via the `argon2` package
- **Authorization**: Server-side checks ensure users only access their own data
- **Secrets**: All sensitive data (OpenAI key, database credentials) server-side only
- **CORS**: Configured to frontend origin; credentials included
- **Helmet**: Security headers applied globally
- **Rate limiting**: 100 requests per 15-minute window globally; 10 AI requests per 60s

## Key Features & Implementation Status

### Phase 1 — Foundation (Core)
- ✅ React/Vite frontend with Tailwind
- ✅ Express backend with TypeScript
- ✅ PostgreSQL + Prisma ORM
- ✅ User authentication (registration, login, sessions)
- ✅ Dashboard with religion selector
- ✅ Religion and scripture catalog endpoints

### Phase 2 — Reading Experience
- ⏳ Import original-language scripture (schema ready, import scripts needed)
- ⏳ Scripture details page (endpoints exist, frontend component needed)
- ⏳ 3D book reader (react-pageflip component exists, integration needed)
- ⏳ Passage navigation and rendering
- ✅ Reading progress persistence (API ready)
- ⏳ Bookmarks (API ready, UI needed)

### Phase 3 — Reading Plans
- ✅ Reading plan creation and scheduling (service implemented)
- ✅ Daily assignment generation
- ✅ Plan persistence and updates (API ready)
- ⏳ Frontend dashboard showing active plans

### Phase 4 — AI Integration
- ✅ OpenAI service integration (configured, not yet tested against real API)
- ✅ RAG service for grounded responses
- ✅ Passage explanation endpoints
- ✅ Section summarization endpoints
- ✅ Chat history persistence
- ⏳ Streaming responses
- ⏳ Frontend chat UI (AIAssistantDrawer component exists, logic needs wiring)

### Phase 5 — Expansion
- ⏳ Additional scripture collections
- ⏳ Multilingual UI
- ⏳ Advanced search (full-text search endpoints exist)
- ⏳ Responsive refinements
- ⏳ Automated tests

## Common Development Tasks

### Adding a New API Endpoint

1. Create a route file in `backend/src/routes/` (or add to existing)
2. Create a controller in `backend/src/controllers/` with request handling
3. Add Zod schema in `backend/src/validators/` if accepting request body/params
4. Add middleware for authorization if user-specific
5. Register route in `backend/src/app.ts`
6. Add corresponding API method in `frontend/src/api/client.js`

### Adding a New Page

1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`
3. Wrap in `<ProtectedRoute>` if requires authentication
4. Use `useAuth()` context and `api` client for data

### Database Changes

1. Update `backend/prisma/schema.prisma`
2. Run `npm prisma:migrate` to create and apply migration
3. Regenerate Prisma client: `npm prisma:generate`
4. Update backend services/controllers as needed

## Important Notes

- **No fabricated scripture**: Import only verified, legally usable sources
- **Multilingual support**: Ensure proper UTF-8 handling and right-to-left script support (Arabic, Urdu, etc.)
- **Content status**: Always label incomplete or metadata-only content clearly
- **AI grounding**: AI responses must reference actual source passages; never invent citations
- **User privacy**: Reading history, bookmarks, and chat are private user data; enforce authorization checks
- **Session secrets**: Never commit real session secrets or API keys; use `.env.example` as template

## Useful References

- **React 19**: Latest with hooks; see components/AuthContext.jsx for context patterns
- **Vite**: Fast build; dev server on 5173 with proxy to backend
- **Tailwind 4**: Utility-first CSS; configured via tailwindcss.config.js
- **Prisma**: ORM with type safety; schema defines DB contract
- **Express**: Middleware stack in app.ts; routes mounted in order
- **OpenAI SDK**: Official client initialized with API key from config
- **Zod**: Schema validation; used for all request payloads

## Debugging

- **Frontend**: Browser DevTools; check Network tab for API calls and cookies
- **Backend**: Logs to stdout; check for database connection errors or OpenAI key issues
- **Database**: `npm prisma:studio` opens Prisma Studio for browsing/editing data
- **Session**: Check browser cookies for `tattva.sid` (session ID)
- **Auth failures**: Ensure `CORS_ORIGIN` matches frontend URL and credentials are enabled

## Known Limitations & Next Steps

- Scripture content import pipeline not yet implemented (schema ready for ingestion)
- Frontend reader UI (3D book flip) component exists but not wired to backend data
- AI integration tested in schema; requires real OpenAI key for end-to-end testing
- No automated tests yet (unit tests needed for auth, scheduling, RAG logic)
- Search implementation basic (full-text search available if PostgreSQL configured)
