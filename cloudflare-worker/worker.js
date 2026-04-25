// ============================================================
// ManiTradePro Worker — V2
// Bloc 1 : Infrastructure KV + Cron
// Bloc 2 : Contrôle total des appels
// Bloc 3 : Cache optimisé
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Admin-Token",
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://emmanueldelasse-droid.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

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
  // Actions Europe — rééquilibre les heures de scan (ouvre 07-15h UTC été,
  // comble le trou US-fermé du matin à Paris).
  "ASML", "AIR", "LVMH", "TTE", "SAP", "NESN", "RMS", "SIE",
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
  LVMH:"LVMH", TTE:"TotalEnergies", SAP:"SAP", NESN:"Nestlé",
  RMS:"Hermès", SIE:"Siemens",
  EURUSD:"EUR/USD",GBPUSD:"GBP/USD",USDJPY:"USD/JPY",
  GOLD:"Gold",SILVER:"Silver",OIL:"Crude Oil"
};

// ============================================================
// USER ASSETS — actifs personnalisés stockés en Supabase
// ============================================================
const USER_ASSETS_TABLE = "mtp_user_assets";
const USER_ASSETS_MAX = 50;
let _userAssetsCache = { at: 0, data: [] };
const USER_ASSETS_CACHE_MS = 60 * 1000;

async function getUserAssetsCached(env) {
  const now = Date.now();
  if (now - _userAssetsCache.at < USER_ASSETS_CACHE_MS) return _userAssetsCache.data;
  if (!supabaseConfigured(env)) { _userAssetsCache = { at: now, data: [] }; return []; }
  try {
    const rows = await supabaseFetch(env, `${USER_ASSETS_TABLE}?select=symbol,name,asset_class,enabled,provider_used&order=created_at.desc`);
    const data = Array.isArray(rows) ? rows : [];
    _userAssetsCache = { at: now, data };
    return data;
  } catch {
    _userAssetsCache = { at: now, data: [] };
    return [];
  }
}

function invalidateUserAssetsCache() { _userAssetsCache = { at: 0, data: [] }; }

async function getDynamicSymbols(env) {
  const custom = await getUserAssetsCached(env);
  const enabled = custom.filter(a => a.enabled !== false).map(a => String(a.symbol || "").toUpperCase()).filter(Boolean);
  return [...new Set([...LIGHT_SYMBOLS, ...enabled])];
}

async function getDynamicCryptoSet(env) {
  const custom = await getUserAssetsCached(env);
  const extra = custom.filter(a => a.enabled !== false && a.asset_class === "crypto").map(a => String(a.symbol || "").toUpperCase());
  return new Set([...CRYPTO_SYMBOLS, ...extra]);
}

async function getDynamicNameMap(env) {
  const custom = await getUserAssetsCached(env);
  const extra = {};
  for (const a of custom) {
    if (a.symbol && a.name) extra[String(a.symbol).toUpperCase()] = String(a.name);
  }
  return { ...NAME_MAP, ...extra };
}

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
const FOREX_SYMBOLS_SET = new Set(["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD"]);
const COMMODITY_SYMBOLS_SET = new Set(["GOLD","SILVER","OIL"]);
const ETF_SYMBOLS_SET = new Set(["SPY","QQQ","GLD","TLT"]);

function isCrypto(symbol) { return CRYPTO_SYMBOLS.has(symbol); }
function isForex(symbol) { return FOREX_SYMBOLS_SET.has(symbol); }
function isCommodity(symbol) { return COMMODITY_SYMBOLS_SET.has(symbol); }
function isEtf(symbol) { return ETF_SYMBOLS_SET.has(symbol); }

// Enrichit les sets avec les user assets stockés en Supabase
async function refreshDynamicAssetSets(env) {
  try {
    const custom = await getUserAssetsCached(env);
    for (const a of custom) {
      if (a.enabled === false) continue;
      const s = String(a.symbol || "").toUpperCase();
      if (!s) continue;
      if (a.asset_class === "crypto") CRYPTO_SYMBOLS.add(s);
      else if (a.asset_class === "forex") FOREX_SYMBOLS_SET.add(s);
      else if (a.asset_class === "commodity") COMMODITY_SYMBOLS_SET.add(s);
      else if (a.asset_class === "etf") ETF_SYMBOLS_SET.add(s);
      if (a.name) NAME_MAP[s] = String(a.name);
    }
  } catch {}
}
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

function requestOrigin(request) {
  try { return String(request?.headers?.get("Origin") || "").trim(); }
  catch { return ""; }
}

function getAllowedOrigins(env) {
  const configured = String(env?.ALLOWED_ORIGINS || env?.PUBLIC_APP_ORIGINS || "")
    .split(",")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return [...new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS)];
}

function adminApiToken(env) {
  return String(env?.ADMIN_API_TOKEN || env?.MTP_ADMIN_TOKEN || "").trim();
}

function adminPin(env) {
  return String(env?.ADMIN_PIN || adminApiToken(env) || "").trim();
}

function hasConfiguredAdminToken(env) {
  return !!adminApiToken(env);
}

