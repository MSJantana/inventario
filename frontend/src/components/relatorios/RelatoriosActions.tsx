

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
        onClick={handlePrint}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
      >
        <span>🖨️</span>
        <span className="hidden sm:inline">Imprimir</span>
      </button>
      <button
        onClick={handleCSV}
        className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 flex items-center gap-2"
      >
        <span>📥</span>
        <span className="hidden sm:inline">Baixar CSV</span>
      </button>
      <button
        onClick={handlePDF}
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 flex items-center gap-2"
      >
        <span>📄</span>
        <span className="hidden sm:inline">Gerar PDF</span>
      </button>
      <button
        onClick={handleXLSX}
        className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 flex items-center gap-2"
      >
        <span>📊</span>
        <span className="hidden sm:inline">Exportar XLSX</span>
      </button>
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="rounded bg-gray-200 px-4 py-2 text-black hover:bg-gray-300 flex items-center gap-2"
      >
        <span>👁️</span>
        <span className="hidden sm:inline">{showPreview ? 'Ocultar Preview' : 'Visualizar Impressão'}</span>
      </button>
      <button
        onClick={handleRefresh}
        className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2"
      >
        <span>🔄</span>
        <span className="hidden sm:inline">Atualizar</span>
      </button>
      <span className="ml-auto text-sm text-gray-600">
        {count} item(s) encontrado(s)
      </span>
    </div>
  )
}
