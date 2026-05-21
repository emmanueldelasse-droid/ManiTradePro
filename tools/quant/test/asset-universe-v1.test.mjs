// tools/quant/test/asset-universe-v1.test.mjs
//
// Tests unitaires Asset Universe V1 staged — node:test.
//
// Exécution :
//   node --test tools/quant/test/asset-universe-v1.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ASSET_UNIVERSE_V1,
  ASSET_UNIVERSE_V1_VERSION,
  ASSET_UNIVERSE_V1_METADATA,
  ASSET_TIERS,
  getAssetTierV1,
  isLivePaperCoreV1,
  isAnalysisAllowedV1,
  isBlockedV1,
  listSymbolsByTierV1,
  validateAssetUniverseInvariantsV1,
} from "../lib/asset-universe-v1.mjs";

// === Tests obligatoires (brief) ===========================================

test("1. asset analysis-only → visible/analyzable + PAS auto-open paper", () => {
  // Un actif présent dans analysisUniverse mais ABSENT de livePaperCore
  // doit être analysable (visible UI / rankings) MAIS pas auto-open.
  // Exemples : SOXX, MU, KLAC, AMAT, LRCX, DDOG, OKTA, NESN, RMS, BNB, AVAX, LINK.
  const analysisOnlyExamples = [
    "SOXX", "MU", "KLAC", "AMAT", "LRCX", "DDOG", "OKTA", "NESN", "RMS",
    "BNB", "AVAX", "LINK", "DIA", "MDY", "BOTZ",
  ];
  for (const sym of analysisOnlyExamples) {
    assert.equal(getAssetTierV1(sym), "ANALYSIS_ONLY", `${sym} doit être ANALYSIS_ONLY`);
    assert.equal(isAnalysisAllowedV1(sym), true, `${sym} doit être visible/analysable`);
    assert.equal(isLivePaperCoreV1(sym), false, `${sym} doit être interdit d'auto-open`);
    assert.equal(isBlockedV1(sym), false);
  }
});

test("2. asset livePaperCore → auto-open autorisé", () => {
  const coreExamples = [
    "SPY", "QQQ", "NVDA", "MSFT", "META", "AMZN", "AAPL", "AVGO", "AMD",
    "TSLA", "GLD", "TLT", "BTC", "ETH", "XLF", "XLV",
  ];
  for (const sym of coreExamples) {
    assert.equal(getAssetTierV1(sym), "LIVE_PAPER_CORE", `${sym} doit être LIVE_PAPER_CORE`);
    assert.equal(isLivePaperCoreV1(sym), true, `${sym} doit être auto-open autorisé`);
    assert.equal(isAnalysisAllowedV1(sym), true, `${sym} doit aussi être analysable`);
    assert.equal(isBlockedV1(sym), false);
  }
  // Taille respecte la fourchette brief (30-50).
  const coreCount = listSymbolsByTierV1("LIVE_PAPER_CORE").length;
  assert.ok(coreCount >= 30 && coreCount <= 50,
    `livePaperCore size ${coreCount} hors fourchette [30, 50]`);
});

test("3. asset blocked → rejet propre", () => {
  // KNOWN_ISSUES #15.
  for (const sym of ["XLY", "XLE", "XLU"]) {
    assert.equal(getAssetTierV1(sym), "BLOCKED", `${sym} doit être BLOCKED (#15)`);
    assert.equal(isBlockedV1(sym), true);
    assert.equal(isLivePaperCoreV1(sym), false);
    assert.equal(isAnalysisAllowedV1(sym), false, `${sym} ne doit PAS être analysable`);
  }
  // FX BLACKLIST.
  for (const sym of ["EURUSD", "GBPUSD", "USDJPY"]) {
    assert.equal(getAssetTierV1(sym), "BLOCKED", `${sym} doit être BLOCKED (FX)`);
    assert.equal(isBlockedV1(sym), true);
    assert.equal(isLivePaperCoreV1(sym), false);
  }
});

