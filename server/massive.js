const API_BASE = 'https://api.massive.com';
const DEFAULT_TIMEOUT_MS = 8000;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function requireKey(apiKey) {
  if (!apiKey) throw new Error('MASSIVE_API_KEY is not configured');
  return apiKey;
}

function normalizeSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(value)) throw new Error('Invalid ticker symbol');
  return value;
}

function normalizeDate(value) {
  const input = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new Error('Date must use YYYY-MM-DD');
  const parsed = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== input) throw new Error('Invalid calendar date');
  return input;
}

async function massiveRequest(url, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${requireKey(apiKey)}` },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const wrapped = new Error(error?.name === 'TimeoutError' ? 'Massive request timed out' : 'Massive request failed');
    wrapped.statusCode = error?.name === 'TimeoutError' ? 504 : 502;
    throw wrapped;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Massive request failed (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }
  return payload;
}

export async function fetchMassiveDailyBars({ symbol, tradingDays = 220, apiKey = process.env.MASSIVE_API_KEY }) {
  const ticker = normalizeSymbol(symbol);
  const days = Math.max(30, Math.min(1000, Number(tradingDays) || 220));
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Math.ceil(days * 1.75));

  const url = new URL(`${API_BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${isoDate(from)}/${isoDate(to)}`);
  url.searchParams.set('adjusted', 'true');
  url.searchParams.set('sort', 'asc');
  url.searchParams.set('limit', '50000');

  const payload = await massiveRequest(url, apiKey);
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

export async function fetchActiveStockUniverse({ maxPages = 3, apiKey = process.env.MASSIVE_API_KEY } = {}) {
  const pages = Math.max(1, Math.min(5, Number(maxPages) || 3));
  let url = new URL(`${API_BASE}/v3/reference/tickers`);
  url.searchParams.set('market', 'stocks');
  url.searchParams.set('active', 'true');
  url.searchParams.set('limit', '1000');
  url.searchParams.set('sort', 'ticker');
  url.searchParams.set('order', 'asc');

  const tickers = [];
  let page = 0;
  while (url && page < pages) {
    const payload = await massiveRequest(url, apiKey, 6000);
    const results = Array.isArray(payload.results) ? payload.results : [];
    for (const item of results) {
      if (!item?.ticker) continue;
      tickers.push({
        ticker: item.ticker,
        name: item.name ?? null,
        type: item.type ?? null,
        market: item.market ?? null,
        locale: item.locale ?? null,
        primaryExchange: item.primary_exchange ?? null,
        currency: item.currency_name ?? null,
        active: item.active !== false
      });
    }
    page += 1;
    url = payload.next_url ? new URL(payload.next_url) : null;
  }

  return { source:'massive', count:tickers.length, truncated:Boolean(url), tickers };
}

export async function fetchGroupedDailyBars({ date, apiKey = process.env.MASSIVE_API_KEY }) {
  const day = normalizeDate(date);
  const url = new URL(`${API_BASE}/v2/aggs/grouped/locale/us/market/stocks/${day}`);
  url.searchParams.set('adjusted', 'true');
  const payload = await massiveRequest(url, apiKey);
  const results = Array.isArray(payload.results) ? payload.results : [];
  const bars = results.map((bar) => ({
    ticker: bar.T,
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    vwap: bar.vw ?? null,
    transactions: bar.n ?? null
  })).filter((bar) => bar.ticker && [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite));
  return { source:'massive', date:day, count:bars.length, bars };
}
