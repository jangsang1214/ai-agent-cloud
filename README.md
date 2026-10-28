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
- Server-side Massive market-data adapter
- Node tests and GitHub Actions CI

The dashboard still defaults to synthetic demo OHLCV so the UI is deterministic and does not pretend stale values are live prices.

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

4. The local Vite server exposes:

```text
GET /api/bars?symbol=LRCX&days=220
```

For Vercel deployments, `api/bars.js` exposes the same route and reads `MASSIVE_API_KEY` from server environment variables.

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

The price-data provider is intentionally separated from the strategy engine. Replacing demo bars with live Massive bars should not change indicator or scoring code.

## Next milestones

1. Wire the live-bar endpoint into the dashboard with explicit DEMO/LIVE state.
2. Add full U.S. ticker-universe ingestion and liquidity filtering.
3. Add fundamentals, earnings dates, guidance and estimate revisions.
4. Add catalyst/news normalization with source timestamps.
5. Add point-in-time historical backtesting with transaction costs, slippage, delisted securities and look-ahead controls.
6. Add paper-trading forward tests before any broker execution integration.

## Principle

A good company, a good setup, and a good entry price are three different questions. ATLAS keeps them separate.

> This project is a research and decision-support tool. It does not guarantee investment returns.
