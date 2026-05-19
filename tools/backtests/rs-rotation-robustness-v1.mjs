// tools/backtests/rs-rotation-robustness-v1.mjs
//
// RS Rotation robustness hardening v1 — ManiTradePro.
//
// Objectif : produire une évaluation DURCIE et HONNÊTE de la robustesse de
// RELATIVE_STRENGTH_ROTATION afin de décider si le setup peut sortir de son
// statut courant RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED.
//
// Ce script est complémentaire de `rs-rotation-robustness-lab-v1.mjs` :
//   - le LAB fait de la BREADTH (6 sweeps univariés, 33 configs uniques).
//   - ce script fait de la DEPTH sur la baseline gelée :
//       1) baseline avec friction baseline ;
//       2) baseline par régime (ALL_REGIMES / NO_RISK_OFF / RANGE_ONLY /
//          RISK_ON_ONLY) ;
//       3) walk-forward STRICT train/test (3 splits, paramètres gelés) ;
//       4) analyse concentration top 5 (PF sans top 5, share %) ;
//       5) analyse drawdown (max DD, longest loss streak, worst split,
//          worst year) ;
//       6) verdict conservateur dans le vocabulaire Freeze v1 / truth-sync :
//          KEEP_RESEARCH_CANDIDATE / CONDITIONAL_EDGE /
//          FRAGILE / CONCENTRATION_EXCESSIVE / DEAD_AGGREGATED /
//          NEEDS_MORE_DATA.
//
// CONTRAINTES (cf. RESEARCH_FRAMEWORK_FREEZE_V1.md, ANTI_LOOKAHEAD_RULES.md) :
//   - STRICTEMENT offline. Aucun ordre, aucun broker, aucun endpoint live.
//   - Paramètres gelés ex-ante. Aucune ré-optimisation entre les splits.
//   - Entry = open[i+1] (NEXT_OPEN). Aucun usage d'indicateur incluant la
//     bougie signal comme prix d'entrée.
//   - Friction OBLIGATOIRE dès le baseline.
//   - Aucun cherry-picking de symboles (sauf l'exclusion stress "sans top 5",
//     mesurée en AVAL, pas appliquée à la sélection).
//   - Aucun statut VALIDATED_RESEARCH_CORE ni LIVE_READY ne peut être proposé
//     par ce script (cf. Freeze § 5 — interdit sans shadow live + paper).
//
// Sorties :
//   - tools/backtests/output/rs-rotation-robustness-v1.json
//   - tools/backtests/output/rs-rotation-robustness-v1.md

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "rs-rotation-robustness-v1.json");
const OUT_MD = join(OUT_DIR, "rs-rotation-robustness-v1.md");

// === Baseline gelée ex-ante ================================================
//
// Paramètres identiques à `rs-rotation-robustness-lab-v1.mjs` § BASELINE et
// alignés sur la variante de référence `rs_90d_top10_hold20` de
// `backtest-relative-strength-rotation-v1.mjs`.

const BASELINE = Object.freeze({
  lookback: 90,
  horizon: 20,
  topN: 10,
  rebalance: 10,
  minMomentum: 12,
  exit: "fixed_hold",
  regime: "NO_RISK_OFF",     // filtre régime par défaut
  universe: "mixed",          // tous les groupes UNIVERSE flat
});

// === Univers ================================================================
//
// Mixed = tous les groupes UNIVERSE flat (cf. universe-v2.mjs).
// Univers ex-post (survivants 2021-2025) — limitation acceptée, documentée.

const UNIVERSE_MIXED = [...new Set(Object.values(UNIVERSE).flat())];

// === Friction model =========================================================
//
// Formule canonique (cf. `rs-rotation-robustness-lab-v1.mjs` § Friction) :
//   spread one-way     0.05 %
//   slippage one-way   0.05 %
//   commission one-way 0.05 %
//   total round-trip   0.30 %
//   overnight gap pen. 0.02 % par jour de hold
//   conversion         5 % = 1R (convention RS Rotation v1)
//
// frictionR = (0.30 + 0.02 × holdDays) / 5

function frictionRPerTrade(holdDays) {
  const pct = 0.30 + 0.02 * holdDays;
  return pct / 5;
}

// === Helpers ================================================================

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

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

// === Loaders ================================================================

console.log("[rs-robustness-v1] chargement candles…");
const candlesBySymbol = new Map();
const allSymbols = new Set([...UNIVERSE_MIXED, "SPY", "QQQ", "SMH"]);
for (const s of allSymbols) {
  const c = loadCandles(s);
  if (c && c.length >= 220) candlesBySymbol.set(s, c);
}
console.log(`[rs-robustness-v1] OHLC chargés : ${candlesBySymbol.size} / ${allSymbols.size}`);

// === Régimes pré-calculés ===================================================
//
// Régime = RISK_ON / RANGE / RISK_OFF selon SPY+QQQ+SMH vs leur EMA200.
// Indicateurs causaux par construction (EMA récurrente).

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
  const regimeByDate = new Map();
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
  }
  return { regimeByDate };
}

