// ============================================================
// ManiTradePro Worker — V2
// Bloc 1 : Infrastructure KV + Cron
// Bloc 2 : Contrôle total des appels
// Bloc 3 : Cache optimisé
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// ============================================================
// CONSTANTES
// ============================================================
const DAILY_TWELVE_BUDGET = 3000; // 4 clés × 800 = 3200 réels, 3000 limite sécurisée
const TWELVE_PER_KEY_MINUTE_CREDITS = 8;
const AI_DAILY_HARD_LIMIT = 8;
const AI_SYMBOL_COOLDOWN_MS = 1000 * 60 * 60 * 6;
const OPPORTUNITIES_CONCURRENCY = 2; // Cloudflare limit 50 subrequêtes — 2 actifs simultanés max
const NEWS_FETCH_TIMEOUT_MS = 7000;
const NEWS_AI_ARTICLE_LIMIT = 4;
const NEWS_AI_ARTICLE_TIMEOUT_MS = 2200;
const NEWS_AI_TIMEOUT_MS = 5000;
const NEWS_MIN_RELEVANCE_SCORE = 5;
const ENGINE_VERSION = "engine_v2_0_0";
const ENGINE_RULESET = "multi_strategy_v1";

// TTL en secondes pour KV
const KV_TTL = {
  regime:        3600,      // 1h
  candlesDaily:  43200,     // 12h
  candles4h:     7200,      // 2h
  candles1h:     1800,      // 30min
  opportunities: 900,       // 15min
  news:          900,       // 15min
};

// TTL en ms pour memoryCache (quotes — trop fréquents pour KV)
const TTL = {
  opportunitiesNonCrypto: 15 * 60 * 1000,
  quoteCrypto:            30 * 1000,
  quoteNonCrypto:         60 * 60 * 1000,
  detailCrypto:           60 * 1000,
  detailNonCrypto:        60 * 60 * 1000,
  candlesCrypto:          5 * 60 * 1000,
  candlesNonCrypto:       12 * 60 * 60 * 1000,
  fearGreed:              300000,
  trending:               300000,
  news:                   15 * 60 * 1000,
};

// ============================================================
// PANEL D'ACTIFS — 35 actifs
// ============================================================
const LIGHT_SYMBOLS = [
  // Proxy régime (toujours en premier — calculés avant les autres)
  "SPY", "QQQ", "TLT", "GLD",
  // Crypto Binance (0 coût TwelveData)
  "BTC", "ETH", "SOL", "BNB", "AVAX", "LINK",
  // Tech US
  "NVDA", "AAPL", "MSFT", "AMD", "META", "GOOGL", "AMZN", "TSLA",
  // Finance US
  "JPM", "V", "MA",
  // Europe
  "ASML", "AIR",
  // Forex
  "EURUSD", "GBPUSD", "USDJPY",
  // Matières premières
  "GOLD", "SILVER", "OIL",
  // Compléments
  "NFLX", "COIN"
];

const PROXY_REGIME_SYMBOLS = ["SPY", "QQQ", "TLT"];

const CRYPTO_SYMBOLS = new Set([
  "BTC","ETH","BNB","SOL","XRP","ADA","DOGE","DOT","LINK","AVAX","ATOM","LTC",
  "MATIC","ARB","OP","AAVE","NEAR","UNI","FIL","ETC","BCH","APT","SUI","TAO","XAUT"
]);

const NAME_MAP = {
  BTC:"Bitcoin",ETH:"Ethereum",BNB:"BNB",SOL:"Solana",XRP:"XRP",ADA:"Cardano",
  DOGE:"Dogecoin",DOT:"Polkadot",LINK:"Chainlink",AVAX:"Avalanche",ATOM:"Cosmos",
  LTC:"Litecoin",MATIC:"Polygon",ARB:"Arbitrum",OP:"Optimism",AAVE:"Aave",
  NEAR:"NEAR Protocol",UNI:"Uniswap",FIL:"Filecoin",ETC:"Ethereum Classic",
  BCH:"Bitcoin Cash",APT:"Aptos",SUI:"Sui",TAO:"Bittensor",XAUT:"Tether Gold",
  V:"Visa",MA:"Mastercard",SPY:"S&P 500 ETF",QQQ:"Nasdaq 100 ETF",
  GLD:"SPDR Gold Shares",TLT:"iShares 20+ Year Treasury Bond ETF",
  AAPL:"Apple",MSFT:"Microsoft",NVDA:"NVIDIA",TSLA:"Tesla",AMZN:"Amazon",
  GOOGL:"Alphabet",META:"Meta",NFLX:"Netflix",AMD:"AMD",JPM:"JPMorgan Chase",
  COIN:"Coinbase",ASML:"ASML",AIR:"Airbus",
  EURUSD:"EUR/USD",GBPUSD:"GBP/USD",USDJPY:"USD/JPY",
  GOLD:"Gold",SILVER:"Silver",OIL:"Crude Oil"
};

// ============================================================
// CIRCUIT BREAKERS — cooldown adaptatif
// ============================================================
const circuitBreakers = {
  twelvedata: { failures: 0, openUntil: 0, threshold: 3, cooldowns: [30000, 60000, 120000, 300000] },
  yahoo:      { failures: 0, openUntil: 0, threshold: 2, cooldowns: [15000, 30000, 60000] },
  supabase:   { failures: 0, openUntil: 0, threshold: 3, cooldowns: [15000, 30000, 60000] },
  binance:    { failures: 0, openUntil: 0, threshold: 5, cooldowns: [10000, 15000, 30000] }
};

function getCooldownMs(cb) {
  const threshold = Math.max(1, Number(cb?.threshold) || 1);
  const index = Math.min(Math.max(0, cb.failures - threshold), cb.cooldowns.length - 1);
  return cb.cooldowns[index];
}

function circuitIsOpen(provider) {
  const cb = circuitBreakers[provider];
  if (!cb) return false;
  if (cb.openUntil > Date.now()) return true;
  if (cb.openUntil > 0) { cb.failures = 0; cb.openUntil = 0; }
  return false;
}

function recordSuccess(provider) {
  const cb = circuitBreakers[provider];
  if (cb) { cb.failures = 0; cb.openUntil = 0; }
}

function recordFailure(provider) {
  const cb = circuitBreakers[provider];
  if (!cb) return;
  cb.failures += 1;
  if (cb.failures < Math.max(1, Number(cb.threshold) || 1)) return;
  cb.openUntil = Date.now() + getCooldownMs(cb);
}

function circuitStatus(provider) {
  const cb = circuitBreakers[provider];
  if (!cb) return { open: false, failures: 0, opensIn: 0 };
  const open = cb.openUntil > Date.now();
  return {
    open,
    failures: cb.failures,
    opensIn: open ? Math.round((cb.openUntil - Date.now()) / 1000) : 0
  };
}

// ============================================================
// RATE LIMITER — TwelveData 28 appels/minute max
// ============================================================
const rateLimiter = {
  windowMs: 60000,
  maxPerWindow: 28,
  calls: []
};

function canCallTwelveData() {
  const now = Date.now();
  rateLimiter.calls = rateLimiter.calls.filter(t => t > now - rateLimiter.windowMs);
  return rateLimiter.calls.length < rateLimiter.maxPerWindow;
}

async function waitForTwelveSlot() {
  if (canCallTwelveData()) return;
  const oldest = rateLimiter.calls[0];
  const waitMs = oldest + rateLimiter.windowMs - Date.now() + 200;
  await sleep(Math.min(waitMs, 10000));
}

function recordTwelveCall() {
  rateLimiter.calls.push(Date.now());
}

// ============================================================
// UTILITAIRES DE BASE
// ============================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function nowIso() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }
function parseSymbol(raw) { return String(raw || "").trim().toUpperCase(); }
function isCrypto(symbol) { return CRYPTO_SYMBOLS.has(symbol); }
function isForex(symbol) { return ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD"].includes(symbol); }
function isCommodity(symbol) { return ["GOLD","SILVER","OIL"].includes(symbol); }
function isEtf(symbol) { return ["SPY","QQQ","GLD","TLT"].includes(symbol); }
function getAssetClass(symbol) {
  if (isCrypto(symbol)) return "crypto";
  if (isForex(symbol)) return "forex";
  if (isCommodity(symbol)) return "commodity";
  if (isEtf(symbol)) return "etf";
  return "stock";
}
function getDisplayName(symbol) { return NAME_MAP[symbol] || symbol; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function pctChange(a, b) {
  return (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) ? null : ((a - b) / b) * 100;
}
function finiteOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
function compactProviderError(message) {
  const msg = String(message || "");
  const lower = msg.toLowerCase();
  if (!msg) return "Source temporarily unavailable";
  if (lower.includes("alpha vantage") || lower.includes("alphavantage.co")) {
    return "Source temporairement indisponible";
  }
  if (msg.includes("run out of API credits")) return "Minute quota reached";
  if (msg.includes("apikey") && msg.includes("incorrect")) return "Provider key rejected";
  if (msg.includes("Too many subrequests")) return "Cloudflare subrequest limit reached";
  if (msg.includes("circuit_open")) return "Provider circuit ouvert — fallback actif";
  if (msg.includes("rate_limit")) return "Rate limit atteint — attente en cours";
  return msg;
}
function shouldTripTwelveCircuit(message) {
  const lower = String(message || "").toLowerCase();
  if (!lower) return true;
  if (lower.includes("apikey") && lower.includes("incorrect")) return false;
  if (lower.includes("bad request")) return false;
  if (lower.includes("invalid symbol") || lower.includes("symbol not found") || lower.includes("no symbol")) return false;
  return true;
}
function safeErrorMessage(error) {
  if (error instanceof Error) return error.message || "Internal worker error";
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Internal worker error"; }
}
function cloneJsonPayload(value) {
  try { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  catch { return value; }
}

// ============================================================
// TIMEOUT GLOBAL
// ============================================================
async function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

// ============================================================
// FETCH WITH RETRY
// ============================================================
async function fetchWithRetry(url, init = {}, options = {}) {
  const {
    timeoutMs = 10000,
    maxRetries = 3,
    backoffMs = 1000,
    retryOn = [429, 500, 502, 503, 504]
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * Math.pow(2, attempt - 1));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      clearTimeout(timer);

      // Erreur permanente → pas de retry
      if ([400, 401, 403, 404].includes(res.status)) return res;
      // Erreur temporaire → retry
      if (retryOn.includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      if (e.name === "AbortError") { lastError = new Error("timeout"); continue; }
      throw e;
    }
  }

  throw lastError || new Error("max_retries_reached");
}

// ============================================================
// KV CACHE — persistant toutes instances
// ============================================================
async function kvGet(key, env) {
  if (!env?.MTP_CACHE) return null;
  try {
    const raw = await env.MTP_CACHE.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

async function kvSet(key, value, ttlSeconds, env) {
  if (!env?.MTP_CACHE) return false;
  try {
    await env.MTP_CACHE.put(key, JSON.stringify(value), {
      expirationTtl: Math.max(60, ttlSeconds)
    });
    return true;
  } catch { return false; }
}

async function kvGetOrFetch(key, ttlSeconds, producer, env) {
  // 1. KV d'abord
  const cached = await kvGet(key, env);
  if (cached) return cached;
  // 2. Fetch + stockage KV
  const result = await producer();
  await kvSet(key, result, ttlSeconds, env);
  return result;
}

// ============================================================
// MEMORY CACHE — quotes (trop fréquents pour KV)
// ============================================================
const memoryCache = new Map();
let opportunitiesSnapshotCache = { expiresAt: 0, rows: null };

function setMemoryCache(key, ttlMs, payload) {
  memoryCache.set(key, { expiresAt: nowMs() + ttlMs, payload });
  return payload;
}
function getMemoryCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= nowMs()) { memoryCache.delete(key); return null; }
  return hit.payload;
}
async function getCachedOrFetch(key, ttlMs, producer) {
  const cached = getMemoryCache(key);
  if (cached) return cloneJsonPayload(cached);
  const payload = await producer();
  if (payload instanceof Response) throw new Error(`response_cache_forbidden:${key}`);
  return setMemoryCache(key, ttlMs, cloneJsonPayload(payload));
}

function setOpportunitySnapshot(rows, ttlMs) {
  opportunitiesSnapshotCache = { expiresAt: nowMs() + ttlMs, rows: cloneJsonPayload(rows) };
  return opportunitiesSnapshotCache.rows;
}
function getOpportunitySnapshot() {
  if (!opportunitiesSnapshotCache.rows) return null;
  if (opportunitiesSnapshotCache.expiresAt <= nowMs()) {
    opportunitiesSnapshotCache = { expiresAt: 0, rows: null };
    return null;
  }
  return cloneJsonPayload(opportunitiesSnapshotCache.rows);
}

// ============================================================
// RÉPONSES HTTP
// ============================================================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS }
  });
}
function jsonWithCache(data, ttlSeconds = 900) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${ttlSeconds}`,
      ...CORS_HEADERS
    }
  });
}
function ok(data, source, asOf, freshness, message = null) {
  return json({ status: "ok", source, asOf, freshness, message, data });
}
function okCached(data, source, asOf, freshness, message = null, ttlSeconds = 900) {
  return jsonWithCache({ status: "ok", source, asOf, freshness, message, data }, ttlSeconds);
}
function partial(data, source, asOf, freshness, message) {
  return json({ status: "partial", source, asOf, freshness, message, data });
}
function fail(message, status = "error", httpCode = 500) {
  return json({ status, source: null, asOf: null, freshness: "unknown", message, data: null }, httpCode);
}
async function safeRoute(handler) {
  try { return await handler(); }
  catch (error) { return fail(safeErrorMessage(error), "error", 500); }
}

// ============================================================
// CONCURRENCE
// ============================================================
async function mapWithConcurrency(items, limit, mapper) {
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(limit) || 1);
  const results = new Array(list.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= list.length) return;
      try { results[index] = await mapper(list[index], index); }
      catch (error) { results[index] = error; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, list.length || 1) }, () => worker()));
  return results;
}

function createBudgetContext(routeName) {
  return {
    routeName,
    twelveCalls: 0,
    twelveKeyCredits: [],
    eventId: `${routeName}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
  };
}
function attachBudgetHeaders(response, ctx) {
  if (!response || !ctx) return response;
  const headers = new Headers(response.headers);
  headers.set("X-MTP-Twelve-Calls", String(ctx.twelveCalls || 0));
  headers.set("X-MTP-Budget-Event", ctx.eventId || "none");
  headers.set("X-MTP-Budget-Limit", String(DAILY_TWELVE_BUDGET));
  headers.set("X-MTP-Route-Name", ctx.routeName || "unknown");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ============================================================
// PROVIDERS — SYMBOLS
// ============================================================
function normalizeTwelveSymbol(symbol) {
  const map = {
    AIR:"AIR.PA",GOLD:"XAU/USD",SILVER:"XAG/USD",OIL:"BRENT",
    EURUSD:"EUR/USD",GBPUSD:"GBP/USD",USDJPY:"USD/JPY",USDCHF:"USD/CHF",AUDUSD:"AUD/USD"
  };
  return map[symbol] || symbol;
}
function normalizeBinanceSymbol(symbol) {
  const map = {
    BTC:"BTCUSDT",ETH:"ETHUSDT",BNB:"BNBUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT",
    ADA:"ADAUSDT",DOGE:"DOGEUSDT",DOT:"DOTUSDT",LINK:"LINKUSDT",AVAX:"AVAXUSDT",
    ATOM:"ATOMUSDT",LTC:"LTCUSDT",MATIC:"POLUSDT",ARB:"ARBUSDT",OP:"OPUSDT",
    AAVE:"AAVEUSDT",NEAR:"NEARUSDT",UNI:"UNIUSDT",FIL:"FILUSDT",ETC:"ETCUSDT",
    BCH:"BCHUSDT",APT:"APTUSDT",SUI:"SUIUSDT",TAO:"TAOUSDT",XAUT:"XAUTUSDT"
  };
  return map[symbol] || `${symbol}USDT`;
}
function normalizeYahooSymbol(symbol) {
  const map = {
    AIR:"AIR.PA",
    EURUSD:"EURUSD=X",GBPUSD:"GBPUSD=X",USDJPY:"USDJPY=X",
    USDCHF:"USDCHF=X",AUDUSD:"AUDUSD=X",GOLD:"GC=F",SILVER:"SI=F",OIL:"CL=F"
  };
  return map[symbol] || symbol;
}
function getAlphaSymbol(symbol) {
  const map = { AIR:"AIR.PA" };
  return map[symbol] || symbol;
}
function getTwelveKeys(env) {
  return [env.TWELVE_KEY_1, env.TWELVE_KEY_2, env.TWELVE_KEY_3, env.TWELVE_KEY_4].filter(Boolean);
}
function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
function ensureTwelveKeyCredits(ctx, keyCount) {
  if (!ctx || !Number.isInteger(keyCount) || keyCount <= 0) return [];
  if (!Array.isArray(ctx.twelveKeyCredits)) ctx.twelveKeyCredits = [];
  while (ctx.twelveKeyCredits.length < keyCount) ctx.twelveKeyCredits.push(0);
  return ctx.twelveKeyCredits;
}
function noteTwelveKeyUsage(ctx, keyIndex, credits = 1) {
  if (!ctx || !Number.isInteger(keyIndex) || keyIndex < 0) return;
  const creditsByKey = ensureTwelveKeyCredits(ctx, keyIndex + 1);
  creditsByKey[keyIndex] = Number(creditsByKey[keyIndex] || 0) + Math.max(1, Number(credits) || 1);
}
function pickPreferredTwelveKeyIndex(env, ctx, seed = "") {
  if (!ctx) return null;
  const keyCount = getTwelveKeys(env).length;
  if (!keyCount) return null;
  const creditsByKey = ensureTwelveKeyCredits(ctx, keyCount);
  const startIndex = hashString(String(seed || "twelve")) % keyCount;
  let chosenIndex = startIndex;
  let chosenCredits = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < keyCount; offset++) {
    const index = (startIndex + offset) % keyCount;
    const credits = Number(creditsByKey[index] || 0);
    if (credits < chosenCredits) {
      chosenCredits = credits;
      chosenIndex = index;
    }
  }
  return chosenIndex;
}

async function callTwelveJsonWithPreferredKeys(path, env, preferredIndexes = [], ctx = null, seed = "", creditCost = 1) {
  if (circuitIsOpen("twelvedata")) throw new Error("twelvedata_circuit_open");

  const keys = getTwelveKeys(env);
  if (!keys.length) return { ok: false, message: "No Twelve Data keys configured" };

  await waitForTwelveSlot();

  const normalizedCreditCost = Math.max(1, Number(creditCost) || 1);

  if (ctx && (ctx.twelveCalls + normalizedCreditCost) > DAILY_TWELVE_BUDGET) {
    throw new Error("twelvedata_daily_budget_exceeded");
  }

  const preferred = (preferredIndexes || []).filter(index => Number.isInteger(index) && index >= 0 && index < keys.length);
  const fallbackStart = hashString(`${seed}:${path}`) % keys.length;
  const fallback = [];
  for (let offset = 0; offset < keys.length; offset++) {
    const index = (fallbackStart + offset) % keys.length;
    if (!preferred.includes(index)) fallback.push(index);
  }
  const order = [...preferred, ...fallback];

  let lastError = null;
  for (const index of order) {
    const key = keys[index];
    try {
      const sep = path.includes("?") ? "&" : "?";
      const url = `https://api.twelvedata.com${path}${sep}apikey=${encodeURIComponent(key)}`;
      recordTwelveCall();
      if (ctx) {
        ctx.twelveCalls += normalizedCreditCost;
        noteTwelveKeyUsage(ctx, index, normalizedCreditCost);
      }

      const res = await fetchWithRetry(
        url,
        { headers: { Accept: "application/json" } },
        { timeoutMs: 10000, maxRetries: 2, backoffMs: 1000, retryOn: [500, 502, 503, 504] }
      );
      const data = await res.json();

      if (!res.ok || data?.status === "error" || data?.code === 429) {
        lastError = { ok: false, message: data?.message || `HTTP ${res.status}` };
        continue;
      }

      recordSuccess("twelvedata");
      return { ok: true, data };
    } catch (e) {
      lastError = { ok: false, message: e instanceof Error ? e.message : "Twelve fetch failed" };
    }
  }

  if (shouldTripTwelveCircuit(lastError?.message)) recordFailure("twelvedata");
  return lastError || { ok: false, message: "All Twelve keys failed" };
}

// ============================================================
// TWELVEDATA — avec circuit breaker + rate limiter
// ============================================================
async function callTwelveJson(path, env, seed = "", ctx = null) {
  // Circuit breaker
  if (circuitIsOpen("twelvedata")) throw new Error("twelvedata_circuit_open");

  const keys = getTwelveKeys(env);
  if (!keys.length) return { ok: false, message: "No Twelve Data keys configured" };

  // Rate limiter
  await waitForTwelveSlot();

  // Budget journalier
  if (ctx && ctx.twelveCalls >= DAILY_TWELVE_BUDGET) {
    throw new Error("twelvedata_daily_budget_exceeded");
  }

  const startIndex = hashString(`${seed}:${path}`) % keys.length;
  let lastError = null;

  for (let offset = 0; offset < keys.length; offset++) {
    const key = keys[(startIndex + offset) % keys.length];
    try {
      const sep = path.includes("?") ? "&" : "?";
      const url = `https://api.twelvedata.com${path}${sep}apikey=${encodeURIComponent(key)}`;
      recordTwelveCall();
      if (ctx) ctx.twelveCalls += 1;

      const res = await fetchWithRetry(
        url,
        { headers: { Accept: "application/json" } },
        { timeoutMs: 10000, maxRetries: 2, backoffMs: 1000, retryOn: [500, 502, 503, 504] }
      );
      const data = await res.json();

      if (!res.ok || data?.status === "error" || data?.code === 429) {
        lastError = { ok: false, message: data?.message || `HTTP ${res.status}` };
        continue;
      }

      recordSuccess("twelvedata");
      return { ok: true, data };
    } catch (e) {
      lastError = { ok: false, message: e instanceof Error ? e.message : "Twelve fetch failed" };
    }
  }

  if (shouldTripTwelveCircuit(lastError?.message)) recordFailure("twelvedata");
  return lastError || { ok: false, message: "All Twelve keys failed" };
}

