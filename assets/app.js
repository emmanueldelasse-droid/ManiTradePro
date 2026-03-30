(() => {
  const API_BASE = "https://manitradepro.emmanueldelasse.workers.dev";
  const STORAGE_KEYS = {
    trainingPositions: "mtp_training_positions_v1",
    trainingHistory: "mtp_training_history_v1",
    settings: "mtp_settings_v1"
  };

  const defaultSettings = {
    autoRefreshOpportunities: true,
    showSourceBadges: true,
    showScoreBreakdown: true,
    compactCards: false
  };

  const state = {
    route: "dashboard",
    opportunities: [],
    filteredOpportunities: [],
    opportunityFilter: "all",
    selectedSymbol: null,
    detail: null,
    loading: false,
    loadingDetail: false,
    error: null,
    opportunitiesRequestId: 0,
    opportunitiesFetchedAt: 0,
    lastOpportunitiesFetchStartedAt: 0,
    detailRequestStartedAt: 0,
    dashboard: {
      fearGreed: null,
      trending: [],
      portfolio: null
    },
    trades: {
      mode: "training",
      positions: [],
      history: []
    },
    settings: loadSettings()
  };

  const app = document.getElementById("app");
  const navItems = [
    ["dashboard", "Accueil", "⌂"],
    ["opportunities", "Opportunites", "◎"],
    ["portfolio", "Mes trades", "◫"],
    ["settings", "Reglages", "◦"]
  ];

  // =========================
  // storage
  // =========================
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadSettings() {
    return { ...defaultSettings, ...readJson(STORAGE_KEYS.settings, {}) };
  }

  function persistSettings() {
    writeJson(STORAGE_KEYS.settings, state.settings);
  }

  function loadTradesState() {
    state.trades.positions = readJson(STORAGE_KEYS.trainingPositions, []);
    state.trades.history = readJson(STORAGE_KEYS.trainingHistory, []);
  }

  function persistTradesState() {
    writeJson(STORAGE_KEYS.trainingPositions, state.trades.positions);
    writeJson(STORAGE_KEYS.trainingHistory, state.trades.history);
  }

  // =========================
  // helpers
  // =========================
  function safeText(v) {
    return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function money(v, currency = "USD") {
    if (v == null || Number.isNaN(v)) return "Donnee indisponible";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: v > 999 ? 0 : 2
    }).format(v);
  }

  function num(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return "—";
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v);
  }

  function pct(v) {
    if (v == null || Number.isNaN(v)) return "—";
    const sign = v > 0 ? "+" : "";
    return `${sign}${num(v, 2)}%`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function compactError(message) {
    const msg = String(message || "");
    if (!msg) return null;
    if (msg.includes("Minute quota reached")) return "Quota minute atteint";
    if (msg.includes("Provider key rejected")) return "Cle fournisseur refusee";
    if (msg.includes("Cloudflare subrequest limit reached")) return "Limite Cloudflare atteinte";
    if (msg.includes("Provider plan limit")) return "Limite fournisseur";
    if (msg.includes("temporarily unavailable")) return "Source temporairement indisponible";
    if (msg.length > 90) return msg.slice(0, 87) + "...";
    return msg;
  }

  function badge(label, cls = "") {
    return `<span class="badge ${cls}">${safeText(label)}</span>`;
  }

  function scoreColor(score) {
    if (score == null) return "var(--neutral)";
    if (score >= 70) return "var(--profit)";
    if (score >= 50) return "#f5a623";
    return "var(--loss)";
  }

  function scoreRing(score) {
    const value = score == null ? 0 : Math.max(0, Math.min(100, score));
    const r = 20;
    const c = 2 * Math.PI * r;
    const dash = (value / 100) * c;
    const color = scoreColor(score);
    return `
      <div class="score-ring">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="4"></circle>
          <circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="4"
            stroke-dasharray="${dash} ${c}" stroke-linecap="round" transform="rotate(-90 24 24)"></circle>
        </svg>
        <div class="score-ring-text" style="color:${color}">${score == null ? "—" : safeText(score)}</div>
      </div>`;
  }

  function normalizeOpportunity(item) {
    return {
      symbol: item?.symbol || "",
      name: item?.name || "Nom indisponible",
      assetClass: item?.assetClass || "unknown",
      price: typeof item?.price === "number" ? item.price : null,
      change24hPct: typeof item?.change24hPct === "number" ? item.change24hPct : null,
      score: typeof item?.score === "number" ? item.score : null,
      scoreStatus: item?.scoreStatus || (item?.price != null ? "partial" : "unavailable"),
      direction: item?.direction || (item?.score == null ? null : "neutral"),
      analysisLabel: item?.analysisLabel || (item?.price != null ? "Real quote available" : "Source temporarily unavailable"),
      confidence: item?.confidence || (item?.price != null ? "medium" : "low"),
      sourceUsed: item?.sourceUsed || null,
      freshness: item?.freshness || "unknown",
      error: compactError(item?.error || null)
    };
  }

  function setOpportunities(rows) {
    state.opportunities = Array.isArray(rows) ? rows.map(normalizeOpportunity) : [];
    applyFilter();
    state.opportunitiesFetchedAt = Date.now();
  }

  // =========================
  // api
  // =========================
  async function api(path) {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function loadDashboard() {
    try {
      const [opp, fg, trending, portfolio] = await Promise.all([
        api("/api/opportunities").catch(() => null),
        api("/api/fear-greed").catch(() => null),
        api("/api/trending").catch(() => null),
        api("/api/portfolio/summary").catch(() => null)
      ]);
      if (opp?.data) setOpportunities(opp.data);
      state.dashboard.fearGreed = fg?.data || null;
      state.dashboard.trending = trending?.data || [];
      state.dashboard.portfolio = portfolio?.data || null;
      state.error = null;
    } catch (e) {
      state.error = e.message || "Chargement impossible";
    }
  }

  async function loadOpportunities(force = true) {
    const now = Date.now();
    if (!force && state.opportunities.length && (now - state.opportunitiesFetchedAt) < 30000) {
      render();
      return;
    }
    if ((now - state.lastOpportunitiesFetchStartedAt) < 8000 && state.opportunities.length) {
      state.error = "Attends quelques secondes avant un nouveau refresh.";
      render();
      return;
    }
    state.lastOpportunitiesFetchStartedAt = now;
    const requestId = ++state.opportunitiesRequestId;
    if (force) {
      state.loading = true;
      render();
    }
    try {
      const result = await api("/api/opportunities");
      if (requestId !== state.opportunitiesRequestId) return;
      setOpportunities(result.data || []);
      state.error = null;
    } catch (e) {
      if (requestId !== state.opportunitiesRequestId) return;
      state.error = e.message || "Chargement impossible";
      if (!state.opportunities.length) setOpportunities([]);
    } finally {
      if (requestId !== state.opportunitiesRequestId) return;
      state.loading = false;
      render();
    }
  }

  async function loadDetail(symbol) {
    const now = Date.now();
    if (state.detail && state.detail.symbol === symbol && (now - state.detailRequestStartedAt) < 15000) {
      render();
      return;
    }
    if ((now - state.detailRequestStartedAt) < 6000 && state.detail) {
      state.error = "Attends quelques secondes avant de recharger un detail.";
      render();
      return;
    }
    state.detailRequestStartedAt = now;
    state.loadingDetail = true;
    state.detail = null;
    state.error = null;
    render();
    try {
      const [detail, candles] = await Promise.all([
        api(`/api/opportunity-detail/${encodeURIComponent(symbol)}`),
        api(`/api/candles/${encodeURIComponent(symbol)}?timeframe=1d&limit=90`).catch(() => null)
      ]);
      state.detail = {
        ...(detail.data || {}),
        candles: candles?.data || []
      };
      state.error = null;
    } catch (e) {
      state.error = e.message || "Detail indisponible";
    } finally {
      state.loadingDetail = false;
      render();
    }
  }

  // =========================
  // trades
  // =========================
  function getOpenPnl(position, livePrice) {
    if (position.entryPrice == null || livePrice == null || !position.quantity) return { pnl: null, pnlPct: null };
    const priceDiff = position.side === "short" ? (position.entryPrice - livePrice) : (livePrice - position.entryPrice);
    const pnl = priceDiff * position.quantity;
    const invested = position.entryPrice * position.quantity;
    const pnlPct = invested ? (pnl / invested) * 100 : null;
    return { pnl, pnlPct };
  }

  function addTrainingTradeFromDetail(side) {
    const d = state.detail;
    if (!d || d.price == null) {
      state.error = "Impossible d'ajouter ce trade pour le moment.";
      render();
      return;
    }
    const quantity = d.price > 500 ? 1 : d.price > 50 ? 2 : 10;
    const position = {
      id: uid("pos"),
      symbol: d.symbol,
      name: d.name,
      assetClass: d.assetClass,
      side,
      quantity,
      entryPrice: d.price,
      openedAt: nowIso(),
      sourceUsed: d.sourceUsed || null
    };
    state.trades.positions.unshift(position);
    persistTradesState();
    state.error = `Trade d'entrainement ajoute : ${d.symbol} (${side})`;
    render();
  }

  function closeTrainingTrade(id, livePrice = null) {
    const idx = state.trades.positions.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const position = state.trades.positions[idx];
    const exitPrice = livePrice ?? position.entryPrice;
    const { pnl, pnlPct } = getOpenPnl(position, exitPrice);
    const closed = {
      ...position,
      exitPrice,
      closedAt: nowIso(),
      pnl,
      pnlPct
    };
    state.trades.positions.splice(idx, 1);
    state.trades.history.unshift(closed);
    persistTradesState();
    render();
  }

  function trainingStats() {
    const positions = state.trades.positions;
    const history = state.trades.history;
    const realized = history.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = history.filter((t) => (t.pnl || 0) > 0).length;
    const total = history.length;
    return {
      openCount: positions.length,
      closedCount: history.length,
      realized,
      winRate: total ? (wins / total) * 100 : null
    };
  }

  function applyFilter() {
    const f = state.opportunityFilter;
    state.filteredOpportunities = state.opportunities.filter(item => f === "all" ? true : item.assetClass === f);
  }

  // =========================
  // navigation
  // =========================
  function navigate(route, symbol = null) {
    state.route = route;
    if (symbol) state.selectedSymbol = symbol;

    if (route === "opportunities") {
      state.error = null;
      loadOpportunities(true);
    } else if (route === "asset-detail" && symbol) {
      loadDetail(symbol);
    } else {
      render();
    }
  }

  // =========================
  // render primitives
  // =========================
  function renderSidebar() {
    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">M</div>
          <div class="logo-text">ManiTrade<strong>Pro</strong></div>
        </div>
        <nav class="nav-list">
          ${navItems.map(([route, label, icon]) => `
            <button class="nav-item ${state.route === route ? "active" : ""}" data-route="${route}">
              <span>${icon}</span><span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-status"><span class="status-dot"></span><span>Donnees reelles uniquement</span></div>
      </aside>`;
  }

  function renderBottomNav() {
    return `<nav class="bottom-nav"><div class="bottom-wrap">
      ${navItems.map(([route, label, icon]) => `
        <button class="bnav-item ${state.route === route ? "active" : ""}" data-route="${route}">
          <span>${icon}</span><span>${label}</span>
        </button>`).join("")}
    </div></nav>`;
  }

  function renderOppRow(item, rank) {
    const changeClass = item.change24hPct > 0 ? "up" : item.change24hPct < 0 ? "down" : "";
    const statusCls = item.scoreStatus === "complete" ? "complete" : item.scoreStatus === "partial" ? "partial" : "unavailable";
    return `
      <div class="opp-row ${state.settings.compactCards ? "compact" : ""}" data-symbol="${safeText(item.symbol)}">
        <div class="opp-rank">#${rank}</div>
        <div class="asset-main">
          <div class="asset-icon">${safeText((item.symbol || "").slice(0, 4))}</div>
          <div class="asset-text">
            <div class="asset-symbol">${safeText(item.symbol)}</div>
            <div class="asset-name">${safeText(item.name || "Nom indisponible")}</div>
          </div>
        </div>
        <div class="score-box">
          ${scoreRing(item.score)}
          <div class="score-meta">
            ${badge(item.direction || "n/a", item.direction || "")}
            ${badge(item.scoreStatus || "n/a", statusCls)}
          </div>
        </div>
        <div class="price-col">
          <div class="price">${item.price != null ? money(item.price, "USD") : "Donnee indisponible"}</div>
          <div class="change ${changeClass}">${pct(item.change24hPct)}</div>
          ${item.error ? `<div class="muted" style="font-size:12px;margin-top:6px">${safeText(item.error)}</div>` : ""}
        </div>
        <div class="meta-col">
          ${badge(item.assetClass, item.assetClass)}
          ${badge(item.confidence || "low")}
          ${state.settings.showSourceBadges ? badge(item.sourceUsed || "source?") : ""}
          ${state.settings.showSourceBadges ? badge(item.freshness || "unknown", item.freshness || "") : ""}
        </div>
      </div>`;
  }

  function renderDashboard() {
    const top = state.opportunities.filter(x => x.price != null).slice(0, 5);
    const fg = state.dashboard.fearGreed;
    const trending = state.dashboard.trending;
    const stats = trainingStats();

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">Socle propre, donnees reelles, suivi d'entrainement separe.</div>
        </div>

        <div class="hero">
          <div class="hero-label">Entrainement</div>
          <div class="hero-value">${stats.openCount} position${stats.openCount > 1 ? "s" : ""} ouverte${stats.openCount > 1 ? "s" : ""}</div>
          <div class="hero-meta">
            ${badge("Training", "live")}
            ${badge(`Historique ${stats.closedCount}`, "recent")}
            ${badge(`Realise ${money(stats.realized, "USD")}`)}
          </div>
        </div>

        <div class="grid" style="margin-bottom:22px">
          <div class="stat-card"><div class="stat-label">Opportunites visibles</div><div class="stat-value">${state.opportunities.length}</div></div>
          <div class="stat-card"><div class="stat-label">Fear & Greed</div><div class="stat-value">${fg ? safeText(fg.value) : "—"}</div></div>
          <div class="stat-card"><div class="stat-label">Trending</div><div class="stat-value">${trending.length}</div></div>
          <div class="stat-card"><div class="stat-label">Win rate training</div><div class="stat-value">${stats.winRate == null ? "—" : pct(stats.winRate)}</div></div>
        </div>

        <div class="section-title"><span>Top opportunites</span><button class="btn" data-route="opportunities">Voir tout</button></div>
        ${top.length ? `<div class="opp-list">${top.map((item, idx) => renderOppRow(item, idx + 1)).join("")}</div>` : `<div class="empty-state">Aucune opportunite chargee.</div>`}
      </div>`;
  }

  function renderOpportunities() {
    const filters = ["all", "crypto", "stock", "etf", "forex", "commodity"];
    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Opportunites</div>
          <div class="screen-subtitle">Tri propre, source, confiance, lecture rapide.</div>
        </div>
        <div class="controls">
          ${filters.map(f => `<button class="btn ${state.opportunityFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>`).join("")}
          <button class="btn" data-refresh="opportunities">Rafraichir</button>
        </div>
        ${state.error ? `<div class="error-box">${safeText(state.error)}</div>` : ""}
        ${state.loading ? `<div class="loading-state">Chargement des opportunites...</div>` :
          state.filteredOpportunities.length ? `<div class="opp-list">${state.filteredOpportunities.map((item, idx) => renderOppRow(item, idx + 1)).join("")}</div>` :
          `<div class="empty-state">Aucune opportunite disponible.</div>`
        }
      </div>`;
  }

  function renderChart(candles) {
    if (!candles || !candles.length) return `<div class="empty-state">Aucune bougie disponible.</div>`;
    const closes = candles.map(c => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const width = 900, height = 240, pad = 10;
    const pts = closes.map((v, i) => {
      const x = pad + i * ((width - pad * 2) / Math.max(1, closes.length - 1));
      const y = height - pad - ((v - min) / Math.max(1e-9, max - min)) * (height - pad * 2);
      return `${x},${y}`;
    }).join(" ");
    const lineColor = closes[closes.length - 1] >= closes[0] ? "var(--profit)" : "var(--loss)";
    return `
      <div class="chart-wrap">
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--bg-elevated)" stroke-width="1" points="${pad},${pad} ${width - pad},${pad}"/>
          <polyline fill="none" stroke="${lineColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
        </svg>
      </div>`;
  }

  function renderDetail() {
    const d = state.detail;
    return `
      <div class="screen">
        <div class="section-title"><button class="btn" data-route="opportunities">← Retour</button><span>Detail actif</span></div>
        ${state.loadingDetail ? `<div class="loading-state">Chargement du detail...</div>` : ""}
        ${state.error ? `<div class="error-box">${safeText(state.error)}</div>` : ""}
        ${d ? `
          <div class="detail-layout">
            <div>
              <div class="card" style="margin-bottom:18px">
                <div class="detail-head">
                  <div class="detail-title-wrap">
                    <div class="detail-icon">${safeText((d.symbol || "").slice(0, 4))}</div>
                    <div>
                      <div class="detail-title">${safeText(d.symbol)}</div>
                      <div class="detail-sub">${safeText(d.name || "")}</div>
                    </div>
                  </div>
                  <div>
                    <div class="detail-price">${d.price != null ? money(d.price, "USD") : "Donnee indisponible"}</div>
                    <div class="change ${d.change24hPct > 0 ? 'up' : d.change24hPct < 0 ? 'down' : ''}" style="text-align:right">${pct(d.change24hPct)}</div>
                  </div>
                </div>
                <div class="legend">
                  ${badge(d.assetClass, d.assetClass)}
                  ${badge(d.direction || "n/a", d.direction || "")}
                  ${badge(d.scoreStatus || "n/a", d.scoreStatus || "")}
                  ${badge(d.confidence || "low")}
                  ${state.settings.showSourceBadges ? badge(d.sourceUsed || "source?") : ""}
                  ${state.settings.showSourceBadges ? badge(d.freshness || "unknown", d.freshness || "") : ""}
                </div>
                <div class="trade-actions">
                  <button class="btn trade-btn long" data-add-trade="long">Ajouter training long</button>
                  <button class="btn trade-btn short" data-add-trade="short">Ajouter training short</button>
                </div>
              </div>

              <div class="card">
                <div class="section-title"><span>Graphique 90 bougies</span><span>${d.candleCount || 0} bougies</span></div>
                ${renderChart(d.candles)}
              </div>
            </div>

            <div>
              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>Score detaille</span><span>${d.score != null ? d.score : "—"}</span></div>
                <div class="score-box" style="margin-bottom:14px">
                  ${scoreRing(d.score)}
                  <div class="score-meta">
                    <div style="font-weight:700">${safeText(d.analysisLabel || "Analyse indisponible")}</div>
                    <div class="muted">Confiance : ${safeText(d.confidence || "low")}</div>
                  </div>
                </div>
                ${state.settings.showScoreBreakdown ? `
                  <div class="breakdown">
                    ${Object.entries(d.breakdown || {}).map(([k, v]) => `
                      <div class="break-item">
                        <div class="break-name">${safeText(k)}</div>
                        <div class="break-value">${safeText(Math.round(v))}</div>
                      </div>`).join("")}
                  </div>` : `<div class="muted">Le detail du score est masque dans les reglages.</div>`
                }
              </div>

              <div class="card">
                <div class="section-title"><span>Infos source</span></div>
                <div class="kv">
                  <div class="muted">Source utilisee</div><div>${safeText(d.sourceUsed || "—")}</div>
                  <div class="muted">Fraicheur</div><div>${safeText(d.freshness || "unknown")}</div>
                  <div class="muted">Variation 24h</div><div>${pct(d.change24hPct)}</div>
                  <div class="muted">Classe d'actif</div><div>${safeText(d.assetClass || "—")}</div>
                  <div class="muted">Score status</div><div>${safeText(d.scoreStatus || "—")}</div>
                  <div class="muted">Interpretation</div><div>${safeText(d.analysisLabel || "—")}</div>
                </div>
              </div>
            </div>
          </div>
        ` : (!state.loadingDetail ? `<div class="empty-state">Aucun detail charge.</div>` : "")}
      </div>`;
  }

  function renderPositionRow(position) {
    const liveMatch = state.opportunities.find((o) => o.symbol === position.symbol);
    const livePrice = liveMatch?.price ?? position.entryPrice;
    const { pnl, pnlPct } = getOpenPnl(position, livePrice);
    return `
      <div class="trade-row">
        <div>
          <div class="trade-symbol">${safeText(position.symbol)}</div>
          <div class="trade-sub">${safeText(position.name || "")}</div>
        </div>
        <div>${badge(position.side, position.side)}</div>
        <div>${num(position.quantity, 4)}</div>
        <div>${money(position.entryPrice, "USD")}</div>
        <div>${money(livePrice, "USD")}</div>
        <div class="${(pnl || 0) >= 0 ? 'positive' : 'negative'}">${pnl == null ? "—" : money(pnl, "USD")} / ${pct(pnlPct)}</div>
        <div><button class="btn" data-close-trade="${safeText(position.id)}">Cloturer</button></div>
      </div>`;
  }

  function renderHistoryRow(item) {
    return `
      <div class="trade-row history">
        <div>
          <div class="trade-symbol">${safeText(item.symbol)}</div>
          <div class="trade-sub">${new Date(item.closedAt).toLocaleString("fr-FR")}</div>
        </div>
        <div>${badge(item.side, item.side)}</div>
        <div>${num(item.quantity, 4)}</div>
        <div>${money(item.entryPrice, "USD")}</div>
        <div>${money(item.exitPrice, "USD")}</div>
        <div class="${(item.pnl || 0) >= 0 ? 'positive' : 'negative'}">${money(item.pnl, "USD")} / ${pct(item.pnlPct)}</div>
        <div>${safeText(item.sourceUsed || "training")}</div>
      </div>`;
  }

  function renderPortfolio() {
    const stats = trainingStats();
    const positions = state.trades.positions;
    const history = state.trades.history;

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Mes trades</div>
          <div class="screen-subtitle">Separation propre entre entrainement et reel. Le reel reste vide tant qu'aucune source n'est branchee.</div>
        </div>

        <div class="controls">
          <button class="btn ${state.trades.mode === 'training' ? 'active' : ''}" data-trade-mode="training">Entrainement</button>
          <button class="btn ${state.trades.mode === 'real' ? 'active' : ''}" data-trade-mode="real">Reel</button>
        </div>

        ${state.trades.mode === "real" ? `
          <div class="empty-state">Le portefeuille reel n'est pas encore branche. Cette brique est reservee pour la suite.</div>
        ` : `
          <div class="grid trades-stats">
            <div class="stat-card"><div class="stat-label">Positions ouvertes</div><div class="stat-value">${stats.openCount}</div></div>
            <div class="stat-card"><div class="stat-label">Historique ferme</div><div class="stat-value">${stats.closedCount}</div></div>
            <div class="stat-card"><div class="stat-label">Pnl realise</div><div class="stat-value">${money(stats.realized, "USD")}</div></div>
            <div class="stat-card"><div class="stat-label">Win rate</div><div class="stat-value">${stats.winRate == null ? "—" : pct(stats.winRate)}</div></div>
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Positions ouvertes</span><span>${positions.length}</span></div>
            ${positions.length ? `
              <div class="trade-table">
                <div class="trade-row trade-head">
                  <div>Actif</div><div>Sens</div><div>Qté</div><div>Entrée</div><div>Live</div><div>Pnl</div><div>Action</div>
                </div>
                ${positions.map(renderPositionRow).join("")}
              </div>
            ` : `<div class="empty-state">Aucune position ouverte. Ouvre un actif puis ajoute un trade d'entrainement.</div>`}
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Historique</span><span>${history.length}</span></div>
            ${history.length ? `
              <div class="trade-table">
                <div class="trade-row trade-head">
                  <div>Actif</div><div>Sens</div><div>Qté</div><div>Entrée</div><div>Sortie</div><div>Pnl</div><div>Source</div>
                </div>
                ${history.map(renderHistoryRow).join("")}
              </div>
            ` : `<div class="empty-state">Aucun trade cloture pour le moment.</div>`}
          </div>
        `}
      </div>`;
  }

  function renderSettings() {
    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Reglages</div>
          <div class="screen-subtitle">Les reglages pilotent l'UI sans salir la logique metier.</div>
        </div>

        <div class="card">
          <div class="setting-list">
            <label class="setting-row">
              <div>
                <div class="setting-title">Refresh opportunites</div>
                <div class="setting-desc">Recharge automatiquement la liste quand tu entres dans l'ecran Opportunites.</div>
              </div>
              <input type="checkbox" data-setting-toggle="autoRefreshOpportunities" ${state.settings.autoRefreshOpportunities ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher source et fraicheur</div>
                <div class="setting-desc">Montre les badges fournisseur et fraicheur sur les cartes.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showSourceBadges" ${state.settings.showSourceBadges ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher le breakdown du score</div>
                <div class="setting-desc">Affiche les sous-composants du score detaille dans la fiche actif.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showScoreBreakdown" ${state.settings.showScoreBreakdown ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Cartes compactes</div>
                <div class="setting-desc">Resserre un peu les cartes opportunites.</div>
              </div>
              <input type="checkbox" data-setting-toggle="compactCards" ${state.settings.compactCards ? "checked" : ""}>
            </label>
          </div>
        </div>
      </div>`;
  }

  function renderMain() {
    switch (state.route) {
      case "dashboard": return renderDashboard();
      case "opportunities": return renderOpportunities();
      case "asset-detail": return renderDetail();
      case "portfolio": return renderPortfolio();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  }

  function render() {
    app.innerHTML = `
      <div class="app-shell ${state.settings.compactCards ? "compact-ui" : ""}">
        ${renderSidebar()}
        <main class="main-content">${renderMain()}</main>
        ${renderBottomNav()}
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    app.querySelectorAll("[data-route]").forEach(el => {
      el.addEventListener("click", () => {
        const route = el.getAttribute("data-route");
        if (route === "opportunities" && state.settings.autoRefreshOpportunities) {
          navigate("opportunities");
        } else {
          state.route = route;
          render();
        }
      });
    });

    app.querySelectorAll("[data-filter]").forEach(el => {
      el.addEventListener("click", () => {
        state.opportunityFilter = el.getAttribute("data-filter");
        applyFilter();
        render();
      });
    });

    app.querySelectorAll("[data-refresh='opportunities']").forEach(el => {
      el.addEventListener("click", () => loadOpportunities(true));
    });

    app.querySelectorAll(".opp-row[data-symbol]").forEach(el => {
      el.addEventListener("click", () => navigate("asset-detail", el.getAttribute("data-symbol")));
    });

    app.querySelectorAll("[data-add-trade]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        addTrainingTradeFromDetail(el.getAttribute("data-add-trade"));
      });
    });

    app.querySelectorAll("[data-close-trade]").forEach(el => {
      el.addEventListener("click", () => closeTrainingTrade(el.getAttribute("data-close-trade")));
    });

    app.querySelectorAll("[data-trade-mode]").forEach(el => {
      el.addEventListener("click", () => {
        state.trades.mode = el.getAttribute("data-trade-mode");
        render();
      });
    });

    app.querySelectorAll("[data-setting-toggle]").forEach(el => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-setting-toggle");
        state.settings[key] = el.checked;
        persistSettings();
        render();
      });
    });
  }

  async function boot() {
    loadTradesState();
    render();
    await loadDashboard();
    render();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  boot();
})();
