/* service worker: always-fresh pages + scripts, cached images, offline fallback */
const CACHE_NAME = 'aviorcart-v2';
const STATIC_ASSETS = ['/', '/index.html', '/assets/theme.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

function put(req, resp) {
  if (resp && resp.status === 200 && resp.type === 'basic') {
    const clone = resp.clone();
    caches.open(CACHE_NAME).then(c => c.put(req, clone));
  }
  return resp;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf('/api/') === 0) return;

  const isImage = /\.(png|jpg|jpeg|webp|svg|ico|avif)$/i.test(url.pathname);
  if (isImage) {
    e.respondWith(caches.match(req).then(c => c || fetch(req).then(r => put(req, r))));
    return;
  }

  e.respondWith(
    fetch(req)
      .then(r => put(req, r))
      .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
  );
});
