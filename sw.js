// アプリのファイルを変更したら CACHE_NAME の番号を上げる
const CACHE_NAME = 'ccna-qa-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=3',
  './app.js',
  './chapters.js',
  './questions-shared.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// ネットワークファースト（オンライン時は最新を取得してキャッシュ更新、オフライン時はキャッシュ）
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' }).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      })
    )
  );
});
