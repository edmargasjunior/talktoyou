/*
============================================================
TalkToYou - Sistema de Internacionalização
Arquivo: js/i18n.js

Objetivo:
Centralizar os textos do aplicativo em português, inglês e espanhol.

Este arquivo NÃO traduz automaticamente textos criados pelo usuário.
Ele deve ser usado apenas para:
- textos fixos da interface;
- mensagens do sistema;
- cards padrão criados pelo próprio aplicativo;
- futuras páginas de ajuda e privacidade.

Decisão importante:
Cards personalizados pelo usuário não devem ser traduzidos automaticamente,
pois podem conter nomes próprios, expressões familiares, rotinas específicas,
termos terapêuticos ou frases criadas com intenção pessoal.

Autor: Edmar Junior
Projeto: TalkToYou
============================================================
*/

(function () {
    "use strict";

    /*
    ============================================================
    1. CONFIGURAÇÕES GERAIS
    ============================================================
    */

    const STORAGE_KEY = "talktoyou_language";

    const DEFAULT_LANGUAGE = "pt-BR";

    const SUPPORTED_LANGUAGES = {
        "pt-BR": {
            code: "pt-BR",
            shortCode: "pt",
            label: "Português",
            voiceLang: "pt-BR",
            helpPage: "ajuda.html",
            privacyPage: "privacidade.html"
        },

        "en-US": {
            code: "en-US",
            shortCode: "en",
            label: "English",
            voiceLang: "en-US",
            helpPage: "ajuda-en.html",
            privacyPage: "privacidade-en.html"
        },

        "es-ES": {
            code: "es-ES",
            shortCode: "es",
            label: "Español",
            voiceLang: "es-ES",
            helpPage: "ajuda-es.html",
            privacyPage: "privacidade-es.html"
        }
    };

    /*
    ============================================================
    2. TEXTOS DA INTERFACE

    Estes textos serão usados futuramente pelo index.html e app.js.

    Na próxima etapa, os elementos HTML poderão receber atributos como:

    data-i18n="menu.addNew"

    E este arquivo atualizará automaticamente o texto conforme o idioma.
    ============================================================
    */

    const TRANSLATIONS = {
        "pt-BR": {
            app: {
                title: "Comunicação Alternativa",
                windowTitle: "TalkToYou"
            },

            menu: {
                addNew: "Incluir Novo",
                manageItems: "Gerenciar Itens",
                exportBackup: "Exportar Backup",
                importBackup: "Importar Backup",
                printBoard: "Imprimir Prancha",
                help: "Ajuda / Manual",
                privacy: "Privacidade",
                cardSize: "Tamanho dos Cards:",
                voice: "Voz da Prancha:",
                language: "Idioma do Aplicativo:",
                debounce: "Ativar proteção contra cliques repetidos",
                debounceHelp: "Use esta opção apenas quando a pessoa tiver dificuldade motora e tocar várias vezes sem querer.",
                clearData: "Limpar dados do aplicativo",
                copyPix: "COPIAR CHAVE PIX",
                pixText: "❤️ Você pode apoiar a manutenção deste projeto enviando qualquer valor via PIX.",
                footerDev: "Desenvolvido por",
                location: "Belo Horizonte - MG"
            },

            grid: {
                auto: "Automático (Padrão)",
                large: "Grande (Baixa Visão - 2 colunas)",
                medium: "Médio (3 colunas)",
                small: "Pequeno (4 colunas)",
                mini: "Mini (5 colunas)"
            },

            board: {
                home: "Início",
                empty: "Nenhum item cadastrado aqui."
            },

            modal: {
                configure: "Configurar",
                type: "Tipo",
                card: "CARD (Simples)",
                folder: "PASTA (Categoria)",
                composeMode: "Juntar o nome desta pasta com o card clicado",
                composeExample: "Ex: “Eu Quero” + “Água” vira “Eu quero água”.",
                parent: "Pai (Onde ele ficará?)",
                name: "Nome",
                namePlaceholder: "Ex: LANCHE",
                alarm: "Despertador (Opcional)",
                photo: "📷 Tirar ou Escolher Foto",
                record: "Toque para gravar sua voz",
                save: "SALVAR NO APARELHO",
                delete: "EXCLUIR",
                cancel: "CANCELAR",
                close: "FECHAR",
                manage: "Gerenciar"
            },

            donation: {
                title: "Nossa Jornada Juntos",
                paragraph1: "Você percebeu como a comunicação transforma o dia a dia? Cada card criado é uma nova ponte para o mundo.",
                paragraph2: "TalkToYou é um projeto de coração, feito para ser livre e acessível. Ao apoiar, você não apenas ajuda a manter o app, mas se torna parte da missão de dar voz a quem precisa.",
                pixKey: "Chave PIX",
                copyPix: "Copiar Chave PIX",
                back: "⬅️ Voltar ao Aplicativo",
                quote: "Pequenos gestos criam grandes mudanças.",
                later: "Agora não, mas continuarei apoiando"
            },

            clearData: {
                title: "Limpar dados do aplicativo",
                warning: "Atenção: esta ação apagará os cards, imagens, áudios gravados, configurações e demais dados salvos neste aparelho.",
                backupAdvice: "Antes de continuar, é recomendado exportar um backup da prancha. Assim será possível restaurar os cards depois, se necessário.",
                backupButton: "📤 Fazer backup antes",
                confirmButton: "🧹 Apagar dados deste aparelho"
            },

            alarm: {
                title: "HORA DE...",
                ok: "OK"
            },

            messages: {
                voiceLoading: "Carregando vozes...",
                backupRecommended: "Recomenda-se fazer backup antes de continuar.",
                confirmClearData: "Tem certeza que deseja apagar todos os dados deste aparelho?",
                clearDataSuccess: "Dados locais apagados com sucesso. O aplicativo será recarregado agora.",
                clearDataError: "Não foi possível limpar todos os dados automaticamente."
            }
        },

        "en-US": {
            app: {
                title: "Alternative Communication",
                windowTitle: "TalkToYou"
            },

            menu: {
                addNew: "Add New",
                manageItems: "Manage Items",
                exportBackup: "Export Backup",
                importBackup: "Import Backup",
                printBoard: "Print Board",
                help: "Help / Manual",
                privacy: "Privacy",
                cardSize: "Card Size:",
                voice: "Board Voice:",
                language: "App Language:",
                debounce: "Enable repeated tap protection",
                debounceHelp: "Use this option only when the person has motor difficulties and may tap several times unintentionally.",
                clearData: "Clear app data",
                copyPix: "COPY PIX KEY",
                pixText: "❤️ You can support this project by sending any amount via PIX.",
                footerDev: "Developed by",
                location: "Belo Horizonte - MG"
            },

            grid: {
                auto: "Automatic (Default)",
                large: "Large (Low Vision - 2 columns)",
                medium: "Medium (3 columns)",
                small: "Small (4 columns)",
                mini: "Mini (5 columns)"
            },

            board: {
                home: "Home",
                empty: "No items registered here."
            },

            modal: {
                configure: "Configure",
                type: "Type",
                card: "CARD (Simple)",
                folder: "FOLDER (Category)",
                composeMode: "Combine this folder name with the selected card",
                composeExample: "Example: “I Want” + “Water” becomes “I want water”.",
                parent: "Parent (Where will it be placed?)",
                name: "Name",
                namePlaceholder: "Example: SNACK",
                alarm: "Alarm (Optional)",
                photo: "📷 Take or Choose Photo",
                record: "Tap to record your voice",
                save: "SAVE ON DEVICE",
                delete: "DELETE",
                cancel: "CANCEL",
                close: "CLOSE",
                manage: "Manage"
            },

            donation: {
                title: "Our Journey Together",
                paragraph1: "Have you noticed how communication can transform daily life? Each card created is a new bridge to the world.",
                paragraph2: "TalkToYou is a heartfelt project, made to be free and accessible. By supporting it, you help maintain the app and become part of the mission to give voice to those who need it.",
                pixKey: "PIX Key",
                copyPix: "Copy PIX Key",
                back: "⬅️ Back to App",
                quote: "Small gestures create big changes.",
                later: "Not now, but I will keep supporting"
            },

            clearData: {
                title: "Clear app data",
                warning: "Warning: this action will delete cards, images, recorded audios, settings and other data saved on this device.",
                backupAdvice: "Before continuing, it is recommended to export a board backup. This allows you to restore the cards later if needed.",
                backupButton: "📤 Backup first",
                confirmButton: "🧹 Delete data from this device"
            },

            alarm: {
                title: "TIME TO...",
                ok: "OK"
            },

            messages: {
                voiceLoading: "Loading voices...",
                backupRecommended: "It is recommended to make a backup before continuing.",
                confirmClearData: "Are you sure you want to delete all data from this device?",
                clearDataSuccess: "Local data deleted successfully. The app will reload now.",
                clearDataError: "It was not possible to clear all data automatically."
            }
        },

        "es-ES": {
            app: {
                title: "Comunicación Alternativa",
                windowTitle: "TalkToYou"
            },

            menu: {
                addNew: "Agregar Nuevo",
                manageItems: "Administrar Ítems",
                exportBackup: "Exportar Copia",
                importBackup: "Importar Copia",
                printBoard: "Imprimir Tablero",
                help: "Ayuda / Manual",
                privacy: "Privacidad",
                cardSize: "Tamaño de las Tarjetas:",
                voice: "Voz del Tablero:",
                language: "Idioma de la Aplicación:",
                debounce: "Activar protección contra toques repetidos",
                debounceHelp: "Use esta opción solo cuando la persona tenga dificultad motora y pueda tocar varias veces sin querer.",
                clearData: "Borrar datos de la aplicación",
                copyPix: "COPIAR CLAVE PIX",
                pixText: "❤️ Puedes apoyar el mantenimiento de este proyecto enviando cualquier valor por PIX.",
                footerDev: "Desarrollado por",
                location: "Belo Horizonte - MG"
            },

            grid: {
                auto: "Automático (Predeterminado)",
                large: "Grande (Baja Visión - 2 columnas)",
                medium: "Mediano (3 columnas)",
                small: "Pequeño (4 columnas)",
                mini: "Mini (5 columnas)"
            },

            board: {
                home: "Inicio",
                empty: "No hay ítems registrados aquí."
            },

            modal: {
                configure: "Configurar",
                type: "Tipo",
                card: "TARJETA (Simple)",
                folder: "CARPETA (Categoría)",
                composeMode: "Combinar el nombre de esta carpeta con la tarjeta seleccionada",
                composeExample: "Ejemplo: “Yo Quiero” + “Agua” se convierte en “Yo quiero agua”.",
                parent: "Padre (¿Dónde estará?)",
                name: "Nombre",
                namePlaceholder: "Ejemplo: MERIENDA",
                alarm: "Alarma (Opcional)",
                photo: "📷 Tomar o Elegir Foto",
                record: "Toque para grabar su voz",
                save: "GUARDAR EN EL DISPOSITIVO",
                delete: "ELIMINAR",
                cancel: "CANCELAR",
                close: "CERRAR",
                manage: "Administrar"
            },

            donation: {
                title: "Nuestro Camino Juntos",
                paragraph1: "¿Has notado cómo la comunicación transforma el día a día? Cada tarjeta creada es un nuevo puente hacia el mundo.",
                paragraph2: "TalkToYou es un proyecto hecho con el corazón, creado para ser libre y accesible. Al apoyarlo, ayudas a mantener la aplicación y te conviertes en parte de la misión de dar voz a quienes la necesitan.",
                pixKey: "Clave PIX",
                copyPix: "Copiar Clave PIX",
                back: "⬅️ Volver a la Aplicación",
                quote: "Pequeños gestos crean grandes cambios.",
                later: "Ahora no, pero seguiré apoyando"
            },

            clearData: {
                title: "Borrar datos de la aplicación",
                warning: "Atención: esta acción eliminará las tarjetas, imágenes, audios grabados, configuraciones y otros datos guardados en este dispositivo.",
                backupAdvice: "Antes de continuar, se recomienda exportar una copia del tablero. Así será posible restaurar las tarjetas después, si es necesario.",
                backupButton: "📤 Hacer copia primero",
                confirmButton: "🧹 Borrar datos de este dispositivo"
            },

            alarm: {
                title: "HORA DE...",
                ok: "OK"
            },

            messages: {
                voiceLoading: "Cargando voces...",
                backupRecommended: "Se recomienda hacer una copia antes de continuar.",
                confirmClearData: "¿Está seguro de que desea borrar todos los datos de este dispositivo?",
                clearDataSuccess: "Datos locales borrados correctamente. La aplicación se recargará ahora.",
                clearDataError: "No fue posible borrar todos los datos automáticamente."
            }
        }
    };

    /*
    ============================================================
    3. DICIONÁRIO DOS CARDS PADRÃO DO SISTEMA

    Este dicionário será usado futuramente pelo app.js.

    Regra:
    Apenas cards oficiais do sistema devem receber uma chave systemKey.
    Cards criados pelo usuário não devem receber systemKey.
    ============================================================
    */

    const SYSTEM_CARDS = {
        want: {
            "pt-BR": "Eu Quero",
            "en-US": "I Want",
            "es-ES": "Yo Quiero"
        },

        communication: {
            "pt-BR": "Comunicação",
            "en-US": "Communication",
            "es-ES": "Comunicación"
        },

        feelings: {
            "pt-BR": "Como Estou",
            "en-US": "How I Feel",
            "es-ES": "Cómo Estoy"
        },

        food: {
            "pt-BR": "Comer",
            "en-US": "Food",
            "es-ES": "Comer"
        },

        drink: {
            "pt-BR": "Beber",
            "en-US": "Drink",
            "es-ES": "Beber"
        },

        routine: {
            "pt-BR": "Rotina",
            "en-US": "Routine",
            "es-ES": "Rutina"
        },

        sensory: {
            "pt-BR": "Sensorial",
            "en-US": "Sensory",
            "es-ES": "Sensorial"
        },

        emergency: {
            "pt-BR": "Emergência",
            "en-US": "Emergency",
            "es-ES": "Emergencia"
        },

        people: {
            "pt-BR": "Pessoas",
            "en-US": "People",
            "es-ES": "Personas"
        },

        play: {
            "pt-BR": "Brincar",
            "en-US": "Play",
            "es-ES": "Jugar"
        },

        water: {
            "pt-BR": "Água",
            "en-US": "Water",
            "es-ES": "Agua"
        },

        bathroom: {
            "pt-BR": "Banheiro",
            "en-US": "Bathroom",
            "es-ES": "Baño"
        },

        help: {
            "pt-BR": "Ajuda",
            "en-US": "Help",
            "es-ES": "Ayuda"
        },

        yes: {
            "pt-BR": "Sim",
            "en-US": "Yes",
            "es-ES": "Sí"
        },

        no: {
            "pt-BR": "Não",
            "en-US": "No",
            "es-ES": "No"
        },

        stop: {
            "pt-BR": "Parar",
            "en-US": "Stop",
            "es-ES": "Parar"
        },

        pain: {
            "pt-BR": "Estou com dor",
            "en-US": "I am in pain",
            "es-ES": "Tengo dolor"
        },

        hungry: {
            "pt-BR": "Estou com fome",
            "en-US": "I am hungry",
            "es-ES": "Tengo hambre"
        },

        thirsty: {
            "pt-BR": "Estou com sede",
            "en-US": "I am thirsty",
            "es-ES": "Tengo sed"
        },

        happy: {
            "pt-BR": "Estou feliz",
            "en-US": "I am happy",
            "es-ES": "Estoy feliz"
        },

        sad: {
            "pt-BR": "Estou triste",
            "en-US": "I am sad",
            "es-ES": "Estoy triste"
        },

        loudNoise: {
            "pt-BR": "Barulho alto",
            "en-US": "Loud noise",
            "es-ES": "Ruido fuerte"
        },

        tooMuchLight: {
            "pt-BR": "Luz forte",
            "en-US": "Bright light",
            "es-ES": "Luz fuerte"
        },

        breakTime: {
            "pt-BR": "Preciso de pausa",
            "en-US": "I need a break",
            "es-ES": "Necesito una pausa"
        },

        medicine: {
            "pt-BR": "Remédio",
            "en-US": "Medicine",
            "es-ES": "Medicamento"
        },

        sleep: {
            "pt-BR": "Dormir",
            "en-US": "Sleep",
            "es-ES": "Dormir"
        },

        school: {
            "pt-BR": "Escola",
            "en-US": "School",
            "es-ES": "Escuela"
        },

        bath: {
            "pt-BR": "Banho",
            "en-US": "Bath",
            "es-ES": "Baño"
        },

        mother: {
            "pt-BR": "Mamãe",
            "en-US": "Mom",
            "es-ES": "Mamá"
        },

        father: {
            "pt-BR": "Papai",
            "en-US": "Dad",
            "es-ES": "Papá"
        },

        teacher: {
            "pt-BR": "Professor",
            "en-US": "Teacher",
            "es-ES": "Profesor"
        },

        toy: {
            "pt-BR": "Brinquedo",
            "en-US": "Toy",
            "es-ES": "Juguete"
        }
    };

    /*
    ============================================================
    4. FUNÇÕES DE IDIOMA
    ============================================================
    */

    function normalizeLanguage(language) {
        if (!language || typeof language !== "string") {
            return DEFAULT_LANGUAGE;
        }

        const normalized = language.toLowerCase();

        if (normalized.startsWith("pt")) {
            return "pt-BR";
        }

        if (normalized.startsWith("en")) {
            return "en-US";
        }

        if (normalized.startsWith("es")) {
            return "es-ES";
        }

        return DEFAULT_LANGUAGE;
    }

    function detectDeviceLanguage() {
        const browserLanguage =
            navigator.language ||
            navigator.userLanguage ||
            DEFAULT_LANGUAGE;

        return normalizeLanguage(browserLanguage);
    }

    function getSavedLanguage() {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);

        if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
            return savedLanguage;
        }

        return null;
    }

    function getCurrentLanguage() {
        return getSavedLanguage() || detectDeviceLanguage();
    }

    function setCurrentLanguage(language) {
        const normalizedLanguage = normalizeLanguage(language);

        localStorage.setItem(STORAGE_KEY, normalizedLanguage);

        return normalizedLanguage;
    }

    function getLanguageConfig(language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());

        return SUPPORTED_LANGUAGES[selectedLanguage] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
    }

    /*
    ============================================================
    5. FUNÇÃO PARA BUSCAR TEXTOS

    Exemplo:
    TalkToYouI18n.t("menu.addNew")

    Se o texto não existir no idioma selecionado, tenta português.
    Se ainda assim não existir, retorna a própria chave.
    ============================================================
    */

    function getNestedValue(object, path) {
        return path.split(".").reduce((current, key) => {
            if (current && Object.prototype.hasOwnProperty.call(current, key)) {
                return current[key];
            }

            return undefined;
        }, object);
    }

    function t(key, language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());

        const translatedValue = getNestedValue(
            TRANSLATIONS[selectedLanguage],
            key
        );

        if (translatedValue !== undefined) {
            return translatedValue;
        }

        const fallbackValue = getNestedValue(
            TRANSLATIONS[DEFAULT_LANGUAGE],
            key
        );

        if (fallbackValue !== undefined) {
            return fallbackValue;
        }

        return key;
    }

    /*
    ============================================================
    6. APLICAÇÃO AUTOMÁTICA EM ELEMENTOS HTML

    Na próxima etapa, o index.html poderá usar:

    <span data-i18n="menu.addNew"></span>

    Também é possível traduzir placeholders:

    <input data-i18n-placeholder="modal.namePlaceholder">
    ============================================================
    */

    function applyTranslations(rootElement) {
        const root = rootElement || document;
        const currentLanguage = getCurrentLanguage();

        root.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            element.textContent = t(key, currentLanguage);
        });

        root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
            const key = element.getAttribute("data-i18n-placeholder");
            element.setAttribute("placeholder", t(key, currentLanguage));
        });

        root.querySelectorAll("[data-i18n-title]").forEach((element) => {
            const key = element.getAttribute("data-i18n-title");
            element.setAttribute("title", t(key, currentLanguage));
        });

        root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
            const key = element.getAttribute("data-i18n-aria-label");
            element.setAttribute("aria-label", t(key, currentLanguage));
        });

        document.documentElement.lang = getLanguageConfig(currentLanguage).code;
        document.title = t("app.windowTitle", currentLanguage);
    }

    /*
    ============================================================
    7. SELETOR DE IDIOMA

    Na próxima etapa, o index.html terá um <select id="language-select">.

    Esta função preenche esse select com os idiomas suportados.
    ============================================================
    */

    function populateLanguageSelect(selectId) {
        const select = document.getElementById(selectId || "language-select");

        if (!select) {
            return;
        }

        select.innerHTML = "";

        Object.values(SUPPORTED_LANGUAGES).forEach((language) => {
            const option = document.createElement("option");

            option.value = language.code;
            option.textContent = language.label;

            if (language.code === getCurrentLanguage()) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    /*
    ============================================================
    8. ALTERAÇÃO MANUAL DO IDIOMA

    Esta função será chamada quando o usuário escolher outro idioma no menu.

    Ela:
    - salva o idioma;
    - reaplica os textos da interface;
    - dispara um evento para o app.js atualizar outras partes do app.
    ============================================================
    */

    function changeLanguage(language) {
        const selectedLanguage = setCurrentLanguage(language);

        applyTranslations();
        populateLanguageSelect("language-select");

        window.dispatchEvent(
            new CustomEvent("talktoyou:language-changed", {
                detail: {
                    language: selectedLanguage,
                    config: getLanguageConfig(selectedLanguage)
                }
            })
        );

        return selectedLanguage;
    }

    /*
    ============================================================
    9. TRADUÇÃO DOS CARDS PADRÃO DO SISTEMA

    Esta função só traduz cards que tiverem uma chave oficial do sistema.

    Exemplo futuro de card padrão:
    {
        label: "Água",
        type: "card",
        parentId: 1,
        systemKey: "water"
    }

    Cards criados pelo usuário NÃO devem ter systemKey.
    ============================================================
    */

    function translateSystemCard(systemKey, language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());

        if (!systemKey || !SYSTEM_CARDS[systemKey]) {
            return null;
        }

        return (
            SYSTEM_CARDS[systemKey][selectedLanguage] ||
            SYSTEM_CARDS[systemKey][DEFAULT_LANGUAGE] ||
            null
        );
    }

    function isSystemCard(systemKey) {
        return Boolean(systemKey && SYSTEM_CARDS[systemKey]);
    }

    /*
    ============================================================
    10. EXPORTAÇÃO GLOBAL

    O projeto atual usa JavaScript simples no navegador.
    Por isso, este arquivo disponibiliza um objeto global.

    Futuramente, se o projeto migrar para módulos, esse objeto poderá
    ser convertido para export/import.
    ============================================================
    */

    window.TalkToYouI18n = {
        STORAGE_KEY,
        DEFAULT_LANGUAGE,
        SUPPORTED_LANGUAGES,
        TRANSLATIONS,
        SYSTEM_CARDS,

        normalizeLanguage,
        detectDeviceLanguage,
        getSavedLanguage,
        getCurrentLanguage,
        setCurrentLanguage,
        getLanguageConfig,

        t,
        applyTranslations,
        populateLanguageSelect,
        changeLanguage,

        translateSystemCard,
        isSystemCard
    };
})();