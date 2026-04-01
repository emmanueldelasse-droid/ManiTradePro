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
    showSourceBadges: true,
    showScoreBreakdown: true,
    compactCards: false,
    displayCurrency: "EUR_PLUS_USD",
    showAlgoJournal: true,
    supabaseEnabled: false,
    supabaseUrl: "",
    supabaseAnonKey: ""
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
    opportunitiesRefreshing: false,
    opportunitiesLastGoodAt: 0,
    detailRequestStartedAt: 0,
    dashboard: {
      fearGreed: null,
      trending: [],
      portfolio: null
    },
    trades: {
      mode: "training",
      positions: [],
      history: [],
      remoteStatus: "local_only",
      remoteError: null,
      lastRemoteSyncAt: null
    },
    algoJournal: [],
    settings: loadSettings(),
    budget: loadBudgetTracker(),
    detailCache: readJson(STORAGE_KEYS.detailCache, {}),
    opportunitiesSnapshot: readJson(STORAGE_KEYS.opportunitiesSnapshot, []),
    nonCryptoHydration: {}
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
    writeJson(TRADE_STORAGE.meta, {
      updatedAt: Date.now(),
      schema: "mestrades_v1",
      ...extra
    });
  }

  function loadTradesMeta() {
    return readJson(TRADE_STORAGE.meta, {});
  }

  const SUPABASE_TABLES = {
    positions: "mtp_positions",
    trades: "mtp_trades"
  };

  function supabaseConfig() {
    return {
      enabled: !!state.settings.supabaseEnabled,
      url: String(state.settings.supabaseUrl || "").trim().replace(/\/$/, ""),
      key: String(state.settings.supabaseAnonKey || "").trim()
    };
  }

  function supabaseReady() {
    const cfg = supabaseConfig();
    return !!(cfg.enabled && cfg.url && cfg.key);
  }

  function supabaseHeaders(extra = {}) {
    const cfg = supabaseConfig();
    return {
      "Content-Type": "application/json",
      "apikey": cfg.key,
      "Authorization": `Bearer ${cfg.key}`,
      ...extra
    };
  }

  async function supabaseFetch(path, options = {}) {
    const cfg = supabaseConfig();
    if (!supabaseReady()) throw new Error("supabase_not_configured");
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: supabaseHeaders(options.headers || {})
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`supabase_${res.status}:${txt || res.statusText}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  function mapPositionToSupabase(position) {
    const p = normalizePositionRecord(position);
    return {
      id: p.id,
      symbol: p.symbol || null,
      name: p.name || null,
      mode: "training",
      status: "open",
      side: p.side || null,
      asset_class: p.assetClass || null,
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : null,
      entry_price: Number.isFinite(Number(p.execution?.entryPrice ?? p.entryPrice)) ? Number(p.execution?.entryPrice ?? p.entryPrice) : null,
      invested: Number.isFinite(Number(p.execution?.invested ?? p.invested)) ? Number(p.execution?.invested ?? p.invested) : null,
      stop_loss: Number.isFinite(Number(p.analysisSnapshot?.stopLoss ?? p.stopLoss)) ? Number(p.analysisSnapshot?.stopLoss ?? p.stopLoss) : null,
      take_profit: Number.isFinite(Number(p.analysisSnapshot?.takeProfit ?? p.takeProfit)) ? Number(p.analysisSnapshot?.takeProfit ?? p.takeProfit) : null,
      score: Number.isFinite(Number(p.analysisSnapshot?.score ?? p.score)) ? Number(p.analysisSnapshot?.score ?? p.score) : null,
      trend_label: p.analysisSnapshot?.trendLabel || p.trendLabel || null,
      trade_decision: p.analysisSnapshot?.decision || p.tradeDecision || null,
      trade_reason: p.analysisSnapshot?.reason || p.tradeReason || null,
      horizon: p.analysisSnapshot?.horizon || p.horizon || null,
      source_used: p.analysisSnapshot?.sourceUsed || p.sourceUsed || null,
      opened_at: p.execution?.openedAt || p.openedAt || null,
      analysis_snapshot: p.analysisSnapshot || null,
      execution: p.execution || null,
      live: p.live || null,
      updated_at: new Date().toISOString()
    };
  }

  function mapSupabasePositionToLocal(row) {
    return normalizePositionRecord({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      assetClass: row.asset_class || null,
      side: row.side || null,
      quantity: row.quantity,
      entryPrice: row.entry_price,
      invested: row.invested,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      tradeDecision: row.trade_decision,
      tradeReason: row.trade_reason,
      trendLabel: row.trend_label,
      horizon: row.horizon,
      sourceUsed: row.source_used,
      openedAt: row.opened_at,
      score: row.score,
      analysisSnapshot: row.analysis_snapshot || null,
      execution: row.execution || null,
      live: row.live || null
    });
  }

  function mapHistoryTradeToSupabase(trade) {
    const t = normalizePositionRecord(trade);
    return {
      id: t.id,
      symbol: t.symbol || null,
      name: t.name || null,
      mode: "training",
      status: "closed",
      side: t.side || null,
      asset_class: t.assetClass || null,
      quantity: Number.isFinite(Number(t.quantity)) ? Number(t.quantity) : null,
      entry_price: Number.isFinite(Number(t.execution?.entryPrice ?? t.entryPrice)) ? Number(t.execution?.entryPrice ?? t.entryPrice) : null,
      exit_price: Number.isFinite(Number(t.exitPrice)) ? Number(t.exitPrice) : null,
      invested: Number.isFinite(Number(t.execution?.invested ?? t.invested)) ? Number(t.execution?.invested ?? t.invested) : null,
      stop_loss: Number.isFinite(Number(t.analysisSnapshot?.stopLoss ?? t.stopLoss)) ? Number(t.analysisSnapshot?.stopLoss ?? t.stopLoss) : null,
      take_profit: Number.isFinite(Number(t.analysisSnapshot?.takeProfit ?? t.takeProfit)) ? Number(t.analysisSnapshot?.takeProfit ?? t.takeProfit) : null,
      score: Number.isFinite(Number(t.analysisSnapshot?.score ?? t.score)) ? Number(t.analysisSnapshot?.score ?? t.score) : null,
      trend_label: t.analysisSnapshot?.trendLabel || t.trendLabel || null,
      trade_decision: t.analysisSnapshot?.decision || t.tradeDecision || null,
      trade_reason: t.analysisSnapshot?.reason || t.tradeReason || null,
      horizon: t.analysisSnapshot?.horizon || t.horizon || null,
      source_used: t.analysisSnapshot?.sourceUsed || t.sourceUsed || null,
      opened_at: t.execution?.openedAt || t.openedAt || null,
      closed_at: t.closedAt || null,
      pnl: Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : null,
      pnl_pct: Number.isFinite(Number(t.pnlPct)) ? Number(t.pnlPct) : null,
      analysis_snapshot: t.analysisSnapshot || null,
      execution: t.execution || null,
      live: t.live || null,
      updated_at: new Date().toISOString()
    };
  }

  function mapSupabaseTradeToLocal(row) {
    return normalizePositionRecord({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      assetClass: row.asset_class || null,
      side: row.side || null,
      quantity: row.quantity,
      entryPrice: row.entry_price,
      invested: row.invested,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      tradeDecision: row.trade_decision,
      tradeReason: row.trade_reason,
      trendLabel: row.trend_label,
      horizon: row.horizon,
      sourceUsed: row.source_used,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      exitPrice: row.exit_price,
      pnl: row.pnl,
      pnlPct: row.pnl_pct,
      score: row.score,
      analysisSnapshot: row.analysis_snapshot || null,
      execution: row.execution || null,
      live: row.live || null
    });
  }

  async function loadTradesFromSupabase() {
    if (!supabaseReady()) return false;
    try {
      const positions = await supabaseFetch(`${SUPABASE_TABLES.positions}?mode=eq.training&status=eq.open&order=opened_at.desc`);
      const history = await supabaseFetch(`${SUPABASE_TABLES.trades}?mode=eq.training&status=eq.closed&order=closed_at.desc`);
      state.trades.positions = Array.isArray(positions) ? positions.map(mapSupabasePositionToLocal) : [];
      state.trades.history = Array.isArray(history) ? history.map(mapSupabaseTradeToLocal) : [];
      state.trades.remoteStatus = "connected";
      state.trades.remoteError = null;
      state.trades.lastRemoteSyncAt = Date.now();
      return true;
    } catch (err) {
      state.trades.remoteStatus = "fallback_local";
      state.trades.remoteError = err?.message || "supabase_load_failed";
      return false;
    }
  }

  async function syncTradesToSupabase() {
    if (!supabaseReady()) return false;
    try {
      const openRows = (state.trades.positions || []).map(mapPositionToSupabase);
      const historyRows = (state.trades.history || []).map(mapHistoryTradeToSupabase);

      if (openRows.length) {
        await supabaseFetch(`${SUPABASE_TABLES.positions}?on_conflict=id`, {
          method: "POST",
          headers: {
            "Prefer": "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify(openRows)
        });
      }

      if (historyRows.length) {
        await supabaseFetch(`${SUPABASE_TABLES.trades}?on_conflict=id`, {
          method: "POST",
          headers: {
            "Prefer": "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify(historyRows)
        });
      }

      // Remove closed ids from open positions table.
      const closedIds = historyRows.map((x) => x.id).filter(Boolean);
      if (closedIds.length) {
        const encoded = closedIds.map((x) => `"${String(x).replace(/"/g, '\"')}"`).join(",");
        await supabaseFetch(`${SUPABASE_TABLES.positions}?id=in.(${encoded})`, {
          method: "DELETE",
          headers: { "Prefer": "return=minimal" }
        });
      }

      state.trades.remoteStatus = "connected";
      state.trades.remoteError = null;
      state.trades.lastRemoteSyncAt = Date.now();
      return true;
    } catch (err) {
      state.trades.remoteStatus = "fallback_local";
      state.trades.remoteError = err?.message || "supabase_sync_failed";
      return false;
    }
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
    const loadedRemote = await loadTradesFromSupabase();
    const rawPositions = readJsonFromKeys(TRADE_STORAGE.positions, []);
    const rawHistory = readJsonFromKeys(TRADE_STORAGE.history, []);
    const rawAlgo = readJsonFromKeys(TRADE_STORAGE.algoJournal, []);

    if (!loadedRemote) {
      state.trades.positions = Array.isArray(rawPositions) ? rawPositions.map(normalizePositionRecord) : [];
      state.trades.history = Array.isArray(rawHistory) ? rawHistory.map((x) => normalizePositionRecord(x)) : [];
    }
    state.algoJournal = Array.isArray(rawAlgo) ? rawAlgo : [];

    // Warm the current versioned keys too, so older/newer builds keep seeing the same trades.
    writeJsonToKeys(TRADE_STORAGE.positions, state.trades.positions);
    writeJsonToKeys(TRADE_STORAGE.history, state.trades.history);
    writeJsonToKeys(TRADE_STORAGE.algoJournal, state.algoJournal);
    writeJson(TRADE_STORAGE.positionsBackup, state.trades.positions);
    writeJson(TRADE_STORAGE.historyBackup, state.trades.history);
    writeJson(TRADE_STORAGE.algoJournalBackup, state.algoJournal);
    saveTradesMeta({ migratedAt: Date.now() });
  }

  function persistTradesState() {
    const positions = Array.isArray(state.trades.positions) ? state.trades.positions.map(normalizePositionRecord) : [];
    const history = Array.isArray(state.trades.history) ? state.trades.history.map((x) => normalizePositionRecord(x)) : [];
    const algoJournal = Array.isArray(state.algoJournal) ? state.algoJournal : [];

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
      algoCount: algoJournal.length
    });
    syncTradesToSupabase().catch(() => {});
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
  if (!item || item.price == null || typeof item.score !== "number") return null;
  const score = Number(item.score || 0);
  const dir = String(item.direction || "neutral");
  const synthetic = {
    ...item,
    breakdown: {
      regime: 50,
      trend: dir === "long" ? Math.max(50, score) : dir === "short" ? Math.max(50, 100 - score) : 50,
      momentum: dir === "long" ? Math.max(50, score) : dir === "short" ? Math.max(50, 100 - score) : 50,
      entryQuality: 50,
      risk: 50,
      participation: 50
    },
    candles: []
  };
  return generateTradePlan(synthetic);
}

