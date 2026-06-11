/**
 * @file app.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description controlador central da interface, navegação, CRUD, backup, internacionalização, módulo Aprender e eventos do PWA
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */

/* ----------------------------------------------------------------------
   1. ESTADO GLOBAL DA INTERFACE

   Estes estados são mantidos em memória enquanto o app está aberto.
   Os dados permanentes ficam no IndexedDB, configurado em dexie-setup.js.
---------------------------------------------------------------------- */
let currentParentId = 0;
let pathHistory = [];
/** @type {boolean} Usuário está em qualquer tela do módulo Aprender. */
let isLearningScreen = false;

/** @type {boolean} Evita cliques paralelos no tabuleiro Aprender durante validação/áudio. */
let learningBoardClickBusy = false;
let currentImageBase64 = null;
let synth = window.speechSynthesis;
let voices = [];
let isBusy = false;
let lastFocusedElement = null;

/** @type {HTMLElement|null} Modal com focus trap ativo. */
let activeModalForFocusTrap = null;

/** @type {((event: KeyboardEvent) => void)|null} Listener de Tab para focus trap. */
let modalFocusTrapListener = null;

/** @description Chave PIX institucional do projeto TalkToYou. @type {string} */
const TALKTOYOU_PIX_KEY = "260675cd-dd42-4c90-9154-9b684c386dcd";

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
const SELECTED_LEARNING_FOLDER_KEY = "selected_learning_folder";

/*
   Mantém compatibilidade com chamadas externas antigas.
   Mesmo removendo onclick do HTML, algumas funções continuam globais.
*/
window.processImage = processImage;

/* ----------------------------------------------------------------------
   2. INICIALIZAÇÃO DA APLICAÇÃO
---------------------------------------------------------------------- */

/**
 * @description Registra o listener que inicia o TalkToYou após o DOM estar pronto.
 * @returns {void}
 * @throws {Error} Não propaga; falhas são tratadas em initializeApplication.
 */
document.addEventListener("DOMContentLoaded", initializeApplication);

/**
 * @description Inicializa a aplicação quando o HTML já foi carregado (eventos, i18n, seed, prancha).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; exibe alert com messages.startupError e registra no console.
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
        /*
            Inicializa o módulo Aprender de forma isolada.
            O módulo recebe apenas funções seguras de leitura.
            Ele NÃO altera cards, NÃO altera banco e NÃO interfere
            na renderização principal do TalkToYou.
        */
        if (window.TalkToYouLearning) {
            TalkToYouLearning.init({
                getFolder: (folderId) => fetchFolderForLearning(folderId),
                getChildCards: (folderId) => fetchChildCardsForLearning(folderId),
                getDistractorCards: (folderId, excludeIds, limit) =>
                    fetchDistractorCardsForLearning(folderId, excludeIds, limit),
                playSequence: (items) => playLearningSequence(items),
                getLanguage: () => {
                    if (typeof getSpeechLanguage === "function") {
                        return getSpeechLanguage();
                    }

                    return currentEditLanguage || "pt-BR";
                },
                getText: (key) => getText(key)
            });
        }

        loadGridPreference();
        loadDebouncePreference();

        await loadBoard(0);
    } catch (error) {
        console.error("Erro crítico na inicialização do TalkToYou:", error);

        alert(
            getText("messages.startupError") + "\n\n" +
            (error && error.message ? error.message : error)
        );
    } finally {
        hideSplashScreen(1000);
    }
}

/**
 * @description Oculta a tela de abertura (splash) com fade-out após atraso configurável.
 * @param {number} [delayMs=1000] - Milissegundos antes de iniciar o fade.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
 * @description Integra o botão voltar do Android/navegador com modais, menu e navegação da prancha.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
 * @description Fecha menu lateral ou modal aberto antes da navegação (botão voltar do sistema).
 * @returns {boolean} true se fechou menu ou modal e a navegação deve ser adiada.
 * @throws {Error} Não propaga exceções.
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

    if (getOpenModalElement()) {
        closeModals();
        return true;
    }

    return false;
}

/**
 * @description Exibe ou oculta a opção de composição de frase conforme o tipo pasta/card no formulário.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
 * @description Aplica textos da interface via TalkToYouI18n ou fallback getText.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
        uiTitle.innerText = getText("app.title");
    }

    if (appWindowTitle) {
        appWindowTitle.innerText = getText("app.windowTitle");
    }
}

/* ----------------------------------------------------------------------
   3. EVENTOS DA INTERFACE

   O HTML revisado usa IDs nos elementos.
   Os eventos são vinculados aqui, evitando onclick inline.
---------------------------------------------------------------------- */

/**
 * @description Vincula cliques, inputs e atalhos da interface principal e do módulo Aprender.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function bindInterfaceEvents() {
    bindClick("btn-stop-alarm", stopAlarm);
    bindClick("header-back", navigateBack);
    bindClick("btn-open-menu", toggleMenu);
    bindClick("menu-overlay", toggleMenu);

    bindClick("btn-add-item", () => openModal("add"));
    bindClick("btn-manage-items", () => openModal("manage"));

    bindClick("btn-export-backup", exportarPrancha);
    bindClick("btn-export-pdf", exportToPDF);

    const importBackupInput = document.getElementById("input-import-backup");
    if (importBackupInput) {
        importBackupInput.addEventListener("change", importarPrancha);
    }

    const itemImageInput = document.getElementById("item-image");
    if (itemImageInput) {
        itemImageInput.addEventListener("change", function() {
            processImage(this);
        });
    }

    bindClick("btn-open-donation-menu", openDonationModal);
    bindClick("btn-copy-pix-menu", (event) => copyPix(event));
    bindClick("btn-copy-pix-modal", (event) => copyPix(event));

    configureGlobalKeyboardAccessibility();

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

    /*
    ============================================================
    Módulo Aprender
    
    Toggle responsável por ativar/desativar o módulo de
    aprendizagem comunicacional assistida.
    ============================================================
    */
    const learningToggle = document.getElementById("learning-toggle");
    
    if (learningToggle && window.TalkToYouLearning) {
        learningToggle.checked = TalkToYouLearning.isEnabled();
    
        learningToggle.addEventListener("change", async () => {
            TalkToYouLearning.setEnabled(learningToggle.checked);
            await loadBoard(currentParentId);
        });
    }
}

