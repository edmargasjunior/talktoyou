/* ======================================================================
   TalkToYou - dexie-setup.js
   Configuração do banco de dados local e textos multilíngues.

   Este módulo concentra:
   - Detecção de idioma
   - Dicionário de textos da interface
   - Banco IndexedDB via Dexie
   - Criação da prancha inicial
   - Utilitários de imagem placeholder

   Observação importante:
   O app foi desenhado para preservar privacidade. Os dados ficam salvos
   no próprio aparelho do usuário. Não há servidor central armazenando cards.
====================================================================== */

/* ----------------------------------------------------------------------
   1. DETECÇÃO DE IDIOMA

   Regra atual:
   - Português: qualquer variação "pt" usa pt-BR.
   - Inglês: qualquer variação "en" usa en.
   - Espanhol: qualquer variação "es" usa es.
   - Outros idiomas: usa inglês como alternativa segura.

   Sugestão futura:
   Criar seletor manual de idioma dentro do app, para não depender apenas
   do idioma do dispositivo.
---------------------------------------------------------------------- */
var supportedLanguages = ["pt", "en", "es"];

function detectAppLanguage() {
    const browserLanguage = (navigator.language || "pt-BR").toLowerCase();

    if (browserLanguage.startsWith("pt")) return "pt";
    if (browserLanguage.startsWith("en")) return "en";
    if (browserLanguage.startsWith("es")) return "es";

    return "en";
}

var langDetect = detectAppLanguage();