test("4. aucun changement sizing — module pur ne référence aucun helper sizing", () => {
  // Le module pur NE contient aucune fonction de calcul de quantité,
  // allocation, ou stop/TP. Preuve structurelle : sérialisation +
  // grep des noms canonique des helpers de sizing du worker.
  const FORBIDDEN_SIZING_REFERENCES = [
    "chooseTrainingExecution",
    "computePnlForClose",
    "calcDetailScore",
    "buildWorkerPlan",
    "computeTradeSafetyScore",
    "evaluateExecutionSafety",
    "allocation_per_trade_pct",
    "risk_per_trade_pct",
  ];
  const moduleSerialization = JSON.stringify(ASSET_UNIVERSE_V1);
  for (const fn of FORBIDDEN_SIZING_REFERENCES) {
    assert.ok(!moduleSerialization.includes(fn),
      `Module pur ne doit pas référencer la fonction sizing/scoring ${fn}`);
  }
});

test("5. aucun drift décisionnel hors univers gating — exports ne touchent rien d'autre", () => {
  // Les fonctions exportées ne retournent QUE boolean ou tier label.
  // Aucune ne retourne un score, un seuil, ou un objet sizing.
  for (const sym of ["SPY", "MU", "XLY", "UNKNOWN_SYM"]) {
    const t = getAssetTierV1(sym);
    assert.equal(typeof t, "string");
    assert.ok(Object.values(ASSET_TIERS).includes(t),
      `${sym} doit avoir un tier valide, got ${t}`);
    assert.equal(typeof isLivePaperCoreV1(sym), "boolean");
    assert.equal(typeof isAnalysisAllowedV1(sym), "boolean");
    assert.equal(typeof isBlockedV1(sym), "boolean");
  }
  // Le helper isLivePaperCoreV1 est par construction RESTRICTIF :
  // pour passer true, il faut être strictement dans livePaperCore.
  // Symbole inconnu → false (donc auto-open bloqué = restriction).
  assert.equal(isLivePaperCoreV1("RANDOMTICKER"), false);
  assert.equal(isLivePaperCoreV1(""), false);
  assert.equal(isLivePaperCoreV1(null), false);
  assert.equal(isLivePaperCoreV1(undefined), false);
  assert.equal(isLivePaperCoreV1(42), false);
});

test("6. aucun LIVE_READY dans la taxonomie ou les exports", () => {
  const sources = [
    JSON.stringify(ASSET_UNIVERSE_V1),
    JSON.stringify(ASSET_UNIVERSE_V1_METADATA),
    JSON.stringify(ASSET_TIERS),
  ];
  for (const src of sources) {
    assert.ok(!src.includes("LIVE_READY"),
      "Le module ne doit jamais produire le label LIVE_READY");
  }
});

test("7. aucun broker / argent réel dans la taxonomie", () => {
  const src = JSON.stringify(ASSET_UNIVERSE_V1) + JSON.stringify(ASSET_UNIVERSE_V1_METADATA);
  const lower = src.toLowerCase();
  for (const forbidden of ["broker", "real_money", "real money", "ibkr", "alpaca", "interactivebrokers"]) {
    assert.ok(!lower.includes(forbidden),
      `Le module ne doit jamais référencer "${forbidden}"`);
  }
});

test("8. déterminisme JSON — mêmes appels → mêmes sorties byte-à-byte", () => {
  const a = JSON.stringify(ASSET_UNIVERSE_V1);
  const b = JSON.stringify(ASSET_UNIVERSE_V1);
  assert.equal(a, b);

  const m1 = JSON.stringify(ASSET_UNIVERSE_V1_METADATA);
  const m2 = JSON.stringify(ASSET_UNIVERSE_V1_METADATA);
  assert.equal(m1, m2);

  // Helpers stables.
  for (const sym of ["NVDA", "XLY", "SOXX", "ZEN", "UNKNOWN"]) {
    assert.equal(getAssetTierV1(sym), getAssetTierV1(sym));
    assert.equal(isLivePaperCoreV1(sym), isLivePaperCoreV1(sym));
  }
});

test("9. univers sans doublons — chaque bucket est un Set", () => {
  for (const tier of ["LIVE_PAPER_CORE", "ANALYSIS_ONLY", "EXPERIMENTAL", "BLOCKED"]) {
    const arr = listSymbolsByTierV1(tier);
    const set = new Set(arr);
    assert.equal(arr.length, set.size, `Doublons détectés dans tier ${tier}`);
  }
  // Aussi dans la constante exportée (les buckets bruts).
  for (const bucket of ["livePaperCore", "analysisUniverse", "experimentalUniverse", "blockedUniverse"]) {
    const arr = ASSET_UNIVERSE_V1[bucket];
    const set = new Set(arr);
    assert.equal(arr.length, set.size, `Doublons dans bucket ${bucket}`);
  }
});

