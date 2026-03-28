// ============================================================
// ManiTradePro V1 — App Bundle (standalone, no ES modules)
// ============================================================
'use strict';


// ═══ Supabase — Synchronisation temps réel ═══
const SupabaseDB = (() => {
  const URL = 'https://ukgfyhdzbfhxpmnhdlgq.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZ2Z5aGR6YmZoeHBtbmhkbGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTI3NDYsImV4cCI6MjA5MDIyODc0Nn0.BJ1yb-5bCam0MLR2tjOp3JN56MJeK22HxqGbJpJM1w0';
  const HEADERS = {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Prefer': 'return=representation',
  };

  async function _request(method, table, body = null, query = '') {
    try {
      const r = await fetch(URL + '/rest/v1/' + table + query, {
        method,
        headers: HEADERS,
        body: body ? JSON.stringify(body) : null,
      });
      if (!r.ok) {
        const err = await r.text();
        console.warn('[Supabase]', method, table, err);
        return null;
      }
      const text = await r.text();
      return text ? JSON.parse(text) : [];
    } catch(e) {
      console.warn('[Supabase] Error:', e.message);
      return null;
    }
  }

  // ── Capital
  async function getCapital() {
    const data = await _request('GET', 'capital', null, '?id=eq.1');
    return data?.[0]?.amount || null;
  }
  async function saveCapital(amount) {
    return _request('PATCH', 'capital', { amount, updated_at: new Date().toISOString() }, '?id=eq.1');
  }

  // ── Positions
  async function getPositions() {
    return await _request('GET', 'positions', null, '?order=opened_at.desc') || [];
  }
  async function savePosition(pos) {
    const data = {
      id: pos.id, symbol: pos.symbol, name: pos.name || pos.symbol,
      direction: pos.direction, entry_price: pos.entryPrice,
      quantity: pos.quantity, invested: pos.invested,
      stop_loss: pos.stopLoss || null, take_profit: pos.takeProfit || null,
      mode: pos.mode || 'sim', opened_at: pos.openedAt,
      score: pos.score || null,
    };
    return _request('POST', 'positions', data);
  }
  async function deletePosition(id) {
    return _request('DELETE', 'positions', null, '?id=eq.' + id);
  }

  // ── Trades (historique)
  async function getTrades() {
    return await _request('GET', 'trades', null, '?order=closed_at.desc&limit=200') || [];
  }
  async function saveTrade(trade) {
    const data = {
      id: trade.id, symbol: trade.symbol, direction: trade.direction,
      entry_price: trade.entryPrice, exit_price: trade.exitPrice || null,
      quantity: trade.quantity, invested: trade.invested,
      stop_loss: trade.stopLoss || null, take_profit: trade.takeProfit || null,
      pnl: trade.pnl || null, pnl_pct: trade.pnlPct || null,
      opened_at: trade.openedAt, closed_at: trade.closedAt || null,
      duration_days: trade.durationDays || null, mode: trade.mode || 'sim',
      score: trade.score || null, adj_score: trade.adjScore || null,
      rr_ratio: trade.rrRatio || null,
    };
    return _request('POST', 'trades', data);
  }

  // ── Sync complet
  async function syncAll() {
    try {
      const [cap, positions, trades] = await Promise.all([
        getCapital(), getPositions(), getTrades()
      ]);

      if (cap !== null) Storage.saveSimCapital(cap);

      if (positions?.length >= 0) {
        const mapped = positions.map(p => ({
          id: p.id, symbol: p.symbol, name: p.name,
          direction: p.direction, entryPrice: p.entry_price,
          quantity: p.quantity, invested: p.invested,
          stopLoss: p.stop_loss, takeProfit: p.take_profit,
          mode: p.mode, openedAt: p.opened_at,
        }));
        Storage.saveSimPositions(mapped.filter(p => p.mode === 'sim'));
        Storage.saveRealPositions(mapped.filter(p => p.mode === 'real'));
      }

      if (trades?.length >= 0) {
        const mapped = trades.map(t => ({
          id: t.id, symbol: t.symbol, direction: t.direction,
          entryPrice: t.entry_price, exitPrice: t.exit_price,
          quantity: t.quantity, invested: t.invested,
          pnl: t.pnl, pnlPct: t.pnl_pct,
          openedAt: t.opened_at, closedAt: t.closed_at,
          durationDays: t.duration_days, mode: t.mode,
        }));
        Storage.saveSimHistory(mapped.filter(t => t.mode === 'sim'));
      }

      console.log('[Supabase] ✅ Sync OK — capital:', cap, 'positions:', positions?.length, 'trades:', trades?.length);
      return true;
    } catch(e) {
      console.warn('[Supabase] Sync failed:', e.message);
      return false;
    }
  }

  // ── Ping pour garder la base active
  async function ping() {
    return _request('GET', 'capital', null, '?id=eq.1&select=id');
  }

  return { getCapital, saveCapital, getPositions, savePosition, deletePosition, getTrades, saveTrade, syncAll, ping };
})();


// ═══ TrendingEngine — Détection automatique de pépites ═══
const TrendingEngine = (() => {
  const PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev';
  const CACHE_TTL = 60 * 60 * 1000; // 1h
  let _cache = null;
  let _lastFetch = 0;
  let _countdown = 0;
  let _countdownInterval = null;

  async function fetchTrending() {
    const now = Date.now();
    if (_cache && (now - _lastFetch) < CACHE_TTL) return _cache;

    try {
      // Worker: Yahoo movers + Fear & Greed
      const [workerRes, cgRes] = await Promise.allSettled([
        fetch(PROXY + '/trending'),
        fetch('https://api.coingecko.com/api/v3/search/trending'),
      ]);

      let data = { trending: [], fearGreed: null, movers: [] };

      if (workerRes.status === 'fulfilled' && workerRes.value.ok) {
        data = await workerRes.value.json();
      }

      // CoinGecko direct depuis le navigateur
      if (cgRes.status === 'fulfilled' && cgRes.value.ok) {
        const cgData = await cgRes.value.json();
        data.trending = (cgData.coins || []).slice(0, 7).map(c => ({
          symbol: c.item.symbol.toUpperCase(),
          name: c.item.name,
          rank: c.item.market_cap_rank,
          source: 'CoinGecko Trending',
        }));
      }

      _cache = data;
      _lastFetch = now;
      _countdown = CACHE_TTL / 1000;
      _startCountdown();
      return data;
    } catch(e) {
      console.warn('[Trending] Error:', e.message);
      return { trending: [], fearGreed: null, movers: [] };
    }
  }

  function _startCountdown() {
    if (_countdownInterval) clearInterval(_countdownInterval);
    _countdownInterval = setInterval(() => {
      _countdown = Math.max(0, _countdown - 1);
      // Update UI countdown
      document.querySelectorAll('[data-trending-countdown]').forEach(el => {
        el.textContent = _formatCountdown(_countdown);
      });
      if (_countdown === 0) {
        fetchTrending().then(() => {
          if (window.__MTP?.Router) {
            const cur = window.__MTP.Router.getCurrent();
            if (cur === 'dashboard' || cur === 'opportunities') {
              window.__MTP.Router.navigate(cur);
            }
          }
        });
      }
    }, 1000);
  }

  function _formatCountdown(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getCountdown() {
    return _formatCountdown(_countdown);
  }

  function getFearGreedEmoji(value) {
    if (value <= 20) return '😱';
    if (value <= 40) return '😰';
    if (value <= 60) return '😐';
    if (value <= 80) return '😊';
    return '🤑';
  }

  function getFearGreedLabel(value) {
    if (value <= 20) return 'Peur extrême';
    if (value <= 40) return 'Peur';
    if (value <= 60) return 'Neutre';
    if (value <= 80) return 'Avidité';
    return 'Avidité extrême';
  }

  function getFearGreedColor(value) {
    if (value <= 20) return 'var(--loss)';
    if (value <= 40) return '#ff8c00';
    if (value <= 60) return 'var(--text-secondary)';
    if (value <= 80) return 'var(--profit)';
    return '#00e5a0';
  }

  // Enrichir les actifs trending avec le score algo
  function enrichWithAlgo(trendingData) {
    const analysis = window.__MTP?.lastAnalysis;
    if (!analysis) return trendingData;

    const enriched = { ...trendingData };

    // Enrichir trending cryptos
    enriched.trending = (trendingData.trending || []).map(t => {
      const algoResult = analysis.all?.find(a => a.symbol === t.symbol);
      return { ...t, algoScore: algoResult?.adjScore || null, algoDirection: algoResult?.direction || null, inWatchlist: !!algoResult };
    });

    // Enrichir movers
    enriched.movers = (trendingData.movers || []).map(m => {
      const algoResult = analysis.all?.find(a => a.symbol === m.symbol);
      return { ...m, algoScore: algoResult?.adjScore || null, inWatchlist: !!algoResult };
    });

    return enriched;
  }

  return { fetchTrending, getCountdown, getFearGreedEmoji, getFearGreedLabel, getFearGreedColor, enrichWithAlgo };
})();

// ── AbortSignal.timeout polyfill (iOS 15 and below) ──
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = function(ms) {
    var ctrl = new AbortController();
    setTimeout(function() { ctrl.abort(); }, ms);
    return ctrl.signal;
  };
}

// Global namespace
window.__MTP = {};
window.__prices = {};

// ═══ mockData.js ═══
const MOCK_DATA = {
  // ══ PRIX SUPPRIMÉS — Données réelles uniquement via Binance/Yahoo/TwelveData ══
  // Utiliser window.__prices[symbol] pour obtenir le vrai prix en temps réel
  prices: {},

  generateOHLC: function() { return []; }, // Supprimé — données réelles uniquement

  watchlist: [
    // ── Cryptos (Binance — illimité)
    { symbol: 'BTC',    name: 'Bitcoin',         class: 'crypto',    trend: 'up',      volatility: 0.025 },
    { symbol: 'ETH',    name: 'Ethereum',        class: 'crypto',    trend: 'up',      volatility: 0.028 },
    { symbol: 'SOL',    name: 'Solana',          class: 'crypto',    trend: 'up',      volatility: 0.040 },
    { symbol: 'BNB',    name: 'BNB',             class: 'crypto',    trend: 'up',      volatility: 0.022 },
    { symbol: 'XRP',    name: 'Ripple',          class: 'crypto',    trend: 'up',      volatility: 0.035 },
    { symbol: 'ADA',    name: 'Cardano',         class: 'crypto',    trend: 'neutral', volatility: 0.038 },
    { symbol: 'AVAX',   name: 'Avalanche',       class: 'crypto',    trend: 'up',      volatility: 0.045 },
    { symbol: 'DOT',    name: 'Polkadot',        class: 'crypto',    trend: 'neutral', volatility: 0.042 },
    { symbol: 'LINK',   name: 'Chainlink',       class: 'crypto',    trend: 'up',      volatility: 0.038 },
    { symbol: 'DOGE',   name: 'Dogecoin',        class: 'crypto',    trend: 'up',      volatility: 0.055 },
    { symbol: 'MATIC',  name: 'Polygon',         class: 'crypto',    trend: 'neutral', volatility: 0.048 },
    { symbol: 'UNI',    name: 'Uniswap',         class: 'crypto',    trend: 'neutral', volatility: 0.042 },
    { symbol: 'ATOM',   name: 'Cosmos',          class: 'crypto',    trend: 'neutral', volatility: 0.040 },
    { symbol: 'LTC',    name: 'Litecoin',        class: 'crypto',    trend: 'up',      volatility: 0.030 },
    { symbol: 'NEAR',   name: 'NEAR Protocol',   class: 'crypto',    trend: 'up',      volatility: 0.050 },
    // ── Actions US (Twelve Data)
    { symbol: 'AAPL',   name: 'Apple',           class: 'stock',     trend: 'up',      volatility: 0.014 },
    { symbol: 'MSFT',   name: 'Microsoft',       class: 'stock',     trend: 'up',      volatility: 0.013 },
    { symbol: 'NVDA',   name: 'Nvidia',          class: 'stock',     trend: 'up',      volatility: 0.022 },
    { symbol: 'TSLA',   name: 'Tesla',           class: 'stock',     trend: 'down',    volatility: 0.035 },
    { symbol: 'AMZN',   name: 'Amazon',          class: 'stock',     trend: 'up',      volatility: 0.018 },
    { symbol: 'GOOGL',  name: 'Alphabet',        class: 'stock',     trend: 'up',      volatility: 0.016 },
    { symbol: 'META',   name: 'Meta',            class: 'stock',     trend: 'up',      volatility: 0.020 },
    { symbol: 'NFLX',   name: 'Netflix',         class: 'stock',     trend: 'up',      volatility: 0.025 },
    { symbol: 'AMD',    name: 'AMD',             class: 'stock',     trend: 'up',      volatility: 0.028 },
    { symbol: 'JPM',    name: 'JPMorgan',        class: 'stock',     trend: 'up',      volatility: 0.015 },
    { symbol: 'V',      name: 'Visa',            class: 'stock',     trend: 'up',      volatility: 0.012 },
    { symbol: 'MA',     name: 'Mastercard',      class: 'stock',     trend: 'up',      volatility: 0.013 },
    { symbol: 'DIS',    name: 'Disney',          class: 'stock',     trend: 'neutral', volatility: 0.018 },
    { symbol: 'COIN',   name: 'Coinbase',        class: 'stock',     trend: 'up',      volatility: 0.045 },
    { symbol: 'PYPL',   name: 'PayPal',          class: 'stock',     trend: 'down',    volatility: 0.022 },
    // ── Actions EU (Twelve Data)
    { symbol: 'MC',     name: 'LVMH',            class: 'stock',     trend: 'up',      volatility: 0.016 },
    { symbol: 'ASML',   name: 'ASML',            class: 'stock',     trend: 'up',      volatility: 0.020 },
    { symbol: 'SAP',    name: 'SAP',             class: 'stock',     trend: 'up',      volatility: 0.014 },
    { symbol: 'TTE',    name: 'TotalEnergies',   class: 'stock',     trend: 'neutral', volatility: 0.015 },
    { symbol: 'BNP',    name: 'BNP Paribas',     class: 'stock',     trend: 'neutral', volatility: 0.018 },
    { symbol: 'AIR',    name: 'Airbus',          class: 'stock',     trend: 'up',      volatility: 0.016 },
    { symbol: 'RMS',    name: 'Hermès',          class: 'stock',     trend: 'up',      volatility: 0.015 },
    { symbol: 'OR',     name: "L'Oréal",         class: 'stock',     trend: 'up',      volatility: 0.013 },
    { symbol: 'SAN',    name: 'Sanofi',          class: 'stock',     trend: 'neutral', volatility: 0.012 },
    { symbol: 'STLA',   name: 'Stellantis',      class: 'stock',     trend: 'down',    volatility: 0.020 },
    // ── Forex (Twelve Data)
    { symbol: 'EURUSD', name: 'Euro / Dollar',   class: 'forex',     trend: 'neutral', volatility: 0.005 },
    { symbol: 'GBPUSD', name: 'Livre / Dollar',  class: 'forex',     trend: 'down',    volatility: 0.006 },
    { symbol: 'USDJPY', name: 'Dollar / Yen',    class: 'forex',     trend: 'up',      volatility: 0.006 },
    { symbol: 'USDCHF', name: 'Dollar / Franc',  class: 'forex',     trend: 'neutral', volatility: 0.005 },
    { symbol: 'AUDUSD', name: 'Australien / $',  class: 'forex',     trend: 'neutral', volatility: 0.006 },
    // ── Matières premières (Twelve Data)
    { symbol: 'GOLD',   name: 'Or (XAU/USD)',    class: 'commodity', trend: 'up',      volatility: 0.008 },
    { symbol: 'SILVER', name: 'Argent',          class: 'commodity', trend: 'up',      volatility: 0.012 },
    { symbol: 'OIL',    name: 'Pétrole (WTI)',   class: 'commodity', trend: 'neutral', volatility: 0.018 },
    // ── ETF (Twelve Data)
    { symbol: 'SPY',    name: 'S&P 500 ETF',     class: 'etf',       trend: 'up',      volatility: 0.010 },
    { symbol: 'QQQ',    name: 'Nasdaq 100 ETF',  class: 'etf',       trend: 'up',      volatility: 0.014 },
    { symbol: 'GLD',    name: 'Gold ETF',        class: 'etf',       trend: 'up',      volatility: 0.008 },
    { symbol: 'TLT',    name: 'Obligations US',  class: 'etf',       trend: 'down',    volatility: 0.010 },
  ],

  icons: {
    'BTC': '₿', 'ETH': 'Ξ', 'NVDA': 'N', 'AAPL': '',
    'MSFT': 'M', 'GOLD': 'Au', 'EURUSD': '€$', 'TSLA': 'T',
    'SOL': 'S', 'SPY': 'S&P', 'AMZN': 'A', 'GBPUSD': '£$',
  },

  sampleSimPositions: [],

  sampleTradeHistory: [],

  defaultSettings: {
    mode: 'simulation',
    riskProfile: 'balanced',
    riskPerTrade: 0.005,
    simulationCapital: 100000,
    simInitialCapital: 10000,
    donchianFast: 20,
    donchianSlow: 55,
    emaFast: 50,
    emaSlow: 100,
    atrPeriod: 14,
    adxPeriod: 14,
    stopAtrMultiplier: 2,
    trailAtrMultiplier: 3,
    minAdx: 20,
    minScore: 30,
    broker: 'none',
    theme: 'dark',
    currency: 'EUR',
    refreshInterval: 300,
    maxOpenPositions: 10,
    binanceApiKey: '',
    binanceSecret: '',
  },

  // marketRegime supprimé — calculé dynamiquement depuis les données réelles
};

MOCK_DATA._ohlcCache = {};
MOCK_DATA.getOHLC = function() { return []; }; // Supprimé — données réelles uniquement

// ═══ storage.js ═══
const Storage = (() => {
  const PREFIX = 'mtp_';
  const KEYS = {
    SETTINGS:      PREFIX + 'settings',
    SIM_CAPITAL:   PREFIX + 'sim_capital',
    SIM_POSITIONS: PREFIX + 'sim_positions',
    SIM_HISTORY:   PREFIX + 'sim_history',
    REAL_POSITIONS:PREFIX + 'real_positions',
    WATCHLIST:     PREFIX + 'watchlist',
    API_KEYS:      PREFIX + 'api_keys',
    ALERTS:        PREFIX + 'alerts',
  };

  function get(key) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch(e) { console.error('[Storage] get', key, e); return null; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e) { console.error('[Storage] set', key, e); return false; }
  }

  function getSettings() { return Object.assign({}, MOCK_DATA.defaultSettings, get(KEYS.SETTINGS) || {}); }
  function saveSettings(s) { return set(KEYS.SETTINGS, s); }
  const setSettings = saveSettings;

  function getSimCapital() {
    // Single source of truth — always a clean number
    const stored = get(KEYS.SIM_CAPITAL);
    if (stored === null) {
      const s = get(KEYS.SETTINGS);
      return parseFloat(s?.simInitialCapital) || 10000;
    }
    if (typeof stored === 'object' && stored !== null) {
      const v = stored.current || stored.initial || 10000;
      // Auto-fix corrupted object
      set(KEYS.SIM_CAPITAL, parseFloat(v) || 10000);
      return parseFloat(v) || 10000;
    }
    return parseFloat(stored) || 10000;
  }
  function saveSimCapital(v) {
    const num = typeof v === 'object' ? (v.current || v.initial || 10000) : parseFloat(v) || 10000;
    return set(KEYS.SIM_CAPITAL, num);
  }
  const setSimCapital = saveSimCapital;

  function getSimPositions() { const s = get(KEYS.SIM_POSITIONS); return s === null ? [...MOCK_DATA.sampleSimPositions] : s; }
  function saveSimPositions(p) { return set(KEYS.SIM_POSITIONS, p); }

  function getSimHistory() { const s = get(KEYS.SIM_HISTORY); return s === null ? [...MOCK_DATA.sampleTradeHistory] : s; }
  function saveSimHistory(h) { return set(KEYS.SIM_HISTORY, h); }

  function getRealPositions() { return get(KEYS.REAL_POSITIONS) || []; }
  function saveRealPositions(p) { return set(KEYS.REAL_POSITIONS, p); }

  function getWatchlist() {
    const base = MOCK_DATA.watchlist;
    try {
      const custom = JSON.parse(localStorage.getItem('mtp_custom_watchlist') || '[]');
      return [...base, ...custom];
    } catch(e) { return base; }
  }

  function getApiKeys() {
    return get(KEYS.API_KEYS) || {
      twelveData: [
        { key: '', label: 'Clé 1' }, { key: '', label: 'Clé 2' },
        { key: '', label: 'Clé 3' }, { key: '', label: 'Clé 4' },
      ],
      binance: { apiKey: '', secret: '', connected: false },
    };
  }
  function saveApiKeys(k) { return set(KEYS.API_KEYS, k); }

  // ── ALERTS
  function getAlerts() { return get(KEYS.ALERTS) || []; }
  function saveAlerts(a) { return set(KEYS.ALERTS, a); }

  function resetSimulation() {
    const s = getSettings();
    saveSimCapital(s.simInitialCapital || 10000);
    saveSimPositions([]);
    saveSimHistory([]);
    return true;
  }

  // ── API Call Counter
  function getTodayCallCount() {
    const today = new Date().toISOString().split('T')[0];
    const stored = get('mtp_api_calls');
    if (!stored || stored.date !== today) return 0;
    return stored.count || 0;
  }
  function incrementCallCount() {
    const today = new Date().toISOString().split('T')[0];
    const stored = get('mtp_api_calls');
    const count = (stored?.date === today ? (stored.count || 0) : 0) + 1;
    set('mtp_api_calls', { date: today, count });
    return count;
  }
  function getCallStats() {
    const today = new Date().toISOString().split('T')[0];
    const stored = get('mtp_api_calls');
    const count = stored?.date === today ? (stored.count || 0) : 0;
    const limit = 3200; // 4 keys × 800
    return { count, limit, remaining: limit - count, pct: Math.round((count / limit) * 100) };
  }

  function init() {
    if (!get(KEYS.SETTINGS)) saveSettings({ ...MOCK_DATA.defaultSettings });
    if (get(KEYS.SIM_CAPITAL) === null) saveSimCapital(MOCK_DATA.defaultSettings.simInitialCapital || 10000);
    if (!get(KEYS.SIM_POSITIONS)) saveSimPositions([]);
    if (!get(KEYS.SIM_HISTORY))   saveSimHistory([]);
    console.log('[Storage] V1 initialisé');
  }

  return {
    init,
    getSettings, saveSettings, setSettings,
    getSimCapital, saveSimCapital, setSimCapital,
    getSimPositions, saveSimPositions,
    getSimHistory, saveSimHistory,
    getRealPositions, saveRealPositions,
    getWatchlist,
    getApiKeys, saveApiKeys,
    getAlerts, saveAlerts,
    resetSimulation,
    KEYS,
  };
})();

// ═══ indicators.js ═══
const Indicators = (() => {
  function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let v = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) v = closes[i] * k + v * (1 - k);
    return v;
  }
  function emaSeries(closes, period) {
    if (closes.length < period) return [];
    const k = 2 / (period + 1);
    const r = new Array(period - 1).fill(null);
    let v = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    r.push(v);
    for (let i = period; i < closes.length; i++) { v = closes[i] * k + v * (1 - k); r.push(v); }
    return r;
  }
  function sma(closes, period) {
    if (closes.length < period) return null;
    return closes.slice(closes.length - period).reduce((a, b) => a + b, 0) / period;
  }
  function atr(candles, period = 14) {
    if (candles.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const { high: ph, low: pl, close: pc } = candles[i - 1];
      const { high: h, low: l } = candles[i];
      trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    let v = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) v = (v * (period - 1) + trs[i]) / period;
    return v;
  }
  function adx(candles, period = 14) {
    if (candles.length < period * 2) return { adx: null, plus_di: null, minus_di: null };
    const plusDMs = [], minusDMs = [], trs = [];
    for (let i = 1; i < candles.length; i++) {
      const p = candles[i - 1], c = candles[i];
      const up = c.high - p.high, dn = p.low - c.low;
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
      plusDMs.push(up > dn && up > 0 ? up : 0);
      minusDMs.push(dn > up && dn > 0 ? dn : 0);
    }
    function smooth(arr, p) {
      let s = arr.slice(0, p).reduce((a, b) => a + b, 0);
      const r = [s];
      for (let i = p; i < arr.length; i++) { s = s - s / p + arr[i]; r.push(s); }
      return r;
    }
    const smTR = smooth(trs, period), smDMp = smooth(plusDMs, period), smDMm = smooth(minusDMs, period);
    const DIp = smDMp.map((v, i) => smTR[i] === 0 ? 0 : (v / smTR[i]) * 100);
    const DIm = smDMm.map((v, i) => smTR[i] === 0 ? 0 : (v / smTR[i]) * 100);
    const DX = DIp.map((v, i) => { const s = v + DIm[i]; return s === 0 ? 0 : Math.abs(v - DIm[i]) / s * 100; });
    const adxS = smooth(DX.slice(period - 1), period);
    return {
      adx: Math.min(100, adxS[adxS.length - 1] / period * period / (period - 1)),
      plus_di: DIp[DIp.length - 1],
      minus_di: DIm[DIm.length - 1],
    };
  }
  function donchian(candles, period) {
    if (candles.length < period) return null;
    const slice = candles.slice(candles.length - period);
    const upper = slice.map(c => c.high).reduce(function(a,b){return a>b?a:b;});
    const lower = slice.map(c => c.low).reduce(function(a,b){return a<b?a:b;});
    return { upper, lower, mid: (upper + lower) / 2 };
  }
  function rsi(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    let ag = gains / period, al = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      ag = (ag * (period - 1) + Math.max(0, d)) / period;
      al = (al * (period - 1) + Math.max(0, -d)) / period;
    }
    if (al === 0) return 100;
    return 100 - 100 / (1 + ag / al);
  }
  function realizedVol(closes, period = 20) {
    if (closes.length < period + 1) return null;
    const slice = closes.slice(closes.length - period - 1);
    const returns = [];
    for (let i = 1; i < slice.length; i++) returns.push(Math.log(slice[i] / slice[i - 1]));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance * 252) * 100;
  }
  function emaSlope(closes, period) {
    const s = emaSeries(closes, period).filter(v => v !== null);
    if (s.length < 5) return 0;
    const r = s.slice(s.length - 5);
    return ((r[4] - r[0]) / (r[0] * 5)) * 100;
  }
  function momentum(closes, period) {
    if (closes.length < period + 1) return null;
    const old = closes[closes.length - 1 - period];
    return ((closes[closes.length - 1] - old) / old) * 100;
  }
  function isDonchianBreakoutUp(candles, period) {
    if (candles.length < period + 1) return false;
    const prev = candles.slice(candles.length - period - 1, candles.length - 1);
    return candles[candles.length - 1].close > prev.map(c => c.high).reduce(function(a,b){return a>b?a:b;});
  }
  function isDonchianBreakoutDown(candles, period) {
    if (candles.length < period + 1) return false;
    const prev = candles.slice(candles.length - period - 1, candles.length - 1);
    return candles[candles.length - 1].close < prev.map(c => c.low).reduce(function(a,b){return a<b?a:b;});
  }
  function relativeVolume(candles, period = 20) {
    if (candles.length < period) return 1;
    const avg = candles.slice(candles.length - period - 1, candles.length - 1).reduce((s, c) => s + c.volume, 0) / period;
    return avg === 0 ? 1 : candles[candles.length - 1].volume / avg;
  }
  function computeAll(candles) {
    if (!candles || candles.length < 10) return null;
    const closes = candles.map(c => c.close);
    const settings = Storage.getSettings();
    const ema50  = ema(closes, settings.emaFast);
    const ema100 = ema(closes, settings.emaSlow);
    const atrVal = atr(candles, settings.atrPeriod);
    const adxRes = adx(candles, settings.adxPeriod);
    const don55  = donchian(candles, settings.donchianSlow);
    const don20  = donchian(candles, settings.donchianFast);
    const rsiVal = rsi(closes, 14);
    const vol20  = realizedVol(closes, 20);
    const slope50  = emaSlope(closes, settings.emaFast);
    const slope100 = emaSlope(closes, settings.emaSlow);
    const mom3m  = momentum(closes, Math.min(60, closes.length - 1));
    const lastPrice = closes[closes.length - 1];
    const relVol = relativeVolume(candles, 20);
    const breakoutUp   = isDonchianBreakoutUp(candles, settings.donchianSlow);
    const breakoutDown = isDonchianBreakoutDown(candles, settings.donchianSlow);
    return {
      price: lastPrice, ema50, ema100,
      atr: atrVal, adx: adxRes.adx, plus_di: adxRes.plus_di, minus_di: adxRes.minus_di,
      don55, don20, rsi: rsiVal, vol20,
      slope50, slope100, mom3m, relVol,
      breakoutUp, breakoutDown,
      atrPct: atrVal ? (atrVal / lastPrice) * 100 : 0,
    };
  }

  // ── NIVEAU 1: MACD
  function macd(closes, fast=12, slow=26, signal=9) {
    if (closes.length < slow + signal) return null;
    const emaFast = emaSeries(closes, fast);
    const emaSlow = emaSeries(closes, slow);
    const macdLine = emaFast.map((v, i) => v !== null && emaSlow[i] !== null ? v - emaSlow[i] : null).filter(v => v !== null);
    if (macdLine.length < signal) return null;
    const signalLine = emaSeries(macdLine, signal);
    const last = macdLine[macdLine.length - 1];
    const sig = signalLine[signalLine.length - 1];
    const prev = macdLine[macdLine.length - 2];
    const prevSig = signalLine[signalLine.length - 2];
    return {
      macd: last, signal: sig,
      histogram: last - sig,
      bullishCross: prev < prevSig && last > sig,
      bearishCross: prev > prevSig && last < sig,
      aboveZero: last > 0,
    };
  }

  // ── NIVEAU 1: Bollinger Bands
  function bollingerBands(closes, period=20, stdDev=2) {
    if (closes.length < period) return null;
    const slice = closes.slice(closes.length - period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + stdDev * std;
    const lower = mean - stdDev * std;
    const last = closes[closes.length - 1];
    const bandwidth = (upper - lower) / mean * 100;
    return {
      upper, middle: mean, lower,
      bandwidth,
      compressed: bandwidth < 5,
      nearUpper: last > upper * 0.98,
      nearLower: last < lower * 1.02,
      position: (last - lower) / (upper - lower) * 100,
    };
  }

  // ── NIVEAU 1: Stochastic
  function stochastic(candles, kPeriod=14, dPeriod=3) {
    if (candles.length < kPeriod) return null;
    const slice = candles.slice(candles.length - kPeriod);
    const high = slice.map(c => c.high).reduce(function(a,b){return a>b?a:b;});
    const low  = slice.map(c => c.low).reduce(function(a,b){return a<b?a:b;});
    const last = candles[candles.length - 1].close;
    const k = high === low ? 50 : ((last - low) / (high - low)) * 100;
    const prev = candles[candles.length - 2]?.close || last;
    const prevHigh = candles.slice(candles.length - kPeriod - 1, candles.length - 1).map(c => c.high).reduce(function(a,b){return a>b?a:b;});
    const prevLow  = candles.slice(candles.length - kPeriod - 1, candles.length - 1).map(c => c.low).reduce(function(a,b){return a<b?a:b;});
    const prevK = prevHigh === prevLow ? 50 : ((prev - prevLow) / (prevHigh - prevLow)) * 100;
    return {
      k, d: (k + prevK) / 2,
      oversold: k < 20,
      overbought: k > 80,
      bullishCross: prevK < 20 && k > prevK,
      bearishCross: prevK > 80 && k < prevK,
    };
  }

  // ── NIVEAU 1: Support & Resistance
  function supportResistance(candles, lookback=20) {
    if (candles.length < lookback) return null;
    const slice = candles.slice(candles.length - lookback);
    const highs = slice.map(c => c.high);
    const lows  = slice.map(c => c.low);
    const resistance = highs.reduce(function(a,b){return a>b?a:b;});
    const support    = lows.reduce(function(a,b){return a<b?a:b;});
    const last = candles[candles.length - 1].close;
    const range = resistance - support;
    return {
      resistance, support,
      distToResistance: range > 0 ? ((resistance - last) / last) * 100 : 0,
      distToSupport: range > 0 ? ((last - support) / last) * 100 : 0,
      nearResistance: last > resistance * 0.98,
      nearSupport: last < support * 1.02,
      breakoutAbove: last > resistance,
      breakoutBelow: last < support,
    };
  }

  // ── NIVEAU 2: Ichimoku Cloud (simplifié)
  function ichimoku(candles) {
    if (candles.length < 52) return null;
    function midpoint(arr, n) {
      const s = arr.slice(arr.length - n);
      const h = s.map(c => c.high).reduce(function(a,b){return a>b?a:b;});
      const l = s.map(c => c.low).reduce(function(a,b){return a<b?a:b;});
      return (h + l) / 2;
    }
    const tenkan  = midpoint(candles, 9);
    const kijun   = midpoint(candles, 26);
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = midpoint(candles, 52);
    const last = candles[candles.length - 1].close;
    const aboveCloud = last > Math.max(senkouA, senkouB);
    const belowCloud = last < Math.min(senkouA, senkouB);
    return {
      tenkan, kijun, senkouA, senkouB,
      aboveCloud, belowCloud, inCloud: !aboveCloud && !belowCloud,
      bullish: tenkan > kijun && aboveCloud,
      bearish: tenkan < kijun && belowCloud,
    };
  }

  // ── NIVEAU 2: RSI Divergence
  function rsiDivergence(candles, period=14) {
    if (candles.length < period + 10) return null;
    const closes = candles.map(c => c.close);
    const rsiNow  = rsi(closes, period);
    const rsiPrev = rsi(closes.slice(0, closes.length - 5), period);
    if (!rsiNow || !rsiPrev) return null;
    const priceNow  = closes[closes.length - 1];
    const pricePrev = closes[closes.length - 6];
    return {
      bullishDiv: priceNow < pricePrev && rsiNow > rsiPrev,
      bearishDiv: priceNow > pricePrev && rsiNow < rsiPrev,
    };
  }

  // ── NIVEAU 2: Japanese Candlestick patterns
  function candlePatterns(candles) {
    if (candles.length < 3) return null;
    const [c2, c1, c0] = candles.slice(candles.length - 3);
    const body0 = Math.abs(c0.close - c0.open);
    const body1 = Math.abs(c1.close - c1.open);
    const range0 = c0.high - c0.low;
    const doji = body0 < range0 * 0.1;
    const hammer = c0.close > c0.open && (c0.open - c0.low) > body0 * 2 && (c0.high - c0.close) < body0 * 0.5;
    const shootingStar = c0.close < c0.open && (c0.high - c0.open) > body0 * 2;
    const bullEngulf = c1.close < c1.open && c0.close > c0.open && c0.open < c1.close && c0.close > c1.open;
    const bearEngulf = c1.close > c1.open && c0.close < c0.open && c0.open > c1.close && c0.close < c1.open;
    return { doji, hammer, shootingStar, bullEngulf, bearEngulf,
      bullish: hammer || bullEngulf,
      bearish: shootingStar || bearEngulf,
    };
  }

  // ── NIVEAU 3: Linear Regression
  function linearRegression(closes, period=20) {
    if (closes.length < period) return null;
    const slice = closes.slice(closes.length - period);
    const n = slice.length;
    const xMean = (n - 1) / 2;
    const yMean = slice.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    slice.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const predicted = intercept + slope * (n - 1);
    const r2 = den !== 0 ? (num / den) ** 2 / (slice.reduce((s, y) => s + (y - yMean) ** 2, 0) / n || 1) : 0;
    return { slope, predicted, r2: Math.min(1, Math.abs(r2)), trending: Math.abs(slope / yMean) > 0.001 };
  }

  // ── Updated computeAll with all levels
  function computeAll(candles) {
    if (!candles || candles.length < 10) return null;
    const closes = candles.map(c => c.close);
    const settings = Storage.getSettings();
    const ema50  = ema(closes, settings.emaFast);
    const ema100 = ema(closes, settings.emaSlow);
    const atrVal = atr(candles, settings.atrPeriod);
    const adxRes = adx(candles, settings.adxPeriod);
    const don55  = donchian(candles, settings.donchianSlow);
    const don20  = donchian(candles, settings.donchianFast);
    const rsiVal = rsi(closes, 14);
    const vol20  = realizedVol(closes, 20);
    const slope50  = emaSlope(closes, settings.emaFast);
    const slope100 = emaSlope(closes, settings.emaSlow);
    const mom3m  = momentum(closes, Math.min(60, closes.length - 1));
    const lastPrice = closes[closes.length - 1];
    const relVol = relativeVolume(candles, 20);
    const breakoutUp   = isDonchianBreakoutUp(candles, settings.donchianSlow);
    const breakoutDown = isDonchianBreakoutDown(candles, settings.donchianSlow);
    // Niveau 1
    const macdVal  = macd(closes);
    const bbVal    = bollingerBands(closes);
    const stochVal = stochastic(candles);
    const srVal    = supportResistance(candles);
    // Niveau 2
    const ichimokuVal = ichimoku(candles);
    const divVal      = rsiDivergence(candles);
    const candleVal   = candlePatterns(candles);
    // Niveau 3
    const regVal      = linearRegression(closes);
    return {
      price: lastPrice, ema50, ema100,
      atr: atrVal, adx: adxRes.adx, plus_di: adxRes.plus_di, minus_di: adxRes.minus_di,
      don55, don20, rsi: rsiVal, vol20,
      slope50, slope100, mom3m, relVol,
      breakoutUp, breakoutDown,
      atrPct: atrVal ? (atrVal / lastPrice) * 100 : 0,
      // Niveau 1
      macd: macdVal, bollinger: bbVal, stoch: stochVal, sr: srVal,
      // Niveau 2
      ichimoku: ichimokuVal, rsiDiv: divVal, candles: candleVal,
      // Niveau 3
      regression: regVal,
    };
  }

  return { ema, emaSeries, sma, atr, adx, donchian, rsi, realizedVol, emaSlope, momentum, relativeVolume, isDonchianBreakoutUp, isDonchianBreakoutDown, macd, bollingerBands, stochastic, supportResistance, ichimoku, rsiDivergence, candlePatterns, linearRegression, computeAll };
})();

// ═══ riskCalculator.js ═══
const RiskCalculator = (() => {
  function initialStop(entryPrice, atr, direction, multiplier = 2) {
    if (!atr || !entryPrice) return null;
    return direction === 'long' ? entryPrice - multiplier * atr : entryPrice + multiplier * atr;
  }

  // Optimal SL based on real support/resistance + ATR
  function optimalStop(entryPrice, atr, direction, indicators) {
    if (!atr || !entryPrice) return null;
    const minStop = direction === 'long'
      ? entryPrice - Math.max(1.5 * atr, entryPrice * 0.02)
      : entryPrice + Math.max(1.5 * atr, entryPrice * 0.02);

    // Use real support/resistance if available
    if (indicators?.sr) {
      if (direction === 'long' && indicators.sr.support > 0) {
        const srStop = indicators.sr.support * 0.995; // just below support
        return srStop < entryPrice && srStop > entryPrice * 0.85 ? srStop : minStop;
      }
      if (direction === 'short' && indicators.sr.resistance > 0) {
        const srStop = indicators.sr.resistance * 1.005; // just above resistance
        return srStop > entryPrice && srStop < entryPrice * 1.15 ? srStop : minStop;
      }
    }

    // Use Bollinger bands as secondary confirmation
    if (indicators?.bollinger) {
      if (direction === 'long') {
        const bbStop = indicators.bollinger.lower * 0.998;
        if (bbStop < entryPrice && bbStop > entryPrice * 0.85) return Math.max(bbStop, minStop);
      } else {
        const bbStop = indicators.bollinger.upper * 1.002;
        if (bbStop > entryPrice && bbStop < entryPrice * 1.15) return Math.min(bbStop, minStop);
      }
    }
    return minStop;
  }

  // Dynamic R/R based on score
  function dynamicRR(score) {
    if (score >= 75) return 3.0;
    if (score >= 65) return 2.5;
    if (score >= 55) return 2.0;
    return 1.5;
  }

  // Optimal position size based on volatility
  function optimalPositionSize(capital, riskPct, entryPrice, stopPrice, atrPct) {
    if (!entryPrice || !stopPrice || !capital) return null;
    // Reduce size for high volatility assets
    let adjustedRisk = riskPct;
    if (atrPct > 4) adjustedRisk *= 0.5;      // Very volatile: half size
    else if (atrPct > 2.5) adjustedRisk *= 0.75; // Volatile: 75% size

    // Cap at 5% of capital per position
    const maxInvested = capital * 0.05;
    const riskAmount = capital * adjustedRisk;
    const riskPerUnit = Math.abs(entryPrice - stopPrice);
    if (riskPerUnit <= 0) return null;
    const units = riskAmount / riskPerUnit;
    const invested = Math.min(units * entryPrice, maxInvested);
    const finalUnits = invested / entryPrice;
    return { units: Math.floor(finalUnits * 10000) / 10000, invested, riskAmount, riskPerUnit, adjustedRisk };
  }

  // Check if timing is optimal for entry
  function isOptimalTiming(symbol, assetClass) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();
    const reasons = [];
    let score = 100;

    // Never on weekends for non-crypto
    if (assetClass !== 'crypto' && (day === 0 || day === 6)) {
      return { optimal: false, score: 0, reasons: ['Marché fermé le weekend'] };
    }

    // Avoid Friday afternoon for stocks
    if (assetClass === 'stock' && day === 5 && hour >= 16) {
      score -= 30; reasons.push('⚠️ Vendredi après-midi — liquidité réduite');
    }

    // Avoid first 30min of US market open (15h30 Paris)
    if (assetClass === 'stock' && hour === 15 && minute < 30) {
      score -= 25; reasons.push('⚠️ Ouverture US — spreads larges (attendre 16h00)');
    }

    // Avoid last 15min before close
    if (assetClass === 'stock' && hour === 21 && minute >= 45) {
      score -= 25; reasons.push('⚠️ Proche fermeture US — éviter');
    }

    // Best hours for stocks: 10h-12h and 15h-17h Paris time
    if (assetClass === 'stock') {
      if ((hour >= 10 && hour <= 12) || (hour >= 15 && hour <= 17)) {
        reasons.push('✅ Heure optimale — liquidité maximale');
      }
    }

    // Crypto: avoid 00h-06h (low volume)
    if (assetClass === 'crypto' && (hour < 6 || hour > 22)) {
      score -= 15; reasons.push('⚠️ Faible volume nocturne');
    }

    return { optimal: score >= 70, score, reasons };
  }
  function trailingStop(currentPrice, atr, direction, multiplier = 3) {
    if (!atr || !currentPrice) return null;
    return direction === 'long' ? currentPrice - multiplier * atr : currentPrice + multiplier * atr;
  }
  function positionSize(capital, riskPct, entryPrice, stopPrice) {
    if (!entryPrice || !stopPrice || !capital) return null;
    const riskAmount = capital * riskPct;
    const riskPerUnit = Math.abs(entryPrice - stopPrice);
    if (riskPerUnit <= 0) return null;
    const units = riskAmount / riskPerUnit;
    return { units: Math.floor(units * 10000) / 10000, invested: units * entryPrice, riskAmount, riskPerUnit };
  }
  function takeProfitEstimate(entryPrice, stopPrice, direction, rrRatio = 2) {
    const d = Math.abs(entryPrice - stopPrice);
    return direction === 'long' ? entryPrice + d * rrRatio : entryPrice - d * rrRatio;
  }
  function riskRewardRatio(entryPrice, stopPrice, targetPrice) {
    const risk = Math.abs(entryPrice - stopPrice);
    if (risk === 0) return 0;
    return Math.round((Math.abs(targetPrice - entryPrice) / risk) * 10) / 10;
  }
  function riskLevel(atrPct, vol20, adxValue) {
    let score = 0;
    if (atrPct >= 3) score += 2; else if (atrPct >= 1.5) score += 1;
    if (vol20 === null) score += 1; else if (vol20 >= 40) score += 2; else if (vol20 >= 20) score += 1;
    if (adxValue === null) score += 1; else if (adxValue <= 20) score += 2; else if (adxValue <= 25) score += 1;
    if (score <= 1) return 'low';
    if (score <= 3) return 'medium';
    return 'high';
  }
  function riskPenalty(level) {
    if (level === 'low') return 0;
    if (level === 'medium') return 0.10;
    return 0.25;
  }
  function openPnL(entryPrice, currentPrice, quantity, direction) {
    return direction === 'long' ? (currentPrice - entryPrice) * quantity : (entryPrice - currentPrice) * quantity;
  }
  function openPnLPct(entryPrice, currentPrice, direction) {
    return direction === 'long'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;
  }
  return { initialStop, trailingStop, positionSize, takeProfitEstimate, riskRewardRatio, riskLevel, riskPenalty, openPnL, openPnLPct, optimalStop, dynamicRR, optimalPositionSize, isOptimalTiming };
})();

// ═══ BinanceClient ═══
const BinanceClient = (() => {
  const BASE = 'https://aged-bar-257a.emmanueldelasse.workers.dev/binance';
  const BINANCE_PAIRS = {
    'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT', 'BNB': 'BNBUSDT',
    'XRP': 'XRPUSDT', 'ADA': 'ADAUSDT', 'AVAX': 'AVAXUSDT', 'DOT': 'DOTUSDT',
    'LINK': 'LINKUSDT', 'DOGE': 'DOGEUSDT', 'MATIC': 'MATICUSDT', 'UNI': 'UNIUSDT',
    'ATOM': 'ATOMUSDT', 'LTC': 'LTCUSDT', 'NEAR': 'NEARUSDT',
  };
  const BINANCE_USDT = {};
  let _apiKey = '', _secretKey = '', _eurUsdRate = 1.08;

  function init(apiKey = '', secretKey = '') {
    _apiKey = apiKey; _secretKey = secretKey;
    _fetchEurUsdRate().catch(() => {});
  }
  async function _fetchEurUsdRate() {
    try {
      const r = await fetch(`${BASE}/api/v3/ticker/price?symbol=EURUSDT`, { mode: 'cors' });
      if (r.ok) { const d = await r.json(); _eurUsdRate = parseFloat(d.price); }
    } catch(e) {}
  }
  async function _sign(qs) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(_secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(qs));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function _privateRequest(method, path, params = {}) {
    if (!_apiKey || !_secretKey) return { error: 'Clé API Binance non configurée' };
    const qs = new URLSearchParams({ ...params, timestamp: Date.now() }).toString();
    const sig = await _sign(qs);
    try {
      const r = await fetch(`${BASE}${path}?${qs}&signature=${sig}`, { method, headers: { 'X-MBX-APIKEY': _apiKey } });
      return await r.json();
    } catch(e) { return { error: e.message }; }
  }
  async function getPrice(symbol) {
    const pair = BINANCE_PAIRS[symbol];
    if (!pair) return null;
    try {
      const r = await fetch(`${BASE}/api/v3/ticker/24hr?symbol=${pair}`, { signal: AbortSignal.timeout(6000), mode: 'cors' });
      if (!r.ok) return null;
      const d = await r.json();
      const priceUsdt = parseFloat(d.lastPrice);
      const priceEur = priceUsdt / (_eurUsdRate || 1.08);
      return { price: priceEur, change24h: parseFloat(d.priceChangePercent), volume24h: parseFloat(d.quoteVolume), source: 'Binance' };
    } catch(e) { return null; }
  }
  async function getOHLC(symbol) {
    const pair = BINANCE_PAIRS[symbol] || BINANCE_USDT[symbol];
    if (!pair) return null;
    try {
      const r = await fetch(`${BASE}/api/v3/klines?symbol=${pair}&interval=1d&limit=130`, { signal: AbortSignal.timeout(8000), mode: 'cors' });
      if (!r.ok) return null;
      const raw = await r.json();
      if (!Array.isArray(raw) || raw.length < 20) return null;
      const rate = window.__eurUsdRate > 0 ? window.__eurUsdRate : (_eurUsdRate || 1.08);
      return raw.map(k => ({
        ts: k[0],
        open:   parseFloat(k[1]) / rate,
        high:   parseFloat(k[2]) / rate,
        low:    parseFloat(k[3]) / rate,
        close:  parseFloat(k[4]) / rate,
        volume: parseFloat(k[5]),
      }));
    } catch(e) { return null; }
  }
  async function testConnection() {
    if (!_apiKey) return { connected: false, error: 'Pas de clé API' };
    const d = await _privateRequest('GET', '/api/v3/account');
    if (d.error || d.code) return { connected: false, error: d.error || d.msg };
    return { connected: true, balances: d.balances?.length || 0 };
  }
  function isConfigured() { return _apiKey.length > 0 && _secretKey.length > 0; }
  function _setEurUsdRate(rate) { if (rate > 0) _eurUsdRate = rate; }
  return { init, getPrice, getOHLC, testConnection, isConfigured, _setEurUsdRate };
})();

// ═══ RealDataClient ═══
const RealDataClient = (() => {
  const _cache = new Map();
  const PRICE_TTL = 4 * 60 * 1000, OHLC_TTL = 60 * 60 * 1000;
  function _cacheGet(key) {
    const e = _cache.get(key);
    if (!e) return null;
    const ttl = key.startsWith('ohlc_') || key.startsWith('cg_ohlc_') || key.startsWith('yf_ohlc_') ? OHLC_TTL : PRICE_TTL;
    if (Date.now() - e.ts > ttl) { _cache.delete(key); return null; }
    return e.data;
  }
  function _cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }

  const COINGECKO_IDS = {
    'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','BNB':'binancecoin',
    'XRP':'ripple','ADA':'cardano','AVAX':'avalanche-2','DOT':'polkadot',
    'LINK':'chainlink','DOGE':'dogecoin','MATIC':'matic-network',
    'UNI':'uniswap','ATOM':'cosmos','LTC':'litecoin','NEAR':'near',
  };
  const YAHOO_TICKERS = {
    'AAPL':'AAPL','MSFT':'MSFT','NVDA':'NVDA','TSLA':'TSLA','AMZN':'AMZN',
    'GOOGL':'GOOGL','META':'META','NFLX':'NFLX','AMD':'AMD','JPM':'JPM',
    'V':'V','MA':'MA','DIS':'DIS','COIN':'COIN','PYPL':'PYPL',
    'MC':'MC.PA','ASML':'ASML','SAP':'SAP','TTE':'TTE.PA','BNP':'BNP.PA',
    'AIR':'AIR.PA','RMS':'RMS.PA','OR':'OR.PA','SAN':'SAN.PA','STLA':'STLA',
    'GOLD':'GC=F','SILVER':'SI=F','OIL':'CL=F',
    'EURUSD':'EURUSD=X','GBPUSD':'GBPUSD=X','USDJPY':'USDJPY=X',
    'USDCHF':'USDCHF=X','AUDUSD':'AUDUSD=X',
    'SPY':'SPY','QQQ':'QQQ','GLD':'GLD','TLT':'TLT',
  };
  const CORS_PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?url='];
  const YAHOO_PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev/yahoo';

  async function _fetchWithProxy(url) {
    // TOUJOURS passer par le proxy Cloudflare pour Yahoo Finance
    if (url.includes('finance.yahoo.com')) {
      try {
        const yahooPath = url.replace('https://query1.finance.yahoo.com', '');
        const proxyUrl = 'https://aged-bar-257a.emmanueldelasse.workers.dev/yahoo' + yahooPath;
        const r = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (r.ok) return r;
      } catch(e) { console.warn('[Yahoo] Proxy error:', e.message); }
      return null; // Ne pas essayer en direct — bloqué par CORS
    }
    // Autres URLs
    try { const r = await fetch(url, { signal: AbortSignal.timeout(6000) }); if (r.ok) return r; } catch(e) {}
    return null;
  }

  async function _getCoinGeckoPrice(symbol) {
    const id = COINGECKO_IDS[symbol]; if (!id) return null;
    const ck = 'cg_price_' + symbol; const cached = _cacheGet(ck); if (cached) return cached;
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null;
      const d = await r.json(); if (!d[id]) return null;
      const res = { price: d[id].eur, change24h: d[id].eur_24h_change || 0, volume24h: 0, source: 'CoinGecko' };
      _cacheSet(ck, res); return res;
    } catch(e) { return null; }
  }

  async function _getYahooPrice(symbol) {
    const ticker = YAHOO_TICKERS[symbol]; if (!ticker) return null;
    const ck = 'yf_price_' + symbol; const cached = _cacheGet(ck); if (cached) return cached;
    try {
      const r = await _fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`);
      if (!r) return null;
      const d = await r.json(); const meta = d?.chart?.result?.[0]?.meta; if (!meta) return null;
      const price = meta.regularMarketPrice, prev = meta.previousClose || meta.chartPreviousClose;
      let priceEur = price;
      const eurRate = (window.__eurUsdRate > 0.5 && window.__eurUsdRate < 3.0) ? window.__eurUsdRate : 1.08;
      if (!ticker.includes('=X') && ticker !== 'GC=F') priceEur = price / eurRate;
      const res = { price: priceEur, change24h: prev ? ((price - prev) / prev) * 100 : 0, volume24h: meta.regularMarketVolume || 0, source: 'Yahoo Finance' };
      _cacheSet(ck, res); return res;
    } catch(e) { return null; }
  }

  async function _getYahooOHLC(symbol) {
    const ticker = YAHOO_TICKERS[symbol]; if (!ticker) return null;
    const ck = 'yf_ohlc_' + symbol; const cached = _cacheGet(ck); if (cached) return cached;
    try {
      const r = await _fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`);
      if (!r) return null;
      const d = await r.json(); const result = d?.chart?.result?.[0]; if (!result) return null;
      const ts = result.timestamp || [], q = result.indicators?.quote?.[0] || {};
      if (ts.length < 20) return null;
      const candles = ts.map((t, i) => ({
        ts: t * 1000, open: q.open?.[i] || 0, high: q.high?.[i] || 0,
        low: q.low?.[i] || 0, close: q.close?.[i] || 0, volume: q.volume?.[i] || 1000000,
      })).filter(c => c.close > 0);
      const eurRateOHLC = (window.__eurUsdRate > 0.5 && window.__eurUsdRate < 3.0) ? window.__eurUsdRate : 1.08;
      if (!ticker.includes('=X') && ticker !== 'GC=F') candles.forEach(c => { c.open /= eurRateOHLC; c.high /= eurRateOHLC; c.low /= eurRateOHLC; c.close /= eurRateOHLC; });
      _cacheSet(ck, candles); return candles;
    } catch(e) { return null; }
  }

  async function getPrice(symbol) {
    const ck = 'price_' + symbol; const cached = _cacheGet(ck); if (cached) return cached;
    let res = null;
    if (COINGECKO_IDS[symbol] && BinanceClient) { res = await BinanceClient.getPrice(symbol); if (res?.price) { _cacheSet(ck, res); return res; } }
    if (TwelveDataClient?.getPrice) { res = await TwelveDataClient.getPrice(symbol); if (res?.price) { _cacheSet(ck, res); return res; } }
    if (COINGECKO_IDS[symbol]) { res = await _getCoinGeckoPrice(symbol); if (res) { _cacheSet(ck, res); return res; } }
    if (YAHOO_TICKERS[symbol]) { res = await _getYahooPrice(symbol); if (res) { _cacheSet(ck, res); return res; } }
    return null;
  }

  async function getOHLC(symbol) {
    const ck = 'ohlc_' + symbol; const cached = _cacheGet(ck); if (cached) return cached;
    let candles = null;
    if (COINGECKO_IDS[symbol]) { candles = await BinanceClient.getOHLC(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); if (!window.__ohlcCache) window.__ohlcCache = {}; window.__ohlcCache[symbol] = candles; return candles; } }
    if (TwelveDataClient?.getTimeSeries) { candles = await TwelveDataClient.getTimeSeries(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); if (!window.__ohlcCache) window.__ohlcCache = {}; window.__ohlcCache[symbol] = candles; return candles; } }
    if (YAHOO_TICKERS[symbol]) { candles = await _getYahooOHLC(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); if (!window.__ohlcCache) window.__ohlcCache = {}; window.__ohlcCache[symbol] = candles; return candles; } }
    return null;
  }

  async function refreshAllPrices(watchlist) {
    const openSymbols = new Set([
      ...Storage.getSimPositions().map(p => p.symbol),
      ...Storage.getRealPositions().map(p => p.symbol),
    ]);
    const sorted = [
      ...watchlist.filter(a => openSymbols.has(a.symbol)),
      ...watchlist.filter(a => !openSymbols.has(a.symbol)),
    ];
    for (const asset of sorted) {
      const data = await getPrice(asset.symbol);
      if (data?.price) window.__prices[asset.symbol] = data.price;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return { getPrice, getOHLC, refreshAllPrices };
})();

// ═══ analysisEngine.js ═══
const AnalysisEngine = (() => {
  function checkRegime(ind) {
    const reasons = []; let pass = true;
    if (ind.adx === null) { reasons.push({ label: 'ADX non calculable', pass: true }); }
    else if (ind.adx < 15) { reasons.push({ label: `ADX = ${ind.adx.toFixed(1)} (tendance trop faible)`, pass: false }); pass = false; }
    else { reasons.push({ label: `ADX = ${ind.adx.toFixed(1)} (tendance présente)`, pass: true }); }
    if (ind.vol20 === null) { reasons.push({ label: 'Volatilité non calculable', pass: true }); }
    else if (ind.vol20 < 1) { reasons.push({ label: `Vol. trop basse (${ind.vol20.toFixed(1)}%)`, pass: false }); pass = false; }
    else if (ind.vol20 > 120) { reasons.push({ label: `Vol. trop haute (${ind.vol20.toFixed(1)}%)`, pass: false }); pass = false; }
    else { reasons.push({ label: `Vol. réalisée = ${ind.vol20.toFixed(1)}% (normale)`, pass: true }); }
    return { pass, reasons };
  }

  function detectSignal(ind) {
    if (!ind.ema50 || !ind.ema100 || !ind.don55) return 'neutral';
    const longS  = [ind.price > ind.ema100, ind.ema50 > ind.ema100, ind.breakoutUp].filter(Boolean).length;
    const shortS = [ind.price < ind.ema100, ind.ema50 < ind.ema100, ind.breakoutDown].filter(Boolean).length;
    if (longS >= 2) return 'long';
    if (shortS >= 2) return 'short';
    if (longS === 1 && shortS === 0) return 'long';
    if (shortS === 1 && longS === 0) return 'short';
    return 'neutral';
  }

  function computeConfidenceScore(ind, direction) {
    const criteria = []; let total = 0, max = 0;
    function add(label, pts, maxPts, cond, desc = '') {
      const earned = cond ? pts : 0; max += maxPts; total += earned;
      criteria.push({ label, description: desc, earned, max: maxPts, pass: cond, partial: earned > 0 && earned < maxPts });
    }

    // ── Critères originaux (50 pts)
    const adxOk = ind.adx !== null && ind.adx > 20, adxStr = ind.adx !== null && ind.adx > 25;
    add('Tendance ADX', adxStr ? 8 : (adxOk ? 5 : 0), 8, adxOk, `ADX : ${ind.adx?.toFixed(1) || 'N/A'}`);
    const slopeOk = direction === 'long' ? ind.slope100 > 0 : ind.slope100 < 0;
    add('Direction EMA 100', slopeOk ? 6 : 0, 6, slopeOk, `Pente : ${ind.slope100?.toFixed(3) || 'N/A'}%/j`);
    const mom3ok = direction === 'long' ? ind.mom3m > 2 : ind.mom3m < -2;
    add('Momentum 3 mois', mom3ok ? 6 : 0, 6, mom3ok, `Perf : ${ind.mom3m?.toFixed(1) || 'N/A'}%`);
    const volOk = ind.relVol > 1.0;
    add('Volume > moyenne', volOk ? 5 : 0, 5, volOk, `Vol : ${ind.relVol?.toFixed(2) || 'N/A'}x`);
    const rsiOk = direction === 'long' ? ind.rsi !== null && ind.rsi < 75 : ind.rsi !== null && ind.rsi > 25;
    add('RSI non extrême', rsiOk ? 5 : 0, 5, rsiOk, `RSI : ${ind.rsi?.toFixed(1) || 'N/A'}`);
    const bo = direction === 'long' ? ind.breakoutUp : ind.breakoutDown;
    add('Cassure Donchian', bo ? 5 : 0, 5, bo, 'Nouveau plus haut/bas 55j');
    const volN = ind.vol20 !== null && ind.vol20 > 5 && ind.vol20 < 60;
    add('Volatilité normale', volN ? 5 : 0, 5, volN, `Vol annualisée : ${ind.vol20?.toFixed(1) || 'N/A'}%`);
    const dist = ind.don55 ? (direction === 'long' ? ((ind.don55.upper - ind.price) / ind.price) * 100 : ((ind.price - ind.don55.lower) / ind.price) * 100) : 0;
    add('Espace Donchian', dist > 1.5 ? 5 : 0, 5, dist > 1.5, `Distance : ${dist.toFixed(1)}%`);
    add('EMA 50 > EMA 100', direction === 'long' ? ind.ema50 > ind.ema100 : ind.ema50 < ind.ema100 ? 5 : 0, 5, direction === 'long' ? ind.ema50 > ind.ema100 : ind.ema50 < ind.ema100, 'Alignement EMA');

    // ── Niveau 1: MACD (15 pts)
    if (ind.macd) {
      const macdOk = direction === 'long' ? ind.macd.aboveZero : !ind.macd.aboveZero;
      add('MACD direction', macdOk ? 5 : 0, 5, macdOk, `MACD : ${ind.macd.macd?.toFixed(4) || 'N/A'}`);
      const crossOk = direction === 'long' ? ind.macd.bullishCross : ind.macd.bearishCross;
      add('MACD croisement', crossOk ? 5 : 0, 5, crossOk, 'Signal de croisement');
      add('MACD histogramme', direction === 'long' ? ind.macd.histogram > 0 : ind.macd.histogram < 0 ? 5 : 0, 5, direction === 'long' ? ind.macd.histogram > 0 : ind.macd.histogram < 0, `Histo : ${ind.macd.histogram?.toFixed(4) || 'N/A'}`);
    }

    // ── Niveau 1: Bollinger (10 pts)
    if (ind.bollinger) {
      add('Bollinger compression', ind.bollinger.compressed ? 5 : 0, 5, ind.bollinger.compressed, `Bandes compressées (${ind.bollinger.bandwidth?.toFixed(1)}%)`);
      const bbOk = direction === 'long' ? ind.bollinger.nearLower : ind.bollinger.nearUpper;
      add('Position Bollinger', bbOk ? 5 : 0, 5, bbOk, `Position : ${ind.bollinger.position?.toFixed(0)}%`);
    }

    // ── Niveau 1: Stochastique (8 pts)
    if (ind.stoch) {
      const stochOk = direction === 'long' ? ind.stoch.oversold || ind.stoch.bullishCross : ind.stoch.overbought || ind.stoch.bearishCross;
      add('Stochastique signal', stochOk ? 8 : 0, 8, stochOk, `K : ${ind.stoch.k?.toFixed(1) || 'N/A'}`);
    }

    // ── Niveau 1: Support/Résistance (7 pts)
    if (ind.sr) {
      const srOk = direction === 'long' ? !ind.sr.nearResistance && ind.sr.distToSupport < 5 : !ind.sr.nearSupport && ind.sr.distToResistance < 5;
      add('Support/Résistance', srOk ? 7 : 0, 7, srOk, `S: ${ind.sr.support?.toFixed(2)} R: ${ind.sr.resistance?.toFixed(2)}`);
    }

    // ── Niveau 2: Ichimoku (10 pts)
    if (ind.ichimoku) {
      const ichOk = direction === 'long' ? ind.ichimoku.bullish : ind.ichimoku.bearish;
      add('Ichimoku Cloud', ichOk ? 10 : 0, 10, ichOk, ichOk ? 'Au-dessus du nuage' : 'En dessous du nuage');
    }

    // ── Niveau 2: Divergence RSI (8 pts)
    if (ind.rsiDiv) {
      const divOk = direction === 'long' ? ind.rsiDiv.bullishDiv : ind.rsiDiv.bearishDiv;
      add('Divergence RSI', divOk ? 8 : 0, 8, divOk, divOk ? 'Divergence haussière' : 'Pas de divergence');
    }

    // ── Niveau 2: Chandeliers (7 pts)
    if (ind.candles) {
      const candleOk = direction === 'long' ? ind.candles.bullish : ind.candles.bearish;
      add('Pattern chandelier', candleOk ? 7 : 0, 7, candleOk, candleOk ? 'Pattern de retournement' : 'Pas de pattern');
    }

    // ── Niveau 3: Régression linéaire (10 pts)
    if (ind.regression) {
      const regOk = direction === 'long' ? ind.regression.slope > 0 : ind.regression.slope < 0;
      add('Régression linéaire', regOk && ind.regression.r2 > 0.5 ? 10 : regOk ? 5 : 0, 10, regOk, `R² : ${ind.regression.r2?.toFixed(2) || 'N/A'}`);
    }

    // Apply algo learning bonus
    const algoBonus = AlgoLearning ? AlgoLearning.getAdjustedScore(ind.symbol || '', direction, 0) : 0;
    const baseScore = max > 0 ? Math.round((total / max) * 100) : 0;
    const finalScore = Math.min(100, Math.max(0, baseScore + algoBonus));

    return { score: finalScore, criteria, rawScore: total, maxScore: max };
  }

  function adjustedScore(s, riskLvl) { return Math.round(s * (1 - RiskCalculator.riskPenalty(riskLvl))); }
  function signalStrength(s) { return s >= 70 ? 'strong' : s >= 50 ? 'medium' : 'weak'; }
  function isSolidTrade(regime, adjScore, riskLvl, rrRatio) {
    return regime.pass && adjScore >= 70 && (riskLvl === 'low' || riskLvl === 'medium') && rrRatio >= 2;
  }
  function getRecommendation(direction, adjScore, riskLvl, regimePass) {
    if (!regimePass) return 'Régime défavorable — ne pas trader cet actif actuellement.';
    if (direction === 'neutral') return 'Pas de signal clair — attendre une cassure confirmée.';
    if (adjScore >= 70) return `Signal ${direction === 'long' ? 'hausse' : 'baisse'} solide. Score élevé, risque ${riskLvl === 'low' ? 'faible' : 'modéré'}. Entrée possible.`;
    if (adjScore >= 50) return 'Signal présent mais modéré. Attendre une confirmation supplémentaire.';
    return 'Signal trop faible. Passer son tour.';
  }

  async function analyzeAsset(asset) {
    const { symbol, name, assetClass } = asset;
    let candles = null, priceData = null;
    try { [candles, priceData] = await Promise.all([RealDataClient.getOHLC(symbol), RealDataClient.getPrice(symbol)]); }
    catch(e) { console.warn('[Analysis] Erreur fetch', symbol); }

    if (!candles || candles.length < 20 || !priceData) {
      return { symbol, name, assetClass, price: 0, change24h: 0, error: 'Données indisponibles — configurez vos clés API', direction: 'neutral', score: 0, adjScore: 0, strength: 'weak', riskLevel: 'high', isSolid: false, regime: { pass: false, reasons: [{ label: 'API non configurée ou indisponible', pass: false }] } };
    }

    const ind = Indicators.computeAll(candles);
    if (!ind) return { symbol, name, error: 'Erreur calcul', score: 0, adjScore: 0 };
    const settings = Storage.getSettings();
    const regime = checkRegime(ind);
    const direction = detectSignal(ind);
    const confidence = computeConfidenceScore(ind, direction);
    const riskLvl = RiskCalculator.riskLevel(ind.atrPct, ind.vol20, ind.adx);
    const adjScoreVal = adjustedScore(confidence.score, riskLvl);
    const stopLoss = RiskCalculator.initialStop(priceData.price, ind.atr, direction, settings.stopAtrMultiplier);
    const takeProfit = RiskCalculator.takeProfitEstimate(priceData.price, stopLoss, direction, 2.5);
    const rrRatio = RiskCalculator.riskRewardRatio(priceData.price, stopLoss, takeProfit);
    const realCapital = Storage.getSimCapital();
    const sizing = RiskCalculator.positionSize(realCapital, settings.riskPerTrade, priceData.price, stopLoss);
    return {
      symbol, name, assetClass,
      price: priceData.price, change24h: priceData.change24h, volume24h: priceData.volume24h,
      direction, regime, indicators: ind, confidence,
      score: confidence.score, adjScore: adjScoreVal,
      strength: signalStrength(adjScoreVal), riskLevel: riskLvl,
      isSolid: isSolidTrade(regime, adjScoreVal, riskLvl, rrRatio),
      stopLoss, takeProfit, rrRatio, sizing,
      recommendation: getRecommendation(direction, adjScoreVal, riskLvl, regime.pass),
      candles: candles.slice(-20),
    };
  }

  async function analyzeAll() {
    const watchlist = Storage.getWatchlist();
    const results = await Promise.all(watchlist.map(async asset => {
      try { return await analyzeAsset({ symbol: asset.symbol, name: asset.name, assetClass: asset.class }); }
      catch(e) { return { symbol: asset.symbol, name: asset.name, error: e.message, adjScore: 0 }; }
    }));
    const minScore = Storage.getSettings().minScore;
    return {
      tradeable: results.filter(r => !r.error && r.adjScore >= minScore).sort((a, b) => b.adjScore - a.adjScore),
      neutral:   results.filter(r => !r.error && r.adjScore < minScore && r.adjScore > 0).sort((a, b) => b.adjScore - a.adjScore),
      inactive:  results.filter(r => r.error || r.adjScore === 0),
      all:       results,
    };
  }

  function analyzeAllSync() {
    const watchlist = Storage.getWatchlist();
    // analyzeAllSync uses only cached real prices - no mock fallback
    const results = watchlist.map(asset => {
      try {
        const price = window.__prices[asset.symbol];
        if (!price) return { symbol: asset.symbol, name: asset.name, assetClass: asset.class, adjScore: 0, price: 0, error: 'En attente des données réelles...' };
        // Use cached OHLC if available
        const cachedOHLC = window.__ohlcCache?.[asset.symbol];
        if (!cachedOHLC || cachedOHLC.length < 20) return { symbol: asset.symbol, name: asset.name, assetClass: asset.class, adjScore: 0, price, error: 'Bougies en cours de chargement...' };
        const ind = Indicators.computeAll(cachedOHLC);
        if (!ind) return { symbol: asset.symbol, adjScore: 0, error: 'Calcul impossible' };
        const regime = checkRegime(ind), direction = detectSignal(ind);
        const conf = computeConfidenceScore(ind, direction);
        const riskLvl = RiskCalculator.riskLevel(ind.atrPct, ind.vol20, ind.adx);
        const adjScoreVal = adjustedScore(conf.score, riskLvl);
        const realCapital = Storage.getSimCapital();
        const stopLoss = RiskCalculator.initialStop(price, ind.atr, direction, Storage.getSettings().stopAtrMultiplier);
        const takeProfit = RiskCalculator.takeProfitEstimate(price, stopLoss, direction, 2.5);
        const rrRatio = RiskCalculator.riskRewardRatio(price, stopLoss, takeProfit);
        return {
          symbol: asset.symbol, name: asset.name, assetClass: asset.class,
          price, change24h: 0,
          direction, regime, indicators: ind,
          score: conf.score, adjScore: adjScoreVal,
          strength: signalStrength(adjScoreVal), riskLevel: riskLvl,
          isSolid: isSolidTrade(regime, adjScoreVal, riskLvl, rrRatio),
          confidence: conf, stopLoss, takeProfit, rrRatio,
          recommendation: getRecommendation(direction, adjScoreVal, riskLvl, regime.pass),
        };
      } catch(e) { return { symbol: asset.symbol, adjScore: 0, error: e.message }; }
    });
    const sorted = results.filter(r => !r.error).sort((a, b) => b.adjScore - a.adjScore);
    const minScore = Storage.getSettings().minScore;
    return {
      all: sorted,
      tradeable: sorted.filter(r => r.adjScore >= minScore),
      neutral:   sorted.filter(r => r.adjScore > 0 && r.adjScore < minScore),
      inactive:  results.filter(r => r.error || r.adjScore === 0),
    };
  }

  return { analyzeAsset, analyzeAll, analyzeAllSync, computeConfidenceScore, detectSignal, checkRegime, signalStrength, isSolidTrade };
})();

// ═══ twelveData.js ═══
const TwelveDataClient = (() => {
  const BASE_URL = 'https://api.twelvedata.com';
  const CACHE = new Map();
  let keyStates = [];

  function init(keysInput) {
    // Accept array of strings OR object with .twelveData array
    let keyList = [];
    if (Array.isArray(keysInput)) {
      keyList = keysInput.map((k, i) => ({ key: typeof k === 'string' ? k : (k.key || ''), label: 'Clé ' + (i + 1) }));
    } else if (keysInput && Array.isArray(keysInput.twelveData)) {
      keyList = keysInput.twelveData.map((k, i) => ({ key: k.key || k || '', label: k.label || 'Clé ' + (i + 1) }));
    }
    keyStates = keyList.map(k => ({
      key: k.key || '', label: k.label,
      callsMin: 0, callsDay: 0, lastReset: Date.now(), lastCall: 0,
      status: k.key ? 'active' : 'unconfigured',
    }));
    if (keyStates.length === 0) keyStates = [1,2,3,4].map(i => ({ key: '', label: 'Clé ' + i, callsMin: 0, callsDay: 0, status: 'unconfigured', lastReset: Date.now(), lastCall: 0 }));
    console.log('[TwelveData] Init —', keyStates.filter(k => k.key).length, 'clé(s)');
  }

  function selectBestKey() {
    const active = keyStates.filter(k => k.status === 'active' && k.key);
    if (!active.length) return null;
    return active.reduce((best, k) => {
      if (Date.now() - k.lastReset > 60000) { k.callsMin = 0; k.lastReset = Date.now(); }
      return k.callsMin < best.callsMin ? k : best;
    });
  }

  async function call(endpoint, params, ttlMs = 60000) {
    const ck = endpoint + '|' + JSON.stringify(params);
    const cached = CACHE.get(ck);
    if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
    const keyState = selectBestKey();
    if (!keyState) return null;
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams({ ...params, apikey: keyState.key })}`;
    try {
      keyState.callsMin++; keyState.callsDay++; keyState.lastCall = Date.now();
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (data.code >= 400) { if (data.code === 429) keyState.status = 'throttled'; return null; }
      CACHE.set(ck, { data, ts: Date.now() });
      return data;
    } catch(e) { keyState.status = 'error'; return null; }
  }

  async function getPrice(symbol) {
    const keys = Storage.getApiKeys();
    const keyList = Array.isArray(keys) ? keys : (keys.twelveData || []).map(k => k.key);
    if (!keyList.some(k => k && k.length > 0)) return null;
    const data = await call('price', { symbol }, 30000);
    if (!data) return null;
    return { price: parseFloat(data.price), change24h: 0, volume24h: 0, source: 'TwelveData' };
  }

  async function getTimeSeries(symbol, interval = '1day', outputsize = 130) {
    const keys = Storage.getApiKeys();
    const keyList = Array.isArray(keys) ? keys : (keys.twelveData || []).map(k => k.key);
    if (!keyList.some(k => k && k.length > 0)) return null;
    const data = await call('time_series', { symbol, interval, outputsize }, 3600000);
    if (!data?.values) return null;
    return data.values.map(v => ({
      ts: new Date(v.datetime).getTime(),
      open: parseFloat(v.open), high: parseFloat(v.high),
      low: parseFloat(v.low), close: parseFloat(v.close),
      volume: parseFloat(v.volume) || 1000000,
    })).reverse();
  }

  function getKeyStatus() { return keyStates.map(k => ({ label: k.label, status: k.status, callsMin: k.callsMin, callsDay: k.callsDay, hasKey: !!k.key })); }
  function clearCache() { CACHE.clear(); }

  return { init, getPrice, getTimeSeries, getKeyStatus, clearCache };
})();

// ═══ brokerAdapter.js ═══
const BrokerAdapter = (() => {
  const MockAdapter = {
    name: 'Simulation', type: 'mock', connected: true,
    async getBalance() {
      const cap = Storage.getSimCapital();
      let openPnL = 0;
      Storage.getSimPositions().forEach(p => {
        const curr = window.__prices[p.symbol] || p.entryPrice;
        openPnL += RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
      });
      return { available: cap, total: cap + openPnL, currency: 'EUR' };
    },
    async placeOrder(order) {
      const { symbol, direction, quantity, entryPrice, stopLoss, takeProfit } = order;
      const pos = { id: 'sim_' + Date.now(), mode: 'sim', symbol, name: MOCK_DATA.watchlist.find(a => a.symbol === symbol)?.name || symbol, direction, entryPrice, quantity, invested: entryPrice * quantity, stopLoss, takeProfit, openedAt: Date.now() };
      const cap = Storage.getSimCapital();
      Storage.saveSimCapital(Math.max(0, cap - pos.invested));
      const positions = Storage.getSimPositions();
      positions.push(pos);
      Storage.saveSimPositions(positions);
      // Sync with Supabase
      SupabaseDB.savePosition(pos).catch(() => {});
      SupabaseDB.saveCapital(Math.max(0, cap - pos.invested)).catch(() => {});
      return { success: true, position: pos, orderId: pos.id };
    },
    async closePosition(positionId) {
      const positions = Storage.getSimPositions();
      const idx = positions.findIndex(p => p.id === positionId);
      if (idx === -1) return { success: false, error: 'Position introuvable' };
      const pos = positions[idx];
      const curr = window.__prices[pos.symbol] || pos.entryPrice;
      const pnl = RiskCalculator.openPnL(pos.entryPrice, curr, pos.quantity, pos.direction);
      const pnlPct = RiskCalculator.openPnLPct(pos.entryPrice, curr, pos.direction);
      Storage.saveSimCapital(Storage.getSimCapital() + pos.invested + pnl);
      const history = Storage.getSimHistory();
      history.unshift({ id: 'h_' + Date.now(), symbol: pos.symbol, direction: pos.direction, entryPrice: pos.entryPrice, exitPrice: curr, pnl, pnlPct, closedAt: Date.now(), durationDays: Math.round((Date.now() - pos.openedAt) / 86400000) });
      // Record for algo learning
      const currentAnalysis = window.__MTP?.lastAnalysis?.all?.find(a => a.symbol === pos.symbol);
      if (currentAnalysis?.indicators) {
        AlgoLearning.recordTrade({
          symbol: pos.symbol, direction: pos.direction,
          pnl, pnlPct, score: currentAnalysis.adjScore,
          closedAt: Date.now(),
        }, currentAnalysis.indicators);
      }
      Storage.saveSimHistory(history);
      positions.splice(idx, 1);
      Storage.saveSimPositions(positions);
      // Sync with Supabase
      const closedTrade = history[0];
      SupabaseDB.saveTrade({...closedTrade, mode: 'sim'}).catch(() => {});
      SupabaseDB.deletePosition(positionId).catch(() => {});
      SupabaseDB.saveCapital(Storage.getSimCapital() + pos.invested + pnl).catch(() => {});
      return { success: true, pnl, pnlPct, exitPrice: curr };
    },
  };

  const BinanceAdapter = {
    name: 'Binance', type: 'binance', connected: BinanceClient.isConfigured(),
    async placeOrder(order) {
      if (!BinanceClient.isConfigured()) return { success: false, error: 'Clé API Binance non configurée' };
      return { success: false, error: 'Ordres réels disponibles en V2' };
    },
    async closePosition(positionId) { return { success: false, error: 'Non disponible en V1' }; },
    async getBalance() { return await BinanceClient.getBalance?.() || { available: 0, total: 0 }; },
  };

  function getAdapter(mode) {
    if (mode === 'sim') return MockAdapter;
    const keys = Storage.getApiKeys();
    if (keys.binance?.connected) return BinanceAdapter;
    return MockAdapter;
  }

  async function placeOrder(order, mode = 'sim') { return getAdapter(mode).placeOrder(order); }
  async function closePosition(posId, mode = 'sim') { return getAdapter(mode).closePosition(posId); }
  async function getBalance(mode = 'sim') { return getAdapter(mode).getBalance(); }
  function getBrokerStatus() {
    const keys = Storage.getApiKeys();
    return {
      simulation:   { name: 'Simulation',    connected: true,                    type: 'mock'    },
      binance:      { name: 'Binance',        connected: keys.binance?.connected, type: 'binance' },
      tradeRepublic:{ name: 'Trade Republic', connected: false,                   type: 'tradeRepublic' },
    };
  }

  return { placeOrder, closePosition, getBalance, getBrokerStatus, MockAdapter, BinanceAdapter };
})();

// ═══ formatting.js ═══
const Fmt = (() => {
  function price(value) {
    if (value === null || value === undefined) return '—';
    const abs = Math.abs(value);
    if (abs >= 10000) return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (abs >= 100)   return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (abs >= 1)     return value.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 5, maximumFractionDigits: 6 });
  }
  function currency(value, decimals = 2) {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function pct(value, decimals = 2, showSign = true) {
    if (value === null || value === undefined) return '—';
    return (showSign && value > 0 ? '+' : '') + value.toFixed(decimals) + '%';
  }
  function pnlClass(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'; }
  function change(value) {
    if (value === null || value === undefined) return { text: '—', cls: '' };
    return { text: (value > 0 ? '+' : '') + value.toFixed(2) + '%', cls: value >= 0 ? 'up' : 'down' };
  }
  function duration(fromTs) {
    if (!fromTs) return '—';
    const diff = Date.now() - fromTs;
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}j ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`;
  }
  function durationMs(ms) {
    if (!ms || ms <= 0) return '—';
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `${d}j ${h}h`; if (h > 0) return `${h}h`; return '< 1h';
  }
  function date(ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  function dateShort(ts) { if (!ts) return '—'; return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); }
  function volume(v) { if (!v) return '—'; if (v >= 1e9) return (v/1e9).toFixed(1)+'G'; if (v >= 1e6) return (v/1e6).toFixed(1)+'M'; if (v >= 1e3) return (v/1e3).toFixed(1)+'K'; return v.toFixed(0); }
  function directionIcon(d) { return d === 'long' ? '↑' : d === 'short' ? '↓' : '—'; }
  function directionLabel(d) { return d === 'long' ? '↑ Hausse' : d === 'short' ? '↓ Baisse' : 'Neutre'; }
  function riskLabel(l) { return l === 'low' ? 'Prudence faible' : l === 'medium' ? 'Prudence moyenne' : l === 'high' ? 'Prudence élevée' : '—'; }
  function profileLabel(p) { return p === 'conservative' ? 'Conservateur' : p === 'balanced' ? 'Équilibré' : p === 'dynamic' ? 'Dynamique' : p; }
  function assetIcon(symbol) {
    const icons = {
      'BTC':'₿','ETH':'Ξ','SOL':'◎','BNB':'B','XRP':'X','ADA':'A',
      'AVAX':'AX','DOT':'●','LINK':'⬡','DOGE':'D','MATIC':'M','UNI':'U',
      'ATOM':'⚛','LTC':'Ł','NEAR':'N','AAPL':'','MSFT':'M','NVDA':'N',
      'TSLA':'T','AMZN':'A','GOOGL':'G','META':'M','NFLX':'N','AMD':'A',
      'JPM':'J','V':'V','MA':'M','DIS':'D','COIN':'C','PYPL':'P',
      'MC':'LV','ASML':'AS','SAP':'S','TTE':'T','BNP':'B','AIR':'✈',
      'RMS':'H','OR':'L','SAN':'S','STLA':'ST',
      'EURUSD':'€$','GBPUSD':'£$','USDJPY':'¥','USDCHF':'Fr','AUDUSD':'A$',
      'GOLD':'Au','SILVER':'Ag','OIL':'🛢',
      'SPY':'S&P','QQQ':'QQ','GLD':'Au','TLT':'📈',
    };
    return icons[symbol] || symbol.slice(0, 2).toUpperCase();
  }
  function signedCurrency(v) { if (v === null || v === undefined) return '—'; return (v >= 0 ? '+' : '') + currency(v); }
  function signedPct(v) { if (v === null || v === undefined) return '—'; return (v >= 0 ? '+' : '') + Math.abs(v).toFixed(2) + '%'; }
  function qty(v, symbol) { if (v === null || v === undefined) return '—'; return ['BTC','ETH','SOL','BNB'].includes(symbol) ? v.toFixed(4) : v.toFixed(2); }
  return { price, currency, pct, pnlClass, change, duration, durationMs, date, dateShort, volume, directionIcon, directionLabel, riskLabel, profileLabel, assetIcon, signedCurrency, signedPct, qty };
})();

// ── fmt alias (used by screens)
const fmt = Fmt;

// ═══════════════════════════════════════════════════════════════
// ═══ AlertManager — Alertes prix + signal (NOUVEAU MODULE) ═══
// ═══════════════════════════════════════════════════════════════
const AlertManager = (() => {

  // ── TYPES D'ALERTES
  const ALERT_TYPES = {
    SIGNAL:    'signal',    // Score ≥ seuil détecté
    PRICE_UP:  'price_up',  // Prix franchit un seuil à la hausse
    PRICE_DOWN:'price_down',// Prix franchit un seuil à la baisse
    STOP_NEAR: 'stop_near', // Stop-loss approché (< 3%)
    TP_HIT:    'tp_hit',    // Take profit atteint
  };

  let _notifPermission = 'default';
  let _lastFiredMap = {}; // { alertId: timestamp } — évite les doublons

  // ── DEMANDER LA PERMISSION (à appeler au premier clic utilisateur)
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Alerts] Notifications non supportées sur ce navigateur');
      return false;
    }
    if (Notification.permission === 'granted') { _notifPermission = 'granted'; return true; }
    if (Notification.permission === 'denied')  { _notifPermission = 'denied';  return false; }
    const result = await Notification.requestPermission();
    _notifPermission = result;
    return result === 'granted';
  }

  // ── ENVOYER UNE NOTIFICATION NATIVE
  function _sendNotification(title, body, tag = 'mtp') {
    // Toast toujours visible en app
    _showToastAlert(title, body);

    // Notification native si permission + page en arrière-plan
    if (_notifPermission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag, renotify: true, vibrate: [200, 100, 200] });
        }).catch(() => {});
      } else {
        new Notification(title, { body, icon: '/icon-192.png', tag });
      }
    } catch(e) { console.warn('[Alerts] Erreur notification', e); }
  }

  // ── TOAST INTERNE (toujours visible dans l'app)
  function _showToastAlert(title, body) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast alert-toast';
    el.innerHTML = `<div class="toast-title">🔔 ${title}</div><div class="toast-body">${body}</div>`;
    el.style.cssText = 'background:var(--bg-card);border:1px solid var(--accent);border-radius:10px;padding:12px 16px;margin-top:8px;cursor:pointer;';
    el.onclick = () => el.remove();
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'all 400ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 400);
    }, 6000);
  }

  // ── CRÉER UNE ALERTE
  function createAlert(type, symbol, params = {}) {
    const alerts = Storage.getAlerts();
    const id = 'alert_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const alert = {
      id, type, symbol,
      enabled: true,
      createdAt: Date.now(),
      firedCount: 0,
      lastFired: null,
      ...params, // targetPrice, scoreThreshold, etc.
    };
    alerts.push(alert);
    Storage.saveAlerts(alerts);
    console.log('[Alerts] Alerte créée', id, type, symbol);
    return alert;
  }

  // ── SUPPRIMER UNE ALERTE
  function deleteAlert(alertId) {
    const alerts = Storage.getAlerts().filter(a => a.id !== alertId);
    Storage.saveAlerts(alerts);
  }

  // ── TOGGLE ENABLE/DISABLE
  function toggleAlert(alertId) {
    const alerts = Storage.getAlerts();
    const a = alerts.find(a => a.id === alertId);
    if (a) { a.enabled = !a.enabled; Storage.saveAlerts(alerts); }
    return a?.enabled;
  }

  // ── VÉRIFICATION DES ALERTES (appelée à chaque refresh prix)
  function checkAlerts(analysisResults) {
    const alerts = Storage.getAlerts().filter(a => a.enabled);
    if (!alerts.length) return;

    const now = Date.now();
    const COOLDOWN = 5 * 60 * 1000; // 5 min entre deux fires de la même alerte

    alerts.forEach(alert => {
      // Cooldown
      if (_lastFiredMap[alert.id] && (now - _lastFiredMap[alert.id]) < COOLDOWN) return;

      const currentPrice = window.__prices[alert.symbol] || null; // real price only
      const assetAnalysis = analysisResults?.all?.find(a => a.symbol === alert.symbol);

      let shouldFire = false, title = '', body = '';

      switch (alert.type) {

        case ALERT_TYPES.SIGNAL: {
          // Alerte quand score ajusté ≥ seuil
          if (!assetAnalysis) break;
          const score = assetAnalysis.adjScore || 0;
          const threshold = alert.scoreThreshold || 60;
          if (score >= threshold && assetAnalysis.direction !== 'neutral') {
            shouldFire = true;
            title = `Signal détecté — ${alert.symbol}`;
            body  = `Score ${score}/100 · ${Fmt.directionLabel(assetAnalysis.direction)} · R/R ${assetAnalysis.rrRatio || '—'}:1`;
          }
          break;
        }

        case ALERT_TYPES.PRICE_UP: {
          // Prix franchit seuil à la hausse
          if (!currentPrice || !alert.targetPrice) break;
          if (currentPrice >= alert.targetPrice) {
            shouldFire = true;
            title = `${alert.symbol} au-dessus de ${Fmt.price(alert.targetPrice)}`;
            body  = `Prix actuel : ${Fmt.price(currentPrice)}`;
          }
          break;
        }

        case ALERT_TYPES.PRICE_DOWN: {
          // Prix franchit seuil à la baisse
          if (!currentPrice || !alert.targetPrice) break;
          if (currentPrice <= alert.targetPrice) {
            shouldFire = true;
            title = `${alert.symbol} en dessous de ${Fmt.price(alert.targetPrice)}`;
            body  = `Prix actuel : ${Fmt.price(currentPrice)}`;
          }
          break;
        }

        case ALERT_TYPES.STOP_NEAR: {
          // Stop-loss < 3% du prix actuel
          if (!currentPrice || !alert.stopPrice) break;
          const dist = Math.abs(currentPrice - alert.stopPrice) / currentPrice * 100;
          if (dist < 3) {
            shouldFire = true;
            title = `⚠️ Stop proche — ${alert.symbol}`;
            body  = `Stop à ${dist.toFixed(1)}% du prix actuel (${Fmt.price(currentPrice)})`;
          }
          break;
        }

        case ALERT_TYPES.TP_HIT: {
          // Take profit atteint
          if (!currentPrice || !alert.tpPrice || !alert.direction) break;
          const hit = alert.direction === 'long' ? currentPrice >= alert.tpPrice : currentPrice <= alert.tpPrice;
          if (hit) {
            shouldFire = true;
            title = `🎯 Take profit atteint — ${alert.symbol}`;
            body  = `Objectif ${Fmt.price(alert.tpPrice)} atteint ! Prix : ${Fmt.price(currentPrice)}`;
          }
          break;
        }
      }

      if (shouldFire) {
        _lastFiredMap[alert.id] = now;
        // Update storage
        const allAlerts = Storage.getAlerts();
        const stored = allAlerts.find(a => a.id === alert.id);
        if (stored) { stored.firedCount = (stored.firedCount || 0) + 1; stored.lastFired = now; Storage.saveAlerts(allAlerts); }
        _sendNotification(title, body, alert.id);
        console.log('[Alerts] 🔔 FIRE', alert.id, title);
      }
    });
  }

  // ── AUTO-CRÉER alertes stop/tp pour les positions ouvertes
  function syncPositionAlerts() {
    const positions = [...Storage.getSimPositions(), ...Storage.getRealPositions()];
    const existingAlerts = Storage.getAlerts();

    positions.forEach(pos => {
      // Stop-loss alert
      if (pos.stopLoss) {
        const existing = existingAlerts.find(a => a.symbol === pos.symbol && a.type === ALERT_TYPES.STOP_NEAR && a.positionId === pos.id);
        if (!existing) {
          createAlert(ALERT_TYPES.STOP_NEAR, pos.symbol, { stopPrice: pos.stopLoss, positionId: pos.id, autoCreated: true });
        }
      }
      // TP alert
      if (pos.takeProfit) {
        const existing = existingAlerts.find(a => a.symbol === pos.symbol && a.type === ALERT_TYPES.TP_HIT && a.positionId === pos.id);
        if (!existing) {
          createAlert(ALERT_TYPES.TP_HIT, pos.symbol, { tpPrice: pos.takeProfit, direction: pos.direction, positionId: pos.id, autoCreated: true });
        }
      }
    });
  }

  // ── INITIALISATION
  async function init() {
    // Ne demande pas la permission immédiatement — attendre un clic utilisateur
    _notifPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
    console.log('[Alerts] Init — permission:', _notifPermission);
  }

  // ── STATS POUR L'UI
  function getStats() {
    const alerts = Storage.getAlerts();
    return {
      total:   alerts.length,
      enabled: alerts.filter(a => a.enabled).length,
      fired:   alerts.filter(a => a.firedCount > 0).length,
      permission: _notifPermission,
    };
  }

  return {
    ALERT_TYPES,
    init,
    requestPermission,
    createAlert,
    deleteAlert,
    toggleAlert,
    checkAlerts,
    syncPositionAlerts,
    getStats,
  };
})();

// ── Tooltip helper (global)
function tooltip(term, explanation) {
  const safe = (explanation || '').replace(/'/g, "\'");
  return '<span style="display:inline-flex;align-items:center;gap:3px;">' +
    term +
    '<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:var(--bg-elevated);border:1px solid var(--border-medium);font-size:9px;color:var(--text-muted);cursor:pointer;flex-shrink:0;" title="' + safe + '" onclick="alert(\'' + safe + '\')">?</span>' +
    '</span>';
}

// ═══ UI Helpers ═══
const UI = (() => {
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 300ms ease';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function confirm(title, message, isDangerous = false) {
    return new Promise(resolve => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');
      content.innerHTML = `
        <div style="padding:var(--space-6);">
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;
            color:${isDangerous ? 'var(--real-color)' : 'var(--text-primary)'};margin-bottom:var(--space-3);">${title}</div>
          <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-6);line-height:1.6;">${message}</p>
          ${isDangerous ? `<div class="warning-box danger" style="margin-bottom:var(--space-5);">⚠️ Cette action concerne des fonds RÉELS.</div>` : ''}
          <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
            <button class="btn btn-ghost" id="modal-cancel">Annuler</button>
            <button class="btn ${isDangerous ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${isDangerous ? '⚠️ Confirmer' : 'Confirmer'}</button>
          </div>
        </div>`;
      overlay.classList.remove('hidden');
      document.getElementById('modal-cancel').onclick  = () => { overlay.classList.add('hidden'); resolve(false); };
      document.getElementById('modal-confirm').onclick = () => { overlay.classList.add('hidden'); resolve(true);  };
      overlay.onclick = e => { if (e.target === overlay) { overlay.classList.add('hidden'); resolve(false); } };
    });
  }

  function openOrderModal(symbol, mode, analysis) {
    return new Promise(resolve => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');
      const settings = Storage.getSettings();
      const price    = window.__prices[symbol] || 0;
      const stop     = analysis.stopLoss   || (price * 0.98);
      const tp       = analysis.takeProfit || (price * 1.05);
      const capNum   = Storage.getSimCapital();
      const riskAmount = capNum * settings.riskPerTrade;
      const qty      = stop > 0 ? riskAmount / Math.abs(price - stop) : 1;
      const invested = qty * price;
      const isSim    = mode === 'sim';
      const rrRatio  = analysis.rrRatio || '—';
      const slPct    = price > 0 ? ((Math.abs(price - stop) / price) * 100).toFixed(1) : '?';
      const tpPct    = price > 0 ? ((Math.abs(tp - price) / price) * 100).toFixed(1) : '?';
      const direction = analysis.direction || 'neutral';

      content.innerHTML = `
        <div style="padding:var(--space-6);">

          <!-- En-tête -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <div style="width:42px;height:42px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border-medium);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:700;color:var(--accent);">${Fmt.assetIcon(symbol)}</div>
              <div>
                <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;">${symbol}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">${MOCK_DATA.watchlist.find(a=>a.symbol===symbol)?.name || ''}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span class="direction-tag ${direction}">${Fmt.directionIcon(direction)} ${Fmt.directionLabel(direction)}</span>
              <span class="hero-mode-tag ${isSim ? 'sim' : 'real'}">${isSim ? '⚡ SIM' : '⚠️ RÉEL'}</span>
            </div>
          </div>

          <!-- Résumé visuel du trade — lecture seule -->
          <div style="background:var(--bg-elevated);border-radius:var(--card-radius);padding:var(--space-4);margin-bottom:var(--space-4);">

            <!-- Prix + direction -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);padding-bottom:var(--space-3);border-bottom:1px solid var(--border-subtle);">
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Prix d'entrée</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;">${Fmt.price(price)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Ratio R/R</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:${rrRatio >= 2 ? 'var(--profit)' : 'var(--signal-medium)'};">${rrRatio}:1</div>
              </div>
            </div>

            <!-- SL / TP côte à côte -->
            <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:var(--space-3);align-items:center;margin-bottom:var(--space-4);">
              <div style="background:rgba(224,90,90,0.08);border:1px solid var(--real-border);border-radius:8px;padding:var(--space-3);">
                <div style="font-size:var(--text-xs);color:var(--loss);font-weight:700;margin-bottom:4px;">🔴 STOP-LOSS</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;color:var(--loss);">${Fmt.price(stop)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">-${slPct}% · ${Fmt.currency(riskAmount)} max</div>
              </div>
              <div style="text-align:center;color:var(--text-muted);font-size:var(--text-sm);">→</div>
              <div style="background:rgba(0,229,160,0.08);border:1px solid var(--accent-glow);border-radius:8px;padding:var(--space-3);">
                <div style="font-size:var(--text-xs);color:var(--profit);font-weight:700;margin-bottom:4px;">🟢 TAKE PROFIT</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;color:var(--profit);">${Fmt.price(tp)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">+${tpPct}% · ${Fmt.currency(riskAmount * parseFloat(rrRatio) || 0)} potentiel</div>
              </div>
            </div>

            <!-- Sizing -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);">
              <div style="text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Montant engagé</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">${Fmt.currency(invested)}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Quantité</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">${Fmt.qty(qty, symbol)}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Capital dispo.</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">${Fmt.currency(capNum)}</div>
              </div>
            </div>
          </div>

          <!-- Avertissement si capital insuffisant -->
          ${invested > capNum ? `<div style="background:var(--real-bg);border:1px solid var(--real-border);border-radius:8px;padding:var(--space-3);margin-bottom:var(--space-4);font-size:var(--text-xs);color:var(--loss);">⚠️ Capital insuffisant. Réduisez le montant ou ajustez le risque par trade dans les paramètres.</div>` : ''}

          <!-- Note algo -->
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-5);line-height:1.6;text-align:center;">
            📐 SL calculé par l'algo : <strong>2×ATR(14)</strong> · TP : ratio R/R <strong>2.5:1</strong> · Risque : <strong>${(settings.riskPerTrade * 100).toFixed(2)}% du capital</strong>
          </div>

          <!-- Champs cachés (valeurs utilisées à la confirmation) -->
          <input type="hidden" id="order-amount" value="${invested.toFixed(2)}"/>
          <input type="hidden" id="order-stop"   value="${stop.toFixed(6)}"/>
          <input type="hidden" id="order-tp"     value="${tp.toFixed(6)}"/>

          <!-- Boutons -->
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-ghost" id="order-cancel" style="flex:1;">Annuler</button>
            <button class="btn ${isSim ? 'btn-sim' : 'btn-real'}" id="order-confirm" style="flex:2;" ${!isSim ? 'disabled' : ''}>
              ${isSim ? '⚡ Confirmer & Ouvrir le trade' : '⚠️ Non disponible en V1'}
            </button>
          </div>
        </div>`;

      overlay.classList.remove('hidden');
      document.getElementById('order-cancel').onclick = () => { overlay.classList.add('hidden'); resolve(null); };
      if (isSim) {
        document.getElementById('order-confirm').onclick = () => {
          const amount = parseFloat(document.getElementById('order-amount').value);
          const stopVal = parseFloat(document.getElementById('order-stop').value);
          const tpVal   = parseFloat(document.getElementById('order-tp').value);
          overlay.classList.add('hidden');
          resolve({ symbol, direction: analysis.direction, quantity: amount / price, entryPrice: price, stopLoss: stopVal, takeProfit: tpVal });
        };
      }
      overlay.onclick = e => { if (e.target === overlay) { overlay.classList.add('hidden'); resolve(null); } };
    });
  }

  function scoreRing(score, size = 44) {
    const color = score >= 70 ? 'var(--signal-strong)' : score >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)';
    const r = (size / 2) - 4, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
    return `
      <div class="score-ring" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="3"/>
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="3"
            stroke-dasharray="${dash} ${circ}" stroke-linecap="round" style="transition:stroke-dasharray .6s ease;"/>
        </svg>
        <div class="score-ring-text" style="color:${color};font-size:${size < 50 ? '10px' : '13px'};">${score}</div>
      </div>`;
  }

  function sparkline(candles, width = 80, height = 30) {
    if (!candles || candles.length < 2) return `<div style="width:${width}px;height:${height}px;"></div>`;
    const closes = candles.map(c => c.close);
    const min = closes.reduce(function(a,b){return a<b?a:b;}), max = closes.reduce(function(a,b){return a>b?a:b;}), range = max - min || 1;
    const pts = closes.map((v, i) => `${(i / (closes.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
    const color = closes[closes.length - 1] >= closes[0] ? 'var(--profit)' : 'var(--loss)';
    return `<svg width="${width}" height="${height}" style="display:block;"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  }

  function updateModeBanner(mode) {
    const banner = document.getElementById('mode-banner');
    if (!banner) return;
    banner.style.display = 'none'; // Bannière masquée
  }

  return { toast, confirm, openOrderModal, scoreRing, sparkline, updateModeBanner };
})();

// ─── THEME LIGHT CSS (injecté dans <style> au boot) ───
const LIGHT_THEME_CSS = `
[data-theme="light"] {
  --bg-primary:      #f4f5f8;
  --bg-secondary:    #eaecf2;
  --bg-card:         #ffffff;
  --bg-card-hover:   #f0f2f8;
  --bg-elevated:     #e4e8f0;
  --border-subtle:   rgba(0,0,0,0.07);
  --border-medium:   rgba(0,0,0,0.14);
  --border-strong:   rgba(0,0,0,0.22);
  --text-primary:    #0f1525;
  --text-secondary:  #3d4a6b;
  --text-muted:      #8892b0;
  --text-accent:     #00a676;
  --accent:          #00a676;
  --accent-dim:      rgba(0,166,118,0.10);
  --accent-glow:     rgba(0,166,118,0.20);
  --signal-strong:   #00a676;
  --signal-medium:   #d4850a;
  --signal-weak:     #c03030;
  --risk-low:        #00a676;
  --risk-medium:     #d4850a;
  --risk-high:       #c03030;
  --long-color:      #00a676;
  --short-color:     #c03030;
  --profit:          #00a676;
  --loss:            #c03030;
  --sim-color:       #d4850a;
  --sim-bg:          rgba(212,133,10,0.08);
  --sim-border:      rgba(212,133,10,0.30);
  --real-color:      #c03030;
  --real-bg:         rgba(192,48,48,0.06);
  --real-border:     rgba(192,48,48,0.25);
  --shadow-card:     0 2px 12px rgba(0,0,0,0.10);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,0.15);
  --shadow-accent:   0 0 16px rgba(0,166,118,0.12);
}
[data-theme="light"] body { background-color: var(--bg-primary); }
[data-theme="light"] .mode-banner.mode-simulation { color: #5a3a00; }
[data-theme="light"] .sidebar { border-right-color: var(--border-subtle); }
`;

function _injectLightTheme() {
  if (document.getElementById('mtp-light-theme')) return;
  const style = document.createElement('style');
  style.id = 'mtp-light-theme';
  style.textContent = LIGHT_THEME_CSS;
  document.head.appendChild(style);
}
_injectLightTheme();

// Inject responsive CSS
(function() {
  if (document.getElementById('mtp-responsive')) return;
  const style = document.createElement('style');
  style.id = 'mtp-responsive';
  style.textContent = `
/* ── Responsive Mobile-first ── */
.screen-header { padding: var(--space-4) 0 var(--space-2); }
.screen-title { font-size: clamp(1.4rem, 5vw, 2rem); font-weight: 800; }
.screen-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
.pf-hero { padding: var(--space-5); }
.pf-pnl-big { font-size: clamp(1.2rem, 5vw, 1.8rem) !important; }
.pf-hero-pnl { font-size: clamp(1rem, 4vw, 1.5rem); }
.hero-capital { font-size: clamp(1.8rem, 7vw, 3rem) !important; }
.opp-row { padding: var(--space-3) var(--space-4); }
.asset-symbol { font-size: clamp(0.85rem, 3vw, 1rem); }
@media (max-width: 480px) {
  .grid-4 { grid-template-columns: 1fr 1fr !important; }
  .order-zones { grid-template-columns: 1fr !important; }
  .pf-stats-grid { grid-template-columns: 1fr 1fr !important; }
  .sim-stats-grid { grid-template-columns: 1fr 1fr !important; }
  .profile-cards-row { grid-template-columns: 1fr 1fr !important; }
}
@media (min-width: 768px) {
  .main-content { padding: var(--space-6) var(--space-8); }
  .screen-title { font-size: 2rem; }
  .opp-row { padding: var(--space-4) var(--space-6); }
}
@media (min-width: 1024px) {
  .main-content { padding: var(--space-8) var(--space-12); max-width: 900px; margin: 0 auto; }
}
`;
  document.head.appendChild(style);
})();

// ═══ Router ═══
const Router = (() => {
  let currentScreen = 'dashboard';
  const screens = {};
  let assetDetailParam = null;

  function register(name, fn) { screens[name] = fn; }

  function attachNavClicks() {
    document.querySelectorAll('.nav-item, .bnav-item').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); if (el.dataset.screen) navigate(el.dataset.screen); });
    });
  }

  function navigate(screenName, params = null) {
    if (screenName === 'asset-detail') assetDetailParam = params;
    currentScreen = screenName;
    render();
    updateNav(screenName);
    window.scrollTo(0, 0);
  }

  function render() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const fn = screens[currentScreen];
    if (!fn) { main.innerHTML = `<div class="screen" id="screen-${currentScreen}"><p>Écran "${currentScreen}" non trouvé.</p></div>`; return; }

    // Injecte le wrapper avec le bon id AVANT d'appeler la fonction
    main.innerHTML = `<div class="screen" id="screen-${currentScreen}"></div>`;
    const wrapper = main.querySelector('.screen');

    if (currentScreen === 'asset-detail') {
      const result = fn(assetDetailParam);
      if (typeof result === 'string') wrapper.innerHTML = result;
      // Async: load real OHLC + price if not in cache
      const sym = assetDetailParam?.symbol;
      if (sym) {
        (async () => {
          let needsRefresh = false;

          // 1. Fetch real price immediately if not in cache
          if (!window.__prices?.[sym] || window.__prices[sym] <= 0) {
            try {
              const pd = await RealDataClient.getPrice(sym);
              if (pd?.price && pd.price > 0) {
                window.__prices[sym] = pd.price;
                needsRefresh = true;
              }
            } catch(e) {}
          } else {
            needsRefresh = true; // Price already available — refresh to show it
          }

          // 2. Fetch OHLC for chart and indicators
          if (!window.__ohlcCache?.[sym]) {
            try {
              const candles = await RealDataClient.getOHLC(sym);
              if (candles?.length >= 20) {
                if (!window.__ohlcCache) window.__ohlcCache = {};
                window.__ohlcCache[sym] = candles;
                needsRefresh = true;
              }
            } catch(e) {}
          }

          // 3. Re-render with real data
          if (needsRefresh && currentScreen === 'asset-detail') {
            const newResult = fn(assetDetailParam);
            const w = document.querySelector('.screen');
            if (w && typeof newResult === 'string') w.innerHTML = newResult;
            // Re-attach events
            attachScreenEvents('asset-detail');
          }
        })();
      }
    } else {
      // Pour les screens qui utilisent getElementById('screen-X'), le div est déjà présent
      const result = fn();
      if (typeof result === 'string') wrapper.innerHTML = result;
    }
    attachScreenEvents(currentScreen);
  }

  function updateNav(screenName) {
    document.querySelectorAll('.nav-item, .bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screenName);
    });
  }

  function attachScreenEvents(screenName) {
    // Load trending data async for dashboard
    if (screenName === 'dashboard') {
      setTimeout(() => _loadTrendingSection(), 100);
    }
    // Search handler for opportunities
    if (screenName === 'opportunities') {
      const searchInput = document.getElementById('opp-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.toLowerCase().trim();
          document.querySelectorAll('[data-asset-class]').forEach(card => {
            const sym = (card.dataset.symbol || '').toLowerCase();
            const name = (card.querySelector('.asset-symbol')?.textContent || '').toLowerCase();
            card.style.display = (!q || sym.includes(q) || name.includes(q)) ? '' : 'none';
          });
        });
      }
    }
    // Navigation interne
    document.querySelectorAll('[data-screen]').forEach(el => {
      if (el.closest('.nav-item') || el.closest('.bnav-item')) return;
      el.addEventListener('click', e => {
        e.preventDefault();
        navigate(el.dataset.screen, el.dataset.symbol ? { symbol: el.dataset.symbol } : null);
      });
    });
    // Fermeture position
    document.querySelectorAll('[data-close-position]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await handleClosePosition(btn.dataset.closePosition, btn.dataset.mode || 'sim');
      });
    });
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const group = tab.dataset.group, target = tab.dataset.tab;
        document.querySelectorAll(`[data-group="${group}"]`).forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        document.querySelectorAll(`[data-tab-content="${group}"]`).forEach(c => { c.style.display = c.dataset.tabId === target ? '' : 'none'; });
      });
    });
    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.filterGroup;
        document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterVal = btn.dataset.filter;
        // Apply filter to opportunity cards
        document.querySelectorAll('[data-asset-class]').forEach(card => {
          const cls = card.dataset.assetClass || '';
          const classMap = { 'crypto': 'crypto', 'stock': 'stock', 'forex': 'forex', 'commodity': 'commodity', 'etf': 'etf' };
          if (filterVal === 'all') {
            card.style.display = '';
          } else {
            card.style.display = cls === filterVal ? '' : 'none';
          }
        });
        document.dispatchEvent(new CustomEvent('filter-change', { detail: { group, value: filterVal } }));
      });
    });
  }

  async function handleClosePosition(posId, mode) {
    const ok = await UI.confirm('Fermer la position', `Fermer cette position ${mode === 'sim' ? 'fictive' : '⚠️ RÉELLE'} ?`, mode === 'real');
    if (!ok) return;
    const result = await BrokerAdapter.closePosition(posId, mode);
    if (result.success) {
      UI.toast(`Position fermée — ${Fmt.signedCurrency(result.pnl)} (${Fmt.signedPct(result.pnlPct)})`, result.pnl >= 0 ? 'success' : 'warning');
      navigate('positions');
    } else {
      UI.toast('Erreur : ' + result.error, 'error');
    }
  }

  function getCurrent() { return currentScreen; }

  return { register, navigate, render, getCurrent, attachNavClicks };
})();

// ═══ Sync ═══
const Sync = (() => {
  let lastSyncTime = Date.now();

  let _priceCountdown = 600; // 10 min
  let _cryptoCountdown = 15;  // 15 sec

  function init() {
    // Crypto positions: every 15 seconds via Binance
    setInterval(() => {
      refreshCryptoPrices();
      _cryptoCountdown = 15;
    }, 15 * 1000);

    // All prices: every 10 minutes
    setInterval(() => {
      refreshPrices();
      _priceCountdown = 600;
    }, 10 * 60 * 1000);

    // Full analysis: every hour
    setInterval(() => refreshAnalysis(), 60 * 60 * 1000);

    // Countdown tickers
    setInterval(() => {
      _cryptoCountdown = Math.max(0, _cryptoCountdown - 1);
      _priceCountdown  = Math.max(0, _priceCountdown - 1);
      // Update all countdown elements
      document.querySelectorAll('[data-countdown="crypto"]').forEach(el => {
        el.textContent = _cryptoCountdown + 's';
      });
      document.querySelectorAll('[data-countdown="prices"]').forEach(el => {
        const m = Math.floor(_priceCountdown / 60);
        const s = _priceCountdown % 60;
        el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      });
    }, 1000);

    // On app focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastSyncTime > 2 * 60 * 1000) refreshPrices();
    });
  }

  async function refreshCryptoPrices() {
    // Refresh EUR/USD rate first (same Binance call, no extra quota)
    try {
      const r = await fetch('https://aged-bar-257a.emmanueldelasse.workers.dev/binance/api/v3/ticker/price?symbol=EURUSDT');
      if (r.ok) {
        const d = await r.json();
        if (d.price) {
          window.__eurUsdRate = parseFloat(d.price);
          BinanceClient._setEurUsdRate(window.__eurUsdRate);
        }
      }
    } catch(e) {}

    // Refresh all crypto prices (positions + watchlist top)
    const openSymbols = new Set([
      ...Storage.getSimPositions().map(p => p.symbol),
      ...Storage.getRealPositions().map(p => p.symbol),
    ]);
    const cryptoSymbols = ['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','DOT','LINK','DOGE','MATIC','UNI','ATOM','LTC','NEAR'];
    // Prioritize open positions, then all cryptos
    const toRefresh = [
      ...cryptoSymbols.filter(s => openSymbols.has(s)),
      ...cryptoSymbols.filter(s => !openSymbols.has(s)),
    ];
    for (const symbol of toRefresh) {
      try {
        const data = await BinanceClient.getPrice(symbol);
        if (data?.price) window.__prices[symbol] = data.price;
      } catch(e) {}
    }
    if (window.__MTP?.lastAnalysis) AlertManager.checkAlerts(window.__MTP.lastAnalysis);
    if (['portefeuille','dashboard'].includes(Router.getCurrent())) updateLivePnL();
  }

  async function refreshAnalysis() {
    if (window.__MTP?.Router) {
      const screen = window.__MTP.Router.getCurrent();
      if (['dashboard', 'opportunities', 'asset-detail'].includes(screen)) window.__MTP.Router.navigate(screen);
    }
  }

  async function refreshPrices() {
    try {
      await RealDataClient.refreshAllPrices(Storage.getWatchlist());
      // Vérifier les alertes après refresh des prix
      if (window.__MTP?.lastAnalysis) {
        AlertManager.checkAlerts(window.__MTP.lastAnalysis);
      }
      if (['positions', 'dashboard'].includes(Router.getCurrent())) updateLivePnL();
    } catch(e) {}
    lastSyncTime = Date.now();
  }

  function updateLivePnL() {
    Storage.getSimPositions().forEach(pos => {
      const curr = window.__prices[pos.symbol] || pos.entryPrice;
      const pnl  = RiskCalculator.openPnL(pos.entryPrice, curr, pos.quantity, pos.direction);
      const pnlP = RiskCalculator.openPnLPct(pos.entryPrice, curr, pos.direction);
      const el   = document.querySelector(`[data-position-pnl="${pos.id}"]`);
      if (el) { el.textContent = Fmt.currency(pnl); el.className = 'pnl-value ' + Fmt.pnlClass(pnl); }
      const pEl  = document.querySelector(`[data-position-pnlpct="${pos.id}"]`);
      if (pEl) { pEl.textContent = Fmt.pct(pnlP); pEl.className = 'pnl-pct ' + Fmt.pnlClass(pnlP); }
      const prEl = document.querySelector(`[data-position-price="${pos.id}"]`);
      if (prEl) prEl.textContent = Fmt.price(curr);
    });
  }

  function getLastSync() {
    const diff = Math.round((Date.now() - lastSyncTime) / 1000);
    return diff < 60 ? `il y a ${diff}s` : `il y a ${Math.round(diff/60)}min`;
  }

  return { init, refreshPrices, getLastSync };
})();


// ═══ Single source of truth for prices ═══
function getPriceForSymbol(symbol) {
  const p = window.__prices[symbol];
  return p && p > 0 ? p : null;
}

function getPriceDisplay(symbol) {
  const p = getPriceForSymbol(symbol);
  if (!p) return { price: null, text: '— Prix indisponible', loading: true };
  return { price: p, text: Fmt.price(p), loading: false };
}


// ═══ PepiteEngine — Détection intelligente précoce ═══
const PepiteEngine = (() => {

  function detectPepites(analysis) {
    if (!analysis?.all?.length) return [];
    const pepites = [];

    analysis.all.forEach(a => {
      if (a.error) return;
      const ind = a.indicators;
      if (!ind) return;

      // Not already a top opportunity
      const isTopOpportunity = a.adjScore >= 70;
      if (isTopOpportunity) return;

      const reasons = [];
      let watchScore = 0;
      let status = 'trop_tot';
      let waitFor = '';
      let maturity = 0; // 0-100

      // ── Signal 1: Score en construction (40-60)
      if (a.adjScore >= 40 && a.adjScore < 70) {
        watchScore += 30;
        maturity += 30;
        reasons.push('Score en construction (' + a.adjScore + '/100)');
      }

      // ── Signal 2: MACD bullish cross récent
      if (ind.macd?.bullishCross || ind.macd?.bearishCross) {
        watchScore += 20;
        maturity += 20;
        reasons.push('Croisement MACD recent');
      }

      // ── Signal 3: Bollinger compression (breakout imminent)
      if (ind.bollinger?.compressed) {
        watchScore += 15;
        maturity += 15;
        reasons.push('Bollinger compresses — breakout possible');
      }

      // ── Signal 4: RSI sortant de zone extrême
      if (ind.rsi) {
        if (ind.rsi > 25 && ind.rsi < 35) { watchScore += 15; maturity += 15; reasons.push('RSI remonte de zone de survente'); }
        if (ind.rsi > 65 && ind.rsi < 75) { watchScore += 10; maturity += 10; reasons.push('RSI en zone de force'); }
      }

      // ── Signal 5: Volume supérieur à la moyenne
      if (ind.relVol > 1.2) {
        watchScore += 10;
        maturity += 10;
        reasons.push('Volume superieur a la moyenne (' + ind.relVol?.toFixed(1) + 'x)');
      }

      // ── Signal 6: Ichimoku en transition
      if (ind.ichimoku?.inCloud === false && ind.ichimoku?.tenkan > ind.ichimoku?.kijun) {
        watchScore += 15;
        maturity += 15;
        reasons.push('Tenkan au-dessus de Kijun — signal Ichimoku positif');
      }

      // ── Signal 7: Divergence RSI bullish
      if (ind.rsiDiv?.bullishDiv) {
        watchScore += 20;
        maturity += 20;
        reasons.push('Divergence RSI haussiere detectee');
      }

      // ── Signal 8: Régression linéaire positive en construction
      if (ind.regression?.slope > 0 && ind.regression?.r2 > 0.3) {
        watchScore += 10;
        maturity += 10;
        reasons.push('Regression lineaire positive (R2=' + ind.regression.r2?.toFixed(2) + ')');
      }

      // Need at least 2 signals and min score
      if (reasons.length < 2 || watchScore < 35) return;

      // Determine status
      maturity = Math.min(100, maturity);
      if (maturity >= 80) status = 'proche_validation';
      else if (maturity >= 60) status = 'a_confirmer';
      else if (maturity >= 40) status = 'en_construction';
      else status = 'surveillance_active';

      // What to wait for
      const missing = [];
      if (a.adjScore < 60) missing.push('score > 60');
      if (!ind.macd?.bullishCross && a.direction === 'long') missing.push('croisement MACD');
      if (ind.bollinger?.compressed) missing.push('breakout Bollinger');
      if (ind.adx < 20) missing.push('ADX > 20');
      if (ind.relVol < 1.0) missing.push('confirmation volume');
      waitFor = missing.length > 0 ? missing.slice(0, 2).join(' + ') : 'Confirmation generale';

      // Horizon
      const horizon = ind.vol20 > 40 ? '1-3 jours' : ind.adx > 25 ? '1-2 semaines' : '2-4 semaines';

      pepites.push({
        symbol: a.symbol,
        name: a.name,
        assetClass: a.assetClass,
        price: getPriceForSymbol(a.symbol) || a.price,
        change24h: a.change24h,
        watchScore,
        maturity,
        status,
        direction: a.direction,
        riskLevel: a.riskLevel,
        reasons,
        waitFor,
        horizon,
        adjScore: a.adjScore,
      });
    });

    return pepites
      .sort((a, b) => b.watchScore - a.watchScore)
      .slice(0, 5);
  }

  function getStatusLabel(status) {
    const map = {
      proche_validation: { label: 'Proche validation', color: 'var(--profit)', emoji: '🟢' },
      a_confirmer:       { label: 'A confirmer',       color: 'var(--signal-medium)', emoji: '🟡' },
      en_construction:   { label: 'En construction',   color: 'var(--text-muted)', emoji: '🔵' },
      surveillance_active:{ label: 'Sous surveillance', color: 'var(--accent)', emoji: '👁️' },
      trop_tot:          { label: 'Trop tot',           color: 'var(--text-muted)', emoji: '⏳' },
    };
    return map[status] || map.trop_tot;
  }

  return { detectPepites, getStatusLabel };
})();

// ── Render section pépites
function renderPepitesSection(analysis, maxItems = 3) {
  const pepites = PepiteEngine.detectPepites(analysis);
  if (!pepites.length) return '';

  const items = pepites.slice(0, maxItems).map(p => {
    const st = PepiteEngine.getStatusLabel(p.status);
    const priceAvail = p.price && p.price > 0;
    const change = Fmt.change(p.change24h);
    const mainReason = p.reasons[0] || '';

    return '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:3px solid ' + st.color + ';border-radius:var(--card-radius);padding:var(--space-4);cursor:pointer;" data-screen="asset-detail" data-symbol="' + p.symbol + '">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">'
      + '<div style="display:flex;align-items:center;gap:var(--space-2);">'
      + '<span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;">' + p.symbol + '</span>'
      + '<span style="font-size:var(--text-xs);color:var(--text-muted);">' + (p.name || '') + '</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:var(--space-2);">'
      + '<span style="font-size:0.65rem;font-weight:700;padding:1px 6px;border-radius:4px;background:' + st.color + '22;color:' + st.color + ';">' + st.emoji + ' ' + st.label + '</span>'
      + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">'
      + '<div>'
      + '<div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">' + (priceAvail ? Fmt.price(p.price) : '— Chargement') + '</div>'
      + '<div style="font-size:var(--text-xs);" class="' + change.cls + '">' + change.text + '</div>'
      + '</div>'
      + '<div style="text-align:right;">'
      + '<div style="font-size:var(--text-xs);color:var(--text-muted);">Score surveillance</div>'
      + '<div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;color:' + st.color + ';">' + p.watchScore + '/100</div>'
      + '</div>'
      + '</div>'
      // Maturity bar
      + '<div style="height:4px;background:var(--bg-elevated);border-radius:2px;margin-bottom:var(--space-2);">'
      + '<div style="height:100%;width:' + p.maturity + '%;background:' + st.color + ';border-radius:2px;transition:width 0.5s;"></div>'
      + '</div>'
      + '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:4px;">'
      + '💡 ' + mainReason
      + '</div>'
      + '<div style="font-size:var(--text-xs);color:var(--text-muted);">'
      + '⏳ Attendre : ' + p.waitFor + ' · Horizon : ' + p.horizon
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="section-title" style="margin-top:var(--space-6);">'
    + '<span>💎 Pépites à surveiller</span>'
    + '<span style="font-size:var(--text-xs);color:var(--text-muted);">Signaux en construction</span>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-6);">'
    + items
    + '</div>';
}


// ═══ FinnhubClient — Calendrier économique réel ═══
const FinnhubClient = (() => {
  const PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev/finnhub';
  let _cache = null;
  let _lastFetch = 0;
  const TTL = 60 * 60 * 1000; // 1h

  async function getEconomicCalendar() {
    // /calendar/economic requires paid Finnhub plan
    // Use static calendar — Finnhub free plan only gives market news
    return null;
  }

  async function getMarketNews(category = 'general') {
    const now = Date.now();
    if (_cache && now - _lastFetch < TTL) return _cache;
    try {
      const r = await fetch(PROXY + '/news?category=' + category + '&minId=0', {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) throw new Error('Finnhub error ' + r.status);
      const data = await r.json();
      if (!Array.isArray(data)) return null;
      const news = data.slice(0, 10).map(a => ({
        title: a.headline || '',
        summary: (a.summary || '').slice(0, 200),
        source: a.source || 'Finnhub',
        link: a.url || '',
        pubDate: new Date((a.datetime || 0) * 1000).toISOString(),
        sentiment: 'neutral',
        symbols: a.related ? a.related.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : [],
        category: 'Marches',
        importance: 'medium',
      }));
      _cache = news;
      _lastFetch = now;
      return news;
    } catch(e) {
      console.warn('[Finnhub] News error:', e.message);
      return null;
    }
  }

  return { getEconomicCalendar, getMarketNews };
})();

// ═══ AlphaVantageClient — News multi-sources avec sentiment ═══
const AlphaVantageClient = (() => {
  const PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev/alphavantage';
  let _cache = null;
  let _lastFetch = 0;
  const TTL = 6 * 60 * 60 * 1000; // 6h — preserve 25 calls/day quota

  async function getNewsWithSentiment(topics = 'financial_markets,technology,economy_macro') {
    const now = Date.now();
    if (_cache && now - _lastFetch < TTL) return _cache;
    try {
      const r = await fetch(
        PROXY + '/query?function=NEWS_SENTIMENT&topics=' + topics + '&limit=30&sort=LATEST',
        { signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) throw new Error('AlphaVantage error ' + r.status);
      const data = await r.json();
      if (data.Note || data.Information) {
        console.warn('[AlphaVantage] Quota atteint:', data.Note || data.Information);
        return null;
      }
      const articles = (data.feed || []).map(a => ({
        title: a.title || '',
        summary: (a.summary || '').slice(0, 300),
        source: a.source || '',
        sourceUrl: a.source_domain || '',
        link: a.url || '',
        pubDate: a.time_published || '',
        sentiment: a.overall_sentiment_label || 'Neutral',
        sentimentScore: parseFloat(a.overall_sentiment_score) || 0,
        symbols: (a.ticker_sentiment || []).map(t => t.ticker).filter(Boolean).slice(0, 3),
        topics: (a.topics || []).map(t => t.topic).slice(0, 3),
      }));
      _cache = articles;
      _lastFetch = now;
      return articles;
    } catch(e) {
      console.warn('[AlphaVantage] News error:', e.message);
      return null;
    }
  }

  return { getNewsWithSentiment };
})();

// ═══ dashboard.js ═══
function renderDashboard() {
  const settings = Storage.getSettings();
  const simCap   = Storage.getSimCapital();
  const simPos   = Storage.getSimPositions();
  const realPos  = Storage.getRealPositions();

  if (!window.__MTP.lastAnalysis) window.__MTP.lastAnalysis = AnalysisEngine.analyzeAllSync();
  const analysis = window.__MTP.lastAnalysis;

  let totalPnL = 0, totalInvested = 0;
  simPos.forEach(p => {
    const curr = window.__prices[p.symbol] || p.entryPrice;
    totalPnL += RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
    totalInvested += p.invested;
  });

  const simCapNum    = Storage.getSimCapital();
  const simCapInit   = parseFloat(settings.simInitialCapital) || 10000;
  const capitalTotal = simCapNum + totalInvested + totalPnL;
  const globalReturn = simCapInit > 0 ? ((capitalTotal - simCapInit) / simCapInit) * 100 : 0;
  const top5 = analysis.tradeable.slice(0, 5);
  const hasRealData = analysis.all.some(a => !a.error);
  const regime = hasRealData ? {
    label: analysis.tradeable.length > 5 ? 'Marché actif' : analysis.tradeable.length > 0 ? 'Marché modéré' : 'Peu de signaux',
    icon: analysis.tradeable.length > 5 ? '🟢' : analysis.tradeable.length > 0 ? '🟡' : '🔴',
    color: analysis.tradeable.length > 5 ? 'var(--profit)' : analysis.tradeable.length > 0 ? 'var(--signal-medium)' : 'var(--loss)',
    score: analysis.tradeable.length > 0 ? Math.round(analysis.tradeable.reduce((s,a) => s + a.adjScore, 0) / analysis.tradeable.length) : 0,
  } : {
    label: 'Chargement...', icon: '⏳',
    color: 'var(--text-muted)', score: 0,
  };
  const alertStats = AlertManager.getStats();

  return `
    <div class="screen-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);">
        <div>
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <span class="hero-mode-tag sim">⚡ Mode entraînement</span>
      </div>
    </div>

    <!-- Message contextuel -->
    ${(function() {
      const nbSolid = analysis.tradeable.filter(a=>a.isSolid).length;
      const nbTrade = analysis.tradeable.length;
      const emoji = nbSolid > 0 ? '🟢' : nbTrade > 3 ? '🟡' : '🔴';
      const bg    = nbSolid > 0 ? 'rgba(0,229,160,0.08)' : nbTrade > 3 ? 'rgba(245,166,35,0.08)' : 'var(--bg-elevated)';
      const border= nbSolid > 0 ? 'rgba(0,229,160,0.25)' : 'var(--border-subtle)';
      const title = nbSolid > 0 ? nbSolid + ' signal' + (nbSolid > 1 ? 's' : '') + ' fort' + (nbSolid > 1 ? 's' : '') + ' — Bonne opportunité'
                  : nbTrade > 3 ? 'Marché actif — Quelques opportunités'
                  : 'Marché calme — Peu de signaux aujourd\'hui';
      const sub   = nbTrade + ' opportunité' + (nbTrade > 1 ? 's' : '') + ' · ' + nbSolid + ' signal' + (nbSolid > 1 ? 's' : '') + ' fort' + (nbSolid > 1 ? 's' : '');
      return '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:var(--card-radius);padding:var(--space-4);margin-bottom:var(--space-6);display:flex;align-items:center;gap:var(--space-3);"><span style=\"font-size:1.4rem;\">' + emoji + '</span><div><div style=\"font-size:var(--text-sm);font-weight:700;color:var(--text-primary);\">' + title + '</div><div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + sub + '</div></div></div>';
    })()}

    <div class="dashboard-hero">
      <div class="hero-label">Mon capital d'entraînement</div>
      <div class="hero-capital">${Fmt.currency(simCapNum)}</div>
      <div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);flex-wrap:wrap;">
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Disponible</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.currency(simCapNum - totalInvested)}</div>
        </div>
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Engagé dans des trades</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.currency(totalInvested)}</div>
        </div>
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Gains/Pertes en cours</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;" class="${Fmt.pnlClass(totalPnL)}">${Fmt.signedCurrency(totalPnL)}</div>
        </div>
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:var(--space-8);">
      <div class="stat-card" style="cursor:pointer;" data-screen="opportunities">
        <div class="stat-label">Capital disponible</div>
        <div class="stat-value">${Fmt.currency(simCapNum)}</div>
        <div class="stat-change" style="color:var(--text-muted);">Simulation active</div>
      </div>
      <div class="stat-card" style="cursor:pointer;" data-screen="portefeuille">
        <div class="stat-label">Positions ouvertes</div>
        <div class="stat-value">${simPos.length + realPos.length}</div>
        <div class="stat-change" style="color:var(--text-muted);">${simPos.length} sim · ${realPos.length} réel</div>
      </div>
      <div class="stat-card" style="cursor:pointer;" data-screen="opportunities">
        <div class="stat-label">Opportunités</div>
        <div class="stat-value">${analysis.tradeable.length}</div>
        <div class="stat-change up">↑ Score ≥ ${settings.minScore}</div>
      </div>
      <div class="stat-card" id="alerts-stat-card" style="cursor:pointer;" data-screen="settings">
        <div class="stat-label">🔔 Alertes actives</div>
        <div class="stat-value">${alertStats.enabled}</div>
        <div class="stat-change" style="color:${alertStats.permission === 'granted' ? 'var(--profit)' : 'var(--text-muted)'};">
          ${alertStats.permission === 'granted' ? '● Notifs activées' : alertStats.permission === 'denied' ? '✗ Notifs bloquées' : '○ Cliquer pour activer'}
        </div>
      </div>
    </div>

    <div class="section-title">
      <span>État du marché</span>
      <span class="see-all-link" data-screen="opportunities">Voir tous les signaux →</span>
    </div>
    <div class="regime-row">
      <div class="regime-card"><div class="regime-icon">${regime.icon}</div><div><div class="regime-label">Régime global</div><div class="regime-value" style="color:${regime.color};">${regime.label}</div></div></div>
      <div class="regime-card"><div class="regime-icon">◎</div><div><div class="regime-label">Opportunités actifs</div><div class="regime-value">${analysis.tradeable.length} / ${analysis.all.length}</div></div></div>
      <div class="regime-card"><div class="regime-icon">◷</div><div><div class="regime-label">Score moyen</div><div class="regime-value">${regime.score}/100</div></div></div>
    </div>

    <div class="section-title" style="margin-top:var(--space-6);">
      <span>Top opportunités</span>
      <span class="see-all-link" data-screen="opportunities">Voir tout →</span>
    </div>
    ${top5.length === 0
      ? `<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-title">Aucune opportunité filtrée</div><div class="empty-desc">Marché peu favorable actuellement.</div></div>`
      : top5.map((a, i) => renderOpportunityRow(a, i + 1)).join('')
    }

    ${renderPepitesSection(analysis)}

    ${analysis.all.length === 0 || analysis.all.every(a => a.error) ? `
    <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:var(--card-radius);padding:var(--space-5);margin-top:var(--space-4);">
      <div style="font-weight:700;margin-bottom:var(--space-2);">⏳ Chargement des données réelles en cours...</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6;">
        L'app récupère les vrais prix depuis Binance, Twelve Data et Yahoo Finance.<br>
        Les opportunités apparaîtront dans quelques secondes.<br>
        Si rien n'apparaît, vérifiez vos clés API dans <strong>Réglages</strong>.
      </div>
    </div>` : ''}

    <!-- AlgoLearning summary -->
    ${(function() {
      const summary = AlgoLearning?.getSummary?.();
      if (!summary || summary.totalTrades < 3) return '';
      return '<div style=\"background:rgba(0,229,160,0.06);border:1px solid rgba(0,229,160,0.2);border-radius:var(--card-radius);padding:var(--space-4);margin-top:var(--space-4);\">' +
        '<div style=\"font-size:var(--text-xs);font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);\">' +
        '🧠 Ce que l\'algo a appris de vos ' + summary.totalTrades + ' trades</div>' +
        '<div style=\"font-size:var(--text-sm);color:var(--text-secondary);\">' +
        'Meilleur signal : <strong>' + (summary.bestSymbol || '—') + ' ' + (summary.bestDirection === 'long' ? '↑ Hausse' : '↓ Baisse') + '</strong>' +
        ' · Win rate : <strong style=\"color:var(--profit);\">' + (summary.bestWinRate || 0) + '%</strong>' +
        '</div>' +
        '</div>';
    })()}

    ${simPos.length > 0 ? `
      <div class="section-title" style="margin-top:var(--space-8);">
        <span>Positions ouvertes</span>
        <span class="see-all-link" data-screen="portefeuille">Tout voir →</span>
      </div>
      ${simPos.slice(0, 3).map(p => renderPositionCardMini(p)).join('')}
    ` : ''}

    <!-- Activité récente -->
    ${(function() {
      const history = Storage.getSimHistory().slice(0, 5);
      if (!history.length) return '';
      return '<div class=\"section-title\" style=\"margin-top:var(--space-8);\"><span>Activité récente</span></div>' +
        history.map(t => '<div style=\"display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-subtle);\">' +
          '<div style=\"display:flex;align-items:center;gap:var(--space-3);\">' +
          '<span style=\"font-size:1rem;\">' + (t.pnl > 0 ? '✅' : '❌') + '</span>' +
          '<div><div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;\">' + t.symbol + '</div>' +
          '<div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + Fmt.dateShort(t.closedAt) + ' · ' + (t.direction === 'long' ? '↑ Hausse' : '↓ Baisse') + '</div></div>' +
          '</div>' +
          '<div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;\" class=\"' + Fmt.pnlClass(t.pnl) + '\">' + Fmt.signedCurrency(t.pnl) + '</div>' +
          '</div>').join('');
    })()}

    <!-- Alertes optimales récentes -->
    ${(function() {
      const smartAlerts = SmartAlerts.getRecentAlerts().slice(0, 3);
      if (!smartAlerts.length) return '';
      return '<div class=\"section-title\" style=\"margin-top:var(--space-6);\"><span>🎯 Derniers signaux optimaux</span></div>' +
        '<div style=\"display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-6);\">' +
        smartAlerts.map(a => {
          const dir = a.direction === 'long' ? '↑ Hausse' : '↓ Baisse';
          const ago = Math.round((Date.now() - a.firedAt) / 60000);
          return '<div style=\"background:rgba(0,229,160,0.06);border:1px solid rgba(0,229,160,0.2);border-radius:var(--card-radius);padding:var(--space-4);display:flex;align-items:center;justify-content:space-between;\">' +
            '<div><div style=\"font-family:var(--font-mono);font-weight:700;\">' + a.symbol + ' ' + dir + '</div>' +
            '<div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + 'Il y a ' + ago + ' min · Score ' + a.score + '/100</div></div>' +
            '<div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--profit);\">' + 'R/R ' + a.rrRatio + ':1</div>' +
            '</div>';
        }).join('') + '</div>';
    })()}

    <div class="warning-box" style="margin-top:var(--space-8);">
      📊 ManiTradePro est un outil d'aide à la décision. Les scores et signaux ne constituent pas des conseils financiers.
    </div>`;
}

function _assetClassBadge(cls) {
  const map = { crypto:'CRYPTO', stock:'STOCK', forex:'FOREX', etf:'ETF', commodity:'OR' };
  const label = map[cls] || (cls||'').toUpperCase().slice(0,6);
  return `<span class="class-badge class-badge-${cls||'other'}">${label}</span>`;
}

function _trendArrow(change24h, direction) {
  // direction from signal; change24h as fallback
  const isUp = direction === 'long' ? true : direction === 'short' ? false : (change24h >= 0);
  const color = isUp ? 'var(--profit)' : 'var(--loss)';
  const arrow = isUp ? '↗' : '↘';
  return `<span class="trend-arrow" style="color:${color};font-size:1.4rem;font-weight:700;line-height:1;">${arrow}</span>`;
}

function renderOpportunityRow(a, rank) {
  // Unified component — same format as renderOppCard
  return renderOppCard(a, rank, a.isSolid, false, true);
}

function renderPositionCardMini(p) {
  const curr = window.__prices[p.symbol] || p.entryPrice;
  const pnl  = RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
  const pnlP = RiskCalculator.openPnLPct(p.entryPrice, curr, p.direction);
  return `
    <div class="position-card sim" style="cursor:pointer;" data-screen="portefeuille">
      <div class="position-header">
        <div class="position-asset">
          <div class="asset-icon">${Fmt.assetIcon(p.symbol)}</div>
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span class="asset-symbol">${p.symbol}</span>
              <span class="direction-tag ${p.direction}">${Fmt.directionLabel(p.direction)}</span>
              <span style="font-size:var(--text-xs);background:var(--sim-bg);color:var(--sim-color);padding:1px 6px;border-radius:4px;border:1px solid var(--sim-border);">SIM</span>
            </div>
            <div class="asset-name">${p.name} · ${Fmt.duration(p.openedAt)}</div>
          </div>
        </div>
        <div class="position-pnl" style="text-align:right;">
          <div class="pf-pnl-big ${Fmt.pnlClass(pnl)}" data-position-pnl="${p.id}">${Fmt.signedCurrency(pnl)}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:600;" class="${Fmt.pnlClass(pnlP)}" data-position-pnlpct="${p.id}">${Fmt.signedPct(pnlP)}</div>
        </div>
      </div>
    </div>`;
}

Router.register('dashboard', renderDashboard);

function _getFGData(val) {
  const d = {
    short: val <= 20 ? 'Marche domine par la peur. Ventes massives parfois irrationnelles.'
      : val <= 40 ? 'Sentiment negatif. Investisseurs reduisent leur exposition.'
      : val <= 60 ? 'Sentiment equilibre. Ni euphorie ni panique.'
      : val <= 80 ? 'Investisseurs optimistes. Exposition au risque en hausse.'
      : 'Marche en euphorie. Achats massifs, risque de surchauffe.',
    context: val <= 20 ? 'Historiquement proche des points bas. Confirmer avec signaux techniques.'
      : val <= 40 ? 'Peut preceder un rebond ou prolonger la baisse.'
      : val <= 60 ? 'Contexte favorable a une analyse rationnelle.'
      : val <= 80 ? 'Accompagne souvent les hausses saines. Surveiller valorisations.'
      : 'Precede souvent une correction. Reduire les positions.',
    caution: val <= 20 ? 'La peur extreme peut durer — ne pas confondre opportunite et chute libre.'
      : val <= 40 ? 'Attendre confirmation technique avant d agir.'
      : val <= 60 ? 'Bon contexte pour analyser sereinement.'
      : val <= 80 ? 'Ne pas sur-exposer. Gerer le risque avec discipline.'
      : 'Correction possible. Reduire exposition et rester prudent.',
  };
  return d;
}
// Fetch trending data async and update dashboard
async function _loadTrendingSection() {
  const section = document.getElementById('trending-section');
  if (!section) return;

  try {
    const raw = await TrendingEngine.fetchTrending();
    const data = TrendingEngine.enrichWithAlgo(raw);
    const fg = data.fearGreed;

    let html = '<div style="display:flex;flex-direction:column;gap:var(--space-3);">';

    // Fear & Greed
    if (fg) {
      const emoji = TrendingEngine.getFearGreedEmoji(fg.value);
      const label = TrendingEngine.getFearGreedLabel(fg.value);
      const color = TrendingEngine.getFearGreedColor(fg.value);
      const fgInfo = _getFGData(fg.value);
      const tip = '';
      const _fi = fgInfo;
      html += '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">'
        + '<div style="display:flex;align-items:center;gap:var(--space-3);">'
        + '<span style="font-size:1.8rem;">' + emoji + '</span>'
        + '<div><div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;">Fear & Greed Index</div>'
        + '<div style="font-size:var(--text-lg);font-weight:700;color:' + color + ';">' + label + '</div></div>'
        + '</div>'
        + '<div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:' + color + ';">' + fg.value + '<span style="font-size:var(--text-xs);color:var(--text-muted);">/100</span></div>'
        + '</div>'
        + '<div style="height:8px;background:linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#00e5a0);border-radius:4px;position:relative;margin-bottom:var(--space-2);">'
        + '<div style="position:absolute;top:50%;left:' + fg.value + '%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:white;border:3px solid ' + color + ';"></div>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--text-muted);margin-bottom:var(--space-4);">'
        + '<span>Peur extr.</span><span>Peur</span><span>Neutre</span><span>Cupidite</span><span>Cupi. extr.</span>'
        + '</div>'
        + '<div style="background:var(--bg-elevated);border-radius:8px;padding:var(--space-3);margin-bottom:var(--space-3);">'
        + '<div style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:600;margin-bottom:4px;">' + _fi.short + '</div>'
        + '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;line-height:1.5;">' + _fi.context + '</div>'
        + '<div style="font-size:var(--text-xs);font-weight:700;color:' + color + ';">' + _fi.caution + '</div>'
        + '</div>'
        + '<div style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.5;border-top:1px solid var(--border-subtle);padding-top:var(--space-2);">'
        + 'Indicateur de sentiment crypto base sur 7 facteurs. A combiner avec analyse technique — ce n\'est pas un signal d\'achat ou de vente.'
        + '</div>'
        + '</div>';
    }

    // Trending cryptos
    if (data.trending?.length > 0) {
      html += `<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-4);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">🔥 Cryptos tendance (CoinGecko)</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">
          ${data.trending.map(t => `
            <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--bg-elevated);border:1px solid ${t.inWatchlist ? 'var(--accent-glow)' : 'var(--border-subtle)'};border-radius:8px;padding:var(--space-2) var(--space-3);cursor:pointer;" ${t.inWatchlist ? `data-screen="asset-detail" data-symbol="${t.symbol}"` : ''}>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;">${t.symbol}</span>
              ${t.algoScore ? `<span style="font-size:0.65rem;font-weight:700;padding:1px 4px;border-radius:3px;background:${t.algoScore >= 70 ? 'rgba(0,229,160,0.15)' : 'rgba(245,166,35,0.15)'};color:${t.algoScore >= 70 ? 'var(--profit)' : 'var(--signal-medium)'};">${t.algoScore}</span>` : ''}
              ${!t.inWatchlist ? '<span style="font-size:0.6rem;color:var(--text-muted);">hors liste</span>' : ''}
            </div>`).join('')}
        </div>
      </div>`;
    }

    // Yahoo movers
    if (data.movers?.length > 0) {
      html += `<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-4);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">⚡ Actions qui bougent aujourd'hui</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          ${data.movers.map(m => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle);">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;">${m.symbol}</span>
                <span style="font-size:var(--text-xs);color:var(--text-muted);">${m.name}</span>
                ${m.inWatchlist ? '<span style="font-size:0.6rem;background:rgba(0,229,160,0.12);color:var(--profit);padding:1px 4px;border-radius:3px;">✓ Liste</span>' : ''}
              </div>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--profit);">+${m.change?.toFixed(1)}%</span>
            </div>`).join('')}
        </div>
      </div>`;
    }

    html += '</div>';
    section.innerHTML = html;

    // Attach click events
    section.querySelectorAll('[data-screen]').forEach(el => {
      el.addEventListener('click', () => {
        const s = el.dataset.screen, sym = el.dataset.symbol;
        if (s) window.__MTP.Router.navigate(s, sym ? { symbol: sym } : null);
      });
    });

  } catch(e) {
    const section = document.getElementById('trending-section');
    if (section) section.innerHTML = '';
  }
}

// ═══ opportunities.js ═══
function renderOpportunities() {
  const analysis = window.__MTP?.lastAnalysis || AnalysisEngine.analyzeAllSync();
  return `
    <div class="screen-header">
      <div class="screen-title">Opportunités</div>
      <div class="screen-subtitle">Actifs classés par score de confiance ajusté</div>
    </div>

    <!-- Recherche par symbole -->
    <div style="margin-bottom:var(--space-4);">
      <input type="text" id="opp-search" class="input-field" placeholder="🔍 Rechercher un actif (BTC, AAPL...)" style="width:100%;"/>
    </div>
    <div class="filter-row">
      <button class="filter-btn active" data-filter-group="class" data-filter="all">Tous (${analysis.all.length})</button>
      <button class="filter-btn" data-filter-group="class" data-filter="crypto">Crypto</button>
      <button class="filter-btn" data-filter-group="class" data-filter="stock">Actions</button>
      <button class="filter-btn" data-filter-group="class" data-filter="forex">Forex</button>
      <button class="filter-btn" data-filter-group="class" data-filter="commodity">Matières p.</button>
      <button class="filter-btn" data-filter-group="class" data-filter="etf">ETF</button>
    </div>

    ${analysis.tradeable.filter(a => a.isSolid).length > 0 ? `
      <div class="section-sep"><span class="sep-label">★ Trades solides</span><div class="sep-line"></div></div>
      ${analysis.tradeable.filter(a => a.isSolid).map((a, i) => renderOppCard(a, i + 1, true)).join('')}
    ` : ''}

    <div class="section-sep">
      <span class="sep-label">Opportunités actives (score ≥ ${Storage.getSettings().minScore})</span>
      <div class="sep-line"></div>
      <span style="font-size:var(--text-xs);color:var(--text-muted);">${analysis.tradeable.length} actif(s)</span>
    </div>
    <div id="opp-list">
      ${analysis.tradeable.length === 0
        ? `<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-title">Aucune opportunité validée</div><div class="empty-desc">Régime de marché défavorable ou score insuffisant.</div></div>`
        : analysis.tradeable.map((a, i) => renderOppCard(a, i + 1, false)).join('')
      }
    </div>

    ${renderPepitesSection(window.__MTP?.lastAnalysis, 5)}

    ${analysis.neutral.length > 0 ? `
      <div class="section-sep"><span class="sep-label">En observation</span><div class="sep-line"></div></div>
      ${analysis.neutral.map((a, i) => renderOppCard(a, i + 1, false, true)).join('')}
    ` : ''}

    <div class="section-sep"><span class="sep-label">Régime défavorable / signal absent</span><div class="sep-line"></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-8);">
      ${analysis.inactive.map(a => `<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;padding:var(--space-2) var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">${a.symbol}</div>`).join('')}
    </div>`;
}

function renderOppCard(a, rank, isSolid = false, isNeutral = false, compact = false) {
  // Always use real price from single source of truth
  const realPrice = getPriceForSymbol(a.symbol) || a.price;
  const priceAvailable = !!getPriceForSymbol(a.symbol);
  const displayPrice = realPrice;
  const change = Fmt.change(a.change24h);
  const slPct = a.stopLoss && displayPrice ? ((Math.abs(displayPrice - a.stopLoss) / displayPrice) * 100).toFixed(1) : null;
  const tpPct = a.takeProfit && displayPrice ? ((Math.abs(a.takeProfit - displayPrice) / displayPrice) * 100).toFixed(1) : null;
  const scoreColor = a.adjScore >= 70 ? 'var(--signal-strong)' : a.adjScore >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)';

  return `
    <div style="background:var(--bg-card);border:1px solid ${isSolid ? 'rgba(0,229,160,0.3)' : 'var(--border-subtle)'};border-radius:var(--card-radius);padding:var(--space-4);margin-bottom:var(--space-3);cursor:pointer;transition:all var(--transition-fast);"
      data-screen="asset-detail" data-symbol="${a.symbol}" data-asset-class="${a.assetClass || ''}">

      <!-- Ligne 1: Score + Symbole + Prix -->
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        ${UI.scoreRing(a.adjScore, 40)}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
            <span style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">${a.symbol}</span>
            <span style="font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:3px;background:${a.direction === 'long' ? 'rgba(0,229,160,0.12)' : 'rgba(224,90,90,0.12)'};color:${a.direction === 'long' ? 'var(--profit)' : 'var(--loss)'};">${a.direction === 'long' ? '↑ Long' : a.direction === 'short' ? '↓ Short' : '— Neutre'}</span>
            ${isSolid ? '<span style="font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(0,229,160,0.12);color:var(--profit);">★ Solide</span>' : ''}
            ${a.dataWarning ? '<span style="font-size:0.6rem;padding:1px 4px;border-radius:3px;background:var(--bg-elevated);color:var(--text-muted);">SIM</span>' : '<span style="font-size:0.6rem;padding:1px 4px;border-radius:3px;background:rgba(0,229,160,0.10);color:var(--profit);">LIVE</span>'}
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${a.name}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;color:${priceAvailable ? 'var(--text-primary)' : 'var(--text-muted)'}">${priceAvailable ? Fmt.price(displayPrice) : '⏳ Prix en cours...'}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:600;" class="${change.cls}">${change.text}</div>
          <div style="font-size:0.6rem;color:var(--text-muted);margin-top:1px;">🔄 <span data-countdown="${['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','DOT','LINK','DOGE','MATIC','UNI','ATOM','LTC','NEAR'].includes(a.symbol) ? 'crypto' : 'prices'}">--</span></div>
        </div>
      </div>

      <!-- Ligne 2: Barre SL → TP -->
      ${a.stopLoss && a.takeProfit ? `
      <div style="background:var(--bg-elevated);border-radius:6px;padding:var(--space-3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
          <span style="font-size:var(--text-xs);color:var(--loss);font-weight:700;">SL ${Fmt.price(a.stopLoss)}<span style="color:var(--text-muted);font-weight:400;"> -${slPct}%</span></span>
          <span style="font-size:0.65rem;color:var(--text-muted);font-weight:700;">R/R ${a.rrRatio}:1</span>
          <span style="font-size:var(--text-xs);color:var(--profit);font-weight:700;">TP ${Fmt.price(a.takeProfit)}<span style="color:var(--text-muted);font-weight:400;"> +${tpPct}%</span></span>
        </div>
        <div style="position:relative;height:5px;background:var(--border-subtle);border-radius:3px;">
          <div style="position:absolute;left:0;top:0;height:100%;width:100%;background:linear-gradient(90deg,rgba(224,90,90,0.4),rgba(0,229,160,0.4));border-radius:3px;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:9px;height:9px;border-radius:50%;background:var(--text-primary);border:2px solid var(--bg-card);"></div>
        </div>
      </div>` : ''}
    </div>`;
}

Router.register('opportunities', renderOpportunities);

// ═══ assetDetail.js ═══
function renderAssetDetail(params) {
  if (!params || !params.symbol) return `<div class="screen"><p>Actif non trouvé.</p></div>`;

  const { symbol } = params;
  const asset = MOCK_DATA.watchlist.find(a => a.symbol === symbol);
  if (!asset) return `<div class="screen"><p>Actif "${symbol}" non reconnu.</p></div>`;

  // ── SINGLE SOURCE OF TRUTH: real price only ──
  const realPrice = getPriceForSymbol(symbol);
  const priceAvailable = realPrice && realPrice > 0;
  // Trigger async price load if not available
  if (!priceAvailable) {
    setTimeout(async () => {
      try {
        const pd = await RealDataClient.getPrice(symbol);
        if (pd?.price > 0) {
          window.__prices[symbol] = pd.price;
          // Re-render only if still on this screen
          if (Router.getCurrent() === 'asset-detail') {
            Router.navigate('asset-detail', { symbol });
          }
        }
      } catch(e) {}
    }, 100);
  }

  // Use analysis cache if available (contains real price from last analysis run)
  const cached = window.__MTP?.lastAnalysis?.all?.find(a => a.symbol === symbol);

  // Always override with freshest real price
  if (cached && priceAvailable) cached.price = realPrice;

  const analysis = cached || {
    symbol, name: asset.name, assetClass: asset.class,
    price: realPrice || 0,
    change24h: 0,
    direction: 'neutral', adjScore: 0, score: 0,
    regime: { pass: false, reasons: [] }, indicators: {}, isSolid: false,
    stopLoss: null, takeProfit: null, rrRatio: 0,
    recommendation: priceAvailable ? 'Analyse en cours...' : 'Prix en cours de récupération...',
  };

  const displayPrice = realPrice || analysis.price || 0;
  const ind      = analysis.indicators || {};
  const change   = Fmt.change(analysis.change24h);
  const settings = Storage.getSettings();

  const _simCap = Storage.getSimCapital();
  const _capNum = typeof _simCap === 'object' ? (_simCap.current || _simCap.initial || 10000) : (parseFloat(_simCap) || 10000);

  // SL/TP based on real price — never on mock
  const stopLoss   = analysis.stopLoss   || (displayPrice > 0 ? displayPrice * 0.97 : null);
  const takeProfit = analysis.takeProfit || (displayPrice > 0 ? displayPrice * 1.06 : null);

  // Alertes déjà configurées pour cet actif
  const existingAlerts = Storage.getAlerts().filter(a => a.symbol === symbol && !a.autoCreated);
  const hasSignalAlert = existingAlerts.some(a => a.type === AlertManager.ALERT_TYPES.SIGNAL);

  return `
    <div class="back-btn" data-screen="opportunities">← Retour aux opportunités</div>

    <div class="asset-detail-header">
      <div class="asset-detail-name">
        <div class="asset-detail-icon">${Fmt.assetIcon(symbol)}</div>
        <div>
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
            <div class="asset-detail-title">${symbol}</div>
            ${analysis.isSolid ? '<span class="solid-badge">★ Trade Solide</span>' : ''}
            ${analysis.direction !== 'neutral'
              ? `<span class="direction-tag ${analysis.direction}">${Fmt.directionIcon(analysis.direction)} ${Fmt.directionLabel(analysis.direction)}</span>`
              : '<span style="font-size:var(--text-xs);color:var(--text-muted);">Signal neutre</span>'
            }
          </div>
          <div class="asset-detail-full">${asset.name} · ${asset.class?.toUpperCase()}</div>
          <div style="font-size:0.6rem;margin-top:2px;">${priceAvailable ? '<span style=\"color:var(--profit);\">● Prix en direct</span>' : '<span style=\"color:var(--signal-medium);">⏳ Chargement prix réel...</span>'}</div>
        </div>
      </div>
      <div class="asset-price-block">
        <div class="asset-price-main">${priceAvailable ? Fmt.price(displayPrice) : '⏳ Chargement...'}</div>
        <div class="asset-price-change ${change.cls}">${priceAvailable ? change.text + ' (24h)' : '— en attente'}</div>
      </div>
    </div>

    <div class="chart-container">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
        <span class="card-title">Évolution du prix (55 jours)</span>
        <span style="font-size:var(--text-xs);color:var(--text-muted);">Données de démonstration</span>
      </div>
      ${renderPriceChart(symbol)}
      <div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);flex-wrap:wrap;">
        ${ind.ema50  ? `<div class="indicator-chip ok"><span style="color:var(--accent);font-size:8px;">●</span> EMA 50 : ${Fmt.price(ind.ema50)}</div>` : ''}
        ${ind.ema100 ? `<div class="indicator-chip ok"><span style="color:#f5a623;font-size:8px;">●</span> EMA 100 : ${Fmt.price(ind.ema100)}</div>` : ''}
        ${ind.atr    ? `<div class="indicator-chip"><span style="color:var(--text-muted);font-size:8px;">●</span> ATR : ${Fmt.price(ind.atr)}</div>` : ''}
        ${ind.adx    ? `<div class="indicator-chip ${ind.adx > 20 ? 'ok' : 'warn'}">ADX : ${ind.adx.toFixed(1)}</div>` : ''}
        ${ind.rsi    ? `<div class="indicator-chip ${ind.rsi > 70 || ind.rsi < 30 ? 'warn' : 'ok'}">RSI : ${ind.rsi.toFixed(1)}</div>` : ''}
      </div>
    </div>

    <div class="score-panel">
      <div class="score-panel-top">
        ${UI.scoreRing(analysis.adjScore, 72)}
        <div class="score-summary">
          <div class="score-summary-title">Score ajusté : <span style="color:${analysis.adjScore >= 70 ? 'var(--signal-strong)' : analysis.adjScore >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)'};">${analysis.adjScore}/100</span></div>
          <div class="score-summary-desc">${analysis.recommendation}</div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;">
            <span class="risk-badge ${analysis.riskLevel}">Risque ${Fmt.riskLabel(analysis.riskLevel)}</span>
            ${analysis.rrRatio ? `<span class="score-badge ${analysis.adjScore >= 70 ? 'strong' : 'medium'}">R/R ${analysis.rrRatio}:1</span>` : ''}
          </div>
        </div>
      </div>
      <div class="confidence-bar">
        <div class="confidence-label"><span>Confiance du signal</span><span>${analysis.adjScore}%</span></div>
        <div class="confidence-track"><div class="confidence-fill ${analysis.adjScore >= 70 ? 'strong' : analysis.adjScore >= 50 ? 'medium' : 'weak'}" style="width:${analysis.adjScore}%;"></div></div>
      </div>
      <div style="margin-top:var(--space-5);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">Filtre de régime</div>
        ${(analysis.regime?.reasons || []).map(r => `
          <div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);margin-bottom:4px;">
            <span style="color:${r.pass ? 'var(--profit)' : 'var(--loss)'};">${r.pass ? '✓' : '✗'}</span>
            <span style="color:${r.pass ? 'var(--text-secondary)' : 'var(--text-muted)'};">${r.label}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Pourquoi cette opportunité -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <div class="card-header">
        <span class="card-title">💡 Pourquoi cette opportunité ?</span>
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;">
        ${(function() {
          const ind = analysis.indicators || {};
          const dir = analysis.direction;
          const lines = [];
          if (ind.adx > 25) lines.push('✅ <strong>Tendance forte</strong> — Le marché a une direction claire (ADX ' + ind.adx?.toFixed(0) + ')');
          else if (ind.adx > 20) lines.push('⚠️ <strong>Tendance modérée</strong> — Signal présent mais pas très fort');
          else lines.push('❌ <strong>Tendance faible</strong> — Marché sans direction claire');
          if (dir === 'long' ? ind.breakoutUp : ind.breakoutDown)
            lines.push('✅ <strong>Cassure confirmée</strong> — Le prix vient de dépasser un niveau clé sur 55 jours');
          if (dir === 'long' ? ind.mom3m > 5 : ind.mom3m < -5)
            lines.push('✅ <strong>Momentum favorable</strong> — Performance positive sur 3 mois');
          if (ind.rsi > 30 && ind.rsi < 70)
            lines.push('✅ <strong>RSI équilibré</strong> — Pas suracheté ni survendu (' + ind.rsi?.toFixed(0) + ')');
          else if (ind.rsi >= 70) lines.push('⚠️ <strong>RSI élevé</strong> — Actif potentiellement suracheté');
          else lines.push('⚠️ <strong>RSI bas</strong> — Actif potentiellement survendu');
          if (ind.vol20 < 30) lines.push('✅ <strong>Volatilité normale</strong> — Risque maîtrisable');
          else lines.push('⚠️ <strong>Volatilité élevée</strong> — Mouvements brusques possibles');
          if (ind.macd?.bullishCross && dir === 'long') lines.push('✅ <strong>MACD croisé à la hausse</strong> — Signal technique supplémentaire');
          if (ind.ichimoku?.bullish && dir === 'long') lines.push('✅ <strong>Au-dessus du nuage Ichimoku</strong> — Tendance haussière confirmée');
          if (ind.candles?.bullish && dir === 'long') lines.push('✅ <strong>Pattern de retournement haussier</strong> — Chandeliers favorables');
          return lines.map(l => '<div style=\"margin-bottom:4px;\">' + l + '</div>').join('');
        })()}
      </div>

      <!-- Style de setup + Horizon + Conditions de prudence -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--border-subtle);">
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">
            Style de setup ${tooltip('?', 'Le type de stratégie utilisée pour ce signal')}
          </div>
          <div style="font-size:var(--text-sm);font-weight:700;">
            ${(function() {
              const ind = analysis.indicators || {};
              if (ind.breakoutUp || ind.breakoutDown) return '🚀 Cassure de niveau';
              if (ind.adx > 25 && (ind.slope100 > 0.05 || ind.slope100 < -0.05)) return '📈 Suivi de tendance';
              if (ind.macd?.bullishCross || ind.macd?.bearishCross) return '⚡ Signal MACD';
              if (ind.ichimoku?.bullish || ind.ichimoku?.bearish) return '☁️ Ichimoku';
              return '🔍 Multi-critères';
            })()}
          </div>
        </div>
        <div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">
            Horizon estimé ${tooltip('?', 'Durée approximative pendant laquelle ce signal reste valide')}
          </div>
          <div style="font-size:var(--text-sm);font-weight:700;">
            ${(function() {
              const ind = analysis.indicators || {};
              if (ind.vol20 > 40) return '⚡ Court terme (1-5 jours)';
              if (ind.adx > 30) return '📅 Moyen terme (1-3 semaines)';
              return '🗓️ Moyen/Long terme (2-6 semaines)';
            })()}
          </div>
        </div>
      </div>

      <!-- Conditions de prudence -->
      <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--border-subtle);">
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);">
          ⚠️ Conditions qui invalideraient ce signal ${tooltip('?', 'Si ces evenements se produisent, le signal n\'est plus valide')}
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.8;">
          ${(function() {
            const ind = analysis.indicators || {};
            const dir = analysis.direction;
            const conditions = [];
            conditions.push('\u2022 Prix passe sous le stop-loss (' + Fmt.price(analysis.stopLoss) + ')');
            if (ind.adx > 20) conditions.push('\u2022 ADX repasse sous 20 (tendance s affaiblit)');
            if (dir === 'long') conditions.push('\u2022 EMA 50 repasse sous EMA 100 (tendance inversee)');
            else conditions.push('\u2022 EMA 50 repasse au-dessus de EMA 100 (tendance inversee)');
            conditions.push('\u2022 Volume chute significativement (< 0.7x la moyenne)');
            return conditions.join('<br>');
          })()}
        </div>
      </div>
    </div>

    <!-- Recommandation textuelle -->
    <div style="background:${analysis.adjScore >= 70 ? 'rgba(0,229,160,0.06)' : analysis.adjScore >= 50 ? 'rgba(245,166,35,0.06)' : 'rgba(224,90,90,0.06)'};border:1px solid ${analysis.adjScore >= 70 ? 'rgba(0,229,160,0.2)' : analysis.adjScore >= 50 ? 'rgba(245,166,35,0.2)' : 'rgba(224,90,90,0.2)'};border-radius:var(--card-radius);padding:var(--space-4);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-2);">
        ${analysis.adjScore >= 70 ? '🟢 Très solide' : analysis.adjScore >= 60 ? '🟡 Solide mais à surveiller' : analysis.adjScore >= 50 ? '🟠 Intéressant mais prudence' : analysis.adjScore >= 35 ? '🔴 Trop fragile' : '⛔ À éviter'}
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);">${analysis.recommendation}</div>
    </div>

    ${analysis.confidence?.criteria?.length > 0 ? `
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><span class="card-title">Détail des critères</span><span style="font-size:var(--text-xs);color:var(--text-muted);">Score brut : ${analysis.confidence.rawScore}/${analysis.confidence.maxScore}</span></div>
        <div class="criteria-list">
          ${analysis.confidence.criteria.map(c => `
            <div class="criteria-item">
              <div><div class="criteria-name">${c.label}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${c.description}</div></div>
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <span class="criteria-pts">${c.earned}/${c.max} pts</span>
                <span class="criteria-result ${c.pass ? 'pass' : c.partial ? 'partial' : 'fail'}">${c.pass ? '✓' : c.partial ? '~' : '✗'}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>
    ` : ''}

    <div class="card" style="margin-bottom:var(--space-5);">
      <div class="card-header"><span class="card-title">Niveaux clés suggérés</span></div>
      <div class="grid-3">
        <div><div class="stat-label">Prix actuel (live)</div><div class="stat-value">${priceAvailable ? Fmt.price(displayPrice) : '⏳ Chargement'}</div></div>
        <div><div class="stat-label">Stop-loss (2×ATR)</div><div class="stat-value" style="color:var(--loss);">${stopLoss ? Fmt.price(stopLoss) : '—'}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${stopLoss && displayPrice > 0 ? '-' + ((Math.abs(displayPrice - stopLoss) / displayPrice) * 100).toFixed(1) + '%' : ''}</div></div>
        <div><div class="stat-label">Take profit (R/R 2.5)</div><div class="stat-value" style="color:var(--profit);">${takeProfit ? Fmt.price(takeProfit) : '—'}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">${takeProfit && displayPrice > 0 ? '+' + ((Math.abs(takeProfit - displayPrice) / displayPrice) * 100).toFixed(1) + '%' : ''}</div></div>
      </div>
    </div>

    <!-- ═══ ALERTES — Section par actif ═══ -->
    <div class="section-sep"><span class="sep-label">🔔 Alertes pour ${symbol}</span><div class="sep-line"></div></div>
    <div class="card" style="margin-bottom:var(--space-5);" id="asset-alerts-card">
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">

        <!-- Alerte signal -->
        <div class="alert-row">
          <div>
            <div class="alert-row-title">Alerte signal détecté</div>
            <div class="alert-row-desc">Notifié quand le score ≥ seuil et signal présent</div>
          </div>
          <button class="btn ${hasSignalAlert ? 'btn-ghost' : 'btn-primary'} btn-sm" id="btn-add-signal-alert" data-symbol="${symbol}">
            ${hasSignalAlert ? '✓ Configurée' : '+ Ajouter'}
          </button>
        </div>

        <!-- Alerte prix manuel -->
        <div class="alert-row" style="flex-wrap:wrap;gap:var(--space-3);">
          <div style="flex:1;">
            <div class="alert-row-title">Alerte prix manuel</div>
            <div class="alert-row-desc">Définir un seuil de prix à surveiller</div>
          </div>
          <div style="display:flex;gap:var(--space-2);align-items:center;">
            <input type="number" id="alert-price-input" class="input-field" style="width:120px;padding:6px 10px;"
              placeholder="${priceAvailable ? Fmt.price(displayPrice) : '—'}" value="${displayPrice > 0 ? displayPrice.toFixed(displayPrice > 100 ? 2 : 4) : ''}" step="${displayPrice > 100 ? 1 : 0.0001}"/>
            <select id="alert-price-dir" class="input-field" style="width:90px;padding:6px 8px;">
              <option value="up">↑ Hausse</option>
              <option value="down">↓ Baisse</option>
            </select>
            <button class="btn btn-primary btn-sm" id="btn-add-price-alert" data-symbol="${symbol}">+ Ajouter</button>
          </div>
        </div>

        <!-- Alertes existantes -->
        ${existingAlerts.length > 0 ? `
          <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-3);margin-top:var(--space-2);">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">Alertes configurées pour ${symbol}</div>
            ${existingAlerts.map(a => renderAlertRow(a)).join('')}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Prendre une position -->
    <div class="section-sep"><span class="sep-label">Prendre une position</span><div class="sep-line"></div></div>
    <div class="order-zones">
      <!-- Analyse timing optimal -->
      ${(function() {
        const timing = RiskCalculator.isOptimalTiming(symbol, analysis.assetClass);
        const check = SmartAlerts._allFactorsGreen(analysis);
        const optSL = RiskCalculator.optimalStop(analysis.price, analysis.indicators?.atr, analysis.direction, analysis.indicators);
        const rrRatio = RiskCalculator.dynamicRR(analysis.adjScore);
        const optTP = RiskCalculator.takeProfitEstimate(analysis.price, optSL, analysis.direction, rrRatio);
        const sizing = RiskCalculator.optimalPositionSize(_capNum, settings.riskPerTrade, analysis.price, optSL, analysis.indicators?.atrPct || 2);

        const allGreen = check.green;
        const bg = allGreen ? 'rgba(0,229,160,0.06)' : 'rgba(245,166,35,0.06)';
        const border = allGreen ? 'rgba(0,229,160,0.2)' : 'rgba(245,166,35,0.2)';

        return '<div style=\"background:' + bg + ';border:1px solid ' + border + ';border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);\">' +
          '<div style=\"font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-4);\">' +
          (allGreen ? '🟢 Tous les facteurs au vert — Moment optimal' : '🟡 Conditions partiellement remplies') + '</div>' +
          '<div style=\"display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4);\">' +
          check.reasons.map(r => '<div style=\"font-size:var(--text-xs);color:var(--text-secondary);\">' + r + '</div>').join('') +
          check.issues.map(r => '<div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + r + '</div>').join('') +
          '</div>' +
          '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);padding:var(--space-3);background:var(--bg-elevated);border-radius:8px;margin-bottom:var(--space-4);\">' +
          '<div style=\"text-align:center;\"><div style=\"font-size:0.65rem;color:var(--text-muted);\">' + 'SL OPTIMAL' + '</div><div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--loss);\">' + Fmt.price(optSL) + '</div></div>' +
          '<div style=\"text-align:center;\"><div style=\"font-size:0.65rem;color:var(--text-muted);\">' + 'R/R' + '</div><div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--signal-medium);\">' + rrRatio + ':1</div></div>' +
          '<div style=\"text-align:center;\"><div style=\"font-size:0.65rem;color:var(--text-muted);\">' + 'TP OPTIMAL' + '</div><div style=\"font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--profit);\">' + Fmt.price(optTP) + '</div></div>' +
          '</div>' +
          (sizing ? '<div style=\"font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);\">' +
          'Position recommandée : ' + Fmt.currency(sizing.invested) + ' · Risque réel : ' + Fmt.currency(sizing.riskAmount) + '</div>' : '') +
          '</div>';
      })()}

      <!-- Trade d'entraînement -->
      <div class="mode-zone sim-zone">
        <div class="mode-zone-title">🎯 Trade d'entraînement</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.6;">
          Capital disponible : <strong>${Fmt.currency(_capNum)}</strong><br/>
          Risque par trade : ${(settings.riskPerTrade * 100).toFixed(2)}% = ${Fmt.currency(_capNum * settings.riskPerTrade)}
        </div>
        ${analysis.direction !== 'neutral' ? `
          <button class="btn btn-sim btn-block" id="btn-open-sim" data-open-position="${symbol}" data-mode="sim">
            🎯 Ouvrir un trade d'entraînement
          </button>` : `
          <button class="btn btn-ghost btn-block" disabled>Signal neutre — attendre</button>`
        }
      </div>

      <!-- Trader maintenant (brokers réels) -->
      <div class="mode-zone" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);">
        <div style="font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-4);">💰 Trader maintenant</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          ${['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','DOT','LINK','DOGE','MATIC','UNI','ATOM','LTC','NEAR','GOLD','EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD'].includes(symbol) ? `
          <a href="https://www.binance.com/fr/trade/${{
            'BTC':'BTC_USDT','ETH':'ETH_USDT','SOL':'SOL_USDT','BNB':'BNB_USDT',
            'XRP':'XRP_USDT','ADA':'ADA_USDT','AVAX':'AVAX_USDT','DOT':'DOT_USDT',
            'LINK':'LINK_USDT','DOGE':'DOGE_USDT','MATIC':'MATIC_USDT','UNI':'UNI_USDT',
            'ATOM':'ATOM_USDT','LTC':'LTC_USDT','NEAR':'NEAR_USDT',
            'GOLD':'XAU_USDT','EURUSD':'EUR_USDT','GBPUSD':'GBP_USDT',
            'USDJPY':'USD_JPY','USDCHF':'USD_CHF','AUDUSD':'AUD_USDT',
          }[symbol]}" target="_blank" rel="noopener"
            style="display:flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.3);border-radius:var(--btn-radius);color:var(--sim-color);font-size:var(--text-sm);font-weight:600;text-decoration:none;">
            🟡 Ouvrir sur Binance
          </a>` : ''}
          <button id="btn-tr-open-${symbol}"
            style="display:flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.25);border-radius:var(--btn-radius);color:var(--accent);font-size:var(--text-sm);font-weight:600;cursor:pointer;">
            🟢 Trader sur Trade Republic
          </button>
        </div>
      </div>
    </div>



    <div class="warning-box" style="margin-top:var(--space-5);">
      ⚠️ Ce score est une suggestion algorithmique. Il ne constitue pas un conseil financier.
    </div>`;
}

// ── Rendu d'une ligne d'alerte
function renderAlertRow(a) {
  const typeLabels = {
    signal:    '📊 Signal score ≥ ' + (a.scoreThreshold || 60),
    price_up:  '↑ Prix ≥ ' + Fmt.price(a.targetPrice),
    price_down:'↓ Prix ≤ ' + Fmt.price(a.targetPrice),
    stop_near: '⚠️ Stop proche ' + Fmt.price(a.stopPrice),
    tp_hit:    '🎯 TP atteint ' + Fmt.price(a.tpPrice),
  };
  const label = typeLabels[a.type] || a.type;
  return `
    <div class="alert-item" id="alert-${a.id}">
      <div style="display:flex;align-items:center;gap:var(--space-2);flex:1;">
        <span class="alert-dot ${a.enabled ? 'alert-dot-on' : 'alert-dot-off'}"></span>
        <span style="font-size:var(--text-xs);color:var(--text-secondary);">${label}</span>
        ${a.firedCount > 0 ? `<span style="font-size:var(--text-xs);color:var(--text-muted);">(déclenchée ${a.firedCount}×)</span>` : ''}
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-ghost btn-xs" data-toggle-alert="${a.id}">${a.enabled ? 'Pause' : 'Reprendre'}</button>
        <button class="btn btn-ghost btn-xs" style="color:var(--loss);" data-delete-alert="${a.id}">✕</button>
      </div>
    </div>`;
}

function renderPriceChart(symbol) {
  const candles = window.__ohlcCache?.[symbol];
  if (!candles || candles.length < 5) return '<div style="height:120px;background:var(--bg-elevated);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);color:var(--text-muted);">⏳ Graphique en cours de chargement...</div>';
  const closes = candles.map(c => c.close);
  const min = closes.reduce(function(a,b){return a<b?a:b;}), max = closes.reduce(function(a,b){return a>b?a:b;}), range = max - min || 1;
  const W = 600, H = 120;
  const pts = closes.map((v, i) => `${(i / (closes.length - 1)) * W},${H - ((v - min) / range) * (H - 10) - 5}`).join(' ');
  const color = closes[closes.length - 1] >= closes[0] ? 'var(--profit)' : 'var(--loss)';
  return `
    <div style="position:relative;overflow:hidden;border-radius:8px;background:var(--bg-elevated);">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:120px;display:block;">
        <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#chartGrad)"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
      </svg>
      <div style="position:absolute;top:var(--space-2);left:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);">${Fmt.price(min)}</div>
      <div style="position:absolute;top:var(--space-2);right:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);">${Fmt.price(max)}</div>
    </div>`;
}

// ── Événements asset-detail (bouton sim + alertes)
document.addEventListener('click', async e => {

  // Bouton Trade Republic — copie le symbole + ouvre l'app
  const trBtn = e.target.closest('[id^="btn-tr-open-"]');
  if (trBtn) {
    const sym = trBtn.id.replace('btn-tr-open-', '');
    const trUrl = 'https://app.traderepublic.com/instrument/' + sym;
    try {
      await navigator.clipboard.writeText(sym);
      UI.toast('📋 ' + sym + ' copié — collez dans Trade Republic', 'success');
    } catch(err) {
      UI.toast('Ouverture Trade Republic...', 'info');
    }
    window.open(trUrl, '_blank');
    return;
  }

  // Bouton open sim
  const simBtn = e.target.closest('#btn-open-sim');
  if (simBtn) {
    const symbol   = simBtn.dataset.openPosition;
    const cached   = window.__MTP?.lastAnalysis?.all?.find(a => a.symbol === symbol);
    const analysis = cached || { symbol, direction: 'neutral', adjScore: 0, regime: { pass: false, reasons: [] }, indicators: {} };
    const order    = await UI.openOrderModal(symbol, 'sim', analysis);
    if (!order) return;
    const result = await BrokerAdapter.placeOrder(order, 'sim');
    if (result.success) {
      // Auto-créer alertes stop/tp pour cette position
      AlertManager.syncPositionAlerts();
      // Request push notification permission on first trade
      if (AlertManager.getStats().permission === 'default') {
        AlertManager.requestPermission().then(ok => {
          if (ok) UI.toast('🔔 Notifications activées — vous serez alerté sur vos trades', 'success');
        });
      }
      UI.toast(`Trade ouvert sur ${symbol} — ${Fmt.currency(result.position.invested)} engagé`, 'success');
      Router.navigate('positions');
    } else {
      UI.toast('Erreur : ' + result.error, 'error');
    }
    return;
  }

  // Bouton alerte signal
  const signalAlertBtn = e.target.closest('#btn-add-signal-alert');
  if (signalAlertBtn) {
    const symbol = signalAlertBtn.dataset.symbol;
    const ok = await AlertManager.requestPermission();
    if (!ok) { UI.toast('Notifications refusées — alertes in-app uniquement', 'warning'); }
    const existing = Storage.getAlerts().find(a => a.symbol === symbol && a.type === AlertManager.ALERT_TYPES.SIGNAL && !a.autoCreated);
    if (existing) {
      AlertManager.deleteAlert(existing.id);
      signalAlertBtn.textContent = '+ Ajouter';
      signalAlertBtn.className = signalAlertBtn.className.replace('btn-ghost', 'btn-primary');
      UI.toast(`Alerte signal ${symbol} supprimée`, 'info');
    } else {
      AlertManager.createAlert(AlertManager.ALERT_TYPES.SIGNAL, symbol, { scoreThreshold: 60 });
      signalAlertBtn.textContent = '✓ Configurée';
      signalAlertBtn.className = signalAlertBtn.className.replace('btn-primary', 'btn-ghost');
      UI.toast(`Alerte signal ${symbol} activée`, 'success');
    }
    return;
  }

  // Bouton alerte prix
  const priceAlertBtn = e.target.closest('#btn-add-price-alert');
  if (priceAlertBtn) {
    const symbol    = priceAlertBtn.dataset.symbol;
    const priceVal  = parseFloat(document.getElementById('alert-price-input')?.value);
    const direction = document.getElementById('alert-price-dir')?.value || 'up';
    if (!priceVal || isNaN(priceVal)) { UI.toast('Entrez un prix valide', 'error'); return; }
    const ok = await AlertManager.requestPermission();
    if (!ok) { UI.toast('Notifications refusées — alertes in-app uniquement', 'warning'); }
    const type = direction === 'up' ? AlertManager.ALERT_TYPES.PRICE_UP : AlertManager.ALERT_TYPES.PRICE_DOWN;
    AlertManager.createAlert(type, symbol, { targetPrice: priceVal });
    UI.toast(`Alerte prix ${symbol} ${direction === 'up' ? '↑' : '↓'} ${Fmt.price(priceVal)} créée`, 'success');
    // Refresh la section alertes
    const card = document.getElementById('asset-alerts-card');
    if (card) {
      const alerts = Storage.getAlerts().filter(a => a.symbol === symbol && !a.autoCreated);
      const existDiv = card.querySelector('[style*="border-top"]');
      const newHtml = `
        <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-3);margin-top:var(--space-2);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">Alertes configurées pour ${symbol}</div>
          ${alerts.map(a => renderAlertRow(a)).join('')}
        </div>`;
      if (existDiv) existDiv.outerHTML = newHtml;
      else card.querySelector('div > div').insertAdjacentHTML('beforeend', newHtml);
    }
    return;
  }

  // Toggle alerte
  const toggleBtn = e.target.closest('[data-toggle-alert]');
  if (toggleBtn) {
    const enabled = AlertManager.toggleAlert(toggleBtn.dataset.toggleAlert);
    toggleBtn.textContent = enabled ? 'Pause' : 'Reprendre';
    const dot = toggleBtn.closest('.alert-item')?.querySelector('.alert-dot');
    if (dot) { dot.classList.toggle('alert-dot-on', enabled); dot.classList.toggle('alert-dot-off', !enabled); }
    return;
  }

  // Supprimer alerte
  const deleteBtn = e.target.closest('[data-delete-alert]');
  if (deleteBtn) {
    AlertManager.deleteAlert(deleteBtn.dataset.deleteAlert);
    deleteBtn.closest('.alert-item')?.remove();
    UI.toast('Alerte supprimée', 'info');
    return;
  }
});

Router.register('asset-detail', renderAssetDetail);

// ═══ portefeuille.js — écran unifié Positions + Simulation ═══
function renderPortefeuille() {
  const screen = document.getElementById('screen-portefeuille');
  if (!screen) return;

  const settings   = Storage.getSettings();
  const simPos     = Storage.getSimPositions();
  const simHistory = Storage.getSimHistory();
  const realPos    = Storage.getRealPositions();
  const capital    = Storage.getSimCapital();

  const simWithPnl = simPos.map(p => _enrichPosition(p));
  const simTotalPnl = simWithPnl.reduce((acc, p) => acc + p.pnl, 0);
  const simCapNum   = typeof capital === 'object' ? (capital.current || capital.initial || 10000) : (parseFloat(capital) || 10000);
  const initialCapital = parseFloat(settings.simInitialCapital) || 10000;
  const stats       = _computeStats(capital, simHistory, simPos, settings);

  // Tab state
  const activeTab = window.__portfolioTab || 'positions';

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Mes trades</h1>
      <p class="screen-subtitle">Positions ouvertes · Historique · Statistiques</p>
    </div>

    <!-- HERO P&L -->
    <div class="pf-hero">
      <div class="pf-hero-left">
        <div class="pf-hero-label">P&L total en cours</div>
        <div class="pf-hero-pnl ${Fmt.pnlClass(simTotalPnl)}">${Fmt.signedCurrency(simTotalPnl)}</div>
        <div class="pf-hero-pct ${Fmt.pnlClass(stats.totalPnlPct)}">${Fmt.signedPct(stats.totalPnlPct)} depuis le début</div>
      </div>
      <div class="pf-hero-right">
        <div class="pf-stat-mini"><span class="pf-stat-mini-label">Capital dispo.</span><span class="pf-stat-mini-val">${Fmt.currency(simCapNum)}</span></div>
        <div class="pf-stat-mini"><span class="pf-stat-mini-label">Positions</span><span class="pf-stat-mini-val">${simWithPnl.length}</span></div>
        <div class="pf-stat-mini"><span class="pf-stat-mini-label">Win rate</span><span class="pf-stat-mini-val ${stats.winRate >= 50 ? 'positive' : 'negative'}">${Fmt.pct(stats.winRate)}</span></div>
      </div>
    </div>

    <!-- TABS -->
    <div class="pf-tabs">
      <button class="pf-tab ${activeTab === 'positions' ? 'active' : ''}" data-pftab="positions">
        <span>Positions ouvertes</span><span class="pf-tab-count">${simWithPnl.length + realPos.length}</span>
      </button>
      <button class="pf-tab ${activeTab === 'stats' ? 'active' : ''}" data-pftab="stats">
        <span>Historique & Stats</span><span class="pf-tab-count">${simHistory.length}</span>
      </button>
    </div>

    <!-- TAB: POSITIONS -->
    <div id="pftab-positions" style="${activeTab === 'positions' ? '' : 'display:none'}">
      ${simWithPnl.length === 0 && realPos.length === 0 ? `
        <div class="empty-state" style="margin-top:var(--space-6);">
          <div class="empty-icon">📊</div>
          <div class="empty-title">Aucune position ouverte</div>
          <div class="empty-desc">Ouvrez une position depuis la fiche d'un actif</div>
          <button class="btn btn-primary btn-sm" style="margin-top:var(--space-4);" data-screen="opportunities">Voir les opportunités</button>
        </div>
      ` : `
        ${simWithPnl.length > 0 ? `
          <div class="pf-section-label"><span class="sim-dot-label">⚡ SIMULATION</span><span>${simWithPnl.length} position(s) — Capital ${Fmt.currency(simCapNum)}</span></div>
          ${simWithPnl.map(p => _renderPortefeuilleCard(p, 'sim')).join('')}
        ` : ''}
        ${realPos.length > 0 ? `
          <div class="pf-section-label" style="margin-top:var(--space-6);"><span class="real-dot-label">⚠️ RÉEL</span></div>
          ${realPos.map(p => _enrichPosition(p)).map(p => _renderPortefeuilleCard(p, 'real')).join('')}
        ` : `
          <div class="card" style="margin-top:var(--space-5);border:1px dashed var(--real-border);background:var(--real-bg);padding:var(--space-5);">
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <span style="font-size:1.5rem;">🔗</span>
              <div>
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--real-color);">Mode réel — Aucun broker connecté</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">Connectez Binance dans les Paramètres pour activer le mode réel.</div>
              </div>
              <button class="btn btn-ghost btn-sm" style="margin-left:auto;" data-screen="settings">Configurer →</button>
            </div>
          </div>
        `}
      `}
    </div>

    <!-- TAB: HISTORIQUE & STATS -->
    <div id="pftab-stats" style="${activeTab === 'stats' ? '' : 'display:none'}">
      <!-- Stats grid -->
      <div class="pf-stats-grid">
        <div class="pf-stat-card"><span class="pf-stat-label">Trades clôturés</span><span class="pf-stat-value">${stats.totalTrades}</span></div>
        <div class="pf-stat-card"><span class="pf-stat-label">Win rate</span><span class="pf-stat-value ${stats.winRate >= 50 ? 'positive' : 'negative'}">${Fmt.pct(stats.winRate)}</span></div>
        <div class="pf-stat-card"><span class="pf-stat-label">Profit factor</span><span class="pf-stat-value ${stats.profitFactor >= 1.5 ? 'positive' : stats.profitFactor < 1 ? 'negative' : ''}">${stats.profitFactor.toFixed(2)}</span></div>
        <div class="pf-stat-card"><span class="pf-stat-label">Max drawdown</span><span class="pf-stat-value negative">${Fmt.signedPct(stats.maxDrawdownPct)}</span></div>
        <div class="pf-stat-card"><span class="pf-stat-label">Gain moyen</span><span class="pf-stat-value positive">${Fmt.currency(stats.avgWin)}</span></div>
        <div class="pf-stat-card"><span class="pf-stat-label">Perte moyenne</span><span class="pf-stat-value negative">${Fmt.currency(Math.abs(stats.avgLoss))}</span></div>
      </div>

      <!-- Equity curve -->
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><span class="card-title">Courbe de capital</span><span style="font-size:var(--text-xs);color:var(--text-muted);">Base : ${Fmt.currency(initialCapital)}</span></div>
        <div style="margin-top:var(--space-3);">${_renderEquityCurve(stats.equityCurve, initialCapital)}</div>
      </div>

      <!-- History -->
      ${simHistory.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Aucun trade clôturé</div></div>
      ` : `
        <div class="pf-history-header">
          <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);">Historique simulation (${simHistory.length})</span>
        </div>
        <div class="pf-history-list">
          ${simHistory.slice().reverse().map(t => _renderPfHistoryRow(t)).join('')}
        </div>
      `}

      <!-- Claude IA Analyse historique -->
      <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);" id="pf-ai-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div style="font-size:var(--text-xs);font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.1em;">🤖 Analyses IA disponibles</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          <button id="btn-ai-history" style="padding:var(--space-3);background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:var(--btn-radius);color:#8b5cf6;font-size:var(--text-sm);font-weight:600;cursor:pointer;text-align:left;">
            📈 Analyser mon historique de trades
          </button>
          <button id="btn-ai-coaching" style="padding:var(--space-3);background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:var(--btn-radius);color:#8b5cf6;font-size:var(--text-sm);font-weight:600;cursor:pointer;text-align:left;">
            🎯 Coaching personnalisé
          </button>
          <button id="btn-ai-bias" style="padding:var(--space-3);background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:var(--btn-radius);color:#8b5cf6;font-size:var(--text-sm);font-weight:600;cursor:pointer;text-align:left;">
            🧠 Détecter mes biais comportementaux
          </button>
        </div>
        <div id="pf-ai-result" style="display:none;margin-top:var(--space-4);padding:var(--space-4);background:var(--bg-elevated);border-radius:8px;font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;"></div>
      </div>

      <!-- Reset -->
      <div style="margin-top:var(--space-6);padding:var(--space-5);background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);">
        <button class="btn btn-ghost" style="color:var(--loss);width:100%;" id="btn-reset-sim-pf">🔄 Réinitialiser la simulation</button>
        <p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:var(--space-2);">Supprime positions et historique fictifs. Irréversible.</p>
      </div>
    </div>

    <div class="warning-box" style="margin-top:var(--space-6);">⚠️ Les positions réelles engagent votre capital. ManiTradePro est un outil d'aide à la décision uniquement.</div>`;

  _attachPortefeuilleEvents();
}


// ═══ Position Detail Screen ═══
function renderPositionDetail(posId) {
  const screen = document.getElementById('screen-portefeuille');
  if (!screen) return;

  // Find position in sim + real
  const allPos = [...Storage.getSimPositions(), ...Storage.getRealPositions()];
  const pos = allPos.find(p => p.id === posId);
  if (!pos) { renderPortefeuille(); return; }

  const enriched = _enrichPosition(pos);
  const mode     = pos.mode || 'sim';
  const isLong   = (pos.direction || '').toLowerCase() === 'long';
  const pnlCls   = Fmt.pnlClass(enriched.pnl);

  // Get analysis for this symbol
  const analysis = window.__MTP?.lastAnalysis?.all?.find(a => a.symbol === pos.symbol);
  // Use real price only — no mock fallback
  const realPosPrice = getPriceForSymbol(pos.symbol);
  const priceData = realPosPrice ? { price: realPosPrice, change24h: analysis?.change24h || 0 } : null;

  // Progress bar SL → current → TP
  let progress = 50, barHtml = '';
  if (pos.stopLoss && pos.takeProfit) {
    const range = Math.abs(pos.takeProfit - pos.stopLoss);
    progress = range > 0 ? Math.min(100, Math.max(0,
      isLong
        ? ((enriched.currentPrice - pos.stopLoss) / range) * 100
        : ((pos.stopLoss - enriched.currentPrice) / range) * 100
    )) : 50;
  }

  // Risk calculations
  const riskOnTrade   = pos.stopLoss ? Math.abs(pos.entryPrice - pos.stopLoss) * pos.quantity : 0;
  const rewardOnTrade = pos.takeProfit ? Math.abs(pos.takeProfit - pos.entryPrice) * pos.quantity : 0;
  const rrRatio       = riskOnTrade > 0 ? (rewardOnTrade / riskOnTrade).toFixed(1) : '—';
  const slDistPct     = pos.stopLoss ? ((Math.abs(enriched.currentPrice - pos.stopLoss) / enriched.currentPrice) * 100).toFixed(1) : '—';
  const tpDistPct     = pos.takeProfit ? ((Math.abs(pos.takeProfit - enriched.currentPrice) / enriched.currentPrice) * 100).toFixed(1) : '—';
  const stopWarn      = pos.stopLoss && parseFloat(slDistPct) < 3;

  // Duration
  const durationMs  = Date.now() - pos.openedAt;
  const durationDays = Math.floor(durationMs / 86400000);
  const durationHrs  = Math.floor((durationMs % 86400000) / 3600000);

  // Capital impact
  const simCap    = Storage.getSimCapital();
  const pctOfCap  = simCap > 0 ? ((pos.invested / (simCap + pos.invested)) * 100).toFixed(1) : '—';

  screen.innerHTML = `
    <!-- Back -->
    <div class="back-btn" id="btn-back-to-portfolio" style="cursor:pointer;display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-6);padding:var(--space-2) 0;">
      ← Retour au portefeuille
    </div>

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-6);">
      <div style="display:flex;align-items:center;gap:var(--space-4);">
        <div style="width:56px;height:56px;border-radius:14px;background:var(--bg-elevated);border:1px solid var(--border-medium);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;color:var(--accent);">${Fmt.assetIcon(pos.symbol)}</div>
        <div>
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
            <span style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;">${pos.symbol}</span>
            <span class="direction-tag ${pos.direction}">${Fmt.directionIcon(pos.direction)} ${Fmt.directionLabel(pos.direction)}</span>
            <span class="mode-badge-sm ${mode}">${mode === 'sim' ? 'SIM' : 'RÉEL'}</span>
            ${stopWarn ? '<span style="background:rgba(224,90,90,0.15);color:var(--loss);font-size:var(--text-xs);font-weight:700;padding:2px 8px;border-radius:4px;border:1px solid var(--real-border);">⚠️ STOP PROCHE</span>' : ''}
          </div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:2px;">${pos.name || pos.symbol} · Ouvert ${Fmt.duration(pos.openedAt)}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;">${Fmt.price(enriched.currentPrice)}</div>
        ${priceData ? `<div style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:600;" class="${Fmt.change(priceData.change24h).cls}">${Fmt.change(priceData.change24h).text} (24h)</div>` : ''}
      </div>
    </div>

    <!-- P&L Hero -->
    <div style="background:linear-gradient(135deg,var(--bg-card) 0%,var(--bg-elevated) 100%);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-6) var(--space-8);margin-bottom:var(--space-5);position:relative;overflow:hidden;">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:radial-gradient(circle,${enriched.pnl >= 0 ? 'rgba(0,229,160,0.12)' : 'rgba(224,90,90,0.10)'} 0%,transparent 70%);pointer-events:none;"></div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:var(--space-2);">P&L en cours</div>
      <div style="font-family:var(--font-mono);font-size:var(--text-4xl);font-weight:700;letter-spacing:-0.03em;" class="${pnlCls}" data-position-pnl="${pos.id}">${Fmt.signedCurrency(enriched.pnl)}</div>
      <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:600;margin-top:var(--space-2);" class="${pnlCls}" data-position-pnlpct="${pos.id}">${Fmt.signedPct(enriched.pnlPct)}</div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-3);">
        Depuis ${Fmt.date(pos.openedAt)} · ${durationDays}j ${durationHrs}h · ${Fmt.currency(pos.invested)} investi
      </div>
      <div style="font-size:var(--text-xs);color:var(--accent);margin-top:var(--space-2);">
        🔄 Prochain refresh crypto dans <span data-countdown="crypto">--</span> · prix dans <span data-countdown="prices">--</span>
      </div>
    </div>

    <!-- Barre SL → Actuel → TP -->
    ${pos.stopLoss && pos.takeProfit ? `
    <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">Progression du trade</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-3);">
        <div style="text-align:left;">
          <div style="font-size:var(--text-xs);color:var(--loss);font-weight:700;">🔴 Stop-loss</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;color:var(--loss);">${Fmt.price(pos.stopLoss)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">-${slDistPct}% du prix actuel</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;">◎ Entrée</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;">${Fmt.price(pos.entryPrice)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">prix d'entrée</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:var(--text-xs);color:var(--profit);font-weight:700;">🟢 Take profit</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:700;color:var(--profit);">${Fmt.price(pos.takeProfit)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">+${tpDistPct}% du prix actuel</div>
        </div>
      </div>
      <div style="position:relative;height:10px;background:var(--bg-elevated);border-radius:5px;overflow:visible;margin-top:var(--space-2);">
        <div style="position:absolute;top:0;left:0;height:100%;width:${progress}%;background:${enriched.pnl >= 0 ? 'linear-gradient(90deg,var(--bg-elevated),var(--profit))' : 'linear-gradient(90deg,var(--loss),var(--bg-elevated))'};border-radius:5px;transition:width 0.5s ease;"></div>
        <div style="position:absolute;top:50%;left:${progress}%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:var(--text-primary);border:2px solid var(--bg-card);z-index:2;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);">
        <span>Perte max : ${Fmt.currency(riskOnTrade)}</span>
        <span>Progression : ${progress.toFixed(0)}%</span>
        <span>Gain cible : ${Fmt.currency(rewardOnTrade)}</span>
      </div>
    </div>
    ` : ''}

    <!-- Grille détails complets -->
    <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">Détails du trade</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-5);">

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Prix d'entrée</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.price(pos.entryPrice)}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Prix actuel</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;" data-position-price="${pos.id}">${Fmt.price(enriched.currentPrice)}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Variation depuis entrée</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;" class="${pnlCls}">${Fmt.signedPct(enriched.pnlPct)}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Quantité</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.qty(pos.quantity, pos.symbol)}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Montant engagé</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.currency(pos.invested)}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">% du capital</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${pctOfCap}%</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Ratio R/R</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;color:${parseFloat(rrRatio) >= 2 ? 'var(--profit)' : 'var(--signal-medium)'};">${rrRatio}:1</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Durée</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${durationDays > 0 ? durationDays + 'j ' + durationHrs + 'h' : durationHrs + 'h'}</div></div>

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Ouvert le</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:700;">${Fmt.date(pos.openedAt)}</div></div>
      </div>
    </div>

    <!-- Risque actuel -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-5);">
      <div style="background:rgba(224,90,90,0.06);border:1px solid var(--real-border);border-radius:var(--card-radius);padding:var(--space-4);">
        <div style="font-size:var(--text-xs);color:var(--loss);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">🔴 Risque</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--loss);">${pos.stopLoss ? Fmt.price(pos.stopLoss) : '—'}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">Stop-loss · perte max ${Fmt.currency(riskOnTrade)}</div>
        ${stopWarn ? '<div style="font-size:var(--text-xs);color:var(--loss);font-weight:700;margin-top:var(--space-2);">⚠️ À moins de 3% du prix actuel !</div>' : `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">Distance : ${slDistPct}%</div>`}
      </div>
      <div style="background:rgba(0,229,160,0.06);border:1px solid var(--accent-glow);border-radius:var(--card-radius);padding:var(--space-4);">
        <div style="font-size:var(--text-xs);color:var(--profit);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">🟢 Objectif</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--profit);">${pos.takeProfit ? Fmt.price(pos.takeProfit) : '—'}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">Take profit · gain cible ${Fmt.currency(rewardOnTrade)}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">Distance : ${tpDistPct}%</div>
      </div>
    </div>

    <!-- Score algo + Multi-timeframe -->
    ${analysis ? `
    <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">Analyse algo actuelle</div>
      <div style="display:flex;align-items:center;gap:var(--space-5);">
        ${UI.scoreRing(analysis.adjScore, 56)}
        <div style="flex:1;">
          <div style="font-size:var(--text-md);font-weight:700;margin-bottom:var(--space-2);">Score : <span style="color:${analysis.adjScore >= 70 ? 'var(--signal-strong)' : analysis.adjScore >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)'};">${analysis.adjScore}/100</span></div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.5;">${analysis.recommendation || ''}</div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;">
            <span class="risk-badge ${analysis.riskLevel}">Prudence ${Fmt.riskLabel(analysis.riskLevel)}</span>
            <span class="direction-tag ${analysis.direction}">${Fmt.directionIcon(analysis.direction)} ${Fmt.directionLabel(analysis.direction)}</span>
          </div>
        </div>
      </div>

      <!-- Multi-timeframe -->
      ${(function() {
        const mtf = window.__MTP?.mtfData?.[pos.symbol];
        if (!mtf) return '<div style=\"font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-subtle);\">' +
          '⏳ Analyse multi-timeframe en cours (1h · 4h)...</div>';
        const alignColor = mtf.alignment === 'bullish' ? 'var(--profit)' : mtf.alignment === 'bearish' ? 'var(--loss)' : 'var(--signal-medium)';
        const alignLabel = mtf.alignment === 'bullish' ? '↑ Alignement haussier' : mtf.alignment === 'bearish' ? '↓ Alignement baissier' : '↔ Signal mixte';
        return '<div style=\"margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-subtle);\">' +
          '<div style=\"font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);\">' +
          'MULTI-TIMEFRAME</div>' +
          '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);\">' +
          '<div style=\"text-align:center;background:var(--bg-elevated);border-radius:8px;padding:var(--space-3);\">' +
          '<div style=\"font-size:0.65rem;color:var(--text-muted);\">' + '1H' + '</div>' +
          '<div style=\"font-size:var(--text-sm);font-weight:700;color:' + (mtf.h1?.trend === 'up' ? 'var(--profit)' : 'var(--loss)') + ';\">' +
          (mtf.h1 ? (mtf.h1.trend === 'up' ? '↑' : '↓') : '—') + '</div>' +
          '<div style=\"font-size:0.6rem;color:var(--text-muted);\">' + (mtf.h1 ? 'RSI ' + mtf.h1.rsi?.toFixed(0) : '—') + '</div>' +
          '</div>' +
          '<div style=\"text-align:center;background:var(--bg-elevated);border-radius:8px;padding:var(--space-3);\">' +
          '<div style=\"font-size:0.65rem;color:var(--text-muted);\">' + '4H' + '</div>' +
          '<div style=\"font-size:var(--text-sm);font-weight:700;color:' + (mtf.h4?.trend === 'up' ? 'var(--profit)' : 'var(--loss)') + ';\">' +
          (mtf.h4 ? (mtf.h4.trend === 'up' ? '↑' : '↓') : '—') + '</div>' +
          '<div style=\"font-size:0.6rem;color:var(--text-muted);\">' + (mtf.h4 ? 'RSI ' + mtf.h4.rsi?.toFixed(0) : '—') + '</div>' +
          '</div>' +
          '<div style=\"text-align:center;background:var(--bg-elevated);border-radius:8px;padding:var(--space-3);\">' +
          '<div style=\"font-size:0.65rem;color:var(--text-muted);\">' + 'SIGNAL' + '</div>' +
          '<div style=\"font-size:var(--text-xs);font-weight:700;color:' + alignColor + ';\">' + alignLabel + '</div>' +
          '<div style=\"font-size:0.6rem;color:var(--text-muted);\">' + mtf.alignmentScore?.toFixed(0) + '% aligné</div>' +
          '</div>' +
          '</div></div>';
      })()}
    </div>
    ` : ''}

    <!-- Actions -->
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
      <button class="btn btn-ghost" style="flex:1;" data-screen="asset-detail" data-symbol="${pos.symbol}">
        📊 Voir l'analyse complète
      </button>
      <button class="btn ${mode === 'real' ? 'btn-danger' : 'btn-sim'}" style="flex:1;" id="btn-close-from-detail" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
        ${mode === 'real' ? '🔴 Clôturer (RÉEL)' : '⬛ Fermer ce trade'}
      </button>
    </div>

    <div class="warning-box">
      ⚠️ ManiTradePro est un outil d'aide à la décision. Les niveaux suggérés ne constituent pas des conseils financiers.
    </div>
  `;

  // Events
  document.getElementById('btn-back-to-portfolio')?.addEventListener('click', () => {
    window.__portfolioTab = 'positions';
    renderPortefeuille();
  });

  document.getElementById('btn-close-from-detail')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-close-from-detail');
    const { mode, id, symbol } = btn.dataset;
    const ok = await UI.confirm(
      mode === 'real' ? '⚠️ Clôture RÉELLE' : 'Clôturer la position',
      mode === 'real'
        ? `Clôturer la position réelle sur ${symbol} ? Action IRRÉVERSIBLE.`
        : `Clôturer la position fictive sur ${symbol} ?`,
      mode === 'real'
    );
    if (!ok) return;
    const result = await BrokerAdapter.closePosition(id, mode);
    if (result.success) {
      UI.toast(`${symbol} clôturé — ${Fmt.signedCurrency(result.pnl)}`, result.pnl >= 0 ? 'success' : 'warning');
      window.__portfolioTab = 'positions';
      renderPortefeuille();
    } else {
      UI.toast(`Erreur : ${result.error}`, 'error');
    }
  });

  document.querySelectorAll('[data-screen]').forEach(el => {
    el.addEventListener('click', () => {
      const s = el.dataset.screen, sym = el.dataset.symbol;
      if (s) Router.navigate(s, sym ? { symbol: sym } : null);
    });
  });
}

function _renderPortefeuilleCard(pos, mode) {
  const pnlCls = Fmt.pnlClass(pos.pnl);
  const isLong = (pos.direction||'').toLowerCase() === 'long';
  const stopDistPct = pos.stopLoss ? Math.abs(pos.currentPrice - pos.stopLoss) / pos.currentPrice * 100 : null;
  const stopWarn = stopDistPct && stopDistPct < 3;

  // Stop/TP progress bar
  let barHtml = '';
  if (pos.stopLoss && pos.takeProfit && pos.entryPrice) {
    const range = Math.abs(pos.takeProfit - pos.stopLoss);
    const progress = range > 0 ? Math.min(100, Math.max(0,
      isLong
        ? ((pos.currentPrice - pos.stopLoss) / range) * 100
        : ((pos.stopLoss - pos.currentPrice) / range) * 100
    )) : 50;
    barHtml = `
      <div class="pf-stptp-bar-wrap">
        <div class="pf-stptp-labels">
          <span style="color:var(--loss);font-size:var(--text-xs);">SL ${Fmt.price(pos.stopLoss)}</span>
          <span style="font-size:var(--text-xs);color:var(--text-muted);">entrée ${Fmt.price(pos.entryPrice)}</span>
          <span style="color:var(--profit);font-size:var(--text-xs);">TP ${Fmt.price(pos.takeProfit)}</span>
        </div>
        <div class="pf-stptp-track">
          <div class="pf-stptp-fill ${pnlCls}" style="width:${progress}%;"></div>
          <div class="pf-stptp-cursor" style="left:${progress}%;"></div>
        </div>
      </div>`;
  }

  return `
    <div class="pf-card ${mode}-card ${stopWarn ? 'stop-warning' : ''}" data-id="${pos.id}" data-pos-detail="${pos.id}" style="cursor:pointer;" title="Cliquer pour voir le détail">
      <div class="pf-card-header">
        <div class="pf-card-left">
          <span class="asset-icon-sm">${Fmt.assetIcon(pos.symbol)}</span>
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span class="asset-symbol">${pos.symbol}</span>
              <span class="direction-tag ${pos.direction}">${Fmt.directionLabel(pos.direction)}</span>
              <span class="mode-badge-sm ${mode}">${mode === 'sim' ? 'SIM' : 'RÉEL'}</span>
            </div>
            <div class="asset-name">${pos.name || pos.symbol} · ${Fmt.duration(pos.openedAt)}</div>
          </div>
        </div>
        <div class="pf-card-pnl">
          <div class="pf-pnl-big ${pnlCls}" data-position-pnl="${pos.id}" style="font-size:clamp(var(--text-lg),4vw,var(--text-2xl));">${Fmt.signedCurrency(pos.pnl)}</div>
          <div class="pf-pnl-pct ${pnlCls}" data-position-pnlpct="${pos.id}">${Fmt.signedPct(pos.pnlPct)}</div>
        </div>
      </div>
      ${barHtml}
      <div class="pf-card-grid">
        <div class="pf-grid-item"><span class="pf-grid-label">Entrée</span><span>${Fmt.price(pos.entryPrice)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Actuel</span><span data-position-price="${pos.id}">${Fmt.price(pos.currentPrice)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Engagé</span><span>${Fmt.currency(pos.invested)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Quantité</span><span>${Fmt.qty(pos.quantity, pos.symbol)}</span></div>
      </div>
      ${stopWarn ? `<div class="stop-warning-bar">⚠️ Stop-loss à moins de 3% du prix actuel</div>` : ''}
      <div class="pf-card-actions">
        <button class="btn btn-ghost btn-sm" data-open-detail="${pos.symbol}">Analyse →</button>
        <button class="btn ${mode === 'real' ? 'btn-danger' : 'btn-sim'} btn-sm btn-close-pos" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
          ${mode === 'real' ? '🔴 Clôturer RÉEL' : '⬛ Fermer ce trade'}
        </button>
      </div>
    </div>`;
}

function _renderPfHistoryRow(t) {
  const dir = (t.direction||'').toLowerCase();
  return `
    <div class="pf-history-row ${t.pnl > 0 ? 'row-win' : 'row-loss'}">
      <div class="pf-history-main">
        <span class="asset-symbol" style="font-size:var(--text-sm);">${t.symbol}</span>
        <span class="direction-tag ${dir}" style="font-size:0.6rem;">${t.direction}</span>
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);">${Fmt.price(t.entryPrice)} → ${Fmt.price(t.exitPrice)}</div>
      <div class="pf-history-pnl ${Fmt.pnlClass(t.pnl)}">${Fmt.signedCurrency(t.pnl)}</div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);">${Fmt.dateShort(t.closedAt)}</div>
    </div>`;
}

function _attachPortefeuilleEvents() {
  // Click on card → detail
  document.querySelectorAll('[data-pos-detail]').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking a button inside the card
      if (e.target.closest('button')) return;
      const posId = card.dataset.posDetail;
      renderPositionDetail(posId);
    });
  });

  // Tab switch
  document.querySelectorAll('[data-pftab]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.__portfolioTab = btn.dataset.pftab;
      renderPortefeuille();
    });
  });
  // Navigate
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => { const s = btn.dataset.screen; if (s) Router.navigate(s); });
  });
  // Open detail
  document.querySelectorAll('[data-open-detail]').forEach(btn => {
    btn.addEventListener('click', () => Router.navigate('asset-detail', { symbol: btn.dataset.openDetail }));
  });
  // Close position
  document.querySelectorAll('.btn-close-pos').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { mode, id, symbol } = btn.dataset;
      const ok = await UI.confirm(
        mode === 'real' ? '⚠️ Clôture RÉELLE' : 'Clôturer la position',
        mode === 'real' ? `Clôturer la position réelle sur ${symbol} ? Action IRRÉVERSIBLE.` : `Clôturer la position fictive sur ${symbol} ?`,
        mode === 'real'
      );
      if (!ok) return;
      try {
        const result = await BrokerAdapter.closePosition(id, mode);
        if (result.success) {
          UI.toast(`${symbol} clôturé — ${Fmt.signedCurrency(result.pnl)}`, result.pnl >= 0 ? 'success' : 'warning');
          renderPortefeuille();
        } else {
          UI.toast(`Erreur : ${result.error}`, 'error');
        }
      } catch(err) { UI.toast(`Erreur : ${err.message}`, 'error'); }
    });
  });
  // AI buttons
  const _aiResult = document.getElementById('pf-ai-result');
  const _showAiResult = (text) => {
    if (!_aiResult) return;
    _aiResult.style.display = '';
    _aiResult.textContent = text;
  };

  document.getElementById('btn-ai-history')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-ai-history');
    btn.textContent = '⏳ Analyse en cours...'; btn.disabled = true;
    const history = Storage.getSimHistory();
    const result = await ClaudeAI.analyzeHistory(history);
    _showAiResult(result);
    btn.textContent = '📈 Analyser mon historique de trades'; btn.disabled = false;
  });

  document.getElementById('btn-ai-coaching')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-ai-coaching');
    btn.textContent = '⏳ En cours...'; btn.disabled = true;
    const capital = Storage.getSimCapital();
    const history = Storage.getSimHistory();
    const wins = history.filter(t => t.pnl > 0).length;
    const winRate = history.length > 0 ? Math.round(wins / history.length * 100) : 0;
    const result = await ClaudeAI.getCoaching(capital, history, winRate);
    _showAiResult(result);
    btn.textContent = '🎯 Coaching personnalisé'; btn.disabled = false;
  });

  document.getElementById('btn-ai-bias')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-ai-bias');
    btn.textContent = '⏳ Analyse en cours...'; btn.disabled = true;
    const history = Storage.getSimHistory();
    if (history.length < 3) { _showAiResult('Pas assez de trades pour detecter des biais (minimum 3).'); btn.textContent = '🧠 Détecter mes biais comportementaux'; btn.disabled = false; return; }
    const wins = history.filter(t => t.pnl > 0);
    const losses = history.filter(t => t.pnl <= 0);
    const avgWin = wins.length > 0 ? wins.reduce((s,t) => s + (t.pnlPct||0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s,t) => s + (t.pnlPct||0), 0) / losses.length : 0;
    const system = 'Tu es un psychologue du trading. Analyse ces donnees et identifie les biais cognitifs et comportementaux du trader. Sois direct et constructif. Maximum 4 biais identifies.';
    const prompt = 'Donnees trader:\nTrades: ' + history.length + '\nWin rate: ' + Math.round(wins.length/history.length*100) + '%\nGain moyen: +' + avgWin.toFixed(1) + '%\nPerte moyenne: ' + avgLoss.toFixed(1) + '%\nIdentifie les biais comportementaux et donne des conseils concrets pour les corriger.';
    const result = await ClaudeAI._ask ? ClaudeAI._ask(system, prompt, null) : await ClaudeAI.analyzeHistory(history);
    _showAiResult(result);
    btn.textContent = '🧠 Détecter mes biais comportementaux'; btn.disabled = false;
  });

  // Reset sim
  const resetBtn = document.getElementById('btn-reset-sim-pf');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await UI.confirm('Réinitialiser la simulation ?', 'Toutes les positions et l\'historique fictifs seront effacés.', true);
      if (!ok) return;
      const s = Storage.getSettings();
      Storage.saveSimCapital(s.simInitialCapital || 10000);
      Storage.saveSimPositions([]);
      Storage.saveSimHistory([]);
      UI.toast('Simulation réinitialisée', 'success');
      renderPortefeuille();
    });
  }
}

Router.register('portefeuille', () => { renderPortefeuille(); });
function _renderPositionCard(pos, mode) {
  const isLong = (pos.direction || '').toLowerCase() === 'long';
  const pnlCls = Fmt.pnlClass(pos.pnl);
  const stopDistPct = pos.stopLoss ? Math.abs(pos.currentPrice - pos.stopLoss) / pos.currentPrice * 100 : null;
  const stopWarn = stopDistPct && stopDistPct < 3;
  return `
    <div class="position-card ${mode}-card ${stopWarn ? 'stop-warning' : ''}" data-id="${pos.id}">
      <div class="position-header">
        <div class="position-left">
          <span class="asset-icon-sm">${Fmt.assetIcon(pos.symbol)}</span>
          <div class="position-meta">
            <span class="position-symbol">${pos.symbol}</span>
            <div class="position-badges">
              <span class="direction-badge ${isLong ? 'long' : 'short'}">${Fmt.directionLabel(pos.direction)}</span>
              <span class="mode-badge-sm ${mode}">${mode === 'sim' ? 'SIM' : 'RÉEL'}</span>
            </div>
          </div>
        </div>
        <div class="position-right">
          <span class="pnl-main ${pnlCls}">${Fmt.signedCurrency(pos.pnl)}</span>
          <span class="pnl-pct ${pnlCls}">${Fmt.signedPct(pos.pnlPct)}</span>
        </div>
      </div>
      <div class="position-grid">
        <div class="grid-item"><span class="grid-label">Entrée</span><span class="grid-value">${Fmt.price(pos.entryPrice)}</span></div>
        <div class="grid-item"><span class="grid-label">Actuel</span><span class="grid-value current-price" data-id="${pos.id}">${Fmt.price(pos.currentPrice)}</span></div>
        <div class="grid-item"><span class="grid-label">Quantité</span><span class="grid-value">${Fmt.qty(pos.quantity, pos.symbol)}</span></div>
        <div class="grid-item"><span class="grid-label">Engagé</span><span class="grid-value">${Fmt.currency(pos.invested)}</span></div>
        <div class="grid-item"><span class="grid-label">Stop-loss</span><span class="grid-value ${stopWarn ? 'stop-close' : ''}">${pos.stopLoss ? Fmt.price(pos.stopLoss) : '—'}</span></div>
        <div class="grid-item"><span class="grid-label">Take profit</span><span class="grid-value">${pos.takeProfit ? Fmt.price(pos.takeProfit) : '—'}</span></div>
        <div class="grid-item"><span class="grid-label">Durée</span><span class="grid-value">${Fmt.duration(pos.openedAt)}</span></div>
        <div class="grid-item"><span class="grid-label">Statut</span><span class="grid-value status-open">● Ouvert</span></div>
      </div>
      ${stopWarn ? `<div class="stop-warning-bar">⚠️ Stop-loss à moins de 3% du prix actuel</div>` : ''}
      <div class="position-actions">
        <button class="btn-ghost btn-sm" data-open-detail="${pos.symbol}">Voir l'analyse</button>
        <button class="btn-close-pos btn-sm ${mode === 'real' ? 'btn-danger' : 'btn-warning'}" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
          ${mode === 'real' ? '🔴 Clôturer (RÉEL)' : '⬛ Fermer ce trade'}
        </button>
      </div>
    </div>`;
}

function _renderHistoryRow(t) {
  const isLong = (t.direction || '').toLowerCase() === 'long';
  return `
    <div class="history-row ${t.pnl > 0 ? 'row-win' : 'row-loss'}">
      <span>${Fmt.assetIcon(t.symbol)} ${t.symbol}</span>
      <span class="${isLong ? 'long' : 'short'}">${t.direction}</span>
      <span>${Fmt.price(t.entryPrice)}</span>
      <span>${Fmt.price(t.exitPrice)}</span>
      <span class="${Fmt.pnlClass(t.pnl)}">${Fmt.signedCurrency(t.pnl)}</span>
      <span>${Fmt.dateShort(t.closedAt)}</span>
    </div>`;
}

function _enrichPosition(pos) {
  // Real price only — if not loaded yet use entry price as fallback
  const currentPrice = window.__prices[pos.symbol] > 0 ? window.__prices[pos.symbol] : pos.entryPrice;
  const dir = (pos.direction || '').toLowerCase();
  const diff = dir === 'long' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
  return { ...pos, currentPrice, pnl: diff * pos.quantity, pnlPct: (diff / pos.entryPrice) * 100, invested: pos.entryPrice * pos.quantity };
}

function _attachPositionEvents() {
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => { const s = btn.dataset.screen; if (s) Router.navigate(s); });
  });
  document.querySelectorAll('[data-open-detail]').forEach(btn => {
    btn.addEventListener('click', () => Router.navigate('asset-detail', { symbol: btn.dataset.openDetail }));
  });
  document.querySelectorAll('.btn-close-pos').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { mode, id, symbol } = btn.dataset;
      const ok = await UI.confirm(
        mode === 'real' ? '⚠️ Clôture RÉELLE' : 'Clôturer la position',
        mode === 'real' ? `Clôturer la position réelle sur ${symbol} ? Action IRRÉVERSIBLE.` : `Clôturer la position fictive sur ${symbol} ?`,
        mode === 'real'
      );
      if (!ok) return;
      try {
        const result = await BrokerAdapter.closePosition(id, mode);
        if (result.success) {
          UI.toast(`${symbol} clôturé — ${Fmt.signedCurrency(result.pnl)}`, result.pnl >= 0 ? 'success' : 'warning');
          renderPortefeuille();
        } else {
          UI.toast(`Erreur : ${result.error}`, 'error');
        }
      } catch(err) { UI.toast(`Erreur : ${err.message}`, 'error'); }
    });
  });
  const histToggle = document.getElementById('sim-history-toggle');
  const histList   = document.getElementById('sim-history-list');
  if (histToggle && histList) {
    histToggle.addEventListener('click', () => {
      histList.classList.toggle('hidden');
      const arrow = histToggle.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = histList.classList.contains('hidden') ? '▼' : '▲';
    });
  }
}

function updatePositionPrices() {
  [...Storage.getSimPositions(), ...Storage.getRealPositions()].forEach(pos => {
    const enriched = _enrichPosition(pos);
    const priceEl  = document.querySelector(`.current-price[data-id="${pos.id}"]`);
    if (priceEl) priceEl.textContent = Fmt.price(enriched.currentPrice);
    const card = document.querySelector(`.position-card[data-id="${pos.id}"]`);
    if (card) {
      const pnlEl = card.querySelector('.pnl-main'), pctEl = card.querySelector('.pnl-pct');
      if (pnlEl) { pnlEl.textContent = Fmt.signedCurrency(enriched.pnl); pnlEl.className = `pnl-main ${Fmt.pnlClass(enriched.pnl)}`; }
      if (pctEl) { pctEl.textContent = Fmt.signedPct(enriched.pnlPct); pctEl.className = `pnl-pct ${Fmt.pnlClass(enriched.pnl)}`; }
    }
  });
}

Router.register('positions', () => { renderPortefeuille(); }); // alias → portefeuille

// ═══ simulation.js ═══
function renderSimulation() {
  const screen = document.getElementById('screen-simulation');
  if (!screen) return;

  const capital  = Storage.getSimCapital();
  const history  = Storage.getSimHistory();
  const openPos  = Storage.getSimPositions();
  const settings = Storage.getSettings();
  const stats    = _computeStats(capital, history, openPos, settings);

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Simulation</h1>
      <p class="screen-subtitle">Entraînez-vous sans risquer de capital réel</p>
    </div>

    <div class="sim-hero-card">
      <div class="sim-hero-label">Capital fictif total</div>
      <div class="sim-hero-capital">${Fmt.currency(stats.totalCapital)}</div>
      <div class="sim-hero-sub">
        <span class="${Fmt.pnlClass(stats.totalPnl)}">${Fmt.signedCurrency(stats.totalPnl)}</span>
        <span class="hero-separator">/</span>
        <span class="${Fmt.pnlClass(stats.totalPnlPct)}">${Fmt.signedPct(stats.totalPnlPct)}</span>
        <span class="hero-from">depuis le début</span>
      </div>
      <div class="sim-hero-meta">
        <span>Capital initial : ${Fmt.currency(stats.initialCapital)}</span>
        <span>${openPos.length} position${openPos.length !== 1 ? 's' : ''} ouverte${openPos.length !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <div class="sim-stats-grid">
      <div class="sim-stat-card"><span class="stat-label">Trades clôturés</span><span class="stat-value">${stats.totalTrades}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Win rate</span><span class="stat-value ${stats.winRate >= 50 ? 'positive' : 'negative'}">${Fmt.pct(stats.winRate)}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Gains moyens</span><span class="stat-value positive">${Fmt.currency(stats.avgWin)}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Pertes moyennes</span><span class="stat-value negative">${Fmt.currency(Math.abs(stats.avgLoss))}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Profit factor</span><span class="stat-value ${stats.profitFactor >= 1.5 ? 'positive' : stats.profitFactor < 1 ? 'negative' : ''}">${stats.profitFactor.toFixed(2)}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Max drawdown</span><span class="stat-value negative">${Fmt.signedPct(stats.maxDrawdownPct)}</span></div>
      <div class="sim-stat-card"><span class="stat-label">R/R moyen</span><span class="stat-value">${stats.avgRR.toFixed(2)}</span></div>
      <div class="sim-stat-card"><span class="stat-label">Durée moy.</span><span class="stat-value">${Fmt.durationMs(stats.avgDuration)}</span></div>
    </div>

    <div class="chart-section-card">
      <div class="chart-section-header"><span class="chart-section-title">Courbe de capital</span><span class="chart-section-sub">${stats.equityCurve.length} points</span></div>
      <div class="equity-chart-wrap">${_renderEquityCurve(stats.equityCurve, stats.initialCapital)}</div>
    </div>

    ${openPos.length > 0 ? `
      <div class="sim-open-section">
        <div class="section-row-header"><span class="section-title-sm">Positions ouvertes</span><button class="btn-link" data-screen="positions">Tout voir →</button></div>
        <div class="open-pos-mini-list">${openPos.map(p => _renderMiniPosition(p)).join('')}</div>
      </div>
    ` : ''}

    <div class="sim-history-section">
      <div class="section-row-header"><span class="section-title-sm">Historique des trades</span><span class="history-count">${history.length} trades</span></div>
      ${history.length === 0 ? `<div class="empty-history"><p>Aucun trade clôturé.</p></div>` : `
        <div class="history-table-wrap">
          <div class="history-table-header"><span>Actif</span><span>Dir.</span><span>Entrée</span><span>Sortie</span><span>P&L</span><span>Date</span></div>
          <div class="history-table-body">${history.slice().reverse().map(t => _renderSimHistoryRow(t)).join('')}</div>
        </div>`}
    </div>

    <div class="sim-config-section">
      <div class="section-title-sm">Configuration</div>
      <div class="sim-config-card">
        <div class="config-row">
          <span class="config-label">Capital initial</span>
          <div class="config-control">
            <input type="number" id="sim-capital-input" class="input-sm" value="${stats.initialCapital}" min="1000" max="1000000" step="1000"/>
            <button class="btn-ghost btn-sm" id="btn-set-capital">Appliquer</button>
          </div>
        </div>
        <div class="config-row"><span class="config-label">Profil</span><span class="config-value">${Fmt.profileLabel(settings.riskProfile)}</span></div>
        <div class="config-row"><span class="config-label">Risque/trade</span><span class="config-value">${(settings.riskPerTrade * 100).toFixed(2)}%</span></div>
      </div>
    </div>

    <div class="sim-reset-section">
      <button class="btn-danger-outline btn-full" id="btn-reset-sim">🔄 Réinitialiser la simulation</button>
      <p class="reset-warning">Supprime toutes les positions et l'historique fictifs. Irréversible.</p>
    </div>

    <div class="disclaimer-card"><p>ℹ️ Les résultats de simulation ne préjugent pas des performances réelles.</p></div>`;

  _attachSimEvents(stats.initialCapital);
}

function _computeStats(capital, history, openPos, settings) {
  let cap = capital;
  if (typeof cap === 'object' && cap !== null) cap = cap.current || cap.initial || 10000;
  cap = parseFloat(cap);
  if (isNaN(cap) || cap <= 0) cap = 10000;
  const initialCapital = parseFloat(settings.simInitialCapital) || 10000;
  let openPnl = 0;
  openPos.forEach(pos => {
    const curr = window.__prices[pos.symbol] || pos.entryPrice;
    const dir  = (pos.direction || '').toLowerCase();
    const diff = dir === 'long' ? curr - pos.entryPrice : pos.entryPrice - curr;
    openPnl += diff * pos.quantity;
  });
  const totalCapital = cap + (isNaN(openPnl) ? 0 : openPnl);
  const totalPnl     = totalCapital - initialCapital;
  const totalPnlPct  = ((totalCapital / initialCapital) - 1) * 100;
  const wins   = history.filter(t => t.pnl > 0), losses = history.filter(t => t.pnl <= 0);
  const totalTrades  = history.length;
  const winRate      = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const avgWin       = wins.length  > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss      = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const grossProfit  = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss    = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgRR        = history.length > 0 ? history.reduce((s, t) => s + (t.rr || 0), 0) / history.length : 0;
  const avgDuration  = history.length > 0 ? history.reduce((s, t) => s + (t.duration || 86400000), 0) / history.length : 0;
  const equityCurve  = _buildEquityCurve(initialCapital, history);
  const maxDrawdownPct = _calcMaxDrawdown(equityCurve);
  return { initialCapital, totalCapital, totalPnl, totalPnlPct, totalTrades, winRate, avgWin, avgLoss, profitFactor, avgRR, avgDuration, equityCurve, maxDrawdownPct };
}

function _buildEquityCurve(initial, history) {
  const sorted = [...history].sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));
  const curve = [{ t: Date.now() - sorted.length * 86400000, v: initial }];
  let cap = initial;
  sorted.forEach((t, i) => { cap += t.pnl || 0; curve.push({ t: t.closedAt || Date.now() - (sorted.length - i - 1) * 86400000, v: cap }); });
  return curve;
}

function _calcMaxDrawdown(curve) {
  if (curve.length < 2) return 0;
  let peak = curve[0].v, maxDD = 0;
  curve.forEach(pt => { if (pt.v > peak) peak = pt.v; const dd = (peak - pt.v) / peak * 100; if (dd > maxDD) maxDD = dd; });
  return -maxDD;
}

function _renderEquityCurve(curve, initial) {
  if (curve.length < 2) return `<div class="chart-placeholder">Pas encore assez de données</div>`;
  const W = 340, H = 120;
  const vals = curve.map(p => p.v), minV = vals.reduce(function(a,b){return a<b?a:b;}), maxV = vals.reduce(function(a,b){return a>b?a:b;}), rangeV = maxV - minV || 1;
  const pts = curve.map((p, i) => `${(i / (curve.length - 1)) * W},${H - ((p.v - minV) / rangeV) * (H - 16) - 8}`);
  const lineColor = curve[curve.length - 1].v >= initial ? '#22c55e' : '#ef4444';
  const zeroY = H - ((initial - minV) / rangeV) * (H - 16) - 8;
  return `
    <svg viewBox="0 0 ${W} ${H}" class="equity-svg" preserveAspectRatio="none">
      <defs><linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
      </linearGradient></defs>
      <line x1="0" y1="${zeroY}" x2="${W}" y2="${zeroY}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="4,3" opacity="0.4"/>
      <polygon points="0,${H} ${pts.join(' ')} ${W},${H}" fill="url(#eq-grad)"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length-1].split(',')[0]}" cy="${pts[pts.length-1].split(',')[1]}" r="4" fill="${lineColor}"/>
    </svg>`;
}

function _renderMiniPosition(pos) {
  const curr = window.__prices[pos.symbol] > 0 ? window.__prices[pos.symbol] : pos.entryPrice;
  const dir  = (pos.direction || '').toLowerCase();
  const diff = dir === 'long' ? curr - pos.entryPrice : pos.entryPrice - curr;
  const pnl  = diff * pos.quantity;
  return `
    <div class="mini-pos-row" data-open-detail="${pos.symbol}" style="cursor:pointer">
      <span class="mini-pos-icon">${Fmt.assetIcon(pos.symbol)}</span>
      <span class="mini-pos-symbol">${pos.symbol}</span>
      <span class="mini-pos-dir ${dir === 'long' ? 'long' : 'short'}">${pos.direction}</span>
      <span class="mini-pos-pnl ${Fmt.pnlClass(pnl)}">${window.__prices[pos.symbol] > 0 ? Fmt.signedCurrency(pnl) : '⏳'}</span>
    </div>`;
}

function _renderSimHistoryRow(t) {
  const dir = (t.direction || '').toLowerCase();
  return `
    <div class="history-table-row ${t.pnl > 0 ? 'row-win' : 'row-loss'}">
      <span>${Fmt.assetIcon(t.symbol)} ${t.symbol}</span>
      <span class="${dir === 'long' ? 'long' : 'short'}">${t.direction}</span>
      <span>${Fmt.price(t.entryPrice)}</span>
      <span>${Fmt.price(t.exitPrice)}</span>
      <span class="${Fmt.pnlClass(t.pnl)}">${Fmt.signedCurrency(t.pnl)}</span>
      <span>${Fmt.dateShort(t.closedAt)}</span>
    </div>`;
}

function _attachSimEvents(initialCapital) {
  document.querySelectorAll('[data-screen]').forEach(btn => btn.addEventListener('click', () => { if (btn.dataset.screen) Router.navigate(btn.dataset.screen); }));
  document.querySelectorAll('[data-open-detail]').forEach(el => el.addEventListener('click', () => Router.navigate('asset-detail', { symbol: el.dataset.openDetail })));
  const capInput = document.getElementById('sim-capital-input'), capBtn = document.getElementById('btn-set-capital');
  if (capInput && capBtn) {
    capBtn.addEventListener('click', () => {
      const val = parseFloat(capInput.value);
      if (!val || val < 1000) { UI.toast('Capital minimum : 1 000 €', 'error'); return; }
      const s = Storage.getSettings(); s.simInitialCapital = val; Storage.saveSettings(s);
      Storage.saveSimCapital(val);
      UI.toast(`Capital fictif : ${Fmt.currency(val)}`, 'success');
      renderSimulation();
    });
  }
  const resetBtn = document.getElementById('btn-reset-sim');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await UI.confirm('Réinitialiser la simulation ?', 'Toutes les positions et l\'historique fictifs seront effacés.', true);
      if (!ok) return;
      const s = Storage.getSettings();
      Storage.saveSimCapital(s.simInitialCapital || 10000);
      Storage.saveSimPositions([]);
      Storage.saveSimHistory([]);
      UI.toast('Simulation réinitialisée', 'success');
      renderSimulation();
    });
  }
}

Router.register('simulation', () => { renderSimulation(); });

// ═══ settings.js ═══
function renderSettings() {
  const screen = document.getElementById('screen-settings');
  if (!screen) return;

  const settings   = Storage.getSettings();
  const apiKeysRaw = Storage.getApiKeys();
  const keyList    = Array.isArray(apiKeysRaw) ? apiKeysRaw : (apiKeysRaw.twelveData || []).map(k => k.key || '');
  const alertStats = AlertManager.getStats();

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Paramètres</h1>
      <p class="screen-subtitle">Profil de risque, données et connexions</p>
    </div>

    <!-- ═══ CLAUDE IA ═══ -->
    <section class="settings-section">
      <div class="settings-section-title">🤖 Intelligence Artificielle (Claude)</div>
      <div class="settings-card" style="padding:var(--space-5);">
        ${(function() {
          const stats = ClaudeAI.getCallStats();
          const pct = Math.round((stats.count / stats.max) * 100);
          const color = pct > 80 ? 'var(--loss)' : pct > 50 ? 'var(--signal-medium)' : '#8b5cf6';
          return '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);\">' +
            '<div><div style=\"font-size:var(--text-sm);font-weight:700;\">Analyses Claude aujourd\'hui</div>' +
            '<div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + stats.count + ' / ' + stats.max + ' · ' + stats.remaining + ' restantes</div></div>' +
            '<div style=\"font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:' + color + ';\">' + pct + '%</div>' +
            '</div>' +
            '<div style=\"height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden;\">' +
            '<div style=\"height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px;\"></div>' +
            '</div>' +
            '<div style=\"margin-top:var(--space-4);\">' +
            '<button onclick=\"_generateWeeklyReport()\" style=\"width:100%;padding:var(--space-3);background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:var(--btn-radius);color:#8b5cf6;font-size:var(--text-sm);font-weight:600;cursor:pointer;\">' +
            '📊 Générer le rapport hebdomadaire</button>' +
            '</div>';
        })()}
      </div>
    </section>

    <!-- ═══ COMPTEUR API ═══ -->
    <section class="settings-section">
      <div class="settings-section-title">📊 Consommation API</div>
      <div class="settings-card" style="padding:var(--space-5);">
        ${(function() {
          const stats = Storage.getCallStats ? Storage.getCallStats() : { count: 0, limit: 3200, remaining: 3200, pct: 0 };
          const color = stats.pct > 80 ? 'var(--loss)' : stats.pct > 60 ? 'var(--signal-medium)' : 'var(--profit)';
          return '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);\">' +
            '<div><div style=\"font-size:var(--text-sm);font-weight:700;\">Twelve Data aujourd\'hui</div>' +
            '<div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' + stats.count + ' / ' + stats.limit + ' appels · ' + stats.remaining + ' restants</div></div>' +
            '<div style=\"font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:' + color + ';\">' + stats.pct + '%</div>' +
            '</div>' +
            '<div style=\"height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden;\">' +
            '<div style=\"height:100%;width:' + stats.pct + '%;background:' + color + ';border-radius:4px;transition:width 0.5s;\"></div>' +
            '</div>' +
            '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-top:var(--space-4);\">' +
            '<div style=\"text-align:center;\"><div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' +
            'Binance</div><div style=\"font-size:var(--text-sm);font-weight:700;color:var(--profit);\">' +
            'Illimité ✅</div></div>' +
            '<div style=\"text-align:center;\"><div style=\"font-size:var(--text-xs);color:var(--text-muted);\">' +
            'Cloudflare</div><div style=\"font-size:var(--text-sm);font-weight:700;color:var(--profit);\">' +
            '100k/jour ✅</div></div>' +
            '</div>';
        })()}
      </div>
    </section>

    <!-- ═══ ALERTES ═══ -->
    <section class="settings-section">
      <div class="settings-section-title">🔔 Alertes & Notifications</div>
      <div class="settings-card">
        <div class="alert-stats-row">
          <div class="alert-stat"><span class="alert-stat-val">${alertStats.total}</span><span class="alert-stat-label">Alertes créées</span></div>
          <div class="alert-stat"><span class="alert-stat-val">${alertStats.enabled}</span><span class="alert-stat-label">Actives</span></div>
          <div class="alert-stat"><span class="alert-stat-val">${alertStats.fired}</span><span class="alert-stat-label">Déclenchées</span></div>
          <div class="alert-stat">
            <span class="alert-stat-val" style="color:${alertStats.permission === 'granted' ? 'var(--profit)' : alertStats.permission === 'denied' ? 'var(--loss)' : 'var(--accent)'};">
              ${alertStats.permission === 'granted' ? '✓' : alertStats.permission === 'denied' ? '✗' : '?'}
            </span>
            <span class="alert-stat-label">Notifs</span>
          </div>
        </div>

        ${alertStats.permission !== 'granted' ? `
          <div style="margin-top:var(--space-4);">
            <button class="btn btn-primary btn-sm" id="btn-request-notif">
              🔔 Activer les notifications push
            </button>
            <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">
              ${alertStats.permission === 'denied'
                ? 'Notifications bloquées dans ce navigateur. Modifiez les permissions depuis les réglages Safari/Chrome.'
                : 'Requis pour recevoir des alertes quand l\'app est en arrière-plan.'
              }
            </p>
          </div>
        ` : `
          <p style="font-size:var(--text-xs);color:var(--profit);margin-top:var(--space-4);">✓ Notifications activées — les alertes fonctionnent en arrière-plan</p>
        `}

        <div style="margin-top:var(--space-4);">
          <div class="settings-row">
            <div class="settings-row-label"><span class="settings-label">Alertes signal</span><span class="settings-hint">Seuil de score pour déclencher l'alerte</span></div>
            <div class="settings-control-inline">
              <input type="number" id="alert-score-threshold" class="input-sm" value="${settings.alertScoreThreshold || 60}" min="30" max="100" step="5"/>
              <span class="input-suffix">/100</span>
            </div>
          </div>
        </div>

        ${alertStats.total > 0 ? `
          <div style="margin-top:var(--space-5);border-top:1px solid var(--border-subtle);padding-top:var(--space-4);">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);">Toutes les alertes (${alertStats.total})</div>
            ${_renderAllAlerts()}
            <button class="btn btn-ghost btn-sm" id="btn-clear-alerts" style="margin-top:var(--space-3);color:var(--loss);">Supprimer toutes les alertes</button>
          </div>
        ` : `
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-4);">Créez des alertes depuis la fiche d'un actif (onglet Opportunités).</p>
        `}
      </div>
    </section>

    <!-- RISK PROFILE -->
    <section class="settings-section">
      <div class="settings-section-title">Profil de risque</div>
      <div class="profile-cards-row">
        ${_renderProfileCard('conservative', 'Conservateur', '0.25%', '🛡️', 'Opportunités les plus forts uniquement.', settings.riskProfile)}
        ${_renderProfileCard('balanced',     'Équilibré',    '0.50%', '⚖️', 'Défaut recommandé.',                settings.riskProfile)}
        ${_renderProfileCard('dynamic',      'Dynamique',    '1.00%', '⚡', 'Plus d\'opportunités, plus d\'exposition.', settings.riskProfile)}
      </div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label"><span class="settings-label">Je risque X% par trade</span><span class="settings-hint">% du capital par signal</span></div>
          <div class="settings-control">
            <input type="range" id="risk-slider" class="range-input" min="0.25" max="1.00" step="0.25" value="${settings.riskPerTrade * 100}"/>
            <span class="range-value" id="risk-value">${(settings.riskPerTrade * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label"><span class="settings-label">Mon budget de départ</span></div>
          <div class="settings-control-inline">
            <input type="number" id="settings-sim-capital" class="input-sm" value="${settings.simInitialCapital || 10000}" min="1000" max="1000000" step="1000"/>
            <span class="input-suffix">€</span>
          </div>
        </div>
      </div>
    </section>

    <!-- TWELVE DATA -->
    <section class="settings-section">
      <div class="settings-section-title">Twelve Data — Clés API</div>
      <div class="settings-card">
        ${[1,2,3,4].map(i => `
          <div class="settings-row api-key-row">
            <div class="settings-row-label">
              <span class="settings-label">Clé API ${i}</span>
              <span class="api-key-status" id="api-status-${i}">${keyList[i-1] ? '✅ Configurée' : '○ Non configurée'}</span>
            </div>
            <div class="settings-control api-key-control">
              <input type="password" id="api-key-${i}" class="input-sm input-key" placeholder="Coller votre clé…" value="${keyList[i-1] ? '••••••••••••••••' : ''}"/>
              <button class="btn-ghost btn-xs" data-key-index="${i}">${keyList[i-1] ? 'Modifier' : 'Enregistrer'}</button>
            </div>
          </div>`).join('')}
        <div class="api-key-actions">
          <button class="btn-outline btn-sm" id="btn-test-api">Tester Twelve Data</button>
        </div>
      </div>
    </section>

    <!-- BINANCE -->
    <section class="settings-section">
      <div class="settings-section-title">Binance — Connexion broker</div>
      <div class="settings-card broker-card ${settings.broker === 'binance' ? 'broker-active' : ''}">
        <div class="broker-header-row">
          <div class="broker-logo"><span class="broker-icon">🟡</span><span class="broker-name">Binance</span></div>
          <span class="broker-tag ${settings.broker === 'binance' ? 'connected' : 'disconnected'}">${settings.broker === 'binance' ? '● Connecté' : '○ Non connecté'}</span>
        </div>
        <div class="broker-warning">⚠️ Clé API trading uniquement — jamais de permission retrait.</div>
        <div class="broker-fields">
          <div class="field-row"><label class="field-label">API Key</label><input type="password" id="binance-api-key" class="input-sm" placeholder="Binance API Key" value="${settings.binanceApiKey ? '••••••••••••••••' : ''}"/></div>
          <div class="field-row"><label class="field-label">Secret Key</label><input type="password" id="binance-secret" class="input-sm" placeholder="Binance Secret Key" value="${settings.binanceSecret ? '••••••••••••••••' : ''}"/></div>
        </div>
        <div class="broker-actions">
          ${settings.broker === 'binance'
            ? `<button class="btn-danger-outline btn-sm" id="btn-disconnect-binance">Déconnecter</button>`
            : `<button class="btn-primary btn-sm" id="btn-connect-binance">Connecter Binance</button>`
          }
        </div>
        <p class="broker-v2-note">🚧 Ordres réels disponibles en V2.</p>
      </div>
    </section>

    <!-- AFFICHAGE -->
    <section class="settings-section">
      <div class="settings-section-title">Affichage</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label"><span class="settings-label">Thème</span></div>
          <select id="theme-select" class="select-sm">
            <option value="dark"  ${settings.theme === 'dark'  ? 'selected' : ''}>Sombre</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Clair</option>
          </select>
        </div>
      </div>
    </section>

    <div class="settings-footer">
      <button class="btn-primary btn-full" id="btn-save-settings">Enregistrer tous les paramètres</button>
    </div>
    <div class="settings-legal">
      <p>ManiTradePro V1 — Outil d'aide à la décision uniquement.</p>
    </div>`;

  _attachSettingsEvents(settings);
}

function _renderAllAlerts() {
  const alerts = Storage.getAlerts();
  if (!alerts.length) return '';
  const typeLabels = {
    signal:    '📊 Signal',
    price_up:  '↑ Prix hausse',
    price_down:'↓ Prix baisse',
    stop_near: '⚠️ Stop proche',
    tp_hit:    '🎯 Take profit',
  };
  return alerts.map(a => `
    <div class="alert-item" id="alert-settings-${a.id}">
      <div style="display:flex;align-items:center;gap:var(--space-2);flex:1;flex-wrap:wrap;">
        <span class="alert-dot ${a.enabled ? 'alert-dot-on' : 'alert-dot-off'}"></span>
        <span style="font-size:var(--text-xs);font-weight:600;">${a.symbol}</span>
        <span style="font-size:var(--text-xs);color:var(--text-muted);">${typeLabels[a.type] || a.type}</span>
        ${a.autoCreated ? `<span style="font-size:var(--text-xs);color:var(--text-muted);">(auto)</span>` : ''}
        ${a.firedCount > 0 ? `<span style="font-size:var(--text-xs);color:var(--accent);">${a.firedCount}×</span>` : ''}
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-ghost btn-xs" data-toggle-alert="${a.id}">${a.enabled ? 'Pause' : 'Reprendre'}</button>
        <button class="btn btn-ghost btn-xs" style="color:var(--loss);" data-delete-alert="${a.id}">✕</button>
      </div>
    </div>`).join('');
}

function _renderProfileCard(id, label, risk, icon, desc, current) {
  return `
    <div class="profile-card ${current === id ? 'profile-selected' : ''}" data-profile="${id}">
      <div class="profile-icon">${icon}</div>
      <div class="profile-label">${label}</div>
      <div class="profile-risk">${risk} / trade</div>
      <div class="profile-desc">${desc}</div>
    </div>`;
}

function _attachSettingsEvents(settings) {
  // Notifs
  const notifBtn = document.getElementById('btn-request-notif');
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      const ok = await AlertManager.requestPermission();
      UI.toast(ok ? '✅ Notifications activées !' : 'Notifications refusées', ok ? 'success' : 'error');
      renderSettings();
    });
  }

  // Clear alerts
  const clearBtn = document.getElementById('btn-clear-alerts');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const ok = await UI.confirm('Supprimer toutes les alertes ?', 'Cette action est irréversible.', true);
      if (!ok) return;
      Storage.saveAlerts([]);
      UI.toast('Toutes les alertes supprimées', 'info');
      renderSettings();
    });
  }

  // Toggle/delete alertes dans settings
  document.querySelectorAll('[data-toggle-alert]').forEach(btn => {
    btn.addEventListener('click', () => {
      const enabled = AlertManager.toggleAlert(btn.dataset.toggleAlert);
      btn.textContent = enabled ? 'Pause' : 'Reprendre';
      const item = document.getElementById(`alert-settings-${btn.dataset.toggleAlert}`);
      const dot  = item?.querySelector('.alert-dot');
      if (dot) { dot.classList.toggle('alert-dot-on', enabled); dot.classList.toggle('alert-dot-off', !enabled); }
    });
  });
  document.querySelectorAll('[data-delete-alert]').forEach(btn => {
    btn.addEventListener('click', () => {
      AlertManager.deleteAlert(btn.dataset.deleteAlert);
      document.getElementById(`alert-settings-${btn.dataset.deleteAlert}`)?.remove();
      UI.toast('Alerte supprimée', 'info');
    });
  });

  // Profils
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('profile-selected'));
      card.classList.add('profile-selected');
      const riskMap = { conservative: 0.25, balanced: 0.50, dynamic: 1.00 };
      const slider = document.getElementById('risk-slider'), rv = document.getElementById('risk-value');
      if (slider) slider.value = riskMap[card.dataset.profile] * 100;
      if (rv) rv.textContent = `${riskMap[card.dataset.profile]}%`;
    });
  });

  // Slider
  const slider = document.getElementById('risk-slider'), rv = document.getElementById('risk-value');
  if (slider && rv) slider.addEventListener('input', () => { rv.textContent = `${parseFloat(slider.value).toFixed(2)}%`; });

  // API keys
  document.querySelectorAll('[data-key-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.keyIndex) - 1;
      const input = document.getElementById(`api-key-${i + 1}`);
      if (!input) return;
      const val = input.value.trim();
      if (!val || val.includes('•')) { UI.toast('Entrez une vraie clé API', 'error'); return; }
      const keys = Storage.getApiKeys();
      const keyList = Array.isArray(keys) ? keys : (keys.twelveData || []).map(k => k.key || '');
      while (keyList.length < 4) keyList.push('');
      keyList[i] = val;
      Storage.saveApiKeys(keyList);
      input.value = '••••••••••••••••';
      btn.textContent = 'Modifier';
      const statusEl = document.getElementById(`api-status-${i + 1}`);
      if (statusEl) statusEl.textContent = '✅ Configurée';
      UI.toast(`Clé API ${i + 1} enregistrée`, 'success');
    });
  });

  // Test API
  const testBtn = document.getElementById('btn-test-api');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      testBtn.textContent = 'Test en cours…'; testBtn.disabled = true;
      try {
        const keys = Storage.getApiKeys();
        const keyList = Array.isArray(keys) ? keys : (keys.twelveData || []).map(k => k.key || '');
        const hasKey = keyList.some(k => k && k.length > 0);
        UI.toast(hasKey ? 'Clé(s) Twelve Data configurée(s) ✅' : 'Aucune clé configurée', hasKey ? 'success' : 'warning');
      } finally { testBtn.textContent = 'Tester Twelve Data'; testBtn.disabled = false; }
    });
  }

  // Binance connect
  const binanceBtn = document.getElementById('btn-connect-binance');
  if (binanceBtn) {
    binanceBtn.addEventListener('click', async () => {
      const key = document.getElementById('binance-api-key')?.value.trim();
      const sec = document.getElementById('binance-secret')?.value.trim();
      if (!key || key.includes('•') || !sec || sec.includes('•')) { UI.toast('Entrez vos clés Binance', 'error'); return; }
      binanceBtn.textContent = 'Test…'; binanceBtn.disabled = true;
      BinanceClient.init(key, sec);
      const test = await BinanceClient.testConnection();
      if (test.connected) {
        const s = Storage.getSettings(); s.broker = 'binance'; s.binanceApiKey = key; s.binanceSecret = sec;
        Storage.saveSettings(s);
        UI.toast(`✅ Binance connecté — ${test.balances} actifs`, 'success');
        renderSettings();
      } else {
        UI.toast(`❌ Connexion échouée : ${test.error || 'Vérifiez vos clés'}`, 'error');
        BinanceClient.init('', '');
      }
      binanceBtn.textContent = 'Connecter Binance'; binanceBtn.disabled = false;
    });
  }

  const discBtn = document.getElementById('btn-disconnect-binance');
  if (discBtn) {
    discBtn.addEventListener('click', () => {
      const s = Storage.getSettings(); s.broker = 'none'; s.binanceApiKey = ''; s.binanceSecret = '';
      Storage.saveSettings(s);
      UI.toast('Binance déconnecté', 'success');
      renderSettings();
    });
  }

  // Save all
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const s = Storage.getSettings();
      const sel = document.querySelector('.profile-card.profile-selected');
      if (sel) s.riskProfile = sel.dataset.profile;
      const sliderEl = document.getElementById('risk-slider');
      if (sliderEl) s.riskPerTrade = parseFloat(sliderEl.value) / 100;
      const capEl = document.getElementById('settings-sim-capital');
      if (capEl?.value) s.simInitialCapital = parseFloat(capEl.value);
      const themeEl = document.getElementById('theme-select');
      if (themeEl) { s.theme = themeEl.value; document.documentElement.setAttribute('data-theme', themeEl.value); }
      const alertThreshEl = document.getElementById('alert-score-threshold');
      if (alertThreshEl?.value) s.alertScoreThreshold = parseInt(alertThreshEl.value);
      // Sync simCapital with simInitialCapital
      const capEl2 = document.getElementById('settings-sim-capital');
      if (capEl2?.value) {
        const newCap = parseFloat(capEl2.value);
        if (newCap >= 100) {
          s.simInitialCapital = newCap;
          Storage.saveSimCapital(newCap);
        }
      }
      Storage.saveSettings(s);
      // Sync capital to Supabase
      SupabaseDB.saveCapital(Storage.getSimCapital()).catch(() => {});
      // Re-analyze with new settings
      window.__MTP.lastAnalysis = AnalysisEngine.analyzeAllSync();
      UI.toast('Paramètres enregistrés ✅', 'success');
      // Refresh current screen
      const cur = Router.getCurrent();
      Router.navigate(cur === 'settings' ? 'dashboard' : cur);
    });
  }
}

Router.register('settings', () => { renderSettings(); });



// ═══ AlgoLearning — Apprentissage sur les trades ═══
const AlgoLearning = (() => {

  const STORAGE_KEY = 'mtp_algo_insights';

  function getInsights() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveInsights(insights) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
  }

  // Enregistrer les conditions d'un trade fermé
  function recordTrade(trade, indicators) {
    const insights = getInsights();
    const key = trade.symbol + '_' + trade.direction;
    if (!insights[key]) {
      insights[key] = { symbol: trade.symbol, direction: trade.direction, trades: [], winRate: 0, avgRR: 0 };
    }
    insights[key].trades.push({
      pnl: trade.pnl, pnlPct: trade.pnlPct,
      score: trade.score || 0,
      adx: indicators?.adx || null,
      rsi: indicators?.rsi || null,
      atr: indicators?.atrPct || null,
      vol20: indicators?.vol20 || null,
      win: trade.pnl > 0,
      closedAt: trade.closedAt || Date.now(),
    });
    // Recalculate stats
    const trades = insights[key].trades;
    const wins = trades.filter(t => t.win);
    insights[key].winRate = Math.round((wins.length / trades.length) * 100);
    insights[key].avgRR = trades.reduce((s, t) => s + (t.pnlPct || 0), 0) / trades.length;
    insights[key].sampleSize = trades.length;
    insights[key].updatedAt = Date.now();
    saveInsights(insights);
    // Sync to Supabase
    _syncInsight(insights[key]).catch(() => {});
  }

  async function _syncInsight(insight) {
    if (!insight.symbol) return;
    await SupabaseDB._request?.('POST', 'algo_insights', {
      symbol: insight.symbol,
      direction: insight.direction,
      win_rate: insight.winRate,
      avg_rr: insight.avgRR,
      best_conditions: JSON.stringify(insight.trades.slice(-10)),
      sample_size: insight.sampleSize,
    }).catch(() => {});
  }

  // Obtenir le score ajusté selon l'historique
  function getAdjustedScore(symbol, direction, baseScore) {
    const insights = getInsights();
    const key = symbol + '_' + direction;
    const insight = insights[key];
    if (!insight || insight.sampleSize < 3) return baseScore;
    // Bonus si win rate > 60%, malus si < 40%
    const winRate = insight.winRate;
    let bonus = 0;
    if (winRate >= 70) bonus = 10;
    else if (winRate >= 60) bonus = 5;
    else if (winRate <= 30) bonus = -10;
    else if (winRate <= 40) bonus = -5;
    return Math.min(100, Math.max(0, baseScore + bonus));
  }

  // Résumé pour l'affichage
  function getSummary() {
    const insights = getInsights();
    const keys = Object.keys(insights);
    if (!keys.length) return null;
    const bestKey = keys.sort((a, b) => (insights[b].winRate || 0) - (insights[a].winRate || 0))[0];
    const best = insights[bestKey];
    return {
      totalTrades: keys.reduce((s, k) => s + (insights[k].sampleSize || 0), 0),
      bestSymbol: best?.symbol,
      bestDirection: best?.direction,
      bestWinRate: best?.winRate,
      insights,
    };
  }

  return { recordTrade, getAdjustedScore, getSummary, getInsights };
})();

// ═══ WatchlistManager — Gestion dynamique de la watchlist ═══
const WatchlistManager = (() => {

  function getCustomWatchlist() {
    const stored = localStorage.getItem('mtp_custom_watchlist');
    return stored ? JSON.parse(stored) : [];
  }

  function saveCustomWatchlist(list) {
    localStorage.setItem('mtp_custom_watchlist', JSON.stringify(list));
  }

  function addAsset(symbol, name, assetClass) {
    const custom = getCustomWatchlist();
    if (custom.find(a => a.symbol === symbol)) return false;
    if (MOCK_DATA.watchlist.find(a => a.symbol === symbol)) return false;
    custom.push({ symbol, name, class: assetClass || 'crypto', trend: 'neutral', volatility: 0.03, custom: true });
    saveCustomWatchlist(custom);
    return true;
  }

  function removeAsset(symbol) {
    const custom = getCustomWatchlist().filter(a => a.symbol !== symbol);
    saveCustomWatchlist(custom);
  }

  function getFullWatchlist() {
    return [...MOCK_DATA.watchlist, ...getCustomWatchlist()];
  }

  // Auto-add trending cryptos if score is good
  async function autoAddTrending() {
    try {
      const trending = await TrendingEngine.fetchTrending();
      const added = [];
      for (const t of (trending.trending || [])) {
        if (!t.symbol) continue;
        const alreadyIn = MOCK_DATA.watchlist.find(a => a.symbol === t.symbol) ||
                          getCustomWatchlist().find(a => a.symbol === t.symbol);
        if (!alreadyIn) {
          // Check if Binance has this pair
          const pair = t.symbol + 'USDT';
          try {
            const r = await fetch('https://aged-bar-257a.emmanueldelasse.workers.dev/binance/api/v3/ticker/price?symbol=' + pair);
            if (r.ok) {
              addAsset(t.symbol, t.name, 'crypto');
              added.push(t.symbol);
            }
          } catch(e) {}
        }
      }
      if (added.length > 0) {
        console.log('[Watchlist] Auto-added:', added);
        UI.toast('🔥 ' + added.join(', ') + ' ajouté(s) à votre watchlist', 'success');
      }
      return added;
    } catch(e) {
      return [];
    }
  }

  return { addAsset, removeAsset, getFullWatchlist, getCustomWatchlist, autoAddTrending };
})();


// ── Multi-timeframe analysis for open positions (Niveau 3)
async function analyzeMultiTimeframe(symbol) {
  try {
    const [h1, h4] = await Promise.all([
      TwelveDataClient.call('time_series', { symbol, interval: '1h', outputsize: 50 }, 3600000),
      TwelveDataClient.call('time_series', { symbol, interval: '4h', outputsize: 50 }, 3600000),
    ]);

    const parseCandles = (data) => {
      if (!data?.values) return null;
      return data.values.map(v => ({
        ts: new Date(v.datetime).getTime(),
        open: parseFloat(v.open), high: parseFloat(v.high),
        low: parseFloat(v.low), close: parseFloat(v.close),
        volume: parseFloat(v.volume) || 1000000,
      })).reverse();
    };

    const candles1h = parseCandles(h1);
    const candles4h = parseCandles(h4);

    if (!candles1h && !candles4h) return null;

    const ind1h = candles1h ? Indicators.computeAll(candles1h) : null;
    const ind4h = candles4h ? Indicators.computeAll(candles4h) : null;

    // Alignment score: how many timeframes agree
    let bullishCount = 0, bearishCount = 0;
    if (ind1h) { if (ind1h.ema50 > ind1h.ema100) bullishCount++; else bearishCount++; }
    if (ind4h) { if (ind4h.ema50 > ind4h.ema100) bullishCount++; else bearishCount++; }

    return {
      h1: ind1h ? { trend: ind1h.ema50 > ind1h.ema100 ? 'up' : 'down', rsi: ind1h.rsi, macd: ind1h.macd } : null,
      h4: ind4h ? { trend: ind4h.ema50 > ind4h.ema100 ? 'up' : 'down', rsi: ind4h.rsi, macd: ind4h.macd } : null,
      alignment: bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'mixed',
      alignmentScore: Math.max(bullishCount, bearishCount) / 2 * 100,
    };
  } catch(e) {
    return null;
  }
}

// Run multi-TF analysis every hour for open positions
async function refreshMultiTimeframe() {
  const positions = [...Storage.getSimPositions(), ...Storage.getRealPositions()];
  if (!positions.length) return;
  for (const pos of positions) {
    const mtf = await analyzeMultiTimeframe(pos.symbol);
    if (mtf) {
      if (!window.__MTP.mtfData) window.__MTP.mtfData = {};
      window.__MTP.mtfData[pos.symbol] = mtf;
    }
    await new Promise(r => setTimeout(r, 2000)); // 2s between calls
  }
}


// ═══ Market Hours ═══
const MarketHours = (() => {
  const MARKETS = {
    crypto:    { name: 'Crypto', open: true, always: true },
    stock_us:  { name: 'NYSE/NASDAQ', tz: 'America/New_York', open: '09:30', close: '16:00', days: [1,2,3,4,5] },
    stock_eu:  { name: 'Euronext', tz: 'Europe/Paris', open: '09:00', close: '17:30', days: [1,2,3,4,5] },
    forex:     { name: 'Forex', open: '00:00', close: '24:00', days: [1,2,3,4,5] },
    commodity: { name: 'Matières premières', open: '00:00', close: '24:00', days: [1,2,3,4,5] },
  };

  const CRYPTO_SYMBOLS = ['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','DOT','LINK','DOGE','MATIC','UNI','ATOM','LTC','NEAR'];
  const US_STOCKS = ['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','NFLX','AMD','JPM','V','MA','DIS','COIN','PYPL','SPY','QQQ','TLT'];
  const EU_STOCKS = ['MC','ASML','SAP','TTE','BNP','AIR','RMS','OR','SAN','STLA','GLD'];
  const FOREX = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD'];
  const COMMODITIES = ['GOLD','SILVER','OIL'];

  function getMarketType(symbol) {
    if (CRYPTO_SYMBOLS.includes(symbol)) return 'crypto';
    if (US_STOCKS.includes(symbol)) return 'stock_us';
    if (EU_STOCKS.includes(symbol)) return 'stock_eu';
    if (FOREX.includes(symbol)) return 'forex';
    if (COMMODITIES.includes(symbol)) return 'commodity';
    return 'stock_us';
  }

  function isOpen(symbol) {
    const type = getMarketType(symbol);
    if (type === 'crypto') return true;
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const market = MARKETS[type];
    if (!market.days.includes(day)) return false;
    const tz = market.tz || 'Europe/Paris';
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const h = localTime.getHours(), m = localTime.getMinutes();
    const current = h * 60 + m;
    const [oh, om] = market.open.split(':').map(Number);
    const [ch, cm] = market.close.split(':').map(Number);
    return current >= oh * 60 + om && current < ch * 60 + cm;
  }

  function getStatus(symbol) {
    const type = getMarketType(symbol);
    if (type === 'crypto') return { open: true, label: '🟢 Ouvert 24h/7j', next: null };
    
    const market = MARKETS[type];
    const open = isOpen(symbol);
    const now = new Date();
    const tz = market.tz || 'Europe/Paris';
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const day = localTime.getDay();
    const h = localTime.getHours(), m = localTime.getMinutes();
    const current = h * 60 + m;
    const [oh, om] = market.open.split(':').map(Number);
    const [ch, cm] = market.close.split(':').map(Number);

    if (open) {
      const closeIn = (ch * 60 + cm) - current;
      const closeH = Math.floor(closeIn / 60), closeM = closeIn % 60;
      return { open: true, label: '🟢 Marché ouvert', next: 'Ferme dans ' + closeH + 'h' + (closeM > 0 ? closeM + 'min' : '') };
    } else {
      // Find next opening
      let daysUntil = 0;
      let nextDay = day;
      for (let i = 1; i <= 7; i++) {
        nextDay = (day + i) % 7;
        if (market.days.includes(nextDay)) { daysUntil = i; break; }
      }
      const dayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      const openTime = market.open;
      if (daysUntil === 1) return { open: false, label: '🔴 Marché fermé', next: 'Ouvre demain à ' + openTime };
      return { open: false, label: '🔴 Marché fermé', next: 'Ouvre ' + dayNames[nextDay] + ' à ' + openTime };
    }
  }

  return { isOpen, getStatus, getMarketType };
})();


// ═══ NewsEngine — Agrégateur d'informations marché ═══
const NewsEngine = (() => {
  const PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev';
  let _cache = null;
  let _lastFetch = 0;
  const TTL = 30 * 60 * 1000; // 30 min

  const RSS_SOURCES = [
    { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters', type: 'general', importance: 'high' },
    { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top', type: 'general', importance: 'high' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', type: 'crypto', importance: 'high' },
    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', type: 'crypto', importance: 'medium' },
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', name: 'Yahoo Finance', type: 'stocks', importance: 'high' },
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US', name: 'Yahoo Crypto', type: 'crypto', importance: 'medium' },
    { url: 'https://www.aktionnaire.com/articles', name: 'Aktionnaire', type: 'stocks_fr', scrape: true, importance: 'medium' },
    { url: 'https://www.boursorama.com/rss/actus-internationales', name: 'Boursorama', type: 'general_fr', importance: 'medium' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch', type: 'stocks', importance: 'high' },
  ];

  // Symbols to watch in news
  const WATCH_SYMBOLS = {
    // Crypto
    'bitcoin': 'BTC', 'btc': 'BTC', 'ethereum': 'ETH', 'eth': 'ETH',
    'solana': 'SOL', 'ripple': 'XRP', 'xrp': 'XRP', 'cardano': 'ADA',
    // US Stocks
    'nvidia': 'NVDA', 'apple': 'AAPL', 'tesla': 'TSLA', 'microsoft': 'MSFT',
    'amazon': 'AMZN', 'google': 'GOOGL', 'alphabet': 'GOOGL', 'meta': 'META',
    'netflix': 'NFLX', 'amd': 'AMD', 'jpmorgan': 'JPM', 'visa': 'V',
    // EU Stocks (French)
    'lvmh': 'MC', 'asml': 'ASML', 'sap': 'SAP', 'totalenergies': 'TTE',
    'bnp': 'BNP', 'airbus': 'AIR', 'hermes': 'RMS', 'loreal': 'OR',
    'sanofi': 'SAN', 'stellantis': 'STLA',
    // Commodities & macro
    'gold': 'GOLD', 'or': 'GOLD', 'petrole': 'OIL', 'oil': 'OIL',
    'argent': 'SILVER', 'silver': 'SILVER',
    // Macro keywords (no symbol)
    'fed': null, 'inflation': null, 'taux': null, 'bce': null,
    'recession': null, 'croissance': null, 'pib': null, 'chomage': null,
    'interest rate': null, 'nfp': null, 'earnings': null, 'resultats': null,
  };


  function _getNewsImportance(title, sourceImportance) {
    const highKeywords = ['fed', 'bce', 'ecb', 'inflation', 'rate', 'taux', 'crash', 'crisis', 'bitcoin', 'etf', 'sec', 'regulation', 'ban', 'gdp', 'pib', 'nfp', 'jobs'];
    const lower = title.toLowerCase();
    const hasHighKeyword = highKeywords.some(k => lower.includes(k));
    if (hasHighKeyword && sourceImportance === 'high') return 'high';
    if (hasHighKeyword || sourceImportance === 'high') return 'medium';
    return 'low';
  }

  function _getNewsCategory(type) {
    const map = {
      general: 'Macro',
      general_fr: 'Marches FR',
      stocks: 'Actions',
      stocks_fr: 'Actions FR',
      crypto: 'Crypto',
    };
    return map[type] || 'General';
  }


  function _parseRSSXML(xml, sourceName) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const items = [];
      const entries = doc.querySelectorAll('item, entry');
      entries.forEach(item => {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim()
          || item.querySelector('link')?.getAttribute('href') || '';
        const pubDate = item.querySelector('pubDate, published, updated')?.textContent?.trim() || '';
        const description = item.querySelector('description, summary, content')?.textContent?.trim() || '';
        if (title) items.push({ title, link, pubDate, description: description.replace(/<[^>]*>/g, '').slice(0, 200) });
      });
      return items.slice(0, 8);
    } catch(e) { return []; }
  }

  function detectSymbols(text) {
    const lower = text.toLowerCase();
    const found = new Set();
    for (const [keyword, symbol] of Object.entries(WATCH_SYMBOLS)) {
      if (lower.includes(keyword) && symbol) found.add(symbol);
    }
    return [...found];
  }

  function scoreSentiment(text) {
    const lower = text.toLowerCase();
    const bullish = ['surge', 'rally', 'gain', 'high', 'bull', 'rise', 'up', 'hausse', 'monte', 'record', 'breakout'];
    const bearish = ['drop', 'fall', 'crash', 'low', 'bear', 'down', 'baisse', 'chute', 'sold off', 'warning'];
    let score = 0;
    bullish.forEach(w => { if (lower.includes(w)) score++; });
    bearish.forEach(w => { if (lower.includes(w)) score--; });
    return score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral';
  }

  async function fetchNews() {
    const now = Date.now();
    if (_cache && (now - _lastFetch) < TTL) return _cache;

    const items = [];

    // Try each RSS via allorigins proxy (free CORS proxy for RSS)
    for (const source of RSS_SOURCES) {
      try {
        let feedUrl = source.url;
        // For scrape:true sources (no native RSS), try common feed paths
        if (source.scrape) {
          feedUrl = source.url.replace(/\/$/, '') + '/feed';
        }
        // Try rss2json first, fallback to allorigins XML parse
        let data = null;
        try {
          const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feedUrl) + '&count=8&api_key=';
          const r1 = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
          if (r1.ok) {
            const d = await r1.json();
            if (d.status === 'ok' && d.items?.length) data = d;
          }
        } catch(e) {}
        // Fallback: allorigins proxy + XML parse
        if (!data) {
          try {
            const aoUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feedUrl);
            const r2 = await fetch(aoUrl, { signal: AbortSignal.timeout(8000) });
            if (r2.ok) {
              const ao = await r2.json();
              if (ao.contents) {
                const items = _parseRSSXML(ao.contents, source.name);
                if (items.length > 0) data = { status: 'ok', items };
              }
            }
          } catch(e) {}
        }
        if (!data || data.status !== 'ok' || !data.items?.length) continue;
        for (const item of data.items.slice(0, 8)) {
          const text = (item.title || '') + ' ' + (item.description || '');
          const importance = _getNewsImportance(item.title || '', source.importance || 'medium');
          items.push({
            title: item.title || '',
            description: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 200),
            source: source.name,
            sourceUrl: source.url,
            type: source.type,
            importance,
            pubDate: item.pubDate,
            link: item.link || source.url,
            symbols: detectSymbols(text),
            sentiment: scoreSentiment(text),
            category: _getNewsCategory(source.type),
          });
        }
      } catch(e) { console.warn('[News]', source.name, e.message); }
    }

    // Generate algo summary
    const symbolMentions = {};
    items.forEach(item => {
      item.symbols.forEach(sym => {
        if (!symbolMentions[sym]) symbolMentions[sym] = { count: 0, bullish: 0, bearish: 0 };
        symbolMentions[sym].count++;
        if (item.sentiment === 'bullish') symbolMentions[sym].bullish++;
        if (item.sentiment === 'bearish') symbolMentions[sym].bearish++;
      });
    });

    // Cross with algo scores
    const analysis = window.__MTP?.lastAnalysis;
    const alerts = [];
    for (const [sym, mentions] of Object.entries(symbolMentions)) {
      if (mentions.count < 2) continue;
      const algoResult = analysis?.all?.find(a => a.symbol === sym);
      if (algoResult && algoResult.adjScore >= 60) {
        alerts.push({
          symbol: sym,
          mentions: mentions.count,
          sentiment: mentions.bullish > mentions.bearish ? 'bullish' : mentions.bearish > mentions.bullish ? 'bearish' : 'neutral',
          algoScore: algoResult.adjScore,
          direction: algoResult.direction,
        });
      }
    }
    alerts.sort((a, b) => b.mentions * b.algoScore - a.mentions * a.algoScore);

    // Enrich with Finnhub market news (free endpoint)
    try {
      const finnhubNews = await FinnhubClient.getMarketNews('general');
      if (finnhubNews && finnhubNews.length > 0) {
        finnhubNews.forEach(a => {
          const isDup = items.some(e => e.title.toLowerCase().slice(0,40) === a.title.toLowerCase().slice(0,40));
          if (!isDup && a.title) {
            items.push({ ...a, type: 'stocks', importance: 'medium' });
          }
        });
      }
    } catch(e) {}

    // Enrich with Alpha Vantage news (6h cache — 25 calls/day quota)
    let avArticles = null;
    try {
      avArticles = await AlphaVantageClient.getNewsWithSentiment();
    } catch(e) {}

    if (avArticles && avArticles.length > 0) {
      avArticles.forEach(a => {
        // Avoid duplicates by title similarity
        const isDup = items.some(existing =>
          existing.title.toLowerCase().slice(0, 40) === a.title.toLowerCase().slice(0, 40)
        );
        if (isDup) return;
        const avSentiment = a.sentimentScore > 0.2 ? 'bullish' : a.sentimentScore < -0.2 ? 'bearish' : 'neutral';
        items.push({
          title: a.title,
          description: a.summary,
          source: a.source + ' (AV)',
          sourceUrl: a.sourceUrl,
          type: 'stocks',
          importance: Math.abs(a.sentimentScore) > 0.3 ? 'high' : 'medium',
          pubDate: a.pubDate,
          link: a.link,
          symbols: a.symbols.filter(s => WATCH_SYMBOLS[s.toLowerCase()] || s.length <= 5),
          sentiment: avSentiment,
          category: 'Multi-sources',
        });
      });
      // Re-sort by importance
      items.sort((a, b) => {
        const imp = { high: 3, medium: 2, low: 1 };
        return (imp[b.importance] || 1) - (imp[a.importance] || 1);
      });
    }

    // Recalculate symbolMentions with enriched items
    const symbolMentions2 = {};
    items.forEach(item => {
      item.symbols.forEach(sym => {
        if (!symbolMentions2[sym]) symbolMentions2[sym] = { count: 0, bullish: 0, bearish: 0 };
        symbolMentions2[sym].count++;
        if (item.sentiment === 'bullish') symbolMentions2[sym].bullish++;
        if (item.sentiment === 'bearish') symbolMentions2[sym].bearish++;
      });
    });

    const result = { items, symbolMentions: symbolMentions2, alerts, fetchedAt: now, hasAlphaVantage: !!avArticles };
    _cache = result;
    _lastFetch = now;
    return result;
  }

  function generateSummary(data, fearGreed) {
    const lines = [];
    const d = new Date();
    const hour = d.getHours();
    const session = hour < 10 ? 'matin' : hour < 14 ? 'matinée' : hour < 18 ? 'après-midi' : 'soirée';

    lines.push('📰 Résumé du marché — ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + session);
    lines.push('');

    // Market context
    const analysis = window.__MTP?.lastAnalysis;
    if (analysis?.tradeable) {
      const nb = analysis.tradeable.length;
      const strong = analysis.tradeable.filter(a => a.adjScore >= 70).length;
      if (strong > 0) lines.push('🎯 ' + strong + ' signal' + (strong > 1 ? 's' : '') + ' fort' + (strong > 1 ? 's' : '') + ' détecté' + (strong > 1 ? 's' : '') + ' sur ' + nb + ' actifs analysés');
      else if (nb > 5) lines.push('📊 ' + nb + ' opportunités modérées — pas de signal fort ce moment');
      else lines.push('😴 Marché calme — peu de signaux disponibles');
    }

    if (fearGreed) {
      lines.push('');
      const emoji = fearGreed.value <= 25 ? '😱' : fearGreed.value <= 45 ? '😰' : fearGreed.value <= 55 ? '😐' : fearGreed.value <= 75 ? '😊' : '🤑';
      const label = fearGreed.value <= 25 ? 'Peur extrême' : fearGreed.value <= 45 ? 'Peur' : fearGreed.value <= 55 ? 'Neutre' : fearGreed.value <= 75 ? 'Avidité' : 'Avidité extrême';
      lines.push(emoji + ' Sentiment marché : ' + label + ' (' + fearGreed.value + '/100)');
      if (fearGreed.value <= 25) lines.push('   💡 La peur extreme est historiquement un signal d achat pour BTC/ETH');
      if (fearGreed.value >= 75) lines.push('   ⚠️ Avidite extreme — risque de correction, reduire les positions');
    }

    if (data.alerts?.length > 0) {
      lines.push('');
      lines.push('🔥 Actifs a surveiller (news + algo) :');
      data.alerts.slice(0, 5).forEach(a => {
        const dir = a.direction === 'long' ? 'Hausse' : 'Baisse';
        const sent = a.sentiment === 'bullish' ? '📈' : a.sentiment === 'bearish' ? '📉' : '➡️';
        lines.push(sent + ' ' + a.symbol + ' · ' + a.mentions + ' news · Score algo ' + a.algoScore + '/100 · Signal ' + dir);
      });
    }

    const topSymbols = Object.entries(data.symbolMentions)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    if (topSymbols.length > 0) {
      lines.push('');
      lines.push('📊 Plus mentionnes dans les news aujourd hui :');
      topSymbols.forEach(([sym, m]) => {
        const sent = m.bullish > m.bearish ? ' 📈' : m.bearish > m.bullish ? ' 📉' : '';
        lines.push('• ' + sym + ' · ' + m.count + ' mention' + (m.count > 1 ? 's' : '') + sent);
      });
    }

    // Upcoming events
    lines.push('');
    lines.push('📅 Evenements importants a surveiller :');
    const day = d.getDay();
    if (day === 3) lines.push('• Mercredi : Publication reserves petrole EIA');
    if (day === 4) lines.push('• Jeudi : Decisions taux BCE possibles / NFP US');
    if (day === 5) lines.push('• Vendredi : Cloture semaine — eviter nouveaux trades');
    lines.push('• Suivre : decisions Fed, BCE, donnees inflation, NFP');

    return lines.join('\n');
  }

  return { fetchNews, generateSummary };
})();



// ═══ Economic Calendar — Événements à venir ═══
const EconomicCalendar = (() => {

  function getUpcomingEvents() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const hour = now.getHours();

    // Static weekly calendar — real events rotate by weekday
    const weeklyEvents = {
      1: [ // Lundi
        { time: '10:00', title: 'PMI Manufacturier Zone Euro', impact: 'medium', zone: 'EUR', symbol: null },
        { time: '16:00', title: 'ISM Manufacturier USA', impact: 'high', zone: 'USD', symbol: null },
      ],
      2: [ // Mardi
        { time: '11:00', title: 'Confiance consommateurs Zone Euro', impact: 'medium', zone: 'EUR', symbol: null },
        { time: '14:30', title: 'Balance commerciale USA', impact: 'medium', zone: 'USD', symbol: null },
        { time: '15:00', title: 'JOLTS Offres emploi USA', impact: 'high', zone: 'USD', symbol: null },
      ],
      3: [ // Mercredi
        { time: '11:00', title: 'Inflation Zone Euro (IPC)', impact: 'high', zone: 'EUR', symbol: 'EURUSD' },
        { time: '14:30', title: 'ADP Emploi prive USA', impact: 'high', zone: 'USD', symbol: null },
        { time: '16:30', title: 'Stocks petrole EIA', impact: 'medium', zone: 'OIL', symbol: 'OIL' },
        { time: '20:00', title: 'Compte-rendu Fed (FOMC Minutes)', impact: 'high', zone: 'USD', symbol: null },
      ],
      4: [ // Jeudi
        { time: '08:00', title: 'Decisions BCE (si applicable)', impact: 'high', zone: 'EUR', symbol: 'EURUSD' },
        { time: '14:30', title: 'Demandes allocations chomage USA', impact: 'high', zone: 'USD', symbol: null },
        { time: '14:30', title: 'PIB USA (si applicable)', impact: 'high', zone: 'USD', symbol: null },
      ],
      5: [ // Vendredi
        { time: '14:30', title: 'NFP — Emplois non-agricoles USA', impact: 'high', zone: 'USD', symbol: null },
        { time: '14:30', title: 'Taux de chomage USA', impact: 'high', zone: 'USD', symbol: null },
        { time: '16:00', title: 'Confiance consommateurs Michigan', impact: 'medium', zone: 'USD', symbol: null },
      ],
    };

    const events = [];
    // Today remaining events
    const todayEvents = weeklyEvents[day] || [];
    todayEvents.forEach(e => {
      const [h, m] = e.time.split(':').map(Number);
      if (h * 60 + m > hour * 60) {
        events.push({ ...e, when: 'Aujourd\'hui ' + e.time, daysAhead: 0 });
      }
    });

    // Next 3 days
    for (let i = 1; i <= 3; i++) {
      const nextDay = (day + i) % 7;
      if (nextDay === 0 || nextDay === 6) continue; // Skip weekends
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayEvents = weeklyEvents[nextDay] || [];
      dayEvents.forEach(e => {
        events.push({ ...e, when: dayNames[nextDay] + ' ' + e.time, daysAhead: i });
      });
    }

    return events.slice(0, 8);
  }

  async function renderUpcomingSection() {
    // Try Finnhub first — fallback to static calendar
    let events = null;
    try {
      const finnhubEvents = await FinnhubClient.getEconomicCalendar();
      if (finnhubEvents && finnhubEvents.length > 0) {
        events = finnhubEvents.map(e => {
          const dt = e.time ? new Date(e.time) : null;
          const when = dt ? dt.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'}) + ' ' + dt.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : '';
          return { ...e, when, zone: e.country || '', symbol: null };
        });
      }
    } catch(err) {}

    // Fallback to static
    if (!events || !events.length) events = getUpcomingEvents();
    if (!events.length) return '';

    const items = events.slice(0, 8).map(e => {
      const impColor = e.impact === 'high' ? 'var(--loss)' : e.impact === 'medium' ? 'var(--signal-medium)' : 'var(--text-muted)';
      const impLabel = e.impact === 'high' ? '🔴 Fort' : e.impact === 'medium' ? '🟡 Moyen' : '⚪ Faible';
      const hasData = e.actual !== undefined || e.estimate !== undefined;
      const dataStr = hasData
        ? ' | Prev: ' + (e.prev !== undefined ? e.prev + (e.unit||'') : '—')
          + (e.estimate !== undefined ? ' Est: ' + e.estimate + (e.unit||'') : '')
          + (e.actual !== undefined ? ' Réel: ' + e.actual + (e.unit||'') : '')
        : '';
      return '<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-subtle);">'
        + '<div style="flex:1;">'
        + '<div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);">' + e.title + '</div>'
        + '<div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-top:2px;">'
        + (e.when ? '<span style="font-size:var(--text-xs);color:var(--text-muted);">' + e.when + '</span>' : '')
        + '<span style="font-size:var(--text-xs);font-weight:700;color:' + impColor + ';">' + impLabel + '</span>'
        + '<span style="font-size:var(--text-xs);background:var(--bg-elevated);padding:1px 4px;border-radius:3px;color:var(--text-muted);">' + e.zone + '</span>'
        + (dataStr ? '<span style="font-size:0.6rem;color:var(--text-muted);">' + dataStr + '</span>' : '')
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    return '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">'
      + '<div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;">📅 Événements à venir</div>'
      + '<div style="font-size:0.6rem;color:var(--text-muted);">Source: Finnhub</div>'
      + '</div>'
      + '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);">Ces événements peuvent créer des mouvements importants. Adapter la gestion du risque en conséquence.</div>'
      + items
      + '</div>';
  }

  return { getUpcomingEvents, renderUpcomingSection };
})();

// ═══ Écran Informations ═══
function renderInfoScreen() {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <div class="screen-title">📰 Informations</div>
        <div class="screen-subtitle">News & analyse du marché en temps réel</div>
      </div>

      <div id="info-loading" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-6);text-align:center;">
        <div style="font-size:2rem;margin-bottom:var(--space-3);">⏳</div>
        <div style="font-size:var(--text-sm);color:var(--text-muted);">Chargement des news et analyse en cours...</div>
      </div>
      <div id="claude-summary-section" style="display:none;"></div>

      <div id="info-content" style="display:none;"></div>
    </div>`;

  // Load async
  setTimeout(() => _loadInfoContent(), 100);
}

async function _loadInfoContent() {
  const container = document.getElementById('info-content');
  const loading = document.getElementById('info-loading');
  if (!container) return;

  try {
    const [newsData, trendingData] = await Promise.all([
      NewsEngine.fetchNews(),
      TrendingEngine.fetchTrending(),
    ]);

    const summary = NewsEngine.generateSummary(newsData, trendingData.fearGreed);
    const fg = trendingData.fearGreed;

    let html = '';

    // Résumé algo
    html += `<div style="background:rgba(0,229,160,0.06);border:1px solid rgba(0,229,160,0.2);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">🧠 Résumé généré par l'algo</div>
      <pre style="font-family:var(--font-body);font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;line-height:1.8;">${summary}</pre>
    </div>`;

    // Actifs à surveiller
    if (newsData.alerts?.length > 0) {
      html += `<div style="margin-bottom:var(--space-5);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">🎯 Actifs détectés — News + Signal technique</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          ${newsData.alerts.slice(0, 5).map(a => {
            const color = a.algoScore >= 70 ? 'var(--profit)' : 'var(--signal-medium)';
            const sent = a.sentiment === 'bullish' ? '📈' : a.sentiment === 'bearish' ? '📉' : '➡️';
            const dir = a.direction === 'long' ? '↑ Hausse' : '↓ Baisse';
            return `<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-4);display:flex;align-items:center;justify-content:space-between;cursor:pointer;" data-screen="asset-detail" data-symbol="${a.symbol}">
              <div style="display:flex;align-items:center;gap:var(--space-3);">
                <span style="font-size:1.4rem;">${sent}</span>
                <div>
                  <div style="font-family:var(--font-mono);font-weight:700;">${a.symbol}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);">${a.mentions} news · ${dir}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-mono);font-weight:700;color:${color};">${a.algoScore}/100</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">Score algo</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    // News récentes — structured cards
    if (newsData.items?.length > 0) {
      // Separate high importance from regular
      const highItems = newsData.items.filter(i => i.importance === 'high').slice(0, 4);
      const otherItems = newsData.items.filter(i => i.importance !== 'high').slice(0, 8);

      const renderNewsCard = (item) => {
        const sent = item.sentiment === 'bullish' ? '📈' : item.sentiment === 'bearish' ? '📉' : '➡️';
        const impColor = item.importance === 'high' ? 'var(--loss)' : item.importance === 'medium' ? 'var(--signal-medium)' : 'var(--text-muted)';
        const impLabel = item.importance === 'high' ? 'Important' : item.importance === 'medium' ? 'Notable' : '';
        const syms = item.symbols.length > 0 ? item.symbols.map(s => '<span style="font-size:0.6rem;background:var(--bg-elevated);padding:1px 4px;border-radius:3px;">' + s + '</span>').join(' ') : '';
        const pubTime = item.pubDate ? (() => { try { const d = new Date(item.pubDate); return d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'}) + ' ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}); } catch(e) { return ''; } })() : '';
        return '<a href="' + item.link + '" target="_blank" rel="noopener" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:3px solid ' + (item.importance === 'high' ? 'var(--loss)' : 'var(--border-medium)') + ';border-radius:var(--card-radius);padding:var(--space-4);display:block;text-decoration:none;">'
          + '<div style="display:flex;align-items:flex-start;gap:var(--space-3);">'
          + '<span style="font-size:1rem;flex-shrink:0;">' + sent + '</span>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:4px;">'
          + '<span style="font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:3px;background:var(--bg-elevated);color:var(--text-muted);">' + item.category + '</span>'
          + (impLabel ? '<span style="font-size:0.6rem;font-weight:700;color:' + impColor + ';">' + impLabel + '</span>' : '')
          + (pubTime ? '<span style="font-size:0.6rem;color:var(--text-muted);">' + pubTime + '</span>' : '')
          + '</div>'
          + '<div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);line-height:1.4;margin-bottom:4px;">' + item.title + '</div>'
          + (item.description ? '<div style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.4;margin-bottom:4px;">' + item.description + '</div>' : '')
          + '<div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">'
          + '<span style="font-size:var(--text-xs);color:var(--accent);">🔗 ' + item.source + '</span>'
          + syms
          + '</div>'
          + '</div>'
          + '</div>'
          + '</a>';
      };

      if (highItems.length > 0) {
        html += '<div style="margin-bottom:var(--space-5);">'
          + '<div style="font-size:var(--text-xs);font-weight:700;color:var(--loss);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">🔴 À la une aujourd\'hui</div>'
          + '<div style="display:flex;flex-direction:column;gap:var(--space-3);">'
          + highItems.map(renderNewsCard).join('')
          + '</div></div>';
      }

      if (otherItems.length > 0) {
        html += '<div style="margin-bottom:var(--space-5);">'
          + '<div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">📰 Autres actualités</div>'
          + '<div style="display:flex;flex-direction:column;gap:var(--space-3);">'
          + otherItems.map(renderNewsCard).join('')
          + '</div></div>';
      }
    }

    // Fear & Greed in News
    if (fg) {
      const fgColor2 = fg.value <= 25 ? 'var(--loss)' : fg.value <= 45 ? '#ff8c00' : fg.value <= 55 ? 'var(--text-muted)' : 'var(--profit)';
      const fgLabel2 = fg.value <= 20 ? 'Peur extreme' : fg.value <= 40 ? 'Peur' : fg.value <= 60 ? 'Neutre' : fg.value <= 80 ? 'Cupidite' : 'Cupidite extreme';
      const fgEmoji2 = fg.value <= 20 ? '😱' : fg.value <= 40 ? '😰' : fg.value <= 60 ? '😐' : fg.value <= 80 ? '😊' : '🤑';
      const fgd2 = _getFGData(fg.value);
      html += '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">'
        + '<div style="display:flex;align-items:center;gap:var(--space-2);">'
        + '<span style="font-size:1.5rem;">' + fgEmoji2 + '</span>'
        + '<div><div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Fear & Greed Index</div>'
        + '<div style="font-size:var(--text-md);font-weight:700;color:' + fgColor2 + ';">' + fgLabel2 + '</div></div>'
        + '</div>'
        + '<div style="font-family:var(--font-mono);font-size:1.8rem;font-weight:700;color:' + fgColor2 + ';">' + fg.value + '<span style="font-size:var(--text-xs);color:var(--text-muted);">/100</span></div>'
        + '</div>'
        + '<div style="height:6px;background:linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#00e5a0);border-radius:3px;position:relative;margin-bottom:var(--space-3);">'
        + '<div style="position:absolute;top:50%;left:' + fg.value + '%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:white;border:2px solid ' + fgColor2 + ';"></div>'
        + '</div>'
        + '<div style="font-size:var(--text-xs);color:var(--text-secondary);font-weight:600;margin-bottom:4px;">' + fgd2.short + '</div>'
        + '<div style="font-size:var(--text-xs);color:var(--text-muted);">' + fgd2.caution + '</div>'
        + '</div>';
    }

    // Add upcoming events calendar (async Finnhub)
    html += await EconomicCalendar.renderUpcomingSection();

    const avLabel = newsData.hasAlphaVantage
      ? '✅ Alpha Vantage · '
      : '⚠️ Alpha Vantage indisponible · ';
    html += '<div style="background:var(--bg-elevated);border-radius:8px;padding:var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);text-align:center;">'
      + avLabel
      + 'Reuters · CoinDesk · Yahoo Finance · MarketWatch · Aktionnaire · Boursorama<br>'
      + 'Mise a jour toutes les 30 min · Prochaine dans <span data-trending-countdown>--</span>'
      + '</div>';

    container.innerHTML = html;
    container.style.display = '';
    if (loading) loading.style.display = 'none';

    // Attach click events for asset alerts
    container.querySelectorAll('[data-screen="asset-detail"]').forEach(el => {
      el.addEventListener('click', () => Router.navigate('asset-detail', { symbol: el.dataset.symbol }));
    });

    // Claude AI summary (async, non-blocking)
    const claudeSection = document.getElementById('claude-summary-section');
    if (claudeSection) {
      claudeSection.style.display = '';
      claudeSection.innerHTML = '<div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);"><div style="font-size:var(--text-xs);font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">🤖 Analyse IA en cours...</div><div style="font-size:var(--text-sm);color:var(--text-muted);">Claude analyse les news du jour...</div></div>';
      
      ClaudeAI.summarizeNews(newsData.items, trendingData.fearGreed).then(summary => {
        const stats = ClaudeAI.getCallStats();
        claudeSection.innerHTML = '<div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">' +
          '<div style="font-size:var(--text-xs);font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.1em;">🤖 Analyse IA — Claude</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);">' + stats.remaining + ' analyses restantes aujourd\'hui</div>' +
          '</div>' +
          '<div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">' + summary + '</div>' +
          '</div>';
      }).catch(() => {
        claudeSection.style.display = 'none';
      });
    }

  } catch(e) {
    if (loading) loading.innerHTML = `<div style="text-align:center;padding:var(--space-6);"><div style="font-size:1.5rem;">⚠️</div><div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-3);">Impossible de charger les news.<br>Vérifiez votre connexion.</div></div>`;
  }
}


// ═══ SmartAlerts — Détection automatique de conditions optimales ═══
const SmartAlerts = (() => {
  const CHECK_INTERVAL_CRYPTO = 15 * 60 * 1000;  // 15 min
  const CHECK_INTERVAL_STOCKS = 30 * 60 * 1000;  // 30 min
  let _lastCheck = {};
  let _firedAlerts = new Set();

  function _allFactorsGreen(asset) {
    if (!asset || asset.error) return { green: false, reasons: [] };

    const reasons = [];
    const issues = [];
    const ind = asset.indicators;

    // Score minimum
    if (asset.adjScore >= 70) reasons.push('✅ Score fort (' + asset.adjScore + '/100)');
    else { issues.push('❌ Score insuffisant (' + asset.adjScore + '/100)'); }

    // Direction claire
    if (asset.direction !== 'neutral') reasons.push('✅ Direction claire (' + (asset.direction === 'long' ? '↑ Hausse' : '↓ Baisse') + ')');
    else issues.push('❌ Signal neutre');

    // RSI zone idéale
    if (ind?.rsi) {
      if (ind.rsi > 35 && ind.rsi < 65) reasons.push('✅ RSI équilibré (' + ind.rsi.toFixed(0) + ')');
      else issues.push('⚠️ RSI extrême (' + ind.rsi.toFixed(0) + ')');
    }

    // Volume
    if (ind?.relVol > 1.0) reasons.push('✅ Volume supérieur à la moyenne');
    else issues.push('⚠️ Volume faible');

    // Tendance ADX
    if (ind?.adx > 20) reasons.push('✅ Tendance confirmée (ADX ' + ind.adx?.toFixed(0) + ')');
    else issues.push('⚠️ Tendance faible');

    // Marché ouvert
    const marketOpen = MarketHours.isOpen(asset.symbol);
    if (marketOpen) reasons.push('✅ Marché ouvert');
    else issues.push('❌ Marché fermé');

    // Timing optimal
    const timing = RiskCalculator.isOptimalTiming(asset.symbol, asset.assetClass);
    if (timing.optimal) reasons.push('✅ Moment optimal pour entrer');
    else if (timing.score > 50) reasons.push('⚠️ ' + timing.reasons[0]);
    else issues.push('❌ Mauvais timing');

    // Ichimoku si disponible
    if (ind?.ichimoku) {
      const ichOk = asset.direction === 'long' ? ind.ichimoku.bullish : ind.ichimoku.bearish;
      if (ichOk) reasons.push('✅ Ichimoku favorable');
    }

    // MACD
    if (ind?.macd) {
      const macdOk = asset.direction === 'long' ? ind.macd.aboveZero : !ind.macd.aboveZero;
      if (macdOk) reasons.push('✅ MACD aligné');
    }

    const green = issues.filter(i => i.startsWith('❌')).length === 0 && asset.adjScore >= 70 && marketOpen;
    return { green, reasons, issues, score: asset.adjScore };
  }

  function _isAlreadyInPosition(symbol) {
    const positions = [...Storage.getSimPositions(), ...Storage.getRealPositions()];
    return positions.some(p => p.symbol === symbol);
  }

  async function checkAllAssets() {
    const analysis = window.__MTP?.lastAnalysis;
    if (!analysis?.tradeable) return;

    const candidates = analysis.tradeable.filter(a =>
      a.adjScore >= 70 &&
      a.direction !== 'neutral' &&
      !_isAlreadyInPosition(a.symbol) &&
      !_firedAlerts.has(a.symbol + '_' + a.direction)
    );

    for (const asset of candidates) {
      const check = _allFactorsGreen(asset);
      if (!check.green) continue;

      // Throttle: don't re-alert same asset for 4 hours
      const key = asset.symbol + '_' + asset.direction;
      const lastFired = _lastCheck[key] || 0;
      if (Date.now() - lastFired < 4 * 60 * 60 * 1000) continue;

      // Calculate optimal SL/TP
      const capital = Storage.getSimCapital();
      const settings = Storage.getSettings();
      const ind = asset.indicators;
      const optSL = RiskCalculator.optimalStop(asset.price, ind?.atr, asset.direction, ind);
      const rrRatio = RiskCalculator.dynamicRR(asset.adjScore);
      const optTP = RiskCalculator.takeProfitEstimate(asset.price, optSL, asset.direction, rrRatio);
      const sizing = RiskCalculator.optimalPositionSize(capital, settings.riskPerTrade, asset.price, optSL, ind?.atrPct || 2);

      // Fire notification
      const dir = asset.direction === 'long' ? '↑ Hausse' : '↓ Baisse';
      const msg = 'Signal optimal — ' + asset.symbol + ' ' + dir + ' Score ' + asset.adjScore + '/100 | SL : ' + Fmt.price(optSL) + ' TP : ' + Fmt.price(optTP) + ' R/R ' + rrRatio + ':1 | Tous les facteurs au vert';

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('ManiTradePro — Signal optimal détecté', {
            body: msg, icon: '/ManiTradePro/icon.png', tag: key,
          });
        } catch(e) {}
      }

      // In-app toast
      UI.toast('🎯 ' + asset.symbol + ' ' + dir + ' — Score ' + asset.adjScore + '/100 — Tous les feux au vert !', 'success', 8000);

      // Claude analysis of the signal (async)
      try {
        const newsData = await NewsEngine.fetchNews().catch(() => ({ items: [] }));
        ClaudeAI.analyzeSignal(asset, newsData.items || []).then(analysis => {
          if (analysis && !analysis.startsWith('⚠️')) {
            UI.toast('🤖 ' + asset.symbol + ': ' + analysis.substring(0, 100) + '...', 'info', 10000);
          }
        }).catch(() => {});
      } catch(e) {}

      // Store alert
      _lastCheck[key] = Date.now();
      _firedAlerts.add(key);
      setTimeout(() => _firedAlerts.delete(key), 4 * 60 * 60 * 1000);

      // Log to Storage
      const alerts = Storage.getAlerts();
      alerts.unshift({
        id: 'smart_' + Date.now(),
        type: 'optimal_signal',
        symbol: asset.symbol,
        direction: asset.direction,
        score: asset.adjScore,
        price: asset.price,
        stopLoss: optSL,
        takeProfit: optTP,
        rrRatio,
        reasons: check.reasons,
        firedAt: Date.now(),
      });
      Storage.saveAlerts(alerts.slice(0, 50));
    }
  }

  function init() {
    // Check every 15 min
    setInterval(() => checkAllAssets(), CHECK_INTERVAL_CRYPTO);
    // First check after 30s (let data load first)
    setTimeout(() => checkAllAssets(), 30000);
    console.log('[SmartAlerts] Surveillance des signaux optimaux activée');
  }

  function getRecentAlerts() {
    return Storage.getAlerts().filter(a => a.type === 'optimal_signal').slice(0, 10);
  }

  return { init, checkAllAssets, getRecentAlerts, _allFactorsGreen };
})();


// ═══ ClaudeAI — Analyse intelligente via Worker sécurisé ═══
const ClaudeAI = (() => {
  const PROXY = 'https://aged-bar-257a.emmanueldelasse.workers.dev/claude';
  const _cache = new Map();
  const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 heures
  let _callsToday = 0;
  let _callDate = '';
  const MAX_CALLS_DAY = 50;

  const SUPABASE_URL = 'https://ukgfyhdzbfhxpmnhdlgq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZ2Z5aGR6YmZoeHBtbmhkbGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTI3NDYsImV4cCI6MjA5MDIyODc0Nn0.BJ1yb-5bCam0MLR2tjOp3JN56MJeK22HxqGbJpJM1w0';
  const SB_HEADERS = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

  // Local cache pour éviter trop d'appels Supabase
  let _localCount = null;
  let _localDate = '';
  let _lastSbSync = 0;
  const SB_SYNC_INTERVAL = 60 * 1000; // sync Supabase max toutes les 60s

  function _getToday() { return new Date().toISOString().split('T')[0]; }

  // Lire le compteur depuis Supabase (avec fallback localStorage)
  async function _fetchCallCount() {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/claude_usage?id=eq.1', {
        headers: SB_HEADERS, signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) throw new Error('Supabase error');
      const data = await r.json();
      const row = data?.[0];
      if (!row) return { count: 0, date: _getToday() };
      // Si nouvelle journée, reset
      if (row.date !== _getToday()) return { count: 0, date: _getToday() };
      return { count: row.count || 0, date: row.date };
    } catch(e) {
      // Fallback localStorage
      const stored = localStorage.getItem('mtp_claude_calls');
      if (!stored) return { count: 0, date: _getToday() };
      try { return JSON.parse(stored); } catch(e2) { return { count: 0, date: _getToday() }; }
    }
  }

  // Sauvegarder le compteur dans Supabase + localStorage
  async function _saveCallCount(count, date) {
    // localStorage immédiat
    localStorage.setItem('mtp_claude_calls', JSON.stringify({ count, date }));
    // Supabase async (non-bloquant)
    try {
      await fetch(SUPABASE_URL + '/rest/v1/claude_usage?id=eq.1', {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ count, date, updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(5000),
      });
    } catch(e) {} // Silencieux — localStorage suffit en cas d'erreur
  }

  function _getCallCount() {
    const today = _getToday();
    // Utilise le cache local si disponible et même jour
    if (_localCount !== null && _localDate === today) {
      return { count: _localCount, date: today };
    }
    // Fallback localStorage synchrone
    const stored = localStorage.getItem('mtp_claude_calls');
    if (!stored) return { count: 0, date: today };
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date !== today) return { count: 0, date: today };
      _localCount = parsed.count;
      _localDate = today;
      return parsed;
    } catch(e) { return { count: 0, date: today }; }
  }

  async function _incrementCalls() {
    const today = _getToday();
    // Sync Supabase si nécessaire
    if (Date.now() - _lastSbSync > SB_SYNC_INTERVAL) {
      const sbData = await _fetchCallCount();
      _localCount = sbData.count;
      _localDate = sbData.date;
      _lastSbSync = Date.now();
    }
    const current = _localCount !== null && _localDate === today ? _localCount : 0;
    const newCount = current + 1;
    _localCount = newCount;
    _localDate = today;
    await _saveCallCount(newCount, today);
    return newCount;
  }

  async function _syncFromSupabase() {
    const data = await _fetchCallCount();
    _localCount = data.count;
    _localDate = data.date;
    _lastSbSync = Date.now();
    localStorage.setItem('mtp_claude_calls', JSON.stringify(data));
  }

  function _isLimited() {
    const data = _getCallCount();
    const today = _getToday();
    return data.date === today && data.count >= MAX_CALLS_DAY;
  }

  async function _ask(systemPrompt, userPrompt, cacheKey) {
    // Check cache
    if (cacheKey) {
      const cached = _cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.text;
    }

    // Check daily limit
    if (_isLimited()) {
      return '⚠️ Limite quotidienne atteinte (50 analyses/jour). Revenez demain.';
    }

    try {
      const r = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!r.ok) {
        if (r.status === 500) return '⚠️ Clé Claude non configurée dans Cloudflare. Ajoutez CLAUDE_API_KEY dans les variables.';
        return '⚠️ Erreur IA (' + r.status + ')';
      }

      const data = await r.json();
      const text = data.content?.[0]?.text || 'Analyse indisponible';
      await _incrementCalls();

      if (cacheKey) _cache.set(cacheKey, { text, ts: Date.now() });
      return text;
    } catch(e) {
      return '⚠️ IA temporairement indisponible: ' + e.message;
    }
  }

  // ── Résumé News quotidien
  async function summarizeNews(newsItems, fearGreed) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = 'news_summary_' + today;
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL * 12) return cached.text;

    // Prioritize Alpha Vantage articles (multi-source, pre-analyzed)
    const avItems = newsItems.filter(n => n.source && n.source.includes('(AV)'));
    const rssItems = newsItems.filter(n => !n.source?.includes('(AV)'));
    const topItems = [
      ...avItems.slice(0, 6),
      ...rssItems.slice(0, 6),
    ].slice(0, 10);

    const newsTitles = topItems.map(n => {
      const sentLabel = n.sentiment === 'bullish' ? '[+]' : n.sentiment === 'bearish' ? '[-]' : '[=]';
      const syms = n.symbols.length > 0 ? ' (' + n.symbols.join(',') + ')' : '';
      return '- ' + sentLabel + ' ' + n.title + syms + ' [' + n.source + ']';
    }).join('\n');
    const fg = fearGreed ? 'Fear & Greed: ' + fearGreed.value + '/100 (' + fearGreed.label + ')' : '';
    const analysis = window.__MTP?.lastAnalysis;
    const signaux = analysis?.tradeable?.length || 0;
    const forts = analysis?.tradeable?.filter(a => a.adjScore >= 70).length || 0;

    const system = 'Tu es un analyste financier senior specialise dans les marches mondiaux. Tu recois des titres de presse de plusieurs sources serieuses. Produis une synthese structuree en francais, claire et factuelle. Distingue les faits confirmes des interpretations. Ne jamais inventer de donnees. Rester prudent et objectif.';
    const prompt = 'CONTEXTE MARCHE DU JOUR\n\n'
      + 'SENTIMENT CRYPTO: ' + fg + '\n'
      + 'SIGNAUX ALGO: ' + signaux + ' opportunites dont ' + forts + ' forts\n\n'
      + 'TITRES DE PRESSE:\n' + newsTitles + '\n\n'
      + 'Produis une analyse en 4 sections:\n'
      + '1. CE QUI COMPTE (2-3 faits majeurs)\n'
      + '2. ACTIFS CONCERNES (lesquels et pourquoi)\n'
      + '3. CONTEXTE MARCHE (interpretation prudente)\n'
      + '4. INCERTITUDES (points a surveiller, limites)';

    return _ask(system, prompt, cacheKey);
  }

  // ── Analyse signal fort
  async function analyzeSignal(asset, newsItems) {
    const cacheKey = 'signal_' + asset.symbol + '_' + new Date().toISOString().split('T')[0];
    const relevantNews = newsItems.filter(n => n.symbols.includes(asset.symbol)).slice(0, 3);
    const newsContext = relevantNews.length > 0
      ? 'News pertinentes:\n' + relevantNews.map(n => '- ' + n.title).join('\n')
      : 'Aucune news spécifique trouvée.';

    const system = 'Tu es un analyste financier expert. Analyse un signal de trading et donne un avis court et factuel en français. Maximum 3 phrases.';
    const prompt = 'Signal de trading détecté:\n' +
      'Actif: ' + asset.symbol + ' (' + asset.name + ')\n' +
      'Direction: ' + (asset.direction === 'long' ? 'Hausse' : 'Baisse') + '\n' +
      'Score algo: ' + asset.adjScore + '/100\n' +
      'RSI: ' + (asset.indicators?.rsi?.toFixed(0) || 'N/A') + '\n' +
      'ADX: ' + (asset.indicators?.adx?.toFixed(0) || 'N/A') + '\n' +
      newsContext + '\n\n' +
      'Donne ton avis sur ce signal en 2-3 phrases. Est-il fiable ? Quels risques ?';

    return _ask(system, prompt, cacheKey);
  }

  // ── Analyse historique trades
  async function analyzeHistory(trades) {
    if (!trades || trades.length < 3) return 'Pas assez de trades pour une analyse (minimum 3).';
    const cacheKey = 'history_' + trades.length + '_' + new Date().toISOString().split('T')[0];

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = Math.round((wins.length / trades.length) * 100);
    const avgWin = wins.reduce((s, t) => s + t.pnlPct, 0) / (wins.length || 1);
    const avgLoss = losses.reduce((s, t) => s + t.pnlPct, 0) / (losses.length || 1);

    const summary = trades.slice(0, 10).map(t =>
      t.symbol + ' ' + (t.direction === 'long' ? '↑' : '↓') + ' ' + (t.pnl > 0 ? '+' : '') + t.pnlPct?.toFixed(1) + '%'
    ).join(', ');

    const system = 'Tu es un coach de trading expert. Analyse l historique de trades et identifie les patterns, forces et faiblesses. Sois direct et constructif. Maximum 4 points.';
    const prompt = 'Historique de trading:\n' +
      'Total trades: ' + trades.length + '\n' +
      'Win rate: ' + winRate + '%\n' +
      'Gain moyen: +' + avgWin.toFixed(1) + '%\n' +
      'Perte moyenne: ' + avgLoss.toFixed(1) + '%\n' +
      'Derniers trades: ' + summary + '\n\n' +
      'Analyse ce profil de trader: patterns identifiés, biais comportementaux, conseils d amélioration.';

    return _ask(system, prompt, cacheKey);
  }

  // ── Coaching personnalisé
  async function getCoaching(capital, history, winRate) {
    const cacheKey = 'coaching_' + new Date().toISOString().split('T')[0];
    const system = 'Tu es un coach de trading bienveillant et expert. Donne des conseils personnalisés basés sur le profil du trader. Sois encourageant mais réaliste. Maximum 3 conseils actionnables.';
    const prompt = 'Profil trader:\n' +
      'Capital: ' + capital + '€\n' +
      'Nombre de trades: ' + (history?.length || 0) + '\n' +
      'Win rate: ' + (winRate || 0) + '%\n\n' +
      'Donne 3 conseils personnalisés et actionnables pour améliorer ses performances.';

    return _ask(system, prompt, cacheKey);
  }

  // ── Interprétation événement macro
  async function interpretMacroEvent(eventTitle, openPositions) {
    const posContext = openPositions.map(p => p.symbol + ' ' + (p.direction === 'long' ? '↑' : '↓')).join(', ');
    const system = 'Tu es un macro-économiste expert. Explique l impact probable d un événement sur les marchés et les positions ouvertes. Sois factuel et concis. Maximum 3 impacts.';
    const prompt = 'Événement: ' + eventTitle + '\n' +
      'Positions ouvertes: ' + (posContext || 'Aucune') + '\n\n' +
      'Explique l impact probable sur les marchés et ces positions spécifiquement.';

    return _ask(system, prompt, null); // Pas de cache pour les événements
  }

  // ── Rapport hebdomadaire
  async function weeklyReport(trades, topSignals) {
    const weekKey = 'weekly_' + Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const wins = trades.filter(t => t.pnl > 0).length;
    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const signals = topSignals.slice(0, 5).map(a => a.symbol + ' (score ' + a.adjScore + ')').join(', ');

    const system = 'Tu es un analyste financier. Génère un rapport hebdomadaire de trading clair et structuré en français. Maximum 5 points.';
    const prompt = 'Semaine de trading:\n' +
      'Trades cette semaine: ' + trades.length + '\n' +
      'Trades gagnants: ' + wins + '\n' +
      'P&L total: ' + (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '€\n' +
      'Meilleurs signaux détectés: ' + (signals || 'Aucun') + '\n\n' +
      'Génère un rapport de la semaine et les opportunités à surveiller la semaine prochaine.';

    return _ask(system, prompt, weekKey);
  }

  function getCallStats() {
    const data = _getCallCount();
    const today = new Date().toISOString().split('T')[0];
    const count = data.date === today ? data.count : 0;
    return { count, max: MAX_CALLS_DAY, remaining: MAX_CALLS_DAY - count };
  }

  return { summarizeNews, analyzeSignal, analyzeHistory, getCoaching, interpretMacroEvent, weeklyReport, getCallStats, _syncFromSupabase, _ask };
})();


async function _generateWeeklyReport() {
  UI.toast('🤖 Génération du rapport en cours...', 'info');
  const history = Storage.getSimHistory().filter(t => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return t.closedAt > weekAgo;
  });
  const analysis = window.__MTP?.lastAnalysis;
  const topSignals = analysis?.tradeable?.slice(0, 5) || [];
  const report = await ClaudeAI.weeklyReport(history, topSignals);
  
  UI.modal('📊 Rapport hebdomadaire', `
    <div style="padding:var(--space-4);">
      <div style="font-size:var(--text-xs);color:#8b5cf6;font-weight:700;margin-bottom:var(--space-3);">🤖 Généré par Claude IA</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">${report}</div>
    </div>
  `);
}

// ═══ BOOT ═══
async function boot() {
  console.log('🚀 ManiTradePro V1 — démarrage…');




  // Migration capital corrompu
  try {
    const rawCap = localStorage.getItem('mtp_sim_capital');
    if (rawCap) {
      const parsed = JSON.parse(rawCap);
      if (typeof parsed === 'object' && parsed !== null) {
        localStorage.setItem('mtp_sim_capital', JSON.stringify(parsed.current || parsed.initial || 10000));
      }
    }
  } catch(e) {}

  // 1. Storage
  Storage.init();
  window.__prices = {};

  // 2. Twelve Data
  const apiKeysRaw = Storage.getApiKeys();
  TwelveDataClient.init(apiKeysRaw);
  window.__MTP.TwelveDataClient = TwelveDataClient;

  // 3. Binance
  const s = Storage.getSettings();
  BinanceClient.init(s.binanceApiKey || '', s.binanceSecret || '');
  window.__MTP.BinanceClient = BinanceClient;

  // 4. AlertManager
  await AlertManager.init();
  window.__MTP.AlertManager = AlertManager;

  // 5. AlertManager — sync positions existantes
  AlertManager.syncPositionAlerts();

  // 6. Router
  Router.register('dashboard',    renderDashboard);
  Router.register('opportunities',renderOpportunities);
  Router.register('asset-detail', renderAssetDetail);
  Router.register('portefeuille', () => { renderPortefeuille(); });
  Router.register('positions',    () => { renderPortefeuille(); }); // alias
  Router.register('simulation',   () => { renderPortefeuille(); }); // alias
  Router.register('settings',     () => { renderSettings(); });
  Router.register('news',         () => { renderInfoScreen(); });
  window.__MTP.Router = Router;

  // 7. Theme
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');

  // 8. Pre-fetch EUR/USD rate before any price display
  try {
    const eurRes = await fetch('https://aged-bar-257a.emmanueldelasse.workers.dev/binance/api/v3/ticker/price?symbol=EURUSDT', {
      signal: AbortSignal.timeout(5000)
    });
    if (eurRes.ok) {
      const eurData = await eurRes.json();
      const rate = parseFloat(eurData.price);
      if (rate > 0.5 && rate < 3.0) {
        window.__eurUsdRate = rate;
        BinanceClient._setEurUsdRate(rate);
        console.log('[Boot] EUR/USD rate:', rate);
      }
    }
  } catch(e) {
    window.__eurUsdRate = 1.08; // Safe default
    console.warn('[Boot] EUR/USD fetch failed, using 1.08');
  }

  // 8. Sync
  window.__MTP.Sync = Sync;

  // 9. Affichage immédiat (jamais bloquer sur réseau)
  try {
    window.__MTP.lastAnalysis = AnalysisEngine.analyzeAllSync();
  } catch(e) {
    console.warn('analyzeAllSync error:', e);
    window.__MTP.lastAnalysis = { all: [], tradeable: [], neutral: [], inactive: [] };
  }
  // Auto-add trending assets to watchlist
  WatchlistManager.autoAddTrending().catch(() => {});

  // Sync depuis Supabase au démarrage
  SupabaseDB.syncAll().then(ok => {
    if (ok) {
      window.__MTP.lastAnalysis = AnalysisEngine.analyzeAllSync();
      const cur = Router.getCurrent();
      if (['dashboard','portefeuille'].includes(cur)) Router.navigate(cur);
    }
  }).catch(() => {});

  // Multi-timeframe refresh every hour
  setInterval(() => refreshMultiTimeframe(), 60 * 60 * 1000);
  setTimeout(() => refreshMultiTimeframe(), 5000); // First run after 5s

  // Ping Supabase toutes les 6 jours pour éviter la mise en pause
  setInterval(() => SupabaseDB.ping().catch(() => {}), 6 * 24 * 60 * 60 * 1000);

  // Dynamic PWA icon
  (function() {
    const link = document.querySelector("link[rel~='apple-touch-icon']") || document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjgwIiBmaWxsPSIjMGEwZTFhIi8+CiAgPHRleHQgeD0iMjU2IiB5PSIzNDAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMjgwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzAwZTVhMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TTwvdGV4dD4KPC9zdmc+';
    document.head.appendChild(link);
  })();

  // Init smart signal alerts
  SmartAlerts.init();

  // Sync compteur Claude depuis Supabase au démarrage
  if (typeof ClaudeAI._syncFromSupabase === 'function') {
    ClaudeAI._syncFromSupabase().catch(() => {});
  }

  Router.navigate('dashboard');
  Router.attachNavClicks();

  // 10. Service Worker — avec détection de mise à jour
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/ManiTradePro/sw.js');
      
      // Vérifie les mises à jour
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouvelle version disponible — afficher bouton
            _showUpdateBanner(reg);
          }
        });
      });

      // Vérifier si une mise à jour est disponible au chargement
      reg.update().catch(() => {});
    } catch(e) {
      console.warn('[SW] Erreur enregistrement:', e);
    }
  }

  function _showUpdateBanner(reg) {
    const existing = document.getElementById('update-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--accent);color:var(--bg-primary);padding:12px 20px;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,229,160,0.4);display:flex;align-items:center;gap:8px;white-space:nowrap;';
    banner.innerHTML = '🔄 Mise à jour disponible — Appuyer pour recharger';
    banner.onclick = () => {
      reg.waiting?.postMessage('SKIP_WAITING');
      window.location.reload();
    };
    document.body.appendChild(banner);
  }

  // 11. Analyse + données réelles en arrière-plan
  setTimeout(async () => {
    try {
      const results = await AnalysisEngine.analyzeAll();
      window.__MTP.lastAnalysis = results;
      results.all.forEach(r => { if (r.price) window.__prices[r.symbol] = r.price; });
      // Vérifie les alertes avec les nouvelles données
      AlertManager.checkAlerts(results);
      // Refresh écran si toujours sur dashboard/opportunités
      const screen = Router.getCurrent();
      if (['dashboard', 'opportunities'].includes(screen)) Router.navigate(screen);
    } catch(e) { console.warn('⚠️ Erreur analyse :', e); }

    try { await RealDataClient.refreshAllPrices(Storage.getWatchlist()); } catch(e) {}
  }, 600);

  console.log('✅ ManiTradePro V1 prêt');
}

window.addEventListener('unhandledrejection', e => console.error('❌', e.reason));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
