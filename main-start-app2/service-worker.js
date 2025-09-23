const CACHE_NAME = 'yami-lat-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/indexContent.js',
  // Add other critical assets here if needed, e.g., images, other JS files
  '/js/aboutAndDMCA.js',
  '/js/adultContent.js',
  '/js/buscador.js',
  '/js/config.js',
  '/js/configuracion.js',
  '/js/favoritos.js',
  '/js/home.js',
  '/js/script.js',
  '/js/series.js',
  '/js/templates/configuracionTemplate.js',
  '/js/templates/favoritosTemplate.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
