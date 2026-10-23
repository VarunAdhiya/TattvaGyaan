const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const routes = require('../dist/routes/auth').default;
const prisma = require('../dist/lib/prisma').default;
const { authService } = require('../dist/services/authService');
const { profileService } = require('../dist/services/profileService');
const { errorHandler } = require('../dist/middleware/errorHandler');

test('profile activity groups editions by book and uses only owner records and actual progress', async () => {
  const originals = [prisma.bookmark.findMany, prisma.note.findMany, prisma.readingProgress.findMany, prisma.readingPlan.count, prisma.scriptureEdition.findMany];
  const editions = [{ id: 'edition-a', scriptureId: 'book-a', scripture: { title: 'Book A' } },
    { id: 'edition-a-old', scriptureId: 'book-a', scripture: { title: 'Book A' } },
    { id: 'edition-b', scriptureId: 'book-b', scripture: { title: 'Book B' } }];
  const saved = edition => ({ passage: { section: { edition } } });
  const check = query => assert.deepEqual(query.where, { userId: 'owner' });
  prisma.bookmark.findMany = async query => { check(query); assert.ok(!JSON.stringify(query.select).includes('text')); return [saved(editions[0]), saved(editions[1])]; };
  prisma.note.findMany = async query => { check(query); assert.ok(!JSON.stringify(query.select).includes('content')); return [saved(editions[2])]; };
  prisma.readingProgress.findMany = async query => { check(query); return [
    { editionId: 'edition-a', percentage: 42, lastReadAt: new Date('2026-10-24') },
    { editionId: 'edition-a-old', percentage: 90, lastReadAt: new Date('2026-10-20') },
    { editionId: 'removed', percentage: 100, lastReadAt: new Date('2026-10-19') },
  ]; };
  prisma.readingPlan.count = async query => { assert.deepEqual(query.where, { userId: 'owner', status: 'completed' }); return 2; };
  prisma.scriptureEdition.findMany = async () => editions;
  try {
    const result = await profileService.activity('owner');
    assert.deepEqual(result.stats, { booksOpened: 1, bookmarks: 2, notes: 1, completedPlans: 2 });
    assert.equal(result.books.length, 2);
    assert.equal(result.books[0].percentage, 42);
    assert.equal(result.books[0].editionId, 'edition-a');
    assert.equal(result.books[0].bookmarks, 2);
    assert.equal(result.books[1].notes, 1);
    assert.equal(result.books[1].lastReadAt, null);
  } finally { [prisma.bookmark.findMany, prisma.note.findMany, prisma.readingProgress.findMany, prisma.readingPlan.count, prisma.scriptureEdition.findMany] = originals; }
});

test('profile routes validate updates, isolate accounts and never expose authentication secrets', async () => {
  const original = { find: prisma.user.findUnique, update: prisma.user.update, activity: profileService.activity };
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { req.session = { userId: req.headers['x-test-user'] }; next(); });
  app.use('/auth', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/auth`;
  let user = { id: 'owner', displayName: 'Reader', email: 'reader@example.com', username: 'reader', preferredLang: 'hi',
    passwordHash: 'private-password-hash', googleSub: 'private-google-sub', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
  let writes = 0;
  prisma.user.findUnique = async query => { assert.equal(query.where.id, 'owner'); return user; };
  prisma.user.update = async query => { assert.equal(query.where.id, 'owner'); writes++; user = { ...user, ...query.data, updatedAt: new Date() }; return user; };
  profileService.activity = async userId => { assert.equal(userId, 'owner'); return { stats: { bookmarks: 2 }, books: [] }; };
  const headers = { 'x-test-user': 'owner', 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(base + '/profile')).status, 401);
    assert.equal((await fetch(base + '/profile/activity')).status, 401);
    for (const body of [{ displayName: '   ' }, { displayName: 'x'.repeat(101) }, { preferredLang: 'invalid' }, { email: 'takeover@example.com' }, { googleSub: 'changed' }, { userId: 'other' }, {}]) {
      assert.equal((await fetch(base + '/profile', { method: 'PATCH', headers, body: JSON.stringify(body) })).status, 400);
    }
    assert.equal(writes, 0);
    const response = await fetch(base + '/profile', { method: 'PATCH', headers, body: JSON.stringify({ displayName: '  नया नाम  ', preferredLang: 'en' }) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.user.displayName, 'नया नाम');
    assert.equal(data.user.preferredLang, 'en');
    assert.deepEqual(data.user.signInMethods, { google: true, password: true });
    assert.ok(data.user.updatedAt);
    assert.equal(data.user.passwordHash, undefined); assert.equal(data.user.googleSub, undefined);
    assert.equal((await (await fetch(base + '/profile', { headers })).json()).user.displayName, 'नया नाम');
    assert.equal((await (await fetch(base + '/profile/activity?userId=other', { headers })).json()).stats.bookmarks, 2);
    user.passwordHash = null;
    assert.deepEqual((await authService.getProfile('owner')).signInMethods, { google: true, password: false });
  } finally {
    prisma.user.findUnique = original.find; prisma.user.update = original.update; profileService.activity = original.activity;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
