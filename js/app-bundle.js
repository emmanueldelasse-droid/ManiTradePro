// ============================================================
// ManiTradePro V1 — App Bundle (standalone, no ES modules)
// ============================================================
'use strict';

// Global namespace
window.__MTP = {};
window.__prices = {};


// ═══ mockData.js ═══
/* ============================================
   MANITRADEPRO — Mock Data (données fictives réalistes)
   ============================================ */

const MOCK_DATA = {

  // ── PRIX ACTUELS (fictifs, réalistes)
  prices: {
    'BTC':   { price: 67420.50, change24h: 2.34, volume24h: 28_400_000_000 },
    'ETH':   { price: 3528.20,  change24h: 1.87, volume24h: 14_200_000_000 },
    'AAPL':  { price: 213.45,   change24h: 0.62, volume24h: 3_800_000_000 },
    'MSFT':  { price: 421.80,   change24h: 0.44, volume24h: 2_100_000_000 },
    'TSLA':  { price: 176.30,   change24h: -1.23, volume24h: 5_600_000_000 },
    'NVDA':  { price: 875.60,   change24h: 3.12, volume24h: 8_900_000_000 },
    'EURUSD':{ price: 1.0842,   change24h: 0.18, volume24h: 0 },
    'GBPUSD':{ price: 1.2714,   change24h: -0.12, volume24h: 0 },
    'GOLD':  { price: 2318.40,  change24h: 0.75, volume24h: 0 },
    'SPY':   { price: 523.80,   change24h: 0.51, volume24h: 4_200_000_000 },
    'SOL':   { price: 172.40,   change24h: 4.21, volume24h: 3_100_000_000 },
    'AMZN':  { price: 196.20,   change24h: 0.88, volume24h: 2_800_000_000 },
  },

  // ── DONNÉES OHLCV FICTIVES (pour sparklines et calculs indicateurs)
  // 55 bougies daily fictives par actif
  generateOHLC: function(symbol, currentPrice, trend = 'up', volatility = 0.02) {
    const candles = [];
    let price = currentPrice * (trend === 'up' ? 0.85 : 1.15);
    const now = Date.now();

    for (let i = 55; i >= 0; i--) {
      const dayAgo = now - i * 86400000;
      const noise = (Math.random() - 0.5) * volatility;
      const trendBias = trend === 'up' ? 0.003 : (trend === 'down' ? -0.003 : 0);
      const open = price;
      const move = noise + trendBias;
      const close = price * (1 + move);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low  = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = 1_000_000 * (1 + Math.random() * 2);
      candles.push({ ts: dayAgo, open, high, low, close, volume });
      price = close;
    }

    // Forcer le dernier close au prix actuel
    if (candles.length > 0 && MOCK_DATA.prices[symbol]) {
      candles[candles.length - 1].close = MOCK_DATA.prices[symbol].price;
    }
    return candles;
  },

  // ── ACTIFS SUIVIS
  watchlist: [
    { symbol: 'BTC',    name: 'Bitcoin',           class: 'crypto',  trend: 'up',    volatility: 0.025 },
    { symbol: 'ETH',    name: 'Ethereum',          class: 'crypto',  trend: 'up',    volatility: 0.028 },
    { symbol: 'NVDA',   name: 'Nvidia',            class: 'stock',   trend: 'up',    volatility: 0.022 },
    { symbol: 'AAPL',   name: 'Apple',             class: 'stock',   trend: 'up',    volatility: 0.014 },
    { symbol: 'MSFT',   name: 'Microsoft',         class: 'stock',   trend: 'up',    volatility: 0.013 },
    { symbol: 'GOLD',   name: 'Or (XAU/USD)',      class: 'commodity', trend: 'up',  volatility: 0.008 },
    { symbol: 'EURUSD', name: 'Euro / Dollar',     class: 'forex',   trend: 'neutral', volatility: 0.005 },
    { symbol: 'TSLA',   name: 'Tesla',             class: 'stock',   trend: 'down',  volatility: 0.035 },
    { symbol: 'SOL',    name: 'Solana',            class: 'crypto',  trend: 'up',    volatility: 0.040 },
    { symbol: 'SPY',    name: 'S&P 500 ETF',       class: 'etf',     trend: 'up',    volatility: 0.010 },
    { symbol: 'AMZN',   name: 'Amazon',            class: 'stock',   trend: 'up',    volatility: 0.018 },
    { symbol: 'GBPUSD', name: 'Livre / Dollar',    class: 'forex',   trend: 'down',  volatility: 0.006 },
  ],

  // ── ICÔNES (premières lettres)
  icons: {
    'BTC': '₿', 'ETH': 'Ξ', 'NVDA': 'N', 'AAPL': '',
    'MSFT': 'M', 'GOLD': 'Au', 'EURUSD': '€$', 'TSLA': 'T',
    'SOL': 'S', 'SPY': 'S&P', 'AMZN': 'A', 'GBPUSD': '£$',
  },

  // ── POSITIONS SIMULATION EXEMPLES (pour démo)
  sampleSimPositions: [
    {
      id: 'sim_001',
      mode: 'sim',
      symbol: 'BTC',
      name: 'Bitcoin',
      direction: 'long',
      entryPrice: 64200.00,
      quantity: 0.156,
      invested: 10015.20,
      stopLoss: 61800.00,
      takeProfit: 72000.00,
      openedAt: Date.now() - 3 * 86400000,
    },
    {
      id: 'sim_002',
      mode: 'sim',
      symbol: 'NVDA',
      name: 'Nvidia',
      direction: 'long',
      entryPrice: 845.00,
      quantity: 11.83,
      invested: 9996.35,
      stopLoss: 808.00,
      takeProfit: 960.00,
      openedAt: Date.now() - 7 * 86400000,
    },
    {
      id: 'sim_003',
      mode: 'sim',
      symbol: 'GOLD',
      name: 'Or',
      direction: 'long',
      entryPrice: 2290.00,
      quantity: 4.36,
      invested: 9984.40,
      stopLoss: 2240.00,
      takeProfit: 2420.00,
      openedAt: Date.now() - 14 * 86400000,
    },
  ],

  // ── HISTORIQUE TRADES SIMULATION (pour stats)
  sampleTradeHistory: [
    { id: 'h001', symbol: 'ETH',  direction: 'long',  entryPrice: 3100, exitPrice: 3420, pnl: 516.13,  pnlPct: 10.32, closedAt: Date.now() - 20 * 86400000, durationDays: 12 },
    { id: 'h002', symbol: 'AAPL', direction: 'long',  entryPrice: 198, exitPrice: 210,  pnl: 302.02,  pnlPct: 6.06,  closedAt: Date.now() - 35 * 86400000, durationDays: 8  },
    { id: 'h003', symbol: 'TSLA', direction: 'short', entryPrice: 192, exitPrice: 178,  pnl: 364.58,  pnlPct: 7.29,  closedAt: Date.now() - 42 * 86400000, durationDays: 5  },
    { id: 'h004', symbol: 'BTC',  direction: 'long',  entryPrice: 69000, exitPrice: 66500, pnl: -361.23, pnlPct: -3.62, closedAt: Date.now() - 55 * 86400000, durationDays: 3 },
    { id: 'h005', symbol: 'GOLD', direction: 'long',  entryPrice: 2180, exitPrice: 2260, pnl: 366.97,  pnlPct: 3.67,  closedAt: Date.now() - 60 * 86400000, durationDays: 18 },
  ],

  // ── PARAMÈTRES PAR DÉFAUT
  defaultSettings: {
    mode: 'simulation',           // 'simulation' | 'real'
    riskProfile: 'balanced',      // 'conservative' | 'balanced' | 'aggressive'
    riskPerTrade: 0.005,          // 0.5% par défaut
    simulationCapital: 100000,    // 100 000 € de départ
    donchianFast: 20,
    donchianSlow: 55,
    emaFast: 50,
    emaSlow: 100,
    atrPeriod: 14,
    adxPeriod: 14,
    stopAtrMultiplier: 2,
    trailAtrMultiplier: 3,
    minAdx: 20,
    minScore: 50,
  },

  // ── RÉGIME MARCHÉ GLOBAL (mock)
  marketRegime: {
    label: 'Tendance haussière',
    icon: '↗',
    color: 'var(--profit)',
    description: 'Régime favorable aux longs sur actifs liquides',
    score: 72,
  },
};

// Pré-génère les OHLC pour chaque actif
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
/* ============================================
   MANITRADEPRO — Storage Layer
   V1 : localStorage
   V2 : Firebase Realtime DB (préparé)
   ============================================ */

const Storage = (() => {

  const PREFIX = 'mtp_';

  // ── CLÉS
  const KEYS = {
    SETTINGS:     PREFIX + 'settings',
    SIM_CAPITAL:  PREFIX + 'sim_capital',
    SIM_POSITIONS:PREFIX + 'sim_positions',
    SIM_HISTORY:  PREFIX + 'sim_history',
    REAL_POSITIONS:PREFIX + 'real_positions',
    WATCHLIST:    PREFIX + 'watchlist',
    API_KEYS:     PREFIX + 'api_keys',
    USER:         PREFIX + 'user',
  };

  // ── HELPERS
  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] get error', key, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] set error', key, e);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── SETTINGS
  function getSettings() {
    return get(KEYS.SETTINGS) || { ...MOCK_DATA.defaultSettings };
  }

  function saveSettings(settings) {
    return set(KEYS.SETTINGS, settings);
  }

  // ── SIMULATION
  function getSimCapital() {
    const stored = get(KEYS.SIM_CAPITAL);
    if (stored === null) return { initial: MOCK_DATA.defaultSettings.simulationCapital, current: MOCK_DATA.defaultSettings.simulationCapital };
    return stored;
  }

  function saveSimCapital(capital) {
    return set(KEYS.SIM_CAPITAL, capital);
  }

  function getSimPositions() {
    const stored = get(KEYS.SIM_POSITIONS);
    if (stored === null) {
      // Pour la démo, on pré-charge les positions exemples
      return [...MOCK_DATA.sampleSimPositions];
    }
    return stored;
  }

  function saveSimPositions(positions) {
    return set(KEYS.SIM_POSITIONS, positions);
  }

  function getSimHistory() {
    const stored = get(KEYS.SIM_HISTORY);
    if (stored === null) {
      return [...MOCK_DATA.sampleTradeHistory];
    }
    return stored;
  }

  function saveSimHistory(history) {
    return set(KEYS.SIM_HISTORY, history);
  }

  // ── POSITIONS RÉELLES
  function getRealPositions() {
    return get(KEYS.REAL_POSITIONS) || [];
  }

  function saveRealPositions(positions) {
    return set(KEYS.REAL_POSITIONS, positions);
  }

  // ── WATCHLIST
  function getWatchlist() {
    return get(KEYS.WATCHLIST) || MOCK_DATA.watchlist;
  }

  // ── API KEYS (Twelve Data)
  function getApiKeys() {
    return get(KEYS.API_KEYS) || {
      twelveData: [
        { key: '', label: 'Clé 1', callsMin: 0, callsDay: 0, status: 'unconfigured' },
        { key: '', label: 'Clé 2', callsMin: 0, callsDay: 0, status: 'unconfigured' },
        { key: '', label: 'Clé 3', callsMin: 0, callsDay: 0, status: 'unconfigured' },
        { key: '', label: 'Clé 4', callsMin: 0, callsDay: 0, status: 'unconfigured' },
      ],
      binance: { apiKey: '', secret: '', connected: false },
      tradeRepublic: { email: '', connected: false },
    };
  }

  function saveApiKeys(keys) {
    return set(KEYS.API_KEYS, keys);
  }

  // ── RESET SIMULATION
  function resetSimulation() {
    const settings = getSettings();
    saveSimCapital({ initial: settings.simulationCapital, current: settings.simulationCapital });
    saveSimPositions([]);
    saveSimHistory([]);
    return true;
  }

  // ── INITIALISATION
  function init() {
    // Assure que les données par défaut existent
    if (!get(KEYS.SETTINGS)) saveSettings({ ...MOCK_DATA.defaultSettings });

    const simCap = get(KEYS.SIM_CAPITAL);
    if (!simCap) {
      saveSimCapital({
        initial: MOCK_DATA.defaultSettings.simulationCapital,
        current: MOCK_DATA.defaultSettings.simulationCapital,
      });
    }

    // Pré-charge positions de démo si vide
    if (!get(KEYS.SIM_POSITIONS)) {
      saveSimPositions([...MOCK_DATA.sampleSimPositions]);
    }
    if (!get(KEYS.SIM_HISTORY)) {
      saveSimHistory([...MOCK_DATA.sampleTradeHistory]);
    }

    console.log('[Storage] V1 localStorage initialisé');
    // TODO V2 : Initialiser Firebase ici
    // firebase.initializeApp(config);
    // firebase.database().ref('users/' + userId).on('value', syncHandler);
  }

  // ── INTERFACE PUBLIQUE
  return {
    init,
    getSettings, saveSettings,
    getSimCapital, saveSimCapital,
    getSimPositions, saveSimPositions,
    getSimHistory, saveSimHistory,
    getRealPositions, saveRealPositions,
    getWatchlist,
    getApiKeys, saveApiKeys,
    resetSimulation,
    // Exposition des clés pour debug
    KEYS,
  };

})();

// ═══ indicators.js ═══
/* ============================================
   MANITRADEPRO — Indicateurs Techniques
   EMA, SMA, ATR, ADX, Donchian, RSI, MACD
   ============================================ */

