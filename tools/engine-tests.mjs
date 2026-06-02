#!/usr/bin/env node
// Tests moteur ManiTradePro — décision, mode exploration, auth Analytics.
//
// Usage : node --test tools/engine-tests.mjs   (ou : npm test)
//
// Pourquoi un chargement via vm ?
// worker.js est un module Cloudflare (export default) non bundlé pour Node.
// Plutôt que de refactorer l'architecture (interdit hors besoin — cf.
// CLAUDE.md), on lit le source, on retire l'export ESM final, et on évalue le
// reste dans un contexte vm isolé. Les fonctions pures (buildWorkerPlan,
// applyExplorationFloor, isTrainingCandidateAllowed…) deviennent accessibles
// et n'ont besoin d'aucun réseau. Aucun appel Supabase / fetch ici.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

// --- Chargement du worker dans un contexte vm ---------------------------------
const workerSrc = readFileSync(path.join(REPO, "cloudflare-worker", "worker.js"), "utf8");
// Retire `export default { ... }` jusqu'à la fin (seule construction ESM).
const stripped = workerSrc.replace(/export default\s*\{[\s\S]*$/m, "");

const sandbox = {
  console, Date, Math, JSON, Number, Array, Object, String, Boolean,
  RegExp, Set, Map, Symbol, Error, parseInt, parseFloat, isNaN, isFinite,
  setTimeout, clearTimeout,
  TextEncoder, TextDecoder,
  crypto: globalThis.crypto,
  structuredClone: globalThis.structuredClone
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(stripped, sandbox, { filename: "worker.js" });

const {
  buildWorkerPlan,
  applyExplorationFloor,
  getTradeDecisionProfile,
  isTrainingCandidateAllowed,
  normalizeTrainingSettingsRow,
  getTrainingDefaults
} = sandbox;

// Garde-fou : si l'évaluation vm n'a pas exposé les fonctions, on échoue tôt
// avec un message clair plutôt qu'un cascade de "is not a function".
test("setup — les fonctions moteur sont chargées", () => {
  for (const [name, fn] of Object.entries({
    buildWorkerPlan, applyExplorationFloor, getTradeDecisionProfile,
    isTrainingCandidateAllowed, normalizeTrainingSettingsRow, getTrainingDefaults
  })) {
    assert.equal(typeof fn, "function", `${name} doit être chargée`);
  }
});

// Construit un `base` propre pour buildWorkerPlan (chemin fallback, sans setup
// structurel → pas de plan structuré, on teste le plancher générique).
function makeBase(overrides = {}) {
  return {
    score: 70,
    direction: "long",
    assetClass: "stock",
    price: 100,
    avgRange: 2,
    setupType: "aucun",
    hardFilters: { passed: true, flags: [] },
    configuration: { config: "AUCUNE", levels: {} },
    breakdown: {
      regime: 60, trend: 65, momentum: 65,
      entryQuality: 60, risk: 60, context: 60,
      participation: 70, dataQuality: 90
    },
    ...overrides
  };
}

// --- #1 : un actif à 70 sans blocage critique ne finit pas en "Pas de trade" ---
test("score 70 sans blocage critique → pas 'Pas de trade'", () => {
  const plan = buildWorkerPlan(makeBase({ score: 70 }), null);
  assert.notEqual(plan.decision, "Pas de trade",
    `un dossier à 70 propre doit au minimum être surveillé (reçu: ${plan.decision})`);
  // Score 70 + risque acceptable → trade exploration (taille réduite).
  assert.equal(plan.decision, "Trade propose");
  assert.equal(plan.exploration, true);
});

test("score 66 sans blocage critique → au minimum 'A surveiller'", () => {
  const plan = buildWorkerPlan(makeBase({ score: 66 }), null);
  assert.equal(plan.decision, "A surveiller");
  assert.equal(plan.exploration, false);
});

// --- #2 : un actif avec blocage critique reste bloqué -------------------------
test("blocage critique (risk_too_high) → reste 'Pas de trade'", () => {
  const plan = buildWorkerPlan(makeBase({
    score: 72,
    hardFilters: { passed: false, flags: ["risk_too_high"] }
  }), null);
  assert.equal(plan.decision, "Pas de trade");
  assert.equal(plan.exploration, false);
  // La raison du refus doit être exposée (pas de rejet silencieux).
  assert.ok(Array.isArray(plan.blockers) && plan.blockers.length > 0,
    "blockers[] doit expliquer le refus");
});

test("blocage critique (entry_too_late) → reste 'Pas de trade' même à 73", () => {
  const plan = buildWorkerPlan(makeBase({
    score: 73,
    hardFilters: { passed: false, flags: ["entry_too_late"] }
  }), null);
  assert.equal(plan.decision, "Pas de trade");
});

// --- applyExplorationFloor : table de vérité ----------------------------------
test("applyExplorationFloor — table de vérité", () => {
  const profile = getTradeDecisionProfile("stock");
  const common = { confirmationCount: 3, majorBlockerCount: 0, watchFilterOk: true, riskQuality: 60, direction: "long", profile };

  // 70 + risque ok → trade exploration
  let r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 70, ...common });
  assert.equal(r.decision, "Trade propose");
  assert.equal(r.exploration, true);

  // 65 → surveillance exploration
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 65, ...common });
  assert.equal(r.decision, "A surveiller");
  assert.equal(r.exploration, false);

  // 64 → rien (sous le plancher)
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 64, ...common });
  assert.equal(r.decision, "Pas de trade");

  // 70 mais blocage critique → rien
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 70, ...common, majorBlockerCount: 1 });
  assert.equal(r.decision, "Pas de trade");

  // 70 mais confirmations < 3 → rien
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 70, ...common, confirmationCount: 2 });
  assert.equal(r.decision, "Pas de trade");

  // 70 mais risque insuffisant → seulement surveillance (pas de trade)
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 70, ...common, riskQuality: 10 });
  assert.equal(r.decision, "A surveiller");
  assert.equal(r.exploration, false);

  // direction neutre → jamais d'upgrade
  r = applyExplorationFloor({ decision: "Pas de trade", decisionScore: 80, ...common, direction: "neutral" });
  assert.equal(r.decision, "Pas de trade");
});

