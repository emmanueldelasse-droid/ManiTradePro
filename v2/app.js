// ManiTradePro V2 — front PWA vanilla (zéro dépendance).
(() => {
  "use strict";

  // Permet d'overrider l'URL du worker en local : localStorage.setItem('v2_api','http://127.0.0.1:8787')
  const API_BASE = window.MTPPaper?.apiBase || localStorage.getItem("v2_api") || "https://manitradepro-v2.emmanueldelasse.workers.dev";

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, signal: controller.signal, cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.status === "unavailable") {
        const error = new Error(data.message || `HTTP ${res.status}`);
        error.payload = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  const numeric = (value) => typeof value === "number" && Number.isFinite(value);
  const fmtNum = (v, d = 2) => numeric(v) ? v.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
  const fmtPct = (v) => numeric(v) ? `${fmtNum(v * 100, 1)} %` : "—";
  const fmtPctRaw = (v) => numeric(v) ? `${fmtNum(v)} %` : "—";
  const fmtMoney = (v) => numeric(v) ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2, signDisplay: "exceptZero" }) : "—";
  const fmtPF = (v) => fmtNum(v, 4);
  const fmtDate = (s) => {
    if (!s || !Number.isFinite(Date.parse(s))) return "—";
    return new Date(s).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const dur = (h) => !numeric(h) ? "—" : h < 24 ? `${h} h` : `${Math.round(h / 24)} j`;
  const eur = (v) => numeric(v) ? v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : "—";

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
    dot.classList.toggle("live", !!h.active && !!h.lastCycle);
    const wrap = $("#health-cards");
    wrap.innerHTML = "";
    wrap.appendChild(card("Source", h.store || "—"));
    wrap.appendChild(card("Dernier cycle", fmtDate(h.lastCycle)));
    wrap.appendChild(card("Actifs scannés", `${h.scanned ?? "—"} / ${h.universeSize ?? 47}`));
    wrap.appendChild(card("Setups détectés", h.detected ?? "—"));
    wrap.appendChild(card("Trades ouverts", h.openPositions ?? "—"));
  }

  function renderPerf(overall) {
    const wrap = $("#perf-cards");
    wrap.innerHTML = "";
    const pnl = overall.totalPnl;
    wrap.appendChild(card("P/L total", fmtMoney(pnl), pnl >= 0 ? "green" : "red"));
    wrap.appendChild(card("Taux de réussite", fmtPct(overall.winRate)));
    wrap.appendChild(card("Facteur de profit", fmtPF(overall.profitFactor)));
    wrap.appendChild(card("Drawdown max", fmtNum(overall.maxDrawdown), "red"));
    wrap.appendChild(card("Trades fermés", overall.trades ?? "—"));
  }

  function renderSetups(bySetup) {
    const grid = $("#setups-grid");
    grid.innerHTML = "";
    for (const key of SETUP_ORDER) {
      const s = bySetup[key];
      if (!s) continue;
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

  const paperPath = "/api/v2/paper";
  let nextCursor = null;
  let journalVersion = 0;
  let loading = false;
  let archiveDate = null;
  try { archiveDate = localStorage.getItem("v2_history_last_date"); } catch { /* optional */ }
  let lastPaperDate = null;
  let currentDecisionIds = new Set();

  function facts(rows) {
    const list = el("dl", "facts");
    for (const [name, value] of rows) list.append(el("dt", null, name), el("dd", null, value ?? "—"));
    return list;
  }
  function notice(message, detail) {
    const p = el("div", "notice");
    p.append(el("strong", null, message), document.createTextNode(detail));
    return p;
  }
  function lastDate(label, date) {
    return date ? label + " " + fmtDate(date) + " (Paris)." : label + " inconnu.";
  }
  function legacyUnavailable() {
    return "Données indisponibles. " + lastDate("Dernier bilan historique vérifié", archiveDate);
  }

  async function loadArchive() {
    const get = async (path) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const r = await fetch("../data/" + path, { cache: "no-store", signal: controller.signal });
        if (!r.ok) throw Error("Archive inaccessible");
        return await r.json();
      } finally { clearTimeout(timeout); }
    };
    const box = $("#history-snapshot");
    try {
      const [status, history] = await Promise.all([get("history-status.json"), get("bot-stats-v2-post-fix.json")]);
      if (!status.lastReliableAt || !numeric(history.tradeCount) || history.tradeCount !== status.v2PostFixTrades ||
          history.scope !== "V2_POST_ANTI_DUP_FIX" || history.wins + history.losses !== history.tradeCount) throw Error("Archive incomplète");
      archiveDate = status.lastReliableAt;
      const hint = $("#paper-history-date");
      if (hint) hint.textContent = " " + lastDate("Dernier bilan historique vérifié", archiveDate);
      try { localStorage.setItem("v2_history_last_date", archiveDate); } catch { /* optional */ }
      const body = el("div", "panel-block");
      body.append(el("strong", null, fmtDate(archiveDate) + " (Paris)"),
        el("p", "section-note", "Cohorte V2 depuis le " + fmtDate(history.cohortStart) + " (Paris), après correction des doublons."),
        facts([["Opérations clôturées", fmtNum(history.tradeCount)], ["Gagnantes / perdantes", history.wins + " / " + history.losses],
          ["Résultat brut en unités historiques", fmtMoney(history.totalPnl)], ["Facteur de profit brut", fmtPF(history.profitFactor)],
          ["Plus forte baisse en unités historiques", fmtNum(history.maxDrawdown)]]),
        el("p", "section-note", "Ce relevé agrégé ne mesure ni les frais ni l’écart à la référence. Sa devise de calcul reste à confirmer."));
      box.replaceChildren(body);
    } catch {
      box.replaceChildren(notice("Données indisponibles", lastDate("Dernier bilan historique vérifié", archiveDate)));
    }
  }

  function book(title, data) {
    const box = el("section", "book");
    box.append(el("h3", null, title), el("strong", "book-total", eur(data.netEur)),
      facts([["Brut", eur(data.grossEur)], ["Coûts estimés", eur(data.costsEur)], ["Plus forte baisse", eur(data.maxDrawdownEur)],
        ["Opérations clôturées / ouvertes", fmtNum(data.closedCount) + " / " + fmtNum(data.openCount)]]));
    return box;
  }

  function showPaperResults(data) {
    const d = data.dashboard;
    const {current, variant, reference} = d?.portfolios || {};
    if (!current || !variant || !reference || ![current.netEur, current.maxDrawdownEur, current.closedCount,
        d.initialCapitalEur, d.netVsReferenceEur, reference.netEur].every(numeric) || !d.startedAt || !d.asOf) {
      throw Error("Bilan incomplet");
    }
    lastPaperDate = data.lastReliableAt || d.asOf;
    try { localStorage.setItem("v2_paper_last_date:" + API_BASE, lastPaperDate); } catch { /* optional */ }
    const head = el("div", "result-intro");
    const period = fmtDate(d.startedAt) + " au " + fmtDate(d.asOf) + " (Paris)";
    const result = window.MTPPaper?.headline(d) || "Capital simulé : " + eur(d.initialCapitalEur) +
      ". Résultat après frais : " + eur(current.netEur) + ". Écart à la référence : " + eur(d.netVsReferenceEur) +
      ". Plus forte baisse du capital : " + eur(current.maxDrawdownEur) + ".";
    head.append(el("p", "main-result", result), el("p", "section-note", "Du " + period));
    if (!current.closedCount && !current.openCount)
      head.append(el("p", "section-note", "Aucune opération ManiTradePro exécutée sur cette période. L’avantage reste à mesurer."));
    $("#paper-summary").replaceChildren(head);
    const books = el("div", "book-grid");
    books.append(book("ManiTradePro", current), book("Variante testée", variant), book("Règle de référence", reference));
    const wrap = $("#paper-results");
    wrap.replaceChildren(el("h2", null, "Trois portefeuilles simulés"), books);
    if (current.closedCount && numeric(current.bestTradeEur) && numeric(current.netWithoutBestEur)) {
      const phrase = current.dependsOnBest ? "Le bénéfice dépend d’une seule opération. " : "";
      wrap.append(el("p", "details-copy", current.bestTradeEur > 0 ? phrase + "Meilleure opération clôturée : " + eur(current.bestTradeEur) +
        ". Résultat hors meilleure opération : " + eur(current.netWithoutBestEur) + "." : "Aucune opération clôturée en gain sur cette période."));
    }
    const evidence = el("div", "notice");
    evidence.append(el("strong", null, "Niveau de preuve"), document.createTextNode(
      (d.limitations || []).filter(x => typeof x === "string").join(" ") || "Ces résultats descriptifs ne suffisent pas à établir un avantage reproductible."));
    wrap.append(evidence);
    const detail = el("details", "panel-block");
    detail.append(el("summary", null, "Comparer les règles et les hypothèses"));
    if (data.coverage?.lastInterruption) {
      const gap = data.coverage.lastInterruption;
      detail.append(el("p", "notice", "Interruption de collecte enregistrée du " + fmtDate(gap.from) + " au " + fmtDate(gap.to) + " (Paris). Les signaux de cet intervalle peuvent manquer."));
    }
    if (typeof d.experiment === "string") detail.append(el("p", null, d.experiment));
    const effect = d.variantEffect;
    if (effect) detail.append(facts([["Opérations écartées puis clôturées", fmtNum(effect.closedExcluded)],
      ["Pertes évitées", eur(effect.avoidedLossEur)], ["Gains manqués", eur(effect.missedGainEur)]]));
    const list = el("ul", "section-note");
    for (const item of d.assumptions || []) if (typeof item === "string") list.append(el("li", null, item));
    detail.append(list, el("p", "section-note", "Version du test " + (d.version || "—") + " · " + lastDate("Dernier cours de valorisation", d.lastMarkAt)));
    wrap.append(detail);
  }

  const lifecycleLabels = {pending: "En attente d’entrée", open: "Position ouverte", closed: "Position clôturée",
    expired: "Expirée", discarded: "Écartée", missed: "Non exécutée", waiting: "En observation"};
  function decisionCard(row) {
    const c = el("article", "decision");
    const head = el("div", "decision-head");
    const actionable = row.decision === "Entrée envisageable" && row.lifecycle?.state === "pending" &&
      Date.parse(row.plan?.expiresAt) > Date.now();
    c.dataset.actionable = String(actionable);
    const style = {"Entrée envisageable": "enter", "Attendre": "wait", "Écarter": "reject"}[row.decision] || "";
    c.dataset.decision = row.decision || "";
    head.append(el("h2", null, row.symbol), el("span", "decision-tag " + style, row.decision));
    const plan = row.plan;
    const price = value => numeric(value) ? [fmtNum(value, 6), row.quoteCurrency].filter(Boolean).join(" ") : "—";
    const dir = plan?.direction === "long" ? "Achat" : plan?.direction === "short" ? "Vente" : null;
    c.append(head, el("p", "section-note", [dir, "Décision du " + fmtDate(row.observedAt) + " (Paris)"].filter(Boolean).join(" · ")),
      el("p", "decision-reason", row.reason), el("p", "section-note", row.market));
    if (row.lifecycle?.state) {
      if (row.lifecycle.state === "pending" && !actionable && row.plan && Date.parse(row.plan.expiresAt) <= Date.now())
        c.append(el("p", "details-copy", "L’heure limite d’entrée est dépassée."));
      const current = el("p", "details-copy", "Suivi · " + (lifecycleLabels[row.lifecycle.state] || row.lifecycle.state) +
        (row.lifecycle.at ? " · " + fmtDate(row.lifecycle.at) : ""));
      if (["missed", "expired", "closed"].includes(row.lifecycle.state) && row.lifecycle.reason)
        current.append(document.createTextNode(" · " + row.lifecycle.reason));
      c.append(current);
    }
    if (plan) {
      const expiry = fmtDate(plan.expiresAt);
      c.append(el("p", null, row.condition), facts([[dir === "Vente" ? "Prix d’entrée minimal" : "Prix d’entrée maximal", price(plan.entryLimit)],
        ["Expiration (Paris)", expiry], ["Stop / objectif", price(plan.stopLoss) + " / " + price(plan.takeProfit)],
        ["Perte estimée au stop", eur(row.estimatedLossEur)]]));
      if (row.gapWarning) c.append(el("p", "section-note", row.gapWarning));
    }
    const trade = row.lifecycle?.trades?.current;
    if (trade) {
      const outcome = el("details");
      outcome.append(el("summary", null, "Résultat de l’opération · " + eur(trade.netEur)),
        facts([["Entrée à l’ouverture", price(trade.entry)], ["Sortie", price(trade.exit)], ["Quantité", fmtNum(trade.qty, 6)],
          ["Entrée / sortie (Paris)", fmtDate(trade.openedAt) + " / " + fmtDate(trade.closedAt)],
          ["Résultat brut", eur(trade.grossEur)], ["Coûts estimés", eur(trade.costsEur)], ["Résultat net", eur(trade.netEur)]]));
      c.append(outcome);
    }
    const more = el("details");
    more.append(el("summary", null, "Relire l’analyse initiale"));
    if (plan) {
      more.append(el("p", null, "Entrée envisagée : " + price(plan.entry)), el("p", null, "Invalidation : " + (row.invalidation || "—")));
    } else {
      if (row.condition) more.append(el("p", null, row.condition));
      if (row.invalidation) more.append(el("p", null, row.invalidation));
    }
    if (row.costs?.description) more.append(el("p", "section-note", row.costs.description));
    const inputs = row.inputs || row.snapshot || {};
    more.append(facts([["Stratégie", [SETUP_LABELS[row.setupType] || row.setupType, row.strategyVersion || row.version].filter(Boolean).join(" · ") || "—"],
      ["Bougie observée (Paris)", fmtDate(row.barTime)], ["Source du cours", row.source || "—"],
      ["Dernière clôture", price(inputs.bar?.close ?? inputs.close)], ["RSI (14)", fmtNum(inputs.rsi14)]]));
    c.append(more);
    return c;
  }

  function filterDecisions() {
    const choice = $("#paper-filter").value;
    const cards = [...$("#paper-decisions").children];
    for (const c of cards) c.hidden = choice === "actionable" ? c.dataset.actionable !== "true" : !!choice && c.dataset.decision !== choice;
    $("#paper-filter-empty").hidden = !cards.length || cards.some(c => !c.hidden);
  }
  $("#paper-filter").addEventListener("change", filterDecisions);

  function showDecisions(data, append = false, partial = false) {
    if (!Array.isArray(data.decisions)) throw Error("Journal incomplet");
    const wrap = $("#paper-decisions");
    if (!append) { wrap.replaceChildren(); currentDecisionIds = new Set(); }
    for (const row of data.decisions) {
      if (!row.id || currentDecisionIds.has(row.id)) continue;
      wrap.append(decisionCard(row));
      currentDecisionIds.add(row.id);
    }
    // Keep enterable ideas before archival decisions, including across pages.
    const active = [...wrap.children].filter(c => c.dataset.actionable === "true");
    for (let i = active.length - 1; i >= 0; i--) wrap.prepend(active[i]);
    filterDecisions();
    nextCursor = data.nextCursor || null;
    $("#paper-more").hidden = !nextCursor;
    const coverage = data.coverage;
    const info = coverage && numeric(coverage.scanned) && numeric(coverage.total)
      ? " · " + coverage.scanned + " / " + coverage.total + " actifs couverts" : "";
    $("#paper-journal-note").textContent = (partial ? "Données indisponibles. Dernières décisions enregistrées. " : "") +
      (currentDecisionIds.size ? "Décisions d’origine · " : "Aucune décision enregistrée · ") + fmtDate(data.asOf) + " (Paris)" + info;
  }

  function unavailablePaper(data = {}) {
    if (!lastPaperDate) {
      try { lastPaperDate = localStorage.getItem("v2_paper_last_date:" + API_BASE); } catch { /* optional */ }
    }
    const last = data.lastReliableAt || lastPaperDate;
    const message = last ? lastDate("Dernier bilan prospectif fiable", last) : "Aucun bilan prospectif fiable daté.";
    const missing = data.coverage?.missingSymbols;
    const banner = notice("Données indisponibles", message);
    if (!last) {
      const archive = el("span", null, archiveDate ? " " + lastDate("Dernier bilan historique vérifié", archiveDate) :
        " Le dernier relevé historique figure dans Résultats.");
      archive.id = "paper-history-date";
      banner.append(archive);
    }
    if (missing?.length) banner.append(document.createTextNode(" Actifs manquants : " + missing.join(", ") + "."));
    $("#paper-summary").replaceChildren(banner);
    $("#paper-results").replaceChildren();
    $("#paper-filter-empty").hidden = true;
    if (Array.isArray(data.decisions) && data.decisions.length) showDecisions(data, false, true);
    else {
      $("#paper-decisions").replaceChildren();
      $("#paper-journal-note").textContent = "Données indisponibles. " + message;
      $("#paper-more").hidden = true;
      nextCursor = null;
    }
  }
  async function loadPaper() {
    journalVersion++;
    try {
      const data = await api(paperPath);
      showPaperResults(data);
      showDecisions(data);
    } catch (e) { unavailablePaper(e.payload); }
  }
  $("#paper-more").addEventListener("click", async () => {
    const cursor = nextCursor;
    const version = journalVersion;
    if (!cursor) return;
    const button = $("#paper-more");
    button.disabled = true;
    try {
      const data = await api(paperPath + "?before=" + encodeURIComponent(cursor));
      if (version === journalVersion) showDecisions(data, true);
    } catch (e) {
      if (version === journalVersion && e.payload?.decisions?.length) showDecisions(e.payload, true, true);
      else if (version === journalVersion) $("#paper-journal-note").textContent = "Décisions précédentes indisponibles. Réessaie dans un instant.";
    } finally { button.disabled = false; }
  });

  async function loadLegacy() {
    await Promise.all([
      api("/api/v2/stats").then(s => {
        if (!s.verifiedAt || !s.source || !s.overall || !numeric(s.overall.trades)) throw Error("Source non vérifiée");
        $("#legacy-status").textContent = lastDate("Source vérifiée le", s.verifiedAt);
        renderPerf(s.overall); renderSetups(s.bySetup || {}); renderAssets(s.byAsset || {});
        $("#legacy-stats").hidden = false;
      }).catch(e => {
        $("#legacy-status").textContent = e.payload?.lastReliableAt ? "Données indisponibles. " +
          lastDate("Dernier bilan historique vérifié", e.payload.lastReliableAt) : legacyUnavailable();
        $("#legacy-stats").hidden = true;
      }),
      api("/api/v2/trades?limit=300").then(t => {
        if (!t.verifiedAt || !t.source || !Array.isArray(t.trades)) throw Error("Source non vérifiée");
        $("#trades-empty").textContent = "Aucune opération clôturée dans la source vérifiée.";
        renderTrades(t.trades);
      }).catch(() => {
        $("#trades-table").parentElement.hidden = true;
        $("#trades-empty").textContent = legacyUnavailable(); $("#trades-empty").hidden = false;
      })
    ]);
  }

  async function loadAll() {
    if (loading) return;
    loading = true;
    $("#refresh-btn").disabled = true;
    try {
      await Promise.all([loadPaper(), loadArchive().then(loadLegacy),
        api("/api/v2/health").then(renderHealth).catch(() => {
          $("#bot-dot").classList.remove("live");
          $("#health-cards").replaceChildren(notice("Données indisponibles", "Le moteur ne répond pas."));
        })]);
    } finally {
      loading = false;
      $("#refresh-btn").disabled = false;
    }
  }

  function selectTab(name) {
    for (const t of document.querySelectorAll(".tab")) {
      const active = t.dataset.tab === name;
      t.classList.toggle("active", active);
      if (active) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    }
    for (const view of document.querySelectorAll(".view")) view.classList.toggle("active", view.id === "view-" + name);
  }
  for (const t of document.querySelectorAll("[data-tab], [data-open-tab]")) {
    t.addEventListener("click", () => {
      selectTab(t.dataset.tab || t.dataset.openTab);
      window.scrollTo(0, 0);
    });
  }


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
  function openModal() { modal.hidden = false; $("#admin-panel").hidden = !token; $("#login-error").textContent = ""; }
  function closeModal() { modal.hidden = true; }
  $("#login-btn").addEventListener("click", openModal);
  $("#login-cancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  $("#login-submit").addEventListener("click", async () => {
    const pin = $("#pin-input").value.trim();
    $("#login-error").textContent = "";
    try {
      const r = await api("/api/v2/session/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      token = r.token;
      sessionStorage.setItem("v2_token", token);
      $("#admin-panel").hidden = false;
      $("#pin-input").value = "";
    } catch (e) {
      $("#login-error").textContent = e.message;
    }
  });

  $("#run-cycle-btn").addEventListener("click", async () => {
    const out = $("#cycle-result");
    out.textContent = "Cycle en cours… (scan des 47 actifs)";
    try {
      const r = await api("/api/v2/cycle", { method: "POST", admin: true });
      const paperState = { ok: "enregistré", partial: "partiel", unavailable: "indisponible" };
      if (r.legacyUnavailable) {
        out.textContent = "Scan prospectif " + (paperState[r.paperJournal] || "indisponible") + ". Registre historique indisponible.";
      } else {
        out.textContent = `Cycle terminé — scannés ${fmtNum(r.health.scanned)}, détectés ${fmtNum(r.health.detected)}, ouverts ${fmtNum(r.cycle.opened)}, fermés ${fmtNum(r.cycle.closed)}.`;
      }
      await loadAll();
    } catch (e) {
      out.textContent = e.message;
    }
  });

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  loadAll();
  setInterval(() => {
    // Laisser une analyse ouverte et la pagination stables pendant leur lecture.
    if (!document.hidden && $("#view-dashboard").classList.contains("active") && !document.querySelector(".panel-block[open]")) loadAll();
  }, 120000); // rafraîchit toutes les 2 min
})();
