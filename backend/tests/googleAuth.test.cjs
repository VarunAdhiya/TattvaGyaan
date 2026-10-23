const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const routes = require('../dist/routes/auth').default;
const { errorHandler, AppError } = require('../dist/middleware/errorHandler');
const { googleAuthService } = require('../dist/services/googleAuthService');
const { authService } = require('../dist/services/authService');
const { config } = require('../dist/config');
const prisma = require('../dist/lib/prisma').default;

test('Google identity uses PKCE and verifies token audience, nonce and verified email', async () => {
  const previous = { config: { ...config.google }, client: googleAuthService.client };
  config.google.clientId = 'test-client'; config.google.clientSecret = 'test-secret';
  const { flow, url } = googleAuthService.begin('login');
  const authUrl = new URL(url);
  assert.equal(authUrl.origin, 'https://accounts.google.com');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authUrl.searchParams.get('nonce'), flow.nonce);
  assert.equal(authUrl.searchParams.get('scope'), 'openid email profile');
  assert.ok(!url.includes('test-secret'));
  let payload = { sub: 'google-sub', email: 'User@Example.com', email_verified: true, nonce: flow.nonce, name: 'Test Reader' };
  let verified = 0;
  googleAuthService.client = () => ({
    async getToken(options) { assert.equal(options.codeVerifier, flow.verifier); assert.equal(options.code, 'test-code'); return { tokens: { id_token: 'signed-token' } }; },
    async verifyIdToken(options) { assert.deepEqual(options, { idToken: 'signed-token', audience: 'test-client' }); verified++; return { getPayload: () => payload }; },
  });
  try {
    assert.deepEqual(await googleAuthService.identity('test-code', flow), { sub: 'google-sub', email: 'user@example.com', name: 'Test Reader' });
    for (const invalid of [{ ...payload, nonce: 'wrong' }, { ...payload, email_verified: false }, { ...payload, sub: '' }]) {
      const valid = payload; payload = invalid;
      await assert.rejects(googleAuthService.identity('test-code', flow), /could not be verified/); payload = valid;
    }
    assert.equal(verified, 4);
    googleAuthService.client = () => ({ async getToken() { return { tokens: {} }; } });
    await assert.rejects(googleAuthService.identity('test-code', flow), /identity token/);
  } finally { config.google = previous.config; googleAuthService.client = previous.client; }
});

test('Google accounts preserve existing users and require explicit password-verified linking', async () => {
  const original = { findUnique: prisma.user.findUnique, findFirst: prisma.user.findFirst, create: prisma.user.create, updateMany: prisma.user.updateMany };
  const identity = { sub: 'google-sub', email: 'reader@example.com', name: 'Reader' };
  let linked = null; let existing = null; let created;
  prisma.user.findUnique = async () => linked;
  prisma.user.findFirst = async () => existing;
  prisma.user.create = async input => { created = input; return { id: 'new-user', email: identity.email }; };
  try {
    assert.equal((await googleAuthService.resolve(identity)).user.id, 'new-user');
    assert.equal(created.data.passwordHash, null);
    assert.equal(created.data.googleSub, identity.sub);
    assert.match(created.data.username, /^google_[a-f0-9]+$/);
    created = null; existing = { id: 'password-user', email: 'Reader@Example.com' };
    const match = await googleAuthService.resolve(identity);
    assert.equal(match.linkRequired, true);
    assert.equal(match.linkEmail, 'Reader@Example.com');
    assert.equal(created, null);
    linked = { id: 'same-user', email: 'original@example.com' };
    assert.equal((await googleAuthService.resolve(identity)).user.id, 'same-user');
    linked = { email: 'different@example.com', googleSub: null };
    await assert.rejects(googleAuthService.link('user', { ...identity, expires: Date.now() + 10000 }), /same Google email/);
    linked = { email: identity.email, googleSub: null };
    let update;
    prisma.user.updateMany = async query => { update = query; return { count: 1 }; };
    await googleAuthService.link('user', { ...identity, expires: Date.now() + 10000 });
    assert.deepEqual(update, { where: { id: 'user', googleSub: null }, data: { googleSub: identity.sub } });
    await assert.rejects(googleAuthService.link('user', { ...identity, expires: 1 }), /expired/);
    linked = { email: identity.email, googleSub: 'another-google-account' };
    await assert.rejects(googleAuthService.link('user', { ...identity, expires: Date.now() + 10000 }), /same Google email/);
    prisma.user.findUnique = async () => ({ email: identity.email, passwordHash: null });
    await assert.rejects(authService.login(identity.email, 'arbitrary-password'), /Invalid email or password/);
  } finally { Object.assign(prisma.user, original); }
});

