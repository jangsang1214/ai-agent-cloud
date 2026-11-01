const STOOQ_BASE = 'https://stooq.com/q/d/l/';
const DEFAULT_TIMEOUT_MS = 9000;

function normalizeSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(value)) throw new Error('Invalid ticker symbol');
  return value;
}

function dateParam(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseStooqCsv(text, ticker, days) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed === 'N/D') throw new Error(`No Stooq data returned for ${ticker}`);
  if (/exceeded|quota|too many|captcha|cloudflare|access denied/i.test(trimmed)) {
    const error = new Error('Stooq is temporarily rate limited');
    error.statusCode = 429;
    throw error;
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const headers = (lines.shift() || '').split(',').map((value) => value.trim().toLowerCase());
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const required = ['date', 'open', 'high', 'low', 'close', 'volume'];
  if (!required.every((header) => Number.isInteger(indexes[header]))) {
    throw new Error('Unexpected Stooq response');
  }

  const bars = lines.map((line) => {
    const cells = line.split(',');
    const date = cells[indexes.date];
    const open = parseNumber(cells[indexes.open]);
    const high = parseNumber(cells[indexes.high]);
    const low = parseNumber(cells[indexes.low]);
    const close = parseNumber(cells[indexes.close]);
    const volume = parseNumber(cells[indexes.volume]);
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (![timestamp, open, high, low, close, volume].every(Number.isFinite)) return null;
    return { timestamp, open, high, low, close, volume, vwap: null, transactions: null };
  }).filter(Boolean).slice(-days);

  if (bars.length < 30) throw new Error(`Not enough daily bars returned for ${ticker}`);
  return bars;
}

export async function fetchStooqDailyBars({ symbol, tradingDays = 220, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const ticker = normalizeSymbol(symbol);
  const days = Math.max(30, Math.min(260, Number(tradingDays) || 220));
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Math.ceil(days * 1.8));

  const url = new URL(STOOQ_BASE);
  url.searchParams.set('s', `${ticker.toLowerCase()}.us`);
  url.searchParams.set('d1', dateParam(from));
  url.searchParams.set('d2', dateParam(to));
  url.searchParams.set('i', 'd');

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ATLAS-Trading-OS/0.2; +https://vercel.app)',
        Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.1'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const wrapped = new Error(error?.name === 'TimeoutError' ? 'Stooq request timed out' : 'Stooq request failed');
    wrapped.statusCode = error?.name === 'TimeoutError' ? 504 : 502;
    throw wrapped;
  }

  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Stooq is temporarily rate limited' : `Stooq request failed (${response.status})`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }

  const text = await response.text();
  return { symbol: ticker, source: 'stooq-eod', bars: parseStooqCsv(text, ticker, days) };
}
