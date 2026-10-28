import { scanUniverse } from './scanner.js';

const config = {
  LRCX: { sector:'SEMI', sectorSymbol:'SOXX', held:false, thesis:'반도체 장비주. 라이브 모드에서는 가격·거래량 기반 신호만 실시간 계산.' },
  IONQ: { sector:'QUANTUM', sectorSymbol:'QTUM', held:true, thesis:'양자컴퓨팅 고변동 포지션. 라이브 모드에서는 가격·거래량 기반 신호만 실시간 계산.' },
  PWR: { sector:'POWER', sectorSymbol:'PAVE', held:false, thesis:'전력·인프라 후보. 라이브 모드에서는 가격·거래량 기반 신호만 실시간 계산.' },
  VRT: { sector:'POWER', sectorSymbol:'PAVE', held:false, thesis:'데이터센터 전력·냉각 후보. 라이브 모드에서는 가격·거래량 기반 신호만 실시간 계산.' },
  FIX: { sector:'POWER', sectorSymbol:'PAVE', held:false, thesis:'데이터센터·기계설비 인프라 후보. 라이브 모드에서는 가격·거래량 기반 신호만 실시간 계산.' }
};

async function fetchBars(symbol, days = 220) {
  const url = new URL('/api/bars', window.location.origin);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('days', String(days));
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Failed to load ${symbol}`);
  if (!Array.isArray(payload.bars) || payload.bars.length < 60) throw new Error(`Not enough bars for ${symbol}`);
  return payload.bars;
}

export async function loadLiveUniverse({ days = 220 } = {}) {
  const stockSymbols = Object.keys(config);
  const sectorSymbols = [...new Set(Object.values(config).map((item) => item.sectorSymbol))];
  const symbols = [...new Set(['SPY', ...sectorSymbols, ...stockSymbols])];
  const pairs = await Promise.all(symbols.map(async (symbol) => [symbol, await fetchBars(symbol, days)]));
  const barsBySymbol = Object.fromEntries(pairs);

  const market = {
    benchmark: barsBySymbol.SPY,
    sectors: {
      SEMI: barsBySymbol.SOXX,
      QUANTUM: barsBySymbol.QTUM,
      POWER: barsBySymbol.PAVE
    },
    stocks: Object.fromEntries(stockSymbols.map((ticker) => [ticker, barsBySymbol[ticker]]))
  };

  // Fundamental/catalyst layers are intentionally neutral until point-in-time
  // fundamentals, earnings and news adapters are connected. This prevents
  // stale qualitative demo scores from masquerading as live information.
  const meta = Object.fromEntries(Object.entries(config).map(([ticker, item]) => [ticker, {
    sector: item.sector,
    held: item.held,
    catalyst: 50,
    quality: 50,
    value: 50,
    eventDays: 99,
    thesis: item.thesis
  }]));

  return {
    stocks: scanUniverse({ market, meta }),
    source: 'MASSIVE-LIVE-TECHNICAL',
    caveat: 'Price/volume technicals are live. Catalyst, Quality and Value are neutral placeholders (50) until their live adapters are connected.'
  };
}
