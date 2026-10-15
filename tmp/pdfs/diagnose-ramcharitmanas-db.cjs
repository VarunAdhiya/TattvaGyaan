const path = require('node:path');
const root = path.resolve(__dirname, '../..');
require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env') });
const { Client } = require(path.join(root, 'backend/node_modules/pg'));
const url = new URL(process.env.DATABASE_URL);
console.log(JSON.stringify({ pooler: url.hostname.includes('pooler'), port: url.port,
  pgbouncer: url.searchParams.get('pgbouncer'), sslmode: url.searchParams.get('sslmode') }));
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, query_timeout: 20000 });
(async () => {
  try {
    await client.connect();
    if (process.argv.includes('--rollback-failed-import')) {
      const result = await client.query(`SELECT pg_terminate_backend(pid) AS rolled_back
        FROM pg_stat_activity WHERE pid=431693 AND xact_start>='2026-10-15T18:59:19.399Z'::timestamptz
        AND xact_start<'2026-10-15T18:59:19.400Z'::timestamptz
        AND datname=current_database() AND usename=current_user AND state='idle in transaction'
        AND query LIKE 'INSERT INTO "public"."scripture_passages"%'`);
      console.log(JSON.stringify({ failedImportCleanup:result.rows }));
    }
    for (const setting of ['statement_timeout', 'idle_in_transaction_session_timeout']) {
      console.log(JSON.stringify((await client.query('SHOW ' + setting)).rows));
    }
    console.log(JSON.stringify((await client.query(`SELECT pid, xact_start, state, wait_event_type, wait_event,
      pg_blocking_pids(pid) AS blockers,
      CASE WHEN query LIKE '%scripture_editions%' THEN 'scripture_editions'
           WHEN query LIKE '%scripture_passages%' THEN 'scripture_passages'
           WHEN query LIKE '%scriptures%' THEN 'scriptures' ELSE 'other' END AS target,
      split_part(ltrim(query), ' ', 1) AS command,
      round(extract(epoch FROM (now()-xact_start)))::text AS transaction_seconds
      FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL`)).rows));
    console.log(JSON.stringify((await client.query(`SELECT e.content_status, e.expected_passages,
      (SELECT count(*)::text FROM scripture_sections s WHERE s.edition_id=e.id) AS sections
      FROM scripture_editions e JOIN scriptures b ON b.id=e.scripture_id WHERE b.slug='ramayana'`)).rows));
  } catch (error) { console.error('Diagnostic failed:', error.code || error.name); process.exitCode=1; }
  finally { await client.end(); }
})();
