/* ====================================================================
   TalkToYou - Módulo de Geração e Exportação de Pranchas em PDF
   ==================================================================== */

async function exportToPDF() {
    // Fecha o menu lateral preventivamente para melhorar a experiência visual
    if (typeof toggleMenu === "function" && document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        // Busca todas as pastas (Categorias Principais) cadastradas no banco local
        const folders = await db.items.where('type').equals('folder').toArray();

        if (folders.length === 0) {
            const alertMsg = langDetect === 'pt' ? "Crie pelo menos uma pasta (Categoria) antes de imprimir." : "Create at least one folder (Category) before printing.";
            alert(alertMsg);
            return;
        }

        // Percorre cada pasta gerando uma página exclusiva para ela (Quebra de página por categoria)
        for (let i = 0; i < folders.length; i++) {
            const currentFolder = folders[i];

            // A partir da segunda pasta, adiciona uma nova página física no documento
            if (i > 0) doc.addPage();

            // 1. DESENHO DO CABEÇALHO (Estilo Faixa Amarela - Referência PECS)
            doc.setFillColor(255, 255, 0); // Cor amarela pura para contraste de alto estímulo
            doc.rect(10, 10, 190, 20, 'F'); // Preenche o retângulo superior da página

            doc.setFontSize(22);
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(0); // Texto em preto puro para legibilidade máxima
            doc.text(currentFolder.label.toUpperCase(), 105, 23, { align: 'center' });

            // 2. BUSCA E RENDERIZAÇÃO DOS SUBCARDS PERTENCENTES À PASTA
            const subcards = await db.items.where('parentId').equals(currentFolder.id).toArray();

            // Configurações físicas da grade de impressão (Coordenadas em milímetros)
            let currentX = 15;
            let currentY = 40;
            const cardWidth = 40;
            const cardHeight = 45;
            const horizontalGap = 5;
            const verticalGap = 5;

            for (const sub of subcards) {
                // Desenha a moldura amarela que envolve o card físico individual
                doc.setDrawColor(255, 255, 0);
                doc.setLineWidth(1);
                doc.rect(currentX, currentY, cardWidth, cardHeight);

                // Insere o rótulo de texto na parte superior interna da moldura
                doc.setFontSize(10);
                doc.setFont("Helvetica", "bold");
                doc.text(sub.label.toUpperCase(), currentX + (cardWidth / 2), currentY + 5, { align: 'center' });

                // 3. LOGICA REVISADA: CAPTURA E INJEÇÃO DA IMAGEM (FOTO OU PLACEHOLDER)
                // Se o card não tiver imagem customizada, recuperamos o gerador estático do banco
                const finalImageBase64 = sub.image || (typeof getPlaceholderImage === "function" ? getPlaceholderImage(sub.label) : null);

                if (finalImageBase64) {
                    try {
                        // Verifica se é um SVG dinâmico (placeholder). O jsPDF necessita mapear vetores de forma explícita
                        if (finalImageBase64.startsWith("data:image/svg+xml")) {
                            doc.addImage(finalImageBase64, 'SVG', currentX + 5, currentY + 8, 30, 30);
                        } else {
                            // Se for JPEG/PNG (foto tirada pelo pai) injeta de forma padrão estável
                            doc.addImage(finalImageBase64, 'JPEG', currentX + 5, currentY + 8, 30, 30);
                        }
                    } catch (imgError) {
                        console.warn("Falha ao renderizar imagem no PDF para o item: " + sub.label, imgError);
                    }
                }

                // Incrementa a coordenada X para posicionar o próximo card na mesma linha horizontal
                currentX += cardWidth + horizontalGap;

                // Se o próximo card ultrapassar o limite físico da folha (margem direita), pula de linha
                if (currentX > 165) {
                    currentX = 15; // Reseta para a margem esquerda
                    currentY += cardHeight + verticalGap; // Avança para a linha de baixo
                }
                
                // Monitoramento de estouro de página vertical (Garante segurança caso haja dezenas de subcards)
                if (currentY > 240) {
                    doc.addPage();
                    // Replica o cabeçalho na página de continuação
                    doc.setFillColor(255, 255, 0);
                    doc.rect(10, 10, 190, 20, 'F');
                    doc.setFontSize(18);
                    doc.text(currentFolder.label.toUpperCase() + " (CONT.)", 105, 23, { align: 'center' });
                    currentX = 15;
                    currentY = 40;
                }
            }
        }

        // 4. SALVAMENTO E DOWNLOAD LOCAL DO DOCUMENTO
        doc.save("Prancha_TalkToYou.pdf");

    } catch (pdfError) {
        console.error("Erro crítico durante a geração do documento PDF:", pdfError);
        const errorAlert = langDetect === 'pt' ? "Erro técnico ao gerar o arquivo PDF." : "Technical error generating PDF file.";
        alert(errorAlert);
    }
}
