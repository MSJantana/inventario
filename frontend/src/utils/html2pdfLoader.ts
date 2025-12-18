/**
 * Utility for dynamically loading html2pdf.js library
 * This helps reduce initial bundle size by loading the library only when needed
 */

interface Html2PdfOptions {
  margin?: number | [number, number, number, number];
  filename?: string;
  image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number };
  html2canvas?: { scale?: number };
  jsPDF?: { unit?: string; format?: string | [number, number]; orientation?: 'portrait' | 'landscape' };
  // Custom header/footer options
  headerLogoUrl?: string;
  footerLogoUrl?: string;
  schoolName?: string;
  footerTextColor?: string; // default black
  headerLogoWidthMm?: number; // default 35
  headerLogoHeightMm?: number; // default 14 (keeps aspect by default)
  footerLogoWidthMm?: number; // default 24
  footerLogoHeightMm?: number; // default 10
  title?: string;
  drawHeader?: boolean;
}

interface Html2PdfWorker {
  set: (options: Html2PdfOptions) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  toPdf: () => Html2PdfWorker;
  get: (prop: 'pdf') => Promise<PdfInstance>;

  save: () => Promise<void>;
}

// Tipagem mínima do objeto PDF retornado por html2pdf (jsPDF)
interface PdfInstance {
  internal: {
    getNumberOfPages: () => number;
    pageSize: { getWidth: () => number; getHeight: () => number };
  };
  setPage: (pageNumber: number) => void;
  addImage: (dataUrl: string, type: 'PNG' | 'JPEG', x: number, y: number, width: number, height: number) => void;
  addSvgAsImage: (svg: string, x: number, y: number, width: number, height: number) => void;
  setFontSize: (size: number) => void;
  setTextColor: (color: string) => void;
  text: (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => void;
  setLineWidth: (width: number) => void;
  setDrawColor: (color: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
}

type Html2PdfStatic = () => Html2PdfWorker;

let html2pdfInstance: Html2PdfStatic | null = null;

/**
 * Dynamically loads html2pdf.js library
 * @returns Promise that resolves to the html2pdf function
 */
export async function loadHtml2pdf(): Promise<Html2PdfStatic> {
  if (html2pdfInstance) {
    return html2pdfInstance;
  }

  try {
    // Use o bundle que inclui html2canvas e jsPDF
    const module = await import('html2pdf.js/dist/html2pdf.bundle');
    const loaded = module.default || module;
    html2pdfInstance = (() => loaded()) as Html2PdfStatic;
    return html2pdfInstance;
  } catch (error) {
    console.error('Erro ao carregar html2pdf.js:', error);
    throw new Error('Falha ao carregar a biblioteca de geração de PDF');
  }
}

/**
 * Clears the cached html2pdf instance
 * Useful for testing or forcing a reload
 */
export function clearHtml2pdfCache(): void {
  html2pdfInstance = null;
}

/**
 * Converts an image URL to a base64 data URL
 * Supports SVG by converting to PNG via Canvas
 */
async function toDataUrl(url?: string): Promise<{ dataUrl: string; type: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('svg')) {
      // Converter SVG em PNG para compatibilidade com jsPDF.addImage
      const svgText = await resp.text();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      const imgLoaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      img.src = svgUrl;
      await imgLoaded;
      const canvas = document.createElement('canvas');
      const targetWidth = 800; // resolução alta para manter qualidade
      const aspect = img.naturalWidth && img.naturalHeight ? img.naturalHeight / img.naturalWidth : 0.3;
      const targetHeight = Math.max(1, Math.round(targetWidth * aspect));
      canvas.width = targetWidth;
      canvas.height = targetHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(svgUrl);
      return { dataUrl, type: 'PNG' };
    }
    // PNG/JPEG
    const blob = await resp.blob();
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(blob);
    const dataUrl = await dataUrlPromise;
    const mime = blob.type || '';
    const type: 'PNG' | 'JPEG' = mime.includes('png') ? 'PNG' : 'JPEG';
    return { dataUrl, type };
  } catch (e) {
    console.warn('Não foi possível carregar logo para PDF:', e);
    return null;
  }
}

type LogoImage = { dataUrl: string; type: 'PNG' | 'JPEG' };

interface PdfLayout {
  pageWidth: number;
  rightMargin: number;
  leftMargin: number;
  headerW: number;
  headerH: number;
  footerW: number;
  footerH: number;
  footerContentY: number;
  footerLineY: number;
  color: string;
}

