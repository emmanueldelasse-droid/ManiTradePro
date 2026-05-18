// tools/backtests/friction-model-v1.mjs
//
// Modèle offline de frictions réelles v1 — ManiTradePro.
// Estime l'impact des frais, spread, slippage et gaps sur les cellules
// tradables et sur le plan d'allocation.
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun ordre
// broker, ne modifie aucun trade réel, ne touche aucun endpoint live. Il
// produit une analyse théorique de friction, à des fins de prudence et de
// dégradation conservatrice du tradable universe / plan d'allocation.
//
// Le modèle est HEURISTIQUE V1 : pas de carnet d'ordre réel, pas de spread
// live, pas de barème broker. Les pourcentages sont des hypothèses prudentes
// par classe d'actif, à calibrer empiriquement après paper trading live.
//
// Entrées :
//   - tools/backtests/output/tradable-universe.json
//   - tools/backtests/output/allocation-plan.json
//
// Sorties :
//   - tools/backtests/output/friction-adjusted-report.json
//   - tools/backtests/output/friction-adjusted-report.md
//
// Le modèle ne PROMEUT JAMAIS une cellule : il peut maintenir ou dégrader,
// jamais améliorer. Le plan d'allocation existant n'est PAS modifié sur
// disque (allocation-plan.json est lu seul) — le rapport produit une
// allocation ajustée indicative à valider par l'utilisateur.
//
// Usage : node tools/backtests/friction-model-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_TU = join(OUTPUT_DIR, "tradable-universe.json");
const INPUT_ALLOC = join(OUTPUT_DIR, "allocation-plan.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "friction-adjusted-report.json");
const OUTPUT_MD = join(OUTPUT_DIR, "friction-adjusted-report.md");

// === Hypothèses de friction v1 ===
//
// Tous les pourcentages sont par trade (entrée + sortie combinées, approche
// "round-trip") et représentent l'érosion attendue de la performance.
//
// Composants par profil :
//   - commissionPct : frais broker (estimés conservativement)
//   - spreadPct     : écart bid-ask moyen, en %
//   - slippagePct   : glissement à l'exécution (taille de l'ordre, market impact)
//   - gapRiskPct    : risque de gap d'ouverture (overnight / weekend pour crypto)
//
// totalFrictionPct = commission + spread + slippage + gapRisk
//
// Sources : aucune. Hypothèses prudentes basées sur l'expérience trading
// retail standard. À recalibrer après paper trading live.
const FRICTION_PROFILES = {
  low: {
    commissionPct: 0.02,
    spreadPct: 0.03,
    slippagePct: 0.05,
    gapRiskPct: 0.05,
  },
  medium: {
    commissionPct: 0.02,
    spreadPct: 0.08,
    slippagePct: 0.12,
    gapRiskPct: 0.10,
  },
  high: {
    commissionPct: 0.05,
    spreadPct: 0.20,
    slippagePct: 0.25,
    gapRiskPct: 0.20,
  },
  extreme: {
    commissionPct: 0.05,
    spreadPct: 0.40,
    slippagePct: 0.50,
    gapRiskPct: 0.40,
  },
};

function profileTotal(p) {
  return Number((p.commissionPct + p.spreadPct + p.slippagePct + p.gapRiskPct).toFixed(3));
}

// === Classification asset class → friction profile ===
//
// Listes basées sur l'univers ManiTradePro mai 2026. Toute classification
// non couverte tombe en defensive_other → profil medium (prudent).
const ETF_LARGE_LIQUIDE = new Set([
  "SPY", "QQQ", "IWM", "MDY", "VUG", "SPYG", "IYW", "FTEC", "VGT",
  "XLK", "SMH", "SOXX", "SOXQ", "IGV", "IGM", "XSW", "XSD", "PSI",
  "GLD", "TLT",
]);
const US_LARGE_CAP = new Set([
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AVGO",
  "AMD", "TSM", "ORCL", "CRM", "ADBE", "NFLX", "JPM", "V", "MA",
  "AXP", "BKNG", "MELI", "INTU", "NOW", "PANW", "CRWD", "FTNT",
  "MU", "QCOM", "TXN", "ADI", "AMAT", "LRCX", "KLAC", "ASML",
  "COST", "LLY", "VRTX", "ELV", "SPGI", "MSCI", "ETN", "PH", "ROP",
  "LIN", "PDD", "ABNB", "UBER", "SHOP", "WM", "HUBB",
]);
const SEMI_AI_VOLATILE = new Set([
  "PLTR", "SMCI", "NBIS", "APLD", "AEHR", "ACLS", "CAMT", "ONTO",
  "ARM", "RBRK", "SOUN", "BBAI", "UPST", "AI", "APP", "FICO",
  "ENTG", "TER", "MPWR", "NVMI", "ALGM", "AMKR", "STM", "SWKS",
  "QRVO", "LSCC", "SLAB", "SYNA", "WOLF", "MRVL", "ON", "MCHP",
  "FORM", "IPGP", "RMBS", "INTC", "NXPI", "ASX", "DELL", "SMCI",
  "DDOG", "MDB", "NET", "SNOW", "ESTC", "OKTA", "ZS", "S", "CYBR",
  "TENB", "VRNS", "CHKP", "GEN", "SENT", "GTLB", "PATH", "CFLT",
  "DOCN", "HCP", "PAYC", "ADSK", "TYL", "TTD", "DUOL", "ANET",
  "MSTR", "COIN", "ROKU", "SE", "SAP", "EA", "TTWO",
  "PAYX", "AKAM", "SPLK", "ZEN", "DT", "PD", "WDAY", "TEAM", "HUBS",
  "BOTZ", "CIBR", "HACK", "FDN", "SKYY", "CLOU", "WCLD", "BUG",
  "TT", "DSY", "AIR", "LVMH", "NESN", "RMS", "SIE", "TTE",
]);
const CRYPTO_PURE = new Set(["BTC", "ETH", "SOL", "AVAX", "BNB", "LINK"]);
const CRYPTO_CORRELATED = new Set(["MSTR", "COIN", "IBIT"]);
const LEVERAGED = new Set(["SOXL", "USD", "ROM", "TQQQ", "SQQQ", "UPRO"]);
const FX = new Set(["EURUSD", "GBPUSD", "USDJPY"]);

function classifyAsset(symbol) {
  if (LEVERAGED.has(symbol)) return { assetClass: "leveraged_etf", profile: "high" };
  if (CRYPTO_PURE.has(symbol)) return { assetClass: "crypto_pure", profile: "high" };
  if (CRYPTO_CORRELATED.has(symbol)) return { assetClass: "crypto_correlated", profile: "medium" };
  if (FX.has(symbol)) return { assetClass: "fx", profile: "low" };
  if (ETF_LARGE_LIQUIDE.has(symbol)) return { assetClass: "etf_large_liquide", profile: "low" };
  if (US_LARGE_CAP.has(symbol)) return { assetClass: "us_large_cap", profile: "low" };
  if (SEMI_AI_VOLATILE.has(symbol)) return { assetClass: "semi_ai_volatile", profile: "medium" };
  // Reste : profil medium par prudence
  return { assetClass: "defensive_other", profile: "medium" };
}

// === Pénalités contextuelles ===
//
// Ces pénalités s'ajoutent au totalFrictionPct du profil de base, pour
// refléter des contextes plus risqués (breakout = slippage timing, crypto
// = spread élevé, leveraged = gap amplifié, etc.).
function contextualPenalties(cell, classification) {
  const penalties = [];
  let extra = 0;

  if (cell.setup === "BREAKOUT_EXPANSION") {
    extra += 0.10;
    penalties.push("breakout : +0.10% slippage timing");
  }
  if (classification.assetClass === "crypto_pure") {
    extra += 0.10;
    penalties.push("crypto : +0.10% spread + slippage");
  }
  if (classification.assetClass === "leveraged_etf") {
    extra += 0.20;
    penalties.push("leveraged : +0.20% gap amplifié");
  }
  if (cell.decision === "EXPERIMENTAL") {
    extra += 0.10;
    penalties.push("EXPERIMENTAL : +0.10% prudence");
  }
  if (cell.regime === "RISK_OFF") {
    extra += 0.15;
    penalties.push("RISK_OFF : +0.15% gap/régime");
  }
  if (cell.confidence === "LOW") {
    extra += 0.05;
    penalties.push("confidence LOW : +0.05%");
  }
  // Walk-forward INSUFFICIENT_DATA = incertitude sur la robustesse
  const wfTier = cell.filters?.walkForward?.tier;
  if (wfTier === "INSUFFICIENT_DATA") {
    extra += 0.05;
    penalties.push("WF INSUFFICIENT_DATA : +0.05% prudence");
  }

  return { extra: Number(extra.toFixed(3)), penalties };
}

// === Calcul friction par cellule ===

function computeFrictionForCell(cell) {
  const classification = classifyAsset(cell.symbol);
  const profile = FRICTION_PROFILES[classification.profile];
  const baseTotal = profileTotal(profile);
  const { extra, penalties } = contextualPenalties(cell, classification);
  const totalFrictionPct = Number((baseTotal + extra).toFixed(3));

  return {
    symbol: cell.symbol,
    assetClass: classification.assetClass,
    frictionProfile: classification.profile,
    commissionPct: profile.commissionPct,
    spreadPct: profile.spreadPct,
    slippagePct: profile.slippagePct,
    gapRiskPct: profile.gapRiskPct,
    contextualExtraPct: extra,
    contextualPenalties: penalties,
    totalFrictionPct,
  };
}

// === Dégradation de décision basée sur friction ===
//
// Règle : friction ne PROMEUT JAMAIS. Elle peut maintenir ou dégrader.
//   - < 0.25% : aucun changement
//   - 0.25-0.50% : ALLOW → REDUCE, sinon inchangé
//   - 0.50-1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL
//   - > 1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL, EXPERIMENTAL → BLOCK
const DEGRADATION_PATH = ["ALLOW", "REDUCE", "EXPERIMENTAL", "BLOCK"];

function degradeDecision(originalDecision, totalFrictionPct) {
  if (!DEGRADATION_PATH.includes(originalDecision)) return originalDecision;
  const startIdx = DEGRADATION_PATH.indexOf(originalDecision);
  let degradeSteps = 0;
  if (totalFrictionPct >= 1.00) degradeSteps = 3;
  else if (totalFrictionPct >= 0.50) degradeSteps = 2;
  else if (totalFrictionPct >= 0.25) degradeSteps = 1;
  // On applique le nombre de cran de dégradation, capé par BLOCK
  let newIdx = startIdx + degradeSteps;
  // Mais on plafonne : ALLOW + 1 = REDUCE, ALLOW + 2 = EXPERIMENTAL, ALLOW + 3 = BLOCK
  // REDUCE + 1 = EXPERIMENTAL, REDUCE + 2 = BLOCK
  // EXPERIMENTAL + 1 = BLOCK
  // Comportement : on plafonne au plus bas de la grille
  if (newIdx >= DEGRADATION_PATH.length) newIdx = DEGRADATION_PATH.length - 1;
  // Cas spécial : si originalDecision = REDUCE et friction < 0.50, pas de dégradation
  if (originalDecision === "REDUCE" && totalFrictionPct < 0.50) newIdx = startIdx;
  // Cas spécial : si EXPERIMENTAL et friction < 1.00, pas de dégradation
  if (originalDecision === "EXPERIMENTAL" && totalFrictionPct < 1.00) newIdx = startIdx;
  return DEGRADATION_PATH[newIdx];
}

// === Allocation suggestion ===
//
// Pour chaque position du plan d'allocation, on suggère un ajustement de
// poids selon la friction. Le plan original n'est PAS modifié sur disque.
function allocationWeightSuggestion(totalFrictionPct) {
  if (totalFrictionPct < 0.25) return "normal";
  if (totalFrictionPct < 0.50) return "reduce_10_pct";
  if (totalFrictionPct < 1.00) return "reduce_25_pct";
  return "remove_candidate";
}

// === Chargement ===

async function tryRead(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

// === Main ===

async function main() {
  console.log("[friction-model] démarrage");

  const tu = await tryRead(INPUT_TU);
  const alloc = await tryRead(INPUT_ALLOC);

  if (!tu) {
    console.error("[friction-model] source manquante : tradable-universe.json");
    console.error("Lancer d'abord : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }
  if (!alloc) {
    console.error("[friction-model] source manquante : allocation-plan.json");
    console.error("Lancer d'abord : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }

  const cells = Array.isArray(tu.cells) ? tu.cells : [];
  console.log(`[friction-model] ${cells.length} cellules dans tradable-universe`);

  // === Impact sur le tradable universe ===
  const adjustedCells = [];
  const transitions = { unchanged: 0, ALLOW_to_REDUCE: 0, ALLOW_to_EXPERIMENTAL: 0, ALLOW_to_BLOCK: 0, REDUCE_to_EXPERIMENTAL: 0, REDUCE_to_BLOCK: 0, EXPERIMENTAL_to_BLOCK: 0 };
  const distribOriginal = { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 };
  const distribAdjusted = { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 };

  for (const cell of cells) {
    distribOriginal[cell.decision] = (distribOriginal[cell.decision] || 0) + 1;
    if (cell.decision === "BLOCK") {
      distribAdjusted.BLOCK++;
      continue;
    }
    const friction = computeFrictionForCell(cell);
    const adjustedDecision = degradeDecision(cell.decision, friction.totalFrictionPct);
    distribAdjusted[adjustedDecision] = (distribAdjusted[adjustedDecision] || 0) + 1;

    if (adjustedDecision === cell.decision) {
      transitions.unchanged++;
    } else {
      const key = `${cell.decision}_to_${adjustedDecision}`;
      transitions[key] = (transitions[key] || 0) + 1;
    }

    adjustedCells.push({
      symbol: cell.symbol,
      setup: cell.setup,
      variant: cell.variant,
      regime: cell.regime,
      originalDecision: cell.decision,
      originalCompositeTier: cell.compositeTier,
      friction,
      adjustedDecision,
      degraded: adjustedDecision !== cell.decision,
    });
  }

  // === Impact sur allocation-plan ===
  const adjustedPositions = (alloc.positions || []).map((p) => {
    // Reconstitue une cellule équivalente pour calcul friction
    const pseudoCell = {
      symbol: p.symbol,
      setup: p.setup,
      regime: p.regime,
      decision: p.decision,
      confidence: p.confidence ?? null,
      filters: {},
    };
    const friction = computeFrictionForCell(pseudoCell);
    const suggestion = allocationWeightSuggestion(friction.totalFrictionPct);
    let adjustedWeightPct = p.weightPct;
    if (suggestion === "reduce_10_pct") adjustedWeightPct = Number((p.weightPct * 0.9).toFixed(2));
    else if (suggestion === "reduce_25_pct") adjustedWeightPct = Number((p.weightPct * 0.75).toFixed(2));
    else if (suggestion === "remove_candidate") adjustedWeightPct = 0;
    return {
      rank: p.rank,
      symbol: p.symbol,
      setup: p.setup,
      regime: p.regime,
      compositeTier: p.compositeTier,
      originalWeightPct: p.weightPct,
      adjustedWeightSuggestion: suggestion,
      adjustedWeightPct, // indicatif, NON normalisé
      friction,
      theme: p.theme,
    };
  });

  // Re-normalisation indicative des poids ajustés à 100 %
  const sumAdjusted = adjustedPositions.reduce((s, p) => s + p.adjustedWeightPct, 0);
  for (const p of adjustedPositions) {
    p.adjustedWeightPctNormalized = sumAdjusted > 0 ? Number(((p.adjustedWeightPct / sumAdjusted) * 100).toFixed(2)) : 0;
  }

  // === Rapport ===
  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      tradableUniverse: relative(REPO_ROOT, INPUT_TU),
      allocationPlan: relative(REPO_ROOT, INPUT_ALLOC),
    },
    model: {
      version: "v1",
      type: "heuristic",
      profiles: FRICTION_PROFILES,
      thresholds: {
        unchanged_below_pct: 0.25,
        degrade_one_step_pct: 0.50,
        degrade_two_steps_pct: 1.00,
      },
      disclaimer: "Modèle heuristique offline. Aucune donnée broker réelle, aucun carnet d'ordre, aucun spread live. À calibrer empiriquement après paper trading.",
    },
    summary: {
      totalCells: cells.length,
      distribOriginal,
      distribAdjusted,
      transitions,
      allocationPlanPositions: adjustedPositions.length,
      allocationDegradedCount: adjustedPositions.filter((p) => p.adjustedWeightSuggestion !== "normal").length,
    },
    adjustedCells,
    adjustedAllocation: adjustedPositions,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[friction-model] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Cellules originales : ALLOW ${distribOriginal.ALLOW}, REDUCE ${distribOriginal.REDUCE}, EXP ${distribOriginal.EXPERIMENTAL}, BLOCK ${distribOriginal.BLOCK}`);
  console.log(`Cellules ajustées   : ALLOW ${distribAdjusted.ALLOW}, REDUCE ${distribAdjusted.REDUCE}, EXP ${distribAdjusted.EXPERIMENTAL}, BLOCK ${distribAdjusted.BLOCK}`);
  console.log(`Transitions : ${Object.entries(transitions).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`Allocation : ${adjustedPositions.length} positions, ${report.summary.allocationDegradedCount} avec suggestion de dégradation`);
}

function fmt(n, d = 3) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Friction-Adjusted Report — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/friction-model-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Modèle heuristique v1.** Aucune donnée broker réelle, aucun carnet d'ordre live, aucun barème réel. Les pourcentages sont des hypothèses prudentes par classe d'actif. À recalibrer après paper trading live. Ne pas confondre avec une simulation d'exécution.");
  lines.push("");
  lines.push("**Le modèle ne PROMEUT JAMAIS une cellule.** Friction = maintenir ou dégrader. Le plan d'allocation existant n'est PAS modifié sur disque.");
  lines.push("");

  // 1. Résumé global
  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Cellules analysées : **${report.summary.totalCells}**`);
  lines.push(`- Positions du plan d'allocation : **${report.summary.allocationPlanPositions}**`);
  lines.push(`- Positions avec suggestion de dégradation : **${report.summary.allocationDegradedCount}**`);
  lines.push("");
  lines.push("Distribution decision (original → ajusté) :");
  lines.push("");
  lines.push("| Decision | Original | Ajusté | Delta |");
  lines.push("|---|---:|---:|---:|");
  for (const d of ["ALLOW", "REDUCE", "EXPERIMENTAL", "BLOCK"]) {
    const o = report.summary.distribOriginal[d] || 0;
    const a = report.summary.distribAdjusted[d] || 0;
    const delta = a - o;
    lines.push(`| ${d} | ${o} | ${a} | ${delta >= 0 ? "+" : ""}${delta} |`);
  }
  lines.push("");
  lines.push("Transitions observées :");
  lines.push("");
  lines.push("| Transition | Cellules |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(report.summary.transitions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k.replace(/_/g, " ")} | ${v} |`);
  }
  lines.push("");

  // 2. Hypothèses
  lines.push("## 2. Hypothèses de friction");
  lines.push("");
  lines.push("Composants modélisés (par trade, round-trip) :");
  lines.push("- `commissionPct` : frais broker estimés");
  lines.push("- `spreadPct` : écart bid-ask moyen en %");
  lines.push("- `slippagePct` : glissement à l'exécution");
  lines.push("- `gapRiskPct` : risque de gap d'ouverture (overnight / weekend pour crypto)");
  lines.push("");
  lines.push("Profils de base :");
  lines.push("");
  lines.push("| Profil | Commission | Spread | Slippage | Gap | Total |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const [name, p] of Object.entries(report.model.profiles)) {
    lines.push(`| ${name} | ${fmt(p.commissionPct)}% | ${fmt(p.spreadPct)}% | ${fmt(p.slippagePct)}% | ${fmt(p.gapRiskPct)}% | ${fmt(profileTotal(p))}% |`);
  }
  lines.push("");
  lines.push("Pénalités contextuelles additionnelles :");
  lines.push("- Setup `BREAKOUT_EXPANSION` : +0.10% slippage timing");
  lines.push("- Classe `crypto_pure` : +0.10% spread + slippage");
  lines.push("- Classe `leveraged_etf` : +0.20% gap amplifié");
  lines.push("- Decision `EXPERIMENTAL` : +0.10% prudence");
  lines.push("- Régime `RISK_OFF` : +0.15% gap/régime");
  lines.push("- Confidence `LOW` : +0.05%");
  lines.push("- Walk-forward `INSUFFICIENT_DATA` : +0.05% prudence");
  lines.push("");
  lines.push("Règle de dégradation decision :");
  lines.push("- friction < 0.25% : inchangé");
  lines.push("- 0.25-0.50% : ALLOW → REDUCE");
  lines.push("- 0.50-1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL");
  lines.push("- > 1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL, EXPERIMENTAL → BLOCK");
  lines.push("");

  // 3. Impact sur tradable universe
  lines.push("## 3. Impact sur tradable universe");
  lines.push("");
  const cellsByOriginal = {};
  for (const c of report.adjustedCells) {
    cellsByOriginal[c.originalDecision] = (cellsByOriginal[c.originalDecision] || 0) + 1;
  }
  const degradedTotal = report.adjustedCells.filter((c) => c.degraded).length;
  const totalCellsAnalyzed = report.adjustedCells.length;
  lines.push(`Sur ${totalCellsAnalyzed} cellules analysées (decision != BLOCK initial) : **${degradedTotal}** dégradées par le modèle de friction (${totalCellsAnalyzed > 0 ? ((degradedTotal / totalCellsAnalyzed) * 100).toFixed(1) : "0"}%).`);
  lines.push("");

  // 4. ALLOW dégradés en REDUCE
  const allowToReduce = report.adjustedCells.filter((c) => c.originalDecision === "ALLOW" && c.adjustedDecision === "REDUCE");
  lines.push("## 4. Cellules ALLOW dégradées en REDUCE");
  lines.push("");
  if (!allowToReduce.length) {
    lines.push("_aucune_");
  } else {
    lines.push(`${allowToReduce.length} cellules. Premiers exemples :`);
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Classe | Friction | Pénalités contextuelles |");
    lines.push("|---|---|---|---|---|---:|---|");
    for (const c of allowToReduce.slice(0, 20)) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.friction.assetClass} | ${fmt(c.friction.totalFrictionPct)}% | ${c.friction.contextualPenalties.join(" ; ") || "—"} |`);
    }
    if (allowToReduce.length > 20) lines.push(`_${allowToReduce.length - 20} cellules supplémentaires non listées_`);
  }
  lines.push("");

  // 5. REDUCE / EXPERIMENTAL dégradés
  const otherDegrades = report.adjustedCells.filter((c) => c.degraded && c.originalDecision !== "ALLOW");
  lines.push("## 5. REDUCE et EXPERIMENTAL dégradés");
  lines.push("");
  if (!otherDegrades.length) {
    lines.push("_aucun_");
  } else {
    lines.push(`${otherDegrades.length} cellules. Premiers exemples :`);
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Original | Ajusté | Friction |");
    lines.push("|---|---|---|---|---|---|---:|");
    for (const c of otherDegrades.slice(0, 20)) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.originalDecision} | ${c.adjustedDecision} | ${fmt(c.friction.totalFrictionPct)}% |`);
    }
    if (otherDegrades.length > 20) lines.push(`_${otherDegrades.length - 20} cellules supplémentaires non listées_`);
  }
  lines.push("");

  // 6. Impact sur allocation plan
  lines.push("## 6. Impact sur allocation-plan");
  lines.push("");
  lines.push("Pour chaque position du plan d'allocation, suggestion de dégradation et poids ajustés indicatifs (le plan original sur disque n'est PAS modifié) :");
  lines.push("");
  lines.push("| # | Symbole | Setup | Régime | Tier | Friction | Suggestion | Poids orig. | Poids ajusté | Poids ajusté norm. |");
  lines.push("|---:|---|---|---|---|---:|---|---:|---:|---:|");
  for (const p of report.adjustedAllocation) {
    lines.push(`| ${p.rank} | ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.friction.totalFrictionPct)}% | ${p.adjustedWeightSuggestion} | ${fmt(p.originalWeightPct, 2)}% | ${fmt(p.adjustedWeightPct, 2)}% | ${fmt(p.adjustedWeightPctNormalized, 2)}% |`);
  }
  lines.push("");

  // 7. Positions les plus pénalisées
  lines.push("## 7. Positions les plus pénalisées (allocation-plan)");
  lines.push("");
  const allocSortedByFriction = [...report.adjustedAllocation].sort((a, b) => b.friction.totalFrictionPct - a.friction.totalFrictionPct);
  lines.push("Top 5 par friction totale :");
  lines.push("");
  lines.push("| Symbole | Classe | Profil | Friction | Pénalités |");
  lines.push("|---|---|---|---:|---|");
  for (const p of allocSortedByFriction.slice(0, 5)) {
    lines.push(`| ${p.symbol} | ${p.friction.assetClass} | ${p.friction.frictionProfile} | ${fmt(p.friction.totalFrictionPct)}% | ${p.friction.contextualPenalties.join(" ; ") || "—"} |`);
  }
  lines.push("");

  // 8. Positions robustes
  lines.push("## 8. Positions robustes après friction (allocation-plan)");
  lines.push("");
  const robust = report.adjustedAllocation.filter((p) => p.adjustedWeightSuggestion === "normal");
  if (!robust.length) {
    lines.push("_aucune position robuste — toutes ont une suggestion de dégradation_");
  } else {
    lines.push(`${robust.length} positions restent classées \`normal\` (friction < 0.25%) :`);
    lines.push("");
    lines.push("| Symbole | Setup | Régime | Tier | Friction |");
    lines.push("|---|---|---|---|---:|");
    for (const p of robust) {
      lines.push(`| ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.friction.totalFrictionPct)}% |`);
    }
  }
  lines.push("");

  // 9. Limites du modèle
  lines.push("## 9. Limites du modèle");
  lines.push("");
  lines.push("- **Modèle heuristique v1.** Pas de carnet d'ordre réel, pas de spread live, pas de barème broker. Les pourcentages reflètent un avis prudent, pas une mesure.");
  lines.push("- **Classification asset class best-effort.** Tout actif non listé tombe en `defensive_other` profil medium. À étendre si l'univers évolue.");
  lines.push("- **Pas de modélisation du market impact.** Une position grosse vs petite paie le même slippage en %. À raffiner si nécessaire en intégrant la taille de l'ordre vs volume moyen.");
  lines.push("- **Pas de distinction broker** (Interactive Brokers vs Alpaca vs Binance). Une fois un broker choisi, calibrer les commissionPct et spreadPct sur son barème réel.");
  lines.push("- **Pas de coût d'opportunité** ni de coût de financement (overnight rates pour positions levered).");
  lines.push("- **Le plan d'allocation original n'est pas modifié sur disque.** Les poids ajustés sont indicatifs ; la décision de réduire / retirer reste humaine.");
  lines.push("- **Pas de propagation arrière.** Les cellules dégradées par friction ne sont pas reflétées dans `tradable-universe.json` ni dans `allocation-plan.json`. Le rapport friction est une couche d'analyse en aval, pas une réécriture des sources.");
  lines.push("");

  // 10. Prochaine étape
  lines.push("## 10. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Calibration empirique** : après le premier paper trading live, mesurer les frictions réelles (commission, spread bid-ask, slippage observé) et ajuster les profils v1.");
  lines.push("- **Brancher le broker réel** : choisir un broker (Interactive Brokers, Alpaca, Binance, etc.) et substituer ses barèmes réels aux hypothèses v1.");
  lines.push("- **Friction-adjusted-allocation-engine v2** : générer un plan d'allocation qui intègre nativement la friction au lieu de la traiter en couche d'analyse aval.");
  lines.push("- **Sizing dépendant du volume** : raffiner le modèle slippage en fonction de la taille de l'ordre vs volume moyen de l'actif.");
  lines.push("- **Walk-forward roulant** : multi-splits pour réduire la dépendance au split unique 2021-2023 / 2024-2025 (priorité quant orthogonale).");
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error("[friction-model] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
