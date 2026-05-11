/* ====================================================================
   TalkToYou - Módulo de Áudio, Voz e Serviço de Alarme
   ==================================================================== */

let lastAlarmKey = "";
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;
let isPlaying = false;

/* --------------------------------------------------------------------
   1. REPRODUÇÃO FLUIDA DE SEQUÊNCIA
-------------------------------------------------------------------- */
async function playSequenceFluida(items) {
    if (!items || items.length === 0) return;

    const todosSintetizados = items.every((item) => !item.audioBlob);

    if (todosSintetizados) {
        const itensFiltrados = [];

        for (const item of items) {
            if (item.type === 'folder') {
                if (item.composeMode === true) {
                    itensFiltrados.push(item);
                }
            } else {
                itensFiltrados.push(item);
            }
        }
        
        const fraseCompleta = itensFiltrados
            .map((item) => item.label)
            .join(" ");
                await new Promise((resolve) => speakText(fraseCompleta, resolve));
                return;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await new Promise((resolve) => {
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
                    speakText(item.label, resolve);
                };

                audio.play().catch(() => {
                    URL.revokeObjectURL(audioUrl);
                    speakText(item.label, resolve);
                });
            } else {
                speakText(item.label, resolve);
            }
        });
    }
}

/* --------------------------------------------------------------------
   2. VOZ SINTETIZADA COM PREFERÊNCIA DO USUÁRIO
-------------------------------------------------------------------- */
function speakText(text, callback) {
    try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = typeof langDetect !== 'undefined' && langDetect === 'pt'
            ? 'pt-BR'
            : 'en-US';

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

/* --------------------------------------------------------------------
   3. GRAVAÇÃO DE ÁUDIO PERSONALIZADO
-------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------
   4. MONITOR DE ALARME
-------------------------------------------------------------------- */
setInterval(async () => {
    try {
        if (typeof db === 'undefined') return;

        const now = new Date();

        const currentTime = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const today = now.toISOString().slice(0, 10);
        const alarmKey = `${today}-${currentTime}`;

        if (lastAlarmKey === alarmKey) return;

        const alarms = await db.items.where('alarmTime').equals(currentTime).toArray();

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
    const alarmMsg = document.getElementById('alarm-msg');
    const alarmImg = document.getElementById('alarm-img');
    const alarmOverlay = document.getElementById('alarm-overlay');

    if (alarmMsg) {
        alarmMsg.innerText = `HORA DE ${item.label.toUpperCase()}`;
    }

    if (alarmImg) {
        alarmImg.src = item.image || getPlaceholderImage(item.label);
        alarmImg.alt = item.label;
    }

    if (alarmOverlay) {
        alarmOverlay.style.display = 'flex';
    }
}

function stopAlarm() {
    const alarmOverlay = document.getElementById('alarm-overlay');

    if (alarmOverlay) {
        alarmOverlay.style.display = 'none';
    }

    window.speechSynthesis.cancel();
}

/* --------------------------------------------------------------------
   5. PLAYER SIMPLES
-------------------------------------------------------------------- */
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
