(() => {
  const API_BASE = "https://manitradepro.emmanueldelasse.workers.dev";
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
    }
  };

  const app = document.getElementById("app");

  const navItems = [
    ["dashboard","Accueil","⌂"],
    ["opportunities","Opportunites","◎"],
    ["portfolio","Mes trades","◫"],
    ["settings","Reglages","◦"]
  ];

  function safeText(v) {
    return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function money(v, currency="USD") {
    if (v == null || Number.isNaN(v)) return "Donnee indisponible";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: v > 999 ? 0 : 2 }).format(v);
  }

  function num(v, digits=2) {
    if (v == null || Number.isNaN(v)) return "—";
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v);
  }

  function pct(v) {
    if (v == null || Number.isNaN(v)) return "—";
    const sign = v > 0 ? "+" : "";
    return `${sign}${num(v,2)}%`;
  }

  function scoreColor(score) {
    if (score == null) return "var(--neutral)";
    if (score >= 70) return "var(--profit)";
    if (score >= 50) return "#f5a623";
    return "var(--loss)";
  }

  function badge(label, cls="") {
    return `<span class="badge ${cls}">${safeText(label)}</span>`;
  }

  function scoreRing(score) {
    const value = score == null ? 0 : Math.max(0, Math.min(100, score));
    const size = 48;
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

  function applyFilter() {
    const f = state.opportunityFilter;
    state.filteredOpportunities = state.opportunities.filter(item => f === "all" ? true : item.assetClass === f);
  }

  function navigate(route, symbol=null) {
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

  function renderSidebar() {
    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">M</div>
          <div class="logo-text">ManiTrade<strong>Pro</strong></div>
        </div>
        <nav class="nav-list">
          ${navItems.map(([route,label,icon]) => `
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
      ${navItems.map(([route,label,icon]) => `
        <button class="bnav-item ${state.route === route ? "active" : ""}" data-route="${route}">
          <span>${icon}</span><span>${label}</span>
        </button>`).join("")}
    </div></nav>`;
  }

  function renderDashboard() {
    const top = state.opportunities.filter(x => x.price != null).slice(0, 5);
    const fg = state.dashboard.fearGreed;
    const portfolio = state.dashboard.portfolio;
    const trending = state.dashboard.trending;
    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">Base propre, donnees reelles, aucun faux fallback.</div>
        </div>

        <div class="hero">
          <div class="hero-label">Portefeuille reel</div>
          <div class="hero-value">${portfolio?.totalEquity != null ? money(portfolio.totalEquity, "EUR") : "Aucune source reelle connectee"}</div>
          <div class="hero-meta">
            ${badge("Reel", "live")}
            ${badge("Source portefeuille non configuree", "recent")}
          </div>
        </div>

        <div class="grid" style="margin-bottom:22px">
          <div class="stat-card"><div class="stat-label">Opportunites visibles</div><div class="stat-value">${state.opportunities.length}</div></div>
          <div class="stat-card"><div class="stat-label">Fear & Greed</div><div class="stat-value">${fg ? safeText(fg.value) : "—"}</div></div>
          <div class="stat-card"><div class="stat-label">Trending</div><div class="stat-value">${trending.length}</div></div>
          <div class="stat-card"><div class="stat-label">Top signal</div><div class="stat-value">${top[0]?.symbol || "—"}</div></div>
        </div>

        <div class="section-title"><span>Top opportunites</span><button class="btn" data-route="opportunities">Voir tout</button></div>
        ${top.length ? `<div class="opp-list">${top.map((item, idx) => renderOppRow(item, idx+1)).join("")}</div>` : `<div class="empty-state">Aucune opportunite chargee.</div>`}
      </div>`;
  }

  function renderOppRow(item, rank) {
    const changeClass = item.change24hPct > 0 ? "up" : item.change24hPct < 0 ? "down" : "";
    const statusCls = item.scoreStatus === "complete" ? "complete" : item.scoreStatus === "partial" ? "partial" : "unavailable";
    return `
      <div class="opp-row" data-symbol="${safeText(item.symbol)}">
        <div class="opp-rank">#${rank}</div>
        <div class="asset-main">
          <div class="asset-icon">${safeText((item.symbol || "").slice(0,4))}</div>
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
          ${badge(item.sourceUsed || "source?")}
          ${badge(item.freshness || "unknown", item.freshness || "")}
        </div>
      </div>`;
  }

  function renderOpportunities() {
    const filters = ["all","crypto","stock","etf","forex","commodity"];
    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Opportunites</div>
          <div class="screen-subtitle">Bloc 1: score visible, confiance, source, fraicheur, tri propre.</div>
        </div>
        <div class="controls">
          ${filters.map(f => `<button class="btn ${state.opportunityFilter===f?'active':''}" data-filter="${f}">${f}</button>`).join("")}
          <button class="btn" data-refresh="opportunities">Rafraichir</button>
        </div>
        ${state.error ? `<div class="error-box">${safeText(state.error)}</div>` : ""}
        ${state.loading ? `<div class="loading-state">Chargement des opportunites...</div>` :
          state.filteredOpportunities.length ? `<div class="opp-list">${state.filteredOpportunities.map((item, idx) => renderOppRow(item, idx+1)).join("")}</div>` :
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
      const x = pad + i * ((width - pad*2) / Math.max(1, closes.length - 1));
      const y = height - pad - ((v - min) / Math.max(1e-9, max - min)) * (height - pad*2);
      return `${x},${y}`;
    }).join(" ");
    const lineColor = closes[closes.length-1] >= closes[0] ? "var(--profit)" : "var(--loss)";
    return `
      <div class="chart-wrap">
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--bg-elevated)" stroke-width="1" points="${pad},${pad} ${width-pad},${pad}"/>
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
                    <div class="detail-icon">${safeText((d.symbol || "").slice(0,4))}</div>
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
                  ${badge(d.sourceUsed || "source?")}
                  ${badge(d.freshness || "unknown", d.freshness || "")}
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
                <div class="breakdown">
                  ${Object.entries(d.breakdown || {}).map(([k,v]) => `
                    <div class="break-item">
                      <div class="break-name">${safeText(k)}</div>
                      <div class="break-value">${safeText(Math.round(v))}</div>
                    </div>`).join("")}
                </div>
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

  function renderPortfolio() {
    return `<div class="screen">
      <div class="screen-header"><div class="screen-title">Mes trades</div><div class="screen-subtitle">Portefeuille reel non branche: etat vide honnete.</div></div>
      <div class="empty-state">Aucune source portefeuille reel configuree.</div>
    </div>`;
  }

  function renderSettings() {
    return `<div class="screen">
      <div class="screen-header"><div class="screen-title">Reglages</div><div class="screen-subtitle">Configuration simplifiee.</div></div>
      <div class="card"><div class="kv">
        <div class="muted">API backend</div><div>${safeText(API_BASE)}</div>
        <div class="muted">Mode</div><div>Donnees reelles uniquement</div>
        <div class="muted">Opportunites</div><div>Liste legere + detail a la demande</div>
      </div></div>
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
      <div class="app-shell">
        ${renderSidebar()}
        <main class="main-content">${renderMain()}</main>
        ${renderBottomNav()}
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    app.querySelectorAll("[data-route]").forEach(el => {
      el.addEventListener("click", () => navigate(el.getAttribute("data-route")));
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
  }

  async function boot() {
    render();
    await loadDashboard();
    render();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  boot();
})();
