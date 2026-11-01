# ATLAS Strategy Architecture

## 1. Market Regime Router

The router decides which strategy families are eligible before stock ranking begins.

Inputs planned:
- SPY / QQQ trend
- breadth
- realized volatility / VIX
- rates
- sector leadership

## 2. Mean Reversion Engine

Planned features:
- 20/25-day moving-average deviation
- RSI recovery
- ATR-normalized drawdown
- volume climax
- support/reversal confirmation

Research inspiration: short-horizon return reversals and practical BNF-style deviation logic.

## 3. Momentum Engine

Planned features:
- 3M / 6M / 12M relative return
- relative strength vs SPY
- relative strength vs sector
- distance from 52-week high

## 4. Industry Momentum

Separate sector/industry scoring from individual stock momentum. A stock may be weak while its industry remains strong, creating a potential catch-up setup.

## 5. Catalyst Engine

Planned events:
- earnings surprise
- guidance revision
- analyst estimate revision
- large contracts
- buybacks
- insider activity
- M&A / spin-offs
- regulatory and policy events

## 6. Value + Quality

Planned features:
- FCF yield
- EV/EBITDA
- forward valuation vs historical range
- gross profitability
- ROIC
- leverage
- Piotroski-style financial-strength checks

## 7. Earnings Quality

Planned features:
- operating cash flow / net income
- accrual ratio
- margin quality

## 8. Risk Engine

Planned features:
- ATR
- realized volatility
- beta
- correlation
- sector exposure
- position-size constraints

## 9. State Machine

- RED: held
- GREEN: actionable buy candidate
- BLUE: falling / waiting for stabilization
- YELLOW: quality company, price not ready
- PURPLE: event risk imminent
- GRAY: thesis damaged / excluded

## 10. Validation Standard

Every signal must eventually be tested with:
- train / validation / out-of-sample splits
- delisted stocks where possible
- point-in-time fundamentals
- transaction costs
- slippage
- survivorship-bias controls
- look-ahead-bias controls

The production system should recommend and explain; broker execution comes only after paper-trading validation.
