const CACHE_NAME = 'bookkeeping-v1';
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/dashboard.js',
  '/notes.html',
  '/notes.js',
  '/login.js',
  '/style.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  console.log('✅ Service Worker installed');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});