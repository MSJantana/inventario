import { useEffect, useState, useMemo, useRef } from 'react'
import api from '../lib/axios'
import Pagination from '../components/Pagination'
import { Filter, Printer, FileSpreadsheet, FileDown, RefreshCw, FileText } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '../utils/toast'
import { formatDate } from '../utils/validity'
import { toDataUrl } from '../utils/imageUtils'
import LogoAsrs from '../assets/Logo_ASRS.svg'
import LogoEa from '../assets/Logo_EA.svg'

type XlsxModule = typeof import('xlsx-js-style')

type Usuario = { id: string; nome?: string; email?: string }
type EscolaItem = { id: string; nome: string; sigla?: string }
type EquipamentoItem = { id: string; nome?: string; patrimonio?: string; serial?: string; modelo?: string; tipo?: string }

type MovRel = {
  id: string
  tipoMovimento?: string
  dataMovimento?: string
  observacoes?: string
  origem?: string
  destino?: string
  estornado?: boolean
  motivoEstorno?: string
  escola?: { nome?: string }
  equipamento?: EquipamentoItem
  usuario?: Usuario
  manutencao?: { fornecedor?: string; numeroOs?: string; valorTotal?: number }
  doacao?: { beneficiarioNome?: string; numeroPortaria?: string }
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return escapeCsv(JSON.stringify(val))
  if (typeof val === 'string') {
    const str = val
    if (/[,"\n\r]/.test(str)) return `"${str.replaceAll('"', '""')}"`
    return str
  }
  if (typeof val === 'number' || typeof val === 'bigint' || typeof val === 'boolean') {
    const str = String(val)
    if (/[,"\n\r]/.test(str)) return `"${str.replaceAll('"', '""')}"`
    return str
  }
  return ''
}

function applyHeaderStyles(xlsx: XlsxModule, ws: import('xlsx-js-style').WorkSheet, range: import('xlsx-js-style').Range, headers: string[]) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = xlsx.utils.encode_cell({ r: 0, c })
    const cell = ws[addr] || { t: 's' as const, v: headers[c] }
    cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      fill: { patternType: 'solid' as const, fgColor: { rgb: '1F2937' } },
      border: {
        top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
        left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
        right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
      },
    }
    ws[addr] = cell
  }
}

function applyDataStyles(xlsx: XlsxModule, ws: import('xlsx-js-style').WorkSheet, range: import('xlsx-js-style').Range) {
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = xlsx.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue
      cell.s = {
        alignment: { horizontal: 'left' as const, vertical: 'center' as const },
        border: {
          top: { style: 'thin' as const, color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin' as const, color: { rgb: 'E5E7EB' } },
          left: { style: 'thin' as const, color: { rgb: 'E5E7EB' } },
          right: { style: 'thin' as const, color: { rgb: 'E5E7EB' } },
        },
      }
      ws[addr] = cell
    }
  }
}

const TIPOS = [
  'ENTRADA','SAIDA','TRANSFERENCIA','MANUTENCAO','DESCARTE',
  'MANUTENCAO_ENVIO','MANUTENCAO_RETORNO','EMPRESTIMO','DEVOLUCAO','DOACAO','AJUSTE',
] as const

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Manutenção',
  DESCARTE: 'Descarte',
  MANUTENCAO_ENVIO: 'Manutenção (Envio)',
  MANUTENCAO_RETORNO: 'Manutenção (Retorno)',
  EMPRESTIMO: 'Empréstimo',
  DEVOLUCAO: 'Devolução',
  DOACAO: 'Doação',
  AJUSTE: 'Ajuste (estorno)',
}

const TIPO_CLASSE: Readonly<Record<string, string>> = {
  ENTRADA: 'bg-green-100 text-green-800',
  SAIDA: 'bg-red-100 text-red-800',
  TRANSFERENCIA: 'bg-blue-100 text-blue-800',
  MANUTENCAO: 'bg-yellow-100 text-yellow-800',
  MANUTENCAO_ENVIO: 'bg-yellow-100 text-yellow-900',
  MANUTENCAO_RETORNO: 'bg-yellow-200 text-yellow-900',
  EMPRESTIMO: 'bg-indigo-100 text-indigo-800',
  DEVOLUCAO: 'bg-indigo-200 text-indigo-900',
  DOACAO: 'bg-rose-100 text-rose-800',
  AJUSTE: 'bg-slate-300 text-slate-800',
  DESCARTE: 'bg-gray-100 text-gray-800',
} as const

