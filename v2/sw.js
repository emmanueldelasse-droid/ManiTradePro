// ManiTradePro V2 — service worker (network-first sur l'app shell).
const CACHE_VERSION = "manitradepro-v2-2";
const ASSETS = ["./", "./index.html", "./app.js", "./paper-summary.js", "./styles.css", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("manitradepro-v2-") && k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Ne jamais mettre en cache les appels API (données fraîches obligatoires).
  if (new URL(req.url).origin !== self.location.origin || req.url.includes("/api/") || req.url.includes("/data/")) return;
  if (req.method !== "GET") return;
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
  );
});
