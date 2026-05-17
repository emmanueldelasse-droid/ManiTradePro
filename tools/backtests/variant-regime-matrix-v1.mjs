// tools/backtests/variant-regime-matrix-v1.mjs
//
// Matrice (variante × régime) pour ManiTradePro — deux niveaux :
//
//   1. GLOBAL (variant × regimeMode × regime), source `byRegime[]`.
//      Reste actif même si `bySymbolByRegime[]` est absent (back-compat).
//
//   2. PER-SYMBOL (symbol × variant × regimeMode × regime), source
//      `bySymbolByRegime[]`. Présent uniquement quand le backtest source a
//      été ré-exécuté avec la version qui émet ce champ. Si absent, le moteur
//      retombe proprement en mode legacy (matrice globale uniquement) et le
//      signale dans le rapport.
//
// La comparaison ALL_REGIMES vs NO_RISK_OFF par actif (extraite via le module
// `lib/backtest-records.mjs`) reste exposée comme troisième vue, utile pour
// quantifier la dépendance RISK_OFF même sur les sources sans breakdown régime
// individuel par actif.
//
// Sorties :
//   - tools/backtests/output/variant-regime-matrix.json
//   - tools/backtests/output/variant-regime-matrix.md
//
// Usage : node tools/backtests/variant-regime-matrix-v1.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, relative, resolve } from "node:path";

import {
  extractRecords,
  listJsonFiles,
  emptyBucket,
  pushToBucket,
  summarizeBucket,
  pickCanonicalRecords,
  toNumberOrNull,
  inferSetupFamily,
} from "./lib/backtest-records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIRS = [join(REPO_ROOT, "tools", "backtests"), join(REPO_ROOT, "tools", "backtests", "output")];
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUTPUT_JSON = join(OUTPUT_DIR, "variant-regime-matrix.json");
const OUTPUT_MD = join(OUTPUT_DIR, "variant-regime-matrix.md");

const SKIP_FILENAMES = new Set([
  "asset-quality-report.json",
  "asset-setup-matrix.json",
  "setup-variant-matrix.json",
  "variant-regime-matrix.json",
]);

const KNOWN_REGIMES = ["RISK_ON", "RANGE", "RISK_OFF"];
const KNOWN_REGIME_MODES = ["ALL_REGIMES", "RISK_ON_ONLY", "NO_RISK_OFF"];

const TIER_THRESHOLDS = { STRONG: 75, OK: 55, WEAK: 35 };
const FOCUS_SYMBOLS = ["NVDA", "SOXL", "AVGO", "PLTR", "APP", "SMCI", "BTC", "SOL"];

// === Extraction des cellules byRegime (GLOBAL, pas per-symbol) ===
//
// La fonction parcourt récursivement la donnée pour trouver TOUS les tableaux
// `byRegime[]` (overall et yearly). Chaque entry contient {regimeMode, variant,
// regime, ...metrics}. On émet un record par entry, avec un champ `year` quand
// on est dans la branche yearly. On déduplique ensuite par (variant, regimeMode,
// regime, year) — yearly prioritaire sur overall si les deux existent.
function extractRegimeRecords(data, source) {
  const out = [];
  const walk = (obj, year = null) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      // On accepte un array byRegime (variant + regime, PAS de symbol).
      // Les arrays bySymbolByRegime (qui ont symbol) sont SKIPPÉS — ils sont
      // consommés par extractSymbolRegimeRecords pour ne pas mélanger les
      // deux granularités dans le même agrégat global.
      const first = obj[0];
      if (obj.length && first && typeof first === "object" && first.regime && first.variant && !first.symbol) {
        for (const raw of obj) {
          const variant = String(raw.variant || "").trim();
          const regime = String(raw.regime || "").trim();
          const regimeMode = String(raw.regimeMode || "").trim();
          const trades = toNumberOrNull(raw.trades);
          if (!variant || !regime || !regimeMode) continue;
          if (trades === null || trades <= 0) continue;
          // winrate normalisation %
          let winrate = toNumberOrNull(raw.winrate);
          if (winrate !== null && winrate > 0 && winrate <= 1) winrate *= 100;
          out.push({
            source,
            variant,
            regime,
            regimeMode,
            year,
            setupFamily: inferSetupFamily({ variant, source }),
            trades,
            wins: toNumberOrNull(raw.wins),
            losses: toNumberOrNull(raw.losses),
            winrate,
            expectancy: toNumberOrNull(raw.expectancy),
            profitFactor: toNumberOrNull(raw.profitFactor),
            totalR: toNumberOrNull(raw.totalR),
            totalPnl: toNumberOrNull(raw.totalPnl),
            maxDrawdown: toNumberOrNull(raw.maxDrawdown),
            longestLossStreak: toNumberOrNull(raw.longestLossStreak),
          });
        }
        return;
      }
      return;
    }
    // Détection branche yearly : la clé du parent est un nombre 4 chiffres
    for (const [key, val] of Object.entries(obj)) {
      const yearMatch = /^\d{4}$/.test(key);
      walk(val, yearMatch ? key : year);
    }
  };
  walk(data);
  return out;
}

// Dédup yearly vs overall : si une clé (variant, regimeMode, regime) existe
// à la fois en yearly (year non null) et en overall (year null), on garde
// uniquement le yearly (overall = somme yearly).
function dedupRegimeRecords(records) {
  const groups = new Map();
  for (const rec of records) {
    const key = [rec.variant, rec.regimeMode, rec.regime].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }
  const out = [];
  for (const group of groups.values()) {
    const hasYearly = group.some(r => r.year !== null);
    if (hasYearly) {
      for (const r of group) if (r.year !== null) out.push(r);
    } else {
      out.push(...group);
    }
  }
  return out;
}

