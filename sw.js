const CACHE_NAME = 'talktoyou-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/dexie-setup.js',
  './js/audio-service.js',
  './js/pdf-service.js',
  './js/app.js',
  './assets/icons/logo.svg'
];

// Instala o Service Worker e guarda os arquivos estruturais no cache do aparelho
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Estratégia de Cache: Serve o arquivo do cache se houver, senão busca na rede
self.addEventListener('fetch', (e) => {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
});