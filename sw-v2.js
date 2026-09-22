const CACHE_NAME = "servicebericht-v3-08";
// companies.json is intentionally omitted — it is not on GitHub Pages and
// cache.addAll() fails the whole install if any URL 404s (broke offline cold start).
const APP_SHELL = [
  "./v2.html",
  "./manifest-v2.webmanifest",
  "./vendor/pdf-lib.min.js",
  "./vendor/pdf.min.js",
  "./vendor/pdf.worker.min.js",
  "./machine-catalog.json",
  "./Leer.pdf",
  "./favicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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

function isPdfAsset(url) {
  const path = pathOf(url);
  return (
    path.endsWith("/vendor/pdf-lib.min.js") ||
    path.endsWith("/vendor/pdf.min.js") ||
    path.endsWith("/vendor/pdf.worker.min.js") ||
    path.endsWith("/Leer.pdf")
  );
}

function timeoutFetch(req, ms) {
  const init = isVersionAsset(req.url) ? { cache: "no-store" } : undefined;
  return Promise.race([
    fetch(req, init),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}

function matchCurrent(req, ignoreSearch) {
  return caches.open(CACHE_NAME).then(cache =>
    cache.match(req, ignoreSearch ? { ignoreSearch: true } : undefined)
  );
}

// Cache each file on its own — one 404 must not abort the whole install.
function precacheShell() {
  return caches.open(CACHE_NAME).then(cache =>
    Promise.all(
      APP_SHELL.map(url =>
        fetch(url, { cache: "no-store" })
          .then(res => {
            if (res && res.ok) return cache.put(url, res);
          })
          .catch(() => {})
      )
    )
  );
}

self.addEventListener("install", event => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && /servicebericht/i.test(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Offline-first for the app shell: serve cache immediately when present,
  // refresh from network in the background when possible.
  if (isV2Navigation(req)) {
    event.respondWith(
      matchCurrent("./v2.html", true).then(cached => {
        const net = timeoutFetch(req, cached ? 2500 : 4000)
          .then(res => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy)).catch(() => {});
              return res;
            }
            return null;
          })
          .catch(() => null);

        if (cached) {
          // Return cached shell right away (cold start offline), update when online.
          net.catch(() => {});
          return cached;
        }
        return net.then(res => {
          if (res) return res;
          return matchCurrent("./v2.html", true).then(again => {
            if (again) return again;
            return Response.error();
          });
        });
      })
    );
    return;
  }

  if (!isAppAsset(req.url)) return;

  if (isVersionAsset(req.url)) {
    event.respondWith(
      matchCurrent(req, true).then(cached => {
        const net = timeoutFetch(req, cached ? 2500 : 4000)
          .then(res => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
              return res;
            }
            return null;
          })
          .catch(() => null);
        if (cached) {
          net.catch(() => {});
          return cached;
        }
        return net.then(res => res || Response.error());
      })
    );
    return;
  }

  // PDF libs + template: always prefer cache (needed for cold offline PDF).
  if (isPdfAsset(req.url)) {
    event.respondWith(
      matchCurrent(req, true).then(cached => {
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
    return;
  }

  event.respondWith(
    matchCurrent(req, true).then(cached => {
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
