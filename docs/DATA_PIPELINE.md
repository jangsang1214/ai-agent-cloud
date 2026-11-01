# ATLAS full-market data pipeline

## Goal

Scan the U.S. equity market without making one historical API request per ticker.

## Production approach

1. `GET /v3/reference/tickers` discovers the active stock universe.
2. `GET /v2/aggs/grouped/locale/us/market/stocks/{date}` downloads one daily OHLCV cross-section for the entire U.S. market.
3. A scheduled ingestion job stores each date's compact bars in a database/object store.
4. The scanner reads the latest 60–250 trading days and builds per-ticker time series in memory.
5. Liquidity filters run before expensive factor calculations.
6. Technical engines calculate SMA deviation, RSI, ATR, realized volatility, relative strength and volume behavior.
7. Fundamental/catalyst adapters join point-in-time data by ticker and timestamp.
8. Strategy routing ranks candidates by regime rather than blending every strategy into one rule.

## Why grouped bars

A naive scan of 10,000 tickers over 200 sessions can require thousands of individual network calls. Grouped daily bars reduce the historical price layer to roughly one API call per trading date and make the scan reproducible.

## Minimum liquidity gate

The exact thresholds must be backtested, but the first production filter should include:

- Active U.S. listing
- Valid adjusted OHLCV history
- Minimum price threshold
- Minimum 20-day median dollar volume
- Minimum history length
- Exclusion/flagging of extreme one-day corporate-action artifacts

Dollar volume should use point-in-time price × volume rather than current market cap as the primary trading-liquidity gate.

## Point-in-time discipline

Backtests must never use information that was unavailable on the simulated date.

Store or reconstruct:

- Earnings publication timestamps
- Guidance timestamps
- Analyst estimate revisions with timestamps
- Corporate actions and split-adjusted history
- Delisted securities
- Universe membership as-of each date

## Storage shape

Suggested compact daily bar key:

```text
(date, ticker, open, high, low, close, volume, vwap, transactions)
```

Suggested derived feature key:

```text
(date, ticker, sma25_dev, rsi14, atr14_pct, ret20, ret60, rs20, volume_ratio20, realized_vol20)
```

The feature table should be regenerable from raw bars so strategy formulas can change without corrupting source data.

## Current endpoints in this repo

- `/api/bars?symbol=LRCX&days=220` — single-ticker history for interactive analysis
- `/api/universe?pages=20` — active ticker discovery
- `/api/grouped?date=YYYY-MM-DD` — full-market daily OHLCV cross-section

All Massive credentials remain server-side through `MASSIVE_API_KEY`.
