import { analyzeCandidate } from './market/scanner.js';

const STORAGE_KEY = 'atlas.customTickers.v1';
const MAX_CUSTOM_TICKERS = 10;
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

const statusCopy = {
  GREEN: { label: '진입 검토', action: '분할매수를 검토할 수 있어요' },
  BLUE: { label: '하락 관찰', action: '지금은 반등 확인을 기다려요' },
  YELLOW: { label: '가격 대기', action: '좋은 가격이 올 때까지 기다려요' },
  PURPLE: { label: '이벤트 주의', action: '이벤트 확인 뒤 판단해요' },
  RED: { label: '보유 판단', action: '추가매수보다 보유 이유를 먼저 봐요' },
  GRAY: { label: '제외', action: '지금은 매수 후보에서 제외해요' }
};

const scoreLabels = {
  Market: '시장',
  Industry: '시장 대비 흐름',
  Momentum: '상승 흐름',
  Reversion: '눌림 매력',
  Catalyst: '이벤트·재료',
  Quality: '기업 체력',
  Value: '가격 매력',
  Risk: '위험 안정성'
};

let spyBarsPromise;
let mounted = false;
let tickers = readTickers();
const analyses = new Map();
const errors = new Map();
const loading = new Set();

function readTickers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? [...new Set(parsed.map((value) => String(value).trim().toUpperCase()).filter((value) => SYMBOL_PATTERN.test(value)))].slice(0, MAX_CUSTOM_TICKERS)
      : [];
  } catch {
    return [];
  }
}

function saveTickers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
}

