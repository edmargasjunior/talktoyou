/**
 * @file pdf-service.js
 * @project TalkToYou - Aplicativo de Comunicação Alternativa e Aumentativa (CAA)
 * @author Edmar Geraldo Almeida de Souza Junior
 * @institution Universidade Federal de Minas Gerais (UFMG)
 * @year 2026
 * @description exportação da prancha para PDF
 * @motivation Desenvolvido como produto técnico/científico para o projeto de Mestrado, motivado pela necessidade de fornecer uma solução de CAA 100% local-first, gratuita, personalizável e acessível para famílias, terapeutas e usuários com severas restrições na fala, garantindo total privacidade dos dados através de armazenamento estritamente local (IndexedDB/Dexie).
 */

/**
 * @description Exporta todas as pastas e subcards do Dexie para PDF imprimível, respeitando idioma e rótulos exibidos.
 * @returns {Promise<void>} Resolve após salvar o arquivo; retorno antecipado se não houver pastas.
 * @throws {Error} Propagado internamente se jsPDF não estiver carregado; exibe alert ao usuário em falhas gerais.
 */
async function exportToPDF() {
    const menu = document.getElementById("side-menu");

    if (typeof toggleMenu === "function" && menu && menu.classList.contains("open")) {
        toggleMenu();
    }

    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error("Biblioteca jsPDF não carregada.");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const folders = await db.items.where("type").equals("folder").toArray();

        if (folders.length === 0) {
            alert(typeof getText === "function" ? getText("pdfNeedFolder") : "Crie uma pasta antes de imprimir.");
            return;
        }

        for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
            const currentFolder = folders[folderIndex];

            if (folderIndex > 0) {
                doc.addPage();
            }

            const folderTitle = getPdfLabel(currentFolder);

            drawPdfHeader(doc, folderTitle);

            const subcards = await db.items
                .where("parentId")
                .equals(currentFolder.id)
                .toArray();

            await drawCardsGrid(doc, subcards, folderTitle);
        }

        const lang = window.TalkToYouI18n
            ? TalkToYouI18n.getCurrentLanguage()
            : "pt-BR";

        doc.save(`Prancha_TalkToYou_${lang}.pdf`);
    } catch (error) {
        console.error("Erro crítico durante a geração do documento PDF:", error);
        alert(typeof getText === "function" ? getText("pdfError") : "Erro ao gerar PDF.");
    }
}

/**
 * @description Retorna o rótulo do item para o PDF (traduzido para oficiais, preservado para personalizados).
 * @param {object|null|undefined} item - Card ou pasta do IndexedDB.
 * @returns {string} Texto a imprimir abaixo do ícone.
 */
function getPdfLabel(item) {
    if (typeof window.getDisplayLabel === "function") {
        return window.getDisplayLabel(item);
    }

    return item && item.label ? item.label : "";
}

/**
 * @description Desenha faixa amarela de cabeçalho com título da pasta na página atual do jsPDF.
 * @param {import('jspdf').jsPDF} doc - Instância do documento PDF.
 * @param {string} title - Nome da pasta (já traduzido).
 * @param {boolean} [continuation=false] - Se true, acrescenta sufixo (CONT.) na página de continuação.
 * @returns {void}
 */
function drawPdfHeader(doc, title, continuation = false) {
    const finalTitle = continuation ? `${title.toUpperCase()} (CONT.)` : title.toUpperCase();

    doc.setFillColor(255, 255, 0);
    doc.rect(10, 10, 190, 20, "F");

    doc.setFontSize(continuation ? 18 : 22);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0);

    doc.text(finalTitle, 105, 23, { align: "center" });
}

/**
 * @description Posiciona grade de cards no PDF com quebra de página e cabeçalho de continuação quando necessário.
 * @param {import('jspdf').jsPDF} doc - Instância do documento PDF.
 * @param {Array<object>} subcards - Filhos diretos da pasta (Promise Dexie já resolvida).
 * @param {string} folderTitle - Título para páginas de continuação.
 * @returns {Promise<void>}
 */
