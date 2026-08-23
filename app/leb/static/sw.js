// Service Worker mínimo — cache-first para shell do app
const CACHE = 'leiloes-pt-v1';
const SHELL = ['/', '/?cabanas=1'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Streamlit websocket/health: nunca cachear
  if (url.pathname.startsWith('/_stcore/') || url.pathname === '/healthz') return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) cache.put(e.request, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
