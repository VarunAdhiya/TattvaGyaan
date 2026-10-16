const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabaseConfig } = require('../dist/config/database');
const { errorHandler } = require('../dist/middleware/errorHandler');
const url = 'postgresql://test:encoded%40password@localhost:5432/test?schema=public&sslmode=require';

test('query and session pools fit within a 15-connection database by default', () => {
  const config = createDatabaseConfig({ DATABASE_URL: url });
  assert.equal(config.connectionLimit, 5);
  assert.equal(config.sessionPool.max, 2);
  assert.equal(config.sessionPool.connectionTimeoutMillis, 10000);
  assert.equal(config.sessionPool.idleTimeoutMillis, 10000);
  const parsed = new URL(config.prismaUrl);
  assert.equal(parsed.searchParams.get('connection_limit'), '5');
  assert.equal(parsed.searchParams.get('pool_timeout'), '15');
  assert.equal(parsed.password, 'encoded%40password');
  assert.equal(parsed.searchParams.get('schema'), 'public');
  assert.equal(parsed.searchParams.get('sslmode'), 'require');
  assert.equal(config.sessionPool.connectionString, url);
});

test('explicit pool sizes and timeouts override URL settings without duplicate parameters', () => {
  const config = createDatabaseConfig({ DATABASE_URL: url + '&connection_limit=3&pool_timeout=20', DATABASE_CONNECTION_LIMIT: '4', SESSION_DATABASE_CONNECTION_LIMIT: '1', DATABASE_POOL_TIMEOUT: '25' });
  const parsed = new URL(config.prismaUrl);
  assert.deepEqual(parsed.searchParams.getAll('connection_limit'), ['4']);
  assert.equal(parsed.searchParams.get('pool_timeout'), '25');
  assert.equal(config.sessionPool.max, 1);
  const fromUrl = createDatabaseConfig({ DATABASE_URL: url + '&connection_limit=3&pool_timeout=20' });
  assert.equal(fromUrl.connectionLimit, 3);
  assert.equal(new URL(fromUrl.prismaUrl).searchParams.get('pool_timeout'), '20');
});

test('invalid pool settings fail early without exposing a database URL', () => {
  for (const value of ['0', '-1', '1.5', 'NaN', 'Infinity']) {
    assert.throws(() => createDatabaseConfig({ DATABASE_URL: url, DATABASE_CONNECTION_LIMIT: value }), /positive integer/);
    assert.throws(() => createDatabaseConfig({ DATABASE_URL: url, SESSION_DATABASE_CONNECTION_LIMIT: value }), /positive integer/);
  }
  assert.throws(() => createDatabaseConfig({ DATABASE_URL: 'secret-invalid-value' }), { message: 'DATABASE_URL must be a valid PostgreSQL URL' });
  assert.equal(createDatabaseConfig({}).prismaUrl, '');
});

test('database exhaustion returns a retryable 503 without leaking driver details', () => {
  for (const error of [
    new Error('FATAL (EMAXCONNSESSION) max clients reached in session mode'),
    Object.assign(new Error('Pool timeout'), { code: 'P2024' }),
    Object.assign(new Error('Too many connections'), { code: 'P2037' }),
    Object.assign(new Error('Database full'), { code: '53300' }),
  ]) {
    const result = {};
    errorHandler(error, {}, {
      setHeader(name, value) { result[name] = value; },
      status(code) { result.status = code; return this; },
      json(body) { result.body = body; },
    }, () => {});
    assert.equal(result.status, 503);
    assert.equal(result['Retry-After'], '2');
    assert.deepEqual(result.body, { error: 'The database is busy. Please try again shortly.' });
  }
});
