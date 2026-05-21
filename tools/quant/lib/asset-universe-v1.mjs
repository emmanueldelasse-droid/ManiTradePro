// tools/quant/lib/asset-universe-v1.mjs
//
// ASSET UNIVERSE V1 — taxonomie staged ManiTradePro.
//
// Référence documentaire : docs/quant/ASSET_UNIVERSE_V1.md
//
// Rôle : séparer EXPLICITEMENT l'univers ANALYSE (~170 actifs visibles et
// analysables) de l'univers LIVE PAPER CORE (30-50 actifs autorisés pour
// ouverture paper automatique).
//
// PHILOSOPHIE (PR-ASSET-UNIVERSE-170-STAGED-V1, phase VÉRITÉ MARCHÉ) :
//   Scaler l'observation avant de scaler l'exécution.
//
// LIMITES STRUCTURELLES (cf. brief créateur) :
//   - Module read-only. Pure functions. Aucun effet de bord.
//   - Aucun setup activé. Aucun scoring/sizing modifié.
//   - Aucun broker. Aucun LIVE_READY. Aucun apprentissage automatique.
//   - Filtre côté worker = RESTRICTIF uniquement. Ne peut JAMAIS élargir
//     les ouvertures — au pire, identique à avant ; au mieux, restreint
//     aux actifs livePaperCore.
//
// CONTRAT D'API :
//   - Pure functions, déterministe.
//   - Inputs invalides → "UNKNOWN" tier + warnings, jamais d'exception.
//   - Constantes Object.freeze récursif.

export const ASSET_UNIVERSE_V1_VERSION = "asset-universe-v1";

// === Sentinelles ===========================================================

export const ASSET_TIERS = Object.freeze({
  LIVE_PAPER_CORE: "LIVE_PAPER_CORE",
  ANALYSIS_ONLY: "ANALYSIS_ONLY",
  EXPERIMENTAL: "EXPERIMENTAL",
  BLOCKED: "BLOCKED",
  UNKNOWN: "UNKNOWN",
});

// === LIVE PAPER CORE (42 actifs) ==========================================
//
// Sous-ensemble strict autorisé pour OUVERTURE PAPER AUTOMATIQUE.
// Critères : liquidité, spreads propres, stabilité, qualité datasets,
// importance macro, diversité régimes / secteurs, actifs déjà observés.
//
// Aucun XLY / XLE / XLU (cf. blockedUniverse, KNOWN_ISSUES #15).
// Aucun FX (BLACKLIST FX cf. docs/quant/ASSET_REGISTRY.md § Exclusions).
// Aucun penny stock, microcap, altcoin illiquide.

const LIVE_PAPER_CORE = Object.freeze([
  // Indices US (2)
  "SPY", "QQQ",
  // Macro defensive (2)
  "GLD", "TLT",
  // ETF secteurs PROPRES (3) — XLE/XLU/XLY exclus #15
  "XLK", "XLF", "XLV",
  // ETF semis + small cap (2)
  "SMH", "IWM",
  // Mega Tech US (10)
  "NVDA", "AAPL", "MSFT", "META", "GOOGL", "AMZN", "TSLA", "NFLX", "AVGO", "ORCL",
  // Semis liquides (4)
  "AMD", "ASML", "TSM", "ARM",
  // Software / cyber leaders (6)
  "PLTR", "CRWD", "PANW", "NOW", "SHOP", "CRM",
  // Quality defensive (2)
  "COST", "LLY",
  // Finance US (4)
  "JPM", "V", "MA", "AXP",
  // Europe (3)
  "LVMH", "SAP", "AIR",
  // Crypto majeures (3)
  "BTC", "ETH", "SOL",
  // Complément stratégique (1)
  "COIN",
]);

// === ANALYSIS UNIVERSE (≈168 actifs) ======================================
//
// Tous les actifs visibles et analysables (rankings, watchlists, opportunités).
// Inclut : livePaperCore + actifs additionnels analysés mais NON auto-open.
//
// Source : universe-v2.mjs ∩ data/*.json — soit 171 symboles bidirectionnels.
// Moins blockedUniverse (#15 + FX BLACKLIST) → 168 actifs nets.
//
// IMPORTANT : un actif présent ici mais ABSENT de LIVE_PAPER_CORE est
// `ANALYSIS_ONLY` — visible côté UI, mais pas d'auto-open paper.