// Session token helpers — HMAC-SHA256 signé avec ADMIN_API_TOKEN
async function createSessionToken(secret, validHours = 24) {
  const exp = Math.floor(Date.now() / 1000) + validHours * 3600;
  const payload = btoa(JSON.stringify({ exp }));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

async function verifySessionToken(token, secret) {
  try {
    const dot = token.indexOf(".");
    if (dot < 0) return false;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const { exp } = JSON.parse(atob(payload));
    if (!exp || Math.floor(Date.now() / 1000) > exp) return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch { return false; }
}

function requestHasAllowedOrigin(request, env) {
  const origin = requestOrigin(request);
  if (!origin) return false;
  return getAllowedOrigins(env).includes(origin);
}

async function requestHasAdminAccess(request, env) {
  const secret = adminApiToken(env);
  if (!secret) return false;
  const bearer = String(request?.headers?.get("Authorization") || "").trim();
  const explicit = String(request?.headers?.get("X-Admin-Token") || request?.headers?.get("x-admin-token") || "").trim();
  const fromBearer = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  const candidate = explicit || fromBearer;
  if (!candidate) return false;
  if (candidate === secret) return true;
  return verifySessionToken(candidate, secret);
}

async function requestHasFrontAccess(request, env) {
  if (await requestHasAdminAccess(request, env)) return true;
  if (hasConfiguredAdminToken(env)) return false;
  return requestHasAllowedOrigin(request, env);
}

async function requireFrontAccess(request, env) {
  if (await requestHasFrontAccess(request, env)) return null;
  const message = hasConfiguredAdminToken(env)
    ? "Admin token required"
    : "Allowed app origin required";
  return fail(message, "forbidden", 403);
}

async function requireAdminAccess(request, env) {
  if (await requestHasAdminAccess(request, env)) return null;
  const message = hasConfiguredAdminToken(env)
    ? "Admin token required"
    : "Admin token not configured on worker";
  return fail(message, "forbidden", 403);
}

async function handleSessionLogin(request, env) {
  const pin = adminPin(env);
  const secret = adminApiToken(env);
  if (!pin || !secret) return fail("Session auth non configuree sur le worker", "error", 503);
  let body = {};
  try { body = await request.json(); } catch { /* ignore */ }
  const candidate = String(body?.pin || "").trim();
  if (!candidate || candidate !== pin) return fail("PIN invalide", "forbidden", 403);
  const token = await createSessionToken(secret, 24);
  return json({ token, expiresIn: 86400 });
}

function corsHeadersFor(request, env) {
  const allowed = getAllowedOrigins(env);
  const origin = requestOrigin(request);
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || "https://emmanueldelasse-droid.github.io");
  return {
    ...CORS_HEADERS,
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Admin-Token",
    "Vary": "Origin"
  };
}

function withCors(request, env, response) {
  if (!(response instanceof Response)) return response;
  const headers = new Headers(response.headers);
  Object.entries(corsHeadersFor(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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
    // Actions Europe — suffixes de bourse natifs Twelve Data
    LVMH:"LVMH.PA", TTE:"TTE.PA", RMS:"RMS.PA",
    SAP:"SAP.DE", SIE:"SIE.DE",
    NESN:"NESN.SW",
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
  const swingLow20  = Math.min(...recent20.map(c => Number(c.low)).filter(Number.isFinite));
  const swingHigh10 = Math.max(...recent10.map(c => Number(c.high)).filter(Number.isFinite));
  const low5j       = Math.min(...recent5.map(c => Number(c.low)).filter(Number.isFinite));
  const high5j      = Math.max(...recent5.map(c => Number(c.high)).filter(Number.isFinite));
  const avgVol20    = recent20.reduce((s, c) => s + (Number(c.volume) || 0), 0) / 20;
  const lastVol     = Number(candles[candles.length - 1]?.volume || 0);
  const atr         = averageRange(candles, 14);

  const levels = { ema20, ema50, swingHigh20, swingLow10, swingLow20, swingHigh10, low5j, high5j, atr, distEma20 };

  // ==== LONG SETUPS ====

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

  // ==== SHORT SETUPS (miroirs exacts) ====

  // PULLBACK_SHORT — rebond sur EMA20 dans tendance baissière
  if (
    ema20 < ema50 &&
    distEma20 != null && distEma20 >= -2 && distEma20 <= 1 &&
    rsi14 != null && rsi14 >= 42 && rsi14 <= 58 &&
    chg5 != null && chg5 > 0 &&
    chg20 != null && chg20 < 0
  ) return { config: "PULLBACK_SHORT", reason: "Rebond sur EMA20 dans tendance baissière", levels };

  // BREAKDOWN — cassure support avec volume (miroir BREAKOUT)
  if (
    Number.isFinite(swingLow20) && last < swingLow20 * 0.995 &&
    (avgVol20 === 0 || lastVol > avgVol20 * 1.2) &&
    rsi14 != null && rsi14 >= 28 && rsi14 <= 48 &&
    ema20 < ema50
  ) return { config: "BREAKDOWN", reason: "Cassure support 20j avec volume", levels };

  // CONTINUATION_SHORT — tendance baissière propre, zone de continuation
  if (
    ema20 < ema50 &&
    distEma20 != null && distEma20 >= -6 && distEma20 <= -2 &&
    rsi14 != null && rsi14 >= 35 && rsi14 <= 48 &&
    chg5 != null && chg5 < 0
  ) return { config: "CONTINUATION_SHORT", reason: "Tendance baissière propre, prix en zone de continuation", levels };

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
    // ==== LONG ====
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
    },
    // ==== SHORT (miroirs — régimes inversés) ====
    PULLBACK_SHORT: {
      RISK_ON:  { valid: isCryptoAsset, scoreMalus: 0, reason: isCryptoAsset ? "Crypto analysée indépendamment" : "Pullback short bloqué en Risk-On" },
      RANGE:    { valid: true,  scoreMalus: 8,  reason: "Pullback short en marché range — prudence" },
      RISK_OFF: { valid: true,  scoreMalus: 0,  reason: "Pullback short validé en Risk-Off" }
    },
    BREAKDOWN: {
      RISK_ON:  { valid: false, scoreMalus: 0,  reason: "Breakdown bloqué en Risk-On" },
      RANGE:    { valid: false, scoreMalus: 0,  reason: "Breakdown en range — faux signal probable" },
      RISK_OFF: { valid: true,  scoreMalus: 0,  reason: "Breakdown validé en Risk-Off" }
    },
    CONTINUATION_SHORT: {
      RISK_ON:  { valid: false, scoreMalus: 0,  reason: "Continuation short bloquée en Risk-On" },
      RANGE:    { valid: false, scoreMalus: 0,  reason: "Continuation short bloquée en range" },
      RISK_OFF: { valid: true,  scoreMalus: 4,  reason: "Continuation short — entrée moins propre qu'un pullback" }
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
  const { ema20, swingHigh20, swingLow10, swingLow20, swingHigh10, atr } = levels;
  const price = Number(quote?.price);

  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(ema20)) return null;

  let entry, sl, tp, horizon, setupType, side;

  if (config === "PULLBACK") {
    entry     = ema20;
    sl        = Number.isFinite(swingLow10) ? swingLow10 - (atr ? atr * 0.1 : price * 0.005) : price * 0.95;
    tp        = Number.isFinite(swingHigh20) ? swingHigh20 : price * 1.07;
    horizon   = "5-10 jours";
    setupType = "pullback";
    side      = "long";
  } else if (config === "BREAKOUT") {
    entry     = price;
    sl        = Number.isFinite(swingHigh20) ? swingHigh20 * 0.998 : price * 0.96;
    tp        = entry + (entry - sl) * 2.0;
    horizon   = "3-7 jours";
    setupType = "breakout";
    side      = "long";
  } else if (config === "CONTINUATION") {
    entry     = price;
    sl        = ema20 * 0.99;
    tp        = entry + (entry - sl) * 2.2;
    horizon   = "7-14 jours";
    setupType = "continuation";
    side      = "long";
  } else if (config === "PULLBACK_SHORT") {
    // Miroir de PULLBACK : on vend le rebond sur EMA20 dans un downtrend.
    entry     = ema20;
    sl        = Number.isFinite(swingHigh10) ? swingHigh10 + (atr ? atr * 0.1 : price * 0.005) : price * 1.05;
    tp        = Number.isFinite(swingLow20) ? swingLow20 : price * 0.93;
    horizon   = "5-10 jours";
    setupType = "pullback_short";
    side      = "short";
  } else if (config === "BREAKDOWN") {
    // Miroir de BREAKOUT : cassure support avec volume, on shorte.
    entry     = price;
    sl        = Number.isFinite(swingLow20) ? swingLow20 * 1.002 : price * 1.04;
    tp        = entry - (sl - entry) * 2.0;
    horizon   = "3-7 jours";
    setupType = "breakdown";
    side      = "short";
  } else if (config === "CONTINUATION_SHORT") {
    // Miroir de CONTINUATION : tendance baissière propre, on shorte la continuation.
    entry     = price;
    sl        = ema20 * 1.01;
    tp        = entry - (sl - entry) * 2.2;
    horizon   = "7-14 jours";
    setupType = "continuation_short";
    side      = "short";
  } else {
    return null;
  }

  // Vérifications de cohérence (le sens des inégalités dépend de la direction).
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) return null;
  if (sl <= 0 || tp <= 0 || entry <= 0) return null;

  let rr, slPct, tpPct;

  if (side === "long") {
    if (entry <= sl) return null;   // stop doit être sous l'entrée
    if (tp <= entry) return null;   // objectif doit être au-dessus
    rr    = (tp - entry) / (entry - sl);
    slPct = ((entry - sl) / entry) * 100;
    tpPct = ((tp - entry) / entry) * 100;
  } else {
    if (sl <= entry) return null;   // stop doit être au-dessus de l'entrée (short)
    if (entry <= tp) return null;   // objectif doit être en-dessous (short)
    rr    = (entry - tp) / (sl - entry);
    slPct = ((sl - entry) / entry) * 100;
    tpPct = ((entry - tp) / entry) * 100;
  }

  if (rr < 1.6) return null; // ratio minimum strict, identique long/short

  return {
    setupType,
    entry:      Math.round(entry * 1000) / 1000,
    stopLoss:   Math.round(sl * 1000) / 1000,
    takeProfit: Math.round(tp * 1000) / 1000,
    rr:         Math.round(rr * 100) / 100,
    slPct:      Math.round(slPct * 100) / 100,
    tpPct:      Math.round(tpPct * 100) / 100,
    horizon,
    side,
    reason:     detected.reason,
    regimeValidation: validation.reason,
    tradeNow:   true,
    decision:   "Trade propose"
  };
}

// ============================================================
// SCORE ENGINE V2
// ============================================================
function calcDetailScore(quote, candles, regime = null, env = null, regimeIndicators = null, newsContext = null, claudeNewsMaxWeight = 8) {
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
  if (direction === "short" && structure <= 40 && momentum <= 40) raw += 4;
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

  // Modulateur régime via Fear & Greed (crypto) ou VIX (actions) — PR #2 Phase 1.
  // Bonus shorts en peur/stress extrême, bonus longs en euphorie. Cap ±5 pts.
  let regimeBonus = 0;
  let regimeBonusReason = null;
  if (regimeIndicators) {
    const isCrypto = quote.assetClass === "crypto";
    if (isCrypto && Number.isFinite(regimeIndicators.fearGreed)) {
      const fg = regimeIndicators.fearGreed;
      if (fg <= 25) {
        if (direction === "short") { regimeBonus = 5; regimeBonusReason = `F&G ${fg} (peur extrême) — short favorisé`; }
        else if (direction === "long") { regimeBonus = -5; regimeBonusReason = `F&G ${fg} (peur extrême) — long risqué`; }
      } else if (fg >= 75) {
        if (direction === "long") { regimeBonus = 5; regimeBonusReason = `F&G ${fg} (euphorie) — long favorisé`; }
        else if (direction === "short") { regimeBonus = -5; regimeBonusReason = `F&G ${fg} (euphorie) — short risqué`; }
      }
    } else if (!isCrypto && Number.isFinite(regimeIndicators.vix)) {
      const vix = regimeIndicators.vix;
      if (vix > 25) {
        if (direction === "short") { regimeBonus = 5; regimeBonusReason = `VIX ${vix.toFixed(1)} (stress) — short favorisé`; }
        else if (direction === "long") { regimeBonus = -5; regimeBonusReason = `VIX ${vix.toFixed(1)} (stress) — long risqué`; }
      } else if (vix < 12) {
        if (direction === "long") { regimeBonus = -3; regimeBonusReason = `VIX ${vix.toFixed(1)} (complacence) — prudence long`; }
      }
    }
  }

  // Modulateur news — PR #7 Phase 2 (Règle #5 niveau 2+3). Cap ±10 dans applyNewsModulator.
  const newsMod = applyNewsModulator(newsContext, direction, claudeNewsMaxWeight);
  const newsBonus = newsMod.newsBonus;
  const newsBonusReason = newsMod.newsBonusReason;

  const score = clamp(Math.round(raw) - regimeMalus + regimeBonus + newsBonus, 0, 100);

  // Bonus de configuration détectée (long + miroirs short)
  let configBonus = 0;
  if (detectedConfig.config === "PULLBACK" || detectedConfig.config === "PULLBACK_SHORT") configBonus = 6;
  if (detectedConfig.config === "BREAKOUT" || detectedConfig.config === "BREAKDOWN") configBonus = 8;
  if (detectedConfig.config === "CONTINUATION" || detectedConfig.config === "CONTINUATION_SHORT") configBonus = 3;

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
    regimeBonus,
    regimeBonusReason,
    newsBonus,
    newsBonusReason,
    newsContext: newsContext ? {
      source: newsContext.source,
      sentiment: newsContext.sentiment,
      classification: newsContext.classification,
      articleCount: newsContext.articleCount,
      topHeadline: newsContext.topHeadline,
      claudeSignal: newsContext.claudeSignal || null
    } : null,
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
      waitFor: structuredDecision === "Trade propose"
        ? "rien de special"
        : structuredDecision === "A surveiller"
          ? "validation d execution"
          : "contexte plus propre",
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
    regime: regime ? { regime: regime.regime, reason: regime.reason } : null,
    // PR #7 Phase 2 — propage le context news jusqu'au snapshot d'analyse
    newsContext: scored?.newsContext || null,
    newsBonus: scored?.newsBonus ?? 0,
    newsBonusReason: scored?.newsBonusReason || null,
    regimeBonus: scored?.regimeBonus ?? 0,
    regimeBonusReason: scored?.regimeBonusReason || null
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
    const regimeIndicators = await fetchRegimeIndicators(env);
    // PR #7 Phase 2 — news context best-effort (null si source indispo)
    let newsContext = await resolveSymbolNewsContext(env, clean, quote?.assetClass).catch(() => null);
    if (newsContext) newsContext = await enrichNewsContextWithClaude(env, newsContext).catch(() => newsContext);
    const claudeWeight = await getClaudeNewsKillSwitchWeight(env).catch(() => 8);
    const scored = calcDetailScore(quote, candles || [], regime, env, regimeIndicators, newsContext, claudeWeight);
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
// RISK STATE TRAINING
// ============================================================
function startOfUtcDayIso(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function startOfUtcWeekIso(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday, 0, 0, 0, 0));
  return monday.toISOString();
}

function closedTradeTimestampMs(row) {
  const value = row?.closed_at || row?.closedAt || row?.closed_execution?.closedAt || null;
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function closedTradePnl(row) {
  const value = Number(row?.pnl ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function buildTrainingRiskState(settings, openRows, closedRows) {
  const safeSettings = settings || getTrainingDefaults();
  const openList = Array.isArray(openRows) ? openRows : [];
  const closedList = Array.isArray(closedRows) ? closedRows : [];
  const now = new Date();
  const dayStartMs = new Date(startOfUtcDayIso(now)).getTime();
  const weekStartMs = new Date(startOfUtcWeekIso(now)).getTime();

  const dayTrades = closedList.filter((row) => closedTradeTimestampMs(row) >= dayStartMs);
  const weekTrades = closedList.filter((row) => closedTradeTimestampMs(row) >= weekStartMs);

  const dayPnl = dayTrades.reduce((sum, row) => sum + closedTradePnl(row), 0);
  const weekPnl = weekTrades.reduce((sum, row) => sum + closedTradePnl(row), 0);

  const orderedClosed = closedList
    .slice()
    .sort((a, b) => closedTradeTimestampMs(b) - closedTradeTimestampMs(a));

  let currentLossStreak = 0;
  for (const trade of orderedClosed) {
    if (closedTradePnl(trade) < 0) currentLossStreak += 1;
    else break;
  }

  const capitalBase = Math.max(0, Number(safeSettings.capital_base || 0));
  const maxDailyLossPct = Math.max(0, Number(safeSettings.max_daily_loss_pct || 0.03));
  const maxWeeklyLossPct = Math.max(0, Number(safeSettings.max_weekly_loss_pct || 0.06));
  const maxLossStreak = Math.max(0, Number(safeSettings.max_consecutive_losses || 3));

  const maxDailyLossValue = capitalBase * maxDailyLossPct;
  const maxWeeklyLossValue = capitalBase * maxWeeklyLossPct;

  const dayBlocked = maxDailyLossValue > 0 && dayPnl <= -maxDailyLossValue;
  const weekBlocked = maxWeeklyLossValue > 0 && weekPnl <= -maxWeeklyLossValue;
  const streakBlocked = maxLossStreak > 0 && currentLossStreak >= maxLossStreak;

  const blockers = [];
  if (dayBlocked) blockers.push("daily_loss_limit_reached");
  if (weekBlocked) blockers.push("weekly_loss_limit_reached");
  if (streakBlocked) blockers.push("loss_streak_limit_reached");

  return {
    tradingEnabled: !blockers.length,
    blockers,
    openPositionsCount: openList.length,
    closedTradesCount: closedList.length,
    currentLossStreak,
    limits: {
      capitalBase,
      maxDailyLossPct,
      maxWeeklyLossPct,
      maxConsecutiveLosses: maxLossStreak,
      maxDailyLossValue,
      maxWeeklyLossValue
    },
    day: {
      startAt: startOfUtcDayIso(now),
      closedTrades: dayTrades.length,
      pnl: dayPnl,
      pnlPct: capitalBase > 0 ? (dayPnl / capitalBase) * 100 : null,
      blocked: dayBlocked
    },
    week: {
      startAt: startOfUtcWeekIso(now),
      closedTrades: weekTrades.length,
      pnl: weekPnl,
      pnlPct: capitalBase > 0 ? (weekPnl / capitalBase) * 100 : null,
      blocked: weekBlocked
    },
    updatedAt: nowIso()
  };
}

function riskStateBlockerMessage(flag) {
  if (flag === "daily_loss_limit_reached") return "Perte jour maximale atteinte";
  if (flag === "weekly_loss_limit_reached") return "Perte semaine maximale atteinte";
  if (flag === "loss_streak_limit_reached") return "Serie de pertes maximale atteinte";
  return String(flag || "Blocage risque actif");
}

// ============================================================
// HANDLE OPPORTUNITIES — avec régime global
// ============================================================
async function handleOpportunities(_url, env) {
  // Enrichit les sets (CRYPTO_SYMBOLS, NAME_MAP, etc.) avec les actifs Supabase
  await refreshDynamicAssetSets(env);
  const allSymbols = await getDynamicSymbols(env);

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
  const nonCryptoSymbols = allSymbols.filter(s => !isCrypto(s));
  const cryptoSymbols = allSymbols.filter(s => isCrypto(s));
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
  // Pré-fetch des indicateurs régime (F&G + VIX) — cache mémoire 5 min,
  // donc 0 coût pour les appels suivants dans la boucle.
  const regimeIndicators = await fetchRegimeIndicators(env);
  // PR #7 Phase 2 — pré-fetch le tier Claude (cache 1 h, 1 query Supabase).
  const claudeWeight = await getClaudeNewsKillSwitchWeight(env).catch(() => 8);
  const rows = [];
  for (const symbol of allSymbols) {
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
      // PR #7 Phase 2 — news context (cache 3h crypto / 6h stocks, coût quota sous contrôle)
      let newsContext = await resolveSymbolNewsContext(env, symbol, quote?.assetClass).catch(() => null);
      if (newsContext) newsContext = await enrichNewsContextWithClaude(env, newsContext).catch(() => newsContext);
      const scored = calcDetailScore(quote, candles || [], regime, env, regimeIndicators, newsContext, claudeWeight);
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
async function handleOpportunityDetail(symbol, env, url = null) {
  const clean = parseSymbol(symbol);
  if (!clean) return fail("Invalid symbol", "error", 400);

  const detailTtl = isCrypto(clean) ? TTL.detailCrypto : TTL.detailNonCrypto;
  const cacheKey = `route:detail:data:${clean}`;
  const forceFresh = url?.searchParams?.get("fresh") === "1";

  if (forceFresh) {
    memoryCache.delete(cacheKey);
    memoryCache.delete(`quote:binance:${clean}`);
    memoryCache.delete(`quote:twelve:${clean}`);
    memoryCache.delete(`quote:alpha:${clean}`);
    memoryCache.delete(`market:snapshot:${clean}`);
  }

  const cachedPayload = forceFresh ? null : getMemoryCache(cacheKey);
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
    is_enabled: false,               // master switch — user toggle
    auto_open_enabled: true,
    auto_close_enabled: true,
    allow_long: true,
    allow_short: true,               // mode permissif : short autorisé
    max_open_positions: 15,          // plus large pour entraînement
    max_positions_per_symbol: 1,
    min_actionability_score: 60,     // seuil relâché : plus de candidats
    min_dossier_score: 60,           // idem
    capital_base: 10000,
    risk_per_trade_pct: 0.02,
    allocation_per_trade_pct: 0.08,  // 8% par trade (avec plus de positions)
    max_holding_hours: 240,
    allowed_symbols: [],
    allowed_setups: ["pullback", "breakout", "continuation", "pullback_short", "breakdown", "continuation_short", "mean_reversion"],
    mean_reversion_enabled: true,    // setup activé en entraînement
    max_daily_loss_pct: 0.30,        // garde-fou jour uniquement (30%)
    max_weekly_loss_pct: 1.0,        // désactivé (100%)
    max_consecutive_losses: 999,     // désactivé
    last_cycle_at: null,             // PR #1 Phase 1 — traçabilité cron scheduled
    last_cycle_mode: null,           // "crypto-only" | "crypto+actions" | "skipped-*"
    last_cycle_summary: null         // {closed, opened, errors, duration_ms}
  };
}

function isTrainingCandidateAllowed(row, settings, openRows, riskState = null, newsWindow = null, activeAdjustments = null) {
  if (!row || row.status !== "ok") return false;
  if (row.decision !== "Trade propose") return false;
  if (!row.plan?.tradeNow) return false;
  if (riskState && riskState.tradingEnabled === false) return false;

  // News garde-fou (PR #3 Phase 1) : blocage dans la fenêtre ±30 min d'un event high-impact.
  // Le newsWindow est pré-fetché en amont du cycle training pour éviter un appel par candidat.
  if (newsWindow && newsWindow.blocked) return false;

  // Setup autorisé ?
  const setupType = String(row.plan?.setupType || row.setupType || "").toLowerCase();
  const allowedSetups = Array.isArray(settings.allowed_setups) ? settings.allowed_setups : ["pullback","breakout","continuation"];
  if (setupType && setupType !== "aucun" && !allowedSetups.includes(setupType)) return false;

  // Mean reversion bloquée
  if (setupType === "mean_reversion" && !settings.mean_reversion_enabled) return false;

  // PR #6 Phase 2 — bucket_key du candidat
  const side = String(row.plan?.side || row.direction || "long").toLowerCase();
  const regime = normalizeRegimeLabel(row.plan?.regime || row.regime || "UNKNOWN");
  const assetClass = row.assetClass || row.asset_class || getAssetClass(parseSymbol(row.symbol || ""));
  const bucketKey = makeBucketKey(setupType || "unknown", side, regime, assetClass);

  // Règle 2 — bucket désactivé par ajustement actif ?
  if (activeAdjustments?.disabledBuckets?.has(bucketKey)) return false;

  // Scores (avec boost éventuel de règle 1)
  const scoreBoost = activeAdjustments?.minScoreBoosts?.get(bucketKey) || 0;
  const minActionability = Number(settings.min_actionability_score || 72) + scoreBoost;
  const minDecision = Number(settings.min_dossier_score || 74) + scoreBoost;
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
    interrupted: false,
    riskState: null
  };

  if (!settings.is_enabled) {
    return partial(log, "worker_training", nowIso(), "recent", "training_auto_disabled");
  }

  try {
    const rawOpen = await withTimeout(getOpenTrainingPositionsRaw(env), 8000, "get_open_positions");
    let openRows = Array.isArray(rawOpen) ? rawOpen : [];
    let closedRows = await withTimeout(getClosedTrainingTradesRaw(env, 500), 8000, "get_closed_trades");
    let riskState = buildTrainingRiskState(settings, openRows, closedRows);
    log.riskState = riskState;

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

          // PR #5 Phase 2 — tracker MAE/MFE en continu, même si pas de clôture ce cycle
          const excursion = updatePositionIntraExcursion(position, liveQuote?.price ?? null);
          if (excursion.changed) {
            await persistPositionIntraExcursion(env, position, excursion);
          }

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
        closedRows = await withTimeout(getClosedTrainingTradesRaw(env, 500), 8000, "refresh_closed_trades");
        riskState = buildTrainingRiskState(settings, openRows, closedRows);
        log.riskState = riskState;
      } catch {}
    }

    // PHASE OUVERTURE — chaque position indépendante
    if (settings.auto_open_enabled && openRows.length < Number(settings.max_open_positions || 10)) {
      if (riskState && !riskState.tradingEnabled) {
        log.skipped.push({ reason: riskState.blockers.map(riskStateBlockerMessage).join(" · ") || "Blocage risque actif" });
      } else {
        // News garde-fou PR #3 : pré-fetch la fenêtre d'événements une seule fois.
        const newsWindow = await getNewsWindowForCycle(env).catch(() => ({ blocked: false }));
        if (newsWindow.blocked) {
          log.skipped.push({ reason: `news_window: ${newsWindow.reason}` });
          await logTrainingEvent(env, "news_window_block", {
            reason: newsWindow.reason,
            event: newsWindow.event,
            minutes_until: newsWindow.minutesUntil
          }).catch(() => {});
        }
        const rows = await buildOpportunityRowsForTraining(env);
        // PR #6 Phase 2 — pré-fetch les ajustements actifs une fois par cycle
        const activeAdjustments = await resolveActiveAdjustments(env).catch(() => null);
        const candidates = rows.filter(row => isTrainingCandidateAllowed(row, settings, openRows, riskState, newsWindow, activeAdjustments));

        let availableCash = Number(settings.capital_base || 0) - openRows.reduce((acc, row) => acc + (Number(row?.invested || row?.execution?.invested || 0) || 0), 0);

        for (const row of candidates) {
          if (openRows.length >= Number(settings.max_open_positions || 10)) break;
          try {
            const opened = await withTimeout(
              openTrainingPositionFromRow(env, row, settings, availableCash, activeAdjustments),
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
      interrupted: log.interrupted,
      risk_state: log.riskState || null
    }).catch(() => {});
  }

  return ok(log, "worker_training", nowIso(), "recent", "training_auto_cycle_done");
}

// ============================================================
// CRON HANDLER — smart scheduling + idempotence + logs d'activité
// ============================================================
// Cron unique `*/15 * * * *` (wrangler.toml). Cette fonction fait le tri :
//   - Crypto heures actives UTC (6h-22h)  : scan à chaque tick (15 min)
//   - Crypto nuit UTC (22h-6h)            : scan uniquement minute 0 (~1 h)
//   - Actions heures de bourse US         : scan à chaque tick (lun-ven 13h30-20h UTC)
//   - Actions hors-bourse / weekend       : scan opportunities marche quand même
//                                           mais les actions retourneront du stale
//                                           (pas bloquant, évite de complexifier).
// Idempotence : skip si dernier cycle terminé < 10 min (anti-doublon si 2 crons
// se chevauchent côté Cloudflare).
async function handleScheduledCycle(env) {
  const startedAt = Date.now();
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcDay = now.getUTCDay(); // 0 = dimanche, 6 = samedi

  const isCryptoActive = utcHour >= 6 && utcHour < 22;
  const isCryptoNight = !isCryptoActive;
  // Bourse US ouverte approx 13h30-20h UTC (= 9h30-16h EST) — on simplifie en 13-20
  const isUSMarketOpen = utcDay >= 1 && utcDay <= 5 && utcHour >= 13 && utcHour < 20;

  // 1. Throttle nuit crypto : on ne garde qu'un cycle par heure (minute 0)
  if (isCryptoNight && utcMinute !== 0) {
    await logTrainingEvent(env, "scheduled_cycle_skipped", {
      reason: "crypto_night_throttle",
      utc_hour: utcHour,
      utc_minute: utcMinute
    }).catch(() => {});
    await updateLastCycleMeta(env, "skipped-night", { skipped: true, reason: "crypto_night_throttle" }).catch(() => {});
    return;
  }

  // 2. Idempotence : skip si le dernier cycle est trop récent
  let settings = null;
  try {
    settings = await getTrainingSettings(env);
    if (settings?.last_cycle_at) {
      const lastMs = new Date(settings.last_cycle_at).getTime();
      const elapsedMin = (Date.now() - lastMs) / 60000;
      if (Number.isFinite(elapsedMin) && elapsedMin >= 0 && elapsedMin < 10) {
        await logTrainingEvent(env, "scheduled_cycle_skipped", {
          reason: "idempotence_lock",
          last_cycle_at: settings.last_cycle_at,
          elapsed_min: Number(elapsedMin.toFixed(2))
        }).catch(() => {});
        return;
      }
    }
  } catch (e) {
    console.error("getTrainingSettings (idempotence check) failed:", e.message);
  }

  const cycleMode = isUSMarketOpen ? "crypto+actions" : "crypto-only";

  // 3. Log début de cycle
  await logTrainingEvent(env, "scheduled_cycle_start", {
    mode: cycleMode,
    utc_hour: utcHour,
    utc_day: utcDay,
    us_market_open: isUSMarketOpen
  }).catch(() => {});

  const summary = { closed: 0, opened: 0, skipped: 0, errors: 0, duration_ms: 0 };

  try {
    // 4. Rafraîchir les opportunités (inclut le calcul du régime)
    try {
      await withTimeout(handleOpportunities(null, env), 25000, "scheduled_opportunities");
    } catch (e) {
      console.error("Scheduled opportunities error:", e.message);
      summary.errors++;
    }

    // 5. Cycle training sur données fraîches
    try {
      const resp = await withTimeout(handleTrainingAutoCycle(env), 25000, "scheduled_training");
      // handleTrainingAutoCycle retourne un Response. On essaie d'en extraire les counts
      // pour enrichir le summary, sans bloquer si l'extraction échoue.
      try {
        const body = await resp.clone().json();
        const log = body?.data || body;
        if (log && typeof log === "object") {
          summary.closed = Array.isArray(log.closed) ? log.closed.length : 0;
          summary.opened = Array.isArray(log.opened) ? log.opened.length : 0;
          summary.skipped = Array.isArray(log.skipped) ? log.skipped.length : 0;
          summary.errors += Array.isArray(log.errors) ? log.errors.length : 0;
        }
      } catch { /* extraction best-effort, ignore */ }
    } catch (e) {
      console.error("Scheduled training error:", e.message);
      summary.errors++;
    }

    // 6. Drift detection + détection corrections auto — 1×/jour à 2h UTC
    if (utcHour === 2 && utcMinute < 15) {
      try {
        const drift = await withTimeout(detectDriftAlerts(env), 15000, "scheduled_drift");
        if (drift?.detected > 0) {
          await logTrainingEvent(env, "drift_detected", {
            alerts_count: drift.detected,
            alerts: drift.alerts.slice(0, 5)  // top 5 pour ne pas alourdir le payload
          }).catch(() => {});
        }
      } catch (e) {
        console.error("Scheduled drift detect error:", e.message);
      }
      // PR #6 Phase 2 — détection des 6 règles de correction + création shadow
      try {
        const corr = await withTimeout(runCorrectionDetection(env), 15000, "scheduled_corrections_detect");
        if (corr?.created > 0) {
          summary.corrections_created = corr.created;
        }
      } catch (e) {
        console.error("Scheduled corrections detect error:", e.message);
      }
      // PR #6 Phase 2 — observer shadow → active / rollback après 20 trades
      try {
        const obs = await withTimeout(observeShadowAdjustments(env), 15000, "scheduled_shadow_observer");
        if (obs && (obs.activated > 0 || obs.rolledBack > 0)) {
          summary.shadow_activated = obs.activated;
          summary.shadow_rolled_back = obs.rolledBack;
          await logTrainingEvent(env, "shadow_observer_ran", obs).catch(() => {});
        }
      } catch (e) {
        console.error("Scheduled shadow observer error:", e.message);
      }
    }
    // PR #8 Phase 2 — auto-watchlist scan — 1×/jour à 3h UTC (décalé du 2h UTC
    // pour ne pas rentrer en concurrence avec drift + corrections detection).
    if (utcHour === 3 && utcMinute < 15) {
      try {
        const wl = await withTimeout(runWatchlistScan(env), 20000, "scheduled_watchlist_scan");
        if (wl && (wl.added > 0 || wl.removed > 0)) {
          summary.watchlist_added = wl.added;
          summary.watchlist_removed = wl.removed;
        }
      } catch (e) {
        console.error("Scheduled watchlist scan error:", e.message);
      }
    }
    // PR #9 Phase 2 — rapport hebdo Claude, lundi 6h UTC (= 7h CET / 8h CEST).
    // Dedup via unique(week_start) : re-run le même lundi = skip.
    if (utcDay === 1 && utcHour === 6 && utcMinute < 15) {
      try {
        const rep = await withTimeout(generateWeeklyReport(env), 30000, "scheduled_weekly_report");
        if (rep?.ok && !rep.skipped) {
          summary.weekly_report_generated = true;
          summary.weekly_report_week = rep.weekStart;
        }
      } catch (e) {
        console.error("Scheduled weekly report error:", e.message);
      }
    }
  } finally {
    summary.duration_ms = Date.now() - startedAt;
    // 6. Persister le timestamp + résumé + log de fin (best-effort, ne bloque rien)
    await updateLastCycleMeta(env, cycleMode, summary).catch(() => {});
    await logTrainingEvent(env, "scheduled_cycle_end", {
      mode: cycleMode,
      summary
    }).catch(() => {});
  }
}

// Update minimaliste des 3 colonnes de trace sans passer par la normalisation
// (pour ne pas toucher aux autres champs de settings).
async function updateLastCycleMeta(env, mode, summary) {
  if (!supabaseConfigured(env)) return;
  try {
    await supabaseFetch(env, `${TRAINING_SETTINGS_TABLE}?mode=eq.training`, {
      method: "PATCH",
      body: JSON.stringify({
        last_cycle_at: nowIso(),
        last_cycle_mode: mode,
        last_cycle_summary: summary || {},
        updated_at: nowIso()
      })
    });
  } catch (e) {
    console.error("updateLastCycleMeta failed:", e.message);
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
const ENGINE_ADJUSTMENTS_TABLE = "mtp_engine_adjustments";
const TRADE_FEEDBACK_TABLE = "mtp_trade_feedback";
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
    max_daily_loss_pct: clampFloat(safe.max_daily_loss_pct, 0.001, 1.0, base.max_daily_loss_pct),
    max_weekly_loss_pct: clampFloat(safe.max_weekly_loss_pct, 0.001, 1.0, base.max_weekly_loss_pct),
    max_consecutive_losses: clampInt(safe.max_consecutive_losses, 1, 9999, base.max_consecutive_losses),
    last_cycle_at: safe.last_cycle_at || base.last_cycle_at,
    last_cycle_mode: safe.last_cycle_mode || base.last_cycle_mode,
    last_cycle_summary: (safe.last_cycle_summary && typeof safe.last_cycle_summary === "object") ? safe.last_cycle_summary : base.last_cycle_summary,
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

const TRAINING_POSITION_KEYS = ["id","symbol","name","side","direction","asset_class","entry_price","quantity","invested","stop_loss","take_profit","mode","status","opened_at","updated_at","score","decision","trade_decision","trade_reason","trend_label","horizon","source_used","analysis_snapshot","execution","live"];
const TRAINING_TRADE_KEYS = ["id","symbol","name","side","direction","asset_class","entry_price","exit_price","quantity","invested","stop_loss","take_profit","pnl","pnl_pct","opened_at","closed_at","duration_days","mode","status","score","adj_score","rr_ratio","decision","trade_decision","trade_reason","trend_label","horizon","source_used","analysis_snapshot","execution","live","closed_execution","updated_at"];

function normalizeTrainingPositions(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object").map(row => normalizeRowByKeys({
    ...row,
    side: row.side ?? row.direction ?? row?.analysis_snapshot?.direction ?? null,
    direction: row.direction ?? row.side ?? row?.analysis_snapshot?.direction ?? null,
    asset_class: row.asset_class ?? row.assetClass ?? null,
    entry_price: row.entry_price ?? row.entryPrice ?? row?.execution?.entryPrice ?? null,
    quantity: row.quantity ?? row?.execution?.quantity ?? null,
    invested: row.invested ?? row?.execution?.invested ?? null,
    stop_loss: row.stop_loss ?? row.stopLoss ?? row?.analysis_snapshot?.stopLoss ?? null,
    take_profit: row.take_profit ?? row.takeProfit ?? row?.analysis_snapshot?.takeProfit ?? null,
    opened_at: row.opened_at ?? row.openedAt ?? row?.execution?.openedAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    score: row.score ?? row?.analysis_snapshot?.score ?? null,
    horizon: row.horizon ?? row?.analysis_snapshot?.horizon ?? null,
    trend_label: row.trend_label ?? row.trendLabel ?? row?.analysis_snapshot?.trendLabel ?? null,
    source_used: row.source_used ?? row.sourceUsed ?? row?.analysis_snapshot?.sourceUsed ?? null,
    decision: row.decision ?? row.trade_decision ?? row?.analysis_snapshot?.decision ?? null,
    trade_decision: row.trade_decision ?? row.tradeDecision ?? row.decision ?? row?.analysis_snapshot?.decision ?? null,
    trade_reason: row.trade_reason ?? row.tradeReason ?? row?.analysis_snapshot?.reason ?? null,
    analysis_snapshot: row.analysis_snapshot ?? row.analysisSnapshot ?? null,
    execution: row.execution ?? null,
    live: row.live ?? null,
    status: row.status ?? "open"
  }, TRAINING_POSITION_KEYS));
}

function normalizeTrainingTrades(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object").map(row => normalizeRowByKeys({
    ...row,
    side: row.side ?? row.direction ?? row?.analysis_snapshot?.direction ?? null,
    direction: row.direction ?? row.side ?? row?.analysis_snapshot?.direction ?? null,
    asset_class: row.asset_class ?? row.assetClass ?? null,
    entry_price: row.entry_price ?? row.entryPrice ?? row?.execution?.entryPrice ?? null,
    exit_price: row.exit_price ?? row.exitPrice ?? row?.closedExecution?.exitPrice ?? row?.closed_execution?.exitPrice ?? null,
    quantity: row.quantity ?? row?.execution?.quantity ?? null,
    invested: row.invested ?? row?.execution?.invested ?? null,
    stop_loss: row.stop_loss ?? row.stopLoss ?? null,
    take_profit: row.take_profit ?? row.takeProfit ?? null,
    opened_at: row.opened_at ?? row.openedAt ?? row?.execution?.openedAt ?? null,
    closed_at: row.closed_at ?? row.closedAt ?? row?.closedExecution?.closedAt ?? row?.closed_execution?.closedAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    score: row.score ?? row?.analysis_snapshot?.score ?? null,
    pnl_pct: row.pnl_pct ?? row.pnlPct ?? null,
    duration_days: row.duration_days ?? row.durationDays ?? null,
    adj_score: row.adj_score ?? row.adjScore ?? null,
    rr_ratio: row.rr_ratio ?? row.rrRatio ?? row.rr ?? null,
    horizon: row.horizon ?? row?.analysis_snapshot?.horizon ?? null,
    trend_label: row.trend_label ?? row.trendLabel ?? null,
    source_used: row.source_used ?? row.sourceUsed ?? null,
    decision: row.decision ?? row.trade_decision ?? null,
    trade_decision: row.trade_decision ?? row.tradeDecision ?? row.decision ?? row?.analysis_snapshot?.decision ?? null,
    trade_reason: row.trade_reason ?? row.tradeReason ?? row?.analysis_snapshot?.reason ?? null,
    analysis_snapshot: row.analysis_snapshot ?? row.analysisSnapshot ?? null,
    execution: row.execution ?? null,
    live: row.live ?? null,
    closed_execution: row.closed_execution ?? row.closedExecution ?? null,
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
    // PR #7 Phase 2 — capture le context news à l'ouverture pour que
    // captureTradeFeedback le propage en news_context_open.
    newsContext: plan?.newsContext || payload?.newsContext || null,
    newsBonus: finiteOrNull(plan?.newsBonus),
    newsBonusReason: plan?.newsBonusReason || null,
    analysisTimestamp: nowIso()
  };
}

function chooseTrainingExecution(payload, settings, currentAvailableCash, activeAdjustments = null) {
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
  // PR #6 Phase 2 — règle 5/6 : multiplicateur de taille global (reduce_size)
  const sizeMult = Number.isFinite(Number(activeAdjustments?.sizeMultiplier)) ? Number(activeAdjustments.sizeMultiplier) : 1;
  const allocatedCash = Math.min(availableCash, capitalBase * Number(settings?.allocation_per_trade_pct || 0.10) * sizeMult);
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
  // Propager intra-high/low au trade clos (utilisé par captureTradeFeedback)
  const positionLive = position?.live || {};
  closedRow.live = {
    ...(closedRow.live || {}),
    highSinceOpen: finiteOrNull(positionLive.highSinceOpen),
    lowSinceOpen: finiteOrNull(positionLive.lowSinceOpen)
  };
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
  try {
    await captureTradeFeedback(env, closedRow, position, closeType);
  } catch (e) {
    console.error("captureTradeFeedback failed:", e.message);
  }
  return closedRow;
}

// ------------------------------------------------------------
// PR #5 Phase 2 — Trade feedback (MAE/MFE, bucket_key, exit_reason)
// ------------------------------------------------------------

// Update intra-trade high/low on live quote during each close-phase cycle.
// Returns { changed, highSinceOpen, lowSinceOpen } — caller persists if changed.
function updatePositionIntraExcursion(position, livePrice) {
  const price = finiteOrNull(livePrice);
  if (!Number.isFinite(price)) return { changed: false };
  const live = position?.live || {};
  const entry = finiteOrNull(position?.entry_price ?? position?.entryPrice ?? position?.execution?.entryPrice);
  const currentHigh = finiteOrNull(live.highSinceOpen);
  const currentLow  = finiteOrNull(live.lowSinceOpen);
  // Initialisation : on compare à la fois au prix actuel et au prix d'entrée pour
  // ne jamais sous-estimer l'excursion si le cycle #1 arrive après un mouvement.
  const baseline = Number.isFinite(entry) ? entry : price;
  const nextHigh = Math.max(Number.isFinite(currentHigh) ? currentHigh : baseline, price);
  const nextLow  = Math.min(Number.isFinite(currentLow)  ? currentLow  : baseline, price);
  const changed = nextHigh !== currentHigh || nextLow !== currentLow;
  return { changed, highSinceOpen: nextHigh, lowSinceOpen: nextLow, lastPrice: price };
}

async function persistPositionIntraExcursion(env, position, excursion) {
  if (!excursion?.changed) return;
  const id = String(position?.id || "");
  if (!id) return;
  const nextLive = {
    ...(position.live || {}),
    highSinceOpen: excursion.highSinceOpen,
    lowSinceOpen: excursion.lowSinceOpen,
    lastPrice: excursion.lastPrice,
    updatedAt: nowIso()
  };
  try {
    await supabaseFetch(env, `${TRADE_TABLES.positions}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ live: nextLive, updated_at: nowIso() })
    });
    position.live = nextLive; // sync memory pour le trigger suivant
  } catch (e) {
    // Non-bloquant — la clôture reste possible sans MAE/MFE à jour.
    console.error("persistPositionIntraExcursion failed:", e.message);
  }
}

function normalizeRegimeLabel(raw) {
  const up = String(raw || "").toUpperCase();
  if (up === "RISK_ON" || up === "RISK_OFF" || up === "NEUTRAL") return up;
  return "UNKNOWN";
}

function makeBucketKey(setup, side, regime, assetClass) {
  const s = String(setup || "unknown").toLowerCase();
  const d = String(side || "long").toLowerCase();
  const r = String(regime || "UNKNOWN").toUpperCase();
  const a = String(assetClass || "unknown").toLowerCase();
  return `${s}|${d}|${r}|${a}`;
}

function computeTradeExcursion(closedRow, position) {
  const side = String(closedRow?.side || position?.side || "long").toLowerCase();
  const entry = finiteOrNull(closedRow?.entry_price ?? position?.entry_price ?? position?.execution?.entryPrice);
  const exit  = finiteOrNull(closedRow?.exit_price);
  const live  = closedRow?.live || position?.live || {};
  const high  = finiteOrNull(live.highSinceOpen);
  const low   = finiteOrNull(live.lowSinceOpen);

  if (!Number.isFinite(entry) || entry <= 0) {
    return { maePct: null, mfePct: null };
  }

  // Fallback : si on n'a pas d'intra-tracking (clôture rapide entre 2 cycles,
  // ou position ancienne pré-PR #5), on prend l'exit comme borne opposée.
  const effHigh = Number.isFinite(high) ? high : (Number.isFinite(exit) ? Math.max(exit, entry) : entry);
  const effLow  = Number.isFinite(low)  ? low  : (Number.isFinite(exit) ? Math.min(exit, entry) : entry);

  let maePct, mfePct;
  if (side === "short") {
    // Adverse pour un short = hausse ; favorable = baisse
    maePct = Math.max(0, ((effHigh - entry) / entry) * 100);
    mfePct = Math.max(0, ((entry - effLow) / entry) * 100);
  } else {
    // Long : adverse = baisse ; favorable = hausse
    maePct = Math.max(0, ((entry - effLow)  / entry) * 100);
    mfePct = Math.max(0, ((effHigh - entry) / entry) * 100);
  }
  return { maePct, mfePct };
}

function resolveExitReason(closeType) {
  const t = String(closeType || "").toLowerCase();
  if (t === "stop_loss" || t === "take_profit" || t === "time_exit"
   || t === "engine_invalidation" || t === "manual") return t;
  return "unknown";
}

async function captureTradeFeedback(env, closedRow, position, closeType) {
  if (!supabaseConfigured(env)) return null;
  const tradeId = String(closedRow?.id || "");
  if (!tradeId) return null;

  const snapshot = closedRow?.analysis_snapshot || position?.analysis_snapshot || {};
  const side = String(closedRow?.side || position?.side || snapshot?.direction || "long").toLowerCase();
  const setup = String(snapshot?.setupType || "unknown").toLowerCase();

  const regimeAtOpen  = normalizeRegimeLabel(snapshot?.regime ?? position?.analysis_snapshot?.regime ?? "UNKNOWN");
  const regimeAtClose = normalizeRegimeLabel(await kvGet("market:regime", env).catch(() => null));
  // PR #7 Phase 2 — context news à la clôture (best-effort, cache déjà chaud normalement)
  let newsContextClose = null;
  try {
    const symbol = closedRow?.symbol || position?.symbol;
    const assetClass = closedRow?.asset_class || position?.asset_class;
    if (symbol && assetClass) {
      newsContextClose = await resolveSymbolNewsContext(env, symbol, assetClass);
    }
  } catch { /* best-effort */ }

  const entry = finiteOrNull(closedRow?.entry_price);
  const exit  = finiteOrNull(closedRow?.exit_price);
  const sl    = finiteOrNull(closedRow?.stop_loss);
  const tp    = finiteOrNull(closedRow?.take_profit);

  const stopDistPct = (Number.isFinite(entry) && Number.isFinite(sl) && entry > 0) ? Math.abs((sl - entry) / entry) * 100 : null;
  const tpDistPct   = (Number.isFinite(entry) && Number.isFinite(tp) && entry > 0) ? Math.abs((tp - entry) / entry) * 100 : null;

  const { maePct, mfePct } = computeTradeExcursion(closedRow, position);

  const maeVsStop = (Number.isFinite(maePct) && Number.isFinite(stopDistPct) && stopDistPct > 0) ? maePct / stopDistPct : null;
  const mfeVsTp   = (Number.isFinite(mfePct) && Number.isFinite(tpDistPct)   && tpDistPct   > 0) ? mfePct / tpDistPct   : null;

  const openedAt = closedRow?.opened_at || position?.opened_at || null;
  const closedAt = closedRow?.closed_at || nowIso();
  const holdingMinutes = (openedAt && closedAt)
    ? Math.max(0, Math.round((new Date(closedAt).getTime() - new Date(openedAt).getTime()) / 60000))
    : null;

  const bucketKey = makeBucketKey(setup, side, regimeAtOpen, closedRow?.asset_class || position?.asset_class);

  const feedback = {
    trade_id: tradeId,
    symbol: closedRow?.symbol || position?.symbol || null,
    asset_class: closedRow?.asset_class || position?.asset_class || null,
    setup_type: setup,
    direction: side === "short" ? "short" : "long",
    regime_at_open: regimeAtOpen,
    regime_at_close: regimeAtClose,
    exit_reason: resolveExitReason(closeType ?? closedRow?.closed_execution?.closeType),
    opened_at: openedAt,
    closed_at: closedAt,
    holding_minutes: holdingMinutes,
    entry_price: entry,
    exit_price: exit,
    stop_loss: sl,
    take_profit: tp,
    pnl: finiteOrNull(closedRow?.pnl),
    pnl_pct: finiteOrNull(closedRow?.pnl_pct),
    mae_pct: Number.isFinite(maePct) ? Number(maePct.toFixed(4)) : null,
    mfe_pct: Number.isFinite(mfePct) ? Number(mfePct.toFixed(4)) : null,
    stop_distance_pct: Number.isFinite(stopDistPct) ? Number(stopDistPct.toFixed(4)) : null,
    tp_distance_pct:   Number.isFinite(tpDistPct)   ? Number(tpDistPct.toFixed(4))   : null,
    mae_vs_stop_ratio: Number.isFinite(maeVsStop) ? Number(maeVsStop.toFixed(4)) : null,
    mfe_vs_tp_ratio:   Number.isFinite(mfeVsTp)   ? Number(mfeVsTp.toFixed(4))   : null,
    bucket_key: bucketKey,
    // PR #7 Phase 2 — context news capturé au moment de l'ouverture via
    // analysis_snapshot. newsContext ∈ { source, sentiment, classification,
    // articleCount, topHeadline, claudeSignal? }.
    news_context_open: snapshot?.newsContext || null,
    news_context_close: newsContextClose ? {
      source: newsContextClose.source,
      sentiment: newsContextClose.sentiment,
      classification: newsContextClose.classification,
      articleCount: newsContextClose.articleCount,
      topHeadline: newsContextClose.topHeadline
    } : null,
    notes: null
  };

  try {
    await supabaseFetch(env, `${TRADE_FEEDBACK_TABLE}?on_conflict=trade_id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([feedback])
    });
    return feedback;
  } catch (e) {
    console.error("captureTradeFeedback persist failed:", e.message);
    return null;
  }
}

async function listTradeFeedback(env, { limit = 100, bucketKey = null, symbol = null } = {}) {
  if (!supabaseConfigured(env)) return [];
  const params = [`order=closed_at.desc`, `limit=${clampInt(limit, 1, 1000, 100)}`];
  if (bucketKey) params.push(`bucket_key=eq.${encodeURIComponent(bucketKey)}`);
  if (symbol)    params.push(`symbol=eq.${encodeURIComponent(symbol)}`);
  try {
    const rows = await supabaseFetch(env, `${TRADE_FEEDBACK_TABLE}?${params.join("&")}`);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("listTradeFeedback failed:", e.message);
    return [];
  }
}

async function openTrainingPositionFromRow(env, row, settings, availableCash, activeAdjustments = null) {
  const execution = chooseTrainingExecution(row, settings, availableCash, activeAdjustments);
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
  const riskState = buildTrainingRiskState(settings, openRows, closedRows);
  return ok({ configured: true, settings, capitalBase, available, engaged, realized, equity: available + engaged, openCount: openRows.length, closedCount: closedRows.length, riskState }, "worker_training", nowIso(), "recent", null);
}

async function handleTrainingPositions(env) {
  if (!supabaseConfigured(env)) return ok({ configured: false, positions: [], history: [] }, "worker_training", nowIso(), "recent", "Supabase non configure");
  const positions = normalizeTrainingPositions(await getOpenTrainingPositionsRaw(env));
  const history = normalizeTrainingTrades(await getClosedTrainingTradesRaw(env, 200));
  const settings = await getTrainingSettings(env);
  const riskState = buildTrainingRiskState(settings, positions, history);
  return ok({ configured: true, positions, history, riskState }, "worker_training", nowIso(), "recent", null);
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

async function handleTrainingEvents(url, env) {
  if (!supabaseConfigured(env)) return ok({ configured: false, events: [] }, "worker_training", nowIso(), "recent", "Supabase non configure");
  const limitRaw = Number(url?.searchParams?.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
  try {
    const rows = await supabaseFetch(env, `${TRAINING_EVENTS_TABLE}?select=id,created_at,event_type,symbol,trade_id,payload&order=created_at.desc&limit=${limit}`);
    const events = Array.isArray(rows) ? rows.map(r => ({
      id: r.id,
      at: r.created_at,
      type: r.event_type,
      symbol: r.symbol || null,
      tradeId: r.trade_id || null,
      payload: r.payload || {}
    })) : [];
    return ok({ configured: true, events }, "supabase", nowIso(), "recent");
  } catch (e) {
    return fail(`Erreur events : ${e.message || "supabase"}`, "error", 500);
  }
}

async function handleTrainingStats(env) {
  if (!supabaseConfigured(env)) return ok({ configured: false, stats: null }, "worker_training", nowIso(), "recent", "Supabase non configure");
  try {
    const closedRows = normalizeTrainingTrades(await getClosedTrainingTradesRaw(env, 1000));
    const openRows = normalizeTrainingPositions(await getOpenTrainingPositionsRaw(env));
    const stats = computeTrainingStats(closedRows, openRows);
    return ok({ configured: true, stats }, "supabase", nowIso(), "recent");
  } catch (e) {
    return fail(`Erreur stats : ${e.message || "supabase"}`, "error", 500);
  }
}

function computeTrainingStats(closed, open) {
  const trades = Array.isArray(closed) ? closed.filter(t => t && t.status === "closed") : [];
  const totalCount = trades.length;
  const wins = trades.filter(t => Number(t.pnl || 0) > 0);
  const losses = trades.filter(t => Number(t.pnl || 0) < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalCount > 0 ? winCount / totalCount : null;
  const totalPnl = trades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const avgWin = wins.length ? wins.reduce((a, t) => a + Number(t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + Number(t.pnl || 0), 0) / losses.length) : 0;
  const expectancy = totalCount > 0 && avgLoss > 0 ? (winRate * avgWin) - ((1 - winRate) * avgLoss) : null;
  const rrActual = avgLoss > 0 ? avgWin / avgLoss : null;

  // Breakdown par setup
  const bySetupAgg = {};
  for (const t of trades) {
    const setup = String(t?.analysisSnapshot?.setupType || t?.analysis_snapshot?.setupType || t?.analysisSnapshot?.setup_type || "autre").toLowerCase();
    if (!bySetupAgg[setup]) bySetupAgg[setup] = { setup, count: 0, wins: 0, pnl: 0 };
    bySetupAgg[setup].count += 1;
    bySetupAgg[setup].pnl += Number(t.pnl || 0);
    if (Number(t.pnl || 0) > 0) bySetupAgg[setup].wins += 1;
  }
  const bySetup = Object.values(bySetupAgg).map(s => ({ ...s, winRate: s.count > 0 ? s.wins / s.count : null })).sort((a,b) => b.count - a.count);

  // Breakdown par classe
  const byClassAgg = {};
  for (const t of trades) {
    const cls = String(t?.assetClass || t?.asset_class || "stock").toLowerCase();
    if (!byClassAgg[cls]) byClassAgg[cls] = { class: cls, count: 0, wins: 0, pnl: 0 };
    byClassAgg[cls].count += 1;
    byClassAgg[cls].pnl += Number(t.pnl || 0);
    if (Number(t.pnl || 0) > 0) byClassAgg[cls].wins += 1;
  }
  const byClass = Object.values(byClassAgg).map(c => ({ ...c, winRate: c.count > 0 ? c.wins / c.count : null })).sort((a,b) => b.count - a.count);

  // Top 5 actifs gagnants / perdants
  const bySymbolAgg = {};
  for (const t of trades) {
    const sym = String(t.symbol || "").toUpperCase();
    if (!sym) continue;
    if (!bySymbolAgg[sym]) bySymbolAgg[sym] = { symbol: sym, count: 0, pnl: 0, wins: 0 };
    bySymbolAgg[sym].count += 1;
    bySymbolAgg[sym].pnl += Number(t.pnl || 0);
    if (Number(t.pnl || 0) > 0) bySymbolAgg[sym].wins += 1;
  }
  const topSymbols = Object.values(bySymbolAgg).sort((a,b) => b.pnl - a.pnl).slice(0, 5);
  const bottomSymbols = Object.values(bySymbolAgg).sort((a,b) => a.pnl - b.pnl).filter(s => s.pnl < 0).slice(0, 5);

  return {
    totalCount,
    winCount,
    lossCount,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    expectancy,
    rrActual,
    openCount: Array.isArray(open) ? open.length : 0,
    bySetup,
    byClass,
    topSymbols,
    bottomSymbols
  };
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

function pickSupabaseCols(row, keys) {
  if (!row || typeof row !== "object") return {};
  const out = {};
  for (const k of keys) if (k in row && row[k] !== undefined) out[k] = row[k];
  return out;
}

function mapPositionForSupabase(p) {
  const merged = {
    ...p,
    side:           p.side          ?? p.direction    ?? null,
    asset_class:    p.asset_class   ?? p.assetClass   ?? null,
    entry_price:    p.entry_price   ?? p.entryPrice   ?? p?.execution?.entryPrice ?? null,
    stop_loss:      p.stop_loss     ?? p.stopLoss     ?? p?.analysisSnapshot?.stopLoss ?? null,
    take_profit:    p.take_profit   ?? p.takeProfit   ?? p?.analysisSnapshot?.takeProfit ?? null,
    trend_label:    p.trend_label   ?? p.trendLabel   ?? null,
    trade_decision: p.trade_decision ?? p.tradeDecision ?? p.decision ?? p?.analysisSnapshot?.decision ?? null,
    trade_reason:   p.trade_reason  ?? p.tradeReason  ?? null,
    source_used:    p.source_used   ?? p.sourceUsed   ?? null,
    opened_at:      p.opened_at     ?? p.openedAt     ?? p?.execution?.openedAt ?? null,
    updated_at:     p.updated_at    ?? p.updatedAt    ?? null,
    analysis_snapshot: p.analysis_snapshot ?? p.analysisSnapshot ?? null,
  };
  return pickSupabaseCols(merged, SUPABASE_POSITION_KEYS);
}

function mapTradeForSupabase(t) {
  const merged = {
    ...t,
    side:            t.side           ?? t.direction    ?? null,
    asset_class:     t.asset_class    ?? t.assetClass   ?? null,
    entry_price:     t.entry_price    ?? t.entryPrice   ?? t?.execution?.entryPrice ?? null,
    exit_price:      t.exit_price     ?? t.exitPrice    ?? t?.closedExecution?.exitPrice ?? null,
    stop_loss:       t.stop_loss      ?? t.stopLoss     ?? null,
    take_profit:     t.take_profit    ?? t.takeProfit   ?? null,
    pnl_pct:         t.pnl_pct        ?? t.pnlPct       ?? null,
    adj_score:       t.adj_score      ?? t.adjScore     ?? null,
    rr_ratio:        t.rr_ratio       ?? t.rrRatio      ?? t.rr ?? null,
    trend_label:     t.trend_label    ?? t.trendLabel   ?? null,
    trade_decision:  t.trade_decision ?? t.tradeDecision ?? t.decision ?? t?.analysisSnapshot?.decision ?? null,
    trade_reason:    t.trade_reason   ?? t.tradeReason  ?? null,
    source_used:     t.source_used    ?? t.sourceUsed   ?? null,
    opened_at:       t.opened_at      ?? t.openedAt     ?? null,
    closed_at:       t.closed_at      ?? t.closedAt     ?? t?.closedExecution?.closedAt ?? null,
    updated_at:      t.updated_at     ?? t.updatedAt    ?? null,
    analysis_snapshot: t.analysis_snapshot ?? t.analysisSnapshot ?? null,
    closed_execution:  t.closed_execution  ?? t.closedExecution  ?? null,
  };
  return pickSupabaseCols(merged, SUPABASE_TRADE_KEYS);
}

async function handleTradesSync(request, env) {
  if (!supabaseConfigured(env)) return tradesPayload(false, [], [], "Secrets Supabase absents");
  const body = await request.json().catch(() => ({}));
  const inputPositions = Array.isArray(body?.positions) ? body.positions : [];
  const inputHistory = Array.isArray(body?.history) ? body.history : [];
  const positions = normalizeTrainingPositions(inputPositions);
  const history = normalizeTrainingTrades(inputHistory);

  if (inputPositions.length) {
    const rows = inputPositions.map(mapPositionForSupabase).filter(r => r.id);
    if (rows.length) {
      await supabaseFetch(env, `${TRADE_TABLES.positions}?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(rows)
      });
    }
  }
  const closedHistory = inputHistory.filter(isAuthoritativeClosedTradeRow);
  if (closedHistory.length) {
    const rows = closedHistory.map(mapTradeForSupabase).filter(r => r.id);
    if (rows.length) {
      await supabaseFetch(env, `${TRADE_TABLES.trades}?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(rows)
      });
      // PR #5 Phase 2 — capturer feedback pour les clôtures manuelles (UI → sync)
      // Idempotent grâce à trade_id unique + on_conflict=trade_id.
      try {
        const existingIds = await listExistingFeedbackIds(env, rows.map(r => String(r.id)));
        for (const row of rows) {
          if (existingIds.has(String(row.id))) continue;
          const closeType = row?.closed_execution?.closeType || row?.close_type || "manual";
          await captureTradeFeedback(env, row, null, closeType);
        }
      } catch (e) {
        console.error("captureTradeFeedback on sync failed:", e.message);
      }
    }
  }
  return tradesPayload(true, positions, history, "sync_ok");
}

// Miroir serveur de tradeSource() côté front (assets/app.js).
// Garde le code synchronisé : même logique de décision.
function tradeSourceServer(row) {
  if (!row || typeof row !== "object") return "manual";
  if (row.source === "algo") return "algo";
  if (row.source === "manual") return "manual";
  const dec = String(
    row.trade_decision
    ?? row.tradeDecision
    ?? row.decision
    ?? row?.analysis_snapshot?.decision
    ?? ""
  ).toLowerCase();
  if (dec.includes("trade propose") || dec === "conseille") return "algo";
  return "manual";
}

function encodeInList(ids) {
  return ids.map(id => `"${encodeURIComponent(id)}"`).join(",");
}

async function handleTradesWipe(request, env) {
  if (!supabaseConfigured(env)) return fail("Secrets Supabase absents", "supabase_missing", 500);
  const body = await request.json().catch(() => ({}));
  const rawIds = Array.isArray(body?.ids) ? body.ids : [];
  const includePositions = body?.includePositions === true;
  const wipeAll = body?.wipeAll === true;
  const sourceFilter = typeof body?.source === "string"
    ? body.source.trim().toLowerCase()
    : null;
  const validSource = sourceFilter === "manual" || sourceFilter === "algo" ? sourceFilter : null;

  try {
    // Cas 1 — wipeAll : DELETE direct, aucun SELECT préalable (le plus rapide).
    // On sacrifie la cascade feedback pour éviter tout timeout Safari iOS.
    if (wipeAll) {
      let deletedTrades = 0;
      let deletedPositions = 0;
      const tradesRes = await supabaseFetch(env, `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed`, {
        method: "DELETE",
        headers: { Prefer: "return=representation", Accept: "application/json" }
      });
      deletedTrades = Array.isArray(tradesRes) ? tradesRes.length : 0;
      if (includePositions) {
        const posRes = await supabaseFetch(env, `${TRADE_TABLES.positions}?mode=eq.training`, {
          method: "DELETE",
          headers: { Prefer: "return=representation", Accept: "application/json" }
        });
        deletedPositions = Array.isArray(posRes) ? posRes.length : 0;
      }
      return ok({ deletedTrades, deletedPositions, mode: "wipe_all" });
    }

    // Cas 2 — par source (manual/algo) : SELECT minimal + DELETE chunked.
    let ids = Array.from(new Set(
      rawIds.map(v => String(v ?? "").trim()).filter(Boolean)
    ));
    if (validSource) {
      const allRows = await supabaseFetch(
        env,
        `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed&select=id,source,trade_decision&limit=100000`
      );
      const rows = Array.isArray(allRows) ? allRows : [];
      const matching = rows.filter(r => tradeSourceServer(r) === validSource);
      ids = Array.from(new Set(matching.map(r => String(r?.id ?? "")).filter(Boolean)));
    }

    if (!ids.length && !includePositions) {
      return ok({ deletedTrades: 0, deletedPositions: 0, reason: "nothing_to_delete" });
    }

    let deletedTrades = 0;
    if (ids.length) {
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const inList = encodeInList(slice);
        const res = await supabaseFetch(env, `${TRADE_TABLES.trades}?id=in.(${inList})&mode=eq.training`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" }
        });
        deletedTrades += Array.isArray(res) ? res.length : 0;
        await supabaseFetch(env, `${TRADE_FEEDBACK_TABLE}?trade_id=in.(${inList})`, {
          method: "DELETE"
        }).catch(() => {});
      }
    }

    let deletedPositions = 0;
    if (includePositions) {
      const res = await supabaseFetch(env, `${TRADE_TABLES.positions}?mode=eq.training`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" }
      });
      deletedPositions = Array.isArray(res) ? res.length : 0;
    } else if (ids.length) {
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const inList = encodeInList(slice);
        const res = await supabaseFetch(env, `${TRADE_TABLES.positions}?id=in.(${inList})&mode=eq.training`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" }
        });
        deletedPositions += Array.isArray(res) ? res.length : 0;
      }
    }

    return ok({ deletedTrades, deletedPositions });
  } catch (e) {
    console.error("handleTradesWipe failed:", e?.message || e);
    return fail(`wipe_failed: ${e?.message || "unknown"}`, "wipe_error", 500);
  }
}

