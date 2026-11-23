// ============================================================
// ManiTradePro V2 — Learning Bot Worker
// ============================================================
//
// Worker Cloudflare INDÉPENDANT de la V1 (worker.js reste intact). Déployé
// sous le nom `manitradepro-v2` via cloudflare-worker/wrangler-v2.toml.
//
// Pipeline unique (aucune autre couche) :
//   47 actifs → données → détection setup → validation → plan → paper trade
//   → gestion position → fermeture → stockage → apprentissage.
//
// Toute la logique quantitative vit dans le module pur (testé) :
//   ../tools/v2/lib/engine-v2.mjs
//
// Sécurité : paper trading uniquement. Aucun broker, aucun argent réel.
// ============================================================

import {
  V2_UNIVERSE, V2_SYMBOLS, V2_DEFAULT_SETTINGS, getAsset,
  computeIndicators, bestSetup, validatePlan, computePositionSize,
  resolvePosition, computePnl, computeStats, riskPerTrade,
} from "../tools/v2/lib/engine-v2.mjs";

import { HISTORY_ARCHIVE, validateHistoryRows, validateArchiveContinuity } from "../tools/v2/lib/history-integrity.mjs";

import { prepareObservation, makeScanBatch } from "./paper-feed.mjs";
import { journalBinding } from "./paper-journal.mjs";
export { PaperJournal } from "./paper-journal.mjs";

const CANDLE_LIMIT = 220;            // ~1 an de bougies daily
const KV_CANDLE_TTL = 6 * 3600;      // cache bougies 6 h
const STATE_KEY = "v2:state";        // dernier scan + santé (KV, toujours dispo)
const PAPER_RELIABLE_KEY = "v2:paper:last-reliable-at";
const SETTINGS_KEY = "v2:settings";  // overrides réglages (KV)

// ---------- Réponses / CORS ----------

const DEFAULT_ORIGINS = [
  "https://emmanueldelasse-droid.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

function allowedOrigins(env) {
  const configured = String(env?.ALLOWED_ORIGINS || env?.PUBLIC_APP_ORIGINS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return configured.length ? configured : DEFAULT_ORIGINS;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins(env);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
    "Vary": "Origin",
  };
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(request, env) },
  });
}

function fail(message, status, request, env) {
  return json({ status: "error", message }, status || 400, request, env);
}

// ---------- Auth (PIN → token HMAC, identique à la V1) ----------

function adminSecret(env) {
  return String(env?.ADMIN_API_TOKEN || env?.MTP_ADMIN_TOKEN || "").trim();
}
function adminPin(env) {
  return String(env?.ADMIN_PIN || adminSecret(env) || "").trim();
}

async function createSessionToken(secret, validHours = 24) {
  const exp = Math.floor(Date.now() / 1000) + validHours * 3600;
  const payload = btoa(JSON.stringify({ exp }));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
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
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch { return false; }
}

async function isAdmin(request, env) {
  const secret = adminSecret(env);
  if (!secret) return false;
  const bearer = String(request.headers.get("Authorization") || "").trim();
  const explicit = String(request.headers.get("X-Admin-Token") || "").trim();
  const candidate = explicit || (bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "");
  if (!candidate) return false;
  if (candidate === secret) return true;
  return verifySessionToken(candidate, secret);
}

// ---------- Réglages ----------

async function loadSettings(env) {
  let overrides = {};
  try {
    const raw = await env.MTP_CACHE?.get(SETTINGS_KEY);
    if (raw) overrides = JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...V2_DEFAULT_SETTINGS, ...overrides };
}

// ---------- Symboles par provider ----------

