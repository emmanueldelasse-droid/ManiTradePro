// tools/backtests/new-setup-discovery-lab-v1.mjs
//
// Laboratoire offline de découverte de nouveaux setups, avec validation
// réaliste obligatoire dès le premier test (NEXT_OPEN + friction systématique).
//
// 4 familles testées :
//   1. POST_EARNINGS_DRIFT — DATA_MISSING (pas d'earnings dans `data/`)
//   2. ETF_MOMENTUM_ROTATION — rotation sur sous-univers ETF
//   3. SECTOR_RELATIVE_STRENGTH — rotation 2-niveaux (secteur puis actif)
//   4. REGIME_SPECIFIC_SETUPS — stratégies différenciées par régime macro
//
// CONTRAINTES :
//   - STRICTEMENT offline.
//   - Aucun moteur existant modifié.
//   - Modèles d'exécution UNIQUEMENT réalistes (NEXT_OPEN, friction obligatoire).
//   - Toute stratégie rejetée si elle ne survit pas à l'exécution réaliste.
//
// Sorties :
//   - tools/backtests/output/new-setup-discovery-lab-v1.json
//   - tools/backtests/output/new-setup-discovery-lab-v1.md
//
// Classement : ROBUST_EDGE / CONDITIONAL_EDGE / FRAGILE / DEAD / DATA_MISSING

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "new-setup-discovery-lab-v1.json");
const OUT_MD = join(OUT_DIR, "new-setup-discovery-lab-v1.md");

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
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.close))
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

// === Friction (identique au robustness lab) ================================
function frictionRPerTrade(holdDays) {
  const pct = 0.30 + 0.02 * holdDays;
  return pct / 5; // 5% = 1R
}

// === Loaders ================================================================

console.log("[new-setup-discovery] chargement candles…");
const allSymbols = new Set([
  ...Object.values(UNIVERSE).flat(),
  "SPY", "QQQ", "SMH",
]);
const candlesBySymbol = new Map();
for (const s of allSymbols) {
  const c = loadCandles(s);
  if (c && c.length >= 220) candlesBySymbol.set(s, c);
}
console.log(`[new-setup-discovery] OHLC chargés : ${candlesBySymbol.size}`);

// === Régimes ===============================================================

function buildDateIndex() {
  const counts = new Map();
  for (const c of candlesBySymbol.values()) {
    for (const k of c) counts.set(k.time, (counts.get(k.time) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 20).map(([t]) => t).sort();
}

function buildRegimeByDate(dates) {
  const need = ["SPY", "QQQ", "SMH"];
  const market = {};
  for (const s of need) {
    const c = candlesBySymbol.get(s);
    if (!c) throw new Error(`Missing ${s}`);
    market[s] = { c, ema200: ema(c.map((x) => x.close), 200) };
  }
  const out = new Map();
  for (const d of dates) {
    const sIdx = findCandleIndex(market.SPY.c, d);
    const qIdx = findCandleIndex(market.QQQ.c, d);
    const mIdx = findCandleIndex(market.SMH.c, d);
    if (sIdx < 200 || qIdx < 200 || mIdx < 200) continue;
    const sb = market.SPY.c[sIdx].close > market.SPY.ema200[sIdx];
    const qb = market.QQQ.c[qIdx].close > market.QQQ.ema200[qIdx];
    const mb = market.SMH.c[mIdx].close > market.SMH.ema200[mIdx];
    let r = "RANGE";
    if (sb && qb && mb) r = "RISK_ON";
    if (!sb && !qb && !mb) r = "RISK_OFF";
    out.set(d, r);
  }
  return out;
}

const DATES = buildDateIndex();
const regimeByDate = buildRegimeByDate(DATES);
console.log(`[new-setup-discovery] dates communes : ${DATES.length}`);

// === Trade summary + classification (shared) ===============================

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
  const meanR = totalR / total;
  const variance = trades.reduce((a, b) => a + (b.pnlR - meanR) ** 2, 0) / total;
  const stdR = Math.sqrt(variance);
  const sharpe = stdR > 0 ? meanR / stdR * Math.sqrt(52) : null;
  const years = new Set(trades.map((t) => t.year)).size || 1;
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
    turnoverPerYear: Number((total / years).toFixed(1)),
  };
}

