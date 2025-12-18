import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx-js-style'
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

// Helper functions for XLSX
function getXlsxData(isCm: boolean, filtrados: Equipamento[], filtradosCm: CmItem[]) {
  const headers = isCm
    ? ['Nome', 'Tipo', 'Status', 'Escola', 'Modelo', 'Serial']
    : ['Nome', 'Tipo', 'Status', 'Escola', 'Usuário', 'Modelo', 'Serial', 'Localização']

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
        ]
  ))

  const colWidths = isCm ? [28, 12, 12, 22, 20, 22] : [24, 12, 12, 22, 18, 20, 22, 22]

  return { headers, rows, colWidths }
}

function applyHeaderStyles(ws: XLSX.WorkSheet, range: XLSX.Range, headers: string[]) {
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
}

function applyDataStyles(ws: XLSX.WorkSheet, range: XLSX.Range) {
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
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

function addTotalRow(ws: XLSX.WorkSheet, range: XLSX.Range, headers: string[], count: number) {
  const finalStartRow = range.e.r + 2
  const totalAddr = XLSX.utils.encode_cell({ r: finalStartRow, c: 0 })
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
  const [filterEscola, setFilterEscola] = useState<string>('ALL')
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [filterDepartamento, setFilterDepartamento] = useState<'EQUIPAMENTOS' | 'CENTRO_MIDIA'>('EQUIPAMENTOS')
  
  const [showPreview, setShowPreview] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
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

  const currentFilters = { text: filterText, status: filterStatus, tipo: filterTipo, escola: filterEscola }
  const filtrados = filterItems(equipamentos, currentFilters) as Equipamento[]
  const filtradosCm = filterItems(cmItems, currentFilters) as CmItem[]
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
      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const { headers, rows, colWidths } = getXlsxData(isCm, filtrados, filtradosCm)
      
      const wb = XLSX.utils.book_new()
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      
      ws['!cols'] = colWidths.map(w => ({ wch: w }))
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      applyHeaderStyles(ws, range, headers)
      applyDataStyles(ws, range)
      addTotalRow(ws, range, headers, rows.length)

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
        setShowPreview={setShowPreview}
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