// ============================================================
// YAHOO BATCH — source principale pour les quotes non-crypto
// ============================================================
async function getYahooBatchQuotes(symbols) {
  if (!symbols.length) return {};

  if (circuitIsOpen("yahoo")) throw new Error("yahoo_circuit_open");

  return getCachedOrFetch(`batch:yahoo:${symbols.join(",")}`, TTL.opportunitiesNonCrypto, async () => {
    const wanted = {};
    for (const symbol of symbols) wanted[normalizeYahooSymbol(symbol)] = symbol;
    const joined = Object.keys(wanted).join(",");
    try {
      const res = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}`,
        { headers: { Accept: "application/json" } },
        { timeoutMs: 8000, maxRetries: 2, backoffMs: 500 }
      );
      if (!res.ok) throw new Error(`Yahoo batch HTTP ${res.status}`);
      const payload = await res.json();
      const results = Array.isArray(payload?.quoteResponse?.result) ? payload.quoteResponse.result : [];
      const out = {};
      for (const row of results) {
        const original = wanted[String(row.symbol || "")];
        if (!original) continue;
        const price = Number(row.regularMarketPrice);
        if (!Number.isFinite(price)) continue;
        out[original] = {
          symbol: original,
          name: row.shortName || row.longName || getDisplayName(original),
          assetClass: getAssetClass(original),
          price,
          change24hPct: Number.isFinite(Number(row.regularMarketChangePercent)) ? Number(row.regularMarketChangePercent) : null,
          volume24h: Number.isFinite(Number(row.regularMarketVolume)) ? Number(row.regularMarketVolume) : null,
          currency: row.currency || "USD",
          eurusdRate: null, // sera rempli si disponible
          sourceUsed: "yahoo",
          freshness: "recent"
        };
      }
      recordSuccess("yahoo");
      return out;
    } catch (e) {
      recordFailure("yahoo");
      throw e;
    }
  });
}

async function getYahooQuote(symbol) {
  const rows = await getYahooBatchQuotes([symbol]);
  if (!rows[symbol]) throw new Error("Yahoo quote unavailable");
  return rows[symbol];
}

// ============================================================
// EURUSD RATE — pour conversion front
// ============================================================
async function getEurusdRate(env) {
  const cacheKey = "eurusd:rate";
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    const quotes = await getYahooBatchQuotes(["EURUSD"]);
    const rate = quotes?.EURUSD?.price;
    if (Number.isFinite(rate) && rate > 0.5 && rate < 2.0) {
      setMemoryCache(cacheKey, 15 * 60 * 1000, rate);
      return rate;
    }
  } catch {}

  try {
    const quote = await getTwelveQuote("EURUSD", env, null);
    const rate = Number(quote?.price);
    if (Number.isFinite(rate) && rate > 0.5 && rate < 2.0) {
      setMemoryCache(cacheKey, 15 * 60 * 1000, rate);
      return rate;
    }
  } catch {}
  return 0.92; // fallback
}

// ============================================================
// BINANCE — crypto
// ============================================================
async function getCryptoQuote(symbol) {
  if (circuitIsOpen("binance")) throw new Error("binance_circuit_open");

  return getCachedOrFetch(`quote:binance:${symbol}`, TTL.quoteCrypto, async () => {
    const pair = normalizeBinanceSymbol(symbol);
    try {
      // Sequentiel — limite subrequetes Cloudflare
      const statsRes = await fetchWithRetry(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`, {}, { timeoutMs: 5000, maxRetries: 2 });
      if (!statsRes.ok) throw new Error(`Binance stats HTTP ${statsRes.status}`);
      const statsData = await statsRes.json();
      const priceData = { price: statsData.lastPrice || statsData.weightedAvgPrice };
      recordSuccess("binance");
      return {
        symbol, name: getDisplayName(symbol), assetClass: "crypto",
        price: Number(priceData.price),
        change24hPct: statsData.priceChangePercent != null ? Number(statsData.priceChangePercent) : null,
        volume24h: statsData.quoteVolume != null ? Number(statsData.quoteVolume) : null,
        currency: "USD", sourceUsed: "binance", freshness: "live"
      };
    } catch (e) {
      recordFailure("binance");
      throw e;
    }
  });
}

// ============================================================
// TWELVEDATA QUOTE — fallback non-crypto
// ============================================================
async function getTwelveQuote(symbol, env, ctx = null) {
  return getCachedOrFetch(`quote:twelve:${symbol}`, TTL.quoteNonCrypto, async () => {
    const tdSymbol = normalizeTwelveSymbol(symbol);
    const result = await callTwelveJson(`/quote?symbol=${encodeURIComponent(tdSymbol)}`, env, symbol, ctx);
    if (!result.ok) throw new Error(result.message || "Twelve quote unavailable");
    const q = result.data;
    const price = q.close != null ? Number(q.close) : q.price != null ? Number(q.price) : null;
    if (price == null || Number.isNaN(price)) throw new Error("Invalid Twelve price");
    return {
      symbol, name: q.name || getDisplayName(symbol), assetClass: getAssetClass(symbol), price,
      change24hPct: q.percent_change != null ? Number(q.percent_change) : null,
      volume24h: q.volume != null ? Number(q.volume) : null,
      currency: q.currency || "USD", sourceUsed: "twelvedata", freshness: "live"
    };
  });
}

// ============================================================
// TWELVEDATA BATCH — 1 seul appel pour toutes les quotes non-crypto
// TwelveData supporte jusqu'à 120 symboles par requête batch
// C'est LA solution au problème de limite subrequêtes Cloudflare
// ============================================================
function parseTwelveQuoteRow(q, symbol) {
  if (!q) return null;
  const price = q.close != null ? Number(q.close) : q.price != null ? Number(q.price) : null;
  if (price == null || Number.isNaN(price) || price <= 0) return null;
  return {
    symbol,
    name: q.name || getDisplayName(symbol),
    assetClass: getAssetClass(symbol),
    price,
    change24hPct: q.percent_change != null ? Number(q.percent_change) : null,
    volume24h: q.volume != null ? Number(q.volume) : null,
    currency: q.currency || "USD",
    sourceUsed: "twelvedata",
    freshness: "live"
  };
}

function getTwelveBatchGroup(symbol) {
  if (isForex(symbol)) return "forex";
  if (isCommodity(symbol)) return "commodity";
  return "equity";
}

function getTwelveBatchGroups(symbols) {
  const groups = { equity: [], forex: [], commodity: [] };
  for (const symbol of symbols || []) {
    groups[getTwelveBatchGroup(symbol)].push(symbol);
  }
  return Object.values(groups).filter(group => group.length > 0);
}

function buildTwelveBatchChunks(symbols) {
  const chunks = [];
  for (const group of getTwelveBatchGroups(symbols)) {
    const groupLabel = getTwelveBatchGroup(group[0]);
    for (let index = 0; index < group.length; index += TWELVE_PER_KEY_MINUTE_CREDITS) {
      chunks.push({
        group: groupLabel,
        symbols: group.slice(index, index + TWELVE_PER_KEY_MINUTE_CREDITS)
      });
    }
  }
  return chunks;
}

function assignTwelveBatchChunksToKeys(chunks, keyCount) {
  const creditsByKey = Array.from({ length: Math.max(1, keyCount) }, () => 0);
  return (chunks || []).map((chunk, chunkIndex) => {
    let chosenKey = -1;
    let chosenCredits = Number.POSITIVE_INFINITY;

    for (let keyIndex = 0; keyIndex < creditsByKey.length; keyIndex++) {
      const projected = creditsByKey[keyIndex] + chunk.symbols.length;
      if (projected > TWELVE_PER_KEY_MINUTE_CREDITS) continue;
      if (creditsByKey[keyIndex] < chosenCredits) {
        chosenCredits = creditsByKey[keyIndex];
        chosenKey = keyIndex;
      }
    }

    if (chosenKey === -1) {
      chosenKey = creditsByKey.indexOf(Math.min(...creditsByKey));
    }

    creditsByKey[chosenKey] += chunk.symbols.length;
    return { ...chunk, chunkIndex, keyIndex: chosenKey };
  });
}

function normalizeTwelveLookupKey(value) {
  return decodeURIComponent(String(value || "")).trim().toUpperCase();
}

function unwrapTwelveBatchRow(value) {
  if (value && typeof value === "object" && value.status === "ok" && value.data && typeof value.data === "object") {
    return value.data;
  }
  return value;
}

function findTwelveBatchRow(data, symbol) {
  const wanted = new Set([
    normalizeTwelveLookupKey(symbol),
    normalizeTwelveLookupKey(normalizeTwelveSymbol(symbol))
  ]);

  const tryMatch = (row, key = "") => {
    const cleanRow = unwrapTwelveBatchRow(row);
    const rowSymbol = normalizeTwelveLookupKey(cleanRow?.symbol || cleanRow?.meta?.symbol || key);
    return wanted.has(rowSymbol) ? cleanRow : null;
  };

  if (Array.isArray(data)) {
    for (const row of data) {
      const match = tryMatch(row);
      if (match) return match;
    }
    return null;
  }

  if (!data || typeof data !== "object") return null;

  for (const [key, value] of Object.entries(data)) {
    const match = tryMatch(value, key);
    if (match) return match;
  }

  const nestedArrays = [data.data, data.values, data.result].filter(Array.isArray);
  for (const rows of nestedArrays) {
    for (const row of rows) {
      const match = tryMatch(row);
      if (match) return match;
    }
  }

  return null;
}

async function getTwelveBatchQuotes(symbols, env, ctx = null) {
  if (!symbols || !symbols.length) return {};

  if (circuitIsOpen("twelvedata")) {
    throw new Error("twelvedata_circuit_open");
  }

  // Vérifier ce qui est déjà en cache mémoire
  const toFetch = [];
  const fromCache = {};
  for (const symbol of symbols) {
    const cached = getMemoryCache(`quote:twelve:${symbol}`);
    if (cached) {
      fromCache[symbol] = cached;
    } else {
      toFetch.push(symbol);
    }
  }

  if (!toFetch.length) return fromCache;
  const out = { ...fromCache };
  const groupErrors = [];
  const plannedChunks = assignTwelveBatchChunksToKeys(buildTwelveBatchChunks(toFetch), getTwelveKeys(env).length);

  for (const chunk of plannedChunks) {
    const tdSymbols = chunk.symbols.map(normalizeTwelveSymbol).join(",");
    const result = await callTwelveJsonWithPreferredKeys(
      `/quote?symbol=${encodeURIComponent(tdSymbols)}`,
      env,
      [chunk.keyIndex],
      ctx,
      `batch:${chunk.group}:${chunk.chunkIndex}`,
      chunk.symbols.length
    );

    if (!result.ok) {
      groupErrors.push(result.message || `Twelve batch unavailable:${chunk.group}`);
      continue;
    }

    // Si un seul symbole → la réponse est directement l'objet
    // Si plusieurs symboles → la réponse est un objet keyed par symbol TwelveData
    if (chunk.symbols.length === 1) {
      const symbol = chunk.symbols[0];
      const parsed = parseTwelveQuoteRow(result.data, symbol);
      if (parsed) {
        setMemoryCache(`quote:twelve:${symbol}`, TTL.quoteNonCrypto, parsed);
        out[symbol] = parsed;
      }
      continue;
    }

    const data = result.data;
    let parsedCount = 0;
    for (const symbol of chunk.symbols) {
      const q = findTwelveBatchRow(data, symbol);
      if (!q) continue;
      const parsed = parseTwelveQuoteRow(q, symbol);
      if (parsed) {
        setMemoryCache(`quote:twelve:${symbol}`, TTL.quoteNonCrypto, parsed);
        out[symbol] = parsed;
        parsedCount += 1;
      }
    }

    if (parsedCount === 0) {
      groupErrors.push(`empty_batch_response:${chunk.group}`);
    }
  }

  if (Object.keys(out).length === Object.keys(fromCache).length && groupErrors.length) {
    throw new Error(groupErrors[0] || "Twelve batch unavailable");
  }

  return out;
}

