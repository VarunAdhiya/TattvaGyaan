# Vercel deployment

The repository deploys as one Vercel project: the Vite frontend serves the website and a Node.js function in `api/index.js` exports the existing Express backend for `/api/*`. Run Vercel commands from the repository root.

## Project

- Team: `varun-1ff0`
- Project: `tattvagyaan`
- Production domain: `https://tattvagyaan.vercel.app`
- Node.js: 24.x
- API region: Singapore (`sin1`), near the existing database.

`vercel.json` configures both builds and same-origin routing. Build-time development dependencies are explicitly installed even with `NODE_ENV=production`. The frontend's content checks require the backend validation dependencies too. `.vercelignore` excludes credentials, local backups, extraction files, model caches, and test artifacts. Production uses the compiled backend without calling its standalone `listen()` entrypoint.

## Production environment

Configure these in Vercel project settings, never in browser-prefixed variables:

- `DATABASE_URL`: existing hosted PostgreSQL connection.
- `SESSION_SECRET`: independent cryptographically random production secret.
- `NODE_ENV=production`
- `CORS_ORIGIN=https://tattvagyaan.vercel.app`
- `DATABASE_CONNECTION_LIMIT=2`, `SESSION_DATABASE_CONNECTION_LIMIT=1`
- `AI_PROVIDER` and the selected provider's API key, model, and timeout. Both Groq and Gemini remain supported.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://tattvagyaan.vercel.app/api/auth/google/callback`

Register that exact redirect URI in the Google Cloud OAuth client's authorized redirect URIs. Retain the localhost URI for local development. Never point an untrusted preview at production secrets or the production database.

The embedding worker uses Vercel's writable temporary directory for model downloads. Local development retains its existing persistent cache. Cold starts may download the pinned model again.

## Release

1. Confirm the target with `vercel project inspect --non-interactive`.
2. Run backend tests and frontend build/lint and relevant browser tests.
3. Stage with `vercel deploy --prod --skip-domain --scope varun-1ff0 --yes`.
4. Verify the staged site, `/api/health`, authentication, reader data, and AI.
5. Promote the verified deployment with `vercel promote <deployment-url> --scope varun-1ff0`.

No database reset, seed, or migration is part of the build. Deployment uses the existing database and source content. GitHub auto-deployment is not enabled until the repository is connected in Vercel; CLI deployments use the current local workspace, including uncommitted changes.
