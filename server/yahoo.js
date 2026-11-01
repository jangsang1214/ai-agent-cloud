const YAHOO_HOSTS = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com'];
const DEFAULT_TIMEOUT_MS = 8000;

function normalizeSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(value)) throw new Error('Invalid ticker symbol');
  return value;
}

function yahooSymbol(ticker) {
  // Yahoo represents share classes such as BRK.B as BRK-B.
  return ticker.replaceAll('.', '-');
}

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function parseChart(payload, ticker, days) {
  const providerError = payload?.chart?.error;
  if (providerError) {
    const error = new Error(providerError.description || providerError.code || `Yahoo data unavailable for ${ticker}`);
    error.statusCode = 502;
    throw error;
  }

  const result = payload?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose || [];

  const bars = timestamps.map((timestampSeconds, index) => {
    const open = finite(quote.open?.[index]);
    const high = finite(quote.high?.[index]);
    const low = finite(quote.low?.[index]);
    const close = finite(quote.close?.[index]);
    const volume = finite(quote.volume?.[index]);
    const adjClose = finite(adjusted?.[index]);
    if (![timestampSeconds, open, high, low, close, volume].every(Number.isFinite)) return null;

    // Keep historical indicators split/dividend aware by scaling OHLC with Yahoo's
    // adjusted-close ratio when it is available.
    const ratio = Number.isFinite(adjClose) && close !== 0 ? adjClose / close : 1;
    return {
      timestamp: timestampSeconds * 1000,
      open: open * ratio,
      high: high * ratio,
      low: low * ratio,
      close: close * ratio,
      volume,
      vwap: null,
      transactions: null
    };
  }).filter(Boolean).slice(-days);

  if (bars.length < 30) throw new Error(`Not enough daily bars returned for ${ticker}`);
  return bars;
}

async function fetchHost(host, providerTicker, timeoutMs) {
  const url = new URL(`/v8/finance/chart/${encodeURIComponent(providerTicker)}`, host);
  url.searchParams.set('range', '2y');
  url.searchParams.set('interval', '1d');
  url.searchParams.set('includePrePost', 'false');
  url.searchParams.set('events', 'div,splits');
  url.searchParams.set('includeAdjustedClose', 'true');

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const wrapped = new Error(error?.name === 'TimeoutError' ? 'Yahoo request timed out' : 'Yahoo request failed');
    wrapped.statusCode = error?.name === 'TimeoutError' ? 504 : 502;
    throw wrapped;
  }

  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Yahoo Finance is temporarily rate limited' : `Yahoo Finance request failed (${response.status})`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }

  return response.json();
}

export async function fetchYahooDailyBars({ symbol, tradingDays = 220, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const ticker = normalizeSymbol(symbol);
  const providerTicker = yahooSymbol(ticker);
  const days = Math.max(30, Math.min(260, Number(tradingDays) || 220));

  let lastError;
  for (const host of YAHOO_HOSTS) {
    try {
      const payload = await fetchHost(host, providerTicker, timeoutMs);
      return {
        symbol: ticker,
        providerSymbol: providerTicker,
        source: 'yahoo-chart-eod-unofficial',
        bars: parseChart(payload, ticker, days)
      };
    } catch (error) {
      lastError = error;
      // A rate limit can differ by Yahoo host, so try the mirror once before surfacing it.
    }
  }

  throw lastError || new Error('Yahoo Finance request failed');
}
