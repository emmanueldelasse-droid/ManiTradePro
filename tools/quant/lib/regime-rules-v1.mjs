// tools/quant/lib/regime-rules-v1.mjs
//
// MARKET REGIMES V1 OFFICIAL — source technique canonique ManiTradePro.
//
// Référence documentaire : docs/quant/REGIME_RULES.md
//
// Le projet ManiTradePro définit 4 régimes officiels v1 :
//   - RISK_ON   : marché clairement haussier (SPY ET QQQ ET SMH > EMA200)
//   - RANGE     : marché mixte (au moins un indice ne respecte pas RISK_ON ni RISK_OFF)
//   - RISK_OFF  : marché clairement baissier (SPY ET QQQ ET SMH < EMA200)
//   - HIGH_VOL  : volatilité réalisée 20j SPY > 25 % annualisée — priority override
//                 sur les 3 régimes de base.
//
// Limitations volontaires (cf. brief créateur 2026-05-19 § *RÉGIMES OFFICIELS V1*) :
//   - Pas de 15 sous-régimes opaques.
//   - Pas d'IA / machine learning / scoring opaque.
//   - Pas de probabilité pseudo-scientifique.
//   - Pas d'auto-learning.
//   - Pas d'heuristiques incompréhensibles.
//
// Le régime n'est PAS une prédiction. C'est une **description structurelle**
// de l'environnement actuel, utilisée pour autoriser ou interdire certains
// comportements setups (cf. PR-CTX-2 Context Engine V1 — futur).
//
// CONTRAT D'API :
//   - Déterministe. Pas de random. Pas d'état. Pas d'effet de bord.
//   - Pure functions. Pas de mutation. Pas d'IA. Pas de paramètres implicites.
//   - Entrées invalides → return null (le caller décide, jamais d'exception).
//
// CONTRAT GOUVERNANCE :
//   - Toute modification de cette définition = PR documentaire dédiée avec
//     audit régression sur tous les scripts consommateurs.
//   - Interdiction d'altérer les seuils pour faire passer un setup (anti-overfit
//     `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 6.2).
//
// Scripts consommateurs canoniques (au 2026-05-19) :
//   - tools/backtests/rs-rotation-robustness-v1.mjs
//   - tools/backtests/rs-rotation-robustness-lab-v1.mjs
//   - tools/backtests/rs-rotation-hardening-v1.mjs (seul avec HIGH_VOL)
//
// Scripts historiques NON migrés (cf. REGIME_RULES.md § "Dette technique CLEAN-2b") :
//   - tools/backtests/market-regime-v1.mjs
//   - tools/backtests/backtest-pullback-yearly-walkforward.mjs
//   - tools/backtests/backtest-multi-setup-grid.mjs
//   - tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs
//   - tools/backtests/new-setup-discovery-lab-v1.mjs
//   - tools/backtests/sector-rs-destruction-tests-v1.mjs
//   - tools/backtests/sector-rs-concentration-control-v1.mjs
//   - tools/backtests/trend-pullback-dynamic-support-v1.mjs
//
// Ces 8 scripts conservent leur définition inline pour préserver leurs outputs
// historiques (ancrent les PR #207, #208, #210, #211, etc.). Migration possible
// en CLEAN-2b après re-validation byte-à-byte sur dataset actuel.

/**
 * Période EMA pour la classification trend marché.
 * Modification = PR documentaire dédiée.
 */
export const REGIME_V1_EMA_PERIOD = 200;

/**
 * Seuil de volatilité réalisée annualisée SPY au-dessus duquel HIGH_VOL est
 * déclenché (override prioritaire sur les 3 régimes de base).
 *
 * 25 % = volatilité élevée historique (la moyenne longue terme SPY rvol 20j
 * annualisée est ~15-18 %).
 */
export const REGIME_V1_HIGH_VOL_RVOL_THRESHOLD = 0.25;

/**
 * Fenêtre de calcul de la volatilité réalisée annualisée (en jours bourse).
 */
export const REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS = 20;

/**
 * Métadonnées exportables pour reporting (utile pour les sections markdown
 * des rapports backtest qui affichent la définition régime).
 */
