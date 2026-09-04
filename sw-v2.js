const CACHE_NAME = "servicebericht-v2-0";
const APP_SHELL = [
  "./servicebericht-v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./companies.json",
  "./Leer.pdf"
];

function isV2Navigation(req) {
  if (req.mode !== "navigate") return false;
  const path = new URL(req.url).pathname;
  return (
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/v2/") ||
    path.endsWith("/v2/index.html")
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

  // v1 (index.html) must keep using the network. Do not intercept it.
  if (req.mode === "navigate" && !isV2Navigation(req)) return;

  if (isV2Navigation(req)) {
    event.respondWith(
      fetch(req, {cache: "no-store"})
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./servicebericht-v2.html", copy));
          return res;
        })
        .catch(() => caches.match("./servicebericht-v2.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }))
  );
});
