const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bookmarkRoutes = require('../dist/routes/bookmarks').default;
const noteRoutes = require('../dist/routes/notes').default;
const prisma = require('../dist/lib/prisma').default;
const { errorHandler } = require('../dist/middleware/errorHandler');

test('saved-item routes filter by unique book and owner, preserve account overview, and reject invalid scopes', async () => {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (req.headers['x-test-user']) req.session = { userId: req.headers['x-test-user'] }; next(); });
  app.use('/bookmarks', bookmarkRoutes); app.use('/notes', noteRoutes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originals = [prisma.bookmark.findMany, prisma.note.findMany];
  const bookA = '11111111-1111-4111-8111-111111111111';
  const bookB = '22222222-2222-4222-8222-222222222222';
  const records = [{ id: 'a1', userId: 'owner', book: bookA }, { id: 'a2-other-edition', userId: 'owner', book: bookA },
    { id: 'b1', userId: 'owner', book: bookB }, { id: 'private', userId: 'someone-else', book: bookA }];
  let calls = 0;
  const find = async query => {
    calls++;
    assert.equal(query.where.userId, 'owner');
    const scope = query.where.passage?.section?.edition;
    if (scope) assert.deepEqual(scope, { scriptureId: scope.scriptureId });
    return records.filter(item => item.userId === query.where.userId && (!scope || item.book === scope.scriptureId));
  };
  prisma.bookmark.findMany = find; prisma.note.findMany = find;
  const headers = { 'x-test-user': 'owner' };
  try {
    for (const resource of ['bookmarks', 'notes']) {
      assert.equal((await fetch(`${base}/${resource}?scriptureId=${bookA}`)).status, 401);
      for (const [book, ids] of [[bookA, ['a1', 'a2-other-edition']], [bookB, ['b1']]]) {
        const response = await fetch(`${base}/${resource}?scriptureId=${book}`, { headers });
        assert.equal(response.status, 200);
        assert.deepEqual((await response.json())[resource].map(item => item.id), ids);
      }
      const all = await fetch(`${base}/${resource}`, { headers });
      assert.equal((await all.json())[resource].length, 3);
      const beforeInvalid = calls;
      for (const query of ['scriptureId=bad', `scriptureId=${bookA}&scriptureId=${bookB}`, 'scriptureId[x]=bad']) {
        const response = await fetch(`${base}/${resource}?${query}`, { headers });
        assert.equal(response.status, 400);
      }
      assert.equal(calls, beforeInvalid);
    }
  } finally {
    [prisma.bookmark.findMany, prisma.note.findMany] = originals;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
