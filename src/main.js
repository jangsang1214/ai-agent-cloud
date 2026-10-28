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
  dataMode: 'demo',
  loadingLive: false,
  sourceMessage: dataSourceMeta.description,
  sourceError: ''
};

const statusClass = (status) => `status status-${String(status).toLowerCase()}`;
const money = (v) => `${Math.round(v).toLocaleString('ko-KR')}만원`;
const num = (value, digits = 1) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
const signed = (value, digits = 1) => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${Number(value).toFixed(digits)}%` : '—';

function shell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">A</div>
          <div><strong>ATLAS</strong><span>TRADING OS</span></div>
        </div>
        <nav class="nav-list" aria-label="Primary">
          <button class="nav-item active">Overview</button>
          <button class="nav-item" disabled title="Coming next">Scanner</button>
          <button class="nav-item" disabled title="Coming next">Backtest</button>
          <button class="nav-item" disabled title="Coming next">Portfolio</button>
          <button class="nav-item" disabled title="Coming next">Research</button>
        </nav>
        <div class="side-note">
          <span>FORWARD TEST</span>
          <strong>2026 · Q4</strong>
          <small id="sideSource">Computed demo engine</small>
        </div>
      </aside>

      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">U.S. EQUITIES / DECISION LAYER</p>
            <h1>Market intelligence, routed by strategy.</h1>
          </div>
          <div class="top-actions">
            <button id="dataModeBtn" class="live-dot data-button" type="button" aria-label="Toggle data mode"><i></i><span id="dataModeLabel">DEMO-COMPUTED</span></button>
            <button id="resetBtn" class="ghost-btn">Reset</button>
          </div>
        </header>
        <div id="systemMessage" class="system-message" aria-live="polite"></div>

        <section class="hero-grid">
          <article class="panel market-panel">
            <div class="panel-head">
              <div><p class="eyebrow">MARKET REGIME</p><h2 id="regimeLabel">Selective</h2></div>
              <span id="regimeScore" class="signal-chip">— / 100</span>
            </div>
            <p class="muted">SPY 방향을 먼저 판별하고, 그 국면에 맞는 전략 점수를 분리해서 계산합니다.</p>
            <div class="regime-grid">
              <div><span>Market score</span><strong id="marketScore">—</strong><small>SPY trend</small></div>
              <div><span>Universe</span><strong id="universeSize">—</strong><small>Active candidates</small></div>
              <div><span>Avg risk</span><strong id="avgRisk">—</strong><small>Higher = safer</small></div>
              <div><span>Source</span><strong id="sourceMode">DEMO</strong><small>Data layer</small></div>
            </div>
            <div class="engine-pills">
              <span>Mean Reversion</span><span>Momentum</span><span>Industry</span><span>Catalyst</span><span>Value + Quality</span><span>Risk</span>
            </div>
          </article>

          <article class="panel allocation-panel">
            <div class="panel-head"><div><p class="eyebrow">PORTFOLIO SANDBOX</p><h2>Allocation</h2></div><span class="signal-chip subtle">₩</span></div>
            <div class="input-grid">
              <label>총자산<input id="totalAssets" type="number" min="1" value="1100"></label>
              <label>QLD<input id="qldAssets" type="number" min="0" value="250"></label>
              <label>IONQ<input id="ionqAssets" type="number" min="0" value="80"></label>
            </div>
            <div id="allocationStats" class="allocation-stats"></div>
            <div class="progress-track"><div id="allocationBar" class="progress-fill"></div></div>
            <p id="allocationNote" class="microcopy"></p>
          </article>
        </section>

        <section class="panel setups-panel">
          <div class="section-row">
            <div><p class="eyebrow">TODAY'S SETUPS</p><h2>Candidate ranking</h2></div>
            <div class="filters" id="filters"></div>
          </div>
          <div id="candidateGrid" class="candidate-grid"></div>
        </section>

        <section class="detail-grid">
          <article class="panel setup-detail" id="setupDetail"></article>
          <article class="panel score-panel">
            <div class="section-row compact">
              <div><p class="eyebrow">ENGINE SCORES</p><h2>Strategy decomposition</h2></div>
              <label class="select-label">Risk mode
                <select id="riskMode">
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="conservative">Conservative</option>
                </select>
              </label>
            </div>
            <div id="scoreBars" class="score-bars"></div>
            <div id="riskAdjusted" class="risk-adjusted"></div>
          </article>
        </section>

        <section class="panel decision-panel">
          <div class="decision-copy"><p class="eyebrow">DECISION LAYER</p><h2>보유할 이유 vs 갈아탈 이유</h2><p id="decisionText" class="muted"></p></div>
          <button id="compareBtn" class="primary-btn">IONQ와 비교</button>
          <div id="comparePanel" class="compare-panel" hidden></div>
        </section>

        <footer>
          <span>ATLAS v0.2 computed engine</span>
          <span id="footerSource">Synthetic OHLCV · computed indicators</span>
        </footer>
      </main>
    </div>
  `;
}