export const REGIME_V1_METADATA = Object.freeze({
  version: "v1",
  baseStates: ["RISK_ON", "RANGE", "RISK_OFF"],
  fourStates: ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"],
  emaPeriod: REGIME_V1_EMA_PERIOD,
  highVolRvolThreshold: REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
  highVolRvolWindowDays: REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS,
  classifierInputs: ["SPY", "QQQ", "SMH"],
  override: "HIGH_VOL is a priority override on the 3 base states",
  docsReference: "docs/quant/REGIME_RULES.md",
});

/**
 * Classification 3-état (RISK_ON / RANGE / RISK_OFF) à partir des positions
 * des 3 indices vs leur EMA200.
 *
 * Logique :
 *   - SPY ET QQQ ET SMH > EMA200 → RISK_ON
 *   - SPY ET QQQ ET SMH < EMA200 → RISK_OFF
 *   - sinon → RANGE
 *
 * Entrées invalides → null.
 *
 * @param {Object} opts
 * @param {boolean} opts.spyAboveEma200
 * @param {boolean} opts.qqqAboveEma200
 * @param {boolean} opts.smhAboveEma200
 * @returns {"RISK_ON" | "RANGE" | "RISK_OFF" | null}
 */
export function classifyMarketRegimeV1({ spyAboveEma200, qqqAboveEma200, smhAboveEma200 } = {}) {
  if (typeof spyAboveEma200 !== "boolean") return null;
  if (typeof qqqAboveEma200 !== "boolean") return null;
  if (typeof smhAboveEma200 !== "boolean") return null;
  if (spyAboveEma200 && qqqAboveEma200 && smhAboveEma200) return "RISK_ON";
  if (!spyAboveEma200 && !qqqAboveEma200 && !smhAboveEma200) return "RISK_OFF";
  return "RANGE";
}

/**
 * Détermine si HIGH_VOL override est actif à partir de la volatilité réalisée
 * annualisée SPY 20j.
 *
 * @param {Object} opts
 * @param {number} opts.realizedVolAnnualised  Volatilité réalisée annualisée
 *                                              (ex: 0.30 pour 30 %).
 * @param {number} [opts.threshold=REGIME_V1_HIGH_VOL_RVOL_THRESHOLD]  Seuil.
 * @returns {boolean | null}  null si entrée invalide.
 */
export function isHighVolOverride({ realizedVolAnnualised, threshold = REGIME_V1_HIGH_VOL_RVOL_THRESHOLD } = {}) {
  if (!Number.isFinite(realizedVolAnnualised) || realizedVolAnnualised < 0) return null;
  if (!Number.isFinite(threshold) || threshold < 0) return null;
  return realizedVolAnnualised > threshold;
}

/**
 * Classification 4-état (RISK_ON / RANGE / RISK_OFF / HIGH_VOL) avec
 * HIGH_VOL en priority override.
 *
 * @param {Object} opts
 * @param {boolean} opts.spyAboveEma200
 * @param {boolean} opts.qqqAboveEma200
 * @param {boolean} opts.smhAboveEma200
 * @param {number}  opts.realizedVolAnnualised
 * @param {number}  [opts.highVolThreshold=REGIME_V1_HIGH_VOL_RVOL_THRESHOLD]
 * @returns {"RISK_ON" | "RANGE" | "RISK_OFF" | "HIGH_VOL" | null}
 */
export function classifyFourStateRegimeV1({
  spyAboveEma200,
  qqqAboveEma200,
  smhAboveEma200,
  realizedVolAnnualised,
  highVolThreshold = REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
} = {}) {
  const base = classifyMarketRegimeV1({ spyAboveEma200, qqqAboveEma200, smhAboveEma200 });
  if (base === null) return null;
  const highVol = isHighVolOverride({ realizedVolAnnualised, threshold: highVolThreshold });
  if (highVol === true) return "HIGH_VOL";
  return base;
}

/**
 * Normalise un identifiant de régime (validation + uppercase).
 *
 * @param {string} regime
 * @returns {"RISK_ON" | "RANGE" | "RISK_OFF" | "HIGH_VOL" | null}
 */
export function normalizeRegimeState(regime) {
  if (typeof regime !== "string") return null;
  const upper = regime.toUpperCase();
  if (REGIME_V1_METADATA.fourStates.includes(upper)) return upper;
  return null;
}
