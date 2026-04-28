// tools/backtest-run.js — Snippet console pour lancer un backtest multi-symboles
//
// Usage : ouvrir l'app ManiTradePro connectée (login PIN), ouvrir la console
// du navigateur, puis copier-coller l'INTÉGRALITÉ de ce fichier et appuyer sur
// Entrée. Le snippet :
//
// 1. Récupère le session token (verifySessionToken accepte aussi les routes admin).
// 2. POST /api/admin/backtest-init avec une liste de 10 symboles (5 crypto + 5 actions).
// 3. Pour chaque symbole : POST /api/admin/backtest-symbol?runId=X&symbol=Y (séquentiel).
// 4. POST /api/admin/backtest-finalize?runId=X.
// 5. GET /api/admin/backtest-symbol-summary?runId=X et affiche un rapport markdown.
//
// Durée estimée : 1-3 minutes pour 10 symboles selon le cache KV des bougies.
// Le résultat est stocké dans window.__MTP_BACKTEST_REPORT.

(async function backtestRun() {
  const tokenRaw = localStorage.getItem("mtp_session_v1");
  if (!tokenRaw) { console.error("Pas de session — login PIN requis"); return; }
  const token = JSON.parse(tokenRaw)?.token;
  if (!token) { console.error("Token absent"); return; }

  const baseUrl = "https://manitradepro.emmanueldelasse.workers.dev";
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  // Périmètre : 5 crypto + 5 actions diversifiées
  const symbols = ["BTC", "ETH", "SOL", "BNB", "LINK", "AAPL", "MSFT", "META", "JPM", "SPY"];

  console.log(`[backtest] init avec ${symbols.length} symboles : ${symbols.join(", ")}`);
  const initRes = await fetch(`${baseUrl}/api/admin/backtest-init`, {
    method: "POST",
    headers,
    body: JSON.stringify({ symbols })
  });
  const initJson = await initRes.json();
  if (initJson?.status !== "ok") { console.error("init failed", initJson); return; }
  const runId = initJson.data.runId;
  console.log(`[backtest] runId = ${runId}`);

  // Boucle séquentielle pour respecter limite CPU 50ms par invocation
  const perSymbol = [];
  for (const symbol of symbols) {
    const t0 = Date.now();
    const url = `${baseUrl}/api/admin/backtest-symbol?runId=${encodeURIComponent(runId)}&symbol=${encodeURIComponent(symbol)}`;
    try {
      const res = await fetch(url, { method: "POST", headers });
      const json = await res.json();
      const dt = Date.now() - t0;
      if (json?.status === "ok") {
        const d = json.data;
        console.log(`  ✓ ${symbol} — ${d.candlesCount}c · ${d.tradesInserted}t · ${dt}ms · cache=${d.fromCache}`);
        perSymbol.push({ symbol, candles: d.candlesCount, trades: d.tradesInserted, fromCache: d.fromCache, ms: dt });
      } else {
        console.warn(`  ✗ ${symbol} — error`, json);
        perSymbol.push({ symbol, error: json?.message || "unknown", ms: dt });
      }
    } catch (e) {
      console.warn(`  ✗ ${symbol} — exception`, e?.message);
      perSymbol.push({ symbol, error: e?.message || String(e), ms: Date.now() - t0 });
    }
  }

  console.log(`[backtest] finalize`);
  const finRes = await fetch(`${baseUrl}/api/admin/backtest-finalize?runId=${encodeURIComponent(runId)}`, {
    method: "POST",
    headers
  });
  const finJson = await finRes.json();
  if (finJson?.status !== "ok") console.warn("finalize warn", finJson);

  console.log(`[backtest] summary`);
  const sumRes = await fetch(`${baseUrl}/api/admin/backtest-symbol-summary?runId=${encodeURIComponent(runId)}`, {
    headers
  });
  const sumJson = await sumRes.json();
  if (sumJson?.status !== "ok") { console.error("summary failed", sumJson); return; }
  const summary = sumJson.data;

  // Rapport markdown
  const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : "n/a";
  const lines = [];
  lines.push(`# Backtest run ${runId}`);
  lines.push("");
  lines.push(`## Run info`);
  lines.push(`- Symboles : ${symbols.length} (${symbols.join(", ")})`);
  lines.push(`- Engine version : ${finJson?.data?.engineVersion || "n/a"}`);
  lines.push(`- Status final : ${finJson?.data?.status || "n/a"}`);
  lines.push(`- Trades générés total : ${finJson?.data?.tradesGenerated ?? "n/a"}`);
  lines.push("");

  lines.push(`## Per symbol`);
  lines.push("| symbol | candles | trades | fromCache | ms | error |");
  lines.push("|--------|---------|--------|-----------|------|-------|");
  for (const r of perSymbol) {
    lines.push(`| ${r.symbol} | ${r.candles ?? "-"} | ${r.trades ?? "-"} | ${r.fromCache ?? "-"} | ${r.ms} | ${r.error || ""} |`);
  }
  lines.push("");

  // Summary par symbole — agrégé côté serveur
  if (Array.isArray(summary?.bySymbol) && summary.bySymbol.length) {
    lines.push(`## Stats par symbole (depuis Supabase)`);
    lines.push("| symbol | trades | wins | losses | wr% | totalPnl | avgPnl | avgWin | avgLoss |");
    lines.push("|--------|--------|------|--------|-----|----------|--------|--------|---------|");
    for (const s of summary.bySymbol) {
      const wr = s.trades > 0 ? (s.wins / s.trades * 100) : 0;
      lines.push(`| ${s.symbol} | ${s.trades} | ${s.wins} | ${s.losses} | ${fmt(wr, 1)} | ${fmt(s.total_pnl)} | ${fmt(s.avg_pnl)} | ${fmt(s.avg_win)} | ${fmt(s.avg_loss)} |`);
    }
    lines.push("");

    // Total agrégé
    const tot = summary.bySymbol.reduce((acc, s) => ({
      trades: acc.trades + (s.trades || 0),
      wins: acc.wins + (s.wins || 0),
      losses: acc.losses + (s.losses || 0),
      pnl: acc.pnl + (s.total_pnl || 0),
    }), { trades: 0, wins: 0, losses: 0, pnl: 0 });
    const wrTot = tot.trades > 0 ? (tot.wins / tot.trades * 100) : 0;
    lines.push(`## Agrégé global`);
    lines.push(`- Trades : ${tot.trades}`);
    lines.push(`- Wins / Losses : ${tot.wins} / ${tot.losses}`);
    lines.push(`- Win rate : ${fmt(wrTot, 1)}%`);
    lines.push(`- PnL cumulé : ${fmt(tot.pnl)}`);
    lines.push(`- EV : ${fmt(tot.trades > 0 ? tot.pnl / tot.trades : 0)} / trade`);
  } else {
    lines.push(`## Stats par symbole`);
    lines.push(`(Aucune donnée — vérifier que le replay engine a généré des trades)`);
  }

  console.log(lines.join("\n"));
  window.__MTP_BACKTEST_REPORT = { runId, perSymbol, summary, finJson };
  console.log("\n→ Rapport stocké dans window.__MTP_BACKTEST_REPORT");
})();
