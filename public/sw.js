// public/sw.js — TripFlow PWA Service Worker
const CACHE_VERSION = "tripflow-v1.0.0";
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// WICHTIG: Hier alle Assets rein, die sofort offline verfügbar sein sollen
const CORE_ASSETS = [
  "/",                // Start-URL
  "/index.html",      // HTML (falls direkt angefordert)
  "/manifest.json",
  "/logo.png",
  "/app-icon.png",
  "/app-icon-180.png" // optional, falls vorhanden
];

// Hilfsfunktionen
async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
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
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fallback: versuche Startseite (hilft bei Offline-Navigation)
    return caches.match("/index.html");
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const networkPromise = fetch(req).then(res => {
    cache.put(req, res.clone());
    return res;
  }).catch(() => cached || fetch(req));
  return cached || networkPromise;
}

// Install: Kern-Dateien vorab cachen
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: alte Caches aufräumen
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CORE_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch-Strategien
self.addEventListener("fetch", (evt) => {
  const req = evt.request;

  // POST/PUT/… nicht abfangen (z. B. /api/generate)
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Eigene Domain
  if (url.origin === self.location.origin) {
    // HTML-Navigation (PWA-Start, interne Navigation)
    if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
      evt.respondWith(networkFirst(req));
      return;
    }

    // API nicht cachen
    if (url.pathname.startsWith("/api/")) return;

    // Statische Dateien (Bilder, manifest, css/js im Projekt)
    evt.respondWith(cacheFirst(req));
    return;
  }

  // Externe Ressourcen (CDNs: Tailwind, marked, Google Fonts): Stale-While-Revalidate
  evt.respondWith(staleWhileRevalidate(req));
});

// Optional: Sofort-Aktualisierung bei neuem SW
self.addEventListener("message", (evt) => {
  if (evt.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
