/* AVIORCART Service Worker — Static Site */
const CACHE_NAME = 'aviorcart-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/collections.html',
  '/cart.html',
  '/search.html',
  '/wishlist.html',
  '/assets/theme.css',
  '/assets/products.js',
  '/assets/cart.js',
  '/assets/layout.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