async function drawCardsGrid(doc, subcards, folderTitle) {
    let currentX = 15;
    let currentY = 40;

    const cardWidth = 40;
    const cardHeight = 45;
    const horizontalGap = 5;
    const verticalGap = 5;

    for (const subcard of subcards) {
        const translatedLabel = getPdfLabel(subcard);

        drawCardBorder(doc, currentX, currentY, cardWidth, cardHeight);
        drawCardText(doc, translatedLabel, currentX, currentY, cardWidth);

        await drawCardImage(doc, subcard, translatedLabel, currentX, currentY);

        currentX += cardWidth + horizontalGap;

        if (currentX > 165) {
            currentX = 15;
            currentY += cardHeight + verticalGap;
        }

        if (currentY > 240) {
            doc.addPage();
            drawPdfHeader(doc, folderTitle, true);

            currentX = 15;
            currentY = 40;
        }
    }
}

/**
 * @description Desenha borda retangular amarela de um card na grade do PDF.
 * @param {import('jspdf').jsPDF} doc - Instância do documento PDF.
 * @param {number} x - Coordenada X em mm.
 * @param {number} y - Coordenada Y em mm.
 * @param {number} width - Largura do card em mm.
 * @param {number} height - Altura do card em mm.
 * @returns {void}
 */
function drawCardBorder(doc, x, y, width, height) {
    doc.setDrawColor(255, 255, 0);
    doc.setLineWidth(1);
    doc.rect(x, y, width, height);
}

/**
 * @description Imprime rótulo do card centralizado na faixa superior da célula (máx. 22 caracteres).
 * @param {import('jspdf').jsPDF} doc - Instância do documento PDF.
 * @param {string} label - Texto já traduzido ou personalizado.
 * @param {number} x - Coordenada X da célula em mm.
 * @param {number} y - Coordenada Y da célula em mm.
 * @param {number} width - Largura da célula em mm.
 * @returns {void}
 */
function drawCardText(doc, label, x, y, width) {
    doc.setFontSize(10);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0);

    const finalLabel = String(label || "").toUpperCase().slice(0, 22);

    doc.text(finalLabel, x + (width / 2), y + 5, { align: "center" });
}

/**
 * @description Incorpora imagem do card (foto, SVG placeholder ou JPEG/PNG) na área visual do PDF.
 * @param {import('jspdf').jsPDF} doc - Instância do documento PDF.
 * @param {object} item - Card do IndexedDB.
 * @param {string} translatedLabel - Rótulo para resolver placeholder visual.
 * @param {number} x - Coordenada X da célula em mm.
 * @param {number} y - Coordenada Y da célula em mm.
 * @returns {Promise<void>} Resolve após addImage ou silenciosamente se não houver imagem.
 */
async function drawCardImage(doc, item, translatedLabel, x, y) {
    let imageBase64 = null;

    if (typeof window.getCardVisualImage === "function") {
        imageBase64 = window.getCardVisualImage(item, translatedLabel);
    } else {
        imageBase64 = item.image
            || (typeof getPlaceholderImage === "function" ? getPlaceholderImage(translatedLabel) : null);
    }

    if (!imageBase64) return;

    try {
        if (imageBase64.startsWith("data:image/svg+xml")) {
            const pngDataUrl = await convertSvgDataUrlToPng(imageBase64);
            doc.addImage(pngDataUrl, "PNG", x + 5, y + 8, 30, 30);
            return;
        }

        const format = imageBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(imageBase64, format, x + 5, y + 8, 30, 30);
    } catch (error) {
        console.warn("Falha ao renderizar imagem no PDF para o item:", item.label, error);
    }
}

/**
 * @description Converte data URL SVG em PNG rasterizado via canvas para compatibilidade com jsPDF.
 * @param {string} svgDataUrl - Data URL data:image/svg+xml.
 * @returns {Promise<string>} Data URL PNG (image/png).
 * @throws {Event|Error} Rejeita a Promise se o carregamento da imagem SVG falhar (onerror).
 */
function convertSvgDataUrlToPng(svgDataUrl) {
    return new Promise((resolve, reject) => {
        const temporaryImage = new Image();

        /**
         * @description Listener onload: desenha SVG no canvas 300×300 e exporta PNG.
         * @returns {void}
         */
        temporaryImage.onload = function() {
            const temporaryCanvas = document.createElement("canvas");

            temporaryCanvas.width = 300;
            temporaryCanvas.height = 300;

            const temporaryContext = temporaryCanvas.getContext("2d");

            temporaryContext.drawImage(temporaryImage, 0, 0, 300, 300);

            resolve(temporaryCanvas.toDataURL("image/png"));
        };

        temporaryImage.onerror = reject;
        temporaryImage.src = svgDataUrl;
    });
}