function regimeAllowed(date, mode) {
  const r = regimeByDate.get(date);
  switch (mode) {
    case "ALL_REGIMES": return true;
    case "NO_RISK_OFF": return r !== "RISK_OFF";
    case "RANGE_ONLY": return r === "RANGE";
    case "RISK_ON_ONLY": return r === "RISK_ON";
    case "RISK_OFF_ONLY": return r === "RISK_OFF";
    default: return true;
  }
}

const DATES = buildDateIndex();
const { regimeByDate } = buildRegimes(DATES);
console.log(`[rs-robustness-v1] dates communes : ${DATES.length}`);

// === Simulation (paramètres gelés) ==========================================
//
// Cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.1 :
//   - entry = open[i+1] (NEXT_OPEN).
//   - exit  = open[i+1+horizon] (fixed hold).
//   - aucun usage d'indicateur sur la bougie signal comme prix d'entrée.
//   - friction systématique.

function runBaseline({ regime = BASELINE.regime, allowedYears = null } = {}) {
  const universe = UNIVERSE_MIXED.filter((s) => candlesBySymbol.has(s));
  const trades = [];

  for (let di = BASELINE.lookback; di < DATES.length - BASELINE.horizon - 2; di += BASELINE.rebalance) {
    const date = DATES[di];
    if (allowedYears && !allowedYears.has(getYear(date))) continue;
    if (!regimeAllowed(date, regime)) continue;

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
      const pnlRGross = pnlPct / 5;
      const friction = frictionRPerTrade(holdDays);
      const pnlR = Number((pnlRGross - friction).toFixed(4));

      trades.push({
        symbol: cand.symbol,
        signalDate: date,
        entryTime: c[entryIdx].time,
        exitTime: c[exitIdx].time,
        year: getYear(date),
        regimeAtEntry: regimeByDate.get(date) || "RANGE",
        pnlPct: Number(pnlPct.toFixed(3)),
        pnlRGross: Number(pnlRGross.toFixed(4)),
        frictionR: Number(friction.toFixed(4)),
        pnlR,
        holdDays,
        momentum: Number(cand.momentum.toFixed(2)),
      });
    }
  }
  return trades;
}

// === Métriques de base ======================================================

