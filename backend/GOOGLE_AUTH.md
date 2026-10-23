# Google sign-in

The login and registration pages share a **Continue with Google** option. Google authenticates the user; the Express API then creates the same application session used by email/password sign-in. No Google access or refresh tokens are stored in the database.

## Local setup

1. In [Google Cloud Console](https://console.cloud.google.com/auth/overview), select or create your project and configure Google Auth Platform branding, audience, and contact details. For a testing audience, add the Google accounts you intend to test with where required.
2. Create an OAuth client of type **Web application**. Add this exact **Authorized redirect URI**:

   ```text
   http://localhost:5173/api/auth/google/callback
   ```

   The callback goes through Vite's existing `/api` proxy to the backend. This server redirect flow does not need a browser JavaScript origin or a frontend Google SDK.
3. Fill in the existing placeholders in `backend/.env`:

   ```dotenv
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback
   ```

4. Restart the backend. Open `http://localhost:5173/login` or `/register`. Both buttons use the same Google account chooser and return to `/dashboard` after success. Use `localhost` consistently, rather than mixing it with `127.0.0.1`.

The button remains disabled with an explanatory message until both credentials are configured. Keep credentials in the backend only; do not use `VITE_` variables or commit `.env`.

## Database and account behavior

For another environment, run `npx prisma migrate deploy`, `npm run prisma:generate`, and `npm run build` from `backend/` before starting the API. Migration `20261023160000_google_sign_in` adds the unique Google subject, permits Google-only accounts without a password hash, and enables RLS on the private `users` table. The privileged Express database connection remains the access path; no browser policies are created.

- Returning Google users keep their existing app user ID, bookmarks, notes, and reading progress.
- A new Google identity creates an account with an automatically assigned unique username.
- If the email already belongs to a password account, the user must confirm that account's password to connect Google. Matching email alone never merges accounts. Future Google sign-ins go straight to the dashboard.
- Google-only accounts use Google to sign in. This change does not add password creation or password recovery.
- Cancellation and expired requests return a retry message. State, PKCE, nonce, verified email, and Google ID-token verification protect the flow; successful authentication rotates the session ID.

## Production

Set `CORS_ORIGIN` to the public frontend origin and `GOOGLE_REDIRECT_URI` to its HTTPS `/api/auth/google/callback` URL. Register that exact URL on the production Google OAuth client. Proxy `/api` to Express on the same site, configure HTTPS and a strong `SESSION_SECRET`, and ensure the database role can access the private users table. Complete Google's consent-screen publishing requirements before inviting users.

Production Express trusts **one reverse proxy** so secure session cookies work behind TLS termination. Deploy behind that trusted proxy; adjust the trust setting for a different topology. Cookies remain HTTP-only with `SameSite=Lax` to support Google's top-level callback.

## Validation

Run `npm test` in `backend/` and `npx playwright test tests/google-auth.spec.js` in `frontend/`. Automated tests mock Google responses; finish a real sign-in after supplying your client credentials to verify Google's project and redirect configuration.

References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Google authentication library](https://github.com/googleapis/google-auth-library-nodejs), [button branding guidelines](https://developers.google.com/identity/branding-guidelines).
