import { useEffect, useState, useMemo, useRef } from 'react'
import api from '../lib/axios'
import Pagination from '../components/Pagination'
import { Filter, Printer, FileSpreadsheet, FileDown, RefreshCw, FileText } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '../utils/toast'
import { formatDate } from '../utils/validity'

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
  const str = String(val)
  if (/[,"\n\r]/.test(str)) return `"${str.replaceAll('"', '""')}"`
  return str
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

  // Catálogos
  const [escolas, setEscolas] = useState<EscolaItem[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const printRef = useRef<HTMLDivElement>(null)

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

  async function carregar(page = currentPage) {
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

      const resp = await api.get<RelatorioResponse>(`/api/movimentacoes/relatorio?${params.toString()}`)
      const dados = resp.data || ({} as RelatorioResponse)
      setItens(dados.items || [])
      setTotal(dados.total || 0)
      setTotalPages(dados.totalPages || 1)
      setCurrentPage(dados.currentPage || 1)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
        (e as { message?: string })?.message ||
        'Erro ao carregar relatório de movimentações'
      setError(msg)
      showErrorToast(msg)
    } finally {
      setLoading(false)
    }
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

  const handlePrint = () => {
    if (printRef.current) {
      // Mark tabela como "print mode"
      globalThis.print()
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
    <div className="rounded-lg border bg-white p-4 pb-24 lg:pb-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
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
        <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
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
          onClick={handlePrint}
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
          onClick={() => carregar(currentPage)}
          className="rounded bg-gray-600 px-3 py-2 text-white hover:bg-gray-700 flex items-center gap-2 text-sm ml-auto"
          aria-label="Atualizar relatório"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Tabela / conteúdo impressão */}
      <div ref={printRef} className="overflow-x-auto border rounded-lg">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left whitespace-nowrap">Data</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap">Tipo</th>
              <th className="border px-3 py-2 text-left">Equipamento</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap">Patrimônio</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap">Número de Série</th>
              <th className="border px-3 py-2 text-left">Escola</th>
              <th className="border px-3 py-2 text-left">Usuário</th>
              <th className="border px-3 py-2 text-left">Observações</th>
              <th className="border px-3 py-2 text-left whitespace-nowrap print:hidden">Status</th>
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
                  <td className="border px-3 py-2 whitespace-nowrap">{m.dataMovimento ? formatDate(m.dataMovimento) : '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getTipoClasse(m.tipoMovimento)}`}>
                      {getTipoLabel(m.tipoMovimento)}
                    </span>
                  </td>
                  <td className="border px-3 py-2">{m.equipamento?.nome || '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap font-mono text-xs">{m.equipamento?.patrimonio || '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap font-mono text-xs">{m.equipamento?.serial || '-'}</td>
                  <td className="border px-3 py-2">{m.escola?.nome || '-'}</td>
                  <td className="border px-3 py-2">{m.usuario?.nome || '-'}</td>
                  <td className="border px-3 py-2 max-w-[360px] truncate" title={m.observacoes || ''}>
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