function getTipoClasse(tipo?: string): string {
  if (!tipo) return 'bg-gray-100 text-gray-800'
  return TIPO_CLASSE[tipo] ?? 'bg-gray-100 text-gray-800'
}

function getTipoLabel(tipo?: string): string {
  if (!tipo) return 'Sem tipo'
  return TIPO_LABEL[tipo] ?? tipo.replaceAll('_', ' ')
}

type RelatorioResponse = {
  total: number
  totalPages: number
  currentPage: number
  perPage: number
  items: MovRel[]
  filtrosAplicados: Record<string, unknown>
}

export default function RelatorioMovimentacoesPage() {
  const [itens, setItens] = useState<MovRel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filtros
  const [periodoInicio, setPeriodoInicio] = useState<string>('')
  const [periodoFim, setPeriodoFim] = useState<string>('')
  const [escolaId, setEscolaId] = useState<string>('ALL')
  const [tipoMovimento, setTipoMovimento] = useState<string>('ALL')
  const [usuarioId, setUsuarioId] = useState<string>('ALL')
  const [patrimonio, setPatrimonio] = useState<string>('')
  const [serial, setSerial] = useState<string>('')
  const [estornado, setEstornado] = useState<string>('ALL')
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [reloadToken, setReloadToken] = useState<number>(0)

  // Catálogos
  const [escolas, setEscolas] = useState<EscolaItem[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const printRef = useRef<HTMLDivElement>(null)
  const carregamentoEmAndamentoRef = useRef<number>(0)

  useEffect(() => {
    async function carregarCatalogos() {
      try {
        const [eRes, uRes] = await Promise.all([
          api.get('/api/escolas'),
          api.get('/api/usuarios'),
        ])
        setEscolas(eRes.data || [])
        setUsuarios(uRes.data || [])
      } catch {
        /* ignora erros de catalogo */
      }
    }
    carregarCatalogos()
  }, [])

  async function carregar(page = currentPage, forcar = false) {
    const ticketRequest = ++carregamentoEmAndamentoRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (periodoInicio) params.set('periodoInicio', periodoInicio)
      if (periodoFim) params.set('periodoFim', periodoFim)
      if (escolaId !== 'ALL') params.set('escolaId', escolaId)
      if (tipoMovimento !== 'ALL') params.set('tipoMovimento', tipoMovimento)
      if (usuarioId !== 'ALL') params.set('usuarioId', usuarioId)
      if (patrimonio.trim()) params.set('patrimonio', patrimonio.trim())
      if (serial.trim()) params.set('serial', serial.trim())
      if (estornado !== 'ALL') params.set('estornado', estornado)
      params.set('page', String(page))
      params.set('perPage', String(pageSize))
      if (forcar) {
        params.set('_t', String(Date.now()))
        params.set('_tok', String(reloadToken))
      }

      const resp = await api.get<RelatorioResponse>(`/api/movimentacoes/relatorio?${params.toString()}`)
      if (ticketRequest !== carregamentoEmAndamentoRef.current) {
        return
      }
      const dados = resp.data || ({} as RelatorioResponse)
      setItens(dados.items || [])
      setTotal(dados.total || 0)
      setTotalPages(dados.totalPages || 1)
      setCurrentPage(dados.currentPage || 1)
    } catch (e: unknown) {
      if (ticketRequest !== carregamentoEmAndamentoRef.current) {
        return
      }
      const msg =
        (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
        (e as { message?: string })?.message ||
        'Erro ao carregar relatório de movimentações'
      setError(msg)
      showErrorToast(msg)
    } finally {
      if (ticketRequest === carregamentoEmAndamentoRef.current) {
        setLoading(false)
      }
    }
  }

  function handleRecarregar() {
    setReloadToken((t) => (t + 1) % 1_000_000)
    void carregar(currentPage, true)
  }

  // Ao montar + mudar filtro/page/pageSize -> carregar
  useEffect(() => {
    carregar(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoInicio, periodoFim, escolaId, tipoMovimento, usuarioId, patrimonio, serial, estornado, pageSize])

  useEffect(() => {
    if (currentPage > 1) carregar(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

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

      const titulo = 'Relatório de Movimentações'
      const emitidoEm = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Rótulos dos filtros aplicados
      const escolaLbl = escolaId === 'ALL'
        ? 'Todas'
        : escolas.find((e) => e.id === escolaId)?.nome || escolaId
      const tipoLbl = tipoMovimento === 'ALL' ? 'Todos' : (TIPO_LABEL[tipoMovimento] ?? tipoMovimento.replaceAll('_', ' '))
      const usuarioLbl = usuarioId === 'ALL'
        ? 'Todos'
        : usuarios.find((u) => u.id === usuarioId)?.nome || usuarioId
      let periodoLbl: string
      if (periodoInicio && periodoFim) {
        periodoLbl = `${formatDate(periodoInicio)} a ${formatDate(periodoFim)}`
      } else if (periodoInicio) {
        periodoLbl = `De ${formatDate(periodoInicio)}`
      } else if (periodoFim) {
        periodoLbl = `Até ${formatDate(periodoFim)}`
      } else {
        periodoLbl = 'Todo período'
      }

      let estornadoLbl: string
      if (estornado === 'true') {
        estornadoLbl = 'Sim'
      } else if (estornado === 'false') {
        estornadoLbl = 'Não'
      } else {
        estornadoLbl = ''
      }

      const logoTopHtml = logoTopData
        ? `<img src="${logoTopData}" alt="Logo ASRS" style="height:28px;object-fit:contain;" />`
        : `<div style="height:28px;width:80px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#050B1A;color:#fff;font-weight:700;font-size:10px;">ASRS</div>`

      const logoBottomHtml = logoBottomData
        ? `<img src="${logoBottomData}" alt="Logo EA" style="height:28px;object-fit:contain;" />`
        : `<div style="height:28px;width:80px;display:flex;align-items:center;justify-content:center;border-radius:8px;background-color:#0f172a;color:#fff;font-weight:700;font-size:10px;">EA</div>`

      const escape = (v: unknown): string => {
        if (v == null) return ''
        if (typeof v === 'string') {
          return v
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
        }
        if (typeof v === 'number' || typeof v === 'boolean') {
          return String(v)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
        }
        if (typeof v === 'bigint') {
          return v.toString(10)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
        }
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

      const headers = ['Data', 'Tipo', 'Equipamento', 'Patrimônio', 'Nº Série', 'Escola', 'Usuário', 'Origem', 'Destino', 'Observações']

      const headerHtml = headers
        .map(
          (h) => `<th>${escape(h)}</th>`
        )
        .join('')

      const REGISTROS_POR_PAGINA = 40
      const totalGeral = itens.length
      const totalDb = total

      const chunks: typeof itens[] = []
      if (itens.length === 0) {
        chunks.push([])
      } else {
        for (let i = 0; i < itens.length; i += REGISTROS_POR_PAGINA) {
          chunks.push(itens.slice(i, i + REGISTROS_POR_PAGINA))
        }
      }

      const montarLinhaMov = (m: (typeof itens)[number]): string => {
        const baseBg = m.estornado ? '#fff1f2' : ''
        const obs =
          m.observacoes ||
          (m.manutencao?.fornecedor ? `Manutenção: ${m.manutencao.fornecedor}` : '') ||
          (m.doacao?.beneficiarioNome ? `Doado para: ${m.doacao.beneficiarioNome}` : '') ||
          '-'
        return (
          `<tr style="${m.estornado ? `background-color:${baseBg} !important;` : ''}">` +
          [
            m.dataMovimento ? formatDate(m.dataMovimento) : '-',
            getTipoLabel(m.tipoMovimento) + (m.estornado ? ' ⚠' : ''),
            m.equipamento?.nome || '-',
            m.equipamento?.patrimonio || '-',
            m.equipamento?.serial || '-',
            m.escola?.nome || '-',
            m.usuario?.nome || '-',
            m.origem || '-',
            m.destino || '-',
            obs,
          ]
            .map(
              (cell, c) =>
                `<td style="${
                  m.estornado ? 'color:#b91c1c !important;' : ''
                }${c === 0 || c === 1 ? 'white-space:nowrap;' : ''}">${escape(cell)}</td>`
            )
            .join('') +
          `</tr>`
        )
      }

      const montarTbodyHtmlMov = (chunk: typeof itens): string => {
        if (chunk.length === 0) {
          return `<tr><td colspan="${headers.length}" style="padding:10px 6px;border:1px solid #e5e7eb;text-align:center;font-size:9px;color:#64748b;">Nenhuma movimentação encontrada com os filtros aplicados.</td></tr>`
        }
        return chunk.map(montarLinhaMov).join('')
      }

      const montarTotalParcialHtmlMov = (partialCount: number): string => {
        if (totalGeral === 0) {
          return `<tr><td colspan="${headers.length}">Total exibido: 0 de ${totalDb} registro(s)</td></tr>`
        }
        const multiPagina = chunks.length > 1
        return `<tr><td colspan="${headers.length}">${
          multiPagina
            ? `Página: ${partialCount} registro(s) &nbsp;|&nbsp; Exibido: ${totalGeral} de ${totalDb}`
            : `Total exibido: ${totalGeral} de ${totalDb} registro(s)`
        }</td></tr>`
      }

      const pagesHtml = chunks
        .map((chunk, idx) => {
          const primeiraPagina = idx === 0
          const ultimaPagina = idx === chunks.length - 1
          const tbodyHtml = montarTbodyHtmlMov(chunk)
          const totalHtml = montarTotalParcialHtmlMov(chunk.length)
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
        <p>Período: ${escape(periodoLbl)}</p>
        <p>Escola: ${escape(escolaLbl)}</p>
        <p>Tipo de movimento: ${escape(tipoLbl)}</p>
        <p>Usuário: ${escape(usuarioLbl)}</p>
        ${patrimonio.trim() ? `<p>Patrimônio: ${escape(patrimonio)}</p>` : ''}
        ${serial.trim() ? `<p>Nº Série: ${escape(serial)}</p>` : ''}
        ${estornadoLbl ? `<p>Estornadas: ${escape(estornadoLbl)}</p>` : ''}
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
      <span style="font-size:9px;color:#64748b;">Total de registros: ${totalDb}</span>
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

      const rootId = 'print-root-mov-' + Date.now().toString(36)
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
      iframeEl.setAttribute('title', 'Relatório de movimentações para impressão')
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
        try { if (printRoot.parentNode) printRoot.remove() } catch { /* no-op */ }
        try { if (styleEl.parentNode) styleEl.remove() } catch { /* no-op */ }
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
      } catch { /* no-op */ }
      setTimeout(tentarDisparar, 3500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      showErrorToast(`Erro ao preparar impressão: ${msg}`)
    }
  }

  async function handleCSV() {
    try {
      const headers = [
        'Data','Tipo','Equipamento','Patrimônio','Número de Série','Escola','Usuário','Origem','Destino','Observações','Estornada','Motivo Estorno',
      ]
      const rows = itens.map((m) => [
        m.dataMovimento ? formatDate(m.dataMovimento) : '',
        getTipoLabel(m.tipoMovimento),
        m.equipamento?.nome || '',
        m.equipamento?.patrimonio || '',
        m.equipamento?.serial || '',
        m.escola?.nome || '',
        m.usuario?.nome || '',
        m.origem || '',
        m.destino || '',
        m.observacoes || '',
        m.estornado ? 'Sim' : 'Não',
        m.motivoEstorno || '',
      ])
      const BOM = '\uFEFF'
      const content = BOM + [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n')
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `movimentacoes_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showSuccessToast('CSV baixado com sucesso!')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      showErrorToast(`Erro ao baixar CSV: ${msg}`)
    }
  }

  async function handleXLSX() {
    try {
      const XLSX = await import('xlsx-js-style')
      const headers = [
        'Data','Tipo','Equipamento','Patrimônio','Número de Série','Escola','Usuário','Origem','Destino','Observações','Estornada',
      ]
      const rows = itens.map((m) => [
        m.dataMovimento ? formatDate(m.dataMovimento) : '',
        getTipoLabel(m.tipoMovimento),
        m.equipamento?.nome || '',
        m.equipamento?.patrimonio || '',
        m.equipamento?.serial || '',
        m.escola?.nome || '',
        m.usuario?.nome || '',
        m.origem || '',
        m.destino || '',
        m.observacoes || '',
        m.estornado ? 'Sim' : 'Não',
      ])
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = [16, 22, 24, 14, 18, 24, 18, 18, 18, 40, 10].map((w) => ({ wch: w }))
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      applyHeaderStyles(XLSX, ws, range, headers)
      applyDataStyles(XLSX, ws, range)
      XLSX.utils.book_append_sheet(wb, ws, 'Movimentações')
      const filename = `movimentacoes_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, filename)
      showSuccessToast('XLSX gerado com sucesso!')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar XLSX: ${msg}`)
    }
  }

  const periodoLabel = useMemo(() => {
    if (periodoInicio && periodoFim) {
      if (periodoInicio === periodoFim) return `${formatDate(periodoInicio)}`
      return `${formatDate(periodoInicio)} a ${formatDate(periodoFim)}`
    }
    if (periodoInicio) return `de ${formatDate(periodoInicio)}`
    if (periodoFim) return `até ${formatDate(periodoFim)}`
    return 'Todo período'
  }, [periodoInicio, periodoFim])

  return (
    <div className="rounded-lg border bg-white p-4 pb-24 lg:pb-4 shadow-sm print:border-0 print:shadow-none print:rounded-none print:p-0 print:pb-0">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-lg font-medium flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            Relatório de Movimentações
          </h1>
          <p className="text-xs text-gray-500">{periodoLabel} • {total} registro(s)</p>
        </div>
        {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700 print:hidden">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4 print:hidden">
        <div>
          <label htmlFor="periodoInicio" className="mb-1 block text-sm font-medium flex items-center gap-1">
            <Filter className="h-3 w-3" aria-hidden /> Período inicial
          </label>
          <input
            id="periodoInicio"
            type="date"
            className="w-full rounded border px-3 py-2 bg-white"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="periodoFim" className="mb-1 block text-sm font-medium">Período final</label>
          <input
            id="periodoFim"
            type="date"
            className="w-full rounded border px-3 py-2 bg-white"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="escolaFiltro" className="mb-1 block text-sm font-medium">Escola</label>
          <select id="escolaFiltro" className="w-full rounded border px-3 py-2 bg-white" value={escolaId} onChange={(e) => { setEscolaId(e.target.value); setCurrentPage(1) }}>
            <option value="ALL">Todas</option>
            {escolas.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tipoMovFiltro" className="mb-1 block text-sm font-medium">Tipo de movimento</label>
          <select id="tipoMovFiltro" className="w-full rounded border px-3 py-2 bg-white" value={tipoMovimento} onChange={(e) => { setTipoMovimento(e.target.value); setCurrentPage(1) }}>
            <option value="ALL">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="usuarioFiltro" className="mb-1 block text-sm font-medium">Usuário (registrou)</label>
          <select id="usuarioFiltro" className="w-full rounded border px-3 py-2 bg-white" value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value); setCurrentPage(1) }}>
            <option value="ALL">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nome || u.email || u.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="patrimonioFiltro" className="mb-1 block text-sm font-medium">Patrimônio (contém)</label>
          <input
            id="patrimonioFiltro"
            type="text"
            className="w-full rounded border px-3 py-2 bg-white"
            value={patrimonio}
            placeholder="ex: 12345"
            onChange={(e) => { setPatrimonio(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div>
          <label htmlFor="serialFiltro" className="mb-1 block text-sm font-medium">Número de Série (contém)</label>
          <input
            id="serialFiltro"
            type="text"
            className="w-full rounded border px-3 py-2 bg-white"
            value={serial}
            placeholder="ex: CND-123"
            onChange={(e) => { setSerial(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 items-end">
          <div>
            <label htmlFor="estornadoFiltro" className="mb-1 block text-sm font-medium">Estornadas</label>
            <select id="estornadoFiltro" className="w-full rounded border px-3 py-2 bg-white" value={estornado} onChange={(e) => { setEstornado(e.target.value); setCurrentPage(1) }}>
              <option value="ALL">Todas</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div>
            <label htmlFor="pageSizeFiltro" className="mb-1 block text-sm font-medium">Pág.</label>
            <select id="pageSizeFiltro" className="w-full rounded border px-3 py-2 bg-white" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
              {[10,25,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Botões ações */}
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => void handlePrint()}
          className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 flex items-center gap-2 text-sm"
          aria-label="Imprimir relatório"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button
          type="button"
          onClick={handleCSV}
          className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 flex items-center gap-2 text-sm"
          aria-label="Exportar CSV"
        >
          <FileDown className="h-4 w-4" /> CSV
        </button>
        <button
          type="button"
          onClick={handleXLSX}
          className="rounded bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 flex items-center gap-2 text-sm"
          aria-label="Exportar Excel"
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </button>
        <button
          type="button"
          onClick={handleRecarregar}
          disabled={loading}
          className="rounded bg-gray-600 px-3 py-2 text-white hover:bg-gray-700 flex items-center gap-2 text-sm ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Atualizar relatório"
          aria-busy={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Tabela / conteúdo impressão */}
      <div ref={printRef} className="overflow-x-auto border rounded-lg print-area print:border-0 print:rounded-none print:overflow-visible">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:whitespace-normal w-[12%]">Data</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:whitespace-normal w-[12%]">Tipo</th>
              <th className="border px-3 py-2 text-left w-[16%]">Equipamento</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:whitespace-normal w-[9%]">Patrimônio</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:whitespace-normal w-[10%]">Número de Série</th>
              <th className="border px-3 py-2 text-left w-[12%]">Escola</th>
              <th className="border px-3 py-2 text-left w-[11%]">Usuário</th>
              <th className="border px-3 py-2 text-left w-[28%]">Observações</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:hidden w-[10%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td className="border px-3 py-8 text-center text-slate-500" colSpan={9}>
                  {loading ? 'Carregando...' : 'Nenhuma movimentação encontrada neste filtro.'}
                </td>
              </tr>
            ) : (
              itens.map((m) => (
                <tr key={m.id} className={m.estornado ? 'bg-red-50/40' : ''}>
                  <td className="border px-3 py-2 whitespace-nowrap print:whitespace-normal">{m.dataMovimento ? formatDate(m.dataMovimento) : '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap print:whitespace-normal">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide print:inline-block ${getTipoClasse(m.tipoMovimento)}`}>
                      {getTipoLabel(m.tipoMovimento)}
                    </span>
                  </td>
                  <td className="border px-3 py-2 print:break-words">{m.equipamento?.nome || '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap print:whitespace-normal font-mono text-xs print:font-normal print:text-[10pt]">{m.equipamento?.patrimonio || '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap print:whitespace-normal font-mono text-xs print:font-normal print:text-[10pt]">{m.equipamento?.serial || '-'}</td>
                  <td className="border px-3 py-2 print:break-words">{m.escola?.nome || '-'}</td>
                  <td className="border px-3 py-2 print:break-words">{m.usuario?.nome || '-'}</td>
                  <td className="border px-3 py-2 max-w-[360px] truncate print:max-w-none print:whitespace-normal print:break-words print:overflow-visible" title={m.observacoes || ''}>
                    {m.observacoes || (m.manutencao?.fornecedor ? `Manutenção: ${m.manutencao.fornecedor}` : '') || (m.doacao?.beneficiarioNome ? `Doado para: ${m.doacao.beneficiarioNome}` : '') || '-'}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap print:hidden">
                    {m.estornado ? (
                      <span className="rounded-full border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase text-red-700">
                        Estornada
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold uppercase text-emerald-700">
                        Ativa
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td colSpan={9} className="border px-3 py-2 text-xs text-slate-600">
                Relatório gerado em {new Date().toLocaleString('pt-BR')} • {total} registro(s)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 print:hidden">
          <Pagination
            current={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  )
}
