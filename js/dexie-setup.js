/* ====================================================================
   TalkToYou - Módulo de Banco de Dados Local (Dexie.js)
   Modelo ampliado de Comunicação Alternativa / AAC
   ==================================================================== */

/* --------------------------------------------------------------------
   1. Idioma e textos básicos
-------------------------------------------------------------------- */
var i18n = {
    pt: {
        title: 'Comunicação Alternativa',
        appName: 'TalkToYou',
        welcome: 'Início',
        add: 'Incluir Novo',
        manage: 'Gerenciar',
        print: 'Imprimir'
    },
    en: {
        title: 'Alternative Communication',
        appName: 'TalkToYou',
        welcome: 'Home',
        add: 'Add New',
        manage: 'Manage',
        print: 'Print'
    }
};

var langDetect = navigator.language.startsWith('pt') ? 'pt' : 'en';

/* --------------------------------------------------------------------
   2. Banco local IndexedDB
-------------------------------------------------------------------- */
var db = new Dexie("TalkToYouDB_Final");
window.db = db;

db.version(1).stores({
    items: '++id, label, type, parentId, alarmTime'
});

db.version(2).stores({
    items: '++id, label, type, parentId, alarmTime, composeMode'
});



/* --------------------------------------------------------------------
   3. Utilitários
-------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------
   4. Placeholder SVG para cards sem foto
-------------------------------------------------------------------- */
function getPlaceholderImage(label = 'Item', emoji = '💬') {
    const safeLabel = escapeSvgText(label.toUpperCase());

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect width="100%" height="100%" fill="#e3f2fd"/>
            <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="70">${emoji}</text>
            <text x="50%" y="68%" dominant-baseline="middle" text-anchor="middle" font-size="23" fill="#333" font-weight="bold">${safeLabel}</text>
        </svg>
    `)}`;
}

/* --------------------------------------------------------------------
   5. Funções auxiliares para criar dados sem duplicar
-------------------------------------------------------------------- */
async function findItemByLabelsAndParent(labels, parentId) {
    const normalizedLabels = labels.map(normalizeLabel);

    return await db.items
        .where('parentId')
        .equals(parentId)
        .filter(item => normalizedLabels.includes(normalizeLabel(item.label)))
        .first();
}

async function findItemByLabelAndParent(label, parentId) {
    return await findItemByLabelsAndParent([label], parentId);
}

async function ensureFolder(
    label,
    emoji,
    parentId = 0,
    aliases = [],
    composeMode = false
) {
    const labelsToSearch = [label, ...aliases];

    const existing = await findItemByLabelsAndParent(labelsToSearch, parentId);

    if (existing) {
        await db.items.update(existing.id, {
            label,
            type: "folder",
            parentId,
            composeMode,
            image: existing.image || getPlaceholderImage(label, emoji),
            alarmTime: existing.alarmTime || ""
        });

        return existing.id;
    }

    return await db.items.add({
        label,
        type: "folder",
        parentId,
        composeMode,
        image: getPlaceholderImage(label, emoji),
        alarmTime: ""
    });
}

async function ensureCard(label, emoji, parentId, alarmTime = "", aliases = []) {
    const labelsToSearch = [label, ...aliases];
    const existing = await findItemByLabelsAndParent(labelsToSearch, parentId);

    if (existing) {
        const updateData = {
            label,
            type: "card",
            parentId,
            image: existing.image || getPlaceholderImage(label, emoji),
            alarmTime: existing.alarmTime || alarmTime || ""
        };

        await db.items.update(existing.id, updateData);
        return existing.id;
    }

    return await db.items.add({
        label,
        type: "card",
        parentId,
        image: getPlaceholderImage(label, emoji),
        alarmTime
    });
}

async function moveExistingCard(label, possibleOldParents, newParentId) {
    const oldParents = Array.isArray(possibleOldParents)
        ? possibleOldParents
        : [possibleOldParents];

    for (const oldParentId of oldParents) {
        const item = await findItemByLabelAndParent(label, oldParentId);

        if (!item) continue;

        const alreadyInTarget = await findItemByLabelAndParent(label, newParentId);

        if (!alreadyInTarget) {
            await db.items.update(item.id, {
                parentId: newParentId
            });
        }

        return;
    }
}

