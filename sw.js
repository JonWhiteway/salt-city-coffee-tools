/* Salt City Command Deck service worker.
   - Pages (HTML): network first, so people always get the latest deploy; falls back to
     the last cached copy, then offline.html, when there's no connection.
   - Icons/manifest/offline page: cached so the app opens instantly.
   - Supabase, fonts, CDNs and any other site: never touched (passed straight through),
     so logins and live data always come from the server.
   Bump VERSION whenever you change this file. */
const VERSION = 'cd-v2';
const CORE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts, CDNs: leave alone

  // Page loads: network first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline.html')))
    );
    return;
  }

  // Icons (site root) and manifest: cache first
  if (/^\/(icon-|logo\.svg|apple-touch-icon|favicon-)/.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