async function listExistingFeedbackIds(env, tradeIds) {
  if (!supabaseConfigured(env) || !Array.isArray(tradeIds) || tradeIds.length === 0) return new Set();
  try {
    const inList = tradeIds.map(id => `"${encodeURIComponent(id)}"`).join(",");
    const rows = await supabaseFetch(env, `${TRADE_FEEDBACK_TABLE}?select=trade_id&trade_id=in.(${inList})`);
    return new Set((Array.isArray(rows) ? rows : []).map(r => String(r.trade_id)));
  } catch (e) {
    console.error("listExistingFeedbackIds failed:", e.message);
    return new Set();
  }
}

async function handleTrainingFeedback(url, env) {
  const limitRaw = Number(url?.searchParams?.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;
  const bucketKey = url?.searchParams?.get("bucket_key") || null;
  const symbol    = url?.searchParams?.get("symbol") || null;
  const rows = await listTradeFeedback(env, { limit, bucketKey, symbol });
  return json({ status: "ok", asOf: nowIso(), count: rows.length, data: rows });
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
    const mustKeep=/résultat|resultat|results|earnings|guidance|prévision|prevision|forecast|fed|bce|ecb|inflation|taux|bond|treasury|dollar|oil|pétrole|petrole|emploi|macro|amd|nvidia|microsoft|apple|bitcoin|ethereum|crypto|semi|semiconductor|ia|ai|régulation|regulation|sanction|fusion|acquisition|rachat/.test(s);
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
async function handleFearGreed() {
  const cached = getMemoryCache("fear_greed");
  if (cached) return json(cached);
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) throw new Error(`fng_http_${res.status}`);
    const body = await res.json();
    const entry = Array.isArray(body?.data) ? body.data[0] : null;
    if (!entry) throw new Error("fng_empty");
    const value = parseInt(entry.value, 10);
    const payload = { status: "ok", source: "alternative.me", asOf: nowIso(), freshness: "fresh", data: { value, label: entry.value_classification || "Unknown", timestamp: entry.timestamp } };
    setMemoryCache("fear_greed", TTL.fearGreed, payload);
    return json(payload);
  } catch (err) {
    return json({ status: "partial", source: "error", asOf: nowIso(), freshness: "unknown", message: String(err?.message || err), data: { value: null, label: null } });
  }
}

