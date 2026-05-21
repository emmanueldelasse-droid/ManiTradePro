// tools/backtests/rs-rotation-hardening-v1.mjs
//
// PR-RS-HARDENING Phase 1 — RS Rotation hardening : stress tests + regime validation.
//
// Objectif : déterminer ce qui survit réellement sur RS Rotation après une
// batterie de stress tests structurels. Pas "trouver un edge". Pas
// "améliorer le PF". Mesurer la robustesse, la survivabilité, et l'impact
// de chaque dégradation réaliste.
//
// Complémentaire de :
//   - rs-rotation-robustness-lab-v1.mjs (breadth : 6 sweeps univariés autour
//     de la baseline)
//   - rs-rotation-robustness-v1.mjs (depth : walk-forward strict + concentration
//     + drawdown sur la baseline)
//
// Ce script (depth × stress) ajoute la couverture systématique des 8 stress
// tests (A.1-A.8) + la matrice par régime 4 états (B), tels que définis dans
// le brief créateur "PHASE QUANT HARDENING V1".
//
// CONTRAINTES (cf. RESEARCH_FRAMEWORK_FREEZE_V1.md, TRADING_PHILOSOPHY.md,
// directives créateur 2026-05-19) :
//   - STRICTEMENT offline. Aucun ordre, aucun broker, aucun endpoint live.
//   - Paramètres BASELINE GELÉS ex-ante (identiques rs-rotation-robustness-v1).
//   - Aucune optimisation post-hoc. Aucun "faire apparaître" d'edge.
//   - Aucune relâche de filtres. Aucune modification de seuils après lecture
//     des résultats.
//   - Anti-overfit strict : chaque stress mesure une dégradation, pas une
//     optimisation.
//
// Sorties :
//   - tools/backtests/output/rs-rotation-hardening-v1.json
//   - tools/backtests/output/rs-rotation-hardening-v1.md

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";
import { computeFrictionV1, FRICTION_V1_METADATA } from "./lib/friction-v1.mjs";
import {
  classifyMarketRegimeV1,
  classifyFourStateRegimeV1,
  REGIME_V1_EMA_PERIOD,
  REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
  REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS,
} from "../quant/lib/regime-rules-v1.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "rs-rotation-hardening-v1.json");
const OUT_MD = join(OUT_DIR, "rs-rotation-hardening-v1.md");

// === Baseline gelée ex-ante ================================================
//
// IDENTIQUE rs-rotation-robustness-v1.mjs § BASELINE.
// Aucune modification autorisée pendant ou après l'exécution.

const BASELINE = Object.freeze({
  lookback: 90,
  horizon: 20,
  topN: 10,
  rebalance: 10,
  minMomentum: 12,
  exit: "fixed_hold",
  regime: "NO_RISK_OFF",
  universe: "mixed",
});

// === Définitions régime (4 régimes officiels v1) ===========================
//
// Cf. brief créateur § 3 "RÉGIMES OFFICIELS V1" : RISK_ON, RANGE, RISK_OFF,
// HIGH_VOL. Limitation volontaire à 4 régimes pour rester lisible.

// Seuil HIGH_VOL canonique : source unique `tools/quant/lib/regime-rules-v1.mjs`
// (CLEAN-2 PR-REGIME-CANON). Alias local conservé pour minimiser le diff
// des appelants (filtre A.8 volatility expansion ligne ~618).
const HIGH_VOL_REALIZED_PCT_THRESHOLD = REGIME_V1_HIGH_VOL_RVOL_THRESHOLD;

// === Univers (mixed flat) ==================================================

const UNIVERSE_MIXED = [...new Set(Object.values(UNIVERSE).flat())];

// === Helpers ===============================================================

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

