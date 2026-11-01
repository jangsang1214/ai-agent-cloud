import './styles.css';
import './v02.css';
import { stocks as demoStocks, statusMeta, dataSourceMeta } from './data.js';
import { adjustedScore, compareSetup, portfolioStats, rankStocks } from './engine.js';
import { loadLiveUniverse } from './market/liveUniverse.js';

const app = document.querySelector('#app');

const state = {
  universe: [...demoStocks],
  selected: demoStocks[0],
  filter: 'ALL',
  riskMode: 'balanced',
  portfolio: { total: 1100, qld: 250, ionq: 80 },
  compareOpen: false,
  expertMode: false,
  dataMode: 'demo',
  loadingLive: false,
  sourceMessage: dataSourceMeta.description,
  sourceError: ''
};

const statusGuide = {
  GREEN: {
    label: '진입 검토',
    action: '분할매수를 검토할 수 있어요',
    summary: '현재 가격과 흐름이 ATLAS 조건에 비교적 잘 맞습니다.',
    caution: '한 번에 전액 매수하기보다 나눠서 접근하세요.'
  },
  BLUE: {
    label: '하락 관찰',
    action: '지금은 기다리는 편이 나아요',
    summary: '가격이 많이 밀렸지만 아직 하락이 끝났다고 보기 어렵습니다.',
    caution: '싸 보인다는 이유만으로 바로 매수하지 마세요.'
  },
  YELLOW: {
    label: '가격 대기',
    action: '좋은 후보지만 가격을 더 기다려요',
    summary: '종목이나 흐름은 괜찮지만 지금 가격은 서두를 구간이 아닙니다.',
    caution: '놓칠까 봐 추격매수하는 상황을 피하세요.'
  },
  PURPLE: {
    label: '이벤트 주의',
    action: '발표 전후 변동을 확인한 뒤 판단해요',
    summary: '실적·이벤트처럼 가격을 크게 흔들 수 있는 변수가 가까이 있습니다.',
    caution: '결과 발표 직전에는 예상보다 큰 변동이 나올 수 있습니다.'
  },
  RED: {
    label: '보유 판단',
    action: '추가매수보다 보유 이유를 먼저 점검해요',
    summary: '현재 보유 종목으로 분류되어 신규 진입보다 보유 논리를 먼저 봅니다.',
    caution: '평단을 낮추기 위한 기계적인 추가매수는 피하세요.'
  },
  GRAY: {
    label: '제외',
    action: '지금은 매수 후보에서 제외해요',
    summary: '현재 조건에서는 투자 논리가 충분하지 않습니다.',
    caution: '조건이 다시 좋아질 때까지 관찰만 하는 편이 낫습니다.'
  }
};

const scoreLabels = {
  Market: ['시장 분위기', '전체 시장이 이 종목을 도와주는지'],
  Industry: ['업종 흐름', '같은 업종에 돈이 들어오는지'],
  Momentum: ['상승 흐름', '최근 주가 힘이 이어지는지'],
  Reversion: ['눌림 매력', '과하게 빠진 뒤 반등 여지가 있는지'],
  Catalyst: ['이벤트·재료', '실적·계약 같은 촉매가 있는지'],
  Quality: ['기업 체력', '사업과 재무의 기본 체력이 괜찮은지'],
  Value: ['가격 매력', '현재 가격 부담이 상대적으로 낮은지'],
  Risk: ['위험 안정성', '흔들림과 하방 위험이 감당 가능한지']
};