function calculateLayout(pdf: PdfInstance, options: Html2PdfOptions): PdfLayout {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = Array.isArray(options.margin) ? options.margin : [options.margin || 10, options.margin || 10, options.margin || 10, options.margin || 10];
  
  const rightMargin = margin[1];
  const leftMargin = margin[3];
  const footerW = options.footerLogoWidthMm ?? 24;
  const footerH = options.footerLogoHeightMm ?? 10;
  
  const footerPaddingBottom = 5;
  const footerContentY = pageHeight - footerH - footerPaddingBottom;
  const footerLineY = footerContentY - 2;

  return {
    pageWidth,
    rightMargin,
    leftMargin,
    headerW: options.headerLogoWidthMm ?? 35,
    headerH: options.headerLogoHeightMm ?? 14,
    footerW,
    footerH,
    footerContentY,
    footerLineY,
    color: options.footerTextColor || '#000000'
  };
}

function renderHeader(pdf: PdfInstance, layout: PdfLayout, options: Html2PdfOptions, headerLogo: LogoImage | null) {
  // Header: Título e data dentro da margem superior
  pdf.setFontSize(14);
  pdf.setTextColor('#000000');
  pdf.setFontSize(16);
  pdf.text(options.title || 'Relatório de Equipamentos', layout.pageWidth / 2, 10, { align: 'center' });
  pdf.setFontSize(10);
  const emissionDate = new Date().toLocaleDateString('pt-BR');
  pdf.text(`Data de Emissão: ${emissionDate}`, layout.pageWidth / 2, 20, { align: 'center' });

  // Header logo at top-right
  if (headerLogo) {
    try {
      pdf.addImage(headerLogo.dataUrl, headerLogo.type, layout.pageWidth - layout.rightMargin - layout.headerW, 5, layout.headerW, layout.headerH);
    } catch (e) {
      console.warn('Falha ao adicionar logo no cabeçalho:', e);
    }
  }
}

function renderFooter(
  pdf: PdfInstance, 
  pageNum: number, 
  total: number, 
  layout: PdfLayout, 
  options: Html2PdfOptions, 
  footerLogo: LogoImage | null
) {
  // Linha separadora
  pdf.setLineWidth(0.5);
  pdf.setDrawColor('#000000');
  pdf.line(layout.leftMargin, layout.footerLineY, layout.pageWidth - layout.rightMargin, layout.footerLineY);

  // Footer logo bottom-left
  if (footerLogo) {
    try {
      pdf.addImage(footerLogo.dataUrl, footerLogo.type, layout.leftMargin, layout.footerContentY, layout.footerW, layout.footerH);
    } catch (e) {
      console.warn('Falha ao adicionar logo no rodapé:', e);
    }
  }

  // Footer texts
  try {
    pdf.setFontSize(10);
    pdf.setTextColor(layout.color);
    // Centraliza o texto verticalmente em relação ao logo
    const textY = layout.footerContentY + (layout.footerH / 2) + 1; 
    
    if (options.schoolName) {
      pdf.text(String(options.schoolName), layout.pageWidth / 2, textY, { align: 'center' });
    }
    pdf.text(`Página ${pageNum} de ${total}`, layout.pageWidth - layout.rightMargin, textY, { align: 'right' });
  } catch (e) {
    console.warn('Falha ao adicionar textos de rodapé:', e);
  }
}

/**
 * Applies header and footer to all pages of the PDF
 */
function applyHeaderAndFooter(
  pdf: PdfInstance,
  total: number,
  options: Html2PdfOptions,
  headerLogo: LogoImage | null,
  footerLogo: LogoImage | null
) {
  const layout = calculateLayout(pdf, options);

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    if (options.drawHeader !== false) {
      renderHeader(pdf, layout, options, headerLogo);
    }
    renderFooter(pdf, i, total, layout, options, footerLogo);
  }
}

/**
 * Generates PDF from HTML element using dynamically loaded html2pdf.js
 * @param element - HTML element to convert to PDF
 * @param options - Configuration options for PDF generation
 * @returns Promise that resolves when PDF is generated
 */
export async function generatePdf(element: HTMLElement, options: Html2PdfOptions = {}): Promise<void> {
  const html2pdf = await loadHtml2pdf();
  
  const defaultOptions: Html2PdfOptions = {
    margin: [40, 5, 20, 5], // Aumentando margem superior para 40mm para evitar sobreposição com o cabeçalho e logo
    filename: 'relatorio.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  const finalOptions = { ...defaultOptions, ...options };

  const worker = html2pdf().set(finalOptions).from(element).toPdf();

  const headerLogo = await toDataUrl(finalOptions.headerLogoUrl);
  const footerLogo = await toDataUrl(finalOptions.footerLogoUrl || finalOptions.headerLogoUrl);

  const pdf = await worker.get('pdf');
  const total = pdf.internal.getNumberOfPages();
  
  applyHeaderAndFooter(pdf, total, finalOptions, headerLogo, footerLogo);

  return worker.save();
}
