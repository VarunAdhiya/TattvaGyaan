// Exercise both database pools through the reader API, using one temporary
// anonymous session. No account, scripture, annotation or progress is modified.
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const session = require('express-session');
const signature = require('cookie-signature');
const { config } = require('../dist/config');
const PgSession = require('connect-pg-simple')(session);
const store = new PgSession({ conObject: { ...config.database.sessionPool, max: 1 }, tableName: 'sessions', pruneSessionInterval: false });
const sid = 'reader-pool-check-' + randomUUID();
const base = process.env.READER_CHECK_URL || 'http://localhost:5173';
const passageId = process.argv[2];
let sessionCreated = false;

async function main() {
  if (!passageId) throw new Error('Usage: node scripts/check-reader-concurrency.cjs <passage-id>');
  await new Promise((resolve, reject) => store.set(sid, { cookie: { originalMaxAge: 60000, expires: new Date(Date.now() + 60000), httpOnly: true } }, error => error ? reject(error) : resolve()));
  sessionCreated = true;
  const cookie = 'tattva.sid=' + encodeURIComponent('s:' + signature.sign(sid, config.session.secret));
  async function read(path) {
    const response = await fetch(base + path, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path + ' returned ' + response.status);
    return response.json();
  }
  const positionPath = '/api/passages/' + encodeURIComponent(passageId) + '/position';
  const position = await read(positionPath);
  const manifest = await read('/api/passages/edition/' + position.editionId);
  let offset = position.pageIndex - 2;
  let targetSection;
  for (const section of manifest.sections) {
    const count = Math.ceil(section._count.passages / 2);
    if (offset < count) { targetSection = section; break; }
    offset -= count;
  }
  assert.ok(targetSection, 'Position must resolve to a content page');
  const pagePath = '/api/passages/section/' + targetSection.id + '?page=' + (offset + 1) + '&limit=2';
  const page = await read(pagePath);
  assert.ok(page.passages.some(passage => passage.id === passageId), 'Resolved page must contain the requested passage');
  const paths = [positionPath, pagePath, '/api/passages/edition/' + position.editionId];
  const results = await Promise.allSettled(Array.from({ length: 24 }, (_, index) => read(paths[index % paths.length])));
  const failures = results.filter(result => result.status === 'rejected');
  assert.equal(failures.length, 0, failures.map(result => result.reason.message).join('\n'));
  console.log(JSON.stringify({ position, concurrentRequests: results.length, status: 'all passed', pools: { queries: config.database.connectionLimit, sessions: config.database.sessionPool.max } }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  try {
    if (sessionCreated) await new Promise((resolve, reject) => store.destroy(sid, error => error ? reject(error) : resolve()));
  } finally { await store.close(); }
});
