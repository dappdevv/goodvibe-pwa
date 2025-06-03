const CACHE_NAME = "goodvibe-pwa-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/logo-192px.png",
  "/icons/logo-512px.png",
  // Добавьте сюда пути к иконкам и основным ассетам
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
