/*
============================================================
TalkToYou - Configuração do Banco Local
Arquivo: js/dexie-setup.js

Objetivo:
Configurar o banco IndexedDB usando Dexie.js e controlar a criação
e atualização dos cards oficiais do sistema.

Este arquivo é uma das partes mais importantes da arquitetura do app,
pois separa:

1. Dados personalizados do usuário
   - cards criados pela família, cuidador, terapeuta ou professor;
   - imagens reais;
   - áudios gravados;
   - rotinas individuais;
   - vocabulário próprio.

2. Dados oficiais do sistema
   - cards de pré-carga;
   - categorias iniciais;
   - cards-base usados como ponto de partida;
   - conteúdos que podem evoluir por versão.

Decisão acadêmica importante:
O TalkToYou NÃO deve sobrescrever automaticamente cards criados pelo
usuário. Isso preserva a identidade comunicacional e terapêutica da pessoa.

Autor: Edmar Junior
Projeto: TalkToYou
============================================================
*/

/*
============================================================
1. VERSÕES DO SISTEMA

As versões vêm do arquivo js/version.js.

Caso o arquivo version.js não tenha sido carregado por algum motivo,
são usados valores de segurança para evitar travamento.
============================================================
*/

const TALKTOYOU_VERSION = window.TalkToYouVersion || {
    APP_VERSION: "1.0.0",
    CACHE_VERSION: "1",
    SEED_VERSION: "1.0.0",
    DB_SCHEMA_VERSION: 1
};

const APP_VERSION = TALKTOYOU_VERSION.APP_VERSION;
const SEED_VERSION = TALKTOYOU_VERSION.SEED_VERSION;
const DB_SCHEMA_VERSION = TALKTOYOU_VERSION.DB_SCHEMA_VERSION;

/*
    Chave usada no localStorage para registrar qual versão dos cards
    oficiais já foi sincronizada neste aparelho.
*/
const SEED_VERSION_STORAGE_KEY = "talktoyou_seed_version";

/*
============================================================
2. BANCO LOCAL INDEXEDDB

O Dexie simplifica o uso do IndexedDB.

Tabela principal:
items

Campos principais:
- id: identificador local automático;
- parentId: define a hierarquia de pastas/cards;
- type: "folder" ou "card";
- label: texto original salvo no banco;
- image: imagem em base64 ou placeholder;
- audioBlob: áudio gravado pelo usuário;
- alarmTime: horário opcional de alarme;
- composeMode: define se uma pasta compõe frase com o card filho;
- systemKey: identifica card oficial do sistema;
- isSystem: indica se o item pertence ao sistema;
- createdAt / updatedAt: auditoria local básica.

Importante:
Não indexamos todos os campos agora para evitar mudança estrutural
desnecessária no banco. Campos como systemKey e isSystem podem ser usados
via leitura simples nesta etapa.
============================================================
*/

const db = new Dexie("TalkToYouDB");

db.version(DB_SCHEMA_VERSION).stores({
    items: "++id,parentId,type"
});

/*
    Disponibiliza o banco globalmente para os demais arquivos.
    O app.js usa db.items para carregar, salvar, editar e excluir cards.
*/
window.db = db;

/*
============================================================
3. DEFINIÇÃO DOS CARDS OFICIAIS

Cada item oficial possui systemKey.

Essa chave é essencial para:
- tradução futura por i18n.js;
- atualização de conteúdo oficial;
- preservação dos cards personalizados;
- identificação de cards de pré-carga.

Regra:
Cards criados pelo usuário NÃO devem receber systemKey.
============================================================
*/

