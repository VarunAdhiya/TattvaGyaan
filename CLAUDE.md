# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TattvaGyaan is an AI-powered multilingual religious scripture library featuring:
- Authentic original-language scripture texts (Sanskrit, Arabic, Pali, etc.)
- Immersive 3D book reader with realistic page-turning
- Personalized reading plans with progress tracking
- OpenAI-powered multilingual scripture assistant with RAG
- Support for six religious traditions: Hinduism, Islam, Buddhism, Sikhism, Jainism, Christianity

## Architecture

**Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- Component-based architecture with Context API for state management
- React Router v7 for client-side routing
- `react-pageflip` library for 3D book reader experience
- API client layer (`frontend/src/api/client.js`) for all backend communication
- Oxlint (Rust-based fast linter) instead of ESLint
- No environment variables needed (uses Vite proxy for `/api/*` → `localhost:3001`)

**Backend**: Express.js + TypeScript + Prisma ORM
- RESTful API with clear separation: routes → controllers → services
- Session-based authentication with HTTP-only cookies
- PostgreSQL with Prisma for database access
- OpenAI integration via dedicated service layer (no frontend exposure of API keys)
- RAG service for context-aware scripture explanations

**Database**: PostgreSQL with Prisma ORM
- Normalized relational schema with 14 models
- Hierarchical scripture structure: Religion → Scripture → Edition → Section → Passage
- User data: reading progress, plans, bookmarks, highlights, notes
- Chat conversations for AI assistant history
- Self-referential Section hierarchy (parentId for nested structure)

**Authentication**: Secure session-based auth
- Argon2id password hashing (memoryCost: 65536, timeCost: 3, parallelism: 4)
- express-session with connect-pg-simple (PostgreSQL session store)
- HTTP-only cookies with secure/sameSite flags in production
- Cookie name: `tattva.sid`, maxAge: 7 days
- Session data stores `userId` server-side only
- Middleware: `requireAuth` and `optionalAuth` in `backend/src/middleware/auth.ts`

**AI Integration**: OpenAI API (backend only)
- Configured via environment variables (model selection via `OPENAI_MODEL`)
- Services: `aiService` for completions, `ragService` for retrieval-augmented generation
- Endpoints: `/api/ai/explain`, `/api/ai/summarize`, `/api/ai/chat`
- Rate limiting on AI endpoints (10 requests/minute per IP)

## Repository Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers (auth, scripture, ai, etc.)
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic (aiService, ragService, etc.)
│   ├── middleware/      # Auth, validation, error handling
│   ├── validators/      # Zod schemas for request validation
│   ├── config/          # Environment configuration
│   ├── lib/             # Prisma client instance
│   ├── app.ts           # Express app setup (middleware, routes)
│   └── index.ts         # Server entry point
├── prisma/
│   ├── schema.prisma    # Database schema (17 models)
│   └── seed.ts          # Database seeding script
└── package.json

