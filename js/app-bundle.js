

// ============================================================
// ManiTradePro V1 — App Bundle (standalone, no ES modules)
// ============================================================
'use strict';

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
  prices: {
    'BTC':   { price: 67420.50, change24h: 2.34,  volume24h: 28_400_000_000 },
    'ETH':   { price: 3528.20,  change24h: 1.87,  volume24h: 14_200_000_000 },
    'AAPL':  { price: 213.45,   change24h: 0.62,  volume24h: 3_800_000_000  },
    'MSFT':  { price: 421.80,   change24h: 0.44,  volume24h: 2_100_000_000  },
    'TSLA':  { price: 176.30,   change24h: -1.23, volume24h: 5_600_000_000  },
    'NVDA':  { price: 875.60,   change24h: 3.12,  volume24h: 8_900_000_000  },
    'EURUSD':{ price: 1.0842,   change24h: 0.18,  volume24h: 0 },
    'GBPUSD':{ price: 1.2714,   change24h: -0.12, volume24h: 0 },
    'GOLD':  { price: 2318.40,  change24h: 0.75,  volume24h: 0 },
    'SPY':   { price: 523.80,   change24h: 0.51,  volume24h: 4_200_000_000  },
    'SOL':   { price: 172.40,   change24h: 4.21,  volume24h: 3_100_000_000  },
    'AMZN':  { price: 196.20,   change24h: 0.88,  volume24h: 2_800_000_000  },
  },

  generateOHLC: function(symbol, currentPrice, trend = 'up', volatility = 0.02) {
    const candles = [];
    let price = currentPrice * (trend === 'up' ? 0.75 : 1.25);
    const now = Date.now();
    for (let i = 130; i >= 0; i--) {
      const dayAgo = now - i * 86400000;
      const noise = (Math.random() - 0.5) * volatility;
      const trendBias = trend === 'up' ? 0.007 : (trend === 'down' ? -0.007 : 0.001);
      const open = price;
      const move = noise + trendBias;
      const close = price * (1 + move);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
      const low  = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
      const volMult = Math.abs(move) > volatility ? 2.5 : 1;
      const volume = 1_000_000 * (1 + Math.random() * 2) * volMult;
      candles.push({ ts: dayAgo, open, high, low, close, volume });
      price = close;
    }
    if (candles.length > 0 && MOCK_DATA.prices[symbol]) {
      candles[candles.length - 1].close = MOCK_DATA.prices[symbol].price;
    }
    return candles;
  },

  watchlist: [
    { symbol: 'BTC',    name: 'Bitcoin',        class: 'crypto',    trend: 'up',      volatility: 0.025 },
    { symbol: 'ETH',    name: 'Ethereum',       class: 'crypto',    trend: 'up',      volatility: 0.028 },
    { symbol: 'NVDA',   name: 'Nvidia',         class: 'stock',     trend: 'up',      volatility: 0.022 },
    { symbol: 'AAPL',   name: 'Apple',          class: 'stock',     trend: 'up',      volatility: 0.014 },
    { symbol: 'MSFT',   name: 'Microsoft',      class: 'stock',     trend: 'up',      volatility: 0.013 },
    { symbol: 'GOLD',   name: 'Or (XAU/USD)',   class: 'commodity', trend: 'up',      volatility: 0.008 },
    { symbol: 'EURUSD', name: 'Euro / Dollar',  class: 'forex',     trend: 'neutral', volatility: 0.005 },
    { symbol: 'TSLA',   name: 'Tesla',          class: 'stock',     trend: 'down',    volatility: 0.035 },
    { symbol: 'SOL',    name: 'Solana',         class: 'crypto',    trend: 'up',      volatility: 0.040 },
    { symbol: 'SPY',    name: 'S&P 500 ETF',    class: 'etf',       trend: 'up',      volatility: 0.010 },
    { symbol: 'AMZN',   name: 'Amazon',         class: 'stock',     trend: 'up',      volatility: 0.018 },
    { symbol: 'GBPUSD', name: 'Livre / Dollar', class: 'forex',     trend: 'down',    volatility: 0.006 },
  ],

  icons: {
    'BTC': '₿', 'ETH': 'Ξ', 'NVDA': 'N', 'AAPL': '',
    'MSFT': 'M', 'GOLD': 'Au', 'EURUSD': '€$', 'TSLA': 'T',
    'SOL': 'S', 'SPY': 'S&P', 'AMZN': 'A', 'GBPUSD': '£$',
  },

  sampleSimPositions: [
    { id: 'sim_001', mode: 'sim', symbol: 'BTC',  name: 'Bitcoin', direction: 'long', entryPrice: 64200.00, quantity: 0.156, invested: 10015.20, stopLoss: 61800.00, takeProfit: 72000.00, openedAt: Date.now() - 3 * 86400000 },
    { id: 'sim_002', mode: 'sim', symbol: 'NVDA', name: 'Nvidia',  direction: 'long', entryPrice: 845.00,   quantity: 11.83, invested: 9996.35,  stopLoss: 808.00,   takeProfit: 960.00,   openedAt: Date.now() - 7 * 86400000 },
    { id: 'sim_003', mode: 'sim', symbol: 'GOLD', name: 'Or',      direction: 'long', entryPrice: 2290.00,  quantity: 4.36,  invested: 9984.40,  stopLoss: 2240.00,  takeProfit: 2420.00,  openedAt: Date.now() - 14 * 86400000 },
  ],

  sampleTradeHistory: [
    { id: 'h001', symbol: 'ETH',  direction: 'long',  entryPrice: 3100,  exitPrice: 3420, pnl: 516.13,  pnlPct: 10.32, closedAt: Date.now() - 20 * 86400000, durationDays: 12 },
    { id: 'h002', symbol: 'AAPL', direction: 'long',  entryPrice: 198,   exitPrice: 210,  pnl: 302.02,  pnlPct: 6.06,  closedAt: Date.now() - 35 * 86400000, durationDays: 8  },
    { id: 'h003', symbol: 'TSLA', direction: 'short', entryPrice: 192,   exitPrice: 178,  pnl: 364.58,  pnlPct: 7.29,  closedAt: Date.now() - 42 * 86400000, durationDays: 5  },
    { id: 'h004', symbol: 'BTC',  direction: 'long',  entryPrice: 69000, exitPrice: 66500,pnl: -361.23, pnlPct: -3.62, closedAt: Date.now() - 55 * 86400000, durationDays: 3  },
    { id: 'h005', symbol: 'GOLD', direction: 'long',  entryPrice: 2180,  exitPrice: 2260, pnl: 366.97,  pnlPct: 3.67,  closedAt: Date.now() - 60 * 86400000, durationDays: 18 },
  ],

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

  marketRegime: {
    label: 'Tendance haussière',
    icon: '↗',
    color: 'var(--profit)',
    description: 'Régime favorable aux longs sur actifs liquides',
    score: 72,
  },
};