// === Extraction des cellules bySymbolByRegime (PER-SYMBOL) ===
//
// Spécifique aux JSON qui exposent `bySymbolByRegime[]` (ajouté en mai 2026
// pour le backtest RS regime). Chaque entry contient {symbol, regimeMode,
// variant, regime, ...metrics}.
function extractSymbolRegimeRecords(data, source) {
  const out = [];
  const walk = (obj, year = null) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      const first = obj[0];
      if (obj.length && first && typeof first === "object" && first.symbol && first.regime && first.variant) {
        for (const raw of obj) {
          const symbol = String(raw.symbol || "").trim().toUpperCase();
          const variant = String(raw.variant || "").trim();
          const regime = String(raw.regime || "").trim();
          const regimeMode = String(raw.regimeMode || "").trim();
          const trades = toNumberOrNull(raw.trades);
          if (!symbol || !variant || !regime || !regimeMode) continue;
          if (trades === null || trades <= 0) continue;
          let winrate = toNumberOrNull(raw.winrate);
          if (winrate !== null && winrate > 0 && winrate <= 1) winrate *= 100;
          out.push({
            source,
            symbol,
            variant,
            regime,
            regimeMode,
            year,
            setupFamily: inferSetupFamily({ variant, source }),
            trades,
            wins: toNumberOrNull(raw.wins),
            losses: toNumberOrNull(raw.losses),
            winrate,
            expectancy: toNumberOrNull(raw.expectancy),
            profitFactor: toNumberOrNull(raw.profitFactor),
            totalR: toNumberOrNull(raw.totalR),
            totalPnl: toNumberOrNull(raw.totalPnl),
            maxDrawdown: toNumberOrNull(raw.maxDrawdown),
            longestLossStreak: toNumberOrNull(raw.longestLossStreak),
          });
        }
        return;
      }
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      const yearMatch = /^\d{4}$/.test(key);
      walk(val, yearMatch ? key : year);
    }
  };
  walk(data);
  return out;
}

// Dédup yearly vs overall pour les symbol-records, par (symbol, variant,
// regimeMode, regime). Yearly prioritaire.
function dedupSymbolRegimeRecords(records) {
  const groups = new Map();
  for (const rec of records) {
    const key = [rec.symbol, rec.variant, rec.regimeMode, rec.regime].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }
  const out = [];
  for (const group of groups.values()) {
    const hasYearly = group.some(r => r.year !== null);
    if (hasYearly) {
      for (const r of group) if (r.year !== null) out.push(r);
    } else {
      out.push(...group);
    }
  }
  return out;
}