frontend/
├── src/
│   ├── components/      # React components (Navbar, Reader3D, etc.)
│   ├── pages/           # Route pages (Dashboard, ReaderPage, etc.)
│   ├── context/         # AuthContext for global auth state
│   ├── api/             # API client wrapper (client.js)
│   ├── App.jsx          # Main app component with routing
│   └── main.jsx         # React entry point
└── package.json
```

## Key Database Models

- **User**: Authentication, profile, language preferences
- **Session**: Express session store (managed by connect-pg-simple)
- **Religion**: Six traditions with metadata
- **Scripture**: Religious texts with availability status
- **ScriptureEdition**: Language-specific versions (original or translations)
- **ScriptureSection**: Hierarchical structure (self-referential with parentId)
- **ScripturePassage**: Individual text units with references
- **ReadingProgress**: User's current position in each edition
- **ReadingPlan**: User-created reading schedules
- **ReadingPlanItem**: Daily assignments within a plan
- **Bookmark**, **Highlight**, **Note**: User annotations
- **ChatConversation**, **ChatMessage**: AI assistant chat history

## Common Development Commands

### Backend

```bash
cd backend
npm install                    # Install dependencies
npm run dev                    # Start development server with nodemon (port 3001)
npm run build                  # Compile TypeScript to dist/
npm start                      # Run production build
npx prisma generate            # Generate Prisma client after schema changes
npx prisma migrate dev         # Create and apply database migration
npx prisma migrate dev --name <name>  # Named migration
npm run prisma:seed            # Seed database with initial data
npx prisma studio              # Open Prisma Studio (database GUI)
```

### Frontend

```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server (port 5173)
npm run build                  # Build for production
npm run preview                # Preview production build
npm run lint                   # Run oxlint
```

## Environment Setup

### Backend (.env)

Required variables (see `backend/.env.example`):
```
DATABASE_URL="postgresql://user:password@localhost:5432/TattvaGyaan?schema=public"
SESSION_SECRET="secure-random-secret-change-in-production"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
CORS_ORIGIN="http://localhost:5173"
PORT=3001
NODE_ENV=development
```

### Frontend

Frontend uses Vite's proxy configuration. API calls use relative paths (`/api/*`) which proxy to the backend in development.

## API Routes

All routes prefixed with `/api`:

- `/auth` - Register, login, logout, profile
- `/religions` - List religions
- `/scriptures` - Scripture catalog (filter by religionId)
- `/scripture-editions` - Edition details and content
- `/passages` - Passage retrieval by edition/section
- `/reading-progress` - Save/retrieve reading position
- `/reading-plans` - CRUD for reading plans and items
- `/bookmarks`, `/notes`, `/highlights` - User annotations
- `/search` - Full-text search across scriptures
- `/ai` - OpenAI endpoints (explain, summarize, chat)

## Development Workflow

1. **Database changes**: Update `prisma/schema.prisma` → `npx prisma migrate dev` → `npx prisma generate`
2. **Backend changes**: TypeScript auto-reloads with nodemon
3. **Frontend changes**: Vite HMR auto-updates browser
4. **New routes**: Add route file in `backend/src/routes/`, controller in `controllers/`, register in `app.ts`
5. **New API calls**: Add method to `frontend/src/api/client.js`
6. **Validation**: Add Zod schema to `backend/src/validators/`, use `validate` middleware

## Scripture Content Structure

- Original-language texts are prioritized
- Flexible hierarchy supports different organizational schemes (not all texts follow book/chapter/verse)
- Each passage has a `reference` field (e.g., "2.47", "Surah 1:1")
- Text direction stored per edition (`textDirection: 'ltr' | 'rtl'`)
- Availability status: "complete", "partial", or "metadata_only"

## 3D Reader Implementation

- Uses `react-pageflip` library (v2.0.3) in `frontend/src/components/Reader3D.jsx` (613 lines)
- Fetches passages from `/api/passages/edition/:editionId`
- Generates pages dynamically from text content
- Persists position via `ReadingProgress` model (tracks pageIndex, sectionId, passageId, percentage)
- Features: font size adjustment, themes (light/dark/sepia), text direction (LTR/RTL)
- Additional features: Table of Contents, search, bookmarks, notes, highlights, AI assistant integration
- Special font support: Devanagari (`.font-sanskrit`, `.font-indic`), Arabic (`.font-arabic` with Amiri font, RTL)

## AI Assistant Features

All OpenAI calls are server-side only. The frontend never sees API keys.

**Explain Passage**: Context-aware explanation with scripture reference, source language, and response language
- Supports 7 languages: English, Hindi, Marathi, Sanskrit, Arabic, Urdu, Punjabi
- Explanation styles: simple, detailed, scholarly
- Temperature: 0.3, max_tokens: 2000

**Summarize Section**: Multi-passage summarization with verse references
- Temperature: 0.3, max_tokens: 1500

**Chat**: Conversational interface with optional scripture context (402-line AIAssistantDrawer component)
- Multi-turn conversations with chat history
- Temperature: 0.4, max_tokens: 2000
- Stream: false (no streaming currently)

System prompts emphasize:
- Grounding in source material (no fabricated verses)
- Distinguishing quotations from interpretations
- Respecting all traditions equally
- Labeling AI content as explanatory, not original scripture

**RAG Service**: Basic keyword search with context retrieval (±3 surrounding passages)
- Currently uses PostgreSQL LIKE queries (case-insensitive)
- No vector embeddings yet (OPENAI_EMBEDDING_MODEL defined but not implemented)

## Testing Notes

- No test framework currently configured
- Manual testing: seed database → start backend → start frontend → test user flows
- Critical paths: auth, scripture reading, progress persistence, AI explanations

## Security Considerations

- All user-owned data protected by `requireAuth` middleware
- Session userId stored server-side only
- Passwords hashed with Argon2id
- CSRF protection via SameSite cookies
- Rate limiting: general (100 req/15min), AI (10 req/min)
- OpenAI credentials never exposed to frontend

## Common Pitfalls

- **Prisma client out of sync**: Run `npx prisma generate` after schema changes
- **CORS issues**: Ensure `CORS_ORIGIN` matches frontend dev server (http://localhost:5173)
- **Session not persisting**: Check DATABASE_URL is correct and sessions table exists
- **AI errors**: Verify OPENAI_API_KEY is set and valid
- **Reading position not saving**: Ensure editionId matches between reader and progress endpoints
- **Vite proxy not working**: Backend must be running on port 3001 for `/api/*` proxy
- **TypeScript compilation errors**: Check `tsconfig.json` target is ES2020, module is commonjs

## Phase Completion Status

✅ **Phase 1**: Auth, dashboard, religion selector, scripture catalog
✅ **Phase 2**: 3D reader, original-language content, reading progress
✅ **Phase 3**: Reading plans, daily assignments, completion tracking
🚧 **Phase 4**: OpenAI integration (backend complete, frontend integration in progress)
⏳ **Phase 5**: Additional scriptures, expanded content, accessibility

## Key Components Summary

**Backend Controllers (11)**: authController, aiController, scriptureController, readingPlanController, searchController, bookmarkController, highlightController, noteController, passageController, readingProgressController, religionController

**Backend Services (5)**: authService, aiService, ragService, scriptureService, readingPlanService

**Frontend Pages (7)**: Dashboard, Login, Register, ScriptureDetail, ReaderPage, ReadingPlansPage, PlanDetailPage

**Frontend Components (9)**: Navbar, Footer, ProtectedRoute, Reader3D (613 lines), AIAssistantDrawer (402 lines), CreateReadingPlanModal, ReadingPlanCard, ReligionCard, ScriptureCard