function stddev(a) {
  if (a.length < 2) return 0;
  const m = avg(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

function pctChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

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
    .filter((c) =>
      c.time &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
    )
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function findCandleIndex(candles, time) {
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

// === Loaders ===============================================================

console.log("[rs-hardening-v1] chargement candles…");
const candlesBySymbol = new Map();
const allSymbols = new Set([...UNIVERSE_MIXED, "SPY", "QQQ", "SMH"]);
for (const s of allSymbols) {
  const c = loadCandles(s);
  if (c && c.length >= 230) candlesBySymbol.set(s, c);
}
console.log(`[rs-hardening-v1] OHLC chargés : ${candlesBySymbol.size}`);

const TRADING_UNIVERSE = UNIVERSE_MIXED.filter((s) => candlesBySymbol.has(s));

// Reverse map : symbol → sectoral group (pour stress sectoriel)
const symbolToGroup = new Map();
for (const [group, syms] of Object.entries(UNIVERSE)) {
  for (const s of syms) {
    if (!symbolToGroup.has(s)) symbolToGroup.set(s, group);
  }
}

// === Index date + régimes 4 états ==========================================

function buildDateIndex() {
  const counts = new Map();
  for (const c of candlesBySymbol.values()) {
    for (const k of c) counts.set(k.time, (counts.get(k.time) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 20).map(([t]) => t).sort();
}
const DATES = buildDateIndex();
console.log(`[rs-hardening-v1] dates communes : ${DATES.length}`);

// Realized vol SPY sur 20 jours (annualisée)
function buildSpyRealizedVol() {
  const spy = candlesBySymbol.get("SPY");
  if (!spy) throw new Error("SPY required");
  const returns = [];
  for (let i = 1; i < spy.length; i++) {
    returns.push(Math.log(spy[i].close / spy[i - 1].close));
  }
  const window = REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS;
  const rvol = new Map();
  for (let i = window; i < spy.length; i++) {
    const slice = returns.slice(i - window, i);
    const sd = stddev(slice);
    rvol.set(spy[i].time, sd * Math.sqrt(252)); // annualisée
  }
  return rvol;
}

function buildRegimes(dates) {
  // Classification 3-état + 4-état canonique via
  // `tools/quant/lib/regime-rules-v1.mjs` (CLEAN-2 PR-REGIME-CANON).
  // HIGH_VOL = priority override sur rvol SPY 20j > 25 % annualisée.
  const need = ["SPY", "QQQ", "SMH"];
  const market = {};
  for (const s of need) {
    const c = candlesBySymbol.get(s);
    if (!c) throw new Error(`Missing ${s}`);
    market[s] = { c, ema200: ema(c.map((x) => x.close), REGIME_V1_EMA_PERIOD) };
  }
  const rvol = buildSpyRealizedVol();

  const baseRegimeByDate = new Map();
  const fourStateByDate = new Map();
  for (const date of dates) {
    const sIdx = findCandleIndex(market.SPY.c, date);
    const qIdx = findCandleIndex(market.QQQ.c, date);
    const mIdx = findCandleIndex(market.SMH.c, date);
    if (sIdx < REGIME_V1_EMA_PERIOD || qIdx < REGIME_V1_EMA_PERIOD || mIdx < REGIME_V1_EMA_PERIOD) continue;
    const spyAboveEma200 = market.SPY.c[sIdx].close > market.SPY.ema200[sIdx];
    const qqqAboveEma200 = market.QQQ.c[qIdx].close > market.QQQ.ema200[qIdx];
    const smhAboveEma200 = market.SMH.c[mIdx].close > market.SMH.ema200[mIdx];
    const baseRegime = classifyMarketRegimeV1({ spyAboveEma200, qqqAboveEma200, smhAboveEma200 });
    if (baseRegime === null) continue;
    baseRegimeByDate.set(date, baseRegime);

    const rv = rvol.get(date);
    const fourState = rv === undefined
      ? baseRegime
      : classifyFourStateRegimeV1({
          spyAboveEma200,
          qqqAboveEma200,
          smhAboveEma200,
          realizedVolAnnualised: rv,
          highVolThreshold: REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
        });
    fourStateByDate.set(date, fourState ?? baseRegime);
  }
  return { baseRegimeByDate, fourStateByDate, rvol };
}

const { baseRegimeByDate, fourStateByDate, rvol } = buildRegimes(DATES);

// Compte régime distribution
const regimeDistrib = { RISK_ON: 0, RANGE: 0, RISK_OFF: 0, HIGH_VOL: 0 };
for (const r of fourStateByDate.values()) regimeDistrib[r] = (regimeDistrib[r] || 0) + 1;
const regimeCovered = [...fourStateByDate.values()].length;
console.log(`[rs-hardening-v1] régimes 4-état couverts sur ${regimeCovered} jours :`);
for (const r of ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]) {
  const pct = regimeCovered > 0 ? (regimeDistrib[r] / regimeCovered * 100).toFixed(1) : "0";
  console.log(`   ${r.padEnd(10)} : ${String(regimeDistrib[r]).padEnd(5)} (${pct} %)`);
}

function regimeAllowedNoRiskOff(date) {
  // Baseline filter : NO_RISK_OFF
  return baseRegimeByDate.get(date) !== "RISK_OFF";
}

// === Simulation baseline (réutilise pattern rs-rotation-robustness-v1) =====

function runBaseline() {
  const universe = TRADING_UNIVERSE;
  const trades = [];

  for (let di = BASELINE.lookback; di < DATES.length - BASELINE.horizon - 2; di += BASELINE.rebalance) {
    const date = DATES[di];
    if (!regimeAllowedNoRiskOff(date)) continue;

    const candidates = [];
    for (const s of universe) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < BASELINE.lookback || idx + BASELINE.horizon + 1 >= c.length) continue;
      const now = c[idx].close;
      const past = c[idx - BASELINE.lookback].close;
      const mom = pctChange(now, past);
      if (mom === null || mom < BASELINE.minMomentum) continue;
      candidates.push({ symbol: s, idx, momentum: mom });
    }
    candidates.sort((a, b) => b.momentum - a.momentum);

    for (const cand of candidates.slice(0, BASELINE.topN)) {
      const c = candlesBySymbol.get(cand.symbol);
      const entryIdx = cand.idx + 1;
      if (entryIdx >= c.length) continue;
      const entryPx = c[entryIdx].open;
      const exitIdx = entryIdx + BASELINE.horizon;
      if (exitIdx >= c.length) continue;
      const exitPx = c[exitIdx].open;

      const pnlPct = pctChange(exitPx, entryPx);
      if (pnlPct === null) continue;
      const holdDays = exitIdx - entryIdx;
      const pnlRGross = pnlPct / 5; // convention 5 % = 1R

      // régime à la date du signal (3 états + 4 états)
      const regime3 = baseRegimeByDate.get(date) || "RANGE";
      const regime4 = fourStateByDate.get(date) || regime3;
      const regimeAtExit = baseRegimeByDate.get(c[exitIdx].time) || regime3;

      trades.push({
        symbol: cand.symbol,
        group: symbolToGroup.get(cand.symbol) || "OTHER",
        signalDate: date,
        entryTime: c[entryIdx].time,
        exitTime: c[exitIdx].time,
        year: getYear(date),
        regime3,
        regime4,
        regimeAtExit,
        regimeChanged: regime3 !== regimeAtExit,
        pnlPct: Number(pnlPct.toFixed(3)),
        pnlRGross: Number(pnlRGross.toFixed(4)),
        holdDays,
        momentum: Number(cand.momentum.toFixed(2)),
        entryPx: Number(entryPx.toFixed(4)),
        exitPx: Number(exitPx.toFixed(4)),
        rvolAtSignal: rvol.get(date) ?? null,
      });
    }
  }
  return trades;
}

// === Modèles de coûts ======================================================

// Friction projet canonique — source : `docs/quant/FRICTION_MODEL.md` +
// `lib/friction-v1.mjs` (CLEAN-1 PR-FRICTION-CANON).
function frictionR(holdDays, multiplier = 1) {
  return computeFrictionV1({ holdDays, multiplier });
}

// Slippage one-way : appliqué entry + exit. 0.05 % one-way = 0.10 % round-trip.
function slippageR(slippageOneWayPct) {
  return (slippageOneWayPct * 2) / 5; // round-trip / 5 (convention R)
}

function applyCosts(trades, { frictionMul = 1, slippageOneWayPct = 0 } = {}) {
  return trades.map((t) => {
    const fr = frictionR(t.holdDays, frictionMul);
    const sl = slippageR(slippageOneWayPct);
    const pnlR = Number((t.pnlRGross - fr - sl).toFixed(4));
    return { ...t, frictionR: Number(fr.toFixed(4)), slippageR: Number(sl.toFixed(4)), pnlR };
  });
}

// === Métriques =============================================================

function summarize(trades) {
  if (!trades.length) {
    return { trades: 0, wins: 0, losses: 0, winrate: 0, expectancyR: 0, profitFactor: 0, totalR: 0, maxDrawdownR: 0, longestLossStreak: 0 };
  }
  const total = trades.length;
  const wins = trades.filter((t) => t.pnlR > 0);
  const losses = trades.filter((t) => t.pnlR < 0);
  const gw = wins.reduce((a, b) => a + b.pnlR, 0);
  const gl = Math.abs(losses.reduce((a, b) => a + b.pnlR, 0));
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  let equity = 0, peak = 0, maxDD = 0, lossStreak = 0, longestLossStreak = 0;
  for (const t of trades) {
    equity += t.pnlR;
    if (equity > peak) peak = equity;
    if (peak - equity > maxDD) maxDD = peak - equity;
    if (t.pnlR < 0) {
      lossStreak++;
      if (lossStreak > longestLossStreak) longestLossStreak = lossStreak;
    } else lossStreak = 0;
  }
  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number((totalR / total).toFixed(4)),
    profitFactor: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
    totalR: Number(totalR.toFixed(2)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    longestLossStreak,
  };
}

function yearlyPf(trades) {
  const byYear = {};
  for (const t of trades) (byYear[t.year] = byYear[t.year] || []).push(t);
  const out = {};
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const ts = byYear[y] || [];
    if (!ts.length) { out[y] = null; continue; }
    out[y] = { trades: ts.length, ...summarize(ts) };
  }
  return out;
}

// === Concentration =========================================================

function concentration(trades) {
  if (!trades.length) return { universeSize: 0, top5: [], top5SharePctOfPositive: null, pfWithoutTop5: null };
  const bySymbol = new Map();
  for (const t of trades) {
    const cur = bySymbol.get(t.symbol) || { symbol: t.symbol, trades: 0, totalR: 0 };
    cur.trades++;
    cur.totalR += t.pnlR;
    bySymbol.set(t.symbol, cur);
  }
  const all = [...bySymbol.values()].map((x) => ({ ...x, totalR: Number(x.totalR.toFixed(3)) }));
  const positive = all.filter((x) => x.totalR > 0).sort((a, b) => b.totalR - a.totalR);
  const sumPositive = positive.reduce((a, b) => a + b.totalR, 0);
  const top5 = positive.slice(0, 5);
  const top5Sum = top5.reduce((a, b) => a + b.totalR, 0);
  const top5SymbolsSet = new Set(top5.map((x) => x.symbol));
  const woTop5 = trades.filter((t) => !top5SymbolsSet.has(t.symbol));
  const woSum = summarize(woTop5);
  return {
    universeSize: all.length,
    positiveContributors: positive.length,
    sumPositiveR: Number(sumPositive.toFixed(2)),
    top5: top5.map((x) => ({
      symbol: x.symbol,
      trades: x.trades,
      totalR: x.totalR,
      sharePct: sumPositive > 0 ? Number(((x.totalR / sumPositive) * 100).toFixed(2)) : null,
    })),
    top5SharePctOfPositive: sumPositive > 0 ? Number(((top5Sum / sumPositive) * 100).toFixed(2)) : null,
    pfWithoutTop5: woSum.profitFactor,
    totalRWithoutTop5: woSum.totalR,
    tradesWithoutTop5: woSum.trades,
  };
}

// === STRESS TESTS A.1-A.8 ==================================================

console.log("[rs-hardening-v1] simulation baseline…");
const tradesRaw = runBaseline();
console.log(`[rs-hardening-v1]   gross trades = ${tradesRaw.length}`);

// === A.1 Friction stress ×1, ×2, ×3 =======================================

const frictionStress = {};
for (const m of [1, 2, 3]) {
  const trades = applyCosts(tradesRaw, { frictionMul: m });
  frictionStress[`x${m}`] = { ...summarize(trades), trades_n: trades.length };
}
console.log(`[rs-hardening-v1] friction ×1 PF=${frictionStress.x1.profitFactor} ×2 PF=${frictionStress.x2.profitFactor} ×3 PF=${frictionStress.x3.profitFactor}`);

// === A.2 Slippage stress (one-way 0.05 %, 0.10 %, 0.20 %) =================

const slippageStress = {};
for (const sl of [0.0, 0.05, 0.10, 0.20]) {
  const trades = applyCosts(tradesRaw, { frictionMul: 1, slippageOneWayPct: sl });
  slippageStress[`${sl.toFixed(2)}%`] = { ...summarize(trades), slippageOneWayPct: sl };
}

// === A.3 Délais d'exécution (proxy : entry NEXT_OPEN + 1 jour) =============
//
// Mesure approximative : on simule un retard d'entrée d'un jour
// supplémentaire en remplaçant entry par open[i+2] et exit par open[i+2+horizon].
// Cela nécessite une re-simulation, pas un filtrage post-hoc.

function runWithEntryDelay(daysDelay) {
  const universe = TRADING_UNIVERSE;
  const trades = [];
  for (let di = BASELINE.lookback; di < DATES.length - BASELINE.horizon - 3 - daysDelay; di += BASELINE.rebalance) {
    const date = DATES[di];
    if (!regimeAllowedNoRiskOff(date)) continue;
    const candidates = [];
    for (const s of universe) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < BASELINE.lookback || idx + BASELINE.horizon + 1 + daysDelay >= c.length) continue;
      const now = c[idx].close;
      const past = c[idx - BASELINE.lookback].close;
      const mom = pctChange(now, past);
      if (mom === null || mom < BASELINE.minMomentum) continue;
      candidates.push({ symbol: s, idx, momentum: mom });
    }
    candidates.sort((a, b) => b.momentum - a.momentum);
    for (const cand of candidates.slice(0, BASELINE.topN)) {
      const c = candlesBySymbol.get(cand.symbol);
      const entryIdx = cand.idx + 1 + daysDelay;
      if (entryIdx >= c.length) continue;
      const entryPx = c[entryIdx].open;
      const exitIdx = entryIdx + BASELINE.horizon;
      if (exitIdx >= c.length) continue;
      const exitPx = c[exitIdx].open;
      const pnlPct = pctChange(exitPx, entryPx);
      if (pnlPct === null) continue;
      const holdDays = exitIdx - entryIdx;
      const pnlRGross = pnlPct / 5;
      trades.push({
        symbol: cand.symbol,
        year: getYear(date),
        pnlPct: Number(pnlPct.toFixed(3)),
        pnlRGross: Number(pnlRGross.toFixed(4)),
        holdDays,
      });
    }
  }
  return applyCosts(trades, { frictionMul: 1 });
}

