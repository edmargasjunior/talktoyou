/* ====================================================================
   TalkToYou - Módulo de Áudio, Voz e Serviço de Alarme
   ==================================================================== */

let lastAlarmTime = "";
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;

// Toca a sequência de áudio de forma fluida
async function playSequenceFluida(items) {
    const todosSintetizados = items.every(item => !item.audioBlob);
    
    if (todosSintetizados) {
        const fraseCompleta = items.map(item => item.label).join(" ");
        await new Promise(resolve => speakText(fraseCompleta, resolve));
        return;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await new Promise(resolve => {
            if (item.audioBlob) {
                const audioUrl = URL.createObjectURL(item.audioBlob);
                const audio = new Audio(audioUrl);
                audio.preload = "auto"; 
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
    utterance.lang = typeof langDetect !== 'undefined' && langDetect === 'pt' ? 'pt-BR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onend = callback;
    utterance.onerror = callback;
    window.speechSynthesis.speak(utterance);
}

// Lógica do gravador permanece aqui
function toggleRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert("Erro microfone.");
    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                recordedAudioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                document.getElementById('record-status').innerText = "✅ Gravado";
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start(); isRecording = true;
            document.getElementById('record-btn').style.background = "gray";
        });
    } else {
        if (mediaRecorder) mediaRecorder.stop();
        isRecording = false;
        document.getElementById('record-btn').style.background = "var(--danger)";
    }
}

// Monitor de Alarme
setInterval(async () => {
    const now = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
    if (lastAlarmTime === now) return;
    const alarms = await db.items.where('alarmTime').equals(now).toArray();
    if (alarms.length > 0) {
        lastAlarmTime = now;
        const item = alarms[0];
        document.getElementById('alarm-img').src = item.image;
        document.getElementById('alarm-overlay').style.display = 'flex';
        // Chama a função global de clique definida no app.js
        handleCardClick(item);
    }
}, 15000);

function stopAlarm() { document.getElementById('alarm-overlay').style.display = 'none'; window.speechSynthesis.cancel(); }
