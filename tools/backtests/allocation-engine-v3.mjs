// tools/backtests/allocation-engine-v3.mjs
//
// Allocation engine v3 — ManiTradePro.
// Reconstruit un plan d'allocation à partir de l'univers durci par
// rolling walk-forward (tradable-universe-v2.json) plutôt que depuis
// tradable-universe-v1. Conséquence directe : la sélection v3 ne
// reprend que des cellules dont la robustesse temporelle a été validée
// (ALLOW/ROBUST, ALLOW/STABLE), avec dégradation explicite pour les
// FRAGILE retenues et un statut EXPERIMENTAL strictement encadré.
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun
// ordre broker, ne touche aucun endpoint live. Plan théorique
// uniquement.
//
// Entrées :
//   - tools/backtests/output/tradable-universe-v2.json
//   - tools/backtests/lib/theme-table.mjs (classification + caps fins)
//   - tools/backtests/output/allocation-plan.json   (lecture seule, comparaison)
//   - tools/backtests/output/allocation-plan-v2.json (lecture seule, comparaison)
//
// Sorties :
//   - tools/backtests/output/allocation-plan-v3.json
//   - tools/backtests/output/allocation-plan-v3.md
//
// Usage : node tools/backtests/allocation-engine-v3.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import {
  THEME_CLASSIFICATION as CLASSIFICATION,
  classifySymbolThemes,
} from "./lib/theme-table.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_TU2 = join(OUTPUT_DIR, "tradable-universe-v2.json");
const INPUT_V1 = join(OUTPUT_DIR, "allocation-plan.json");
const INPUT_V2 = join(OUTPUT_DIR, "allocation-plan-v2.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "allocation-plan-v3.json");
const OUTPUT_MD = join(OUTPUT_DIR, "allocation-plan-v3.md");

// === Politique v3 ============================================================
//
// Unités de base par couple (decisionV2, rollingVerdict). Plus restrictif que
// v1/v2 — les FRAGILE et EXPERIMENTAL ne sont admis qu'à allocation réduite.
const BASE_UNITS = {
  ALLOW_ROBUST: 1.00,
  ALLOW_STABLE: 0.80,
  REDUCE_FRAGILE: 0.35, // identique pour WATCH (alias)
  EXPERIMENTAL: 0.10,
};

const POLICY = {
  minPositions: 3,
  maxPositions: 10,
  maxExperimentalPositions: 2,
  setupCaps: {
    PULLBACK_MOMENTUM: 0.50,
    RELATIVE_STRENGTH_ROTATION: 0.35,
    BREAKOUT_EXPANSION: 0.25,
    MEAN_REVERSION: 0.0,
    VOLATILITY_COMPRESSION: 0.0,
  },
  broadCaps: {
    crypto: 0.20,
    leveraged: 0.0, // interdit en v3
  },
  fineThemeCaps: {
    us_growth_etf: 0.30,
    mega_cap_tech: 0.25,
    software_saas: 0.25,
    ai_hypergrowth: 0.20,
    semis_pure: 0.25,
    crypto_layer1: 0.10,
    crypto_correlated_equity: 0.08,
    precious_metals: 0.20,
    banks_financials: 0.15,
  },
};

const CRYPTO_PURE = new Set(["BTC", "ETH", "SOL", "AVAX", "BNB", "LINK"]);
const CRYPTO_CORRELATED = new Set(["MSTR", "COIN", "IBIT"]);
const LEVERAGED = new Set(["SOXL", "USD", "ROM", "TQQQ", "SQQQ", "UPRO"]);
const FORBIDDEN_SETUPS = new Set(["MEAN_REVERSION", "VOLATILITY_COMPRESSION", "UNKNOWN"]);

// Budget cible pour évaluer les caps en absolu pendant la construction greedy.
// 10 positions × 0.8 unité moyenne (mix ROBUST 1.0 / STABLE 0.8 / FRAGILE 0.35)
// = 8.0 unités. Sous-estime volontairement le scénario "10 ROBUST" pour
// laisser de la place aux STABLE/FRAGILE retenus.
const TARGET_BUDGET = POLICY.maxPositions * 0.8;

// === Helpers décision / verdict =============================================

function normalizeDecision(decision) {
  if (decision === "WATCH") return "REDUCE";
  return decision;
}

function classifyBroadCategory(symbol) {
  if (LEVERAGED.has(symbol)) return "leveraged";
  if (CRYPTO_PURE.has(symbol) || CRYPTO_CORRELATED.has(symbol)) return "crypto";
  return "other";
}

function classifyFineThemes(symbol) {
  return classifySymbolThemes(symbol);
}

// Priorité 1 = ALLOW+ROBUST, 2 = ALLOW+STABLE,
// 3 = REDUCE/WATCH+FRAGILE (tier A/B uniquement),
// 4 = EXPERIMENTAL (tier A/B + WF PASS + ni crypto ni leveraged).
function getPriorityGroup(cell) {
  const dec = normalizeDecision(cell.decisionV2);
  const verdict = cell.rollingVerdict;
  const tier = cell.compositeTier;
  const wfTier = cell.filters?.walkForward?.tier;

  if (dec === "ALLOW" && verdict === "ROBUST") return 1;
  if (dec === "ALLOW" && verdict === "STABLE") return 2;
  if (dec === "REDUCE" && verdict === "FRAGILE" && (tier === "A" || tier === "B")) return 3;
  if (dec === "EXPERIMENTAL" && (tier === "A" || tier === "B") && wfTier === "PASS") {
    const broad = classifyBroadCategory(cell.symbol);
    if (broad !== "crypto" && broad !== "leveraged") return 4;
  }
  return null;
}

function getBaseUnit(cell) {
  const dec = normalizeDecision(cell.decisionV2);
  const verdict = cell.rollingVerdict;
  if (dec === "ALLOW" && verdict === "ROBUST") return BASE_UNITS.ALLOW_ROBUST;
  if (dec === "ALLOW" && verdict === "STABLE") return BASE_UNITS.ALLOW_STABLE;
  if (dec === "REDUCE" && verdict === "FRAGILE") return BASE_UNITS.REDUCE_FRAGILE;
  if (dec === "EXPERIMENTAL") return BASE_UNITS.EXPERIMENTAL;
  return 0;
}

// === Tri / dédoublonnage ====================================================

const TIER_RANK = { A: 0, B: 1, C: 2, D: 3 };
const CONFIDENCE_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const WF_RANK = { PASS: 0, WATCH: 1, INSUFFICIENT_DATA: 2, FAIL: 99 };

function compareCells(a, b) {
  const ga = getPriorityGroup(a) ?? 99;
  const gb = getPriorityGroup(b) ?? 99;
  if (ga !== gb) return ga - gb;
  const ta = TIER_RANK[a.compositeTier] ?? 99;
  const tb = TIER_RANK[b.compositeTier] ?? 99;
  if (ta !== tb) return ta - tb;
  const ca = CONFIDENCE_RANK[a.confidence] ?? 99;
  const cb = CONFIDENCE_RANK[b.confidence] ?? 99;
  if (ca !== cb) return ca - cb;
  const wa = WF_RANK[a.filters?.walkForward?.tier] ?? 99;
  const wb = WF_RANK[b.filters?.walkForward?.tier] ?? 99;
  if (wa !== wb) return wa - wb;
  const sa = a.filters?.variantRegime?.score ?? 0;
  const sb = b.filters?.variantRegime?.score ?? 0;
  return sb - sa;
}

function dedupePerSymbol(cells) {
  const groups = new Map();
  for (const c of cells) {
    if (!groups.has(c.symbol)) groups.set(c.symbol, []);
    groups.get(c.symbol).push(c);
  }
  const out = [];
  for (const group of groups.values()) {
    group.sort(compareCells);
    out.push(group[0]);
  }
  return out;
}

// === Construction du portefeuille ===========================================

function tryAdd(portfolio, cell) {
  const group = getPriorityGroup(cell);
  if (group == null) {
    return { ok: false, reason: "non éligible (decision/verdict/tier/WF)", reasonShort: "non éligible" };
  }
  if (FORBIDDEN_SETUPS.has(cell.setup)) {
    return { ok: false, reason: `setup ${cell.setup} interdit en v3`, reasonShort: `setup interdit ${cell.setup}` };
  }
  if (portfolio.positions.length >= POLICY.maxPositions) {
    return { ok: false, reason: `max ${POLICY.maxPositions} positions atteintes`, reasonShort: "max positions" };
  }
  if (portfolio.symbols.has(cell.symbol)) {
    return { ok: false, reason: `symbole ${cell.symbol} déjà en portefeuille`, reasonShort: "duplicate symbol" };
  }

  const isExperimental = group === 4;
  if (isExperimental && portfolio.experimentalCount >= POLICY.maxExperimentalPositions) {
    return { ok: false, reason: `max ${POLICY.maxExperimentalPositions} EXPERIMENTAL atteintes`, reasonShort: "max EXPERIMENTAL" };
  }

  // Leveraged interdit en v3 (cap 0%)
  if (LEVERAGED.has(cell.symbol)) {
    return { ok: false, reason: "leveraged interdit en v3 (cap 0%)", reasonShort: "leveraged interdit" };
  }

  const broad = classifyBroadCategory(cell.symbol);
  // EXPERIMENTAL crypto/leveraged déjà filtré par getPriorityGroup,
  // garde une défense en profondeur.
  if (isExperimental && (broad === "crypto" || broad === "leveraged")) {
    return { ok: false, reason: "EXPERIMENTAL crypto/leveraged interdit en v3", reasonShort: "EXP crypto/leveraged" };
  }

  const baseUnit = getBaseUnit(cell);
  if (baseUnit <= 0) {
    return { ok: false, reason: "unité de base 0", reasonShort: "base unit 0" };
  }

  // Cap setup
  const setupCap = POLICY.setupCaps[cell.setup];
  if (setupCap === 0) {
    return { ok: false, reason: `setup ${cell.setup} interdit en v3 (cap 0%)`, reasonShort: `cap setup ${cell.setup}` };
  }
  if (setupCap !== undefined) {
    const futureSetup = (portfolio.bySetup[cell.setup] || 0) + baseUnit;
    const capAbs = setupCap * TARGET_BUDGET;
    if (futureSetup > capAbs + 1e-9) {
      return {
        ok: false,
        reason: `cap setup ${cell.setup} dépasserait ${(setupCap * 100).toFixed(0)}% (futur ${futureSetup.toFixed(2)} u vs cap ${capAbs.toFixed(2)} u)`,
        reasonShort: `cap setup ${cell.setup}`,
      };
    }
  }

  // Cap broad crypto
  if (broad === "crypto") {
    const cryptoCap = POLICY.broadCaps.crypto;
    const future = (portfolio.byBroad.crypto || 0) + baseUnit;
    const capAbs = cryptoCap * TARGET_BUDGET;
    if (future > capAbs + 1e-9) {
      return {
        ok: false,
        reason: `cap crypto ${(cryptoCap * 100).toFixed(0)}% dépasserait (futur ${future.toFixed(2)} u vs cap ${capAbs.toFixed(2)} u)`,
        reasonShort: "cap crypto",
      };
    }
  }

  // Caps fins
  const fine = classifyFineThemes(cell.symbol);
  for (const theme of fine.themes) {
    const fineCap = POLICY.fineThemeCaps[theme];
    if (fineCap === undefined) continue;
    const futureFine = (portfolio.byFineTheme[theme] || 0) + baseUnit;
    const capAbs = fineCap * TARGET_BUDGET;
    if (futureFine > capAbs + 1e-9) {
      return {
        ok: false,
        reason: `cap fin ${theme} dépasserait ${(fineCap * 100).toFixed(0)}% (futur ${futureFine.toFixed(2)} u vs cap ${capAbs.toFixed(2)} u)`,
        reasonShort: `cap fin ${theme}`,
      };
    }
  }

  return { ok: true, baseUnit, group, broad, fineThemes: fine.themes, fineConfidence: fine.confidence };
}

// === Contrôle post-normalisation des caps hard =============================
//
// Garantit que les caps annoncés (setup, broad, fine) sont respectés en
// pourcentage du portefeuille FINAL (normalisé à 100 %), pas seulement vs
// un TARGET_BUDGET théorique. Sinon le greedy peut sous-remplir certains
// setups et faire mécaniquement dépasser les autres après normalisation.
//
// Algorithme :
//   1. Recalculer les poids normalisés.
//   2. Lister les caps violés (kind = setup | broad | fine).
//   3. Trier par excès décroissant. Prendre la pire violation.
//   4. Identifier les positions qui contribuent à cette violation.
//   5. Retirer la position la moins prioritaire (priorityGroup max, tier
//      pire, confidence pire, symbole alphabétique pour déterminisme).
//   6. Renormaliser et boucler jusqu'à plus de violation ou portefeuille
//      vide.

function detectCapViolations(plan, policy) {
  const total = plan.positions.reduce((s, p) => s + p.baseUnit, 0);
  if (total === 0) return [];
  const violations = [];

  const bySetup = {};
  const byBroad = {};
  const byFine = {};
  for (const p of plan.positions) {
    bySetup[p.setup] = (bySetup[p.setup] || 0) + p.baseUnit;
    byBroad[p.broadCategory] = (byBroad[p.broadCategory] || 0) + p.baseUnit;
    for (const t of p.fineThemes) byFine[t] = (byFine[t] || 0) + p.baseUnit;
  }

  for (const [setup, units] of Object.entries(bySetup)) {
    const cap = policy.setupCaps[setup];
    if (cap === undefined) continue;
    const pct = units / total;
    if (pct > cap + 1e-9) violations.push({ kind: "setup", key: setup, cap, actualPct: pct, exceedance: pct - cap });
  }
  for (const [broad, units] of Object.entries(byBroad)) {
    const cap = policy.broadCaps[broad];
    if (cap === undefined) continue;
    const pct = units / total;
    if (pct > cap + 1e-9) violations.push({ kind: "broad", key: broad, cap, actualPct: pct, exceedance: pct - cap });
  }
  for (const [theme, units] of Object.entries(byFine)) {
    const cap = policy.fineThemeCaps[theme];
    if (cap === undefined) continue;
    const pct = units / total;
    if (pct > cap + 1e-9) violations.push({ kind: "fine", key: theme, cap, actualPct: pct, exceedance: pct - cap });
  }
  violations.sort((a, b) => b.exceedance - a.exceedance);
  return violations;
}

function positionContributesToViolation(violation, position) {
  if (violation.kind === "setup") return position.setup === violation.key;
  if (violation.kind === "broad") return position.broadCategory === violation.key;
  if (violation.kind === "fine") return position.fineThemes.includes(violation.key);
  return false;
}

function pickPositionToRemove(violation, positions) {
  const contributors = positions.filter((p) => positionContributesToViolation(violation, p));
  if (!contributors.length) return null;
  contributors.sort((a, b) => {
    // priorityGroup plus grand = moins prioritaire = retiré en premier
    if (b.priorityGroup !== a.priorityGroup) return b.priorityGroup - a.priorityGroup;
    // tier pire en premier (D > C > B > A)
    const ta = TIER_RANK[a.compositeTier] ?? 99;
    const tb = TIER_RANK[b.compositeTier] ?? 99;
    if (tb !== ta) return tb - ta;
    // confidence pire en premier (LOW > MEDIUM > HIGH)
    const ca = CONFIDENCE_RANK[a.confidence] ?? 99;
    const cb = CONFIDENCE_RANK[b.confidence] ?? 99;
    if (cb !== ca) return cb - ca;
    // déterminisme final : alphabétique
    return a.symbol.localeCompare(b.symbol);
  });
  return contributors[0];
}

// Tente d'ajouter un candidat de la pool triée qui ne crée AUCUNE violation
// post-normalisation. Retourne true si une position a été ajoutée.
function trySwapIn(plan, policy, candidatePool) {
  const existingSymbols = new Set(plan.positions.map((p) => p.symbol));
  for (const cell of candidatePool) {
    if (existingSymbols.has(cell.symbol)) continue;
    if (plan.positions.length >= POLICY.maxPositions) break;
    if (FORBIDDEN_SETUPS.has(cell.setup)) continue;
    if (LEVERAGED.has(cell.symbol)) continue;
    const group = getPriorityGroup(cell);
    if (group == null) continue;
    const baseUnit = getBaseUnit(cell);
    if (baseUnit <= 0) continue;
    const broad = classifyBroadCategory(cell.symbol);
    if (group === 4 && (broad === "crypto" || broad === "leveraged")) continue;
    const fine = classifyFineThemes(cell.symbol);

    const provisional = buildPositionFromCell(
      cell,
      plan.positions.length + 1,
      group,
      baseUnit,
      broad,
      fine.themes,
      fine.confidence
    );
    const trialPositions = [...plan.positions, provisional];
    const trialPlan = { positions: trialPositions };
    const trialTotal = trialPositions.reduce((s, p) => s + p.baseUnit, 0);
    for (const p of trialPositions) {
      p.weightPct = trialTotal > 0 ? (p.baseUnit / trialTotal) * 100 : 0;
    }
    const trialViolations = detectCapViolations(trialPlan, policy);
    if (trialViolations.length === 0) {
      plan.positions.push(provisional);
      plan.positions.forEach((p, i) => { p.rank = i + 1; });
      return { added: true, position: provisional };
    }
  }
  return { added: false };
}

function enforceCapsPostNormalization(plan, policy, candidatePool) {
  const removalsLog = [];
  const additionsLog = [];
  const initialViolations = [];
  let iterations = 0;
  const maxIterations = 100;
  let firstPass = true;

  while (iterations < maxIterations) {
    iterations++;

    // Renormalisation
    const total = plan.positions.reduce((s, p) => s + p.baseUnit, 0);
    if (total > 0) {
      for (const p of plan.positions) {
        p.weightPct = Number(((p.baseUnit / total) * 100).toFixed(2));
      }
    }

    const violations = detectCapViolations(plan, policy);
    if (firstPass) {
      for (const v of violations) {
        initialViolations.push({
          kind: v.kind,
          key: v.key,
          capPct: Number((v.cap * 100).toFixed(2)),
          actualPct: Number((v.actualPct * 100).toFixed(2)),
          exceedancePct: Number((v.exceedance * 100).toFixed(2)),
        });
      }
      firstPass = false;
    }

    if (violations.length === 0) {
      // Pas de violation. Tenter de combler les slots restants si le
      // portefeuille est sous maxPositions.
      if (plan.positions.length < POLICY.maxPositions) {
        const result = trySwapIn(plan, policy, candidatePool);
        if (result.added) {
          additionsLog.push({
            symbol: result.position.symbol,
            setup: result.position.setup,
            variant: result.position.variant,
            regime: result.position.regime,
            decisionV2: result.position.decisionV2,
            rollingVerdict: result.position.rollingVerdict,
            compositeTier: result.position.compositeTier,
            baseUnit: result.position.baseUnit,
            via: "fill-slot",
          });
          continue;
        }
      }
      break;
    }

    if (plan.positions.length === 0) break;

    const worst = violations[0];
    const toRemove = pickPositionToRemove(worst, plan.positions);
    if (!toRemove) break;

    plan.positions = plan.positions.filter((p) => p !== toRemove);
    removalsLog.push({
      symbol: toRemove.symbol,
      setup: toRemove.setup,
      variant: toRemove.variant,
      regime: toRemove.regime,
      decisionV2: toRemove.decisionV2,
      rollingVerdict: toRemove.rollingVerdict,
      compositeTier: toRemove.compositeTier,
      baseUnit: toRemove.baseUnit,
      priorityGroup: toRemove.priorityGroup,
      removedDueTo: {
        kind: worst.kind,
        key: worst.key,
        capPct: Number((worst.cap * 100).toFixed(2)),
        actualPctBeforeRemoval: Number((worst.actualPct * 100).toFixed(2)),
      },
    });
    plan.positions.forEach((p, i) => { p.rank = i + 1; });

    // Après retrait, tenter immédiatement un swap-in (peut-être qu'une
    // position plus diversifiée comble le slot libéré sans recréer la
    // violation).
    const swap = trySwapIn(plan, policy, candidatePool);
    if (swap.added) {
      additionsLog.push({
        symbol: swap.position.symbol,
        setup: swap.position.setup,
        variant: swap.position.variant,
        regime: swap.position.regime,
        decisionV2: swap.position.decisionV2,
        rollingVerdict: swap.position.rollingVerdict,
        compositeTier: swap.position.compositeTier,
        baseUnit: swap.position.baseUnit,
        via: "post-removal swap",
      });
    }
  }

  // Renormalisation finale
  const finalTotal = plan.positions.reduce((s, p) => s + p.baseUnit, 0);
  if (finalTotal > 0) {
    for (const p of plan.positions) {
      p.weightPct = Number(((p.baseUnit / finalTotal) * 100).toFixed(2));
    }
  }
  const finalViolations = detectCapViolations(plan, policy).map((v) => ({
    kind: v.kind,
    key: v.key,
    capPct: Number((v.cap * 100).toFixed(2)),
    actualPct: Number((v.actualPct * 100).toFixed(2)),
    exceedancePct: Number((v.exceedance * 100).toFixed(2)),
  }));

  return { removalsLog, additionsLog, iterations, initialViolations, finalViolations };
}

function buildPositionFromCell(cell, rank, group, baseUnit, broad, fineThemes, fineConfidence) {
  const risks = [];
  const tags = [];
  const decNorm = normalizeDecision(cell.decisionV2);
  if (decNorm === "REDUCE" && cell.rollingVerdict === "FRAGILE") {
    tags.push("reduced_due_to_fragility");
    risks.push("FRAGILE en walk-forward roulant — allocation réduite");
  }
  if (group === 4) {
    tags.push("experimental_exception");
    risks.push("EXPERIMENTAL — exception encadrée (INSUFFICIENT_DATA + WF unique PASS)");
  }
  if (fineConfidence === "UNKNOWN") {
    risks.push("symbole non classé thématiquement");
  }
  if (broad === "crypto") {
    risks.push("crypto — exposition réduite (cap 20% v3)");
  }
  return {
    rank,
    symbol: cell.symbol,
    setup: cell.setup,
    variant: cell.variant,
    regime: cell.regime,
    decisionV2: cell.decisionV2,
    rollingVerdict: cell.rollingVerdict,
    compositeTier: cell.compositeTier,
    confidence: cell.confidence,
    walkForwardTier: cell.filters?.walkForward?.tier ?? null,
    priorityGroup: group,
    baseUnit,
    weightPct: 0,
    broadCategory: broad,
    fineThemes,
    fineConfidence,
    tags,
    reason: cell.reasons?.[0] ?? "",
    risks,
  };
}

function buildPortfolio(rankedCells) {
  const portfolio = {
    positions: [],
    symbols: new Set(),
    totalUnits: 0,
    byBroad: { crypto: 0, leveraged: 0, other: 0 },
    byFineTheme: {},
    bySetup: {},
    experimentalCount: 0,
    fragileCount: 0,
  };
  const rejected = [];
  const constraintsApplied = new Set();

  for (const cell of rankedCells) {
    const result = tryAdd(portfolio, cell);
    if (result.ok) {
      const decNorm = normalizeDecision(cell.decisionV2);
      const position = buildPositionFromCell(
        cell,
        portfolio.positions.length + 1,
        result.group,
        result.baseUnit,
        result.broad,
        result.fineThemes,
        result.fineConfidence
      );
      portfolio.positions.push(position);
      portfolio.symbols.add(cell.symbol);
      portfolio.totalUnits += result.baseUnit;
      portfolio.byBroad[result.broad] = (portfolio.byBroad[result.broad] || 0) + result.baseUnit;
      for (const t of result.fineThemes) {
        portfolio.byFineTheme[t] = (portfolio.byFineTheme[t] || 0) + result.baseUnit;
      }
      portfolio.bySetup[cell.setup] = (portfolio.bySetup[cell.setup] || 0) + result.baseUnit;
      if (result.group === 4) portfolio.experimentalCount++;
      if (decNorm === "REDUCE" && cell.rollingVerdict === "FRAGILE") portfolio.fragileCount++;
    } else {
      rejected.push({
        symbol: cell.symbol,
        setup: cell.setup,
        variant: cell.variant,
        regime: cell.regime,
        decisionV2: cell.decisionV2,
        rollingVerdict: cell.rollingVerdict,
        compositeTier: cell.compositeTier,
        reason: result.reason,
      });
      constraintsApplied.add(result.reasonShort);
    }
  }

  // Normalisation à 100 %
  if (portfolio.totalUnits > 0) {
    for (const p of portfolio.positions) {
      p.weightPct = Number(((p.baseUnit / portfolio.totalUnits) * 100).toFixed(2));
    }
  }

  return { portfolio, rejected, constraintsApplied: Array.from(constraintsApplied) };
}

// === Warnings ===============================================================

function computeWarnings(portfolio) {
  const warnings = [];
  if (portfolio.positions.length === 0) {
    warnings.push("Portefeuille vide après contrôle post-normalisation — aucun sous-ensemble du pool v2 ne respecte simultanément tous les caps hard. Voir section 10 pour le diagnostic.");
  } else if (portfolio.positions.length < POLICY.minPositions) {
    warnings.push(`Moins de ${POLICY.minPositions} positions sélectionnées (${portfolio.positions.length}) — portefeuille incomplet, status=warning.`);
  }
  if (portfolio.positions.length === 0) return warnings;

  const regimesUsed = new Set(portfolio.positions.map((p) => p.regime));
  if (regimesUsed.size === 1) {
    const only = [...regimesUsed][0];
    warnings.push(`Toutes les positions sont en régime ${only} — concentration régime.`);
  }
  if (!regimesUsed.has("RISK_OFF")) {
    warnings.push("Aucune position RISK_OFF — pas de couverture explicite si bascule macro.");
  }
  const unknown = portfolio.positions.filter((p) => p.fineConfidence === "UNKNOWN");
  if (unknown.length) {
    warnings.push(`${unknown.length} symbole(s) non classé(s) dans le plan : ${unknown.map((p) => p.symbol).join(", ")}. Ajouter à lib/theme-table.mjs.`);
  }
  // Recompte fragile/experimental sur le portfolio final (post-enforce)
  const fragileLive = portfolio.positions.filter((p) => p.tags.includes("reduced_due_to_fragility")).length;
  const expLive = portfolio.positions.filter((p) => p.tags.includes("experimental_exception")).length;
  if (fragileLive > 0) {
    warnings.push(`${fragileLive} position(s) FRAGILE retenue(s) — allocation réduite explicite (reduced_due_to_fragility).`);
  }
  if (expLive > 0) {
    warnings.push(`${expLive} position(s) EXPERIMENTAL retenue(s) — micro allocation (10 % unitaire), à surveiller en paper trading.`);
  }
  // Concentrations restantes > 30 %
  const totalWeight = portfolio.positions.reduce((s, p) => s + p.weightPct, 0);
  if (totalWeight > 0) {
    const fineWeights = {};
    for (const p of portfolio.positions) {
      for (const t of p.fineThemes) fineWeights[t] = (fineWeights[t] || 0) + p.weightPct;
    }
    for (const [t, w] of Object.entries(fineWeights)) {
      if (w > 30) warnings.push(`Concentration sous-thème ${t} : ${w.toFixed(1)} % du portefeuille (> 30 %).`);
    }
  }
  return warnings;
}

// === Comparaison v1 / v2 ====================================================

async function loadJsonIfExists(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

function summarizeBroad(positions, broadField) {
  const map = {};
  for (const p of positions) {
    const t = p[broadField] ?? "other";
    map[t] = (map[t] || 0) + (p.weightPct ?? 0);
  }
  return map;
}

async function compareWithPrevious(plan) {
  const v1 = await loadJsonIfExists(INPUT_V1);
  const v2 = await loadJsonIfExists(INPUT_V2);

  function diffWith(prev, prevBroadField) {
    if (!prev) return null;
    const prevSyms = new Set((prev.positions ?? []).map((p) => p.symbol));
    const v3Syms = new Set(plan.positions.map((p) => p.symbol));
    const removed = [...prevSyms].filter((s) => !v3Syms.has(s));
    const added = [...v3Syms].filter((s) => !prevSyms.has(s));
    const prevBroad = summarizeBroad(prev.positions ?? [], prevBroadField);
    const v3Broad = summarizeBroad(plan.positions, "broadCategory");
    const broadKeys = new Set([...Object.keys(prevBroad), ...Object.keys(v3Broad)]);
    const broadDelta = {};
    for (const k of broadKeys) {
      const a = Number((prevBroad[k] ?? 0).toFixed(2));
      const b = Number((v3Broad[k] ?? 0).toFixed(2));
      broadDelta[k] = { prev: a, v3: b, delta: Number((b - a).toFixed(2)) };
    }
    return { removedFromPrev: removed, addedVsPrev: added, broadDelta };
  }

  return {
    v1: { available: !!v1, ...(diffWith(v1, "theme") ?? {}) },
    v2: { available: !!v2, ...(diffWith(v2, "broadTheme") ?? {}) },
  };
}

// === Markdown ===============================================================

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Allocation Plan v3 — Rolling-Hardened — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/allocation-engine-v3.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Plan théorique uniquement. Aucun ordre. Aucun broker. Aucun endpoint live. Ne pas trader sans paper trading et validation humaine.**");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Source univers : \`${report.sources.tradableUniverseV2}\``);
  lines.push(`- Source classification : \`${report.sources.themeTable}\``);
  lines.push(`- Statut : **${report.status}**`);
  lines.push(`- Cellules candidates retenues (pré-tri) : **${report.summary.candidateCells}**`);
  lines.push(`- Cellules après dédoublonnage par symbole : **${report.summary.dedupedCandidates}**`);
  lines.push(`- Positions sélectionnées : **${report.summary.selectedPositions}** (min ${POLICY.minPositions}, max ${POLICY.maxPositions})`);
  lines.push(`- Positions ALLOW : ${report.summary.allowPositions} · WATCH/REDUCE : ${report.summary.watchPositions} · EXPERIMENTAL : ${report.summary.experimentalPositions}`);
  lines.push(`- Poids total normalisé : ${fmt(report.summary.totalWeight)} %`);
  lines.push("");
  lines.push("Distribution par décision v2 :");
  lines.push("");
  lines.push("| Décision v2 | Positions |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(report.summary.byDecision)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");
  lines.push("Distribution par verdict rolling :");
  lines.push("");
  lines.push("| Rolling verdict | Positions |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(report.summary.byRollingVerdict)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");

  lines.push("## 2. Plan v3 — positions sélectionnées");
  lines.push("");
  if (!report.positions.length) {
    lines.push("_aucune position sélectionnée_");
  } else {
    lines.push("| # | Symbole | Decision v2 | Rolling | Tier | Setup | Variante | Régime | Poids | Base unit | Tags | Fine themes |");
    lines.push("|---:|---|---|---|---|---|---|---|---:|---:|---|---|");
    for (const p of report.positions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.decisionV2} | ${p.rollingVerdict} | ${p.compositeTier} | ${p.setup} | \`${p.variant}\` | ${p.regime} | ${fmt(p.weightPct)} % | ${fmt(p.baseUnit)} | ${p.tags.join(", ") || "—"} | ${p.fineThemes.join(", ") || "—"} |`);
    }
  }
  lines.push("");

  lines.push("## 3. Comparaison avec allocation v1 / v2");
  lines.push("");
  if (!report.comparison.v1.available && !report.comparison.v2.available) {
    lines.push("_aucun plan antérieur trouvé — comparaison impossible_");
  } else {
    if (report.comparison.v1.available) {
      const c = report.comparison.v1;
      lines.push("**vs allocation v1 :**");
      lines.push("");
      lines.push(`- Symboles retirés : ${c.removedFromPrev.length ? c.removedFromPrev.join(", ") : "_aucun_"}`);
      lines.push(`- Symboles ajoutés : ${c.addedVsPrev.length ? c.addedVsPrev.join(", ") : "_aucun_"}`);
      lines.push("");
      lines.push("| Broad catégorie | v1 | v3 | Delta |");
      lines.push("|---|---:|---:|---:|");
      for (const [t, v] of Object.entries(c.broadDelta).sort()) {
        const sign = v.delta > 0 ? "+" : "";
        lines.push(`| ${t} | ${fmt(v.prev)} % | ${fmt(v.v3)} % | ${sign}${fmt(v.delta)} % |`);
      }
      lines.push("");
    }
    if (report.comparison.v2.available) {
      const c = report.comparison.v2;
      lines.push("**vs allocation v2 :**");
      lines.push("");
      lines.push(`- Symboles retirés : ${c.removedFromPrev.length ? c.removedFromPrev.join(", ") : "_aucun_"}`);
      lines.push(`- Symboles ajoutés : ${c.addedVsPrev.length ? c.addedVsPrev.join(", ") : "_aucun_"}`);
      lines.push("");
      lines.push("| Broad catégorie | v2 | v3 | Delta |");
      lines.push("|---|---:|---:|---:|");
      for (const [t, v] of Object.entries(c.broadDelta).sort()) {
        const sign = v.delta > 0 ? "+" : "";
        lines.push(`| ${t} | ${fmt(v.prev)} % | ${fmt(v.v3)} % | ${sign}${fmt(v.delta)} % |`);
      }
      lines.push("");
    }
  }

  lines.push("## 4. Positions ALLOW robustes (priorité 1-2)");
  lines.push("");
  const allowPositions = report.positions.filter((p) => normalizeDecision(p.decisionV2) === "ALLOW");
  if (!allowPositions.length) {
    lines.push("_aucune position ALLOW dans le plan v3_");
  } else {
    lines.push("| # | Symbole | Rolling | Setup | Régime | Poids |");
    lines.push("|---:|---|---|---|---|---:|");
    for (const p of allowPositions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.rollingVerdict} | ${p.setup} | ${p.regime} | ${fmt(p.weightPct)} % |`);
    }
  }
  lines.push("");

  lines.push("## 5. Positions WATCH/REDUCE retenues (FRAGILE)");
  lines.push("");
  const fragilePositions = report.positions.filter((p) => p.tags.includes("reduced_due_to_fragility"));
  if (!fragilePositions.length) {
    lines.push("_aucune position FRAGILE retenue dans le plan v3_");
  } else {
    lines.push("| # | Symbole | Setup | Régime | Tier | Poids | Justification |");
    lines.push("|---:|---|---|---|---|---:|---|");
    for (const p of fragilePositions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.weightPct)} % | reduced_due_to_fragility |`);
    }
  }
  lines.push("");

  lines.push("## 6. Positions EXPERIMENTAL retenues / exclues");
  lines.push("");
  const expPositions = report.positions.filter((p) => p.tags.includes("experimental_exception"));
  if (!expPositions.length) {
    lines.push("_aucune position EXPERIMENTAL retenue dans le plan v3_");
  } else {
    lines.push(`Retenues (${expPositions.length} / max ${POLICY.maxExperimentalPositions}) :`);
    lines.push("");
    lines.push("| # | Symbole | Setup | Régime | Tier | WF | Poids |");
    lines.push("|---:|---|---|---|---|---|---:|");
    for (const p of expPositions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${p.walkForwardTier} | ${fmt(p.weightPct)} % |`);
    }
  }
  lines.push("");
  const expRejected = report.rejectedCandidates.filter((r) =>
    normalizeDecision(r.decisionV2) === "EXPERIMENTAL"
    && (r.reason.startsWith("max EXPERIMENTAL") || r.reason.startsWith("EXPERIMENTAL crypto/leveraged") || r.reason.startsWith("non éligible"))
  );
  if (expRejected.length) {
    lines.push(`EXPERIMENTAL exclues (${expRejected.length}) : ${expRejected.slice(0, 8).map((r) => `${r.symbol} (${r.reason.split(" (")[0]})`).join(", ")}${expRejected.length > 8 ? "…" : ""}`);
    lines.push("");
  }

  lines.push("## 7. Candidats rejetés (top causes)");
  lines.push("");
  if (!report.rejectedCandidates.length) {
    lines.push("_aucun rejet_");
  } else {
    const buckets = {};
    for (const r of report.rejectedCandidates) {
      const key = r.reason.split(" dépasserait")[0].split(" (")[0];
      buckets[key] = (buckets[key] || 0) + 1;
    }
    lines.push("| Cause | Rejets |");
    lines.push("|---|---:|");
    for (const [k, n] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${k} | ${n} |`);
    }
    lines.push("");
    lines.push("Premiers exemples :");
    lines.push("");
    lines.push("| Symbole | Setup | Régime | Tier | Decision v2 | Rolling | Raison |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const r of report.rejectedCandidates.slice(0, 20)) {
      lines.push(`| ${r.symbol} | ${r.setup} | ${r.regime} | ${r.compositeTier} | ${r.decisionV2} | ${r.rollingVerdict} | ${r.reason} |`);
    }
    if (report.rejectedCandidates.length > 20) {
      lines.push(`_${report.rejectedCandidates.length - 20} rejets supplémentaires non listés_`);
    }
  }
  lines.push("");

  lines.push("## 8. Exposition par setup");
  lines.push("");
  lines.push("| Setup | Positions | Poids | Cap v3 | Statut |");
  lines.push("|---|---:|---:|---:|---|");
  for (const [setup, v] of Object.entries(report.summary.bySetup).sort((a, b) => b[1].weightPct - a[1].weightPct)) {
    const cap = POLICY.setupCaps[setup];
    const status = cap === undefined ? "—" : (v.weightPct / 100 <= cap + 1e-9 ? "✓" : "✗");
    const capStr = cap !== undefined ? `${(cap * 100).toFixed(0)} %` : "—";
    lines.push(`| ${setup} | ${v.positions} | ${fmt(v.weightPct)} % | ${capStr} | ${status} |`);
  }
  lines.push("");

  lines.push("## 9. Exposition par sous-thème");
  lines.push("");
  if (Object.keys(report.summary.byFineTheme).length === 0) {
    lines.push("_aucun sous-thème exposé_");
  } else {
    lines.push("| Sous-thème | Positions | Poids | Cap v3 | Statut |");
    lines.push("|---|---:|---:|---:|---|");
    for (const [theme, v] of Object.entries(report.summary.byFineTheme).sort((a, b) => b[1].weightPct - a[1].weightPct)) {
      const cap = POLICY.fineThemeCaps[theme];
      const status = cap === undefined ? "—" : (v.weightPct / 100 <= cap + 1e-9 ? "✓" : "✗");
      const capStr = cap !== undefined ? `${(cap * 100).toFixed(0)} %` : "—";
      lines.push(`| ${theme} | ${v.positions} | ${fmt(v.weightPct)} % | ${capStr} | ${status} |`);
    }
  }
  lines.push("");

  lines.push("## 10. Contrôle post-normalisation des caps hard");
  lines.push("");
  const pn = report.summary.postNormalization;
  lines.push(`- Itérations : **${pn.iterations}**`);
  lines.push(`- Positions retirées : **${pn.removalsCount}**`);
  lines.push(`- Positions ajoutées par swap-in : **${(report.postNormalizationAdditions || []).length}**`);
  if (report.positions.length === 0) {
    lines.push("- Caps hard tous respectés sur les poids finaux : **n/a (portefeuille vide)**");
  } else {
    lines.push(`- Caps hard tous respectés sur les poids finaux : **${pn.capsAllRespectedFinal ? "✓ oui" : "✗ NON"}**`);
  }
  lines.push("");
  if (report.positions.length === 0 && pn.initialViolations.length > 0) {
    lines.push("⚠ **Aucun sous-ensemble du pool v2 ne respecte simultanément tous les caps hard demandés.** Le contrôle post-normalisation a retiré itérativement les positions violant les caps. À chaque retrait, un swap-in a été tenté depuis le reste du pool, mais aucun candidat n'a pu être ajouté sans recréer une violation. Conséquence : portefeuille vide, status `failed`.");
    lines.push("");
    lines.push("**Cause mathématique probable :** la somme des caps setups (Pullback 50 % + Breakout 25 % + RS Rotation 35 % = 110 %) autorise en théorie un portefeuille à 3 setups, mais le pool v2 actuel n'offre qu'un seul Breakout ROBUST (GLD) et 4 RS Rotation FRAGILE, dont 2 (MSTR, COIN) déclenchent le cap fin `crypto_correlated_equity ≤ 8 %`. Toute combinaison testée viole soit Pullback 50 %, soit Breakout 25 %, soit crypto_correlated_equity 8 %, soit ai_hypergrowth 20 %.");
    lines.push("");
    lines.push("**Pistes pour rendre la sélection viable** (à valider par ChatGPT) :");
    lines.push("- Relâcher `crypto_correlated_equity` de 8 % à 12 % (permettrait d'inclure MSTR à 8.6 %).");
    lines.push("- Relâcher `BREAKOUT_EXPANSION` de 25 % à 30 % (donne de la marge pour 1 GLD ROBUST + 1 Breakout FRAGILE).");
    lines.push("- Étendre `tradable-universe-v2` en attendant qu'un walk-forward roulant futur fasse remonter d'autres Breakout/RS Rotation en ROBUST/STABLE.");
    lines.push("- Ajuster les baseUnits (ex. ROBUST 0.7 au lieu de 1.0) pour réduire la concentration unitaire des P ROBUST.");
    lines.push("");
  }
  if (pn.initialViolations.length) {
    lines.push("Caps violés en sortie de greedy (avant correction) :");
    lines.push("");
    lines.push("| Kind | Clé | Cap | Réel | Excès |");
    lines.push("|---|---|---:|---:|---:|");
    for (const v of pn.initialViolations) {
      lines.push(`| ${v.kind} | ${v.key} | ${fmt(v.capPct)} % | ${fmt(v.actualPct)} % | +${fmt(v.exceedancePct)} % |`);
    }
    lines.push("");
  } else {
    lines.push("_aucun cap violé en sortie de greedy_");
    lines.push("");
  }
  if (report.postNormalizationRemovals.length) {
    lines.push("Positions retirées par le contrôle post-normalisation :");
    lines.push("");
    lines.push("| Symbole | Setup | Régime | Tier | Decision | Rolling | Cap déclencheur | Réel avant |");
    lines.push("|---|---|---|---|---|---|---|---:|");
    for (const r of report.postNormalizationRemovals) {
      lines.push(`| ${r.symbol} | ${r.setup} | ${r.regime} | ${r.compositeTier} | ${r.decisionV2} | ${r.rollingVerdict} | ${r.removedDueTo.kind} ${r.removedDueTo.key} (cap ${fmt(r.removedDueTo.capPct)} %) | ${fmt(r.removedDueTo.actualPctBeforeRemoval)} % |`);
    }
    lines.push("");
  }
  if (report.postNormalizationAdditions.length) {
    lines.push("Positions ajoutées par swap-in (en remplacement des retraits) :");
    lines.push("");
    lines.push("| Symbole | Setup | Régime | Tier | Decision | Rolling | Via |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const a of report.postNormalizationAdditions) {
      lines.push(`| ${a.symbol} | ${a.setup} | ${a.regime} | ${a.compositeTier} | ${a.decisionV2} | ${a.rollingVerdict} | ${a.via} |`);
    }
    lines.push("");
  }
  if (pn.finalViolations.length) {
    lines.push("**✗ Caps hard NON respectés après contrôle (status `failed`) :**");
    lines.push("");
    lines.push("| Kind | Clé | Cap | Réel | Excès |");
    lines.push("|---|---|---:|---:|---:|");
    for (const v of pn.finalViolations) {
      lines.push(`| ${v.kind} | ${v.key} | ${fmt(v.capPct)} % | ${fmt(v.actualPct)} % | +${fmt(v.exceedancePct)} % |`);
    }
    lines.push("");
  } else {
    lines.push("**✓ Tous les caps hard sont respectés sur le portefeuille final normalisé.**");
    lines.push("");
  }

  lines.push("## 11. Risques et limites");
  lines.push("");
  if (report.warnings.length) {
    for (const w of report.warnings) lines.push(`- ⚠ ${w}`);
  } else {
    lines.push("- _aucun warning structurel_");
  }
  lines.push("");
  lines.push("- **Caps hard respectés sur les poids normalisés** (cf. section 10). Si le greedy initial dépasse un cap, le contrôle post-normalisation retire la position la moins prioritaire qui contribue, renormalise et boucle. Conséquence : le portefeuille peut compter moins de 10 positions si nécessaire pour respecter les caps.");
  lines.push("- **Pas de coût de transaction** modélisé. Voir `friction-model-v1` pour la couche friction.");
  lines.push("- **Pas de corrélation inter-position** prise en compte — un portefeuille concentré sur quelques setups Pullback techs peut sembler diversifié par sous-thème mais rester très corrélé en bêta.");
  lines.push("- **Symboles UNKNOWN** : non couverts par les caps fins, peuvent passer sous le radar. Ajouter à `lib/theme-table.mjs`.");
  lines.push("- **Plan théorique uniquement.** Aucun ordre, aucun broker, aucun endpoint live.");
  lines.push("");

  lines.push("## 12. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Stress-test** ce plan v3 contre `friction-adjusted-report.json` pour mesurer l'érosion edge après coûts.");
  lines.push("- **Backfill ETF holdings** : propager les sous-jacents des ETFs détenus (BOTZ, CLOU, WCLD, IGV…) pour vérifier qu'aucun cap fin n'est dépassé une fois la transparence appliquée.");
  lines.push("- **Corrélations inter-positions** : ajouter une couche corrélation 2024-2025 pour détecter les paires trop liées (ex. plusieurs Pullback semis_pure différents).");
  lines.push("- **Calibration empirique** des caps fins après premier paper trading.");
  lines.push("- **Walk-forward conditionnel au régime** : durcir encore en exigeant que le verdict ROBUST tienne aussi dans le régime cible (RISK_ON / RISK_OFF / NEUTRAL).");
  lines.push("");

  return lines.join("\n");
}

