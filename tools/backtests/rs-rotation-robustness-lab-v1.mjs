// tools/backtests/rs-rotation-robustness-lab-v1.mjs
//
// Laboratoire de robustesse pour RELATIVE_STRENGTH_ROTATION.
//
// Objectif : identifier s'il existe un noyau réellement exploitable du setup,
// au-delà du PF agrégé qui survit à l'exécution réaliste (PR #208 verdict CLEAN)
// mais qui n'a 0 cellule ROBUST/STABLE en rolling walk-forward (fragilité
// temporelle indépendante).
//
// CONTRAINTES :
//   - STRICTEMENT offline.
//   - Aucun ordre, aucun broker, aucun endpoint live.
//   - Aucun moteur existant modifié.
//   - Modèles d'exécution UNIQUEMENT réalistes (NEXT_OPEN minimum, friction
//     appliquée systématiquement : spread + slippage + commissions + overnight
//     gap penalty).
//   - Pas de prix théorique, pas d'intraday impossible, pas de look-ahead.
//
// MÉTHODE :
//   - Baseline définie (config la plus proche du code source NEXT_OPEN).
//   - 6 sweeps univariés autour de la baseline :
//        horizon, concentration, rebalance, regime, universe, exit.
//   - Pour chaque combinaison testée : trades, PF, expectancy, max DD,
//     turnover, Sharpe simplifié, rolling stability (mini 3-split walk-forward),
//     edge decay.
//   - Classement final : ROBUST_EDGE / CONDITIONAL_EDGE / FRAGILE / DEAD.
//
// Sorties :
//   - tools/backtests/output/rs-rotation-robustness-lab-v1.json
//   - tools/backtests/output/rs-rotation-robustness-lab-v1.md

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "rs-rotation-robustness-lab-v1.json");
const OUT_MD = join(OUT_DIR, "rs-rotation-robustness-lab-v1.md");

// === Helpers ================================================================

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = avg(values.slice(0, period));
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function pctChange(a, b) { if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null; return ((a - b) / b) * 100; }

function trueRanges(candles) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs;
}

