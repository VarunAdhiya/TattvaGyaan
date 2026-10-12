# Repository Guidelines

## Project Structure & Module Organization

TattvaGyaan is a multilingual scripture library with a 3D reader and AI assistant.

- `frontend/src/`: React components, route pages, authentication context, and `api/client.js`. Assets belong in `src/assets/` or `frontend/public/`.
- `backend/src/`: Express TypeScript routes, controllers, services, middleware, and Zod validators. Keep business logic in services.
- `backend/prisma/`: database schema, migrations, and seeds. `backend/data/SOURCES.md` documents scripture provenance.
- `backend/tests/` and `frontend/tests/`: automated tests. Root `test-e2e.js` is a separate authentication smoke script.

## Build, Test, and Development Commands

Run `npm install` separately in `backend/` and `frontend/`; there is no root package.

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start the API with reload on port 3001. |
| `backend/` | `npm run build` / `npm start` | Compile TypeScript / run compiled output. |
| `backend/` | `npm test` | Build and run Node's test runner. |
| `backend/` | `npm run prisma:migrate -- --name <change>` | Create and apply development migrations. |
| `backend/` | `npm run prisma:generate` / `npm run prisma:seed` | Generate the client / seed development data. |
| `frontend/` | `npm run dev` | Start Vite on port 5173. |
| `frontend/` | `npm run build` / `npm run lint` | Build production assets / run Oxlint. |
| `frontend/` | `npx playwright test` | Run browser tests using installed Chrome; starts Vite on port 5174. |

## Coding Style & Naming Conventions

Use two-space indentation and match surrounding quotes and semicolons. Backend TypeScript enables strict checking. Use PascalCase for React files (`Reader3D.jsx`) and camelCase for functions and service modules (`readingPlanService.ts`). Put request schemas in `validators/` and frontend API calls in `frontend/src/api/client.js`. Oxlint includes React hooks rules; no formatter is configured.

## Testing Guidelines

Name backend tests `*.test.cjs` and Playwright tests `*.spec.js`. No coverage threshold is configured. Before submitting, run both builds, frontend lint, backend tests, and relevant browser tests. Manually verify affected authentication, reader, saved-progress, reading-plan, and AI flows.

## Commit & Pull Request Guidelines

History mixes informal summaries with `feat:` and `docs:` prefixes. Prefer concise, imperative, scoped messages. PRs should describe behavior changes, link relevant issues, report validation, include screenshots for UI changes, and explain migration or configuration steps.

## Security & Content Integrity

Configure PostgreSQL using `SETUP.md` and local environment variables; keep credentials uncommitted and AI provider calls server-side. Preserve scripture provenance, original text, language direction, and accurate availability labels. Never fabricate passages.