/* --------------------------------------------------------------------
   6. Carga inicial ampliada
   - Não apaga dados do usuário.
   - Não duplica cards já existentes.
   - Reorganiza alguns cards antigos para o novo modelo.
-------------------------------------------------------------------- */
async function seedInitialData() {
    console.log("TalkToYou: verificando estrutura inicial ampliada...");

    /* ---------------------------------------------------------------
       6.1 Pastas principais
    ---------------------------------------------------------------- */
    const cQuero = await ensureFolder("Eu Quero","🙋‍♂️",0,[],true);
    const cComunicacao = await ensureFolder("Comunicação","💬",0,["Comunicação Rápida", "Falar", "Respostas"],false);
    const cSentir = await ensureFolder("Como Estou","😊",0,["Me Sentindo", "Sentindo"],true);
    const cComer = await ensureFolder("Comer","🍽️",0,[],false);
    const cBeber = await ensureFolder("Beber","🥤",0,[],false);
    const cRotina = await ensureFolder("Rotina","⏰",0,[],false);
    const cSensorial = await ensureFolder("Sensorial","🧠",0,[],true);
    const cEmergencia = await ensureFolder("Emergência","🚨",0,[],true);
    const cPessoas = await ensureFolder("Pessoas","👨‍👩‍👧",0,[],false);
    const cBrincar = await ensureFolder("Brincar","🎮",0,[],false);

    /* ---------------------------------------------------------------
       6.3 EU QUERO - pedidos funcionais rápidos
    ---------------------------------------------------------------- */
    await ensureCard("Água", "💧", cQuero);
    await ensureCard("Leite", "🥛", cQuero);
    await ensureCard("Suco", "🧃", cQuero);
    await ensureCard("Comer", "🍽️", cQuero);
    await ensureCard("Banheiro", "🚾", cQuero);
    await ensureCard("Ajuda", "🤝", cQuero);
    await ensureCard("Brincar", "🧸", cQuero);
    await ensureCard("Colo", "🫂", cQuero);
    await ensureCard("Abraço", "🤗", cQuero);
    await ensureCard("Dormir", "😴", cQuero);
    await ensureCard("Passear", "🚶", cQuero);
    await ensureCard("Desenho", "📺", cQuero);
    await ensureCard("Música", "🎵", cQuero);
    await ensureCard("Celular", "📱", cQuero);
    await ensureCard("Ficar sozinho", "🙈", cQuero);

    /* ---------------------------------------------------------------
       6.4 COMUNICAÇÃO - palavras essenciais
    ---------------------------------------------------------------- */
    await ensureCard("Sim", "✅", cComunicacao);
    await ensureCard("Não", "❌", cComunicacao);
    await ensureCard("Mais", "➕", cComunicacao);
    await ensureCard("Acabou", "🛑", cComunicacao);
    await ensureCard("Quero", "🙋‍♂️", cComunicacao);
    await ensureCard("Não quero", "🚫", cComunicacao);
    await ensureCard("Ajuda", "🤝", cComunicacao);
    await ensureCard("Parar", "✋", cComunicacao);
    await ensureCard("Espera", "⏳", cComunicacao);
    await ensureCard("Vamos", "➡️", cComunicacao);
    await ensureCard("Aqui", "📍", cComunicacao);
    await ensureCard("Lá", "👉", cComunicacao);
    await ensureCard("De novo", "🔁", cComunicacao);
    await ensureCard("Gostei", "👍", cComunicacao);
    await ensureCard("Não gostei", "👎", cComunicacao);
    await ensureCard("Obrigado", "🙏", cComunicacao);
    await ensureCard("Desculpa", "😔", cComunicacao);

    /* ---------------------------------------------------------------
       6.5 COMO ESTOU - emoções, desconfortos e estados
    ---------------------------------------------------------------- */
    await ensureCard("Feliz", "😄", cSentir);
    await ensureCard("Triste", "😢", cSentir);
    await ensureCard("Bravo", "😠", cSentir);
    await ensureCard("Com medo", "😨", cSentir);
    await ensureCard("Ansioso", "😰", cSentir);
    await ensureCard("Cansado", "🥱", cSentir);
    await ensureCard("Com dor", "🤕", cSentir);
    await ensureCard("Com fome", "😋", cSentir);
    await ensureCard("Com sede", "🥤", cSentir);
    await ensureCard("Com sono", "😴", cSentir);
    await ensureCard("Calor", "🥵", cSentir);
    await ensureCard("Frio", "🥶", cSentir);
    await ensureCard("Doente", "🤒", cSentir);
    await ensureCard("Nervoso", "😖", cSentir);
    await ensureCard("Confuso", "😕", cSentir);
    await ensureCard("Estou bem", "🙂", cSentir);
    await ensureCard("Não estou bem", "😣", cSentir);

    /* ---------------------------------------------------------------
       6.6 COMER - alimentos sólidos
    ---------------------------------------------------------------- */
    await ensureCard("Maçã", "🍎", cComer);
    await ensureCard("Banana", "🍌", cComer);
    await ensureCard("Pão", "🍞", cComer);
    await ensureCard("Arroz", "🍚", cComer);
    await ensureCard("Feijão", "🫘", cComer);
    await ensureCard("Macarrão", "🍝", cComer);
    await ensureCard("Carne", "🥩", cComer);
    await ensureCard("Frango", "🍗", cComer);
    await ensureCard("Ovo", "🥚", cComer);
    await ensureCard("Biscoito", "🍪", cComer);
    await ensureCard("Bolo", "🍰", cComer);
    await ensureCard("Chocolate", "🍫", cComer);
    await ensureCard("Sorvete", "🍨", cComer);
    await ensureCard("Pizza", "🍕", cComer);
    await ensureCard("Batata frita", "🍟", cComer);
    await ensureCard("Almoço", "🍽️", cComer);
    await ensureCard("Jantar", "🍛", cComer);
    await ensureCard("Lanche", "🥪", cComer);

    /* ---------------------------------------------------------------
       6.7 BEBER - líquidos
    ---------------------------------------------------------------- */
    await ensureCard("Água", "💧", cBeber);
    await ensureCard("Leite", "🥛", cBeber);
    await ensureCard("Suco", "🧃", cBeber);
    await ensureCard("Vitamina", "🥤", cBeber);
    await ensureCard("Iogurte", "🥛", cBeber);
    await ensureCard("Achocolatado", "🍫", cBeber);
    await ensureCard("Chá", "🍵", cBeber);
    await ensureCard("Refrigerante", "🥤", cBeber);

    /* ---------------------------------------------------------------
       6.8 ROTINA - previsibilidade do dia
    ---------------------------------------------------------------- */
    await ensureCard("Acordar", "☀️", cRotina, "06:20");
    await ensureCard("Escovar dentes", "🪥", cRotina);
    await ensureCard("Banheiro", "🚾", cRotina);
    await ensureCard("Banho", "🚿", cRotina);
    await ensureCard("Trocar roupa", "👕", cRotina);
    await ensureCard("Café da manhã", "☕", cRotina);
    await ensureCard("Escola", "🏫", cRotina);
    await ensureCard("Tarefa", "📚", cRotina);
    await ensureCard("Terapia", "🧩", cRotina);
    await ensureCard("Remédio", "💊", cRotina);
    await ensureCard("Almoço", "🍽️", cRotina);
    await ensureCard("Descansar", "🛋️", cRotina);
    await ensureCard("Passear", "🚶", cRotina);
    await ensureCard("Jantar", "🍛", cRotina);
    await ensureCard("Dormir", "🌙", cRotina);

    /* ---------------------------------------------------------------
       6.9 SENSORIAL - regulação e desconfortos
    ---------------------------------------------------------------- */
    await ensureCard("Barulho alto", "🔊", cSensorial);
    await ensureCard("Quero silêncio", "🤫", cSensorial);
    await ensureCard("Luz forte", "💡", cSensorial);
    await ensureCard("Está muito cheio", "👥", cSensorial);
    await ensureCard("Estou incomodado", "😖", cSensorial);
    await ensureCard("Quero descansar", "😴", cSensorial);
    await ensureCard("Quero balançar", "🪀", cSensorial);
    await ensureCard("Quero apertar", "🤲", cSensorial);
    await ensureCard("Não toque em mim", "🚫", cSensorial);
    await ensureCard("Pode me abraçar", "🤗", cSensorial);
    await ensureCard("Preciso de pausa", "⏸️", cSensorial);

    /* ---------------------------------------------------------------
       6.10 EMERGÊNCIA - comunicação crítica
    ---------------------------------------------------------------- */
    await ensureCard("Preciso de ajuda", "🆘", cEmergencia);
    await ensureCard("Estou com dor", "🤕", cEmergencia);
    await ensureCard("Não estou bem", "😣", cEmergencia);
    await ensureCard("Quero ir embora", "🏠", cEmergencia);
    await ensureCard("Estou perdido", "😰", cEmergencia);
    await ensureCard("Chamar mamãe", "👩", cEmergencia);
    await ensureCard("Chamar papai", "👨", cEmergencia);
    await ensureCard("Chamar professor", "🧑‍🏫", cEmergencia);
    await ensureCard("Banheiro urgente", "🚾", cEmergencia);
    await ensureCard("Machucou", "🩹", cEmergencia);
    await ensureCard("Pare agora", "🛑", cEmergencia);

    /* ---------------------------------------------------------------
       6.11 PESSOAS - familiares e rede de apoio
    ---------------------------------------------------------------- */
    await ensureCard("Mamãe", "👩", cPessoas);
    await ensureCard("Papai", "👨", cPessoas);
    await ensureCard("Vovó", "👵", cPessoas);
    await ensureCard("Vovô", "👴", cPessoas);
    await ensureCard("Irmão", "👦", cPessoas);
    await ensureCard("Irmã", "👧", cPessoas);
    await ensureCard("Professor", "🧑‍🏫", cPessoas);
    await ensureCard("Terapeuta", "🧩", cPessoas);
    await ensureCard("Médico", "🧑‍⚕️", cPessoas);
    await ensureCard("Amigo", "🧒", cPessoas);

    /* ---------------------------------------------------------------
       6.12 BRINCAR - lazer e interesses
    ---------------------------------------------------------------- */
    await ensureCard("Bola", "⚽", cBrincar);
    await ensureCard("Carrinho", "🚗", cBrincar);
    await ensureCard("Boneca", "🧸", cBrincar);
    await ensureCard("Blocos", "🧱", cBrincar);
    await ensureCard("Quebra-cabeça", "🧩", cBrincar);
    await ensureCard("Desenhar", "🎨", cBrincar);
    await ensureCard("Massinha", "🟣", cBrincar);
    await ensureCard("Livro", "📖", cBrincar);
    await ensureCard("Música", "🎵", cBrincar);
    await ensureCard("Desenho", "📺", cBrincar);
    await ensureCard("Tablet", "📱", cBrincar);
    await ensureCard("Parquinho", "🛝", cBrincar);

    console.log("TalkToYou: estrutura inicial ampliada verificada/criada com sucesso.");
}

/* --------------------------------------------------------------------
   7. Função opcional de emergência
   Use no console do navegador, se quiser zerar e recriar tudo:
   resetarPranchaPadrao()
-------------------------------------------------------------------- */
async function resetarPranchaPadrao() {
    const confirmar = confirm(
        "Isso vai apagar todos os cards atuais e recriar a prancha padrão ampliada. Deseja continuar?"
    );

    if (!confirmar) return;

    await db.items.clear();
    await seedInitialData();
    location.reload();
}

window.resetarPranchaPadrao = resetarPranchaPadrao;

/* --------------------------------------------------------------------
   8. Logs de diagnóstico
-------------------------------------------------------------------- */
console.log("DEXIE SETUP CARREGADO:", window.db);
console.log("TABELA ITEMS:", window.db ? window.db.items : "window.db não existe");