test('Google routes reject forged/replayed callbacks, rotate sessions, link deliberately, and handle cancellation', async () => {
  const original = { google: { ...config.google }, begin: googleAuthService.begin, identity: googleAuthService.identity,
    resolve: googleAuthService.resolve, link: googleAuthService.link, login: authService.login, register: authService.register, profile: authService.getProfile };
  config.google.clientId = 'test-client'; config.google.clientSecret = 'test-secret';
  const app = express(); app.use(express.json());
  app.use(session({ secret: 'test-session-secret', resave: false, saveUninitialized: false, name: 'tattva.sid', cookie: { httpOnly: true, sameSite: 'lax' } }));
  app.use('/auth', routes); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/auth`;
  const user = { id: 'user-1', email: 'reader@example.com', username: 'reader' };
  const identity = { sub: 'google-1', email: user.email };
  let identityCalls = 0; let linkRequired = false; let linkCalls = 0;
  googleAuthService.identity = async () => { identityCalls++; return identity; };
  googleAuthService.resolve = async () => linkRequired ? { user: null, linkRequired: true } : { user, linkRequired: false };
  googleAuthService.link = async (id, pending) => { assert.equal(id, user.id); assert.equal(pending.sub, identity.sub); linkCalls++; };
  authService.getProfile = async id => { assert.equal(id, user.id); return user; };
  authService.login = async (_email, password) => { if (password !== 'correct-password') throw new AppError('Invalid password', 401); return user; };
  authService.register = async () => user;
  const request = (path, cookie, options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
  const cookieOf = response => response.headers.get('set-cookie')?.split(';')[0];
  async function start(intent = 'login') {
    const response = await request('/google/start?intent=' + intent);
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get('location'));
    return { cookie: cookieOf(response), state: location.searchParams.get('state') };
  }
  try {
    const status = await request('/google/status');
    assert.deepEqual(await status.json(), { enabled: true, linkEmail: null });
    const first = await start();
    assert.match(first.cookie, /tattva.sid=/);
    const forged = await request('/google/callback?state=wrong&code=anything', first.cookie);
    assert.match(forged.headers.get('location'), /google=expired/); assert.equal(identityCalls, 0);
    const callback = `/google/callback?state=${first.state}&code=valid-code`;
    const success = await request(callback, first.cookie);
    assert.match(success.headers.get('location'), /\/dashboard$/);
    assert.notEqual(cookieOf(success), first.cookie);
    assert.deepEqual((await (await request('/me', cookieOf(success))).json()).user, user);
    await request(callback, first.cookie); assert.equal(identityCalls, 1);
    const cancelled = await start('register');
    const cancelResponse = await request(`/google/callback?state=${cancelled.state}&error=access_denied`, cancelled.cookie);
    assert.match(cancelResponse.headers.get('location'), /register\?google=cancelled/); assert.equal(identityCalls, 1);
    googleAuthService.begin = intent => {
      const result = original.begin.call(googleAuthService, intent);
      result.flow.expires = 1;
      return result;
    };
    const expired = await start();
    assert.match((await request(`/google/callback?state=${expired.state}&code=valid`, expired.cookie)).headers.get('location'), /google=expired/);
    assert.equal(identityCalls, 1);
    googleAuthService.begin = original.begin;
    linkRequired = true;
    const link = await start();
    const pending = await request(`/google/callback?state=${link.state}&code=valid`, link.cookie);
    assert.match(pending.headers.get('location'), /login\?google=link_required/);
    const linkCookie = cookieOf(pending) || link.cookie;
    assert.equal((await (await request('/google/status', linkCookie)).json()).linkEmail, user.email);
    const wrongPassword = await request('/login', linkCookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'wrong-password', connectGoogle: true }) });
    assert.equal(wrongPassword.status, 401); assert.equal(linkCalls, 0);
    const login = await request('/login', linkCookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'correct-password', connectGoogle: true }) });
    assert.equal(login.status, 200); assert.equal(linkCalls, 1);
    assert.notEqual(cookieOf(login), linkCookie);
    const missingLink = await request('/login', null, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'correct-password', connectGoogle: true }) });
    assert.equal(missingLink.status, 401); assert.equal(linkCalls, 1);
    const logout = await request('/logout', cookieOf(login), { method: 'POST' });
    assert.equal(logout.status, 200);
    assert.equal((await (await request('/me', cookieOf(login))).json()).user, null);
    const plain = await request('/login', expired.cookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'correct-password' }) });
    assert.equal(plain.status, 200); assert.equal(linkCalls, 1);
    assert.notEqual(cookieOf(plain), expired.cookie);
    const registered = await request('/register', cancelled.cookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, username: 'reader', password: 'correct-password' }) });
    assert.equal(registered.status, 201);
    assert.notEqual(cookieOf(registered), cancelled.cookie);
    config.google.clientId = '';
    assert.match((await request('/google/start')).headers.get('location'), /google=unavailable/);
  } finally {
    config.google = original.google; googleAuthService.begin = original.begin; googleAuthService.identity = original.identity;
    googleAuthService.resolve = original.resolve; googleAuthService.link = original.link;
    authService.login = original.login; authService.register = original.register; authService.getProfile = original.profile;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
