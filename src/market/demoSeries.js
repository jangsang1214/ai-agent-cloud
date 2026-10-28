function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeries({ key, finalPrice, drift = 0.0007, volatility = 0.018, finalShock = 0, volumeBase = 2_000_000, volumeBoost = 1 }) {
  const random = mulberry32(hashString(key));
  const count = 150;
  const bars = [];
  let close = 100;

  for (let i = 0; i < count; i += 1) {
    const cycle = Math.sin(i / 11) * volatility * 0.25;
    const noise = (random() - 0.5) * volatility * 2;
    const shockWindow = i >= count - 18 ? finalShock / 18 : 0;
    const dailyReturn = drift + cycle + noise + shockWindow;
    const open = close;
    close = Math.max(2, close * (1 + dailyReturn));
    const intraday = Math.max(0.004, volatility * (0.55 + random() * 0.7));
    const high = Math.max(open, close) * (1 + intraday * random());
    const low = Math.min(open, close) * (1 - intraday * random());
    const volume = Math.round(volumeBase * (0.75 + random() * 0.6) * (i === count - 1 ? volumeBoost : 1));
    bars.push({ index: i, open, high, low, close, volume });
  }

  const scale = finalPrice / bars.at(-1).close;
  return bars.map((bar) => ({
    ...bar,
    open: bar.open * scale,
    high: bar.high * scale,
    low: bar.low * scale,
    close: bar.close * scale
  }));
}

export const demoMarket = {
  benchmark: generateSeries({ key:'SPY', finalPrice:772, drift:0.00065, volatility:0.009, finalShock:0.015, volumeBase:75_000_000 }),
  sectors: {
    SEMI: generateSeries({ key:'SOXX', finalPrice:410, drift:0.00095, volatility:0.014, finalShock:-0.035, volumeBase:8_500_000 }),
    POWER: generateSeries({ key:'POWER', finalPrice:255, drift:0.0009, volatility:0.012, finalShock:-0.018, volumeBase:5_500_000 }),
    QUANTUM: generateSeries({ key:'QUANTUM', finalPrice:125, drift:0.0011, volatility:0.026, finalShock:-0.07, volumeBase:12_000_000 })
  },
  stocks: {
    LRCX: generateSeries({ key:'LRCX', finalPrice:241, drift:0.0011, volatility:0.021, finalShock:-0.18, volumeBase:9_500_000, volumeBoost:1.7 }),
    IONQ: generateSeries({ key:'IONQ', finalPrice:33, drift:0.0016, volatility:0.041, finalShock:-0.12, volumeBase:23_000_000, volumeBoost:1.4 }),
    PWR: generateSeries({ key:'PWR', finalPrice:579, drift:0.00105, volatility:0.018, finalShock:-0.08, volumeBase:2_700_000, volumeBoost:1.3 }),
    VRT: generateSeries({ key:'VRT', finalPrice:209, drift:0.00125, volatility:0.026, finalShock:-0.065, volumeBase:7_800_000, volumeBoost:1.8 }),
    FIX: generateSeries({ key:'FIX', finalPrice:915, drift:0.00115, volatility:0.024, finalShock:-0.14, volumeBase:850_000, volumeBoost:1.5 })
  }
};

export const demoMeta = {
  LRCX: {
    sector:'SEMI', held:false, catalyst:76, quality:91, value:62, eventDays:14,
    thesis:'강한 반도체 업종 안에서 큰 조정이 나온 뒤 평균회귀 가능성을 보는 Quality Mean Reversion 후보.'
  },
  IONQ: {
    sector:'QUANTUM', held:true, catalyst:91, quality:44, value:19, eventDays:8,
    thesis:'양자컴퓨팅·정부계약·기술 로드맵을 촉매로 보는 고변동 성장 포지션.'
  },
  PWR: {
    sector:'POWER', held:false, catalyst:88, quality:86, value:54, eventDays:1,
    thesis:'전력망·데이터센터 인프라 수요가 핵심. 실적 이벤트 확인 전에는 이벤트 리스크를 우선.'
  },
  VRT: {
    sector:'POWER', held:false, catalyst:90, quality:78, value:43, eventDays:0,
    thesis:'AI 데이터센터 전력·냉각 테마의 산업 모멘텀 후보. 실적 직후 방향 확인이 중요.'
  },
  FIX: {
    sector:'POWER', held:false, catalyst:72, quality:93, value:48, eventDays:20,
    thesis:'펀더멘털은 강하지만 급락 뒤 변동성 진정과 저점 형성을 확인하는 Quality Pullback 후보.'
  }
};
