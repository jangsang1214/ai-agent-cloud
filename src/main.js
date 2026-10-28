import './styles.css';
import { stocks, statusMeta } from './data.js';
import { adjustedScore, compareSetup, portfolioStats, rankStocks } from './engine.js';

const app = document.querySelector('#app');

const state = {
  selected: stocks[0],
  filter: 'ALL',
  riskMode: 'balanced',
  portfolio: { total: 1100, qld: 250, ionq: 80 },
  compareOpen: false
};

const statusClass = (status) => `status status-${String(status).toLowerCase()}`;
const money = (v) => `${Math.round(v).toLocaleString('ko-KR')}만원`;

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
          <small>Prototype data only</small>
        </div>
      </aside>

      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">U.S. EQUITIES / DECISION LAYER</p>
            <h1>Market intelligence, routed by strategy.</h1>
          </div>
          <div class="top-actions">
            <span class="live-dot"><i></i> DEMO</span>
            <button id="resetBtn" class="ghost-btn">Reset</button>
          </div>
        </header>

        <section class="hero-grid">
          <article class="panel market-panel">
            <div class="panel-head">
              <div><p class="eyebrow">MARKET REGIME</p><h2>Bullish · Selective</h2></div>
              <span class="signal-chip">72 / 100</span>
            </div>
            <p class="muted">시장 방향을 먼저 판별하고, 그 국면에 맞는 전략 엔진만 활성화합니다.</p>
            <div class="regime-grid">
              <div><span>S&P 500</span><strong>72</strong><small>Trend + breadth</small></div>
              <div><span>Nasdaq</span><strong>78</strong><small>Growth leadership</small></div>
              <div><span>Risk</span><strong>MED</strong><small>Volatility regime</small></div>
              <div><span>Rates</span><strong>NEUTRAL</strong><small>Macro filter</small></div>
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
          <span>ATLAS v0.1 prototype</span>
          <span>현재 수치는 UI/의사결정 구조 검증용 데모 데이터입니다.</span>
        </footer>
      </main>
    </div>
  `;
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
  const ranked = rankStocks(stocks, state.riskMode).filter(s => state.filter === 'ALL' || s.status === state.filter);
  grid.innerHTML = ranked.map((stock, i) => `
    <button class="candidate-card ${state.selected.ticker===stock.ticker?'selected':''}" data-ticker="${stock.ticker}">
      <div class="rank">${String(i+1).padStart(2,'0')}</div>
      <div class="candidate-main"><strong>${stock.ticker}</strong><span>${stock.strategy}</span></div>
      <div class="candidate-meta"><span class="${statusClass(stock.status)}">${stock.statusLabel}</span><strong>${stock.adjusted}</strong></div>
    </button>
  `).join('') || `<div class="empty-state">해당 상태의 후보가 없습니다.</div>`;
  grid.querySelectorAll('.candidate-card').forEach(card => card.addEventListener('click', () => {
    state.selected = stocks.find(s => s.ticker === card.dataset.ticker) || stocks[0];
    state.compareOpen = false;
    renderCandidates();
    renderDetail();
    renderScores();
    renderDecision();
  }));
}

function renderDetail() {
  const s = state.selected;
  document.querySelector('#setupDetail').innerHTML = `
    <div class="detail-head">
      <div><p class="eyebrow">SELECTED SETUP</p><h2 class="ticker-title">${s.ticker}</h2><p class="muted">${s.strategy}</p></div>
      <div class="confidence"><span class="${statusClass(s.status)}">${s.statusLabel}</span><small>Confidence</small><strong>${s.confidence} / 100</strong></div>
    </div>
    <div class="quote-row"><span>Current</span><strong>$${s.price}</strong><small>${s.hold}</small></div>
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
  const decisionText = document.querySelector('#decisionText');
  decisionText.textContent = s.ticker === 'IONQ'
    ? '현재 보유 포지션. 추가매수 여부는 단순 주가 하락보다 실적·기술 로드맵·정부계약 등 사업 논리가 강화되는지를 우선 비교합니다.'
    : `${s.ticker} 신규 진입 매력도를 현재 보유 중인 IONQ와 위험조정 기준으로 비교합니다.`;
  const compareBtn = document.querySelector('#compareBtn');
  compareBtn.textContent = s.ticker === 'IONQ' ? 'LRCX와 비교' : 'IONQ와 비교';
  renderCompare();
}

function renderCompare() {
  const panel = document.querySelector('#comparePanel');
  if (!state.compareOpen) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }
  const other = state.selected.ticker === 'IONQ' ? stocks[0] : stocks.find(s => s.ticker === 'IONQ');
  const compared = compareSetup(state.selected, other);
  panel.hidden = false;
  panel.innerHTML = compared.map(({stock, upside, downside}) => `
    <article class="compare-card">
      <div class="compare-head"><strong>${stock.ticker}</strong><span class="${statusClass(stock.status)}">${stock.statusLabel}</span></div>
      <div class="compare-metrics">
        <div><span>Confidence</span><strong>${stock.confidence}</strong></div>
        <div><span>Upside*</span><strong>+${upside}%</strong></div>
        <div><span>Downside*</span><strong>-${downside}%</strong></div>
      </div>
    </article>
  `).join('') + `<p class="compare-note">* 현재는 프로토타입 가정값. 실시간 데이터 엔진 연결 후 모델 산출값으로 대체.</p>`;
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
  });

  document.querySelector('#compareBtn').addEventListener('click', () => {
    state.compareOpen = !state.compareOpen;
    renderCompare();
  });

  document.querySelector('#resetBtn').addEventListener('click', () => {
    state.selected = stocks[0];
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
