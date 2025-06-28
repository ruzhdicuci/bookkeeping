const CACHE_NAME = 'bookkeeping-cache-v2';
const urlsToCache = [
  './',
  './dashboard.html',
  './dashboard.js',
  './notes.html',
  './notes.js',
  './login.html',
  './login.js',
  './dexieDb.js',
  './style.css',
  './manifest.json',
  './icon.jpg',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/iife/index-min.js'
];
// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('✅ Service Worker caching files individually...');
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
          console.log(`📦 Cached: ${url}`);
        } catch (err) {
          console.warn(`⚠️ Failed to cache: ${url}`, err);
        }
      }
    })
  );
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