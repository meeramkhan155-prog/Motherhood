// Service worker: lets the app install to the home screen and open fast.
// Chat requests are never cached; answers always come live.
const CACHE = "motherhood-v4"; // bump this whenever you change files in /public
const SHELL = ["/", "/library.js", "/i18n.js", "/myths.js", "/companion.js", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Network first, fall back to cache when offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only keep good answers. Caching a 404 or 500 would serve the broken page offline.
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        // Only page loads fall back to the app shell; an image should not get HTML back.
        if (req.mode === "navigate") return caches.match("/");
        return Response.error();
      })
  );
});