MOCK_DATA._ohlcCache = {};
MOCK_DATA.getOHLC = function(symbol) {
  if (!this._ohlcCache[symbol]) {
    const asset = this.watchlist.find(a => a.symbol === symbol);
    if (!asset) return [];
    const price = this.prices[symbol]?.price || 100;
    this._ohlcCache[symbol] = this.generateOHLC(symbol, price, asset.trend, asset.volatility);
  }
  return this._ohlcCache[symbol];
};

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
    const stored = get(KEYS.SIM_CAPITAL);
    if (stored === null) return MOCK_DATA.defaultSettings.simInitialCapital || 10000;
    if (typeof stored === 'object' && stored !== null) return stored.current || stored.initial || 10000;
    return typeof stored === 'number' ? stored : 10000;
  }
  function saveSimCapital(v) { return set(KEYS.SIM_CAPITAL, typeof v === 'object' ? (v.current || 10000) : v); }
  const setSimCapital = saveSimCapital;

  function getSimPositions() { const s = get(KEYS.SIM_POSITIONS); return s === null ? [...MOCK_DATA.sampleSimPositions] : s; }
  function saveSimPositions(p) { return set(KEYS.SIM_POSITIONS, p); }

  function getSimHistory() { const s = get(KEYS.SIM_HISTORY); return s === null ? [...MOCK_DATA.sampleTradeHistory] : s; }
  function saveSimHistory(h) { return set(KEYS.SIM_HISTORY, h); }

  function getRealPositions() { return get(KEYS.REAL_POSITIONS) || []; }
  function saveRealPositions(p) { return set(KEYS.REAL_POSITIONS, p); }

  function getWatchlist() { return get(KEYS.WATCHLIST) || MOCK_DATA.watchlist; }

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

  function init() {
    if (!get(KEYS.SETTINGS)) saveSettings({ ...MOCK_DATA.defaultSettings });
    if (get(KEYS.SIM_CAPITAL) === null) saveSimCapital(MOCK_DATA.defaultSettings.simInitialCapital || 10000);
    if (!get(KEYS.SIM_POSITIONS)) saveSimPositions([...MOCK_DATA.sampleSimPositions]);
    if (!get(KEYS.SIM_HISTORY))   saveSimHistory([...MOCK_DATA.sampleTradeHistory]);
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
  return { ema, emaSeries, sma, atr, adx, donchian, rsi, realizedVol, emaSlope, momentum, relativeVolume, isDonchianBreakoutUp, isDonchianBreakoutDown, computeAll };
})();