const statusClass = (status) => `status status-${String(status).toLowerCase()}`;
const money = (v) => `${Math.round(v).toLocaleString('ko-KR')}만원`;
const num = (value, digits = 1) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
const signed = (value, digits = 1) => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${Number(value).toFixed(digits)}%` : '—';
const guideFor = (status) => statusGuide[status] || statusGuide.YELLOW;

function scoreStrength(value) {
  if (value >= 75) return '매우 강함';
  if (value >= 65) return '강함';
  if (value >= 55) return '괜찮음';
  if (value >= 45) return '보통';
  return '약함';
}

function confidenceText(value) {
  if (value >= 75) return '근거가 강한 편';
  if (value >= 60) return '근거가 괜찮은 편';
  if (value >= 45) return '조금 더 확인 필요';
  return '근거가 약한 편';
}

function riskText(value) {
  if (value >= 70) return '위험 낮은 편';
  if (value >= 55) return '위험 보통';
  if (value >= 40) return '위험 높은 편';
  return '위험 매우 높음';
}

function marketGuide(score) {
  if (score >= 68) return {
    label: '시장 분위기 좋음',
    action: '좋은 종목은 적극적으로 볼 수 있는 장세예요.',
    note: '그래도 아무 종목이나 사기보다 강한 업종과 좋은 진입가를 골라야 합니다.'
  };
  if (score >= 52) return {
    label: '선별 장세',
    action: '지금은 종목을 잘 골라야 하는 시장이에요.',
    note: '시장 전체보다 개별 종목·업종 차이가 커서 추격매수는 피하는 편이 좋습니다.'
  };
  return {
    label: '방어가 우선',
    action: '지금은 수익보다 손실 관리가 더 중요한 시장이에요.',
    note: '현금 여유를 두고 확실한 후보만 천천히 보는 편이 유리합니다.'
  };
}

function topReasons(stock, limit = 3) {
  return Object.entries(stock.scores || {})
    .filter(([key]) => key !== 'Risk')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      label: scoreLabels[key]?.[0] || key,
      help: scoreLabels[key]?.[1] || '',
      value,
      strength: scoreStrength(value)
    }));
}

function shell() {
  app.innerHTML = `
    <div class="app-shell beginner-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">A</div>
          <div><strong>ATLAS</strong><span>TRADING OS</span></div>
        </div>
        <nav class="nav-list" aria-label="Primary">
          <button class="nav-item active">한눈에 보기</button>
          <button class="nav-item" disabled title="Coming next">전체 종목 찾기</button>
          <button class="nav-item" disabled title="Coming next">백테스트</button>
          <button class="nav-item" disabled title="Coming next">내 포트폴리오</button>
        </nav>
        <div class="side-note">
          <span>ATLAS 원칙</span>
          <strong>결론보다 근거</strong>
          <small>신호 · 가격 · 위험을 함께 봅니다</small>
        </div>
      </aside>

      <main class="workspace">
        <header class="topbar beginner-topbar">
          <div>
            <p class="eyebrow">미국주식 의사결정 도우미</p>
            <h1>그래서 지금, 뭘 하면 돼?</h1>
            <p class="top-intro">복잡한 지표는 뒤로 숨기고, 먼저 행동과 이유를 보여줍니다.</p>
          </div>
          <div class="top-actions">
            <button id="expertModeBtn" class="ghost-btn mode-btn" type="button">전문가 보기</button>
            <button id="dataModeBtn" class="live-dot data-button" type="button" aria-label="데이터 모드 전환"><i></i><span id="dataModeLabel">연습 데이터</span></button>
            <button id="resetBtn" class="ghost-btn">초기화</button>
          </div>
        </header>
        <div id="systemMessage" class="system-message" aria-live="polite"></div>

        <section class="panel market-guide-panel">
          <div class="market-guide-copy">
            <p class="eyebrow">1. 오늘 시장부터 보기</p>
            <div class="market-title-row">
              <h2 id="regimeLabel">선별 장세</h2>
              <span id="regimeScore" class="signal-chip expert-inline">— / 100</span>
            </div>
            <p id="marketAction" class="market-action"></p>
            <p id="marketNote" class="muted"></p>
          </div>
          <div class="market-simple-stats">
            <div><span>오늘 볼 후보</span><strong id="universeSize">—</strong><small>개 종목</small></div>
            <div><span>평균 위험</span><strong id="avgRiskText">—</strong><small id="avgRisk" class="expert-inline">— / 100</small></div>
            <div><span>데이터</span><strong id="sourceMode">연습</strong><small>버튼으로 전환</small></div>
          </div>
          <div class="advanced-zone market-advanced">
            <div class="regime-grid">
              <div><span>Market score</span><strong id="marketScore">—</strong><small>SPY trend</small></div>
              <div><span>Universe</span><strong id="expertUniverseSize">—</strong><small>Active candidates</small></div>
              <div><span>Avg risk</span><strong id="expertAvgRisk">—</strong><small>Higher = safer</small></div>
              <div><span>Source</span><strong id="expertSourceMode">DEMO</strong><small>Data layer</small></div>
            </div>
            <div class="engine-pills">
              <span>Mean Reversion</span><span>Momentum</span><span>Industry</span><span>Catalyst</span><span>Value + Quality</span><span>Risk</span>
            </div>
          </div>
        </section>

        <section class="panel setups-panel beginner-setups">
          <div class="section-row">
            <div>
              <p class="eyebrow">2. 오늘 먼저 볼 종목</p>
              <h2>복잡한 숫자보다 ‘지금 상태’를 먼저 보세요</h2>
              <p class="section-help">종목을 누르면 아래에서 왜 이런 판단이 나왔는지 쉽게 설명합니다.</p>
            </div>
            <div class="filters" id="filters"></div>
          </div>
          <div id="candidateGrid" class="candidate-grid beginner-candidates"></div>
        </section>

        <section class="panel setup-detail beginner-decision" id="setupDetail"></section>

        <section class="panel score-panel advanced-zone">
          <div class="section-row compact">
            <div>
              <p class="eyebrow">전문가 보기</p>
              <h2>전략 점수 분해</h2>
              <p class="section-help">점수는 매수 명령이 아니라 여러 근거를 한 기준으로 비교하기 위한 값입니다.</p>
            </div>
            <label class="select-label">위험 성향
              <select id="riskMode">
                <option value="balanced">균형형</option>
                <option value="aggressive">공격형</option>
                <option value="conservative">보수형</option>
              </select>
            </label>
          </div>
          <div id="scoreBars" class="score-bars"></div>
          <div id="riskAdjusted" class="risk-adjusted"></div>
        </section>

        <section class="panel allocation-panel beginner-portfolio">
          <div class="section-row">
            <div>
              <p class="eyebrow">3. 내 돈에 대입해보기</p>
              <h2>얼마를 투자하고, 얼마를 남겨둘까?</h2>
              <p class="section-help">숫자를 바꿔보며 현재 투자 비중이 과한지 가볍게 확인하세요.</p>
            </div>
          </div>
          <div class="input-grid">
            <label>전체 투자 가능 금액<input id="totalAssets" type="number" min="1" value="1100"><small>만원 단위</small></label>
            <label>QLD에 넣은 금액<input id="qldAssets" type="number" min="0" value="250"><small>만원 단위</small></label>
            <label>IONQ에 넣은 금액<input id="ionqAssets" type="number" min="0" value="80"><small>만원 단위</small></label>
          </div>
          <div id="allocationStats" class="allocation-stats"></div>
          <div class="progress-track"><div id="allocationBar" class="progress-fill"></div></div>
          <p id="allocationNote" class="microcopy"></p>
        </section>

        <section class="panel decision-panel beginner-compare">
          <div class="decision-copy">
            <p class="eyebrow">4. 다른 선택지와 비교</p>
            <h2>이 종목이 정말 더 나은 선택일까?</h2>
            <p id="decisionText" class="muted"></p>
          </div>
          <button id="compareBtn" class="primary-btn">IONQ와 비교</button>
          <div id="comparePanel" class="compare-panel" hidden></div>
        </section>

        <section class="beginner-legend">
          <p class="eyebrow">색깔만 기억해도 됩니다</p>
          <div class="legend-grid">
            <div><span class="status status-green">진입 검토</span><p>조건이 좋아져 매수를 검토할 수 있음</p></div>
            <div><span class="status status-yellow">가격 대기</span><p>종목은 괜찮지만 가격을 더 기다림</p></div>
            <div><span class="status status-blue">하락 관찰</span><p>싸 보여도 하락이 끝났는지 확인 필요</p></div>
            <div><span class="status status-purple">이벤트 주의</span><p>발표 전후 큰 변동 가능성</p></div>
            <div><span class="status status-red">보유 판단</span><p>신규 진입보다 보유 이유를 먼저 점검</p></div>
          </div>
        </section>

        <footer>
          <span>ATLAS · 판단을 대신하지 않고 근거를 정리합니다</span>
          <span id="footerSource">연습용 가격 데이터 · 계산 지표</span>
        </footer>
      </main>
    </div>
  `;
}

function renderExperienceMode() {
  app.classList.toggle('expert-mode', state.expertMode);
  const button = document.querySelector('#expertModeBtn');
  if (button) button.textContent = state.expertMode ? '초보자 보기' : '전문가 보기';
}

function renderDataMode() {
  const button = document.querySelector('#dataModeBtn');
  const label = document.querySelector('#dataModeLabel');
  const message = document.querySelector('#systemMessage');
  const live = state.dataMode === 'live';
  button.disabled = state.loadingLive;
  label.textContent = state.loadingLive ? '불러오는 중…' : live ? '실시간 기술지표' : '연습 데이터';
  button.classList.toggle('is-live', live);
  document.querySelector('#sourceMode').textContent = live ? '실시간' : '연습';
  document.querySelector('#expertSourceMode').textContent = live ? 'LIVE' : 'DEMO';
  document.querySelector('#footerSource').textContent = live
    ? 'Massive 가격·거래량 · 기술지표 실시간 계산'
    : '연습용 가격 데이터 · 계산 지표';
  message.classList.toggle('error', Boolean(state.sourceError));
  message.textContent = state.sourceError || (live
    ? '실제 가격·거래량 기반 기술지표입니다. 기업가치·실적 데이터는 아직 중립값으로 처리됩니다.'
    : '현재는 화면 구조와 판단 흐름을 익히기 위한 연습 데이터입니다.');
}

function renderMarket() {
  const universe = state.universe;
  const market = universe[0]?.scores?.Market ?? 50;
  const avgRisk = universe.length
    ? universe.reduce((sum, stock) => sum + (stock.scores.Risk ?? 0), 0) / universe.length
    : 0;
  const guide = marketGuide(market);
  document.querySelector('#regimeLabel').textContent = guide.label;
  document.querySelector('#regimeScore').textContent = `${market} / 100`;
  document.querySelector('#marketAction').textContent = guide.action;
  document.querySelector('#marketNote').textContent = guide.note;
  document.querySelector('#marketScore').textContent = market;
  document.querySelector('#universeSize').textContent = universe.length;
  document.querySelector('#expertUniverseSize').textContent = universe.length;
  document.querySelector('#avgRisk').textContent = `${Math.round(avgRisk)} / 100`;
  document.querySelector('#expertAvgRisk').textContent = Math.round(avgRisk);
  document.querySelector('#avgRiskText').textContent = riskText(avgRisk).replace('위험 ', '');
}

function renderFilters() {
  const filters = document.querySelector('#filters');
  const items = [['ALL', '전체'], ...Object.keys(statusMeta).map(key => [key, guideFor(key).label])];
  filters.innerHTML = items.map(([key, label]) => `<button class="filter-btn ${state.filter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('');
  filters.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    renderFilters();
    renderCandidates();
  }));
}

