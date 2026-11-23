// Session envelopes for daily OHLC. Use regular exchange hours in their local
// timezone (including DST). A conservative later close on half-days only
// delays recognition. Never treat a partial cached candle as a finished bar.
import { bestSetup, computeIndicators, validatePlan } from "../tools/v2/lib/engine-v2.mjs";
import { buildPaperDecision } from "./paper-engine.mjs";

const DAY = 86_400_000;
const formatters = new Map();
const clocks = new Map();

function venueClock(day, hour, minute, zone) {
  const key = [day, hour, minute, zone].join("|");
  if (clocks.has(key)) return clocks.get(key);
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hour: "2-digit", hourCycle: "h23",
    }));
  }
  const noon = Date.parse(day + "T12:00:00Z");
  const offset = Number(formatters.get(zone).format(noon)) - 12;
  const result = new Date(noon + ((hour - 12 - offset) * 60 + minute) * 60_000).toISOString();
  if (clocks.size > 6000) clocks.clear();
  clocks.set(key, result);
  return result;
}

export function dailySession(assetClass, timestamp) {
  const millis = Date.parse(timestamp);
  if (!Number.isFinite(millis)) return null;
  const day = new Date(millis).toISOString().slice(0, 10);
  if (assetClass === "crypto") {
    const start = Date.parse(day + "T00:00:00Z");
    return { openAt: new Date(start).toISOString(), closeAt: new Date(start + DAY).toISOString() };
  }
  if (assetClass === "forex") {
    // FX feeds use different conventions for a session label. An envelope
    // from the previous 17:00 NY through the END of the labelled UTC date
    // avoids assigning a historical open that may already have passed.
    const previous = new Date(Date.parse(day) - DAY).toISOString().slice(0, 10);
    return { openAt: venueClock(previous, 17, 0, "America/New_York"),
      closeAt: new Date(Date.parse(day) + DAY).toISOString() };
  }
  return assetClass === "eu_stock"
    ? { openAt: venueClock(day, 9, 0, "Europe/Paris"), closeAt: venueClock(day, 17, 30, "Europe/Paris") }
    : { openAt: venueClock(day, 9, 30, "America/New_York"), closeAt: venueClock(day, 16, 0, "America/New_York") };
}

function validBar(bar) {
  return [bar.open, bar.low, bar.high, bar.close].every(x => Number.isFinite(x) && x > 0)
    && bar.low <= Math.min(bar.open, bar.close) && bar.high >= Math.max(bar.open, bar.close);
}

export function prepareObservation(asset, candles, observedAt) {
  if (!candles?.source || !candles.fetchedAt) return null;
  const observed = Date.parse(observedAt);
  const fetched = Math.min(observed, Date.parse(candles.fetchedAt));
  if (!Number.isFinite(fetched)) return null;
  const bars = [];
  let previousTime = "";
  let lastSession;
  for (const bar of candles) {
    const session = dailySession(asset.class, bar.sessionDate || bar.time);
    if (!session || session.openAt <= previousTime || !validBar(bar)) return null;
    previousTime = session.openAt;
    if (Date.parse(session.openAt) > fetched) return null;
    if (Date.parse(session.closeAt) <= fetched) {
      bars.push({ symbol: asset.symbol, time: session.openAt, ...session, open: bar.open,
        high: bar.high, low: bar.low, close: bar.close, source: candles.source });
    }
    lastSession = session;
  }
  const ind = computeIndicators(candles);
  if (!ind) return null;
  const setup = bestSetup(ind, asset.symbol);
  const dataUsable = observed - Date.parse(lastSession.closeAt) <= (asset.class === "crypto" ? 2 : 4) * DAY;
  return { asset, bars, ind, setup, source: candles.source, barTime: lastSession.openAt,
    dataUsable, observedAt, fetchedAt: candles.fetchedAt };
}

export function makeScanBatch(observations, settings, at, total) {
  const fx = {};
  for (const { asset, bars } of observations) {
    if (["EURUSD", "USDJPY"].includes(asset.symbol)) fx[asset.symbol] = bars;
  }
  const decisions = [];
  const bars = [];
  const received = new Set();
  function rateAt(symbol, when) {
    const bar = (fx[symbol] || []).findLast(x => x.closeAt <= when);
    return bar && Date.parse(when) - Date.parse(bar.closeAt) <= 4 * DAY ? bar.close : null;
  }
  for (const observation of observations) {
    const { asset, ind, setup, barTime, fetchedAt, source, dataUsable } = observation;
    // Scans are published as one batch; a user could not have acted midway
    // through the universe scan. Resolve competing ideas in the same frame.
    const observedAt = at;
    const usd = rateAt("EURUSD", observedAt);
    const jpy = rateAt("USDJPY", observedAt);
    const quoteToEur = asset.class === "eu_stock" ? 1
      : asset.symbol === "USDJPY" ? (usd && jpy ? 1 / (usd * jpy) : null) : usd ? 1 / usd : null;
    const validation = dataUsable ? validatePlan(setup, settings) : { valid: false, reason: observation.qualityReason || "stale_data" };
    const decision = buildPaperDecision({ asset, ind, setup, validation, observedAt, barTime,
      source, settings, quoteToEur, dataUsable });
    decisions.push({ ...decision, fetchedAt, barTimeKnown: observation.barTimeKnown !== false, inputs: {
      bar: ind.last, ema20: ind.ema20, ema50: ind.ema50, atr14: ind.atr14, rsi14: ind.rsi14,
      avgVol20: ind.avgVol20, quoteToEur, validation: validation.reason,
    } });
    bars.push(...observation.bars);
    const verifiedVenue = asset.class !== "eu_stock" || ["eodhd", "yahoo"].includes(source);
    if (dataUsable && quoteToEur && verifiedVenue) received.add(asset.symbol);
  }
  return { observedAt: at, decisions, bars, settings,
    coverage: { scanned: received.size, total: total.length, missingSymbols: total.filter(s => !received.has(s)) } };
}
