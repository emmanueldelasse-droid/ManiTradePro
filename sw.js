const CACHE_NAME = 'manitradepro-v4.5';
const APP_SHELL = [
  '/ManiTradePro/',
  '/ManiTradePro/index.html',
  '/ManiTradePro/manifest.json',
  '/ManiTradePro/js/app-bundle.js',
  '/ManiTradePro/css/variables.css',
  '/ManiTradePro/css/reset.css',
  '/ManiTradePro/css/layout.css',
  '/ManiTradePro/css/components.css',
  '/ManiTradePro/css/components-v2-additions.css',
  '/ManiTradePro/css/screens.css',
  '/ManiTradePro/css/screens-v2-additions.css',
  '/ManiTradePro/icons/icon-180.png',
  '/ManiTradePro/icons/icon-192.png',
  '/ManiTradePro/icons/icon-512.png',
  '/ManiTradePro/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.hostname.includes('github.io')) return;

  const isAppShellRequest = (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png')
  );

  if (!isAppShellRequest) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return caches.match('/ManiTradePro/index.html');
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
