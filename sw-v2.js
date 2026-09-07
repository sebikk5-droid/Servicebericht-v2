const CACHE_NAME = "servicebericht-v2-102";
const APP_SHELL = [
  "./v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./machine-catalog.json",
  "./Leer.pdf",
  "./favicon.png",
  "./icons/icon-192.png"
];

function isV2Navigation(req) {
  if (req.mode !== "navigate") return false;
  const path = new URL(req.url).pathname;
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/v2/") ||
    path.endsWith("/v2/index.html")
  );
}

function isV2Asset(url) {
  const path = new URL(url).pathname;
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/sw-v2.js") ||
    path.endsWith("/manifest-v2.webmanifest") ||
    path.endsWith("/vendor/pdf-lib.min.js") ||
    path.endsWith("/machine-catalog.json") ||
    path.endsWith("/Leer.pdf") ||
    path.endsWith("/favicon.png") ||
    /\/icons\/icon-\d+\.png$/.test(path)
  );
}

function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, ms);
  const url = typeof req === "string" ? req : req.url;
  return fetch(url, { signal: ctrl.signal, cache: "no-store", redirect: "follow" })
    .finally(function(){ clearTimeout(t); });
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try {
        const res = await fetchWithTimeout(url, 8000);
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  let host = "";
  try { host = new URL(req.url).hostname; } catch (e) {}
  if (host === "api.github.com" || host === "github.com") return;
  if (req.method !== "GET") return;

  if (isV2Navigation(req)) {
    event.respondWith((async () => {
      const cached = await caches.match("./v2.html");
      try {
        const res = await fetchWithTimeout(req, 2500);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy)).catch(() => {});
          return res;
        }
      } catch (e) {}
      if (cached) return cached;
      try {
        return await fetchWithTimeout(req, 4000);
      } catch (e) {
        return new Response(
          "<!doctype html><meta charset=utf-8><title>Servicebericht</title><p>Offline. App schließen und noch einmal öffnen.</p>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  if (!isV2Asset(req.url)) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      fetchWithTimeout(req, 6000).then(res => {
        if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res)).catch(() => {});
      }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetchWithTimeout(req, 8000);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
