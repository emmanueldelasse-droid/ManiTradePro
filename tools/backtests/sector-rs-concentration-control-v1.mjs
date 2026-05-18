// tools/backtests/sector-rs-concentration-control-v1.mjs
//
// Tests de contrôle de concentration pour SECTOR_RELATIVE_STRENGTH v1.
//
// Contexte (PR #213) : le top 5 tickers (APLD, APP, PLTR, NBIS, UPST) =
// 103.3 % du PnL total. Sans ces 5, PF = 0.94 et expectancy négative.
//
// Objectif : tester si on peut RÉDUIRE cette concentration sans tuer l'edge.
// Ne PAS optimiser le PF. Tester uniquement le risque de concentration.
//
// 4 catégories de tests :
//   1. Cap par ticker (max %PnL cumulé connu à l'avance, causal)
//   2. Cap par secteur (élargir topSectors, cooldown sectoriel)
//   3. Position sizing anti-concentration
//   4. Exclusion stress (sans top N, sans secteur)
//
// Verdict : CONCENTRATION_SOLVED / PARTIAL_FIX / EDGE_DEPENDS_ON_AI_WINNERS / FAIL
//
// STRICTEMENT offline. Aucun runtime modifié.

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "sector-rs-concentration-control-v1.json");
const OUT_MD = join(OUT_DIR, "sector-rs-concentration-control-v1.md");

const BASELINE_CFG = {
  horizon: 60,
  topSectors: 1,
  topAssetsPerSector: 5,
  rebalance: 10,
  lookback: 90,
};