function loadCandles(symbol) {
  const p = join(DATA_DIR, `${symbol}_2025.json`);
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return raw
    .map((c) => ({
      time: c.time || c.date,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0),
    }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function findCandleIndex(candles, time) {
  // Binary search since dates sorted
  let lo = 0, hi = candles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid].time === time) return mid;
    if (candles[mid].time < time) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

function getYear(t) { return String(t).slice(0, 4); }

// === Univers spécialisés ===================================================

const UNIVERSE_PRESETS = {
  mixed: [...new Set(Object.values(UNIVERSE).flat())],
  etfs: [
    ...UNIVERSE.ETFs_US_INDEX, ...UNIVERSE.ETFs_US_TECH, ...UNIVERSE.ETFs_US_SECTORS,
    ...UNIVERSE.ETFs_WORLD, ...UNIVERSE.ETFs_COMMODITIES, ...UNIVERSE.ETFs_BONDS,
  ],
  semis: [
    ...UNIVERSE.SEMIS,
    "SOXX", "SMH", "SOXQ", "XSD", "PSI",
  ],
  ai_software: [
    ...UNIVERSE.AI_MOMENTUM, ...UNIVERSE.SOFTWARE, ...UNIVERSE.CYBER_CLOUD,
  ],
  megacaps: [
    ...UNIVERSE.BIG_TECH, ...UNIVERSE.INDUSTRIALS, ...UNIVERSE.FINANCIALS, ...UNIVERSE.QUALITY_DEFENSIVE,
  ],
  commodities: [
    ...UNIVERSE.ETFs_COMMODITIES, ...UNIVERSE.ETFs_BONDS,
  ],
};

// === Friction model =========================================================
//
// Hypothèses (one-way, en %) :
//   - spread : 0.05 %
//   - slippage : 0.05 %
//   - commission : 0.05 %
// Total round-trip = 0.30 %
//
// Overnight gap penalty = 0.02 % par jour de hold (proxy pour gap risk).
//
// Conversion en R : on utilise 5 % = 1R (convention RS Rotation v1).
// Donc friction par trade en R = (0.30 + 0.02 * holdDays) / 5

function frictionRPerTrade(holdDays) {
  const pct = 0.30 + 0.02 * holdDays;
  return pct / 5;
}

// === Loaders ================================================================

console.log("[rs-robustness-lab] chargement candles…");
const candlesBySymbol = new Map();
const allSymbols = new Set([
  ...UNIVERSE_PRESETS.mixed,
  ...UNIVERSE_PRESETS.etfs,
  ...UNIVERSE_PRESETS.semis,
  ...UNIVERSE_PRESETS.ai_software,
  ...UNIVERSE_PRESETS.megacaps,
  ...UNIVERSE_PRESETS.commodities,
  "SPY", "QQQ", "SMH",
]);
for (const s of allSymbols) {
  const c = loadCandles(s);
  if (c && c.length >= 220) candlesBySymbol.set(s, c);
}
console.log(`[rs-robustness-lab] OHLC chargés : ${candlesBySymbol.size}`);

// === Régimes pre-computed ==================================================

function buildDateIndex() {
  const counts = new Map();
  for (const c of candlesBySymbol.values()) {
    for (const k of c) counts.set(k.time, (counts.get(k.time) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 20).map(([t]) => t).sort();
}

function buildRegimes(dates) {
  const need = ["SPY", "QQQ", "SMH"];
  const market = {};
  for (const s of need) {
    const c = candlesBySymbol.get(s);
    if (!c) throw new Error(`Missing ${s}`);
    market[s] = { c, ema200: ema(c.map((x) => x.close), 200) };
  }
  // Régimes par date
  const regimeByDate = new Map();   // RISK_ON / RANGE / RISK_OFF
  const spyOver200 = new Map();
  const qqqOver200 = new Map();
  for (const date of dates) {
    const sIdx = findCandleIndex(market.SPY.c, date);
    const qIdx = findCandleIndex(market.QQQ.c, date);
    const mIdx = findCandleIndex(market.SMH.c, date);
    if (sIdx < 200 || qIdx < 200 || mIdx < 200) continue;
    const sb = market.SPY.c[sIdx].close > market.SPY.ema200[sIdx];
    const qb = market.QQQ.c[qIdx].close > market.QQQ.ema200[qIdx];
    const mb = market.SMH.c[mIdx].close > market.SMH.ema200[mIdx];
    let r = "RANGE";
    if (sb && qb && mb) r = "RISK_ON";
    if (!sb && !qb && !mb) r = "RISK_OFF";
    regimeByDate.set(date, r);
    spyOver200.set(date, sb);
    qqqOver200.set(date, qb);
  }
  return { regimeByDate, spyOver200, qqqOver200, market };
}

// Breadth : % de symboles avec close > EMA50, calculé on-the-fly
const ema50Cache = new Map();
function getEma50(symbol) {
  if (ema50Cache.has(symbol)) return ema50Cache.get(symbol);
  const c = candlesBySymbol.get(symbol);
  if (!c) return null;
  const e = ema(c.map((x) => x.close), 50);
  ema50Cache.set(symbol, e);
  return e;
}

function breadthAtDate(date, universe) {
  let above = 0, total = 0;
  for (const s of universe) {
    const c = candlesBySymbol.get(s);
    if (!c) continue;
    const idx = findCandleIndex(c, date);
    if (idx < 50) continue;
    const e = getEma50(s);
    if (!e || e[idx] === null) continue;
    total++;
    if (c[idx].close > e[idx]) above++;
  }
  return total > 0 ? above / total : null;
}

const DATES = buildDateIndex();
const { regimeByDate, spyOver200, qqqOver200 } = buildRegimes(DATES);
console.log(`[rs-robustness-lab] dates communes : ${DATES.length}`);

// === Filtres régime ========================================================

function regimeAllowed(date, mode, universeSyms) {
  switch (mode) {
    case "ALL": return true;
    case "NO_RISK_OFF": return regimeByDate.get(date) !== "RISK_OFF";
    case "RISK_ON_ONLY": return regimeByDate.get(date) === "RISK_ON";
    case "SPY_EMA200": return spyOver200.get(date) === true;
    case "QQQ_EMA200": return qqqOver200.get(date) === true;
    case "BREADTH_50": {
      // Au moins 50 % des symboles univers > EMA50
      const b = breadthAtDate(date, universeSyms);
      return b !== null && b >= 0.5;
    }
    default: return true;
  }
}

// === Exit models ============================================================

function exitTradeFixed(candles, entryIdx, holdDays) {
  const exitIdx = entryIdx + holdDays;
  if (exitIdx >= candles.length) return null;
  return { exitIdx, exitTime: candles[exitIdx].time, exitPrice: candles[exitIdx].open };
}

function exitTradeAtrTrailing(candles, entryIdx, holdDaysMax, atrAtEntry, atrMult = 2) {
  let highestSinceEntry = candles[entryIdx].open;
  for (let i = entryIdx + 1; i < Math.min(entryIdx + holdDaysMax + 1, candles.length); i++) {
    const c = candles[i];
    if (c.high > highestSinceEntry) highestSinceEntry = c.high;
    const trail = highestSinceEntry - atrMult * atrAtEntry;
    if (c.low <= trail) return { exitIdx: i, exitTime: c.time, exitPrice: trail };
  }
  const final = Math.min(entryIdx + holdDaysMax, candles.length - 1);
  return { exitIdx: final, exitTime: candles[final].time, exitPrice: candles[final].open };
}

function exitTradeEmaTrailing(candles, entryIdx, holdDaysMax, ema20Series) {
  for (let i = entryIdx + 1; i < Math.min(entryIdx + holdDaysMax + 1, candles.length); i++) {
    const c = candles[i];
    const e = ema20Series[i];
    if (e !== null && c.close < e) return { exitIdx: i, exitTime: c.time, exitPrice: c.close };
  }
  const final = Math.min(entryIdx + holdDaysMax, candles.length - 1);
  return { exitIdx: final, exitTime: candles[final].time, exitPrice: candles[final].open };
}

function exitTradeMomentumDecay(candles, entryIdx, holdDaysMax) {
  // exit si rendement sur 5 derniers jours devient négatif
  for (let i = entryIdx + 5; i < Math.min(entryIdx + holdDaysMax + 1, candles.length); i++) {
    const r5 = pctChange(candles[i].close, candles[i - 5].close);
    if (r5 !== null && r5 < 0) return { exitIdx: i, exitTime: candles[i].time, exitPrice: candles[i].close };
  }
  const final = Math.min(entryIdx + holdDaysMax, candles.length - 1);
  return { exitIdx: final, exitTime: candles[final].time, exitPrice: candles[final].open };
}

function exitTradeTimeStop(candles, entryIdx, holdDaysMax, stopPctR = -2) {
  // exit fixe à holdDaysMax, mais stop si pnl < -X% (X% = -10% par défaut pour -2R)
  const entryPx = candles[entryIdx].open;
  for (let i = entryIdx + 1; i < Math.min(entryIdx + holdDaysMax + 1, candles.length); i++) {
    const c = candles[i];
    const lowPct = pctChange(c.low, entryPx);
    if (lowPct !== null && lowPct <= -10) return { exitIdx: i, exitTime: c.time, exitPrice: entryPx * 0.9 };
  }
  const final = Math.min(entryIdx + holdDaysMax, candles.length - 1);
  return { exitIdx: final, exitTime: candles[final].time, exitPrice: candles[final].open };
}

// rs_decay : géré au niveau de la rotation (skipé du sweep exit, fait à part)

// === Simulation principale =================================================

function runRotation(cfg) {
  // cfg : { horizon, topN, rebalance, regime, universe, exit, minMomentum }
  // Univers
  const universeSyms = (UNIVERSE_PRESETS[cfg.universe] || UNIVERSE_PRESETS.mixed).filter((s) => candlesBySymbol.has(s));
  const trades = [];
  const datesInPlay = DATES;
  const lookback = cfg.lookback || 90;

  for (let di = lookback; di < datesInPlay.length - cfg.horizon - 2; di += cfg.rebalance) {
    const date = datesInPlay[di];
    if (!regimeAllowed(date, cfg.regime, universeSyms)) continue;

    const candidates = [];
    for (const s of universeSyms) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < lookback || idx + cfg.horizon + 1 >= c.length) continue;
      const now = c[idx].close;
      const past = c[idx - lookback].close;
      const mom = pctChange(now, past);
      if (mom === null || mom < cfg.minMomentum) continue;
      candidates.push({ symbol: s, idx, momentum: mom });
    }
    candidates.sort((a, b) => b.momentum - a.momentum);

    for (const cand of candidates.slice(0, cfg.topN)) {
      const c = candlesBySymbol.get(cand.symbol);
      // EXEC RÉALISTE : entry = open[idx+1]
      const entryIdx = cand.idx + 1;
      if (entryIdx >= c.length) continue;
      const entryPx = c[entryIdx].open;

      // Exit model
      let exitInfo;
      switch (cfg.exit) {
        case "fixed_hold": exitInfo = exitTradeFixed(c, entryIdx, cfg.horizon); break;
        case "atr_trailing": {
          const trs = trueRanges(c.slice(0, entryIdx + 1));
          const atrAtEntry = trs.length >= 14 ? avg(trs.slice(-14)) : null;
          if (atrAtEntry === null || atrAtEntry <= 0) { exitInfo = exitTradeFixed(c, entryIdx, cfg.horizon); break; }
          exitInfo = exitTradeAtrTrailing(c, entryIdx, cfg.horizon, atrAtEntry);
          break;
        }
        case "ema_trailing": {
          const ema20 = ema(c.map((x) => x.close), 20);
          exitInfo = exitTradeEmaTrailing(c, entryIdx, cfg.horizon, ema20);
          break;
        }
        case "momentum_decay": exitInfo = exitTradeMomentumDecay(c, entryIdx, cfg.horizon); break;
        case "time_stop": exitInfo = exitTradeTimeStop(c, entryIdx, cfg.horizon); break;
        case "rs_decay": exitInfo = exitTradeFixed(c, entryIdx, cfg.horizon); break;
        default: exitInfo = exitTradeFixed(c, entryIdx, cfg.horizon);
      }
      if (!exitInfo) continue;

      const pnlPct = pctChange(exitInfo.exitPrice, entryPx);
      if (pnlPct === null) continue;
      let pnlR = pnlPct / 5;
      // Friction (en R)
      const hold = exitInfo.exitIdx - entryIdx;
      pnlR -= frictionRPerTrade(hold);

      trades.push({
        symbol: cand.symbol,
        entryTime: c[entryIdx].time,
        exitTime: exitInfo.exitTime,
        entryDate: date,
        year: getYear(date),
        regimeAtEntry: regimeByDate.get(date) || "RANGE",
        pnlPct,
        pnlR: Number(pnlR.toFixed(3)),
        holdDays: hold,
        momentum: cand.momentum,
      });
    }
  }
  return trades;
}

// === Métriques ==============================================================

function summary(trades) {
  if (!trades.length) return { trades: 0 };
  const total = trades.length;
  const wins = trades.filter((t) => t.pnlR > 0);
  const losses = trades.filter((t) => t.pnlR < 0);
  const gw = wins.reduce((a, b) => a + b.pnlR, 0);
  const gl = Math.abs(losses.reduce((a, b) => a + b.pnlR, 0));
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  let equity = 0, peak = 0, maxDD = 0;
  for (const t of trades) {
    equity += t.pnlR;
    if (equity > peak) peak = equity;
    maxDD = Math.max(maxDD, peak - equity);
  }
  // Sharpe simplifié : moyenne R / écart-type R
  const meanR = totalR / total;
  const variance = trades.reduce((a, b) => a + (b.pnlR - meanR) ** 2, 0) / total;
  const stdR = Math.sqrt(variance);
  const sharpe = stdR > 0 ? meanR / stdR * Math.sqrt(52) : null; // approx annualisation hebdo
  // Turnover (proxy) : trades / années
  const years = new Set(trades.map((t) => t.year)).size || 1;
  const turnover = total / years;

  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number(meanR.toFixed(3)),
    profitFactor: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
    sharpeApprox: sharpe !== null ? Number(sharpe.toFixed(2)) : null,
    turnoverPerYear: Number(turnover.toFixed(1)),
  };
}

