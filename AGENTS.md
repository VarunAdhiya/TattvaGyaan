# Repository Guidelines

## Project Structure & Module Organization

TattvaGyaan provides a Hindi scripture library, 3D reader, and AI explanations.

- `frontend/src/`: React pages, components, context, and `api/client.js`; assets in `src/assets/`.
- `backend/src/`: Express TypeScript routes, controllers, services, middleware, and Zod validators. Put business logic in services.
- `backend/prisma/`: database schema, migrations, and seeds.
- `library/`: catalog, attributed edition JSON, source manifests, and editorial guides. `backend/data/reader-editions.json` selects the six published text sources; `backend/data/layouts/` holds reader layouts.
- `backend/tests/` and `frontend/tests/`: automated checks.

## Build, Test, and Development Commands

Run `npm install` separately in `backend/` and `frontend/`; there is no root package.

| Directory | Command | Purpose |
| --- | --- | --- |
| Both | `npm run dev` | Start the development server. |
| Both | `npm run build` | Compile backend TypeScript or build frontend assets. |
| Backend | `npm start` | Run the compiled API. |
| Backend | `npm test` | Build and run Node tests. |
| Backend | `npm run prisma:migrate -- --name <change>` | Create and apply development migrations. |
| Backend | `npm run prisma:generate` | Regenerate the Prisma client. |
| Frontend | `npm run lint` | Run Oxlint. |
| Frontend | `npm run check:library` | Validate text sources; also runs before builds. |
| Frontend | `npx playwright test` | Run browser tests using installed Chrome and Vite on port 5174. |

## Coding Style & Naming Conventions

Use two-space indentation and match surrounding punctuation. TypeScript uses strict checking. Name React files in PascalCase (`Reader3D.jsx`) and services in camelCase (`scriptureService.ts`). Keep requests in `api/client.js` and schemas in `validators/`.

## Testing Guidelines

Use `*.test.cjs` for Node tests and `*.spec.js` for Playwright. No coverage threshold is configured. For code changes, run both builds, backend tests, frontend lint, and relevant browser tests. Set `RUN_LIVE_LIBRARY=1` with the API running for live-library checks. Verify affected reader navigation, saved progress, annotations, reading plans, and AI selection.

## Commit & Pull Request Guidelines

History uses informal summaries such as “added garud puran.” Prefer concise, imperative, scoped messages. PRs should describe behavior changes, link issues, report validation, include UI screenshots, and explain migration or configuration steps.

## Security & Content Integrity

Keep credentials and `backend/backups/` private. Preserve source text, attribution, checksums, direction, IDs, and draft labels; never fabricate passages. Consult `library/README.md` before imports. Publish one text edition per book. Public PDFs are retired; optional extraction originals belong in ignored `backend/data/source-pdfs/`.
