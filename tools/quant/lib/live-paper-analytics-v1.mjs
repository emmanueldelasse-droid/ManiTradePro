// tools/quant/lib/live-paper-analytics-v1.mjs
//
// LIVE PAPER ANALYTICS V1 — module analytique pur ManiTradePro.
//
// Référence documentaire : docs/quant/LIVE_PAPER_ANALYTICS.md
//
// Rôle : construire les blobs de metadata analytique attachés aux trades
// paper (ouverture + clôture), pour permettre l'audit post-trade des
// décisions du bot SANS modifier la logique de décision.
//
// LIMITES STRUCTURELLES (cf. brief créateur PR-LIVE-PAPER-ANALYTICS-1) :
//   - Module read-only. Pure functions. Aucun effet de bord.
//   - Ne décide PAS d'ouverture/fermeture.
//   - Ne modifie PAS les seuils, sizing, allocation, safety gate.
//   - Ne consomme PAS `sectorLeadership` pour décider : si présent dans
//     le contextSnapshot fourni, il est marqué `sector_leadership_untrusted`
//     (cf. KNOWN_ISSUES #15 OPEN).
//   - N'altère JAMAIS le statut d'un setup (pas de promotion LIVE_READY,
//     pas de modification SETUPS_REGISTRY).
//
// CONTRAT D'API :
//   - Pure functions. Pas de mutation. Pas de Date.now(). Pas d'I/O.
//   - Déterministe. Mêmes entrées → mêmes sorties.
//   - Inputs invalides → champ `null` + entrée ajoutée à `warnings`,
//     jamais d'exception.

// === Identité version ======================================================

export const LIVE_PAPER_ANALYTICS_V1_VERSION = "live-paper-analytics-v1";

// === Mapping engine setup → setupId matrice CTX-3 ==========================
//
// Le worker stocke `setupType` ∈ {"pullback", "mean_reversion", "breakout",
// "continuation", "no_structural_setup", ...}. La matrice CTX-3 utilise
// d'autres identifiants ("RS_ROTATION_SIMPLE", "MEAN_REVERSION", etc.).
// Ce mapping permet l'observation analytique sans remplacer la logique
// d'autorisation du worker existant.
//
// Setups DEAD ("breakout", "no_structural_setup") → null : ils ne sont
// pas dans la matrice par construction (PR-CTX-3 § 2).
//
// L'identifiant RS_ROTATION_SIMPLE n'est pas exposé côté engine actuel
// (le worker détecte "pullback"/"continuation", pas une rotation
// multi-symboles). Volontairement non mappé pour l'instant.

export const LIVE_PAPER_ENGINE_SETUP_MAP_V1 = Object.freeze({
  pullback: "TREND_PULLBACK_DYNAMIC_SUPPORT",
  mean_reversion: "MEAN_REVERSION",
  // Note : engine "breakout" → matrice DEAD_AGGREGATED → non mappé.
  //        Sauf cas spécial GLD : géré via symbolWhitelist côté caller.
});

// === Helpers internes purs =================================================

function safeNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeString(v) {
  if (typeof v !== "string") return null;
  return v.length === 0 ? null : v;
}

function uniquePush(arr, val) {
  if (val === null || val === undefined || val === "") return;
  if (!arr.includes(val)) arr.push(val);
}

// Normalise validationStatus du worker ("ok"/"suspect"/"invalid")
// vers la nomenclature analytics ("OK"/"SUSPECT"/"INVALID"/"UNKNOWN").
export function normalizeValidationStatus(raw) {
  if (typeof raw !== "string") return "UNKNOWN";
  const v = raw.toLowerCase();
  if (v === "ok") return "OK";
  if (v === "suspect") return "SUSPECT";
  if (v === "invalid") return "INVALID";
  return "UNKNOWN";
}

// === Helper sector leadership untrusted (KNOWN_ISSUES #15) =================
//
// Tant que #15 est OPEN, les datasets XLY/XLE/XLU contiennent des splits
// non ajustés. Tout `sectorLeadership` capturé doit être tagué comme
// non-fiable explicitement, pour empêcher qu'une PR future le consomme
// par mégarde.

export function markSectorLeadershipUntrusted(contextSnapshot) {
  if (!contextSnapshot || typeof contextSnapshot !== "object") return null;
  const copy = { ...contextSnapshot };
  if ("sectorLeadership" in copy) {
    copy.sectorLeadership = {
      untrusted: true,
      reason: "known_issues_15_open:datasets_xly_xle_xlu_unadjusted",
      // On préserve les données originales pour audit, mais sous une
      // clé `_raw` qui doit être ignorée par tout consommateur jusqu'à
      // fermeture de #15.
      _raw: copy.sectorLeadership,
    };
  }
  return copy;
}

// === Construction analytics à l'ouverture ==================================