test("10. validation cohérence registry — invariants ✓", () => {
  const r = validateAssetUniverseInvariantsV1();
  assert.equal(r.ok, true, `Invariants violés: ${r.violations.join(", ")}`);

  // Conditions structurelles essentielles.
  // a) livePaperCore ⊆ analysisUniverse
  const analysisSet = new Set(ASSET_UNIVERSE_V1.analysisUniverse);
  for (const s of ASSET_UNIVERSE_V1.livePaperCore) {
    assert.ok(analysisSet.has(s),
      `livePaperCore ${s} doit aussi être dans analysisUniverse`);
  }
  // b) experimentalUniverse ∩ analysisUniverse = ∅
  for (const s of ASSET_UNIVERSE_V1.experimentalUniverse) {
    assert.ok(!analysisSet.has(s),
      `experimental ${s} ne doit pas être dans analysisUniverse`);
  }
  // c) blockedUniverse n'intersecte avec aucun autre bucket
  const blockedSet = new Set(ASSET_UNIVERSE_V1.blockedUniverse);
  for (const s of [...ASSET_UNIVERSE_V1.livePaperCore, ...ASSET_UNIVERSE_V1.analysisUniverse, ...ASSET_UNIVERSE_V1.experimentalUniverse]) {
    assert.ok(!blockedSet.has(s),
      `${s} ne peut pas être à la fois autorisé et blocked`);
  }
});

// === Tests complémentaires ================================================

test("bonus A : version et métadonnées correctement exposées", () => {
  assert.equal(ASSET_UNIVERSE_V1_VERSION, "asset-universe-v1");
  assert.equal(ASSET_UNIVERSE_V1_METADATA.version, "asset-universe-v1");
  assert.equal(ASSET_UNIVERSE_V1_METADATA.counts.livePaperCore, ASSET_UNIVERSE_V1.livePaperCore.length);
  assert.equal(ASSET_UNIVERSE_V1_METADATA.counts.analysisUniverse, ASSET_UNIVERSE_V1.analysisUniverse.length);
  assert.equal(ASSET_UNIVERSE_V1_METADATA.counts.experimentalUniverse, ASSET_UNIVERSE_V1.experimentalUniverse.length);
  assert.equal(ASSET_UNIVERSE_V1_METADATA.counts.blockedUniverse, ASSET_UNIVERSE_V1.blockedUniverse.length);
  // Référence #15 documentée.
  assert.match(ASSET_UNIVERSE_V1_METADATA.references.knownIssuesRef, /KNOWN_ISSUES\.md#15/);
});

test("bonus B : symbole UNKNOWN ne crash pas, retourne UNKNOWN proprement", () => {
  assert.equal(getAssetTierV1("ZZZNONEXISTENT"), "UNKNOWN");
  assert.equal(getAssetTierV1(""), "UNKNOWN");
  assert.equal(getAssetTierV1(null), "UNKNOWN");
  assert.equal(getAssetTierV1(undefined), "UNKNOWN");
  assert.equal(getAssetTierV1(123), "UNKNOWN");
  assert.equal(getAssetTierV1({ symbol: "SPY" }), "UNKNOWN");
});

test("bonus C : normalisation casse + trim", () => {
  // Le module normalise vers UPPERCASE et trim.
  assert.equal(getAssetTierV1("nvda"), "LIVE_PAPER_CORE");
  assert.equal(getAssetTierV1("  AAPL  "), "LIVE_PAPER_CORE");
  assert.equal(isLivePaperCoreV1("spy"), true);
  assert.equal(isBlockedV1("xly"), true);
});

test("bonus D : taille des buckets cohérente avec le brief", () => {
  const counts = ASSET_UNIVERSE_V1_METADATA.counts;
  // Brief : ~170 actifs analyse / 30-50 live paper core.
  assert.ok(counts.livePaperCore >= 30 && counts.livePaperCore <= 50,
    `livePaperCore=${counts.livePaperCore}, brief: 30-50`);
  assert.ok(counts.analysisUniverse >= 150 && counts.analysisUniverse <= 190,
    `analysisUniverse=${counts.analysisUniverse}, brief: ≈170`);
  assert.ok(counts.experimentalUniverse < 50,
    `experimentalUniverse=${counts.experimentalUniverse} (taille raisonnable)`);
  assert.ok(counts.blockedUniverse >= 6,
    `blockedUniverse=${counts.blockedUniverse}, doit contenir au minimum #15 + FX`);
});