/* ----------------------------------------------------------------------
   2. TEXTOS DA INTERFACE

   Este dicionário permite traduzir a interface sem espalhar textos fixos
   por vários arquivos JavaScript.
---------------------------------------------------------------------- */
var i18n = {
    pt: {
        title: "Comunicação Alternativa",
        appName: "TalkToYou",
        welcome: "Início",
        add: "Incluir Novo",
        manage: "Gerenciar",
        edit: "Editar",
        print: "Imprimir",
        rootOption: "Início (Raiz)",
        defaultDeviceVoice: "Voz padrão do aparelho",
        voiceSelected: "Voz selecionada",
        emptyFolder: 'Pasta vazia.<br>Toque no menu ☰ e selecione "Incluir Novo" para começar.',
        startupError: "Erro ao iniciar o aplicativo:",
        nameRequired: "Dê um nome ao item.",
        saveError: "Erro ao salvar o item.",
        confirmDelete: "Deseja realmente excluir este item e seus itens internos?",
        photoOk: "✅ Foto OK",
        choosePhoto: "📷 Tirar ou Escolher Foto",
        audioSaved: "✅ Áudio salvo",
        tapToRecord: "Toque para gravar sua voz",
        backupExportError: "Erro ao exportar backup.",
        invalidFile: "Arquivo inválido.",
        confirmImport: "Substituir todos os cards atuais por este backup?",
        backupImported: "Backup importado com sucesso!",
        invalidOrCorruptedFile: "Arquivo inválido ou corrompido.",
        confirmClearData: "Tem certeza que deseja apagar todos os dados deste aparelho?\n\nCards, imagens, áudios e configurações locais serão removidos.\n\nRecomenda-se fazer backup antes de continuar.",
        clearDataSuccess: "Dados locais apagados com sucesso.\n\nO aplicativo será recarregado agora.",
        clearDataError: "Não foi possível limpar todos os dados automaticamente.\n\nTente fechar e abrir o aplicativo novamente ou limpar os dados pelas configurações do Android.",
        copyPixFallback: "Copie a chave PIX:",
        copied: "✅ COPIADO!",
        microphoneUnavailable: "Este aparelho ou navegador não liberou acesso ao microfone.",
        microphoneAccessError: "Não foi possível acessar o microfone.",
        recorded: "✅ Gravado",
        recordingStatus: "Gravando... toque novamente para parar",
        alarmPrefix: "HORA DE",
        pdfNeedFolder: "Crie pelo menos uma pasta (Categoria) antes de imprimir.",
        pdfError: "Erro técnico ao gerar o arquivo PDF."
    },
    en: {
        title: "Alternative Communication",
        appName: "TalkToYou",
        welcome: "Home",
        add: "Add New",
        manage: "Manage",
        edit: "Edit",
        print: "Print",
        rootOption: "Home (Root)",
        defaultDeviceVoice: "Device default voice",
        voiceSelected: "Voice selected",
        emptyFolder: 'Empty folder.<br>Tap the ☰ menu and select "Add New" to begin.',
        startupError: "Error starting the application:",
        nameRequired: "Please enter a name for the item.",
        saveError: "Error saving the item.",
        confirmDelete: "Do you really want to delete this item and its children?",
        photoOk: "✅ Photo OK",
        choosePhoto: "📷 Take or Choose Photo",
        audioSaved: "✅ Audio saved",
        tapToRecord: "Tap to record your voice",
        backupExportError: "Error exporting backup.",
        invalidFile: "Invalid file.",
        confirmImport: "Replace all current cards with this backup?",
        backupImported: "Backup imported successfully!",
        invalidOrCorruptedFile: "Invalid or corrupted file.",
        confirmClearData: "Are you sure you want to erase all data from this device?\n\nCards, images, recorded audio and local settings will be removed.\n\nIt is recommended to export a backup before continuing.",
        clearDataSuccess: "Local data erased successfully.\n\nThe application will reload now.",
        clearDataError: "It was not possible to erase all data automatically.\n\nTry closing and reopening the application or clearing data in Android settings.",
        copyPixFallback: "Copy PIX key:",
        copied: "✅ COPIED!",
        microphoneUnavailable: "This device or browser did not allow microphone access.",
        microphoneAccessError: "Could not access the microphone.",
        recorded: "✅ Recorded",
        recordingStatus: "Recording... tap again to stop",
        alarmPrefix: "TIME TO",
        pdfNeedFolder: "Create at least one folder/category before printing.",
        pdfError: "Technical error generating the PDF file."
    },
    es: {
        title: "Comunicación Alternativa",
        appName: "TalkToYou",
        welcome: "Inicio",
        add: "Agregar Nuevo",
        manage: "Administrar",
        edit: "Editar",
        print: "Imprimir",
        rootOption: "Inicio (Raíz)",
        defaultDeviceVoice: "Voz predeterminada del dispositivo",
        voiceSelected: "Voz seleccionada",
        emptyFolder: 'Carpeta vacía.<br>Toque el menú ☰ y seleccione "Agregar Nuevo" para comenzar.',
        startupError: "Error al iniciar la aplicación:",
        nameRequired: "Escriba un nombre para el elemento.",
        saveError: "Error al guardar el elemento.",
        confirmDelete: "¿Realmente desea eliminar este elemento y sus elementos internos?",
        photoOk: "✅ Foto OK",
        choosePhoto: "📷 Tomar o Elegir Foto",
        audioSaved: "✅ Audio guardado",
        tapToRecord: "Toque para grabar su voz",
        backupExportError: "Error al exportar la copia de seguridad.",
        invalidFile: "Archivo inválido.",
        confirmImport: "¿Reemplazar todos los cards actuales por esta copia?",
        backupImported: "Copia de seguridad importada con éxito.",
        invalidOrCorruptedFile: "Archivo inválido o dañado.",
        confirmClearData: "¿Está seguro de que desea borrar todos los datos de este dispositivo?\n\nCards, imágenes, audios grabados y configuraciones locales serán removidos.\n\nSe recomienda exportar una copia antes de continuar.",
        clearDataSuccess: "Datos locales borrados con éxito.\n\nLa aplicación se recargará ahora.",
        clearDataError: "No fue posible borrar todos los datos automáticamente.\n\nIntente cerrar y abrir la aplicación nuevamente o borrar los datos desde la configuración de Android.",
        copyPixFallback: "Copie la clave PIX:",
        copied: "✅ COPIADO!",
        microphoneUnavailable: "Este dispositivo o navegador no permitió acceso al micrófono.",
        microphoneAccessError: "No fue posible acceder al micrófono.",
        recorded: "✅ Grabado",
        recordingStatus: "Grabando... toque nuevamente para detener",
        alarmPrefix: "HORA DE",
        pdfNeedFolder: "Cree al menos una carpeta/categoría antes de imprimir.",
        pdfError: "Error técnico al generar el archivo PDF."
    }
};

