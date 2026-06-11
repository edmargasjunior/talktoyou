/**
 * @file i18n.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description internacionalização da interface e dicionário de cards oficiais por systemKey
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */
(function () {
    "use strict";

    const STORAGE_KEY = "talktoyou_language";
    const DEFAULT_LANGUAGE = "pt-BR";

    const SUPPORTED_LANGUAGES = {
        "pt-BR": { code: "pt-BR", shortCode: "pt", label: "Português", voiceLang: "pt-BR", helpPage: "ajuda.html", privacyPage: "privacidade.html" },
        "en-US": { code: "en-US", shortCode: "en", label: "English", voiceLang: "en-US", helpPage: "ajuda-en.html", privacyPage: "privacidade-en.html" },
        "es-ES": { code: "es-ES", shortCode: "es", label: "Español", voiceLang: "es-ES", helpPage: "ajuda-es.html", privacyPage: "privacidade-es.html" }
    };

    const TRANSLATIONS = {
        "pt-BR": {
                "app": {
                        "title": "Comunicação Alternativa",
                        "windowTitle": "TalkToYou"
                },
                "menu": {
                        "addNew": "Incluir Novo",
                        "manageItems": "Gerenciar Itens",
                        "exportBackup": "Exportar Backup",
                        "importBackup": "Importar Backup",
                        "printBoard": "Imprimir Prancha",
                        "help": "Ajuda / Manual",
                        "privacy": "Privacidade",
                        "cardSize": "Tamanho dos Cards:",
                        "voice": "Voz da Prancha:",
                        "language": "Idioma do Aplicativo:",
                        "debounce": "Ativar proteção contra cliques repetidos",
                        "debounceHelp": "Use esta opção apenas quando a pessoa tiver dificuldade motora e tocar várias vezes sem querer.",
                        "clearData": "Limpar dados do aplicativo",
                        "copyPix": "COPIAR CHAVE PIX",
                        "pixText": "❤️ Você pode apoiar a manutenção deste projeto enviando qualquer valor via PIX.",
                        "footerDev": "Desenvolvido por",
                        "location": "Belo Horizonte - MG"
                },
                "grid": {
                        "auto": "Automático (Padrão)",
                        "large": "Grande (Baixa Visão - 2 colunas)",
                        "medium": "Médio (3 colunas)",
                        "small": "Pequeno (4 colunas)",
                        "mini": "Mini (5 colunas)"
                },
                "board": {
                        "home": "Início",
                        "empty": "Nenhum item cadastrado aqui."
                },
                "modal": {
                        "configure": "Configurar",
                        "type": "Tipo",
                        "card": "CARD (Simples)",
                        "folder": "PASTA (Categoria)",
                        "composeMode": "Juntar o nome desta pasta com o card clicado",
                        "composeExample": "Ex: “Eu Quero” + “Água” vira “Eu quero água”.",
                        "parent": "Pai (Onde ele ficará?)",
                        "name": "Nome",
                        "namePlaceholder": "Ex: LANCHE",
                        "alarm": "Despertador (Opcional)",
                        "photo": "📷 Tirar ou Escolher Foto",
                        "photoOk": "✅ Foto selecionada",
                        "audioSaved": "✅ Áudio gravado",
                        "record": "Toque para gravar sua voz",
                        "save": "SALVAR NO APARELHO",
                        "delete": "EXCLUIR",
                        "cancel": "CANCELAR",
                        "close": "FECHAR",
                        "manage": "Gerenciar",
                        "add": "Incluir Novo"
                },
                "donation": {
                        "title": "Nossa Jornada Juntos",
                        "openFromMenu": "💝 Apoiar o projeto",
                        "paragraph1": "Você percebeu como a comunicação transforma o dia a dia? Cada card criado é uma nova ponte para o mundo.",
                        "paragraph2": "TalkToYou é um projeto de coração, feito para ser livre e acessível. Ao apoiar, você não apenas ajuda a manter o app, mas se torna parte da missão de dar voz a quem precisa.",
                        "pixKey": "Chave PIX",
                        "copyPix": "Copiar Chave PIX",
                        "back": "⬅️ Voltar ao Aplicativo",
                        "quote": "Pequenos gestos criam grandes mudanças.",
                        "later": "Agora não, mas continuarei apoiando"
                },
                "clearData": {
                        "title": "Limpar dados do aplicativo",
                        "warning": "Atenção: esta ação apagará os cards, imagens, áudios gravados, configurações e demais dados salvos neste aparelho.",
                        "backupAdvice": "Antes de continuar, é recomendado exportar um backup da prancha. Assim será possível restaurar os cards depois, se necessário.",
                        "backupButton": "📤 Fazer backup antes",
                        "confirmButton": "🧹 Apagar dados deste aparelho"
                },
                "alarm": {
                        "title": "HORA DE...",
                        "ok": "OK"
                },
                "messages": {
                        "voiceLoading": "Carregando vozes...",
                        "backupRecommended": "Recomenda-se fazer backup antes de continuar.",
                        "confirmClearData": "Tem certeza que deseja apagar todos os dados deste aparelho?",
                        "clearDataSuccess": "Dados locais apagados com sucesso. O aplicativo será recarregado agora.",
                        "clearDataError": "Não foi possível limpar todos os dados automaticamente.",
                        "startupError": "Erro ao iniciar o aplicativo.",
                        "defaultDeviceVoice": "Voz padrão do aparelho",
                        "voiceSelected": "Voz selecionada",
                        "edit": "Editar",
                        "nameRequired": "Informe o nome do item.",
                        "saveError": "Não foi possível salvar o item.",
                        "folderCycle": "Não é possível mover a pasta para dentro dela mesma ou de uma de suas subpastas.",
                        "confirmDelete": "Tem certeza que deseja excluir este item?",
                        "backupExportError": "Erro ao exportar backup.",
                        "invalidFile": "Arquivo inválido.",
                        "confirmImport": "Importar este backup substituirá os dados atuais. Deseja continuar?",
                        "backupImported": "Backup importado com sucesso.",
                        "invalidOrCorruptedFile": "Arquivo inválido ou corrompido.",
                        "backupFileTooLarge": "O arquivo de backup é muito grande. Use um backup exportado pelo TalkToYou.",
                        "backupInvalidFormat": "Backup inválido. O arquivo deve seguir o padrão TalkToYou v3 (app, version, items).",
                        "backupImportFailedRollback": "A importação falhou. Seus dados anteriores foram restaurados.",
                        "backupImportFailedNoRollback": "A importação falhou e não foi possível restaurar os dados anteriores. Tente um backup válido.",
                        "copyPixFallback": "Não foi possível copiar automaticamente. Chave PIX:",
                        "copied": "COPIADO!",
                        "pdfNeedFolder": "Crie uma pasta antes de imprimir.",
                        "pdfError": "Erro ao gerar PDF."
                },
                "learning": {
                        "title": "Aprender",
                        "menuEnable": "Ativar Aprendizado",
                        "menuHelp": "Habilita atividades simples de aprendizagem comunicacional usando os próprios cards do aplicativo.",
                        "start": "Iniciar",
                        "startGame": "Iniciar Jogo",
                        "back": "Voltar",
                        "folderSelectLabel": "Categoria da prancha:",
                        "folderAll": "Todas as categorias",
                        "pathTitle": "📘 Aprender",
                        "selectFolder": "Selecione uma categoria antes de iniciar o jogo.",
                        "noChildren": "Esta categoria não tem cards. Adicione cards na pasta antes de jogar.",
                        "buildPhraseCompose": "Monte a frase: {parent} + {child}",
                        "buildPhraseSimple": "Monte a frase: {child}",
                        "activityInstruction": "📘 Siga a frase: {phrase}",
                        "insufficientCards": "Esta categoria precisa de pelo menos 2 cards cadastrados para montar a atividade.",
                        "fallbackToAll": "Usando cards de todas as categorias.",
                        "feedback": {
                                "success": "Muito bem!",
                                "continue": "Continue",
                                "retry": "Vamos tentar de novo."
                        },
                        "activity": {
                                "wantWater": { "phrase": "Quero água" },
                                "wantEat": { "phrase": "Quero comer" },
                                "feelHappy": { "phrase": "Estou feliz" },
                                "wantPlay": { "phrase": "Quero brincar" },
                                "wantMom": { "phrase": "Quero mamãe" }
                        },
                        "fallback": {
                                "want": "Quero",
                                "water": "Água",
                                "apple": "Maçã",
                                "ball": "Bola",
                                "eat": "Comer",
                                "play": "Brincar",
                                "sad": "Triste",
                                "tired": "Cansado",
                                "medicine": "Remédio",
                                "mom": "Mamãe",
                                "dad": "Papai",
                                "feel": "Estou",
                                "happy": "Feliz"
                        }
                }
        },
        "en-US": {
                "app": {
                        "title": "Alternative Communication",
                        "windowTitle": "TalkToYou"
                },
                "menu": {
                        "addNew": "Add New",
                        "manageItems": "Manage Items",
                        "exportBackup": "Export Backup",
                        "importBackup": "Import Backup",
                        "printBoard": "Print Board",
                        "help": "Help / Manual",
                        "privacy": "Privacy",
                        "cardSize": "Card Size:",
                        "voice": "Board Voice:",
                        "language": "App Language:",
                        "debounce": "Enable repeated tap protection",
                        "debounceHelp": "Use this option only when the person has motor difficulties and may tap several times unintentionally.",
                        "clearData": "Clear app data",
                        "copyPix": "COPY PIX KEY",
                        "pixText": "❤️ You can support this project by sending any amount via PIX.",
                        "footerDev": "Developed by",
                        "location": "Belo Horizonte - MG"
                },
                "grid": {
                        "auto": "Automatic (Default)",
                        "large": "Large (Low Vision - 2 columns)",
                        "medium": "Medium (3 columns)",
                        "small": "Small (4 columns)",
                        "mini": "Mini (5 columns)"
                },
                "board": {
                        "home": "Home",
                        "empty": "No items registered here."
                },
                "modal": {
                        "configure": "Configure",
                        "type": "Type",
                        "card": "CARD (Simple)",
                        "folder": "FOLDER (Category)",
                        "composeMode": "Combine this folder name with the selected card",
                        "composeExample": "Example: “I Want” + “Water” becomes “I want water”.",
                        "parent": "Parent (Where will it be placed?)",
                        "name": "Name",
                        "namePlaceholder": "Example: SNACK",
                        "alarm": "Alarm (Optional)",
                        "photo": "📷 Take or Choose Photo",
                        "photoOk": "✅ Photo selected",
                        "audioSaved": "✅ Audio recorded",
                        "record": "Tap to record your voice",
                        "save": "SAVE ON DEVICE",
                        "delete": "DELETE",
                        "cancel": "CANCEL",
                        "close": "CLOSE",
                        "manage": "Manage",
                        "add": "Add New"
                },
                "donation": {
                        "title": "Our Journey Together",
                        "openFromMenu": "💝 Support the project",
                        "paragraph1": "Have you noticed how communication can transform daily life? Each card created is a new bridge to the world.",
                        "paragraph2": "TalkToYou is a heartfelt project, made to be free and accessible. By supporting it, you help maintain the app and become part of the mission to give voice to those who need it.",
                        "pixKey": "PIX Key",
                        "copyPix": "Copy PIX Key",
                        "back": "⬅️ Back to App",
                        "quote": "Small gestures create big changes.",
                        "later": "Not now, but I will keep supporting"
                },
                "clearData": {
                        "title": "Clear app data",
                        "warning": "Warning: this action will delete cards, images, recorded audios, settings and other data saved on this device.",
                        "backupAdvice": "Before continuing, it is recommended to export a board backup. This allows you to restore the cards later if needed.",
                        "backupButton": "📤 Backup first",
                        "confirmButton": "🧹 Delete data from this device"
                },
                "alarm": {
                        "title": "TIME TO...",
                        "ok": "OK"
                },
                "messages": {
                        "voiceLoading": "Loading voices...",
                        "backupRecommended": "It is recommended to make a backup before continuing.",
                        "confirmClearData": "Are you sure you want to delete all data from this device?",
                        "clearDataSuccess": "Local data deleted successfully. The app will reload now.",
                        "clearDataError": "It was not possible to clear all data automatically.",
                        "startupError": "Error starting the application.",
                        "defaultDeviceVoice": "Default device voice",
                        "voiceSelected": "Voice selected",
                        "edit": "Edit",
                        "nameRequired": "Please enter the item name.",
                        "saveError": "Could not save the item.",
                        "folderCycle": "Cannot move a folder into itself or into one of its subfolders.",
                        "confirmDelete": "Are you sure you want to delete this item?",
                        "backupExportError": "Error exporting backup.",
                        "invalidFile": "Invalid file.",
                        "confirmImport": "Importing this backup will replace current data. Continue?",
                        "backupImported": "Backup imported successfully.",
                        "invalidOrCorruptedFile": "Invalid or corrupted file.",
                        "backupFileTooLarge": "The backup file is too large. Use a backup exported from TalkToYou.",
                        "backupInvalidFormat": "Invalid backup. The file must follow TalkToYou v3 format (app, version, items).",
                        "backupImportFailedRollback": "Import failed. Your previous data was restored.",
                        "backupImportFailedNoRollback": "Import failed and previous data could not be restored. Try a valid backup.",
                        "copyPixFallback": "Could not copy automatically. PIX key:",
                        "copied": "COPIED!",
                        "pdfNeedFolder": "Create a folder before printing.",
                        "pdfError": "Error generating PDF."
                },
                "learning": {
                        "title": "Learn",
                        "menuEnable": "Enable Learning",
                        "menuHelp": "Enables simple communication learning activities using the app's own cards.",
                        "start": "Start",
                        "startGame": "Start Game",
                        "back": "Back",
                        "folderSelectLabel": "Board category:",
                        "folderAll": "All categories",
                        "pathTitle": "📘 Learn",
                        "selectFolder": "Select a category before starting the game.",
                        "noChildren": "This category has no cards. Add cards to the folder before playing.",
                        "buildPhraseCompose": "Build the phrase: {parent} + {child}",
                        "buildPhraseSimple": "Build the phrase: {child}",
                        "activityInstruction": "📘 Follow the phrase: {phrase}",
                        "insufficientCards": "This category needs at least 2 cards to build an activity.",
                        "fallbackToAll": "Using cards from all categories.",
                        "feedback": {
                                "success": "Well done!",
                                "continue": "Continue",
                                "retry": "Let's try again."
                        },
                        "activity": {
                                "wantWater": { "phrase": "I want water" },
                                "wantEat": { "phrase": "I want to eat" },
                                "feelHappy": { "phrase": "I am happy" },
                                "wantPlay": { "phrase": "I want to play" },
                                "wantMom": { "phrase": "I want mom" }
                        },
                        "fallback": {
                                "want": "I want",
                                "water": "Water",
                                "apple": "Apple",
                                "ball": "Ball",
                                "eat": "Eat",
                                "play": "Play",
                                "sad": "Sad",
                                "tired": "Tired",
                                "medicine": "Medicine",
                                "mom": "Mom",
                                "dad": "Dad",
                                "feel": "I am",
                                "happy": "Happy"
                        }
                }
        },
        "es-ES": {
                "app": {
                        "title": "Comunicación Alternativa",
                        "windowTitle": "TalkToYou"
                },
                "menu": {
                        "addNew": "Agregar Nuevo",
                        "manageItems": "Administrar Ítems",
                        "exportBackup": "Exportar Copia",
                        "importBackup": "Importar Copia",
                        "printBoard": "Imprimir Tablero",
                        "help": "Ayuda / Manual",
                        "privacy": "Privacidad",
                        "cardSize": "Tamaño de las Tarjetas:",
                        "voice": "Voz del Tablero:",
                        "language": "Idioma de la Aplicación:",
                        "debounce": "Activar protección contra toques repetidos",
                        "debounceHelp": "Use esta opción solo cuando la persona tenga dificultad motora y pueda tocar varias veces sin querer.",
                        "clearData": "Borrar datos de la aplicación",
                        "copyPix": "COPIAR CLAVE PIX",
                        "pixText": "❤️ Puedes apoyar el mantenimiento de este proyecto enviando cualquier valor por PIX.",
                        "footerDev": "Desarrollado por",
                        "location": "Belo Horizonte - MG"
                },
                "grid": {
                        "auto": "Automático (Predeterminado)",
                        "large": "Grande (Baja Visión - 2 columnas)",
                        "medium": "Mediano (3 columnas)",
                        "small": "Pequeño (4 columnas)",
                        "mini": "Mini (5 columnas)"
                },
                "board": {
                        "home": "Inicio",
                        "empty": "No hay ítems registrados aquí."
                },
                "modal": {
                        "configure": "Configurar",
                        "type": "Tipo",
                        "card": "TARJETA (Simple)",
                        "folder": "CARPETA (Categoría)",
                        "composeMode": "Combinar el nombre de esta carpeta con la tarjeta seleccionada",
                        "composeExample": "Ejemplo: “Yo Quiero” + “Agua” se convierte en “Yo quiero agua”.",
                        "parent": "Padre (¿Dónde estará?)",
                        "name": "Nombre",
                        "namePlaceholder": "Ejemplo: MERIENDA",
                        "alarm": "Alarma (Opcional)",
                        "photo": "📷 Tomar o Elegir Foto",
                        "photoOk": "✅ Foto seleccionada",
                        "audioSaved": "✅ Audio grabado",
                        "record": "Toque para grabar su voz",
                        "save": "GUARDAR EN EL DISPOSITIVO",
                        "delete": "ELIMINAR",
                        "cancel": "CANCELAR",
                        "close": "CERRAR",
                        "manage": "Administrar",
                        "add": "Agregar Nuevo"
                },
                "donation": {
                        "title": "Nuestro Camino Juntos",
                        "openFromMenu": "💝 Apoyar el proyecto",
                        "paragraph1": "¿Has notado cómo la comunicación transforma el día a día? Cada tarjeta creada es un nuevo puente hacia el mundo.",
                        "paragraph2": "TalkToYou es un proyecto hecho con el corazón, creado para ser libre y accesible. Al apoyarlo, ayudas a mantener la aplicación y te conviertes en parte de la misión de dar voz a quienes la necesitan.",
                        "pixKey": "Clave PIX",
                        "copyPix": "Copiar Clave PIX",
                        "back": "⬅️ Volver a la Aplicación",
                        "quote": "Pequeños gestos crean grandes cambios.",
                        "later": "Ahora no, pero seguiré apoyando"
                },
                "clearData": {
                        "title": "Borrar datos de la aplicación",
                        "warning": "Atención: esta acción eliminará las tarjetas, imágenes, audios grabados, configuraciones y otros datos guardados en este dispositivo.",
                        "backupAdvice": "Antes de continuar, se recomienda exportar una copia del tablero. Así será posible restaurar las tarjetas después, si es necesario.",
                        "backupButton": "📤 Hacer copia primero",
                        "confirmButton": "🧹 Borrar datos de este dispositivo"
                },
                "alarm": {
                        "title": "HORA DE...",
                        "ok": "OK"
                },
                "messages": {
                        "voiceLoading": "Cargando voces...",
                        "backupRecommended": "Se recomienda hacer una copia antes de continuar.",
                        "confirmClearData": "¿Está seguro de que desea borrar todos los datos de este dispositivo?",
                        "clearDataSuccess": "Datos locales borrados correctamente. La aplicación se recargará ahora.",
                        "clearDataError": "No fue posible borrar todos los datos automáticamente.",
                        "startupError": "Error al iniciar la aplicación.",
                        "defaultDeviceVoice": "Voz predeterminada del dispositivo",
                        "voiceSelected": "Voz seleccionada",
                        "edit": "Editar",
                        "nameRequired": "Indique el nombre del ítem.",
                        "saveError": "No fue posible guardar el ítem.",
                        "folderCycle": "No es posible mover la carpeta dentro de sí misma o de una de sus subcarpetas.",
                        "confirmDelete": "¿Está seguro de que desea eliminar este ítem?",
                        "backupExportError": "Error al exportar la copia.",
                        "invalidFile": "Archivo inválido.",
                        "confirmImport": "Importar esta copia reemplazará los datos actuales. ¿Desea continuar?",
                        "backupImported": "Copia importada correctamente.",
                        "invalidOrCorruptedFile": "Archivo inválido o corrupto.",
                        "backupFileTooLarge": "El archivo de copia es demasiado grande. Use una copia exportada por TalkToYou.",
                        "backupInvalidFormat": "Copia inválida. El archivo debe seguir el formato TalkToYou v3 (app, version, items).",
                        "backupImportFailedRollback": "La importación falló. Sus datos anteriores fueron restaurados.",
                        "backupImportFailedNoRollback": "La importación falló y no fue posible restaurar los datos anteriores. Pruebe una copia válida.",
                        "copyPixFallback": "No fue posible copiar automáticamente. Clave PIX:",
                        "copied": "¡COPIADO!",
                        "pdfNeedFolder": "Cree una carpeta antes de imprimir.",
                        "pdfError": "Error al generar el PDF."
                },
                "learning": {
                        "title": "Aprender",
                        "menuEnable": "Activar Aprendizaje",
                        "menuHelp": "Habilita actividades simples de aprendizaje comunicacional usando las propias tarjetas de la aplicación.",
                        "start": "Iniciar",
                        "startGame": "Iniciar Juego",
                        "back": "Volver",
                        "folderSelectLabel": "Categoría del tablero:",
                        "folderAll": "Todas las categorías",
                        "pathTitle": "📘 Aprender",
                        "selectFolder": "Seleccione una categoría antes de iniciar el juego.",
                        "noChildren": "Esta categoría no tiene tarjetas. Agregue tarjetas en la carpeta antes de jugar.",
                        "buildPhraseCompose": "Arme la frase: {parent} + {child}",
                        "buildPhraseSimple": "Arme la frase: {child}",
                        "activityInstruction": "📘 Siga la frase: {phrase}",
                        "insufficientCards": "Esta categoría necesita al menos 2 tarjetas para armar la actividad.",
                        "fallbackToAll": "Usando tarjetas de todas las categorías.",
                        "feedback": {
                                "success": "¡Muy bien!",
                                "continue": "Continúe",
                                "retry": "Intentemos de nuevo."
                        },
                        "activity": {
                                "wantWater": { "phrase": "Quiero agua" },
                                "wantEat": { "phrase": "Quiero comer" },
                                "feelHappy": { "phrase": "Estoy feliz" },
                                "wantPlay": { "phrase": "Quiero jugar" },
                                "wantMom": { "phrase": "Quiero mamá" }
                        },
                        "fallback": {
                                "want": "Quiero",
                                "water": "Agua",
                                "apple": "Manzana",
                                "ball": "Pelota",
                                "eat": "Comer",
                                "play": "Jugar",
                                "sad": "Triste",
                                "tired": "Cansado",
                                "medicine": "Medicamento",
                                "mom": "Mamá",
                                "dad": "Papá",
                                "feel": "Estoy",
                                "happy": "Feliz"
                        }
                }
        }
};

    const SYSTEM_CARDS = {
        "want": {
                "pt-BR": "Eu Quero",
                "en-US": "I Want",
                "es-ES": "Yo Quiero"
        },
        "communication": {
                "pt-BR": "Comunicação",
                "en-US": "Communication",
                "es-ES": "Comunicación"
        },
        "feelings": {
                "pt-BR": "Como Estou",
                "en-US": "How I Feel",
                "es-ES": "Cómo Estoy"
        },
        "food": {
                "pt-BR": "Comer",
                "en-US": "Food",
                "es-ES": "Comer"
        },
        "drink": {
                "pt-BR": "Beber",
                "en-US": "Drink",
                "es-ES": "Beber"
        },
        "routine": {
                "pt-BR": "Rotina",
                "en-US": "Routine",
                "es-ES": "Rutina"
        },
        "sensory": {
                "pt-BR": "Sensorial",
                "en-US": "Sensory",
                "es-ES": "Sensorial"
        },
        "emergency": {
                "pt-BR": "Emergência",
                "en-US": "Emergency",
                "es-ES": "Emergencia"
        },
        "people": {
                "pt-BR": "Pessoas",
                "en-US": "People",
                "es-ES": "Personas"
        },
        "play": {
                "pt-BR": "Brincar",
                "en-US": "Play",
                "es-ES": "Jugar"
        },
        "water": {
                "pt-BR": "Água",
                "en-US": "Water",
                "es-ES": "Agua"
        },
        "want_leite": {
                "pt-BR": "Leite",
                "en-US": "Milk",
                "es-ES": "Leche"
        },
        "want_suco": {
                "pt-BR": "Suco",
                "en-US": "Juice",
                "es-ES": "Jugo"
        },
        "want_comer": {
                "pt-BR": "Comer",
                "en-US": "Eat",
                "es-ES": "Comer"
        },
        "bathroom": {
                "pt-BR": "Banheiro",
                "en-US": "Bathroom",
                "es-ES": "Baño"
        },
        "help": {
                "pt-BR": "Ajuda",
                "en-US": "Help",
                "es-ES": "Ayuda"
        },
        "want_brincar": {
                "pt-BR": "Brincar",
                "en-US": "Play",
                "es-ES": "Jugar"
        },
        "want_colo": {
                "pt-BR": "Colo",
                "en-US": "Hold me",
                "es-ES": "Brazos"
        },
        "want_abraco": {
                "pt-BR": "Abraço",
                "en-US": "Hug",
                "es-ES": "Abrazo"
        },
        "want_sleep": {
                "pt-BR": "Dormir",
                "en-US": "Sleep",
                "es-ES": "Dormir"
        },
        "want_passear": {
                "pt-BR": "Passear",
                "en-US": "Go out",
                "es-ES": "Pasear"
        },
        "want_desenho": {
                "pt-BR": "Desenho",
                "en-US": "Cartoon",
                "es-ES": "Dibujo animado"
        },
        "want_musica": {
                "pt-BR": "Música",
                "en-US": "Music",
                "es-ES": "Música"
        },
        "want_celular": {
                "pt-BR": "Celular",
                "en-US": "Phone",
                "es-ES": "Celular"
        },
        "want_ficar_sozinho": {
                "pt-BR": "Ficar sozinho",
                "en-US": "Be alone",
                "es-ES": "Estar solo"
        },
        "yes": {
                "pt-BR": "Sim",
                "en-US": "Yes",
                "es-ES": "Sí"
        },
        "no": {
                "pt-BR": "Não",
                "en-US": "No",
                "es-ES": "No"
        },
        "communication_mais": {
                "pt-BR": "Mais",
                "en-US": "More",
                "es-ES": "Más"
        },
        "communication_acabou": {
                "pt-BR": "Acabou",
                "en-US": "All done",
                "es-ES": "Terminó"
        },
        "communication_quero": {
                "pt-BR": "Quero",
                "en-US": "I want",
                "es-ES": "Quiero"
        },
        "communication_nao_quero": {
                "pt-BR": "Não quero",
                "en-US": "I do not want",
                "es-ES": "No quiero"
        },
        "communication_ajuda": {
                "pt-BR": "Ajuda",
                "en-US": "Help",
                "es-ES": "Ayuda"
        },
        "stop": {
                "pt-BR": "Parar",
                "en-US": "Stop",
                "es-ES": "Parar"
        },
        "communication_espera": {
                "pt-BR": "Espera",
                "en-US": "Wait",
                "es-ES": "Espera"
        },
        "communication_vamos": {
                "pt-BR": "Vamos",
                "en-US": "Let’s go",
                "es-ES": "Vamos"
        },
        "communication_aqui": {
                "pt-BR": "Aqui",
                "en-US": "Here",
                "es-ES": "Aquí"
        },
        "communication_la": {
                "pt-BR": "Lá",
                "en-US": "There",
                "es-ES": "Allá"
        },
        "communication_de_novo": {
                "pt-BR": "De novo",
                "en-US": "Again",
                "es-ES": "De nuevo"
        },
        "communication_gostei": {
                "pt-BR": "Gostei",
                "en-US": "I liked it",
                "es-ES": "Me gustó"
        },
        "communication_nao_gostei": {
                "pt-BR": "Não gostei",
                "en-US": "I did not like it",
                "es-ES": "No me gustó"
        },
        "communication_obrigado": {
                "pt-BR": "Obrigado",
                "en-US": "Thank you",
                "es-ES": "Gracias"
        },
        "communication_desculpa": {
                "pt-BR": "Desculpa",
                "en-US": "Sorry",
                "es-ES": "Perdón"
        },
        "happy": {
                "pt-BR": "Feliz",
                "en-US": "Happy",
                "es-ES": "Feliz"
        },
        "sad": {
                "pt-BR": "Triste",
                "en-US": "Sad",
                "es-ES": "Triste"
        },
        "feelings_bravo": {
                "pt-BR": "Bravo",
                "en-US": "Angry",
                "es-ES": "Enojado"
        },
        "feelings_com_medo": {
                "pt-BR": "Com medo",
                "en-US": "Scared",
                "es-ES": "Con miedo"
        },
        "feelings_ansioso": {
                "pt-BR": "Ansioso",
                "en-US": "Anxious",
                "es-ES": "Ansioso"
        },
        "feelings_cansado": {
                "pt-BR": "Cansado",
                "en-US": "Tired",
                "es-ES": "Cansado"
        },
        "pain": {
                "pt-BR": "Com dor",
                "en-US": "In pain",
                "es-ES": "Con dolor"
        },
        "hungry": {
                "pt-BR": "Com fome",
                "en-US": "Hungry",
                "es-ES": "Con hambre"
        },
        "thirsty": {
                "pt-BR": "Com sede",
                "en-US": "Thirsty",
                "es-ES": "Con sed"
        },
        "feelings_com_sono": {
                "pt-BR": "Com sono",
                "en-US": "Sleepy",
                "es-ES": "Con sueño"
        },
        "feelings_calor": {
                "pt-BR": "Calor",
                "en-US": "Hot",
                "es-ES": "Calor"
        },
        "feelings_frio": {
                "pt-BR": "Frio",
                "en-US": "Cold",
                "es-ES": "Frío"
        },
        "feelings_doente": {
                "pt-BR": "Doente",
                "en-US": "Sick",
                "es-ES": "Enfermo"
        },
        "feelings_nervoso": {
                "pt-BR": "Nervoso",
                "en-US": "Nervous",
                "es-ES": "Nervioso"
        },
        "feelings_confuso": {
                "pt-BR": "Confuso",
                "en-US": "Confused",
                "es-ES": "Confundido"
        },
        "feelings_estou_bem": {
                "pt-BR": "Estou bem",
                "en-US": "I am fine",
                "es-ES": "Estoy bien"
        },
        "feelings_nao_estou_bem": {
                "pt-BR": "Não estou bem",
                "en-US": "I am not fine",
                "es-ES": "No estoy bien"
        },
        "food_maca": {
                "pt-BR": "Maçã",
                "en-US": "Apple",
                "es-ES": "Manzana"
        },
        "food_banana": {
                "pt-BR": "Banana",
                "en-US": "Banana",
                "es-ES": "Banana"
        },
        "food_pao": {
                "pt-BR": "Pão",
                "en-US": "Bread",
                "es-ES": "Pan"
        },
        "food_arroz": {
                "pt-BR": "Arroz",
                "en-US": "Rice",
                "es-ES": "Arroz"
        },
        "food_feijao": {
                "pt-BR": "Feijão",
                "en-US": "Beans",
                "es-ES": "Frijoles"
        },
        "food_macarrao": {
                "pt-BR": "Macarrão",
                "en-US": "Pasta",
                "es-ES": "Pasta"
        },
        "food_carne": {
                "pt-BR": "Carne",
                "en-US": "Meat",
                "es-ES": "Carne"
        },
        "food_frango": {
                "pt-BR": "Frango",
                "en-US": "Chicken",
                "es-ES": "Pollo"
        },
        "food_ovo": {
                "pt-BR": "Ovo",
                "en-US": "Egg",
                "es-ES": "Huevo"
        },
        "food_biscoito": {
                "pt-BR": "Biscoito",
                "en-US": "Cookie",
                "es-ES": "Galleta"
        },
        "food_bolo": {
                "pt-BR": "Bolo",
                "en-US": "Cake",
                "es-ES": "Pastel"
        },
        "food_chocolate": {
                "pt-BR": "Chocolate",
                "en-US": "Chocolate",
                "es-ES": "Chocolate"
        },
        "food_sorvete": {
                "pt-BR": "Sorvete",
                "en-US": "Ice cream",
                "es-ES": "Helado"
        },
        "food_pizza": {
                "pt-BR": "Pizza",
                "en-US": "Pizza",
                "es-ES": "Pizza"
        },
        "food_batata_frita": {
                "pt-BR": "Batata frita",
                "en-US": "French fries",
                "es-ES": "Papas fritas"
        },
        "food_almoco": {
                "pt-BR": "Almoço",
                "en-US": "Lunch",
                "es-ES": "Almuerzo"
        },
        "food_jantar": {
                "pt-BR": "Jantar",
                "en-US": "Dinner",
                "es-ES": "Cena"
        },
        "food_lanche": {
                "pt-BR": "Lanche",
                "en-US": "Snack",
                "es-ES": "Merienda"
        },
        "drink_agua": {
                "pt-BR": "Água",
                "en-US": "Water",
                "es-ES": "Agua"
        },
        "drink_leite": {
                "pt-BR": "Leite",
                "en-US": "Milk",
                "es-ES": "Leche"
        },
        "drink_suco": {
                "pt-BR": "Suco",
                "en-US": "Juice",
                "es-ES": "Jugo"
        },
        "drink_vitamina": {
                "pt-BR": "Vitamina",
                "en-US": "Smoothie",
                "es-ES": "Batido"
        },
        "drink_iogurte": {
                "pt-BR": "Iogurte",
                "en-US": "Yogurt",
                "es-ES": "Yogur"
        },
        "drink_achocolatado": {
                "pt-BR": "Achocolatado",
                "en-US": "Chocolate milk",
                "es-ES": "Leche chocolatada"
        },
        "drink_cha": {
                "pt-BR": "Chá",
                "en-US": "Tea",
                "es-ES": "Té"
        },
        "drink_refrigerante": {
                "pt-BR": "Refrigerante",
                "en-US": "Soda",
                "es-ES": "Refresco"
        },
        "routine_acordar": {
                "pt-BR": "Acordar",
                "en-US": "Wake up",
                "es-ES": "Despertar"
        },
        "routine_escovar_dentes": {
                "pt-BR": "Escovar dentes",
                "en-US": "Brush teeth",
                "es-ES": "Cepillar dientes"
        },
        "routine_banheiro": {
                "pt-BR": "Banheiro",
                "en-US": "Bathroom",
                "es-ES": "Baño"
        },
        "bath": {
                "pt-BR": "Banho",
                "en-US": "Bath",
                "es-ES": "Baño"
        },
        "routine_trocar_roupa": {
                "pt-BR": "Trocar roupa",
                "en-US": "Change clothes",
                "es-ES": "Cambiar ropa"
        },
        "routine_cafe_da_manha": {
                "pt-BR": "Café da manhã",
                "en-US": "Breakfast",
                "es-ES": "Desayuno"
        },
        "school": {
                "pt-BR": "Escola",
                "en-US": "School",
                "es-ES": "Escuela"
        },
        "routine_tarefa": {
                "pt-BR": "Tarefa",
                "en-US": "Homework",
                "es-ES": "Tarea"
        },
        "routine_terapia": {
                "pt-BR": "Terapia",
                "en-US": "Therapy",
                "es-ES": "Terapia"
        },
        "medicine": {
                "pt-BR": "Remédio",
                "en-US": "Medicine",
                "es-ES": "Medicamento"
        },
        "routine_almoco": {
                "pt-BR": "Almoço",
                "en-US": "Lunch",
                "es-ES": "Almuerzo"
        },
        "routine_descansar": {
                "pt-BR": "Descansar",
                "en-US": "Rest",
                "es-ES": "Descansar"
        },
        "routine_passear": {
                "pt-BR": "Passear",
                "en-US": "Go out",
                "es-ES": "Pasear"
        },
        "routine_jantar": {
                "pt-BR": "Jantar",
                "en-US": "Dinner",
                "es-ES": "Cena"
        },
        "sleep": {
                "pt-BR": "Dormir",
                "en-US": "Sleep",
                "es-ES": "Dormir"
        },
        "loudNoise": {
                "pt-BR": "Barulho alto",
                "en-US": "Loud noise",
                "es-ES": "Ruido fuerte"
        },
        "sensory_quero_silencio": {
                "pt-BR": "Quero silêncio",
                "en-US": "I want silence",
                "es-ES": "Quiero silencio"
        },
        "tooMuchLight": {
                "pt-BR": "Luz forte",
                "en-US": "Bright light",
                "es-ES": "Luz fuerte"
        },
        "sensory_esta_muito_cheio": {
                "pt-BR": "Está muito cheio",
                "en-US": "It is too crowded",
                "es-ES": "Está muy lleno"
        },
        "sensory_estou_incomodado": {
                "pt-BR": "Estou incomodado",
                "en-US": "I am uncomfortable",
                "es-ES": "Estoy incómodo"
        },
        "sensory_quero_descansar": {
                "pt-BR": "Quero descansar",
                "en-US": "I want to rest",
                "es-ES": "Quiero descansar"
        },
        "sensory_quero_balancar": {
                "pt-BR": "Quero balançar",
                "en-US": "I want to rock",
                "es-ES": "Quiero balancearme"
        },
        "sensory_quero_apertar": {
                "pt-BR": "Quero apertar",
                "en-US": "I want pressure",
                "es-ES": "Quiero presión"
        },
        "sensory_nao_toque_em_mim": {
                "pt-BR": "Não toque em mim",
                "en-US": "Do not touch me",
                "es-ES": "No me toque"
        },
        "sensory_pode_me_abracar": {
                "pt-BR": "Pode me abraçar",
                "en-US": "You can hug me",
                "es-ES": "Puede abrazarme"
        },
        "breakTime": {
                "pt-BR": "Preciso de pausa",
                "en-US": "I need a break",
                "es-ES": "Necesito una pausa"
        },
        "emergency_preciso_de_ajuda": {
                "pt-BR": "Preciso de ajuda",
                "en-US": "I need help",
                "es-ES": "Necesito ayuda"
        },
        "emergency_pain": {
                "pt-BR": "Estou com dor",
                "en-US": "I am in pain",
                "es-ES": "Tengo dolor"
        },
        "emergency_nao_estou_bem": {
                "pt-BR": "Não estou bem",
                "en-US": "I am not fine",
                "es-ES": "No estoy bien"
        },
        "emergency_quero_ir_embora": {
                "pt-BR": "Quero ir embora",
                "en-US": "I want to leave",
                "es-ES": "Quiero irme"
        },
        "emergency_estou_perdido": {
                "pt-BR": "Estou perdido",
                "en-US": "I am lost",
                "es-ES": "Estoy perdido"
        },
        "emergency_chamar_mamae": {
                "pt-BR": "Chamar mamãe",
                "en-US": "Call mom",
                "es-ES": "Llamar a mamá"
        },
        "emergency_chamar_papai": {
                "pt-BR": "Chamar papai",
                "en-US": "Call dad",
                "es-ES": "Llamar a papá"
        },
        "emergency_chamar_professor": {
                "pt-BR": "Chamar professor",
                "en-US": "Call teacher",
                "es-ES": "Llamar al profesor"
        },
        "emergency_banheiro_urgente": {
                "pt-BR": "Banheiro urgente",
                "en-US": "Bathroom urgent",
                "es-ES": "Baño urgente"
        },
        "emergency_machucou": {
                "pt-BR": "Machucou",
                "en-US": "I got hurt",
                "es-ES": "Me lastimé"
        },
        "emergency_pare_agora": {
                "pt-BR": "Pare agora",
                "en-US": "Stop now",
                "es-ES": "Pare ahora"
        },
        "mother": {
                "pt-BR": "Mamãe",
                "en-US": "Mom",
                "es-ES": "Mamá"
        },
        "father": {
                "pt-BR": "Papai",
                "en-US": "Dad",
                "es-ES": "Papá"
        },
        "people_vovo": {
                "pt-BR": "Vovó",
                "en-US": "Grandma",
                "es-ES": "Abuela"
        },
        "people_vovo_2": {
                "pt-BR": "Vovô",
                "en-US": "Grandpa",
                "es-ES": "Abuelo"
        },
        "people_irmao": {
                "pt-BR": "Irmão",
                "en-US": "Brother",
                "es-ES": "Hermano"
        },
        "people_irma": {
                "pt-BR": "Irmã",
                "en-US": "Sister",
                "es-ES": "Hermana"
        },
        "teacher": {
                "pt-BR": "Professor",
                "en-US": "Teacher",
                "es-ES": "Profesor"
        },
        "people_terapeuta": {
                "pt-BR": "Terapeuta",
                "en-US": "Therapist",
                "es-ES": "Terapeuta"
        },
        "people_medico": {
                "pt-BR": "Médico",
                "en-US": "Doctor",
                "es-ES": "Médico"
        },
        "people_amigo": {
                "pt-BR": "Amigo",
                "en-US": "Friend",
                "es-ES": "Amigo"
        },
        "play_bola": {
                "pt-BR": "Bola",
                "en-US": "Ball",
                "es-ES": "Pelota"
        },
        "play_carrinho": {
                "pt-BR": "Carrinho",
                "en-US": "Toy car",
                "es-ES": "Carrito"
        },
        "play_boneca": {
                "pt-BR": "Boneca",
                "en-US": "Doll",
                "es-ES": "Muñeca"
        },
        "play_blocos": {
                "pt-BR": "Blocos",
                "en-US": "Blocks",
                "es-ES": "Bloques"
        },
        "play_quebra_cabeca": {
                "pt-BR": "Quebra-cabeça",
                "en-US": "Puzzle",
                "es-ES": "Rompecabezas"
        },
        "play_desenhar": {
                "pt-BR": "Desenhar",
                "en-US": "Draw",
                "es-ES": "Dibujar"
        },
        "play_massinha": {
                "pt-BR": "Massinha",
                "en-US": "Clay",
                "es-ES": "Plastilina"
        },
        "play_livro": {
                "pt-BR": "Livro",
                "en-US": "Book",
                "es-ES": "Libro"
        },
        "play_musica": {
                "pt-BR": "Música",
                "en-US": "Music",
                "es-ES": "Música"
        },
        "play_desenho": {
                "pt-BR": "Desenho",
                "en-US": "Cartoon",
                "es-ES": "Dibujo animado"
        },
        "play_tablet": {
                "pt-BR": "Tablet",
                "en-US": "Tablet",
                "es-ES": "Tablet"
        },
        "play_parquinho": {
                "pt-BR": "Parquinho",
                "en-US": "Playground",
                "es-ES": "Parque"
        }
};

    /**
     * @description Normaliza código de idioma para pt-BR, en-US ou es-ES.
     * @param {string} language - Código ou locale do navegador/usuário.
     * @returns {string} Código suportado (DEFAULT_LANGUAGE se inválido).
     * @throws {Error} Não propaga exceções.
     */
    function normalizeLanguage(language) {
        if (!language || typeof language !== "string") return DEFAULT_LANGUAGE;
        const normalized = language.toLowerCase();
        if (normalized.startsWith("pt")) return "pt-BR";
        if (normalized.startsWith("en")) return "en-US";
        if (normalized.startsWith("es")) return "es-ES";
        return DEFAULT_LANGUAGE;
    }

    /**
     * @description Detecta idioma preferido do dispositivo via navigator.language.
     * @returns {string} Código normalizado (pt-BR, en-US ou es-ES).
     * @throws {Error} Não propaga exceções.
     */
    function detectDeviceLanguage() {
        return normalizeLanguage(navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE);
    }

    /**
     * @description Lê idioma salvo em localStorage se ainda for suportado.
     * @returns {string|null} Código salvo ou null.
     * @throws {Error} Não propaga exceções.
     */
    function getSavedLanguage() {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);
        return savedLanguage && SUPPORTED_LANGUAGES[savedLanguage] ? savedLanguage : null;
    }

    /**
     * @description Retorna idioma efetivo: preferência salva ou detecção do aparelho.
     * @returns {string} Código BCP 47 suportado.
     * @throws {Error} Não propaga exceções.
     */
    function getCurrentLanguage() {
        return getSavedLanguage() || detectDeviceLanguage();
    }

    /**
     * @description Persiste idioma escolhido no localStorage após normalização.
     * @param {string} language - Código desejado pelo usuário.
     * @returns {string} Código normalizado gravado.
     * @throws {Error} Não propaga exceções.
     */
    function setCurrentLanguage(language) {
        const normalizedLanguage = normalizeLanguage(language);
        localStorage.setItem(STORAGE_KEY, normalizedLanguage);
        return normalizedLanguage;
    }

    /**
     * @description Retorna metadados do idioma (voiceLang, páginas de ajuda/privacidade).
     * @param {string} [language] - Código; usa getCurrentLanguage se omitido.
     * @returns {object} Entrada de SUPPORTED_LANGUAGES ou padrão pt-BR.
     * @throws {Error} Não propaga exceções.
     */
    function getLanguageConfig(language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());
        return SUPPORTED_LANGUAGES[selectedLanguage] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
    }

    /**
     * @description Acessa valor aninhado em objeto por caminho com pontos (ex.: menu.help).
     * @param {object} object - Objeto raiz (ex.: TRANSLATIONS[lang]).
     * @param {string} path - Caminho com separador ".".
     * @returns {*} Valor encontrado ou undefined.
     * @throws {Error} Não propaga exceções.
     */
    function getNestedValue(object, path) {
        return path.split(".").reduce((current, key) => {
            if (current && Object.prototype.hasOwnProperty.call(current, key)) return current[key];
            return undefined;
        }, object);
    }

    /**
     * @description Traduz chave da interface com fallback para pt-BR e depois para a própria chave.
     * @param {string} key - Caminho da tradução (ex.: board.home).
     * @param {string} [language] - Idioma opcional.
     * @returns {string} Texto traduzido.
     * @throws {Error} Não propaga exceções.
     */
    function t(key, language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());
        const translatedValue = getNestedValue(TRANSLATIONS[selectedLanguage], key);
        if (translatedValue !== undefined) return translatedValue;
        const fallbackValue = getNestedValue(TRANSLATIONS[DEFAULT_LANGUAGE], key);
        if (fallbackValue !== undefined) return fallbackValue;
        return key;
    }

    /**
     * @description Aplica data-i18n, placeholders, titles e lang/document.title no DOM.
     * @param {Document|HTMLElement} [rootElement] - Raiz da busca; document se omitido.
     * @returns {void}
     * @throws {Error} Não propaga exceções.
     */
    function applyTranslations(rootElement) {
        const root = rootElement || document;
        const currentLanguage = getCurrentLanguage();

        root.querySelectorAll("[data-i18n]").forEach((element) => {
            element.textContent = t(element.getAttribute("data-i18n"), currentLanguage);
        });

        root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
            element.setAttribute("placeholder", t(element.getAttribute("data-i18n-placeholder"), currentLanguage));
        });

        root.querySelectorAll("[data-i18n-title]").forEach((element) => {
            element.setAttribute("title", t(element.getAttribute("data-i18n-title"), currentLanguage));
        });

        root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
            element.setAttribute("aria-label", t(element.getAttribute("data-i18n-aria-label"), currentLanguage));
        });

        document.documentElement.lang = getLanguageConfig(currentLanguage).code;
        document.title = t("app.windowTitle", currentLanguage);
    }

    /**
     * @description Preenche select de idiomas com SUPPORTED_LANGUAGES e marca o atual.
     * @param {string} [selectId] - ID do select (padrão language-select).
     * @returns {void}
     * @throws {Error} Não propaga exceções.
     */
    function populateLanguageSelect(selectId) {
        const select = document.getElementById(selectId || "language-select");
        if (!select) return;
        select.innerHTML = "";
        Object.values(SUPPORTED_LANGUAGES).forEach((language) => {
            const option = document.createElement("option");
            option.value = language.code;
            option.textContent = language.label;
            if (language.code === getCurrentLanguage()) option.selected = true;
            select.appendChild(option);
        });
    }

    /**
     * @description Altera idioma, reaplica traduções e dispara talktoyou:language-changed.
     * @param {string} language - Novo idioma.
     * @returns {string} Código normalizado aplicado.
     * @throws {Error} Não propaga exceções.
     */
    function changeLanguage(language) {
        const selectedLanguage = setCurrentLanguage(language);
        applyTranslations();
        populateLanguageSelect("language-select");
        window.dispatchEvent(new CustomEvent("talktoyou:language-changed", {
            detail: { language: selectedLanguage, config: getLanguageConfig(selectedLanguage) }
        }));
        return selectedLanguage;
    }

    /**
     * @description Traduz rótulo de card oficial pelo systemKey (não altera cards do usuário).
     * @param {string} systemKey - Chave do dicionário SYSTEM_CARDS.
     * @param {string} [language] - Idioma alvo.
     * @returns {string|null} Texto traduzido ou null se chave desconhecida.
     * @throws {Error} Não propaga exceções.
     */
    function translateSystemCard(systemKey, language) {
        const selectedLanguage = normalizeLanguage(language || getCurrentLanguage());
        if (!systemKey || !SYSTEM_CARDS[systemKey]) return null;
        return SYSTEM_CARDS[systemKey][selectedLanguage] || SYSTEM_CARDS[systemKey][DEFAULT_LANGUAGE] || null;
    }

    /**
     * @description Verifica se systemKey pertence ao dicionário de cards oficiais.
     * @param {string} systemKey - Chave a testar.
     * @returns {boolean} true se existir em SYSTEM_CARDS.
     * @throws {Error} Não propaga exceções.
     */
    function isSystemCard(systemKey) {
        return Boolean(systemKey && SYSTEM_CARDS[systemKey]);
    }

    /**
     * @description API pública de internacionalização exposta em window.TalkToYouI18n.
     * @typedef {object} TalkToYouI18n
     * @property {string} STORAGE_KEY - Chave localStorage do idioma.
     * @property {string} DEFAULT_LANGUAGE - Idioma padrão (pt-BR).
     * @property {object} SUPPORTED_LANGUAGES - Metadados por idioma.
     * @property {object} TRANSLATIONS - Dicionário da interface.
     * @property {object} SYSTEM_CARDS - Traduções por systemKey.
     * @property {function(string): string} normalizeLanguage
     * @property {function(): string} detectDeviceLanguage
     * @property {function(): string|null} getSavedLanguage
     * @property {function(): string} getCurrentLanguage
     * @property {function(string): string} setCurrentLanguage
     * @property {function(string): object} getLanguageConfig
     * @property {function(string, string): string} t
     * @property {function(Document|HTMLElement): void} applyTranslations
     * @property {function(string): void} populateLanguageSelect
     * @property {function(string): string} changeLanguage
     * @property {function(string, string): string|null} translateSystemCard
     * @property {function(string): boolean} isSystemCard
     */
    window.TalkToYouI18n = {
        STORAGE_KEY, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, TRANSLATIONS, SYSTEM_CARDS,
        normalizeLanguage, detectDeviceLanguage, getSavedLanguage, getCurrentLanguage,
        setCurrentLanguage, getLanguageConfig, t, applyTranslations,
        populateLanguageSelect, changeLanguage, translateSystemCard, isSystemCard
    };
})();



