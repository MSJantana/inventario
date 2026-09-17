import { useEffect, useState, useRef, useMemo } from 'react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast } from '../utils/toast'
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
    ? ['Nome', 'Tipo', 'Status', 'Escola', 'Modelo', 'Número de Série']
    : ['Nome', 'Tipo', 'Status', 'Escola', 'Usuário', 'Modelo', 'Número de Série', 'Localização', 'Aquisição', 'Situação']

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

  const handlePrint = async () => {
    try {
      let logoTopData: string | null = null
      let logoBottomData: string | null = null
      try {
        const [a, b] = await Promise.all([toDataUrl(LogoAsrs), toDataUrl(LogoEa)])
        logoTopData = a || null
        logoBottomData = b || null
      } catch {
        logoTopData = null
        logoBottomData = null
      }

      const isCm = filterDepartamento === 'CENTRO_MIDIA'
      const titulo = isCm ? 'Relatório Centro de Mídia' : 'Relatório de Equipamentos'
      const emitidoEm = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const statusLbl = filterStatus === 'ALL' ? 'Todos' : String(filterStatus).replaceAll('_', ' ')
      const tipoLbl = filterTipo === 'ALL' ? 'Todos' : String(filterTipo)
      const escolaLbl = filterEscola === 'ALL' ? 'Todas' : String(filterEscola)

      const logoTopHtml =
        logoTopData
          ? `<img src="${logoTopData}" alt="Logo ASRS" style="height:40px;object-fit:contain;" />`
          : `<div style="height:40px;width:110px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#050B1A;color:#fff;font-weight:700;font-size:12px;">ASRS</div>`

      const logoBottomHtml =
        logoBottomData
          ? `<img src="${logoBottomData}" alt="Logo EA" style="height:40px;object-fit:contain;" />`
          : `<div style="height:40px;width:110px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#0f172a;color:#fff;font-weight:700;font-size:11px;">EA</div>`

      const headers: string[] = isCm
        ? ['Nome', 'Tipo', 'Status', 'Escola', 'Modelo', 'Número de Série']
        : ['Nome', 'Tipo', 'Status', 'Escola', 'Usuário', 'Modelo', 'Número de Série', 'Localização', 'Aquisição', 'Situação']

      const rows: string[][] = (isCm ? filtradosCm : filtrados).map((it) =>
        isCm
          ? [
              String(it.nome || '-'),
              String(it.tipo || '-'),
              String(it.status || '-').replaceAll('_', ' '),
              String(it.escola?.sigla || it.escola?.nome || '-'),
              String(it.modelo || '-'),
              String(it.serial || '-'),
            ]
          : [
              String((it as Equipamento).nome || '-'),
              String((it as Equipamento).tipo || '-'),
              String((it as Equipamento).status || '-').replaceAll('_', ' '),
              String((it as Equipamento).escola?.sigla || (it as Equipamento).escola?.nome || '-'),
              String((it as Equipamento).usuarioNome || '-'),
              String((it as Equipamento).modelo || '-'),
              String((it as Equipamento).serial || '-'),
              String((it as Equipamento).localizacao || '-'),
              String(formatDate((it as Equipamento).dataAquisicao) || '-'),
              isExpired((it as Equipamento).dataAquisicao) ? 'VENCIDO' : 'REGULAR',
            ]
      )

      const escape = (v: unknown): string =>
        String(v ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')

      const headerHtml = headers
        .map(
          (h) =>
            `<th style="padding:6px 8px;border:1px solid #cbd5e1;background-color:#1f2937 !important;color:#ffffff;font-size:9px;font-weight:700;text-align:left;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${escape(h)}</th>`
        )
        .join('')

      const rowsHtml =
        rows.length === 0
          ? `<tr><td colspan="${headers.length}" style="padding:14px 10px;border:1px solid #e5e7eb;text-align:center;font-size:10px;color:#64748b;">Nenhum equipamento encontrado com os filtros aplicados.</td></tr>`
          : rows
              .map((row, i) => {
                const isZebra = i % 2 === 0
                const baseBg = isZebra ? '#ffffff' : '#f9fafb'
                return (
                  `<tr style="page-break-inside:avoid;background-color:${baseBg} !important;">` +
                  row
                    .map((cell, c) => {
                      const lastCol = c === row.length - 1
                      const vencido = !isCm && lastCol && cell === 'VENCIDO'
                      const center = !isCm ? c === 1 || c === 2 : c === 1 || c === 2
                      return (
                        `<td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:9px;vertical-align:top;word-break:break-word;${
                          center ? 'text-align:center;' : 'text-align:left;'
                        }${vencido ? 'color:#b91c1c !important;font-weight:700;' : ''}">${escape(cell)}</td>`
                      )
                    })
                    .join('') +
                  `</tr>`
                )
              })
              .join('')

      const totalHtml =
        `<tr style="background-color:#ffffff !important;">
           <td colspan="${headers.length}" style="padding:6px 8px;border-top:2px solid #475569;font-size:9px;font-weight:700;color:#0f172a;">Total: ${rows.length}</td>
         </tr>`

      const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escape(titulo)}</title>
<style>
  @page { size: A4 landscape; margin: 22px 18px 46px 18px; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #0f172a; background-color: #ffffff; }
  .page { width: 100%; padding: 0; }
  .header { margin: 0 0 18px 0; position: relative; padding: 10px 0 14px 0; border-bottom: 2px solid #cbd5e1; }
  .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 800; text-align: center; }
  .header .sub { margin: 0 0 10px 0; text-align: center; font-size: 10px; color: #475569; }
  .filters { font-size: 9px; color: #334155; line-height: 1.55; }
  .filters strong { color: #0f172a; }
  .section { margin: 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .footer {
    position: fixed; left: 18px; right: 18px; bottom: 16px;
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 8px; border-top: 1px solid #cbd5e1;
    font-size: 9px; color: #64748b;
  }
  thead th, tfoot td, tbody tr td, .header h1 {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div style="flex:1;"></div>
      ${logoTopHtml}
    </div>
    <h1>${escape(titulo)}</h1>
    <p class="sub">Emitido em: ${escape(emitidoEm)}</p>
    <div class="filters">
      <p><strong>Filtros aplicados:</strong></p>
      <p>Departamento: ${escape(isCm ? 'Centro de Mídia' : 'Equipamentos')}</p>
      <p>Status: ${escape(statusLbl)}</p>
      <p>Tipo: ${escape(tipoLbl)}</p>
      <p>Escola: ${escape(escolaLbl)}</p>
      ${filterText ? `<p>Busca: ${escape(filterText)}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>${totalHtml}</tfoot>
    </table>
  </div>
</div>

<div class="footer">
  ${logoBottomHtml}
  <div>
    <p>Relatório gerado pelo Sistema de Inventário</p>
  </div>
  <span style="font-size:9px;color:#64748b;">Total de registros: ${rows.length}</span>
</div>
</body>
</html>`

      const rootId = 'print-root-list-' + Date.now().toString(36)
      const styleId = rootId + '-style'
      const printRoot = document.createElement('div')
      printRoot.id = rootId
      printRoot.dataset.printRoot = '1'
      Object.assign(printRoot.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '0',
        backgroundColor: '#ffffff',
        zIndex: '2147483647',
        display: 'block',
        overflow: 'hidden',
        boxSizing: 'border-box',
      })

      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.setAttribute('media', 'print')
      styleEl.textContent = `
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > *:not([data-print-root="1"]) { display: none !important; }
          [data-print-root="1"],
          [data-print-root="1"] iframe {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            background: #fff !important;
            z-index: 2147483647 !important;
            visibility: visible !important;
            overflow: visible !important;
          }
          [data-print-root="1"] iframe { width: 297mm !important; min-height: 210mm !important; }
        }
      `
      document.head.appendChild(styleEl)

      const iframeEl = document.createElement('iframe')
      iframeEl.setAttribute('title', 'Relatório para impressão')
      iframeEl.setAttribute('frameborder', '0')
      iframeEl.setAttribute('marginheight', '0')
      iframeEl.setAttribute('marginwidth', '0')
      iframeEl.setAttribute('srcdoc', html)
      Object.assign(iframeEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: '#ffffff',
        boxSizing: 'border-box',
      })

      printRoot.appendChild(iframeEl)
      document.body.appendChild(printRoot)

      const cleanup = () => {
        try {
          if (printRoot.parentNode) printRoot.parentNode.removeChild(printRoot)
        } catch {
          // no-op cleanup
        }
        try {
          if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl)
        } catch {
          // no-op cleanup
        }
      }

      const disparar = () => {
        try {
          window.focus()
          setTimeout(() => {
            try {
              window.print()
              setTimeout(cleanup, 1800)
            } catch {
              showErrorToast('Não foi possível disparar a impressão. Pressione Ctrl+P.')
              setTimeout(cleanup, 3500)
            }
          }, 1700)
        } catch {
          showErrorToast('Erro ao preparar impressão. Pressione Ctrl+P.')
          setTimeout(cleanup, 3500)
        }
      }

      let disparou = false
      const tentarDisparar = () => {
        if (disparou) return
        disparou = true
        disparar()
      }

      try {
        iframeEl.addEventListener('load', tentarDisparar, { once: true, passive: true })
      } catch {
        // no-op listener
      }
      setTimeout(tentarDisparar, 3000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      showErrorToast(`Erro ao preparar impressão: ${msg}`)
    }
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
      
      const [logoTop, logoBottom, { pdf }, { RelatoriosPDF }] = await Promise.all([
        toDataUrl(LogoAsrs),
        toDataUrl(LogoEa),
        import('@react-pdf/renderer'),
        import('../components/relatorios/RelatoriosPDF'),
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
        <h1 className="text-lg font-medium">Relatório de Equipamentos</h1>
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
