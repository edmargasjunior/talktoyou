/* ====================================================================
   TalkToYou - Controlador Central de Interface (UI) e Fluxo CRUD
   ==================================================================== */

// Injeção dinâmica de textos baseada no estado global resolvido
document.getElementById('ui-title').innerText = i18n[langDetect].title;
document.getElementById('app-window-title').innerText = i18n[langDetect].appName;
document.getElementById('txt-add').innerText = i18n[langDetect].add;
document.getElementById('txt-manage').innerText = i18n[langDetect].manage;
document.getElementById('txt-print').innerText = i18n[langDetect].print;


// Variáveis globais de navegação e controle de estado
let currentParentId = 0;
let pathHistory = [];
let currentImageBase64 = null;

window.processImage = processImage;

// --- 1. INICIALIZAÇÃO DA APLICAÇÃO ---
window.onload = async () => {
    try {
        // Alimenta o banco com os dados iniciais se for o primeiro acesso
        await seedInitialData();
        
        // Renderiza a prancha principal no nível "Início"
        await loadBoard(0);
    } catch (error) {
        console.error("Erro crítico na inicialização do TalkToYou:", error);
    }
};

// --- 2. RENDERIZAÇÃO FÍSICA DOS CARDS (READ) ---
async function loadBoard(parentId = 0) {
    currentParentId = parentId;
    const grid = document.getElementById('board-grid');
    const backBtn = document.getElementById('header-back');
    
    if (!grid || !backBtn) return;
    grid.innerHTML = '';
    
    // O botão voltar fica visível apenas dentro de subpastas
    backBtn.style.visibility = parentId === 0 ? 'hidden' : 'visible';

    // Atualiza o texto do caminho atual (Breadcrumb)
    const pathTextElem = document.getElementById('path-text');
    if (pathTextElem) {
        if (parentId === 0) {
            pathTextElem.innerText = i18n[langDetect].welcome;
        } else {
            const parent = await db.items.get(parentId);
            pathTextElem.innerText = parent ? parent.label : i18n[langDetect].welcome;
        }
    }

    // Busca os registros do banco relativos à pasta atual
    const items = await db.items.where('parentId').equals(parentId).toArray();

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">
                ${langDetect === 'pt' 
                    ? 'Pasta vazia.<br>Toque no menu ☰ e selecione "Incluir Novo" para começar.' 
                    : 'Empty folder.<br>Tap the ☰ menu and select "Add New" to begin.'}
            </div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `card ${item.type === 'folder' ? 'is-folder' : ''}`;
        
        // Evento de clique associado ao player do audio-service.js
        card.onclick = () => handleCardClick(item);

        const imageSrc = item.image || getPlaceholderImage(item.label);

        card.innerHTML = `
            <img src="${imageSrc}" alt="${item.label}">
            <div class="card-label">${item.label}</div>
        `;
        grid.appendChild(card);
    });
}

// --- 3. CONTROLE DO MENU LATERAL E MODAIS (INTERFACE) ---
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    
    if (!menu || !overlay) return;
    
    menu.classList.toggle('open');
    overlay.style.display = menu.classList.contains('open') ? 'block' : 'none';
}

function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

async function navigateBack() { 
    const prevId = pathHistory.length > 0 ? pathHistory.pop() : 0; 
    await loadBoard(prevId); 
}

// --- 4. GESTÃO DE MODAIS (CREATE / UPDATE / DELETE VIEW) ---
async function openModal(mode, itemId = null) {
    closeModals();

    // Fecha o menu lateral se ele estiver aberto
    const menu = document.getElementById('side-menu');
    if (mode !== 'edit' && menu && menu.classList.contains('open')) {
        toggleMenu();
    }

    const parentSelect = document.getElementById('item-parent');
    if (!parentSelect) return;
    
    parentSelect.innerHTML = `<option value="0">${langDetect === 'pt' ? 'Início (Raiz)' : 'Home (Root)'}</option>`;
    
    const folders = await db.items.where('type').equals('folder').toArray();
    folders.forEach(folder => {
        parentSelect.innerHTML += `<option value="${folder.id}">📁 ${folder.label.toUpperCase()}</option>`;
    });

    if (mode === 'add') {
        resetForm();
        document.getElementById('modal-title').innerText = langDetect === 'pt' ? "Incluir Novo CARD" : "Add New CARD";
        document.getElementById('btn-delete').style.display = 'none';
        document.getElementById('item-parent').value = currentParentId || 0;
        document.getElementById('form-modal').style.display = 'flex';
    } 
    else if (mode === 'manage') {
        const list = document.getElementById('manage-list');
        if (!list) return;
        list.innerHTML = '';

        const allItems = await db.items.toArray();

        if (allItems.length === 0) {
            list.innerHTML = `<p style="color:#777; padding:10px;">${langDetect === 'pt' ? 'Nenhum item cadastrado.' : 'No items registered.'}</p>`;
        }

        allItems.forEach(item => {
            const div = document.createElement('div');
            div.innerHTML = `
                <span>${item.type === 'folder' ? '📁' : '🟦'} <b>${item.label.toUpperCase()}</b></span>
                <button class="btn btn-secondary" style="width:auto; margin-top:0; padding:6px 12px;" onclick="openModal('edit', ${item.id})">
                    ${langDetect === 'pt' ? 'Editar' : 'Edit'}
                </button>
            `;
            list.appendChild(div);
        });

        document.getElementById('manage-modal').style.display = 'flex';
    } 
    else if (mode === 'edit') {
        resetForm();
        const item = await db.items.get(itemId);
        if (!item) return;

        document.getElementById('modal-title').innerText = langDetect === 'pt' ? "Editar CARD" : "Edit CARD";
        document.getElementById('edit-id').value = item.id;
        document.getElementById('item-label').value = item.label;
        document.getElementById('item-type').value = item.type;
        document.getElementById('item-parent').value = item.parentId ?? 0;
        document.getElementById('item-alarm').value = item.alarmTime || "";

        currentImageBase64 = item.image || null;
        recordedAudioBlob = item.audioBlob || null;

        document.getElementById('photo-status').innerText = currentImageBase64 ? "✅ Foto OK" : "📷 Foto";
        document.getElementById('record-status').innerText = recordedAudioBlob ? "✅ Áudio Gravado" : "Toque para gravar";

        document.getElementById('btn-delete').style.display = 'block';
        document.getElementById('form-modal').style.display = 'flex';
    }
}

