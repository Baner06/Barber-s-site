const CACHE_NAME = "barber-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./config.js",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/admin.js",
  "./js/supabase-client.js",
  "./js/pwa.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a Supabase ni a CDNs de módulos: siempre en vivo.
  if (url.hostname.includes("supabase.co") || url.hostname.includes("esm.sh")) {
    return;
  }

  // Solo manejar peticiones GET del mismo origen (app shell).
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