/**
 * @description Vincula listener de clique a um elemento por ID (ignora se ausente).
 * @param {string} elementId - ID do elemento no DOM.
 * @param {function(Event): void|Promise<void>} callback - Handler do clique.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function bindClick(elementId, callback) {
    const element = document.getElementById(elementId);

    if (!element || typeof callback !== "function") return;

    element.addEventListener("click", callback);
}

/* ----------------------------------------------------------------------
   4. VOZES, GRID E PROTEÇÃO CONTRA CLIQUES REPETIDOS
---------------------------------------------------------------------- */

/**
 * @description Preenche #voice-select com vozes TTS filtradas pelo idioma de fala atual.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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
    defaultOption.textContent = getText("messages.defaultDeviceVoice");
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

/**
 * @description Persiste a voz TTS escolhida em localStorage e confirma por áudio.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function saveVoicePreference() {
    const select = document.getElementById("voice-select");

    if (!select) return;

    localStorage.setItem("talktoyou_voice", select.value || "");

    if (typeof speakText === "function") {
        speakText(getText("messages.voiceSelected"), () => {});
    }
}

/**
 * @description Aplica colunas da grade da prancha e persiste preferência em localStorage.
 * @param {string} value - auto, 2, 3, 4 ou 5 (colunas fixas).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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

/**
 * @description Restaura preferência de tamanho dos cards do localStorage ao iniciar.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function loadGridPreference() {
    const preference = localStorage.getItem("talktoyou_grid_pref") || "auto";
    const select = document.getElementById("grid-config");

    if (select) {
        select.value = preference;
    }

    updateGridLayout(preference);
}

/**
 * @description Salva a preferência de proteção contra toques repetidos (debounce) no localStorage.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function toggleDebounce() {
    const checkbox = document.getElementById("debounce-config");

    if (!checkbox) return;

    localStorage.setItem("talktoyou_debounce", String(checkbox.checked));
}

/**
 * @description Restaura checkbox de debounce do localStorage ao iniciar.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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

/**
 * @description Renderiza a grade da prancha para uma pasta (parentId) e atualiza navegação.
 * @param {number} [parentId=0] - ID da pasta pai (0 = raiz).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; erros de Dexie podem aparecer no console.
 */
