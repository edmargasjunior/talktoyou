/*
============================================================
TalkToYou - Service Worker
Arquivo: sw.js

Objetivo:
Permitir que o aplicativo tenha comportamento mais próximo de um app
instalado, com cache de arquivos essenciais e possibilidade de uso offline.

Importante para a tese:
O Service Worker atua como uma camada de disponibilidade e resiliência.
Ele não coleta dados, não envia informações para servidores e não acessa
os cards personalizados do usuário.

Os cards, imagens e áudios criados pelo usuário continuam armazenados no
IndexedDB/localStorage do aparelho.
============================================================
*/

/*
    Sempre que publicar uma versão nova do app, altere este número.

    Exemplo:
    v1 -> v2 -> v3

    Isso força o navegador/app a criar um novo cache e remover o antigo.
*/
const CACHE_VERSION = "1";
const CACHE_NAME = `talktoyou-cache-v${CACHE_VERSION}`;

/*
    Lista de arquivos essenciais para funcionamento básico offline.

    Atenção:
    Se algum arquivo desta lista não existir no projeto, a instalação
    do Service Worker pode falhar.
*/
const FILES_TO_CACHE = [
    "./",
    "./index.html",

    "./manifest.json",

    "./css/style.css",

    "./js/dexie-setup.js",
    "./js/audio-service.js",
    "./js/pdf-service.js",
    "./js/i18n.js",
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

/*
============================================================
INSTALL

Executado quando o Service Worker é instalado.

Aqui o app salva em cache os arquivos principais.
============================================================
*/
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                /*
                    skipWaiting faz o novo Service Worker ser ativado
                    mais rapidamente após uma atualização.
                */
                return self.skipWaiting();
            })
    );
});

/*
============================================================
ACTIVATE

Executado quando o Service Worker é ativado.

Aqui removemos caches antigos para evitar que o usuário fique preso
em versões anteriores do aplicativo.
============================================================
*/
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }

                        return Promise.resolve();
                    })
                );
            })
            .then(() => {
                /*
                    clients.claim permite que o Service Worker assuma
                    o controle das páginas abertas sem exigir nova abertura.
                */
                return self.clients.claim();
            })
    );
});

/*
============================================================
FETCH

Intercepta requisições do app.

Estratégia usada:
- tenta buscar na internet primeiro;
- se falhar, usa o cache.

Motivo:
Durante testes e atualizações, isso reduz o risco de o usuário ficar
vendo arquivos antigos.
============================================================
*/
self.addEventListener("fetch", (event) => {
    /*
        Por segurança, só tratamos requisições GET.
        POST, PUT, DELETE etc. não devem ser cacheados aqui.
    */
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                /*
                    Se a busca online funcionar, atualizamos o cache
                    com a versão mais recente do arquivo.
                */
                const responseClone = networkResponse.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseClone);
                    });

                return networkResponse;
            })
            .catch(() => {
                /*
                    Se estiver offline ou a rede falhar, tenta carregar
                    a versão salva no cache.
                */
                return caches.match(event.request);
            })
    );
});