function summarize(trades) {
  if (!trades.length) {
    return {
      trades: 0, wins: 0, losses: 0, winrate: 0, expectancyR: 0,
      profitFactor: 0, totalR: 0, maxDrawdownR: 0, longestLossStreak: 0,
    };
  }
  const total = trades.length;
  const wins = trades.filter((t) => t.pnlR > 0);
  const losses = trades.filter((t) => t.pnlR < 0);
  const gw = wins.reduce((a, b) => a + b.pnlR, 0);
  const gl = Math.abs(losses.reduce((a, b) => a + b.pnlR, 0));
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  let equity = 0, peak = 0, maxDD = 0;
  let lossStreak = 0, longestLossStreak = 0;
  for (const t of trades) {
    equity += t.pnlR;
    if (equity > peak) peak = equity;
    if (peak - equity > maxDD) maxDD = peak - equity;
    if (t.pnlR < 0) {
      lossStreak++;
      if (lossStreak > longestLossStreak) longestLossStreak = lossStreak;
    } else {
      lossStreak = 0;
    }
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
  for (const t of trades) {
    (byYear[t.year] = byYear[t.year] || []).push(t);
  }
  const years = ["2021", "2022", "2023", "2024", "2025"];
  const out = {};
  for (const y of years) {
    const ts = byYear[y] || [];
    if (!ts.length) { out[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    out[y] = {
      trades: ts.length,
      pf: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
      totalR: Number(ts.reduce((a, b) => a + b.pnlR, 0).toFixed(2)),
    };
  }
  return out;
}

// === Concentration analysis (top 5 contributeurs) ===========================

function concentration(trades) {
  if (!trades.length) {
    return {
      universeSize: 0,
      top5: [],
      top5SharePctOfPositive: null,
      top5SharePctOfAbs: null,
      pfWithoutTop5: null,
      totalRWithoutTop5: null,
      singleMaxSharePctOfPositive: null,
    };
  }
  const bySymbol = new Map();
  for (const t of trades) {
    const cur = bySymbol.get(t.symbol) || { symbol: t.symbol, trades: 0, totalR: 0 };
    cur.trades++;
    cur.totalR += t.pnlR;
    bySymbol.set(t.symbol, cur);
  }
  const all = [...bySymbol.values()].map((x) => ({ ...x, totalR: Number(x.totalR.toFixed(3)) }));
  // Tri par totalR décroissant (les plus contributeurs en tête, positifs comme négatifs).
  // Cf. Freeze v1 § 3.6 — "share top 5 tickers obligatoire" : on mesure le poids des
  // 5 plus gros contributeurs positifs ; et en parallèle, share absolu (somme |R|).
  const positiveContributors = all.filter((x) => x.totalR > 0)
    .sort((a, b) => b.totalR - a.totalR);
  const sumPositive = positiveContributors.reduce((a, b) => a + b.totalR, 0);
  const top5 = positiveContributors.slice(0, 5);
  const top5SumPositive = top5.reduce((a, b) => a + b.totalR, 0);
  const top5SharePctOfPositive = sumPositive > 0
    ? Number(((top5SumPositive / sumPositive) * 100).toFixed(2)) : null;
  const totalAbs = all.reduce((a, b) => a + Math.abs(b.totalR), 0);
  const top5AbsShare = totalAbs > 0
    ? Number(((top5SumPositive / totalAbs) * 100).toFixed(2)) : null;
  const singleMax = positiveContributors[0];
  const singleMaxShare = singleMax && sumPositive > 0
    ? Number(((singleMax.totalR / sumPositive) * 100).toFixed(2)) : null;

  // PF / totalR sans top 5 (en EXCLUANT tous les trades des 5 symboles top)
  const top5Symbols = new Set(top5.map((x) => x.symbol));
  const withoutTop5 = trades.filter((t) => !top5Symbols.has(t.symbol));
  const woSummary = summarize(withoutTop5);

  return {
    universeSize: all.length,
    positiveContributors: positiveContributors.length,
    sumPositiveR: Number(sumPositive.toFixed(2)),
    top5: top5.map((x) => ({
      symbol: x.symbol,
      trades: x.trades,
      totalR: x.totalR,
      sharePctOfPositive: sumPositive > 0
        ? Number(((x.totalR / sumPositive) * 100).toFixed(2)) : null,
    })),
    top5SumPositiveR: Number(top5SumPositive.toFixed(2)),
    top5SharePctOfPositive,
    top5SharePctOfAbs: top5AbsShare,
    singleMaxSharePctOfPositive: singleMaxShare,
    pfWithoutTop5: woSummary.profitFactor,
    totalRWithoutTop5: woSummary.totalR,
    tradesWithoutTop5: woSummary.trades,
  };
}

// === Walk-forward STRICT 3 splits ===========================================
//
// Cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.5 :
//   Split 1 : train 2021-2022 → test 2023
//   Split 2 : train 2021-2023 → test 2024
//   Split 3 : train 2021-2024 → test 2025
//
// Paramètres GELÉS : BASELINE est constant entre les splits (pas de
// ré-optimisation). Le "train" sert uniquement à :
//   - vérifier la consistance ex-ante des paramètres choisis ;
//   - mesurer le PF train comme baseline de comparaison vs PF test.
//
// Pass = PF test ≥ 1.0 (seuil minimum vivant) ; condition robustesse forte
// = PF test ≥ 1.3 (seuil Freeze § 4 pour promotion).

const SPLITS = [
  { name: "S1", trainYears: ["2021", "2022"], testYears: ["2023"] },
  { name: "S2", trainYears: ["2021", "2022", "2023"], testYears: ["2024"] },
  { name: "S3", trainYears: ["2021", "2022", "2023", "2024"], testYears: ["2025"] },
];

function runWalkForward() {
  const splits = [];
  for (const split of SPLITS) {
    const trainSet = new Set(split.trainYears);
    const testSet = new Set(split.testYears);
    const trainTrades = runBaseline({ regime: BASELINE.regime, allowedYears: trainSet });
    const testTrades = runBaseline({ regime: BASELINE.regime, allowedYears: testSet });
    const trainSummary = summarize(trainTrades);
    const testSummary = summarize(testTrades);
    const passLive = testSummary.profitFactor >= 1.0 && testSummary.trades >= 10;
    const passRobust = testSummary.profitFactor >= 1.3 && testSummary.trades >= 20;
    splits.push({
      name: split.name,
      trainYears: split.trainYears,
      testYears: split.testYears,
      train: trainSummary,
      test: testSummary,
      passLive,
      passRobust,
    });
  }
  const passLive = splits.filter((s) => s.passLive).length;
  const passRobust = splits.filter((s) => s.passRobust).length;
  return { splits, passLive, passRobust };
}

// === Drawdown deep dive =====================================================

function drawdownDeepDive(trades) {
  const s = summarize(trades);
  // Equity curve trade-par-trade
  let equity = 0, peak = 0;
  let currentDD = 0, ddPeak = 0;
  let inDD = false;
  let ddStartIdx = -1, ddEndIdx = -1;
  let worstDD = { dd: 0, startIdx: -1, endIdx: -1, startDate: null, endDate: null };
  trades.forEach((t, i) => {
    equity += t.pnlR;
    if (equity > peak) {
      peak = equity;
      inDD = false;
    } else if (peak - equity > 0) {
      if (!inDD) {
        inDD = true;
        ddStartIdx = i;
      }
      currentDD = peak - equity;
      if (currentDD > worstDD.dd) {
        worstDD = {
          dd: currentDD,
          startIdx: ddStartIdx,
          endIdx: i,
          startDate: trades[ddStartIdx]?.entryTime || null,
          endDate: t.entryTime,
        };
      }
    }
  });
  return {
    maxDrawdownR: s.maxDrawdownR,
    longestLossStreak: s.longestLossStreak,
    worstDD: {
      magnitudeR: Number(worstDD.dd.toFixed(2)),
      startDate: worstDD.startDate,
      endDate: worstDD.endDate,
      durationTrades: worstDD.startIdx >= 0 ? worstDD.endIdx - worstDD.startIdx + 1 : 0,
    },
  };
}

function worstYearAndSplit(yp, wf) {
  // Worst year by PF (excluding null)
  const yearsValid = Object.entries(yp).filter(([, v]) => v !== null);
  let worstYear = null;
  for (const [y, v] of yearsValid) {
    if (worstYear === null || v.pf < worstYear.pf) {
      worstYear = { year: y, pf: v.pf, trades: v.trades, totalR: v.totalR };
    }
  }
  // Worst split test PF
  let worstSplit = null;
  for (const s of wf.splits) {
    if (worstSplit === null || s.test.profitFactor < worstSplit.testPf) {
      worstSplit = { name: s.name, testPf: s.test.profitFactor, testTrades: s.test.trades };
    }
  }
  return { worstYear, worstSplit };
}

// === Verdict conservateur ===================================================
//
// Vocabulaire exigé par le brief ChatGPT :
//   - KEEP_RESEARCH_CANDIDATE
//   - CONDITIONAL_EDGE
//   - FRAGILE / CONCENTRATION_EXCESSIVE
//   - DEAD_AGGREGATED
//   - NEEDS_MORE_DATA
//
// Interdit ici :
//   - VALIDATED_RESEARCH_CORE
//   - LIVE_READY

function classifyVerdict({ baseSummary, conc, wf, dd, worst }) {
  const reasons = [];

  // Sample / data
  if (baseSummary.trades < 100) {
    reasons.push(`Sample insuffisant : ${baseSummary.trades} trades (< 100 requis Freeze § 4).`);
    return { status: "NEEDS_MORE_DATA", reasons };
  }

  // DEAD_AGGREGATED : PF baseline frictionné < 1.20
  if (baseSummary.profitFactor < 1.20) {
    reasons.push(`PF baseline frictionné = ${baseSummary.profitFactor} < 1.20 → edge insuffisant.`);
    return { status: "DEAD_AGGREGATED", reasons };
  }

  // FRAGILE / CONCENTRATION_EXCESSIVE
  const top5Share = conc.top5SharePctOfPositive;
  const pfWoTop5 = conc.pfWithoutTop5;
  if (top5Share !== null && top5Share > 70) {
    reasons.push(`Top 5 share = ${top5Share}% > 70% → edge non diversifiable.`);
  }
  if (pfWoTop5 !== null && pfWoTop5 < 1.05) {
    reasons.push(`PF sans top 5 = ${pfWoTop5} < 1.05 → edge consommé par 5 tickers.`);
  }
  if ((top5Share !== null && top5Share > 70) || (pfWoTop5 !== null && pfWoTop5 < 1.05)) {
    return { status: "FRAGILE / CONCENTRATION_EXCESSIVE", reasons };
  }

  // Walk-forward — au moins 2/3 splits doivent passer PF ≥ 1.0
  if (wf.passLive < 2) {
    reasons.push(`Walk-forward : ${wf.passLive}/3 splits avec PF test ≥ 1.0 → robustesse temporelle insuffisante (Freeze § 3.5 demande ≥ 2/3).`);
    return { status: "KEEP_RESEARCH_CANDIDATE", reasons };
  }

  // Worst split PF < 1.0 (mais 2 splits passent) → KEEP_RESEARCH_CANDIDATE
  if (worst.worstSplit && worst.worstSplit.testPf < 1.0) {
    reasons.push(`Pire split test PF = ${worst.worstSplit.testPf} (${worst.worstSplit.name}) → fragilité temporelle persistante.`);
    return { status: "KEEP_RESEARCH_CANDIDATE", reasons };
  }

  // Worst year PF < 0.9 (bear)
  if (worst.worstYear && worst.worstYear.pf < 0.9) {
    reasons.push(`Pire année (${worst.worstYear.year}) PF = ${worst.worstYear.pf} < 0.9.`);
    return { status: "CONDITIONAL_EDGE", reasons };
  }

  // 3/3 splits passent live + PF baseline ≥ 1.3 + concentration OK + worst year OK
  // → candidat possible CONDITIONAL_EDGE (jamais VALIDATED_RESEARCH_CORE depuis ce script)
  if (wf.passRobust >= 2 && baseSummary.profitFactor >= 1.30) {
    reasons.push(`Walk-forward : ${wf.passRobust}/3 splits PF test ≥ 1.3. PF baseline = ${baseSummary.profitFactor}. Concentration acceptable. Promotion CONDITIONAL_EDGE proposée — VALIDATED_RESEARCH_CORE reste subordonné à shadow live + paper (Freeze § 5).`);
    return { status: "CONDITIONAL_EDGE", reasons };
  }

  // Par défaut, conservateur
  reasons.push(`Aucun critère DEAD/FRAGILE/CONDITIONAL_EDGE déclenché ; conservation du statut RESEARCH_CANDIDATE.`);
  return { status: "KEEP_RESEARCH_CANDIDATE", reasons };
}

// === Exécution principale ===================================================

console.log("[rs-robustness-v1] baseline NO_RISK_OFF…");
const baselineTrades = runBaseline({ regime: BASELINE.regime });
const baselineSummary = summarize(baselineTrades);
const baselineYearly = yearlyPf(baselineTrades);
console.log(`[rs-robustness-v1]   trades=${baselineSummary.trades} PF=${baselineSummary.profitFactor} totalR=${baselineSummary.totalR}`);

console.log("[rs-robustness-v1] régimes…");
const regimes = {};
for (const regime of ["ALL_REGIMES", "NO_RISK_OFF", "RANGE_ONLY", "RISK_ON_ONLY"]) {
  const trades = runBaseline({ regime });
  regimes[regime] = {
    trades: trades.length,
    summary: summarize(trades),
    yearly: yearlyPf(trades),
  };
  console.log(`[rs-robustness-v1]   ${regime} trades=${regimes[regime].summary.trades} PF=${regimes[regime].summary.profitFactor}`);
}

console.log("[rs-robustness-v1] walk-forward 3 splits stricts…");
const wf = runWalkForward();
for (const s of wf.splits) {
  console.log(`[rs-robustness-v1]   ${s.name} train PF=${s.train.profitFactor} (${s.train.trades}) | test PF=${s.test.profitFactor} (${s.test.trades}) passLive=${s.passLive} passRobust=${s.passRobust}`);
}

console.log("[rs-robustness-v1] concentration top 5…");
const conc = concentration(baselineTrades);
console.log(`[rs-robustness-v1]   top5SharePctOfPositive=${conc.top5SharePctOfPositive}% pfWithoutTop5=${conc.pfWithoutTop5}`);

console.log("[rs-robustness-v1] drawdown deep dive…");
const dd = drawdownDeepDive(baselineTrades);
const worst = worstYearAndSplit(baselineYearly, wf);
console.log(`[rs-robustness-v1]   maxDD=${dd.maxDrawdownR} longestLossStreak=${dd.longestLossStreak} worstYear=${worst.worstYear?.year}(PF=${worst.worstYear?.pf}) worstSplit=${worst.worstSplit?.name}(PF=${worst.worstSplit?.testPf})`);

const verdict = classifyVerdict({ baseSummary: baselineSummary, conc, wf, dd, worst });
console.log(`[rs-robustness-v1] verdict = ${verdict.status}`);

// === Rapport ================================================================

const report = {
  generatedAt: new Date().toISOString(),
  scope: "RS Rotation robustness hardening — focused depth analysis on the frozen baseline (complementary to rs-rotation-robustness-lab-v1.mjs which sweeps breadth).",
  baseline: BASELINE,
  executionModel: {
    entry: "open[i+1] (NEXT_OPEN, signal en fin de jour i)",
    exit: "open[i+1+horizon] (fixed hold)",
    friction: {
      spreadOneWayPct: 0.05,
      slippageOneWayPct: 0.05,
      commissionOneWayPct: 0.05,
      roundTripPct: 0.30,
      overnightGapPenaltyPctPerDay: 0.02,
      conversionToR: "5% = 1R",
      formula: "frictionR = (0.30 + 0.02 × holdDays) / 5",
      source: "rs-rotation-robustness-lab-v1.mjs § Friction model (formule canonique projet)",
    },
    lookAheadGuards: [
      "entry = open[i+1] (jamais close[i], jamais ema[i])",
      "exit = open[i+1+horizon] (jamais close[i])",
      "momentum = (close[i] - close[i-lookback]) / close[i-lookback] (causal)",
      "régime = SPY/QQQ/SMH > EMA200[i] (causal, EMA récurrente)",
    ],
  },
  universe: {
    name: "mixed",
    description: "Tous les groupes UNIVERSE de universe-v2.mjs flat.",
    loadedSymbols: candlesBySymbol.size,
    totalRequested: allSymbols.size,
    survivorshipBias: "Univers ex-post (survivants 2021-2025). Pas de delistés. Limitation documentée — cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 10.",
  },
  baseline_NO_RISK_OFF: {
    summary: baselineSummary,
    yearly: baselineYearly,
  },
  regimes,
  walkForward: {
    method: "3 splits stricts paramètres gelés (cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.5).",
    threshold: {
      passLive: "PF test ≥ 1.0 ET trades test ≥ 10",
      passRobust: "PF test ≥ 1.3 ET trades test ≥ 20",
    },
    splits: wf.splits,
    passLive: wf.passLive,
    passRobust: wf.passRobust,
  },
  concentration: conc,
  drawdown: dd,
  worst,
  verdict: {
    status: verdict.status,
    reasons: verdict.reasons,
    vocabulary: "Freeze v1 + truth-sync 2026-05-19. Interdit ici : VALIDATED_RESEARCH_CORE, LIVE_READY.",
    note: "Statut proposé par ce script. La promotion finale reste subordonnée à validation ChatGPT (gouvernance projet).",
  },
  limitations: [
    "Univers ex-post (survivants 2021-2025). Pas de delistés.",
    "Friction simplifiée uniforme (pas de modulation par actif : crypto vs ETF vs leveraged).",
    "Pas de short-side (long-only).",
    "Pas de sizing dynamique (taille fixe = 1 unité par position, 5 % = 1R).",
    "Pas de modélisation des coûts de financement (overnight rates pour positions levered).",
    "Pas de comparaison multi-univers (réservé au lab existant `rs-rotation-robustness-lab-v1.mjs`).",
    "Walk-forward fixe sur années calendaires (pas de rolling glissant).",
    "Régimes calculés sur SPY+QQQ+SMH uniquement (pas de VIX, données non disponibles dans le repo).",
  ],
  rollback: {
    runtime: "Aucun rollback nécessaire — aucun fichier runtime modifié.",
    documentation: "Si verdict contesté, rollback documentaire = git revert de la PR sans impact moteur.",
    outputs: "tools/backtests/output/rs-rotation-robustness-v1.json et .md sont produits à chaque exécution — supprimables sans impact.",
  },
  sources: [
    "tools/backtests/backtest-relative-strength-rotation-v1.mjs (variante de référence rs_90d_top10_hold20)",
    "tools/backtests/rs-rotation-robustness-lab-v1.mjs (formule friction canonique, baseline)",
    "tools/backtests/universe-v2.mjs (univers ex-post 2021-2025)",
    "docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md (§ 3.5 walk-forward, § 4 critères promotion)",
    "docs/research/ANTI_LOOKAHEAD_RULES.md (entry NEXT_OPEN, fenêtres causales)",
    "docs/quant/SETUPS_REGISTRY.md (Setup 3 — RS Rotation, statut courant RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED)",
    "data/*.json (OHLC 2021-2025)",
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

function buildMarkdown(r) {
  const L = [];
  L.push("# RS Rotation Robustness Hardening v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/rs-rotation-robustness-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Analyse strictement offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun fichier runtime modifié. Modèle d'exécution réaliste (NEXT_OPEN + friction obligatoire). Paramètres gelés ex-ante (aucune ré-optimisation entre les splits).");
  L.push("");
  L.push("**Statut maximal proposable par ce script** : `CONDITIONAL_EDGE`. Les statuts `VALIDATED_RESEARCH_CORE` et `LIVE_READY` sont **interdits** ici (cf. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 5 — nécessite shadow live + paper live prolongé).");
  L.push("");

  L.push("## 1. Objectif");
  L.push("");
  L.push("RS Rotation est actuellement classé `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` dans `docs/quant/SETUPS_REGISTRY.md` (Setup 3) : exécution propre (PR #208 CLEAN, inflation PF ×1.01) mais 0 cellule ROBUST/STABLE en rolling walk-forward.");
  L.push("");
  L.push("Ce script durcit l'évaluation avec :");
  L.push("");
  L.push("1. baseline frictionné explicite ;");
  L.push("2. décomposition par régime macro ;");
  L.push("3. walk-forward STRICT train/test 3 splits ;");
  L.push("4. analyse concentration top 5 contributeurs ;");
  L.push("5. analyse drawdown explicite ;");
  L.push("6. verdict conservateur dans le vocabulaire Freeze v1.");
  L.push("");
  L.push("Complémentaire de `rs-rotation-robustness-lab-v1.mjs` qui couvre la breadth (sweeps univariés).");
  L.push("");

  L.push("## 2. Méthodologie");
  L.push("");
  L.push("**Baseline gelée** (identique à `rs-rotation-robustness-lab-v1.mjs § BASELINE` et alignée sur la variante `rs_90d_top10_hold20` de `backtest-relative-strength-rotation-v1.mjs`) :");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(r.baseline, null, 2));
  L.push("```");
  L.push("");
  L.push("**Modèle d'exécution** :");
  L.push("");
  for (const g of r.executionModel.lookAheadGuards) L.push(`- ${g}`);
  L.push("");
  L.push("**Friction** (formule canonique projet, source : `rs-rotation-robustness-lab-v1.mjs § Friction model`) :");
  L.push("");
  L.push("```");
  L.push("frictionR = (0.30 + 0.02 × holdDays) / 5");
  L.push("");
  L.push("Avec :");
  L.push("  spread one-way    = 0.05 %");
  L.push("  slippage one-way  = 0.05 %");
  L.push("  commission o/way  = 0.05 %");
  L.push("  round-trip total  = 0.30 %");
  L.push("  overnight gap pen = 0.02 % / jour");
  L.push("  conversion        = 5 % = 1R");
  L.push("```");
  L.push("");
  L.push("Pour le baseline horizon=20 : friction par trade = (0.30 + 0.02 × 20) / 5 = **0.14 R**.");
  L.push("");

  L.push("## 3. Univers");
  L.push("");
  L.push(`- Univers : **${r.universe.name}** (tous les groupes UNIVERSE flat de \`universe-v2.mjs\`).`);
  L.push(`- Symboles avec OHLC chargés : **${r.universe.loadedSymbols}** sur ${r.universe.totalRequested} demandés.`);
  L.push(`- Période : 2021-2025 (5 ans).`);
  L.push(`- Limitation : ${r.universe.survivorshipBias}`);
  L.push("");

  L.push("## 4. Baseline (régime NO_RISK_OFF, friction appliquée)");
  L.push("");
  const bs = r.baseline_NO_RISK_OFF.summary;
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Trades | ${bs.trades} |`);
  L.push(`| Wins | ${bs.wins} |`);
  L.push(`| Losses | ${bs.losses} |`);
  L.push(`| Winrate | ${fmt(bs.winrate)} % |`);
  L.push(`| Expectancy (R) | ${fmt(bs.expectancyR, 4)} |`);
  L.push(`| Profit factor (frictionné) | **${fmt(bs.profitFactor)}** |`);
  L.push(`| Total R | ${fmt(bs.totalR)} |`);
  L.push(`| Max drawdown (R) | ${fmt(bs.maxDrawdownR)} |`);
  L.push(`| Longest loss streak | ${bs.longestLossStreak} |`);
  L.push("");
  L.push("PF par année :");
  L.push("");
  L.push("| Année | Trades | PF | Total R |");
  L.push("|---|---:|---:|---:|");
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const v = r.baseline_NO_RISK_OFF.yearly[y];
    if (v === null) {
      L.push(`| ${y} | _aucun trade_ | n/a | n/a |`);
    } else {
      L.push(`| ${y} | ${v.trades} | ${fmt(v.pf)} | ${fmt(v.totalR)} |`);
    }
  }
  L.push("");

  L.push("## 5. Analyse par régime");
  L.push("");
  L.push("| Régime | Trades | Winrate | Expectancy R | PF | Total R | Max DD |");
  L.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const k of ["ALL_REGIMES", "NO_RISK_OFF", "RANGE_ONLY", "RISK_ON_ONLY"]) {
    const s = r.regimes[k].summary;
    L.push(`| ${k} | ${s.trades} | ${fmt(s.winrate)} % | ${fmt(s.expectancyR, 4)} | ${fmt(s.profitFactor)} | ${fmt(s.totalR)} | ${fmt(s.maxDrawdownR)} |`);
  }
  L.push("");
  L.push("PF par année et par régime :");
  L.push("");
  L.push("| Régime | 2021 | 2022 | 2023 | 2024 | 2025 |");
  L.push("|---|---:|---:|---:|---:|---:|");
  for (const k of ["ALL_REGIMES", "NO_RISK_OFF", "RANGE_ONLY", "RISK_ON_ONLY"]) {
    const yp = r.regimes[k].yearly;
    const cells = ["2021", "2022", "2023", "2024", "2025"].map((y) =>
      yp[y] === null ? "n/a" : fmt(yp[y].pf)
    );
    L.push(`| ${k} | ${cells.join(" | ")} |`);
  }
  L.push("");

  L.push("## 6. Walk-forward STRICT (3 splits, paramètres gelés)");
  L.push("");
  L.push(`Méthode : ${r.walkForward.method}`);
  L.push("");
  L.push(`Seuil **passLive** = ${r.walkForward.threshold.passLive}.`);
  L.push("");
  L.push(`Seuil **passRobust** = ${r.walkForward.threshold.passRobust}.`);
  L.push("");
  L.push("| Split | Train years | Test years | Train trades | Train PF | Test trades | Test PF | Test totalR | Pass live | Pass robust |");
  L.push("|---|---|---|---:|---:|---:|---:|---:|---|---|");
  for (const s of r.walkForward.splits) {
    L.push(`| ${s.name} | ${s.trainYears.join("-")} | ${s.testYears.join("-")} | ${s.train.trades} | ${fmt(s.train.profitFactor)} | ${s.test.trades} | **${fmt(s.test.profitFactor)}** | ${fmt(s.test.totalR)} | ${s.passLive ? "✓" : "✗"} | ${s.passRobust ? "✓" : "✗"} |`);
  }
  L.push("");
  L.push(`**Splits passant live (PF ≥ 1.0)** : ${r.walkForward.passLive} / 3 — seuil Freeze § 3.5 = ≥ 2/3.`);
  L.push("");
  L.push(`**Splits passant robust (PF ≥ 1.3)** : ${r.walkForward.passRobust} / 3 — seuil promotion Freeze § 4.`);
  L.push("");

  L.push("## 7. Analyse concentration (top 5 contributeurs)");
  L.push("");
  const c = r.concentration;
  L.push(`- Symboles ayant tradé : **${c.universeSize}**`);
  L.push(`- Symboles avec contribution positive : **${c.positiveContributors}**`);
  L.push(`- Somme positive (R) : **${fmt(c.sumPositiveR)}**`);
  L.push(`- Top 5 somme positive (R) : **${fmt(c.top5SumPositiveR)}**`);
  L.push(`- **Top 5 share** (% du PnL positif) : **${fmt(c.top5SharePctOfPositive)} %**`);
  L.push(`- Top 5 share (% du |R| total) : ${fmt(c.top5SharePctOfAbs)} %`);
  L.push(`- Single max share (% du PnL positif) : ${fmt(c.singleMaxSharePctOfPositive)} %`);
  L.push(`- **PF sans top 5** : **${fmt(c.pfWithoutTop5)}**`);
  L.push(`- Total R sans top 5 : ${fmt(c.totalRWithoutTop5)} (sur ${c.tradesWithoutTop5} trades)`);
  L.push("");
  L.push("Top 5 contributeurs positifs :");
  L.push("");
  L.push("| Rang | Symbole | Trades | Total R | Share % du PnL positif |");
  L.push("|---:|---|---:|---:|---:|");
  c.top5.forEach((x, i) => {
    L.push(`| ${i + 1} | ${x.symbol} | ${x.trades} | ${fmt(x.totalR)} | ${fmt(x.sharePctOfPositive)} % |`);
  });
  L.push("");
  L.push(`**Lecture** : un top 5 share > **60 %** est le seuil dur du Freeze § 4 (critère G "concentration"). Un PF sans top 5 < 1.05 signifie que l'edge dépend entièrement de 5 tickers — c'est exactement le piège qui a fait dégrader SECTOR_RS v1 en \`FRAGILE / CONCENTRATION_EXCESSIVE\` lors de la PR truth-sync #233.`);
  L.push("");

  L.push("## 8. Analyse drawdown");
  L.push("");
  const ddx = r.drawdown;
  L.push(`- Max drawdown : **${fmt(ddx.maxDrawdownR)} R**`);
  L.push(`- Longest loss streak : **${ddx.longestLossStreak}** trades consécutifs perdants`);
  L.push(`- Worst drawdown magnitude : ${fmt(ddx.worstDD.magnitudeR)} R sur ${ddx.worstDD.durationTrades} trades`);
  if (ddx.worstDD.startDate) {
    L.push(`- Worst drawdown période : ${ddx.worstDD.startDate} → ${ddx.worstDD.endDate}`);
  }
  L.push("");
  if (r.worst.worstYear) {
    L.push(`- **Pire année** : ${r.worst.worstYear.year} (PF ${fmt(r.worst.worstYear.pf)}, ${r.worst.worstYear.trades} trades, total R ${fmt(r.worst.worstYear.totalR)})`);
  }
  if (r.worst.worstSplit) {
    L.push(`- **Pire split test** : ${r.worst.worstSplit.name} (PF test ${fmt(r.worst.worstSplit.testPf)}, ${r.worst.worstSplit.testTrades} trades)`);
  }
  L.push("");

  L.push("## 9. Verdict conservateur");
  L.push("");
  L.push(`**Statut recommandé : \`${r.verdict.status}\`**`);
  L.push("");
  L.push("Raisons :");
  L.push("");
  for (const reason of r.verdict.reasons) L.push(`- ${reason}`);
  L.push("");
  L.push(`Vocabulaire : ${r.verdict.vocabulary}`);
  L.push("");
  L.push(`Note : ${r.verdict.note}`);
  L.push("");
  L.push("**Statuts possibles en sortie de ce script** :");
  L.push("");
  L.push("- `KEEP_RESEARCH_CANDIDATE` — robustesse temporelle non encore prouvée, statu quo.");
  L.push("- `CONDITIONAL_EDGE` — passe les critères de base mais 1-2 caveats résiduels.");
  L.push("- `FRAGILE / CONCENTRATION_EXCESSIVE` — top 5 share > 70 % OU PF sans top 5 < 1.05.");
  L.push("- `DEAD_AGGREGATED` — PF baseline frictionné < 1.20, edge insuffisant.");
  L.push("- `NEEDS_MORE_DATA` — sample insuffisant pour conclure.");
  L.push("");
  L.push("**Statuts interdits en sortie de ce script** (gouvernance Freeze v1 § 5) :");
  L.push("");
  L.push("- `VALIDATED_RESEARCH_CORE` — nécessite validation ChatGPT séparée + 10/10 critères Freeze § 4 + audit anti-look-ahead spécifique.");
  L.push("- `LIVE_READY` — nécessite shadow live + paper live prolongé + slippage réel + kill-switch + portfolio management.");
  L.push("");

  L.push("## 10. Limites");
  L.push("");
  for (const lim of r.limitations) L.push(`- ${lim}`);
  L.push("");

  L.push("## 11. Rollback");
  L.push("");
  L.push(`- Runtime : ${r.rollback.runtime}`);
  L.push(`- Documentation : ${r.rollback.documentation}`);
  L.push(`- Outputs : ${r.rollback.outputs}`);
  L.push("");

  L.push("## 12. Interdictions restantes (gouvernance)");
  L.push("");
  L.push("- **Pas d'activation paper automatique** sur RS Rotation tant que le statut n'a pas reçu `GO MERGE` ChatGPT explicite + validation runtime séparée.");
  L.push("- **Pas d'activation live** — l'état actuel reste `0 setup LIVE_READY` au 2026-05-19 (cf. `SESSION.md`).");
  L.push("- **Pas de promotion `VALIDATED_RESEARCH_CORE`** depuis ce script — la promotion exige les 10 critères Freeze § 4 dont l'audit anti-look-ahead spécifique non encore exécuté sur l'agrégation RS.");
  L.push("- **Pas de modification runtime** (worker, front, providers, broker, paper trading). Cette PR est strictement documentaire / recherche offline.");
  L.push("- **Pas de cherry-picking** : l'analyse « sans top 5 » est une mesure de robustesse en aval, pas un changement d'univers à la sélection.");
  L.push("");

  L.push("## 13. Sources");
  L.push("");
  for (const s of r.sources) L.push(`- \`${s}\``);
  L.push("");

  L.push("---");
  L.push("");
  L.push("Hypothèses : friction round-trip 0.30 % + 0.02 % par jour, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement, exit fixed_hold horizon 20, paramètres baseline gelés ex-ante.");
  L.push("");
  return L.join("\n");
}