function renderDataMode() {
  const button = document.querySelector('#dataModeBtn');
  const label = document.querySelector('#dataModeLabel');
  const message = document.querySelector('#systemMessage');
  const live = state.dataMode === 'live';
  button.disabled = state.loadingLive;
  label.textContent = state.loadingLive ? 'LOADING…' : live ? 'LIVE-TECHNICAL' : 'DEMO-COMPUTED';
  button.classList.toggle('is-live', live);
  document.querySelector('#sourceMode').textContent = live ? 'LIVE' : 'DEMO';
  document.querySelector('#sideSource').textContent = live ? 'Massive live technicals' : 'Computed demo engine';
  document.querySelector('#footerSource').textContent = live
    ? 'Massive OHLCV · live technicals · neutral fundamental placeholders'
    : 'Synthetic OHLCV · computed indicators';
  message.classList.toggle('error', Boolean(state.sourceError));
  message.textContent = state.sourceError || state.sourceMessage;
}

function renderMarket() {
  const universe = state.universe;
  const market = universe[0]?.scores?.Market ?? 50;
  const avgRisk = universe.length
    ? universe.reduce((sum, stock) => sum + (stock.scores.Risk ?? 0), 0) / universe.length
    : 0;
  const regime = market >= 68 ? 'Bullish · Selective' : market >= 52 ? 'Neutral · Selective' : 'Risk-off · Defensive';
  document.querySelector('#regimeLabel').textContent = regime;
  document.querySelector('#regimeScore').textContent = `${market} / 100`;
  document.querySelector('#marketScore').textContent = market;
  document.querySelector('#universeSize').textContent = universe.length;
  document.querySelector('#avgRisk').textContent = Math.round(avgRisk);
}

function renderFilters() {
  const filters = document.querySelector('#filters');
  const items = [['ALL','전체'], ...Object.entries(statusMeta).map(([k,v]) => [k,v.label])];
  filters.innerHTML = items.map(([key,label]) => `<button class="filter-btn ${state.filter===key?'active':''}" data-filter="${key}">${label}</button>`).join('');
  filters.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    renderFilters();
    renderCandidates();
  }));
}

function renderPortfolio() {
  const stats = portfolioStats(state.portfolio.total, state.portfolio.qld, state.portfolio.ionq);
  document.querySelector('#allocationStats').innerHTML = `
    <div><span>Invested</span><strong>${money(stats.invested)}</strong></div>
    <div><span>Cash</span><strong>${money(stats.cash)}</strong></div>
    <div><span>Exposure</span><strong>${stats.investedPct.toFixed(1)}%</strong></div>
  `;
  document.querySelector('#allocationBar').style.width = `${stats.investedPct}%`;
  document.querySelector('#allocationNote').textContent = stats.overAllocated ? '보유 금액 합이 총자산을 초과했습니다.' : '입력값을 바꾸면 비중이 즉시 다시 계산됩니다.';
}

function renderCandidates() {
  const grid = document.querySelector('#candidateGrid');
  const ranked = rankStocks(state.universe, state.riskMode).filter(s => state.filter === 'ALL' || s.status === state.filter);
  grid.innerHTML = ranked.map((stock, i) => `
    <button class="candidate-card ${state.selected?.ticker===stock.ticker?'selected':''}" data-ticker="${stock.ticker}">
      <div class="rank">${String(i+1).padStart(2,'0')}</div>
      <div class="candidate-main"><strong>${stock.ticker}</strong><span>${stock.strategy}</span></div>
      <div class="candidate-meta"><span class="${statusClass(stock.status)}">${stock.statusLabel}</span><strong>${stock.adjusted}</strong></div>
    </button>
  `).join('') || `<div class="empty-state">해당 상태의 후보가 없습니다.</div>`;
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
  document.querySelector('#setupDetail').innerHTML = `
    <div class="detail-head">
      <div><p class="eyebrow">SELECTED SETUP</p><h2 class="ticker-title">${s.ticker}</h2><p class="muted">${s.strategy}</p></div>
      <div class="confidence"><span class="${statusClass(s.status)}">${s.statusLabel}</span><small>Confidence</small><strong>${s.confidence} / 100</strong></div>
    </div>
    <div class="quote-row"><span>Current</span><strong>$${s.price}</strong><small>${s.hold}</small></div>
    <div class="metric-grid">
      <div><span>RSI 14</span><strong>${num(m.rsi14)}</strong></div>
      <div><span>25D DEV</span><strong>${signed(m.sma25Deviation)}</strong></div>
      <div><span>RS vs SPY 20D</span><strong>${signed(m.relativeStrength20)}</strong></div>
      <div><span>VOL RATIO</span><strong>${num(m.volumeRatio20,2)}×</strong></div>
      <div><span>ATR %</span><strong>${num(m.atrPct,2)}%</strong></div>
      <div><span>REALIZED VOL</span><strong>${num(m.realizedVol20)}%</strong></div>
    </div>
    <div class="trade-grid">
      <div><span>ENTRY</span><strong>${s.entry}</strong></div>
      <div><span>INVALIDATION</span><strong>${s.stop}</strong></div>
    </div>
    <div class="targets">
      ${s.targets.map((t,i) => `<div><span>T${i+1}</span><strong>${t}</strong></div>`).join('')}
    </div>
    <div class="thesis-box"><span>WHY NOW</span><p>${s.thesis}</p></div>
  `;
}