function generateTradePlan(detail) {
  if (!detail || detail.price == null) return null;

  const rawScore = Number(detail.score ?? 0);
  const direction = String(detail.direction || "neutral");
  const confidenceRaw = detail.confidence || "low";
  const breakdown = detail.breakdown || {};
  const momentum = Number(breakdown.momentum ?? 50);
  const entryQuality = Number(breakdown.entryQuality ?? 50);
  const trend = Number(breakdown.trend ?? 50);
  const regime = Number(breakdown.regime ?? 50);
  const risk = Number(breakdown.risk ?? 50);
  const participation = Number(breakdown.participation ?? 50);

  const avgRange = averageRange(detail.candles || [], 14);
  const fallbackVol = detail.price * (detail.assetClass === "crypto" ? 0.028 : 0.018);
  const vol = avgRange && avgRange > 0 ? avgRange : fallbackVol;

  const aiContext = [];
  if (regime >= 58) aiContext.push("contexte porteur");
  if (regime <= 42) aiContext.push("contexte moyen");
  if (entryQuality >= 65) aiContext.push("entree correcte");
  if (entryQuality <= 45) aiContext.push("entree delicate");
  if (risk >= 60) aiContext.push("risque correct");
  if (risk <= 42) aiContext.push("risque eleve");
  if (participation >= 70) aiContext.push("marche assez actif");

  const directionQuality =
    direction === "long" ? rawScore :
    direction === "short" ? (100 - rawScore) :
    35;

  const finalScore = Math.round(
    regime * 0.14 +
    trend * 0.20 +
    momentum * 0.16 +
    entryQuality * 0.22 +
    risk * 0.18 +
    participation * 0.05 +
    directionQuality * 0.05
  );

  let decision = decisionFromReliability(finalScore);
  let side = direction === "neutral" ? null : direction;
  let urgency = decision === "Trade propose" ? "maintenant" : decision === "A surveiller" ? "attendre" : "ne rien faire";
  let timing = entryQuality >= 70 ? "bon" : entryQuality >= 55 ? "moyen" : "mauvais";
  let trendLabel = detectedTrendLabel(direction);
  let safety = finalScore >= 70 ? "elevee" : finalScore >= 55 ? "moyenne" : "faible";
  let reason = "";
  let aiSummary = "";
  let refusalReason = null;
  let blockerType = null;
  let waitFor = null;

  if (decision === "Trade propose" && side) {
    reason = `${trendLabel}, entree encore exploitable et risque correct.`;
    aiSummary = `Le moteur detecte une ${trendLabel} et juge le plan assez fiable pour ouvrir un trade.`;
    blockerType = "aucun";
    waitFor = "rien de special";
  } else if (decision === "A surveiller") {
    side = null;
    if (entryQuality < 55) {
      blockerType = "timing";
      waitFor = "attendre un meilleur point d'entree";
      reason = `${trendLabel}, mais le timing d'entree reste moyen.`;
      aiSummary = `Le scenario existe, mais le moteur prefere attendre un meilleur point d'entree.`;
      refusalReason = "Trade non ouvert : timing encore trop moyen.";
    } else if (risk < 50) {
      blockerType = "risque";
      waitFor = "attendre un risque plus propre";
      reason = `${trendLabel}, mais le risque reste trop present pour entrer maintenant.`;
      aiSummary = `Le signal existe, mais le risque reste encore trop important.`;
      refusalReason = "Trade non ouvert : risque encore trop eleve.";
    } else {
      blockerType = "confirmation";
      waitFor = "attendre une confirmation de marche";
      reason = `${trendLabel}, mais le signal demande encore une confirmation.`;
      aiSummary = `Le contexte est interessant, mais le moteur prefere attendre une confirmation plus nette.`;
      refusalReason = "Trade non ouvert : confirmation encore insuffisante.";
    }
  } else {
    side = null;
    if (trend < 45 && momentum < 45) {
      blockerType = "signal";
      waitFor = "attendre un signal plus clair";
      reason = `${trendLabel}, mais le mouvement reste trop faible pour proposer un trade.`;
      aiSummary = `Le moteur refuse le trade car le signal reste trop faible.`;
      refusalReason = "Pas de trade : signal trop faible.";
    } else if (entryQuality < 45) {
      blockerType = "timing";
      waitFor = "attendre un meilleur point d'entree";
      reason = `${trendLabel}, mais l'entree est trop mauvaise pour etre exploitee.`;
      aiSummary = `Le moteur refuse le trade car le timing d'entree est mauvais.`;
      refusalReason = "Pas de trade : timing d'entree mauvais.";
    } else if (risk < 45) {
      blockerType = "risque";
      waitFor = "attendre moins de risque";
      reason = `${trendLabel}, mais le risque reste trop eleve.`;
      aiSummary = `Le moteur refuse le trade car le risque reste trop eleve.`;
      refusalReason = "Pas de trade : risque trop eleve.";
    } else {
      blockerType = "ratio";
      waitFor = "attendre un meilleur ratio gain / risque";
      reason = `${trendLabel}, mais le trade n'offre pas encore un plan assez propre.`;
      aiSummary = `Le moteur refuse le trade car le plan global reste trop faible.`;
      refusalReason = "Pas de trade : plan encore insuffisant.";
    }
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
      aiContext,
      finalScore,
      trendLabel,
      blockerType,
      waitFor
    };
  }

  const riskDistance = Math.max(
    vol * (detail.assetClass === "crypto" ? 1.0 : 0.85),
    detail.price * (detail.assetClass === "crypto" ? 0.013 : 0.009)
  );
  const rewardMultiplier = finalScore >= 80 ? 2.6 : 2.1;
  const rewardDistance = riskDistance * rewardMultiplier;
  const entry = detail.price;
  const stopLoss = side === "long" ? entry - riskDistance : entry + riskDistance;
  const takeProfit = side === "long" ? entry + rewardDistance : entry - rewardDistance;
  const rr = rewardDistance / riskDistance;
  const horizonDays = finalScore >= 80 ? (detail.assetClass === "crypto" ? 2 : 4) : (detail.assetClass === "crypto" ? 3 : 5);

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
    aiContext,
    finalScore,
    trendLabel,
    blockerType,
    waitFor
  };
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

