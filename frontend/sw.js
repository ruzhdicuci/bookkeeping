const CACHE_NAME = 'bookkeeping-cache-v1';
const urlsToCache = [
  './',
  './dashboard.html',
  './dashboard.js',
  './notes.html',
  './notes.js',
  './login.js',
  './style.css',
  './manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Service Worker caching files');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});