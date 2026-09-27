const CACHE_NAME = 'onthespot-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/components.css',
  './js/app.js',
  './js/data.js',
  './js/map.js',
  './js/sound.js',
  './js/features/EmergencyFeatures.js',
  './js/services/OverpassAPI.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('overpass-api') || event.request.url.includes('nominatim')) {
    // For API calls, try network first, then cache
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => {
           // On failure, return nothing or index
        });
      })
  );
});
