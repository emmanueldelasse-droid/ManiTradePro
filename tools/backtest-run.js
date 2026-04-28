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
  // Twelve Data plan gratuit ≈ 8 req/min → sleep entre symboles pour ne pas
  // taper le rate limit. Crypto via Binance/CoinGecko (pas concerné), actions
  // via Twelve Data → on espace seulement les actions. 8s entre actions = sous
  // les 8/min même avec un fetch ratté qui retry.
  const SLEEP_BETWEEN_STOCKS_MS = 8000;
  const isCryptoSymbol = s => ["BTC","ETH","SOL","BNB","XRP","ADA","AVAX","LINK","MATIC","DOT"].includes(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

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

  // Boucle séquentielle pour respecter limite CPU 50ms par invocation +
  // rate limit Twelve Data sur les actions.
  const perSymbol = [];
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
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
    // Sleep avant le prochain symbole action si le suivant est aussi une action
    const next = symbols[i + 1];
    if (next && !isCryptoSymbol(next) && !isCryptoSymbol(symbol)) {
      await sleep(SLEEP_BETWEEN_STOCKS_MS);
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

  // Summary par symbole — l'endpoint retourne data.summary (array), pas
  // data.bySymbol. Les champs : count, win_rate (0-1), avg_pnl_pct, etc.
  const arr = Array.isArray(summary?.summary) ? summary.summary : [];
  if (arr.length) {
    lines.push(`## Stats par symbole (depuis Supabase)`);
    lines.push("| symbol | class | trades | wr% | avg_pnl% | first_entry | last_entry |");
    lines.push("|--------|-------|--------|-----|----------|-------------|------------|");
    let totTrades = 0, totWins = 0, totPnlPct = 0;
    for (const s of arr) {
      const wrPct = (s.win_rate || 0) * 100;
      lines.push(`| ${s.symbol} | ${s.asset_class || "-"} | ${s.count} | ${fmt(wrPct, 1)} | ${fmt(s.avg_pnl_pct, 3)} | ${fmt(s.first_entry_price)} | ${fmt(s.last_entry_price)} |`);
      totTrades += s.count;
      totWins += Math.round((s.win_rate || 0) * s.count);
      totPnlPct += (s.avg_pnl_pct || 0) * s.count;
    }
    lines.push("");
    lines.push(`## Agrégé global`);
    lines.push(`- Trades : ${totTrades}`);
    lines.push(`- Wins approx : ${totWins}`);
    lines.push(`- Win rate global : ${fmt(totTrades > 0 ? (totWins / totTrades * 100) : 0, 1)}%`);
    lines.push(`- EV pondéré : ${fmt(totTrades > 0 ? totPnlPct / totTrades : 0, 3)}% / trade`);
  } else {
    lines.push(`## Stats par symbole`);
    lines.push(`(Aucune donnée — vérifier que le replay engine a généré des trades)`);
  }

  console.log(lines.join("\n"));
  window.__MTP_BACKTEST_REPORT = { runId, perSymbol, summary, finJson };
  console.log("\n→ Rapport stocké dans window.__MTP_BACKTEST_REPORT");
})();
