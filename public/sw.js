/* eslint-disable no-restricted-globals */
/**
 * Groundwork PWA service worker
 *
 * Goals:
 * - App works offline AFTER it has been opened online at least once.
 * - Keep caching safe: don't cache cross-origin (Supabase) requests.
 * - Avoid “stale forever” behavior by using stale-while-revalidate for assets.
 *
 * If you want true precaching (so *everything* needed is cached immediately on install),
 * we can upgrade this to Workbox + injectManifest during the web export build.
 */

const CACHE_NAME = 'groundwork-pwa-v2';

// Small bootstrap set so installability works quickly.
const BOOTSTRAP = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
];

const isCacheableResponse = (res) =>
  res &&
  res.status === 200 &&
  // Only cache “basic” same-origin responses.
  (res.type === 'basic' || res.type === 'default');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(BOOTSTRAP)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/**
 * Strategy:
 * - Navigations: network-first, fallback to cached `/` (SPA shell).
 * - Static assets (script/style/image/font): stale-while-revalidate.
 * - Other same-origin GETs: network-first with cache fallback.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: get fresh when possible; fall back to shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(req.destination);

  if (isStaticAsset) {
    // stale-while-revalidate
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkPromise = fetch(req)
          .then((res) => {
            if (isCacheableResponse(res)) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => undefined);

        return cached || networkPromise || Response.error();
      })
    );
    return;
  }

  // Default for other same-origin requests: network-first.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (isCacheableResponse(res)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
