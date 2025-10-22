// public/sw.js — TripFlow PWA Service Worker
const CACHE_VERSION = "tripflow-v1.0.2";
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const CORE_ASSETS_INTERNAL = [
  "/",              // Start (für PWA/Home)
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/app-icon.png",
  "/app-icon-180.png" // optional
];

const CORE_ASSETS_EXTERNAL = [
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

// Helpers
async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Fallback auf Startseite, damit Offline-Navigation funktioniert
    return caches.match("/index.html");
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  const network = fetch(req).then(res => {
    cache.put(req, res.clone());
    return res;
  }).catch(() => hit || fetch(req));
  return hit || network;
}

// Install
self.addEventListener("install", (evt) => {
  evt.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    await core.addAll(CORE_ASSETS_INTERNAL);
    await Promise.allSettled(
      CORE_ASSETS_EXTERNAL.map(async (url) => {
        try {
          const res = await fetch(new Request(url, { mode: "no-cors" }));
          await core.put(url, res);
        } catch {}
      })
    );
    self.skipWaiting();
  })());
});

// Activate
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![CORE_CACHE, RUNTIME_CACHE].includes(k))
        .map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
      evt.respondWith(networkFirst(req)); // HTML
      return;
    }
    if (url.pathname.startsWith("/api/")) return; // API nie cachen
    evt.respondWith(cacheFirst(req)); // Statische Projektdateien
    return;
  }

  // Externe CDNs
  evt.respondWith(staleWhileRevalidate(req));
});

self.addEventListener("message", (evt) => {
  if (evt.data === "SKIP_WAITING") self.skipWaiting();
});
