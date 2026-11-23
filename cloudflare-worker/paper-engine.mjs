// Forward test only. The journal supplies immutable observations and completed daily
// bars. This module has no I/O and cannot submit an order.
import { getAsset, V2_DEFAULT_SETTINGS, resolvePosition } from "../tools/v2/lib/engine-v2.mjs";

export const PAPER_VERSION = "paper-eur-mr-1";
const DAY = 86_400_000;
const MIN_DELAY = 5 * 60_000;
const NAMES = ["current", "variant", "reference"];
const percent = (bps) => bps / 10_000;
const positive = (n) => Number.isFinite(n) && n > 0;
const iso = (ms) => new Date(ms).toISOString();
const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100 || 0;

// Illustrative parameters, per side; spread is quoted full width. Carry is an
// allowance on short positions and on both sides of forex (annualized, simple).
const MODELS = {
  us_stock: [4, 1, 6, 3, 300], eu_stock: [5, 1.25, 10, 4, 300],
  etf: [3, 1, 4, 2, 300], commodity: [4, 1, 8, 4, 300],
  forex: [1, 0, 2, 1, 400], crypto: [10, 0, 12, 5, 1000],
};

// Calibration reference points, consulted 2026-11-23, not a broker quote:
// https://www.binance.com/en/fee/trading (standard crypto commission)
// https://www.interactivebrokers.ie/en/pricing/commissions-stocks.php (EU)
// https://www.interactivebrokers.ie/en/index.php?f=49818 (auto FX)
// https://bofip.impots.gouv.fr/bofip/9789-PGP.html/identifiant=BOI-ANNX-000467-20251217
// https://bofip.impots.gouv.fr/bofip/14605-PGP.html/ACTU-2025-00034
function costModel(assetClass, symbol) {
  const model = MODELS[assetClass];
  if (!model) return null;
  const [commissionBps, minCommissionEur, spreadBps, slippageBps, carryBpsAnnual] = model;
  const conversionBps = ["us_stock", "etf", "commodity", "crypto"].includes(assetClass) ? 3 : 0;
  const buyTaxReserveBps = symbol === "LVMH" ? 40 : 0;
  return {
    commissionBps, minCommissionEur, spreadBps, slippageBps, carryBpsAnnual, conversionBps, buyTaxReserveBps,
    description: `Par côté : commission ${commissionBps} pb (minimum ${minCommissionEur} €), demi-spread ${spreadBps / 2} pb et glissement ${slippageBps} pb. Conversion ${conversionBps} pb. ${buyTaxReserveBps ? "Provision TTF : 0,4 % à l’achat. " : ""}Portage estimé ${carryBpsAnnual / 100} %/an à découvert ou sur le Forex. 1 pb = 0,01 %.`,
  };
}

const isCarryCharged = (direction, assetClass) => direction === "short" || assetClass === "forex";
const quoteCurrency = (symbol, assetClass) => assetClass === "eu_stock" ? "EUR" : symbol === "USDJPY" ? "JPY" : "USD";

function friction(qty, priceEur, costs, isBuy) {
  const notional = qty * priceEur;
  return Math.max(costs.minCommissionEur, notional * percent(costs.commissionBps))
    + notional * percent(costs.spreadBps / 2 + costs.slippageBps + costs.conversionBps + (isBuy ? costs.buyTaxReserveBps : 0));
}

function holdingCost(notional, direction, assetClass, costs, days) {
  return isCarryCharged(direction, assetClass) ? notional * percent(costs.carryBpsAnnual) * days / 365.25 : 0;
}

function positionSize(plan, assetClass, price, fx, costs, settings, equity, available) {
  if (![equity, available, fx, price].every(positive)) return { qty: 0, loss: 0 };
  const unitEur = price * fx;
  // Fixed initial EUR risk in all arms, capped by current equity after losses.
  const risk = Math.min(equity, settings.startingEquity) * settings.riskPerTradePct / 100;
  const stopEur = plan.stopLoss * fx;
  const lossAt = (qty) => qty * Math.abs(unitEur - stopEur)
    + friction(qty, unitEur, costs, plan.direction === "long") + friction(qty, stopEur, costs, plan.direction === "short")
    + holdingCost(qty * unitEur, plan.direction, assetClass, costs, settings.maxHoldDays);
  const step = assetClass === "crypto" ? 0.000001 : 1;
  // Integer search preserves the commission floor and whole-share rule.
  let lo = 0;
  let hi = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(available / unitEur / step));
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    const qty = mid * step;
    if (lossAt(qty) <= risk && qty * unitEur + friction(qty, unitEur, costs, plan.direction === "long") <= available) lo = mid;
    else hi = mid - 1;
  }
  const qty = lo * step;
  return { qty, loss: qty ? lossAt(qty) : 0 };
}

