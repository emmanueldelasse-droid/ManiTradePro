// tools/quant/lib/setup-authorization-matrix-v1.mjs
//
// SETUP AUTHORIZATION MATRIX V1 — module analytique pur ManiTradePro.
//
// Référence documentaire : docs/quant/SETUP_AUTHORIZATION_MATRIX.md
//
// Rôle : matrice DÉCLARATIVE par setup décrivant dans quels régimes il est
// autorisé, bloqué, ou préféré. Le module NE DÉCIDE PAS — il décrit.
// PR-CTX-5 (future, escalade créateur) décidera du branchement runtime.
//
// LIMITES STRUCTURELLES (cf. brief créateur PR-CTX-3 + GOVERNANCE.md) :
//   - Module read-only. Aucun effet runtime. Aucune dépendance worker.js.
//   - Aucun setup activé. Aucun statut SETUPS_REGISTRY modifié.
//   - Aucun setup promu LIVE_READY.
//   - Aucune consommation runtime de cette matrice.
//   - Aucune règle ne consomme `sectorLeadership.*` tant que
//     `docs/monitoring/KNOWN_ISSUES.md` #15 reste OPEN (splits non
//     ajustés sur XLY/XLE/XLU). Invariant vérifié par tests.
//   - GLD_BREAKOUT_ISOLATED restreint explicitement à GLD via
//     `symbolWhitelist`, indépendant de sectorLeadership par construction.
//
// CONTRAT D'API :
//   - Pure functions. Pas de mutation. Pas d'effet de bord. Pas d'I/O.
//   - Déterministe. Mêmes entrées → mêmes sorties.
//   - Setup inconnu → bloqué + warning (jamais d'exception).
//
// SOURCE DES STATUTS : `docs/quant/SETUPS_REGISTRY.md` (truth-sync 2026-05-19).
// La matrice REFLÈTE ces statuts ; elle ne les modifie pas. Toute évolution
// de statut passe par PR documentaire dédiée sur SETUPS_REGISTRY.

// === Identité version ======================================================

export const SETUP_AUTHORIZATION_MATRIX_V1_VERSION = "setup-authorization-matrix-v1";

// === Régimes officiels V1 (cohérent avec regime-rules-v1.mjs) ==============

