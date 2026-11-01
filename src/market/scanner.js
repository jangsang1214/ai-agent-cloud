import {
  atr,
  clamp,
  deviationFromSma,
  pctChange,
  realizedVolatility,
  relativeStrength,
  rollingDeviations,
  rsi,
  sma,
  volumeRatio,
  percentileRank
} from './indicators.js';

const score = (value) => Math.round(clamp(value));
const closes = (bars) => bars.map((bar) => bar.close);

export function marketRegimeScore(benchmarkBars) {
  const values = closes(benchmarkBars);
  const current = values.at(-1);
  const ma20 = sma(values, 20);
  const ma50 = sma(values, 50);
  const r20 = pctChange(values, 20) ?? 0;
  const r60 = pctChange(values, 60) ?? 0;
  let result = 50;
  if (current > ma20) result += 12;
  if (current > ma50) result += 12;
  result += clamp(r20 * 1.2, -12, 12);
  result += clamp(r60 * 0.5, -12, 12);
  return score(result);
}

function strategyName(scores) {
  const ordered = Object.entries({
    'Quality Mean Reversion': scores.Reversion + scores.Quality,
    'Momentum / Catalyst': scores.Momentum + scores.Catalyst,
    'Industry Momentum': scores.Industry + scores.Momentum,
    'Value + Quality': scores.Value + scores.Quality
  }).sort((a, b) => b[1] - a[1]);
  return ordered[0][0];
}

function deriveStatus({ meta, metrics, scores }) {
  if (meta.held) return { status:'RED', label:'HELD' };
  if (meta.eventDays <= 2) return { status:'PURPLE', label:'EVENT' };
  if (scores.Reversion >= 68 && scores.Risk >= 40 && scores.Market >= 48) return { status:'GREEN', label:'BUY ZONE' };
  if ((metrics.rsi14 ?? 50) < 36 || (metrics.sma25Deviation ?? 0) < -10) return { status:'BLUE', label:'WATCH' };
  return { status:'YELLOW', label:'PRICE WAIT' };
}

function tradePlan(price, atr14, status) {
  const unit = Number.isFinite(atr14) && atr14 > 0 ? atr14 : price * 0.03;
  const round = (value) => Number(value.toFixed(value >= 100 ? 0 : 2));
  const plan = {
    entryLow: round(price - unit * 0.55),
    entryHigh: round(price + unit * 0.25),
    stop: round(price - unit * 1.8),
    targets: [round(price + unit * 1.2), round(price + unit * 2.2), round(price + unit * 3.2)]
  };
  if (status === 'PURPLE') return { ...plan, entryText:'이벤트 확인 후' };
  if (status === 'RED') return { ...plan, entryText:'보유 중' };
  if (status === 'YELLOW') return { ...plan, entryText:`$${plan.entryLow} 대기` };
  return { ...plan, entryText:`$${plan.entryLow}–${plan.entryHigh}` };
}

export function analyzeCandidate({ ticker, bars, benchmarkBars, sectorBars, meta }) {
  const stockCloses = closes(bars);
  const benchmarkCloses = closes(benchmarkBars);
  const sectorCloses = closes(sectorBars);
  const currentPrice = stockCloses.at(-1);
  const rsi14 = rsi(stockCloses, 14);
  const atr14 = atr(bars, 14);
  const atrPct = atr14 && currentPrice ? (atr14 / currentPrice) * 100 : 0;
  const sma25Deviation = deviationFromSma(stockCloses, 25);
  const deviations = rollingDeviations(stockCloses, 25);
  const deviationPercentile = percentileRank(deviations.slice(0, -1), sma25Deviation);
  const stock20 = pctChange(stockCloses, 20) ?? 0;
  const stock60 = pctChange(stockCloses, 60) ?? 0;
  const sector20 = pctChange(sectorCloses, 20) ?? 0;
  const rs20 = relativeStrength(stockCloses, benchmarkCloses, 20) ?? 0;
  const sectorRs20 = relativeStrength(sectorCloses, benchmarkCloses, 20) ?? 0;
  const volume20 = volumeRatio(bars, 20) ?? 1;
  const vol20 = realizedVolatility(stockCloses, 20) ?? 40;
  const market = marketRegimeScore(benchmarkBars);

  const metrics = {
    rsi14,
    atr14,
    atrPct,
    sma25Deviation,
    deviationPercentile,
    return20: stock20,
    return60: stock60,
    relativeStrength20: rs20,
    sectorReturn20: sector20,
    sectorRelativeStrength20: sectorRs20,
    volumeRatio20: volume20,
    realizedVol20: vol20
  };

  const reversionBase = 48
    + clamp(-(sma25Deviation ?? 0) * 2.0, -25, 35)
    + clamp((45 - (rsi14 ?? 45)) * 0.75, -18, 18)
    + clamp((50 - (deviationPercentile ?? 50)) * 0.35, -15, 15)
    + clamp((volume20 - 1) * 8, -6, 10);

  const momentumBase = 50
    + clamp(stock20 * 0.7, -22, 22)
    + clamp(stock60 * 0.35, -18, 18)
    + clamp(rs20 * 1.0, -18, 18);

  const industryBase = 50
    + clamp(sector20 * 1.0, -20, 20)
    + clamp(sectorRs20 * 1.4, -22, 22);

  const riskBase = 92
    - clamp(vol20 * 0.55, 0, 45)
    - clamp(atrPct * 4.5, 0, 30)
    + (market >= 60 ? 5 : 0);

  const scores = {
    Market: market,
    Industry: score(industryBase),
    Momentum: score(momentumBase),
    Reversion: score(reversionBase),
    Catalyst: score(meta.catalyst ?? 50),
    Quality: score(meta.quality ?? 50),
    Value: score(meta.value ?? 50),
    Risk: score(riskBase)
  };

  const state = deriveStatus({ meta, metrics, scores });
  const plan = tradePlan(currentPrice, atr14, state.status);
  const confidence = score(
    scores.Market * 0.12 + scores.Industry * 0.13 + scores.Momentum * 0.12 +
    scores.Reversion * 0.17 + scores.Catalyst * 0.14 + scores.Quality * 0.13 +
    scores.Value * 0.07 + scores.Risk * 0.12
  );

  return {
    ticker,
    status: state.status,
    statusLabel: state.label,
    confidence,
    strategy: strategyName(scores),
    price: Number(currentPrice.toFixed(currentPrice >= 100 ? 0 : 2)),
    hold: meta.held ? '수주–수개월' : '5–40일',
    entry: plan.entryText,
    stop: state.status === 'RED' ? '사업 논리 훼손' : `< $${plan.stop}`,
    targets: plan.targets.map((target) => `$${target}`),
    thesis: meta.thesis,
    scores,
    metrics,
    plan,
    eventDays: meta.eventDays
  };
}

export function scanUniverse({ market, meta }) {
  return Object.entries(market.stocks).map(([ticker, bars]) => {
    const stockMeta = meta[ticker];
    return analyzeCandidate({
      ticker,
      bars,
      benchmarkBars: market.benchmark,
      sectorBars: market.sectors[stockMeta.sector],
      meta: stockMeta
    });
  });
}
