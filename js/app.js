/* ====================================================================
   TalkToYou - Controlador Central de Interface (UI) e Fluxo CRUD
   ==================================================================== */

// Variáveis globais de navegação e controle de estado
let currentParentId = 0;
let pathHistory = [];
let currentImageBase64 = null;

// Garante que a função de processar imagem seja vista pelo HTML
window.processImage = processImage;

// --- 1. INICIALIZAÇÃO DA APLICAÇÃO ---
window.onload = async () => {
    try {
        // Injeção dinâmica de textos (Segura: dentro do onload)
        if (typeof i18n !== 'undefined') {
            document.getElementById('ui-title').innerText = i18n[langDetect].title;
            document.getElementById('app-window-title').innerText = i18n[langDetect].appName;
            
            // Verifica se os elementos existem antes de injetar
            if(document.getElementById('txt-add')) document.getElementById('txt-add').innerText = i18n[langDetect].add;
            if(document.getElementById('txt-manage')) document.getElementById('txt-manage').innerText = i18n[langDetect].manage;
            if(document.getElementById('txt-print')) document.getElementById('txt-print').innerText = i18n[langDetect].print;
        }

              // Aguarda 3.5 segundos para a animação terminar e remove a splash
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 500); // Remove do código após o fade-out
            }
        }, 3500);


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
        
        // Evento de clique
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
            list.innerHTML = `<p style="padding:10px;">${langDetect === 'pt' ? 'Nenhum item.' : 'No items.'}</p>`;
        }
        allItems.forEach(item => {
            const div = document.createElement('div');
            div.style = "padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;";
            div.innerHTML = `
                <span>${item.type === 'folder' ? '📁' : '🟦'} ${item.label}</span>
                <button class="btn" style="width:auto; margin:0; padding:5px 10px;" onclick="openModal('edit', ${item.id})">
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
        document.getElementById('modal-title').innerText = "Editar CARD";
        document.getElementById('edit-id').value = item.id;
        document.getElementById('item-label').value = item.label;
        document.getElementById('item-type').value = item.type;
        document.getElementById('item-parent').value = item.parentId ?? 0;
        document.getElementById('item-alarm').value = item.alarmTime || "";
        currentImageBase64 = item.image || null;
        document.getElementById('photo-status').innerText = "✅ Foto OK";
        document.getElementById('btn-delete').style.display = 'block';
        document.getElementById('form-modal').style.display = 'flex';
    }
}

// --- 5. PERSISTÊNCIA NO BANCO (DEXIE BRIDGE) ---
async function saveCRUDItem() {
    const labelVal = document.getElementById('item-label').value.trim();
    if (!labelVal) return alert("Dê um nome ao item.");

    const data = {
        label: labelVal,
        type: document.getElementById('item-type').value,
        parentId: parseInt(document.getElementById('item-parent').value || "0"),
        alarmTime: document.getElementById('item-alarm').value || "",
        image: currentImageBase64 || getPlaceholderImage(labelVal)
    };

    if (typeof recordedAudioBlob !== 'undefined' && recordedAudioBlob) {
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
        await loadBoard(data.parentId);
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

async function deleteItem() {
    const id = parseInt(document.getElementById('edit-id').value);
    if (!id) return;
    if (confirm("Deseja realmente excluir?")) {
        await deleteItemAndChildren(id);
        closeModals();
        await loadBoard(0);
    }
}

async function deleteItemAndChildren(id) {
    const children = await db.items.where('parentId').equals(id).toArray();
    for (const child of children) await deleteItemAndChildren(child.id);
    await db.items.delete(id);
}

function resetForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('item-label').value = '';
    document.getElementById('item-alarm').value = '';
    currentImageBase64 = null;
    if(typeof recordedAudioBlob !== 'undefined') recordedAudioBlob = null;
    document.getElementById('photo-status').innerText = "📷 Foto";
}

// --- 6. PROCESSAMENTO DE IMAGENS (CANVAS & BASE64) ---
function processImage(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('resize-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 300; canvas.height = 300;
            ctx.drawImage(img, 0, 0, 300, 300);
            currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('photo-status').innerText = "✅ Foto OK";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
}

// --- 7. MÓDULO DE COMPARTILHAMENTO ---
async function exportarPrancha() {
    try {
        const itens = await db.items.toArray();
        const blob = new Blob([JSON.stringify(itens)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Backup_TalkToYou.json`; a.click();
        toggleMenu();
    } catch (e) { alert("Erro ao exportar."); }
}

async function importarPrancha(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = async function(e) {
        try {
            const itens = JSON.parse(e.target.result);
            if (confirm("Substituir todos os cards?")) {
                await db.items.clear();
                await db.items.bulkAdd(itens);
                location.reload();
            }
        } catch (erro) { alert("Arquivo inválido."); }
    };
    leitor.readAsText(arquivo);
}

// --- 8. LÓGICA DE NAVEGAÇÃO E CLIQUE ---
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
    
    if (typeof playSequenceFluida === 'function') {
        await playSequenceFluida(sequence);
    }
}

// --- 9. DOAÇÃO PIX ---
function copyPix() {
    const chavePix = "seu-pix@email.com"; // Substitua aqui
    navigator.clipboard.writeText(chavePix).then(() => {
        alert("Chave PIX copiada! Muito obrigado pelo apoio.");
    });
}
