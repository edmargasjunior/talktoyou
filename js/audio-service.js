/* ====================================================================
   TalkToYou - Módulo de Áudio, Voz e Serviço de Alarme
   ==================================================================== */

// Inicialização das variáveis de controle de mídia e timers
let lastAlarmTime = "";
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;

// 1. LÓGICA DE ÁUDIO ENCADEADO
async function handleCardClick(item) {
    if (item.type === 'folder') {
        pathHistory.push(currentParentId);
        await loadBoard(item.id);
        return;
    }
    
    const sequence = [];
    if (currentParentId !== 0) {
        const parent = await db.items.get(currentParentId);
        if (parent) sequence.push(parent);
    }
    sequence.push(item);
    await playSequence(sequence);
}

async function playSequence(items) {
    for (const item of items) {
        await new Promise(resolve => {
            if (item.audioBlob) {
                const audioUrl = URL.createObjectURL(item.audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
                audio.onerror = () => { URL.revokeObjectURL(audioUrl); speakText(item.label, resolve); };
                
                audio.play().catch(() => speakText(item.label, resolve));
            } else {
                speakText(item.label, resolve);
            }
        });
    }
}

function speakText(text, callback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langDetect === 'pt' ? 'pt-BR' : 'en-US';
    utterance.onend = callback;
    utterance.onerror = callback;
    window.speechSynthesis.speak(utterance);
}

// 2. SERVIÇO DE GRAVAÇÃO DE VOZ
function toggleRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Este navegador não possui suporte ou permissão para gravação de áudio.");
        return;
    }

    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    recordedAudioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                    document.getElementById('record-status').innerText = langDetect === 'pt' ? "✅ Áudio Gravado" : "✅ Audio Recorded";
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                isRecording = true;

                document.getElementById('record-btn').style.background = "gray";
                document.getElementById('record-status').innerText = langDetect === 'pt' ? "Gravando... Toque de novo para parar" : "Recording... Tap again to stop";
            })
            .catch(() => {
                alert(langDetect === 'pt' ? "Erro ao acessar o microfone. Verifique as permissões." : "Error accessing microphone. Check permissions.");
            });
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.getElementById('record-btn').style.background = "var(--danger)";
    }
}

// 3. MONITOR CONTÍNUO DO DESPERTADOR
setInterval(async () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    if (lastAlarmTime === currentTime) return;

    const alarms = await db.items
        .where('alarmTime')
        .equals(currentTime)
        .toArray();

    if (alarms.length > 0) {
        lastAlarmTime = currentTime;
        const item = alarms[0];

        document.getElementById('alarm-img').src = item.image || getPlaceholderImage(item.label);
        document.getElementById('alarm-msg').innerText = (langDetect === 'pt' ? "HORA DE: " : "TIME TO: ") + item.label.toUpperCase();
        document.getElementById('alarm-overlay').style.display = 'flex';

        await handleCardClick(item);
    }
}, 15000);

function stopAlarm() {
    document.getElementById('alarm-overlay').style.display = 'none';
    window.speechSynthesis.cancel();
}