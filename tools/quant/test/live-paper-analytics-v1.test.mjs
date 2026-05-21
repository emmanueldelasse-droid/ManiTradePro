// tools/quant/test/live-paper-analytics-v1.test.mjs
//
// Tests unitaires Live Paper Analytics V1 — node:test.
//
// Exécution :
//   node --test tools/quant/test/live-paper-analytics-v1.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LIVE_PAPER_ANALYTICS_V1_VERSION,
  LIVE_PAPER_ENGINE_SETUP_MAP_V1,
  buildLivePaperAnalyticsV1,
  buildLivePaperOutcomeV1,
  assessSignalQualityV1,
  markSectorLeadershipUntrusted,
  normalizeValidationStatus,
} from "../lib/live-paper-analytics-v1.mjs";

// === Fixtures =============================================================

function ctxSnapshot(overrides = {}) {
  return {
    version: "context-engine-v1",
    asOf: "2024-06-28",
    regime: "RISK_ON",
    regimeConfidence: 80,
    breadth: { riskOnCount: 10, riskOffCount: 4, neutralCount: 0, totalEvaluated: 14, pctRiskOn: 71.4, pctRiskOff: 28.6 },
    sectorLeadership: {
      leaders: [{ symbol: "XLV", score: 0.04, trendState: "ABOVE_EMA200", relStrength20d: 0.01, relStrength63d: 0.07 }],
      laggards: [{ symbol: "XLU", score: -0.5, trendState: "BELOW_EMA200", relStrength20d: -0.5, relStrength63d: -0.5 }],
    },
    vol: { proxy: "SPY_REALIZED_VOL_20D", value: 0.12, state: "NORMAL" },
    defensiveConfirmation: { tltState: "NEUTRAL", gldState: "NEUTRAL" },
    warnings: [],
    dataQuality: { missingSymbols: [], insufficientHistory: [], evaluatedSymbols: [] },
    ...overrides,
  };
}

// === Tests obligatoires (brief) ===========================================

test("1. Création metadata analytics à l'ouverture — structure complète", () => {
  const meta = buildLivePaperAnalyticsV1({
    capturedAt: "2024-06-28T15:30:00.000Z",
    setupId: "RS_ROTATION_SIMPLE",
    engineSetupType: "pullback",
    setupStatusRef: "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED",
    regime: "RISK_ON",
    regimeConfidence: 85,
    scores: { strategicScore: 72, decisionScore: 70, safetyScore: 65, exploitabilityScore: 58 },
    plan: { entry: 580.5, stopLoss: 565, takeProfit: 620, rr: 2.5, horizon: "swing" },
    quoteQuality: { executionSafe: true, trustScore: 90, validationStatus: "live", reasons: [] },
  });

  assert.equal(meta.version, "live-paper-analytics-v1");
  assert.equal(meta.capturedAt, "2024-06-28T15:30:00.000Z");
  assert.equal(meta.setupId, "RS_ROTATION_SIMPLE");
  assert.equal(meta.regime, "RISK_ON");
  assert.equal(meta.regimeConfidence, 85);
  assert.equal(meta.scores.safetyScore, 65);
  assert.equal(meta.plan.rr, 2.5);
  assert.equal(meta.plan.horizon, "swing");
  assert.equal(meta.quoteQuality.executionSafe, true);
  assert.deepEqual(meta.warnings, []);
});

test("2. Clôture — outcome structure + signalQuality calculé", () => {
  const out = buildLivePaperOutcomeV1({
    closedAt: "2024-07-05T20:00:00.000Z",
    exitReason: "take_profit",
    entryPrice: 580.5,
    exitPrice: 619.2,
    pnl: 154.8,
    pnlPct: 6.67,
    durationDays: 7.2,
    hitStop: false,
    hitTakeProfit: true,
    maxFavorableExcursion: 0.07,
    maxAdverseExcursion: -0.012,
    validationStatusRaw: "ok",
    qualityFlags: [],
  });

  assert.equal(out.version, "live-paper-analytics-v1");
  assert.equal(out.exitReason, "take_profit");
  assert.equal(out.hitTakeProfit, true);
  assert.equal(out.hitStop, false);
  assert.equal(out.validationStatus, "OK");
  assert.equal(out.signalQuality, "GOOD");
  assert.deepEqual(out.qualityFlags, []);
  assert.deepEqual(out.warnings, []);
});

