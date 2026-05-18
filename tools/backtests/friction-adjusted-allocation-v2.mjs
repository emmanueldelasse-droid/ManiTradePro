// tools/backtests/friction-adjusted-allocation-v2.mjs
//
// Allocation engine offline v2 — applique les suggestions du friction-model-v1
// au plan d'allocation existant et produit un plan ajusté plus prudent.
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun ordre
// broker, ne modifie aucun trade réel, ne touche aucun endpoint live. Il
// produit un plan théorique ajusté par friction.
//
// Le plan original `allocation-plan.json` n'est PAS modifié sur disque.
// Le rapport `friction-adjusted-report.json` n'est PAS modifié non plus.
// Tout est en lecture seule en entrée, écriture seule en sortie.
//
// Entrées :
//   - tools/backtests/output/allocation-plan.json
//   - tools/backtests/output/friction-adjusted-report.json
//
// Sorties :
//   - tools/backtests/output/allocation-plan-friction-adjusted.json
//   - tools/backtests/output/allocation-plan-friction-adjusted.md
//
// Logique :
//   1. Lire les deux sources.
//   2. Mapper friction.adjustedAllocation par (symbol, setup, variant, regime).
//   3. Appliquer le multiplier de réduction selon suggestion :
//        normal           → ×1.00
//        reduce_10_pct    → ×0.90
//        reduce_25_pct    → ×0.75
//        remove_candidate → ×0 (retiré)
//   4. Renormaliser les positions actives restantes à 100 %.
//   5. Lister les positions retirées séparément.
//
// Code de sortie : 1 si toutes les positions sont retirées, 0 sinon.
//
// Usage : node tools/backtests/friction-adjusted-allocation-v2.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_ALLOC = join(OUTPUT_DIR, "allocation-plan.json");
const INPUT_FRICTION = join(OUTPUT_DIR, "friction-adjusted-report.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "allocation-plan-friction-adjusted.json");
const OUTPUT_MD = join(OUTPUT_DIR, "allocation-plan-friction-adjusted.md");

// Multipliers par suggestion (friction-model-v1)
const ADJUSTMENT_MULTIPLIERS = {
  normal: 1.00,
  reduce_10_pct: 0.90,
  reduce_25_pct: 0.75,
  remove_candidate: 0.00,
};

const REASON_BY_SUGGESTION = {
  normal: "friction faible, poids conservé",
  reduce_10_pct: "friction modérée, poids réduit 10 %",
  reduce_25_pct: "friction élevée, poids réduit 25 %",
  remove_candidate: "friction extrême, position retirée",
};

async function tryRead(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Allocation Plan — Friction-Adjusted v2 — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/friction-adjusted-allocation-v2.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Plan théorique ajusté par friction.** Aucun ordre n'est passé. Le plan original `allocation-plan.json` et le rapport `friction-adjusted-report.json` sont inchangés sur disque. Ce rapport est une couche aval prudente, basée sur des hypothèses heuristiques v1.");
  lines.push("");

  // 1. Résumé global
  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Statut : ${report.status}`);
  lines.push(`- Positions originales : **${report.summary.originalPositions}**`);
  lines.push(`- Positions actives après ajustement : **${report.summary.activePositions}**`);
  lines.push(`- Positions retirées (\`remove_candidate\`) : **${report.summary.removedPositions}**`);
  lines.push(`- Positions réduites (\`reduce_10_pct\` ou \`reduce_25_pct\`) : **${report.summary.positionsReduced}**`);
  lines.push(`- Poids total original : ${fmt(report.summary.originalTotalWeight)} %`);
  lines.push(`- Poids total ajusté (normalisé) : ${fmt(report.summary.adjustedTotalWeight)} %`);
  lines.push(`- Pénalité brute totale (avant renormalisation) : ${fmt(report.summary.totalFrictionPenaltyPct)} % du portefeuille original`);
  lines.push("");

  // 2. Plan original vs plan ajusté
  lines.push("## 2. Plan original vs plan ajusté");
  lines.push("");
  lines.push("| # | Symbole | Setup | Régime | Tier | Poids orig. | Suggestion | Poids ajusté |");
  lines.push("|---:|---|---|---|---|---:|---|---:|");
  for (const p of report.positions) {
    lines.push(`| ${p.rank} | ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.originalWeightPct)} % | ${p.adjustment} | ${fmt(p.adjustedWeightPct)} % |`);
  }
  if (report.removedPositions.length) {
    lines.push("");
    lines.push("Positions retirées :");
    lines.push("");
    lines.push("| # | Symbole | Setup | Régime | Tier | Poids orig. | Raison |");
    lines.push("|---:|---|---|---|---|---:|---|");
    for (const p of report.removedPositions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.originalWeightPct)} % | ${p.reason} |`);
    }
  }
  lines.push("");

  // 3. Positions conservées
  const kept = report.positions.filter((p) => p.adjustment === "normal");
  lines.push("## 3. Positions conservées (poids inchangé avant renormalisation)");
  lines.push("");
  if (!kept.length) {
    lines.push("_aucune position avec friction faible (toutes ont subi au moins une dégradation)_");
  } else {
    lines.push("| Symbole | Setup | Régime | Tier | Friction | Poids orig. → ajusté |");
    lines.push("|---|---|---|---|---:|---|");
    for (const p of kept) {
      lines.push(`| ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.totalFrictionPct, 3)} % | ${fmt(p.originalWeightPct)} % → ${fmt(p.adjustedWeightPct)} % |`);
    }
  }
  lines.push("");

  // 4. Positions réduites
  const reduced = report.positions.filter((p) => p.adjustment === "reduce_10_pct" || p.adjustment === "reduce_25_pct");
  lines.push("## 4. Positions réduites");
  lines.push("");
  if (!reduced.length) {
    lines.push("_aucune position réduite_");
  } else {
    lines.push("| Symbole | Setup | Régime | Tier | Friction | Suggestion | Poids orig. → ajusté |");
    lines.push("|---|---|---|---|---:|---|---|");
    for (const p of reduced) {
      lines.push(`| ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.totalFrictionPct, 3)} % | ${p.adjustment} | ${fmt(p.originalWeightPct)} % → ${fmt(p.adjustedWeightPct)} % |`);
    }
  }
  lines.push("");

  // 5. Positions retirées
  lines.push("## 5. Positions retirées");
  lines.push("");
  if (!report.removedPositions.length) {
    lines.push("_aucune position retirée_");
  } else {
    lines.push("| Symbole | Setup | Régime | Tier | Friction | Raison |");
    lines.push("|---|---|---|---|---:|---|");
    for (const p of report.removedPositions) {
      lines.push(`| ${p.symbol} | ${p.setup} | ${p.regime} | ${p.compositeTier} | ${fmt(p.totalFrictionPct, 3)} % | ${p.reason} |`);
    }
  }
  lines.push("");

  // 6. Exposition ajustée par thème
  lines.push("## 6. Exposition ajustée par thème");
  lines.push("");
  lines.push("| Thème | Positions | Poids ajusté |");
  lines.push("|---|---:|---:|");
  for (const [theme, v] of Object.entries(report.summary.byTheme)) {
    lines.push(`| ${theme} | ${v.positions} | ${fmt(v.weightPct)} % |`);
  }
  lines.push("");

  // 7. Exposition ajustée par setup
  lines.push("## 7. Exposition ajustée par setup");
  lines.push("");
  lines.push("| Setup | Positions | Poids ajusté |");
  lines.push("|---|---:|---:|");
  for (const [setup, v] of Object.entries(report.summary.bySetup)) {
    lines.push(`| ${setup} | ${v.positions} | ${fmt(v.weightPct)} % |`);
  }
  lines.push("");

  // 8. Risques restants
  lines.push("## 8. Risques restants");
  lines.push("");
  if (report.warnings.length) {
    for (const w of report.warnings) lines.push(`- ⚠ ${w}`);
  } else {
    lines.push("_aucun warning_");
  }
  lines.push("");
  lines.push("Note structurelle : la renormalisation à 100 % peut **augmenter** le poids relatif final d'une position conservée, même si son poids brut n'a pas changé. Exemple : si VUG passe de 13.25 % à 13.25 % en absolu, mais que le total des autres positions a baissé, alors VUG passe à un % relatif plus élevé. Ce n'est PAS une promotion — c'est une conséquence mécanique du fait que d'autres positions ont été réduites ou retirées.");
  lines.push("");

  // 9. Limites
  lines.push("## 9. Limites de fiabilité");
  lines.push("");
  lines.push("- **Modèle de friction hérité de friction-model-v1** : heuristique v1, pas de données broker réelles. Voir `friction-adjusted-report.md` pour le détail des hypothèses.");
  lines.push("- **Pas de modification des sources** : `allocation-plan.json` et `friction-adjusted-report.json` restent inchangés. Ce moteur produit une vue alternative.");
  lines.push("- **Pas intégré dans le pipeline orchestré** (`run-quant-pipeline-v1.mjs`) pour l'instant. À ajouter explicitement si besoin.");
  lines.push("- **Renormalisation mécanique** : peut augmenter le poids relatif final d'une position conservée. Documenté ci-dessus.");
  lines.push("- **Si toutes les positions sont retirées** (status `failed`), le moteur sort avec exit code 1 — c'est volontaire pour ne pas laisser passer un portefeuille vide.");
  lines.push("- **Verdict ajusté ≠ autorisation live.** Cette PR reste offline.");
  lines.push("");

  // 10. Prochaine étape recommandée
  lines.push("## 10. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Validation humaine** : relire ce plan ajusté, comparer avec le plan original (`allocation-plan.md`), et accepter explicitement chaque dégradation.");
  lines.push("- **Calibration des frictions** : après le premier paper trading live, ajuster les profils du `friction-model-v1` avec des chiffres mesurés (commission réelle, spread observé, slippage moyen).");
  lines.push("- **Friction-aware allocation engine natif** : v3 pourrait intégrer la friction dès la sélection des positions (au lieu de la traiter en couche aval), pour éviter de remplir 10 slots avant de réduire 7.");
  lines.push("- **Intégration pipeline optionnelle** : étendre `run-quant-pipeline-v1.mjs` pour inclure cette 9e étape, si l'utilisateur le demande.");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("[friction-adjusted-allocation] démarrage");

  const alloc = await tryRead(INPUT_ALLOC);
  const friction = await tryRead(INPUT_FRICTION);

  if (!alloc) {
    console.error(`[friction-adjusted-allocation] source manquante : ${INPUT_ALLOC}`);
    console.error("Lancer d'abord : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }
  if (!friction) {
    console.error(`[friction-adjusted-allocation] source manquante : ${INPUT_FRICTION}`);
    console.error("Lancer d'abord : node tools/backtests/friction-model-v1.mjs");
    process.exit(1);
  }

  const originalPositions = Array.isArray(alloc.positions) ? alloc.positions : [];
  console.log(`[friction-adjusted-allocation] ${originalPositions.length} positions originales`);

  // Indexe friction.adjustedAllocation par (symbol, setup, variant, regime)
  const frictionIdx = {};
  for (const f of (friction.adjustedAllocation ?? [])) {
    const key = `${f.symbol}|${f.setup}|${f.regime}|${f.rank}`;
    frictionIdx[key] = f;
  }

  const activePositions = [];
  const removedPositions = [];
  let originalTotalWeight = 0;
  let preNormalizedTotalWeight = 0;
  let positionsReduced = 0;

  for (const p of originalPositions) {
    originalTotalWeight += p.weightPct;
    const key = `${p.symbol}|${p.setup}|${p.regime}|${p.rank}`;
    const f = frictionIdx[key];
    if (!f) {
      console.warn(`[friction-adjusted-allocation] aucune friction trouvée pour ${key} — position conservée à profil normal par défaut`);
    }
    const suggestion = f?.adjustedWeightSuggestion ?? "normal";
    const multiplier = ADJUSTMENT_MULTIPLIERS[suggestion] ?? 1.00;
    const preNormalizedWeight = Number((p.weightPct * multiplier).toFixed(4));
    const reason = REASON_BY_SUGGESTION[suggestion] ?? "—";

    const enriched = {
      rank: p.rank,
      symbol: p.symbol,
      setup: p.setup,
      variant: p.variant,
      regime: p.regime,
      compositeTier: p.compositeTier,
      theme: p.theme,
      originalWeightPct: p.weightPct,
      frictionProfile: f?.friction?.frictionProfile ?? null,
      totalFrictionPct: f?.friction?.totalFrictionPct ?? null,
      contextualPenalties: f?.friction?.contextualPenalties ?? [],
      adjustment: suggestion,
      preNormalizedWeightPct: preNormalizedWeight,
      adjustedWeightPct: 0, // calculé après renormalisation
      reason,
    };

    if (suggestion === "remove_candidate") {
      removedPositions.push(enriched);
    } else {
      if (suggestion !== "normal") positionsReduced++;
      preNormalizedTotalWeight += preNormalizedWeight;
      activePositions.push(enriched);
    }
  }

  // Renormalisation à 100 %
  if (preNormalizedTotalWeight > 0) {
    for (const p of activePositions) {
      p.adjustedWeightPct = Number(((p.preNormalizedWeightPct / preNormalizedTotalWeight) * 100).toFixed(2));
    }
  }

  const adjustedTotalWeight = activePositions.reduce((s, p) => s + p.adjustedWeightPct, 0);
  const totalFrictionPenaltyPct = Number((originalTotalWeight - preNormalizedTotalWeight).toFixed(2));

  // Statut + warnings
  const warnings = [];
  let status = "ok";
  if (activePositions.length === 0) {
    status = "failed";
    warnings.push("Toutes les positions ont été retirées par le filtre friction. Aucun plan tradable disponible.");
  }
  if (activePositions.length > 0 && activePositions.length < 3) {
    warnings.push(`Seulement ${activePositions.length} position(s) active(s) après ajustement — diversification très faible.`);
  }
  if (removedPositions.length > 0) {
    warnings.push(`${removedPositions.length} position(s) retirée(s) par friction extrême : ${removedPositions.map((p) => p.symbol).join(", ")}.`);
  }
  // Position dont le poids ajusté final > 25 % : concentration
  for (const p of activePositions) {
    if (p.adjustedWeightPct > 25) {
      warnings.push(`${p.symbol} pèse ${fmt(p.adjustedWeightPct)} % du portefeuille ajusté — concentration élevée due à la renormalisation après dégradation des autres positions.`);
    }
  }

  // Distribution par thème et setup (sur positions actives)
  const byTheme = {};
  const bySetup = {};
  for (const p of activePositions) {
    if (!byTheme[p.theme]) byTheme[p.theme] = { positions: 0, weightPct: 0 };
    byTheme[p.theme].positions++;
    byTheme[p.theme].weightPct += p.adjustedWeightPct;
    if (!bySetup[p.setup]) bySetup[p.setup] = { positions: 0, weightPct: 0 };
    bySetup[p.setup].positions++;
    bySetup[p.setup].weightPct += p.adjustedWeightPct;
  }
  for (const v of Object.values(byTheme)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(bySetup)) v.weightPct = Number(v.weightPct.toFixed(2));

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      allocationPlan: relative(REPO_ROOT, INPUT_ALLOC),
      frictionReport: relative(REPO_ROOT, INPUT_FRICTION),
    },
    status,
    summary: {
      originalPositions: originalPositions.length,
      activePositions: activePositions.length,
      removedPositions: removedPositions.length,
      positionsReduced,
      originalTotalWeight: Number(originalTotalWeight.toFixed(2)),
      preNormalizedTotalWeight: Number(preNormalizedTotalWeight.toFixed(2)),
      adjustedTotalWeight: Number(adjustedTotalWeight.toFixed(2)),
      totalFrictionPenaltyPct,
      byTheme,
      bySetup,
    },
    positions: activePositions,
    removedPositions,
    warnings,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[friction-adjusted-allocation] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Statut : ${status}`);
  console.log(`Positions : ${originalPositions.length} originales → ${activePositions.length} actives + ${removedPositions.length} retirées`);
  console.log(`Pénalité brute totale : ${fmt(totalFrictionPenaltyPct)} % du portefeuille original`);
  if (warnings.length) {
    console.log("Warnings :");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (status === "failed") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[friction-adjusted-allocation] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