const Indicators = (() => {

  // ── EMA (Exponential Moving Average)
  function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let emaVal = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
      emaVal = closes[i] * k + emaVal * (1 - k);
    }
    return emaVal;
  }

  // Série complète EMA
  function emaSeries(closes, period) {
    if (closes.length < period) return [];
    const k = 2 / (period + 1);
    const result = new Array(period - 1).fill(null);
    let emaVal = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(emaVal);
    for (let i = period; i < closes.length; i++) {
      emaVal = closes[i] * k + emaVal * (1 - k);
      result.push(emaVal);
    }
    return result;
  }

  // ── SMA (Simple Moving Average)
  function sma(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(closes.length - period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  // ── ATR (Average True Range) — 14 périodes par défaut
  function atr(candles, period = 14) {
    if (candles.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const { high, low, close: prevClose } = candles[i - 1];
      const { high: h, low: l } = candles[i];
      const tr = Math.max(
        h - l,
        Math.abs(h - prevClose),
        Math.abs(l - prevClose)
      );
      trs.push(tr);
    }
    // Smoothed ATR (Wilder)
    let atrVal = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atrVal = (atrVal * (period - 1) + trs[i]) / period;
    }
    return atrVal;
  }

  // ── ADX (Average Directional Index)
  function adx(candles, period = 14) {
    if (candles.length < period * 2) return { adx: null, plus_di: null, minus_di: null };

    const plusDMs = [], minusDMs = [], trs = [];

    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const upMove   = curr.high - prev.high;
      const downMove = prev.low  - curr.low;
      const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
      plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
      trs.push(tr);
    }

    // Wilder smoothing
    function smooth(arr, p) {
      let s = arr.slice(0, p).reduce((a, b) => a + b, 0);
      const result = [s];
      for (let i = p; i < arr.length; i++) {
        s = s - s / p + arr[i];
        result.push(s);
      }
      return result;
    }

    const smTR  = smooth(trs,     period);
    const smDMp = smooth(plusDMs, period);
    const smDMm = smooth(minusDMs, period);

    const DIplus  = smDMp.map((v, i) => smTR[i] === 0 ? 0 : (v / smTR[i]) * 100);
    const DIminus = smDMm.map((v, i) => smTR[i] === 0 ? 0 : (v / smTR[i]) * 100);

    const DX = DIplus.map((v, i) => {
      const sum = v + DIminus[i];
      return sum === 0 ? 0 : Math.abs(v - DIminus[i]) / sum * 100;
    });

    // ADX = smoothed DX
    const adxSeries = smooth(DX.slice(period - 1), period);
    const lastAdx   = adxSeries[adxSeries.length - 1] / period; // Normalise
    const lastDIp   = DIplus[DIplus.length - 1];
    const lastDIm   = DIminus[DIminus.length - 1];

    return {
      adx:       Math.min(100, lastAdx * period / (period - 1)),
      plus_di:   lastDIp,
      minus_di:  lastDIm,
    };
  }

  // ── DONCHIAN CHANNEL
  function donchian(candles, period) {
    if (candles.length < period) return null;
    const slice = candles.slice(candles.length - period);
    const upper = Math.max(...slice.map(c => c.high));
    const lower = Math.min(...slice.map(c => c.low));
    return { upper, lower, mid: (upper + lower) / 2 };
  }

  // ── RSI
  function rsi(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  // ── VOLATILITÉ RÉALISÉE (std-dev 20j)
  function realizedVol(closes, period = 20) {
    if (closes.length < period + 1) return null;
    const slice = closes.slice(closes.length - period - 1);
    const returns = [];
    for (let i = 1; i < slice.length; i++) {
      returns.push(Math.log(slice[i] / slice[i - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance * 252) * 100; // Annualisée en %
  }

  // ── PENTE EMA (angle simplifié)
  function emaSlope(closes, period) {
    const s = emaSeries(closes, period);
    const last = s.filter(v => v !== null);
    if (last.length < 5) return 0;
    const n = last.length;
    // Pente sur les 5 dernières valeurs normalisée
    const recent = last.slice(n - 5);
    const slope = (recent[4] - recent[0]) / (recent[0] * 5);
    return slope * 100; // En % par bougie
  }

  // ── MOMENTUM (performance N jours)
  function momentum(closes, period) {
    if (closes.length < period + 1) return null;
    const old = closes[closes.length - 1 - period];
    const now = closes[closes.length - 1];
    return ((now - old) / old) * 100;
  }

  // ── Breakout Donchian : le close actuel est-il au plus haut N jours?
  function isDonchianBreakoutUp(candles, period) {
    if (candles.length < period + 1) return false;
    const previous = candles.slice(candles.length - period - 1, candles.length - 1);
    const prevHigh = Math.max(...previous.map(c => c.high));
    const current  = candles[candles.length - 1];
    return current.close > prevHigh;
  }

  function isDonchianBreakoutDown(candles, period) {
    if (candles.length < period + 1) return false;
    const previous = candles.slice(candles.length - period - 1, candles.length - 1);
    const prevLow  = Math.min(...previous.map(c => c.low));
    const current  = candles[candles.length - 1];
    return current.close < prevLow;
  }

  // ── VOLUME RELATIF (ratio vs moyenne)
  function relativeVolume(candles, period = 20) {
    if (candles.length < period) return 1;
    const avgVol = candles.slice(candles.length - period - 1, candles.length - 1)
      .reduce((s, c) => s + c.volume, 0) / period;
    const lastVol = candles[candles.length - 1].volume;
    return avgVol === 0 ? 1 : lastVol / avgVol;
  }

  // ── CALCUL COMPLET SUR UN ACTIF
  function computeAll(candles) {
    if (!candles || candles.length < 10) {
      return null;
    }

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
    const mom6m  = momentum(closes, Math.min(closes.length - 1, closes.length - 1));
    const lastPrice = closes[closes.length - 1];
    const relVol = relativeVolume(candles, 20);
    const breakoutUp   = isDonchianBreakoutUp(candles, settings.donchianSlow);
    const breakoutDown = isDonchianBreakoutDown(candles, settings.donchianSlow);

    return {
      price:    lastPrice,
      ema50,
      ema100,
      atr:      atrVal,
      adx:      adxRes.adx,
      plus_di:  adxRes.plus_di,
      minus_di: adxRes.minus_di,
      don55,
      don20,
      rsi:      rsiVal,
      vol20,
      slope50,
      slope100,
      mom3m,
      mom6m,
      relVol,
      breakoutUp,
      breakoutDown,
      atrPct:   atrVal ? (atrVal / lastPrice) * 100 : 0,
    };
  }

  return {
    ema, emaSeries, sma,
    atr, adx, donchian, rsi,
    realizedVol, emaSlope, momentum,
    relativeVolume,
    isDonchianBreakoutUp, isDonchianBreakoutDown,
    computeAll,
  };

})();

// ═══ riskCalculator.js ═══
/* ============================================
   MANITRADEPRO — Calculateur de Risque
   Stop-loss, sizing, R/R, trailing stop
   ============================================ */

const RiskCalculator = (() => {

  /**
   * Calcule le stop-loss initial
   * Long  : entrée - multiplicateur × ATR
   * Short : entrée + multiplicateur × ATR
   */
  function initialStop(entryPrice, atr, direction, multiplier = 2) {
    if (!atr || !entryPrice) return null;
    return direction === 'long'
      ? entryPrice - multiplier * atr
      : entryPrice + multiplier * atr;
  }

  /**
   * Calcule le trailing stop
   */
  function trailingStop(currentPrice, atr, direction, multiplier = 3) {
    if (!atr || !currentPrice) return null;
    return direction === 'long'
      ? currentPrice - multiplier * atr
      : currentPrice + multiplier * atr;
  }

  /**
   * Calcule la taille de position
   * Formule : taille = (capital × risque%) / (prix - stop)
   */
  function positionSize(capital, riskPct, entryPrice, stopPrice) {
    if (!entryPrice || !stopPrice || !capital) return null;
    const riskAmount = capital * riskPct;
    const riskPerUnit = Math.abs(entryPrice - stopPrice);
    if (riskPerUnit <= 0) return null;
    const units = riskAmount / riskPerUnit;
    const invested = units * entryPrice;
    return {
      units: Math.floor(units * 10000) / 10000,
      invested,
      riskAmount,
      riskPerUnit,
    };
  }

  /**
   * Estime le take profit pour un ratio R/R cible
   */
  function takeProfitEstimate(entryPrice, stopPrice, direction, rrRatio = 2) {
    const riskDistance = Math.abs(entryPrice - stopPrice);
    return direction === 'long'
      ? entryPrice + riskDistance * rrRatio
      : entryPrice - riskDistance * rrRatio;
  }

  /**
   * Calcule le rapport Risque/Récompense
   */
  function riskRewardRatio(entryPrice, stopPrice, targetPrice) {
    const risk   = Math.abs(entryPrice - stopPrice);
    const reward = Math.abs(targetPrice - entryPrice);
    if (risk === 0) return 0;
    return Math.round((reward / risk) * 10) / 10;
  }

  /**
   * Évalue le niveau de risque d'un actif
   * Retourne : 'low' | 'medium' | 'high'
   */
  function riskLevel(atrPct, vol20, adxValue) {
    let score = 0;
    // ATR/Prix
    if (atrPct < 1.5) score += 0;
    else if (atrPct < 3) score += 1;
    else score += 2;
    // Volatilité réalisée annualisée
    if (vol20 === null) score += 1;
    else if (vol20 < 20) score += 0;
    else if (vol20 < 40) score += 1;
    else score += 2;
    // ADX
    if (adxValue === null) score += 1;
    else if (adxValue > 25) score += 0;
    else if (adxValue > 20) score += 1;
    else score += 2;

    if (score <= 1) return 'low';
    if (score <= 3) return 'medium';
    return 'high';
  }

  /**
   * Pénalité de risque pour le score ajusté
   */
  function riskPenalty(level) {
    if (level === 'low')    return 0;
    if (level === 'medium') return 0.10;
    return 0.25;
  }

  /**
   * Calcule le P&L d'une position ouverte
   */
  function openPnL(entryPrice, currentPrice, quantity, direction) {
    if (direction === 'long') {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  }

  /**
   * P&L en pourcentage
   */
  function openPnLPct(entryPrice, currentPrice, direction) {
    if (direction === 'long') {
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    }
  }

  return {
    initialStop,
    trailingStop,
    positionSize,
    takeProfitEstimate,
    riskRewardRatio,
    riskLevel,
    riskPenalty,
    openPnL,
    openPnLPct,
  };

})();

// ═══ analysisEngine.js ═══
/* ============================================
   MANITRADEPRO — Moteur d'Analyse Principal
   Détection, scoring, classement des opportunités
   ============================================ */

const AnalysisEngine = (() => {

  /**
   * PHASE 1 : Filtre de Régime
   * Retourne { pass: bool, reasons: [] }
   */
  function checkRegime(ind) {
    const reasons = [];
    let pass = true;

    // ADX > 20 → tendance mesurable
    if (ind.adx === null || ind.adx < 20) {
      reasons.push({ label: 'ADX insuffisant (pas de tendance claire)', pass: false });
      pass = false;
    } else {
      reasons.push({ label: `ADX = ${ind.adx.toFixed(1)} (tendance présente)`, pass: true });
    }

    // Volatilité réalisée dans plage normale (5% – 80% annualisé)
    if (ind.vol20 === null) {
      reasons.push({ label: 'Volatilité non calculable', pass: false });
    } else if (ind.vol20 < 3) {
      reasons.push({ label: `Vol. réalisée trop basse (${ind.vol20.toFixed(1)}%) — marché plat`, pass: false });
      pass = false;
    } else if (ind.vol20 > 120) {
      reasons.push({ label: `Vol. réalisée trop haute (${ind.vol20.toFixed(1)}%) — chaos`, pass: false });
      pass = false;
    } else {
      reasons.push({ label: `Vol. réalisée = ${ind.vol20.toFixed(1)}% (plage normale)`, pass: true });
    }

    return { pass, reasons };
  }

  /**
   * PHASE 2 : Signal Directionnel
   * Retourne 'long' | 'short' | 'neutral'
   */
  function detectSignal(ind) {
    if (!ind.ema50 || !ind.ema100 || !ind.don55) return 'neutral';

    const longConditions = [
      ind.price > ind.ema100,           // Prix au-dessus EMA 100
      ind.ema50 > ind.ema100,            // EMA 50 > EMA 100 (pente haussière)
      ind.breakoutUp,                    // Cassure Donchian 55 jours
    ];

    const shortConditions = [
      ind.price < ind.ema100,
      ind.ema50 < ind.ema100,
      ind.breakoutDown,
    ];

    const longScore  = longConditions.filter(Boolean).length;
    const shortScore = shortConditions.filter(Boolean).length;

    if (longScore === 3) return 'long';
    if (shortScore === 3) return 'short';
    if (longScore === 2) return 'long';
    if (shortScore === 2) return 'short';
    return 'neutral';
  }

  /**
   * PHASE 3 : Score de Confirmation (0-100)
   * Retourne { score, criteria[] }
   */
  function computeConfidenceScore(ind, direction) {
    const criteria = [];
    let totalScore = 0;
    let maxScore = 0;

    function addCriterion(label, points, maxPoints, condition, description = '') {
      const earned = condition ? points : 0;
      maxScore += maxPoints;
      totalScore += earned;
      criteria.push({
        label,
        description,
        earned,
        max: maxPoints,
        pass: condition,
        partial: earned > 0 && earned < maxPoints,
      });
    }

    // 1. ADX (20 pts)
    const adxOk = ind.adx !== null && ind.adx > 20;
    const adxStrong = ind.adx !== null && ind.adx > 25;
    const adxPts = adxStrong ? 20 : (adxOk ? 12 : 0);
    addCriterion('ADX > 20 (tendance)', adxPts, 20, adxOk,
      `ADX actuel : ${ind.adx ? ind.adx.toFixed(1) : 'N/A'}`);

    // 2. Pente EMA 100 (15 pts)
    const slopeFavorable = direction === 'long' ? ind.slope100 > 0 : ind.slope100 < 0;
    const slopeStrong = Math.abs(ind.slope100) > 0.05;
    const slopePts = slopeFavorable ? (slopeStrong ? 15 : 8) : 0;
    addCriterion('Pente EMA 100 favorable', slopePts, 15, slopeFavorable,
      `Pente : ${ind.slope100 ? ind.slope100.toFixed(3) + '%/jour' : 'N/A'}`);

    // 3. Momentum 3 mois cohérent (15 pts)
    const mom3ok = direction === 'long' ? ind.mom3m > 2 : ind.mom3m < -2;
    const mom3strong = direction === 'long' ? ind.mom3m > 8 : ind.mom3m < -8;
    const mom3pts = mom3strong ? 15 : (mom3ok ? 8 : 0);
    addCriterion('Momentum 3 mois cohérent', mom3pts, 15, mom3ok,
      `Perf 3 mois : ${ind.mom3m ? ind.mom3m.toFixed(1) + '%' : 'N/A'}`);

    // 4. Volume au-dessus de la moyenne (10 pts)
    const volOk = ind.relVol > 1.0;
    const volStrong = ind.relVol > 1.3;
    const volPts = volStrong ? 10 : (volOk ? 5 : 0);
    addCriterion('Volume > moyenne 20 jours', volPts, 10, volOk,
      `Volume relatif : ${ind.relVol ? ind.relVol.toFixed(2) + 'x' : 'N/A'}`);

    // 5. RSI non extrême (10 pts) — filtre anti-suracheté/survendu
    const rsiNotExtreme = direction === 'long'
      ? (ind.rsi !== null && ind.rsi < 75)
      : (ind.rsi !== null && ind.rsi > 25);
    const rsiIdeal = direction === 'long'
      ? (ind.rsi !== null && ind.rsi > 40 && ind.rsi < 65)
      : (ind.rsi !== null && ind.rsi > 35 && ind.rsi < 60);
    const rsiPts = rsiIdeal ? 10 : (rsiNotExtreme ? 5 : 0);
    addCriterion('RSI non extrême (entrée saine)', rsiPts, 10, rsiNotExtreme,
      `RSI 14 : ${ind.rsi ? ind.rsi.toFixed(1) : 'N/A'}`);

    // 6. Espace libre devant (pas de résistance majeure immédiate) (10 pts)
    // Approximation : distance au don55 upper/lower
    const don55Dist = ind.don55 ? (
      direction === 'long'
        ? ((ind.don55.upper - ind.price) / ind.price) * 100
        : ((ind.price - ind.don55.lower) / ind.price) * 100
    ) : 0;
    const spaceOk = don55Dist > 1.5;
    const spaceStrong = don55Dist > 4;
    const spacePts = spaceStrong ? 10 : (spaceOk ? 5 : 0);
    addCriterion('Espace libre devant le prix', spacePts, 10, spaceOk,
      `Distance sortie Donchian : ${don55Dist.toFixed(1)}%`);

    // 7. Volatilité dans plage normale (10 pts)
    const volNormal = ind.vol20 !== null && ind.vol20 > 5 && ind.vol20 < 60;
    addCriterion('Volatilité réalisée normale', volNormal ? 10 : 0, 10, volNormal,
      `Vol annualisée : ${ind.vol20 ? ind.vol20.toFixed(1) + '%' : 'N/A'}`);

    // 8. Cassure Donchian confirmée (10 pts)
    const breakout = direction === 'long' ? ind.breakoutUp : ind.breakoutDown;
    addCriterion(`Cassure Donchian ${direction === 'long' ? 'haute' : 'basse'} 55 jours`, breakout ? 10 : 0, 10, breakout,
      `Niveau : ${ind.don55 ? (direction === 'long' ? ind.don55.upper.toFixed(2) : ind.don55.lower.toFixed(2)) : 'N/A'}`);

    const normalizedScore = Math.round((totalScore / maxScore) * 100);
    return { score: normalizedScore, criteria, rawScore: totalScore, maxScore };
  }

  /**
   * PHASE 4 : Score ajusté avec pénalité risque
   */
  function adjustedScore(confidenceScore, riskLvl) {
    const penalty = RiskCalculator.riskPenalty(riskLvl);
    return Math.round(confidenceScore * (1 - penalty));
  }

  /**
   * Classification du niveau de signal
   */
  function signalStrength(score) {
    if (score >= 70) return 'strong';
    if (score >= 50) return 'medium';
    return 'weak';
  }

  /**
   * Badge "Trade Solide" : 6 conditions strictes
   */
  function isSolidTrade(regime, adjScore, riskLvl, rrRatio) {
    return (
      regime.pass &&
      adjScore >= 70 &&
      (riskLvl === 'low' || riskLvl === 'medium') &&
      rrRatio >= 2
    );
  }

  /**
   * Génère la recommandation textuelle
   */
  function getRecommendation(direction, adjScore, riskLvl, regimePass) {
    if (!regimePass) return 'Régime défavorable — ne pas trader cet actif actuellement.';
    if (direction === 'neutral') return 'Pas de signal clair — attendre une cassure confirmée.';
    if (adjScore >= 70) {
      const dir = direction === 'long' ? 'hausse' : 'baisse';
      return `Signal ${dir} solide. Score ajusté élevé, risque ${riskLvl === 'low' ? 'faible' : 'modéré'}. Entrée prudente possible.`;
    }
    if (adjScore >= 50) {
      return `Signal présent mais modéré. Surveiller une confirmation supplémentaire avant d'entrer.`;
    }
    return 'Signal trop faible ou incertain. Passer son tour.';
  }

  /**
   * ANALYSE COMPLÈTE D'UN ACTIF
   * Entrée : { symbol, name, class, candles[] }
   * Retourne un rapport complet
   */
  function analyzeAsset(asset) {
    const { symbol, name, assetClass } = asset;
    const candles = MOCK_DATA.getOHLC(symbol);
    const priceData = MOCK_DATA.prices[symbol];

    if (!candles || candles.length < 20 || !priceData) {
      return {
        symbol, name, assetClass,
        price: 0,
        change24h: 0,
        error: 'Données insuffisantes',
        direction: 'neutral',
        score: 0,
        adjScore: 0,
        strength: 'weak',
        riskLevel: 'high',
        isSolid: false,
        regime: { pass: false, reasons: [] },
      };
    }

    const ind = Indicators.computeAll(candles);
    if (!ind) {
      return { symbol, name, error: 'Erreur calcul indicateurs', score: 0, adjScore: 0 };
    }

    const settings = Storage.getSettings();

    // Phase 1 : Régime
    const regime = checkRegime(ind);

    // Phase 2 : Signal
    const direction = detectSignal(ind);

    // Si régime échoue ou signal neutre → score 0
    if (!regime.pass || direction === 'neutral') {
      return {
        symbol, name, assetClass,
        price: priceData.price,
        change24h: priceData.change24h,
        direction: direction === 'neutral' ? 'neutral' : direction,
        regime,
        indicators: ind,
        score: 0,
        adjScore: 0,
        strength: 'weak',
        riskLevel: RiskCalculator.riskLevel(ind.atrPct, ind.vol20, ind.adx),
        isSolid: false,
        stopLoss: null,
        takeProfit: null,
        rrRatio: 0,
        confidence: { score: 0, criteria: [] },
        recommendation: !regime.pass
          ? 'Régime défavorable — ne pas trader cet actif actuellement.'
          : 'Pas de signal clair — attendre.',
      };
    }

    // Phase 3 : Score confiance
    const confidence = computeConfidenceScore(ind, direction);

    // Phase 4 : Risque
    const riskLvl = RiskCalculator.riskLevel(ind.atrPct, ind.vol20, ind.adx);
    const adjScoreVal = adjustedScore(confidence.score, riskLvl);
    const strength = signalStrength(adjScoreVal);

    // Stop-loss et TP suggérés
    const stopLoss = RiskCalculator.initialStop(
      priceData.price, ind.atr, direction, settings.stopAtrMultiplier
    );
    const takeProfit = RiskCalculator.takeProfitEstimate(
      priceData.price, stopLoss, direction, 2.5
    );
    const rrRatio = RiskCalculator.riskRewardRatio(priceData.price, stopLoss, takeProfit);

    // Sizing suggéré pour 10 000 € par défaut
    const sizing = RiskCalculator.positionSize(
      10000, settings.riskPerTrade, priceData.price, stopLoss
    );

    const solid = isSolidTrade(regime, adjScoreVal, riskLvl, rrRatio);
    const recommendation = getRecommendation(direction, adjScoreVal, riskLvl, regime.pass);

    return {
      symbol,
      name,
      assetClass,
      price: priceData.price,
      change24h: priceData.change24h,
      volume24h: priceData.volume24h,
      direction,
      regime,
      indicators: ind,
      confidence,
      score: confidence.score,
      adjScore: adjScoreVal,
      strength,
      riskLevel: riskLvl,
      isSolid: solid,
      stopLoss,
      takeProfit,
      rrRatio,
      sizing,
      recommendation,
      candles: candles.slice(-20), // Dernières 20 bougies pour graphique
    };
  }

  /**
   * ANALYSE DE TOUTE LA WATCHLIST
   * Retourne les actifs classés par score ajusté
   */
  function analyzeAll() {
    const watchlist = Storage.getWatchlist();
    const results = watchlist.map(asset => {
      try {
        return analyzeAsset({
          symbol: asset.symbol,
          name: asset.name,
          assetClass: asset.class,
        });
      } catch (e) {
        console.error('[AnalysisEngine] Erreur analyse', asset.symbol, e);
        return { symbol: asset.symbol, name: asset.name, error: e.message, adjScore: 0 };
      }
    });

    // Filtre et trie par score ajusté décroissant
    const tradeable = results
      .filter(r => !r.error && r.adjScore >= Storage.getSettings().minScore)
      .sort((a, b) => b.adjScore - a.adjScore);

    const neutral = results
      .filter(r => !r.error && r.adjScore < Storage.getSettings().minScore && r.adjScore > 0)
      .sort((a, b) => b.adjScore - a.adjScore);

    const inactive = results
      .filter(r => r.error || r.adjScore === 0);

    return { tradeable, neutral, inactive, all: results };
  }

  return {
    analyzeAsset,
    analyzeAll,
    computeConfidenceScore,
    detectSignal,
    checkRegime,
    signalStrength,
    isSolidTrade,
  };

})();

// ═══ twelveData.js ═══
/* ============================================
   MANITRADEPRO — Client Twelve Data
   Rotation 4 clés, cache, file d'attente
   ============================================ */

const TwelveDataClient = (() => {

  const BASE_URL = 'https://api.twelvedata.com';
  const CACHE = new Map();

  // ── ÉTAT DES CLÉS
  let keyStates = [];

  function initKeys() {
    const _stored = Storage.getApiKeys();
    // Normalize: always work with array of {key, label} objects
    let keyList;
    if (Array.isArray(_stored)) {
      keyList = _stored.map((k, i) => ({ key: k || '', label: 'Clé ' + (i + 1) }));
    } else {
      keyList = (_stored.twelveData || []);
    }
    keyStates = keyList.map((k, i) => ({
      key:       k.key || k || '',
      label:     k.label || ('Clé ' + (i + 1)),
      callsMin:  0,
      callsDay:  0,
      status:    (k.key || k) ? 'active' : 'unconfigured',
      lastReset: Date.now(),
      lastCall:  0,
    }));
    // Si aucune clé configurée, ajouter 4 slots vides
    if (keyStates.length === 0) {
      keyStates = [1,2,3,4].map(i => ({
        key: '', label: 'Clé ' + i, callsMin: 0, callsDay: 0,
        status: 'unconfigured', lastReset: Date.now(), lastCall: 0,
      }));
    }
  }

  // ── SÉLECTION DE LA MEILLEURE CLÉ
  function selectBestKey() {
    const active = keyStates.filter(k => k.status === 'active' && k.key);
    if (active.length === 0) return null;

    // Choisir la clé avec le moins d'appels dans la minute
    return active.reduce((best, k) => {
      // Reset compteur si > 1 minute
      if (Date.now() - k.lastReset > 60000) {
        k.callsMin = 0;
        k.lastReset = Date.now();
      }
      return (k.callsMin < best.callsMin) ? k : best;
    });
  }

  // ── CACHE KEY
  function cacheKey(endpoint, params) {
    return endpoint + '|' + JSON.stringify(params);
  }

  // ── APPEL API (avec cache)
  async function call(endpoint, params, ttlMs = 60000) {
    const ck = cacheKey(endpoint, params);
    const cached = CACHE.get(ck);
    if (cached && Date.now() - cached.ts < ttlMs) {
      return cached.data;
    }

    const keyState = selectBestKey();
    if (!keyState) {
      console.warn('[TwelveData] Aucune clé API configurée — mode mock');
      return null; // L'app utilisera les données mock
    }

    const urlParams = new URLSearchParams({ ...params, apikey: keyState.key });
    const url = `${BASE_URL}/${endpoint}?${urlParams}`;

    try {
      keyState.callsMin++;
      keyState.callsDay++;
      keyState.lastCall = Date.now();

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.code && data.code >= 400) {
        console.error('[TwelveData] Erreur API:', data.message);
        if (data.code === 429) keyState.status = 'throttled';
        return null;
      }

      CACHE.set(ck, { data, ts: Date.now() });
      return data;

    } catch (e) {
      console.error('[TwelveData] Erreur réseau:', e);
      keyState.status = 'error';
      return null;
    }
  }

  // ── API PUBLIQUE

  /**
   * Prix temps réel d'un symbole
   */
  async function getPrice(symbol) {
    // V1 : retourne prix mock si pas de clé
    const keys = Storage.getApiKeys();
    const hasKey = keys.twelveData.some(k => k.key);
    if (!hasKey) {
      const mock = MOCK_DATA.prices[symbol];
      return mock || null;
    }
    const data = await call('price', { symbol }, 30000); // TTL 30s
    return data ? { price: parseFloat(data.price) } : MOCK_DATA.prices[symbol];
  }

  /**
   * OHLCV historique
   */
  async function getTimeSeries(symbol, interval = '1day', outputsize = 60) {
    const keys = Storage.getApiKeys();
    const hasKey = keys.twelveData.some(k => k.key);
    if (!hasKey) {
      // Retourne données mock
      return MOCK_DATA.getOHLC(symbol);
    }
    const data = await call('time_series', { symbol, interval, outputsize }, 300000); // TTL 5min
    if (!data || !data.values) return MOCK_DATA.getOHLC(symbol);

    return data.values.reverse().map(v => ({
      ts:    new Date(v.datetime).getTime(),
      open:  parseFloat(v.open),
      high:  parseFloat(v.high),
      low:   parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume || 0),
    }));
  }

  /**
   * Statut des clés (pour l'écran paramètres)
   */
  function getKeyStatus() {
    return keyStates.map(k => ({
      label:    k.label,
      status:   k.status,
      callsMin: k.callsMin,
      callsDay: k.callsDay,
      hasKey:   !!k.key,
    }));
  }

  /**
   * Vide le cache (debug/refresh forcé)
   */
  function clearCache() {
    CACHE.clear();
    console.log('[TwelveData] Cache vidé');
  }

  // Init au chargement
  function init() {
    initKeys();
    console.log('[TwelveData] Client initialisé —', keyStates.filter(k => k.key).length, 'clé(s) configurée(s)');
  }

  return {
    init,
    getPrice,
    getTimeSeries,
    getKeyStatus,
    clearCache,
    _keyStates: keyStates,
  };

})();

// ═══ brokerAdapter.js ═══
/* ============================================
   MANITRADEPRO — BrokerAdapter
   Couche d'abstraction : Mock / Binance / Trade Republic
   ============================================ */

const BrokerAdapter = (() => {

  // ── MOCK ADAPTER (Simulation)
  const MockAdapter = {
    name: 'Simulation',
    type: 'mock',
    connected: true,

    async getBalance() {
      const cap = Storage.getSimCapital();
      // Calculer capital réel = initial + P&L des positions ouvertes
      const positions = Storage.getSimPositions();
      let openPnL = 0;
      positions.forEach(p => {
        const currentPrice = MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
        openPnL += RiskCalculator.openPnL(p.entryPrice, currentPrice, p.quantity, p.direction);
      });
      return {
        available: cap.current,
        total: cap.current + openPnL,
        currency: 'EUR',
      };
    },

    async placeOrder(order) {
      // Simule un ordre : crée une position fictive
      const { symbol, direction, quantity, entryPrice, stopLoss, takeProfit } = order;
      const newPosition = {
        id:         'sim_' + Date.now(),
        mode:       'sim',
        symbol,
        name:       MOCK_DATA.watchlist.find(a => a.symbol === symbol)?.name || symbol,
        direction,
        entryPrice,
        quantity,
        invested:   entryPrice * quantity,
        stopLoss,
        takeProfit,
        openedAt:   Date.now(),
      };

      // Déduit du capital disponible
      const cap = Storage.getSimCapital();
      cap.current -= newPosition.invested;
      Storage.saveSimCapital(cap);

      const positions = Storage.getSimPositions();
      positions.push(newPosition);
      Storage.saveSimPositions(positions);

      return { success: true, position: newPosition, orderId: newPosition.id };
    },

    async closePosition(positionId) {
      const positions = Storage.getSimPositions();
      const idx = positions.findIndex(p => p.id === positionId);
      if (idx === -1) return { success: false, error: 'Position introuvable' };

      const pos = positions[idx];
      const currentPrice = MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
      const pnl = RiskCalculator.openPnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction);
      const pnlPct = RiskCalculator.openPnLPct(pos.entryPrice, currentPrice, pos.direction);

      // Ajoute au capital
      const cap = Storage.getSimCapital();
      cap.current += pos.invested + pnl;
      Storage.saveSimCapital(cap);

      // Déplace vers historique
      const history = Storage.getSimHistory();
      history.unshift({
        id:          'h_' + Date.now(),
        symbol:      pos.symbol,
        direction:   pos.direction,
        entryPrice:  pos.entryPrice,
        exitPrice:   currentPrice,
        pnl,
        pnlPct,
        closedAt:    Date.now(),
        durationDays: Math.round((Date.now() - pos.openedAt) / 86400000),
      });
      Storage.saveSimHistory(history);

      // Supprime la position ouverte
      positions.splice(idx, 1);
      Storage.saveSimPositions(positions);

      return { success: true, pnl, pnlPct, exitPrice: currentPrice };
    },

    async getOpenOrders() {
      return Storage.getSimPositions();
    },
  };

  // ── BINANCE ADAPTER (préparé pour V2)
  const BinanceAdapter = {
    name: 'Binance',
    type: 'binance',
    connected: false,

    async connect(apiKey, secret) {
      // TODO V2 : Vérifier la clé API Binance
      // const resp = await fetch('https://api.binance.com/api/v3/account', {
      //   headers: { 'X-MBX-APIKEY': apiKey }
      // });
      console.log('[Binance] Connexion à implémenter en V2');
      return { success: false, error: 'Binance non disponible en V1' };
    },

    async getBalance() {
      // TODO V2 : GET /api/v3/account
      return { available: 0, total: 0, currency: 'USDT' };
    },

    async placeOrder(order) {
      // TODO V2 : POST /api/v3/order
      return { success: false, error: 'Binance non disponible en V1' };
    },

    async closePosition(positionId) {
      return { success: false, error: 'Binance non disponible en V1' };
    },

    async cancelOrder(orderId) {
      // TODO V2 : DELETE /api/v3/order
      return { success: false, error: 'Non implémenté' };
    },
  };

  // ── TRADE REPUBLIC ADAPTER (préparé pour V2)
  const TradeRepublicAdapter = {
    name: 'Trade Republic',
    type: 'tradeRepublic',
    connected: false,

    async connect(phone, pin) {
      // TODO V2 : WebSocket Trade Republic (protocole non officiel)
      // Ou via Open Banking / PSD2 si disponible
      console.log('[TradeRepublic] Connexion à implémenter en V2');
      return { success: false, error: 'Trade Republic non disponible en V1' };
    },

    async getBalance() {
      return { available: 0, total: 0, currency: 'EUR' };
    },

    async placeOrder(order) {
      return { success: false, error: 'Trade Republic non disponible en V1' };
    },
  };

  // ── SÉLECTION DU BROKER ACTIF
  let activeAdapter = MockAdapter;

  function getAdapter(mode) {
    if (mode === 'sim') return MockAdapter;
    const settings = Storage.getSettings();
    const keys = Storage.getApiKeys();
    if (keys.binance.connected) return BinanceAdapter;
    if (keys.tradeRepublic.connected) return TradeRepublicAdapter;
    return MockAdapter;
  }

  // ── INTERFACE PUBLIQUE

  async function placeOrder(order, mode = 'sim') {
    const adapter = getAdapter(mode);
    // Sécurité : double vérification mode
    if (mode === 'real' && adapter.type === 'mock') {
      return { success: false, error: 'Aucun broker réel configuré. Utilisez le mode simulation.' };
    }
    return adapter.placeOrder(order);
  }

  async function closePosition(positionId, mode = 'sim') {
    const adapter = getAdapter(mode);
    return adapter.closePosition(positionId);
  }

  async function getBalance(mode = 'sim') {
    const adapter = getAdapter(mode);
    return adapter.getBalance();
  }

  function getBrokerStatus() {
    const keys = Storage.getApiKeys();
    return {
      simulation: { name: 'Simulation', connected: true, type: 'mock' },
      binance:    { name: 'Binance', connected: keys.binance.connected, type: 'binance' },
      tradeRepublic: { name: 'Trade Republic', connected: keys.tradeRepublic.connected, type: 'tradeRepublic' },
    };
  }

  return {
    placeOrder,
    closePosition,
    getBalance,
    getBrokerStatus,
    MockAdapter,
    BinanceAdapter,
    TradeRepublicAdapter,
  };

})();

