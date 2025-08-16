// sw.js - Service Worker für IMPERIA Magic System PWA
const CACHE_NAME = 'imperia-magic-v6';
const urlsToCache = [
  '/',
  '/license.html',
  '/modultick.html',
  '/maintick/login.html',
  '/maintick/dashboard.html',
  '/maintick/stopwatch.html',
  '/maintick/manifest.json',
  '/js/stopwatch.js',
  '/js/stopwatch-core.js',
  '/js/stopwatch-api.js',
  '/js/manual-input.js',
  '/js/preset-manager.js',
  '/js/shared.js',
  '/js/magician.js',
  '/css/styles.css',
  '/css/stopwatch-ui.css',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        self.skipWaiting();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Bypass cache for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Update Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});
