/* ============================================================
   TalkToYou - Learning Service
   Módulo: Aprender

   Objetivo:
   Criar uma camada independente de aprendizagem comunicacional
   assistida, sem alterar a lógica principal dos cards.

   Princípios:
   - Não modifica cards existentes.
   - Apenas lê cards já cadastrados.
   - Funciona offline.
   - Não usa nuvem.
   - Evita gamificação pesada.
   - Mantém foco em comunicação, acessibilidade cognitiva
     e adaptação gradual ao uso do aplicativo.

   Este arquivo foi criado de forma isolada para preservar
   a estabilidade do sistema principal.
============================================================ */

window.TalkToYouLearning = (() => {

    const MODULE_FOLDER_ID = "learning-module-folder";
    const MODULE_ENABLED_KEY = "talktoyou_learning_enabled";

    let appAdapter = null;
    let currentActivity = null;
    let currentStepIndex = 0;
    let selectedSequence = [];

    /* ------------------------------------------------------------
       Adaptador
       ------------------------------------------------------------
       O módulo não acessa diretamente funções internas do app.
       Ele recebe um adaptador com funções seguras, evitando
       acoplamento forte com a arquitetura principal.
    ------------------------------------------------------------ */
    function init(adapter) {
        appAdapter = adapter;

        if (!appAdapter) {
            console.warn("[Aprender] Adaptador não informado.");
            return;
        }

        console.info("[Aprender] Módulo inicializado com segurança.");
    }

    function isEnabled() {
        return localStorage.getItem(MODULE_ENABLED_KEY) === "true";
    }

    function setEnabled(value) {
        localStorage.setItem(MODULE_ENABLED_KEY, value ? "true" : "false");
    }

    /* ------------------------------------------------------------
       Card oficial do módulo
       ------------------------------------------------------------
       Este card é virtual. Ele não precisa ser salvo no banco.
       Assim, não polui os dados reais do usuário.
    ------------------------------------------------------------ */
    function getLearningCard() {
        if (!isEnabled()) return null;

        return {
            id: MODULE_FOLDER_ID,
            label: "Aprender",
            emoji: "📘",
            type: "learning-folder",
            parentId: 0,
            image: "",
            virtual: true
        };
    }

    function getLearningHomeCards() {
        return [
            {
                id: "learning-start",
                label: "Iniciar",
                emoji: "▶️",
                type: "learning-action",
                virtual: true
            },
            {
                id: "learning-back",
                label: "Voltar",
                emoji: "⬅️",
                type: "learning-action",
                virtual: true
            }
        ];
    }

    /* ------------------------------------------------------------
       Primeira atividade simples
       ------------------------------------------------------------
       Atividade: construção comunicacional assistida.

       Exemplo:
       O sistema fala: "Quero água"
       O usuário toca: "Quero" + "Água"

       A lógica é simples propositalmente.
       O objetivo inicial é validar fluxo, acessibilidade,
       navegação e segurança arquitetural.
    ------------------------------------------------------------ */
    async function startSimpleActivity() {
        const availableCards = await getSafeCards();
    
        /*
        ============================================================
        Banco simples de atividades iniciais
    
        Cada atividade representa uma construção comunicacional curta.
    
        A escolha aleatória evita repetição mecânica e permite testar
        diferentes combinações sem tornar o módulo complexo.
        ============================================================
        */
        const activityTemplates = [
            {
                phrase: "Quero água",
                sequence: [
                    ["quero", "eu quero"],
                    ["água", "agua"]
                ],
                distractors: [
                    ["maçã", "maca"],
                    ["bola"]
                ],
                fallback: [
                    createFallbackCard("Quero", "🙋"),
                    createFallbackCard("Água", "💧"),
                    createFallbackCard("Maçã", "🍎"),
                    createFallbackCard("Bola", "⚽")
                ]
            },
            {
                phrase: "Quero comer",
                sequence: [
                    ["quero", "eu quero"],
                    ["comer"]
                ],
                distractors: [
                    ["água", "agua"],
                    ["brincar"]
                ],
                fallback: [
                    createFallbackCard("Quero", "🙋"),
                    createFallbackCard("Comer", "🍽️"),
                    createFallbackCard("Água", "💧"),
                    createFallbackCard("Brincar", "🧸")
                ]
            },
            {
                phrase: "Estou feliz",
                sequence: [
                    ["estou", "eu estou"],
                    ["feliz"]
                ],
                distractors: [
                    ["triste"],
                    ["cansado", "cansada"]
                ],
                fallback: [
                    createFallbackCard("Estou", "🙋"),
                    createFallbackCard("Feliz", "😊"),
                    createFallbackCard("Triste", "😢"),
                    createFallbackCard("Cansado", "😴")
                ]
            },
            {
                phrase: "Quero brincar",
                sequence: [
                    ["quero", "eu quero"],
                    ["brincar"]
                ],
                distractors: [
                    ["água", "agua"],
                    ["remédio", "remedio"]
                ],
                fallback: [
                    createFallbackCard("Quero", "🙋"),
                    createFallbackCard("Brincar", "🧸"),
                    createFallbackCard("Água", "💧"),
                    createFallbackCard("Remédio", "💊")
                ]
            },
            {
                phrase: "Quero mamãe",
                sequence: [
                    ["quero", "eu quero"],
                    ["mamãe", "mamae", "mãe", "mae"]
                ],
                distractors: [
                    ["papai"],
                    ["água", "agua"]
                ],
                fallback: [
                    createFallbackCard("Quero", "🙋"),
                    createFallbackCard("Mamãe", "👩"),
                    createFallbackCard("Papai", "👨"),
                    createFallbackCard("Água", "💧")
                ]
            }
        ];
    
        const template =
            activityTemplates[
                Math.floor(Math.random() * activityTemplates.length)
            ];
    
        const expectedSequence = template.sequence.map((labels, index) => {
            return findCardByLabel(availableCards, labels) || template.fallback[index];
        });
    
        const distractorCards = template.distractors.map((labels, index) => {
            const fallbackIndex = expectedSequence.length + index;
            return findCardByLabel(availableCards, labels) || template.fallback[fallbackIndex];
        });
    
        currentActivity = {
            phrase: template.phrase,
            expectedSequence,
            options: shuffleCards([
                ...expectedSequence,
                ...distractorCards
            ])
        };
    
        currentStepIndex = 0;
        selectedSequence = [];
    
        speak(currentActivity.phrase);
    
        return {
            phrase: currentActivity.phrase,
            options: currentActivity.options,
            expectedSequence: currentActivity.expectedSequence
        };
    }

    function handleActivityCardClick(card) {
        if (!currentActivity) return;

        const expectedCard = currentActivity.expectedSequence[currentStepIndex];

        selectedSequence.push(card);

        if (normalize(card.label) === normalize(expectedCard.label)) {
            currentStepIndex++;

            if (currentStepIndex >= currentActivity.expectedSequence.length) {
                speakPositiveFeedback();
                resetActivityState();

                return {
                    status: "completed",
                    message: "Muito bem!"
                };
            }

            return {
                status: "correct-step",
                message: "Continue"
            };
        }

        speak("Vamos tentar de novo.");

        selectedSequence = [];
        currentStepIndex = 0;

        return {
            status: "retry",
            message: "Vamos tentar de novo."
        };
    }

    function resetActivityState() {
        currentActivity = null;
        currentStepIndex = 0;
        selectedSequence = [];
    }

    /* ------------------------------------------------------------
       Leitura segura dos cards existentes
       ------------------------------------------------------------
       O módulo apenas lê cards já existentes.
       Nenhuma alteração é feita na base principal.
    ------------------------------------------------------------ */
    function getSafeCards() {
        if (!appAdapter || typeof appAdapter.getCards !== "function") {
            return [];
        }

        const cards = appAdapter.getCards();

        if (!Array.isArray(cards)) return [];

        return cards.filter(card =>
            card &&
            card.label &&
            card.type !== "folder" &&
            card.type !== "learning-folder"
        );
    }

    function findCardByLabel(cards, possibleLabels) {
        return cards.find(card =>
            possibleLabels.includes(normalize(card.label))
        );
    }

    function createFallbackCard(label, emoji) {
        return {
            id: `learning-fallback-${normalize(label)}`,
            label,
            emoji,
            type: "learning-fallback",
            virtual: true
        };
    }

    function normalize(text) {
        return String(text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    /* ------------------------------------------------------------
       Voz e reforço positivo
       ------------------------------------------------------------
       Inicialmente usa TTS nativo do navegador.
       Futuramente poderá aceitar áudios afetivos personalizados.
    ------------------------------------------------------------ */
    function speak(text) {
        if (!text || !window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getCurrentLanguage();
        utterance.rate = 0.9;
        utterance.pitch = 1;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    function speakPositiveFeedback() {
        speak("Muito bem!");
    }

    function getCurrentLanguage() {
        if (
            appAdapter &&
            typeof appAdapter.getLanguage === "function"
        ) {
            return appAdapter.getLanguage();
        }

        return "pt-BR";
    }

    function shuffleCards(cards) {
        return [...cards].sort(() => Math.random() - 0.5);
    }

    return {
        init,
        isEnabled,
        setEnabled,
        getLearningCard,
        getLearningHomeCards,
        startSimpleActivity,
        handleActivityCardClick
    };

})();