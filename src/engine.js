const WEIGHTS = {
  balanced: { Market:.14, Industry:.14, Momentum:.13, Reversion:.15, Catalyst:.14, Quality:.13, Value:.07, Risk:.10 },
  aggressive: { Market:.12, Industry:.14, Momentum:.18, Reversion:.17, Catalyst:.18, Quality:.08, Value:.05, Risk:.08 },
  conservative: { Market:.14, Industry:.12, Momentum:.07, Reversion:.07, Catalyst:.08, Quality:.18, Value:.16, Risk:.18 }
};

export function adjustedScore(stock, mode='balanced') {
  const weights = WEIGHTS[mode] || WEIGHTS.balanced;
  return Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + (stock.scores[key] ?? 0) * weight, 0));
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

function setupEstimate(stock) {
  const price = Number(stock.price);
  const target = Number(stock.plan?.targets?.[1] ?? stock.plan?.targets?.[0]);
  const stop = Number(stock.plan?.stop);
  const upside = Number.isFinite(price) && Number.isFinite(target) && price > 0
    ? Math.max(0, ((target / price) - 1) * 100)
    : 0;
  const downside = Number.isFinite(price) && Number.isFinite(stop) && price > 0
    ? Math.max(0, ((price - stop) / price) * 100)
    : 0;
  const rewardRisk = downside > 0 ? upside / downside : null;
  return {
    stock,
    upside: Math.round(upside * 10) / 10,
    downside: Math.round(downside * 10) / 10,
    rewardRisk: rewardRisk == null ? null : Math.round(rewardRisk * 100) / 100
  };
}

export function compareSetup(a, b) {
  return [setupEstimate(a), setupEstimate(b)];
}

export function rankStocks(stocks, mode='balanced') {
  return [...stocks]
    .map(stock => ({ ...stock, adjusted: adjustedScore(stock, mode) }))
    .sort((a,b) => b.adjusted - a.adjusted);
}