async function loadBoard(parentId = 0) {
    currentParentId = parentId;

    isLearningScreen = false;

    if (window.TalkToYouLearning) {
        TalkToYouLearning.enterConfigPhase();
    }

    hideLearningFolderBar();

    const grid = document.getElementById("board-grid");
    const backBtn = document.getElementById("header-back");

    if (!grid || !backBtn) return;

    grid.innerHTML = "";

    backBtn.style.opacity = parentId === 0 ? "0" : "1";
    backBtn.style.pointerEvents = parentId === 0 ? "none" : "auto";

    await updatePathText(parentId);

    const items = await db.items.where("parentId").equals(parentId).toArray();

    /*
    ============================================================
    Card virtual do módulo Aprender
    
    Este card NÃO é salvo no banco.
    Ele aparece somente na tela inicial e somente se o módulo
    estiver ativado nas configurações.
    ============================================================
    */
    if (
        parentId === 0 &&
        window.TalkToYouLearning &&
        TalkToYouLearning.isEnabled()
    ) {
        items.push(TalkToYouLearning.getLearningCard());
    }


    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                ${getText("board.empty")}
            </div>
        `;
        return;
    }

    items.forEach((item) => {
        grid.appendChild(createCardElement(item));
    });
}

/**
 * @description Atualiza o texto de localização (#path-text) da pasta atual.
 * @param {number} parentId - ID da pasta exibida (0 = Início).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function updatePathText(parentId) {
    const pathTextElement = document.getElementById("path-text");

    if (!pathTextElement) return;

    if (parentId === 0) {
        pathTextElement.innerText = getText("board.home");
        return;
    }

    const parent = await db.items.get(parentId);
    pathTextElement.innerText = parent ? getDisplayLabel(parent) : getText("board.home");
}

/**
 * @description Cria o elemento visual de um card/pasta (mesma lógica da prancha principal).
 * @param {object} item - Item do IndexedDB ou card virtual.
 * @param {{ onClick?: function(): void|Promise<void> }} [interaction] - Handler opcional no clique (ex.: módulo Aprender).
 * @returns {HTMLDivElement} Elemento de card pronto para inserir na grade.
 * @throws {Error} Não propaga exceções.
 */
function createCardElement(item, interaction = {}) {
    const displayLabel = getDisplayLabel(item);
    const card = document.createElement("div");

    card.className = `card ${item.type === "folder" ? "is-folder" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", displayLabel);

    const activateCard = typeof interaction.onClick === "function"
        ? interaction.onClick
        : () => handleCardClick(item);

    card.addEventListener("click", activateCard);

    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateCard();
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

/**
 * @description Trata clique em card/pasta: Aprender, pastas, sequência CAA e debounce opcional.
 * @param {object} item - Registro Dexie ou card virtual do módulo Aprender.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; erros são registrados no console.
 */
async function handleCardClick(item) {

    /*
    ============================================================
    Módulo Aprender
    
    Intercepta os cards virtuais do módulo antes da lógica
    normal dos cards reais.
    ============================================================
    */
    if (item.type === "learning-folder") {
        await renderLearningHome();
        return;
    }
    
    if (item.id === "learning-start") {
        await handleLearningStartGame();
        return;
    }
    
    if (item.id === "learning-back") {
        await loadBoard(0);
        return;
    }


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

/**
 * @description Volta uma pasta na hierarquia ou sai do módulo Aprender para a raiz.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function navigateBack() {
    if (isLearningScreen) {
        isLearningScreen = false;

        if (window.TalkToYouLearning) {
            TalkToYouLearning.enterConfigPhase();
        }

        hideLearningFolderBar();
        await loadBoard(0);
        return;
    }

    const previousId = pathHistory.length > 0 ? pathHistory.pop() : 0;
    await loadBoard(previousId);
}

/* ----------------------------------------------------------------------
   7. MENU E MODAIS
---------------------------------------------------------------------- */

/**
 * @description Abre ou fecha o menu lateral (#side-menu) e o overlay.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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

/**
 * @description Retorna o primeiro modal visível na tela.
 * @returns {HTMLElement|null} Modal aberto ou null.
 * @throws {Error} Não propaga exceções.
 */
function getOpenModalElement() {
    return (
        Array.from(document.querySelectorAll(".modal")).find(
            (modal) => modal.style.display && modal.style.display !== "none"
        ) || null
    );
}

/**
 * @description Lista elementos focáveis dentro de um container (modal).
 * @param {HTMLElement} container - Modal ou painel.
 * @returns {HTMLElement[]} Elementos focáveis visíveis.
 * @throws {Error} Não propaga exceções.
 */
function getFocusableElementsWithin(container) {
    if (!container) {
        return [];
    }

    const selector = [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex=\"-1\"])"
    ].join(", ");

    return Array.from(container.querySelectorAll(selector)).filter((element) => {
        return element.offsetParent !== null || element === document.activeElement;
    });
}

/**
 * @description Mantém o foco do Tab circulando apenas dentro do modal aberto.
 * @param {KeyboardEvent} event - Evento keydown.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function handleModalFocusTrapKeydown(event) {
    if (event.key !== "Tab" || !activeModalForFocusTrap) {
        return;
    }

    const focusable = getFocusableElementsWithin(activeModalForFocusTrap);

    if (focusable.length === 0) {
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

/**
 * @description Ativa focus trap no modal exibido.
 * @param {HTMLElement} modal - Elemento .modal visível.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function attachModalFocusTrap(modal) {
    detachModalFocusTrap();
    activeModalForFocusTrap = modal;
    modalFocusTrapListener = handleModalFocusTrapKeydown;
    document.addEventListener("keydown", modalFocusTrapListener);
}

/**
 * @description Remove focus trap ao fechar modais.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function detachModalFocusTrap() {
    if (modalFocusTrapListener) {
        document.removeEventListener("keydown", modalFocusTrapListener);
        modalFocusTrapListener = null;
    }

    activeModalForFocusTrap = null;
}

/**
 * @description Fecha modal aberto ou menu lateral ao pressionar Escape.
 * @param {KeyboardEvent} event - Evento keydown global.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function handleGlobalEscapeKey(event) {
    if (event.key !== "Escape") {
        return;
    }

    const menu = document.getElementById("side-menu");

    if (menu && menu.classList.contains("open")) {
        toggleMenu();
        event.preventDefault();
        return;
    }

    if (getOpenModalElement()) {
        closeModals();
        event.preventDefault();
    }
}

/**
 * @description Registra atalhos globais de teclado (Escape e focus trap via Tab).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function configureGlobalKeyboardAccessibility() {
    document.addEventListener("keydown", handleGlobalEscapeKey);
}

/**
 * @description Fecha todos os modais e restaura o foco anterior.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function closeModals() {
    detachModalFocusTrap();

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.display = "none";
    });

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        setTimeout(() => lastFocusedElement.focus(), 50);
    }
}

/**
 * @description Abre modais do app (add, edit, manage, clear-data) com foco acessível.
 * @param {string} mode - add | edit | manage | clear-data.
 * @param {number|null} [itemId=null] - ID do item em modo edit.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
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

        setText("modal-title", "modal.add");
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

/**
 * @description Exibe modal, aplica focus trap e opcionalmente foca um controle inicial.
 * @param {string} modalId - ID do elemento .modal.
 * @param {string|null} [focusElementId=null] - ID do elemento a receber foco.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function showModal(modalId, focusElementId = null) {
    const modal = document.getElementById(modalId);

    if (!modal) {
        return;
    }

    modal.style.display = "flex";
    attachModalFocusTrap(modal);

    const focusTargetId = focusElementId || modal.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    )?.id;

    if (focusTargetId) {
        setTimeout(() => {
            document.getElementById(focusTargetId)?.focus();
        }, 100);
    }
}

/**
 * @description Abre o modal de doação (PIX) a partir do menu lateral.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function openDonationModal() {
    lastFocusedElement = document.activeElement;

    const menu = document.getElementById("side-menu");

    if (menu && menu.classList.contains("open")) {
        toggleMenu();
    }

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.display = "none";
    });

    detachModalFocusTrap();
    showModal("donation-modal", "btn-copy-pix-modal");
}

/**
 * @description Preenche #item-parent com pastas do IndexedDB para o formulário CRUD.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function prepareParentSelect() {
    const parentSelect = document.getElementById("item-parent");

    if (!parentSelect) return;

    parentSelect.innerHTML = `<option value="0">${getText("board.home")}</option>`;

    const folders = await db.items.where("type").equals("folder").toArray();

    folders.forEach((folder) => {
        const option = document.createElement("option");

        option.value = folder.id;
        option.textContent = `📁 ${getDisplayLabel(folder).toUpperCase()}`;

        parentSelect.appendChild(option);
    });
}

/**
 * @description Lista todos os itens em #manage-list ordenados por rótulo exibido.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
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
        button.textContent = getText("messages.edit");
        button.addEventListener("click", () => openModal("edit", item.id));

        row.appendChild(label);
        row.appendChild(button);
        list.appendChild(row);
    });

    showModal("manage-modal");
}

/**
 * @description Carrega item no formulário de edição e exibe #form-modal.
 * @param {number} itemId - ID do registro em db.items.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
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

    setTextContent("photo-status", item.image ? getText("modal.photoOk") : getText("modal.photo"));
    setTextContent("record-status", item.audioBlob ? getText("modal.audioSaved") : getText("modal.record"));

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

/**
 * @description Verifica se mover/criar pasta com parentId geraria ciclo na hierarquia.
 * @description O novo pai não pode ser a própria pasta nem um de seus descendentes.
 * @param {number|string|null|undefined} folderId - ID da pasta editada (ausente ao criar).
 * @param {number|string} newParentId - parentId escolhido no formulário.
 * @returns {Promise<boolean>} true se a operação criaria ciclo.
 * @throws {Error} Não propaga exceções.
 */
async function wouldCreateCycle(folderId, newParentId) {
    const numericNewParent = parseInt(newParentId, 10);

    if (Number.isNaN(numericNewParent) || numericNewParent === 0) {
        return false;
    }

    const numericFolderId = folderId != null && folderId !== ""
        ? parseInt(folderId, 10)
        : NaN;

    if (Number.isNaN(numericFolderId)) {
        return false;
    }

    if (numericNewParent === numericFolderId) {
        return true;
    }

    return await isFolderDescendant(numericNewParent, numericFolderId);
}

/**
 * @description Percorre ancestrais de candidateId até a raiz (detecção recursiva de ciclo).
 * @param {number} candidateId - ID a subir na árvore (ex.: novo parentId).
 * @param {number} ancestorId - Pasta que não pode ser ancestral de candidateId.
 * @param {Set<number>} [visited] - IDs já visitados (proteção contra dados corrompidos).
 * @returns {Promise<boolean>} true se ancestorId for ancestral de candidateId.
 * @throws {Error} Não propaga exceções.
 */
async function isFolderDescendant(candidateId, ancestorId, visited = new Set()) {
    if (!candidateId || candidateId === 0) {
        return false;
    }

    if (visited.has(candidateId)) {
        return true;
    }

    visited.add(candidateId);

    if (candidateId === ancestorId) {
        return true;
    }

    const item = await db.items.get(candidateId);

    if (!item) {
        return false;
    }

    const parentId = parseInt(item.parentId, 10) || 0;

    if (parentId === 0) {
        return false;
    }

    return await isFolderDescendant(parentId, ancestorId, visited);
}

/**
 * @description Salva ou atualiza item do formulário CRUD (customLabels por idioma em cards oficiais).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; exibe alert com messages.saveError em falha de Dexie.
 */
async function saveCRUDItem() {
    const labelInput = document.getElementById("item-label");
    const labelValue = labelInput ? labelInput.value.trim() : "";

    if (!labelValue) {
        alert(getText("messages.nameRequired"));
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

    if (itemType === "folder") {
        const cycleFolderId = id ? parseInt(id, 10) : null;

        if (await wouldCreateCycle(cycleFolderId, data.parentId)) {
            alert(getText("messages.folderCycle"));
            return;
        }
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
        alert(getText("messages.saveError"));
    }
}

/**
 * @description Exclui item em edição e descendentes após confirmação do usuário.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function deleteItem() {
    const id = parseInt(getValue("edit-id"), 10);

    if (!id) return;

    if (!confirm(getText("messages.confirmDelete"))) return;

    await deleteItemAndChildren(id);

    closeModals();
    await loadBoard(0);
}

/**
 * @description Remove recursivamente um item e todos os filhos no IndexedDB.
 * @param {number} id - ID do item raiz da exclusão.
 * @returns {Promise<void>}
 * @throws {Error} Pode propagar falhas de transação Dexie.
 */
async function deleteItemAndChildren(id) {
    const children = await db.items.where("parentId").equals(id).toArray();

    for (const child of children) {
        await deleteItemAndChildren(child.id);
    }

    await db.items.delete(id);
}

/**
 * @description Limpa campos do formulário de card/pasta para inclusão ou nova edição.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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

    setTextContent("photo-status", getText("modal.photo"));
    setTextContent("record-status", getText("modal.record"));

    const composeCheckbox = document.getElementById("item-compose-mode");

    if (composeCheckbox) {
        composeCheckbox.checked = false;
    }

    setDisplay("compose-mode-group", "none");
}

/* ----------------------------------------------------------------------
   9. PROCESSAMENTO DE IMAGEM
---------------------------------------------------------------------- */

/**
 * @description Redimensiona foto selecionada para 300×300 JPEG e atualiza currentImageBase64.
 * @param {HTMLInputElement} input - Input file com a imagem escolhida.
 * @returns {void}
 * @throws {Error} Não propaga exceções de FileReader/canvas.
 */
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

            setTextContent("photo-status", getText("modal.photoOk"));
        };

        image.src = event.target.result;
    };

    reader.readAsDataURL(input.files[0]);
}

/* ----------------------------------------------------------------------
   10. BACKUP COM SUPORTE A ÁUDIO
---------------------------------------------------------------------- */

/** @description Versão do formato JSON de exportação/importação. @type {number} */
const BACKUP_FORMAT_VERSION = 3;

/** @description Tamanho máximo do arquivo de backup em bytes (~25 MB). @type {number} */
const BACKUP_MAX_FILE_BYTES = 25 * 1024 * 1024;

/** @description Tamanho máximo do texto JSON após leitura (~20 MB). @type {number} */
const BACKUP_MAX_JSON_CHARS = 20 * 1024 * 1024;

/** @description Quantidade máxima de itens aceitos num backup. @type {number} */
const BACKUP_MAX_ITEMS = 2000;

/** @description Tamanho máximo por campo image/base64 em um item (~4 MB). @type {number} */
const BACKUP_MAX_ITEM_IMAGE_CHARS = 4 * 1024 * 1024;

/**
 * @description Converte Blob de áudio em data URL base64 para exportação de backup.
 * @param {Blob|null} blob - Áudio gravado ou null.
 * @returns {Promise<string|null>} Data URL ou null se blob ausente.
 * @throws {Error} Rejeita a Promise em falha do FileReader.
 */
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

/**
 * @description Restaura Blob de áudio a partir de string base64 do backup.
 * @param {string} base64 - Data URL ou base64 puro.
 * @param {string} [fallbackType="audio/webm"] - MIME se não estiver no prefixo data:.
 * @returns {Blob|null} Blob decodificado ou null se entrada inválida.
 * @throws {Error} Não propaga; retorna null em entrada inválida.
 */
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

/**
 * @description Clona itens do banco convertendo audioBlob para campos serializáveis no JSON.
 * @param {Array<object>} items - Registros de db.items.
 * @returns {Promise<Array<object>>} Itens prontos para JSON.stringify.
 * @throws {Error} Rejeita se blobToBase64 falhar.
 */
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

/**
 * @description Reconstrói audioBlob a partir de campos base64 após parse do backup.
 * @param {Array<object>} items - Itens do arquivo importado.
 * @returns {Array<object>} Itens prontos para bulkAdd no Dexie.
 * @throws {Error} Não propaga exceções.
 */
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

/**
 * @description Valida um item individual do backup (padrão v3 / legado).
 * @param {*} item - Entrada do array items.
 * @param {number} index - Índice para mensagens de erro.
 * @returns {{ ok: boolean, error?: string }} Resultado da validação do item.
 * @throws {Error} Não propaga exceções.
 */
function validateBackupItem(item, index) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return { ok: false, error: `item[${index}]` };
    }

    if (typeof item.label !== "string" || !item.label.trim()) {
        return { ok: false, error: `item[${index}].label` };
    }

    if (item.type !== "folder" && item.type !== "card") {
        return { ok: false, error: `item[${index}].type` };
    }

    const parentId = item.parentId;

    if (
        parentId !== 0 &&
        parentId !== "0" &&
        parentId != null &&
        Number.isNaN(parseInt(parentId, 10))
    ) {
        return { ok: false, error: `item[${index}].parentId` };
    }

    if (item.image != null && typeof item.image === "string") {
        if (item.image.length > BACKUP_MAX_ITEM_IMAGE_CHARS) {
            return { ok: false, error: `item[${index}].image` };
        }
    }

    if (item.audioBlobBase64 != null && typeof item.audioBlobBase64 === "string") {
        if (item.audioBlobBase64.length > BACKUP_MAX_ITEM_IMAGE_CHARS) {
            return { ok: false, error: `item[${index}].audioBlobBase64` };
        }
    }

    return { ok: true };
}