test("3. Trade SUSPECT si quote unsafe au close → signalQuality BAD + validationStatus normalisé", () => {
  const out = buildLivePaperOutcomeV1({
    closedAt: "2024-07-05T20:00:00.000Z",
    exitReason: "stop_loss",
    entryPrice: 100,
    exitPrice: 92,
    durationDays: 0.5,
    hitStop: true,
    validationStatusRaw: "suspect",
    qualityFlags: ["stale_quote"],
    quoteQualityAtClose: { executionSafe: false, validationStatus: "stale", reasons: ["stale", "abnormal_spread"] },
  });

  assert.equal(out.validationStatus, "SUSPECT");
  assert.equal(out.signalQuality, "BAD", "quote unsafe au close doit produire BAD (priorité absolue)");
  assert.ok(out.warnings.includes("validation_status:suspect"));
  assert.deepEqual(out.qualityFlags, ["stale_quote"]);
  assert.equal(out.quoteQualityAtClose.executionSafe, false);

  // INVALID worker → BAD
  const invalidOut = buildLivePaperOutcomeV1({
    closedAt: "2024-07-05T20:00:00.000Z",
    exitReason: "stop_loss",
    validationStatusRaw: "invalid",
    qualityFlags: ["invalid_price"],
    durationDays: 0.001,
    hitStop: true,
  });
  assert.equal(invalidOut.signalQuality, "BAD");
  assert.equal(invalidOut.validationStatus, "INVALID");
});

test("4. CTX-3 bloqué → warning + observation, AUCUN blocage réel", () => {
  // setupAuthorization marqué bloqué (par exemple, MEAN_REVERSION en RISK_ON
  // après la matrice CTX-3 → blocked). On vérifie que le helper ne refuse
  // PAS de construire la metadata — il enregistre simplement le warning.
  const meta = buildLivePaperAnalyticsV1({
    capturedAt: "2024-06-28T15:30:00.000Z",
    setupId: "MEAN_REVERSION",
    engineSetupType: "mean_reversion",
    setupStatusRef: "EXPERIMENTAL_ONLY / FRICTION_REQUIRED",
    regime: "RISK_ON",
    setupAuthorization: {
      version: "setup-authorization-matrix-v1",
      setupId: "MEAN_REVERSION",
      allowed: false,
      blockedBy: ["regime_blocked:RISK_ON"],
      met: [],
      unmet: ["vol.state in [LOW,NORMAL]"],
      warnings: [],
      snapshotRegime: "RISK_ON",
      statusRef: "EXPERIMENTAL_ONLY / FRICTION_REQUIRED",
    },
  });

  assert.ok(meta, "metadata produite même si setupAuthorization=blocked");
  assert.equal(meta.setupAuthorization.allowed, false);
  assert.deepEqual(meta.setupAuthorization.blockedBy, ["regime_blocked:RISK_ON"]);
  assert.ok(meta.warnings.some((w) => w.startsWith("ctx3_would_block:")));
  // INVARIANT : aucune mutation côté allowed=true → le worker doit
  // continuer à ouvrir le trade s'il en a décidé ainsi.
  assert.equal(typeof meta.setupAuthorization.allowed, "boolean");
});

