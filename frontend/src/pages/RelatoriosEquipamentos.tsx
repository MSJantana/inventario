import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx-js-style'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast } from '../utils/toast'
import { generatePdf } from '../utils/html2pdfLoader'
import LogoEa from '../assets/Logo_EA.svg';
import LogoAsrs from '../assets/Logo_ASRS.svg';

type Equipamento = {
  id: string
  nome: string
  tipo: string
  modelo: string
  serial: string
  status: string
  localizacao?: string
  fabricante?: string
  dataAquisicao: string
  processador?: string
  memoria?: string
  observacoes?: string
  macaddress?: string
  escola?: { nome: string; sigla?: string }
}

type CmItem = {
  id: string
  nome?: string
  tipo?: string
  modelo?: string
  serial?: string
  status?: string
  escola?: { nome?: string; sigla?: string }
}

export default function RelatoriosEquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [cmItems, setCmItems] = useState<CmItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterTipo, setFilterTipo] = useState<string>('ALL')
  const [filterEscola, setFilterEscola] = useState<string>('ALL')
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [filterDepartamento, setFilterDepartamento] = useState<'EQUIPAMENTOS' | 'CENTRO_MIDIA'>('EQUIPAMENTOS')
  const [showPreview, setShowPreview] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const tiposEquip = ['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO']
  const tiposCm = ['AUDIO','VIDEO','CAMERA','MICROFONE','ILUMINACAO','OUTRO']
  const status = ['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO']

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    setFilterTipo('ALL')
  }, [filterDepartamento])

  async function carregarDados() {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        api.get('/api/equipamentos'),
        api.get('/api/escolas'),
        api.get('/api/centro-midia')
      ])
      const equipRes = results[0]
      const escolasRes = results[1]
      const cmRes = results[2]
      setEquipamentos(equipRes.status === 'fulfilled' ? (equipRes.value.data || []) : [])
      setEscolas(escolasRes.status === 'fulfilled' ? (escolasRes.value.data || []) : [])
      setCmItems(cmRes.status === 'fulfilled' ? (cmRes.value.data || []) : [])
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const filtrados = equipamentos.filter(eq => {
    const texto = filterText.toLowerCase()
    const matchText = !texto || 
      eq.nome.toLowerCase().includes(texto) ||
      eq.modelo.toLowerCase().includes(texto) ||
      eq.serial.toLowerCase().includes(texto) ||
      eq.escola?.nome.toLowerCase().includes(texto) ||
      (eq.escola?.sigla ? eq.escola.sigla.toLowerCase().includes(texto) : false)
    
    const matchStatus = filterStatus === 'ALL' || eq.status === filterStatus
    const matchTipo = filterTipo === 'ALL' || eq.tipo === filterTipo
    const matchEscola = filterEscola === 'ALL' || eq.escola?.nome === filterEscola
    
    return matchText && matchStatus && matchTipo && matchEscola
  })

  const filtradosCm = cmItems.filter(i => {
    const texto = filterText.toLowerCase()
    const matchText = !texto ||
      (i.nome || '').toLowerCase().includes(texto) ||
      (i.modelo || '').toLowerCase().includes(texto) ||
      (i.serial || '').toLowerCase().includes(texto) ||
      (i.escola?.nome || '').toLowerCase().includes(texto) ||
      (i.escola?.sigla ? String(i.escola.sigla).toLowerCase().includes(texto) : false)

    const matchStatus = filterStatus === 'ALL' || i.status === filterStatus
    const matchTipo = filterTipo === 'ALL' || i.tipo === filterTipo
    const matchEscola = filterEscola === 'ALL' || i.escola?.nome === filterEscola

    return matchText && matchStatus && matchTipo && matchEscola
  })

  const filtradosFinal = filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados

  const handlePrint = () => {
    globalThis.print()
  }

  async function handleCSV() {
    try {
      const endpoint = filterDepartamento === 'CENTRO_MIDIA' ? '/api/centro-midia/export/csv' : '/api/equipamentos/export/csv'
      const { data } = await api.get(endpoint, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filterDepartamento === 'CENTRO_MIDIA' ? 'centro_midia' : 'equipamentos'}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showSuccessToast('CSV baixado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao baixar CSV: ${msg}`)
    }
  }

  async function handleRefresh() {
    try {
      const prevTotal = equipamentos.length
      setFilterText('')
      setFilterStatus('ALL')
      setFilterTipo('ALL')
      setFilterEscola('ALL')
      setFilterDepartamento('EQUIPAMENTOS')

      setLoading(true)
      setError(null)
      const results = await Promise.allSettled([
        api.get('/api/equipamentos'),
        api.get('/api/escolas'),
        api.get('/api/centro-midia')
      ])
      const equipRes = results[0]
      const escolasRes = results[1]
      const cmRes = results[2]
      const equipList = equipRes.status === 'fulfilled' ? (equipRes.value.data || []) : []
      const escolasList = escolasRes.status === 'fulfilled' ? (escolasRes.value.data || []) : []
      const cmList = cmRes.status === 'fulfilled' ? (cmRes.value.data || []) : []
      const novos = equipList.length - prevTotal
      setEquipamentos(equipList)
      setEscolas(escolasList)
      setCmItems(cmList)
      if (novos > 0) {
        showSuccessToast(`Novos equipamentos encontrados: ${novos}`)
      } else {
        showSuccessToast('Lista atualizada')
      }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'Erro ao atualizar'
      setError(msg)
      showErrorToast(msg)
    } finally {
      setLoading(false)
    }
  }

  

  async function handleXLSX() {
    try {
      const wb = XLSX.utils.book_new()
      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const headers = isCm
        ? ['Nome','Tipo','Status','Escola','Modelo','Serial']
        : ['Nome','Tipo','Status','Escola','Modelo','Serial','Localização']
      const rows = (isCm ? filtradosCm : filtrados).map((item) => (
        isCm
          ? [
              (item as CmItem).nome || '-',
              (item as CmItem).tipo || '-',
              (((item as CmItem).status) || '-').replace('_',' '),
              (item as CmItem).escola?.nome || '-',
              (item as CmItem).modelo || '-',
              (item as CmItem).serial || '-',
            ]
          : [
              (item as Equipamento).nome,
              (item as Equipamento).tipo,
              (item as Equipamento).status.replace('_',' '),
              (item as Equipamento).escola?.nome || '-',
              (item as Equipamento).modelo,
              (item as Equipamento).serial,
              (item as Equipamento).localizacao || '-',
            ]
      ))
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const colWidths = isCm ? [28,12,12,22,20,22] : [28,12,12,22,20,22,22]
      ws['!cols'] = colWidths.map(w => ({ wch: w }))
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c })
        const cell = ws[cellAddress] || { t: 's', v: headers[c] }
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: '1F2937' } },
          border: {
            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
            right: { style: 'thin', color: { rgb: 'D1D5DB' } }
          }
        }
        ws[cellAddress] = cell
      }
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          const isCenter = isCm ? (c === 1 || c === 2) : (c === 1 || c === 2)
          cell.s = {
            alignment: { horizontal: isCenter ? 'center' : 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'E5E7EB' } },
              bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
              left: { style: 'thin', color: { rgb: 'E5E7EB' } },
              right: { style: 'thin', color: { rgb: 'E5E7EB' } }
            }
          }
          ws[addr] = cell
        }
      }

      // Linha de total ao final (uma linha em branco + total)
      const finalStartRow = range.e.r + 2
      const totalAddr = XLSX.utils.encode_cell({ r: finalStartRow, c: 0 })
      ws[totalAddr] = {
        t: 's',
        v: `Total: ${(isCm ? filtradosCm : filtrados).length}`,
        s: {
          font: { bold: true },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        }
      }
      // Mesclar de A até última coluna (L)
      ws['!merges'] = (ws['!merges'] || []).concat([
        {
          s: { r: finalStartRow, c: 0 },
          e: { r: finalStartRow, c: headers.length - 1 }
        }
      ])
      XLSX.utils.book_append_sheet(wb, ws, isCm ? 'CentroMidia' : 'Equipamentos')
      const filename = `${isCm ? 'centro_midia' : 'equipamentos'}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, filename)
      showSuccessToast('XLSX gerado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar XLSX: ${msg}`)
    }
  }

  async function handlePDF() {
    try {
      const element = printRef.current
      if (!element) return
      
      const logoTopRight = LogoAsrs
      const logoBottomLeft = LogoEa

      const options = {
        filename: `${filterDepartamento === 'CENTRO_MIDIA' ? 'relatorio_centro_midia' : 'relatorio_equipamentos'}_${new Date().toISOString().split('T')[0]}.pdf`,
        margin: 5,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 1.5, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
        headerLogoUrl: logoTopRight,
        footerLogoUrl: logoBottomLeft,
        schoolName: filterEscola === 'ALL' ? 'Sistema de Inventário' : filterEscola,
        footerTextColor: '#000000',
        headerLogoWidthMm: 30,
        headerLogoHeightMm: 12,
        footerLogoWidthMm: 20,
        footerLogoHeightMm: 9,
        title: filterDepartamento === 'CENTRO_MIDIA' ? 'Relatório Centro de Midia' : 'Relatório de Equipamentos'
      }
      
      await generatePdf(element, options)
      showSuccessToast('PDF gerado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar PDF: ${msg}`)
    }
  }

  



  return (
    <div className="rounded-lg border bg-white p-4 pb-24 lg:pb-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Relatório de Equipamentos</h2>
        {/* <img src={LogoAsrs} alt="Logo ASRS" className="h-10" /> */}
        {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>
      
      {error && (
        <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="departamentoSelect" className="mb-1 block text-sm font-medium">Departamento</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterDepartamento}
            onChange={(e) => setFilterDepartamento(e.target.value as 'EQUIPAMENTOS' | 'CENTRO_MIDIA')}
          >
            <option value="EQUIPAMENTOS">Equipamentos</option>
            <option value="CENTRO_MIDIA">Centro de Midia</option>
          </select>
        </div>
        <div>
          <label htmlFor="searchInput" className="mb-1 block text-sm font-medium">Buscar</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nome, modelo, serial, escola, sigla..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="statusSelect" className="mb-1 block text-sm font-medium">Status</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {status.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tipoSelect" className="mb-1 block text-sm font-medium">Tipo</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {(filterDepartamento === 'CENTRO_MIDIA' ? tiposCm : tiposEquip).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="escolaSelect" className="mb-1 block text-sm font-medium">Escola</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterEscola}
            onChange={(e) => setFilterEscola(e.target.value)}
          >
            <option value="ALL">Todas</option>
            {escolas.map(esc => (
              <option key={esc.id} value={esc.nome}>{esc.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Botões de ação */}
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
          onClick={() => setShowPreview((v) => !v)}
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
          {filtradosFinal.length} item(s) encontrado(s)
        </span>
      </div>

      

      {/* Tabela para impressão */}
      <div ref={printRef} className={`print-area ${showPreview ? 'print-preview' : ''}`}>
        {showPreview && (
          <div className="">
          
          </div>
        )}
        
        {/* Cabeçalho do relatório */}
        <div className="print-only mb-4 hidden print:block relative">
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
          <div className="text-sm mb-2">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Departamento: {filterDepartamento === 'CENTRO_MIDIA' ? 'Centro de Midia' : 'Equipamentos'}</p>
            <p>Status: {filterStatus === 'ALL' ? 'Todos' : filterStatus.replace('_', ' ')}</p>
            <p>Tipo: {filterTipo === 'ALL' ? 'Todos' : filterTipo}</p>
            <p>Escola: {filterEscola === 'ALL' ? 'Todas' : filterEscola}</p>
            {filterText && <p>Busca: {filterText}</p>}
          </div>
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
                    <h3 className="font-medium text-gray-900">{(it as Equipamento).nome || (it as CmItem).nome || '-'}</h3>
                    <span className="text-sm px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {(((it as Equipamento).status || (it as CmItem).status) || '-').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><strong>Tipo:</strong> {(it as Equipamento).tipo || (it as CmItem).tipo || '-'}</div>
                    <div><strong>Escola:</strong> {((it as Equipamento).escola?.nome || (it as CmItem).escola?.nome) || '-'}</div>
                    <div><strong>Modelo:</strong> {(it as Equipamento).modelo || (it as CmItem).modelo || '-'}</div>
                    <div><strong>Serial:</strong> {(it as Equipamento).serial || (it as CmItem).serial || '-'}</div>
                    {filterDepartamento !== 'CENTRO_MIDIA' && (
                      <div><strong>Localização:</strong> {(it as Equipamento).localizacao || '-'}</div>
                    )}
                  </div>
                </div>
              ))}
              
            </div>
          )}
        </div>

        {/* Tabela para Desktop e Impressão (layout conforme imagem) */}
        <div className="hidden lg:block mt-8">
          <div className="overflow-x-auto rounded-lg border border-gray-300">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="">
                  {filterDepartamento === 'CENTRO_MIDIA' ? (
                    <>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[16%] text-xs">Nome</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[10%] text-xs">Tipo</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[10%] text-xs">Status</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[20%] text-xs">Escola</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[22%] text-xs">Modelo</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[22%] text-xs">Serial</th>
                    </>
                  ) : (
                    <>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[16%] text-xs">Nome</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[10%] text-xs">Tipo</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[10%] text-xs">Status</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[20%] text-xs">Escola</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[22%] text-xs">Modelo</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[22%] text-xs">Serial</th>
                      <th className="border-2 border-gray-400 px-2 py-1 text-left font-medium w-[12%] text-xs">Localização</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados).map((it) => (
                  <tr key={it.id}>
                    {filterDepartamento === 'CENTRO_MIDIA' ? (
                      <>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as CmItem).nome || '-'}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as CmItem).tipo || '-'}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(((it as CmItem).status) || '-').replace('_', ' ')}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as CmItem).escola?.nome || '-'}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as CmItem).modelo || '-'}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as CmItem).serial || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).nome}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).tipo}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).status.replace('_', ' ')}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).escola?.nome || '-'}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).modelo}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).serial}</td>
                        <td className="border-2 border-gray-400 px-2 py-1 text-xs whitespace-nowrap truncate">{(it as Equipamento).localizacao || '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
                {filtradosFinal.length === 0 && (
                  <tr>
                    <td className="border-2 border-gray-400 px-3 py-4 text-center" colSpan={12}>
                      Nenhum equipamento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={12} className="border-2 border-gray-400 px-2 py-1 text-xs font-bold">Total: {filtradosFinal.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Total ao fim da página impressa */}
          <div className="print-only mt-2 hidden print:block">
            <div className="print-total text-xs">Total: {filtradosFinal.length}</div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="fixed bottom-3 left-3 right-3 z-20">
            <div className="rounded-lg border bg-white shadow-md px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-700">Total: {filtradosFinal.length}</span>
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
            <p>Total: {filtradosFinal.length}</p>
            <p>Relatório gerado pelo Sistema de Inventário</p>
          </div>
        </div>
      </div>
    </div>
  )
}
