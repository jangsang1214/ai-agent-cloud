# Strategy engine specification

This document defines the current v0.2 signal layer and the rules for evolving it without turning ATLAS into an overfit score machine.

## 1. Market regime

Inputs:

- SPY price vs 20-day SMA
- SPY price vs 50-day SMA
- SPY 20-day return
- SPY 60-day return

The output is bounded to 0–100. Later versions should add breadth, rates and volatility, but each new variable must earn its place through out-of-sample testing.

## 2. Mean reversion

Current inputs:

- Price deviation from 25-day SMA
- RSI(14)
- Current 25-day deviation percentile relative to the stock's own history
- 20-day volume ratio

Purpose:

Find unusually large pullbacks where the move is extreme relative to that stock's own behavior. Absolute drawdown alone is not enough because a 10% move has different meaning for a low-volatility stock and a high-beta stock.

## 3. Momentum

Current inputs:

- 20-day return
- 60-day return
- 20-day relative strength vs SPY

Momentum and mean reversion are intentionally separate. A stock can score well on one and poorly on the other. The strategy router decides which setup matters under the current regime.

## 4. Industry momentum

Current inputs:

- Sector/industry proxy 20-day return
- Sector/industry proxy 20-day relative strength vs SPY

The production version should use a richer industry mapping than a single ETF proxy and should compare each stock with its most economically relevant peer group.

## 5. Catalyst

Current demo mode: hand-authored prototype values.

Current live mode: neutral 50 placeholder.

Production inputs should be point-in-time and timestamped:

- EPS/revenue surprise
- Guidance revisions
- Estimate revisions
- Material contracts
- M&A / divestitures
- Buybacks / insider activity
- Regulatory or policy changes
- Product milestones

No future information may leak into historical scores.

## 6. Quality

Current live mode: neutral 50 placeholder.

Candidate production inputs:

- Gross profitability
- ROIC
- Operating cash flow / net income
- Balance-sheet leverage
- Margin stability
- Piotroski-style financial strength

## 7. Value

Current live mode: neutral 50 placeholder.

Candidate production inputs:

- FCF yield
- EV/EBITDA relative to own history and peers
- Forward earnings yield
- Net cash / enterprise value
- Tangible asset support where economically meaningful

Low valuation alone must never be treated as a buy signal.

## 8. Risk

Current inputs:

- 20-day realized volatility
- ATR as a percentage of price
- Market regime modifier

Future production inputs:

- Gap risk
- Earnings-event distance
- Liquidity / spread
- Portfolio correlation
- Sector concentration
- Beta and downside beta

## 9. State machine

- RED — already held
- GREEN — actionable setup
- BLUE — falling / watch for stabilization
- YELLOW — company/setup acceptable but price not ready
- PURPLE — binary event risk near-term
- GRAY — thesis broken / excluded (planned)

The state is not the same as a score. A high-scoring stock can remain PURPLE when an earnings event creates unacceptable binary risk.

## 10. Anti-overfitting rules

1. Every factor needs an economic/behavioral rationale.
2. Prefer monotonic, simple transforms over highly tuned thresholds.
3. Record formula changes with version numbers.
4. Test on rolling out-of-sample periods.
5. Include delisted names and historical universe membership.
6. Model transaction costs and slippage.
7. Report turnover, max drawdown, hit rate, payoff ratio and exposure — not only CAGR.
8. Never optimize on the same 2026 forward-test period used for evaluation.
9. Keep technical, fundamental and catalyst data timestamps separate.
10. Paper trade before any broker integration.