// ═══ formatting.js ═══
/* ============================================
   MANITRADEPRO — Utilitaires de Formatage
   ============================================ */

const Fmt = (() => {

  // ── PRIX
  function price(value, symbol = '') {
    if (value === null || value === undefined) return '—';
    const abs = Math.abs(value);
    let formatted;

    if (abs >= 10000) {
      formatted = value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (abs >= 100) {
      formatted = value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (abs >= 1) {
      formatted = value.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else {
      formatted = value.toLocaleString('fr-FR', { minimumFractionDigits: 5, maximumFractionDigits: 6 });
    }

    return formatted;
  }

  // ── MONTANT en EUR
  function currency(value, decimals = 2) {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // ── POURCENTAGE
  function pct(value, decimals = 2, showSign = true) {
    if (value === null || value === undefined) return '—';
    const sign = showSign && value > 0 ? '+' : '';
    return sign + value.toFixed(decimals) + '%';
  }

  // ── P&L avec signe et couleur CSS class
  function pnlClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  // ── VARIATION 24H
  function change(value) {
    if (value === null || value === undefined) return { text: '—', cls: '' };
    const sign = value > 0 ? '+' : '';
    return {
      text: sign + value.toFixed(2) + '%',
      cls:  value >= 0 ? 'up' : 'down',
    };
  }

  // ── DURÉE (depuis timestamp)
  function duration(fromTs) {
    const diff = Date.now() - fromTs;
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  // ── DATE
  function date(ts) {
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
  }

  // ── VOLUME (compact)
  function volume(v) {
    if (!v) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'G';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toFixed(0);
  }

  // ── ICÔNE DIRECTION
  function directionIcon(direction) {
    if (direction === 'long')  return '↑';
    if (direction === 'short') return '↓';
    return '—';
  }

  // ── LABEL DIRECTION
  function directionLabel(direction) {
    if (direction === 'long')  return 'Long';
    if (direction === 'short') return 'Short';
    return 'Neutre';
  }

  // ── LABEL RISQUE
  function riskLabel(level) {
    if (level === 'low')    return 'Faible';
    if (level === 'medium') return 'Modéré';
    if (level === 'high')   return 'Élevé';
    return '—';
  }

  // ── LABEL PROFIL
  function profileLabel(profile) {
    if (profile === 'conservative') return 'Conservateur';
    if (profile === 'balanced')     return 'Équilibré';
    if (profile === 'aggressive')   return 'Agressif';
    return profile;
  }

  // ── ICON ASSET
  function assetIcon(symbol) {
    return MOCK_DATA.icons[symbol] || symbol.slice(0, 2).toUpperCase();
  }

  return {
    price, currency, pct, pnlClass, change,
    duration, date, volume, directionIcon, directionLabel,
    riskLabel, profileLabel, assetIcon,
  };

})();

// ═══ sync.js ═══
/* ============================================
   MANITRADEPRO — Sync + UI Helpers
   ============================================ */

// ── SYNC (V1 : local, V2 : Firebase)
const Sync = (() => {

  let lastSyncTime = Date.now();

  function init() {
    // V1 : Rafraîchissement local toutes les 30s
    setInterval(() => {
      refreshPrices();
    }, 30000);

    // TODO V2 : Firebase listener
    // firebase.database().ref('users/' + userId).on('value', (snapshot) => {
    //   const data = snapshot.val();
    //   applyRemoteData(data);
    //   lastSyncTime = Date.now();
    // });

    console.log('[Sync] V1 local — rafraîchissement toutes les 30s');
  }

  function refreshPrices() {
    // En V1 : légère variation aléatoire des prix mock pour simuler le live
    Object.keys(MOCK_DATA.prices).forEach(sym => {
      const p = MOCK_DATA.prices[sym];
      const variation = (Math.random() - 0.5) * 0.002; // ±0.1%
      p.price = p.price * (1 + variation);
      p.change24h += (Math.random() - 0.5) * 0.05;
    });

    // Met à jour l'affichage des positions si on est sur l'écran positions
    if (Router.getCurrent() === 'positions' || Router.getCurrent() === 'dashboard') {
      // Rafraîchit les P&L dynamiquement
      updateLivePnL();
    }
    lastSyncTime = Date.now();
  }

  function updateLivePnL() {
    const positions = Storage.getSimPositions();
    positions.forEach(pos => {
      const currentPrice = MOCK_DATA.prices[pos.symbol]?.price || pos.entryPrice;
      const pnl = RiskCalculator.openPnL(pos.entryPrice, currentPrice, pos.quantity, pos.direction);
      const pnlPct = RiskCalculator.openPnLPct(pos.entryPrice, currentPrice, pos.direction);

      const el = document.querySelector(`[data-position-pnl="${pos.id}"]`);
      if (el) {
        el.textContent = Fmt.currency(pnl);
        el.className = 'pnl-value ' + Fmt.pnlClass(pnl);
      }
      const pctEl = document.querySelector(`[data-position-pnlpct="${pos.id}"]`);
      if (pctEl) {
        pctEl.textContent = Fmt.pct(pnlPct);
        pctEl.className = 'pnl-pct ' + Fmt.pnlClass(pnlPct);
      }
      const priceEl = document.querySelector(`[data-position-price="${pos.id}"]`);
      if (priceEl) {
        priceEl.textContent = Fmt.price(currentPrice);
      }
    });
  }

  function getLastSync() {
    const diff = Math.round((Date.now() - lastSyncTime) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    return `il y a ${Math.round(diff / 60)}min`;
  }

  return { init, refreshPrices, getLastSync };

})();

// ── UI HELPERS
const UI = (() => {

  // ── TOAST
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

  // ── MODAL CONFIRM
  function confirm(title, message, isDangerous = false) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');

      content.innerHTML = `
        <div style="padding: var(--space-6);">
          <div style="font-family: var(--font-mono); font-size: var(--text-lg); font-weight: 700;
            color: ${isDangerous ? 'var(--real-color)' : 'var(--text-primary)'}; margin-bottom: var(--space-3);">
            ${title}
          </div>
          <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-6); line-height: 1.6;">
            ${message}
          </p>
          ${isDangerous ? `
            <div class="warning-box danger" style="margin-bottom: var(--space-5);">
              ⚠️ Cette action concerne des fonds RÉELS. Assurez-vous de votre décision.
            </div>
          ` : ''}
          <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
            <button class="btn btn-ghost" id="modal-cancel">Annuler</button>
            <button class="btn ${isDangerous ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">
              ${isDangerous ? '⚠️ Confirmer (Réel)' : 'Confirmer'}
            </button>
          </div>
        </div>
      `;

      overlay.classList.remove('hidden');

      document.getElementById('modal-cancel').onclick = () => {
        overlay.classList.add('hidden');
        resolve(false);
      };
      document.getElementById('modal-confirm').onclick = () => {
        overlay.classList.add('hidden');
        resolve(true);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
          resolve(false);
        }
      };
    });
  }

  // ── MODAL OPEN ORDER
  function openOrderModal(symbol, mode, analysis) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');
      const settings = Storage.getSettings();
      const simCap = Storage.getSimCapital();

      const isSim = mode === 'sim';
      const price = MOCK_DATA.prices[symbol]?.price || 0;
      const stop  = analysis.stopLoss || (price * 0.98);
      const tp    = analysis.takeProfit || (price * 1.05);
      const riskAmount = simCap.current * settings.riskPerTrade;
      const qty   = analysis.sizing?.units || (riskAmount / Math.abs(price - stop));
      const invested = qty * price;

      content.innerHTML = `
        <div style="padding: var(--space-6);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5);">
            <div style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: 700;">
              ${symbol}
              <span class="direction-tag ${analysis.direction}" style="margin-left: var(--space-2);">
                ${Fmt.directionIcon(analysis.direction)} ${Fmt.directionLabel(analysis.direction)}
              </span>
            </div>
            <span class="${isSim ? 'hero-mode-tag sim' : 'hero-mode-tag real'}">
              ${isSim ? '⚡ SIMULATION' : '⚠️ RÉEL'}
            </span>
          </div>

          ${!isSim ? `
            <div class="warning-box danger" style="margin-bottom: var(--space-5);">
              ⚠️ MODE RÉEL — Cette position utilisera de vrais fonds depuis votre broker.
              Aucun broker réel n'est configuré en V1 — cette action est bloquée.
            </div>
          ` : ''}

          <div class="mode-zone ${isSim ? 'sim-zone' : 'real-zone'}">
            <div class="mode-zone-title">
              ${isSim ? '⚡ Paramètres de la position fictive' : '⚠️ Paramètres de la position réelle'}
            </div>

            <div class="input-group">
              <label class="input-label">Montant investi (€)</label>
              <input type="number" class="input-field" id="order-amount"
                value="${invested.toFixed(2)}" min="1" step="0.01" />
              <div class="input-hint">Capital disponible : ${Fmt.currency(simCap.current)}</div>
            </div>

            <div class="grid-2" style="gap: var(--space-3);">
              <div class="input-group">
                <label class="input-label">Stop-loss</label>
                <input type="number" class="input-field" id="order-stop"
                  value="${stop.toFixed(4)}" step="0.0001" />
              </div>
              <div class="input-group">
                <label class="input-label">Take profit</label>
                <input type="number" class="input-field" id="order-tp"
                  value="${tp.toFixed(4)}" step="0.0001" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3);
              background: var(--bg-elevated); border-radius: 8px; padding: var(--space-3); margin-top: var(--space-2);">
              <div>
                <div class="pos-detail-label">Prix d'entrée</div>
                <div class="pos-detail-value">${Fmt.price(price)}</div>
              </div>
              <div>
                <div class="pos-detail-label">Quantité</div>
                <div class="pos-detail-value" id="order-qty-display">${qty.toFixed(4)}</div>
              </div>
              <div>
                <div class="pos-detail-label">R/R estimé</div>
                <div class="pos-detail-value">${analysis.rrRatio}:1</div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: var(--space-3); margin-top: var(--space-5);">
            <button class="btn btn-ghost" id="order-cancel" style="flex: 1;">Annuler</button>
            <button class="btn ${isSim ? 'btn-sim' : 'btn-real'}" id="order-confirm"
              style="flex: 2;" ${!isSim ? 'disabled' : ''}>
              ${isSim ? '⚡ Ouvrir en simulation' : '⚠️ Non disponible en V1'}
            </button>
          </div>
        </div>
      `;

      overlay.classList.remove('hidden');

      document.getElementById('order-cancel').onclick = () => {
        overlay.classList.add('hidden');
        resolve(null);
      };

      if (isSim) {
        document.getElementById('order-confirm').onclick = async () => {
          const amount   = parseFloat(document.getElementById('order-amount').value);
          const stopVal  = parseFloat(document.getElementById('order-stop').value);
          const tpVal    = parseFloat(document.getElementById('order-tp').value);
          const qtyCalc  = amount / price;

          overlay.classList.add('hidden');
          resolve({
            symbol,
            direction: analysis.direction,
            quantity:  qtyCalc,
            entryPrice: price,
            stopLoss:  stopVal,
            takeProfit: tpVal,
          });
        };
      }

      overlay.onclick = (e) => {
        if (e.target === overlay) { overlay.classList.add('hidden'); resolve(null); }
      };
    });
  }

  // ── SCORE RING SVG
  function scoreRing(score, size = 44) {
    const strength = score >= 70 ? 'strong' : score >= 50 ? 'medium' : 'weak';
    const color = score >= 70 ? 'var(--signal-strong)' : score >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)';
    const r = (size / 2) - 4;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    return `
      <div class="score-ring" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}"
            fill="none" stroke="var(--bg-elevated)" stroke-width="3"/>
          <circle cx="${size/2}" cy="${size/2}" r="${r}"
            fill="none" stroke="${color}" stroke-width="3"
            stroke-dasharray="${dash} ${circ}"
            stroke-linecap="round"
            style="transition: stroke-dasharray 0.6s ease;"/>
        </svg>
        <div class="score-ring-text" style="color:${color}; font-size:${size < 50 ? '10px' : '13px'};">
          ${score}
        </div>
      </div>
    `;
  }

  // ── MINI SPARKLINE (canvas SVG simple)
  function sparkline(candles, width = 80, height = 30) {
    if (!candles || candles.length < 2) return `<div style="width:${width}px;height:${height}px;"></div>`;
    const closes = candles.map(c => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const pts = closes.map((v, i) => {
      const x = (i / (closes.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const lastClose = closes[closes.length - 1];
    const firstClose = closes[0];
    const color = lastClose >= firstClose ? 'var(--profit)' : 'var(--loss)';

    return `
      <svg width="${width}" height="${height}" style="display:block;">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
      </svg>
    `;
  }

  // ── UPDATE MODE BANNER
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

// ═══ router.js ═══
/* ============================================
   MANITRADEPRO — Router SPA
   ============================================ */

const Router = (() => {

  let currentScreen = 'dashboard';
  const screens = {};
  let assetDetailParam = null;

  function register(name, renderFn) {
    screens[name] = renderFn;
  }

  function attachNavClicks() {
    document.querySelectorAll('.nav-item, .bnav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.dataset.screen;
        if (target) navigate(target);
      });
    });
  }

  function navigate(screenName, params = null) {
    if (screenName === 'asset-detail') {
      assetDetailParam = params;
    }
    currentScreen = screenName;
    render();
    updateNav(screenName);
    window.scrollTo(0, 0);
  }

  function render() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const renderFn = screens[currentScreen];
    if (!renderFn) {
      main.innerHTML = `<div class="screen" id="screen-${currentScreen}"><p>Écran "${currentScreen}" non trouvé.</p></div>`;
      return;
    }

    // Inject wrapper div with correct id so screens using getElementById work
    main.innerHTML = `<div class="screen" id="screen-${currentScreen}"></div>`;

    if (currentScreen === 'asset-detail') {
      const result = renderFn(assetDetailParam);
      if (result) main.innerHTML = result;
    } else {
      const result = renderFn();
      if (result) main.querySelector('.screen').innerHTML = result;
    }

    // Attache les événements de l'écran
    attachScreenEvents(currentScreen);
  }

  function updateNav(screenName) {
    // Sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screenName);
    });
    // Bottom nav
    document.querySelectorAll('.bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screenName);
    });
  }

  function attachScreenEvents(screenName) {
    // Navigation interne aux écrans
    document.querySelectorAll('[data-screen]').forEach(el => {
      if (el.closest('.nav-item') || el.closest('.bnav-item')) return; // déjà géré
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.dataset.screen;
        const symbol = el.dataset.symbol;
        navigate(target, symbol ? { symbol } : null);
      });
    });

    // Boutons de fermeture de position
    document.querySelectorAll('[data-close-position]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const posId = btn.dataset.closePosition;
        const mode  = btn.dataset.mode || 'sim';
        await handleClosePosition(posId, mode);
      });
    });

    // Boutons d'ouverture de position
    document.querySelectorAll('[data-open-position]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = btn.dataset.symbol;
        const mode   = btn.dataset.mode || 'sim';
        handleOpenPosition(symbol, mode);
      });
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const group = tab.dataset.group;
        const target = tab.dataset.tab;
        document.querySelectorAll(`[data-group="${group}"]`).forEach(t => {
          t.classList.toggle('active', t.dataset.tab === target);
        });
        document.querySelectorAll(`[data-tab-content="${group}"]`).forEach(c => {
          c.style.display = c.dataset.tabId === target ? '' : 'none';
        });
      });
    });

    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.filterGroup;
        document.querySelectorAll(`[data-filter-group="${group}"]`)
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Déclenche l'événement de filtre
        const filterEvent = new CustomEvent('filter-change', {
          detail: { group, value: btn.dataset.filter }
        });
        document.dispatchEvent(filterEvent);
      });
    });
  }

  async function handleClosePosition(posId, mode) {
    const confirmed = await UI.confirm(
      'Fermer la position',
      `Voulez-vous fermer cette position ${mode === 'sim' ? 'fictive' : '⚠️ RÉELLE'} ?`,
      mode === 'real'
    );
    if (!confirmed) return;

    const result = await BrokerAdapter.closePosition(posId, mode);
    if (result.success) {
      const pnlText = result.pnl >= 0
        ? `+${Fmt.currency(result.pnl)} (${Fmt.pct(result.pnlPct)})`
        : `${Fmt.currency(result.pnl)} (${Fmt.pct(result.pnlPct)})`;
      UI.toast(`Position fermée — ${pnlText}`, result.pnl >= 0 ? 'success' : 'warning');
      navigate('positions');
    } else {
      UI.toast('Erreur : ' + result.error, 'error');
    }
  }

  async function handleOpenPosition(symbol, mode) {
    const analysis = AnalysisEngine.analyzeAsset({
      symbol,
      name: MOCK_DATA.watchlist.find(a => a.symbol === symbol)?.name || symbol,
    });
    navigate('asset-detail', { symbol, analysis, mode });
  }

  function getCurrent() { return currentScreen; }

  return { register, navigate, render, getCurrent, attachNavClicks };

})();

