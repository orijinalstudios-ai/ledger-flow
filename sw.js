const CACHE_NAME = 'ledgerflow-pwa-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/firebase-config.js',
  '/xlsx.full.min.js',
  '/exceljs.min.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
];

// Install Event - Pre-cache core files with robust error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets');
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[ServiceWorker] Failed to cache asset:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker for API routes, auth endpoints, Firestore, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation requests (App Launch / Opening from Home Screen / Page Reload)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
              cache.put('/', copy.clone());
              cache.put('/index.html', copy.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Robust offline fallback: try match exact request, then '/', then '/index.html'
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;
          return new Response('LedgerFlow is offline. Please reconnect to internet.', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 2. Static Assets & External CDNs
  const isCdn = url.hostname.includes('googleapis.com') ||
                url.hostname.includes('gstatic.com') ||
                url.hostname.includes('tailwindcss.com') ||
                url.hostname.includes('jsdelivr.net');

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        if (isCdn) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
