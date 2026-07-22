import { useEffect, useState, useRef, useMemo } from 'react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast } from '../utils/toast'
import { pdf } from '@react-pdf/renderer'
import { RelatoriosPDF } from '../components/relatorios/RelatoriosPDF'
import { toDataUrl } from '../utils/imageUtils'
import LogoEa from '../assets/Logo_EA.svg'
import LogoAsrs from '../assets/Logo_ASRS.svg'
import { RelatoriosFilters } from '../components/relatorios/RelatoriosFilters'
import { RelatoriosActions } from '../components/relatorios/RelatoriosActions'
import { RelatoriosContent } from '../components/relatorios/RelatoriosContent'
import type { Equipamento, CmItem } from '../components/relatorios/types'
import { isExpired, formatDate } from '../utils/validity'
import { useAppStore } from '../store/useAppStore'

type XlsxModule = typeof import('xlsx-js-style')

// Helper functions for XLSX
function getXlsxData(isCm: boolean, filtrados: Equipamento[], filtradosCm: CmItem[]) {
  const headers = isCm
    ? ['Nome', 'Tipo', 'Status', 'Escola', 'Modelo', 'Serial']
    : ['Nome', 'Tipo', 'Status', 'Escola', 'Usuário', 'Modelo', 'Serial', 'Localização', 'Aquisição', 'Situação']

  const rows = (isCm ? filtradosCm : filtrados).map((item) => (
    isCm
      ? [
          item.nome || '-',
          item.tipo || '-',
          ((item.status || '-')).replace('_', ' '),
          item.escola?.nome || '-',
          item.modelo || '-',
          item.serial || '-',
        ]
      : [
          (item as Equipamento).nome,
          (item as Equipamento).tipo,
          (item as Equipamento).status.replace('_', ' '),
          (item as Equipamento).escola?.nome || '-',
          (item as Equipamento).usuarioNome || '-',
          (item as Equipamento).modelo,
          (item as Equipamento).serial,
          (item as Equipamento).localizacao || '-',
          formatDate((item as Equipamento).dataAquisicao),
          isExpired((item as Equipamento).dataAquisicao) ? 'VENCIDO' : 'REGULAR',
        ]
  ))

  const colWidths = isCm ? [28, 12, 12, 22, 20, 22] : [24, 12, 12, 22, 18, 20, 22, 22, 16, 16]

  return { headers, rows, colWidths }
}

function applyHeaderStyles(xlsx: XlsxModule, ws: import('xlsx-js-style').WorkSheet, range: import('xlsx-js-style').Range, headers: string[]) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c })
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
}

function applyDataStyles(xlsx: XlsxModule, ws: import('xlsx-js-style').WorkSheet, range: import('xlsx-js-style').Range) {
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = xlsx.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue
      const isCenter = c === 1 || c === 2
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
}

