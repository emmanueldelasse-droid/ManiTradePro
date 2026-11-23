// Shared by the original home screen and the V2 dashboard.
(() => {
  "use strict";
  const apiBase = localStorage.getItem("v2_api") || "https://manitradepro-v2.emmanueldelasse.workers.dev";
  const eur = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const date = s => new Date(s).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  function headline(report) {
    const current = report?.portfolios?.current;
    const delta = report?.netVsReferenceEur;
    if (!current || ![current.netEur, current.maxDrawdownEur, report.initialCapitalEur, delta].every(Number.isFinite)
        || !Number.isFinite(Date.parse(report.startedAt)) || !Number.isFinite(Date.parse(report.asOf))) return null;
    const amount = current.netEur;
    const comparison = delta === 0 ? "le même résultat que la référence" :
      eur(Math.abs(delta)) + (delta < 0 ? " de moins" : " de plus") + " que la référence";
    return "Sur cette période, avec " + eur(report.initialCapitalEur) + " simulés, suivre ManiTradePro aurait " +
      (amount < 0 ? "coûté " : "rapporté ") + eur(Math.abs(amount)) + " après frais, soit " + comparison +
      ". La plus forte baisse du capital a été de " + eur(current.maxDrawdownEur) + ".";
  }
  window.MTPPaper = { apiBase, headline };

  // The V1 dashboard is redrawn in place. Share one in-flight read across
  // renders so that the home screen doesn't multiply API requests.
  let request, requestTime = 0;
  async function readSummary() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let lastReliableAt = null;
    try {
      const response = await fetch(apiBase + "/api/v2/paper", { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      lastReliableAt = data.lastReliableAt;
      const text = response.ok && data.status === "ok" && headline(data.dashboard);
      if (text) {
        try { localStorage.setItem("v2_paper_last_date:" + apiBase, lastReliableAt || data.dashboard.asOf); } catch { /* optional */ }
        return { text, detail: "Du " + date(data.dashboard.startedAt) + " au " + date(data.dashboard.asOf) + " (Paris). " +
        (data.dashboard.portfolios.current.closedCount || 0) + " opération(s) clôturée(s)." };
      }
    } catch { /* Keep finance values unknown on a failed read. */ }
    finally { clearTimeout(timeout); }
    try { lastReliableAt ||= localStorage.getItem("v2_paper_last_date:" + apiBase); } catch { /* optional */ }
    if (Number.isFinite(Date.parse(lastReliableAt))) return { text: "Données indisponibles", detail: "Dernier bilan prospectif fiable le " + date(lastReliableAt) + " (Paris)." };
    try {
      const response = await fetch("./data/history-status.json", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      const marker = response.ok && await response.json();
      if (marker.lastReliableAt) return { text: "Données indisponibles",
        detail: "Dernier bilan historique vérifié le " + date(marker.lastReliableAt) + " (Paris). Bilan prospectif en attente." };
    } catch { /* The dated historical archive can also be read in V2. */ }
    return { text: "Données indisponibles", detail: "Date du dernier bilan fiable inconnue." };
  }
  customElements.define("mtp-paper-summary", class extends HTMLElement {
    connectedCallback() {
      this.textContent = "Chargement du bilan…";
      if (!request || Date.now() - requestTime > 120000) {
        requestTime = Date.now();
        request = readSummary();
      }
      request.then(result => {
        if (!this.isConnected) return;
        const title = document.createElement("strong");
        title.textContent = result.text;
        const detail = document.createElement("div");
        detail.className = "muted";
        detail.textContent = result.detail;
        this.replaceChildren(title, detail);
      });
    }
  });
})();