// ============================================================
// ALPHA VANTAGE — dernier recours
// ============================================================
async function callAlphaVantageJson(url, env) {
  if (!env.ALPHAVANTAGE_KEY) return { ok: false, message: "Alpha Vantage key missing" };
  try {
    const res = await fetchWithRetry(url, {}, { timeoutMs: 10000, maxRetries: 1 });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    if (data.Note || data.Information || data["Error Message"]) {
      return { ok: false, message: data.Note || data.Information || data["Error Message"] };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Alpha Vantage fetch failed" };
  }
}

async function getAlphaQuote(symbol, env) {
  return getCachedOrFetch(`quote:alpha:${symbol}`, TTL.quoteNonCrypto, async () => {
    const key = encodeURIComponent(env.ALPHAVANTAGE_KEY);
    if (isForex(symbol)) {
      const from = symbol.slice(0, 3), to = symbol.slice(3, 6);
      const result = await callAlphaVantageJson(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${key}`, env
      );
      if (!result.ok) throw new Error(result.message || "Alpha forex unavailable");
      const row = result.data["Realtime Currency Exchange Rate"];
      if (!row) throw new Error("Invalid Alpha forex payload");
      const price = Number(row["5. Exchange Rate"]);
      if (!Number.isFinite(price)) throw new Error("Invalid Alpha forex price");
      return { symbol, name: getDisplayName(symbol), assetClass: "forex", price, change24hPct: null, volume24h: null, currency: to, sourceUsed: "alphavantage", freshness: "recent" };
    }
    const alphaSymbol = getAlphaSymbol(symbol);
    const result = await callAlphaVantageJson(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(alphaSymbol)}&apikey=${key}`, env
    );
    if (!result.ok) throw new Error(result.message || "Alpha quote unavailable");
    const row = result.data["Global Quote"];
    if (!row || !row["05. price"]) throw new Error("Invalid Alpha quote payload");
    const price = Number(row["05. price"]);
    if (!Number.isFinite(price)) throw new Error("Invalid Alpha price");
    return {
      symbol, name: getDisplayName(symbol), assetClass: getAssetClass(symbol), price,
      change24hPct: row["10. change percent"] ? Number(String(row["10. change percent"]).replace("%","")) : null,
      volume24h: row["06. volume"] ? Number(row["06. volume"]) : null,
      currency: "USD", sourceUsed: "alphavantage", freshness: "recent"
    };
  });
}

// ============================================================
// RESOLVE UNIFIED QUOTE
// Hiérarchie : Crypto→Binance | Non-crypto→TwelveData→Yahoo→Alpha
// TwelveData est plus fiable que Yahoo (API officielle vs scraping)
// ============================================================
async function resolveUnifiedMarketQuote(symbol, env, ctx = null, options = {}) {
  const clean = parseSymbol(symbol);
  const { allowAlphaFallback = true, skipTwelveData = false } = options || {};

  // Cache mémoire
  const cached = getMemoryCache(`market:snapshot:${clean}`);
  if (cached) return cached;

  let quote = null;
  const errors = [];

  if (isCrypto(clean)) {
    // Crypto → Binance uniquement
    quote = await getCryptoQuote(clean);
  } else {
    // Non-crypto → TwelveData en premier (API officielle, fiable)
    if (!skipTwelveData && !circuitIsOpen("twelvedata")) {
      try {
        quote = await getTwelveQuote(clean, env, ctx);
      } catch (e) {
        errors.push(`twelve:${e.message}`);
      }
    }

    // Fallback Yahoo
    if (!quote && !circuitIsOpen("yahoo")) {
      try {
        quote = await getYahooQuote(clean);
      } catch (e) {
        errors.push(`yahoo:${e.message}`);
      }
    }

    // Fallback Alpha Vantage
    if (!quote && allowAlphaFallback) {
      try {
        quote = await getAlphaQuote(clean, env);
      } catch (e) {
        errors.push(`alpha:${e.message}`);
      }
    }

    if (!quote) throw new Error(compactProviderError(errors[0] || "all_sources_failed"));
  }

  const ttl = isCrypto(clean) ? TTL.quoteCrypto : TTL.quoteNonCrypto;
  setMemoryCache(`market:snapshot:${clean}`, ttl, quote);
  return quote;
}

// ============================================================
// BOUGIES — KV pour non-crypto, Binance pour crypto
// ============================================================
async function getCryptoCandles(symbol, limit = 90) {
  if (circuitIsOpen("binance")) throw new Error("binance_circuit_open");
  return getCachedOrFetch(`candles:binance:${symbol}:${limit}`, TTL.candlesCrypto, async () => {
    const pair = normalizeBinanceSymbol(symbol);
    const res = await fetchWithRetry(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1d&limit=${Math.min(Math.max(limit,5),300)}`,
      {}, { timeoutMs: 8000, maxRetries: 2 }
    );
    if (!res.ok) throw new Error(`Binance candles HTTP ${res.status}`);
    const rows = await res.json();
    return rows.map(row => ({
      time: new Date(row[0]).toISOString(),
      open: Number(row[1]), high: Number(row[2]),
      low: Number(row[3]), close: Number(row[4]),
      volume: row[7] != null ? Number(row[7]) : null
    }));
  });
}

async function getCryptoCandlesTf(symbol, timeframe = "1d", limit = 60) {
  if (circuitIsOpen("binance")) throw new Error("binance_circuit_open");
  const intervalMap = { "1d": "1d", "4h": "4h", "1h": "1h" };
  const interval = intervalMap[timeframe] || "1d";
  const cacheKey = `candles:binance:${symbol}:${timeframe}:${limit}`;
  const ttl = timeframe === "1d" ? TTL.candlesCrypto : timeframe === "4h" ? 30 * 60 * 1000 : 15 * 60 * 1000;

  return getCachedOrFetch(cacheKey, ttl, async () => {
    const pair = normalizeBinanceSymbol(symbol);
    const res = await fetchWithRetry(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${Math.min(Math.max(limit,5),300)}`,
      {}, { timeoutMs: 8000, maxRetries: 2 }
    );
    if (!res.ok) throw new Error(`Binance candles HTTP ${res.status}`);
    const rows = await res.json();
    return rows.map(row => ({
      time: new Date(row[0]).toISOString(),
      open: Number(row[1]), high: Number(row[2]),
      low: Number(row[3]), close: Number(row[4]),
      volume: row[7] != null ? Number(row[7]) : null
    }));
  });
}

async function getTwelveCandles(symbol, timeframe, limit, env, ctx = null) {
  const kvKey = `candles:twelve:${symbol}:${timeframe}:${limit}`;
  const kvTtl = timeframe === "1d" ? KV_TTL.candlesDaily : timeframe === "4h" ? KV_TTL.candles4h : KV_TTL.candles1h;

  // KV d'abord (persistant)
  // On essaie le KV dans le producer via kvGetOrFetch
  return getCachedOrFetch(`mem:${kvKey}`, TTL.candlesNonCrypto, async () => {
    // Vérifier KV avant de fetch
    // Note: env n'est pas accessible ici directement — on passe par le worker context
    const tdSymbol = normalizeTwelveSymbol(symbol);
    let interval = "1day";
    if (timeframe === "4h") interval = "4h";
    if (timeframe === "1h") interval = "1h";
    if (timeframe === "1w") interval = "1week";

    const result = await callTwelveJson(
      `/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${encodeURIComponent(interval)}&outputsize=${Math.min(Math.max(limit,5),300)}&order=ASC`,
      env, `${symbol}:${timeframe}`, ctx
    );
    if (!result.ok) throw new Error(result.message || "Twelve candles unavailable");
    const values = Array.isArray(result.data?.values) ? result.data.values : [];
    if (!values.length) throw new Error("No candles available");
    return values.map(row => ({
      time: new Date(row.datetime).toISOString(),
      open: Number(row.open), high: Number(row.high),
      low: Number(row.low), close: Number(row.close),
      volume: row.volume != null && row.volume !== "" ? Number(row.volume) : null
    }));
  });
}

async function getTwelveCandlesWithKV(symbol, timeframe, limit, env, ctx = null) {
  const kvKey = `candles:twelve:${symbol}:${timeframe}`;
  const kvTtl = timeframe === "1d" ? KV_TTL.candlesDaily : timeframe === "4h" ? KV_TTL.candles4h : KV_TTL.candles1h;

  return kvGetOrFetch(kvKey, kvTtl, async () => {
    return getTwelveCandles(symbol, timeframe, limit, env, ctx);
  }, env);
}

async function getStoredDailyQuoteFallback(symbol, env) {
  const memoryCandles = getMemoryCache(`mem:candles:twelve:${symbol}:1d:90`);
  const kvCandles = Array.isArray(memoryCandles) && memoryCandles.length
    ? memoryCandles
    : await kvGet(`candles:twelve:${symbol}:1d`, env);
  const candles = Array.isArray(kvCandles) ? kvCandles : [];
  if (!candles.length) return null;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || null;
  const price = finiteOrNull(last?.close);
  if (!Number.isFinite(price)) return null;

  return {
    symbol,
    name: getDisplayName(symbol),
    assetClass: getAssetClass(symbol),
    price,
    change24hPct: prev ? pctChange(price, prev?.close) : null,
    volume24h: finiteOrNull(last?.volume),
    currency: isForex(symbol) ? symbol.slice(3, 6) : "USD",
    sourceUsed: "snapshot",
    freshness: "recent"
  };
}

async function getCandlesBySymbol(symbol, timeframe, limit, env, ctx = null) {
  if (isCrypto(symbol)) return getCryptoCandlesTf(symbol, timeframe, limit);
  return getTwelveCandlesWithKV(symbol, timeframe, limit, env, ctx);
}

// ============================================================
// INDICATEURS TECHNIQUES
// ============================================================
function ema(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i-1] * (1-k));
  return out;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i-1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i-1];
    avgGain = (avgGain * (period-1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period-1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function averageRange(candles, period = 14) {
  const rows = Array.isArray(candles) ? candles : [];
  if (rows.length < 2) return null;
  const trueRanges = [];
  for (let i = 1; i < rows.length; i++) {
    const prevClose = Number(rows[i-1]?.close);
    const high = Number(rows[i]?.high);
    const low = Number(rows[i]?.low);
    if (!Number.isFinite(prevClose) || !Number.isFinite(high) || !Number.isFinite(low)) continue;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    if (Number.isFinite(tr)) trueRanges.push(tr);
  }
  if (!trueRanges.length) return null;
  const slice = trueRanges.slice(-Math.max(1, Number(period) || 14));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function directionalOpportunityScore(score, direction = "neutral") {
  const raw = Number(score);
  if (!Number.isFinite(raw)) return null;
  const clean = clamp(Math.round(raw), 0, 100);
  if (direction === "short") return 100 - clean;
  return clean;
}

function majorHardBlockerCount(flags = []) {
  const rows = Array.isArray(flags) ? flags : [];
  return rows.filter(f => ["data_quality_low","risk_too_high","entry_too_late","trend_conflict"].includes(f)).length;
}

function computeTradeSafetyScore({
  direction = "neutral",
  score = null,
  exploitabilityScore = null,
  entryQuality = 0,
  riskQuality = 0,
  contextQuality = 0,
  dataQuality = 0,
  setupType = "aucun",
  hardFilters = { passed: true, flags: [] },
  structured = false
} = {}) {
  const decisionScore = directionalOpportunityScore(score, direction);
  const exploitability = Number.isFinite(Number(exploitabilityScore)) ? Number(exploitabilityScore) : 0;
  const flags = Array.isArray(hardFilters?.flags) ? hardFilters.flags : [];
  const majorBlockers = majorHardBlockerCount(flags);

  let safety = (
    0.34 * Number(decisionScore || 0) +
    0.24 * exploitability +
    0.14 * Number(entryQuality || 0) +
    0.14 * Number(riskQuality || 0) +
    0.08 * Number(contextQuality || 0) +
    0.06 * Number(dataQuality || 0)
  );

  if (setupType && setupType !== "aucun") safety += 4;
  if (structured) safety += 6;
  if (hardFilters?.passed) safety += 3;
  if (flags.includes("low_participation")) safety -= 4;
  if (flags.includes("macro_fragile")) safety -= 5;
  if (flags.includes("partial_data")) safety -= 8;
  safety -= majorBlockers * 10;

  return clamp(Math.round(safety), 0, 100);
}

function getTradeDecisionProfile(assetClass = "stock") {
  const base = {
    tradeDecisionMin: 75,
    tradeSafetyMin: 76,
    tradeActionabilityMin: 70,
    tradeEntryMin: 64,
    tradeRiskMin: 54,
    tradeContextMin: 54,
    watchDecisionMin: 63,
    watchSafetyMin: 61,
    watchActionabilityMin: 58,
    watchEntryMin: 56,
    watchRiskMin: 50,
    watchContextMin: 50,
    structuredDecisionMin: 73,
    structuredSafetyMin: 75,
    structuredActionabilityMin: 67,
    baseStopPct: 0.035,
    rrBaseStrong: 2.1,
    rrBaseNormal: 1.8
  };

  if (assetClass === "crypto") {
    return {
      ...base,
      tradeDecisionMin: 78,
      tradeSafetyMin: 78,
      tradeActionabilityMin: 74,
      tradeEntryMin: 66,
      tradeRiskMin: 56,
      tradeContextMin: 56,
      watchDecisionMin: 66,
      watchSafetyMin: 64,
      watchActionabilityMin: 60,
      watchEntryMin: 60,
      watchRiskMin: 52,
      watchContextMin: 52,
      structuredDecisionMin: 76,
      structuredSafetyMin: 78,
      structuredActionabilityMin: 72,
      baseStopPct: 0.055,
      rrBaseStrong: 2.4,
      rrBaseNormal: 2.0
    };
  }

  if (assetClass === "forex") {
    return {
      ...base,
      tradeDecisionMin: 72,
      tradeSafetyMin: 74,
      tradeActionabilityMin: 66,
      tradeEntryMin: 68,
      tradeRiskMin: 58,
      tradeContextMin: 54,
      watchDecisionMin: 64,
      watchSafetyMin: 60,
      watchActionabilityMin: 60,
      watchEntryMin: 62,
      watchRiskMin: 54,
      watchContextMin: 50,
      structuredDecisionMin: 70,
      structuredSafetyMin: 72,
      structuredActionabilityMin: 64,
      baseStopPct: 0.012,
      rrBaseStrong: 2.0,
      rrBaseNormal: 1.7
    };
  }

  if (assetClass === "commodity") {
    return {
      ...base,
      tradeDecisionMin: 76,
      tradeSafetyMin: 77,
      tradeActionabilityMin: 70,
      tradeEntryMin: 64,
      tradeRiskMin: 56,
      tradeContextMin: 58,
      watchDecisionMin: 66,
      watchSafetyMin: 62,
      watchActionabilityMin: 60,
      watchEntryMin: 60,
      watchRiskMin: 54,
      watchContextMin: 54,
      structuredDecisionMin: 74,
      structuredSafetyMin: 76,
      structuredActionabilityMin: 68,
      baseStopPct: 0.03,
      rrBaseStrong: 2.2,
      rrBaseNormal: 1.8
    };
  }

  if (assetClass === "etf") {
    return {
      ...base,
      tradeDecisionMin: 74,
      tradeSafetyMin: 74,
      tradeActionabilityMin: 68,
      tradeEntryMin: 62,
      tradeRiskMin: 54,
      tradeContextMin: 54,
      watchDecisionMin: 59,
      watchSafetyMin: 61,
      watchActionabilityMin: 60,
      watchEntryMin: 58,
      watchRiskMin: 52,
      watchContextMin: 50,
      structuredDecisionMin: 72,
      structuredSafetyMin: 74,
      structuredActionabilityMin: 66,
      baseStopPct: 0.028,
      rrBaseStrong: 2.0,
      rrBaseNormal: 1.8
    };
  }

  return base;
}

// ============================================================
// DÉTECTION DU RÉGIME GLOBAL
// ============================================================
function readTrendSignal(candles) {
  if (!candles || candles.length < 50) return "neutral";
  const closes = candles.map(c => Number(c.close)).filter(Number.isFinite);
  if (closes.length < 50) return "neutral";
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const rsi14 = rsi(closes, 14);
  const chg20 = pctChange(closes[closes.length-1], closes[closes.length-21]);

  if (ema20 > ema50 && rsi14 > 50 && chg20 > 0) return "bullish";
  if (ema20 < ema50 && rsi14 < 50 && chg20 < 0) return "bearish";
  return "neutral";
}

function detectMarketRegime(spyCandles, qqqCandles, tltCandles) {
  const spySignal = readTrendSignal(spyCandles);
  const qqqSignal = readTrendSignal(qqqCandles);
  const tltSignal = readTrendSignal(tltCandles);

  let regime = "RANGE";
  let reason = "Pas de direction claire";

  if (spySignal === "bearish") {
    regime = "RISK_OFF";
    reason = "SPY en tendance baissière";
  } else if (spySignal === "bullish" && qqqSignal === "bullish") {
    regime = "RISK_ON";
    reason = "SPY et QQQ en tendance haussière";
  } else if (spySignal === "bullish" && qqqSignal !== "bearish") {
    regime = "RISK_ON";
    reason = "SPY haussier";
  }

  return {
    regime,
    reason,
    spySignal,
    qqqSignal,
    tltSignal,
    updatedAt: nowIso()
  };
}

// ============================================================
// DÉTECTION DE CONFIGURATION PAR ACTIF
// ============================================================
function detectConfiguration(candles, quote) {
  const closes = candles.map(c => Number(c.close)).filter(Number.isFinite);
  if (closes.length < 30) return { config: "AUCUNE", reason: "données insuffisantes", levels: {} };

  const last = closes[closes.length - 1];
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const rsi14 = rsi(closes, 14);
  const chg5  = pctChange(last, closes[closes.length - 6]);
  const chg20 = pctChange(last, closes[closes.length - 21]);
  const chg60 = pctChange(last, closes[closes.length - 61] ?? closes[0]);
  const distEma20 = pctChange(last, ema20);

  const recent20 = candles.slice(-20);
  const recent10 = candles.slice(-10);
  const recent5  = candles.slice(-5);
  const swingHigh20 = Math.max(...recent20.map(c => Number(c.high)).filter(Number.isFinite));
  const swingLow10  = Math.min(...recent10.map(c => Number(c.low)).filter(Number.isFinite));
  const low5j       = Math.min(...recent5.map(c => Number(c.low)).filter(Number.isFinite));
  const avgVol20    = recent20.reduce((s, c) => s + (Number(c.volume) || 0), 0) / 20;
  const lastVol     = Number(candles[candles.length - 1]?.volume || 0);
  const atr         = averageRange(candles, 14);

  const levels = { ema20, ema50, swingHigh20, swingLow10, low5j, atr, distEma20 };

  // PULLBACK — repli sur EMA20 dans tendance haussière
  if (
    ema20 > ema50 &&
    distEma20 != null && distEma20 >= -1 && distEma20 <= 2 &&
    rsi14 != null && rsi14 >= 42 && rsi14 <= 58 &&
    chg5 != null && chg5 < 0 &&
    chg20 != null && chg20 > 0
  ) return { config: "PULLBACK", reason: "Repli sur EMA20 dans tendance haussière", levels };

  // BREAKOUT — cassure résistance avec volume
  if (
    Number.isFinite(swingHigh20) && last > swingHigh20 * 1.005 &&
    (avgVol20 === 0 || lastVol > avgVol20 * 1.2) &&
    rsi14 != null && rsi14 >= 52 && rsi14 <= 72 &&
    ema20 > ema50
  ) return { config: "BREAKOUT", reason: "Cassure résistance 20j avec volume", levels };

  // CONTINUATION — tendance propre, zone de continuation
  if (
    ema20 > ema50 &&
    distEma20 != null && distEma20 >= 2 && distEma20 <= 6 &&
    rsi14 != null && rsi14 >= 52 && rsi14 <= 65 &&
    chg5 != null && chg5 > 0
  ) return { config: "CONTINUATION", reason: "Tendance propre, prix en zone de continuation", levels };

  // MEAN REVERSION — détectée mais bloquée jusqu'à calibration
  if (
    rsi14 != null && rsi14 < 33 &&
    ema50 != null && last > ema50 &&
    chg5 != null && chg5 < -4 &&
    chg60 != null && chg60 > 0
  ) return { config: "MEAN_REVERSION", reason: "Survente sur tendance de fond saine", levels, blocked: true };

  return { config: "AUCUNE", reason: "Pas de configuration lisible", levels };
}

// ============================================================
// VALIDATION RÉGIME × CONFIGURATION
// ============================================================
function validateConfiguration(detected, regime, assetClass) {
  const { config } = detected;

  if (config === "MEAN_REVERSION") return {
    valid: false,
    reason: "Mean reversion désactivée — phase de calibration",
    scoreMalus: 0
  };

  if (config === "AUCUNE") return {
    valid: false,
    reason: "Pas de configuration détectée",
    scoreMalus: 0
  };

  const isCryptoAsset = assetClass === "crypto";

  const matrix = {
    PULLBACK: {
      RISK_ON:  { valid: true,  scoreMalus: 0,  reason: "Pullback validé en Risk-On" },
      RANGE:    { valid: true,  scoreMalus: 8,  reason: "Pullback en marché range — prudence" },
      RISK_OFF: { valid: isCryptoAsset, scoreMalus: 0, reason: isCryptoAsset ? "Crypto analysée indépendamment" : "Pullback long bloqué en Risk-Off" }
    },
    BREAKOUT: {
      RISK_ON:  { valid: true,  scoreMalus: 0,  reason: "Breakout validé en Risk-On" },
      RANGE:    { valid: false, scoreMalus: 0,  reason: "Breakout en range — faux signal probable" },
      RISK_OFF: { valid: false, scoreMalus: 0,  reason: "Breakout bloqué en Risk-Off" }
    },
    CONTINUATION: {
      RISK_ON:  { valid: true,  scoreMalus: 4,  reason: "Continuation — entrée moins propre qu'un pullback" },
      RANGE:    { valid: false, scoreMalus: 0,  reason: "Continuation bloquée en range" },
      RISK_OFF: { valid: false, scoreMalus: 0,  reason: "Continuation bloquée en Risk-Off" }
    }
  };

  return matrix[config]?.[regime] || { valid: false, reason: "Combinaison non gérée", scoreMalus: 0 };
}

// ============================================================
// CONSTRUCTION DU PLAN SUR NIVEAUX RÉELS
// ============================================================
function buildPlanFromConfiguration(detected, validation, quote, baseScore) {
  if (!validation.valid) return null;

  const { config, levels } = detected;
  const { ema20, swingHigh20, swingLow10, low5j, atr } = levels;
  const price = Number(quote?.price);

  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(ema20)) return null;

  let entry, sl, tp, horizon, setupType;

  if (config === "PULLBACK") {
    entry     = ema20;
    sl        = Number.isFinite(swingLow10) ? swingLow10 - (atr ? atr * 0.1 : price * 0.005) : price * 0.95;
    tp        = Number.isFinite(swingHigh20) ? swingHigh20 : price * 1.07;
    horizon   = "5-10 jours";
    setupType = "pullback";
  } else if (config === "BREAKOUT") {
    entry     = price;
    sl        = Number.isFinite(swingHigh20) ? swingHigh20 * 0.998 : price * 0.96;
    tp        = entry + (entry - sl) * 2.0;
    horizon   = "3-7 jours";
    setupType = "breakout";
  } else if (config === "CONTINUATION") {
    entry     = price;
    sl        = ema20 * 0.99;
    tp        = entry + (entry - sl) * 2.2;
    horizon   = "7-14 jours";
    setupType = "continuation";
  } else {
    return null;
  }

  // Vérifications de cohérence
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) return null;
  if (sl <= 0 || tp <= 0 || entry <= 0) return null;
  if (entry <= sl) return null;
  if (tp <= entry) return null;

  const rr = (tp - entry) / (entry - sl);
  if (rr < 1.6) return null; // ratio minimum strict

  const slPct = ((entry - sl) / entry) * 100;
  const tpPct = ((tp - entry) / entry) * 100;

  return {
    setupType,
    entry:      Math.round(entry * 1000) / 1000,
    stopLoss:   Math.round(sl * 1000) / 1000,
    takeProfit: Math.round(tp * 1000) / 1000,
    rr:         Math.round(rr * 100) / 100,
    slPct:      Math.round(slPct * 100) / 100,
    tpPct:      Math.round(tpPct * 100) / 100,
    horizon,
    side:       "long",
    reason:     detected.reason,
    regimeValidation: validation.reason,
    tradeNow:   true,
    decision:   "Trade propose"
  };
}

// ============================================================
// SCORE ENGINE V2
// ============================================================
function calcDetailScore(quote, candles, regime = null, env = null) {
  const closes = (candles || []).map(c => Number(c.close)).filter(v => Number.isFinite(v));

  if (closes.length < 30 || quote.price == null) {
    return {
      score: null, scoreStatus: "unavailable", direction: null,
      analysisLabel: "Incomplete analysis", confidence: "low",
      breakdown: null, hardFilters: { passed: false, flags: ["data_quality_low"] },
      setupType: "aucun", avgRange: null,
      configuration: { config: "AUCUNE", reason: "données insuffisantes", levels: {} },
      plan: null
    };
  }

  const last = closes[closes.length - 1];
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema20Last = ema20Series[ema20Series.length - 1];
  const ema20Prev = ema20Series[ema20Series.length - 2] ?? ema20Last;
  const ema50Last = ema50Series[ema50Series.length - 1];
  const rsi14 = rsi(closes, 14);
  const chg5  = pctChange(last, closes[closes.length - 6]);
  const chg20 = pctChange(last, closes[closes.length - 21]);
  const chg60 = pctChange(last, closes[closes.length - 61] ?? closes[0]);
  const distanceToEma20Pct = pctChange(last, ema20Last);
  const distanceToEma50Pct = pctChange(last, ema50Last);
  const avgRangeValue = averageRange(candles, 14);
  const atrPct = (Number.isFinite(avgRangeValue) && last > 0) ? (avgRangeValue / last) * 100 : null;
  const dataQuality = quote.freshness === "live" ? 92 : quote.freshness === "recent" ? 78 : 48;

  // Détection de configuration (nouveau moteur)
  const detectedConfig = detectConfiguration(candles, quote);

  let structure = 50;
  if (last > ema20Last) structure += 10; else structure -= 8;
  if (last > ema50Last) structure += 12; else structure -= 10;
  if (ema20Last > ema50Last) structure += 12; else structure -= 12;
  if (ema20Last > ema20Prev) structure += 10; else structure -= 8;
  if (chg60 != null) structure += clamp(chg60 * 1.0, -10, 12);
  if (distanceToEma50Pct != null) structure += clamp(distanceToEma50Pct * 0.5, -6, 8);

  let momentum = 50;
  if (typeof quote.change24hPct === "number") momentum += clamp(quote.change24hPct * 9, -22, 24);
  if (chg5 != null) momentum += clamp(chg5 * 2.4, -14, 16);
  if (chg20 != null) momentum += clamp(chg20 * 1.2, -10, 12);
  if (rsi14 != null) {
    if (rsi14 >= 52 && rsi14 <= 68) momentum += 10;
    else if (rsi14 > 68 && rsi14 <= 78) momentum += 4;
    else if (rsi14 > 82) momentum -= 10;
    else if (rsi14 < 35) momentum -= 12;
  }

  let timing = 50;
  if (distanceToEma20Pct != null) {
    const absDist = Math.abs(distanceToEma20Pct);
    if (absDist <= 2.5) timing += 18;
    else if (absDist <= 5) timing += 10;
    else if (absDist <= 8) timing += 4;
    else if (absDist > 12) timing -= 22;
  }
  if (rsi14 != null && rsi14 >= 48 && rsi14 <= 70) timing += 10;
  if (rsi14 != null && (rsi14 > 82 || rsi14 < 24)) timing -= 12;
  if (chg5 != null && chg20 != null) timing += ((chg5 > 0 && chg20 > 0) || (chg5 < 0 && chg20 < 0)) ? 6 : -8;

  let risk = 65;
  if (atrPct != null) risk -= clamp(atrPct * (quote.assetClass === "crypto" ? 2.2 : 3.0), 0, 18);
  if (typeof quote.change24hPct === "number") risk -= clamp(Math.abs(quote.change24hPct) * 1.1, 0, 10);
  if (distanceToEma20Pct != null && Math.abs(distanceToEma20Pct) > 10) risk -= 8;
  if (quote.volume24h != null) risk += 4;

  let context = 50;
  if (chg20 != null) context += clamp(chg20 * 1.3, -12, 12);
  if (chg60 != null) context += clamp(chg60 * 0.8, -8, 10);
  if (quote.volume24h != null) context += 4;
  if (atrPct != null && atrPct > (quote.assetClass === "crypto" ? 7 : 4)) context -= 6;

  let participation = quote.volume24h != null ? 70 : 52;
  if (typeof quote.change24hPct === "number" && Math.abs(quote.change24hPct) > 1.5) participation += 5;
  if (chg20 != null && Math.abs(chg20) > 4) participation += 5;

  structure    = clamp(structure, 0, 100);
  momentum     = clamp(momentum, 0, 100);
  timing       = clamp(timing, 0, 100);
  risk         = clamp(risk, 0, 100);
  context      = clamp(context, 0, 100);
  participation = clamp(participation, 0, 100);

  let direction = "neutral";
  if (structure >= 56 && momentum >= 54) direction = "long";
  else if (structure <= 44 && momentum <= 46) direction = "short";

  const trendConflict = (direction === "long" && chg5 != null && chg20 != null && chg5 < 0 && chg20 > 0) ||
    (direction === "short" && chg5 != null && chg20 != null && chg5 > 0 && chg20 < 0);
  const extensionTooHigh = distanceToEma20Pct != null && Math.abs(distanceToEma20Pct) > 12;
  const riskTooHigh = risk < 42;
  const dataTooWeak = dataQuality < 55;
  const entryTooLate = timing < 42;
  const lowParticipation = participation < 52;
  const macroFragile = context < 45;

  const hardFlags = [];
  if (dataTooWeak) hardFlags.push("data_quality_low");
  if (riskTooHigh) hardFlags.push("risk_too_high");
  if (entryTooLate || extensionTooHigh) hardFlags.push("entry_too_late");
  if (trendConflict) hardFlags.push("trend_conflict");
  if (lowParticipation) hardFlags.push("low_participation");
  if (macroFragile) hardFlags.push("macro_fragile");

  const hardPassed = !["data_quality_low","risk_too_high","entry_too_late","trend_conflict"].some(f => hardFlags.includes(f));

  let raw = 0.24 * structure + 0.20 * momentum + 0.20 * timing + 0.18 * risk + 0.10 * context + 0.08 * dataQuality;
  if (direction === "long" && structure >= 60 && momentum >= 60) raw += 4;
  if (direction === "short" && structure <= 40 && momentum <= 40) raw -= 4;
  if (trendConflict) raw -= 6;
  if (extensionTooHigh) raw -= 8;
  if (riskTooHigh) raw -= 6;
  if (lowParticipation) raw -= 4;

  // Malus régime si disponible
  let regimeMalus = 0;
  if (regime) {
    const validation = validateConfiguration(detectedConfig, regime.regime, quote.assetClass);
    if (!validation.valid) regimeMalus = 20; // configuration bloquée par le régime
    else regimeMalus = validation.scoreMalus;
  }

  const score = clamp(Math.round(raw) - regimeMalus, 0, 100);

  // Bonus de configuration détectée
  let configBonus = 0;
  if (detectedConfig.config === "PULLBACK") configBonus = 6;
  if (detectedConfig.config === "BREAKOUT") configBonus = 8;
  if (detectedConfig.config === "CONTINUATION") configBonus = 3;

  let setupType = detectedConfig.config !== "AUCUNE" ? detectedConfig.config.toLowerCase() : "aucun";

  let analysisLabel = "No clear direction";
  if (direction === "long") {
    if (score >= 76 && timing >= 62 && risk >= 52) analysisLabel = "Confirmed bullish setup";
    else if (score >= 64) analysisLabel = "Constructive bullish setup";
    else analysisLabel = "Early bullish setup";
  } else if (direction === "short") {
    if (score <= 32 && timing >= 62 && risk >= 52) analysisLabel = "Confirmed bearish setup";
    else if (score <= 40) analysisLabel = "Constructive bearish setup";
    else analysisLabel = "Early bearish setup";
  }

  let confidence = "medium";
  if ((score >= 78 || score <= 28) && Math.abs(momentum - 50) >= 12 && hardPassed) confidence = "high";
  if (score >= 48 && score <= 56) confidence = "low";
  if (!hardPassed) confidence = "low";

  return {
    score,
    scoreStatus: "complete",
    direction,
    analysisLabel,
    confidence,
    setupType,
    avgRange: avgRangeValue,
    hardFilters: { passed: hardPassed, flags: hardFlags },
    configuration: detectedConfig,
    breakdown: {
      regime: context, trend: structure, momentum,
      entryQuality: timing, risk, participation, context, dataQuality
    }
  };
}

// ============================================================
// BUILD WORKER PLAN V2
// ============================================================
function buildWorkerPlan(base, regime = null) {
  const score = base?.score ?? null;
  const direction = base?.direction || "neutral";
  const hardFilters = base?.hardFilters || { passed: true, flags: [] };
  const breakdown = base?.breakdown || {};
  const detectedConfig = base?.configuration || { config: "AUCUNE", levels: {} };
  const price = base?.price ?? null;
  const assetClass = base?.assetClass || "stock";
  const decisionScore = directionalOpportunityScore(score, direction);
  const profile = getTradeDecisionProfile(assetClass);
  const entryQuality = Number(breakdown.entryQuality ?? 0);
  const riskQuality  = Number(breakdown.risk ?? 0);
  const contextQuality = Number(breakdown.regime ?? 0);
  const momentumQuality = Number(breakdown.momentum ?? 0);
  const dataQuality = Number(breakdown.dataQuality ?? 0);
  const blockerFlags = Array.isArray(hardFilters.flags) ? hardFilters.flags : [];
  const majorBlockerCount = majorHardBlockerCount(blockerFlags);
  const hasMajorBlocker = majorBlockerCount > 0;
  const watchSoftFlags = ["low_participation", "macro_fragile"];
  const watchFilterOk = !!hardFilters.passed || blockerFlags.every((flag) => watchSoftFlags.includes(flag));

  const buildDecisionBlockers = (target = "watch") => {
    const blockers = blockerFlags.map(f => f.replace(/_/g, " "));
    const decisionFloor = target === "trade" ? profile.tradeDecisionMin : profile.watchDecisionMin;
    const safetyFloor = target === "trade" ? profile.tradeSafetyMin : profile.watchSafetyMin;
    const actionFloor = target === "trade" ? profile.tradeActionabilityMin : profile.watchActionabilityMin;
    const entryFloor = target === "trade" ? profile.tradeEntryMin : profile.watchEntryMin;
    const riskFloor = target === "trade" ? profile.tradeRiskMin : profile.watchRiskMin;
    const contextFloor = target === "trade" ? profile.tradeContextMin : profile.watchContextMin;

    if (!Number.isFinite(Number(decisionScore)) || Number(decisionScore) < decisionFloor) blockers.push("direction encore trop faible");
    if (!Number.isFinite(Number(entryQuality)) || entryQuality < entryFloor) blockers.push("timing encore trop flou");
    if (!Number.isFinite(Number(riskQuality)) || riskQuality < riskFloor) blockers.push("structure de risque insuffisante");
    if (!Number.isFinite(Number(contextQuality)) || contextQuality < contextFloor) blockers.push("contexte encore fragile");
    return [...new Set(blockers)];
  };

  // Tenter un plan sur niveaux réels si configuration détectée
  let structuredPlan = null;
  if (detectedConfig.config !== "AUCUNE" && regime) {
    const validation = validateConfiguration(detectedConfig, regime.regime, assetClass);
    if (validation.valid) {
      structuredPlan = buildPlanFromConfiguration(
        detectedConfig, validation, base, score
      );
    }
  }

  // Si on a un plan structuré → l'utiliser
  if (structuredPlan) {
    const exploitabilityScore = clamp(Math.round(
      0.42 * Number(decisionScore || 0) +
      0.24 * entryQuality +
      0.20 * riskQuality +
      0.08 * 70 +  // plan sur niveaux réels = bonus confirmations
      0.06 * contextQuality
    ), 0, 100);
    const safetyScore = computeTradeSafetyScore({
      direction,
      score,
      exploitabilityScore,
      entryQuality,
      riskQuality,
      contextQuality,
      dataQuality,
      setupType: structuredPlan.setupType || base?.setupType || "aucun",
      hardFilters,
      structured: true
    });
    const structuredTradeReady = hardFilters.passed &&
      !hasMajorBlocker &&
      (direction === "long" || direction === "short") &&
      Number(decisionScore) >= profile.structuredDecisionMin &&
      exploitabilityScore >= profile.structuredActionabilityMin &&
      safetyScore >= profile.structuredSafetyMin &&
      entryQuality >= profile.tradeEntryMin &&
      riskQuality >= profile.tradeRiskMin &&
      contextQuality >= profile.tradeContextMin;
    const structuredWatchReady = !hasMajorBlocker &&
      watchFilterOk &&
      (direction === "long" || direction === "short") &&
      Number(decisionScore) >= profile.watchDecisionMin &&
      exploitabilityScore >= profile.watchActionabilityMin &&
      safetyScore >= profile.watchSafetyMin &&
      entryQuality >= profile.watchEntryMin &&
      riskQuality >= profile.watchRiskMin &&
      contextQuality >= profile.watchContextMin;
    const structuredDecision = structuredTradeReady ? "Trade propose" : structuredWatchReady ? "A surveiller" : "Pas de trade";
    const structuredBlockers = structuredDecision === "Trade propose" ? [] : buildDecisionBlockers(structuredDecision === "A surveiller" ? "watch" : "trade");
    const structuredTradeNow = structuredDecision === "Trade propose";

    return {
      ...structuredPlan,
      decision: structuredDecision,
      tradeNow: structuredTradeNow,
      finalScore: score,
      decisionScore,
      safetyScore,
      exploitabilityScore,
      setupStatus: structuredDecision === "Trade propose" ? "Setup confirme" : structuredDecision === "A surveiller" ? "Setup a surveiller" : "Setup encore trop fragile",
      confirmationCount: structuredDecision === "Trade propose" ? 5 : structuredDecision === "A surveiller" ? 4 : 3,
      confirmationLabel: structuredDecision === "Trade propose" ? "forte" : "moyenne",
      trendLabel: direction === "long" ? "tendance haussiere" : direction === "short" ? "tendance baissiere" : "tendance neutre",
      waitFor: structuredDecision === "Trade propose" ? "rien de special" : structuredDecision === "A surveiller" ? "validation d execution" : "contexte plus propre",
      timing: entryQuality >= profile.tradeEntryMin + 4 ? "bon" : entryQuality >= profile.watchEntryMin ? "moyen" : "faible",
      safety: safetyScore >= 82 ? "elevee" : safetyScore >= 66 ? "moyenne" : "faible",
      reason: structuredDecision === "Trade propose"
        ? structuredPlan.reason
        : structuredDecision === "A surveiller"
          ? "Configuration detectee, mais l execution demande encore une validation plus propre."
          : "Configuration detectee, mais le dossier reste trop fragile pour etre active.",
      refusalReason: structuredTradeNow ? null : "Configuration encore insuffisante pour declencher un trade.",
      aiSummary: structuredDecision === "Trade propose"
        ? `Configuration ${structuredPlan.setupType} detectee et validee en regime ${regime?.regime || "inconnu"}.`
        : structuredDecision === "A surveiller"
          ? `Configuration ${structuredPlan.setupType} detectee, mais le moteur prefere attendre une execution plus propre.`
          : `Configuration ${structuredPlan.setupType} detectee, mais le moteur juge le dossier encore trop fragile.`,
      aiContext: [structuredPlan.reason, structuredPlan.regimeValidation].filter(Boolean),
      blockerFlags,
      blockers: structuredBlockers,
      hardFiltersPassed: !!hardFilters.passed
    };
  }

  // Fallback — calibré par classe d'actifs
  const exploitabilityScore = clamp(Math.round(
    0.42 * Number(decisionScore || 0) +
    0.24 * entryQuality +
    0.20 * riskQuality +
    0.08 * (momentumQuality >= 68 ? 58 : momentumQuality >= 58 ? 54 : 48) +
    0.06 * contextQuality
  ), 0, 100);
  const safetyScore = computeTradeSafetyScore({
    direction,
    score,
    exploitabilityScore,
    entryQuality,
    riskQuality,
    contextQuality,
    dataQuality,
    setupType: base?.setupType || "aucun",
    hardFilters,
    structured: false
  });

  const tradeReady = hardFilters.passed && !hasMajorBlocker &&
    Number(decisionScore) >= profile.tradeDecisionMin &&
    entryQuality >= profile.tradeEntryMin &&
    riskQuality >= profile.tradeRiskMin &&
    contextQuality >= profile.tradeContextMin &&
    exploitabilityScore >= profile.tradeActionabilityMin &&
    safetyScore >= profile.tradeSafetyMin &&
    (direction === "long" || direction === "short");
  const watchReady = !tradeReady &&
    !hasMajorBlocker &&
    watchFilterOk &&
    (direction === "long" || direction === "short") &&
    Number(decisionScore) >= profile.watchDecisionMin &&
    entryQuality >= profile.watchEntryMin &&
    riskQuality >= profile.watchRiskMin &&
    contextQuality >= profile.watchContextMin &&
    exploitabilityScore >= profile.watchActionabilityMin &&
    safetyScore >= profile.watchSafetyMin;

  let decision = "Pas de trade";
  if (tradeReady) decision = "Trade propose";
  else if (watchReady) decision = "A surveiller";

  const tradeNow = decision === "Trade propose";
  const trendLabel = direction === "long" ? "tendance haussiere" : direction === "short" ? "tendance baissiere" : "tendance neutre";

  const baseStopPct = profile.baseStopPct;
  const atrPct = (Number.isFinite(base?.avgRange) && Number.isFinite(price) && price > 0) ? (base.avgRange / price) : null;
  const dynamicStopPct = Number.isFinite(atrPct) ? clamp(Math.max(baseStopPct * 0.65, atrPct * 1.2), baseStopPct * 0.65, baseStopPct * 1.75) : baseStopPct;
  const rrBase = entryQuality >= profile.tradeEntryMin + 1 && riskQuality >= profile.tradeRiskMin + 2
    ? profile.rrBaseStrong
    : profile.rrBaseNormal;

  let entry = null, stopLoss = null, takeProfit = null, rr = null;
  const side = tradeNow && direction !== "neutral" ? direction : null;

  if (side && price != null) {
    entry = price;
    if (side === "long") { stopLoss = price * (1 - dynamicStopPct); takeProfit = price * (1 + dynamicStopPct * rrBase); }
    else { stopLoss = price * (1 + dynamicStopPct); takeProfit = price * (1 - dynamicStopPct * rrBase); }
    rr = rrBase;
  }

  const decisionBlockers = decision === "Trade propose"
    ? []
    : buildDecisionBlockers(decision === "A surveiller" ? "watch" : "trade");
  const waitFor = decision === "Trade propose"
    ? "rien de special"
    : decision === "A surveiller"
      ? (entryQuality < profile.tradeEntryMin ? "une execution plus propre" : "une confirmation supplementaire")
      : "un dossier plus robuste";
  const reason = decision === "Trade propose"
    ? "Setup propre, surete suffisante et execution exploitable."
    : decision === "A surveiller"
      ? "Le contexte existe, mais la surete globale reste encore insuffisante pour declencher le trade."
      : "Le dossier reste trop fragile pour proposer une position.";

  return {
    finalScore: score,
    decisionScore,
    safetyScore,
    exploitabilityScore,
    decision,
    setupStatus: decision === "Trade propose" ? "Setup confirme" : decision === "A surveiller" ? "A surveiller" : "Non exploitable",
    tradeNow,
    setupType: base?.setupType || "aucun",
    confirmationCount: 3,
    confirmationLabel: "moyenne",
    trendLabel,
    waitFor,
    side,
    entry,
    stopLoss,
    takeProfit,
    rr,
    horizon: "a definir",
    timing: entryQuality >= profile.tradeEntryMin + 4 ? "bon" : entryQuality >= profile.watchEntryMin ? "moyen" : "faible",
    safety: safetyScore >= 76 ? "elevee" : safetyScore >= 60 ? "moyenne" : "faible",
    reason,
    refusalReason: tradeNow ? null : "Signal insuffisant pour proposer un trade.",
    aiSummary: tradeNow ? "Le moteur voit un setup exploitable avec une surete suffisante." : decision === "A surveiller" ? "Le moteur prefere attendre une execution plus propre." : "Le moteur juge le dossier encore trop fragile.",
    aiContext: [],
    blockerFlags,
    blockers: decisionBlockers,
    hardFiltersPassed: !!hardFilters.passed
  };
}

// ============================================================
// BUILD STABLE PAYLOAD
// ============================================================
function buildUnavailablePayload(symbol, message = "Source temporairement indisponible") {
  const reason = compactProviderError(message);
  return {
    symbol, name: getDisplayName(symbol), assetClass: getAssetClass(symbol),
    price: null, change24hPct: null, sourceUsed: null, freshness: "unknown",
    status: "unavailable", score: null, scoreStatus: "unavailable",
    direction: "neutral", analysisLabel: "Source temporarily unavailable",
    confidence: "low", confidenceLabel: "faible", breakdown: null, candles: [],
    reasonShort: reason, decision: "Indisponible", trendLabel: reason,
    plan: {
      finalScore: null, decisionScore: null, safetyScore: null,
      decision: "Indisponible", trendLabel: reason,
      waitFor: "source disponible", side: null, entry: null,
      stopLoss: null, takeProfit: null, rr: null, horizon: "a definir",
      timing: "faible", safety: "faible", reason, refusalReason: reason,
      aiSummary: reason, aiContext: [], blockerFlags: [], hardFiltersPassed: false,
      setupType: "aucun", tradeNow: false, exploitabilityScore: null
    }
  };
}

function buildPartialAnalysisPayload(symbol, quote, message = "Analyse technique partielle", regime = null) {
  const reason = compactProviderError(message || "Analyse technique partielle");
  const change = Number(quote?.change24hPct);
  const direction = Number.isFinite(change) ? (change > 0.15 ? "long" : change < -0.15 ? "short" : "neutral") : "neutral";
  const trendLabel = direction === "long"
    ? "tendance haussiere"
    : direction === "short"
      ? "tendance baissiere"
      : "tendance neutre";

  const plan = {
    finalScore: null,
    decisionScore: null,
    safetyScore: null,
    exploitabilityScore: null,
    decision: "A surveiller",
    setupStatus: "Donnees partielles",
    tradeNow: false,
    setupType: "aucun",
    confirmationCount: 1,
    confirmationLabel: "faible",
    trendLabel,
    waitFor: "bougies journalieres disponibles",
    side: null,
    entry: null,
    stopLoss: null,
    takeProfit: null,
    rr: null,
    horizon: "a definir",
    timing: "faible",
    safety: "faible",
    reason,
    refusalReason: reason,
    aiSummary: "Quote disponible, analyse technique partielle.",
    aiContext: [],
    blockerFlags: ["partial_data"],
    blockers: ["donnees partielles"],
    hardFiltersPassed: false
  };
  const confidence = confidenceLevelFromPlan(plan);

  return {
    symbol,
    name: quote?.name || getDisplayName(symbol),
    assetClass: quote?.assetClass || getAssetClass(symbol),
    price: quote?.price == null ? null : finiteOrNull(quote?.price),
    change24hPct: quote?.change24hPct == null ? null : finiteOrNull(quote?.change24hPct),
    sourceUsed: quote?.sourceUsed || null,
    freshness: quote?.freshness || "unknown",
    status: "partial",
    score: null,
    scoreStatus: "partial",
    direction,
    analysisLabel: "Analyse partielle",
    confidence: {
      level: confidence.level,
      label: confidence.label,
      display: confidence.display
    },
    confidenceLabel: "faible",
    breakdown: null,
    candles: [],
    hardFilters: { passed: false, flags: ["partial_data"] },
    setupType: "aucun",
    avgRange: null,
    configuration: null,
    regime: regime ? { regime: regime.regime, reason: regime.reason } : null,
    reasonShort: reason,
    decision: plan.decision,
    trendLabel,
    officialScore: null,
    officialDecision: plan.decision,
    officialTrendLabel: trendLabel,
    officialWaitFor: plan.waitFor,
    plan
  };
}

function buildPartialPlaceholderQuote(symbol) {
  return {
    symbol,
    name: getDisplayName(symbol),
    assetClass: getAssetClass(symbol),
    price: null,
    change24hPct: null,
    volume24h: null,
    currency: isForex(symbol) ? symbol.slice(3, 6) : "USD",
    sourceUsed: null,
    freshness: "unknown"
  };
}

function confidenceLevelFromPlan(plan) {
  if (!plan) return { level: 1, label: "Surveillance", display: "●○○" };
  if (plan.setupType && plan.setupType !== "aucun" && plan.tradeNow) {
    return { level: 3, label: "Forte", display: "●●●" };
  }
  if (plan.tradeNow) return { level: 2, label: "Moyenne", display: "●●○" };
  return { level: 1, label: "Surveillance", display: "●○○" };
}

function buildStablePayload(symbol, quote, candles, scored, regime = null) {
  const base = {
    symbol, name: quote.name, assetClass: quote.assetClass,
    price: quote.price, change24hPct: quote.change24hPct,
    sourceUsed: quote.sourceUsed, freshness: quote.freshness,
    status: scored?.score != null ? "ok" : "unavailable",
    score: scored?.score ?? null,
    scoreStatus: scored?.scoreStatus || "unavailable",
    direction: scored?.direction || "neutral",
    analysisLabel: scored?.analysisLabel || "Source temporarily unavailable",
    confidence: scored?.confidence || "low",
    confidenceLabel: scored?.confidence === "high" ? "elevee" : scored?.confidence === "medium" ? "moyenne" : "faible",
    breakdown: scored?.breakdown || null,
    candles: candles || [],
    hardFilters: scored?.hardFilters || { passed: true, flags: [] },
    setupType: scored?.setupType || "aucun",
    avgRange: scored?.avgRange ?? null,
    configuration: scored?.configuration || null,
    regime: regime ? { regime: regime.regime, reason: regime.reason } : null
  };

  if (base.score == null) {
    return buildPartialAnalysisPayload(symbol, quote, "Analyse technique partielle", regime);
  }

  const plan = buildWorkerPlan({ ...base, avgRange: scored?.avgRange }, regime);
  const confidence = confidenceLevelFromPlan(plan);

  return {
    ...base,
    reasonShort: plan.reason,
    decision: plan.decision,
    trendLabel: plan.trendLabel,
    officialScore: Number.isFinite(Number(plan?.safetyScore))
      ? Number(plan.safetyScore)
      : (Number.isFinite(Number(plan?.exploitabilityScore)) ? Number(plan.exploitabilityScore) : null),
    officialDecision: plan.decision || null,
    officialTrendLabel: plan.trendLabel || null,
    officialWaitFor: plan.waitFor || null,
    confidence: {
      level: confidence.level,
      label: confidence.label,
      display: confidence.display
    },
    plan
  };
}

async function buildStableMarketPayload(symbol, env, ctx, includeCandles = true, regime = null, options = {}) {
  const clean = parseSymbol(symbol);
  let quote = null;
  try {
    // SEQUENTIEL — evite de depasser la limite 50 subrequetes Cloudflare
    quote = await resolveUnifiedMarketQuote(clean, env, ctx, options);
    const candles = includeCandles ? await getCandlesBySymbol(clean, "1d", 90, env, ctx) : [];
    const scored = calcDetailScore(quote, candles || [], regime, env);
    return buildStablePayload(clean, quote, candles || [], scored, regime);
  } catch (e) {
    if (quote && Number.isFinite(Number(quote.price))) {
      return buildPartialAnalysisPayload(clean, quote, e instanceof Error ? e.message : "Analyse technique partielle", regime);
    }
    const storedQuote = await getStoredDailyQuoteFallback(clean, env);
    if (storedQuote) {
      return buildPartialAnalysisPayload(clean, storedQuote, e instanceof Error ? e.message : "Analyse technique partielle", regime);
    }
    return buildPartialAnalysisPayload(clean, buildPartialPlaceholderQuote(clean), e instanceof Error ? e.message : "Analyse technique partielle", regime);
  }
}

function toOpportunityRow(payload) {
  return {
    symbol: payload.symbol,
    name: payload.name,
    assetClass: payload.assetClass,
    price: payload.price,
    change24hPct: payload.change24hPct,
    sourceUsed: payload.sourceUsed,
    freshness: payload.freshness,
    status: payload.status,
    score: payload.score,
    scoreStatus: payload.scoreStatus,
    direction: payload.direction,
    analysisLabel: payload.analysisLabel,
    confidence: payload.confidence,
    confidenceLabel: typeof payload.confidenceLabel === "string" ? payload.confidenceLabel : (payload.confidence?.label || "faible"),
    breakdown: payload.breakdown,
    reasonShort: payload.reasonShort,
    decision: payload.decision,
    trendLabel: payload.trendLabel,
    setupType: payload.setupType || payload?.plan?.setupType || "aucun",
    setupStatus: payload?.plan?.setupStatus || null,
    tradeNow: !!payload?.plan?.tradeNow,
    confirmationCount: payload?.plan?.confirmationCount ?? null,
    blockers: Array.isArray(payload?.plan?.blockers) ? payload.plan.blockers : [],
    decisionScore: payload?.plan?.decisionScore ?? null,
    safetyScore: payload?.plan?.safetyScore ?? null,
    exploitabilityScore: payload?.plan?.exploitabilityScore ?? null,
    dossierScore: payload?.plan?.finalScore ?? payload?.score ?? null,
    officialScore: Number.isFinite(Number(payload?.officialScore))
      ? Number(payload.officialScore)
      : (payload?.plan?.safetyScore ?? payload?.plan?.exploitabilityScore ?? null),
    officialDecision: payload?.officialDecision || payload?.plan?.decision || payload?.decision || null,
    officialTrendLabel: payload?.officialTrendLabel || payload?.plan?.trendLabel || payload?.trendLabel || null,
    officialWaitFor: payload?.officialWaitFor || payload?.plan?.waitFor || null,
    regime: payload.regime || null,
    aiContextReview: payload.aiContextReview || null,
    aiModifier: payload.aiModifier ?? 0,
    aiInfluence: payload.aiInfluence || "aucune",
    aiContextStatus: payload.aiContextStatus || null,
    plan: payload.plan,
    candles: [],
    error: payload.status === "unavailable" ? payload.reasonShort : null
  };
}

function getComparableOpportunityScore(row) {
  const safetyScore = Number(row?.safetyScore ?? row?.plan?.safetyScore);
  const actionScore = Number(row?.exploitabilityScore ?? row?.plan?.exploitabilityScore);
  if (Number.isFinite(safetyScore)) {
    return safetyScore + (Number.isFinite(actionScore) ? actionScore / 1000 : 0);
  }
  if (Number.isFinite(actionScore)) return actionScore;
  const decisionScore = Number(row?.decisionScore ?? row?.plan?.decisionScore);
  if (Number.isFinite(decisionScore)) return decisionScore;
  const dossierScore = Number(row?.dossierScore ?? row?.score);
  if (!Number.isFinite(dossierScore)) return -1;
  return row?.direction === "short" ? (100 - dossierScore) : dossierScore;
}

// ============================================================
// HANDLE OPPORTUNITIES — avec régime global
// ============================================================
async function handleOpportunities(_url, env) {
  // Cache memoire valide ?
  const cachedRows = getMemoryCache("route:opportunities:data");
  if (cachedRows) {
    const rows = cloneJsonPayload(cachedRows);
    const validCount = rows.filter(x => x.status === "ok").length;
    const ctx = createBudgetContext("opportunities");
    const resp = (validCount < rows.length ? partial : ok)(
      rows, "worker-v2", nowIso(), validCount ? "recent" : "unknown",
      `Panel ${rows.length} actifs (cache)`
    );
    return attachBudgetHeaders(resp, ctx);
  }

  const ctx = createBudgetContext("opportunities");

  // ============================================================
  // PHASE 1 — 1 seul appel TwelveData batch pour toutes les quotes non-crypto
  // Réduit de ~25 subrequetes à 1 seule pour les quotes
  // ============================================================
  const nonCryptoSymbols = LIGHT_SYMBOLS.filter(s => !isCrypto(s));
  const cryptoSymbols = LIGHT_SYMBOLS.filter(s => isCrypto(s));
  const quotesMap = {};
  const quoteErrors = {};
  let nonCryptoBatchError = "Batch TwelveData indisponible";

  try {
    const batchQuotes = await getTwelveBatchQuotes(nonCryptoSymbols, env, ctx);
    Object.assign(quotesMap, batchQuotes);
  } catch (e) {
    nonCryptoBatchError = compactProviderError(e instanceof Error ? e.message : "Batch TwelveData indisponible");
  }

  // Quotes crypto — Binance, 1 appel par actif mais gratuit
  for (const symbol of cryptoSymbols) {
    try {
      const q = await getCryptoQuote(symbol);
      if (q) quotesMap[symbol] = q;
    } catch {}
  }

  const recoveredNonCryptoCount = nonCryptoSymbols.filter(symbol => !!quotesMap[symbol]).length;
  const missingNonCryptoSymbols = nonCryptoSymbols.filter(symbol => !quotesMap[symbol]);
  const canRetryMissingQuotes =
    recoveredNonCryptoCount > 0 &&
    missingNonCryptoSymbols.length > 0 &&
    missingNonCryptoSymbols.length <= 12;

  if (canRetryMissingQuotes) {
    for (const symbol of missingNonCryptoSymbols) {
      try {
        const recoveredQuote = await resolveUnifiedMarketQuote(symbol, env, ctx, {
          allowAlphaFallback: false,
          skipTwelveData: true
        });
        if (recoveredQuote) quotesMap[symbol] = recoveredQuote;
      } catch (e) {
        quoteErrors[symbol] = compactProviderError(e instanceof Error ? e.message : nonCryptoBatchError);
      }
    }
  }

  // Pré-remplir le cache memoire avec les quotes obtenues
  for (const [symbol, quote] of Object.entries(quotesMap)) {
    if (!quote) continue;
    setMemoryCache(`market:snapshot:${symbol}`, TTL.quoteNonCrypto, quote);
    if (!isCrypto(symbol) && quote.sourceUsed === "twelvedata") {
      setMemoryCache(`quote:twelve:${symbol}`, TTL.quoteNonCrypto, quote);
    }
  }

  // ============================================================
  // PHASE 2 — Régime global depuis KV ou calcul
  // Les bougies SPY/QQQ/TLT sont déjà en KV si scan précédent
  // ============================================================
  let regime = await kvGet("market:regime", env);
  if (!regime) {
    try {
      // Bougies uniquement (quotes déjà en cache depuis phase 1)
      const spyCandles = await getCandlesBySymbol("SPY", "1d", 90, env, ctx);
      const qqqCandles = await getCandlesBySymbol("QQQ", "1d", 90, env, ctx);
      const tltCandles = await getCandlesBySymbol("TLT", "1d", 90, env, ctx);
      regime = detectMarketRegime(spyCandles, qqqCandles, tltCandles);
      await kvSet("market:regime", regime, KV_TTL.regime, env);
    } catch (e) {
      regime = { regime: "RANGE", reason: "Regime non calcule", spySignal: "neutral", qqqSignal: "neutral", tltSignal: "neutral", updatedAt: nowIso() };
    }
  }

  // ============================================================
  // PHASE 3 — Bougies + scoring en sequentiel strict
  // Les quotes sont déjà en cache memoire — 0 subrequete supplémentaire
  // Chaque actif ne fait que 1 appel : bougies (ou 0 si KV valide)
  // ============================================================
  const rows = [];
  for (const symbol of LIGHT_SYMBOLS) {
    let quote = quotesMap[symbol] || getMemoryCache(`market:snapshot:${symbol}`);
    try {
      if (!isCrypto(symbol) && !quote) {
        quote = await getStoredDailyQuoteFallback(symbol, env);
        if (!quote) {
          rows.push(toOpportunityRow(buildPartialAnalysisPayload(
            symbol,
            buildPartialPlaceholderQuote(symbol),
            quoteErrors[symbol] || nonCryptoBatchError,
            regime
          )));
          continue;
        }
      }
      // Quote depuis cache (pré-rempli en phase 1)
      quote = quote || await resolveUnifiedMarketQuote(symbol, env, ctx, { allowAlphaFallback: false });
      // Bougies depuis KV si disponibles
      const candles = await getCandlesBySymbol(symbol, "1d", 90, env, ctx);
      const scored = calcDetailScore(quote, candles || [], regime, env);
      const payload = buildStablePayload(symbol, quote, candles || [], scored, regime);
      rows.push(toOpportunityRow(payload));
    } catch (e) {
      if (quote && Number.isFinite(Number(quote.price))) {
        rows.push(toOpportunityRow(buildPartialAnalysisPayload(symbol, quote, e instanceof Error ? e.message : "Analyse technique partielle", regime)));
      } else {
        rows.push(toOpportunityRow(buildUnavailablePayload(symbol, e instanceof Error ? e.message : "indisponible")));
      }
    }
  }

  rows.sort((a, b) => getComparableOpportunityScore(b) - getComparableOpportunityScore(a));
  let eurusdRate = finiteOrNull(quotesMap.EURUSD?.price);
  if (!Number.isFinite(eurusdRate)) {
    eurusdRate = 0.92;
    try { eurusdRate = await getEurusdRate(env); } catch {}
  }
  rows.forEach((row) => {
    row.regime = regime || row.regime || null;
    row.fxUsdToEur = Number.isFinite(Number(eurusdRate)) ? Number(eurusdRate) : null;
  });
  const publicRows = rows.filter(row => row?.status !== "partial");

  // Stocker en cache
  setMemoryCache("route:opportunities:data", TTL.opportunitiesNonCrypto, cloneJsonPayload(publicRows));
  setOpportunitySnapshot(publicRows, TTL.opportunitiesNonCrypto);
  await kvSet("opportunities:snapshot", { rows: publicRows, regime, eurusdRate, updatedAt: nowIso() }, KV_TTL.opportunities, env);

  const validCount = publicRows.filter(x => x.status === "ok").length;
  const message = validCount
    ? `${validCount}/${rows.length} actifs analyses — regime ${regime.regime}`
    : "Aucune opportunite disponible.";
  const publicMessage = validCount
    ? `${validCount}/${publicRows.length} actifs analyses - regime ${regime.regime}`
    : message;

  return attachBudgetHeaders(
    (validCount < publicRows.length ? partial : okCached)(
      publicRows, "worker-v2", nowIso(), validCount ? "recent" : "unknown", publicMessage, KV_TTL.opportunities
    ),
    ctx
  );
}

function getOpportunityRowFromSnapshot(symbol) {
  const rows = getOpportunitySnapshot();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.find(row => parseSymbol(row?.symbol) === parseSymbol(symbol)) || null;
}

// ============================================================
// HANDLE OPPORTUNITY DETAIL
// ============================================================
async function handleOpportunityDetail(symbol, env) {
  const clean = parseSymbol(symbol);
  if (!clean) return fail("Invalid symbol", "error", 400);

  const detailTtl = isCrypto(clean) ? TTL.detailCrypto : TTL.detailNonCrypto;
  const cacheKey = `route:detail:data:${clean}`;

  const cachedPayload = getMemoryCache(cacheKey);
  if (cachedPayload) {
    const payload = cloneJsonPayload(cachedPayload);
    const ctx = createBudgetContext("detail");
    return attachBudgetHeaders(
      (payload.status === "ok" ? ok : partial)(payload, payload.sourceUsed || "worker-v2", nowIso(), payload.freshness || "unknown", null),
      ctx
    );
  }

  const ctx = createBudgetContext("detail");

  // Régime depuis KV
  let regime = await kvGet("market:regime", env);

  const snapshotRow = getOpportunityRowFromSnapshot(clean);

  try {
    let payload = await withTimeout(
      buildStableMarketPayload(clean, env, ctx, true, regime),
      15000,
      `detail:${clean}`
    );

    // Enrichissement AI si disponible
    try {
      const newsPanel = getMemoryCache("route:news:v8-signal-layer-full:data");
      const relatedNews = gatherRelatedNewsForAsset(clean, payload?.name, newsPanel?.items || []);
      if (relatedNews.length > 0) {
        const aiInput = buildAiContextInput(clean, payload, relatedNews, buildArticleInputsFromNews(relatedNews));
        const aiReviewResult = await maybeRunAiContextReview(aiInput, env);
        if (aiReviewResult?.ok && aiReviewResult?.data) {
          payload = mergeEngineWithAi(payload, aiReviewResult.data);
          payload.aiContextStatus = `used:sources=${relatedNews.length}`;
        } else {
          payload.aiContextReview = null;
          payload.aiModifier = 0;
          payload.aiInfluence = "aucune";
          payload.aiVeto = false;
          payload.aiContextStatus = aiReviewResult?.reason || "skipped";
        }
      }
    } catch {}

    setMemoryCache(cacheKey, detailTtl, cloneJsonPayload(payload));

    return attachBudgetHeaders(
      (payload.status === "ok" ? ok : partial)(payload, payload.sourceUsed || "worker-v2", nowIso(), payload.freshness || "unknown", null),
      ctx
    );
  } catch (error) {
    if (snapshotRow) {
      return attachBudgetHeaders(
        partial(snapshotRow, snapshotRow.sourceUsed || "worker-v2", nowIso(), "unknown", "Detail dégradé sur snapshot"),
        ctx
      );
    }
    const message = compactProviderError(error instanceof Error ? error.message : "Detail unavailable");
    return attachBudgetHeaders(
      partial(buildUnavailablePayload(clean, message), "worker-v2", nowIso(), "unknown", message),
      ctx
    );
  }
}

// ============================================================
// TRAINING — paramètres par défaut mis à jour
// ============================================================
function getTrainingDefaults() {
  return {
    mode: "training",
    is_enabled: false,
    auto_open_enabled: true,
    auto_close_enabled: true,
    allow_long: true,
    allow_short: false,              // désactivé jusqu'à calibration
    max_open_positions: 10,          // max positions simultanées
    max_positions_per_symbol: 1,
    min_actionability_score: 72,
    min_dossier_score: 74,
    capital_base: 10000,
    risk_per_trade_pct: 0.02,
    allocation_per_trade_pct: 0.10,  // 10% du capital par trade
    max_holding_hours: 240,          // 10 jours max
    allowed_symbols: [],
    allowed_setups: ["pullback", "breakout", "continuation"],
    mean_reversion_enabled: false    // désactivé jusqu'à 30 trades clôturés
  };
}

function isTrainingCandidateAllowed(row, settings, openRows) {
  if (!row || row.status !== "ok") return false;
  if (row.decision !== "Trade propose") return false;
  if (!row.plan?.tradeNow) return false;

  // Setup autorisé ?
  const setupType = String(row.plan?.setupType || row.setupType || "").toLowerCase();
  const allowedSetups = Array.isArray(settings.allowed_setups) ? settings.allowed_setups : ["pullback","breakout","continuation"];
  if (setupType && setupType !== "aucun" && !allowedSetups.includes(setupType)) return false;

  // Mean reversion bloquée
  if (setupType === "mean_reversion" && !settings.mean_reversion_enabled) return false;

  // Scores
  const minActionability = Number(settings.min_actionability_score || 72);
  const minDecision = Number(settings.min_dossier_score || 74);
  const minSafety = Math.max(68, minDecision - 4);
  const actionabilityScore = Number(row.plan?.exploitabilityScore || 0);
  const decisionScore = Number(
    row.plan?.decisionScore ??
    directionalOpportunityScore(row.plan?.finalScore ?? row.score, row.direction)
  );
  const safetyScore = Number(row.plan?.safetyScore ?? row.safetyScore ?? 0);
  if (actionabilityScore < minActionability) return false;
  if (decisionScore < minDecision) return false;
  if (safetyScore < minSafety) return false;

  // Ratio minimum
  if (Number(row.plan?.rr || 0) < 1.6) return false;

  // Plan complet
  if (!Number.isFinite(Number(row.plan?.entry))) return false;
  if (!Number.isFinite(Number(row.plan?.stopLoss))) return false;
  if (!Number.isFinite(Number(row.plan?.takeProfit))) return false;

  // Sens autorisé
  if ((row.plan?.side || "") === "short" && !settings.allow_short) return false;
  if ((row.plan?.side || "") === "long" && !settings.allow_long) return false;

  // Symboles autorisés
  const allowedList = Array.isArray(settings.allowed_symbols) ? settings.allowed_symbols : [];
  if (allowedList.length && !allowedList.includes(parseSymbol(row.symbol))) return false;

  // Déjà ouvert
  const alreadyOpen = openRows.filter(x => parseSymbol(x.symbol) === parseSymbol(row.symbol)).length;
  if (alreadyOpen >= Number(settings.max_positions_per_symbol || 1)) return false;

  // Max global
  if (openRows.length >= Number(settings.max_open_positions || 10)) return false;

  return true;
}

// ============================================================
// CYCLE TRAINING — atomique, chaque position indépendante
// ============================================================
async function handleTrainingAutoCycle(env) {
  if (!supabaseConfigured(env)) return fail("Supabase non configure", "error", 503);

  const settings = await getTrainingSettings(env);
  const log = {
    startedAt: nowIso(),
    enabled: settings.is_enabled,
    closed: [], opened: [], skipped: [], errors: [],
    interrupted: false
  };

  if (!settings.is_enabled) {
    return partial(log, "worker_training", nowIso(), "recent", "training_auto_disabled");
  }

  try {
    const rawOpen = await withTimeout(getOpenTrainingPositionsRaw(env), 8000, "get_open_positions");
    let openRows = Array.isArray(rawOpen) ? rawOpen : [];

    // PHASE FERMETURE — chaque position indépendante
    if (settings.auto_close_enabled) {
      for (const position of openRows) {
        const symbol = parseSymbol(position?.symbol || "");
        if (!symbol) continue;
        try {
          let liveQuote = null;
          let detailPayload = null;
          try { liveQuote = await withTimeout(resolveUnifiedMarketQuote(symbol, env, null), 6000, `quote:${symbol}`); } catch {}
          try { detailPayload = await withTimeout(buildStableMarketPayload(symbol, env, null, true), 8000, `detail:${symbol}`); } catch {}

          const trigger = trainingCloseTrigger(position, liveQuote?.price ?? null, detailPayload, settings);
          if (!trigger) continue;

          const closed = await withTimeout(
            closeTrainingPosition(env, position, trigger.exitPrice, trigger.type, detailPayload),
            8000, `close:${symbol}`
          );
          log.closed.push({ symbol, trade_id: closed.id, close_type: trigger.type, exit_price: closed.exit_price, pnl: closed.pnl, pnl_pct: closed.pnl_pct });
        } catch (e) {
          log.errors.push({ phase: "close", symbol, error: e.message });
          // continue — les autres fermetures ne sont pas bloquées
        }
      }

      // Rafraîchir la liste des positions ouvertes
      try {
        openRows = await withTimeout(getOpenTrainingPositionsRaw(env), 8000, "refresh_open_positions");
      } catch {}
    }

    // PHASE OUVERTURE — chaque position indépendante
    if (settings.auto_open_enabled && openRows.length < Number(settings.max_open_positions || 10)) {
      const rows = await buildOpportunityRowsForTraining(env);
      const candidates = rows.filter(row => isTrainingCandidateAllowed(row, settings, openRows));

      let availableCash = Number(settings.capital_base || 0) - openRows.reduce((acc, row) => acc + (Number(row?.invested || row?.execution?.invested || 0) || 0), 0);

      for (const row of candidates) {
        if (openRows.length >= Number(settings.max_open_positions || 10)) break;
        try {
          const opened = await withTimeout(
            openTrainingPositionFromRow(env, row, settings, availableCash),
            8000, `open:${row.symbol}`
          );
          if (!opened) {
            log.skipped.push({ symbol: row.symbol, reason: "execution_unavailable" });
            continue;
          }
          log.opened.push({ symbol: opened.symbol, trade_id: opened.id, entry_price: opened.entry_price, stop_loss: opened.stop_loss, take_profit: opened.take_profit, invested: opened.invested, setup_type: row.plan?.setupType || "unknown" });
          openRows.push(opened);
          availableCash -= Number(opened.invested || 0);
        } catch (e) {
          log.skipped.push({ symbol: row.symbol, reason: e.message });
        }
      }
    }

  } catch (e) {
    log.interrupted = true;
    log.errors.push({ phase: "cycle", error: e.message });
  } finally {
    // Toujours logger même en cas d'interruption
    await logTrainingEvent(env, "cycle_completed", {
      opened_count: log.opened.length,
      closed_count: log.closed.length,
      skipped_count: log.skipped.length,
      error_count: log.errors.length,
      interrupted: log.interrupted
    }).catch(() => {});
  }

  return ok(log, "worker_training", nowIso(), "recent", "training_auto_cycle_done");
}

// ============================================================
// CRON HANDLER — ordre strict
// ============================================================
async function handleScheduledCycle(env) {
  try {
    // 1. Rafraîchir les opportunités (inclut le calcul du régime)
    await withTimeout(handleOpportunities(null, env), 25000, "scheduled_opportunities");
  } catch (e) {
    // Log mais ne bloque pas le training
    console.error("Scheduled opportunities error:", e.message);
  }

  try {
    // 2. Cycle training sur données fraîches
    await withTimeout(handleTrainingAutoCycle(env), 25000, "scheduled_training");
  } catch (e) {
    console.error("Scheduled training error:", e.message);
  }
}

// ============================================================
// SUPABASE
// ============================================================
function supabaseConfigured(env) { return !!(env && env.SUPABASE_URL && env.SUPABASE_ANON_KEY); }
function supabaseHeaders(env, extra = {}) {
  return { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, ...extra };
}
async function supabaseFetch(env, path, options = {}) {
  if (!supabaseConfigured(env)) throw new Error("supabase_not_configured");
  if (circuitIsOpen("supabase")) throw new Error("supabase_circuit_open");
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  try {
    const res = await withTimeout(
      fetch(`${base}/rest/v1/${path}`, { ...options, headers: supabaseHeaders(env, options.headers || {}) }),
      8000, "supabase_fetch"
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      recordFailure("supabase");
      throw new Error(`supabase_${res.status}:${txt || res.statusText}`);
    }
    recordSuccess("supabase");
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  } catch (e) {
    if (!e.message.includes("circuit_open")) recordFailure("supabase");
    throw e;
  }
}

// ============================================================
// TRAINING TABLES
// ============================================================
const TRADE_TABLES = { positions: "mtp_positions", trades: "mtp_trades" };
const TRAINING_SETTINGS_TABLE = "mtp_training_settings";
const TRAINING_EVENTS_TABLE = "mtp_training_events";
const SIGNAL_TABLE = "mtp_signals";

function coerceBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    if (["true","1","yes","on"].includes(clean)) return true;
    if (["false","0","no","off"].includes(clean)) return false;
  }
  return fallback;
}
function clampInt(value, min, max, fallback) {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}
function clampFloat(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function normalizeTrainingSettingsRow(row) {
  const base = getTrainingDefaults();
  const safe = row && typeof row === "object" ? row : {};
  return {
    mode: "training",
    is_enabled: coerceBoolean(safe.is_enabled, base.is_enabled),
    auto_open_enabled: coerceBoolean(safe.auto_open_enabled, base.auto_open_enabled),
    auto_close_enabled: coerceBoolean(safe.auto_close_enabled, base.auto_close_enabled),
    allow_long: coerceBoolean(safe.allow_long, base.allow_long),
    allow_short: coerceBoolean(safe.allow_short, base.allow_short),
    max_open_positions: clampInt(safe.max_open_positions, 1, 50, base.max_open_positions),
    max_positions_per_symbol: clampInt(safe.max_positions_per_symbol, 1, 5, base.max_positions_per_symbol),
    min_actionability_score: clampInt(safe.min_actionability_score, 1, 100, base.min_actionability_score),
    min_dossier_score: clampInt(safe.min_dossier_score, 1, 100, base.min_dossier_score),
    capital_base: clampFloat(safe.capital_base, 100, 10000000, base.capital_base),
    risk_per_trade_pct: clampFloat(safe.risk_per_trade_pct, 0.001, 0.1, base.risk_per_trade_pct),
    allocation_per_trade_pct: clampFloat(safe.allocation_per_trade_pct, 0.01, 1, base.allocation_per_trade_pct),
    max_holding_hours: clampInt(safe.max_holding_hours, 1, 24*365, base.max_holding_hours),
    allowed_symbols: Array.isArray(safe.allowed_symbols) ? safe.allowed_symbols.map(x => parseSymbol(x)).filter(Boolean).slice(0, 100) : base.allowed_symbols,
    allowed_setups: Array.isArray(safe.allowed_setups) ? safe.allowed_setups : base.allowed_setups,
    mean_reversion_enabled: coerceBoolean(safe.mean_reversion_enabled, base.mean_reversion_enabled),
    updated_at: nowIso()
  };
}

async function getTrainingSettings(env) {
  const defaults = normalizeTrainingSettingsRow(getTrainingDefaults());
  if (!supabaseConfigured(env)) return defaults;
  try {
    const rows = await supabaseFetch(env, `${TRAINING_SETTINGS_TABLE}?mode=eq.training&limit=1`);
    const item = Array.isArray(rows) ? rows[0] || null : null;
    return item ? normalizeTrainingSettingsRow(item) : defaults;
  } catch { return defaults; }
}

async function saveTrainingSettings(env, input) {
  if (!supabaseConfigured(env)) throw new Error("supabase_not_configured");
  const row = normalizeTrainingSettingsRow(input);
  await supabaseFetch(env, `${TRAINING_SETTINGS_TABLE}?on_conflict=mode`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([row])
  });
  return row;
}