/**
 * @description Valida estrutura do backup TalkToYou v3 (ou array legado) antes de apagar o banco.
 * @param {*} parsed - Conteúdo já parseado do JSON.
 * @returns {{ ok: boolean, items?: Array<object>, error?: string }} Estrutura validada ou erro.
 * @throws {Error} Não propaga exceções.
 */
function validateBackupStructure(parsed) {
    if (parsed == null) {
        return { ok: false, error: "empty" };
    }

    let items = null;
    let isV3Envelope = false;

    if (Array.isArray(parsed)) {
        items = parsed;
    } else if (typeof parsed === "object") {
        const isTalkToYou = parsed.app === "TalkToYou";
        const version = parsed.version;

        if (isTalkToYou && version === BACKUP_FORMAT_VERSION && Array.isArray(parsed.items)) {
            items = parsed.items;
            isV3Envelope = true;
        } else if (Array.isArray(parsed.items) && !isTalkToYou) {
            items = parsed.items;
        } else {
            return { ok: false, error: "envelope" };
        }
    } else {
        return { ok: false, error: "type" };
    }

    if (!Array.isArray(items)) {
        return { ok: false, error: "items" };
    }

    if (items.length === 0 || items.length > BACKUP_MAX_ITEMS) {
        return { ok: false, error: "count" };
    }

    for (let i = 0; i < items.length; i++) {
        const itemCheck = validateBackupItem(items[i], i);

        if (!itemCheck.ok) {
            return { ok: false, error: itemCheck.error || "item" };
        }
    }

    if (isV3Envelope && typeof parsed.exportedAt !== "string") {
        return { ok: false, error: "exportedAt" };
    }

    return { ok: true, items };
}

