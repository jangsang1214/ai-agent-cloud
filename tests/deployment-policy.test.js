import test from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorStatus, assertPublicBarSymbol, enforceBarRateLimit, requireBatchToken } from '../server/policy.js';

test('public bars accept valid U.S. stock symbols and reject malformed input', () => {
  assert.equal(assertPublicBarSymbol('lrcx'), 'LRCX');
  assert.equal(assertPublicBarSymbol('AAPL'), 'AAPL');
  assert.equal(assertPublicBarSymbol('brk.b'), 'BRK.B');
  assert.throws(() => assertPublicBarSymbol('AAPL<script>'), /Invalid U.S. stock symbol/);
  assert.throws(() => assertPublicBarSymbol(''), /Invalid U.S. stock symbol/);
});

test('public bar endpoint limiter rejects bursts', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.11' } };
  assert.doesNotThrow(() => enforceBarRateLimit(req, { limit: 2, windowMs: 60_000 }));
  assert.doesNotThrow(() => enforceBarRateLimit(req, { limit: 2, windowMs: 60_000 }));
  assert.throws(() => enforceBarRateLimit(req, { limit: 2, windowMs: 60_000 }), /Too many stock data requests/);
});

test('batch endpoints require the configured token', () => {
  const previous = process.env.ATLAS_BATCH_TOKEN;
  process.env.ATLAS_BATCH_TOKEN = 'test-secret';
  try {
    assert.doesNotThrow(() => requireBatchToken({ headers: { authorization: 'Bearer test-secret' } }));
    assert.throws(() => requireBatchToken({ headers: { authorization: 'Bearer wrong' } }), /Unauthorized/);
  } finally {
    if (previous === undefined) delete process.env.ATLAS_BATCH_TOKEN;
    else process.env.ATLAS_BATCH_TOKEN = previous;
  }
});

test('API error statuses preserve deployment failures', () => {
  const timeout = new Error('Massive request timed out');
  assert.equal(apiErrorStatus(timeout), 504);
  const unauthorized = new Error('Unauthorized');
  unauthorized.statusCode = 401;
  assert.equal(apiErrorStatus(unauthorized), 401);
});
