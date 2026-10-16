# Database connection budget

The API uses two independent PostgreSQL connection pools: Prisma for application queries and `connect-pg-simple` for login sessions. Their automatic defaults can exceed a small Supabase session pool. The resulting `EMAXCONNSESSION` error affects reader requests and authenticated requests even when the SQL is valid.

The API now defaults to **5 query connections + 2 session connections per process**. Configure these through `DATABASE_CONNECTION_LIMIT` and `SESSION_DATABASE_CONNECTION_LIMIT`. `DATABASE_POOL_TIMEOUT` controls how long Prisma waits for an available connection (15 seconds by default). Existing explicit Prisma URL settings are respected unless overridden by these environment variables. Session connections expire after 10 idle seconds and connection attempts time out after 10 seconds.

Budget the combined pools across all API instances and maintenance tools against the provider's limit. Library imports use one connection, and library checks reuse the application's Prisma client. Restart the API after changing pool settings. `SIGINT`/`SIGTERM` shutdown drains HTTP requests and closes both pools.

When the provider's capacity is exhausted, API responses use HTTP 503 with `Retry-After: 2` and a safe retry message. This is connection management, not request rate limiting.

## Verification

Run `npm test`. With both servers running, execute:

```powershell
node scripts/check-reader-concurrency.cjs <passage-id>
```

This resolves a real passage, verifies its page, and sends 24 concurrent position/page/manifest requests through Vite. A temporary anonymous session exercises the session pool and is removed afterward. It does not modify accounts or reading data.

References: [Prisma PostgreSQL pool parameters](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql), [node-postgres pool configuration](https://node-postgres.com/apis/pool), [Supabase pooling limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).
