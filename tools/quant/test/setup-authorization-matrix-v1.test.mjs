// tools/quant/test/setup-authorization-matrix-v1.test.mjs
//
// Tests unitaires Setup Authorization Matrix V1 — node:test.
//
// Exécution :
//   node --test tools/quant/test/setup-authorization-matrix-v1.test.mjs
//
// Couvre les 6 cas obligatoires du brief PR-CTX-3 + invariants.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SETUP_AUTHORIZATION_MATRIX_V1,
  SETUP_AUTHORIZATION_MATRIX_V1_VERSION,
  getSetupAuthorizationV1,
  isSetupAllowedInRegimeV1,
  explainSetupAuthorizationV1,
  listSetupIdsV1,
  validateMatrixInvariantsV1,
} from "../lib/setup-authorization-matrix-v1.mjs";

// === Fixtures contextSnapshot ==============================================

function snapshot({
  regime = "RISK_ON",
  regimeConfidence = 90,
  volState = "NORMAL",
  volValue = 0.15,
  pctRiskOn = 60,
  pctRiskOff = 20,
  tltState = "NEUTRAL",
  gldState = "NEUTRAL",
} = {}) {
  return {
    version: "context-engine-v1",
    asOf: "2024-06-28",
    regime,
    regimeConfidence,
    regimeSource: { primary: "SPY", rulesVersion: "regime-rules-v1" },
    breadth: {
      riskOnCount: 10, riskOffCount: 3, neutralCount: 1,
      totalEvaluated: 14,
      pctRiskOn, pctRiskOff,
    },
    sectorLeadership: { leaders: [], laggards: [] }, // volontairement vides
    vol: { proxy: "SPY_REALIZED_VOL_20D", value: volValue, state: volState },
    defensiveConfirmation: { tltState, gldState },
    warnings: [],
    dataQuality: { missingSymbols: [], insufficientHistory: [], evaluatedSymbols: [] },
  };
}

// === Tests obligatoires ====================================================

test("1. Setup inconnu → blocked + warning", () => {
  const r = isSetupAllowedInRegimeV1("UNKNOWN_SETUP_X", "RISK_ON");
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "unknown_setup");
  assert.ok(r.warnings.length > 0);
  assert.match(r.warnings[0], /Unknown setupId/);

  const e = explainSetupAuthorizationV1("UNKNOWN_SETUP_X", snapshot());
  assert.equal(e.allowed, false);
  assert.deepEqual(e.blockedBy, ["unknown_setup"]);
  assert.equal(e.statusRef, null);

  // null / undefined / type incorrect
  assert.equal(getSetupAuthorizationV1(null), null);
  assert.equal(getSetupAuthorizationV1(undefined), null);
  assert.equal(getSetupAuthorizationV1(42), null);
});

test("2. RISK_OFF bloque RS Rotation simple", () => {
  const r = isSetupAllowedInRegimeV1("RS_ROTATION_SIMPLE", "RISK_OFF");
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "regime_blocked:RISK_OFF");

  const e = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snapshot({ regime: "RISK_OFF" }));
  assert.equal(e.allowed, false);
  assert.ok(e.blockedBy.includes("regime_blocked:RISK_OFF"));
  assert.equal(e.statusRef, "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED");

  // RANGE et RISK_ON sont autorisés.
  assert.equal(isSetupAllowedInRegimeV1("RS_ROTATION_SIMPLE", "RANGE").allowed, true);
  assert.equal(isSetupAllowedInRegimeV1("RS_ROTATION_SIMPLE", "RISK_ON").allowed, true);
});

test("3. HIGH_VOL bloque setups directionnels fragiles (RS Rotation + Mean Reversion + GLD Breakout)", () => {
  for (const setupId of ["RS_ROTATION_SIMPLE", "MEAN_REVERSION", "GLD_BREAKOUT_ISOLATED"]) {
    const r = isSetupAllowedInRegimeV1(setupId, "HIGH_VOL");
    assert.equal(r.allowed, false, `${setupId} should be blocked in HIGH_VOL`);
    assert.equal(r.reason, "regime_blocked:HIGH_VOL");
  }

  // SECTOR_RELATIVE_STRENGTH et TREND_PULLBACK_DYNAMIC_SUPPORT sont blockedByStatus
  // → ils sont bloqués partout, y compris HIGH_VOL.
  for (const setupId of ["SECTOR_RELATIVE_STRENGTH", "TREND_PULLBACK_DYNAMIC_SUPPORT"]) {
    for (const regime of ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"]) {
      const r = isSetupAllowedInRegimeV1(setupId, regime);
      assert.equal(r.allowed, false, `${setupId} should never be allowed (got allowed=${r.allowed} in ${regime})`);
      assert.match(r.reason, /^(status_blocks|regime_blocked):/,
        `unexpected reason ${r.reason} for ${setupId}/${regime}`);
    }
  }
});

