// tools/backtests/allocation-engine-v1.mjs
//
// Allocation engine offline v1 — ManiTradePro.
// Transforme le tradable-universe consolidé en plan d'allocation théorique.
//
// RÈGLE ABSOLUE : ce moteur ne passe AUCUN ordre, ne prépare AUCUN ordre
// broker, ne touche AUCUN endpoint live. Il produit uniquement un plan
// théorique destiné à informer une décision humaine ou un futur connecteur
// broker / paper trading après validation explicite.
//
// Entrée :  tools/backtests/output/tradable-universe.json
// Sorties :
//   - tools/backtests/output/allocation-plan.json
//   - tools/backtests/output/allocation-plan.md
//
// Usage : node tools/backtests/allocation-engine-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT = join(OUTPUT_DIR, "tradable-universe.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "allocation-plan.json");
const OUTPUT_MD = join(OUTPUT_DIR, "allocation-plan.md");

// === Politique d'allocation ===

// Unités de base par tier composite (avant normalisation à 100 %).
const BASE_UNITS = { A: 1.0, B: 0.7, C: 0.35, D: 0.10 };

// Caps globaux (en fraction du portefeuille total)
const CAPS = {
  maxPositions: 10,
  maxExperimentalPositions: 2,
  byTheme: {
    crypto: 0.25,        // BTC, ETH, SOL, AVAX, BNB + crypto-correlated (COIN, MSTR)
    tech_ai: 0.60,       // semi, IA, tech (large)
    leveraged: 0.05,     // ETFs à effet de levier
    // defensive_other : pas de cap, c'est le reste
  },
  bySetup: {
    PULLBACK_MOMENTUM: 0.50,
    RELATIVE_STRENGTH_ROTATION: 0.35,
    BREAKOUT_EXPANSION: 0.25,
    MEAN_REVERSION: 0.0,           // jamais en allocation principale
    VOLATILITY_COMPRESSION: 0.0,   // jamais en allocation principale
  },
};

// Budget cible (en unités) : utilisé pour traduire les caps en valeurs absolues
// pendant la construction greedy. Sans ce budget, le 1er candidat ajouté
// occuperait 100 % de son thème et serait rejeté à tort.
// Hypothèse : portefeuille plein de 10 positions tier B (0.7 unit chacune) =
// 7.0 unités. Si on n'atteint pas ce volume, le portefeuille final peut
// concentrer plus que les caps en % réel — un warning est alors levé.
const TARGET_BUDGET = CAPS.maxPositions * BASE_UNITS.B;

// Classification thématique (best-effort, à étendre quand l'univers évolue)
// La classification est intentionnellement conservative — préférer "defensive_other"
// au doute plutôt qu'inventer une exposition non vérifiée.
const CRYPTO_PURE = new Set(["BTC", "ETH", "SOL", "AVAX", "BNB", "LINK"]);
const CRYPTO_CORRELATED = new Set(["COIN", "MSTR", "IBIT"]);
const LEVERAGED = new Set(["SOXL", "USD", "ROM", "TQQQ", "SQQQ", "UPRO"]);