function planFor(setup, expiresAt, rrMin) {
  if (!setup) return null;
  const { direction, entry, stopLoss, takeProfit } = setup;
  if (![entry, stopLoss, takeProfit].every(positive)) return null;
  const sign = direction === "long" ? 1 : direction === "short" ? -1 : 0;
  if (!(sign * (entry - stopLoss) > 0 && sign * (takeProfit - entry) > 0)) return null;
  const maxDrift = Math.abs(entry - stopLoss) * 0.25;
  const rrBoundary = (takeProfit + rrMin * stopLoss) / (1 + rrMin);
  const entryLimit = sign === 1 ? Math.min(entry + maxDrift, rrBoundary) : Math.max(entry - maxDrift, rrBoundary);
  return { direction, entry, entryLimit, stopLoss, takeProfit, expiresAt,
    rr: Math.abs((takeProfit - entry) / (entry - stopLoss)) };
}

function paperSettings(settings) {
  const merged = { ...V2_DEFAULT_SETTINGS, ...settings };
  for (const key of ["startingEquity", "riskPerTradePct", "maxOpenPositions", "maxHoldDays", "rrMin"]) {
    if (!positive(merged[key])) throw new Error("Réglage de simulation invalide : " + key);
  }
  if (merged.riskPerTradePct > 100 || !Number.isInteger(merged.maxOpenPositions)) throw new Error("Limites de risque invalides");
  return merged;
}

export function buildPaperDecision({ asset, ind, setup, validation, observedAt, barTime, source, settings,
  quoteToEur, dataUsable = true }) {
  const cfg = paperSettings(settings);
  const assetClass = asset.class;
  const seen = Date.parse(observedAt);
  const bar = Date.parse(barTime);
  if (!Number.isFinite(seen) || !Number.isFinite(bar)) throw new Error("Horodatage de décision invalide");
  const validity = (assetClass === "crypto" ? 36 : 96) * 3_600_000;
  const expiresAt = iso(Math.min(seen + validity, bar + DAY + validity));
  const costs = costModel(assetClass, asset.symbol);
  const currency = quoteCurrency(asset.symbol, assetClass);
  const fx = currency === "EUR" ? 1 : quoteToEur;
  const ambiguousVenue = assetClass === "eu_stock" && !["eodhd", "yahoo"].includes(source);
  const stale = ["stale_data", "stale", "unknown_venue", "no_data"].includes(validation?.reason)
    || Date.parse(expiresAt) <= seen;
  const dataOk = Boolean(dataUsable && source && !ambiguousVenue && !stale && costs && positive(fx));
  const plan = planFor(setup, expiresAt, cfg.rrMin);
  const forecast = dataOk && plan ? positionSize(plan, assetClass, plan.entry, fx, costs, cfg, cfg.startingEquity, cfg.startingEquity) : null;
  const acceptable = Boolean(plan && dataOk && validation?.valid && forecast?.qty);
  let reason = setup?.reason || "Aucun signal de la stratégie sur cette bougie.";
  if (!dataOk) reason += !positive(fx) ? " Conversion en euros indisponible." : " Données indisponibles, périmées ou place de cotation incertaine.";
  else if (setup && !validation?.valid) reason += " Le plan ne respecte pas les critères de la stratégie.";
  else if (plan && !forecast?.qty) reason += " Taille exécutable nulle sous le plafond de risque.";
  const hasIndicators = positive(ind?.ema50) && positive(ind?.close);
  const market = hasIndicators ? `Clôture ${ind.close >= ind.ema50 ? "au-dessus" : "au-dessous"} de la moyenne à 50 séances${Number.isFinite(ind.rsi14) ? ", RSI " + Math.round(ind.rsi14) : ""}.` : "État du marché indisponible.";
  const referencePlan = dataOk && hasIndicators && ind.close > ind.ema50 && positive(ind.atr14)
    ? planFor({ direction: "long", entry: ind.close, stopLoss: ind.close - ind.atr14, takeProfit: ind.close + 2 * ind.atr14 }, expiresAt, 1.5)
    : null;
  const decision = acceptable ? "Entrée envisageable" : setup || !dataOk ? "Écarter" : "Attendre";
  // Same inputs on a repeated scan produce the same key. A corrected feed or
  // a changed plan/decision on the same bar creates a new immutable snapshot.
  const identity = [PAPER_VERSION, asset.symbol, iso(bar).slice(0, 10), setup?.setupType || "sans-signal",
    setup?.direction || "", setup?.entry ?? "", setup?.stopLoss ?? "", setup?.takeProfit ?? "",
    validation?.reason ?? "", dataOk ? 1 : 0, referencePlan ? 1 : 0, source || ""];
  return {
    id: identity.join("/"),
    version: PAPER_VERSION, strategyVersion: "v2-d2e1b960", symbol: asset.symbol, assetClass, name: asset.name,
    barTime: iso(bar), observedAt: iso(seen), source: source || null, quoteCurrency: currency, quoteToEur: positive(fx) ? fx : null,
    setupType: setup?.setupType || null, setupDirection: setup?.direction || null, decision,
    reason, market, plan, referencePlan, costs,
    condition: plan ? `Première ouverture ultérieure, au moins 5 min après l'alerte, dans les bornes du plan (${plan.direction === "long" ? "achat" : "vente"}).` : "Attendre un nouveau signal.",
    invalidation: plan ? `Scénario invalidé si le cours ${plan.direction === "long" ? "descend à" : "monte à"} ${plan.stopLoss}.` : "Aucun plan ouvert.",
    estimatedLossEur: forecast?.qty ? money(forecast.loss) : null,
    gapWarning: plan ? "Un saut de prix au-delà du stop peut aggraver la perte." : "",
    snapshot: { close: ind?.close ?? null, ema20: ind?.ema20 ?? null, ema50: ind?.ema50 ?? null,
      rsi14: ind?.rsi14 ?? null, atr14: ind?.atr14 ?? null, validation: validation?.reason ?? null },
  };
}