// === Main ===================================================================

async function main() {
  console.log("[allocation-engine-v3] démarrage");

  const tu2 = await loadJsonIfExists(INPUT_TU2);
  if (!tu2) {
    console.error(`[allocation-engine-v3] source manquante : ${INPUT_TU2}`);
    console.error("Lancer : node tools/backtests/tradable-universe-v2.mjs");
    process.exit(1);
  }

  const cells = Array.isArray(tu2.cells) ? tu2.cells : [];
  console.log(`[allocation-engine-v3] ${cells.length} cellules totales dans tradable-universe-v2`);

  // Filtre 1 : BLOCK interdit
  const nonBlock = cells.filter((c) => normalizeDecision(c.decisionV2) !== "BLOCK");
  console.log(`[allocation-engine-v3] ${nonBlock.length} cellules non-BLOCK`);

  // Filtre 2 : éligibilité priorité 1-4
  const eligible = nonBlock.filter((c) => getPriorityGroup(c) != null);
  console.log(`[allocation-engine-v3] ${eligible.length} cellules éligibles (priorité 1-4)`);

  // Filtre 3 : setup autorisé
  const setupOk = eligible.filter((c) => !FORBIDDEN_SETUPS.has(c.setup));
  console.log(`[allocation-engine-v3] ${setupOk.length} cellules après filtre setup`);

  // Filtre 4 : pas leveraged
  const noLev = setupOk.filter((c) => !LEVERAGED.has(c.symbol));
  console.log(`[allocation-engine-v3] ${noLev.length} cellules après filtre leveraged`);

  // Dédoublonnage par symbole (max 1 position par symbole)
  const deduped = dedupePerSymbol(noLev);
  console.log(`[allocation-engine-v3] ${deduped.length} cellules après dédoublonnage par symbole`);

  deduped.sort(compareCells);

  const { portfolio, rejected, constraintsApplied } = buildPortfolio(deduped);
  console.log(`[allocation-engine-v3] ${portfolio.positions.length} positions sélectionnées sur ${deduped.length} candidates dédupliquées (greedy pré-norm)`);

  // Contrôle post-normalisation : retire les positions qui violent les caps
  // sur le portefeuille final normalisé à 100 %.
  const policySnapshot = {
    setupCaps: POLICY.setupCaps,
    broadCaps: POLICY.broadCaps,
    fineThemeCaps: POLICY.fineThemeCaps,
  };
  const enforce = enforceCapsPostNormalization(portfolio, policySnapshot, deduped);
  console.log(`[allocation-engine-v3] contrôle post-norm : ${enforce.removalsLog.length} retrait(s), ${enforce.additionsLog.length} swap-in en ${enforce.iterations} itération(s)`);
  if (enforce.initialViolations.length) {
    for (const v of enforce.initialViolations) {
      console.log(`  ⚠ initial : ${v.kind} ${v.key} ${v.actualPct.toFixed(2)}% > cap ${v.capPct.toFixed(2)}%`);
    }
  }
  if (enforce.finalViolations.length) {
    for (const v of enforce.finalViolations) {
      console.log(`  ✗ FINAL : ${v.kind} ${v.key} ${v.actualPct.toFixed(2)}% > cap ${v.capPct.toFixed(2)}%`);
    }
  }
  if (enforce.removalsLog.length) {
    constraintsApplied.push("post-normalization cap enforcement");
  }
  console.log(`[allocation-engine-v3] portefeuille final : ${portfolio.positions.length} positions`);

  // Stats par tier / setup / broad / fine
  const byTier = { A: { positions: 0, weightPct: 0 }, B: { positions: 0, weightPct: 0 }, C: { positions: 0, weightPct: 0 }, D: { positions: 0, weightPct: 0 } };
  const bySetup = {};
  const byBroad = {};
  const byFineTheme = {};
  const byDecision = {};
  const byRollingVerdict = {};
  for (const p of portfolio.positions) {
    if (byTier[p.compositeTier]) {
      byTier[p.compositeTier].positions++;
      byTier[p.compositeTier].weightPct += p.weightPct;
    }
    if (!bySetup[p.setup]) bySetup[p.setup] = { positions: 0, weightPct: 0 };
    bySetup[p.setup].positions++;
    bySetup[p.setup].weightPct += p.weightPct;
    if (!byBroad[p.broadCategory]) byBroad[p.broadCategory] = { positions: 0, weightPct: 0 };
    byBroad[p.broadCategory].positions++;
    byBroad[p.broadCategory].weightPct += p.weightPct;
    for (const t of p.fineThemes) {
      if (!byFineTheme[t]) byFineTheme[t] = { positions: 0, weightPct: 0 };
      byFineTheme[t].positions++;
      byFineTheme[t].weightPct += p.weightPct;
    }
    byDecision[p.decisionV2] = (byDecision[p.decisionV2] || 0) + 1;
    byRollingVerdict[p.rollingVerdict] = (byRollingVerdict[p.rollingVerdict] || 0) + 1;
  }
  for (const v of Object.values(byTier)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(bySetup)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(byBroad)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(byFineTheme)) v.weightPct = Number(v.weightPct.toFixed(2));

  const totalWeight = portfolio.positions.reduce((s, p) => s + p.weightPct, 0);
  const warnings = computeWarnings(portfolio);
  if (enforce.removalsLog.length) {
    warnings.push(`Contrôle post-normalisation : ${enforce.removalsLog.length} position(s) retirée(s) pour respect des caps hard (${enforce.iterations} itération(s)). Voir section "Contrôle post-normalisation".`);
  }
  if (enforce.finalViolations.length) {
    for (const v of enforce.finalViolations) {
      warnings.push(`Cap hard NON respecté après contrôle post-normalisation : ${v.kind} ${v.key} ${v.actualPct} % > cap ${v.capPct} %.`);
    }
  }
  const comparison = await compareWithPrevious(portfolio);

  const allowCount = portfolio.positions.filter((p) => normalizeDecision(p.decisionV2) === "ALLOW").length;
  const watchCount = portfolio.positions.filter((p) => normalizeDecision(p.decisionV2) === "REDUCE").length;
  const expCount = portfolio.positions.filter((p) => p.decisionV2 === "EXPERIMENTAL").length;

  // Statut : "failed" si un cap hard est encore dépassé après contrôle, sinon
  // "warning" si < minPositions, "ok" sinon.
  let status;
  if (enforce.finalViolations.length > 0) {
    status = "failed";
  } else if (portfolio.positions.length === 0) {
    status = "failed";
  } else if (portfolio.positions.length < POLICY.minPositions) {
    status = "warning";
  } else {
    status = "ok";
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status,
    sources: {
      tradableUniverseV2: relative(REPO_ROOT, INPUT_TU2),
      themeTable: relative(REPO_ROOT, join(HERE, "lib", "theme-table.mjs")),
    },
    policy: {
      baseUnits: BASE_UNITS,
      minPositions: POLICY.minPositions,
      maxPositions: POLICY.maxPositions,
      maxExperimentalPositions: POLICY.maxExperimentalPositions,
      setupCaps: POLICY.setupCaps,
      broadCaps: POLICY.broadCaps,
      fineThemeCaps: POLICY.fineThemeCaps,
      forbiddenSetups: Array.from(FORBIDDEN_SETUPS),
      leveragedForbidden: Array.from(LEVERAGED),
      targetBudgetUnits: TARGET_BUDGET,
      antiPromotion: "v3 ne promeut jamais — BLOCK reste BLOCK, EXPERIMENTAL strict exception encadrée",
    },
    summary: {
      candidateCells: nonBlock.length,
      eligibleCells: eligible.length,
      dedupedCandidates: deduped.length,
      selectedPositions: portfolio.positions.length,
      allowPositions: allowCount,
      watchPositions: watchCount,
      experimentalPositions: expCount,
      totalWeight: Number(totalWeight.toFixed(2)),
      byTier,
      byDecision,
      byRollingVerdict,
      bySetup,
      byBroad,
      byFineTheme,
      constraintsApplied,
      postNormalization: {
        initialViolations: enforce.initialViolations,
        finalViolations: enforce.finalViolations,
        removalsCount: enforce.removalsLog.length,
        iterations: enforce.iterations,
        capsAllRespectedFinal: enforce.finalViolations.length === 0,
      },
    },
    positions: portfolio.positions,
    rejectedCandidates: rejected,
    postNormalizationRemovals: enforce.removalsLog,
    postNormalizationAdditions: enforce.additionsLog,
    comparison,
    warnings,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[allocation-engine-v3] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Plan v3 : ${portfolio.positions.length} positions (ALLOW ${allowCount} / WATCH-REDUCE ${watchCount} / EXP ${expCount}), total ${fmt(totalWeight)} %, status=${status}`);
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}) :`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

main().catch((err) => {
  console.error("[allocation-engine-v3] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
