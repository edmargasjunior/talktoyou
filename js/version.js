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

const APP_VERSION = "1.0.0";
const CACHE_VERSION = "1";
const SEED_VERSION = "1.0.0";
const DB_SCHEMA_VERSION = 1;

/*
    Objeto global para facilitar o uso em arquivos JS tradicionais.

    Futuramente, se o projeto migrar para módulos, isso poderá virar
    export/import.
*/
window.TalkToYouVersion = {
    APP_VERSION,
    CACHE_VERSION,
    SEED_VERSION,
    DB_SCHEMA_VERSION
};