function binanceSymbol(sym) {
  const map = { BTC: "BTCUSDT", ETH: "ETHUSDT", SOL: "SOLUSDT", BNB: "BNBUSDT", XRP: "XRPUSDT", AVAX: "AVAXUSDT" };
  return map[sym] || `${sym}USDT`;
}
function eodhdSymbol(sym) {
  const map = { ASML: "ASML.AS", LVMH: "MC.PA", SAP: "SAP.XETRA", AIR: "AIR.PA", SIE: "SIE.XETRA" };
  return map[sym] || `${sym}.US`;
}
function twelveSymbol(sym) {
  const map = { EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", AUDUSD: "AUD/USD" };
  return map[sym] || sym;
}
function yahooSymbol(sym, klass) {
  if (klass === "crypto") return `${sym}-USD`;
  const map = {
    ASML: "ASML.AS", LVMH: "MC.PA", SAP: "SAP.DE", AIR: "AIR.PA", SIE: "SIE.DE",
    EURUSD: "EURUSD=X", GBPUSD: "GBPUSD=X", USDJPY: "USDJPY=X", AUDUSD: "AUDUSD=X",
  };
  return map[sym] || sym;
}

// ---------- Récupération bougies daily ----------

async function fetchWithTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchBinance(sym) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol(sym)}&interval=1d&limit=${CANDLE_LIMIT}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`binance_${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("binance_shape");
  return rows.map((r) => ({
    time: new Date(r[0]).toISOString(),
    open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5],
  })).filter((c) => c.close > 0);
}

async function fetchEodhd(sym, env) {
  if (!env.EODHD_API_KEY) throw new Error("eodhd_disabled");
  const url = `https://eodhistoricaldata.com/api/eod/${encodeURIComponent(eodhdSymbol(sym))}?api_token=${encodeURIComponent(env.EODHD_API_KEY)}&period=d&fmt=json&order=a`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`eodhd_${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("eodhd_shape");
  return rows.map((r) => ({
    time: new Date(`${r.date}T00:00:00Z`).toISOString(),
    open: +r.open, high: +r.high, low: +r.low, close: +r.close,
    volume: Number.isFinite(+r.volume) ? +r.volume : 0,
  })).filter((c) => c.close > 0).slice(-CANDLE_LIMIT);
}