function addTotalRow(xlsx: XlsxModule, ws: import('xlsx-js-style').WorkSheet, range: import('xlsx-js-style').Range, headers: string[], count: number) {
  const finalStartRow = range.e.r + 2
  const totalAddr = xlsx.utils.encode_cell({ r: finalStartRow, c: 0 })
  ws[totalAddr] = {
    t: 's',
    v: `Total: ${count}`,
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

  ws['!merges'] = (ws['!merges'] || []).concat([
    {
      s: { r: finalStartRow, c: 0 },
      e: { r: finalStartRow, c: headers.length - 1 }
    }
  ])
}

// Data Helpers
async function fetchAllData() {
  const [equipRes, escolasRes, cmRes] = await Promise.allSettled([
    api.get('/api/equipamentos'),
    api.get('/api/escolas'),
    api.get('/api/centro-midia')
  ])
  
  return {
    equipamentos: equipRes.status === 'fulfilled' ? (equipRes.value.data || []) : [],
    escolas: escolasRes.status === 'fulfilled' ? (escolasRes.value.data || []) : [],
    cmItems: cmRes.status === 'fulfilled' ? (cmRes.value.data || []) : []
  }
}

function filterItems<T extends { 
  nome?: string; 
  modelo?: string; 
  serial?: string; 
  status?: string; 
  tipo?: string;
  escola?: { nome?: string; sigla?: string } 
}>(
  items: T[], 
  filters: { text: string; status: string; tipo: string; escola: string }
): T[] {
  const { text, status, tipo, escola } = filters
  const lowerText = text.toLowerCase()
  
  return items.filter(item => {
    // Text Filter
    const matchText = !lowerText || 
      (item.nome || '').toLowerCase().includes(lowerText) ||
      (item.modelo || '').toLowerCase().includes(lowerText) ||
      (item.serial || '').toLowerCase().includes(lowerText) ||
      (item.escola?.nome || '').toLowerCase().includes(lowerText) ||
      (item.escola?.sigla ? String(item.escola.sigla).toLowerCase().includes(lowerText) : false)
    
    if (!matchText) return false

    // Exact Filters
    if (status !== 'ALL' && (item.status || '') !== status) return false
    if (tipo !== 'ALL' && (item.tipo || '') !== tipo) return false
    if (escola !== 'ALL' && (item.escola?.nome || '-') !== escola) return false
    
    return true
  })
}

export default function RelatoriosEquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [cmItems, setCmItems] = useState<CmItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterTipo, setFilterTipo] = useState<string>('ALL')
  const [filterEscola, setFilterEscola] = useState<string>(() => localStorage.getItem('userEscolaNome') || 'ALL')
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [filterDepartamento, setFilterDepartamento] = useState<'EQUIPAMENTOS' | 'CENTRO_MIDIA'>('EQUIPAMENTOS')
  
  const [showPreview, setShowPreview] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Carregar apenas escolas ao entrar na página
  useEffect(() => {
    async function loadEscolas() {
      try {
        const { data } = await api.get('/api/escolas')
        setEscolas(data || [])
      } catch (error) {
        console.error('Erro ao carregar escolas:', error)
        showErrorToast('Erro ao carregar lista de escolas')
      }
    }
    loadEscolas()
  }, [])

  useEffect(() => {
    setFilterTipo('ALL')
  }, [filterDepartamento])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllData()
      setEquipamentos(data.equipamentos)
      setEscolas(data.escolas)
      setCmItems(data.cmItems)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const setExpiredCount = useAppStore((state) => state.setExpiredCount)
  const setMaintenanceCount = useAppStore((state) => state.setMaintenanceCount)
  const setDiscardedCount = useAppStore((state) => state.setDiscardedCount)

  const currentFilters = useMemo(() => ({ 
    text: filterText, 
    status: filterStatus, 
    tipo: filterTipo, 
    escola: filterEscola 
  }), [filterText, filterStatus, filterTipo, filterEscola])

  const filtrados = useMemo(() => filterItems(equipamentos, currentFilters), [equipamentos, currentFilters])
  const filtradosCm = useMemo(() => filterItems(cmItems, currentFilters), [cmItems, currentFilters])
  
  const filtradosFinal = filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados

  useEffect(() => {
    const activeList = filterDepartamento === 'CENTRO_MIDIA' ? filtradosCm : filtrados

    // Calcular contadores baseados na lista filtrada atual
    const maintCount = activeList.filter(item => (item.status || '') === 'EM_MANUTENCAO').length
    setMaintenanceCount(maintCount)

    const discCount = activeList.filter(item => (item.status || '') === 'DESCARTADO').length
    setDiscardedCount(discCount)

    if (filterDepartamento === 'EQUIPAMENTOS') {
      const count = (activeList as Equipamento[]).filter(e => isExpired(e.dataAquisicao)).length
      setExpiredCount(count)
    } else {
      setExpiredCount(0)
    }
  }, [filtrados, filtradosCm, filterDepartamento, setExpiredCount, setMaintenanceCount, setDiscardedCount])

  const handlePrint = () => {
    globalThis.print()
  }

  async function handleCSV() {
    try {
      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const { headers, rows } = getXlsxData(isCm, filtrados, filtradosCm)
      
      // Helper para escapar valores CSV
      const escapeCsv = (val: string | number | boolean | null | undefined) => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (/[,"\n\r]/.test(str)) {
          return `"${str.replaceAll('"', '""')}"`
        }
        return str
      }

      // BOM para Excel reconhecer UTF-8
      const BOM = '\uFEFF'
      const csvContent = BOM + [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isCm ? 'centro_midia' : 'equipamentos'}_${new Date().toISOString().split('T')[0]}.csv`
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
      setFilterEscola(localStorage.getItem('userEscolaNome') || 'ALL')
      setFilterDepartamento('EQUIPAMENTOS')

      setLoading(true)
      setError(null)
      
      const data = await fetchAllData()
      setEquipamentos(data.equipamentos)
      setEscolas(data.escolas)
      setCmItems(data.cmItems)
      
      const novos = data.equipamentos.length - prevTotal
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
      const XLSX = await import('xlsx-js-style')
      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const { headers, rows, colWidths } = getXlsxData(isCm, filtrados, filtradosCm)
      
      const wb = XLSX.utils.book_new()
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      
      ws['!cols'] = colWidths.map(w => ({ wch: w }))
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      applyHeaderStyles(XLSX, ws, range, headers)
      applyDataStyles(XLSX, ws, range)
      addTotalRow(XLSX, ws, range, headers, rows.length)

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
    if (equipamentos.length === 0 && cmItems.length === 0) {
      showErrorToast('Nenhum dado carregado. Clique em "Visualizar Impressão" primeiro.')
      return
    }
    try {
      setIsGeneratingPdf(true)
      
      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const data = isCm ? filtradosCm : filtrados
      
      // Carregar logos
      const [logoTop, logoBottom] = await Promise.all([
        toDataUrl(LogoAsrs),
        toDataUrl(LogoEa)
      ])

      const blob = await pdf(
        <RelatoriosPDF 
          data={data}
          isCm={isCm}
          filters={{
            departamento: filterDepartamento === 'CENTRO_MIDIA' ? 'Centro de Midia' : 'Equipamentos',
            status: filterStatus === 'ALL' ? 'Todos' : filterStatus.replace('_', ' '),
            tipo: filterTipo === 'ALL' ? 'Todos' : filterTipo,
            escola: filterEscola === 'ALL' ? 'Todas' : filterEscola,
            text: filterText
          }}
          logoTop={logoTop}
          logoBottom={logoBottom}
          escolaNome={filterEscola === 'ALL' ? 'Sistema de Inventário' : filterEscola}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isCm ? 'relatorio_centro_midia' : 'relatorio_equipamentos'}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      showSuccessToast('PDF gerado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar PDF: ${msg}`)
      console.error(err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 pb-24 lg:pb-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Relatório de Equipamentos</h2>
        {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>
      
      {error && (
        <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <RelatoriosFilters
        filterDepartamento={filterDepartamento}
        setFilterDepartamento={setFilterDepartamento}
        filterText={filterText}
        setFilterText={setFilterText}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterTipo={filterTipo}
        setFilterTipo={setFilterTipo}
        filterEscola={filterEscola}
        setFilterEscola={setFilterEscola}
        escolas={escolas}
      />

      <RelatoriosActions
        handlePrint={handlePrint}
        handleCSV={handleCSV}
        handlePDF={handlePDF}
        handleXLSX={handleXLSX}
        handleRefresh={handleRefresh}
        showPreview={showPreview}
        setShowPreview={(val) => {
          if (val) loadData()
          setShowPreview(val)
        }}
        count={filtradosFinal.length}
      />

      <RelatoriosContent
        printRef={printRef}
        showPreview={showPreview}
        isGeneratingPdf={isGeneratingPdf}
        filterDepartamento={filterDepartamento}
        filtrados={filtrados}
        filtradosCm={filtradosCm}
        filterStatus={filterStatus}
        filterTipo={filterTipo}
        filterEscola={filterEscola}
        filterText={filterText}
        handleXLSX={handleXLSX}
        handlePDF={handlePDF}
        handlePrint={handlePrint}
      />
    </div>
  )
}
