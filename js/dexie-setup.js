/*
============================================================
TalkToYou - Configuração do Banco Local
Arquivo: js/dexie-setup.js

Objetivo:
Configurar o banco IndexedDB usando Dexie.js e controlar a criação
e atualização dos cards oficiais do sistema.

Correção importante desta versão:
Os cards oficiais voltam a usar ícones/emoji no placeholder visual.
Na versão anterior, o placeholder caiu para uma imagem simples com a
primeira letra do card. Isso não era ideal para comunicação alternativa,
porque reduzia o apoio visual imediato para a pessoa usuária.

Decisão de projeto:
- cards oficiais do sistema podem ser sincronizados por versão;
- cards personalizados do usuário não devem ser apagados;
- imagens escolhidas pelo usuário não devem ser sobrescritas;
- áudios gravados pelo usuário não devem ser sobrescritos;
- apenas placeholders automáticos antigos podem ser atualizados.

Valor acadêmico:
Essa estratégia preserva a personalização terapêutica, mas permite que o
aplicativo evolua com segurança, corrigindo conteúdos oficiais sem destruir
o vocabulário individual da pessoa.

Autor: Edmar Junior
Projeto: TalkToYou
============================================================
*/

/*
============================================================
1. VERSÕES DO SISTEMA

As versões vêm de js/version.js.

Usamos nomes internos com prefixo DEXIE_ para evitar conflito com
constantes globais declaradas em outros arquivos JavaScript.
============================================================
*/

const TALKTOYOU_VERSION = window.TalkToYouVersion || {
    APP_VERSION: "1.0.0",
    CACHE_VERSION: "1",
    SEED_VERSION: "1.0.0",
    DB_SCHEMA_VERSION: 1
};

const DEXIE_APP_VERSION = TALKTOYOU_VERSION.APP_VERSION;
const DEXIE_SEED_VERSION = TALKTOYOU_VERSION.SEED_VERSION;
const DEXIE_DB_SCHEMA_VERSION = TALKTOYOU_VERSION.DB_SCHEMA_VERSION;

/*
    Guarda qual versão dos cards oficiais já foi sincronizada no aparelho.
*/
const SEED_VERSION_STORAGE_KEY = "talktoyou_seed_version";

/*
============================================================
2. BANCO LOCAL INDEXEDDB

O Dexie simplifica o uso do IndexedDB.

A tabela principal é items.

Campos relevantes:
- id: identificador local automático;
- parentId: hierarquia de pastas/cards;
- type: "folder" ou "card";
- label: texto original salvo no banco;
- image: imagem do card, podendo ser foto, base64 ou placeholder;
- audioBlob: áudio gravado pelo usuário;
- alarmTime: horário opcional de alarme;
- composeMode: define composição de frase;
- systemKey: identifica card oficial do sistema;
- isSystem: indica card/pasta criada pelo sistema;
- isFavorite: preparado para etapa futura;
- isEmergency: preparado para etapa futura;
- usageCount: preparado para "mais usados";
- createdAt / updatedAt: auditoria local simples.
============================================================
*/

const db = new Dexie("TalkToYouDB");

db.version(Math.max(DEXIE_DB_SCHEMA_VERSION, 2)).stores({
    items: "++id,parentId,type,alarmTime"
});

window.db = db;

/*
============================================================
3. UTILITÁRIOS DE TEXTO

Usados para comparar nomes sem duplicar cards por diferenças de acento,
maiúsculas/minúsculas ou espaços.
============================================================
*/

