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
    * Retorna o texto que deve ser falado para um item.
    *
    * Regra acadêmica/prática:
    * - cards oficiais podem ser traduzidos pelo sistema;
    * - cards personalizados permanecem exatamente como o usuário criou.
    */
   function getSpeechLabel(item) {
       if (!item) return "";
   
       if (typeof getDisplayLabel === "function") {
           return getDisplayLabel(item);
       }
   
       return item.label || "";
   }
   
   function getSpeechLabel(item) {
       if (!item) return "";

       if (typeof getDisplayLabel === "function") {
           return getDisplayLabel(item);
       }

       return item.label || "";
   }

   /**
    * Retorna o idioma atual do aplicativo de forma padronizada.
    *
    * Esta função é usada especialmente pelo alarme, porque a frase
    * "Hora de..." muda conforme o idioma selecionado.
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
    * Retorna o prefixo falado no alarme.
    *
    * Decisão de design:
    * O card pode se chamar "Acordar", "Remédio", "Escola" etc.,
    * mas em contexto de alarme a mensagem precisa ser uma frase
    * completa e contextualizada.
    *
    * Exemplos:
    * - pt-BR: Hora de acordar
    * - en-US: Time to wake up
    * - es-ES: Hora de despertar
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
    * Monta o texto final do alarme no idioma selecionado.
    *
    * Para cards oficiais, getSpeechLabel(item) já retorna o texto traduzido.
    * Para cards personalizados, o texto original do usuário é preservado.
    */
   function getAlarmSpeechText(item) {
       const prefix = getAlarmSpeechPrefix();
       const label = getSpeechLabel(item);

       return `${prefix} ${label}`.trim();
   }

   /**
    * Retorna o texto exibido visualmente na tela do alarme.
    *
    * A tela usa caixa alta para melhorar leitura à distância.
    */
   function getAlarmDisplayText(item) {
       return getAlarmSpeechText(item).toUpperCase();
   }

   /* --------------------------------------------------------------------
      2. VOZ SINTETIZADA COM PREFERÊNCIA DO USUÁRIO
   -------------------------------------------------------------------- */
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

           /*
               Em contexto de alarme, a fala deve ser uma frase completa.
               Por isso não usamos playSequenceFluida([item]), que falaria
               apenas o nome do card, como "Acordar".

               Aqui falamos:
               - "Hora de acordar"
               - "Time to wake up"
               - "Hora de despertar"
           */
           await new Promise((resolve) => {
               speakText(getAlarmSpeechText(item), resolve);
           });
       } catch (error) {
           console.error("Erro no monitor de alarme:", error);
       }
   }, 15000);
   
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
   

/*
    Exposição para testes no console.

    Exemplo:
    getAlarmSpeechText({ label: "Acordar" })
*/
window.getAlarmSpeechText = getAlarmSpeechText;