function rowIsUnavailable(item) {
  return !item || item.status === "unavailable" || item.scoreStatus === "unavailable";
}

function rowDecisionLabel(item) {
  if (rowIsUnavailable(item)) return "Indisponible";
  return item?.decision || "Pas de trade";
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
  return state.detail?.plan || null;
}

  function normalizeOpportunity(item) {
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
      scoreStatus: item?.scoreStatus || (item?.price != null ? "complete" : "unavailable"),
      direction: item?.direction || "neutral",
      analysisLabel: item?.analysisLabel || null,
      confidence: item?.confidence || "low",
      confidenceLabel: item?.confidenceLabel || simpleConfidenceLabel(item?.confidence || "low"),
      breakdown: item?.breakdown || null,
      reasonShort: item?.reasonShort || null,
      decision: item?.decision || null,
      trendLabel: item?.trendLabel || null,
      plan: item?.plan || null,
      candles: Array.isArray(item?.candles) ? item.candles : [],
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
      decision: stored.decision || current.decision || null,
      trendLabel: stored.trendLabel || current.trendLabel || null,
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

  function setOpportunities(rows) {
    const prepared = Array.isArray(rows) ? backfillOpportunities(rows).map(normalizeOpportunity) : [];
    state.opportunities = prepared;
    saveOpportunitiesSnapshot(prepared);
    applyFilter();
    state.opportunitiesFetchedAt = Date.now();
    state.opportunitiesLastGoodAt = state.opportunitiesFetchedAt;
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
        decision: localPlan?.decision || "Pas de trade conseille",
        prudence: localPlan?.safety || "moyenne",
        reason: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        invalidation: localPlan?.refusalReason || "Attendre un signal plus propre.",
        summary: localPlan?.aiSummary || localPlan?.reason || "Lecture prudente locale utilisee.",
        warning: "Pont Analyse externe indisponible."
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
      if (rows.length) {
        setOpportunities(rows);
        state.opportunitiesLastGoodAt = Date.now();
      }
      markScheduledFetch("opportunities");
      state.error = null;
    } catch (e) {
      if (requestId !== state.opportunitiesRequestId) return;
      if (!state.opportunities.length && state.opportunitiesSnapshot?.length) {
        state.opportunities = state.opportunitiesSnapshot.map(normalizeOpportunity);
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

      state.detail = merged;
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
  if (!d || !plan || !plan.side || plan.decision !== "Trade propose") {
    state.error = "Aucun trade n'est propose automatiquement pour le moment.";
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
  state.error = `Trade propose cree : ${d.symbol} (${simpleSideLabel(plan.side)})`;
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

  
function groupedOpportunities(rows) {
  const items = Array.isArray(rows) ? rows.slice() : [];
  const buckets = { proposed: [], watch: [], noTrade: [] };

  items.forEach((item) => {
    const decision = rowDecisionLabel(item);
    const score = typeof item?.score === "number" ? item.score : -1;
    const enriched = { ...item, _score: score };

    if (decision === "Trade propose") buckets.proposed.push(enriched);
    else if (decision === "A surveiller") buckets.watch.push(enriched);
    else buckets.noTrade.push(enriched);
  });

  const sorter = (a, b) => {
    if ((b._score ?? -1) !== (a._score ?? -1)) return (b._score ?? -1) - (a._score ?? -1);
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
      render();
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
    const scoreValue = typeof item?.score === "number" ? item.score : null;
    const decisionLabel = rowDecisionLabel(item);
    const trendLabel = rowTrendLabel(item);
    const note = item?.reasonShort || item?.error || null;

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
          ${scoreRing(scoreValue)}
          <div class="score-meta">
            ${badge(decisionLabel, decisionLabel)}
            ${badge(trendLabel, item.direction || "")}
          </div>
        </div>
        <div class="price-col">
          <div class="price">${item.price != null ? priceDisplay(item.price) : "Donnee indisponible"}</div>
          <div class="change ${changeClass}">${pct(item.change24hPct)}</div>
          ${note ? `<div class="muted opp-note">${safeText(note)}</div>` : ""}
        </div>
        <div class="meta-col">
          ${badge(simpleAssetClassLabel(item.assetClass), item.assetClass)}
          ${badge(`fiabilite ${safeText(item.confidenceLabel || simpleConfidenceLabel(item.confidence || "low"))}`)}
          ${state.settings.showSourceBadges ? badge(item.sourceUsed || "source?") : ""}
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
  const rows = Array.isArray(opps) ? opps.filter((x) => typeof x?.score === "number") : [];
  rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  return rows[0] || null;
}


function renderDashboard() {
    const stats = trainingStats();
    const summary = dashboardSignalSummary(state.opportunities);
    const topPick = dashboardTopPick(state.opportunities);
    const topRows = state.opportunities.slice(0, 5);
    const recentAlgo = state.algoJournal.slice(0, 3);

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">Vue rapide, lecture simple, priorites utiles.</div>
        </div>

        <div class="card dashboard-hero-card" style="margin-bottom:18px">
          <div class="dashboard-hero-top">
            <div>
              <div class="dashboard-hero-title">${stats.openCount} position${stats.openCount > 1 ? "s ouvertes" : " ouverte"}</div>
              <div class="dashboard-hero-subtitle">${summary.title} · ${summary.text}</div>
            </div>
            <div class="legend">
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
          <div class="stat-card"><div class="stat-label">Opportunites visibles</div><div class="stat-value">${state.opportunities.length}</div></div>
          <div class="stat-card"><div class="stat-label">Hausse</div><div class="stat-value">${summary.bullish}</div></div>
          <div class="stat-card"><div class="stat-label">Baisse</div><div class="stat-value">${summary.bearish}</div></div>
          <div class="stat-card"><div class="stat-label">Neutre</div><div class="stat-value">${summary.neutral}</div></div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="section-title"><span>Meilleure opportunite du moment</span><span>${topPick ? topPick.symbol : "—"}</span></div>
            ${topPick ? `
              <div class="top-pick-box">
                <div>
                  <div class="trade-symbol">${safeText(topPick.symbol)}</div>
                  <div class="trade-sub">${safeText(topPick.name || "Actif")}</div>
                </div>
                <div class="legend">
                  ${badge(rowTradePlan(topPick)?.trendLabel || "analyse en cours")}
                  ${badge(topPick.confidence || "fiabilite")}
                </div>
              </div>
              <div class="kv" style="margin-top:14px">
                <div class="muted">Prix</div><div>${priceDisplay(topPick.price)}</div>
                <div class="muted">Variation 24h</div><div>${pct(topPick.change24hPct)}</div>
                <div class="muted">Tendance</div><div>${safeText(rowTradePlan(topPick)?.trendLabel || "analyse en cours")}</div>
                <div class="muted">Source</div><div>${safeText(topPick.sourceUsed || "—")}</div>
              </div>
              <div class="trade-actions" style="margin-top:14px">
                <button class="btn trade-btn primary" data-open-symbol="${safeText(topPick.symbol)}">Ouvrir la fiche</button>
              </div>
            ` : `<div class="empty-state">Aucune opportunite assez lisible pour le moment.</div>`}
          </div>

          <div class="card">
            <div class="section-title"><span>Dernieres decisions algo</span><span>${recentAlgo.length}</span></div>
            ${recentAlgo.length ? `
              <div class="algo-feed">
                ${recentAlgo.map((row) => `
                  <div class="algo-row full">
                    <div>
                      <div class="trade-symbol">${safeText(row.symbol)}</div>
                      <div class="trade-sub">${new Date(row.createdAt).toLocaleString("fr-FR")}</div>
                    </div>
                    <div>${badge(row.decision || "—", decisionBadgeClass(row.decision || ""))}</div>
                    <div class="muted">${safeText(row.aiSummary || row.reason || "—")}</div>
                  </div>
                `).join("")}
              </div>
            ` : `<div class="empty-state">Aucune decision recente pour le moment.</div>`}
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="section-title"><span>Meilleures opportunites</span><span>${topRows.length}</span></div>
          ${topRows.length ? `<div class="opp-list">${topRows.map((item, idx) => renderOppRow(item, idx + 1)).join("")}</div>` : `<div class="empty-state">Aucune opportunite disponible.</div>`}
        </div>
      </div>`;
  }

  function renderOpportunities() {
    const groups = groupedOpportunities(state.filteredOpportunities || []);
    const total = (state.filteredOpportunities || []).length;
    const visibleHydrating = (state.filteredOpportunities || []).filter((item) => !!state.nonCryptoHydration[String(item?.symbol || "").toUpperCase()]).length;

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Opportunites</div>
          <div class="screen-subtitle">Lecture simple. Le worker fournit directement le score, la decision et la tendance.</div>
        </div>

        <div class="opp-toolbar">
          <div class="filter-group">
            ${["all","crypto","stock","etf","forex","commodity"].map((f) => `
              <button class="chip ${state.opportunityFilter === f ? "active" : ""}" data-filter="${f}">
                ${f === "all" ? "all" : f}
              </button>
            `).join("")}
            <button class="chip" data-refresh="opps">Rafraichir</button>
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
          "Actifs a regarder en premier.",
          groups.proposed,
          1,
          "Aucun trade propose pour le moment."
        )}

        ${renderOpportunitySection(
          "A surveiller",
          "Actifs a surveiller avant ouverture.",
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

  
function simpleReliabilityLabel(score) {
  if (score == null) return "indisponible";
  if (score >= 70) return "elevee";
  if (score >= 55) return "moyenne";
  return "faible";
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
  const trend = simpleTrendWord(plan?.trendLabel || "");
  if (String(plan?.decision || "") === "Trade propose") return "Rien de bloquant pour le moment.";
  if (score < 40) return "Le signal est trop faible pour prendre position.";
  if (trend === "hausse" || trend === "baisse") return "La tendance existe, mais l'entree n'est pas assez propre.";
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


function computeOfficialPlan(detail) { return detail ? generateTradePlan(detail) : null; }

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
  if (locked?.officialScore != null && !Number.isNaN(Number(locked.officialScore))) return Number(locked.officialScore);
  if (locked?.score != null && !Number.isNaN(Number(locked.score))) return Number(locked.score);
  return null;
}

function officialPlanForDetail(detail) {
  const locked = lockDetailToOfficialRow(detail);
  const plan = computeOfficialPlan(locked);
  if (!plan) return plan;

  const displayScore = strictDisplayScore(locked);
  if (displayScore != null) {
    plan.finalScore = displayScore;
  }

  if (locked?.officialDecision) plan.decision = locked.officialDecision;
  if (locked?.officialTrendLabel) plan.trendLabel = locked.officialTrendLabel;
  if (locked?.officialWaitFor) plan.waitFor = locked.officialWaitFor;

  return plan;
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
                  ${badge(d.trendLabel || simpleDirectionLabel(d.direction, d.score), d.direction || "")}
                  ${badge(simpleScoreStatusLabel(d.scoreStatus || "n/a"), d.scoreStatus || "")}
                  ${badge(`fiabilite ${safeText(d.confidenceLabel || simpleConfidenceLabel(d.confidence || "low"))}`)}
                  ${state.settings.showSourceBadges ? badge(d.sourceUsed || "source?") : ""}
                  ${state.settings.showSourceBadges ? badge(simpleFreshnessLabel(d.freshness || "unknown"), d.freshness || "") : ""}
                </div>
                ${(() => {
                  const plan = currentTradePlan();
                  return `
                    <div class="plan-card">
                      <div class="section-title"><span>Decision automatique</span><span>${safeText(plan?.decision || "—")}</span></div>
                      <div class="kv plan-grid">
                        <div class="muted">Decision simple</div><div>${safeText(plan?.decision || "Pas de trade")}</div>
                        <div class="muted">Tendance</div><div>${safeText(plan?.trendLabel || d.trendLabel || detectedTrendLabel(d.direction || "neutral"))}</div>
                        <div class="muted">Entree</div><div>${plan?.entry != null ? priceDisplay(plan.entry) : "—"}</div>
                        <div class="muted">Stop</div><div>${plan?.stopLoss != null ? priceDisplay(plan.stopLoss) : "—"}</div>
                        <div class="muted">Objectif</div><div>${plan?.takeProfit != null ? priceDisplay(plan.takeProfit) : "—"}</div>
                        <div class="muted">Ratio</div><div>${plan?.rr != null ? num(plan.rr, 2) : "—"}</div>
                        <div class="muted">Niveau de fiabilite</div><div>${plan?.finalScore != null ? `${num(plan.finalScore, 0)}/100 · ${safeText(simpleReliabilityLabel(plan.finalScore))}` : "—"}</div>
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
                      <div class="muted">Pourquoi</div><div>${safeText(state.aiReview.reason || "—")}</div>
                      <div class="muted">Ce qui bloque</div><div>${safeText(state.aiReview.invalidation || "—")}</div>
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
              <div class="card conclusion-card" style="margin-bottom:18px">
                <div class="section-title"><span>Conclusion</span><span>${strictDisplayScore(state.detail) != null ? strictDisplayScore(state.detail) : (currentTradePlan()?.finalScore != null ? currentTradePlan().finalScore : "—")}/100</span></div>
                <div class="conclusion-top">
                  <div class="conclusion-main">
                    <div class="conclusion-decision">${safeText(simpleDecisionTitle(currentTradePlan()))}</div>
                    <div class="conclusion-line">Fiabilite du trade : <strong>${safeText(simpleReliabilityLabel(currentTradePlan()?.finalScore))}</strong></div>
                    <div class="conclusion-line">Tendance : <strong>${safeText(currentTradePlan()?.trendLabel || d.trendLabel || detectedTrendLabel(d.direction || "neutral"))}</strong></div>
                    <div class="conclusion-line">Force de la tendance : <strong>${safeText(simpleTrendStrengthLabel(d))}</strong></div>
                    <div class="conclusion-line">Timing d'entree : <strong>${safeText(simpleTimingLabel(currentTradePlan()))}</strong></div>
                    <div class="conclusion-line">A faire maintenant : <strong>${safeText(actionNowLabel(currentTradePlan()))}</strong></div>
                  </div>
                  <div class="conclusion-score">
                    ${scoreRing(currentTradePlan()?.finalScore ?? d.score)}
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
  const opp = Array.isArray(state.opportunities) ? state.opportunities.find((o) => o.symbol === position.symbol) : null;
  const livePrice = opp?.price ?? position.entryPrice ?? null;
  const hasTarget = position.takeProfit != null && Number.isFinite(Number(position.takeProfit));
  const hasStop = position.stopLoss != null && Number.isFinite(Number(position.stopLoss));
  const pnlPctLive = livePrice == null || position.entryPrice == null ? null :
    (position.side === "long"
      ? ((livePrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - livePrice) / position.entryPrice) * 100);

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
  if (hasStop && livePrice != null) {
    stopDistancePct = position.side === "long"
      ? ((livePrice - position.stopLoss) / livePrice) * 100
      : ((position.stopLoss - livePrice) / livePrice) * 100;
    if (stopDistancePct <= 1.2) {
      label = "near_stop";
      text = "Proche du stop";
      badgeClass = "negative";
    }
  }

  let targetDistancePct = null;
  if (hasTarget && livePrice != null) {
    targetDistancePct = position.side === "long"
      ? ((position.takeProfit - livePrice) / livePrice) * 100
      : ((livePrice - position.takeProfit) / livePrice) * 100;
    if (targetDistancePct <= 1.5 && targetDistancePct >= -1) {
      label = "near_target";
      text = "Proche de l'objectif";
      badgeClass = "positive";
    }
  }

  return { livePrice, pnlPctLive, stopDistancePct, targetDistancePct, label, text, badgeClass };
}

function partialClosePosition(positionId, percent = 50) {
  const idx = state.trades.positions.findIndex((p) => p.id === positionId);
  if (idx === -1) return;
  const position = state.trades.positions[idx];
  const meta = tradeStatusMeta(position);
  const livePrice = meta.livePrice ?? position.entryPrice;
  const ratio = Math.max(0.1, Math.min(1, percent / 100));
  const closeQty = Number(position.quantity || 0) * ratio;
  if (!Number.isFinite(closeQty) || closeQty <= 0) return;

  const remainingQty = Number(position.quantity || 0) - closeQty;
  const pnl = position.side === "long"
    ? (livePrice - position.entryPrice) * closeQty
    : (position.entryPrice - livePrice) * closeQty;
  const pnlPct = position.entryPrice ? ((pnl / (position.entryPrice * closeQty)) * 100) : null;

  state.trades.history.unshift({
    id: `${position.id}:partial:${Date.now()}`,
    symbol: position.symbol,
    side: position.side,
    quantity: closeQty,
    entryPrice: position.entryPrice,
    exitPrice: livePrice,
    pnl,
    pnlPct,
    closedAt: new Date().toISOString(),
    sourceUsed: position.sourceUsed || "training",
    closeType: "Partielle 50%"
  });

  if (remainingQty <= 0.0000001) {
    state.trades.positions.splice(idx, 1);
  } else {
    state.trades.positions[idx] = {
      ...position,
      quantity: remainingQty,
      partialClosedAt: new Date().toISOString()
    };
  }

  state.error = null;
  saveAppState();
  render();
}

function closeTradePosition(positionId) {
  const idx = state.trades.positions.findIndex((p) => p.id === positionId);
  if (idx === -1) return;
  const position = state.trades.positions[idx];
  const meta = tradeStatusMeta(position);
  const livePrice = meta.livePrice ?? position.entryPrice;
  const pnl = position.side === "long"
    ? (livePrice - position.entryPrice) * position.quantity
    : (position.entryPrice - livePrice) * position.quantity;
  const pnlPct = position.entryPrice ? ((pnl / (position.entryPrice * position.quantity)) * 100) : null;

  state.trades.history.unshift({
    id: `${position.id}:full:${Date.now()}`,
    symbol: position.symbol,
    side: position.side,
    quantity: position.quantity,
    entryPrice: position.entryPrice,
    exitPrice: livePrice,
    pnl,
    pnlPct,
    closedAt: new Date().toISOString(),
    sourceUsed: position.sourceUsed || "training",
    closeType: "Complete"
  });

  state.trades.positions.splice(idx, 1);
  state.error = null;
  saveAppState();
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
  const meta = tradeStatusMeta(position);
  return `<div class="trade-row trade-card-row simple-trade-card">
    <div class="trade-card-top">
      <div>
        <div class="trade-symbol">${safeText(position.symbol)}</div>
        <div class="trade-sub">${safeText(position.analysisSnapshot?.decision || position.tradeDecision || "Trade ouvert")}</div>
      </div>
      <div class="trade-card-badges">
        ${badge(simpleSideLabel(position.side), position.side)}
        ${badge(tradeHealthLabel(meta), meta.badgeClass)}
      </div>
    </div>

    <div class="trade-summary-line">${safeText(actionTradeSummary(meta))}</div>

    <div class="trade-plan-grid compact">
      <div><span class="muted">Prix d'entree</span><br>${priceDisplay(position.entryPrice)}</div>
      <div><span class="muted">Prix actuel</span><br>${meta.livePrice == null ? "—" : priceDisplay(meta.livePrice)}</div>
      <div><span class="muted">Stop</span><br>${position.stopLoss == null ? "—" : priceDisplay(position.stopLoss)}</div>
      <div><span class="muted">Objectif</span><br>${position.takeProfit == null ? "—" : priceDisplay(position.takeProfit)}</div>
      <div><span class="muted">Etat du trade</span><br>${safeText(tradeHealthLabel(meta))}</div>
      <div><span class="muted">Resultat live</span><br>${safeText(tradePnlText(meta))}</div>
      <div><span class="muted">Avant stop</span><br>${meta.stopDistancePct == null ? "—" : `${num(meta.stopDistancePct, 2)}%`}</div>
      <div><span class="muted">Avant objectif</span><br>${meta.targetDistancePct == null ? "—" : `${num(meta.targetDistancePct, 2)}%`}</div>
    </div>

    <div class="trade-plan-grid compact">
      <div><span class="muted">Horizon</span><br>${safeText(position.analysisSnapshot?.horizon || position.horizon || "—")}</div>
      <div style="grid-column: span 3"><span class="muted">Pourquoi</span><br>${safeText(position.analysisSnapshot?.reason || position.tradeReason || "Pas de commentaire pour le moment.")}</div>
    </div>

    <div class="trade-actions split">
      <button class="btn trade-btn secondary" data-close-half="${safeText(position.id)}">Cloturer 50%</button>
      <button class="btn trade-btn primary" data-close-trade="${safeText(position.id)}">Cloturer</button>
    </div>
  </div>`;
}

function renderHistoryRow(item) {
    return `
      <div class="trade-row history simple-history-row">
        <div>
          <div class="trade-symbol">${safeText(item.symbol)}</div>
          <div class="trade-sub">${new Date(item.closedAt).toLocaleString("fr-FR")}</div>
        </div>
        <div>${badge(simpleSideLabel(item.side), item.side)}</div>
        <div>${badge(historyResultLabel(item), (Number(item.pnl || 0) >= 0 ? "positive" : "negative"))}</div>
        <div>${priceDisplay(item.entryPrice)}</div>
        <div>${priceDisplay(item.exitPrice)}</div>
        <div class="${(item.pnl || 0) >= 0 ? 'positive' : 'negative'}">${money((item.pnl || 0) * fxRateUsdToEur(), "EUR")} · ${pct(item.pnlPct)}</div>
        <div>${safeText(item.closeType || item.sourceUsed || "training")}</div>
      </div>`;
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
  const legacy = position.analysisSnapshot || null;
  const snapshot = legacy || {
    symbol: position.symbol || null,
    name: position.name || position.symbol || null,
    score: Number.isFinite(Number(position.score)) ? Number(position.score) : null,
    decision: position.analysisSnapshot?.decision || position.tradeDecision || null,
    trendLabel: position.trendLabel || detectedTrendLabel(position.direction || "neutral"),
    direction: position.direction || null,
    entry: Number.isFinite(Number(position.entryPrice)) ? Number(position.entryPrice) : null,
    stopLoss: Number.isFinite(Number(position.stopLoss)) ? Number(position.stopLoss) : null,
    takeProfit: Number.isFinite(Number(position.takeProfit)) ? Number(position.takeProfit) : null,
    ratio: Number.isFinite(Number(position.rrRatio)) ? Number(position.rrRatio) : null,
    horizon: position.analysisSnapshot?.horizon || position.horizon || null,
    reason: position.analysisSnapshot?.reason || position.tradeReason || null,
    scoreBreakdown: position.scoreBreakdown || null,
    sourceUsed: position.source || null,
    analysisTimestamp: position.openedAt || Date.now()
  };
  return {
    ...position,
    analysisSnapshot: snapshot,
    execution: position.execution || {
      openedAt: position.openedAt || Date.now(),
      entryPrice: Number.isFinite(Number(position.entryPrice)) ? Number(position.entryPrice) : null,
      quantity: Number.isFinite(Number(position.quantity)) ? Number(position.quantity) : null,
      invested: Number.isFinite(Number(position.invested)) ? Number(position.invested) : null,
    },
    live: position.live || {
      updatedAt: Date.now(),
      price: null,
      pnl: null,
      pnlPct: null,
    },
    tradeDecision: snapshot.decision || position.analysisSnapshot?.decision || position.tradeDecision || null,
    tradeReason: snapshot.reason || position.analysisSnapshot?.reason || position.tradeReason || null,
    trendLabel: snapshot.trendLabel || position.trendLabel || null,
    horizon: snapshot.horizon || position.analysisSnapshot?.horizon || position.horizon || null,
    stopLoss: Number.isFinite(Number(snapshot.stopLoss)) ? Number(snapshot.stopLoss) : position.stopLoss,
    takeProfit: Number.isFinite(Number(snapshot.takeProfit)) ? Number(snapshot.takeProfit) : position.takeProfit,
    score: Number.isFinite(Number(snapshot.score)) ? Number(snapshot.score) : position.score,
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

  function renderPortfolio() {
    restoreTradesFromBackupIfEmpty();
    const stats = trainingStats();
    const positions = state.trades.positions;
    const history = state.trades.history;
    const algoCounts = (typeof algoDecisionCounts === "function") ? algoDecisionCounts() : { total: 0, conseille: 0, possible: 0, surveiller: 0, eviter: 0, aucun: 0, manuel: 0 };
    const insights = (typeof groupedHistoryInsights === "function") ? groupedHistoryInsights() : { best: [], worst: [] };
    const riskRows = (typeof openPositionsRiskView === "function") ? openPositionsRiskView() : [];

    return `
      <div class="screen">
        <div class="screen-header">
          <div class="screen-title">Mes trades</div>
          <div class="screen-subtitle">Lecture simple des positions ouvertes, des trades clotures et des zones a surveiller. Les trades sont maintenant sauvegardes avec un snapshot d'analyse, une execution et un etat live.</div>
          ${(() => { const meta = loadTradesMeta(); return meta?.updatedAt ? `<div class="muted">Derniere sauvegarde locale : ${new Date(meta.updatedAt).toLocaleString("fr-FR")}</div>` : ""; })()}
          <div class="muted">Etat Supabase : ${
            state.trades.remoteStatus === "connected"
              ? `connecte${state.trades.lastRemoteSyncAt ? " · sync " + new Date(state.trades.lastRemoteSyncAt).toLocaleString("fr-FR") : ""}`
              : state.trades.remoteStatus === "fallback_local"
                ? `fallback local · ${safeText(state.trades.remoteError || "erreur distante")}`
                : "local uniquement"
          }</div>
        </div>

        <div class="controls">
          <button class="btn ${state.trades.mode === 'training' ? 'active' : ''}" data-trade-mode="training">Entrainement</button>
          <button class="btn ${state.trades.mode === 'real' ? 'active' : ''}" data-trade-mode="real">Reel</button>
        </div>

        ${state.trades.mode === "real" ? `
          <div class="empty-state">Le portefeuille reel n'est pas encore branche. Cette partie restera vide tant qu'aucune source reelle n'est connectee.</div>
        ` : `
          <div class="grid trades-stats">
            <div class="stat-card"><div class="stat-label">Trades ouverts</div><div class="stat-value">${stats.openCount}</div></div>
            <div class="stat-card"><div class="stat-label">Trades clotures</div><div class="stat-value">${stats.closedCount}</div></div>
            <div class="stat-card"><div class="stat-label">Resultat realise</div><div class="stat-value">${money(stats.realized * fxRateUsdToEur(), "EUR")}</div></div>
          </div>

          <div class="grid trades-stats" style="margin-top:14px">
            <div class="stat-card"><div class="stat-label">Trades proposes</div><div class="stat-value">${algoCounts.conseille}</div></div>
            <div class="stat-card"><div class="stat-label">Possibles</div><div class="stat-value">${algoCounts.possible}</div></div>
            <div class="stat-card"><div class="stat-label">A surveiller</div><div class="stat-value">${algoCounts.surveiller}</div></div>
            <div class="stat-card"><div class="stat-label">A eviter</div><div class="stat-value">${algoCounts.eviter}</div></div>
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Lecture rapide</span><span>${positions.length}</span></div>
            <div class="portfolio-overview-text">
              ${positions.length
                ? `${positions.length} trade${positions.length > 1 ? "s sont" : " est"} ouvert${positions.length > 1 ? "s" : ""}. ${riskRows.length ? `${riskRows.filter((r) => r.distanceToStop != null && r.distanceToStop <= 2).length} position${riskRows.filter((r) => r.distanceToStop != null && r.distanceToStop <= 2).length > 1 ? "s sont" : " est"} proche${riskRows.filter((r) => r.distanceToStop != null && r.distanceToStop <= 2).length > 1 ? "s" : ""} du stop.` : ""}`
                : "Aucun trade ouvert pour le moment."}
            </div>
          </div>

          <div class="risk-layout">
            <div class="card" style="margin-top:18px">
              <div class="section-title"><span>Positions a surveiller</span><span>${riskRows.length}</span></div>
              ${riskRows.length ? `
                <div class="risk-list">
                  ${riskRows.slice(0, 8).map((row) => `
                    <div class="risk-row">
                      <div>
                        <div class="trade-symbol">${safeText(row.symbol)}</div>
                        <div class="trade-sub">${safeText(row.tradeDecision || "trade ouvert")}</div>
                      </div>
                      <div>${badge(simpleSideLabel(row.side), row.side)}</div>
                      <div>${row.distanceToStop == null ? "stop indisponible" : `${num(row.distanceToStop, 2)}% avant stop`}</div>
                    </div>
                  `).join("")}
                </div>
              ` : `<div class="empty-state">Aucune position ouverte pour le moment.</div>`}
            </div>

            <div class="card" style="margin-top:18px">
              <div class="section-title"><span>Bilan rapide</span><span>historique</span></div>
              <div class="perf-columns">
                <div>
                  <div class="muted" style="margin-bottom:8px">Actifs qui ont le mieux marche</div>
                  ${insights.best.length ? insights.best.map((row) => `
                    <div class="mini-perf-row">
                      <span>${safeText(row.symbol)}</span>
                      <span>${money(row.pnl * fxRateUsdToEur(), "EUR")} · ${row.count} trade(s)</span>
                    </div>
                  `).join("") : `<div class="empty-mini">Pas assez d'historique</div>`}
                </div>
                <div>
                  <div class="muted" style="margin-bottom:8px">Actifs les plus difficiles</div>
                  ${insights.worst.length ? insights.worst.map((row) => `
                    <div class="mini-perf-row">
                      <span>${safeText(row.symbol)}</span>
                      <span>${money(row.pnl * fxRateUsdToEur(), "EUR")} · ${row.count} trade(s)</span>
                    </div>
                  `).join("") : `<div class="empty-mini">Pas assez d'historique</div>`}
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Trades ouverts</span><span>${positions.length}</span></div>
            ${positions.length ? `
              <div class="trade-table simplified-open-trades">
                ${positions.map(renderPositionRow).join("")}
              </div>
            ` : `<div class="empty-state">Aucun trade ouvert. Ouvre une fiche actif quand un trade est vraiment propose.</div>`}
          </div>

          <div class="card" style="margin-top:18px">
            <div class="section-title"><span>Trades clotures</span><span>${history.length}</span></div>
            ${history.length ? `
              <div class="trade-table simplified-history">
                <div class="trade-row trade-head">
                  <div>Actif</div><div>Sens</div><div>Resultat</div><div>Entree</div><div>Sortie</div><div>P/L</div><div>Cloture</div>
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

        <div class="card" style="margin-top:16px">
          <div class="section-title">Supabase trades</div>
          <div class="setting-list">
            <label class="setting-row">
              <div>
                <div class="setting-title">Activer Supabase pour les trades</div>
                <div class="setting-desc">Les trades ouverts et clotures seront lus et sauvegardes sur Supabase. Le local reste en secours.</div>
              </div>
              <input type="checkbox" data-setting-toggle="supabaseEnabled" ${state.settings.supabaseEnabled ? "checked" : ""}>
            </label>

            <label class="setting-row">
              <div style="width:100%">
                <div class="setting-title">URL Supabase</div>
                <div class="setting-desc">Exemple : https://xxxx.supabase.co</div>
                <input class="setting-input" data-setting-input="supabaseUrl" value="${safeText(state.settings.supabaseUrl || "")}" placeholder="https://xxxxx.supabase.co" style="width:100%;margin-top:8px">
              </div>
            </label>

            <label class="setting-row">
              <div style="width:100%">
                <div class="setting-title">Anon key Supabase</div>
                <div class="setting-desc">Cle publique anon utilisee par le frontend.</div>
                <input class="setting-input" data-setting-input="supabaseAnonKey" value="${safeText(state.settings.supabaseAnonKey || "")}" placeholder="eyJ..." style="width:100%;margin-top:8px">
              </div>
            </label>

            <div class="muted">
              Etat distant : ${
                state.trades.remoteStatus === "connected" ? "connecte" :
                state.trades.remoteStatus === "fallback_local" ? `fallback local (${safeText(state.trades.remoteError || "erreur")})` :
                "local uniquement"
              }
            </div>
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

    app.querySelectorAll("[data-setting-input]").forEach(el => {
      const save = () => {
        const key = el.getAttribute("data-setting-input");
        state.settings[key] = el.value;
        persistSettings();
      };
      el.addEventListener("change", save);
      el.addEventListener("blur", save);
    });
  }

  async function boot() {
    await loadTradesState();
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
