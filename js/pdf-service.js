/* ======================================================================
   TalkToYou - pdf-service.js
   Geração de PDF imprimível da prancha.

   Objetivo:
   Permitir que familiares, escolas e terapeutas imprimam cards físicos
   a partir da mesma prancha usada no aplicativo.

   Correção desta versão:
   A impressão passa a respeitar o idioma selecionado no app.

   Regra:
   - cards oficiais usam o texto traduzido;
   - cards personalizados permanecem no texto criado pelo usuário;
   - imagens automáticas usam apenas ícone, sem texto interno.
====================================================================== */

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
 * Retorna o texto que deve aparecer no PDF.
 */
function getPdfLabel(item) {
    if (typeof window.getDisplayLabel === "function") {
        return window.getDisplayLabel(item);
    }

    return item && item.label ? item.label : "";
}

function drawPdfHeader(doc, title, continuation = false) {
    const finalTitle = continuation ? `${title.toUpperCase()} (CONT.)` : title.toUpperCase();

    doc.setFillColor(255, 255, 0);
    doc.rect(10, 10, 190, 20, "F");

    doc.setFontSize(continuation ? 18 : 22);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0);

    doc.text(finalTitle, 105, 23, { align: "center" });
}

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

function drawCardBorder(doc, x, y, width, height) {
    doc.setDrawColor(255, 255, 0);
    doc.setLineWidth(1);
    doc.rect(x, y, width, height);
}

function drawCardText(doc, label, x, y, width) {
    doc.setFontSize(10);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0);

    const finalLabel = String(label || "").toUpperCase().slice(0, 22);

    doc.text(finalLabel, x + (width / 2), y + 5, { align: "center" });
}

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

function convertSvgDataUrlToPng(svgDataUrl) {
    return new Promise((resolve, reject) => {
        const temporaryImage = new Image();

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
