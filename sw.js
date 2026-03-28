// ── ManiTradePro Service Worker v1
// Détecte les mises à jour et notifie l'utilisateur

const CACHE_NAME = 'manitradepro-v1.0';
const ASSETS = [
  '/ManiTradePro/',
  '/ManiTradePro/index.html',
  '/ManiTradePro/js/app-bundle.js',
  '/ManiTradePro/css/variables.css',
  '/ManiTradePro/css/reset.css',
  '/ManiTradePro/css/layout.css',
  '/ManiTradePro/css/components.css',
  '/ManiTradePro/css/components-v2-additions.css',
  '/ManiTradePro/css/screens.css',
  '/ManiTradePro/css/screens-v2-additions.css',
];

// Installation — mise en cache initiale
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation — supprime les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — réseau d'abord, cache en fallback
self.addEventListener('fetch', e => {
  // Ne pas intercepter les requêtes API externes
  if (!e.request.url.includes('github.io')) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache la nouvelle version
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Message depuis l'app pour forcer la mise à jour
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
