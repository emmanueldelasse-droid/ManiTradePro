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
    showAlgoJournal: false,
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
    loadingPortfolioPriority: false,
    userAssets: [],
    userAssetsLoading: false,
    userAssetsError: null,
    addAssetForm: { open: false, symbol: "", name: "", assetClass: "crypto", loading: false, error: null },
    bot: { account: null, events: [], stats: null, loading: false, error: null, forcingCycle: false, settingsOpen: false, editDraft: null, savingDraft: false, statsTab: "setup", paramsOpen: false, subTab: "stats", learning: { stats: null, loading: false, error: null, filterMode: "all", lastLoadedAt: 0, showUnknown: false } },
    health: { adjustments: [], bucketStats: [], loading: false, error: null, lastLoadedAt: 0 },
    reports: { list: [], loading: false, error: null, openId: null, generating: false },   // PR #9 Phase 2 — rapports hebdo
    tradeFeedback: {}, // trade_id → { mae_pct, mfe_pct, exit_reason, mae_vs_stop_ratio, mfe_vs_tp_ratio, ... } (PR #5 Phase 2)
    tradeFeedbackError: null // message d'erreur de chargement du feedback (ex : 403 si token admin manquant)
  };

  const app = document.getElementById("app");
  const navItems = [
    ["dashboard", "Accueil", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`],
    ["opportunities", "Opportunites", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`],
    ["portfolio", "Trades", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`],
    ["settings", "Reglages", `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`]
  ];

  // Mobile bottom-nav : 3 items principaux + "Plus" (Réglages).
  const PRIMARY_NAV_ROUTES = ["dashboard", "opportunities", "portfolio"];
  const MORE_NAV_ROUTES = ["settings"];
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
    sync: "/api/trades/sync",
    wipe: "/api/trades/wipe"
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
      // PR-TRADES-TOMBSTONE-SERVER-V2 : récupérer le marker global serveur.
      // Format attendu : { lastWipedAt: ISO string, wipeVersion: number, updatedAt: ISO }.
      // null si la migration 017 n'est pas appliquée (comportement dégradé OK).
      const serverMeta = (payload?.data?.meta && typeof payload.data.meta === "object")
        ? payload.data.meta
        : null;
      state.trades.remoteStatus = configured ? "connected" : "fallback_local";
      state.trades.remoteError = configured ? null : (payload?.message || "worker_not_configured");
      state.trades.lastRemoteSyncAt = Date.now();
      return {
        loaded: true,
        configured,
        positions,
        history,
        serverMeta,
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
        serverMeta: null,
        payload: null
      };
    }
  }

  async function wipeTradesOnServer(ids, { includePositions = false, source = null, wipeAll = false } = {}) {
    const cleanIds = Array.from(new Set(
      (Array.isArray(ids) ? ids : []).map(v => String(v ?? "").trim()).filter(Boolean)
    ));
    const validSource = source === "manual" || source === "algo" ? source : null;
    // Si on ne demande ni wipeAll, ni un filtre par source, ni des IDs,
    // et pas de suppression de positions → rien à faire.
    if (!wipeAll && !validSource && !cleanIds.length && !includePositions) {
      return { ok: true, deletedTrades: 0, deletedPositions: 0 };
    }
    try {
      const payload = await workerTradesRequest(WORKER_TRADES_ROUTES.wipe, {
        method: "POST",
        body: JSON.stringify({
          ids: cleanIds,
          includePositions,
          source: validSource,
          wipeAll: wipeAll === true
        })
      });
      // PR-TRADES-TOMBSTONE-SERVER-V2 : sur wipeAll réussi, le worker
      // renvoie le marker global frais (data.meta). On l'adopte localement
      // pour aligner immédiatement le tombstone front + clear le flag
      // pendingRemoteWipe (s'il était posé suite à un wipe hors-ligne).
      const serverMeta = payload?.data?.meta && typeof payload.data.meta === "object"
        ? payload.data.meta
        : null;
      if (wipeAll === true && serverMeta && serverMeta.lastWipedAt) {
        const serverMsRaw = Date.parse(String(serverMeta.lastWipedAt));
        const serverMs = Number.isFinite(serverMsRaw) && serverMsRaw > 0 ? serverMsRaw : Date.now();
        saveTradesMeta({
          lastWipedAt: serverMs,
          serverWipeAdoptedAt: Date.now(),
          pendingRemoteWipe: false
        });
      }
      return {
        ok: true,
        deletedTrades: Number(payload?.data?.deletedTrades || 0),
        deletedPositions: Number(payload?.data?.deletedPositions || 0),
        serverMeta
      };
    } catch (err) {
      // PR-TRADES-TOMBSTONE-SERVER-V2 + V3 : wipe échoué (offline, Safari
      // "Load failed", worker indispo). Marquer le flag pendingRemoteWipe
      // pour retenter au prochain sync / loadTradesState. Vise wipeAll ET
      // wipe par-source (symétrie). Le tombstone local reste actif et
      // empêche déjà toute réapparition côté front (PR #254).
      if (wipeAll === true || validSource !== null) {
        saveTradesMeta({ pendingRemoteWipe: true, lastRemoteWipeFailAt: Date.now() });
      }
      return { ok: false, error: err?.message || "wipe_failed" };
    }
  }

  async function syncTradesToSupabase() {
    try {
      // PR fix bug "historique supprimé qui réapparaît" :
      // Si tombstone actif, retirer les trades antérieurs au wipe AVANT
      // l'envoi sync. Empêche la réinjection d'ancien historique depuis
      // un autre onglet / device dont le localStorage n'aurait pas été
      // mis à jour.
      const meta = loadTradesMeta();
      const tombstoneMs = Number(meta.lastWipedAt);
      const tombstoneActive = Number.isFinite(tombstoneMs) && tombstoneMs > 0;
      const positionsRaw = Array.isArray(state.trades.positions) ? state.trades.positions.map(normalizePositionRecord) : [];
      const historyRaw = Array.isArray(state.trades.history) ? state.trades.history.map((x) => normalizePositionRecord(x)) : [];
      const positions = tombstoneActive
        ? positionsRaw.filter((t) => !isTradeOlderThanTombstone(t, tombstoneMs))
        : positionsRaw;
      const history = tombstoneActive
        ? historyRaw.filter((t) => !isTradeOlderThanTombstone(t, tombstoneMs))
        : historyRaw;
      const payload = await workerTradesRequest(WORKER_TRADES_ROUTES.sync, {
        method: "POST",
        body: JSON.stringify({ positions, history })
      });
      const configured = !!payload?.data?.configured;
      state.trades.remoteStatus = configured ? "connected" : "fallback_local";
      state.trades.remoteError = configured ? null : (payload?.message || "worker_not_configured");
      state.trades.lastRemoteSyncAt = Date.now();

      // PR-TRADES-TOMBSTONE-SERVER-V2 : si le worker a retourné un marker
      // global plus récent que notre tombstone local, on s'aligne. Garantit
      // la synchro multi-device au prochain sync (PC <-> iPhone).
      const serverMeta = payload?.data?.meta && typeof payload.data.meta === "object"
        ? payload.data.meta
        : null;
      const metaUpdate = {
        positionsCount: Array.isArray(state.trades.positions) ? state.trades.positions.length : 0,
        historyCount: Array.isArray(state.trades.history) ? state.trades.history.length : 0,
        pendingRemoteSync: !configured,
        lastSuccessfulRemoteSyncAt: configured ? Date.now() : (loadTradesMeta().lastSuccessfulRemoteSyncAt || null),
        lastRemoteSyncAttemptAt: Date.now()
      };
      if (serverMeta && serverMeta.lastWipedAt) {
        const serverMsRaw = Date.parse(String(serverMeta.lastWipedAt));
        const serverMs = Number.isFinite(serverMsRaw) && serverMsRaw > 0 ? serverMsRaw : 0;
        const localMs = Number(meta.lastWipedAt) > 0 ? Number(meta.lastWipedAt) : 0;
        if (serverMs > localMs) {
          metaUpdate.lastWipedAt = serverMs;
          metaUpdate.serverWipeAdoptedAt = Date.now();
          metaUpdate.pendingRemoteWipe = false;
        }
      }
      saveTradesMeta(metaUpdate);
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

    // Fix : ne propage QUE des champs d'affichage cosmétiques vers
    // state.opportunities. Le endpoint /api/opportunity-detail/<symbol>
    // calcule un score plus riche (AI review + regimeIndicators + news
    // context enrichi) que /api/opportunities batch. Écraser la row batch
    // avec ce score enrichi ferait apparaître un actif non-actionable
    // comme "Trade propose" juste pour avoir été consulté → incohérence
    // visuelle Dashboard ↔ fiche. Le batch reste source de vérité pour
    // la liste. Le détail enrichi vit dans state.detail uniquement.
    const currentList = (state.opportunitiesSnapshot || []).slice();
    const idx = currentList.findIndex(x => String(x.symbol || "").toUpperCase() === clean);
    if (idx >= 0) {
      const safeBackfill = {
        name: value.name || currentList[idx].name,
        assetClass: value.assetClass || currentList[idx].assetClass,
        candles: Array.isArray(value.candles) && value.candles.length ? value.candles : currentList[idx].candles,
        freshness: value.freshness || currentList[idx].freshness
      };
      currentList[idx] = normalizeOpportunity({ ...currentList[idx], ...safeBackfill });
      saveOpportunitiesSnapshot(currentList);
      state.opportunities = state.opportunities.map(item =>
        String(item.symbol || "").toUpperCase() === clean ? currentList[idx] : item
      );
      applyFilter();
    }
  }

  // === TRADES HISTORY TOMBSTONE V1 ==========================================
  // Helper inline miroir de tools/quant/lib/trades-history-tombstone-v1.mjs.
  // Empêche la réapparition d'anciens trades après une suppression utilisateur.
  // Maintenir synchrone avec le module pur.
  //
  // Convention : on regarde dans l'ordre opened_at, puis created_at, puis
  // closed_at. Si aucune date disponible → return false (on garde par prudence).
  // Trade strictement à `lastWipedAt` → return false (gardé). Trade
  // strictement avant `lastWipedAt` → return true (obsolète).
  function isTradeOlderThanTombstone(trade, tombstoneMs) {
    if (!Number.isFinite(tombstoneMs) || tombstoneMs <= 0) return false;
    if (!trade || typeof trade !== "object") return false;
    const refDate = trade.opened_at || trade.openedAt
      || trade.created_at || trade.createdAt
      || trade.closed_at || trade.closedAt;
    if (!refDate) return false;
    const ms = Date.parse(String(refDate));
    if (!Number.isFinite(ms)) return false;
    return ms < tombstoneMs;
  }

  async function loadTradesState() {
    const remote = await loadTradesFromWorker();
    const rawPositions = readJsonFromKeys(TRADE_STORAGE.positions, []);
    const rawHistory = readJsonFromKeys(TRADE_STORAGE.history, []);
    const rawAlgo = readJsonFromKeys(TRADE_STORAGE.algoJournal, []);
    const localPositions = Array.isArray(rawPositions) ? rawPositions.map(normalizePositionRecord) : [];
    const localHistory = Array.isArray(rawHistory) ? rawHistory.map((x) => normalizePositionRecord(x)) : [];
    const meta = loadTradesMeta();

    // PR fix bug "historique supprimé qui réapparaît" + V2 multi-device :
    // Merge le tombstone local et le tombstone serveur (`remote.serverMeta`).
    // Le plus récent gagne. Empêche un device offline / vieux client de
    // réinjecter des trades supprimés depuis un autre device.
    // Source canonique : tools/quant/lib/trades-history-tombstone-v1.mjs.
    const localTombstoneMs = Number(meta.lastWipedAt);
    const serverTombstoneIso = remote.serverMeta && remote.serverMeta.lastWipedAt
      ? String(remote.serverMeta.lastWipedAt)
      : null;
    const serverTombstoneMsRaw = serverTombstoneIso ? Date.parse(serverTombstoneIso) : 0;
    const serverTombstoneMs = Number.isFinite(serverTombstoneMsRaw) && serverTombstoneMsRaw > 0 ? serverTombstoneMsRaw : 0;
    const localTombstoneMsClean = Number.isFinite(localTombstoneMs) && localTombstoneMs > 0 ? localTombstoneMs : 0;
    const effectiveTombstoneMs = Math.max(localTombstoneMsClean, serverTombstoneMs);
    const tombstoneActive = effectiveTombstoneMs > 0;

    // Alignement local sur server si server > local : adoption du marker
    // distant (cas multi-device : autre device a wipé, on l'apprend).
    if (serverTombstoneMs > localTombstoneMsClean) {
      saveTradesMeta({ lastWipedAt: serverTombstoneMs, serverWipeAdoptedAt: Date.now(), pendingRemoteWipe: false });
    }
    // Si local > server : ce client a wipé hors-ligne et le serveur ignore.
    // Flag `pendingRemoteWipe` pour retenter au prochain wipe / sync.
    if (localTombstoneMsClean > serverTombstoneMs) {
      saveTradesMeta({ pendingRemoteWipe: true });
    }

    if (tombstoneActive && Array.isArray(remote.positions)) {
      remote.positions = remote.positions.filter((t) => !isTradeOlderThanTombstone(t, effectiveTombstoneMs));
    }
    if (tombstoneActive && Array.isArray(remote.history)) {
      remote.history = remote.history.filter((t) => !isTradeOlderThanTombstone(t, effectiveTombstoneMs));
    }

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
      // Tombstone permanent (plus de TTL 5 min). Tant que lastWipedAt est
      // défini, on traite la suppression comme une vérité persistée et le
      // local prime sur remote pour préserver la décision utilisateur.
      const recentWipe = tombstoneActive;

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

  // Mappe le symbole vers sa devise de cotation. Miroir front du helper
  // worker `getCurrencyForSymbol`, utilisé quand le payload ne porte pas le
  // champ currency (positions persistées avant l'évolution multi-devises).
  function currencyForSymbol(symbol) {
    const sym = String(symbol || "").toUpperCase();
    if (!sym) return "USD";
    const explicit = {
      AIR: "EUR", LVMH: "EUR", TTE: "EUR", RMS: "EUR",
      SAP: "EUR", SIE: "EUR", ASML: "EUR",
      NESN: "CHF"
    };
    if (explicit[sym]) return explicit[sym];
    const suffixMap = {
      ".PA": "EUR", ".AS": "EUR", ".MI": "EUR", ".MC": "EUR",
      ".BR": "EUR", ".LS": "EUR", ".HE": "EUR", ".VI": "EUR",
      ".XETRA": "EUR", ".DE": "EUR", ".F": "EUR",
      ".SW": "CHF", ".L": "GBP",
      ".ST": "SEK", ".OL": "NOK", ".CO": "DKK"
    };
    for (const [suffix, currency] of Object.entries(suffixMap)) {
      if (sym.endsWith(suffix)) return currency;
    }
    return "USD";
  }

  // Calendrier des jours fériés par devise. Miroir EXACT du même tableau
  // côté worker (worker.js MARKET_HOLIDAYS). Si tu modifies ici, modifie
  // l'autre — sinon le front affichera "fermé" pendant que le worker
  // tente d'ouvrir un trade (ou l'inverse).
  const MARKET_HOLIDAYS = {
    USD: [
      "2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25",
      "2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25",
      "2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31",
      "2027-06-18","2027-07-05","2027-09-06","2027-11-25","2027-12-24"
    ],
    EUR: [
      "2026-01-01","2026-04-03","2026-04-06","2026-05-01","2026-12-25","2026-12-28",
      "2027-01-01","2027-03-26","2027-03-29","2027-12-27","2027-12-28"
    ],
    CHF: [
      "2026-01-01","2026-01-02","2026-04-03","2026-04-06","2026-05-01",
      "2026-05-14","2026-05-25","2026-08-03","2026-12-24","2026-12-25",
      "2026-12-31",
      "2027-01-01","2027-03-26","2027-03-29","2027-05-06","2027-05-17",
      "2027-08-02","2027-12-24","2027-12-27","2027-12-31"
    ],
    GBP: [
      "2026-01-01","2026-04-03","2026-04-06","2026-05-04","2026-05-25",
      "2026-08-31","2026-12-25","2026-12-28",
      "2027-01-01","2027-03-26","2027-03-29","2027-05-03","2027-05-31",
      "2027-08-30","2027-12-27","2027-12-28"
    ]
  };

  function isMarketHoliday(symbol, dateIso = null) {
    const cls = inferAssetClass(symbol);
    if (cls === "crypto" || cls === "forex" || cls === "commodity") return false;
    const ccy = (typeof currencyForSymbol === "function") ? currencyForSymbol(symbol) : "USD";
    const list = MARKET_HOLIDAYS[ccy];
    if (!Array.isArray(list)) return false;
    const day = dateIso || new Date().toISOString().slice(0, 10);
    return list.includes(day);
  }

  // Taux de conversion approximatifs vers l'euro pour les devises secondaires
  // (CHF Nestlé, GBP actions UK, scandinaves). Valeurs proches du marché
  // long terme — la conversion sert uniquement à présenter un ordre de
  // grandeur cohérent en EUR primaire. Si on veut un taux exact temps réel,
  // il faudra brancher un endpoint FX dédié.
  const FX_TO_EUR = { EUR: 1, USD: null, CHF: 1.05, GBP: 1.17, SEK: 0.087, NOK: 0.084, DKK: 0.134 };

  function toEurAndUsd(value, currency) {
    const fx = fxRateUsdToEur();
    if (currency === "EUR") {
      return { eur: value, usd: fx > 0 ? value / fx : null };
    }
    if (currency === "USD" || currency == null) {
      return { eur: value * fx, usd: value };
    }
    const r = FX_TO_EUR[currency];
    if (r) {
      const eur = value * r;
      return { eur, usd: fx > 0 ? eur / fx : null };
    }
    return { eur: null, usd: null };
  }

  function priceDisplay(value, currency = "USD") {
    if (value == null || Number.isNaN(value)) return "Donnee indisponible";
    const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
    const { eur, usd } = toEurAndUsd(value, currency);
    if (eur == null) return money(value, currency);
    if (mode === "EUR") return money(eur, "EUR");
    if (mode === "USD") return usd != null ? money(usd, "USD") : money(eur, "EUR");
    return usd != null
      ? `${money(eur, "EUR")} <span class="muted">(${money(usd, "USD")})</span>`
      : money(eur, "EUR");
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
    if (value === "delayed_15m") return "différé 15 min";
    if (value === "eod") return "dernière clôture";
    if (value === "recent") return "récent";
    return "inconnu";
  }

  function relativeTimeFr(iso) {
    if (!iso) return null;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return null;
    const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (diffSec < 60) return "à l'instant";
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    return `il y a ${Math.round(diffH / 24)} j`;
  }

  function quoteSourceLine(item) {
    if (!item) return "";
    const src = String(item.sourceUsed || "").toLowerCase();
    const at = relativeTimeFr(item.quotedAt);
    if (src === "twelvedata") {
      return `Données Twelve Data (différé 15 min)${at ? ` · mis à jour ${at}` : ""}`;
    }
    if (src === "yahoo") {
      return `Données Yahoo (temps réel)${at ? ` · mis à jour ${at}` : ""}`;
    }
    if (src === "binance") {
      return `Données Binance (temps réel)${at ? ` · mis à jour ${at}` : ""}`;
    }
    if (src === "snapshot") {
      return `Données archivées (dernière clôture)${at ? ` · ${at}` : ""}`;
    }
    if (src === "alphavantage") {
      return `Données Alpha Vantage${at ? ` · mis à jour ${at}` : ""}`;
    }
    return at ? `Mis à jour ${at}` : "";
  }

  // === Vague B.8 — diagnostic prix live (FRONT UNIQUEMENT) ============
  // Helpers d'affichage de liveContext.quoteQuality. Lit, formatte,
  // n'a aucun calcul métier (le moteur reste seul juge — cf. PROJECT_RULES R4).

  function quoteQualityFor(item) {
    return item?.liveContext?.quoteQuality || null;
  }

  function quoteSourceShortLabel(sourceUsed) {
    const src = String(sourceUsed || "").toLowerCase();
    if (src === "twelvedata") return "Twelve Data";
    if (src === "yahoo") return "Yahoo";
    if (src === "binance") return "Binance";
    if (src === "eodhd" || src === "eod") return "EODHD";
    if (src === "snapshot") return "Snapshot EOD";
    if (src === "alphavantage" || src === "alpha") return "Alpha Vantage";
    if (src === "coingecko") return "CoinGecko";
    if (src === "finnhub") return "Finnhub";
    if (!src) return "Source ?";
    return sourceUsed;
  }

  // freshness brut → label court pour badge / chip ("live" → "live",
  // "delayed_15m" → "différé 15 min"). Distinct de simpleFreshnessLabel
  // (qui est verbeux pour le bloc "Mise a jour").
  function freshnessChipLabel(value) {
    const v = String(value || "").toLowerCase();
    if (v === "live") return "live";
    if (v === "delayed_15m") return "différé 15 min";
    if (v === "recent") return "récent";
    if (v === "eod") return "snapshot EOD";
    if (v === "stale") return "périmé";
    return "fraîcheur ?";
  }

  // État compact pour l'icône + ton du badge sur la carte opp.
  // Priorité : currency_mismatch > stale > unsafe > abnormal_spread >
  //            no_price > snapshot EOD > marketClosed > delayed > live ok.
  // Renvoie {label, tone} où tone ∈ {"positive","neutral","warn","negative"}.
  function quoteQualityState(item) {
    const qq = quoteQualityFor(item);
    const src = String(item?.sourceUsed || "").toLowerCase();
    const fresh = String(item?.freshness || "").toLowerCase();
    if (qq) {
      // B.13 P0 — missingQuotedAt prioritaire : impossible de mesurer la
      // fraicheur, donc on signale immédiatement à l'utilisateur.
      if (qq.missingQuotedAt) return { label: "Prix non daté", tone: "negative" };
      if (qq.currencyMismatch) return { label: "Devise incohérente", tone: "negative" };
      if (qq.stale) return { label: "Prix périmé", tone: "negative" };
      if (qq.abnormalSpread) return { label: "Écart anormal", tone: "negative" };
      if (!Number.isFinite(Number(item?.price))) return { label: "Prix indisponible", tone: "negative" };
      // P0.1 — snapshot/EOD reste informatif côté UI (warn, pas negative)
      // même si le backend l'a maintenant marqué providerConfidence="unsafe"
      // et validationStatus="eod_snapshot" pour bloquer l'exécution. C'est
      // une donnée affichable (dernier prix dispo), pas une erreur.
      if (src === "snapshot" || fresh === "eod" || qq.isSnapshot === true || qq.validationStatus === "eod_snapshot") {
        return { label: "Dernier prix dispo", tone: "warn" };
      }
      if (qq.providerConfidence === "unsafe" || qq.validationStatus === "unsafe") {
        return { label: "Prix non fiable", tone: "negative" };
      }
      if (qq.marketClosed) return { label: "Marché fermé", tone: "neutral" };
      if (qq.delayed) return { label: "Différé · fiable", tone: "neutral" };
      if (qq.executionSafe) return { label: "Live fiable", tone: "positive" };
      return { label: "OK", tone: "neutral" };
    }
    // Pas de quoteQuality → on retombe sur freshness brut.
    if (src === "snapshot" || fresh === "eod") return { label: "Dernier prix dispo", tone: "warn" };
    if (fresh === "stale") return { label: "Prix périmé", tone: "negative" };
    if (fresh === "delayed_15m") return { label: "Différé · fiable", tone: "neutral" };
    if (fresh === "live") return { label: "Live fiable", tone: "positive" };
    return { label: "Qualité ?", tone: "neutral" };
  }

  // Ligne unique compacte pour la carte opp.
  // Ex : "EODHD · différé 15 min · fiable" / "Snapshot EOD · dernier recours".
  function quoteQualitySummaryLine(item) {
    if (!item) return "";
    const src = quoteSourceShortLabel(item.sourceUsed);
    const fresh = freshnessChipLabel(item.freshness);
    const qq = quoteQualityFor(item);
    const srcLow = String(item.sourceUsed || "").toLowerCase();
    if (srcLow === "snapshot" || String(item.freshness || "").toLowerCase() === "eod") {
      return `Snapshot EOD · dernier prix disponible`;
    }
    let tail = "";
    if (qq) {
      if (qq.currencyMismatch) tail = "devise incohérente";
      else if (qq.stale) tail = "périmé · ne pas utiliser";
      else if (qq.providerConfidence === "unsafe") tail = "non fiable";
      else if (qq.abnormalSpread) tail = "écart anormal";
      else if (qq.marketClosed) tail = "marché fermé";
      else if (qq.executionSafe) tail = "fiable";
    }
    // B.11.1 P1.2 — âge humain de la quote (>30 sec uniquement, sinon trop bruyant)
    const age = formatQuoteAgeHuman(qq?.ageSec);
    const parts = [src, fresh];
    if (tail) parts.push(tail);
    if (age) parts.push(age);
    return parts.join(" · ");
  }

  // B.11.1 P1.2 — convertit un âge en secondes en libellé compact FR.
  // Renvoie "" si l'âge n'est pas un nombre fini ou <= 30s (silence).
  function formatQuoteAgeHuman(ageSec) {
    const n = Number(ageSec);
    if (!Number.isFinite(n) || n <= 30) return "";
    if (n < 60) return `${Math.round(n)} sec`;
    if (n < 3600) return `${Math.round(n / 60)} min`;
    if (n < 86400) return `${Math.round(n / 3600)} h`;
    return `${Math.round(n / 86400)} j`;
  }

  // Date FR lisible "15/05/2026 17:42" pour la fiche actif.
  function formatQuotedAtFr(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  function validationStatusLabel(value) {
    const v = String(value || "").toLowerCase();
    if (v === "valid") return "valide";
    if (v === "delayed") return "différé";
    if (v === "market_closed") return "marché fermé";
    if (v === "stale") return "périmé";
    if (v === "unsafe") return "non fiable";
    if (v === "currency_mismatch") return "devise incohérente";
    if (v === "abnormal_spread") return "écart anormal";
    // P0.1 — nouveau status : snapshot EOD = filet ultime, non exécutable
    if (v === "eod_snapshot") return "snapshot EOD";
    // B.11 P0.2 — bougies daily périmées
    if (v === "candles_too_old") return "bougies périmées";
    // B.13 P0 — horodatage prix absent
    if (v === "missing_quoted_at") return "horodatage absent";
    return value || "—";
  }

  function reasonLabel(value) {
    const v = String(value || "").toLowerCase();
    if (v === "delayed") return "différé légalement";
    if (v === "market_closed") return "marché fermé";
    if (v === "stale") return "quote périmée";
    if (v === "no_price") return "prix absent";
    if (v === "currency_mismatch") return "devise incohérente";
    if (v === "provider_unsafe") return "fournisseur non fiable";
    // P0.1 — drapeau snapshot EOD remonte aussi dans reasons[]
    if (v === "eod_snapshot") return "prix de clôture veille";
    // B.11 P0.2 — drapeau bougies daily périmées
    if (v === "candles_too_old") return "bougies daily périmées";
    // B.13 P0 — horodatage prix absent
    if (v === "missing_quoted_at") return "horodatage prix absent";
    // P2.3 — fallback générique et diagnostic absent (B.9 / B.10)
    if (v === "quote_unsafe") return "prix non fiable";
    if (v === "quote_quality_missing") return "diagnostic absent";
    if (v.startsWith("abnormal_spread")) return v.replace("abnormal_spread:", "écart ");
    if (v.startsWith("stale:")) return v.replace("stale:", "périmé · ");
    return v;
  }
  // === fin helpers vague B.8 =========================================

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

  // Horaires de bourse par devise — chaque exchange a ses heures locales
  // et son fuseau. Avant ce helper, getMarketStatus traitait TOUTES les
  // actions comme NYSE (14:30–21:00 UTC) — donc NESN.SW affichait
  // "16:30–23:00" alors que SIX Zurich ouvre en réalité 09:00–17:30 CET.
  function getExchangeInfo(symbol) {
    const ccy = (typeof currencyForSymbol === "function") ? currencyForSymbol(symbol) : "USD";
    if (ccy === "EUR") return { tz: "Europe/Paris", label: "EU", openH: 9, openM: 0, closeH: 17, closeM: 30 };
    if (ccy === "CHF") return { tz: "Europe/Zurich", label: "SIX", openH: 9, openM: 0, closeH: 17, closeM: 30 };
    if (ccy === "GBP") return { tz: "Europe/London", label: "LSE", openH: 8, openM: 0, closeH: 16, closeM: 30 };
    if (ccy === "SEK") return { tz: "Europe/Stockholm", label: "OMX", openH: 9, openM: 0, closeH: 17, closeM: 30 };
    if (ccy === "NOK") return { tz: "Europe/Oslo", label: "Oslo", openH: 9, openM: 0, closeH: 16, closeM: 30 };
    if (ccy === "DKK") return { tz: "Europe/Copenhagen", label: "CPH", openH: 9, openM: 0, closeH: 17, closeM: 0 };
    return { tz: "America/New_York", label: "NYSE", openH: 9, openM: 30, closeH: 16, closeM: 0 };
  }

  // Renvoie {day, mins} = jour de la semaine (0=dim … 6=sam) et minutes
  // depuis minuit, dans le fuseau passé en argument. Utilise Intl pour
  // gérer DST automatiquement (CET vs CEST, GMT vs BST, EST vs EDT).
  function nowInTz(tz) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, weekday: "short",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
    const parts = fmt.formatToParts(new Date());
    const weekday = parts.find(p => p.type === "weekday").value;
    const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
    const minute = parseInt(parts.find(p => p.type === "minute").value, 10);
    const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    return { day: map[weekday] ?? 0, mins: hour * 60 + minute };
  }

  // Convertit une heure locale d'une bourse (ex. 09:30 NY) en heure Paris
  // formatée "HH:MM". Géré via Intl pour les DST.
  function localHourToParis(srcTz, localH, localM) {
    const now = new Date();
    const dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: srcTz, year: "numeric", month: "2-digit", day: "2-digit"
    });
    const [y, m, d] = dateFmt.format(now).split("-").map(Number);
    const guess = new Date(Date.UTC(y, m - 1, d, localH, localM));
    const checkFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: srcTz, hour: "2-digit", minute: "2-digit", hour12: false
    });
    const parts = checkFmt.formatToParts(guess);
    const gotH = parseInt(parts.find(p => p.type === "hour").value, 10);
    const gotM = parseInt(parts.find(p => p.type === "minute").value, 10);
    const diffMin = (localH * 60 + localM) - (gotH * 60 + gotM);
    const corrected = new Date(guess.getTime() + diffMin * 60 * 1000);
    return corrected.toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
    });
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
    function pad(n) { return String(n).padStart(2, "0"); }

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

    // Jour férié : on court-circuite le calcul d'horaires et on signale
    // explicitement à l'utilisateur que la bourse est fermée pour cause
    // de fête. Le worker applique le même garde-fou pour ne pas tenter
    // d'ouvrir un trade ce jour-là (cf. isTrainingCandidateAllowed).
    if (isMarketHoliday(symbol)) {
      const ex = getExchangeInfo(symbol);
      const hoursLabel = `${localHourToParis(ex.tz, ex.openH, ex.openM)}–${localHourToParis(ex.tz, ex.closeH, ex.closeM)}`;
      return { open: false, status: "holiday", label: "Ferie", detail: `Bourse fermée aujourd'hui · ${hoursLabel} (${ex.label})` };
    }

    // stock / etf — horaires routés par bourse via la devise du symbole.
    // L'ouverture/fermeture est calculée dans le fuseau de la bourse (pour
    // savoir si elle est ouverte en ce moment), mais les heures affichées
    // sont CONVERTIES EN HEURE PARIS pour que l'utilisateur les lise dans
    // son propre fuseau (ex. NYSE 09:30 NY → 15:30 Paris).
    const ex = getExchangeInfo(symbol);
    const { day, mins } = nowInTz(ex.tz);
    const openMins = ex.openH * 60 + ex.openM;
    const closeMins = ex.closeH * 60 + ex.closeM;
    const hoursLabel = `${localHourToParis(ex.tz, ex.openH, ex.openM)}–${localHourToParis(ex.tz, ex.closeH, ex.closeM)}`;
    const isUS = ex.label === "NYSE";

    if (day === 0 || day === 6) {
      return { open: false, status: "closed", label: "Ferme", detail: `Lun–Ven ${hoursLabel} (${ex.label})` };
    }
    if (mins >= openMins && mins < closeMins) {
      return { open: true, status: "open", label: "Ouvert", detail: `Ferme dans ${countdown(closeMins - mins)} · ${hoursLabel} (${ex.label})` };
    }
    // Pré-marché US uniquement (4h avant ouverture régulière).
    if (isUS && mins >= openMins - 5 * 60 && mins < openMins) {
      return { open: false, status: "premarket", label: "Pre-marche", detail: `Ouvre dans ${countdown(openMins - mins)} · ${hoursLabel} (${ex.label})` };
    }
    // Après-bourse US uniquement (4h après clôture).
    if (isUS && mins >= closeMins && mins < closeMins + 4 * 60 && day <= 4) {
      return { open: false, status: "afterhours", label: "Apres-bourse", detail: `Seance terminee · ${hoursLabel} demain (${ex.label})` };
    }
    if (mins < openMins) {
      return { open: false, status: "closed", label: "Ferme", detail: `Ouvre dans ${countdown(openMins - mins)} · ${hoursLabel} (${ex.label})` };
    }
    if (day === 5) {
      return { open: false, status: "closed", label: "Ferme", detail: `${hoursLabel} · reprise lundi (${ex.label})` };
    }
    return { open: false, status: "afterhours", label: "Apres-bourse", detail: `Seance terminee · ${hoursLabel} demain (${ex.label})` };
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
    // Glow subtil sur le ring : tonalité légère pour les scores actionnables
    // (proposed / >= 80). Pour les scores neutres ou bas, pas de glow pour
    // ne pas attirer l'œil sur du bruit.
    const isHot = (tone === "proposed" || (score != null && score >= 80));
    const glowClass = isHot ? " score-ring--hot" : "";
    return `
      <div class="score-ring${glowClass}" style="--ring-color:${color}">
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

// Vrai si l'opportunité est un trade "exploration" (paper, taille réduite) issu
// du plancher d'apprentissage du moteur — à distinguer d'un vrai "Trade proposé"
// pleine confiance. Le flag vient de plan.exploration (worker buildWorkerPlan).
function rowIsExploration(item) {
  return rowTradePlan(item)?.exploration === true;
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
  const nw = state.dashboard?.newsWindow;
  const newsBlocked = !!(nw && nw.blocked);
  const newsWarning = newsBlocked ? (() => {
    const ev = nw.event || {};
    const minutes = Number(nw.minutesUntil);
    const when = Number.isFinite(minutes)
      ? (minutes < 0 ? `il y a ${-minutes} min` : `dans ${minutes} min`)
      : "imminent";
    const label = `${ev.country || ""} ${ev.title || "Événement macro"}`.trim();
    return `<div class="trade-news-warning" role="alert"><span class="nww-icon">⚠️</span><div><div class="nww-head">Événement macro high-impact ${safeText(when)}</div><div class="nww-sub">${safeText(label)} — l'auto-cycle bloque les entrées sur cette fenêtre (±30 min). Ouverture manuelle à tes risques.</div></div></div>`;
  })() : "";

  // B.14 P0.2/P1.3 — blocage manuel si la quote live n'est pas executionSafe.
  // Le backend refuse aussi (handleTradesSync), mais on bloque AVANT le clic
  // pour éviter une frustration UX et un POST inutile. Source de vérité :
  // le payload détail du backend, jamais un recalcul JS.
  const qq = d?.liveContext?.quoteQuality || null;
  const executionBlocked = (d?.liveContext?.executionBlocked === true)
    || (qq && qq.executionSafe === false);
  const blockedHuman = d?.liveContext?.executionBlockedHuman
    || (qq ? (qq.validationStatus === "missing_quoted_at" ? "Horodatage prix absent — exécution bloquée"
         : qq.validationStatus === "eod_snapshot" ? "Dernier prix disponible non exécutable"
         : qq.validationStatus === "stale" ? "Données live trop anciennes"
         : qq.validationStatus === "currency_mismatch" ? "Devise live incohérente"
         : qq.validationStatus === "abnormal_spread" ? "Prix live incohérent"
         : "Données live non exploitables") : null);
  const blockedWarning = executionBlocked
    ? `<div class="trade-news-warning" role="alert" style="border-color:rgba(255,80,80,.45);background:rgba(255,80,80,.12)"><span class="nww-icon">⛔</span><div><div class="nww-head">Exécution bloquée</div><div class="nww-sub">${safeText(blockedHuman || "Données live non exploitables — ouverture bloquée")}</div></div></div>`
    : "";

  return `
    <div class="modal-backdrop" data-cancel-trade-confirm style="position:fixed;inset:0;background:rgba(3,8,20,.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px">
      <div class="card" style="width:min(560px,100%);padding:18px 18px 16px;border:1px solid rgba(255,255,255,.12)" onclick="event.stopPropagation()">
        <div class="section-title"><span>${safeText(title)}</span><span>${safeText(d?.symbol || "—")}</span></div>
        <div class="trade-context-pill ${isCrypto ? "crypto" : "stock"}">${safeText(contextLabel)}</div>
        ${blockedWarning}
        ${newsWarning}
        <div class="kv" style="margin-top:10px">
          <div class="muted">Actif</div><div>${safeText(d?.symbol || "—")} · ${safeText(d?.name || "")}</div>
          <div class="muted">Sens</div><div>${safeText(simpleSideLabel(side || "long"))}</div>
          <div class="muted">Entree</div><div>${entry != null ? priceDisplay(entry, d?.currency) : "—"}</div>
          <div class="muted">Quantite</div><div>${quantity}</div>
          <div class="muted">Investi</div><div>${entry != null ? priceDisplay(invested, d?.currency) : "—"}</div>
          <div class="muted">Risque (1%)</div><div class="negative">~${priceDisplay(riskUsd, "USD")}</div>
          <div class="muted">Stop</div><div>${plan?.stopLoss != null ? priceDisplay(plan.stopLoss, d?.currency) : "—"}</div>
          <div class="muted">Objectif</div><div>${plan?.takeProfit != null ? priceDisplay(plan.takeProfit, d?.currency) : "—"}</div>
          <div class="muted">Ratio</div><div>${plan?.rr != null ? num(plan.rr, 2) : "—"}</div>
        </div>
        <div class="plan-reason" style="margin-top:12px">${safeText(reason)}</div>
        <div class="trade-actions" style="margin-top:14px">
          <button class="btn" data-cancel-trade-confirm>Annuler</button>
          <button class="btn trade-btn primary" data-confirm-open-trade${executionBlocked ? " disabled aria-disabled=\"true\" title=\"Exécution bloquée — données live non exploitables\"" : ""}>Confirmer le trade</button>
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

async function refreshDetailForTrade(symbol) {
  const cleanSymbol = String(symbol || "").toUpperCase();
  if (!cleanSymbol) return false;
  try {
    const detail = await api(`/api/opportunity-detail/${encodeURIComponent(cleanSymbol)}?fresh=1`, 8000);
    if (!detail?.data) return false;
    const merged = normalizeOpportunity({
      ...(detail.data || {}),
      candles: Array.isArray(detail?.data?.candles) && detail.data.candles.length
        ? detail.data.candles
        : (state.detail?.candles || [])
    });
    state.detail = merged;
    saveDetailCache(cleanSymbol, merged);
    return true;
  } catch {
    return false;
  }
}

async function confirmTradeFromModal() {
  const mode = state.tradeConfirm?.mode;
  const side = state.tradeConfirm?.side || null;
  const symbol = state.detail?.symbol || null;
  state.tradeConfirm = { open: false, mode: null, side: null };
  state.loadingDetail = true;
  render();
  const refreshed = symbol ? await refreshDetailForTrade(symbol) : false;
  state.loadingDetail = false;
  if (!refreshed) {
    state.error = "Impossible d'actualiser le prix avant l'ouverture. Réessaie.";
    render();
    return;
  }
  // B.14 P0.2 — Defense in depth front. Le backend (handleTradesSync) refuse
  // déjà, mais on bloque avant le POST pour éviter une frustration UX. La
  // vérification se fait sur le payload détail TOUT JUSTE rafraîchi.
  const d = state.detail || {};
  const qq = d?.liveContext?.quoteQuality || null;
  const executionBlocked = (d?.liveContext?.executionBlocked === true)
    || (qq && qq.executionSafe === false);
  if (executionBlocked) {
    state.error = d?.liveContext?.executionBlockedHuman
      || "Données live non exploitables — ouverture bloquée.";
    render();
    return;
  }
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
      currency: typeof item?.currency === "string" && item.currency ? item.currency : "USD",
      change24hPct: typeof item?.change24hPct === "number" ? item.change24hPct : null,
      sourceUsed: item?.sourceUsed || null,
      freshness: item?.freshness || "unknown",
      quotedAt: item?.quotedAt || null,
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
      // Diagnostic prix live (vague B.8). Préservé tel quel depuis le worker
      // (objet liveContext.quoteQuality construit par quoteQualityEngine).
      liveContext: item?.liveContext || null,
      snapshotId: item?.snapshotId || null,
      error: compactError(item?.error || item?.reasonShort || null)
    };
  }

  function saveOpportunitiesSnapshot(rows) {
    state.opportunitiesSnapshot = rows;
    writeJson(STORAGE_KEYS.opportunitiesSnapshot, rows);
  }

  function mergeOpportunityWithStored(current, stored) {
    if (!stored) return current;
    // Le fresh (`current`) gagne toujours sur le snapshot (`stored`).
    // L'ancienne logique préférait stored.price ?? current.price, ce qui
    // figeait le prix affiché sur la valeur localStorage de la dernière
    // session — NVDA pouvait montrer 208 $ alors que l'API renvoyait 235 $.
    // Le snapshot ne sert plus que pour combler les champs absents
    // (typiquement l'analyse complète si l'API a renvoyé `partial`).
    return normalizeOpportunity({
      ...stored,
      ...current,
      price: current.price ?? stored.price,
      change24hPct: current.change24hPct ?? stored.change24hPct,
      score: current.score ?? stored.score,
      officialScore: current.officialScore ?? stored.officialScore,
      decision: current.decision || stored.decision || null,
      officialDecision: current.officialDecision || stored.officialDecision || null,
      trendLabel: current.trendLabel || stored.trendLabel || null,
      officialTrendLabel: current.officialTrendLabel || stored.officialTrendLabel || null,
      officialWaitFor: current.officialWaitFor || stored.officialWaitFor || null,
      reasonShort: current.reasonShort || stored.reasonShort || null,
      plan: current.plan || stored.plan || null,
      status: current.status || stored.status || null,
      freshness: current.freshness || stored.freshness || "unknown",
      currency: current.currency || stored.currency || "USD",
      quotedAt: current.quotedAt || stored.quotedAt || null
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
    const alertCurrency = currencyForSymbol(alert.symbol);
    const body = `${alert.symbol} est ${dir} ${priceDisplay(alert.targetPrice, alertCurrency)}\nActuel : ${priceDisplay(currentPrice, alertCurrency)}`;
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
    const data = await res.json().catch(() => ({}));
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
    try {
      render();
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
      try { render(); } catch (_) { /* render crash ne doit pas figer la page */ }
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

  async function loadLearning() {
    // PR B système adaptatif — récupère les statistiques d'apprentissage par
    // bucket (setup × régime × asset_class). Filtre optionnel par mode bot.
    state.bot.learning.loading = true;
    state.bot.learning.error = null;
    render();
    try {
      const mode = state.bot.learning.filterMode || "all";
      const resp = await apiGetAuth(`/api/learning/stats?mode=${encodeURIComponent(mode)}`).catch(e => ({ _err: e?.message }));
      if (resp && resp.status === "ok" && resp.data) {
        state.bot.learning.stats = resp.data;
        state.bot.learning.lastLoadedAt = Date.now();
        state.bot.learning.error = null;
      } else {
        state.bot.learning.error = resp?._err || "Chargement impossible";
      }
    } catch (e) {
      state.bot.learning.error = e?.message || "Chargement impossible";
    } finally {
      state.bot.learning.loading = false;
      render();
    }
  }

  async function loadTradeFeedback() {
    // PR #5 Phase 2 — hydrate state.tradeFeedback (map par trade_id).
    // Route protegee par requireAdminAccess cote Worker → on DOIT passer le
    // token admin (apiGetAuth), sinon 403. On ne masque plus l'erreur en
    // silence : on l'expose dans state.tradeFeedbackError pour que l'UI
    // Analytics affiche un message clair au lieu de rester vide sans raison.
    try {
      const resp = await apiGetAuth("/api/training/feedback?limit=500");
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      const map = {};
      for (const row of rows) {
        if (row && row.trade_id) map[String(row.trade_id)] = row;
      }
      state.tradeFeedback = map;
      state.tradeFeedbackError = null;
    } catch (e) {
      const msg = e?.message || "";
      state.tradeFeedbackError = /403|401|token|admin/i.test(msg)
        ? "Accès refusé aux données d'analyse (token admin requis). Connecte-toi en mode admin pour voir le détail des trades."
        : `Impossible de charger les données d'analyse : ${msg || "erreur réseau"}`;
    }
  }

  async function loadReports() {
    // PR #9 Phase 2 — charge la liste des rapports hebdo
    state.reports.loading = true;
    state.reports.error = null;
    render();
    try {
      // Route protegee par requireAdminAccess → apiGetAuth (token admin), sinon
      // 403. On laisse l'erreur remonter au catch pour l'afficher dans l'UI au
      // lieu de la masquer avec un .catch(() => null) qui rendait la vue vide.
      const resp = await apiGetAuth("/api/reports/weekly?limit=20");
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      state.reports.list = rows;
      state.reports.error = null;
    } catch (e) {
      const msg = e?.message || "";
      state.reports.error = /403|401|token|admin/i.test(msg)
        ? "Accès refusé aux rapports (token admin requis). Connecte-toi en mode admin."
        : (msg || "Erreur de chargement");
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
    // Mode Core retiré de l'UI (2026-05-13) : tout le monde tourne en
    // exploration. On garde la colonne bot_mode en base (rétrocompat avec
    // les anciens trades) mais elle est figée à "exploration" à chaque save.
    out.bot_mode = "exploration";
    // Coerce learning_enabled strict (boolean).
    out.learning_enabled = !!out.learning_enabled;
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
    const numericKeys = ["capital_base", "max_open_positions", "max_positions_per_symbol", "max_holding_hours", "min_actionability_score", "min_dossier_score", "max_consecutive_losses", "post_stop_cooldown_hours"];
    for (const k of numericKeys) {
      if (out[k] != null && out[k] !== "") out[k] = Number(out[k]);
    }
    // Booleans explicites
    for (const k of ["allow_long", "allow_short", "mean_reversion_enabled", "require_structural_setup"]) {
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

  // Wipe complet en un clic : désactive l'auto-ouverture le temps de
  // l'opération (pour que le cron ne ré-injecte rien pendant qu'on wipe),
  // puis efface trades + positions + feedbacks + events + journal moteur,
  // puis réactive l'auto-ouverture si elle l'était avant. Résultat :
  // ardoise propre et bot opérationnel sans manip supplémentaire.
  async function wipeBotEverything() {
    if (!confirm("Tout effacer ?\n\n- trades clos\n- positions ouvertes\n- feedbacks et événements\n- journal moteur\n\nL'auto-ouverture sera désactivée le temps du wipe puis remise comme elle l'était. Cette action est irréversible.")) return;
    haptic([20, 30, 20]);
    state.bot.loading = true;
    render();
    // Lecture explicite "=== true" : si state.bot.account est null (loadBot
    // pas encore terminé ou en erreur), wasAutoOpen vaut false et on
    // n'active PAS l'auto-open par erreur en sortie.
    const wasAutoOpen = state.bot.account?.settings?.auto_open_enabled === true;
    let wipeOk = false;
    try {
      // Étape 1 : couper l'auto-ouverture si elle était active, pour qu'un
      // cycle cron ne ré-injecte pas de nouvelles positions pendant qu'on wipe.
      if (wasAutoOpen) {
        await apiPost("/api/training/settings", { auto_open_enabled: false }).catch(() => {});
      }

      // Étape 2 : wipe complet côté Supabase.
      const res = await apiPost("/api/trades/wipe", { wipeAll: true, includePositions: true });
      const summary = res?.data || {};
      wipeOk = true;

      // Étape 3 : reset du state front + tous les caches localStorage liés
      // aux trades pour éviter d'afficher un fantôme depuis le cache.
      state.trades.positions = [];
      state.trades.history = [];
      state.algoJournal = [];
      try {
        for (const k of TRADE_STORAGE.positions) localStorage.removeItem(k);
        for (const k of TRADE_STORAGE.history) localStorage.removeItem(k);
        for (const k of TRADE_STORAGE.algoJournal) localStorage.removeItem(k);
        localStorage.removeItem(TRADE_STORAGE.positionsBackup);
        localStorage.removeItem(TRADE_STORAGE.historyBackup);
        localStorage.removeItem(TRADE_STORAGE.algoJournalBackup);
      } catch {}

      await loadBot();

      alert(`Effacé : ${summary.deletedTrades || 0} trades · ${summary.deletedPositions || 0} positions · ${summary.deletedFeedback || 0} feedbacks · ${summary.deletedEvents || 0} events.\nLe bot continue ${wasAutoOpen ? "à ouvrir automatiquement" : "en mode manuel (auto-ouverture toujours désactivée)"}.`);
    } catch (e) {
      alert(`Erreur : ${e.message || "effacement impossible"}${wipeOk ? "" : "\nL'auto-ouverture est restaurée même en cas d'échec."}`);
    } finally {
      // Restaure l'auto-ouverture dans TOUS les cas (succès ou échec) pour
      // ne jamais laisser le bot bloqué silencieusement après une erreur.
      if (wasAutoOpen) {
        await apiPost("/api/training/settings", { auto_open_enabled: true }).catch(() => {});
      }
      state.bot.loading = false;
      render();
    }
  }
  async function loadDashboard() {
    try {
      const [portfolio, news, newsWindow] = await Promise.all([
        api("/api/portfolio/summary").catch(() => null),
        api("/api/news").catch(() => null),
        api("/api/news-window").catch(() => null)
      ]);
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
      // Portfolio = onglet Trades fusionné (PR fusion onglets). Au load on
      // tire bot account + reports en parallèle pour que les sections
      // intégrées (Bot d'entrainement, Paramètres bot, Rapport hebdo) aient
      // leurs données fraîches.
      if (route === "portfolio" && isSessionValid()) {
        loadBot().catch(() => {});
        loadReports().catch(() => {});
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
    // Priorité : safetyScore brut (= "Score de sûreté" affiché sur la
    // fiche détail) AVANT officialScore (composite avec bonus régime/news).
    // Avant cette inversion, la carte opportunité montrait 69 (composite)
    // alors que la fiche montrait 55 (sûreté) pour le même actif → user
    // perdu. Maintenant les deux affichent le même chiffre brut. Les
    // bonus restent visibles via les chips séparés sur la carte.
    const raw = Number(
      source?.plan?.safetyScore ??
      source?.safetyScore ??
      source?.officialScore ??
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

  // Score réellement utilisé pour la décision moteur (directionalOpportunityScore).
  // C'est lui qu'on affiche dans le cercle pour que le chiffre corresponde à la
  // décision (cf. correction cohérence affichage). plan.decisionScore est posé
  // par buildWorkerPlan côté worker dans les deux chemins.
  function decisionScoreFrom(source) {
    const raw = Number(
      source?.plan?.decisionScore ??
      source?.decisionScore ??
      NaN
    );
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
  }

  // Score officiel (= sûreté composite côté worker). Sert de repli si la
  // décision n'a pas de decisionScore.
  function officialScoreFrom(source) {
    const raw = Number(
      source?.officialScore ??
      source?.plan?.safetyScore ??
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
  // Le cercle affiche le score utilisé pour la décision (decisionScore), avec
  // repli officialScore puis score brut. Le ton et le libellé restent pilotés
  // par la décision (cf. safetyTone/safetyLabel) → cohérence chiffre ↔ couleur
  // ↔ décision. Le détail complet (sûreté, brut…) est rendu sous la carte.
  const score = decisionScoreFrom(item) ?? officialScoreFrom(item) ?? dossierScoreFrom(item) ?? actionabilityScoreFrom(item);
  const tone = safetyTone(score, item);
  const label = safetyLabel(score, item);
  return { score, tone, label };
}

// Phrase d'explication alignée sur la décision — lève l'incohérence perçue
// "score élevé mais Pas de trade" / "score bas mais Trade proposé".
function opportunityScoreExplain(item, plan, decisionState) {
  const dec = decisionScoreFrom(item);
  const saf = safetyScoreFrom(item);
  const brut = dossierScoreFrom(item);
  const blocker = shortBlockerLabel(plan, item);
  if (rowIsExploration(item)) {
    return `Trade exploration : décision ${dec ?? "—"} / sûreté ${saf ?? "—"} · taille réduite (paper, pas pleine confiance)`;
  }
  if (decisionState.key === "pas_de_trade") {
    if (brut != null && brut >= 65) return `Score brut élevé (${brut}), mais bloqué par : ${blocker}`;
    return `Pas actionnable maintenant : ${blocker}`;
  }
  if (decisionState.key === "a_surveiller") {
    return `À surveiller : ${blocker}`;
  }
  return `Trade proposé : sûreté ${saf ?? "—"}/100`;
}

// Détail discret des scores réels derrière la décision (point lisibilité).
function renderScoreBreakdown(item, plan) {
  const dec = decisionScoreFrom(item);
  const saf = safetyScoreFrom(item);
  const brut = dossierScoreFrom(item);
  const conf = Number(plan?.confirmationCount ?? item?.confirmationCount ?? 0) || 0;
  const blocker = shortBlockerLabel(plan, item);
  return `<div class="opp-score-detail muted">
    <span>Décision <b>${dec ?? "—"}</b></span>
    <span>Sûreté <b>${saf ?? "—"}</b></span>
    <span>Brut <b>${brut ?? "—"}</b></span>
    <span>Confirmations <b>${conf}</b></span>
    <span>Blocage : ${safeText(blocker)}</span>
  </div>`;
}

function getOpportunityCardViewModel(item) {
  const plan = rowTradePlan(item) || {};
  const decisionState = getDecisionState(item);
  const scoreState = getScoreState(item);
  const confirmationText = confirmationLabelText(plan);
  const scoreLine = scoreState.score != null
    ? `${scoreState.score}/100 · ${scoreState.label}`
    : "score de surete indisponible";
  return {
    item,
    plan,
    decisionState,
    scoreState,
    decisionLabel: decisionState.label,
    decisionTone: decisionState.tone,
    explorationBadge: rowIsExploration(item) ? badge("Exploration · paper réduit", "exploration") : "",
    trendLabel: rowTrendLabel(item),
    assetBadge: assetClassLabel(item.assetClass),
    scoreExplain: opportunityScoreExplain(item, plan, decisionState),
    scoreBreakdownHtml: renderScoreBreakdown(item, plan),
    nextActionLine: shortActionLabel(plan, item),
    confirmationText,
    riskBadge: plan?.riskQuality != null ? badge(`risque ${safeText(simpleRiskQualityLabel(plan.riskQuality))}`, riskBadgeClass(plan)) : "",
    fidelityBadge: badge(fidelityLabel(item), fidelityClass(item)),
    confirmationBadge: confirmationText ? badge(confirmationText, "neutral") : "",
    priceHtml: item.price != null ? renderPriceStack(item.price, item.currency) : "Donnee indisponible",
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


function displayPrimaryPrice(value, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "Donnee indisponible";
  const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
  const { eur, usd } = toEurAndUsd(value, currency);
  if (eur == null) return money(value, currency);
  if (mode === "USD") return usd != null ? money(usd, "USD") : money(eur, "EUR");
  return money(eur, "EUR");
}

function displaySecondaryPrice(value, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "";
  const mode = state.settings.displayCurrency || "EUR_PLUS_USD";
  if (mode === "EUR" || mode === "USD") return "";
  const { usd } = toEurAndUsd(value, currency);
  return usd != null ? money(usd, "USD") : "";
}

function renderPriceStack(value, currency = "USD") {
  const primary = displayPrimaryPrice(value, currency);
  const secondary = displaySecondaryPrice(value, currency);
  if (!secondary) return `<div class="price">${primary}</div>`;
  return `<div class="price-stack" style="display:flex;flex-direction:column;gap:2px;"><div class="price">${primary}</div><div class="muted" style="font-size:12px;">${secondary}</div></div>`;
}

function renderOppRow(item, rank) {
    const vm = getOpportunityCardViewModel(item);
    const top1 = rank === 1 && vm.decisionState.key === "trade_propose";
    const mobile = isPhoneLayout();
    // Réduit à 1 badge principal de confiance sur mobile pour éviter le
    // bruit visuel (avant : fidélité + confirmations + risque = 3 chips
    // qui se neutralisent).
    const mobileBadges = vm.confirmationBadge;

    if (mobile) {
      return `
        <div class="opp-row mobile-card ${state.settings.compactCards ? "compact" : ""}" data-symbol="${safeText(item.symbol)}" style="display:block;padding:14px 14px 16px;border-radius:22px;${top1 ? "border:1px solid rgba(0,229,160,.55); box-shadow:0 0 0 1px rgba(0,229,160,.18) inset, 0 8px 28px -8px rgba(0,229,160,.32); background:linear-gradient(135deg, rgba(0,229,160,.06) 0%, transparent 38%);" : ""}">
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
                ${vm.explorationBadge}
                ${badge(vm.trendLabel, item.direction || "")}
              </div>
              <div class="price">${vm.priceHtml}</div>
              <div class="change ${vm.changeClass}">${vm.changeText}</div>
              <div class="muted opp-note" style="font-weight:700; color:${scoreColor(vm.scoreState.score, vm.scoreState.tone)}">${safeText(vm.scoreLine)}</div>
              <div class="muted opp-note">${safeText(vm.scoreExplain)}</div>
              ${vm.scoreBreakdownHtml}
              <div class="muted opp-note">${safeText(vm.nextActionLine)}</div>
              ${(() => { const s = quoteQualityState(item); return `<div class="qq-summary qq-tone-${s.tone}" title="${safeText(quoteSourceLine(item))}">${safeText(quoteQualitySummaryLine(item))}</div>`; })()}
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            ${mobileBadges}
            ${renderMarketBadge(item.symbol, item.assetClass)}
            ${(() => { const s = quoteQualityState(item); return `<span class="qq-badge qq-tone-${s.tone}">${safeText(s.label)}</span>`; })()}
          </div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:6px">${safeText(getMarketStatus(item.symbol, item.assetClass).detail)}</div>
        </div>`;
    }

    return `
      <div class="opp-row ${state.settings.compactCards ? "compact" : ""}" data-symbol="${safeText(item.symbol)}" style="${top1 ? "border:1px solid rgba(0,229,160,.55); box-shadow:0 0 0 1px rgba(0,229,160,.18) inset, 0 8px 28px -8px rgba(0,229,160,.32); background:linear-gradient(135deg, rgba(0,229,160,.06) 0%, transparent 38%);" : ""}">
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
            ${vm.explorationBadge}
            ${badge(vm.trendLabel, item.direction || "")}
          </div>
        </div>
        <div class="price-col" style="display:flex;flex-direction:column;gap:6px;">
          <div class="price">${vm.priceHtml}</div>
          <div class="change ${vm.changeClass}">${vm.changeText}</div>
          <div class="muted opp-note" style="font-weight:700; color:${scoreColor(vm.scoreState.score, vm.scoreState.tone)}">${safeText(vm.scoreLine)}</div>
          <div class="muted opp-note">${safeText(vm.scoreExplain)}</div>
          ${vm.scoreBreakdownHtml}
          <div class="muted opp-note">${safeText(vm.nextActionLine)}</div>
          ${(() => { const s = quoteQualityState(item); return `<div class="qq-summary qq-tone-${s.tone}" title="${safeText(quoteSourceLine(item))}">${safeText(quoteQualitySummaryLine(item))}</div>`; })()}
        </div>
        <div class="badges-col" style="display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;">
          ${badge(vm.assetBadge, item.assetClass || "")}
          ${renderMarketBadge(item.symbol, item.assetClass)}
          ${(() => { const s = quoteQualityState(item); return `<span class="qq-badge qq-tone-${s.tone}">${safeText(s.label)}</span>`; })()}
          ${vm.confirmationBadge}
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

  // Filtre les news pour ne garder que les 7 derniers jours glissants, triées
  // par date desc. Utilisé par la section "Actualités" du dashboard (la page
  // News dédiée a été fusionnée dans Accueil en PR fusion onglets).
  function recentNews(items, days = 7) {
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
    return (Array.isArray(items) ? items : [])
      .filter(item => {
        const t = Date.parse(item?.publishedAt || "");
        return Number.isFinite(t) && t >= cutoffMs;
      })
      .sort((a, b) => Date.parse(b?.publishedAt || 0) - Date.parse(a?.publishedAt || 0));
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
          ${plan?.exploration === true ? badge("Exploration · paper réduit", "exploration") : ""}
          ${badge(setupLabel)}
          ${badge(regimeVm.label, regimeVm.tone)}
          ${badge(`confiance ${confidenceText}`)}
        </div>
      </div>

      <div class="grid trades-stats" style="margin-top:16px">
        ${renderTradePlanStat("Entree", plan?.entry != null ? priceDisplay(plan.entry, detail?.currency) : "—", `timing ${simpleTimingLabel(plan)}`)}
        ${renderTradePlanStat("Stop", plan?.stopLoss != null ? priceDisplay(plan.stopLoss, detail?.currency) : "—", stopPct == null ? "niveau de protection" : `${pct(stopPct)} depuis l'entree`)}
        ${renderTradePlanStat("Objectif", plan?.takeProfit != null ? priceDisplay(plan.takeProfit, detail?.currency) : "—", targetPct == null ? "niveau cible" : `${pct(targetPct)} depuis l'entree`)}
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

        ${state.dashboard.newsWindow ? `
        <div class="card" style="margin-bottom:18px;padding:14px 18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          ${renderNewsWindowWidget(state.dashboard.newsWindow)}
        </div>` : ""}

        <div class="card dashboard-hero-card" style="margin-bottom:18px">
          <div class="dashboard-hero-top" style="${mobile ? "display:block;" : ""}">
            <div>
              <div class="dashboard-hero-title">${stats.openCount} position${stats.openCount > 1 ? "s ouvertes" : " ouverte"}</div>
              <div class="dashboard-hero-subtitle">${safeText(summary.title + " · " + (summary.text || ""))}</div>
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
                      ${dashboardMetricLine("Prix", topVm.item.price != null ? priceDisplay(topVm.item.price, topVm.item.currency) : "—")}
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

        ${(() => {
          // Section Actualités : 7 derniers jours glissants, tri par date desc.
          // Anciennement onglet News dédié, fusionné dans Accueil suite à
          // refonte UI (PR fusion onglets).
          const weekItems = recentNews(state.news?.items || [], 7);
          return `
            <div class="card" style="margin-top:18px">
              <div class="section-title">
                <span>Actualités (7 derniers jours)</span>
                <span>${weekItems.length}</span>
              </div>
              ${state.news?.asOf ? `<div class="muted" style="margin-bottom:12px">Dernière mise à jour : ${safeNewsDate(state.news.asOf)}</div>` : ""}
              ${renderNewsList(weekItems, 10)}
            </div>
          `;
        })()}
      </div>
    `;
  }

  function renderOpportunities() {
    const groups = groupedOpportunities(state.filteredOpportunities || []);

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

// iPhone compactification — rangées compactes pour le breakdown (6 rangées
  // denses au lieu de 6 cartes 2x3). Label à gauche, valeur + barre à droite.
  function renderBreakdownRow(label, rawValue) {
    const value = Number(rawValue);
    const hasValue = Number.isFinite(value);
    const clampedValue = hasValue ? Math.max(0, Math.min(100, value)) : 0;
    const text = hasValue ? simpleReliabilityLabel(value) : "—";
    const tone = !hasValue ? "neutral"
               : value >= 65 ? "positive"
               : value >= 45 ? "neutral"
               : "negative";
    return `
      <div class="bd-row tone-${tone}">
        <span class="bd-label">${safeText(label)}</span>
        <span class="bd-value">${safeText(text)}</span>
        <span class="bd-bar"><span class="bd-bar-fill" style="width:${clampedValue}%"></span></span>
      </div>`;
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

  // Skeletons : placeholders animés pendant les fetchs. Reproduit
  // grossièrement la structure finale pour éviter le layout shift
  // quand la donnée arrive.
  function renderDetailSkeleton() {
    return `
      <div class="skeleton-card" style="margin-bottom:18px" aria-busy="true" aria-label="Chargement de la fiche">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px">
          <div style="flex:1;min-width:0">
            <span class="skeleton skeleton-line tall" style="width:35%"></span>
            <span class="skeleton skeleton-line short"></span>
          </div>
          <div style="flex:0 0 auto;text-align:right">
            <span class="skeleton skeleton-line huge"></span>
            <span class="skeleton skeleton-line short" style="margin-left:auto"></span>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <span class="skeleton" style="width:78px;height:22px;border-radius:999px"></span>
          <span class="skeleton" style="width:96px;height:22px;border-radius:999px"></span>
          <span class="skeleton" style="width:64px;height:22px;border-radius:999px"></span>
        </div>
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line short"></span>
      </div>
      <div class="skeleton-card" aria-busy="true">
        <span class="skeleton skeleton-line tall" style="width:30%;margin-bottom:14px"></span>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          <span class="skeleton" style="height:62px"></span>
          <span class="skeleton" style="height:62px"></span>
          <span class="skeleton" style="height:62px"></span>
          <span class="skeleton" style="height:62px"></span>
        </div>
      </div>`;
  }

  function renderAiReviewSkeleton() {
    return `
      <div aria-busy="true" aria-label="Analyse IA en cours" style="margin-top:8px">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span class="skeleton" style="width:90px;height:22px;border-radius:999px"></span>
          <span class="skeleton" style="width:110px;height:22px;border-radius:999px"></span>
        </div>
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line short"></span>
      </div>`;
  }

  function renderDetail() {
    const d = state.detail;
    return `
      <div class="screen">
        <div class="section-title"><button class="btn" data-route="opportunities">← Retour</button><span>Fiche actif</span></div>
        ${state.loadingDetail ? renderDetailSkeleton() : ""}
        ${state.error ? `<div class="error-box">${safeText(state.error)}</div>` : ""}
        ${d ? `<div class="countdown-item">
                <span class="countdown-dot"></span>
                <span class="countdown-label">Bougies</span>
                <strong>${isCryptoSymbol(d.symbol) ? "recentes" : countdownOnlyLabel("candles_non_crypto", d.symbol)}</strong>
              </div>
            </div>
          <div class="detail-layout">
            <div>
              <div class="card" style="margin-bottom:18px" data-symbol="${safeText(d.symbol || "")}">
                <div class="detail-head">
                  <div class="detail-title-wrap">
                    <div class="detail-icon">${safeText((d.symbol || "").slice(0, 4))}</div>
                    <div>
                      <div class="detail-title">${safeText(d.symbol)}</div>
                      <div class="detail-sub">${safeText(d.name || "")}</div>
                    </div>
                  </div>
                  <div>
                    <div class="detail-price">${d.price != null ? priceDisplay(d.price, d.currency) : "Donnee indisponible"}</div>
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
                ${quoteSourceLine(d) ? `<div class="quote-source-line" style="font-size:.78rem;color:var(--text-muted);margin-top:4px">${safeText(quoteSourceLine(d))}</div>` : ""}
                <div style="margin-top:10px">
                  <button class="btn btn-secondary" style="font-size:.8rem" data-open-alert-modal="${safeText(d.symbol)}" data-alert-name="${safeText(d.name || d.symbol)}" data-alert-price="${d.price != null ? d.price : ""}">+ Alerte prix</button>
                </div>
                ${renderTradePlanHero(d, currentTradePlan())}
              </div>

              <div class="card" style="margin-bottom:18px">
                <div class="section-title"><span>Lecture complementaire</span><span>${state.loadingAiReview ? "analyse..." : safeText((state.aiReview?.provider === "moteur_local") ? "lecture moteur seule" : (state.aiReview?.externalAiUsed ? "Claude" : "fallback local"))}</span></div>
                ${state.loadingAiReview ? renderAiReviewSkeleton() : state.aiReview ? `
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

              ${(() => {
                const newsItems = relatedNewsForSymbol(d.symbol, d.name);
                if (!newsItems.length) return ""; // Masque entièrement la carte si aucune news (iPhone compact)
                return `
                  <div class="card" style="margin-bottom:18px">
                    <div class="section-title"><span>News liees a l'actif</span><span>${newsItems.length}</span></div>
                    <div class="news-list">
                      ${newsItems.map((item) => `
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
                  </div>`;
              })()}

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
                  <div class="breakdown-compact" style="margin-top:14px">
                    ${renderBreakdownRow("Contexte", d.breakdown?.regime)}
                    ${renderBreakdownRow("Tendance", d.breakdown?.trend)}
                    ${renderBreakdownRow("Elan", d.breakdown?.momentum)}
                    ${renderBreakdownRow("Entrée", d.breakdown?.entryQuality)}
                    ${renderBreakdownRow("Risque", d.breakdown?.risk)}
                    ${renderBreakdownRow("Activité", d.breakdown?.participation)}
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

              ${renderQuoteQualityCard(d)}
            </div>
          </div>
        ` : (!state.loadingDetail ? `<div class="empty-state">Aucun detail charge.</div>` : "")}
      </div>`;
  }

  // Vague B.8 — bloc "Qualité du prix" sur la fiche actif. FRONT UNIQUEMENT :
  // lit les champs de liveContext.quoteQuality déjà calculés par le worker.
  function renderQuoteQualityCard(d) {
    if (!d) return "";
    const qq = quoteQualityFor(d);
    const state = quoteQualityState(d);
    const reasons = Array.isArray(qq?.reasons) ? qq.reasons.filter((r) => r && !String(r).startsWith("stale:")) : [];
    const trust = Number.isFinite(Number(qq?.trustScore)) ? Math.round(Number(qq.trustScore)) : null;
    const usable = qq ? (qq.executionSafe ? "oui" : "non") : "—";
    const usableTone = qq ? (qq.executionSafe ? "qq-tone-positive" : "qq-tone-negative") : "qq-tone-neutral";
    const validation = qq ? validationStatusLabel(qq.validationStatus) : "—";

    return `
      <div class="card" style="margin-top:18px">
        <div class="section-title"><span>Qualité du prix</span><span class="qq-badge ${state.tone ? "qq-tone-" + state.tone : ""}">${safeText(state.label)}</span></div>
        <div class="kv qq-kv">
          <div class="muted">Source</div><div>${safeText(quoteSourceShortLabel(d.sourceUsed))}</div>
          <div class="muted">Fraîcheur</div><div>${safeText(freshnessChipLabel(d.freshness))}</div>
          <div class="muted">Heure quote</div><div>${safeText(formatQuotedAtFr(d.quotedAt))}</div>
          <div class="muted">Qualité</div><div>${trust != null ? `${trust}/100` : "—"}</div>
          <div class="muted">Utilisable</div><div><span class="qq-badge ${usableTone}">${safeText(usable)}</span></div>
          <div class="muted">Statut</div><div>${safeText(validation)}</div>
        </div>
        ${reasons.length ? `<div class="qq-reasons"><span class="muted">Détail :</span> ${reasons.map((r) => `<span class="qq-reason-chip">${safeText(reasonLabel(r))}</span>`).join("")}</div>` : ""}
        <div class="qq-footnote muted">Différé = prix légalement retardé (non bloquant). Snapshot EOD = dernier prix disponible (clôture précédente).</div>
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
  const posCurrency = p.currency || snap.currency || currencyForSymbol(p.symbol);

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
  const openedAtRaw = exec.openedAt || p.openedAt || null;
  const openedAtTxt = validTradeDate(openedAtRaw)
    ? new Date(openedAtRaw).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const ms = getMarketStatus(p.symbol, inferAssetClass(p.symbol, p.assetClass));

  return `
  <div class="pos-card">
    <div class="pos-header">
      <div class="pos-header-left">
        <div class="pos-symbol">${safeText(p.symbol)}</div>
        <div class="pos-name">${safeText(snap.decision || p.tradeDecision || "Trade ouvert")}${snap.horizon || p.horizon ? ` · ${safeText(snap.horizon || p.horizon)}` : ""}</div>
        ${openedAtTxt ? `<div class="pos-opened">Ouvert ${safeText(openedAtTxt)}</div>` : ""}
      </div>
      <div class="pos-header-right">
        ${badge(simpleSideLabel(p.side), p.side)}
        ${pnlPct != null
          ? `<div class="pos-pnl ${pnlPositive ? "pos" : "neg"}">${pnlEur != null ? priceDisplay(pnlEur, "EUR") + " · " : ""}${pct(pnlPct)}</div>`
          : `<div class="pos-pnl neutral">P/L —</div>`}
      </div>
    </div>

    <div class="pos-prices">
      <div class="pos-price-item">
        <div class="pos-price-label">Entrée</div>
        <div class="pos-price-val">${hasEntry ? priceDisplay(entryPrice, posCurrency) : "—"}</div>
      </div>
      <div class="pos-price-arrow">${hasLive && hasEntry ? (livePrice >= entryPrice ? "↑" : "↓") : "→"}</div>
      <div class="pos-price-item">
        <div class="pos-price-label">Actuel ${lastLive ? `· ${lastLive}` : ""}</div>
        <div class="pos-price-val ${hasLive && hasEntry ? (livePrice >= entryPrice ? "live-up" : "live-down") : ""}">${hasLive ? priceDisplay(livePrice, posCurrency) : "—"}</div>
      </div>
      <div class="pos-market-badge">${renderMarketBadge(p.symbol, p.assetClass)}</div>
    </div>

    <div class="pos-levels">
      <div class="pos-level">
        <span class="pos-level-label">Stop</span>
        <span class="pos-level-val">${hasStop ? priceDisplay(stopPrice, posCurrency) : "—"}</span>
        ${stopDistPct != null ? `<span class="pos-level-dist ${Math.abs(stopDistPct) < 2 ? "danger" : "warn"}">${pct(stopDistPct, 1)}</span>` : ""}
      </div>
      <div class="pos-level center">
        <span class="pos-level-label">Ratio</span>
        <span class="pos-level-val">${ratio != null ? num(ratio, 2) : "—"}</span>
      </div>
      <div class="pos-level right">
        <span class="pos-level-label">Objectif</span>
        <span class="pos-level-val">${hasTP ? priceDisplay(tpPrice, posCurrency) : "—"}</span>
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
    const histCurrency = p.currency || p.analysisSnapshot?.currency || currencyForSymbol(p.symbol);
    const closedAt = displayHistoryClosedAt(p);
    const openedAt = p?.execution?.openedAt || p?.openedAt || null;
    const entryMode = trainingEntryModeMeta(p);
    const pnl = Number(p?.pnl || 0);
    const pnlPctValue = Number.isFinite(Number(p?.pnlPct)) ? Number(p.pnlPct) : null;
    const feedback = state.tradeFeedback?.[String(p.id || "")] || null;
    const feedbackBadges = renderFeedbackBadges(feedback);
    const fmtDateTime = ts => validTradeDate(ts) ? new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : null;
    const openTxt  = fmtDateTime(openedAt);
    const closeTxt = fmtDateTime(closedAt);
    const dateLine = openTxt && closeTxt
      ? `Ouvert ${openTxt} · Clos ${closeTxt}`
      : (closeTxt ? `Clos ${closeTxt}` : (openTxt ? `Ouvert ${openTxt}` : "date indisponible"));
    return `
      <div class="trade-row history simple-history-row">
        <div>
          <div class="trade-symbol">${safeText(p.symbol)}</div>
          <div class="trade-sub">${safeText(dateLine)}${entryMode ? ` · ${safeText(entryMode.label)}` : ""}</div>
          ${feedbackBadges}
        </div>
        <div>${badge(simpleSideLabel(p.side), p.side)}</div>
        <div>${badge(historyResultLabel(p), (pnl >= 0 ? "positive" : "negative"))}</div>
        <div>${entryPrice == null ? "—" : priceDisplay(entryPrice, histCurrency)}</div>
        <div>${exitPrice == null ? "—" : priceDisplay(exitPrice, histCurrency)}</div>
        <div class="${pnl >= 0 ? 'positive' : 'negative'}">${priceDisplay(pnl, "USD")} · ${pnlPctValue == null ? "—" : pct(pnlPctValue)}</div>
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
    if (value == null || value === "") return null;
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
  const rawClosedExecution = position?.closedExecution || position?.closed_execution || {};
  const exitPriceRaw = positiveOrNull(rawClosedExecution?.exitPrice ?? position?.exitPrice ?? position?.exit_price);
  const livePriceRaw = positiveOrNull(position?.live?.price);
  const pnlRaw = safeNumber(position?.pnl);
  const pnlPctRaw = safeNumber(position?.pnlPct);
  const sourceUsed = position?.sourceUsed || position?.source || rawAnalysisSnapshot?.sourceUsed || null;
  const openedAtRaw = position?.execution?.openedAt
    || position?.openedAt
    || position?.opened_at
    || rawAnalysisSnapshot?.analysisTimestamp
    || null;
  const closedAtRaw = rawClosedExecution?.closedAt
    || position?.closedAt
    || position?.closed_at
    || null;
  const closeTypeRaw = rawClosedExecution?.closeType
    || position?.closeType
    || position?.close_type
    || null;
  const inferredClosed = !!(closedAtRaw || exitPriceRaw);
  const normalizedStatus = position?.status || (inferredClosed ? "closed" : "open");
  // Fallback chain :
  //   1) snapshot.entryMode (nouvelles écritures worker)
  //   2) execution.entryMode (rétrocompat front)
  //   3) position.mode (colonne Supabase mtp_positions/mtp_trades) — couvre les
  //      trades ouverts/fermés en mode "exploration"|"core" mais sans snapshot
  //      enrichi (ex : trades avant déploiement de PR A.1).
  const positionModeRaw = String(position?.mode || "").trim().toLowerCase();
  const positionModeFallback = (positionModeRaw === "exploration" || positionModeRaw === "core") ? positionModeRaw : null;
  const entryMode = String(rawAnalysisSnapshot?.entryMode || position?.execution?.entryMode || position?.entryMode || positionModeFallback || "").trim().toLowerCase() || null;

  const sideHint = String(
    position?.side
    || position?.direction
    || rawAnalysisSnapshot?.direction
    || ""
  ).trim().toLowerCase();
  let normalizedSide;
  if (sideHint === "long" || sideHint === "buy" || sideHint === "hausse" || sideHint === "haussier") {
    normalizedSide = "long";
  } else if (sideHint === "short" || sideHint === "sell" || sideHint === "baisse" || sideHint === "baissier") {
    normalizedSide = "short";
  } else if (stopLossRaw != null && takeProfitRaw != null && stopLossRaw !== takeProfitRaw) {
    normalizedSide = takeProfitRaw > stopLossRaw ? "long" : "short";
  } else if (entryPriceRaw != null && takeProfitRaw != null && entryPriceRaw !== takeProfitRaw) {
    normalizedSide = takeProfitRaw > entryPriceRaw ? "long" : "short";
  } else {
    normalizedSide = "long";
  }

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
      openedAt: openedAtRaw,
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
      ...rawClosedExecution,
      exitPrice: exitPriceRaw,
      closedAt: closedAtRaw,
      closeType: closeTypeRaw
    },
    side: normalizedSide,
    direction: position?.direction || normalizedSide,
    openedAt: openedAtRaw,
    closedAt: closedAtRaw,
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
  // PR fix bug "historique supprimé qui réapparaît" :
  // Si tombstone actif (l'utilisateur a wipé), NE JAMAIS restaurer depuis
  // le backup. La suppression est une vérité persistée — restaurer un
  // ancien état depuis le backup local serait une régression silencieuse.
  // Source canonique : tools/quant/lib/trades-history-tombstone-v1.mjs.
  try {
    const meta = readJson(TRADE_STORAGE.meta, {});
    const tombstoneMs = Number(meta && meta.lastWipedAt);
    if (Number.isFinite(tombstoneMs) && tombstoneMs > 0) return;
  } catch (_) {
    // En cas d'erreur lecture meta, on continue avec le comportement legacy.
  }

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

  function exportTradesToCSV(subset, filenameSuffix = "") {
    const history = Array.isArray(subset)
      ? subset
      : (Array.isArray(state.trades.history) ? state.trades.history : []);
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
    a.download = `manitradepro_trades${filenameSuffix ? "_" + filenameSuffix : ""}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          ${pStat("P&amp;L total", `${totalPnlEur >= 0 ? "+" : ""}${priceDisplay(totalPnlEur, "EUR")}`, totalPnlEur >= 0 ? "positive" : "negative")}
          ${pStat("Win rate", winRate != null ? `${num(winRate, 1)}%` : "—", winRate != null && winRate >= 50 ? "positive" : "negative")}
          ${pStat("Trades fermés", String(closed.length))}
          ${pStat("Ratio R:R", rrRatio != null ? num(rrRatio, 2) : "—", rrRatio != null && rrRatio >= 1.5 ? "positive" : "")}
          ${pStat("Gain moyen", avgWinUsd != null ? `+${priceDisplay(avgWinUsd, "USD")}` : "—", "positive")}
          ${pStat("Perte moyenne", avgLossUsd != null ? priceDisplay(avgLossUsd, "USD") : "—", "negative")}
          ${pStat("Espérance/trade", expectancy != null ? `${expectancy >= 0 ? "+" : ""}${priceDisplay(expectancy, "USD")}` : "—", expectancy != null && expectancy >= 0 ? "positive" : "negative")}
          ${pStat("Positions ouvertes", String(positions.length))}
        </div>

        ${spark ? `
        <div class="card perf-curve-card">
          <div class="section-title"><span>Courbe P&amp;L cumulatif</span><span class="${totalPnlEur >= 0 ? "positive" : "negative"}">${totalPnlEur >= 0 ? "+" : ""}${priceDisplay(totalPnlEur, "EUR")}</span></div>
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
            <div class="perf-extreme-val positive">+${priceDisplay(best.pnl || 0, "USD")}</div>
          </div>` : ""}
          ${worst ? `<div class="card perf-extreme-card">
            <div class="perf-extreme-label">Pire trade</div>
            <div class="perf-extreme-sym">${safeText(worst.symbol || "—")}</div>
            <div class="perf-extreme-val negative">${priceDisplay(worst.pnl || 0, "USD")}</div>
          </div>` : ""}
        </div>` : ""}

        ${topAssets.length ? `
        <div class="card">
          <div class="section-title"><span>Actifs par P&amp;L absolu</span></div>
          <div class="perf-asset-list">
            ${topAssets.map(a => {
              const pnlUsd = a.pnl || 0;
              return `<div class="perf-asset-row">
                <span class="perf-asset-sym">${safeText(a.symbol)}</span>
                <span class="perf-asset-name">${safeText(a.name)}</span>
                <span class="perf-asset-count">${a.count} trade${a.count > 1 ? "s" : ""}</span>
                <span class="perf-asset-pnl ${pnlUsd >= 0 ? "positive" : "negative"}">${pnlUsd >= 0 ? "+" : ""}${priceDisplay(pnlUsd, "USD")}</span>
              </div>`;
            }).join("")}
          </div>
        </div>` : ""}
      </div>`;
  }

  // ============================================================
  // LIVE PAPER ANALYTICS — VISUAL INSIGHTS V1
  // PR-UI-LIVE-PAPER-INSIGHTS-1 (2026-05-22)
  // ============================================================
  // Sous-vue Analytics dans l'onglet Trade. READ-ONLY.
  //
  // Source data : trades enrichis par PR-LIVE-PAPER-ANALYTICS-1 (#249) +
  //   PR-LIVE-PAPER-EXEC-1b (#250). Champs lus depuis analysis_snapshot :
  //   - livePaperAnalytics (à l'ouverture : setupId, regime, scores,
  //     riskContext, setupAuthorization observée, warnings).
  //   - livePaperOutcome (à la clôture : signalQuality GOOD/NOISY/BAD,
  //     validationStatus OK/SUSPECT/INVALID, MAE/MFE, exitReason).
  //
  // Trades pré-PR #249 → "legacy" (badge dédié, exclus des stats avancées).
  //
  // Aucun fetch, aucun write, aucun crash si champs partiels.

  // --- Extraction défensive ---
  function extractLivePaperAnalytics(trade) {
    if (!trade || typeof trade !== "object") return null;
    return trade.livePaperAnalytics
      || (trade.analysisSnapshot && trade.analysisSnapshot.livePaperAnalytics)
      || (trade.analysis_snapshot && trade.analysis_snapshot.livePaperAnalytics)
      || null;
  }

  function extractLivePaperOutcome(trade) {
    if (!trade || typeof trade !== "object") return null;
    return trade.livePaperOutcome
      || (trade.analysisSnapshot && trade.analysisSnapshot.livePaperOutcome)
      || (trade.analysis_snapshot && trade.analysis_snapshot.livePaperOutcome)
      || null;
  }

  function isInstrumentedTrade(trade) {
    return extractLivePaperAnalytics(trade) !== null;
  }

  function lpiFiniteNumber(v) {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // --- Agrégations ---
  function lpiBuildOverview(allClosed, allOpen) {
    const open = Array.isArray(allOpen) ? allOpen : [];
    const closed = Array.isArray(allClosed) ? allClosed : [];
    const total = open.length + closed.length;
    const instrumented = [...open, ...closed].filter(isInstrumentedTrade).length;
    const legacy = total - instrumented;

    let pnlTotal = 0;
    let wins = 0;
    let losses = 0;
    let pnlCount = 0;
    for (const t of closed) {
      const p = lpiFiniteNumber(t.pnl ?? t.pnl_eur ?? extractLivePaperOutcome(t)?.pnl);
      if (p !== null) { pnlTotal += p; pnlCount++; if (p > 0) wins++; else if (p < 0) losses++; }
    }
    const winrate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : null;
    const avgPnl = pnlCount > 0 ? pnlTotal / pnlCount : null;

    // Distribution signalQuality (sur trades fermés instrumentés).
    const signalQualityCounts = { GOOD: 0, NOISY: 0, BAD: 0, UNKNOWN: 0 };
    const validationStatusCounts = { OK: 0, SUSPECT: 0, INVALID: 0, UNKNOWN: 0 };
    for (const t of closed) {
      const out = extractLivePaperOutcome(t);
      if (!out) continue;
      const sq = typeof out.signalQuality === "string" ? out.signalQuality.toUpperCase() : "UNKNOWN";
      signalQualityCounts[sq in signalQualityCounts ? sq : "UNKNOWN"]++;
      const vs = typeof out.validationStatus === "string" ? out.validationStatus.toUpperCase() : "UNKNOWN";
      validationStatusCounts[vs in validationStatusCounts ? vs : "UNKNOWN"]++;
    }

    return { total, open: open.length, closed: closed.length, instrumented, legacy, pnlTotal, wins, losses, winrate, avgPnl, signalQualityCounts, validationStatusCounts };
  }

  function lpiBuildBySetup(closedTrades) {
    const byId = new Map();
    for (const t of closedTrades) {
      const an = extractLivePaperAnalytics(t);
      const out = extractLivePaperOutcome(t);
      if (!an) continue;
      const id = an.setupId || an.engineSetupType || "UNKNOWN_SETUP";
      const entry = byId.get(id) || { setupId: id, statusRef: an.setupStatusRef || null, trades: 0, wins: 0, losses: 0, pnl: 0, pnlCount: 0, sigQ: { GOOD: 0, NOISY: 0, BAD: 0, UNKNOWN: 0 }, validation: { OK: 0, SUSPECT: 0, INVALID: 0, UNKNOWN: 0 }, regimes: new Map() };
      entry.trades++;
      const pnl = lpiFiniteNumber(t.pnl);
      if (pnl !== null) { entry.pnl += pnl; entry.pnlCount++; if (pnl > 0) entry.wins++; else if (pnl < 0) entry.losses++; }
      if (out) {
        const sq = typeof out.signalQuality === "string" ? out.signalQuality.toUpperCase() : "UNKNOWN";
        entry.sigQ[sq in entry.sigQ ? sq : "UNKNOWN"]++;
        const vs = typeof out.validationStatus === "string" ? out.validationStatus.toUpperCase() : "UNKNOWN";
        entry.validation[vs in entry.validation ? vs : "UNKNOWN"]++;
      }
      if (an.regime) {
        const c = entry.regimes.get(an.regime) || 0;
        entry.regimes.set(an.regime, c + 1);
      }
      byId.set(id, entry);
    }
    // Compute derived: WR + dominant regime.
    const arr = [];
    for (const e of byId.values()) {
      const wr = (e.wins + e.losses) > 0 ? (e.wins / (e.wins + e.losses)) * 100 : null;
      const avgPnl = e.pnlCount > 0 ? e.pnl / e.pnlCount : null;
      let dominantRegime = null;
      let dominantCount = -1;
      for (const [r, c] of e.regimes) {
        if (c > dominantCount) { dominantCount = c; dominantRegime = r; }
      }
      arr.push({ ...e, wr, avgPnl, dominantRegime });
    }
    return arr;
  }

  function lpiBuildByRegime(closedTrades) {
    const byRegime = new Map();
    for (const t of closedTrades) {
      const an = extractLivePaperAnalytics(t);
      const out = extractLivePaperOutcome(t);
      if (!an) continue;
      const r = an.regime || "UNKNOWN";
      const entry = byRegime.get(r) || { regime: r, trades: 0, wins: 0, losses: 0, pnl: 0, pnlCount: 0, sigQ: { GOOD: 0, NOISY: 0, BAD: 0, UNKNOWN: 0 }, validation: { OK: 0, SUSPECT: 0, INVALID: 0, UNKNOWN: 0 } };
      entry.trades++;
      const pnl = lpiFiniteNumber(t.pnl);
      if (pnl !== null) { entry.pnl += pnl; entry.pnlCount++; if (pnl > 0) entry.wins++; else if (pnl < 0) entry.losses++; }
      if (out) {
        const sq = typeof out.signalQuality === "string" ? out.signalQuality.toUpperCase() : "UNKNOWN";
        entry.sigQ[sq in entry.sigQ ? sq : "UNKNOWN"]++;
        const vs = typeof out.validationStatus === "string" ? out.validationStatus.toUpperCase() : "UNKNOWN";
        entry.validation[vs in entry.validation ? vs : "UNKNOWN"]++;
      }
      byRegime.set(r, entry);
    }
    const arr = [];
    for (const e of byRegime.values()) {
      const wr = (e.wins + e.losses) > 0 ? (e.wins / (e.wins + e.losses)) * 100 : null;
      const avgPnl = e.pnlCount > 0 ? e.pnl / e.pnlCount : null;
      arr.push({ ...e, wr, avgPnl });
    }
    // Ordre canon : RISK_ON, RANGE, RISK_OFF, HIGH_VOL, autres.
    const order = ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"];
    return arr.sort((a, b) => {
      const ai = order.indexOf(a.regime);
      const bi = order.indexOf(b.regime);
      if (ai === -1 && bi === -1) return a.regime.localeCompare(b.regime);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  function lpiBuildWarningsTop(allTrades, limit = 8) {
    const counts = new Map();
    let tradesWithWarnings = 0;
    for (const t of allTrades) {
      const an = extractLivePaperAnalytics(t);
      const out = extractLivePaperOutcome(t);
      const allW = [];
      if (an && Array.isArray(an.warnings)) allW.push(...an.warnings);
      if (out && Array.isArray(out.warnings)) allW.push(...out.warnings);
      if (allW.length > 0) tradesWithWarnings++;
      for (const w of allW) {
        if (typeof w !== "string") continue;
        // Bucketise les warnings paramétrés (ex. "ctx3_would_block:regime_blocked:RISK_OFF"
        // → bucket "ctx3_would_block"). Garde la chaîne complète pour les courts.
        const bucket = w.split(":")[0] || w;
        counts.set(bucket, (counts.get(bucket) || 0) + 1);
      }
    }
    const arr = [...counts.entries()].map(([w, c]) => ({ warning: w, count: c }));
    arr.sort((a, b) => b.count - a.count);
    return { tradesWithWarnings, top: arr.slice(0, limit) };
  }

  function lpiBuildRecentInstrumented(allTrades, limit = 20) {
    const onlyInstrumented = allTrades.filter(isInstrumentedTrade);
    // Tri : closedAt DESC (ou openedAt si pas fermé).
    onlyInstrumented.sort((a, b) => {
      const ta = Date.parse(a.closedAt || a.openedAt || 0) || 0;
      const tb = Date.parse(b.closedAt || b.openedAt || 0) || 0;
      return tb - ta;
    });
    return onlyInstrumented.slice(0, limit);
  }

  // --- Rendu HTML ---
  function lpiBadgeSignalQuality(sq) {
    const cls = sq === "GOOD" ? "lpi-badge-good"
              : sq === "NOISY" ? "lpi-badge-noisy"
              : sq === "BAD" ? "lpi-badge-bad"
              : "lpi-badge-unknown";
    return `<span class="lpi-badge ${cls}">${safeText(sq || "UNKNOWN")}</span>`;
  }

  function lpiBadgeValidation(vs) {
    const cls = vs === "OK" ? "lpi-badge-ok"
              : vs === "SUSPECT" ? "lpi-badge-suspect"
              : vs === "INVALID" ? "lpi-badge-invalid"
              : "lpi-badge-unknown";
    return `<span class="lpi-badge ${cls}">${safeText(vs || "UNKNOWN")}</span>`;
  }

  function lpiBadgeRegime(r) {
    const cls = r === "RISK_ON" ? "lpi-badge-risk-on"
              : r === "RANGE" ? "lpi-badge-range"
              : r === "RISK_OFF" ? "lpi-badge-risk-off"
              : r === "HIGH_VOL" ? "lpi-badge-high-vol"
              : "lpi-badge-unknown";
    return `<span class="lpi-badge ${cls}">${safeText(r || "UNKNOWN")}</span>`;
  }

  function lpiFmtPnl(v) {
    const n = lpiFiniteNumber(v);
    if (n === null) return "—";
    const sign = n > 0 ? "+" : "";
    return `<span class="${n > 0 ? "lpi-profit" : n < 0 ? "lpi-loss" : ""}">${sign}${n.toFixed(2)}</span>`;
  }

  function lpiFmtPct(v) {
    const n = lpiFiniteNumber(v);
    if (n === null) return "—";
    return `${n.toFixed(1)}%`;
  }

  function renderTradesAnalyticsSection() {
    const closed = Array.isArray(state.trades.history) ? state.trades.history : [];
    const open = Array.isArray(state.trades.positions) ? state.trades.positions : [];
    const all = [...open, ...closed];

    const overview = lpiBuildOverview(closed, open);
    const bySetup = lpiBuildBySetup(closed);
    const byRegime = lpiBuildByRegime(closed);
    const warnings = lpiBuildWarningsTop(all);
    const recent = lpiBuildRecentInstrumented(all);

    // Message d'erreur clair si le chargement du feedback a échoué (ex : 403
    // token admin manquant). On ne laisse plus la vue vide sans explication.
    const feedbackErrorHtml = state.tradeFeedbackError
      ? `<div class="lpi-error" role="alert">⚠️ ${safeText(state.tradeFeedbackError)}</div>`
      : "";

    // État vide explicite (aucun trade instrumenté du tout).
    if (overview.instrumented === 0) {
      return `
        <div class="card lpi-section" id="trades-analytics">
          <div class="section-title">📊 Analytics</div>
          ${feedbackErrorHtml}
          <div class="empty-state">
            Les prochains trades paper analysés apparaîtront ici.
            ${overview.legacy > 0 ? `<br/><small>${overview.legacy} trade(s) legacy détecté(s) (avant instrumentation).</small>` : ""}
          </div>
        </div>`;
    }

    // --- Section 1 : Overview ---
    const overviewHtml = `
      <div class="lpi-overview-grid">
        <div class="lpi-stat-card"><div class="lpi-stat-label">Ouverts</div><div class="lpi-stat-value">${overview.open}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">Fermés</div><div class="lpi-stat-value">${overview.closed}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">Instrumentés</div><div class="lpi-stat-value">${overview.instrumented}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">Legacy</div><div class="lpi-stat-value">${overview.legacy}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">PnL total</div><div class="lpi-stat-value">${lpiFmtPnl(overview.pnlTotal)}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">Winrate</div><div class="lpi-stat-value">${overview.winrate !== null ? lpiFmtPct(overview.winrate) : "—"}</div></div>
        <div class="lpi-stat-card"><div class="lpi-stat-label">PnL moyen</div><div class="lpi-stat-value">${lpiFmtPnl(overview.avgPnl)}</div></div>
      </div>
      <div class="lpi-distribution">
        <div class="lpi-distribution-label">Qualité signal</div>
        <div class="lpi-distribution-row">
          ${lpiBadgeSignalQuality("GOOD")} ${overview.signalQualityCounts.GOOD}
          ${lpiBadgeSignalQuality("NOISY")} ${overview.signalQualityCounts.NOISY}
          ${lpiBadgeSignalQuality("BAD")} ${overview.signalQualityCounts.BAD}
          ${lpiBadgeSignalQuality("UNKNOWN")} ${overview.signalQualityCounts.UNKNOWN}
        </div>
        <div class="lpi-distribution-label">Validation</div>
        <div class="lpi-distribution-row">
          ${lpiBadgeValidation("OK")} ${overview.validationStatusCounts.OK}
          ${lpiBadgeValidation("SUSPECT")} ${overview.validationStatusCounts.SUSPECT}
          ${lpiBadgeValidation("INVALID")} ${overview.validationStatusCounts.INVALID}
          ${lpiBadgeValidation("UNKNOWN")} ${overview.validationStatusCounts.UNKNOWN}
        </div>
      </div>`;

    // --- Section 2 : Setup insights ---
    bySetup.sort((a, b) => b.pnl - a.pnl);
    const setupRows = bySetup.length === 0
      ? `<tr><td colspan="6" class="lpi-empty-row">Aucun setup instrumenté pour l'instant.</td></tr>`
      : bySetup.map(s => `
        <tr>
          <td><code>${safeText(s.setupId)}</code>${s.statusRef ? `<br/><small class="lpi-muted">${safeText(s.statusRef)}</small>` : ""}</td>
          <td class="lpi-num">${s.trades}</td>
          <td class="lpi-num">${s.wr !== null ? lpiFmtPct(s.wr) : "—"}</td>
          <td class="lpi-num">${lpiFmtPnl(s.pnl)}</td>
          <td>${s.dominantRegime ? lpiBadgeRegime(s.dominantRegime) : "—"}</td>
          <td><small>G ${s.sigQ.GOOD} · N ${s.sigQ.NOISY} · B ${s.sigQ.BAD}</small></td>
        </tr>`).join("");
    const setupTableHtml = `
      <div class="lpi-subtitle">Par setup</div>
      <div class="lpi-table-wrap">
        <table class="lpi-table">
          <thead><tr><th>Setup</th><th class="lpi-num">N</th><th class="lpi-num">WR</th><th class="lpi-num">PnL</th><th>Régime dom.</th><th>Qualité</th></tr></thead>
          <tbody>${setupRows}</tbody>
        </table>
      </div>`;

    // --- Section 3 : Régimes ---
    const regimeRows = byRegime.length === 0
      ? `<tr><td colspan="5" class="lpi-empty-row">Aucun régime exploitable pour l'instant.</td></tr>`
      : byRegime.map(r => `
        <tr>
          <td>${lpiBadgeRegime(r.regime)}</td>
          <td class="lpi-num">${r.trades}</td>
          <td class="lpi-num">${r.wr !== null ? lpiFmtPct(r.wr) : "—"}</td>
          <td class="lpi-num">${lpiFmtPnl(r.pnl)}</td>
          <td><small>G ${r.sigQ.GOOD} · N ${r.sigQ.NOISY} · B ${r.sigQ.BAD}</small></td>
        </tr>`).join("");
    const regimeTableHtml = `
      <div class="lpi-subtitle">Par régime</div>
      <div class="lpi-table-wrap">
        <table class="lpi-table">
          <thead><tr><th>Régime</th><th class="lpi-num">N</th><th class="lpi-num">WR</th><th class="lpi-num">PnL</th><th>Qualité</th></tr></thead>
          <tbody>${regimeRows}</tbody>
        </table>
      </div>`;

    // --- Section 4 : Warnings ---
    const warningsHtml = warnings.top.length === 0
      ? `<div class="lpi-muted lpi-small">Aucun warning relevé sur la cohorte instrumentée.</div>`
      : `
        <div class="lpi-muted lpi-small">${warnings.tradesWithWarnings} trade(s) avec warnings — top fréquences :</div>
        <div class="lpi-warning-list">
          ${warnings.top.map(w => `<span class="lpi-warning-item"><code>${safeText(w.warning)}</code> <small>×${w.count}</small></span>`).join(" ")}
        </div>`;
    const warningsSection = `
      <div class="lpi-subtitle">Warnings observés</div>
      ${warningsHtml}`;

    // --- Section 5 : Derniers trades ---
    const recentRows = recent.length === 0
      ? `<tr><td colspan="8" class="lpi-empty-row">Aucun trade instrumenté récent.</td></tr>`
      : recent.map(t => {
          const an = extractLivePaperAnalytics(t) || {};
          const out = extractLivePaperOutcome(t) || {};
          const isOpen = !(t.closedAt || out.closedAt);
          const date = t.closedAt || t.openedAt || "";
          const dateShort = date ? new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—";
          const setupShort = an.setupId || an.engineSetupType || "—";
          const regimeShort = an.regime || "—";
          const sq = out.signalQuality || (isOpen ? "—" : "UNKNOWN");
          const vs = out.validationStatus || (isOpen ? "—" : "UNKNOWN");
          const pnl = isOpen ? "—" : lpiFmtPnl(t.pnl);
          const exit = isOpen ? "<small class='lpi-muted'>ouvert</small>" : safeText(out.exitReason || t.closeType || "—");
          const warns = [...(an.warnings || []), ...(out.warnings || [])].slice(0, 2);
          const warnHtml = warns.length === 0 ? "" : warns.map(w => `<small class="lpi-warning-pill">${safeText((w || "").split(":")[0])}</small>`).join("");
          return `
            <tr>
              <td><small>${safeText(dateShort)}</small></td>
              <td><strong>${safeText(t.symbol || "—")}</strong></td>
              <td><small><code>${safeText(setupShort)}</code></small></td>
              <td>${lpiBadgeRegime(regimeShort)}</td>
              <td>${sq === "—" ? "—" : lpiBadgeSignalQuality(sq)}</td>
              <td>${vs === "—" ? "—" : lpiBadgeValidation(vs)}</td>
              <td class="lpi-num">${pnl}</td>
              <td><small>${exit}</small> ${warnHtml}</td>
            </tr>`;
        }).join("");
    const recentTableHtml = `
      <div class="lpi-subtitle">Derniers trades instrumentés</div>
      <div class="lpi-table-wrap lpi-table-scroll">
        <table class="lpi-table lpi-table-compact">
          <thead><tr><th>Date</th><th>Symb</th><th>Setup</th><th>Régime</th><th>Signal</th><th>Valid.</th><th class="lpi-num">PnL</th><th>Sortie</th></tr></thead>
          <tbody>${recentRows}</tbody>
        </table>
      </div>`;

    return `
      <div class="card lpi-section" id="trades-analytics">
        <div class="section-title">📊 Analytics — Live Paper Insights</div>
        <div class="lpi-muted lpi-small">Vérité marché visible — lecture seule. Source : <code>livePaperAnalytics</code> + <code>livePaperOutcome</code>.</div>
        ${feedbackErrorHtml}
        ${overviewHtml}
        ${setupTableHtml}
        ${regimeTableHtml}
        ${warningsSection}
        ${recentTableHtml}
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
          <div class="screen-title">Trades</div>
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
              <div class="wallet-val">${priceDisplay(stats.wallet.availableEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">Engagé</div>
              <div class="wallet-val">${priceDisplay(stats.wallet.engagedEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">P/L latent</div>
              <div class="wallet-val ${stats.wallet.unrealizedEur >= 0 ? "positive" : "negative"}">${priceDisplay(stats.wallet.unrealizedEur, "EUR")}</div>
            </div>
            <div class="wallet-item">
              <div class="wallet-label">P/L réalisé</div>
              <div class="wallet-val ${stats.wallet.realizedEur >= 0 ? "positive" : "negative"}">${priceDisplay(stats.wallet.realizedEur, "EUR")}</div>
            </div>
            <div class="wallet-item wallet-item-equity">
              <div class="wallet-label">Equity</div>
              <div class="wallet-val">${priceDisplay(stats.wallet.equityEur, "EUR")}</div>
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
                  <span class="class-perf-pnl ${cryptoStats.realizedEur >= 0 ? "positive" : "negative"}">${priceDisplay(cryptoStats.realizedEur, "EUR")}</span>
                  <span class="class-perf-wr">${cryptoStats.winRate != null ? num(cryptoStats.winRate,0)+"%" : "—"} win</span>
                </div>
              ` : ""}
              ${stockStats.closedCount > 0 ? `
                <div class="class-perf-item stock">
                  <span class="class-perf-dot">●</span>
                  <span class="class-perf-name">Actions/ETF</span>
                  <span class="class-perf-trades">${stockStats.closedCount} trades</span>
                  <span class="class-perf-pnl ${stockStats.realizedEur >= 0 ? "positive" : "negative"}">${priceDisplay(stockStats.realizedEur, "EUR")}</span>
                  <span class="class-perf-wr">${stockStats.winRate != null ? num(stockStats.winRate,0)+"%" : "—"} win</span>
                </div>
              ` : ""}
              ${cryptoStats.closedCount === 0 && stockStats.closedCount === 0 ? `<div class="muted" style="padding:8px 0;font-size:.83rem">Aucun trade fermé pour le moment.</div>` : ""}
            </div>
          ` : ""}

          <!-- POSITIONS OUVERTES -->
          <div class="card" style="margin-top:18px">
            <div class="section-title">
              <span>Positions ouvertes <span class="badge">${positions.length}</span></span>
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

          <!-- IA OUTILS : seulement utile s'il y a des trades à analyser -->
          ${history.length ? renderJournalAnalysisCard() : ""}

          ${state.settings.showAlgoJournal ? `<div style="margin-top:8px">${renderJournalMoteurCard()}</div>` : ""}

          <!-- FUSION onglets (PR #119+) — sections bot et rapport hebdo intégrées
               dans la page Trades pour éviter les doublons d'info entre 3 onglets.
               Les "Paramètres du bot" sont retirés d'ici : ils sont maintenant
               dans l'onglet Réglages (renderBotParamsCard) pour éviter le
               double affichage et le re-render permanent qui refermait
               l'accordéon ici. -->
          ${renderBotMiniSection()}
          ${renderWeeklyReportSection()}

          ${/* PR-UI-LIVE-PAPER-INSIGHTS-1 : sous-vue Analytics READ-ONLY.
                Visualise livePaperAnalytics + livePaperOutcome. Pas de
                nouvel onglet principal, section dédiée en bas. */ ""}
          ${renderTradesAnalyticsSection()}
        `}
      </div>`;
  }

  // Section bot compacte : état Actif + dernier cycle + bouton "Lancer un cycle".
  // Volontairement minimaliste : les stats détaillées (positions, capital, P&L,
  // equity) sont déjà dans la wallet-strip plus haut.
  function renderBotMiniSection() {
    const acc = state.bot.account;
    if (!acc) return "";
    const settings = acc.settings || {};
    const enabled = !!settings.is_enabled;
    const lastCycleAt = acc.lastCycleAt || settings.last_cycle_at || null;
    const lastCycleMode = acc.lastCycleMode || settings.last_cycle_mode || null;
    let lastCycleText = "Aucun cycle enregistré";
    if (lastCycleAt) {
      const ms = Date.now() - new Date(lastCycleAt).getTime();
      const min = Math.max(0, Math.round(ms / 60000));
      const modePart = lastCycleMode ? ` · ${lastCycleMode}` : "";
      lastCycleText = min < 1 ? `Dernier cycle à l'instant${modePart}` : `Dernier cycle il y a ${min} min${modePart}`;
    }
    return `
      <div class="card" style="margin-top:18px">
        <div class="section-title">
          <span>Bot d'entrainement</span>
          <label class="bot-toggle-big" title="${enabled ? "Désactiver le bot" : "Activer le bot"}">
            <input type="checkbox" data-bot-toggle="is_enabled" ${enabled ? "checked" : ""}>
            <span class="bot-toggle-slider"></span>
          </label>
        </div>
        <div class="muted" style="margin-top:6px">${safeText(lastCycleText)}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-force-cycle ${state.bot.forcingCycle ? "disabled" : ""}>${state.bot.forcingCycle ? "Cycle en cours…" : "Lancer un cycle"}</button>
        </div>
      </div>`;
  }

  // (renderBotParamsSection retirée — la carte Paramètres du bot est
  // maintenant dans l'onglet Réglages via renderBotParamsCard.)

  // Rapport hebdo Claude — affiche le dernier rapport en markdown si dispo,
  // sinon un message expliquant la mise à jour hebdomadaire (lundi 8h CEST).
  function renderWeeklyReportSection() {
    const list = Array.isArray(state.reports?.list) ? state.reports.list : [];
    const latest = list[0] || null;
    const summary = latest
      ? `Rapport hebdo Claude — semaine du ${safeText(latest.week_start || "?")}`
      : `Rapport hebdo Claude`;
    return `
      <details class="card bot-params-card">
        <summary class="bot-collapsible-summary"><span>${summary}</span></summary>
        <div>
          ${latest
            ? `<div class="report-markdown">${renderMarkdown(latest.report_markdown || "")}</div>`
            : `<div class="muted">Aucun rapport pour l'instant. Le bot en produit un chaque lundi à 8h (heure de Paris) si au moins un trade a été clos dans la semaine.</div>`}
        </div>
      </details>`;
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
            <div class="alert-cond">${dir} ${priceDisplay(a.targetPrice, currencyForSymbol(a.symbol))}</div>
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
          <div class="modal-desc">${safeText(name)}${currentPrice != null ? ` · Prix actuel\u00a0: ${priceDisplay(currentPrice, currencyForSymbol(symbol))}` : ""}</div>
          <select class="setting-input" id="alert-condition" style="margin-bottom:10px">
            <option value="above">Au-dessus de</option>
            <option value="below">En-dessous de</option>
          </select>
          <input class="setting-input pin-input" type="number" inputmode="decimal" id="alert-target-price" placeholder="Prix cible (${safeText(currencyForSymbol(symbol))})" step="any" ${currentPrice != null ? `value="${currentPrice}"` : ""}>
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
      const evCurrency = currencyForSymbol(ev.symbol);
      summary = `Ouverture ${safeText(ev.symbol || "")} @ ${priceDisplay(payload.entry_price, evCurrency)} · stop ${priceDisplay(payload.stop_loss, evCurrency)} · cible ${priceDisplay(payload.take_profit, evCurrency)}`;
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
              <div class="report-meta">${Number(stats.total) || 0} trades · ${stats.winRate != null ? Math.round(Number(stats.winRate) * 100) + "% win" : "—"} · <span class="${pnlTone}">${priceDisplay(pnl, "USD")}</span>${r.corrections_applied ? ` · ${Number(r.corrections_applied) || 0} corr.` : ""} ${statusBadge}</div>
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

  function renderBotSubTabs() {
    const sub = state.bot.subTab || "stats";
    return `<div class="bot-subtabs" role="tablist">
      <button class="bot-subtab ${sub==="stats"?"active":""}" data-bot-subtab="stats" role="tab">État</button>
      <button class="bot-subtab ${sub==="performance"?"active":""}" data-bot-subtab="performance" role="tab">Performance</button>
      <button class="bot-subtab ${sub==="health"?"active":""}" data-bot-subtab="health" role="tab">Santé</button>
      <button class="bot-subtab ${sub==="learning"?"active":""}" data-bot-subtab="learning" role="tab">Apprentissage</button>
    </div>`;
  }

  function fmtPct(v) {
    return Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(1)}%` : "—";
  }
  function fmtPctSigned(v) {
    if (!Number.isFinite(Number(v))) return "—";
    const n = Number(v);
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
  }
  function fmtMinutes(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    if (n < 60) return `${Math.round(n)} min`;
    const h = n / 60;
    if (h < 48) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} j`;
  }

  function renderBotLearning() {
    if (!isSessionValid()) {
      return `
        <div class="screen">
          <div class="screen-header">
            <div class="screen-title">Apprentissage</div>
            <div class="screen-subtitle">Connecte-toi (PIN) pour voir ce que le bot a appris.</div>
          </div>
        </div>`;
    }
    const learning = state.bot.learning || { stats: null, loading: false, error: null, filterMode: "all", showUnknown: false };
    const stats = learning.stats;
    const allBuckets = Array.isArray(stats?.buckets) ? stats.buckets : [];
    const showUnknown = !!learning.showUnknown;
    const isUnknownBucket = (b) => (b.setupType === "unknown" || b.setupType === "aucun" || b.setupType === "no_structural_setup")
      && (b.regime === "unknown" || b.regime === "UNKNOWN");
    const buckets = showUnknown ? allBuckets : allBuckets.filter(b => !isUnknownBucket(b));
    const hiddenUnknownCount = allBuckets.length - buckets.length;
    const allAreUnknown = allBuckets.length > 0 && buckets.length === 0;
    const totals = stats?.totals || null;
    const filterMode = learning.filterMode || "all";

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Ce que le bot a appris</div>
          <div class="screen-subtitle">Pour chaque combinaison ${"(setup × régime × actif)"}, voici son taux de réussite et son gain moyen par trade. Lecture seule — n'agit pas encore sur les décisions.</div>
        </div>

        <div class="card">
          <div class="learning-controls">
            <div class="learning-filter">
              <button type="button" class="learning-filter-btn ${filterMode==="all"?"active":""}" data-learning-filter="all">Tous les modes</button>
              <button type="button" class="learning-filter-btn ${filterMode==="exploration"?"active":""}" data-learning-filter="exploration">Exploration</button>
              <button type="button" class="learning-filter-btn ${filterMode==="core"?"active":""}" data-learning-filter="core">Core</button>
              <button type="button" class="learning-filter-btn ${filterMode==="training"?"active":""}" data-learning-filter="training">Historique</button>
            </div>
            <button class="btn btn-secondary" data-learning-reload ${learning.loading?"disabled":""}>${learning.loading?"Chargement…":"Rafraîchir"}</button>
          </div>

          ${learning.error ? `<div class="bot-risk-warn" style="margin-top:12px">${safeText(learning.error)}</div>` : ""}

          ${totals ? `
            <div class="learning-totals">
              <div class="learning-total"><div class="learning-total-label">Trades pris en compte</div><div class="learning-total-value">${totals.tradesTotal ?? 0}</div></div>
              <div class="learning-total"><div class="learning-total-label">Combinaisons matures</div><div class="learning-total-value">${totals.bucketsMature ?? 0} <span class="muted">/ ${totals.bucketsTotal ?? 0}</span></div></div>
              <div class="learning-total"><div class="learning-total-label">Gagnantes (matures)</div><div class="learning-total-value pos">${totals.bucketsPositive ?? 0}</div></div>
              <div class="learning-total"><div class="learning-total-label">Perdantes (matures)</div><div class="learning-total-value neg">${totals.bucketsNegative ?? 0}</div></div>
            </div>
            <div class="muted" style="font-size:.78rem;margin-top:8px">Une combinaison est dite « mature » à partir de ${totals.minTradesForMaturity ?? 20} trades. Les compteurs « gagnantes / perdantes » ne comptent que les matures — en dessous on collecte encore.</div>
          ` : ""}
        </div>

        ${allAreUnknown ? `
          <div class="card" style="margin-top:14px">
            <div class="muted" style="line-height:1.4">
              <strong>Tes trades ont été clos avant le tracking complet.</strong> Ils n'ont pas le setup et le régime mémorisés, donc ils sortent en « unknown ». Les nouveaux trades clos auront toutes les infos dès qu'ils tomberont. Tu peux les afficher temporairement avec le bouton ci-dessous.
            </div>
            <div style="margin-top:10px">
              <button type="button" class="btn btn-secondary" data-learning-toggle-unknown>Afficher les anciens trades sans tracking</button>
            </div>
          </div>
        ` : hiddenUnknownCount > 0 ? `
          <div class="muted" style="font-size:.78rem;margin-top:8px;padding:0 4px">
            ${hiddenUnknownCount} ancienne${hiddenUnknownCount > 1 ? "s" : ""} ligne${hiddenUnknownCount > 1 ? "s" : ""} sans tracking masquée${hiddenUnknownCount > 1 ? "s" : ""}.
            <button type="button" class="learning-link-btn" data-learning-toggle-unknown>${showUnknown ? "Masquer" : "Afficher"}</button>
          </div>
        ` : ""}

        <div class="card learning-table-card">
          ${learning.loading && buckets.length === 0
            ? `<div class="loading-state">Chargement des stats d'apprentissage…</div>`
            : buckets.length === 0
              ? `<div class="empty-state" style="padding:24px">Aucun trade à analyser pour ce filtre. Reviens quand le bot aura clos quelques positions.</div>`
              : `<div class="learning-table-wrap">${renderLearningTable(buckets)}</div>`
          }
        </div>
      </div>`;
  }

  function renderLearningTable(buckets) {
    return `
      <table class="learning-table">
        <thead>
          <tr>
            <th>Setup</th>
            <th>Sens</th>
            <th>Régime</th>
            <th>Classe</th>
            <th class="num">Trades</th>
            <th class="num">Réussite</th>
            <th class="num">Gain moyen</th>
            <th class="num">Perte moyenne</th>
            <th class="num">Espérance</th>
            <th class="num">Durée</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${buckets.map(b => {
            const expClass = b.expectancy > 0.05 ? "pos" : b.expectancy < -0.05 ? "neg" : "";
            const matureBadge = b.mature
              ? `<span class="learn-badge learn-badge-mature">actif</span>`
              : `<span class="learn-badge learn-badge-collecting">en collecte</span>`;
            return `<tr class="${b.mature ? "" : "row-collecting"}">
              <td>${safeText(b.setupType || "—")}</td>
              <td>${safeText(b.direction || "—")}</td>
              <td>${safeText(b.regime || "—")}</td>
              <td>${safeText(b.assetClass || "—")}</td>
              <td class="num">${b.n}</td>
              <td class="num">${fmtPct(b.winrate)}</td>
              <td class="num pos">${fmtPctSigned(b.gainAvg)}</td>
              <td class="num neg">${fmtPctSigned(b.lossAvg)}</td>
              <td class="num ${expClass}"><strong>${fmtPctSigned(b.expectancy)}</strong></td>
              <td class="num muted">${fmtMinutes(b.holdingAvgMinutes)}</td>
              <td>${matureBadge}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  // Onglet "Bot" unifié (PR ui-cleanup-session2) — fusionne État, Performance,
  // Santé en un seul onglet avec 3 sous-onglets cliquables. Délègue au render
  // existant (renderBot/renderPerformance/renderHealth) puis injecte la barre
  // de sous-onglets juste après le `<div class="screen">` ouvrant.
  function renderBotUnified() {
    const sub = state.bot.subTab || "stats";
    const inner = sub === "performance" ? renderPerformance()
                : sub === "health" ? renderHealth()
                : sub === "learning" ? renderBotLearning()
                : renderBot();
    return inner.replace('<div class="screen">', `<div class="screen">${renderBotSubTabs()}`);
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
    // openCount = nombre de positions taggées "algo" (= celles que le bot a
    // ouvertes lui-même). On utilise le MÊME filtre que la liste rendue plus
    // bas (botPositions, line ~6434), pour que le compteur "X/15" affiché en
    // haut corresponde toujours au nombre de cartes visibles dans
    // "Positions ouvertes du bot". Sinon Supabase peut avoir des positions
    // manuelles qui inflate le compteur mais ne s'affichent pas dans le panel
    // bot, ce qui donne un compteur incohérent.
    const allOpenPositions = Array.isArray(state.trades.positions) ? state.trades.positions : [];
    const openCount = allOpenPositions.filter(p => tradeSource(p) === "algo").length;
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

    const hasStats = stats && stats.totalCount > 0;
    const statsTab = state.bot.statsTab || "setup";
    const paramsOpen = state.bot.editDraft ? true : !!state.bot.paramsOpen;

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Bot d'entrainement</div>
          <div class="screen-subtitle">Paper trading auto — capital virtuel, cycles auto toutes les 15 min pour collecter de la donnée.</div>
        </div>

        ${state.bot.error ? `<div class="error-box" style="margin-bottom:14px">${safeText(state.bot.error)}</div>` : ""}
        ${state.bot.loading && !acc ? `<div class="loading-state" style="margin-bottom:14px">Chargement du bot…</div>` : ""}

        <!-- SECTION A — État live -->
        <div class="card bot-control-card ${enabled ? "is-on" : "is-off"}">
          <div class="bot-status-row">
            <div>
              <div class="bot-status-label">État</div>
              <div class="bot-status-value ${enabled ? "on" : "off"}">
                ${enabled ? "● Actif" : "○ En pause"}
              </div>
              <div class="bot-cycle-sub ${cycleFreshness}">${safeText(lastCycleText)}</div>
            </div>
            <label class="bot-toggle-big" title="${enabled ? "Désactiver le bot" : "Activer le bot"}">
              <input type="checkbox" data-bot-toggle="is_enabled" ${enabled ? "checked" : ""}>
              <span class="bot-toggle-slider"></span>
            </label>
          </div>

          <div class="bot-stats-row">
            <div class="bot-stat">
              <div class="stat-label">Positions</div>
              <div class="stat-value">${openCount}<span class="bot-stat-sub">/${maxOpen}</span></div>
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
              Trading bloqué : ${safeText(blockerText || "limite de risque dépassée")}.
            </div>` : ""}

          <div class="bot-actions">
            <button class="btn btn-primary" data-bot-force-cycle ${state.bot.forcingCycle ? "disabled" : ""}>
              ${state.bot.forcingCycle ? "Cycle en cours…" : "Lancer un cycle"}
            </button>
            <button class="btn btn-secondary" data-bot-reload>Actualiser</button>
            <label class="bot-sub-toggle">
              <input type="checkbox" data-bot-toggle="auto_open_enabled" ${autoOpen ? "checked" : ""}>
              <span>Ouvertures auto</span>
            </label>
            <label class="bot-sub-toggle">
              <input type="checkbox" data-bot-toggle="auto_close_enabled" ${autoClose ? "checked" : ""}>
              <span>Fermetures auto</span>
            </label>
          </div>
        </div>

        <!-- SECTION B — Résultats -->
        ${hasStats ? `
          <div class="card bot-results-card">
            <div class="section-title"><span>Résultats</span><span class="muted">${stats.totalCount} trades clôturés</span></div>
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

            <div class="bot-stats-tabs" role="tablist">
              <button class="bot-stats-tab ${statsTab==="setup"?"active":""}" data-bot-stats-tab="setup" role="tab">Par setup</button>
              <button class="bot-stats-tab ${statsTab==="class"?"active":""}" data-bot-stats-tab="class" role="tab">Par classe</button>
              <button class="bot-stats-tab ${statsTab==="top"?"active":""}" data-bot-stats-tab="top" role="tab">Top</button>
              <button class="bot-stats-tab ${statsTab==="bottom"?"active":""}" data-bot-stats-tab="bottom" role="tab">À surveiller</button>
            </div>

            ${renderBotStatsTabContent(stats, statsTab)}
          </div>
        ` : (acc ? `<div class="card" style="margin-top:16px"><div class="empty-state">Aucun trade clôturé. Active le bot et laisse tourner quelques cycles.</div></div>` : "")}

        <!-- Historique des trades pris par le bot -->
        ${renderBotTradesHistory()}

        <!-- Activité récente (compacte) -->
        ${events.length ? `
          <details class="card bot-events-card" ${events.length > 0 ? "" : "open"}>
            <summary class="bot-collapsible-summary">
              <span>Activité récente</span>
              <span class="muted">${events.length} événement${events.length > 1 ? "s" : ""}</span>
            </summary>
            <div class="bot-timeline">${events.slice(0, 30).map(renderBotEventRow).join("")}</div>
          </details>
        ` : ""}

        <!-- SECTION C — Paramètres du bot déplacés vers l'onglet Réglages
             (l'auto-refresh des opportunités refermait l'accordéon ici, et
             logiquement les paramètres appartiennent aux réglages globaux). -->
      </div>`;
  }

  function renderBotParamsCard(settings, capitalBase) {
    const paramsOpen = state.bot.editDraft ? true : !!state.bot.paramsOpen;
    return `
      <details class="card bot-params-card" data-bot-params-accordion ${paramsOpen ? "open" : ""}>
        <summary class="bot-collapsible-summary">
          <span>Paramètres du bot</span>
          <span class="muted">${state.bot.editDraft ? "édition" : "lecture"}</span>
        </summary>
        ${state.bot.editDraft ? renderBotParamsForm() : renderBotParamsReadonly(settings, capitalBase)}
      </details>`;
  }

  function renderBotStatsTabContent(stats, tab) {
    if (tab === "class") {
      if (!Array.isArray(stats?.byClass) || !stats.byClass.length) {
        return `<div class="empty-state bot-tab-empty">Pas encore de données par classe d'actif.</div>`;
      }
      return `<div class="bot-breakdown">
        <div class="bot-breakdown-row bot-breakdown-head">
          <div class="bot-breakdown-label">Classe</div>
          <div class="bot-breakdown-count">N</div>
          <div class="bot-breakdown-wr">WR</div>
          <div class="bot-breakdown-pnl">P&L</div>
        </div>
        ${stats.byClass.map(c => renderBotBreakdownRow(c.class || "—", c.winRate, c.count, c.pnl)).join("")}
      </div>`;
    }
    if (tab === "top") {
      if (!Array.isArray(stats?.topSymbols) || !stats.topSymbols.length) {
        return `<div class="empty-state bot-tab-empty">Pas encore de symboles rentables.</div>`;
      }
      return `<div class="bot-breakdown">
        <div class="bot-breakdown-row bot-breakdown-head">
          <div class="bot-breakdown-label">Symbole</div>
          <div class="bot-breakdown-count">N</div>
          <div class="bot-breakdown-wr">WR</div>
          <div class="bot-breakdown-pnl">P&L</div>
        </div>
        ${stats.topSymbols.map(s => renderBotBreakdownRow(s.symbol, s.count > 0 ? s.wins / s.count : null, s.count, s.pnl)).join("")}
      </div>`;
    }
    if (tab === "bottom") {
      if (!Array.isArray(stats?.bottomSymbols) || !stats.bottomSymbols.length) {
        return `<div class="empty-state bot-tab-empty">Aucun symbole perdant significatif.</div>`;
      }
      return `<div class="bot-breakdown">
        <div class="bot-breakdown-row bot-breakdown-head">
          <div class="bot-breakdown-label">Symbole</div>
          <div class="bot-breakdown-count">N</div>
          <div class="bot-breakdown-wr">WR</div>
          <div class="bot-breakdown-pnl">P&L</div>
        </div>
        ${stats.bottomSymbols.map(s => renderBotBreakdownRow(s.symbol, s.count > 0 ? s.wins / s.count : null, s.count, s.pnl)).join("")}
      </div>`;
    }
    if (!Array.isArray(stats?.bySetup) || !stats.bySetup.length) {
      return `<div class="empty-state bot-tab-empty">Pas encore de données par setup.</div>`;
    }
    return `<div class="bot-breakdown">
      <div class="bot-breakdown-row bot-breakdown-head">
        <div class="bot-breakdown-label">Setup</div>
        <div class="bot-breakdown-count">N</div>
        <div class="bot-breakdown-wr">WR</div>
        <div class="bot-breakdown-pnl">P&L</div>
      </div>
      ${stats.bySetup.map(s => renderBotBreakdownRow(s.setup || "autre", s.winRate, s.count, s.pnl)).join("")}
    </div>`;
  }

  function renderBotTradesHistory() {
    const history = Array.isArray(state.trades.history) ? state.trades.history : [];
    const botHistory = history
      .filter(p => tradeSource(p) === "algo")
      .slice()
      .sort((a, b) => {
        const da = new Date(a?.closedExecution?.closedAt || a?.closedAt || 0).getTime();
        const db = new Date(b?.closedExecution?.closedAt || b?.closedAt || 0).getTime();
        return db - da;
      });
    const positions = Array.isArray(state.trades.positions) ? state.trades.positions : [];
    const botPositions = positions.filter(p => tradeSource(p) === "algo");

    if (!botHistory.length && !botPositions.length) {
      return `<div class="card" style="margin-top:16px">
        <div class="section-title"><span>Trades du bot</span></div>
        <div class="empty-state">Aucun trade du bot pour l'instant.</div>
      </div>`;
    }

    return `
      ${botPositions.length ? `
        <div class="card" style="margin-top:16px">
          <div class="section-title"><span>Positions ouvertes du bot</span><span class="badge">${botPositions.length}</span></div>
          <div class="pos-list">${botPositions.map(renderPositionRow).join("")}</div>
        </div>
      ` : ""}
      ${botHistory.length ? `
        <div class="card" style="margin-top:16px">
          <div class="section-title"><span>Historique des trades du bot</span><span class="badge">${botHistory.length}</span></div>
          <div class="trade-table simplified-history">
            <div class="trade-row trade-head">
              <div>Actif</div><div>Sens</div><div>Résultat</div><div>Entrée</div><div>Sortie</div><div>P/L</div><div>Clôture</div>
            </div>
            ${botHistory.map(renderHistoryRow).join("")}
          </div>
        </div>
      ` : ""}`;
  }

  function renderBotParamsReadonly(settings, capitalBase) {
    const learningOn = !!settings?.learning_enabled;
    return `
      <div class="bot-params" style="margin-top:8px">
        <div class="bot-mode-badge bot-learning-badge bot-learning-${learningOn ? "on" : "off"}" style="margin-bottom:10px">
          <div class="bot-mode-label">Apprentissage</div>
          <div class="bot-mode-value">${learningOn ? "Actif" : "Inactif"}</div>
          <div class="bot-mode-hint muted">${learningOn ? "Le bot pénalise les combinaisons à historique perdant." : "Le bot ignore l'historique et fonctionne en mode neutre."}</div>
        </div>
        <div class="kv">
          <div class="muted">Setups autorisés</div><div>${Array.isArray(settings.allowed_setups) ? settings.allowed_setups.join(", ") : "—"}</div>
          <div class="muted">Long / Short</div><div>${settings.allow_long ? "Long" : ""}${settings.allow_long && settings.allow_short ? " + " : ""}${settings.allow_short ? "Short" : ""}${!settings.allow_long && !settings.allow_short ? "—" : ""}</div>
          <div class="muted">Mean reversion</div><div>${settings.mean_reversion_enabled ? "Oui" : "Non"}</div>
          <div class="muted">Setup obligatoire</div><div>${settings.require_structural_setup === false ? "Non" : "Oui"}</div>
          <div class="muted">Cooldown après stop</div><div>${Number(settings.post_stop_cooldown_hours) > 0 ? `${Number(settings.post_stop_cooldown_hours)} h` : "désactivé"}</div>
        </div>
        <details class="bot-advanced" style="margin-top:10px">
          <summary style="cursor:pointer;font-size:.85rem;padding:6px 0">Paramètres avancés</summary>
          <div class="kv" style="margin-top:6px">
            <div class="muted">Capital base</div><div>${priceDisplay(capitalBase)}</div>
            <div class="muted">Risk par trade</div><div>${Math.round((settings.risk_per_trade_pct || 0) * 100)}%</div>
            <div class="muted">Allocation par trade</div><div>${Math.round((settings.allocation_per_trade_pct || 0) * 100)}%</div>
            <div class="muted">Max positions</div><div>${settings.max_open_positions || 10}</div>
            <div class="muted">Max / symbole</div><div>${settings.max_positions_per_symbol || 1}</div>
            <div class="muted">Horizon max</div><div>${settings.max_holding_hours || 240} h</div>
            <div class="muted">Score actionabilité min</div><div>${settings.min_actionability_score ?? 60}</div>
            <div class="muted">Score dossier min</div><div>${settings.min_dossier_score ?? 60}</div>
            <div class="muted">Daily loss max</div><div>${Math.round((settings.max_daily_loss_pct || 0) * 100)}%</div>
            <div class="muted">Weekly loss max</div><div>${(settings.max_weekly_loss_pct || 0) >= 1 ? "désactivé" : Math.round((settings.max_weekly_loss_pct || 0) * 100) + "%"}</div>
            <div class="muted">Pertes conséc. max</div><div>${(settings.max_consecutive_losses || 0) >= 100 ? "désactivé" : (settings.max_consecutive_losses || 3)}</div>
          </div>
        </details>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-edit-open>Éditer</button>
          <button class="btn btn-danger" data-bot-wipe-all title="Effacer tout l'historique et les positions">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
            </svg>
            Tout effacer
          </button>
        </div>
        <div class="muted" style="margin-top:6px;font-size:.78rem">
          Le bouton "Tout effacer" supprime trades clos, positions ouvertes, feedbacks et events. L'auto-ouverture est suspendue juste le temps du wipe puis remise comme elle l'était — le bot continue à trader sur une ardoise propre.
        </div>
      </div>`;
  }

  function renderBotParamsForm() {
    const d = state.bot.editDraft || {};
    const allowedSetupsAll = ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short", "mean_reversion"];
    const currentSetups = Array.isArray(d.allowed_setups) ? d.allowed_setups : ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short"];
    return `
      <div class="bot-params-form" style="margin-top:8px">
        <div class="bot-learning-toggle">
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="learning_enabled" ${d.learning_enabled ? "checked" : ""}><span><strong>Apprentissage actif</strong> — le bot pénalise les combinaisons à historique perdant (≥ 20 trades). Décoche pour tout couper et revenir au comportement neutre.</span></label>
        </div>
        <div class="bot-field-toggles">
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="allow_long" ${d.allow_long ? "checked" : ""}><span>Long autorisé</span></label>
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="allow_short" ${d.allow_short ? "checked" : ""}><span>Short autorisé</span></label>
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="mean_reversion_enabled" ${d.mean_reversion_enabled ? "checked" : ""}><span>Mean reversion</span></label>
          <label class="bot-sub-toggle"><input type="checkbox" data-bot-field="require_structural_setup" ${d.require_structural_setup === false ? "" : "checked"}><span>Setup obligatoire — n'ouvre que sur pattern technique (pullback / breakout / etc.). Recommandé.</span></label>
        </div>
        <div class="bot-field-setups">
          <div class="muted" style="font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Setups autorisés</div>
          <div class="bot-setups-row">
            ${allowedSetupsAll.map(s => `
              <label class="bot-sub-toggle"><input type="checkbox" data-bot-field-setup="${s}" ${currentSetups.includes(s) ? "checked" : ""}><span>${s}</span></label>
            `).join("")}
          </div>
        </div>
        <details class="bot-advanced" style="margin-top:14px">
          <summary style="cursor:pointer;font-size:.85rem;padding:6px 0">Paramètres avancés</summary>
          <div class="bot-field-grid" style="margin-top:6px">
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
            <label class="bot-field"><span>Cooldown post-stop (h) — 0 = OFF</span><input type="number" inputmode="numeric" min="0" max="720" step="1" data-bot-field="post_stop_cooldown_hours" value="${Number(d.post_stop_cooldown_hours ?? 24)}"></label>
          </div>
        </details>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" data-bot-edit-save ${state.bot.savingDraft ? "disabled" : ""}>${state.bot.savingDraft ? "Enregistrement…" : "Enregistrer"}</button>
          <button class="btn" data-bot-edit-cancel>Annuler</button>
        </div>
      </div>`;
  }

  function renderSettings() {
    // 4 sections en accordéon. Section 1 ouverte par défaut (la plus utilisée).
    // Pour la cohérence visuelle : mêmes classes .card.bot-params-card +
    // .bot-collapsible-summary que les <details> de l'onglet Trades.

    // === Données pour la section Alertes & Notifications (fusion ex-onglet Alertes) ===
    const activeAlerts = state.priceAlerts.filter(a => a.active);
    const triggeredAlerts = state.priceAlerts.filter(a => !a.active);
    const notifStatus = "Notification" in window ? Notification.permission : "unsupported";

    // === Données pour la section Paramètres du bot (déplacée depuis l'onglet Trades) ===
    const botAccount = state.bot.account || {};
    const botSettings = botAccount.settings || {};
    const botCapitalBase = Number(botAccount.capitalBase ?? botSettings.capital_base ?? 10000);

    function alertRow(a) {
      const dir = a.condition === "above" ? "Au-dessus de" : "En-dessous de";
      const ago = a.triggeredAt
        ? `Declenche ${Math.round((Date.now() - a.triggeredAt) / 60000)} min`
        : `Cree ${Math.round((Date.now() - a.createdAt) / 60000)} min ago`;
      return `
        <div class="alert-row ${a.active ? "" : "alert-triggered"}">
          <div class="alert-row-info">
            <div class="alert-symbol">${safeText(a.symbol)}</div>
            <div class="alert-cond">${dir} ${priceDisplay(a.targetPrice, currencyForSymbol(a.symbol))}</div>
            <div class="alert-meta">${safeText(a.name)} · ${ago}</div>
          </div>
          ${a.active ? `<button class="btn btn-secondary alert-remove-btn" data-remove-alert="${a.id}">Suppr.</button>` : `<span class="badge badge-positive">OK</span>`}
        </div>`;
    }

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Réglages</div>
          <div class="screen-subtitle">Personnalise l'app selon tes préférences.</div>
        </div>

        <!-- ====== 1. COMPTE + APPARENCE ====== -->
        <details class="card bot-params-card" open>
          <summary class="bot-collapsible-summary"><span>Compte & apparence</span></summary>
          <div class="setting-list">
            <div class="setting-row">
              <div>
                <div class="setting-title">Session Worker</div>
                <div class="setting-desc">${isSessionValid()
                  ? `connecté · expire le ${new Date(state.session.expiresAt * 1000).toLocaleString("fr-FR")}`
                  : "aucune session active"}</div>
              </div>
              ${isSessionValid()
                ? `<button class="btn btn-secondary" data-session-logout style="min-width:90px">Déconnecter</button>`
                : `<button class="btn btn-primary" data-open-pin style="min-width:90px">Se connecter</button>`}
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-title">ManiTradePro V2 (bêta)</div>
                <div class="setting-desc">Nouveau bot d'apprentissage : 4 setups, paper trades réellement ouvrables, stats par setup. App séparée, la V1 reste intacte.</div>
              </div>
              <a class="btn btn-primary" href="https://manitradepro-v2.emmanueldelasse.workers.dev/" target="_blank" rel="noopener" style="min-width:90px;text-align:center;text-decoration:none">Tester V2</a>
            </div>

            <label class="setting-row">
              <div>
                <div class="setting-title">Suivre le thème système</div>
                <div class="setting-desc">L'app bascule automatiquement clair/sombre selon ton iPhone.</div>
              </div>
              <input type="checkbox" data-setting-toggle="autoTheme" ${state.settings.autoTheme ? "checked" : ""}>
            </label>

            <label class="setting-row ${state.settings.autoTheme ? "setting-row--disabled" : ""}">
              <div>
                <div class="setting-title">Activer le thème clair</div>
                <div class="setting-desc">${state.settings.autoTheme ? "Suivi système actif — ce réglage est ignoré." : "Passe l'app sur un rendu clair, plus doux en journée."}</div>
              </div>
              <input type="checkbox" data-setting-toggle="lightTheme" ${state.settings.autoTheme ? "disabled" : ""} ${state.settings.lightTheme ? "checked" : ""}>
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

            <label class="setting-row">
              <div>
                <div class="setting-title">Cartes plus compactes</div>
                <div class="setting-desc">Resserre un peu les cartes opportunités.</div>
              </div>
              <input type="checkbox" data-setting-toggle="compactCards" ${state.settings.compactCards ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher source et mise à jour</div>
                <div class="setting-desc">Montre les badges fournisseur et fraîcheur sur les cartes.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showSourceBadges" ${state.settings.showSourceBadges ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher le détail du signal</div>
                <div class="setting-desc">Affiche les sous-composants du score détaillé dans la fiche actif.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showScoreBreakdown" ${state.settings.showScoreBreakdown ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div>
                <div class="setting-title">Afficher le journal moteur</div>
                <div class="setting-desc">Montre les dernières décisions du moteur dans l'accueil et Trades.</div>
              </div>
              <input type="checkbox" data-setting-toggle="showAlgoJournal" ${state.settings.showAlgoJournal ? "checked" : ""}>
            </label>
          </div>
        </details>

        <!-- ====== 2. ALERTES & NOTIFICATIONS ====== -->
        <details class="card bot-params-card">
          <summary class="bot-collapsible-summary">
            <span>Alertes & notifications</span>
            <span class="muted" style="font-weight:400;font-size:.85rem;flex-shrink:0">${activeAlerts.length} active${activeAlerts.length !== 1 ? "s" : ""}</span>
          </summary>
          <div>
            ${notifStatus !== "granted" ? `
              <div class="info-box" style="margin-bottom:14px">
                ${notifStatus === "denied"
                  ? "Notifications bloquées par le navigateur. Autorise-les dans les réglages de ton navigateur pour recevoir les alertes."
                  : "Active les notifications pour recevoir une alerte même si l'appli est en arrière-plan."}
                ${notifStatus === "default" ? `<button class="btn btn-primary" style="margin-top:8px" data-request-notif-perm>Activer les notifications</button>` : ""}
              </div>` : ""}

            <div class="setting-list">
              <label class="setting-row">
                <div>
                  <div class="setting-title">Alertes signaux algo</div>
                  <div class="setting-desc">Notif push quand un actif passe en "Trade proposé" après un scan.</div>
                </div>
                <input type="checkbox" data-setting-toggle="algoSignalNotifs" ${state.settings.algoSignalNotifs ? "checked" : ""}>
              </label>

              <label class="setting-row">
                <div>
                  <div class="setting-title">Rafraîchir les opportunités</div>
                  <div class="setting-desc">Recharge automatiquement la liste quand le délai minimum Twelve est terminé.</div>
                </div>
                <input type="checkbox" data-setting-toggle="autoRefreshOpportunities" ${state.settings.autoRefreshOpportunities ? "checked" : ""}>
              </label>

              <label class="setting-row">
                <div>
                  <div class="setting-title">Scan auto — intervalle</div>
                  <div class="setting-desc">Fréquence de relance automatique du scan des opportunités.</div>
                </div>
                <select class="setting-select" data-setting-select="autoScanIntervalMin">
                  <option value="3" ${Number(state.settings.autoScanIntervalMin) === 3 ? "selected" : ""}>3 min</option>
                  <option value="5" ${Number(state.settings.autoScanIntervalMin) === 5 || !state.settings.autoScanIntervalMin ? "selected" : ""}>5 min</option>
                  <option value="10" ${Number(state.settings.autoScanIntervalMin) === 10 ? "selected" : ""}>10 min</option>
                  <option value="15" ${Number(state.settings.autoScanIntervalMin) === 15 ? "selected" : ""}>15 min</option>
                </select>
              </label>
            </div>

            <div class="section-title" style="margin-top:18px"><span>Alertes de prix actives</span><span>${activeAlerts.length}</span></div>
            ${activeAlerts.length ? activeAlerts.map(alertRow).join("") : `<div class="empty-state">Aucune alerte active. Ouvre la fiche d'un actif pour en créer une.</div>`}

            ${triggeredAlerts.length ? `
              <div class="section-title" style="margin-top:18px"><span>Historique des alertes</span><span>${triggeredAlerts.length}</span></div>
              ${triggeredAlerts.map(alertRow).join("")}
              <button class="btn btn-secondary" style="margin-top:12px;width:100%" data-clear-triggered-alerts>Effacer l'historique</button>
            ` : ""}
          </div>
        </details>

        <!-- ====== 3. PARAMÈTRES DU BOT (déplacée depuis l'onglet Trades) ====== -->
        ${renderBotParamsCard(botSettings, botCapitalBase)}

        <!-- ====== 4. ACTIFS & DONNÉES ====== -->
        <details class="card bot-params-card">
          <summary class="bot-collapsible-summary">
            <span>Actifs & données</span>
            <span class="muted" style="font-weight:400;font-size:.85rem;flex-shrink:0">${state.userAssets.length}/50 personnalisés</span>
          </summary>
          <div>
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
            <div class="muted" style="margin-top:14px;font-size:.85rem">
              Pour vider l'historique ou réinitialiser le capital d'entrainement, utilise les boutons sur la page Trades.
            </div>
          </div>
        </details>

        <!-- ====== 4. À PROPOS / AVANCÉ ====== -->
        <details class="card bot-params-card">
          <summary class="bot-collapsible-summary"><span>À propos / Avancé</span></summary>
          <div class="setting-list">
            <div class="setting-row">
              <div>
                <div class="setting-title">État distant</div>
                <div class="setting-desc">${safeText(remoteStatusText())}</div>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-title">Connexion Supabase</div>
                <div class="setting-desc">Les trades passent par le Worker Cloudflare. Secrets attendus côté Worker : SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_API_TOKEN, ADMIN_PIN.</div>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-title">Version &amp; code source</div>
                <div class="setting-desc">PWA ManiTradePro · <a href="https://github.com/emmanueldelasse-droid/ManiTradePro" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline">repo GitHub</a></div>
              </div>
            </div>
          </div>
        </details>
      </div>`;
  }

  



function renderMain() {
    switch (state.route) {
      case "dashboard": return renderDashboard();
      case "opportunities": return renderOpportunities();
      case "asset-detail": return renderDetail();
      case "portfolio": return renderPortfolio();
      case "settings": return renderSettings();
      // Routes legacy /bot /health /performance /reports : fusionnées dans
      // l'onglet Trades (= route portfolio). Suppression brute (choix user) :
      // fallback au default = renderDashboard. Anciens bookmarks affichent
      // la home, pas grave.
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
    // Préserve la position de scroll : sans ça, chaque appel à render()
    // (notamment via l'auto-refresh 30s sur les opportunités et la fiche
    // détail) remettait la page en haut, ce qui faisait sauter l'écran
    // sous les yeux de l'utilisateur.
    //
    // Note : le scroll de l'app N'EST PAS sur window — `.app-shell` a
    // `overflow:hidden` et c'est `.main-content` (overflow-y:auto,
    // height:100vh) qui scrolle en interne. Lire window.scrollY renvoie
    // toujours 0 donc la restauration ne fait rien. On lit le scrollTop
    // de `.main-content`.
    const prevMain = document.querySelector(".main-content");
    const prevScrollY = prevMain ? prevMain.scrollTop : 0;
    const prevRoute = state.route;

    // Capture des prix actuellement affichés pour flash visuel sur
    // changement. Sans ça, l'utilisateur ne voit pas que le prix vient
    // de bouger lors de l'auto-refresh.
    const prevPrices = new Map();
    document.querySelectorAll("[data-symbol]").forEach(card => {
      const sym = card.dataset.symbol;
      if (!sym) return;
      card.querySelectorAll(".price, .pos-price-val, .detail-price").forEach((el, idx) => {
        prevPrices.set(`${sym}|${idx}`, el.textContent.trim());
      });
    });

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

    // Applique le flash visuel sur les prix qui ont changé depuis le
    // dernier render (auto-refresh ou clic sur "Actualiser"). On compare
    // la valeur texte parsée à la valeur précédente capturée plus haut.
    if (prevPrices.size > 0) {
      requestAnimationFrame(() => {
        document.querySelectorAll("[data-symbol]").forEach(card => {
          const sym = card.dataset.symbol;
          if (!sym) return;
          card.querySelectorAll(".price, .pos-price-val, .detail-price").forEach((el, idx) => {
            const prev = prevPrices.get(`${sym}|${idx}`);
            const curr = el.textContent.trim();
            if (!prev || prev === curr) return;
            const oldNum = parseFloat(prev.replace(/[^\d,.-]/g, "").replace(",", "."));
            const newNum = parseFloat(curr.replace(/[^\d,.-]/g, "").replace(",", "."));
            if (!Number.isFinite(oldNum) || !Number.isFinite(newNum) || oldNum === newNum) return;
            const cls = newNum > oldNum ? "price-flash-up" : "price-flash-down";
            el.classList.add(cls);
            setTimeout(() => el.classList.remove(cls), 850);
          });
        });
      });
    }

    // Restaure le scroll sur .main-content si la route n'a pas changé.
    // Sur un changement de route on accepte le retour en haut — c'est
    // ce qu'on attend après avoir navigué ailleurs.
    if (state.route === prevRoute && prevScrollY > 0) {
      requestAnimationFrame(() => {
        const main = document.querySelector(".main-content");
        if (main) main.scrollTop = prevScrollY;
      });
    }
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
      el.addEventListener("click", async () => {
        const src = el.getAttribute("data-clear-history");
        const label = src === "algo" ? "algo" : "manuel";
        const victims = (state.trades.history || []).filter(p => tradeSource(p) === src);
        if (!victims.length) return;
        if (!confirm(`Supprimer définitivement tous les trades ${label} (Supabase inclus) ? Un CSV de sauvegarde sera téléchargé avant. Action irréversible.`)) return;
        exportTradesToCSV(victims, `backup_${label}_avant_suppression`);
        haptic([30, 60, 30]);

        // PR-TRADES-WIPE-LOCAL-FIRST-V3 : LOCAL-FIRST.
        // On vide IMMÉDIATEMENT côté local + tombstone. Garantit que
        // l'UI/localStorage sont purgés même si Safari renvoie
        // "Load failed". Anti-régression iPhone PWA.
        state.trades.history = state.trades.history.filter(p => tradeSource(p) !== src);
        saveTradesMeta({ lastWipedAt: Date.now() });
        persistTradesState();
        render();

        // Best-effort serveur en arrière-plan. Le catch interne de
        // wipeTradesOnServer (V2) pose déjà pendingRemoteWipe sur
        // échec wipeAll — pour le mode par-source, on s'aligne aussi.
        const res = await wipeTradesOnServer([], { source: src });
        if (res.ok) {
          showAlertToast("Historique", `${res.deletedTrades} trade(s) ${label} supprimé(s) (local + serveur).`);
        } else {
          saveTradesMeta({ pendingRemoteWipe: true, lastRemoteWipeFailAt: Date.now() });
          showAlertToast("Historique", `Historique ${label} supprimé localement. Synchro serveur en attente (${res.error || "indisponible"}).`);
        }
        render();
      });
    });

    app.querySelectorAll("[data-clear-all-history]").forEach(el => {
      el.addEventListener("click", async () => {
        const victims = Array.isArray(state.trades.history) ? state.trades.history.slice() : [];
        if (!victims.length) return;
        if (!confirm(`Supprimer définitivement tout l'historique (Supabase inclus) ? Un CSV de sauvegarde sera téléchargé avant. Action irréversible.`)) return;
        exportTradesToCSV(victims, "backup_complet_avant_suppression");
        haptic([30, 60, 30]);

        // PR-TRADES-WIPE-LOCAL-FIRST-V3 : LOCAL-FIRST.
        // L'UI/localStorage doivent être purgés IMMÉDIATEMENT après
        // confirmation, même si Safari/iPhone échoue à joindre le
        // worker (cas "Load failed" récurrent en PWA iOS).
        // Tombstone local posé immédiatement → blocage réapparition
        // au refresh (PR #254). pendingRemoteWipe posé pour retry au
        // prochain sync (PR #256).
        state.trades.history = [];
        state.trades.positions = [];
        saveTradesMeta({ lastWipedAt: Date.now() });
        persistTradesState();
        render();

        // Best-effort serveur. wipeTradesOnServer V2 met à jour
        // serverWipeAdoptedAt sur succès, pendingRemoteWipe sur échec.
        const res = await wipeTradesOnServer([], { wipeAll: true, includePositions: true });
        if (res.ok) {
          showAlertToast("Historique", `${res.deletedTrades} trade(s) supprimé(s) (local + serveur).`);
        } else {
          showAlertToast("Historique", `Historique supprimé localement. Synchro serveur en attente (${res.error || "indisponible"}). Réessai automatique au prochain sync.`);
        }
        render();
      });
    });

    app.querySelectorAll("[data-action]").forEach(el => {
      el.addEventListener("click", () => {
        const action = el.getAttribute("data-action");
        if (action === "load-journal-analysis") loadJournalAnalysis();
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
    app.querySelectorAll("[data-bot-wipe-all]").forEach(el => {
      el.addEventListener("click", () => { wipeBotEverything(); });
    });
    app.querySelectorAll("[data-bot-edit-cancel]").forEach(el => {
      el.addEventListener("click", () => { cancelBotEdit(); });
    });
    app.querySelectorAll("[data-bot-edit-save]").forEach(el => {
      el.addEventListener("click", () => { saveBotDraft(); });
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
app.querySelectorAll("[data-bot-stats-tab]").forEach(el => {
      el.addEventListener("click", () => {
        state.bot.statsTab = el.getAttribute("data-bot-stats-tab") || "setup";
        haptic(5);
        render();
      });
    });
    // Sous-onglets de l'onglet Bot unifié (État / Performance / Santé)
    app.querySelectorAll("[data-bot-subtab]").forEach(el => {
      el.addEventListener("click", () => {
        const next = el.getAttribute("data-bot-subtab") || "stats";
        if (state.bot.subTab === next) return;
        state.bot.subTab = next;
        haptic(5);
        // Charge la donnée appropriée selon le sous-onglet
        if (next === "health") loadHealth();
        else if (next === "stats") loadBot();
        else if (next === "learning") loadLearning();
        // performance = données déjà chargées via state.trades.history (loadTradesState)
        render();
      });
    });
    app.querySelectorAll("[data-learning-filter]").forEach(el => {
      el.addEventListener("click", () => {
        const next = String(el.getAttribute("data-learning-filter") || "all").toLowerCase();
        if (state.bot.learning.filterMode === next) return;
        state.bot.learning.filterMode = next;
        haptic(5);
        loadLearning();
      });
    });
    app.querySelectorAll("[data-learning-reload]").forEach(el => {
      el.addEventListener("click", () => {
        haptic(10);
        loadLearning();
      });
    });
    app.querySelectorAll("[data-learning-toggle-unknown]").forEach(el => {
      el.addEventListener("click", () => {
        state.bot.learning.showUnknown = !state.bot.learning.showUnknown;
        haptic(5);
        render();
      });
    });
    app.querySelectorAll("[data-bot-params-accordion]").forEach(el => {
      el.addEventListener("toggle", () => {
        state.bot.paramsOpen = el.open;
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
      if (["dashboard", "opportunities", "asset-detail", "settings", "portfolio"].includes(state.route)) {
        if (state.route === "portfolio") {
          refreshOpenTradesLive().catch(() => {});
        }
        if (state.settings.autoRefreshOpportunities && !state.opportunitiesRefreshing) {
          // Intervalle réduit : 1 min marché ouvert (anciennement 5 min)
          // pour rester proche du temps réel maintenant que le worker
          // s'appuie sur Yahoo (gratuit, live). 10 min marché fermé.
          const stockOpen = isStockMarketOpen();
          const intervalMin = stockOpen ? Number(state.settings.autoScanIntervalMin || 1) : 10;
          if (Date.now() - (state.opportunitiesLastGoodAt || 0) >= intervalMin * 60 * 1000) {
            loadOpportunities(false).catch(() => {});
          }
        }
        // Rafraîchit le détail si on est sur la fiche (sinon le prix
        // d'entrée affiché traînait jusqu'à 1 h sur l'ancien TTL).
        if (state.route === "asset-detail" && state.detail?.symbol && !state.loadingDetail) {
          const lastDetailFetch = Number(state.detailRequestStartedAt || 0);
          if (Date.now() - lastDetailFetch >= 60 * 1000) {
            loadDetail(state.detail.symbol).catch(() => {});
          }
        }
        // Pas de render() ici : loadOpportunities / loadDetail
        // appellent déjà render() à la fin de leur fetch. Un appel
        // additionnel toutes les 30 s recréait le DOM même quand rien
        // n'avait changé, ce qui figeait le scroll de l'utilisateur.
      }
    }, 30000);

    // Refetch immédiat quand l'onglet revient au premier plan
    // (l'utilisateur veut voir le prix actuel, pas celui d'il y a 5 min).
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (state.route === "opportunities" || state.route === "dashboard") {
        loadOpportunities(true).catch(() => {});
      }
      if (state.route === "asset-detail" && state.detail?.symbol) {
        loadDetail(state.detail.symbol).catch(() => {});
      }
    });
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
      // Trades (ex portfolio) : recharge positions live + bot + rapports en parallèle
      case "portfolio": return () => Promise.all([
        refreshOpenTradesLive(true),
        loadBot().catch(() => {}),
        loadReports().catch(() => {})
      ]);
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
