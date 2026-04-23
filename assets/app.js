(() => {
  const API_BASE = "https://manitradepro.emmanueldelasse.workers.dev";
  const STORAGE_KEYS = {
    trainingPositions: "mtp_training_positions_v1",
    trainingHistory: "mtp_training_history_v1",
    settings: "mtp_settings_v1",
    algoJournal: "mtp_algo_journal_v1",
    budgetTracker: "mtp_budget_tracker_v1",
    detailCache: "mtp_detail_cache_v1",
    opportunitiesSnapshot: "mtp_opportunities_snapshot_v1",
    trainingCapital: "mtp_training_capital_v1",
    session: "mtp_session_v1",
    priceAlerts: "mtp_price_alerts_v1"
  };

  const TRADE_STORAGE = {
    positions: ["mtp_trades_positions", "mtp_training_positions_v2", STORAGE_KEYS.trainingPositions],
    history: ["mtp_trades_history", "mtp_training_history_v2", STORAGE_KEYS.trainingHistory],
    algoJournal: ["mtp_trades_algo_journal", "mtp_algo_journal_v2", STORAGE_KEYS.algoJournal],
    positionsBackup: "mtp_trades_positions_backup",
    historyBackup: "mtp_trades_history_backup",
    algoJournalBackup: "mtp_trades_algo_journal_backup",
    meta: "mtp_trades_meta"
  };

  const defaultSettings = {
    autoRefreshOpportunities: true,
    autoScanIntervalMin: 5,
    algoSignalNotifs: false,
    showSourceBadges: true,
    showScoreBreakdown: true,
    compactCards: false,
    autoTheme: false,
    lightTheme: false,
    displayCurrency: "EUR_PLUS_USD",
    workerAdminToken: "",
    showAlgoJournal: true,
    supabaseEnabled: false,
    supabaseUrl: "",
    supabaseAnonKey: ""
  };

  const state = {
    route: "dashboard",
    moreMenuOpen: false,
    opportunities: [],
    filteredOpportunities: [],
    opportunityFilter: "all",
    opportunityDirection: "all",
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
    opportunitiesRefreshing: false,
    opportunitiesLastGoodAt: 0,
    detailRequestStartedAt: 0,
    dashboard: {
      fearGreed: null,
      trending: [],
      portfolio: null,
      newsWindow: null
    },
    news: {
      items: [],
      overview: null,
      status: "idle",
      source: null,
      asOf: null,
      message: null
    },
    market: {
      eurusdRate: 0.92,
      regime: null,
      asOf: null,
      message: null
    },
    trades: {
      mode: "training",
      positions: [],
      history: [],
      remoteStatus: "local_only",
      remoteError: null,
      lastRemoteSyncAt: null
    },
    tradeLive: {
      lastRunAt: 0,
      bySymbol: {},
      running: false
    },
    algoJournal: [],
    settings: loadSettings(),
    session: { ...loadSession(), pinOpen: false, pinError: null, pinLoading: false },
    budget: loadBudgetTracker(),
    detailCache: readJson(STORAGE_KEYS.detailCache, {}),
    opportunitiesSnapshot: readJson(STORAGE_KEYS.opportunitiesSnapshot, []),
    trainingCapital: loadTrainingCapital(),
    nonCryptoHydration: {},
    tradeConfirm: {
      open: false,
      mode: null,
      side: null
    },
    priceAlerts: [],
    alertModal: { open: false, symbol: null, name: null, currentPrice: null },
    alertToast: null,
    chartTimeframe: "1d",
    chartFullscreen: false,
    algoSignalsPrev: null,
    journalAnalysis: null,
    loadingJournalAnalysis: false,
    portfolioPriority: null,
    loadingPortfolioPriority: false,
    userAssets: [],
    userAssetsLoading: false,
    userAssetsError: null,
    addAssetForm: { open: false, symbol: "", name: "", assetClass: "crypto", loading: false, error: null },
    bot: { account: null, events: [], stats: null, loading: false, error: null, forcingCycle: false, settingsOpen: false, editDraft: null, savingDraft: false },
    health: { adjustments: [], bucketStats: [], loading: false, error: null, lastLoadedAt: 0 },
    reports: { list: [], loading: false, error: null, openId: null, generating: false },   // PR #9 Phase 2 — rapports hebdo
    tradeFeedback: {} // trade_id → { mae_pct, mfe_pct, exit_reason, mae_vs_stop_ratio, mfe_vs_tp_ratio, ... } (PR #5 Phase 2)
  };

  const app = document.getElementById("app");
  const navItems = [
    ["dashboard", "Accueil", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`],
    ["opportunities", "Opportunites", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`],
    ["alerts", "Alertes", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`],
    ["portfolio", "Mes trades", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`],
    ["bot", "Bot", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`],
    ["health", "Sante bot", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`],
    ["reports", "Rapports hebdo", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`],
    ["performance", "Performance", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`],
    ["settings", "Reglages", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`]
  ];

  // Mobile bottom-nav : 4 items principaux + "Plus" (Bot + Santé + Rapports + Performance + Réglages)
  const PRIMARY_NAV_ROUTES = ["dashboard", "opportunities", "alerts", "portfolio"];
  const MORE_NAV_ROUTES = ["bot", "health", "reports", "performance", "settings"];
  const MORE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>`;

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

  function removeJson(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function readJsonFromKeys(keys, fallback) {
    for (const key of keys || []) {
      const value = readJson(key, undefined);
      if (value !== undefined) return value;
    }
    return fallback;
  }

  function writeJsonToKeys(keys, value) {
    for (const key of keys || []) writeJson(key, value);
  }

  function saveTradesMeta(extra = {}) {
    const current = readJson(TRADE_STORAGE.meta, {});
    writeJson(TRADE_STORAGE.meta, {
      ...(current && typeof current === "object" ? current : {}),
      updatedAt: Date.now(),
      schema: "mestrades_v1",
      ...extra
    });
  }

  function loadTrainingCapital() {
    const raw = readJson(STORAGE_KEYS.trainingCapital, null);
    const startingBalanceEur = Number(raw?.startingBalanceEur);
    return {
      startingBalanceEur: Number.isFinite(startingBalanceEur) && startingBalanceEur > 0 ? startingBalanceEur : 10000,
      updatedAt: raw?.updatedAt || null
    };
  }

  function persistTrainingCapital() {
    state.trainingCapital = {
      startingBalanceEur: Number(state.trainingCapital?.startingBalanceEur || 10000),
      updatedAt: Date.now()
    };
    writeJson(STORAGE_KEYS.trainingCapital, state.trainingCapital);
  }

  function resetTrainingCapital() {
    state.trainingCapital = {
      startingBalanceEur: 10000,
      updatedAt: Date.now()
    };
    writeJson(STORAGE_KEYS.trainingCapital, state.trainingCapital);
  }


  function loadTradesMeta() {
    return readJson(TRADE_STORAGE.meta, {});
  }

  const WORKER_TRADES_ROUTES = {
    state: "/api/trades/state",
    sync: "/api/trades/sync"
  };

  function workerAdminHeaders() {
    if (isSessionValid()) return { Authorization: `Bearer ${state.session.token}` };
    const legacy = String(state.settings?.workerAdminToken || "").trim();
    if (legacy) return { Authorization: `Bearer ${legacy}` };
    return {};
  }

  function normalizeWorkerError(status, rawText = "") {
    const text = String(rawText || "").toLowerCase();
    if (Number(status) === 403) return "worker_admin_auth_required";
    if (text.includes("admin token required")) return "worker_admin_auth_required";
    if (text.includes("allowed app origin required")) return "worker_origin_not_allowed";
    return rawText || String(status || "worker_request_failed");
  }

  function remoteStatusText() {
    const raw = String(state.trades.remoteError || "");
    if (state.trades.remoteStatus === "connected") {
      return `connecte${state.trades.lastRemoteSyncAt ? " · sync " + new Date(state.trades.lastRemoteSyncAt).toLocaleString("fr-FR") : ""}`;
    }
    if (raw.includes("worker_admin_auth_required")) return "fallback local · token admin worker requis";
    if (raw.includes("worker_origin_not_allowed")) return "fallback local · origine de l'app non autorisee";
    if (state.trades.remoteStatus === "fallback_local") {
      let msg = raw || "worker / supabase indisponible";
      if (msg.startsWith("{")) msg = "erreur serveur";
      else if (msg.length > 80) msg = msg.slice(0, 80) + "…";
      return `fallback local · ${msg}`;
    }
    return "local uniquement";
  }

  async function workerTradesRequest(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...workerAdminHeaders(),
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(normalizeWorkerError(res.status, txt || res.statusText));
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  async function loadTradesFromWorker() {
    try {
      const payload = await workerTradesRequest(WORKER_TRADES_ROUTES.state);
      const positions = Array.isArray(payload?.data?.positions) ? payload.data.positions.map(normalizePositionRecord) : [];
      const history = Array.isArray(payload?.data?.history) ? payload.data.history.map((x) => normalizePositionRecord(x)) : [];
      const configured = !!payload?.data?.configured;
      state.trades.remoteStatus = configured ? "connected" : "fallback_local";
      state.trades.remoteError = configured ? null : (payload?.message || "worker_not_configured");
      state.trades.lastRemoteSyncAt = Date.now();
      return {
        loaded: true,
        configured,
        positions,
        history,
        payload
      };
    } catch (err) {
      state.trades.remoteStatus = "fallback_local";
      state.trades.remoteError = err?.message || "worker_trades_load_failed";
      return {
        loaded: false,
        configured: false,
        positions: [],
        history: [],
        payload: null
      };
    }
  }

  async function syncTradesToSupabase() {
    try {
      const payload = await workerTradesRequest(WORKER_TRADES_ROUTES.sync, {
        method: "POST",
        body: JSON.stringify({
          positions: Array.isArray(state.trades.positions) ? state.trades.positions.map(normalizePositionRecord) : [],
          history: Array.isArray(state.trades.history) ? state.trades.history.map((x) => normalizePositionRecord(x)) : []
        })
      });
      const configured = !!payload?.data?.configured;
      state.trades.remoteStatus = configured ? "connected" : "fallback_local";
      state.trades.remoteError = configured ? null : (payload?.message || "worker_not_configured");
      state.trades.lastRemoteSyncAt = Date.now();
      saveTradesMeta({
        positionsCount: Array.isArray(state.trades.positions) ? state.trades.positions.length : 0,
        historyCount: Array.isArray(state.trades.history) ? state.trades.history.length : 0,
        pendingRemoteSync: !configured,
        lastSuccessfulRemoteSyncAt: configured ? Date.now() : (loadTradesMeta().lastSuccessfulRemoteSyncAt || null),
        lastRemoteSyncAttemptAt: Date.now()
      });
      return configured;
    } catch (err) {
      state.trades.remoteStatus = "fallback_local";
      state.trades.remoteError = err?.message || "worker_trades_sync_failed";
      saveTradesMeta({
        positionsCount: Array.isArray(state.trades.positions) ? state.trades.positions.length : 0,
        historyCount: Array.isArray(state.trades.history) ? state.trades.history.length : 0,
        pendingRemoteSync: true,
        lastRemoteSyncAttemptAt: Date.now()
      });
      return false;
    }
  }

  function loadSettings() {
    return { ...defaultSettings, ...readJson(STORAGE_KEYS.settings, {}) };
  }

  function persistSettings() {
    writeJson(STORAGE_KEYS.settings, state.settings);
  }

  function loadSession() {
    return readJson(STORAGE_KEYS.session, { token: null, expiresAt: 0 });
  }

  function persistSession() {
    writeJson(STORAGE_KEYS.session, { token: state.session.token, expiresAt: state.session.expiresAt });
  }

  function clearSession() {
    state.session.token = null;
    state.session.expiresAt = 0;
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function isSessionValid() {
    return !!state.session.token && Date.now() / 1000 < state.session.expiresAt - 300;
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
    if (remaining <= 50) return "";
    if (remaining <= 200) return "";
    return "";
  }

  const CRYPTO_SYMBOLS_UI = new Set(["BTC","ETH","BNB","SOL","XRP","ADA","DOGE","DOT","LINK","AVAX","ATOM","LTC","MATIC","ARB","OP","AAVE","NEAR","UNI","FIL","ETC","BCH","APT","SUI","TAO","XAUT"]);
  const NON_CRYPTO_TRACKED_COUNT = 17;
  const TWELVE_POLICY = {
    opportunities: {
      label: "",
      cooldownMs: 5 * 60 * 1000,
      cost: 1,
      maxPerDay: 288
    },
    detail_non_crypto: {
      label: "",
      cooldownMs: 60 * 60 * 1000,
      cost: 1,
      maxPerDayPerSymbol: 24
    },
    candles_non_crypto: {
      label: "",
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
    if (!clean || !value) return;
    state.detailCache[clean] = value;
    persistDetailCache();

    const currentList = (state.opportunitiesSnapshot || []).slice();
    const idx = currentList.findIndex(x => String(x.symbol || "").toUpperCase() === clean);
    if (idx >= 0) {
      currentList[idx] = mergeOpportunityWithStored(currentList[idx], value);
      saveOpportunitiesSnapshot(currentList);
      state.opportunities = state.opportunities.map(item =>
        String(item.symbol || "").toUpperCase() === clean ? currentList[idx] : item
      );
      applyFilter();
    }
  }

  async function loadTradesState() {
    const remote = await loadTradesFromWorker();
    const rawPositions = readJsonFromKeys(TRADE_STORAGE.positions, []);
    const rawHistory = readJsonFromKeys(TRADE_STORAGE.history, []);
    const rawAlgo = readJsonFromKeys(TRADE_STORAGE.algoJournal, []);
    const localPositions = Array.isArray(rawPositions) ? rawPositions.map(normalizePositionRecord) : [];
    const localHistory = Array.isArray(rawHistory) ? rawHistory.map((x) => normalizePositionRecord(x)) : [];
    const meta = loadTradesMeta();

    const remotePositionsCount = Array.isArray(remote.positions) ? remote.positions.length : 0;
    const remoteHistoryCount = Array.isArray(remote.history) ? remote.history.length : 0;
    const localPositionsCount = localPositions.length;
    const localHistoryCount = localHistory.length;
    const hasLocalTrades = localPositionsCount > 0 || localHistoryCount > 0;

    if (remote.loaded && remote.configured) {
      const remoteHasMorePositions = remotePositionsCount > localPositionsCount;
      const remoteHasMoreHistory = remoteHistoryCount > localHistoryCount;
      const localHasMorePositions = localPositionsCount > remotePositionsCount;
      const localHasMoreHistory = localHistoryCount > remoteHistoryCount;
      const recentWipe = meta.lastWipedAt && (Date.now() - meta.lastWipedAt) < 300000;

      if (!recentWipe && (remoteHasMorePositions || remoteHasMoreHistory || !hasLocalTrades)) {
        // Supabase a plus de données → prioritaire (sauf si suppression récente côté local)
        state.trades.positions = remote.positions;
        state.trades.history = remote.history;
        saveTradesMeta({
          migratedAt: Date.now(),
          pendingRemoteSync: false,
          lastSuccessfulRemoteSyncAt: Date.now(),
          positionsCount: state.trades.positions.length,
          historyCount: state.trades.history.length
        });
      } else {
        // Local a au moins autant → utiliser local et synchroniser
        state.trades.positions = localPositions;
        state.trades.history = localHistory;
        const needsSync = localHasMorePositions || localHasMoreHistory;
        saveTradesMeta({
          migratedAt: Date.now(),
          positionsCount: state.trades.positions.length,
          historyCount: state.trades.history.length,
          pendingRemoteSync: needsSync
        });
        if (needsSync) syncTradesToSupabase().catch(() => {});
      }
    } else {
      // Supabase inaccessible → local uniquement
      state.trades.positions = localPositions;
      state.trades.history = localHistory;
      saveTradesMeta({
        migratedAt: Date.now(),
        positionsCount: state.trades.positions.length,
        historyCount: state.trades.history.length,
        pendingRemoteSync: hasLocalTrades
      });
    }

    state.algoJournal = Array.isArray(rawAlgo) ? rawAlgo : [];

    // PR #5 Phase 2 — charger le feedback MAE/MFE en best-effort
    // (non bloquant : si le worker est vieux ou hors-ligne, l'UI tombe juste
    // en mode legacy sans badges MAE/MFE).
    loadTradeFeedback().catch(() => {});

    writeJsonToKeys(TRADE_STORAGE.positions, state.trades.positions);
    writeJsonToKeys(TRADE_STORAGE.history, state.trades.history);
    writeJsonToKeys(TRADE_STORAGE.algoJournal, state.algoJournal);
    writeJson(TRADE_STORAGE.positionsBackup, state.trades.positions);
    writeJson(TRADE_STORAGE.historyBackup, state.trades.history);
    writeJson(TRADE_STORAGE.algoJournalBackup, state.algoJournal);
    saveTradesMeta({
      migratedAt: Date.now(),
      positionsCount: Array.isArray(state.trades.positions) ? state.trades.positions.length : 0,
      historyCount: Array.isArray(state.trades.history) ? state.trades.history.length : 0,
      algoCount: Array.isArray(state.algoJournal) ? state.algoJournal.length : 0
    });
  }

  function persistTradesState() {
    const positions = Array.isArray(state.trades.positions) ? state.trades.positions.map(normalizePositionRecord) : [];
    const history = Array.isArray(state.trades.history) ? state.trades.history.map((x) => normalizePositionRecord(x)) : [];
    const algoJournal = Array.isArray(state.algoJournal) ? state.algoJournal : [];
    const localUpdatedAt = Date.now();

    state.trades.positions = positions;
    state.trades.history = history;
    state.algoJournal = algoJournal;

    writeJsonToKeys(TRADE_STORAGE.positions, positions);
    writeJsonToKeys(TRADE_STORAGE.history, history);
    writeJsonToKeys(TRADE_STORAGE.algoJournal, algoJournal);

    writeJson(TRADE_STORAGE.positionsBackup, positions);
    writeJson(TRADE_STORAGE.historyBackup, history);
    writeJson(TRADE_STORAGE.algoJournalBackup, algoJournal);
    saveTradesMeta({
      positionsCount: positions.length,
      historyCount: history.length,
      algoCount: algoJournal.length,
      localUpdatedAt,
      pendingRemoteSync: true
    });
    syncTradesToSupabase().catch(() => {});
  }

  function persistTradesLocalCache() {
    const positions = Array.isArray(state.trades.positions) ? state.trades.positions.map(normalizePositionRecord) : [];
    const history = Array.isArray(state.trades.history) ? state.trades.history.map((x) => normalizePositionRecord(x)) : [];
    state.trades.positions = positions;
    state.trades.history = history;
    writeJsonToKeys(TRADE_STORAGE.positions, positions);
    writeJsonToKeys(TRADE_STORAGE.history, history);
    writeJson(TRADE_STORAGE.positionsBackup, positions);
    writeJson(TRADE_STORAGE.historyBackup, history);
    saveTradesMeta({
      positionsCount: positions.length,
      historyCount: history.length,
      liveUpdatedAt: Date.now(),
      localUpdatedAt: Date.now(),
      pendingRemoteSync: true
    });
  }

  // =========================
  // helpers
  // =========================
  function safeText(v) {
    return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // Haptique léger pour iOS/Android via vibrate API (pas d'effet desktop)
  function haptic(pattern = 8) {
    try { navigator.vibrate && navigator.vibrate(pattern); } catch {}
  }

  // A2HS (Add to Home Screen) — iOS n'a pas beforeinstallprompt
  const A2HS_DISMISSED_KEY = "mtp_a2hs_dismissed_v1";
  function shouldShowA2HSBanner() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS) return false;
    const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if (isStandalone) return false;
    try { if (localStorage.getItem(A2HS_DISMISSED_KEY) === "1") return false; } catch {}
    return true;
  }

  function money(v, currency = "USD") {
    if (v == null || Number.isNaN(v)) return "Donnee indisponible";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: v > 999 ? 0 : 2
    }).format(v);
  }

  function isValidEurusdRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0.5 && rate < 2;
  }

  function extractFxRateFromRows(rows) {
    if (!Array.isArray(rows)) return null;
    for (const row of rows) {
      if (isValidEurusdRate(row?.fxUsdToEur)) return Number(row.fxUsdToEur);
    }
    return null;
  }

  function extractRegimeFromRows(rows) {
    if (!Array.isArray(rows)) return null;
    for (const row of rows) {
      if (row?.regime && typeof row.regime === "object") return row.regime;
    }
    return null;
  }

  function syncMarketContext(meta = null, rows = null) {
    const fxRate =
      (meta && isValidEurusdRate(meta.eurusdRate) && Number(meta.eurusdRate)) ||
      extractFxRateFromRows(rows) ||
      extractFxRateFromRows(state.opportunities) ||
      extractFxRateFromRows(state.opportunitiesSnapshot);
    if (isValidEurusdRate(fxRate)) state.market.eurusdRate = Number(fxRate);

    const regime = meta?.regime || extractRegimeFromRows(rows) || state.market.regime;
    if (regime) state.market.regime = regime;

    state.market.asOf = meta?.asOf || state.market.asOf || null;
    state.market.message = meta?.message || state.market.message || null;
  }

  function fxRateUsdToEur() {
    if (isValidEurusdRate(state.market?.eurusdRate)) return Number(state.market.eurusdRate);
    const fallbackRate =
      extractFxRateFromRows(state.opportunities) ||
      extractFxRateFromRows(state.opportunitiesSnapshot);
    return isValidEurusdRate(fallbackRate) ? Number(fallbackRate) : 0.92;
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
    if (direction === "long") return "tendance haussiere";
    if (direction === "short") return "tendance baissiere";
    return "tendance neutre";
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

  function inferAssetClass(symbol, assetClass) {
    if (assetClass && assetClass !== "unknown") return assetClass;
    const s = String(symbol || "").toUpperCase();
    if (isCryptoSymbol(s)) return "crypto";
    if (["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD"].includes(s)) return "forex";
    if (["GOLD","SILVER","OIL"].includes(s)) return "commodity";
    if (["SPY","QQQ","GLD","TLT"].includes(s)) return "etf";
    return "stock";
  }

  function getMarketStatus(symbol, assetClass) {
    const cls = inferAssetClass(symbol, assetClass);
    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();

    function fmtH(utcH, utcM = 0) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcH, utcM));
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    }
    function countdown(totalMins) {
      const h = Math.floor(totalMins / 60), m = totalMins % 60;
      return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2,"0") : ""}` : `${m}min`;
    }

    if (cls === "crypto") {
      return { open: true, status: "open", label: "Ouvert", detail: "24h/24 · 7j/7" };
    }

    if (cls === "forex") {
      const closed = utcDay === 6 || (utcDay === 0 && utcMins < 22 * 60) || (utcDay === 5 && utcMins >= 22 * 60);
      if (closed) return { open: false, status: "closed", label: "Ferme", detail: `Ouvre dim. ${fmtH(22)} · Lun–Ven 24h/24` };
      return { open: true, status: "open", label: "Ouvert", detail: `Ferme ven. ${fmtH(22)} · Lun–Ven 24h/24` };
    }

    if (cls === "commodity") {
      const weClosed = utcDay === 6 || (utcDay === 0 && utcMins < 23 * 60) || (utcDay === 5 && utcMins >= 22 * 60);
      const brk = !weClosed && utcMins >= 22 * 60 && utcMins < 23 * 60;
      if (weClosed) return { open: false, status: "closed", label: "Ferme", detail: `Ouvre dim. ${fmtH(23)} · Lun–Ven 23h–22h (CME)` };
      if (brk) return { open: false, status: "break", label: "Pause", detail: `Ouvre a ${fmtH(23)} · pause 22h–23h (CME)` };
      return { open: true, status: "open", label: "Ouvert", detail: `${fmtH(23)}–${fmtH(22)} · Lun–Ven (CME)` };
    }

    // stock / etf — NYSE/NASDAQ
    if (utcDay === 0 || utcDay === 6) {
      return { open: false, status: "closed", label: "Ferme", detail: `Lun–Ven ${fmtH(14,30)}–${fmtH(21)} (NYSE)` };
    }
    const PRE = 9 * 60, REG = 14 * 60 + 30, CLOSE = 21 * 60;
    if (utcMins >= REG && utcMins < CLOSE) {
      return { open: true, status: "open", label: "Ouvert", detail: `Ferme dans ${countdown(CLOSE - utcMins)} · ${fmtH(14,30)}–${fmtH(21)}` };
    }
    if (utcMins >= PRE && utcMins < REG) {
      return { open: false, status: "premarket", label: "Pre-marche", detail: `Ouvre dans ${countdown(REG - utcMins)} · ${fmtH(14,30)}–${fmtH(21)}` };
    }
    if (utcMins >= CLOSE && utcMins < CLOSE + 4 * 60 && utcDay <= 4) {
      return { open: false, status: "afterhours", label: "Apres-bourse", detail: `Seance terminee · ${fmtH(14,30)}–${fmtH(21)} demain` };
    }
    if (utcMins < PRE) {
      return { open: false, status: "closed", label: "Ferme", detail: `Pre-marche dans ${countdown(PRE - utcMins)} · ${fmtH(14,30)}–${fmtH(21)}` };
    }
    return { open: false, status: "closed", label: "Ferme", detail: `${fmtH(14,30)}–${fmtH(21)} · reprise lundi` };
  }

  function renderMarketBadge(symbol, assetClass) {
    const s = getMarketStatus(symbol, assetClass);
    const color = s.status === "open" ? "var(--profit)"
      : (s.status === "premarket" || s.status === "afterhours" || s.status === "break") ? "#f59e0b"
      : "var(--loss)";
    return `<span class="badge" style="color:${color};border-color:${color}33"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle"></span>${safeText(s.label)}</span>`;
  }

  function simpleAnalysisLabel(value) {
    const map = {
      "Constructive bullish bias": "biais haussier leger",
      "Constructive bearish bias": "biais baissier leger",
      "Bullish setup": "hausse probable",
      "Bearish setup": "baisse probable",
      "Early bullish setup": "debut de hausse probable",
      "Early bearish setup": "debut de baisse probable",
      "No clear direction": "tendance neutre",
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

  function pct(v, digits = 2) {
    if (v == null || Number.isNaN(v)) return "—";
    const sign = v > 0 ? "+" : "";
    return `${sign}${num(v, digits)}%`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function compactError(message) {
    const msg = String(message || "");
    const lower = msg.toLowerCase();
    if (!msg) return null;
    if (lower.includes("alpha vantage") || lower.includes("alphavantage.co")) {
      return "Source temporairement indisponible";
    }
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

  function scoreColor(score, tone = "default") {
    if (tone === "proposed") return "var(--profit)";
    if (tone === "watch") return "var(--accent)";
    if (tone === "blocked") return "#f5a623";
    if (tone === "notrade") return "var(--neutral)";
    if (score == null) return "var(--neutral)";
    if (score >= 80) return "var(--profit)";
    if (score >= 65) return "#f5a623";
    return "var(--neutral)";
  }

  function scoreRing(score, tone = "default") {
    const value = score == null ? 0 : Math.max(0, Math.min(100, score));
    const r = 20;
    const c = 2 * Math.PI * r;
    const dash = (value / 100) * c;
    const color = scoreColor(score, tone);
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


function detectedTrendLabel(direction) {
  if (direction === "long") return "tendance haussiere";
  if (direction === "short") return "tendance baissiere";
  return "tendance neutre";
}

function decisionFromReliability(score) {
  if (score >= 70) return "Trade propose";
  if (score >= 55) return "A surveiller";
  return "Pas de trade";
}

function planSummaryText(plan) {
  if (!plan) return "Aucune lecture exploitable pour le moment.";
  if (plan.decision === "Trade propose") return "Le moteur voit un trade assez fiable pour etre ouvert automatiquement.";
  if (plan.decision === "A surveiller") return "Le contexte existe, mais la fiabilite reste insuffisante pour ouvrir un trade maintenant.";
  return "Le moteur prefere ne pas ouvrir de trade sur cet actif pour le moment.";
}

function lightweightTradePlan(item) {
  if (!item || !item.plan || typeof item.plan !== "object") return null;
  return item.plan;
}

function generateTradePlan(detail) {
  if (!detail || !detail.plan || typeof detail.plan !== "object") return null;
  return detail.plan;
}


function hasRichBreakdown(item) {
  const b = item?.breakdown || null;
  return !!(b && ["regime", "trend", "momentum", "entryQuality", "risk", "participation"].every((k) => typeof b[k] === "number"));
}

function detailEngineInputFor(item) {
  if (!item) return null;
  const clean = String(item.symbol || "").toUpperCase();
  const cached = clean ? detailCacheHit(clean) : null;
  if (cached && cached.price != null && hasRichBreakdown(cached)) {
    return { ...cached, candles: cached.candles || [] };
  }
  if (hasRichBreakdown(item) && item.price != null) {
    return { ...item, candles: item.candles || [] };
  }
  return null;
}



function rowIsUnavailable(item) {
  if (!item) return true;
  if (item.status === "unavailable") return true;
  if (item.scoreStatus === "unavailable") return true;
  if (item.error && item.price == null && item.score == null && item.officialScore == null) return true;
  return false;
}


function decisionBadgeTone(item) {
  const decision = rowDecisionLabel(item);
  if (decision === "Trade propose") return "proposed";
  if (decision === "A surveiller") return "blocked";
  if (decision === "Indisponible") return "notrade";
  return "notrade";
}

function rowDecisionLabel(item) {
  if (rowIsUnavailable(item)) return "Indisponible";
  return item?.officialDecision || item?.decision || item?.plan?.decision || "Pas de trade";
}
function opportunityDecisionTone(item) {
  const decision = rowDecisionLabel(item);
  const plan = rowTradePlan(item) || {};
  const blockers = Array.isArray(plan?.blockers) ? plan.blockers.filter(Boolean) : [];
  if (decision === "Trade propose") return "proposed";
  if (decision === "A surveiller") return blockers.length ? "blocked" : "watch";
  if (decision === "Indisponible") return "notrade";
  return "notrade";
}

function dominantStatusReason(item) {
  const decision = rowDecisionLabel(item);
  const plan = rowTradePlan(item) || {};
  const blocker = mainBlockerText(plan);
  if (decision === "Trade propose") return "plan pret a ouvrir";
  if (blocker) return blocker;
  return plan?.waitFor || item?.reasonShort || "lecture supplementaire necessaire";
}

function rowTrendLabel(item) {
  if (rowIsUnavailable(item)) return compactError(item?.error || item?.reasonShort || "Source temporairement indisponible") || "indisponible";
  return item?.trendLabel || "tendance neutre";
}

async function hydrateNonCryptoRows(rows) { return; }

function rowTradePlan(item) {
  if (!item || !item.plan) return null;
  return item.plan;
}

function currentTradePlan() {
  return officialPlanForDetail(state.detail) || state.detail?.plan || null;
}

function simpleRiskQualityLabel(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "indisponible";
  if (value >= 80) return "faible";
  if (value >= 60) return "correct";
  if (value >= 40) return "acceptable";
  return "eleve";
}

function setupStatusBadgeClass(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("confirme") || v.includes("propre")) return "positive";
  if (v.includes("surveiller") || v.includes("trop tard")) return "warning";
  if (v.includes("risque") || v.includes("non exploitable") || v.includes("pas de trade")) return "negative";
  return "";
}

function setupStatusLabel(status) {
  return String(status || "Statut inconnu");
}

function confirmationLabelText(plan) {
  const count = Number(plan?.confirmationCount ?? 0);
  const label = String(plan?.confirmationLabel || "").trim();
  if (!count) return "0 confirmation";
  return `${count} confirmation${count > 1 ? "s" : ""}${label ? ` · ${label}` : ""}`;
}

function mainBlockerText(plan) {
  const blockers = Array.isArray(plan?.blockers) ? plan.blockers.filter(Boolean) : [];
  if (blockers.length) return blockers[0];
  return "";
}

function priorityLevel(item) {
  const plan = rowTradePlan(item) || {};
  const safetyScore = safetyScoreFrom(plan) ?? safetyScoreFrom(item) ?? 0;
  const actionScore = actionabilityScoreFrom(plan) ?? actionabilityScoreFrom(item) ?? 0;
  const dossierScore = dossierScoreFrom(plan) ?? dossierScoreFrom(item) ?? 0;
  const tradeNow = plan?.tradeNow === true;
  const confirmations = Number(plan?.confirmationCount ?? item?.confirmationCount ?? 0);
  const blockers = Array.isArray(plan?.blockers) ? plan.blockers.filter(Boolean).length : 0;

  if (tradeNow && safetyScore >= 78 && actionScore >= 72 && confirmations >= 4 && blockers === 0) return "priorite haute";
  if (safetyScore >= 68 || (tradeNow && dossierScore >= 70)) return "priorite utile";
  if (safetyScore >= 58 || dossierScore >= 65) return "secondaire";
  return "faible";
}

function opportunitiesQuickSummary(groups) {
  const proposed = Array.isArray(groups?.proposed) ? groups.proposed : [];
  const watch = Array.isArray(groups?.watch) ? groups.watch : [];
  const leader = proposed[0] || watch[0] || null;
  if (!leader) return "Aucun actif propre ne ressort pour le moment.";
  const leaderPlan = rowTradePlan(leader) || {};
  const leaderBlocker = mainBlockerText(leaderPlan);
  const names = proposed.slice(0, 3).map((x) => x.symbol).join(", ");
  const leadText = proposed.length ? `Priorites du moment : ${names}.` : `Priorite du moment : ${leader.symbol}.`;
  const tradeText = proposed.length
    ? `${proposed.length} setup${proposed.length > 1 ? "s" : ""} actionnable${proposed.length > 1 ? "s" : ""}`
    : "aucun setup actionnable";
  const watchText = `${watch.length} actif${watch.length > 1 ? "s" : ""} a surveiller`;
  const blockerText = leaderBlocker ? `Blocage principal hors priorite : ${leaderBlocker}.` : "Aucun blocage majeur sur les priorites principales.";
  return `${leadText} ${tradeText}, ${watchText}. ${blockerText}`;
}

function relatedNewsForSymbol(symbol, name = "") {
  const clean = String(symbol || "").toUpperCase();
  const rawName = String(name || "").trim();
  const words = rawName.split(/\s+/).filter((w) => w.length >= 4).slice(0, 2);
  return (state.news?.items || []).filter((item) => {
    const assets = Array.isArray(item?.assets) ? item.assets.map((x) => String(x || "").toUpperCase()) : [];
    const hay = `${item?.title || ""} ${item?.summary || ""}`.toLowerCase();
    if (assets.includes(clean)) return true;
    if (clean && hay.includes(clean.toLowerCase())) return true;
    return words.some((w) => hay.includes(w.toLowerCase()));
  }).slice(0, 3);
}

function renderTradeConfirmModal() {
  if (!state.tradeConfirm?.open) return "";
  const d = state.detail;
  const plan = currentTradePlan() || {};
  const side = state.tradeConfirm?.side || plan?.side || null;
  const entry = plan?.entry ?? d?.price ?? null;
  const isCrypto = isCryptoSymbol(d?.symbol);
  const wallet = trainingWallet();
  const capitalUsd = (wallet.availableEur || 1000) / (state.market.eurusdRate || 0.92);
  const stopPct = (plan?.stopLoss != null && entry) ? Math.abs(entry - plan.stopLoss) / entry : (isCrypto ? 0.04 : 0.02);
  const riskUsd = capitalUsd * 0.01;
  const rawQty = stopPct > 0 ? riskUsd / (entry * stopPct) : (entry > 500 ? 1 : entry > 50 ? 2 : 10);
  const quantity = isCrypto ? Math.max(0.0001, parseFloat(rawQty.toFixed(entry > 10000 ? 4 : 3))) : Math.max(1, Math.round(rawQty));
  const invested = (Number(entry) || 0) * quantity;
  const riskAmount = invested * stopPct;
  const title = state.tradeConfirm?.mode === "recommended" ? "Confirmer le trade propose" : "Confirmer le trade manuel";
  const reason = state.tradeConfirm?.mode === "recommended"
    ? (plan?.reason || "Le moteur propose ce setup.")
    : "Trade manuel d'entrainement depuis la fiche actif.";
  const contextLabel = isCrypto ? "Crypto · volatilite elevee · stop ~" + num(stopPct * 100, 1) + "%" : "Action/ETF · stop ~" + num(stopPct * 100, 1) + "%";

  return `
    <div class="modal-backdrop" data-cancel-trade-confirm style="position:fixed;inset:0;background:rgba(3,8,20,.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px">
      <div class="card" style="width:min(560px,100%);padding:18px 18px 16px;border:1px solid rgba(255,255,255,.12)" onclick="event.stopPropagation()">
        <div class="section-title"><span>${safeText(title)}</span><span>${safeText(d?.symbol || "—")}</span></div>
        <div class="trade-context-pill ${isCrypto ? "crypto" : "stock"}">${safeText(contextLabel)}</div>
        <div class="kv" style="margin-top:10px">
          <div class="muted">Actif</div><div>${safeText(d?.symbol || "—")} · ${safeText(d?.name || "")}</div>
          <div class="muted">Sens</div><div>${safeText(simpleSideLabel(side || "long"))}</div>
          <div class="muted">Entree</div><div>${entry != null ? priceDisplay(entry) : "—"}</div>
          <div class="muted">Quantite</div><div>${quantity}</div>
          <div class="muted">Investi</div><div>${entry != null ? priceDisplay(invested) : "—"}</div>
          <div class="muted">Risque (1%)</div><div class="negative">~${priceDisplay(riskUsd)} USD</div>
          <div class="muted">Stop</div><div>${plan?.stopLoss != null ? priceDisplay(plan.stopLoss) : "—"}</div>
          <div class="muted">Objectif</div><div>${plan?.takeProfit != null ? priceDisplay(plan.takeProfit) : "—"}</div>
          <div class="muted">Ratio</div><div>${plan?.rr != null ? num(plan.rr, 2) : "—"}</div>
        </div>
        <div class="plan-reason" style="margin-top:12px">${safeText(reason)}</div>
        <div class="trade-actions" style="margin-top:14px">
          <button class="btn" data-cancel-trade-confirm>Annuler</button>
          <button class="btn trade-btn primary" data-confirm-open-trade>Confirmer le trade</button>
        </div>
      </div>
    </div>`;
}

function openTradeConfirmModal(mode, side = null) {
  state.tradeConfirm = { open: true, mode, side };
  state.error = null;
  render();
}

function closeTradeConfirmModal() {
  state.tradeConfirm = { open: false, mode: null, side: null };
  render();
}

function confirmTradeFromModal() {
  const mode = state.tradeConfirm?.mode;
  const side = state.tradeConfirm?.side || null;
  state.tradeConfirm = { open: false, mode: null, side: null };
  if (mode === "recommended") createRecommendedTrade();
  else if (mode === "manual" && side) addTrainingTradeFromDetail(side);
}

  function normalizeOpportunity(item) {
    const officialScore = Number(
      item?.officialScore ?? item?.plan?.safetyScore ?? item?.safetyScore ?? item?.plan?.exploitabilityScore ?? item?.exploitabilityScore ?? NaN
    );
    return {
      symbol: item?.symbol || "",
      name: item?.name || "Nom indisponible",
      assetClass: item?.assetClass || "unknown",
      price: typeof item?.price === "number" ? item.price : null,
      change24hPct: typeof item?.change24hPct === "number" ? item.change24hPct : null,
      sourceUsed: item?.sourceUsed || null,
      freshness: item?.freshness || "unknown",
      status: item?.status || (item?.price != null ? "ok" : "unavailable"),
      score: typeof item?.score === "number" ? item.score : null,
      officialScore: Number.isFinite(officialScore) ? Math.max(0, Math.min(100, Math.round(officialScore))) : null,
      scoreStatus: item?.scoreStatus || (item?.price != null ? "complete" : "unavailable"),
      direction: item?.direction || "neutral",
      analysisLabel: item?.analysisLabel || null,
      confidence: item?.confidence || "low",
      confidenceLabel: item?.confidenceLabel || simpleConfidenceLabel(item?.confidence || "low"),
      breakdown: item?.breakdown || null,
      reasonShort: item?.reasonShort || null,
      decision: item?.decision || null,
      officialDecision: item?.officialDecision || item?.decision || item?.plan?.decision || null,
      trendLabel: item?.trendLabel || null,
      officialTrendLabel: item?.officialTrendLabel || item?.trendLabel || item?.plan?.trendLabel || null,
      officialWaitFor: item?.officialWaitFor || item?.plan?.waitFor || null,
      regime: item?.regime || null,
      plan: item?.plan || null,
      setupStatus: item?.setupStatus || item?.plan?.setupStatus || null,
      tradeNow: item?.tradeNow === true || item?.plan?.tradeNow === true,
      confirmationCount: typeof item?.confirmationCount === "number" ? item.confirmationCount : (typeof item?.plan?.confirmationCount === "number" ? item.plan.confirmationCount : null),
      blockers: Array.isArray(item?.blockers) ? item.blockers : (Array.isArray(item?.plan?.blockers) ? item.plan.blockers : []),
      candles: Array.isArray(item?.candles) ? item.candles : [],
      fxUsdToEur: isValidEurusdRate(item?.fxUsdToEur) ? Number(item.fxUsdToEur) : null,
      // PR #7 Phase 2 — news modulator + régime bonus pour affichage sur la fiche
      regimeBonus: Number.isFinite(Number(item?.regimeBonus)) ? Number(item.regimeBonus) : 0,
      regimeBonusReason: item?.regimeBonusReason || null,
      newsBonus: Number.isFinite(Number(item?.newsBonus)) ? Number(item.newsBonus) : 0,
      newsBonusReason: item?.newsBonusReason || null,
      newsContext: item?.newsContext || null,
      error: compactError(item?.error || item?.reasonShort || null)
    };
  }

  function saveOpportunitiesSnapshot(rows) {
    state.opportunitiesSnapshot = rows;
    writeJson(STORAGE_KEYS.opportunitiesSnapshot, rows);
  }

  function mergeOpportunityWithStored(current, stored) {
    if (!stored) return current;
    return normalizeOpportunity({
      ...current,
      ...stored,
      price: stored.price ?? current.price,
      change24hPct: stored.change24hPct ?? current.change24hPct,
      score: stored.score ?? current.score,
      officialScore: stored.officialScore ?? current.officialScore,
      decision: stored.decision || current.decision || null,
      officialDecision: stored.officialDecision || current.officialDecision || null,
      trendLabel: stored.trendLabel || current.trendLabel || null,
      officialTrendLabel: stored.officialTrendLabel || current.officialTrendLabel || null,
      officialWaitFor: stored.officialWaitFor || current.officialWaitFor || null,
      reasonShort: stored.reasonShort || current.reasonShort || null,
      plan: stored.plan || current.plan || null,
      status: stored.status || current.status || null,
      freshness: stored.freshness || current.freshness || "unknown"
    });
  }

  function backfillOpportunities(rows) {
    const snapshotMap = new Map((state.opportunitiesSnapshot || []).map(x => [String(x.symbol || "").toUpperCase(), x]));
    return (rows || []).map((item) => {
      const clean = String(item?.symbol || "").toUpperCase();
      if (!clean) return item;
      const snap = snapshotMap.get(clean);
      return snap ? mergeOpportunityWithStored(item, snap) : item;
    });
  }

  // =========================
  // price alerts
  // =========================
  function loadPriceAlerts() {
    return readJson(STORAGE_KEYS.priceAlerts, []);
  }

  function savePriceAlerts() {
    writeJson(STORAGE_KEYS.priceAlerts, state.priceAlerts);
  }

  function addPriceAlert(symbol, name, condition, targetPrice, currentPrice) {
    state.priceAlerts.push({
      id: Date.now() + Math.random(),
      symbol: String(symbol).toUpperCase(),
      name: name || symbol,
      condition,
      targetPrice: Number(targetPrice),
      currentPriceAtCreation: currentPrice != null ? Number(currentPrice) : null,
      active: true,
      createdAt: Date.now(),
      triggeredAt: null
    });
    savePriceAlerts();
  }

  function removePriceAlert(id) {
    state.priceAlerts = state.priceAlerts.filter(a => a.id !== id);
    savePriceAlerts();
  }

  function clearTriggeredAlerts() {
    state.priceAlerts = state.priceAlerts.filter(a => a.active);
    savePriceAlerts();
  }

  function showAlertToast(title, body) {
    state.alertToast = { title, body, shownAt: Date.now() };
    render();
    setTimeout(() => {
      if (state.alertToast && (Date.now() - state.alertToast.shownAt) >= 4500) {
        state.alertToast = null;
        render();
      }
    }, 5000);
  }

  async function sendNotification(title, body, opts = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const base = {
      body,
      icon: "/ManiTradePro/icons/icon-192.png",
      badge: "/ManiTradePro/icons/icon-192.png",
      vibrate: [120, 60, 120],
      ...opts
    };
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, base);
      } else {
        new Notification(title, base);
      }
    } catch (_) {
      try { new Notification(title, base); } catch (__) {}
    }
  }

  function fireAlertNotification(alert, currentPrice) {
    const dir = alert.condition === "above" ? "⬆ au-dessus de" : "⬇ en-dessous de";
    const title = `◉ Alerte prix — ${alert.symbol}`;
    const body = `${alert.symbol} est ${dir} ${priceDisplay(alert.targetPrice)}\nActuel : ${priceDisplay(currentPrice)}`;
    sendNotification(title, body, { tag: `alert-${alert.symbol}`, renotify: true, requireInteraction: false });
    showAlertToast(title, body);
  }

  function checkPriceAlerts() {
    if (!state.priceAlerts.length) return;
    let changed = false;
    state.priceAlerts.forEach(alert => {
      if (!alert.active) return;
      const item = (state.opportunities || []).find(o => String(o.symbol || "").toUpperCase() === alert.symbol);
      if (!item || item.price == null) return;
      const triggered = alert.condition === "above" ? item.price >= alert.targetPrice : item.price <= alert.targetPrice;
      if (triggered) {
        alert.active = false;
        alert.triggeredAt = Date.now();
        changed = true;
        fireAlertNotification(alert, item.price);
      }
    });
    if (changed) savePriceAlerts();
  }

  async function requestNotificationsPermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return await Notification.requestPermission();
  }

  function checkSignalAlerts() {
    if (!state.settings.algoSignalNotifs) return;
    const currentSignals = new Set(
      state.opportunities
        .filter(o => o.tradeNow === true || String(o.officialDecision || "").toLowerCase().includes("trade propose"))
        .map(o => o.symbol)
    );
    if (state.algoSignalsPrev === null) {
      state.algoSignalsPrev = currentSignals;
      return;
    }
    currentSignals.forEach(sym => {
      if (!state.algoSignalsPrev.has(sym)) {
        const o = state.opportunities.find(x => x.symbol === sym);
        if (!o) return;
        const scoreStr = o.officialScore != null ? ` · sûreté ${o.officialScore}/100` : "";
        const changeStr = o.change24hPct != null ? ` · ${o.change24hPct >= 0 ? "+" : ""}${pct(o.change24hPct)}` : "";
        const dirIcon = String(o.direction || "").toLowerCase() === "long" ? "▲" : String(o.direction || "").toLowerCase() === "short" ? "▼" : "●";
        const title = `${dirIcon} Signal algo — ${sym}`;
        const body = `${o.name || sym}\nTrade proposé${scoreStr}${changeStr}`;
        sendNotification(title, body, { tag: `signal-${sym}`, renotify: true, requireInteraction: true });
        showAlertToast(title, body);
      }
    });
    state.algoSignalsPrev = currentSignals;
  }

  function setOpportunities(rows) {
    const prepared = Array.isArray(rows) ? backfillOpportunities(rows).map(normalizeOpportunity) : [];
    state.opportunities = prepared;
    saveOpportunitiesSnapshot(prepared);
    syncMarketContext(null, prepared);
    applyFilter();
    state.opportunitiesFetchedAt = Date.now();
    state.opportunitiesLastGoodAt = state.opportunitiesFetchedAt;
    checkPriceAlerts();
    checkSignalAlerts();
  }

  // =========================
  // api
  // =========================
  async function api(path, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, { cache: "no-store", signal: controller.signal });
    } catch (e) {
      clearTimeout(timer);
      if (e && e.name === "AbortError") throw new Error("Delai depasse");
      throw e;
    }
    clearTimeout(timer);
    recordBudgetUsage(res.headers);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function apiPost(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...workerAdminHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { ...workerAdminHeaders() }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function apiPatch(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...workerAdminHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function apiGetAuth(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { ...workerAdminHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  async function loadAiReview(detail, localPlan) {
    if (!detail) return null;
    const aiMeta = aiDisplayState(localPlan || {});
    if (aiMeta.title === "LECTURE MOTEUR SEULE") {
      state.loadingAiReview = false;
      state.aiReview = {
        provider: aiMeta.source,
        externalAiUsed: false,
        decision: localPlan?.decision || "A surveiller",
        prudence: localPlan?.safety || "moyenne",
        reason: localPlan?.aiSummary || localPlan?.reason || "Lecture moteur seule.",
        invalidation: localPlan?.refusalReason || localPlan?.reason || "Pas d'invalidation supplementaire.",
        summary: localPlan?.aiSummary || localPlan?.reason || "Lecture moteur seule.",
        warning: aiMeta.message
      };
      render();
      return state.aiReview;
    }

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
        provider: "local_fallback",
        externalAiUsed: false,
        decision: localPlan?.decision || "Pas de trade conseille",
        prudence: localPlan?.safety || "moyenne",
        reason: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        invalidation: localPlan?.refusalReason || "Attendre un signal plus propre.",
        summary: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        warning: "IA externe indisponible, fallback local utilise."
      };
    } finally {
      state.loadingAiReview = false;
      render();
    }
  }

  async function loadJournalAnalysis() {
    const history = state.trades.history;
    if (history.length < 3) { showAlertToast("Journal IA", "Besoin d'au moins 3 trades fermes."); return; }
    state.loadingJournalAnalysis = true;
    state.journalAnalysis = null;
    render();
    try {
      const norm = p => normalizePositionRecord(p);
      const result = await apiPost("/api/ai/journal-analysis", {
        history: history.map(norm),
        positions: state.trades.positions.map(norm),
        cryptoHistory: history.filter(p => isCryptoSymbol(p.symbol)).map(norm),
        stockHistory: history.filter(p => !isCryptoSymbol(p.symbol)).map(norm)
      });
      state.journalAnalysis = result?.data || null;
    } catch(e) {
      state.journalAnalysis = { resume: "Erreur : " + (e.message || "IA indisponible"), biais: [], patterns: [], forces: [], recommandations: [], stats: null };
    } finally {
      state.loadingJournalAnalysis = false;
      render();
    }
  }

  // ============================================================
  // USER ASSETS (actifs personnalisés)
  // ============================================================
  async function loadUserAssets() {
    state.userAssetsLoading = true;
    state.userAssetsError = null;
    render();
    try {
      const result = await apiGetAuth("/api/user-assets");
      state.userAssets = Array.isArray(result?.data?.assets) ? result.data.assets : [];
    } catch (e) {
      state.userAssetsError = e.message || "Erreur de chargement";
      state.userAssets = [];
    } finally {
      state.userAssetsLoading = false;
      render();
    }
  }

  async function addUserAsset() {
    const f = state.addAssetForm;
    const symbol = String(f.symbol || "").trim().toUpperCase();
    if (!symbol) { state.addAssetForm.error = "Saisis un symbole."; render(); return; }
    state.addAssetForm.loading = true;
    state.addAssetForm.error = null;
    render();
    try {
      const payload = { symbol, name: String(f.name || "").trim() || symbol, asset_class: f.assetClass };
      const result = await apiPost("/api/user-assets", payload);
      haptic([15, 20, 15]);
      state.addAssetForm = { open: false, symbol: "", name: "", assetClass: "crypto", loading: false, error: null };
      if (result?.data) state.userAssets = [result.data, ...state.userAssets];
      render();
      await loadUserAssets();
    } catch (e) {
      state.addAssetForm.loading = false;
      state.addAssetForm.error = e.message || "Erreur d'ajout";
      render();
    }
  }

  async function deleteUserAsset(symbol) {
    if (!confirm(`Supprimer "${symbol}" de ta liste ?`)) return;
    haptic([20, 40, 20]);
    try {
      await apiDelete(`/api/user-assets/${encodeURIComponent(symbol)}`);
      state.userAssets = state.userAssets.filter(a => String(a.symbol).toUpperCase() !== symbol.toUpperCase());
      render();
    } catch (e) {
      alert(`Erreur : ${e.message || "suppression impossible"}`);
    }
  }

  async function toggleUserAsset(symbol, enabled) {
    haptic(8);
    try {
      await apiPatch(`/api/user-assets/${encodeURIComponent(symbol)}`, { enabled });
      state.userAssets = state.userAssets.map(a =>
        String(a.symbol).toUpperCase() === symbol.toUpperCase() ? { ...a, enabled } : a
      );
      render();
    } catch (e) {
      alert(`Erreur : ${e.message || "mise à jour impossible"}`);
      await loadUserAssets();
    }
  }

  // PR #8 Phase 2 — pin/unpin actif
  async function togglePinUserAsset(symbol, currentlyPinned) {
    haptic(8);
    const pin = !currentlyPinned;
    try {
      const res = await apiPost("/api/user-assets/pin", { symbol, pin });
      if (res?.data?.ok === false) {
        alert(`Erreur : ${res.data.error || "pin impossible"}`);
        return;
      }
      state.userAssets = state.userAssets.map(a =>
        String(a.symbol).toUpperCase() === symbol.toUpperCase() ? { ...a, is_pinned: pin } : a
      );
      render();
    } catch (e) {
      alert(`Erreur : ${e.message || "pin impossible"}`);
      await loadUserAssets();
    }
  }

  // ============================================================
  // BOT (training auto-cycle)
  // ============================================================
  async function loadBot() {
    state.bot.loading = true;
    state.bot.error = null;
    render();
    try {
      const [account, events, stats] = await Promise.all([
        apiGetAuth("/api/training/account").catch(e => ({ _err: e.message })),
        apiGetAuth("/api/training/events?limit=30").catch(e => ({ _err: e.message })),
        apiGetAuth("/api/training/stats").catch(e => ({ _err: e.message }))
      ]);
      if (account?._err) throw new Error(account._err);
      state.bot.account = account?.data || null;
      state.bot.events = events?.data?.events || [];
      state.bot.stats = stats?.data?.stats || null;
      state.bot.error = null;
    } catch (e) {
      state.bot.error = e.message || "Erreur de chargement";
    } finally {
      state.bot.loading = false;
      render();
    }
  }

  async function loadTradeFeedback() {
    // PR #5 Phase 2 — hydrate state.tradeFeedback (map par trade_id)
    try {
      const resp = await api("/api/training/feedback?limit=500").catch(() => null);
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      const map = {};
      for (const row of rows) {
        if (row && row.trade_id) map[String(row.trade_id)] = row;
      }
      state.tradeFeedback = map;
    } catch {
      // silencieux — l'UI garde le dernier snapshot
    }
  }

  async function loadReports() {
    // PR #9 Phase 2 — charge la liste des rapports hebdo
    state.reports.loading = true;
    state.reports.error = null;
    render();
    try {
      const resp = await api("/api/reports/weekly?limit=20").catch(() => null);
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      state.reports.list = rows;
      state.reports.error = null;
    } catch (e) {
      state.reports.error = e.message || "Erreur de chargement";
      state.reports.list = [];
    } finally {
      state.reports.loading = false;
      render();
    }
  }

  async function generateReportNow() {
    if (state.reports.generating) return;
    haptic([15, 20, 15]);
    state.reports.generating = true;
    render();
    try {
      const res = await apiPost("/api/reports/weekly/generate", { force: true });
      if (res?.data?.ok === false) {
        alert(`Erreur : ${res.data.reason || "impossible de générer"}`);
      } else if (res?.data?.skipped) {
        alert(`Déjà généré pour ${res.data.weekStart}. Coche "forcer" dans le body si tu veux régénérer.`);
      }
      await loadReports();
    } catch (e) {
      alert(`Erreur : ${e.message || "génération impossible"}`);
    } finally {
      state.reports.generating = false;
      render();
    }
  }

  async function loadHealth() {
    // PR #4 Phase 1 — onglet Santé du bot (ajustements + drift + bucket stats)
    state.health.loading = true;
    state.health.error = null;
    render();
    try {
      const [adjustments, bucketStats] = await Promise.all([
        api("/api/engine/adjustments?limit=100").catch(() => null),
        api("/api/engine/bucket-stats").catch(() => null)
      ]);
      state.health.adjustments = Array.isArray(adjustments?.data) ? adjustments.data : [];
      state.health.bucketStats = Array.isArray(bucketStats?.data) ? bucketStats.data : [];
      state.health.lastLoadedAt = Date.now();
      state.health.error = null;
    } catch (e) {
      state.health.error = e.message || "Erreur de chargement";
    } finally {
      state.health.loading = false;
      render();
    }
  }

  async function toggleBotSetting(key, value) {
    haptic(8);
    if (state.bot.account?.settings) state.bot.account.settings[key] = value;
    render();
    try {
      const res = await apiPost("/api/training/settings", { [key]: value });
      if (res?.data) state.bot.account = { ...(state.bot.account || {}), settings: res.data };
      render();
    } catch (e) {
      alert(`Erreur : ${e.message || "sauvegarde impossible"}`);
      await loadBot();
    }
  }

  async function forceBotCycle() {
    if (state.bot.forcingCycle) return;
    state.bot.forcingCycle = true;
    haptic([15, 20, 15]);
    render();
    try {
      await apiPost("/api/training/auto-cycle", {});
      showAlertToast("Bot", "Cycle lancé, résultat dans quelques secondes…");
      setTimeout(() => loadBot().catch(() => {}), 3500);
    } catch (e) {
      alert(`Erreur : ${e.message || "cycle impossible"}`);
    } finally {
      state.bot.forcingCycle = false;
      render();
    }
  }

  // Édition des paramètres
  function openBotEdit() {
    const src = state.bot.account?.settings || {};
    state.bot.editDraft = JSON.parse(JSON.stringify(src));
    render();
  }
  function cancelBotEdit() {
    state.bot.editDraft = null;
    state.bot.savingDraft = false;
    render();
  }
  function updateBotDraftField(key, value) {
    if (!state.bot.editDraft) return;
    // Les "_display" en pourcentage sont convertis en ratio à la sauvegarde
    state.bot.editDraft[key] = value;
  }
  function toggleBotDraftSetup(setup, enabled) {
    if (!state.bot.editDraft) return;
    const current = Array.isArray(state.bot.editDraft.allowed_setups) ? state.bot.editDraft.allowed_setups.slice() : [];
    const idx = current.indexOf(setup);
    if (enabled && idx === -1) current.push(setup);
    else if (!enabled && idx !== -1) current.splice(idx, 1);
    state.bot.editDraft.allowed_setups = current;
  }
  function normalizeBotDraftForSave(d) {
    const out = { ...d };
    const pctKeys = [
      ["risk_per_trade_pct_display", "risk_per_trade_pct", 100],
      ["allocation_per_trade_pct_display", "allocation_per_trade_pct", 100],
      ["max_daily_loss_pct_display", "max_daily_loss_pct", 100],
      ["max_weekly_loss_pct_display", "max_weekly_loss_pct", 100]
    ];
    for (const [src, dst, div] of pctKeys) {
      if (out[src] != null && out[src] !== "") {
        const v = Number(out[src]);
        if (Number.isFinite(v)) out[dst] = v / div;
      }
      delete out[src];
    }
    const numericKeys = ["capital_base", "max_open_positions", "max_positions_per_symbol", "max_holding_hours", "min_actionability_score", "min_dossier_score", "max_consecutive_losses"];
    for (const k of numericKeys) {
      if (out[k] != null && out[k] !== "") out[k] = Number(out[k]);
    }
    // Booleans explicites
    for (const k of ["allow_long", "allow_short", "mean_reversion_enabled"]) {
      out[k] = !!out[k];
    }
    return out;
  }
  async function saveBotDraft() {
    if (!state.bot.editDraft) return;
    state.bot.savingDraft = true;
    haptic([15, 20, 15]);
    render();
    try {
      const payload = normalizeBotDraftForSave(state.bot.editDraft);
      await apiPost("/api/training/settings", payload);
      state.bot.editDraft = null;
      await loadBot();
    } catch (e) {
      alert(`Erreur : ${e.message || "sauvegarde impossible"}`);
    } finally {
      state.bot.savingDraft = false;
      render();
    }
  }
  async function applyBotTrainingPreset() {
    if (!confirm("Appliquer le mode entraînement permissif ?\n\nShort activé, seuils relâchés (60/60), max positions 15, mean reversion ON, weekly/consecutive loss désactivés.")) return;
    const preset = {
      allow_long: true,
      allow_short: true,
      max_open_positions: 15,
      max_positions_per_symbol: 1,
      min_actionability_score: 60,
      min_dossier_score: 60,
      allocation_per_trade_pct: 0.08,
      allowed_setups: ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short", "mean_reversion"],
      mean_reversion_enabled: true,
      max_daily_loss_pct: 0.30,
      max_weekly_loss_pct: 1.0,
      max_consecutive_losses: 999
    };
    state.bot.savingDraft = true;
    haptic([20, 40, 20]);
    render();
    try {
      await apiPost("/api/training/settings", preset);
      state.bot.editDraft = null;
      await loadBot();
      showAlertToast("Bot", "Mode entraînement permissif appliqué.");
    } catch (e) {
      alert(`Erreur : ${e.message || "preset impossible"}`);
    } finally {
      state.bot.savingDraft = false;
      render();
    }
  }

  function renderBot() {
    const { loading, error, account, events, stats } = state.bot;
    if (loading) return `<div class="screen"><div class="empty-state">Chargement du bot…</div></div>`;
    if (error) return `<div class="screen"><div class="error-box">${safeText(error)}</div></div>`;
    if (!account) {
      return `<div class="screen">
        <div class="screen-header"><div class="screen-title">Bot d'entraînement</div></div>
        <div class="empty-state" style="margin-top:24px">
          <div style="margin-bottom:14px">Aucune donnée chargée.</div>
          <button class="btn btn-primary" data-bot-refresh>Charger</button>
        </div>
        ${renderBottomNav()}
      </div>`;
    }
    const cfg = account.settings || {};
    const wr = stats?.winRate != null ? `${(stats.winRate * 100).toFixed(0)} %` : "—";
    const pnl = stats?.totalPnl != null ? `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)} €` : "—";
    const pnlClass = stats?.totalPnl != null ? (stats.totalPnl >= 0 ? "positive" : "negative") : "";
    return `<div class="screen">
      <div class="screen-header">
        <div class="screen-title">Bot d'entraînement</div>
        <div class="screen-subtitle">Simulation automatique${account.balance_eur != null ? ` — capital virtuel ${Number(account.balance_eur).toFixed(2)} €` : ""}</div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px">
        <div class="stat-card"><div class="stat-label">Trades</div><div class="stat-value">${stats?.totalCount ?? "—"}</div></div>
        <div class="stat-card"><div class="stat-label">Win rate</div><div class="stat-value">${wr}</div></div>
        <div class="stat-card"><div class="stat-label">PnL total</div><div class="stat-value ${pnlClass}">${pnl}</div></div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="section-title">Paramètres</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px">
            <span>Bot actif</span>
            <input type="checkbox" ${cfg.enabled ? "checked" : ""} data-bot-toggle="enabled">
          </label>
          <label style="display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px">
            <span>Notifications cycle</span>
            <input type="checkbox" ${cfg.notifyOnCycle ? "checked" : ""} data-bot-toggle="notifyOnCycle">
          </label>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-force-cycle ${state.bot.forcingCycle ? "disabled" : ""}>${state.bot.forcingCycle ? "En cours…" : "Forcer un cycle"}</button>
          <button class="btn" data-bot-refresh>Actualiser</button>
        </div>
      </div>
      ${events.length ? `<div class="card">
        <div class="section-title">Derniers événements</div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${events.slice(0, 20).map(ev => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);font-size:.85rem">
              <span class="muted" style="font-size:.75rem;white-space:nowrap;flex-shrink:0">${new Date(ev.at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
              <span style="flex:1;min-width:0;overflow-wrap:break-word">${safeText(ev.type)}${ev.symbol ? ` — ${safeText(ev.symbol)}` : ""}</span>
            </div>`).join("")}
        </div>
      </div>` : `<div class="empty-state" style="margin-top:8px">Aucun événement enregistré.</div>`}
      ${renderBottomNav()}
    </div>`;
  }

  async function loadPortfolioPriority() {
    const opps = state.filteredOpportunities.length ? state.filteredOpportunities : state.opportunities;
    if (!opps.length) { showAlertToast("Priorite IA", "Lance d'abord un scan pour avoir des opportunites."); return; }
    state.loadingPortfolioPriority = true;
    state.portfolioPriority = null;
    render();
    try {
      const stats = trainingStats();
      const result = await apiPost("/api/ai/portfolio-priority", {
        opportunities: opps.slice(0, 10),
        positions: state.trades.positions.map(p => normalizePositionRecord(p)),
        capitalAvailable: stats.wallet.availableEur || 0
      });
      state.portfolioPriority = result?.data || null;
    } catch(e) {
      state.portfolioPriority = { conseil: "Erreur : " + (e.message || "IA indisponible"), ranking: [], eviter: [] };
    } finally {
      state.loadingPortfolioPriority = false;
      render();
    }
  }


  async function loadDashboard() {
    try {
      const [fg, trending, portfolio, news, newsWindow] = await Promise.all([
        api("/api/fear-greed").catch(() => null),
        api("/api/trending").catch(() => null),
        api("/api/portfolio/summary").catch(() => null),
        api("/api/news").catch(() => null),
        api("/api/news-window").catch(() => null)
      ]);
      state.dashboard.fearGreed = fg?.data || null;
      state.dashboard.trending = trending?.data || [];
      state.dashboard.portfolio = portfolio?.data || null;
      state.dashboard.newsWindow = newsWindow || null;
      state.news = {
        items: Array.isArray(news?.data?.items) ? news.data.items : [],
        overview: news?.data?.overview || null,
        status: news?.status || "idle",
        source: news?.source || null,
        asOf: news?.asOf || null,
        message: news?.message || null
      };
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
    const hasVisibleRows = Array.isArray(state.opportunities) && state.opportunities.length > 0;

    state.opportunitiesRefreshing = true;
    if (force && !hasVisibleRows) {
      state.loading = true;
    }
    render();

    try {
      const result = await api("/api/opportunities", 12000);
      if (requestId !== state.opportunitiesRequestId) return;
      const rows = Array.isArray(result?.data) ? result.data : [];
      syncMarketContext({
        eurusdRate: result?.meta?.eurusdRate,
        regime: result?.meta?.regime,
        asOf: result?.asOf,
        message: result?.message
      }, rows);
      if (rows.length) {
        setOpportunities(rows);
        rows.forEach((row) => updateJournalMoteurFromOpportunity(normalizeOpportunity(row)));
        state.opportunitiesLastGoodAt = Date.now();
      }
      markScheduledFetch("opportunities");
      state.error = null;
    } catch (e) {
      if (requestId !== state.opportunitiesRequestId) return;
      if (!state.opportunities.length && state.opportunitiesSnapshot?.length) {
        state.opportunities = state.opportunitiesSnapshot.map(normalizeOpportunity);
        syncMarketContext(null, state.opportunities);
        applyFilter();
      }
      state.error = state.opportunities.length ? "Mise a jour impossible pour le moment. Derniere liste conservee." : (e.message || "Chargement impossible");
    } finally {
      if (requestId !== state.opportunitiesRequestId) return;
      state.loading = false;
      state.opportunitiesRefreshing = false;
      render();
    }
  }

  async function loadDetail(symbol) {
    const now = Date.now();
    const cleanSymbol = String(symbol || "").toUpperCase();
    const cachedDetail = detailCacheHit(cleanSymbol);

    if (state.detail && state.detail.symbol === cleanSymbol && (now - state.detailRequestStartedAt) < 15000) {
      render();
      return;
    }

    state.detailRequestStartedAt = now;
    state.loadingDetail = !cachedDetail;
    if (cachedDetail) state.detail = normalizeOpportunity(cachedDetail);
    state.error = null;
    render();

    try {
      const [detail, candles] = await Promise.all([
        api(`/api/opportunity-detail/${encodeURIComponent(cleanSymbol)}`),
        api(`/api/candles/${encodeURIComponent(cleanSymbol)}?timeframe=1d&limit=90`).catch(() => null)
      ]);

      const merged = normalizeOpportunity({
        ...(detail.data || {}),
        candles: Array.isArray(detail?.data?.candles) && detail.data.candles.length
          ? detail.data.candles
          : (candles?.data || cachedDetail?.candles || [])
      });

      syncMarketContext({
        eurusdRate: detail?.data?.fxUsdToEur,
        regime: detail?.data?.regime,
        asOf: detail?.asOf
      }, detail?.data ? [detail.data] : null);

      state.detail = merged;
      updateJournalMoteurFromOpportunity(merged);
      saveDetailCache(cleanSymbol, merged);
      state.error = null;

      if (merged.status === "ok" && merged.plan) {
        loadAiReview(merged, merged.plan);
      } else {
        state.aiReview = null;
      }
    } catch (e) {
      state.error = e.message || "Fiche indisponible";
      if (cachedDetail) state.detail = normalizeOpportunity(cachedDetail);
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
  const investedUsd = d.price * quantity;
  if (!canOpenTrainingTrade(d.price, quantity)) {
    state.error = "Capital fictif insuffisant pour ouvrir ce trade d'entrainement.";
    render();
    return;
  }
  const position = {
    id: uid("pos"),
    symbol: d.symbol,
    name: d.name,
    assetClass: d.assetClass,
    side,
    source: "manual",
    quantity,
    entryPrice: d.price,
    invested: investedUsd,
    openedAt: nowIso(),
    status: "open",
    sourceUsed: d.sourceUsed || null,
    stopLoss: null,
    takeProfit: null,
    tradeDecision: "manuel",
    tradeReason: "Trade cree manuellement depuis la fiche actif.",
    rr: null,
    horizon: null,
    execution: {
      openedAt: nowIso(),
      entryPrice: d.price,
      quantity,
      invested: investedUsd
    }
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
  state.error = null;
  render();
}

function createRecommendedTrade() {
  const d = state.detail;
  const plan = currentTradePlan();
  if (!d || !plan || !plan.side || plan.decision !== "Trade propose") {
    state.error = "Aucun trade n'est propose automatiquement pour le moment.";
    render();
    return;
  }
  const quantity = d.price > 500 ? 1 : d.price > 50 ? 2 : 10;
  const investedUsd = plan.entry * quantity;
  if (!canOpenTrainingTrade(plan.entry, quantity)) {
    state.error = "Capital fictif insuffisant pour ouvrir ce trade propose.";
    render();
    return;
  }
  const position = {
    id: uid("pos"),
    symbol: d.symbol,
    name: d.name,
    assetClass: d.assetClass,
    side: plan.side,
    source: "algo",
    quantity,
    entryPrice: plan.entry,
    invested: investedUsd,
    openedAt: nowIso(),
    status: "open",
    sourceUsed: d.sourceUsed || null,
    stopLoss: plan.stopLoss,
    takeProfit: plan.takeProfit,
    tradeDecision: plan.decision,
    tradeReason: plan.reason,
    rr: plan.rr,
    horizon: plan.horizon,
    confidence: plan.confidence,
    algoScore: d.score ?? null,
    execution: {
      openedAt: nowIso(),
      entryPrice: plan.entry,
      quantity,
      invested: investedUsd
    }
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
  state.error = null;
  render();
}

function closeTrainingTrade(id, livePrice = null) {
    const idx = state.trades.positions.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const position = normalizePositionRecord(state.trades.positions[idx]);
    const meta = tradeStatusMeta(position);
    const fallbackEntry = Number(position?.execution?.entryPrice ?? position?.entryPrice);
    const resolvedExitPrice = Number(livePrice ?? meta.livePrice ?? position?.live?.price ?? fallbackEntry);
    const exitPrice = (Number.isFinite(resolvedExitPrice) && resolvedExitPrice > 0) ? resolvedExitPrice : fallbackEntry;
    if (!(Number.isFinite(exitPrice) && exitPrice > 0)) {
      state.error = "Impossible de cloturer ce trade : prix de sortie invalide.";
      render();
      return;
    }
    const { pnl, pnlPct } = getOpenPnl(position, exitPrice);
    const closedAt = nowIso();
    const closed = normalizePositionRecord({
      ...position,
      exitPrice,
      closedAt,
      pnl,
      pnlPct,
      sourceUsed: position.sourceUsed || "training",
      closeType: "Cloture manuelle",
      closedExecution: {
        exitPrice,
        closedAt,
        closeType: "Cloture manuelle"
      },
      status: "closed"
    });
    state.trades.positions.splice(idx, 1);
    state.trades.history.unshift(closed);
    persistTradesState();
    render();
  }

  function trainingWallet() {
    const positions = Array.isArray(state.trades?.positions) ? state.trades.positions.map(normalizePositionRecord) : [];
    const history = Array.isArray(state.trades?.history) ? state.trades.history.map(normalizePositionRecord) : [];
    const startingBalanceEur = Number(state.trainingCapital?.startingBalanceEur || 10000);

    const engagedEur = positions.reduce((sum, p) => {
      const investedUsd = Number((p.execution || {}).invested ?? p.invested);
      return sum + ((Number.isFinite(investedUsd) && investedUsd > 0) ? investedUsd * fxRateUsdToEur() : 0);
    }, 0);

    const realizedEur = history.reduce((sum, row) => sum + (Number(row?.pnl || 0) * fxRateUsdToEur()), 0);
    const unrealizedEur = positions.reduce((sum, p) => sum + (Number((p.live || {}).pnl || 0) * fxRateUsdToEur()), 0);
    const availableEur = startingBalanceEur + realizedEur - engagedEur;
    const equityEur = startingBalanceEur + realizedEur + unrealizedEur;

    return {
      startingBalanceEur,
      engagedEur,
      realizedEur,
      unrealizedEur,
      availableEur,
      equityEur
    };
  }

  function canOpenTrainingTrade(entryPriceUsd, quantity) {
    const wallet = trainingWallet();
    const requiredEur = Number(entryPriceUsd || 0) * Number(quantity || 0) * fxRateUsdToEur();
    return Number.isFinite(requiredEur) && requiredEur > 0 && wallet.availableEur >= requiredEur;
  }

  function trainingStats() {
    const positions = state.trades.positions;
    const history = state.trades.history;
    const realized = history.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winsRows = history.filter((t) => Number(t.pnl || 0) > 0);
    const lossRows = history.filter((t) => Number(t.pnl || 0) < 0);
    const wins = winsRows.length;
    const total = history.length;
    const grossWin = winsRows.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossLossAbs = Math.abs(lossRows.reduce((sum, t) => sum + Number(t.pnl || 0), 0));
    const wallet = trainingWallet();
    return {
      openCount: positions.length,
      closedCount: history.length,
      realized,
      winRate: total ? (wins / total) * 100 : null,
      avgWin: winsRows.length ? grossWin / winsRows.length : null,
      avgLoss: lossRows.length ? lossRows.reduce((sum, t) => sum + Number(t.pnl || 0), 0) / lossRows.length : null,
      profitFactor: grossLossAbs > 0 ? grossWin / grossLossAbs : (grossWin > 0 ? 999 : null),
      wallet
    };
  }

  function trainingStatsByClass(isCrypto) {
    const filter = s => isCrypto ? isCryptoSymbol(s) : !isCryptoSymbol(s);
    const positions = state.trades.positions.filter(p => filter(p.symbol));
    const history = state.trades.history.filter(p => filter(p.symbol));
    const wins = history.filter(t => Number(t.pnl || 0) > 0);
    const losses = history.filter(t => Number(t.pnl || 0) < 0);
    const grossWin = wins.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const grossLossAbs = Math.abs(losses.reduce((s, t) => s + Number(t.pnl || 0), 0));
    const realized = history.reduce((s, t) => s + Number(t.pnl || 0), 0);
    return {
      openCount: positions.length,
      closedCount: history.length,
      realizedEur: realized * fxRateUsdToEur(),
      winRate: history.length ? (wins.length / history.length) * 100 : null,
      profitFactor: grossLossAbs > 0 ? grossWin / grossLossAbs : (grossWin > 0 ? 999 : null),
    };
  }

  function isStockMarketOpen() {
    const utcMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    return utcMin >= 8 * 60 && utcMin < 21 * 60;
  }

  function marketStatusBadge() {
    const cryptoOpen = true;
    const stockOpen = isStockMarketOpen();
    return `<span class="market-status-pill ${stockOpen ? "open" : "closed"}">
      ${stockOpen ? "Marchés ouverts" : "Marchés fermés"}
    </span><span class="market-status-pill open">Crypto 24/7</span>`;
  }

  
function groupedOpportunities(rows) {
  const items = Array.isArray(rows) ? rows.slice() : [];
  const buckets = { proposed: [], watch: [], noTrade: [] };

  items.forEach((item) => {
    const decision = rowDecisionLabel(item);
    const enriched = {
      ...item,
      _safetyScore: safetyScoreFrom(rowTradePlan(item) || item),
      _actionScore: actionabilityScoreFrom(rowTradePlan(item) || item),
      _dossierScore: dossierScoreFrom(rowTradePlan(item) || item)
    };

    if (decision === "Trade propose") buckets.proposed.push(enriched);
    else if (decision === "A surveiller") buckets.watch.push(enriched);
    else buckets.noTrade.push(enriched);
  });

  const sorter = (a, b) => {
    const safetyDelta = (Number(b._safetyScore ?? -1) - Number(a._safetyScore ?? -1));
    if (safetyDelta) return safetyDelta;
    const dossierDelta = (Number(b._dossierScore ?? -1) - Number(a._dossierScore ?? -1));
    if (dossierDelta) return dossierDelta;
    const actionDelta = (Number(b._actionScore ?? -1) - Number(a._actionScore ?? -1));
    if (actionDelta) return actionDelta;
    return String(a.symbol || "").localeCompare(String(b.symbol || ""));
  };

  buckets.proposed.sort(sorter);
  buckets.watch.sort(sorter);
  buckets.noTrade.sort(sorter);

  return buckets;
}

function renderOpportunitySection(title, subtitle, rows, baseRank = 1, emptyText = "Aucun actif dans cette section.") {
  return `
    <section class="opp-section">
      <div class="section-title">
        <span>${safeText(title)}</span>
        <span>${rows.length}</span>
      </div>
      <div class="opp-section-subtitle">${safeText(subtitle)}</div>
      ${rows.length
        ? `<div class="opp-list">${rows.map((item, idx) => renderOppRow(item, baseRank + idx)).join("")}</div>`
        : `<div class="empty-state">${safeText(emptyText)}</div>`}
    </section>
  `;
}

function applyFilter() {
    const f = state.opportunityFilter;
    const d = state.opportunityDirection;
    state.filteredOpportunities = state.opportunities.filter(item => {
      if (f !== "all" && item.assetClass !== f) return false;
      if (d !== "all" && String(item.direction || "neutral").toLowerCase() !== d) return false;
      return true;
    });
  }

  // =========================
  // navigation
  // =========================
  // Wrapper pour transitions d'écrans via View Transitions API (Safari 18+/Chrome 111+)
  function transitionalRender() {
    if (document.startViewTransition) {
      try { document.startViewTransition(() => render()); return; } catch {}
    }
    render();
  }

  function navigate(route, symbol = null, opts = {}) {
    const skipHistory = opts.skipHistory === true;
    const forceOppReload = opts.forceOppReload === true;
    const prevRoute = state.route;
    const prevSymbol = state.selectedSymbol;
    state.route = route;
    if (symbol) state.selectedSymbol = symbol;

    if (!skipHistory) {
      const changed = prevRoute !== route || (route === "asset-detail" && prevSymbol !== symbol);
      if (changed) {
        try {
          const hist = { route, symbol: symbol || null };
          // asset-detail = drill-down, pushState pour back-swipe
          // autres routes = tabs top-level, replaceState pour ne pas gonfler l'historique
          if (route === "asset-detail" && prevRoute !== "asset-detail") {
            history.pushState(hist, "", "");
          } else {
            history.replaceState(hist, "", "");
          }
        } catch {}
      }
    }

    if (route === "opportunities") {
      state.error = null;
      state.aiReview = null;
      transitionalRender();
      if (forceOppReload) loadOpportunities(true);
    } else if (route === "asset-detail" && symbol) {
      state.aiReview = null;
      loadDetail(symbol);
    } else {
      transitionalRender();
      if (route === "settings" && isSessionValid()) {
        loadUserAssets().catch(() => {});
      }
      if (route === "bot" && isSessionValid()) {
        loadBot().catch(() => {});
      }
      if (route === "health") {
        loadHealth().catch(() => {});
      }
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
    const primary = navItems.filter(([route]) => PRIMARY_NAV_ROUTES.includes(route));
    const more = navItems.filter(([route]) => MORE_NAV_ROUTES.includes(route));
    const moreActive = MORE_NAV_ROUTES.includes(state.route) || state.moreMenuOpen;
    return `<nav class="bottom-nav"><div class="bottom-wrap">
      ${primary.map(([route, label, icon]) => `
        <button class="bnav-item ${state.route === route ? "active" : ""}" data-route="${route}">
          <span>${icon}</span><span>${label}</span>
        </button>`).join("")}
      <button class="bnav-item ${moreActive ? "active" : ""}" data-more-menu aria-expanded="${state.moreMenuOpen}">
        <span>${MORE_ICON}</span><span>Plus</span>
      </button>
    </div>
    ${state.moreMenuOpen ? `
      <div class="more-menu-backdrop" data-close-more-menu></div>
      <div class="more-menu-sheet" role="menu">
        ${more.map(([route, label, icon]) => `
          <button class="more-menu-item ${state.route === route ? "active" : ""}" data-route="${route}" role="menuitem">
            <span>${icon}</span><span>${label}</span>
          </button>`).join("")}
      </div>
    ` : ""}
    </nav>`;
  }

  
function assetClassLabel(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "actif";
    if (raw === "stock" || raw === "action") return "action";
    if (raw === "crypto") return "crypto";
    if (raw === "etf") return "ETF";
    if (raw === "forex") return "forex";
    if (raw === "commodity" || raw === "matiere_premiere" || raw === "matière première") return "commodity";
    return raw;
  }



function fidelityLabel(item) {
    const plan = rowTradePlan(item) || {};
    const raw = Number.isFinite(Number(plan?.confidence))
      ? Number(plan.confidence)
      : Number.isFinite(Number(item?.confidence))
        ? Number(item.confidence)
        : Number.isFinite(Number(item?.score))
          ? Number(item.score)
          : null;
    if (raw == null) return "fiabilite inconnue";
    if (raw >= 80) return "fiabilite elevee";
    if (raw >= 65) return "fiabilite moyenne";
    return "fiabilite faible";
  }

  function fidelityClass(item) {
    const label = fidelityLabel(item);
    if (label.includes("elevee")) return "positive";
    if (label.includes("moyenne")) return "neutral";
    return "warning";
  }



function priorityClass(priority) {
    const raw = String(priority || "").trim().toLowerCase();
    if (raw.includes("haute") || raw.includes("top")) return "positive";
    if (raw.includes("utile") || raw.includes("moyenne")) return "neutral";
    return "warning";
  }

  function setupTypeLabel(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "setup";
    if (raw === "breakout") return "breakout";
    if (raw === "pullback") return "pullback";
    if (raw === "continuation" || raw === "trend_continuation") return "continuation";
    if (raw === "pullback_short") return "pullback short";
    if (raw === "breakdown") return "breakdown";
    if (raw === "continuation_short") return "continuation short";
    if (raw === "reversal") return "reversal";
    if (raw === "mean_reversion") return "mean reversion";
    return raw.replaceAll("_", " ");
  }

  function riskBadgeClass(plan) {
    const raw = Number(plan?.riskQuality);
    if (!Number.isFinite(raw)) return "neutral";
    if (raw >= 70) return "positive";
    if (raw >= 55) return "neutral";
    return "warning";
  }



function safetyScoreFrom(source) {
    const raw = Number(
      source?.officialScore ??
      source?.plan?.safetyScore ??
      source?.safetyScore ??
      NaN
    );
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
  }

function actionabilityScoreFrom(source) {
    const raw = Number(
      source?.plan?.exploitabilityScore ??
      source?.exploitabilityScore ??
      NaN
    );
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
  }

  function dossierScoreFrom(source) {
    const raw = Number(
      source?.finalScore ??
      source?.plan?.finalScore ??
      source?.score ??
      NaN
    );
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
  }

  function safetyLabel(score, source = null) {
    const decision = source?.officialDecision || source?.decision || source?.plan?.decision || null;
    if (decision === "Trade propose") return "fiable";
    if (decision === "A surveiller") return "a surveiller";
    if (decision === "Pas de trade") return "fragile";
    if (decision === "Indisponible") return "indisponible";
    if (score == null) return "indisponible";
    if (score >= 76) return "fiable";
    if (score >= 62) return "a surveiller";
    return "fragile";
  }

  function safetyTone(score, source = null) {
    const decision = source?.officialDecision || source?.decision || source?.plan?.decision || null;
    if (decision === "Trade propose") return "proposed";
    if (decision === "A surveiller") return "blocked";
    if (decision === "Pas de trade" || decision === "Indisponible") return "notrade";
    if (score == null) return "notrade";
    if (score >= 76) return "proposed";
    if (score >= 62) return "blocked";
    return "notrade";
  }

  function actionabilityLabel(score) {
    if (score == null) return "indisponible";
    if (score >= 74) return "exploitable";
    if (score >= 62) return "correcte";
    return "fragile";
  }

  function actionabilityTone(score) {
    if (score == null) return "notrade";
    if (score >= 74) return "proposed";
    if (score >= 62) return "blocked";
    return "notrade";
  }


function shortBlockerLabel(plan, item) {
    const flags = Array.isArray(plan?.blockers) ? plan.blockers.filter(Boolean) : [];
    const first = String(flags[0] || "").trim().toLowerCase();
    const reason = String(plan?.refusalReason || item?.reasonShort || "").trim().toLowerCase();
    const combined = `${first} ${reason}`.trim();

    if (combined.includes("confirm")) return "confirmation insuffisante";
    if (combined.includes("risque")) return "risque trop eleve";
    if (combined.includes("timing")) return "timing encore tot";
    if (combined.includes("volatil")) return "volatilite trop elevee";
    if (combined.includes("contexte")) return "contexte trop fragile";
    if (combined.includes("data") || combined.includes("donnee")) return "donnees trop fragiles";
    if (combined.includes("ratio")) return "ratio insuffisant";
    if (combined.includes("entree")) return "entree pas assez propre";
    if (combined.includes("signal")) return "signal encore trop faible";
    if (combined.includes("attendre")) return "attendre une confirmation";
    if (plan?.tradeNow === true) return "actionnable maintenant";
    return "surveillance active";
  }

function shortActionLabel(plan, item) {
    const decision = rowDecisionLabel(item);
    if (decision === "Trade propose" || plan?.tradeNow === true) return "actionnable maintenant";
    if (decision === "A surveiller") return "attendre";
    return "ne pas agir";
  }


function isPhoneLayout() {
    return typeof window !== "undefined" && window.innerWidth <= 560;
  }


function secondaryPositiveTone(label) {
  const v = String(label || "").toLowerCase();
  if (v.includes("trade propose") || v.includes("actionnable")) return "proposed";
  if (v.includes("a surveiller")) return "blocked";
  return "neutral";
}


function getDecisionState(item) {
  const decision = rowDecisionLabel(item);
  if (decision === "Trade propose") return { key: "trade_propose", label: "Trade propose", tone: "proposed" };
  if (decision === "A surveiller") return { key: "a_surveiller", label: "A surveiller", tone: "blocked" };
  return { key: "pas_de_trade", label: decision || "Pas de trade", tone: "notrade" };
}

function getScoreState(item) {
  const plan = rowTradePlan(item) || item || {};
  const score = safetyScoreFrom(plan) ?? safetyScoreFrom(item) ?? dossierScoreFrom(plan) ?? dossierScoreFrom(item) ?? actionabilityScoreFrom(plan) ?? actionabilityScoreFrom(item);
  const tone = safetyTone(score, item);
  const label = safetyLabel(score, item);
  return { score, tone, label };
}

function getOpportunityCardViewModel(item) {
  const plan = rowTradePlan(item) || {};
  const decisionState = getDecisionState(item);
  const scoreState = getScoreState(item);
  const actionScore = actionabilityScoreFrom(plan) ?? actionabilityScoreFrom(item);
  const confirmationText = confirmationLabelText(plan);
  const scoreLine = scoreState.score != null
    ? `${scoreState.score}/100 · ${scoreState.label}`
    : "score de surete indisponible";
  const blockerLine = (decisionState.key === "pas_de_trade" && scoreState.score != null && actionScore != null && Math.abs(actionScore - scoreState.score) >= 4)
    ? `${shortBlockerLabel(plan, item)} · exploitabilite ${actionScore}/100`
    : shortBlockerLabel(plan, item);
  return {
    item,
    plan,
    decisionState,
    scoreState,
    decisionLabel: decisionState.label,
    decisionTone: decisionState.tone,
    trendLabel: rowTrendLabel(item),
    assetBadge: assetClassLabel(item.assetClass),
    blockerLine,
    nextActionLine: shortActionLabel(plan, item),
    confirmationText,
    riskBadge: plan?.riskQuality != null ? badge(`risque ${safeText(simpleRiskQualityLabel(plan.riskQuality))}`, riskBadgeClass(plan)) : "",
    fidelityBadge: badge(fidelityLabel(item), fidelityClass(item)),
    confirmationBadge: confirmationText ? badge(confirmationText, "neutral") : "",
    priceHtml: item.price != null ? renderPriceStack(item.price) : "Donnee indisponible",
    changeClass: item.change24hPct > 0 ? "up" : item.change24hPct < 0 ? "down" : "",
    changeText: pct(item.change24hPct),
    scoreLine
  };
}

function getDashboardTopViewModel(items) {
  const opps = Array.isArray(items) ? items.slice() : [];
  const topPick = dashboardPriorityTop(opps);
  if (!topPick) return null;
  const decisionState = getDecisionState(topPick);
  const scoreState = getScoreState(topPick);
  return {
    item: topPick,
    decisionState,
    scoreState,
    badgeLabel: decisionState.key === "trade_propose" ? "actionnable" : (decisionState.key === "a_surveiller" ? "a surveiller" : "pas de trade"),
    subtitle: dashboardPrioritySubtitle(opps)
  };
}


function displayPrimaryPrice(vUsd) {
  if (vUsd == null || Number.isNaN(vUsd)) return "Donnee indisponible";
  const eur = vUsd * fxRateUsdToEur();
  const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
  if (mode === "USD") return money(vUsd, "USD");
  return money(eur, "EUR");
}

function displaySecondaryPrice(vUsd) {
  if (vUsd == null || Number.isNaN(vUsd)) return "";
  const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
  if (mode === "EUR" || mode === "USD") return "";
  return money(vUsd, "USD");
}

function renderPriceStack(vUsd) {
  const primary = displayPrimaryPrice(vUsd);
  const secondary = displaySecondaryPrice(vUsd);
  if (!secondary) return `<div class="price">${primary}</div>`;
  return `<div class="price-stack" style="display:flex;flex-direction:column;gap:2px;"><div class="price">${primary}</div><div class="muted" style="font-size:12px;">${secondary}</div></div>`;
}

function renderOppRow(item, rank) {
    const vm = getOpportunityCardViewModel(item);
    const top1 = rank === 1 && vm.decisionState.key === "trade_propose";
    const mobile = isPhoneLayout();
    const mobileBadges = [vm.fidelityBadge, vm.confirmationBadge, vm.riskBadge].filter(Boolean).join("");

    if (mobile) {
      return `
        <div class="opp-row mobile-card ${state.settings.compactCards ? "compact" : ""}" data-symbol="${safeText(item.symbol)}" style="display:block;padding:14px 14px 16px;border-radius:22px;${top1 ? "border:1px solid rgba(94,234,212,.45); box-shadow:0 0 0 1px rgba(94,234,212,.12) inset;" : ""}">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div class="opp-rank" style="min-width:36px;">#${rank}</div>
            <div class="asset-icon">${safeText((item.symbol || "").slice(0, 4))}</div>
            <div style="min-width:0;flex:1;">
              <div class="asset-symbol">${safeText(item.symbol)}</div>
              <div class="asset-name">${safeText(item.name || "Nom indisponible")}</div>
            </div>
          </div>
          <div style="display:flex;gap:14px;align-items:center;margin-top:14px;">
            <div style="flex:0 0 auto;">${scoreRing(vm.scoreState.score, vm.scoreState.tone)}</div>
            <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${badge(vm.decisionLabel, vm.decisionTone)}
                ${badge(vm.trendLabel, item.direction || "")}
              </div>
              <div class="price">${vm.priceHtml}</div>
              <div class="change ${vm.changeClass}">${vm.changeText}</div>
              <div class="muted opp-note" style="font-weight:700; color:${scoreColor(vm.scoreState.score, vm.scoreState.tone)}">${safeText(vm.scoreLine)}</div>
              <div class="muted opp-note">${safeText(vm.blockerLine)}</div>
              <div class="muted opp-note">${safeText(vm.nextActionLine)}</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            ${mobileBadges}
            ${renderMarketBadge(item.symbol, item.assetClass)}
          </div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:6px">${safeText(getMarketStatus(item.symbol, item.assetClass).detail)}</div>
        </div>`;
    }

    return `
      <div class="opp-row ${state.settings.compactCards ? "compact" : ""}" data-symbol="${safeText(item.symbol)}" style="${top1 ? "border:1px solid rgba(94,234,212,.45); box-shadow:0 0 0 1px rgba(94,234,212,.12) inset;" : ""}">
        <div class="opp-rank">#${rank}</div>
        <div class="asset-main">
          <div class="asset-icon">${safeText((item.symbol || "").slice(0, 4))}</div>
          <div class="asset-text">
            <div class="asset-symbol">${safeText(item.symbol)}</div>
            <div class="asset-name">${safeText(item.name || "Nom indisponible")}</div>
          </div>
        </div>
        <div class="score-box">
          ${scoreRing(vm.scoreState.score, vm.scoreState.tone)}
          <div class="score-meta" style="display:flex;flex-direction:column;gap:8px;">
            ${badge(vm.decisionLabel, vm.decisionTone)}
            ${badge(vm.trendLabel, item.direction || "")}
          </div>
        </div>
        <div class="price-col" style="display:flex;flex-direction:column;gap:6px;">
          <div class="price">${vm.priceHtml}</div>
          <div class="change ${vm.changeClass}">${vm.changeText}</div>
          <div class="muted opp-note" style="font-weight:700; color:${scoreColor(vm.scoreState.score, vm.scoreState.tone)}">${safeText(vm.scoreLine)}</div>
          <div class="muted opp-note">${safeText(vm.blockerLine)}</div>
          <div class="muted opp-note">${safeText(vm.nextActionLine)}</div>
        </div>
        <div class="badges-col" style="display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;">
          ${badge(vm.assetBadge, item.assetClass || "")}
          ${renderMarketBadge(item.symbol, item.assetClass)}
          ${vm.fidelityBadge}
          ${vm.confirmationBadge}
          ${vm.riskBadge}
          <div style="width:100%;font-size:.72rem;color:var(--text-muted);margin-top:1px">${safeText(getMarketStatus(item.symbol, item.assetClass).detail)}</div>
        </div>
      </div>`;
  }

function prudentShortlist(limit = 5) {
    return (state.opportunities || [])
      .filter((item) => item && item.price != null && item.plan)
      .filter((item) => item.plan?.decision === "Trade propose" || item.plan?.decision === "A surveiller")
      .sort((a, b) => (safetyScoreFrom(b) || 0) - (safetyScoreFrom(a) || 0))
      .slice(0, limit);
  }

  function algoJournalPreview(limit = 4) {
    return (state.algoJournal || []).slice(0, limit);
  }

  
function dashboardSignalSummary(opps) {
  const rows = Array.isArray(opps) ? opps : [];
  const tradables = rows.filter((x) => x && typeof x.score === "number");
  const bullish = tradables.filter((x) => String(x.direction || "").toLowerCase() === "long").length;
  const bearish = tradables.filter((x) => String(x.direction || "").toLowerCase() === "short").length;
  const neutral = Math.max(0, tradables.length - bullish - bearish);

  let title = "Lecture prudente";
  let text = "Peu de signaux vraiment propres pour le moment.";

  if (bullish >= 3 && bullish > bearish) {
    title = "Biais haussier";
    text = "Les opportunites les plus fortes restent orientees vers la hausse.";
  } else if (bearish >= 3 && bearish > bullish) {
    title = "Biais baissier";
    text = "Les signaux visibles restent plutot orientes vers la baisse.";
  } else if (tradables.length >= 5) {
    title = "Marche partage";
    text = "Le marche envoie des signaux melanges, sans domination nette.";
  }

  return { title, text, bullish, bearish, neutral, tradables: tradables.length };
}

function dashboardTopPick(opps) {
  return dashboardPriorityTop(opps);
}



  function safeNewsDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    const t = d.getTime();
    if (!Number.isFinite(t)) return "—";
    return d.toLocaleString("fr-FR");
  }

  function newsToneBadgeClass(tone) {
    const t = String(tone || "").toLowerCase();
    if (t.includes("hauss")) return "positive";
    if (t.includes("baiss")) return "negative";
    return "neutral";
  }

  function renderNewsIaBlock() {
    const items = Array.isArray(state.news?.items) ? state.news.items.slice(0, 3) : [];
    const overview = state.news?.overview || {};
    return `
      <div class="card" style="margin-top:18px">
        <div class="section-title"><span>News + IA</span><span>${items.length}</span></div>

        <div class="grid trades-stats" style="margin-bottom:14px">
          <div class="stat-card"><div class="stat-label">Biais news</div><div class="stat-value" style="font-size:1rem">${safeText(overview.marketTone || "mitige")}</div></div>
          <div class="stat-card"><div class="stat-label">Themes</div><div class="stat-value" style="font-size:1rem">${safeText((overview.keyThemes || []).slice(0,2).join(" · ") || "—")}</div></div>
          <div class="stat-card"><div class="stat-label">Actifs a surveiller</div><div class="stat-value" style="font-size:1rem">${safeText((overview.watchAssets || []).slice(0,3).join(" · ") || "—")}</div></div>
          <div class="stat-card"><div class="stat-label">Maj</div><div class="stat-value" style="font-size:1rem">${safeNewsDate(state.news?.asOf)}</div></div>
        </div>

        <div class="card" style="padding:14px;margin-bottom:14px;background:var(--bg-elevated)">
          <div class="muted" style="margin-bottom:6px">Lecture IA</div>
          <div>${safeText(overview.summary || state.news?.message || "Aucune synthese news disponible pour le moment.")}</div>
        </div>

        ${items.length ? `
          <div class="news-list">
            ${items.map((item) => `
              <div class="news-row">
                <div class="news-top">
                  <div class="trade-symbol">${safeText(item.source || "Source")}</div>
                  <div class="legend">
                    ${badge(item.topic || "marche")}
                    ${badge(item.tone || "mitige", newsToneBadgeClass(item.tone))}
                  </div>
                </div>
                <div class="news-title">${safeText(item.title || "Titre indisponible")}</div>
                <div class="news-summary">${safeText(cleanNewsSummary(item))}</div>
                <div class="news-bottom">
                  <div class="muted">${safeText((item.assets || []).join(" · ") || "Aucun actif cible")} · ${safeNewsDate(item.publishedAt)}</div>
                  <div class="legend">
                    <a class="btn" href="${safeText(item.link)}" target="_blank" rel="noreferrer noopener">Ouvrir la source</a>
                    <button class="btn" data-route="news">Voir tout</button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<div class="empty-state">Aucune news exploitable pour le moment.</div>`}
      </div>
    `;
  }


  function groupedNewsItems() {
    const items = Array.isArray(state.news?.items) ? state.news.items : [];
    return {
      macro: items.filter((x) => x.topic === "macro"),
      crypto: items.filter((x) => x.topic === "crypto"),
      tech: items.filter((x) => x.topic === "tech"),
      market: items.filter((x) => x.topic === "marche" || !x.topic)
    };
  }

  function cleanNewsSummary(item) {
    const raw = String(item?.summary || "").trim();
    if (!raw) return "Pas de resume.";
    let text = raw
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/www\.\S+/gi, " ")
      .replace(/target=_blank/gi, " ")
      .replace(/font color=.*?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) text = "Pas de resume.";
    if (text.length > 220) text = `${text.slice(0, 217).trim()}...`;
    return text;
  }

  function newsSourceLabel(item) {
    const src = String(item?.source || "").trim();
    if (src) return src;
    try {
      const url = new URL(String(item?.link || ""));
      return url.hostname.replace(/^www\./, "");
    } catch {
      return "Source";
    }
  }

  function renderNewsList(items, limit = 8) {
    const rows = (items || []).slice(0, limit);
    if (!rows.length) return `<div class="empty-state">Aucune news exploitable pour le moment.</div>`;
    return `
      <div class="news-list">
        ${rows.map((item) => `
          <div class="news-row">
            <div class="news-top">
              <div class="trade-symbol">${safeText(newsSourceLabel(item))}</div>
              <div class="legend">
                ${badge(item.topic || "marche")}
                ${badge(item.tone || "mitige", newsToneBadgeClass(item.tone))}
              </div>
            </div>
            <div class="news-title">${safeText(item.title || "Titre indisponible")}</div>
            <div class="news-summary">${safeText(cleanNewsSummary(item))}</div>
            <div class="news-meta">
              <div class="muted">${safeText((item.assets || []).join(" · ") || "Aucun actif cible")}</div>
              <div class="muted">${safeNewsDate(item.publishedAt)}</div>
            </div>
            <div class="news-bottom">
              <div class="muted">${safeText(item.category || "actualite marche")}</div>
              <a class="btn" href="${safeText(item.link)}" target="_blank" rel="noreferrer noopener">Ouvrir la source</a>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderNewsPageSection(title, subtitle, items, limit = 6) {
    return `
      <div class="card" style="margin-top:18px">
        <div class="section-title"><span>${title}</span><span>${items.length}</span></div>
        <div class="muted" style="margin-bottom:12px">${subtitle}</div>
        ${renderNewsList(items, limit)}
      </div>
    `;
  }

  function renderNews() {
    const overview = state.news?.overview || {};
    const groups = groupedNewsItems();
    const allItems = Array.isArray(state.news?.items) ? state.news.items : [];
    const mobile = isPhoneLayout();

    return `
      <div class="screen" style="${mobile ? `padding-top:max(18px, env(safe-area-inset-top));` : ``}">
        <div class="screen-header">
          <div class="screen-title">News + IA</div>
          <div class="screen-subtitle">Lecture contextuelle du marche, themes dominants, actifs a surveiller et articles utiles.</div>
          <div class="muted">${state.news?.asOf ? `Derniere mise a jour : ${safeNewsDate(state.news.asOf)}` : "Pas encore de mise a jour news"}${state.news?.source ? ` · Panel : ${safeText(state.news.source)}` : ""}${(state.news?.overview?.sources || []).length ? ` · Sources visibles : ${safeText(state.news.overview.sources.slice(0,4).join(" · "))}` : ""}</div>
        </div>

        <div class="grid trades-stats">
          <div class="stat-card"><div class="stat-label">Biais news</div><div class="stat-value" style="font-size:1rem">${safeText(overview.marketTone || "mitige")}</div></div>
          <div class="stat-card"><div class="stat-label">Themes dominants</div><div class="stat-value" style="font-size:1rem">${safeText((overview.keyThemes || []).slice(0,3).join(" · ") || "—")}</div></div>
          <div class="stat-card"><div class="stat-label">Actifs a surveiller</div><div class="stat-value" style="font-size:1rem">${safeText((overview.watchAssets || []).slice(0,4).join(" · ") || "—")}</div></div>
          <div class="stat-card"><div class="stat-label">Articles</div><div class="stat-value">${allItems.length}</div></div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="section-title"><span>Synthese IA</span><span>priorite</span></div>
          <div class="news-summary-grid">
            <div class="news-summary-box">
              <div class="muted" style="margin-bottom:6px">Lecture IA</div>
              <div>${safeText(overview.summary || state.news?.message || "Aucune synthese news disponible pour le moment.")}</div>
            </div>
            <div class="news-summary-box">
              <div class="muted" style="margin-bottom:6px">Focus utile</div>
              <div>${safeText((overview.watchAssets || []).length ? `Surveiller en priorite : ${(overview.watchAssets || []).join(" · ")}.` : "Aucun actif dominant ne ressort pour le moment.")}</div>
            </div>
          </div>
        </div>

        ${renderNewsPageSection("A la une marche", "Ce qui donne la temperature generale du marche.", groups.market, 6)}
        ${renderNewsPageSection("Macro / banques centrales", "Ce qui peut impacter les taux, les indices et le risque global.", groups.macro, 6)}
        ${renderNewsPageSection("Crypto", "Flux crypto utiles pour BTC, ETH et le sentiment speculatif.", groups.crypto, 6)}
        ${renderNewsPageSection("Tech / actions", "News societes et themes croissance / IA / Nasdaq.", groups.tech, 6)}
      </div>
    `;
  }


function dashboardPriorityTop(opps) {
    const rows = Array.isArray(opps) ? opps.slice() : [];
    const grouped = groupedOpportunities(rows);
    return grouped.proposed[0] || grouped.watch[0] || grouped.noTrade[0] || null;
  }

  function dashboardPriorityTitle(opps) {
    const top = dashboardPriorityTop(opps);
    const decision = top ? rowDecisionLabel(top) : "";
    if (decision === "Trade propose") return "Priorite du moment";
    return "Priorite du moment";
  }

  function dashboardPrioritySubtitle(opps) {
    const top = dashboardPriorityTop(opps);
    const decision = top ? rowDecisionLabel(top) : "";
    if (decision === "Trade propose") return "Actif le plus propre a traiter maintenant.";
    if (decision === "A surveiller") return "Actif le plus interessant a surveiller maintenant.";
    return "Actif le plus pertinent du moment, sans signal tradable net.";
  }

  function dashboardPriorityBadgeLabel(item) {
    if (!item) return "indisponible";
    const decision = rowDecisionLabel(item);
    if (decision === "Trade propose") return "actionnable";
    if (decision === "A surveiller") return "a surveiller";
    return "pas de trade";
  }

  function dashboardPriorityBadgeTone(item) {
    return statusToneFromDecision(rowDecisionLabel(item));
  }


function statusToneFromDecision(decision) {
  if (decision === "Trade propose") return "proposed";
  if (decision === "A surveiller") return "blocked";
  return "notrade";
}

function statusBadge(decision) {
  return badge(decision || "Pas de trade", statusToneFromDecision(decision));
}


function dashboardTopStatusLabel(item) {
  if (!item) return "pas de trade";
  const decision = rowDecisionLabel(item);
  if (decision === "Trade propose") return "actionnable";
  if (decision === "A surveiller") return "a surveiller";
  return "pas de trade";
}


function formatAlgoDate(value) {
  if (!value) return "date indisponible";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  } catch {
    return String(value);
  }
}


function displayAlgoDate(value) {
  if (!value) return "";
  const formatted = formatAlgoDate(value);
  if (!formatted || formatted === "date indisponible") return "";
  return formatted;
}

function dashboardMetricLine(label, value, extraClass = "") {
  return `<div class="top-pick-line"><span>${safeText(label)}</span><strong class="${safeText(extraClass)}">${value}</strong></div>`;
}

function relativeUpdateLabel(value) {
  if (!value) return "mise a jour inconnue";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return `mise a jour le ${safeNewsDate(value)}`;
  const deltaMs = Math.max(0, Date.now() - time);
  if (deltaMs < 60000) return "mis a jour a l'instant";
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return `mis a jour il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `mis a jour il y a ${hours} h`;
  return `mise a jour le ${safeNewsDate(value)}`;
}

function marketSignalLabel(signal) {
  const value = String(signal || "").toLowerCase();
  if (value === "bullish") return "haussier";
  if (value === "bearish") return "baissier";
  return "neutre";
}

function marketRegimeViewModel(regime = state.market?.regime) {
  const current = regime && typeof regime === "object" ? regime : null;
  const code = String(current?.regime || "").toUpperCase();
  let label = "Range";
  let title = "Contexte d'attente";
  let tone = "neutral";

  if (code === "RISK_ON") {
    label = "Risk-On";
    title = "Contexte porteur";
    tone = "positive";
  } else if (code === "RISK_OFF") {
    label = "Risk-Off";
    title = "Contexte defensif";
    tone = "negative";
  }

  const reason =
    current?.reason ||
    (code === "RISK_ON"
      ? "Le marche soutient davantage les actifs de risque."
      : code === "RISK_OFF"
        ? "Le marche reste defensif et demande plus de prudence."
        : "Pas de direction claire sur les grands proxies.");

  const signals = [
    current?.spySignal ? `SPY ${marketSignalLabel(current.spySignal)}` : null,
    current?.qqqSignal ? `QQQ ${marketSignalLabel(current.qqqSignal)}` : null,
    current?.tltSignal ? `TLT ${marketSignalLabel(current.tltSignal)}` : null
  ].filter(Boolean);

  return {
    label,
    title,
    tone,
    reason,
    signals,
    updatedLabel: relativeUpdateLabel(current?.updatedAt || state.market?.asOf || null),
    panelMessage: state.market?.message || null
  };
}

function renderNewsWindowWidget(nw) {
  // PR #3 Phase 1 — widget "Prochain événement important"
  if (!nw) return "";
  const blocked = !!nw.blocked;
  const ev = nw.event;
  const minutes = Number(nw.minutesUntil);
  const tone = blocked ? "blocked" : "clear";
  const label = blocked
    ? (Number.isFinite(minutes) && minutes < 0
        ? `${ev?.country || ""} ${ev?.title || ""} · il y a ${-minutes} min`
        : `${ev?.country || ""} ${ev?.title || ""} · dans ${Number.isFinite(minutes) ? minutes : "?"} min`)
    : "Aucun événement macro dans ±30 min";
  const icon = blocked ? "🔒" : "🟢";
  const title = blocked
    ? "Nouvelles entrées bloquées — événement macro imminent (impact high)"
    : "Aucun événement macro high-impact dans la fenêtre ±30 min";
  return `
    <div class="news-window-widget ${tone}" title="${safeText(title)}">
      <div class="nww-icon">${icon}</div>
      <div class="nww-text">
        <div class="nww-head">${blocked ? "Entrées bloquées" : "Fenêtre libre"}</div>
        <div class="nww-sub">${safeText(label)}</div>
      </div>
    </div>`;
}

function renderFearGreedWidget(fg) {
  if (!fg || fg.value == null) return "";
  const v = fg.value;
  const label = fg.label || "";
  const tone = v <= 25 ? "extreme-fear" : v <= 45 ? "fear" : v <= 55 ? "neutral" : v <= 75 ? "greed" : "extreme-greed";
  const color = v <= 25 ? "#ef4444" : v <= 45 ? "#f97316" : v <= 55 ? "#a3a3a3" : v <= 75 ? "#22c55e" : "#00e5a0";
  const arcLen = Math.round((v / 100) * 251);
  return `
    <div class="fg-widget" title="Fear & Greed Index — Alternative.me">
      <svg class="fg-arc" viewBox="0 0 100 54" aria-hidden="true">
        <path d="M10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8" stroke-linecap="round"/>
        <path d="M10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${arcLen} 251" pathLength="251"/>
      </svg>
      <div class="fg-value" style="color:${color}">${v}</div>
      <div class="fg-label">${safeText(label)}</div>
    </div>`;
}

function renderTrendingStrip(trending) {
  if (!Array.isArray(trending) || !trending.length) return "";
  const items = trending.map(t => {
    const up = t.pct24h != null && t.pct24h >= 0;
    const pctHtml = t.pct24h != null
      ? `<span class="trending-pct ${up ? "up" : "down"}">${up ? "+" : ""}${t.pct24h.toFixed(1)}%</span>`
      : "";
    return `<div class="trending-pill" data-open-detail="${safeText(t.symbol)}">
      <span class="trending-sym">${safeText(t.symbol)}</span>${pctHtml}
    </div>`;
  }).join("");
  return `<div class="trending-strip"><span class="trending-label">Trending</span>${items}</div>`;
}

function renderMarketRegimeBanner(regime = state.market?.regime) {
  const vm = marketRegimeViewModel(regime);
  const toneClass = vm.tone === "positive" ? "regime-banner--positive"
    : vm.tone === "negative" ? "regime-banner--negative"
    : "regime-banner--neutral";
  return `
    <div class="card regime-banner ${toneClass}">
      <div class="section-title"><span>Regime global</span><span>${badge(vm.label, vm.tone)}</span></div>
      <div class="plan-card-head">
        <div class="plan-card-head-main">
          <div class="regime-banner-title">${safeText(vm.title)}</div>
          <div class="muted" style="margin-top:6px">${safeText(vm.reason)}</div>
          <div class="muted" style="margin-top:8px">${safeText(vm.updatedLabel)}</div>
          ${vm.panelMessage ? `<div class="muted" style="margin-top:8px">Panel : ${safeText(vm.panelMessage)}</div>` : ""}
        </div>
        <div class="legend plan-card-head-badges">
          ${vm.signals.map((label) => badge(label)).join("")}
        </div>
      </div>
    </div>
  `;
}

function tradeLevelMovePct(entry, level, side = "long") {
  const base = Number(entry);
  const target = Number(level);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(target)) return null;
  return String(side || "").toLowerCase() === "short"
    ? ((base - target) / base) * 100
    : ((target - base) / base) * 100;
}

function renderTradePlanStat(label, primaryHtml, note = "") {
  return `
    <div class="stat-card">
      <div class="stat-label">${safeText(label)}</div>
      <div class="stat-value" style="font-size:1rem">${primaryHtml}</div>
      ${note ? `<div class="muted" style="margin-top:6px">${safeText(note)}</div>` : ""}
    </div>
  `;
}

function renderTradePlanHero(detail, plan) {
  if (!plan) {
    return `<div class="empty-state">Le worker n'a pas encore fourni de plan de trade sur cet actif.</div>`;
  }

  const side = String(plan?.side || detail?.direction || "long").toLowerCase();
  const actionScore = actionabilityScoreFrom(plan);
  const dossierScore = dossierScoreFrom(plan);
  const confidenceText =
    (detail?.confidence && typeof detail.confidence === "object" && detail.confidence.display) ||
    detail?.confidenceLabel ||
    simpleConfidenceLabel(detail?.confidence || "low");
  const regimeVm = marketRegimeViewModel(detail?.regime || state.market?.regime);
  const setupLabel = setupTypeLabel(plan?.setupType || detail?.setupType || "setup");
  const setupStatus = plan?.setupStatus || detail?.setupStatus || "";
  const stopPct = tradeLevelMovePct(plan?.entry, plan?.stopLoss, side);
  const targetPct = tradeLevelMovePct(plan?.entry, plan?.takeProfit, side);
  const actionText = actionNowLabel(plan);
  const reason = plan?.reason || plan?.refusalReason || simpleDecisionSentence(plan);
  const summary = plan?.aiSummary || simpleContextSentence(plan);
  const signalChips = [
    ...regimeVm.signals,
    setupStatus ? setupStatusLabel(setupStatus) : "",
    confirmationLabelText(plan)
  ].filter(Boolean);

  return `
    <div class="plan-card plan-card-hero">
      <div class="plan-card-head">
        <div class="plan-card-head-main">
          <div class="plan-card-eyebrow">Plan de trade</div>
          <div class="plan-card-title">${safeText(simpleDecisionTitle(plan))}</div>
          <div class="muted plan-card-reason">${safeText(reason)}</div>
        </div>
        <div class="legend plan-card-head-badges">
          ${badge(plan?.decision || "Pas de trade", statusToneFromDecision(plan?.decision))}
          ${badge(setupLabel)}
          ${badge(regimeVm.label, regimeVm.tone)}
          ${badge(`confiance ${confidenceText}`)}
        </div>
      </div>

      <div class="grid trades-stats" style="margin-top:16px">
        ${renderTradePlanStat("Entree", plan?.entry != null ? priceDisplay(plan.entry) : "—", `timing ${simpleTimingLabel(plan)}`)}
        ${renderTradePlanStat("Stop", plan?.stopLoss != null ? priceDisplay(plan.stopLoss) : "—", stopPct == null ? "niveau de protection" : `${pct(stopPct)} depuis l'entree`)}
        ${renderTradePlanStat("Objectif", plan?.takeProfit != null ? priceDisplay(plan.takeProfit) : "—", targetPct == null ? "niveau cible" : `${pct(targetPct)} depuis l'entree`)}
        ${renderTradePlanStat("Ratio", plan?.rr != null ? safeText(num(plan.rr, 2)) : "—", setupStatus ? setupStatusLabel(setupStatus) : "qualite du setup")}
      </div>

      <div class="grid trades-stats" style="margin-top:12px">
        ${renderTradePlanStat("Score de surete", safetyScoreFrom(plan) != null ? safeText(`${num(safetyScoreFrom(plan), 0)}/100`) : "—", safetyLabel(safetyScoreFrom(plan), plan))}
        ${renderTradePlanStat("Exploitabilite", actionScore != null ? safeText(`${num(actionScore, 0)}/100`) : "—", actionabilityLabel(actionScore))}
        ${renderTradePlanStat("Score dossier", dossierScore != null ? safeText(`${num(dossierScore, 0)}/100`) : "—", `confiance ${confidenceText}`)}
        ${renderTradePlanStat("Confirmations", safeText(String(Number(plan?.confirmationCount ?? 0) || 0)), confirmationLabelText(plan))}
      </div>

      <div class="kv" style="margin-top:16px">
        <div class="muted">Regime</div><div>${safeText(regimeVm.label)} · ${safeText(regimeVm.reason)}</div>
        <div class="muted">Setup</div><div>${safeText(setupLabel)}${setupStatus ? ` · ${safeText(setupStatusLabel(setupStatus))}` : ""}</div>
        <div class="muted">Ce qu'il faut faire</div><div>${safeText(actionText)}</div>
        <div class="muted">Ce qu'il faut attendre</div><div>${safeText(simpleWaitForText(plan))}</div>
      </div>

      <div class="plan-reason" style="margin-top:14px">${safeText(summary)}</div>
      <div class="plan-context">
        ${signalChips.map((label) => `<span class="mini-pill">${safeText(label)}</span>`).join("")}
        ${plan?.safety ? `<span class="mini-pill strong">niveau : ${safeText(plan.safety)}</span>` : ""}
      </div>
      <div class="trade-actions">
        ${plan && plan.decision === "Trade propose" && plan.side ? `<button class="btn trade-btn primary" data-create-trade-plan>Ouvrir le trade propose</button>` : ""}
      </div>
    </div>
  `;
}

function renderDashboard() {
    const opps = Array.isArray(state.opportunities) ? state.opportunities.slice() : [];
    const stats = trainingStats();
    const summary = dashboardSignalSummary(opps);
    const grouped = groupedOpportunities(opps);
    const topRows = [...grouped.proposed, ...grouped.watch, ...grouped.noTrade].slice(0, 5);
    const recentAlgo = state.algoJournal.slice(0, 3);
    const mobile = isPhoneLayout();
    const topVm = getDashboardTopViewModel(opps);

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">Vue rapide, lecture simple, priorites utiles.</div>
        </div>

        ${renderMarketRegimeBanner()}

        ${(state.dashboard.fearGreed || (state.dashboard.trending || []).length || state.dashboard.newsWindow) ? `
        <div class="card" style="margin-bottom:18px;padding:14px 18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          ${renderFearGreedWidget(state.dashboard.fearGreed)}
          ${renderNewsWindowWidget(state.dashboard.newsWindow)}
          ${renderTrendingStrip(state.dashboard.trending)}
        </div>` : ""}

        <div class="card dashboard-hero-card" style="margin-bottom:18px">
          <div class="dashboard-hero-top" style="${mobile ? "display:block;" : ""}">
            <div>
              <div class="dashboard-hero-title">${stats.openCount} position${stats.openCount > 1 ? "s ouvertes" : " ouverte"}</div>
              <div class="dashboard-hero-subtitle">${safeText(summary.title + " · " + (summary.text || ""))}</div>
            </div>
            <div class="legend" style="${mobile ? "margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;" : ""}">
              ${badge("Training")}
              ${badge(`${stats.closedCount} trade${stats.closedCount > 1 ? "s" : ""} cloture${stats.closedCount > 1 ? "s" : ""}`)}
              ${badge(`${money(stats.realized * fxRateUsdToEur(), "EUR")} realise`)}
            </div>
          </div>
        </div>

        ${state.opportunitiesRefreshing ? `
          <div class="card" style="margin-bottom:12px;padding:12px 16px">
            <div class="muted">Mise a jour en cours. La derniere liste valide reste affichee.</div>
          </div>
        ` : ""}

        <div class="grid trades-stats" style="margin-bottom:18px">
          <div class="stat-card"><div class="stat-label">Opportunites visibles</div><div class="stat-value">${opps.length}</div></div>
          <div class="stat-card"><div class="stat-label">Hausse</div><div class="stat-value">${summary.bullish}</div></div>
          <div class="stat-card"><div class="stat-label">Baisse</div><div class="stat-value">${summary.bearish}</div></div>
          <div class="stat-card"><div class="stat-label">Neutre</div><div class="stat-value">${summary.neutral}</div></div>
        </div>

        <div class="dashboard-grid" style="${mobile ? "display:block;" : ""}">
          <div class="card dashboard-feature-card ${topVm ? "is-clickable" : ""}" ${topVm ? `data-open-detail="${safeText(topVm.item.symbol)}"` : ""} style="${mobile ? "margin-bottom:14px;" : ""}">
            <div class="section-title"><span>Priorite du moment</span><span>${topVm ? safeText(topVm.item.symbol) : "—"}</span></div>
            ${topVm ? `
              <div class="top-pick-box dashboard-signal-shell">
                <div class="dashboard-signal-main">
                  <div class="dashboard-signal-copy">
                    <div class="dashboard-signal-kicker">Signal leader</div>
                    <div class="trade-symbol dashboard-top-symbol">${safeText(topVm.item.symbol)}</div>
                    <div class="trade-name dashboard-top-name">${safeText(topVm.item.name || "Nom indisponible")}</div>
                    <div class="muted dashboard-top-summary">${safeText(topVm.subtitle)}</div>
                    <div class="legend dashboard-signal-badges">
                      ${badge(safeText(topVm.badgeLabel), topVm.decisionState.tone)}
                      ${badge(safeText(rowTrendLabel(topVm.item)), topVm.item.direction || "")}
                    </div>
                  </div>
                  <div class="dashboard-signal-panel">
                    <div class="dashboard-signal-highlight">
                      <div class="dashboard-signal-score">
                        ${scoreRing(topVm.scoreState.score, topVm.scoreState.tone)}
                      </div>
                      <div class="dashboard-signal-highlight-copy">
                        <div class="dashboard-signal-highlight-label">Lecture dominante</div>
                        <div class="dashboard-signal-highlight-title">${safeText(topVm.decisionLabel)}</div>
                        <div class="dashboard-signal-highlight-text">${safeText(dominantStatusReason(topVm.item))}</div>
                      </div>
                    </div>
                    <div class="top-pick-metrics dashboard-signal-metrics">
                      ${dashboardMetricLine("Prix", topVm.item.price != null ? priceDisplay(topVm.item.price) : "—")}
                      ${dashboardMetricLine("Variation 24h", pct(topVm.item.change24hPct), topVm.changeClass)}
                      ${dashboardMetricLine("Score de surete", topVm.scoreState.score != null ? `${topVm.scoreState.score}/100` : "—", `score-${topVm.scoreState.tone}`)}
                      ${dashboardMetricLine("Source", safeText(topVm.item.sourceUsed || "—"))}
                    </div>
                    <div class="dashboard-signal-action">
                      <button class="btn dashboard-open-btn" data-open-detail="${safeText(topVm.item.symbol)}">Ouvrir la fiche</button>
                    </div>
                  </div>
                </div>
              </div>
            ` : `<div class="empty-state">Aucune priorite exploitable pour le moment.</div>`}
          </div>

          <div class="card dashboard-side-card">
            <div class="section-title"><span>Dernieres decisions algo</span><span>${recentAlgo.length}</span></div>
            ${recentAlgo.length ? `<div class="algo-card-stack">${recentAlgo.map((item) => {
              const algoDecision = item.decision || "Pas de trade";
              const algoReason = item.reasonShort || item.summary || "";
              const algoDate = displayAlgoDate(item.createdAt || item.at || item.timestamp || "");
              return `
                <div class="journal-card dashboard-journal-card" style="margin-bottom:10px">
                  <div class="journal-head">
                    <div class="trade-symbol">${safeText(item.symbol || "—")}</div>
                    ${statusBadge(algoDecision)}
                  </div>
                  ${algoDate ? `<div class="muted">${safeText(algoDate)}</div>` : ""}
                  ${algoReason ? `<div class="muted" style="margin-top:8px">${safeText(algoReason)}</div>` : ""}
                </div>
              `;
            }).join("")}</div>` : `<div class="empty-state">Aucune decision recente.</div>`}
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="section-title"><span>Priorites classees</span><span>${topRows.length}</span></div>
          ${topRows.length ? topRows.map((item, index) => renderOppRow(item, index + 1)).join("") : `<div class="empty-state">Aucune opportunite a afficher.</div>`}
        </div>
      </div>
    `;
  }

  function renderOpportunities() {
    const groups = groupedOpportunities(state.filteredOpportunities || []);
    const total = (state.filteredOpportunities || []).length;
    const visibleHydrating = (state.filteredOpportunities || []).filter((item) => !!state.nonCryptoHydration[String(item?.symbol || "").toUpperCase()]).length;

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Opportunites</div>
          <div class="screen-subtitle">Lecture simple avec statut setup, confirmations, priorite reelle et blocage principal.</div>
        </div>

        <div class="opp-toolbar">
          <div class="filter-group">
            ${["all","crypto","stock","etf","forex","commodity"].map((f) => `
              <button class="chip ${state.opportunityFilter === f ? "active" : ""}" data-filter="${f}">
                ${f === "all" ? "all" : f}
              </button>
            `).join("")}
            <button class="chip" data-refresh="opportunities">Rafraichir</button>
          </div>
          <div class="filter-group">
            ${[
              { key: "all",   label: "tous" },
              { key: "long",  label: "▲ long" },
              { key: "short", label: "▼ short" }
            ].map((d) => `
              <button class="chip ${state.opportunityDirection === d.key ? "active" : ""}" data-direction-filter="${d.key}">
                ${d.label}
              </button>
            `).join("")}
          </div>
        </div>

        ${state.opportunitiesRefreshing ? `
          <div class="card" style="margin-bottom:12px;padding:12px 16px">
            <div class="muted">Mise a jour en cours. La derniere liste valide reste affichee.</div>
          </div>
        ` : ""}

        <div class="grid trades-stats" style="margin-bottom:18px">
          <div class="stat-card">
            <div class="stat-label">Trades proposes</div>
            <div class="stat-value">${groups.proposed.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">A surveiller</div>
            <div class="stat-value">${groups.watch.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pas de trade</div>
            <div class="stat-value">${groups.noTrade.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Analyses en cours</div>
            <div class="stat-value">${visibleHydrating}</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="section-title"><span>Lecture rapide</span><span>${total}</span></div>
          <div class="opp-overview-text">
            ${groups.proposed.length
              ? `${groups.proposed.length} actif${groups.proposed.length > 1 ? "s" : ""} ressort${groups.proposed.length > 1 ? "ent" : ""} comme prioritaire${groups.proposed.length > 1 ? "s" : ""}.`
              : groups.watch.length
                ? `Aucun trade propose net. ${groups.watch.length} actif${groups.watch.length > 1 ? "s sont" : " est"} surtout a surveiller.`
                : "Aucun trade propre pour le moment. La liste est plutot defensive."}
          </div>
        </div>

        ${renderOpportunitySection(
          "Trades proposes",
          "Actifs a regarder en premier, sans blocage majeur.",
          groups.proposed,
          1,
          "Aucun trade propose pour le moment."
        )}

        ${renderOpportunitySection(
          "A surveiller",
          "Actifs a surveiller avant ouverture, attente d'une meilleure confirmation.",
          groups.watch,
          groups.proposed.length + 1,
          "Aucun actif a surveiller pour le moment."
        )}

        ${renderOpportunitySection(
          "Pas de trade",
          "Actifs non prioritaires ou encore trop faibles.",
          groups.noTrade,
          groups.proposed.length + groups.watch.length + 1,
          "Aucun actif dans cette section."
        )}
      </div>`;
  }

  function renderChart(candles, symbol) {
    if (!Array.isArray(candles) || !candles.length) {
      return `<div class="empty-state">Aucune bougie disponible.</div>`;
    }
    const sym = symbol || state.detail?.symbol || "";
    const isCrypto = isCryptoSymbol(sym);
    const tf = state.chartTimeframe || "1d";
    const tfs = isCrypto
      ? [["1d","1J"],["4h","4H"],["1h","1H"]]
      : [["1d","1J"]];
    const fsBtn = `<button class="chart-tf-btn chart-fs-btn" data-chart-fullscreen="open" aria-label="Plein écran" title="Plein écran"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button>`;
    if (state.chartFullscreen) {
      return `
        <div class="chart-wrap">
          <div class="chart-tf-row">
            ${tfs.map(([v,lbl]) => `<button class="chart-tf-btn${tf===v?" active":""}" data-chart-tf="${v}">${lbl}</button>`).join("")}
            <span class="chart-count">${candles.length} bougies</span>
          </div>
          <div class="chart-fs-placeholder">Chart ouvert en plein écran</div>
        </div>`;
    }
    return `
      <div class="chart-wrap">
        <div class="chart-tf-row">
          ${tfs.map(([v,lbl]) => `<button class="chart-tf-btn${tf===v?" active":""}" data-chart-tf="${v}">${lbl}</button>`).join("")}
          ${fsBtn}
          <span class="chart-count">${candles.length} bougies</span>
        </div>
        <div id="lw-chart-container" data-symbol="${safeText(sym)}" style="width:100%;height:260px;position:relative;"></div>
      </div>`;
  }

  function renderChartFullscreen() {
    if (!state.chartFullscreen) return "";
    const d = state.detail;
    if (!d) return "";
    const sym = d.symbol || "";
    const name = d.name || "";
    const candles = Array.isArray(d.candles) ? d.candles : [];
    const tf = state.chartTimeframe || "1d";
    const isCrypto = isCryptoSymbol(sym);
    const tfs = isCrypto ? [["1d","1J"],["4h","4H"],["1h","1H"]] : [["1d","1J"]];
    return `
      <div class="chart-fullscreen-overlay" role="dialog" aria-modal="true">
        <div class="chart-fullscreen-header">
          <div class="chart-fullscreen-title">
            <div class="trade-symbol">${safeText(sym)}</div>
            <div class="muted" style="font-size:.82rem;margin-top:2px">${safeText(name)}</div>
          </div>
          <button class="btn btn-secondary chart-fullscreen-close" data-chart-fullscreen="close" aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="chart-fullscreen-tfs">
          ${tfs.map(([v,lbl]) => `<button class="chart-tf-btn${tf===v?" active":""}" data-chart-tf="${v}">${lbl}</button>`).join("")}
          <span class="chart-count">${candles.length} bougies</span>
        </div>
        <div class="chart-fullscreen-body">
          <div id="lw-chart-container" data-symbol="${safeText(sym)}" style="width:100%;height:100%;position:relative;"></div>
        </div>
      </div>`;
  }

  function initCandlestickChart() {
    const container = document.getElementById("lw-chart-container");
    if (!container || !window.LightweightCharts) return;
    const d = state.detail;
    if (!d || !Array.isArray(d.candles) || !d.candles.length) return;

    const isLight = effectiveLightTheme();
    const textColor  = isLight ? "#555" : "#8899aa";
    const gridColor  = isLight ? "#ebebeb" : "#141928";
    const borderColor = isLight ? "#d0d0d0" : "#1e2435";

    container.innerHTML = "";

    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 260,
      layout: { background: { type: "solid", color: "transparent" }, textColor, fontSize: 11 },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor, scaleMargins: { top: 0.08, bottom: 0.04 } },
      timeScale: { borderColor, timeVisible: state.chartTimeframe !== "1d", secondsVisible: false },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a", wickDownColor: "#ef5350",
    });

    const isDaily = state.chartTimeframe === "1d";
    const data = d.candles
      .filter(c => c && c.open != null && c.high != null && c.low != null && c.close != null)
      .map(c => {
        let t = c.time;
        if (typeof t === "string") {
          t = isDaily ? t.substring(0, 10) : Math.floor(new Date(t).getTime() / 1000);
        } else if (typeof t === "number" && t > 1e10) {
          t = Math.floor(t / 1000);
        }
        return { time: t, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close) };
      })
      .filter(c => c.time != null && Number.isFinite(c.open) && Number.isFinite(c.high))
      .sort((a, b) => a.time > b.time ? 1 : -1);

    if (!data.length) {
      container.innerHTML = `<div class="empty-state">Données insuffisantes.</div>`;
      return;
    }

    candleSeries.setData(data);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth }));
    ro.observe(container);
  }

  
function simpleReliabilityLabel(score, decision = "") {
  const kind = String(decision || "");
  if (score == null) return "indisponible";
  if (kind === "Trade propose") {
    if (score >= 78) return "solide";
    if (score >= 65) return "constructif";
    return "fragile";
  }
  if (kind === "A surveiller") {
    if (score >= 72) return "constructif";
    if (score >= 58) return "a confirmer";
    return "fragile";
  }
  if (score >= 78) return "solide";
  if (score >= 64) return "constructif";
  if (score >= 50) return "mitige";
  return "fragile";
}

function simpleTrendWord(label) {
  const text = String(label || "").toLowerCase();
  if (text.includes("haussi")) return "hausse";
  if (text.includes("baissi")) return "baisse";
  return "neutre";
}

function simpleDecisionSentence(plan) {
  const decision = String(plan?.decision || "").toLowerCase();
  if (decision.includes("trade propose")) return "Le trade semble assez propre pour etre envisage maintenant.";
  if (decision.includes("surveiller")) return "Le scenario existe, mais il vaut mieux attendre encore.";
  return "Le signal n'est pas assez propre pour prendre position maintenant.";
}

function simpleContextSentence(plan) {
  const trend = simpleTrendWord(plan?.trendLabel || "");
  if (trend === "hausse") return "Le marche montre plutot une hausse.";
  if (trend === "baisse") return "Le marche montre plutot une baisse.";
  return "Le marche n'a pas de direction claire.";
}


function simpleBlockerText(plan) {
  const score = Number(plan?.finalScore ?? 0);
  const flags = Array.isArray(plan?.blockerFlags) ? plan.blockerFlags : [];
  const trend = simpleTrendWord(plan?.trendLabel || "");
  if (String(plan?.decision || "") === "Trade propose") return "Rien de bloquant pour le moment.";
  if (flags.includes("risk_too_high")) return "Le plan existe, mais le risque reste trop eleve.";
  if (flags.includes("entry_too_late")) return "Le setup existe, mais le timing n'est pas encore assez propre.";
  if (flags.includes("trend_conflict")) return "Le contexte est trop contradictoire pour valider un trade.";
  if (flags.includes("data_quality_low")) return "Les donnees sont trop fragiles pour juger le setup.";
  if (score < 40) return "Le signal est trop faible pour prendre position.";
  if (trend === "hausse" || trend === "baisse") return "Le scenario existe, mais il vaut mieux attendre encore.";
  return "Le marche reste trop flou pour proposer un trade.";
}

function actionNowLabel(plan) {
  const decision = String(plan?.decision || "");
  if (decision === "Trade propose") return "Ouvrir le trade";
  if (decision === "A surveiller" && String(plan?.waitFor || "").includes("meilleur point d'entree")) return "Attendre un meilleur point d'entree";
  if (decision === "A surveiller") return "Surveiller";
  return "Ne rien faire";
}

function simpleDecisionTitle(plan) {
  const decision = String(plan?.decision || "");
  if (decision === "Trade propose") return "Trade propose";
  if (decision === "A surveiller") return "A surveiller";
  return "Pas de trade";
}


function simpleTimingLabel(plan) {
  const timing = String(plan?.timing || "").toLowerCase();
  if (timing === "bon") return "bon";
  if (timing === "moyen" || timing === "correct") return "moyen";
  if (timing === "mauvais" || timing === "faible") return "mauvais";
  return "a confirmer";
}

function simpleTrendStrengthLabel(detail) {
  const value = Number(detail?.breakdown?.trend ?? 0);
  if (value >= 70) return "forte";
  if (value >= 55) return "moyenne";
  return "faible";
}

function simpleWaitForText(plan) {
  const wait = String(plan?.waitFor || "");
  if (!wait) return "rien de special";
  if (wait.includes("meilleur point d'entree")) return "un meilleur point d'entree";
  if (wait.includes("confirmation")) return "une confirmation plus nette";
  if (wait.includes("risque")) return "moins de risque";
  if (wait.includes("ratio")) return "un meilleur ratio";
  if (wait.includes("signal")) return "un signal plus clair";
  return wait;
}


function computeOfficialPlan(detail) { return detail?.plan || null; }

function applyOfficialPlanToRow(item) { return item; }

function findOfficialOpportunity(symbol) {
  const clean = String(symbol || "").toUpperCase();
  if (!clean) return null;
  const rows = Array.isArray(state.opportunities) ? state.opportunities : [];
  const snap = Array.isArray(state.opportunitiesSnapshot) ? state.opportunitiesSnapshot : [];
  return rows.find((x) => String(x?.symbol || "").toUpperCase() === clean) ||
         snap.find((x) => String(x?.symbol || "").toUpperCase() === clean) ||
         null;
}

function lockDetailToOfficialRow(detail) {
  if (!detail) return detail;
  const row = findOfficialOpportunity(detail.symbol);
  if (!row) return detail;
  return {
    ...detail,
    officialScore: row.officialScore ?? detail.officialScore ?? null,
    officialDecision: row.officialDecision || detail.officialDecision || null,
    officialTrendLabel: row.officialTrendLabel || detail.officialTrendLabel || null,
    officialWaitFor: row.officialWaitFor || detail.officialWaitFor || null
  };
}


function strictDisplayScore(detail) {
  if (!detail) return null;
  const locked = lockDetailToOfficialRow(detail);
  return safetyScoreFrom(locked);
}

function officialPlanForDetail(detail) {
  const locked = lockDetailToOfficialRow(detail);
  if (!locked?.plan) return null;
  const plan = { ...locked.plan };
  if (locked?.officialDecision) plan.decision = locked.officialDecision;
  if (locked?.officialTrendLabel) plan.trendLabel = locked.officialTrendLabel;
  if (locked?.officialWaitFor) plan.waitFor = locked.officialWaitFor;
  return plan;
}


function aiDisplayState(plan) {
    const status = String(plan?.aiContextStatus || "").trim().toLowerCase();
    const hasHttp = /http_\d+/.test(status);
    if (status.startsWith("ai_not_needed")) {
      return {
        title: "LECTURE MOTEUR SEULE",
        source: "moteur_local",
        message: "Contexte IA non necessaire sur ce cas.",
        externalAiUsed: false
      };
    }
    if (hasHttp || status.includes("network_error") || status.includes("invalid_json") || status.includes("missing_api_key")) {
      return {
        title: "FALLBACK LOCAL",
        source: "local_fallback",
        message: "IA externe indisponible, fallback local utilise.",
        externalAiUsed: false
      };
    }
    if (status && !status.startsWith("ai_not_needed")) {
      return {
        title: "LECTURE IA + MOTEUR",
        source: "ia_plus_moteur",
        message: "Contexte IA pris en compte lorsque pertinent.",
        externalAiUsed: true
      };
    }
    return {
      title: "LECTURE MOTEUR SEULE",
      source: "moteur_local",
      message: "Lecture moteur seule.",
      externalAiUsed: false
    };
  }


function detailTileValue(kind, plan, detail) {
    const score = actionabilityScoreFrom(plan) ?? actionabilityScoreFrom(detail) ?? null;
    const context = Number(plan?.contextQuality ?? NaN);
    const entry = Number(plan?.entryQuality ?? NaN);
    const risk = Number(plan?.riskQuality ?? NaN);
    const momentum = Number(plan?.momentumQuality ?? NaN);
    const direction = String(plan?.trendLabel || detail?.trendLabel || detail?.direction || "").trim().toLowerCase();
    const confirmationCount = Number(plan?.confirmationCount ?? detail?.confirmationCount ?? 0);

    if (kind === "context") {
      if (Number.isFinite(context)) {
        if (context >= 75) return "solide";
        if (context >= 60) return "correct";
        if (context >= 45) return "fragile";
        return "faible";
      }
      return score != null && score >= 65 ? "correct" : "fragile";
    }

    if (kind === "trend") {
      if (direction.includes("hauss")) return "haussiere";
      if (direction.includes("baiss")) return "baissiere";
      return "neutre";
    }

    if (kind === "momentum") {
      if (Number.isFinite(momentum)) {
        if (momentum >= 75) return "fort";
        if (momentum >= 60) return "correct";
        if (momentum >= 45) return "moyen";
        return "faible";
      }
      return confirmationCount >= 5 ? "correct" : "moyen";
    }

    if (kind === "entry") {
      if (Number.isFinite(entry)) {
        if (entry >= 78) return "propre";
        if (entry >= 62) return "a surveiller";
        return "faible";
      }
      return score != null && score >= 80 ? "propre" : (score != null && score >= 65 ? "a surveiller" : "faible");
    }

    if (kind === "risk") {
      if (Number.isFinite(risk)) {
        if (risk >= 72) return "faible";
        if (risk >= 58) return "correct";
        if (risk >= 45) return "a surveiller";
        return "eleve";
      }
      return "a surveiller";
    }

    if (kind === "activity") {
      if (confirmationCount >= 6) return "active";
      if (confirmationCount >= 4) return "correcte";
      if (confirmationCount >= 2) return "moyenne";
      return "calme";
    }

    return "indisponible";
  }

// PR #7 Phase 2 — chips régime (F&G/VIX) + news modulateur sur la fiche actif
  function renderModulatorChips(d) {
    if (!d) return "";
    const chips = [];
    const regimeBonus = Number(d.regimeBonus ?? d.plan?.regimeBonus ?? 0);
    const regimeReason = d.regimeBonusReason || d.plan?.regimeBonusReason;
    if (regimeBonus !== 0 && regimeReason) {
      const tone = regimeBonus > 0 ? "positive" : "negative";
      const sign = regimeBonus > 0 ? "+" : "";
      chips.push(`<span class="mod-chip ${tone}" title="Modulateur régime F&amp;G/VIX (PR #2)">Régime ${sign}${regimeBonus} — ${safeText(regimeReason)}</span>`);
    }
    const newsBonus = Number(d.newsBonus ?? d.plan?.newsBonus ?? 0);
    const newsReason = d.newsBonusReason || d.plan?.newsBonusReason;
    if (newsBonus !== 0 && newsReason) {
      const tone = newsBonus > 0 ? "positive" : "negative";
      const sign = newsBonus > 0 ? "+" : "";
      chips.push(`<span class="mod-chip ${tone}" title="Modulateur news ±10 pts (PR #7)">News ${sign}${newsBonus} — ${safeText(newsReason)}</span>`);
    }
    const ctx = d.newsContext || d.plan?.newsContext;
    if (ctx?.topHeadline && (newsBonus === 0 || !newsReason)) {
      const cls = ctx.classification === "positive" ? "positive" : ctx.classification === "negative" ? "negative" : "neutral";
      chips.push(`<span class="mod-chip ${cls}" title="${safeText(ctx.source || '')} — ${ctx.articleCount || 0} articles">News ${ctx.classification || "neutre"} · ${safeText(ctx.topHeadline)}</span>`);
    }
    if (ctx?.claudeSignal?.direction && ctx.claudeSignal.direction !== "bruit-ignore") {
      const cs = ctx.claudeSignal;
      const tone = cs.direction === "long-positif" ? "positive" : "negative";
      chips.push(`<span class="mod-chip ${tone} mod-claude" title="Claude niveau 3 — ${safeText(cs.reason || '')}">Claude ${safeText(cs.confidence)} ${safeText(cs.direction)}</span>`);
    }
    return chips.length ? `<div class="modulator-chips">${chips.join("")}</div>` : "";
  }

  function renderDetail() {
    const d = state.detail;
    return `
      <div class="screen">
        <div class="section-title"><button class="btn" data-route="opportunities">← Retour</button><span>Fiche actif</span></div>
        ${state.loadingDetail ? `<div class="loading-state">Chargement du detail...</div>` : ""}
        ${state.error ? `<div class="error-box">${safeText(state.error)}</div>` : ""}
        ${d ? `<div class="countdown-item">
                <span class="countdown-dot"></span>
                <span class="countdown-label">Bougies</span>
                <strong>${isCryptoSymbol(d.symbol) ? "recentes" : countdownOnlyLabel("candles_non_crypto", d.symbol)}</strong>
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
                  ${renderMarketBadge(d.symbol, d.assetClass)}
                  ${badge(d.trendLabel || simpleDirectionLabel(d.direction, d.score), d.direction || "")}
                  ${badge(simpleScoreStatusLabel(d.scoreStatus || "n/a"), d.scoreStatus || "")}
                  ${badge(`fiabilite ${safeText(d.confidenceLabel || simpleConfidenceLabel(d.confidence || "low"))}`)}
                  ${state.settings.showSourceBadges ? badge(d.sourceUsed || "source?") : ""}
                  ${state.settings.showSourceBadges ? badge(simpleFreshnessLabel(d.freshness || "unknown"), d.freshness || "") : ""}
                </div>
                <div style="font-size:.78rem;color:var(--text-muted);margin-top:6px">${safeText(getMarketStatus(d.symbol, d.assetClass).detail)}</div>
                <div style="margin-top:10px">
                  <button class="btn btn-secondary" style="font-size:.8rem" data-open-alert-modal="${safeText(d.symbol)}" data-alert-name="${safeText(d.name || d.symbol)}" data-alert-price="${d.price != null ? d.price : ""}">+ Alerte prix</button>
                </div>
                ${renderTradePlanHero(d, currentTradePlan())}
                ${(() => {
                  const plan = currentTradePlan();
                  return `
                    <div class="plan-card" style="display:none">
                      <div class="section-title"><span>Decision automatique</span><span>${safeText(plan?.decision || "—")}</span></div>
                      <div class="kv plan-grid">
                        <div class="muted">Decision simple</div><div>${safeText(plan?.decision || "Pas de trade")}</div>
                        <div class="muted">Tendance</div><div>${safeText(plan?.trendLabel || d.trendLabel || detectedTrendLabel(d.direction || "neutral"))}</div>
                        <div class="muted">Entree</div><div>${plan?.entry != null ? priceDisplay(plan.entry) : "—"}</div>
                        <div class="muted">Stop</div><div>${plan?.stopLoss != null ? priceDisplay(plan.stopLoss) : "—"}</div>
                        <div class="muted">Objectif</div><div>${plan?.takeProfit != null ? priceDisplay(plan.takeProfit) : "—"}</div>
                        <div class="muted">Ratio</div><div>${plan?.rr != null ? num(plan.rr, 2) : "—"}</div>
                        <div class="muted">Score de surete</div><div>${safetyScoreFrom(plan) != null ? `${num(safetyScoreFrom(plan), 0)}/100 · ${safeText(safetyLabel(safetyScoreFrom(plan), plan))}` : "—"}</div><div class="muted">Exploitabilite</div><div>${actionabilityScoreFrom(plan) != null ? `${num(actionabilityScoreFrom(plan), 0)}/100 · ${safeText(actionabilityLabel(actionabilityScoreFrom(plan)))}` : "—"}</div>
                        <div class="muted">Horizon</div><div>${safeText(plan?.horizon || "—")}</div>
                        <div class="muted">En clair</div><div>${safeText(simpleDecisionSentence(plan))}</div>
                        <div class="muted">Resume simple</div><div>${safeText(simpleContextSentence(plan))} ${safeText(plan?.aiSummary || "")}</div>
                      </div>
                      <div class="plan-reason">${safeText(plan?.reason || plan?.refusalReason || "Pas d'analyse disponible.")}</div>
                      <div class="plan-ai-summary">
                        <div class="muted">Resume court</div>
                        <div>${safeText(plan?.aiSummary || "Pas d'avis complementaire.")}</div>
                      </div>
                      <div class="plan-context">
                        ${(plan?.aiContext || []).map(label => `<span class="mini-pill">${safeText(label)}</span>`).join("")}
                        ${plan?.safety ? `<span class="mini-pill strong">niveau : ${safeText(plan.safety)}</span>` : ""}
                      </div>
                      <div class="trade-actions">
                        ${plan && plan.decision === "Trade propose" && plan.side ? `<button class="btn trade-btn primary" data-create-trade-plan>Ouvrir le trade propose</button>` : ""}
                      </div>
                    </div>`;
                })()}
              </div>

              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>Lecture complementaire</span><span>${state.loadingAiReview ? "analyse..." : safeText((state.aiReview?.provider === "moteur_local") ? "lecture moteur seule" : (state.aiReview?.externalAiUsed ? "Claude" : "fallback local"))}</span></div>
                ${state.loadingAiReview ? `<div class="loading-state">Analyse IA en cours...</div>` : state.aiReview ? `
                  <div class="ai-review-box">
                    <div class="legend">
                      ${badge(state.aiReview.decision || "—", decisionBadgeClass(state.aiReview.decision || ""))}
                      ${badge(`prudence ${state.aiReview.prudence || "—"}`)}
                      ${badge(state.aiReview.externalAiUsed ? "IA externe" : (state.aiReview?.provider === "moteur_local" ? "lecture moteur seule" : "lecture locale"))}
                    </div>
                    <div class="ai-summary">${safeText(state.aiReview.summary || state.aiReview.reason || "—")}</div>
                    <div class="kv" style="margin-top:12px">
                      <div class="muted">Pourquoi</div><div>${safeText(state.aiReview.reason || "—")}</div>
                      <div class="muted">Ce qui bloque</div><div>${safeText(state.aiReview.invalidation || "—")}</div>
                      <div class="muted">Source</div><div>${safeText(state.aiReview.provider || "—")}</div>
                    </div>
                    ${state.aiReview.warning ? `<div class="muted" style="margin-top:10px">${safeText(state.aiReview.warning)}</div>` : ""}
                  </div>
                ` : `<div class="empty-state">Aucune validation IA disponible pour le moment.</div>`}
              </div>

              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>News liees a l'actif</span><span>${relatedNewsForSymbol(d.symbol, d.name).length}</span></div>
                ${relatedNewsForSymbol(d.symbol, d.name).length ? `
                  <div class="news-list">
                    ${relatedNewsForSymbol(d.symbol, d.name).map((item) => `
                      <article class="news-card compact">
                        <div class="news-source-row">
                          <strong>${safeText(item.source || "source")}</strong>
                          <span class="muted">${safeText(item.topic || "news")}</span>
                        </div>
                        <div class="news-title">${safeText(item.title || "Titre indisponible")}</div>
                        <div class="muted">${safeText(item.summary || "Resume indisponible")}</div>
                        <div class="trade-actions" style="margin-top:10px">
                          ${item.link ? `<a class="btn" href="${safeText(item.link)}" target="_blank" rel="noopener noreferrer">Ouvrir la source</a>` : ""}
                        </div>
                      </article>
                    `).join("")}
                  </div>
                ` : `<div class="empty-state">Aucune news directement reliee a cet actif pour le moment.</div>`}
              </div>

              <div class="card">
                <div class="section-title"><span>Evolution recente</span><span>${Array.isArray(d.candles) && d.candles.length ? `${d.candles.length} bougies` : "historique recent"}</span></div>
                ${renderChart(d.candles, d.symbol)}
              </div>
            </div>

            <div>
              <div class="card conclusion-card" style="margin-bottom:18px">
                <div class="section-title"><span>Conclusion</span><span>${strictDisplayScore(state.detail) != null ? strictDisplayScore(state.detail) : (currentTradePlan()?.finalScore != null ? currentTradePlan().finalScore : "—")}/100</span></div>
                <div class="conclusion-top">
                  <div class="conclusion-main">
                    <div class="conclusion-decision">${safeText(simpleDecisionTitle(currentTradePlan()))}</div>
                    <div class="conclusion-line">Niveau de surete : <strong>${safeText(safetyLabel(safetyScoreFrom(currentTradePlan() || d), currentTradePlan() || d))}</strong></div>
                    <div class="conclusion-line">Tendance : <strong>${safeText(currentTradePlan()?.trendLabel || d.trendLabel || detectedTrendLabel(d.direction || "neutral"))}</strong></div>
                    <div class="conclusion-line">Force de la tendance : <strong>${safeText(simpleTrendStrengthLabel(d))}</strong></div>
                    <div class="conclusion-line">Timing d'entree : <strong>${safeText(simpleTimingLabel(currentTradePlan()))}</strong></div>
                    <div class="conclusion-line">A faire maintenant : <strong>${safeText(actionNowLabel(currentTradePlan()))}</strong></div>
                  </div>
                  <div class="conclusion-score">
                    ${scoreRing(safetyScoreFrom(currentTradePlan() || d), safetyTone(safetyScoreFrom(currentTradePlan() || d), currentTradePlan() || d))}<div class="muted" style="text-align:center; margin-top:8px;">${safeText(`surete ${safetyScoreFrom(currentTradePlan() || d) ?? "—"}/100`)}</div><div class="muted" style="text-align:center;">${safeText(`exploitabilite ${actionabilityScoreFrom(currentTradePlan() || d) ?? "—"}/100`)}</div>
                  </div>
                </div>
                <div class="conclusion-text">
                  <div class="muted">Pourquoi</div>
                  <div>${safeText(simpleDecisionSentence(currentTradePlan()))}</div>
                </div>
                <div class="conclusion-text">
                  <div class="muted">Ce qui bloque</div>
                  <div>${safeText(simpleBlockerText(currentTradePlan()))}</div>
                </div>
                <div class="conclusion-text">
                  <div class="muted">Ce qu'il faut attendre</div>
                  <div>${safeText(simpleWaitForText(currentTradePlan()))}</div>
                </div>
                ${state.settings.showScoreBreakdown ? `
                  <div class="breakdown" style="margin-top:14px">
                    <div class="break-item"><div class="break-name">Contexte</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.regime))}</div></div>
                    <div class="break-item"><div class="break-name">Tendance</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.trend))}</div></div>
                    <div class="break-item"><div class="break-name">Elan</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.momentum))}</div></div>
                    <div class="break-item"><div class="break-name">Entree</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.entryQuality))}</div></div>
                    <div class="break-item"><div class="break-name">Risque</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.risk))}</div></div>
                    <div class="break-item"><div class="break-name">Activite</div><div class="break-value">${safeText(simpleReliabilityLabel(d.breakdown?.participation))}</div></div>
                  </div>` : `<div class="muted">Le detail du signal est masque dans les reglages.</div>`
                }
                ${renderModulatorChips(d)}
              </div>

              <div class="card">
                <div class="section-title"><span>Informations utiles</span></div>
                <div class="kv">
                  <div class="muted">Source</div><div>${safeText(d.sourceUsed || "—")}</div>
                  <div class="muted">Mise a jour</div><div>${safeText(simpleFreshnessLabel(d.freshness || "unknown"))}</div>
                  <div class="muted">Variation 24h</div><div>${pct(d.change24hPct)}</div>
                  <div class="muted">Type</div><div>${safeText(simpleAssetClassLabel(d.assetClass || "—"))}</div>
                </div>
              </div>
            </div>
          </div>
        ` : (!state.loadingDetail ? `<div class="empty-state">Aucun detail charge.</div>` : "")}
      </div>`;
  }

function tradeStatusMeta(position) {
  const p = normalizePositionRecord(position);
  const snap = p.analysisSnapshot || {};
  const exec = p.execution || {};
  const live = p.live || {};
  const opp = Array.isArray(state.opportunities) ? state.opportunities.find((o) => o.symbol === p.symbol) : null;
  const entryPrice = Number(exec.entryPrice ?? snap.entry ?? p.entryPrice);
  const stopLoss = Number(snap.stopLoss ?? p.stopLoss);
  const takeProfit = Number(snap.takeProfit ?? p.takeProfit);
  const livePrice = Number(opp?.price ?? live?.price ?? entryPrice);

  const validEntry = Number.isFinite(entryPrice) && entryPrice > 0;
  const validLive = Number.isFinite(livePrice) && livePrice > 0;
  const validStop = Number.isFinite(stopLoss) && stopLoss > 0;
  const validTarget = Number.isFinite(takeProfit) && takeProfit > 0;

  const pnlPctLive = (!validLive || !validEntry) ? null :
    (p.side === "short"
      ? ((entryPrice - livePrice) / entryPrice) * 100
      : ((livePrice - entryPrice) / entryPrice) * 100);

  let label = "stable";
  let text = "Trade en attente";
  let badgeClass = "neutral";

  if (pnlPctLive != null && pnlPctLive >= 2) {
    label = "gain";
    text = "Trade en gain";
    badgeClass = "positive";
  } else if (pnlPctLive != null && pnlPctLive <= -1.5) {
    label = "pressure";
    text = "Sous pression";
    badgeClass = "negative";
  }

  let stopDistancePct = null;
  if (validStop && validLive) {
    stopDistancePct = p.side === "short"
      ? ((stopLoss - livePrice) / livePrice) * 100
      : ((livePrice - stopLoss) / livePrice) * 100;
    if (stopDistancePct <= 1.2) {
      label = "near_stop";
      text = "Proche du stop";
      badgeClass = "negative";
    }
  }

  let targetDistancePct = null;
  if (validTarget && validLive) {
    targetDistancePct = p.side === "short"
      ? ((livePrice - takeProfit) / livePrice) * 100
      : ((takeProfit - livePrice) / livePrice) * 100;
    if (targetDistancePct <= 1.5 && targetDistancePct >= -1) {
      label = "near_target";
      text = "Proche de l'objectif";
      badgeClass = "positive";
    }
  }

  return {
    livePrice: validLive ? livePrice : null,
    pnlPctLive,
    stopDistancePct,
    targetDistancePct,
    label,
    text,
    badgeClass
  };
}

function partialClosePosition(positionId, percent = 50) {
  const idx = state.trades.positions.findIndex((p) => p.id === positionId);
  if (idx === -1) return;
  const position = normalizePositionRecord(state.trades.positions[idx]);
  const meta = tradeStatusMeta(position);
  const fallbackEntry = Number(position?.execution?.entryPrice ?? position?.entryPrice);
  const resolvedLivePrice = Number(meta.livePrice ?? position?.live?.price ?? fallbackEntry);
  const livePrice = (Number.isFinite(resolvedLivePrice) && resolvedLivePrice > 0) ? resolvedLivePrice : fallbackEntry;
  if (!(Number.isFinite(livePrice) && livePrice > 0)) {
    state.error = "Impossible de cloturer partiellement : prix de sortie invalide.";
    render();
    return;
  }

  const ratio = Math.max(0.1, Math.min(1, percent / 100));
  const closeQty = Number(position.quantity || 0) * ratio;
  if (!Number.isFinite(closeQty) || closeQty <= 0) return;

  const remainingQty = Number(position.quantity || 0) - closeQty;
  const pnl = position.side === "long"
    ? (livePrice - position.entryPrice) * closeQty
    : (position.entryPrice - livePrice) * closeQty;
  const pnlPct = position.entryPrice ? ((pnl / (position.entryPrice * closeQty)) * 100) : null;
  const closedAt = new Date().toISOString();

  state.trades.history.unshift(normalizePositionRecord({
    id: `${position.id}:partial:${Date.now()}`,
    symbol: position.symbol,
    name: position.name,
    side: position.side,
    quantity: closeQty,
    entryPrice: position.entryPrice,
    invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * closeQty : null,
    exitPrice: livePrice,
    pnl,
    pnlPct,
    closedAt,
    sourceUsed: position.sourceUsed || "training",
    closeType: `Cloture partielle ${percent}%`,
    analysisSnapshot: position.analysisSnapshot,
    execution: {
      openedAt: position.execution?.openedAt || position.openedAt || null,
      entryPrice: position.entryPrice,
      quantity: closeQty,
      invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * closeQty : null
    },
    closedExecution: {
      exitPrice: livePrice,
      closedAt,
      closeType: `Cloture partielle ${percent}%`
    }
  }));

  if (remainingQty <= 0.0000001) {
    state.trades.positions.splice(idx, 1);
  } else {
    state.trades.positions[idx] = normalizePositionRecord({
      ...position,
      quantity: remainingQty,
      invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * remainingQty : null,
      execution: {
        ...(position.execution || {}),
        entryPrice: position.entryPrice,
        quantity: remainingQty,
        invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * remainingQty : null
      },
      partialClosedAt: closedAt
    });
  }

  state.error = null;
  persistTradesState();
  render();
}

function closeTradePosition(positionId) {
  const idx = state.trades.positions.findIndex((p) => p.id === positionId);
  if (idx === -1) return;
  const position = normalizePositionRecord(state.trades.positions[idx]);
  const meta = tradeStatusMeta(position);
  const fallbackEntry = Number(position?.execution?.entryPrice ?? position?.entryPrice);
  const resolvedLivePrice = Number(meta.livePrice ?? position?.live?.price ?? fallbackEntry);
  const livePrice = (Number.isFinite(resolvedLivePrice) && resolvedLivePrice > 0) ? resolvedLivePrice : fallbackEntry;
  if (!(Number.isFinite(livePrice) && livePrice > 0)) {
    state.error = "Impossible de cloturer ce trade : prix de sortie invalide.";
    render();
    return;
  }

  const pnl = position.side === "long"
    ? (livePrice - position.entryPrice) * position.quantity
    : (position.entryPrice - livePrice) * position.quantity;
  const pnlPct = position.entryPrice ? ((pnl / (position.entryPrice * position.quantity)) * 100) : null;
  const closedAt = new Date().toISOString();

  state.trades.history.unshift(normalizePositionRecord({
    id: `${position.id}:full:${Date.now()}`,
    symbol: position.symbol,
    name: position.name,
    side: position.side,
    quantity: position.quantity,
    entryPrice: position.entryPrice,
    invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * position.quantity : null,
    exitPrice: livePrice,
    pnl,
    pnlPct,
    closedAt,
    sourceUsed: position.sourceUsed || "training",
    closeType: "Cloture manuelle",
    analysisSnapshot: position.analysisSnapshot,
    execution: {
      openedAt: position.execution?.openedAt || position.openedAt || null,
      entryPrice: position.entryPrice,
      quantity: position.quantity,
      invested: Number.isFinite(Number(position.entryPrice)) ? position.entryPrice * position.quantity : null
    },
    closedExecution: {
      exitPrice: livePrice,
      closedAt,
      closeType: "Cloture manuelle"
    }
  }));

  state.trades.positions.splice(idx, 1);
  state.error = null;
  persistTradesState();
  render();
}


function tradeHealthLabel(meta) {
  if (!meta) return "en attente";
  if (meta.label === "gain" || meta.label === "near_target") return "ca se passe bien";
  if (meta.label === "pressure" || meta.label === "near_stop") return "a surveiller";
  return "en attente";
}

function actionTradeSummary(meta) {
  if (!meta) return "Attendre.";
  if (meta.label === "near_stop") return "Proche du stop, a surveiller de pres.";
  if (meta.label === "near_target") return "Proche de l'objectif.";
  if (meta.label === "gain") return "Le trade est en gain.";
  if (meta.label === "pressure") return "Le trade est sous pression.";
  return "Le trade evolue sans signal fort.";
}

function tradePnlText(meta) {
  if (!meta || meta.pnlPctLive == null) return "P/L live indisponible";
  return `P/L live ${pct(meta.pnlPctLive)}`;
}

function historyResultLabel(item) {
  const pnl = Number(item?.pnl || 0);
  if (pnl > 0) return "gain";
  if (pnl < 0) return "perte";
  return "neutre";
}

function renderPositionRow(position) {
  const p = normalizePositionRecord(position);
  const meta = tradeStatusMeta(p);
  const snap = p.analysisSnapshot || {};
  const exec = p.execution || {};
  const live = p.live || {};

  const entryPrice = Number(exec.entryPrice ?? snap.entry ?? p.entryPrice);
  const stopPrice  = Number(snap.stopLoss ?? p.stopLoss ?? 0);
  const tpPrice    = Number(snap.takeProfit ?? p.takeProfit ?? 0);
  const livePrice  = meta.livePrice ?? (Number.isFinite(entryPrice) ? entryPrice : null);
  const quantity   = Number(exec.quantity ?? p.quantity);

  const hasEntry = Number.isFinite(entryPrice) && entryPrice > 0;
  const hasStop  = stopPrice > 0;
  const hasTP    = tpPrice > 0;
  const hasLive  = livePrice != null;
  const hasQty   = Number.isFinite(quantity) && quantity > 0;
  const isShort  = p.side === "short";

  const pnlPct = (hasLive && hasEntry)
    ? (((isShort ? entryPrice - livePrice : livePrice - entryPrice) / entryPrice) * 100)
    : null;
  const pnlUsd = (hasLive && hasEntry && hasQty)
    ? ((isShort ? entryPrice - livePrice : livePrice - entryPrice) * quantity)
    : null;
  const pnlEur = pnlUsd != null ? pnlUsd * fxRateUsdToEur() : null;
  const pnlPositive = pnlPct != null && pnlPct >= 0;

  const stopDistPct  = hasStop && hasLive ? ((isShort ? livePrice - stopPrice : stopPrice - livePrice) / livePrice * 100) : null;
  const tpDistPct    = hasTP  && hasLive ? ((isShort ? livePrice - tpPrice : tpPrice - livePrice) / livePrice * 100) : null;
  const ratio        = displayRatioValue(p);

  let progressPct = null;
  if (hasStop && hasTP && hasLive) {
    const range = Math.abs(tpPrice - stopPrice);
    if (range > 0) {
      const fill = p.side === "long"
        ? (livePrice - stopPrice) / range
        : (stopPrice - livePrice) / range;
      progressPct = Math.min(100, Math.max(0, fill * 100));
    }
  }

  const lastLive = live?.updatedAt ? new Date(live.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;
  const ms = getMarketStatus(p.symbol, inferAssetClass(p.symbol, p.assetClass));

  return `
  <div class="pos-card">
    <div class="pos-header">
      <div class="pos-header-left">
        <div class="pos-symbol">${safeText(p.symbol)}</div>
        <div class="pos-name">${safeText(snap.decision || p.tradeDecision || "Trade ouvert")}${snap.horizon || p.horizon ? ` · ${safeText(snap.horizon || p.horizon)}` : ""}</div>
      </div>
      <div class="pos-header-right">
        ${badge(simpleSideLabel(p.side), p.side)}
        ${pnlPct != null
          ? `<div class="pos-pnl ${pnlPositive ? "pos" : "neg"}">${pnlEur != null ? money(pnlEur, "EUR") + " · " : ""}${pct(pnlPct)}</div>`
          : `<div class="pos-pnl neutral">P/L —</div>`}
      </div>
    </div>

    <div class="pos-prices">
      <div class="pos-price-item">
        <div class="pos-price-label">Entrée</div>
        <div class="pos-price-val">${hasEntry ? priceDisplay(entryPrice) : "—"}</div>
      </div>
      <div class="pos-price-arrow">${hasLive && hasEntry ? (livePrice >= entryPrice ? "↑" : "↓") : "→"}</div>
      <div class="pos-price-item">
        <div class="pos-price-label">Actuel ${lastLive ? `· ${lastLive}` : ""}</div>
        <div class="pos-price-val ${hasLive && hasEntry ? (livePrice >= entryPrice ? "live-up" : "live-down") : ""}">${hasLive ? priceDisplay(livePrice) : "—"}</div>
      </div>
      <div class="pos-market-badge">${renderMarketBadge(p.symbol, p.assetClass)}</div>
    </div>

    <div class="pos-levels">
      <div class="pos-level">
        <span class="pos-level-label">Stop</span>
        <span class="pos-level-val">${hasStop ? priceDisplay(stopPrice) : "—"}</span>
        ${stopDistPct != null ? `<span class="pos-level-dist ${Math.abs(stopDistPct) < 2 ? "danger" : "warn"}">${pct(stopDistPct, 1)}</span>` : ""}
      </div>
      <div class="pos-level center">
        <span class="pos-level-label">Ratio</span>
        <span class="pos-level-val">${ratio != null ? num(ratio, 2) : "—"}</span>
      </div>
      <div class="pos-level right">
        <span class="pos-level-label">Objectif</span>
        <span class="pos-level-val">${hasTP ? priceDisplay(tpPrice) : "—"}</span>
        ${tpDistPct != null ? `<span class="pos-level-dist green">${pct(tpDistPct, 1)}</span>` : ""}
      </div>
    </div>

    ${progressPct != null ? `
    <div class="pos-progress-track">
      <div class="pos-progress-fill" style="width:${progressPct.toFixed(1)}%"></div>
      <div class="pos-progress-marker" style="left:clamp(4px, calc(${progressPct.toFixed(1)}% - 6px), calc(100% - 16px))"></div>
    </div>
    <div class="pos-progress-labels">
      <span class="danger">Stop</span>
      <span class="green">Objectif</span>
    </div>` : ""}

    <div class="pos-actions">
      <button class="btn btn-secondary pos-btn" data-close-half="${safeText(p.id)}">Clôturer 50%</button>
      <button class="btn btn-primary pos-btn" data-close-trade="${safeText(p.id)}">Clôturer</button>
    </div>
  </div>`;
}

function displayHistoryEntryPrice(position) {
    const p = normalizePositionRecord(position);
    const value = Number(p?.execution?.entryPrice ?? p?.analysisSnapshot?.entry ?? p?.entryPrice);
    return Number.isFinite(value) ? value : null;
  }

  function displayHistoryExitPrice(position) {
    const p = normalizePositionRecord(position);
    const value = Number(p?.closedExecution?.exitPrice ?? p?.exitPrice ?? p?.live?.price);
    return Number.isFinite(value) ? value : null;
  }

  function displayHistoryClosedAt(position) {
    const p = normalizePositionRecord(position);
    return p?.closedExecution?.closedAt || p?.closedAt || null;
  }

  function displayHistorySourceOrClosure(position){
    const p = normalizePositionRecord(position);
    const raw = p?.closedExecution?.closeType || p?.closeType || p?.sourceUsed || p?.analysisSnapshot?.sourceUsed || "training";
    const text = String(raw || "").trim().toLowerCase();
    if (!text || text === "training") return "cloture legacy";
    if (text === "manual" || text === "manuel" || text === "manual_close") return "cloture manuelle";
    if (text === "stop" || text === "stoploss" || text === "stop_loss") return "stop touche";
    if (text === "target" || text === "takeprofit" || text === "take_profit") return "objectif touche";
    return raw;
  }

function tradeSource(p) {
  if (p?.source === "algo") return "algo";
  if (p?.source === "manual") return "manual";
  const dec = String(p?.tradeDecision || p?.trade_decision || p?.analysisSnapshot?.decision || "").toLowerCase();
  if (dec.includes("trade propose") || dec === "conseille") return "algo";
  return "manual";
}

function renderHistoryRow(item) {
    const p = normalizePositionRecord(item);
    const scoreValue = displayScoreValue(p);
    const entryPrice = displayHistoryEntryPrice(p);
    const exitPrice = displayHistoryExitPrice(p);
    const closedAt = displayHistoryClosedAt(p);
    const entryMode = trainingEntryModeMeta(p);
    const pnl = Number(p?.pnl || 0);
    const pnlPctValue = Number.isFinite(Number(p?.pnlPct)) ? Number(p.pnlPct) : null;
    const feedback = state.tradeFeedback?.[String(p.id || "")] || null;
    const feedbackBadges = renderFeedbackBadges(feedback);
    return `
      <div class="trade-row history simple-history-row">
        <div>
          <div class="trade-symbol">${safeText(p.symbol)}</div>
          <div class="trade-sub">${safeText(validTradeDate(closedAt) ? new Date(closedAt).toLocaleString("fr-FR") : "date indisponible")}${entryMode ? ` Â· ${safeText(entryMode.label)}` : ""}</div>
          ${feedbackBadges}
        </div>
        <div>${badge(simpleSideLabel(p.side), p.side)}</div>
        <div>${badge(historyResultLabel(p), (pnl >= 0 ? "positive" : "negative"))}</div>
        <div>${entryPrice == null ? "—" : priceDisplay(entryPrice)}</div>
        <div>${exitPrice == null ? "—" : priceDisplay(exitPrice)}</div>
        <div class="${pnl >= 0 ? 'positive' : 'negative'}">${money(pnl * fxRateUsdToEur(), "EUR")} · ${pnlPctValue == null ? "—" : pct(pnlPctValue)}</div>
        <div>${safeText(scoreValue == null ? "—" : `${num(scoreValue, 0)}/100`)}</div>
        <div>${safeText(displayHistorySourceOrClosure(p))}</div>
      </div>`;
  }

  // PR #5 Phase 2 — badges MAE/MFE + exit_reason sur les trades clos
  function renderFeedbackBadges(feedback) {
    if (!feedback) return "";
    const parts = [];

    const exitLabels = {
      stop_loss: "SL",
      take_profit: "TP",
      time_exit: "Délai",
      engine_invalidation: "Invalidé",
      manual: "Manuel",
      unknown: "—"
    };
    const exit = exitLabels[feedback.exit_reason] || null;
    if (exit) parts.push(`<span class="fb-badge fb-exit" title="Raison de clôture">${safeText(exit)}</span>`);

    const mae = Number(feedback.mae_pct);
    const maeRatio = Number(feedback.mae_vs_stop_ratio);
    if (Number.isFinite(mae)) {
      const tight = Number.isFinite(maeRatio) && maeRatio >= 0.7;
      parts.push(`<span class="fb-badge fb-mae${tight ? ' fb-warn' : ''}" title="Pire drawdown intra-trade${tight ? ' — stop touché à >70%' : ''}">MAE ${num(mae, 2)}%</span>`);
    }

    const mfe = Number(feedback.mfe_pct);
    const mfeRatio = Number(feedback.mfe_vs_tp_ratio);
    if (Number.isFinite(mfe)) {
      const greedy = Number.isFinite(mfeRatio) && mfeRatio >= 1.2;
      parts.push(`<span class="fb-badge fb-mfe${greedy ? ' fb-info' : ''}" title="Meilleur gain intra-trade${greedy ? ' — TP dépassé puis retour' : ''}">MFE ${num(mfe, 2)}%</span>`);
    }

    if (!parts.length) return "";
    return `<div class="trade-feedback-badges">${parts.join("")}</div>`;
  }

  function algoDecisionCounts() {
    const rows = Array.isArray(state.algoJournal) ? state.algoJournal : [];
    const out = { total: rows.length, conseille: 0, possible: 0, surveiller: 0, eviter: 0, aucun: 0, manuel: 0 };
    for (const row of rows) {
      const d = String(row?.decision || "").toLowerCase();
      if (d.includes("trade conseille")) out.conseille += 1;
      else if (d.includes("trade possible")) out.possible += 1;
      else if (d.includes("surveiller")) out.surveiller += 1;
      else if (d.includes("eviter")) out.eviter += 1;
      else if (d.includes("aucun")) out.aucun += 1;
      else if (d.includes("manuel")) out.manuel += 1;
    }
    return out;
  }

  function moteurDecisionLabel(row) {
    const raw = String(row?.decision || row?.analysisLabel || "").toLowerCase();
    if (raw.includes("propose") || raw.includes("conseille")) return "Trade propose";
    if (raw.includes("possible")) return "Trade possible";
    if (raw.includes("surveiller")) return "A surveiller";
    if (raw.includes("eviter")) return "A eviter";
    if (raw.includes("aucun") || raw.includes("pas de trade")) return "Pas de trade";
    return row?.decision || "Decision inconnue";
  }

  function safeJournalDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    const time = date.getTime();
    if (!Number.isFinite(time)) return "—";
    return date.toLocaleString("fr-FR");
  }

  function journalMoteurRows(limit = 10) {
    const rows = Array.isArray(state.algoJournal) ? state.algoJournal.slice() : [];
    return rows
      .map((row, index) => ({
        ...row,
        _symbol: String(row?.symbol || "").toUpperCase(),
        _decision: moteurDecisionLabel(row),
        _score: Number.isFinite(Number(row?.score)) ? Number(row.score) : null,
        _time: row?.updatedAt || row?.createdAt || row?.timestamp || null,
        _idx: index
      }))
      .filter((row) => row._symbol)
      .sort((a, b) => {
        const ta = a._time ? new Date(a._time).getTime() : 0;
        const tb = b._time ? new Date(b._time).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);
  }

  function updateJournalMoteurFromOpportunity(item) {
    if (!item || !item.symbol) return;
    const symbol = String(item.symbol || "").toUpperCase();
    const rows = Array.isArray(state.algoJournal) ? state.algoJournal.slice() : [];
    const next = {
      id: `journal:${symbol}`,
      symbol,
      name: item.name || symbol,
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
      decision: item.decision || item.analysisLabel || null,
      confidence: item.confidence || null,
      confidenceLabel: item.confidenceLabel || null,
      trendLabel: item.trendLabel || null,
      reasonShort: item.reasonShort || null,
      sourceUsed: item.sourceUsed || null,
      updatedAt: new Date().toISOString()
    };
    const idx = rows.findIndex((row) => String(row?.symbol || "").toUpperCase() === symbol);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...next };
    else rows.unshift(next);
    state.algoJournal = rows.slice(0, 200);
    persistTradesState();
  }

  function renderJournalMoteurCard() {
    const rows = journalMoteurRows(8);
    return `
      <div class="card" style="margin-top:18px">
        <div class="section-title"><span>Journal moteur</span><span>${rows.length}</span></div>
        ${rows.length ? `
          <div class="trade-table simplified-history">
            <div class="trade-row trade-head">
              <div>Actif</div><div>Decision</div><div>Score</div><div>Confiance</div><div>Tendance</div><div>Source</div><div>Maj</div>
            </div>
            ${rows.map((row) => `
              <div class="trade-row history simple-history-row">
                <div>
                  <div class="trade-symbol">${safeText(row._symbol)}</div>
                  <div class="trade-sub">${safeText(row.name || row._symbol)}</div>
                </div>
                <div>${badge(row._decision, row._decision === "Trade propose" ? "positive" : row._decision === "Pas de trade" ? "negative" : "neutral")}</div>
                <div>${row._score == null ? "—" : `${num(row._score, 0)}/100`}</div>
                <div>${safeText(row.confidenceLabel || row.confidence || "—")}</div>
                <div>${safeText(row.trendLabel || "—")}</div>
                <div>${safeText(row.sourceUsed || "—")}</div>
                <div>${safeJournalDate(row._time)}</div>
              </div>
            `).join("")}
          </div>
        ` : `<div class="empty-state">Le journal moteur se remplira au fur et a mesure des analyses.</div>`}
      </div>
    `;
  }

  function groupedHistoryInsights() {
    const history = Array.isArray(state.trades?.history) ? state.trades.history : [];
    const bySymbol = {};
    for (const row of history) {
      const key = String(row?.symbol || "").toUpperCase();
      if (!key) continue;
      if (!bySymbol[key]) bySymbol[key] = { symbol: key, count: 0, pnl: 0, wins: 0 };
      bySymbol[key].count += 1;
      bySymbol[key].pnl += Number(row?.pnl || 0);
      if (Number(row?.pnl || 0) > 0) bySymbol[key].wins += 1;
    }
    const arr = Object.values(bySymbol).map((x) => ({ ...x, winRate: x.count ? (x.wins / x.count) * 100 : null }));
    arr.sort((a, b) => Number(b.pnl || 0) - Number(a.pnl || 0));
    return { best: arr.slice(0, 3), worst: arr.slice(-3).reverse() };
  }

  function tradeOperationalLabel(meta) {
    if (!meta) return "a surveiller";
    if (meta.stopDistancePct != null && meta.stopDistancePct <= 5) return "proche stop";
    if (meta.targetDistancePct != null && meta.targetDistancePct <= 5) return "proche objectif";
    if (meta.livePnlPct != null && meta.livePnlPct > 0) return "en suivi";
    return "en attente";
  }

  function displayScoreValue(position){
    const snap = position?.analysisSnapshot || {};
    const raw = Number(snap?.score ?? position?.score);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }

  function trainingEntryModeMeta(position){
    const raw = position?.analysisSnapshot?.entryMode || position?.execution?.entryMode || position?.entryMode || null;
    const mode = String(raw || "").trim().toLowerCase();
    if (mode === "exploration") {
      return {
        mode,
        label: "exploration",
        badgeClass: "exploration",
        description: "exploration controlee"
      };
    }
    if (mode === "core") {
      return {
        mode,
        label: "coeur",
        badgeClass: "complete",
        description: "selection principale"
      };
    }
    return null;
  }

  function displayRatioValue(position){
    const snap = position?.analysisSnapshot || {};
    const explicit = Number(snap?.ratio ?? position?.rrRatio);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const entry = Number(position?.execution?.entryPrice ?? snap?.entry ?? position?.entryPrice);
    const stop = Number(snap?.stopLoss ?? position?.stopLoss);
    const target = Number(snap?.takeProfit ?? position?.takeProfit);
    if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(target)) return null;
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (!(risk > 0) || !(reward > 0)) return null;
    return reward / risk;
  }

  function displayInvestedValue(position){
    const exec = position?.execution || {};
    const direct = Number(exec?.invested ?? position?.invested);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const entry = Number(exec?.entryPrice ?? position?.analysisSnapshot?.entry ?? position?.entryPrice);
    const qty = Number(exec?.quantity ?? position?.quantity);
    if (Number.isFinite(entry) && entry > 0 && Number.isFinite(qty) && qty > 0) return entry * qty;
    return null;
  }

  function historyCloseLabel(position){
    return displayHistorySourceOrClosure(position);
  }

  function tradeLiveIntervalMs(position) {
    const symbol = String(position?.symbol || "").toUpperCase();
    if (!symbol) return 120000;
    if (["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "SUI", "NEAR", "TON", "APT"].includes(symbol)) return 30000;
    return 120000;
  }

  async function refreshOpenTradesLive(force = false) {
    if (state.tradeLive?.running) return;
    if (state.route !== "portfolio" || state.trades.mode !== "training") return;
    const positions = Array.isArray(state.trades?.positions) ? state.trades.positions : [];
    if (!positions.length) return;

    const now = Date.now();
    const targets = positions.filter((p) => {
      const key = String(p?.symbol || "").toUpperCase();
      const last = Number(state.tradeLive.bySymbol?.[key] || 0);
      return force || (now - last) >= tradeLiveIntervalMs(p);
    });

    if (!targets.length) return;
    state.tradeLive.running = true;

    try {
      const results = await Promise.all(targets.map(async (position) => {
        const symbol = String(position?.symbol || "").toUpperCase();
        try {
          const detail = await api(`/api/opportunity-detail/${encodeURIComponent(symbol)}`, 8000);
          const price = Number(detail?.data?.price);
          return {
            symbol,
            ok: Number.isFinite(price),
            price: Number.isFinite(price) ? price : null,
            sourceUsed: detail?.data?.sourceUsed || null
          };
        } catch (e) {
          return { symbol, ok: false, price: null, sourceUsed: null };
        }
      }));

      let changed = false;
      state.trades.positions = state.trades.positions.map((raw) => {
        const p = normalizePositionRecord(raw);
        const symbol = String(p?.symbol || "").toUpperCase();
        const hit = results.find((x) => x.symbol === symbol);
        if (!hit) return p;
        state.tradeLive.bySymbol[symbol] = now;
        if (!hit.ok || hit.price == null) return p;

        const exec = p.execution || {};
        const entryPrice = Number(exec.entryPrice ?? p.entryPrice ?? p.analysisSnapshot?.entry);
        const quantity = Number(exec.quantity ?? p.quantity);
        const pnl = (Number.isFinite(entryPrice) && Number.isFinite(quantity) && quantity > 0)
          ? ((p.side === "short" ? (entryPrice - hit.price) : (hit.price - entryPrice)) * quantity)
          : null;
        const invested = Number.isFinite(entryPrice) && Number.isFinite(quantity) && quantity > 0 ? entryPrice * quantity : null;
        const pnlPct = (pnl != null && invested && invested > 0) ? (pnl / invested) * 100 : null;

        changed = true
        return normalizePositionRecord({
          ...p,
          sourceUsed: p.sourceUsed || hit.sourceUsed || null,
          live: {
            ...(p.live || {}),
            updatedAt: new Date(now).toISOString(),
            price: hit.price,
            pnl,
            pnlPct
          }
        });
      });

      if (changed || results.length) {
        persistTradesLocalCache();
        render();
      }
    } finally {
      state.tradeLive.lastRunAt = now;
      state.tradeLive.running = false;
    }
  }

  
function createAnalysisSnapshotFromOpportunity(detail){
  if (!detail || typeof detail !== "object") return null;
  const plan = typeof currentTradePlan === "function" ? currentTradePlan(detail) : null;
  return {
    symbol: detail.symbol || null,
    name: detail.name || detail.label || detail.symbol || null,
    score: Number.isFinite(Number(detail.score)) ? Number(detail.score) : null,
    decision: plan?.decision || detail.decision || null,
    trendLabel: plan?.trendLabel || detail.trendLabel || detectedTrendLabel(detail.direction || "neutral"),
    direction: detail.direction || null,
    entry: Number.isFinite(Number(plan?.entry)) ? Number(plan.entry) : null,
    stopLoss: Number.isFinite(Number(plan?.stopLoss)) ? Number(plan.stopLoss) : null,
    takeProfit: Number.isFinite(Number(plan?.takeProfit)) ? Number(plan.takeProfit) : null,
    ratio: Number.isFinite(Number(plan?.ratio)) ? Number(plan.ratio) : null,
    horizon: plan?.horizon || detail.horizon || null,
    reason: plan?.reason || detail.reason || detail.summary || null,
    scoreBreakdown: detail.scoreBreakdown || null,
    sourceUsed: detail.source || detail.sourceUsed || null,
    analysisTimestamp: Date.now()
  };
}

function normalizePositionRecord(position){
  if (!position || typeof position !== "object") return position;

  const rawAnalysisSnapshot = position?.analysisSnapshot || position?.analysis_snapshot || {};
  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const positiveOrNull = (value) => {
    const num = safeNumber(value);
    return num != null && num > 0 ? num : null;
  };

  const quantityRaw  = positiveOrNull(position?.execution?.quantity  ?? position?.quantity);
  const investedRaw  = positiveOrNull(position?.execution?.invested  ?? position?.invested);
  const entryPriceRaw = positiveOrNull(
    position?.execution?.entryPrice ??
    position?.entry_price ??
    position?.entryPrice ??
    rawAnalysisSnapshot?.entry ??
    (investedRaw != null && quantityRaw != null && quantityRaw > 0 ? investedRaw / quantityRaw : null)
  );
  const investedFinal = investedRaw
    ?? ((entryPriceRaw != null && quantityRaw != null) ? entryPriceRaw * quantityRaw : null);
  const stopLossRaw   = positiveOrNull(rawAnalysisSnapshot?.stopLoss  ?? position?.stop_loss  ?? position?.stopLoss);
  const takeProfitRaw = positiveOrNull(rawAnalysisSnapshot?.takeProfit ?? position?.take_profit ?? position?.takeProfit);
  const ratioRaw = positiveOrNull(rawAnalysisSnapshot?.ratio ?? position?.rrRatio ?? position?.rr);
  const exitPriceRaw = positiveOrNull(position?.closedExecution?.exitPrice ?? position?.exitPrice);
  const livePriceRaw = positiveOrNull(position?.live?.price);
  const pnlRaw = safeNumber(position?.pnl);
  const pnlPctRaw = safeNumber(position?.pnlPct);
  const sourceUsed = position?.sourceUsed || position?.source || rawAnalysisSnapshot?.sourceUsed || null;
  const inferredClosed = !!(
    position?.closedExecution?.closedAt || position?.closedAt ||
    position?.closedExecution?.exitPrice || position?.exitPrice
  );
  const normalizedStatus = position?.status || (inferredClosed ? "closed" : "open");
  const entryMode = String(rawAnalysisSnapshot?.entryMode || position?.execution?.entryMode || position?.entryMode || "").trim().toLowerCase() || null;

  const snapshot = {
    symbol: position.symbol || null,
    name: position.name || position.symbol || null,
    score: positiveOrNull(rawAnalysisSnapshot?.score ?? position?.score),
    decision: rawAnalysisSnapshot?.decision || position?.trade_decision || position?.tradeDecision || null,
    trendLabel: rawAnalysisSnapshot?.trendLabel || position?.trend_label || position?.trendLabel || detectedTrendLabel(position?.direction || "neutral"),
    direction: rawAnalysisSnapshot?.direction || position?.direction || null,
    entry: entryPriceRaw,
    stopLoss: stopLossRaw,
    takeProfit: takeProfitRaw,
    ratio: ratioRaw,
    horizon: rawAnalysisSnapshot?.horizon || position?.horizon || null,
    reason: rawAnalysisSnapshot?.reason || position?.trade_reason || position?.tradeReason || null,
    scoreBreakdown: rawAnalysisSnapshot?.scoreBreakdown || position?.scoreBreakdown || null,
    entryMode,
    sourceUsed,
    analysisTimestamp: rawAnalysisSnapshot?.analysisTimestamp || position?.openedAt || Date.now()
  };

  return {
    ...position,
    analysisSnapshot: snapshot,
    execution: {
      ...(position.execution || {}),
      openedAt: position?.execution?.openedAt || position?.openedAt || null,
      entryPrice: entryPriceRaw,
      quantity: quantityRaw,
      invested: investedFinal,
      entryMode
    },
    live: {
      ...(position.live || {}),
      updatedAt: position?.live?.updatedAt || Date.now(),
      price: livePriceRaw,
      pnl: position?.live?.pnl != null ? safeNumber(position.live.pnl) : null,
      pnlPct: position?.live?.pnlPct != null ? safeNumber(position.live.pnlPct) : null
    },
    closedExecution: {
      ...(position.closedExecution || {}),
      exitPrice: exitPriceRaw,
      closedAt: position?.closedExecution?.closedAt || position?.closedAt || null,
      closeType: position?.closedExecution?.closeType || position?.closeType || null
    },
    tradeDecision: snapshot.decision,
    tradeReason: snapshot.reason,
    trendLabel: snapshot.trendLabel,
    horizon: snapshot.horizon,
    stopLoss: stopLossRaw,
    takeProfit: takeProfitRaw,
    score: snapshot.score,
    entryMode,
    entryPrice: entryPriceRaw,
    quantity: quantityRaw,
    invested: investedFinal,
    exitPrice: exitPriceRaw,
    pnl: pnlRaw,
    pnlPct: pnlPctRaw,
    sourceUsed,
    status: normalizedStatus
  };
}

function normalizeOpenPositionsState(){
  if (!state || !Array.isArray(state.openPositions)) return;
  state.openPositions = state.openPositions.map(normalizePositionRecord);
}

function restoreTradesFromBackupIfEmpty() {
  const backupPositions = readJson(TRADE_STORAGE.positionsBackup, []);
  const backupHistory = readJson(TRADE_STORAGE.historyBackup, []);
  const backupAlgo = readJson(TRADE_STORAGE.algoJournalBackup, []);

  if (!state.trades.positions.length && Array.isArray(backupPositions) && backupPositions.length) {
    state.trades.positions = backupPositions.map(normalizePositionRecord);
  }
  if (!state.trades.history.length && Array.isArray(backupHistory) && backupHistory.length) {
    state.trades.history = backupHistory.map((x) => normalizePositionRecord(x));
  }
  if (!state.algoJournal.length && Array.isArray(backupAlgo) && backupAlgo.length) {
    state.algoJournal = backupAlgo;
  }
}


function validTradeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function historyHasMeaningfulClosure(position) {
  const p = normalizePositionRecord(position);
  const closeType = String(p?.closedExecution?.closeType || p?.closeType || "").toLowerCase();
  return !!(
    validTradeDate(p?.closedExecution?.closedAt || p?.closedAt) ||
    (Number.isFinite(Number(p?.closedExecution?.exitPrice ?? p?.exitPrice)) && Number(p?.closedExecution?.exitPrice ?? p?.exitPrice) > 0) ||
    (Number.isFinite(Number(p?.pnl)) && Math.abs(Number(p?.pnl)) > 0.000001) ||
    (closeType && closeType !== "training")
  );
}

function isLegacyClosedTrade(position) {
  const p = normalizePositionRecord(position);
  const closeType = String(p?.closedExecution?.closeType || p?.closeType || p?.sourceUsed || "").toLowerCase();
  const closedAt = validTradeDate(p?.closedExecution?.closedAt || p?.closedAt);
  const exitPrice = Number(p?.closedExecution?.exitPrice ?? p?.exitPrice);
  const pnl = Number(p?.pnl || 0);
  const pnlPct = Number(p?.pnlPct || 0);
  const entryPrice = Number(p?.execution?.entryPrice ?? p?.entryPrice);
  const hasAnyClose = historyHasMeaningfulClosure(p);

  if (hasAnyClose) return false;
  return !!(
    p?.symbol &&
    Number.isFinite(entryPrice) && entryPrice > 0 &&
    (!closedAt) &&
    (!Number.isFinite(exitPrice) || exitPrice <= 0) &&
    Math.abs(pnl) < 0.000001 &&
    Math.abs(pnlPct) < 0.000001 &&
    (!closeType || closeType === "training")
  );
}

function historyDedupKey(position) {
  const p = normalizePositionRecord(position);
  const symbol = String(p?.symbol || "").toUpperCase();
  const closedAt = validTradeDate(p?.closedExecution?.closedAt || p?.closedAt) || "no-date";
  const entry = Number.isFinite(Number(p?.execution?.entryPrice ?? p?.entryPrice)) ? Number(p?.execution?.entryPrice ?? p?.entryPrice).toFixed(6) : "no-entry";
  const exit = Number.isFinite(Number(p?.closedExecution?.exitPrice ?? p?.exitPrice)) ? Number(p?.closedExecution?.exitPrice ?? p?.exitPrice).toFixed(6) : "no-exit";
  const qty = Number.isFinite(Number(p?.execution?.quantity ?? p?.quantity)) ? Number(p?.execution?.quantity ?? p?.quantity).toFixed(6) : "no-qty";
  return [symbol, closedAt, entry, exit, qty].join("|");
}

function normalizeTradesHistoryState() {
  if (!state?.trades) return;
  state.trades.historyHiddenCount = 0;

  if (Array.isArray(state.trades.positions)) {
    state.trades.positions = state.trades.positions
      .map(normalizePositionRecord)
      .filter((p) => !!String(p?.symbol || "").trim());
  }

  if (Array.isArray(state.trades.history)) {
    const normalized = state.trades.history
      .map(normalizePositionRecord)
      .filter((p) => !!String(p?.symbol || "").trim());

    const hidden = normalized.filter(isLegacyClosedTrade);
    state.trades.historyHiddenCount = hidden.length;

    const clean = normalized.filter((p) => !isLegacyClosedTrade(p));
    const seen = new Set();
    state.trades.history = clean.filter((p) => {
      const key = historyDedupKey(p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

function openPositionsRiskView() {
    const positions = Array.isArray(state.trades?.positions) ? state.trades.positions : [];
    return positions.map((p) => {
      const liveMatch = Array.isArray(state.opportunities) ? state.opportunities.find((o) => o.symbol === p.symbol) : null;
      const livePrice = liveMatch?.price ?? p.entryPrice ?? null;
      const distanceToStop = (p.stopLoss == null || livePrice == null)
        ? null
        : (p.side === "long"
            ? ((livePrice - p.stopLoss) / livePrice) * 100
            : ((p.stopLoss - livePrice) / livePrice) * 100);
      return { ...p, livePrice, distanceToStop };
    }).sort((a, b) => {
      const av = a.distanceToStop == null ? 999 : a.distanceToStop;
      const bv = b.distanceToStop == null ? 999 : b.distanceToStop;
      return av - bv;
    });
  }

  function exportTradesToCSV() {
    const history = Array.isArray(state.trades.history) ? state.trades.history : [];
    if (!history.length) return;
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Date ouverture","Date cloture","Symbole","Nom","Direction","Prix entree","Prix sortie","Quantite","Investi USD","P&L USD","P&L %","Source","Score","Stop Loss","Take Profit"];
    const rows = history.map(p => {
      const openedAt = p?.execution?.openedAt || p?.openedAt || "";
      const closedAt = p?.closedExecution?.closedAt || p?.closedAt || "";
      const fmt = ts => ts ? new Date(ts).toISOString().slice(0,10) : "";
      const src = tradeSource(p);
      return [
        fmt(openedAt), fmt(closedAt),
        p.symbol || "", p.name || p.symbol || "",
        p.analysisSnapshot?.direction || p.direction || "",
        p.entryPrice ?? "", p.exitPrice ?? "",
        p.quantity ?? "", p.invested ?? "",
        p.pnl ?? "", p.pnlPct != null ? (p.pnlPct * 100).toFixed(2) : "",
        src, p.score ?? p.analysisSnapshot?.score ?? "",
        p.stopLoss ?? p.analysisSnapshot?.stopLoss ?? "",
        p.takeProfit ?? p.analysisSnapshot?.takeProfit ?? ""
      ].map(esc).join(",");
    });
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manitradepro_trades_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderPortfolioPriorityCard() {
    const p = state.portfolioPriority;
    const loading = state.loadingPortfolioPriority;
    const priColor = { haute: "positive", moyenne: "", faible: "muted" };
    return `<div class="card" style="margin-top:18px">
      <div class="section-title">
        <span>IA — Quoi trader maintenant ?</span>
        <button class="btn" data-action="load-portfolio-priority" ${loading ? "disabled" : ""}>${loading ? "Analyse..." : "Analyser"}</button>
      </div>
      ${loading ? `<div class="chart-loading">Analyse en cours...</div>` : p ? `
        <div class="ai-insight-card">
          ${p.conseil ? `<div class="ai-insight-resume">${safeText(p.conseil)}</div>` : ""}
          ${(p.ranking||[]).length ? `<div class="ai-insight-section">
            <div class="ai-insight-label">Priorites</div>
            ${p.ranking.map((r,i) => `<div class="ai-priority-row">
              <span class="ai-priority-rank">${i+1}</span>
              <span class="ai-priority-symbol">${safeText(r.symbol)}</span>
              <span class="ai-priority-badge ${priColor[r.priorite]||""}">${safeText(r.priorite)}</span>
              <span class="ai-priority-reason">${safeText(r.raison)}</span>
            </div>`).join("")}
          </div>` : ""}
          ${(p.eviter||[]).length ? `<div class="ai-insight-section"><div class="ai-insight-label">A eviter</div><div class="ai-insight-warn">${p.eviter.map(s=>safeText(s)).join(", ")}</div></div>` : ""}
        </div>` : `<div class="empty-state">Lance l'analyse pour savoir quoi trader en priorite.</div>`}
    </div>`;
  }

  function renderJournalAnalysisCard() {
    const a = state.journalAnalysis;
    const loading = state.loadingJournalAnalysis;
    return `<div class="card" style="margin-top:18px">
      <div class="section-title">
        <span>IA — Analyse journal</span>
        <button class="btn" data-action="load-journal-analysis" ${loading ? "disabled" : ""}>${loading ? "Analyse..." : "Analyser"}</button>
      </div>
      ${loading ? `<div class="chart-loading">Analyse en cours...</div>` : a ? `
        <div class="ai-insight-card">
          ${a.resume ? `<div class="ai-insight-resume">${safeText(a.resume)}</div>` : ""}
          ${(a.biais||[]).length ? `<div class="ai-insight-section"><div class="ai-insight-label">Biais detectes</div>${a.biais.map(b=>`<div class="ai-insight-warn">⚠ ${safeText(b)}</div>`).join("")}</div>` : ""}
          ${(a.forces||[]).length ? `<div class="ai-insight-section"><div class="ai-insight-label">Points forts</div>${a.forces.map(f=>`<div class="ai-insight-ok">✓ ${safeText(f)}</div>`).join("")}</div>` : ""}
          ${(a.recommandations||[]).length ? `<div class="ai-insight-section"><div class="ai-insight-label">Recommandations</div>${a.recommandations.map(r=>`<div class="ai-insight-item">→ ${safeText(r)}</div>`).join("")}</div>` : ""}
          ${a.stats ? `<div class="ai-insight-stats">
            <div class="ai-stat"><div class="ai-stat-val">${a.stats.winRate!=null?num(a.stats.winRate,1)+"%":"—"}</div><div class="ai-stat-lbl">Win rate</div></div>
            <div class="ai-stat"><div class="ai-stat-val">${a.stats.avgWinUsd!=null?"$"+num(a.stats.avgWinUsd,2):"—"}</div><div class="ai-stat-lbl">Gain moy</div></div>
            <div class="ai-stat"><div class="ai-stat-val">${a.stats.avgLossUsd!=null?"$"+num(a.stats.avgLossUsd,2):"—"}</div><div class="ai-stat-lbl">Perte moy</div></div>
            <div class="ai-stat"><div class="ai-stat-val">${a.stats.expectancy!=null?"$"+num(a.stats.expectancy,2):"—"}</div><div class="ai-stat-lbl">Esperance</div></div>
          </div>` : ""}
          ${(a.crypto?.resume||a.crypto?.points?.length) ? `<div class="ai-insight-section"><div class="ai-insight-label class-crypto-lbl">Crypto</div>${a.crypto.resume?`<div class="ai-insight-item">${safeText(a.crypto.resume)}</div>`:""}${(a.crypto.points||[]).map(p=>`<div class="ai-insight-item">· ${safeText(p)}</div>`).join("")}</div>` : ""}
          ${(a.stocks?.resume||a.stocks?.points?.length) ? `<div class="ai-insight-section"><div class="ai-insight-label class-stock-lbl">Actions / ETF</div>${a.stocks.resume?`<div class="ai-insight-item">${safeText(a.stocks.resume)}</div>`:""}${(a.stocks.points||[]).map(p=>`<div class="ai-insight-item">· ${safeText(p)}</div>`).join("")}</div>` : ""}
        </div>` : `<div class="empty-state">Lance l'analyse pour identifier tes biais de trading.</div>`}
    </div>`;
  }

  function renderPerformance() {
    const history = Array.isArray(state.trades.history) ? state.trades.history : [];
    const positions = Array.isArray(state.trades.positions) ? state.trades.positions : [];
    const fx = fxRateUsdToEur();

    if (!history.length && !positions.length) {
      return `<div class="screen"><div class="screen-header"><div class="screen-title">Performance</div></div>
        <div class="card"><div class="empty-state">Aucun trade enregistré pour le moment.</div></div></div>`;
    }

    const closed = history.filter(p => p.pnl != null);
    const wins = closed.filter(p => p.pnl > 0);
    const losses = closed.filter(p => p.pnl < 0);
    const totalPnlUsd = closed.reduce((s, p) => s + (p.pnl || 0), 0);
    const totalPnlEur = totalPnlUsd * fx;
    const winRate = closed.length ? (wins.length / closed.length) * 100 : null;
    const avgWinUsd = wins.length ? wins.reduce((s, p) => s + p.pnl, 0) / wins.length : null;
    const avgLossUsd = losses.length ? losses.reduce((s, p) => s + p.pnl, 0) / losses.length : null;
    const rrRatio = avgWinUsd != null && avgLossUsd != null && avgLossUsd !== 0
      ? Math.abs(avgWinUsd / avgLossUsd) : null;
    const expectancy = (winRate != null && avgWinUsd != null && avgLossUsd != null)
      ? (winRate / 100) * avgWinUsd + (1 - winRate / 100) * avgLossUsd : null;

    const best = closed.length ? closed.reduce((a, b) => b.pnl > a.pnl ? b : a) : null;
    const worst = closed.length ? closed.reduce((a, b) => b.pnl < a.pnl ? b : a) : null;

    const sorted = closed
      .filter(p => p?.closedExecution?.closedAt || p?.closedAt)
      .sort((a, b) => new Date(a?.closedExecution?.closedAt || a?.closedAt) - new Date(b?.closedExecution?.closedAt || b?.closedAt));
    let cum = 0;
    const curvePoints = sorted.map(p => { cum += (p.pnl || 0) * fx; return cum; });
    const curveLabels = sorted.map(p => new Date(p?.closedExecution?.closedAt || p?.closedAt)
      .toLocaleDateString("fr-FR", { month: "short", day: "numeric" }));

    function sparklinePath(values) {
      if (values.length < 2) return null;
      const w = 400, h = 80;
      const minV = Math.min(...values, 0), maxV = Math.max(...values, 0);
      const range = maxV - minV || 1;
      const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - minV) / range) * h}`);
      const zeroY = h - (0 - minV) / range * h;
      return { line: `M${pts.join(" L")}`, fill: `M0,${h} L${pts.join(" L")} L${w},${h} Z`,
        zeroY, positive: values[values.length - 1] >= 0 };
    }
    const spark = sparklinePath(curvePoints);

    const bySymbol = {};
    closed.forEach(p => {
      const sym = p.symbol || "?";
      if (!bySymbol[sym]) bySymbol[sym] = { symbol: sym, name: p.name || sym, pnl: 0, count: 0 };
      bySymbol[sym].pnl += p.pnl || 0;
      bySymbol[sym].count++;
    });
    const topAssets = Object.values(bySymbol).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 5);

    const pStat = (label, val, cls = "") =>
      `<div class="perf-stat"><div class="perf-stat-label">${safeText(label)}</div><div class="perf-stat-value ${cls}">${val}</div></div>`;

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Performance</div>
          <div class="screen-subtitle">${closed.length} trade${closed.length > 1 ? "s" : ""} fermé${closed.length > 1 ? "s" : ""} · ${positions.length} ouvert${positions.length > 1 ? "s" : ""}</div>
        </div>

        <div class="perf-stats-grid">
          ${pStat("P&amp;L total", `${totalPnlEur >= 0 ? "+" : ""}${money(totalPnlEur, "EUR")}`, totalPnlEur >= 0 ? "positive" : "negative")}
          ${pStat("Win rate", winRate != null ? `${num(winRate, 1)}%` : "—", winRate != null && winRate >= 50 ? "positive" : "negative")}
          ${pStat("Trades fermés", String(closed.length))}
          ${pStat("Ratio R:R", rrRatio != null ? num(rrRatio, 2) : "—", rrRatio != null && rrRatio >= 1.5 ? "positive" : "")}
          ${pStat("Gain moyen", avgWinUsd != null ? `+${money(avgWinUsd * fx, "EUR")}` : "—", "positive")}
          ${pStat("Perte moyenne", avgLossUsd != null ? money(avgLossUsd * fx, "EUR") : "—", "negative")}
          ${pStat("Espérance/trade", expectancy != null ? `${expectancy >= 0 ? "+" : ""}${money(expectancy * fx, "EUR")}` : "—", expectancy != null && expectancy >= 0 ? "positive" : "negative")}
          ${pStat("Positions ouvertes", String(positions.length))}
        </div>

        ${spark ? `
        <div class="card perf-curve-card">
          <div class="section-title"><span>Courbe P&amp;L cumulatif</span><span class="${totalPnlEur >= 0 ? "positive" : "negative"}">${totalPnlEur >= 0 ? "+" : ""}${money(totalPnlEur, "EUR")}</span></div>
          <div class="perf-curve-wrap">
            <svg class="perf-curve-svg" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${spark.positive ? "#00e5a0" : "#ef4444"}" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="${spark.positive ? "#00e5a0" : "#ef4444"}" stop-opacity="0"/>
              </linearGradient></defs>
              <path d="${spark.fill}" fill="url(#curveGrad)"/>
              <line x1="0" y1="${spark.zeroY}" x2="400" y2="${spark.zeroY}" stroke="rgba(255,255,255,.12)" stroke-width="1" stroke-dasharray="4 4"/>
              <path d="${spark.line}" fill="none" stroke="${spark.positive ? "#00e5a0" : "#ef4444"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="perf-curve-dates">
              <span>${safeText(curveLabels[0] || "")}</span>
              <span>${safeText(curveLabels[curveLabels.length - 1] || "")}</span>
            </div>
          </div>
        </div>` : ""}

        ${best || worst ? `
        <div class="perf-extremes">
          ${best ? `<div class="card perf-extreme-card">
            <div class="perf-extreme-label">Meilleur trade</div>
            <div class="perf-extreme-sym">${safeText(best.symbol || "—")}</div>
            <div class="perf-extreme-val positive">+${money((best.pnl || 0) * fx, "EUR")}</div>
          </div>` : ""}
          ${worst ? `<div class="card perf-extreme-card">
            <div class="perf-extreme-label">Pire trade</div>
            <div class="perf-extreme-sym">${safeText(worst.symbol || "—")}</div>
            <div class="perf-extreme-val negative">${money((worst.pnl || 0) * fx, "EUR")}</div>
          </div>` : ""}
        </div>` : ""}

        ${topAssets.length ? `
        <div class="card">
          <div class="section-title"><span>Actifs par P&amp;L absolu</span></div>
          <div class="perf-asset-list">
            ${topAssets.map(a => {
              const pnlEur = a.pnl * fx;
              return `<div class="perf-asset-row">
                <span class="perf-asset-sym">${safeText(a.symbol)}</span>
                <span class="perf-asset-name">${safeText(a.name)}</span>
                <span class="perf-asset-count">${a.count} trade${a.count > 1 ? "s" : ""}</span>
                <span class="perf-asset-pnl ${pnlEur >= 0 ? "positive" : "negative"}">${pnlEur >= 0 ? "+" : ""}${money(pnlEur, "EUR")}</span>
              </div>`;
            }).join("")}
          </div>
        </div>` : ""}
      </div>`;
  }

  function renderPortfolio() {
    restoreTradesFromBackupIfEmpty();
    normalizeTradesHistoryState();
    refreshOpenTradesLive().catch(() => {});
    const stats = trainingStats();
    const positions = state.trades.positions;
    const history = state.trades.history;
    const algoHistory   = history.filter(p => tradeSource(p) === "algo");
    const manualHistory = history.filter(p => tradeSource(p) === "manual");
    const cryptoStats   = trainingStatsByClass(true);
    const stockStats    = trainingStatsByClass(false);
    const meta = loadTradesMeta();

    function historyTable(rows) {
      return `<div class="trade-table simplified-history">
        <div class="trade-row trade-head">
          <div>Actif</div><div>Sens</div><div>Résultat</div><div>Entrée</div><div>Sortie</div><div>P/L</div><div>Clôture</div>
        </div>${rows.map(renderHistoryRow).join("")}
      </div>`;
    }

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Mes trades</div>
          <div class="screen-subtitle muted">${meta?.updatedAt ? `Sauvegarde ${new Date(meta.updatedAt).toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}` : ""} · ${safeText(remoteStatusText())}</div>
        </div>

        <div class="controls">
          <button class="btn ${state.trades.mode==="training"?"active":""}" data-trade-mode="training">Entrainement</button>
          <button class="btn ${state.trades.mode==="real"?"active":""}" data-trade-mode="real">Reel</button>
          <button class="btn" data-force-sync>${state.trades._syncing ? "Sync…" : "Synchroniser"}</button>
          <button class="btn" data-reset-training-capital>Reset capital</button>
          ${history.length ? `<button class="btn btn-danger-soft" data-clear-all-history>Vider historique</button>` : ""}
        </div>

        ${state.trades.mode === "real" ? `
          <div class="empty-state" style="margin-top:24px">Le portefeuille reel n'est pas encore branche.</div>
        ` : `

          <!-- WALLET -->
          <div class="wallet-strip">
            <div class="wallet-item">
              <div class="wallet-label">Disponible</div>
              <div class="wallet-val">${money(stats.wallet.availableEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">Engagé</div>
              <div class="wallet-val">${money(stats.wallet.engagedEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">P/L latent</div>
              <div class="wallet-val ${stats.wallet.unrealizedEur >= 0 ? "positive" : "negative"}">${money(stats.wallet.unrealizedEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">P/L réalisé</div>
              <div class="wallet-val ${stats.wallet.realizedEur >= 0 ? "positive" : "negative"}">${money(stats.wallet.realizedEur, "EUR")}</div>
            </div>
            <div class="wallet-item wallet-item-equity">
              <div class="wallet-label">Equity</div>
              <div class="wallet-val">${money(stats.wallet.equityEur, "EUR")}</div>
            </div>
          </div>

          <!-- PERF PAR CLASSE (si historique) -->
          ${history.length ? `
            <div class="class-perf-strip">
              ${cryptoStats.closedCount > 0 ? `
                <div class="class-perf-item crypto">
                  <span class="class-perf-dot">●</span>
                  <span class="class-perf-name">Crypto</span>
                  <span class="class-perf-trades">${cryptoStats.closedCount} trades</span>
                  <span class="class-perf-pnl ${cryptoStats.realizedEur >= 0 ? "positive" : "negative"}">${money(cryptoStats.realizedEur, "EUR")}</span>
                  <span class="class-perf-wr">${cryptoStats.winRate != null ? num(cryptoStats.winRate,0)+"%" : "—"} win</span>
                </div>
              ` : ""}
              ${stockStats.closedCount > 0 ? `
                <div class="class-perf-item stock">
                  <span class="class-perf-dot">●</span>
                  <span class="class-perf-name">Actions/ETF</span>
                  <span class="class-perf-trades">${stockStats.closedCount} trades</span>
                  <span class="class-perf-pnl ${stockStats.realizedEur >= 0 ? "positive" : "negative"}">${money(stockStats.realizedEur, "EUR")}</span>
                  <span class="class-perf-wr">${stockStats.winRate != null ? num(stockStats.winRate,0)+"%" : "—"} win</span>
                  <span class="market-status-pill ${isStockMarketOpen() ? "open" : "closed"}">${isStockMarketOpen() ? "ouvert" : "fermé"}</span>
                </div>
              ` : ""}
              ${cryptoStats.closedCount === 0 && stockStats.closedCount === 0 ? `<div class="muted" style="padding:8px 0;font-size:.83rem">Aucun trade fermé pour le moment.</div>` : ""}
            </div>
          ` : ""}

          <!-- POSITIONS OUVERTES -->
          <div class="card" style="margin-top:18px">
            <div class="section-title">
              <span>Positions ouvertes <span class="badge">${positions.length}</span></span>
              <span style="display:flex;gap:6px;align-items:center">
                <span class="market-status-pill open">Crypto 24/7</span>
                <span class="market-status-pill ${isStockMarketOpen()?"open":"closed"}">${isStockMarketOpen()?"Marchés ouverts":"Marchés fermés"}</span>
              </span>
            </div>
            ${positions.length
              ? `<div class="pos-list">${positions.map(renderPositionRow).join("")}</div>`
              : `<div class="empty-state">Aucun trade ouvert.</div>`}
          </div>

          <!-- HISTORIQUE -->
          ${history.length ? `
            <div class="card" style="margin-top:18px">
              <div class="section-title">
                <span>Historique <span class="badge">${history.length}</span></span>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-secondary" style="font-size:.72rem;padding:3px 9px" data-export-csv>Export CSV</button>
                  ${algoHistory.length ? `<button class="btn btn-secondary" style="font-size:.72rem;padding:3px 9px" data-clear-history="algo">Algo</button>` : ""}
                  ${manualHistory.length ? `<button class="btn btn-secondary" style="font-size:.72rem;padding:3px 9px" data-clear-history="manual">Manuel</button>` : ""}
                  <button class="btn btn-danger-soft" style="font-size:.72rem;padding:3px 9px" data-clear-all-history>Tout vider</button>
                </div>
              </div>
              ${algoHistory.length ? `<div class="history-source-label class-crypto-lbl" style="margin-bottom:4px">Algo (${algoHistory.length})</div>${historyTable(algoHistory)}` : ""}
              ${manualHistory.length ? `<div class="history-source-label class-stock-lbl" style="margin:${algoHistory.length?"12px":0} 0 4px">Manuel (${manualHistory.length})</div>${historyTable(manualHistory)}` : ""}
            </div>
          ` : `
            <div class="card" style="margin-top:18px">
              <div class="section-title"><span>Historique</span></div>
              <div class="empty-state">Aucun trade fermé. Base saine !</div>
            </div>
          `}

          <!-- IA OUTILS -->
          ${renderPortfolioPriorityCard()}
          ${renderJournalAnalysisCard()}

          ${state.settings.showAlgoJournal ? `<div style="margin-top:8px">${renderJournalMoteurCard()}</div>` : ""}
        `}
      </div>`;
  }

  function renderAlerts() {
    const active = state.priceAlerts.filter(a => a.active);
    const triggered = state.priceAlerts.filter(a => !a.active);
    const notifStatus = "Notification" in window ? Notification.permission : "unsupported";

    function alertRow(a) {
      const dir = a.condition === "above" ? "Au-dessus de" : "En-dessous de";
      const ago = a.triggeredAt
        ? `Declenche ${Math.round((Date.now() - a.triggeredAt) / 60000)} min`
        : `Cree ${Math.round((Date.now() - a.createdAt) / 60000)} min ago`;
      return `
        <div class="alert-row ${a.active ? "" : "alert-triggered"}">
          <div class="alert-row-info">
            <div class="alert-symbol">${safeText(a.symbol)}</div>
            <div class="alert-cond">${dir} ${priceDisplay(a.targetPrice)}</div>
            <div class="alert-meta">${safeText(a.name)} · ${ago}</div>
          </div>
          ${a.active ? `<button class="btn btn-secondary alert-remove-btn" data-remove-alert="${a.id}">Suppr.</button>` : `<span class="badge badge-positive">OK</span>`}
        </div>`;
    }

    return `
      <div class="screen">
        <div class="section-title"><span>Alertes de prix</span><span>${active.length} active${active.length !== 1 ? "s" : ""}</span></div>

        ${notifStatus !== "granted" ? `
          <div class="info-box" style="margin-bottom:14px">
            ${notifStatus === "denied"
              ? "Notifications bloquees par le navigateur. Autorise-les dans les reglages de ton navigateur pour recevoir les alertes."
              : "Active les notifications pour recevoir une alerte meme si l'appli est en arriere-plan."}
            ${notifStatus === "default" ? `<button class="btn btn-primary" style="margin-top:8px" data-request-notif-perm>Activer les notifications</button>` : ""}
          </div>` : ""}

        <div class="card" style="margin-bottom:18px">
          <div class="section-title"><span>Alertes actives</span><span>${active.length}</span></div>
          ${active.length ? active.map(alertRow).join("") : `<div class="empty-state">Aucune alerte active. Ouvre la fiche d'un actif pour en creer une.</div>`}
        </div>

        ${triggered.length ? `
          <div class="card">
            <div class="section-title"><span>Historique</span><span>${triggered.length}</span></div>
            ${triggered.map(alertRow).join("")}
            <button class="btn btn-secondary" style="margin-top:12px;width:100%" data-clear-triggered-alerts>Effacer l'historique</button>
          </div>` : ""}
      </div>`;
  }

  function renderAlertModal() {
    if (!state.alertModal.open) return "";
    const { symbol, name, currentPrice } = state.alertModal;
    return `
      <div class="modal-overlay" id="alert-modal-overlay" data-close-modal="alert">
        <div class="modal-box pin-modal">
          <div class="modal-title">Alerte prix — ${safeText(symbol)}</div>
          <div class="modal-desc">${safeText(name)}${currentPrice != null ? ` · Prix actuel\u00a0: ${priceDisplay(currentPrice)}` : ""}</div>
          <select class="setting-input" id="alert-condition" style="margin-bottom:10px">
            <option value="above">Au-dessus de</option>
            <option value="below">En-dessous de</option>
          </select>
          <input class="setting-input pin-input" type="number" inputmode="decimal" id="alert-target-price" placeholder="Prix cible (USD)" step="any" ${currentPrice != null ? `value="${currentPrice}"` : ""}>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-alert-cancel>Annuler</button>
            <button class="btn btn-primary" data-alert-submit>Creer l'alerte</button>
          </div>
        </div>
      </div>`;
  }

  function renderAlertToast() {
    if (!state.alertToast) return "";
    return `
      <div class="alert-toast">
        <div class="alert-toast-title">${safeText(state.alertToast.title)}</div>
        <div class="alert-toast-body">${safeText(state.alertToast.body)}</div>
      </div>`;
  }

  function renderUserAssetRow(a) {
    const sym = safeText(a.symbol || "");
    const name = safeText(a.name || sym);
    const cls = safeText(a.asset_class || "");
    const provider = safeText(a.provider_used || "");
    const enabled = a.enabled !== false;
    const source = String(a.source || "user");
    const isPinned = a.is_pinned === true;
    const autoReason = a.auto_reason;

    // PR #8 Phase 2 — badges source + pin toggle
    let sourceBadge = "";
    if (source === "auto") {
      const trendCount = autoReason?.trending_count;
      sourceBadge = `<span class="ua-badge ua-auto" title="Ajouté automatiquement par le bot${trendCount ? ` · trending ${trendCount}× sur 7j` : ""}">auto</span>`;
    } else if (source === "core") {
      sourceBadge = `<span class="ua-badge ua-core" title="Actif de base protégé">core</span>`;
    }
    const pinBadge = isPinned ? `<span class="ua-badge ua-pinned" title="Épinglé — ne sera jamais retiré auto">épinglé</span>` : "";

    return `
      <div class="user-asset-row ${enabled ? "" : "is-disabled"}${isPinned ? " is-pinned" : ""}">
        <div class="user-asset-main">
          <div class="user-asset-sym">${sym} ${sourceBadge}${pinBadge}</div>
          <div class="user-asset-meta">${name} · ${cls}${provider ? ` · ${provider}` : ""}</div>
        </div>
        <div class="user-asset-actions">
          <button class="btn btn-secondary user-asset-pin" data-pin-user-asset="${sym}" data-pin-state="${isPinned ? "on" : "off"}" aria-label="${isPinned ? "Désépingler" : "Épingler"} ${sym}" title="${isPinned ? "Désépingler" : "Épingler"}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isPinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
          </button>
          <label class="user-asset-toggle">
            <input type="checkbox" ${enabled ? "checked" : ""} data-toggle-user-asset="${sym}">
          </label>
          <button class="btn btn-secondary user-asset-delete" data-delete-user-asset="${sym}" aria-label="Supprimer ${sym}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>`;
  }

  function renderAddAssetForm() {
    const f = state.addAssetForm;
    return `
      <div class="add-asset-form" style="margin-top:12px">
        <div class="add-asset-grid">
          <input class="input" type="text" placeholder="Symbole (ex. XRP)" data-asset-symbol value="${safeText(f.symbol)}" maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false">
          <select class="select" data-asset-class>
            <option value="crypto" ${f.assetClass === "crypto" ? "selected" : ""}>Crypto</option>
            <option value="stock" ${f.assetClass === "stock" ? "selected" : ""}>Action</option>
            <option value="etf" ${f.assetClass === "etf" ? "selected" : ""}>ETF</option>
            <option value="forex" ${f.assetClass === "forex" ? "selected" : ""}>Forex</option>
            <option value="commodity" ${f.assetClass === "commodity" ? "selected" : ""}>Matière première</option>
          </select>
        </div>
        <input class="input" type="text" placeholder="Nom (optionnel, ex. XRP Ledger)" data-asset-name value="${safeText(f.name)}" maxlength="100" style="margin-top:8px;width:100%">
        ${f.error ? `<div class="error-box" style="margin-top:8px">${safeText(f.error)}</div>` : ""}
        <div class="add-asset-actions" style="margin-top:10px">
          <button class="btn" data-cancel-add-asset ${f.loading ? "disabled" : ""}>Annuler</button>
          <button class="btn btn-primary" data-submit-add-asset ${f.loading ? "disabled" : ""}>${f.loading ? "Validation…" : "Ajouter"}</button>
        </div>
      </div>`;
  }

  function renderBotEventRow(ev) {
    const t = new Date(ev.at || 0);
    const time = isNaN(t.getTime()) ? "—" : t.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const type = ev.type || "event";
    const payload = ev.payload || {};
    let summary = "";
    let badgeClass = "neutral";
    if (type === "cycle_completed") {
      const o = payload.opened_count || 0, c = payload.closed_count || 0, s = payload.skipped_count || 0, er = payload.error_count || 0;
      summary = `Cycle — ouvert ${o} · fermé ${c} · ignoré ${s}${er ? ` · erreurs ${er}` : ""}`;
      badgeClass = o > 0 ? "positive" : c > 0 ? "neutral" : "neutral";
    } else if (type === "trade_opened") {
      summary = `Ouverture ${safeText(ev.symbol || "")} @ ${priceDisplay(payload.entry_price)} · stop ${priceDisplay(payload.stop_loss)} · cible ${priceDisplay(payload.take_profit)}`;
      badgeClass = "long";
    } else if (type === "trade_closed") {
      const pnlPct = Number(payload.pnl_pct || 0);
      summary = `Clôture ${safeText(ev.symbol || "")} — ${payload.close_type || "exit"} · P&L ${pct(pnlPct)}`;
      badgeClass = pnlPct > 0 ? "positive" : pnlPct < 0 ? "negative" : "neutral";
    } else if (type === "settings_updated") {
      summary = "Paramètres modifiés";
    } else {
      summary = `${type}${ev.symbol ? ` · ${safeText(ev.symbol)}` : ""}`;
    }
    return `
      <div class="bot-event-row">
        <div class="bot-event-time">${safeText(time)}</div>
        <div class="bot-event-summary">${summary}</div>
        ${badge(type.replace(/_/g, " "), badgeClass)}
      </div>`;
  }

  function renderBotBreakdownRow(label, wr, count, pnl) {
    const wrText = wr == null ? "—" : `${Math.round(wr * 100)}%`;
    const pnlCls = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "";
    return `
      <div class="bot-breakdown-row">
        <div class="bot-breakdown-label">${safeText(label)}</div>
        <div class="bot-breakdown-count">${count} trades</div>
        <div class="bot-breakdown-wr">${wrText}</div>
        <div class="bot-breakdown-pnl ${pnlCls}">${priceDisplay(pnl)}</div>
      </div>`;
  }

  function renderHealth() {
    // PR #4 Phase 1 — onglet Santé du bot
    const adjustments = state.health.adjustments || [];
    const bucketStats = state.health.bucketStats || [];
    const byStatus = {
      shadow:   adjustments.filter(a => a.status === "shadow"),
      active:   adjustments.filter(a => a.status === "active"),
      rollback: adjustments.filter(a => a.status === "rollback")
    };
    const driftActive = byStatus.shadow.filter(a => a.adjustment_type === "drift_alert");

    const severityLabel = (s) => s === "severe" ? "grave" : s === "moderate" ? "moyen" : s === "light" ? "léger" : "";
    const statusLabel = (s) => s === "shadow" ? "en observation" : s === "active" ? "actif" : s === "rollback" ? "annulé" : s;
    // PR #6 Phase 2 — libellés des 6 règles de correction
    const typeLabel = (t) => ({
      drift_alert: "drift detecté",
      raise_min_score: "seuil rehaussé +5",
      disable_bucket: "bucket désactivé",
      widen_stop: "stop élargi (proposition)",
      extend_tp: "TP étendu (proposition)",
      reduce_size: "taille ×0.5",
      restore_size: "taille normale"
    })[t] || t;

    const adjRow = (a) => {
      // PR #6 Phase 2 — progression observation X/20 pour les shadows non-drift
      let progressBadge = "";
      if (a.status === "shadow" && a.adjustment_type !== "drift_alert") {
        const observed = Number(a.shadow_trades_observed || 0);
        const target = a.adjustment_type === "reduce_size" ? 1 : 20;
        progressBadge = `<span class="health-adj-progress">${observed}/${target}</span>`;
      }
      return `
      <div class="health-adj-row ${a.severity || ""} status-${a.status}">
        <div class="health-adj-head">
          <span class="health-adj-type">${safeText(typeLabel(a.adjustment_type))}</span>
          ${a.severity ? `<span class="health-adj-severity ${a.severity}">${safeText(severityLabel(a.severity))}</span>` : ""}
          <span class="health-adj-status">${safeText(statusLabel(a.status))}</span>
          ${progressBadge}
        </div>
        ${a.bucket_key ? `<div class="health-adj-bucket">${safeText(a.bucket_key)}</div>` : ""}
        ${a.notes ? `<div class="health-adj-notes">${safeText(a.notes)}</div>` : ""}
        ${a.rollback_reason ? `<div class="health-adj-notes muted">Rollback : ${safeText(a.rollback_reason)}</div>` : ""}
        <div class="health-adj-date muted">${safeText(new Date(a.created_at).toLocaleString("fr-FR"))}</div>
      </div>`;
    };

    // PR #6 Phase 2 — carte résumé des règles actives qui touchent le moteur
    const activeAdjustments = byStatus.active.filter(a => a.adjustment_type !== "drift_alert");
    const activeSummary = () => {
      if (!activeAdjustments.length) return `<div class="muted">Aucune règle active. Le moteur tourne sur sa configuration par défaut.</div>`;
      const lines = [];
      const disabled = activeAdjustments.filter(a => a.adjustment_type === "disable_bucket");
      const raises = activeAdjustments.filter(a => a.adjustment_type === "raise_min_score");
      const reduces = activeAdjustments.filter(a => a.adjustment_type === "reduce_size");
      const widens = activeAdjustments.filter(a => a.adjustment_type === "widen_stop");
      const extends_ = activeAdjustments.filter(a => a.adjustment_type === "extend_tp");
      if (disabled.length) lines.push(`<div class="health-active-line"><strong>${disabled.length} bucket(s) désactivé(s)</strong> — entrées bloquées : ${disabled.map(a => `<code>${safeText(a.bucket_key)}</code>`).join(", ")}</div>`);
      if (raises.length)   lines.push(`<div class="health-active-line"><strong>${raises.length} seuil(s) rehaussé(s) de +5 pts</strong> — sur ${raises.map(a => `<code>${safeText(a.bucket_key)}</code>`).join(", ")}</div>`);
      if (reduces.length)  lines.push(`<div class="health-active-line"><strong>Taille de position réduite</strong> — multiplicateur ${reduces[0]?.new_value?.size_mult || 0.5} (rollback auto au 1er 3-gains consécutifs)</div>`);
      if (widens.length)   lines.push(`<div class="health-active-line muted"><strong>${widens.length} proposition(s) stop élargi</strong> — non appliquée(s) en PR #6, observation seulement</div>`);
      if (extends_.length) lines.push(`<div class="health-active-line muted"><strong>${extends_.length} proposition(s) TP étendu</strong> — non appliquée(s) en PR #6, observation seulement</div>`);
      return lines.join("");
    };

    const bucketRow = (b) => {
      const hist = Number(b.historical?.winRate || 0);
      const recent = Number(b.recent30?.winRate || 0);
      const delta = recent - hist;
      const deltaTone = delta < -0.15 ? "negative" : delta < -0.05 ? "warn" : "neutral";
      return `
        <div class="health-bucket-row ${deltaTone}">
          <div class="health-bucket-key">${safeText(b.bucketKey)}</div>
          <div class="health-bucket-stats">
            <span>${b.historical?.n || 0} trades historiques · ${(hist * 100).toFixed(0)}%</span>
            <span>${b.recent30?.n || 0} récents · ${(recent * 100).toFixed(0)}%</span>
            <span class="health-bucket-delta ${deltaTone}">${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts</span>
          </div>
        </div>`;
    };

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Santé du bot</div>
          <div class="screen-subtitle">PR #6 Phase 2 — apprentissage + corrections. Shadow → 20 trades observés → active ou rollback auto.</div>
        </div>

        ${state.health.error ? `<div class="error-box" style="margin-bottom:14px">${safeText(state.health.error)}</div>` : ""}
        ${state.health.loading && adjustments.length === 0 ? `<div class="loading-state">Chargement…</div>` : ""}

        <div class="grid trades-stats" style="margin-bottom:18px">
          <div class="stat-card">
            <div class="stat-label">Alertes drift actives</div>
            <div class="stat-value ${driftActive.length ? "negative" : ""}">${driftActive.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ajustements en observation</div>
            <div class="stat-value">${byStatus.shadow.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Règles actives</div>
            <div class="stat-value ${activeAdjustments.length ? "positive" : ""}">${activeAdjustments.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Annulés (rollback)</div>
            <div class="stat-value">${byStatus.rollback.length}</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="section-title"><span>Règles actives qui impactent le moteur</span><span>${activeAdjustments.length}</span></div>
          ${activeSummary()}
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="section-title"><span>Alertes drift</span><span>${driftActive.length}</span></div>
          ${driftActive.length ? driftActive.map(adjRow).join("") : `<div class="muted">Aucune alerte drift. Les setups performent dans les normes historiques.</div>`}
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="section-title"><span>Historique des ajustements</span><span>${adjustments.length}</span></div>
          ${adjustments.length
            ? adjustments.slice(0, 30).map(adjRow).join("")
            : `<div class="muted">Aucun ajustement enregistré pour l'instant. Le bot applique encore sa configuration initiale.</div>`}
        </div>

        <div class="card">
          <div class="section-title"><span>Performance par bucket</span><span>${bucketStats.length}</span></div>
          ${bucketStats.length
            ? bucketStats.sort((a, b) => (b.historical?.n || 0) - (a.historical?.n || 0)).map(bucketRow).join("")
            : `<div class="muted">Pas encore de données. Le bot doit clôturer des trades pour alimenter les buckets.</div>`}
        </div>
      </div>`;
  }

  // PR #9 Phase 2 — rendu très léger du markdown (headings, bullets, gras).
  // Volontairement minimaliste pour ne pas ajouter de lib ; Claude produit un
  // markdown prévisible.
  function renderMarkdown(md) {
    if (!md) return "";
    let html = safeText(md);
    // Headings
    html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic (simple)
    html = html.replace(/(^|\s)_(.+?)_(\s|$)/g, '$1<em>$2</em>$3');
    // Bullets
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>[\s\S]+?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, "");
    // Paragraphs : lignes restantes non-tagged
    html = html.split(/\n{2,}/).map(chunk => {
      if (/^\s*<(h2|h3|h4|ul|li)/i.test(chunk)) return chunk;
      return chunk.trim() ? `<p>${chunk.replace(/\n/g, '<br>')}</p>` : "";
    }).join("\n");
    return html;
  }

  function renderReports() {
    const reports = state.reports.list || [];
    const openId = state.reports.openId;
    const loading = state.reports.loading;
    const err = state.reports.error;

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";
    const reportCard = (r) => {
      const isOpen = r.id === openId;
      const stats = r.stats_snapshot?.trades || {};
      const statusBadge = r.status === "failed"
        ? `<span class="mod-chip negative">échec</span>`
        : r.status === "archived"
        ? `<span class="mod-chip neutral">archivé</span>`
        : "";
      const pnl = Number(stats.totalPnl || 0);
      const pnlTone = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
      return `
        <div class="report-card ${isOpen ? "is-open" : ""}" data-report-toggle="${r.id}">
          <div class="report-head">
            <div>
              <div class="report-title">Semaine ${formatDate(r.week_start)} → ${formatDate(r.week_end)}</div>
              <div class="report-meta">${Number(stats.total) || 0} trades · ${stats.winRate != null ? Math.round(Number(stats.winRate) * 100) + "% win" : "—"} · <span class="${pnlTone}">${money(pnl, "USD")}</span>${r.corrections_applied ? ` · ${Number(r.corrections_applied) || 0} corr.` : ""} ${statusBadge}</div>
            </div>
            <svg class="report-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${isOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}"/></svg>
          </div>
          ${isOpen ? `
            <div class="report-body">
              ${r.status === "failed" ? `<div class="error-box">${safeText(r.error_message || "Échec de génération")}</div>` : ""}
              <div class="report-markdown">${renderMarkdown(r.report_markdown || "")}</div>
              ${r.claude_model ? `<div class="report-footer muted">${safeText(r.claude_model)} · ${Number(r.claude_tokens_output) || "?"} tokens · ${Number(r.generation_duration_ms) || "?"}ms</div>` : ""}
            </div>
          ` : ""}
        </div>`;
    };

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Rapports hebdomadaires</div>
          <div class="screen-subtitle">Analyse automatique par Claude Sonnet tous les lundis 6h UTC. Force une génération pour rattraper une semaine manquée.</div>
        </div>
        ${err ? `<div class="error-box" style="margin-bottom:14px">${safeText(err)}</div>` : ""}
        <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-generate-report ${state.reports.generating ? "disabled" : ""}>
            ${state.reports.generating ? "Génération en cours…" : "Forcer génération semaine dernière"}
          </button>
          <button class="btn btn-secondary" data-reload-reports ${loading ? "disabled" : ""}>
            ${loading ? "Chargement…" : "Rafraîchir"}
          </button>
        </div>
        ${loading && reports.length === 0 ? `<div class="loading-state">Chargement…</div>` : ""}
        ${!loading && reports.length === 0 ? `<div class="empty-state" style="padding:24px">Aucun rapport généré pour l'instant. Le premier tombera lundi prochain à 6h UTC, ou force-le maintenant.</div>` : ""}
        <div class="reports-list">
          ${reports.map(reportCard).join("")}
        </div>
      </div>`;
  }

  function renderBot() {
    if (!isSessionValid()) {
      return `
        <div class="screen">
          <div class="screen-header">
            <div class="screen-title">Bot d'entrainement</div>
            <div class="screen-subtitle">Paper trading auto — le bot tente des positions sur capital virtuel pour collecter des données.</div>
          </div>
          <div class="info-box">Connecte-toi avec ton PIN pour accéder au bot.</div>
        </div>`;
    }

    const acc = state.bot.account;
    const settings = acc?.settings || {};
    const enabled = !!settings.is_enabled;
    const autoOpen = settings.auto_open_enabled !== false;
    const autoClose = settings.auto_close_enabled !== false;
    const openCount = Number(acc?.openCount || 0);
    const maxOpen = Number(settings.max_open_positions || 10);
    const capitalBase = Number(acc?.capitalBase || settings.capital_base || 0);
    const available = Number(acc?.available || 0);
    const realized = Number(acc?.realized || 0);
    const equity = Number(acc?.equity || 0);
    const riskState = acc?.riskState || null;
    const riskBlocked = !!(riskState && riskState.tradingEnabled === false);
    const stats = state.bot.stats;
    const events = state.bot.events || [];

    // Dernier cycle scheduled (PR #1 Phase 1 — cron autonome Cloudflare)
    const lastCycleAt = settings.last_cycle_at || null;
    const lastCycleMode = settings.last_cycle_mode || null;
    const lastCycleSummary = settings.last_cycle_summary || null;
    const lastCycleMsRaw = lastCycleAt ? new Date(lastCycleAt).getTime() : null;
    const lastCycleMs = Number.isFinite(lastCycleMsRaw) ? lastCycleMsRaw : null;
    const minutesSinceLastCycle = lastCycleMs != null ? Math.max(0, Math.round((Date.now() - lastCycleMs) / 60000)) : null;
    const cycleFreshness = minutesSinceLastCycle == null
      ? "none"
      : (minutesSinceLastCycle <= 30 ? "fresh" : (minutesSinceLastCycle <= 120 ? "stale" : "cold"));
    const cycleModeLabel = lastCycleMode === "crypto+actions" ? "crypto + actions"
      : lastCycleMode === "crypto-only" ? "crypto only"
      : lastCycleMode === "skipped-night" ? "pause nuit"
      : lastCycleMode || "—";
    const lastCycleText = lastCycleAt
      ? `Dernier cycle ${minutesSinceLastCycle < 1 ? "à l'instant" : `il y a ${minutesSinceLastCycle} min`} · ${cycleModeLabel}`
      : "Aucun cycle enregistré pour l'instant";

    const blockerText = riskBlocked && Array.isArray(riskState?.blockers)
      ? riskState.blockers.map(b => typeof b === "string" ? b : (b?.message || b?.code || "")).filter(Boolean).join(" · ")
      : "";

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Bot d'entrainement</div>
          <div class="screen-subtitle">Paper trading auto — le bot tente des positions sur capital virtuel pour collecter des données et apprendre.</div>
        </div>

        ${state.bot.error ? `<div class="error-box" style="margin-bottom:14px">${safeText(state.bot.error)}</div>` : ""}
        ${state.bot.loading && !acc ? `<div class="loading-state" style="margin-bottom:14px">Chargement du bot…</div>` : ""}

        <!-- Carte contrôle -->
        <div class="card bot-control-card ${enabled ? "is-on" : "is-off"}">
          <div class="bot-status-row">
            <div>
              <div class="bot-status-label">État du bot</div>
              <div class="bot-status-value ${enabled ? "on" : "off"}">
                ${enabled ? "● Actif — cycles 15 min" : "○ Désactivé — aucun trade"}
              </div>
              <div class="bot-cycle-sub ${cycleFreshness}">${safeText(lastCycleText)}</div>
            </div>
            <label class="bot-toggle-big">
              <input type="checkbox" data-bot-toggle="is_enabled" ${enabled ? "checked" : ""}>
              <span class="bot-toggle-slider"></span>
            </label>
          </div>

          <div class="bot-stats-row">
            <div class="bot-stat">
              <div class="stat-label">Positions</div>
              <div class="stat-value">${openCount}/${maxOpen}</div>
            </div>
            <div class="bot-stat">
              <div class="stat-label">Capital dispo</div>
              <div class="stat-value">${priceDisplay(available)}</div>
            </div>
            <div class="bot-stat">
              <div class="stat-label">P&L réalisé</div>
              <div class="stat-value ${realized > 0 ? "positive" : realized < 0 ? "negative" : ""}">${priceDisplay(realized)}</div>
            </div>
            <div class="bot-stat">
              <div class="stat-label">Equity</div>
              <div class="stat-value">${priceDisplay(equity)}</div>
            </div>
          </div>

          ${riskBlocked ? `
            <div class="bot-risk-warn">
              Trading bloqué par risk state : ${safeText(blockerText || "limite dépassée")}.
            </div>` : ""}

          <div class="bot-sub-toggles">
            <label class="bot-sub-toggle">
              <input type="checkbox" data-bot-toggle="auto_open_enabled" ${autoOpen ? "checked" : ""}>
              <span>Ouvertures auto</span>
            </label>
            <label class="bot-sub-toggle">
              <input type="checkbox" data-bot-toggle="auto_close_enabled" ${autoClose ? "checked" : ""}>
              <span>Fermetures auto</span>
            </label>
          </div>

          <div class="bot-actions">
            <button class="btn btn-primary" data-bot-force-cycle ${state.bot.forcingCycle ? "disabled" : ""}>
              ${state.bot.forcingCycle ? "Cycle en cours…" : "Lancer un cycle maintenant"}
            </button>
            <button class="btn btn-secondary" data-bot-reload>Actualiser</button>
          </div>
        </div>

        <!-- Apprentissage / Stats -->
        ${stats && stats.totalCount > 0 ? `
          <div class="card" style="margin-top:16px">
            <div class="section-title"><span>Apprentissage</span><span>${stats.totalCount} trades clôturés</span></div>
            <div class="bot-kpi-grid">
              <div class="stat-card">
                <div class="stat-label">Win rate</div>
                <div class="stat-value">${stats.winRate == null ? "—" : Math.round(stats.winRate * 100) + "%"}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">P&L total</div>
                <div class="stat-value ${stats.totalPnl > 0 ? "positive" : stats.totalPnl < 0 ? "negative" : ""}">${priceDisplay(stats.totalPnl)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Espérance</div>
                <div class="stat-value ${stats.expectancy > 0 ? "positive" : stats.expectancy < 0 ? "negative" : ""}">${stats.expectancy == null ? "—" : priceDisplay(stats.expectancy)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">R:R réel</div>
                <div class="stat-value">${stats.rrActual == null ? "—" : num(stats.rrActual, 2)}</div>
              </div>
            </div>

            ${Array.isArray(stats.bySetup) && stats.bySetup.length ? `
              <div class="section-title" style="margin-top:18px"><span>Par setup</span></div>
              <div class="bot-breakdown">
                <div class="bot-breakdown-row bot-breakdown-head">
                  <div class="bot-breakdown-label">Setup</div>
                  <div class="bot-breakdown-count">N</div>
                  <div class="bot-breakdown-wr">WR</div>
                  <div class="bot-breakdown-pnl">P&L</div>
                </div>
                ${stats.bySetup.map(s => renderBotBreakdownRow(s.setup || "autre", s.winRate, s.count, s.pnl)).join("")}
              </div>
            ` : ""}

            ${Array.isArray(stats.byClass) && stats.byClass.length ? `
              <div class="section-title" style="margin-top:18px"><span>Par classe d'actif</span></div>
              <div class="bot-breakdown">
                <div class="bot-breakdown-row bot-breakdown-head">
                  <div class="bot-breakdown-label">Classe</div>
                  <div class="bot-breakdown-count">N</div>
                  <div class="bot-breakdown-wr">WR</div>
                  <div class="bot-breakdown-pnl">P&L</div>
                </div>
                ${stats.byClass.map(c => renderBotBreakdownRow(c.class || "—", c.winRate, c.count, c.pnl)).join("")}
              </div>
            ` : ""}

            ${Array.isArray(stats.topSymbols) && stats.topSymbols.length ? `
              <div class="section-title" style="margin-top:18px"><span>Top 5 rentables</span></div>
              <div class="bot-breakdown">
                ${stats.topSymbols.map(s => renderBotBreakdownRow(s.symbol, s.count > 0 ? s.wins / s.count : null, s.count, s.pnl)).join("")}
              </div>
            ` : ""}

            ${Array.isArray(stats.bottomSymbols) && stats.bottomSymbols.length ? `
              <div class="section-title" style="margin-top:18px"><span>À surveiller (perdants)</span></div>
              <div class="bot-breakdown">
                ${stats.bottomSymbols.map(s => renderBotBreakdownRow(s.symbol, s.count > 0 ? s.wins / s.count : null, s.count, s.pnl)).join("")}
              </div>
            ` : ""}
          </div>
        ` : (acc ? `<div class="card" style="margin-top:16px"><div class="empty-state">Aucun trade clôturé. Active le bot et laisse tourner quelques cycles.</div></div>` : "")}

        <!-- Timeline -->
        <div class="card" style="margin-top:16px">
          <div class="section-title"><span>Dernière activité</span><span>${events.length} événements</span></div>
          ${events.length ? `<div class="bot-timeline">${events.map(renderBotEventRow).join("")}</div>` : `<div class="empty-state">Aucun événement pour l'instant.</div>`}
        </div>

        <!-- Paramètres avancés — éditables -->
        <div class="card" style="margin-top:16px">
          <div class="section-title"><span>Paramètres du bot</span><span class="muted">${state.bot.editDraft ? "édition" : "lecture"}</span></div>
          ${state.bot.editDraft ? renderBotParamsForm() : renderBotParamsReadonly(settings, capitalBase)}
        </div>
      </div>`;
  }

  function renderBotParamsReadonly(settings, capitalBase) {
    return `
      <div class="bot-params" style="margin-top:8px">
        <div class="kv">
          <div class="muted">Capital base</div><div>${priceDisplay(capitalBase)}</div>
          <div class="muted">Risk par trade</div><div>${Math.round((settings.risk_per_trade_pct || 0) * 100)}%</div>
          <div class="muted">Allocation par trade</div><div>${Math.round((settings.allocation_per_trade_pct || 0) * 100)}%</div>
          <div class="muted">Max positions</div><div>${settings.max_open_positions || 10}</div>
          <div class="muted">Max / symbole</div><div>${settings.max_positions_per_symbol || 1}</div>
          <div class="muted">Horizon max</div><div>${settings.max_holding_hours || 240} h</div>
          <div class="muted">Score actionabilité min</div><div>${settings.min_actionability_score ?? 60}</div>
          <div class="muted">Score dossier min</div><div>${settings.min_dossier_score ?? 60}</div>
          <div class="muted">Setups autorisés</div><div>${Array.isArray(settings.allowed_setups) ? settings.allowed_setups.join(", ") : "—"}</div>
          <div class="muted">Long / Short</div><div>${settings.allow_long ? "Long" : ""}${settings.allow_long && settings.allow_short ? " + " : ""}${settings.allow_short ? "Short" : ""}${!settings.allow_long && !settings.allow_short ? "—" : ""}</div>
          <div class="muted">Mean reversion</div><div>${settings.mean_reversion_enabled ? "Oui" : "Non"}</div>
          <div class="muted">Daily loss max</div><div>${Math.round((settings.max_daily_loss_pct || 0) * 100)}%</div>
          <div class="muted">Weekly loss max</div><div>${(settings.max_weekly_loss_pct || 0) >= 1 ? "désactivé" : Math.round((settings.max_weekly_loss_pct || 0) * 100) + "%"}</div>
          <div class="muted">Pertes conséc. max</div><div>${(settings.max_consecutive_losses || 0) >= 100 ? "désactivé" : (settings.max_consecutive_losses || 3)}</div>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-edit-open>Éditer</button>
          <button class="btn btn-secondary" data-bot-preset-training>Mode entraînement permissif</button>
        </div>
      </div>`;
  }

  function renderBotParamsForm() {
    const d = state.bot.editDraft || {};
    const allowedSetupsAll = ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short", "mean_reversion"];
    const currentSetups = Array.isArray(d.allowed_setups) ? d.allowed_setups : ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short"];
    return `
      <div class="bot-params-form" style="margin-top:8px">
        <div class="bot-field-grid">
          <label class="bot-field"><span>Capital base ($)</span><input type="number" inputmode="decimal" min="100" step="100" data-bot-field="capital_base" value="${Number(d.capital_base || 10000)}"></label>
          <label class="bot-field"><span>Risk / trade (%)</span><input type="number" inputmode="decimal" min="0.1" max="20" step="0.1" data-bot-field="risk_per_trade_pct_display" value="${(Number(d.risk_per_trade_pct || 0.02) * 100).toFixed(1)}"></label>
          <label class="bot-field"><span>Allocation / trade (%)</span><input type="number" inputmode="decimal" min="1" max="100" step="1" data-bot-field="allocation_per_trade_pct_display" value="${Math.round(Number(d.allocation_per_trade_pct || 0.08) * 100)}"></label>
          <label class="bot-field"><span>Max positions</span><input type="number" inputmode="numeric" min="1" max="50" step="1" data-bot-field="max_open_positions" value="${Number(d.max_open_positions || 15)}"></label>
          <label class="bot-field"><span>Max / symbole</span><input type="number" inputmode="numeric" min="1" max="10" step="1" data-bot-field="max_positions_per_symbol" value="${Number(d.max_positions_per_symbol || 1)}"></label>
          <label class="bot-field"><span>Horizon max (h)</span><input type="number" inputmode="numeric" min="1" max="1000" step="1" data-bot-field="max_holding_hours" value="${Number(d.max_holding_hours || 240)}"></label>
          <label class="bot-field"><span>Score actionabilité min</span><input type="number" inputmode="numeric" min="0" max="100" step="1" data-bot-field="min_actionability_score" value="${Number(d.min_actionability_score ?? 60)}"></label>
          <label class="bot-field"><span>Score dossier min</span><input type="number" inputmode="numeric" min="0" max="100" step="1" data-bot-field="min_dossier_score" value="${Number(d.min_dossier_score ?? 60)}"></label>
          <label class="bot-field"><span>Daily loss max (%)</span><input type="number" inputmode="decimal" min="1" max="100" step="1" data-bot-field="max_daily_loss_pct_display" value="${Math.round(Number(d.max_daily_loss_pct || 0.30) * 100)}"></label>
          <label class="bot-field"><span>Weekly loss max (%) — 100 = OFF</span><input type="number" inputmode="decimal" min="1" max="100" step="1" data-bot-field="max_weekly_loss_pct_display" value="${Math.round(Number(d.max_weekly_loss_pct || 1.0) * 100)}"></label>
          <label class="bot-field"><span>Pertes conséc. max — 999 = OFF</span><input type="number" inputmode="numeric" min="1" max="999" step="1" data-bot-field="max_consecutive_losses" value="${Number(d.max_consecutive_losses || 999)}"></label>
        </div>
        <div class="bot-field-toggles">
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="allow_long" ${d.allow_long ? "checked" : ""}><span>Long autorisé</span></label>
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="allow_short" ${d.allow_short ? "checked" : ""}><span>Short autorisé</span></label>
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="mean_reversion_enabled" ${d.mean_reversion_enabled ? "checked" : ""}><span>Mean reversion</span></label>
        </div>
        <div class="bot-field-setups">
          <div class="muted" style="font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Setups autorisés</div>
          <div class="bot-setups-row">
            ${allowedSetupsAll.map(s => `
              <label class="bot-sub-toggle"><input type="checkbox" data-bot-field-setup="${s}" ${currentSetups.includes(s) ? "checked" : ""}><span>${s}</span></label>
            `).join("")}
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-edit-save ${state.bot.savingDraft ? "disabled" : ""}>${state.bot.savingDraft ? "Enregistrement…" : "Enregistrer"}</button>
          <button class="btn" data-bot-edit-cancel>Annuler</button>
          <button class="btn btn-secondary" data-bot-preset-training>Mode entraînement permissif</button>
        </div>
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
                <div class="setting-desc">Recharge automatiquement la liste quand le delai minimum Twelve est termine.</div>
              </div>
              <input type="checkbox" data-setting-toggle="autoRefreshOpportunities" ${state.settings.autoRefreshOpportunities ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Scan auto — intervalle</div>
                <div class="setting-desc">Frequence de relance automatique du scan des opportunites.</div>
              </div>
              <select class="setting-select" data-setting-select="autoScanIntervalMin">
                <option value="3" ${Number(state.settings.autoScanIntervalMin) === 3 ? "selected" : ""}>3 min</option>
                <option value="5" ${Number(state.settings.autoScanIntervalMin) === 5 || !state.settings.autoScanIntervalMin ? "selected" : ""}>5 min</option>
                <option value="10" ${Number(state.settings.autoScanIntervalMin) === 10 ? "selected" : ""}>10 min</option>
                <option value="15" ${Number(state.settings.autoScanIntervalMin) === 15 ? "selected" : ""}>15 min</option>
              </select>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Alertes signaux algo</div>
                <div class="setting-desc">Notif push quand un actif passe en "Trade propose" apres un scan.</div>
              </div>
              <input type="checkbox" data-setting-toggle="algoSignalNotifs" ${state.settings.algoSignalNotifs ? "checked" : ""}>
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
                <div class="setting-title">Suivre le theme systeme</div>
                <div class="setting-desc">L'app bascule automatiquement clair/sombre selon ton iPhone.</div>
              </div>
              <input type="checkbox" data-setting-toggle="autoTheme" ${state.settings.autoTheme ? "checked" : ""}>
            </label>

            <label class="setting-row ${state.settings.autoTheme ? "setting-row--disabled" : ""}">
              <div>
                <div class="setting-title">Activer le theme clair</div>
                <div class="setting-desc">${state.settings.autoTheme ? "Suivi systeme actif — ce reglage est ignore." : "Passe l'app sur un rendu clair, plus doux en journee."}</div>
              </div>
              <input type="checkbox" data-setting-toggle="lightTheme" ${state.settings.autoTheme ? "disabled" : ""} ${state.settings.lightTheme ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher le journal moteur</div>
                <div class="setting-desc">Montre les dernieres decisions du moteur dans l'accueil et Mes trades.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showAlgoJournal" ${state.settings.showAlgoJournal ? "checked" : ""}>
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

        <div class="card" style="margin-top:16px">
          <div class="section-title"><span>Actifs surveillés</span><span>${state.userAssets.length}/50 custom</span></div>
          <div class="setting-desc" style="margin-bottom:12px">
            Ajoute tes propres actifs (crypto, actions, ETF…) au scan du bot. Les 35 actifs de base restent toujours inclus.
          </div>
          ${!isSessionValid() ? `
            <div class="info-box">Connecte-toi avec ton PIN pour gérer les actifs personnalisés.</div>
          ` : `
            ${state.userAssetsError ? `<div class="error-box" style="margin-bottom:10px">${safeText(state.userAssetsError)}</div>` : ""}
            ${state.userAssetsLoading ? `<div class="muted">Chargement…</div>` : ""}
            ${state.userAssets.length ? `
              <div class="user-assets-list">
                ${state.userAssets.map(a => renderUserAssetRow(a)).join("")}
              </div>
            ` : !state.userAssetsLoading && !state.userAssetsError ? `<div class="empty-state" style="padding:18px">Aucun actif personnalisé. Clique sur "Ajouter" ci-dessous.</div>` : ""}
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
              ${state.addAssetForm.open ? "" : `<button class="btn btn-primary" data-open-add-asset>+ Ajouter un actif</button>`}
              <button class="btn btn-secondary" data-load-user-assets>Recharger</button>
            </div>
            ${state.addAssetForm.open ? renderAddAssetForm() : ""}
          `}
        </div>

        <div class="card" style="margin-top:16px">
          <div class="section-title">Supabase trades</div>
          <div class="setting-list">
            <div class="setting-row">
              <div>
                <div class="setting-title">Connexion automatique via Worker Cloudflare</div>
                <div class="setting-desc">Les trades passent maintenant par le Worker. Tu n'as plus besoin de saisir l'URL ni la cle Supabase dans l'app.</div>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-title">Etat distant</div>
                <div class="setting-desc">${safeText(remoteStatusText())}</div>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-title">Session Worker</div>
                <div class="setting-desc">${isSessionValid()
                  ? `connecte · expire le ${new Date(state.session.expiresAt * 1000).toLocaleString("fr-FR")}`
                  : "aucune session active"}</div>
              </div>
              ${isSessionValid()
                ? `<button class="btn btn-secondary" data-session-logout style="min-width:90px">Deconnecter</button>`
                : `<button class="btn btn-primary" data-open-pin style="min-width:90px">Se connecter</button>`}
            </div>
            <div class="muted">Secrets attendus dans Cloudflare : SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_API_TOKEN et ADMIN_PIN pour activer la protection complete.</div>
          </div>
        </div>
      </div>`;
  }

  



function renderMain() {
    switch (state.route) {
      case "dashboard": return renderDashboard();
      case "opportunities": return renderOpportunities();
      case "news": return renderNews();
      case "asset-detail": return renderDetail();
      case "portfolio": return renderPortfolio();
      case "performance": return renderPerformance();
      case "alerts": return renderAlerts();
      case "settings": return renderSettings();
      case "bot": return renderBot();
      case "health": return renderHealth();
      case "reports": return renderReports();
      default: return renderDashboard();
    }
  }

  function prefersSystemLight() {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
  }

  function effectiveLightTheme() {
    if (state.settings.autoTheme) return prefersSystemLight();
    return !!state.settings.lightTheme;
  }

  function applyThemeMode() {
    const isLight = effectiveLightTheme();
    document.documentElement.classList.toggle("theme-light-root", isLight);
    document.body.classList.toggle("theme-light-root", isLight);
    // P2.15: theme-color meta dynamique → status bar iOS suit le thème
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#f4f7fb" : "#0a0e1a");
  }

  function syncOpportunityScoreDisplay() {
    const rows = Array.from(app.querySelectorAll(".opp-row[data-symbol]"));
    const items = Array.isArray(state.opportunities) ? state.opportunities : [];
    rows.forEach((row) => {
      const symbol = String(row.getAttribute("data-symbol") || "").toUpperCase();
      const item = items.find((entry) => String(entry?.symbol || "").toUpperCase() === symbol);
      if (!item) return;
      const notes = row.querySelectorAll(".opp-note");
      if (notes[1]) {
        notes[1].textContent = shortBlockerLabel(rowTradePlan(item) || {}, item);
      }
    });
  }

  function syncDetailScoreDisplay() {
    if (state.route !== "asset-detail" || !state.detail) return;
    const card = app.querySelector(".conclusion-card");
    if (!card) return;

    const locked = lockDetailToOfficialRow(state.detail);
    const source = currentTradePlan() || locked || state.detail;
    if (!source) return;

    const primaryScore = safetyScoreFrom(source) ?? dossierScoreFrom(source) ?? actionabilityScoreFrom(source);
    const primaryTone = safetyTone(primaryScore, source);
    const actionScore = actionabilityScoreFrom(source);
    const primaryLabel = safetyLabel(primaryScore, source);

    const headerScore = card.querySelector(".section-title span:last-child");
    if (headerScore) {
      headerScore.textContent = `${primaryScore != null ? primaryScore : "-"}/100`;
    }

    const conclusionLines = Array.from(card.querySelectorAll(".conclusion-line"));
    const safetyLine = conclusionLines.find((line) => line.textContent.includes("Niveau"));
    if (safetyLine) {
      safetyLine.innerHTML = `Niveau de surete : <strong>${safeText(primaryLabel)}</strong>`;
    }

    const scoreBox = card.querySelector(".conclusion-score");
    if (scoreBox) {
      const secondaryLine = actionScore != null && actionScore !== primaryScore
        ? `exploitabilite ${actionScore}/100`
        : `niveau ${primaryLabel}`;
      scoreBox.innerHTML = `
        ${scoreRing(primaryScore, primaryTone)}
        <div class="muted" style="text-align:center; margin-top:8px;">${safeText(`surete ${primaryScore != null ? primaryScore : "-"}/100`)}</div>
        <div class="muted" style="text-align:center;">${safeText(secondaryLine)}</div>
      `;
    }
  }

  function syncDisplayedScores() {
    syncOpportunityScoreDisplay();
    syncDetailScoreDisplay();
  }

  function renderPinModal() {
    if (!state.session.pinOpen) return "";
    const err = state.session.pinError ? `<div class="pin-error">${safeText(state.session.pinError)}</div>` : "";
    const loading = state.session.pinLoading;
    return `
      <div class="modal-overlay" id="pin-overlay" data-close-modal="pin">
        <div class="modal-box pin-modal">
          <div class="modal-title">Connexion Worker</div>
          <div class="modal-desc">Entre ton PIN Cloudflare pour activer l'acces aux routes proteges (trades, IA).</div>
          ${err}
          <input class="setting-input pin-input" type="password" inputmode="numeric" pattern="[0-9]*" id="pin-input" placeholder="PIN" autocomplete="current-password" ${loading ? "disabled" : ""}>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-pin-cancel>Annuler</button>
            <button class="btn btn-primary" data-pin-submit ${loading ? "disabled" : ""}>${loading ? "Connexion..." : "Se connecter"}</button>
          </div>
        </div>
      </div>`;
  }

  async function handlePinLogin(pin) {
    state.session.pinLoading = true;
    state.session.pinError = null;
    render();
    try {
      const res = await fetch(`${API_BASE}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        state.session.pinError = data?.message || "PIN invalide";
        state.session.pinLoading = false;
        render();
        return;
      }
      state.session.token = data.token;
      state.session.expiresAt = Math.floor(Date.now() / 1000) + (data.expiresIn || 86400);
      state.session.pinOpen = false;
      state.session.pinLoading = false;
      state.session.pinError = null;
      persistSession();
      render();
    } catch (e) {
      state.session.pinError = "Erreur reseau";
      state.session.pinLoading = false;
      render();
    }
  }

  function render() {
    app.innerHTML = `
      <div class="app-shell ${state.settings.compactCards ? "compact-ui" : ""} ${effectiveLightTheme() ? "theme-light" : ""}">
        ${renderSidebar()}
        <main class="main-content">${renderMain()}</main>
        ${renderBottomNav()}
        ${renderChartFullscreen()}
        ${renderTradeConfirmModal()}
        ${renderPinModal()}
        ${renderAlertModal()}
        ${renderAlertToast()}
        ${shouldShowA2HSBanner() ? `
          <div class="a2hs-banner" role="note">
            <div class="a2hs-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>
            <div class="a2hs-text">Installe ManiTrade : <strong>Partager</strong> puis <strong>Ajouter à l'écran d'accueil</strong>.</div>
            <button class="a2hs-close" data-a2hs-dismiss aria-label="Fermer la bannière">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>` : ""}
      </div>
    `;
    if (!document.getElementById("ptr-indicator")) {
      app.insertAdjacentHTML("beforeend", '<div class="ptr-indicator" id="ptr-indicator"><div class="ptr-spinner"></div></div>');
    }
    applyThemeMode();
    bindEvents();
    syncDisplayedScores();
    const modalOpen = !!(state.tradeConfirm?.open || state.session?.pinOpen || state.alertModal?.open || state.chartFullscreen);
    document.documentElement.classList.toggle("has-modal", modalOpen);
    if (state.route === "asset-detail") requestAnimationFrame(initCandlestickChart);
  }

  function bindEvents() {
    app.querySelectorAll("[data-route]").forEach(el => {
      el.addEventListener("click", () => {
        const route = el.getAttribute("data-route");
        haptic(5);
        state.moreMenuOpen = false;
        const forceOppReload = route === "opportunities" && state.settings.autoRefreshOpportunities;
        navigate(route, null, { forceOppReload });
      });
    });

    app.querySelectorAll("[data-more-menu]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.moreMenuOpen = !state.moreMenuOpen;
        render();
      });
    });

    app.querySelectorAll("[data-close-more-menu]").forEach(el => {
      el.addEventListener("click", () => {
        state.moreMenuOpen = false;
        render();
      });
    });

    app.querySelectorAll("[data-filter]").forEach(el => {
      el.addEventListener("click", () => {
        state.opportunityFilter = el.getAttribute("data-filter");
        applyFilter();
        render();
      });
    });

    app.querySelectorAll("[data-direction-filter]").forEach(el => {
      el.addEventListener("click", () => {
        state.opportunityDirection = el.getAttribute("data-direction-filter");
        applyFilter();
        render();
      });
    });

    app.querySelectorAll("[data-refresh='opportunities']").forEach(el => {
      el.addEventListener("click", () => loadOpportunities(true));
    });

    app.querySelectorAll("[data-chart-fullscreen]").forEach(el => {
      el.addEventListener("click", () => {
        const mode = el.getAttribute("data-chart-fullscreen");
        if (mode === "open" && !state.chartFullscreen) {
          state.chartFullscreen = true;
          try { history.pushState({ route: state.route, symbol: state.selectedSymbol || null, chartFullscreen: true }, "", ""); } catch {}
          render();
          requestAnimationFrame(initCandlestickChart);
        } else if (mode === "close" && state.chartFullscreen) {
          if (history.state?.chartFullscreen) { history.back(); return; }
          state.chartFullscreen = false;
          render();
          requestAnimationFrame(initCandlestickChart);
        }
      });
    });

    app.querySelectorAll("[data-chart-tf]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tf = btn.getAttribute("data-chart-tf");
        if (!tf || !state.detail?.symbol) return;
        state.chartTimeframe = tf;
        app.querySelectorAll("[data-chart-tf]").forEach(b => b.classList.toggle("active", b === btn));
        const container = document.getElementById("lw-chart-container");
        if (container) container.innerHTML = `<div class="chart-loading">Chargement…</div>`;
        const limit = tf === "1d" ? 90 : 60;
        try {
          const res = await api(`/api/candles/${encodeURIComponent(state.detail.symbol)}?timeframe=${tf}&limit=${limit}`);
          const candles = Array.isArray(res?.data) ? res.data : [];
          if (state.detail) state.detail.candles = candles;
          initCandlestickChart();
        } catch {
          if (container) container.innerHTML = `<div class="empty-state">Données non disponibles pour ce délai.</div>`;
        }
      });
    });

    app.querySelectorAll(".opp-row[data-symbol]").forEach(el => {
      el.addEventListener("click", () => navigate("asset-detail", el.getAttribute("data-symbol")));
    });

    app.querySelectorAll("[data-open-detail]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        navigate("asset-detail", el.getAttribute("data-open-detail"));
      });
    });

    app.querySelectorAll("[data-create-trade-plan]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openTradeConfirmModal("recommended");
      });
    });

    app.querySelectorAll("[data-cancel-trade-confirm]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        closeTradeConfirmModal();
      });
    });

    app.querySelectorAll("[data-confirm-open-trade]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        haptic([15, 20, 15]);
        confirmTradeFromModal();
      });
    });

    app.querySelectorAll("[data-close-trade]").forEach(el => {
      el.addEventListener("click", () => { haptic([20, 40, 20]); closeTrainingTrade(el.getAttribute("data-close-trade")); });
    });

    app.querySelectorAll("[data-close-half]").forEach(el => {
      el.addEventListener("click", () => { haptic([15, 30, 15]); partialClosePosition(el.getAttribute("data-close-half"), 50); });
    });

    app.querySelectorAll("[data-clear-history]").forEach(el => {
      el.addEventListener("click", () => {
        const src = el.getAttribute("data-clear-history");
        const label = src === "algo" ? "algo" : "manuel";
        if (!confirm(`Supprimer tout l'historique ${label} ? Cette action est irréversible.`)) return;
        haptic([30, 60, 30]);
        state.trades.history = state.trades.history.filter(p => tradeSource(p) !== src);
        saveTradesMeta({ lastWipedAt: Date.now() });
        persistTradesState();
        render();
      });
    });

    app.querySelectorAll("[data-clear-all-history]").forEach(el => {
      el.addEventListener("click", () => {
        if (!confirm("Supprimer tout l'historique ? Cette action est irréversible.")) return;
        haptic([30, 60, 30]);
        state.trades.history = [];
        saveTradesMeta({ lastWipedAt: Date.now() });
        persistTradesState();
        render();
      });
    });

    app.querySelectorAll("[data-action]").forEach(el => {
      el.addEventListener("click", () => {
        const action = el.getAttribute("data-action");
        if (action === "load-journal-analysis") loadJournalAnalysis();
        if (action === "load-portfolio-priority") loadPortfolioPriority();
      });
    });

    app.querySelectorAll("[data-export-csv]").forEach(el => {
      el.addEventListener("click", () => exportTradesToCSV());
    });

    app.querySelectorAll("[data-reset-training-capital]").forEach(el => {
      el.addEventListener("click", () => {
        resetTrainingCapital();
        render();
      });
    });

    app.querySelectorAll("[data-trade-mode]").forEach(el => {
      el.addEventListener("click", () => {
        state.trades.mode = el.getAttribute("data-trade-mode");
        render();
      });
    });

    app.querySelectorAll("[data-setting-toggle]").forEach(el => {
      el.addEventListener("change", async () => {
        const key = el.getAttribute("data-setting-toggle");
        haptic(8);
        state.settings[key] = el.checked;
        if (key === "algoSignalNotifs" && el.checked) {
          await requestNotificationsPermission();
        }
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


    // PIN modal
    app.querySelectorAll("[data-pin-cancel]").forEach(el => {
      el.addEventListener("click", () => {
        state.session.pinOpen = false;
        state.session.pinError = null;
        render();
      });
    });
    app.querySelectorAll("[data-pin-submit]").forEach(el => {
      el.addEventListener("click", () => {
        const input = document.getElementById("pin-input");
        if (input) handlePinLogin(input.value.trim());
      });
    });
    const pinInput = document.getElementById("pin-input");
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handlePinLogin(pinInput.value.trim());
      });
      pinInput.focus();
    }

    app.querySelectorAll("[data-force-sync]").forEach(el => {
      el.addEventListener("click", async () => {
        state.trades._syncing = true;
        render();
        await syncTradesToSupabase().catch(() => {});
        state.trades._syncing = false;
        render();
      });
    });

    // Boutons session dans les réglages
    app.querySelectorAll("[data-open-pin]").forEach(el => {
      el.addEventListener("click", () => {
        state.session.pinOpen = true;
        state.session.pinError = null;
        render();
      });
    });
    app.querySelectorAll("[data-session-logout]").forEach(el => {
      el.addEventListener("click", () => {
        clearSession();
        render();
      });
    });

    // Alert modal open
    app.querySelectorAll("[data-open-alert-modal]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const symbol = el.getAttribute("data-open-alert-modal");
        const name = el.getAttribute("data-alert-name") || symbol;
        const rawPrice = el.getAttribute("data-alert-price");
        const currentPrice = rawPrice ? Number(rawPrice) : null;
        state.alertModal = { open: true, symbol, name, currentPrice };
        render();
        const inp = document.getElementById("alert-target-price");
        if (inp) inp.focus();
      });
    });

    // Alert modal cancel
    app.querySelectorAll("[data-alert-cancel]").forEach(el => {
      el.addEventListener("click", () => {
        state.alertModal = { open: false, symbol: null, name: null, currentPrice: null };
        render();
      });
    });

    // Alert modal submit
    app.querySelectorAll("[data-alert-submit]").forEach(el => {
      el.addEventListener("click", async () => {
        const condEl = document.getElementById("alert-condition");
        const priceEl = document.getElementById("alert-target-price");
        if (!condEl || !priceEl) return;
        const targetPrice = parseFloat(priceEl.value);
        if (!targetPrice || isNaN(targetPrice) || targetPrice <= 0) {
          priceEl.focus();
          return;
        }
        const perm = await requestNotificationsPermission();
        if (perm !== "granted" && perm !== "denied") {
          // permission denied or unsupported — alert still works in-app
        }
        addPriceAlert(
          state.alertModal.symbol,
          state.alertModal.name,
          condEl.value,
          targetPrice,
          state.alertModal.currentPrice
        );
        state.alertModal = { open: false, symbol: null, name: null, currentPrice: null };
        render();
      });
    });

    // Remove individual alert
    app.querySelectorAll("[data-remove-alert]").forEach(el => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        haptic(15);
        const id = parseFloat(el.getAttribute("data-remove-alert"));
        removePriceAlert(id);
        render();
      });
    });

    // Clear triggered alerts history
    app.querySelectorAll("[data-clear-triggered-alerts]").forEach(el => {
      el.addEventListener("click", () => {
        clearTriggeredAlerts();
        render();
      });
    });

    // Request notification permission
    app.querySelectorAll("[data-request-notif-perm]").forEach(el => {
      el.addEventListener("click", async () => {
        await requestNotificationsPermission();
        render();
      });
    });

    app.querySelectorAll("[data-a2hs-dismiss]").forEach(el => {
      el.addEventListener("click", () => {
        try { localStorage.setItem(A2HS_DISMISSED_KEY, "1"); } catch {}
        render();
      });
    });

    // User assets
    app.querySelectorAll("[data-open-add-asset]").forEach(el => {
      el.addEventListener("click", () => {
        state.addAssetForm = { open: true, symbol: "", name: "", assetClass: "crypto", loading: false, error: null };
        render();
      });
    });
    app.querySelectorAll("[data-cancel-add-asset]").forEach(el => {
      el.addEventListener("click", () => {
        state.addAssetForm = { open: false, symbol: "", name: "", assetClass: "crypto", loading: false, error: null };
        render();
      });
    });
    app.querySelectorAll("[data-submit-add-asset]").forEach(el => {
      el.addEventListener("click", () => { addUserAsset(); });
    });
    app.querySelectorAll("[data-asset-symbol]").forEach(el => {
      el.addEventListener("input", () => { state.addAssetForm.symbol = el.value.toUpperCase(); });
    });
    app.querySelectorAll("[data-asset-class]").forEach(el => {
      el.addEventListener("change", () => { state.addAssetForm.assetClass = el.value; });
    });
    app.querySelectorAll("[data-asset-name]").forEach(el => {
      el.addEventListener("input", () => { state.addAssetForm.name = el.value; });
    });
    app.querySelectorAll("[data-toggle-user-asset]").forEach(el => {
      el.addEventListener("change", () => {
        const sym = el.getAttribute("data-toggle-user-asset");
        toggleUserAsset(sym, el.checked);
      });
    });
    app.querySelectorAll("[data-delete-user-asset]").forEach(el => {
      el.addEventListener("click", () => {
        const sym = el.getAttribute("data-delete-user-asset");
        deleteUserAsset(sym);
      });
    });
    app.querySelectorAll("[data-pin-user-asset]").forEach(el => {
      el.addEventListener("click", () => {
        const sym = el.getAttribute("data-pin-user-asset");
        const currentlyPinned = el.getAttribute("data-pin-state") === "on";
        togglePinUserAsset(sym, currentlyPinned);
      });
    });
    // PR #9 Phase 2 — rapports hebdo
    app.querySelectorAll("[data-generate-report]").forEach(el => {
      el.addEventListener("click", () => { generateReportNow(); });
    });
    app.querySelectorAll("[data-reload-reports]").forEach(el => {
      el.addEventListener("click", () => { loadReports(); });
    });
    app.querySelectorAll("[data-report-toggle]").forEach(el => {
      el.addEventListener("click", (e) => {
        // Ignore les clics sur des liens internes du markdown
        if (e.target.closest("a")) return;
        const id = Number(el.getAttribute("data-report-toggle"));
        state.reports.openId = state.reports.openId === id ? null : id;
        haptic(5);
        render();
      });
    });
    app.querySelectorAll("[data-load-user-assets]").forEach(el => {
      el.addEventListener("click", () => { loadUserAssets(); });
    });

    // Bot training
    app.querySelectorAll("[data-bot-toggle]").forEach(el => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-bot-toggle");
        toggleBotSetting(key, el.checked);
      });
    });
    app.querySelectorAll("[data-bot-force-cycle]").forEach(el => {
      el.addEventListener("click", () => { forceBotCycle(); });
    });
    app.querySelectorAll("[data-bot-reload]").forEach(el => {
      el.addEventListener("click", () => { loadBot(); });
    });
    app.querySelectorAll("[data-bot-edit-open]").forEach(el => {
      el.addEventListener("click", () => { openBotEdit(); });
    });
    app.querySelectorAll("[data-bot-edit-cancel]").forEach(el => {
      el.addEventListener("click", () => { cancelBotEdit(); });
    });
    app.querySelectorAll("[data-bot-edit-save]").forEach(el => {
      el.addEventListener("click", () => { saveBotDraft(); });
    });
    app.querySelectorAll("[data-bot-preset-training]").forEach(el => {
      el.addEventListener("click", () => { applyBotTrainingPreset(); });
    });
    app.querySelectorAll("[data-bot-field]").forEach(el => {
      const evt = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(evt, () => {
        const key = el.getAttribute("data-bot-field");
        const val = el.type === "checkbox" ? el.checked : el.value;
        updateBotDraftField(key, val);
      });
    });
    app.querySelectorAll("[data-bot-field-setup]").forEach(el => {
      el.addEventListener("change", () => {
        toggleBotDraftSetup(el.getAttribute("data-bot-field-setup"), el.checked);
      });
    });

    // Fermeture modal au tap backdrop (uniquement clic direct, pas bubble)
    app.querySelectorAll("[data-close-modal]").forEach(el => {
      el.addEventListener("click", (ev) => {
        if (ev.target !== el) return;
        const kind = el.getAttribute("data-close-modal");
        if (kind === "alert") {
          state.alertModal = { open: false, symbol: null, name: null, currentPrice: null };
          render();
        } else if (kind === "pin") {
          state.session.pinOpen = false;
          state.session.pinError = null;
          render();
        }
      });
    });

  }

  async function boot() {
    try {
      history.replaceState({ route: state.route, symbol: state.selectedSymbol || null }, "", "");
    } catch {}
    state.priceAlerts = loadPriceAlerts();
    await loadTradesState();
    if (Array.isArray(state.opportunitiesSnapshot) && state.opportunitiesSnapshot.length) {
      state.opportunities = state.opportunitiesSnapshot.map(normalizeOpportunity);
      syncMarketContext(null, state.opportunities);
      applyFilter();
    }
    render();
    await loadDashboard();
    render();
    setInterval(() => {
      if (["dashboard", "opportunities", "news", "asset-detail", "settings", "portfolio", "alerts"].includes(state.route)) {
        if (state.route === "portfolio") {
          refreshOpenTradesLive().catch(() => {});
        }
        if (state.settings.autoRefreshOpportunities && !state.opportunitiesRefreshing) {
          const stockOpen = isStockMarketOpen();
          const intervalMin = stockOpen ? Number(state.settings.autoScanIntervalMin || 5) : 15;
          if (Date.now() - (state.opportunitiesLastGoodAt || 0) >= intervalMin * 60 * 1000) {
            loadOpportunities(false).catch(() => {});
          }
        }
        render();
      }
    }, 30000);
  }

  if ("serviceWorker" in navigator) {
    // Force le navigateur à vérifier sw.js à chaque chargement (pas de cache HTTP)
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check update toutes les 5 min tant que l'app reste ouverte
        setInterval(() => { reg.update().catch(() => {}); }, 5 * 60 * 1000);
        // Check aussi au retour de focus (app rouverte depuis l'arrière-plan)
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {});

    // Recharge une fois quand un nouveau SW prend le contrôle
    let reloadingForSwUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadingForSwUpdate) return;
      reloadingForSwUpdate = true;
      location.reload();
    });
  }

  // iOS keyboard handling — synchronise visualViewport avec CSS vars
  // Permet aux modals de rester visibles au-dessus du clavier virtuel
  function syncVisualViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    document.documentElement.style.setProperty("--vv-height", vv.height + "px");
    document.documentElement.style.setProperty("--vv-offset-top", vv.offsetTop + "px");
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncVisualViewport);
    window.visualViewport.addEventListener("scroll", syncVisualViewport);
    syncVisualViewport();
  }

  // Auto-thème : re-render quand le système change clair/sombre (si autoTheme actif)
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if (state.settings.autoTheme) render(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // Scroll l'input focus au centre de son modal (iOS clavier)
  document.addEventListener("focusin", (ev) => {
    const target = ev.target;
    if (!target || !target.closest) return;
    const inModal = target.closest(".modal-box, .modal-backdrop .card");
    if (!inModal) return;
    setTimeout(() => {
      try { target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
    }, 250);
  });

  // Pull-to-refresh (iPhone) — tire vers le bas en haut de page pour rafraîchir
  let ptrStartY = null;
  let ptrStartX = null;
  let ptrPull = 0;
  let ptrActive = false;
  let ptrRefreshing = false;
  const PTR_THRESHOLD = 60;
  const PTR_MAX = 120;

  function setPtrPull(px) {
    document.documentElement.style.setProperty("--ptr-pull", px + "px");
    const ind = document.getElementById("ptr-indicator");
    if (!ind) return;
    ind.classList.toggle("visible", px > 0);
    ind.classList.toggle("pulling", ptrActive);
  }

  function currentRoutePtrAction() {
    if (ptrRefreshing) return null;
    switch (state.route) {
      case "dashboard": return () => loadDashboard();
      case "opportunities": return () => loadOpportunities(true);
      case "portfolio": return () => refreshOpenTradesLive(true);
      case "alerts": return () => loadDashboard();
      case "health": return () => loadHealth();
      case "reports": return () => loadReports();
      case "bot": return () => loadBot();
      default: return null;
    }
  }

  function scrollerAtTop() {
    const sc = document.querySelector(".main-content");
    if (!sc) return false;
    return sc.scrollTop <= 0;
  }

  document.addEventListener("touchstart", (ev) => {
    if (ptrRefreshing) return;
    if (!scrollerAtTop()) return;
    if (!currentRoutePtrAction()) return;
    if (ev.target.closest && ev.target.closest(".modal-overlay, .modal-backdrop, #lw-chart-container")) return;
    ptrStartY = ev.touches[0].clientY;
    ptrStartX = ev.touches[0].clientX;
    ptrActive = true;
    ptrPull = 0;
  }, { capture: true, passive: false });

  document.addEventListener("touchmove", (ev) => {
    if (!ptrActive || ptrStartY == null) return;
    if (!scrollerAtTop()) { ptrActive = false; setPtrPull(0); return; }
    const dy = ev.touches[0].clientY - ptrStartY;
    const dx = Math.abs(ev.touches[0].clientX - ptrStartX);
    if (dx > Math.abs(dy) && dx > 10) { ptrActive = false; setPtrPull(0); return; }
    if (dy <= 0) { ptrPull = 0; setPtrPull(0); return; }
    ptrPull = Math.min(Math.pow(dy, 0.85), PTR_MAX);
    setPtrPull(ptrPull);
    if (dy > 10 && ev.cancelable) ev.preventDefault();
  }, { capture: true, passive: false });

  document.addEventListener("touchend", async () => {
    if (!ptrActive) return;
    ptrActive = false;
    const refresh = currentRoutePtrAction();
    if (ptrPull >= PTR_THRESHOLD && refresh) {
      ptrRefreshing = true;
      setPtrPull(44);
      const ind = document.getElementById("ptr-indicator");
      if (ind) ind.classList.add("refreshing");
      try { await refresh(); } catch {}
      haptic(10);
      if (ind) ind.classList.remove("refreshing");
      ptrRefreshing = false;
    }
    setPtrPull(0);
    ptrStartY = null;
    ptrStartX = null;
    ptrPull = 0;
  }, { capture: true });

  // Back-swipe iOS : écoute popstate pour revenir à la route précédente
  window.addEventListener("popstate", (ev) => {
    // Si on était en plein écran et que le nouvel état ne l'est plus → sortir du plein écran sans changer de route
    if (state.chartFullscreen && !ev.state?.chartFullscreen) {
      state.chartFullscreen = false;
      render();
      requestAnimationFrame(initCandlestickChart);
      return;
    }

    // Ferme tous les modals ouverts (évite un état incohérent)
    if (state.tradeConfirm?.open) state.tradeConfirm = { open: false, mode: null, side: null };
    if (state.session?.pinOpen) { state.session.pinOpen = false; state.session.pinError = null; }
    if (state.alertModal?.open) state.alertModal = { open: false, symbol: null, name: null, currentPrice: null };
    if (state.moreMenuOpen) state.moreMenuOpen = false;

    const s = ev.state;
    if (!s || !s.route) {
      navigate("dashboard", null, { skipHistory: true });
    } else {
      navigate(s.route, s.symbol || null, { skipHistory: true });
    }
  });

  boot();
})();
