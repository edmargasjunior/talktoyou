/* ====================================================================
   TalkToYou - Controlador Central de Interface (UI) e Fluxo CRUD
   ==================================================================== */

let currentParentId = 0;
let pathHistory = [];
let currentImageBase64 = null;
let synth = window.speechSynthesis;
let voices = [];
let isBusy = false;

window.processImage = processImage;

/* --------------------------------------------------------------------
   1. INICIALIZAÇÃO DA APLICAÇÃO
-------------------------------------------------------------------- */
window.onload = async () => {
    try {
        // --- GERENCIAMENTO DO BOTÃO VOLTAR DO SISTEMA (ANDROID) ---
        window.history.pushState({ pathId: 0 }, ""); 
        window.onpopstate = function(event) {
            if (currentParentId !== 0) {
                navigateBack();
                // Re-insere o estado para permitir voltar novamente se entrar em outra pasta
                window.history.pushState({ pathId: 0 }, ""); 
            }
        };

        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => { splash.remove(); }, 500);
            }
        }, 2500);

        populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }

        if (typeof i18n !== 'undefined') {
            const uiTitle = document.getElementById('ui-title');
            const appWindowTitle = document.getElementById('app-window-title');
            if (uiTitle) uiTitle.innerText = i18n[langDetect].title;
            if (appWindowTitle) appWindowTitle.innerText = i18n[langDetect].appName;
        }

        await seedInitialData();
        loadGridPreference();
        loadDebouncePreference(); // Carrega a opção de trava de toque
        await loadBoard(0);

    } catch (error) {
        console.error("Erro crítico na inicialização do TalkToYou:", error);
        alert("Erro ao iniciar o aplicativo:\n\n" + (error && error.message ? error.message : error));
    } finally {
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => { splash.remove(); }, 500);
            }
        }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const itemType = document.getElementById('item-type');
    const composeGroup = document.getElementById('compose-mode-group');

    if (itemType && composeGroup) {
        itemType.addEventListener('change', () => {
            composeGroup.style.display =
                itemType.value === 'folder'
                    ? 'block'
                    : 'none';
        });
    }
});

/* --------------------------------------------------------------------
   2. ACESSIBILIDADE: VOZES, GRID E DEBOUNCE
-------------------------------------------------------------------- */
function populateVoiceList() {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;

    const allVoices = synth.getVoices();
    voices = allVoices.filter((voice) => {
        if (typeof langDetect !== 'undefined' && langDetect === 'pt') {
            return voice.lang.toLowerCase().includes('pt');
        }
        return voice.lang.toLowerCase().includes('en');
    });

    if (voices.length === 0) voices = allVoices;

    const selectedVoice = localStorage.getItem('talktoyou_voice') || "";
    voiceSelect.innerHTML = '';

    if (voices.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Voz padrão do aparelho";
        voiceSelect.appendChild(option);
        return;
    }

    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-name', voice.name);
        if (selectedVoice === voice.name) option.selected = true;
        voiceSelect.appendChild(option);
    });
}

function saveVoicePreference() {
    const select = document.getElementById('voice-select');
    if (!select) return;
    const selectedVoiceName = select.value || "";
    localStorage.setItem('talktoyou_voice', selectedVoiceName);
    if (typeof speakText === 'function') {
        speakText("Voz selecionada", () => {});
    }
}

function updateGridLayout(val) {
    const board = document.getElementById('board-grid');
    if (!board) return;
    if (val === 'auto') {
        document.documentElement.style.setProperty('--grid-cols', 'auto-fill');
        document.documentElement.style.setProperty('--card-min-width', '140px');
        board.classList.remove('is-fixed-grid');
    } else {
        document.documentElement.style.setProperty('--grid-cols', val);
        board.classList.add('is-fixed-grid');
    }
    localStorage.setItem('talktoyou_grid_pref', val);
}

function loadGridPreference() {
    const pref = localStorage.getItem('talktoyou_grid_pref') || 'auto';
    const select = document.getElementById('grid-config');
    if (select) select.value = pref;
    updateGridLayout(pref);
}

// NOVO: Gerenciamento da trava de toque (Debounce)
function toggleDebounce() {
    const isEnabled = document.getElementById('debounce-config').checked;
    localStorage.setItem('talktoyou_debounce', isEnabled);
}