// --- 5. PERSISTÊNCIA NO BANCO (DEXIE BRIDGE) ---
async function saveCRUDItem() {
    const labelVal = document.getElementById('item-label').value.trim();
    if (!labelVal) {
        alert(langDetect === 'pt' ? "Por favor, dê um nome ao item." : "Please give the item a name.");
        return;
    }

    if (!currentImageBase64) {
        currentImageBase64 = getPlaceholderImage(labelVal);
    }

    const selectedParentId = parseInt(document.getElementById('item-parent').value || "0");

    const data = {
        label: labelVal,
        type: document.getElementById('item-type').value,
        parentId: selectedParentId,
        alarmTime: document.getElementById('item-alarm').value || "",
        image: currentImageBase64
    };

    if (recordedAudioBlob) {
        data.audioBlob = recordedAudioBlob;
    }

    try {
        const id = document.getElementById('edit-id').value;

        if (id) {
            await db.items.update(parseInt(id), data);
        } else {
            await db.items.add(data);
        }

        closeModals();
        if (selectedParentId !== currentParentId) {
            pathHistory = selectedParentId === 0 ? [] : [0];
        }
        await loadBoard(selectedParentId);
    } catch (error) {
        console.error("Erro ao salvar item:", error);
    }
}

async function deleteItem() {
    const id = parseInt(document.getElementById('edit-id').value);
    if (!id) return;

    const confirmMsg = langDetect === 'pt' 
        ? "Tem certeza? Ao excluir uma pasta, todos os cards dentro dela serão apagados." 
        : "Are you sure? Deleting a folder will erase all cards inside it.";

    if (confirm(confirmMsg)) {
        try {
            await deleteItemAndChildren(id);
            closeModals();
            pathHistory = [];
            await loadBoard(0);
        } catch (error) {
            console.error("Erro ao deletar:", error);
        }
    }
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
    document.getElementById('item-type').value = 'card';
    document.getElementById('item-parent').value = currentParentId || 0;
    document.getElementById('item-alarm').value = '';
    document.getElementById('item-image').value = '';

    currentImageBase64 = null;
    recordedAudioBlob = null;

    document.getElementById('photo-status').innerText = langDetect === 'pt' ? "📷 Tirar ou Escolher Foto" : "📷 Take or Choose Photo";
    document.getElementById('record-status').innerText = langDetect === 'pt' ? "Toque para gravar sua voz" : "Tap to record your voice";
    document.getElementById('record-btn').style.background = "var(--danger)";
}

// --- 6. PROCESSAMENTO DE IMAGENS (CANVAS & BASE64) ---
function processImage(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('resize-canvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Força a imagem a virar um quadrado perfeito de 300x300 pixels para os cards
            canvas.width = 300;
            canvas.height = 300;
            
            // Desenha a imagem cortando e ajustando no centro (estilo object-fit: cover)
            let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
            if (img.width > img.height) {
                srcW = img.height;
                srcX = (img.width - img.height) / 2;
            } else {
                srcH = img.width;
                srcY = (img.height - img.width) / 2;
            }
            
            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 300, 300);
            
            // Transforma o desenho em texto Base64 leve (JPEG com 70% de qualidade)
            currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            // Atualiza o texto do botão no formulário para dar um feedback visual ao usuário
            const photoStatus = document.getElementById('photo-status');
            if (photoStatus) {
                photoStatus.innerText = langDetect === 'pt' ? "✅ Foto Selecionada" : "✅ Photo Selected";
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 7 - MÓDULO DE COMPARTILHAMENTO
async function exportarPrancha() {
    try {
        const todosOsItens = await db.items.toArray();
        const dadosParaExportar = JSON.stringify(todosOsItens);
        const blob = new Blob([dadosParaExportar], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `TalkToYou_Backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Erro ao exportar prancha.");
    }
}

async function importarPrancha(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = async function(e) {
        try {
            const itensImportados = JSON.parse(e.target.result);
            const confirmar = confirm("Isso substituirá todos os seus cards atuais. Deseja continuar?");
            if (confirmar) {
                await db.items.clear();
                await db.items.bulkAdd(itensImportados);
                location.reload();
            }
        } catch (erro) {
            alert("Arquivo inválido.");
        }
    };
    leitor.readAsText(arquivo);
}
