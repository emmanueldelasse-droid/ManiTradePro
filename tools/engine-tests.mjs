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
  getTrainingDefaults,
  calcDetailScore
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

// --- B.14 : découplage qualité de donnée / qualité d'exécution -----------------
// Un flux légalement différé (EODHD/Twelve 15 min) ne doit plus produire le
// blocage majeur data_quality_low ; seules les données réellement inexécutables
// (eod/snapshot/stale) le déclenchent. calcDetailScore est chargé via vm.
function makeCandles(n = 60, start = 100, step = 0.5) {
  const out = [];
  const day = 86400000;
  const nowMs = Date.now();
  for (let i = 0; i < n; i++) {
    const close = start + i * step;
    out.push({
      time: nowMs - (n - 1 - i) * day,
      open: close - 0.2,
      high: close + 0.6,
      low: close - 0.6,
      close,
      volume: 1_000_000
    });
  }
  return out;
}

test("B.14 — un flux différé 15 min (execution-safe) ne déclenche PAS data_quality_low", () => {
  assert.equal(typeof calcDetailScore, "function", "calcDetailScore doit être chargée");
  const candles = makeCandles();
  const lastClose = candles[candles.length - 1].close;
  const delayedQuote = {
    symbol: "NVDA", name: "NVIDIA", assetClass: "stock",
    price: lastClose, change24hPct: 0.4, volume24h: 5_000_000,
    freshness: "delayed_15m", quotedAt: new Date().toISOString(),
    currency: "USD", sourceUsed: "twelvedata"
  };
  const res = calcDetailScore(delayedQuote, candles);
  const flags = res?.hardFilters?.flags || [];
  const execSafe = res?.liveContext?.quoteQuality?.executionSafe;

  // Invariant central du fix : executionSafe===true ⇒ jamais data_quality_low.
  if (execSafe === true) {
    assert.ok(!flags.includes("data_quality_low"),
      "un flux différé execution-safe ne doit pas être marqué data_quality_low");
  }
  // Et réciproquement : si data_quality_low est présent, c'est que la donnée est
  // réellement inexécutable (executionSafe===false).
  if (flags.includes("data_quality_low")) {
    assert.equal(execSafe, false,
      "data_quality_low ne peut venir que d'une donnée inexécutable");
  }
  // Le scénario différé doit bien être jugé exécutable (différé ≠ unsafe).
  assert.equal(execSafe, true, "delayed_15m frais doit rester execution-safe");
  assert.ok(Number.isFinite(res.score), "le score brut reste calculé normalement");
});

test("B.14 — une donnée EOD/snapshot (inexécutable) reste bloquée data_quality_low", () => {
  const candles = makeCandles();
  const lastClose = candles[candles.length - 1].close;
  const eodQuote = {
    symbol: "NVDA", name: "NVIDIA", assetClass: "stock",
    price: lastClose, change24hPct: 0.4, volume24h: 5_000_000,
    freshness: "eod", quotedAt: new Date().toISOString(),
    currency: "USD", sourceUsed: "snapshot"
  };
  const res = calcDetailScore(eodQuote, candles);
  const flags = res?.hardFilters?.flags || [];
  const execSafe = res?.liveContext?.quoteQuality?.executionSafe;
  assert.equal(execSafe, false, "un snapshot EOD ne doit pas être execution-safe");
  assert.ok(flags.includes("data_quality_low"),
    "une donnée inexécutable doit conserver le blocage data_quality_low");
});

// --- Cohérence affichage scores Opportunités (UI only, app.js dans une IIFE) ---
// Les fonctions front ne sont pas exportables (IIFE) : on vérifie le câblage au
// niveau source, comme pour l'auth. Garantit que la correction de lisibilité
// reste en place (chiffre aligné sur la décision + détail brut/sûreté/blocage).
test("affichage — le cercle Opportunités utilise le score de décision en priorité", () => {
  const appSrc = readFileSync(path.join(REPO, "assets", "app.js"), "utf8");
  // getScoreState doit privilégier decisionScore puis officialScore puis brut.
  const fn = appSrc.slice(appSrc.indexOf("function getScoreState"), appSrc.indexOf("function getScoreState") + 600);
  assert.ok(/decisionScoreFrom\(item\)\s*\?\?\s*officialScoreFrom\(item\)\s*\?\?\s*dossierScoreFrom\(item\)/.test(fn),
    "getScoreState doit suivre la priorité decisionScore → officialScore → brut");
  assert.ok(appSrc.includes("function decisionScoreFrom"), "helper decisionScoreFrom requis");
  assert.ok(appSrc.includes("source?.plan?.decisionScore"), "decisionScoreFrom lit plan.decisionScore");
});

test("affichage — un 'Pas de trade' à brut élevé explique le blocage", () => {
  const appSrc = readFileSync(path.join(REPO, "assets", "app.js"), "utf8");
  const fn = appSrc.slice(appSrc.indexOf("function opportunityScoreExplain"), appSrc.indexOf("function opportunityScoreExplain") + 900);
  // Branche pas_de_trade + brut >= 65 → message "Score brut élevé … bloqué par".
  assert.ok(fn.includes("pas_de_trade"), "doit traiter le cas Pas de trade");
  assert.ok(/brut\s*>=\s*65/.test(fn), "doit détecter un score brut élevé (>=65)");
  assert.ok(fn.includes("Score brut élevé"), "doit afficher 'Score brut élevé' + raison");
  assert.ok(fn.includes("bloqué par"), "doit nommer le blocage");
});

test("affichage — un trade exploration est étiqueté décision/sûreté/taille réduite", () => {
  const appSrc = readFileSync(path.join(REPO, "assets", "app.js"), "utf8");
  const fn = appSrc.slice(appSrc.indexOf("function opportunityScoreExplain"), appSrc.indexOf("function opportunityScoreExplain") + 900);
  assert.ok(fn.includes("rowIsExploration(item)"), "doit détecter l'exploration");
  assert.ok(fn.includes("Trade exploration"), "doit afficher 'Trade exploration'");
  assert.ok(fn.includes("taille réduite"), "doit préciser taille réduite (pas pleine confiance)");
});

test("affichage — le détail des scores (décision/sûreté/brut/confirmations/blocage) est rendu", () => {
  const appSrc = readFileSync(path.join(REPO, "assets", "app.js"), "utf8");
  const fn = appSrc.slice(appSrc.indexOf("function renderScoreBreakdown"), appSrc.indexOf("function renderScoreBreakdown") + 700);
  for (const lbl of ["Décision", "Sûreté", "Brut", "Confirmations", "Blocage"]) {
    assert.ok(fn.includes(lbl), `le détail doit afficher '${lbl}'`);
  }
  assert.ok(fn.includes("safeText(blocker)"), "le libellé de blocage doit être échappé (safeText)");
  // Le VM expose et les deux cartes (mobile + desktop) rendent ces blocs.
  assert.ok(appSrc.includes("scoreExplain: opportunityScoreExplain("), "le VM expose scoreExplain");
  assert.ok(appSrc.includes("scoreBreakdownHtml: renderScoreBreakdown("), "le VM expose scoreBreakdownHtml");
  assert.equal((appSrc.match(/\$\{vm\.scoreBreakdownHtml\}/g) || []).length, 2,
    "le détail doit être rendu dans les 2 cartes (mobile + desktop)");
  assert.equal((appSrc.match(/safeText\(vm\.scoreExplain\)/g) || []).length, 2,
    "l'explication doit être rendue dans les 2 cartes (mobile + desktop)");
});