test("5. sectorLeadership tagué `sector_leadership_untrusted` (KNOWN_ISSUES #15)", () => {
  const snap = ctxSnapshot();
  const meta = buildLivePaperAnalyticsV1({
    capturedAt: "2024-06-28T15:30:00.000Z",
    setupId: "GLD_BREAKOUT_ISOLATED",
    contextSnapshot: snap,
  });

  // Le sectorLeadership original doit être remplacé par un blob untrusted.
  assert.equal(meta.contextSnapshot.sectorLeadership.untrusted, true);
  assert.match(meta.contextSnapshot.sectorLeadership.reason, /known_issues_15_open/);
  assert.ok(meta.warnings.includes("sector_leadership_untrusted"));

  // L'original est préservé (sous clé _raw) pour audit forensique.
  assert.deepEqual(meta.contextSnapshot.sectorLeadership._raw, snap.sectorLeadership);

  // Helper isolé exposé.
  const direct = markSectorLeadershipUntrusted(snap);
  assert.equal(direct.sectorLeadership.untrusted, true);

  // Si contextSnapshot n'a pas sectorLeadership → pas de modif fantasme.
  const noSL = ctxSnapshot();
  delete noSL.sectorLeadership;
  const m2 = buildLivePaperAnalyticsV1({ contextSnapshot: noSL });
  assert.equal(m2.contextSnapshot.sectorLeadership, undefined);
  assert.ok(!m2.warnings.includes("sector_leadership_untrusted"));
});

test("6. Aucun champ LIVE_READY n'est jamais produit (brief)", () => {
  const meta = buildLivePaperAnalyticsV1({
    capturedAt: "2024-06-28T15:30:00.000Z",
    setupId: "RS_ROTATION_SIMPLE",
    setupStatusRef: "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED",
    regime: "RANGE",
  });
  const out = buildLivePaperOutcomeV1({
    closedAt: "2024-07-05T20:00:00.000Z",
    exitReason: "take_profit",
    validationStatusRaw: "ok",
  });

  const serMeta = JSON.stringify(meta);
  const serOut = JSON.stringify(out);
  assert.ok(!serMeta.includes("LIVE_READY"), "metadata ouverture ne doit jamais contenir LIVE_READY");
  assert.ok(!serOut.includes("LIVE_READY"), "outcome clôture ne doit jamais contenir LIVE_READY");

  // Aucune mention "broker" non plus.
  assert.ok(!serMeta.toLowerCase().includes("broker"));
  assert.ok(!serOut.toLowerCase().includes("broker"));
});

test("7. Déterminisme : mêmes entrées → mêmes JSON byte-à-byte", () => {
  const input = {
    capturedAt: "2024-06-28T15:30:00.000Z",
    setupId: "GLD_BREAKOUT_ISOLATED",
    engineSetupType: "breakout",
    regime: "RISK_ON",
    regimeConfidence: 80,
    scores: { strategicScore: 72, decisionScore: 70, safetyScore: 65, exploitabilityScore: 58 },
    plan: { entry: 580.5, stopLoss: 565, takeProfit: 620, rr: 2.5, horizon: "swing" },
    contextSnapshot: ctxSnapshot(),
    setupAuthorization: {
      version: "setup-authorization-matrix-v1",
      setupId: "GLD_BREAKOUT_ISOLATED",
      allowed: true,
      blockedBy: [],
      met: ["vol.state in [LOW,NORMAL]"],
      unmet: [],
      warnings: [],
      snapshotRegime: "RISK_ON",
      statusRef: "CONDITIONAL_RESEARCH_CANDIDATE",
    },
  };

  const m1 = JSON.stringify(buildLivePaperAnalyticsV1(input));
  const m2 = JSON.stringify(buildLivePaperAnalyticsV1(input));
  assert.equal(m1, m2, "deux appels identiques doivent produire le même JSON");

  // Outcome déterminisme
  const closeInput = {
    closedAt: "2024-07-05T20:00:00.000Z",
    exitReason: "take_profit",
    entryPrice: 580.5,
    exitPrice: 619.2,
    pnl: 154.8,
    pnlPct: 6.67,
    durationDays: 7.2,
    hitTakeProfit: true,
    validationStatusRaw: "ok",
  };
  const o1 = JSON.stringify(buildLivePaperOutcomeV1(closeInput));
  const o2 = JSON.stringify(buildLivePaperOutcomeV1(closeInput));
  assert.equal(o1, o2);
});

// === Tests complémentaires ================================================