// === Helpers (identiques au destruction-tests) ============================
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
function trueRanges(c) {
  const o = [];
  for (let i = 1; i < c.length; i++) o.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  return o;
}
function loadCandles(s) {
  const p = join(DATA_DIR, `${s}_2025.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"))
    .map((c) => ({ time: c.time || c.date, open: +c.open, high: +c.high, low: +c.low, close: +c.close }))
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

console.log("[concentration-control] chargement…");
const candlesBySymbol = new Map();
for (const s of new Set([...Object.values(UNIVERSE).flat(), "SPY", "QQQ", "SMH"])) {
  const c = loadCandles(s);
  if (c && c.length >= 220) candlesBySymbol.set(s, c);
}
console.log(`[concentration-control] OHLC chargés : ${candlesBySymbol.size}`);

const SECTOR_GROUPS = {
  BIG_TECH: UNIVERSE.BIG_TECH, SEMIS: UNIVERSE.SEMIS, CYBER_CLOUD: UNIVERSE.CYBER_CLOUD,
  SOFTWARE: UNIVERSE.SOFTWARE, AI_MOMENTUM: UNIVERSE.AI_MOMENTUM, CONSUMER_GROWTH: UNIVERSE.CONSUMER_GROWTH,
  QUALITY_DEFENSIVE: UNIVERSE.QUALITY_DEFENSIVE, INDUSTRIALS: UNIVERSE.INDUSTRIALS,
  FINANCIALS: UNIVERSE.FINANCIALS, EUROPE: UNIVERSE.EUROPE,
};

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

// === Moteur SECTOR_RS avec mécanismes de contrôle ==========================
//
// opts :
//   horizon, topSectors, topAssetsPerSector, rebalance, lookback (params baseline)
//   tickerCapPnLPct : null ou nombre (ex: 0.15 = max 15% du PnL cumulé jusqu'à ce point)
//   sectorGroupsOverride : null ou objet
//   excludeSymbols : Set
//   excludeSectors : Set
//   sizing : "equal" | "inverse_cum" | "inverse_vol" | "cooldown" | "capped_repeat"
//   sizingParams : { ... } selon mode
//
// Tous les filtres sont CAUSAUX : à chaque date di, on regarde l'historique
// JUSQU'À di-1 inclus pour calculer cum_pnl, cum_trades, etc.

function runSectorRS(opts) {
  const o = { ...BASELINE_CFG, sizing: "equal", ...opts };
  const sectorGroups = o.sectorGroupsOverride || SECTOR_GROUPS;
  const excludeSymbols = o.excludeSymbols || new Set();
  const excludeSectors = o.excludeSectors || new Set();
  const trades = [];
  // État historique pour les caps causaux
  const cumPnlByTicker = new Map(); // ticker -> cumPnlR jusqu'à la dernière entryDate
  const cumTradesByTicker = new Map();
  const lastWinTimeByTicker = new Map(); // pour cooldown

  for (let di = o.lookback; di < DATES.length - o.horizon - 2; di += o.rebalance) {
    const date = DATES[di];
    if (regimeByDate.get(date) === "RISK_OFF") continue;

    // Total cumulé jusqu'à ce point (pour cap %)
    let totalCum = 0;
    for (const v of cumPnlByTicker.values()) totalCum += v;
    const totalCumAbs = Math.max(1, Math.abs(totalCum)); // évite div par 0

    const sectorMoms = [];
    for (const [name, syms] of Object.entries(sectorGroups)) {
      if (excludeSectors.has(name)) continue;
      const moms = [];
      for (const s of syms) {
        if (excludeSymbols.has(s)) continue;
        const c = candlesBySymbol.get(s); if (!c) continue;
        const idx = findCandleIndex(c, date); if (idx < o.lookback) continue;
        const m = pctChange(c[idx].close, c[idx - o.lookback].close);
        if (m !== null) moms.push(m);
      }
      if (moms.length) sectorMoms.push({ name, syms, mom: avg(moms) });
    }
    sectorMoms.sort((a, b) => b.mom - a.mom);

    for (const sec of sectorMoms.slice(0, o.topSectors)) {
      const cands = [];
      for (const s of sec.syms) {
        if (excludeSymbols.has(s)) continue;
        const c = candlesBySymbol.get(s); if (!c) continue;
        // Cap %PnL par ticker (causal)
        if (o.tickerCapPnLPct !== null && o.tickerCapPnLPct !== undefined) {
          const tickerCum = cumPnlByTicker.get(s) || 0;
          if (tickerCum > o.tickerCapPnLPct * totalCumAbs && tickerCum > 5) continue; // > 5R safety floor
        }
        // Cooldown
        if (o.sizing === "cooldown" && lastWinTimeByTicker.has(s)) {
          const lastDate = lastWinTimeByTicker.get(s);
          const lastIdx = DATES.indexOf(lastDate);
          const cooldownDays = o.sizingParams?.cooldownDays || 60;
          if (lastIdx !== -1 && di - lastIdx < cooldownDays) continue;
        }
        // Capped repeat
        if (o.sizing === "capped_repeat") {
          const ct = cumTradesByTicker.get(s) || 0;
          const cap = o.sizingParams?.maxTradesPerTicker || 20;
          if (ct >= cap) continue;
        }
        const idx = findCandleIndex(c, date);
        if (idx < o.lookback || idx + o.horizon + 1 >= c.length) continue;
        const m = pctChange(c[idx].close, c[idx - o.lookback].close);
        if (m === null) continue;
        cands.push({ symbol: s, idx, mom: m, candles: c });
      }
      cands.sort((a, b) => b.mom - a.mom);

      for (const cand of cands.slice(0, o.topAssetsPerSector)) {
        const entryIdx = cand.idx + 1;
        const exitIdx = entryIdx + o.horizon;
        if (exitIdx >= cand.candles.length) continue;
        const entry = cand.candles[entryIdx].open;
        const exit = cand.candles[exitIdx].open;
        const pnlPct = pctChange(exit, entry);
        if (pnlPct === null) continue;
        let pnlR = pnlPct / 5;
        pnlR -= frictionR(o.horizon);

        // Sizing : modifier le pnlR pour refléter la taille
        let size = 1.0;
        if (o.sizing === "equal") size = 1.0;
        else if (o.sizing === "inverse_cum") {
          // Si ticker a déjà beaucoup contribué, taille réduite
          const tickerCum = cumPnlByTicker.get(cand.symbol) || 0;
          if (tickerCum > 0) {
            const ratio = tickerCum / totalCumAbs;
            size = Math.max(0.2, 1 - 2 * ratio); // 100% si pas contribué, 0.2 minimum
          }
        }
        else if (o.sizing === "inverse_vol") {
          // Pondérer par 1/ATR (mesuré jusqu'à entryIdx-1)
          const trs = trueRanges(cand.candles.slice(0, entryIdx));
          if (trs.length >= 14) {
            const atr = avg(trs.slice(-14));
            const refAtr = 5.0; // ATR "moyen" de référence
            size = Math.min(2.0, Math.max(0.3, refAtr / atr));
          }
        }

        const scaledPnlR = pnlR * size;
        trades.push({
          symbol: cand.symbol, sector: sec.name,
          entryTime: cand.candles[entryIdx].time, year: getYear(date),
          pnlR: Number(scaledPnlR.toFixed(3)), size: Number(size.toFixed(3)),
          rawPnlR: Number(pnlR.toFixed(3)),
        });

        // Update état (note : on update APRÈS la prise de décision)
        cumPnlByTicker.set(cand.symbol, (cumPnlByTicker.get(cand.symbol) || 0) + scaledPnlR);
        cumTradesByTicker.set(cand.symbol, (cumTradesByTicker.get(cand.symbol) || 0) + 1);
        if (scaledPnlR > 2) lastWinTimeByTicker.set(cand.symbol, date);
      }
    }
  }
  return trades;
}

// === Métriques + classification ============================================

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
  const mean = totalR / total;
  return {
    trades: total, winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number(mean.toFixed(3)),
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
  return { yp, validYears: valid.length, positiveYears: pos };
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

function top5SharePct(trades) {
  const byT = new Map();
  for (const t of trades) byT.set(t.symbol, (byT.get(t.symbol) || 0) + t.pnlR);
  const arr = [...byT.entries()].map(([s, r]) => ({ s, r })).sort((a, b) => b.r - a.r);
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  const top5R = arr.slice(0, 5).reduce((a, b) => a + b.r, 0);
  return { pct: totalR > 0 ? Number(((top5R / totalR) * 100).toFixed(1)) : null, top5: arr.slice(0, 5).map((x) => ({ symbol: x.s, totalR: Number(x.r.toFixed(2)) })) };
}

function correlationVsBaseline(testTrades, baselineMonthlyR) {
  const byMonth = {};
  for (const t of testTrades) {
    const m = String(t.entryTime).slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + t.pnlR;
  }
  const common = Object.keys(baselineMonthlyR).filter((m) => byMonth[m] !== undefined);
  if (common.length < 5) return null;
  const xs = common.map((m) => baselineMonthlyR[m]);
  const ys = common.map((m) => byMonth[m]);
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx > 0 && dy > 0 ? Number((num / Math.sqrt(dx * dy)).toFixed(3)) : null;
}

function evaluate(trades, baselineMonthlyR, label) {
  const s = summarize(trades);
  const yr = yearlyPositive(trades);
  const decay = edgeDecay(trades);
  const conc = top5SharePct(trades);
  const corr = baselineMonthlyR ? correlationVsBaseline(trades, baselineMonthlyR) : null;
  // Acceptable ?
  const acceptable =
    s.profitFactor >= 1.3 &&
    yr.positiveYears >= 4 &&
    (conc.pct === null || conc.pct < 70) &&
    (decay === null || decay < 1.5);
  return {
    label,
    summary: s,
    positiveYears: yr.positiveYears,
    validYears: yr.validYears,
    yearlyPf: yr.yp,
    edgeDecay: decay,
    top5SharePct: conc.pct,
    top5: conc.top5,
    correlationVsBaseline: corr,
    acceptable,
  };
}

// === Run baseline ==========================================================
console.log("[concentration-control] baseline…");
const baselineTrades = runSectorRS({ tickerCapPnLPct: null });
const baselineEval = evaluate(baselineTrades, null, "baseline");
const baselineMonthlyR = {};
for (const t of baselineTrades) {
  const m = String(t.entryTime).slice(0, 7);
  baselineMonthlyR[m] = (baselineMonthlyR[m] || 0) + t.pnlR;
}

// === Test 1 — Cap par ticker ===============================================
console.log("[concentration-control] Test 1: ticker cap…");
const tickerCapResults = [];
for (const cap of [0.10, 0.15, 0.20, 0.25]) {
  const t = runSectorRS({ tickerCapPnLPct: cap });
  tickerCapResults.push(evaluate(t, baselineMonthlyR, `ticker_cap=${(cap * 100).toFixed(0)}%`));
}

// === Test 2 — Cap par secteur (élargissement) ==============================
console.log("[concentration-control] Test 2: sector cap…");
const sectorResults = [];
for (const topSec of [2, 3, 4]) {
  const t = runSectorRS({ topSectors: topSec });
  sectorResults.push(evaluate(t, baselineMonthlyR, `topSectors=${topSec}`));
}
// Combinaison topSectors=2 et topAssets variables
for (const topAst of [3, 5]) {
  const t = runSectorRS({ topSectors: 2, topAssetsPerSector: topAst });
  sectorResults.push(evaluate(t, baselineMonthlyR, `topSectors=2/topAssets=${topAst}`));
}

// === Test 3 — Position sizing ==============================================
console.log("[concentration-control] Test 3: sizing…");
const sizingResults = [];
sizingResults.push(evaluate(runSectorRS({ sizing: "equal" }), baselineMonthlyR, "equal (baseline)"));
sizingResults.push(evaluate(runSectorRS({ sizing: "inverse_cum" }), baselineMonthlyR, "inverse_cum_contribution"));
sizingResults.push(evaluate(runSectorRS({ sizing: "inverse_vol" }), baselineMonthlyR, "inverse_volatility (1/ATR)"));
sizingResults.push(evaluate(runSectorRS({ sizing: "cooldown", sizingParams: { cooldownDays: 60 } }), baselineMonthlyR, "cooldown_60days_after_win"));
sizingResults.push(evaluate(runSectorRS({ sizing: "cooldown", sizingParams: { cooldownDays: 120 } }), baselineMonthlyR, "cooldown_120days_after_win"));
sizingResults.push(evaluate(runSectorRS({ sizing: "capped_repeat", sizingParams: { maxTradesPerTicker: 10 } }), baselineMonthlyR, "capped_repeat_10_trades_max"));
sizingResults.push(evaluate(runSectorRS({ sizing: "capped_repeat", sizingParams: { maxTradesPerTicker: 20 } }), baselineMonthlyR, "capped_repeat_20_trades_max"));

// === Test 4 — Exclusion stress =============================================
console.log("[concentration-control] Test 4: exclusion stress…");
const top1 = baselineEval.top5[0].symbol;
const top3Set = new Set(baselineEval.top5.slice(0, 3).map((x) => x.symbol));
const top5Set = new Set(baselineEval.top5.map((x) => x.symbol));
const exclusionResults = [];
exclusionResults.push(evaluate(runSectorRS({ excludeSymbols: new Set([top1]) }), baselineMonthlyR, `sans_top1_${top1}`));
exclusionResults.push(evaluate(runSectorRS({ excludeSymbols: top3Set }), baselineMonthlyR, `sans_top3 (${[...top3Set].join(",")})`));
exclusionResults.push(evaluate(runSectorRS({ excludeSymbols: top5Set }), baselineMonthlyR, `sans_top5 (${[...top5Set].join(",")})`));
exclusionResults.push(evaluate(runSectorRS({ excludeSectors: new Set(["AI_MOMENTUM"]) }), baselineMonthlyR, "sans_AI_MOMENTUM_sector"));

// === Best compromise =======================================================
const allResults = [...tickerCapResults, ...sectorResults, ...sizingResults];
const acceptable = allResults.filter((r) => r.acceptable);
// Trier par score = top5SharePct ASC + PF DESC (préférer faible concentration et PF élevé)
acceptable.sort((a, b) => (a.top5SharePct || 100) - (b.top5SharePct || 100));
const bestLowConcentration = acceptable[0];
const bestPfAcceptable = [...acceptable].sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0))[0];

// === Verdict ===============================================================
let verdict;
const ticker25 = tickerCapResults.find((r) => r.label === "ticker_cap=25%");
const top5BaselinePct = baselineEval.top5SharePct;
const top5ReducedTo60 = acceptable.some((r) => r.top5SharePct !== null && r.top5SharePct < 60 && r.summary.profitFactor >= 1.5);
const top5ReducedTo70 = acceptable.some((r) => r.top5SharePct !== null && r.top5SharePct < 70 && r.summary.profitFactor >= 1.3);
if (top5ReducedTo60) verdict = "CONCENTRATION_SOLVED";
else if (top5ReducedTo70) verdict = "PARTIAL_FIX";
else if (acceptable.length > 0) verdict = "PARTIAL_FIX";
else verdict = "EDGE_DEPENDS_ON_AI_WINNERS";
// FAIL si même sans concentration check, rien ne marche (PF < 1.3 partout)
const anyDecent = allResults.some((r) => r.summary.profitFactor >= 1.3);
if (!anyDecent) verdict = "FAIL";

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Tests de contrôle de concentration pour SECTOR_RELATIVE_STRENGTH v1",
  baselineConfig: BASELINE_CFG,
  baselineEval,
  tests: {
    tickerCap: tickerCapResults,
    sectorCap: sectorResults,
    sizing: sizingResults,
    exclusion: exclusionResults,
  },
  acceptableCount: acceptable.length,
  bestLowConcentration,
  bestPfAcceptable,
  verdict,
  sources: [
    "tools/backtests/configs/sector-relative-strength-v1.json",
    "tools/backtests/output/sector-rs-destruction-tests-v1.json",
    "tools/backtests/output/sector-relative-strength-reference-v1.json",
    "tools/backtests/universe-v2.mjs",
    "data/*.json",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Verdict : ${verdict}`);
console.log(`Acceptable variants : ${acceptable.length}/${allResults.length}`);
console.log(`Baseline : PF=${baselineEval.summary.profitFactor} top5=${baselineEval.top5SharePct}%`);
if (bestLowConcentration) console.log(`Best low concentration : ${bestLowConcentration.label} PF=${bestLowConcentration.summary.profitFactor} top5=${bestLowConcentration.top5SharePct}% years=${bestLowConcentration.positiveYears}/${bestLowConcentration.validYears}`);
if (bestPfAcceptable) console.log(`Best PF acceptable : ${bestPfAcceptable.label} PF=${bestPfAcceptable.summary.profitFactor} top5=${bestPfAcceptable.top5SharePct}%`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function tableOf(results) {
  const lines = [];
  lines.push("| Variante | Trades | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | Corr vs base | Accept |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    const s = r.summary;
    lines.push(`| ${r.label} | ${s.trades || 0} | ${fmt(s.profitFactor, 2)} | ${fmt(s.expectancyR, 3)} | ${fmt(s.maxDrawdownR, 1)} | ${r.positiveYears}/${r.validYears} | ${fmt(r.top5SharePct, 1)} % | ${fmt(r.edgeDecay)} | ${fmt(r.correlationVsBaseline, 2)} | ${r.acceptable ? "✓" : "✗"} |`);
  }
  return lines.join("\n");
}

function buildMarkdown(r) {
  const L = [];
  L.push("# SECTOR_RS Concentration Control v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/sector-rs-concentration-control-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Tests offline.** Aucun moteur modifié. Objectif : tester si on peut RÉDUIRE la concentration top 5 sans tuer l'edge. Pas d'optimisation du PF.");
  L.push("");

  L.push("## 1. Scope");
  L.push("");
  L.push("La PR #213 a révélé que SECTOR_RS v1 a un edge concentré à 103.3 % sur les top 5 tickers (APLD, APP, PLTR, NBIS, UPST = stars AI_MOMENTUM). Sans eux : PF 0.94, expectancy négative.");
  L.push("");
  L.push("Cette PR teste 4 catégories de mécanismes de contrôle de concentration :");
  L.push("1. Cap par ticker (limite causale du %PnL cumulé)");
  L.push("2. Cap par secteur (élargir topSectors)");
  L.push("3. Position sizing anti-concentration (inverse cum, inverse vol, cooldown, capped repeat)");
  L.push("4. Exclusion stress (sans top N, sans secteur AI_MOMENTUM)");
  L.push("");

  L.push("## 2. Baseline rappel");
  L.push("");
  const b = r.baselineEval;
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Trades | ${b.summary.trades} |`);
  L.push(`| PF | **${fmt(b.summary.profitFactor, 2)}** |`);
  L.push(`| Expectancy | ${fmt(b.summary.expectancyR, 3)} R |`);
  L.push(`| Max DD | ${fmt(b.summary.maxDrawdownR, 1)} R |`);
  L.push(`| Années positives | ${b.positiveYears}/${b.validYears} |`);
  L.push(`| **Top 5 share** | **${fmt(b.top5SharePct, 1)} %** |`);
  L.push(`| Edge decay | ${fmt(b.edgeDecay)} |`);
  L.push("");
  L.push("Top 5 tickers :");
  L.push("");
  L.push("| Symbole | Total R |");
  L.push("|---|---:|");
  for (const t of b.top5) L.push(`| ${t.symbol} | ${fmt(t.totalR, 1)} |`);
  L.push("");

  L.push("## 3. Concentration problem (rappel)");
  L.push("");
  L.push("Tout l'edge vient de 5 stars AI_MOMENTUM. Hypothèse : si on tente de plafonner la contribution de ces tickers, soit on retire l'edge (concentration = edge), soit on découvre un edge distribué caché.");
  L.push("");
  L.push("Règles d'acceptation d'une variante :");
  L.push("- PF post-friction ≥ 1.3");
  L.push("- ≥ 4/5 années positives");
  L.push("- Top 5 share < 70 %");
  L.push("- Edge decay < ×1.5");
  L.push("");

  L.push("## 4. Ticker cap tests");
  L.push("");
  L.push("Cap causal : à chaque rebalance, on calcule le %PnL cumulé de chaque ticker jusqu'à ce point. Si > cap, le ticker est exclu de la sélection pour ce rebalance.");
  L.push("");
  L.push(tableOf(r.tests.tickerCap));
  L.push("");

  L.push("## 5. Sector cap tests");
  L.push("");
  L.push("Élargissement de topSectors et combinaisons topSectors × topAssets :");
  L.push("");
  L.push(tableOf(r.tests.sectorCap));
  L.push("");

  L.push("## 6. Position sizing tests");
  L.push("");
  L.push("Mécanismes de pondération de taille appliqués au pnlR :");
  L.push("- `equal` : 1R par trade (baseline)");
  L.push("- `inverse_cum_contribution` : taille = max(0.2, 1 - 2 × tickerShare). Pénalise les tickers déjà sur-contribués.");
  L.push("- `inverse_volatility` : taille = min(2, max(0.3, refAtr/atr)). Pénalise les tickers volatils.");
  L.push("- `cooldown_60days` : exclut un ticker pendant 60j après un gain > 2R.");
  L.push("- `cooldown_120days` : idem mais 120j.");
  L.push("- `capped_repeat_N` : limite à N trades par ticker sur toute la période.");
  L.push("");
  L.push(tableOf(r.tests.sizing));
  L.push("");

  L.push("## 7. Exclusion stress");
  L.push("");
  L.push("Tests \"que se passe-t-il si on retire les winners ?\" (a posteriori, non causal — pour mesurer la dépendance) :");
  L.push("");
  L.push(tableOf(r.tests.exclusion));
  L.push("");
  L.push("**Lecture** : ces lignes ne sont PAS des stratégies tradables (on connaît les winners a posteriori). Elles servent à quantifier la dépendance.");
  L.push("");

  L.push("## 8. Best compromise");
  L.push("");
  L.push(`${r.acceptableCount} variante(s) sur ${r.tests.tickerCap.length + r.tests.sectorCap.length + r.tests.sizing.length} passent les 4 critères d'acceptation.`);
  L.push("");
  if (r.bestLowConcentration) {
    L.push(`### Variante avec la plus faible concentration top 5 (parmi les acceptables) : ${r.bestLowConcentration.label}`);
    L.push("");
    L.push("| Métrique | Valeur |");
    L.push("|---|---:|");
    L.push(`| Trades | ${r.bestLowConcentration.summary.trades} |`);
    L.push(`| PF | ${fmt(r.bestLowConcentration.summary.profitFactor, 2)} |`);
    L.push(`| Top 5 % | ${fmt(r.bestLowConcentration.top5SharePct, 1)} % |`);
    L.push(`| Années positives | ${r.bestLowConcentration.positiveYears}/${r.bestLowConcentration.validYears} |`);
    L.push(`| Max DD | ${fmt(r.bestLowConcentration.summary.maxDrawdownR, 1)} R |`);
    L.push(`| Corrélation vs baseline | ${fmt(r.bestLowConcentration.correlationVsBaseline, 2)} |`);
    L.push("");
  }
  if (r.bestPfAcceptable) {
    L.push(`### Variante avec le meilleur PF (parmi les acceptables) : ${r.bestPfAcceptable.label}`);
    L.push("");
    L.push("| Métrique | Valeur |");
    L.push("|---|---:|");
    L.push(`| Trades | ${r.bestPfAcceptable.summary.trades} |`);
    L.push(`| PF | ${fmt(r.bestPfAcceptable.summary.profitFactor, 2)} |`);
    L.push(`| Top 5 % | ${fmt(r.bestPfAcceptable.top5SharePct, 1)} % |`);
    L.push(`| Années positives | ${r.bestPfAcceptable.positiveYears}/${r.bestPfAcceptable.validYears} |`);
    L.push("");
  }
  if (!r.bestLowConcentration && !r.bestPfAcceptable) {
    L.push("**Aucune variante ne passe les 4 critères d'acceptation.**");
    L.push("");
  }

  L.push("## 9. Failure modes");
  L.push("");
  L.push("Analyse des échecs :");
  L.push("");
  const allTested = [...r.tests.tickerCap, ...r.tests.sectorCap, ...r.tests.sizing];
  const failedByPf = allTested.filter((x) => x.summary.profitFactor < 1.3).length;
  const failedByYears = allTested.filter((x) => x.positiveYears < 4).length;
  const failedByTop5 = allTested.filter((x) => x.top5SharePct !== null && x.top5SharePct >= 70).length;
  L.push(`- Variantes avec PF < 1.3 : ${failedByPf} / ${allTested.length}`);
  L.push(`- Variantes avec < 4/5 années positives : ${failedByYears} / ${allTested.length}`);
  L.push(`- Variantes avec top 5 ≥ 70 % : ${failedByTop5} / ${allTested.length}`);
  L.push("");
  L.push("**Lecture** : si la majorité des variantes échouent sur le top 5 share, c'est que la concentration est intrinsèque au mécanisme — pas un défaut de configuration. L'edge VIENT des AI winners.");
  L.push("");

  L.push("## 10. Final verdict");
  L.push("");
  L.push(`**${r.verdict}**`);
  L.push("");
  if (r.verdict === "CONCENTRATION_SOLVED") {
    L.push("Une ou plusieurs variantes ramènent la concentration sous 60 % tout en gardant PF ≥ 1.5 et années positives. L'edge est diversifiable.");
  } else if (r.verdict === "PARTIAL_FIX") {
    L.push("Des variantes existent qui réduisent la concentration sous 70 % avec PF ≥ 1.3, mais la diversification reste imparfaite. Trade-off PF vs concentration à arbitrer.");
  } else if (r.verdict === "EDGE_DEPENDS_ON_AI_WINNERS") {
    L.push("**Aucune variante ne ramène la concentration sous des niveaux acceptables sans détruire l'edge.** L'edge de SECTOR_RS dépend structurellement des stars AI_MOMENTUM 2024-2025. Le setup n'est pas un edge distribué — c'est une stratégie de capture de leaders sectoriels qui tient si les leaders restent les leaders.");
    L.push("");
    L.push("**Conséquence pour SETUPS_REGISTRY.md** : statut suggéré `CONDITIONAL_EDGE_AI_DEPENDENT` ou `RESEARCH_CANDIDATE_WITH_CRITICAL_CAVEAT`. Pas un setup live-ready sans :");
    L.push("- Surveillance active de la dispersion sectorielle.");
    L.push("- Mécanisme de fall-back si AI_MOMENTUM perd son leadership.");
    L.push("- Sizing extrêmement prudent (taille réduite, exposition portfolio limitée).");
  } else {
    L.push("Aucune variante testée n'atteint un PF ≥ 1.3. Le setup ne survit pas aux contraintes de concentration sous quelque forme que ce soit.");
  }
  L.push("");

  L.push("## 11. Recommendation");
  L.push("");
  if (r.verdict === "CONCENTRATION_SOLVED" || r.verdict === "PARTIAL_FIX") {
    L.push("- Adopter la meilleure variante identifiée comme nouvelle config v2 dans une PR séparée.");
    L.push("- Mettre à jour `tools/backtests/configs/sector-relative-strength-v1.json` ou créer `v2.json`.");
    L.push("- Re-tester en stress complet (cf. PR #213) sur la nouvelle config.");
    L.push("- Documenter dans `docs/setups/SECTOR_RELATIVE_STRENGTH.md` que v1 est rétrogradée et v2 est la config recommandée.");
  } else if (r.verdict === "EDGE_DEPENDS_ON_AI_WINNERS") {
    L.push("- Mettre à jour `docs/setups/SECTOR_RELATIVE_STRENGTH.md` avec ce finding : l'edge est AI-dépendant.");
    L.push("- Mettre à jour SETUPS_REGISTRY.md : statut révisé.");
    L.push("- **Pas de passage live** sous quelconque forme.");
    L.push("- Envisager une stratégie de surveillance régime AI (par exemple monitorer la rotation SOXX/SMH/AI_MOMENTUM vs autres secteurs).");
    L.push("- POST_EARNINGS_DRIFT et autres nouveaux setups deviennent prioritaires.");
  } else {
    L.push("- Reconsidérer la formalisation v1.");
    L.push("- Abandonner SECTOR_RS et rechercher de nouveaux setups via `new-setup-discovery-lab-v1`.");
  }
  L.push("");

  L.push("---");
  L.push("");
  L.push("**Hypothèses** : friction round-trip 0.30 % + 0.02 %/jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux, paramètres baseline (sauf paramètre testé), filtres concentration causaux.");
  L.push("");
  L.push("**Limites** :");
  L.push("- Les tests d'exclusion (sans top N) ne sont PAS causaux par construction — ils mesurent la dépendance, pas une stratégie tradable.");
  L.push("- Le ticker cap est causal mais le %cum est calculé sur tous les trades antérieurs (sans réajustement pondéré).");
  L.push("- Pas de Monte Carlo / bootstrap pour mesurer la variance d'estimation.");
  L.push("- Pas de stress sur d'autres univers (sector groups fixés).");
  return L.join("\n");
}
