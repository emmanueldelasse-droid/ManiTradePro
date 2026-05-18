// tools/backtests/theme-classification-v2.mjs
//
// Classification thématique v2 — ManiTradePro.
// Remplace les thèmes trop larges (tech_ai, crypto, defensive_other) par des
// sous-thèmes plus précis (semis_pure, ai_hypergrowth, software_saas,
// cybersecurity, crypto_layer1, us_growth_etf, etc.) pour détecter les
// corrélations cachées et améliorer l'analyse de concentration réelle.
//
// RÈGLE ABSOLUE : classification HEURISTIQUE V2. Pas de ML, pas de scraping,
// pas de matrice de covariance réelle. C'est une liste maintenue à la main
// basée sur la connaissance du produit. Vise à améliorer les caps et la
// lisibilité, pas à fournir une vérité financière.
//
// Entrées :
//   - tools/backtests/output/allocation-plan.json
//   - tools/backtests/output/allocation-plan-friction-adjusted.json
//   - tools/backtests/output/tradable-universe.json
//
// Sorties :
//   - tools/backtests/output/theme-classification-v2.json
//   - tools/backtests/output/theme-classification-v2.md
//
// Aucune source n'est modifiée. Lecture seule en entrée, écriture en sortie.
//
// Usage : node tools/backtests/theme-classification-v2.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const INPUT_ALLOC = join(OUTPUT_DIR, "allocation-plan.json");
const INPUT_FRIC_ALLOC = join(OUTPUT_DIR, "allocation-plan-friction-adjusted.json");
const INPUT_TU = join(OUTPUT_DIR, "tradable-universe.json");
const OUTPUT_JSON = join(OUTPUT_DIR, "theme-classification-v2.json");
const OUTPUT_MD = join(OUTPUT_DIR, "theme-classification-v2.md");

// === Vocabulaire thématique v2 ===
//
// Une position peut avoir plusieurs tags (ex. NVDA = semis_pure + ai_hypergrowth
// + mega_cap_tech). Confidence reflète la certitude de l'attribution :
//   HIGH   : attribution évidente, peu de discussion possible
//   MEDIUM : attribution raisonnable mais discutable
//   LOW    : attribution incertaine
const VALID_THEMES = new Set([
  "us_growth_etf",
  "semis_pure",
  "semis_equipment",
  "ai_hypergrowth",
  "software_saas",
  "cybersecurity",
  "cloud_platform",
  "fintech",
  "crypto_layer1",
  "crypto_exchange",
  "crypto_correlated_equity",
  "leveraged_tech",
  "leveraged_macro",
  "precious_metals",
  "banks_financials",
  "macro_defensive",
  "industrials",
  "europe_equity",
  "broad_market",
  "quality_growth",
  "mega_cap_tech",
  "macro_fx",
]);

