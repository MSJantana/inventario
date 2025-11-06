// Declarações mínimas para o bundle do html2pdf
// Corrige TS7016: módulo sem arquivo de declaração

declare module 'html2pdf.js/dist/html2pdf.bundle' {
  const html2pdf: {
    (): {
      set(opt: { margin?: number; filename?: string; image?: { type?: string; quality?: number }; html2canvas?: { scale?: number }; jsPDF?: { unit?: string; format?: string; orientation?: string } }): {
        from(element: HTMLElement): {
          save(): Promise<void>;
        };
      };
      from(element: HTMLElement): {
        save(): Promise<void>;
      };
      save(): Promise<void>;
    };
  };
  export default html2pdf;
}

// Opcional: declaração para o módulo base, caso seja usado em outro lugar
declare module 'html2pdf.js' {
  const html2pdf: {
    (): {
      set(opt: { margin?: number; filename?: string; image?: { type?: string; quality?: number }; html2canvas?: { scale?: number }; jsPDF?: { unit?: string; format?: string; orientation?: string } }): {
        from(element: HTMLElement): {
          save(): Promise<void>;
        };
        save(): Promise<void>;
      };
      from(element: HTMLElement): {
        save(): Promise<void>;
      };
      save(): Promise<void>;
    };
  };
  export default html2pdf;
}