// Fetch simultané de F&G (crypto) et VIX (actions) — modulateur de régime PR #2.
// Cache mémoire 5 min pour éviter les hits répétés dans les boucles de scan.
// Best-effort : si une source échoue, l'autre est renvoyée quand même.
async function fetchRegimeIndicators(env) {
  const cached = getMemoryCache("regime_indicators");
  if (cached) return cached;

  const result = { fearGreed: null, vix: null, asOf: nowIso() };

  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (res.ok) {
      const body = await res.json();
      const entry = Array.isArray(body?.data) ? body.data[0] : null;
      const value = entry ? parseInt(entry.value, 10) : null;
      if (Number.isFinite(value)) result.fearGreed = value;
    }
  } catch { /* best-effort */ }

  try {
    const res = await fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EVIX");
    if (res.ok) {
      const body = await res.json();
      const q = body?.quoteResponse?.result?.[0];
      const value = Number(q?.regularMarketPrice);
      if (Number.isFinite(value) && value > 0) result.vix = value;
    }
  } catch { /* best-effort */ }

  setMemoryCache("regime_indicators", TTL.fearGreed, result);
  return result;
}

async function handleRegimeIndicators(env) {
  const data = await fetchRegimeIndicators(env);
  return json({ status: "ok", asOf: data.asOf, data });
}

// ============================================================
// NEWS GARDE-FOU — PR #3 Phase 1
// ============================================================
// Calendrier économique via Forex Factory RSS (gratuit, illimité).
// Cache mémoire 6 h + persist Supabase. Dégradation gracieuse si fetch échoue.

async function fetchEconomicCalendar(env) {
  const cacheKey = "economic_calendar_week";
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  let events = [];
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", {
      headers: { "User-Agent": "Mozilla/5.0 ManiTradePro/1.0" }
    });
    if (!res.ok) throw new Error(`ff_http_${res.status}`);
    const xml = await res.text();
    events = parseForexFactoryXml(xml);
  } catch (e) {
    console.error("fetchEconomicCalendar failed:", e.message);
  }

  setMemoryCache(cacheKey, 6 * 60 * 60 * 1000, events);

  // Persist dans Supabase (best-effort, nettoyage des vieux events > 30j)
  if (events.length && supabaseConfigured(env)) {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseFetch(env, `mtp_economic_calendar?event_time=lt.${cutoff}`, { method: "DELETE" }).catch(() => {});

      const rows = events.map(e => ({
        // event_uid stable sur la DATE (pas l'heure) : si Forex Factory reschedule
        // un event dans la journée, l'upsert met à jour event_time au lieu de créer
        // un doublon. Format YYYY-MM-DD extrait du timestamp UTC.
        event_uid: `${e.country}|${e.title}|${String(e.event_time).slice(0, 10)}`,
        title: e.title,
        country: e.country,
        impact: e.impact,
        event_time: e.event_time,
        forecast: e.forecast || null,
        previous: e.previous || null,
        source: "forex_factory",
        fetched_at: nowIso()
      }));
      await supabaseFetch(env, `mtp_economic_calendar?on_conflict=event_uid`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows)
      }).catch(() => {});
    } catch { /* best-effort */ }
  }

  return events;
}

function parseForexFactoryXml(xml) {
  const events = [];
  if (!xml || typeof xml !== "string") return events;

  const eventRegex = /<event>([\s\S]*?)<\/event>/g;
  const extractTag = (block, tag) => {
    const cdataRe = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`);
    const plainRe = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const m = block.match(cdataRe) || block.match(plainRe);
    return m ? (m[1] || "").trim() : "";
  };

  let match;
  while ((match = eventRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const country = extractTag(block, "country");
    const date = extractTag(block, "date");
    const time = extractTag(block, "time");
    const impact = extractTag(block, "impact").toLowerCase();
    const forecast = extractTag(block, "forecast");
    const previous = extractTag(block, "previous");

    if (!title || !country || !date) continue;

    const eventTime = parseForexFactoryDateTime(date, time);
    if (!eventTime) continue;

    events.push({
      title,
      country,
      impact: ["high", "medium", "low"].includes(impact) ? impact : "low",
      event_time: eventTime,
      forecast: forecast === "" ? null : forecast,
      previous: previous === "" ? null : previous
    });
  }

  return events;
}

// Forex Factory publie en Eastern Time (ET). Conversion en UTC avec DST approximative :
// EDT (UTC-4) de mars à novembre, EST (UTC-5) autrement. Précision ±1h en hors-saison DST
// — tolérée par la fenêtre ±30 min du garde-fou.
function parseForexFactoryDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  const dateMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!dateMatch) return null;
  const [, m, d, y] = dateMatch;
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  const year = parseInt(y, 10);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;

  let hour = 0;
  let minute = 0;
  const skipTimes = ["All Day", "Tentative", "", "Holiday", "Day 1", "Day 2"];
  if (timeStr && !skipTimes.includes(timeStr)) {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toLowerCase();
      if (ampm === "pm" && hour !== 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    } else {
      // Format inconnu — on place à midi ET par défaut (-0/+30min coverage en pire cas)
      hour = 12;
    }
  }

  // DST approximative (mars à novembre inclus → EDT UTC-4, sinon EST UTC-5)
  const isDst = month >= 3 && month <= 11;
  const etOffsetHours = isDst ? 4 : 5;

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour + etOffsetHours, minute, 0));
  if (isNaN(utcDate.getTime())) return null;

  return utcDate.toISOString();
}

// Retourne les events high-impact dans la fenêtre [-windowMs, +windowMs] de maintenant.
// Lit depuis Supabase avec cache mémoire 2 min (appels répétés dans une boucle cycle = 1 seul fetch).
async function fetchHighImpactEventsInWindow(env, windowMs = 30 * 60 * 1000) {
  const cacheKey = `news_window:${Math.floor(windowMs / 60000)}`;
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  let events = [];

  if (supabaseConfigured(env)) {
    try {
      const from = new Date(Date.now() - windowMs).toISOString();
      const to = new Date(Date.now() + windowMs).toISOString();
      const rows = await supabaseFetch(env,
        `mtp_economic_calendar?impact=eq.high&event_time=gte.${from}&event_time=lte.${to}&order=event_time.asc`
      );
      events = Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error("fetchHighImpactEventsInWindow (supabase) failed:", e.message);
    }
  }

  // Fallback : si pas de Supabase ou pas de rows, on fetch direct + filtre en mémoire
  if (!events.length) {
    const all = await fetchEconomicCalendar(env);
    const now = Date.now();
    events = all.filter(e =>
      e.impact === "high" &&
      Math.abs(new Date(e.event_time).getTime() - now) <= windowMs
    );
  }

  setMemoryCache(cacheKey, 2 * 60 * 1000, events);
  return events;
}

// Check si on doit bloquer une nouvelle entrée à cause d'un event macro imminent.
// Retourne { blocked, reason?, event?, minutesUntil? }.
// Appelée en amont du cycle training (pré-fetch dans handleTrainingAutoCycle).
async function getNewsWindowForCycle(env) {
  const events = await fetchHighImpactEventsInWindow(env, 30 * 60 * 1000);
  if (!events.length) return { blocked: false };

  const now = Date.now();
  const sorted = events
    .map(e => ({ ...e, delta: new Date(e.event_time).getTime() - now }))
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  const ev = sorted[0];
  const minutesUntil = Math.round(ev.delta / 60000);
  return {
    blocked: true,
    reason: `Événement ${ev.country} "${ev.title}" ${minutesUntil >= 0 ? `dans ${minutesUntil} min` : `il y a ${-minutesUntil} min`} (impact high)`,
    event: {
      title: ev.title,
      country: ev.country,
      event_time: ev.event_time,
      forecast: ev.forecast,
      previous: ev.previous
    },
    minutesUntil
  };
}

async function handleEconomicCalendar(env) {
  const events = await fetchEconomicCalendar(env);
  return json({ status: "ok", asOf: nowIso(), count: events.length, data: events });
}

async function handleNewsWindow(env) {
  const window = await getNewsWindowForCycle(env);
  return json({ status: "ok", asOf: nowIso(), ...window });
}

// ============================================================
// SHADOW MODE + DRIFT DETECTION — PR #4 Phase 1
// ============================================================
// Infrastructure pour la Règle #1 (apprendre ET se corriger).
// Chaque correction auto du moteur passe par la table mtp_engine_adjustments
// avec workflow shadow → active → rollback. Les corrections concrètes (7
// règles) seront branchées en Phase 2.

async function createEngineAdjustment(env, {
  adjustmentType, bucketKey = null, signalTrigger = {},
  oldValue = null, newValue = null, severity = null, notes = null
}) {
  if (!supabaseConfigured(env)) return null;
  const row = {
    adjustment_type: String(adjustmentType || "unknown"),
    bucket_key: bucketKey,
    signal_trigger: signalTrigger || {},
    old_value: oldValue,
    new_value: newValue,
    status: "shadow",
    shadow_trades_observed: 0,
    shadow_result_better: null,
    severity: severity,
    notes: notes,
    created_at: nowIso(),
    updated_at: nowIso()
  };
  try {
    const res = await supabaseFetch(env, `${ENGINE_ADJUSTMENTS_TABLE}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([row])
    });
    return Array.isArray(res) ? res[0] : res;
  } catch (e) {
    console.error("createEngineAdjustment failed:", e.message);
    return null;
  }
}

