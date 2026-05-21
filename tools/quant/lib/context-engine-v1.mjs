// tools/quant/lib/context-engine-v1.mjs
//
// CONTEXT ENGINE V1 — module analytique pur ManiTradePro.
//
// Référence documentaire : docs/quant/CONTEXT_ENGINE.md
//
// Rôle : produire un snapshot lisible, déterministe et testable du contexte
// marché à partir de bougies daily historiques.
//
// LIMITES STRUCTURELLES (cf. brief créateur PR-CTX-2 + GOVERNANCE.md) :
//   - Module read-only. Aucun effet runtime. Aucune dépendance worker.js.
//   - Aucune consommation runtime. Ne décide rien. Ne valide aucun setup.
//   - Aucun appel VIX externe. Le proxy de volatilité est calculé exclusivement
//     à partir de la realized vol 20j annualisée SPY.
//   - Aucun scoring pseudo-prédictif. Le snapshot décrit l'état présent,
//     il ne prédit pas le futur.
//   - PR-CTX-3 (futur) consommera ce snapshot pour autoriser ou interdire
//     certains setups. Cette consommation n'est PAS implémentée ici.
//
// CONTRAT D'API :
//   - Pure functions. Pas de mutation. Pas d'effet de bord. Pas d'I/O.
//   - Déterministe. Mêmes entrées → mêmes sorties JSON stables.
//   - Pas d'utilisation de Date.now() / new Date(). asOf est soit fourni
//     explicitement, soit déduit des bougies en entrée.
//
// LECTURES :
//   - Le régime 4-états est délégué à `regime-rules-v1.mjs` (CLEAN-2).
//     Aucune logique de régime n'est dupliquée ici.

import {
  classifyFourStateRegimeV1,
  REGIME_V1_EMA_PERIOD,
  REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
  REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS,
  REGIME_V1_METADATA,
} from "./regime-rules-v1.mjs";

// === Identité version ======================================================

export const CONTEXT_ENGINE_V1_VERSION = "context-engine-v1";

// === Univers contexte V1 (figé) ============================================

const PRIMARY_TREND_INDICES = Object.freeze(["SPY", "QQQ", "SMH"]);
const SECTOR_SPDR = Object.freeze([
  "XLK", "XLF", "XLE", "XLV", "XLI", "XLY",
  "XLP", "XLU", "XLB", "XLRE", "XLC",
]);
const DEFENSIVE_PROXIES = Object.freeze(["TLT", "GLD"]);

export const CONTEXT_V1_UNIVERSE = Object.freeze([
  ...PRIMARY_TREND_INDICES,
  ...SECTOR_SPDR,
  ...DEFENSIVE_PROXIES,
]);

// === Constantes de calcul ==================================================

const REL_STRENGTH_SHORT_DAYS = 20;
const REL_STRENGTH_MID_DAYS = 63;
const VOL_MEDIAN_WINDOW_DAYS = 252;
const VOL_MEDIAN_MIN_SAMPLES = 126; // au moins la moitié de la fenêtre
const MIN_HISTORY_DAYS = 252;
const TRADING_DAYS_PER_YEAR = 252;
const SECTOR_TOP_N = 3;

const VOL_STATE_ELEVATED_FACTOR = 1.3;
const VOL_STATE_LOW_FACTOR = 0.7;

// === Helpers internes purs =================================================

