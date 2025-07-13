const CACHE_NAME = 'bookkeeping-cache-v2';
const urlsToCache = [
  './',
  './libs/dexie.min.js',
  './libs/idb.min.js',
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



// ✅ ACTIVATE event (add this here)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});



// Fetch event with navigation fallback
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        const url = new URL(event.request.url);
        if (url.pathname.includes('notes.html')) {
          return caches.match('./notes.html');
        }
        if (url.pathname.includes('login.html')) {
          return caches.match('./login.html');
        }
        return caches.match('./dashboard.html'); // default fallback
      })
    );
    return;
  }

  // Static files
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});