async function updateEngineAdjustmentStatus(env, id, status, extra = {}) {
  if (!supabaseConfigured(env)) return null;
  const patch = { status, updated_at: nowIso(), ...extra };
  if (status === "active") patch.activated_at = nowIso();
  if (status === "rollback") patch.rollback_at = nowIso();
  try {
    const res = await supabaseFetch(env, `${ENGINE_ADJUSTMENTS_TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    });
    return Array.isArray(res) ? res[0] : res;
  } catch (e) {
    console.error("updateEngineAdjustmentStatus failed:", e.message);
    return null;
  }
}

async function listEngineAdjustments(env, { status = null, limit = 50 } = {}) {
  if (!supabaseConfigured(env)) return [];
  const params = [`order=created_at.desc`, `limit=${clampInt(limit, 1, 500, 50)}`];
  if (status) params.push(`status=eq.${encodeURIComponent(status)}`);
  try {
    const rows = await supabaseFetch(env, `${ENGINE_ADJUSTMENTS_TABLE}?${params.join("&")}`);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("listEngineAdjustments failed:", e.message);
    return [];
  }
}

// Agrège les trades clos par bucket (setup × direction) pour drift detection.
// Retourne un map { bucketKey: { historical: {winRate, n}, recent30: {winRate, n} } }
async function computeBucketStats(env) {
  if (!supabaseConfigured(env)) return {};
  try {
    const rows = await supabaseFetch(env,
      `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed&order=closed_at.desc&limit=1000`
    );
    if (!Array.isArray(rows) || rows.length === 0) return {};

    const buckets = {};
    rows.forEach((trade, index) => {
      const setup = String(trade?.analysis_snapshot?.setupType || trade?.setupType || "unknown").toLowerCase();
      const side = String(trade?.side || trade?.analysis_snapshot?.direction || "long").toLowerCase();
      const key = `${setup}|${side}`;
      if (!buckets[key]) {
        buckets[key] = {
          bucketKey: key,
          setup, side,
          historical: { wins: 0, losses: 0, n: 0 },
          recent30: { wins: 0, losses: 0, n: 0 }
        };
      }
      const pnl = Number(trade?.pnl ?? trade?.pnl_pct ?? 0);
      const isWin = pnl > 0;
      buckets[key].historical.n++;
      if (isWin) buckets[key].historical.wins++; else buckets[key].historical.losses++;
      // Recent 30 : les 30 premiers (rows déjà triés desc)
      if (index < 30 || buckets[key].recent30.n < 30) {
        if (buckets[key].recent30.n < 30) {
          buckets[key].recent30.n++;
          if (isWin) buckets[key].recent30.wins++; else buckets[key].recent30.losses++;
        }
      }
    });

    // Calcul win rates finaux
    Object.values(buckets).forEach(b => {
      b.historical.winRate = b.historical.n > 0 ? b.historical.wins / b.historical.n : null;
      b.recent30.winRate = b.recent30.n > 0 ? b.recent30.wins / b.recent30.n : null;
    });

    return buckets;
  } catch (e) {
    console.error("computeBucketStats failed:", e.message);
    return {};
  }
}

// Détecte les buckets en drift et logge des alertes dans mtp_engine_adjustments.
// Seuils : chute relative 10-15% = light, 15-25% = moderate, > 25% = severe.
async function detectDriftAlerts(env) {
  const buckets = await computeBucketStats(env);
  const alerts = [];

  for (const key in buckets) {
    const b = buckets[key];
    // On exige au moins 20 trades historiques ET 10 récents pour avoir un signal exploitable
    if (!b.historical.winRate || b.historical.n < 20) continue;
    if (!b.recent30.winRate || b.recent30.n < 10) continue;

    const drop = b.historical.winRate - b.recent30.winRate; // >0 = dégradation
    if (drop < 0.10) continue;

    let severity = "light";
    if (drop >= 0.25) severity = "severe";
    else if (drop >= 0.15) severity = "moderate";

    alerts.push({
      bucketKey: b.bucketKey,
      setup: b.setup,
      side: b.side,
      historicalWinRate: b.historical.winRate,
      recentWinRate: b.recent30.winRate,
      drop,
      severity,
      trades: { historical: b.historical.n, recent: b.recent30.n }
    });
  }

  // Persister comme ajustements type "drift_alert" (ne crée pas de doublon si
  // une alerte active existe déjà pour ce bucket avec la même severity)
  for (const alert of alerts) {
    try {
      const existing = await supabaseFetch(env,
        `${ENGINE_ADJUSTMENTS_TABLE}?adjustment_type=eq.drift_alert&bucket_key=eq.${encodeURIComponent(alert.bucketKey)}&status=eq.shadow&severity=eq.${alert.severity}&limit=1`
      ).catch(() => []);
      if (Array.isArray(existing) && existing.length > 0) continue;

      await createEngineAdjustment(env, {
        adjustmentType: "drift_alert",
        bucketKey: alert.bucketKey,
        signalTrigger: {
          historical_win_rate: alert.historicalWinRate,
          recent_win_rate: alert.recentWinRate,
          drop_pct: alert.drop,
          trades_historical: alert.trades.historical,
          trades_recent: alert.trades.recent
        },
        severity: alert.severity,
        notes: `Drift détecté sur ${alert.bucketKey} : chute de ${(alert.drop * 100).toFixed(1)}% (${(alert.historicalWinRate * 100).toFixed(0)}% historique → ${(alert.recentWinRate * 100).toFixed(0)}% sur 30 derniers).`
      });
    } catch (e) {
      console.error("detectDriftAlerts persist failed:", e.message);
    }
  }

  return { detected: alerts.length, alerts };
}

// ============================================================
// PR #7 Phase 2 — News modulateur ±10 pts (Règle #5 niveau 2+3)
// ============================================================
// Agrégation de sentiment symbole-spécifique depuis les sources gratuites :
//   - CryptoPanic Free (crypto, 200 req/j, sentiment déjà taggé)
//   - Alpha Vantage News Sentiment (stocks/ETF, sentiment déjà taggé)
//
// Modulateur appliqué dans calcDetailScore : cap ±10 pts sur le score final.
// News ambiguës (ni bullish ni bearish selon les sources) → fallback Claude
// Haiku niveau 3 pour classer {long-positif, short-negatif, bruit-ignore}.
// Kill switch anti-hallucination : weight_tier dégradé selon win rate des
// 30 derniers trades ouverts sous influence Claude haute confiance.

// ---- CryptoPanic (gratuit, 200 req/j) ----
// Endpoint : https://cryptopanic.com/api/v1/posts/?auth_token=X&currencies=BTC
// Renvoie posts avec { votes.positive, votes.negative, votes.important, title }
async function fetchCryptoPanicSentiment(env, symbol) {
  if (!env?.CRYPTOPANIC_KEY) return null;
  const cacheKey = `cryptopanic:${symbol}`;
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  // CryptoPanic attend un code currency (BTC, ETH, ...) — extrait du symbol.
  const base = String(symbol || "").replace(/USDT?$|EUR$|USDC$/i, "").toUpperCase();
  if (!base || base.length > 8) return null;

  try {
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(env.CRYPTOPANIC_KEY)}&currencies=${encodeURIComponent(base)}&kind=news&filter=hot&public=true`;
    const res = await withTimeout(fetch(url), 5000, "cryptopanic");
    if (!res.ok) return null;
    const body = await res.json();
    const posts = Array.isArray(body?.results) ? body.results.slice(0, 30) : [];
    if (!posts.length) return null;

    let positive = 0, negative = 0, total = 0;
    let topHeadline = null;
    const ambiguousArticles = [];
    for (const post of posts) {
      const pos = Number(post?.votes?.positive || 0);
      const neg = Number(post?.votes?.negative || 0);
      positive += pos;
      negative += neg;
      total++;
      if (!topHeadline && post?.title) topHeadline = post.title;
      // Heuristique : article sans vote clair OU important tag → candidat Claude niveau 3
      if (pos + neg === 0 && post?.votes?.important > 0 && ambiguousArticles.length < 3) {
        ambiguousArticles.push({ title: post.title, url: post.url, published_at: post.published_at });
      }
    }
    const net = total > 0 ? (positive - negative) / Math.max(1, positive + negative) : 0;
    const result = {
      source: "cryptopanic",
      sentiment: Number(net.toFixed(3)),     // -1..1
      articleCount: total,
      topHeadline,
      ambiguousArticles,
      lastUpdated: nowIso()
    };
    setMemoryCache(cacheKey, 10800, result); // 3 h — nécessaire pour tenir sous CryptoPanic free 200/j avec ~20 crypto scannées toutes les 15 min
    return result;
  } catch (e) {
    return null;
  }
}

// ---- Alpha Vantage News Sentiment (gratuit pour quotidien, key déjà utilisée) ----
// Endpoint : NEWS_SENTIMENT&tickers=X
// Supporte stocks/ETF ET crypto (via préfixe CRYPTO:BTC).
async function fetchAlphaVantageNewsSentiment(env, symbol, assetClass = "stock") {
  if (!env?.ALPHAVANTAGE_KEY) return null;
  const cacheKey = `av_news:${assetClass}:${symbol}`;
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  // Format ticker AV selon asset class
  //   stock/etf : "AAPL" ou "ASML.PA" → "AAPL" (strip suffix)
  //   crypto    : "BTCUSDT" → "CRYPTO:BTC" (strip pair suffix + préfixe)
  let ticker;
  if (assetClass === "crypto") {
    const base = String(symbol || "").replace(/USDT?$|EUR$|USDC$|BUSD$/i, "").toUpperCase();
    if (!base || base.length > 8) return null;
    ticker = `CRYPTO:${base}`;
  } else {
    ticker = String(symbol || "").replace(/\.PA$|\.DE$|\.L$/i, "").toUpperCase();
    if (!ticker) return null;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(ticker)}&limit=20&apikey=${encodeURIComponent(env.ALPHAVANTAGE_KEY)}`;
    const res = await withTimeout(fetch(url), 6000, "alphavantage_news");
    if (!res.ok) return null;
    const body = await res.json();
    const feed = Array.isArray(body?.feed) ? body.feed.slice(0, 20) : [];
    if (!feed.length) return null;

    let sumScore = 0, count = 0, topHeadline = null;
    const ambiguousArticles = [];
    for (const item of feed) {
      // ticker_sentiment[].ticker_sentiment_score ∈ [-1..1]
      const tickerSent = Array.isArray(item?.ticker_sentiment) ? item.ticker_sentiment.find(t => t.ticker === ticker) : null;
      const score = tickerSent ? Number(tickerSent.ticker_sentiment_score) : null;
      if (Number.isFinite(score)) { sumScore += score; count++; }
      if (!topHeadline && item?.title) topHeadline = item.title;
      // Articles neutres mais avec relevance haute → candidats Claude
      const relevance = tickerSent ? Number(tickerSent.relevance_score) : 0;
      if ((!Number.isFinite(score) || Math.abs(score) < 0.15) && relevance > 0.5 && ambiguousArticles.length < 3) {
        ambiguousArticles.push({ title: item.title, url: item.url, published_at: item.time_published });
      }
    }
    if (count === 0) return null;
    const result = {
      source: "alphavantage_news",
      sentiment: Number((sumScore / count).toFixed(3)),
      articleCount: count,
      topHeadline,
      ambiguousArticles,
      lastUpdated: nowIso()
    };
    setMemoryCache(cacheKey, 21600, result); // 6 h — AV NEWS_SENTIMENT quota serré (~25-100/j selon tier)
    return result;
  } catch (e) {
    return null;
  }
}

// ---- Resolver unifié ----
// Pour un symbole donné, retourne un context news unifié, best-effort.
// assetClass peut être : crypto | stock | etf | forex | commodity
async function resolveSymbolNewsContext(env, symbol, assetClass) {
  if (!symbol) return null;
  const cacheKey = `news_ctx:${symbol}`;
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  let raw = null;
  if (assetClass === "crypto") {
    // Priorité CryptoPanic si clé configurée (historiquement Free 200/j, mais
    // depuis 2026 le Free a disparu → utilisateurs sans clé tombent direct en AV).
    raw = await fetchCryptoPanicSentiment(env, symbol);
    if (!raw) {
      // Fallback Alpha Vantage qui supporte nativement CRYPTO:BTC — utilise la
      // clé ALPHAVANTAGE_KEY déjà configurée pour stocks.
      raw = await fetchAlphaVantageNewsSentiment(env, symbol, "crypto");
    }
  } else if (assetClass === "stock" || assetClass === "etf") {
    raw = await fetchAlphaVantageNewsSentiment(env, symbol, "stock");
  }
  // forex, commodity, unknown : pas de news sentiment pour l'instant (sources
  // spécifiques à ajouter en follow-up).
  if (!raw) return null;

  const result = {
    ...raw,
    symbol,
    assetClass,
    // Classification simple pour le modulateur : positif >= +0.15, négatif <= -0.15
    classification: raw.sentiment >= 0.15 ? "positive" : raw.sentiment <= -0.15 ? "negative" : "neutral",
    // Claude signal sera ajouté par enrichNewsContextWithClaude si applicable
    claudeSignal: null
  };
  setMemoryCache(cacheKey, 1800, result); // 30 min en sortie resolver (la vraie API cache plus long)
  return result;
}

// ---- Claude niveau 3 : classification d'articles ambigus ----
// Appelé UNIQUEMENT sur un article sans sentiment taggé par les sources.
// Cache 6 h par hash d'URL. Retourne { direction, confidence, reason } où :
//   direction ∈ {"long-positif","short-negatif","bruit-ignore"}
//   confidence ∈ {"high","medium","low"}
async function classifyNewsArticleWithClaude(env, article) {
  if (!env?.CLAUDE_API_KEY) return null;
  if (!article?.url || !article?.title) return null;

  // Hash court pour clé de cache (sha1 tronqué 16 chars, FNV-1a ici pour éviter webcrypto)
  const urlHash = (() => {
    let h = 2166136261;
    const s = String(article.url);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, "0");
  })();
  const cacheKey = `claude_news:${urlHash}`;
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  const prompt = `Tu es un analyste financier. Classe cette news en JSON strict.
Format attendu : {"direction":"long-positif"|"short-negatif"|"bruit-ignore","confidence":"high"|"medium"|"low","reason":"string court"}
Critères :
- long-positif : impact fondamental haussier sur l'actif (earnings beat, partenariat majeur, adoption)
- short-negatif : impact fondamental baissier (hack, régulation hostile, fraude, guidance négative)
- bruit-ignore : spéculation, rumeur, analyse sans fait nouveau, ou info déjà pricée

Titre : ${article.title}
${article.summary ? `Résumé : ${article.summary}` : ""}`;

  try {
    const body = {
      model: env.CLAUDE_MODEL_HAIKU || "claude-haiku-4-5-20251001",
      max_tokens: 120,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }]
    };
    const res = await withTimeout(fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body)
    }), 8000, "claude_news");
    if (!res.ok) return null;
    const jr = await res.json();
    const text = Array.isArray(jr?.content) ? jr.content.map(c => c?.text || "").join("\n") : "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const parsed = JSON.parse((fenced ? fenced[1] : text).trim());
    if (!parsed?.direction || !["long-positif","short-negatif","bruit-ignore"].includes(parsed.direction)) return null;
    const result = {
      direction: parsed.direction,
      confidence: ["high","medium","low"].includes(parsed.confidence) ? parsed.confidence : "low",
      reason: String(parsed.reason || ""),
      url: article.url,
      title: article.title,
      classifiedAt: nowIso()
    };
    setMemoryCache(cacheKey, 21600, result); // 6 h
    return result;
  } catch {
    return null;
  }
}

// Enrichit un newsContext existant avec un signal Claude si le sentiment agrégé
// est neutre ET qu'il y a des articles ambigus pertinents. Appel best-effort,
// budget : max 1 appel Claude par cycle par symbole (via cache).
async function enrichNewsContextWithClaude(env, newsContext) {
  if (!newsContext || newsContext.classification !== "neutral") return newsContext;
  const candidates = Array.isArray(newsContext.ambiguousArticles) ? newsContext.ambiguousArticles : [];
  if (!candidates.length) return newsContext;
  // On ne classe QUE le top article pour contenir le budget.
  const top = candidates[0];
  const signal = await classifyNewsArticleWithClaude(env, top);
  if (signal) newsContext.claudeSignal = signal;
  return newsContext;
}

// ---- Modulateur de score ±10 pts ----
// Appelé dans calcDetailScore. Retourne { newsBonus, newsBonusReason } cappé ±10.
// La contribution Claude est pondérée par le kill switch (voir getClaudeNewsKillSwitchWeight).
function applyNewsModulator(newsContext, direction, claudeMaxWeight = 8) {
  if (!newsContext) return { newsBonus: 0, newsBonusReason: null };

  let bonus = 0;
  const reasons = [];

  // Niveau 2 — sentiment agrégé des sources gratuites (cap ±5)
  const sentiment = Number(newsContext.sentiment || 0);
  if (Number.isFinite(sentiment) && newsContext.articleCount >= 3) {
    // sentiment ∈ [-1..1] → bonus ∈ [-5..5]
    const sourceBonus = Math.round(clamp(sentiment * 5, -5, 5));
    if (direction === "long") bonus += sourceBonus;
    else if (direction === "short") bonus -= sourceBonus;
    if (sourceBonus !== 0) reasons.push(`${newsContext.source} sentiment=${sentiment.toFixed(2)} (${newsContext.articleCount} articles) → ${sourceBonus > 0 ? "+" : ""}${direction === "long" ? sourceBonus : -sourceBonus}`);
  }

  // Niveau 3 — signal Claude (cap ±claudeMaxWeight pts, dégradé par kill switch)
  const cs = newsContext.claudeSignal;
  if (cs?.direction && cs.direction !== "bruit-ignore" && claudeMaxWeight > 0) {
    const tierWeight = { high: claudeMaxWeight, medium: Math.round(claudeMaxWeight / 2), low: 0 }[cs.confidence] || 0;
    if (tierWeight > 0) {
      const aligned = (cs.direction === "long-positif" && direction === "long")
                   || (cs.direction === "short-negatif" && direction === "short");
      const opposed = (cs.direction === "long-positif" && direction === "short")
                   || (cs.direction === "short-negatif" && direction === "long");
      if (aligned)  { bonus += tierWeight; reasons.push(`Claude ${cs.confidence} ${cs.direction} aligné +${tierWeight}`); }
      if (opposed)  { bonus -= tierWeight; reasons.push(`Claude ${cs.confidence} ${cs.direction} opposé -${tierWeight}`); }
    }
  }

  // Cap global ±10
  const capped = clamp(bonus, -10, 10);
  return { newsBonus: capped, newsBonusReason: reasons.length ? reasons.join(" · ") : null };
}

// ---- Kill switch gradué (30 derniers trades à signal Claude high confidence) ----
// Dégrade le poids max Claude selon le win rate mesuré sur les trades qui ont été
// ouverts avec un claudeSignal de haute confiance dans leur news_context_open.
//
// Tiers : win rate ≥ 55% → ±8  |  45-55% → ±4  |  35-45% → ±2  |  < 35% → 0 (silent)
// Reset après 60 j en silent → retour ±2 en test pour 20 trades.
//
// Cache mémoire 1 h pour éviter de re-query Supabase à chaque cycle.
async function getClaudeNewsKillSwitchWeight(env) {
  const cacheKey = "claude_news_kill_switch";
  const cached = getMemoryCache(cacheKey);
  if (cached) return cached;

  if (!supabaseConfigured(env)) return 8; // défaut sans data

  try {
    // Récupère les 100 derniers feedback ; on filtre sur Claude signal high
    // confidence et on garde les 30 les plus récents.
    const rows = await supabaseFetch(env,
      `${TRADE_FEEDBACK_TABLE}?select=pnl,news_context_open,closed_at&order=closed_at.desc&limit=200`
    );
    if (!Array.isArray(rows)) { setMemoryCache(cacheKey, 3600, 8); return 8; }

    const claudeHigh = rows.filter(r => {
      const cs = r?.news_context_open?.claudeSignal;
      return cs && cs.confidence === "high" && cs.direction !== "bruit-ignore";
    }).slice(0, 30);

    if (claudeHigh.length < 10) {
      // Pas assez de data → tier haute par défaut, on observe.
      setMemoryCache(cacheKey, 3600, 8);
      return 8;
    }

    const wins = claudeHigh.filter(r => Number(r.pnl || 0) > 0).length;
    const winRate = wins / claudeHigh.length;

    let weight;
    if (winRate >= 0.55) weight = 8;
    else if (winRate >= 0.45) weight = 4;
    else if (winRate >= 0.35) weight = 2;
    else weight = 0; // silent

    setMemoryCache(cacheKey, 3600, weight);
    return weight;
  } catch {
    return 8;
  }
}

// ============================================================
// PR #9 Phase 2 — Décroissance temporelle (weighted aggregations)
// ============================================================
// Pondération exponentielle des trades anciens pour que le bot s'adapte
// aux changements de régime de marché :
//   - Trades des 30 derniers jours : poids 1.0
//   - 31-90 jours  : 0.5
//   - 91-365 jours : 0.2
//   - > 1 an       : 0.1
// Les agrégations (expectancy, win rate) sont disponibles en version
// brute ET pondérée pour que les détecteurs de correction puissent
// choisir selon leur contexte.
function computeTemporalWeight(closedAtIso) {
  if (!closedAtIso) return 1;
  const ms = new Date(closedAtIso).getTime();
  if (!Number.isFinite(ms)) return 1;
  const daysAgo = Math.max(0, (Date.now() - ms) / 86400000);
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 90) return 0.5;
  if (daysAgo <= 365) return 0.2;
  return 0.1;
}

// ============================================================
// PR #6 Phase 2 — Corrections automatiques (Règle #1)
// ============================================================
// Détecte les 7 signaux de la Règle #1 depuis mtp_trade_feedback, crée des
// ajustements en status="shadow". L'observateur (observeShadowAdjustments)
// décide ensuite d'activer ou rollback après 20 trades observés.
//
// Scope MVP :
//   Règle 1 — raise_min_score   (bucket, expectancy < 0 sur 30+ trades)
//   Règle 2 — disable_bucket    (bucket, toujours négatif sur 50+ trades)
//   Règle 3 — widen_stop        (setup, MAE moyen > 70% stop distance) — shadow only, pas appliqué
//   Règle 4 — extend_tp         (setup, MFE moyen > 1.5× tp distance) — shadow only, pas appliqué
//   Règle 5 — reduce_size       (global, 3 pertes consécutives)
//   Règle 6 — restore_size      (global, 3 gains consécutifs, rollback rule 5 active)
//   Règle 7 — retrain_weights   (global, 500+ trades) — RÉSERVÉE, pas implémentée

async function aggregateFeedbackBuckets(env, { limit = 1000 } = {}) {
  if (!supabaseConfigured(env)) return {};
  try {
    const rows = await supabaseFetch(env,
      `${TRADE_FEEDBACK_TABLE}?order=closed_at.desc&limit=${clampInt(limit, 1, 2000, 1000)}`
    );
    if (!Array.isArray(rows) || rows.length === 0) return {};

    const buckets = {};
    for (const row of rows) {
      const key = row.bucket_key || makeBucketKey(row.setup_type, row.direction, row.regime_at_open, row.asset_class);
      if (!buckets[key]) {
        buckets[key] = {
          bucketKey: key,
          setup: row.setup_type || "unknown",
          direction: row.direction || "long",
          regime: row.regime_at_open || "UNKNOWN",
          assetClass: row.asset_class || "unknown",
          n: 0, wins: 0, losses: 0,
          sumPnl: 0, sumPnlPct: 0,
          sumMaePct: 0, sumMfePct: 0,
          sumStopDistPct: 0, sumTpDistPct: 0,
          sumMaeVsStop: 0, sumMfeVsTp: 0,
          countMaeVsStop: 0, countMfeVsTp: 0,
          countStopDist: 0, countTpDist: 0,
          // PR #9 — agrégats pondérés par décroissance temporelle
          totalWeight: 0, weightedWins: 0,
          weightedSumPnl: 0, weightedSumPnlPct: 0
        };
      }
      const b = buckets[key];
      b.n++;
      const pnl = Number(row.pnl || 0);
      if (pnl > 0) b.wins++; else if (pnl < 0) b.losses++;
      b.sumPnl += pnl;
      b.sumPnlPct += Number(row.pnl_pct || 0);
      b.sumMaePct += Number(row.mae_pct || 0);
      b.sumMfePct += Number(row.mfe_pct || 0);
      if (Number.isFinite(Number(row.stop_distance_pct))) { b.sumStopDistPct += Number(row.stop_distance_pct); b.countStopDist++; }
      if (Number.isFinite(Number(row.tp_distance_pct)))   { b.sumTpDistPct   += Number(row.tp_distance_pct);   b.countTpDist++; }
      if (Number.isFinite(Number(row.mae_vs_stop_ratio))) { b.sumMaeVsStop   += Number(row.mae_vs_stop_ratio); b.countMaeVsStop++; }
      if (Number.isFinite(Number(row.mfe_vs_tp_ratio)))   { b.sumMfeVsTp     += Number(row.mfe_vs_tp_ratio);   b.countMfeVsTp++; }
      // PR #9 — accumulation pondérée (décroissance temporelle)
      const w = computeTemporalWeight(row.closed_at);
      b.totalWeight += w;
      if (pnl > 0) b.weightedWins += w;
      b.weightedSumPnl += pnl * w;
      b.weightedSumPnlPct += Number(row.pnl_pct || 0) * w;
    }

    for (const b of Object.values(buckets)) {
      b.winRate   = b.n > 0 ? b.wins / b.n : null;
      b.avgPnlPct = b.n > 0 ? b.sumPnlPct / b.n : null;
      b.expectancy = b.n > 0 ? b.sumPnl / b.n : null;
      b.avgMaePct = b.n > 0 ? b.sumMaePct / b.n : null;
      b.avgMfePct = b.n > 0 ? b.sumMfePct / b.n : null;
      b.avgStopDistPct = b.countStopDist > 0 ? b.sumStopDistPct / b.countStopDist : null;
      b.avgTpDistPct   = b.countTpDist   > 0 ? b.sumTpDistPct   / b.countTpDist   : null;
      b.avgMaeVsStop   = b.countMaeVsStop > 0 ? b.sumMaeVsStop / b.countMaeVsStop : null;
      b.avgMfeVsTp     = b.countMfeVsTp   > 0 ? b.sumMfeVsTp   / b.countMfeVsTp   : null;
      // PR #9 — expectancy et win rate pondérés (utilisés par detectCorrectionSignals)
      b.weightedWinRate    = b.totalWeight > 0 ? b.weightedWins  / b.totalWeight : null;
      b.weightedExpectancy = b.totalWeight > 0 ? b.weightedSumPnl / b.totalWeight : null;
      b.weightedAvgPnlPct  = b.totalWeight > 0 ? b.weightedSumPnlPct / b.totalWeight : null;
    }
    return buckets;
  } catch (e) {
    console.error("aggregateFeedbackBuckets failed:", e.message);
    return {};
  }
}

// Retourne { consecutiveLosses, consecutiveWins } sur les N derniers trades clos.
async function computeGlobalStreaks(env, { limit = 10 } = {}) {
  if (!supabaseConfigured(env)) return { consecutiveLosses: 0, consecutiveWins: 0 };
  try {
    const rows = await supabaseFetch(env,
      `${TRADE_TABLES.trades}?mode=eq.training&status=eq.closed&select=pnl,closed_at&order=closed_at.desc&limit=${limit}`
    );
    if (!Array.isArray(rows) || rows.length === 0) return { consecutiveLosses: 0, consecutiveWins: 0 };
    let losses = 0, wins = 0;
    // La série part du trade le plus récent ; dès qu'on change de signe on s'arrête.
    let mode = null;
    for (const row of rows) {
      const pnl = Number(row.pnl || 0);
      if (pnl === 0) break;
      const isWin = pnl > 0;
      if (mode === null) mode = isWin ? "win" : "loss";
      if (mode === "win" && !isWin) break;
      if (mode === "loss" && isWin) break;
      if (isWin) wins++; else losses++;
    }
    return { consecutiveLosses: losses, consecutiveWins: wins };
  } catch (e) {
    console.error("computeGlobalStreaks failed:", e.message);
    return { consecutiveLosses: 0, consecutiveWins: 0 };
  }
}

function detectCorrectionSignals(buckets, streaks, existingShadowOrActive) {
  const signals = [];

  // Dédup : skip si un ajustement shadow OU active existe déjà pour (type, bucket_key).
  const existingKeys = new Set();
  for (const adj of existingShadowOrActive) {
    if (adj.status !== "shadow" && adj.status !== "active") continue;
    existingKeys.add(`${adj.adjustment_type}|${adj.bucket_key || "__global__"}`);
  }
  const isDup = (type, bucketKey) => existingKeys.has(`${type}|${bucketKey || "__global__"}`);

  // Règles 1 et 2 — expectancy par bucket
  // Règle 1 : expectancy < 0 sur 30+ trades → raise_min_score +5
  // Règle 2 : toujours négatif sur 50+ trades → disable_bucket (prioritaire sur rule 1)
  for (const b of Object.values(buckets)) {
    // PR #9 — priorise l'expectancy pondérée (décroissance temporelle) quand
    // elle est disponible. Fallback vers l'expectancy brute pour les buckets
    // sans trades récents (totalWeight = 0 ou null).
    const expectancy = Number.isFinite(b.weightedExpectancy) ? b.weightedExpectancy : b.expectancy;
    const winRate    = Number.isFinite(b.weightedWinRate)    ? b.weightedWinRate    : b.winRate;
    if (!Number.isFinite(expectancy)) continue;

    if (b.n >= 50 && expectancy < 0 && winRate != null && winRate < 0.45) {
      if (!isDup("disable_bucket", b.bucketKey)) {
        signals.push({
          type: "disable_bucket",
          bucketKey: b.bucketKey,
          newValue: { disabled: true },
          signalTrigger: { n: b.n, expectancy, win_rate: winRate, avg_pnl_pct: b.weightedAvgPnlPct ?? b.avgPnlPct, weighted: Number.isFinite(b.weightedExpectancy) },
          severity: "severe",
          notes: `Bucket ${b.bucketKey} : expectancy pondérée négative (${expectancy.toFixed(2)}) sur ${b.n} trades, win rate ${(winRate * 100).toFixed(0)}%. Désactivation proposée.`
        });
      }
      continue;
    }
    if (b.n >= 30 && expectancy < 0) {
      if (!isDup("raise_min_score", b.bucketKey)) {
        signals.push({
          type: "raise_min_score",
          bucketKey: b.bucketKey,
          newValue: { boost: 5 },
          signalTrigger: { n: b.n, expectancy, win_rate: winRate, weighted: Number.isFinite(b.weightedExpectancy) },
          severity: "moderate",
          notes: `Bucket ${b.bucketKey} : expectancy pondérée négative (${expectancy.toFixed(2)}) sur ${b.n} trades. min_dossier_score +5 proposé.`
        });
      }
    }
  }

  // Règle 3 — MAE moyen > 70% du stop sur un setup
  // Agrégation au niveau setup (pas bucket) car le stop est défini par setup.
  const setupStats = {};
  for (const b of Object.values(buckets)) {
    const key = b.setup;
    if (!setupStats[key]) setupStats[key] = { setup: key, n: 0, sumMaeVsStop: 0, countMaeVsStop: 0, sumMfeVsTp: 0, countMfeVsTp: 0 };
    setupStats[key].n += b.n;
    if (b.countMaeVsStop > 0) { setupStats[key].sumMaeVsStop += b.sumMaeVsStop; setupStats[key].countMaeVsStop += b.countMaeVsStop; }
    if (b.countMfeVsTp > 0)   { setupStats[key].sumMfeVsTp   += b.sumMfeVsTp;   setupStats[key].countMfeVsTp   += b.countMfeVsTp; }
  }
  for (const s of Object.values(setupStats)) {
    if (s.n < 20) continue; // seuil minimum pour éviter le bruit
    const avgMaeVsStop = s.countMaeVsStop > 0 ? s.sumMaeVsStop / s.countMaeVsStop : null;
    const avgMfeVsTp   = s.countMfeVsTp   > 0 ? s.sumMfeVsTp   / s.countMfeVsTp   : null;

    if (avgMaeVsStop != null && avgMaeVsStop > 0.7 && !isDup("widen_stop", `setup:${s.setup}`)) {
      signals.push({
        type: "widen_stop",
        bucketKey: `setup:${s.setup}`,
        newValue: { atr_mult_delta: 0.5, applies_to: "plan_construction" },
        signalTrigger: { n: s.n, avg_mae_vs_stop_ratio: avgMaeVsStop },
        severity: "moderate",
        notes: `Setup ${s.setup} : MAE moyen = ${(avgMaeVsStop * 100).toFixed(0)}% du stop. Élargir stop de +0.5×ATR proposé (shadow — non appliqué en PR #6).`
      });
    }
    if (avgMfeVsTp != null && avgMfeVsTp > 1.5 && !isDup("extend_tp", `setup:${s.setup}`)) {
      signals.push({
        type: "extend_tp",
        bucketKey: `setup:${s.setup}`,
        newValue: { mode: "trailing", applies_to: "plan_construction" },
        signalTrigger: { n: s.n, avg_mfe_vs_tp_ratio: avgMfeVsTp },
        severity: "light",
        notes: `Setup ${s.setup} : MFE moyen = ${(avgMfeVsTp * 100).toFixed(0)}% du TP. Trailing stop proposé (shadow — non appliqué en PR #6).`
      });
    }
  }

  // Règle 5 — 3 pertes consécutives globales → reduce_size 0.5
  if (streaks.consecutiveLosses >= 3 && !isDup("reduce_size", null)) {
    signals.push({
      type: "reduce_size",
      bucketKey: null,
      newValue: { size_mult: 0.5 },
      signalTrigger: { consecutive_losses: streaks.consecutiveLosses },
      severity: "moderate",
      notes: `${streaks.consecutiveLosses} pertes consécutives. Taille de position × 0.5 jusqu'à un gain.`
    });
  }

  // Règle 6 — 3 gains consécutifs + reduce_size actif → restore_size (rollback rule 5)
  // Ici on ne crée pas un nouvel ajustement ; la logique de rollback vit dans l'observer.
  // On signale juste l'intention via un event notes côté UI.

  return signals;
}