const ANALYSIS_UNIVERSE = Object.freeze([
  // === ETFs US INDEX (5) ===
  "SPY", "QQQ", "IWM", "DIA", "MDY",
  // === ETFs US TECH (18) ===
  "XLK", "VGT", "IGV", "IYW", "FTEC", "SOXX", "SMH", "SOXQ", "XSD", "PSI",
  "BOTZ", "FDN", "SKYY", "CLOU", "WCLD", "CIBR", "HACK", "BUG",
  // === ETFs US SECTORS (7) === XLE/XLU/XLY exclus #15
  "XLF", "XLV", "XLI", "XLP", "XLB", "XLRE", "XLC",
  // === ETFs WORLD (présents dans data/) (0 — tous EWJ/EWZ/FXI/EEM/VGK/FEZ/INDA/EWT/EWY manquants côté data/) ===
  // === ETFs COMMODITIES (présents dans data/) (1) ===
  "GLD",
  // === ETFs BONDS (présents dans data/) (1) ===
  "TLT",
  // === LEVERAGED (présents dans data/) (3) === TQQQ manquant côté data/
  "SOXL", "USD", "ROM",
  // === BIG TECH (10) ===
  "NVDA", "AAPL", "MSFT", "META", "GOOGL", "AMZN", "TSLA", "NFLX", "AVGO", "ORCL",
  // === SEMIS (34) ===
  "AMD", "TSM", "MU", "ARM", "KLAC", "LRCX", "AMAT", "ADI", "MCHP", "ON",
  "TXN", "NXPI", "QCOM", "MRVL", "MPWR", "ENTG", "TER", "SWKS", "NVMI", "ASX",
  "AEHR", "ACLS", "CAMT", "ONTO", "RMBS", "SLAB", "SYNA", "WOLF", "QRVO", "LSCC",
  "ALGM", "AMKR", "FORM", "IPGP",
  // === CYBER CLOUD (15) ===
  "CRWD", "PANW", "ZS", "OKTA", "NET", "DDOG", "MDB", "ESTC", "TENB", "VRNS",
  "CHKP", "FTNT", "CYBR", "S", "DOCN",
  // === SOFTWARE (17) ===
  "CRM", "NOW", "SNOW", "TEAM", "SHOP", "ADBE", "INTU", "HUBS", "WDAY", "PAYC",
  "TYL", "FICO", "ADSK", "GTLB", "DT", "AKAM", "PD",
  // === AI MOMENTUM (10) ===
  "PLTR", "SMCI", "APP", "SOUN", "BBAI", "AI", "UPST", "APLD", "NBIS", "CRWV",
  // === CONSUMER GROWTH (10) ===
  "MELI", "ABNB", "UBER", "PDD", "SE", "TTD", "DUOL", "ROKU", "TTWO", "EA",
  // === QUALITY DEFENSIVE (présents dans data/) (5) === JNJ/KO/PG manquants côté data/
  "WM", "COST", "LLY", "VRTX", "ELV", "MSCI",
  // === INDUSTRIALS (6) ===
  "PH", "TT", "ETN", "HUBB", "ROP", "LIN",
  // === FINANCIALS (6) ===
  "JPM", "V", "MA", "AXP", "BKNG", "SPGI",
  // === EUROPE (10) ===
  "ASML", "SAP", "AIR", "LVMH", "RMS", "TTE", "NESN", "STM", "CAP", "DSY",
  // === CRYPTO (9) ===
  "BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "MSTR", "IBIT", "COIN",
]);

// === EXPERIMENTAL UNIVERSE (~19 actifs) ===================================
//
// Actifs présents dans data/*.json mais ABSENTS de universe-v2.mjs.
// Visibles, analysables, MAIS observabilité prudente (pas encore validés
// par le pipeline backtest officiel).
//
// PAS d'auto-open paper.

const EXPERIMENTAL_UNIVERSE = Object.freeze([
  "ANET", "CDNS", "CFLT", "DELL", "GEN", "HCP", "IGM", "INTC", "PATH",
  "PAYX", "RBRK", "SENT", "SIE", "SNPS", "SPLK", "SPYG", "VUG", "XSW", "ZEN",
]);

