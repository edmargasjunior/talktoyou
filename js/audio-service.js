/* ====================================================================
   TalkToYou - Controlador Central de Interface (UI) e Fluxo CRUD
   ==================================================================== */

// 1. Definições Globais Obrigatórias (Necessárias para todos os módulos)
let currentParentId = 0;
let pathHistory = [];
let currentImageBase64 = null;

// Garante que a função de processar imagem seja vista pelo HTML
window.processImage = processImage;

// --- 2. INICIALIZAÇÃO DA APLICAÇÃO ---
window.onload = async () => {
    try {
        // Injeção dinâmica de textos baseada no estado global do dexie-setup.js
        if (typeof i18n !== 'undefined' && typeof langDetect !== 'undefined') {
            document.getElementById('ui-title').innerText = i18n[langDetect].title;
            document.getElementById('app-window-title').innerText = i18n[langDetect].appName;
            
            // Atualiza labels do menu se existirem
            const txtAdd = document.getElementById('txt-add');
            const txtManage = document.getElementById('txt-manage');
            const txtPrint = document.getElementById('txt-print');
            
            if (txtAdd) txtAdd.innerText = i18n[langDetect].add;
            if (txtManage) txtManage.innerText = i18n[langDetect].manage;
            if (txtPrint) txtPrint.innerText = i18n[langDetect].print;
        }

        // Alimenta o banco com os dados iniciais se for o primeiro acesso
        await seedInitialData();
        
        // Renderiza a prancha principal no nível "Início"
        await loadBoard(0);
    } catch (error) {
        console.error("Erro crítico na inicialização do TalkToYou:", error);
    }
};

// --- 3. RENDERIZAÇÃO FÍSICA DOS CARDS (READ) ---
async function loadBoard(parentId = 0) {
    currentParentId = parentId;
    const grid = document.getElementById('board-grid');
    const backBtn = document.getElementById('header-back');
    
    if (!grid || !backBtn) return;
    grid.innerHTML = '';
    
    backBtn.style.visibility = parentId === 0 ? 'hidden' : 'visible';

    const pathTextElem = document.getElementById('path-text');
    if (pathTextElem) {
        if (parentId === 0) {
            pathTextElem.innerText = typeof i18n !== 'undefined' ? i18n[langDetect].welcome : "Início";
        } else {
            const parent = await db.items.get(parentId);
            pathTextElem.innerText = parent ? parent.label : "Pasta";
        }
    }

    const items = await db.items.where('parentId').equals(parentId).toArray();

    if (items.length === 0) {
        grid.innerHTML = `<div class="empty-message">Pasta vazia.<br>Use o menu para incluir itens.</div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `card ${item.type === 'folder' ? 'is-folder' : ''}`;
        card.onclick = () => handleCardClick(item);
        const imageSrc = item.image || getPlaceholderImage(item.label);
        card.innerHTML = `<img src="${imageSrc}" alt="${item.label}"><div class="card-label">${item.label}</div>`;
        grid.appendChild(card);
    });
}

// --- 4. CONTROLE DO MENU E MODAIS ---
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

// --- 5. GESTÃO DE MODAIS (CRUD) ---
async function openModal(mode, itemId = null) {
    closeModals();
    const menu = document.getElementById('side-menu');
    if (mode !== 'edit' && menu && menu.classList.contains('open')) toggleMenu();

    const parentSelect = document.getElementById('item-parent');
    if (!parentSelect) return;
    
    parentSelect.innerHTML = `<option value="0">Início</option>`;
    const folders = await db.items.where('type').equals('folder').toArray();
    folders.forEach(f => parentSelect.innerHTML += `<option value="${f.id}">📁 ${f.label.toUpperCase()}</option>`);

    if (mode === 'add') {
        resetForm();
        document.getElementById('modal-title').innerText = "Incluir Novo";
        document.getElementById('btn-delete').style.display = 'none';
        document.getElementById('item-parent').value = currentParentId;
        document.getElementById('form-modal').style.display = 'flex';
    } else if (mode === 'manage') {
        const list = document.getElementById('manage-list');
        list.innerHTML = '';
        const allItems = await db.items.toArray();
        allItems.forEach(item => {
            const div = document.createElement('div');
            div.style = "padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;";
            div.innerHTML = `<span>${item.label}</span> <button class="btn" style="width:auto; margin:0; padding:5px 10px;" onclick="openModal('edit', ${item.id})">Editar</button>`;
            list.appendChild(div);
        });
        document.getElementById('manage-modal').style.display = 'flex';
    } else if (mode === 'edit') {
        const item = await db.items.get(itemId);
        document.getElementById('edit-id').value = item.id;
        document.getElementById('item-label').value = item.label;
        document.getElementById('item-type').value = item.type;
        document.getElementById('item-parent').value = item.parentId;
        currentImageBase64 = item.image;
        document.getElementById('btn-delete').style.display = 'block';
        document.getElementById('form-modal').style.display = 'flex';
    }
}

// --- 6. PERSISTÊNCIA E IMAGEM ---
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
    if (typeof recordedAudioBlob !== 'undefined' && recordedAudioBlob) data.audioBlob = recordedAudioBlob;
    const id = document.getElementById('edit-id').value;
    id ? await db.items.update(parseInt(id), data) : await db.items.add(data);
    closeModals();
    await loadBoard(data.parentId);
}

function processImage(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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

function resetForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('item-label').value = '';
    document.getElementById('item-alarm').value = '';
    currentImageBase64 = null;
    if (typeof recordedAudioBlob !== 'undefined') recordedAudioBlob = null;
    document.getElementById('photo-status').innerText = "📷 Foto";
}

// --- 7. COMPARTILHAMENTO E DOAÇÃO ---
async function exportarPrancha() {
    const itens = await db.items.toArray();
    const blob = new Blob([JSON.stringify(itens)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `TalkToYou_Backup.json`; a.click();
    toggleMenu();
}

async function importarPrancha(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        if (confirm("Deseja substituir sua prancha atual pelos dados deste arquivo?")) {
            await db.items.clear();
            await db.items.bulkAdd(JSON.parse(ev.target.result));
            location.reload();
        }
    };
    reader.readAsText(file);
}

function copyPix() {
    const chavePix = "seu-pix@email.com"; // Substitua pela sua chave real antes do commit
    navigator.clipboard.writeText(chavePix).then(() => alert("Chave PIX copiada! Gratidão pelo apoio."));
}
