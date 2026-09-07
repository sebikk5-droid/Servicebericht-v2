const CACHE_NAME = "servicebericht-v2-103";
const APP_SHELL = [
  "./v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./machine-catalog.json",
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
  if (path.endsWith("/sw-v2.js")) return false;
  if (path.endsWith("/repair.html")) return false;
  return (
    path.endsWith("/v2.html") ||
    path.endsWith("/servicebericht-v2.html") ||
    path.endsWith("/manifest-v2.webmanifest") ||
    path.endsWith("/vendor/pdf-lib.min.js") ||
    path.endsWith("/machine-catalog.json") ||
    path.endsWith("/Leer.pdf") ||
    path.endsWith("/favicon.png") ||
    /\/icons\/icon-\d+\.png$/.test(path)
  );
}

function fetchNetwork(req, ms) {
  const timeout = new Promise(function(_, reject){
    setTimeout(function(){ reject(new Error("timeout")); }, ms || 12000);
  });
  return Promise.race([fetch(req), timeout]);
}

async function matchHtml() {
  const keys = await caches.keys();
  for (let i = 0; i < keys.length; i++) {
    const cache = await caches.open(keys[i]);
    const hit = await cache.match("./v2.html", { ignoreSearch: true })
      || await cache.match("v2.html", { ignoreSearch: true });
    if (hit) return hit;
  }
  return null;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const res = await fetchNetwork(url, 15000);
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const ready = await cache.match("./v2.html");
    if (!ready) return;
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  let host = "";
  try { host = new URL(req.url).hostname; } catch (e) {}
  if (host === "api.github.com" || host === "github.com") return;
  if (req.method !== "GET") return;

  if (isV2Navigation(req)) {
    event.respondWith((async () => {
      const cached = await matchHtml();
      try {
        const res = await fetchNetwork(req, 12000);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy)).catch(() => {});
          return res;
        }
      } catch (e) {}
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (e) {
        return Response.redirect("./repair.html", 302);
      }
    })());
    return;
  }

  if (!isV2Asset(req.url)) return;

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetchNetwork(req, 15000);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (e) {
      if (cached) return cached;
      return fetch(req);
    }
  })());
});
