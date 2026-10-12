# Database Setup Guide

## Prerequisites

You need PostgreSQL installed and running on your system. The app is configured to connect to:

```
postgresql://postgres:varun@localhost:5432/TattvaGyaan
```

## Setup Steps

### 1. Ensure PostgreSQL is Running

**Windows:**
- Open Services (services.msc) and find "PostgreSQL"
- Right-click → Start (if stopped)
- Or start PostgreSQL from your installed application

**macOS (Homebrew):**
```bash
brew services start postgresql
```

**Linux (Debian/Ubuntu):**
```bash
sudo systemctl start postgresql
```

### 2. Create the Database

Once PostgreSQL is running, create the database:

```bash
psql -U postgres -c "CREATE DATABASE TattvaGyaan;"
```

If you get prompted for a password, use: `varun`

### 3. Run Migrations

Navigate to the backend directory and run:

```bash
cd backend
npm run prisma:migrate
```

This will apply all database schema migrations.

### 4. Seed the Database (Optional)

Add sample religions data:

```bash
npm run prisma:seed
```

### 5. Start the Backend

```bash
npm run dev
```

You should see:
```
Database connected
Server running on port 3001
```

### 6. Start the Frontend (in another terminal)

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## Gemini AI Setup

Use Node.js 18 or later for the backend's built-in HTTP client. The frontend has its own Node.js requirements.

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) and set these variables in `backend/.env`:

```dotenv
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.1-flash-lite"
GEMINI_TIMEOUT_MS=90000
```

`GEMINI_MODEL` and `GEMINI_TIMEOUT_MS` are optional and default to the values above. Lowercase `gemini_api_key` and `gemini_model` are also accepted. OpenAI settings are no longer used. Keep the key on the backend; never put it in frontend environment variables.

Restart `npm run dev` after changing `.env`. For the compiled server, run `npm run build`, then `npm start`. Chat, passage explanations, and section summaries use the [Gemini generateContent API](https://ai.google.dev/api/generate-content) and preserve the existing `{ content, model, usage }` response format. Retrieval continues to use the existing database search; no embedding API is required.

The default model is [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), designed for low latency. Set `GEMINI_MODEL` to override it. Requests allow up to 90 seconds by default. Gemini 3 text models use the [low thinking level](https://ai.google.dev/gemini-api/docs/generate-content/thinking#thinking-levels) to reduce response latency. If an existing `.env` sets `GEMINI_TIMEOUT_MS=30000`, update it to `90000` and restart the backend.

API failures are returned as errors instead of canned scripture replies. For repeated timeouts, increase `GEMINI_TIMEOUT_MS` and check the backend's connection to Google. For quota errors, check your Gemini project limits. For authentication or model errors, check the key's permissions and choose a model available to your project through `GEMINI_MODEL`.

## Verify Setup

1. Navigate to `http://localhost:5173/register`
2. Create a new account
3. You should be redirected to the dashboard
4. If you seeded the database, you'll see religions listed

## Troubleshooting

**"Connection refused on port 5432"**
- PostgreSQL is not running. Start it via Services or your system's service manager.

**"FATAL: role "postgres" does not exist"**
- Your PostgreSQL installation uses a different default user. Check your PostgreSQL configuration.

**"Database "TattvaGyaan" does not exist"**
- Run: `psql -U postgres -c "CREATE DATABASE TattvaGyaan;"`

**"The table `public.users` does not exist"**
- Run: `npm run prisma:migrate` to apply migrations.

## Connection String Reference

The current `.env` uses:
```
DATABASE_URL="postgresql://postgres:varun@localhost:5432/TattvaGyaan?schema=public"
```

If your PostgreSQL has a different:
- **Username**: Change `postgres` to your username
- **Password**: Change `varun` to your password
- **Host/Port**: Change `localhost:5432` if running elsewhere
- **Database name**: Change `TattvaGyaan` if desired

Update `.env` accordingly and restart the backend.
