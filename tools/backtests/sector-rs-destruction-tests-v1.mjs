// tools/backtests/sector-rs-destruction-tests-v1.mjs
//
// Tests de destruction pour SECTOR_RELATIVE_STRENGTH v1.
//
// Objectif : essayer de CASSER proprement le setup. Pas d'optimisation,
// pas d'amélioration. Tests de robustesse uniquement.
//
// 6 tests :
//   1. Friction stress (×1, ×2, ×3, slippage)
//   2. Bear market isolation (2022 seule, pires drawdowns)
//   3. Sector collapse stress (retirer top secteur)
//   4. Survivorship stress (concentration tickers)
//   5. Walk-forward conditionnel strict (3 splits)
//   6. Correlation vs RS Rotation
//
// Verdict : SURVIVES_STRESS / CONDITIONAL_SURVIVAL / FRAGILE_UNDER_STRESS / FAILS_STRESS
//
// CONTRAINTES :
//   - STRICTEMENT offline.
//   - Aucun moteur existant modifié.
//   - Paramètres baseline GELÉS (pas d'optimisation).

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "sector-rs-destruction-tests-v1.json");
const OUT_MD = join(OUT_DIR, "sector-rs-destruction-tests-v1.md");

// === Baseline gelée (config v1) ============================================
const BASELINE = {
  horizon: 60,
  topSectors: 1,
  topAssetsPerSector: 5,
  rebalance: 10,
  lookback: 90,
  regime: "NO_RISK_OFF",
};

const RS_ROTATION_BASELINE = {
  horizon: 120,
  topN: 10,
  rebalance: 10,
  lookback: 90,
  regime: "NO_RISK_OFF",
  universe: "mixed",
  minMomentum: 12,
};

