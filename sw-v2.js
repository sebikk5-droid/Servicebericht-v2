const CACHE_NAME = "servicebericht-v2-24";
const APP_SHELL = [
  "./v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./companies.json",
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
    path.endsWith("/companies.json") ||
    path.endsWith("/Leer.pdf") ||
    path.endsWith("/favicon.png") ||
    /\/icons\/icon-\d+\.png$/.test(path)
  );
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
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
  if (req.method !== "GET") return;

  if (isV2Navigation(req)) {
    event.respondWith(
      fetch(req, {cache: "no-store"})
        .then(res => {
          if (new URL(req.url).pathname.endsWith("/v2.html")) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./v2.html"))
    );
    return;
  }

  if (!isV2Asset(req.url)) return;

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }))
  );
});
