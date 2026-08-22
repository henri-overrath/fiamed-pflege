const CACHE = 'fiamed-pflege-pwa-v13';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './extended.css',
  './planning.css',
  './tour.css',
  './recurring.css',
  './insights.css',
  './polish.css',
  './home-redesign.css',
  './mobile-polish.css',
  './tour-end.css',
  './home-shortcut.css',
  './report-supply.css',
  './pilot-upgrade.css',
  './report-polish.css',
  './lock.css',
  './lock.js',
  './feierabend.css',
  './app.js',
  './pwa.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match('./index.html')))
  );
});
