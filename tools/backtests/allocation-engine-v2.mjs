// tools/backtests/allocation-engine-v2.mjs
//
// Allocation engine v2 — ManiTradePro.
// Produit un plan d'allocation théorique qui respecte non seulement les caps
// larges du v1 (tech_ai 60 %, crypto 25 %, leveraged 5 %, etc.) mais aussi
// des caps fins par sous-thème (us_growth_etf ≤ 30 %, mega_cap_tech ≤ 25 %,
// software_saas ≤ 25 %, etc.) afin de bloquer les portefeuilles faussement
// diversifiés détectés par theme-classification-v2.
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun ordre
// broker, ne touche aucun endpoint live. Plan théorique uniquement.
//
// Entrées :
//   - tools/backtests/output/tradable-universe.json
//   - tools/backtests/output/theme-classification-v2.json
//
// Sorties :
//   - tools/backtests/output/allocation-plan-v2.json
//   - tools/backtests/output/allocation-plan-v2.md
//
// Pour comparaison avec v1, le moteur lit aussi `allocation-plan.json` si
// disponible (lecture seule). Aucune source n'est modifiée.
//
// Usage : node tools/backtests/allocation-engine-v2.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import {
  THEME_CLASSIFICATION as CLASSIFICATION,
  FINE_THEME_CAPS,
  classifySymbolThemes,
} from "./lib/theme-table.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_TU = join(OUTPUT_DIR, "tradable-universe.json");
const INPUT_THEMES = join(OUTPUT_DIR, "theme-classification-v2.json");
const INPUT_V1 = join(OUTPUT_DIR, "allocation-plan.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "allocation-plan-v2.json");
const OUTPUT_MD = join(OUTPUT_DIR, "allocation-plan-v2.md");

// === Politique v2 ===

// Unités de base par tier (identique v1)
const BASE_UNITS = { A: 1.0, B: 0.7, C: 0.35, D: 0.10 };

// Caps larges hérités du v1 (broad themes)
const BROAD_CAPS = {
  maxPositions: 10,
  maxExperimentalPositions: 2,
  byBroadTheme: {
    crypto: 0.25,
    tech_ai: 0.60,
    leveraged: 0.05,
  },
  bySetup: {
    PULLBACK_MOMENTUM: 0.50,
    RELATIVE_STRENGTH_ROTATION: 0.35,
    BREAKOUT_EXPANSION: 0.25,
    MEAN_REVERSION: 0.0,
    VOLATILITY_COMPRESSION: 0.0,
  },
};


// Budget cible pour évaluer les caps en absolu pendant la construction greedy
// (identique au pattern v1 : sans ça, le 1er candidat dépasserait toujours).
const TARGET_BUDGET = BROAD_CAPS.maxPositions * BASE_UNITS.B; // 7.0 unités


const PRIORITY_SETUPS = new Set(["PULLBACK_MOMENTUM", "RELATIVE_STRENGTH_ROTATION", "BREAKOUT_EXPANSION"]);
const NON_PRIORITY_SETUPS = new Set(["MEAN_REVERSION", "VOLATILITY_COMPRESSION"]);
const CRYPTO_PURE = new Set(["BTC", "ETH", "SOL", "AVAX", "BNB", "LINK"]);
const CRYPTO_CORRELATED = new Set(["MSTR", "COIN", "IBIT"]);
const LEVERAGED = new Set(["SOXL", "USD", "ROM", "TQQQ", "SQQQ", "UPRO"]);

const TECH_AI_BROAD = new Set([]); // dérivé à partir des sous-thèmes
const TECH_AI_FINE_THEMES = new Set([
  "semis_pure", "semis_equipment", "ai_hypergrowth", "software_saas",
  "cybersecurity", "cloud_platform", "us_growth_etf", "mega_cap_tech",
]);

function classifyBroadTheme(symbol) {
  if (LEVERAGED.has(symbol)) return "leveraged";
  if (CRYPTO_PURE.has(symbol) || CRYPTO_CORRELATED.has(symbol)) return "crypto";
  const cls = CLASSIFICATION[symbol];
  if (!cls) return "defensive_other";
  // Si un sous-thème "tech_ai" → broad theme tech_ai
  if (cls.themes.some((t) => TECH_AI_FINE_THEMES.has(t))) return "tech_ai";
  return "defensive_other";
}

function classifyFineThemes(symbol) {
  const cls = CLASSIFICATION[symbol];
  if (!cls) return { themes: [], confidence: "UNKNOWN" };
  return { themes: cls.themes, confidence: cls.confidence };
}

// === Tri / dédup (identique v1) ===

const TIER_RANK = { A: 0, B: 1, C: 2, D: 3, BLOCKED: 99 };
const CONFIDENCE_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const WF_RANK = { PASS: 0, WATCH: 1, INSUFFICIENT_DATA: 2, FAIL: 99 };

function compareCells(a, b) {
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

function dedupePerSymbolSetupRegime(cells) {
  const groups = new Map();
  for (const c of cells) {
    const key = `${c.symbol}|${c.setup}|${c.regime}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const out = [];
  for (const group of groups.values()) {
    group.sort(compareCells);
    out.push(group[0]);
  }
  return out;
}

// === Construction du portefeuille avec caps fins ===

function tryAdd(portfolio, cell) {
  if (NON_PRIORITY_SETUPS.has(cell.setup)) {
    return { ok: false, reason: `setup non prioritaire (${cell.setup}) interdit`, reasonShort: "setup non prioritaire" };
  }
  if (portfolio.positions.length >= BROAD_CAPS.maxPositions) {
    return { ok: false, reason: `max ${BROAD_CAPS.maxPositions} positions atteintes`, reasonShort: "max positions" };
  }
  if (portfolio.symbols.has(cell.symbol)) {
    return { ok: false, reason: `symbole ${cell.symbol} déjà en portefeuille`, reasonShort: "duplicate symbol" };
  }
  if (cell.compositeTier === "D" && portfolio.dCount >= BROAD_CAPS.maxExperimentalPositions) {
    return { ok: false, reason: `max ${BROAD_CAPS.maxExperimentalPositions} EXPERIMENTAL atteintes`, reasonShort: "max EXPERIMENTAL" };
  }

  const broadTheme = classifyBroadTheme(cell.symbol);
  const fineCls = classifyFineThemes(cell.symbol);
  const isLeveraged = LEVERAGED.has(cell.symbol);

  // Unité de base — leveraged forcé à C max
  let baseUnit = BASE_UNITS[cell.compositeTier] ?? 0;
  if (isLeveraged && baseUnit > BASE_UNITS.C) baseUnit = BASE_UNITS.C;
  // Symbole UNKNOWN : limité à allocation micro (D unit)
  if (fineCls.confidence === "UNKNOWN") {
    baseUnit = Math.min(baseUnit, BASE_UNITS.D);
  }
  if (baseUnit <= 0) {
    return { ok: false, reason: `unité de base 0 (tier ${cell.compositeTier})`, reasonShort: "base unit zero" };
  }

  // Caps larges (v1)
  const futureBroad = (portfolio.byBroadTheme[broadTheme] || 0) + baseUnit;
  const broadCap = BROAD_CAPS.byBroadTheme[broadTheme];
  if (broadCap !== undefined) {
    const capAbs = broadCap * TARGET_BUDGET;
    if (futureBroad > capAbs + 1e-9) {
      return { ok: false, reason: `cap broad ${broadTheme} dépasserait ${(broadCap * 100).toFixed(0)}% (${capAbs.toFixed(2)} unités, futur ${futureBroad.toFixed(2)})`, reasonShort: `cap broad ${broadTheme}` };
    }
  }

  // Cap setup
  const setupCap = BROAD_CAPS.bySetup[cell.setup];
  if (setupCap !== undefined) {
    if (setupCap === 0) {
      return { ok: false, reason: `setup ${cell.setup} interdit en allocation principale`, reasonShort: `cap setup ${cell.setup}` };
    }
    const futureSetup = (portfolio.bySetup[cell.setup] || 0) + baseUnit;
    const capAbs = setupCap * TARGET_BUDGET;
    if (futureSetup > capAbs + 1e-9) {
      return { ok: false, reason: `cap setup ${cell.setup} dépasserait ${(setupCap * 100).toFixed(0)}% (futur ${futureSetup.toFixed(2)})`, reasonShort: `cap setup ${cell.setup}` };
    }
  }

  // Caps FINS (v2 — nouveauté)
  for (const theme of fineCls.themes) {
    const fineCap = FINE_THEME_CAPS[theme];
    if (fineCap === undefined) continue;
    const futureFine = (portfolio.byFineTheme[theme] || 0) + baseUnit;
    const capAbs = fineCap * TARGET_BUDGET;
    if (futureFine > capAbs + 1e-9) {
      return { ok: false, reason: `cap fin ${theme} dépasserait ${(fineCap * 100).toFixed(0)}% (futur ${futureFine.toFixed(2)})`, reasonShort: `cap fin ${theme}` };
    }
  }

  return { ok: true, baseUnit, broadTheme, fineThemes: fineCls.themes, fineConfidence: fineCls.confidence };
}

function buildPortfolio(rankedCells) {
  const portfolio = {
    positions: [],
    symbols: new Set(),
    totalUnits: 0,
    byBroadTheme: { crypto: 0, tech_ai: 0, leveraged: 0, defensive_other: 0 },
    byFineTheme: {},
    bySetup: {},
    dCount: 0,
  };
  const rejected = [];
  const constraintsApplied = new Set();

  for (const cell of rankedCells) {
    const result = tryAdd(portfolio, cell);
    if (result.ok) {
      const fineThemes = result.fineThemes;
      const risks = [];
      if (LEVERAGED.has(cell.symbol)) risks.push("ETF leveragé — profil non-linéaire");
      if (result.fineConfidence === "UNKNOWN") risks.push("symbole non classé — allocation micro forcée");

      const position = {
        rank: portfolio.positions.length + 1,
        symbol: cell.symbol,
        setup: cell.setup,
        variant: cell.variant,
        regime: cell.regime,
        decision: cell.decision,
        compositeTier: cell.compositeTier,
        confidence: cell.confidence,
        baseUnit: result.baseUnit,
        weightPct: 0,
        broadTheme: result.broadTheme,
        fineThemes,
        fineConfidence: result.fineConfidence,
        reasons: [...(cell.reasons || [])],
        risks,
      };
      portfolio.positions.push(position);
      portfolio.symbols.add(cell.symbol);
      portfolio.totalUnits += result.baseUnit;
      portfolio.byBroadTheme[result.broadTheme] = (portfolio.byBroadTheme[result.broadTheme] || 0) + result.baseUnit;
      for (const t of fineThemes) {
        portfolio.byFineTheme[t] = (portfolio.byFineTheme[t] || 0) + result.baseUnit;
      }
      portfolio.bySetup[cell.setup] = (portfolio.bySetup[cell.setup] || 0) + result.baseUnit;
      if (cell.compositeTier === "D") portfolio.dCount++;
    } else {
      rejected.push({
        symbol: cell.symbol,
        setup: cell.setup,
        variant: cell.variant,
        regime: cell.regime,
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

// === Warnings ===

function computeWarnings(portfolio, plan) {
  const warnings = [];
  if (plan.positions.length < 5) {
    warnings.push(`Moins de 5 positions sélectionnées (${plan.positions.length}) — diversification limitée. Les caps fins peuvent avoir bloqué des candidats.`);
  }
  const regimesUsed = new Set(plan.positions.map((p) => p.regime));
  if (regimesUsed.size === 1) {
    const only = [...regimesUsed][0];
    warnings.push(`Toutes les positions sont en ${only} — concentration régime.`);
  }
  if (!regimesUsed.has("RISK_OFF")) {
    warnings.push("Aucune position RISK_OFF — pas de couverture explicite si bascule macro.");
  }
  // Si un symbole UNKNOWN a été sélectionné, le mentionner
  const unknown = plan.positions.filter((p) => p.fineConfidence === "UNKNOWN");
  if (unknown.length) {
    warnings.push(`${unknown.length} symbole(s) non classé(s) dans le plan, allocation micro forcée : ${unknown.map((p) => p.symbol).join(", ")} — ajouter à CLASSIFICATION.`);
  }
  return warnings;
}

// === Comparaison v1 vs v2 ===

async function compareWithV1(plan) {
  let v1 = null;
  try {
    await access(INPUT_V1);
    v1 = JSON.parse(await readFile(INPUT_V1, "utf8"));
  } catch (_err) {
    return { available: false, removedFromV1: [], addedVsV1: [], themeExposureDelta: {} };
  }
  const v1Symbols = new Set((v1.positions ?? []).map((p) => p.symbol));
  const v2Symbols = new Set(plan.positions.map((p) => p.symbol));
  const removedFromV1 = [...v1Symbols].filter((s) => !v2Symbols.has(s));
  const addedVsV1 = [...v2Symbols].filter((s) => !v1Symbols.has(s));

  // Delta exposure par broad theme
  const v1ByBroadTheme = {};
  for (const p of v1.positions ?? []) {
    v1ByBroadTheme[p.theme] = (v1ByBroadTheme[p.theme] || 0) + p.weightPct;
  }
  const v2ByBroadTheme = {};
  for (const p of plan.positions) {
    v2ByBroadTheme[p.broadTheme] = (v2ByBroadTheme[p.broadTheme] || 0) + p.weightPct;
  }
  const themeExposureDelta = {};
  for (const t of new Set([...Object.keys(v1ByBroadTheme), ...Object.keys(v2ByBroadTheme)])) {
    themeExposureDelta[t] = {
      v1: Number((v1ByBroadTheme[t] ?? 0).toFixed(2)),
      v2: Number((v2ByBroadTheme[t] ?? 0).toFixed(2)),
      delta: Number(((v2ByBroadTheme[t] ?? 0) - (v1ByBroadTheme[t] ?? 0)).toFixed(2)),
    };
  }

  return { available: true, removedFromV1, addedVsV1, themeExposureDelta };
}

// === Markdown ===

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Allocation Plan v2 — Fine Theme Caps — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/allocation-engine-v2.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Plan théorique uniquement. Aucun ordre n'est passé. Ne pas trader sans validation humaine + paper trading + gestion du risque opérationnelle.**");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Source univers : \`${report.source.tradableUniverse}\``);
  lines.push(`- Source classification : \`${report.source.themeClassification}\``);
  lines.push(`- Statut : ${report.status}`);
  lines.push(`- Cellules candidates : **${report.summary.candidateCells}**`);
  lines.push(`- Positions sélectionnées : **${report.summary.selectedPositions}** (max ${BROAD_CAPS.maxPositions})`);
  lines.push(`- Poids total normalisé : ${fmt(report.summary.totalWeight)} %`);
  lines.push("");
  lines.push("Distribution par tier :");
  lines.push("");
  lines.push("| Tier | Positions | Poids total |");
  lines.push("|---|---:|---:|");
  for (const t of ["A", "B", "C", "D"]) {
    const v = report.summary.byTier[t] || { positions: 0, weightPct: 0 };
    lines.push(`| ${t} | ${v.positions} | ${fmt(v.weightPct)} % |`);
  }
  lines.push("");

  lines.push("## 2. Plan v2 — positions sélectionnées");
  lines.push("");
  if (!report.positions.length) {
    lines.push("_aucune position sélectionnée_");
  } else {
    lines.push("| # | Symbole | Tier | Setup | Variante | Régime | Poids | Broad | Fine themes |");
    lines.push("|---:|---|---|---|---|---|---:|---|---|");
    for (const p of report.positions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.compositeTier} | ${p.setup} | \`${p.variant}\` | ${p.regime} | ${fmt(p.weightPct)} % | ${p.broadTheme} | ${p.fineThemes.join(", ")} |`);
    }
  }
  lines.push("");

  lines.push("## 3. Comparaison v1 vs v2");
  lines.push("");
  if (!report.comparisonWithV1.available) {
    lines.push("_allocation-plan.json (v1) non trouvé — comparaison impossible_");
  } else {
    const c = report.comparisonWithV1;
    lines.push(`- Symboles retirés vs v1 : ${c.removedFromV1.length ? c.removedFromV1.join(", ") : "_aucun_"}`);
    lines.push(`- Symboles ajoutés vs v1 : ${c.addedVsV1.length ? c.addedVsV1.join(", ") : "_aucun_"}`);
    lines.push("");
    lines.push("Delta exposition broad theme (v2 − v1) :");
    lines.push("");
    lines.push("| Broad theme | v1 | v2 | Delta |");
    lines.push("|---|---:|---:|---:|");
    for (const [t, v] of Object.entries(c.themeExposureDelta).sort()) {
      const sign = v.delta > 0 ? "+" : "";
      lines.push(`| ${t} | ${fmt(v.v1)} % | ${fmt(v.v2)} % | ${sign}${fmt(v.delta)} % |`);
    }
  }
  lines.push("");

  lines.push("## 4. Exposition par sous-thème (fine themes)");
  lines.push("");
  lines.push("| Sous-thème | Positions | Poids | Cap fin v2 | Statut |");
  lines.push("|---|---:|---:|---:|---|");
  for (const [theme, v] of Object.entries(report.summary.byFineTheme).sort((a, b) => b[1].weightPct - a[1].weightPct)) {
    const cap = FINE_THEME_CAPS[theme];
    const status = cap === undefined ? "—" : (v.weightPct / 100 <= cap + 1e-9 ? "✓" : "✗");
    lines.push(`| ${theme} | ${v.positions} | ${fmt(v.weightPct)} % | ${cap !== undefined ? (cap * 100).toFixed(0) + " %" : "—"} | ${status} |`);
  }
  lines.push("");

  lines.push("## 5. Caps fins appliqués (référence)");
  lines.push("");
  lines.push("| Sous-thème | Cap |");
  lines.push("|---|---:|");
  for (const [theme, cap] of Object.entries(FINE_THEME_CAPS)) {
    lines.push(`| ${theme} | ${(cap * 100).toFixed(0)} % |`);
  }
  lines.push("");

  lines.push("## 6. Candidats rejetés par cap fin");
  lines.push("");
  const fineRejects = report.rejectedCandidates.filter((r) => r.reason.startsWith("cap fin"));
  if (!fineRejects.length) {
    lines.push("_aucun candidat rejeté par un cap fin_");
  } else {
    lines.push(`${fineRejects.length} candidats rejetés par caps fins. Distribution :`);
    lines.push("");
    const grouped = {};
    for (const r of fineRejects) {
      const key = r.reason.split(" dépasserait")[0];
      grouped[key] = (grouped[key] || 0) + 1;
    }
    lines.push("| Cap fin déclencheur | Cellules rejetées |");
    lines.push("|---|---:|");
    for (const [k, n] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${k} | ${n} |`);
    }
    lines.push("");
    lines.push("Premiers exemples :");
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Raison |");
    lines.push("|---|---|---|---|---|");
    for (const r of fineRejects.slice(0, 20)) {
      lines.push(`| ${r.symbol} | ${r.setup} | \`${r.variant}\` | ${r.regime} | ${r.reason} |`);
    }
    if (fineRejects.length > 20) lines.push(`_${fineRejects.length - 20} rejets supplémentaires non listés_`);
  }
  lines.push("");

  lines.push("## 7. Concentrations restantes");
  lines.push("");
  const concentrations = Object.entries(report.summary.byFineTheme)
    .filter(([, v]) => v.weightPct > 15)
    .sort((a, b) => b[1].weightPct - a[1].weightPct);
  if (!concentrations.length) {
    lines.push("_aucun sous-thème ne dépasse 15 % du portefeuille v2_");
  } else {
    lines.push("Sous-thèmes représentant > 15 % du portefeuille v2 :");
    lines.push("");
    for (const [theme, v] of concentrations) {
      const cap = FINE_THEME_CAPS[theme];
      lines.push(`- **${theme}** : ${fmt(v.weightPct)} % (${v.positions} positions)${cap !== undefined ? ` — cap ${(cap * 100).toFixed(0)} %` : ""}`);
    }
  }
  lines.push("");

  lines.push("## 8. Symboles inconnus / limites de classification");
  lines.push("");
  const unknownInPlan = report.positions.filter((p) => p.fineConfidence === "UNKNOWN");
  if (!unknownInPlan.length) {
    lines.push("_tous les symboles du plan sont classifiés_");
  } else {
    lines.push(`${unknownInPlan.length} symbole(s) non classé(s) dans le plan, allocation micro forcée :`);
    lines.push("");
    for (const p of unknownInPlan) lines.push(`- ${p.symbol} (poids ${fmt(p.weightPct)} %)`);
    lines.push("");
    lines.push("Ajouter ces symboles dans le dict `CLASSIFICATION` de `tools/backtests/allocation-engine-v2.mjs` (et idéalement aussi `theme-classification-v2.mjs` pour cohérence).");
  }
  lines.push("");

  lines.push("## 9. Limites de fiabilité");
  lines.push("");
  lines.push("- **Caps fins arbitraires v1.** Les seuils (us_growth_etf 30 %, semis_pure 25 %, etc.) sont une première proposition. À calibrer empiriquement après paper trading.");
  lines.push("- **Classification dupliquée** depuis `theme-classification-v2.mjs` pour ne pas modifier ce fichier (cf. brief PR). Toute évolution doit être propagée aux deux endroits. Dette technique à unifier.");
  lines.push("- **Multi-tag = chevauchement attendu.** Un actif (NVDA = semis_pure + ai_hypergrowth + mega_cap_tech) compte dans plusieurs caps en même temps — les rejets peuvent se cumuler.");
  lines.push("- **Symboles UNKNOWN forcés à allocation micro.** Ils peuvent être rejetés si le tier composite < D, ou conservés en micro. Préférer ajouter à la classification que laisser inconnu.");
  lines.push("- **Pas de coût de transaction** modélisé. Voir `friction-model-v1` + `friction-adjusted-allocation-v2` pour la couche friction.");
  lines.push("- **Plan théorique uniquement.** Aucun ordre, aucun broker, aucun endpoint live.");
  lines.push("");

  lines.push("## 10. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Calibration empirique** des caps fins après premier paper trading live.");
  lines.push("- **Unification CLASSIFICATION** : refactor pour partager une seule source de vérité entre `theme-classification-v2.mjs` et `allocation-engine-v2.mjs`.");
  lines.push("- **Friction-adjusted v2-plan** : étendre `friction-adjusted-allocation-v2.mjs` pour consommer aussi `allocation-plan-v2.json`.");
  lines.push("- **Backfill ETF holdings** : propager les sous-thèmes sous-jacents des ETFs (QQQ contient ~40 % mega_cap_tech) pour des caps encore plus précis.");
  lines.push("- **Caps croisés** : ajouter des caps par stage de croissance (hypergrowth ≤ 40 %) ou par sensibilité macro (cyclique ≤ 50 %).");
  lines.push("");

  return lines.join("\n");
}

