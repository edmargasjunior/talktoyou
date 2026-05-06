/* ====================================================================
   TalkToYou - Módulo de Banco de Dados Local (Dexie.js)
   ==================================================================== */

// 1. Configuração Global de Idioma e Dicionário
const i18n = {
    pt: { title: 'Comunicação Alternativa', appName: 'FaleComVocê', welcome: 'Início', add: 'Incluir Novo', manage: 'Gerenciar', print: 'Imprimir' },
    en: { title: 'Alternative Communication', appName: 'TalkToYou', welcome: 'Home', add: 'Add New', manage: 'Manage', print: 'Print' }
};

const langDetect = navigator.language.startsWith('pt') ? 'pt' : 'en';

// 2. Inicialização do Banco de Dados Interno (IndexedDB)
const db = new Dexie("TalkToYouDB_Final");

db.version(1).stores({
    items: '++id, label, type, parentId, alarmTime'
});

// 3. Função Auxiliar para Gerar Imagens de Espelho (Placeholders em SVG)
function getPlaceholderImage(label = 'Item', emoji = '💬') {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect width="100%" height="100%" fill="#e3f2fd"/>
            <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-size="70">${emoji}</text>
            <text x="50%" y="68%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#333" font-weight="bold">${label.toUpperCase()}</text>
        </svg>
    `)}`;
}

// 4. Carga Inicial de Dados (FitzGerald/PECS Vocabulário Estruturado)
async function seedInitialData() {
    const count = await db.items.count();
    if (count > 0) return;

    console.log("TalkToYou: Alimentando banco de dados com a estrutura inicial...");

    const cDesejos = await db.items.add({ label: "Eu Quero", type: "folder", parentId: 0, image: getPlaceholderImage("Eu Quero", "🙋‍♂️") });
    const cSentir   = await db.items.add({ label: "Sentindo", type: "folder", parentId: 0, image: getPlaceholderImage("Sentindo", "😊") });
    const cComer    = await db.items.add({ label: "Comer", type: "folder", parentId: 0, image: getPlaceholderImage("Comer", "🍎") });
    const cRotina   = await db.items.add({ label: "Rotina", type: "folder", parentId: 0, image: getPlaceholderImage("Rotina", "⏰") });

    await db.items.add({ label: "Ajuda", type: "card", parentId: cDesejos, image: getPlaceholderImage("Ajuda", "🤝") });
    await db.items.add({ label: "Banheiro", type: "card", parentId: cDesejos, image: getPlaceholderImage("Banheiro", "🚾") });
    await db.items.add({ label: "Mais", type: "card", parentId: cDesejos, image: getPlaceholderImage("Mais", "➕") });

    await db.items.add({ label: "Feliz", type: "card", parentId: cSentir, image: getPlaceholderImage("Feliz", "😄") });
    await db.items.add({ label: "Triste", type: "card", parentId: cSentir, image: getPlaceholderImage("Triste", "😢") });
    await db.items.add({ label: "Bravo", type: "card", parentId: cSentir, image: getPlaceholderImage("Bravo", "😠") });

    await db.items.add({ label: "Maçã", type: "card", parentId: cComer, image: getPlaceholderImage("Maçã", "🍎") });
    await db.items.add({ label: "Suco", type: "card", parentId: cComer, image: getPlaceholderImage("Suco", "🧃") });
    await db.items.add({ label: "Leite", type: "card", parentId: cComer, image: getPlaceholderImage("Leite", "🥛") });

    await db.items.add({ label: "Acordar", type: "card", parentId: cRotina, image: getPlaceholderImage("Acordar", "☀️"), alarmTime: "06:20" });
    await db.items.add({ label: "Escola", type: "card", parentId: cRotina, image: getPlaceholderImage("Escola", "🏫") });
    await db.items.add({ label: "Banho", type: "card", parentId: cRotina, image: getPlaceholderImage("Banho", "🚿") });

    console.log("TalkToYou: Banco de dados populado com sucesso!");
}