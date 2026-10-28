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

`v0.1` is an interactive prototype using mock data for LRCX, IONQ, PWR, VRT and FIX.

The prototype already supports:

- Candidate ranking
- RED / GREEN / BLUE / PURPLE setup states
- Risk-mode switching
- Strategy score decomposition
- Entry / invalidation / target views
- Portfolio allocation sandbox
- Hold-vs-switch comparison
- Responsive desktop/mobile layout

## Run locally

```bash
npm install
npm run dev
```

## Next milestones

1. Connect a market-data provider for U.S. equities price/volume history.
2. Add fundamentals, earnings dates, guidance and estimate revisions.
3. Implement market-regime and strategy calculators with reproducible formulas.
4. Add historical backtesting with transaction costs, slippage and survivorship-bias controls.
5. Add paper-trading forward tests before any broker execution integration.

## Principle

A good company, a good setup, and a good entry price are three different questions. ATLAS keeps them separate.

> This project is a research and decision-support tool. It does not guarantee investment returns.