// ═══ dashboard.js ═══
/* ============================================
   MANITRADEPRO — Écran Dashboard
   ============================================ */

function renderDashboard() {
  const settings = Storage.getSettings();
  const simCap   = Storage.getSimCapital();
  const simPos   = Storage.getSimPositions();
  const realPos  = Storage.getRealPositions();

  // Calcule P&L total des positions sim ouvertes
  let totalPnL = 0, totalInvested = 0;
  simPos.forEach(p => {
    const curr = MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
    const pnl  = RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
    totalPnL += pnl;
    totalInvested += p.invested;
  });

  const capitalTotal = simCap.current + totalInvested;
  const globalReturn = ((capitalTotal - simCap.initial) / simCap.initial) * 100;

  // Analyse rapide du marché
  const analysis = AnalysisEngine.analyzeAll();
  const top5 = analysis.tradeable.slice(0, 5);
  const regime = MOCK_DATA.marketRegime;

  return `
    <div class="screen">
      <div class="screen-header">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);">
          <div>
            <div class="screen-title">Tableau de bord</div>
            <div class="screen-subtitle">Vue d'ensemble — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
          <span class="hero-mode-tag sim">⚡ Simulation active</span>
        </div>
      </div>

      
      <div class="dashboard-hero">
        <div class="hero-label">Capital simulation total estimé</div>
        <div class="hero-capital">${Fmt.currency(capitalTotal)}</div>
        <div class="hero-pnl">
          <span class="hero-pnl-value ${Fmt.pnlClass(totalPnL)}" style="font-size:var(--text-xl);font-family:var(--font-mono);">
            ${totalPnL >= 0 ? '+' : ''}${Fmt.currency(totalPnL)}
          </span>
          <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-secondary);">
            (${Fmt.pct(globalReturn)})
          </span>
          <span style="font-size:var(--text-xs);color:var(--text-muted);">P&L positions ouvertes</span>
        </div>
      </div>

      
      <div class="grid-4" style="margin-bottom:var(--space-8);">
        <div class="stat-card">
          <div class="stat-label">Capital disponible</div>
          <div class="stat-value">${Fmt.currency(simCap.current)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Positions ouvertes</div>
          <div class="stat-value">${simPos.length + realPos.length}</div>
          <div class="stat-change" style="color:var(--text-muted);">${simPos.length} sim · ${realPos.length} réel</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Opportunités détectées</div>
          <div class="stat-value">${analysis.tradeable.length}</div>
          <div class="stat-change up">↑ Score ≥ 50</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Trades solides</div>
          <div class="stat-value">${analysis.tradeable.filter(a => a.isSolid).length}</div>
          <div class="stat-change" style="color:var(--accent);">Score ajusté ≥ 70</div>
        </div>
      </div>

      
      <div class="section-title">
        <span>Régime du marché</span>
        <span class="see-all-link" data-screen="opportunities">Voir tous les signaux →</span>
      </div>
      <div class="regime-row">
        <div class="regime-card">
          <div class="regime-icon">${regime.icon}</div>
          <div>
            <div class="regime-label">Régime global</div>
            <div class="regime-value" style="color:${regime.color};">${regime.label}</div>
          </div>
        </div>
        <div class="regime-card">
          <div class="regime-icon">◎</div>
          <div>
            <div class="regime-label">Signaux actifs</div>
            <div class="regime-value">${analysis.tradeable.length} / ${analysis.all.length} actifs</div>
          </div>
        </div>
        <div class="regime-card">
          <div class="regime-icon">◷</div>
          <div>
            <div class="regime-label">Score marché moyen</div>
            <div class="regime-value">${regime.score}/100</div>
          </div>
        </div>
      </div>

      
      <div class="section-title" style="margin-top:var(--space-6);">
        <span>Top opportunités</span>
        <span class="see-all-link" data-screen="opportunities">Voir tout →</span>
      </div>

      ${top5.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">◎</div>
          <div class="empty-title">Aucune opportunité filtrée</div>
          <div class="empty-desc">Les filtres de régime n'ont pas validé d'actif. Marché peu favorable.</div>
        </div>
      ` : top5.map((a, i) => renderOpportunityRow(a, i + 1)).join('')}

      
      ${simPos.length > 0 ? `
        <div class="section-title" style="margin-top:var(--space-8);">
          <span>Positions ouvertes</span>
          <span class="see-all-link" data-screen="positions">Tout voir →</span>
        </div>
        ${simPos.slice(0, 3).map(p => renderPositionCardMini(p)).join('')}
      ` : ''}

      
      <div class="warning-box" style="margin-top:var(--space-8);">
        📊 ManiTradePro est un outil d'aide à la décision. Les scores et signaux ne constituent pas des conseils financiers.
        Tout trading comporte un risque de perte en capital. En mode simulation, aucun argent réel n'est engagé.
      </div>
    </div>
  `;
}

function renderOpportunityRow(a, rank) {
  const change = Fmt.change(a.change24h);
  const candles = MOCK_DATA.getOHLC(a.symbol);
  return `
    <div class="opp-row" data-screen="asset-detail" data-symbol="${a.symbol}">
      <div class="opp-rank">#${rank}</div>
      ${UI.scoreRing(a.adjScore, 44)}
      <div class="asset-icon">${Fmt.assetIcon(a.symbol)}</div>
      <div class="opp-asset">
        <div style="display:flex;align-items:center;gap:var(--space-2);">
          <span class="asset-symbol">${a.symbol}</span>
          ${a.isSolid ? '<span class="solid-badge">★ Solide</span>' : ''}
          <span class="direction-tag ${a.direction}">${Fmt.directionIcon(a.direction)} ${Fmt.directionLabel(a.direction)}</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${a.name}</div>
      </div>
      <div style="flex-shrink:0;">${UI.sparkline(candles.slice(-15), 70, 28)}</div>
      <div class="opp-price">${Fmt.price(a.price)}</div>
      <div class="opp-change ${change.cls}">${change.text}</div>
      <div class="opp-score-col">
        <span class="risk-badge ${a.riskLevel}">${Fmt.riskLabel(a.riskLevel)}</span>
      </div>
    </div>
  `;
}

function renderPositionCardMini(p) {
  const curr = MOCK_DATA.prices[p.symbol]?.price || p.entryPrice;
  const pnl  = RiskCalculator.openPnL(p.entryPrice, curr, p.quantity, p.direction);
  const pnlP = RiskCalculator.openPnLPct(p.entryPrice, curr, p.direction);
  return `
    <div class="position-card sim">
      <div class="position-header">
        <div class="position-asset">
          <div class="asset-icon">${Fmt.assetIcon(p.symbol)}</div>
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span class="asset-symbol">${p.symbol}</span>
              <span class="direction-tag ${p.direction}">${Fmt.directionLabel(p.direction)}</span>
              <span style="font-size:var(--text-xs);background:var(--sim-bg);color:var(--sim-color);padding:1px 6px;border-radius:4px;border:1px solid var(--sim-border);">SIM</span>
            </div>
            <div class="asset-name">${p.name}</div>
          </div>
        </div>
        <div class="position-pnl">
          <div class="pnl-value ${Fmt.pnlClass(pnl)}" data-position-pnl="${p.id}">${Fmt.currency(pnl)}</div>
          <div class="pnl-pct ${Fmt.pnlClass(pnlP)}" data-position-pnlpct="${p.id}">${Fmt.pct(pnlP)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:var(--text-xs);color:var(--text-muted);">
          Investi : ${Fmt.currency(p.invested)} · Entrée : ${Fmt.price(p.entryPrice)} · Actuel : <span data-position-price="${p.id}">${Fmt.price(curr)}</span>
        </span>
        <span style="font-size:var(--text-xs);color:var(--text-muted);">${Fmt.duration(p.openedAt)}</span>
      </div>
    </div>
  `;
}

// Enregistre l'écran
Router.register('dashboard', renderDashboard);

// ═══ opportunities.js ═══
/* ============================================
   MANITRADEPRO — Écran Opportunités
   ============================================ */

function renderOpportunities() {
  const analysis = AnalysisEngine.analyzeAll();

  return `
    <div class="screen">
      <div class="screen-header">
        <div class="screen-title">Opportunités</div>
        <div class="screen-subtitle">Actifs analysés et classés par score de confiance ajusté</div>
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
        <div class="section-sep">
          <span class="sep-label">★ Trades solides (6 conditions réunies)</span>
          <div class="sep-line"></div>
        </div>
        <div id="solid-list">
          ${analysis.tradeable.filter(a => a.isSolid).map((a, i) => renderOppCard(a, i + 1, true)).join('')}
        </div>
      ` : ''}

      
      <div class="section-sep">
        <span class="sep-label">Opportunités actives (score ≥ 50)</span>
        <div class="sep-line"></div>
        <span style="font-size:var(--text-xs);color:var(--text-muted);">${analysis.tradeable.length} actif(s)</span>
      </div>
      <div id="opp-list">
        ${analysis.tradeable.length === 0
          ? `<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-title">Aucune opportunité validée</div><div class="empty-desc">Les filtres de régime et de score n'ont retenu aucun actif. Régime de marché défavorable ou insuffisant.</div></div>`
          : analysis.tradeable.map((a, i) => renderOppCard(a, i + 1, false)).join('')
        }
      </div>

      
      ${analysis.neutral.length > 0 ? `
        <div class="section-sep">
          <span class="sep-label">En observation (signal faible / en attente)</span>
          <div class="sep-line"></div>
          <span style="font-size:var(--text-xs);color:var(--text-muted);">${analysis.neutral.length} actif(s)</span>
        </div>
        <div id="neutral-list">
          ${analysis.neutral.map((a, i) => renderOppCard(a, i + 1, false, true)).join('')}
        </div>
      ` : ''}

      
      <div class="section-sep">
        <span class="sep-label">Régime défavorable / signal absent</span>
        <div class="sep-line"></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-8);">
        ${analysis.inactive.map(a => `
          <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;
            padding:var(--space-2) var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">
            ${a.symbol}
          </div>
        `).join('')}
      </div>

      
      <div class="card" style="margin-top:var(--space-4);">
        <div class="card-header">
          <span class="card-title">Légende du score</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);">
          <div style="text-align:center;padding:var(--space-3);">
            <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--signal-strong);">≥ 70</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1);">Signal fort</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);">
            <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--signal-medium);">50-69</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1);">Signal modéré</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);">
            <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--signal-weak);">< 50</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1);">Filtré</div>
          </div>
        </div>
        <div class="divider"></div>
        <p style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.7;">
          Le score ajusté intègre 8 critères (ADX, pente EMA, momentum, volume, RSI, espace Donchian, volatilité, cassure)
          réduit par une pénalité de risque (0% faible, 10% modéré, 25% élevé).
          Le badge ★ Solide nécessite 6 conditions simultanées : régime validé, score ≥70, risque faible/modéré, R/R ≥2.
        </p>
      </div>
    </div>
  `;
}

function renderOppCard(a, rank, isSolid = false, isNeutral = false) {
  const change = Fmt.change(a.change24h);
  const candles = MOCK_DATA.getOHLC(a.symbol);

  return `
    <div class="opp-row ${isSolid ? 'card' : ''}" style="${isSolid ? 'border-color:rgba(0,229,160,0.25);' : ''}"
      data-screen="asset-detail" data-symbol="${a.symbol}" data-asset-class="${a.assetClass || ''}">
      <div class="opp-rank" style="color:${isNeutral ? 'var(--text-muted)' : 'var(--text-secondary)'};">#${rank}</div>

      ${UI.scoreRing(a.adjScore, 44)}

      <div class="asset-icon">${Fmt.assetIcon(a.symbol)}</div>

      <div class="opp-asset">
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
          <span class="asset-symbol">${a.symbol}</span>
          ${isSolid ? '<span class="solid-badge">★ Solide</span>' : ''}
          ${a.direction !== 'neutral'
            ? `<span class="direction-tag ${a.direction}">${Fmt.directionIcon(a.direction)} ${Fmt.directionLabel(a.direction)}</span>`
            : ''
          }
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${a.name}</div>
        ${!isNeutral ? `
          <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
            ${a.recommendation || ''}
          </div>
        ` : ''}
      </div>

      <div style="flex-shrink:0;display:flex;align-items:center;">
        ${UI.sparkline(candles.slice(-15), 60, 28)}
      </div>

      <div class="opp-price" style="font-family:var(--font-mono);">${Fmt.price(a.price)}</div>

      <div class="opp-change ${change.cls}">${change.text}</div>

      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:var(--space-1);align-items:flex-end;">
        <span class="risk-badge ${a.riskLevel}">${Fmt.riskLabel(a.riskLevel)}</span>
        ${a.rrRatio ? `<span style="font-size:var(--text-xs);color:var(--text-muted);">R/R ${a.rrRatio}:1</span>` : ''}
      </div>
    </div>
  `;
}

Router.register('opportunities', renderOpportunities);

// ═══ assetDetail.js ═══
/* ============================================
   MANITRADEPRO — Fiche Détail Actif
   ============================================ */

function renderAssetDetail(params) {
  if (!params || !params.symbol) {
    return `<div class="screen"><p>Actif non trouvé.</p></div>`;
  }

  const { symbol } = params;
  const asset = MOCK_DATA.watchlist.find(a => a.symbol === symbol);
  const priceData = MOCK_DATA.prices[symbol];

  if (!asset || !priceData) {
    return `<div class="screen"><p>Actif "${symbol}" inconnu.</p></div>`;
  }

  const analysis = AnalysisEngine.analyzeAsset({
    symbol,
    name: asset.name,
    assetClass: asset.class,
  });

  const ind = analysis.indicators || {};
  const change = Fmt.change(analysis.change24h);
  const simCap = Storage.getSimCapital();
  const settings = Storage.getSettings();

  // Calcul stop et tp
  const stopLoss   = analysis.stopLoss   || (priceData.price * 0.97);
  const takeProfit = analysis.takeProfit || (priceData.price * 1.06);

  return `
    <div class="screen">

      
      <div class="back-btn" data-screen="opportunities">
        ← Retour aux opportunités
      </div>

      
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
          ${ind.adx    ? `<div class="indicator-chip ${ind.adx > 20 ? 'ok' : 'warn'}"><span style="font-size:8px;">●</span> ADX : ${ind.adx.toFixed(1)}</div>` : ''}
          ${ind.rsi    ? `<div class="indicator-chip ${ind.rsi > 70 || ind.rsi < 30 ? 'warn' : 'ok'}"><span style="font-size:8px;">●</span> RSI : ${ind.rsi.toFixed(1)}</div>` : ''}
        </div>
      </div>

      
      <div class="score-panel">
        <div class="score-panel-top">
          ${UI.scoreRing(analysis.adjScore, 72)}
          <div class="score-summary">
            <div class="score-summary-title">
              Score ajusté : <span style="color:${analysis.adjScore >= 70 ? 'var(--signal-strong)' : analysis.adjScore >= 50 ? 'var(--signal-medium)' : 'var(--signal-weak)'};">
                ${analysis.adjScore}/100
              </span>
            </div>
            <div class="score-summary-desc">${analysis.recommendation}</div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;">
              <span class="risk-badge ${analysis.riskLevel}">Risque ${Fmt.riskLabel(analysis.riskLevel)}</span>
              ${analysis.rrRatio ? `<span class="score-badge ${analysis.adjScore >= 70 ? 'strong' : 'medium'}">R/R ${analysis.rrRatio}:1</span>` : ''}
              ${analysis.isSolid ? '<span class="solid-badge">★ Toutes conditions réunies</span>' : ''}
            </div>
          </div>
        </div>

        
        <div class="confidence-bar">
          <div class="confidence-label">
            <span>Confiance du signal</span>
            <span>${analysis.adjScore}%</span>
          </div>
          <div class="confidence-track">
            <div class="confidence-fill ${analysis.adjScore >= 70 ? 'strong' : analysis.adjScore >= 50 ? 'medium' : 'weak'}"
              style="width:${analysis.adjScore}%;"></div>
          </div>
        </div>

        
        <div style="margin-top:var(--space-5);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-3);">
            Filtre de régime
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${(analysis.regime?.reasons || []).map(r => `
              <div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);">
                <span style="color:${r.pass ? 'var(--profit)' : 'var(--loss)'};">${r.pass ? '✓' : '✗'}</span>
                <span style="color:${r.pass ? 'var(--text-secondary)' : 'var(--text-muted)'};">${r.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      
      ${analysis.confidence?.criteria?.length > 0 ? `
        <div class="card" style="margin-bottom:var(--space-5);">
          <div class="card-header">
            <span class="card-title">Détail des 8 critères</span>
            <span style="font-size:var(--text-xs);color:var(--text-muted);">Score brut : ${analysis.confidence.rawScore}/${analysis.confidence.maxScore}</span>
          </div>
          <div class="criteria-list">
            ${analysis.confidence.criteria.map(c => `
              <div class="criteria-item">
                <div>
                  <div class="criteria-name">${c.label}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);">${c.description}</div>
                </div>
                <div style="display:flex;align-items:center;gap:var(--space-2);">
                  <span class="criteria-pts">${c.earned}/${c.max} pts</span>
                  <span class="criteria-result ${c.pass ? 'pass' : c.partial ? 'partial' : 'fail'}">
                    ${c.pass ? '✓' : c.partial ? '~' : '✗'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><span class="card-title">Niveaux clés suggérés</span></div>
        <div class="grid-3">
          <div>
            <div class="stat-label">Prix d'entrée</div>
            <div class="stat-value">${Fmt.price(priceData.price)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">Prochain open liquide</div>
          </div>
          <div>
            <div class="stat-label">Stop-loss (2×ATR)</div>
            <div class="stat-value" style="color:var(--loss);">${Fmt.price(stopLoss)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
              -${ind.atr ? ((Math.abs(priceData.price - stopLoss) / priceData.price) * 100).toFixed(1) : '?'}%
            </div>
          </div>
          <div>
            <div class="stat-label">Take profit (R/R 2.5)</div>
            <div class="stat-value" style="color:var(--profit);">${Fmt.price(takeProfit)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
              +${((Math.abs(takeProfit - priceData.price) / priceData.price) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);">
          Trailing stop : ${ind.atr ? Fmt.price(RiskCalculator.trailingStop(priceData.price, ind.atr, analysis.direction, 3)) : '—'} (3×ATR)
          · ATR(14) : ${ind.atr ? Fmt.price(ind.atr) : '—'}
          · Donchian 55 haut : ${ind.don55 ? Fmt.price(ind.don55.upper) : '—'}
          · Donchian 20 bas : ${ind.don20 ? Fmt.price(ind.don20.lower) : '—'}
        </div>
      </div>

      
      <div class="section-sep">
        <span class="sep-label">Prendre une position</span>
        <div class="sep-line"></div>
      </div>

      <div class="order-zones">
        
        <div class="mode-zone sim-zone">
          <div class="mode-zone-title">⚡ Mode Simulation</div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.6;">
            Capital fictif disponible : <strong>${Fmt.currency(simCap.current)}</strong><br/>
            Risque par trade : ${(settings.riskPerTrade * 100).toFixed(2)}% = ${Fmt.currency(simCap.current * settings.riskPerTrade)}
          </div>
          ${analysis.direction !== 'neutral' ? `
            <button class="btn btn-sim btn-block" id="btn-open-sim"
              data-open-position="${symbol}" data-mode="sim">
              ⚡ Ouvrir position fictive ${Fmt.directionLabel(analysis.direction)}
            </button>
          ` : `
            <button class="btn btn-ghost btn-block" disabled>
              Signal neutre — attendre
            </button>
          `}
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:var(--space-2);">
            Aucun argent réel · Entraînement uniquement
          </div>
        </div>

        
        <div class="mode-zone real-zone">
          <div class="mode-zone-title">⚠️ Mode Réel</div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.6;">
            Brokers connectés : <strong>Aucun</strong><br/>
            Configurez un broker dans les Paramètres.
          </div>
          <button class="btn btn-ghost btn-block" disabled>
            ⚠️ Aucun broker configuré
          </button>
          <div style="font-size:var(--text-xs);color:var(--real-color);text-align:center;margin-top:var(--space-2);">
            Connectez Binance ou Trade Republic pour trader en réel
          </div>
        </div>
      </div>

      
      <div class="warning-box" style="margin-top:var(--space-5);">
        ⚠️ Ce score et ces niveaux sont des suggestions algorithmiques basées sur des indicateurs techniques.
        Ils ne constituent pas des conseils financiers. Le trading comporte un risque de perte en capital.
        Les performances passées ne préjugent pas des performances futures.
      </div>
    </div>
  `;
}

function renderPriceChart(symbol) {
  const candles = MOCK_DATA.getOHLC(symbol);
  if (!candles || candles.length < 5) return '<div style="height:120px;background:var(--bg-elevated);border-radius:8px;"></div>';

  const closes = candles.map(c => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 600, h = 120;

  const pts = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  const lastClose = closes[closes.length - 1];
  const firstClose = closes[0];
  const color = lastClose >= firstClose ? 'var(--profit)' : 'var(--loss)';
  const fillPts = `0,${h} ${pts} ${w},${h}`;

  return `
    <div style="position:relative;overflow:hidden;border-radius:8px;background:var(--bg-elevated);">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:120px;display:block;">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${fillPts}" fill="url(#chartGrad)"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
      </svg>
      <div style="position:absolute;top:var(--space-2);left:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);">
        ${Fmt.price(min)}
      </div>
      <div style="position:absolute;top:var(--space-2);right:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);">
        ${Fmt.price(max)}
      </div>
    </div>
  `;
}

// Gestion spéciale du bouton open sim dans asset detail
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#btn-open-sim');
  if (!btn) return;
  const symbol = btn.dataset.openPosition;
  if (!symbol) return;

  const asset = MOCK_DATA.watchlist.find(a => a.symbol === symbol);
  const analysis = AnalysisEngine.analyzeAsset({
    symbol,
    name: asset?.name || symbol,
    assetClass: asset?.class,
  });

  const order = await UI.openOrderModal(symbol, 'sim', analysis);
  if (!order) return;

  const result = await BrokerAdapter.placeOrder(order, 'sim');
  if (result.success) {
    UI.toast(`Position ${symbol} ouverte en simulation — ${Fmt.currency(result.position.invested)} investi`, 'success');
    Router.navigate('positions');
  } else {
    UI.toast('Erreur : ' + result.error, 'error');
  }
});

Router.register('asset-detail', renderAssetDetail);

// ═══ positions.js ═══
// ============================================================
// POSITIONS SCREEN
// Displays open simulation + real positions with live P&L
// Close buttons trigger BrokerAdapter.closePosition()
// ============================================================

// [import removed]
// [import removed]
// [import removed]
// [import removed]

// -----------------------------------------------------------
// MAIN RENDER
// -----------------------------------------------------------

function renderPositions() {
  const screen = document.getElementById('screen-positions');
  if (!screen) return;

  const settings   = Storage.getSettings();
  const simPos     = Storage.getSimPositions();
  const simHistory = Storage.getSimHistory();
  const realPos    = Storage.getRealPositions();

  // Compute live P&L for each sim position
  const simWithPnl  = simPos.map(p => _enrichPosition(p));
  const realWithPnl = realPos.map(p => _enrichPosition(p));

  // Aggregate
  const simTotalPnl  = simWithPnl.reduce((acc, p) => acc + p.pnl, 0);
  const realTotalPnl = realWithPnl.reduce((acc, p) => acc + p.pnl, 0);
  const simCapital   = Storage.getSimCapital();

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Positions</h1>
      <p class="screen-subtitle">Simulation et réel séparés — mises à jour toutes les 30 s</p>
    </div>

         SIMULATION BLOCK
    <section class="positions-section sim-section">
      <div class="section-header-bar sim-bar">
        <div class="section-header-left">
          <span class="mode-dot sim-dot"></span>
          <span class="section-title">Simulation</span>
          <span class="positions-count">${simWithPnl.length} position${simWithPnl.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="section-header-right">
          <span class="capital-label">Capital fictif</span>
          <span class="capital-value">${fmt.currency(simCapital)}</span>
        </div>
      </div>

      ${simWithPnl.length > 0 ? `
        <div class="positions-summary sim-summary">
          <div class="summary-item">
            <span class="summary-label">P&L total ouvert</span>
            <span class="summary-value ${fmt.pnlClass(simTotalPnl)}">${fmt.signedCurrency(simTotalPnl)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Positions actives</span>
            <span class="summary-value">${simWithPnl.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">En profit</span>
            <span class="summary-value positive">${simWithPnl.filter(p => p.pnl > 0).length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">En perte</span>
            <span class="summary-value negative">${simWithPnl.filter(p => p.pnl < 0).length}</span>
          </div>
        </div>

        <div class="positions-list" id="sim-positions-list">
          ${simWithPnl.map(p => _renderPositionCard(p, 'sim')).join('')}
        </div>
      ` : `
        <div class="empty-positions">
          <div class="empty-icon">📊</div>
          <p class="empty-title">Aucune position fictive ouverte</p>
          <p class="empty-sub">Ouvrez une position depuis la fiche d'un actif en mode Simulation</p>
          <button class="btn-primary btn-sm" data-screen="opportunities">
            Voir les opportunités
          </button>
        </div>
      `}

      
      ${simHistory.length > 0 ? `
        <div class="history-section">
          <button class="history-toggle" id="sim-history-toggle">
            <span>Historique simulation (${simHistory.length})</span>
            <span class="toggle-arrow">▼</span>
          </button>
          <div class="history-list hidden" id="sim-history-list">
            ${simHistory.slice().reverse().map(p => _renderHistoryRow(p)).join('')}
          </div>
        </div>
      ` : ''}
    </section>

         REAL BLOCK
    <section class="positions-section real-section">
      <div class="section-header-bar real-bar">
        <div class="section-header-left">
          <span class="mode-dot real-dot"></span>
          <span class="section-title">Réel</span>
          <span class="positions-count">${realWithPnl.length} position${realWithPnl.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="section-header-right">
          ${settings.broker !== 'none' ? `
            <span class="broker-badge">${settings.broker}</span>
          ` : `
            <span class="no-broker-badge">Aucun broker</span>
          `}
        </div>
      </div>

      ${settings.broker === 'none' ? `
        <div class="empty-positions broker-empty">
          <div class="empty-icon">🔗</div>
          <p class="empty-title">Aucun broker connecté</p>
          <p class="empty-sub">Connectez votre compte Binance ou Trade Republic dans les Paramètres pour passer des ordres réels.</p>
          <button class="btn-outline btn-sm" data-screen="settings">
            Connecter un broker
          </button>
        </div>
      ` : realWithPnl.length > 0 ? `
        <div class="positions-summary real-summary">
          <div class="summary-item">
            <span class="summary-label">P&L total ouvert</span>
            <span class="summary-value ${fmt.pnlClass(realTotalPnl)}">${fmt.signedCurrency(realTotalPnl)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Positions actives</span>
            <span class="summary-value">${realWithPnl.length}</span>
          </div>
        </div>

        <div class="positions-list" id="real-positions-list">
          ${realWithPnl.map(p => _renderPositionCard(p, 'real')).join('')}
        </div>
      ` : `
        <div class="empty-positions">
          <div class="empty-icon">📈</div>
          <p class="empty-title">Aucune position réelle ouverte</p>
          <p class="empty-sub">Les positions passées via ${settings.broker} apparaîtront ici.</p>
        </div>
      `}
    </section>

    
    <div class="disclaimer-card">
      <p>⚠️ Les positions réelles engagent votre capital. Toute clôture est irréversible.
      ManiTradePro est un outil d'aide à la décision, pas un conseiller financier.
      Tradez de façon responsable et ne risquez que ce que vous pouvez vous permettre de perdre.</p>
    </div>
  `;

  _attachPositionEvents();
}

// -----------------------------------------------------------
// POSITION CARD
// -----------------------------------------------------------

function _renderPositionCard(pos, mode) {
  const isLong    = pos.direction === 'LONG';
  const dirClass  = isLong ? 'long' : 'short';
  const pnlClass  = fmt.pnlClass(pos.pnl);
  const stopDist  = pos.stopLoss ? Math.abs(pos.currentPrice - pos.stopLoss) : null;
  const stopDistPct = stopDist ? (stopDist / pos.currentPrice * 100) : null;
  const duration  = fmt.duration(pos.openedAt);

  // Stop proximity warning
  const stopWarning = stopDistPct && stopDistPct < 3;

  return `
    <div class="position-card ${mode}-card ${stopWarning ? 'stop-warning' : ''}" data-id="${pos.id}">
      <div class="position-header">
        <div class="position-left">
          <span class="asset-icon-sm">${fmt.assetIcon(pos.symbol)}</span>
          <div class="position-meta">
            <span class="position-symbol">${pos.symbol}</span>
            <div class="position-badges">
              <span class="direction-badge ${dirClass}">${fmt.directionLabel(pos.direction)}</span>
              ${mode === 'sim' ? '<span class="mode-badge-sm sim">SIM</span>' : '<span class="mode-badge-sm real">RÉEL</span>'}
            </div>
          </div>
        </div>
        <div class="position-right">
          <span class="pnl-main ${pnlClass}">${fmt.signedCurrency(pos.pnl)}</span>
          <span class="pnl-pct ${pnlClass}">${fmt.signedPct(pos.pnlPct)}</span>
        </div>
      </div>

      <div class="position-grid">
        <div class="grid-item">
          <span class="grid-label">Entrée</span>
          <span class="grid-value">${fmt.price(pos.entryPrice, pos.symbol)}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Actuel</span>
          <span class="grid-value current-price" data-id="${pos.id}">${fmt.price(pos.currentPrice, pos.symbol)}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Quantité</span>
          <span class="grid-value">${fmt.qty(pos.quantity, pos.symbol)}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Investi</span>
          <span class="grid-value">${fmt.currency(pos.invested)}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Stop-loss</span>
          <span class="grid-value ${stopWarning ? 'stop-close' : ''}">${pos.stopLoss ? fmt.price(pos.stopLoss, pos.symbol) : '—'}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Take profit</span>
          <span class="grid-value">${pos.takeProfit ? fmt.price(pos.takeProfit, pos.symbol) : '—'}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Durée</span>
          <span class="grid-value">${duration}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Statut</span>
          <span class="grid-value status-open">● Ouvert</span>
        </div>
      </div>

      ${stopWarning ? `
        <div class="stop-warning-bar">
          ⚠️ Stop-loss à moins de 3% du prix actuel
        </div>
      ` : ''}

      <div class="position-actions">
        <button class="btn-ghost btn-sm" data-open-detail="${pos.symbol}">
          Voir l'analyse
        </button>
        <button class="btn-close-pos btn-sm ${mode === 'real' ? 'btn-danger' : 'btn-warning'}"
                data-mode="${mode}" data-id="${pos.id}" data-symbol="${pos.symbol}">
          ${mode === 'real' ? '🔴 Clôturer (RÉEL)' : '⬛ Clôturer (SIM)'}
        </button>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------
// HISTORY ROW
// -----------------------------------------------------------

function _renderHistoryRow(pos) {
  const pnlClass = fmt.pnlClass(pos.pnl);
  return `
    <div class="history-row">
      <span class="history-symbol">${fmt.assetIcon(pos.symbol)} ${pos.symbol}</span>
      <span class="history-dir ${pos.direction === 'LONG' ? 'long' : 'short'}">${pos.direction}</span>
      <span class="history-entry">${fmt.price(pos.entryPrice, pos.symbol)}</span>
      <span class="history-exit">${fmt.price(pos.exitPrice, pos.symbol)}</span>
      <span class="history-pnl ${pnlClass}">${fmt.signedCurrency(pos.pnl)}</span>
      <span class="history-date">${fmt.date(pos.closedAt)}</span>
    </div>
  `;
}

// -----------------------------------------------------------
// ENRICH POSITION WITH CURRENT PRICE + P&L
// -----------------------------------------------------------

function _enrichPosition(pos) {
  // Use last known price from DOM or Storage cache, fall back to entry
  const currentPrice = _getCurrentPrice(pos.symbol) || pos.entryPrice;
  const priceDiff    = pos.direction === 'LONG'
    ? currentPrice - pos.entryPrice
    : pos.entryPrice - currentPrice;
  const pnl    = priceDiff * pos.quantity;
  const pnlPct = (priceDiff / pos.entryPrice) * 100;

  return { ...pos, currentPrice, pnl, pnlPct, invested: pos.entryPrice * pos.quantity };
}

function _getCurrentPrice(symbol) {
  // Sync module stores latest prices in window.__prices cache
  if (window.__prices && window.__prices[symbol]) {
    return window.__prices[symbol];
  }
  return null;
}

// -----------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------

function _attachPositionEvents() {
  // Navigate buttons
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { Router } = window.__MTP || {};
      if (Router) Router.navigate(btn.dataset.screen);
    });
  });

  // Asset detail link
  document.querySelectorAll('[data-open-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { Router } = window.__MTP || {};
      if (Router) Router.navigate('asset-detail', { symbol: btn.dataset.openDetail });
    });
  });

  // Close position buttons
  document.querySelectorAll('.btn-close-pos').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { mode, id, symbol } = btn.dataset;
      const isReal = mode === 'real';

      const confirmed = await showConfirmModal({
        title   : isReal ? '⚠️ Clôture RÉELLE' : 'Clôturer la position',
        message : isReal
          ? `Vous allez clôturer votre position réelle sur ${symbol}. Cette action est IRRÉVERSIBLE et engagera un ordre de vente sur votre broker.`
          : `Clôturer la position fictive sur ${symbol} ?`,
        confirmText : isReal ? 'Confirmer l\'ordre RÉEL' : 'Clôturer',
        dangerMode  : isReal
      });

      if (!confirmed) return;

      try {
        const adapter  = BrokerAdapterFactory.get(mode === 'real' ? Storage.getSettings().broker : 'mock');
        const result   = await adapter.closePosition(id);

        if (result.success) {
          showToast(`Position ${symbol} clôturée — P&L : ${fmt.signedCurrency(result.pnl)}`, result.pnl >= 0 ? 'success' : 'warning');
          renderPositions(); // re-render
        } else {
          showToast(`Erreur lors de la clôture : ${result.error}`, 'error');
        }
      } catch (err) {
        showToast(`Erreur : ${err.message}`, 'error');
      }
    });
  });

  // History toggle
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

