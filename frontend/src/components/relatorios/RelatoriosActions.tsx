

interface RelatoriosActionsProps {
  readonly handlePrint: () => void
  readonly handleCSV: () => void
  readonly handlePDF: () => void
  readonly handleXLSX: () => void
  readonly handleRefresh: () => void
  readonly showPreview: boolean
  readonly setShowPreview: (value: boolean) => void
  readonly count: number
}

export function RelatoriosActions({
  handlePrint,
  handleCSV,
  handlePDF,
  handleXLSX,
  handleRefresh,
  showPreview,
  setShowPreview,
  count
}: RelatoriosActionsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handlePrint}
        aria-label="Imprimir relatório"
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
      >
        <span aria-hidden="true">🖨️</span>
        <span className="hidden sm:inline">Imprimir</span>
      </button>
      <button
        type="button"
        onClick={handleCSV}
        aria-label="Baixar relatório em CSV"
        className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 flex items-center gap-2"
      >
        <span aria-hidden="true">📥</span>
        <span className="hidden sm:inline">Baixar CSV</span>
      </button>
      <button
        type="button"
        onClick={handlePDF}
        aria-label="Gerar relatório em PDF"
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 flex items-center gap-2"
      >
        <span aria-hidden="true">📄</span>
        <span className="hidden sm:inline">Gerar PDF</span>
      </button>
      <button
        type="button"
        onClick={handleXLSX}
        aria-label="Exportar relatório em XLSX"
        className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 flex items-center gap-2"
      >
        <span aria-hidden="true">📊</span>
        <span className="hidden sm:inline">Exportar XLSX</span>
      </button>
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        aria-label={showPreview ? 'Ocultar pré-visualização de impressão' : 'Visualizar pré-visualização de impressão'}
        aria-pressed={showPreview}
        className="rounded bg-gray-200 px-4 py-2 text-black hover:bg-gray-300 flex items-center gap-2"
      >
        <span aria-hidden="true">👁️</span>
        <span className="hidden sm:inline">{showPreview ? 'Ocultar Preview' : 'Visualizar Impressão'}</span>
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        aria-label="Atualizar dados do relatório"
        className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2"
      >
        <span aria-hidden="true">🔄</span>
        <span className="hidden sm:inline">Atualizar</span>
      </button>
      <span className="ml-auto text-sm text-gray-600">
        {count} item(s) encontrado(s)
      </span>
    </div>
  )
}