/**
 * Construit le bloc `livePaperAnalytics` attaché à une position paper
 * à l'instant de son ouverture.
 *
 * @param {object} input
 * @param {string|null} input.capturedAt              ISO du moment de capture (fourni par caller)
 * @param {string|null} input.setupId                 Identifiant matrice CTX-3 ("RS_ROTATION_SIMPLE", ...) ou null
 * @param {string|null} input.engineSetupType         Type setup engine ("pullback", "mean_reversion", ...) ou null
 * @param {string|null} input.setupStatusRef          Statut SETUPS_REGISTRY ou null
 * @param {string|null} input.regime                  "RISK_ON" | "RANGE" | "RISK_OFF" | "HIGH_VOL" | null
 * @param {number|null} input.regimeConfidence        0-100 ou null
 * @param {object|null} input.contextSnapshot         Snapshot CTX-2 complet ou null
 * @param {object|null} input.setupAuthorization      Résultat explainSetupAuthorizationV1 ou null
 * @param {object|null} input.scores                  { strategicScore, decisionScore, safetyScore, exploitabilityScore }
 * @param {object|null} input.plan                    { entry, stopLoss, takeProfit, rr, horizon }
 * @param {object|null} input.dataQuality             dataQuality du payload CTX-2 ou null
 * @param {object|null} input.quoteQuality            quoteQuality du payload worker ou null
 * @param {string[]}    input.warnings                Avertissements supplémentaires (optionnel)
 * @returns {object}                                  Bloc livePaperAnalytics structuré
 */
export function buildLivePaperAnalyticsV1(input = {}) {
  const warnings = Array.isArray(input.warnings) ? [...input.warnings] : [];

  // Tag automatique #15 si sectorLeadership capturé.
  let contextSnapshot = null;
  if (input.contextSnapshot && typeof input.contextSnapshot === "object") {
    contextSnapshot = markSectorLeadershipUntrusted(input.contextSnapshot);
    if (contextSnapshot && contextSnapshot.sectorLeadership && contextSnapshot.sectorLeadership.untrusted === true) {
      uniquePush(warnings, "sector_leadership_untrusted");
    }
  }

  // setupAuthorization observée — informative uniquement.
  let setupAuthorization = null;
  if (input.setupAuthorization && typeof input.setupAuthorization === "object") {
    setupAuthorization = {
      version: input.setupAuthorization.version ?? null,
      setupId: input.setupAuthorization.setupId ?? null,
      allowed: typeof input.setupAuthorization.allowed === "boolean" ? input.setupAuthorization.allowed : null,
      blockedBy: Array.isArray(input.setupAuthorization.blockedBy) ? [...input.setupAuthorization.blockedBy] : [],
      met: Array.isArray(input.setupAuthorization.met) ? [...input.setupAuthorization.met] : [],
      unmet: Array.isArray(input.setupAuthorization.unmet) ? [...input.setupAuthorization.unmet] : [],
      statusRef: input.setupAuthorization.statusRef ?? null,
    };
    // Si la matrice CTX-3 aurait bloqué le trade, on l'enregistre comme
    // warning observable — SANS bloquer l'ouverture côté worker.
    if (setupAuthorization.allowed === false) {
      uniquePush(warnings, `ctx3_would_block:${setupAuthorization.blockedBy.join("|")}`);
    }
  }

  const plan = input.plan && typeof input.plan === "object" ? {
    entry: safeNumber(input.plan.entry),
    stopLoss: safeNumber(input.plan.stopLoss),
    takeProfit: safeNumber(input.plan.takeProfit),
    rr: safeNumber(input.plan.rr),
    horizon: input.plan.horizon ?? null,
  } : null;

  const scores = input.scores && typeof input.scores === "object" ? {
    strategicScore: safeNumber(input.scores.strategicScore),
    decisionScore: safeNumber(input.scores.decisionScore),
    safetyScore: safeNumber(input.scores.safetyScore),
    exploitabilityScore: safeNumber(input.scores.exploitabilityScore),
  } : null;

  // Validation qualité quote — informative uniquement.
  let quoteQuality = null;
  if (input.quoteQuality && typeof input.quoteQuality === "object") {
    quoteQuality = {
      executionSafe: typeof input.quoteQuality.executionSafe === "boolean" ? input.quoteQuality.executionSafe : null,
      trustScore: safeNumber(input.quoteQuality.trustScore),
      validationStatus: input.quoteQuality.validationStatus ?? null,
      reasons: Array.isArray(input.quoteQuality.reasons) ? [...input.quoteQuality.reasons] : [],
    };
    if (quoteQuality.executionSafe === false) {
      uniquePush(warnings, "quote_quality_unsafe_at_open");
    }
  }

  return {
    version: LIVE_PAPER_ANALYTICS_V1_VERSION,
    capturedAt: safeString(input.capturedAt),
    setupId: safeString(input.setupId),
    engineSetupType: safeString(input.engineSetupType),
    setupStatusRef: safeString(input.setupStatusRef),
    regime: safeString(input.regime),
    regimeConfidence: safeNumber(input.regimeConfidence),
    contextSnapshot,
    setupAuthorization,
    scores,
    plan,
    dataQuality: input.dataQuality && typeof input.dataQuality === "object" ? input.dataQuality : null,
    quoteQuality,
    warnings,
  };
}