// ═══ riskCalculator.js ═══
const RiskCalculator = (() => {
  function initialStop(entryPrice, atr, direction, multiplier = 2) {
    if (!atr || !entryPrice) return null;
    return direction === 'long' ? entryPrice - multiplier * atr : entryPrice + multiplier * atr;
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
  return { initialStop, trailingStop, positionSize, takeProfitEstimate, riskRewardRatio, riskLevel, riskPenalty, openPnL, openPnLPct };
})();

// ═══ BinanceClient ═══
const BinanceClient = (() => {
  const BASE = 'https://api.binance.com';
  const BINANCE_PAIRS = { 'BTC': 'BTCEUR', 'ETH': 'ETHEUR', 'SOL': 'SOLEUR', 'BNB': 'BNBEUR' };
  const BINANCE_USDT  = { 'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT' };
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
    const pairEur = BINANCE_PAIRS[symbol], pairUsdt = BINANCE_USDT[symbol];
    if (!pairEur && !pairUsdt) return null;
    try {
      const pair = pairEur || pairUsdt;
      const r = await fetch(`${BASE}/api/v3/ticker/24hr?symbol=${pair}`, { signal: AbortSignal.timeout(6000), mode: 'cors' });
      if (!r.ok) return null;
      const d = await r.json();
      const price = parseFloat(d.lastPrice) / (pairEur ? 1 : _eurUsdRate);
      return { price, change24h: parseFloat(d.priceChangePercent), volume24h: parseFloat(d.quoteVolume), source: 'Binance' };
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
      const useUsdt = !BINANCE_PAIRS[symbol];
      return raw.map(k => ({
        ts: k[0],
        open:   parseFloat(k[1]) / (useUsdt ? _eurUsdRate : 1),
        high:   parseFloat(k[2]) / (useUsdt ? _eurUsdRate : 1),
        low:    parseFloat(k[3]) / (useUsdt ? _eurUsdRate : 1),
        close:  parseFloat(k[4]) / (useUsdt ? _eurUsdRate : 1),
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
  return { init, getPrice, getOHLC, testConnection, isConfigured };
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

  const COINGECKO_IDS = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin' };
  const YAHOO_TICKERS = { 'AAPL': 'AAPL', 'MSFT': 'MSFT', 'NVDA': 'NVDA', 'TSLA': 'TSLA', 'AMZN': 'AMZN', 'SPY': 'SPY', 'GOLD': 'GC=F', 'EURUSD': 'EURUSD=X', 'GBPUSD': 'GBPUSD=X' };
  const CORS_PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?url='];

  async function _fetchWithProxy(url) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(6000) }); if (r.ok) return r; } catch(e) {}
    for (const proxy of CORS_PROXIES) {
      try { const r = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) }); if (r.ok) return r; } catch(e) {}
    }
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
      if (!ticker.includes('=X') && ticker !== 'GC=F') priceEur = price * 0.92;
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
      if (!ticker.includes('=X') && ticker !== 'GC=F') candles.forEach(c => { c.open *= 0.92; c.high *= 0.92; c.low *= 0.92; c.close *= 0.92; });
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
    if (COINGECKO_IDS[symbol]) { candles = await BinanceClient.getOHLC(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); return candles; } }
    if (TwelveDataClient?.getTimeSeries) { candles = await TwelveDataClient.getTimeSeries(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); return candles; } }
    if (YAHOO_TICKERS[symbol]) { candles = await _getYahooOHLC(symbol); if (candles?.length >= 20) { _cacheSet(ck, candles); return candles; } }
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
    const adxOk = ind.adx !== null && ind.adx > 20, adxStr = ind.adx !== null && ind.adx > 25;
    add('ADX > 20 (tendance)', adxStr ? 20 : (adxOk ? 12 : 0), 20, adxOk, `ADX : ${ind.adx?.toFixed(1) || 'N/A'}`);
    const slopeOk = direction === 'long' ? ind.slope100 > 0 : ind.slope100 < 0, slopeStr = Math.abs(ind.slope100) > 0.05;
    add('Pente EMA 100 favorable', slopeOk ? (slopeStr ? 15 : 8) : 0, 15, slopeOk, `Pente : ${ind.slope100?.toFixed(3) || 'N/A'}%/j`);
    const mom3ok = direction === 'long' ? ind.mom3m > 2 : ind.mom3m < -2, mom3str = direction === 'long' ? ind.mom3m > 8 : ind.mom3m < -8;
    add('Momentum 3 mois', mom3str ? 15 : (mom3ok ? 8 : 0), 15, mom3ok, `Perf 3 mois : ${ind.mom3m?.toFixed(1) || 'N/A'}%`);
    const volOk = ind.relVol > 1.0, volStr = ind.relVol > 1.3;
    add('Volume > moyenne 20j', volStr ? 10 : (volOk ? 5 : 0), 10, volOk, `Vol. relative : ${ind.relVol?.toFixed(2) || 'N/A'}x`);
    const rsiNE = direction === 'long' ? ind.rsi !== null && ind.rsi < 75 : ind.rsi !== null && ind.rsi > 25;
    const rsiId = direction === 'long' ? ind.rsi > 40 && ind.rsi < 65 : ind.rsi > 35 && ind.rsi < 60;
    add('RSI non extrême', rsiId ? 10 : (rsiNE ? 5 : 0), 10, rsiNE, `RSI 14 : ${ind.rsi?.toFixed(1) || 'N/A'}`);
    const dist = ind.don55 ? (direction === 'long' ? ((ind.don55.upper - ind.price) / ind.price) * 100 : ((ind.price - ind.don55.lower) / ind.price) * 100) : 0;
    add('Espace libre Donchian', dist > 4 ? 10 : (dist > 1.5 ? 5 : 0), 10, dist > 1.5, `Distance : ${dist.toFixed(1)}%`);
    const volN = ind.vol20 !== null && ind.vol20 > 5 && ind.vol20 < 60;
    add('Volatilité normale', volN ? 10 : 0, 10, volN, `Vol annualisée : ${ind.vol20?.toFixed(1) || 'N/A'}%`);
    const bo = direction === 'long' ? ind.breakoutUp : ind.breakoutDown;
    add(`Cassure Donchian 55j`, bo ? 10 : 0, 10, bo, `Niveau : ${ind.don55 ? (direction === 'long' ? ind.don55.upper.toFixed(2) : ind.don55.lower.toFixed(2)) : 'N/A'}`);
    return { score: Math.round((total / max) * 100), criteria, rawScore: total, maxScore: max };
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
      const mp = MOCK_DATA.prices[symbol], mc = MOCK_DATA.getOHLC(symbol);
      if (mp && mc?.length >= 20) {
        const ind2 = Indicators.computeAll(mc);
        if (ind2) return { symbol, name, assetClass, price: mp.price, change24h: mp.change24h || 0, dataWarning: 'Données simulées', direction: 'neutral', score: 0, adjScore: 0, strength: 'weak', riskLevel: 'medium', isSolid: false, indicators: ind2, regime: { pass: false, reasons: [{ label: 'API indisponible', pass: false }] } };
      }
      return { symbol, name, assetClass, price: 0, change24h: 0, error: 'Données indisponibles', direction: 'neutral', score: 0, adjScore: 0, strength: 'weak', riskLevel: 'high', isSolid: false, regime: { pass: false, reasons: [] } };
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
    const sizing = RiskCalculator.positionSize(10000, settings.riskPerTrade, priceData.price, stopLoss);
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
    const results = watchlist.map(asset => {
      try {
        const candles = MOCK_DATA.getOHLC(asset.symbol), price = MOCK_DATA.prices[asset.symbol];
        if (!candles || !price) return { symbol: asset.symbol, adjScore: 0, error: 'No data' };
        const ind = Indicators.computeAll(candles);
        if (!ind) return { symbol: asset.symbol, adjScore: 0 };
        const regime = checkRegime(ind), direction = detectSignal(ind);
        const conf = computeConfidenceScore(ind, direction);
        const riskLvl = RiskCalculator.riskLevel(ind.atrPct, ind.vol20, ind.adx);
        const adjScoreVal = adjustedScore(conf.score, riskLvl);
        const stopLoss = RiskCalculator.initialStop(price.price, ind.atr, direction, Storage.getSettings().stopAtrMultiplier);
        const takeProfit = RiskCalculator.takeProfitEstimate(price.price, stopLoss, direction, 2.5);
        const rrRatio = RiskCalculator.riskRewardRatio(price.price, stopLoss, takeProfit);
        return {
          symbol: asset.symbol, name: asset.name, assetClass: asset.class,
          price: price.price, change24h: price.change24h || 0,
          direction, regime, indicators: ind,
          score: conf.score, adjScore: adjScoreVal,
          strength: signalStrength(adjScoreVal), riskLevel: riskLvl,
          isSolid: isSolidTrade(regime, adjScoreVal, riskLvl, rrRatio),
          confidence: conf, stopLoss, takeProfit, rrRatio,
          recommendation: getRecommendation(direction, adjScoreVal, riskLvl, regime.pass),
          dataWarning: 'Données simulées',
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
        const curr = window.__prices[p.symbol] || MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
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
      return { success: true, position: pos, orderId: pos.id };
    },
    async closePosition(positionId) {
      const positions = Storage.getSimPositions();
      const idx = positions.findIndex(p => p.id === positionId);
      if (idx === -1) return { success: false, error: 'Position introuvable' };
      const pos = positions[idx];
      const curr = window.__prices[pos.symbol] || MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
      const pnl = RiskCalculator.openPnL(pos.entryPrice, curr, pos.quantity, pos.direction);
      const pnlPct = RiskCalculator.openPnLPct(pos.entryPrice, curr, pos.direction);
      Storage.saveSimCapital(Storage.getSimCapital() + pos.invested + pnl);
      const history = Storage.getSimHistory();
      history.unshift({ id: 'h_' + Date.now(), symbol: pos.symbol, direction: pos.direction, entryPrice: pos.entryPrice, exitPrice: curr, pnl, pnlPct, closedAt: Date.now(), durationDays: Math.round((Date.now() - pos.openedAt) / 86400000) });
      Storage.saveSimHistory(history);
      positions.splice(idx, 1);
      Storage.saveSimPositions(positions);
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
  function directionLabel(d) { return d === 'long' ? 'Long' : d === 'short' ? 'Short' : 'Neutre'; }
  function riskLabel(l) { return l === 'low' ? 'Faible' : l === 'medium' ? 'Modéré' : l === 'high' ? 'Élevé' : '—'; }
  function profileLabel(p) { return p === 'conservative' ? 'Conservateur' : p === 'balanced' ? 'Équilibré' : p === 'dynamic' ? 'Dynamique' : p; }
  function assetIcon(symbol) { return MOCK_DATA.icons[symbol] || symbol.slice(0, 2).toUpperCase(); }
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

      const currentPrice = window.__prices[alert.symbol] || MOCK_DATA.prices[alert.symbol]?.price;
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
    _notifPermission = Notification?.permission || 'default';
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
      const price    = window.__prices[symbol] || MOCK_DATA.prices[symbol]?.price || 0;
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
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">Montant investi</div>
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
    if (mode === 'simulation') {
      banner.className = 'mode-banner mode-simulation';
      banner.innerHTML = '<span class="mode-icon">⚡</span><span class="mode-label">MODE SIMULATION — Aucun argent réel</span>';
    } else {
      banner.className = 'mode-banner mode-real';
      banner.innerHTML = '<span class="mode-icon">⚠️</span><span class="mode-label">MODE RÉEL — Ordres envoyés au broker</span>';
    }
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
        document.dispatchEvent(new CustomEvent('filter-change', { detail: { group, value: btn.dataset.filter } }));
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

  function init() {
    setInterval(() => refreshPrices(), 5 * 60 * 1000);
    setInterval(() => refreshAnalysis(), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastSyncTime > 2 * 60 * 1000) refreshPrices();
    });
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
      const curr = window.__prices[pos.symbol] || MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
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
    const curr = window.__prices[p.symbol] || MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
    totalPnL += RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
    totalInvested += p.invested;
  });

  const simCapNum  = typeof simCap === 'object' ? (simCap.current || simCap.initial || 10000) : (parseFloat(simCap) || 10000);
  const simCapInit = parseFloat(settings.simInitialCapital) || simCapNum;
  const capitalTotal = simCapNum + totalInvested;
  const globalReturn = simCapInit > 0 ? ((capitalTotal - simCapInit) / simCapInit) * 100 : 0;
  const top5 = analysis.tradeable.slice(0, 5);
  const regime = MOCK_DATA.marketRegime;
  const alertStats = AlertManager.getStats();

  return `
    <div class="screen-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);">
        <div>
          <div class="screen-title">Tableau de bord</div>
          <div class="screen-subtitle">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <span class="hero-mode-tag sim">⚡ Simulation active</span>
      </div>
    </div>

    <div class="dashboard-hero">
      <div class="hero-label">Capital simulation total estimé</div>
      <div class="hero-capital">${Fmt.currency(capitalTotal)}</div>
      <div class="hero-pnl">
        <span class="hero-pnl-value ${Fmt.pnlClass(totalPnL)}" style="font-size:var(--text-xl);font-family:var(--font-mono);">${totalPnL >= 0 ? '+' : ''}${Fmt.currency(totalPnL)}</span>
        <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-secondary);">(${Fmt.pct(globalReturn)})</span>
        <span style="font-size:var(--text-xs);color:var(--text-muted);">P&L positions ouvertes</span>
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
      <span>Régime du marché</span>
      <span class="see-all-link" data-screen="opportunities">Voir tous les signaux →</span>
    </div>
    <div class="regime-row">
      <div class="regime-card"><div class="regime-icon">${regime.icon}</div><div><div class="regime-label">Régime global</div><div class="regime-value" style="color:${regime.color};">${regime.label}</div></div></div>
      <div class="regime-card"><div class="regime-icon">◎</div><div><div class="regime-label">Signaux actifs</div><div class="regime-value">${analysis.tradeable.length} / ${analysis.all.length}</div></div></div>
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

    ${simPos.length > 0 ? `
      <div class="section-title" style="margin-top:var(--space-8);">
        <span>Positions ouvertes</span>
        <span class="see-all-link" data-screen="portefeuille">Tout voir →</span>
      </div>
      ${simPos.slice(0, 3).map(p => renderPositionCardMini(p)).join('')}
    ` : ''}

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
  const change = Fmt.change(a.change24h);
  return `
    <div class="opp-row" data-screen="asset-detail" data-symbol="${a.symbol}">
      <div class="opp-rank">#${rank}</div>
      ${UI.scoreRing(a.adjScore, 44)}
      <div class="asset-icon">${Fmt.assetIcon(a.symbol)}</div>
      <div class="opp-asset">
        <div class="opp-asset-line1">
          <span class="asset-symbol">${a.symbol}</span>
          ${_assetClassBadge(a.assetClass)}
          ${a.isSolid ? '<span class="solid-badge">★ Solide</span>' : ''}
          <span class="direction-tag ${a.direction}">${Fmt.directionIcon(a.direction)} ${Fmt.directionLabel(a.direction)}</span>
        </div>
        <div class="opp-asset-line2">
          <span style="font-size:var(--text-xs);color:var(--text-muted);">${a.name}</span>
          <span class="risk-badge ${a.riskLevel}" style="margin-left:var(--space-2);">${Fmt.riskLabel(a.riskLevel)}</span>
        </div>
      </div>
      <div class="opp-trend-arrow">${_trendArrow(a.change24h, a.direction)}</div>
      <div class="opp-price-col">
        <div class="opp-price">${Fmt.price(a.price)}</div>
        <div class="opp-change ${change.cls}">${change.text}</div>
        ${a.stopLoss && a.takeProfit ? `<div class="opp-sltp">
          <span class="opp-sl">SL&nbsp;${Fmt.price(a.stopLoss)}</span>
          <span class="opp-tp">TP&nbsp;${Fmt.price(a.takeProfit)}</span>
        </div>` : ''}
      </div>
    </div>`;
}

function renderPositionCardMini(p) {
  const curr = window.__prices[p.symbol] || MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
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

// ═══ opportunities.js ═══
function renderOpportunities() {
  const analysis = window.__MTP?.lastAnalysis || AnalysisEngine.analyzeAllSync();
  return `
    <div class="screen-header">
      <div class="screen-title">Opportunités</div>
      <div class="screen-subtitle">Actifs classés par score de confiance ajusté</div>
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

    ${analysis.neutral.length > 0 ? `
      <div class="section-sep"><span class="sep-label">En observation</span><div class="sep-line"></div></div>
      ${analysis.neutral.map((a, i) => renderOppCard(a, i + 1, false, true)).join('')}
    ` : ''}

    <div class="section-sep"><span class="sep-label">Régime défavorable / signal absent</span><div class="sep-line"></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-8);">
      ${analysis.inactive.map(a => `<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;padding:var(--space-2) var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">${a.symbol}</div>`).join('')}
    </div>`;
}

function renderOppCard(a, rank, isSolid = false, isNeutral = false) {
  const change = Fmt.change(a.change24h);
  return `
    <div class="opp-row ${isSolid ? 'card' : ''}" style="${isSolid ? 'border-color:rgba(0,229,160,0.25);' : ''}"
      data-screen="asset-detail" data-symbol="${a.symbol}" data-asset-class="${a.assetClass || ''}">
      <div class="opp-rank" style="color:${isNeutral ? 'var(--text-muted)' : 'var(--text-secondary)'};">#${rank}</div>
      ${UI.scoreRing(a.adjScore, 44)}
      <div class="asset-icon">${Fmt.assetIcon(a.symbol)}</div>
      <div class="opp-asset">
        <div class="opp-asset-line1">
          <span class="asset-symbol">${a.symbol}</span>
          ${_assetClassBadge(a.assetClass)}
          ${isSolid ? '<span class="solid-badge">★ Solide</span>' : ''}
          ${a.direction !== 'neutral' ? `<span class="direction-tag ${a.direction}">${Fmt.directionIcon(a.direction)} ${Fmt.directionLabel(a.direction)}</span>` : ''}
        </div>
        <div class="opp-asset-line2">
          <span style="font-size:var(--text-xs);color:var(--text-muted);">${a.name}</span>
          ${!isNeutral && a.recommendation ? `<span style="font-size:var(--text-xs);color:var(--text-secondary);margin-left:var(--space-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">${a.recommendation}</span>` : ''}
        </div>
      </div>
      <div class="opp-trend-arrow">${_trendArrow(a.change24h, a.direction)}</div>
      <div class="opp-price-col">
        <div class="opp-price" style="font-family:var(--font-mono);">${Fmt.price(a.price)}</div>
        <div class="opp-change ${change.cls}">${change.text}</div>
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:var(--space-1);align-items:flex-end;">
        <span class="risk-badge ${a.riskLevel}">${Fmt.riskLabel(a.riskLevel)}</span>
        ${a.rrRatio ? `<span class="opp-rr">R/R ${a.rrRatio}:1</span>` : ''}
      </div>
      ${a.stopLoss && a.takeProfit ? `
      <div class="opp-sltp-full">
        <div class="opp-sltp-item sl">
          <span class="opp-sltp-label">Stop-loss</span>
          <span class="opp-sltp-val">${Fmt.price(a.stopLoss)}</span>
          <span class="opp-sltp-pct">-${a.indicators?.atr ? ((Math.abs(a.price - a.stopLoss) / a.price) * 100).toFixed(1) : '?'}%</span>
        </div>
        <div class="opp-sltp-sep">→</div>
        <div class="opp-sltp-item tp">
          <span class="opp-sltp-label">Take profit</span>
          <span class="opp-sltp-val">${Fmt.price(a.takeProfit)}</span>
          <span class="opp-sltp-pct">+${((Math.abs(a.takeProfit - a.price) / a.price) * 100).toFixed(1)}%</span>
        </div>
      </div>` : ''}
    </div>`;
}

Router.register('opportunities', renderOpportunities);

// ═══ assetDetail.js ═══
function renderAssetDetail(params) {
  if (!params || !params.symbol) return `<div class="screen"><p>Actif non trouvé.</p></div>`;

  const { symbol } = params;
  const asset     = MOCK_DATA.watchlist.find(a => a.symbol === symbol);
  const priceData = MOCK_DATA.prices[symbol];

  if (!asset || !priceData) return `<div class="screen"><p>Actif "${symbol}" inconnu.</p></div>`;

  const cached   = window.__MTP?.lastAnalysis?.all?.find(a => a.symbol === symbol);
  const analysis = cached || {
    symbol, name: asset.name, assetClass: asset.class,
    price: priceData.price, change24h: priceData.change24h || 0,
    direction: 'neutral', adjScore: 0, score: 0,
    regime: { pass: false, reasons: [] }, indicators: {}, isSolid: false,
    stopLoss: null, takeProfit: null, rrRatio: 0,
    recommendation: 'Données en cours de chargement...',
  };

  const ind      = analysis.indicators || {};
  const change   = Fmt.change(analysis.change24h);
  const settings = Storage.getSettings();

  // ── FIX : _capNum correctement défini ici
  const _simCap = Storage.getSimCapital();
  const _capNum = typeof _simCap === 'object' ? (_simCap.current || _simCap.initial || 10000) : (parseFloat(_simCap) || 10000);

  const stopLoss   = analysis.stopLoss   || (priceData.price * 0.97);
  const takeProfit = analysis.takeProfit || (priceData.price * 1.06);

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
        </div>
      </div>
      <div class="asset-price-block">
        <div class="asset-price-main">${Fmt.price(priceData.price)}</div>
        <div class="asset-price-change ${change.cls}">${change.text} (24h)</div>
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

    ${analysis.confidence?.criteria?.length > 0 ? `
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><span class="card-title">Détail des 8 critères</span><span style="font-size:var(--text-xs);color:var(--text-muted);">Brut : ${analysis.confidence.rawScore}/${analysis.confidence.maxScore}</span></div>
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
        <div><div class="stat-label">Prix d'entrée</div><div class="stat-value">${Fmt.price(priceData.price)}</div></div>
        <div><div class="stat-label">Stop-loss (2×ATR)</div><div class="stat-value" style="color:var(--loss);">${Fmt.price(stopLoss)}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">-${ind.atr ? ((Math.abs(priceData.price - stopLoss) / priceData.price) * 100).toFixed(1) : '?'}%</div></div>
        <div><div class="stat-label">Take profit (R/R 2.5)</div><div class="stat-value" style="color:var(--profit);">${Fmt.price(takeProfit)}</div><div style="font-size:var(--text-xs);color:var(--text-muted);">+${((Math.abs(takeProfit - priceData.price) / priceData.price) * 100).toFixed(1)}%</div></div>
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
              placeholder="${Fmt.price(priceData.price)}" value="${priceData.price.toFixed(priceData.price > 100 ? 2 : 4)}" step="${priceData.price > 100 ? 1 : 0.0001}"/>
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
      <div class="mode-zone sim-zone">
        <div class="mode-zone-title">⚡ Mode Simulation</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.6;">
          Capital fictif disponible : <strong>${Fmt.currency(_capNum)}</strong><br/>
          Risque par trade : ${(settings.riskPerTrade * 100).toFixed(2)}% = ${Fmt.currency(_capNum * settings.riskPerTrade)}
        </div>
        ${analysis.direction !== 'neutral' ? `
          <button class="btn btn-sim btn-block" id="btn-open-sim" data-open-position="${symbol}" data-mode="sim">
            ⚡ Trader maintenant — ${Fmt.directionLabel(analysis.direction)}
          </button>` : `
          <button class="btn btn-ghost btn-block" disabled>Signal neutre — attendre</button>`
        }
      </div>
      <div class="mode-zone real-zone">
        <div class="mode-zone-title">⚠️ Mode Réel</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-4);">Brokers connectés : <strong>Aucun</strong></div>
        <button class="btn btn-ghost btn-block" disabled>⚠️ Aucun broker configuré</button>
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
  const candles = MOCK_DATA.getOHLC(symbol);
  if (!candles || candles.length < 5) return '<div style="height:120px;background:var(--bg-elevated);border-radius:8px;"></div>';
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
      UI.toast(`Position ${symbol} ouverte — ${Fmt.currency(result.position.invested)} investi`, 'success');
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
      <h1 class="screen-title">Portefeuille</h1>
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
  const priceData = MOCK_DATA.prices[pos.symbol];

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

        <div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:3px;">Montant investi</div>
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

    <!-- Score algo si dispo -->
    ${analysis ? `
    <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--card-radius);padding:var(--space-5);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4);">Analyse algo actuelle</div>
      <div style="display:flex;align-items:center;gap:var(--space-5);">
        ${UI.scoreRing(analysis.adjScore, 56)}
        <div style="flex:1;">
          <div style="font-size:var(--text-md);font-weight:700;margin-bottom:var(--space-2);">Score : <span style="color:${analysis.adjScore >= 70 ? 'var(--signal-strong)' : analysis.adjScore >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)'};">${analysis.adjScore}/100</span></div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.5;">${analysis.recommendation || ''}</div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;">
            <span class="risk-badge ${analysis.riskLevel}">Risque ${Fmt.riskLabel(analysis.riskLevel)}</span>
            <span class="direction-tag ${analysis.direction}">${Fmt.directionIcon(analysis.direction)} ${Fmt.directionLabel(analysis.direction)}</span>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Actions -->
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
      <button class="btn btn-ghost" style="flex:1;" data-screen="asset-detail" data-symbol="${pos.symbol}">
        📊 Voir l'analyse complète
      </button>
      <button class="btn ${mode === 'real' ? 'btn-danger' : 'btn-sim'}" style="flex:1;" id="btn-close-from-detail" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
        ${mode === 'real' ? '🔴 Clôturer (RÉEL)' : '⬛ Clôturer cette position'}
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
          <div class="pf-pnl-big ${pnlCls}" data-position-pnl="${pos.id}">${Fmt.signedCurrency(pos.pnl)}</div>
          <div class="pf-pnl-pct ${pnlCls}" data-position-pnlpct="${pos.id}">${Fmt.signedPct(pos.pnlPct)}</div>
        </div>
      </div>
      ${barHtml}
      <div class="pf-card-grid">
        <div class="pf-grid-item"><span class="pf-grid-label">Entrée</span><span>${Fmt.price(pos.entryPrice)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Actuel</span><span data-position-price="${pos.id}">${Fmt.price(pos.currentPrice)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Investi</span><span>${Fmt.currency(pos.invested)}</span></div>
        <div class="pf-grid-item"><span class="pf-grid-label">Qté</span><span>${Fmt.qty(pos.quantity, pos.symbol)}</span></div>
      </div>
      ${stopWarn ? `<div class="stop-warning-bar">⚠️ Stop-loss à moins de 3% du prix actuel</div>` : ''}
      <div class="pf-card-actions">
        <button class="btn btn-ghost btn-sm" data-open-detail="${pos.symbol}">Analyse →</button>
        <button class="btn ${mode === 'real' ? 'btn-danger' : 'btn-sim'} btn-sm btn-close-pos" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
          ${mode === 'real' ? '🔴 Clôturer RÉEL' : '⬛ Clôturer SIM'}
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
        <div class="grid-item"><span class="grid-label">Investi</span><span class="grid-value">${Fmt.currency(pos.invested)}</span></div>
        <div class="grid-item"><span class="grid-label">Stop-loss</span><span class="grid-value ${stopWarn ? 'stop-close' : ''}">${pos.stopLoss ? Fmt.price(pos.stopLoss) : '—'}</span></div>
        <div class="grid-item"><span class="grid-label">Take profit</span><span class="grid-value">${pos.takeProfit ? Fmt.price(pos.takeProfit) : '—'}</span></div>
        <div class="grid-item"><span class="grid-label">Durée</span><span class="grid-value">${Fmt.duration(pos.openedAt)}</span></div>
        <div class="grid-item"><span class="grid-label">Statut</span><span class="grid-value status-open">● Ouvert</span></div>
      </div>
      ${stopWarn ? `<div class="stop-warning-bar">⚠️ Stop-loss à moins de 3% du prix actuel</div>` : ''}
      <div class="position-actions">
        <button class="btn-ghost btn-sm" data-open-detail="${pos.symbol}">Voir l'analyse</button>
        <button class="btn-close-pos btn-sm ${mode === 'real' ? 'btn-danger' : 'btn-warning'}" data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
          ${mode === 'real' ? '🔴 Clôturer (RÉEL)' : '⬛ Clôturer (SIM)'}
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
  const currentPrice = window.__prices[pos.symbol] || MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
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
    const curr = window.__prices[pos.symbol] || MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
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
  const curr = window.__prices[pos.symbol] || MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
  const dir  = (pos.direction || '').toLowerCase();
  const diff = dir === 'long' ? curr - pos.entryPrice : pos.entryPrice - curr;
  const pnl  = diff * pos.quantity;
  return `
    <div class="mini-pos-row" data-open-detail="${pos.symbol}" style="cursor:pointer">
      <span class="mini-pos-icon">${Fmt.assetIcon(pos.symbol)}</span>
      <span class="mini-pos-symbol">${pos.symbol}</span>
      <span class="mini-pos-dir ${dir === 'long' ? 'long' : 'short'}">${pos.direction}</span>
      <span class="mini-pos-pnl ${Fmt.pnlClass(pnl)}">${Fmt.signedCurrency(pnl)}</span>
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
        ${_renderProfileCard('conservative', 'Conservateur', '0.25%', '🛡️', 'Signaux les plus forts uniquement.', settings.riskProfile)}
        ${_renderProfileCard('balanced',     'Équilibré',    '0.50%', '⚖️', 'Défaut recommandé.',                settings.riskProfile)}
        ${_renderProfileCard('dynamic',      'Dynamique',    '1.00%', '⚡', 'Plus d\'opportunités, plus d\'exposition.', settings.riskProfile)}
      </div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label"><span class="settings-label">Risque par trade</span><span class="settings-hint">% du capital par signal</span></div>
          <div class="settings-control">
            <input type="range" id="risk-slider" class="range-input" min="0.25" max="1.00" step="0.25" value="${settings.riskPerTrade * 100}"/>
            <span class="range-value" id="risk-value">${(settings.riskPerTrade * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label"><span class="settings-label">Capital fictif initial</span></div>
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
      Storage.saveSettings(s);
      UI.toast('Paramètres enregistrés ✅', 'success');
    });
  }
}

Router.register('settings', () => { renderSettings(); });

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
  window.__MTP.Router = Router;

  // 7. Theme
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');

  // 8. Sync
  Sync.init();
  window.__MTP.Sync = Sync;

  // 9. Affichage immédiat (jamais bloquer sur réseau)
  try {
    window.__MTP.lastAnalysis = AnalysisEngine.analyzeAllSync();
  } catch(e) {
    console.warn('analyzeAllSync error:', e);
    window.__MTP.lastAnalysis = { all: [], tradeable: [], neutral: [], inactive: [] };
  }
  Router.navigate('dashboard');
  Router.attachNavClicks();

  // 10. Service Worker — désactivé V1
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('/sw.js').catch(() => {});
  // }

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