// Scoring d'une cellule symbol × variant × regimeMode × regime — seuils de
// trades bien plus bas que le global (un actif individuel a beaucoup moins
// de trades qu'une agrégation cross-symbole).
function scoreSymbolRegimeCell(summary, byYear, regime) {
  let score = 0;
  const reasons = [];

  const exp = summary.expectancy ?? 0;
  const pf = summary.profitFactor ?? 0;
  const wr = summary.winrate ?? 0;
  const trades = summary.trades ?? 0;
  const tr = summary.totalR ?? summary.totalPnl ?? null;
  const dd = summary.maxDrawdown ?? 0;

  // expectancy (0-30)
  if (exp >= 1.0) score += 30;
  else if (exp >= 0.5) score += 25;
  else if (exp >= 0.2) score += 15;
  else if (exp > 0) score += 8;

  // profitFactor (0-25)
  if (pf >= 2.0) score += 25;
  else if (pf >= 1.5) score += 20;
  else if (pf >= 1.2) score += 12;
  else if (pf >= 1.0) score += 5;

  // winrate (0-15)
  if (wr >= 60) score += 15;
  else if (wr >= 50) score += 10;
  else if (wr >= 45) score += 5;

  // sample size adapté per-symbol (0-15)
  if (trades >= 30) score += 15;
  else if (trades >= 15) score += 10;
  else if (trades >= 10) score += 7;
  else if (trades >= 5) score += 3;

  // drawdown vs gain (0-10)
  if (tr !== null && tr > 0 && dd > 0) {
    const ratio = dd / Math.abs(tr);
    if (ratio < 0.3) score += 10;
    else if (ratio < 0.5) score += 7;
    else if (ratio < 1.0) score += 4;
  } else if (tr !== null && tr > 0 && dd === 0) {
    score += 8;
  }

  // bonus stabilité (0-5)
  const years = Array.from(byYear.values()).map(b => summarizeBucket(b));
  const profitableYears = years.filter(y => (y.expectancy ?? 0) > 0 && y.trades >= 2).length;
  const observedYears = years.length;
  if (observedYears >= 2 && profitableYears >= 2) score += 5;

  // PÉNALITÉS
  if (trades < 5) { score -= 25; reasons.push("échantillon < 5 trades"); }
  if (regime === "RISK_OFF" && exp <= 0) { score -= 10; reasons.push("RISK_OFF destructeur"); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  const blacklistByExp = exp <= 0 && trades >= 10;
  const blacklistByPf = pf > 0 && pf < 1.0;
  if (score < 30 || blacklistByExp || blacklistByPf) tier = "AVOID";
  else if (score >= 70 && pf >= 1.4 && exp > 0 && trades >= 10) tier = "STRONG";
  else if (score >= 50 && pf >= 1.1 && exp > 0 && trades >= 5) tier = "OK";
  else tier = "WEAK";

  let confidence;
  if (trades >= 20 && observedYears >= 2) confidence = "HIGH";
  else if (trades >= 10) confidence = "MEDIUM";
  else confidence = "LOW";

  if (exp <= 0 && trades >= 5) reasons.push(`exp ${exp.toFixed(2)}`);
  if (pf > 0 && pf < 1.0) reasons.push(`PF ${pf.toFixed(2)} < 1`);

  return { score, tier, confidence, profitableYears, observedYears, reason: reasons.join(" ; ") };
}

// Construction de la matrice per-symbol (symbol × variant × regimeMode × regime).
// Retourne :
//   - symbolMatrix[symbol][variant][regimeMode][regime] = cell
//   - allSymbolCells: tous les cells aplatis
function buildSymbolRegimeMatrix(symbolRecords) {
  const deduped = dedupSymbolRegimeRecords(symbolRecords);
  const cells = new Map();
  for (const rec of deduped) {
    const key = [rec.symbol, rec.variant, rec.regimeMode, rec.regime].join("|");
    if (!cells.has(key)) cells.set(key, { bucket: emptyBucket(), byYear: new Map() });
    const entry = cells.get(key);
    pushToBucket(entry.bucket, rec);
    if (rec.year) {
      if (!entry.byYear.has(rec.year)) entry.byYear.set(rec.year, emptyBucket());
      pushToBucket(entry.byYear.get(rec.year), rec);
    }
  }
  const matrix = {};
  const allCells = [];
  for (const [key, entry] of cells.entries()) {
    const [symbol, variant, regimeMode, regime] = key.split("|");
    const summary = summarizeBucket(entry.bucket);
    const scored = scoreSymbolRegimeCell(summary, entry.byYear, regime);
    const yearMetrics = {};
    for (const [y, b] of entry.byYear.entries()) yearMetrics[y] = summarizeBucket(b);

    const cell = {
      symbol,
      setup: inferSetupFamily({ variant }),
      variant,
      regimeMode,
      regime,
      score: scored.score,
      tier: scored.tier,
      confidence: scored.confidence,
      metrics: {
        trades: summary.trades,
        winrate: summary.winrate,
        expectancy: summary.expectancy,
        profitFactor: summary.profitFactor,
        totalR: summary.totalR,
        totalPnl: summary.totalPnl,
        maxDrawdown: summary.maxDrawdown,
        longestLossStreak: summary.longestLossStreak,
      },
      byYear: yearMetrics,
      profitableYears: scored.profitableYears,
      observedYears: scored.observedYears,
      reason: scored.reason,
    };
    if (!matrix[symbol]) matrix[symbol] = {};
    if (!matrix[symbol][variant]) matrix[symbol][variant] = {};
    if (!matrix[symbol][variant][regimeMode]) matrix[symbol][variant][regimeMode] = {};
    matrix[symbol][variant][regimeMode][regime] = cell;
    allCells.push(cell);
  }
  return { matrix, allCells };
}

// Bonus / pénalités spécifiques au scoring régime :
//   - bonus stabilité régime (l'entry est dans 2+ années profitables)
//   - pénalité forte si RISK_OFF est destructeur (exp <= 0)
// La pénalité "variance trop forte entre régimes" se calcule au niveau du
// dispositif global d'une variante (cf. scoreVariantAcrossRegimes), pas par
// cellule individuelle.
function scoreRegimeCell(summary, byYear, isRiskOffCell) {
  let score = 0;
  const reasons = [];

  const exp = summary.expectancy ?? 0;
  const pf = summary.profitFactor ?? 0;
  const wr = summary.winrate ?? 0;
  const trades = summary.trades ?? 0;
  const tr = summary.totalR ?? summary.totalPnl ?? null;
  const dd = summary.maxDrawdown ?? 0;

  // expectancy (0-30)
  if (exp >= 1.0) score += 30;
  else if (exp >= 0.5) score += 25;
  else if (exp >= 0.2) score += 15;
  else if (exp > 0) score += 8;

  // profitFactor (0-25)
  if (pf >= 2.0) score += 25;
  else if (pf >= 1.5) score += 20;
  else if (pf >= 1.2) score += 12;
  else if (pf >= 1.0) score += 5;

  // winrate (0-15)
  if (wr >= 60) score += 15;
  else if (wr >= 50) score += 10;
  else if (wr >= 45) score += 5;

  // sample size (0-15) — seuils plus hauts car cellule agrégée multi-actifs
  if (trades >= 200) score += 15;
  else if (trades >= 100) score += 12;
  else if (trades >= 50) score += 8;
  else if (trades >= 20) score += 4;

  // drawdown vs gain (0-10)
  if (tr !== null && tr > 0 && dd > 0) {
    const ratio = dd / Math.abs(tr);
    if (ratio < 0.3) score += 10;
    else if (ratio < 0.5) score += 7;
    else if (ratio < 1.0) score += 4;
  } else if (tr !== null && tr > 0 && dd === 0) {
    score += 8;
  }

  // bonus stabilité régime (0-5) : si la cellule a 2+ années profitables
  const years = Array.from(byYear.values()).map(b => summarizeBucket(b));
  const profitableYears = years.filter(y => (y.expectancy ?? 0) > 0 && y.trades >= 3).length;
  const observedYears = years.length;
  if (observedYears >= 2 && profitableYears >= 2) {
    score += 5;
    reasons.push(`stable sur ${profitableYears} années`);
  }

  // PÉNALITÉS
  if (trades < 20) { score -= 15; reasons.push("échantillon < 20 trades"); }
  if (isRiskOffCell && exp <= 0) {
    score -= 10;
    reasons.push("RISK_OFF destructeur");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  const blacklistByExp = exp <= 0 && trades >= 30;
  const blacklistByPf = pf > 0 && pf < 1.0;
  if (score < TIER_THRESHOLDS.WEAK || blacklistByExp || blacklistByPf) tier = "AVOID";
  else if (score >= TIER_THRESHOLDS.STRONG && pf >= 1.4 && exp > 0 && trades >= 50) tier = "STRONG";
  else if (score >= TIER_THRESHOLDS.OK && pf >= 1.1 && exp > 0 && trades >= 20) tier = "OK";
  else tier = "WEAK";

  let confidence;
  if (trades >= 100 && observedYears >= 2) confidence = "HIGH";
  else if (trades >= 30) confidence = "MEDIUM";
  else confidence = "LOW";

  if (exp <= 0 && trades >= 20) reasons.push(`espérance ${exp.toFixed(2)}`);
  if (pf > 0 && pf < 1.0) reasons.push(`PF ${pf.toFixed(2)} < 1`);
  if (tier === "STRONG") reasons.push("cellule exploitable");

  return { score, tier, confidence, profitableYears, observedYears, reason: reasons.join(" ; ") };
}

// Construction de la matrice globale (variant × regimeMode × regime).
// Pour chaque triplet, on agrège les yearly buckets et on score la cellule.
function buildRegimeMatrix(records) {
  const deduped = dedupRegimeRecords(records);
  const cells = new Map();
  for (const rec of deduped) {
    const key = [rec.variant, rec.regimeMode, rec.regime].join("|");
    if (!cells.has(key)) cells.set(key, { bucket: emptyBucket(), byYear: new Map() });
    const entry = cells.get(key);
    pushToBucket(entry.bucket, rec);
    if (rec.year) {
      if (!entry.byYear.has(rec.year)) entry.byYear.set(rec.year, emptyBucket());
      pushToBucket(entry.byYear.get(rec.year), rec);
    }
  }
  const matrix = {};
  const allCells = [];
  const variantsSeen = new Set();
  const regimesSeen = new Set();
  const regimeModesSeen = new Set();
  for (const [key, entry] of cells.entries()) {
    const [variant, regimeMode, regime] = key.split("|");
    const summary = summarizeBucket(entry.bucket);
    const scored = scoreRegimeCell(summary, entry.byYear, regime === "RISK_OFF");
    const yearMetrics = {};
    for (const [y, b] of entry.byYear.entries()) yearMetrics[y] = summarizeBucket(b);
    const setupFamily = inferSetupFamily({ variant });

    const cell = {
      symbol: "GLOBAL",
      setup: setupFamily,
      variant,
      regime,
      regimeMode,
      score: scored.score,
      tier: scored.tier,
      confidence: scored.confidence,
      metrics: {
        trades: summary.trades,
        winrate: summary.winrate,
        expectancy: summary.expectancy,
        profitFactor: summary.profitFactor,
        totalR: summary.totalR,
        totalPnl: summary.totalPnl,
        maxDrawdown: summary.maxDrawdown,
        longestLossStreak: summary.longestLossStreak,
      },
      byYear: yearMetrics,
      profitableYears: scored.profitableYears,
      observedYears: scored.observedYears,
      reason: scored.reason,
    };
    if (!matrix[variant]) matrix[variant] = {};
    if (!matrix[variant][regimeMode]) matrix[variant][regimeMode] = {};
    matrix[variant][regimeMode][regime] = cell;
    allCells.push(cell);
    variantsSeen.add(variant);
    regimesSeen.add(regime);
    regimeModesSeen.add(regimeMode);
  }
  return {
    matrix,
    allCells,
    variants: Array.from(variantsSeen).sort(),
    regimes: Array.from(regimesSeen).sort(),
    regimeModes: Array.from(regimeModesSeen).sort(),
  };
}

// === Per-symbol comparison (ALL_REGIMES vs NO_RISK_OFF), basée sur extractRecords ===
function buildPerSymbolFilterComparison(allRecords) {
  const canonical = pickCanonicalRecords(allRecords);
  // Pour le comparatif on a besoin de TOUS les records (ALL_REGIMES + NO_RISK_OFF),
  // pas seulement les canoniques. Mais pickCanonicalRecords supprime déjà
  // ALL_REGIMES quand NO_RISK_OFF existe pour la même cellule. On reconstruit
  // donc à partir des records bruts.
  const groups = new Map();
  for (const rec of allRecords) {
    if (!rec.regimeMode) continue;
    if (rec.regimeMode !== "ALL_REGIMES" && rec.regimeMode !== "NO_RISK_OFF") continue;
    const key = [rec.symbol, rec.variant || "", rec.regimeMode].join("|");
    if (!groups.has(key)) groups.set(key, emptyBucket());
    pushToBucket(groups.get(key), rec);
  }
  // Regroupe par (symbol, variant) avec deux modes
  const out = new Map();
  for (const [key, bucket] of groups.entries()) {
    const [symbol, variant, regimeMode] = key.split("|");
    const symVar = `${symbol}|${variant}`;
    if (!out.has(symVar)) out.set(symVar, { symbol, variant, allRegimes: null, noRiskOff: null });
    const entry = out.get(symVar);
    const summary = summarizeBucket(bucket);
    if (regimeMode === "ALL_REGIMES") entry.allRegimes = summary;
    else if (regimeMode === "NO_RISK_OFF") entry.noRiskOff = summary;
  }
  return out;
}

// Analyses dérivées :
function findRobustVariants(allCells) {
  // Variante robuste = STRONG dans 2+ régimes pour le mode NO_RISK_OFF (le mode
  // que SESSION.md privilégie). On ignore RISK_OFF puisque NO_RISK_OFF
  // l'exclut par construction.
  const byVariant = new Map();
  for (const c of allCells) {
    if (c.regimeMode !== "NO_RISK_OFF") continue;
    if (!byVariant.has(c.variant)) byVariant.set(c.variant, []);
    byVariant.get(c.variant).push(c);
  }
  const out = [];
  for (const [variant, cells] of byVariant.entries()) {
    const strongCount = cells.filter(c => c.tier === "STRONG").length;
    if (strongCount >= 2) out.push({ variant, strongRegimes: cells.filter(c => c.tier === "STRONG").map(c => c.regime), cellsCount: cells.length });
  }
  return out;
}

function findRangeOnlyVariants(allCells) {
  // STRONG en RANGE et WEAK/AVOID en RISK_ON, sous NO_RISK_OFF (cohérent avec
  // l'usage opérationnel).
  const byVariant = new Map();
  for (const c of allCells) {
    if (c.regimeMode !== "NO_RISK_OFF") continue;
    if (!byVariant.has(c.variant)) byVariant.set(c.variant, {});
    byVariant.get(c.variant)[c.regime] = c;
  }
  const out = [];
  for (const [variant, byRegime] of byVariant.entries()) {
    const range = byRegime.RANGE;
    const riskOn = byRegime.RISK_ON;
    if (range && riskOn && range.tier === "STRONG" && (riskOn.tier === "WEAK" || riskOn.tier === "AVOID")) {
      out.push({ variant, range: { tier: range.tier, score: range.score, expectancy: range.metrics.expectancy }, riskOn: { tier: riskOn.tier, score: riskOn.score, expectancy: riskOn.metrics.expectancy } });
    }
  }
  return out;
}

function findRiskOffDangerous(allCells) {
  // Variantes dont la cellule RISK_OFF (mode ALL_REGIMES) sort AVOID ou exp <= 0
  const out = [];
  for (const c of allCells) {
    if (c.regime !== "RISK_OFF") continue;
    if (c.regimeMode !== "ALL_REGIMES") continue;
    if (c.tier === "AVOID" || (c.metrics.expectancy ?? 0) <= 0) {
      out.push({
        variant: c.variant,
        tier: c.tier,
        score: c.score,
        trades: c.metrics.trades,
        expectancy: c.metrics.expectancy,
        profitFactor: c.metrics.profitFactor,
        totalR: c.metrics.totalR,
      });
    }
  }
  return out;
}

function findVariantsToBlacklist(allCells) {
  // AVOID dans tous les régimes (mode ALL_REGIMES, sur les 3 régimes)
  const byVariant = new Map();
  for (const c of allCells) {
    if (c.regimeMode !== "ALL_REGIMES") continue;
    if (!byVariant.has(c.variant)) byVariant.set(c.variant, []);
    byVariant.get(c.variant).push(c);
  }
  const out = [];
  for (const [variant, cells] of byVariant.entries()) {
    const allAvoid = cells.length >= 2 && cells.every(c => c.tier === "AVOID");
    if (allAvoid) out.push({ variant, cellsCount: cells.length, regimes: cells.map(c => c.regime) });
  }
  return out;
}

function focusPerSymbol(perSymbolMap, symbols) {
  const out = {};
  for (const sym of symbols) {
    const entries = [];
    for (const entry of perSymbolMap.values()) {
      if (entry.symbol !== sym) continue;
      entries.push(entry);
    }
    out[sym] = entries.length ? entries : null;
  }
  return out;
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Variant × Regime Matrix — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/variant-regime-matrix-v1.mjs\`.`);
  lines.push("");

  // 1. Synthèse
  lines.push("## 1. Synthèse globale");
  lines.push("");
  lines.push("**Limite résiduelle** : la dimension régime n'est exposée que par `results-relative-strength-rotation-regime-v1.json`. Seules **2 variantes RS** ont un breakdown régime complet (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`). Les autres setups (Pullback, Breakout, etc.) ne sont **pas couverts** par cette matrice tant que leurs scripts de backtest n'auront pas été étendus.");
  lines.push("");
  if (report.symbolMatrixSummary) {
    lines.push("**Breakdown per-(symbol × variant × regimeMode × regime) disponible** depuis l'ajout de `bySymbolByRegime[]` à la source RS regime. La matrice per-symbol expose `" + report.symbolMatrixSummary.totalCells + "` cellules sur `" + report.symbolMatrixSummary.uniqueSymbols + "` actifs × `" + report.symbolMatrixSummary.uniqueVariants + "` variantes (cf. sections 7 et 7-bis).");
  } else {
    lines.push("**Pas de breakdown per-(symbol × variant × regime individuel) dans les JSON sources actuels.** La matrice expose uniquement les niveaux global (variant × regimeMode × regime) et per-symbol filter mode (ALL_REGIMES vs NO_RISK_OFF). Pour débloquer la dimension manquante, ajouter un champ `bySymbolByRegime[]` dans les sources.");
  }
  lines.push("");
  lines.push(`- Cellules globales (variant × regimeMode × regime) : **${report.summary.totalCells}**`);
  lines.push(`- Variantes couvertes : ${report.summary.variants.join(", ")}`);
  lines.push(`- Régimes observés : ${report.summary.regimes.join(", ")}`);
  lines.push(`- Modes de filtre : ${report.summary.regimeModes.join(", ")}`);
  lines.push("");
  lines.push("Répartition des cellules par tier :");
  lines.push("");
  lines.push("| Tier | Nombre |");
  lines.push("|---|---:|");
  for (const tier of ["STRONG", "OK", "WEAK", "AVOID"]) lines.push(`| ${tier} | ${report.summary.byTier[tier] ?? 0} |`);
  lines.push("");

  // 2. Meilleures variantes par régime
  lines.push("## 2. Meilleures variantes par régime (mode NO_RISK_OFF)");
  lines.push("");
  lines.push("Cellules STRONG/OK triées par score, filtre NO_RISK_OFF (le mode opérationnel cible).");
  lines.push("");
  for (const regime of ["RISK_ON", "RANGE"]) {
    lines.push(`### ${regime}`);
    lines.push("");
    const cells = report.allCells
      .filter(c => c.regimeMode === "NO_RISK_OFF" && c.regime === regime && (c.tier === "STRONG" || c.tier === "OK"))
      .sort((a, b) => b.score - a.score);
    if (!cells.length) { lines.push("_aucune cellule STRONG/OK dans ce régime_"); lines.push(""); continue; }
    lines.push("| Variante | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD |");
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const c of cells) lines.push(`| ${c.variant} | ${c.tier} | ${c.score} | ${c.metrics.trades} | ${fmt(c.metrics.winrate, 1)}% | ${fmt(c.metrics.expectancy)} | ${fmt(c.metrics.profitFactor)} | ${fmt(c.metrics.totalR)} | ${fmt(c.metrics.maxDrawdown)} |`);
    lines.push("");
  }
  lines.push("_RISK_OFF n'existe pas dans le mode NO_RISK_OFF — par construction le filtre l'exclut._");
  lines.push("");

  // 3. Variantes robustes multi-régimes
  lines.push("## 3. Variantes robustes multi-régimes");
  lines.push("");
  lines.push("Variantes STRONG dans au moins 2 régimes (mode NO_RISK_OFF) :");
  lines.push("");
  if (!report.robustVariants.length) lines.push("_aucune variante n'atteint le seuil de robustesse_");
  else {
    lines.push("| Variante | Régimes STRONG | Cellules observées |");
    lines.push("|---|---|---:|");
    for (const r of report.robustVariants) lines.push(`| ${r.variant} | ${r.strongRegimes.join(", ")} | ${r.cellsCount} |`);
  }
  lines.push("");

  // 4. Variantes uniquement RANGE
  lines.push("## 4. Variantes uniquement exploitables en RANGE");
  lines.push("");
  lines.push("Variantes STRONG en RANGE mais WEAK/AVOID en RISK_ON (mode NO_RISK_OFF) :");
  lines.push("");
  if (!report.rangeOnlyVariants.length) lines.push("_aucune variante détectée — toutes les variantes STRONG en RANGE le sont aussi en RISK_ON ou réciproquement_");
  else {
    lines.push("| Variante | RANGE (tier/score/exp) | RISK_ON (tier/score/exp) |");
    lines.push("|---|---|---|");
    for (const r of report.rangeOnlyVariants) {
      lines.push(`| ${r.variant} | ${r.range.tier} ${r.range.score} / exp ${fmt(r.range.expectancy)} | ${r.riskOn.tier} ${r.riskOn.score} / exp ${fmt(r.riskOn.expectancy)} |`);
    }
  }
  lines.push("");

  // 5. Variantes dangereuses RISK_OFF
  lines.push("## 5. Variantes dangereuses en RISK_OFF");
  lines.push("");
  lines.push("Cellule RISK_OFF (mode ALL_REGIMES) classée AVOID ou expectancy ≤ 0 :");
  lines.push("");
  if (!report.riskOffDangerous.length) lines.push("_aucune variante ne déclenche le seuil_");
  else {
    lines.push("| Variante | Tier | Score | Trades | Exp | PF | TotalR |");
    lines.push("|---|---|---:|---:|---:|---:|---:|");
    for (const d of report.riskOffDangerous) lines.push(`| ${d.variant} | ${d.tier} | ${d.score} | ${d.trades} | ${fmt(d.expectancy)} | ${fmt(d.profitFactor)} | ${fmt(d.totalR)} |`);
  }
  lines.push("");

  // 6. Variantes à blacklist
  lines.push("## 6. Variantes à blacklister");
  lines.push("");
  lines.push("Variantes AVOID dans tous les régimes observés (mode ALL_REGIMES) :");
  lines.push("");
  if (!report.variantsToBlacklist.length) lines.push("_aucune variante à blacklister sur ce critère_");
  else {
    lines.push("| Variante | Cellules AVOID | Régimes |");
    lines.push("|---|---:|---|");
    for (const v of report.variantsToBlacklist) lines.push(`| ${v.variant} | ${v.cellsCount} | ${v.regimes.join(", ")} |`);
  }
  lines.push("");

  // 7. Cas détaillés
  lines.push("## 7. Cas détaillés par actif");
  lines.push("");
  if (report.symbolMatrixSummary) {
    lines.push("Source : `bySymbolByRegime[]` (vraie matrice symbol × variant × regimeMode × regime). Le tableau ci-dessous montre toutes les cellules disponibles pour chaque actif focus, avec le tier calculé localement par cellule.");
  } else {
    lines.push("**Rappel** : la dimension (symbol × variant × regime individuel) n'est pas disponible dans les JSON actuels. Ce qui suit est la comparaison ALL_REGIMES vs NO_RISK_OFF par actif et par variante RS, pour quantifier l'impact RISK_OFF.");
  }
  lines.push("");
  for (const sym of FOCUS_SYMBOLS) {
    lines.push(`### ${sym}`);
    lines.push("");
    if (report.symbolMatrixSummary) {
      const cells = report.symbolPerSymbolFocus?.[sym];
      if (!cells || !cells.length) { lines.push("_aucune cellule per-symbol pour cet actif (probablement jamais sélectionné par les variantes RS)_"); lines.push(""); continue; }
      lines.push("| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |");
      lines.push("|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|");
      for (const c of cells) {
        lines.push(`| ${c.variant} | ${c.regimeMode} | ${c.regime} | ${c.tier} | ${c.score} | ${c.metrics.trades} | ${fmt(c.metrics.winrate, 1)}% | ${fmt(c.metrics.expectancy)} | ${fmt(c.metrics.profitFactor)} | ${fmt(c.metrics.totalR)} | ${fmt(c.metrics.maxDrawdown)} | ${c.reason || "—"} |`);
      }
      lines.push("");
    } else {
      const entries = report.focus[sym];
      if (!entries || !entries.length) { lines.push("_aucune cellule régime disponible pour cet actif (les autres setups ne sont pas couverts)_"); lines.push(""); continue; }
      lines.push("| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |");
      lines.push("|---|---|---:|---:|---:|---:|---:|---:|");
      for (const e of entries) {
        const lab = (s, mode) => s ? `| ${e.variant} | ${mode} | ${s.trades} | ${fmt(s.winrate, 1)}% | ${fmt(s.expectancy)} | ${fmt(s.profitFactor)} | ${fmt(s.totalR)} | ${fmt(s.maxDrawdown)} |` : `| ${e.variant} | ${mode} | n/a | n/a | n/a | n/a | n/a | n/a |`;
        if (e.allRegimes) lines.push(lab(e.allRegimes, "ALL_REGIMES"));
        if (e.noRiskOff) lines.push(lab(e.noRiskOff, "NO_RISK_OFF"));
      }
      for (const e of entries) {
        if (e.allRegimes && e.noRiskOff && e.allRegimes.totalR !== null && e.noRiskOff.totalR !== null) {
          const drop = e.noRiskOff.totalR - e.allRegimes.totalR;
          const tag = drop > 0 ? `NO_RISK_OFF apporte +${fmt(drop)} totalR (RISK_OFF dégrade)` : `RISK_OFF contribue +${fmt(-drop)} totalR (filtrer le retire)`;
          lines.push(`> ${e.variant} : ${tag}`);
        }
      }
      lines.push("");
    }
  }

  // 7-bis. Synthèse de la matrice per-symbol si disponible
  if (report.symbolMatrixSummary) {
    lines.push("## 7-bis. Matrice per-symbol (synthèse globale)");
    lines.push("");
    lines.push(`- Cellules per-(symbol × variant × regimeMode × regime) : **${report.symbolMatrixSummary.totalCells}**`);
    lines.push(`- Actifs couverts : ${report.symbolMatrixSummary.uniqueSymbols}`);
    lines.push(`- Variantes couvertes : ${report.symbolMatrixSummary.uniqueVariants}`);
    lines.push("");
    lines.push("Répartition par tier :");
    lines.push("");
    lines.push("| Tier | Nombre |");
    lines.push("|---|---:|");
    for (const tier of ["STRONG", "OK", "WEAK", "AVOID"]) lines.push(`| ${tier} | ${report.symbolMatrixSummary.byTier[tier]} |`);
    lines.push("");
  }

  // 8. Recommandations moteur
  lines.push("## 8. Recommandations moteur");
  lines.push("");
  lines.push("Sur la base de cette matrice :");
  lines.push("");
  lines.push("- **Mode opérationnel cible : NO_RISK_OFF**. La cellule (variant, RANGE) est systématiquement plus rentable que la cellule (variant, RISK_ON) pour les deux variantes RS couvertes. RANGE est l'environnement le plus favorable pour la rotation momentum.");
  lines.push("- **Interdire les variantes RS quand le régime macro est RISK_OFF**. Les cellules ALL_REGIMES × RISK_OFF sortent AVOID ou expectancy ≤ 0 pour `rs_90d_top10_hold20` (`rs_120d` est plus résilient).");
  lines.push("- **Allouer plus en RANGE qu'en RISK_ON** pour les variantes STRONG en RANGE.");
  if (report.symbolMatrixSummary) {
    lines.push("- **Filtrer par actif × variante × régime** : avec la matrice per-symbol, on peut maintenant interdire un actif sur une combinaison précise (ex. NVDA × rs_90d × RISK_ON sort AVOID per-cell) même si la combinaison globale est OK.");
  } else {
    lines.push("- **Priorité quant à ajouter** : un breakdown `bySymbolByRegime` dans les scripts de backtest. Sans ça, la décision per-actif-par-régime reste approximative.");
  }
  lines.push("- **Ne pas conclure pour les autres setups** (Pullback, Breakout, etc.) tant qu'un breakdown régime n'est pas ajouté à leurs JSON de backtest.");
  lines.push("");
  return lines.join("\n");
}