function ema(values, period) {
  if (!Array.isArray(values) || period <= 0) return null;
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(null);
  let seed = 0;
  for (let i = 0; i < period; i++) {
    if (!Number.isFinite(values[i])) return null;
    seed += values[i];
  }
  out[period - 1] = seed / period;
  for (let i = period; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return null;
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function realizedVolAnnualisedAt(closes, idx, window) {
  if (!Array.isArray(closes)) return null;
  if (idx < window) return null;
  if (idx >= closes.length) return null;
  const logReturns = [];
  for (let i = idx - window + 1; i <= idx; i++) {
    if (i === 0) continue;
    const prev = closes[i - 1];
    const cur = closes[i];
    if (!(prev > 0) || !(cur > 0)) return null;
    logReturns.push(Math.log(cur / prev));
  }
  if (logReturns.length < 2) return null;
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  let variance = 0;
  for (const r of logReturns) variance += (r - mean) ** 2;
  variance /= logReturns.length - 1;
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function pctChange(later, earlier) {
  if (!(earlier > 0)) return null;
  if (!Number.isFinite(later)) return null;
  return (later - earlier) / earlier;
}

function median(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round4(v) {
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 10000) / 10000;
}

function round1(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10) / 10;
}

function findIndexAtOrBefore(candles, asOfYmd) {
  if (!Array.isArray(candles) || candles.length === 0) return -1;
  for (let i = candles.length - 1; i >= 0; i--) {
    const t = candles[i] && candles[i].time;
    if (typeof t === "string" && t <= asOfYmd) return i;
  }
  return -1;
}

// Mémoïse EMA200 + close + position vs EMA pour un symbole à un index donné.
function computeTrendState(candles, idx) {
  if (!Array.isArray(candles) || idx < 0 || idx >= candles.length) {
    return { above: null, pctFromEma: null, close: null, ema200: null };
  }
  const closes = candles.slice(0, idx + 1).map((c) => c.close);
  const series = ema(closes, REGIME_V1_EMA_PERIOD);
  if (!series || series[idx] === null || !Number.isFinite(series[idx])) {
    return { above: null, pctFromEma: null, close: closes[idx] ?? null, ema200: null };
  }
  const c = closes[idx];
  const e = series[idx];
  if (!Number.isFinite(c)) {
    return { above: null, pctFromEma: null, close: null, ema200: e };
  }
  return {
    above: c > e,
    pctFromEma: (c - e) / e,
    close: c,
    ema200: e,
  };
}

function computeRegimeConfidence({
  regime,
  trendStates,
  rvol,
}) {
  if (regime === null) return 0;
  if (regime === "HIGH_VOL") {
    if (rvol === null) return 50;
    const intensity = clamp(
      (rvol - REGIME_V1_HIGH_VOL_RVOL_THRESHOLD) / REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
      0,
      1,
    );
    return Math.round(50 + intensity * 50);
  }
  const dists = trendStates
    .filter((t) => t && Number.isFinite(t.pctFromEma))
    .map((t) => Math.abs(t.pctFromEma));
  const avgAbsDistance = dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 0;
  if (regime === "RISK_ON" || regime === "RISK_OFF") {
    return Math.round(clamp(50 + (avgAbsDistance / 0.05) * 50, 50, 100));
  }
  if (regime === "RANGE") {
    return Math.round(clamp(80 - (avgAbsDistance / 0.10) * 50, 30, 80));
  }
  return 0;
}

// === Fonction principale ===================================================

export function buildContextSnapshotV1({ asOf = null, candlesBySymbol = {} } = {}) {
  const warnings = [];
  const missingSymbols = [];
  const insufficientHistory = [];
  const evaluatedSymbols = [];

  if (asOf !== null && typeof asOf !== "string") {
    return buildErrorSnapshot({
      reason: "invalid_asOf",
      universe: CONTEXT_V1_UNIVERSE,
    });
  }

  // 1) Identifier les symboles évaluables et leur index local.
  const indexBySymbol = new Map();
  for (const sym of CONTEXT_V1_UNIVERSE) {
    const candles = candlesBySymbol?.[sym];
    if (!Array.isArray(candles) || candles.length === 0) {
      missingSymbols.push(sym);
      continue;
    }
    let idx;
    if (asOf) {
      idx = findIndexAtOrBefore(candles, asOf);
      if (idx < 0) {
        insufficientHistory.push(sym);
        continue;
      }
    } else {
      idx = candles.length - 1;
    }
    if (idx + 1 < MIN_HISTORY_DAYS) {
      insufficientHistory.push(sym);
      continue;
    }
    indexBySymbol.set(sym, idx);
    evaluatedSymbols.push(sym);
  }

  // 2) Déduire effectiveAsOf (date alignée commune) si pas fourni.
  let effectiveAsOf = asOf;
  if (!effectiveAsOf) {
    let minTime = null;
    for (const sym of evaluatedSymbols) {
      const idx = indexBySymbol.get(sym);
      const t = candlesBySymbol[sym][idx].time;
      if (minTime === null || t < minTime) minTime = t;
    }
    effectiveAsOf = minTime;
  }

  // 3) Recaler chaque symbole sur effectiveAsOf.
  if (effectiveAsOf) {
    for (const sym of evaluatedSymbols) {
      const idx = findIndexAtOrBefore(candlesBySymbol[sym], effectiveAsOf);
      if (idx + 1 < MIN_HISTORY_DAYS) {
        // Pas assez d'historique au point recalé → bascule en insufficient.
        indexBySymbol.delete(sym);
        insufficientHistory.push(sym);
      } else {
        indexBySymbol.set(sym, idx);
      }
    }
  }

  // Synchronise evaluatedSymbols après recalage.
  const evaluatedFinal = evaluatedSymbols.filter((s) => indexBySymbol.has(s));

  // 4) Calcul des états de tendance par symbole évalué (EMA200 vs close).
  const trendStateBySymbol = new Map();
  for (const sym of evaluatedFinal) {
    const candles = candlesBySymbol[sym];
    const idx = indexBySymbol.get(sym);
    const state = computeTrendState(candles, idx);
    if (state.above === null) {
      warnings.push(`EMA${REGIME_V1_EMA_PERIOD} unavailable for ${sym}`);
    }
    trendStateBySymbol.set(sym, state);
  }

  // 5) Régime — délégation lib canonique CLEAN-2.
  const spyTrend = trendStateBySymbol.get("SPY") || null;
  const qqqTrend = trendStateBySymbol.get("QQQ") || null;
  const smhTrend = trendStateBySymbol.get("SMH") || null;
  const spyAbove = spyTrend ? spyTrend.above : null;
  const qqqAbove = qqqTrend ? qqqTrend.above : null;
  const smhAbove = smhTrend ? smhTrend.above : null;

  // 6) Realized vol SPY 20j annualisée + état relatif vs médiane 252j.
  let rvol = null;
  let rvolState = "UNKNOWN";
  let rvolMedian = null;
  if (evaluatedFinal.includes("SPY")) {
    const candles = candlesBySymbol.SPY;
    const idx = indexBySymbol.get("SPY");
    const closes = candles.slice(0, idx + 1).map((c) => c.close);
    rvol = realizedVolAnnualisedAt(closes, closes.length - 1, REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS);

    if (rvol === null) {
      rvolState = "UNKNOWN";
      warnings.push("SPY realized vol cannot be computed (need at least 20 days)");
    } else {
      const rvolSeries = [];
      const start = Math.max(
        REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS,
        closes.length - VOL_MEDIAN_WINDOW_DAYS,
      );
      for (let i = start; i <= closes.length - 1; i++) {
        const v = realizedVolAnnualisedAt(closes, i, REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS);
        if (v !== null) rvolSeries.push(v);
      }
      rvolMedian = rvolSeries.length >= VOL_MEDIAN_MIN_SAMPLES ? median(rvolSeries) : null;
      if (rvol > REGIME_V1_HIGH_VOL_RVOL_THRESHOLD) {
        rvolState = "HIGH";
      } else if (rvolMedian !== null && rvolMedian > 0) {
        if (rvol > rvolMedian * VOL_STATE_ELEVATED_FACTOR) rvolState = "ELEVATED";
        else if (rvol < rvolMedian * VOL_STATE_LOW_FACTOR) rvolState = "LOW";
        else rvolState = "NORMAL";
      } else {
        rvolState = "UNKNOWN";
        warnings.push(
          "Insufficient history for SPY realized vol median (need 252 days of rolling samples)",
        );
      }
    }
  } else {
    warnings.push("SPY missing — regime and volatility cannot be classified");
  }

  // 7) Classification 4-état officielle (lib canonique CLEAN-2).
  let regime = null;
  if (spyAbove !== null && qqqAbove !== null && smhAbove !== null) {
    // Si rvol est null, on retire l'override HIGH_VOL en passant 0 (force base state).
    const rvolForRegime = rvol === null ? 0 : rvol;
    regime = classifyFourStateRegimeV1({
      spyAboveEma200: spyAbove,
      qqqAboveEma200: qqqAbove,
      smhAboveEma200: smhAbove,
      realizedVolAnnualised: rvolForRegime,
    });
  } else {
    warnings.push(
      "Cannot classify regime — primary trend indices (SPY/QQQ/SMH) incomplete",
    );
  }

  // 8) Confidence.
  const regimeConfidence = computeRegimeConfidence({
    regime,
    trendStates: [spyTrend, qqqTrend, smhTrend],
    rvol,
  });

  // 9) Breadth (indices + secteurs SPDR).
  const breadthSymbols = [...PRIMARY_TREND_INDICES, ...SECTOR_SPDR].filter((s) =>
    evaluatedFinal.includes(s),
  );
  let riskOnCount = 0;
  let riskOffCount = 0;
  let neutralCount = 0;
  for (const sym of breadthSymbols) {
    const state = trendStateBySymbol.get(sym);
    if (!state || state.above === null) neutralCount++;
    else if (state.above === true) riskOnCount++;
    else riskOffCount++;
  }
  const totalEvaluated = breadthSymbols.length;
  const pctRiskOn = totalEvaluated > 0 ? round1((riskOnCount / totalEvaluated) * 100) : 0;
  const pctRiskOff = totalEvaluated > 0 ? round1((riskOffCount / totalEvaluated) * 100) : 0;

  // 10) Sector leadership — relative strength 20j et 63j vs SPY.
  const sectorScores = [];
  if (evaluatedFinal.includes("SPY")) {
    const spyCandles = candlesBySymbol.SPY;
    const spyIdx = indexBySymbol.get("SPY");
    const spyCloses = spyCandles.map((c) => c.close);
    const spyR20 = pctChange(spyCloses[spyIdx], spyCloses[spyIdx - REL_STRENGTH_SHORT_DAYS]);
    const spyR63 = pctChange(spyCloses[spyIdx], spyCloses[spyIdx - REL_STRENGTH_MID_DAYS]);

    for (const sym of SECTOR_SPDR) {
      if (!evaluatedFinal.includes(sym)) continue;
      const candles = candlesBySymbol[sym];
      const idx = indexBySymbol.get(sym);
      const closes = candles.map((c) => c.close);
      const r20 = pctChange(closes[idx], closes[idx - REL_STRENGTH_SHORT_DAYS]);
      const r63 = pctChange(closes[idx], closes[idx - REL_STRENGTH_MID_DAYS]);
      if (r20 === null || r63 === null || spyR20 === null || spyR63 === null) continue;
      const rs20 = r20 - spyR20;
      const rs63 = r63 - spyR63;
      const score = 0.5 * rs20 + 0.5 * rs63;
      const trend = trendStateBySymbol.get(sym);
      const trendState = trend && trend.above === true
        ? "ABOVE_EMA200"
        : trend && trend.above === false
          ? "BELOW_EMA200"
          : "UNKNOWN";
      sectorScores.push({
        symbol: sym,
        score: round4(score),
        trendState,
        relStrength20d: round4(rs20),
        relStrength63d: round4(rs63),
      });
    }
  } else if (SECTOR_SPDR.some((s) => evaluatedFinal.includes(s))) {
    warnings.push("Sector leadership skipped — SPY baseline unavailable");
  }

  const leaders = [...sectorScores].sort((a, b) => b.score - a.score).slice(0, SECTOR_TOP_N);
  const laggards = [...sectorScores].sort((a, b) => a.score - b.score).slice(0, SECTOR_TOP_N);

  // 11) Defensive confirmation (TLT, GLD).
  const tltTrend = trendStateBySymbol.get("TLT");
  const gldTrend = trendStateBySymbol.get("GLD");
  const tltState = describeDefensive({
    type: "tlt",
    defensiveAbove: tltTrend ? tltTrend.above : null,
    spyAbove,
  });
  const gldState = describeDefensive({
    type: "gld",
    defensiveAbove: gldTrend ? gldTrend.above : null,
    spyAbove,
  });

  // 12) Sortie déterministe.
  return {
    version: CONTEXT_ENGINE_V1_VERSION,
    asOf: effectiveAsOf,
    regime,
    regimeConfidence,
    regimeSource: {
      primary: "SPY",
      rulesVersion: `regime-rules-${REGIME_V1_METADATA.version}`,
    },
    breadth: {
      riskOnCount,
      riskOffCount,
      neutralCount,
      totalEvaluated,
      pctRiskOn,
      pctRiskOff,
    },
    sectorLeadership: {
      leaders,
      laggards,
    },
    vol: {
      proxy: "SPY_REALIZED_VOL_20D",
      value: round4(rvol),
      state: rvolState,
    },
    defensiveConfirmation: {
      tltState,
      gldState,
    },
    warnings,
    dataQuality: {
      missingSymbols,
      insufficientHistory,
      evaluatedSymbols: evaluatedFinal,
    },
  };
}

function describeDefensive({ type, defensiveAbove, spyAbove }) {
  if (defensiveAbove === null) return "UNKNOWN";
  if (spyAbove === null) return "UNKNOWN";
  if (type === "tlt") {
    if (defensiveAbove && !spyAbove) return "CONFIRM_RISK_OFF";
    if (defensiveAbove && spyAbove) return "RISK_ON_CONTRADICTION";
    if (!defensiveAbove && !spyAbove) return "RISK_ON_CONTRADICTION";
    return "NEUTRAL"; // !defensiveAbove && spyAbove
  }
  // type === "gld"
  if (defensiveAbove && !spyAbove) return "CONFIRM_STRESS";
  if (!defensiveAbove && !spyAbove) return "RISK_ON_CONTRADICTION";
  return "NEUTRAL";
}

function buildErrorSnapshot({ reason, universe }) {
  return {
    version: CONTEXT_ENGINE_V1_VERSION,
    asOf: null,
    regime: null,
    regimeConfidence: 0,
    regimeSource: {
      primary: "SPY",
      rulesVersion: `regime-rules-${REGIME_V1_METADATA.version}`,
    },
    breadth: {
      riskOnCount: 0,
      riskOffCount: 0,
      neutralCount: 0,
      totalEvaluated: 0,
      pctRiskOn: 0,
      pctRiskOff: 0,
    },
    sectorLeadership: { leaders: [], laggards: [] },
    vol: {
      proxy: "SPY_REALIZED_VOL_20D",
      value: null,
      state: "UNKNOWN",
    },
    defensiveConfirmation: {
      tltState: "UNKNOWN",
      gldState: "UNKNOWN",
    },
    warnings: [`invalid_input:${reason}`],
    dataQuality: {
      missingSymbols: [...universe],
      insufficientHistory: [],
      evaluatedSymbols: [],
    },
  };
}