// === Évaluation qualité du signal post-clôture ============================

/**
 * Calcule le `signalQuality` d'un trade clos.
 *
 * Heuristique déterministe et conservatrice :
 *   - validationStatus = INVALID         → BAD
 *   - validationStatus = SUSPECT         → NOISY
 *   - quoteQuality unsafe au close       → BAD
 *   - durationDays < 1h ET hitStop       → NOISY (instant close)
 *   - manque de données structurelles    → NOISY
 *   - sinon                              → GOOD
 *   - input vide                         → UNKNOWN
 */
export function assessSignalQualityV1({
  validationStatus = "UNKNOWN",
  quoteQualityAtClose = null,
  durationDays = null,
  hitStop = false,
  dataQuality = null,
} = {}) {
  const v = normalizeValidationStatus(validationStatus);
  if (v === "INVALID") return "BAD";
  if (quoteQualityAtClose && typeof quoteQualityAtClose === "object" && quoteQualityAtClose.executionSafe === false) {
    return "BAD";
  }
  if (v === "SUSPECT") return "NOISY";
  const d = safeNumber(durationDays);
  if (d !== null && d < (1 / 24) && hitStop === true) return "NOISY";
  if (dataQuality && typeof dataQuality === "object") {
    const missing = Array.isArray(dataQuality.missingSymbols) ? dataQuality.missingSymbols.length : 0;
    const insufficient = Array.isArray(dataQuality.insufficientHistory) ? dataQuality.insufficientHistory.length : 0;
    if (missing > 0 || insufficient > 0) return "NOISY";
  }
  if (v === "UNKNOWN" && d === null && !quoteQualityAtClose) return "UNKNOWN";
  return "GOOD";
}

// === Construction outcome à la clôture =====================================

/**
 * Construit le bloc `livePaperOutcome` attaché à un trade fermé.
 *
 * @param {object} input
 * @param {string|null} input.closedAt
 * @param {string|null} input.exitReason            "stop_loss" | "take_profit" | "time_exit" | "engine_invalidation" | "manual" | ...
 * @param {number|null} input.entryPrice
 * @param {number|null} input.exitPrice
 * @param {number|null} input.pnl
 * @param {number|null} input.pnlPct
 * @param {number|null} input.durationDays
 * @param {boolean}     input.hitStop
 * @param {boolean}     input.hitTakeProfit
 * @param {number|null} input.maxFavorableExcursion
 * @param {number|null} input.maxAdverseExcursion
 * @param {string|null} input.validationStatusRaw   "ok"|"suspect"|"invalid" (worker) ou null
 * @param {string[]}    input.qualityFlags
 * @param {object|null} input.quoteQualityAtClose
 * @param {object|null} input.dataQuality
 * @param {string|null} input.notes
 * @param {string[]}    input.warnings
 * @returns {object} bloc livePaperOutcome
 */
export function buildLivePaperOutcomeV1(input = {}) {
  const warnings = Array.isArray(input.warnings) ? [...input.warnings] : [];
  const validationStatus = normalizeValidationStatus(input.validationStatusRaw);
  if (validationStatus === "SUSPECT" || validationStatus === "INVALID") {
    uniquePush(warnings, `validation_status:${validationStatus.toLowerCase()}`);
  }

  const signalQuality = assessSignalQualityV1({
    validationStatus,
    quoteQualityAtClose: input.quoteQualityAtClose,
    durationDays: input.durationDays,
    hitStop: !!input.hitStop,
    dataQuality: input.dataQuality,
  });

  return {
    version: LIVE_PAPER_ANALYTICS_V1_VERSION,
    closedAt: safeString(input.closedAt),
    exitReason: safeString(input.exitReason),
    entryPrice: safeNumber(input.entryPrice),
    exitPrice: safeNumber(input.exitPrice),
    pnl: safeNumber(input.pnl),
    pnlPct: safeNumber(input.pnlPct),
    durationDays: safeNumber(input.durationDays),
    hitStop: !!input.hitStop,
    hitTakeProfit: !!input.hitTakeProfit,
    maxFavorableExcursion: safeNumber(input.maxFavorableExcursion),
    maxAdverseExcursion: safeNumber(input.maxAdverseExcursion),
    signalQuality,
    validationStatus,
    qualityFlags: Array.isArray(input.qualityFlags) ? [...input.qualityFlags] : [],
    quoteQualityAtClose: input.quoteQualityAtClose && typeof input.quoteQualityAtClose === "object"
      ? {
          executionSafe: typeof input.quoteQualityAtClose.executionSafe === "boolean" ? input.quoteQualityAtClose.executionSafe : null,
          validationStatus: input.quoteQualityAtClose.validationStatus ?? null,
          trustScore: safeNumber(input.quoteQualityAtClose.trustScore),
          reasons: Array.isArray(input.quoteQualityAtClose.reasons) ? [...input.quoteQualityAtClose.reasons] : [],
        }
      : null,
    notes: safeString(input.notes),
    warnings,
  };
}
