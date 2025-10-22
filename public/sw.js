// public/sw.js — TripFlow PWA Service Worker (Offline-Fallback)
const CACHE_VERSION = "tripflow-v1.1.0";
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Unbedingt im Repo vorhanden:
const CORE_ASSETS_INTERNAL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/offline.html"   // <- Offline-Seite
];

// Falls du externe CDNs nutzt, kannst du sie hier optional aufnehmen:
const CORE_ASSETS_EXTERNAL = [
  // "https://cdn.tailwindcss.com",
  // "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  // "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

// ---------- Helpers ----------
async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, { offlineFallbackTo = "/offline.html" } = {}) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Wichtig: bei Navigationen echte Offline-Seite zeigen
    return caches.match(offlineFallbackTo);
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  const networkPromise = fetch(req)
    .then(res => {
      cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit); // wenn Netz fehl schlägt, Hit verwenden
  return hit || networkPromise;
}

// ---------- Install ----------
self.addEventListener("install", (evt) => {
  evt.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    await core.addAll(CORE_ASSETS_INTERNAL);
    // Externe Ressourcen best-effort
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

// ---------- Activate ----------
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CORE_CACHE, RUNTIME_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---------- Fetch ----------
self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (req.method !== "GET") return; // nur GET cachen

  const url = new URL(req.url);

  // Gleiche Origin (deine App)
  if (url.origin === self.location.origin) {
    // HTML / Navigation
    if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
      evt.respondWith(networkFirst(req, { offlineFallbackTo: "/offline.html" }));
      return;
    }
    // API niemals cachen
    if (url.pathname.startsWith("/api/")) return;

    // Statisches Asset
    evt.respondWith(cacheFirst(req));
    return;
  }

  // Fremd-Origin (CDNs etc.)
  evt.respondWith(staleWhileRevalidate(req));
});

// Optional: sofortige Aktivierung per Message
self.addEventListener("message", (evt) => {
  if (evt.data === "SKIP_WAITING") self.skipWaiting();
});
