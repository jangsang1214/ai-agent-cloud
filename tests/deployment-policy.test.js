import test from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorStatus, assertPublicBarSymbol, requireBatchToken } from '../server/policy.js';

test('public bars only allow dashboard symbols', () => {
  assert.equal(assertPublicBarSymbol('lrcx'), 'LRCX');
  assert.throws(() => assertPublicBarSymbol('AAPL'), /not enabled/);
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
