/*
============================================================
TalkToYou - Controle de Versões
Arquivo: js/version.js

Objetivo:
Centralizar as versões técnicas e de conteúdo do aplicativo.

Esta separação é importante porque o app possui camadas diferentes:
- arquivos do sistema;
- cache offline;
- cards oficiais de pré-carga;
- estrutura do banco local.

Isso permite atualizar o app sem apagar indevidamente os dados
personalizados do usuário.

Uso acadêmico:
Essa estratégia protege a personalização terapêutica do usuário,
permitindo evolução do sistema sem destruir vocabulário, imagens,
áudios e rotinas criadas por famílias, cuidadores ou profissionais.
============================================================
*/

/** @description Versão semver do runtime do PWA TalkToYou. @type {string} */
const APP_VERSION = "1.0.0";
/** @description Versão legada do cache (referência); o SW usa APP_VERSION no nome do cache. @type {string} */
const CACHE_VERSION = "1";
/** @description Versão dos cards oficiais de pré-carga (seed). @type {string} */
const SEED_VERSION = "1.0.0";
/** @description Versão do schema IndexedDB (Dexie). @type {number} */
const DB_SCHEMA_VERSION = 1;

/**
 * @description Payload global de versões exposto ao app, Service Worker e depuração.
 * @type {{ APP_VERSION: string, CACHE_VERSION: string, SEED_VERSION: string, DB_SCHEMA_VERSION: number }}
 */
const TalkToYouVersionPayload = {
    APP_VERSION,
    CACHE_VERSION,
    SEED_VERSION,
    DB_SCHEMA_VERSION
};

if (typeof window !== "undefined") {
    window.TalkToYouVersion = TalkToYouVersionPayload;
}

if (typeof self !== "undefined") {
    self.TalkToYouVersion = TalkToYouVersionPayload;
}
