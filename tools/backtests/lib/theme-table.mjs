// tools/backtests/lib/theme-table.mjs
//
// Table partagée de classification thématique v2 — ManiTradePro.
// Source de vérité unique consommée par :
//   - tools/backtests/theme-classification-v2.mjs
//   - tools/backtests/allocation-engine-v2.mjs
//
// Avant ce module, chacun des deux scripts maintenait sa propre copie
// (l'un l'avait introduite à la création, l'autre l'avait dupliquée à
// dessein parce que le brief de la PR allocation-v2 interdisait de
// modifier theme-classification-v2.mjs). Le risque structurel : si une
// table évoluait sans l'autre, l'analyse de concentration et le plan
// d'allocation v2 pouvaient diverger silencieusement.
//
// Ce module supprime la duplication. Toute évolution de la
// classification se fait UNIQUEMENT ici.
//
// AUCUN appel runtime. AUCUN broker. AUCUN endpoint live. Pure data
// + helpers de lecture.

// === Vocabulaire (22 sous-thèmes) =====================================

export const VALID_THEMES = new Set([
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

// === Caps fins par sous-thème (utilisés par allocation-engine-v2) =====
//
// Une position porte plusieurs sous-thèmes. Le cap s'applique à la
// somme des poids des positions partageant chaque sous-thème.
// Exprimés en fraction du portefeuille total (0.30 = 30 %).
export const FINE_THEME_CAPS = {
  us_growth_etf: 0.30,
  mega_cap_tech: 0.25,
  software_saas: 0.25,
  ai_hypergrowth: 0.20,
  semis_pure: 0.25,
  semis_equipment: 0.15,
  cybersecurity: 0.15,
  cloud_platform: 0.20,
  fintech: 0.20,
  crypto_layer1: 0.15,
  crypto_correlated_equity: 0.10,
  crypto_exchange: 0.10,
  leveraged_tech: 0.05,
  leveraged_macro: 0.05,
  precious_metals: 0.15,
  banks_financials: 0.15,
  macro_defensive: 0.20,
  industrials: 0.20,
  europe_equity: 0.20,
  broad_market: 0.40,
  quality_growth: 0.30,
  macro_fx: 0.10,
};

// === Classification par symbole =======================================
//
// Maintenu à la main. Toute évolution doit être commitée explicitement.
// Confidence : HIGH / MEDIUM / LOW / (absent = UNKNOWN au lookup).
//
// Tags : doivent appartenir à VALID_THEMES. Multi-tag intentionnel
// (ex. NVDA = semis_pure + ai_hypergrowth + mega_cap_tech).
export const THEME_CLASSIFICATION = {
  // Mega cap tech
  NVDA:   { themes: ["semis_pure", "ai_hypergrowth", "mega_cap_tech"], confidence: "HIGH" },
  AAPL:   { themes: ["mega_cap_tech"], confidence: "HIGH" },
  MSFT:   { themes: ["mega_cap_tech", "software_saas", "cloud_platform"], confidence: "HIGH" },
  GOOGL:  { themes: ["mega_cap_tech", "software_saas"], confidence: "HIGH" },
  AMZN:   { themes: ["mega_cap_tech", "cloud_platform"], confidence: "HIGH" },
  META:   { themes: ["mega_cap_tech", "software_saas"], confidence: "HIGH" },
  TSLA:   { themes: ["mega_cap_tech"], confidence: "MEDIUM" },
  AVGO:   { themes: ["semis_pure", "mega_cap_tech"], confidence: "HIGH" },
  AMD:    { themes: ["semis_pure"], confidence: "HIGH" },
  ORCL:   { themes: ["software_saas", "cloud_platform"], confidence: "HIGH" },
  CRM:    { themes: ["software_saas"], confidence: "HIGH" },
  ADBE:   { themes: ["software_saas"], confidence: "HIGH" },
  NFLX:   { themes: ["mega_cap_tech"], confidence: "MEDIUM" },

  // Semis pure
  TSM:    { themes: ["semis_pure"], confidence: "HIGH" },
  MU:     { themes: ["semis_pure"], confidence: "HIGH" },
  ADI:    { themes: ["semis_pure"], confidence: "HIGH" },
  MCHP:   { themes: ["semis_pure"], confidence: "HIGH" },
  ON:     { themes: ["semis_pure"], confidence: "HIGH" },
  TXN:    { themes: ["semis_pure"], confidence: "HIGH" },
  NXPI:   { themes: ["semis_pure"], confidence: "HIGH" },
  MPWR:   { themes: ["semis_pure"], confidence: "HIGH" },
  SWKS:   { themes: ["semis_pure"], confidence: "HIGH" },
  QCOM:   { themes: ["semis_pure"], confidence: "HIGH" },
  MRVL:   { themes: ["semis_pure"], confidence: "HIGH" },
  INTC:   { themes: ["semis_pure"], confidence: "HIGH" },
  ASX:    { themes: ["semis_pure"], confidence: "MEDIUM" },
  RMBS:   { themes: ["semis_pure"], confidence: "HIGH" },
  SLAB:   { themes: ["semis_pure"], confidence: "HIGH" },
  SYNA:   { themes: ["semis_pure"], confidence: "HIGH" },
  WOLF:   { themes: ["semis_pure"], confidence: "HIGH" },
  QRVO:   { themes: ["semis_pure"], confidence: "HIGH" },
  LSCC:   { themes: ["semis_pure"], confidence: "HIGH" },
  ALGM:   { themes: ["semis_pure"], confidence: "HIGH" },
  STM:    { themes: ["semis_pure"], confidence: "HIGH" },
  ARM:    { themes: ["semis_pure"], confidence: "HIGH" },

  // Semis equipment
  KLAC:   { themes: ["semis_equipment"], confidence: "HIGH" },
  LRCX:   { themes: ["semis_equipment"], confidence: "HIGH" },
  AMAT:   { themes: ["semis_equipment"], confidence: "HIGH" },
  ENTG:   { themes: ["semis_equipment"], confidence: "HIGH" },
  TER:    { themes: ["semis_equipment"], confidence: "HIGH" },
  NVMI:   { themes: ["semis_equipment"], confidence: "HIGH" },
  ACLS:   { themes: ["semis_equipment"], confidence: "HIGH" },
  CAMT:   { themes: ["semis_equipment"], confidence: "HIGH" },
  ONTO:   { themes: ["semis_equipment"], confidence: "HIGH" },
  AEHR:   { themes: ["semis_equipment"], confidence: "HIGH" },
  AMKR:   { themes: ["semis_equipment"], confidence: "HIGH" },
  FORM:   { themes: ["semis_equipment"], confidence: "HIGH" },
  IPGP:   { themes: ["semis_equipment", "industrials"], confidence: "MEDIUM" },
  ASML:   { themes: ["semis_equipment", "europe_equity"], confidence: "HIGH" },

  // EDA software pour fondeurs semi (ajouté ici en source partagée v2.1)
  // SNPS / CDNS : éditeurs Electronic Design Automation, classification
  // évidente (software_saas + semis_equipment). Ils étaient présents
  // seulement dans le miroir allocation-engine-v2.mjs avant ce refactor.
  SNPS:   { themes: ["software_saas", "semis_equipment"], confidence: "HIGH" },
  CDNS:   { themes: ["software_saas", "semis_equipment"], confidence: "HIGH" },

  // AI hypergrowth
  PLTR:   { themes: ["ai_hypergrowth", "software_saas"], confidence: "HIGH" },
  SMCI:   { themes: ["ai_hypergrowth", "industrials"], confidence: "HIGH" },
  NBIS:   { themes: ["ai_hypergrowth", "cloud_platform"], confidence: "HIGH" },
  APLD:   { themes: ["ai_hypergrowth", "cloud_platform"], confidence: "MEDIUM" },
  AI:     { themes: ["ai_hypergrowth", "software_saas"], confidence: "HIGH" },
  BBAI:   { themes: ["ai_hypergrowth"], confidence: "MEDIUM" },
  SOUN:   { themes: ["ai_hypergrowth"], confidence: "MEDIUM" },
  APP:    { themes: ["ai_hypergrowth", "software_saas"], confidence: "MEDIUM" },

  // Cybersecurity
  CRWD:   { themes: ["cybersecurity", "software_saas"], confidence: "HIGH" },
  PANW:   { themes: ["cybersecurity"], confidence: "HIGH" },
  FTNT:   { themes: ["cybersecurity"], confidence: "HIGH" },
  ZS:     { themes: ["cybersecurity"], confidence: "HIGH" },
  OKTA:   { themes: ["cybersecurity"], confidence: "HIGH" },
  CYBR:   { themes: ["cybersecurity"], confidence: "HIGH" },
  S:      { themes: ["cybersecurity"], confidence: "HIGH" },
  RBRK:   { themes: ["cybersecurity"], confidence: "HIGH" },
  SENT:   { themes: ["cybersecurity"], confidence: "MEDIUM" },
  TENB:   { themes: ["cybersecurity"], confidence: "HIGH" },
  VRNS:   { themes: ["cybersecurity"], confidence: "HIGH" },
  CHKP:   { themes: ["cybersecurity"], confidence: "HIGH" },
  GEN:    { themes: ["cybersecurity"], confidence: "MEDIUM" },
  NET:    { themes: ["cybersecurity", "cloud_platform"], confidence: "HIGH" },

  // Software / SaaS / cloud
  ADSK:   { themes: ["software_saas"], confidence: "HIGH" },
  TYL:    { themes: ["software_saas"], confidence: "HIGH" },
  INTU:   { themes: ["software_saas"], confidence: "HIGH" },
  NOW:    { themes: ["software_saas"], confidence: "HIGH" },
  SHOP:   { themes: ["software_saas"], confidence: "HIGH" },
  HUBS:   { themes: ["software_saas"], confidence: "HIGH" },
  TEAM:   { themes: ["software_saas"], confidence: "HIGH" },
  WDAY:   { themes: ["software_saas"], confidence: "HIGH" },
  ESTC:   { themes: ["software_saas"], confidence: "HIGH" },
  HCP:    { themes: ["software_saas"], confidence: "HIGH" },
  DT:     { themes: ["software_saas"], confidence: "HIGH" },
  PAYC:   { themes: ["software_saas"], confidence: "HIGH" },
  DUOL:   { themes: ["software_saas"], confidence: "HIGH" },
  ROKU:   { themes: ["software_saas"], confidence: "MEDIUM" },
  DDOG:   { themes: ["software_saas"], confidence: "HIGH" },
  MDB:    { themes: ["software_saas"], confidence: "HIGH" },
  SNOW:   { themes: ["software_saas", "cloud_platform"], confidence: "HIGH" },
  FICO:   { themes: ["software_saas"], confidence: "HIGH" },
  SPLK:   { themes: ["software_saas"], confidence: "HIGH" },
  ZEN:    { themes: ["software_saas"], confidence: "HIGH" },
  AKAM:   { themes: ["cloud_platform"], confidence: "HIGH" },
  DOCN:   { themes: ["cloud_platform"], confidence: "HIGH" },
  CFLT:   { themes: ["software_saas"], confidence: "HIGH" },
  PATH:   { themes: ["software_saas"], confidence: "HIGH" },
  ANET:   { themes: ["cloud_platform", "industrials"], confidence: "MEDIUM" },
  DELL:   { themes: ["industrials"], confidence: "MEDIUM" },
  GTLB:   { themes: ["software_saas"], confidence: "HIGH" },
  PD:     { themes: ["software_saas"], confidence: "HIGH" },
  TTD:    { themes: ["software_saas"], confidence: "MEDIUM" },
  PAYX:   { themes: ["software_saas"], confidence: "MEDIUM" },

  // Fintech / banks
  V:      { themes: ["fintech"], confidence: "HIGH" },
  MA:     { themes: ["fintech"], confidence: "HIGH" },
  AXP:    { themes: ["fintech", "banks_financials"], confidence: "HIGH" },
  JPM:    { themes: ["banks_financials"], confidence: "HIGH" },
  UPST:   { themes: ["fintech", "ai_hypergrowth"], confidence: "MEDIUM" },
  SPGI:   { themes: ["fintech"], confidence: "HIGH" },
  MSCI:   { themes: ["fintech"], confidence: "HIGH" },

  // Crypto
  BTC:    { themes: ["crypto_layer1"], confidence: "HIGH" },
  ETH:    { themes: ["crypto_layer1"], confidence: "HIGH" },
  SOL:    { themes: ["crypto_layer1"], confidence: "HIGH" },
  AVAX:   { themes: ["crypto_layer1"], confidence: "HIGH" },
  BNB:    { themes: ["crypto_layer1", "crypto_exchange"], confidence: "HIGH" },
  LINK:   { themes: ["crypto_layer1"], confidence: "MEDIUM" },
  MSTR:   { themes: ["crypto_correlated_equity"], confidence: "HIGH" },
  COIN:   { themes: ["crypto_exchange", "crypto_correlated_equity"], confidence: "HIGH" },
  IBIT:   { themes: ["crypto_correlated_equity"], confidence: "HIGH" },
  CRWV:   { themes: ["ai_hypergrowth"], confidence: "LOW" },

  // Leveraged ETFs
  SOXL:   { themes: ["leveraged_tech", "semis_pure"], confidence: "HIGH" },
  USD:    { themes: ["leveraged_tech", "semis_pure"], confidence: "HIGH" },
  ROM:    { themes: ["leveraged_tech", "mega_cap_tech"], confidence: "HIGH" },

  // ETFs broad / growth
  SPY:    { themes: ["broad_market"], confidence: "HIGH" },
  QQQ:    { themes: ["broad_market", "mega_cap_tech"], confidence: "HIGH" },
  IWM:    { themes: ["broad_market"], confidence: "HIGH" },
  MDY:    { themes: ["broad_market"], confidence: "HIGH" },
  SPYG:   { themes: ["us_growth_etf", "broad_market"], confidence: "HIGH" },
  VUG:    { themes: ["us_growth_etf", "quality_growth"], confidence: "HIGH" },
  IYW:    { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  VGT:    { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  XLK:    { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  FTEC:   { themes: ["us_growth_etf", "mega_cap_tech"], confidence: "HIGH" },
  IGV:    { themes: ["software_saas"], confidence: "HIGH" },
  IGM:    { themes: ["us_growth_etf"], confidence: "HIGH" },
  XSW:    { themes: ["software_saas"], confidence: "HIGH" },
  BOTZ:   { themes: ["ai_hypergrowth"], confidence: "HIGH" },
  CIBR:   { themes: ["cybersecurity"], confidence: "HIGH" },
  HACK:   { themes: ["cybersecurity"], confidence: "HIGH" },
  BUG:    { themes: ["cybersecurity"], confidence: "HIGH" },
  FDN:    { themes: ["cloud_platform", "us_growth_etf"], confidence: "MEDIUM" },
  SKYY:   { themes: ["cloud_platform"], confidence: "HIGH" },
  CLOU:   { themes: ["cloud_platform"], confidence: "HIGH" },
  WCLD:   { themes: ["cloud_platform"], confidence: "HIGH" },
  PSI:    { themes: ["semis_pure"], confidence: "HIGH" },
  XSD:    { themes: ["semis_pure"], confidence: "HIGH" },
  SMH:    { themes: ["semis_pure"], confidence: "HIGH" },
  SOXX:   { themes: ["semis_pure"], confidence: "HIGH" },
  SOXQ:   { themes: ["semis_pure"], confidence: "HIGH" },

  // Macro defensive
  GLD:    { themes: ["precious_metals", "macro_defensive"], confidence: "HIGH" },
  TLT:    { themes: ["macro_defensive"], confidence: "HIGH" },

  // Industrials
  ETN:    { themes: ["industrials"], confidence: "HIGH" },
  PH:     { themes: ["industrials"], confidence: "HIGH" },
  ROP:    { themes: ["industrials"], confidence: "HIGH" },
  HUBB:   { themes: ["industrials"], confidence: "HIGH" },
  WM:     { themes: ["industrials"], confidence: "HIGH" },
  TT:     { themes: ["industrials"], confidence: "HIGH" },
  LIN:    { themes: ["industrials"], confidence: "HIGH" },

  // Broad / catch-all (confidence basse — classification minimale)
  COST:   { themes: ["broad_market"], confidence: "LOW" },
  LLY:    { themes: ["broad_market"], confidence: "LOW" },
  VRTX:   { themes: ["broad_market"], confidence: "LOW" },
  ELV:    { themes: ["broad_market"], confidence: "LOW" },
  PDD:    { themes: ["broad_market"], confidence: "LOW" },
  ABNB:   { themes: ["broad_market"], confidence: "LOW" },
  UBER:   { themes: ["broad_market"], confidence: "LOW" },
  BKNG:   { themes: ["broad_market"], confidence: "LOW" },
  MELI:   { themes: ["broad_market"], confidence: "LOW" },
  SE:     { themes: ["broad_market"], confidence: "LOW" },
  EA:     { themes: ["broad_market"], confidence: "LOW" },
  TTWO:   { themes: ["broad_market"], confidence: "LOW" },

  // Europe equity
  SAP:    { themes: ["software_saas", "europe_equity"], confidence: "HIGH" },
  AIR:    { themes: ["industrials", "europe_equity"], confidence: "MEDIUM" },
  LVMH:   { themes: ["europe_equity"], confidence: "HIGH" },
  TTE:    { themes: ["europe_equity"], confidence: "HIGH" },
  NESN:   { themes: ["europe_equity"], confidence: "HIGH" },
  RMS:    { themes: ["europe_equity"], confidence: "HIGH" },
  SIE:    { themes: ["industrials", "europe_equity"], confidence: "HIGH" },
  DSY:    { themes: ["software_saas", "europe_equity"], confidence: "HIGH" },

  // FX
  EURUSD: { themes: ["macro_fx"], confidence: "HIGH" },
  GBPUSD: { themes: ["macro_fx"], confidence: "HIGH" },
  USDJPY: { themes: ["macro_fx"], confidence: "HIGH" },
};

// === Helpers ==========================================================

/**
 * Retourne l'entrée brute pour un symbole, ou null si absent.
 * Préférer `classifySymbolThemes` pour une réponse normalisée.
 */
export function getSymbolThemes(symbol) {
  return THEME_CLASSIFICATION[symbol] ?? null;
}

/**
 * Classification normalisée : retourne toujours { themes, confidence }.
 * Si le symbole est absent, retourne { themes: [], confidence: "UNKNOWN" }.
 */
export function classifySymbolThemes(symbol) {
  const entry = THEME_CLASSIFICATION[symbol];
  if (!entry) return { themes: [], confidence: "UNKNOWN" };
  return { themes: entry.themes, confidence: entry.confidence };
}
