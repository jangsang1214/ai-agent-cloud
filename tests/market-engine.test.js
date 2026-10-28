import test from 'node:test';
import assert from 'node:assert/strict';
import { atr, deviationFromSma, pctChange, rsi, sma } from '../src/market/indicators.js';
import { demoMarket, demoMeta } from '../src/market/demoSeries.js';
import { marketRegimeScore, scanUniverse } from '../src/market/scanner.js';

test('basic indicators produce deterministic values', () => {
  assert.equal(sma([1, 2, 3, 4, 5], 3), 4);
  assert.equal(pctChange([100, 105, 110], 2), 10);
  assert.equal(rsi([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 14), 100);
  assert.ok(Math.abs(deviationFromSma([10, 10, 10, 12], 4) - 14.2857142857) < 1e-8);
});

test('ATR stays positive for valid OHLC bars', () => {
  const bars = Array.from({ length: 20 }, (_, i) => ({
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000
  }));
  assert.ok(atr(bars, 14) > 0);
});

test('market regime score is bounded', () => {
  const score = marketRegimeScore(demoMarket.benchmark);
  assert.ok(score >= 0 && score <= 100);
});

test('scanner converts OHLCV into ranked-ready candidates', () => {
  const candidates = scanUniverse({ market: demoMarket, meta: demoMeta });
  assert.equal(candidates.length, 5);
  for (const candidate of candidates) {
    assert.ok(candidate.price > 0);
    assert.ok(candidate.confidence >= 0 && candidate.confidence <= 100);
    assert.ok(['RED','GREEN','BLUE','YELLOW','PURPLE'].includes(candidate.status));
    assert.ok(Number.isFinite(candidate.metrics.rsi14));
    assert.ok(Number.isFinite(candidate.metrics.atr14));
    assert.equal(candidate.targets.length, 3);
    for (const value of Object.values(candidate.scores)) {
      assert.ok(value >= 0 && value <= 100);
    }
  }
});