// === Helpers ===============================================================

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
function loadCandles(s) {
  const p = join(DATA_DIR, `${s}_2025.json`);
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return raw.map((c) => ({ time: c.time || c.date, open: +c.open, high: +c.high, low: +c.low, close: +c.close }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}
function findCandleIndex(c, t) {
  let lo = 0, hi = c.length - 1;
  while (lo <= hi) { const m = (lo + hi) >>> 1; if (c[m].time === t) return m; if (c[m].time < t) lo = m + 1; else hi = m - 1; }
  return -1;
}
function getYear(t) { return String(t).slice(0, 4); }

// === Friction (paramétrable) ===============================================
function frictionRFactory(roundTripPct, dailyPct) {
  return (holdDays) => (roundTripPct + dailyPct * holdDays) / 5;
}
const FRICTION_BASELINE = frictionRFactory(0.30, 0.02);

// === Chargement ============================================================
console.log("[sector-rs-destruction] chargement…");
const candlesBySymbol = new Map();
const all = new Set([...Object.values(UNIVERSE).flat(), "SPY", "QQQ", "SMH"]);
for (const s of all) { const c = loadCandles(s); if (c && c.length >= 220) candlesBySymbol.set(s, c); }
console.log(`[sector-rs-destruction] OHLC chargés : ${candlesBySymbol.size}`);

const SECTOR_GROUPS = {
  BIG_TECH: UNIVERSE.BIG_TECH, SEMIS: UNIVERSE.SEMIS, CYBER_CLOUD: UNIVERSE.CYBER_CLOUD,
  SOFTWARE: UNIVERSE.SOFTWARE, AI_MOMENTUM: UNIVERSE.AI_MOMENTUM, CONSUMER_GROWTH: UNIVERSE.CONSUMER_GROWTH,
  QUALITY_DEFENSIVE: UNIVERSE.QUALITY_DEFENSIVE, INDUSTRIALS: UNIVERSE.INDUSTRIALS,
  FINANCIALS: UNIVERSE.FINANCIALS, EUROPE: UNIVERSE.EUROPE,
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
console.log(`[sector-rs-destruction] dates communes : ${DATES.length}`);

// === SECTOR_RS moteur ======================================================
function runSectorRS({ horizon, topSectors, topAssetsPerSector, rebalance, lookback, frictionFn, sectorGroupsOverride = null, dateFilter = null }) {
  const sectorGroups = sectorGroupsOverride || SECTOR_GROUPS;
  const trades = [];
  for (let di = lookback; di < DATES.length - horizon - 2; di += rebalance) {
    const date = DATES[di];
    if (regimeByDate.get(date) === "RISK_OFF") continue;
    if (dateFilter && !dateFilter(date)) continue;
    const sectorMoms = [];
    for (const [name, syms] of Object.entries(sectorGroups)) {
      const moms = [];
      for (const s of syms) {
        const c = candlesBySymbol.get(s); if (!c) continue;
        const idx = findCandleIndex(c, date); if (idx < lookback) continue;
        const m = pctChange(c[idx].close, c[idx - lookback].close);
        if (m !== null) moms.push(m);
      }
      if (moms.length) sectorMoms.push({ name, syms, mom: avg(moms) });
    }
    sectorMoms.sort((a, b) => b.mom - a.mom);
    for (const sec of sectorMoms.slice(0, topSectors)) {
      const cands = [];
      for (const s of sec.syms) {
        const c = candlesBySymbol.get(s); if (!c) continue;
        const idx = findCandleIndex(c, date);
        if (idx < lookback || idx + horizon + 1 >= c.length) continue;
        const m = pctChange(c[idx].close, c[idx - lookback].close);
        if (m === null) continue;
        cands.push({ symbol: s, idx, mom: m, candles: c });
      }
      cands.sort((a, b) => b.mom - a.mom);
      for (const cand of cands.slice(0, topAssetsPerSector)) {
        const entryIdx = cand.idx + 1;
        const exitIdx = entryIdx + horizon;
        if (exitIdx >= cand.candles.length) continue;
        const entry = cand.candles[entryIdx].open;
        const exit = cand.candles[exitIdx].open;
        let pnlR = pctChange(exit, entry) / 5;
        pnlR -= frictionFn(horizon);
        trades.push({
          symbol: cand.symbol, sector: sec.name,
          entryTime: cand.candles[entryIdx].time, year: getYear(date),
          regimeAtEntry: regimeByDate.get(date) || "RANGE",
          pnlR: Number(pnlR.toFixed(3)),
        });
      }
    }
  }
  return trades;
}

// === RS Rotation simple (référence comparaison) ===========================
function runRsRotation({ horizon, topN, rebalance, lookback, minMomentum, frictionFn }) {
  const universe = [...new Set(Object.values(UNIVERSE).flat())].filter((s) => candlesBySymbol.has(s));
  const trades = [];
  for (let di = lookback; di < DATES.length - horizon - 2; di += rebalance) {
    const date = DATES[di];
    if (regimeByDate.get(date) === "RISK_OFF") continue;
    const cands = [];
    for (const s of universe) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < lookback || idx + horizon + 1 >= c.length) continue;
      const m = pctChange(c[idx].close, c[idx - lookback].close);
      if (m === null || m < minMomentum) continue;
      cands.push({ symbol: s, idx, mom: m, candles: c });
    }
    cands.sort((a, b) => b.mom - a.mom);
    for (const cand of cands.slice(0, topN)) {
      const entryIdx = cand.idx + 1;
      const exitIdx = entryIdx + horizon;
      if (exitIdx >= cand.candles.length) continue;
      const entry = cand.candles[entryIdx].open;
      const exit = cand.candles[exitIdx].open;
      let pnlR = pctChange(exit, entry) / 5;
      pnlR -= frictionFn(horizon);
      trades.push({
        symbol: cand.symbol, entryTime: cand.candles[entryIdx].time, year: getYear(date),
        regimeAtEntry: regimeByDate.get(date) || "RANGE", pnlR: Number(pnlR.toFixed(3)),
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
  const mean = totalR / total;
  return {
    trades: total, wins: wins.length, losses: losses.length,
    winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number(mean.toFixed(3)),
    profitFactor: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
  };
}
function yearlyPf(trades) {
  const yp = {};
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const ts = trades.filter((t) => t.year === y);
    if (!ts.length) { yp[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    yp[y] = gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(2));
  }
  return yp;
}

// === Test 1 — Friction stress ==============================================
console.log("[sector-rs-destruction] Test 1: friction stress…");
const frictionStress = [];
for (const cfg of [
  { name: "baseline (x1)", round: 0.30, daily: 0.02 },
  { name: "friction x2", round: 0.60, daily: 0.04 },
  { name: "friction x3", round: 0.90, daily: 0.06 },
  { name: "slippage 0.10% one-way (round 0.40%)", round: 0.40, daily: 0.02 },
  { name: "slippage 0.20% one-way (round 0.60%)", round: 0.60, daily: 0.02 },
  { name: "extreme (round 1.20% + 0.10%/d)", round: 1.20, daily: 0.10 },
]) {
  const fr = frictionRFactory(cfg.round, cfg.daily);
  const trades = runSectorRS({ ...BASELINE, frictionFn: fr });
  const s = summarize(trades);
  const yp = yearlyPf(trades);
  const positive = ["2021", "2022", "2023", "2024", "2025"].filter((y) => yp[y] !== null && yp[y] >= 1.0).length;
  frictionStress.push({
    cfg: cfg.name, roundTripPct: cfg.round, dailyPct: cfg.daily,
    trades: s.trades, profitFactor: s.profitFactor, expectancyR: s.expectancyR, maxDD: s.maxDrawdownR,
    yearsPositive: positive, yearlyPf: yp,
  });
}

// === Test 2 — Bear market isolation =======================================
console.log("[sector-rs-destruction] Test 2: bear market…");
const allTrades = runSectorRS({ ...BASELINE, frictionFn: FRICTION_BASELINE });
const bearMarket = {};
for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
  const ts = allTrades.filter((t) => t.year === y);
  bearMarket[y] = summarize(ts);
}
// Pires drawdowns rolling (en sliding window)
const window = 90; // 90 trades
const ddWindows = [];
for (let i = window; i < allTrades.length; i += 30) {
  const slice = allTrades.slice(i - window, i);
  ddWindows.push({ endIdx: i, period: `${slice[0].entryTime}..${slice[slice.length - 1].entryTime}`, summary: summarize(slice) });
}
ddWindows.sort((a, b) => b.summary.maxDrawdownR - a.summary.maxDrawdownR);
const worstWindows = ddWindows.slice(0, 5);

// Phases RANGE
const rangeTrades = allTrades.filter((t) => t.regimeAtEntry === "RANGE");
const riskOnTrades = allTrades.filter((t) => t.regimeAtEntry === "RISK_ON");
const bearSummary = {
  worst2022: bearMarket["2022"],
  rangeRegime: summarize(rangeTrades),
  riskOnRegime: summarize(riskOnTrades),
  worstWindows: worstWindows,
};

// === Test 3 — Sector collapse stress ======================================
console.log("[sector-rs-destruction] Test 3: sector collapse…");
const sectorCollapse = [];
// 3a : retirer chacun des secteurs un par un, mesurer impact
for (const removed of Object.keys(SECTOR_GROUPS)) {
  const reduced = { ...SECTOR_GROUPS };
  delete reduced[removed];
  const trades = runSectorRS({ ...BASELINE, sectorGroupsOverride: reduced, frictionFn: FRICTION_BASELINE });
  const s = summarize(trades);
  sectorCollapse.push({ removedSector: removed, ...s });
}
// 3b : ne garder que 5 secteurs core (sans tech_ai concentration)
const conservativeGroups = {
  QUALITY_DEFENSIVE: SECTOR_GROUPS.QUALITY_DEFENSIVE,
  INDUSTRIALS: SECTOR_GROUPS.INDUSTRIALS,
  FINANCIALS: SECTOR_GROUPS.FINANCIALS,
  CONSUMER_GROWTH: SECTOR_GROUPS.CONSUMER_GROWTH,
  EUROPE: SECTOR_GROUPS.EUROPE,
};
const conservativeTrades = runSectorRS({ ...BASELINE, sectorGroupsOverride: conservativeGroups, frictionFn: FRICTION_BASELINE });
const conservativeSummary = summarize(conservativeTrades);

// === Test 4 — Survivorship / ticker concentration =========================
console.log("[sector-rs-destruction] Test 4: survivorship/concentration…");
const tickerStats = new Map();
for (const t of allTrades) {
  const e = tickerStats.get(t.symbol) || { trades: 0, totalR: 0 };
  e.trades++;
  e.totalR += t.pnlR;
  tickerStats.set(t.symbol, e);
}
const tickerArr = [...tickerStats.entries()].map(([s, v]) => ({ symbol: s, trades: v.trades, totalR: Number(v.totalR.toFixed(2)) }));
tickerArr.sort((a, b) => b.totalR - a.totalR);
const grandTotal = tickerArr.reduce((a, b) => a + b.totalR, 0);
const top5 = tickerArr.slice(0, 5);
const top5Total = top5.reduce((a, b) => a + b.totalR, 0);
const top5Share = grandTotal > 0 ? top5Total / grandTotal : null;
const top10 = tickerArr.slice(0, 10);
const top10Total = top10.reduce((a, b) => a + b.totalR, 0);
const top10Share = grandTotal > 0 ? top10Total / grandTotal : null;
// Que se passe-t-il si on retire les top 5 tickers ?
const top5Symbols = new Set(top5.map((t) => t.symbol));
const withoutTop5 = allTrades.filter((t) => !top5Symbols.has(t.symbol));
const survivorshipSummary = {
  totalTickers: tickerArr.length,
  topTickerName: tickerArr[0]?.symbol,
  topTickerR: tickerArr[0]?.totalR,
  top5Tickers: top5,
  top5SharePct: top5Share !== null ? Number((top5Share * 100).toFixed(1)) : null,
  top10SharePct: top10Share !== null ? Number((top10Share * 100).toFixed(1)) : null,
  withoutTop5: summarize(withoutTop5),
};

// === Test 5 — Walk-forward conditionnel strict =============================
console.log("[sector-rs-destruction] Test 5: walk-forward…");
const splits = [
  { name: "S1: train 2021-2022 → test 2023", testYears: ["2023"] },
  { name: "S2: train 2021-2023 → test 2024", testYears: ["2024"] },
  { name: "S3: train 2021-2024 → test 2025", testYears: ["2025"] },
];
const walkForward = [];
for (const sp of splits) {
  const testTrades = allTrades.filter((t) => sp.testYears.includes(t.year));
  const s = summarize(testTrades);
  walkForward.push({ split: sp.name, ...s, passed: s.profitFactor >= 1.0 && s.expectancyR > 0 });
}
const walkForwardPassed = walkForward.filter((w) => w.passed).length;

// === Test 6 — Correlation vs RS Rotation =================================
console.log("[sector-rs-destruction] Test 6: correlation vs RS Rotation…");
const rsTrades = runRsRotation({ ...RS_ROTATION_BASELINE, frictionFn: FRICTION_BASELINE });
// Symbol overlap
const sectorSymbols = new Set(allTrades.map((t) => t.symbol));
const rsSymbols = new Set(rsTrades.map((t) => t.symbol));
const overlapSymbols = [...sectorSymbols].filter((s) => rsSymbols.has(s));
// Date overlap (mêmes entryTime ?)
const sectorEntries = new Set(allTrades.map((t) => `${t.symbol}|${t.entryTime}`));
const rsEntries = new Set(rsTrades.map((t) => `${t.symbol}|${t.entryTime}`));
const sharedEntries = [...sectorEntries].filter((k) => rsEntries.has(k));
// PnL correlation : alignement par mois
function monthlyR(trades) {
  const byMonth = {};
  for (const t of trades) {
    const m = String(t.entryTime).slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + t.pnlR;
  }
  return byMonth;
}
const secMonthly = monthlyR(allTrades);
const rsMonthly = monthlyR(rsTrades);
const commonMonths = Object.keys(secMonthly).filter((m) => rsMonthly[m] !== undefined).sort();
function correlation(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}
const corrPnL = correlation(commonMonths.map((m) => secMonthly[m]), commonMonths.map((m) => rsMonthly[m]));
// Mois où setups divergent fort
const divergence = commonMonths.map((m) => ({ month: m, sectorR: Number(secMonthly[m].toFixed(2)), rsR: Number(rsMonthly[m].toFixed(2)), diff: Number((secMonthly[m] - rsMonthly[m]).toFixed(2)) }));
divergence.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
const correlationSummary = {
  sectorRsTrades: allTrades.length,
  rsRotationTrades: rsTrades.length,
  uniqueSectorSymbols: sectorSymbols.size,
  uniqueRsSymbols: rsSymbols.size,
  symbolOverlap: overlapSymbols.length,
  symbolOverlapPct: Number(((overlapSymbols.length / Math.min(sectorSymbols.size, rsSymbols.size)) * 100).toFixed(1)),
  sharedEntries: sharedEntries.length,
  sharedEntriesPct: Number(((sharedEntries.length / Math.min(sectorEntries.size, rsEntries.size)) * 100).toFixed(1)),
  monthsCommon: commonMonths.length,
  pnlCorrelation: corrPnL !== null ? Number(corrPnL.toFixed(3)) : null,
  topDivergenceMonths: divergence.slice(0, 10),
};

// === Verdict global ========================================================

const baselineSummary = summarize(allTrades);
const baselineYp = yearlyPf(allTrades);
const baselinePos = ["2021", "2022", "2023", "2024", "2025"].filter((y) => baselineYp[y] !== null && baselineYp[y] >= 1.0).length;

const checks = {
  pf_x2_above_1_3: frictionStress[1].profitFactor >= 1.3,
  pf_x3_above_1_1: frictionStress[2].profitFactor >= 1.1,
  bear_2022_ok: bearSummary.worst2022.profitFactor >= 0.95,
  walk_forward_2of3: walkForwardPassed >= 2,
  no_excessive_concentration: survivorshipSummary.top5SharePct === null || survivorshipSummary.top5SharePct < 60,
  correlation_not_total: correlationSummary.pnlCorrelation === null || correlationSummary.pnlCorrelation < 0.85,
};

const failedChecks = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
let verdict;
if (failedChecks.length === 0) verdict = "SURVIVES_STRESS";
else if (failedChecks.length <= 1) verdict = "CONDITIONAL_SURVIVAL";
else if (failedChecks.length <= 3) verdict = "FRAGILE_UNDER_STRESS";
else verdict = "FAILS_STRESS";

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Tests de destruction pour SECTOR_RELATIVE_STRENGTH v1 (config gelée)",
  baselineConfig: BASELINE,
  baselineMetrics: {
    ...baselineSummary,
    yearlyPf: baselineYp,
    yearsPositive: baselinePos,
  },
  tests: {
    frictionStress,
    bearMarket: bearSummary,
    sectorCollapse: { removeOneSector: sectorCollapse, conservativeOnly: conservativeSummary },
    survivorship: survivorshipSummary,
    walkForward: { splits: walkForward, passed: walkForwardPassed, totalSplits: 3 },
    correlation: correlationSummary,
  },
  checks,
  failedChecks,
  verdict,
  sources: [
    "docs/setups/SECTOR_RELATIVE_STRENGTH.md",
    "tools/backtests/configs/sector-relative-strength-v1.json",
    "tools/backtests/output/sector-relative-strength-reference-v1.json",
    "tools/backtests/output/new-setup-discovery-lab-v1.json",
    "tools/backtests/output/rs-rotation-robustness-lab-v1.json",
    "tools/backtests/universe-v2.mjs",
    "data/*.json",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Verdict : ${verdict}`);
console.log(`Checks passed : ${Object.values(checks).filter((v) => v).length}/${Object.keys(checks).length}`);
if (failedChecks.length) console.log(`Failed : ${failedChecks.join(", ")}`);
console.log(`PF baseline : ${baselineSummary.profitFactor}`);
console.log(`PF friction x2 : ${frictionStress[1].profitFactor}`);
console.log(`PF friction x3 : ${frictionStress[2].profitFactor}`);
console.log(`PF bear 2022 : ${bearSummary.worst2022.profitFactor}`);
console.log(`Walk-forward : ${walkForwardPassed}/3`);
console.log(`Top 5 ticker share : ${survivorshipSummary.top5SharePct}%`);
console.log(`Correlation vs RS Rotation : ${correlationSummary.pnlCorrelation}`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function buildMarkdown(r) {
  const L = [];
  L.push("# SECTOR_RS Destruction Tests v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/sector-rs-destruction-tests-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Tests offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Objectif : essayer de CASSER SECTOR_RELATIVE_STRENGTH v1, pas l'améliorer.");
  L.push("");

  L.push("## 1. Scope");
  L.push("");
  L.push("Stress-testing du setup `SECTOR_RELATIVE_STRENGTH v1` (PR #212, classification `VALIDATED_RESEARCH_CORE`).");
  L.push("");
  L.push("6 tests de destruction :");
  L.push("1. Friction stress (×1 baseline → ×3 + slippage variations)");
  L.push("2. Bear market isolation (2022 seule, pires drawdowns rolling)");
  L.push("3. Sector collapse stress (retirer chaque secteur)");
  L.push("4. Survivorship / concentration tickers");
  L.push("5. Walk-forward conditionnel strict (3 splits sans réoptimisation)");
  L.push("6. Correlation vs RS Rotation simple");
  L.push("");
  L.push("**Paramètres gelés (config v1)** :");
  L.push("```text");
  L.push(JSON.stringify(r.baselineConfig, null, 2));
  L.push("```");
  L.push("");

  L.push("## 2. Sources analysées");
  L.push("");
  for (const s of r.sources) L.push(`- ${s}`);
  L.push("");

  L.push("## 3. Baseline rappel");
  L.push("");
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Trades | ${r.baselineMetrics.trades} |`);
  L.push(`| Winrate | ${fmt(r.baselineMetrics.winrate)} % |`);
  L.push(`| Expectancy | ${fmt(r.baselineMetrics.expectancyR, 3)} R |`);
  L.push(`| Profit factor | **${fmt(r.baselineMetrics.profitFactor, 2)}** |`);
  L.push(`| Max DD | ${fmt(r.baselineMetrics.maxDrawdownR, 1)} R |`);
  L.push(`| Total R | ${fmt(r.baselineMetrics.totalR, 1)} |`);
  L.push(`| Années positives | ${r.baselineMetrics.yearsPositive}/5 |`);
  L.push("");

  L.push("## 4. Friction stress");
  L.push("");
  L.push("| Configuration | Trades | PF | Expectancy R | Max DD R | Années + |");
  L.push("|---|---:|---:|---:|---:|---:|");
  for (const f of r.tests.frictionStress) {
    L.push(`| ${f.cfg} | ${f.trades} | ${fmt(f.profitFactor, 2)} | ${fmt(f.expectancyR, 3)} | ${fmt(f.maxDD, 1)} | ${f.yearsPositive}/5 |`);
  }
  L.push("");
  L.push("**Point de rupture** : ");
  const breakpt = r.tests.frictionStress.findIndex((f) => f.profitFactor < 1.0);
  if (breakpt === -1) L.push("le setup tient à friction extrême (round-trip 1.20 % + 0.10 %/jour).");
  else L.push(`PF tombe sous 1.0 à la configuration "${r.tests.frictionStress[breakpt].cfg}".`);
  L.push("");

  L.push("## 5. Bear market isolation");
  L.push("");
  L.push("PF annuel :");
  L.push("");
  L.push("| Année | Trades | Wins | Losses | Winrate | PF | Expectancy R | Max DD R |");
  L.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const s = r.tests.bearMarket.worst2022 && y === "2022" ? r.tests.bearMarket.worst2022 : null;
    const bm = s || r.baselineMetrics.yearlyPf;
  }
  // Better: use baselineMetrics.yearlyPf + summarize per year
  // Use baseline metrics yearly counts from JSON
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const ypValue = r.baselineMetrics.yearlyPf[y];
    L.push(`| ${y} | — | — | — | — | ${fmt(ypValue, 2)} | — | — |`);
  }
  L.push("");
  L.push("**Focus 2022** (year of bear) :");
  L.push("");
  const w2022 = r.tests.bearMarket.worst2022;
  L.push(`- Trades : ${w2022.trades || 0}`);
  L.push(`- PF : **${fmt(w2022.profitFactor, 2)}**`);
  L.push(`- Expectancy : ${fmt(w2022.expectancyR, 3)} R`);
  L.push(`- Max DD : ${fmt(w2022.maxDrawdownR, 1)} R`);
  L.push("");
  L.push("**Top 5 pires fenêtres glissantes (90 trades)** :");
  L.push("");
  L.push("| Période | Trades | PF | Expectancy R | Max DD R |");
  L.push("|---|---:|---:|---:|---:|");
  for (const w of r.tests.bearMarket.worstWindows) {
    L.push(`| ${w.period} | ${w.summary.trades} | ${fmt(w.summary.profitFactor, 2)} | ${fmt(w.summary.expectancyR, 3)} | ${fmt(w.summary.maxDrawdownR, 1)} |`);
  }
  L.push("");
  L.push("**Par régime de marché** :");
  L.push("");
  L.push("| Régime | Trades | PF | Expectancy R |");
  L.push("|---|---:|---:|---:|");
  L.push(`| RISK_ON | ${r.tests.bearMarket.riskOnRegime.trades || 0} | ${fmt(r.tests.bearMarket.riskOnRegime.profitFactor, 2)} | ${fmt(r.tests.bearMarket.riskOnRegime.expectancyR, 3)} |`);
  L.push(`| RANGE | ${r.tests.bearMarket.rangeRegime.trades || 0} | ${fmt(r.tests.bearMarket.rangeRegime.profitFactor, 2)} | ${fmt(r.tests.bearMarket.rangeRegime.expectancyR, 3)} |`);
  L.push("");

  L.push("## 6. Sector collapse stress");
  L.push("");
  L.push("### 6a. Retirer un secteur à la fois");
  L.push("");
  L.push("| Secteur retiré | Trades | PF | Expectancy R | Max DD R | Total R |");
  L.push("|---|---:|---:|---:|---:|---:|");
  for (const s of r.tests.sectorCollapse.removeOneSector) {
    L.push(`| ${s.removedSector} | ${s.trades || 0} | ${fmt(s.profitFactor, 2)} | ${fmt(s.expectancyR, 3)} | ${fmt(s.maxDrawdownR, 1)} | ${fmt(s.totalR, 1)} |`);
  }
  L.push("");
  L.push("### 6b. Univers conservateur (sans tech/IA, sans semis, sans crypto-equity)");
  L.push("");
  L.push("Garder uniquement QUALITY_DEFENSIVE, INDUSTRIALS, FINANCIALS, CONSUMER_GROWTH, EUROPE :");
  L.push("");
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Trades | ${r.tests.sectorCollapse.conservativeOnly.trades || 0} |`);
  L.push(`| PF | **${fmt(r.tests.sectorCollapse.conservativeOnly.profitFactor, 2)}** |`);
  L.push(`| Expectancy | ${fmt(r.tests.sectorCollapse.conservativeOnly.expectancyR, 3)} R |`);
  L.push(`| Max DD | ${fmt(r.tests.sectorCollapse.conservativeOnly.maxDrawdownR, 1)} R |`);
  L.push("");

  L.push("## 7. Survivorship / concentration tickers");
  L.push("");
  const sv = r.tests.survivorship;
  L.push(`- Tickers uniques tradés : ${sv.totalTickers}`);
  L.push(`- Top ticker : **${sv.topTickerName}** avec ${fmt(sv.topTickerR, 1)} R cumulés`);
  L.push(`- **Top 5 tickers** : ${fmt(sv.top5SharePct, 1)} % du PnL total`);
  L.push(`- **Top 10 tickers** : ${fmt(sv.top10SharePct, 1)} % du PnL total`);
  L.push("");
  L.push("Top 5 :");
  L.push("");
  L.push("| Symbole | Trades | Total R |");
  L.push("|---|---:|---:|");
  for (const t of sv.top5Tickers) {
    L.push(`| ${t.symbol} | ${t.trades} | ${fmt(t.totalR, 2)} |`);
  }
  L.push("");
  L.push("**Sans les top 5 tickers** :");
  L.push("");
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Trades | ${sv.withoutTop5.trades || 0} |`);
  L.push(`| PF | ${fmt(sv.withoutTop5.profitFactor, 2)} |`);
  L.push(`| Expectancy | ${fmt(sv.withoutTop5.expectancyR, 3)} R |`);
  L.push("");

  L.push("## 8. Walk-forward strict (paramètres gelés, pas de réoptim)");
  L.push("");
  L.push("| Split | Trades | PF | Expectancy R | Max DD R | Passed |");
  L.push("|---|---:|---:|---:|---:|---|");
  for (const w of r.tests.walkForward.splits) {
    L.push(`| ${w.split} | ${w.trades || 0} | ${fmt(w.profitFactor, 2)} | ${fmt(w.expectancyR, 3)} | ${fmt(w.maxDrawdownR, 1)} | ${w.passed ? "✓" : "✗"} |`);
  }
  L.push("");
  L.push(`**${r.tests.walkForward.passed}/${r.tests.walkForward.totalSplits} splits passent** (PF ≥ 1.0 et expectancy > 0).`);
  L.push("");

  L.push("## 9. Correlation vs RS Rotation");
  L.push("");
  const co = r.tests.correlation;
  L.push("| Métrique | SECTOR_RS | RS Rotation simple |");
  L.push("|---|---:|---:|");
  L.push(`| Trades total | ${co.sectorRsTrades} | ${co.rsRotationTrades} |`);
  L.push(`| Symboles uniques | ${co.uniqueSectorSymbols} | ${co.uniqueRsSymbols} |`);
  L.push("");
  L.push(`- **Symbol overlap** : ${co.symbolOverlap} symboles communs (${fmt(co.symbolOverlapPct, 1)} % du plus petit set)`);
  L.push(`- **Trade overlap exact** : ${co.sharedEntries} entries identiques (symbol+date), soit ${fmt(co.sharedEntriesPct, 1)} %`);
  L.push(`- **Mois communs** : ${co.monthsCommon}`);
  L.push(`- **Corrélation des PnL mensuels** : **${fmt(co.pnlCorrelation, 3)}**`);
  L.push("");
  if (co.pnlCorrelation !== null) {
    if (co.pnlCorrelation > 0.85) L.push("→ Corrélation très élevée. SECTOR_RS est probablement une version filtrée de RS Rotation, pas un edge distinct.");
    else if (co.pnlCorrelation > 0.6) L.push("→ Corrélation modérée. Les deux setups partagent des trades mais divergent sur certaines périodes.");
    else L.push("→ Corrélation faible. Les setups sont substantiellement différents — complémentarité possible.");
  }
  L.push("");
  L.push("**Top 10 mois de divergence (où les deux setups donnent des résultats opposés ou très différents)** :");
  L.push("");
  L.push("| Mois | SECTOR_RS R | RS Rotation R | Diff |");
  L.push("|---|---:|---:|---:|");
  for (const m of co.topDivergenceMonths) {
    L.push(`| ${m.month} | ${m.sectorR} | ${m.rsR} | ${m.diff > 0 ? "+" : ""}${m.diff} |`);
  }
  L.push("");

  L.push("## 10. Failure modes");
  L.push("");
  L.push("Checks de robustesse :");
  L.push("");
  L.push("| Check | Critère | Résultat |");
  L.push("|---|---|---|");
  L.push(`| PF friction ×2 | ≥ 1.3 | PF = ${fmt(r.tests.frictionStress[1].profitFactor, 2)} → ${r.checks.pf_x2_above_1_3 ? "✓ PASS" : "✗ FAIL"} |`);
  L.push(`| PF friction ×3 | ≥ 1.1 | PF = ${fmt(r.tests.frictionStress[2].profitFactor, 2)} → ${r.checks.pf_x3_above_1_1 ? "✓ PASS" : "✗ FAIL"} |`);
  L.push(`| Bear 2022 | PF ≥ 0.95 | PF = ${fmt(r.tests.bearMarket.worst2022.profitFactor, 2)} → ${r.checks.bear_2022_ok ? "✓ PASS" : "✗ FAIL"} |`);
  L.push(`| Walk-forward | ≥ 2/3 splits | ${r.tests.walkForward.passed}/3 → ${r.checks.walk_forward_2of3 ? "✓ PASS" : "✗ FAIL"} |`);
  L.push(`| Concentration top 5 | < 60 % | ${fmt(r.tests.survivorship.top5SharePct, 1)} % → ${r.checks.no_excessive_concentration ? "✓ PASS" : "✗ FAIL"} |`);
  L.push(`| Corrélation vs RS Rotation | < 0.85 | ${fmt(r.tests.correlation.pnlCorrelation, 3)} → ${r.checks.correlation_not_total ? "✓ PASS" : "✗ FAIL"} |`);
  L.push("");
  if (r.failedChecks.length) {
    L.push(`**Checks échoués** : ${r.failedChecks.join(", ")}`);
  } else {
    L.push("**Tous les checks passent.**");
  }
  L.push("");

  L.push("## 11. Verdict");
  L.push("");
  L.push(`**${r.verdict}**`);
  L.push("");
  if (r.verdict === "SURVIVES_STRESS") {
    L.push("Le setup résiste aux 6 tests de destruction. SECTOR_RS v1 conserve son statut **VALIDATED_RESEARCH_CORE**.");
    L.push("");
    L.push("Le setup est désormais un candidat sérieux pour les étapes suivantes (sizing, shadow live, friction réelle).");
  } else if (r.verdict === "CONDITIONAL_SURVIVAL") {
    L.push("Le setup résiste à la majorité des tests mais échoue sur 1 check. À documenter et surveiller.");
    L.push("");
    L.push("Statut suggéré : **VALIDATED_RESEARCH_CORE avec caveat**. Le check échoué doit être adressé avant tout passage live.");
  } else if (r.verdict === "FRAGILE_UNDER_STRESS") {
    L.push("Le setup échoue sur 2-3 checks. Statut suggéré : **RESEARCH_CANDIDATE_WITH_RISK** — rétrograder.");
    L.push("");
    L.push("Le PF baseline élevé peut cacher des vulnérabilités structurelles. Pas un setup live-ready.");
  } else {
    L.push("Le setup échoue sur 4+ checks. Statut suggéré : **CONDITIONAL_EDGE_ONLY** ou abandon.");
    L.push("");
    L.push("Le PF baseline n'est pas un indicateur de robustesse. Reconsidérer la formalisation v1.");
  }
  L.push("");

  L.push("## 12. Next steps");
  L.push("");
  if (r.verdict === "SURVIVES_STRESS" || r.verdict === "CONDITIONAL_SURVIVAL") {
    L.push("- **Audit anti-look-ahead spécifique** sur le calcul du momentum sectoriel agrégé (cohérence PR #207/#208).");
    L.push("- **Sizing dynamique** : ATR-based ou volatility targeting plutôt que taille fixe = 1R.");
    L.push("- **Live shadow** : 3-6 mois de paper trading parallèle avant tout passage réel.");
    L.push("- **Mise à jour SETUPS_REGISTRY.md** : ajouter Setup 7 SECTOR_RELATIVE_STRENGTH avec statut officiel.");
  }
  if (r.verdict === "FRAGILE_UNDER_STRESS" || r.verdict === "FAILS_STRESS") {
    L.push("- **Rétrograder le statut** dans SETUPS_REGISTRY.md.");
    L.push("- **Diagnostiquer les checks échoués** : creuser pourquoi (concentration, friction sensibility, etc.).");
    L.push("- **Pas de passage live** sous quelconque forme.");
  }
  L.push("- **Si concentration top 5 élevée** : envisager position sizing inverse (taille réduite sur tickers concentrés).");
  L.push("- **Si corrélation élevée vs RS Rotation** : pas d'allocation multi-setup parallèle (redondance).");
  L.push("- **POST_EARNINGS_DRIFT** : sourcer les données pour test futur (cf. new-setup-discovery-lab section 3).");
  L.push("");

  L.push("---");
  L.push("");
  L.push("**Hypothèses** : friction modélisée comme `(round + daily × hold) / 5`, paramètres baseline gelés v1, indicateurs causaux, NEXT_OPEN systématique, pas de short side, pas de sizing dynamique.");
  L.push("");
  L.push("**Limites** :");
  L.push("- Sector collapse simulé par retrait de secteurs entiers, pas par injection de drawdowns synthétiques.");
  L.push("- Walk-forward sans réoptim (paramètres gelés) — donc test de la généralisation des params v1, pas du potentiel max d'adaptation.");
  L.push("- Correlation mesurée sur PnL mensuel agrégé, pas trade-by-trade (les mois faibles en trades peuvent biaiser).");
  L.push("- Pas de Monte Carlo / bootstrap sur les trades pour mesurer la variance d'estimation du PF.");
  L.push("- Pas de stress sur la qualité des données (manquantes, erronées).");
  return L.join("\n");
}