// === Classification par symbole ===
//
// Maintenu à la main. Toute évolution doit être documentée en commit.
// Si un actif n'est pas dans cette table, il est marqué `unknown` et listé
// dans le rapport pour qu'un humain l'attribue.
const CLASSIFICATION = {
  // Mega cap tech
  NVDA:  { themes: ["semis_pure", "ai_hypergrowth", "mega_cap_tech"], confidence: "HIGH" },
  AAPL:  { themes: ["mega_cap_tech"], confidence: "HIGH" },
  MSFT:  { themes: ["mega_cap_tech", "software_saas", "cloud_platform"], confidence: "HIGH" },
  GOOGL: { themes: ["mega_cap_tech", "software_saas"], confidence: "HIGH" },
  AMZN:  { themes: ["mega_cap_tech", "cloud_platform"], confidence: "HIGH" },
  META:  { themes: ["mega_cap_tech", "software_saas"], confidence: "HIGH" },
  TSLA:  { themes: ["mega_cap_tech"], confidence: "MEDIUM" },
  AVGO:  { themes: ["semis_pure", "mega_cap_tech"], confidence: "HIGH" },
  AMD:   { themes: ["semis_pure"], confidence: "HIGH" },
  ORCL:  { themes: ["software_saas", "cloud_platform"], confidence: "HIGH" },
  CRM:   { themes: ["software_saas"], confidence: "HIGH" },
  ADBE:  { themes: ["software_saas"], confidence: "HIGH" },
  NFLX:  { themes: ["mega_cap_tech"], confidence: "MEDIUM" },

  // Semis pure (produits / design)
  TSM:   { themes: ["semis_pure"], confidence: "HIGH" },
  MU:    { themes: ["semis_pure"], confidence: "HIGH" },
  ADI:   { themes: ["semis_pure"], confidence: "HIGH" },
  MCHP:  { themes: ["semis_pure"], confidence: "HIGH" },
  ON:    { themes: ["semis_pure"], confidence: "HIGH" },
  TXN:   { themes: ["semis_pure"], confidence: "HIGH" },
  NXPI:  { themes: ["semis_pure"], confidence: "HIGH" },
  MPWR:  { themes: ["semis_pure"], confidence: "HIGH" },
  SWKS:  { themes: ["semis_pure"], confidence: "HIGH" },
  QCOM:  { themes: ["semis_pure"], confidence: "HIGH" },
  MRVL:  { themes: ["semis_pure"], confidence: "HIGH" },
  INTC:  { themes: ["semis_pure"], confidence: "HIGH" },
  ASX:   { themes: ["semis_pure"], confidence: "MEDIUM" },
  RMBS:  { themes: ["semis_pure"], confidence: "HIGH" },
  SLAB:  { themes: ["semis_pure"], confidence: "HIGH" },
  SYNA:  { themes: ["semis_pure"], confidence: "HIGH" },
  WOLF:  { themes: ["semis_pure"], confidence: "HIGH" },
  QRVO:  { themes: ["semis_pure"], confidence: "HIGH" },
  LSCC:  { themes: ["semis_pure"], confidence: "HIGH" },
  ALGM:  { themes: ["semis_pure"], confidence: "HIGH" },
  STM:   { themes: ["semis_pure"], confidence: "HIGH" },
  ARM:   { themes: ["semis_pure"], confidence: "HIGH" },

  // Semis equipment (machines / outils de production)
  KLAC:  { themes: ["semis_equipment"], confidence: "HIGH" },
  LRCX:  { themes: ["semis_equipment"], confidence: "HIGH" },
  AMAT:  { themes: ["semis_equipment"], confidence: "HIGH" },
  ENTG:  { themes: ["semis_equipment"], confidence: "HIGH" },
  TER:   { themes: ["semis_equipment"], confidence: "HIGH" },
  NVMI:  { themes: ["semis_equipment"], confidence: "HIGH" },
  ACLS:  { themes: ["semis_equipment"], confidence: "HIGH" },
  CAMT:  { themes: ["semis_equipment"], confidence: "HIGH" },
  ONTO:  { themes: ["semis_equipment"], confidence: "HIGH" },
  AEHR:  { themes: ["semis_equipment"], confidence: "HIGH" },
  AMKR:  { themes: ["semis_equipment"], confidence: "HIGH" },
  FORM:  { themes: ["semis_equipment"], confidence: "HIGH" },
  IPGP:  { themes: ["semis_equipment", "industrials"], confidence: "MEDIUM" },
  ASML:  { themes: ["semis_equipment", "europe_equity"], confidence: "HIGH" },

  // AI hypergrowth
  PLTR:  { themes: ["ai_hypergrowth", "software_saas"], confidence: "HIGH" },
  SMCI:  { themes: ["ai_hypergrowth", "industrials"], confidence: "HIGH" },
  NBIS:  { themes: ["ai_hypergrowth", "cloud_platform"], confidence: "HIGH" },
  APLD:  { themes: ["ai_hypergrowth", "cloud_platform"], confidence: "MEDIUM" },
  AI:    { themes: ["ai_hypergrowth", "software_saas"], confidence: "HIGH" },
  BBAI:  { themes: ["ai_hypergrowth"], confidence: "MEDIUM" },
  SOUN:  { themes: ["ai_hypergrowth"], confidence: "MEDIUM" },
  APP:   { themes: ["ai_hypergrowth", "software_saas"], confidence: "MEDIUM" },

  // Cybersecurity
  CRWD:  { themes: ["cybersecurity", "software_saas"], confidence: "HIGH" },
  PANW:  { themes: ["cybersecurity"], confidence: "HIGH" },
  FTNT:  { themes: ["cybersecurity"], confidence: "HIGH" },
  ZS:    { themes: ["cybersecurity"], confidence: "HIGH" },
  OKTA:  { themes: ["cybersecurity"], confidence: "HIGH" },
  CYBR:  { themes: ["cybersecurity"], confidence: "HIGH" },
  S:     { themes: ["cybersecurity"], confidence: "HIGH" },
  RBRK:  { themes: ["cybersecurity"], confidence: "HIGH" },
  SENT:  { themes: ["cybersecurity"], confidence: "MEDIUM" },
  TENB:  { themes: ["cybersecurity"], confidence: "HIGH" },
  VRNS:  { themes: ["cybersecurity"], confidence: "HIGH" },
  CHKP:  { themes: ["cybersecurity"], confidence: "HIGH" },
  GEN:   { themes: ["cybersecurity"], confidence: "MEDIUM" },
  NET:   { themes: ["cybersecurity", "cloud_platform"], confidence: "HIGH" },

  // Software / SaaS / cloud
  ADSK:  { themes: ["software_saas"], confidence: "HIGH" },
  TYL:   { themes: ["software_saas"], confidence: "HIGH" },
  INTU:  { themes: ["software_saas"], confidence: "HIGH" },
  NOW:   { themes: ["software_saas"], confidence: "HIGH" },
  SHOP:  { themes: ["software_saas"], confidence: "HIGH" },
  HUBS:  { themes: ["software_saas"], confidence: "HIGH" },
  TEAM:  { themes: ["software_saas"], confidence: "HIGH" },
  WDAY:  { themes: ["software_saas"], confidence: "HIGH" },
  ESTC:  { themes: ["software_saas"], confidence: "HIGH" },
  HCP:   { themes: ["software_saas"], confidence: "HIGH" },
  DT:    { themes: ["software_saas"], confidence: "HIGH" },
  PAYC:  { themes: ["software_saas"], confidence: "HIGH" },
  DUOL:  { themes: ["software_saas"], confidence: "HIGH" },
  ROKU:  { themes: ["software_saas"], confidence: "MEDIUM" },
  DDOG:  { themes: ["software_saas"], confidence: "HIGH" },
  MDB:   { themes: ["software_saas"], confidence: "HIGH" },
  SNOW:  { themes: ["software_saas", "cloud_platform"], confidence: "HIGH" },
  FICO:  { themes: ["software_saas"], confidence: "HIGH" },
  SPLK:  { themes: ["software_saas"], confidence: "HIGH" },
  ZEN:   { themes: ["software_saas"], confidence: "HIGH" },
  AKAM:  { themes: ["cloud_platform"], confidence: "HIGH" },
  DOCN:  { themes: ["cloud_platform"], confidence: "HIGH" },
  CFLT:  { themes: ["software_saas"], confidence: "HIGH" },
  PATH:  { themes: ["software_saas"], confidence: "HIGH" },
  ANET:  { themes: ["cloud_platform", "industrials"], confidence: "MEDIUM" },
  DELL:  { themes: ["industrials"], confidence: "MEDIUM" },
  GTLB:  { themes: ["software_saas"], confidence: "HIGH" },
  PD:    { themes: ["software_saas"], confidence: "HIGH" },

  // Fintech / banks
  V:     { themes: ["fintech"], confidence: "HIGH" },
  MA:    { themes: ["fintech"], confidence: "HIGH" },
  AXP:   { themes: ["fintech", "banks_financials"], confidence: "HIGH" },
  JPM:   { themes: ["banks_financials"], confidence: "HIGH" },
  UPST:  { themes: ["fintech", "ai_hypergrowth"], confidence: "MEDIUM" },
  SPGI:  { themes: ["fintech"], confidence: "HIGH" },
  MSCI:  { themes: ["fintech"], confidence: "HIGH" },

  // Crypto
  BTC:   { themes: ["crypto_layer1"], confidence: "HIGH" },
  ETH:   { themes: ["crypto_layer1"], confidence: "HIGH" },
  SOL:   { themes: ["crypto_layer1"], confidence: "HIGH" },
  AVAX:  { themes: ["crypto_layer1"], confidence: "HIGH" },
  BNB:   { themes: ["crypto_layer1", "crypto_exchange"], confidence: "HIGH" },
  LINK:  { themes: ["crypto_layer1"], confidence: "MEDIUM" },
  MSTR:  { themes: ["crypto_correlated_equity"], confidence: "HIGH" },
  COIN:  { themes: ["crypto_exchange", "crypto_correlated_equity"], confidence: "HIGH" },
  IBIT:  { themes: ["crypto_correlated_equity"], confidence: "HIGH" },
  CRWV:  { themes: ["ai_hypergrowth"], confidence: "LOW" },

  // Leveraged ETFs
  SOXL:  { themes: ["leveraged_tech", "semis_pure"], confidence: "HIGH" },
  USD:   { themes: ["leveraged_tech", "semis_pure"], confidence: "HIGH" },
  ROM:   { themes: ["leveraged_tech", "mega_cap_tech"], confidence: "HIGH" },

  // ETFs broad / growth
  SPY:   { themes: ["broad_market"], confidence: "HIGH" },
  QQQ:   { themes: ["broad_market", "mega_cap_tech"], confidence: "HIGH" },
  IWM:   { themes: ["broad_market"], confidence: "HIGH" },
  MDY:   { themes: ["broad_market"], confidence: "HIGH" },
  SPYG:  { themes: ["us_growth_etf", "broad_market"], confidence: "HIGH" },
  VUG:   { themes: ["us_growth_etf", "quality_growth"], confidence: "HIGH" },
  IYW:   { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  VGT:   { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  XLK:   { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  FTEC:  { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  IGV:   { themes: ["software_saas"], confidence: "HIGH" },
  IGM:   { themes: ["us_growth_etf"], confidence: "HIGH" },
  XSW:   { themes: ["software_saas"], confidence: "HIGH" },
  BOTZ:  { themes: ["ai_hypergrowth"], confidence: "HIGH" },
  CIBR:  { themes: ["cybersecurity"], confidence: "HIGH" },
  HACK:  { themes: ["cybersecurity"], confidence: "HIGH" },
  BUG:   { themes: ["cybersecurity"], confidence: "HIGH" },
  FDN:   { themes: ["cloud_platform", "us_growth_etf"], confidence: "MEDIUM" },
  SKYY:  { themes: ["cloud_platform"], confidence: "HIGH" },
  CLOU:  { themes: ["cloud_platform"], confidence: "HIGH" },
  WCLD:  { themes: ["cloud_platform"], confidence: "HIGH" },
  PSI:   { themes: ["semis_pure"], confidence: "HIGH" },
  XSD:   { themes: ["semis_pure"], confidence: "HIGH" },
  SMH:   { themes: ["semis_pure"], confidence: "HIGH" },
  SOXX:  { themes: ["semis_pure"], confidence: "HIGH" },
  SOXQ:  { themes: ["semis_pure"], confidence: "HIGH" },

  // Macro defensive
  GLD:   { themes: ["precious_metals", "macro_defensive"], confidence: "HIGH" },
  TLT:   { themes: ["macro_defensive"], confidence: "HIGH" },

  // Industrials / other
  ETN:   { themes: ["industrials"], confidence: "HIGH" },
  PH:    { themes: ["industrials"], confidence: "HIGH" },
  ROP:   { themes: ["industrials"], confidence: "HIGH" },
  HUBB:  { themes: ["industrials"], confidence: "HIGH" },
  WM:    { themes: ["industrials"], confidence: "HIGH" },
  TT:    { themes: ["industrials"], confidence: "HIGH" },
  LIN:   { themes: ["industrials"], confidence: "HIGH" },

  // Health / consumer / other US large cap (less covered by sub-themes)
  COST:  { themes: ["broad_market"], confidence: "LOW" },
  LLY:   { themes: ["broad_market"], confidence: "LOW" },
  VRTX:  { themes: ["broad_market"], confidence: "LOW" },
  ELV:   { themes: ["broad_market"], confidence: "LOW" },
  PDD:   { themes: ["broad_market"], confidence: "LOW" },
  ABNB:  { themes: ["broad_market"], confidence: "LOW" },
  UBER:  { themes: ["broad_market"], confidence: "LOW" },
  BKNG:  { themes: ["broad_market"], confidence: "LOW" },
  MELI:  { themes: ["broad_market"], confidence: "LOW" },
  SE:    { themes: ["broad_market"], confidence: "LOW" },
  EA:    { themes: ["broad_market"], confidence: "LOW" },
  TTWO:  { themes: ["broad_market"], confidence: "LOW" },
  TTD:   { themes: ["software_saas"], confidence: "MEDIUM" },
  PAYX:  { themes: ["software_saas"], confidence: "MEDIUM" },

  // Europe equity
  SAP:   { themes: ["software_saas", "europe_equity"], confidence: "HIGH" },
  AIR:   { themes: ["industrials", "europe_equity"], confidence: "MEDIUM" },
  LVMH:  { themes: ["europe_equity"], confidence: "HIGH" },
  TTE:   { themes: ["europe_equity"], confidence: "HIGH" },
  NESN:  { themes: ["europe_equity"], confidence: "HIGH" },
  RMS:   { themes: ["europe_equity"], confidence: "HIGH" },
  SIE:   { themes: ["industrials", "europe_equity"], confidence: "HIGH" },
  DSY:   { themes: ["software_saas", "europe_equity"], confidence: "HIGH" },

  // FX
  EURUSD: { themes: ["macro_fx"], confidence: "HIGH" },
  GBPUSD: { themes: ["macro_fx"], confidence: "HIGH" },
  USDJPY: { themes: ["macro_fx"], confidence: "HIGH" },
};

// === Chargement ===

async function tryRead(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

function classifySymbol(symbol) {
  const entry = CLASSIFICATION[symbol];
  if (!entry) return { themes: [], confidence: "UNKNOWN" };
  return entry;
}

// Calcule l'exposition par sous-thème pour une liste de positions.
// Une position qui a N thèmes contribue son poids TOTAL à chacun (donc la
// somme des poids par thème peut dépasser 100%). C'est volontaire — on
// veut savoir "à combien % du portefeuille je suis exposé à ce thème ?".
function computeThemeExposure(positions) {
  const byTheme = {};
  for (const p of positions) {
    const cls = classifySymbol(p.symbol);
    if (!cls.themes.length) {
      if (!byTheme.__unknown) byTheme.__unknown = { positions: 0, weightPct: 0, symbols: [] };
      byTheme.__unknown.positions++;
      byTheme.__unknown.weightPct += p.weightPctRaw;
      byTheme.__unknown.symbols.push(p.symbol);
      continue;
    }
    for (const t of cls.themes) {
      if (!byTheme[t]) byTheme[t] = { positions: 0, weightPct: 0, symbols: [] };
      byTheme[t].positions++;
      byTheme[t].weightPct += p.weightPctRaw;
      byTheme[t].symbols.push(p.symbol);
    }
  }
  for (const v of Object.values(byTheme)) v.weightPct = Number(v.weightPct.toFixed(2));
  return byTheme;
}

// Détection de clusters / faux doublons / surexposition cachée.
function detectClusters(byTheme, positions) {
  const clusters = [];

  // Cluster : un thème regroupe plusieurs positions avec un poids cumulé important.
  for (const [theme, v] of Object.entries(byTheme)) {
    if (theme === "__unknown") continue;
    if (v.positions >= 2) {
      clusters.push({
        type: "multi_position_theme",
        theme,
        positions: v.positions,
        symbols: v.symbols,
        weightPct: v.weightPct,
      });
    }
  }

  // Faux doublon ETF : deux ETF avec des thèmes très chevauchants
  const etfLike = positions.filter((p) => {
    const cls = classifySymbol(p.symbol);
    return cls.themes.some((t) => t === "us_growth_etf" || t === "broad_market" || t === "mega_cap_tech");
  });
  for (let i = 0; i < etfLike.length; i++) {
    for (let j = i + 1; j < etfLike.length; j++) {
      const a = classifySymbol(etfLike[i].symbol);
      const b = classifySymbol(etfLike[j].symbol);
      const overlap = a.themes.filter((t) => b.themes.includes(t));
      if (overlap.length >= 2) {
        clusters.push({
          type: "etf_overlap",
          symbols: [etfLike[i].symbol, etfLike[j].symbol],
          sharedThemes: overlap,
          weightPctA: etfLike[i].weightPctRaw,
          weightPctB: etfLike[j].weightPctRaw,
          combinedWeightPct: Number((etfLike[i].weightPctRaw + etfLike[j].weightPctRaw).toFixed(2)),
        });
      }
    }
  }

  return clusters;
}

function computeWarnings(byTheme, clusters, positions) {
  const warnings = [];
  // Surexposition cachée : un sous-thème qui dépasse 30% du portefeuille
  for (const [theme, v] of Object.entries(byTheme)) {
    if (theme === "__unknown") continue;
    if (v.weightPct > 30) {
      warnings.push(`Sous-thème "${theme}" représente ${v.weightPct} % du portefeuille (${v.positions} positions : ${v.symbols.join(", ")}) — concentration cachée derrière le cap large tech_ai 60 %.`);
    }
  }
  // Trop d'ETF overlap
  const etfOverlaps = clusters.filter((c) => c.type === "etf_overlap");
  if (etfOverlaps.length >= 2) {
    warnings.push(`${etfOverlaps.length} chevauchements ETF détectés — risque de portefeuille faussement diversifié.`);
  }
  // Symboles non classés présents dans le portefeuille
  const unknownInPortfolio = positions.filter((p) => classifySymbol(p.symbol).confidence === "UNKNOWN");
  if (unknownInPortfolio.length) {
    warnings.push(`${unknownInPortfolio.length} symbole(s) du portefeuille non classé(s) : ${unknownInPortfolio.map((p) => p.symbol).join(", ")} — ajouter à CLASSIFICATION dans theme-classification-v2.mjs.`);
  }
  // Toutes les positions partagent un thème commun
  const sharedThemeAcrossAll = (() => {
    if (!positions.length) return null;
    const allThemes = positions.map((p) => new Set(classifySymbol(p.symbol).themes));
    if (allThemes.some((s) => s.size === 0)) return null;
    const intersection = [...allThemes[0]].filter((t) => allThemes.every((s) => s.has(t)));
    return intersection[0] ?? null;
  })();
  if (sharedThemeAcrossAll) {
    warnings.push(`Toutes les positions partagent le thème "${sharedThemeAcrossAll}" — diversification effective = 0 sur cet axe.`);
  }
  return warnings;
}

// === Main ===

async function main() {
  console.log("[theme-classification-v2] démarrage");

  const alloc = await tryRead(INPUT_ALLOC);
  const fricAlloc = await tryRead(INPUT_FRIC_ALLOC);
  const tu = await tryRead(INPUT_TU);

  if (!alloc) {
    console.error(`[theme-classification-v2] source manquante : ${INPUT_ALLOC}`);
    process.exit(1);
  }
  if (!fricAlloc) {
    console.warn(`[theme-classification-v2] friction-adjusted-allocation absent — analyse "frictionAdjusted" sera vide.`);
  }
  if (!tu) {
    console.warn(`[theme-classification-v2] tradable-universe absent — non bloquant.`);
  }

  // Original plan
  const originalPositions = (alloc.positions || []).map((p) => ({ symbol: p.symbol, weightPctRaw: p.weightPct }));
  const originalByTheme = computeThemeExposure(originalPositions);
  const originalClusters = detectClusters(originalByTheme, originalPositions);

  // Friction-adjusted plan
  const fricPositions = (fricAlloc?.positions || []).map((p) => ({ symbol: p.symbol, weightPctRaw: p.adjustedWeightPct }));
  const fricByTheme = computeThemeExposure(fricPositions);
  const fricClusters = detectClusters(fricByTheme, fricPositions);

  // Symboles présents dans le portefeuille + classifiés
  const allPortfolioSymbols = [...new Set([...originalPositions.map((p) => p.symbol), ...fricPositions.map((p) => p.symbol)])];
  const symbolThemes = {};
  let classifiedCount = 0;
  let unknownCount = 0;
  for (const sym of allPortfolioSymbols) {
    const cls = classifySymbol(sym);
    symbolThemes[sym] = {
      themes: cls.themes,
      confidence: cls.confidence,
    };
    if (cls.confidence === "UNKNOWN") unknownCount++;
    else classifiedCount++;
  }

  // Top exposure
  const topThemeExposureOriginal = Object.entries(originalByTheme)
    .filter(([k]) => k !== "__unknown")
    .map(([k, v]) => ({ theme: k, weightPct: v.weightPct, positions: v.positions }))
    .sort((a, b) => b.weightPct - a.weightPct);
  const topThemeExposureAdjusted = Object.entries(fricByTheme)
    .filter(([k]) => k !== "__unknown")
    .map(([k, v]) => ({ theme: k, weightPct: v.weightPct, positions: v.positions }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // Warnings (sur original ET sur ajusté)
  const warningsOriginal = computeWarnings(originalByTheme, originalClusters, originalPositions);
  const warningsAdjusted = computeWarnings(fricByTheme, fricClusters, fricPositions);

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      allocationPlan: relative(REPO_ROOT, INPUT_ALLOC),
      frictionAdjustedAllocation: fricAlloc ? relative(REPO_ROOT, INPUT_FRIC_ALLOC) : null,
      tradableUniverse: tu ? relative(REPO_ROOT, INPUT_TU) : null,
    },
    status: "ok",
    model: {
      version: "v2",
      type: "heuristic_manual",
      validThemes: Array.from(VALID_THEMES).sort(),
      classificationEntries: Object.keys(CLASSIFICATION).length,
      disclaimer: "Classification heuristique maintenue à la main. Pas de ML, pas de matrice de covariance réelle. Vise à améliorer les caps et la lisibilité structurelle, pas à fournir une vérité financière.",
    },
    summary: {
      classifiedSymbols: classifiedCount,
      unknownSymbols: unknownCount,
      detectedThemes: [...new Set(topThemeExposureOriginal.map((t) => t.theme))].sort(),
      topThemeExposureOriginal: topThemeExposureOriginal.slice(0, 10),
      topThemeExposureAdjusted: topThemeExposureAdjusted.slice(0, 10),
    },
    symbolThemes,
    allocationExposure: {
      original: originalByTheme,
      frictionAdjusted: fricByTheme,
    },
    clusters: {
      original: originalClusters,
      frictionAdjusted: fricClusters,
    },
    warnings: {
      original: warningsOriginal,
      frictionAdjusted: warningsAdjusted,
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[theme-classification-v2] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Symboles classifiés : ${classifiedCount} / inconnus : ${unknownCount}`);
  console.log(`Thèmes détectés (plan original) : ${topThemeExposureOriginal.length}`);
  console.log(`Top 3 expositions originales : ${topThemeExposureOriginal.slice(0, 3).map((t) => `${t.theme} ${t.weightPct}%`).join(", ")}`);
  console.log(`Clusters originaux : ${originalClusters.length}, ajustés : ${fricClusters.length}`);
  if (warningsOriginal.length || warningsAdjusted.length) {
    console.log("Warnings :");
    for (const w of warningsOriginal) console.log(`  [original] ⚠ ${w}`);
    for (const w of warningsAdjusted) console.log(`  [ajusté] ⚠ ${w}`);
  }
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Theme Classification v2 — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/theme-classification-v2.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Classification heuristique v2** maintenue à la main, basée sur la connaissance du produit. Pas de ML, pas de scraping, pas de matrice de covariance réelle. Vise à améliorer les caps et la lisibilité, pas à fournir une vérité financière.");
  lines.push("");
  lines.push("Les positions peuvent avoir **plusieurs tags** (ex. NVDA = semis_pure + ai_hypergrowth + mega_cap_tech), donc la somme des % par thème peut dépasser 100 % du portefeuille.");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Symboles dans le portefeuille : **${report.summary.classifiedSymbols + report.summary.unknownSymbols}** (${report.summary.classifiedSymbols} classifiés, ${report.summary.unknownSymbols} inconnus)`);
  lines.push(`- Sous-thèmes détectés dans le plan original : **${report.summary.detectedThemes.length}**`);
  lines.push(`- Entrées dans la table de classification : ${report.model.classificationEntries}`);
  lines.push("");

  lines.push("## 2. Table de classification (positions du plan)");
  lines.push("");
  lines.push("| Symbole | Thèmes | Confiance |");
  lines.push("|---|---|---|");
  for (const [sym, v] of Object.entries(report.symbolThemes).sort()) {
    lines.push(`| ${sym} | ${v.themes.length ? v.themes.join(", ") : "_aucun_"} | ${v.confidence} |`);
  }
  lines.push("");

  lines.push("## 3. Exposition par sous-thème — plan original");
  lines.push("");
  if (!report.summary.topThemeExposureOriginal.length) {
    lines.push("_aucune exposition mesurable_");
  } else {
    lines.push("| Thème | Positions | Poids total | Symboles |");
    lines.push("|---|---:|---:|---|");
    for (const t of report.summary.topThemeExposureOriginal) {
      const detail = report.allocationExposure.original[t.theme];
      lines.push(`| ${t.theme} | ${t.positions} | ${fmt(t.weightPct)} % | ${detail.symbols.join(", ")} |`);
    }
  }
  lines.push("");

  lines.push("## 4. Exposition par sous-thème — plan friction-adjusted");
  lines.push("");
  if (!report.summary.topThemeExposureAdjusted.length) {
    lines.push("_aucune exposition mesurable_");
  } else {
    lines.push("| Thème | Positions | Poids total | Symboles |");
    lines.push("|---|---:|---:|---|");
    for (const t of report.summary.topThemeExposureAdjusted) {
      const detail = report.allocationExposure.frictionAdjusted[t.theme];
      lines.push(`| ${t.theme} | ${t.positions} | ${fmt(t.weightPct)} % | ${detail.symbols.join(", ")} |`);
    }
  }
  lines.push("");

  lines.push("## 5. Clusters corrélés détectés");
  lines.push("");
  lines.push("### Plan original");
  lines.push("");
  if (!report.clusters.original.length) {
    lines.push("_aucun cluster détecté_");
  } else {
    for (const c of report.clusters.original) {
      if (c.type === "multi_position_theme") {
        lines.push(`- **multi_position_theme** \`${c.theme}\` : ${c.positions} positions (${c.symbols.join(", ")}) — poids total ${fmt(c.weightPct)} %`);
      } else if (c.type === "etf_overlap") {
        lines.push(`- **etf_overlap** ${c.symbols.join(" / ")} : thèmes communs \`${c.sharedThemes.join(", ")}\` — poids combiné ${fmt(c.combinedWeightPct)} %`);
      }
    }
  }
  lines.push("");
  lines.push("### Plan friction-adjusted");
  lines.push("");
  if (!report.clusters.frictionAdjusted.length) {
    lines.push("_aucun cluster détecté_");
  } else {
    for (const c of report.clusters.frictionAdjusted) {
      if (c.type === "multi_position_theme") {
        lines.push(`- **multi_position_theme** \`${c.theme}\` : ${c.positions} positions (${c.symbols.join(", ")}) — poids total ${fmt(c.weightPct)} %`);
      } else if (c.type === "etf_overlap") {
        lines.push(`- **etf_overlap** ${c.symbols.join(" / ")} : thèmes communs \`${c.sharedThemes.join(", ")}\` — poids combiné ${fmt(c.combinedWeightPct)} %`);
      }
    }
  }
  lines.push("");

  lines.push("## 6. ETF très proches");
  lines.push("");
  const etfOverlaps = report.clusters.original.filter((c) => c.type === "etf_overlap");
  if (!etfOverlaps.length) {
    lines.push("_aucun chevauchement ETF détecté_");
  } else {
    lines.push("| Paire | Thèmes communs | Poids combiné |");
    lines.push("|---|---|---:|");
    for (const c of etfOverlaps) {
      lines.push(`| ${c.symbols.join(" + ")} | ${c.sharedThemes.join(", ")} | ${fmt(c.combinedWeightPct)} % |`);
    }
  }
  lines.push("");

  lines.push("## 7. Risques de concentration cachés");
  lines.push("");
  const allWarnings = [...report.warnings.original, ...report.warnings.frictionAdjusted];
  if (!allWarnings.length) {
    lines.push("_aucun risque de concentration cachée détecté par les heuristiques v2_");
  } else {
    if (report.warnings.original.length) {
      lines.push("**Plan original :**");
      lines.push("");
      for (const w of report.warnings.original) lines.push(`- ⚠ ${w}`);
      lines.push("");
    }
    if (report.warnings.frictionAdjusted.length) {
      lines.push("**Plan friction-adjusted :**");
      lines.push("");
      for (const w of report.warnings.frictionAdjusted) lines.push(`- ⚠ ${w}`);
    }
  }
  lines.push("");

  lines.push("## 8. Symboles non classés");
  lines.push("");
  const unknown = Object.entries(report.symbolThemes).filter(([, v]) => v.confidence === "UNKNOWN");
  if (!unknown.length) {
    lines.push("_aucun_");
  } else {
    lines.push("Ces symboles sont présents dans le portefeuille mais absents de la table de classification. À ajouter dans `theme-classification-v2.mjs` :");
    lines.push("");
    for (const [sym] of unknown) lines.push(`- ${sym}`);
  }
  lines.push("");

  lines.push("## 9. Limites");
  lines.push("");
  lines.push("- **Classification manuelle.** Toute évolution doit être commitée explicitement. Si l'univers ajoute un nouveau symbole, il faut le classifier à la main.");
  lines.push("- **Confiance subjective.** HIGH / MEDIUM / LOW reflètent une appréciation experte, pas une mesure statistique.");
  lines.push("- **Pas de corrélation mathématique.** Deux actifs marqués \"semis_pure\" peuvent en réalité être faiblement corrélés (ex. NVDA vs INTC). La table ne mesure pas la corrélation, elle suggère une corrélation thématique probable.");
  lines.push("- **Multi-tag = chevauchement attendu.** La somme des % par thème dépasse 100 % par construction.");
  lines.push("- **Pas d'intégration au pipeline.** Ce moteur tourne à la demande, pas dans `run-quant-pipeline-v1.mjs`. Volontaire pour garder la chaîne principale agnostique de la classification.");
  lines.push("- **Pas de modification des sources.** `allocation-plan.json` et `allocation-plan-friction-adjusted.json` restent intacts.");
  lines.push("");

  lines.push("## 10. Recommandations futures");
  lines.push("");
  lines.push("- **Caps par sous-thème** dans `allocation-engine-v1.mjs` (priorité quant) : ajouter des caps fins comme `semis_pure ≤ 20 %`, `us_growth_etf ≤ 30 %`, `cybersecurity ≤ 15 %`. Permettrait de bloquer les portefeuilles faussement diversifiés.");
  lines.push("- **Backfill ETF holdings** : pour chaque ETF, ingérer la composition réelle et propager les sous-thèmes sous-jacents. Permet d'attraper l'exposition cachée (ex. QQQ = ~40 % mega_cap_tech).");
  lines.push("- **Calibrage par corrélation observée** : une fois le paper trading en route, mesurer la corrélation réalisée entre actifs et confronter à la classification heuristique. Réviser les tags qui ne tiennent pas.");
  lines.push("- **Validation cross-source** : comparer la classification v2 avec un fournisseur externe (FactSet, MSCI GICS, etc.) si accès — uniquement après calibration interne, pour éviter le copier-coller passif.");
  lines.push("- **Tag par stage de croissance** : ajouter `hypergrowth` / `mature` / `defensive` orthogonaux aux sous-thèmes sectoriels pour des caps croisés (ex. hypergrowth ≤ 40 %).");
  lines.push("");

  return lines.join("\n");
}

main().catch((err) => {
  console.error("[theme-classification-v2] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
