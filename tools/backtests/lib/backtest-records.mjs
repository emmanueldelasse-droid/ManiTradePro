// tools/backtests/lib/backtest-records.mjs
//
// Helpers partagés pour la lecture et la normalisation des résultats de backtest.
// Utilisé par :
//   - tools/backtests/asset-quality-engine-v1.mjs
//   - tools/backtests/asset-setup-matrix-v1.mjs
//
// Toute évolution doit garder la rétro-compatibilité — les scores en aval
// dépendent du format des records émis.

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// Famille de setup déduite du nom de variant, setupId, ou nom de source en fallback
export function inferSetupFamily(record) {
  const setupId = (record.setupId || "").toString().toUpperCase();
  if (setupId) return setupId;
  const variant = (record.variant || "").toString().toLowerCase();
  if (variant.startsWith("rs_")) return "RELATIVE_STRENGTH_ROTATION";
  if (variant.includes("breakout")) return "BREAKOUT_EXPANSION";
  if (variant.includes("rsi") || variant.includes("pullback")) return "PULLBACK_MOMENTUM";
  if (variant.includes("meanrev")) return "MEAN_REVERSION";
  if (variant.includes("volcomp") || variant.includes("vol_comp")) return "VOLATILITY_COMPRESSION";
  const source = (record.source || "").toString().toLowerCase();
  if (source.includes("relative-strength") || source.includes("rotation")) return "RELATIVE_STRENGTH_ROTATION";
  if (source.includes("breakout")) return "BREAKOUT_EXPANSION";
  if (source.includes("pullback")) return "PULLBACK_MOMENTUM";
  if (source.includes("meanrev")) return "MEAN_REVERSION";
  return "UNKNOWN";
}

export function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Normalise un enregistrement brut (symbol + métriques) vers le format interne.
// Retourne null si pas d'enregistrement exploitable.
export function normalizeRecord(raw, context) {
  const symbol = (raw.symbol || "").toString().trim().toUpperCase();
  if (!symbol) return null;
  const trades = toNumberOrNull(raw.trades);
  if (trades === null || trades <= 0) return null;
  // winrate peut être en % (0-100) ou en ratio (0-1). On normalise en % (0-100).
  let winrate = toNumberOrNull(raw.winrate);
  if (winrate !== null && winrate > 0 && winrate <= 1) winrate = winrate * 100;
  return {
    symbol,
    source: context.source,
    setupFamily: inferSetupFamily({
      setupId: raw.setupId || context.setupId,
      variant: raw.variant || context.variant,
      source: context.source,
    }),
    variant: raw.variant || context.variant || null,
    regimeMode: raw.regimeMode || context.regimeMode || null,
    year: raw.year || context.year || null,
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
  };
}

// === Adaptateurs par shape JSON ===

export function adaptShapeFlatArray(data, source) {
  if (!Array.isArray(data)) return null;
  if (!data.length) return [];
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  if (first.symbol && !first.bySymbol) {
    const out = [];
    for (const raw of data) {
      const rec = normalizeRecord(raw, { source });
      if (rec) out.push(rec);
    }
    return out;
  }
  return null;
}

export function adaptShapeVariantArrayWithBySymbol(data, source) {
  if (!Array.isArray(data)) return null;
  if (!data.length) return [];
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  if (!first.variant || !Array.isArray(first.bySymbol)) return null;
  const out = [];
  for (const variantBlock of data) {
    for (const raw of variantBlock.bySymbol || []) {
      const rec = normalizeRecord(raw, { source, variant: variantBlock.variant });
      if (rec) out.push(rec);
    }
  }
  return out;
}

export function adaptShapeRsRotation(data, source) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!data.overall || typeof data.overall !== "object") return null;
  const hasYearly = data.yearly && typeof data.yearly === "object" && Object.keys(data.yearly).length > 0;
  const out = [];
  const pushBySymbolArray = (arr, year) => {
    if (!Array.isArray(arr)) return;
    for (const raw of arr) {
      const rec = normalizeRecord(raw, { source, year });
      if (rec) out.push(rec);
    }
  };
  if (hasYearly) {
    for (const [year, block] of Object.entries(data.yearly)) {
      if (block && Array.isArray(block.bySymbol)) pushBySymbolArray(block.bySymbol, year);
    }
  } else if (Array.isArray(data.overall.bySymbol)) {
    pushBySymbolArray(data.overall.bySymbol, null);
  }
  return out.length > 0 ? out : null;
}

export function adaptShapeMultiSetupGrid(data, source) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const hasOverallBSS = data.overall && Array.isArray(data.overall.bySymbolSetup);
  const hasYearlyBSS = data.yearly && Object.values(data.yearly).some(v => v && Array.isArray(v.bySymbolSetup));
  if (!hasOverallBSS && !hasYearlyBSS) return null;
  const out = [];
  const pushBSS = (arr, year) => {
    for (const raw of arr || []) {
      const rec = normalizeRecord(raw, { source, year });
      if (rec) out.push(rec);
    }
  };
  if (hasYearlyBSS) {
    for (const [year, block] of Object.entries(data.yearly)) {
      if (block && Array.isArray(block.bySymbolSetup)) pushBSS(block.bySymbolSetup, year);
    }
  } else if (hasOverallBSS) {
    pushBSS(data.overall.bySymbolSetup, null);
  }
  return out.length > 0 ? out : null;
}