function session(bar) {
  const open = Date.parse(bar.openAt || bar.time);
  // Without metadata daily values become knowable only after a full day.
  const close = bar.closeAt ? Date.parse(bar.closeAt) : open + DAY;
  if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open ||
      ![bar.open, bar.low, bar.high, bar.close].every(positive) ||
      bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close)) return null;
  return { ...bar, openMs: open, closeMs: close };
}

function ratesAt(rates, symbol, assetClass, now) {
  const currency = quoteCurrency(symbol, assetClass);
  if (currency === "EUR") return 1;
  const rate = (pair) => {
    const q = rates.get(pair);
    return q && now - q.ms <= 4 * DAY ? q.close : null;
  };
  const usd = rate("EURUSD");
  if (!positive(usd)) return null;
  if (currency === "USD") return 1 / usd;
  const jpy = rate("USDJPY");
  return positive(jpy) ? 1 / (usd * jpy) : null;
}

function portfolio(initial) {
  return { initial, realizedGross: 0, realizedCosts: 0, peak: initial, drawdown: 0, open: new Map(), pending: new Map(),
    trades: [], outcomes: Object.create(null), dataError: null };
}

// Physical assets: currency exposure from buying/selling the foreign asset.
// Forex: the P&L is denominated in the quote currency, converted at exit.
function marked(position, mid, fx, now) {
  const { plan, assetClass, qty, entryMid, entryFx, costs, openMs } = position;
  const sign = plan.direction === "long" ? 1 : -1;
  const delta = assetClass === "forex" ? (mid - entryMid) * fx : mid * fx - entryMid * entryFx;
  const gross = sign * qty * delta;
  const carry = holdingCost(qty * entryMid * entryFx, plan.direction, assetClass, costs, Math.max(0, now - openMs) / DAY);
  const charges = position.entryCost + friction(qty, mid * fx, costs, plan.direction === "short") + carry;
  return { gross, costs: charges, net: gross - charges };
}

function balance(book) {
  let gross = book.realizedGross;
  let costs = book.realizedCosts;
  let reserved = 0;
  for (const p of book.open.values()) {
    const value = marked(p, p.markMid, p.markFx, p.markMs);
    gross += value.gross;
    costs += value.costs;
    // Gross exposure without leverage. Shorts consume collateral too.
    reserved += p.qty * p.markMid * p.markFx;
  }
  return { gross, costs, equity: book.initial + gross - costs, reserved };
}

function outcome(book, id, state, ms, reason) {
  book.outcomes[id] = { state, at: iso(ms), reason };
}