async function createShadowAdjustmentsFromSignals(env, signals) {
  const created = [];
  for (const sig of signals) {
    try {
      const adj = await createEngineAdjustment(env, {
        adjustmentType: sig.type,
        bucketKey: sig.bucketKey,
        signalTrigger: sig.signalTrigger,
        newValue: sig.newValue,
        severity: sig.severity,
        notes: sig.notes
      });
      if (adj) created.push(adj);
    } catch (e) {
      console.error("createShadowAdjustmentsFromSignals failed:", e.message);
    }
  }
  return created;
}

// Observe les ajustements en status="shadow" : compte les trades clos depuis la
// création dans le scope de l'ajustement (bucket ou global), puis active ou
// rollback selon les critères ci-dessous. Appelée 1×/jour.
//
// Critères d'activation :
//   - raise_min_score / disable_bucket : après 20 trades dans le bucket,
//     activer si l'expectancy sur ces 20 trades est toujours < 0.
//     Rollback sinon.
//   - widen_stop / extend_tp : après 20 trades dans le setup, activer si le
//     ratio MAE/stop (resp. MFE/TP) reste au-dessus du seuil déclencheur.
//     Note : leur application côté moteur est réservée (applies_to=
//     plan_construction), mais le statut active permet d'historiser la
//     décision.
//   - reduce_size : activer immédiatement après création si 3 pertes
//     consécutives confirmées (seuil déjà atteint à la création), OU
//     rollback à la 1re gain suivant.
//   - restore_size : pas observé (créé par l'observer lui-même en rollback
//     d'un reduce_size actif).
async function observeShadowAdjustments(env) {
  if (!supabaseConfigured(env)) return { activated: 0, rolledBack: 0, reviewed: 0 };

  const shadows = await listEngineAdjustments(env, { status: "shadow", limit: 100 });
  if (!Array.isArray(shadows) || shadows.length === 0) return { activated: 0, rolledBack: 0, reviewed: 0 };

  // Pré-fetch les feedback rows récents pour éviter une requête par ajustement.
  let feedback = [];
  try {
    feedback = await supabaseFetch(env,
      `${TRADE_FEEDBACK_TABLE}?order=closed_at.desc&limit=500`
    );
  } catch (e) {
    console.error("observeShadowAdjustments feedback fetch failed:", e.message);
    return { activated: 0, rolledBack: 0, reviewed: 0 };
  }
  if (!Array.isArray(feedback)) feedback = [];

  // Active reduce_size pour savoir si on doit proposer restore_size (rule 6).
  const activeReduce = (await listEngineAdjustments(env, { status: "active", limit: 50 }))
    .filter(a => a.adjustment_type === "reduce_size");

  // Règle 6 — rollback reduce_size si 3 gains consécutifs globaux depuis son
  // activation. On ne le crée pas comme shadow séparé : on fait directement le
  // rollback (rollback_reason indique la cause).
  let activated = 0, rolledBack = 0, reviewed = 0;
  for (const adj of activeReduce) {
    const sinceMs = adj.activated_at ? new Date(adj.activated_at).getTime() : 0;
    const postTrades = feedback.filter(f => f.closed_at && new Date(f.closed_at).getTime() > sinceMs)
      .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());
    // Recherche d'une série de 3 gains consécutifs (depuis le début, ou à n'importe quel moment)
    let streakWin = 0, confirmed = false;
    for (const t of postTrades) {
      const pnl = Number(t.pnl || 0);
      if (pnl > 0) {
        streakWin++;
        if (streakWin >= 3) { confirmed = true; break; }
      } else if (pnl < 0) {
        streakWin = 0;
      }
    }
    if (confirmed) {
      await updateEngineAdjustmentStatus(env, adj.id, "rollback", {
        rollback_reason: "Règle 6 : 3 gains consécutifs depuis activation → restauration taille normale.",
        shadow_trades_observed: postTrades.length
      });
      rolledBack++;
    }
  }

  for (const adj of shadows) {
    reviewed++;
    const createdMs = adj.created_at ? new Date(adj.created_at).getTime() : 0;
    const postFeedback = feedback.filter(f => f.closed_at && new Date(f.closed_at).getTime() > createdMs);

    // Filtre par scope
    let inScope = postFeedback;
    if (adj.bucket_key && adj.bucket_key.startsWith("setup:")) {
      const setup = adj.bucket_key.slice("setup:".length);
      inScope = postFeedback.filter(f => String(f.setup_type || "").toLowerCase() === setup);
    } else if (adj.bucket_key) {
      inScope = postFeedback.filter(f => f.bucket_key === adj.bucket_key);
    }
    // Global (bucket_key null) : reduce_size / restore_size → tous les trades

    const n = inScope.length;

    if (adj.adjustment_type === "reduce_size") {
      // Activation immédiate : le seuil est déjà atteint à la création.
      // (On active dès le 1er passage de l'observer après création.)
      await updateEngineAdjustmentStatus(env, adj.id, "active", {
        shadow_trades_observed: n,
        shadow_result_better: true,
        notes: (adj.notes || "") + " | Activé : seuil déjà confirmé à la création."
      });
      activated++;
      continue;
    }

    // Pour les autres règles, on attend 20 trades
    if (n < 20) continue;

    if (adj.adjustment_type === "disable_bucket" || adj.adjustment_type === "raise_min_score") {
      const sumPnl = inScope.reduce((acc, f) => acc + Number(f.pnl || 0), 0);
      const expectancy = sumPnl / n;
      const better = expectancy < 0; // signal confirmé → la correction aurait aidé
      await updateEngineAdjustmentStatus(env, adj.id, better ? "active" : "rollback", {
        shadow_trades_observed: n,
        shadow_result_better: better,
        rollback_reason: better ? null : `Expectancy remontée à ${expectancy.toFixed(2)} sur 20 trades → signal invalidé.`
      });
      better ? activated++ : rolledBack++;
    } else if (adj.adjustment_type === "widen_stop") {
      const sum = inScope.reduce((acc, f) => acc + (Number.isFinite(Number(f.mae_vs_stop_ratio)) ? Number(f.mae_vs_stop_ratio) : 0), 0);
      const cnt = inScope.filter(f => Number.isFinite(Number(f.mae_vs_stop_ratio))).length;
      const avg = cnt > 0 ? sum / cnt : null;
      const better = avg != null && avg > 0.7;
      await updateEngineAdjustmentStatus(env, adj.id, better ? "active" : "rollback", {
        shadow_trades_observed: n,
        shadow_result_better: better,
        rollback_reason: better ? null : `MAE vs stop redescendu à ${avg != null ? (avg * 100).toFixed(0) + '%' : 'N/A'} sur 20 trades → signal invalidé.`
      });
      better ? activated++ : rolledBack++;
    } else if (adj.adjustment_type === "extend_tp") {
      const sum = inScope.reduce((acc, f) => acc + (Number.isFinite(Number(f.mfe_vs_tp_ratio)) ? Number(f.mfe_vs_tp_ratio) : 0), 0);
      const cnt = inScope.filter(f => Number.isFinite(Number(f.mfe_vs_tp_ratio))).length;
      const avg = cnt > 0 ? sum / cnt : null;
      const better = avg != null && avg > 1.5;
      await updateEngineAdjustmentStatus(env, adj.id, better ? "active" : "rollback", {
        shadow_trades_observed: n,
        shadow_result_better: better,
        rollback_reason: better ? null : `MFE vs TP redescendu à ${avg != null ? (avg * 100).toFixed(0) + '%' : 'N/A'} sur 20 trades → signal invalidé.`
      });
      better ? activated++ : rolledBack++;
    }
    // drift_alert : reste en shadow, ne s'active pas automatiquement (informatif)
  }

  if (activated > 0 || rolledBack > 0) {
    // Invalide le cache resolveActiveAdjustments pour que le prochain cycle
    // voie immédiatement les nouveaux actifs / rollbacks.
    setMemoryCache("engine_active_adjustments", 0, null);
  }
  return { activated, rolledBack, reviewed };
}

async function runCorrectionDetection(env) {
  if (!supabaseConfigured(env)) return { detected: 0, created: 0, signals: [] };
  const [buckets, streaks, existingList] = await Promise.all([
    aggregateFeedbackBuckets(env),
    computeGlobalStreaks(env, { limit: 10 }),
    listEngineAdjustments(env, { limit: 500 })
  ]);
  const signals = detectCorrectionSignals(buckets, streaks, existingList);
  const created = await createShadowAdjustmentsFromSignals(env, signals);
  if (created.length > 0) {
    await logTrainingEvent(env, "corrections_detected", {
      created: created.length,
      signals: signals.map(s => ({ type: s.type, bucket: s.bucketKey, severity: s.severity }))
    }).catch(() => {});
  }
  return { detected: signals.length, created: created.length, signals };
}

// ============================================================
// PR #9 Phase 2 — Rapport hebdomadaire Claude (Règle #1 F)
// ============================================================
// Chaque lundi 6h UTC, agrège les trades de la semaine précédente
// (lundi→dimanche), les corrections appliquées, et demande à Claude
// Sonnet un résumé pédagogique en français. Persiste dans
// mtp_weekly_reports avec unique(week_start) → dedup automatique.

const WEEKLY_REPORTS_TABLE = "mtp_weekly_reports";

// Retourne { weekStart: YYYY-MM-DD, weekEnd: YYYY-MM-DD } pour la semaine
// écoulée la plus récente (lundi → dimanche de cette semaine, en UTC).
function getPreviousWeekRange(ref = new Date()) {
  const d = new Date(ref);
  // JS getUTCDay : 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const dow = d.getUTCDay();
  // Jours à reculer pour atteindre le DIMANCHE précédent (fin de semaine)
  //   dim=0 → 7 (dimanche d'avant, exclut le jour même si ref=dim)
  //   lun=1 → 1, mar=2 → 2, ..., sam=6 → 6
  const daysToLastSunday = dow === 0 ? 7 : dow;
  const lastSunday = new Date(d);
  lastSunday.setUTCDate(d.getUTCDate() - daysToLastSunday);
  lastSunday.setUTCHours(23, 59, 59, 999);
  const lastMonday = new Date(lastSunday);
  lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);
  lastMonday.setUTCHours(0, 0, 0, 0);
  return {
    weekStart: lastMonday.toISOString().slice(0, 10),
    weekEnd: lastSunday.toISOString().slice(0, 10),
    startMs: lastMonday.getTime(),
    endMs: lastSunday.getTime()
  };
}

async function weeklyReportExists(env, weekStart) {
  if (!supabaseConfigured(env)) return false;
  try {
    const rows = await supabaseFetch(env,
      `${WEEKLY_REPORTS_TABLE}?select=id&week_start=eq.${weekStart}&limit=1`
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function collectWeeklyReportStats(env, weekStart, weekEnd) {
  const startIso = new Date(weekStart + "T00:00:00.000Z").toISOString();
  const endIso = new Date(weekEnd + "T23:59:59.999Z").toISOString();

  // Feedback de la semaine
  const feedback = await supabaseFetch(env,
    `${TRADE_FEEDBACK_TABLE}?closed_at=gte.${startIso}&closed_at=lte.${endIso}&order=closed_at.desc&limit=500`
  ).catch(() => []);

  // Ajustements activés / rollback dans la semaine
  const adjustments = await supabaseFetch(env,
    `${ENGINE_ADJUSTMENTS_TABLE}?or=(activated_at.gte.${startIso},rollback_at.gte.${startIso})&order=updated_at.desc&limit=100`
  ).catch(() => []);

  const rows = Array.isArray(feedback) ? feedback : [];
  const wins = rows.filter(r => Number(r.pnl || 0) > 0);
  const losses = rows.filter(r => Number(r.pnl || 0) < 0);
  const totalPnl = rows.reduce((acc, r) => acc + Number(r.pnl || 0), 0);
  const winRate = rows.length > 0 ? wins.length / rows.length : null;
  const avgWin = wins.length > 0 ? wins.reduce((a, r) => a + Number(r.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, r) => a + Number(r.pnl || 0), 0) / losses.length) : 0;
  const expectancy = rows.length > 0 ? totalPnl / rows.length : null;

  // Top 3 gains + top 3 pertes
  const top3Wins = [...rows].sort((a, b) => Number(b.pnl || 0) - Number(a.pnl || 0)).slice(0, 3);
  const top3Losses = [...rows].sort((a, b) => Number(a.pnl || 0) - Number(b.pnl || 0)).slice(0, 3);

  // Leaderboard par bucket (top 5 par pnl)
  const bucketAgg = {};
  for (const r of rows) {
    const key = r.bucket_key || "unknown";
    if (!bucketAgg[key]) bucketAgg[key] = { bucket: key, n: 0, pnl: 0, wins: 0 };
    bucketAgg[key].n++;
    bucketAgg[key].pnl += Number(r.pnl || 0);
    if (Number(r.pnl || 0) > 0) bucketAgg[key].wins++;
  }
  const topBuckets = Object.values(bucketAgg).sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  const bottomBuckets = Object.values(bucketAgg).sort((a, b) => a.pnl - b.pnl).filter(b => b.pnl < 0).slice(0, 3);

  const adjSummary = Array.isArray(adjustments) ? adjustments.map(a => ({
    type: a.adjustment_type,
    bucket: a.bucket_key,
    status: a.status,
    severity: a.severity,
    notes: a.notes
  })) : [];

  return {
    weekStart, weekEnd,
    trades: {
      total: rows.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      expectancy,
      rrEffective: avgLoss > 0 ? avgWin / avgLoss : null
    },
    top3Wins: top3Wins.map(r => ({ symbol: r.symbol, pnl: Number(r.pnl || 0), pnl_pct: Number(r.pnl_pct || 0), setup: r.setup_type, direction: r.direction })),
    top3Losses: top3Losses.map(r => ({ symbol: r.symbol, pnl: Number(r.pnl || 0), pnl_pct: Number(r.pnl_pct || 0), setup: r.setup_type, direction: r.direction })),
    topBuckets,
    bottomBuckets,
    adjustments: adjSummary,
    adjustmentsCount: adjSummary.length
  };
}

async function generateWeeklyReport(env, { refDate = new Date(), force = false } = {}) {
  if (!supabaseConfigured(env)) return { ok: false, reason: "supabase_not_configured" };
  if (!env?.CLAUDE_API_KEY) return { ok: false, reason: "claude_api_key_missing" };

  const range = getPreviousWeekRange(refDate);
  if (!force && await weeklyReportExists(env, range.weekStart)) {
    return { ok: true, skipped: true, reason: "already_generated", weekStart: range.weekStart };
  }

  const stats = await collectWeeklyReportStats(env, range.weekStart, range.weekEnd);
  if (stats.trades.total === 0) {
    // Persiste quand même un rapport "vide" pour traçabilité
    const row = {
      week_start: range.weekStart,
      week_end: range.weekEnd,
      report_markdown: `# Rapport semaine ${range.weekStart} → ${range.weekEnd}\n\nAucun trade clos cette semaine. Le bot est resté en observation.`,
      stats_snapshot: stats,
      trades_analyzed: 0,
      corrections_applied: stats.adjustmentsCount,
      status: "generated"
    };
    await supabaseFetch(env, `${WEEKLY_REPORTS_TABLE}?on_conflict=week_start`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([row])
    });
    return { ok: true, empty: true, weekStart: range.weekStart };
  }

  const prompt = `Tu es un coach de trading pédagogique. Résume la semaine passée d'un bot paper-trading en français markdown, sans jargon inutile.

Structure attendue :
## Synthèse (2-3 phrases)
## Chiffres clés (liste bullet)
## Patterns observés (3 bullets max)
## Corrections appliquées (ou "Aucune correction activée cette semaine")
## Recommandations pour la semaine à venir (3 bullets max)

Ton : direct, factuel, sans flatter ni dramatiser. Si la semaine est mauvaise, le dire. Si c'est bien, ne pas surjouer.

Données de la semaine ${range.weekStart} → ${range.weekEnd} :
${JSON.stringify(stats, null, 2)}`;

  const startMs = Date.now();
  try {
    const model = env.CLAUDE_MODEL_SONNET || "claude-sonnet-4-6";
    const res = await withTimeout(fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 800, temperature: 0.4, messages: [{ role: "user", content: prompt }] })
    }), 25000, "weekly_report_claude");

    const durationMs = Date.now() - startMs;
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      await supabaseFetch(env, `${WEEKLY_REPORTS_TABLE}?on_conflict=week_start`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{
          week_start: range.weekStart,
          week_end: range.weekEnd,
          stats_snapshot: stats,
          trades_analyzed: stats.trades.total,
          corrections_applied: stats.adjustmentsCount,
          claude_model: model,
          generation_duration_ms: durationMs,
          status: "failed",
          error_message: `HTTP ${res.status} ${errBody.slice(0, 300)}`
        }])
      });
      return { ok: false, reason: `claude_http_${res.status}` };
    }

    const body = await res.json();
    const markdown = Array.isArray(body?.content) ? body.content.map(c => c?.text || "").join("\n") : "";
    const usage = body?.usage || {};

    const row = {
      week_start: range.weekStart,
      week_end: range.weekEnd,
      report_markdown: markdown,
      stats_snapshot: stats,
      trades_analyzed: stats.trades.total,
      corrections_applied: stats.adjustmentsCount,
      claude_model: model,
      claude_tokens_input: Number(usage.input_tokens) || null,
      claude_tokens_output: Number(usage.output_tokens) || null,
      generation_duration_ms: durationMs,
      status: "generated"
    };
    await supabaseFetch(env, `${WEEKLY_REPORTS_TABLE}?on_conflict=week_start`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([row])
    });

    await logTrainingEvent(env, "weekly_report_generated", {
      week_start: range.weekStart,
      trades: stats.trades.total,
      tokens_out: row.claude_tokens_output,
      duration_ms: durationMs
    }).catch(() => {});

    return { ok: true, weekStart: range.weekStart, weekEnd: range.weekEnd, trades: stats.trades.total };
  } catch (e) {
    return { ok: false, reason: e.message || "unknown" };
  }
}

