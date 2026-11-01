const PUBLIC_BAR_SYMBOLS = new Set([
  'SPY', 'SOXX', 'QTUM', 'PAVE',
  'LRCX', 'IONQ', 'PWR', 'VRT', 'FIX'
]);

const BAR_SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
const barRateWindows = new Map();

export function assertPublicBarSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!BAR_SYMBOL_PATTERN.test(value)) {
    const error = new Error('Invalid U.S. stock symbol');
    error.statusCode = 400;
    throw error;
  }
  return value;
}

export function isDefaultDashboardSymbol(symbol) {
  return PUBLIC_BAR_SYMBOLS.has(String(symbol || '').trim().toUpperCase());
}

export function enforceBarRateLimit(req, { limit = 36, windowMs = 60_000 } = {}) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || String(req.headers?.['x-real-ip'] || 'anonymous');
  const now = Date.now();
  const current = barRateWindows.get(key);
  const bucket = !current || now - current.startedAt >= windowMs
    ? { startedAt: now, count: 0 }
    : current;

  bucket.count += 1;
  barRateWindows.set(key, bucket);

  if (barRateWindows.size > 500) {
    for (const [entryKey, value] of barRateWindows) {
      if (now - value.startedAt >= windowMs) barRateWindows.delete(entryKey);
    }
  }

  if (bucket.count > limit) {
    const error = new Error('Too many stock data requests. Please try again shortly.');
    error.statusCode = 429;
    throw error;
  }
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