function closePosition(book, p, mid, fx, ms, exitReason) {
  const pnl = marked(p, mid, fx, ms);
  book.realizedGross += pnl.gross;
  book.realizedCosts += pnl.costs;
  book.trades.push({ decisionId: p.id, symbol: p.symbol, setupType: p.setupType, direction: p.plan.direction,
    qty: p.qty, entry: p.entryMid, exit: mid, openedAt: iso(p.openMs), closedAt: iso(ms),
    entryFx: p.entryFx, exitFx: fx, grossEur: money(pnl.gross), costsEur: money(pnl.costs), netEur: money(pnl.net), exitReason });
  book.open.delete(p.symbol);
  outcome(book, p.id, "closed", ms, exitReason);
}

function atOpen(book, item, bar, rates, settings) {
  const { d, plan } = item;
  const now = bar.openMs;
  const missed = (reason) => outcome(book, d.id, "missed", now, reason);
  if (book.open.has(d.symbol)) return missed("Position déjà ouverte");
  if (book.open.size >= settings.maxOpenPositions) return missed("Nombre maximal de positions atteint");
  const sign = plan.direction === "long" ? 1 : -1;
  const mid = bar.open;
  const fill = mid * (1 + sign * percent(d.costs.spreadBps / 2 + d.costs.slippageBps));
  if (sign * (fill - plan.entryLimit) > 1e-10 || sign * (mid - plan.stopLoss) <= 0 || sign * (plan.takeProfit - mid) <= 0)
    return missed("Ouverture hors des bornes du plan");
  const fx = ratesAt(rates, d.symbol, d.assetClass, now);
  if (!positive(fx)) return missed("Conversion en euros indisponible à l’ouverture");
  const { equity, reserved } = balance(book);
  const { qty } = positionSize(plan, d.assetClass, mid, fx, d.costs, settings, equity, equity - reserved);
  if (!qty) return missed("Capital disponible ou risque insuffisant");
  book.open.set(d.symbol, { id: d.id, symbol: d.symbol, setupType: item.isReference ? "reference_ema50" : d.setupType,
    assetClass: d.assetClass, plan, costs: d.costs, qty, entryMid: mid, entryFx: fx, openMs: now,
    entryCost: friction(qty, mid * fx, d.costs, plan.direction === "long"), markMid: mid, markFx: fx, markMs: now });
  outcome(book, d.id, "open", now, "Entrée simulée à l’ouverture");
}

function addDecision(book, d, name, ms) {
  const isReference = name === "reference";
  const plan = isReference ? d.referencePlan : d.plan;
  if (!isReference && d.setupType) {
    for (const [id, item] of book.pending) {
      if (d.symbol === item.d.symbol && d.barTime === item.d.barTime && d.setupType === item.d.setupType
        && d.setupDirection === item.d.setupDirection) {
        outcome(book, id, "discarded", ms, "Plan actualisé avant l’ouverture");
        book.pending.delete(id);
      }
    }
  }
  if (name === "variant" && d.setupType === "mean_reversion")
    return outcome(book, d.id, "discarded", ms, "Retour à la moyenne exclu dans B");
  if (!plan || (!isReference && d.decision !== "Entrée envisageable"))
    return outcome(book, d.id, d.decision === "Écarter" ? "discarded" : "waiting", ms, d.reason);
  // Several main setups may appear on the same partial daily bar. The reference
  // observes at most one independent trigger per asset/day, at first appearance.
  const key = isReference ? d.symbol + "/" + d.barTime.slice(0, 10) : d.id;
  if (isReference && book.refSeen.has(key)) return outcome(book, d.id, "waiting", ms, "Référence déjà enregistrée pour cette séance");
  if (isReference) book.refSeen.add(key);
  book.pending.set(d.id, { d, plan, isReference });
  outcome(book, d.id, "pending", ms, "En attente de la prochaine ouverture admissible");
}

function expire(book, ms, marketWatermarks) {
  for (const [id, item] of book.pending) {
    const expiry = Date.parse(item.plan.expiresAt);
    if (expiry >= ms) continue;
    // A session may already have opened within the window, but its daily
    // OHLC is published only after the close. Do not invent a missed fill.
    if ((marketWatermarks.get(item.d.symbol) ?? -Infinity) < expiry) {
      outcome(book, id, "pending", expiry, "Idée échue, cotation finale attendue pour vérifier l’entrée");
      continue;
    }
    outcome(book, id, "expired", expiry, "Aucune ouverture admissible avant expiration");
    book.pending.delete(id);
  }
}

