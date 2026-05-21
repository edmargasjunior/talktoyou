/* ======================================================================
   TalkToYou - audio-service.js
   Serviço de fala sintetizada, gravação de áudio e alarmes.

   Este módulo foi separado do app.js para deixar claro que áudio e voz
   são uma camada própria da aplicação.

   Pontos importantes:
   - A fala sintetizada usa a API SpeechSynthesis do navegador/sistema.
   - A gravação usa MediaRecorder e depende de permissão do microfone.
   - Os alarmes são verificados em intervalo regular.
====================================================================== */

/* ----------------------------------------------------------------------
   1. ESTADO INTERNO DO MÓDULO DE ÁUDIO
---------------------------------------------------------------------- */
let lastAlarmKey = "";
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;
let isPlaying = false;

/* ----------------------------------------------------------------------
   2. REPRODUÇÃO DE SEQUÊNCIA

   Quando o usuário toca em um card dentro de uma pasta, a fala pode ser:
   - Apenas o card: "Água"
   - Pasta + card: "Eu quero água"

   A opção composeMode da pasta decide se o nome da pasta entra na frase.
---------------------------------------------------------------------- */
async function playSequenceFluida(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    const allItemsUseSynthesizedVoice = items.every((item) => !item.audioBlob);

    if (allItemsUseSynthesizedVoice) {
        const filteredItems = items.filter((item) => {
            if (item.type === "folder") {
                return item.composeMode === true;
            }

            return true;
        });

        const fullSentence = filteredItems
            .map((item) => item.label)
            .join(" ")
            .trim();

        if (fullSentence) {
            await new Promise((resolve) => speakText(fullSentence, resolve));
        }

        return;
    }

    /*
       Caso haja áudio gravado em algum card, a sequência é tocada item por item.
       Se um áudio falhar, o app usa fala sintetizada como plano B.
    */
    for (const item of items) {
        await new Promise((resolve) => {
            if (item.audioBlob instanceof Blob) {
                playBlobAudio(item.audioBlob, () => speakText(item.label, resolve), resolve);
            } else {
                speakText(item.label, resolve);
            }
        });
    }
}

/**
 * Reproduz um Blob de áudio salvo no IndexedDB.
 */
function playBlobAudio(blob, onFallback, onFinish) {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    audio.preload = "auto";

    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        onFinish();
    };

    audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        onFallback();
    };

    audio.play().catch(() => {
        URL.revokeObjectURL(audioUrl);
        onFallback();
    });
}

/* ----------------------------------------------------------------------
   3. FALA SINTETIZADA
---------------------------------------------------------------------- */
function speakText(text, callback) {
    try {
        if (!text || !String(text).trim()) {
            if (typeof callback === "function") callback();
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(String(text));

        utterance.lang = getSpeechLanguage();
        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        const selectedVoiceName = localStorage.getItem("talktoyou_voice");

        if (selectedVoiceName) {
            const availableVoices = window.speechSynthesis.getVoices();
            const selectedVoice = availableVoices.find((voice) => voice.name === selectedVoiceName);

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
            }
        }

        utterance.onend = () => {
            if (typeof callback === "function") callback();
        };

        utterance.onerror = () => {
            if (typeof callback === "function") callback();
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Erro ao sintetizar voz:", error);

        if (typeof callback === "function") {
            callback();
        }
    }
}

/**
 * Retorna o idioma de fala conforme idioma detectado no dexie-setup.js.
 */
function getSpeechLanguage() {
    if (typeof langDetect === "undefined") {
        return "pt-BR";
    }

    const map = {
        pt: "pt-BR",
        en: "en-US",
        es: "es-ES"
    };

    return map[langDetect] || "pt-BR";
}

/* ----------------------------------------------------------------------
   4. GRAVAÇÃO DE ÁUDIO PERSONALIZADO
---------------------------------------------------------------------- */
function toggleRecording() {
    const recordBtn = document.getElementById("record-btn");
    const recordStatus = document.getElementById("record-status");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(getText("microphoneUnavailable"));
        return;
    }

    if (!isRecording) {
        startRecording(recordBtn, recordStatus);
        return;
    }

    stopRecording(recordBtn);
}

function startRecording(recordBtn, recordStatus) {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            const mimeType = getSupportedAudioMimeType();

            mediaRecorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const finalMimeType = mediaRecorder.mimeType || mimeType || "audio/webm";

                recordedAudioBlob = new Blob(audioChunks, { type: finalMimeType });

                if (recordStatus) {
                    recordStatus.innerText = getText("recorded");
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
                recordStatus.innerText = getText("recordingStatus");
            }
        })
        .catch((error) => {
            console.error("Erro ao acessar microfone:", error);
            alert(getText("microphoneAccessError"));
        });
}

function stopRecording(recordBtn) {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    isRecording = false;

    if (recordBtn) {
        recordBtn.style.background = "var(--danger)";
        recordBtn.innerText = "🎤";
    }
}

/**
 * Escolhe o melhor formato suportado pelo navegador.
 */
function getSupportedAudioMimeType() {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4"
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

/* ----------------------------------------------------------------------
   5. MONITOR DE ALARME

   A cada 15 segundos, verifica se existe algum card com horário igual
   ao horário atual. O controle lastAlarmKey evita disparar várias vezes
   no mesmo minuto.
---------------------------------------------------------------------- */
setInterval(async () => {
    try {
        if (typeof db === "undefined") return;

        const now = new Date();
        const currentTime = now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const today = now.toISOString().slice(0, 10);
        const alarmKey = `${today}-${currentTime}`;

        if (lastAlarmKey === alarmKey) return;

        const alarms = await db.items.where("alarmTime").equals(currentTime).toArray();

        if (alarms.length === 0) return;

        lastAlarmKey = alarmKey;

        const item = alarms[0];

        showAlarm(item);

        await playSequenceFluida([item]);
    } catch (error) {
        console.error("Erro no monitor de alarme:", error);
    }
}, 15000);

function showAlarm(item) {
    const alarmMsg = document.getElementById("alarm-msg");
    const alarmImg = document.getElementById("alarm-img");
    const alarmOverlay = document.getElementById("alarm-overlay");

    if (alarmMsg) {
        alarmMsg.innerText = `${getText("alarmPrefix")} ${item.label.toUpperCase()}`;
    }

    if (alarmImg) {
        alarmImg.src = item.image || getPlaceholderImage(item.label);
        alarmImg.alt = item.label;
    }

    if (alarmOverlay) {
        alarmOverlay.style.display = "flex";
    }
}

function stopAlarm() {
    const alarmOverlay = document.getElementById("alarm-overlay");

    if (alarmOverlay) {
        alarmOverlay.style.display = "none";
    }

    window.speechSynthesis.cancel();
}

/* ----------------------------------------------------------------------
   6. PLAYER SIMPLES

   Mantido por compatibilidade para pontos do app que possam tocar áudio
   diretamente via URL.
---------------------------------------------------------------------- */
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
