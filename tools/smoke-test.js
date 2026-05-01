#!/usr/bin/env node
// Smoke test JSDOM — détecte les bugs JS-runtime au chargement de l'app et au
// rendu des principales vues, sans browser ni réseau.
//
// Usage : node tools/smoke-test.js
// Sortie 0 si tout OK, 1 si une erreur runtime est levée.
//
// Limites volontaires :
// - Pas de CSS rendu, pas de layout (JSDOM ne layoute pas).
// - Pas d'API réseau : fetch est stubé en réponse vide. On vérifie seulement
//   que l'app ne crashe pas avant la première frame.
// - Pas de service worker, pas de touch events réels.
//
// Ce que ça attrape :
// - SyntaxError au parse de app.js.
// - ReferenceError / TypeError au boot et au premier render().
// - Listeners orphelins (data-* sans handler dans bindEvents).
// - Bugs introduits par un edit récent qui passent `node -c` mais cassent à
//   l'exécution.

const fs = require("fs");
const path = require("path");

let JSDOM;
try {
  JSDOM = require(path.join("/tmp/mtp-e2e/node_modules/jsdom")).JSDOM;
} catch {
  console.error("jsdom indisponible. Installer avec :");
  console.error("  cd /tmp && mkdir -p mtp-e2e && cd mtp-e2e && npm init -y && npm install jsdom");
  process.exit(2);
}

const REPO = path.resolve(__dirname, "..");
const HTML = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const APP_JS = fs.readFileSync(path.join(REPO, "assets/app.js"), "utf8");

// On retire les <script src> externes (lightweight-charts, app.js) pour les
// injecter manuellement avec un contrôle propre des stubs.
const html = HTML.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "");

const errors = [];
const warnings = [];

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  pretendToBeVisual: true,
  url: "https://manitradepro.local/"
});
const { window } = dom;

// Capture des erreurs
window.addEventListener("error", (e) => {
  errors.push(`window.onerror: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener("unhandledrejection", (e) => {
  errors.push(`unhandledrejection: ${e.reason?.message || e.reason}`);
});

// Stubs API
window.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "", headers: new window.Headers() });
window.LightweightCharts = { createChart: () => ({ addCandlestickSeries: () => ({ setData: () => {} }), timeScale: () => ({ fitContent: () => {} }), remove: () => {} }) };
Object.defineProperty(window.navigator, "serviceWorker", {
  value: {
    ready: Promise.resolve({ showNotification: () => {} }),
    register: async () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
    controller: null
  },
  configurable: true
});
window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
window.requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
window.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;

const start = Date.now();
try {
  // Exécute le contenu de app.js dans le contexte de la fenêtre.
  window.eval(APP_JS);
} catch (e) {
  errors.push(`parse/boot throw: ${e.message}\n${e.stack?.split("\n").slice(0, 5).join("\n")}`);
}

// Laisse le temps aux microtasks (boot async) de tourner.
return Promise.resolve()
  .then(() => new Promise(r => setTimeout(r, 200)))
  .then(() => {
    const appEl = window.document.getElementById("app");
    const appHtml = appEl?.innerHTML || "";
    const elapsed = Date.now() - start;

    // Vérifications minimales
    if (!appEl) errors.push("#app introuvable après boot");
    else if (!appHtml.trim()) warnings.push("#app vide après boot — render() n'a peut-être rien produit (acceptable si l'app attend un fetch)");

    // Bonus : compter les data-attrs orphelins (présents dans le DOM mais pas
    // capturés dans bindEvents). Heuristique simple — peut faire des faux
    // positifs si bindEvents n'a pas encore tourné. On signale en warning.
    const dataAttrs = new Set();
    const re = /data-([a-z-]+)=/g;
    let m;
    while ((m = re.exec(appHtml))) dataAttrs.add(m[1]);
    const knownInBindEvents = new Set();
    const bindRe = /querySelectorAll\("\[data-([a-z-]+)/g;
    while ((m = bindRe.exec(APP_JS))) knownInBindEvents.add(m[1]);
    const orphans = [...dataAttrs].filter(a => !knownInBindEvents.has(a) && !a.startsWith("test"));
    if (orphans.length) warnings.push(`data-* sans handler bindEvents (informatif) : ${orphans.slice(0, 8).join(", ")}${orphans.length > 8 ? "…" : ""}`);

    // Rapport
    console.log(`Smoke test ManiTradePro — ${elapsed}ms`);
    console.log(`  app rendered : ${appHtml ? `${appHtml.length} chars` : "EMPTY"}`);
    console.log(`  errors      : ${errors.length}`);
    console.log(`  warnings    : ${warnings.length}`);
    if (warnings.length) {
      console.log("\nWarnings :");
      for (const w of warnings) console.log(`  · ${w}`);
    }
    if (errors.length) {
      console.error("\nErrors :");
      for (const e of errors) console.error(`  ✗ ${e}`);
      process.exit(1);
    }
    console.log("\nOK");
    process.exit(0);
  });
