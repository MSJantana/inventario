import { type RefObject } from 'react'
import type { Equipamento, CmItem } from './types'
import LogoEa from '../../assets/Logo_EA.svg'
import LogoAsrs from '../../assets/Logo_ASRS.svg'

interface RelatoriosContentProps {
  readonly printRef: RefObject<HTMLDivElement | null>
  readonly showPreview: boolean
  readonly isGeneratingPdf: boolean
  readonly filterDepartamento: 'EQUIPAMENTOS' | 'CENTRO_MIDIA'
  readonly filtrados: Equipamento[]
  readonly filtradosCm: CmItem[]
  readonly filterStatus: string
  readonly filterTipo: string
  readonly filterEscola: string
  readonly filterText: string
  readonly handleXLSX: () => void
  readonly handlePDF: () => void
  readonly handlePrint: () => void
}

export function RelatoriosContent({
  printRef,
  showPreview,
  isGeneratingPdf,
  filterDepartamento,
  filtrados,
  filtradosCm,
  filterStatus,
  filterTipo,
  filterEscola,
  filterText,
  handleXLSX,
  handlePDF,
  handlePrint
}: Readonly<RelatoriosContentProps>) {
  const filtradosFinal = filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados

  // Helper para classes da célula
  const getCellClasses = (isHeader = false, width?: string) => {
    const base = 'px-1 align-top break-words'
    const headerBase = 'text-left font-medium'
    const pdfClasses = isHeader
      ? 'text-[9px] py-2 leading-tight'
      : 'text-[9px] py-2 leading-tight'
    const previewClasses = isHeader ? 'text-xs py-2' : 'text-xs py-1.5'
    const standardClasses = isHeader
      ? 'text-xs sm:text-sm py-3 print:text-[9px] print:py-2.5'
      : 'text-xs sm:text-[14px] py-2 print:text-[9px] print:py-1.5'

    let classes = `${base} ${isHeader ? headerBase : ''}`
    
    if (width) classes += ` ${width}`
    
    if (isGeneratingPdf) {
      classes += ` ${pdfClasses}`
    } else if (showPreview) {
      classes += ` ${previewClasses}`
    } else {
      classes += ` ${standardClasses}`
    }
    
    return classes
  }

  return (
    <div ref={printRef} className={`print-area ${showPreview ? 'print-preview' : ''}`}>
      {showPreview && (
        <div className="">
        
        </div>
      )}
      
      {/* Cabeçalho do relatório */}
      <div className={`print-only mb-4 relative ${showPreview ? 'block' : 'hidden print:block'}`}>
        {!isGeneratingPdf && (
          <>
            <img src={LogoAsrs} alt="Logo ASRS" className="absolute top-0 right-0 h-10" />
            <h1 className="text-2xl font-bold text-center mb-2">{filterDepartamento === 'CENTRO_MIDIA' ? 'Relatório Centro de Midia' : 'Relatório de Equipamentos'}</h1>
            <p className="text-center text-sm text-gray-600 mb-4">
              Emitido em: {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </>
        )}
        {!isGeneratingPdf && (
          <div className="text-sm mb-2">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Departamento: {filterDepartamento === 'CENTRO_MIDIA' ? 'Centro de Midia' : 'Equipamentos'}</p>
            <p>Status: {filterStatus === 'ALL' ? 'Todos' : filterStatus.replace('_', ' ')}</p>
            <p>Tipo: {filterTipo === 'ALL' ? 'Todos' : filterTipo}</p>
            <p>Escola: {filterEscola === 'ALL' ? 'Todas' : filterEscola}</p>
            {filterText && <p>Busca: {filterText}</p>}
          </div>
        )}
      </div>

      {/* Layout de Cards para Mobile */}
      <div className="lg:hidden">
        {filtradosFinal.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum equipamento encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="space-y-4">
            {filtradosFinal.map((it) => (
              <div key={it.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{it.nome || '-'}</h3>
                  <span className="text-sm px-2 py-1 rounded bg-gray-200 text-gray-700">
                    {((it.status || '-')).replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><strong>Tipo:</strong> {it.tipo || '-'}</div>
                  <div><strong>Escola:</strong> {it.escola?.nome || '-'}</div>
                  <div><strong>Modelo:</strong> {it.modelo || '-'}</div>
                  <div><strong>Serial:</strong> {it.serial || '-'}</div>
                  {filterDepartamento !== 'CENTRO_MIDIA' && (
                    <div><strong>Localização:</strong> {(it as Equipamento).localizacao || '-'}</div>
                  )}
                </div>
              </div>
            ))}
            
          </div>
        )}
      </div>

      {/* Tabela para Desktop e Impressão */}
      <div className="hidden lg:block mt-8">
        <div className={`rounded-lg ${isGeneratingPdf ? 'overflow-visible' : 'overflow-x-auto'}`}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="">
                {filterDepartamento === 'CENTRO_MIDIA' ? (
                  <>
                    <th className={getCellClasses(true, 'w-[20%]')}>Nome</th>
                    <th className={getCellClasses(true, 'w-[8%]')}>Tipo</th>
                    <th className={getCellClasses(true, 'w-[8%]')}>Status</th>
                    <th className={getCellClasses(true, 'w-[20%]')}>Escola</th>
                    <th className={getCellClasses(true, 'w-[22%]')}>Modelo</th>
                    <th className={getCellClasses(true, 'w-[22%]')}>Serial</th>
                  </>
                ) : (
                  <>
                    <th className={getCellClasses(true, 'w-[16%]')}>Nome</th>
                    <th className={getCellClasses(true, 'w-[7%]')}>Tipo</th>
                    <th className={getCellClasses(true, 'w-[7%]')}>Status</th>
                    <th className={getCellClasses(true, 'w-[16%]')}>Escola</th>
                    <th className={getCellClasses(true, 'w-[12%]')}>Usuário</th>
                    <th className={getCellClasses(true, 'w-[14%]')}>Modelo</th>
                    <th className={getCellClasses(true, 'w-[14%]')}>Serial</th>
                    <th className={getCellClasses(true, 'w-[14%]')}>Localização</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {(filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados).map((it) => (
                <tr key={it.id} style={{ pageBreakInside: 'avoid' }} className={isGeneratingPdf ? '' : "border-b border-gray-200"}>
                  {filterDepartamento === 'CENTRO_MIDIA' ? (
                    <>
                      <td className={getCellClasses()}>{it.nome || '-'}</td>
                      <td className={getCellClasses()}>{it.tipo || '-'}</td>
                      <td className={getCellClasses()}>{((it.status || '-')).replace('_', ' ')}</td>
                      <td className={getCellClasses()}>{(it.escola?.sigla || it.escola?.nome || '-')}</td>
                      <td className={getCellClasses()}>{(it.modelo || '-')}</td>
                      <td className={getCellClasses()}>{(it.serial || '-')}</td>
                    </>
                  ) : (
                    <>
                      <td className={getCellClasses()}>{(it as Equipamento).nome}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).tipo}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).status.replace('_', ' ')}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).escola?.sigla || (it as Equipamento).escola?.nome || '-'}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).usuarioNome || '-'}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).modelo}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).serial}</td>
                      <td className={getCellClasses()}>{(it as Equipamento).localizacao || '-'}</td>
                    </>
                  )}
                </tr>
              ))}
              {filtradosFinal.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center" colSpan={12}>
                    Nenhum equipamento encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={12} className="border-t border-gray-400 px-2 py-1 text-xs font-bold">Total: {filtradosFinal.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print-only mt-2 hidden print:block">
        </div>
      </div>

      <div className="lg:hidden">
        <div className="fixed bottom-3 left-3 right-3 z-20">
          <div className="rounded-lg border bg-white shadow-md px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={handleXLSX} className="rounded bg-emerald-600 px-3 py-1 text-white text-xs">XLSX</button>
              <button onClick={handlePDF} className="rounded bg-red-600 px-3 py-1 text-white text-xs">PDF</button>
              <button onClick={handlePrint} className="rounded bg-blue-600 px-3 py-1 text-white text-xs">Imprimir</button>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé do relatório */}
      <div className="print-only mt-4 hidden print:flex text-sm text-gray-600 items-center justify-between">
        <img src={LogoEa} alt="Logo EA" className="h-10" />
        <div>
          <p>Relatório gerado pelo Sistema de Inventário</p>
        </div>
      </div>
    </div>
  )
}