function valueSnapshot(book) {
  const { equity } = balance(book);
  book.peak = Math.max(book.peak, equity);
  book.drawdown = Math.max(book.drawdown, book.peak - equity);
}

function settleBars(book, bars, ms, rates, settings, opening) {
  for (const bar of bars) {
    const p = book.open.get(bar.symbol);
    if (!p || (!opening && bar.openMs < p.openMs)) continue;
    const fx = ratesAt(rates, p.symbol, p.assetClass, ms);
    if (!positive(fx)) {
      book.dataError ||= "Conversion en euros manquante pendant une position.";
      continue;
    }
    const mid = opening ? bar.open : bar.close;
    p.markMs = ms;
    p.markMid = mid;
    p.markFx = fx;
    const { stopLoss, takeProfit, direction } = p.plan;
    if (opening) {
      const sign = direction === "long" ? 1 : -1;
      if (sign * (mid - stopLoss) <= 0) closePosition(book, p, mid, fx, ms, "Stop franchi à l’ouverture");
      else if (sign * (mid - takeProfit) >= 0) closePosition(book, p, takeProfit, fx, ms, "Objectif atteint à l’ouverture");
      continue;
    }
    // For an entry at the OPEN of this bar, all subsequent daily extremes are
    // admissible. The pre-existing resolver assumes stop first if both hit.
    const exit = resolvePosition(p.plan, bar, { forceTimeExit: ms - p.openMs >= settings.maxHoldDays * DAY });
    if (exit) closePosition(book, p, exit.exit, fx, ms, { stop: "Stop", target: "Objectif", time: "Durée maximale" }[exit.exitReason] || exit.exitReason);
  }
}

function fillBars(book, opens, ms, rates, cfg) {
  if (!opens.length) return;
  const available = new Map(opens.map((b) => [b.symbol, b]));
  const eligible = [...book.pending.values()].filter(({ d, plan }) => available.has(d.symbol)
    && Date.parse(d.observedAt) + MIN_DELAY <= ms && Date.parse(d.barTime) < ms && ms <= Date.parse(plan.expiresAt));
  eligible.sort((a, b) => b.plan.rr - a.plan.rr || a.d.observedAt.localeCompare(b.d.observedAt) || a.d.id.localeCompare(b.d.id));
  for (const item of eligible) {
    atOpen(book, item, available.get(item.d.symbol), rates, cfg);
    book.pending.delete(item.d.id);
  }
}

function summary(book, asOf) {
  const { gross, costs, equity } = balance(book);
  const staleMark = [...book.open.values()].some((p) => asOf - p.markMs > (p.assetClass === "crypto" ? 2 : 5) * DAY);
  const dataError = book.dataError || (staleMark ? "Dernière cotation trop ancienne pour une position ouverte." : null);
  const net = equity - book.initial;
  const best = book.trades.reduce((max, t) => Math.max(max, t.netEur), 0);
  return { grossEur: dataError ? null : money(gross), costsEur: dataError ? null : money(costs),
    netEur: dataError ? null : money(net), maxDrawdownEur: dataError ? null : money(book.drawdown), dataError,
    closedCount: book.trades.length, openCount: book.open.size, bestTradeEur: best,
    netWithoutBestEur: dataError ? null : money(net - best), dependsOnBest: !dataError && money(net) > 0 && best >= money(net),
    realizedNetEur: money(book.realizedGross - book.realizedCosts), trades: book.trades, outcomes: book.outcomes };
}

