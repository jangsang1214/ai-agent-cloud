# ATLAS Trading OS

Research-driven U.S. equities decision dashboard.

ATLAS combines multiple independent strategy engines instead of forcing every stock into one universal score:

- Market regime
- Short-term mean reversion
- Cross-sectional momentum
- Industry momentum
- Earnings / catalyst drift
- Value + quality
- Earnings quality
- Liquidity filters
- Portfolio risk

## Current status

`v0.2` has moved beyond hand-entered strategy scores.

The app now includes:

- Reproducible OHLCV demo series for forward UI testing
- SMA / RSI / ATR / realized volatility / volume ratio calculations
- 25-day moving-average deviation and historical deviation percentile
- 20/60-day returns and benchmark-relative strength
- Market-regime scoring
- Strategy routing and bounded 0–100 component scores
- Candidate ranking
- RED / GREEN / BLUE / YELLOW / PURPLE setup states
- Risk-mode switching
- Dynamic ATR-based entry / invalidation / target plans
- Portfolio allocation sandbox
- Data-driven hold-vs-switch comparison
- DEMO ↔ LIVE technical-data switch in the dashboard
- Server-side Massive market-data adapter
- Active U.S. ticker-universe endpoint
- Full-market grouped daily OHLCV endpoint
- Node tests and GitHub Actions CI

The dashboard defaults to synthetic demo OHLCV so the UI is deterministic and does not pretend stale values are live prices.

## Run locally

```bash
npm install
npm test
npm run dev
```

## Connect real U.S. market data

ATLAS uses Massive (formerly Polygon.io) behind a server-side proxy so the API key is never placed in browser-side `VITE_*` variables.

1. Copy `.env.example` to `.env`.
2. Add your key:

```bash
MASSIVE_API_KEY=your_key_here
```

3. Start the app:

```bash
npm run dev
```

4. The local Vite server exposes single-ticker history:

```text
GET /api/bars?symbol=LRCX&days=220
```

For Vercel deployments these server routes are available:

```text
GET /api/bars?symbol=LRCX&days=220
GET /api/universe?pages=20
GET /api/grouped?date=YYYY-MM-DD
```

`/api/universe` and `/api/grouped` are the basis for scanning the U.S. market at scale instead of requesting 200 historical bars separately for every ticker.

## Architecture

```text
Market data
   ↓
Indicators
   ↓
Market regime
   ↓
Independent strategy engines
   ↓
Strategy router
   ↓
Risk-adjusted ranking
   ↓
State machine (RED/GREEN/BLUE/YELLOW/PURPLE)
   ↓
Decision dashboard
```

The price-data provider is intentionally separated from the strategy engine. Replacing demo bars with live Massive bars does not change indicator or scoring code.

## Live-mode honesty

The current LIVE mode makes **price/volume technical factors live**. Catalyst, Quality and Value are deliberately set to neutral placeholders until their point-in-time data adapters are implemented. ATLAS should never label stale qualitative scores as live information.

## Next milestones

1. Persist 60–250 trading days of grouped U.S. market bars for full-universe scanning.
2. Add median dollar-volume and price/history liquidity gates.
3. Add point-in-time fundamentals, earnings dates, guidance and estimate revisions.
4. Add catalyst/news normalization with source timestamps.
5. Add historical backtesting with transaction costs, slippage, delisted securities and look-ahead controls.
6. Add paper-trading forward tests before any broker execution integration.

See `docs/DATA_PIPELINE.md` for the full-market ingestion design.

## Principle

A good company, a good setup, and a good entry price are three different questions. ATLAS keeps them separate.

> This project is a research and decision-support tool. It does not guarantee investment returns.
