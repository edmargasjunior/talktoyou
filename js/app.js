/* ======================================================================
   TalkToYou - app.js
   Controlador central de interface, navegação, CRUD, backup e eventos.

   Observação de projeto:
   Este arquivo foi organizado para facilitar manutenção e documentação
   acadêmica. A intenção é que o HTML descreva a estrutura visual e que o
   JavaScript concentre os comportamentos da aplicação.

   Público-alvo:
   Pessoas com dificuldade de fala, incluindo TEA, usuários em recuperação
   de acidentes ou doenças, familiares, terapeutas e responsáveis.
====================================================================== */

/* ----------------------------------------------------------------------
   1. ESTADO GLOBAL DA INTERFACE

   Estes estados são mantidos em memória enquanto o app está aberto.
   Os dados permanentes ficam no IndexedDB, configurado em dexie-setup.js.
---------------------------------------------------------------------- */
let currentParentId = 0;
let pathHistory = [];
let currentImageBase64 = null;
let synth = window.speechSynthesis;
let voices = [];
let isBusy = false;
let lastFocusedElement = null;

/*
   Idioma usado no momento da edição de um card.

   Essa informação é necessária porque agora os cards oficiais podem ter
   nomes personalizados por idioma. Assim, editar um card em inglês altera
   somente o texto em inglês, sem afetar português ou espanhol.
*/
let currentEditLanguage = "pt-BR";
let currentEditOriginalLabelValue = "";

/* ----------------------------------------------------------------------
   CONTROLE DE VERSÃO DA APLICAÇÃO

   Estas constantes vêm de js/version.js.

   Elas permitem separar:
   - versão geral do aplicativo;
   - versão do cache offline;
   - versão dos cards oficiais de pré-carga;
   - versão da estrutura do banco local.

   Isso é importante para evolução acadêmica do projeto, porque permite
   atualizar o sistema sem apagar ou sobrescrever a personalização terapêutica
   criada pelo usuário.
---------------------------------------------------------------------- */
const VERSION_INFO = window.TalkToYouVersion || {
    APP_RUNTIME_VERSION: "1.0.0",
    CACHE_VERSION: "1",
    SEED_VERSION: "1.0.0",
    DB_SCHEMA_VERSION: 1
};

const APP_RUNTIME_VERSION = VERSION_INFO.APP_VERSION;
const APP_SEED_VERSION = VERSION_INFO.SEED_VERSION;
const APP_DB_SCHEMA_VERSION = VERSION_INFO.DB_SCHEMA_VERSION;

const APP_VERSION_STORAGE_KEY = "talktoyou_app_version";
const DB_SCHEMA_STORAGE_KEY = "talktoyou_db_schema_version";

/*
   Mantém compatibilidade com chamadas externas antigas.
   Mesmo removendo onclick do HTML, algumas funções continuam globais.
*/
window.processImage = processImage;

/* ----------------------------------------------------------------------
   2. INICIALIZAÇÃO DA APLICAÇÃO
---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", initializeApplication);

/**
 * Inicializa a aplicação quando o HTML já foi carregado.
 *
 * Principais responsabilidades:
 * - Conectar botões e campos aos eventos
 * - Configurar o botão voltar do Android/navegador
 * - Carregar vozes disponíveis
 * - Aplicar idioma da interface
 * - Criar base inicial de cards, se necessário
 * - Carregar preferências locais
 * - Renderizar a prancha inicial
 */
async function initializeApplication() {
    try {
        bindInterfaceEvents();
        configureAndroidBackButton();
        configureItemTypeBehavior();
        initializeInternationalization();

        populateVoiceList();

        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }

        applyInterfaceLanguage();

        /*
    Verifica e registra a versão atual do aplicativo.

    Esta etapa não apaga dados personalizados.
    Ela apenas prepara o app para saber qual versão está em execução.
*/
registerApplicationVersion();

/*
    Sincroniza os cards oficiais do sistema.

    A função seedInitialData(), agora controlada pelo dexie-setup.js,
    não serve mais apenas para primeira instalação. Ela também atualiza
    cards oficiais quando a SEED_VERSION muda.

    Importante:
    Cards personalizados do usuário não são apagados nem traduzidos.
*/
await seedInitialData();

        loadGridPreference();
        loadDebouncePreference();

        await loadBoard(0);
    } catch (error) {
        console.error("Erro crítico na inicialização do TalkToYou:", error);

        alert(
            getText("startupError") + "\n\n" +
            (error && error.message ? error.message : error)
        );
    } finally {
        hideSplashScreen(1000);
    }
}

/**
 * Oculta a tela de abertura.
 */
function hideSplashScreen(delayMs = 1000) {
    setTimeout(() => {
        const splash = document.getElementById("splash-screen");

        if (!splash) return;

        splash.style.opacity = "0";

        setTimeout(() => {
            splash.remove();
        }, 500);
    }, delayMs);
}

/**
 * Integra o botão voltar do Android/navegador com a navegação interna.
 *
 * Sem isso, ao tocar no botão voltar do sistema dentro de uma pasta,
 * o usuário pode sair do aplicativo em vez de voltar para a tela anterior.
 */
function configureAndroidBackButton() {
    window.history.replaceState({ talkToYouRoot: true }, "");
    window.history.pushState({ talkToYouApp: true }, "");

    window.onpopstate = async () => {
        const hasOpenModal = closeTopLayerIfNeeded();

        if (hasOpenModal) {
            window.history.pushState({ talkToYouApp: true }, "");
            return;
        }

        if (currentParentId !== 0 || pathHistory.length > 0) {
            await navigateBack();
            window.history.pushState({ talkToYouApp: true }, "");
        }
    };
}

/**
 * Fecha menu ou modal antes de executar a navegação de tela.
 * Isso deixa o botão voltar mais parecido com aplicativos Android nativos.
 */
function closeTopLayerIfNeeded() {
    const menu = document.getElementById("side-menu");
    const menuOverlay = document.getElementById("menu-overlay");

    if (menu && menu.classList.contains("open")) {
        menu.classList.remove("open");

        if (menuOverlay) {
            menuOverlay.style.display = "none";
        }

        return true;
    }

    const openedModal = Array.from(document.querySelectorAll(".modal"))
        .find((modal) => modal.style.display && modal.style.display !== "none");

    if (openedModal) {
        closeModals();
        return true;
    }

    return false;
}

/**
 * Exibe ou oculta a opção de composição de frase conforme o tipo do item.
 */
function configureItemTypeBehavior() {
    const itemType = document.getElementById("item-type");
    const composeGroup = document.getElementById("compose-mode-group");

    if (!itemType || !composeGroup) return;

    itemType.addEventListener("change", () => {
        composeGroup.style.display = itemType.value === "folder" ? "block" : "none";
    });
}

/**
 * Aplica os textos principais conforme o idioma detectado.
 */
