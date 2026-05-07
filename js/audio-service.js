/* ====================================================================
   TalkToYou - Módulo de Áudio, Voz e Serviço de Alarme (Versão Fluida)
   ==================================================================== */

// Inicialização das variáveis de controle de mídia e timers
let lastAlarmTime = "";
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;

// 1. LÓGICA DE ÁUDIO ENCADEADO (Otimizada para fala contínua)
async function handleCardClick(item) {
    if (item.type === 'folder') {
        pathHistory.push(currentParentId);
        await loadBoard(item.id);
        return;
    }
    
    // Monta a estrutura da sequência
    const sequence = [];
    if (currentParentId !== 0) {
        const parent = await db.items.get(currentParentId);
        if (parent) sequence.push(parent);
    }
    sequence.push(item);
    
    // Executa a inteligência de reprodução fluida
    await playSequenceFluida(sequence);
}

async function playSequenceFluida(items) {
    // Cenário A: Se nenhum dos itens possuir áudio gravado, usamos a síntese de voz unificada.
    // Isso remove 100% do vão, pois lê a frase inteira de uma vez só (ex: "COMER PÃO").
    const todosSintetizados = items.every(item => !item.audioBlob);
    
    if (todosSintetizados) {
        const fraseCompleta = items.map(item => item.label).join(" ");
        await new Promise(resolve => speakText(fraseCompleta, resolve));
        return;
    }

    // Cenário B: Se houver áudio gravado por voz humana, usamos pré-carregamento imediato (Pre-buffering)
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        await new Promise(resolve => {
            if (item.audioBlob) {
                const audioUrl = URL.createObjectURL(item.audioBlob);
                const audio = new Audio(audioUrl);
                
                // Força o navegador a carregar o áudio agressivamente na memória antes de dar play
                audio.preload = "auto"; 
                
                audio.onended = () => { 
                    URL.revokeObjectURL(audioUrl); 
                    resolve(); 
                };
                audio.onerror = () => { 
                    URL.revokeObjectURL(audioUrl); 
                    speakText(item.label, resolve); 
                };
                
                audio.play().catch(() => speakText(item.label, resolve));
            } else {
                // Caso um elemento da sequência seja misto (voz do sistema), fala de forma direta
                speakText(item.label, resolve);
            }
        });
    }
}

function speakText(text, callback) {
    window.speechSynthesis.cancel(); // Limpa buffers de voz travados
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langDetect === 'pt' ? 'pt-BR' : 'en-US';
    
    // Ajustes sutis para tornar a síntese integrada mais humana e menos robotizada
    utterance.rate = 1.0;  // Velocidade normal de conversação
    utterance.pitch = 1.1; // Tom levemente mais amigável para crianças
    
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
