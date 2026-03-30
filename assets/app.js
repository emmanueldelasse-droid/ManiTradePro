(() => {
  const API_BASE = "https://manitradepro.emmanueldelasse.workers.dev";
  const STORAGE_KEYS = {
    trainingPositions: "mtp_training_positions_v1",
    trainingHistory: "mtp_training_history_v1",
    settings: "mtp_settings_v1",
    algoJournal: "mtp_algo_journal_v1"
  };

  const defaultSettings = {
    autoRefreshOpportunities: true,
    showSourceBadges: true,
    showScoreBreakdown: true,
    compactCards: false,
    displayCurrency: "EUR_PLUS_USD"
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
    algoJournal: [],
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
    state.algoJournal = readJson(STORAGE_KEYS.algoJournal, []);
  }

  function persistTradesState() {
    writeJson(STORAGE_KEYS.trainingPositions, state.trades.positions);
    writeJson(STORAGE_KEYS.trainingHistory, state.trades.history);
    writeJson(STORAGE_KEYS.algoJournal, state.algoJournal);
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

  function fxRateUsdToEur() {
    return 0.92;
  }

  function priceDisplay(vUsd) {
    if (vUsd == null || Number.isNaN(vUsd)) return "Donnee indisponible";
    const eur = vUsd * fxRateUsdToEur();
    const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
    if (mode === "EUR") return money(eur, "EUR");
    if (mode === "USD") return money(vUsd, "USD");
    return `${money(eur, "EUR")} <span class="muted">(${money(vUsd, "USD")})</span>`;
  }

  function currencyLabel() {
    const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
    if (mode === "EUR") return "Euro";
    if (mode === "USD") return "Dollar";
    return "Euro + dollar";
  }

  function simpleDirectionLabel(direction, score) {
    if (direction === "long") return score != null && score >= 60 ? "hausse probable" : "legere hausse";
    if (direction === "short") return score != null && score <= 40 ? "baisse probable" : "legere baisse";
    return "pas de tendance claire";
  }

  function simpleConfidenceLabel(value) {
    if (value === "high") return "elevee";
    if (value === "medium") return "moyenne";
    if (value === "low") return "faible";
    return "faible";
  }

  function simpleFreshnessLabel(value) {
    if (value === "live") return "en direct";
    if (value === "recent") return "recent";
    return "inconnu";
  }

  function simpleScoreStatusLabel(value) {
    if (value === "complete") return "complet";
    if (value === "partial") return "partiel";
    if (value === "unavailable") return "indisponible";
    return value || "indisponible";
  }

  function simpleAssetClassLabel(value) {
    const map = {
      crypto: "crypto",
      stock: "action",
      etf: "ETF",
      forex: "devise",
      commodity: "matiere premiere",
      unknown: "inconnu"
    };
    return map[value] || value || "inconnu";
  }

  function simpleAnalysisLabel(value) {
    const map = {
      "Constructive bullish bias": "biais haussier leger",
      "Constructive bearish bias": "biais baissier leger",
      "Bullish setup": "signal haussier",
      "Bearish setup": "signal baissier",
      "Early bullish setup": "debut de signal haussier",
      "Early bearish setup": "debut de signal baissier",
      "No clear direction": "pas de tendance claire",
      "Positive price change": "hausse du prix",
      "Negative price change": "baisse du prix",
      "Flat price change": "prix stable",
      "Real quote available": "prix reel disponible",
      "Source temporarily unavailable": "source temporairement indisponible"
    };
    return map[value] || value || "Analyse indisponible";
  }

  function breakdownLabel(key) {
    const map = {
      regime: "contexte marche",
      trend: "tendance",
      momentum: "elan",
      entryQuality: "qualite d'entree",
      risk: "risque",
      participation: "activite"
    };
    return map[key] || key;
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


function simpleSideLabel(side) {
  if (side === "long") return "hausse";
  if (side === "short") return "baisse";
  return "neutre";
}

function horizonLabel(days) {
  if (days <= 2) return "court terme";
  if (days <= 10) return "quelques jours";
  return "quelques semaines";
}

function averageRange(candles, count = 14) {
  const recent = (candles || []).slice(-count);
  if (!recent.length) return null;
  const ranges = recent
    .map((c) => (Number.isFinite(c?.high) && Number.isFinite(c?.low)) ? (c.high - c.low) : null)
    .filter((v) => v != null);
  if (!ranges.length) return null;
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

function generateTradePlan(detail) {
  if (!detail || detail.price == null) return null;

  const score = detail.score ?? null;
  const direction = detail.direction ?? null;
  const confidence = detail.confidence || "low";
  const breakdown = detail.breakdown || {};
  const momentum = breakdown.momentum ?? 50;
  const entryQuality = breakdown.entryQuality ?? 50;
  const trend = breakdown.trend ?? 50;
  const regime = breakdown.regime ?? 50;
  const risk = breakdown.risk ?? 50;

  const avgRange = averageRange(detail.candles || [], 14);
  const fallbackVol = detail.price * 0.025;
  const vol = avgRange && avgRange > 0 ? avgRange : fallbackVol;

  let decision = "Aucun trade conseille";
  let side = null;
  let reason = "Le signal est trop faible ou trop flou.";
  let urgency = "a surveiller";
  let timing = "moyen";

  if (score != null && score >= 65 && direction === "long" && entryQuality >= 58 && risk >= 45) {
    decision = "Trade conseille";
    side = "long";
    reason = "Hausse probable, entree encore correcte et risque acceptable.";
    urgency = "a prendre maintenant";
    timing = entryQuality >= 68 ? "bon" : "moyen";
  } else if (score != null && score <= 35 && direction === "short" && entryQuality >= 55 && risk >= 45) {
    decision = "Trade conseille";
    side = "short";
    reason = "Baisse probable, timing correct et risque encore acceptable.";
    urgency = "a prendre maintenant";
    timing = entryQuality >= 68 ? "bon" : "moyen";
  } else if (score != null && ((direction === "long" && score >= 54) || (direction === "short" && score <= 46))) {
    decision = "Trade possible";
    side = direction;
    reason = "Le signal existe, mais il n'est pas encore assez propre pour etre fort.";
    urgency = "a envisager";
    timing = entryQuality >= 62 ? "bon" : "moyen";
  } else if (score != null && momentum >= 58 && trend >= 48 && regime >= 48) {
    decision = "A surveiller";
    side = "long";
    reason = "Le contexte devient interessant, mais l'entree n'est pas encore assez propre.";
    urgency = "a surveiller";
    timing = "trop tot";
  } else if (score != null && momentum <= 42 && trend <= 48 && regime <= 48) {
    decision = "A surveiller";
    side = "short";
    reason = "Le biais baissier se construit, mais le trade n'est pas encore assez net.";
    urgency = "a surveiller";
    timing = "trop tot";
  }

  if (!side) {
    return {
      decision,
      side: null,
      entry: null,
      stopLoss: null,
      takeProfit: null,
      rr: null,
      confidence: simpleConfidenceLabel(confidence),
      urgency,
      timing,
      horizon: "a definir",
      reason,
      refusalReason: "Pas de trade conseille tant que le signal n'est pas plus propre."
    };
  }

  const riskDistance = Math.max(vol * 0.9, detail.price * 0.012);
  const rewardDistance = decision === "Trade conseille" ? riskDistance * 2.2 : riskDistance * 1.6;
  const entry = detail.price;
  const stopLoss = side === "long" ? entry - riskDistance : entry + riskDistance;
  const takeProfit = side === "long" ? entry + rewardDistance : entry - rewardDistance;
  const rr = rewardDistance / riskDistance;
  const horizonDays = decision === "Trade conseille" ? (detail.assetClass === "crypto" ? 2 : 4) : 7;

  return {
    decision,
    side,
    entry,
    stopLoss,
    takeProfit,
    rr,
    confidence: simpleConfidenceLabel(confidence),
    urgency,
    timing,
    horizon: horizonLabel(horizonDays),
    reason,
    refusalReason: null
  };
}

function currentTradePlan() {
  return generateTradePlan(state.detail);
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
    sourceUsed: d.sourceUsed || null,
    stopLoss: null,
    takeProfit: null,
    tradeDecision: "manuel",
    tradeReason: "Trade cree manuellement depuis la fiche actif.",
    rr: null,
    horizon: null
  };
  state.trades.positions.unshift(position);
  state.algoJournal.unshift({
    id: uid("algo"),
    symbol: d.symbol,
    createdAt: nowIso(),
    mode: "manuel",
    score: d.score ?? null,
    decision: "manuel",
    side,
    entry: d.price,
    stopLoss: null,
    takeProfit: null,
    rr: null,
    confidence: simpleConfidenceLabel(d.confidence || "low"),
    reason: "Trade manuel depuis la fiche actif."
  });
  persistTradesState();
  state.error = `Trade d'entrainement ajoute : ${d.symbol} (${simpleSideLabel(side)})`;
  render();
}

function createRecommendedTrade() {
  const d = state.detail;
  const plan = currentTradePlan();
  if (!d || !plan || !plan.side || plan.decision === "Aucun trade conseille") {
    state.error = "Aucun trade conseille pour le moment.";
    render();
    return;
  }
  const quantity = d.price > 500 ? 1 : d.price > 50 ? 2 : 10;
  const position = {
    id: uid("pos"),
    symbol: d.symbol,
    name: d.name,
    assetClass: d.assetClass,
    side: plan.side,
    quantity,
    entryPrice: plan.entry,
    openedAt: nowIso(),
    sourceUsed: d.sourceUsed || null,
    stopLoss: plan.stopLoss,
    takeProfit: plan.takeProfit,
    tradeDecision: plan.decision,
    tradeReason: plan.reason,
    rr: plan.rr,
    horizon: plan.horizon,
    confidence: plan.confidence,
    algoScore: d.score ?? null
  };
  state.trades.positions.unshift(position);
  state.algoJournal.unshift({
    id: uid("algo"),
    symbol: d.symbol,
    createdAt: nowIso(),
    mode: "conseille",
    score: d.score ?? null,
    decision: plan.decision,
    side: plan.side,
    entry: plan.entry,
    stopLoss: plan.stopLoss,
    takeProfit: plan.takeProfit,
    rr: plan.rr,
    confidence: plan.confidence,
    reason: plan.reason,
    horizon: plan.horizon
  });
  persistTradesState();
  state.error = `Trade conseille cree : ${d.symbol} (${simpleSideLabel(plan.side)})`;
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
            ${badge(simpleDirectionLabel(item.direction, item.score), item.direction || "")}
            ${badge(simpleScoreStatusLabel(item.scoreStatus || "n/a"), statusCls)}
          </div>
        </div>
        <div class="price-col">
          <div class="price">${item.price != null ? priceDisplay(item.price) : "Donnee indisponible"}</div>
          <div class="change ${changeClass}">${pct(item.change24hPct)}</div>
          ${item.error ? `<div class="muted" style="font-size:12px;margin-top:6px">${safeText(item.error)}</div>` : ""}
        </div>
        <div class="meta-col">
          ${badge(simpleAssetClassLabel(item.assetClass), item.assetClass)}
          ${badge(`fiabilite ${simpleConfidenceLabel(item.confidence || "low")}`)}
          ${state.settings.showSourceBadges ? badge(item.sourceUsed || "source?") : ""}
          ${state.settings.showSourceBadges ? badge(simpleFreshnessLabel(item.freshness || "unknown"), item.freshness || "") : ""}
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
          <div class="screen-subtitle">Interface plus claire, prix reels, lecture simple.</div>
        </div>

        <div class="hero">
          <div class="hero-label">Entrainement</div>
          <div class="hero-value">${stats.openCount} position${stats.openCount > 1 ? "s" : ""} ouverte${stats.openCount > 1 ? "s" : ""}</div>
          <div class="hero-meta">
            ${badge("Training", "live")}
            ${badge(`Historique des trades ${stats.closedCount}`, "recent")}
            ${badge(`Realise ${money(stats.realized * fxRateUsdToEur(), "EUR")}`)}
          </div>
        </div>

        <div class="grid" style="margin-bottom:22px">
          <div class="stat-card"><div class="stat-label">Opportunites visibles</div><div class="stat-value">${state.opportunities.length}</div></div>
          <div class="stat-card"><div class="stat-label">Climat marche</div><div class="stat-value">${fg ? safeText(fg.value) : "—"}</div></div>
          <div class="stat-card"><div class="stat-label">Tendances</div><div class="stat-value">${trending.length}</div></div>
          <div class="stat-card"><div class="stat-label">Taux de reussite training</div><div class="stat-value">${stats.winRate == null ? "—" : pct(stats.winRate)}</div></div>
        </div>

        <div class="section-title"><span>Meilleures opportunites</span><button class="btn" data-route="opportunities">Voir tout</button></div>
        ${top.length ? `<div class="opp-list">${top.map((item, idx) => renderOppRow(item, idx + 1)).join("")}</div>` : `<div class="empty-state">Aucune opportunite chargee.</div>`}
      </div>`;
  }

  function renderOpportunities() {
    const filters = ["all", "crypto", "stock", "etf", "forex", "commodity"];
    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Opportunites</div>
          <div class="screen-subtitle">Lecture simple, tendance, fiabilite, source.</div>
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
        <div class="section-title"><button class="btn" data-route="opportunities">← Retour</button><span>Fiche actif</span></div>
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
                    <div class="detail-price">${d.price != null ? priceDisplay(d.price) : "Donnee indisponible"}</div>
                    <div class="change ${d.change24hPct > 0 ? 'up' : d.change24hPct < 0 ? 'down' : ''}" style="text-align:right">${pct(d.change24hPct)}</div>
                  </div>
                </div>
                <div class="legend">
                  ${badge(simpleAssetClassLabel(d.assetClass), d.assetClass)}
                  ${badge(simpleDirectionLabel(d.direction, d.score), d.direction || "")}
                  ${badge(simpleScoreStatusLabel(d.scoreStatus || "n/a"), d.scoreStatus || "")}
                  ${badge(`fiabilite ${simpleConfidenceLabel(d.confidence || "low")}`)}
                  ${state.settings.showSourceBadges ? badge(d.sourceUsed || "source?") : ""}
                  ${state.settings.showSourceBadges ? badge(simpleFreshnessLabel(d.freshness || "unknown"), d.freshness || "") : ""}
                </div>
                ${(() => {
                  const plan = currentTradePlan();
                  return `
                    <div class="plan-card">
                      <div class="section-title"><span>Plan propose par l'algo</span><span>${safeText(plan?.decision || "—")}</span></div>
                      <div class="kv plan-grid">
                        <div class="muted">Decision</div><div>${safeText(plan?.decision || "—")}</div>
                        <div class="muted">Sens</div><div>${safeText(plan?.side ? simpleSideLabel(plan.side) : "aucun")}</div>
                        <div class="muted">Entree</div><div>${plan?.entry != null ? priceDisplay(plan.entry) : "—"}</div>
                        <div class="muted">Stop</div><div>${plan?.stopLoss != null ? priceDisplay(plan.stopLoss) : "—"}</div>
                        <div class="muted">Objectif</div><div>${plan?.takeProfit != null ? priceDisplay(plan.takeProfit) : "—"}</div>
                        <div class="muted">Ratio gain / risque</div><div>${plan?.rr != null ? num(plan.rr, 2) : "—"}</div>
                        <div class="muted">Fiabilite</div><div>${safeText(plan?.confidence || "—")}</div>
                        <div class="muted">Horizon</div><div>${safeText(plan?.horizon || "—")}</div>
                        <div class="muted">Timing</div><div>${safeText(plan?.timing || "—")}</div>
                        <div class="muted">Priorite</div><div>${safeText(plan?.urgency || "—")}</div>
                      </div>
                      <div class="plan-reason">${safeText(plan?.reason || plan?.refusalReason || "Pas d'analyse disponible.")}</div>
                      <div class="trade-actions">
                        <button class="btn trade-btn primary" data-create-trade-plan ${!plan || !plan.side ? "disabled" : ""}>Creer le trade conseille</button>
                        <button class="btn trade-btn long" data-add-trade="long">Parier sur la hausse</button>
                        <button class="btn trade-btn short" data-add-trade="short">Parier sur la baisse</button>
                      </div>
                    </div>`;
                })()}
              </div>

              <div class="card">
                <div class="section-title"><span>Evolution recente</span><span>${d.candleCount || 0} bougies</span></div>
                ${renderChart(d.candles)}
              </div>
            </div>

            <div>
              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>Niveau du signal</span><span>${d.score != null ? d.score : "—"}</span></div>
                <div class="score-box" style="margin-bottom:14px">
                  ${scoreRing(d.score)}
                  <div class="score-meta">
                    <div style="font-weight:700">${safeText(simpleAnalysisLabel(d.analysisLabel || "Analyse indisponible"))}</div>
                    <div class="muted">Fiabilite : ${safeText(simpleConfidenceLabel(d.confidence || "low"))}</div>
                    <div class="muted">Decision : ${safeText(currentTradePlan()?.decision || "—")}</div>
                  </div>
                </div>
                ${state.settings.showScoreBreakdown ? `
                  <div class="breakdown">
                    ${Object.entries(d.breakdown || {}).map(([k, v]) => `
                      <div class="break-item">
                        <div class="break-name">${safeText(breakdownLabel(k))}</div>
                        <div class="break-value">${safeText(Math.round(v))}</div>
                      </div>`).join("")}
                  </div>` : `<div class="muted">Le detail du signal est masque dans les reglages.</div>`
                }
              </div>

              <div class="card">
                <div class="section-title"><span>Informations</span></div>
                <div class="kv">
                  <div class="muted">Source</div><div>${safeText(d.sourceUsed || "—")}</div>
                  <div class="muted">Mise a jour</div><div>${safeText(simpleFreshnessLabel(d.freshness || "unknown"))}</div>
                  <div class="muted">Variation 24h</div><div>${pct(d.change24hPct)}</div>
                  <div class="muted">Type d'actif</div><div>${safeText(simpleAssetClassLabel(d.assetClass || "—"))}</div>
                  <div class="muted">Etat du signal</div><div>${safeText(simpleScoreStatusLabel(d.scoreStatus || "—"))}</div>
                  <div class="muted">Lecture simple</div><div>${safeText(simpleAnalysisLabel(d.analysisLabel || "—"))}</div>
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
    <div class="trade-row trade-row-wide">
      <div>
        <div class="trade-symbol">${safeText(position.symbol)}</div>
        <div class="trade-sub">${safeText(position.name || "")}</div>
      </div>
      <div>${badge(simpleSideLabel(position.side), position.side)}</div>
      <div>${num(position.quantity, 4)}</div>
      <div>${priceDisplay(position.entryPrice)}</div>
      <div>${priceDisplay(livePrice)}</div>
      <div>${position.stopLoss != null ? priceDisplay(position.stopLoss) : "—"}</div>
      <div>${position.takeProfit != null ? priceDisplay(position.takeProfit) : "—"}</div>
      <div>${position.rr != null ? num(position.rr, 2) : "—"}</div>
      <div class="${(pnl || 0) >= 0 ? 'positive' : 'negative'}">${pnl == null ? "—" : money(pnl * fxRateUsdToEur(), "EUR")} / ${pct(pnlPct)}</div>
      <div><button class="btn" data-close-trade="${safeText(position.id)}">Cloturer</button></div>
    </div>
    <div class="trade-note">
      <span class="muted">Decision : </span>${safeText(position.tradeDecision || "manuel")} ·
      <span class="muted">Horizon : </span>${safeText(position.horizon || "—")} ·
      <span class="muted">Raison : </span>${safeText(position.tradeReason || "—")}
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
        <div>${priceDisplay(item.entryPrice)}</div>
        <div>${priceDisplay(item.exitPrice)}</div>
        <div class="${(item.pnl || 0) >= 0 ? 'positive' : 'negative'}">${money((item.pnl || 0) * fxRateUsdToEur(), "EUR")} / ${pct(item.pnlPct)}</div>
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
          <div class="screen-subtitle">Separation simple entre entrainement et reel. Le reel reste vide tant qu'aucune source n'est branchee.</div>
        </div>

        <div class="controls">
          <button class="btn ${state.trades.mode === 'training' ? 'active' : ''}" data-trade-mode="training">Entrainement</button>
          <button class="btn ${state.trades.mode === 'real' ? 'active' : ''}" data-trade-mode="real">Reel</button>
        </div>

        ${state.trades.mode === "real" ? `
          <div class="empty-state">Le portefeuille reel n'est pas encore branche. Cette brique est reservee pour la suite.</div>
        ` : `
          <div class="grid trades-stats">
            <div class="stat-card"><div class="stat-label">Positions en cours</div><div class="stat-value">${stats.openCount}</div></div>
            <div class="stat-card"><div class="stat-label">Historique des trades</div><div class="stat-value">${stats.closedCount}</div></div>
            <div class="stat-card"><div class="stat-label">Gain / perte realise</div><div class="stat-value">${money(stats.realized * fxRateUsdToEur(), "EUR")}</div></div>
            <div class="stat-card"><div class="stat-label">Taux de reussite</div><div class="stat-value">${stats.winRate == null ? "—" : pct(stats.winRate)}</div></div>
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Positions en cours</span><span>${positions.length}</span></div>
            ${positions.length ? `
              <div class="trade-table">
                <div class="trade-row trade-head">
                  <div>Actif</div><div>Sens</div><div>Qte</div><div>Entree</div><div>Live</div><div>Stop</div><div>Objectif</div><div>R/R</div><div>Pnl</div><div>Action</div>
                </div>
                ${positions.map(renderPositionRow).join("")}
              </div>
            ` : `<div class="empty-state">Aucune position ouverte. Ouvre une fiche actif puis cree le trade conseille ou parie sur la hausse / la baisse.</div>`}
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Historique des trades</span><span>${history.length}</span></div>
            ${history.length ? `
              <div class="trade-table">
                <div class="trade-row trade-head">
                  <div>Actif</div><div>Sens</div><div>Qte</div><div>Entree</div><div>Sortie</div><div>Stop</div><div>Objectif</div><div>R/R</div><div>Pnl</div><div>Source</div>
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
          <div class="screen-subtitle">Ces reglages servent juste a rendre l'app plus claire.</div>
        </div>

        <div class="card">
          <div class="setting-list">
            <label class="setting-row">
              <div>
                <div class="setting-title">Rafraichir les opportunites</div>
                <div class="setting-desc">Recharge automatiquement la liste quand tu entres dans l'ecran Opportunites.</div>
              </div>
              <input type="checkbox" data-setting-toggle="autoRefreshOpportunities" ${state.settings.autoRefreshOpportunities ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher source et mise a jour</div>
                <div class="setting-desc">Montre les badges fournisseur et fraicheur sur les cartes.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showSourceBadges" ${state.settings.showSourceBadges ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher le detail du signal</div>
                <div class="setting-desc">Affiche les sous-composants du score detaille dans la fiche actif.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showScoreBreakdown" ${state.settings.showScoreBreakdown ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Cartes plus compactes</div>
                <div class="setting-desc">Resserre un peu les cartes opportunites.</div>
              </div>
              <input type="checkbox" data-setting-toggle="compactCards" ${state.settings.compactCards ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Devise d'affichage</div>
                <div class="setting-desc">Choisis si tu veux voir les prix en euro, en dollar, ou les deux.</div>
              </div>
              <select class="setting-select" data-setting-select="displayCurrency">
                <option value="EUR" ${state.settings.displayCurrency === "EUR" ? "selected" : ""}>Euro</option>
                <option value="USD" ${state.settings.displayCurrency === "USD" ? "selected" : ""}>Dollar</option>
                <option value="EUR_PLUS_USD" ${state.settings.displayCurrency === "EUR_PLUS_USD" ? "selected" : ""}>Euro + dollar</option>
              </select>
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

    app.querySelectorAll("[data-create-trade-plan]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        createRecommendedTrade();
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

    app.querySelectorAll("[data-setting-select]").forEach(el => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-setting-select");
        state.settings[key] = el.value;
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
