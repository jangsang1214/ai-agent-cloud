import { demoMarket, demoMeta } from './market/demoSeries.js';
import { scanUniverse } from './market/scanner.js';

export const stocks = scanUniverse({ market: demoMarket, meta: demoMeta });

export const statusMeta = {
  GREEN: { label: '매수 후보', tone: 'green' },
  BLUE: { label: '하락 관찰', tone: 'blue' },
  YELLOW: { label: '가격 대기', tone: 'yellow' },
  PURPLE: { label: '이벤트', tone: 'purple' },
  RED: { label: '보유 중', tone: 'red' }
};

export const dataSourceMeta = {
  mode: 'DEMO-COMPUTED',
  description: '재현 가능한 synthetic OHLCV에서 지표와 전략 점수를 실시간 계산합니다.',
  liveConnected: false
};
