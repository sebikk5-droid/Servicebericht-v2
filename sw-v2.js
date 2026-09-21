const CACHE_NAME = "servicebericht-v3-01";
const APP_SHELL = [
  "./v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./vendor/pdf.min.js",
  "./vendor/pdf.worker.min.js",
  "./companies.json",
  "./machine-catalog.json",
  "./Leer.pdf",
  "./favicon.png",
  "./icons/icon-192.png"
];

function pathOf(url) {
  try { return new URL(url).pathname; } catch (e) { return ""; }
}

function isV2Navigation(req) {
  if (req.mode !== "navigate") return false;
  const path = pathOf(req.url);
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/v2/") ||
    path.endsWith("/v2/index.html")
  );
}

function isAppAsset(url) {
  const path = pathOf(url);
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/sw-v2.js") ||
    path.endsWith("/manifest-v2.webmanifest") ||
    path.endsWith("/vendor/pdf-lib.min.js") ||
    path.endsWith("/vendor/pdf.min.js") ||
    path.endsWith("/vendor/pdf.worker.min.js") ||
    path.endsWith("/companies.json") ||
    path.endsWith("/machine-catalog.json") ||
    path.endsWith("/Leer.pdf") ||
    path.endsWith("/favicon.png") ||
    /\/icons\/icon-\d+\.png$/.test(path)
  );
}

function isVersionAsset(url) {
  const path = pathOf(url);
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/sw-v2.js") ||
    path.endsWith("/manifest-v2.webmanifest")
  );
}

function timeoutFetch(req, ms) {
  const init = isVersionAsset(req.url) ? { cache: "no-store" } : undefined;
  return Promise.race([
    fetch(req, init),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && /servicebericht-v2/i.test(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (isV2Navigation(req)) {
    event.respondWith(
      timeoutFetch(req, 2500).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("./v2.html", { ignoreSearch: true }))
    );
    return;
  }

  if (!isAppAsset(req.url)) return;

  if (isVersionAsset(req.url)) {
    event.respondWith(
      timeoutFetch(req, 2500).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return timeoutFetch(req, 4000).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