function applyInterfaceLanguage() {
    /*
        Se o arquivo js/i18n.js estiver carregado, ele assume a tradução
        dos elementos marcados com data-i18n no HTML.
    */
    if (window.TalkToYouI18n) {
        TalkToYouI18n.applyTranslations();
        updateLanguageLinks();
        return;
    }

    /*
        Fallback de segurança para versões sem i18n.js.
    */
    const uiTitle = document.getElementById("ui-title");
    const appWindowTitle = document.getElementById("app-window-title");

    if (uiTitle) {
        uiTitle.innerText = getText("title");
    }

    if (appWindowTitle) {
        appWindowTitle.innerText = getText("appName");
    }
}

/* ----------------------------------------------------------------------
   3. EVENTOS DA INTERFACE

   O HTML revisado usa IDs nos elementos.
   Os eventos são vinculados aqui, evitando onclick inline.
---------------------------------------------------------------------- */
function bindInterfaceEvents() {
    bindClick("btn-stop-alarm", stopAlarm);
    bindClick("header-back", navigateBack);
    bindClick("btn-open-menu", toggleMenu);
    bindClick("menu-overlay", toggleMenu);

    bindClick("btn-add-item", () => openModal("add"));
    bindClick("btn-manage-items", () => openModal("manage"));

    bindClick("btn-export-backup", exportarPrancha);
    bindClick("btn-export-pdf", exportToPDF);

    bindClick("btn-copy-pix-menu", copyPix);
    bindClick("btn-copy-pix-modal", copyPix);

    bindClick("record-btn", toggleRecording);
    bindClick("btn-save-item", saveCRUDItem);
    bindClick("btn-delete", deleteItem);

    bindClick("btn-open-clear-data", () => openModal("clear-data"));
    bindClick("btn-clear-export-backup", exportarPrancha);
    bindClick("btn-confirm-clear-data", clearApplicationData);

    document.querySelectorAll(".btn-close-modal").forEach((button) => {
        button.addEventListener("click", closeModals);
    });

    const gridConfig = document.getElementById("grid-config");
    if (gridConfig) {
        gridConfig.addEventListener("change", () => updateGridLayout(gridConfig.value));
    }

    const voiceSelect = document.getElementById("voice-select");
    if (voiceSelect) {
        voiceSelect.addEventListener("change", saveVoicePreference);
    }

    const debounceConfig = document.getElementById("debounce-config");
    if (debounceConfig) {
        debounceConfig.addEventListener("change", toggleDebounce);
    }

    const importBackupInput = document.getElementById("input-import-backup");
    if (importBackupInput) {
        importBackupInput.addEventListener("change", importarPrancha);
    }

    const itemImageInput = document.getElementById("item-image");
    if (itemImageInput) {
        itemImageInput.addEventListener("change", () => processImage(itemImageInput));
    }
}

/**
 * Pequeno utilitário defensivo para evitar erro se algum elemento ainda
 * não existir no HTML em versões intermediárias do app.
 */
function bindClick(elementId, callback) {
    const element = document.getElementById(elementId);

    if (!element || typeof callback !== "function") return;

    element.addEventListener("click", callback);
}

/* ----------------------------------------------------------------------
   4. VOZES, GRID E PROTEÇÃO CONTRA CLIQUES REPETIDOS
---------------------------------------------------------------------- */
function populateVoiceList() {
    const voiceSelect = document.getElementById("voice-select");

    if (!voiceSelect) return;

    const allVoices = synth.getVoices();
    const preferredLanguage = getSpeechLanguage().split("-")[0];

    voices = allVoices.filter((voice) =>
        voice.lang.toLowerCase().startsWith(preferredLanguage)
    );

    if (voices.length === 0) {
        voices = allVoices;
    }

    const selectedVoice = localStorage.getItem("talktoyou_voice") || "";

    voiceSelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = getText("defaultDeviceVoice");
    voiceSelect.appendChild(defaultOption);

    voices.forEach((voice) => {
        const option = document.createElement("option");

        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute("data-name", voice.name);

        if (selectedVoice === voice.name) {
            option.selected = true;
        }

        voiceSelect.appendChild(option);
    });
}

function saveVoicePreference() {
    const select = document.getElementById("voice-select");

    if (!select) return;

    localStorage.setItem("talktoyou_voice", select.value || "");

    if (typeof speakText === "function") {
        speakText(getText("voiceSelected"), () => {});
    }
}

function updateGridLayout(value) {
    const board = document.getElementById("board-grid");

    if (!board) return;

    if (value === "auto") {
        document.documentElement.style.setProperty("--grid-cols", "auto-fill");
        document.documentElement.style.setProperty("--card-min-width", "140px");
        board.classList.remove("is-fixed-grid");
    } else {
        document.documentElement.style.setProperty("--grid-cols", value);
        board.classList.add("is-fixed-grid");
    }

    localStorage.setItem("talktoyou_grid_pref", value);
}

function loadGridPreference() {
    const preference = localStorage.getItem("talktoyou_grid_pref") || "auto";
    const select = document.getElementById("grid-config");

    if (select) {
        select.value = preference;
    }

    updateGridLayout(preference);
}

/**
 * Salva a preferência de proteção contra toques repetidos.
 * Por padrão ela deve ficar desligada, pois pode passar sensação de atraso.
 */
function toggleDebounce() {
    const checkbox = document.getElementById("debounce-config");

    if (!checkbox) return;

    localStorage.setItem("talktoyou_debounce", String(checkbox.checked));
}

function loadDebouncePreference() {
    const preference = localStorage.getItem("talktoyou_debounce") === "true";
    const checkbox = document.getElementById("debounce-config");

    if (checkbox) {
        checkbox.checked = preference;
    }
}

/* ----------------------------------------------------------------------
   5. RENDERIZAÇÃO DA PRANCHA
---------------------------------------------------------------------- */
async function loadBoard(parentId = 0) {
    currentParentId = parentId;

    const grid = document.getElementById("board-grid");
    const backBtn = document.getElementById("header-back");

    if (!grid || !backBtn) return;

    grid.innerHTML = "";

    backBtn.style.opacity = parentId === 0 ? "0" : "1";
    backBtn.style.pointerEvents = parentId === 0 ? "none" : "auto";

    await updatePathText(parentId);

    const items = await db.items.where("parentId").equals(parentId).toArray();

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                ${getText("emptyFolder")}
            </div>
        `;
        return;
    }

    items.forEach((item) => {
        grid.appendChild(createCardElement(item));
    });
}

/**
 * Atualiza o texto de localização da tela atual.
 */
async function updatePathText(parentId) {
    const pathTextElement = document.getElementById("path-text");

    if (!pathTextElement) return;

    if (parentId === 0) {
        pathTextElement.innerText = getText("welcome");
        return;
    }

    const parent = await db.items.get(parentId);
    pathTextElement.innerText = parent ? getDisplayLabel(parent) : getText("welcome");
}

/**
 * Cria o elemento visual de um card/pasta.
 * Acessibilidade: cada card recebe role button, aria-label e suporte a teclado.
 */
function createCardElement(item) {
    const displayLabel = getDisplayLabel(item);
    const card = document.createElement("div");

    card.className = `card ${item.type === "folder" ? "is-folder" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", displayLabel);

    card.addEventListener("click", () => handleCardClick(item));

    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardClick(item);
        }
    });

    const image = document.createElement("img");

    /*
        A imagem também precisa respeitar o idioma quando for um
        placeholder automático de card oficial.

        Exemplo do problema corrigido:
        - texto inferior do card: WATER
        - texto dentro do desenho: ÁGUA

        Isso acontecia porque o SVG salvo no banco foi criado em português.
        Agora, se for placeholder automático, ele é gerado dinamicamente com
        o rótulo traduzido. Fotos reais escolhidas pelo usuário continuam
        preservadas.
    */
    image.src = getCardVisualImage(item, displayLabel);
    image.alt = displayLabel;

    const label = document.createElement("div");
    label.className = "card-label";
    label.textContent = displayLabel;

    card.appendChild(image);
    card.appendChild(label);

    return card;
}