/**
 * Busca um texto traduzido.
 * Se a chave não existir no idioma atual, usa português como fallback.
 */
function getText(key) {
    return (i18n[langDetect] && i18n[langDetect][key])
        || (i18n.pt && i18n.pt[key])
        || key;
}

/* ----------------------------------------------------------------------
   3. BANCO LOCAL INDEXEDDB
---------------------------------------------------------------------- */
var db = new Dexie("TalkToYouDB_Final");
window.db = db;

db.version(1).stores({
    items: "++id, label, type, parentId, alarmTime"
});

db.version(2).stores({
    items: "++id, label, type, parentId, alarmTime, composeMode"
});

/*
   Versão 3:
   Não altera índices, mas registra evolução lógica do projeto.
   Campos não indexados, como image e audioBlob, continuam podendo ser salvos.
*/
db.version(3).stores({
    items: "++id, label, type, parentId, alarmTime, composeMode"
});

/* ----------------------------------------------------------------------
   4. UTILITÁRIOS GERAIS
---------------------------------------------------------------------- */
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

/**
 * Gera uma imagem SVG simples para cards sem foto.
 * Isso evita cards "vazios" e mantém a prancha visualmente compreensível.
 */
function getPlaceholderImage(label = "Item", emoji = "💬") {
    const safeLabel = escapeSvgText(String(label).toUpperCase());

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect width="100%" height="100%" fill="#e3f2fd"/>
            <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="70">${emoji}</text>
            <text x="50%" y="68%" dominant-baseline="middle" text-anchor="middle" font-size="23" fill="#333" font-weight="bold">${safeLabel}</text>
        </svg>
    `)}`;
}

/* ----------------------------------------------------------------------
   5. FUNÇÕES AUXILIARES PARA CRIAÇÃO DE DADOS
---------------------------------------------------------------------- */
async function findItemByLabelsAndParent(labels, parentId) {
    const normalizedLabels = labels.map(normalizeLabel);

    return await db.items
        .where("parentId")
        .equals(parentId)
        .filter((item) => normalizedLabels.includes(normalizeLabel(item.label)))
        .first();
}

