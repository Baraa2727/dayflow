// public/sw.js — TripFlow PWA Service Worker
const CACHE_VERSION = "tripflow-v1.0.1";
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Interne Kern-Assets, die immer offline verfügbar sein sollen
const CORE_ASSETS_INTERNAL = [
  "/",              // Start
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/app-icon.png",
  "/app-icon-180.png" // optional, falls vorhanden
];

// Externe, kritische Ressourcen (CDNs), damit es offline nicht "blitzt"
const CORE_ASSETS_EXTERNAL = [
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  // Fonts sind nice-to-have, aber nicht kritisch. CSS holen wir mit, die Font-Dateien kommen lazy.
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
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
    // Fallback auf index.html, damit Navigationsaufrufe offline nicht brechen
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

// Install: interne + externe Kernressourcen cachen
self.addEventListener("install", (evt) => {
  evt.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    // Interne Assets in einem Rutsch
    await core.addAll(CORE_ASSETS_INTERNAL);

    // Externe Assets einzeln (wegen CORS/opaque Responses nicht addAll)
    await Promise.allSettled(
      CORE_ASSETS_EXTERNAL.map(async (url) => {
        try {
          const res = await fetch(new Request(url, { mode: "no-cors" }));
          await core.put(url, res);
        } catch (_) {
          // Ignorieren: Wenn eine externe Resource nicht lädt, bricht Install nicht ab
        }
      })
    );
    self.skipWaiting();
  })());
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
  if (req.method !== "GET") return; // API-POSTs usw. nicht stören

  const url = new URL(req.url);

  // Eigene Domain
  if (url.origin === self.location.origin) {
    // HTML-Navigation (Start/Seitenwechsel)
    if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
      evt.respondWith(networkFirst(req));
      return;
    }
    // API nie cachen
    if (url.pathname.startsWith("/api/")) return;

    // Statisches aus eigenem Projekt
    evt.respondWith(cacheFirst(req));
    return;
  }

  // Externe Ressourcen (CDN) -> Stale-While-Revalidate
  evt.respondWith(staleWhileRevalidate(req));
});

// Optional: Sofort auf neue SW-Version wechseln
self.addEventListener("message", (evt) => {
  if (evt.data === "SKIP_WAITING") self.skipWaiting();
});