/**
 * @description Restaura snapshot anterior do IndexedDB após falha na importação.
 * @param {Array<object>} snapshot - Cópia de db.items.toArray() antes do clear.
 * @returns {Promise<boolean>} true se o rollback concluiu.
 * @throws {Error} Não propaga; retorna false e registra no console em falha.
 */
async function rollbackBackupImport(snapshot) {
    if (!Array.isArray(snapshot)) {
        return false;
    }

    try {
        await db.transaction("rw", db.items, async () => {
            await db.items.clear();

            if (snapshot.length > 0) {
                await db.items.bulkAdd(snapshot);
            }
        });

        return true;
    } catch (rollbackError) {
        console.error("Rollback da importação falhou:", rollbackError);
        return false;
    }
}

/**
 * @description Exporta prancha completa como JSON (envelope TalkToYou v3) e dispara download.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; exibe alert com messages.backupExportError.
 */
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
            seedVersion: APP_SEED_VERSION,
            dbSchemaVersion: APP_DB_SCHEMA_VERSION,
        
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
        alert(getText("messages.backupExportError"));
    }
}

/**
 * @description Importa backup JSON com validação v3, limites de tamanho e rollback lógico.
 * @param {Event} event - change do input #input-import-backup.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; tenta rollback e exibe alertas ao usuário.
 */
async function importarPrancha(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (file.size > BACKUP_MAX_FILE_BYTES) {
        alert(getText("messages.backupFileTooLarge"));
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = async function(readerEvent) {
        let dbSnapshot = null;

        try {
            const rawText = readerEvent.target.result;

            if (typeof rawText !== "string" || rawText.length > BACKUP_MAX_JSON_CHARS) {
                alert(getText("messages.backupFileTooLarge"));
                return;
            }

            let parsed;

            try {
                parsed = JSON.parse(rawText);
            } catch (parseError) {
                console.error("JSON de backup inválido:", parseError);
                alert(getText("messages.invalidOrCorruptedFile"));
                return;
            }

            const validation = validateBackupStructure(parsed);

            if (!validation.ok || !validation.items) {
                alert(getText("messages.backupInvalidFormat"));
                return;
            }

            const confirmImport = confirm(getText("messages.confirmImport"));

            if (!confirmImport) {
                return;
            }

            const restoredItems = restaurarItensDoBackup(validation.items);

            dbSnapshot = await db.items.toArray();

            await db.transaction("rw", db.items, async () => {
                await db.items.clear();
                await db.items.bulkAdd(restoredItems);
            });

            alert(getText("messages.backupImported"));
            location.reload();
        } catch (error) {
            console.error("Erro ao importar backup:", error);

            if (dbSnapshot) {
                const rolledBack = await rollbackBackupImport(dbSnapshot);

                if (rolledBack) {
                    alert(getText("messages.backupImportFailedRollback"));
                } else {
                    alert(getText("messages.backupImportFailedNoRollback"));
                }
            } else {
                alert(getText("messages.invalidOrCorruptedFile"));
            }
        } finally {
            event.target.value = "";
        }
    };

    reader.onerror = function() {
        alert(getText("messages.invalidOrCorruptedFile"));
        event.target.value = "";
    };

    reader.readAsText(file);
}

/* ----------------------------------------------------------------------
   11. LIMPEZA DE DADOS LOCAIS
---------------------------------------------------------------------- */

/**
 * @description Apaga IndexedDB, localStorage e sessionStorage após confirmação.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; exibe alert com messages.clearDataError.
 */
async function clearApplicationData() {
    const confirmed = confirm(getText("messages.confirmClearData"));

    if (!confirmed) return;

    try {
        if (typeof db !== "undefined" && db.delete) {
            await db.delete();
        }

        localStorage.clear();
        sessionStorage.clear();

        alert(getText("messages.clearDataSuccess"));
        location.reload();
    } catch (error) {
        console.error("Erro ao limpar dados locais:", error);
        alert(getText("messages.clearDataError"));
    }
}

/* ----------------------------------------------------------------------
   12. PIX / DOAÇÃO
---------------------------------------------------------------------- */

/**
 * @description Copia texto para a área de transferência (Clipboard API ou fallback).
 * @param {string} text - Texto a copiar.
 * @returns {Promise<void>}
 * @throws {Error} Lança clipboard_unavailable se execCommand falhar sem Clipboard API.
 */
async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");

    document.body.removeChild(textarea);

    if (!copied) {
        throw new Error("clipboard_unavailable");
    }
}