function renderScores() {
  const s = state.selected;
  if (!s) return;
  document.querySelector('#scoreBars').innerHTML = Object.entries(s.scores).map(([key,value]) => `
    <div class="score-row">
      <div class="score-label"><span>${key}</span><strong>${value}</strong></div>
      <div class="score-track"><div class="score-fill" style="width:${value}%"></div></div>
    </div>
  `).join('');
  const score = adjustedScore(s, state.riskMode);
  const modeCopy = {
    balanced: '수익 기회와 하방 위험을 같이 반영.',
    aggressive: 'Momentum · Catalyst · Reversion 비중 확대.',
    conservative: 'Quality · Risk · Value 비중 확대.'
  };
  document.querySelector('#riskAdjusted').innerHTML = `<div><span>Risk-adjusted score</span><strong>${score}</strong></div><p>${modeCopy[state.riskMode]}</p>`;
}

function renderDecision() {
  const s = state.selected;
  if (!s) return;
  const ionq = state.universe.find(stock => stock.ticker === 'IONQ');
  const decisionText = document.querySelector('#decisionText');
  decisionText.textContent = s.ticker === 'IONQ'
    ? '현재 보유 포지션. 추가매수 여부는 단순 주가 하락보다 위험조정 점수와 사업 논리를 함께 비교합니다.'
    : `${s.ticker} 신규 진입 매력도를 현재 보유 중인 IONQ와 동일한 계산 기준으로 비교합니다.`;
  const compareBtn = document.querySelector('#compareBtn');
  compareBtn.disabled = !ionq || state.universe.length < 2;
  compareBtn.textContent = s.ticker === 'IONQ' ? '최상위 후보와 비교' : 'IONQ와 비교';
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
  panel.innerHTML = compared.map(({stock, upside, downside, rewardRisk}) => `
    <article class="compare-card">
      <div class="compare-head"><strong>${stock.ticker}</strong><span class="${statusClass(stock.status)}">${stock.statusLabel}</span></div>
      <div class="compare-metrics">
        <div><span>Score</span><strong>${adjustedScore(stock, state.riskMode)}</strong></div>
        <div><span>Upside*</span><strong>+${upside}%</strong></div>
        <div><span>Downside*</span><strong>-${downside}%</strong></div>
        <div><span>R / R</span><strong>${rewardRisk ?? '—'}</strong></div>
      </div>
    </article>
  `).join('') + `<p class="compare-note">* ATR 기반 T2와 무효화 가격으로 계산한 모델 값. 수익 보장값이 아닙니다.</p>`;
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
  state.sourceMessage = 'Massive에서 SPY·섹터 ETF·후보 종목의 일봉을 불러오는 중…';
  renderDataMode();
  try {
    const ticker = state.selected?.ticker;
    const result = await loadLiveUniverse();
    state.universe = result.stocks;
    state.selected = state.universe.find(stock => stock.ticker === ticker) || state.universe[0];
    state.dataMode = 'live';
    state.sourceMessage = result.caveat;
  } catch (error) {
    state.sourceError = error instanceof Error ? error.message : 'Live data load failed';
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
  ['totalAssets','qldAssets','ionqAssets'].forEach(id => {
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

  document.querySelector('#dataModeBtn').addEventListener('click', toggleDataMode);

  document.querySelector('#resetBtn').addEventListener('click', () => {
    state.selected = state.universe[0];
    state.filter = 'ALL';
    state.riskMode = 'balanced';
    state.portfolio = { total:1100, qld:250, ionq:80 };
    state.compareOpen = false;
    document.querySelector('#totalAssets').value = 1100;
    document.querySelector('#qldAssets').value = 250;
    document.querySelector('#ionqAssets').value = 80;
    document.querySelector('#riskMode').value = 'balanced';
    renderAll();
  });
}

function renderAll() {
  if (!state.universe.some(stock => stock.ticker === state.selected?.ticker)) state.selected = state.universe[0];
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
