const CACHE = 'fiamed-pflege-pwa-v20';
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
  './share.js',
  './feierabend.css',
  './material-schnell.css',
  './tour-progress.css',
  './app.js',
  './pwa.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  // Bewusst nicht cache.addAll(APP_FILES): das macht normale fetch()-Aufrufe,
  // die den gewöhnlichen HTTP-Browser-Cache respektieren. GitHub Pages sendet
  // "Cache-Control: max-age=600" — ohne {cache:'reload'} würde ein frisch
  // installierter Service Worker damit teils noch bis zu 10 Minuten alte
  // Dateien in seinen eigenen (neuen!) Cache übernehmen, obwohl der Server
  // längst die neue Version hat. {cache:'reload'} zwingt jeden Request am
  // HTTP-Cache vorbei direkt ans Netz.
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(APP_FILES.map(url =>
        fetch(url, { cache: 'reload' }).then(response => cache.put(url, response))
      ))
    )
  );
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