async function logTrainingEvent(env, eventType, payload) {
  if (!supabaseConfigured(env)) return false;
  const row = {
    id: `${String(eventType || "event")}:${Date.now()}:${Math.random().toString(36).slice(2,10)}`,
    created_at: nowIso(),
    mode: "training",
    event_type: String(eventType || "unknown"),
    symbol: parseSymbol(payload?.symbol || ""),
    trade_id: payload?.trade_id || payload?.id || null,
    engine_version: ENGINE_VERSION,
    engine_ruleset: ENGINE_RULESET,
    payload: payload || {}
  };
  try {
    await supabaseFetch(env, `${TRAINING_EVENTS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([row])
    });
    return true;
  } catch { return false; }
}

function normalizeRowByKeys(row, keys) {
  const safe = row && typeof row === "object" ? row : {};
  const out = {};
  for (const key of keys) out[key] = Object.prototype.hasOwnProperty.call(safe, key) ? safe[key] : null;
  return out;
}

const TRAINING_POSITION_KEYS = ["id","symbol","name","direction","entry_price","quantity","invested","stop_loss","take_profit","mode","status","opened_at","updated_at","score","decision","trend_label","source_used"];
const TRAINING_TRADE_KEYS = ["id","symbol","name","direction","entry_price","exit_price","quantity","invested","stop_loss","take_profit","pnl","pnl_pct","opened_at","closed_at","duration_days","mode","status","score","adj_score","rr_ratio","decision","trend_label","source_used","updated_at"];

function normalizeTrainingPositions(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object").map(row => normalizeRowByKeys({
    ...row,
    direction: row.direction ?? row.side ?? row?.analysis_snapshot?.direction ?? null,
    entry_price: row.entry_price ?? row.entryPrice ?? row?.execution?.entryPrice ?? null,
    quantity: row.quantity ?? row?.execution?.quantity ?? null,
    invested: row.invested ?? row?.execution?.invested ?? null,
    stop_loss: row.stop_loss ?? row.stopLoss ?? row?.analysis_snapshot?.stopLoss ?? null,
    take_profit: row.take_profit ?? row.takeProfit ?? row?.analysis_snapshot?.takeProfit ?? null,
    opened_at: row.opened_at ?? row.openedAt ?? row?.execution?.openedAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    score: row.score ?? row?.analysis_snapshot?.score ?? null,
    trend_label: row.trend_label ?? row.trendLabel ?? row?.analysis_snapshot?.trendLabel ?? null,
    source_used: row.source_used ?? row.sourceUsed ?? row?.analysis_snapshot?.sourceUsed ?? null,
    decision: row.decision ?? row.trade_decision ?? row?.analysis_snapshot?.decision ?? null,
    status: row.status ?? "open"
  }, TRAINING_POSITION_KEYS));
}

function normalizeTrainingTrades(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object").map(row => normalizeRowByKeys({
    ...row,
    direction: row.direction ?? row.side ?? row?.analysis_snapshot?.direction ?? null,
    entry_price: row.entry_price ?? row.entryPrice ?? row?.execution?.entryPrice ?? null,
    exit_price: row.exit_price ?? row.exitPrice ?? row?.closedExecution?.exitPrice ?? null,
    quantity: row.quantity ?? row?.execution?.quantity ?? null,
    invested: row.invested ?? row?.execution?.invested ?? null,
    stop_loss: row.stop_loss ?? row.stopLoss ?? null,
    take_profit: row.take_profit ?? row.takeProfit ?? null,
    opened_at: row.opened_at ?? row.openedAt ?? null,
    closed_at: row.closed_at ?? row.closedAt ?? row?.closedExecution?.closedAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    score: row.score ?? row?.analysis_snapshot?.score ?? null,
    pnl_pct: row.pnl_pct ?? row.pnlPct ?? null,
    duration_days: row.duration_days ?? row.durationDays ?? null,
    adj_score: row.adj_score ?? row.adjScore ?? null,
    rr_ratio: row.rr_ratio ?? row.rrRatio ?? row.rr ?? null,
    trend_label: row.trend_label ?? row.trendLabel ?? null,
    source_used: row.source_used ?? row.sourceUsed ?? null,
    decision: row.decision ?? row.trade_decision ?? null,
    status: row.status ?? "closed"
  }, TRAINING_TRADE_KEYS));
}

async function getOpenTrainingPositionsRaw(env) {
  if (!supabaseConfigured(env)) return [];
  const rows = await supabaseFetch(env, `${TRADE_TABLES.positions}?mode=eq.training&status=eq.open&order=opened_at.asc`);
  return Array.isArray(rows) ? rows : [];
}
async function getClosedTrainingTradesRaw(env, limit = 200) {
  if (!supabaseConfigured(env)) return [];
  const rows = await supabaseFetch(env, `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed&order=closed_at.desc&limit=${clampInt(limit,1,1000,200)}`);
  return Array.isArray(rows) ? rows : [];
}

function buildTrainingAnalysisSnapshotFromPayload(payload) {
  const plan = payload?.plan || {};
  return {
    symbol: payload?.symbol || null,
    name: payload?.name || null,
    score: finiteOrNull(payload?.score),
    dossierScore: finiteOrNull(plan?.finalScore ?? payload?.score),
    decisionScore: finiteOrNull(plan?.decisionScore),
    safetyScore: finiteOrNull(plan?.safetyScore),
    actionabilityScore: finiteOrNull(plan?.exploitabilityScore),
    officialScore: finiteOrNull(payload?.officialScore ?? plan?.safetyScore ?? plan?.exploitabilityScore),
    decision: payload?.decision || plan?.decision || null,
    trendLabel: payload?.trendLabel || plan?.trendLabel || null,
    direction: plan?.side || payload?.direction || null,
    entry: finiteOrNull(plan?.entry),
    stopLoss: finiteOrNull(plan?.stopLoss),
    takeProfit: finiteOrNull(plan?.takeProfit),
    ratio: finiteOrNull(plan?.rr),
    horizon: plan?.horizon || null,
    reason: payload?.reasonShort || plan?.reason || null,
    sourceUsed: payload?.sourceUsed || null,
    setupType: plan?.setupType || null,
    setupStatus: plan?.setupStatus || null,
    confirmationCount: Number.isFinite(Number(plan?.confirmationCount)) ? Number(plan.confirmationCount) : null,
    blockerFlags: Array.isArray(plan?.blockerFlags) ? plan.blockerFlags : [],
    analysisTimestamp: nowIso()
  };
}

function chooseTrainingExecution(payload, settings, currentAvailableCash) {
  const plan = payload?.plan || {};
  const price = finiteOrNull(plan?.entry ?? payload?.price);
  const stopLoss = finiteOrNull(plan?.stopLoss);
  const takeProfit = finiteOrNull(plan?.takeProfit);
  const rr = finiteOrNull(plan?.rr);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(stopLoss) || !Number.isFinite(takeProfit)) return null;
  const side = String(plan?.side || "").toLowerCase();
  if (!["long","short"].includes(side)) return null;
  const capitalBase = Math.max(0, Number(settings?.capital_base || 0));
  const availableCash = Math.max(0, Number(currentAvailableCash ?? capitalBase));
  const allocatedCash = Math.min(availableCash, capitalBase * Number(settings?.allocation_per_trade_pct || 0.10));
  if (!Number.isFinite(allocatedCash) || allocatedCash <= 50) return null;
  const quantity = allocatedCash / price;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { side, entryPrice: price, quantity, invested: quantity * price, stopLoss, takeProfit, rr };
}

function trainingCloseTrigger(position, livePrice, detailPayload, settings) {
  const safePrice = finiteOrNull(livePrice);
  const side = String(position?.side || position?.direction || "").toLowerCase();
  const stopLoss = finiteOrNull(position?.stop_loss ?? position?.stopLoss ?? position?.analysis_snapshot?.stopLoss);
  const takeProfit = finiteOrNull(position?.take_profit ?? position?.takeProfit ?? position?.analysis_snapshot?.takeProfit);
  if (!Number.isFinite(safePrice) || !["long","short"].includes(side)) return null;
  if (side === "long" && Number.isFinite(stopLoss) && safePrice <= stopLoss) return { type: "stop_loss", exitPrice: stopLoss };
  if (side === "long" && Number.isFinite(takeProfit) && safePrice >= takeProfit) return { type: "take_profit", exitPrice: takeProfit };
  if (side === "short" && Number.isFinite(stopLoss) && safePrice >= stopLoss) return { type: "stop_loss", exitPrice: stopLoss };
  if (side === "short" && Number.isFinite(takeProfit) && safePrice <= takeProfit) return { type: "take_profit", exitPrice: takeProfit };

  const openedMs = new Date(position?.opened_at ?? position?.openedAt ?? position?.execution?.openedAt ?? 0).getTime();
  const maxHoldingMs = Math.max(1, Number(settings?.max_holding_hours || 240)) * 60 * 60 * 1000;
  if (openedMs > 0 && (Date.now() - openedMs) >= maxHoldingMs) return { type: "time_exit", exitPrice: safePrice };

  if (detailPayload && detailPayload.status === "ok") {
    const plan = detailPayload.plan || {};
    const decision = String(detailPayload.decision || plan.decision || "");
    const actionability = Number(plan.exploitabilityScore ?? 0);
    if (decision === "Pas de trade" || actionability < Math.max(40, Number(settings?.min_actionability_score || 72) - 18)) {
      return { type: "engine_invalidation", exitPrice: safePrice };
    }
  }
  return null;
}

function computePnlForClose(position, exitPrice) {
  const entry = finiteOrNull(position?.entry_price ?? position?.entryPrice ?? position?.execution?.entryPrice);
  const quantity = finiteOrNull(position?.quantity ?? position?.execution?.quantity);
  const side = String(position?.side || "").toLowerCase();
  if (!Number.isFinite(entry) || !Number.isFinite(quantity) || !Number.isFinite(exitPrice) || quantity <= 0) return { pnl: null, pnlPct: null };
  const pnl = side === "short" ? (entry - exitPrice) * quantity : (exitPrice - entry) * quantity;
  const invested = Math.abs(entry * quantity);
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : null;
  return { pnl, pnlPct };
}

function buildTrainingPositionRowFromSignal(payload, execution, settings) {
  const analysisSnapshot = buildTrainingAnalysisSnapshotFromPayload(payload);
  const id = `${parseSymbol(payload?.symbol)}:training:${Date.now()}`;
  return {
    id, symbol: parseSymbol(payload?.symbol), name: payload?.name || parseSymbol(payload?.symbol),
    mode: "training", status: "open", side: execution.side,
    asset_class: payload?.assetClass || getAssetClass(parseSymbol(payload?.symbol)),
    quantity: execution.quantity, entry_price: execution.entryPrice, invested: execution.invested,
    stop_loss: execution.stopLoss, take_profit: execution.takeProfit,
    score: finiteOrNull(payload?.score),
    trend_label: payload?.trendLabel || payload?.plan?.trendLabel || null,
    trade_decision: payload?.decision || payload?.plan?.decision || null,
    trade_reason: payload?.reasonShort || payload?.plan?.reason || null,
    horizon: payload?.plan?.horizon || null,
    source_used: payload?.sourceUsed || null,
    opened_at: nowIso(),
    analysis_snapshot: analysisSnapshot,
    execution: { openedAt: nowIso(), entryPrice: execution.entryPrice, quantity: execution.quantity, invested: execution.invested },
    live: { lastPrice: execution.entryPrice, updatedAt: nowIso() },
    updated_at: nowIso()
  };
}

function buildClosedTradeRowFromPosition(position, exitPrice, closeType, detailPayload) {
  const analysisSnapshot = position?.analysis_snapshot || buildTrainingAnalysisSnapshotFromPayload(detailPayload || {});
  const { pnl, pnlPct } = computePnlForClose(position, exitPrice);
  return {
    id: position?.id || null,
    symbol: parseSymbol(position?.symbol || ""),
    name: position?.name || parseSymbol(position?.symbol || ""),
    mode: "training", status: "closed", side: position?.side || null,
    asset_class: position?.asset_class || null,
    quantity: finiteOrNull(position?.quantity ?? position?.execution?.quantity),
    entry_price: finiteOrNull(position?.entry_price ?? position?.entryPrice ?? position?.execution?.entryPrice),
    exit_price: finiteOrNull(exitPrice),
    invested: finiteOrNull(position?.invested ?? position?.execution?.invested),
    stop_loss: finiteOrNull(position?.stop_loss ?? position?.stopLoss ?? analysisSnapshot?.stopLoss),
    take_profit: finiteOrNull(position?.take_profit ?? position?.takeProfit ?? analysisSnapshot?.takeProfit),
    pnl, pnl_pct: pnlPct,
    score: finiteOrNull(position?.score ?? analysisSnapshot?.score),
    adj_score: finiteOrNull(analysisSnapshot?.actionabilityScore ?? null),
    rr_ratio: finiteOrNull(analysisSnapshot?.ratio ?? null),
    trend_label: position?.trend_label || analysisSnapshot?.trendLabel || null,
    trade_decision: position?.trade_decision || analysisSnapshot?.decision || null,
    trade_reason: position?.trade_reason || analysisSnapshot?.reason || null,
    horizon: position?.horizon || analysisSnapshot?.horizon || null,
    source_used: position?.source_used || analysisSnapshot?.sourceUsed || null,
    opened_at: position?.opened_at || null,
    closed_at: nowIso(),
    analysis_snapshot: analysisSnapshot,
    execution: position?.execution || null,
    live: { lastPrice: finiteOrNull(exitPrice), updatedAt: nowIso() },
    closed_execution: { exitPrice: finiteOrNull(exitPrice), closedAt: nowIso(), closeType: String(closeType || "unknown") },
    updated_at: nowIso()
  };
}

async function closeTrainingPosition(env, position, exitPrice, closeType, detailPayload) {
  const closedRow = buildClosedTradeRowFromPosition(position, exitPrice, closeType, detailPayload);
  await supabaseFetch(env, `${TRADE_TABLES.trades}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([closedRow])
  });
  await supabaseFetch(env, `${TRADE_TABLES.positions}?id=eq.${encodeURIComponent(String(position.id || ""))}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  await logTrainingEvent(env, "trade_closed", { id: closedRow.id, trade_id: closedRow.id, symbol: closedRow.symbol, close_type: closeType, exit_price: closedRow.exit_price, pnl: closedRow.pnl, pnl_pct: closedRow.pnl_pct });
  return closedRow;
}

async function openTrainingPositionFromRow(env, row, settings, availableCash) {
  const execution = chooseTrainingExecution(row, settings, availableCash);
  if (!execution) return null;
  const positionRow = buildTrainingPositionRowFromSignal(row, execution, settings);
  await supabaseFetch(env, `${TRADE_TABLES.positions}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([positionRow])
  });
  await logTrainingEvent(env, "trade_opened", { id: positionRow.id, trade_id: positionRow.id, symbol: positionRow.symbol, side: positionRow.side, entry_price: positionRow.entry_price, stop_loss: positionRow.stop_loss, take_profit: positionRow.take_profit, invested: positionRow.invested, setup_type: row.plan?.setupType || null });
  return positionRow;
}