// --- #4 : le mode exploration génère au moins une opportunité testable --------
test("mode exploration — au moins une opportunité testable sur un lot propre", () => {
  const scores = [64, 66, 68, 70, 72];
  const plans = scores.map((s) => buildWorkerPlan(makeBase({ score: s }), null));
  const tradables = plans.filter((p) => p.decision === "Trade propose" && p.exploration === true);
  const watchables = plans.filter((p) => p.decision === "A surveiller");
  assert.ok(tradables.length >= 1, "au moins un paper trade exploration doit être proposé");
  assert.ok(watchables.length >= 1, "au moins un actif doit passer en surveillance");
});

// --- #4bis : l'auto-open exploration ouvre à taille réduite, gardes intactes ---
function makeExplorationRow(overrides = {}) {
  return {
    status: "ok",
    symbol: "BTC",            // crypto → pas de garde heures de marché / férié
    assetClass: "crypto",
    direction: "long",
    score: 71,
    decision: "Trade propose",
    regime: "bull",
    liveContext: { quoteQuality: { executionSafe: true, reasons: [] } },
    plan: {
      decision: "Trade propose",
      tradeNow: true,
      exploration: true,
      side: "long",
      setupType: "pullback",
      decisionScore: 70,
      exploitabilityScore: 55,
      safetyScore: 62,
      rr: 1.8,
      entry: 100, stopLoss: 95, takeProfit: 110
    },
    ...overrides
  };
}

test("auto-open — un trade exploration valide est éligible", () => {
  const settings = normalizeTrainingSettingsRow(getTrainingDefaults());
  const riskState = { tradingEnabled: true, blockers: [] };
  const eligible = isTrainingCandidateAllowed(
    makeExplorationRow(), settings, [], riskState, { blocked: false }, null, new Set()
  );
  assert.equal(eligible, true, "le candidat exploration propre doit être éligible à l'auto-open paper");
});