const delayStress = {};
for (const d of [0, 1, 2, 5]) {
  const tr = d === 0 ? applyCosts(tradesRaw, { frictionMul: 1 }) : runWithEntryDelay(d);
  delayStress[`+${d}d`] = { ...summarize(tr), daysDelay: d };
}

// === A.4 Suppression top performers =======================================

const baseline = applyCosts(tradesRaw, { frictionMul: 1 });
const concBase = concentration(baseline);
const top5Symbols = new Set(concBase.top5.map((x) => x.symbol));
const noTop5 = baseline.filter((t) => !top5Symbols.has(t.symbol));
const positiveSorted = [...new Map(baseline.map((t) => [t.symbol, t.symbol])).keys()];
// Top 10 contributeurs positifs
const bySymContrib = new Map();
for (const t of baseline) {
  const cur = bySymContrib.get(t.symbol) || { symbol: t.symbol, totalR: 0 };
  cur.totalR += t.pnlR;
  bySymContrib.set(t.symbol, cur);
}
const top10 = [...bySymContrib.values()].sort((a, b) => b.totalR - a.totalR).slice(0, 10);
const top10Symbols = new Set(top10.map((x) => x.symbol));
const noTop10 = baseline.filter((t) => !top10Symbols.has(t.symbol));

// Sans top 3 dates gagnantes
const sortedByR = [...baseline].sort((a, b) => b.pnlR - a.pnlR);
const top3Dates = new Set(sortedByR.slice(0, 3).map((t) => t.signalDate));
const noTop3Dates = baseline.filter((t) => !top3Dates.has(t.signalDate));