const SYSTEM_SEED_ITEMS = [
    /*
    ------------------------------------------------------------
    Pastas principais
    ------------------------------------------------------------
    */
    {
        systemKey: "want",
        label: "Eu Quero",
        type: "folder",
        parentSystemKey: null,
        composeMode: true
    },
    {
        systemKey: "communication",
        label: "Comunicação",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "feelings",
        label: "Como Estou",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "food",
        label: "Comer",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "drink",
        label: "Beber",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "routine",
        label: "Rotina",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "sensory",
        label: "Sensorial",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "emergency",
        label: "Emergência",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "people",
        label: "Pessoas",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },
    {
        systemKey: "play",
        label: "Brincar",
        type: "folder",
        parentSystemKey: null,
        composeMode: false
    },

    /*
    ------------------------------------------------------------
    Cards de "Eu Quero"
    ------------------------------------------------------------
    */
    {
        systemKey: "water",
        label: "Água",
        type: "card",
        parentSystemKey: "want"
    },
    {
        systemKey: "bathroom",
        label: "Banheiro",
        type: "card",
        parentSystemKey: "want"
    },
    {
        systemKey: "help",
        label: "Ajuda",
        type: "card",
        parentSystemKey: "want"
    },

    /*
    ------------------------------------------------------------
    Cards de comunicação rápida
    ------------------------------------------------------------
    */
    {
        systemKey: "yes",
        label: "Sim",
        type: "card",
        parentSystemKey: "communication"
    },
    {
        systemKey: "no",
        label: "Não",
        type: "card",
        parentSystemKey: "communication"
    },
    {
        systemKey: "stop",
        label: "Parar",
        type: "card",
        parentSystemKey: "communication"
    },

    /*
    ------------------------------------------------------------
    Cards de sentimentos e necessidades corporais
    ------------------------------------------------------------
    */
    {
        systemKey: "pain",
        label: "Estou com dor",
        type: "card",
        parentSystemKey: "feelings"
    },
    {
        systemKey: "hungry",
        label: "Estou com fome",
        type: "card",
        parentSystemKey: "feelings"
    },
    {
        systemKey: "thirsty",
        label: "Estou com sede",
        type: "card",
        parentSystemKey: "feelings"
    },
    {
        systemKey: "happy",
        label: "Estou feliz",
        type: "card",
        parentSystemKey: "feelings"
    },
    {
        systemKey: "sad",
        label: "Estou triste",
        type: "card",
        parentSystemKey: "feelings"
    },

    /*
    ------------------------------------------------------------
    Cards sensoriais
    ------------------------------------------------------------
    */
    {
        systemKey: "loudNoise",
        label: "Barulho alto",
        type: "card",
        parentSystemKey: "sensory"
    },
    {
        systemKey: "tooMuchLight",
        label: "Luz forte",
        type: "card",
        parentSystemKey: "sensory"
    },
    {
        systemKey: "breakTime",
        label: "Preciso de pausa",
        type: "card",
        parentSystemKey: "sensory"
    },

    /*
    ------------------------------------------------------------
    Cards de rotina
    ------------------------------------------------------------
    */
    {
        systemKey: "medicine",
        label: "Remédio",
        type: "card",
        parentSystemKey: "routine"
    },
    {
        systemKey: "sleep",
        label: "Dormir",
        type: "card",
        parentSystemKey: "routine"
    },
    {
        systemKey: "school",
        label: "Escola",
        type: "card",
        parentSystemKey: "routine"
    },
    {
        systemKey: "bath",
        label: "Banho",
        type: "card",
        parentSystemKey: "routine"
    },

    /*
    ------------------------------------------------------------
    Cards de pessoas
    ------------------------------------------------------------
    */
    {
        systemKey: "mother",
        label: "Mamãe",
        type: "card",
        parentSystemKey: "people"
    },
    {
        systemKey: "father",
        label: "Papai",
        type: "card",
        parentSystemKey: "people"
    },
    {
        systemKey: "teacher",
        label: "Professor",
        type: "card",
        parentSystemKey: "people"
    },

    /*
    ------------------------------------------------------------
    Cards de brincar
    ------------------------------------------------------------
    */
    {
        systemKey: "toy",
        label: "Brinquedo",
        type: "card",
        parentSystemKey: "play"
    }
];

/*
============================================================
4. FUNÇÃO PRINCIPAL DE PRÉ-CARGA

O app.js chama seedInitialData() na inicialização.

Com esta nova versão, a função deixa de ser apenas:
"criar tudo se banco estiver vazio"

e passa a ser:
"sincronizar cards oficiais com segurança".

Isso permite:
- instalar o app pela primeira vez;
- adicionar novos cards oficiais no futuro;
- atualizar metadados dos cards oficiais;
- preservar cards personalizados do usuário.
============================================================
*/

async function seedInitialData() {
    /*
        Primeiro, garante que os cards oficiais existam.
        Isso atende tanto uma instalação nova quanto uma atualização futura.
    */
    await syncSystemCards();

    /*
        Depois registra a versão de seed aplicada.
    */
    localStorage.setItem(SEED_VERSION_STORAGE_KEY, SEED_VERSION);
}

/*
============================================================
5. SINCRONIZAÇÃO DOS CARDS OFICIAIS

Esta função adiciona cards oficiais ausentes.

Ela NÃO apaga cards personalizados.
Ela NÃO sobrescreve cards personalizados.
Ela NÃO traduz cards criados pelo usuário.
============================================================
*/

