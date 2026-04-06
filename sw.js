const CACHE_VERSION = "manitradepro-v5.3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/app.js",
  "./assets/styles.css"
];

function isHttpRequest(url) {
  return url.protocol === "http:" || url.protocol === "https:";
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isApiRequest(requestUrl) {
  return requestUrl.pathname.startsWith("/api/") || requestUrl.hostname.endsWith(".workers.dev");
}

function isAppShellRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(requestUrl) {
  return (
    requestUrl.pathname.includes("/assets/") ||
    requestUrl.pathname.includes("/icons/") ||
    requestUrl.pathname.endsWith(".css") ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".png") ||
    requestUrl.pathname.endsWith(".svg") ||
    requestUrl.pathname.endsWith(".webmanifest")
  );
}

async function safeCachePut(cache, request, response) {
  try {
    const url = new URL(request.url);
    if (!isHttpRequest(url)) return;
    if (!response || !response.ok) return;
    await cache.put(request, response.clone());
  } catch (_) {
    return;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    await safeCachePut(cache, request, response);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      await safeCachePut(cache, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  throw new Error("Resource unavailable");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isHttpRequest(url)) {
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(
      networkFirst(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match("./index.html")) || Response.error();
      })
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      return (await cache.match(request)) || Response.error();
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