/**
 * @description Copia a chave PIX e exibe feedback visual no botão acionado.
 * @param {Event} [event] - Clique (evita propagação no menu de doação).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga; exibe alert com chave PIX em fallback.
 */
async function copyPix(event) {
    if (event && typeof event.stopPropagation === "function") {
        event.stopPropagation();
    }

    const triggerButton = event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : null;

    try {
        await copyTextToClipboard(TALKTOYOU_PIX_KEY);
        showPixCopyFeedback(triggerButton);
    } catch (error) {
        console.error("Erro ao copiar chave PIX:", error);
        alert(`${getText("messages.copyPixFallback")} ${TALKTOYOU_PIX_KEY}`);
    }
}

/**
 * @description Altera temporariamente o rótulo do(s) botão(ões) PIX para "Copiado!".
 * @param {HTMLElement|null} [primaryButton=null] - Botão clicado (prioridade no feedback).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function showPixCopyFeedback(primaryButton = null) {
    const buttons = primaryButton
        ? [primaryButton]
        : [
            document.getElementById("btn-copy-pix-menu"),
            document.getElementById("btn-copy-pix-modal")
        ].filter(Boolean);

    const copiedLabel = getText("messages.copied");

    buttons.forEach((button) => {
        const labelSpan = button.querySelector("span[data-i18n], span");
        const restoreTarget = labelSpan || button;
        const previousText = restoreTarget.textContent;

        restoreTarget.textContent = copiedLabel;
        button.setAttribute("aria-live", "polite");

        setTimeout(() => {
            restoreTarget.textContent = previousText;
            button.removeAttribute("aria-live");
        }, 2000);
    });
}

/* ----------------------------------------------------------------------
   13. PEQUENOS UTILITÁRIOS DE DOM
---------------------------------------------------------------------- */

/**
 * @description Lê o valor de um input/select pelo ID.
 * @param {string} elementId - ID do elemento.
 * @returns {string|undefined} Valor atual ou undefined se ausente.
 * @throws {Error} Não propaga exceções.
 */
function getValue(elementId) {
    return document.getElementById(elementId)?.value;
}

/**
 * @description Define o valor de um input/select pelo ID.
 * @param {string} elementId - ID do elemento.
 * @param {string|number} value - Valor a atribuir.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function setValue(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.value = value;
    }
}

/**
 * @description Define innerText de um elemento usando chave i18n (getText).
 * @param {string} elementId - ID do elemento.
 * @param {string} textKey - Chave de tradução (ex.: modal.save).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function setText(elementId, textKey) {
    setTextContent(elementId, getText(textKey));
}

/**
 * @description Define innerText de um elemento pelo ID.
 * @param {string} elementId - ID do elemento.
 * @param {string} value - Texto literal.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function setTextContent(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.innerText = value;
    }
}

/**
 * @description Define style.display de um elemento pelo ID.
 * @param {string} elementId - ID do elemento.
 * @param {string} value - Valor CSS display (ex.: none, block, flex).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
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
 * @description Inicializa seletor de idioma, traduções data-i18n e evento talktoyou:language-changed.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
 * @description Trata a troca manual de idioma no #language-select.
 * @param {Event} event - Evento change do select.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function handleLanguageSelectChange(event) {
    if (!window.TalkToYouI18n) return;

    TalkToYouI18n.changeLanguage(event.target.value);
}

/**
 * @description Reage ao evento talktoyou:language-changed (UI, vozes, prancha ou Aprender).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
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
    if (isLearningScreen) {
        await renderLearningHome();
    } else {
        await loadBoard(currentParentId);
    }
}

/**
 * @description Atualiza href de ajuda e privacidade conforme idioma (TalkToYouI18n).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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

/**
 * @description Infere systemKey de cards antigos sem metadado, pelo rótulo em português.
 * @param {string} label - Texto do card (label salvo).
 * @returns {string|null} systemKey reconhecido ou null.
 * @throws {Error} Não propaga exceções.
 */
function inferSystemKeyFromLabel(label) {
    const normalized = String(label || "").trim().toLowerCase();
    return SYSTEM_LABEL_TO_KEY[normalized] || null;
}


/**
 * @description Retorna idioma atual para rótulos de cards (via TalkToYouI18n ou pt-BR).
 * @returns {string} Código BCP 47 (pt-BR, en-US, es-ES).
 * @throws {Error} Não propaga exceções.
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
 * @description Retorna rótulo oficial traduzido (sem customLabels) para cards do sistema.
 * @param {object} item - Registro Dexie com systemKey ou label legado.
 * @param {string|null} [language=null] - Idioma; usa getCurrentContentLanguage se omitido.
 * @returns {string} Texto oficial ou item.label.
 * @throws {Error} Não propaga exceções.
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
 * @description Retorna personalização textual por idioma (customLabels ou customLabel legado).
 * @param {object} item - Registro Dexie.
 * @param {string|null} [language=null] - Idioma alvo.
 * @returns {string|null} Rótulo personalizado ou null.
 * @throws {Error} Não propaga exceções.
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

/**
 * @description Rótulo exibido no card: customLabels têm prioridade; senão tradução oficial ou label.
 * @param {object} item - Registro Dexie ou card virtual.
 * @param {string|null} [language=null] - Idioma de exibição.
 * @returns {string} Texto para UI, TTS e PDF.
 * @throws {Error} Não propaga exceções.
 */
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
 * @description URL da imagem do card (foto do usuário ou placeholder SVG com emoji).
 * @param {object} item - Registro Dexie.
 * @param {string|null} [translatedLabel=null] - Rótulo para placeholder; usa getDisplayLabel se omitido.
 * @returns {string|null} Data URL ou URL da imagem.
 * @throws {Error} Não propaga exceções.
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
 * @description Identifica placeholders SVG gerados pelo sistema (não fotos JPEG/PNG).
 * @param {string} image - Valor do campo image.
 * @returns {boolean} true se for data:image/svg+xml.
 * @throws {Error} Não propaga exceções.
 */
function isGeneratedPlaceholderImage(image) {
    if (!image || typeof image !== "string") {
        return false;
    }

    return image.startsWith("data:image/svg+xml");
}

