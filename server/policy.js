const PUBLIC_BAR_SYMBOLS = new Set([
  'SPY', 'SOXX', 'QTUM', 'PAVE',
  'LRCX', 'IONQ', 'PWR', 'VRT', 'FIX'
]);

export function assertPublicBarSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!PUBLIC_BAR_SYMBOLS.has(value)) {
    const error = new Error('Symbol is not enabled for the public live dashboard');
    error.statusCode = 403;
    throw error;
  }
  return value;
}

export function requireBatchToken(req) {
  const expected = process.env.ATLAS_BATCH_TOKEN;
  if (!expected) {
    const error = new Error('Batch API is not configured');
    error.statusCode = 503;
    throw error;
  }

  const raw = req.headers?.authorization || req.headers?.['x-atlas-batch-token'] || '';
  const provided = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  if (!provided || provided !== expected) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

export function apiErrorStatus(error) {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  const message = String(error?.message || '');
  if (message.includes('not configured')) return 503;
  if (message.includes('timed out')) return 504;
  return 400;
}
