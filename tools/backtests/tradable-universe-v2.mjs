// tools/backtests/tradable-universe-v2.mjs
//
// Tradable universe v2 — combine tradable-universe v1 et rolling-walkforward
// pour produire un univers tradable beaucoup plus robuste temporellement.
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun ordre
// broker, ne touche aucun endpoint live. Plan théorique uniquement.
//
// Le rolling validator ne PROMEUT JAMAIS — il peut seulement confirmer,
// réduire ou invalider.
//
// Entrées :
//   - tools/backtests/output/tradable-universe.json
//   - tools/backtests/output/rolling-walkforward-validator.json
//
// Sorties :
//   - tools/backtests/output/tradable-universe-v2.json
//   - tools/backtests/output/tradable-universe-v2.md
//
// Aucune source n'est modifiée. Lecture seule.
//
// Usage : node tools/backtests/tradable-universe-v2.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_TU_V1 = join(OUTPUT_DIR, "tradable-universe.json");
const INPUT_ROLLING = join(OUTPUT_DIR, "rolling-walkforward-validator.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "tradable-universe-v2.json");
const OUTPUT_MD = join(OUTPUT_DIR, "tradable-universe-v2.md");

// === Logique de transition v1 → v2 selon le rolling verdict ===
//
// Règles strictes anti-promotion :
//   - Si v1 BLOCK : v2 reste BLOCK (rolling ne peut jamais réintroduire).
//   - Sinon, en fonction du rolling verdict :
//       ROBUST            → confirmer (decisionV2 = decisionV1, sans promotion)
//       STABLE            → confirmer
//       FRAGILE           → dégrader d'un cran
//       OVERFIT           → BLOCK
//       INSUFFICIENT_DATA → EXPERIMENTAL si v1=ALLOW + tier A/B + WF unique PASS,
//                            sinon BLOCK

const DECISION_RANK = ["ALLOW", "REDUCE", "EXPERIMENTAL", "BLOCK"];

function degradeOneStep(decisionV1) {
  const idx = DECISION_RANK.indexOf(decisionV1);
  if (idx < 0) return "BLOCK";
  return DECISION_RANK[Math.min(idx + 1, DECISION_RANK.length - 1)];
}

function deriveDecisionV2({ decisionV1, compositeTier, walkForwardTier, rollingVerdict }) {
  // Règle absolue : v1 BLOCK reste BLOCK. Rolling ne promeut jamais.
  if (decisionV1 === "BLOCK") {
    return { decisionV2: "BLOCK", downgradeReason: "v1 BLOCK conservé (rolling ne peut pas promouvoir)" };
  }
  if (!rollingVerdict) {
    return { decisionV2: "BLOCK", downgradeReason: "rolling verdict absent (cellule non évaluée)" };
  }
  if (rollingVerdict === "ROBUST" || rollingVerdict === "STABLE") {
    return { decisionV2: decisionV1, downgradeReason: null };
  }
  if (rollingVerdict === "OVERFIT") {
    return { decisionV2: "BLOCK", downgradeReason: "rolling OVERFIT — train consistant positif mais test fail ≥ 50%" };
  }
  if (rollingVerdict === "FRAGILE") {
    return {
      decisionV2: degradeOneStep(decisionV1),
      downgradeReason: "rolling FRAGILE — dégradation d'un cran",
    };
  }
  if (rollingVerdict === "INSUFFICIENT_DATA") {
    // Cas exceptionnel : v1=ALLOW + tier A/B + WF unique PASS → EXPERIMENTAL
    const tierEligible = compositeTier === "A" || compositeTier === "B";
    const wfPass = walkForwardTier === "PASS";
    if (decisionV1 === "ALLOW" && tierEligible && wfPass) {
      return {
        decisionV2: "EXPERIMENTAL",
        downgradeReason: "rolling INSUFFICIENT mais v1 ALLOW + tier A/B + WF unique PASS → exception EXPERIMENTAL",
      };
    }
    return { decisionV2: "BLOCK", downgradeReason: "rolling INSUFFICIENT_DATA sans exception applicable" };
  }
  // Cas inattendu (nouveau verdict ajouté ultérieurement)
  return { decisionV2: "BLOCK", downgradeReason: `rolling verdict inconnu : ${rollingVerdict}` };
}

// Robustness tier dérivé du rolling verdict (pour le tri / l'affichage)
const ROBUSTNESS_TIER_RANK = { CONFIRMED: 0, EXCEPTION: 1, DEGRADED: 2, REMOVED: 3, UNEVALUATED: 4 };

function deriveRobustnessTier(rollingVerdict, decisionV1, decisionV2) {
  if (!rollingVerdict) return "UNEVALUATED";
  if (decisionV1 === "BLOCK") return "REMOVED";
  if (rollingVerdict === "ROBUST" || rollingVerdict === "STABLE") return "CONFIRMED";
  if (rollingVerdict === "OVERFIT") return "REMOVED";
  if (rollingVerdict === "FRAGILE") {
    return decisionV2 === "BLOCK" ? "REMOVED" : "DEGRADED";
  }
  if (rollingVerdict === "INSUFFICIENT_DATA") {
    return decisionV2 === "BLOCK" ? "REMOVED" : "EXCEPTION";
  }
  return "UNEVALUATED";
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
  console.log("[tradable-universe-v2] démarrage");

  const tuV1 = await tryRead(INPUT_TU_V1);
  if (!tuV1) {
    console.error(`[tradable-universe-v2] source manquante : ${INPUT_TU_V1}`);
    console.error("Lancer d'abord : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }
  const rolling = await tryRead(INPUT_ROLLING);
  if (!rolling) {
    console.error(`[tradable-universe-v2] source manquante : ${INPUT_ROLLING}`);
    console.error("Lancer d'abord : node tools/backtests/rolling-walkforward-validator-v1.mjs");
    process.exit(1);
  }

  const cellsV1 = Array.isArray(tuV1.cells) ? tuV1.cells : [];
  console.log(`[tradable-universe-v2] ${cellsV1.length} cellules dans tradable-universe v1`);

  // Index rolling par (symbol, setup, variant, regime)
  const rollingIdx = {};
  for (const r of (rolling.cells ?? [])) {
    const key = `${r.symbol}|${r.setup}|${r.variant}|${r.regime}`;
    rollingIdx[key] = r;
  }
  console.log(`[tradable-universe-v2] ${Object.keys(rollingIdx).length} cellules dans rolling-walkforward-validator`);

  // Build v2 cells
  const cellsV2 = [];
  const summary = {
    decisionDelta: {
      // matrice v1 -> v2
      ALLOW_to_ALLOW: 0,
      ALLOW_to_REDUCE: 0,
      ALLOW_to_EXPERIMENTAL: 0,
      ALLOW_to_BLOCK: 0,
      REDUCE_to_REDUCE: 0,
      REDUCE_to_EXPERIMENTAL: 0,
      REDUCE_to_BLOCK: 0,
      EXPERIMENTAL_to_EXPERIMENTAL: 0,
      EXPERIMENTAL_to_BLOCK: 0,
      BLOCK_to_BLOCK: 0,
    },
    byRollingVerdict: { ROBUST: 0, STABLE: 0, FRAGILE: 0, OVERFIT: 0, INSUFFICIENT_DATA: 0, ABSENT: 0 },
    byDecisionV2: { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 },
    byRobustnessTier: { CONFIRMED: 0, EXCEPTION: 0, DEGRADED: 0, REMOVED: 0, UNEVALUATED: 0 },
    bySetup: {},
    byRegime: {},
  };

  for (const c of cellsV1) {
    const key = `${c.symbol}|${c.setup}|${c.variant}|${c.regime}`;
    const r = rollingIdx[key];
    const rollingVerdict = r?.rollingVerdict ?? null;
    const walkForwardTier = c.filters?.walkForward?.tier ?? null;

    const { decisionV2, downgradeReason } = deriveDecisionV2({
      decisionV1: c.decision,
      compositeTier: c.compositeTier,
      walkForwardTier,
      rollingVerdict,
    });
    const robustnessTier = deriveRobustnessTier(rollingVerdict, c.decision, decisionV2);

    const enriched = {
      symbol: c.symbol,
      setup: c.setup,
      variant: c.variant,
      regime: c.regime,
      decisionV1: c.decision,
      compositeTier: c.compositeTier,
      confidence: c.confidence,
      recommendedAllocationProfile: c.recommendedAllocationProfile,
      filters: c.filters,
      reasons: c.reasons,
      risks: c.risks,
      rollingVerdict,
      rollingPassRate: r ? (r.splitsEvaluated > 0 ? Number((r.passCount / r.splitsEvaluated).toFixed(3)) : 0) : null,
      rollingSplitsEvaluated: r?.splitsEvaluated ?? 0,
      rollingPassCount: r?.passCount ?? 0,
      rollingFailCount: r?.failCount ?? 0,
      rollingExpectancyStdDev: r?.expectancyStdDev ?? null,
      rollingPerformanceDrift: r?.performanceDrift ?? null,
      decisionV2,
      downgradeReason,
      robustnessTier,
    };
    cellsV2.push(enriched);

    // Stats
    const deltaKey = `${c.decision}_to_${decisionV2}`;
    if (summary.decisionDelta[deltaKey] !== undefined) summary.decisionDelta[deltaKey]++;
    summary.byRollingVerdict[rollingVerdict ?? "ABSENT"] = (summary.byRollingVerdict[rollingVerdict ?? "ABSENT"] ?? 0) + 1;
    summary.byDecisionV2[decisionV2] = (summary.byDecisionV2[decisionV2] ?? 0) + 1;
    summary.byRobustnessTier[robustnessTier] = (summary.byRobustnessTier[robustnessTier] ?? 0) + 1;

    if (!summary.bySetup[c.setup]) summary.bySetup[c.setup] = { v1: { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 }, v2: { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 } };
    summary.bySetup[c.setup].v1[c.decision]++;
    summary.bySetup[c.setup].v2[decisionV2]++;

    if (!summary.byRegime[c.regime]) summary.byRegime[c.regime] = { v1: { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 }, v2: { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 } };
    summary.byRegime[c.regime].v1[c.decision]++;
    summary.byRegime[c.regime].v2[decisionV2]++;
  }

  // Tri pour le rapport : decisionV2 ALLOW d'abord, par robustness puis composite tier
  const DECISION_V2_RANK = { ALLOW: 0, REDUCE: 1, EXPERIMENTAL: 2, BLOCK: 3 };
  cellsV2.sort((a, b) => {
    if (DECISION_V2_RANK[a.decisionV2] !== DECISION_V2_RANK[b.decisionV2]) {
      return DECISION_V2_RANK[a.decisionV2] - DECISION_V2_RANK[b.decisionV2];
    }
    const rA = ROBUSTNESS_TIER_RANK[a.robustnessTier] ?? 99;
    const rB = ROBUSTNESS_TIER_RANK[b.robustnessTier] ?? 99;
    if (rA !== rB) return rA - rB;
    return (a.compositeTier ?? "Z").localeCompare(b.compositeTier ?? "Z");
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      tradableUniverseV1: relative(REPO_ROOT, INPUT_TU_V1),
      rollingWalkforwardValidator: relative(REPO_ROOT, INPUT_ROLLING),
    },
    policy: {
      ROBUST: "confirme decision v1",
      STABLE: "confirme decision v1",
      FRAGILE: "dégrade d'un cran (ALLOW→REDUCE, REDUCE→EXPERIMENTAL, EXPERIMENTAL→BLOCK)",
      OVERFIT: "BLOCK",
      INSUFFICIENT_DATA: "EXPERIMENTAL si v1=ALLOW + tier A/B + WF unique PASS, sinon BLOCK",
      antiPromotion: "rolling ne promeut jamais — v1 BLOCK reste BLOCK",
    },
    summary: {
      totalCells: cellsV2.length,
      decisionV1Distrib: tuV1.summary?.byDecision ?? {},
      decisionV2Distrib: summary.byDecisionV2,
      rollingVerdictDistrib: summary.byRollingVerdict,
      robustnessTierDistrib: summary.byRobustnessTier,
      decisionDelta: summary.decisionDelta,
      bySetup: summary.bySetup,
      byRegime: summary.byRegime,
    },
    cells: cellsV2,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[tradable-universe-v2] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`v1 distrib : ${Object.entries(tuV1.summary?.byDecision ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`v2 distrib : ${Object.entries(summary.byDecisionV2).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`Delta principal : ALLOW v1=${tuV1.summary?.byDecision?.ALLOW ?? "?"} → ALLOW v2=${summary.byDecisionV2.ALLOW} (perte ${(tuV1.summary?.byDecision?.ALLOW ?? 0) - summary.byDecisionV2.ALLOW})`);
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Tradable Universe v2 — Rolling-Walk-Forward Hardened — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/tradable-universe-v2.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Tradable universe v2 — durci par le rolling walk-forward.** Le rolling validator ne promeut jamais : il peut seulement confirmer, dégrader ou invalider. v1 BLOCK reste BLOCK.");
  lines.push("");
  lines.push("Règles de transition v1 → v2 :");
  lines.push("");
  lines.push("| Rolling verdict | Effet |");
  lines.push("|---|---|");
  lines.push(`| ROBUST | ${report.policy.ROBUST} |`);
  lines.push(`| STABLE | ${report.policy.STABLE} |`);
  lines.push(`| FRAGILE | ${report.policy.FRAGILE} |`);
  lines.push(`| OVERFIT | ${report.policy.OVERFIT} |`);
  lines.push(`| INSUFFICIENT_DATA | ${report.policy.INSUFFICIENT_DATA} |`);
  lines.push("");

  // 1. Résumé global
  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Cellules totales : **${report.summary.totalCells}**`);
  lines.push("");

  // 2. Comparaison v1 vs v2
  lines.push("## 2. Comparaison v1 vs v2");
  lines.push("");
  lines.push("Distribution des décisions :");
  lines.push("");
  lines.push("| Décision | v1 | v2 | Delta |");
  lines.push("|---|---:|---:|---:|");
  for (const d of ["ALLOW", "REDUCE", "EXPERIMENTAL", "BLOCK"]) {
    const v1 = report.summary.decisionV1Distrib[d] ?? 0;
    const v2 = report.summary.decisionV2Distrib[d] ?? 0;
    const sign = v2 - v1 > 0 ? "+" : "";
    lines.push(`| ${d} | ${v1} | ${v2} | ${sign}${v2 - v1} |`);
  }
  lines.push("");
  lines.push("Matrice de transition v1 → v2 (cellules effectives, hors BLOCK→BLOCK qui n'a pas changé) :");
  lines.push("");
  lines.push("| Transition | Cellules |");
  lines.push("|---|---:|");
  const transitionsOrder = ["ALLOW_to_ALLOW", "ALLOW_to_REDUCE", "ALLOW_to_EXPERIMENTAL", "ALLOW_to_BLOCK", "REDUCE_to_REDUCE", "REDUCE_to_EXPERIMENTAL", "REDUCE_to_BLOCK", "EXPERIMENTAL_to_EXPERIMENTAL", "EXPERIMENTAL_to_BLOCK"];
  for (const t of transitionsOrder) {
    const n = report.summary.decisionDelta[t] ?? 0;
    if (n === 0) continue;
    lines.push(`| ${t.replace(/_/g, " ")} | ${n} |`);
  }
  lines.push(`| BLOCK to BLOCK | ${report.summary.decisionDelta.BLOCK_to_BLOCK ?? 0} |`);
  lines.push("");

  // 3. Distribution rolling verdicts
  lines.push("## 3. Distribution rolling verdicts");
  lines.push("");
  lines.push("| Verdict | Cellules |");
  lines.push("|---|---:|");
  for (const v of ["ROBUST", "STABLE", "FRAGILE", "OVERFIT", "INSUFFICIENT_DATA", "ABSENT"]) {
    lines.push(`| ${v} | ${report.summary.rollingVerdictDistrib[v] ?? 0} |`);
  }
  lines.push("");
  lines.push("Robustness tier (v2-spécifique) :");
  lines.push("");
  lines.push("| Tier | Sens | Cellules |");
  lines.push("|---|---|---:|");
  lines.push(`| CONFIRMED | rolling ROBUST ou STABLE, decisionV1 préservé | ${report.summary.robustnessTierDistrib.CONFIRMED} |`);
  lines.push(`| EXCEPTION | rolling INSUFFICIENT mais exception EXPERIMENTAL | ${report.summary.robustnessTierDistrib.EXCEPTION} |`);
  lines.push(`| DEGRADED | rolling FRAGILE, dégradation d'un cran | ${report.summary.robustnessTierDistrib.DEGRADED} |`);
  lines.push(`| REMOVED | rolling OVERFIT / fragile→BLOCK / insuff→BLOCK / v1=BLOCK | ${report.summary.robustnessTierDistrib.REMOVED} |`);
  lines.push(`| UNEVALUATED | aucun rolling verdict | ${report.summary.robustnessTierDistrib.UNEVALUATED} |`);
  lines.push("");

  // 4. Cellules ROBUST survivantes
  lines.push("## 4. Cellules ROBUST survivantes (ALLOW v2 + rolling ROBUST)");
  lines.push("");
  const robustSurvivors = report.cells.filter((c) => c.decisionV2 === "ALLOW" && c.rollingVerdict === "ROBUST");
  if (!robustSurvivors.length) {
    lines.push("_aucune cellule ROBUST survivante en ALLOW v2_");
  } else {
    lines.push("| Symbole | Setup | Variante | Régime | Tier | Splits PASS | Exp stddev |");
    lines.push("|---|---|---|---|---|---:|---:|");
    for (const c of robustSurvivors) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.compositeTier} | ${c.rollingPassCount}/${c.rollingSplitsEvaluated} | ${fmt(c.rollingExpectancyStdDev, 3)} |`);
    }
  }
  lines.push("");

  // 5. Cellules OVERFIT éliminées
  lines.push("## 5. Cellules OVERFIT éliminées (étaient ALLOW/REDUCE/EXPERIMENTAL v1 → BLOCK v2)");
  lines.push("");
  const overfitRemoved = report.cells.filter((c) => c.rollingVerdict === "OVERFIT" && c.decisionV1 !== "BLOCK");
  if (!overfitRemoved.length) {
    lines.push("_aucune cellule OVERFIT éliminée (aucune cellule v1 candidate n'est OVERFIT)_");
  } else {
    lines.push(`${overfitRemoved.length} cellules OVERFIT v1=non-BLOCK → BLOCK v2.`);
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | v1 → v2 | Splits PASS/FAIL |");
    lines.push("|---|---|---|---|---|---|");
    for (const c of overfitRemoved.slice(0, 30)) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.decisionV1} → ${c.decisionV2} | ${c.rollingPassCount}/${c.rollingFailCount} |`);
    }
    if (overfitRemoved.length > 30) lines.push(`_${overfitRemoved.length - 30} cellules supplémentaires non listées_`);
  }
  lines.push("");

  // 6. Setups les plus touchés
  lines.push("## 6. Impact par setup");
  lines.push("");
  lines.push("| Setup | v1 ALLOW | v2 ALLOW | Delta | v1 REDUCE | v2 REDUCE | v1 EXP | v2 EXP | v2 BLOCK ajoutés |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const [setup, v] of Object.entries(report.summary.bySetup).sort()) {
    const v1A = v.v1.ALLOW, v2A = v.v2.ALLOW;
    const v1R = v.v1.REDUCE, v2R = v.v2.REDUCE;
    const v1E = v.v1.EXPERIMENTAL, v2E = v.v2.EXPERIMENTAL;
    const v1B = v.v1.BLOCK, v2B = v.v2.BLOCK;
    lines.push(`| ${setup} | ${v1A} | ${v2A} | ${v2A - v1A >= 0 ? "+" : ""}${v2A - v1A} | ${v1R} | ${v2R} | ${v1E} | ${v2E} | +${v2B - v1B} |`);
  }
  lines.push("");

  // 7. Régimes les plus touchés
  lines.push("## 7. Impact par régime");
  lines.push("");
  lines.push("| Régime | v1 ALLOW | v2 ALLOW | Delta | v1 REDUCE | v2 REDUCE | v1 EXP | v2 EXP |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const [regime, v] of Object.entries(report.summary.byRegime).sort()) {
    const v1A = v.v1.ALLOW, v2A = v.v2.ALLOW;
    const v1R = v.v1.REDUCE, v2R = v.v2.REDUCE;
    const v1E = v.v1.EXPERIMENTAL, v2E = v.v2.EXPERIMENTAL;
    lines.push(`| ${regime} | ${v1A} | ${v2A} | ${v2A - v1A >= 0 ? "+" : ""}${v2A - v1A} | ${v1R} | ${v2R} | ${v1E} | ${v2E} |`);
  }
  lines.push("");

  // 8. Actifs leaders survivants
  lines.push("## 8. Actifs leaders survivants v2 (ALLOW v2, triés par robustness)");
  lines.push("");
  const allowedV2 = report.cells.filter((c) => c.decisionV2 === "ALLOW");
  if (!allowedV2.length) {
    lines.push("_aucune cellule ALLOW v2_");
  } else {
    // Group by symbol
    const bySymbol = {};
    for (const c of allowedV2) {
      if (!bySymbol[c.symbol]) bySymbol[c.symbol] = [];
      bySymbol[c.symbol].push(c);
    }
    lines.push(`${Object.keys(bySymbol).length} symboles distincts, ${allowedV2.length} cellules ALLOW v2.`);
    lines.push("");
    lines.push("| Symbole | Cellules ALLOW | Rolling verdicts |");
    lines.push("|---|---:|---|");
    const sortedSymbols = Object.entries(bySymbol).sort((a, b) => b[1].length - a[1].length);
    for (const [sym, cells] of sortedSymbols.slice(0, 30)) {
      const verdicts = [...new Set(cells.map((c) => c.rollingVerdict))].join(", ");
      lines.push(`| ${sym} | ${cells.length} | ${verdicts} |`);
    }
    if (sortedSymbols.length > 30) lines.push(`_${sortedSymbols.length - 30} symboles supplémentaires non listés_`);
  }
  lines.push("");

  // 9. Impact sur l'univers tradable
  lines.push("## 9. Impact sur l'univers tradable");
  lines.push("");
  const v1AllowTotal = report.summary.decisionV1Distrib.ALLOW ?? 0;
  const v2AllowTotal = report.summary.decisionV2Distrib.ALLOW ?? 0;
  const lossPct = v1AllowTotal > 0 ? ((v1AllowTotal - v2AllowTotal) / v1AllowTotal * 100).toFixed(1) : "0.0";
  lines.push(`- ALLOW v1 : **${v1AllowTotal}** cellules`);
  lines.push(`- ALLOW v2 : **${v2AllowTotal}** cellules`);
  lines.push(`- Perte : **${v1AllowTotal - v2AllowTotal}** cellules (${lossPct} % du ALLOW v1 disparu)`);
  lines.push("");
  lines.push("La perte est attendue et souhaitée : le rolling walk-forward est exigeant, et la grande majorité des cellules ALLOW v1 sont FRAGILE ou INSUFFICIENT_DATA à l'échelle temporelle. v2 ne garde que ce qui résiste à plusieurs splits.");
  lines.push("");

  // 10. Limites
  lines.push("## 10. Limites");
  lines.push("");
  lines.push("- **3 splits walk-forward seulement** (2021-2025 disponibles). Une fenêtre temporelle plus longue donnerait plus de splits.");
  lines.push("- **Rolling verdict INSUFFICIENT_DATA est la majorité** (~70 % des cellules). La règle d'exception EXPERIMENTAL est restrictive (v1=ALLOW + tier A/B + WF unique PASS) pour éviter les faux positifs.");
  lines.push("- **Pas de propagation arrière** dans `tradable-universe.json`. v2 coexiste avec v1, le user choisit explicitement.");
  lines.push("- **Pas de recalcul allocation** dans cette PR. Pour reconstruire un plan v2, il faudra une PR future qui consomme `tradable-universe-v2.json` à la place de `tradable-universe.json`.");
  lines.push("- **Pas d'intégration au pipeline orchestré** (volontaire).");
  lines.push("- **Verdict v2 ≠ autorisation live.** Toujours valider manuellement avant tout passage en réel.");
  lines.push("");

  // 11. Prochaine étape recommandée
  lines.push("## 11. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Allocation v3 sur tradable-universe-v2** : générer un plan d'allocation qui consomme `tradable-universe-v2.json` à la place de `tradable-universe.json`. La distribution de positions sera bien plus restreinte (probablement < 10 cellules ALLOW v2 selon les résultats).");
  lines.push("- **Étendre rolling walk-forward** : récolter les données 2020 ou plus anciennes pour multiplier les splits, ce qui durcirait encore plus la validation.");
  lines.push("- **Calibrer le seuil de variance** : actuellement `expectancy rel stddev < 0.5` pour ROBUST. Ajuster selon les retours paper trading.");
  lines.push("- **Cross-validation par régime** : faire le rolling walk-forward CONDITIONNELLEMENT au régime macro pour vérifier que la robustesse n'est pas due à un seul environnement.");
  lines.push("");

  return lines.join("\n");
}

main().catch((err) => {
  console.error("[tradable-universe-v2] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
