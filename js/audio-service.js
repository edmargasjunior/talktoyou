/**
 * @file audio-service.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description reprodução TTS, sequências fluidas e gravação de áudio nos cards
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */

let lastAlarmKey = "";
/** @type {Array<object>} */
let alarmQueue = [];
let isAlarmQueueRunning = false;
/** @type {function(): void|null} */
let alarmSpeechResolver = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;
let isPlaying = false;

/**
 * @description Reproduz sequência de cards com TTS fluido ou blobs gravados, alinhada a getSpeechLabel e composeMode de pastas.
 * @param {Array<object>} items - Cards e pastas na ordem da frase ou sequência tocada.
 * @returns {Promise<void>} Resolve quando todos os itens foram reproduzidos.
 */
async function playSequenceFluida(items) {
    if (!items || items.length === 0) return;

    /*
        A fala precisa usar o mesmo rótulo exibido no card.

        Antes, a interface podia mostrar "Water", mas a voz ainda falava
        "Água", porque este módulo usava item.label diretamente.

        Agora usamos getSpeechLabel(item), que respeita:
        - tradução de cards oficiais;
        - preservação dos cards personalizados;
        - composição de frase por pasta.
    */
    const todosSintetizados = items.every((item) => !item.audioBlob);

    if (todosSintetizados) {
        const itensFiltrados = [];

        for (const item of items) {
            if (item.type === "folder") {
                if (item.composeMode === true) {
                    itensFiltrados.push(item);
                }
            } else {
                itensFiltrados.push(item);
            }
        }

        const fraseCompleta = itensFiltrados
            .map((item) => getSpeechLabel(item))
            .join(" ")
            .trim();

        if (fraseCompleta) {
            await new Promise((resolve) => speakText(fraseCompleta, resolve));
        }

        return;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await new Promise((resolve) => {
            const fallbackText = getSpeechLabel(item);

            if (item.audioBlob instanceof Blob) {
                const audioUrl = URL.createObjectURL(item.audioBlob);
                const audio = new Audio(audioUrl);

                audio.preload = "auto";

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    speakText(fallbackText, resolve);
                };

                audio.play().catch(() => {
                    URL.revokeObjectURL(audioUrl);
                    speakText(fallbackText, resolve);
                });
            } else {
                speakText(fallbackText, resolve);
            }
        });
    }
}

/**
 * @description Retorna o texto falado para um item, alinhado ao rótulo exibido na prancha do PWA.
 * @param {object|null|undefined} item - Card ou pasta do IndexedDB.
 * @returns {string} Rótulo para síntese de voz.
 */
function getSpeechLabel(item) {
    if (!item) return "";

    if (typeof getDisplayLabel === "function") {
        return getDisplayLabel(item);
    }

    return item.label || "";
}

/**
 * @description Resolve o idioma atual do aplicativo para frases de alarme (i18n ou fallback de fala).
 * @returns {string} Código BCP 47 (ex.: pt-BR, en-US).
 */
function getCurrentAppLanguageForAlarm() {
    if (window.TalkToYouI18n && typeof TalkToYouI18n.getCurrentLanguage === "function") {
        return TalkToYouI18n.getCurrentLanguage();
    }

    if (typeof getSpeechLanguage === "function") {
        return getSpeechLanguage();
    }

    return "pt-BR";
}

/**
 * @description Retorna o prefixo falado do alarme conforme o idioma (ex.: "Hora de", "Time to").
 * @returns {string} Prefixo contextualizado para montar a frase do despertador.
 */
function getAlarmSpeechPrefix() {
    const language = getCurrentAppLanguageForAlarm();

    if (language.startsWith("en")) {
        return "Time to";
    }

    if (language.startsWith("es")) {
        return "Hora de";
    }

    return "Hora de";
}

/**
 * @description Monta o texto final falado no alarme (prefixo + rótulo traduzido ou personalizado).
 * @param {object} item - Card com alarmTime configurado no Dexie.
 * @returns {string} Frase completa para TTS (ex.: "Hora de acordar").
 */
function getAlarmSpeechText(item) {
    const prefix = getAlarmSpeechPrefix();
    const label = getSpeechLabel(item);

    return `${prefix} ${label}`.trim();
}