function renderPortfolio() {
  const stats = portfolioStats(state.portfolio.total, state.portfolio.qld, state.portfolio.ionq);
  document.querySelector('#allocationStats').innerHTML = `
    <div><span>현재 투자 중</span><strong>${money(stats.invested)}</strong></div>
    <div><span>남아 있는 현금</span><strong>${money(stats.cash)}</strong></div>
    <div><span>투자 비중</span><strong>${stats.investedPct.toFixed(1)}%</strong></div>
  `;
  document.querySelector('#allocationBar').style.width = `${Math.min(100, stats.investedPct)}%`;
  if (stats.overAllocated) {
    document.querySelector('#allocationNote').textContent = '⚠️ 입력한 투자 금액이 전체 투자 가능 금액보다 큽니다.';
  } else if (stats.investedPct >= 80) {
    document.querySelector('#allocationNote').textContent = '현금 여유가 적은 편입니다. 추가 기회나 하락에 대응할 여유도 함께 생각해보세요.';
  } else {
    document.querySelector('#allocationNote').textContent = '현금을 남겨두면 하락이나 새로운 기회가 왔을 때 대응하기 쉬워집니다.';
  }
}

function renderCandidates() {
  const grid = document.querySelector('#candidateGrid');
  const ranked = rankStocks(state.universe, state.riskMode).filter(s => state.filter === 'ALL' || s.status === state.filter);
  grid.innerHTML = ranked.map((stock, i) => {
    const guide = guideFor(stock.status);
    const reason = topReasons(stock, 1)[0];
    const appeal = scoreStrength(stock.adjusted);
    return `
      <button class="candidate-card beginner-card ${state.selected?.ticker === stock.ticker ? 'selected' : ''}" data-ticker="${stock.ticker}">
        <div class="beginner-rank">${i + 1}</div>
        <div class="candidate-main">
          <div class="ticker-line"><strong>${stock.ticker}</strong><span class="${statusClass(stock.status)}">${guide.label}</span></div>
          <span class="candidate-action">${guide.action}</span>
          <small>핵심 근거 · ${reason?.label || '종합 조건'} ${reason?.strength || ''}</small>
        </div>
        <div class="candidate-meta beginner-score"><span>매력도</span><strong>${appeal}</strong><small class="expert-inline">${stock.adjusted}/100</small></div>
      </button>
    `;
  }).join('') || `<div class="empty-state">이 조건에 해당하는 후보가 없습니다.</div>`;

  grid.querySelectorAll('.candidate-card').forEach(card => card.addEventListener('click', () => {
    state.selected = state.universe.find(s => s.ticker === card.dataset.ticker) || state.universe[0];
    state.compareOpen = false;
    renderCandidates();
    renderDetail();
    renderScores();
    renderDecision();
  }));
}

