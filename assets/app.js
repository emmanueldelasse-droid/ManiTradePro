
(function () {
  const API = window.MTP_API_BASE;
  const state = {
    route: 'dashboard',
    selectedSymbol: null,
    filters: { assetClass: 'all', score: 'all' },
    cache: new Map(),
  };
  const app = document.getElementById('app');

  async function apiGet(path, cacheMs = 0) {
    const key = path;
    const now = Date.now();
    const hit = state.cache.get(key);
    if (cacheMs > 0 && hit && now - hit.ts < cacheMs) return hit.value;
    try {
      const res = await fetch(API + path, { headers: { Accept: 'application/json' } });
      const value = await res.json();
      if (cacheMs > 0) state.cache.set(key, { ts: now, value });
      return value;
    } catch (e) {
      return { status: 'error', message: e && e.message ? e.message : 'Erreur réseau', data: null };
    }
  }

  function money(v, currency = 'USD') {
    if (v == null || Number.isNaN(v)) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  }
  function num(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(v);
  }
  function signedNum(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return '—';
    return `${v >= 0 ? '+' : ''}${num(v, digits)}`;
  }
  function pct(v) {
    if (v == null || Number.isNaN(v)) return '<span class="muted">—</span>';
    const cls = v >= 0 ? 'up' : 'down';
    return `<span class="${cls}">${signedNum(v, 2)}%</span>`;
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function header(title, subtitle, back = null) {
    return `
      ${back ? `<button class="back-btn" data-back="${esc(back)}">← Retour</button>` : ''}
      <div class="screen-header">
        <div class="screen-title">${esc(title)}</div>
        <div class="screen-subtitle">${esc(subtitle)}</div>
      </div>`;
  }
  function empty(title, desc, icon='◎') {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${esc(title)}</div><div class="empty-desc">${esc(desc || '')}</div></div>`;
  }
  function warning(title, desc, danger = false) {
    return `<div class="warning-box ${danger ? 'danger' : ''}"><div class="warning-title">${esc(title)}</div><div>${esc(desc || '')}</div></div>`;
  }
  function badge(text, kind = '') {
    return `<span class="badge ${kind}">${esc(text)}</span>`;
  }
  function freshnessBadge(res) {
    if (!res) return '';
    const txt = [res.freshness, res.source].filter(Boolean).join(' · ');
    return badge(txt || 'unknown');
  }
  function scoreTone(score) {
    if (score == null) return 'score-na';
    if (score >= 70) return 'score-strong';
    if (score >= 55) return 'score-medium';
    return 'score-weak';
  }
  function scoreLabel(item) {
    if (!item || item.score == null) return item?.analysisLabel || 'Analyse incomplète';
    if (item.score >= 70) return 'Signal fort';
    if (item.score >= 55) return 'Signal moyen';
    return item.analysisLabel || 'Signal faible';
  }
  function assetClassLabel(assetClass) {
    const map = { crypto:'crypto', stock:'action', etf:'ETF', forex:'forex', commodity:'matière' };
    return map[assetClass] || 'actif';
  }
  function directionBadge(direction) {
    if (!direction) return badge('incomplet');
    const map = { long:'LONG', short:'SHORT', neutral:'NEUTRE' };
    return `<span class="dir-badge dir-${direction}">${map[direction] || direction}</span>`;
  }
  function scoreRing(score) {
    if (score == null) return `<div class="score-ring score-na"><span>—</span></div>`;
    const size = 46;
    const radius = 18;
    const c = 2 * Math.PI * radius;
    const dash = Math.max(0, Math.min(c, c * score / 100));
    return `<div class="score-ring ${scoreTone(score)}"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"></circle>
      <circle cx="23" cy="23" r="18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 23 23)"></circle>
    </svg><span>${score}</span></div>`;
  }
  function miniChart(candles) {
    if (!Array.isArray(candles) || candles.length < 2) return '<div class="chart-empty">Graphique indisponible</div>';
    const closes = candles.map(c => Number(c.close)).filter(v => Number.isFinite(v));
    if (closes.length < 2) return '<div class="chart-empty">Graphique indisponible</div>';
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const points = closes.map((v, i) => {
      const x = (i / (closes.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    const up = closes[closes.length - 1] >= closes[0];
    return `<svg class="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke="${up ? '#00e5a0' : '#e05a5a'}" stroke-width="2.2" points="${points}" />
    </svg>`;
  }

  async function renderDashboard() {
    app.innerHTML = header('Tableau de bord', 'Données marché réelles uniquement') + '<div class="card block-loading">Chargement...</div>';
    const [portfolio, opportunities, fearGreed, trending] = await Promise.all([
      apiGet('/api/portfolio/summary', 5000),
      apiGet('/api/opportunities', 10000),
      apiGet('/api/fear-greed', 30000),
      apiGet('/api/trending', 30000),
    ]);

    const portfolioData = portfolio.data || {};
    const opps = (Array.isArray(opportunities.data) ? opportunities.data : []).filter(Boolean);
    const complete = opps.filter(x => x.score != null).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,6);
    const fg = fearGreed.data || null;
    const tr = Array.isArray(trending.data) ? trending.data.slice(0,6) : [];

    app.innerHTML = `
      ${header('Tableau de bord', 'Données marché réelles uniquement')}
      <div class="dashboard-hero">
        <div class="hero-label">Portefeuille réel</div>
        <div class="hero-capital">${portfolio.status === 'ok' && portfolioData.totalEquity != null ? money(portfolioData.totalEquity, 'EUR') : 'Aucun solde réel'}</div>
        <div class="hero-pnl">
          <span class="hero-mode-tag">réel</span>
          ${freshnessBadge(portfolio)}
        </div>
        ${portfolio.status !== 'ok' ? `<div class="hero-note">${esc(portfolio.message || 'Aucune source portefeuille réel configurée')}</div>` : ''}
      </div>

      <div class="grid-4 stats-gap">
        <div class="stat-card"><div class="stat-label">Opportunités</div><div class="stat-value">${opps.length}</div><div class="stat-change">${opportunities.status === 'partial' ? 'analyse partielle' : 'calcul complet ou filtré'}</div></div>
        <div class="stat-card"><div class="stat-label">Fear & Greed</div><div class="stat-value">${fg && fg.value != null ? fg.value : '—'}</div><div class="stat-change">${esc(fg && fg.label ? fg.label : fearGreed.message || 'Donnée indisponible')}</div></div>
        <div class="stat-card"><div class="stat-label">Trending</div><div class="stat-value">${tr.length}</div><div class="stat-change">${esc(tr.map(x => x.symbol).slice(0,3).join(' · ') || 'Aucune donnée')}</div></div>
        <div class="stat-card"><div class="stat-label">P&L réel</div><div class="stat-value">${portfolioData.totalPnl != null ? money(portfolioData.totalPnl, 'EUR') : '—'}</div><div class="stat-change">${esc(portfolio.message || 'Aucune source réelle connectée')}</div></div>
      </div>

      <div class="section-title"><span>Top opportunités exploitables</span><button class="see-all-link" data-route-go="opportunities">Voir tout</button></div>
      ${complete.length ? `<div class="opps-list">${complete.map(item => opportunityRow(item, true)).join('')}</div>` : empty('Aucune opportunité propre', opportunities.message || 'Pas de score affiché sans données complètes.')}
    `;
    bindCommonActions();
  }

  function opportunityRow(item, compact = false) {
    const price = item.price != null ? money(item.price, 'USD') : 'Donnée indisponible';
    const label = scoreLabel(item);
    return `
      <button class="opp-row ${compact ? 'opp-row-compact' : ''}" data-symbol="${esc(item.symbol)}">
        <div class="opp-left">
          ${scoreRing(item.score)}
          <div class="opp-body">
            <div class="opp-topline">
              <span class="opp-symbol">${esc(item.symbol)}</span>
              <span class="class-badge class-${esc(item.assetClass || 'unknown')}">${esc(assetClassLabel(item.assetClass))}</span>
              ${directionBadge(item.direction)}
              ${item.scoreStatus === 'partial' ? badge('partiel') : ''}
            </div>
            <div class="opp-name">${esc(item.name || 'Nom indisponible')}</div>
            <div class="opp-subline">${esc(label)}</div>
          </div>
        </div>
        <div class="opp-meta">
          <div class="opp-price">${price}</div>
          <div class="opp-change-line">${pct(item.change24hPct)}</div>
        </div>
      </button>`;
  }

  function filterRows(rows) {
    return rows.filter(item => {
      if (state.filters.assetClass !== 'all' && item.assetClass !== state.filters.assetClass) return false;
      if (state.filters.score === 'complete' && item.score == null) return false;
      if (state.filters.score === 'best' && !(item.score != null && item.score >= 55)) return false;
      return true;
    });
  }

  async function renderOpportunities() {
    app.innerHTML = header('Opportunités', 'Calculées uniquement sur données réelles valides') + '<div class="card block-loading">Chargement...</div>';
    const res = await apiGet('/api/opportunities', 10000);
    const rows = Array.isArray(res.data) ? res.data.slice() : [];
    if (!rows.length) {
      app.innerHTML = header('Opportunités', 'Calculées uniquement sur données réelles valides') + empty('Aucune opportunité', res.message || 'Aucune donnée exploitable');
      bindCommonActions();
      return;
    }

    rows.sort((a, b) => {
      const sa = a.score == null ? -1 : a.score;
      const sb = b.score == null ? -1 : b.score;
      return sb - sa;
    });

    const filtered = filterRows(rows);

    app.innerHTML = `
      ${header('Opportunités', 'Calculées uniquement sur données réelles valides')}
      ${res.status === 'partial' ? warning('Certaines opportunités sont incomplètes', res.message || 'Les actifs sans données suffisantes restent affichés sans faux score.') : ''}
      <div class="filter-row">
        <button class="filter-btn ${state.filters.assetClass === 'all' ? 'active' : ''}" data-filter-asset="all">Tout</button>
        <button class="filter-btn ${state.filters.assetClass === 'crypto' ? 'active' : ''}" data-filter-asset="crypto">Crypto</button>
        <button class="filter-btn ${state.filters.assetClass === 'stock' ? 'active' : ''}" data-filter-asset="stock">Actions</button>
        <button class="filter-btn ${state.filters.assetClass === 'etf' ? 'active' : ''}" data-filter-asset="etf">ETF</button>
        <button class="filter-btn ${state.filters.assetClass === 'forex' ? 'active' : ''}" data-filter-asset="forex">Forex</button>
        <button class="filter-btn ${state.filters.assetClass === 'commodity' ? 'active' : ''}" data-filter-asset="commodity">Matières</button>
      </div>
      <div class="filter-row filter-row-tight">
        <button class="filter-btn ${state.filters.score === 'all' ? 'active' : ''}" data-filter-score="all">Tous</button>
        <button class="filter-btn ${state.filters.score === 'best' ? 'active' : ''}" data-filter-score="best">Score ≥ 55</button>
        <button class="filter-btn ${state.filters.score === 'complete' ? 'active' : ''}" data-filter-score="complete">Analyses complètes</button>
      </div>
      ${filtered.length ? `<div class="opps-list">${filtered.map(item => opportunityRow(item)).join('')}</div>` : empty('Aucun actif ne passe les filtres', 'Élargis les filtres ou attends plus de données marché.')}
    `;
    bindCommonActions();
  }

  async function renderAssetDetail(symbol) {
    app.innerHTML = header(symbol || 'Actif', 'Chargement du détail actif réel...', 'opportunities') + '<div class="card block-loading">Chargement...</div>';
    const [quote, candlesRes, oppRes] = await Promise.all([
      apiGet('/api/quotes/' + encodeURIComponent(symbol), 5000),
      apiGet('/api/candles/' + encodeURIComponent(symbol) + '?timeframe=1d&limit=55', 10000),
      apiGet('/api/opportunities?symbols=' + encodeURIComponent(symbol), 10000),
    ]);

    const q = quote.data;
    const candles = Array.isArray(candlesRes.data) ? candlesRes.data : [];
    const opp = Array.isArray(oppRes.data) && oppRes.data[0] ? oppRes.data[0] : null;

    if (!q) {
      app.innerHTML = header(symbol || 'Actif', 'Détail actif réel', 'opportunities') + warning('Source temporairement inaccessible', quote.message || 'Détail indisponible', true);
      bindCommonActions();
      return;
    }

    const lastClose = candles.length ? candles[candles.length - 1].close : q.price;
    const firstClose = candles.length ? candles[0].close : q.price;
    const periodPct = firstClose && lastClose ? ((lastClose - firstClose) / firstClose) * 100 : null;
    const hi = candles.length ? Math.max(...candles.map(x => Number(x.high)).filter(Number.isFinite)) : null;
    const lo = candles.length ? Math.min(...candles.map(x => Number(x.low)).filter(Number.isFinite)) : null;

    app.innerHTML = `
      ${header(symbol, 'Détail actif réel', 'opportunities')}
      <div class="asset-hero">
        <div class="asset-hero-left">
          <div class="asset-tile">${esc(symbol.slice(0, 3))}</div>
          <div>
            <div class="asset-title-line">
              <div class="asset-title">${esc(symbol)}</div>
              <div class="asset-badges">${badge(assetClassLabel(q.assetClass))} ${directionBadge(opp?.direction)} ${opp?.scoreStatus === 'partial' ? badge('partiel') : ''}</div>
            </div>
            <div class="asset-subtitle">${esc(q.name || 'Nom indisponible')}</div>
            <div class="asset-source-line">${freshnessBadge(quote)} ${quote.message ? badge(quote.message) : ''}</div>
          </div>
        </div>
        <div class="asset-hero-right">
          <div class="asset-price-main">${money(q.price, q.currency === 'QUOTE' ? 'USD' : q.currency || 'USD')}</div>
          <div class="asset-price-change">${pct(q.change24hPct)}</div>
          <div class="asset-score-inline">${scoreRing(opp?.score ?? null)}<div><div class="asset-score-label">${esc(scoreLabel(opp))}</div><div class="small muted">${opp?.analysisLabel ? esc(opp.analysisLabel) : 'Aucune analyse détaillée'}</div></div></div>
        </div>
      </div>
      <div class="grid-2 stats-gap">
        <div class="card detail-card"><div class="card-title">Évolution du prix (55 jours)</div>${miniChart(candles)}<div class="mini-chart-legend"><span>Plus bas : ${lo != null ? money(lo, 'USD') : '—'}</span><span>Plus haut : ${hi != null ? money(hi, 'USD') : '—'}</span></div></div>
        <div class="card detail-card"><div class="card-title">Résumé marché</div>
          <div class="detail-grid">
            <div><span class="detail-label">Prix</span><strong>${money(q.price, 'USD')}</strong></div>
            <div><span class="detail-label">Var. 24h</span><strong>${q.change24hPct != null ? signedNum(q.change24hPct) + '%' : '—'}</strong></div>
            <div><span class="detail-label">Perf. période</span><strong>${periodPct != null ? signedNum(periodPct) + '%' : '—'}</strong></div>
            <div><span class="detail-label">Volume</span><strong>${q.volume24h != null ? num(q.volume24h, 0) : '—'}</strong></div>
            <div><span class="detail-label">Classe</span><strong>${esc(assetClassLabel(q.assetClass))}</strong></div>
            <div><span class="detail-label">État analyse</span><strong>${esc(opp?.scoreStatus || 'unavailable')}</strong></div>
          </div>
        </div>
      </div>
      ${opp?.score == null ? warning('Analyse incomplète', opp?.analysisLabel || 'Le score n’est pas affiché si la donnée n’est pas suffisante.') : ''}
    `;
    bindCommonActions();
  }

  async function renderPortfolio() {
    const [summary, positions] = await Promise.all([apiGet('/api/portfolio/summary', 5000), apiGet('/api/portfolio/positions', 5000)]);
    const rows = Array.isArray(positions.data) ? positions.data : [];
    app.innerHTML = `
      ${header('Mes trades', 'Portefeuille réel séparé de l’entraînement')}
      ${summary.status !== 'ok' ? warning('Portefeuille réel non branché', summary.message || 'Aucune source portefeuille réel configurée') : ''}
      ${!rows.length ? empty('Aucune position réelle', positions.message || 'Connecte une vraie source broker ou back-office.', '◫') : `
        <div class="card table-card">
          <table class="table">
            <thead><tr><th>Actif</th><th>Qté</th><th>Entrée</th><th>Prix</th><th>P&L</th></tr></thead>
            <tbody>${rows.map(r => `<tr><td>${esc(r.symbol)}</td><td>${num(r.quantity, 6)}</td><td>${money(r.entryPrice, 'USD')}</td><td>${r.currentPrice != null ? money(r.currentPrice, 'USD') : '—'}</td><td>${r.pnl != null ? money(r.pnl, 'USD') : '—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>`}
    `;
    bindCommonActions();
  }

  async function renderNews() {
    const [news, calendar] = await Promise.all([apiGet('/api/news', 30000), apiGet('/api/economic-calendar', 30000)]);
    const newsRows = Array.isArray(news.data) ? news.data : [];
    const calRows = Array.isArray(calendar.data) ? calendar.data : [];
    app.innerHTML = `
      ${header('Informations', 'News et événements réels uniquement')}
      <div class="grid-2 stats-gap">
        <div class="card detail-card">${newsRows.length ? `<div class="card-title">News</div>${newsRows.slice(0,8).map(n=>`<a class="news-row" href="${esc(n.url)}" target="_blank" rel="noreferrer"><div class="news-title">${esc(n.title)}</div><div class="news-meta">${esc(n.source || 'source')} · ${esc(n.publishedAt || 'date indisponible')}</div></a>`).join('')}` : empty('News non branchées', news.message || 'Aucune source news active', '◌')}</div>
        <div class="card detail-card">${calRows.length ? `<div class="card-title">Calendrier économique</div>${calRows.slice(0,8).map(n=>`<div class="news-row"><div class="news-title">${esc(n.title)}</div><div class="news-meta">${esc(n.country || '')} ${n.currency ? '· ' + esc(n.currency) : ''} · ${esc(n.datetime || '')}</div></div>`).join('')}` : empty('Calendrier non branché', calendar.message || 'Aucune source calendrier active', '◌')}</div>
      </div>`;
    bindCommonActions();
  }

  async function renderTraining() {
    const [account, positions] = await Promise.all([apiGet('/api/training/account', 5000), apiGet('/api/training/positions', 5000)]);
    app.innerHTML = `
      ${header('Entraînement', 'Module pédagogique séparé du réel')}
      <div class="dashboard-hero hero-training">
        <div class="hero-label">Capital entraînement</div>
        <div class="hero-capital">${money((account.data && account.data.balance) || 0, 'EUR')}</div>
        <div class="hero-pnl"><span class="badge badge-training">séparé du réel</span>${freshnessBadge(account)}</div>
      </div>
      ${(Array.isArray(positions.data) && positions.data.length) ? '' : empty('Aucune position d’entraînement', 'Ce module reste totalement isolé du portefeuille réel.', '◈')}
    `;
    bindCommonActions();
  }

  function renderSettings() {
    app.innerHTML = `
      ${header('Réglages', 'Connexion API déjà branchée')}
      <div class="card detail-card">
        <div class="card-title">API active</div>
        <div class="detail-grid">
          <div><span class="detail-label">Worker</span><strong class="break-any">${esc(API)}</strong></div>
          <div><span class="detail-label">Principe</span><strong>Aucune donnée fictive</strong></div>
          <div><span class="detail-label">Portefeuille réel</span><strong>vide si non connecté</strong></div>
          <div><span class="detail-label">Entraînement</span><strong>séparé du réel</strong></div>
        </div>
      </div>`;
    bindCommonActions();
  }

  async function render() {
    if (state.route === 'dashboard') return renderDashboard();
    if (state.route === 'opportunities') return renderOpportunities();
    if (state.route === 'asset-detail') return renderAssetDetail(state.selectedSymbol);
    if (state.route === 'portfolio') return renderPortfolio();
    if (state.route === 'news') return renderNews();
    if (state.route === 'training') return renderTraining();
    if (state.route === 'settings') return renderSettings();
    return renderDashboard();
  }

  function updateNav() {
    document.querySelectorAll('[data-route]').forEach((el) => {
      const active = el.dataset.route === (state.route === 'asset-detail' ? 'opportunities' : state.route);
      el.classList.toggle('active', active);
    });
  }

  function setRoute(route, symbol = null) {
    state.route = route;
    state.selectedSymbol = symbol;
    updateNav();
    render();
  }

  function bindCommonActions() {
    document.querySelectorAll('[data-route-go]').forEach((el) => {
      el.addEventListener('click', () => setRoute(el.dataset.routeGo));
    });
    document.querySelectorAll('[data-symbol]').forEach((el) => {
      el.addEventListener('click', () => setRoute('asset-detail', el.dataset.symbol));
    });
    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => setRoute(el.dataset.back));
    });
    document.querySelectorAll('[data-filter-asset]').forEach((el) => {
      el.addEventListener('click', () => { state.filters.assetClass = el.dataset.filterAsset; renderOpportunities(); });
    });
    document.querySelectorAll('[data-filter-score]').forEach((el) => {
      el.addEventListener('click', () => { state.filters.score = el.dataset.filterScore; renderOpportunities(); });
    });
  }

  document.querySelectorAll('[data-route]').forEach((el) => el.addEventListener('click', () => setRoute(el.dataset.route)));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  updateNav();
  render();
})();
