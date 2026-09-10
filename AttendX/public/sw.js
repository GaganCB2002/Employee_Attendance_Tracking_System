/* AttendX service worker: shell caching + network-first API passthrough.
   Checkpoint actions REQUIRE live GPS + camera, so they are never cached —
   only the static shell is cached for fast loads / fallback. */
'use strict';

const CACHE = 'attendx-v1';
const SHELL = [
  '/', '/index.html', '/css/app.css', '/js/api.js', '/js/geo.js', '/js/camera.js',
  '/js/employee.js', '/js/admin.js', '/js/app.js', '/manifest.webmanifest', '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls or media — always live (GPS/camera freshness).
  if (url.pathname.startsWith('/api/')) return;
  // Static: cache-first with background refresh.
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const fetchP = fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => hit || Response.error());
        return hit || fetchP;
      }));
  }
});
