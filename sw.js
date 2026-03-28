const CACHE_NAME = 'manitradepro-v4.3';
const ASSETS = ['/ManiTradePro/','/ManiTradePro/index.html','/ManiTradePro/js/app-bundle.js','/ManiTradePro/css/variables.css','/ManiTradePro/css/reset.css','/ManiTradePro/css/layout.css','/ManiTradePro/css/components.css','/ManiTradePro/css/components-v2-additions.css','/ManiTradePro/css/screens.css','/ManiTradePro/css/screens-v2-additions.css'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (!e.request.url.includes('github.io')) return;
  e.respondWith(fetch(e.request).then(response => {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
    return response;
  }).catch(() => caches.match(e.request)));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