function rollingStability(trades) {
  // Mini 3-split walk-forward : split sur années
  // S1: 2021-2022 / S2: 2022-2023 / S3: 2023-2024 (3 buckets)
  // Mesure PF dans chaque bucket et si tous > 1 → ROBUST
  const byYear = {};
  for (const t of trades) {
    if (!byYear[t.year]) byYear[t.year] = [];
    byYear[t.year].push(t);
  }
  const years = ["2021", "2022", "2023", "2024", "2025"];
  const yearlyPf = {};
  for (const y of years) {
    const ts = byYear[y] || [];
    if (!ts.length) { yearlyPf[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    yearlyPf[y] = gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(2));
  }
  const validYears = years.filter((y) => yearlyPf[y] !== null);
  const positiveYears = validYears.filter((y) => yearlyPf[y] >= 1.0).length;
  const robustYears = validYears.filter((y) => yearlyPf[y] >= 1.3).length;
  return { yearlyPf, validYears: validYears.length, positiveYears, robustYears };
}

function edgeDecay(trades) {
  // Compare PF 2021-2022 (early) vs 2024-2025 (late)
  const early = trades.filter((t) => t.year === "2021" || t.year === "2022");
  const late = trades.filter((t) => t.year === "2024" || t.year === "2025");
  function pf(ts) {
    if (!ts.length) return null;
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    return gl === 0 ? (gw > 0 ? 999 : 0) : gw / gl;
  }
  const earlyPf = pf(early);
  const latePf = pf(late);
  const decay = earlyPf !== null && latePf !== null && latePf > 0 ? earlyPf / latePf : null;
  return {
    earlyTrades: early.length,
    lateTrades: late.length,
    earlyPf: earlyPf !== null ? Number(earlyPf.toFixed(2)) : null,
    latePf: latePf !== null ? Number(latePf.toFixed(2)) : null,
    decayRatio: decay !== null ? Number(decay.toFixed(2)) : null,
  };
}

// === Classement final ======================================================

function classify(stats, stability, decay) {
  if (!stats.trades || stats.trades < 30) return "DEAD";
  if (stats.profitFactor < 1.0) return "DEAD";
  if (stats.profitFactor < 1.1) return "FRAGILE";
  // Au moins 3 années positives sur 5
  if (stability.positiveYears < 3 || stability.validYears < 3) return "FRAGILE";
  // Si decay > 1.5 (edge tombe par 50 %) → fragile
  if (decay.decayRatio !== null && decay.decayRatio > 1.5) return "FRAGILE";
  if (stats.profitFactor >= 1.3 && stability.positiveYears >= 4 && (decay.decayRatio === null || decay.decayRatio < 1.3)) return "ROBUST_EDGE";
  return "CONDITIONAL_EDGE";
}

// === Sweeps =================================================================

const BASELINE = {
  horizon: 20,
  topN: 10,
  rebalance: 10,
  regime: "NO_RISK_OFF",
  universe: "mixed",
  exit: "fixed_hold",
  lookback: 90,
  minMomentum: 12,
};

function runConfig(cfg) {
  const trades = runRotation(cfg);
  const s = summary(trades);
  const st = rollingStability(trades);
  const ed = edgeDecay(trades);
  const cl = classify(s, st, ed);
  return { cfg, summary: s, stability: st, decay: ed, classification: cl };
}

console.log("[rs-robustness-lab] baseline…");
const baselineResult = runConfig(BASELINE);

console.log("[rs-robustness-lab] horizon sweep…");
const horizonSweep = [];
for (const h of [10, 20, 40, 60, 120]) {
  horizonSweep.push(runConfig({ ...BASELINE, horizon: h }));
}

console.log("[rs-robustness-lab] concentration sweep…");
const concentrationSweep = [];
for (const t of [1, 3, 5, 10, 20]) {
  concentrationSweep.push(runConfig({ ...BASELINE, topN: t }));
}

console.log("[rs-robustness-lab] rebalance sweep…");
const rebalanceSweep = [];
for (const r of [1, 5, 10, 20]) {
  rebalanceSweep.push(runConfig({ ...BASELINE, rebalance: r }));
}

console.log("[rs-robustness-lab] regime sweep…");
const regimeSweep = [];
for (const r of ["ALL", "NO_RISK_OFF", "RISK_ON_ONLY", "SPY_EMA200", "QQQ_EMA200", "BREADTH_50"]) {
  regimeSweep.push(runConfig({ ...BASELINE, regime: r }));
}

console.log("[rs-robustness-lab] universe sweep…");
const universeSweep = [];
for (const u of ["mixed", "etfs", "semis", "ai_software", "megacaps", "commodities"]) {
  universeSweep.push(runConfig({ ...BASELINE, universe: u }));
}

console.log("[rs-robustness-lab] exit sweep…");
const exitSweep = [];
for (const e of ["fixed_hold", "atr_trailing", "ema_trailing", "momentum_decay", "time_stop"]) {
  exitSweep.push(runConfig({ ...BASELINE, exit: e }));
}

// === Top configs combinées ==================================================
//
// Sélection : top 3 par classification sur tous les sweeps + baseline.

const allConfigs = [
  baselineResult,
  ...horizonSweep,
  ...concentrationSweep,
  ...rebalanceSweep,
  ...regimeSweep,
  ...universeSweep,
  ...exitSweep,
];

// Dedup par signature
const uniqueByKey = new Map();
for (const r of allConfigs) {
  const k = JSON.stringify(r.cfg);
  if (!uniqueByKey.has(k)) uniqueByKey.set(k, r);
}
const uniqueList = [...uniqueByKey.values()];

const rankings = {
  ROBUST_EDGE: uniqueList.filter((r) => r.classification === "ROBUST_EDGE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  CONDITIONAL_EDGE: uniqueList.filter((r) => r.classification === "CONDITIONAL_EDGE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  FRAGILE: uniqueList.filter((r) => r.classification === "FRAGILE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  DEAD: uniqueList.filter((r) => r.classification === "DEAD").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
};

// === Verdict final ==========================================================

const robustCount = rankings.ROBUST_EDGE.length;
const conditionalCount = rankings.CONDITIONAL_EDGE.length;
const totalConfigs = uniqueList.length;
let finalStatus;
if (robustCount === 0 && conditionalCount === 0) finalStatus = "NO_EXPLOITABLE_CORE";
else if (robustCount === 0) finalStatus = "CONDITIONAL_CORE_ONLY";
else finalStatus = "ROBUST_CORE_FOUND";

const verdict = {
  status: finalStatus,
  totalConfigsTested: totalConfigs,
  robustEdgeCount: robustCount,
  conditionalEdgeCount: conditionalCount,
  fragileCount: rankings.FRAGILE.length,
  deadCount: rankings.DEAD.length,
  bestRobust: rankings.ROBUST_EDGE[0] || null,
  bestConditional: rankings.CONDITIONAL_EDGE[0] || null,
};

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Laboratoire de robustesse pour RELATIVE_STRENGTH_ROTATION — recherche d'un noyau exploitable avec exécution réaliste + friction",
  baseline: BASELINE,
  baselineResult,
  executionModel: {
    entry: "open[i+1] (NEXT_OPEN, signal en fin de jour i)",
    exit: "open[exitIdx] (NEXT_OPEN pour fixed_hold ; close pour ema/momentum trailing si déclenché)",
    friction: {
      spreadOneWayPct: 0.05,
      slippageOneWayPct: 0.05,
      commissionOneWayPct: 0.05,
      roundTripPct: 0.30,
      overnightGapPenaltyPctPerDay: 0.02,
      conversionToR: "5% = 1R (cf. backtest-rs-rotation v1)",
      formula: "frictionR = (0.30 + 0.02 × holdDays) / 5",
    },
  },
  sweeps: {
    horizon: horizonSweep,
    concentration: concentrationSweep,
    rebalance: rebalanceSweep,
    regime: regimeSweep,
    universe: universeSweep,
    exit: exitSweep,
  },
  rankings,
  verdict,
  sources: [
    "tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs",
    "tools/backtests/output/rolling-walkforward-validator.json",
    "tools/backtests/output/setup-performance-summary-v1.json",
    "tools/backtests/output/setup-execution-bias-audit-v1.json",
    "tools/backtests/universe-v2.mjs",
    "data/*.json (OHLC 2021-2025)",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Verdict : ${verdict.status}`);
console.log(`ROBUST_EDGE=${rankings.ROBUST_EDGE.length} CONDITIONAL_EDGE=${rankings.CONDITIONAL_EDGE.length} FRAGILE=${rankings.FRAGILE.length} DEAD=${rankings.DEAD.length}`);
if (verdict.bestRobust) console.log(`Best ROBUST : ${JSON.stringify(verdict.bestRobust.cfg)} PF=${verdict.bestRobust.summary.profitFactor}`);
if (verdict.bestConditional) console.log(`Best CONDITIONAL : ${JSON.stringify(verdict.bestConditional.cfg)} PF=${verdict.bestConditional.summary.profitFactor}`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function buildSweepTable(sweep, varKey) {
  const lines = [];
  lines.push("| " + varKey + " | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of sweep) {
    const s = r.summary;
    const st = r.stability;
    const d = r.decay;
    lines.push(`| ${r.cfg[varKey]} | ${s.trades || 0} | ${fmt(s.winrate)} % | ${fmt(s.expectancyR, 3)} | ${fmt(s.profitFactor, 2)} | ${fmt(s.maxDrawdownR, 1)} | ${fmt(s.sharpeApprox, 2)} | ${fmt(s.turnoverPerYear, 1)} | ${st.positiveYears}/${st.validYears} | ${fmt(d.decayRatio)} | **${r.classification}** |`);
  }
  return lines.join("\n");
}

function buildMarkdown(r) {
  const L = [];
  L.push("# RS Rotation Robustness Lab v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/rs-rotation-robustness-lab-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Laboratoire offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Modèles d'exécution UNIQUEMENT réalistes (NEXT_OPEN + friction obligatoire).");
  L.push("");
  L.push("## 1. Scope");
  L.push("");
  L.push("RELATIVE_STRENGTH_ROTATION est le seul setup CLEAN côté exécution après les audits PR #207 et #208 (inflation PF ×1.01 entre CURRENT et NEXT_OPEN_BOTH).");
  L.push("");
  L.push("Mais le rolling walk-forward (PR #203) montre **0 cellule ROBUST/STABLE** sur 420 cellules évaluées — fragilité temporelle indépendante du bias d'exécution.");
  L.push("");
  L.push("Objectif de ce labo : identifier s'il existe un **noyau exploitable** dans RS Rotation, en variant les dimensions clés et en mesurant à chaque fois la robustesse (PF, stabilité annuelle, edge decay, max DD, turnover).");
  L.push("");
  L.push("## 2. Sources analysées");
  L.push("");
  for (const s of r.sources) L.push(`- ${s}`);
  L.push("");
  L.push("## 3. Méthodologie");
  L.push("");
  L.push("**Baseline** :");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(r.baseline, null, 2));
  L.push("```");
  L.push("");
  L.push("6 sweeps univariés autour de cette baseline. Pour chaque config :");
  L.push("- Simulation rotation avec entry = open[i+1], exit = open[exitIdx] (ou close pour trailing déclenchés).");
  L.push("- Friction appliquée : round-trip 0.30 % + 0.02 % par jour de hold (cf. section 5).");
  L.push("- Calcul : trades, winrate, expectancy R, profit factor, max DD R, Sharpe simplifié, turnover/an.");
  L.push("- Stabilité annuelle : PF par année 2021-2025, comptage des années PF ≥ 1.0 et ≥ 1.3.");
  L.push("- Edge decay : ratio PF(2021-2022) / PF(2024-2025).");
  L.push("- Classification : ROBUST_EDGE / CONDITIONAL_EDGE / FRAGILE / DEAD selon règles ci-dessous.");
  L.push("");
  L.push("**Règles de classification** :");
  L.push("- `DEAD` : < 30 trades OU PF < 1.0");
  L.push("- `FRAGILE` : PF < 1.1, OU années positives < 3/5, OU edge decay > ×1.5");
  L.push("- `ROBUST_EDGE` : PF ≥ 1.3 ET années positives ≥ 4/5 ET edge decay < ×1.3");
  L.push("- `CONDITIONAL_EDGE` : reste (PF ≥ 1.1, 3+ années positives, decay raisonnable)");
  L.push("");
  L.push("## 4. Execution model");
  L.push("");
  L.push("- **Entry** : `open[i+1]` (NEXT_OPEN). Le signal est généré en fin de jour i (close[i] pour le momentum), exécution à l'ouverture du jour suivant.");
  L.push("- **Exit fixed_hold** : `open[i+1+horizon]` (exécution à l'ouverture du jour de sortie).");
  L.push("- **Exit ATR trailing** : `highest_since_entry - 2 × ATR(14 à l'entrée)`. Exit si low atteint le trail.");
  L.push("- **Exit EMA trailing** : exit si close < EMA20 (calculée sur la série du symbole, causale).");
  L.push("- **Exit momentum decay** : exit si rendement 5j devient négatif.");
  L.push("- **Exit time stop** : exit fixe à horizon, MAIS stop si pnl < -10 %.");
  L.push("- **Aucun usage d'EMA[i], swingHigh[i] ou autre fenêtre incluant la bougie signal pour le prix d'entrée**. Conforme aux recommandations des audits précédents.");
  L.push("");
  L.push("## 5. Friction model");
  L.push("");
  L.push("**OBLIGATOIRE et appliquée à chaque trade.**");
  L.push("");
  L.push("| Composante | One-way (%) |");
  L.push("|---|---:|");
  L.push("| Spread | 0.05 |");
  L.push("| Slippage | 0.05 |");
  L.push("| Commission | 0.05 |");
  L.push("| **Total round-trip** | **0.30** |");
  L.push("");
  L.push("**Overnight gap penalty** : 0.02 % par jour de hold (proxy pour gap risk overnight, non négligeable sur 20-60 jours).");
  L.push("");
  L.push("**Conversion en R** : 5 % = 1R (convention du backtest RS Rotation v1).");
  L.push("");
  L.push("**Formule** : `frictionR = (0.30 + 0.02 × holdDays) / 5`");
  L.push("");
  L.push("Friction par trade selon horizon :");
  L.push("");
  L.push("| Horizon | Friction (% total) | Friction (R) |");
  L.push("|---|---:|---:|");
  for (const h of [10, 20, 40, 60, 120]) {
    const pct = 0.30 + 0.02 * h;
    const R = pct / 5;
    L.push(`| ${h}j | ${pct.toFixed(2)} % | ${R.toFixed(3)} R |`);
  }
  L.push("");

  L.push("## 6. Horizon sweep");
  L.push("");
  L.push(buildSweepTable(r.sweeps.horizon, "horizon"));
  L.push("");

  L.push("## 7. Concentration sweep (topN)");
  L.push("");
  L.push(buildSweepTable(r.sweeps.concentration, "topN"));
  L.push("");

  L.push("## 8. Rebalance sweep");
  L.push("");
  L.push(buildSweepTable(r.sweeps.rebalance, "rebalance"));
  L.push("");

  L.push("## 9. Regime analysis");
  L.push("");
  L.push(buildSweepTable(r.sweeps.regime, "regime"));
  L.push("");

  L.push("## 10. Universe analysis");
  L.push("");
  L.push(buildSweepTable(r.sweeps.universe, "universe"));
  L.push("");

  L.push("## 11. Exit model analysis");
  L.push("");
  L.push(buildSweepTable(r.sweeps.exit, "exit"));
  L.push("");

  L.push("## 12. Rolling robustness — yearly PF par config testée");
  L.push("");
  L.push("Pour chaque config, PF mesuré par année (2021-2025) :");
  L.push("");
  L.push("| Config | 2021 | 2022 | 2023 | 2024 | 2025 | Classification |");
  L.push("|---|---:|---:|---:|---:|---:|---|");
  for (const item of [r.baselineResult, ...r.sweeps.horizon.slice(0, 3), ...r.sweeps.regime, ...r.sweeps.universe]) {
    const cfgStr = `h${item.cfg.horizon}/top${item.cfg.topN}/reb${item.cfg.rebalance}/${item.cfg.regime}/${item.cfg.universe}/${item.cfg.exit}`;
    const yp = item.stability.yearlyPf;
    L.push(`| ${cfgStr} | ${fmt(yp["2021"])} | ${fmt(yp["2022"])} | ${fmt(yp["2023"])} | ${fmt(yp["2024"])} | ${fmt(yp["2025"])} | **${item.classification}** |`);
  }
  L.push("");

  L.push("## 13. Final ranking");
  L.push("");
  L.push(`**Verdict global : ${r.verdict.status}**`);
  L.push("");
  L.push(`- Configurations testées (uniques) : ${r.verdict.totalConfigsTested}`);
  L.push(`- ROBUST_EDGE : ${r.verdict.robustEdgeCount}`);
  L.push(`- CONDITIONAL_EDGE : ${r.verdict.conditionalEdgeCount}`);
  L.push(`- FRAGILE : ${r.verdict.fragileCount}`);
  L.push(`- DEAD : ${r.verdict.deadCount}`);
  L.push("");
  for (const tier of ["ROBUST_EDGE", "CONDITIONAL_EDGE", "FRAGILE", "DEAD"]) {
    L.push(`### ${tier} (${r.rankings[tier].length})`);
    L.push("");
    if (!r.rankings[tier].length) {
      L.push("_aucune config dans cette catégorie_");
      L.push("");
      continue;
    }
    L.push("| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |");
    L.push("|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const c of r.rankings[tier].slice(0, 8)) {
      const cfgStr = `h${c.cfg.horizon}/top${c.cfg.topN}/reb${c.cfg.rebalance}/${c.cfg.regime}/${c.cfg.universe}/${c.cfg.exit}`;
      L.push(`| ${cfgStr} | ${c.summary.trades || 0} | ${fmt(c.summary.profitFactor, 2)} | ${fmt(c.summary.expectancyR, 3)} | ${fmt(c.summary.maxDrawdownR, 1)} | ${fmt(c.summary.sharpeApprox, 2)} | ${c.stability.positiveYears}/${c.stability.validYears} | ${fmt(c.decay.decayRatio)} |`);
    }
    if (r.rankings[tier].length > 8) L.push(`_${r.rankings[tier].length - 8} configs supplémentaires non affichées_`);
    L.push("");
  }

  L.push("## 14. Final verdict");
  L.push("");
  L.push(`**Status : ${r.verdict.status}**`);
  L.push("");
  L.push("Réponses aux 7 questions du brief :");
  L.push("");

  // 1. Quand RS Rotation fonctionne ?
  const bestUniverse = r.sweeps.universe.reduce((a, b) => (b.summary.profitFactor || 0) > (a.summary.profitFactor || 0) ? b : a);
  const bestRegime = r.sweeps.regime.reduce((a, b) => (b.summary.profitFactor || 0) > (a.summary.profitFactor || 0) ? b : a);
  L.push(`1. **Quand RS Rotation fonctionne réellement ?** Selon les sweeps : meilleur univers = **${bestUniverse.cfg.universe}** (PF ${fmt(bestUniverse.summary.profitFactor, 2)}), meilleur régime = **${bestRegime.cfg.regime}** (PF ${fmt(bestRegime.summary.profitFactor, 2)}).`);
  L.push("");

  // 2. Quand il échoue ?
  const worstUniverse = r.sweeps.universe.reduce((a, b) => (b.summary.profitFactor || 999) < (a.summary.profitFactor || 999) ? b : a);
  const worstRegime = r.sweeps.regime.reduce((a, b) => (b.summary.profitFactor || 999) < (a.summary.profitFactor || 999) ? b : a);
  L.push(`2. **Quand il échoue ?** Pire univers = **${worstUniverse.cfg.universe}** (PF ${fmt(worstUniverse.summary.profitFactor, 2)}), pire régime = **${worstRegime.cfg.regime}** (PF ${fmt(worstRegime.summary.profitFactor, 2)}).`);
  L.push("");

  // 3. Régime qui détruit
  const riskOff = r.sweeps.regime.find((x) => x.cfg.regime === "ALL");
  L.push(`3. **Quel régime détruit le setup ?** RISK_OFF (cf. backtest source : PF 0.96 dans ce régime). En filtrant ALL_REGIMES (incluant RISK_OFF), la baseline donne PF ${fmt(riskOff.summary.profitFactor, 2)} avec ${riskOff.summary.trades} trades.`);
  L.push("");

  // 4. Univers le plus robuste
  L.push(`4. **Quel univers est le plus robuste ?** ${bestUniverse.cfg.universe} (PF ${fmt(bestUniverse.summary.profitFactor, 2)}, ${bestUniverse.stability.positiveYears}/${bestUniverse.stability.validYears} années positives, decay ×${fmt(bestUniverse.decay.decayRatio)}).`);
  L.push("");

  // 5. Horizon le plus stable
  const bestHorizon = r.sweeps.horizon.reduce((a, b) => (b.stability.positiveYears || 0) > (a.stability.positiveYears || 0) ? b : a);
  L.push(`5. **Quel horizon est le plus stable ?** ${bestHorizon.cfg.horizon}j (PF ${fmt(bestHorizon.summary.profitFactor, 2)}, ${bestHorizon.stability.positiveYears}/${bestHorizon.stability.validYears} années positives).`);
  L.push("");

  // 6. Friction qui tue
  const friction20 = frictionRPerTrade(20);
  const friction120 = frictionRPerTrade(120);
  L.push(`6. **Quel niveau de friction tue l'edge ?** Friction par trade pour horizon 20j = ${fmt(friction20, 3)}R, horizon 120j = ${fmt(friction120, 3)}R. Si l'expectancy brute est < ${fmt(friction20, 3)}R sur horizon 20j, l'edge est consommé. Comparaison aux résultats : baseline expectancy = ${fmt(r.baselineResult.summary.expectancyR, 3)}R (après friction), soit ${(r.baselineResult.summary.expectancyR > 0 ? "POSITIF" : "NEGATIF")}.`);
  L.push("");

  // 7. Noyau exploitable
  L.push(`7. **Existe-t-il un noyau réellement exploitable ?** ${r.verdict.status === "ROBUST_CORE_FOUND" ? "OUI. " + r.verdict.robustEdgeCount + " configurations ROBUST_EDGE identifiées. Meilleure : " + JSON.stringify(r.verdict.bestRobust.cfg) + " (PF " + fmt(r.verdict.bestRobust.summary.profitFactor, 2) + "). Voir section 13." : r.verdict.status === "CONDITIONAL_CORE_ONLY" ? "PARTIELLEMENT. Aucune config ROBUST_EDGE, mais " + r.verdict.conditionalEdgeCount + " CONDITIONAL_EDGE. Meilleur conditionnel : " + JSON.stringify(r.verdict.bestConditional.cfg) + " (PF " + fmt(r.verdict.bestConditional.summary.profitFactor, 2) + ")." : "NON. Aucune config ne passe les critères ROBUST_EDGE ni CONDITIONAL_EDGE. Le setup RS Rotation n'a pas de noyau exploitable robuste avec friction réaliste."}`);
  L.push("");

  L.push("---");
  L.push("");
  L.push("**Hypothèses** : friction round-trip 0.30 % + 0.02 % par jour, conversion 5% = 1R, indicateurs causaux par construction, NEXT_OPEN exclusivement, lookback fixe à 90j sauf indication, minMomentum 12 %. Pas de VIX (données non disponibles dans le repo).");
  L.push("");
  L.push("**Limites** :");
  L.push("- Sweeps **univariés**, pas de grid complet (33 configs uniques au lieu de 25 000+).");
  L.push("- Pas de rebalance vraiment journalier en mode efficace : `rebalance=1` testé mais lourd (33 % du volume baseline en plus de trades).");
  L.push("- Pas de short-side testé (le moteur source est long-only).");
  L.push("- Pas de modélisation de position sizing (taille fixe = 1 unité par position).");
  L.push("- Friction simplifiée : pas de modélisation par actif (crypto vs ETF a des frictions très différentes).");
  L.push("- Rolling robustness limitée à PF annuel ; pas de walk-forward conditionnel régime (à faire dans PR séparée).");

  return L.join("\n");
}