/*
============================================================
COMPLEMENTO COMPLETO DOS CARDS OFICIAIS

Este bloco garante tradução dos 144 cards oficiais atualmente usados
na pré-carga do TalkToYou.

Regra de segurança:
Somente cards oficiais identificados por systemKey são traduzidos.
Cards criados pelo usuário permanecem exatamente como foram cadastrados.
============================================================
*/
(function () {
    if (!window.TalkToYouI18n || !window.TalkToYouI18n.SYSTEM_CARDS) {
        return;
    }

    const COMPLETE_SYSTEM_CARDS = {
        "want": {"pt-BR": "Eu Quero", "en-US": "I Want", "es-ES": "Yo Quiero"},
        "communication": {"pt-BR": "Comunicação", "en-US": "Communication", "es-ES": "Comunicación"},
        "feelings": {"pt-BR": "Como Estou", "en-US": "How I Feel", "es-ES": "Cómo Estoy"},
        "food": {"pt-BR": "Comer", "en-US": "Food", "es-ES": "Comer"},
        "drink": {"pt-BR": "Beber", "en-US": "Drink", "es-ES": "Beber"},
        "routine": {"pt-BR": "Rotina", "en-US": "Routine", "es-ES": "Rutina"},
        "sensory": {"pt-BR": "Sensorial", "en-US": "Sensory", "es-ES": "Sensorial"},
        "emergency": {"pt-BR": "Emergência", "en-US": "Emergency", "es-ES": "Emergencia"},
        "people": {"pt-BR": "Pessoas", "en-US": "People", "es-ES": "Personas"},
        "play": {"pt-BR": "Brincar", "en-US": "Play", "es-ES": "Jugar"},
        "water": {"pt-BR": "Água", "en-US": "Water", "es-ES": "Agua"},
        "want_leite": {"pt-BR": "Leite", "en-US": "Milk", "es-ES": "Leche"},
        "want_suco": {"pt-BR": "Suco", "en-US": "Juice", "es-ES": "Jugo"},
        "want_comer": {"pt-BR": "Comer", "en-US": "Food", "es-ES": "Comer"},
        "bathroom": {"pt-BR": "Banheiro", "en-US": "Bathroom", "es-ES": "Baño"},
        "help": {"pt-BR": "Ajuda", "en-US": "Help", "es-ES": "Ayuda"},
        "want_brincar": {"pt-BR": "Brincar", "en-US": "Play", "es-ES": "Jugar"},
        "want_colo": {"pt-BR": "Colo", "en-US": "Lap", "es-ES": "Regazo"},
        "want_abraco": {"pt-BR": "Abraço", "en-US": "Hug", "es-ES": "Abrazo"},
        "want_sleep": {"pt-BR": "Dormir", "en-US": "Sleep", "es-ES": "Dormir"},
        "want_passear": {"pt-BR": "Passear", "en-US": "Go for a walk", "es-ES": "Pasear"},
        "want_desenho": {"pt-BR": "Desenho", "en-US": "Cartoon", "es-ES": "Dibujos"},
        "want_musica": {"pt-BR": "Música", "en-US": "Music", "es-ES": "Música"},
        "want_celular": {"pt-BR": "Celular", "en-US": "Phone", "es-ES": "Celular"},
        "want_ficar_sozinho": {"pt-BR": "Ficar sozinho", "en-US": "Be alone", "es-ES": "Estar solo"},
        "yes": {"pt-BR": "Sim", "en-US": "Yes", "es-ES": "Sí"},
        "no": {"pt-BR": "Não", "en-US": "No", "es-ES": "No"},
        "communication_mais": {"pt-BR": "Mais", "en-US": "More", "es-ES": "Más"},
        "communication_acabou": {"pt-BR": "Acabou", "en-US": "Finished", "es-ES": "Terminó"},
        "communication_quero": {"pt-BR": "Quero", "en-US": "I want", "es-ES": "Quiero"},
        "communication_nao_quero": {"pt-BR": "Não quero", "en-US": "I do not want", "es-ES": "No quiero"},
        "communication_ajuda": {"pt-BR": "Ajuda", "en-US": "Help", "es-ES": "Ayuda"},
        "stop": {"pt-BR": "Parar", "en-US": "Stop", "es-ES": "Parar"},
        "communication_espera": {"pt-BR": "Espera", "en-US": "Wait", "es-ES": "Espera"},
        "communication_vamos": {"pt-BR": "Vamos", "en-US": "Let's go", "es-ES": "Vamos"},
        "communication_aqui": {"pt-BR": "Aqui", "en-US": "Here", "es-ES": "Aquí"},
        "communication_la": {"pt-BR": "Lá", "en-US": "There", "es-ES": "Allá"},
        "communication_de_novo": {"pt-BR": "De novo", "en-US": "Again", "es-ES": "Otra vez"},
        "communication_gostei": {"pt-BR": "Gostei", "en-US": "I liked it", "es-ES": "Me gustó"},
        "communication_nao_gostei": {"pt-BR": "Não gostei", "en-US": "I did not like it", "es-ES": "No me gustó"},
        "communication_obrigado": {"pt-BR": "Obrigado", "en-US": "Thank you", "es-ES": "Gracias"},
        "communication_desculpa": {"pt-BR": "Desculpa", "en-US": "Sorry", "es-ES": "Perdón"},
        "happy": {"pt-BR": "Feliz", "en-US": "Happy", "es-ES": "Feliz"},
        "sad": {"pt-BR": "Triste", "en-US": "Sad", "es-ES": "Triste"},
        "feelings_bravo": {"pt-BR": "Bravo", "en-US": "Angry", "es-ES": "Enojado"},
        "feelings_com_medo": {"pt-BR": "Com medo", "en-US": "Scared", "es-ES": "Con miedo"},
        "feelings_ansioso": {"pt-BR": "Ansioso", "en-US": "Anxious", "es-ES": "Ansioso"},
        "feelings_cansado": {"pt-BR": "Cansado", "en-US": "Tired", "es-ES": "Cansado"},
        "pain": {"pt-BR": "Com dor", "en-US": "In pain", "es-ES": "Con dolor"},
        "hungry": {"pt-BR": "Com fome", "en-US": "Hungry", "es-ES": "Con hambre"},
        "thirsty": {"pt-BR": "Com sede", "en-US": "Thirsty", "es-ES": "Con sed"},
        "feelings_com_sono": {"pt-BR": "Com sono", "en-US": "Sleepy", "es-ES": "Con sueño"},
        "feelings_calor": {"pt-BR": "Calor", "en-US": "Hot", "es-ES": "Calor"},
        "feelings_frio": {"pt-BR": "Frio", "en-US": "Cold", "es-ES": "Frío"},
        "feelings_doente": {"pt-BR": "Doente", "en-US": "Sick", "es-ES": "Enfermo"},
        "feelings_nervoso": {"pt-BR": "Nervoso", "en-US": "Nervous", "es-ES": "Nervioso"},
        "feelings_confuso": {"pt-BR": "Confuso", "en-US": "Confused", "es-ES": "Confundido"},
        "feelings_estou_bem": {"pt-BR": "Estou bem", "en-US": "I am okay", "es-ES": "Estoy bien"},
        "feelings_nao_estou_bem": {"pt-BR": "Não estou bem", "en-US": "I am not okay", "es-ES": "No estoy bien"},
        "food_maca": {"pt-BR": "Maçã", "en-US": "Apple", "es-ES": "Manzana"},
        "food_banana": {"pt-BR": "Banana", "en-US": "Banana", "es-ES": "Banana"},
        "food_pao": {"pt-BR": "Pão", "en-US": "Bread", "es-ES": "Pan"},
        "food_arroz": {"pt-BR": "Arroz", "en-US": "Rice", "es-ES": "Arroz"},
        "food_feijao": {"pt-BR": "Feijão", "en-US": "Beans", "es-ES": "Frijoles"},
        "food_macarrao": {"pt-BR": "Macarrão", "en-US": "Pasta", "es-ES": "Pasta"},
        "food_carne": {"pt-BR": "Carne", "en-US": "Meat", "es-ES": "Carne"},
        "food_frango": {"pt-BR": "Frango", "en-US": "Chicken", "es-ES": "Pollo"},
        "food_ovo": {"pt-BR": "Ovo", "en-US": "Egg", "es-ES": "Huevo"},
        "food_biscoito": {"pt-BR": "Biscoito", "en-US": "Cookie", "es-ES": "Galleta"},
        "food_bolo": {"pt-BR": "Bolo", "en-US": "Cake", "es-ES": "Pastel"},
        "food_chocolate": {"pt-BR": "Chocolate", "en-US": "Chocolate", "es-ES": "Chocolate"},
        "food_sorvete": {"pt-BR": "Sorvete", "en-US": "Ice cream", "es-ES": "Helado"},
        "food_pizza": {"pt-BR": "Pizza", "en-US": "Pizza", "es-ES": "Pizza"},
        "food_batata_frita": {"pt-BR": "Batata frita", "en-US": "French fries", "es-ES": "Papas fritas"},
        "food_almoco": {"pt-BR": "Almoço", "en-US": "Lunch", "es-ES": "Almuerzo"},
        "food_jantar": {"pt-BR": "Jantar", "en-US": "Dinner", "es-ES": "Cena"},
        "food_lanche": {"pt-BR": "Lanche", "en-US": "Snack", "es-ES": "Merienda"},
        "drink_agua": {"pt-BR": "Água", "en-US": "Water", "es-ES": "Agua"},
        "drink_leite": {"pt-BR": "Leite", "en-US": "Milk", "es-ES": "Leche"},
        "drink_suco": {"pt-BR": "Suco", "en-US": "Juice", "es-ES": "Jugo"},
        "drink_vitamina": {"pt-BR": "Vitamina", "en-US": "Smoothie", "es-ES": "Batido"},
        "drink_iogurte": {"pt-BR": "Iogurte", "en-US": "Yogurt", "es-ES": "Yogur"},
        "drink_achocolatado": {"pt-BR": "Achocolatado", "en-US": "Chocolate milk", "es-ES": "Leche con chocolate"},
        "drink_cha": {"pt-BR": "Chá", "en-US": "Tea", "es-ES": "Té"},
        "drink_refrigerante": {"pt-BR": "Refrigerante", "en-US": "Soda", "es-ES": "Refresco"},
        "routine_acordar": {"pt-BR": "Acordar", "en-US": "Wake up", "es-ES": "Despertar"},
        "routine_escovar_dentes": {"pt-BR": "Escovar dentes", "en-US": "Brush teeth", "es-ES": "Cepillarse los dientes"},
        "routine_banheiro": {"pt-BR": "Banheiro", "en-US": "Bathroom", "es-ES": "Baño"},
        "bath": {"pt-BR": "Banho", "en-US": "Bath", "es-ES": "Baño"},
        "routine_trocar_roupa": {"pt-BR": "Trocar roupa", "en-US": "Change clothes", "es-ES": "Cambiar ropa"},
        "routine_cafe_da_manha": {"pt-BR": "Café da manhã", "en-US": "Breakfast", "es-ES": "Desayuno"},
        "school": {"pt-BR": "Escola", "en-US": "School", "es-ES": "Escuela"},
        "routine_tarefa": {"pt-BR": "Tarefa", "en-US": "Homework", "es-ES": "Tarea"},
        "routine_terapia": {"pt-BR": "Terapia", "en-US": "Therapy", "es-ES": "Terapia"},
        "medicine": {"pt-BR": "Remédio", "en-US": "Medicine", "es-ES": "Medicamento"},
        "routine_almoco": {"pt-BR": "Almoço", "en-US": "Lunch", "es-ES": "Almuerzo"},
        "routine_descansar": {"pt-BR": "Descansar", "en-US": "Rest", "es-ES": "Descansar"},
        "routine_passear": {"pt-BR": "Passear", "en-US": "Go for a walk", "es-ES": "Pasear"},
        "routine_jantar": {"pt-BR": "Jantar", "en-US": "Dinner", "es-ES": "Cena"},
        "sleep": {"pt-BR": "Dormir", "en-US": "Sleep", "es-ES": "Dormir"},
        "loudNoise": {"pt-BR": "Barulho alto", "en-US": "Loud noise", "es-ES": "Ruido fuerte"},
        "sensory_quero_silencio": {"pt-BR": "Quero silêncio", "en-US": "I want silence", "es-ES": "Quiero silencio"},
        "tooMuchLight": {"pt-BR": "Luz forte", "en-US": "Bright light", "es-ES": "Luz fuerte"},
        "sensory_esta_muito_cheio": {"pt-BR": "Está muito cheio", "en-US": "It is too crowded", "es-ES": "Está muy lleno"},
        "sensory_estou_incomodado": {"pt-BR": "Estou incomodado", "en-US": "I am uncomfortable", "es-ES": "Estoy incómodo"},
        "sensory_quero_descansar": {"pt-BR": "Quero descansar", "en-US": "I want to rest", "es-ES": "Quiero descansar"},
        "sensory_quero_balancar": {"pt-BR": "Quero balançar", "en-US": "I want to swing", "es-ES": "Quiero balancearme"},
        "sensory_quero_apertar": {"pt-BR": "Quero apertar", "en-US": "I want pressure", "es-ES": "Quiero presión"},
        "sensory_nao_toque_em_mim": {"pt-BR": "Não toque em mim", "en-US": "Do not touch me", "es-ES": "No me toque"},
        "sensory_pode_me_abracar": {"pt-BR": "Pode me abraçar", "en-US": "You can hug me", "es-ES": "Puede abrazarme"},
        "breakTime": {"pt-BR": "Preciso de pausa", "en-US": "I need a break", "es-ES": "Necesito una pausa"},
        "emergency_preciso_de_ajuda": {"pt-BR": "Preciso de ajuda", "en-US": "I need help", "es-ES": "Necesito ayuda"},
        "emergency_pain": {"pt-BR": "Estou com dor", "en-US": "I am in pain", "es-ES": "Tengo dolor"},
        "emergency_nao_estou_bem": {"pt-BR": "Não estou bem", "en-US": "I am not okay", "es-ES": "No estoy bien"},
        "emergency_quero_ir_embora": {"pt-BR": "Quero ir embora", "en-US": "I want to go home", "es-ES": "Quiero irme"},
        "emergency_estou_perdido": {"pt-BR": "Estou perdido", "en-US": "I am lost", "es-ES": "Estoy perdido"},
        "emergency_chamar_mamae": {"pt-BR": "Chamar mamãe", "en-US": "Call mom", "es-ES": "Llamar a mamá"},
        "emergency_chamar_papai": {"pt-BR": "Chamar papai", "en-US": "Call dad", "es-ES": "Llamar a papá"},
        "emergency_chamar_professor": {"pt-BR": "Chamar professor", "en-US": "Call teacher", "es-ES": "Llamar al profesor"},
        "emergency_banheiro_urgente": {"pt-BR": "Banheiro urgente", "en-US": "Bathroom urgently", "es-ES": "Baño urgente"},
        "emergency_machucou": {"pt-BR": "Machucou", "en-US": "It hurts", "es-ES": "Me lastimé"},
        "emergency_pare_agora": {"pt-BR": "Pare agora", "en-US": "Stop now", "es-ES": "Pare ahora"},
        "mother": {"pt-BR": "Mamãe", "en-US": "Mom", "es-ES": "Mamá"},
        "father": {"pt-BR": "Papai", "en-US": "Dad", "es-ES": "Papá"},
        "people_vovo": {"pt-BR": "Vovó", "en-US": "Grandma", "es-ES": "Abuela"},
        "people_vovo_2": {"pt-BR": "Vovô", "en-US": "Grandpa", "es-ES": "Abuelo"},
        "people_irmao": {"pt-BR": "Irmão", "en-US": "Brother", "es-ES": "Hermano"},
        "people_irma": {"pt-BR": "Irmã", "en-US": "Sister", "es-ES": "Hermana"},
        "teacher": {"pt-BR": "Professor", "en-US": "Teacher", "es-ES": "Profesor"},
        "people_terapeuta": {"pt-BR": "Terapeuta", "en-US": "Therapist", "es-ES": "Terapeuta"},
        "people_medico": {"pt-BR": "Médico", "en-US": "Doctor", "es-ES": "Médico"},
        "people_amigo": {"pt-BR": "Amigo", "en-US": "Friend", "es-ES": "Amigo"},
        "play_bola": {"pt-BR": "Bola", "en-US": "Ball", "es-ES": "Pelota"},
        "play_carrinho": {"pt-BR": "Carrinho", "en-US": "Toy car", "es-ES": "Carrito"},
        "play_boneca": {"pt-BR": "Boneca", "en-US": "Doll", "es-ES": "Muñeca"},
        "play_blocos": {"pt-BR": "Blocos", "en-US": "Blocks", "es-ES": "Bloques"},
        "play_quebra_cabeca": {"pt-BR": "Quebra-cabeça", "en-US": "Puzzle", "es-ES": "Rompecabezas"},
        "play_desenhar": {"pt-BR": "Desenhar", "en-US": "Draw", "es-ES": "Dibujar"},
        "play_massinha": {"pt-BR": "Massinha", "en-US": "Play dough", "es-ES": "Plastilina"},
        "play_livro": {"pt-BR": "Livro", "en-US": "Book", "es-ES": "Libro"},
        "play_musica": {"pt-BR": "Música", "en-US": "Music", "es-ES": "Música"},
        "play_desenho": {"pt-BR": "Desenho", "en-US": "Cartoon", "es-ES": "Dibujos"},
        "play_tablet": {"pt-BR": "Tablet", "en-US": "Tablet", "es-ES": "Tableta"},
        "play_parquinho": {"pt-BR": "Parquinho", "en-US": "Playground", "es-ES": "Parque infantil"},
    };

    Object.assign(window.TalkToYouI18n.SYSTEM_CARDS, COMPLETE_SYSTEM_CARDS);
})();
