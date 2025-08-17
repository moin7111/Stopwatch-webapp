// sw.js - Service Worker für IMPERIA Control System PWA
// Updated: 2024-01-15
const CACHE_NAME = 'imperia-control-v5-2024-01-15';
const urlsToCache = [
  '/imperia/',
  '/imperia/control/index.html',
  '/imperia/control/login.html',
  '/imperia/control/menu.html',
  '/imperia/control/settings.html',
  '/imperia/control/routines.html',
  '/imperia/control/instructions.html',
  '/imperia/manifest.json',
  '/imperia/icon-192x192.png',
  '/imperia/icon-512x512.png'
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
  
  // Bypass cache for JavaScript and CSS files to ensure latest version
  if (event.request.url.includes('.js') || event.request.url.includes('.css')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
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
          // Delete all old caches (v1, v2, v3)
          if (cacheName !== CACHE_NAME && 
              (cacheName.includes('imperia-control-v') || 
               cacheName.includes('imperia-v'))) {
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

// Notify clients about the update
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});