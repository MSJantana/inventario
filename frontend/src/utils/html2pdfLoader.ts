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
}

interface Html2PdfWorker {
  set: (options: Html2PdfOptions) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
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
  
  return html2pdf().set(finalOptions).from(element).save();
}