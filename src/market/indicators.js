const finite = (v) => Number.isFinite(v);

export const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function sma(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return null;
  const slice = values.slice(-period).filter(finite);
  if (slice.length !== period) return null;
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

export function pctChange(values, lookback) {
  if (!Array.isArray(values) || values.length <= lookback || lookback <= 0) return null;
  const end = values.at(-1);
  const start = values.at(-(lookback + 1));
  if (!finite(end) || !finite(start) || start === 0) return null;
  return ((end / start) - 1) * 100;
}

export function deviationFromSma(values, period) {
  const average = sma(values, period);
  const current = values?.at(-1);
  if (!finite(average) || !finite(current) || average === 0) return null;
  return ((current / average) - 1) * 100;
}

export function rsi(values, period = 14) {
  if (!Array.isArray(values) || values.length <= period) return null;
  const changes = [];
  for (let i = values.length - period; i < values.length; i += 1) {
    const prev = values[i - 1];
    const current = values[i];
    if (!finite(prev) || !finite(current)) return null;
    changes.push(current - prev);
  }
  const gains = changes.reduce((sum, change) => sum + Math.max(change, 0), 0) / period;
  const losses = changes.reduce((sum, change) => sum + Math.max(-change, 0), 0) / period;
  if (losses === 0) return gains === 0 ? 50 : 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

export function trueRange(current, previousClose) {
  if (!current || !finite(current.high) || !finite(current.low)) return null;
  if (!finite(previousClose)) return current.high - current.low;
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previousClose),
    Math.abs(current.low - previousClose)
  );
}

export function atr(bars, period = 14) {
  if (!Array.isArray(bars) || bars.length < period + 1) return null;
  const ranges = [];
  for (let i = bars.length - period; i < bars.length; i += 1) {
    const range = trueRange(bars[i], bars[i - 1]?.close);
    if (!finite(range)) return null;
    ranges.push(range);
  }
  return ranges.reduce((sum, value) => sum + value, 0) / period;
}

export function volumeRatio(bars, period = 20) {
  if (!Array.isArray(bars) || bars.length < period + 1) return null;
  const current = bars.at(-1)?.volume;
  const history = bars.slice(-(period + 1), -1).map((bar) => bar.volume).filter(finite);
  if (!finite(current) || history.length !== period) return null;
  const average = history.reduce((sum, value) => sum + value, 0) / period;
  return average > 0 ? current / average : null;
}

export function realizedVolatility(values, period = 20) {
  if (!Array.isArray(values) || values.length < period + 1) return null;
  const slice = values.slice(-(period + 1));
  const returns = [];
  for (let i = 1; i < slice.length; i += 1) {
    if (slice[i - 1] <= 0 || slice[i] <= 0) return null;
    returns.push(Math.log(slice[i] / slice[i - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function relativeStrength(values, benchmarkValues, lookback = 20) {
  const stockReturn = pctChange(values, lookback);
  const benchmarkReturn = pctChange(benchmarkValues, lookback);
  if (!finite(stockReturn) || !finite(benchmarkReturn)) return null;
  return stockReturn - benchmarkReturn;
}

export function percentileRank(values, current) {
  const clean = (values || []).filter(finite).sort((a, b) => a - b);
  if (!clean.length || !finite(current)) return null;
  const lessOrEqual = clean.filter((value) => value <= current).length;
  return (lessOrEqual / clean.length) * 100;
}

export function rollingDeviations(values, period = 25) {
  if (!Array.isArray(values) || values.length < period) return [];
  const output = [];
  for (let i = period - 1; i < values.length; i += 1) {
    const window = values.slice(i - period + 1, i + 1);
    const average = window.reduce((sum, value) => sum + value, 0) / period;
    output.push(((values[i] / average) - 1) * 100);
  }
  return output;
}