async function fetchBars(symbol) {
  const url = new URL('/api/bars', window.location.origin);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('days', '220');
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${symbol} 데이터를 불러오지 못했습니다.`);
  if (!Array.isArray(payload.bars) || payload.bars.length < 60) throw new Error(`${symbol}의 분석 가능한 가격 기록이 부족합니다.`);
  return payload.bars;
}

function getSpyBars() {
  if (!spyBarsPromise) spyBarsPromise = fetchBars('SPY').catch((error) => {
    spyBarsPromise = null;
    throw error;
  });
  return spyBarsPromise;
}

function topReasons(stock) {
  return Object.entries(stock.scores || {})
    .filter(([key]) => !['Risk', 'Catalyst', 'Quality', 'Value'].includes(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, value]) => `${scoreLabels[key] || key} ${value}`);
}

function riskLabel(value) {
  if (value >= 70) return '낮은 편';
  if (value >= 55) return '보통';
  if (value >= 40) return '높은 편';
  return '매우 높음';
}

async function analyzeTicker(ticker) {
  loading.add(ticker);
  errors.delete(ticker);
  renderCards();
  try {
    const [bars, benchmarkBars] = await Promise.all([fetchBars(ticker), getSpyBars()]);
    const stock = analyzeCandidate({
      ticker,
      bars,
      benchmarkBars,
      sectorBars: benchmarkBars,
      meta: {
        sector: 'CUSTOM',
        held: false,
        catalyst: 50,
        quality: 50,
        value: 50,
        eventDays: 99,
        thesis: '사용자가 직접 추가한 종목입니다. 현재 ATLAS는 가격·거래량 기반 기술 신호를 계산하며, 실적·밸류에이션·뉴스 점수는 아직 중립값으로 둡니다.'
      }
    });
    analyses.set(ticker, stock);
  } catch (error) {
    analyses.delete(ticker);
    errors.set(ticker, error instanceof Error ? error.message : '분석에 실패했습니다.');
  } finally {
    loading.delete(ticker);
    renderCards();
  }
}

function renderCards() {
  const grid = document.querySelector('#customStockGrid');
  const count = document.querySelector('#customStockCount');
  if (!grid) return;
  if (count) count.textContent = `${tickers.length}/${MAX_CUSTOM_TICKERS}`;

  if (!tickers.length) {
    grid.innerHTML = '<div class="custom-empty"><strong>아직 추가한 종목이 없어요.</strong><span>AAPL, NVDA, GOOGL처럼 미국주식 티커를 입력해보세요.</span></div>';
    return;
  }

  grid.innerHTML = tickers.map((ticker) => {
    if (loading.has(ticker)) {
      return `<article class="custom-stock-card is-loading"><div class="custom-stock-head"><strong>${ticker}</strong><button type="button" data-remove="${ticker}" aria-label="${ticker} 삭제">×</button></div><p>실제 가격 데이터를 불러와 분석 중…</p></article>`;
    }
    const error = errors.get(ticker);
    if (error) {
      return `<article class="custom-stock-card is-error"><div class="custom-stock-head"><strong>${ticker}</strong><button type="button" data-remove="${ticker}" aria-label="${ticker} 삭제">×</button></div><p>${error}</p><button class="custom-retry" type="button" data-retry="${ticker}">다시 분석</button></article>`;
    }
    const stock = analyses.get(ticker);
    if (!stock) {
      return `<article class="custom-stock-card"><div class="custom-stock-head"><strong>${ticker}</strong><button type="button" data-remove="${ticker}" aria-label="${ticker} 삭제">×</button></div><button class="custom-retry" type="button" data-retry="${ticker}">분석 시작</button></article>`;
    }
    const copy = statusCopy[stock.status] || statusCopy.YELLOW;
    const reasons = topReasons(stock);
    return `
      <article class="custom-stock-card">
        <div class="custom-stock-head">
          <div><strong>${ticker}</strong><span class="status status-${String(stock.status).toLowerCase()}">${copy.label}</span></div>
          <button type="button" data-remove="${ticker}" aria-label="${ticker} 삭제">×</button>
        </div>
        <div class="custom-stock-price"><span>현재가</span><strong>$${stock.price}</strong></div>
        <h3>${copy.action}</h3>
        <div class="custom-reasons">${reasons.map((reason) => `<span>${reason}</span>`).join('')}</div>
        <div class="custom-plan">
          <div><span>매수 검토</span><strong>${stock.entry}</strong></div>
          <div><span>틀렸다고 볼 가격</span><strong>${stock.stop}</strong></div>
          <div><span>위험</span><strong>${riskLabel(stock.scores.Risk)}</strong></div>
        </div>
        <details>
          <summary>세부 점수 보기</summary>
          <div class="custom-score-list">${Object.entries(stock.scores).map(([key, value]) => `<span><b>${scoreLabels[key] || key}</b>${value}</span>`).join('')}</div>
          <p>기업가치·실적·뉴스 점수는 현재 중립값(50)입니다. 기술적 분석만으로 투자 결정을 확정하지 마세요.</p>
        </details>
      </article>`;
  }).join('');

  grid.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => removeTicker(button.dataset.remove)));
  grid.querySelectorAll('[data-retry]').forEach((button) => button.addEventListener('click', () => analyzeTicker(button.dataset.retry)));
}

function setMessage(text, isError = false) {
  const message = document.querySelector('#customStockMessage');
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('error', isError);
}

async function addTicker(raw) {
  const ticker = String(raw || '').trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(ticker)) {
    setMessage('영문 티커를 입력해주세요. 예: AAPL, NVDA, BRK.B', true);
    return;
  }
  if (tickers.includes(ticker)) {
    setMessage(`${ticker}는 이미 추가되어 있어요.`, true);
    return;
  }
  if (tickers.length >= MAX_CUSTOM_TICKERS) {
    setMessage(`직접 추가 종목은 최대 ${MAX_CUSTOM_TICKERS}개까지 저장할 수 있어요.`, true);
    return;
  }
  tickers = [ticker, ...tickers];
  saveTickers();
  renderCards();
  setMessage(`${ticker}를 추가했습니다. LIVE 가격으로 분석합니다.`);
  await analyzeTicker(ticker);
}

function removeTicker(ticker) {
  tickers = tickers.filter((item) => item !== ticker);
  analyses.delete(ticker);
  errors.delete(ticker);
  loading.delete(ticker);
  saveTickers();
  renderCards();
  setMessage(`${ticker}를 목록에서 삭제했습니다.`);
}

function mount() {
  if (mounted) return;
  const setups = document.querySelector('.setups-panel');
  if (!setups) {
    requestAnimationFrame(mount);
    return;
  }
  mounted = true;
  const section = document.createElement('section');
  section.className = 'panel custom-stocks-panel';
  section.innerHTML = `
    <div class="custom-stocks-header">
      <div>
        <p class="eyebrow">내가 직접 보는 종목</p>
        <h2>원하는 미국주식을 추가해보세요</h2>
        <p class="section-help">티커를 입력하면 실제 가격·거래량을 불러와 ATLAS 기술 신호로 분석합니다.</p>
      </div>
      <span id="customStockCount" class="signal-chip">0/${MAX_CUSTOM_TICKERS}</span>
    </div>
    <form id="customStockForm" class="custom-stock-form">
      <label for="customTickerInput">주식 티커</label>
      <div><input id="customTickerInput" type="text" inputmode="latin" autocomplete="off" maxlength="10" placeholder="예: AAPL, NVDA, GOOGL" aria-label="추가할 미국주식 티커"><button class="primary-btn" type="submit">종목 추가</button></div>
      <p id="customStockMessage" class="custom-stock-message">추가한 종목은 이 브라우저에 저장됩니다.</p>
    </form>
    <div id="customStockGrid" class="custom-stock-grid"></div>
  `;
  setups.parentNode.insertBefore(section, setups);

  const form = section.querySelector('#customStockForm');
  const input = section.querySelector('#customTickerInput');
  input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9.-]/g, ''); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    await addTicker(value);
  });

  renderCards();
  tickers.forEach((ticker) => analyzeTicker(ticker));
}

mount();