/* ----------------------------------------------------------------------
   6. NAVEGAÇÃO E CLIQUE NOS CARDS
---------------------------------------------------------------------- */
async function handleCardClick(item) {
    const useDebounce = localStorage.getItem("talktoyou_debounce") === "true";

    if (useDebounce && isBusy) return;

    if (useDebounce) {
        isBusy = true;
    }

    try {
        if (item.type === "folder") {
            pathHistory.push(currentParentId);
            window.history.pushState({ pathId: item.id }, "");
            await loadBoard(item.id);

            if (useDebounce) {
                isBusy = false;
            }

            return;
        }

        const sequence = [];

        if (currentParentId !== 0) {
            const parent = await db.items.get(currentParentId);

            if (parent) {
                sequence.push(parent);
            }
        }

        sequence.push(item);

        if (typeof playSequenceFluida === "function") {
            await playSequenceFluida(sequence);
        }
    } catch (error) {
        console.error("Erro ao executar clique no card:", error);
    } finally {
        if (useDebounce) {
            setTimeout(() => {
                isBusy = false;
            }, 1200);
        }
    }
}

async function navigateBack() {
    const previousId = pathHistory.length > 0 ? pathHistory.pop() : 0;

    await loadBoard(previousId);
}

/* ----------------------------------------------------------------------
   7. MENU E MODAIS
---------------------------------------------------------------------- */
function toggleMenu() {
    const menu = document.getElementById("side-menu");
    const overlay = document.getElementById("menu-overlay");

    if (!menu || !overlay) return;

    const isOpening = !menu.classList.contains("open");

    menu.classList.toggle("open");
    overlay.style.display = menu.classList.contains("open") ? "block" : "none";

    if (isOpening) {
        const firstItem = menu.querySelector(".menu-item, button, select, a");

        if (firstItem && typeof firstItem.focus === "function") {
            setTimeout(() => firstItem.focus(), 80);
        }
    }
}

function closeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.display = "none";
    });

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        setTimeout(() => lastFocusedElement.focus(), 50);
    }
}

/**
 * Abre modais do app.
 * O foco automático ajuda usuários de teclado, leitores de tela e testes.
 */
async function openModal(mode, itemId = null) {
    lastFocusedElement = document.activeElement;

    closeModals();

    const menu = document.getElementById("side-menu");

    if (mode !== "edit" && menu && menu.classList.contains("open")) {
        toggleMenu();
    }

    if (mode === "clear-data") {
        showModal("clear-data-modal", "btn-clear-export-backup");
        return;
    }

    if (mode === "manage") {
        await openManageModal();
        return;
    }

    await prepareParentSelect();

    if (mode === "add") {
        resetForm();

        setText("modal-title", "add");
        setDisplay("btn-delete", "none");

        const parentInput = document.getElementById("item-parent");
        if (parentInput) {
            parentInput.value = currentParentId || 0;
        }

        const composeCheckbox = document.getElementById("item-compose-mode");
        if (composeCheckbox) {
            composeCheckbox.checked = false;
        }

        setDisplay("compose-mode-group", "block");
        showModal("form-modal", "item-label");
        return;
    }

    if (mode === "edit") {
        await openEditModal(itemId);
    }
}

function showModal(modalId, focusElementId = null) {
    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.style.display = "flex";

    if (focusElementId) {
        setTimeout(() => {
            document.getElementById(focusElementId)?.focus();
        }, 100);
    }
}

async function prepareParentSelect() {
    const parentSelect = document.getElementById("item-parent");

    if (!parentSelect) return;

    parentSelect.innerHTML = `<option value="0">${getText("rootOption")}</option>`;

    const folders = await db.items.where("type").equals("folder").toArray();

    folders.forEach((folder) => {
        const option = document.createElement("option");

        option.value = folder.id;
        option.textContent = `📁 ${getDisplayLabel(folder).toUpperCase()}`;

        parentSelect.appendChild(option);
    });
}

async function openManageModal() {
    const list = document.getElementById("manage-list");

    if (!list) return;

    list.innerHTML = "";

    const allItems = await db.items.toArray();

    /*
        Ordena a lista de gerenciamento em ordem alfabética.

        Importante:
        Usamos getDisplayLabel(item), e não item.label diretamente,
        porque o texto exibido pode variar conforme:
        - idioma selecionado;
        - nome personalizado por idioma;
        - cards oficiais traduzidos;
        - cards criados pelo usuário.

        Isso melhora a usabilidade para cuidadores, familiares,
        terapeutas e professores que precisam localizar rapidamente
        um card específico.
    */
    allItems.sort((a, b) => {
        const labelA = getDisplayLabel(a).toLocaleLowerCase();
        const labelB = getDisplayLabel(b).toLocaleLowerCase();
    
        return labelA.localeCompare(labelB);
    });

    allItems.forEach((item) => {
        const row = document.createElement("div");
        const label = document.createElement("span");
        const button = document.createElement("button");

        label.textContent = `${item.type === "folder" ? "📁" : "🟦"} ${getDisplayLabel(item)}`;

        button.type = "button";
        button.className = "btn btn-secondary";
        button.style.width = "auto";
        button.style.margin = "0";
        button.style.padding = "5px 10px";
        button.textContent = getText("edit");
        button.addEventListener("click", () => openModal("edit", item.id));

        row.appendChild(label);
        row.appendChild(button);
        list.appendChild(row);
    });

    showModal("manage-modal");
}

