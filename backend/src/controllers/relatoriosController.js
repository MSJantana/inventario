import { prisma } from '../index.js';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';

export const equipamentosPdf = async (req, res, next) => {
  try {
    const isAdmin = req.usuario?.role === 'ADMIN';
    const where = !isAdmin ? { escolaId: req.usuario?.escolaId || undefined } : {};

    const equipamentos = await prisma.equipamento.findMany({
      where,
      include: { escola: true },
      orderBy: [
        { escola: { nome: 'asc' } },
        { nome: 'asc' }
      ]
    });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-equipamentos.pdf"');

    doc.pipe(res);

    const theme = {
      primary: '#1F4E79',
      headerBg: '#F2F2F2',
      border: '#CCCCCC',
      text: '#000000',
    };

    const headerLogoPath = process.env.REPORT_LOGO_PATH;
    const footerLogoPath = process.env.REPORT_LOGO_FOOTER_PATH || headerLogoPath;

    const hasHeaderLogo = headerLogoPath && fs.existsSync(headerLogoPath);
    const hasFooterLogo = footerLogoPath && fs.existsSync(footerLogoPath);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    const drawHeader = () => {
      const topY = doc.page.margins.top;
      // Logo topo
      if (hasHeaderLogo) {
        try {
          doc.image(headerLogoPath, left, topY, { fit: [120, 60] });
        } catch {}
      }
      // Título centralizado
      doc.fillColor(theme.primary).font('Helvetica-Bold').fontSize(18)
        .text('Relatório de Equipamentos', left, topY + 10, { width: contentWidth, align: 'center' });
      doc.fillColor(theme.text).font('Helvetica').fontSize(10)
        .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, left, topY + 34, { width: contentWidth, align: 'center' });
      // Linha separadora
      doc.moveTo(left, topY + 80).lineTo(right, topY + 80).strokeColor(theme.border).lineWidth(1).stroke();
    };

    const drawFooter = () => {
      const bottomY = doc.page.height - doc.page.margins.bottom - 40;
      // Linha separadora acima do rodapé
      doc.moveTo(left, bottomY).lineTo(right, bottomY).strokeColor(theme.border).lineWidth(1).stroke();
      // Logo menor no rodapé
      if (hasFooterLogo) {
        try {
          doc.image(footerLogoPath, left, bottomY + 8, { fit: [80, 40] });
        } catch {}
      }
      // Número da página à direita
      doc.fillColor(theme.text).fontSize(9).text(`Página ${doc.page.number}`, left, bottomY + 18, {
        width: contentWidth, align: 'right'
      });
    };

    const columns = [
      { key: 'nome', label: 'Nome', width: 80 },
      { key: 'tipo', label: 'Tipo', width: 50 },
      { key: 'modelo', label: 'Modelo', width: 70 },
      { key: 'serial', label: 'Serial', width: 90 },
      { key: 'status', label: 'Status', width: 50 },
      { key: 'escola', label: 'Escola', width: 90 },
      { key: 'usuario', label: 'Usuário', width: 45 },
      { key: 'dataAquisicao', label: 'Data de Aquisição', width: 40 },
    ];
    const colPaddingX = 6;
    const rowPaddingY = 6;
    const tableTopStart = doc.page.margins.top + 88;

    const drawTableHeader = (y) => {
      doc.save();
      doc.rect(left, y, contentWidth, 24).fillAndStroke(theme.headerBg, theme.border);
      let x = left;
      doc.fillColor(theme.primary).font('Helvetica-Bold').fontSize(11);
      for (const col of columns) {
        doc.text(col.label, x + colPaddingX, y + 6, { width: col.width - colPaddingX * 2 });
        x += col.width;
      }
      doc.restore();
    };

    const maxContentY = () => doc.page.height - doc.page.margins.bottom - 60; // espaço para rodapé

    // Desenhar cabeçalho e header da tabela
    drawHeader();
    let y = tableTopStart;
    drawTableHeader(y);
    y += 26;

    doc.font('Helvetica').fontSize(10).fillColor(theme.text);

    if (equipamentos.length === 0) {
      doc.text('Nenhum equipamento encontrado para o seu escopo.', left, y + 10, { width: contentWidth, align: 'center' });
      drawFooter();
      doc.end();
      return;
    }

    for (const e of equipamentos) {
      const values = {
        nome: e.nome || '-',
        tipo: e.tipo || '-',
        modelo: e.modelo || '-',
        serial: e.serial || '-',
        status: e.status || '-',
        escola: e.escola?.nome || '-',
        usuario: e.usuarioNome || '-',
        dataAquisicao: e.dataAquisicao || '-',
      };

      // Calcular altura da linha com wrapping
      let x = left;
      let rowHeight = 0;
      const heights = [];
      for (const col of columns) {
        const h = doc.heightOfString(values[col.key], { width: col.width - colPaddingX * 2 });
        heights.push(h);
        rowHeight = Math.max(rowHeight, h);
      }
      rowHeight += rowPaddingY * 2;

      // Quebra de página se necessário
      if (y + rowHeight > maxContentY()) {
        drawFooter();
        doc.addPage();
        drawHeader();
        y = tableTopStart;
        drawTableHeader(y);
        y += 26;
      }

      // Linha (opcional: alternar cor de fundo)
      doc.save();
      doc.rect(left, y, contentWidth, rowHeight).strokeColor(theme.border).lineWidth(0.5).stroke();
      x = left;
      // Células
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const cellY = y + rowPaddingY;
        doc.text(values[col.key], x + colPaddingX, cellY, { width: col.width - colPaddingX * 2 });
        x += col.width;
      }
      doc.restore();
      y += rowHeight;
    }

    // Rodapé final
    drawFooter();
    doc.end();
  } catch (error) {
    next(error);
  }
};