async function buildOpportunityRowsForTraining(env) {
  const cachedRows = getMemoryCache("route:opportunities:data");
  if (Array.isArray(cachedRows) && cachedRows.length) return cloneJsonPayload(cachedRows);

  // Essayer le KV
  const kvSnapshot = await kvGet("opportunities:snapshot", env);
  if (kvSnapshot?.rows && Array.isArray(kvSnapshot.rows) && kvSnapshot.rows.length) return kvSnapshot.rows;

  // Scan complet si rien en cache
  const regime = await kvGet("market:regime", env);
  const ctx = createBudgetContext("training_scan");
  const results = await mapWithConcurrency(
    LIGHT_SYMBOLS,
    OPPORTUNITIES_CONCURRENCY,
    async (symbol) => buildStableMarketPayload(symbol, env, ctx, true, regime, { allowAlphaFallback: false })
  );
  const rows = results.map((result, index) =>
    result instanceof Error ? toOpportunityRow(buildUnavailablePayload(LIGHT_SYMBOLS[index], result.message)) : toOpportunityRow(result)
  );
  rows.sort((a, b) => getComparableOpportunityScore(b) - getComparableOpportunityScore(a));
  setMemoryCache("route:opportunities:data", TTL.opportunitiesNonCrypto, cloneJsonPayload(rows));
  return rows;
}