test("bonus A : assessSignalQualityV1 ordre de priorité", () => {
  // INVALID > unsafe quote > SUSPECT > instant_close > data manquante > GOOD
  assert.equal(assessSignalQualityV1({ validationStatus: "INVALID" }), "BAD");
  assert.equal(assessSignalQualityV1({
    validationStatus: "OK",
    quoteQualityAtClose: { executionSafe: false },
  }), "BAD");
  assert.equal(assessSignalQualityV1({ validationStatus: "SUSPECT" }), "NOISY");
  assert.equal(assessSignalQualityV1({
    validationStatus: "OK",
    durationDays: 1 / 48, // ~30 min
    hitStop: true,
  }), "NOISY");
  assert.equal(assessSignalQualityV1({
    validationStatus: "OK",
    dataQuality: { missingSymbols: ["XLU"], insufficientHistory: [] },
  }), "NOISY");
  assert.equal(assessSignalQualityV1({ validationStatus: "OK", durationDays: 5, hitStop: false }), "GOOD");
  assert.equal(assessSignalQualityV1({ validationStatus: "UNKNOWN" }), "UNKNOWN");
});

test("bonus B : normalizeValidationStatus mapping complet", () => {
  assert.equal(normalizeValidationStatus("ok"), "OK");
  assert.equal(normalizeValidationStatus("OK"), "OK");
  assert.equal(normalizeValidationStatus("suspect"), "SUSPECT");
  assert.equal(normalizeValidationStatus("invalid"), "INVALID");
  assert.equal(normalizeValidationStatus("garbled"), "UNKNOWN");
  assert.equal(normalizeValidationStatus(null), "UNKNOWN");
  assert.equal(normalizeValidationStatus(123), "UNKNOWN");
});

test("bonus C : LIVE_PAPER_ENGINE_SETUP_MAP_V1 — DEAD setups NON mappés", () => {
  // "pullback" et "mean_reversion" sont mappés (vivants côté matrice).
  assert.equal(LIVE_PAPER_ENGINE_SETUP_MAP_V1.pullback, "TREND_PULLBACK_DYNAMIC_SUPPORT");
  assert.equal(LIVE_PAPER_ENGINE_SETUP_MAP_V1.mean_reversion, "MEAN_REVERSION");
  // DEAD setups : non mappés (absents).
  assert.equal(LIVE_PAPER_ENGINE_SETUP_MAP_V1.breakout, undefined);
  assert.equal(LIVE_PAPER_ENGINE_SETUP_MAP_V1.no_structural_setup, undefined);
  assert.equal(LIVE_PAPER_ENGINE_SETUP_MAP_V1.continuation, undefined);
});

test("bonus D : inputs invalides → null + warnings, jamais d'exception", () => {
  // Aucun input → metadata avec champs null
  const m = buildLivePaperAnalyticsV1();
  assert.equal(m.version, "live-paper-analytics-v1");
  assert.equal(m.setupId, null);
  assert.equal(m.regime, null);
  assert.equal(m.contextSnapshot, null);
  assert.deepEqual(m.warnings, []);

  // Inputs corrompus
  const m2 = buildLivePaperAnalyticsV1({
    capturedAt: 12345, // pas une string
    setupId: { not: "a string" },
    scores: "not an object",
    plan: { entry: "NaN", stopLoss: null, takeProfit: undefined },
  });
  assert.equal(m2.capturedAt, null);
  assert.equal(m2.setupId, null);
  assert.equal(m2.scores, null);
  assert.equal(m2.plan.entry, null);
  assert.equal(m2.plan.stopLoss, null);

  // Outcome avec inputs corrompus
  const o = buildLivePaperOutcomeV1({
    closedAt: null,
    exitReason: null,
    entryPrice: "n/a",
    durationDays: "Infinity",
  });
  assert.equal(o.version, "live-paper-analytics-v1");
  assert.equal(o.entryPrice, null);
  assert.equal(o.durationDays, null);
  assert.equal(o.signalQuality, "UNKNOWN");
});