const ALL_REGIMES = Object.freeze(["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]);

// === Matrice canonique =====================================================
//
// Conventions :
//   - `allowedRegimes` : régimes où le setup est analytiquement autorisé.
//   - `blockedRegimes` : régimes où le setup est explicitement bloqué.
//   - `blockedByStatus` : true si le statut officiel SETUPS_REGISTRY interdit
//     l'activation, indépendamment du régime (FRAGILE, FRAGILE/CONCENTRATION,
//     DEAD).
//   - `symbolWhitelist` : si non-null, restreint l'autorisation à ces symboles.
//   - `preferredConditions` : recommandations informatives, non bloquantes.
//   - `blockedConditions` : conditions qui, si remplies, bloquent même un
//     régime autorisé.
//   - `doNotDependOnSectorLeadership` : invariant explicite (KNOWN_ISSUES #15).
//
// DSL conditions :
//   { kind, op, value, note? }
//   - kind : "regime" | "vol.state" | "vol.value" | "regimeConfidence"
//          | "breadth.pctRiskOn" | "breadth.pctRiskOff"
//          | "defensiveConfirmation.tltState" | "defensiveConfirmation.gldState"
//   - op   : "eq" | "neq" | "in" | "not_in" | ">=" | "<=" | ">" | "<"
//   - value: string | number | string[] | number[]

export const SETUP_AUTHORIZATION_MATRIX_V1 = Object.freeze({
  RS_ROTATION_SIMPLE: Object.freeze({
    statusRef: "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-3--relative-strength-rotation",
    allowedRegimes: Object.freeze(["RANGE", "RISK_ON"]),
    blockedRegimes: Object.freeze(["RISK_OFF", "HIGH_VOL"]),
    blockedByStatus: false,
    preferredConditions: Object.freeze([
      Object.freeze({ kind: "regime", op: "eq", value: "RANGE", note: "PF 2.04 Phase 1 hardening — régime optimal" }),
      Object.freeze({ kind: "vol.state", op: "in", value: Object.freeze(["LOW", "NORMAL"]) }),
      Object.freeze({ kind: "breadth.pctRiskOn", op: ">=", value: 40 }),
    ]),
    blockedConditions: Object.freeze([
      Object.freeze({ kind: "vol.state", op: "eq", value: "HIGH", note: "HIGH_VOL déjà couvert par blockedRegimes, sécurité défensive" }),
    ]),
    symbolWhitelist: null,
    doNotDependOnSectorLeadership: true,
    notes: "Edge propre côté exécution (×1.01 inflation PR #208) mais 0 ROBUST/STABLE en rolling walk-forward + PF 0.146 en 2022. Friction ×2/×3 survivent. Pas d'activation paper avant protection bear validée.",
  }),

  MEAN_REVERSION: Object.freeze({
    statusRef: "EXPERIMENTAL_ONLY / FRICTION_REQUIRED",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-4--mean-reversion-v1",
    allowedRegimes: Object.freeze(["RANGE"]),
    blockedRegimes: Object.freeze(["RISK_ON", "RISK_OFF", "HIGH_VOL"]),
    blockedByStatus: false,
    preferredConditions: Object.freeze([
      Object.freeze({ kind: "vol.state", op: "in", value: Object.freeze(["LOW", "NORMAL"]) }),
    ]),
    blockedConditions: Object.freeze([]),
    symbolWhitelist: null,
    doNotDependOnSectorLeadership: true,
    notes: "Test V1 PR-R3B-v3 : n=7 trades sur 5 ans × 15 ETF en RANGE, PF 1.06 marginal, 0/3 walk-forward, friction ×2 PF 0.764. Sample insuffisant pour DEAD formel. Edge probablement illusoire.",
  }),

  SECTOR_RELATIVE_STRENGTH: Object.freeze({
    statusRef: "FRAGILE / CONCENTRATION_EXCESSIVE",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-7--sector-relative-strength-v1",
    allowedRegimes: Object.freeze([]),
    blockedRegimes: Object.freeze(["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]),
    blockedByStatus: true,
    preferredConditions: Object.freeze([]),
    blockedConditions: Object.freeze([]),
    symbolWhitelist: null,
    doNotDependOnSectorLeadership: true,
    notes: "Top 5 tickers = 103% du PnL, sans eux PF 0.94. Critère Freeze §4 (top 5 < 60%) violé. Interdictions explicites SETUPS_REGISTRY §7 : pas d'activation paper, pas d'activation live, pas de promotion VALIDATED_RESEARCH_CORE tant que concentration non corrigée.",
  }),

  TREND_PULLBACK_DYNAMIC_SUPPORT: Object.freeze({
    statusRef: "FRAGILE",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-8--trend-pullback-dynamic-support-v1",
    allowedRegimes: Object.freeze([]),
    blockedRegimes: Object.freeze(["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]),
    blockedByStatus: true,
    preferredConditions: Object.freeze([]),
    blockedConditions: Object.freeze([]),
    symbolWhitelist: null,
    doNotDependOnSectorLeadership: true,
    notes: "PF 1.045 sous seuil Freeze §4 (PF post-friction ≥ 1.3). Amélioration marginale vs PULLBACK_MOMENTUM (+0.065). Interdictions explicites SETUPS_REGISTRY §8 : pas paper, pas live, pas d'extension paramétrage sans hypothèse documentée.",
  }),

  GLD_BREAKOUT_ISOLATED: Object.freeze({
    statusRef: "CONDITIONAL_RESEARCH_CANDIDATE",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-6--gld-breakout-isolated-exception",
    allowedRegimes: Object.freeze(["RISK_ON", "RANGE"]),
    blockedRegimes: Object.freeze(["RISK_OFF", "HIGH_VOL"]),
    blockedByStatus: false,
    preferredConditions: Object.freeze([
      Object.freeze({ kind: "vol.state", op: "in", value: Object.freeze(["LOW", "NORMAL"]) }),
    ]),
    blockedConditions: Object.freeze([]),
    symbolWhitelist: Object.freeze(["GLD"]),
    doNotDependOnSectorLeadership: true,
    notes: "Single-symbol edge (n=47 sur 5 ans). Restreint à GLD via symbolWhitelist. NE PAS extrapoler à d'autres actifs (NVDA/SMCI/COIN tier STRONG/OK mais 13-25 trades, encore plus fragile). Découplé du leadership sectoriel par construction (cf. KNOWN_ISSUES #15).",
  }),
});

// === Helpers internes purs =================================================

function lookupSnapshotValue(snapshot, kind) {
  if (!snapshot || typeof snapshot !== "object") return undefined;
  switch (kind) {
    case "regime": return snapshot.regime;
    case "regimeConfidence": return snapshot.regimeConfidence;
    case "vol.state": return snapshot.vol?.state;
    case "vol.value": return snapshot.vol?.value;
    case "breadth.pctRiskOn": return snapshot.breadth?.pctRiskOn;
    case "breadth.pctRiskOff": return snapshot.breadth?.pctRiskOff;
    case "defensiveConfirmation.tltState": return snapshot.defensiveConfirmation?.tltState;
    case "defensiveConfirmation.gldState": return snapshot.defensiveConfirmation?.gldState;
    default: return undefined;
  }
}

function evalCondition(cond, snapshot) {
  const actual = lookupSnapshotValue(snapshot, cond.kind);
  if (actual === undefined || actual === null) {
    return { met: false, reason: "value_missing", actual: null };
  }
  const v = cond.value;
  switch (cond.op) {
    case "eq":     return { met: actual === v, actual };
    case "neq":    return { met: actual !== v, actual };
    case "in":     return { met: Array.isArray(v) && v.includes(actual), actual };
    case "not_in": return { met: Array.isArray(v) && !v.includes(actual), actual };
    case ">=":     return { met: typeof actual === "number" && actual >= v, actual };
    case "<=":     return { met: typeof actual === "number" && actual <= v, actual };
    case ">":      return { met: typeof actual === "number" && actual >  v, actual };
    case "<":      return { met: typeof actual === "number" && actual <  v, actual };
    default:       return { met: false, reason: "unknown_op", actual };
  }
}

function describeCondition(cond) {
  const v = Array.isArray(cond.value) ? `[${cond.value.join(",")}]` : String(cond.value);
  return `${cond.kind} ${cond.op} ${v}`;
}

// === API publique ==========================================================

export function listSetupIdsV1() {
  return Object.keys(SETUP_AUTHORIZATION_MATRIX_V1);
}

export function getSetupAuthorizationV1(setupId) {
  if (typeof setupId !== "string") return null;
  return SETUP_AUTHORIZATION_MATRIX_V1[setupId] ?? null;
}

export function isSetupAllowedInRegimeV1(setupId, regime) {
  const entry = getSetupAuthorizationV1(setupId);
  if (!entry) {
    return {
      allowed: false,
      reason: "unknown_setup",
      warnings: [`Unknown setupId: ${String(setupId)}`],
    };
  }
  if (typeof regime !== "string" || !ALL_REGIMES.includes(regime)) {
    return {
      allowed: false,
      reason: "invalid_regime",
      warnings: [`Invalid regime: ${String(regime)} (expected one of ${ALL_REGIMES.join(", ")})`],
    };
  }
  if (entry.blockedByStatus) {
    return {
      allowed: false,
      reason: `status_blocks:${entry.statusRef}`,
      warnings: [],
    };
  }
  if (entry.blockedRegimes.includes(regime)) {
    return { allowed: false, reason: `regime_blocked:${regime}`, warnings: [] };
  }
  if (!entry.allowedRegimes.includes(regime)) {
    return { allowed: false, reason: `regime_not_allowed:${regime}`, warnings: [] };
  }
  return { allowed: true, reason: null, warnings: [] };
}

export function explainSetupAuthorizationV1(setupId, contextSnapshot) {
  const warnings = [];
  const blockedBy = [];
  const met = [];
  const unmet = [];

  const entry = getSetupAuthorizationV1(setupId);
  if (!entry) {
    return {
      version: SETUP_AUTHORIZATION_MATRIX_V1_VERSION,
      setupId: typeof setupId === "string" ? setupId : null,
      allowed: false,
      blockedBy: ["unknown_setup"],
      met: [],
      unmet: [],
      warnings: [`Unknown setupId: ${String(setupId)}`],
      snapshotRegime: contextSnapshot?.regime ?? null,
      statusRef: null,
    };
  }

  const snapshotRegime = contextSnapshot?.regime ?? null;

  if (entry.blockedByStatus) {
    blockedBy.push(`status:${entry.statusRef}`);
  }

  if (snapshotRegime === null || snapshotRegime === undefined) {
    warnings.push("snapshot_regime_missing");
  } else if (!ALL_REGIMES.includes(snapshotRegime)) {
    warnings.push(`snapshot_regime_invalid:${snapshotRegime}`);
  } else {
    if (entry.blockedRegimes.includes(snapshotRegime)) {
      blockedBy.push(`regime_blocked:${snapshotRegime}`);
    } else if (!entry.allowedRegimes.includes(snapshotRegime)) {
      blockedBy.push(`regime_not_allowed:${snapshotRegime}`);
    }
  }

  // blockedConditions — bloquantes si remplies.
  for (const cond of entry.blockedConditions) {
    const r = evalCondition(cond, contextSnapshot);
    if (r.reason === "value_missing") {
      warnings.push(`blocked_condition_unevaluable:${describeCondition(cond)}`);
    } else if (r.met) {
      blockedBy.push(`blocked_condition:${describeCondition(cond)}`);
    }
  }

  // preferredConditions — informatives, jamais bloquantes.
  for (const cond of entry.preferredConditions) {
    const r = evalCondition(cond, contextSnapshot);
    if (r.reason === "value_missing") {
      warnings.push(`preferred_condition_unevaluable:${describeCondition(cond)}`);
      unmet.push(describeCondition(cond));
    } else if (r.met) {
      met.push(describeCondition(cond));
    } else {
      unmet.push(describeCondition(cond));
    }
  }

  return {
    version: SETUP_AUTHORIZATION_MATRIX_V1_VERSION,
    setupId,
    allowed: blockedBy.length === 0,
    blockedBy,
    met,
    unmet,
    warnings,
    snapshotRegime,
    statusRef: entry.statusRef,
  };
}

// === Invariants ============================================================
//
// Ces invariants sont vérifiés par les tests unitaires :
//   1. Aucun champ de la matrice ne référence `sectorLeadership.*` (KNOWN_ISSUES #15).
//   2. Aucun symbole `XLY` / `XLE` / `XLU` n'apparaît dans la matrice
//      (datasets non ajustés détectés par PR-CTX-2 smoke).
//   3. Tous les setups ont `doNotDependOnSectorLeadership: true`.
//   4. Les régimes référencés sont strictement dans ALL_REGIMES.
//   5. allowedRegimes ∩ blockedRegimes = ∅.

export function validateMatrixInvariantsV1() {
  const violations = [];
  const serialized = JSON.stringify(SETUP_AUTHORIZATION_MATRIX_V1);

  if (serialized.includes("sectorLeadership")) {
    violations.push("invariant:no_sectorLeadership_dependency_violated");
  }
  for (const polluted of ["XLY", "XLE", "XLU"]) {
    if (serialized.includes(`"${polluted}"`)) {
      violations.push(`invariant:no_split_unadjusted_symbol_referenced:${polluted}`);
    }
  }

  for (const [id, entry] of Object.entries(SETUP_AUTHORIZATION_MATRIX_V1)) {
    if (entry.doNotDependOnSectorLeadership !== true) {
      violations.push(`invariant:setup_must_declare_no_sector_dependency:${id}`);
    }
    for (const r of [...entry.allowedRegimes, ...entry.blockedRegimes]) {
      if (!ALL_REGIMES.includes(r)) {
        violations.push(`invariant:invalid_regime_in_setup:${id}:${r}`);
      }
    }
    const overlap = entry.allowedRegimes.filter((r) => entry.blockedRegimes.includes(r));
    if (overlap.length > 0) {
      violations.push(`invariant:allowed_blocked_overlap:${id}:${overlap.join(",")}`);
    }
  }

  return { ok: violations.length === 0, violations };
}
