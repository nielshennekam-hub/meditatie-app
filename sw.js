/* Stilte — service worker.
   Navigaties gaan netwerk-eerst (altijd de nieuwste app als je online
   bent, met cache als vangnet voor offline); overige bestanden
   cache-eerst voor snelheid. */

const CACHE = "stilte-v17";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/i18n.js",
  "./js/quotes.js",
  "./js/audio.js",
  "./js/stats.js",
  "./js/timer.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/apple-touch-icon-167.png",
  "./icons/apple-touch-icon-152.png",
  "./icons/apple-touch-icon-120.png",
  "./assets/sounds/bowl-small.mp3",
  "./assets/sounds/silence.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === location.origin;

  // Code (navigatie + js/css/manifest): netwerk-eerst, zodat HTML en
  // scripts altijd uit dezelfde versie komen; cache als offline-vangnet.
  const isCode = event.request.mode === "navigate" ||
    (sameOrigin && /\.(?:js|css|webmanifest)$/.test(url.pathname));

  if (isCode) {
    event.respondWith(
      fetch(event.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then(hit =>
          hit || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
    );
    return;
  }

  // Media (audio, afbeeldingen): cache-eerst voor snelheid en offline gebruik.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(event.request).then(res => {
        if (res.ok && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return res;
      })
    )
  );
});
