# Repository Guidelines

## Project Structure & Module Organization

TattvaGyaan provides a scripture library, a 3D reader, and AI passage explanations.

- `frontend/src/`: React components, pages, context, and `api/client.js`. Store assets in `src/assets/` or `frontend/public/`.
- `backend/src/`: Express TypeScript routes, controllers, services, middleware, and Zod validators. Keep business logic in services.
- `backend/prisma/`: database schema, migrations, and seeds.
- `library/`: catalog, attributed imports, and PDF manifests. Store PDFs in `frontend/public/library/` and reference their URLs in database records.
- `backend/tests/` and `frontend/tests/`: automated tests; root `test-e2e.js` is a separate authentication smoke script.

## Build, Test, and Development Commands

Run `npm install` separately in `backend/` and `frontend/`; there is no root package.

| Directory | Command | Purpose |
| --- | --- | --- |
| Both | `npm run dev` | Start the respective development server. |
| Both | `npm run build` | Compile TypeScript or build frontend assets. |
| Backend | `npm start` | Run the compiled API. |
| Backend | `npm test` | Build and run Node's test runner. |
| Backend | `npm run prisma:migrate -- --name <change>` | Create and apply development migrations. |
| Backend | `npm run prisma:generate` | Regenerate the Prisma client. |
| Frontend | `npm run lint` | Run Oxlint. |
| Frontend | `npm run check:pdfs` | Verify PDF headers and checksums; also runs before builds. |
| Frontend | `npx playwright test` | Run browser tests with installed Chrome and Vite on port 5174. |

## Coding Style & Naming Conventions

Use two-space indentation and match surrounding quotes and semicolons. Backend TypeScript uses strict checking. Name React files in PascalCase (`Reader3D.jsx`) and services in camelCase (`readingPlanService.ts`). Put request schemas in `validators/` and frontend API calls in `api/client.js`. Oxlint checks React hooks; no formatter is configured.

## Testing Guidelines

Name backend tests `*.test.cjs` and Playwright tests `*.spec.js`. No coverage threshold is configured. For code changes, run both builds, frontend lint, backend tests, and relevant browser tests. Manually verify affected authentication, reader, saved-progress, reading-plan, and AI flows.

## Commit & Pull Request Guidelines

Recent commits use informal summaries, such as “added shiv puran.” Prefer concise, imperative, scoped messages. PRs should explain behavior changes, link relevant issues, report validation, include screenshots for UI changes, and document migration or configuration steps.

## Security & Content Integrity

Follow `SETUP.md` for local configuration. Keep credentials uncommitted and AI provider calls server-side. Preserve scripture, provenance, checksums, language direction, and accurate availability labels. Never fabricate passages. Consult `library/README.md` and `backend/data/SOURCES.md` before content imports.