async function openEditModal(itemId) {
    resetForm();

    const item = await db.items.get(itemId);

    if (!item) return;

    setValue("edit-id", item.id);

    /*
        Nome exibido no formulário de edição.

        Para cards oficiais, o campo mostra o texto do idioma atual.
        Se já houver personalização naquele idioma, mostra a personalização.
        Caso contrário, mostra a tradução oficial do sistema.

        Para cards criados pelo usuário, continua mostrando o label normal.
    */
    currentEditLanguage = getCurrentContentLanguage();
    const labelForForm = getDisplayLabel(item, currentEditLanguage);
    currentEditOriginalLabelValue = labelForForm;

    setValue("item-label", labelForForm);
    setValue("item-type", item.type);
    setValue("item-parent", item.parentId ?? 0);
    setValue("item-alarm", item.alarmTime || "");

    currentImageBase64 = item.image || null;

    setTextContent("photo-status", item.image ? getText("photoOk") : getText("choosePhoto"));
    setTextContent("record-status", item.audioBlob ? getText("audioSaved") : getText("tapToRecord"));

    setDisplay("btn-delete", "block");

    const composeCheckbox = document.getElementById("item-compose-mode");

    if (composeCheckbox) {
        composeCheckbox.checked = item.composeMode === true;
    }

    setDisplay("compose-mode-group", item.type === "folder" ? "block" : "none");

    showModal("form-modal", "item-label");
}

/* ----------------------------------------------------------------------
   8. CRUD DOS ITENS
---------------------------------------------------------------------- */
async function saveCRUDItem() {
    const labelInput = document.getElementById("item-label");
    const labelValue = labelInput ? labelInput.value.trim() : "";

    if (!labelValue) {
        alert(getText("nameRequired"));
        return;
    }

    const id = getValue("edit-id");

    const itemType = getValue("item-type") || "card";

    const data = {
        label: labelValue,
        type: itemType,
        parentId: parseInt(getValue("item-parent") || "0", 10),
        alarmTime: getValue("item-alarm") || "",
        image: currentImageBase64 || getPlaceholderImage(labelValue),
        composeMode: itemType === "folder"
            ? document.getElementById("item-compose-mode")?.checked === true
            : false
    };

    if (typeof recordedAudioBlob !== "undefined" && recordedAudioBlob) {
        data.audioBlob = recordedAudioBlob;
    }

    try {
        if (id) {
            const numericId = parseInt(id, 10);
            const oldItem = await db.items.get(numericId);

            /*
                Personalização de texto por idioma.

                Se o item editado é um card oficial do sistema, não devemos
                substituir o label original do banco. O label original mantém
                o vínculo com a pré-carga, tradução, ícone, impressão e futuras
                migrações.

                Quando o usuário altera o nome em um idioma específico, salvamos
                em customLabels[idioma].

                Exemplo:
                customLabels: {
                    "pt-BR": "Hora de acordar",
                    "en-US": "Wake up now",
                    "es-ES": "Hora de despertar"
                }

                Isso permite que o mesmo card tenha rótulos personalizados por
                idioma, sem tradução automática e sem afetar os demais idiomas.
            */
            if (oldItem && oldItem.systemKey) {
                const editingLanguage = currentEditLanguage || getCurrentContentLanguage();
                const officialLabel = getOfficialDisplayLabel(oldItem, editingLanguage);
                const customLabels = { ...(oldItem.customLabels || {}) };

                data.label = oldItem.label || labelValue;

                /*
                    Se o texto digitado for diferente do texto oficial daquele
                    idioma, ele vira uma personalização daquele idioma.

                    Se for igual ao oficial, removemos a personalização daquele
                    idioma, permitindo que o card volte a acompanhar o dicionário
                    oficial do i18n.js.
                */
                if (labelValue && labelValue !== officialLabel) {
                    customLabels[editingLanguage] = labelValue;
                } else {
                    delete customLabels[editingLanguage];
                }

                data.customLabels = customLabels;
                data.customLabelsUpdatedAt = new Date().toISOString();

                /*
                    Compatibilidade com versões intermediárias.
                    customLabel era um campo único antigo. A partir desta versão,
                    a referência correta é customLabels por idioma.
                */
                data.customLabel = undefined;
                data.customLabelUpdatedAt = undefined;
            }

            if (oldItem && oldItem.audioBlob && !data.audioBlob) {
                data.audioBlob = oldItem.audioBlob;
            }

            await db.items.update(numericId, data);
        } else {
            await db.items.add(data);
        }

        closeModals();
        await loadBoard(data.parentId);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert(getText("saveError"));
    }
}

async function deleteItem() {
    const id = parseInt(getValue("edit-id"), 10);

    if (!id) return;

    if (!confirm(getText("confirmDelete"))) return;

    await deleteItemAndChildren(id);

    closeModals();
    await loadBoard(0);
}

async function deleteItemAndChildren(id) {
    const children = await db.items.where("parentId").equals(id).toArray();

    for (const child of children) {
        await deleteItemAndChildren(child.id);
    }

    await db.items.delete(id);
}

function resetForm() {
    currentEditLanguage = getCurrentContentLanguage();
    currentEditOriginalLabelValue = "";

    setValue("edit-id", "");
    setValue("item-label", "");
    setValue("item-alarm", "");
    setValue("item-type", "card");

    currentImageBase64 = null;

    if (typeof recordedAudioBlob !== "undefined") {
        recordedAudioBlob = null;
    }

    setTextContent("photo-status", getText("choosePhoto"));
    setTextContent("record-status", getText("tapToRecord"));

    const composeCheckbox = document.getElementById("item-compose-mode");

    if (composeCheckbox) {
        composeCheckbox.checked = false;
    }

    setDisplay("compose-mode-group", "none");
}

/* ----------------------------------------------------------------------
   9. PROCESSAMENTO DE IMAGEM
---------------------------------------------------------------------- */
function processImage(input) {
    if (!input.files || !input.files[0]) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const image = new Image();

        image.onload = function() {
            const canvas = document.getElementById("resize-canvas");

            if (!canvas) return;

            const context = canvas.getContext("2d");

            canvas.width = 300;
            canvas.height = 300;

            context.clearRect(0, 0, 300, 300);
            context.drawImage(image, 0, 0, 300, 300);

            currentImageBase64 = canvas.toDataURL("image/jpeg", 0.7);

            setTextContent("photo-status", getText("photoOk"));
        };

        image.src = event.target.result;
    };

    reader.readAsDataURL(input.files[0]);
}

/* ----------------------------------------------------------------------
   10. BACKUP COM SUPORTE A ÁUDIO
---------------------------------------------------------------------- */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        if (!blob) {
            resolve(null);
            return;
        }

        const reader = new FileReader();

        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64, fallbackType = "audio/webm") {
    if (!base64 || typeof base64 !== "string") return null;

    const parts = base64.split(",");
    const metadata = parts[0] || "";
    const data = parts[1] || "";
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : fallbackType;
    const binary = atob(data);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mimeType });
}