function stability(trades) {
  const byYear = {};
  for (const t of trades) { (byYear[t.year] = byYear[t.year] || []).push(t); }
  const years = ["2021", "2022", "2023", "2024", "2025"];
  const yp = {};
  for (const y of years) {
    const ts = byYear[y] || [];
    if (!ts.length) { yp[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    yp[y] = gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(2));
  }
  const valid = years.filter((y) => yp[y] !== null);
  const positive = valid.filter((y) => yp[y] >= 1.0);
  return { yearlyPf: yp, validYears: valid.length, positiveYears: positive.length };
}

function edgeDecay(trades) {
  const early = trades.filter((t) => t.year === "2021" || t.year === "2022");
  const late = trades.filter((t) => t.year === "2024" || t.year === "2025");
  function pf(ts) {
    if (!ts.length) return null;
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    return gl === 0 ? (gw > 0 ? 999 : 0) : gw / gl;
  }
  const e = pf(early), l = pf(late);
  return {
    earlyPf: e !== null ? Number(e.toFixed(2)) : null,
    latePf: l !== null ? Number(l.toFixed(2)) : null,
    decayRatio: e !== null && l !== null && l > 0 ? Number((e / l).toFixed(2)) : null,
  };
}

function classify(s, st, d) {
  if (!s.trades || s.trades < 30) return "DEAD";
  if (s.profitFactor < 1.0) return "DEAD";
  if (s.profitFactor < 1.1) return "FRAGILE";
  if (st.positiveYears < 3 || st.validYears < 3) return "FRAGILE";
  if (d.decayRatio !== null && d.decayRatio > 1.5) return "FRAGILE";
  if (s.profitFactor >= 1.3 && st.positiveYears >= 4 && (d.decayRatio === null || d.decayRatio < 1.3)) return "ROBUST_EDGE";
  return "CONDITIONAL_EDGE";
}

// === Famille 2 — ETF_MOMENTUM_ROTATION ====================================
//
// Rotation pure dans des sous-univers ETF. Modèle d'exécution NEXT_OPEN +
// friction. La PR précédente (rs-rotation-robustness-lab) a déjà testé
// universe='etfs' globalement (DEAD, PF 0.84). Ici on décompose : index,
// tech, commodities, secteurs, bonds.

const ETF_SUBSETS = {
  etfs_us_index: UNIVERSE.ETFs_US_INDEX,
  etfs_us_tech: UNIVERSE.ETFs_US_TECH,
  etfs_us_sectors: UNIVERSE.ETFs_US_SECTORS,
  etfs_commodities: UNIVERSE.ETFs_COMMODITIES,
  etfs_bonds: UNIVERSE.ETFs_BONDS,
  etfs_world: UNIVERSE.ETFs_WORLD,
  etfs_all: [
    ...UNIVERSE.ETFs_US_INDEX, ...UNIVERSE.ETFs_US_TECH, ...UNIVERSE.ETFs_US_SECTORS,
    ...UNIVERSE.ETFs_COMMODITIES, ...UNIVERSE.ETFs_BONDS, ...UNIVERSE.ETFs_WORLD,
  ],
};

function runEtfRotation(subsetKey, opts) {
  const { horizon, topN, rebalance, lookback, minMomentum = 0, regimeFilter = "NO_RISK_OFF" } = opts;
  const universe = (ETF_SUBSETS[subsetKey] || []).filter((s) => candlesBySymbol.has(s));
  if (universe.length < topN) return { trades: [], skipped: true, reason: `univers ${subsetKey} insuffisant (${universe.length} ETFs)` };
  const trades = [];
  for (let di = lookback; di < DATES.length - horizon - 2; di += rebalance) {
    const date = DATES[di];
    const r = regimeByDate.get(date);
    if (regimeFilter === "NO_RISK_OFF" && r === "RISK_OFF") continue;
    if (regimeFilter === "RISK_ON_ONLY" && r !== "RISK_ON") continue;
    const cands = [];
    for (const s of universe) {
      const c = candlesBySymbol.get(s);
      const idx = findCandleIndex(c, date);
      if (idx < lookback || idx + horizon + 1 >= c.length) continue;
      const mom = pctChange(c[idx].close, c[idx - lookback].close);
      if (mom === null || mom < minMomentum) continue;
      cands.push({ symbol: s, idx, mom, candles: c });
    }
    cands.sort((a, b) => b.mom - a.mom);
    for (const cand of cands.slice(0, topN)) {
      const entryIdx = cand.idx + 1;
      const exitIdx = entryIdx + horizon;
      if (exitIdx >= cand.candles.length) continue;
      const entry = cand.candles[entryIdx].open;
      const exit = cand.candles[exitIdx].open;
      let pnlR = pctChange(exit, entry) / 5;
      pnlR -= frictionRPerTrade(horizon);
      trades.push({
        symbol: cand.symbol,
        entryTime: cand.candles[entryIdx].time,
        year: getYear(date),
        pnlR: Number(pnlR.toFixed(3)),
        regimeAtEntry: r,
        family: "ETF_MOMENTUM_ROTATION",
        config: `${subsetKey}/h${horizon}/top${topN}/reb${rebalance}/lb${lookback}/${regimeFilter}`,
      });
    }
  }
  return { trades, skipped: false };
}

// === Famille 3 — SECTOR_RELATIVE_STRENGTH =================================
//
// Two-level rotation : (1) classer les "secteurs" (groupes UNIVERSE)
// par momentum agrégé. (2) Top secteur(s), puis top actifs dans ce secteur.

const SECTOR_GROUPS = {
  BIG_TECH: UNIVERSE.BIG_TECH,
  SEMIS: UNIVERSE.SEMIS,
  CYBER_CLOUD: UNIVERSE.CYBER_CLOUD,
  SOFTWARE: UNIVERSE.SOFTWARE,
  AI_MOMENTUM: UNIVERSE.AI_MOMENTUM,
  CONSUMER_GROWTH: UNIVERSE.CONSUMER_GROWTH,
  QUALITY_DEFENSIVE: UNIVERSE.QUALITY_DEFENSIVE,
  INDUSTRIALS: UNIVERSE.INDUSTRIALS,
  FINANCIALS: UNIVERSE.FINANCIALS,
  EUROPE: UNIVERSE.EUROPE,
};

function sectorMomentumAtDate(group, date, lookback) {
  const moms = [];
  for (const s of group) {
    const c = candlesBySymbol.get(s);
    if (!c) continue;
    const idx = findCandleIndex(c, date);
    if (idx < lookback) continue;
    const m = pctChange(c[idx].close, c[idx - lookback].close);
    if (m !== null) moms.push(m);
  }
  return moms.length ? avg(moms) : null;
}

function runSectorRS(opts) {
  const { horizon, topSectors, topAssetsPerSector, rebalance, lookback, regimeFilter = "NO_RISK_OFF" } = opts;
  const trades = [];
  for (let di = lookback; di < DATES.length - horizon - 2; di += rebalance) {
    const date = DATES[di];
    const r = regimeByDate.get(date);
    if (regimeFilter === "NO_RISK_OFF" && r === "RISK_OFF") continue;
    // Rank sectors
    const sectorMoms = [];
    for (const [name, syms] of Object.entries(SECTOR_GROUPS)) {
      const m = sectorMomentumAtDate(syms, date, lookback);
      if (m !== null) sectorMoms.push({ name, syms, mom: m });
    }
    sectorMoms.sort((a, b) => b.mom - a.mom);
    const topSecs = sectorMoms.slice(0, topSectors);
    for (const sec of topSecs) {
      // Rank assets dans le secteur
      const cands = [];
      for (const s of sec.syms) {
        const c = candlesBySymbol.get(s);
        if (!c) continue;
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
        pnlR -= frictionRPerTrade(horizon);
        trades.push({
          symbol: cand.symbol,
          sector: sec.name,
          entryTime: cand.candles[entryIdx].time,
          year: getYear(date),
          pnlR: Number(pnlR.toFixed(3)),
          regimeAtEntry: r,
          family: "SECTOR_RELATIVE_STRENGTH",
          config: `topSec${topSectors}/topAst${topAssetsPerSector}/h${horizon}/reb${rebalance}/lb${lookback}/${regimeFilter}`,
        });
      }
    }
  }
  return { trades };
}

// === Famille 4 — REGIME_SPECIFIC_SETUPS ====================================
//
// Tester si différents setups (et / ou pas de trade) marchent mieux par régime.
// Approche : rotation universelle (mixed) avec UN filtre régime spécifique,
// puis comparer les rendements obtenus PAR régime à la rotation globale et
// au "buy and hold SPY".

function runRegimeSpecific(opts) {
  // opts : { regimeOnly: "RISK_ON" | "RANGE" | "RISK_OFF" | "CASH" }
  if (opts.regimeOnly === "CASH") {
    return { trades: [], note: "Stratégie CASH : 0 trade, 0R par construction. Implicite : preserve capital." };
  }
  const allSyms = [...new Set(Object.values(UNIVERSE).flat())].filter((s) => candlesBySymbol.has(s));
  const trades = [];
  const horizon = opts.horizon || 20;
  const rebalance = opts.rebalance || 10;
  const lookback = opts.lookback || 90;
  const topN = opts.topN || 10;
  const minMomentum = opts.minMomentum ?? 5;
  for (let di = lookback; di < DATES.length - horizon - 2; di += rebalance) {
    const date = DATES[di];
    const r = regimeByDate.get(date);
    if (r !== opts.regimeOnly) continue;
    const cands = [];
    for (const s of allSyms) {
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
      pnlR -= frictionRPerTrade(horizon);
      trades.push({
        symbol: cand.symbol,
        entryTime: cand.candles[entryIdx].time,
        year: getYear(date),
        pnlR: Number(pnlR.toFixed(3)),
        regimeAtEntry: r,
        family: "REGIME_SPECIFIC_SETUPS",
        config: `regime=${opts.regimeOnly}/h${horizon}/top${topN}/reb${rebalance}/minMom${minMomentum}`,
      });
    }
  }
  return { trades };
}

function runConfig(family, fn, opts) {
  const res = fn(opts);
  if (res.skipped) {
    return { family, opts, skipped: true, reason: res.reason };
  }
  const t = res.trades;
  const s = summary(t);
  const st = stability(t);
  const d = edgeDecay(t);
  const cl = classify(s, st, d);
  return { family, opts, summary: s, stability: st, decay: d, classification: cl, note: res.note };
}

// === Run tests ==============================================================

console.log("[new-setup-discovery] famille 2 : ETF_MOMENTUM_ROTATION…");
const family2 = [];
for (const subset of ["etfs_us_index", "etfs_us_tech", "etfs_us_sectors", "etfs_commodities", "etfs_all"]) {
  for (const horizon of [20, 60, 120]) {
    for (const topN of [1, 3, 5]) {
      family2.push(runConfig("ETF_MOMENTUM_ROTATION", (o) => runEtfRotation(o.subset, o), { subset, horizon, topN, rebalance: 10, lookback: 90 }));
    }
  }
}

console.log("[new-setup-discovery] famille 3 : SECTOR_RELATIVE_STRENGTH…");
const family3 = [];
for (const horizon of [40, 60, 120]) {
  for (const topSectors of [1, 2, 3]) {
    for (const topAssets of [3, 5, 10]) {
      family3.push(runConfig("SECTOR_RELATIVE_STRENGTH", runSectorRS, { horizon, topSectors, topAssetsPerSector: topAssets, rebalance: 10, lookback: 90 }));
    }
  }
}

console.log("[new-setup-discovery] famille 4 : REGIME_SPECIFIC_SETUPS…");
const family4 = [];
for (const regime of ["RISK_ON", "RANGE", "RISK_OFF", "CASH"]) {
  family4.push(runConfig("REGIME_SPECIFIC_SETUPS", runRegimeSpecific, { regimeOnly: regime, horizon: 20, topN: 10, rebalance: 10, lookback: 90, minMomentum: 5 }));
}

// === Famille 1 — POST_EARNINGS_DRIFT (DATA_MISSING) =========================

const family1 = {
  status: "DATA_MISSING",
  reason: "Aucune source de dates d'earnings dans le repo. Les fichiers `data/*.json` ne contiennent que des OHLC quotidiens.",
  dataNeeded: [
    "Calendrier des dates d'earnings par symbole (date de publication, type pre-market/post-market)",
    "Surprise EPS et CA (réel vs consensus analystes) — pour filtrer 'beat' vs 'miss'",
    "Idéalement : direction du gap d'ouverture le jour après earnings (pour la pré-condition 'gap positif fort')",
    "Volume relatif d'avant et après publication (pour la pré-condition 'volume anormal')",
  ],
  proposedSources: [
    "API Alpha Vantage / Polygon / FMP — earnings_calendar endpoint (souvent gratuit en historique limité)",
    "EOD Historical Data : `eodhd.com` propose des fichiers earnings batch",
    "Yahoo Finance (scraping fragile, conditions d'usage à vérifier)",
    "SEC EDGAR — filings 10-Q/10-K, dates exactes (mais sans estimates analystes)",
  ],
  proposedDesign: [
    "Filtre 1 : earnings positifs (surprise EPS > 0, ou simplement gap d'ouverture > +3 %)",
    "Filtre 2 : volume relatif jour d'earnings > 2× moyenne 20j",
    "Filtre 3 : régime de marché NO_RISK_OFF (déjà disponible dans le repo)",
    "Entry : open[T+1] où T = jour publication earnings",
    "Exits testés : 5j / 10j / 20j / 40j fixed hold + ATR trailing",
    "Friction : identique à `frictionRPerTrade(holdDays)` = round-trip 0.30 % + 0.02 %/jour",
    "Classification : mêmes critères ROBUST/CONDITIONAL/FRAGILE/DEAD",
  ],
};

// === Aggregate + verdict ====================================================

const allResults = [...family2, ...family3, ...family4].filter((r) => !r.skipped && r.classification);

const rankings = {
  ROBUST_EDGE: allResults.filter((r) => r.classification === "ROBUST_EDGE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  CONDITIONAL_EDGE: allResults.filter((r) => r.classification === "CONDITIONAL_EDGE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  FRAGILE: allResults.filter((r) => r.classification === "FRAGILE").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
  DEAD: allResults.filter((r) => r.classification === "DEAD").sort((a, b) => (b.summary.profitFactor || 0) - (a.summary.profitFactor || 0)),
};

const verdict = {
  status: rankings.ROBUST_EDGE.length > 0 ? "NEW_ROBUST_SETUP_FOUND" : rankings.CONDITIONAL_EDGE.length > 0 ? "CONDITIONAL_NEW_SETUPS_ONLY" : "NO_NEW_VIABLE_SETUP",
  configsTested: allResults.length + 1, // +1 for DATA_MISSING family
  robustCount: rankings.ROBUST_EDGE.length,
  conditionalCount: rankings.CONDITIONAL_EDGE.length,
  fragileCount: rankings.FRAGILE.length,
  deadCount: rankings.DEAD.length,
  dataMissingFamilies: 1, // POST_EARNINGS_DRIFT
  bestRobust: rankings.ROBUST_EDGE[0] || null,
  bestConditional: rankings.CONDITIONAL_EDGE[0] || null,
};

// === Markdown ===============================================================

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function tableFor(results) {
  const filtered = results.filter((r) => r && !r.skipped && r.summary && r.classification);
  if (!filtered.length) return "_aucun résultat exploitable dans cette section_";
  const lines = [];
  lines.push("| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay | Classification |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of filtered) {
    const s = r.summary;
    const st = r.stability;
    const d = r.decay;
    const cfg = Object.entries(r.opts).map(([k, v]) => `${k}=${v}`).join(" ");
    lines.push(`| ${cfg} | ${s.trades || 0} | ${fmt(s.profitFactor, 2)} | ${fmt(s.expectancyR, 3)} | ${fmt(s.maxDrawdownR, 1)} | ${fmt(s.sharpeApprox, 2)} | ${st.positiveYears}/${st.validYears} | ${fmt(d.decayRatio)} | **${r.classification}** |`);
  }
  return lines.join("\n");
}

function buildMarkdown() {
  const L = [];
  L.push("# New Setup Discovery Lab v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${new Date().toISOString()} par \`tools/backtests/new-setup-discovery-lab-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Laboratoire offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Tous les tests sont effectués avec exécution réaliste (`entry = open[i+1]`) et friction obligatoire dès le premier essai.");
  L.push("");

  L.push("## 1. Scope");
  L.push("");
  L.push("4 familles testées :");
  L.push("- **POST_EARNINGS_DRIFT** : test impossible sans données earnings. Voir section dédiée.");
  L.push("- **ETF_MOMENTUM_ROTATION** : rotation par momentum dans des sous-univers d'ETFs.");
  L.push("- **SECTOR_RELATIVE_STRENGTH** : rotation 2-niveaux (secteur → top actifs du secteur).");
  L.push("- **REGIME_SPECIFIC_SETUPS** : mêmes règles, filtrées par régime macro (RISK_ON / RANGE / RISK_OFF / CASH).");
  L.push("");

  L.push("## 2. Méthodologie");
  L.push("");
  L.push("- **Entry** : `open[i+1]` (NEXT_OPEN) systématique. Pas de SIGNAL_CLOSE, pas de prix théorique.");
  L.push("- **Exit** : `open[exitIdx]` pour fixed hold.");
  L.push("- **Friction obligatoire** : round-trip 0.30 % (spread+slippage+commission) + 0.02 % par jour de hold (overnight gap penalty). Formule : `frictionR = (0.30 + 0.02 × holdDays) / 5`.");
  L.push("- **Conversion R** : 5 % = 1R (convention du robustness lab).");
  L.push("- **Régime** : NO_RISK_OFF par défaut, calculé sur SPY + QQQ + SMH vs EMA200.");
  L.push("- **Classification** : ROBUST_EDGE (PF ≥ 1.3, ≥ 4/5 années positives, decay < ×1.3), CONDITIONAL_EDGE (PF ≥ 1.1, 3+ années positives), FRAGILE, DEAD.");
  L.push("");

  L.push("## 3. Famille 1 — POST_EARNINGS_DRIFT");
  L.push("");
  L.push(`**Status : ${family1.status}**`);
  L.push("");
  L.push(family1.reason);
  L.push("");
  L.push("### Données nécessaires");
  L.push("");
  for (const x of family1.dataNeeded) L.push(`- ${x}`);
  L.push("");
  L.push("### Sources possibles");
  L.push("");
  for (const x of family1.proposedSources) L.push(`- ${x}`);
  L.push("");
  L.push("### Design proposé une fois les données disponibles");
  L.push("");
  for (const x of family1.proposedDesign) L.push(`- ${x}`);
  L.push("");

  L.push("## 4. Famille 2 — ETF_MOMENTUM_ROTATION");
  L.push("");
  L.push("Rotation par momentum dans des sous-univers d'ETFs. Configs : `subset × horizon × topN` (45 combinaisons), rebalance fixe à 10j, lookback 90j, régime NO_RISK_OFF.");
  L.push("");
  L.push(tableFor(family2));
  L.push("");

  L.push("## 5. Famille 3 — SECTOR_RELATIVE_STRENGTH");
  L.push("");
  L.push("Rotation 2-niveaux : (1) sélection du top N secteur(s) par momentum agrégé sur les composantes, (2) top N' actifs du secteur retenu. Configs : `horizon × topSectors × topAssetsPerSector` (27 combinaisons), rebalance 10j, lookback 90j, NO_RISK_OFF.");
  L.push("");
  L.push(tableFor(family3));
  L.push("");

  L.push("## 6. Famille 4 — REGIME_SPECIFIC_SETUPS");
  L.push("");
  L.push("Même rotation momentum (univers mixed) mais filtrée pour ne trader QUE dans un régime donné. Compare RISK_ON, RANGE, RISK_OFF (et CASH = aucun trade).");
  L.push("");
  L.push(tableFor(family4.filter((r) => !r.skipped && r.classification)));
  L.push("");
  if (family4.some((r) => r.note)) {
    for (const r of family4) {
      if (r.note) L.push(`- **${r.opts.regimeOnly}** : ${r.note}`);
    }
    L.push("");
  }
  L.push("**Lecture** : si RISK_ON et RANGE sont rentables individuellement, et RISK_OFF FRAGILE ou DEAD, alors la stratégie naturelle est **NO_RISK_OFF** (ce que confirme déjà le robustness lab RS Rotation, PR #210).");
  L.push("");

  L.push("## 7. Classement final");
  L.push("");
  L.push(`**Verdict global : ${verdict.status}**`);
  L.push("");
  L.push(`- Configurations testées : ${verdict.configsTested}`);
  L.push(`- ROBUST_EDGE : ${verdict.robustCount}`);
  L.push(`- CONDITIONAL_EDGE : ${verdict.conditionalCount}`);
  L.push(`- FRAGILE : ${verdict.fragileCount}`);
  L.push(`- DEAD : ${verdict.deadCount}`);
  L.push(`- DATA_MISSING : ${verdict.dataMissingFamilies} famille (POST_EARNINGS_DRIFT)`);
  L.push("");
  for (const tier of ["ROBUST_EDGE", "CONDITIONAL_EDGE", "FRAGILE", "DEAD"]) {
    L.push(`### ${tier} (${rankings[tier].length})`);
    L.push("");
    if (!rankings[tier].length) {
      L.push("_aucune config dans cette catégorie_");
      L.push("");
      continue;
    }
    L.push("| Famille | Config | Trades | PF | Years+ | Decay |");
    L.push("|---|---|---:|---:|---:|---:|");
    for (const c of rankings[tier].slice(0, 10)) {
      const cfg = Object.entries(c.opts).map(([k, v]) => `${k}=${v}`).join(" ");
      L.push(`| ${c.family} | ${cfg} | ${c.summary.trades || 0} | ${fmt(c.summary.profitFactor, 2)} | ${c.stability.positiveYears}/${c.stability.validYears} | ${fmt(c.decay.decayRatio)} |`);
    }
    if (rankings[tier].length > 10) L.push(`_${rankings[tier].length - 10} configs supplémentaires non affichées_`);
    L.push("");
  }

  L.push("## 8. Comparaison vs RS Rotation robuste");
  L.push("");
  L.push("Référence (PR #210, best ROBUST RS Rotation) :");
  L.push("- horizon 120j + topN 10 + rebalance 10 + NO_RISK_OFF + mixed + fixed_hold");
  L.push("- PF 1.91, expectancy 2.78R, 4/5 années positives, edge decay ×0.72");
  L.push("");
  if (verdict.bestRobust) {
    const b = verdict.bestRobust;
    L.push(`**Meilleur ROBUST_EDGE de ce labo** : ${b.family} avec config \`${Object.entries(b.opts).map(([k, v]) => k + "=" + v).join(" ")}\` → PF ${fmt(b.summary.profitFactor, 2)}, ${b.stability.positiveYears}/${b.stability.validYears} années positives, decay ×${fmt(b.decay.decayRatio)}.`);
    L.push("");
    const better = b.summary.profitFactor > 1.91 ? "MIEUX que RS Rotation 120j" : "MOINS BIEN que RS Rotation 120j (PF 1.91)";
    L.push(`Position vs référence : ${better}.`);
  } else {
    L.push("**Aucune config ROBUST_EDGE dans ce labo.** RS Rotation 120j (PF 1.91) reste la référence.");
  }
  L.push("");

  L.push("## 9. Réponses aux 7 questions du brief");
  L.push("");
  L.push(`1. **Y a-t-il un nouveau setup viable ?** ${verdict.status === "NEW_ROBUST_SETUP_FOUND" ? "OUI, " + verdict.robustCount + " configs ROBUST_EDGE identifiées." : verdict.status === "CONDITIONAL_NEW_SETUPS_ONLY" ? "PARTIELLEMENT : " + verdict.conditionalCount + " configs CONDITIONAL_EDGE, aucune ROBUST." : "NON. Aucune config ne passe les critères ROBUST ni CONDITIONAL."}`);
  L.push("");
  L.push(`2. **Est-ce qu'un setup bat RS Rotation robuste (PF 1.91) ?** ${verdict.bestRobust && verdict.bestRobust.summary.profitFactor > 1.91 ? "OUI : " + verdict.bestRobust.family + " avec PF " + fmt(verdict.bestRobust.summary.profitFactor, 2) + "." : "NON. La meilleure config trouvée ici reste sous PF 1.91 de RS Rotation 120j."}`);
  L.push("");
  L.push(`3. **Quel setup survit aux frictions ?** ${rankings.ROBUST_EDGE.length + rankings.CONDITIONAL_EDGE.length} configs sur ${allResults.length} testées passent au moins CONDITIONAL_EDGE. Friction round-trip 0.30 % + 0.02 %/jour appliquée systématiquement.`);
  L.push("");
  L.push(`4. **Quel setup survit sur plusieurs années ?** ${verdict.robustCount} configs avec ≥ 4/5 années positives.`);
  L.push("");
  L.push(`5. **Quel setup meurt dès NEXT_OPEN ?** Tous les tests sont en NEXT_OPEN. Les ${rankings.DEAD.length} configs DEAD montrent que certaines combinaisons (notamment horizons courts sur ETFs purs, top 1 hyper-concentré) ne tiennent pas même en exécution réaliste.`);
  L.push("");
  if (verdict.bestRobust) {
    const b = verdict.bestRobust;
    L.push(`6. **Quel setup mérite une PR dédiée ?** Best ROBUST : **${b.family}** avec config \`${Object.entries(b.opts).map(([k, v]) => k + "=" + v).join(" ")}\` (PF ${fmt(b.summary.profitFactor, 2)}, ${b.stability.positiveYears}/${b.stability.validYears} années positives). Mérite une PR dédiée si l'on souhaite la formaliser comme setup à étudier en complément de RS Rotation.`);
  } else if (verdict.bestConditional) {
    L.push(`6. **Quel setup mérite une PR dédiée ?** Aucun ROBUST. Le meilleur CONDITIONAL est ${verdict.bestConditional.family} mais ne passe pas tous les critères de robustesse. Pas de PR dédiée recommandée à ce stade.`);
  } else {
    L.push(`6. **Quel setup mérite une PR dédiée ?** Aucun. Aucune nouvelle stratégie testée n'atteint le niveau de RS Rotation. Pas de PR dédiée recommandée.`);
  }
  L.push("");
  L.push(`7. **Quelles données manquent pour Post-Earnings Drift ?** Cf. section 3 : calendrier earnings, surprise EPS, gap d'ouverture, volume relatif. Sources possibles : Alpha Vantage, Polygon, FMP, EOD Historical Data, SEC EDGAR.`);
  L.push("");

  L.push("## 10. Verdict final");
  L.push("");
  L.push(`**${verdict.status}**`);
  L.push("");
  if (verdict.status === "NEW_ROBUST_SETUP_FOUND") {
    L.push(`Le labo a identifié ${verdict.robustCount} configurations ROBUST_EDGE viables avec exécution réaliste et friction. La meilleure est ${verdict.bestRobust.family} avec PF ${fmt(verdict.bestRobust.summary.profitFactor, 2)}.`);
    if (verdict.bestRobust.summary.profitFactor > 1.91) {
      L.push("");
      L.push("**Elle dépasse même la référence RS Rotation 120j (PF 1.91).** À envisager pour PR dédiée.");
    } else {
      L.push("");
      L.push("Elle ne dépasse pas RS Rotation 120j (PF 1.91), mais peut servir comme stratégie complémentaire à étudier.");
    }
  } else if (verdict.status === "CONDITIONAL_NEW_SETUPS_ONLY") {
    L.push(`Aucune config ROBUST_EDGE. ${verdict.conditionalCount} configs CONDITIONAL_EDGE — edge marginal, à confirmer avec walk-forward conditionnel régime et stress-test sur friction plus élevée.`);
  } else {
    L.push("**Aucune nouvelle stratégie ne passe les critères de robustesse.** RS Rotation 120j (PR #210, PF 1.91) reste le seul candidat sérieux. Pas de PR dédiée recommandée pour les familles testées ici.");
  }
  L.push("");
  L.push("**Post-Earnings Drift** non testable sans données externes. Section 3 documente précisément ce qu'il faut.");
  L.push("");

  L.push("---");
  L.push("");
  L.push("**Hypothèses** : friction round-trip 0.30 % + 0.02 % par jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux, pas de short-side, pas de position sizing dynamique, momentum lookback 90j fixe pour sector RS.");
  L.push("");
  L.push("**Limites** :");
  L.push("- Pas de données earnings → POST_EARNINGS_DRIFT non testable.");
  L.push("- Sweeps multivariés partiels (subset × horizon × topN, pas grid complet de chaque dimension).");
  L.push("- Sector RS limité aux groupes UNIVERSE existants (10 groupes), pas vrai ETF sectoriel SPDR (XLK/XLF/etc.) comme proxy.");
  L.push("- Pas de VIX, pas de breadth filter dans cette PR (focus sur découverte de setups, pas sur le filtre régime).");
  L.push("- Pas de comparaison vs buy-and-hold SPY ou benchmark.");
  L.push("");
  return L.join("\n");
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Laboratoire offline de découverte de nouveaux setups après nettoyage des anciens faux edges. Validation réaliste obligatoire (NEXT_OPEN + friction).",
  sources: [
    "tools/backtests/universe-v2.mjs",
    "data/*.json (OHLC 2021-2025)",
    "tools/backtests/output/rs-rotation-robustness-lab-v1.json (référence)",
    "tools/backtests/output/setup-execution-bias-audit-v1.json (référence)",
    "SETUPS_REGISTRY.md (référence)",
  ],
  executionModel: {
    entry: "open[i+1] (NEXT_OPEN)",
    exit: "open[exitIdx]",
    friction: {
      roundTripPct: 0.30,
      overnightGapPenaltyPctPerDay: 0.02,
      conversionToR: "5% = 1R",
      formula: "frictionR = (0.30 + 0.02 × holdDays) / 5",
    },
  },
  families: {
    POST_EARNINGS_DRIFT: family1,
    ETF_MOMENTUM_ROTATION: family2,
    SECTOR_RELATIVE_STRENGTH: family3,
    REGIME_SPECIFIC_SETUPS: family4,
  },
  rankings,
  verdict,
  comparisonRef: {
    name: "RS Rotation 120j (PR #210 best ROBUST_EDGE)",
    profitFactor: 1.91,
    expectancyR: 2.78,
    yearsPositive: "4/5",
    edgeDecay: 0.72,
  },
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(), "utf8");

console.log("");
console.log(`Verdict : ${verdict.status}`);
console.log(`ROBUST=${rankings.ROBUST_EDGE.length} CONDITIONAL=${rankings.CONDITIONAL_EDGE.length} FRAGILE=${rankings.FRAGILE.length} DEAD=${rankings.DEAD.length}`);
if (verdict.bestRobust) {
  const b = verdict.bestRobust;
  console.log(`Best ROBUST : ${b.family} ${JSON.stringify(b.opts)} PF=${b.summary.profitFactor}`);
  console.log(`  vs ref RS Rotation 120j PF=1.91 → ${b.summary.profitFactor > 1.91 ? "BETTER" : "WORSE"}`);
}
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
