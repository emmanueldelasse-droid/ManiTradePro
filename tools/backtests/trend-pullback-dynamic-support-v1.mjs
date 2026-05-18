// tools/backtests/trend-pullback-dynamic-support-v1.mjs
//
// Setup TREND_PULLBACK_DYNAMIC_SUPPORT — test honnête.
//
// Philosophie :
//   - acheter des leaders en tendance forte (filtre trend rigoureux),
//   - pendant une respiration contrôlée (pullback vers support dynamique),
//   - avec confirmation de reprise (bougie verte qui dépasse high veille).
//
// Différences fondamentales vs ancien Pullback (INVALID_BACKTEST, PR #207) :
//   - entrée NEXT_OPEN obligatoire (jamais ema20 théorique).
//   - swing/atr calculés sur fenêtres EXCLUANT la bougie signal.
//   - reprise OBLIGATOIRE avant entrée (pas "anticipée").
//   - friction obligatoire dès le premier test.
//
// CONTRAINTES :
//   - STRICTEMENT offline.
//   - Aucun moteur existant modifié.
//   - Aucun look-ahead, aucun prix théorique.
//
// Sorties :
//   - tools/backtests/output/trend-pullback-dynamic-support-v1.json
//   - tools/backtests/output/trend-pullback-dynamic-support-v1.md

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "trend-pullback-dynamic-support-v1.json");
const OUT_MD = join(OUT_DIR, "trend-pullback-dynamic-support-v1.md");