async function prepararItensParaBackup(items) {
    const convertedItems = [];

    for (const item of items) {
        const clone = { ...item };

        if (clone.audioBlob instanceof Blob) {
            clone.audioBlobBase64 = await blobToBase64(clone.audioBlob);
            clone.audioBlobType = clone.audioBlob.type || "audio/webm";
            delete clone.audioBlob;
        }

        convertedItems.push(clone);
    }

    return convertedItems;
}

function restaurarItensDoBackup(items) {
    return items.map((item) => {
        const clone = { ...item };

        if (clone.audioBlobBase64) {
            clone.audioBlob = base64ToBlob(clone.audioBlobBase64, clone.audioBlobType);
            delete clone.audioBlobBase64;
            delete clone.audioBlobType;
        }

        return clone;
    });
}

async function exportarPrancha() {
    try {
        const items = await db.items.toArray();
        const backupItems = await prepararItensParaBackup(items);

        const backup = {
            app: "TalkToYou",
            version: 3,
        
            /*
                Metadados técnicos do backup.
        
                Esses dados ajudam a saber em qual versão do app a prancha foi
                exportada, algo muito útil para manutenção, pesquisa e suporte.
            */
            appVersion: APP_RUNTIME_VERSION,
            seedVersion: SEED_VERSION,
            dbSchemaVersion: DB_SCHEMA_VERSION,
        
            exportedAt: new Date().toISOString(),
            language: window.TalkToYouI18n
                ? TalkToYouI18n.getCurrentLanguage()
                : "pt-BR",
            items: backupItems
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);

        anchor.href = url;
        anchor.download = `Backup_TalkToYou_${date}.json`;
        anchor.click();

        URL.revokeObjectURL(url);

        const menu = document.getElementById("side-menu");

        if (menu && menu.classList.contains("open")) {
            toggleMenu();
        }
    } catch (error) {
        console.error("Erro ao exportar backup:", error);
        alert(getText("backupExportError"));
    }
}

async function importarPrancha(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(readerEvent) {
        try {
            const content = JSON.parse(readerEvent.target.result);
            const originalItems = Array.isArray(content) ? content : content.items;

            if (!Array.isArray(originalItems)) {
                alert(getText("invalidFile"));
                return;
            }

            const confirmImport = confirm(getText("confirmImport"));

            if (!confirmImport) {
                event.target.value = "";
                return;
            }

            const restoredItems = restaurarItensDoBackup(originalItems);

            await db.items.clear();
            await db.items.bulkAdd(restoredItems);

            alert(getText("backupImported"));

            location.reload();
        } catch (error) {
            console.error("Erro ao importar backup:", error);
            alert(getText("invalidOrCorruptedFile"));
        } finally {
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}

/* ----------------------------------------------------------------------
   11. LIMPEZA DE DADOS LOCAIS
---------------------------------------------------------------------- */
async function clearApplicationData() {
    const confirmed = confirm(getText("confirmClearData"));

    if (!confirmed) return;

    try {
        if (typeof db !== "undefined" && db.delete) {
            await db.delete();
        }

        localStorage.clear();
        sessionStorage.clear();

        alert(getText("clearDataSuccess"));
        location.reload();
    } catch (error) {
        console.error("Erro ao limpar dados locais:", error);
        alert(getText("clearDataError"));
    }
}

/* ----------------------------------------------------------------------
   12. PIX
---------------------------------------------------------------------- */
function copyPix() {
    const pixKey = "260675cd-dd42-4c90-9154-9b684c386dcd";

    navigator.clipboard.writeText(pixKey)
        .then(() => {
            updatePixButtonsTemporarily();
        })
        .catch(() => {
            alert(`${getText("copyPixFallback")} ${pixKey}`);
        });
}

function updatePixButtonsTemporarily() {
    const buttons = [
        document.getElementById("btn-copy-pix-menu"),
        document.getElementById("btn-copy-pix-modal")
    ].filter(Boolean);

    buttons.forEach((button) => {
        const oldText = button.innerText;

        button.innerText = getText("copied");

        setTimeout(() => {
            button.innerText = oldText;
        }, 2000);
    });
}

/* ----------------------------------------------------------------------
   13. PEQUENOS UTILITÁRIOS DE DOM
---------------------------------------------------------------------- */
function getValue(elementId) {
    return document.getElementById(elementId)?.value;
}

function setValue(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.value = value;
    }
}

function setText(elementId, textKey) {
    setTextContent(elementId, getText(textKey));
}

function setTextContent(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.innerText = value;
    }
}

function setDisplay(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.style.display = value;
    }
}

/* ----------------------------------------------------------------------
   14. INTERNACIONALIZAÇÃO / IDIOMAS

   Este bloco integra o app.js com o arquivo js/i18n.js.

   Objetivo acadêmico e prático:
   - permitir que o aplicativo detecte o idioma do aparelho;
   - permitir troca manual de idioma pelo cuidador/responsável;
   - traduzir a interface sem apagar dados locais;
   - traduzir apenas os cards oficiais do sistema;
   - preservar integralmente os cards criados pelo usuário.

   Decisão importante:
   Cards personalizados não são traduzidos automaticamente.
   Isso evita alterar nomes próprios, rotinas familiares, expressões afetivas,
   termos terapêuticos, adaptações escolares ou frases criadas para uma pessoa
   específica.

   Para que um card oficial do sistema possa ser traduzido, ele precisa ter
   uma propriedade systemKey compatível com o dicionário do i18n.js.
   Exemplo:
   {
       label: "Água",
       type: "card",
       parentId: 1,
       systemKey: "water"
   }
---------------------------------------------------------------------- */

/**
 * Inicializa os recursos de idioma.
 *
 * Esta função é chamada durante initializeApplication().
 */
function initializeInternationalization() {
    if (!window.TalkToYouI18n) {
        console.warn(
            "[TalkToYou] js/i18n.js não foi encontrado. " +
            "A interface continuará funcionando no idioma padrão."
        );
        return;
    }

    /*
        Preenche o seletor de idiomas do menu lateral.
        Exemplo: Português, English, Español.
    */
    TalkToYouI18n.populateLanguageSelect("language-select");

    /*
        Aplica os textos traduzidos nos elementos marcados com:
        - data-i18n
        - data-i18n-placeholder
        - data-i18n-title
        - data-i18n-aria-label
    */
    TalkToYouI18n.applyTranslations();

    /*
        Ajusta os links de ajuda e privacidade conforme o idioma atual.
        Exemplo:
        pt-BR -> ajuda.html / privacidade.html
        en-US -> ajuda-en.html / privacidade-en.html
        es-ES -> ajuda-es.html / privacidade-es.html
    */
    updateLanguageLinks();

    const languageSelect = document.getElementById("language-select");

    if (languageSelect) {
        languageSelect.removeEventListener("change", handleLanguageSelectChange);
        languageSelect.addEventListener("change", handleLanguageSelectChange);
    }

    /*
        Evento global disparado pelo i18n.js quando o idioma muda.
        Isso permite atualizar partes dinâmicas da interface.
    */
    window.removeEventListener("talktoyou:language-changed", handleLanguageChangedEvent);
    window.addEventListener("talktoyou:language-changed", handleLanguageChangedEvent);
}