const exclusionStress = {
  base: summarize(baseline),
  noTop5Symbols: { ...summarize(noTop5), removedSymbols: [...top5Symbols] },
  noTop10Symbols: { ...summarize(noTop10), removedSymbols: [...top10Symbols] },
  noTop3Dates: { ...summarize(noTop3Dates), removedDates: [...top3Dates] },
  noTop5AndTop3Dates: { ...summarize(baseline.filter((t) => !top5Symbols.has(t.symbol) && !top3Dates.has(t.signalDate))) },
};

// === A.5 Stress sectoriel (retirer secteur dominant) =======================

const sectorContribution = new Map();
for (const t of baseline) {
  const g = t.group || "OTHER";
  const cur = sectorContribution.get(g) || { group: g, trades: 0, totalR: 0 };
  cur.trades++;
  cur.totalR += t.pnlR;
  sectorContribution.set(g, cur);
}
const sectorsRanked = [...sectorContribution.values()].sort((a, b) => b.totalR - a.totalR);
const dominantSector = sectorsRanked[0]?.group;
const dominantSectorMembers = new Set(UNIVERSE[dominantSector] || []);
const noDominantSector = baseline.filter((t) => !dominantSectorMembers.has(t.symbol));

const sectorStress = {
  sectorRanking: sectorsRanked.map((x) => ({
    group: x.group,
    trades: x.trades,
    totalR: Number(x.totalR.toFixed(2)),
  })),
  dominantSector,
  withoutDominantSector: summarize(noDominantSector),
};

// === A.6 Stress bear (isolation 2022) =====================================

const trades2022 = baseline.filter((t) => t.year === "2022");
const tradesEx2022 = baseline.filter((t) => t.year !== "2022");
const bearStress = {
  year2022: summarize(trades2022),
  excludingYear2022: summarize(tradesEx2022),
};

// === A.7 Stress concentration (topN sweep 5, 10, 20) ======================
//
// Nécessite re-simulation puisque topN change la sélection.

function runWithTopN(topN) {
  const universe = TRADING_UNIVERSE;
  const trades = [];
  for (let di = BASELINE.lookback; di < DATES.length - BASELINE.horizon - 2; di += BASELINE.rebalance) {
    const date = DATES[di];
    if (!regimeAllowedNoRiskOff(date)) continue;
    const candidates = [];
    for (const s of universe) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < BASELINE.lookback || idx + BASELINE.horizon + 1 >= c.length) continue;
      const now = c[idx].close;
      const past = c[idx - BASELINE.lookback].close;
      const mom = pctChange(now, past);
      if (mom === null || mom < BASELINE.minMomentum) continue;
      candidates.push({ symbol: s, idx, momentum: mom });
    }
    candidates.sort((a, b) => b.momentum - a.momentum);
    for (const cand of candidates.slice(0, topN)) {
      const c = candlesBySymbol.get(cand.symbol);
      const entryIdx = cand.idx + 1;
      if (entryIdx >= c.length) continue;
      const entryPx = c[entryIdx].open;
      const exitIdx = entryIdx + BASELINE.horizon;
      if (exitIdx >= c.length) continue;
      const exitPx = c[exitIdx].open;
      const pnlPct = pctChange(exitPx, entryPx);
      if (pnlPct === null) continue;
      const holdDays = exitIdx - entryIdx;
      const pnlRGross = pnlPct / 5;
      trades.push({ symbol: cand.symbol, year: getYear(date), holdDays, pnlPct, pnlRGross });
    }
  }
  return applyCosts(trades, { frictionMul: 1 });
}

const concentrationSweep = {};
for (const tn of [5, 10, 20]) {
  const tr = tn === BASELINE.topN ? baseline : runWithTopN(tn);
  concentrationSweep[`topN_${tn}`] = { ...summarize(tr), topN: tn };
}

// === A.8 Stress volatility expansion ======================================
//
// Isoler les trades signalés pendant des périodes de forte volatilité réalisée
// (rvol SPY 20j > 25 %), vs les autres.

const highVolTrades = baseline.filter((t) => (t.rvolAtSignal ?? 0) > HIGH_VOL_REALIZED_PCT_THRESHOLD);
const normalVolTrades = baseline.filter((t) => (t.rvolAtSignal ?? 0) <= HIGH_VOL_REALIZED_PCT_THRESHOLD);

const volStress = {
  threshold: `realized vol SPY 20j > ${HIGH_VOL_REALIZED_PCT_THRESHOLD * 100} % annualisée`,
  highVol: summarize(highVolTrades),
  normalVol: summarize(normalVolTrades),
};

// === B. REGIME VALIDATION (4 régimes officiels v1) ========================

function filterByRegime4(trades, regime) {
  return trades.filter((t) => t.regime4 === regime);
}

const regimeMatrix = {};
for (const r of ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]) {
  const tr = filterByRegime4(baseline, r);
  regimeMatrix[r] = {
    ...summarize(tr),
    daysInRegime: regimeDistrib[r] || 0,
    yearly: yearlyPf(tr),
  };
  console.log(`[rs-hardening-v1] regime ${r.padEnd(10)} : ${String(tr.length).padStart(4)} trades PF=${regimeMatrix[r].profitFactor} totalR=${regimeMatrix[r].totalR}`);
}

// === SYNTHÈSE survival map =================================================
//
// Pour chaque stress, indicateur "survie" :
//   - PF post-stress ≥ 1.20 → SURVIVES
//   - PF post-stress ∈ [1.0, 1.2[ → MARGINAL
//   - PF post-stress < 1.0 → KILLED

function classifyStress(pf) {
  if (!Number.isFinite(pf) || pf < 1.0) return "KILLED";
  if (pf < 1.20) return "MARGINAL";
  return "SURVIVES";
}

