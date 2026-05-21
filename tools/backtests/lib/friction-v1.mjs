// tools/backtests/lib/friction-v1.mjs
//
// MODÈLE FRICTION V1 OFFICIEL ManiTradePro — source technique canonique.
//
// Référence documentaire : docs/quant/FRICTION_MODEL.md
//
// Formule :
//
//   frictionPct = (0.30 + 0.02 × holdDays) × multiplier
//   frictionR   = frictionPct / 5
//
// Composantes (hypothèses prudentes documentées dans FRICTION_MODEL.md § 4) :
//   - 0.30 % round-trip = spread (~0.10) + slippage (~0.10) + commission (~0.10) cumulés.
//   - 0.02 % par jour de hold = proxy gap overnight, dérive financement, dégradation tenue.
//   - multiplier permet le stress test (×2, ×3) sans modification de la formule de base.
//
// Conversion R : 5 % de mouvement = 1R (convention RS Rotation v1, héritée).
//
// CONTRAT D'API :
//   - Déterministe. Pas de random. Pas d'état. Pas d'effet de bord.
//   - Pas de logique cachée. Pas de mutation. Pas d'IA. Pas de paramètres implicites.
//   - holdDays négatif ou non fini → return null (pas d'exception, le caller décide).
//
// CONTRAT GOUVERNANCE :
//   - Toute modification de cette formule = PR documentaire dédiée avec impact quant
//     mesuré (re-run des 4 scripts consommateurs + diff outputs).
//   - Interdiction d'altérer ces constantes pour faire passer un setup (anti-overfit
//     `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 6.2).
//
// Scripts consommateurs (au 2026-05-19) :
//   - tools/backtests/rs-rotation-robustness-lab-v1.mjs
//   - tools/backtests/rs-rotation-robustness-v1.mjs
//   - tools/backtests/meanrev-etf-range-v1.mjs
//   - tools/backtests/rs-rotation-hardening-v1.mjs

/**
 * Constantes officielles V1. Documentation : docs/quant/FRICTION_MODEL.md § 3.
 * Modification = PR documentaire dédiée + audit régression quant.
 */
export const FRICTION_V1_ROUND_TRIP_PCT = 0.30; // % round-trip de base
export const FRICTION_V1_DAILY_PCT = 0.02;       // % par jour de hold
export const FRICTION_V1_R_CONVERSION = 5;       // 5 % de mouvement = 1R

/**
 * Métadonnées exportables pour reporting (utile pour les sections markdown
 * des rapports backtest qui veulent afficher la formule).
 */
export const FRICTION_V1_METADATA = Object.freeze({
  version: "v1",
  roundTripPct: FRICTION_V1_ROUND_TRIP_PCT,
  dailyPct: FRICTION_V1_DAILY_PCT,
  rConversion: FRICTION_V1_R_CONVERSION,
  formulaPct: "(0.30 + 0.02 × holdDays) × multiplier",
  formulaR: "((0.30 + 0.02 × holdDays) × multiplier) / 5",
  componentsBreakdown: {
    spreadOneWayPct: 0.05,
    slippageOneWayPct: 0.05,
    commissionOneWayPct: 0.05,
    roundTripTotalPct: 0.30,
    overnightGapPenaltyPctPerDay: 0.02,
  },
  docsReference: "docs/quant/FRICTION_MODEL.md",
});

/**
 * Compute friction en pourcentage brut (avant conversion R).
 *
 * @param {Object} opts
 * @param {number} opts.holdDays   Durée de hold en jours bourse (≥ 0).
 * @param {number} [opts.multiplier=1]  Multiplicateur de stress (1 = baseline, 2/3 = stress).
 * @returns {number|null}  Friction en % du capital engagé, ou null si entrée invalide.
 */
export function computeFrictionPctV1({ holdDays, multiplier = 1 } = {}) {
  if (!Number.isFinite(holdDays) || holdDays < 0) return null;
  if (!Number.isFinite(multiplier) || multiplier < 0) return null;
  return (FRICTION_V1_ROUND_TRIP_PCT + FRICTION_V1_DAILY_PCT * holdDays) * multiplier;
}

/**
 * Compute friction en unités R (selon la convention 5 % = 1R).
 *
 * @param {Object} opts
 * @param {number} opts.holdDays   Durée de hold en jours bourse (≥ 0).
 * @param {number} [opts.multiplier=1]  Multiplicateur de stress (1 = baseline, 2/3 = stress).
 * @returns {number|null}  Friction en R, ou null si entrée invalide.
 */
export function computeFrictionV1({ holdDays, multiplier = 1 } = {}) {
  const pct = computeFrictionPctV1({ holdDays, multiplier });
  if (pct === null) return null;
  return pct / FRICTION_V1_R_CONVERSION;
}
