// ManiTradePro V2 — front PWA vanilla (zéro dépendance).
(() => {
  "use strict";

  // Si l'app est servie par le Worker V2 lui-même (workers.dev), l'API est sur
  // la même origine → chemin relatif. Sinon (GitHub Pages, local), URL absolue.
  // Override local possible : localStorage.setItem('v2_api','http://127.0.0.1:8787')
  const API_BASE = localStorage.getItem("v2_api")
    || (location.hostname.endsWith("workers.dev") ? "" : "https://manitradepro-v2.emmanueldelasse.workers.dev");

  const SETUP_LABELS = {
    pullback: "Pullback",
    breakout: "Breakout",
    mean_reversion: "Mean Reversion",
    gld_breakout: "GLD Breakout",
  };
  const SETUP_ORDER = ["pullback", "breakout", "mean_reversion", "gld_breakout"];
  const SETUP_DESC = {
    pullback: "Tendance haussière, repli sur l'EMA20",
    breakout: "Cassure de résistance avec volume",
    mean_reversion: "Retour à la moyenne (RSI extrême)",
    gld_breakout: "Cassure spécialisée sur l'or (GLD)",
  };

  let token = sessionStorage.getItem("v2_token") || null;

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.admin && token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  const fmtNum = (v, d = 2) => (Number.isFinite(+v) ? (+v).toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—");
  const fmtPct = (v) => (Number.isFinite(+v) ? `${(+v * 100).toFixed(1)} %` : "—");
  const fmtPctRaw = (v) => (Number.isFinite(+v) ? `${(+v).toFixed(2)} %` : "—");
  const fmtMoney = (v) => (Number.isFinite(+v) ? (+v).toLocaleString("fr-FR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }) : "—");
  const fmtPF = (v) => (v == null ? "∞" : Number.isFinite(+v) ? (+v).toFixed(2) : "—");
  const fmtDate = (s) => { if (!s) return "—"; const d = new Date(s); return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); };
  const dur = (h) => { if (!Number.isFinite(+h)) return "—"; const hh = +h; if (hh < 24) return `${hh} h`; return `${Math.round(hh / 24)} j`; };

  function card(label, value, cls) {
    const c = el("div", "card");
    c.appendChild(el("div", "label", label));
    const v = el("div", "value" + (cls ? " " + cls : ""), value);
    c.appendChild(v);
    return c;
  }

  // ---------- Rendu ----------
  function renderHealth(h) {
    const dot = $("#bot-dot");
    dot.classList.toggle("live", !!h.active);
    const wrap = $("#health-cards");
    wrap.innerHTML = "";
    wrap.appendChild(card("Bot", h.active ? "Actif" : "Inactif", h.active ? "green" : "red"));
    wrap.appendChild(card("Dernier cycle", fmtDate(h.lastCycle)));
    wrap.appendChild(card("Actifs scannés", `${h.scanned ?? "—"} / ${h.universeSize ?? 47}`));
    wrap.appendChild(card("Setups détectés", h.detected ?? "—"));
    wrap.appendChild(card("Trades ouverts", h.openPositions ?? "—"));
  }

  function renderPerf(overall) {
    const wrap = $("#perf-cards");
    wrap.innerHTML = "";
    const pnl = overall.totalPnl || 0;
    wrap.appendChild(card("P/L total", fmtMoney(pnl), pnl >= 0 ? "green" : "red"));
    wrap.appendChild(card("Taux de réussite", fmtPct(overall.winRate)));
    wrap.appendChild(card("Facteur de profit", fmtPF(overall.profitFactor)));
    wrap.appendChild(card("Drawdown max", fmtMoney(-Math.abs(overall.maxDrawdown || 0)), "red"));
    wrap.appendChild(card("Trades fermés", overall.trades ?? 0));
  }

  function renderSetups(bySetup) {
    const grid = $("#setups-grid");
    grid.innerHTML = "";
    for (const key of SETUP_ORDER) {
      const s = bySetup[key] || { trades: 0, winRate: 0, profitFactor: 0, expectancy: 0, totalPnl: 0 };
      const c = el("div", "setup-card");
      c.appendChild(el("h3", null, SETUP_LABELS[key]));
      c.appendChild(el("div", "sub", SETUP_DESC[key]));
      const stats = el("div", "setup-stats");
      const row = (k, v, vcls) => { stats.appendChild(el("span", "k", k)); const sv = el("span", "v" + (vcls ? " " + vcls : ""), v); stats.appendChild(sv); };
      row("Trades", String(s.trades || 0));
      row("Réussite", fmtPct(s.winRate));
      row("Facteur profit", fmtPF(s.profitFactor));
      row("Gain/trade", fmtMoney(s.expectancy), (s.expectancy || 0) >= 0 ? "pos" : "neg");
      row("P/L total", fmtMoney(s.totalPnl), (s.totalPnl || 0) >= 0 ? "pos" : "neg");
      c.appendChild(stats);
      grid.appendChild(c);
    }
  }

  function renderAssets(byAsset) {
    const tb = $("#assets-table tbody");
    tb.innerHTML = "";
    const rows = Object.entries(byAsset)
      .filter(([, s]) => s.trades > 0)
      .sort((a, b) => b[1].trades - a[1].trades)
      .slice(0, 15);
    if (!rows.length) {
      const tr = el("tr"); const td = el("td", null, "Pas encore de trades fermés."); td.colSpan = 5; td.style.textAlign = "center"; td.style.color = "var(--muted)";
      tr.appendChild(td); tb.appendChild(tr); return;
    }
    for (const [sym, s] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", null, sym));
      tr.appendChild(el("td", null, String(s.trades)));
      tr.appendChild(el("td", null, fmtPct(s.winRate)));
      tr.appendChild(el("td", null, fmtPF(s.profitFactor)));
      const ev = el("td", (s.expectancy || 0) >= 0 ? "pos" : "neg", fmtMoney(s.expectancy));
      tr.appendChild(ev);
      tb.appendChild(tr);
    }
  }

  function renderOpportunities(data) {
    const tb = $("#opp-table tbody");
    tb.innerHTML = "";
    const opps = data.opportunities || [];
    $("#opp-updated").textContent = data.updatedAt ? `Dernier scan : ${fmtDate(data.updatedAt)}` : "";
    $("#opp-empty").hidden = opps.length > 0;
    $("#opp-table").parentElement.hidden = opps.length === 0;
    for (const o of opps) {
      const tr = el("tr");
      const sym = el("td"); sym.appendChild(document.createTextNode(o.symbol + " "));
      if (o.alreadyOpen) sym.appendChild(el("span", "badge open", "ouvert"));
      tr.appendChild(sym);
      const st = el("td"); st.appendChild(el("span", "badge setup", SETUP_LABELS[o.setupType] || o.setupType)); tr.appendChild(st);
      const dir = el("td"); dir.appendChild(el("span", "badge " + o.direction, o.direction === "long" ? "achat" : "vente")); tr.appendChild(dir);
      tr.appendChild(el("td", null, fmtNum(o.entry, 4)));
      tr.appendChild(el("td", null, fmtNum(o.stopLoss, 4)));
      tr.appendChild(el("td", null, fmtNum(o.takeProfit, 4)));
      tr.appendChild(el("td", null, fmtNum(o.rr, 2)));
      tr.appendChild(el("td", "why", o.reason || ""));
      tb.appendChild(tr);
    }
  }

  function renderTrades(trades) {
    const tb = $("#trades-table tbody");
    tb.innerHTML = "";
    $("#trades-empty").hidden = trades.length > 0;
    $("#trades-table").parentElement.hidden = trades.length === 0;
    for (const t of trades) {
      const tr = el("tr");
      tr.appendChild(el("td", null, t.symbol));
      const st = el("td"); st.appendChild(el("span", "badge setup", SETUP_LABELS[t.setupType] || t.setupType)); tr.appendChild(st);
      const dir = el("td"); dir.appendChild(el("span", "badge " + t.direction, t.direction === "long" ? "achat" : "vente")); tr.appendChild(dir);
      tr.appendChild(el("td", null, fmtNum(t.entry, 4)));
      tr.appendChild(el("td", null, fmtNum(t.exit, 4)));
      tr.appendChild(el("td", null, fmtNum(t.stopLoss, 4)));
      tr.appendChild(el("td", null, fmtNum(t.takeProfit, 4)));
      tr.appendChild(el("td", (t.pnl || 0) >= 0 ? "pos" : "neg", fmtMoney(t.pnl)));
      tr.appendChild(el("td", (t.pnlPct || 0) >= 0 ? "pos" : "neg", fmtPctRaw(t.pnlPct)));
      tr.appendChild(el("td", null, dur(t.durationHours)));
      tr.appendChild(el("td", null, t.exitReason || "—"));
      tb.appendChild(tr);
    }
  }

  // ---------- Chargement ----------
  async function loadAll() {
    try {
      const [health, stats, opps, trades] = await Promise.all([
        api("/api/v2/health"),
        api("/api/v2/stats"),
        api("/api/v2/opportunities"),
        api("/api/v2/trades?limit=300"),
      ]);
      renderHealth(health);
      renderPerf(stats.overall || {});
      renderSetups(stats.bySetup || {});
      renderAssets(stats.byAsset || {});
      renderOpportunities(opps);
      renderTrades(trades.trades || []);
    } catch (e) {
      console.error(e);
      $("#health-cards").innerHTML = "";
      $("#health-cards").appendChild(card("Erreur", "Worker injoignable", "red"));
    }
  }

  // ---------- Navigation ----------
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".view").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $(`#view-${t.dataset.tab}`).classList.add("active");
    });
  });

  // ---------- Thème ----------
  function applyTheme(theme) {
    document.body.classList.toggle("theme-light", theme === "light");
    localStorage.setItem("v2_theme", theme);
  }
  applyTheme(localStorage.getItem("v2_theme") || "dark");
  $("#theme-btn").addEventListener("click", () => applyTheme(document.body.classList.contains("theme-light") ? "dark" : "light"));

  // ---------- Refresh ----------
  $("#refresh-btn").addEventListener("click", loadAll);

  // ---------- Login / admin ----------
  const modal = $("#login-modal");
  // Déjà connecté → on affiche directement le panneau admin (lancer un cycle).
  // Sinon → le formulaire PIN.
  function openModal() {
    modal.hidden = false;
    $("#login-form").hidden = !!token;
    $("#admin-panel").hidden = !token;
    $("#login-error").textContent = "";
  }
  function closeModal() { modal.hidden = true; }
  $("#login-btn").addEventListener("click", openModal);
  $("#login-cancel").addEventListener("click", closeModal);
  $("#admin-close").addEventListener("click", closeModal);
  // Clic sur le fond (hors de la boîte) ferme la modale.
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  // Touche Échap ferme la modale si elle est ouverte.
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  $("#login-submit").addEventListener("click", async () => {
    const pin = $("#pin-input").value.trim();
    $("#login-error").textContent = "";
    try {
      const r = await api("/api/v2/session/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      token = r.token;
      sessionStorage.setItem("v2_token", token);
      $("#pin-input").value = "";
      closeModal(); // connexion réussie → la modale disparaît
    } catch (e) {
      $("#login-error").textContent = e.message;
    }
  });

  $("#run-cycle-btn").addEventListener("click", async () => {
    const out = $("#cycle-result");
    out.textContent = "Cycle en cours… (scan des 47 actifs)";
    try {
      const r = await api("/api/v2/cycle", { method: "POST", admin: true });
      out.innerHTML = `<span class="pos">Cycle terminé</span> — scannés ${r.health.scanned}, détectés ${r.health.detected}, ouverts ${r.cycle.opened}, fermés ${r.cycle.closed}.`;
      await loadAll();
    } catch (e) {
      out.innerHTML = `<span class="neg">${e.message}</span>`;
    }
  });

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  loadAll();
  setInterval(loadAll, 120000); // rafraîchit toutes les 2 min
})();
