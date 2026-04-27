// tools/post-mortem.js — Snippet console pour post-mortem des trades clos
//
// Usage : ouvrir l'app ManiTradePro connectée (login PIN), ouvrir la console
// du navigateur, puis copier-coller l'INTÉGRALITÉ de ce fichier et appuyer sur
// Entrée. Le rapport markdown s'affiche dans la console — copier-coller la
// sortie pour analyse.
//
// Le snippet :
// 1. Fetch les trades clos via /api/trades/state (token de session courant).
// 2. Calcule stats agrégées (WR, EV, avg win/loss, distribution exit_reason).
// 3. Pour chaque trade, calcule distance stop % et distance TP % (proxy
//    "stop dans le bruit" en l'absence d'ATR persisté dans analysis_snapshot).
// 4. Classe les pertes par cause probable (stop trop serré, score faible,
//    régime contraire, news négative à l'ouverture, holding < 1h).
// 5. Affiche un rapport markdown dans la console.
//
// Note : analysis_snapshot ne contient PAS l'ATR à l'entrée (worker.js:3622).
// On utilise donc la distance stop % en absolu et par classe d'actif comme
// proxy. Pour aller plus loin il faudra persister atrAtEntry — todo séparée.

(async function postMortem() {
  const tokenRaw = localStorage.getItem("mtp_session_v1");
  if (!tokenRaw) { console.error("Pas de session — login PIN requis"); return; }
  const token = JSON.parse(tokenRaw)?.token;
  if (!token) { console.error("Token absent dans mtp_session_v1"); return; }

  const baseUrl = "https://manitradepro.emmanueldelasse.workers.dev";
  const res = await fetch(`${baseUrl}/api/trades/state`, {
    headers: { "Authorization": "Bearer " + token }
  });
  const json = await res.json();
  if (!json?.ok) { console.error("Fetch failed", json); return; }

  const history = Array.isArray(json?.data?.history) ? json.data.history : [];
  if (!history.length) { console.error("Aucun trade clos dans le dump"); return; }

  const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : "n/a";
  const pct = (n) => Number.isFinite(n) ? `${(n >= 0 ? "+" : "")}${n.toFixed(2)}%` : "n/a";

  // ---- Stats agrégées
  const closed = history.filter(t => t.status === "closed" || t.exit_price);
  const wins = closed.filter(t => Number(t.pnl) > 0);
  const losses = closed.filter(t => Number(t.pnl) < 0);
  const flats = closed.filter(t => Number(t.pnl) === 0);
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
  const wr = closed.length ? wins.length / closed.length : 0;
  const ev = closed.length ? totalPnl / closed.length : 0;

  // Direction split
  const longs = closed.filter(t => String(t.side || t.direction).toLowerCase() === "long");
  const shorts = closed.filter(t => String(t.side || t.direction).toLowerCase() === "short");

  // Setup distribution
  const setupCounts = {};
  for (const t of closed) {
    const setup = t?.analysis_snapshot?.setupType || "unknown";
    setupCounts[setup] = (setupCounts[setup] || 0) + 1;
  }

  // ---- Per-trade enrichment
  const enriched = closed.map(t => {
    const entry = Number(t.entry_price);
    const exit = Number(t.exit_price);
    const stop = Number(t.stop_loss);
    const tp = Number(t.take_profit);
    const side = String(t.side || t.direction).toLowerCase();
    const dur = Number(t.duration_days) * 24 * 60; // minutes (duration_days est en jours)
    const stopDistPct = Number.isFinite(entry) && Number.isFinite(stop) && entry > 0
      ? Math.abs(entry - stop) / entry * 100 : null;
    const tpDistPct = Number.isFinite(entry) && Number.isFinite(tp) && entry > 0
      ? Math.abs(tp - entry) / entry * 100 : null;
    const moveToExitPct = Number.isFinite(entry) && Number.isFinite(exit) && entry > 0
      ? (side === "short" ? (entry - exit) : (exit - entry)) / entry * 100 : null;

    // Heuristique exit_reason si non fournie
    let inferredExit = "unknown";
    if (Number.isFinite(stop) && Number.isFinite(exit)) {
      if (side === "long" && exit <= stop * 1.001) inferredExit = "stop";
      else if (side === "short" && exit >= stop * 0.999) inferredExit = "stop";
      else if (side === "long" && Number.isFinite(tp) && exit >= tp * 0.999) inferredExit = "tp";
      else if (side === "short" && Number.isFinite(tp) && exit <= tp * 1.001) inferredExit = "tp";
      else if (Math.abs(moveToExitPct) < 0.5) inferredExit = "be_or_time";
      else inferredExit = "manual_or_time";
    }

    return {
      id: t.id,
      symbol: t.symbol,
      side,
      asset_class: t.asset_class,
      setup: t?.analysis_snapshot?.setupType || "unknown",
      regime: t?.analysis_snapshot?.regime || t?.analysis_snapshot?.trendLabel || "unknown",
      score: Number(t.score) || Number(t?.analysis_snapshot?.score) || null,
      pnl: Number(t.pnl),
      pnl_pct: Number(t.pnl_pct),
      rr_ratio: Number(t.rr_ratio),
      duration_min: dur,
      stop_dist_pct: stopDistPct,
      tp_dist_pct: tpDistPct,
      stop_tp_ratio: (Number.isFinite(stopDistPct) && Number.isFinite(tpDistPct) && stopDistPct > 0)
        ? tpDistPct / stopDistPct : null,
      move_pct: moveToExitPct,
      inferred_exit: inferredExit,
      news_at_open: t?.analysis_snapshot?.newsContext?.classification
        || t?.analysis_snapshot?.newsContext?.sentiment || null,
      blocker_flags: Array.isArray(t?.analysis_snapshot?.blockerFlags)
        ? t.analysis_snapshot.blockerFlags : [],
      opened_at: t.opened_at,
      closed_at: t.closed_at,
    };
  });

  // ---- Cause classification (heuristique)
  const causes = {
    stop_dans_bruit: [], // stop_dist_pct < 2% sur action ou < 3% sur crypto
    score_faible: [], // score < 60
    regime_contraire: [], // long en BEAR ou short en BULL
    news_negative_open: [],
    holding_court: [], // < 60 min et perte
    blocker_present: [],
    autre: [],
  };
  for (const e of enriched) {
    if (e.pnl >= 0) continue;
    let classified = false;
    const stopThresh = e.asset_class === "crypto" ? 3 : 2;
    if (Number.isFinite(e.stop_dist_pct) && e.stop_dist_pct < stopThresh) {
      causes.stop_dans_bruit.push(e); classified = true;
    }
    if (Number.isFinite(e.score) && e.score < 60) {
      causes.score_faible.push(e); classified = true;
    }
    const regime = String(e.regime).toUpperCase();
    if ((e.side === "long" && /BEAR|RISK_OFF/.test(regime)) ||
        (e.side === "short" && /BULL|RISK_ON/.test(regime))) {
      causes.regime_contraire.push(e); classified = true;
    }
    if (e.news_at_open && /negative|negatif|bear/i.test(String(e.news_at_open))) {
      causes.news_negative_open.push(e); classified = true;
    }
    if (Number.isFinite(e.duration_min) && e.duration_min < 60) {
      causes.holding_court.push(e); classified = true;
    }
    if (e.blocker_flags.length) {
      causes.blocker_present.push(e); classified = true;
    }
    if (!classified) causes.autre.push(e);
  }

  // ---- Rapport markdown
  const lines = [];
  lines.push(`# Post-mortem — ${closed.length} trades clos`);
  lines.push("");
  lines.push(`## Stats agrégées`);
  lines.push(`- Win rate : **${wins.length}/${closed.length} = ${(wr*100).toFixed(1)}%**`);
  lines.push(`- PnL cumulé : **${fmt(totalPnl)} USD**`);
  lines.push(`- EV : **${fmt(ev)} USD/trade**`);
  lines.push(`- Avg win : ${fmt(avgWin)} USD · Avg loss : ${fmt(avgLoss)} USD · Flats : ${flats.length}`);
  lines.push(`- Direction : ${longs.length} longs · ${shorts.length} shorts`);
  lines.push(`- Setups : ${Object.entries(setupCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);
  lines.push("");

  lines.push(`## Distribution exit (inférée)`);
  const exitDist = {};
  for (const e of enriched) exitDist[e.inferred_exit] = (exitDist[e.inferred_exit] || 0) + 1;
  for (const [k, v] of Object.entries(exitDist)) lines.push(`- ${k} : ${v}`);
  lines.push("");

  lines.push(`## Distribution stop_dist_pct`);
  const stops = enriched.map(e => e.stop_dist_pct).filter(Number.isFinite).sort((a,b) => a-b);
  if (stops.length) {
    const med = stops[Math.floor(stops.length/2)];
    const min = stops[0];
    const max = stops[stops.length-1];
    lines.push(`- min ${fmt(min)}% · med ${fmt(med)}% · max ${fmt(max)}%`);
  }
  const tps = enriched.map(e => e.tp_dist_pct).filter(Number.isFinite).sort((a,b) => a-b);
  if (tps.length) {
    const med = tps[Math.floor(tps.length/2)];
    lines.push(`- TP médiane : ${fmt(med)}%`);
  }
  const ratios = enriched.map(e => e.stop_tp_ratio).filter(Number.isFinite).sort((a,b) => a-b);
  if (ratios.length) {
    const med = ratios[Math.floor(ratios.length/2)];
    lines.push(`- RR cible (TP/stop) médian : ${fmt(med)}`);
  }
  lines.push("");

  lines.push(`## Causes probables des pertes (un trade peut être dans plusieurs)`);
  for (const [cause, list] of Object.entries(causes)) {
    if (!list.length) continue;
    lines.push(`### ${cause} : ${list.length} trades`);
    for (const e of list) {
      lines.push(`- #${e.id} ${e.symbol} ${e.side} score=${fmt(e.score,0)} pnl=${fmt(e.pnl)} (${pct(e.pnl_pct)}) stop_dist=${fmt(e.stop_dist_pct)}% durée=${fmt(e.duration_min,0)}min regime=${e.regime} setup=${e.setup}`);
    }
    lines.push("");
  }

  lines.push(`## Trades détaillés`);
  lines.push("| # | symbol | side | setup | regime | score | pnl | pnl% | stop% | tp% | RR | durée(min) | exit |");
  lines.push("|---|--------|------|-------|--------|-------|-----|------|-------|-----|-----|------------|------|");
  for (const e of enriched) {
    lines.push(`| ${e.id} | ${e.symbol} | ${e.side} | ${e.setup} | ${e.regime} | ${fmt(e.score,0)} | ${fmt(e.pnl)} | ${pct(e.pnl_pct)} | ${fmt(e.stop_dist_pct)} | ${fmt(e.tp_dist_pct)} | ${fmt(e.stop_tp_ratio)} | ${fmt(e.duration_min,0)} | ${e.inferred_exit} |`);
  }

  const report = lines.join("\n");
  console.log(report);
  window.__MTP_POST_MORTEM = { report, enriched, causes, stats: { wr, ev, totalPnl, avgWin, avgLoss } };
  console.log("\n→ Rapport stocké dans window.__MTP_POST_MORTEM");
})();
