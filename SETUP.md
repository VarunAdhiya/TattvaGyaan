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