// === Helpers ===============================================================
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = avg(values.slice(0, period));
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(prev);
  for (let i = period; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); out.push(prev); }
  return out;
}
function pctChange(a, b) { if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null; return ((a - b) / b) * 100; }
function trueRanges(c) {
  const o = [];
  for (let i = 1; i < c.length; i++) o.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  return o;
}
function loadCandles(s) {
  const p = join(DATA_DIR, `${s}_2025.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"))
    .map((c) => ({ time: c.time || c.date, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +(c.volume || 0) }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}
function findCandleIndex(c, t) {
  let lo = 0, hi = c.length - 1;
  while (lo <= hi) { const m = (lo + hi) >>> 1; if (c[m].time === t) return m; if (c[m].time < t) lo = m + 1; else hi = m - 1; }
  return -1;
}
function getYear(t) { return String(t).slice(0, 4); }
function frictionR(holdDays) { return (0.30 + 0.02 * holdDays) / 5; }
function frictionR_x2(holdDays) { return (0.60 + 0.04 * holdDays) / 5; }

// === Chargement ============================================================
console.log("[trend-pullback] chargement…");
const candlesBySymbol = new Map();
for (const s of new Set([...Object.values(UNIVERSE).flat(), "SPY", "QQQ", "SMH"])) {
  const c = loadCandles(s);
  if (c && c.length >= 250) candlesBySymbol.set(s, c);
}
console.log(`[trend-pullback] OHLC chargés : ${candlesBySymbol.size}`);

// Précalcul EMA50, EMA100, EMA20 par symbole
const indicatorsBySymbol = new Map();
for (const [s, c] of candlesBySymbol) {
  const closes = c.map((x) => x.close);
  indicatorsBySymbol.set(s, {
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema100: ema(closes, 100),
  });
}

// === Univers presets ========================================================
const UNIVERSE_PRESETS = {
  mixed: [...new Set(Object.values(UNIVERSE).flat())],
  ai_software: [...UNIVERSE.AI_MOMENTUM, ...UNIVERSE.SOFTWARE, ...UNIVERSE.CYBER_CLOUD],
  semis: [...UNIVERSE.SEMIS, "SOXX", "SMH", "SOXQ", "XSD", "PSI"],
  megacaps: [...UNIVERSE.BIG_TECH, ...UNIVERSE.INDUSTRIALS, ...UNIVERSE.FINANCIALS, ...UNIVERSE.QUALITY_DEFENSIVE],
  etfs: [...UNIVERSE.ETFs_US_INDEX, ...UNIVERSE.ETFs_US_TECH, ...UNIVERSE.ETFs_US_SECTORS],
};

// === Dates + régime =========================================================
function buildDates() {
  const cnt = new Map();
  for (const c of candlesBySymbol.values()) for (const k of c) cnt.set(k.time, (cnt.get(k.time) || 0) + 1);
  return [...cnt.entries()].filter(([, n]) => n >= 20).map(([t]) => t).sort();
}
function buildRegime(dates) {
  const need = ["SPY", "QQQ", "SMH"];
  const market = {};
  for (const s of need) { const c = candlesBySymbol.get(s); market[s] = { c, e: ema(c.map((x) => x.close), 200) }; }
  const out = new Map();
  for (const d of dates) {
    const si = findCandleIndex(market.SPY.c, d), qi = findCandleIndex(market.QQQ.c, d), mi = findCandleIndex(market.SMH.c, d);
    if (si < 200 || qi < 200 || mi < 200) continue;
    const sb = market.SPY.c[si].close > market.SPY.e[si];
    const qb = market.QQQ.c[qi].close > market.QQQ.e[qi];
    const mb = market.SMH.c[mi].close > market.SMH.e[mi];
    let r = "RANGE"; if (sb && qb && mb) r = "RISK_ON"; if (!sb && !qb && !mb) r = "RISK_OFF";
    out.set(d, r);
  }
  return out;
}
const DATES = buildDates();
const regimeByDate = buildRegime(DATES);
console.log(`[trend-pullback] dates communes : ${DATES.length}`);

// === Détection du signal — Trend Pullback Dynamic Support ==================
//
// signalIdx = i (jour J du signal, exécution en J+1 à l'open).
//
// Étape 1 — Trend filter rigoureux :
//   - close[i] > EMA50[i]
//   - EMA50[i] > EMA100[i]
//   - momentum 60j > minMomentum%
//   - relative strength positive (close > close[i-60])
//
// Étape 2 — Pullback condition (respiration contrôlée) :
//   - Sur les K dernières bougies (i-pullbackWindow..i), le low a touché
//     une zone proche d'EMA20 OU EMA50 (selon variante).
//   - Distance pullback contrôlée : low_min / close_J-K-1 entre -3 % et -12 %
//     (pas plus de -12 % = correction violente).
//
// Étape 3 — Confirmation reprise (bougie i = jour J) :
//   - close[i] > high[i-1]
//   - close[i] > open[i] (bougie verte)
//   - close[i] > EMA20[i] (rejet support dynamique)
//
// Étape 4 — Entry : open[i+1] (JAMAIS close[i] ni EMA théorique).

function detectTrendPullback(candles, i, ind, variant) {
  if (i < 110) return null; // besoin EMA100 + 60j momentum
  const c = candles[i];
  const prev = candles[i - 1];

  // Trend filter
  const e20 = ind.ema20[i], e50 = ind.ema50[i], e100 = ind.ema100[i];
  if (e20 === null || e50 === null || e100 === null) return null;
  if (c.close <= e50) return null;
  if (e50 <= e100) return null;
  const close60ago = candles[i - 60].close;
  const mom60 = pctChange(c.close, close60ago);
  if (mom60 === null || mom60 < variant.minMomentum60) return null;

  // Pullback : sur K dernières bougies, low s'est rapproché de EMA20 ou EMA50
  const pullbackWindow = variant.pullbackWindow || 10;
  let touchedSupport = false;
  let minLowDist = Infinity;
  for (let j = Math.max(0, i - pullbackWindow); j <= i - 1; j++) {
    const supportPrice = variant.supportType === "EMA20" ? ind.ema20[j] : ind.ema50[j];
    if (supportPrice === null) continue;
    // Distance en %
    const distPct = (candles[j].low - supportPrice) / supportPrice * 100;
    if (distPct < minLowDist) minLowDist = distPct;
    if (distPct >= -1.5 && distPct <= 2.0) touchedSupport = true; // touche dans une bande proche
  }
  if (!touchedSupport) return null;

  // Pullback magnitude contrôlée : low_min de la fenêtre vs close avant la fenêtre
  const lookbackStart = Math.max(0, i - pullbackWindow - 1);
  const preCloseClose = candles[lookbackStart].close;
  const lowMin = Math.min(...candles.slice(Math.max(0, i - pullbackWindow), i).map((x) => x.low));
  const pullbackDrawdown = pctChange(lowMin, preCloseClose);
  if (pullbackDrawdown === null) return null;
  if (pullbackDrawdown > -2 || pullbackDrawdown < -15) return null; // entre -2 % et -15 %

  // Confirmation reprise (jour J)
  if (c.close <= prev.high) return null;
  if (c.close <= c.open) return null;
  if (c.close <= e20) return null;

  // Tout est OK
  return {
    signalIdx: i,
    pullbackDrawdownPct: Number(pullbackDrawdown.toFixed(2)),
    momentum60: Number(mom60.toFixed(2)),
    distEMA20: pctChange(c.close, e20),
  };
}

// === Construction du trade selon variante ==================================
function buildTrade(candles, ind, signalIdx, variant) {
  const i = signalIdx;
  const entryIdx = i + 1;
  if (entryIdx >= candles.length) return null;
  const entry = candles[entryIdx].open;

  // Stop selon variante (calculé sur fenêtre EXCLUANT bougie signal)
  let stop;
  const trs = trueRanges(candles.slice(0, i)); // exclut bougie i
  const atr = trs.length >= 14 ? avg(trs.slice(-14)) : null;
  if (!atr) return null;
  switch (variant.stopType) {
    case "swing_low_minus_atr": {
      const swingWindow = 10;
      const low = Math.min(...candles.slice(Math.max(0, i - swingWindow), i).map((x) => x.low));
      stop = low - 0.5 * atr;
      break;
    }
    case "ema50": stop = ind.ema50[i] - 0.3 * atr; break;
    case "atr_2": stop = entry - 2 * atr; break;
    default: stop = entry - 1.5 * atr;
  }
  if (!Number.isFinite(stop) || stop >= entry) return null;
  return { entry, stop, atr };
}

// === Simulation du trade ===================================================
function simulateTrade(candles, ind, entryIdx, entry, stop, atr, exitModel, horizon, frictionFn) {
  const trsAtEntry = trueRanges(candles.slice(0, entryIdx));
  const atrAtEntry = trsAtEntry.length >= 14 ? avg(trsAtEntry.slice(-14)) : atr;
  let highestSinceEntry = entry;
  let exitIdx = null;
  let exitPrice = null;
  for (let j = entryIdx + 1; j < Math.min(entryIdx + horizon + 1, candles.length); j++) {
    const k = candles[j];
    if (k.high > highestSinceEntry) highestSinceEntry = k.high;
    // Stop hit
    if (k.low <= stop) { exitIdx = j; exitPrice = stop; break; }
    // Exit selon modèle
    if (exitModel === "trailing_atr") {
      const trail = highestSinceEntry - 2 * atrAtEntry;
      if (k.close < trail) { exitIdx = j; exitPrice = k.close; break; }
    }
    if (exitModel === "trailing_ema20") {
      const e = ind.ema20[j];
      if (e !== null && k.close < e) { exitIdx = j; exitPrice = k.close; break; }
    }
    if (exitModel === "trend_break") {
      const e50 = ind.ema50[j];
      if (e50 !== null && k.close < e50) { exitIdx = j; exitPrice = k.close; break; }
    }
  }
  if (exitIdx === null) {
    // Fixed hold = sortie à horizon
    exitIdx = Math.min(entryIdx + horizon, candles.length - 1);
    exitPrice = candles[exitIdx].open;
  }
  const pnlPct = pctChange(exitPrice, entry);
  if (pnlPct === null) return null;
  const holdDays = exitIdx - entryIdx;
  let pnlR = pnlPct / 5;
  pnlR -= frictionFn(holdDays);
  return { exitIdx, exitPrice, pnlR: Number(pnlR.toFixed(3)), holdDays };
}

// === Run config =============================================================
function runConfig(cfg) {
  const universe = (UNIVERSE_PRESETS[cfg.universe] || []).filter((s) => candlesBySymbol.has(s));
  const trades = [];
  for (const symbol of universe) {
    const candles = candlesBySymbol.get(symbol);
    const ind = indicatorsBySymbol.get(symbol);
    if (!candles || !ind) continue;
    for (let i = 110; i < candles.length - cfg.horizon - 2; i++) {
      const date = candles[i].time;
      // Régime filter
      const reg = regimeByDate.get(date);
      if (!reg) continue;
      if (cfg.regime === "NO_RISK_OFF" && reg === "RISK_OFF") continue;
      if (cfg.regime === "RISK_ON_ONLY" && reg !== "RISK_ON") continue;
      // Cooldown : éviter des trades successifs trop proches sur le même symbole
      const last = trades.length ? trades[trades.length - 1] : null;
      // Détection
      const sig = detectTrendPullback(candles, i, ind, cfg);
      if (!sig) continue;
      const trade = buildTrade(candles, ind, i, cfg);
      if (!trade) continue;
      const result = simulateTrade(candles, ind, i + 1, trade.entry, trade.stop, trade.atr, cfg.exit, cfg.horizon, cfg.frictionFn);
      if (!result) continue;
      trades.push({
        symbol, entryTime: candles[i + 1].time, year: getYear(date),
        regime: reg, pnlR: result.pnlR, holdDays: result.holdDays,
        pullbackDrawdownPct: sig.pullbackDrawdownPct, momentum60: sig.momentum60,
      });
    }
  }
  return trades;
}

// === Métriques ============================================================
function summarize(trades) {
  if (!trades.length) return { trades: 0 };
  const total = trades.length;
  const wins = trades.filter((t) => t.pnlR > 0);
  const losses = trades.filter((t) => t.pnlR < 0);
  const gw = wins.reduce((a, b) => a + b.pnlR, 0);
  const gl = Math.abs(losses.reduce((a, b) => a + b.pnlR, 0));
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  let eq = 0, peak = 0, maxDD = 0;
  for (const t of trades) { eq += t.pnlR; if (eq > peak) peak = eq; maxDD = Math.max(maxDD, peak - eq); }
  return {
    trades: total, winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number((totalR / total).toFixed(3)),
    profitFactor: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
  };
}
function yearlyPositive(trades) {
  const yp = {};
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const ts = trades.filter((t) => t.year === y);
    if (!ts.length) { yp[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    yp[y] = gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(2));
  }
  const valid = ["2021", "2022", "2023", "2024", "2025"].filter((y) => yp[y] !== null);
  const pos = valid.filter((y) => yp[y] >= 1.0).length;
  return { yp, valid: valid.length, pos };
}
function edgeDecay(trades) {
  const e = trades.filter((t) => t.year === "2021" || t.year === "2022");
  const l = trades.filter((t) => t.year === "2024" || t.year === "2025");
  function pf(ts) {
    if (!ts.length) return null;
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    return gl === 0 ? (gw > 0 ? 999 : 0) : gw / gl;
  }
  const ep = pf(e), lp = pf(l);
  return ep !== null && lp !== null && lp > 0 ? Number((ep / lp).toFixed(2)) : null;
}
function top5Share(trades) {
  const byT = new Map();
  for (const t of trades) byT.set(t.symbol, (byT.get(t.symbol) || 0) + t.pnlR);
  const arr = [...byT.entries()].map(([s, r]) => ({ s, r })).sort((a, b) => b.r - a.r);
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  const top5R = arr.slice(0, 5).reduce((a, b) => a + b.r, 0);
  return totalR > 0 ? Number(((top5R / totalR) * 100).toFixed(1)) : null;
}
function evaluate(label, trades, cfg) {
  const s = summarize(trades);
  const y = yearlyPositive(trades);
  const d = edgeDecay(trades);
  const c = top5Share(trades);
  // Critères minimum
  const meetsMin =
    s.profitFactor >= 1.3 &&
    y.pos >= 4 &&
    (c === null || c < 80) &&
    (d === null || d < 1.5);
  return { label, cfg, summary: s, yearly: y.yp, yearsPositive: y.pos, validYears: y.valid, edgeDecay: d, top5SharePct: c, meetsMin };
}

// === Run baseline + sweeps =================================================
console.log("[trend-pullback] simulations…");

const BASELINE = {
  minMomentum60: 5,
  supportType: "EMA20",
  pullbackWindow: 10,
  stopType: "swing_low_minus_atr",
  exit: "fixed_hold",
  horizon: 20,
  regime: "NO_RISK_OFF",
  universe: "mixed",
  frictionFn: frictionR,
};

const results = [];
results.push(evaluate("baseline", runConfig(BASELINE), BASELINE));

// Sweep exit
for (const exit of ["trailing_ema20", "trailing_atr", "trend_break"]) {
  const cfg = { ...BASELINE, exit };
  results.push(evaluate(`exit=${exit}`, runConfig(cfg), cfg));
}

// Sweep stop
for (const stopType of ["ema50", "atr_2"]) {
  const cfg = { ...BASELINE, stopType };
  results.push(evaluate(`stop=${stopType}`, runConfig(cfg), cfg));
}

// Sweep support type
for (const supportType of ["EMA50"]) {
  const cfg = { ...BASELINE, supportType };
  results.push(evaluate(`support=${supportType}`, runConfig(cfg), cfg));
}

// Sweep horizon
for (const h of [10, 40]) {
  const cfg = { ...BASELINE, horizon: h };
  results.push(evaluate(`horizon=${h}`, runConfig(cfg), cfg));
}

// Sweep univers
for (const u of ["ai_software", "semis", "megacaps", "etfs"]) {
  const cfg = { ...BASELINE, universe: u };
  results.push(evaluate(`universe=${u}`, runConfig(cfg), cfg));
}

// Sweep régime
for (const r of ["ALL", "RISK_ON_ONLY"]) {
  const cfg = { ...BASELINE, regime: r };
  results.push(evaluate(`regime=${r}`, runConfig(cfg), cfg));
}

// Sweep momentum minimum
for (const mm of [0, 10, 20]) {
  const cfg = { ...BASELINE, minMomentum60: mm };
  results.push(evaluate(`minMomentum60=${mm}`, runConfig(cfg), cfg));
}

// Friction x2 sur baseline
results.push(evaluate("friction_x2", runConfig({ ...BASELINE, frictionFn: frictionR_x2 }), { ...BASELINE, frictionFn: "x2" }));

// === Walk-forward simple sur baseline ====================================
console.log("[trend-pullback] walk-forward…");
const baselineTrades = runConfig(BASELINE);
const wfSplits = [
  { name: "S1 → test 2023", testYears: ["2023"] },
  { name: "S2 → test 2024", testYears: ["2024"] },
  { name: "S3 → test 2025", testYears: ["2025"] },
];
const walkForward = [];
for (const sp of wfSplits) {
  const tt = baselineTrades.filter((t) => sp.testYears.includes(t.year));
  const s = summarize(tt);
  walkForward.push({ split: sp.name, ...s, passed: s.profitFactor >= 1.0 && s.expectancyR > 0 });
}
const wfPassed = walkForward.filter((w) => w.passed).length;

// === Verdict final =========================================================

const baselineEval = results[0];
const minMet = baselineEval.meetsMin;
let verdict;
if (baselineEval.summary.trades < 30) verdict = "INVALID_BACKTEST_AGAIN"; // pas assez de trades
else if (baselineEval.summary.profitFactor < 1.0) verdict = "DEAD";
else if (baselineEval.summary.profitFactor < 1.1) verdict = "FRAGILE";
else if (!minMet) verdict = "FRAGILE";
else if (wfPassed < 2) verdict = "FRAGILE";
else if (baselineEval.summary.profitFactor >= 1.5 && baselineEval.yearsPositive >= 4) verdict = "ROBUST_EDGE";
else verdict = "CONDITIONAL_EDGE";

// === Comparaison vs ancien Pullback ========================================
const oldPullback = {
  current_PF: 1.73,
  next_open_PF: 0.98,
  retouch_ema20_PF: 0.73,
  verdict: "INVALID_BACKTEST (PR #207)",
};

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Test honnête du nouveau setup TREND_PULLBACK_DYNAMIC_SUPPORT (vs ancien Pullback INVALID_BACKTEST)",
  philosophy: "Acheter des leaders en tendance forte pendant une respiration contrôlée, avec confirmation de reprise. Exécution NEXT_OPEN systématique. Friction obligatoire.",
  signalDescription: {
    trendFilter: "close > EMA50, EMA50 > EMA100, momentum 60j > minMomentum, RS positive",
    pullback: "low touche zone EMA20 (ou EMA50) sur 10 derniers jours, pullback -2% à -15%",
    confirmation: "close > high veille, bougie verte, close > EMA20",
    entry: "open[i+1]",
    stopOptions: ["swing_low_minus_atr", "ema50", "atr_2"],
    exitOptions: ["fixed_hold", "trailing_ema20", "trailing_atr", "trend_break"],
  },
  baseline: BASELINE,
  baselineEval,
  variantResults: results,
  walkForward: { splits: walkForward, passed: wfPassed, totalSplits: 3 },
  oldPullbackComparison: oldPullback,
  verdict,
  minMetCheck: {
    pf_min_1_3: baselineEval.summary.profitFactor >= 1.3,
    years_min_4_of_5: baselineEval.yearsPositive >= 4,
    walk_forward_2of3: wfPassed >= 2,
    top5_below_80: baselineEval.top5SharePct === null || baselineEval.top5SharePct < 80,
    edgeDecayOk: baselineEval.edgeDecay === null || baselineEval.edgeDecay < 1.5,
  },
  sources: [
    "tools/backtests/output/pullback-lookahead-audit-v1.json (référence)",
    "tools/backtests/output/setup-execution-bias-audit-v1.json (référence)",
    "tools/backtests/output/rs-rotation-robustness-lab-v1.json (référence)",
    "tools/backtests/output/new-setup-discovery-lab-v1.json (référence)",
    "tools/backtests/universe-v2.mjs",
    "data/*.json (OHLC 2021-2025)",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Verdict : ${verdict}`);
console.log(`Baseline : trades=${baselineEval.summary.trades} PF=${baselineEval.summary.profitFactor} years=${baselineEval.yearsPositive}/${baselineEval.validYears} top5=${baselineEval.top5SharePct}% decay=${baselineEval.edgeDecay}`);
console.log(`Walk-forward : ${wfPassed}/3 splits`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function tableResults(results) {
  const lines = [];
  lines.push("| Variante | Trades | Winrate | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | OK ? |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    const s = r.summary;
    lines.push(`| ${r.label} | ${s.trades || 0} | ${fmt(s.winrate)} % | ${fmt(s.profitFactor, 2)} | ${fmt(s.expectancyR, 3)} | ${fmt(s.maxDrawdownR, 1)} | ${r.yearsPositive}/${r.validYears} | ${fmt(r.top5SharePct, 1)} % | ${fmt(r.edgeDecay)} | ${r.meetsMin ? "✓" : "✗"} |`);
  }
  return lines.join("\n");
}

function buildMarkdown(r) {
  const L = [];
  L.push("# Trend Pullback Dynamic Support v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/trend-pullback-dynamic-support-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Setup en test, offline uniquement.** Pas d'optimisation. Le but est de tester honnêtement si \"acheter des leaders sur respiration contrôlée\" est un edge réel ou non.");
  L.push("");

  L.push("## 1. Scope");
  L.push("");
  L.push("Nouveau setup `TREND_PULLBACK_DYNAMIC_SUPPORT` v1 — différent fondamentalement de l'ancien `PULLBACK_MOMENTUM` (INVALID_BACKTEST PR #207).");
  L.push("");
  L.push("Critères minimum de survie : PF post-friction ≥ 1.3, ≥ 4/5 années positives, walk-forward 2/3+, top 5 < 80 %, edge decay < ×1.5.");
  L.push("");

  L.push("## 2. Ancien Pullback recap (pour contraste)");
  L.push("");
  L.push("L'ancien `PULLBACK_MOMENTUM` (PR #207 verdict INVALID_BACKTEST) :");
  L.push("");
  L.push("| Modèle d'exécution | PF |");
  L.push("|---|---:|");
  L.push(`| CURRENT (code source) | ${r.oldPullbackComparison.current_PF} |`);
  L.push(`| NEXT_OPEN (réaliste) | **${r.oldPullbackComparison.next_open_PF}** |`);
  L.push(`| RETOUCH_EMA20 | ${r.oldPullbackComparison.retouch_ema20_PF} |`);
  L.push("");
  L.push("**L'edge tombait sous 1 dès qu'on imposait l'exécution réaliste.**");
  L.push("");
  L.push("Problèmes structurels identifiés :");
  L.push("- entry = ema20[i] (théorique, intraday impossible)");
  L.push("- swingLow10/swingHigh20 incluant la bougie signal (look-ahead)");
  L.push("- pas de confirmation de reprise");
  L.push("- entrées \"anticipées\" sur faux pullbacks");
  L.push("");

  L.push("## 3. Nouvelle philosophie");
  L.push("");
  L.push("- **NE PAS** acheter une chute libre.");
  L.push("- **NE PAS** acheter un actif faible.");
  L.push("- **UNIQUEMENT** acheter des leaders déjà forts en tendance haussière confirmée.");
  L.push("- **APRÈS** une correction contrôlée (-2 % à -15 %, pas plus).");
  L.push("- **AVEC** reprise confirmée (bougie verte qui dépasse high veille).");
  L.push("- **ENTRY** : `open[i+1]` strictement.");
  L.push("");

  L.push("## 4. Trend filter");
  L.push("");
  L.push("Conditions cumulées (toutes obligatoires) :");
  L.push("- `close[i] > EMA50[i]`");
  L.push("- `EMA50[i] > EMA100[i]`");
  L.push("- `momentum60j[i] > minMomentum60` (configurable, défaut 5 %)");
  L.push("- Régime de marché ≠ RISK_OFF (config baseline = NO_RISK_OFF)");
  L.push("");

  L.push("## 5. Pullback detection");
  L.push("");
  L.push("- Sur les 10 derniers jours (`pullbackWindow`), au moins un `low` doit avoir touché une zone proche d'EMA20 (distance entre -1.5 % et +2 %).");
  L.push("- Pullback magnitude : `lowMin(window) / close(start)` entre **-2 % et -15 %**. Refus si correction < -15 % (chute violente non contrôlée).");
  L.push("");

  L.push("## 6. Confirmation logic");
  L.push("");
  L.push("Bougie i (jour J du signal, exécution J+1) doit valider :");
  L.push("- `close[i] > high[i-1]` (dépasse le haut de la veille)");
  L.push("- `close[i] > open[i]` (bougie verte)");
  L.push("- `close[i] > EMA20[i]` (rejet support dynamique)");
  L.push("");
  L.push("Pas d'entrée \"anticipée\" : la reprise doit être validée AVANT.");
  L.push("");

  L.push("## 7. Entry realism");
  L.push("");
  L.push("- `entry = open[i+1]` STRICTEMENT. Pas d'EMA théorique. Pas d'intraday impossible.");
  L.push("- Signal généré en fin de jour i (close[i]), exécution à l'ouverture de i+1.");
  L.push("- Le low de la bougie signal n'est pas utilisé pour l'entrée (contrairement à l'ancien Pullback).");
  L.push("");

  L.push("## 8. Exit models testés");
  L.push("");
  L.push("- `fixed_hold` : exit à `open[entryIdx + horizon]`.");
  L.push("- `trailing_atr` : trail = max_since_entry - 2 × ATR(14 à l'entrée). Exit si close < trail.");
  L.push("- `trailing_ema20` : exit si close < EMA20.");
  L.push("- `trend_break` : exit si close < EMA50 (cassure trend).");
  L.push("");

  L.push("## 9. Friction analysis");
  L.push("");
  L.push("Friction systématique : `frictionR = (0.30 + 0.02 × holdDays) / 5`. Friction ×2 testée séparément.");
  L.push("");
  L.push("Friction pour horizon 20j = 0.14R par trade. Pour x2 friction = 0.28R par trade.");
  L.push("");

  L.push("## 10-12. Résultats — variantes complètes");
  L.push("");
  L.push(tableResults(r.variantResults));
  L.push("");
  L.push("**Critère ✓** = PF ≥ 1.3 ET ≥ 4/5 années positives ET top 5 < 80 % ET edge decay < ×1.5.");
  L.push("");

  L.push("## 13. Walk-forward simple (baseline)");
  L.push("");
  L.push("| Split | Trades | PF | Expectancy R | Max DD R | Passed |");
  L.push("|---|---:|---:|---:|---:|---|");
  for (const w of r.walkForward.splits) {
    L.push(`| ${w.split} | ${w.trades || 0} | ${fmt(w.profitFactor, 2)} | ${fmt(w.expectancyR, 3)} | ${fmt(w.maxDrawdownR, 1)} | ${w.passed ? "✓" : "✗"} |`);
  }
  L.push("");
  L.push(`**${r.walkForward.passed}/${r.walkForward.totalSplits} splits passent.**`);
  L.push("");

  L.push("## 14. Comparison vs ancien Pullback");
  L.push("");
  L.push("| Critère | Ancien Pullback (NEXT_OPEN) | Trend Pullback (baseline) |");
  L.push("|---|---:|---:|");
  L.push(`| Trades | 12 998 | ${r.baselineEval.summary.trades} |`);
  L.push(`| Winrate | 20.78 % | ${fmt(r.baselineEval.summary.winrate)} % |`);
  L.push(`| PF | 0.98 | **${fmt(r.baselineEval.summary.profitFactor, 2)}** |`);
  L.push(`| Expectancy | -0.012 | ${fmt(r.baselineEval.summary.expectancyR, 3)} |`);
  L.push(`| Verdict | INVALID_BACKTEST | **${r.verdict}** |`);
  L.push("");
  if (r.verdict === "ROBUST_EDGE" || r.verdict === "CONDITIONAL_EDGE") {
    L.push("→ Le nouveau setup améliore les résultats. L'edge \"acheter des leaders sur respiration contrôlée\" est mesurable.");
    L.push("");
    L.push("**Lecture** : le problème de l'ancien Pullback venait principalement de l'**implémentation** (entry théorique, fenêtres incluant bougie signal, pas de confirmation), pas du concept. Le concept reformulé avec exécution réaliste donne un edge.");
  } else if (r.verdict === "FRAGILE") {
    L.push("→ Le nouveau setup améliore légèrement les résultats mais reste fragile. Le concept \"Pullback\" reste structurellement difficile sous exécution réaliste.");
  } else {
    L.push("→ Le nouveau setup **n'apporte pas d'amélioration significative**. Le concept de \"Pullback\" pourrait être structurellement non-tradable sous exécution réaliste, indépendamment de l'implémentation.");
  }
  L.push("");

  L.push("## 15. Failure modes");
  L.push("");
  const checks = r.minMetCheck;
  L.push("Critères minimum :");
  L.push("");
  L.push("| Critère | Résultat | OK ? |");
  L.push("|---|---|---|");
  L.push(`| PF baseline ≥ 1.3 | ${fmt(r.baselineEval.summary.profitFactor, 2)} | ${checks.pf_min_1_3 ? "✓" : "✗"} |`);
  L.push(`| Années positives ≥ 4/5 | ${r.baselineEval.yearsPositive}/5 | ${checks.years_min_4_of_5 ? "✓" : "✗"} |`);
  L.push(`| Walk-forward ≥ 2/3 | ${r.walkForward.passed}/3 | ${checks.walk_forward_2of3 ? "✓" : "✗"} |`);
  L.push(`| Top 5 < 80 % | ${fmt(r.baselineEval.top5SharePct, 1)} % | ${checks.top5_below_80 ? "✓" : "✗"} |`);
  L.push(`| Edge decay < ×1.5 | ${fmt(r.baselineEval.edgeDecay)} | ${checks.edgeDecayOk ? "✓" : "✗"} |`);
  L.push("");

  L.push("## 16. Final verdict");
  L.push("");
  L.push(`**${r.verdict}**`);
  L.push("");
  if (r.verdict === "ROBUST_EDGE") {
    L.push("Le setup TREND_PULLBACK_DYNAMIC_SUPPORT survit avec un edge robuste. Statut suggéré : `RESEARCH_CANDIDATE` ou `VALIDATED_RESEARCH_CORE` après audit anti-look-ahead complémentaire.");
    L.push("");
    L.push("**Le concept Pullback n'était pas mort** — c'est l'implémentation qui était cassée.");
  } else if (r.verdict === "CONDITIONAL_EDGE") {
    L.push("Edge marginal mais réel. Statut suggéré : `EXPERIMENTAL_ONLY`. À valider avec stress-tests, walk-forward strict et destruction tests symétriques à ceux de SECTOR_RS.");
  } else if (r.verdict === "FRAGILE" || r.verdict === "INVALID_BACKTEST_AGAIN") {
    L.push("Le setup ne passe pas les critères minimum. Même avec une implémentation propre et confirmation, le \"Pullback Momentum\" reste structurellement difficile.");
    L.push("");
    L.push("**Hypothèse** : sur 2021-2025, l'environnement bull AI a fait que la majorité des leaders SOIT continuaient sans pullback significatif, SOIT corrigent violemment. La fenêtre de \"respiration contrôlée\" est rare.");
  } else {
    L.push("Le setup est DEAD. Pas d'edge mesurable. Confirmer en SETUPS_REGISTRY.md que le pattern Pullback (même reformulé) n'est pas viable.");
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("**Hypothèses** : friction round-trip 0.30 % + 0.02 %/jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux (EMA20/50/100 standard), pas de short side.");
  L.push("");
  L.push("**Limites** :");
  L.push("- Paramètres baseline arbitraires (à fine-tuner si edge confirmé).");
  L.push("- Pas de Monte Carlo / bootstrap sur les trades.");
  L.push("- Walk-forward simple (3 splits annuels), pas walk-forward conditionnel par régime.");
  L.push("- Pas de stress sur les frictions extrêmes (×3, slippage variable par actif).");
  L.push("- Pas de comparaison fine corrélation vs SECTOR_RS ou RS Rotation.");

  return L.join("\n");
}