// === BLOCKED UNIVERSE (6 actifs) ==========================================
//
// Actifs explicitement INTERDITS pour toute analyse runtime sérieuse :
//   - XLY, XLE, XLU : KNOWN_ISSUES #15 (splits non ajustés).
//   - EURUSD, GBPUSD, USDJPY : FX BLACKLIST (cf. ASSET_REGISTRY § Exclusions),
//     non swing-tradable sur l'infra actuelle.
//
// Rejet propre côté worker : test obligatoire #3.

const BLOCKED_UNIVERSE = Object.freeze([
  "XLY", "XLE", "XLU",       // KNOWN_ISSUES #15
  "EURUSD", "GBPUSD", "USDJPY", // FX BLACKLIST
]);

// === CONSTANTE EXPORTÉE ====================================================

export const ASSET_UNIVERSE_V1 = Object.freeze({
  version: ASSET_UNIVERSE_V1_VERSION,
  livePaperCore: LIVE_PAPER_CORE,
  analysisUniverse: ANALYSIS_UNIVERSE,
  experimentalUniverse: EXPERIMENTAL_UNIVERSE,
  blockedUniverse: BLOCKED_UNIVERSE,
});

// === Helpers ===============================================================

function normalizeSymbol(s) {
  if (typeof s !== "string") return null;
  const t = s.trim().toUpperCase();
  return t.length === 0 ? null : t;
}

const _livePaperCoreSet = new Set(LIVE_PAPER_CORE);
const _analysisSet = new Set(ANALYSIS_UNIVERSE);
const _experimentalSet = new Set(EXPERIMENTAL_UNIVERSE);
const _blockedSet = new Set(BLOCKED_UNIVERSE);

export function getAssetTierV1(symbol) {
  const s = normalizeSymbol(symbol);
  if (!s) return ASSET_TIERS.UNKNOWN;
  if (_blockedSet.has(s)) return ASSET_TIERS.BLOCKED;
  if (_livePaperCoreSet.has(s)) return ASSET_TIERS.LIVE_PAPER_CORE;
  if (_analysisSet.has(s)) return ASSET_TIERS.ANALYSIS_ONLY;
  if (_experimentalSet.has(s)) return ASSET_TIERS.EXPERIMENTAL;
  return ASSET_TIERS.UNKNOWN;
}

/**
 * Le symbole est-il autorisé pour OUVERTURE PAPER AUTOMATIQUE ?
 * → seul livePaperCore. Toute autre catégorie = NON.
 *
 * Worker doit appeler ce helper comme dernier filtre dans
 * `isTrainingCandidateAllowed`. RESTRICTIF uniquement.
 */
export function isLivePaperCoreV1(symbol) {
  const s = normalizeSymbol(symbol);
  if (!s) return false;
  if (_blockedSet.has(s)) return false; // sécurité double
  return _livePaperCoreSet.has(s);
}

/**
 * Le symbole est-il autorisé pour l'analyse (rankings, watchlist, UI) ?
 * → analysisUniverse OR experimentalUniverse, mais PAS blocked.
 */
export function isAnalysisAllowedV1(symbol) {
  const s = normalizeSymbol(symbol);
  if (!s) return false;
  if (_blockedSet.has(s)) return false;
  return _analysisSet.has(s) || _experimentalSet.has(s);
}

/**
 * Le symbole est-il dans blockedUniverse ?
 * → rejet propre, toute action analytique ou décisionnelle interdite.
 */
export function isBlockedV1(symbol) {
  const s = normalizeSymbol(symbol);
  if (!s) return false;
  return _blockedSet.has(s);
}

/**
 * Liste tous les symboles d'un tier donné.
 */
export function listSymbolsByTierV1(tier) {
  switch (tier) {
    case ASSET_TIERS.LIVE_PAPER_CORE: return [...LIVE_PAPER_CORE];
    case ASSET_TIERS.ANALYSIS_ONLY:
      return ANALYSIS_UNIVERSE.filter((s) => !_livePaperCoreSet.has(s));
    case ASSET_TIERS.EXPERIMENTAL: return [...EXPERIMENTAL_UNIVERSE];
    case ASSET_TIERS.BLOCKED: return [...BLOCKED_UNIVERSE];
    default: return [];
  }
}

