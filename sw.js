/**
 * @file sw.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description service worker PWA e cache versionado
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */

importScripts("./js/version.js");

/**
 * @description Lê versão de runtime em js/version.js para nomear cache e invalidar instalações antigas.
 * @returns {string} Identificador semver (APP_VERSION) ou "1.0.0" se indisponível.
 */
function getAppRuntimeVersion() {
    if (typeof self.TalkToYouVersion !== "undefined" && self.TalkToYouVersion.APP_VERSION) {
        return self.TalkToYouVersion.APP_VERSION;
    }

    return "1.0.0";
}

const APP_RUNTIME_VERSION = getAppRuntimeVersion();
const CACHE_NAME = `talktoyou-cache-v${APP_RUNTIME_VERSION}`;

/**
 * @description Lista de URLs estáticas pré-cacheadas na instalação do Service Worker.
 * @type {string[]}
 */
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/style.css",
    "./js/version.js",
    "./js/dexie-setup.js",
    "./js/audio-service.js",
    "./js/pdf-service.js",
    "./js/i18n.js",
    "./js/learning-service.js",
    "./js/app.js",
    "./js/vendor/dexie.min.js",
    "./js/vendor/jspdf.umd.min.js",
    "./ajuda.html",
    "./ajuda-en.html",
    "./ajuda-es.html",
    "./privacidade.html",
    "./privacidade-en.html",
    "./privacidade-es.html",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png"
];

/**
 * @description Listener install: abre cache versionado, adiciona FILES_TO_CACHE e chama skipWaiting.
 * @param {ExtendableEvent} event - Evento install do Service Worker.
 * @returns {void}
 * @throws {Error} Falhas em cache.addAll propagam via event.waitUntil (instalação pode falhar).
 */
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

/**
 * @description Listener activate: remove caches de versões anteriores e assume controle com clients.claim.
 * @param {ExtendableEvent} event - Evento activate do Service Worker.
 * @returns {void}
 */
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }

                    return Promise.resolve();
                })
            ))
            .then(() => self.clients.claim())
    );
});

/**
 * @description Listener fetch: network-first para GET, atualiza cache em sucesso e usa cache em offline.
 * @param {FetchEvent} event - Requisição interceptada pelo Service Worker.
 * @returns {void}
 */
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const responseClone = networkResponse.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, responseClone));

                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