/**
 * Trata a troca manual de idioma feita no menu.
 */
function handleLanguageSelectChange(event) {
    if (!window.TalkToYouI18n) return;

    TalkToYouI18n.changeLanguage(event.target.value);
}

/**
 * Reage à alteração global de idioma.
 *
 * Ao trocar o idioma, o app:
 * - reaplica textos da interface;
 * - atualiza links;
 * - recarrega vozes;
 * - re-renderiza a prancha atual.
 */
async function handleLanguageChangedEvent() {
    if (!window.TalkToYouI18n) return;

    TalkToYouI18n.applyTranslations();
    updateLanguageLinks();
    populateVoiceList();

    /*
        Recarrega a prancha atual para que os cards oficiais sejam exibidos
        no idioma selecionado. Os cards personalizados permanecem inalterados.
    */
    await loadBoard(currentParentId);
}

/**
 * Atualiza os links das páginas auxiliares de acordo com o idioma.
 */
function updateLanguageLinks() {
    if (!window.TalkToYouI18n) return;

    const languageConfig = TalkToYouI18n.getLanguageConfig();
    const helpLink = document.getElementById("link-help");
    const privacyLink = document.getElementById("link-privacy");

    if (helpLink && languageConfig.helpPage) {
        helpLink.href = languageConfig.helpPage;
    }

    if (privacyLink && languageConfig.privacyPage) {
        privacyLink.href = languageConfig.privacyPage;
    }
}

/**
 * Retorna o rótulo visual de um card.
 *
 * Se o card for oficial do sistema e tiver systemKey, tenta traduzir.
 * Se for card criado pelo usuário, retorna o label original.
 */

/*
============================================================
MAPA DE RECONHECIMENTO DE CARDS OFICIAIS ANTIGOS

Algumas instalações podem ter cards oficiais criados antes da adoção
de systemKey. Este mapa permite reconhecer esses cards pelo nome original
em português e aplicar tradução/ícone corretamente.

Cards personalizados não são afetados, a menos que tenham exatamente o
mesmo rótulo de um card oficial.
============================================================
*/
const SYSTEM_LABEL_TO_KEY = {
    "eu quero": "want",
    "comunicação": "communication",
    "como estou": "feelings",
    "comer": "want_comer",
    "beber": "drink",
    "rotina": "routine",
    "sensorial": "sensory",
    "emergência": "emergency",
    "pessoas": "people",
    "brincar": "want_brincar",
    "água": "drink_agua",
    "leite": "drink_leite",
    "suco": "drink_suco",
    "banheiro": "routine_banheiro",
    "ajuda": "communication_ajuda",
    "colo": "want_colo",
    "abraço": "want_abraco",
    "dormir": "sleep",
    "passear": "routine_passear",
    "desenho": "play_desenho",
    "música": "play_musica",
    "celular": "want_celular",
    "ficar sozinho": "want_ficar_sozinho",
    "sim": "yes",
    "não": "no",
    "mais": "communication_mais",
    "acabou": "communication_acabou",
    "quero": "communication_quero",
    "não quero": "communication_nao_quero",
    "parar": "stop",
    "espera": "communication_espera",
    "vamos": "communication_vamos",
    "aqui": "communication_aqui",
    "lá": "communication_la",
    "de novo": "communication_de_novo",
    "gostei": "communication_gostei",
    "não gostei": "communication_nao_gostei",
    "obrigado": "communication_obrigado",
    "desculpa": "communication_desculpa",
    "feliz": "happy",
    "triste": "sad",
    "bravo": "feelings_bravo",
    "com medo": "feelings_com_medo",
    "ansioso": "feelings_ansioso",
    "cansado": "feelings_cansado",
    "com dor": "pain",
    "com fome": "hungry",
    "com sede": "thirsty",
    "com sono": "feelings_com_sono",
    "calor": "feelings_calor",
    "frio": "feelings_frio",
    "doente": "feelings_doente",
    "nervoso": "feelings_nervoso",
    "confuso": "feelings_confuso",
    "estou bem": "feelings_estou_bem",
    "não estou bem": "emergency_nao_estou_bem",
    "maçã": "food_maca",
    "banana": "food_banana",
    "pão": "food_pao",
    "arroz": "food_arroz",
    "feijão": "food_feijao",
    "macarrão": "food_macarrao",
    "carne": "food_carne",
    "frango": "food_frango",
    "ovo": "food_ovo",
    "biscoito": "food_biscoito",
    "bolo": "food_bolo",
    "chocolate": "food_chocolate",
    "sorvete": "food_sorvete",
    "pizza": "food_pizza",
    "batata frita": "food_batata_frita",
    "almoço": "routine_almoco",
    "jantar": "routine_jantar",
    "lanche": "food_lanche",
    "vitamina": "drink_vitamina",
    "iogurte": "drink_iogurte",
    "achocolatado": "drink_achocolatado",
    "chá": "drink_cha",
    "refrigerante": "drink_refrigerante",
    "acordar": "routine_acordar",
    "escovar dentes": "routine_escovar_dentes",
    "banho": "bath",
    "trocar roupa": "routine_trocar_roupa",
    "café da manhã": "routine_cafe_da_manha",
    "escola": "school",
    "tarefa": "routine_tarefa",
    "terapia": "routine_terapia",
    "remédio": "medicine",
    "descansar": "routine_descansar",
    "barulho alto": "loudNoise",
    "quero silêncio": "sensory_quero_silencio",
    "luz forte": "tooMuchLight",
    "está muito cheio": "sensory_esta_muito_cheio",
    "estou incomodado": "sensory_estou_incomodado",
    "quero descansar": "sensory_quero_descansar",
    "quero balançar": "sensory_quero_balancar",
    "quero apertar": "sensory_quero_apertar",
    "não toque em mim": "sensory_nao_toque_em_mim",
    "pode me abraçar": "sensory_pode_me_abracar",
    "preciso de pausa": "breakTime",
    "preciso de ajuda": "emergency_preciso_de_ajuda",
    "estou com dor": "emergency_pain",
    "quero ir embora": "emergency_quero_ir_embora",
    "estou perdido": "emergency_estou_perdido",
    "chamar mamãe": "emergency_chamar_mamae",
    "chamar papai": "emergency_chamar_papai",
    "chamar professor": "emergency_chamar_professor",
    "banheiro urgente": "emergency_banheiro_urgente",
    "machucou": "emergency_machucou",
    "pare agora": "emergency_pare_agora",
    "mamãe": "mother",
    "papai": "father",
    "vovó": "people_vovo",
    "vovô": "people_vovo_2",
    "irmão": "people_irmao",
    "irmã": "people_irma",
    "professor": "teacher",
    "terapeuta": "people_terapeuta",
    "médico": "people_medico",
    "amigo": "people_amigo",
    "bola": "play_bola",
    "carrinho": "play_carrinho",
    "boneca": "play_boneca",
    "blocos": "play_blocos",
    "quebra-cabeça": "play_quebra_cabeca",
    "desenhar": "play_desenhar",
    "massinha": "play_massinha",
    "livro": "play_livro",
    "tablet": "play_tablet",
    "parquinho": "play_parquinho",
};

