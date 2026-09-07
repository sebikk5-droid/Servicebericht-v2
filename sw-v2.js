const CACHE_NAME = "servicebericht-v2-html-2";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
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
  let path = "";
  try { path = new URL(req.url).pathname; } catch (e) { return; }
  const isHtml = req.mode === "navigate" || /\/v2\.html$/i.test(path);
  const isManifest = /\/manifest-v2\.webmanifest$/i.test(path);
  if (!isHtml && !isManifest) return;
  event.respondWith(
    fetch(req, { cache: "no-store" }).then(res => {
      if (res && res.ok && isHtml) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put("./v2.html", copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match("./v2.html"))
  );
});
