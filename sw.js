// Service Worker: App offline-fähig (cache-first).
// Bei JEDER Änderung an den App-Dateien VERSION hochzählen – sonst kommt das Update nicht an.
const VERSION = "hyrox-v4";
const FONTS = "hyrox-fonts";
const ASSETS = [
  "./", "index.html", "styles.css", "plan.js", "app.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(resp => {
        if (resp.ok) { const copy = resp.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return resp;
      }).catch(() => req.mode === "navigate" ? caches.match("index.html") : Response.error()))
    );
    return;
  }

  // Google Fonts beim ersten Laden merken, damit die Schrift auch offline passt
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(resp => {
        if (resp.ok || resp.type === "opaque") c.put(req, resp.clone());
        return resp;
      })))
    );
  }
});
