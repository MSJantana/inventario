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
          ? `<img src="${logoTopData}" alt="Logo ASRS" style="height:28px;object-fit:contain;" />`
          : `<div style="height:28px;width:80px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#050B1A;color:#fff;font-weight:700;font-size:10px;">ASRS</div>`

      const logoBottomHtml =
        logoBottomData
          ? `<img src="${logoBottomData}" alt="Logo EA" style="height:28px;object-fit:contain;" />`
          : `<div style="height:28px;width:80px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#0f172a;color:#fff;font-weight:700;font-size:10px;">EA</div>`

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

      const escape = (v: unknown): string => {
        if (v == null) return ''
        if (typeof v === 'string') return v
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
        if (typeof v === 'number' || typeof v === 'boolean')
          return String(v)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
        if (typeof v === 'bigint')
          return v.toString(10)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
        let text = ''
        try {
          text = JSON.stringify(v) ?? ''
        } catch {
          if (v instanceof Date) text = v.toISOString()
          else if (Array.isArray(v)) {
            const joined: string[] = []
            for (const x of v) {
              if (x == null) joined.push('')
              else if (typeof x === 'string') joined.push(x)
              else if (typeof x === 'number' || typeof x === 'boolean') joined.push(String(x))
              else if (typeof x === 'bigint') joined.push(x.toString(10))
              else if (typeof x === 'object') joined.push(JSON.stringify(x) ?? '')
              else joined.push('')
            }
            text = joined.join(', ')
          } else if (typeof v === 'symbol') {
            text = v.description ?? ''
          } else if (typeof v === 'function') {
            text = v.name || ''
          } else if (typeof v === 'object') {
            try { text = Object.prototype.toString.call(v) } catch { text = '' }
            if (text === '[object Object]' || !text) {
              const parts: string[] = []
              for (const k of Object.keys(v as Record<string, unknown>)) {
                const val = (v as Record<string, unknown>)[k]
                if (val == null) {
                  parts.push(`${String(k)}=`)
                } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                  parts.push(`${String(k)}=${String(val)}`)
                } else if (typeof val === 'bigint') {
                  parts.push(`${String(k)}=${val.toString(10)}`)
                } else {
                  try { parts.push(`${String(k)}=${JSON.stringify(val)}`) } catch { parts.push(String(k)) }
                }
              }
              text = `{${parts.join(', ')}}`
            }
          }
        }
        return text
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
      }

      const headerHtml = headers
        .map(
          (h) =>
            `<th>${escape(h)}</th>`
        )
        .join('')

      const REGISTROS_POR_PAGINA = 40
      const totalGeral = rows.length

      const chunks: string[][][] = []
      if (rows.length === 0) {
        chunks.push([])
      } else {
        for (let i = 0; i < rows.length; i += REGISTROS_POR_PAGINA) {
          chunks.push(rows.slice(i, i + REGISTROS_POR_PAGINA))
        }
      }

      const montarLinha = (row: string[]): string => {
        return (
          `<tr>` +
          row
            .map((cell, c) => {
              const lastCol = c === row.length - 1
              const vencido = !isCm && lastCol && cell === 'VENCIDO'
              const center = c === 1 || c === 2
              return (
                `<td style="${
                  center ? 'text-align:center;' : 'text-align:left;'
                }${vencido ? 'color:#b91c1c !important;font-weight:700;' : ''}">${escape(cell)}</td>`
              )
            })
            .join('') +
          `</tr>`
        )
      }

      const montarTbodyHtml = (chunkRows: string[][]): string => {
        if (chunkRows.length === 0) {
          return `<tr><td colspan="${headers.length}" style="padding:10px 6px;border:1px solid #e5e7eb;text-align:center;font-size:9px;color:#64748b;">Nenhum equipamento encontrado com os filtros aplicados.</td></tr>`
        }
        return chunkRows.map(montarLinha).join('')
      }

      const montarTotalParcialHtml = (partialCount: number): string => {
        if (totalGeral === 0) {
          return `<tr><td colspan="${headers.length}">Total: 0</td></tr>`
        }
        const multiPagina = chunks.length > 1
        return `<tr><td colspan="${headers.length}">${
          multiPagina ? `Total da página: ${partialCount} &nbsp;|&nbsp; Geral: ${totalGeral}` : `Total: ${totalGeral}`
        }</td></tr>`
      }

      const pagesHtml = chunks
        .map((chunk, idx) => {
          const primeiraPagina = idx === 0
          const ultimaPagina = idx === chunks.length - 1
          const tbodyHtml = montarTbodyHtml(chunk)
          const totalHtml = montarTotalParcialHtml(chunk.length)
          const breakStyle = primeiraPagina
            ? ''
            : 'page-break-before: always; break-before: page;'
          const paginaExtraClasses = primeiraPagina ? 'page first-page' : ultimaPagina ? 'page last-page' : 'page'
          const pageHtml =
`  <div class="${paginaExtraClasses}" style="${breakStyle}">
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
        ${chunks.length > 1 ? `<p>Página: <strong>${idx + 1}</strong> de <strong>${chunks.length}</strong></p>` : ''}
      </div>
    </div>

    <div class="section">
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${tbodyHtml}</tbody>
        <tfoot>${totalHtml}</tfoot>
      </table>
    </div>
    <div class="footer">
      ${logoBottomHtml}
      <div>
        <p>Relatório gerado pelo Sistema de Inventário</p>
      </div>
      <span style="font-size:9px;color:#64748b;">Total de registros: ${totalGeral}</span>
    </div>
  </div>`
          return pageHtml
        })
        .join('\n')

      const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escape(titulo)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm 10mm 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #0f172a; background-color: #ffffff; height: auto; }
  body > :last-child { page-break-after: avoid !important; break-after: avoid-page !important; }
  .page { width: 100%; padding: 0; overflow: visible !important; page-break-inside: auto !important; break-inside: auto !important; display: block !important; visibility: visible !important; opacity: 1 !important; }
  div.page + div.page { page-break-before: always !important; break-before: page !important; }
  div.page.last-page { page-break-after: avoid !important; break-after: avoid-page !important; }
  .header {
    display: block !important; visibility: visible !important; opacity: 1 !important;
    margin: 0 0 6px 0; position: relative; padding: 4px 0 6px 0; border-bottom: 2px solid #cbd5e1;
  }
  .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .header h1 { margin: 0 0 2px 0; font-size: 16px; font-weight: 800; text-align: center; }
  .header .sub { margin: 0 0 4px 0; text-align: center; font-size: 8px; color: #475569; }
  .filters { font-size: 7.5px; color: #334155; line-height: 1.25; }
  .filters strong { color: #0f172a; }
  .filters p { margin: 1px 0; }
  .section { margin: 0; break-inside: auto; page-break-inside: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
    font-size: 7.5px;
  }
  thead {
    display: table-header-group !important;
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  thead th {
    padding: 2px 5px;
    border: 1px solid #cbd5e1;
    background-color: #0f172a !important;
    color: #ffffff !important;
    font-weight: 700;
    text-align: left;
    font-size: 7.5px;
    line-height: 1.1;
    vertical-align: middle;
  }
  tbody tr { page-break-inside: avoid; break-inside: avoid; }
  tbody tr:nth-child(even) td { background-color: #f9fafb !important; }
  tbody tr:nth-child(odd) td  { background-color: #ffffff !important; }
  tbody td {
    padding: 1.5px 5px;
    border: 1px solid #e2e8f0;
    font-size: 7.5px;
    line-height: 1.15;
    vertical-align: top;
    color: #0f172a;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  tfoot {
    display: table-footer-group !important;
    break-before: avoid !important;
    page-break-before: avoid !important;
  }
  tfoot td {
    padding: 2px 5px;
    border-top: 2px solid #475569;
    font-size: 7.5px;
    font-weight: 700;
    color: #0f172a;
    background-color: #ffffff !important;
  }
  .footer {
    width: 100%;
    display: block !important; visibility: visible !important; opacity: 1 !important;
    margin-top: 4px;
    padding-top: 2px;
    border-top: 1px solid #cbd5e1;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 7.5px; color: #64748b;
    page-break-inside: avoid; break-inside: avoid; page-break-before: avoid; break-before: avoid-page;
  }
  thead th, tfoot td, tbody tr td, .header h1 {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
</head>
<body>
${pagesHtml}
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
        position: 'relative',
        width: '100%',
        height: 'auto',
        minHeight: '100vh',
        border: 'none',
        display: 'block',
        overflow: 'auto',
        background: '#ffffff',
        boxSizing: 'border-box',
        margin: '0 auto',
      })

      printRoot.appendChild(iframeEl)
      document.body.appendChild(printRoot)

      const cleanup = () => {
        try {
          if (printRoot.parentNode) printRoot.remove()
        } catch {
          // no-op cleanup
        }
        try {
          if (styleEl.parentNode) styleEl.remove()
        } catch {
          // no-op cleanup
        }
      }

      const disparar = () => {
        try {
          const win = iframeEl.contentWindow
          if (!win) throw new Error('IFRAME_WINDOW')
          try { win.focus() } catch { /* no-op */ }
          setTimeout(() => {
            try {
              try { win.print() } catch {
                window.print()
              }
              setTimeout(cleanup, 2200)
            } catch {
              showErrorToast('Não foi possível disparar a impressão. Pressione Ctrl+P.')
              setTimeout(cleanup, 4500)
            }
          }, 1800)
        } catch {
          showErrorToast('Erro ao preparar impressão. Pressione Ctrl+P.')
          setTimeout(cleanup, 4500)
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
      setTimeout(tentarDisparar, 3500)
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