// -----------------------------------------------------------
// LIVE UPDATE (called by Sync every 30s)
// -----------------------------------------------------------

function updatePositionPrices() {
  const simPos  = Storage.getSimPositions();
  const realPos = Storage.getRealPositions();

  [...simPos, ...realPos].forEach(pos => {
    const enriched = _enrichPosition(pos);

    // Update price cell
    const priceEl = document.querySelector(`.current-price[data-id="${pos.id}"]`);
    if (priceEl) priceEl.textContent = fmt.price(enriched.currentPrice, pos.symbol);

    // Update P&L in card header
    const card = document.querySelector(`.position-card[data-id="${pos.id}"]`);
    if (card) {
      const pnlEl  = card.querySelector('.pnl-main');
      const pctEl  = card.querySelector('.pnl-pct');
      if (pnlEl) {
        pnlEl.textContent  = fmt.signedCurrency(enriched.pnl);
        pnlEl.className    = `pnl-main ${fmt.pnlClass(enriched.pnl)}`;
      }
      if (pctEl) {
        pctEl.textContent  = fmt.signedPct(enriched.pnlPct);
        pctEl.className    = `pnl-pct ${fmt.pnlClass(enriched.pnl)}`;
      }
    }
  });
}

// ═══ simulation.js ═══
// ============================================================
// SIMULATION SCREEN
// Portfolio overview, equity curve, trade history, reset
// ============================================================