function inferSystemKeyFromLabel(label) {
    const normalized = String(label || "").trim().toLowerCase();
    return SYSTEM_LABEL_TO_KEY[normalized] || null;
}


/**
 * Retorna o idioma atual usado para conteúdo textual.
 *
 * O TalkToYou separa idioma da interface e texto dos cards oficiais.
 * Esta função concentra essa escolha para manter comportamento consistente
 * em tela, áudio, impressão e alarmes.
 */
function getCurrentContentLanguage() {
    if (
        window.TalkToYouI18n &&
        typeof TalkToYouI18n.getCurrentLanguage === "function"
    ) {
        return TalkToYouI18n.getCurrentLanguage();
    }

    return "pt-BR";
}

/**
 * Retorna o texto oficial de um card, sem considerar personalizações.
 *
 * Uso principal:
 * - comparar se o usuário realmente personalizou o rótulo;
 * - permitir que um idioma volte ao padrão oficial;
 * - preservar a separação entre conteúdo oficial e conteúdo editado.
 */
function getOfficialDisplayLabel(item, language = null) {
    if (!item) {
        return "";
    }

    const selectedLanguage = language || getCurrentContentLanguage();
    const systemKey = item.systemKey || inferSystemKeyFromLabel(item.label);

    if (
        window.TalkToYouI18n &&
        systemKey &&
        TalkToYouI18n.isSystemCard(systemKey)
    ) {
        const translatedLabel = TalkToYouI18n.translateSystemCard(
            systemKey,
            selectedLanguage
        );

        if (translatedLabel) {
            return translatedLabel;
        }
    }

    return item.label || "";
}

/**
 * Retorna uma personalização textual por idioma, quando existir.
 *
 * Novo formato:
 * customLabels: {
 *   "pt-BR": "...",
 *   "en-US": "...",
 *   "es-ES": "..."
 * }
 *
 * Compatibilidade:
 * customLabel antigo continua sendo lido apenas quando ainda não existe
 * customLabels, evitando perda de personalizações feitas antes desta etapa.
 */
function getLocalizedCustomLabel(item, language = null) {
    if (!item) {
        return null;
    }

    const selectedLanguage = language || getCurrentContentLanguage();

    if (
        item.customLabels &&
        typeof item.customLabels === "object" &&
        item.customLabels[selectedLanguage]
    ) {
        return item.customLabels[selectedLanguage];
    }

    if (!item.customLabels && item.customLabel) {
        return item.customLabel;
    }

    return null;
}

function getDisplayLabel(item, language = null) {
    if (!item) {
        return "";
    }

    /*
        Personalização por idioma tem prioridade absoluta.
        Isso permite editar um card oficial em inglês sem alterar o texto em
        português ou espanhol.
    */
    const customLabel = getLocalizedCustomLabel(item, language);

    if (customLabel) {
        return customLabel;
    }

    return getOfficialDisplayLabel(item, language);
}


/**
 * Retorna a imagem visual que deve aparecer no card.
 *
 * Regras:
 * - se o usuário escolheu uma foto real, a foto é preservada;
 * - se o card oficial usa placeholder SVG automático, o placeholder é
 *   regenerado no idioma atual;
 * - se o card personalizado não tem imagem, gera placeholder simples com
 *   o texto original do usuário.
 *
 * Essa separação é importante para a pesquisa porque protege a
 * personalização terapêutica do usuário e, ao mesmo tempo, permite que
 * conteúdos oficiais acompanhem a internacionalização do sistema.
 */
function getCardVisualImage(item, translatedLabel = null) {
    /*
        Retorna a imagem visual que deve aparecer no card.

        Para fotos reais escolhidas pelo usuário:
        - mantém a imagem original.

        Para placeholders SVG do sistema:
        - regenera a imagem usando apenas emoji;
        - não coloca texto dentro da imagem;
        - permite que o rótulo abaixo do card seja traduzido separadamente.
    */
    if (!item) {
        return null;
    }

    const image = item.image || "";

    if (
        image &&
        !String(image).startsWith("data:image/svg+xml")
    ) {
        return image;
    }

    const displayLabel = translatedLabel || getDisplayLabel(item);
    const systemKey = item.systemKey || inferSystemKeyFromLabel(item.label);
    const emoji = getSystemCardEmoji(systemKey || item);

    if (typeof getPlaceholderImage === "function") {
        return getPlaceholderImage(displayLabel, systemKey, emoji);
    }

    return image || null;
}

/**
 * Identifica placeholders gerados pelo próprio sistema.
 *
 * Os placeholders oficiais são SVG em data URL. Fotos reais costumam ser
 * JPEG/PNG/WebP em base64. Esta checagem evita sobrescrever imagens reais
 * escolhidas pela família, terapeuta ou usuário.
 */
function isGeneratedPlaceholderImage(image) {
    if (!image || typeof image !== "string") {
        return false;
    }

    return image.startsWith("data:image/svg+xml");
}

/**
 * Retorna o emoji oficial de um card do sistema.
 *
 * Primeiro tenta usar item.emoji, salvo no banco nas versões novas.
 * Se não existir, tenta consultar a função global exposta pelo dexie-setup.js.
 */
function getSystemCardEmoji(itemOrKey) {
    /*
        Retorna o emoji associado a um card oficial.

        Correção importante:
        Esta função NÃO chama window.getSystemCardEmoji(), porque ela mesma
        pode estar exposta nesse nome. Fazer isso gera recursão infinita.

        A fonte real dos ícones vem de dexie-setup.js, exposta como:
        window.getSystemCardEmojiFromSeed(systemKey)
    */
    if (!itemOrKey) {
        return "💬";
    }

    let systemKey = null;

    if (typeof itemOrKey === "string") {
        systemKey = itemOrKey;
    } else {
        systemKey = itemOrKey.systemKey || inferSystemKeyFromLabel(itemOrKey.label);

        if (itemOrKey.emoji) {
            return itemOrKey.emoji;
        }
    }

    if (
        systemKey &&
        typeof window.getSystemCardEmojiFromSeed === "function"
    ) {
        return window.getSystemCardEmojiFromSeed(systemKey) || "💬";
    }

    return "💬";
}

/**
 * Retorna o idioma de fala atual.
 *
 * A voz sintetizada deve acompanhar o idioma selecionado no app.
 */