function normalizeLabel(text) {
    return String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function escapeSvgText(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/*
============================================================
4. PLACEHOLDER VISUAL COM ÍCONE

Este placeholder é usado quando o card ainda não possui foto personalizada.

Ele mostra:
- fundo claro;
- emoji grande;
- texto do card.

Isso é mais adequado para uma prancha de comunicação alternativa do que
apenas mostrar a primeira letra.
============================================================
*/

/**
 * Retorna o ícone visual associado a um item oficial.
 *
 * Primeiro tenta usar systemKey, que é a forma mais segura.
 * Depois usa o texto original como fallback para instalações antigas
 * que ainda não possuíam systemKey em todos os cards.
 */
function getSystemIcon(systemKey, label) {
    /*
        Retorna o emoji correto do card oficial.

        Ordem de busca:
        1. systemKey exata, por exemplo "food_banana";
        2. label em português, por exemplo "banana";
        3. ícone neutro de comunicação.
    */
    if (systemKey && SYSTEM_CARD_ICONS[systemKey]) {
        return SYSTEM_CARD_ICONS[systemKey];
    }

    const normalizedLabel = String(label || "").trim().toLowerCase();

    if (normalizedLabel && SYSTEM_LABEL_ICONS[normalizedLabel]) {
        return SYSTEM_LABEL_ICONS[normalizedLabel];
    }

    return "💬";
}

function getPlaceholderImage(label, systemKey = null, emojiOverride = null) {
    /*
        Gera uma imagem SVG automática com apenas o ícone.

        O texto foi removido da imagem por decisão de design/acessibilidade:
        o rótulo abaixo do card é o único texto visual e pode ser traduzido
        conforme o idioma selecionado.
    */
    const icon = emojiOverride || getSystemIcon(systemKey, label);
    const encodedIcon = encodeURIComponent(icon);

    return (
        "data:image/svg+xml;charset=UTF-8," +
        `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>` +
        `<rect width='100%' height='100%' fill='%23E3F2FD'/>` +
        `<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' ` +
        `font-size='82' font-family='Arial, sans-serif'>${encodedIcon}</text>` +
        `</svg>`
    );
}

/*
============================================================
5. DETECÇÃO DE PLACEHOLDER ANTIGO

Esta função identifica o placeholder antigo que mostrava apenas a primeira
letra do card.

Por que isso é importante?
Para atualizar os ícones oficiais sem sobrescrever:
- fotos reais escolhidas pelo usuário;
- imagens personalizadas;
- placeholders novos com emoji.
============================================================
*/

function isLegacyLetterPlaceholder(image) {
    if (!image || typeof image !== "string") {
        return true;
    }

    /*
        Qualquer SVG gerado pelo próprio sistema pode ser recriado com
        segurança para cards oficiais.

        Fotos reais e imagens escolhidas pelo usuário normalmente são JPEG,
        PNG ou WebP em base64. Essas NÃO devem ser sobrescritas.
    */
    return image.startsWith("data:image/svg+xml");
}

/*
============================================================
6. CARDS OFICIAIS DO SISTEMA

Cada item oficial possui:
- systemKey: chave técnica estável;
- label: texto base em português;
- emoji: ícone visual do placeholder;
- type: folder/card;
- parentSystemKey: pasta pai por chave técnica, não por ID.

Usar parentSystemKey é importante porque o IndexedDB gera IDs locais
automaticamente e esses IDs podem variar entre aparelhos.
============================================================
*/

/*
============================================================
MAPA DE ÍCONES DOS CARDS OFICIAIS

Este mapa é gerado usando as mesmas systemKey dos cards oficiais.

Exemplo real:
- systemKey: "food_banana"
- emoji: "🍌"

Motivo:
O app usa systemKey para recuperar o ícone. Se o mapa tiver uma chave
diferente, o card cai no ícone padrão de balão.

Regra visual:
- a imagem do card mostra apenas o ícone;
- o texto fica somente no rótulo abaixo do card;
- isso permite tradução sem recriar imagens com texto.
============================================================
*/
const SYSTEM_CARD_ICONS = {
    "want": "🙋‍♂️",
    "communication": "💬",
    "feelings": "😊",
    "food": "🍽️",
    "drink": "🥤",
    "routine": "⏰",
    "sensory": "🧠",
    "emergency": "🚨",
    "people": "👨‍👩‍👧",
    "play": "🎮",
    "water": "💧",
    "want_leite": "🥛",
    "want_suco": "🧃",
    "want_comer": "🍽️",
    "bathroom": "🚾",
    "help": "🤝",
    "want_brincar": "🧸",
    "want_colo": "🫂",
    "want_abraco": "🤗",
    "want_sleep": "😴",
    "want_passear": "🚶",
    "want_desenho": "📺",
    "want_musica": "🎵",
    "want_celular": "📱",
    "want_ficar_sozinho": "🙈",
    "yes": "✅",
    "no": "❌",
    "communication_mais": "➕",
    "communication_acabou": "🛑",
    "communication_quero": "🙋‍♂️",
    "communication_nao_quero": "🚫",
    "communication_ajuda": "🤝",
    "stop": "✋",
    "communication_espera": "⏳",
    "communication_vamos": "➡️",
    "communication_aqui": "📍",
    "communication_la": "👉",
    "communication_de_novo": "🔁",
    "communication_gostei": "👍",
    "communication_nao_gostei": "👎",
    "communication_obrigado": "🙏",
    "communication_desculpa": "😔",
    "happy": "😄",
    "sad": "😢",
    "feelings_bravo": "😠",
    "feelings_com_medo": "😨",
    "feelings_ansioso": "😰",
    "feelings_cansado": "🥱",
    "pain": "🤕",
    "hungry": "😋",
    "thirsty": "🥤",
    "feelings_com_sono": "😴",
    "feelings_calor": "🥵",
    "feelings_frio": "🥶",
    "feelings_doente": "🤒",
    "feelings_nervoso": "😖",
    "feelings_confuso": "😕",
    "feelings_estou_bem": "🙂",
    "feelings_nao_estou_bem": "😣",
    "food_maca": "🍎",
    "food_banana": "🍌",
    "food_pao": "🍞",
    "food_arroz": "🍚",
    "food_feijao": "🫘",
    "food_macarrao": "🍝",
    "food_carne": "🥩",
    "food_frango": "🍗",
    "food_ovo": "🥚",
    "food_biscoito": "🍪",
    "food_bolo": "🍰",
    "food_chocolate": "🍫",
    "food_sorvete": "🍨",
    "food_pizza": "🍕",
    "food_batata_frita": "🍟",
    "food_almoco": "🍽️",
    "food_jantar": "🍛",
    "food_lanche": "🥪",
    "drink_agua": "💧",
    "drink_leite": "🥛",
    "drink_suco": "🧃",
    "drink_vitamina": "🥤",
    "drink_iogurte": "🥛",
    "drink_achocolatado": "🍫",
    "drink_cha": "🍵",
    "drink_refrigerante": "🥤",
    "routine_acordar": "☀️",
    "routine_escovar_dentes": "🪥",
    "routine_banheiro": "🚾",
    "bath": "🚿",
    "routine_trocar_roupa": "👕",
    "routine_cafe_da_manha": "☕",
    "school": "🏫",
    "routine_tarefa": "📚",
    "routine_terapia": "🧩",
    "medicine": "💊",
    "routine_almoco": "🍽️",
    "routine_descansar": "🛋️",
    "routine_passear": "🚶",
    "routine_jantar": "🍛",
    "sleep": "🌙",
    "loudNoise": "🔊",
    "sensory_quero_silencio": "🤫",
    "tooMuchLight": "💡",
    "sensory_esta_muito_cheio": "👥",
    "sensory_estou_incomodado": "😖",
    "sensory_quero_descansar": "😴",
    "sensory_quero_balancar": "🪀",
    "sensory_quero_apertar": "🤲",
    "sensory_nao_toque_em_mim": "🚫",
    "sensory_pode_me_abracar": "🤗",
    "breakTime": "⏸️",
    "emergency_preciso_de_ajuda": "🆘",
    "emergency_pain": "🤕",
    "emergency_nao_estou_bem": "😣",
    "emergency_quero_ir_embora": "🏠",
    "emergency_estou_perdido": "😰",
    "emergency_chamar_mamae": "👩",
    "emergency_chamar_papai": "👨",
    "emergency_chamar_professor": "🧑‍🏫",
    "emergency_banheiro_urgente": "🚾",
    "emergency_machucou": "🩹",
    "emergency_pare_agora": "🛑",
    "mother": "👩",
    "father": "👨",
    "people_vovo": "👵",
    "people_vovo_2": "👴",
    "people_irmao": "👦",
    "people_irma": "👧",
    "teacher": "🧑‍🏫",
    "people_terapeuta": "🧩",
    "people_medico": "🧑‍⚕️",
    "people_amigo": "🧒",
    "play_bola": "⚽",
    "play_carrinho": "🚗",
    "play_boneca": "🧸",
    "play_blocos": "🧱",
    "play_quebra_cabeca": "🧩",
    "play_desenhar": "🎨",
    "play_massinha": "🟣",
    "play_livro": "📖",
    "play_musica": "🎵",
    "play_desenho": "📺",
    "play_tablet": "📱",
    "play_parquinho": "🛝",
};

/*
    Fallback por label em português.

    Usado para instalações antigas ou cards oficiais que ainda não possuam
    systemKey salvo no IndexedDB.
*/
const SYSTEM_LABEL_ICONS = {
    "eu quero": "🙋‍♂️",
    "comunicação": "💬",
    "como estou": "😊",
    "comer": "🍽️",
    "beber": "🥤",
    "rotina": "⏰",
    "sensorial": "🧠",
    "emergência": "🚨",
    "pessoas": "👨‍👩‍👧",
    "brincar": "🧸",
    "água": "💧",
    "leite": "🥛",
    "suco": "🧃",
    "banheiro": "🚾",
    "ajuda": "🤝",
    "colo": "🫂",
    "abraço": "🤗",
    "dormir": "🌙",
    "passear": "🚶",
    "desenho": "📺",
    "música": "🎵",
    "celular": "📱",
    "ficar sozinho": "🙈",
    "sim": "✅",
    "não": "❌",
    "mais": "➕",
    "acabou": "🛑",
    "quero": "🙋‍♂️",
    "não quero": "🚫",
    "parar": "✋",
    "espera": "⏳",
    "vamos": "➡️",
    "aqui": "📍",
    "lá": "👉",
    "de novo": "🔁",
    "gostei": "👍",
    "não gostei": "👎",
    "obrigado": "🙏",
    "desculpa": "😔",
    "feliz": "😄",
    "triste": "😢",
    "bravo": "😠",
    "com medo": "😨",
    "ansioso": "😰",
    "cansado": "🥱",
    "com dor": "🤕",
    "com fome": "😋",
    "com sede": "🥤",
    "com sono": "😴",
    "calor": "🥵",
    "frio": "🥶",
    "doente": "🤒",
    "nervoso": "😖",
    "confuso": "😕",
    "estou bem": "🙂",
    "não estou bem": "😣",
    "maçã": "🍎",
    "banana": "🍌",
    "pão": "🍞",
    "arroz": "🍚",
    "feijão": "🫘",
    "macarrão": "🍝",
    "carne": "🥩",
    "frango": "🍗",
    "ovo": "🥚",
    "biscoito": "🍪",
    "bolo": "🍰",
    "chocolate": "🍫",
    "sorvete": "🍨",
    "pizza": "🍕",
    "batata frita": "🍟",
    "almoço": "🍽️",
    "jantar": "🍛",
    "lanche": "🥪",
    "vitamina": "🥤",
    "iogurte": "🥛",
    "achocolatado": "🍫",
    "chá": "🍵",
    "refrigerante": "🥤",
    "acordar": "☀️",
    "escovar dentes": "🪥",
    "banho": "🚿",
    "trocar roupa": "👕",
    "café da manhã": "☕",
    "escola": "🏫",
    "tarefa": "📚",
    "terapia": "🧩",
    "remédio": "💊",
    "descansar": "🛋️",
    "barulho alto": "🔊",
    "quero silêncio": "🤫",
    "luz forte": "💡",
    "está muito cheio": "👥",
    "estou incomodado": "😖",
    "quero descansar": "😴",
    "quero balançar": "🪀",
    "quero apertar": "🤲",
    "não toque em mim": "🚫",
    "pode me abraçar": "🤗",
    "preciso de pausa": "⏸️",
    "preciso de ajuda": "🆘",
    "estou com dor": "🤕",
    "quero ir embora": "🏠",
    "estou perdido": "😰",
    "chamar mamãe": "👩",
    "chamar papai": "👨",
    "chamar professor": "🧑‍🏫",
    "banheiro urgente": "🚾",
    "machucou": "🩹",
    "pare agora": "🛑",
    "mamãe": "👩",
    "papai": "👨",
    "vovó": "👵",
    "vovô": "👴",
    "irmão": "👦",
    "irmã": "👧",
    "professor": "🧑‍🏫",
    "terapeuta": "🧩",
    "médico": "🧑‍⚕️",
    "amigo": "🧒",
    "bola": "⚽",
    "carrinho": "🚗",
    "boneca": "🧸",
    "blocos": "🧱",
    "quebra-cabeça": "🧩",
    "desenhar": "🎨",
    "massinha": "🟣",
    "livro": "📖",
    "tablet": "📱",
    "parquinho": "🛝",
};



const SYSTEM_SEED_ITEMS = [
    /* Pastas principais */
    {
        systemKey: "want",
        label: "Eu Quero",
        emoji: "🙋‍♂️",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: true
    },
    {
        systemKey: "communication",
        label: "Comunicação",
        emoji: "💬",
        type: "folder",
        parentSystemKey: null,
        aliases: ["Comunicação Rápida", "Falar", "Respostas"],
        composeMode: false
    },
    {
        systemKey: "feelings",
        label: "Como Estou",
        emoji: "😊",
        type: "folder",
        parentSystemKey: null,
        aliases: ["Me Sentindo", "Sentindo"],
        composeMode: true
    },
    {
        systemKey: "food",
        label: "Comer",
        emoji: "🍽️",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: false
    },
    {
        systemKey: "drink",
        label: "Beber",
        emoji: "🥤",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: false
    },
    {
        systemKey: "routine",
        label: "Rotina",
        emoji: "⏰",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: false
    },
    {
        systemKey: "sensory",
        label: "Sensorial",
        emoji: "🧠",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: true
    },
    {
        systemKey: "emergency",
        label: "Emergência",
        emoji: "🚨",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: true
    },
    {
        systemKey: "people",
        label: "Pessoas",
        emoji: "👨‍👩‍👧",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: false
    },
    {
        systemKey: "play",
        label: "Brincar",
        emoji: "🎮",
        type: "folder",
        parentSystemKey: null,
        aliases: [],
        composeMode: false
    },

    /* Cards oficiais do sistema */
    {
        systemKey: "water",
        label: "Água",
        emoji: "💧",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_leite",
        label: "Leite",
        emoji: "🥛",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_suco",
        label: "Suco",
        emoji: "🧃",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_comer",
        label: "Comer",
        emoji: "🍽️",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "bathroom",
        label: "Banheiro",
        emoji: "🚾",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "help",
        label: "Ajuda",
        emoji: "🤝",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_brincar",
        label: "Brincar",
        emoji: "🧸",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_colo",
        label: "Colo",
        emoji: "🫂",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_abraco",
        label: "Abraço",
        emoji: "🤗",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_sleep",
        label: "Dormir",
        emoji: "😴",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_passear",
        label: "Passear",
        emoji: "🚶",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_desenho",
        label: "Desenho",
        emoji: "📺",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_musica",
        label: "Música",
        emoji: "🎵",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_celular",
        label: "Celular",
        emoji: "📱",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "want_ficar_sozinho",
        label: "Ficar sozinho",
        emoji: "🙈",
        type: "card",
        parentSystemKey: "want",
        alarmTime: ""
    },
    {
        systemKey: "yes",
        label: "Sim",
        emoji: "✅",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "no",
        label: "Não",
        emoji: "❌",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_mais",
        label: "Mais",
        emoji: "➕",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_acabou",
        label: "Acabou",
        emoji: "🛑",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_quero",
        label: "Quero",
        emoji: "🙋‍♂️",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_nao_quero",
        label: "Não quero",
        emoji: "🚫",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_ajuda",
        label: "Ajuda",
        emoji: "🤝",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "stop",
        label: "Parar",
        emoji: "✋",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_espera",
        label: "Espera",
        emoji: "⏳",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_vamos",
        label: "Vamos",
        emoji: "➡️",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_aqui",
        label: "Aqui",
        emoji: "📍",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_la",
        label: "Lá",
        emoji: "👉",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_de_novo",
        label: "De novo",
        emoji: "🔁",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_gostei",
        label: "Gostei",
        emoji: "👍",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_nao_gostei",
        label: "Não gostei",
        emoji: "👎",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_obrigado",
        label: "Obrigado",
        emoji: "🙏",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "communication_desculpa",
        label: "Desculpa",
        emoji: "😔",
        type: "card",
        parentSystemKey: "communication",
        alarmTime: ""
    },
    {
        systemKey: "happy",
        label: "Feliz",
        emoji: "😄",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "sad",
        label: "Triste",
        emoji: "😢",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_bravo",
        label: "Bravo",
        emoji: "😠",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_com_medo",
        label: "Com medo",
        emoji: "😨",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_ansioso",
        label: "Ansioso",
        emoji: "😰",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_cansado",
        label: "Cansado",
        emoji: "🥱",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "pain",
        label: "Com dor",
        emoji: "🤕",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "hungry",
        label: "Com fome",
        emoji: "😋",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "thirsty",
        label: "Com sede",
        emoji: "🥤",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_com_sono",
        label: "Com sono",
        emoji: "😴",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_calor",
        label: "Calor",
        emoji: "🥵",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_frio",
        label: "Frio",
        emoji: "🥶",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_doente",
        label: "Doente",
        emoji: "🤒",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_nervoso",
        label: "Nervoso",
        emoji: "😖",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_confuso",
        label: "Confuso",
        emoji: "😕",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_estou_bem",
        label: "Estou bem",
        emoji: "🙂",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "feelings_nao_estou_bem",
        label: "Não estou bem",
        emoji: "😣",
        type: "card",
        parentSystemKey: "feelings",
        alarmTime: ""
    },
    {
        systemKey: "food_maca",
        label: "Maçã",
        emoji: "🍎",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_banana",
        label: "Banana",
        emoji: "🍌",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_pao",
        label: "Pão",
        emoji: "🍞",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_arroz",
        label: "Arroz",
        emoji: "🍚",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_feijao",
        label: "Feijão",
        emoji: "🫘",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_macarrao",
        label: "Macarrão",
        emoji: "🍝",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_carne",
        label: "Carne",
        emoji: "🥩",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_frango",
        label: "Frango",
        emoji: "🍗",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_ovo",
        label: "Ovo",
        emoji: "🥚",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_biscoito",
        label: "Biscoito",
        emoji: "🍪",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_bolo",
        label: "Bolo",
        emoji: "🍰",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_chocolate",
        label: "Chocolate",
        emoji: "🍫",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_sorvete",
        label: "Sorvete",
        emoji: "🍨",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_pizza",
        label: "Pizza",
        emoji: "🍕",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_batata_frita",
        label: "Batata frita",
        emoji: "🍟",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_almoco",
        label: "Almoço",
        emoji: "🍽️",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_jantar",
        label: "Jantar",
        emoji: "🍛",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "food_lanche",
        label: "Lanche",
        emoji: "🥪",
        type: "card",
        parentSystemKey: "food",
        alarmTime: ""
    },
    {
        systemKey: "drink_agua",
        label: "Água",
        emoji: "💧",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_leite",
        label: "Leite",
        emoji: "🥛",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_suco",
        label: "Suco",
        emoji: "🧃",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_vitamina",
        label: "Vitamina",
        emoji: "🥤",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_iogurte",
        label: "Iogurte",
        emoji: "🥛",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_achocolatado",
        label: "Achocolatado",
        emoji: "🍫",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_cha",
        label: "Chá",
        emoji: "🍵",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "drink_refrigerante",
        label: "Refrigerante",
        emoji: "🥤",
        type: "card",
        parentSystemKey: "drink",
        alarmTime: ""
    },
    {
        systemKey: "routine_acordar",
        label: "Acordar",
        emoji: "☀️",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: "06:20"
    },
    {
        systemKey: "routine_escovar_dentes",
        label: "Escovar dentes",
        emoji: "🪥",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_banheiro",
        label: "Banheiro",
        emoji: "🚾",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "bath",
        label: "Banho",
        emoji: "🚿",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_trocar_roupa",
        label: "Trocar roupa",
        emoji: "👕",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_cafe_da_manha",
        label: "Café da manhã",
        emoji: "☕",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "school",
        label: "Escola",
        emoji: "🏫",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_tarefa",
        label: "Tarefa",
        emoji: "📚",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_terapia",
        label: "Terapia",
        emoji: "🧩",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "medicine",
        label: "Remédio",
        emoji: "💊",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_almoco",
        label: "Almoço",
        emoji: "🍽️",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_descansar",
        label: "Descansar",
        emoji: "🛋️",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_passear",
        label: "Passear",
        emoji: "🚶",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "routine_jantar",
        label: "Jantar",
        emoji: "🍛",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "sleep",
        label: "Dormir",
        emoji: "🌙",
        type: "card",
        parentSystemKey: "routine",
        alarmTime: ""
    },
    {
        systemKey: "loudNoise",
        label: "Barulho alto",
        emoji: "🔊",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_quero_silencio",
        label: "Quero silêncio",
        emoji: "🤫",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "tooMuchLight",
        label: "Luz forte",
        emoji: "💡",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_esta_muito_cheio",
        label: "Está muito cheio",
        emoji: "👥",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_estou_incomodado",
        label: "Estou incomodado",
        emoji: "😖",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_quero_descansar",
        label: "Quero descansar",
        emoji: "😴",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_quero_balancar",
        label: "Quero balançar",
        emoji: "🪀",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_quero_apertar",
        label: "Quero apertar",
        emoji: "🤲",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_nao_toque_em_mim",
        label: "Não toque em mim",
        emoji: "🚫",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "sensory_pode_me_abracar",
        label: "Pode me abraçar",
        emoji: "🤗",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "breakTime",
        label: "Preciso de pausa",
        emoji: "⏸️",
        type: "card",
        parentSystemKey: "sensory",
        alarmTime: ""
    },
    {
        systemKey: "emergency_preciso_de_ajuda",
        label: "Preciso de ajuda",
        emoji: "🆘",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_pain",
        label: "Estou com dor",
        emoji: "🤕",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_nao_estou_bem",
        label: "Não estou bem",
        emoji: "😣",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_quero_ir_embora",
        label: "Quero ir embora",
        emoji: "🏠",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_estou_perdido",
        label: "Estou perdido",
        emoji: "😰",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_chamar_mamae",
        label: "Chamar mamãe",
        emoji: "👩",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_chamar_papai",
        label: "Chamar papai",
        emoji: "👨",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_chamar_professor",
        label: "Chamar professor",
        emoji: "🧑‍🏫",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_banheiro_urgente",
        label: "Banheiro urgente",
        emoji: "🚾",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_machucou",
        label: "Machucou",
        emoji: "🩹",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "emergency_pare_agora",
        label: "Pare agora",
        emoji: "🛑",
        type: "card",
        parentSystemKey: "emergency",
        alarmTime: ""
    },
    {
        systemKey: "mother",
        label: "Mamãe",
        emoji: "👩",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "father",
        label: "Papai",
        emoji: "👨",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_vovo",
        label: "Vovó",
        emoji: "👵",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_vovo_2",
        label: "Vovô",
        emoji: "👴",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_irmao",
        label: "Irmão",
        emoji: "👦",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_irma",
        label: "Irmã",
        emoji: "👧",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "teacher",
        label: "Professor",
        emoji: "🧑‍🏫",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_terapeuta",
        label: "Terapeuta",
        emoji: "🧩",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_medico",
        label: "Médico",
        emoji: "🧑‍⚕️",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "people_amigo",
        label: "Amigo",
        emoji: "🧒",
        type: "card",
        parentSystemKey: "people",
        alarmTime: ""
    },
    {
        systemKey: "play_bola",
        label: "Bola",
        emoji: "⚽",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_carrinho",
        label: "Carrinho",
        emoji: "🚗",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_boneca",
        label: "Boneca",
        emoji: "🧸",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_blocos",
        label: "Blocos",
        emoji: "🧱",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_quebra_cabeca",
        label: "Quebra-cabeça",
        emoji: "🧩",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_desenhar",
        label: "Desenhar",
        emoji: "🎨",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_massinha",
        label: "Massinha",
        emoji: "🟣",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_livro",
        label: "Livro",
        emoji: "📖",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_musica",
        label: "Música",
        emoji: "🎵",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_desenho",
        label: "Desenho",
        emoji: "📺",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_tablet",
        label: "Tablet",
        emoji: "📱",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
    {
        systemKey: "play_parquinho",
        label: "Parquinho",
        emoji: "🛝",
        type: "card",
        parentSystemKey: "play",
        alarmTime: ""
    },
];

/*
============================================================
7. FUNÇÃO PRINCIPAL DE PRÉ-CARGA

O app.js chama seedInitialData() na inicialização.

Agora esta função não serve apenas para "primeira instalação".
Ela também sincroniza os cards oficiais quando a versão de conteúdo muda.
============================================================
*/

async function seedInitialData() {
    await syncSystemCards();

    localStorage.setItem(SEED_VERSION_STORAGE_KEY, DEXIE_SEED_VERSION);
}

/*
============================================================
8. SINCRONIZAÇÃO DOS CARDS OFICIAIS

Esta função:
- cria cards oficiais ausentes;
- corrige metadados técnicos;
- restaura placeholders com emoji quando encontra placeholder antigo;
- preserva cards personalizados;
- preserva fotos e áudios gravados pelo usuário.
============================================================
*/

async function syncSystemCards() {
    const savedSeedVersion = localStorage.getItem(SEED_VERSION_STORAGE_KEY);

    /*
        1ª etapa: garantir pastas principais.
    */
    let systemItemsByKey = await getSystemItemsByKey();

    for (const seedItem of SYSTEM_SEED_ITEMS.filter((item) => item.type === "folder")) {
        await ensureSystemItem(seedItem, systemItemsByKey);
    }

    /*
        2ª etapa: recarregar mapa para obter IDs reais das pastas criadas.
    */
    systemItemsByKey = await getSystemItemsByKey();

    /*
        3ª etapa: garantir cards filhos.
    */
    for (const seedItem of SYSTEM_SEED_ITEMS.filter((item) => item.type === "card")) {
        await ensureSystemItem(seedItem, systemItemsByKey);
    }

    if (savedSeedVersion !== DEXIE_SEED_VERSION) {
        console.log(
            `[TalkToYou] Cards oficiais sincronizados: ${savedSeedVersion || "primeira instalação"} -> ${DEXIE_SEED_VERSION}`
        );
    }
}

/*
============================================================
9. MAPA DE ITENS OFICIAIS

Lê os itens atuais do banco e cria um mapa por systemKey.
============================================================
*/

async function getSystemItemsByKey() {
    const allItems = await db.items.toArray();
    const map = new Map();

    allItems.forEach((item) => {
        if (item.systemKey) {
            map.set(item.systemKey, item);
        }
    });

    return map;
}

/*
============================================================
10. CRIAÇÃO/ATUALIZAÇÃO SEGURA DE ITEM OFICIAL

A função procura primeiro por systemKey.
Se não encontrar, tenta localizar por label/aliases dentro da pasta correta.
Isso ajuda a converter cards antigos para o novo modelo sem duplicar.
============================================================
*/

async function ensureSystemItem(seedItem, systemItemsByKey) {
    const now = new Date().toISOString();
    const parentId = getParentIdFromSeed(seedItem, systemItemsByKey);

    let existingItem = systemItemsByKey.get(seedItem.systemKey);

    /*
        Compatibilidade com versões antigas:
        se o item ainda não tem systemKey, tentamos encontrar por nome.
    */
    if (!existingItem) {
        existingItem = await findExistingItemBySeed(seedItem, parentId);
    }

    if (!existingItem) {
        await db.items.add({
            label: seedItem.label,
            emoji: seedItem.emoji || "💬",
            type: seedItem.type,
            parentId,
            image: getPlaceholderImage(seedItem.label, seedItem.emoji),
            alarmTime: seedItem.alarmTime || "",
            composeMode: seedItem.type === "folder"
                ? seedItem.composeMode === true
                : false,

            systemKey: seedItem.systemKey,
            isSystem: true,
            systemVersion: DEXIE_SEED_VERSION,

            isFavorite: false,
            isEmergency: seedItem.systemKey === "emergency",
            usageCount: 0,

            createdAt: now,
            updatedAt: now
        });

        return;
    }

    /*
        Atualização segura:
        - não troca label manualmente editado;
        - não troca foto real do usuário;
        - não troca áudio gravado;
        - atualiza somente metadados técnicos e placeholder antigo.
    */
    const safeUpdate = {
        type: seedItem.type,
        parentId,
        isSystem: true,
        systemKey: seedItem.systemKey,
        systemVersion: DEXIE_SEED_VERSION,
        emoji: seedItem.emoji || existingItem.emoji || "💬",
        updatedAt: now
    };

    if (seedItem.type === "folder") {
        safeUpdate.composeMode = seedItem.composeMode === true;
    }

    if (existingItem.alarmTime === undefined) {
        safeUpdate.alarmTime = seedItem.alarmTime || "";
    }

    /*
        Ponto central desta correção:
        se a imagem atual for o placeholder antigo de primeira letra,
        substituímos pelo placeholder com emoji.
    */
    if (isLegacyLetterPlaceholder(existingItem.image)) {
        safeUpdate.image = getPlaceholderImage(seedItem.label, seedItem.emoji);
    }

    if (existingItem.isFavorite === undefined) {
        safeUpdate.isFavorite = false;
    }

    if (existingItem.isEmergency === undefined) {
        safeUpdate.isEmergency = seedItem.systemKey === "emergency";
    }

    if (existingItem.usageCount === undefined) {
        safeUpdate.usageCount = 0;
    }

    /*
        Atualiza apenas imagens automáticas do sistema.

        Não altera fotos reais escolhidas pelo usuário.
        SVG antigo do próprio sistema é regenerado para usar o ícone correto.
    */
    if (
        !existingItem.image ||
        String(existingItem.image).startsWith("data:image/svg+xml")
    ) {
        safeUpdate.image = getPlaceholderImage(seedItem.label, seedItem.systemKey);
    }

    await db.items.update(existingItem.id, safeUpdate);
}

/*
============================================================
11. LOCALIZAÇÃO DE ITEM ANTIGO POR LABEL

Ajuda a converter instalações antigas que ainda não possuíam systemKey.
============================================================
*/

async function findExistingItemBySeed(seedItem, parentId) {
    const labelsToSearch = [
        seedItem.label,
        ...(Array.isArray(seedItem.aliases) ? seedItem.aliases : [])
    ].map(normalizeLabel);

    return await db.items
        .where("parentId")
        .equals(parentId)
        .filter((item) => labelsToSearch.includes(normalizeLabel(item.label)))
        .first();
}

/*
============================================================
12. RESOLUÇÃO DE PASTA PAI

Resolve parentSystemKey para o ID real salvo no IndexedDB.
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
13. CONSULTA DE EMOJI DOS CARDS OFICIAIS

Esta função permite que outros arquivos, como app.js, descubram qual emoji
pertence a um card oficial do sistema.

Ela é usada principalmente quando o app precisa gerar o placeholder visual
no idioma atual, sem depender do texto que foi salvo originalmente no banco.
============================================================
*/

function getSystemCardEmoji(systemKey) {
    const seedItem = SYSTEM_SEED_ITEMS.find((item) => item.systemKey === systemKey);

    return seedItem ? seedItem.emoji || "💬" : "💬";
}

/*
============================================================
13. FUNÇÃO OPCIONAL DE RESET

Útil apenas para testes.

Atenção:
Esta função apaga a prancha atual. Não deve ser usada por usuários finais
sem backup.
============================================================
*/

async function resetarPranchaPadrao() {
    const confirmar = confirm(
        "Isso vai apagar todos os cards atuais e recriar a prancha padrão. Faça backup antes. Deseja continuar?"
    );

    if (!confirmar) return;

    await db.items.clear();
    await seedInitialData();

    location.reload();
}

/*
============================================================
14. EXPOSIÇÃO GLOBAL

Mantém compatibilidade com os demais arquivos do app.
============================================================
*/

window.seedInitialData = seedInitialData;
window.syncSystemCards = syncSystemCards;
window.getPlaceholderImage = getPlaceholderImage;
window.getSystemCardEmoji = getSystemCardEmoji;
window.resetarPranchaPadrao = resetarPranchaPadrao;

console.log("TalkToYou: dexie-setup.js carregado com placeholders de emoji.");



/*
    Exposição global usada pelo app.js e pdf-service.js.

    Nome propositalmente específico para evitar conflito com funções
    internas do app.js.
*/




/*
    Exposição global usada por app.js e pdf-service.js.

    O nome é específico para evitar conflito com funções internas do app.js.
*/
window.getSystemCardEmojiFromSeed = function(systemKey, label = "") {
    return getSystemIcon(systemKey, label);
};


/*
============================================================
ATUALIZAÇÃO FORÇADA DAS IMAGENS AUTOMÁTICAS DOS CARDS OFICIAIS

Use no console quando os ícones aparecerem como balão:

forceRefreshSystemCardImages()

Esta função:
- atualiza apenas cards oficiais;
- atualiza apenas imagens SVG automáticas;
- não altera fotos reais escolhidas pelo usuário;
- não altera cards personalizados.
============================================================
*/
async function forceRefreshSystemCardImages() {
    const items = await db.items.toArray();
    let updated = 0;

    for (const item of items) {
        if (!item.systemKey) {
            continue;
        }

        if (
            !item.image ||
            String(item.image).startsWith("data:image/svg+xml")
        ) {
            await db.items.update(item.id, {
                image: getPlaceholderImage(item.label, item.systemKey),
                updatedAt: new Date().toISOString()
            });

            updated++;
        }
    }

    console.log(`[TalkToYou] Imagens oficiais atualizadas: ${updated}`);
    return updated;
}

window.forceRefreshSystemCardImages = forceRefreshSystemCardImages;
