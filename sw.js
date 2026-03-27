// ============================================================
// sw.js — ManiTradePro Service Worker
// Strategy: Cache-first for assets, Network-first for API
// ============================================================

const CACHE_NAME    = 'manitradepro-v1';
const API_CACHE     = 'manitradepro-api-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/reset.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/screens.css',
  '/js/app.js',
  '/js/data/mockData.js',
  '/js/data/storage.js',
  '/js/engine/indicators.js',
  '/js/engine/riskCalculator.js',
  '/js/engine/analysisEngine.js',
  '/js/api/twelveData.js',
  '/js/api/brokerAdapter.js',
  '/js/utils/formatting.js',
  '/js/utils/router.js',
  '/js/utils/sync.js',
  '/js/screens/dashboard.js',
  '/js/screens/opportunities.js',
  '/js/screens/assetDetail.js',
  '/js/screens/positions.js',
  '/js/screens/simulation.js',
  '/js/screens/settings.js',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ① Twelve Data API → Network first, cache fallback (5 min TTL)
  if (url.hostname === 'api.twelvedata.com') {
    event.respondWith(_networkFirstWithCache(request, API_CACHE, 300));
    return;
  }

  // ② Anthropic API (for future AI features) → Network only
  if (url.hostname.includes('anthropic.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // ③ Static assets → Cache first, network fallback
  event.respondWith(_cacheFirst(request));
});

// ── STRATEGIES ───────────────────────────────────────────────

async function _cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — ressource non disponible', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function _networkFirstWithCache(request, cacheName, ttlSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache   = await caches.open(cacheName);
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cachedRes = new Response(await response.clone().text(), {
        status : response.status,
        headers,
      });
      cache.put(request, cachedRes);
      return response;
    }
    throw new Error('Network response not ok');
  } catch {
    // Fallback to cache
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
      const age      = (Date.now() - cachedAt) / 1000;
      if (age < ttlSeconds) return cached;
    }
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── BACKGROUND SYNC (V2 — placeholder) ──────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-positions') {
    console.log('[SW] Background sync — positions');
    // V2: synchronize pending orders with broker
  }
});

// ── PUSH NOTIFICATIONS (V2 — placeholder) ───────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'ManiTradePro', {
    body : data.body || '',
    icon : '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag  : data.tag || 'default',
  });
});
