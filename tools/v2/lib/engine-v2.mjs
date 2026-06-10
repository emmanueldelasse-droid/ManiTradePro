// ============================================================
// ManiTradePro V2 — Learning Bot Engine (pure module)
// ============================================================
//
// Source de vérité UNIQUE de la logique quantitative V2 :
//   - univers (47 actifs)
//   - indicateurs (EMA, RSI, ATR, moyennes de volume)
//   - détection des 4 setups (pullback, breakout, mean reversion, GLD breakout)
//   - validation d'un plan de trade
//   - agrégation des statistiques d'apprentissage
//
// Aucune entrée/sortie réseau ici. Ce module est importé à la fois par le
// Worker V2 (cloudflare-worker/worker-v2.js) et par les tests
// (tools/v2/test/engine-v2.test.mjs). Une seule implémentation, testée.
//
// Philosophie V2 : « 100 trades analysables plutôt que 0 trade parfaitement
// filtré ». Si un setup est détecté et que son plan est valide, il DOIT être
// ouvrable. Pas de filtres cachés, pas de score, pas de confiance artificielle.
// ============================================================

// ---------- Univers : 47 actifs, aucun favorisé ----------

export const V2_UNIVERSE = Object.freeze([
  // Crypto (6)
  { symbol: "BTC", name: "Bitcoin", class: "crypto" },
  { symbol: "ETH", name: "Ethereum", class: "crypto" },
  { symbol: "SOL", name: "Solana", class: "crypto" },
  { symbol: "BNB", name: "BNB", class: "crypto" },
  { symbol: "XRP", name: "XRP", class: "crypto" },
  { symbol: "AVAX", name: "Avalanche", class: "crypto" },
  // Actions US (20)
  { symbol: "NVDA", name: "NVIDIA", class: "us_stock" },
  { symbol: "AAPL", name: "Apple", class: "us_stock" },
  { symbol: "MSFT", name: "Microsoft", class: "us_stock" },
  { symbol: "META", name: "Meta", class: "us_stock" },
  { symbol: "GOOGL", name: "Alphabet", class: "us_stock" },
  { symbol: "AMZN", name: "Amazon", class: "us_stock" },
  { symbol: "TSLA", name: "Tesla", class: "us_stock" },
  { symbol: "NFLX", name: "Netflix", class: "us_stock" },
  { symbol: "AVGO", name: "Broadcom", class: "us_stock" },
  { symbol: "ORCL", name: "Oracle", class: "us_stock" },
  { symbol: "AMD", name: "AMD", class: "us_stock" },
  { symbol: "PLTR", name: "Palantir", class: "us_stock" },
  { symbol: "CRWD", name: "CrowdStrike", class: "us_stock" },
  { symbol: "PANW", name: "Palo Alto", class: "us_stock" },
  { symbol: "NOW", name: "ServiceNow", class: "us_stock" },
  { symbol: "CRM", name: "Salesforce", class: "us_stock" },
  { symbol: "COST", name: "Costco", class: "us_stock" },
  { symbol: "LLY", name: "Eli Lilly", class: "us_stock" },
  { symbol: "JPM", name: "JPMorgan", class: "us_stock" },
  { symbol: "COIN", name: "Coinbase", class: "us_stock" },
  // Actions Europe (5)
  { symbol: "ASML", name: "ASML", class: "eu_stock" },
  { symbol: "LVMH", name: "LVMH", class: "eu_stock" },
  { symbol: "SAP", name: "SAP", class: "eu_stock" },
  { symbol: "AIR", name: "Airbus", class: "eu_stock" },
  { symbol: "SIE", name: "Siemens", class: "eu_stock" },
  // ETF (8)
  { symbol: "SPY", name: "S&P 500 ETF", class: "etf" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", class: "etf" },
  { symbol: "XLK", name: "Tech Sector ETF", class: "etf" },
  { symbol: "XLF", name: "Financials ETF", class: "etf" },
  { symbol: "XLV", name: "Healthcare ETF", class: "etf" },
  { symbol: "SMH", name: "Semiconductors ETF", class: "etf" },
  { symbol: "IWM", name: "Russell 2000 ETF", class: "etf" },
  { symbol: "DIA", name: "Dow Jones ETF", class: "etf" },
  // Commodities (4)
  { symbol: "GLD", name: "Gold ETF", class: "commodity" },
  { symbol: "SLV", name: "Silver ETF", class: "commodity" },
  { symbol: "USO", name: "Oil ETF", class: "commodity" },
  { symbol: "UNG", name: "Natural Gas ETF", class: "commodity" },
  // Forex (4)
  { symbol: "EURUSD", name: "EUR/USD", class: "forex" },
  { symbol: "GBPUSD", name: "GBP/USD", class: "forex" },
  { symbol: "USDJPY", name: "USD/JPY", class: "forex" },
  { symbol: "AUDUSD", name: "AUD/USD", class: "forex" },
]);

export const V2_SYMBOLS = Object.freeze(V2_UNIVERSE.map((a) => a.symbol));

export function getAsset(symbol) {
  const s = String(symbol || "").trim().toUpperCase();
  return V2_UNIVERSE.find((a) => a.symbol === s) || null;
}

// Réglages par défaut du moteur. Volontairement permissifs : on veut des
// trades pour apprendre, pas un filtre parfait qui n'ouvre jamais rien.
export const V2_DEFAULT_SETTINGS = Object.freeze({
  rrMin: 1.5,             // ratio gain/risque minimum pour ouvrir
  maxOpenPositions: 20,   // capacité paper (apprentissage large)
  maxHoldDays: 25,        // fermeture automatique après N jours
  riskPerTradePct: 0.5,   // % du capital virtuel risqué par trade (réduit de 1.0)
  startingEquity: 100000, // capital virtuel de référence
});

// Montant risqué par trade (en monnaie du capital virtuel) — pour affichage.
export function riskPerTrade(settings = V2_DEFAULT_SETTINGS) {
  const equity = settings?.startingEquity ?? V2_DEFAULT_SETTINGS.startingEquity;
  const pct = settings?.riskPerTradePct ?? V2_DEFAULT_SETTINGS.riskPerTradePct;
  return equity * (pct / 100);
}

// ---------- Indicateurs ----------

export function ema(values, period) {
  if (!Array.isArray(values) || values.length < period || period < 1) return null;
  const k = 2 / (period + 1);
  // amorçage par moyenne simple des `period` premières valeurs
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

export function sma(values, period) {
  if (!Array.isArray(values) || values.length < period || period < 1) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// RSI de Wilder.
export function rsi(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ATR (Average True Range), Wilder.
export function atr(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return null;
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
  }
  return prev;
}

// Calcule l'instantané d'indicateurs nécessaire à la détection.
export function computeIndicators(candles) {
  if (!Array.isArray(candles) || candles.length < 60) return null;
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => (Number.isFinite(c.volume) ? c.volume : 0));
  const last = candles[candles.length - 1];
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(candles, 14);
  const avgVol20 = sma(volumes, 20);
  if (ema20 == null || ema50 == null || rsi14 == null || atr14 == null) return null;
  return {
    last,
    close: last.close,
    ema20,
    ema50,
    rsi14,
    atr14,
    avgVol20,
    lastVolume: volumes[volumes.length - 1],
    highs,
    lows,
    closes,
    volumes,
  };
}

// ---------- Helpers structurels ----------

function recentHigh(highs, lookback, excludeLast = 1) {
  const end = highs.length - excludeLast;
  const start = Math.max(0, end - lookback);
  let m = -Infinity;
  for (let i = start; i < end; i++) if (highs[i] > m) m = highs[i];
  return m === -Infinity ? null : m;
}

function recentLow(lows, lookback, excludeLast = 1) {
  const end = lows.length - excludeLast;
  const start = Math.max(0, end - lookback);
  let m = Infinity;
  for (let i = start; i < end; i++) if (lows[i] < m) m = lows[i];
  return m === Infinity ? null : m;
}

function round(v, digits = 6) {
  if (!Number.isFinite(v)) return v;
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

// ---------- Détection des setups ----------
//
// Chaque détecteur retourne soit null, soit un objet :
//   { detected:true, setupType, direction, entry, stopLoss, takeProfit, rr, reason }
// `entry`, `stopLoss`, `takeProfit` sont des PRIX. `rr` est calculé à partir
// d'eux. La validation finale (validatePlan) garantit la cohérence.

export function detectPullback(ind, symbol) {
  const { close, ema20, ema50, atr14, lows, highs, avgVol20, lastVolume } = ind;
  // Tendance haussière : EMA20 au-dessus de EMA50.
  if (!(ema20 > ema50)) return null;
  // Retour sur l'EMA20 : le bas récent est venu toucher la zone EMA20 et le
  // cours a refermé au-dessus → rebond potentiel.
  const touchedEma = ind.last.low <= ema20 * 1.015;
  const closedAbove = close > ema20 * 0.995;
  if (!touchedEma || !closedAbove) return null;
  // Volume « correct » : on ne veut pas un volume effondré (manque d'intérêt).
  if (avgVol20 && lastVolume < avgVol20 * 0.5) return null;
  const entry = close;
  const swingLow = recentLow(lows, 5, 1);
  const stopLoss = Math.min(swingLow != null ? swingLow : entry, ema20) - 0.2 * atr14;
  const takeProfit = recentHigh(highs, 12, 1);
  if (stopLoss == null || takeProfit == null) return null;
  if (!(stopLoss < entry && takeProfit > entry)) return null;
  const rr = (takeProfit - entry) / (entry - stopLoss);
  return {
    detected: true,
    setupType: "pullback",
    direction: "long",
    entry: round(entry),
    stopLoss: round(stopLoss),
    takeProfit: round(takeProfit),
    rr: round(rr, 2),
    reason: `Tendance haussière (EMA20>EMA50), repli sur l'EMA20 puis reprise. Objectif = dernier sommet (${round(takeProfit)}).`,
  };
}

export function detectBreakout(ind, symbol) {
  const { close, atr14, highs, lows, avgVol20, lastVolume, ema20, ema50 } = ind;
  // On ne prend les cassures que dans un contexte non baissier.
  if (!(ema20 >= ema50 * 0.98)) return null;
  const level = recentHigh(highs, 20, 1);
  if (level == null) return null;
  // Cassure de la résistance.
  if (!(close > level)) return null;
  // Volume supérieur à la moyenne (conviction de la cassure).
  if (!avgVol20 || !(lastVolume > avgVol20 * 1.2)) return null;
  const entry = close;
  const stopLoss = level - 0.3 * atr14; // retour sous le niveau cassé = échec
  const support = recentLow(lows, 20, 1);
  // Objectif = projection (« measured move ») de l'amplitude de la base, projetée
  // depuis l'entrée (pas depuis le niveau) pour rester cohérent même si le cours
  // clôture nettement au-dessus de la résistance.
  const base = support != null ? level - support : 2 * atr14;
  const takeProfit = entry + Math.max(base, 1.5 * atr14);
  if (!(stopLoss < entry && takeProfit > entry)) return null;
  const rr = (takeProfit - entry) / (entry - stopLoss);
  return {
    detected: true,
    setupType: "breakout",
    direction: "long",
    entry: round(entry),
    stopLoss: round(stopLoss),
    takeProfit: round(takeProfit),
    rr: round(rr, 2),
    reason: `Cassure de la résistance ${round(level)} avec volume au-dessus de la moyenne. Objectif par projection de la base.`,
  };
}

export function detectMeanReversion(ind, symbol) {
  const { close, ema20, atr14, rsi14 } = ind;
  // Survente extrême → rebond statistique vers la moyenne (EMA20).
  if (rsi14 <= 28) {
    // Extension excessive sous la moyenne.
    if (!(close < ema20 - 0.5 * atr14)) return null;
    const entry = close;
    const stopLoss = entry - 1.5 * atr14;
    const takeProfit = ema20; // retour à la moyenne
    if (!(stopLoss < entry && takeProfit > entry)) return null;
    const rr = (takeProfit - entry) / (entry - stopLoss);
    return {
      detected: true,
      setupType: "mean_reversion",
      direction: "long",
      entry: round(entry),
      stopLoss: round(stopLoss),
      takeProfit: round(takeProfit),
      rr: round(rr, 2),
      reason: `Survente (RSI ${round(rsi14, 1)}) et cours étiré sous la moyenne. Retour statistique vers l'EMA20.`,
    };
  }
  // Surachat extrême → repli statistique vers la moyenne (vente à découvert).
  if (rsi14 >= 72) {
    if (!(close > ema20 + 0.5 * atr14)) return null;
    const entry = close;
    const stopLoss = entry + 1.5 * atr14;
    const takeProfit = ema20;
    if (!(stopLoss > entry && takeProfit < entry)) return null;
    const rr = (entry - takeProfit) / (stopLoss - entry);
    return {
      detected: true,
      setupType: "mean_reversion",
      direction: "short",
      entry: round(entry),
      stopLoss: round(stopLoss),
      takeProfit: round(takeProfit),
      rr: round(rr, 2),
      reason: `Surachat (RSI ${round(rsi14, 1)}) et cours étiré au-dessus de la moyenne. Repli statistique vers l'EMA20.`,
    };
  }
  return null;
}

// GLD Breakout — version spécialisée du breakout, calibrée pour l'or (GLD).
// L'or casse souvent avec moins de volume relatif que les actions ; on assouplit
// l'exigence de volume et on vise un objectif un peu plus serré.
export function detectGldBreakout(ind, symbol) {
  if (symbol !== "GLD") return null;
  const { close, atr14, highs, avgVol20, lastVolume } = ind;
  const level = recentHigh(highs, 20, 1);
  if (level == null) return null;
  if (!(close > level)) return null;
  // Volume juste au-dessus de la moyenne suffit pour l'or.
  if (avgVol20 && !(lastVolume > avgVol20 * 1.0)) return null;
  const entry = close;
  const stopLoss = level - 0.4 * atr14;
  const takeProfit = entry + 2.0 * atr14;
  if (!(stopLoss < entry && takeProfit > entry)) return null;
  const rr = (takeProfit - entry) / (entry - stopLoss);
  return {
    detected: true,
    setupType: "gld_breakout",
    direction: "long",
    entry: round(entry),
    stopLoss: round(stopLoss),
    takeProfit: round(takeProfit),
    rr: round(rr, 2),
    reason: `GLD : cassure du plus haut ${round(level)} (or). Objectif ATR ×2.`,
  };
}

// Lance les 4 détecteurs et retourne le meilleur setup (rr le plus élevé) ou
// null. GLD Breakout prime sur le breakout générique pour GLD.
export function detectSetups(ind, symbol) {
  if (!ind) return [];
  const candidates = [];
  const gld = detectGldBreakout(ind, symbol);
  if (gld) candidates.push(gld);
  const pb = detectPullback(ind, symbol);
  if (pb) candidates.push(pb);
  // Breakout générique ignoré pour GLD si GLD breakout déjà détecté.
  if (!(symbol === "GLD" && gld)) {
    const bo = detectBreakout(ind, symbol);
    if (bo) candidates.push(bo);
  }
  const mr = detectMeanReversion(ind, symbol);
  if (mr) candidates.push(mr);
  return candidates;
}

export function bestSetup(ind, symbol) {
  const c = detectSetups(ind, symbol);
  if (!c.length) return null;
  return c.slice().sort((a, b) => b.rr - a.rr)[0];
}

// ---------- Validation d'un plan ----------
//
// Garantit qu'un setup affiché comme ouvrable EST ouvrable. Si invalide → on
// ne l'affiche pas comme opportunité.

export function validatePlan(setup, settings = V2_DEFAULT_SETTINGS) {
  const rrMin = settings?.rrMin ?? V2_DEFAULT_SETTINGS.rrMin;
  if (!setup || setup.detected !== true) return { valid: false, reason: "no_setup" };
  const { entry, stopLoss, takeProfit, direction, rr } = setup;
  if (![entry, stopLoss, takeProfit, rr].every((v) => Number.isFinite(v))) {
    return { valid: false, reason: "non_finite" };
  }
  if (entry <= 0) return { valid: false, reason: "bad_entry" };
  if (direction === "long") {
    if (!(stopLoss < entry)) return { valid: false, reason: "stop_not_below_entry" };
    if (!(takeProfit > entry)) return { valid: false, reason: "tp_not_above_entry" };
  } else if (direction === "short") {
    if (!(stopLoss > entry)) return { valid: false, reason: "stop_not_above_entry" };
    if (!(takeProfit < entry)) return { valid: false, reason: "tp_not_below_entry" };
  } else {
    return { valid: false, reason: "bad_direction" };
  }
  if (!(rr >= rrMin)) return { valid: false, reason: "rr_below_min" };
  return { valid: true, reason: "ok" };
}

// Taille de position paper (en unités de l'actif) à partir du risque fixé.
export function computePositionSize(setup, settings = V2_DEFAULT_SETTINGS) {
  const equity = settings?.startingEquity ?? V2_DEFAULT_SETTINGS.startingEquity;
  const riskPct = settings?.riskPerTradePct ?? V2_DEFAULT_SETTINGS.riskPerTradePct;
  const riskBudget = equity * (riskPct / 100);
  const perUnitRisk = Math.abs(setup.entry - setup.stopLoss);
  if (!(perUnitRisk > 0)) return 0;
  return round(riskBudget / perUnitRisk, 6);
}

// ---------- Gestion de position (résolution sur une bougie) ----------
//
// Détermine si une position ouverte doit se fermer compte tenu de la dernière
// bougie. Stop prioritaire sur TP (hypothèse conservatrice). Retourne null si
// la position reste ouverte.

export function resolvePosition(position, candle, opts = {}) {
  const { direction, stopLoss, takeProfit } = position;
  const high = candle.high;
  const low = candle.low;
  if (direction === "long") {
    if (low <= stopLoss) return { exit: stopLoss, exitReason: "stop" };
    if (high >= takeProfit) return { exit: takeProfit, exitReason: "target" };
  } else {
    if (high >= stopLoss) return { exit: stopLoss, exitReason: "stop" };
    if (low <= takeProfit) return { exit: takeProfit, exitReason: "target" };
  }
  if (opts.forceTimeExit) return { exit: candle.close, exitReason: "time" };
  return null;
}

export function computePnl(position, exitPrice) {
  const dir = position.direction === "short" ? -1 : 1;
  const qty = Number(position.qty) || 0;
  const pnl = (exitPrice - position.entry) * dir * qty;
  const pnlPct = position.entry > 0
    ? ((exitPrice - position.entry) / position.entry) * 100 * dir
    : 0;
  return { pnl: round(pnl, 4), pnlPct: round(pnlPct, 4) };
}

// ---------- Statistiques d'apprentissage ----------
//
// À partir d'une liste de trades fermés, calcule les métriques par setup, par
// actif et globales. C'est ici que le bot « apprend » : quel setup gagne, quel
// setup perd, sur quels actifs.

function aggregate(trades) {
  const n = trades.length;
  if (!n) {
    return {
      trades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0,
      expectancy: 0, avgWin: 0, avgLoss: 0, totalPnl: 0, maxDrawdown: 0,
    };
  }
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPnl = 0;
  for (const t of trades) {
    const pnl = Number(t.pnl) || 0;
    totalPnl += pnl;
    if (pnl >= 0) { wins++; grossProfit += pnl; }
    else { losses++; grossLoss += -pnl; }
  }
  // Drawdown sur la courbe d'équité cumulée (ordre chronologique).
  const sorted = trades.slice().sort((a, b) => {
    const ta = new Date(a.closedAt || a.closed_at || 0).getTime();
    const tb = new Date(b.closedAt || b.closed_at || 0).getTime();
    return ta - tb;
  });
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const t of sorted) {
    equity += Number(t.pnl) || 0;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }
  const winRate = wins / n;
  const avgWin = wins ? grossProfit / wins : 0;
  const avgLoss = losses ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const expectancy = totalPnl / n;
  return {
    trades: n,
    wins,
    losses,
    winRate: round(winRate, 4),
    profitFactor: Number.isFinite(profitFactor) ? round(profitFactor, 4) : null,
    expectancy: round(expectancy, 4),
    avgWin: round(avgWin, 4),
    avgLoss: round(avgLoss, 4),
    totalPnl: round(totalPnl, 4),
    maxDrawdown: round(maxDd, 4),
  };
}

export function computeStats(trades) {
  const list = Array.isArray(trades) ? trades : [];
  const bySetup = {};
  const byAsset = {};
  for (const t of list) {
    const setup = t.setupType || t.setup_type || "unknown";
    const symbol = t.symbol || "unknown";
    (bySetup[setup] = bySetup[setup] || []).push(t);
    (byAsset[symbol] = byAsset[symbol] || []).push(t);
  }
  const setups = {};
  for (const [k, v] of Object.entries(bySetup)) setups[k] = aggregate(v);
  const assets = {};
  for (const [k, v] of Object.entries(byAsset)) assets[k] = aggregate(v);
  return {
    overall: aggregate(list),
    bySetup: setups,
    byAsset: assets,
  };
}