/**
 * @description Retorna emoji oficial de card do sistema (banco ou getSystemCardEmojiFromSeed).
 * @param {object|string} itemOrKey - Item Dexie ou systemKey.
 * @returns {string} Emoji ou 💬 como fallback.
 * @throws {Error} Não propaga exceções.
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
 * @description Retorna código BCP 47 para síntese de voz (voiceLang do i18n).
 * @returns {string} Ex.: pt-BR, en-US, es-ES.
 * @throws {Error} Não propaga exceções.
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
 * @description Resolve textos da interface do PWA usando chaves aninhadas do i18n.js (ex.: board.home).
 * @param {string} key - Caminho da tradução com pontos (ex.: messages.saveError).
 * @returns {string} Texto traduzido no idioma atual ou a própria chave se não encontrada.
 * @throws {Error} Não propaga exceções.
 */
function getText(key) {
    if (window.TalkToYouI18n) {
        const translated = TalkToYouI18n.t(key);

        if (translated && translated !== key) {
            return translated;
        }
    }

    return key;
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
 * @description Registra versão do app e schema do banco no localStorage (rastreabilidade).
 * @returns {void}
 * @throws {Error} Não propaga exceções.
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
    if (previousDbSchemaVersion !== String(APP_DB_SCHEMA_VERSION)) {
        console.log(
            `[TalkToYou] Versão do banco local: ${previousDbSchemaVersion || "primeira instalação"} -> ${APP_DB_SCHEMA_VERSION}`
        );

        localStorage.setItem(DB_SCHEMA_STORAGE_KEY, String(APP_DB_SCHEMA_VERSION));
    }
}

/**
 * @description Expõe versões do app/seed/banco no console (TalkToYouDebugVersion).
 * @returns {object} Objeto com versões em execução e armazenadas.
 * @throws {Error} Não propaga exceções.
 */
function TalkToYouDebugVersion() {
    const info = {
        appVersion: APP_RUNTIME_VERSION,
        seedVersion: APP_SEED_VERSION,
        dbSchemaVersion: APP_DB_SCHEMA_VERSION,
        storedAppVersion: localStorage.getItem(APP_VERSION_STORAGE_KEY),
        storedSeedVersion: localStorage.getItem("talktoyou_seed_version"),
        storedDbSchemaVersion: localStorage.getItem(DB_SCHEMA_STORAGE_KEY)
    };

    console.table(info);

    return info;
}

/* ============================================================
   MÓDULO APRENDER — renderização (máquina de estados no learning-service.js)
============================================================ */

/**
 * @description Carrega pasta pai completa do Dexie.
 * @param {number} folderId - ID da pasta.
 * @returns {Promise<object|null|undefined>} Registro da pasta ou null se ID inválido.
 * @throws {Error} Pode propagar falhas de Dexie.
 */
async function fetchFolderForLearning(folderId) {
    const numericId = parseInt(folderId, 10);

    if (Number.isNaN(numericId)) {
        return null;
    }

    return db.items.get(numericId);
}

/**
 * @description Cards filhos diretos (type card) de uma pasta.
 * @param {number} folderId - ID da pasta pai.
 * @returns {Promise<object[]>} Cards com parentId igual ao folderId.
 * @throws {Error} Pode propagar falhas de Dexie.
 */
async function fetchChildCardsForLearning(folderId) {
    const items = await db.items.where("parentId").equals(folderId).toArray();

    return items.filter((item) => item && item.type === "card");
}

/**
 * @description Distratores de outras pastas para o tabuleiro de escolhas.
 * @param {number} folderId - Pasta da atividade (excluída do pool).
 * @param {Array<number|string>} excludeIds - IDs já usados (pai, filho correto).
 * @param {number} [limit=3] - Quantidade máxima de distratores.
 * @returns {Promise<object[]>} Cards aleatórios de outras categorias.
 * @throws {Error} Pode propagar falhas de Dexie.
 */
async function fetchDistractorCardsForLearning(folderId, excludeIds, limit = 3) {
    const excludeSet = new Set(excludeIds.map((id) => String(id)));
    const allCards = await db.items.where("type").equals("card").toArray();

    const pool = allCards.filter((card) =>
        String(card.parentId) !== String(folderId) &&
        !excludeSet.has(String(card.id))
    );

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
    }

    return pool.slice(0, limit);
}

/**
 * @description Reproduz áudio CAA (audioBlob prioritário, senão TTS) — igual ao tabuleiro principal.
 * @param {Array<object>} items - Um ou mais itens Dexie.
 * @returns {Promise<void>}
 * @throws {Error} Pode propagar falhas de playSequenceFluida ou speakText.
 */
async function playLearningSequence(items) {
    if (typeof playSequenceFluida === "function") {
        await playSequenceFluida(items);
        return;
    }

    if (typeof speakText === "function" && items && items.length > 0) {
        const phrase = items.map((item) => getDisplayLabel(item)).join(" ").trim();
        await new Promise((resolve) => speakText(phrase, resolve));
    }
}

/**
 * @description Lê ID da pasta em #selected_learning_folder / localStorage.
 * @returns {number|null} ID numérico ou null se inválido.
 * @throws {Error} Não propaga exceções.
 */
function getSelectedLearningFolderId() {
    const select = document.getElementById("selected_learning_folder");
    const savedValue = select
        ? select.value
        : localStorage.getItem(SELECTED_LEARNING_FOLDER_KEY);

    if (!savedValue) {
        return null;
    }

    const numericId = parseInt(savedValue, 10);

    return Number.isNaN(numericId) ? null : numericId;
}

/**
 * @description Oculta barra do seletor de categorias.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function hideLearningFolderBar() {
    const bar = document.getElementById("learning-folder-bar");

    if (bar) {
        bar.style.display = "none";
    }
}

/**
 * @description Renderiza seletor #selected_learning_folder (fase CONFIG).
 * @returns {Promise<void>}
 * @throws {Error} Pode propagar falhas de Dexie ao listar pastas.
 */
