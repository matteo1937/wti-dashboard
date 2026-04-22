// WTI Dashboard Service Worker — minimal app-shell cache + network-first for dynamic data
const CACHE = 'wti-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first for all data + API endpoints
  if (url.pathname.match(/\.(json)$/) ||
      ['/price','/multiprice','/analyze','/postmortem','/calendar','/eia'].includes(url.pathname)) {
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  // Cache-first for shell
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok && e.request.method === 'GET') {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return resp;
  }).catch(()=>caches.match('/'))));
});