export function adaptShapePullbackYearlyWalkforward(data, source) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!Array.isArray(data.overall) || !data.overall.length) return null;
  const first = data.overall[0];
  if (!first.variant || !Array.isArray(first.bySymbol)) return null;
  const hasYearly = data.yearly && typeof data.yearly === "object" && Object.keys(data.yearly).length > 0;
  const out = [];
  const pushFromVariantArray = (arr, year) => {
    for (const variantBlock of arr || []) {
      for (const raw of variantBlock.bySymbol || []) {
        const rec = normalizeRecord(raw, { source, variant: variantBlock.variant, year });
        if (rec) out.push(rec);
      }
    }
  };
  if (hasYearly) {
    for (const [year, block] of Object.entries(data.yearly)) {
      if (Array.isArray(block)) pushFromVariantArray(block, year);
    }
  } else {
    pushFromVariantArray(data.overall, null);
  }
  return out.length > 0 ? out : null;
}

// Ordre important : les shapes les plus spécifiques d'abord, le flat array en
// dernier (fallback le plus permissif).
export const ADAPTERS = [
  adaptShapeFlatArray,
  adaptShapeVariantArrayWithBySymbol,
  adaptShapePullbackYearlyWalkforward,
  adaptShapeMultiSetupGrid,
  adaptShapeRsRotation,
];

export function extractRecords(data, source) {
  for (const adapt of ADAPTERS) {
    const out = adapt(data, source);
    if (Array.isArray(out) && out.length > 0) return { records: out, adapter: adapt.name };
  }
  return { records: [], adapter: null };
}

// Liste les fichiers .json présents dans les dossiers fournis, en excluant
// les noms passés dans skipFilenames (typiquement les rapports générés par
// l'appelant lui-même).
export async function listJsonFiles({ inputDirs, skipFilenames = new Set() }) {
  const seen = new Set();
  const files = [];
  for (const dir of inputDirs) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch (_err) {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      if (skipFilenames.has(name)) continue;
      const full = join(dir, name);
      if (seen.has(full)) continue;
      try {
        const s = await stat(full);
        if (!s.isFile()) continue;
      } catch (_e) {
        continue;
      }
      seen.add(full);
      files.push(full);
    }
  }
  return files.sort();
}

// === Buckets d'agrégation pondérée ===

export function emptyBucket() {
  return {
    trades: 0,
    wins: 0,
    losses: 0,
    weightedExpectancySum: 0,
    weightedExpectancyTrades: 0,
    weightedPfSum: 0,
    weightedPfTrades: 0,
    totalR: 0,
    totalRRecorded: 0,
    totalPnl: 0,
    totalPnlRecorded: 0,
    maxDrawdown: 0,
    longestLossStreak: 0,
    recordsCount: 0,
  };
}

export function pushToBucket(bucket, rec) {
  bucket.trades += rec.trades;
  if (rec.wins !== null) bucket.wins += rec.wins;
  if (rec.losses !== null) bucket.losses += rec.losses;
  if (rec.expectancy !== null) {
    bucket.weightedExpectancySum += rec.expectancy * rec.trades;
    bucket.weightedExpectancyTrades += rec.trades;
  }
  if (rec.profitFactor !== null && rec.profitFactor < 999) {
    // 999 est utilisé comme sentinelle "infini" (zéro perte) — exclu de la moyenne
    bucket.weightedPfSum += rec.profitFactor * rec.trades;
    bucket.weightedPfTrades += rec.trades;
  }
  if (rec.totalR !== null) { bucket.totalR += rec.totalR; bucket.totalRRecorded++; }
  if (rec.totalPnl !== null) { bucket.totalPnl += rec.totalPnl; bucket.totalPnlRecorded++; }
  if (rec.maxDrawdown !== null && rec.maxDrawdown > bucket.maxDrawdown) bucket.maxDrawdown = rec.maxDrawdown;
  if (rec.longestLossStreak !== null && rec.longestLossStreak > bucket.longestLossStreak) bucket.longestLossStreak = rec.longestLossStreak;
  bucket.recordsCount++;
}

export function summarizeBucket(bucket) {
  const winrate = bucket.trades > 0 ? (bucket.wins / bucket.trades) * 100 : null;
  const expectancy = bucket.weightedExpectancyTrades > 0
    ? bucket.weightedExpectancySum / bucket.weightedExpectancyTrades
    : null;
  const profitFactor = bucket.weightedPfTrades > 0
    ? bucket.weightedPfSum / bucket.weightedPfTrades
    : null;
  return {
    trades: bucket.trades,
    wins: bucket.wins,
    losses: bucket.losses,
    winrate,
    expectancy,
    profitFactor,
    totalR: bucket.totalRRecorded > 0 ? bucket.totalR : null,
    totalPnl: bucket.totalPnlRecorded > 0 ? bucket.totalPnl : null,
    maxDrawdown: bucket.maxDrawdown,
    longestLossStreak: bucket.longestLossStreak,
    recordsCount: bucket.recordsCount,
  };
}

// Quand une source emet plusieurs regimeMode pour les mêmes trades sous-jacents
// (ex. ALL_REGIMES et NO_RISK_OFF sont deux filtres sur les mêmes runs), on ne
// conserve qu'un seul mode dans l'agrégat principal pour éviter le double-comptage.
// L'autre mode reste capté à part par l'appelant (via byRegimeMode).
export function pickCanonicalRecords(records) {
  const groups = new Map();
  for (const rec of records) {
    const key = [rec.symbol, rec.source, rec.setupFamily, rec.variant || "", rec.year || ""].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }
  const canonical = [];
  for (const group of groups.values()) {
    if (group.length === 1) { canonical.push(group[0]); continue; }
    // Préférer NO_RISK_OFF (mode opérationnel cible), sinon ALL_REGIMES, sinon le premier
    const noRiskOff = group.find(r => r.regimeMode === "NO_RISK_OFF");
    if (noRiskOff) { canonical.push(noRiskOff); continue; }
    const allReg = group.find(r => r.regimeMode === "ALL_REGIMES");
    if (allReg) { canonical.push(allReg); continue; }
    canonical.push(group[0]);
  }
  return canonical;
}