// ============================================================
// TRAINING ROUTES
// ============================================================
async function handleTrainingAccount(env) {
  if (!supabaseConfigured(env)) return ok({ configured: false, settings: normalizeTrainingSettingsRow(getTrainingDefaults()) }, "worker_training", nowIso(), "recent", "Supabase non configure");
  const settings = await getTrainingSettings(env);
  const openRows = normalizeTrainingPositions(await getOpenTrainingPositionsRaw(env));
  const closedRows = normalizeTrainingTrades(await getClosedTrainingTradesRaw(env, 500));
  const capitalBase = Number(settings.capital_base || 0);
  const engaged = openRows.reduce((acc, row) => acc + (Number(row.invested || 0) || 0), 0);
  const realized = closedRows.reduce((acc, row) => acc + (Number(row.pnl || 0) || 0), 0);
  const available = capitalBase + realized - engaged;
  return ok({ configured: true, settings, capitalBase, available, engaged, realized, equity: available + engaged, openCount: openRows.length, closedCount: closedRows.length }, "worker_training", nowIso(), "recent", null);
}

async function handleTrainingPositions(env) {
  if (!supabaseConfigured(env)) return ok({ configured: false, positions: [], history: [] }, "worker_training", nowIso(), "recent", "Supabase non configure");
  const positions = normalizeTrainingPositions(await getOpenTrainingPositionsRaw(env));
  const history = normalizeTrainingTrades(await getClosedTrainingTradesRaw(env, 200));
  return ok({ configured: true, positions, history }, "worker_training", nowIso(), "recent", null);
}

async function handleTrainingSettingsGet(env) {
  const settings = await getTrainingSettings(env);
  return ok(settings, "worker_training", nowIso(), "recent", null);
}

async function handleTrainingSettingsSave(request, env) {
  const body = await request.json().catch(() => ({}));
  const current = await getTrainingSettings(env);
  const saved = await saveTrainingSettings(env, { ...current, ...(body || {}) });
  await logTrainingEvent(env, "settings_updated", { settings: saved });
  return ok(saved, "worker_training", nowIso(), "recent", "training_settings_saved");
}

// ============================================================
// TRADES SYNC
// ============================================================
const SUPABASE_POSITION_KEYS = ["id","symbol","name","mode","status","side","asset_class","quantity","entry_price","invested","stop_loss","take_profit","score","trend_label","trade_decision","trade_reason","horizon","source_used","opened_at","analysis_snapshot","execution","live","updated_at"];
const SUPABASE_TRADE_KEYS = ["id","symbol","name","mode","status","side","asset_class","quantity","entry_price","exit_price","invested","stop_loss","take_profit","pnl","pnl_pct","score","adj_score","rr_ratio","trend_label","trade_decision","trade_reason","horizon","source_used","opened_at","closed_at","analysis_snapshot","execution","live","closed_execution","updated_at"];

function isAuthoritativeClosedTradeRow(row) {
  if (!row || !row.id) return false;
  const status = String(row.status || "").toLowerCase();
  const closedAtMs = new Date(row.closed_at ?? row.closedAt ?? row?.closed_execution?.closedAt ?? 0).getTime();
  const exitPrice = Number(row.exit_price ?? row.exitPrice ?? row?.closed_execution?.exitPrice);
  return status === "closed" && closedAtMs > 0 && Number.isFinite(exitPrice) && exitPrice > 0;
}

function tradesPayload(configured, positions = [], history = [], message = null) {
  return ok({ configured, positions, history }, configured ? "worker_supabase" : "worker_local_only", nowIso(), "live", message);
}

async function handleTradesState(env) {
  if (!supabaseConfigured(env)) return tradesPayload(false, [], [], "Secrets Supabase absents");
  const positionsRaw = await supabaseFetch(env, `${TRADE_TABLES.positions}?mode=eq.training&status=eq.open&order=opened_at.desc`);
  const historyRaw = await supabaseFetch(env, `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed&order=closed_at.desc`);
  const history = normalizeTrainingTrades(Array.isArray(historyRaw) ? historyRaw : []);
  const closedIds = new Set(history.map(row => String(row.id || "")).filter(Boolean));
  const positions = normalizeTrainingPositions(Array.isArray(positionsRaw) ? positionsRaw : []).filter(row => !closedIds.has(String(row.id || "")));
  return tradesPayload(true, positions, history);
}

async function handleTradesSync(request, env) {
  if (!supabaseConfigured(env)) return tradesPayload(false, [], [], "Secrets Supabase absents");
  const body = await request.json().catch(() => ({}));
  const inputPositions = Array.isArray(body?.positions) ? body.positions : [];
  const inputHistory = Array.isArray(body?.history) ? body.history : [];
  const positions = normalizeTrainingPositions(inputPositions);
  const history = normalizeTrainingTrades(inputHistory);

  if (inputPositions.length) {
    await supabaseFetch(env, `${TRADE_TABLES.positions}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(inputPositions)
    });
  }
  if (inputHistory.filter(isAuthoritativeClosedTradeRow).length) {
    await supabaseFetch(env, `${TRADE_TABLES.trades}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(inputHistory.filter(isAuthoritativeClosedTradeRow))
    });
  }
  return tradesPayload(true, positions, history, "sync_ok");
}

// ============================================================
// SIGNALS
// ============================================================
async function handleSignals(url, env) {
  if (!supabaseConfigured(env)) return fail("Supabase non configure", "error", 503);
  const limit = clamp(Number(url.searchParams.get("limit") || 50), 1, 200);
  const symbol = parseSymbol(url.searchParams.get("symbol") || "");
  const filters = [];
  if (symbol) filters.push(`symbol=eq.${encodeURIComponent(symbol)}`);
  filters.push(`order=created_at.desc`);
  filters.push(`limit=${limit}`);
  const rows = await supabaseFetch(env, `${SIGNAL_TABLE}?${filters.join("&")}`);
  return ok(Array.isArray(rows) ? rows : [], "worker_supabase", nowIso(), "recent", null);
}

