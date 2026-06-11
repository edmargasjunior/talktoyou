/**
 * @file learning-service.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description máquina de estados do módulo Aprender
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */

/**
 * @description Fábrica IIFE que expõe a API pública do módulo Aprender (TalkToYouLearning).
 * @returns {object} Objeto com métodos de estado, configuração e jogo.
 */
window.TalkToYouLearning = (() => {

    const MODULE_FOLDER_ID = "learning-module-folder";
    const MODULE_ENABLED_KEY = "talktoyou_learning_enabled";
    const SELECTED_LEARNING_FOLDER_KEY = "selected_learning_folder";
    const DISTRACTOR_COUNT = 3;

    /**
     * @description Fases do fluxo do jogo Aprender (máquina de estados).
     * @enum {string}
     */
    const PHASE = {
        CONFIG: "config",
        PLAYING: "playing",
        SUCCESS: "success"
    };

    /**
     * @type {{
     *   getFolder: function(number): Promise<object|null|undefined>,
     *   getChildCards: function(number): Promise<Array>,
     *   getDistractorCards: function(number, Array<number|string>, number): Promise<Array>,
     *   playSequence: function(Array): Promise<void>,
     *   getText: function(string): string,
     *   getLanguage: function(): string
     * }|null}
     */
    let appAdapter = null;

    /**
     * @description Estado interno único do módulo Aprender.
     * @type {{
     *   phase: string,
     *   folderId: number|null,
     *   parentFolder: object|null,
     *   targetChild: object|null,
     *   correctSequenceIds: Array<number|string>,
     *   userSequence: Array<number|string>,
     *   boardCards: Array<object>,
     *   instruction: string,
     *   challengeSpeechItems: Array<object>,
     *   boardInputLocked: boolean,
     *   processingClick: boolean
     * }}
     */
    let gameState = createEmptyState();

    /**
     * @description Cria estado vazio da máquina de estados.
     * @returns {object} Estado inicial limpo.
     */
    function createEmptyState() {
        return {
            phase: PHASE.CONFIG,
            folderId: null,
            parentFolder: null,
            targetChild: null,
            correctSequenceIds: [],
            userSequence: [],
            boardCards: [],
            instruction: "",
            challengeSpeechItems: [],
            boardInputLocked: false,
            processingClick: false
        };
    }

    /**
     * @description Inicializa adaptador de leitura Dexie, áudio e i18n do app.js.
     * @param {{
     *   getFolder?: function(number): Promise<object|null|undefined>,
     *   getChildCards?: function(number): Promise<Array>,
     *   getDistractorCards?: function(number, Array, number): Promise<Array>,
     *   playSequence?: function(Array): Promise<void>,
     *   getText?: function(string): string,
     *   getLanguage?: function(): string
     * }} adapter - Pontes seguras com o PWA principal.
     * @returns {void}
     */
    function init(adapter) {
        appAdapter = adapter;

        if (!appAdapter) {
            console.warn("[Aprender] Adaptador não informado.");
            return;
        }

        resetGame();
        console.info("[Aprender] Máquina de estados inicializada.");
    }

    /**
     * @description Indica se o módulo está ativo no menu do PWA.
     * @returns {boolean}
     */
    function isEnabled() {
        return localStorage.getItem(MODULE_ENABLED_KEY) === "true";
    }

    /**
     * @description Liga ou desliga o módulo Aprender.
     * @param {boolean} value - Novo estado do toggle.
     * @returns {void}
     */
    function setEnabled(value) {
        localStorage.setItem(MODULE_ENABLED_KEY, value ? "true" : "false");
    }

    /**
     * @description Reseta completamente a sessão de jogo (estado CONFIG).
     * @returns {void}
     */
    function resetGame() {
        gameState = createEmptyState();
        gameState.phase = PHASE.CONFIG;
    }

    /**
     * @description Retorna cópia do estado atual para renderização no app.js.
     * @returns {object} Snapshot do gameState.
     */
    function getState() {
        return {
            phase: gameState.phase,
            folderId: gameState.folderId,
            instruction: gameState.instruction,
            boardCards: [...gameState.boardCards],
            correctSequenceIds: [...gameState.correctSequenceIds],
            userSequence: [...gameState.userSequence],
            usesCompose: usesComposeMode(gameState.parentFolder),
            boardInputLocked: gameState.boardInputLocked,
            processingClick: gameState.processingClick
        };
    }

    /**
     * @description Indica se cliques no tabuleiro devem ser aceitos (evita duplo clique e fantasmas).
     * @returns {boolean} false durante processamento ou após acerto final.
     */
    function isBoardInteractionAllowed() {
        return (
            gameState.phase === PHASE.PLAYING &&
            !gameState.boardInputLocked &&
            !gameState.processingClick
        );
    }

    /**
     * @description Retorna fase atual (atalho para UI).
     * @returns {string} Valor de PHASE.*
     */
    function getPhase() {
        return gameState.phase;
    }

    /**
     * @description Traduz chave i18n via adaptador.
     * @param {string} key - Caminho aninhado (ex.: learning.noChildren).
     * @returns {string}
     */
    function translate(key) {
        if (appAdapter && typeof appAdapter.getText === "function") {
            const text = appAdapter.getText(key);

            if (text && text !== key) {
                return text;
            }
        }

        return key;
    }

    /**
     * @description Substitui tokens {nome} em strings traduzidas.
     * @param {string} template - Modelo com placeholders.
     * @param {Record<string, string>} values - Valores de substituição.
     * @returns {string}
     */
    function formatTemplate(template, values) {
        let output = String(template || "");

        Object.keys(values).forEach((token) => {
            output = output.replace(`{${token}}`, values[token]);
        });

        return output;
    }

    /**
     * @description Card virtual da raiz que abre o módulo Aprender.
     * @returns {object|null}
     */
    function getLearningCard() {
        if (!isEnabled()) {
            return null;
        }

        return {
            id: MODULE_FOLDER_ID,
            label: translate("learning.title"),
            emoji: "📘",
            type: "learning-folder",
            parentId: 0,
            image: "",
            virtual: true
        };
    }

    /**
     * @description Ações da tela CONFIG (Iniciar Jogo / Voltar).
     * @returns {Array<object>}
     */
    function getConfigActions() {
        return [
            {
                id: "learning-start",
                label: translate("learning.startGame"),
                emoji: "▶️",
                type: "learning-action",
                virtual: true
            },
            {
                id: "learning-back",
                label: translate("learning.back"),
                emoji: "⬅️",
                type: "learning-action",
                virtual: true
            }
        ];
    }

    /**
     * @description Verifica composeMode na pasta pai.
     * @param {object|null} folder - Pasta do Dexie.
     * @returns {boolean}
     */
    function usesComposeMode(folder) {
        return Boolean(folder && folder.composeMode === true);
    }

    /**
     * @description Rótulo exibido/falado do item (i18n + personalização).
     * @param {object} item - Card ou pasta.
     * @returns {string}
     */
    function getItemLabel(item) {
        if (!item) {
            return "";
        }

        if (typeof window.getDisplayLabel === "function") {
            return window.getDisplayLabel(item);
        }

        return item.label || "";
    }

    /**
     * @description Embaralha array (cópia).
     * @param {Array} list - Lista de entrada.
     * @returns {Array}
     */
    function shuffle(list) {
        return [...list].sort(() => Math.random() - 0.5);
    }

    /**
     * @description Sorteia um card filho da pasta.
     * @param {Array<object>} children - Cards filhos diretos.
     * @returns {object|null}
     */
    function pickRandomChild(children) {
        if (!children || children.length === 0) {
            return null;
        }

        return children[Math.floor(Math.random() * children.length)];
    }

    /**
     * @description Monta IDs da sequência correta conforme composeMode.
     * @param {object} parentFolder - Pasta pai do Dexie.
     * @param {object} targetChild - Card filho sorteado.
     * @returns {Array<number|string>}
     */
    function buildCorrectSequenceIds(parentFolder, targetChild) {
        if (usesComposeMode(parentFolder)) {
            return [parentFolder.id, targetChild.id];
        }

        return [targetChild.id];
    }

    /**
     * @description Monta texto da instrução visual do desafio.
     * @param {object} parentFolder - Pasta pai.
     * @param {object} targetChild - Card objetivo.
     * @returns {string}
     */
    function buildInstruction(parentFolder, targetChild) {
        if (usesComposeMode(parentFolder)) {
            return formatTemplate(translate("learning.buildPhraseCompose"), {
                parent: getItemLabel(parentFolder),
                child: getItemLabel(targetChild)
            });
        }

        return formatTemplate(translate("learning.buildPhraseSimple"), {
            child: getItemLabel(targetChild)
        });
    }

    /**
     * @description Itens que devem ser falados no desafio (fase de áudio única).
     * @param {object} parentFolder - Pasta pai.
     * @param {object} targetChild - Card filho sorteado.
     * @returns {Array<object>}
     */
    function buildChallengeSpeechItems(parentFolder, targetChild) {
        if (usesComposeMode(parentFolder)) {
            return [parentFolder, targetChild];
        }

        return [targetChild];
    }

    /**
     * @description Monta tabuleiro: pai (se compose), filho correto e distratores de outras pastas.
     * @param {object} parentFolder - Pasta pai.
     * @param {object} targetChild - Card objetivo.
     * @param {number} folderId - ID da pasta selecionada.
     * @returns {Promise<Array<object>>}
     */
    async function buildBoardCards(parentFolder, targetChild, folderId) {
        const excludeIds = [targetChild.id];

        if (usesComposeMode(parentFolder)) {
            excludeIds.push(parentFolder.id);
        }

        let distractors = [];

        if (appAdapter && typeof appAdapter.getDistractorCards === "function") {
            distractors = await appAdapter.getDistractorCards(
                folderId,
                excludeIds,
                DISTRACTOR_COUNT
            );
        }

        const board = [];

        if (usesComposeMode(parentFolder)) {
            board.push(parentFolder);
        }

        board.push(targetChild, ...distractors);

        return shuffle(board);
    }

    /**
     * @description Reproduz áudio de um único card (audioBlob ou TTS).
     * @param {object} item - Card ou pasta do Dexie.
     * @returns {Promise<void>}
     */
    async function playSingleItemAudio(item) {
        if (!item || !appAdapter || typeof appAdapter.playSequence !== "function") {
            return;
        }

        await appAdapter.playSequence([item]);
    }

    /**
     * @description Reproduz sequência do desafio (somente após Iniciar Jogo).
     * @param {Array<object>} items - Pai + filho ou só filho.
     * @returns {Promise<void>}
     */
    async function playChallengeAudio(items) {
        if (!items.length || !appAdapter || typeof appAdapter.playSequence !== "function") {
            return;
        }

        await appAdapter.playSequence(items);
    }

    /**
     * @description Fala texto via TTS do adaptador (não bloqueia).
     * @param {string} text - Texto a reproduzir.
     * @returns {void}
     */
    function speak(text) {
        if (!text || !appAdapter || typeof appAdapter.playSequence !== "function") {
            return;
        }

        appAdapter.playSequence([{ label: text }]);
    }

    /**
     * @description Fala texto e aguarda término (TTS ou sequência curta).
     * @param {string} text - Texto a reproduzir.
     * @returns {Promise<void>}
     */
    async function speakAsync(text) {
        if (!text || !appAdapter || typeof appAdapter.playSequence !== "function") {
            return;
        }

        await appAdapter.playSequence([{ label: text }]);
    }

    /**
     * @description Feedback de sucesso: apenas TTS de parabéns (áudio do último card já veio do clique).
     * @returns {Promise<void>}
     */
    async function playSuccessFeedback() {
        await speakAsync(translate("learning.feedback.success"));
    }

    /**
     * @description PASSO 1–2 — Carrega Dexie via adaptador, monta desafio e prepara UI; áudio só após playPreparedChallengeAudio().
     * @param {number|string} folderId - ID da pasta selecionada em #selected_learning_folder.
     * @returns {Promise<{ ok: boolean, error?: string, alertMessage?: string }>} Resultado da validação e montagem do tabuleiro.
     */
    async function startGame(folderId) {
        resetGame();

        const numericFolderId = parseInt(folderId, 10);

        if (Number.isNaN(numericFolderId)) {
            return {
                ok: false,
                error: "invalidFolder",
                alertMessage: translate("learning.selectFolder")
            };
        }

        if (!appAdapter) {
            return { ok: false, error: "noAdapter" };
        }

        const parentFolder = await appAdapter.getFolder(numericFolderId);

        if (!parentFolder || parentFolder.type !== "folder") {
            return {
                ok: false,
                error: "invalidFolder",
                alertMessage: translate("learning.selectFolder")
            };
        }

        const childCards = await appAdapter.getChildCards(numericFolderId);

        if (!childCards || childCards.length === 0) {
            return {
                ok: false,
                error: "noChildren",
                alertMessage: translate("learning.noChildren")
            };
        }

        const targetChild = pickRandomChild(childCards);

        if (!targetChild) {
            return {
                ok: false,
                error: "noChildren",
                alertMessage: translate("learning.noChildren")
            };
        }

        gameState.folderId = numericFolderId;
        gameState.parentFolder = parentFolder;
        gameState.targetChild = targetChild;
        gameState.correctSequenceIds = buildCorrectSequenceIds(parentFolder, targetChild);
        gameState.userSequence = [];
        gameState.challengeSpeechItems = buildChallengeSpeechItems(parentFolder, targetChild);
        gameState.instruction = buildInstruction(parentFolder, targetChild);
        gameState.boardCards = await buildBoardCards(parentFolder, targetChild, numericFolderId);
        gameState.phase = PHASE.PLAYING;

        return { ok: true };
    }

    /**
     * @description PASSO 2 (áudio) — Toca frase do desafio após a grade estar visível na tela.
     * @returns {Promise<void>}
     */
    async function playPreparedChallengeAudio() {
        if (!gameState.challengeSpeechItems || gameState.challengeSpeechItems.length === 0) {
            return;
        }

        const items = [...gameState.challengeSpeechItems];
        await playChallengeAudio(items);
    }

    /**
     * @description PASSO 4 — Valida clique: reproduz áudio do card, atualiza userSequence e verifica ordem exata.
     * @param {object} clickedCard - Item tocado na grade do jogo.
     * @returns {Promise<{ status: string, message?: string, returnToConfig?: boolean, boardLocked?: boolean }>} ignored | error | continue | success.
     */
    async function handleBoardClick(clickedCard) {
        if (!isBoardInteractionAllowed() || !clickedCard) {
            return { status: "ignored" };
        }

        const clickedId = clickedCard.id;

        if (clickedId == null) {
            return { status: "ignored" };
        }

        gameState.processingClick = true;

        try {
            await playSingleItemAudio(clickedCard);

            const stepIndex = gameState.userSequence.length;
            const expectedId = gameState.correctSequenceIds[stepIndex];

            if (String(clickedId) !== String(expectedId)) {
                gameState.userSequence = [];
                await speakAsync(translate("learning.feedback.retry"));

                return {
                    status: "error",
                    message: translate("learning.feedback.retry")
                };
            }

            gameState.userSequence.push(clickedId);

            if (gameState.userSequence.length < gameState.correctSequenceIds.length) {
                return {
                    status: "continue",
                    message: translate("learning.feedback.continue")
                };
            }

            gameState.boardInputLocked = true;
            gameState.phase = PHASE.SUCCESS;
            gameState.instruction = translate("learning.feedback.success");

            await playSuccessFeedback();
            enterConfigPhase();

            return {
                status: "success",
                message: translate("learning.feedback.success"),
                returnToConfig: true,
                boardLocked: true
            };
        } finally {
            if (!gameState.boardInputLocked) {
                gameState.processingClick = false;
            }
        }
    }

    /**
     * @description Volta à fase CONFIG (tela inicial do Aprender).
     * @returns {void}
     */
    function enterConfigPhase() {
        resetGame();
    }

    return {
        PHASE,
        init,
        isEnabled,
        setEnabled,
        resetGame,
        getState,
        getPhase,
        getLearningCard,
        getConfigActions,
        startGame,
        playPreparedChallengeAudio,
        handleBoardClick,
        isBoardInteractionAllowed,
        enterConfigPhase,
        formatTemplate
    };

})();