function getSpeechLanguage() {
    if (window.TalkToYouI18n) {
        const config = TalkToYouI18n.getLanguageConfig();

        if (config && config.voiceLang) {
            return config.voiceLang;
        }
    }

    return "pt-BR";
}

/**
 * Busca textos de mensagens.
 *
 * Primeiro tenta usar o i18n.js.
 * Se a chave não existir, usa um dicionário local de segurança.
 */
function getText(key) {
    if (window.TalkToYouI18n) {
        const translated = TalkToYouI18n.t(key);

        if (translated && translated !== key) {
            return translated;
        }
    }

    const fallbackTexts = {
        appName: "TalkToYou",
        title: "Comunicação Alternativa",
        startupError: "Erro ao iniciar o aplicativo.",
        defaultDeviceVoice: "Voz padrão do aparelho",
        voiceSelected: "Voz selecionada",
        emptyFolder: "Nenhum item cadastrado aqui.",
        welcome: "Início",
        add: "Incluir Novo",
        edit: "Editar",
        rootOption: "Início",
        photoOk: "✅ Foto selecionada",
        choosePhoto: "📷 Tirar ou Escolher Foto",
        audioSaved: "✅ Áudio gravado",
        tapToRecord: "Toque para gravar sua voz",
        nameRequired: "Informe o nome do item.",
        saveError: "Não foi possível salvar o item.",
        confirmDelete: "Tem certeza que deseja excluir este item?",
        backupExportError: "Erro ao exportar backup.",
        invalidFile: "Arquivo inválido.",
        confirmImport: "Importar este backup substituirá os dados atuais. Deseja continuar?",
        backupImported: "Backup importado com sucesso.",
        invalidOrCorruptedFile: "Arquivo inválido ou corrompido.",
        confirmClearData: "Tem certeza que deseja apagar todos os dados deste aparelho?\n\nRecomenda-se fazer backup antes de continuar.",
        clearDataSuccess: "Dados locais apagados com sucesso. O aplicativo será recarregado agora.",
        clearDataError: "Não foi possível limpar todos os dados automaticamente.",
        copyPixFallback: "Não foi possível copiar automaticamente. Chave PIX:",
        copied: "COPIADO!"
    };

    return fallbackTexts[key] || key;
}

/* ----------------------------------------------------------------------
   15. VERSIONAMENTO DA APLICAÇÃO

   Esta seção registra localmente a versão do aplicativo e da estrutura
   do banco utilizada no aparelho.

   A intenção não é controlar usuário, login ou nuvem.
   Tudo fica local.

   Valor acadêmico:
   Essa estratégia permite documentar a evolução do app e diferenciar
   mudanças técnicas de mudanças terapêuticas ou educacionais.
---------------------------------------------------------------------- */

/**
 * Registra no aparelho a versão atual do aplicativo.
 *
 * Em versões futuras, esta função poderá executar migrações específicas.
 * Exemplo:
 * - de 1.0.0 para 1.1.0: adicionar novos cards oficiais;
 * - de 1.x para 2.0.0: executar migração estrutural maior;
 * - mudança de DB_SCHEMA_VERSION: adaptar estrutura do banco.
 */
function registerApplicationVersion() {
    const previousAppVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    const previousDbSchemaVersion = localStorage.getItem(DB_SCHEMA_STORAGE_KEY);

    /*
        Primeiro uso ou atualização detectada.
    */
    if (previousAppVersion !== APP_RUNTIME_VERSION) {
        console.log(
            `[TalkToYou] Versão do app: ${previousAppVersion || "primeira instalação"} -> ${APP_RUNTIME_VERSION}`
        );

        localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_RUNTIME_VERSION);
    }

    /*
        Registra a versão da estrutura do banco local.

        Neste momento, o controle estrutural principal ainda está no Dexie,
        dentro de dexie-setup.js. Este registro ajuda na rastreabilidade.
    */
    if (previousDbSchemaVersion !== String(DB_SCHEMA_VERSION)) {
        console.log(
            `[TalkToYou] Versão do banco local: ${previousDbSchemaVersion || "primeira instalação"} -> ${DB_SCHEMA_VERSION}`
        );

        localStorage.setItem(DB_SCHEMA_STORAGE_KEY, String(DB_SCHEMA_VERSION));
    }
}

/**
 * Retorna true se a versão nova representa mudança maior.
 *
 * Exemplo:
 * 1.0.0 -> 2.0.0 = mudança maior
 * 1.0.0 -> 1.1.0 = mudança menor
 */
function isMajorVersionUpgrade(oldVersion, newVersion) {
    if (!oldVersion || !newVersion) {
        return false;
    }

    const oldMajor = String(oldVersion).split(".")[0];
    const newMajor = String(newVersion).split(".")[0];

    return oldMajor !== newMajor;
}

/**
 * Retorna true se a versão nova representa mudança intermediária.
 *
 * Exemplo:
 * 1.0.0 -> 1.1.0 = mudança minor
 */
function isMinorVersionUpgrade(oldVersion, newVersion) {
    if (!oldVersion || !newVersion) {
        return false;
    }

    const oldParts = String(oldVersion).split(".");
    const newParts = String(newVersion).split(".");

    return oldParts[0] === newParts[0] && oldParts[1] !== newParts[1];
}

/**
 * Retorna informações de versão para depuração.
 *
 * Pode ser chamado no console:
 * TalkToYouDebugVersion()
 */
function TalkToYouDebugVersion() {
    const info = {
        appVersion: APP_RUNTIME_VERSION,
        seedVersion: SEED_VERSION,
        dbSchemaVersion: DB_SCHEMA_VERSION,
        storedAppVersion: localStorage.getItem(APP_VERSION_STORAGE_KEY),
        storedSeedVersion: localStorage.getItem("talktoyou_seed_version"),
        storedDbSchemaVersion: localStorage.getItem(DB_SCHEMA_STORAGE_KEY)
    };

    console.table(info);

    return info;
}

/*
    Exposição opcional para depuração durante testes.

    Não interfere no funcionamento do app.
*/
window.TalkToYouDebugVersion = TalkToYouDebugVersion;






/*
    Exposição controlada para módulos auxiliares.
    Usada por audio-service.js e pdf-service.js para respeitar o idioma atual.
*/
window.getDisplayLabel = getDisplayLabel;
window.getCardVisualImage = getCardVisualImage;
window.getSpeechLanguage = getSpeechLanguage;
window.inferSystemKeyFromLabel = inferSystemKeyFromLabel;



/*
    Exposição controlada para módulos auxiliares.
    Essas funções são usadas por audio-service.js e pdf-service.js para que
    fala, alarme e impressão respeitem o idioma e as personalizações.
*/
window.getDisplayLabel = getDisplayLabel;
window.getOfficialDisplayLabel = getOfficialDisplayLabel;
window.getLocalizedCustomLabel = getLocalizedCustomLabel;
window.getCurrentContentLanguage = getCurrentContentLanguage;
