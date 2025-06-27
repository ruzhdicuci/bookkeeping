const CACHE_NAME = 'bookkeeping-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/notes.html',
  '/login.js',
  '/dashboard.js',
  '/notes.js',
  '/style.css',
  '/manifest.json'
  // Add more files here as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  console.log('🔧 Service Worker installed');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});