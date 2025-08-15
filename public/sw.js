// sw.js - Service Worker für Stopwatch Magic PWA
const CACHE_NAME = 'stopwatch-magic-v1';
const urlsToCache = [
  '/',
  '/spectator.html',
  '/magician/login.html',
  '/magician/dashboard.html',
  '/magician/stopwatch-admin.html',
  '/js/stopwatch.js',
  '/js/shared.js',
  '/js/magician.js',
  '/css/styles.css',
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
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