async function ensureFolder(label, emoji, parentId = 0, aliases = [], composeMode = false) {
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
        await db.items.update(existing.id, {
            label,
            type: "card",
            parentId,
            image: existing.image || getPlaceholderImage(label, emoji),
            alarmTime: existing.alarmTime || alarmTime || ""
        });

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

/* ----------------------------------------------------------------------
   6. DADOS INICIAIS POR IDIOMA

   Esta abordagem não usa tradução automática online.
   Vantagem: funciona offline e preserva privacidade.

   Limite atual:
   Cards criados manualmente pelo usuário não são traduzidos automaticamente.
   Para isso, seria necessário um módulo de tradução local ou integração externa,
   o que exige nova decisão de privacidade e arquitetura.
---------------------------------------------------------------------- */
var seedData = {
    pt: {
        folders: [
            { key: "want", label: "Eu Quero", emoji: "🙋‍♂️", composeMode: true },
            { key: "communication", label: "Comunicação", emoji: "💬", composeMode: false },
            { key: "feel", label: "Como Estou", emoji: "😊", composeMode: true },
            { key: "eat", label: "Comer", emoji: "🍽️", composeMode: false },
            { key: "drink", label: "Beber", emoji: "🥤", composeMode: false },
            { key: "routine", label: "Rotina", emoji: "⏰", composeMode: false },
            { key: "sensory", label: "Sensorial", emoji: "🧠", composeMode: true },
            { key: "emergency", label: "Emergência", emoji: "🚨", composeMode: true },
            { key: "people", label: "Pessoas", emoji: "👨‍👩‍👧", composeMode: false },
            { key: "play", label: "Brincar", emoji: "🎮", composeMode: false }
        ],
        cards: {
            want: [["Água","💧"],["Leite","🥛"],["Suco","🧃"],["Comer","🍽️"],["Banheiro","🚾"],["Ajuda","🤝"],["Brincar","🧸"],["Colo","🫂"],["Abraço","🤗"],["Dormir","😴"],["Passear","🚶"],["Desenho","📺"],["Música","🎵"],["Celular","📱"],["Ficar sozinho","🙈"]],
            communication: [["Sim","✅"],["Não","❌"],["Mais","➕"],["Acabou","🛑"],["Quero","🙋‍♂️"],["Não quero","🚫"],["Ajuda","🤝"],["Parar","✋"],["Espera","⏳"],["Vamos","➡️"],["Aqui","📍"],["Lá","👉"],["De novo","🔁"],["Gostei","👍"],["Não gostei","👎"],["Obrigado","🙏"],["Desculpa","😔"]],
            feel: [["Feliz","😄"],["Triste","😢"],["Bravo","😠"],["Com medo","😨"],["Ansioso","😰"],["Cansado","🥱"],["Com dor","🤕"],["Com fome","😋"],["Com sede","🥤"],["Com sono","😴"],["Calor","🥵"],["Frio","🥶"],["Doente","🤒"],["Nervoso","😖"],["Confuso","😕"],["Estou bem","🙂"],["Não estou bem","😣"]],
            eat: [["Maçã","🍎"],["Banana","🍌"],["Pão","🍞"],["Arroz","🍚"],["Feijão","🫘"],["Macarrão","🍝"],["Carne","🥩"],["Frango","🍗"],["Ovo","🥚"],["Biscoito","🍪"],["Bolo","🍰"],["Chocolate","🍫"],["Sorvete","🍨"],["Pizza","🍕"],["Batata frita","🍟"],["Almoço","🍽️"],["Jantar","🍛"],["Lanche","🥪"]],
            drink: [["Água","💧"],["Leite","🥛"],["Suco","🧃"],["Vitamina","🥤"],["Iogurte","🥛"],["Achocolatado","🍫"],["Chá","🍵"],["Refrigerante","🥤"]],
            routine: [["Acordar","☀️","06:20"],["Escovar dentes","🪥"],["Banheiro","🚾"],["Banho","🚿"],["Trocar roupa","👕"],["Café da manhã","☕"],["Escola","🏫"],["Tarefa","📚"],["Terapia","🧩"],["Remédio","💊"],["Almoço","🍽️"],["Descansar","🛋️"],["Passear","🚶"],["Jantar","🍛"],["Dormir","🌙"]],
            sensory: [["Barulho alto","🔊"],["Quero silêncio","🤫"],["Luz forte","💡"],["Está muito cheio","👥"],["Estou incomodado","😖"],["Quero descansar","😴"],["Quero balançar","🪀"],["Quero apertar","🤲"],["Não toque em mim","🚫"],["Pode me abraçar","🤗"],["Preciso de pausa","⏸️"]],
            emergency: [["Preciso de ajuda","🆘"],["Estou com dor","🤕"],["Não estou bem","😣"],["Quero ir embora","🏠"],["Estou perdido","😰"],["Chamar mamãe","👩"],["Chamar papai","👨"],["Chamar professor","🧑‍🏫"],["Banheiro urgente","🚾"],["Machucou","🩹"],["Pare agora","🛑"]],
            people: [["Mamãe","👩"],["Papai","👨"],["Vovó","👵"],["Vovô","👴"],["Irmão","👦"],["Irmã","👧"],["Professor","🧑‍🏫"],["Terapeuta","🧩"],["Médico","🧑‍⚕️"],["Amigo","🧒"]],
            play: [["Bola","⚽"],["Carrinho","🚗"],["Boneca","🧸"],["Blocos","🧱"],["Quebra-cabeça","🧩"],["Desenhar","🎨"],["Massinha","🟣"],["Livro","📖"],["Música","🎵"],["Desenho","📺"],["Tablet","📱"],["Parquinho","🛝"]]
        }
    }
};

seedData.en = {
    folders: [
        { key: "want", label: "I Want", emoji: "🙋‍♂️", composeMode: true },
        { key: "communication", label: "Communication", emoji: "💬", composeMode: false },
        { key: "feel", label: "How I Feel", emoji: "😊", composeMode: true },
        { key: "eat", label: "Eat", emoji: "🍽️", composeMode: false },
        { key: "drink", label: "Drink", emoji: "🥤", composeMode: false },
        { key: "routine", label: "Routine", emoji: "⏰", composeMode: false },
        { key: "sensory", label: "Sensory", emoji: "🧠", composeMode: true },
        { key: "emergency", label: "Emergency", emoji: "🚨", composeMode: true },
        { key: "people", label: "People", emoji: "👨‍👩‍👧", composeMode: false },
        { key: "play", label: "Play", emoji: "🎮", composeMode: false }
    ],
    cards: {
        want: [["Water","💧"],["Milk","🥛"],["Juice","🧃"],["Food","🍽️"],["Bathroom","🚾"],["Help","🤝"],["Play","🧸"],["Lap","🫂"],["Hug","🤗"],["Sleep","😴"],["Walk","🚶"],["Cartoon","📺"],["Music","🎵"],["Phone","📱"],["Be alone","🙈"]],
        communication: [["Yes","✅"],["No","❌"],["More","➕"],["Finished","🛑"],["I want","🙋‍♂️"],["I don't want","🚫"],["Help","🤝"],["Stop","✋"],["Wait","⏳"],["Let's go","➡️"],["Here","📍"],["There","👉"],["Again","🔁"],["I liked it","👍"],["I didn't like it","👎"],["Thank you","🙏"],["Sorry","😔"]],
        feel: [["Happy","😄"],["Sad","😢"],["Angry","😠"],["Scared","😨"],["Anxious","😰"],["Tired","🥱"],["In pain","🤕"],["Hungry","😋"],["Thirsty","🥤"],["Sleepy","😴"],["Hot","🥵"],["Cold","🥶"],["Sick","🤒"],["Nervous","😖"],["Confused","😕"],["I'm okay","🙂"],["I'm not okay","😣"]],
        eat: [["Apple","🍎"],["Banana","🍌"],["Bread","🍞"],["Rice","🍚"],["Beans","🫘"],["Pasta","🍝"],["Meat","🥩"],["Chicken","🍗"],["Egg","🥚"],["Cookie","🍪"],["Cake","🍰"],["Chocolate","🍫"],["Ice cream","🍨"],["Pizza","🍕"],["French fries","🍟"],["Lunch","🍽️"],["Dinner","🍛"],["Snack","🥪"]],
        drink: [["Water","💧"],["Milk","🥛"],["Juice","🧃"],["Smoothie","🥤"],["Yogurt","🥛"],["Chocolate milk","🍫"],["Tea","🍵"],["Soda","🥤"]],
        routine: [["Wake up","☀️","06:20"],["Brush teeth","🪥"],["Bathroom","🚾"],["Shower","🚿"],["Change clothes","👕"],["Breakfast","☕"],["School","🏫"],["Homework","📚"],["Therapy","🧩"],["Medicine","💊"],["Lunch","🍽️"],["Rest","🛋️"],["Walk","🚶"],["Dinner","🍛"],["Sleep","🌙"]],
        sensory: [["Loud noise","🔊"],["I want quiet","🤫"],["Bright light","💡"],["Too crowded","👥"],["I'm uncomfortable","😖"],["I want to rest","😴"],["I want to swing","🪀"],["I want pressure","🤲"],["Don't touch me","🚫"],["You can hug me","🤗"],["I need a break","⏸️"]],
        emergency: [["I need help","🆘"],["I'm in pain","🤕"],["I'm not okay","😣"],["I want to go home","🏠"],["I'm lost","😰"],["Call mom","👩"],["Call dad","👨"],["Call teacher","🧑‍🏫"],["Bathroom urgent","🚾"],["I'm hurt","🩹"],["Stop now","🛑"]],
        people: [["Mom","👩"],["Dad","👨"],["Grandma","👵"],["Grandpa","👴"],["Brother","👦"],["Sister","👧"],["Teacher","🧑‍🏫"],["Therapist","🧩"],["Doctor","🧑‍⚕️"],["Friend","🧒"]],
        play: [["Ball","⚽"],["Toy car","🚗"],["Doll","🧸"],["Blocks","🧱"],["Puzzle","🧩"],["Draw","🎨"],["Clay","🟣"],["Book","📖"],["Music","🎵"],["Cartoon","📺"],["Tablet","📱"],["Playground","🛝"]]
    }
};

seedData.es = {
    folders: [
        { key: "want", label: "Quiero", emoji: "🙋‍♂️", composeMode: true },
        { key: "communication", label: "Comunicación", emoji: "💬", composeMode: false },
        { key: "feel", label: "Cómo Estoy", emoji: "😊", composeMode: true },
        { key: "eat", label: "Comer", emoji: "🍽️", composeMode: false },
        { key: "drink", label: "Beber", emoji: "🥤", composeMode: false },
        { key: "routine", label: "Rutina", emoji: "⏰", composeMode: false },
        { key: "sensory", label: "Sensorial", emoji: "🧠", composeMode: true },
        { key: "emergency", label: "Emergencia", emoji: "🚨", composeMode: true },
        { key: "people", label: "Personas", emoji: "👨‍👩‍👧", composeMode: false },
        { key: "play", label: "Jugar", emoji: "🎮", composeMode: false }
    ],
    cards: {
        want: [["Agua","💧"],["Leche","🥛"],["Jugo","🧃"],["Comer","🍽️"],["Baño","🚾"],["Ayuda","🤝"],["Jugar","🧸"],["Brazos","🫂"],["Abrazo","🤗"],["Dormir","😴"],["Pasear","🚶"],["Dibujos","📺"],["Música","🎵"],["Celular","📱"],["Estar solo","🙈"]],
        communication: [["Sí","✅"],["No","❌"],["Más","➕"],["Terminó","🛑"],["Quiero","🙋‍♂️"],["No quiero","🚫"],["Ayuda","🤝"],["Parar","✋"],["Espera","⏳"],["Vamos","➡️"],["Aquí","📍"],["Allá","👉"],["Otra vez","🔁"],["Me gustó","👍"],["No me gustó","👎"],["Gracias","🙏"],["Perdón","😔"]],
        feel: [["Feliz","😄"],["Triste","😢"],["Enojado","😠"],["Con miedo","😨"],["Ansioso","😰"],["Cansado","🥱"],["Con dolor","🤕"],["Con hambre","😋"],["Con sed","🥤"],["Con sueño","😴"],["Calor","🥵"],["Frío","🥶"],["Enfermo","🤒"],["Nervioso","😖"],["Confundido","😕"],["Estoy bien","🙂"],["No estoy bien","😣"]],
        eat: [["Manzana","🍎"],["Banana","🍌"],["Pan","🍞"],["Arroz","🍚"],["Frijoles","🫘"],["Pasta","🍝"],["Carne","🥩"],["Pollo","🍗"],["Huevo","🥚"],["Galleta","🍪"],["Pastel","🍰"],["Chocolate","🍫"],["Helado","🍨"],["Pizza","🍕"],["Papas fritas","🍟"],["Almuerzo","🍽️"],["Cena","🍛"],["Merienda","🥪"]],
        drink: [["Agua","💧"],["Leche","🥛"],["Jugo","🧃"],["Batido","🥤"],["Yogur","🥛"],["Leche con chocolate","🍫"],["Té","🍵"],["Refresco","🥤"]],
        routine: [["Despertar","☀️","06:20"],["Cepillar dientes","🪥"],["Baño","🚾"],["Ducha","🚿"],["Cambiar ropa","👕"],["Desayuno","☕"],["Escuela","🏫"],["Tarea","📚"],["Terapia","🧩"],["Medicina","💊"],["Almuerzo","🍽️"],["Descansar","🛋️"],["Pasear","🚶"],["Cena","🍛"],["Dormir","🌙"]],
        sensory: [["Ruido fuerte","🔊"],["Quiero silencio","🤫"],["Luz fuerte","💡"],["Hay mucha gente","👥"],["Estoy incómodo","😖"],["Quiero descansar","😴"],["Quiero balancearme","🪀"],["Quiero presión","🤲"],["No me toque","🚫"],["Puede abrazarme","🤗"],["Necesito pausa","⏸️"]],
        emergency: [["Necesito ayuda","🆘"],["Tengo dolor","🤕"],["No estoy bien","😣"],["Quiero ir a casa","🏠"],["Estoy perdido","😰"],["Llamar a mamá","👩"],["Llamar a papá","👨"],["Llamar al profesor","🧑‍🏫"],["Baño urgente","🚾"],["Me lastimé","🩹"],["Pare ahora","🛑"]],
        people: [["Mamá","👩"],["Papá","👨"],["Abuela","👵"],["Abuelo","👴"],["Hermano","👦"],["Hermana","👧"],["Profesor","🧑‍🏫"],["Terapeuta","🧩"],["Médico","🧑‍⚕️"],["Amigo","🧒"]],
        play: [["Pelota","⚽"],["Carrito","🚗"],["Muñeca","🧸"],["Bloques","🧱"],["Rompecabezas","🧩"],["Dibujar","🎨"],["Plastilina","🟣"],["Libro","📖"],["Música","🎵"],["Dibujos","📺"],["Tablet","📱"],["Parque","🛝"]]
    }
};

/* ----------------------------------------------------------------------
   7. CARGA INICIAL
---------------------------------------------------------------------- */
async function seedInitialData() {
    const count = await db.items.count();

    if (count > 0) {
        console.log("TalkToYou: banco já possui dados; seed inicial não será recriado.");
        return;
    }

    const currentSeed = seedData[langDetect] || seedData.en;
    const folderIds = {};

    console.log(`TalkToYou: criando prancha inicial no idioma ${langDetect}...`);

    for (const folder of currentSeed.folders) {
        folderIds[folder.key] = await ensureFolder(
            folder.label,
            folder.emoji,
            0,
            [],
            folder.composeMode
        );
    }

    for (const folder of currentSeed.folders) {
        const cards = currentSeed.cards[folder.key] || [];

        for (const card of cards) {
            await ensureCard(
                card[0],
                card[1],
                folderIds[folder.key],
                card[2] || ""
            );
        }
    }

    console.log("TalkToYou: prancha inicial criada com sucesso.");
}

/* ----------------------------------------------------------------------
   8. FUNÇÃO ADMINISTRATIVA DE RECRIAÇÃO DA PRANCHA PADRÃO
---------------------------------------------------------------------- */
async function resetarPranchaPadrao() {
    const confirmar = confirm(
        "Isso vai apagar todos os cards atuais e recriar a prancha padrão do idioma atual. Deseja continuar?"
    );

    if (!confirmar) return;

    await db.items.clear();
    await seedInitialData();

    location.reload();
}

window.resetarPranchaPadrao = resetarPranchaPadrao;

/* ----------------------------------------------------------------------
   9. LOGS DE DIAGNÓSTICO
---------------------------------------------------------------------- */
console.log("TalkToYou - idioma detectado:", langDetect);
console.log("TalkToYou - banco Dexie carregado:", window.db);