/**
 * @description Retorna o texto exibido no overlay do alarme em caixa alta para leitura à distância.
 * @param {object} item - Card do despertador.
 * @returns {string} Mesma intenção de getAlarmSpeechText, em maiúsculas.
 */
function getAlarmDisplayText(item) {
    return getAlarmSpeechText(item).toUpperCase();
}

/**
 * @description Sintetiza texto via Web Speech API com voz e idioma preferidos armazenados em localStorage.
 * @param {string} text - Texto a reproduzir.
 * @param {function(): void} [callback] - Invocado ao término ou em erro de síntese.
 * @returns {void}
 */
function speakText(text, callback) {
    try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = typeof getSpeechLanguage === "function"
            ? getSpeechLanguage()
            : "pt-BR";

        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        const selectedVoiceName = localStorage.getItem('talktoyou_voice');

        if (selectedVoiceName) {
            const availableVoices = window.speechSynthesis.getVoices();
            const selectedVoice = availableVoices.find((voice) => voice.name === selectedVoiceName);

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
            }
        }

        utterance.onend = () => {
            if (typeof callback === 'function') callback();
        };

        utterance.onerror = () => {
            if (typeof callback === 'function') callback();
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Erro ao sintetizar voz:", error);

        if (typeof callback === 'function') {
            callback();
        }
    }
}

/**
 * @description Alterna gravação de áudio personalizado no modal de card (MediaRecorder + microfone).
 * @returns {void}
 * @throws Não propaga exceções; falhas de getUserMedia exibem alert e log no console.
 */
function toggleRecording() {
    const recordBtn = document.getElementById('record-btn');
    const recordStatus = document.getElementById('record-status');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Este aparelho ou navegador não liberou acesso ao microfone.");
        return;
    }

    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

                mediaRecorder = new MediaRecorder(stream, { mimeType });
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    recordedAudioBlob = new Blob(audioChunks, { type: mimeType });

                    if (recordStatus) {
                        recordStatus.innerText = "✅ Gravado";
                    }

                    stream.getTracks().forEach((track) => track.stop());
                };

                mediaRecorder.start();

                isRecording = true;

                if (recordBtn) {
                    recordBtn.style.background = "gray";
                    recordBtn.innerText = "⏹️";
                }

                if (recordStatus) {
                    recordStatus.innerText = "Gravando... toque novamente para parar";
                }
            })
            .catch((error) => {
                console.error("Erro ao acessar microfone:", error);
                alert("Não foi possível acessar o microfone.");
            });

        return;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    isRecording = false;

    if (recordBtn) {
        recordBtn.style.background = "var(--danger)";
        recordBtn.innerText = "🎤";
    }
}

/**
 * @description Formata horário local em HH:mm, independente do locale do aparelho.
 * @param {Date} [date=new Date()] - Instante a formatar.
 * @returns {string} Horário no formato 24h (ex.: 07:30).
 */
function formatClockTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

/**
 * @description Monta chave diária para evitar reprocessar o mesmo minuto de alarme.
 * @param {Date} [date=new Date()] - Instante de referência.
 * @returns {string} Chave no formato YYYY-MM-DD-HH:mm.
 */
function buildAlarmMinuteKey(date = new Date()) {
    const today = date.toISOString().slice(0, 10);
    return `${today}-${formatClockTime(date)}`;
}

/**
 * @description Consulta no Dexie os cards com alarmTime igual ao minuto atual (HH:mm).
 * @param {string} currentTime - Horário normalizado HH:mm.
 * @returns {Promise<Array<object>>} Promise Dexie com itens que disparam no minuto.
 */
async function fetchAlarmsForCurrentMinute(currentTime) {
    if (typeof db === "undefined") {
        return [];
    }

    return db.items.where("alarmTime").equals(currentTime).toArray();
}

/**
 * @description Exibe e fala o próximo alarme da fila até esvaziar ou o usuário encerrar.
 * @returns {Promise<void>} Resolve após TTS do alarme atual.
 */