// [import removed]
// [import removed]
// [import removed]

// -----------------------------------------------------------
// MAIN RENDER
// -----------------------------------------------------------

function renderSimulation() {
  const screen = document.getElementById('screen-simulation');
  if (!screen) return;

  const capital  = Storage.getSimCapital();
  const history  = Storage.getSimHistory();
  const openPos  = Storage.getSimPositions();
  const settings = Storage.getSettings();

  const stats = _computeStats(capital, history, openPos, settings);

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Simulation</h1>
      <p class="screen-subtitle">Entraînez-vous sans risquer de capital réel</p>
    </div>

    
    <div class="sim-hero-card">
      <div class="sim-hero-label">Capital fictif total</div>
      <div class="sim-hero-capital">${fmt.currency(stats.totalCapital)}</div>
      <div class="sim-hero-sub">
        <span class="${fmt.pnlClass(stats.totalPnl)}">${fmt.signedCurrency(stats.totalPnl)}</span>
        <span class="hero-separator">/</span>
        <span class="${fmt.pnlClass(stats.totalPnlPct)}">${fmt.signedPct(stats.totalPnlPct)}</span>
        <span class="hero-from">depuis le début</span>
      </div>
      <div class="sim-hero-meta">
        <span>Capital initial : ${fmt.currency(stats.initialCapital)}</span>
        <span>${openPos.length} position${openPos.length !== 1 ? 's' : ''} ouverte${openPos.length !== 1 ? 's' : ''}</span>
      </div>
    </div>

    
    <div class="sim-stats-grid">
      <div class="sim-stat-card">
        <span class="stat-label">Trades clôturés</span>
        <span class="stat-value">${stats.totalTrades}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Win rate</span>
        <span class="stat-value ${stats.winRate >= 50 ? 'positive' : 'negative'}">${fmt.pct(stats.winRate)}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Gains moyens</span>
        <span class="stat-value positive">${fmt.currency(stats.avgWin)}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Pertes moyennes</span>
        <span class="stat-value negative">${fmt.currency(Math.abs(stats.avgLoss))}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Profit factor</span>
        <span class="stat-value ${stats.profitFactor >= 1.5 ? 'positive' : stats.profitFactor < 1 ? 'negative' : ''}">${stats.profitFactor.toFixed(2)}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Max drawdown</span>
        <span class="stat-value negative">${fmt.signedPct(stats.maxDrawdownPct)}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Ratio R/R moyen</span>
        <span class="stat-value">${stats.avgRR.toFixed(2)}</span>
      </div>
      <div class="sim-stat-card">
        <span class="stat-label">Durée moy. trade</span>
        <span class="stat-value">${fmt.duration(stats.avgDuration)}</span>
      </div>
    </div>

    
    <div class="chart-section-card">
      <div class="chart-section-header">
        <span class="chart-section-title">Courbe de capital</span>
        <span class="chart-section-sub">${stats.equityCurve.length} points</span>
      </div>
      <div class="equity-chart-wrap">
        ${_renderEquityCurve(stats.equityCurve, stats.initialCapital)}
      </div>
    </div>

    
    ${openPos.length > 0 ? `
    <div class="sim-open-section">
      <div class="section-row-header">
        <span class="section-title-sm">Positions ouvertes</span>
        <button class="btn-link" data-screen="positions">Tout voir →</button>
      </div>
      <div class="open-pos-mini-list">
        ${openPos.map(p => _renderMiniPosition(p)).join('')}
      </div>
    </div>
    ` : ''}

    
    <div class="sim-history-section">
      <div class="section-row-header">
        <span class="section-title-sm">Historique des trades</span>
        <span class="history-count">${history.length} trades</span>
      </div>

      ${history.length === 0 ? `
        <div class="empty-history">
          <p>Aucun trade clôturé pour l'instant.</p>
          <p>Ouvrez des positions depuis les opportunités et clôturez-les pour voir votre historique.</p>
        </div>
      ` : `
        <div class="history-table-wrap">
          <div class="history-table-header">
            <span>Actif</span>
            <span>Dir.</span>
            <span>Entrée</span>
            <span>Sortie</span>
            <span>P&L</span>
            <span>Date</span>
          </div>
          <div class="history-table-body">
            ${history.slice().reverse().map(t => _renderHistoryRow(t)).join('')}
          </div>
        </div>
      `}
    </div>

    
    <div class="sim-config-section">
      <div class="section-title-sm">Configuration</div>
      <div class="sim-config-card">
        <div class="config-row">
          <span class="config-label">Capital initial</span>
          <div class="config-control">
            <input type="number" id="sim-capital-input" class="input-sm"
              value="${stats.initialCapital}" min="1000" max="1000000" step="1000" />
            <button class="btn-ghost btn-sm" id="btn-set-capital">Appliquer</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">Profil de risque</span>
          <span class="config-value">${fmt.profileLabel(settings.riskProfile)}</span>
        </div>
        <div class="config-row">
          <span class="config-label">Risque par trade</span>
          <span class="config-value">${settings.riskPerTrade}%</span>
        </div>
      </div>
    </div>

    
    <div class="sim-reset-section">
      <button class="btn-danger-outline btn-full" id="btn-reset-sim">
        🔄 Réinitialiser la simulation complète
      </button>
      <p class="reset-warning">Cette action supprimera toutes les positions ouvertes et l'historique fictifs. Irréversible.</p>
    </div>

    
    <div class="disclaimer-card">
      <p>ℹ️ Les résultats de simulation ne préjugent pas des performances réelles. Les marchés financiers sont imprévisibles. Tradez toujours avec prudence.</p>
    </div>
  `;

  _attachSimEvents(stats.initialCapital);
}

// -----------------------------------------------------------
// STATS COMPUTATION
// -----------------------------------------------------------

function _computeStats(capital, history, openPos, settings) {
  const initialCapital = settings.simInitialCapital || 10000;

  // Open P&L
  let openPnl = 0;
  openPos.forEach(pos => {
    const current = (window.__prices && window.__prices[pos.symbol]) || pos.entryPrice;
    const diff    = pos.direction === 'LONG' ? current - pos.entryPrice : pos.entryPrice - current;
    openPnl += diff * pos.quantity;
  });

  const totalCapital = capital + openPnl;
  const totalPnl     = totalCapital - initialCapital;
  const totalPnlPct  = ((totalCapital / initialCapital) - 1) * 100;

  // Closed trades stats
  const wins  = history.filter(t => t.pnl > 0);
  const losses = history.filter(t => t.pnl <= 0);

  const totalTrades = history.length;
  const winRate     = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const avgWin      = wins.length  > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss     = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  const avgRR       = history.length > 0
    ? history.reduce((s, t) => s + (t.rr || 0), 0) / history.length : 0;

  const avgDuration = history.length > 0
    ? Date.now() - (Date.now() - history.reduce((s, t) => s + (t.duration || 3600000), 0) / history.length)
    : 0;

  // Equity curve
  const equityCurve = _buildEquityCurve(initialCapital, history);

  // Max drawdown
  const maxDrawdownPct = _calcMaxDrawdown(equityCurve);

  return {
    initialCapital, totalCapital, totalPnl, totalPnlPct,
    totalTrades, winRate, avgWin, avgLoss, profitFactor, avgRR, avgDuration,
    equityCurve, maxDrawdownPct, openPnl
  };
}

function _buildEquityCurve(initial, history) {
  const sorted = [...history].sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));
  const curve  = [{ t: Date.now() - sorted.length * 86400000, v: initial }];
  let   cap    = initial;
  sorted.forEach((t, i) => {
    cap += t.pnl || 0;
    curve.push({ t: (t.closedAt || Date.now() - (sorted.length - i - 1) * 86400000), v: cap });
  });
  return curve;
}

function _calcMaxDrawdown(curve) {
  if (curve.length < 2) return 0;
  let peak = curve[0].v;
  let maxDD = 0;
  curve.forEach(pt => {
    if (pt.v > peak) peak = pt.v;
    const dd = (peak - pt.v) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  });
  return -maxDD;
}

// -----------------------------------------------------------
// EQUITY CURVE SVG
// -----------------------------------------------------------

function _renderEquityCurve(curve, initial) {
  if (curve.length < 2) {
    return `<div class="chart-placeholder">Pas encore assez de données pour tracer la courbe</div>`;
  }

  const W = 340, H = 120;
  const vals   = curve.map(p => p.v);
  const minV   = Math.min(...vals);
  const maxV   = Math.max(...vals);
  const rangeV = maxV - minV || 1;

  const pts = curve.map((p, i) => {
    const x = (i / (curve.length - 1)) * W;
    const y = H - ((p.v - minV) / rangeV) * (H - 16) - 8;
    return `${x},${y}`;
  });

  const lineColor = curve[curve.length - 1].v >= initial ? '#22c55e' : '#ef4444';
  const polyline  = pts.join(' ');
  const fillPts   = `0,${H} ${polyline} ${W},${H}`;

  // Zero line (initial capital)
  const zeroY = H - ((initial - minV) / rangeV) * (H - 16) - 8;

  return `
    <svg viewBox="0 0 ${W} ${H}" class="equity-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="${zeroY}" x2="${W}" y2="${zeroY}"
            stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="4,3" opacity="0.4"/>
      <polygon points="${fillPts}" fill="url(#eq-grad)"/>
      <polyline points="${polyline}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${pts[pts.length-1].split(',')[0]}" cy="${pts[pts.length-1].split(',')[1]}"
              r="4" fill="${lineColor}"/>
    </svg>
  `;
}

// -----------------------------------------------------------
// MINI POSITION CARD
// -----------------------------------------------------------

function _renderMiniPosition(pos) {
  const current  = (window.__prices && window.__prices[pos.symbol]) || pos.entryPrice;
  const diff     = pos.direction === 'LONG' ? current - pos.entryPrice : pos.entryPrice - current;
  const pnl      = diff * pos.quantity;
  const pnlClass = fmt.pnlClass(pnl);
  return `
    <div class="mini-pos-row" data-open-detail="${pos.symbol}" style="cursor:pointer">
      <span class="mini-pos-icon">${fmt.assetIcon(pos.symbol)}</span>
      <span class="mini-pos-symbol">${pos.symbol}</span>
      <span class="mini-pos-dir ${pos.direction === 'LONG' ? 'long' : 'short'}">${pos.direction}</span>
      <span class="mini-pos-pnl ${pnlClass}">${fmt.signedCurrency(pnl)}</span>
    </div>
  `;
}

// -----------------------------------------------------------
// HISTORY ROW
// -----------------------------------------------------------

function _renderHistoryRow(t) {
  return `
    <div class="history-table-row ${t.pnl > 0 ? 'row-win' : 'row-loss'}">
      <span>${fmt.assetIcon(t.symbol)} ${t.symbol}</span>
      <span class="${t.direction === 'LONG' ? 'long' : 'short'}">${t.direction}</span>
      <span>${fmt.price(t.entryPrice, t.symbol)}</span>
      <span>${fmt.price(t.exitPrice, t.symbol)}</span>
      <span class="${fmt.pnlClass(t.pnl)}">${fmt.signedCurrency(t.pnl)}</span>
      <span class="history-date-sm">${fmt.dateShort(t.closedAt)}</span>
    </div>
  `;
}

// -----------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------

function _attachSimEvents(initialCapital) {
  // Navigate
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { Router } = window.__MTP || {};
      if (Router) Router.navigate(btn.dataset.screen);
    });
  });

  // Mini pos → detail
  document.querySelectorAll('[data-open-detail]').forEach(el => {
    el.addEventListener('click', () => {
      const { Router } = window.__MTP || {};
      if (Router) Router.navigate('asset-detail', { symbol: el.dataset.openDetail });
    });
  });

  // Set capital
  const capInput  = document.getElementById('sim-capital-input');
  const capBtn    = document.getElementById('btn-set-capital');
  if (capInput && capBtn) {
    capBtn.addEventListener('click', () => {
      const val = parseFloat(capInput.value);
      if (!val || val < 1000) {
        showToast('Capital minimum : 1 000 €', 'error');
        return;
      }
      const settings = Storage.getSettings();
      settings.simInitialCapital = val;
      Storage.setSettings(settings);
      Storage.setSimCapital(val);
      showToast(`Capital fictif réinitialisé à ${fmt.currency(val)}`, 'success');
      renderSimulation();
    });
  }

  // Reset
  const resetBtn = document.getElementById('btn-reset-sim');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title      : 'Réinitialiser la simulation ?',
        message    : 'Toutes les positions ouvertes et l\'historique fictifs seront effacés. Cette action est irréversible.',
        confirmText: 'Réinitialiser',
        dangerMode : true
      });
      if (!confirmed) return;

      const settings = Storage.getSettings();
      const cap      = settings.simInitialCapital || 10000;
      Storage.setSimCapital(cap);
      Storage.saveSimPositions([]);
      Storage.saveSimHistory([]);
      showToast('Simulation réinitialisée', 'success');
      renderSimulation();
    });
  }
}

// ═══ settings.js ═══
// ============================================================
// SETTINGS SCREEN
// Risk profile, API keys (Twelve Data), broker connections
// ============================================================

// [import removed]
// [import removed]
// [import removed]

// -----------------------------------------------------------
// MAIN RENDER
// -----------------------------------------------------------

function renderSettings() {
  const screen   = document.getElementById('screen-settings');
  if (!screen) return;

  const settings = Storage.getSettings();
  const _apiKeysRaw = Storage.getApiKeys();
  const apiKeys = Array.isArray(_apiKeysRaw) ? _apiKeysRaw : (_apiKeysRaw.twelveData || []).map(k => k.key);

  screen.innerHTML = `
    <div class="screen-header">
      <h1 class="screen-title">Paramètres</h1>
      <p class="screen-subtitle">Personnalisez votre profil, vos données et vos connexions</p>
    </div>

         RISK PROFILE
    <section class="settings-section">
      <div class="settings-section-title">Profil de risque</div>

      <div class="profile-cards-row">
        ${_renderProfileCard('conservative', 'Conservateur', '0.25%', '🛡️',
          'Risque minimal. Seulement les signaux les plus forts.', settings.riskProfile)}
        ${_renderProfileCard('balanced', 'Équilibré', '0.50%', '⚖️',
          'Défaut recommandé. Bon équilibre risque/opportunité.', settings.riskProfile)}
        ${_renderProfileCard('dynamic', 'Dynamique', '1.00%', '⚡',
          'Plus d\'opportunités, mais plus d\'exposition.', settings.riskProfile)}
      </div>

      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Risque par trade</span>
            <span class="settings-hint">% du capital engagé par signal</span>
          </div>
          <div class="settings-control">
            <input type="range" id="risk-slider" class="range-input"
              min="0.25" max="1.00" step="0.25"
              value="${settings.riskPerTrade}"
              list="risk-ticks"/>
            <datalist id="risk-ticks">
              <option value="0.25"></option>
              <option value="0.50"></option>
              <option value="0.75"></option>
              <option value="1.00"></option>
            </datalist>
            <span class="range-value" id="risk-value">${settings.riskPerTrade}%</span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Capital fictif initial</span>
            <span class="settings-hint">Montant de départ pour la simulation</span>
          </div>
          <div class="settings-control-inline">
            <input type="number" id="settings-sim-capital" class="input-sm"
              value="${settings.simInitialCapital || 10000}" min="1000" max="1000000" step="1000"/>
            <span class="input-suffix">€</span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Nombre max. de positions ouvertes</span>
            <span class="settings-hint">Limite de concentration du portefeuille</span>
          </div>
          <div class="settings-control-inline">
            <input type="number" id="settings-max-pos" class="input-sm"
              value="${settings.maxOpenPositions || 10}" min="1" max="30"/>
          </div>
        </div>
      </div>
    </section>

         TWELVE DATA — API KEYS
    <section class="settings-section">
      <div class="settings-section-title">Twelve Data — Clés API</div>
      <p class="settings-section-desc">
        Entrez jusqu'à 4 clés Twelve Data pour activer les données de marché en temps réel.
        Sans clés, l'application utilise des données fictives de démonstration.
        <a href="https://twelvedata.com/" target="_blank" rel="noopener" class="link-ext">Obtenir des clés →</a>
      </p>

      <div class="settings-card">
        ${[1, 2, 3, 4].map(i => `
          <div class="settings-row api-key-row">
            <div class="settings-row-label">
              <span class="settings-label">Clé API ${i}</span>
              <span class="api-key-status" id="api-status-${i}">
                ${apiKeys[i - 1] ? '✅ Configurée' : '○ Non configurée'}
              </span>
            </div>
            <div class="settings-control api-key-control">
              <input type="password" id="api-key-${i}" class="input-sm input-key"
                placeholder="Coller votre clé ici…"
                value="${apiKeys[i - 1] ? '••••••••••••••••' : ''}"/>
              <button class="btn-ghost btn-xs" data-key-index="${i}">
                ${apiKeys[i - 1] ? 'Modifier' : 'Enregistrer'}
              </button>
            </div>
          </div>
        `).join('')}

        <div class="api-key-actions">
          <button class="btn-outline btn-sm" id="btn-test-api">
            Tester la connexion Twelve Data
          </button>
        </div>
      </div>
    </section>

         BROKER — BINANCE
    <section class="settings-section">
      <div class="settings-section-title">Binance — Connexion broker réel</div>

      <div class="settings-card broker-card ${settings.broker === 'binance' ? 'broker-active' : ''}">
        <div class="broker-header-row">
          <div class="broker-logo">
            <span class="broker-icon">🟡</span>
            <span class="broker-name">Binance</span>
          </div>
          <span class="broker-tag ${settings.broker === 'binance' ? 'connected' : 'disconnected'}">
            ${settings.broker === 'binance' ? '● Connecté' : '○ Non connecté'}
          </span>
        </div>

        <p class="broker-desc">
          Connectez votre compte Binance via API pour passer des ordres réels.
          Utilisez une clé API avec permissions de trading uniquement — jamais de retrait.
        </p>

        <div class="broker-warning">
          ⚠️ Les ordres réels engagent votre capital. Vérifiez toujours les paramètres avant confirmation.
        </div>

        <div class="broker-fields">
          <div class="field-row">
            <label class="field-label">API Key</label>
            <input type="password" id="binance-api-key" class="input-sm"
              placeholder="Binance API Key"
              value="${settings.binanceApiKey ? '••••••••••••••••' : ''}"/>
          </div>
          <div class="field-row">
            <label class="field-label">Secret Key</label>
            <input type="password" id="binance-secret" class="input-sm"
              placeholder="Binance Secret Key"
              value="${settings.binanceSecret ? '••••••••••••••••' : ''}"/>
          </div>
        </div>

        <div class="broker-actions">
          ${settings.broker === 'binance' ? `
            <button class="btn-danger-outline btn-sm" id="btn-disconnect-binance">
              Déconnecter Binance
            </button>
          ` : `
            <button class="btn-primary btn-sm" id="btn-connect-binance">
              Connecter Binance (V2)
            </button>
          `}
        </div>

        <p class="broker-v2-note">
          🚧 Intégration complète disponible en V2. La structure d'adaptateur est prête.
        </p>
      </div>
    </section>

         BROKER — TRADE REPUBLIC
    <section class="settings-section">
      <div class="settings-section-title">Trade Republic — Connexion broker réel</div>

      <div class="settings-card broker-card ${settings.broker === 'traderepublic' ? 'broker-active' : ''}">
        <div class="broker-header-row">
          <div class="broker-logo">
            <span class="broker-icon">🟢</span>
            <span class="broker-name">Trade Republic</span>
          </div>
          <span class="broker-tag ${settings.broker === 'traderepublic' ? 'connected' : 'disconnected'}">
            ${settings.broker === 'traderepublic' ? '● Connecté' : '○ Non connecté'}
          </span>
        </div>

        <p class="broker-desc">
          Connectez votre compte Trade Republic. L'intégration utilise l'API officielle
          ou WebSocket selon la disponibilité publique.
        </p>

        <div class="broker-warning">
          ⚠️ Trade Republic ne dispose pas d'API publique officielle.
          L'intégration V2 sera basée sur la reverse-engineering validée ou une API partenaire future.
        </div>

        <div class="broker-actions">
          <button class="btn-outline btn-sm disabled" disabled>
            Disponible en V2
          </button>
        </div>
      </div>
    </section>

         DISPLAY & PREFERENCES
    <section class="settings-section">
      <div class="settings-section-title">Affichage</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Thème</span>
            <span class="settings-hint">Interface claire ou sombre</span>
          </div>
          <div class="settings-control">
            <select id="theme-select" class="select-sm">
              <option value="dark"  ${settings.theme === 'dark'  ? 'selected' : ''}>Sombre (défaut)</option>
              <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Clair</option>
            </select>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Devise d'affichage</span>
          </div>
          <div class="settings-control">
            <select id="currency-select" class="select-sm">
              <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
            </select>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-label">Rafraîchissement auto</span>
            <span class="settings-hint">Intervalle de mise à jour des prix</span>
          </div>
          <div class="settings-control">
            <select id="refresh-select" class="select-sm">
              <option value="30"  ${settings.refreshInterval === 30  ? 'selected' : ''}>30 secondes</option>
              <option value="60"  ${settings.refreshInterval === 60  ? 'selected' : ''}>1 minute</option>
              <option value="300" ${settings.refreshInterval === 300 ? 'selected' : ''}>5 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    
    <div class="settings-footer">
      <button class="btn-primary btn-full" id="btn-save-settings">
        Enregistrer tous les paramètres
      </button>
    </div>

    
    <div class="settings-legal">
      <p>ManiTradePro V1 — Outil d'aide à la décision uniquement.</p>
      <p>Aucune garantie de performance. Les marchés financiers comportent des risques importants.</p>
      <p>Les données de marché sont fournies à titre indicatif. Vérifiez toujours les informations avec votre broker.</p>
    </div>
  `;

  _attachSettingsEvents(settings);
}

// -----------------------------------------------------------
// PROFILE CARD
// -----------------------------------------------------------

function _renderProfileCard(id, label, risk, icon, desc, current) {
  return `
    <div class="profile-card ${current === id ? 'profile-selected' : ''}" data-profile="${id}">
      <div class="profile-icon">${icon}</div>
      <div class="profile-label">${label}</div>
      <div class="profile-risk">${risk} / trade</div>
      <div class="profile-desc">${desc}</div>
    </div>
  `;
}

// -----------------------------------------------------------
// EVENTS
// -----------------------------------------------------------

function _attachSettingsEvents(settings) {
  // Profile selection
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('profile-selected'));
      card.classList.add('profile-selected');

      const profile   = card.dataset.profile;
      const riskMap   = { conservative: 0.25, balanced: 0.50, dynamic: 1.00 };
      const slider    = document.getElementById('risk-slider');
      const riskValue = document.getElementById('risk-value');
      if (slider) slider.value = riskMap[profile];
      if (riskValue) riskValue.textContent = `${riskMap[profile]}%`;
    });
  });

  // Risk slider
  const slider    = document.getElementById('risk-slider');
  const riskValue = document.getElementById('risk-value');
  if (slider && riskValue) {
    slider.addEventListener('input', () => {
      riskValue.textContent = `${parseFloat(slider.value).toFixed(2)}%`;
    });
  }

  // Save API key buttons
  document.querySelectorAll('[data-key-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i       = parseInt(btn.dataset.keyIndex) - 1;
      const input   = document.getElementById(`api-key-${i + 1}`);
      const statusEl = document.getElementById(`api-status-${i + 1}`);
      if (!input) return;

      const val = input.value.trim();
      if (!val || val.includes('•')) {
        showToast('Entrez une vraie clé API', 'error');
        return;
      }

      const _keysRaw = Storage.getApiKeys();
      const keys = Array.isArray(_keysRaw) ? _keysRaw : (_keysRaw.twelveData || []).map(k => k.key);
      keys[i]     = val;
      Storage.saveApiKeys(keys);

      input.value           = '••••••••••••••••';
      btn.textContent       = 'Modifier';
      if (statusEl) statusEl.textContent = '✅ Configurée';
      showToast(`Clé API ${i + 1} enregistrée`, 'success');
    });
  });

  // Test API
  const testBtn = document.getElementById('btn-test-api');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      testBtn.textContent = 'Test en cours…';
      testBtn.disabled    = true;
      try {
        const { TwelveDataClient } = window.__MTP || {};
        if (TwelveDataClient) {
          const result = await TwelveDataClient.testConnection();
          showToast(result ? 'Connexion Twelve Data OK ✅' : 'Aucune clé valide configurée', result ? 'success' : 'warning');
        } else {
          showToast('Client Twelve Data non initialisé', 'warning');
        }
      } catch (e) {
        showToast(`Erreur : ${e.message}`, 'error');
      } finally {
        testBtn.textContent = 'Tester la connexion Twelve Data';
        testBtn.disabled    = false;
      }
    });
  }

  // Connect Binance
  const binanceBtn = document.getElementById('btn-connect-binance');
  if (binanceBtn) {
    binanceBtn.addEventListener('click', () => {
      showToast('Intégration Binance disponible en V2. La structure est prête.', 'info');
    });
  }

  // Disconnect Binance
  const disconnectBtn = document.getElementById('btn-disconnect-binance');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      const s = Storage.getSettings();
      s.broker = 'none';
      s.binanceApiKey = '';
      s.binanceSecret = '';
      Storage.setSettings(s);
      showToast('Binance déconnecté', 'success');
      renderSettings();
    });
  }

  // Save all settings
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const current = Storage.getSettings();

      // Risk profile
      const selectedProfile = document.querySelector('.profile-card.profile-selected');
      if (selectedProfile) current.riskProfile = selectedProfile.dataset.profile;

      // Risk per trade
      const sliderEl = document.getElementById('risk-slider');
      if (sliderEl) current.riskPerTrade = parseFloat(sliderEl.value);

      // Sim capital
      const capEl = document.getElementById('settings-sim-capital');
      if (capEl && capEl.value) current.simInitialCapital = parseFloat(capEl.value);

      // Max positions
      const maxPosEl = document.getElementById('settings-max-pos');
      if (maxPosEl && maxPosEl.value) current.maxOpenPositions = parseInt(maxPosEl.value);

      // Theme
      const themeEl = document.getElementById('theme-select');
      if (themeEl) {
        current.theme = themeEl.value;
        document.documentElement.setAttribute('data-theme', themeEl.value);
      }

      // Currency
      const currEl = document.getElementById('currency-select');
      if (currEl) current.currency = currEl.value;

      // Refresh
      const refreshEl = document.getElementById('refresh-select');
      if (refreshEl) current.refreshInterval = parseInt(refreshEl.value);

      Storage.setSettings(current);
      showToast('Paramètres enregistrés ✅', 'success');
    });
  }
}

// ============================================================
// ALIASES — map module exports to globals used by screens
// ============================================================

// fmt is Fmt + extra helpers used by screens
const fmt = Object.assign({}, Fmt, {
  signedCurrency: (v) => {
    if (v === null || v === undefined) return '—';
    const sign = v >= 0 ? '+' : '';
    return sign + Fmt.currency(v);
  },
  signedPct: (v) => {
    if (v === null || v === undefined) return '—';
    const sign = v >= 0 ? '+' : '';
    return sign + Math.abs(v).toFixed(2) + '%';
  },
  qty: (v, symbol) => {
    if (v === null || v === undefined) return '—';
    const isCrypto = ['BTC','ETH','SOL','BNB'].includes(symbol);
    return isCrypto ? v.toFixed(4) : v.toFixed(2);
  },
  dateShort: (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
  },
});

// Alias standalone functions used by screens
const showToast         = (msg, type) => Sync.toast(msg, type);
const showConfirmModal  = (opts)       => Sync.confirm(opts.title, opts.message, opts.dangerMode);


// ============================================================
// BOOT — app.js (rewritten for bundle)
// ============================================================

async function boot() {
  console.log('🚀 ManiTradePro V1 — démarrage…');

  // 1. Storage
  Storage.init();

  // 2. Price cache
  window.__prices = {};

  // 3. Twelve Data
  const _apiKeysObj = Storage.getApiKeys();
  const apiKeys = Array.isArray(_apiKeysObj) ? _apiKeysObj.filter(Boolean) : (_apiKeysObj.twelveData || []).map(k => k.key).filter(Boolean);
  TwelveDataClient.init(apiKeys);
  window.__MTP.TwelveDataClient = TwelveDataClient;

  // 4. Broker
  const settings = Storage.getSettings();
  const adapter  = BrokerAdapterFactory.get(settings.broker || 'mock');
  window.__MTP.BrokerAdapter = adapter;

  // 5. Analysis Engine
  window.__MTP.AnalysisEngine = AnalysisEngine;

  // 6. Router
  const router = new Router();
  router.register('dashboard',     renderDashboard);
  router.register('opportunities', renderOpportunities);
  router.register('asset-detail',  renderAssetDetail);
  router.register('positions',     renderPositions);
  router.register('simulation',    renderSimulation);
  router.register('settings',      renderSettings);
  window.__MTP.Router = router;

  // 7. Theme
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');

  // 8. Initial analysis
  _runAnalysis();

  // 9. Sync
  const interval = (settings.refreshInterval || 30) * 1000;
  Sync.init({ interval, onTick: _onSyncTick });
  window.__MTP.Sync = Sync;

  // 10. Navigate
  router.navigate('dashboard');
  router.attachNavClicks();

  // 11. SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  console.log('✅ ManiTradePro V1 prêt');
}

async function _runAnalysis() {
  try {
    const watchlist = Storage.getWatchlist();
    const results   = await AnalysisEngine.analyzeAll(watchlist);
    window.__MTP.lastAnalysis = results;
    window.__MTP.analysisTime = Date.now();
    results.all.forEach(r => { if (r.price) window.__prices[r.symbol] = r.price; });
    _refreshCurrentScreen();
  } catch (err) {
    console.warn('⚠️ Erreur analyse :', err);
  }
}

async function _onSyncTick() {
  _updateMockPrices();
  _runAnalysis();
  const screen = window.__MTP.Router && window.__MTP.Router.currentScreen;
  if (screen === 'positions' && typeof updatePositionPrices === 'function') {
    updatePositionPrices();
  }
}

function _updateMockPrices() {
  Object.keys(window.__prices).forEach(sym => {
    window.__prices[sym] *= (1 + (Math.random() - 0.5) * 0.008);
  });
}

function _refreshCurrentScreen() {
  const screen = window.__MTP.Router && window.__MTP.Router.currentScreen;
  if (screen && ['dashboard', 'opportunities'].includes(screen)) {
    window.__MTP.Router.navigate(screen);
  }
}

window.addEventListener('unhandledrejection', e => console.error('❌', e.reason));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
