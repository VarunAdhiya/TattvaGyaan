# CLAUDE.md

This file provides guidance for Claude Code in this repository.

## Architecture
- **Frontend**: React, Vite, Tailwind CSS.
- **Backend**: Express.js, TypeScript, Prisma ORM.
- **Database**: PostgreSQL.
- **Auth**: Session-based, HTTP-only cookies, Argon2id.
- **AI**: OpenAI API, RAG.

## Repository Structure
- `backend/`: Express API, controllers, routes, services, middleware.
- `frontend/`: React app, components, pages, context, api.

## Commands
- **Backend**: `cd backend && npm install`, `npm run dev`, `npx prisma migrate`.
- **Frontend**: `cd frontend && npm install`, `npm run dev`.