test("auto-open — sans le flag exploration, la sûreté 62 reste sous le seuil strict 68", () => {
  const settings = normalizeTrainingSettingsRow(getTrainingDefaults());
  const riskState = { tradingEnabled: true, blockers: [] };
  const row = makeExplorationRow();
  row.plan.exploration = false; // trade "normal" → seuils stricts
  const eligible = isTrainingCandidateAllowed(
    row, settings, [], riskState, { blocked: false }, null, new Set()
  );
  assert.equal(eligible, false, "un trade non-exploration à sûreté 62 doit rester bloqué (< 68)");
});

test("auto-open — exploration désactivée → seuils stricts ré-appliqués", () => {
  const settings = normalizeTrainingSettingsRow({ ...getTrainingDefaults(), exploration_auto_open: false });
  const riskState = { tradingEnabled: true, blockers: [] };
  const eligible = isTrainingCandidateAllowed(
    makeExplorationRow(), settings, [], riskState, { blocked: false }, null, new Set()
  );
  assert.equal(eligible, false, "exploration_auto_open=false doit re-bloquer le trade à sûreté 62");
});

test("garde quote unsafe (R5) NON contournée par l'exploration", () => {
  const { evaluateExecutionSafety, applyUnsafeDowngrade } = sandbox;
  const qq = { executionSafe: false, reasons: ["stale"], stale: true };

  // 1) La garde d'exécution juge la quote non sûre.
  assert.equal(evaluateExecutionSafety({ liveContext: { quoteQuality: qq } }).safe, false);

  // 2) applyUnsafeDowngrade redescend tout payload "Trade propose" à
  //    "Pas de trade" → isTrainingCandidateAllowed le rejette ensuite via son
  //    check `decision !== "Trade propose"`. C'est la chaîne réelle qui protège
  //    R5, indépendamment du mode exploration.
  const downgraded = applyUnsafeDowngrade({
    decision: "Trade propose",
    officialDecision: "Trade propose",
    score: 71,
    plan: { decision: "Trade propose", tradeNow: true, exploration: true, safetyScore: 62 },
    liveContext: { quoteQuality: qq }
  });
  assert.equal(downgraded.decision, "Pas de trade");
  assert.equal(downgraded.plan.tradeNow, false);

  const settings = normalizeTrainingSettingsRow(getTrainingDefaults());
  const eligible = isTrainingCandidateAllowed(
    downgraded, settings, [], { tradingEnabled: true, blockers: [] }, { blocked: false }, null, new Set()
  );
  assert.equal(eligible, false, "après downgrade unsafe, le candidat n'est plus éligible (R5)");
});

// --- #3 : feedback / reports passent par l'auth admin (plus de 403) -----------
test("auth — loadTradeFeedback et loadReports utilisent apiGetAuth (token admin)", () => {
  const appSrc = readFileSync(path.join(REPO, "assets", "app.js"), "utf8");
  assert.ok(appSrc.includes('apiGetAuth("/api/training/feedback?limit=500")'),
    "loadTradeFeedback doit appeler apiGetAuth (sinon 403)");
  assert.ok(appSrc.includes('apiGetAuth("/api/reports/weekly?limit=20")'),
    "loadReports doit appeler apiGetAuth (sinon 403)");
  assert.ok(!appSrc.includes('api("/api/training/feedback'),
    "loadTradeFeedback ne doit plus appeler api() sans auth");
  assert.ok(!appSrc.includes('api("/api/reports/weekly'),
    "loadReports ne doit plus appeler api() sans auth");
});

test("auth — les routes feedback/reports sont protégées admin côté Worker", () => {
  // Les deux routes doivent être enregistrées avec requireAdminAccess : c'est
  // la raison pour laquelle le front DOIT envoyer le token (apiGetAuth).
  const routesBlock = workerSrc.slice(workerSrc.indexOf("// GET routes"));
  for (const route of ['/api/training/feedback', '/api/reports/weekly', '/api/training/debug-opportunities']) {
    const idx = routesBlock.indexOf(`url.pathname === "${route}"`);
    assert.ok(idx > 0, `route ${route} doit être enregistrée`);
    const after = routesBlock.slice(idx, idx + 200);
    assert.ok(after.includes("requireAdminAccess"),
      `route ${route} doit exiger requireAdminAccess`);
  }
});