async function fetchTwelve(sym, env) {
  const keys = [env.TWELVE_KEY_1, env.TWELVE_KEY_2, env.TWELVE_KEY_3, env.TWELVE_KEY_4].filter(Boolean);
  if (!keys.length) throw new Error("twelve_disabled");
  const key = keys[Math.floor(Math.random() * keys.length)];
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(twelveSymbol(sym))}&interval=1day&outputsize=${CANDLE_LIMIT}&apikey=${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`twelve_${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.values)) throw new Error(`twelve_${data?.code || "shape"}`);
  return data.values.map((v) => ({
    time: new Date(v.datetime).toISOString(),
    open: +v.open, high: +v.high, low: +v.low, close: +v.close,
    volume: Number.isFinite(+v.volume) ? +v.volume : 0,
  })).filter((c) => c.close > 0).reverse();
}

async function fetchYahoo(sym, klass) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(sym, klass))}?interval=1d&range=1y`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`yahoo_${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  if (!Array.isArray(ts) || !q) throw new Error("yahoo_shape");
  const out = [];
  // The FX chart labels midnight in the exchange timezone (e.g. London).
  // During DST its UTC date can be the previous day.
  const sessionDate = klass === "forex" && result?.meta?.exchangeTimezoneName
    ? new Intl.DateTimeFormat("en-CA", { timeZone: result.meta.exchangeTimezoneName, year: "numeric", month: "2-digit", day: "2-digit" })
    : null;
  for (let i = 0; i < ts.length; i++) {
    const c = +q.close?.[i];
    const [o, h, l] = [q.open?.[i], q.high?.[i], q.low?.[i]].map(Number);
    if (![o,h,l].every(x => Number.isFinite(x) && x > 0) || h < Math.max(o,c) || l > Math.min(o,c)) continue;
    if (!Number.isFinite(c) || c <= 0) continue;
    out.push({
      time: new Date(ts[i] * 1000).toISOString(),
      ...(sessionDate ? { sessionDate: sessionDate.format(ts[i] * 1000) } : {}),
      open: o, high: h, low: l,
      close: c, volume: Number.isFinite(+q.volume?.[i]) ? +q.volume?.[i] : 0,
    });
  }
  return out;
}

// Dispatch par classe d'actif, avec fallback Yahoo. KV cache 6 h.
async function getCandles(asset, env) {
  const cacheKey = `v2:candles:provenance:${asset.symbol}`;
  try {
    const cached = await env.MTP_CACHE?.get(cacheKey);
    if (cached) {
      const { bars, source, fetchedAt } = JSON.parse(cached);
      if (Array.isArray(bars) && bars.length >= 60 && source && fetchedAt) {
        return Object.assign(bars, { source, fetchedAt });
      }
    }
  } catch { /* ignore */ }

  let candles = null;
  let source = null;
  const tryFetch = async (fn, name) => {
    if (candles) return;
    try {
      const r = await fn();
      if (Array.isArray(r) && r.length >= 60) { candles = r; source = name; }
    } catch { /* fallthrough */ }
  };

  if (asset.class === "crypto") {
    await tryFetch(() => fetchBinance(asset.symbol), "binance");
    await tryFetch(() => fetchYahoo(asset.symbol, asset.class), "yahoo");
  } else if (asset.class === "forex") {
    await tryFetch(() => fetchTwelve(asset.symbol, env), "twelve");
    await tryFetch(() => fetchYahoo(asset.symbol, asset.class), "yahoo");
  } else {
    await tryFetch(() => fetchEodhd(asset.symbol, env), "eodhd");
    if (asset.class !== "eu_stock") await tryFetch(() => fetchTwelve(asset.symbol, env), "twelve");
    await tryFetch(() => fetchYahoo(asset.symbol, asset.class), "yahoo");
  }

  if (candles) {
    const fetchedAt = new Date().toISOString();
    try { await env.MTP_CACHE?.put(cacheKey, JSON.stringify({ bars: candles, source, fetchedAt }), { expirationTtl: KV_CANDLE_TTL }); } catch { /* cache optional */ }
    Object.assign(candles, { source, fetchedAt });
  }
  return candles ? Object.assign(candles, { source }) : null;
}

// ============================================================
// STOCKAGE — Supabase si configuré, sinon repli KV.
// ============================================================

function supaConfigured(env) { return !!(env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY); }
function supaHeaders(env, extra = {}) {
  return { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, ...extra };
}
async function supa(env, path, options = {}) {
  const base = String(env.SUPABASE_URL).replace(/\/$/, "");
  const res = await fetchWithTimeout(`${base}/rest/v1/${path}`, { ...options, headers: supaHeaders(env, options.headers || {}) }, 9000);
  if (!res.ok) throw new Error(`supabase_${res.status}:${await res.text().catch(() => "")}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

const TBL = { positions: "mtp_v2_positions", trades: "mtp_v2_trades", cycles: "mtp_v2_cycles", stats: "mtp_v2_setup_stats" };
const KV = { positions: "v2:positions", trades: "v2:trades", cycles: "v2:cycles" };

async function kvGet(env, key, fallback) {
  try { const raw = await env.MTP_CACHE?.get(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
async function kvPut(env, key, val) {
  try { await env.MTP_CACHE?.put(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// The original V2 ledger is in Supabase. A missing KV key or binding is not
// evidence that its ledger was read successfully. Never initialize on read.
async function readLedgerKv(env, key) {
  if (!env.MTP_CACHE) throw new Error("kv_unconfigured");
  const raw = await env.MTP_CACHE.get(key);
  if (raw == null) throw new Error("kv_ledger_missing");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("kv_ledger_invalid");
  return rows;
}

async function getOpenPositions(env) {
  if (supaConfigured(env)) {
    const rows = await supa(env, `${TBL.positions}?status=eq.open&select=*&order=opened_at.asc`);
    if (!Array.isArray(rows)) throw new Error("source_shape");
    return rows;
  }
  return readLedgerKv(env, KV.positions);
}

async function getClosedTrades(env, limit = Infinity) {
  if (!supaConfigured(env)) {
    return (await readLedgerKv(env, KV.trades)).slice().reverse().slice(0, limit);
  }
  // PostgREST caps each range. Read the exact total even if the project cap is
  // smaller than the requested page. Concurrent additions invalidate the read.
  const rows = [];
  let total;
  do {
    const size = Math.min(500, limit - rows.length);
    const path = `${TBL.trades}?select=*&order=closed_at.desc,id.asc&limit=${size}&offset=${rows.length}`;
    const base = String(env.SUPABASE_URL).replace(/\/$/, "");
    const res = await fetchWithTimeout(`${base}/rest/v1/${path}`, { headers: supaHeaders(env, { Prefer: "count=exact" }) }, 9000);
    if (!res.ok) throw new Error("closed_trades_unavailable");
    const range = res.headers.get("Content-Range") || "";
    const match = /\/(\d+)$/.exec(range);
    if (!match || (total != null && total !== Number(match[1]))) throw new Error("ledger_count_changed");
    total = Number(match[1]);
    const page = await res.json();
    if (!Array.isArray(page) || (!page.length && rows.length < total)) throw new Error("ledger_page_incomplete");
    rows.push(...page);
  } while (rows.length < Math.min(total, limit));
  return rows;
}

async function getCycles(env, limit = 50) {
  if (supaConfigured(env)) {
    return await supa(env, `${TBL.cycles}?select=*&order=started_at.desc&limit=${limit}`);
  }
  if (!env.MTP_CACHE) throw new Error("Stockage indisponible");
  const raw = await env.MTP_CACHE.get(KV.cycles);
  if (!raw) throw new Error("Historique des cycles indisponible");
  const all = JSON.parse(raw);
  return all.slice().reverse().slice(0, limit);
}

async function insertPosition(env, pos) {
  if (supaConfigured(env)) {
    await supa(env, TBL.positions, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(toPositionRow(pos)) });
    return;
  }
  const arr = await readLedgerKv(env, KV.positions);
  arr.push(pos);
  await env.MTP_CACHE.put(KV.positions, JSON.stringify(arr));
}

async function closePositionStore(env, pos, trade) {
  // Write once by position UUID before removing the open position. A retry
  // after a failed PATCH cannot lose the close or replace its original price.
  if (supaConfigured(env)) {
    await supa(env, `${TBL.trades}?on_conflict=id`, { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(toTradeRow(trade)) });
    await supa(env, `${TBL.positions}?id=eq.${encodeURIComponent(pos.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "closed" }) });
    return;
  }
  const trades = await readLedgerKv(env, KV.trades);
  if (!trades.some(t => t.id === trade.id)) {
    trades.push(trade);
    await env.MTP_CACHE.put(KV.trades, JSON.stringify(trades));
  }
  const positions = await readLedgerKv(env, KV.positions);
  await env.MTP_CACHE.put(KV.positions, JSON.stringify(positions.filter(p => p.id !== pos.id)));
}

async function insertCycle(env, cycle) {
  if (supaConfigured(env)) {
    await supa(env, TBL.cycles, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(cycle) });
    return;
  }
  const arr = await kvGet(env, KV.cycles, []);
  arr.push(cycle);
  await kvPut(env, KV.cycles, arr.slice(-200));
}

async function upsertSetupStats(env, stats) {
  if (!supaConfigured(env)) return;
  const rows = Object.entries(stats.bySetup).map(([setup_type, s]) => ({
    setup_type,
    trades: s.trades, wins: s.wins, losses: s.losses,
    win_rate: s.winRate, profit_factor: s.profitFactor,
    expectancy: s.expectancy, avg_win: s.avgWin, avg_loss: s.avgLoss,
    total_pnl: s.totalPnl, max_drawdown: s.maxDrawdown,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  await supa(env, `${TBL.stats}?on_conflict=setup_type`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

// Sonde de diagnostic : statut brut d'un appel REST Supabase (debug temporaire).
async function supaProbe(env) {
  if (!supaConfigured(env)) return { store: "kv" };
  try {
    const base = String(env.SUPABASE_URL).replace(/\/$/, "");
    const res = await fetchWithTimeout(`${base}/rest/v1/${TBL.cycles}?select=id&limit=1`, { headers: supaHeaders(env) }, 9000);
    const body = await res.text().catch(() => "");
    return { store: "supabase", ok: res.ok, status: res.status, body: String(body).slice(0, 300) };
  } catch (e) {
    return { store: "supabase", ok: false, error: String(e?.message || e) };
  }
}

function toPositionRow(p) {
  return {
    id: p.id, symbol: p.symbol, setup_type: p.setupType, direction: p.direction,
    entry: p.entry, stop_loss: p.stopLoss, take_profit: p.takeProfit, rr: p.rr,
    qty: p.qty, opened_at: p.openedAt, opened_bar_time: p.openedBarTime || null,
    reason: p.reason, status: "open",
  };
}
function toTradeRow(t) {
  return {
    id: t.id, symbol: t.symbol, setup_type: t.setupType, direction: t.direction,
    entry: t.entry, exit: t.exit, stop_loss: t.stopLoss, take_profit: t.takeProfit,
    rr: t.rr, qty: t.qty, pnl: t.pnl, pnl_pct: t.pnlPct,
    opened_at: t.openedAt, closed_at: t.closedAt, duration_hours: t.durationHours,
    exit_reason: t.exitReason,
  };
}

// Normalise une position lue depuis Supabase (snake_case) ou KV (camelCase).
function normalizePosition(row) {
  return {
    id: row.id, symbol: row.symbol,
    setupType: row.setupType || row.setup_type,
    direction: row.direction,
    entry: +row.entry, stopLoss: +(row.stopLoss ?? row.stop_loss),
    takeProfit: +(row.takeProfit ?? row.take_profit), rr: +row.rr, qty: +row.qty,
    openedAt: row.openedAt || row.opened_at,
    openedBarTime: row.openedBarTime || row.opened_bar_time || null,
    reason: row.reason,
  };
}
function normalizeTrade(row) {
  return {
    id: row.id, symbol: row.symbol,
    setupType: row.setupType || row.setup_type,
    direction: row.direction,
    entry: +row.entry, exit: +row.exit,
    stopLoss: +(row.stopLoss ?? row.stop_loss), takeProfit: +(row.takeProfit ?? row.take_profit),
    rr: +row.rr, qty: +row.qty, pnl: +row.pnl, pnlPct: +(row.pnlPct ?? row.pnl_pct),
    openedAt: row.openedAt || row.opened_at, closedAt: row.closedAt || row.closed_at,
    durationHours: +(row.durationHours ?? row.duration_hours), exitReason: row.exitReason || row.exit_reason,
  };
}

// ============================================================
// CYCLE — le cœur du bot
// ============================================================

async function runCycle(env) {
  const startedAt = new Date().toISOString();
  const settings = await loadSettings(env);
  // The independent prospective journal can still collect the market tape
  // during a legacy-store outage. Never open legacy trades against unknown risk.
  let openRows = null;
  try { openRows = (await getOpenPositions(env)).map(normalizePosition); } catch { /* protected below */ }
  const openBySymbol = new Set(openRows?.map((p) => p.symbol) || []);
  const observations = [];

  // 1) Scanner les 47 actifs : données + indicateurs + meilleur setup.
  const scans = [];
  const opportunities = [];
  let scanned = 0;
  let errors = 0;
  // Debug temporaire (audit écritures Supabase).
  const positionInsertErrors = [];
  const tradeInsertErrors = [];
  let cycleInsertError = null;
  let statsError = null;

  const latestPriceBySymbol = {};

  for (const asset of V2_UNIVERSE) {
    let candles = null;
    try { candles = await getCandles(asset, env); } catch { candles = null; }
    if (!candles || candles.length < 60) { errors++; scans.push({ symbol: asset.symbol, status: "no_data" }); continue; }
    scanned++;
    const last = candles[candles.length - 1];
    latestPriceBySymbol[asset.symbol] = last;
    const observedAt = new Date().toISOString();
    const observation = prepareObservation(asset, candles, observedAt);
    const ind = observation?.ind || computeIndicators(candles);
    if (!ind) { scans.push({ symbol: asset.symbol, status: "insufficient" }); continue; }
    const setup = observation ? observation.setup : bestSetup(ind, asset.symbol);
    // Preserve even a legacy alert based on incomplete/malformed input as a
    // rejected decision, without admitting its price to the execution tape.
    observations.push(observation || {
      asset, ind, setup, bars: [], source: candles.source || null, fetchedAt: candles.fetchedAt || null,
      barTime: Number.isFinite(Date.parse(last.time)) ? last.time : observedAt,
      barTimeKnown: Number.isFinite(Date.parse(last.time)), observedAt, dataUsable: false, qualityReason: "invalid_feed",
    });
    if (!setup) { scans.push({ symbol: asset.symbol, status: "no_setup" }); continue; }
    const v = validatePlan(setup, settings);
    if (!v.valid) { scans.push({ symbol: asset.symbol, status: "invalid_setup", reason: v.reason }); continue; }
    // Opportunité = setup détecté ET plan valide ET ouvrable.
    const opp = {
      symbol: asset.symbol, name: asset.name, class: asset.class,
      setupType: setup.setupType, direction: setup.direction,
      entry: setup.entry, stopLoss: setup.stopLoss, takeProfit: setup.takeProfit,
      rr: setup.rr, reason: setup.reason, source: candles.source || null,
      barTime: last.time, // bougie d'entrée → garde anti fermeture immédiate
      alreadyOpen: openBySymbol.has(asset.symbol),
    };
    opportunities.push(opp);
    scans.push({ symbol: asset.symbol, status: "opportunity", setupType: setup.setupType });
  }

  const journal = journalBinding(env);
  let paperJournal = "unavailable";
  let coverage = null;
  if (journal) {
    try {
      const cursorResponse = await journal.fetch("https://paper.internal/cursor");
      if (!cursorResponse.ok) throw new Error("cursor_unavailable");
      const checkpoint = await cursorResponse.json();
      const observedAt = new Date().toISOString();
      const batch = makeScanBatch(observations, checkpoint.settings || settings, observedAt, V2_SYMBOLS);
      coverage = batch.coverage;
      const warmup = Date.parse(observedAt) - 8 * 86_400_000;
      batch.bars = batch.bars.filter(bar => checkpoint.cursors[bar.symbol]
        ? bar.openAt > checkpoint.cursors[bar.symbol] : Date.parse(bar.closeAt) >= warmup);
      const result = await journal.fetch("https://paper.internal/scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch),
      });
      if (!result.ok) throw new Error("append_failed");
      const receipt = await result.json();
      if (receipt.lastReliableAt === observedAt) await kvPut(env, PAPER_RELIABLE_KEY, observedAt);
      paperJournal = receipt.lastReliableAt === observedAt ? "ok" : "partial";
    } catch {
      console.error("v2_paper_journal_unavailable");
    }
  }
  if (!openRows) {
    // The tape commit is independent of the legacy account. Preserve health
    // for the completed market scan without fabricating an empty portfolio.
    const finishedAt = new Date().toISOString();
    const health = { active: scanned > 0, lastCycle: finishedAt, scanned, detected: opportunities.length,
      openPositions: null, closedThisCycle: null, errors, legacyUnavailable: true, paperJournal, coverage,
      store: supaConfigured(env) ? "supabase" : "kv" };
    const cycle = { started_at: startedAt, finished_at: finishedAt, scanned, detected: opportunities.length,
      opened: null, closed: null, errors };
    await kvPut(env, STATE_KEY, { health, opportunities, updatedAt: finishedAt });
    return { health, cycle, stats: null, opportunities, paperJournal, legacyUnavailable: true };
  }
  // 2) Gérer les positions ouvertes : stop / target / temps.
  //
  // RÈGLE ANTI « fermeture immédiate » : une position daily/swing ne peut JAMAIS
  // être fermée par la même bougie qui a servi à l'ouverture (ni par une bougie
  // antérieure). On n'évalue stop/TP que sur une bougie STRICTEMENT postérieure
  // à la bougie d'ouverture (`openedBarTime`). Sans ça, la bougie daily du jour
  // d'entrée contient déjà tout le range intraday → stop touché en 0 minute.
  let closed = 0;
  for (const pos of openRows) {
    const candle = latestPriceBySymbol[pos.symbol];
    if (!candle) continue;
    const openedBarMs = new Date(pos.openedBarTime || pos.openedAt).getTime();
    const candleMs = new Date(candle.time).getTime();
    // Bougie d'ouverture (ou antérieure) → on ne touche pas. On attend la suite.
    if (!(candleMs > openedBarMs)) continue;
    const heldMs = Date.now() - new Date(pos.openedAt).getTime();
    const heldDays = heldMs / (24 * 3600 * 1000);
    const forceTimeExit = heldDays >= settings.maxHoldDays;
    const res = resolvePosition(pos, candle, { forceTimeExit });
    if (!res) continue;
    const { pnl, pnlPct } = computePnl(pos, res.exit);
    const closedAt = new Date().toISOString();
    // Durée en heures basée sur les bougies (jamais 0 pour une position swing).
    const barDurationH = Math.round((candleMs - openedBarMs) / 3600000);
    const trade = {
      id: pos.id, symbol: pos.symbol, setupType: pos.setupType, direction: pos.direction,
      entry: pos.entry, exit: res.exit, stopLoss: pos.stopLoss, takeProfit: pos.takeProfit,
      rr: pos.rr, qty: pos.qty, pnl, pnlPct,
      openedAt: pos.openedAt, closedAt, durationHours: Math.max(barDurationH, Math.round(heldMs / 3600000)),
      exitReason: res.exitReason,
    };
    try { await closePositionStore(env, pos, trade); closed++; openBySymbol.delete(pos.symbol); }
    catch (e) { errors++; if (tradeInsertErrors.length < 5) tradeInsertErrors.push(String(e?.message || e)); }
  }

  // 3) Ouvrir de nouveaux paper trades pour les opportunités.
  let openCount = openBySymbol.size;
  let opened = 0;
  // Priorité au meilleur rr (apprentissage : on prend, on ne sur-filtre pas).
  const sortedOpps = opportunities.slice().sort((a, b) => b.rr - a.rr);
  for (const opp of sortedOpps) {
    if (openCount >= settings.maxOpenPositions) break;
    if (openBySymbol.has(opp.symbol)) continue;
    const qty = computePositionSize(opp, settings);
    if (!(qty > 0)) continue;
    const pos = {
      id: crypto.randomUUID(),
      symbol: opp.symbol, setupType: opp.setupType, direction: opp.direction,
      entry: opp.entry, stopLoss: opp.stopLoss, takeProfit: opp.takeProfit,
      rr: opp.rr, qty, openedAt: new Date().toISOString(), openedBarTime: opp.barTime, reason: opp.reason,
    };
    try {
      await insertPosition(env, pos);
      openBySymbol.add(opp.symbol);
      openCount++;
      opened++;
      opp.opened = true;
    } catch (e) { errors++; if (positionInsertErrors.length < 5) positionInsertErrors.push(`${opp.symbol}: ${String(e?.message || e)}`); }
  }

  // 4) Stocker le cycle + recalculer les stats d'apprentissage.
  const finishedAt = new Date().toISOString();
  const cycle = {
    started_at: startedAt, finished_at: finishedAt,
    scanned, detected: opportunities.length, opened, closed, errors,
    note: supaConfigured(env) ? "supabase" : "kv",
  };
  try { await insertCycle(env, cycle); } catch (e) { cycleInsertError = String(e?.message || e); }

  let stats = null;
  try {
    const trades = (await getClosedTrades(env, 2000)).map(normalizeTrade);
    stats = computeStats(trades);
    await upsertSetupStats(env, stats);
  } catch (e) { statsError = String(e?.message || e); }

  const health = {
    active: scanned > 0, paperJournal, coverage, legacyUnavailable: false,
    lastCycle: finishedAt,
    scanned, detected: opportunities.length,
    openPositions: openCount, closedThisCycle: closed, errors,
    store: supaConfigured(env) ? "supabase" : "kv",
  };

  // État rapide en KV (toujours dispo, lecture publique sans rescanner).
  await kvPut(env, STATE_KEY, { health, opportunities, updatedAt: finishedAt });

  // Debug temporaire (audit écritures Supabase). À retirer une fois validé.
  const debug = {
    supabase: await supaProbe(env),
    riskPerTrade: riskPerTrade(settings),
    riskPerTradePct: settings.riskPerTradePct,
    positionInsertErrors,
    tradeInsertErrors,
    cycleInsertError,
    statsError,
  };

  return { health, opportunities, cycle, stats, debug, paperJournal };
}

// ============================================================
// ROUTES
// ============================================================

async function handleHealth(request, env) {
  const state = await kvGet(env, STATE_KEY, null);
  let openPositions = null;
  try { openPositions = (await getOpenPositions(env)).length; } catch { /* unknown */ }
  const cycles = await getCycles(env, 1).catch(() => null);
  const legacyUnavailable = openPositions === null || !cycles;
  const lastCycle = state?.health?.lastCycle || cycles?.[0]?.finished_at || null;
  const recent = Number.isFinite(Date.parse(lastCycle)) && Date.now() - Date.parse(lastCycle) <= 7_200_000;
  const active = recent && state?.health?.scanned > 0;
  const status = !recent ? "unavailable" : legacyUnavailable || !active || state?.health?.paperJournal !== "ok" ? "partial" : "ok";
  return json({
    status, legacyUnavailable, paperJournal: state?.health?.paperJournal || "unavailable",
    coverage: state?.health?.coverage || null,
    bot: "ManiTradePro V2 Learning Bot",
    active, lastCycle,
    scanned: state?.health?.scanned ?? null,
    detected: state?.health?.detected ?? null,
    openPositions,
    store: supaConfigured(env) ? "supabase" : "kv",
    universeSize: V2_SYMBOLS.length,
  }, status === "unavailable" ? 503 : 200, request, env);
}

async function handleHistory(request, env, options) {
  const markerKey = "v2:verified-legacy-history:v1";
  const marker = await kvGet(env, markerKey, null);
  const lastReliableAt = marker?.verifiedAt || HISTORY_ARCHIVE.lastReliableAt;
  try {
    const rows = await getClosedTrades(env);
    validateHistoryRows(rows);
    validateArchiveContinuity(rows);
    if (marker && rows.length < marker.tradeCount) throw new Error("ledger_regressed");
    const trades = rows.map(normalizeTrade);
    const verifiedAt = new Date().toISOString();
    const source = supaConfigured(env) ? TBL.trades : KV.trades;
    if (!marker || marker.tradeCount !== rows.length || marker.verifiedAt.slice(0, 10) !== verifiedAt.slice(0, 10)) {
      await kvPut(env, markerKey, { tradeCount: rows.length, verifiedAt });
    }
    const metadata = { status: "ok", source, verifiedAt, totalCount: trades.length };
    if (options) {
      const page = trades.slice(options.offset, options.offset + options.limit);
      return json({ ...metadata, count: page.length, trades: page }, 200, request, env);
    }
    return json({ ...metadata, ...computeStats(trades), tradeCount: trades.length }, 200, request, env);
  } catch {
    return json({ status: "unavailable", message: "Données indisponibles", lastReliableAt }, 503, request, env);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (path === "/" || path === "/api/v2" || path === "/api/v2/ping") {
        return json({ status: "ok", bot: "ManiTradePro V2", endpoints: [
          "/api/v2/health", "/api/v2/universe", "/api/v2/opportunities",
          "/api/v2/positions", "/api/v2/trades", "/api/v2/stats", "/api/v2/paper",
          "POST /api/v2/cycle (admin)", "POST /api/v2/session/login",
          "GET/POST /api/v2/settings",
        ] }, 200, request, env);
      }

      if (path === "/api/v2/health") return handleHealth(request, env);

      if (path === "/api/v2/paper") {
        if (request.method !== "GET") return fail("Lecture seule", 405, request, env);
        const journal = journalBinding(env);
        if (journal) {
          try {
            const report = await journal.fetch("https://paper.internal/report" + url.search);
            return json(await report.json(), report.status, request, env);
          } catch { /* durable storage unavailable */ }
        }
        return json({ status: "unavailable", message: "Données indisponibles",
          dashboard: null, decisions: [], asOf: null, lastReliableAt: await kvGet(env, PAPER_RELIABLE_KEY, null) }, 503, request, env);
      }

      if (path === "/api/v2/universe") {
        return json({ status: "ok", count: V2_UNIVERSE.length, assets: V2_UNIVERSE }, 200, request, env);
      }

      if (path === "/api/v2/opportunities") {
        const state = await kvGet(env, STATE_KEY, null);
        if (!state?.updatedAt || !Array.isArray(state.opportunities)) return json({
          status: "unavailable", message: "Données indisponibles", updatedAt: null,
        }, 503, request, env);
        return json({ status: "ok", updatedAt: state.updatedAt, opportunities: state.opportunities }, 200, request, env);
      }

      if (path === "/api/v2/positions") {
        const positions = (await getOpenPositions(env)).map(normalizePosition);
        return json({ status: "ok", count: positions.length, positions }, 200, request, env);
      }

      if (path === "/api/v2/trades") {
        const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 200));
        const offset = Math.max(0, parseInt(url.searchParams.get("offset"), 10) || 0);
        return await handleHistory(request, env, { offset, limit });
      }

      if (path === "/api/v2/stats") return await handleHistory(request, env);

      if (path === "/api/v2/cycles") {
        const cycles = await getCycles(env, 50);
        return json({ status: "ok", count: cycles.length, cycles }, 200, request, env);
      }

      if (path === "/api/v2/session/login" && request.method === "POST") {
        const pin = adminPin(env);
        const secret = adminSecret(env);
        if (!pin || !secret) return fail("Auth non configurée sur le worker", 503, request, env);
        let body = {};
        try { body = await request.json(); } catch { /* ignore */ }
        if (String(body?.pin || "").trim() !== pin) return fail("PIN invalide", 403, request, env);
        const token = await createSessionToken(secret, 24);
        return json({ status: "ok", token, expiresIn: 86400 }, 200, request, env);
      }

      if (path === "/api/v2/settings") {
        if (request.method === "GET") {
          const s = await loadSettings(env);
          return json({ status: "ok", settings: s, riskPerTrade: riskPerTrade(s) }, 200, request, env);
        }
        if (request.method === "POST") {
          if (!(await isAdmin(request, env))) return fail("Admin requis", 403, request, env);
          let body = {};
          try { body = await request.json(); } catch { /* ignore */ }
          const current = await loadSettings(env);
          const next = { ...current };
          for (const k of ["rrMin", "maxOpenPositions", "maxHoldDays", "riskPerTradePct", "startingEquity"]) {
            if (Number.isFinite(Number(body?.[k]))) next[k] = Number(body[k]);
          }
          await kvPut(env, SETTINGS_KEY, next);
          return json({ status: "ok", settings: next }, 200, request, env);
        }
      }

      if (path === "/api/v2/cycle" && request.method === "POST") {
        if (!(await isAdmin(request, env))) return fail("Admin requis", 403, request, env);
        const result = await runCycle(env);
        return json({ status: result.legacyUnavailable || result.paperJournal !== "ok" ? "partial" : "ok", ...result }, 200, request, env);
      }

      if (path === "/api/v2/reset" && request.method === "POST") {
        return fail("Historique conservé. La réinitialisation destructive est désactivée.", 410, request, env);
      }

      return fail("not_found", 404, request, env);
    } catch (e) {
      return fail(String(e?.message || e), 500, request, env);
    }
  },

  // Cron : un cycle complet à chaque déclenchement (cf. wrangler-v2.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCycle(env).catch((e) => console.error("v2_cycle_failed", e?.message || e)));
  },
};