// Tech/IA/semi (large). On consolide tout en un seul thème "tech_ai" pour
// matcher le cap 60 % demandé. Liste basée sur l'univers ManiTradePro mai 2026.
const TECH_AI = new Set([
  // Mega tech
  "NVDA", "AVGO", "AMD", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "ORCL", "CRM", "ADBE",
  // IA / leaders momentum
  "PLTR", "APP", "SMCI", "NBIS", "APLD", "AEHR", "AI", "BBAI", "SOUN",
  // Semiconducteurs
  "ASML", "TSM", "MU", "KLAC", "LRCX", "AMAT", "ADI", "MCHP", "ON", "TXN", "NXPI",
  "MPWR", "ENTG", "TER", "SWKS", "QCOM", "MRVL", "INTC", "NVMI", "ASX", "ACLS",
  "CAMT", "ONTO", "RMBS", "SLAB", "SYNA", "WOLF", "QRVO", "LSCC", "ALGM", "AMKR",
  "FORM", "IPGP", "STM", "ARM", "FICO",
  // ETFs tech / semi / IA
  "XLK", "SMH", "SOXX", "SOXQ", "IGV", "VGT", "IYW", "FTEC",
  "BOTZ", "CIBR", "HACK", "FDN", "SKYY", "PSI", "XSD",
  "IGM", "XSW", "CLOU", "WCLD", "BUG", "VUG", "SPYG", "QQQ",
  // Cybersécurité / cloud / data
  "CRWD", "PANW", "FTNT", "ZS", "OKTA", "CYBR", "S", "RBRK", "SENT", "TENB", "VRNS",
  "CHKP", "GEN", "DDOG", "MDB", "NET", "SNOW", "ESTC", "ELS", "HUBS", "TEAM",
  "DT", "GTLB", "PD", "SPLK", "ZEN", "AKAM", "DUOL", "PATH", "CFLT", "DOCN",
  // Hardware / réseaux / autres tech
  "ANET", "DELL", "ROKU", "SHOP", "MELI", "SE", "PDD", "BKNG", "ABNB", "UBER",
  "EA", "TTWO", "TTD", "NOW", "SNPS", "CDNS", "INTU", "PAYC", "ADSK", "TYL",
  "PAYX", "MSCI", "SPGI", "HCP", "UPST", "MDY", "IWM",
]);

const NON_PRIORITY_SETUPS = new Set(["MEAN_REVERSION", "VOLATILITY_COMPRESSION"]);