async function processNextAlarmInQueue() {
    if (alarmQueue.length === 0) {
        isAlarmQueueRunning = false;
        return;
    }

    isAlarmQueueRunning = true;

    const item = alarmQueue.shift();

    showAlarm(item);

    await new Promise((resolve) => {
        alarmSpeechResolver = resolve;
        speakText(getAlarmSpeechText(item), resolve);
    });
}

/**
 * @description Enfileira múltiplos alarmes do mesmo minuto e inicia a fila se necessário.
 * @param {Array<object>} items - Cards com alarmTime disparado.
 * @returns {Promise<void>}
 */
async function enqueueAlarms(items) {
    if (!items || items.length === 0) {
        return;
    }

    alarmQueue.push(...items);

    if (!isAlarmQueueRunning) {
        await processNextAlarmInQueue();
    }
}

/**
 * @description Listener periódico (setInterval): consulta Dexie por alarmTime no minuto atual e enfileira disparos.
 * @returns {Promise<void>}
 */
setInterval(async () => {
    try {
        if (typeof db === "undefined") {
            return;
        }

        const now = new Date();
        const currentTime = formatClockTime(now);
        const alarmKey = buildAlarmMinuteKey(now);

        if (lastAlarmKey === alarmKey) {
            return;
        }

        const alarms = await fetchAlarmsForCurrentMinute(currentTime);

        if (alarms.length === 0) {
            return;
        }

        lastAlarmKey = alarmKey;
        await enqueueAlarms(alarms);
    } catch (error) {
        console.error("Erro no monitor de alarme:", error);
    }
}, 15000);

/**
 * @description Exibe overlay visual do despertador com imagem e texto contextualizados.
 * @param {object} item - Card com alarmTime configurado no IndexedDB.
 * @returns {void}
 */
function showAlarm(item) {
    const alarmMsg = document.getElementById('alarm-msg');
    const alarmImg = document.getElementById('alarm-img');
    const alarmOverlay = document.getElementById('alarm-overlay');

    /*
        Texto visual do alarme.

        A mensagem exibida deve ser igual à intenção da fala:
        não apenas "Acordar", mas "Hora de acordar".
    */
    if (alarmMsg) {
        alarmMsg.innerText = getAlarmDisplayText(item);
    }

    /*
        Imagem do card usado no alarme.

        Mantém a mesma lógica visual dos cards:
        - fotos reais personalizadas são preservadas;
        - placeholders oficiais usam emoji;
        - não existe texto dentro da imagem.
    */
    if (alarmImg) {
        const alarmLabel = getSpeechLabel(item);

        alarmImg.src = typeof getCardVisualImage === "function"
            ? getCardVisualImage(item, alarmLabel)
            : item.image || getPlaceholderImage(alarmLabel);

        alarmImg.alt = alarmLabel;
    }

    if (alarmOverlay) {
        alarmOverlay.style.display = 'flex';
    }
}

/**
 * @description Encerra o alarme atual, cancela TTS e avança para o próximo da fila, se houver.
 * @returns {void}
 */
function stopAlarm() {
    const alarmOverlay = document.getElementById("alarm-overlay");

    if (alarmOverlay) {
        alarmOverlay.style.display = "none";
    }

    window.speechSynthesis.cancel();

    if (typeof alarmSpeechResolver === "function") {
        alarmSpeechResolver();
        alarmSpeechResolver = null;
    }

    if (alarmQueue.length > 0) {
        processNextAlarmInQueue();
    } else {
        isAlarmQueueRunning = false;
    }
}

/**
 * @description Reproduz áudio de um card por URL (blob ou arquivo), com trava anti-sobreposição.
 * @param {string} audioUrl - URL objeto ou caminho do áudio do card.
 * @returns {void}
 */
function playCardAudio(audioUrl) {
    if (isPlaying) return;

    isPlaying = true;

    const audio = new Audio(audioUrl);

    audio.onended = () => {
        isPlaying = false;
    };

    audio.onerror = () => {
        isPlaying = false;
    };

    audio.play().catch(() => {
        isPlaying = false;
    });
}


/*
    Exposição para testes no console.

    Exemplo:
    getAlarmSpeechText({ label: "Acordar" })
*/
window.getAlarmSpeechText = getAlarmSpeechText;
window.playSequenceFluida = playSequenceFluida;
