/**
 * Utility for dynamically loading html2pdf.js library
 * This helps reduce initial bundle size by loading the library only when needed
 */

interface Html2PdfOptions {
  margin?: number;
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
  setFontSize: (size: number) => void;
  setTextColor: (color: string) => void;
  text: (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => void;
}

interface Html2PdfStatic {
  (): Html2PdfWorker;
}

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
 * Generates PDF from HTML element using dynamically loaded html2pdf.js
 * @param element - HTML element to convert to PDF
 * @param options - Configuration options for PDF generation
 * @returns Promise that resolves when PDF is generated
 */
export async function generatePdf(element: HTMLElement, options: Html2PdfOptions = {}): Promise<void> {
  const html2pdf = await loadHtml2pdf();
  
  const defaultOptions: Html2PdfOptions = {
    margin: 10,
    filename: 'relatorio.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  const finalOptions = { ...defaultOptions, ...options };

  const worker = (html2pdf() as Html2PdfWorker).set(finalOptions).from(element).toPdf();

  // Try to fetch logos as data URLs for jsPDF addImage
  async function toDataUrl(url?: string): Promise<{ dataUrl: string; type: 'PNG' | 'JPEG' } | null> {
    if (!url) return null;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const dataUrl = await dataUrlPromise;
      const mime = blob.type || '';
      const type = mime.includes('png') ? 'PNG' : 'JPEG';
      return { dataUrl, type };
    } catch (e) {
      console.warn('Não foi possível carregar logo para PDF:', e);
      return null;
    }
  }

  const headerLogo = await toDataUrl(finalOptions.headerLogoUrl);
  const footerLogo = await toDataUrl(finalOptions.footerLogoUrl || finalOptions.headerLogoUrl);

  const pdf = await worker.get('pdf');
  {
    const total = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = Number(finalOptions.margin || 10);
    const color = finalOptions.footerTextColor || '#000000';
    const headerW = finalOptions.headerLogoWidthMm ?? 35;
    const headerH = finalOptions.headerLogoHeightMm ?? 14;
    const footerW = finalOptions.footerLogoWidthMm ?? 24;
    const footerH = finalOptions.footerLogoHeightMm ?? 10;

    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      // Header logo at top-right
      if (headerLogo) {
        try {
          pdf.addImage(headerLogo.dataUrl, headerLogo.type, pageWidth - margin - headerW, margin, headerW, headerH);
        } catch (e) {
          console.warn('Falha ao adicionar logo no cabeçalho:', e);
        }
      }
      // Footer logo bottom-left
      if (footerLogo) {
        try {
          pdf.addImage(footerLogo.dataUrl, footerLogo.type, margin, pageHeight - margin - footerH, footerW, footerH);
        } catch (e) {
          console.warn('Falha ao adicionar logo no rodapé:', e);
        }
      }
      // Footer texts: school center, page numbers right
      try {
        pdf.setFontSize(10);
        pdf.setTextColor(color);
        const footerY = pageHeight - margin - 3; // slightly above bottom
        if (finalOptions.schoolName) {
          pdf.text(String(finalOptions.schoolName), pageWidth / 2, footerY, { align: 'center' });
        }
        pdf.text(`Página ${i} de ${total}`, pageWidth - margin, footerY, { align: 'right' });
      } catch (e) {
        console.warn('Falha ao adicionar textos de rodapé:', e);
      }
    }
  }

  return worker.save();
}