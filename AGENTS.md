# Repository Guidelines

## Project Structure & Module Organization

TattvaGyaan is a multilingual scripture library with a 3D reader and AI assistant.

- `frontend/src/`: React JavaScript components, route pages, authentication context, and `api/client.js`. Assets live in `src/assets/` and `frontend/public/`.
- `backend/src/`: Express TypeScript routes, controllers, services, middleware, Zod validators, and configuration. Keep business logic in services.
- `backend/prisma/`: database schema, migrations, and seed scripts.
- `test-e2e.js`: browser smoke script. `SETUP.md`: PostgreSQL setup.

## Build, Test, and Development Commands

Run `npm install` inside `backend/` and `frontend/`; no root package exists.

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start API with reload on port 3001. |
| `backend/` | `npm run build` / `npm start` | Compile TypeScript / run compiled server. |
| `backend/` | `npm run prisma:migrate -- --name <change>` | Create and apply development migrations. |
| `backend/` | `npm run prisma:generate` | Regenerate Prisma client after schema changes. |
| `backend/` | `npm run prisma:seed` | Populate development scripture data. |
| `frontend/` | `npm run dev` | Start Vite on port 5173; proxy `/api` to backend. |
| `frontend/` | `npm run build` / `npm run preview` | Build / preview production frontend. |
| `frontend/` | `npm run lint` | Run Oxlint, including React hooks rules. |

## Coding Style & Naming Conventions

Use two-space indentation and surrounding quote and semicolon styles. Backend TypeScript uses strict checking. Name React files in PascalCase (`Reader3D.jsx`), functions in camelCase, and backend modules by responsibility (`readingPlanService.ts`). Add request schemas under `validators/`; use `frontend/src/api/client.js` for API calls. No formatter is configured.

## Testing Guidelines

No `npm test`, coverage threshold, or unit-test naming convention exists. Run both builds and frontend lint. Manually verify affected authentication, reader, saved-progress, reading-plan, and AI flows. Run `node test-e2e.js` with Playwright, Chromium, ESM support, and both servers; dependencies are undeclared, and failures do not set a failing exit code.

## Commit & Pull Request Guidelines

History mixes informal messages with `feat:` and `docs:` prefixes; prefer concise, imperative, scoped summaries. PRs should explain behavior changes, link relevant issues, report validation, include screenshots for UI changes, and describe migration or configuration steps.

## Security & Content Integrity

Copy `backend/.env.example` to `backend/.env` and replace placeholders. Keep credentials uncommitted and OpenAI calls server-side. Preserve scripture provenance, original text, language direction, and accurate availability labels; never fabricate passages.