// === Invariants ============================================================

/**
 * Vérifie les invariants structurels de la taxonomie.
 *
 * Invariants :
 *   1. livePaperCore ⊆ analysisUniverse.
 *   2. livePaperCore ∩ blockedUniverse = ∅.
 *   3. analysisUniverse ∩ blockedUniverse = ∅.
 *   4. experimentalUniverse ∩ livePaperCore = ∅.
 *   5. experimentalUniverse ∩ analysisUniverse = ∅
 *      (experimental = ajouté à data mais pas dans v2 → différent d'analysis).
 *   6. experimentalUniverse ∩ blockedUniverse = ∅.
 *   7. Pas de doublons à l'intérieur de chaque bucket.
 *   8. blockedUniverse contient XLY, XLE, XLU (KNOWN_ISSUES #15).
 *   9. blockedUniverse contient les 3 FX BLACKLIST.
 *  10. livePaperCore taille ∈ [30, 50] (brief).
 */
export function validateAssetUniverseInvariantsV1() {
  const violations = [];
  const checkDuplicates = (arr, name) => {
    const seen = new Set();
    for (const s of arr) {
      if (seen.has(s)) violations.push(`duplicate_in_${name}:${s}`);
      seen.add(s);
    }
  };
  checkDuplicates(LIVE_PAPER_CORE, "livePaperCore");
  checkDuplicates(ANALYSIS_UNIVERSE, "analysisUniverse");
  checkDuplicates(EXPERIMENTAL_UNIVERSE, "experimentalUniverse");
  checkDuplicates(BLOCKED_UNIVERSE, "blockedUniverse");

  for (const s of LIVE_PAPER_CORE) {
    if (!_analysisSet.has(s)) violations.push(`live_paper_core_not_in_analysis:${s}`);
    if (_blockedSet.has(s)) violations.push(`live_paper_core_blocked:${s}`);
  }
  for (const s of ANALYSIS_UNIVERSE) {
    if (_blockedSet.has(s)) violations.push(`analysis_blocked:${s}`);
  }
  for (const s of EXPERIMENTAL_UNIVERSE) {
    if (_livePaperCoreSet.has(s)) violations.push(`experimental_overlaps_core:${s}`);
    if (_analysisSet.has(s)) violations.push(`experimental_overlaps_analysis:${s}`);
    if (_blockedSet.has(s)) violations.push(`experimental_blocked:${s}`);
  }
  for (const required15 of ["XLY", "XLE", "XLU"]) {
    if (!_blockedSet.has(required15)) {
      violations.push(`missing_known_issues_15_block:${required15}`);
    }
  }
  for (const requiredFx of ["EURUSD", "GBPUSD", "USDJPY"]) {
    if (!_blockedSet.has(requiredFx)) {
      violations.push(`missing_fx_block:${requiredFx}`);
    }
  }
  if (LIVE_PAPER_CORE.length < 30 || LIVE_PAPER_CORE.length > 50) {
    violations.push(`live_paper_core_size_out_of_range:${LIVE_PAPER_CORE.length}`);
  }

  return { ok: violations.length === 0, violations };
}

// === Métadonnées ===========================================================

export const ASSET_UNIVERSE_V1_METADATA = Object.freeze({
  version: ASSET_UNIVERSE_V1_VERSION,
  counts: Object.freeze({
    livePaperCore: LIVE_PAPER_CORE.length,
    analysisUniverse: ANALYSIS_UNIVERSE.length,
    experimentalUniverse: EXPERIMENTAL_UNIVERSE.length,
    blockedUniverse: BLOCKED_UNIVERSE.length,
  }),
  references: Object.freeze({
    docsRegistry: "docs/quant/ASSET_REGISTRY.md",
    docsUniverseCore: "docs/quant/UNIVERSE_CORE_V1.md",
    docsUniverse: "docs/quant/ASSET_UNIVERSE_V1.md",
    knownIssuesRef: "docs/monitoring/KNOWN_ISSUES.md#15",
  }),
});
