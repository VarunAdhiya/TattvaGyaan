function positiveInteger(value: string | null | undefined, fallback: number, name: string) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

// Prisma and the session store have independent pools. Keep their combined
// defaults below small hosted database limits, with room for maintenance jobs.
export function createDatabaseConfig(env: NodeJS.ProcessEnv) {
  const url = env.DATABASE_URL || '';
  let parsed: URL | undefined;
  if (url) {
    try { parsed = new URL(url); } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  }
  const connectionLimit = positiveInteger(env.DATABASE_CONNECTION_LIMIT ?? parsed?.searchParams.get('connection_limit'), 5, 'DATABASE_CONNECTION_LIMIT');
  const poolTimeout = positiveInteger(env.DATABASE_POOL_TIMEOUT ?? parsed?.searchParams.get('pool_timeout'), 15, 'DATABASE_POOL_TIMEOUT');
  const sessionConnectionLimit = positiveInteger(env.SESSION_DATABASE_CONNECTION_LIMIT, 2, 'SESSION_DATABASE_CONNECTION_LIMIT');
  if (parsed) {
    parsed.searchParams.set('connection_limit', String(connectionLimit));
    parsed.searchParams.set('pool_timeout', String(poolTimeout));
  }
  return {
    url,
    prismaUrl: parsed?.toString() || '',
    connectionLimit,
    sessionPool: {
      connectionString: url,
      max: sessionConnectionLimit,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    },
  };
}
