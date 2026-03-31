(() => {
  const API_BASE = "https://manitradepro.emmanueldelasse.workers.dev";
  const STORAGE_KEYS = {
    trainingPositions: "mtp_training_positions_v1",
    trainingHistory: "mtp_training_history_v1",
    settings: "mtp_settings_v1",
    algoJournal: "mtp_algo_journal_v1",
    budgetTracker: "mtp_budget_tracker_v1",
    detailCache: "mtp_detail_cache_v1",
    opportunitiesSnapshot: "mtp_opportunities_snapshot_v1"
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
    aiReview: null,
    loading: false,
    loadingDetail: false,
    loadingAiReview: false,
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
    settings: loadSettings(),
    budget: loadBudgetTracker(),
    detailCache: readJson(STORAGE_KEYS.detailCache, {}),
    opportunitiesSnapshot: readJson(STORAGE_KEYS.opportunitiesSnapshot, [])
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

  function budgetDayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function emptyBudgetTracker() {
    return {
      day: budgetDayKey(),
      dailyLimit: 1800,
      used: 0,
      remaining: 1800,
      byRoute: {},
      seenEvents: [],
      schedule: {},
      pools: {
        opportunities: { reserved: 800, used: 0 },
        detail: { reserved: 450, used: 0 },
        candles: { reserved: 200, used: 0 },
        reserve: { reserved: 350, used: 0 }
      }
    };
  }

  function loadBudgetTracker() {
    const stored = readJson(STORAGE_KEYS.budgetTracker, null);
    const fresh = emptyBudgetTracker();
    if (!stored || stored.day !== fresh.day) return fresh;
    return {
      ...fresh,
      ...stored,
      byRoute: stored.byRoute || {},
      seenEvents: stored.seenEvents || [],
      schedule: stored.schedule || {},
      pools: {
        opportunities: { ...fresh.pools.opportunities, ...((stored.pools || {}).opportunities || {}) },
        detail: { ...fresh.pools.detail, ...((stored.pools || {}).detail || {}) },
        candles: { ...fresh.pools.candles, ...((stored.pools || {}).candles || {}) },
        reserve: { ...fresh.pools.reserve, ...((stored.pools || {}).reserve || {}) }
      }
    };
  }

  function persistBudgetTracker() {
    writeJson(STORAGE_KEYS.budgetTracker, state.budget);
  }

  function routePoolName(routeName = "") {
    if (routeName === "opportunities") return "opportunities";
    if (routeName === "detail" || routeName === "quote") return "detail";
    if (routeName === "candles") return "candles";
    return "reserve";
  }

  function recordBudgetUsage(headers) {
    if (!headers) return;
    if (state.budget.day !== budgetDayKey()) state.budget = emptyBudgetTracker();
    const eventId = headers.get("X-MTP-Budget-Event");
    const routeName = headers.get("X-MTP-Route-Name") || "unknown";
    const routeCalls = Number(headers.get("X-MTP-Twelve-Calls") || "0");
    const dailyLimit = Number(headers.get("X-MTP-Budget-Limit") || state.budget.dailyLimit || 1800);
    state.budget.dailyLimit = dailyLimit;
    if (!eventId) {
      state.budget.remaining = Math.max(0, dailyLimit - state.budget.used);
      persistBudgetTracker();
      return;
    }
    if (!state.budget.seenEvents.includes(eventId)) {
      state.budget.seenEvents.push(eventId);
      state.budget.used += routeCalls;
      if (!state.budget.byRoute[routeName]) state.budget.byRoute[routeName] = { calls: 0, events: 0 };
      state.budget.byRoute[routeName].calls += routeCalls;
      state.budget.byRoute[routeName].events += 1;
      const pool = routePoolName(routeName);
      if (state.budget.pools[pool]) state.budget.pools[pool].used += routeCalls;
      state.budget.seenEvents = state.budget.seenEvents.slice(-500);
    }
    state.budget.remaining = Math.max(0, dailyLimit - state.budget.used);
    persistBudgetTracker();
  }

  function estimatedCostForRoute(route, symbol = null) {
    if (route === "opportunities") return 1;
    if (route === "detail") return symbol && ["BTC","ETH","SOL","XRP","AAVE","NEAR","BNB","ADA","DOGE","DOT","LINK","AVAX","ATOM","LTC","MATIC","ARB","OP","UNI","FIL","ETC","BCH","APT","SUI","TAO","XAUT"].includes(String(symbol).toUpperCase()) ? 0 : 2;
    if (route === "candles") return symbol && ["BTC","ETH","SOL","XRP","AAVE","NEAR","BNB","ADA","DOGE","DOT","LINK","AVAX","ATOM","LTC","MATIC","ARB","OP","UNI","FIL","ETC","BCH","APT","SUI","TAO","XAUT"].includes(String(symbol).toUpperCase()) ? 0 : 1;
    return 0;
  }

  function budgetAdvice() {
    const remaining = state.budget.remaining ?? 0;
    if (remaining <= 50) return "Budget faible : evite les refresh inutiles.";
    if (remaining <= 200) return "Budget correct mais a surveiller.";
    return "Budget confortable.";
  }


  const CRYPTO_SYMBOLS_UI = new Set(["BTC","ETH","BNB","SOL","XRP","ADA","DOGE","DOT","LINK","AVAX","ATOM","LTC","MATIC","ARB","OP","AAVE","NEAR","UNI","FIL","ETC","BCH","APT","SUI","TAO","XAUT"]);
  const NON_CRYPTO_TRACKED_COUNT = 17;
  const TWELVE_POLICY = {
    opportunities: {
      label: "Liste opportunites non-crypto",
      cooldownMs: 5 * 60 * 1000,
      cost: 1,
      maxPerDay: 288
    },
    detail_non_crypto: {
      label: "Fiche actif non-crypto",
      cooldownMs: 60 * 60 * 1000,
      cost: 1,
      maxPerDayPerSymbol: 24
    },
    candles_non_crypto: {
      label: "Bougies non-crypto",
      cooldownMs: 12 * 60 * 60 * 1000,
      cost: 1,
      maxPerDayPerSymbol: 2
    }
  };

  function isCryptoSymbol(symbol) {
    return CRYPTO_SYMBOLS_UI.has(String(symbol || "").toUpperCase());
  }

  function scheduleKey(policyName, symbol = "") {
    return symbol ? `${policyName}:${String(symbol).toUpperCase()}` : policyName;
  }

  function getScheduleEntry(policyName, symbol = "") {
    return state.budget.schedule[scheduleKey(policyName, symbol)] || null;
  }

  function nextAllowedAt(policyName, symbol = "") {
    const policy = TWELVE_POLICY[policyName];
    const entry = getScheduleEntry(policyName, symbol);
    if (!policy || !entry || !entry.lastAt) return 0;
    return entry.lastAt + policy.cooldownMs;
  }

  function canRunScheduledFetch(policyName, symbol = "") {
    const next = nextAllowedAt(policyName, symbol);
    return Date.now() >= next;
  }

  function markScheduledFetch(policyName, symbol = "") {
    state.budget.schedule[scheduleKey(policyName, symbol)] = {
      lastAt: Date.now(),
      nextAt: Date.now() + (TWELVE_POLICY[policyName]?.cooldownMs || 0)
    };
    persistBudgetTracker();
  }

  function formatDelay(ms) {
    if (!ms || ms <= 0) return "maintenant";
    const totalMinutes = Math.ceil(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!minutes) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }

  function nextAllowedLabel(policyName, symbol = "") {
    const next = nextAllowedAt(policyName, symbol);
    if (!next) return "maintenant";
    return formatDelay(next - Date.now());
  }

  function refreshStatusLabel(policyName, symbol = "") {
    const next = nextAllowedAt(policyName, symbol);
    if (!next || Date.now() >= next) return "mise a jour possible maintenant";
    return `prochaine mise a jour dans ${formatDelay(next - Date.now())}`;
  }

  function countdownOnlyLabel(policyName, symbol = "") {
    const next = nextAllowedAt(policyName, symbol);
    if (!next || Date.now() >= next) return "maintenant";
    return `dans ${formatDelay(next - Date.now())}`;
  }

  function dashboardRefreshLabel() {
    return "Le dashboard repart toujours du dernier snapshot enregistre.";
  }

  function detailRefreshLabel(symbol = "") {
    if (!symbol) return "Aucune fiche chargee";
    return isCryptoSymbol(symbol)
      ? "Les actifs crypto restent plus souples car ils ne dependent pas de Twelve."
      : refreshStatusLabel("detail_non_crypto", symbol);
  }

  function candlesRefreshLabel(symbol = "") {
    if (!symbol) return "Aucune bougie chargee";
    return isCryptoSymbol(symbol)
      ? "Les bougies crypto peuvent etre rafraichies plus souvent."
      : refreshStatusLabel("candles_non_crypto", symbol);
  }

  function schedulerSummaryCards(symbol = "") {
    const clean = String(symbol || "").toUpperCase();
    return `
      <div class="grid scheduler-grid">
        <div class="stat-card"><div class="stat-label">Dashboard</div><div class="stat-value small">${dashboardRefreshLabel()}</div></div>
        <div class="stat-card"><div class="stat-label">Opportunites</div><div class="stat-value small">${refreshStatusLabel("opportunities")}</div></div>
        <div class="stat-card"><div class="stat-label">Fiche actif</div><div class="stat-value small">${detailRefreshLabel(clean)}</div></div>
        <div class="stat-card"><div class="stat-label">Bougies</div><div class="stat-value small">${candlesRefreshLabel(clean)}</div></div>
      </div>`;
  }

  function poolRemaining(poolName) {
    const pool = state.budget.pools?.[poolName];
    if (!pool) return state.budget.remaining ?? 0;
    return Math.max(0, (pool.reserved || 0) - (pool.used || 0));
  }

  function canSpendEstimatedBudget(route, symbol = null) {
    const estimated = estimatedCostForRoute(route, symbol);
    const globalRemaining = state.budget.remaining ?? 0;
    if (globalRemaining < estimated) return false;

    if (route === "opportunities") {
      return poolRemaining("opportunities") >= estimated || globalRemaining > 250;
    }
    if (route === "detail") {
      return poolRemaining("detail") >= estimated || globalRemaining > 200;
    }
    if (route === "candles") {
      return poolRemaining("candles") >= estimated || globalRemaining > 300;
    }
    return globalRemaining >= estimated;
  }

  function theoreticalDailyCap() {
    return (state.budget.pools.opportunities.reserved || 0) + (state.budget.pools.detail.reserved || 0) + (state.budget.pools.candles.reserved || 0) + (state.budget.pools.reserve.reserved || 0);
  }

  function persistDetailCache() {
    writeJson(STORAGE_KEYS.detailCache, state.detailCache);
  }

  function detailCacheHit(symbol) {
    const row = state.detailCache[String(symbol || "").toUpperCase()];
    if (!row) return null;
    return row;
  }

  function saveDetailCache(symbol, value) {
    const clean = String(symbol || "").toUpperCase();
    state.detailCache[clean] = value;
    persistDetailCache();
    if (value && value.price != null) {
      const currentList = (state.opportunitiesSnapshot || []).slice();
      const idx = currentList.findIndex(x => String(x.symbol || "").toUpperCase() === clean);
      const patch = normalizeOpportunity({
        symbol: value.symbol,
        name: value.name,
        assetClass: value.assetClass,
        price: value.price,
        change24hPct: value.change24hPct,
        score: value.score,
        scoreStatus: value.scoreStatus,
        direction: value.direction,
        analysisLabel: value.analysisLabel,
        confidence: value.confidence,
        sourceUsed: value.sourceUsed,
        freshness: value.freshness
      });
      if (idx >= 0) currentList[idx] = mergeOpportunityWithStored(currentList[idx], patch);
      else currentList.push(patch);
      saveOpportunitiesSnapshot(currentList);
      state.opportunities = state.opportunities.map(item => String(item.symbol || "").toUpperCase() === clean ? mergeOpportunityWithStored(item, patch) : item);
      applyFilter();
    }
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
    return "indispo";
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
      unknown: "indispo"
    };
    return map[value] || value || "indispo";
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
    if (msg.includes("Cloudflare subrequest limit reached")) return "source temporairement saturee";
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

function decisionBadgeClass(decision) {
  if (decision === "Trade conseille") return "decision-strong";
  if (decision === "Trade possible") return "decision-medium";
  if (decision === "A surveiller") return "decision-watch";
  if (decision === "A eviter") return "decision-avoid";
  return "decision-none";
}

function generateTradePlan(detail) {
  if (!detail || detail.price == null) return null;

  const score = detail.score ?? null;
  const direction = detail.direction ?? null;
  const confidenceRaw = detail.confidence || "low";
  const breakdown = detail.breakdown || {};
  const momentum = breakdown.momentum ?? 50;
  const entryQuality = breakdown.entryQuality ?? 50;
  const trend = breakdown.trend ?? 50;
  const regime = breakdown.regime ?? 50;
  const risk = breakdown.risk ?? 50;
  const participation = breakdown.participation ?? 50;

  const avgRange = averageRange(detail.candles || [], 14);
  const fallbackVol = detail.price * (detail.assetClass === "crypto" ? 0.028 : 0.018);
  const vol = avgRange && avgRange > 0 ? avgRange : fallbackVol;

  const aiContext = [];
  if (regime >= 58) aiContext.push("contexte porteur");
  if (regime <= 42) aiContext.push("contexte fragile");
  if (entryQuality >= 65) aiContext.push("entree propre");
  if (entryQuality <= 45) aiContext.push("entree delicate");
  if (risk >= 62) aiContext.push("risque encore acceptable");
  if (risk <= 42) aiContext.push("risque eleve");
  if (participation >= 70) aiContext.push("activite suffisante");

  let decision = "Aucun trade conseille";
  let side = null;
  let reason = "Le signal est trop faible ou trop flou.";
  let urgency = "attendre";
  let timing = "moyen";
  let aiSummary = "Pas de configuration assez propre pour proposer un trade prudent.";
  let safety = "faible";
  let refusalReason = "Pas de trade conseille tant que le signal n'est pas plus propre.";

  const bullishStrong = direction === "long" && score != null && score >= 63 && momentum >= 58 && entryQuality >= 58 && risk >= 45;
  const bearishStrong = direction === "short" && score != null && score <= 37 && momentum <= 42 && entryQuality >= 55 && risk >= 45;
  const bullishPossible = direction === "long" && score != null && score >= 54 && entryQuality >= 52;
  const bearishPossible = direction === "short" && score != null && score <= 46 && entryQuality >= 52;

  if (bullishStrong) {
    decision = "Trade conseille";
    side = "long";
    reason = "Hausse probable, entree encore correcte et risque acceptable.";
    urgency = "maintenant";
    timing = entryQuality >= 68 ? "bon" : "correct";
    aiSummary = "L'IA valide un setup haussier prudent : contexte lisible, timing acceptable et risque cadre.";
    safety = "elevee";
    refusalReason = null;
  } else if (bearishStrong) {
    decision = "Trade conseille";
    side = "short";
    reason = "Baisse probable, timing correct et risque encore acceptable.";
    urgency = "maintenant";
    timing = entryQuality >= 68 ? "bon" : "correct";
    aiSummary = "L'IA valide un setup baissier prudent : signal net, risque contenu et plan defendable.";
    safety = "elevee";
    refusalReason = null;
  } else if (bullishPossible) {
    decision = "Trade possible";
    side = "long";
    reason = "Le signal haussier existe, mais il n'est pas encore assez propre pour etre fort.";
    urgency = "a envisager";
    timing = entryQuality >= 60 ? "correct" : "moyen";
    aiSummary = "L'IA voit une base haussiere, mais prefere encore rester selective.";
    safety = "moyenne";
    refusalReason = "Attendre un meilleur timing ou un signal plus net.";
  } else if (bearishPossible) {
    decision = "Trade possible";
    side = "short";
    reason = "Le signal baissier existe, mais il manque encore un peu de proprete.";
    urgency = "a envisager";
    timing = entryQuality >= 60 ? "correct" : "moyen";
    aiSummary = "L'IA voit une base baissiere, mais ne veut pas forcer le trade trop tot.";
    safety = "moyenne";
    refusalReason = "Attendre un mouvement plus propre avant de se positionner.";
  } else if (score != null && ((momentum >= 56 && trend >= 48) || (momentum <= 44 && trend <= 52))) {
    decision = "A surveiller";
    side = direction === "neutral" ? null : direction;
    reason = "Le contexte devient interessant, mais l'entree n'est pas encore assez propre.";
    urgency = "a surveiller";
    timing = "trop tot";
    aiSummary = "L'IA prefere surveiller l'actif plutot que forcer un trade mediocre.";
    safety = "moyenne";
    refusalReason = "Le contexte existe, mais pas encore le bon point d'entree.";
  } else if (score != null) {
    decision = "A eviter";
    side = null;
    reason = "Le risque et la qualite du signal ne justifient pas une prise de position prudente.";
    urgency = "ne rien faire";
    timing = "mauvais";
    aiSummary = "L'IA refuse le trade : signal confus, timing faible ou risque trop eleve.";
    safety = "faible";
    refusalReason = "Trade refuse : meilleur choix = ne rien faire pour l'instant.";
  }

  if (!side) {
    return {
      decision,
      side: null,
      entry: null,
      stopLoss: null,
      takeProfit: null,
      rr: null,
      confidence: simpleConfidenceLabel(confidenceRaw),
      urgency,
      timing,
      horizon: "a definir",
      reason,
      refusalReason,
      aiSummary,
      safety,
      aiContext
    };
  }

  const riskDistance = Math.max(vol * (detail.assetClass === "crypto" ? 1.0 : 0.85), detail.price * (detail.assetClass === "crypto" ? 0.013 : 0.009));
  const rewardMultiplier = decision === "Trade conseille" ? 2.4 : 1.8;
  const rewardDistance = riskDistance * rewardMultiplier;
  const entry = detail.price;
  const stopLoss = side === "long" ? entry - riskDistance : entry + riskDistance;
  const takeProfit = side === "long" ? entry + rewardDistance : entry - rewardDistance;
  const rr = rewardDistance / riskDistance;
  const horizonDays = decision === "Trade conseille" ? (detail.assetClass === "crypto" ? 2 : 4) : (detail.assetClass === "crypto" ? 4 : 7);

  if (rr < 1.6 && decision === "Trade conseille") {
    decision = "Trade possible";
    urgency = "a envisager";
    safety = "moyenne";
    reason = "Le signal est correct mais le ratio gain/risque n'est pas assez fort pour un vrai trade prudent.";
    aiSummary = "L'IA degrade le signal : ratio gain/risque trop moyen pour etre classe en trade conseille.";
    refusalReason = "Attendre un meilleur point d'entree pour ameliorer le ratio gain/risque.";
  }

  return {
    decision,
    side,
    entry,
    stopLoss,
    takeProfit,
    rr,
    confidence: simpleConfidenceLabel(confidenceRaw),
    urgency,
    timing,
    horizon: horizonLabel(horizonDays),
    reason,
    refusalReason,
    aiSummary,
    safety,
    aiContext
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


  function saveOpportunitiesSnapshot(rows) {
    state.opportunitiesSnapshot = rows;
    writeJson(STORAGE_KEYS.opportunitiesSnapshot, rows);
  }

  function mergeOpportunityWithStored(current, stored) {
    if (!stored) return current;
    const keepCurrentLive = current.price != null;
    if (keepCurrentLive) return current;
    const merged = { ...stored, ...current };
    merged.price = stored.price ?? current.price;
    merged.change24hPct = stored.change24hPct ?? current.change24hPct;
    merged.score = stored.score ?? current.score;
    merged.scoreStatus = stored.scoreStatus || current.scoreStatus;
    merged.direction = stored.direction || current.direction;
    merged.analysisLabel = stored.analysisLabel || current.analysisLabel;
    merged.confidence = stored.confidence || current.confidence;
    merged.sourceUsed = stored.sourceUsed || current.sourceUsed;
    merged.freshness = stored.freshness || current.freshness || "cache";
    merged.error = null;
    merged.fromStoredCache = true;
    return merged;
  }

  function backfillOpportunities(rows) {
    const snapshotMap = new Map((state.opportunitiesSnapshot || []).map(x => [String(x.symbol || "").toUpperCase(), x]));
    const detailMap = new Map(Object.values(state.detailCache || {}).map(x => [String(x.symbol || "").toUpperCase(), x]));
    return (rows || []).map((item) => {
      const clean = String(item?.symbol || "").toUpperCase();
      if (!clean) return item;
      const detail = detailMap.get(clean);
      const snap = snapshotMap.get(clean);
      const stored = detail && detail.price != null ? {
        symbol: detail.symbol,
        name: detail.name,
        assetClass: detail.assetClass,
        price: detail.price,
        change24hPct: detail.change24hPct,
        score: detail.score,
        scoreStatus: detail.scoreStatus,
        direction: detail.direction,
        analysisLabel: detail.analysisLabel,
        confidence: detail.confidence,
        sourceUsed: detail.sourceUsed,
        freshness: detail.freshness
      } : snap;
      return mergeOpportunityWithStored(item, stored);
    });
  }

  function setOpportunities(rows) {
    const prepared = Array.isArray(rows) ? backfillOpportunities(rows).map(normalizeOpportunity) : [];
    state.opportunities = prepared;
    saveOpportunitiesSnapshot(prepared);
    applyFilter();
    state.opportunitiesFetchedAt = Date.now();
  }

  // =========================
  // api
  // =========================
  async function api(path) {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    recordBudgetUsage(res.headers);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function apiPost(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function loadAiReview(detail, localPlan) {
    if (!detail) return null;
    state.loadingAiReview = true;
    state.aiReview = null;
    render();
    try {
      const payload = {
        symbol: detail.symbol,
        detail: {
          symbol: detail.symbol,
          name: detail.name,
          assetClass: detail.assetClass,
          price: detail.price,
          change24hPct: detail.change24hPct,
          score: detail.score,
          scoreStatus: detail.scoreStatus,
          direction: detail.direction,
          analysisLabel: detail.analysisLabel,
          confidence: detail.confidence,
          breakdown: detail.breakdown || {},
          sourceUsed: detail.sourceUsed,
          freshness: detail.freshness
        },
        localPlan
      };
      const review = await apiPost("/api/ai/trade-review", payload);
      state.aiReview = review?.data || null;
    } catch (e) {
      state.aiReview = {
        provider: "local_ui_fallback",
        externalAiUsed: false,
        decision: localPlan?.decision || "Aucun trade conseille",
        prudence: localPlan?.safety || "moyenne",
        reason: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        invalidation: localPlan?.refusalReason || "Attendre un signal plus propre.",
        summary: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        warning: "Pont IA externe indisponible."
      };
    } finally {
      state.loadingAiReview = false;
      render();
    }
  }

  async function loadDashboard() {
    try {
      const [fg, trending, portfolio] = await Promise.all([
        api("/api/fear-greed").catch(() => null),
        api("/api/trending").catch(() => null),
        api("/api/portfolio/summary").catch(() => null)
      ]);
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

    if (!canSpendEstimatedBudget("opportunities") && state.opportunities.length) {
      state.error = null;
      render();
      return;
    }

    if (state.opportunities.length && !canRunScheduledFetch("opportunities")) {
      state.error = null;
      render();
      return;
    }

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
    if (force && !state.opportunities.length) {
      state.loading = true;
      render();
    }

    try {
      const result = await api("/api/opportunities");
      if (requestId !== state.opportunitiesRequestId) return;
      setOpportunities(result.data || []);
      markScheduledFetch("opportunities");
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
    const cleanSymbol = String(symbol || "").toUpperCase();
    const nonCrypto = !isCryptoSymbol(cleanSymbol);
    const cachedDetail = detailCacheHit(cleanSymbol);

    if (nonCrypto && cachedDetail && !canRunScheduledFetch("detail_non_crypto", cleanSymbol)) {
      state.detail = cachedDetail;
      state.error = `Cette fiche non-crypto se met a jour toutes les 30 minutes. Prochaine mise a jour dans ${nextAllowedLabel("detail_non_crypto", cleanSymbol)}.`;
      render();
      return;
    }

    if (nonCrypto && !canSpendEstimatedBudget("detail", cleanSymbol)) {
      if (cachedDetail) {
        state.detail = cachedDetail;
        state.error = `Budget Twelve trop faible. Derniere fiche conservee pour ${cleanSymbol}.`;
        render();
        return;
      }
      state.error = `Budget Twelve trop faible pour charger ${cleanSymbol} maintenant (${state.budget.remaining} restant sur ${state.budget.dailyLimit}).`;
      render();
      return;
    }

    if (state.detail && state.detail.symbol === cleanSymbol && (now - state.detailRequestStartedAt) < 15000) {
      render();
      return;
    }

    if ((now - state.detailRequestStartedAt) < 6000 && state.detail) {
      state.error = "Attends quelques secondes avant de recharger une fiche.";
      render();
      return;
    }

    state.detailRequestStartedAt = now;
    state.loadingDetail = !cachedDetail;
    if (cachedDetail) state.detail = cachedDetail;
    state.error = null;
    render();

    try {
      const [detail, candles] = await Promise.all([
        api(`/api/opportunity-detail/${encodeURIComponent(cleanSymbol)}`),
        api(`/api/candles/${encodeURIComponent(cleanSymbol)}?timeframe=1d&limit=90`).catch(() => null)
      ]);

      const merged = {
        ...(detail.data || {}),
        candles: candles?.data || cachedDetail?.candles || []
      };

      state.detail = merged;
      saveDetailCache(cleanSymbol, merged);

      if (nonCrypto) {
        markScheduledFetch("detail_non_crypto", cleanSymbol);
        if (candles?.data?.length) markScheduledFetch("candles_non_crypto", cleanSymbol);
      }

      state.error = null;
      loadAiReview(merged, currentTradePlan());
    } catch (e) {
      state.error = e.message || "Fiche indisponible";
      if (cachedDetail) state.detail = cachedDetail;
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
    reason: "Trade manuel depuis la fiche actif.",
    aiSummary: "Decision manuelle hors moteur prudent.",
    safety: "non evalue"
  });
  persistTradesState();
  state.error = `Trade d'entrainement ajoute : ${d.symbol} (${simpleSideLabel(side)})`;
  render();
}

function createRecommendedTrade() {
  const d = state.detail;
  const plan = currentTradePlan();
  if (!d || !plan || !plan.side || plan.decision === "Aucun trade conseille" || plan.decision === "A eviter") {
    state.error = "Aucun trade prudent conseille pour le moment.";
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
    horizon: plan.horizon,
    aiSummary: state.aiReview?.summary || plan.aiSummary,
    safety: state.aiReview?.prudence || plan.safety,
    aiProvider: state.aiReview?.provider || "local_plan"
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
      state.aiReview = null;
      loadOpportunities(true);
    } else if (route === "asset-detail" && symbol) {
      state.aiReview = null;
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
          ${item.error ? `<div class="muted opp-note">${safeText(item.error.includes("source") || item.error.includes("quota") || item.error.includes("limit") ? "nouvelle mise a jour plus tard" : item.error)}</div>` : ""}
        </div>
        <div class="meta-col">
          ${badge(simpleAssetClassLabel(item.assetClass), item.assetClass)}
          ${badge(`fiabilite ${simpleConfidenceLabel(item.confidence || "low")}`)}
          ${state.settings.showSourceBadges ? badge(item.sourceUsed || "source") : ""}
          ${state.settings.showSourceBadges ? badge(simpleFreshnessLabel(item.freshness || "unknown"), item.freshness || "") : ""}
        </div>
      </div>`;
  }


  function prudentShortlist(limit = 5) {
    return (state.opportunities || [])
      .filter(x => x && x.price != null)
      .map((item) => {
        const pseudoDetail = {
          ...item,
          candles: [],
          breakdown: item.breakdown || {}
        };
        const plan = generateTradePlan(pseudoDetail);
        return { ...item, plan };
      })
      .filter(x => x.plan && (x.plan.decision === "Trade conseille" || x.plan.decision === "Trade possible"))
      .sort((a, b) => {
        const aw = a.plan?.decision === "Trade conseille" ? 2 : 1;
        const bw = b.plan?.decision === "Trade conseille" ? 2 : 1;
        if (bw !== aw) return bw - aw;
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, limit);
  }

  function algoJournalPreview(limit = 4) {
    return (state.algoJournal || []).slice(0, limit);
  }

  function renderDashboard() {
    const top = state.opportunities.filter(x => x.price != null).slice(0, 5);
    const prudent = prudentShortlist(5);
    const journalPreview = algoJournalPreview(4);
    const fg = state.dashboard.fearGreed;
    const trending = state.dashboard.trending;
    const stats = trainingStats();

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">Interface plus claire, prix reels, lecture simple.</div>
          <div class="muted" style="margin-top:6px">Les opportunites et la fiche actif reposent maintenant sur le meme snapshot marche par actif. Quand une fiche actif est ouverte, l'app peut demander une validation finale a une IA externe si CLAUDE_API_KEY est configuree.</div>
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

        <div class="section-title" style="margin-top:22px"><span>Trades prudents proposes</span><span>${prudent.length}</span></div>
        ${prudent.length ? `<div class="ai-shortlist">
          ${prudent.map((item) => `
            <div class="ai-card" data-symbol="${safeText(item.symbol)}">
              <div class="ai-top">
                <div>
                  <div class="trade-symbol">${safeText(item.symbol)}</div>
                  <div class="trade-sub">${safeText(item.name || "")}</div>
                </div>
                ${badge(item.plan.decision, decisionBadgeClass(item.plan.decision))}
              </div>
              <div class="ai-body">
                <div><span class="muted">Tendance</span><br>${safeText(simpleSideLabel(item.plan.side || item.direction))}</div>
                <div><span class="muted">Fiabilite</span><br>${safeText(item.plan.confidence || "—")}</div>
                <div><span class="muted">Priorite</span><br>${safeText(item.plan.urgency || "—")}</div>
                <div><span class="muted">Signal</span><br>${item.score != null ? safeText(item.score) : "—"}</div>
              </div>
              <div class="ai-summary">${safeText(item.plan.aiSummary || item.plan.reason || "")}</div>
            </div>`).join("")}
        </div>` : `<div class="empty-state">Aucun trade prudent propose pour le moment.</div>`}

        <div class="section-title" style="margin-top:22px"><span>Dernieres decisions algo</span><span>${journalPreview.length}</span></div>
        ${journalPreview.length ? `<div class="algo-feed">
          ${journalPreview.map((row) => `
            <div class="algo-row">
              <div>
                <div class="trade-symbol">${safeText(row.symbol)}</div>
                <div class="trade-sub">${new Date(row.createdAt).toLocaleString("fr-FR")}</div>
              </div>
              <div>${badge(row.decision || "—", decisionBadgeClass(row.decision || ""))}</div>
              <div class="muted">${safeText(row.reason || "—")}</div>
            </div>`).join("")}
        </div>` : `<div class="empty-state">Aucune decision algo enregistree pour le moment.</div>`}
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
        <div class="muted priority-note">Lecture unifiee : la liste Opportunites et la Fiche actif reutilisent la meme base marche par actif.</div><div class="countdown-strip" style="margin-bottom:14px">
          <div class="countdown-left">
            <span class="countdown-dot"></span>
            <span class="countdown-title">Prochaine mise a jour</span>
          </div>
          <div class="countdown-right">${countdownOnlyLabel("opportunities")}</div>
        </div>
        <div class="muted priority-note">Priorite de l'app : la page Opportunites garde toujours la derniere donnee connue avant toute autre page non-crypto.</div>
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
        ${d ? `<div class="muted priority-note">Base unifiee : meme snapshot marche pour cette fiche et pour la liste Opportunites.</div><div class="countdown-strip dual" style="margin-bottom:14px">
              <div class="countdown-item">
                <span class="countdown-dot"></span>
                <span class="countdown-label">Fiche actif</span>
                <strong>${isCryptoSymbol(d.symbol) ? "souple" : countdownOnlyLabel("detail_non_crypto", d.symbol)}</strong>
              </div>
              <div class="countdown-item">
                <span class="countdown-dot"></span>
                <span class="countdown-label">Bougies</span>
                <strong>${isCryptoSymbol(d.symbol) ? "souple" : countdownOnlyLabel("candles_non_crypto", d.symbol)}</strong>
              </div>
            </div>
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
                  ${state.settings.showSourceBadges ? badge(d.sourceUsed || "source") : ""}
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
                      <div class="plan-ai-summary">
                        <div class="muted">Lecture IA</div>
                        <div>${safeText(plan?.aiSummary || "Pas d'avis complementaire.")}</div>
                      </div>
                      <div class="plan-context">
                        ${(plan?.aiContext || []).map(label => `<span class="mini-pill">${safeText(label)}</span>`).join("")}
                        ${plan?.safety ? `<span class="mini-pill strong">niveau prudent : ${safeText(plan.safety)}</span>` : ""}
                      </div>
                      <div class="trade-actions">
                        <button class="btn trade-btn primary" data-create-trade-plan ${!plan || !plan.side || plan.decision === "A eviter" || plan.decision === "Aucun trade conseille" ? "disabled" : ""}>Creer le trade conseille</button>
                        <button class="btn trade-btn long" data-add-trade="long">Parier sur la hausse</button>
                        <button class="btn trade-btn short" data-add-trade="short">Parier sur la baisse</button>
                      </div>
                    </div>`;
                })()}
              </div>

              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>Validation IA externe</span><span>${state.loadingAiReview ? "analyse..." : (state.aiReview?.externalAiUsed ? "Claude" : "fallback local")}</span></div>
                ${state.loadingAiReview ? `<div class="loading-state">Analyse IA en cours...</div>` : state.aiReview ? `
                  <div class="ai-review-box">
                    <div class="legend">
                      ${badge(state.aiReview.decision || "—", decisionBadgeClass(state.aiReview.decision || ""))}
                      ${badge(`prudence ${state.aiReview.prudence || "—"}`)}
                      ${badge(state.aiReview.externalAiUsed ? "IA externe" : "fallback local")}
                    </div>
                    <div class="ai-summary">${safeText(state.aiReview.summary || state.aiReview.reason || "—")}</div>
                    <div class="kv" style="margin-top:12px">
                      <div class="muted">Raison</div><div>${safeText(state.aiReview.reason || "—")}</div>
                      <div class="muted">Invalidation</div><div>${safeText(state.aiReview.invalidation || "—")}</div>
                      <div class="muted">Source</div><div>${safeText(state.aiReview.provider || "—")}</div>
                    </div>
                    ${state.aiReview.warning ? `<div class="muted" style="margin-top:10px">${safeText(state.aiReview.warning)}</div>` : ""}
                  </div>
                ` : `<div class="empty-state">Aucune validation IA disponible pour le moment.</div>`}
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
                    <div class="muted">Lecture IA : ${safeText(currentTradePlan()?.safety ? `niveau prudent ${currentTradePlan().safety}` : "—")}</div>
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
            <div class="stat-card"><div class="stat-label">Budget Twelve</div><div class="stat-value">${state.budget.remaining}</div></div>
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
          <div class="muted" style="margin-top:6px">Base marche unifiee : Opportunites et Fiche actif reutilisent le meme snapshot marche par actif. IA externe : l'app utilisera Claude si la cle CLAUDE_API_KEY est bien configuree dans le worker, sinon elle retombe sur un filtre prudent local.</div>
        </div>

        <div class="card">
          <div class="setting-list">
            <label class="setting-row">
              <div>
                <div class="setting-title">Rafraichir les opportunites</div>
                <div class="setting-desc">Recharge automatiquement la liste quand le delai minimum Twelve est termine.</div>
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

        <div class="card" style="margin-top:18px">
          <div class="section-title"><span>Budget Twelve</span><span>${state.budget.remaining}/${state.budget.dailyLimit}</span></div>
          <div class="grid trades-stats">
            <div class="stat-card"><div class="stat-label">Utilises</div><div class="stat-value">${state.budget.used}</div></div>
            <div class="stat-card"><div class="stat-label">Restants</div><div class="stat-value">${state.budget.remaining}</div></div>
            <div class="stat-card"><div class="stat-label">Pool opportunites</div><div class="stat-value">${poolRemaining("opportunities")}</div></div>
            <div class="stat-card"><div class="stat-label">Etat</div><div class="stat-value">${safeText(budgetAdvice())}</div></div>
          </div>
          <div class="kv" style="margin-top:14px">
            <div class="muted">Opportunites non-crypto</div><div>1 appel Twelve max toutes les 15 min (${TWELVE_POLICY.opportunities.maxPerDay}/jour)</div>
            <div class="muted">Prochaine opportunites</div><div>${countdownOnlyLabel("opportunities")}</div>
            <div class="muted">Fiche actif non-crypto</div><div>1 appel Twelve max toutes les 30 min et par actif (${TWELVE_POLICY.detail_non_crypto.maxPerDayPerSymbol}/jour/actif)</div>
            <div class="muted">Bougies non-crypto</div><div>1 appel Twelve max toutes les 12 h et par actif (${TWELVE_POLICY.candles_non_crypto.maxPerDayPerSymbol}/jour/actif)</div>
            <div class="muted">Logique</div><div>Impossible depuis l'app de relancer Twelve avant la fin du delai prevu pour chaque categorie.</div>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="section-title"><span>Compteurs de prochaine mise a jour</span><span>toutes les pages</span></div>
          ${schedulerSummaryCards(state.selectedSymbol)}
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

    app.querySelectorAll(".opp-row[data-symbol], .ai-card[data-symbol]").forEach(el => {
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
    if (Array.isArray(state.opportunitiesSnapshot) && state.opportunitiesSnapshot.length) {
      state.opportunities = state.opportunitiesSnapshot.map(normalizeOpportunity);
      applyFilter();
    }
    render();
    await loadDashboard();
    render();
    setInterval(() => {
      if (["dashboard", "opportunities", "asset-detail", "settings"].includes(state.route)) {
        render();
      }
    }, 30000);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  boot();
})();