function loadDebouncePreference() {
    const pref = localStorage.getItem('talktoyou_debounce') === 'true';
    const check = document.getElementById('debounce-config');
    if (check) check.checked = pref;
}

/* --------------------------------------------------------------------
   3. RENDERIZAÇÃO DA PRANCHA
-------------------------------------------------------------------- */
async function loadBoard(parentId = 0) {
    currentParentId = parentId;
    const grid = document.getElementById('board-grid');
    const backBtn = document.getElementById('header-back');
    if (!grid || !backBtn) return;

    grid.innerHTML = '';
    backBtn.style.opacity = parentId === 0 ? '0' : '1';
    backBtn.style.pointerEvents = parentId === 0 ? 'none' : 'auto';

    const pathTextElem = document.getElementById('path-text');
    if (pathTextElem) {
        if (parentId === 0) {
            pathTextElem.innerText = i18n[langDetect].welcome;
        } else {
            const parent = await db.items.get(parentId);
            pathTextElem.innerText = parent ? parent.label : i18n[langDetect].welcome;
        }
    }

    const items = await db.items.where('parentId').equals(parentId).toArray();
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                ${langDetect === 'pt' ? 'Pasta vazia.<br>Toque no menu ☰ e selecione "Incluir Novo" para começar.' : 'Empty folder.<br>Tap the ☰ menu and select "Add New" to begin.'}
            </div>
        `;
        return;
    }

    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = `card ${item.type === 'folder' ? 'is-folder' : ''}`;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', item.label);
        card.onclick = () => handleCardClick(item);
        card.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCardClick(item);
            }
        };
        const img = document.createElement('img');
        img.src = item.image || getPlaceholderImage(item.label);
        img.alt = item.label;
        const label = document.createElement('div');
        label.className = 'card-label';
        label.textContent = item.label;
        card.appendChild(img);
        card.appendChild(label);
        grid.appendChild(card);
    });
}

/* --------------------------------------------------------------------
   4. NAVEGAÇÃO E CLIQUE
-------------------------------------------------------------------- */
async function handleCardClick(item) {
    // Só aplica o isBusy se a configuração estiver ativa
    const useDebounce = localStorage.getItem('talktoyou_debounce') === 'true';
    if (useDebounce && isBusy) return;
    if (useDebounce) isBusy = true;

    try {
        if (item.type === 'folder') {
            pathHistory.push(currentParentId);
            // Adiciona estado no histórico para o voltar do Android
            window.history.pushState({ pathId: item.id }, "");
            await loadBoard(item.id);
            if (useDebounce) isBusy = false;
            return;
        }

        const sequence = [];
        if (currentParentId !== 0) {
            const parent = await db.items.get(currentParentId);
            if (parent) sequence.push(parent);
        }
        sequence.push(item);

        if (typeof playSequenceFluida === 'function') {
            await playSequenceFluida(sequence);
        }
    } catch (error) {
        console.error("Erro ao executar clique no card:", error);
    } finally {
        if (useDebounce) {
            setTimeout(() => { isBusy = false; }, 1200);
        }
    }
}

async function navigateBack() {
    const prevId = pathHistory.length > 0 ? pathHistory.pop() : 0;
    await loadBoard(prevId);
}

/* --------------------------------------------------------------------
   5. INTERFACE: MENUS E MODAIS
-------------------------------------------------------------------- */
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (!menu || !overlay) return;

    menu.classList.toggle('open');
    overlay.style.display = menu.classList.contains('open') ? 'block' : 'none';
}

function closeModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.style.display = 'none';
    });
}

/* --------------------------------------------------------------------
   6. CRUD: ABERTURA DE MODAIS
-------------------------------------------------------------------- */
async function openModal(mode, itemId = null) {
    closeModals();
    const menu = document.getElementById('side-menu');
    if (mode !== 'edit' && menu && menu.classList.contains('open')) {
        toggleMenu();
    }

    const parentSelect = document.getElementById('item-parent');
    if (!parentSelect) return;
    parentSelect.innerHTML = `<option value="0">${langDetect === 'pt' ? 'Início (Raiz)' : 'Home (Root)'}</option>`;

    const folders = await db.items.where('type').equals('folder').toArray();
    folders.forEach((folder) => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `📁 ${folder.label.toUpperCase()}`;
        parentSelect.appendChild(option);
    });

   if (mode === "clear-data") {
    document.getElementById("clear-data-modal").classList.add("active");

    setTimeout(() => {
        document.getElementById("btn-clear-export-backup")?.focus();
    }, 100);

    return;
   }

    if (mode === 'add') {
        resetForm();
        document.getElementById('modal-title').innerText = langDetect === 'pt' ? "Incluir Novo" : "Add New";
        document.getElementById('btn-delete').style.display = 'none';
        document.getElementById('item-parent').value = currentParentId || 0;
        document.getElementById('form-modal').style.display = 'flex';
        document.getElementById('item-compose-mode').checked = false;
        document.getElementById('compose-mode-group').style.display = 'block';
    }

    if (mode === 'manage') {
        const list = document.getElementById('manage-list');
        if (!list) return;
        list.innerHTML = '';
        const allItems = await db.items.toArray();
        allItems.forEach((item) => {
            const div = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = `${item.type === 'folder' ? '📁' : '🟦'} ${item.label}`;
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.style.width = 'auto';
            button.style.margin = '0';
            button.style.padding = '5px 10px';
            button.textContent = 'Editar';
            button.onclick = () => openModal('edit', item.id);
            div.appendChild(span);
            div.appendChild(button);
            list.appendChild(div);
        });
        document.getElementById('manage-modal').style.display = 'flex';
    }

    if (mode === 'edit') {
        resetForm();
        const item = await db.items.get(itemId);
        if (!item) return;
        document.getElementById('edit-id').value = item.id;
        document.getElementById('item-label').value = item.label;
        document.getElementById('item-type').value = item.type;
        document.getElementById('item-parent').value = item.parentId ?? 0;
        document.getElementById('item-alarm').value = item.alarmTime || "";
        currentImageBase64 = item.image || null;
        document.getElementById('photo-status').innerText = item.image ? "✅ Foto OK" : "📷 Tirar ou Escolher Foto";
        document.getElementById('record-status').innerText = item.audioBlob ? "✅ Áudio salvo" : "Toque para gravar sua voz";
        document.getElementById('btn-delete').style.display = 'block';
        document.getElementById('form-modal').style.display = 'flex';
        document.getElementById('item-compose-mode').checked = item.composeMode === true;
        document.getElementById('compose-mode-group').style.display = item.type === 'folder' ? 'block' : 'none';
    }
}

/* --------------------------------------------------------------------
   7. CRUD: SALVAR, EXCLUIR E RESETAR
-------------------------------------------------------------------- */
async function saveCRUDItem() {
    const labelVal = document.getElementById('item-label').value.trim();
    if (!labelVal) { alert("Dê um nome ao item."); return; }
    const id = document.getElementById('edit-id').value;

    const data = {
        label: labelVal,
        type: document.getElementById('item-type').value,
        parentId: parseInt(document.getElementById('item-parent').value || "0", 10),
        alarmTime: document.getElementById('item-alarm').value || "",
        image: currentImageBase64 || getPlaceholderImage(labelVal),
        composeMode: document.getElementById('item-type').value === 'folder'
           ? document.getElementById('item-compose-mode').checked
           : false,
    };

    if (typeof recordedAudioBlob !== 'undefined' && recordedAudioBlob) {
        data.audioBlob = recordedAudioBlob;
    }

    try {
        if (id) {
            const oldItem = await db.items.get(parseInt(id, 10));
            if (oldItem && oldItem.audioBlob && !data.audioBlob) {
                data.audioBlob = oldItem.audioBlob;
            }
            await db.items.update(parseInt(id, 10), data);
        } else {
            await db.items.add(data);
        }
        closeModals();
        await loadBoard(data.parentId);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar o item.");
    }
}

async function deleteItem() {
    const id = parseInt(document.getElementById('edit-id').value, 10);
    if (!id) return;
    if (!confirm("Deseja realmente excluir?")) return;
    await deleteItemAndChildren(id);
    closeModals();
    await loadBoard(0);
}

async function deleteItemAndChildren(id) {
    const children = await db.items.where('parentId').equals(id).toArray();
    for (const child of children) {
        await deleteItemAndChildren(child.id);
    }
    await db.items.delete(id);
}

function resetForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('item-label').value = '';
    document.getElementById('item-alarm').value = '';
    document.getElementById('item-type').value = 'card';
    currentImageBase64 = null;
    if (typeof recordedAudioBlob !== 'undefined') recordedAudioBlob = null;
    document.getElementById('photo-status').innerText = "📷 Tirar ou Escolher Foto";
    document.getElementById('record-status').innerText = "Toque para gravar sua voz";
    document.getElementById('item-compose-mode').checked = false;
    document.getElementById('compose-mode-group').style.display = 'block';
}

/* --------------------------------------------------------------------
   8. PROCESSAMENTO DE IMAGEM
-------------------------------------------------------------------- */
function processImage(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('resize-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 300;
            ctx.clearRect(0, 0, 300, 300);
            ctx.drawImage(img, 0, 0, 300, 300);
            currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('photo-status').innerText = "✅ Foto OK";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(input.files[0]);
}

/* --------------------------------------------------------------------
   9. BACKUP COM SUPORTE A ÁUDIO
-------------------------------------------------------------------- */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        if (!blob) { resolve(null); return; }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64) {
    if (!base64 || typeof base64 !== 'string') return null;
    const parts = base64.split(',');
    const data = parts[1] || '';
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: 'audio/ogg' });
}

async function prepararItensParaBackup(itens) {
    const itensConvertidos = [];
    for (const item of itens) {
        const clone = { ...item };
        if (clone.audioBlob instanceof Blob) {
            clone.audioBlobBase64 = await blobToBase64(clone.audioBlob);
            clone.audioBlobType = clone.audioBlob.type || 'audio/ogg';
            delete clone.audioBlob;
        }
        itensConvertidos.push(clone);
    }
    return itensConvertidos;
}

function restaurarItensDoBackup(itens) {
    return itens.map((item) => {
        const clone = { ...item };
        if (clone.audioBlobBase64) {
            clone.audioBlob = base64ToBlob(clone.audioBlobBase64);
            delete clone.audioBlobBase64;
            delete clone.audioBlobType;
        }
        return clone;
    });
}

async function exportarPrancha() {
    try {
        const itens = await db.items.toArray();
        const itensBackup = await prepararItensParaBackup(itens);
        const backup = { app: "TalkToYou", version: 2, exportedAt: new Date().toISOString(), items: itensBackup };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const data = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `Backup_TalkToYou_${data}.json`;
        a.click();
        URL.revokeObjectURL(url);
        const menu = document.getElementById('side-menu');
        if (menu && menu.classList.contains('open')) toggleMenu();
    } catch (error) {
        console.error("Erro ao exportar backup:", error);
        alert("Erro ao exportar backup.");
    }
}

async function importarPrancha(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = async function(event) {
        try {
            const conteudo = JSON.parse(event.target.result);
            const itensOriginais = Array.isArray(conteudo) ? conteudo : conteudo.items;
            if (!Array.isArray(itensOriginais)) { alert("Arquivo inválido."); return; }
            const confirmar = confirm("Substituir todos os cards atuais por este backup?");
            if (!confirmar) { evento.target.value = ""; return; }
            const itensRestaurados = restaurarItensDoBackup(itensOriginais);
            await db.items.clear();
            await db.items.bulkAdd(itensRestaurados);
            alert("Backup importado com sucesso!");
            location.reload();
        } catch (erro) {
            console.error("Erro ao importar backup:", erro);
            alert("Arquivo inválido ou corrompido.");
        } finally {
            evento.target.value = "";
        }
    };
    leitor.readAsText(arquivo);
}

/* --------------------------------------------------------------------
   10. PIX
-------------------------------------------------------------------- */
function copyPix() {
    const chavePix = "260675cd-dd42-4c90-9154-9b684c386dcd";
    navigator.clipboard.writeText(chavePix).then(() => {
        const buttons = document.querySelectorAll('button[onclick="copyPix()"]');
        buttons.forEach((btn) => {
            const oldText = btn.innerText;
            btn.innerText = "✅ COPIADO!";
            setTimeout(() => { btn.innerText = oldText; }, 2000);
        });
    }).catch(() => {
        alert(`Copie a chave PIX: ${chavePix}`);
    });
}

/*
============================================================
INICIALIZAÇÃO DE EVENTOS DA INTERFACE

Este bloco substitui os antigos onclick inline do HTML.

Vantagens:
- HTML mais limpo
- JavaScript centralizado
- Melhor manutenção
- Melhor base para documentação acadêmica
============================================================
*/

document.addEventListener("DOMContentLoaded", () => {
    bindInterfaceEvents();
});

/**
 * Conecta os elementos do HTML às funções do aplicativo.
 */
function bindInterfaceEvents() {
    bindClick("btn-stop-alarm", stopAlarm);
    bindClick("header-back", navigateBack);
    bindClick("btn-open-menu", toggleMenu);
    bindClick("menu-overlay", toggleMenu);

    bindClick("btn-add-item", () => openModal("add"));
    bindClick("btn-manage-items", () => openModal("manage"));

    bindClick("btn-export-backup", exportarPrancha);
    bindClick("btn-export-pdf", exportToPDF);

    bindClick("btn-copy-pix-menu", copyPix);
    bindClick("btn-copy-pix-modal", copyPix);

    bindClick("record-btn", toggleRecording);
    bindClick("btn-save-item", saveCRUDItem);
    bindClick("btn-delete", deleteItem);

    bindClick("btn-open-clear-data", () => openModal("clear-data"));
    bindClick("btn-clear-export-backup", exportarPrancha);
    bindClick("btn-confirm-clear-data", clearApplicationData);

    document.querySelectorAll(".btn-close-modal").forEach((button) => {
        button.addEventListener("click", closeModals);
    });

    const gridConfig = document.getElementById("grid-config");
    if (gridConfig) {
        gridConfig.addEventListener("change", () => {
            updateGridLayout(gridConfig.value);
        });
    }

    const voiceSelect = document.getElementById("voice-select");
    if (voiceSelect) {
        voiceSelect.addEventListener("change", saveVoicePreference);
    }

    const debounceConfig = document.getElementById("debounce-config");
    if (debounceConfig) {
        debounceConfig.addEventListener("change", toggleDebounce);
    }

    const importBackupInput = document.getElementById("input-import-backup");
    if (importBackupInput) {
        importBackupInput.addEventListener("change", importarPrancha);
    }

    const itemImageInput = document.getElementById("item-image");
    if (itemImageInput) {
        itemImageInput.addEventListener("change", () => {
            processImage(itemImageInput);
        });
    }
}

/**
 * Atalho seguro para adicionar eventos de clique.
 */
function bindClick(elementId, callback) {
    const element = document.getElementById(elementId);

    if (!element || typeof callback !== "function") {
        return;
    }

    element.addEventListener("click", callback);
}

/*
============================================================
LIMPEZA DOS DADOS LOCAIS DO APLICATIVO

Esta função apaga dados salvos no aparelho.

Ela é útil para testes, reinstalações e correção de estados locais
corrompidos, mas deve ser usada com cuidado.
============================================================
*/

async function clearApplicationData() {
    const confirmacao = confirm(
        "Tem certeza que deseja apagar todos os dados deste aparelho?\n\n" +
        "Cards, imagens, áudios e configurações locais serão removidos.\n\n" +
        "Recomenda-se fazer backup antes de continuar."
    );

    if (!confirmacao) {
        return;
    }

    try {
        /*
            Apaga o banco local Dexie/IndexedDB.

            O nome 'db' precisa existir no seu dexie-setup.js.
            Como seu sistema já usa Dexie, provavelmente a variável global
            do banco se chama db.
        */
        if (typeof db !== "undefined" && db.delete) {
            await db.delete();
        }

        /*
            Apaga configurações locais.
            Inclui preferências de voz, layout, proteção de toque etc.
        */
        localStorage.clear();

        /*
            sessionStorage raramente será usado nesse app,
            mas limpar também evita sobras temporárias.
        */
        sessionStorage.clear();

        alert(
            "Dados locais apagados com sucesso.\n\n" +
            "O aplicativo será recarregado agora."
        );

        location.reload();
    } catch (error) {
        console.error("Erro ao limpar dados locais:", error);

        alert(
            "Não foi possível limpar todos os dados automaticamente.\n\n" +
            "Tente fechar e abrir o aplicativo novamente ou limpar os dados " +
            "pelas configurações do Android."
        );
    }
}
