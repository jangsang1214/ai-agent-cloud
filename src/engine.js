const WEIGHTS = {
  balanced: { Market:.14, Industry:.14, Momentum:.13, Reversion:.15, Catalyst:.14, Quality:.13, Value:.07, Risk:.10 },
  aggressive: { Market:.12, Industry:.14, Momentum:.18, Reversion:.17, Catalyst:.18, Quality:.08, Value:.05, Risk:.08 },
  conservative: { Market:.14, Industry:.12, Momentum:.07, Reversion:.07, Catalyst:.08, Quality:.18, Value:.16, Risk:.18 }
};

export function adjustedScore(stock, mode='balanced') {
  const weights = WEIGHTS[mode] || WEIGHTS.balanced;
  return Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + stock.scores[key] * weight, 0));
}

export function portfolioStats(total, qld, ionq) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeQld = Math.max(0, Number(qld) || 0);
  const safeIonq = Math.max(0, Number(ionq) || 0);
  const rawInvested = safeQld + safeIonq;
  const invested = Math.min(safeTotal, rawInvested);
  return {
    total: safeTotal,
    qld: safeQld,
    ionq: safeIonq,
    invested,
    cash: Math.max(0, safeTotal - invested),
    investedPct: Math.min(100, invested / safeTotal * 100),
    overAllocated: rawInvested > safeTotal
  };
}

export function compareSetup(a, b) {
  const estimates = {
    LRCX: { upside: 21, downside: 8 },
    IONQ: { upside: 27, downside: 19 },
    PWR: { upside: 18, downside: 12 },
    VRT: { upside: 18, downside: 14 },
    FIX: { upside: 16, downside: 10 }
  };
  const pack = (stock) => ({ stock, ...(estimates[stock.ticker] || { upside: 15, downside: 12 }) });
  return [pack(a), pack(b)];
}

export function rankStocks(stocks, mode='balanced') {
  return [...stocks]
    .map(stock => ({ ...stock, adjusted: adjustedScore(stock, mode) }))
    .sort((a,b) => b.adjusted - a.adjusted);
}