async function renderLearningFolderSelector() {
    const boardContainer = document.querySelector(".board-container");
    const grid = document.getElementById("board-grid");

    if (!boardContainer || !grid) {
        return;
    }

    let bar = document.getElementById("learning-folder-bar");

    if (!bar) {
        bar = document.createElement("div");
        bar.id = "learning-folder-bar";
        bar.className = "learning-folder-bar";
        boardContainer.insertBefore(bar, grid);
    }

    bar.innerHTML = "";
    bar.style.display = "flex";

    const label = document.createElement("label");
    label.setAttribute("for", "selected_learning_folder");
    label.textContent = getText("learning.folderSelectLabel");

    const select = document.createElement("select");
    select.id = "selected_learning_folder";
    select.className = "learning-folder-select";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = getText("learning.folderSelectLabel");
    placeholder.disabled = true;
    select.appendChild(placeholder);

    const folders = await db.items.where("type").equals("folder").toArray();

    folders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = String(folder.id);
        option.textContent = getDisplayLabel(folder);
        select.appendChild(option);
    });

    const savedValue = localStorage.getItem(SELECTED_LEARNING_FOLDER_KEY);

    if (savedValue) {
        select.value = savedValue;
    }

    select.addEventListener("change", () => {
        localStorage.setItem(SELECTED_LEARNING_FOLDER_KEY, select.value);
    });

    bar.appendChild(label);
    bar.appendChild(select);
}

/**
 * @description Sincroniza cabeçalho e grade com o estado retornado pelo learning-service.
 * @param {object} state - Snapshot de TalkToYouLearning.getState().
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function renderLearningFromState(state) {
    const pathTextElement = document.getElementById("path-text");
    const grid = document.getElementById("board-grid");

    if (!grid || !state) {
        return;
    }

    if (pathTextElement) {
        pathTextElement.textContent = state.instruction || getText("learning.pathTitle");
    }

    grid.innerHTML = "";

    const isPlaying = state.phase === TalkToYouLearning.PHASE.PLAYING;

    const boardLocked = Boolean(state.boardInputLocked);
    grid.classList.toggle("learning-board-locked", boardLocked);

    state.boardCards.forEach((item) => {
        const interaction = isPlaying && !boardLocked
            ? { onClick: () => handleLearningBoardClick(item) }
            : {};

        grid.appendChild(createCardElement(item, interaction));
    });
}

/**
 * @description Bloqueia ou libera interação visual no tabuleiro do Aprender.
 * @param {boolean} locked - true desativa pointer-events na grade.
 * @returns {void}
 * @throws {Error} Não propaga exceções.
 */
function setLearningBoardPointerLock(locked) {
    const grid = document.getElementById("board-grid");

    if (grid) {
        grid.classList.toggle("learning-board-locked", locked);
    }
}

/**
 * @description Fase CONFIG: seletor de pasta + botões Iniciar Jogo e Voltar.
 * @returns {Promise<void>}
 * @throws {Error} Pode propagar falhas de Dexie ou TalkToYouLearning.
 */
async function renderLearningConfigScreen() {
    isLearningScreen = true;
    setLearningBoardPointerLock(false);

    if (window.TalkToYouLearning) {
        TalkToYouLearning.enterConfigPhase();
    }

    const backBtn = document.getElementById("header-back");

    if (backBtn) {
        backBtn.style.opacity = "1";
        backBtn.style.pointerEvents = "auto";
    }

    const pathTextElement = document.getElementById("path-text");

    if (pathTextElement) {
        pathTextElement.textContent = getText("learning.pathTitle");
    }

    await renderLearningFolderSelector();

    const grid = document.getElementById("board-grid");

    if (grid) {
        grid.innerHTML = "";
        const actions = TalkToYouLearning.getConfigActions();

        actions.forEach((action) => {
            grid.appendChild(createCardElement(action, {}));
        });
    }
}

/**
 * @description Entrada do módulo Aprender (card virtual na raiz).
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function renderLearningHome() {
    await renderLearningConfigScreen();
}

/**
 * @description Aguarda o navegador pintar a grade antes de disparar áudio do desafio.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
function waitForScreenPaint() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

/**
 * @description Clique em 'Iniciar Jogo': renderiza o tabuleiro primeiro, áudio do desafio depois.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function handleLearningStartGame() {
    if (!window.TalkToYouLearning) {
        return;
    }

    const folderId = getSelectedLearningFolderId();

    if (folderId === null) {
        alert(getText("learning.selectFolder"));
        return;
    }

    localStorage.setItem(SELECTED_LEARNING_FOLDER_KEY, String(folderId));

    const result = await TalkToYouLearning.startGame(folderId);

    if (!result.ok) {
        if (result.alertMessage) {
            alert(result.alertMessage);
        }

        return;
    }

    isLearningScreen = true;

    await renderLearningFolderSelector();
    renderLearningFromState(TalkToYouLearning.getState());

    await waitForScreenPaint();
    await TalkToYouLearning.playPreparedChallengeAudio();
}

/**
 * @description Clique em card do tabuleiro de jogo (validação userSequence no serviço).
 * @param {object} card - Item Dexie clicado.
 * @returns {Promise<void>}
 * @throws {Error} Não propaga exceções.
 */
async function handleLearningBoardClick(card) {
    if (!window.TalkToYouLearning) {
        return;
    }

    if (
        learningBoardClickBusy ||
        !TalkToYouLearning.isBoardInteractionAllowed()
    ) {
        return;
    }

    learningBoardClickBusy = true;
    setLearningBoardPointerLock(true);

    let keepBoardLocked = false;

    try {
        const result = await TalkToYouLearning.handleBoardClick(card);

        if (result.status === "ignored") {
            return;
        }

        if (result.boardLocked) {
            keepBoardLocked = true;
        }

        if (result.status === "error") {
            renderLearningFromState(TalkToYouLearning.getState());
            return;
        }

        if (result.status === "success" && result.returnToConfig) {
            await renderLearningConfigScreen();
            return;
        }

        if (result.status === "continue") {
            renderLearningFromState(TalkToYouLearning.getState());
        }
    } finally {
        learningBoardClickBusy = false;

        if (!keepBoardLocked) {
            setLearningBoardPointerLock(false);
        }
    }
}



/*
    Exposição opcional para depuração durante testes.

    Não interfere no funcionamento do app.
*/
window.TalkToYouDebugVersion = TalkToYouDebugVersion;


/*
    Exposição controlada para módulos auxiliares.
    Usada por audio-service.js, pdf-service.js e learning-service.js.
*/
window.getDisplayLabel = getDisplayLabel;
window.getCardVisualImage = getCardVisualImage;
window.getSpeechLanguage = getSpeechLanguage;
window.inferSystemKeyFromLabel = inferSystemKeyFromLabel;
window.getOfficialDisplayLabel = getOfficialDisplayLabel;
window.getLocalizedCustomLabel = getLocalizedCustomLabel;
window.getCurrentContentLanguage = getCurrentContentLanguage;