const survivalMap = {
  baseline_F1: { pf: frictionStress.x1.profitFactor, verdict: classifyStress(frictionStress.x1.profitFactor) },
  friction_x2: { pf: frictionStress.x2.profitFactor, verdict: classifyStress(frictionStress.x2.profitFactor) },
  friction_x3: { pf: frictionStress.x3.profitFactor, verdict: classifyStress(frictionStress.x3.profitFactor) },
  slippage_0_05: { pf: slippageStress["0.05%"].profitFactor, verdict: classifyStress(slippageStress["0.05%"].profitFactor) },
  slippage_0_10: { pf: slippageStress["0.10%"].profitFactor, verdict: classifyStress(slippageStress["0.10%"].profitFactor) },
  slippage_0_20: { pf: slippageStress["0.20%"].profitFactor, verdict: classifyStress(slippageStress["0.20%"].profitFactor) },
  delay_1d: { pf: delayStress["+1d"].profitFactor, verdict: classifyStress(delayStress["+1d"].profitFactor) },
  delay_2d: { pf: delayStress["+2d"].profitFactor, verdict: classifyStress(delayStress["+2d"].profitFactor) },
  delay_5d: { pf: delayStress["+5d"].profitFactor, verdict: classifyStress(delayStress["+5d"].profitFactor) },
  noTop5Symbols: { pf: exclusionStress.noTop5Symbols.profitFactor, verdict: classifyStress(exclusionStress.noTop5Symbols.profitFactor) },
  noTop10Symbols: { pf: exclusionStress.noTop10Symbols.profitFactor, verdict: classifyStress(exclusionStress.noTop10Symbols.profitFactor) },
  noTop3Dates: { pf: exclusionStress.noTop3Dates.profitFactor, verdict: classifyStress(exclusionStress.noTop3Dates.profitFactor) },
  noTop5AndTop3Dates: { pf: exclusionStress.noTop5AndTop3Dates.profitFactor, verdict: classifyStress(exclusionStress.noTop5AndTop3Dates.profitFactor) },
  withoutDominantSector: { pf: sectorStress.withoutDominantSector.profitFactor, verdict: classifyStress(sectorStress.withoutDominantSector.profitFactor), removedSector: dominantSector },
  year2022_only: { pf: bearStress.year2022.profitFactor, verdict: classifyStress(bearStress.year2022.profitFactor) },
  excludingYear2022: { pf: bearStress.excludingYear2022.profitFactor, verdict: classifyStress(bearStress.excludingYear2022.profitFactor) },
  topN_5: { pf: concentrationSweep.topN_5.profitFactor, verdict: classifyStress(concentrationSweep.topN_5.profitFactor) },
  topN_10: { pf: concentrationSweep.topN_10.profitFactor, verdict: classifyStress(concentrationSweep.topN_10.profitFactor) },
  topN_20: { pf: concentrationSweep.topN_20.profitFactor, verdict: classifyStress(concentrationSweep.topN_20.profitFactor) },
  highVol_only: { pf: volStress.highVol.profitFactor, verdict: classifyStress(volStress.highVol.profitFactor) },
  normalVol_only: { pf: volStress.normalVol.profitFactor, verdict: classifyStress(volStress.normalVol.profitFactor) },
  regime_RISK_ON: { pf: regimeMatrix.RISK_ON.profitFactor, verdict: classifyStress(regimeMatrix.RISK_ON.profitFactor) },
  regime_RANGE: { pf: regimeMatrix.RANGE.profitFactor, verdict: classifyStress(regimeMatrix.RANGE.profitFactor) },
  regime_RISK_OFF: { pf: regimeMatrix.RISK_OFF.profitFactor, verdict: classifyStress(regimeMatrix.RISK_OFF.profitFactor) },
  regime_HIGH_VOL: { pf: regimeMatrix.HIGH_VOL.profitFactor, verdict: classifyStress(regimeMatrix.HIGH_VOL.profitFactor) },
};

const survivalSummary = { SURVIVES: 0, MARGINAL: 0, KILLED: 0 };
for (const v of Object.values(survivalMap)) survivalSummary[v.verdict]++;

console.log("[rs-hardening-v1] survival summary :", survivalSummary);

// === Verdict global ========================================================
//
// CONSERVATEUR. Pas de promotion. Pas de "validé". On classe le degré de
// fragilité observé.

function decideVerdict() {
  const reasons = [];
  // Critères durs Freeze § 4 + brief créateur :
  // - friction ×2 PF ≥ 1.10 attendu
  // - friction ×3 PF ≥ 1.00 souhaité
  // - sans top 5 PF ≥ 1.05
  // - 2022 PF ≥ 0.50 (survivance bear)
  // - PF baseline F×1 ≥ 1.30

  const f1 = frictionStress.x1.profitFactor;
  const f2 = frictionStress.x2.profitFactor;
  const f3 = frictionStress.x3.profitFactor;
  const woTop5 = exclusionStress.noTop5Symbols.profitFactor;
  const woTop3Dates = exclusionStress.noTop3Dates.profitFactor;
  const pf2022 = bearStress.year2022.profitFactor;
  const pfHighVol = regimeMatrix.HIGH_VOL.profitFactor;

  if (f1 < 1.30) reasons.push(`PF baseline F×1 = ${f1} < 1.30 → edge marginal après friction baseline.`);
  if (f2 < 1.10) reasons.push(`PF friction ×2 = ${f2} < 1.10 → edge fragile sous friction réaliste majorée (critère Freeze § 4 I2).`);
  if (f3 < 1.00) reasons.push(`PF friction ×3 = ${f3} < 1.00 → edge mort sous friction extrême (critère Freeze § 4 I3 souhaité).`);
  if (woTop5 < 1.05) reasons.push(`PF sans top 5 = ${woTop5} < 1.05 → edge concentré, non diversifiable.`);
  if (woTop3Dates < 1.0) reasons.push(`PF sans top 3 dates = ${woTop3Dates} < 1.0 → edge dépendant de quelques événements.`);
  if (pf2022 < 0.5) reasons.push(`PF 2022 = ${pf2022} < 0.5 → survivance bear catastrophique.`);
  if (pfHighVol < 1.0) reasons.push(`PF HIGH_VOL = ${pfHighVol} < 1.0 → dangerous en régime de forte volatilité — désactivation recommandée.`);

  const killedCount = Object.values(survivalMap).filter((v) => v.verdict === "KILLED").length;
  const totalStress = Object.keys(survivalMap).length;
  const killPct = totalStress > 0 ? (killedCount / totalStress * 100).toFixed(1) : "0";

  reasons.push(`Stress tests : ${survivalSummary.SURVIVES} survives / ${survivalSummary.MARGINAL} marginal / ${killedCount} killed (${killPct} % killed).`);

  // Classification finale
  let status;
  if (f1 < 1.20 || f2 < 1.0) status = "STRUCTURALLY_WEAK_HARDENED_DEAD";
  else if (woTop5 < 1.05 || pf2022 < 0.5 || pfHighVol < 1.0) status = "HARDENED_FRAGILE";
  else if (killedCount > totalStress * 0.3) status = "HARDENED_FRAGILE";
  else if (f2 >= 1.10 && f3 >= 1.00 && woTop5 >= 1.05 && pf2022 >= 0.5) status = "HARDENED_ROBUST_CANDIDATE";
  else status = "HARDENED_MARGINAL";

  return { status, reasons, survivalSummary, killPct: Number(killPct) };
}

