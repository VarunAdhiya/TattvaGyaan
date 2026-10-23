const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const routes = require('../dist/routes/ai').default;
const { errorHandler } = require('../dist/middleware/errorHandler');
const { libraryRagService } = require('../dist/services/libraryRagService');
const prisma = require('../dist/lib/prisma').default;

test('library routes enforce authentication, validation, user scope and a single active question', async () => {
  const app = express(); app.use(express.json());
  // This synthetic session middleware exists only in this isolated test server.
  app.use((req, _res, next) => { if (req.headers['x-test-user']) req.session = { userId: req.headers['x-test-user'] }; next(); });
  app.use('/ai', routes); app.use(errorHandler);
  const original = { ask: libraryRagService.ask, history: libraryRagService.history, deleteMany: prisma.libraryAnswer.deleteMany };
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/ai/library`;
  const headers = { 'Content-Type': 'application/json', 'x-test-user': 'owner-test' };
  try {
    for (const [path, method] of [['/ask', 'POST'], ['/history', 'GET'], ['/history', 'DELETE'], ['/catalog', 'GET']]) {
      assert.equal((await fetch(base + path, { method })).status, 401);
    }
    assert.equal((await fetch(base + '/ask', { method: 'POST', headers, body: JSON.stringify({ question: '' }) })).status, 400);
    let started; const didStart = new Promise(resolve => { started = resolve; });
    let release; libraryRagService.ask = async userId => { assert.equal(userId, 'owner-test'); started(); return new Promise(resolve => { release = resolve; }); };
    const first = fetch(base + '/ask', { method: 'POST', headers, body: JSON.stringify({ question: 'What is duty?' }) });
    await didStart;
    assert.equal((await fetch(base + '/ask', { method: 'POST', headers, body: JSON.stringify({ question: 'Another question?' }) })).status, 429);
    release({ answered: false, sources: [] }); assert.equal((await first).status, 200);
    libraryRagService.history = async userId => { assert.equal(userId, 'owner-test'); return []; };
    assert.equal((await fetch(base + '/history', { headers })).status, 200);
    prisma.libraryAnswer.deleteMany = async query => { assert.deepEqual(query.where, { userId: 'owner-test' }); return { count: 1 }; };
    assert.equal((await fetch(base + '/history', { method: 'DELETE', headers })).status, 204);
  } finally {
    libraryRagService.ask = original.ask; libraryRagService.history = original.history; prisma.libraryAnswer.deleteMany = original.deleteMany;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
