(function () {
  const API = window.MTP_API_BASE;
  const state = { route: 'dashboard' };
  const app = document.getElementById('app');

  async function apiGet(path) {
    try {
      const res = await fetch(API + path, { headers: { Accept: 'application/json' } });
      return await res.json();
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
  function pct(v) {
    if (v == null || Number.isNaN(v)) return '—';
    const cls = v >= 0 ? 'up' : 'down';
    return `<span class="${cls}">${v >= 0 ? '+' : ''}${num(v, 2)}%</span>`;
  }
  function badge(text) { return `<span class="badge">${text}</span>`; }
  function header(title, subtitle) { return `<div class="screen-header"><div class="screen-title">${title}</div><div class="screen-subtitle">${subtitle}</div></div>`; }
  function empty(title, desc, icon='◎') { return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-desc">${desc || ''}</div></div>`; }
  function warning(title, desc) { return `<div class="warning-box danger"><div style="font-weight:700;margin-bottom:8px">${title}</div><div>${desc}</div></div>`; }

  async function renderDashboard() {
    app.innerHTML = header('Tableau de bord', 'Données marché réelles uniquement') + '<div class="card" style="padding:20px">Chargement...</div>';
    const [portfolio, opportunities, fearGreed, trending] = await Promise.all([
      apiGet('/api/portfolio/summary'),
      apiGet('/api/opportunities'),
      apiGet('/api/fear-greed'),
      apiGet('/api/trending'),
    ]);

    const portfolioData = portfolio.data || {};
    const opps = Array.isArray(opportunities.data) ? opportunities.data : [];
    const top = opps.slice(0, 5);
    const fg = fearGreed.data || null;
    const tr = Array.isArray(trending.data) ? trending.data : [];

    app.innerHTML = `
      ${header('Tableau de bord', 'Données marché réelles uniquement')}
      <div class="dashboard-hero">
        <div class="hero-label">Portefeuille réel</div>
        <div class="hero-capital">${portfolio.status === 'ok' && portfolioData.totalEquity != null ? money(portfolioData.totalEquity, 'EUR') : 'Aucun solde réel'}</div>
        <div class="hero-pnl">
          <span class="hero-mode-tag">réel</span>
          ${badge((portfolio.freshness || 'unknown') + (portfolio.source ? ' · ' + portfolio.source : ''))}
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-label">Opportunités</div><div class="stat-value">${opps.length}</div></div>
        <div class="stat-card"><div class="stat-label">Fear & Greed</div><div class="stat-value">${fg && fg.value != null ? fg.value : '—'}</div><div class="stat-change">${fg && fg.label ? fg.label : 'Donnée indisponible'}</div></div>
        <div class="stat-card"><div class="stat-label">Trending</div><div class="stat-value">${tr.length}</div></div>
        <div class="stat-card"><div class="stat-label">P&L réel</div><div class="stat-value">${portfolioData.totalPnl != null ? money(portfolioData.totalPnl, 'EUR') : '—'}</div><div class="stat-change">${portfolio.message || 'Aucune source réelle connectée'}</div></div>
      </div>
      <div class="section-title"><span>Top opportunités</span></div>
      ${top.length ? `<div>${top.map(item => `
        <div class="opp-row">
          <div><div class="opp-symbol">${item.symbol}</div><div class="opp-name">${item.name || 'Nom indisponible'}</div></div>
          <div class="opp-meta"><div>${item.price != null ? money(item.price, 'USD') : '—'}</div><div class="small muted">${item.score != null ? 'Score ' + item.score : (item.analysisLabel || 'Analyse incomplète')}</div></div>
        </div>`).join('')}</div>` : empty('Aucune opportunité exploitable', 'Pas de score affiché sans données complètes.')}
    `;
  }

  async function renderOpportunities() {
    app.innerHTML = header('Opportunités', 'Calculées uniquement sur données réelles valides') + '<div class="card" style="padding:20px">Chargement...</div>';
    const res = await apiGet('/api/opportunities');
    const rows = Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      app.innerHTML = header('Opportunités', 'Calculées uniquement sur données réelles valides') + empty('Aucune opportunité', res.message || 'Aucune donnée exploitable');
      return;
    }
    app.innerHTML = `
      ${header('Opportunités', 'Calculées uniquement sur données réelles valides')}
      ${res.status === 'partial' ? `<div class="warning-box" style="margin-bottom:16px">${res.message || 'Certaines opportunités sont incomplètes'}</div>` : ''}
      <div>
        ${rows.map(item => `
          <div class="opp-row">
            <div>
              <div class="opp-symbol">${item.symbol}</div>
              <div class="opp-name">${item.name || ''} · ${item.assetClass || 'unknown'}</div>
            </div>
            <div class="opp-meta">
              <div>${item.price != null ? money(item.price, 'USD') : '—'}</div>
              <div class="small">${pct(item.change24hPct)} · ${item.score != null ? 'Score ' + item.score : (item.analysisLabel || 'Analyse incomplète')}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  async function renderPortfolio() {
    const [summary, positions] = await Promise.all([apiGet('/api/portfolio/summary'), apiGet('/api/portfolio/positions')]);
    const rows = Array.isArray(positions.data) ? positions.data : [];
    app.innerHTML = `
      ${header('Mes trades', 'Portefeuille réel séparé de l’entraînement')}
      ${summary.status !== 'ok' ? `<div class="warning-box" style="margin-bottom:16px">${summary.message || 'Aucune source portefeuille réel configurée'}</div>` : ''}
      ${!rows.length ? empty('Aucune position réelle', positions.message || 'Connecte une vraie source broker ou back-office.') : `
        <div class="card" style="padding:0;overflow:hidden">
          <table class="table">
            <thead><tr><th>Actif</th><th>Qté</th><th>Entrée</th><th>Prix</th><th>P&L</th></tr></thead>
            <tbody>${rows.map(r => `<tr><td>${r.symbol}</td><td>${num(r.quantity, 6)}</td><td>${money(r.entryPrice, 'USD')}</td><td>${r.currentPrice != null ? money(r.currentPrice, 'USD') : '—'}</td><td>${r.pnl != null ? money(r.pnl, 'USD') : '—'}</td></tr>`).join('')}</tbody>
          </table>
        </div>`}
    `;
  }

  async function renderNews() {
    const [news, calendar] = await Promise.all([apiGet('/api/news'), apiGet('/api/economic-calendar')]);
    app.innerHTML = `
      ${header('Informations', 'News et événements réels uniquement')}
      <div class="grid-2">
        <div class="card" style="padding:20px">${(Array.isArray(news.data) && news.data.length) ? 'News branchées' : empty('News non branchées', news.message || 'Aucune source news active')}</div>
        <div class="card" style="padding:20px">${(Array.isArray(calendar.data) && calendar.data.length) ? 'Calendrier branché' : empty('Calendrier non branché', calendar.message || 'Aucune source calendrier active')}</div>
      </div>`;
  }

  async function renderTraining() {
    const [account, positions] = await Promise.all([apiGet('/api/training/account'), apiGet('/api/training/positions')]);
    app.innerHTML = `
      ${header('Entraînement', 'Module pédagogique séparé du réel')}
      <div class="dashboard-hero" style="border-color:rgba(245,166,35,.3)">
        <div class="hero-label">Capital entraînement</div>
        <div class="hero-capital">${money((account.data && account.data.balance) || 0, 'EUR')}</div>
        <div class="hero-pnl"><span class="badge">séparé du réel</span></div>
      </div>
      ${(Array.isArray(positions.data) && positions.data.length) ? '' : empty('Aucune position d’entraînement', 'Ce module reste totalement isolé du portefeuille réel.', '◈')}
    `;
  }

  function renderSettings() {
    app.innerHTML = `
      ${header('Réglages', 'Connexion API déjà branchée')}
      <div class="card" style="padding:20px">
        <div class="section-title" style="margin-top:0"><span>API active</span></div>
        <div class="warning-box">
          <div><strong>Worker :</strong> ${API}</div>
          <div style="margin-top:8px"><strong>Principe :</strong> aucune donnée fictive, aucune position réelle inventée, aucune valeur de secours mensongère.</div>
        </div>
      </div>`;
  }

  async function render() {
    if (state.route === 'dashboard') return renderDashboard();
    if (state.route === 'opportunities') return renderOpportunities();
    if (state.route === 'portfolio') return renderPortfolio();
    if (state.route === 'news') return renderNews();
    if (state.route === 'training') return renderTraining();
    if (state.route === 'settings') return renderSettings();
    return renderDashboard();
  }

  function setRoute(route) {
    state.route = route;
    document.querySelectorAll('[data-route]').forEach((el) => el.classList.toggle('active', el.dataset.route === route));
    render();
  }

  document.querySelectorAll('[data-route]').forEach((el) => el.addEventListener('click', () => setRoute(el.dataset.route)));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  render();
})();