async function listWeeklyReports(env, { limit = 20 } = {}) {
  if (!supabaseConfigured(env)) return [];
  try {
    const rows = await supabaseFetch(env,
      `${WEEKLY_REPORTS_TABLE}?order=week_start.desc&limit=${clampInt(limit, 1, 100, 20)}`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function handleWeeklyReportGenerate(request, env) {
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const refDate = body?.week_end ? new Date(body.week_end + "T23:59:59Z") : new Date();
  const res = await generateWeeklyReport(env, { refDate, force });
  return json({ status: res.ok ? "ok" : "error", asOf: nowIso(), data: res });
}

async function handleWeeklyReportsList(url, env) {
  const limitRaw = Number(url?.searchParams?.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const rows = await listWeeklyReports(env, { limit });
  return json({ status: "ok", asOf: nowIso(), count: rows.length, data: rows });
}

async function handleEngineAdjustments(url, env) {
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const rows = await listEngineAdjustments(env, { status, limit });
  return json({ status: "ok", asOf: nowIso(), count: rows.length, data: rows });
}

// PR #6 Phase 2 — Résout les ajustements actifs en maps compactes utilisables
// par le moteur sans re-parser les rows à chaque candidat.
// Cache mémoire 2 min pour éviter un round-trip Supabase à chaque cycle.
async function resolveActiveAdjustments(env) {
  const cached = getMemoryCache("engine_active_adjustments");
  if (cached) return cached;

  const rows = await listEngineAdjustments(env, { status: "active", limit: 200 }).catch(() => []);
  const result = {
    disabledBuckets: new Set(),
    minScoreBoosts: new Map(),
    sizeMultiplier: 1,
    widenStopSetups: new Map(), // réservé, non appliqué en PR #6
    extendTpSetups: new Map(),  // réservé, non appliqué en PR #6
    raw: rows
  };
  for (const adj of rows) {
    const type = adj.adjustment_type;
    if (type === "disable_bucket" && adj.bucket_key) {
      result.disabledBuckets.add(adj.bucket_key);
    } else if (type === "raise_min_score" && adj.bucket_key) {
      const boost = Number(adj.new_value?.boost || 5);
      result.minScoreBoosts.set(adj.bucket_key, (result.minScoreBoosts.get(adj.bucket_key) || 0) + boost);
    } else if (type === "reduce_size") {
      const mult = Number(adj.new_value?.size_mult || 0.5);
      // Si plusieurs reduce_size actifs (bug), on prend le plus restrictif
      result.sizeMultiplier = Math.min(result.sizeMultiplier, mult);
    } else if (type === "widen_stop" && adj.bucket_key?.startsWith("setup:")) {
      const setup = adj.bucket_key.slice("setup:".length);
      result.widenStopSetups.set(setup, Number(adj.new_value?.atr_mult_delta || 0.5));
    } else if (type === "extend_tp" && adj.bucket_key?.startsWith("setup:")) {
      const setup = adj.bucket_key.slice("setup:".length);
      result.extendTpSetups.set(setup, adj.new_value?.mode || "trailing");
    }
  }
  setMemoryCache("engine_active_adjustments", 120, result);
  return result;
}

async function handleRunCorrectionsDetect(env) {
  const res = await runCorrectionDetection(env);
  return json({ status: "ok", asOf: nowIso(), ...res });
}

async function handleObserveShadows(env) {
  const res = await observeShadowAdjustments(env);
  // Invalide le cache pour que le prochain cycle voie les nouveaux active
  setMemoryCache("engine_active_adjustments", 0, null);
  return json({ status: "ok", asOf: nowIso(), ...res });
}

async function handleDriftDetect(env) {
  const result = await detectDriftAlerts(env);
  return json({ status: "ok", asOf: nowIso(), ...result });
}

async function handleBucketStats(env) {
  const buckets = await computeBucketStats(env);
  return json({ status: "ok", asOf: nowIso(), data: Object.values(buckets) });
}

async function handleTrending() {
  const cached = getMemoryCache("trending_coins");
  if (cached) return json(cached);
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`coingecko_http_${res.status}`);
    const body = await res.json();
    const coins = Array.isArray(body?.coins) ? body.coins.slice(0, 7) : [];
    const data = coins.map(c => {
      const item = c?.item || {};
      const pct24h = item?.data?.price_change_percentage_24h?.usd ?? null;
      return {
        id: item.id || null,
        symbol: (item.symbol || "").toUpperCase(),
        name: item.name || null,
        rank: item.market_cap_rank || null,
        pct24h: typeof pct24h === "number" ? Math.round(pct24h * 100) / 100 : null
      };
    });
    const payload = { status: "ok", source: "coingecko", asOf: nowIso(), freshness: "fresh", data };
    setMemoryCache("trending_coins", TTL.trending, payload);
    return json(payload);
  } catch (err) {
    return json({ status: "partial", source: "error", asOf: nowIso(), freshness: "unknown", message: String(err?.message || err), data: [] });
  }
}

// ============================================================
// PR #8 Phase 2 — Auto-watchlist (Règle #5 C)
// ============================================================
// Auto-add : symboles trending 3+ fois sur 7 jours (CoinGecko), max 20/mois.
// Auto-remove : actifs sans signal depuis 90 jours, sauf core + pinned.
// Historique complet dans mtp_watchlist_history.

const WATCHLIST_CONFIG = {
  trendingHistoryKey: "watchlist:trending_history",
  trendingHistoryDays: 7,
  autoAddTrendingThreshold: 3,    // nb d'apparitions trending min sur 7j
  autoRemoveDormantDays: 90,       // nb de jours sans signal avant retrait
  maxAutoAddsPerMonth: 20,
  maxPinned: 10
};
// USER_ASSETS_TABLE est déjà déclarée en haut du fichier (ligne ~109).
const WATCHLIST_HISTORY_TABLE = "mtp_watchlist_history";

// Enregistre le snapshot trending du jour en KV (rolling 7 jours)
async function recordTrendingSnapshot(env) {
  if (!env) return;
  try {
    const res = await withTimeout(fetch("https://api.coingecko.com/api/v3/search/trending"), 8000, "coingecko_trending");
    if (!res.ok) return;
    const body = await res.json();
    const symbols = Array.isArray(body?.coins)
      ? body.coins.slice(0, 15).map(c => String(c?.item?.symbol || "").toUpperCase()).filter(Boolean)
      : [];
    if (!symbols.length) return;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const history = (await kvGet(WATCHLIST_CONFIG.trendingHistoryKey, env)) || [];
    const filtered = history.filter(s => s.date !== today);
    filtered.push({ date: today, symbols });
    // Garde les 7 derniers jours
    filtered.sort((a, b) => a.date < b.date ? -1 : 1);
    const trimmed = filtered.slice(-WATCHLIST_CONFIG.trendingHistoryDays);
    await kvSet(WATCHLIST_CONFIG.trendingHistoryKey, trimmed, WATCHLIST_CONFIG.trendingHistoryDays * 24 * 3600 + 86400, env);
  } catch (e) {
    console.error("recordTrendingSnapshot failed:", e.message);
  }
}

// Compte les apparitions en trending sur les 7 derniers jours
async function countTrendingMentions(env) {
  const history = (await kvGet(WATCHLIST_CONFIG.trendingHistoryKey, env)) || [];
  const counts = new Map(); // symbol → count
  for (const snap of history) {
    if (!Array.isArray(snap.symbols)) continue;
    for (const s of snap.symbols) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  return counts;
}

async function listUserAssetsRaw(env) {
  if (!supabaseConfigured(env)) return [];
  try {
    const rows = await supabaseFetch(env, `${USER_ASSETS_TABLE}?select=*&order=created_at.desc`);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("listUserAssetsRaw failed:", e.message);
    return [];
  }
}

async function recordWatchlistHistory(env, { action, symbol, assetClass = null, reason = null, triggeredBy = null }) {
  if (!supabaseConfigured(env)) return null;
  try {
    const row = {
      action, symbol, asset_class: assetClass,
      reason: reason || {}, triggered_by: triggeredBy || "scheduled_cycle",
      created_at: nowIso()
    };
    await supabaseFetch(env, `${WATCHLIST_HISTORY_TABLE}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([row])
    });
    return row;
  } catch (e) {
    console.error("recordWatchlistHistory failed:", e.message);
    return null;
  }
}

// Compte les auto-adds du mois courant (depuis mtp_watchlist_history)
async function countAutoAddsThisMonth(env) {
  if (!supabaseConfigured(env)) return 0;
  try {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const iso = monthStart.toISOString();
    const rows = await supabaseFetch(env,
      `${WATCHLIST_HISTORY_TABLE}?select=id&action=eq.auto_add&created_at=gte.${encodeURIComponent(iso)}&limit=100`
    );
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

// Calcule le dernier timestamp d'activité (signal ou trade) par symbole
async function computeLastActivityPerSymbol(env) {
  if (!supabaseConfigured(env)) return new Map();
  const map = new Map();
  try {
    const signals = await supabaseFetch(env,
      `${SIGNAL_TABLE}?select=symbol,created_at&order=created_at.desc&limit=2000`
    ).catch(() => []);
    const trades = await supabaseFetch(env,
      `${TRADE_TABLES.trades}?select=symbol,opened_at,closed_at&mode=eq.training&order=closed_at.desc&limit=2000`
    ).catch(() => []);

    const upsert = (sym, tsStr) => {
      if (!sym || !tsStr) return;
      const ts = new Date(tsStr).getTime();
      if (!Number.isFinite(ts)) return;
      const cur = map.get(sym);
      if (!cur || ts > cur) map.set(sym, ts);
    };
    for (const r of (Array.isArray(signals) ? signals : [])) upsert(r.symbol, r.created_at);
    for (const r of (Array.isArray(trades) ? trades : [])) {
      upsert(r.symbol, r.closed_at);
      upsert(r.symbol, r.opened_at);
    }
  } catch (e) {
    console.error("computeLastActivityPerSymbol failed:", e.message);
  }
  return map;
}

async function runWatchlistScan(env) {
  if (!supabaseConfigured(env)) return { added: 0, removed: 0, skipped: 0, reason: "supabase_not_configured" };

  const summary = { added: 0, removed: 0, skipped: 0, adds: [], removes: [] };

  // 1. Enregistre le snapshot trending du jour (pour les scans futurs)
  await recordTrendingSnapshot(env);

  // 2. Charge la watchlist actuelle + l'historique d'activité
  const [assets, trendingCounts, lastActivity, addsThisMonth] = await Promise.all([
    listUserAssetsRaw(env),
    countTrendingMentions(env),
    computeLastActivityPerSymbol(env),
    countAutoAddsThisMonth(env)
  ]);

  const existingSymbols = new Set(assets.map(a => String(a.symbol || "").toUpperCase()));
  const pinnedCount = assets.filter(a => a.is_pinned).length;

  // ---- AUTO-ADD ----
  const remainingQuota = Math.max(0, WATCHLIST_CONFIG.maxAutoAddsPerMonth - addsThisMonth);
  if (remainingQuota > 0) {
    // Candidats : trending 3+ fois ET absent de la watchlist
    const candidates = [];
    for (const [sym, count] of trendingCounts.entries()) {
      if (count < WATCHLIST_CONFIG.autoAddTrendingThreshold) continue;
      // CoinGecko retourne un ticker nu (BTC, SOL) ; on doit mapper vers un symbole
      // tradeable sur Binance. Stratégie MVP : ajouter `${sym}USDT`.
      const binanceSymbol = `${sym}USDT`;
      if (existingSymbols.has(binanceSymbol)) continue;
      if (existingSymbols.has(sym)) continue; // déjà présent sous forme nue
      candidates.push({ symbol: binanceSymbol, trendingCount: count });
    }
    // Trie par count desc, prend les top N selon quota restant
    candidates.sort((a, b) => b.trendingCount - a.trendingCount);
    for (const cand of candidates.slice(0, remainingQuota)) {
      try {
        const reason = { trending_count: cand.trendingCount, days_span: WATCHLIST_CONFIG.trendingHistoryDays, source: "coingecko" };
        const row = {
          symbol: cand.symbol,
          name: cand.symbol.replace(/USDT$/, ""),
          asset_class: "crypto",
          enabled: true,
          provider_used: "binance",
          source: "auto",
          auto_added_at: nowIso(),
          auto_reason: reason,
          last_signal_at: null,
          dormant_flag: false,
          is_pinned: false
        };
        await supabaseFetch(env, `${USER_ASSETS_TABLE}?on_conflict=symbol`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([row])
        });
        await recordWatchlistHistory(env, { action: "auto_add", symbol: cand.symbol, assetClass: "crypto", reason, triggeredBy: "scheduled_cycle" });
        summary.added++;
        summary.adds.push({ symbol: cand.symbol, reason });
      } catch (e) {
        console.error("auto_add failed:", e.message);
      }
    }
  } else {
    summary.skipped++;
  }

  // ---- AUTO-REMOVE ----
  const cutoffMs = Date.now() - (WATCHLIST_CONFIG.autoRemoveDormantDays * 86400000);
  for (const asset of assets) {
    if (asset.source === "core") continue;       // core protégé
    if (asset.is_pinned) continue;               // épinglé protégé
    if (asset.source !== "auto") continue;       // on ne retire QUE les auto-added
    const sym = String(asset.symbol || "").toUpperCase();
    const lastActivityMs = lastActivity.get(sym) || 0;
    if (lastActivityMs === 0) continue;          // jamais d'activité → probablement tout juste ajouté, skip
    if (lastActivityMs > cutoffMs) continue;     // actif récent, skip

    try {
      const reason = { dormant_days: Math.round((Date.now() - lastActivityMs) / 86400000), last_activity: new Date(lastActivityMs).toISOString() };
      await supabaseFetch(env, `${USER_ASSETS_TABLE}?symbol=eq.${encodeURIComponent(sym)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });
      await recordWatchlistHistory(env, { action: "auto_remove", symbol: sym, assetClass: asset.asset_class, reason, triggeredBy: "scheduled_cycle" });
      summary.removed++;
      summary.removes.push({ symbol: sym, reason });
    } catch (e) {
      console.error("auto_remove failed:", e.message);
    }
  }

  if (summary.added > 0 || summary.removed > 0) {
    await logTrainingEvent(env, "watchlist_scan", {
      added: summary.added, removed: summary.removed,
      adds: summary.adds.slice(0, 10),
      removes: summary.removes.slice(0, 10),
      adds_quota_remaining: Math.max(0, remainingQuota - summary.added),
      pinned_count: pinnedCount
    }).catch(() => {});
  }

  return summary;
}

async function pinUserAsset(env, symbol) {
  if (!supabaseConfigured(env)) return { ok: false, error: "supabase_not_configured" };
  const clean = String(symbol || "").toUpperCase();
  if (!clean) return { ok: false, error: "invalid_symbol" };
  // Garde-fou : max 10 pins
  const assets = await listUserAssetsRaw(env);
  const currentPins = assets.filter(a => a.is_pinned).length;
  if (currentPins >= WATCHLIST_CONFIG.maxPinned) {
    return { ok: false, error: `max_pins_reached (${WATCHLIST_CONFIG.maxPinned})` };
  }
  try {
    await supabaseFetch(env, `${USER_ASSETS_TABLE}?symbol=eq.${encodeURIComponent(clean)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_pinned: true, updated_at: nowIso() })
    });
    await recordWatchlistHistory(env, { action: "manual_pin", symbol: clean, triggeredBy: "user_ui" });
    return { ok: true, symbol: clean, pinned: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function unpinUserAsset(env, symbol) {
  if (!supabaseConfigured(env)) return { ok: false, error: "supabase_not_configured" };
  const clean = String(symbol || "").toUpperCase();
  if (!clean) return { ok: false, error: "invalid_symbol" };
  try {
    await supabaseFetch(env, `${USER_ASSETS_TABLE}?symbol=eq.${encodeURIComponent(clean)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_pinned: false, updated_at: nowIso() })
    });
    await recordWatchlistHistory(env, { action: "manual_unpin", symbol: clean, triggeredBy: "user_ui" });
    return { ok: true, symbol: clean, pinned: false };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function listWatchlistHistory(env, { limit = 50 } = {}) {
  if (!supabaseConfigured(env)) return [];
  try {
    const rows = await supabaseFetch(env,
      `${WATCHLIST_HISTORY_TABLE}?order=created_at.desc&limit=${clampInt(limit, 1, 500, 50)}`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function handleWatchlistScan(env) {
  const summary = await runWatchlistScan(env);
  return json({ status: "ok", asOf: nowIso(), ...summary });
}

async function handleWatchlistHistory(url, env) {
  const limitRaw = Number(url?.searchParams?.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 50;
  const rows = await listWatchlistHistory(env, { limit });
  return json({ status: "ok", asOf: nowIso(), count: rows.length, data: rows });
}

async function handlePinAsset(request, env) {
  const body = await request.json().catch(() => ({}));
  const symbol = parseSymbol(body?.symbol || "");
  if (!symbol) return fail("symbol required", "error", 400);
  const pin = body?.pin !== false;
  const res = pin ? await pinUserAsset(env, symbol) : await unpinUserAsset(env, symbol);
  if (!res.ok) return fail(res.error || "pin_failed", "error", 400);
  return json({ status: "ok", asOf: nowIso(), data: res });
}

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
// ROUTE AI JOURNAL ANALYSIS
// ============================================================
async function handleAiJournalAnalysis(request, env) {
  const payload = await request.json().catch(() => null);
  if (!payload) return fail("Invalid payload", "error", 400);
  if (!env.CLAUDE_API_KEY) return fail("CLAUDE_API_KEY manquant", "error", 503);
  const history = Array.isArray(payload.history) ? payload.history.slice(0, 50) : [];
  if (history.length < 3) return ok({ resume: "Pas assez de trades pour analyser (minimum 3).", biais: [], patterns: [], forces: [], recommandations: ["Ferme quelques trades pour obtenir une analyse."], stats: null, crypto: null, stocks: null }, "local_fallback", nowIso(), "recent", null);
  const positions = Array.isArray(payload.positions) ? payload.positions.slice(0, 10) : [];
  const cryptoHistory = Array.isArray(payload.cryptoHistory) ? payload.cryptoHistory.slice(0, 25) : [];
  const stockHistory = Array.isArray(payload.stockHistory) ? payload.stockHistory.slice(0, 25) : [];
  const tradeRow = t => ({ symbol: t.symbol, side: t.side, result: t.result, pnlUsd: t.pnlUsd, entryPrice: t.entryPrice, exitPrice: t.exitPrice, stopLoss: t.stopLoss, takeProfit: t.takeProfit, source: t.source, closedAt: t.closedAt });
  const prompt = `Tu es un coach de trading. Analyse ce journal et identifie biais, patterns et axes d'amélioration. Distingue bien la crypto (marché 24/7, haute volatilité) des actions/ETF (heures de marché, moins volatile). Réponds UNIQUEMENT en JSON valide, sans markdown.

Journal global (${history.length} trades) : ${JSON.stringify(history.map(tradeRow))}
Crypto uniquement (${cryptoHistory.length}) : ${JSON.stringify(cryptoHistory.map(tradeRow))}
Actions/ETF uniquement (${stockHistory.length}) : ${JSON.stringify(stockHistory.map(tradeRow))}
Positions ouvertes : ${JSON.stringify(positions.map(p => ({ symbol: p.symbol, side: p.side, pnlUsd: p.pnlUsd })))}

JSON attendu :
{"resume":"string","biais":["string"],"patterns":["string"],"forces":["string"],"recommandations":["string"],"stats":{"winRate":number,"avgWinUsd":number,"avgLossUsd":number,"expectancy":number},"crypto":{"resume":"string ou null","points":["string"]},"stocks":{"resume":"string ou null","points":["string"]}}`;
  try {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 650, temperature: 0.2, messages: [{ role: "user", content: prompt }] }) }, { timeoutMs: 20000, maxRetries: 1 });
    if (!res.ok) return fail(`IA HTTP ${res.status}`, "error", 502);
    const jr = await res.json();
    const text = Array.isArray(jr?.content) ? jr.content.map(c => c?.text || "").join("\n") : "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return ok(JSON.parse((fenced ? fenced[1] : text).trim()), "claude_external", nowIso(), "recent", null);
  } catch (e) { return fail(e.message || "Erreur IA", "error", 500); }
}

// ============================================================
// ROUTE AI PORTFOLIO PRIORITY
// ============================================================
async function handleAiPortfolioPriority(request, env) {
  const payload = await request.json().catch(() => null);
  if (!payload) return fail("Invalid payload", "error", 400);
  if (!env.CLAUDE_API_KEY) return fail("CLAUDE_API_KEY manquant", "error", 503);
  const opportunities = Array.isArray(payload.opportunities) ? payload.opportunities.slice(0, 10) : [];
  if (!opportunities.length) return ok({ ranking: [], eviter: [], conseil: "Aucune opportunite disponible." }, "local_fallback", nowIso(), "recent", null);
  const positions = Array.isArray(payload.positions) ? payload.positions.slice(0, 10) : [];
  const capitalAvailable = Number(payload.capitalAvailable) || 0;
  const prompt = `Tu es un gestionnaire de portefeuille. Priorise ces opportunités de trading en tenant compte du portefeuille ouvert. Réponds UNIQUEMENT en JSON valide, sans markdown.

Capital disponible : ${capitalAvailable.toFixed(0)} EUR
Positions ouvertes : ${JSON.stringify(positions.map(p => ({ symbol: p.symbol, side: p.side, assetClass: p.assetClass })))}
Opportunités : ${JSON.stringify(opportunities.map(o => ({ symbol: o.symbol, name: o.name, assetClass: o.assetClass, score: o.officialScore, direction: o.direction, decision: o.officialDecision, confidence: o.confidence })))}

JSON attendu (champs exacts) :
{"ranking":[{"symbol":"string","raison":"string","priorite":"haute|moyenne|faible"}],"eviter":["string"],"conseil":"string"}`;
  try {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.CLAUDE_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 450, temperature: 0.1, messages: [{ role: "user", content: prompt }] }) }, { timeoutMs: 15000, maxRetries: 1 });
    if (!res.ok) return fail(`IA HTTP ${res.status}`, "error", 502);
    const jr = await res.json();
    const text = Array.isArray(jr?.content) ? jr.content.map(c => c?.text || "").join("\n") : "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return ok(JSON.parse((fenced ? fenced[1] : text).trim()), "claude_external", nowIso(), "recent", null);
  } catch (e) { return fail(e.message || "Erreur IA", "error", 500); }
}