// === Main ===

async function main() {
  console.log("[allocation-engine-v2] démarrage");

  const tu = await (async () => {
    try {
      await access(INPUT_TU);
      return JSON.parse(await readFile(INPUT_TU, "utf8"));
    } catch (_err) { return null; }
  })();
  const themes = await (async () => {
    try {
      await access(INPUT_THEMES);
      return JSON.parse(await readFile(INPUT_THEMES, "utf8"));
    } catch (_err) { return null; }
  })();

  if (!tu) {
    console.error(`[allocation-engine-v2] source manquante : ${INPUT_TU}`);
    console.error("Lancer : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }
  if (!themes) {
    console.warn(`[allocation-engine-v2] theme-classification-v2.json absent — utilisation de la table miroir locale (les warnings sur symboles non classés s'appliqueront).`);
  }

  const cells = Array.isArray(tu.cells) ? tu.cells : [];
  console.log(`[allocation-engine-v2] ${cells.length} cellules totales dans tradable-universe`);
  const candidates = cells.filter((c) => c.decision !== "BLOCK");
  console.log(`[allocation-engine-v2] ${candidates.length} cellules candidates`);
  const deduped = dedupePerSymbolSetupRegime(candidates);
  console.log(`[allocation-engine-v2] ${deduped.length} après dédoublonnage`);
  deduped.sort(compareCells);

  const { portfolio, rejected, constraintsApplied } = buildPortfolio(deduped);
  console.log(`[allocation-engine-v2] ${portfolio.positions.length} positions sélectionnées sur ${deduped.length} candidates`);

  // Stats par tier / setup / broad theme / fine theme
  const byTier = { A: { positions: 0, weightPct: 0 }, B: { positions: 0, weightPct: 0 }, C: { positions: 0, weightPct: 0 }, D: { positions: 0, weightPct: 0 } };
  const bySetup = {};
  const byBroadTheme = {};
  const byFineTheme = {};
  for (const p of portfolio.positions) {
    if (byTier[p.compositeTier]) {
      byTier[p.compositeTier].positions++;
      byTier[p.compositeTier].weightPct += p.weightPct;
    }
    if (!bySetup[p.setup]) bySetup[p.setup] = { positions: 0, weightPct: 0 };
    bySetup[p.setup].positions++;
    bySetup[p.setup].weightPct += p.weightPct;
    if (!byBroadTheme[p.broadTheme]) byBroadTheme[p.broadTheme] = { positions: 0, weightPct: 0 };
    byBroadTheme[p.broadTheme].positions++;
    byBroadTheme[p.broadTheme].weightPct += p.weightPct;
    for (const t of p.fineThemes) {
      if (!byFineTheme[t]) byFineTheme[t] = { positions: 0, weightPct: 0 };
      byFineTheme[t].positions++;
      byFineTheme[t].weightPct += p.weightPct;
    }
  }
  for (const v of Object.values(byTier)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(bySetup)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(byBroadTheme)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(byFineTheme)) v.weightPct = Number(v.weightPct.toFixed(2));

  const totalWeight = portfolio.positions.reduce((s, p) => s + p.weightPct, 0);
  const warnings = computeWarnings(portfolio, portfolio);

  const comparison = await compareWithV1(portfolio);

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      tradableUniverse: relative(REPO_ROOT, INPUT_TU),
      themeClassification: relative(REPO_ROOT, INPUT_THEMES),
    },
    status: "ok",
    policy: {
      baseUnits: BASE_UNITS,
      broadCaps: BROAD_CAPS,
      fineThemeCaps: FINE_THEME_CAPS,
      nonPrioritySetups: Array.from(NON_PRIORITY_SETUPS),
      leveragedEtfs: Array.from(LEVERAGED),
    },
    summary: {
      candidateCells: candidates.length,
      dedupedCandidates: deduped.length,
      selectedPositions: portfolio.positions.length,
      totalWeight: Number(totalWeight.toFixed(2)),
      byTier,
      bySetup,
      byBroadTheme,
      byFineTheme,
      constraintsApplied,
    },
    positions: portfolio.positions,
    rejectedCandidates: rejected,
    comparisonWithV1: comparison,
    warnings,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[allocation-engine-v2] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Plan v2 : ${portfolio.positions.length} positions, total ${fmt(totalWeight)} %`);
  if (comparison.available) {
    console.log(`vs v1 : retirés=${comparison.removedFromV1.join(",") || "_"}, ajoutés=${comparison.addedVsV1.join(",") || "_"}`);
  }
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}) :`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

main().catch((err) => {
  console.error("[allocation-engine-v2] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