export function replayPaper({ decisions, bars, settings, asOf }) {
  const end = Date.parse(asOf);
  if (!Number.isFinite(end)) throw new Error("Date de valorisation invalide");
  const cfg = paperSettings(settings);
  const frames = new Map();
  const frame = (ms) => {
    if (!frames.has(ms)) frames.set(ms, { opens: [], closes: [], signals: [] });
    return frames.get(ms);
  };
  const seenSignals = new Set();
  const ordered = decisions.filter((d) => d.version === PAPER_VERSION && Date.parse(d.observedAt) <= end)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.id.localeCompare(b.id));
  for (const d of ordered) {
    if (seenSignals.has(d.id)) continue;
    seenSignals.add(d.id);
    frame(Date.parse(d.observedAt)).signals.push(d);
  }
  const seenBars = new Set();
  let lastMark = null;
  for (const raw of bars) {
    const bar = session(raw);
    if (!bar || bar.closeMs > end || !getAsset(bar.symbol)) continue;
    const key = bar.symbol + "/" + bar.openMs;
    if (seenBars.has(key)) continue;
    seenBars.add(key);
    frame(bar.openMs).opens.push(bar);
    frame(bar.closeMs).closes.push(bar);
    lastMark = Math.max(lastMark || 0, bar.closeMs);
  }
  const books = Object.fromEntries(NAMES.map((name) => [name, portfolio(cfg.startingEquity)]));
  books.reference.refSeen = new Set();
  const rates = new Map();
  const marketWatermarks = new Map();
  for (const [ms, group] of [...frames.entries()].sort((a, b) => a[0] - b[0])) {
    for (const b of group.closes) {
      marketWatermarks.set(b.symbol, ms);
      if (b.symbol === "EURUSD" || b.symbol === "USDJPY") rates.set(b.symbol, { ms, close: b.close });
    }
    for (const name of NAMES) {
      const book = books[name];
      expire(book, ms, marketWatermarks);
      settleBars(book, group.closes, ms, rates, cfg, false);
      for (const d of group.signals) addDecision(book, d, name, ms);
      settleBars(book, group.opens, ms, rates, cfg, true);
      fillBars(book, group.opens, ms, rates, cfg);
      valueSnapshot(book);
    }
  }
  for (const book of Object.values(books)) expire(book, end, marketWatermarks);
  const portfolios = Object.fromEntries(NAMES.map((n) => [n, summary(books[n], end)]));
  const excluded = portfolios.current.trades.filter((t) => t.setupType === "mean_reversion");
  const a = portfolios.current, r = portfolios.reference;
  return {
    version: PAPER_VERSION, startedAt: ordered[0]?.observedAt ?? null, asOf: iso(end),
    lastMarkAt: lastMark === null ? null : iso(lastMark), initialCapitalEur: cfg.startingEquity, portfolios,
    statuses: a.outcomes, netVsReferenceEur: a.netEur === null || r.netEur === null ? null : money(a.netEur - r.netEur),
    variantEffect: { closedExcluded: excluded.length, avoidedLossEur: money(-excluded.reduce((s, t) => s + Math.min(0, t.netEur), 0)),
      missedGainEur: money(excluded.reduce((s, t) => s + Math.max(0, t.netEur), 0)) },
    experiment: "B applique les règles de A et écarte uniquement les retours à la moyenne. Référence : achat au-dessus de la moyenne exponentielle à 50 séances, stop à 1 ATR et objectif à 2 ATR.",
    assumptions: [
      `Capital commun ${cfg.startingEquity} €, risque maximal prévu ${cfg.riskPerTradePct} % par position, ${cfg.maxOpenPositions} positions, sans levier ; durée maximale ${cfg.maxHoldDays} jours.`,
      "Entrée à la première ouverture admissible après 5 minutes ; sur données journalières, le résultat d’une séance est publié après sa clôture. Ordre limité au prix indiqué, coût du demi-spread et du glissement inclus.",
      "Le gain brut utilise les cours avant frictions ; les coûts couvrent commission, spread, glissement, conversion et portage estimé. Pour LVMH, provision conservatrice de 0,4 % par achat, même intrajournalier. Marquage des positions ouvertes aux ouvertures et clôtures disponibles, sortie estimée incluse.",
      "Conversion aux derniers cours Forex clôturés (âge maximal 4 jours). USDT assimilé à USD pour les cours Binance. Actions et ETF en titres entiers ; Forex en unités entières, crypto au millionième.",
      "Séances régulières pour les actions. Une clôture anticipée peut être reconnue en retard. Sur le Forex, la fenêtre prudente va de 17 h à New York la veille à la fin de la date UTC du flux ; seuls les OHLC finalisés sont traités.",
      "Les positions ouvertes à découvert sont intégralement collatéralisées. Lors d’un franchissement du stop à l’ouverture, sortie au cours d’ouverture ; si stop et objectif sont touchés dans la même séance, stop prioritaire.",
    ],
    limitations: [
      "Frais et portage sont des hypothèses par classe, sans tarif de courtier ni carnet d’ordres observé. Dividendes, autres taxes, disponibilité de l’emprunt et écarts de parité USDT ne sont pas modélisés.",
      "La baisse maximale mesure les valorisations observables ; le creux intrajournalier exact est inconnu. Les résultats passés et un petit nombre de décisions ne démontrent pas un avantage reproductible.",
    ],
  };
}
