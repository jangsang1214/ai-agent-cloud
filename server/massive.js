const API_BASE = 'https://api.massive.com';

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(value)) throw new Error('Invalid ticker symbol');
  return value;
}

export async function fetchMassiveDailyBars({ symbol, tradingDays = 220, apiKey = process.env.MASSIVE_API_KEY }) {
  if (!apiKey) throw new Error('MASSIVE_API_KEY is not configured');
  const ticker = normalizeSymbol(symbol);
  const days = Math.max(30, Math.min(1000, Number(tradingDays) || 220));
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Math.ceil(days * 1.75));

  const url = new URL(`${API_BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${isoDate(from)}/${isoDate(to)}`);
  url.searchParams.set('adjusted', 'true');
  url.searchParams.set('sort', 'asc');
  url.searchParams.set('limit', '50000');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Massive request failed (${response.status})`;
    throw new Error(message);
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const bars = results.slice(-days).map((bar) => ({
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    vwap: bar.vw ?? null,
    transactions: bar.n ?? null
  })).filter((bar) => [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite));

  if (bars.length < 30) throw new Error(`Not enough daily bars returned for ${ticker}`);
  return { symbol: ticker, source: 'massive', bars };
}