function expectedFormatMessage() {
  return [
    "",
    "Aucun fichier JSON exploitable n'a été trouvé.",
    "",
    "Cette matrice cherche les fichiers de backtest dans :",
    "  - tools/backtests/",
    "  - tools/backtests/output/",
    "",
    "Au moins un fichier exposant un breakdown `byRegime[]` est requis,",
    "par exemple `results-relative-strength-rotation-regime-v1.json`.",
    "",
  ].join("\n");
}

async function main() {
  console.log("[variant-regime-matrix] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  if (!files.length) {
    console.error("[variant-regime-matrix] aucun fichier .json trouvé");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[variant-regime-matrix] ${files.length} fichier(s) candidat(s)`);

  const regimeRecords = [];
  const symbolRegimeRecords = [];
  const symbolRecords = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch (err) {
      console.warn(`  ✗ ${basename(file)} — JSON invalide`);
      continue;
    }
    const regimeRecs = extractRegimeRecords(parsed, basename(file));
    if (regimeRecs.length) console.log(`  ✓ ${basename(file)} — ${regimeRecs.length} record(s) régime global`);
    regimeRecords.push(...regimeRecs);

    const symRegRecs = extractSymbolRegimeRecords(parsed, basename(file));
    if (symRegRecs.length) console.log(`  ✓ ${basename(file)} — ${symRegRecs.length} record(s) symbole × régime`);
    symbolRegimeRecords.push(...symRegRecs);

    // Aussi les records bySymbol (filter mode) pour la comparaison per-symbol
    const { records } = extractRecords(parsed, basename(file));
    for (const r of records) symbolRecords.push(r);
  }

  if (!regimeRecords.length) {
    console.error("[variant-regime-matrix] aucun record régime trouvé");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[variant-regime-matrix] ${regimeRecords.length} record(s) régime global au total`);
  console.log(`[variant-regime-matrix] ${symbolRegimeRecords.length} record(s) symbole × régime au total`);

  const { matrix, allCells, variants, regimes, regimeModes } = buildRegimeMatrix(regimeRecords);
  const cellsByTier = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
  for (const c of allCells) cellsByTier[c.tier]++;

  // === Nouvelle matrice per-symbol (si bySymbolByRegime est présent dans la source) ===
  let symbolMatrix = null;
  let symbolMatrixSummary = null;
  let symbolPerSymbolFocus = null;
  if (symbolRegimeRecords.length) {
    const built = buildSymbolRegimeMatrix(symbolRegimeRecords);
    symbolMatrix = built.matrix;
    const symbolCellsByTier = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
    for (const c of built.allCells) symbolCellsByTier[c.tier]++;
    const uniqueSymbols = new Set(built.allCells.map(c => c.symbol)).size;
    const uniqueVariants = new Set(built.allCells.map(c => c.variant)).size;
    symbolMatrixSummary = {
      totalCells: built.allCells.length,
      uniqueSymbols,
      uniqueVariants,
      byTier: symbolCellsByTier,
    };
    symbolPerSymbolFocus = {};
    for (const sym of FOCUS_SYMBOLS) {
      const symCells = built.allCells
        .filter(c => c.symbol === sym)
        .sort((a, b) => a.variant.localeCompare(b.variant) || a.regimeMode.localeCompare(b.regimeMode) || a.regime.localeCompare(b.regime));
      symbolPerSymbolFocus[sym] = symCells.length ? symCells : null;
    }
  }

  const perSymbol = buildPerSymbolFilterComparison(symbolRecords);
  const focus = focusPerSymbol(perSymbol, FOCUS_SYMBOLS);

  const robustVariants = findRobustVariants(allCells);
  const rangeOnlyVariants = findRangeOnlyVariants(allCells);
  const riskOffDangerous = findRiskOffDangerous(allCells);
  const variantsToBlacklist = findVariantsToBlacklist(allCells);

  const perSymbolObj = {};
  for (const e of perSymbol.values()) {
    if (!perSymbolObj[e.symbol]) perSymbolObj[e.symbol] = [];
    perSymbolObj[e.symbol].push({ variant: e.variant, allRegimes: e.allRegimes, noRiskOff: e.noRiskOff });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCells: allCells.length,
      variants,
      regimes,
      regimeModes,
      byTier: cellsByTier,
    },
    matrix,
    allCells,
    robustVariants,
    rangeOnlyVariants,
    riskOffDangerous,
    variantsToBlacklist,
    perSymbol: perSymbolObj,
    focus,
    symbolMatrix,
    symbolMatrixSummary,
    symbolPerSymbolFocus,
    knownLimitations: {
      regimeBreakdownAvailableOnlyForVariants: variants,
      perSymbolPerRegimeIndividualAvailable: Boolean(symbolMatrix),
      perSymbolFilterModeAvailable: true,
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[variant-regime-matrix] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé global : ${allCells.length} cellules — STRONG ${cellsByTier.STRONG}, OK ${cellsByTier.OK}, WEAK ${cellsByTier.WEAK}, AVOID ${cellsByTier.AVOID}`);
  if (symbolMatrixSummary) {
    console.log(`Résumé per-symbol : ${symbolMatrixSummary.totalCells} cellules sur ${symbolMatrixSummary.uniqueSymbols} actifs × ${symbolMatrixSummary.uniqueVariants} variants — STRONG ${symbolMatrixSummary.byTier.STRONG}, OK ${symbolMatrixSummary.byTier.OK}, WEAK ${symbolMatrixSummary.byTier.WEAK}, AVOID ${symbolMatrixSummary.byTier.AVOID}`);
  } else {
    console.log(`Résumé per-symbol : aucun bySymbolByRegime trouvé — section per-symbol omise (fallback legacy actif)`);
  }
  console.log(`Variantes robustes multi-régimes : ${robustVariants.length}`);
  console.log(`Variantes RANGE-only : ${rangeOnlyVariants.length}`);
  console.log(`Variantes dangereuses RISK_OFF : ${riskOffDangerous.length}`);
  console.log(`Variantes à blacklister : ${variantsToBlacklist.length}`);
}

main().catch(err => {
  console.error("[variant-regime-matrix] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