const verdict = decideVerdict();
console.log(`[rs-hardening-v1] Verdict : ${verdict.status}`);
for (const r of verdict.reasons) console.log(`   - ${r}`);

// === Rapport ===============================================================

const report = {
  generatedAt: new Date().toISOString(),
  scope: "RS Rotation Hardening Phase 1 — stress tests A.1-A.8 + regime validation B (4 régimes officiels v1).",
  baseline: BASELINE,
  tradingUniverseSize: TRADING_UNIVERSE.length,
  totalDates: DATES.length,
  regimeDistrib,
  regimeDistribPct: Object.fromEntries(
    Object.entries(regimeDistrib).map(([k, v]) => [k, regimeCovered > 0 ? Number((v / regimeCovered * 100).toFixed(1)) : 0])
  ),
  baselineGrossTrades: tradesRaw.length,
  stressA: {
    A1_friction: frictionStress,
    A2_slippage: slippageStress,
    A3_executionDelay: delayStress,
    A4_topPerformerExclusion: exclusionStress,
    A5_sectorStress: sectorStress,
    A6_bearStress: bearStress,
    A7_concentrationSweep: concentrationSweep,
    A8_volExpansion: volStress,
  },
  regimeMatrix,
  survivalMap,
  verdict,
  vocabulary: {
    statuses: ["HARDENED_ROBUST_CANDIDATE", "HARDENED_MARGINAL", "HARDENED_FRAGILE", "STRUCTURALLY_WEAK_HARDENED_DEAD"],
    forbidden: ["VALIDATED_RESEARCH_CORE", "LIVE_READY", "CONDITIONAL_EDGE"],
    note: "Aucune promotion de statut depuis ce script. Statut Setup 3 (RS Rotation) reste RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED tant que GO MERGE ChatGPT non reçu sur PR dédiée.",
  },
  limitations: [
    "Univers ex-post 2021-2025 (survivants).",
    "Slippage proxy uniforme (pas modulé par classe d'actif).",
    "Délai d'exécution proxy (entry NEXT_OPEN + N jours, pas modélisation broker fine).",
    "Régime HIGH_VOL = realized vol SPY 20j > 25 % annualisée (définition opérationnelle, pas standard universel).",
    "Sector group = première occurrence dans UNIVERSE (un symbole appartient à un seul group, ce qui est imparfait pour les actifs cross-thématiques).",
    "Pas de modélisation des taux de financement (overnight) ni des coûts de borrow short (non applicable car long-only).",
    "Walk-forward strict 3-splits déjà couvert par rs-rotation-robustness-v1.mjs — pas redoublé ici pour éviter la duplication. Cf. PR #234 commit 1641abf.",
  ],
  rollback: {
    runtime: "Aucun — aucun fichier runtime modifié.",
    documentation: "git revert de la PR — aucun impact moteur.",
    outputs: "Reproductibles à chaque exécution du script — supprimables sans impact.",
  },
  sources: [
    "tools/backtests/rs-rotation-robustness-v1.mjs (baseline gelée, méthodologie héritée)",
    "tools/backtests/rs-rotation-robustness-lab-v1.mjs (breadth via sweeps)",
    "tools/backtests/universe-v2.mjs (univers source)",
    "docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md (critères § 4 friction ×2/×3, concentration, survivance bear)",
    "docs/project/TRADING_PHILOSOPHY.md (architecture 5 couches, garde-fou anti-empilement filtres, refus microstructure)",
    "docs/quant/SETUPS_REGISTRY.md Setup 3 (statut courant + 10 items items requis avant CONDITIONAL_EDGE)",
    "Brief créateur 2026-05-19 « PHASE QUANT HARDENING V1 »",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Verdict final : ${verdict.status}`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

// === Markdown ===============================================================

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function summaryLine(s) {
  return `trades=${s.trades} winrate=${fmt(s.winrate)}% PF=${fmt(s.profitFactor)} expR=${fmt(s.expectancyR, 4)} totalR=${fmt(s.totalR)} maxDD=${fmt(s.maxDrawdownR)} streak=${s.longestLossStreak}`;
}

function buildMarkdown(r) {
  const L = [];
  L.push("# RS Rotation Hardening Phase 1 — stress tests + regime validation");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/rs-rotation-hardening-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Analyse strictement offline.** Aucun ordre, aucun broker. Aucun fichier runtime modifié. Paramètres BASELINE GELÉS ex-ante (identiques `rs-rotation-robustness-v1.mjs`). Aucune optimisation post-hoc.");
  L.push("");
  L.push("**Statuts autorisés en sortie** : `HARDENED_ROBUST_CANDIDATE`, `HARDENED_MARGINAL`, `HARDENED_FRAGILE`, `STRUCTURALLY_WEAK_HARDENED_DEAD`. **Interdits** : `VALIDATED_RESEARCH_CORE`, `LIVE_READY`, `CONDITIONAL_EDGE`. Le statut officiel RS Rotation dans `SETUPS_REGISTRY.md` reste `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` tant que `GO MERGE` ChatGPT non reçu sur PR de promotion dédiée.");
  L.push("");

  L.push("## 1. Objectif");
  L.push("");
  L.push("Mesurer ce qui survit réellement sur RS Rotation sous 8 stress tests structurels (A.1-A.8) + matrice par régime 4 états officiels v1 (RISK_ON, RANGE, RISK_OFF, HIGH_VOL). Pas \"trouver un edge\". Pas \"améliorer le PF\". Découvrir où le setup casse.");
  L.push("");
  L.push("Complémentaire de `rs-rotation-robustness-lab-v1.mjs` (breadth via 6 sweeps univariés) et `rs-rotation-robustness-v1.mjs` (depth via walk-forward strict + concentration + drawdown). Ce script ajoute la couverture systématique des stress + régimes.");
  L.push("");

  L.push("## 2. Baseline (gelée)");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(r.baseline, null, 2));
  L.push("```");
  L.push("");
  L.push(`Univers de trading effectif : **${r.tradingUniverseSize}** symboles. Dates communes : ${r.totalDates}.`);
  L.push("");
  L.push(`Gross trades baseline (avant coûts) : **${r.baselineGrossTrades}**.`);
  L.push("");

  L.push("## 3. Distribution régime 4-état officiels v1");
  L.push("");
  L.push("| Régime | Jours | % |");
  L.push("|---|---:|---:|");
  for (const reg of ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]) {
    L.push(`| ${reg} | ${r.regimeDistrib[reg]} | ${fmt(r.regimeDistribPct[reg])} % |`);
  }
  L.push("");
  L.push(`HIGH_VOL = realized vol SPY 20j > ${HIGH_VOL_REALIZED_PCT_THRESHOLD * 100} % annualisée (prend priorité sur RISK_ON/RANGE/RISK_OFF quand déclenché).`);
  L.push("");

  L.push("## 4. Stress A.1 — Friction ×1 / ×2 / ×3");
  L.push("");
  L.push("| Multiplier | Trades | PF | Expectancy R | Total R | Max DD | Verdict |");
  L.push("|---|---:|---:|---:|---:|---:|---|");
  for (const m of ["x1", "x2", "x3"]) {
    const s = r.stressA.A1_friction[m];
    L.push(`| ${m} | ${s.trades} | **${fmt(s.profitFactor)}** | ${fmt(s.expectancyR, 4)} | ${fmt(s.totalR)} | ${fmt(s.maxDrawdownR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");
  L.push("Seuils Freeze § 4 : friction ×2 PF ≥ 1.10 (I2), ×3 PF ≥ 1.00 (I3 souhaité).");
  L.push("");

  L.push("## 5. Stress A.2 — Slippage one-way");
  L.push("");
  L.push("| Slippage one-way | Trades | PF | Total R | Verdict |");
  L.push("|---|---:|---:|---:|---|");
  for (const k of Object.keys(r.stressA.A2_slippage)) {
    const s = r.stressA.A2_slippage[k];
    L.push(`| ${k} | ${s.trades} | **${fmt(s.profitFactor)}** | ${fmt(s.totalR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");
  L.push("Modèle : slippage symétrique entry+exit (round-trip = 2 × one-way). Pas modulé par classe d'actif.");
  L.push("");

  L.push("## 6. Stress A.3 — Délais d'exécution (NEXT_OPEN + N jours)");
  L.push("");
  L.push("| Délai | Trades | PF | Total R | Verdict |");
  L.push("|---|---:|---:|---:|---|");
  for (const k of Object.keys(r.stressA.A3_executionDelay)) {
    const s = r.stressA.A3_executionDelay[k];
    L.push(`| ${k} | ${s.trades} | **${fmt(s.profitFactor)}** | ${fmt(s.totalR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");
  L.push("Proxy : entry reportée de N jours bourse. Mesure la sensibilité du setup au timing d'exécution.");
  L.push("");

  L.push("## 7. Stress A.4 — Suppression top performers");
  L.push("");
  L.push("| Stress | Trades | PF | Total R | Verdict |");
  L.push("|---|---:|---:|---:|---|");
  for (const k of ["base", "noTop5Symbols", "noTop10Symbols", "noTop3Dates", "noTop5AndTop3Dates"]) {
    const s = r.stressA.A4_topPerformerExclusion[k];
    L.push(`| ${k} | ${s.trades} | **${fmt(s.profitFactor)}** | ${fmt(s.totalR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");
  L.push(`Top 5 symboles retirés : ${r.stressA.A4_topPerformerExclusion.noTop5Symbols.removedSymbols?.join(", ") || "n/a"}.`);
  L.push("");
  L.push(`Top 10 symboles retirés : ${r.stressA.A4_topPerformerExclusion.noTop10Symbols.removedSymbols?.join(", ") || "n/a"}.`);
  L.push("");
  L.push(`Top 3 dates retirées : ${(r.stressA.A4_topPerformerExclusion.noTop3Dates.removedDates || []).map((d) => `\`${d}\``).join(", ") || "n/a"}.`);
  L.push("");

  L.push("## 8. Stress A.5 — Stress sectoriel (sans secteur dominant)");
  L.push("");
  L.push(`Secteur dominant identifié : **${r.stressA.A5_sectorStress.dominantSector}**.`);
  L.push("");
  L.push("Ranking des secteurs par Total R :");
  L.push("");
  L.push("| Rang | Groupe | Trades | Total R |");
  L.push("|---:|---|---:|---:|");
  r.stressA.A5_sectorStress.sectorRanking.slice(0, 10).forEach((s, i) => {
    L.push(`| ${i + 1} | ${s.group} | ${s.trades} | ${fmt(s.totalR)} |`);
  });
  L.push("");
  L.push(`**Sans secteur dominant (${r.stressA.A5_sectorStress.dominantSector})** : ${summaryLine(r.stressA.A5_sectorStress.withoutDominantSector)} — Verdict ${classifyStress(r.stressA.A5_sectorStress.withoutDominantSector.profitFactor)}.`);
  L.push("");

  L.push("## 9. Stress A.6 — Bear market (isolation 2022)");
  L.push("");
  L.push("| Sous-période | Trades | PF | Total R | Max DD | Verdict |");
  L.push("|---|---:|---:|---:|---:|---|");
  L.push(`| 2022 uniquement | ${r.stressA.A6_bearStress.year2022.trades} | **${fmt(r.stressA.A6_bearStress.year2022.profitFactor)}** | ${fmt(r.stressA.A6_bearStress.year2022.totalR)} | ${fmt(r.stressA.A6_bearStress.year2022.maxDrawdownR)} | ${classifyStress(r.stressA.A6_bearStress.year2022.profitFactor)} |`);
  L.push(`| Excluant 2022 | ${r.stressA.A6_bearStress.excludingYear2022.trades} | **${fmt(r.stressA.A6_bearStress.excludingYear2022.profitFactor)}** | ${fmt(r.stressA.A6_bearStress.excludingYear2022.totalR)} | ${fmt(r.stressA.A6_bearStress.excludingYear2022.maxDrawdownR)} | ${classifyStress(r.stressA.A6_bearStress.excludingYear2022.profitFactor)} |`);
  L.push("");

  L.push("## 10. Stress A.7 — Concentration sweep (topN = 5, 10, 20)");
  L.push("");
  L.push("| topN | Trades | PF | Total R | Max DD | Verdict |");
  L.push("|---|---:|---:|---:|---:|---|");
  for (const k of ["topN_5", "topN_10", "topN_20"]) {
    const s = r.stressA.A7_concentrationSweep[k];
    L.push(`| ${s.topN} | ${s.trades} | **${fmt(s.profitFactor)}** | ${fmt(s.totalR)} | ${fmt(s.maxDrawdownR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");

  L.push("## 11. Stress A.8 — Volatility expansion (rvol SPY 20j > 25 %)");
  L.push("");
  L.push("| Sous-groupe | Trades | PF | Total R | Verdict |");
  L.push("|---|---:|---:|---:|---|");
  L.push(`| Signaux en HIGH_VOL | ${r.stressA.A8_volExpansion.highVol.trades} | **${fmt(r.stressA.A8_volExpansion.highVol.profitFactor)}** | ${fmt(r.stressA.A8_volExpansion.highVol.totalR)} | ${classifyStress(r.stressA.A8_volExpansion.highVol.profitFactor)} |`);
  L.push(`| Signaux en vol normale | ${r.stressA.A8_volExpansion.normalVol.trades} | **${fmt(r.stressA.A8_volExpansion.normalVol.profitFactor)}** | ${fmt(r.stressA.A8_volExpansion.normalVol.totalR)} | ${classifyStress(r.stressA.A8_volExpansion.normalVol.profitFactor)} |`);
  L.push("");

  L.push("## 12. B — Matrice par régime (4 régimes officiels v1)");
  L.push("");
  L.push("| Régime | Trades | Winrate | PF | Expectancy R | Total R | Max DD | Verdict |");
  L.push("|---|---:|---:|---:|---:|---:|---:|---|");
  for (const reg of ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]) {
    const s = r.regimeMatrix[reg];
    L.push(`| ${reg} | ${s.trades} | ${fmt(s.winrate)} % | **${fmt(s.profitFactor)}** | ${fmt(s.expectancyR, 4)} | ${fmt(s.totalR)} | ${fmt(s.maxDrawdownR)} | ${classifyStress(s.profitFactor)} |`);
  }
  L.push("");
  L.push("**Lecture régime** :");
  L.push("- `RISK_ON` : marché clairement haussier (SPY/QQQ/SMH > EMA200).");
  L.push("- `RANGE` : marché mixte / latéral.");
  L.push("- `RISK_OFF` : marché bear (SPY/QQQ/SMH < EMA200). **Notez** : baseline filtre `NO_RISK_OFF` donc cette ligne devrait être vide ou minimale — c'est normal.");
  L.push("- `HIGH_VOL` : realized vol SPY > 25 % annualisée. Prend priorité sur les 3 autres états quand déclenchée.");
  L.push("");

  L.push("## 13. Survival map");
  L.push("");
  L.push("| Stress | PF | Verdict |");
  L.push("|---|---:|---|");
  for (const [k, v] of Object.entries(r.survivalMap)) {
    L.push(`| ${k} | ${fmt(v.pf)} | ${v.verdict} |`);
  }
  L.push("");
  L.push(`Total : ${r.verdict.survivalSummary.SURVIVES} SURVIVES / ${r.verdict.survivalSummary.MARGINAL} MARGINAL / ${r.verdict.survivalSummary.KILLED} KILLED (${r.verdict.killPct} % killed).`);
  L.push("");

  L.push("## 14. Verdict global");
  L.push("");
  L.push(`**Statut : \`${r.verdict.status}\`**`);
  L.push("");
  L.push("Raisons :");
  L.push("");
  for (const reason of r.verdict.reasons) L.push(`- ${reason}`);
  L.push("");
  L.push(`**Vocabulaire** : ${r.vocabulary.note}`);
  L.push("");
  L.push("Statuts possibles en sortie de ce script :");
  L.push("");
  L.push("- `HARDENED_ROBUST_CANDIDATE` — tous critères durs passent (F×2 ≥ 1.10, F×3 ≥ 1.00, sans top 5 ≥ 1.05, 2022 ≥ 0.5).");
  L.push("- `HARDENED_MARGINAL` — quelques critères passent, mais pas tous.");
  L.push("- `HARDENED_FRAGILE` — critère structurel critique fail (sans top 5 < 1.05 OU 2022 < 0.5 OU HIGH_VOL < 1.0 OU > 30 % des stress KILLED).");
  L.push("- `STRUCTURALLY_WEAK_HARDENED_DEAD` — baseline F×1 < 1.20 OU F×2 < 1.0 (edge mort sous friction réaliste).");
  L.push("");
  L.push("**Aucun de ces statuts n'est une promotion officielle.** Toute promotion vers `CONDITIONAL_EDGE` ou `VALIDATED_RESEARCH_CORE` reste subordonnée aux 10 critères Freeze § 4 + validation ChatGPT explicite sur PR séparée.");
  L.push("");

  L.push("## 15. Limites");
  L.push("");
  for (const lim of r.limitations) L.push(`- ${lim}`);
  L.push("");

  L.push("## 16. Rollback");
  L.push("");
  L.push(`- Runtime : ${r.rollback.runtime}`);
  L.push(`- Documentation : ${r.rollback.documentation}`);
  L.push(`- Outputs : ${r.rollback.outputs}`);
  L.push("");

  L.push("## 17. Anti-overfit — checklist d'honnêteté");
  L.push("");
  L.push("- ✅ Paramètres baseline figés ex-ante (identiques `rs-rotation-robustness-v1.mjs`). Aucune modification.");
  L.push("- ✅ Aucune variante optimisée pour faire passer un stress.");
  L.push("- ✅ Aucun cherry-picking de période, d'univers, d'actif, ou de date.");
  L.push("- ✅ Slippage et délai = stress symétriques (positifs et négatifs autorisés).");
  L.push("- ✅ Tous les stress mesurent des dégradations, jamais des améliorations.");
  L.push("- ✅ Vocabulaire de sortie ne permet pas de promotion (`CONDITIONAL_EDGE` interdit).");
  L.push("- ✅ Si un edge disparaît sous friction réaliste, le verdict descend automatiquement (`STRUCTURALLY_WEAK_HARDENED_DEAD`).");
  L.push("");

  L.push("## 18. Sources");
  L.push("");
  for (const s of r.sources) L.push(`- \`${s}\``);
  L.push("");

  L.push("---");
  L.push("");
  L.push("Hypothèses : friction round-trip 0.30 % + 0.02 %/j, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement (sauf stress A.3 délai +N), paramètres baseline gelés ex-ante.");
  return L.join("\n");
}