function classifyTheme(symbol) {
  if (LEVERAGED.has(symbol)) return "leveraged";
  if (CRYPTO_PURE.has(symbol) || CRYPTO_CORRELATED.has(symbol)) return "crypto";
  if (TECH_AI.has(symbol)) return "tech_ai";
  return "defensive_other";
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

// === Tri et dédoublonnage ===

// Pour chaque (symbol, setup, regime), garde uniquement la meilleure variante
// (compositeTier puis confiance puis WF puis score variant-regime).
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

// === Construction du portefeuille ===

function buildPortfolio(rankedCells) {
  const portfolio = {
    positions: [],
    symbols: new Set(),
    totalUnits: 0,
    byTheme: { crypto: 0, tech_ai: 0, leveraged: 0, defensive_other: 0 },
    bySetup: {},
    dCount: 0,
  };
  const rejected = [];
  const constraintsApplied = [];

  for (const cell of rankedCells) {
    const result = tryAdd(portfolio, cell);
    if (result.ok) {
      const position = {
        rank: portfolio.positions.length + 1,
        symbol: cell.symbol,
        setup: cell.setup,
        variant: cell.variant,
        regime: cell.regime,
        decision: cell.decision,
        compositeTier: cell.compositeTier,
        baseUnit: result.baseUnit,
        weightPct: 0, // calculé après normalisation
        allocationProfile: cell.recommendedAllocationProfile,
        theme: result.theme,
        reasons: [...(cell.reasons || [])],
        risks: [...(cell.risks || [])],
      };
      // Si on a forcé le profil pour leveraged, le signaler explicitement
      if (LEVERAGED.has(cell.symbol) && result.baseUnit < BASE_UNITS[cell.compositeTier]) {
        position.reasons.push(`leveraged → poids réduit (force tier C unit ${result.baseUnit})`);
      }
      portfolio.positions.push(position);
      portfolio.symbols.add(cell.symbol);
      portfolio.totalUnits += result.baseUnit;
      portfolio.byTheme[result.theme] = (portfolio.byTheme[result.theme] || 0) + result.baseUnit;
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
      if (!constraintsApplied.includes(result.reasonShort)) constraintsApplied.push(result.reasonShort);
    }
  }

  // Normalisation à 100 %
  if (portfolio.totalUnits > 0) {
    for (const p of portfolio.positions) {
      p.weightPct = Number(((p.baseUnit / portfolio.totalUnits) * 100).toFixed(2));
    }
  }

  return { portfolio, rejected, constraintsApplied };
}

function tryAdd(portfolio, cell) {
  // Jamais de setup non prioritaire en allocation principale
  if (NON_PRIORITY_SETUPS.has(cell.setup)) {
    return { ok: false, reason: `setup non prioritaire (${cell.setup}) interdit en allocation principale`, reasonShort: "setup non prioritaire interdit" };
  }

  // Cap max positions
  if (portfolio.positions.length >= CAPS.maxPositions) {
    return { ok: false, reason: `max ${CAPS.maxPositions} positions atteintes`, reasonShort: "max positions" };
  }

  // 1 position par symbole
  if (portfolio.symbols.has(cell.symbol)) {
    return { ok: false, reason: `symbole ${cell.symbol} déjà en portefeuille (1 position max par symbole)`, reasonShort: "duplicate symbol" };
  }

  // Cap experimental
  if (cell.compositeTier === "D" && portfolio.dCount >= CAPS.maxExperimentalPositions) {
    return { ok: false, reason: `max ${CAPS.maxExperimentalPositions} positions EXPERIMENTAL atteintes`, reasonShort: "max EXPERIMENTAL" };
  }

  const theme = classifyTheme(cell.symbol);
  const isLeveraged = LEVERAGED.has(cell.symbol);

  // Détermine l'unité de base. Leveraged → forcé à REDUCE (tier C unit) ou
  // moins si déjà inférieur. Aucune allocation normale pour leveraged.
  let baseUnit = BASE_UNITS[cell.compositeTier] ?? 0;
  if (isLeveraged && baseUnit > BASE_UNITS.C) {
    baseUnit = BASE_UNITS.C;
  }
  if (baseUnit <= 0) {
    return { ok: false, reason: `unité de base 0 (tier ${cell.compositeTier})`, reasonShort: "base unit zero" };
  }

  // Vérifie caps thème et setup APRÈS hypothétique ajout, en valeurs absolues
  // par rapport au TARGET_BUDGET (et non au portefeuille courant qui serait
  // toujours saturé pour le 1er candidat).
  const futureThemeUnits = (portfolio.byTheme[theme] || 0) + baseUnit;
  const futureSetupUnits = (portfolio.bySetup[cell.setup] || 0) + baseUnit;

  const themeCap = CAPS.byTheme[theme];
  if (themeCap !== undefined) {
    const capAbs = themeCap * TARGET_BUDGET;
    if (futureThemeUnits > capAbs + 1e-9) {
      return { ok: false, reason: `cap thème ${theme} dépasserait ${(themeCap * 100).toFixed(0)}% du budget cible (${capAbs.toFixed(2)} unités, futur ${futureThemeUnits.toFixed(2)})`, reasonShort: `cap thème ${theme}` };
    }
  }
  const setupCap = CAPS.bySetup[cell.setup];
  if (setupCap !== undefined) {
    if (setupCap === 0) {
      return { ok: false, reason: `setup ${cell.setup} interdit en allocation principale`, reasonShort: `cap setup ${cell.setup}` };
    }
    const capAbs = setupCap * TARGET_BUDGET;
    if (futureSetupUnits > capAbs + 1e-9) {
      return { ok: false, reason: `cap setup ${cell.setup} dépasserait ${(setupCap * 100).toFixed(0)}% du budget cible (${capAbs.toFixed(2)} unités, futur ${futureSetupUnits.toFixed(2)})`, reasonShort: `cap setup ${cell.setup}` };
    }
  }

  return { ok: true, baseUnit, theme };
}

// === Warnings ===

function computeWarnings(portfolio) {
  const warnings = [];
  if (portfolio.positions.length < 5) {
    warnings.push(`Moins de 5 positions sélectionnées (${portfolio.positions.length}) — diversification limitée.`);
  }
  const regimesUsed = new Set(portfolio.positions.map(p => p.regime));
  if (regimesUsed.size === 1) {
    const only = [...regimesUsed][0];
    warnings.push(`Toutes les positions sont en ${only} — concentration régime, risque si bascule macro.`);
  }
  if (!regimesUsed.has("RISK_OFF")) {
    warnings.push("Aucune position RISK_OFF dans le plan — le portefeuille n'a pas de couverture explicite si le régime macro bascule en RISK_OFF.");
  }
  // Si le portefeuille n'atteint pas le budget cible, les % réels peuvent
  // dépasser les caps cibles. On le signale pour transparence.
  if (portfolio.totalUnits < TARGET_BUDGET * 0.9) {
    const totalPct = portfolio.totalUnits / TARGET_BUDGET;
    for (const [theme, cap] of Object.entries(CAPS.byTheme)) {
      const themeUnits = portfolio.byTheme[theme] || 0;
      const realPct = portfolio.totalUnits > 0 ? themeUnits / portfolio.totalUnits : 0;
      if (realPct > cap + 1e-9 && themeUnits > 0) {
        warnings.push(`Cap thème ${theme} respecté en valeur absolue mais % réel dans le portefeuille (${(realPct * 100).toFixed(1)}%) supérieur au cap cible (${(cap * 100).toFixed(0)}%) — portefeuille sous-rempli (${(totalPct * 100).toFixed(0)}% du budget cible).`);
      }
    }
    for (const [setup, cap] of Object.entries(CAPS.bySetup)) {
      if (cap === 0) continue;
      const setupUnits = portfolio.bySetup[setup] || 0;
      const realPct = portfolio.totalUnits > 0 ? setupUnits / portfolio.totalUnits : 0;
      if (realPct > cap + 1e-9 && setupUnits > 0) {
        warnings.push(`Cap setup ${setup} respecté en valeur absolue mais % réel dans le portefeuille (${(realPct * 100).toFixed(1)}%) supérieur au cap cible (${(cap * 100).toFixed(0)}%) — portefeuille sous-rempli.`);
      }
    }
  }
  // ETF tech overlap : plus de 3 ETF dans tech_ai
  const techEtfs = portfolio.positions.filter(p => p.theme === "tech_ai" && /^[A-Z]{3,4}$/.test(p.symbol) && (/^(XLK|SMH|SOXX|SOXQ|QQQ|VUG|SPYG|IYW|FTEC|VGT|IGV|IGM|XSW|PSI|XSD|BOTZ|CIBR|HACK|FDN|SKYY|CLOU|WCLD|BUG)$/.test(p.symbol)));
  if (techEtfs.length >= 3) {
    warnings.push(`${techEtfs.length} ETF tech sélectionnés (${techEtfs.map(p => p.symbol).join(", ")}) — risque de doublon d'exposition, vérifier la corrélation entre eux.`);
  }
  return warnings;
}

// === Markdown ===

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Allocation Plan — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/allocation-engine-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Plan théorique uniquement. Aucun ordre n'est passé. Aucun connecteur broker n'est touché. Ne pas trader sans validation humaine + paper trading + gestion du risque opérationnelle.**");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Source : \`${report.source}\``);
  lines.push(`- Statut : ${report.status}`);
  lines.push(`- Cellules candidates (tradables hors BLOCK) : **${report.summary.candidateCells}**`);
  lines.push(`- Positions sélectionnées : **${report.summary.selectedPositions}** (max ${CAPS.maxPositions})`);
  lines.push(`- Poids total normalisé : ${fmt(report.summary.totalWeight)}%`);
  lines.push("");
  lines.push("Distribution par tier :");
  lines.push("");
  lines.push("| Tier | Positions | Poids total |");
  lines.push("|---|---:|---:|");
  for (const t of ["A", "B", "C", "D"]) {
    const v = report.summary.byTier[t] || { positions: 0, weightPct: 0 };
    lines.push(`| ${t} | ${v.positions} | ${fmt(v.weightPct)}% |`);
  }
  lines.push("");
  lines.push("Exposition par setup :");
  lines.push("");
  lines.push("| Setup | Positions | Poids total | Cap |");
  lines.push("|---|---:|---:|---:|");
  for (const [setup, v] of Object.entries(report.summary.bySetup)) {
    const cap = CAPS.bySetup[setup];
    lines.push(`| ${setup} | ${v.positions} | ${fmt(v.weightPct)}% | ${cap !== undefined ? (cap * 100).toFixed(0) + "%" : "—"} |`);
  }
  lines.push("");
  lines.push("Exposition par thème :");
  lines.push("");
  lines.push("| Thème | Positions | Poids total | Cap |");
  lines.push("|---|---:|---:|---:|");
  for (const [theme, v] of Object.entries(report.summary.byTheme)) {
    const cap = CAPS.byTheme[theme];
    lines.push(`| ${theme} | ${v.positions} | ${fmt(v.weightPct)}% | ${cap !== undefined ? (cap * 100).toFixed(0) + "%" : "—"} |`);
  }
  lines.push("");

  lines.push("## 2. Positions sélectionnées");
  lines.push("");
  if (!report.positions.length) {
    lines.push("_aucune position sélectionnée_");
  } else {
    lines.push("| # | Symbole | Tier | Setup | Variante | Régime | Décision | Poids | Thème | Profil alloc. |");
    lines.push("|---:|---|---|---|---|---|---|---:|---|---|");
    for (const p of report.positions) {
      lines.push(`| ${p.rank} | ${p.symbol} | ${p.compositeTier} | ${p.setup} | \`${p.variant}\` | ${p.regime} | ${p.decision} | ${fmt(p.weightPct)}% | ${p.theme} | ${p.allocationProfile} |`);
    }
  }
  lines.push("");

  lines.push("## 3. Poids par actif");
  lines.push("");
  if (report.positions.length) {
    lines.push("| Symbole | Poids |");
    lines.push("|---|---:|");
    const sorted = [...report.positions].sort((a, b) => b.weightPct - a.weightPct);
    for (const p of sorted) {
      lines.push(`| ${p.symbol} | ${fmt(p.weightPct)}% |`);
    }
  }
  lines.push("");

  lines.push("## 4. Exposition par setup (détail)");
  lines.push("");
  for (const [setup, v] of Object.entries(report.summary.bySetup)) {
    const cap = CAPS.bySetup[setup];
    const ok = cap === undefined ? "—" : (v.weightPct / 100 <= cap + 1e-9 ? "✓" : "✗");
    lines.push(`- **${setup}** : ${v.positions} positions, ${fmt(v.weightPct)}% (cap ${cap !== undefined ? (cap * 100).toFixed(0) + "%" : "—"}) ${ok}`);
  }
  lines.push("");

  lines.push("## 5. Exposition par thème (détail)");
  lines.push("");
  for (const [theme, v] of Object.entries(report.summary.byTheme)) {
    const cap = CAPS.byTheme[theme];
    const ok = cap === undefined ? "—" : (v.weightPct / 100 <= cap + 1e-9 ? "✓" : "✗");
    lines.push(`- **${theme}** : ${v.positions} positions, ${fmt(v.weightPct)}% (cap ${cap !== undefined ? (cap * 100).toFixed(0) + "%" : "—"}) ${ok}`);
  }
  lines.push("");

  lines.push("## 6. Candidats rejetés");
  lines.push("");
  if (!report.rejectedCandidates.length) {
    lines.push("_aucun candidat rejeté_");
  } else {
    const grouped = {};
    for (const r of report.rejectedCandidates) {
      const key = r.reason.split(" (")[0];
      grouped[key] = (grouped[key] || 0) + 1;
    }
    lines.push("Distribution des raisons de rejet :");
    lines.push("");
    lines.push("| Raison | Cellules |");
    lines.push("|---|---:|");
    for (const [reason, n] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${reason} | ${n} |`);
    }
    lines.push("");
    const examples = report.rejectedCandidates.slice(0, 20);
    lines.push("Premiers exemples :");
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Tier | Raison |");
    lines.push("|---|---|---|---|---|---|");
    for (const r of examples) {
      lines.push(`| ${r.symbol} | ${r.setup} | \`${r.variant}\` | ${r.regime} | ${r.compositeTier} | ${r.reason} |`);
    }
    if (report.rejectedCandidates.length > 20) lines.push(`_${report.rejectedCandidates.length - 20} rejets supplémentaires non listés_`);
  }
  lines.push("");

  lines.push("## 7. Contraintes appliquées");
  lines.push("");
  lines.push("| Contrainte | Valeur |");
  lines.push("|---|---|");
  lines.push(`| Max positions | ${CAPS.maxPositions} |`);
  lines.push(`| Max EXPERIMENTAL | ${CAPS.maxExperimentalPositions} |`);
  lines.push(`| Max 1 position par symbole | ✓ |`);
  for (const [theme, cap] of Object.entries(CAPS.byTheme)) {
    lines.push(`| Cap thème \`${theme}\` | ${(cap * 100).toFixed(0)}% |`);
  }
  for (const [setup, cap] of Object.entries(CAPS.bySetup)) {
    lines.push(`| Cap setup \`${setup}\` | ${(cap * 100).toFixed(0)}% |`);
  }
  lines.push(`| Setups non prioritaires (MeanRev, VolComp) | interdits en allocation principale |`);
  lines.push(`| Leveraged ETFs | forcés à profil REDUCE max |`);
  lines.push("");

  lines.push("## 8. Risques connus");
  lines.push("");
  const allRisks = {};
  for (const p of report.positions) {
    for (const r of p.risks) allRisks[r] = (allRisks[r] || 0) + 1;
  }
  if (!Object.keys(allRisks).length) {
    lines.push("_aucun risque taggé sur les positions sélectionnées_");
  } else {
    lines.push("| Risque | Positions concernées |");
    lines.push("|---|---:|");
    for (const [r, n] of Object.entries(allRisks).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${r} | ${n} |`);
    }
  }
  if (report.warnings.length) {
    lines.push("");
    lines.push("**Warnings :**");
    lines.push("");
    for (const w of report.warnings) lines.push(`- ⚠ ${w}`);
  }
  lines.push("");

  lines.push("## 9. Limites de fiabilité");
  lines.push("");
  lines.push("- **Plan théorique uniquement.** Aucun ordre n'est passé, aucun connecteur broker n'est touché. Le plan informe une décision humaine ; il ne décide pas seul.");
  lines.push("- **Pas de coût de transaction** modélisé : slippage, spread, gaps et frais peuvent réduire significativement la rentabilité réelle. Priorité #3 du TODO quant.");
  lines.push("- **Classification thématique best-effort** : la liste `tech_ai` couvre l'univers actuel mais est large. Une cellule classifiée `defensive_other` peut en réalité être plus risquée ou plus exposée qu'estimé.");
  lines.push("- **Caps statiques** : les pourcentages (crypto 25 %, tech 60 %, leveraged 5 %) sont arbitraires v1, à calibrer empiriquement quand le paper trading live aura tourné.");
  lines.push("- **Unités de base statiques** (A=1.0, B=0.7, C=0.35, D=0.10) : peuvent être ajustées par tier confidence ou par score si une v2 le justifie.");
  lines.push("- **Pas de rebalancing dynamique** : ce plan est une photo à l'instant T, basée sur tradable-universe.json courant. Toute évolution des sources change le plan.");
  lines.push("- **Diversification limitée par construction** : la matrice variant-regime ne couvre rigoureusement que les setups pour lesquels `bySymbolByRegime[]` existe. Les actifs hors couverture (forex, bonds, certains défensifs) ne peuvent pas être autoriser ici.");
  lines.push("- **Verdict ALLOW dans tradable-universe ≠ autorisation live.** Ce moteur d'allocation ajoute une couche de contraintes mais ne suffit pas pour passer en argent réel. Voir BOT_OBJECTIVE.md pour les pré-requis broker.");
  lines.push("");

  lines.push("## 10. Prochaine étape recommandée");
  lines.push("");
  lines.push("- Validation humaine du plan (lecture, sanity check, cohérence vs intuition trader).");
  lines.push("- Modélisation des frictions réelles (priorité #3) : injecter slippage / spread / gaps / frais dans la chaîne de backtest, recalculer les 6 niveaux + l'allocation.");
  lines.push("- Construction d'un broker connector / paper trading wire-up qui consomme ce plan ET ajoute la gestion du risque opérationnelle (max daily loss, kill switch, cooldown).");
  lines.push("- Walk-forward roulant pour réduire la dépendance au split unique 2021-2023 / 2024-2025.");
  lines.push("- Classification thématique plus précise (secteurs GICS, beta vs BTC, sensibilité taux, etc.).");
  lines.push("");

  return lines.join("\n");
}

// === Main ===

async function main() {
  console.log("[allocation-engine] démarrage");
  const data = await tryRead(INPUT);
  if (!data) {
    console.error(`[allocation-engine] source manquante : ${INPUT}`);
    console.error("Lancer d'abord : node tools/backtests/run-quant-pipeline-v1.mjs");
    process.exit(1);
  }
  const cells = Array.isArray(data.cells) ? data.cells : [];
  console.log(`[allocation-engine] ${cells.length} cellules totales dans tradable-universe`);

  // Filtre : decision != BLOCK (ALLOW / REDUCE / EXPERIMENTAL)
  const candidates = cells.filter(c => c.decision !== "BLOCK");
  console.log(`[allocation-engine] ${candidates.length} cellules candidates (decision != BLOCK)`);

  // Dédoublonnage par (symbol, setup, regime) — best variant only
  const deduped = dedupePerSymbolSetupRegime(candidates);
  console.log(`[allocation-engine] ${deduped.length} cellules après dédoublonnage (symbol × setup × regime → best variant)`);

  // Tri global par priorité
  deduped.sort(compareCells);

  // Construction greedy du portefeuille
  const { portfolio, rejected, constraintsApplied } = buildPortfolio(deduped);
  console.log(`[allocation-engine] ${portfolio.positions.length} positions sélectionnées sur ${deduped.length} candidates`);

  // Warnings
  const warnings = computeWarnings(portfolio);

  // Distribution par tier / setup / theme (normalisée)
  const byTier = { A: { positions: 0, weightPct: 0 }, B: { positions: 0, weightPct: 0 }, C: { positions: 0, weightPct: 0 }, D: { positions: 0, weightPct: 0 } };
  const bySetup = {};
  const byTheme = {};
  for (const p of portfolio.positions) {
    if (byTier[p.compositeTier]) {
      byTier[p.compositeTier].positions++;
      byTier[p.compositeTier].weightPct += p.weightPct;
    }
    if (!bySetup[p.setup]) bySetup[p.setup] = { positions: 0, weightPct: 0 };
    bySetup[p.setup].positions++;
    bySetup[p.setup].weightPct += p.weightPct;
    if (!byTheme[p.theme]) byTheme[p.theme] = { positions: 0, weightPct: 0 };
    byTheme[p.theme].positions++;
    byTheme[p.theme].weightPct += p.weightPct;
  }
  // Arrondir les % pour le rapport
  for (const v of Object.values(byTier)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(bySetup)) v.weightPct = Number(v.weightPct.toFixed(2));
  for (const v of Object.values(byTheme)) v.weightPct = Number(v.weightPct.toFixed(2));

  const totalWeight = portfolio.positions.reduce((s, p) => s + p.weightPct, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    source: relative(REPO_ROOT, INPUT),
    status: "ok",
    policy: {
      baseUnits: BASE_UNITS,
      caps: CAPS,
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
      byTheme,
      constraintsApplied,
    },
    positions: portfolio.positions,
    rejectedCandidates: rejected,
    warnings,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[allocation-engine] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Plan : ${portfolio.positions.length} positions, total ${fmt(totalWeight)}% (normalisé)`);
  console.log(`Tiers : A=${byTier.A.positions} (${fmt(byTier.A.weightPct)}%), B=${byTier.B.positions} (${fmt(byTier.B.weightPct)}%), C=${byTier.C.positions} (${fmt(byTier.C.weightPct)}%), D=${byTier.D.positions} (${fmt(byTier.D.weightPct)}%)`);
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}) :`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

main().catch((err) => {
  console.error("[allocation-engine] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