function renderDetail() {
  const s = state.selected;
  if (!s) return;
  const m = s.metrics || {};
  const guide = guideFor(s.status);
  const reasons = topReasons(s, 3);
  const risk = s.scores?.Risk ?? 50;
  const firstTarget = s.targets?.[0] ?? '—';

  document.querySelector('#setupDetail').innerHTML = `
    <div class="beginner-detail-head">
      <div>
        <p class="eyebrow">선택한 종목 · ${s.ticker}</p>
        <div class="detail-title-line"><h2>${s.ticker}</h2><span class="${statusClass(s.status)}">${guide.label}</span></div>
        <p class="strategy-sub">ATLAS 전략 · ${s.strategy}</p>
      </div>
      <div class="simple-confidence"><span>판단 근거</span><strong>${confidenceText(s.confidence)}</strong><small class="expert-inline">${s.confidence}/100</small></div>
    </div>

    <div class="action-banner status-surface-${String(s.status).toLowerCase()}">
      <span>지금 어떻게 하면 돼?</span>
      <h3>${guide.action}</h3>
      <p>${guide.summary}</p>
    </div>

    <div class="beginner-reasons">
      <div class="reason-column">
        <p class="mini-title">왜 이렇게 봤어?</p>
        <div class="reason-list">
          ${reasons.map(reason => `
            <div class="reason-item">
              <span class="reason-check">✓</span>
              <div><strong>${reason.label} · ${reason.strength}</strong><p>${reason.help}</p></div>
              <small class="expert-inline">${reason.value}/100</small>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="risk-card">
        <p class="mini-title">가장 먼저 기억할 위험</p>
        <strong>${riskText(risk)}</strong>
        <p>${guide.caution}</p>
        <small class="expert-inline">Risk score ${risk}/100 · 높을수록 안정적</small>
      </div>
    </div>

    <div class="price-plan">
      <div class="price-plan-head">
        <div><p class="mini-title">가격은 이렇게 읽으면 됩니다</p><h3>현재가 $${s.price}</h3></div>
        <span class="plan-note">예측값이 아니라 대응 기준</span>
      </div>
      <div class="plain-trade-grid">
        <div class="plan-card entry"><span>① 매수 검토 구간</span><strong>${s.entry}</strong><p>이 구간에 왔을 때 한 번에 사기보다 나눠서 검토</p></div>
        <div class="plan-card stop"><span>② 틀렸다고 볼 가격</span><strong>${s.stop}</strong><p>이 가격을 깨면 기존 시나리오를 다시 점검</p></div>
        <div class="plan-card target"><span>③ 첫 목표 구간</span><strong>${firstTarget}</strong><p>도달하면 일부 수익 실현이나 보유 판단을 다시 검토</p></div>
      </div>
      <p class="plan-disclaimer">※ ATLAS 가격 구간은 ATR 기반 모델 값이며 수익을 보장하지 않습니다.</p>
    </div>

    <details class="metric-disclosure">
      <summary>숫자까지 보고 싶다면 열어보기 <span>RSI · 평균가격 · 거래량 · 변동성</span></summary>
      <div class="metric-grid beginner-metrics">
        <div><span>최근 과열도 <b>RSI 14</b></span><strong>${num(m.rsi14)}</strong><small>낮을수록 최근 많이 눌렸다는 뜻</small></div>
        <div><span>평균가격과 거리 <b>25D DEV</b></span><strong>${signed(m.sma25Deviation)}</strong><small>25일 평균보다 얼마나 위/아래인지</small></div>
        <div><span>시장보다 강한가 <b>RS vs SPY</b></span><strong>${signed(m.relativeStrength20)}</strong><small>SPY보다 최근 더 강했는지</small></div>
        <div><span>거래량 변화 <b>VOL RATIO</b></span><strong>${num(m.volumeRatio20, 2)}×</strong><small>평소보다 거래가 얼마나 늘었는지</small></div>
        <div><span>하루 흔들림 <b>ATR %</b></span><strong>${num(m.atrPct, 2)}%</strong><small>일반적인 하루 가격 변동 폭</small></div>
        <div><span>최근 변동성 <b>REALIZED VOL</b></span><strong>${num(m.realizedVol20)}%</strong><small>높을수록 가격이 거칠게 움직임</small></div>
      </div>
    </details>

    <div class="thesis-box beginner-thesis"><span>ATLAS가 보는 핵심 논리</span><p>${s.thesis}</p></div>
  `;
}

function renderScores() {
  const s = state.selected;
  if (!s) return;
  document.querySelector('#scoreBars').innerHTML = Object.entries(s.scores).map(([key, value]) => {
    const [label, help] = scoreLabels[key] || [key, ''];
    return `
      <div class="score-row">
        <div class="score-label"><span>${label}<small>${help}</small></span><strong>${value}</strong></div>
        <div class="score-track"><div class="score-fill" style="width:${value}%"></div></div>
      </div>
    `;
  }).join('');
  const score = adjustedScore(s, state.riskMode);
  const modeCopy = {
    balanced: '수익 기회와 하방 위험을 비슷하게 봅니다.',
    aggressive: '상승 흐름·이벤트·반등 가능성 비중을 더 높입니다.',
    conservative: '기업 체력·위험·가격 매력 비중을 더 높입니다.'
  };
  document.querySelector('#riskAdjusted').innerHTML = `<div><span>위험조정 종합점수</span><strong>${score}</strong></div><p>${modeCopy[state.riskMode]}</p>`;
}

function renderDecision() {
  const s = state.selected;
  if (!s) return;
  const ionq = state.universe.find(stock => stock.ticker === 'IONQ');
  const decisionText = document.querySelector('#decisionText');
  decisionText.textContent = s.ticker === 'IONQ'
    ? '현재 보유 종목을 계속 들고 갈지, 오늘 더 좋은 후보가 있는지 같은 기준으로 비교해볼 수 있습니다.'
    : `${s.ticker}를 새로 사는 것과 현재 보유 중인 IONQ를 유지하는 것을 같은 기준으로 비교합니다.`;
  const compareBtn = document.querySelector('#compareBtn');
  compareBtn.disabled = !ionq || state.universe.length < 2;
  compareBtn.textContent = s.ticker === 'IONQ' ? '오늘 1위 후보와 비교' : 'IONQ와 비교';
  renderCompare();
}

function renderCompare() {
  const panel = document.querySelector('#comparePanel');
  if (!state.compareOpen) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }
  const ranked = rankStocks(state.universe, state.riskMode);
  const other = state.selected.ticker === 'IONQ'
    ? ranked.find(stock => stock.ticker !== 'IONQ')
    : state.universe.find(stock => stock.ticker === 'IONQ');
  if (!other) return;
  const compared = compareSetup(state.selected, other);
  panel.hidden = false;
  panel.innerHTML = compared.map(({ stock, upside, downside, rewardRisk }) => `
    <article class="compare-card beginner-compare-card">
      <div class="compare-head"><strong>${stock.ticker}</strong><span class="${statusClass(stock.status)}">${guideFor(stock.status).label}</span></div>
      <p class="compare-action">${guideFor(stock.status).action}</p>
      <div class="compare-metrics">
        <div><span>종합 매력도</span><strong>${scoreStrength(adjustedScore(stock, state.riskMode))}</strong><small class="expert-inline">${adjustedScore(stock, state.riskMode)}</small></div>
        <div><span>2차 목표까지*</span><strong>+${upside}%</strong></div>
        <div><span>무효화 가격까지*</span><strong>-${downside}%</strong></div>
        <div><span>기대손익비*</span><strong>${rewardRisk ?? '—'}</strong></div>
      </div>
    </article>
  `).join('') + `<p class="compare-note">* ATR 기반 모델 값입니다. 실제 수익률이나 손실을 보장하는 숫자가 아닙니다.</p>`;
}

async function toggleDataMode() {
  if (state.loadingLive) return;
  state.sourceError = '';
  if (state.dataMode === 'live') {
    const ticker = state.selected?.ticker;
    state.universe = [...demoStocks];
    state.selected = state.universe.find(stock => stock.ticker === ticker) || state.universe[0];
    state.dataMode = 'demo';
    state.sourceMessage = dataSourceMeta.description;
    renderAll();
    return;
  }

  state.loadingLive = true;
  state.sourceMessage = '실제 가격 데이터를 불러오는 중…';
  renderDataMode();
  try {
    const ticker = state.selected?.ticker;
    const result = await loadLiveUniverse();
    state.universe = result.stocks;
    state.selected = state.universe.find(stock => stock.ticker === ticker) || state.universe[0];
    state.dataMode = 'live';
    state.sourceMessage = result.caveat;
  } catch (error) {
    state.sourceError = error instanceof Error ? error.message : '실시간 데이터를 불러오지 못했습니다.';
    state.sourceMessage = dataSourceMeta.description;
    state.dataMode = 'demo';
    state.universe = [...demoStocks];
    state.selected = state.universe[0];
  } finally {
    state.loadingLive = false;
    renderAll();
  }
}

function bind() {
  ['totalAssets', 'qldAssets', 'ionqAssets'].forEach(id => {
    document.querySelector(`#${id}`).addEventListener('input', (e) => {
      const key = id === 'totalAssets' ? 'total' : id === 'qldAssets' ? 'qld' : 'ionq';
      state.portfolio[key] = Math.max(0, Number(e.target.value) || 0);
      renderPortfolio();
    });
  });

  document.querySelector('#riskMode').addEventListener('change', (e) => {
    state.riskMode = e.target.value;
    renderCandidates();
    renderScores();
    renderDecision();
  });

  document.querySelector('#compareBtn').addEventListener('click', () => {
    state.compareOpen = !state.compareOpen;
    renderCompare();
  });

  document.querySelector('#expertModeBtn').addEventListener('click', () => {
    state.expertMode = !state.expertMode;
    renderExperienceMode();
  });

  document.querySelector('#dataModeBtn').addEventListener('click', toggleDataMode);

  document.querySelector('#resetBtn').addEventListener('click', () => {
    state.selected = state.universe[0];
    state.filter = 'ALL';
    state.riskMode = 'balanced';
    state.portfolio = { total: 1100, qld: 250, ionq: 80 };
    state.compareOpen = false;
    state.expertMode = false;
    document.querySelector('#totalAssets').value = 1100;
    document.querySelector('#qldAssets').value = 250;
    document.querySelector('#ionqAssets').value = 80;
    document.querySelector('#riskMode').value = 'balanced';
    renderAll();
  });
}

function renderAll() {
  if (!state.universe.some(stock => stock.ticker === state.selected?.ticker)) state.selected = state.universe[0];
  renderExperienceMode();
  renderDataMode();
  renderMarket();
  renderFilters();
  renderPortfolio();
  renderCandidates();
  renderDetail();
  renderScores();
  renderDecision();
}

shell();
bind();
renderAll();