const CACHE_NAME = 'bookkeeping-cache-v1';
const urlsToCache = [
  './',
  './dashboard.html',
  './dashboard.js',
  './notes.html',
  './notes.js',
  './login.js',
  './style.css',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/iife/index-min.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Service Worker caching files');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Fetch event with navigation fallback
self.addEventListener('fetch', event => {
  // Handle navigation requests (like refreshing dashboard.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./dashboard.html'))
    );
    return;
  }

  // For other requests (JS, CSS, etc.)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});