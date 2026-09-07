self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}
    try {
      await self.registration.unregister();
    } catch (e) {}
    try {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(list.map(c => c.navigate ? c.navigate(c.url) : Promise.resolve()));
    } catch (e) {}
  })());
});