// ============================================================
// NEWS (inchangé)
// ============================================================
function decodeHtmlEntities(input) {
  return String(input||"").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#8217;|&#x2019;/gi,"'").replace(/&#8211;|&#x2013;/gi,"-").replace(/&#8212;|&#x2014;/gi,"-");
}
function cleanNewsText(input) {
  return decodeHtmlEntities(String(input||"")).replace(/<[^>]+>/g," ").replace(/\u00a0/g," ").replace(/\s+/g," ").replace(/\s+([,.;:!?])/g,"$1").trim();
}
function stripTags(input) { return cleanNewsText(input); }
function buildGoogleNewsRss(query) { return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`; }
function extractXmlTag(block, tag) {
  const match = String(block||"").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,"i"));
  return match ? stripTags(match[1]) : "";
}
function parseRssItems(xml) {
  const txt = String(xml||"");
  const items = txt.match(/<item\b[\s\S]*?<\/item>/gi)||[];
  return items.map(item=>({ title:extractXmlTag(item,"title"),link:extractXmlTag(item,"link"),pubDate:extractXmlTag(item,"pubDate"),description:extractXmlTag(item,"description"),source:extractXmlTag(item,"source") })).filter(x=>x.title&&x.link);
}
async function fetchRssNewsFeed(url) {
  const res = await fetchWithRetry(url,{headers:{Accept:"application/rss+xml,application/xml,text/xml"}},{timeoutMs:NEWS_FETCH_TIMEOUT_MS,maxRetries:1});
  if(!res.ok) throw new Error(`News feed HTTP ${res.status}`);
  return parseRssItems(await res.text());
}
function absolutizeUrl(url,baseUrl) { try{return new URL(url,baseUrl).toString();}catch{return String(url||"");} }
function parseHtmlAnchors(html,baseUrl,sourceName,includePattern) {
  const links=[...String(html||"").matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const out=[];const seen=new Set();
  for(const match of links){
    const href=absolutizeUrl(match[1],baseUrl);const rawTitle=cleanNewsText(match[2]);
    if(!href||!rawTitle||rawTitle.length<26)continue;
    if(includePattern&&!includePattern.test(href))continue;
    const key=`${rawTitle.toLowerCase()}|${href}`;if(seen.has(key))continue;seen.add(key);
    out.push({title:rawTitle,link:href,pubDate:nowIso(),description:rawTitle,source:sourceName});
  }
  return out;
}
async function fetchHtmlNewsFeed(url,sourceName,includePattern) {
  const res=await fetchWithRetry(url,{headers:{Accept:"text/html,application/xhtml+xml"}},{timeoutMs:NEWS_FETCH_TIMEOUT_MS,maxRetries:1});
  if(!res.ok) throw new Error(`News html HTTP ${res.status}`);
  return parseHtmlAnchors(await res.text(),url,sourceName,includePattern);
}
async function fetchAktionnaireDirectFeed() {
  const url="https://www.aktionnaire.com/";
  const res=await fetchWithRetry(url,{headers:{Accept:"text/html,application/xhtml+xml"}},{timeoutMs:NEWS_FETCH_TIMEOUT_MS,maxRetries:1});
  if(!res.ok) throw new Error(`Aktionnaire HTTP ${res.status}`);
  const page=await res.text();
  const links=[...String(page||"").matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const out=[];const seen=new Set();
  for(const match of links){
    const href=absolutizeUrl(match[1],url);const rawTitle=cleanNewsText(match[2]);
    if(!href||!rawTitle||rawTitle.length<26)continue;
    if(!/aktionnaire\.com/i.test(href))continue;
    if(/\/a-propos|aktionnaireday|campaign-archive|mentions|inscription|newsletter/i.test(href))continue;
    if(/^https:\/\/www\.aktionnaire\.com\/?$/i.test(href))continue;
    const key=`${rawTitle.toLowerCase()}|${href}`;if(seen.has(key))continue;seen.add(key);
    out.push({title:rawTitle,link:href,pubDate:nowIso(),description:rawTitle,source:"L'Actionnaire"});
  }
  return out.slice(0,12);
}
function normalizeNewsSource(raw,link="") {
  const src=String(raw||"").trim().toLowerCase();
  if(src.includes("aktionnaire"))return"L'Actionnaire";if(src.includes("les echos"))return"Les Echos";
  if(src.includes("boursorama"))return"Boursorama";if(src.includes("zonebourse"))return"Zonebourse";
  if(src.includes("reuters"))return"Reuters";if(src.includes("bloomberg"))return"Bloomberg";
  if(src.includes("cnbc"))return"CNBC";
  try{const host=new URL(String(link||"")).hostname.replace(/^www\./,"");
    if(host.includes("aktionnaire"))return"L'Actionnaire";if(host.includes("lesechos"))return"Les Echos";
    if(host.includes("boursorama"))return"Boursorama";if(host.includes("zonebourse"))return"Zonebourse";
    if(host.includes("reuters"))return"Reuters";if(host.includes("bloomberg"))return"Bloomberg";
    if(host.includes("cnbc"))return"CNBC";return host;
  }catch{return raw||"Source";}
}
function detectNewsAssets(text) {
  const t=String(text||"");
  const rules=[{symbol:"AMD",rx:/\bAMD\b|advanced micro devices/i},{symbol:"NVDA",rx:/\bNVDA\b|nvidia/i},{symbol:"MSFT",rx:/\bMSFT\b|microsoft/i},{symbol:"AAPL",rx:/\bAAPL\b|apple/i},{symbol:"BTC",rx:/\bBTC\b|bitcoin/i},{symbol:"ETH",rx:/\bETH\b|ethereum/i},{symbol:"SPY",rx:/\bSPY\b|s&p 500|sp500|wall street/i},{symbol:"QQQ",rx:/\bQQQ\b|nasdaq/i},{symbol:"GLD",rx:/\bGLD\b|\bgold\b/i},{symbol:"TLT",rx:/\bTLT\b|treasury|bond|obligations?/i},{symbol:"V",rx:/\bvisa\b/i},{symbol:"MA",rx:/\bmastercard\b/i}];
  const hits=[];for(const rule of rules)if(rule.rx.test(t))hits.push(rule.symbol);
  return[...new Set(hits)].slice(0,4);
}
function detectNewsTopic(text,source="") {
  const t=`${text} ${source}`.toLowerCase();
  if(/bitcoin|ethereum|crypto|binance|token|blockchain/.test(t))return"crypto";
  if(/fed|bce|ecb|inflation|taux|bond|treasury|dollar|oil|pétrole|petrole|emploi|macro|récession|recession|droit de douane|droits de douane|trump|iran/.test(t))return"macro";
  if(/résultat|resultat|results|earnings|guidance|prévision|prevision|forecast|objectif de cours|recommandation|broker|analyste|buy|sell|upgrade|downgrade/.test(t))return"entreprise";
  if(/ia|ai|semi|semiconductor|nvidia|amd|microsoft|apple|tesla|amazon|meta|alphabet|cloud/.test(t))return"tech";
  return"marche";
}
function detectNewsTone(text) {
  const t=String(text||"").toLowerCase();
  const bull=/(hausse|grimpe|rebond|surperforme|record|croissance|relance|optimisme|bullish|beat|upgrade)/.test(t);
  const bear=/(baisse|chute|pression|ralentissement|repli|warning|risk|bearish|downgrade|miss|crise)/.test(t);
  if(bull&&!bear)return"haussier";if(bear&&!bull)return"baissier";return"mitige";
}
function dedupeNewsItems(items) {
  const seen=new Set();const out=[];
  for(const item of(items||[])){const key=`${String(item.title||"").toLowerCase()}|${String(item.source||"").toLowerCase()}`;if(!item.title||!item.link||seen.has(key))continue;seen.add(key);out.push(item);}
  return out;
}
function normalizeNewsItem(raw,forcedSource=null) {
  const title=cleanNewsText(raw.title||"");const description=cleanNewsText(raw.description||"");const link=String(raw.link||"").trim();const source=normalizeNewsSource(forcedSource||raw.source||"",link);const merged=`${title} ${description} ${source}`.trim();const summary=(description&&description!==title?description:title).slice(0,260).trim();
  return{title,summary,topic:detectNewsTopic(merged,source),tone:detectNewsTone(merged),assets:detectNewsAssets(merged),publishedAt:raw.pubDate?new Date(raw.pubDate).toISOString():nowIso(),category:source.toLowerCase().includes("actionnaire")?"fr-marche":"marche",source,link};
}
function filterTradeRelevantNews(items) {
  return(items||[]).filter(item=>{
    const s=`${item.title} ${item.summary} ${item.source}`.toLowerCase();
    if(!item.title||item.title.length<24||!item.link)return false;
    const mustKeep=/résultat|resultat|results|earnings|guidance|prévision|prevision|forecast|fed|bce|ecb|inflation|taux|bond|treasury|dollar|oil|pétrole|petrole|emploi|macro|récession|recession|amd|nvidia|microsoft|apple|bitcoin|ethereum|crypto|semi|semiconductor|ia|ai|régulation|regulation|sanction|fusion|acquisition|rachat/.test(s);
    const maybeKeep=/marché|marche|bourse|actions|indices|nasdaq|s&p 500|wall street/.test(s);
    if(/assurance vie|credit immobilier|livret a|impot|budget famille|epargne retraite/.test(s))return false;
    if(/people|culture|sport|voyage|maison|lifestyle/.test(s))return false;
    return mustKeep||maybeKeep;
  });
}
function computeNewsPriority(item) {
  const source=String(item?.source||"").toLowerCase();const topic=String(item?.topic||"");let score=0;
  if(source.includes("l'actionnaire"))score+=30;if(source.includes("les echos"))score+=20;if(source.includes("zonebourse"))score+=16;if(source.includes("boursorama"))score+=12;if(source.includes("reuters")||source.includes("bloomberg")||source.includes("cnbc"))score+=10;
  if(topic==="macro")score+=14;if(topic==="tech")score+=10;if(topic==="crypto")score+=8;if(topic==="entreprise")score+=16;
  score+=Math.min(8,(item.assets||[]).length*3);return score;
}
function tradeImpactScore(item) {
  const s=`${item.title} ${item.summary} ${item.source}`.toLowerCase();let score=computeNewsPriority(item);
  if(/résultat|resultat|results|earnings|guidance/.test(s))score+=24;if(/objectif de cours|recommandation|broker|analyste|upgrade|downgrade|buy|sell/.test(s))score+=18;if(/fed|bce|ecb|inflation|taux|bond|treasury|dollar|oil|pétrole|petrole|emploi|macro/.test(s))score+=18;if(/amd|nvidia|microsoft|apple|bitcoin|ethereum|crypto|semi|ia|ai/.test(s))score+=16;if(/régulation|regulation|banque centrale|sanction|fusion|acquisition|rachat/.test(s))score+=12;if(/marché|marche|bourse|indices|nasdaq|s&p 500|wall street/.test(s))score+=6;
  if((item.assets||[]).length>=2)score+=6;if((item.assets||[]).length===0&&(item.topic==="marche"||item.topic==="macro"))score-=8;
  return score;
}
function buildNewsOverview(items) {
  const safeItems=Array.isArray(items)?items:[];const tones={haussier:0,baissier:0,mitige:0};const themeCounts=new Map(),assetCounts=new Map(),sourceCounts=new Map();
  for(const item of safeItems){tones[item.tone]=(tones[item.tone]||0)+1;themeCounts.set(item.topic,(themeCounts.get(item.topic)||0)+1);for(const asset of(item.assets||[]))assetCounts.set(asset,(assetCounts.get(asset)||0)+1);sourceCounts.set(item.source,(sourceCounts.get(item.source)||0)+1);}
  let marketTone="mitige";if((tones.haussier||0)>(tones.baissier||0)+1)marketTone="haussier";if((tones.baissier||0)>(tones.haussier||0)+1)marketTone="baissier";
  const keyThemes=[...themeCounts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).filter(Boolean).slice(0,4);const watchAssets=[...assetCounts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).filter(Boolean).slice(0,5);const sources=[...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).filter(Boolean).slice(0,5);
  const summary=safeItems.length?`Flux news prioritaire FR. Biais ${marketTone}, themes dominants : ${keyThemes.join(", ")||"marche"}, actifs a surveiller : ${watchAssets.join(", ")||"aucun signal fort"}.`:"Aucune news exploitable pour le moment.";
  return{marketTone,summary,keyThemes,watchAssets,sources};
}
function deriveNewsSignalLevel(score){const val=Number(score)||0;if(val>=65)return"fort";if(val>=45)return"catalyseur";if(val>=25)return"utile";return"faible";}
function deriveNewsSignalReason(item){const s=`${item?.title||""} ${item?.summary||""}`.toLowerCase();if(/résultat|resultat|results|earnings|guidance/.test(s))return"resultats ou guidance";if(/objectif de cours|recommandation|broker|analyste|buy|sell|upgrade|downgrade/.test(s))return"recommandation ou objectif";if(/fed|bce|ecb|inflation|taux|bond|treasury|dollar|oil|pétrole|petrole|emploi|macro/.test(s))return"catalyseur macro";if(/amd|nvidia|microsoft|apple|bitcoin|ethereum|crypto|semi|ia|ai/.test(s))return"actif ou theme fort";if(/régulation|regulation|banque centrale|sanction|fusion|acquisition|rachat/.test(s))return"evenement structurant";return"contexte general";}
function enrichNewsItemWithSignal(item){const newsScore=Math.max(0,Math.min(100,Number(item?.priorityScore)||0));return{...item,newsScore,signalLevel:deriveNewsSignalLevel(newsScore),signalReason:deriveNewsSignalReason(item)};}
function buildWatchAssetsDetailed(items){const map=new Map();for(const item of(items||[])){for(const asset of(item.assets||[])){const row=map.get(asset)||{asset,articleCount:0,totalScore:0,tones:new Map(),sources:new Map()};row.articleCount+=1;row.totalScore+=Number(item.newsScore||0);row.tones.set(item.tone||"mitige",(row.tones.get(item.tone||"mitige")||0)+1);row.sources.set(item.source||"Source",(row.sources.get(item.source||"Source")||0)+1);map.set(asset,row);}}return[...map.values()].map(row=>{const avgScore=row.articleCount?Math.round(row.totalScore/row.articleCount):0;const tone=[...row.tones.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"mitige";const sources=[...row.sources.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,3);return{asset:row.asset,articleCount:row.articleCount,newsScore:avgScore,tone,sources,signalLevel:deriveNewsSignalLevel(avgScore)};}).sort((a,b)=>b.newsScore-a.newsScore||b.articleCount-a.articleCount).slice(0,6);}
function buildTopSignals(items){return(items||[]).filter(item=>["catalyseur","fort"].includes(item.signalLevel)).sort((a,b)=>(b.newsScore||0)-(a.newsScore||0)).slice(0,5).map(item=>({title:item.title,source:item.source,topic:item.topic,assets:item.assets||[],newsScore:item.newsScore,signalLevel:item.signalLevel,signalReason:item.signalReason,link:item.link}));}

const NEWS_ASSET_ALIASES = {
  AMD:["amd","advanced micro devices"],AAPL:["aapl","apple","apple inc"],MSFT:["msft","microsoft"],NVDA:["nvda","nvidia"],
  META:["meta","meta platforms","facebook"],GOOGL:["googl","google","alphabet"],AMZN:["amzn","amazon"],TSLA:["tsla","tesla"],
  NFLX:["nflx","netflix"],BTC:["btc","bitcoin"],ETH:["eth","ethereum"],SOL:["sol","solana"],XRP:["xrp","ripple"],
  TLT:["tlt","ishares 20+ year treasury bond etf"],GLD:["gld","spdr gold shares"],SPY:["spy","s&p 500 etf","sp500"],QQQ:["qqq","nasdaq 100 etf","invesco qqq"]
};
function normalizeLooseText(value){return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
function buildNewsAliases(symbol,name){const clean=String(symbol||"").toUpperCase();const base=new Set([normalizeLooseText(clean),normalizeLooseText(name)]);const fromMap=Array.isArray(NEWS_ASSET_ALIASES[clean])?NEWS_ASSET_ALIASES[clean]:[];fromMap.forEach(x=>base.add(normalizeLooseText(x)));String(name||"").split(/\s+/).map(w=>normalizeLooseText(w)).filter(w=>w.length>=4).forEach(w=>base.add(w));return Array.from(base).filter(Boolean);}
function detectAssetsFromNewsText(title,summary="",existingAssets=[]){const hay=normalizeLooseText(`${title||""} ${summary||""}`);const found=new Set((Array.isArray(existingAssets)?existingAssets:[]).map(x=>String(x||"").toUpperCase()).filter(Boolean));for(const[symbol,aliases]of Object.entries(NEWS_ASSET_ALIASES)){const list=[symbol,...(Array.isArray(aliases)?aliases:[])].map(x=>normalizeLooseText(x)).filter(Boolean);for(const alias of list){if(!alias)continue;if(hay.split(" ").includes(alias)||hay.includes(alias)){found.add(symbol);break;}}}return Array.from(found).slice(0,8);}
function enrichNewsItemAssets(item){const assets=detectAssetsFromNewsText(item?.title||"",item?.summary||"",item?.assets||[]);return{...item,assets,watchAssets:assets.slice(0,3),assetMatchReason:assets.length?"text_alias_match":"none"};}
function gatherRelatedNewsForAsset(symbol,name,items){const clean=String(symbol||"").toUpperCase();const aliases=buildNewsAliases(clean,name);const rows=Array.isArray(items)?items:[];const scored=rows.map(item=>{const assets=Array.isArray(item?.assets)?item.assets.map(x=>String(x||"").toUpperCase()):[];const hay=`${normalizeLooseText(item?.title||"")} ${normalizeLooseText(item?.summary||"")} ${normalizeLooseText(item?.source||"")}`;let score=0;if(clean&&assets.includes(clean))score+=10;for(const alias of aliases){if(!alias)continue;if(hay.includes(alias))score+=4;}return{item,score};});return scored.filter(row=>row.score>=4).sort((a,b)=>b.score-a.score).slice(0,6).map(row=>row.item);}
function buildArticleInputsFromNews(items){return(Array.isArray(items)?items:[]).map(item=>({source:item?.source||"",title:item?.title||"",content:item?.summary||""}));}

async function handleNews(env) {
  const cacheKey = "route:news:v8-signal-layer-full:data";
  const cachedPayload = getMemoryCache(cacheKey);
  if (cachedPayload) {
    const payload = cloneJsonPayload(cachedPayload);
    const finalItems = Array.isArray(payload?.items) ? payload.items : [];
    return finalItems.length
      ? ok(payload, "mixed_news_panel", nowIso(), "recent", `${finalItems.items?.length || finalItems.length} news disponibles`)
      : partial(payload, "mixed_news_panel", nowIso(), "unknown", "Aucune news exploitable.");
  }

  const feedCalls = [
    fetchAktionnaireDirectFeed(),
    fetchHtmlNewsFeed("https://www.zonebourse.com/actualite-bourse/","Zonebourse",/zonebourse\.com\/actualite-bourse\//i),
    fetchHtmlNewsFeed("https://www.boursorama.com/bourse/actualites/","Boursorama",/\/bourse\/actualites\//i),
    fetchRssNewsFeed(buildGoogleNewsRss("site:lesechos.fr bourse OR marchés OR actions")).then(items=>items.map(x=>({...x,source:"Les Echos"}))),
    fetchRssNewsFeed(buildGoogleNewsRss("résultats entreprises actions guidance objectif de cours")),
    fetchRssNewsFeed(buildGoogleNewsRss("fed OR bce OR inflation OR taux OR dollar OR pétrole marchés actions")),
    fetchRssNewsFeed(buildGoogleNewsRss("AMD OR NVIDIA OR Microsoft OR Apple IA semi conducteurs actions")),
    fetchRssNewsFeed(buildGoogleNewsRss("bitcoin OR ethereum OR crypto régulation marché"))
  ];

  const settled = await Promise.allSettled(feedCalls);
  let items = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value.map(x => normalizeNewsItem(x, x.source || null)));
    }
  }

  items = dedupeNewsItems(filterTradeRelevantNews(items))
    .map(item => enrichNewsItemAssets({ ...item, priorityScore: tradeImpactScore(item) + (item.source === "L'Actionnaire" ? 8 : 0) }))
    .filter(item => item.priorityScore >= 20)
    .sort((a, b) => b.priorityScore !== a.priorityScore ? b.priorityScore - a.priorityScore : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const caps = { "L'Actionnaire":4,"Les Echos":3,"Zonebourse":3,"Boursorama":1,"Reuters":2,"Bloomberg":2,"CNBC":2 };
  const selected = [];
  const sourceCounts = new Map();
  const topicCounts = new Map();

  for (const item of items) {
    const sourceCount = sourceCounts.get(item.source) || 0;
    const sourceCap = caps[item.source] ?? 2;
    const topicCount = topicCounts.get(item.topic) || 0;
    const topicCap = item.topic === "macro" ? 3 : 4;
    if (sourceCount >= sourceCap || topicCount >= topicCap) continue;
    selected.push(item);
    sourceCounts.set(item.source, sourceCount + 1);
    topicCounts.set(item.topic, topicCount + 1);
    if (selected.length >= 10) break;
  }

  if (!selected.some(x => x.source === "L'Actionnaire")) {
    const candidate = items.find(x => x.source === "L'Actionnaire");
    if (candidate) { if (selected.length >= 10) selected.pop(); selected.unshift(candidate); }
  }

  const finalItems = selected.map(enrichNewsItemWithSignal);
  const overview = buildNewsOverview(finalItems);
  overview.topSignals = buildTopSignals(finalItems);
  overview.watchAssetsDetailed = buildWatchAssetsDetailed(finalItems);

  const payload = {
    overview,
    ai: {
      thesis: overview.summary,
      bullDrivers: finalItems.filter(x => x.tone === "haussier").slice(0, 2).map(x => x.title).join(" | "),
      riskDrivers: finalItems.filter(x => x.tone === "baissier").slice(0, 2).map(x => x.title).join(" | "),
      actionableTakeaway: overview.watchAssetsDetailed.length
        ? `Surveiller ${overview.watchAssetsDetailed.slice(0, 3).map(x => x.asset).join(", ")}.`
        : "Aucun actif prioritaire."
    },
    items: finalItems
  };

  setMemoryCache(cacheKey, TTL.news, cloneJsonPayload(payload));
  if (!finalItems.length) return partial(payload, "mixed_news_panel", nowIso(), "unknown", "Aucune news exploitable.");
  return ok(payload, "mixed_news_panel", nowIso(), "recent", `${finalItems.length} news disponibles`);
}

// ============================================================
// AI CONTEXT REVIEW (inchangé)
// ============================================================
function buildAiContextInput(symbol, payload, newsItems=[], articleContents=[]) {
  const plan = payload?.plan || {};
  return {
    assetContext: { symbol: String(symbol||payload?.symbol||"").toUpperCase(), name: String(payload?.name||""), assetClass: String(payload?.assetClass||"unknown") },
    engineContext: { score: finiteOrNull(payload?.score), decisionScore: finiteOrNull(plan?.decisionScore), safetyScore: finiteOrNull(plan?.safetyScore), actionabilityScore: finiteOrNull(plan?.exploitabilityScore), decision: String(plan?.decision||payload?.decision||""), setupStatus: String(plan?.setupStatus||""), tradeNow: !!plan?.tradeNow, trendLabel: String(plan?.trendLabel||payload?.trendLabel||""), setupType: String(plan?.setupType||payload?.setupType||""), entryQuality: finiteOrNull(plan?.entryQuality??payload?.breakdown?.entryQuality), riskQuality: finiteOrNull(plan?.riskQuality??payload?.breakdown?.risk), confirmationCount: Number.isFinite(Number(plan?.confirmationCount)) ? Number(plan.confirmationCount) : null, blockers: Array.isArray(plan?.blockers)?plan.blockers.slice(0,10):[] },
    newsSources: (Array.isArray(newsItems)?newsItems:[]).slice(0,8).map(item=>({ source:String(item?.source||""), title:String(item?.title||""), url:String(item?.link||item?.url||""), publishedAt:item?.publishedAt||null })),
    articlesContent: (Array.isArray(articleContents)?articleContents:[]).slice(0,8).map(item=>({ source:String(item?.source||""), title:String(item?.title||""), content:String(item?.content||item?.summary||"").slice(0,3500) }))
  };
}

function getAiQuotaBucket() {
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
  const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 0, 0, 5);
  const ttlMs = Math.max(60*1000, nextUtcMidnight - Date.now());
  const cacheKey = `ai:quota:${dayKey}`;
  const current = cloneJsonPayload(getMemoryCache(cacheKey) || { count: 0, symbols: {} });
  return { cacheKey, ttlMs, current };
}
function getAiAllowedSymbols() {
  const rows = Array.isArray(getMemoryCache("route:opportunities:data")) ? getMemoryCache("route:opportunities:data") : [];
  return [...new Set(rows.filter(row=>row&&(row.decision==="Trade propose"||row.decision==="A surveiller")).sort((a,b)=>getComparableOpportunityScore(b)-getComparableOpportunityScore(a)).slice(0,5).map(row=>String(row.symbol||"").toUpperCase()).filter(Boolean))];
}
function reserveAiQuota(symbol) {
  const clean = String(symbol||"").toUpperCase();
  const { cacheKey, ttlMs, current } = getAiQuotaBucket();
  const allowedSymbols = getAiAllowedSymbols();
  if (!clean) return { ok: false, reason: "ai_symbol_missing" };
  if (!allowedSymbols.includes(clean)) return { ok: false, reason: `ai_not_allowed_symbol:${clean}` };
  if (Number(current.count||0) >= AI_DAILY_HARD_LIMIT) return { ok: false, reason: "ai_daily_quota_reached" };
  const lastTs = Number(current.symbols?.[clean]||0);
  if (lastTs > 0 && (Date.now()-lastTs) < AI_SYMBOL_COOLDOWN_MS) return { ok: false, reason: `ai_symbol_cooldown:${clean}` };
  const next = { count: Number(current.count||0)+1, symbols: {...(current.symbols||{}), [clean]: Date.now()} };
  setMemoryCache(cacheKey, ttlMs, next);
  return { ok: true, quota: next.count, allowedSymbols };
}
function validateAiContextPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "not_object" };
  const allowedTone = new Set(["haussier","plutot_haussier","neutre","plutot_baissier","baissier","incertain"]);
  const allowedCatalyst = new Set(["resultats","guidance","macro","taux","regulation","mna","produit","geopolitique","crypto","aucun","incertain"]);
  const allowedSupport = new Set(["soutien_fort","soutien_modere","neutre","contradictoire","fortement_contradictoire","insuffisant"]);
  const allowedQuality = new Set(["haute","correcte","faible","insuffisante"]);
  const clean = {
    asset: String(raw.asset||""), assets_detected: Array.isArray(raw.assets_detected)?raw.assets_detected.map(x=>String(x||"").toUpperCase()).slice(0,10):[],
    topics_detected: Array.isArray(raw.topics_detected)?raw.topics_detected.map(x=>String(x||"")).slice(0,10):[],
    tone: allowedTone.has(raw.tone)?raw.tone:"incertain", catalyst_type: allowedCatalyst.has(raw.catalyst_type)?raw.catalyst_type:"incertain",
    catalyst_strength: [0,1,2,3].includes(Number(raw.catalyst_strength))?Number(raw.catalyst_strength):0,
    contradiction_level: [0,1,2,3].includes(Number(raw.contradiction_level))?Number(raw.contradiction_level):0,
    risk_flags: Array.isArray(raw.risk_flags)?raw.risk_flags.map(x=>String(x||"")).slice(0,10):[],
    support_level: allowedSupport.has(raw.support_level)?raw.support_level:"insuffisant",
    confidence: clamp(Number(raw.confidence||0),0,1), source_count: Math.max(0,Number(raw.source_count||0)),
    source_quality: allowedQuality.has(raw.source_quality)?raw.source_quality:"insuffisante",
    summary_strict: String(raw.summary_strict||"").slice(0,500), insufficiency_flag: !!raw.insufficiency_flag
  };
  return { ok: true, data: clean };
}
async function callAiStrictJson(input, env) {
  const apiKey = String(env?.CLAUDE_API_KEY||"").trim();
  if (!apiKey) return { ok: false, source: "anthropic", error: "missing_api_key" };
  const model = String(env?.ANTHROPIC_MODEL||"claude-sonnet-4-5-20250929").trim();
  const payload = { model, max_tokens: 350, temperature: 0, system: "You are a strict financial context classifier. Return valid JSON only. Never add markdown. Never invent facts. Use only the provided sources and context. If context is insufficient, say so in the JSON.", messages: [{ role: "user", content: typeof input === "string" ? input : JSON.stringify(input) }] };
  let response; let rawText = "";
  try {
    response = await fetchWithRetry("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"content-type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"}, body:JSON.stringify(payload) }, { timeoutMs: 15000, maxRetries: 1 });
    rawText = await response.text();
  } catch (error) { return { ok: false, source: "anthropic", error: "network_error", message: String(error?.message||error||"network_error") }; }
  if (!response.ok) return { ok: false, source: "anthropic", error: `http_${response.status}`, message: rawText.slice(0,400), model };
  let data;
  try { data = JSON.parse(rawText); } catch { return { ok: false, source: "anthropic", error: "invalid_json_response", message: rawText.slice(0,400), model }; }
  const contentItems = Array.isArray(data?.content)?data.content:[];
  const textChunk = contentItems.filter(item=>item&&item.type==="text"&&typeof item.text==="string").map(item=>item.text).join("\n").trim();
  if (!textChunk) return { ok: false, source: "anthropic", error: "empty_text_response", model };
  const fenced = textChunk.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?fenced[1]:textChunk).trim();
  try { return { ok: true, source: "anthropic", model, json: JSON.parse(candidate) }; }
  catch { return { ok: false, source: "anthropic", error: "invalid_json_payload", message: candidate.slice(0,400), model }; }
}
async function maybeRunAiContextReview(input, env) {
  if (!env||!env.CLAUDE_API_KEY) return { ok: false, reason: "ai_not_configured", data: null };
  const sourceCount = Array.isArray(input?.newsSources)?input.newsSources.length:0;
  const articleCount = Array.isArray(input?.articlesContent)?input.articlesContent.filter(x=>String(x?.content||"").trim().length>=40).length:0;
  const score = Number(input?.engineContext?.score??0);
  const decision = String(input?.engineContext?.decision||"");
  const tradeNow = !!input?.engineContext?.tradeNow;
  const symbol = String(input?.assetContext?.symbol||"").toUpperCase();
  const shouldRun = (decision==="Trade propose"&&sourceCount>=1)||(tradeNow&&sourceCount>=1)||(score>=78&&sourceCount>=1)||(decision==="A surveiller"&&sourceCount>=2&&articleCount>=1)||(sourceCount>=3&&articleCount>=1);
  if (!shouldRun) return { ok: false, reason: `ai_not_needed:sources=${sourceCount}:articles=${articleCount}:score=${score}:decision=${decision||"none"}`, data: null };
  const quota = reserveAiQuota(symbol);
  if (!quota.ok) return { ok: false, reason: quota.reason, data: null };
  try {
    const raw = await callAiStrictJson(input, env);
    if (!raw?.ok||!raw?.json) return { ok: false, reason: raw?.error||"ai_failed", data: null };
    const parsed = validateAiContextPayload(raw.json);
    if (!parsed.ok) return { ok: false, reason: parsed.reason||"ai_invalid_json", data: null };
    return { ok: true, reason: null, data: parsed.data };
  } catch (err) { return { ok: false, reason: compactProviderError(err instanceof Error?err.message:"ai_failed"), data: null }; }
}
function computeAiModifier(ai) {
  if (!ai) return { delta: 0, veto: false, reason: null };
  let delta = 0; let veto = false; let reason = null;
  if (ai.insufficiency_flag) return { delta: 0, veto: false, reason: "sources insuffisantes" };
  if (ai.support_level==="soutien_fort") delta+=5; else if(ai.support_level==="soutien_modere") delta+=3; else if(ai.support_level==="contradictoire") delta-=3; else if(ai.support_level==="fortement_contradictoire") delta-=5;
  if (Number(ai.contradiction_level)===3) { veto=true; reason="contradiction forte entre sources et setup"; }
  if (ai.source_quality==="faible") delta-=1; if(ai.source_quality==="insuffisante") delta=Math.min(delta,0);
  delta=clamp(delta,-5,5);
  return { delta, veto, reason };
}
function mergeEngineWithAi(enginePayload, aiReview) {
  const payload = cloneJsonPayload(enginePayload||{});
  const modifier = computeAiModifier(aiReview);
  const baseScore = Number(payload?.score??0);
  const finalScore = clamp(baseScore+modifier.delta, 0, 100);
  const plan = payload?.plan||{};
  const direction = String(plan?.side || payload?.direction || "neutral").toLowerCase();
  let decision = String(plan?.decision||payload?.decision||"Pas de trade");
  if (modifier.veto && decision === "Trade propose") {
    decision = "A surveiller"; plan.tradeNow = false; plan.decision = "A surveiller";
    plan.setupStatus = "A surveiller"; plan.reason = modifier.reason||plan.reason||"Prudence contextuelle";
    plan.aiSummary = "Le contexte informationnel appelle à la prudence.";
  }
  plan.finalScore = finalScore; plan.aiModifier = modifier.delta;
  plan.decisionScore = directionalOpportunityScore(finalScore, direction);
  if (Number.isFinite(Number(plan?.exploitabilityScore))) {
    let safetyScore = computeTradeSafetyScore({
      direction,
      score: finalScore,
      exploitabilityScore: plan.exploitabilityScore,
      entryQuality: Number(payload?.breakdown?.entryQuality ?? 0),
      riskQuality: Number(payload?.breakdown?.risk ?? 0),
      contextQuality: Number(payload?.breakdown?.regime ?? 0),
      dataQuality: Number(payload?.breakdown?.dataQuality ?? 0),
      setupType: plan?.setupType || payload?.setupType || "aucun",
      hardFilters: payload?.hardFilters || { passed: true, flags: [] },
      structured: !!(plan?.setupType && plan.setupType !== "aucun" && plan?.tradeNow)
    });
    if (modifier.veto) safetyScore = clamp(safetyScore - 8, 0, 100);
    else if (modifier.delta < 0) safetyScore = clamp(safetyScore + modifier.delta, 0, 100);
    plan.safetyScore = safetyScore;
    plan.safety = safetyScore >= 76 ? "elevee" : safetyScore >= 60 ? "moyenne" : "faible";
  }
  plan.aiInfluence = modifier.delta>0?"renfort_contexte":modifier.delta<0?"prudence_contexte":"aucune";
  plan.aiVeto = modifier.veto; plan.aiVetoReason = modifier.reason;
  payload.plan = plan; payload.scoreRawEngine = baseScore; payload.scoreFinal = finalScore;
  payload.score = finalScore; payload.aiContextReview = aiReview||null;
  payload.aiModifier = modifier.delta; payload.aiInfluence = plan.aiInfluence;
  payload.aiVeto = modifier.veto; payload.aiVetoReason = modifier.reason; payload.decision = decision;
  payload.officialScore = Number.isFinite(Number(plan?.safetyScore))
    ? Number(plan.safetyScore)
    : (Number.isFinite(Number(plan?.exploitabilityScore)) ? Number(plan.exploitabilityScore) : null);
  payload.officialDecision = decision;
  payload.officialTrendLabel = plan?.trendLabel || payload?.trendLabel || null;
  payload.officialWaitFor = plan?.waitFor || payload?.officialWaitFor || null;
  return payload;
}

// ============================================================
// AUTRES ROUTES
// ============================================================
async function handleFearGreed() { return partial({ value: null, label: null }, "disabled-temporarily", nowIso(), "unknown", "Fear and Greed neutralisé temporairement"); }
async function handleTrending() { return partial([], "disabled-temporarily", nowIso(), "unknown", "Trending neutralisé temporairement"); }
async function handleEconomicCalendar() { return json({ status:"not_configured",source:null,asOf:null,freshness:"unknown",message:"Economic calendar not configured",data:[] }); }
async function handlePortfolioSummary() { return json({ status:"not_configured",source:null,asOf:null,freshness:"unknown",message:"No real portfolio source configured",data:{totalEquity:null,availableCash:null,totalPnl:null,totalPnlPct:null} }); }
async function handlePortfolioPositions() { return json({ status:"not_configured",source:null,asOf:null,freshness:"unknown",message:"No real positions source configured",data:[] }); }

async function handleMarketSnapshot(symbol, env) {
  const clean = parseSymbol(symbol);
  if (!clean) return fail("Invalid symbol", "error", 400);
  const ctx = createBudgetContext("quote");
  try {
    const quote = await resolveUnifiedMarketQuote(clean, env, ctx);
    return attachBudgetHeaders(ok(quote, quote.sourceUsed, nowIso(), quote.freshness, null), ctx);
  } catch (error) {
    return attachBudgetHeaders(fail(compactProviderError(error instanceof Error ? error.message : "unavailable"), "unavailable", 503), ctx);
  }
}

async function handleQuotes(url, env) {
  const singleSymbol = parseSymbol(url.pathname.replace("/api/quotes/", ""));
  if (singleSymbol && url.pathname !== "/api/quotes") {
    try {
      const ctx = createBudgetContext("quotes");
      const item = await resolveUnifiedMarketQuote(singleSymbol, env, ctx);
      return attachBudgetHeaders(ok(item, item.sourceUsed, nowIso(), item.freshness, null), ctx);
    } catch (error) { return fail(compactProviderError(error instanceof Error ? error.message : "unavailable"), "unavailable", 503); }
  }
  const symbolsParam = url.searchParams.get("symbols");
  if (!symbolsParam) return fail("Missing symbols parameter", "error", 400);
  const symbols = symbolsParam.split(",").map(parseSymbol).filter(Boolean);
  if (!symbols.length) return fail("No valid symbols", "error", 400);
  const ctx = createBudgetContext("quotes_batch");
  const items = await Promise.all(symbols.map(async symbol => { try { return await resolveUnifiedMarketQuote(symbol, env, ctx); } catch { return null; } }));
  const valid = items.filter(Boolean);
  if (!valid.length) return fail("No real prices available", "unavailable", 503);
  return attachBudgetHeaders(ok(valid, "unified", nowIso(), "recent", null), ctx);
}

async function handleCandles(symbol, url, env) {
  const clean = parseSymbol(symbol);
  if (!clean) return fail("Invalid symbol", "error", 400);
  const timeframe = url.searchParams.get("timeframe") || "1d";
  const limit = Number(url.searchParams.get("limit") || "90");
  try {
    const ctx = createBudgetContext("candles");
    const candles = await getCandlesBySymbol(clean, timeframe, limit, env, ctx);
    return attachBudgetHeaders(ok(candles, isCrypto(clean) ? "binance" : "twelvedata", nowIso(), "recent", null), ctx);
  } catch (error) { return fail(compactProviderError(error instanceof Error ? error.message : "unavailable"), "unavailable", 503); }
}

async function handleAiTradeReview(request, env) {
  const payload = await request.json().catch(() => null);
  if (!payload) return fail("Invalid AI review payload", "error", 400);
  if (!env.CLAUDE_API_KEY) return ok({ provider: "local_fallback", externalAiUsed: false, decision: "Pas de trade conseille", prudence: "moyenne", reason: "IA externe non configurée.", invalidation: "N/A", summary: "Lecture locale uniquement.", warning: "CLAUDE_API_KEY manquant." }, "local_fallback", nowIso(), "recent", null);
  try {
    const prompt = ["Tu es un filtre prudent pour une app de trading.", "Tu reçois un dossier structuré calculé par un moteur quantitatif.", "Tu dois répondre UNIQUEMENT en JSON valide avec les champs : decision, prudence, reason, invalidation, summary, warning", "decision doit être : Trade conseille, Trade possible, A surveiller, A eviter, Aucun trade conseille", "", "Dossier :", JSON.stringify(payload)].join("\n");
    const body = { model: env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 300, temperature: 0.1, messages: [{ role: "user", content: prompt }] };
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) }, { timeoutMs: 15000, maxRetries: 1 });
    if (!res.ok) return ok({ provider: "local_fallback", externalAiUsed: false, decision: "A surveiller", prudence: "moyenne", reason: "IA externe indisponible.", invalidation: "Attendre signal plus propre.", summary: "Fallback local.", warning: `IA HTTP ${res.status}` }, "local_fallback", nowIso(), "recent", null);
    const jsonResp = await res.json();
    const text = Array.isArray(jsonResp?.content) ? jsonResp.content.map(c => c?.text || "").join("\n") : "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : text).trim();
    try {
      const parsed = JSON.parse(candidate);
      return ok({ provider: "claude_external", externalAiUsed: true, decision: String(parsed.decision || "A surveiller"), prudence: String(parsed.prudence || "moyenne"), reason: String(parsed.reason || ""), invalidation: String(parsed.invalidation || ""), summary: String(parsed.summary || ""), warning: parsed.warning ? String(parsed.warning) : null }, "claude_external", nowIso(), "recent", null);
    } catch { return ok({ provider: "local_fallback", externalAiUsed: false, decision: "A surveiller", prudence: "moyenne", reason: "Réponse IA non exploitable.", invalidation: "N/A", summary: "Fallback local.", warning: null }, "local_fallback", nowIso(), "recent", null); }
  } catch (e) { return ok({ provider: "local_fallback", externalAiUsed: false, decision: "A surveiller", prudence: "moyenne", reason: e.message || "Erreur IA.", invalidation: "N/A", summary: "Fallback local.", warning: e.message }, "local_fallback", nowIso(), "recent", null); }
}

// ============================================================
// ROUTE HEALTH
// ============================================================
async function handleHealth(env) {
  const circuits = {
    twelvedata: circuitStatus("twelvedata"),
    yahoo: circuitStatus("yahoo"),
    supabase: circuitStatus("supabase"),
    binance: circuitStatus("binance")
  };
  const rateWindow = rateLimiter.calls.filter(t => t > Date.now() - rateLimiter.windowMs).length;
  return ok({
    app: "ManiTradePro API V2",
    engineVersion: ENGINE_VERSION,
    engineRuleset: ENGINE_RULESET,
    liveDataOnly: true,
    budgetConfig: { dailyLimit: DAILY_TWELVE_BUDGET, rateLimitPerMinute: rateLimiter.maxPerWindow, callsInLastMinute: rateWindow },
    circuits,
    kvConfigured: true,
    supabaseConfigured: supabaseConfigured(env),
    claudeConfigured: !!env?.CLAUDE_API_KEY,
    twelveKeysConfigured: getTwelveKeys(env).length,
    alphaConfigured: !!env?.ALPHAVANTAGE_KEY,
    panel: { symbols: LIGHT_SYMBOLS.length, proxyRegime: PROXY_REGIME_SYMBOLS },
    strategies: { enabled: ["pullback","breakout","continuation"], disabled: ["mean_reversion"], shorts: false },
    cron: { configured: true, schedule: "*/30 13-20 utc weekdays + 0 */2 off-hours" },
    trainingDefaults: getTrainingDefaults()
  }, "worker-v2", nowIso(), "live", null);
}

// ============================================================
// ROUTER PRINCIPAL
// ============================================================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  // POST routes
  if (request.method === "POST") {
    if (url.pathname === "/api/ai/trade-review") return safeRoute(() => handleAiTradeReview(request, env));
    if (url.pathname === "/api/trades/sync") return safeRoute(() => handleTradesSync(request, env));
    if (url.pathname === "/api/training/settings") return safeRoute(() => handleTrainingSettingsSave(request, env));
    if (url.pathname === "/api/training/auto-cycle") return safeRoute(() => handleTrainingAutoCycle(env));
    return fail("Method not allowed", "error", 405);
  }

  // GET routes
  if (request.method === "GET") {
    if (url.pathname === "/api/trades/state") return safeRoute(() => handleTradesState(env));
    if (url.pathname === "/api/signals" || url.pathname.startsWith("/api/signals/")) return safeRoute(() => handleSignals(url, env));
    if (url.pathname === "/" || url.pathname === "/health") return safeRoute(() => handleHealth(env));
    if (url.pathname === "/api/quotes") return safeRoute(() => handleQuotes(url, env));
    if (url.pathname.startsWith("/api/quotes/")) return safeRoute(() => handleQuotes(url, env));
    if (url.pathname.startsWith("/api/market-snapshot/")) return safeRoute(() => handleMarketSnapshot(decodeURIComponent(url.pathname.replace("/api/market-snapshot/","")), env));
    if (url.pathname.startsWith("/api/candles/")) return safeRoute(() => handleCandles(decodeURIComponent(url.pathname.replace("/api/candles/","")), url, env));
    if (url.pathname === "/api/opportunities") return safeRoute(() => handleOpportunities(url, env));
    if (url.pathname.startsWith("/api/opportunity-detail/")) return safeRoute(() => handleOpportunityDetail(decodeURIComponent(url.pathname.replace("/api/opportunity-detail/","")), env));
    if (url.pathname === "/api/fear-greed") return safeRoute(() => handleFearGreed());
    if (url.pathname === "/api/trending") return safeRoute(() => handleTrending());
    if (url.pathname === "/api/news") return safeRoute(() => handleNews(env));
    if (url.pathname === "/api/economic-calendar") return safeRoute(() => handleEconomicCalendar());
    if (url.pathname === "/api/portfolio/summary") return safeRoute(() => handlePortfolioSummary());
    if (url.pathname === "/api/portfolio/positions") return safeRoute(() => handlePortfolioPositions());
    if (url.pathname === "/api/training/account") return safeRoute(() => handleTrainingAccount(env));
    if (url.pathname === "/api/training/positions") return safeRoute(() => handleTrainingPositions(env));
    if (url.pathname === "/api/training/settings") return safeRoute(() => handleTrainingSettingsGet(env));
    // Route de debug état des circuits
    if (url.pathname === "/api/debug/circuits") return json({
      circuits: { twelvedata: circuitStatus("twelvedata"), yahoo: circuitStatus("yahoo"), supabase: circuitStatus("supabase"), binance: circuitStatus("binance") },
      rateLimiter: { callsInLastMinute: rateLimiter.calls.filter(t => t > Date.now() - rateLimiter.windowMs).length, maxPerWindow: rateLimiter.maxPerWindow }
    });
    return fail("Route not found", "error", 404);
  }

  return fail("Method not allowed", "error", 405);
}

// ============================================================
// EXPORT PRINCIPAL — fetch + scheduled
// ============================================================
export default {
  async fetch(request, env) {
    try { return await handleRequest(request, env); }
    catch (error) { return fail(safeErrorMessage(error), "error", 500); }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledCycle(env));
  }
};