async function syncSystemCards() {
    const savedSeedVersion = localStorage.getItem(SEED_VERSION_STORAGE_KEY);

    /*
        Mesmo quando a versão é igual, fazemos uma verificação leve.
        Isso é útil para corrigir instalações incompletas.
    */
    const allItems = await db.items.toArray();

    const systemItemsByKey = new Map();

    allItems.forEach((item) => {
        if (item.systemKey) {
            systemItemsByKey.set(item.systemKey, item);
        }
    });

    /*
        1ª etapa:
        Criar ou garantir as pastas principais.
    */
    for (const seedItem of SYSTEM_SEED_ITEMS.filter((item) => item.type === "folder")) {
        await ensureSystemItem(seedItem, systemItemsByKey);
    }

    /*
        Atualiza mapa após criação de pastas, porque os cards filhos
        precisam saber o id real da pasta pai.
    */
    const refreshedItems = await db.items.toArray();
    const refreshedSystemItemsByKey = new Map();

    refreshedItems.forEach((item) => {
        if (item.systemKey) {
            refreshedSystemItemsByKey.set(item.systemKey, item);
        }
    });

    /*
        2ª etapa:
        Criar ou garantir os cards filhos.
    */
    for (const seedItem of SYSTEM_SEED_ITEMS.filter((item) => item.type === "card")) {
        await ensureSystemItem(seedItem, refreshedSystemItemsByKey);
    }

    /*
        Registro informativo para depuração.
    */
    if (savedSeedVersion !== SEED_VERSION) {
        console.log(
            `[TalkToYou] Cards oficiais sincronizados: ${savedSeedVersion || "primeira instalação"} -> ${SEED_VERSION}`
        );
    }
}

/*
============================================================
6. CRIAÇÃO/ATUALIZAÇÃO SEGURA DE ITEM OFICIAL

Regra:
- se o item oficial não existe, cria;
- se já existe, atualiza apenas metadados seguros;
- não altera imagem personalizada;
- não altera áudio gravado;
- não altera label do usuário se ele tiver editado manualmente.

Observação:
Como o sistema ainda não tem uma tela separada para "editar card oficial
sem perder vínculo", a estratégia é conservadora.
============================================================
*/

async function ensureSystemItem(seedItem, systemItemsByKey) {
    const now = new Date().toISOString();

    const existingItem = systemItemsByKey.get(seedItem.systemKey);

    const parentId = getParentIdFromSeed(seedItem, systemItemsByKey);

    /*
        Se o item oficial ainda não existe, cria.
    */
    if (!existingItem) {
        await db.items.add({
            label: seedItem.label,
            type: seedItem.type,
            parentId,
            image: getPlaceholderImage(seedItem.label),
            alarmTime: "",
            composeMode: seedItem.type === "folder"
                ? seedItem.composeMode === true
                : false,

            /*
                Campos de controle de conteúdo oficial.
            */
            systemKey: seedItem.systemKey,
            isSystem: true,
            systemVersion: SEED_VERSION,

            /*
                Campos já preparando recursos futuros.
            */
            isFavorite: false,
            isEmergency: seedItem.systemKey === "emergency",
            usageCount: 0,

            /*
                Auditoria local simples.
            */
            createdAt: now,
            updatedAt: now
        });

        return;
    }

    /*
        Se já existe, atualiza apenas campos estruturais seguros.
        Não mexemos em label, image ou audioBlob para não apagar adaptações.
    */
    const safeUpdate = {
        type: seedItem.type,
        parentId,
        isSystem: true,
        systemKey: seedItem.systemKey,
        systemVersion: SEED_VERSION,
        updatedAt: now
    };

    /*
        Compose mode só é atualizado para pastas oficiais.
        Isso mantém coerência das pastas-base.
    */
    if (seedItem.type === "folder") {
        safeUpdate.composeMode = seedItem.composeMode === true;
    }

    /*
        Preserva preferência caso já exista.
    */
    if (existingItem.isFavorite === undefined) {
        safeUpdate.isFavorite = false;
    }

    if (existingItem.isEmergency === undefined) {
        safeUpdate.isEmergency = seedItem.systemKey === "emergency";
    }

    if (existingItem.usageCount === undefined) {
        safeUpdate.usageCount = 0;
    }

    await db.items.update(existingItem.id, safeUpdate);
}

/*
============================================================
7. RESOLUÇÃO DE PASTA PAI

Os itens de pré-carga usam parentSystemKey para evitar depender de IDs fixos.

Isso é importante porque o IndexedDB gera IDs automaticamente.
============================================================
*/

function getParentIdFromSeed(seedItem, systemItemsByKey) {
    if (!seedItem.parentSystemKey) {
        return 0;
    }

    const parent = systemItemsByKey.get(seedItem.parentSystemKey);

    return parent ? parent.id : 0;
}

/*
============================================================
8. PLACEHOLDER VISUAL

Caso o usuário não escolha imagem, o sistema gera uma imagem simples
baseada na inicial do card.

Isso evita cards quebrados e mantém a prancha visualmente consistente.
============================================================
*/

function getPlaceholderImage(label) {
    const text = encodeURIComponent((label || "?").charAt(0).toUpperCase());

    return (
        "data:image/svg+xml;charset=UTF-8," +
        `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
        `<rect width='100%' height='100%' fill='%232196F3'/>` +
        `<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' ` +
        `font-size='120' font-family='Arial' fill='white'>${text}</text>` +
        `</svg>`
    );
}

/*
============================================================
9. EXPOSIÇÃO GLOBAL

Mantém compatibilidade com app.js e outros serviços.
============================================================
*/

window.seedInitialData = seedInitialData;
window.syncSystemCards = syncSystemCards;
window.getPlaceholderImage = getPlaceholderImage;