test("4. GLD Breakout ne dépend pas du leadership sectoriel", () => {
  const entry = getSetupAuthorizationV1("GLD_BREAKOUT_ISOLATED");
  assert.equal(entry.doNotDependOnSectorLeadership, true);
  assert.deepEqual([...entry.symbolWhitelist], ["GLD"]);

  // Pas de référence à sectorLeadership / XLY / XLE / XLU dans la définition.
  const ser = JSON.stringify(entry);
  assert.ok(!ser.includes("sectorLeadership"),
    "GLD_BREAKOUT_ISOLATED definition must not reference sectorLeadership");
  for (const polluted of ["XLY", "XLE", "XLU"]) {
    assert.ok(!ser.includes(`"${polluted}"`),
      `GLD_BREAKOUT_ISOLATED must not reference split-unadjusted symbol ${polluted}`);
  }

  // Snapshot avec leaders qui n'incluent PAS GLD → autorisation toujours OK
  // (preuve que la décision ne consomme jamais sectorLeadership).
  const snapNoGldLeader = snapshot({
    regime: "RISK_ON",
    volState: "NORMAL",
  });
  snapNoGldLeader.sectorLeadership = {
    leaders: [{ symbol: "XLV", score: 0.05, trendState: "ABOVE_EMA200", relStrength20d: 0.02, relStrength63d: 0.03 }],
    laggards: [{ symbol: "XLP", score: -0.04, trendState: "BELOW_EMA200", relStrength20d: -0.02, relStrength63d: -0.02 }],
  };
  const e = explainSetupAuthorizationV1("GLD_BREAKOUT_ISOLATED", snapNoGldLeader);
  assert.equal(e.allowed, true);
  assert.deepEqual(e.blockedBy, []);
});

test("5. Aucune règle ne consomme XLY/XLE/XLU tant que KNOWN_ISSUES #15 est OPEN", () => {
  const inv = validateMatrixInvariantsV1();
  assert.equal(inv.ok, true,
    `Matrix invariants violated: ${inv.violations.join(", ")}`);

  // Vérification directe au niveau JSON.
  const ser = JSON.stringify(SETUP_AUTHORIZATION_MATRIX_V1);
  assert.ok(!ser.includes("sectorLeadership"),
    "Matrix must not reference sectorLeadership while KNOWN_ISSUES #15 is OPEN");
  for (const polluted of ["XLY", "XLE", "XLU"]) {
    assert.ok(!ser.includes(`"${polluted}"`),
      `Matrix must not reference split-unadjusted symbol ${polluted}`);
  }

  // Tous les setups doivent déclarer explicitement doNotDependOnSectorLeadership.
  for (const id of listSetupIdsV1()) {
    const entry = SETUP_AUTHORIZATION_MATRIX_V1[id];
    assert.equal(entry.doNotDependOnSectorLeadership, true,
      `${id} must declare doNotDependOnSectorLeadership=true`);
  }

  // Aucun lookup `sectorLeadership.*` n'est défini dans le DSL —
  // si quelqu'un l'ajoute, evalCondition retournera value_missing systématiquement.
  // On vérifie qu'aucune preferredCondition / blockedCondition de la matrice
  // ne référence sectorLeadership.
  for (const id of listSetupIdsV1()) {
    const entry = SETUP_AUTHORIZATION_MATRIX_V1[id];
    for (const cond of [...entry.preferredConditions, ...entry.blockedConditions]) {
      assert.ok(!cond.kind.startsWith("sectorLeadership"),
        `${id} has a condition referencing sectorLeadership.* (forbidden by #15)`);
    }
  }
});