// ============================================================
// ROUTE HEALTH
// ============================================================
async function handleHealth(request, env) {
  const adminAccess = requestHasAdminAccess(request, env);
  const circuits = {
    twelvedata: circuitStatus("twelvedata"),
    yahoo: circuitStatus("yahoo"),
    supabase: circuitStatus("supabase"),
    binance: circuitStatus("binance")
  };
  const rateWindow = rateLimiter.calls.filter(t => t > Date.now() - rateLimiter.windowMs).length;
  const basePayload = {
    app: "ManiTradePro API V2",
    engineVersion: ENGINE_VERSION,
    engineRuleset: ENGINE_RULESET,
    liveDataOnly: true,
    panel: { symbols: LIGHT_SYMBOLS.length, proxyRegime: PROXY_REGIME_SYMBOLS },
    strategies: { enabled: ["pullback","breakout","continuation"], disabled: ["mean_reversion"], shorts: true },
    cron: { configured: true, schedule: "*/30 13-20 utc weekdays + 0 */2 off-hours" },
    adminProtectionEnabled: hasConfiguredAdminToken(env)
  };
  if (!adminAccess) return ok(basePayload, "worker-v2", nowIso(), "live", null);
  return ok({
    ...basePayload,
    budgetConfig: { dailyLimit: DAILY_TWELVE_BUDGET, rateLimitPerMinute: rateLimiter.maxPerWindow, callsInLastMinute: rateWindow },
    circuits,
    kvConfigured: true,
    supabaseConfigured: supabaseConfigured(env),
    claudeConfigured: !!env?.CLAUDE_API_KEY,
    twelveKeysConfigured: getTwelveKeys(env).length,
    alphaConfigured: !!env?.ALPHAVANTAGE_KEY,
    trainingDefaults: getTrainingDefaults()
  }, "worker-v2", nowIso(), "live", null);
}

// ============================================================
// ROUTER PRINCIPAL
// ============================================================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeadersFor(request, env) });

  // POST routes
  if (request.method === "POST") {
    if (url.pathname === "/api/session") {
      return safeRoute(() => handleSessionLogin(request, env));
    }
    if (url.pathname === "/api/ai/trade-review") {
      const denied = await requireFrontAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleAiTradeReview(request, env));
    }
    if (url.pathname === "/api/ai/journal-analysis") {
      const denied = await requireFrontAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleAiJournalAnalysis(request, env));
    }
    if (url.pathname === "/api/ai/portfolio-priority") {
      const denied = await requireFrontAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleAiPortfolioPriority(request, env));
    }
    if (url.pathname === "/api/trades/sync") {
      const denied = await requireFrontAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTradesSync(request, env));
    }
    if (url.pathname === "/api/trades/wipe") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTradesWipe(request, env));
    }
    if (url.pathname === "/api/training/settings") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingSettingsSave(request, env));
    }
    if (url.pathname === "/api/training/auto-cycle") {
      // Force manuel (bouton UI Réglages) — volontairement HORS idempotence.
      // Le cron scheduled applique son propre guard last_cycle_at < 10 min
      // côté handleScheduledCycle, pas ici. L'utilisateur peut forcer à tout moment.
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingAutoCycle(env));
    }
    if (url.pathname === "/api/user-assets") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleUserAssetsAdd(request, env));
    }
    if (url.pathname === "/api/user-assets/pin") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handlePinAsset(request, env));
    }
    if (url.pathname === "/api/watchlist/scan") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleWatchlistScan(env));
    }
    if (url.pathname === "/api/reports/weekly/generate") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleWeeklyReportGenerate(request, env));
    }
    return fail("Method not allowed", "error", 405);
  }

  // DELETE routes
  if (request.method === "DELETE") {
    if (url.pathname.startsWith("/api/user-assets/")) {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      const sym = decodeURIComponent(url.pathname.replace("/api/user-assets/", ""));
      return safeRoute(() => handleUserAssetDelete(sym, env));
    }
    return fail("Method not allowed", "error", 405);
  }

  // PATCH routes
  if (request.method === "PATCH") {
    if (url.pathname.startsWith("/api/user-assets/")) {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      const sym = decodeURIComponent(url.pathname.replace("/api/user-assets/", ""));
      return safeRoute(() => handleUserAssetPatch(sym, request, env));
    }
    return fail("Method not allowed", "error", 405);
  }

  // GET routes
  if (request.method === "GET") {
    if (url.pathname === "/api/trades/state") {
      const denied = await requireFrontAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTradesState(env));
    }
    if (url.pathname === "/api/signals" || url.pathname.startsWith("/api/signals/")) {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleSignals(url, env));
    }
    if (url.pathname === "/" || url.pathname === "/health") return safeRoute(() => handleHealth(request, env));
    if (url.pathname === "/api/quotes") return safeRoute(() => handleQuotes(url, env));
    if (url.pathname.startsWith("/api/quotes/")) return safeRoute(() => handleQuotes(url, env));
    if (url.pathname.startsWith("/api/market-snapshot/")) return safeRoute(() => handleMarketSnapshot(decodeURIComponent(url.pathname.replace("/api/market-snapshot/","")), env));
    if (url.pathname.startsWith("/api/candles/")) return safeRoute(() => handleCandles(decodeURIComponent(url.pathname.replace("/api/candles/","")), url, env));
    if (url.pathname === "/api/opportunities") return safeRoute(() => handleOpportunities(url, env));
    if (url.pathname.startsWith("/api/opportunity-detail/")) return safeRoute(() => handleOpportunityDetail(decodeURIComponent(url.pathname.replace("/api/opportunity-detail/","")), env, url));
    if (url.pathname === "/api/fear-greed") return safeRoute(() => handleFearGreed());
    if (url.pathname === "/api/regime-indicators") return safeRoute(() => handleRegimeIndicators(env));
    if (url.pathname === "/api/economic-calendar") return safeRoute(() => handleEconomicCalendar(env));
    if (url.pathname === "/api/news-window") return safeRoute(() => handleNewsWindow(env));
    if (url.pathname === "/api/engine/adjustments") return safeRoute(() => handleEngineAdjustments(url, env));
    if (url.pathname === "/api/engine/drift-detect") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleDriftDetect(env));
    }
    if (url.pathname === "/api/engine/bucket-stats") return safeRoute(() => handleBucketStats(env));
    if (url.pathname === "/api/engine/corrections-detect") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleRunCorrectionsDetect(env));
    }
    if (url.pathname === "/api/engine/observe-shadows") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleObserveShadows(env));
    }
    if (url.pathname === "/api/engine/news-context" && url.searchParams.get("symbol")) {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      const symbol = parseSymbol(url.searchParams.get("symbol"));
      const assetClass = url.searchParams.get("asset_class") || getAssetClass(symbol);
      const ctx = await resolveSymbolNewsContext(env, symbol, assetClass);
      const enriched = ctx ? await enrichNewsContextWithClaude(env, ctx) : null;
      const killSwitchWeight = await getClaudeNewsKillSwitchWeight(env);
      return json({ status: "ok", asOf: nowIso(), data: { symbol, assetClass, context: enriched, claudeWeight: killSwitchWeight } });
    }
    if (url.pathname === "/api/engine/active-adjustments") {
      const adj = await resolveActiveAdjustments(env);
      return json({
        status: "ok", asOf: nowIso(),
        data: {
          disabledBuckets: Array.from(adj.disabledBuckets),
          minScoreBoosts: Array.from(adj.minScoreBoosts.entries()).map(([k, v]) => ({ bucket: k, boost: v })),
          sizeMultiplier: adj.sizeMultiplier,
          widenStopSetups: Array.from(adj.widenStopSetups.entries()).map(([k, v]) => ({ setup: k, atr_mult_delta: v })),
          extendTpSetups: Array.from(adj.extendTpSetups.entries()).map(([k, v]) => ({ setup: k, mode: v })),
          total: adj.raw.length
        }
      });
    }
    if (url.pathname === "/api/reports/weekly") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleWeeklyReportsList(url, env));
    }
    if (url.pathname === "/api/trending") return safeRoute(() => handleTrending());
    if (url.pathname === "/api/news") return safeRoute(() => handleNews(env));
    if (url.pathname === "/api/portfolio/summary") return safeRoute(() => handlePortfolioSummary());
    if (url.pathname === "/api/portfolio/positions") return safeRoute(() => handlePortfolioPositions());
    if (url.pathname === "/api/training/account") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingAccount(env));
    }
    if (url.pathname === "/api/training/positions") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingPositions(env));
    }
    if (url.pathname === "/api/training/settings") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingSettingsGet(env));
    }
    if (url.pathname === "/api/training/events") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingEvents(url, env));
    }
    if (url.pathname === "/api/training/stats") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingStats(env));
    }
    if (url.pathname === "/api/training/feedback") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleTrainingFeedback(url, env));
    }
    if (url.pathname === "/api/user-assets") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleUserAssetsList(env));
    }
    if (url.pathname === "/api/watchlist/history") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return safeRoute(() => handleWatchlistHistory(url, env));
    }
    // Route de debug état des circuits
    if (url.pathname === "/api/debug/circuits") {
      const denied = await requireAdminAccess(request, env);
      if (denied) return denied;
      return json({
        circuits: { twelvedata: circuitStatus("twelvedata"), yahoo: circuitStatus("yahoo"), supabase: circuitStatus("supabase"), binance: circuitStatus("binance") },
        rateLimiter: { callsInLastMinute: rateLimiter.calls.filter(t => t > Date.now() - rateLimiter.windowMs).length, maxPerWindow: rateLimiter.maxPerWindow }
      });
    }
    return fail("Route not found", "error", 404);
  }

  return fail("Method not allowed", "error", 405);
}

// ============================================================
// USER ASSETS — handlers CRUD
// ============================================================
async function validateSymbolOnProviders(symbol, assetClass, env, ctx) {
  const sym = String(symbol || "").toUpperCase();
  if (!sym) return { ok: false, error: "Symbole vide" };

  async function tryNonCrypto(s) {
    try {
      const qt = await getTwelveQuote(s, env, ctx).catch(() => null);
      if (qt && qt.price != null) return { provider: "twelvedata" };
    } catch {}
    try {
      const qy = await getYahooQuote(s).catch(() => null);
      if (qy && qy.price != null) return { provider: "yahoo" };
    } catch {}
    return null;
  }

  try {
    if (assetClass === "crypto") {
      const q = await getCryptoQuote(sym);
      if (q && q.price != null) return { ok: true, provider: "binance", resolvedSymbol: sym };
      return { ok: false, error: `Symbole "${sym}" introuvable sur Binance. Vérifie la paire (ex. TON → TONUSDT).` };
    }

    // 1) Essai tel quel
    let found = await tryNonCrypto(sym);
    if (found) return { ok: true, provider: found.provider, resolvedSymbol: sym };

    // 2) Auto-retry avec suffixes de bourses si pas de suffixe déjà présent
    if (!sym.includes(".") && !sym.includes("=") && !sym.includes("/")) {
      const suffixes = [".PA", ".DE", ".L", ".MI", ".AS", ".MC", ".SW", ".BR", ".LS", ".ST", ".HE", ".OL", ".CO", ".VI"];
      for (const suffix of suffixes) {
        const variant = sym + suffix;
        found = await tryNonCrypto(variant);
        if (found) return { ok: true, provider: found.provider, resolvedSymbol: variant };
      }
    }

    return { ok: false, error: `Symbole "${sym}" introuvable. Pour une action européenne, essaie avec le suffixe de bourse (ex. RMS.PA pour Paris, SAP.DE pour Francfort, RACE.MI pour Milan).` };
  } catch (e) {
    return { ok: false, error: `Erreur validation : ${e.message || "provider indisponible"}` };
  }
}

async function handleUserAssetsList(env) {
  if (!supabaseConfigured(env)) {
    return ok({ assets: [], supabaseConfigured: false }, "worker", nowIso(), "unknown", "Supabase non configuré — impossible de charger la liste.");
  }
  try {
    const rows = await supabaseFetch(env, `${USER_ASSETS_TABLE}?select=symbol,name,asset_class,enabled,provider_used,created_at,source,is_pinned,auto_added_at,auto_reason,last_signal_at,dormant_flag&order=created_at.desc`);
    return ok({ assets: Array.isArray(rows) ? rows : [], supabaseConfigured: true }, "supabase", nowIso(), "recent");
  } catch (e) {
    return fail(`Erreur chargement : ${e.message || "supabase indisponible"}`, "error", 500);
  }
}

async function handleUserAssetsAdd(request, env) {
  if (!supabaseConfigured(env)) return fail("Supabase non configuré.", "error", 503);
  let body;
  try { body = await request.json(); } catch { return fail("JSON invalide", "bad_request", 400); }

  const symbol = String(body?.symbol || "").trim().toUpperCase();
  const name = String(body?.name || "").trim() || symbol;
  const assetClass = String(body?.asset_class || "").trim().toLowerCase();

  if (!/^[A-Z0-9.=/-]{1,20}$/.test(symbol)) {
    return fail("Symbole invalide (lettres, chiffres, . = / - uniquement, max 20 caractères).", "bad_request", 400);
  }
  if (!["crypto","stock","etf","forex","commodity"].includes(assetClass)) {
    return fail("Classe d'actif invalide. Choisir parmi : crypto, stock, etf, forex, commodity.", "bad_request", 400);
  }

  // Limite 50 actifs custom
  try {
    const existing = await supabaseFetch(env, `${USER_ASSETS_TABLE}?select=symbol`);
    if (Array.isArray(existing) && existing.length >= USER_ASSETS_MAX) {
      return fail(`Limite de ${USER_ASSETS_MAX} actifs personnalisés atteinte.`, "bad_request", 400);
    }
    if (Array.isArray(existing) && existing.some(a => String(a.symbol).toUpperCase() === symbol)) {
      return fail(`Le symbole ${symbol} existe déjà dans ta liste.`, "bad_request", 409);
    }
  } catch {}

  // Protection : ne pas dupliquer un actif core
  if (LIGHT_SYMBOLS.includes(symbol)) {
    return fail(`${symbol} fait déjà partie des actifs de base.`, "bad_request", 400);
  }

  // Validation provider
  const ctx = createBudgetContext("user_asset_add");
  const v = await validateSymbolOnProviders(symbol, assetClass, env, ctx);
  if (!v.ok) return fail(v.error, "bad_request", 400);

  // Si auto-retry a résolu vers une variante (ex. RMS → RMS.PA), stocker la variante
  const finalSymbol = v.resolvedSymbol || symbol;

  // Re-vérifier que la variante résolue n'entre pas en collision avec un core ou existant
  if (LIGHT_SYMBOLS.includes(finalSymbol)) {
    return fail(`${finalSymbol} fait déjà partie des actifs de base.`, "bad_request", 400);
  }
  try {
    const existing2 = await supabaseFetch(env, `${USER_ASSETS_TABLE}?select=symbol`);
    if (Array.isArray(existing2) && existing2.some(a => String(a.symbol).toUpperCase() === finalSymbol)) {
      return fail(`Le symbole ${finalSymbol} existe déjà dans ta liste.`, "bad_request", 409);
    }
  } catch {}

  try {
    await supabaseFetch(env, USER_ASSETS_TABLE, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ symbol: finalSymbol, name, asset_class: assetClass, enabled: true, provider_used: v.provider })
    });
    invalidateUserAssetsCache();
    // Invalide aussi le cache opportunités pour que le prochain scan inclue le nouvel actif
    try { memoryCache.delete("route:opportunities:data"); } catch {}
    const resolved = finalSymbol !== symbol;
    return ok({
      symbol: finalSymbol,
      name,
      asset_class: assetClass,
      enabled: true,
      provider_used: v.provider,
      resolved_from: resolved ? symbol : null
    }, "supabase", nowIso(), "recent", resolved ? `Résolu vers ${finalSymbol} sur ${v.provider}.` : null);
  } catch (e) {
    const msg = String(e.message || "");
    if (msg.includes("409") || msg.includes("23505")) return fail(`Le symbole ${symbol} existe déjà.`, "bad_request", 409);
    return fail(`Erreur Supabase : ${msg}`, "error", 500);
  }
}

async function handleUserAssetDelete(symbol, env) {
  if (!supabaseConfigured(env)) return fail("Supabase non configuré.", "error", 503);
  const sym = String(symbol || "").trim().toUpperCase();
  if (!sym) return fail("Symbole manquant.", "bad_request", 400);
  try {
    await supabaseFetch(env, `${USER_ASSETS_TABLE}?symbol=eq.${encodeURIComponent(sym)}`, { method: "DELETE" });
    invalidateUserAssetsCache();
    try { memoryCache.delete("route:opportunities:data"); } catch {}
    return ok({ deleted: sym }, "supabase", nowIso(), "recent");
  } catch (e) {
    return fail(`Erreur suppression : ${e.message || "supabase"}`, "error", 500);
  }
}

async function handleUserAssetPatch(symbol, request, env) {
  if (!supabaseConfigured(env)) return fail("Supabase non configuré.", "error", 503);
  const sym = String(symbol || "").trim().toUpperCase();
  if (!sym) return fail("Symbole manquant.", "bad_request", 400);
  let body;
  try { body = await request.json(); } catch { return fail("JSON invalide", "bad_request", 400); }
  const patch = {};
  if (typeof body?.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 100);
  if (Object.keys(patch).length === 0) return fail("Aucun champ modifiable fourni (enabled, name).", "bad_request", 400);
  try {
    await supabaseFetch(env, `${USER_ASSETS_TABLE}?symbol=eq.${encodeURIComponent(sym)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch)
    });
    invalidateUserAssetsCache();
    try { memoryCache.delete("route:opportunities:data"); } catch {}
    return ok({ symbol: sym, ...patch }, "supabase", nowIso(), "recent");
  } catch (e) {
    return fail(`Erreur mise à jour : ${e.message || "supabase"}`, "error", 500);
  }
}

// ============================================================
// EXPORT PRINCIPAL — fetch + scheduled
// ============================================================
export default {
  async fetch(request, env) {
    try { return withCors(request, env, await handleRequest(request, env)); }
    catch (error) { return withCors(request, env, fail(safeErrorMessage(error), "error", 500)); }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledCycle(env));
  }
};