test("6. Déterminisme : mêmes inputs → mêmes sorties JSON byte-à-byte", () => {
  const snap = snapshot({ regime: "RANGE", volState: "LOW", pctRiskOn: 55 });

  const matrixA = JSON.stringify(SETUP_AUTHORIZATION_MATRIX_V1);
  const matrixB = JSON.stringify(SETUP_AUTHORIZATION_MATRIX_V1);
  assert.equal(matrixA, matrixB, "matrix serialization must be stable");

  for (const id of listSetupIdsV1()) {
    const e1 = JSON.stringify(explainSetupAuthorizationV1(id, snap));
    const e2 = JSON.stringify(explainSetupAuthorizationV1(id, snap));
    assert.equal(e1, e2, `explain(${id}) must be deterministic`);
  }

  // Avec snapshot différent, la sortie change (cohérence non-trivialité).
  const snapHV = snapshot({ regime: "HIGH_VOL", volState: "HIGH" });
  const before = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snap);
  const after = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snapHV);
  assert.notDeepEqual(before, after);
});

// === Tests complémentaires =================================================

test("bonus A : forme exhaustive de explainSetupAuthorizationV1", () => {
  const snap = snapshot({ regime: "RANGE", volState: "LOW", pctRiskOn: 50 });
  const e = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snap);

  for (const k of ["version", "setupId", "allowed", "blockedBy", "met", "unmet", "warnings", "snapshotRegime", "statusRef"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(e, k), `missing key: ${k}`);
  }
  assert.equal(e.version, SETUP_AUTHORIZATION_MATRIX_V1_VERSION);
  assert.equal(e.setupId, "RS_ROTATION_SIMPLE");
  assert.equal(e.snapshotRegime, "RANGE");
  assert.equal(e.statusRef, "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED");
  assert.equal(e.allowed, true);
});

test("bonus B : preferredConditions remplies → met, manquées → unmet, jamais bloquantes", () => {
  // Régime autorisé + toutes les preferredConditions OK
  const snapMet = snapshot({ regime: "RANGE", volState: "NORMAL", pctRiskOn: 70 });
  const e1 = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snapMet);
  assert.equal(e1.allowed, true);
  assert.ok(e1.met.length >= 1);

  // Régime autorisé mais preferredConditions partiellement non remplies → allowed=true, mais unmet>0
  const snapUnmet = snapshot({ regime: "RISK_ON", volState: "ELEVATED", pctRiskOn: 30 });
  const e2 = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snapUnmet);
  assert.equal(e2.allowed, true, "preferredConditions are informative, not blocking");
  assert.ok(e2.unmet.length >= 1);
});

test("bonus C : blockedConditions remplies → blocked même en régime autorisé", () => {
  // RS_ROTATION_SIMPLE a un blockedCondition vol.state=HIGH (sécurité défensive).
  // En régime RANGE autorisé mais vol HIGH → bloqué par blockedCondition.
  const snap = snapshot({ regime: "RANGE", volState: "HIGH" });
  const e = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snap);
  assert.equal(e.allowed, false);
  assert.ok(e.blockedBy.some((b) => b.startsWith("blocked_condition:")));
});

test("bonus D : regime invalide → handled gracefully", () => {
  const r = isSetupAllowedInRegimeV1("RS_ROTATION_SIMPLE", "BANANE");
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "invalid_regime");
});

test("bonus E : snapshot avec regime=null → warning, pas d'exception", () => {
  const snap = snapshot();
  snap.regime = null;
  const e = explainSetupAuthorizationV1("RS_ROTATION_SIMPLE", snap);
  assert.equal(e.allowed, true,
    "no regime to check + no blockedConditions matched → still 'allowed' (warning surfaces ambiguity)");
  assert.ok(e.warnings.includes("snapshot_regime_missing"));
});

test("bonus F : couverture exhaustive des 5 setups attendus du brief", () => {
  const expected = [
    "RS_ROTATION_SIMPLE",
    "MEAN_REVERSION",
    "SECTOR_RELATIVE_STRENGTH",
    "TREND_PULLBACK_DYNAMIC_SUPPORT",
    "GLD_BREAKOUT_ISOLATED",
  ];
  const actual = listSetupIdsV1().sort();
  assert.deepEqual(actual, [...expected].sort());
  for (const id of expected) {
    const entry = getSetupAuthorizationV1(id);
    assert.ok(entry, `Missing setup: ${id}`);
    assert.ok(entry.statusRef, `Missing statusRef for ${id}`);
    assert.ok(entry.registryLink.startsWith("docs/quant/SETUPS_REGISTRY.md"),
      `${id} must link to SETUPS_REGISTRY`);
  }
});
