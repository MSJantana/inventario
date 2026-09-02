import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { ChevronLeft, ClipboardList, Download, Filter, RefreshCcw, Search, X } from 'lucide-react'
import Pagination from '../components/Pagination'
import { showErrorToast } from '../utils/toast'
import {
  listarLogsImportacao,
  obterLogImportacaoPorId,
  type AuditoriaFiltros,
} from '../services/winauditAuditoria'
import type {
  StatusImportacaoWinAudit,
  WinAuditLogDetalhe,
  WinAuditLogDetalheRaw,
  WinAuditLogDadosBrutosWrapper,
  WinAuditLogEquipamento,
  WinAuditLogListagemItem,
  WinAuditLogResumo,
} from '../types/winaudit'

type ErroApiShape = {
  readonly response?: {
    readonly data?: {
      readonly error?: string
      readonly message?: string
      readonly code?: string
      readonly statusCode?: number
    }
    readonly status?: number
  }
  readonly message?: string
}

const LABEL_POR_STATUS_HTTP: Readonly<Record<number, string>> = {
  400: 'Solicitação inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  413: 'Arquivo muito grande',
  415: 'Tipo de arquivo não suportado',
  422: 'Dados inválidos',
  500: 'Erro no servidor',
  502: 'Gateway inválido',
  503: 'Serviço indisponível',
  504: 'Tempo limite de gateway',
} as const

const formatarMensagemErro = (e: unknown, mensagemPadrao: string): string => {
  const erro = e as ErroApiShape
  const resp = erro?.response
  const data = resp?.data
  const status = resp?.status ?? data?.statusCode
  const motivo = data?.error || data?.message || erro?.message

  const partes: string[] = []
  if (typeof status === 'number' && status > 0) {
    const label = LABEL_POR_STATUS_HTTP[status] || `Erro HTTP ${status}`
    partes.push(`${label} (${status})`)
  }
  if (data?.code && String(data.code).trim().length > 0) {
    partes.push(`[${String(data.code).trim()}]`)
  }
  if (typeof motivo === 'string' && motivo.trim().length > 0) {
    partes.push(motivo.trim())
  } else {
    partes.push(mensagemPadrao)
  }
  return partes.join(' · ')
}

const LABEL_STATUS_IMPORTCACAO: Readonly<Record<StatusImportacaoWinAudit, string>> = {
  PREVIEW_GERADO: 'Preview',
  SUCESSO: 'Sucesso',
  CANCELADO: 'Cancelado',
  ERRO: 'Erro',
} as const

const CLASSES_BADGE_STATUS: Readonly<Record<StatusImportacaoWinAudit, string>> = {
  PREVIEW_GERADO: 'bg-sky-100 text-sky-700 ring-sky-200',
  SUCESSO: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  CANCELADO: 'bg-gray-100 text-gray-700 ring-gray-200',
  ERRO: 'bg-rose-100 text-rose-700 ring-rose-200',
} as const

const OPCOES_PERIODO: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'custom', label: 'Período customizado' },
] as const

const OPCOES_STATUS_FILTRO: ReadonlyArray<{ readonly value: '' | StatusImportacaoWinAudit; readonly label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'SUCESSO', label: 'Sucesso' },
  { value: 'ERRO', label: 'Erro' },
  { value: 'PREVIEW_GERADO', label: 'Preview gerado' },
  { value: 'CANCELADO', label: 'Cancelado' },
] as const

const doisDigitos = (n: number): string => (n < 10 ? `0${n}` : String(n))

const formatarDataHora = (iso: string | null | undefined): string => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
  } catch {
    return iso
  }
}

const formatarDataIso = (d: Date): string => {
  const ano = d.getFullYear()
  const mes = doisDigitos(d.getMonth() + 1)
  const dia = doisDigitos(d.getDate())
  return `${ano}-${mes}-${dia}`
}

const formatarBytes = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '-'
  const KB = 1024
  const MB = KB * 1024
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`
  return `${bytes} B`
}

const formatarDuracao = (ms: number | null | undefined): string => {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return '-'
  if (ms < 1000) return `${ms} ms`
  const segundos = ms / 1000
  if (segundos < 60) return `${segundos.toFixed(segundos < 10 ? 1 : 0)} s`
  const minutos = Math.floor(segundos / 60)
  const resto = Math.round(segundos - minutos * 60)
  return `${minutos}m ${resto}s`
}

const formatarDataHoje = (): string => {
  const d = new Date()
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`
}

const obterPeriodoDateRange = (
  periodoValor: string,
  customInicio: string,
  customFim: string,
): { dataInicio?: string; dataFim?: string } => {
  if (periodoValor === 'todos') return {}
  if (periodoValor === 'hoje') {
    const hoje = formatarDataIso(new Date())
    return { dataInicio: hoje, dataFim: hoje }
  }
  if (periodoValor === '7d') {
    const fim = new Date()
    const inicio = new Date()
    inicio.setDate(fim.getDate() - 6)
    return { dataInicio: formatarDataIso(inicio), dataFim: formatarDataIso(fim) }
  }
  if (periodoValor === '30d') {
    const fim = new Date()
    const inicio = new Date()
    inicio.setDate(fim.getDate() - 29)
    return { dataInicio: formatarDataIso(inicio), dataFim: formatarDataIso(fim) }
  }
  if (periodoValor === 'custom') {
    const out: { dataInicio?: string; dataFim?: string } = {}
    if (customInicio) out.dataInicio = customInicio
    if (customFim) out.dataFim = customFim
    return out
  }
  return {}
}

const LABEL_POR_CAMPO_RAW: Readonly<Record<string, { arquivo: string; sistema: string }>> = {
  NOME: { arquivo: 'Computer Name', sistema: 'Nome' },
  USUARIO_NOME: { arquivo: 'User Account', sistema: 'Nome do usuário' },
  FABRICANTE: { arquivo: 'Manufacturer', sistema: 'Fabricante' },
  MODELO_ORIGINAL: { arquivo: 'Model', sistema: 'Modelo' },
  SERIAL: { arquivo: 'Serial Number', sistema: 'Serial' },
  MAC_ADDRESS: { arquivo: 'MAC Address', sistema: 'MAC Address' },
  PROCESSADOR: { arquivo: 'Processor Description', sistema: 'Processador' },
  MEMORIA: { arquivo: 'Total Memory', sistema: 'Memória' },
  DATA_AQUISICAO: { arquivo: 'Release Date / Install Date', sistema: 'Data de Aquisição' },
} as const

const pegarValorCampoEncontrado = (
  entrada: readonly unknown[] | null | undefined,
): string => {
  if (!entrada || !Array.isArray(entrada) || entrada.length === 0) return '-'
  const primeira = entrada[0]
  if (!primeira || typeof primeira !== 'object') return '-'
  const shape = primeira as {
    valor?: unknown
    displayLabel?: string | null
    rawLabel?: string | null
    valorEncontrado?: unknown
  }
  const candidatos = [shape.valor, shape.displayLabel, shape.rawLabel, shape.valorEncontrado]
  for (const c of candidatos) {
    if (c === null || c === undefined) continue
    let str: string
    switch (typeof c) {
      case 'string':
        str = c
        break
      case 'number':
      case 'boolean':
      case 'bigint':
        str = String(c)
        break
      case 'symbol':
        str = c.toString()
        break
      case 'function':
        str = c.toString()
        break
      case 'object':
        str = JSON.stringify(c)
        break
      default:
        str = ''
    }
    if (str.length > 0) return str
  }
  return '-'
}

const FALLBACK_POR_KEY_NO_EQUIPAMENTO: Readonly<
  Record<string, (eq: WinAuditLogEquipamento) => string | undefined | null>
> = {
  NOME: (eq) => eq.nome,
  SERIAL: (eq) => eq.serial,
  MAC_ADDRESS: (eq) => eq.macaddress,
  MODELO_ORIGINAL: (eq) => eq.modelo,
} as const

const montarLinhasMapeamento = (detalhe: WinAuditLogDetalhe): ReadonlyArray<{
  readonly campoArquivo: string
  readonly campoSistema: string
  readonly valorImportado: string
}> => {
  const linhas: Array<{
    campoArquivo: string
    campoSistema: string
    valorImportado: string
  }> = []
  const wrapper = detalhe.dadosBrutos as WinAuditLogDadosBrutosWrapper | WinAuditLogDetalheRaw | null | undefined
  const raw: WinAuditLogDetalheRaw =
    (wrapper && typeof wrapper === 'object' && 'camposBrutosExtraidos' in wrapper
      ? (wrapper as WinAuditLogDadosBrutosWrapper).camposBrutosExtraidos
      : (wrapper as WinAuditLogDetalheRaw | null | undefined)) ?? {}
  const keysLabels = Object.keys(LABEL_POR_CAMPO_RAW)
  for (const key of keysLabels) {
    const labels = LABEL_POR_CAMPO_RAW[key]
    const entries = raw[key]
    let valor = pegarValorCampoEncontrado(entries)
    if (valor === '-' && detalhe.equipamento) {
      const fallback = FALLBACK_POR_KEY_NO_EQUIPAMENTO[key]
      const valorEquipamento = fallback ? fallback(detalhe.equipamento) : undefined
      if (typeof valorEquipamento === 'string' && valorEquipamento.length > 0) {
        valor = valorEquipamento
      }
    }
    linhas.push({
      campoArquivo: labels.arquivo,
      campoSistema: labels.sistema,
      valorImportado: valor,
    })
  }
  return linhas
}

type KpiCardProps = {
  readonly titulo: string
  readonly valor: string
  readonly subtitulo?: string
  readonly icon?: 'importacoes' | 'calendario' | 'sucesso' | 'erro' | 'equipamentos' | 'campos' | 'tempo'
}

const ICONE_KPI_POR_TIPO: Readonly<Record<NonNullable<KpiCardProps['icon']>, string>> = {
  importacoes: '📦',
  calendario: '📅',
  sucesso: '✅',
  erro: '❌',
  equipamentos: '🖥️',
  campos: '🧩',
  tempo: '⏱️',
} as const

function KpiCard({ titulo, valor, subtitulo, icon }: Readonly<KpiCardProps>) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500">{titulo}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{valor}</p>
          {subtitulo ? (
            <p className="mt-1 text-xs text-gray-500">{subtitulo}</p>
          ) : null}
        </div>
        {icon ? (
          <span className="text-xl" aria-hidden>
            {ICONE_KPI_POR_TIPO[icon]}
          </span>
        ) : null}
      </div>
    </div>
  )
}

type UsuariosListagemUnico = { readonly id: string; readonly nome: string }
const extrairUsuariosUnicos = (
  itens: readonly WinAuditLogListagemItem[],
): readonly UsuariosListagemUnico[] => {
  const mapa = new Map<string, UsuariosListagemUnico>()
  for (const item of itens) {
    if (item.usuario?.id && !mapa.has(item.usuario.id)) {
      mapa.set(item.usuario.id, { id: item.usuario.id, nome: item.usuario.nome })
    }
  }
  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
}

const camposBadge = (item: WinAuditLogListagemItem): { encontrados: number; importados: number; texto: string; classe: string } => {
  const encontrados = typeof item.qtdCamposEncontrados === 'number' ? item.qtdCamposEncontrados : 0
  let importados = typeof item.qtdCamposImportados === 'number' ? item.qtdCamposImportados : 0
  if (encontrados === 0 && importados === 0) {
    return {
      encontrados: 0,
      importados: 0,
      texto: '0/0',
      classe: 'bg-gray-100 text-gray-500 ring-gray-200',
    }
  }
  if (importados === 0 && item.status === 'SUCESSO' && encontrados > 0) {
    importados = encontrados
  }
  if (importados === 0 && item.status === 'PREVIEW_GERADO' && encontrados > 0) {
    importados = Math.max(1, Math.round(encontrados * 0.6))
  }
  if (importados > encontrados && encontrados > 0) importados = encontrados
  const proporcao = importados > 0 && encontrados > 0 ? importados / encontrados : 0
  let classe: string
  if (proporcao >= 0.9) {
    classe = 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  } else if (proporcao >= 0.5) {
    classe = 'bg-amber-100 text-amber-700 ring-amber-200'
  } else {
    classe = 'bg-rose-100 text-rose-700 ring-rose-200'
  }
  return {
    encontrados,
    importados,
    texto: `${importados}/${encontrados}`,
    classe,
  }
}

export default function AuditoriaPage() {
  const [carregando, setCarregando] = useState<boolean>(true)
  const [erro, setErro] = useState<string | null>(null)
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [totalPaginas, setTotalPaginas] = useState<number>(1)
  const [totalRegistros, setTotalRegistros] = useState<number>(0)
  const [itens, setItens] = useState<readonly WinAuditLogListagemItem[]>([])
  const [resumo, setResumo] = useState<WinAuditLogResumo | null>(null)

  const [busca, setBusca] = useState<string>('')
  const [periodo, setPeriodo] = useState<string>('todos')
  const [dataInicioCustom, setDataInicioCustom] = useState<string>('')
  const [dataFimCustom, setDataFimCustom] = useState<string>('')
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>('')
  const [statusFiltro, setStatusFiltro] = useState<'' | StatusImportacaoWinAudit>('')

  const [filtrosAplicados, setFiltrosAplicados] = useState<AuditoriaFiltros>({})

  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [detalheCarregando, setDetalheCarregando] = useState<boolean>(false)
  const [detalhe, setDetalhe] = useState<WinAuditLogDetalhe | null>(null)

  const usuariosParaSelect = useMemo(() => extrairUsuariosUnicos(itens), [itens])

  const carregar = useCallback(async (pagina: number, filtros: AuditoriaFiltros) => {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await listarLogsImportacao({
        pagina,
        porPagina: 10,
        filtros,
      })
      setItens(resultado.itens || [])
      setResumo(resultado.resumo || null)
      setPaginaAtual(resultado.pagina || 1)
      setTotalPaginas(resultado.totalPaginas || 1)
      setTotalRegistros(resultado.total || 0)
    } catch (e: unknown) {
      const mensagem = formatarMensagemErro(e, 'Erro ao carregar auditoria de importações.')
      setErro(mensagem)
      showErrorToast(mensagem)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar(1, {})
  }, [carregar])

  const aplicarFiltros = useCallback(() => {
    const range = obterPeriodoDateRange(periodo, dataInicioCustom, dataFimCustom)
    const filtros: AuditoriaFiltros = {
      ...range,
      arquivoOriginalContem: busca.trim().length > 0 ? busca.trim() : undefined,
      usuarioId: usuarioFiltro || undefined,
      status: statusFiltro || undefined,
    }
    setFiltrosAplicados(filtros)
    carregar(1, filtros)
  }, [busca, periodo, dataInicioCustom, dataFimCustom, usuarioFiltro, statusFiltro, carregar])

  const limparFiltros = useCallback(() => {
    setBusca('')
    setPeriodo('todos')
    setDataInicioCustom('')
    setDataFimCustom('')
    setUsuarioFiltro('')
    setStatusFiltro('')
    setFiltrosAplicados({})
    carregar(1, {})
  }, [carregar])

  const trocarPagina = useCallback((pagina: number) => {
    if (pagina === paginaAtual) return
    carregar(pagina, filtrosAplicados)
  }, [paginaAtual, filtrosAplicados, carregar])

  const exportarCSV = useCallback(async () => {
    try {
      const linhasExport = [
        [
          'Data e Hora',
          'Usuário',
          'Arquivo',
          'Status',
          'Equipamento',
          'IP de Origem',
          'Campos Encontrados',
          'Campos Importados',
          'Tamanho (bytes)',
          'Duração (ms)',
          'Versão Importador',
          'Motivo Erro',
        ],
      ]
      for (const item of itens) {
        linhasExport.push([
          formatarDataHora(item.dataHora),
          item.usuario?.nome || '-',
          item.arquivoOriginal || '-',
          LABEL_STATUS_IMPORTCACAO[item.status] || item.status,
          item.equipamento?.nome || '-',
          item.ipOrigem || '-',
          typeof item.qtdCamposEncontrados === 'number' ? String(item.qtdCamposEncontrados) : '-',
          typeof item.qtdCamposImportados === 'number' ? String(item.qtdCamposImportados) : '-',
          typeof item.tamanhoBytes === 'number' ? String(item.tamanhoBytes) : '-',
          typeof item.duracaoMs === 'number' ? String(item.duracaoMs) : '-',
          '-',
          item.erroMotivo || '-',
        ])
      }
      const csv = linhasExport
        .map((l) =>
          l
            .map((celula) => {
              const texto = String(celula ?? '')
              if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
                return `"${texto.replaceAll('"', '""')}"`
              }
              return texto
            })
            .join(';'),
        )
        .join('\n')
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date()
      const nomeArquivo = `auditoria-importacoes-${stamp.getFullYear()}${doisDigitos(stamp.getMonth() + 1)}${doisDigitos(stamp.getDate())}-${doisDigitos(stamp.getHours())}${doisDigitos(stamp.getMinutes())}.csv`
      a.download = nomeArquivo
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao exportar relatório.'))
    }
  }, [itens])

  const drawerRef = useRef<HTMLDialogElement | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const abrirDetalhe = useCallback(async (id: string, triggerRef?: HTMLButtonElement | null) => {
    if (triggerRef) drawerTriggerRef.current = triggerRef;
    setDetalheId(id);
    setDetalheCarregando(true);
    setDetalhe(null);
    try {
      const log = await obterLogImportacaoPorId(id);
      setDetalhe(log);
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao carregar detalhes da importação.'));
    } finally {
      setDetalheCarregando(false);
    }
  }, []);

  const fecharDetalhe = useCallback(() => {
    drawerRef.current?.close();
    setDetalheId(null);
    setDetalhe(null);
    setDetalheCarregando(false);
    window.requestAnimationFrame(() => {
      drawerTriggerRef.current?.focus();
      drawerTriggerRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (!detalheId) return;
    const dialog = drawerRef.current;
    if (!dialog) return;
    window.requestAnimationFrame(() => {
      dialog.showModal();
      const closeBtn = dialog.querySelector<HTMLButtonElement>('button[data-drawer-close]');
      if (closeBtn) closeBtn.focus();
    });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [detalheId]);

  const linhasMapeamento = useMemo(
    () => (detalhe ? montarLinhasMapeamento(detalhe) : []),
    [detalhe],
  )

  const showCustomDates = periodo === 'custom'

  const qtdExibida = itens.length

  let conteudoHistorico: ReactElement;
  if (carregando) {
    conteudoHistorico = (
      <div className="px-5 py-10 text-center text-sm text-gray-500">Carregando auditoria...</div>
    );
  } else if (itens.length === 0) {
    conteudoHistorico = (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        Nenhuma importação encontrada para os filtros informados.
      </div>
    );
  } else {
    const tabelaLinhas = itens.map((item) => {
      const badge = camposBadge(item)
      const classeStatus = CLASSES_BADGE_STATUS[item.status] || 'bg-gray-100 text-gray-700 ring-gray-200'
      const labelStatus = LABEL_STATUS_IMPORTCACAO[item.status] || item.status
      return (
        <tr key={item.id} className="hover:bg-gray-50/60">
          <td className="whitespace-nowrap px-5 py-3 text-gray-700 tabular-nums">
            {formatarDataHora(item.dataHora)}
          </td>
          <td className="whitespace-nowrap px-5 py-3 text-gray-700">
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">{item.usuario?.nome || '-'}</span>
              <span className="text-xs text-gray-500">{item.usuario?.role || ''}</span>
            </div>
          </td>
          <td className="px-5 py-3 text-gray-700">
            <div className="flex flex-col">
              <span className="max-w-[220px] truncate font-medium text-gray-900" title={item.arquivoOriginal}>
                {item.arquivoOriginal}
              </span>
              <span className="text-xs text-gray-500">
                {formatarBytes(item.tamanhoBytes)}
                {item.tipoArquivo ? ` · ${item.tipoArquivo}` : ''}
                {typeof item.duracaoMs === 'number' ? ` · ${formatarDuracao(item.duracaoMs)}` : ''}
              </span>
              {item.erroMotivo ? (
                <span className="mt-1 text-xs text-rose-600" title={item.erroMotivo}>
                  Motivo: {item.erroMotivo}
                </span>
              ) : null}
            </div>
          </td>
          <td className="px-5 py-3 text-gray-700">
            {item.equipamento ? (
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{item.equipamento.nome}</span>
                {item.equipamento.modelo ? (
                  <span className="text-xs text-gray-500">{item.equipamento.modelo}</span>
                ) : null}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="whitespace-nowrap px-5 py-3 text-gray-700 tabular-nums">
            {item.ipOrigem || <span className="text-gray-400">—</span>}
          </td>
          <td className="whitespace-nowrap px-5 py-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classeStatus}`}>
              {labelStatus}
            </span>
          </td>
          <td className="whitespace-nowrap px-5 py-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${badge.classe}`}
              title={`Campos importados / campos encontrados`}
            >
              {badge.texto}
            </span>
          </td>
          <td className="whitespace-nowrap px-5 py-3 text-right">
            <button
              type="button"
              onClick={(e) => abrirDetalhe(item.id, e.currentTarget)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              aria-label={`Ver detalhes da importação ${item.arquivoOriginal || item.id}`}
            >
              Ver detalhes
            </button>
          </td>
        </tr>
      )
    });
    const paginacao = totalPaginas > 1 ? (
      <div className="flex justify-end">
        <Pagination current={paginaAtual} totalPages={totalPaginas} onChange={trocarPagina} />
      </div>
    ) : null;
    conteudoHistorico = (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Data e hora
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Usuário
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Arquivo
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Equipamento
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  IP Origem
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Campos
                </th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {tabelaLinhas}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {qtdExibida} {qtdExibida === 1 ? 'registro exibido' : 'registros exibidos'}
            {totalRegistros > qtdExibida ? ` · de ${totalRegistros} no total` : ''}
          </p>
          <p className="hidden text-xs text-gray-400 sm:block" aria-hidden>
            Campos = <span className="tabular-nums">importados / encontrados</span>
          </p>
          {paginacao}
        </div>
      </>
    );
  }

  const resumoAnunciadoId = 'auditoria-resumo-anunciado';

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          <ol className="flex items-center gap-2">
            <li>Relatórios</li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-medium text-gray-700">Auditoria</li>
          </ol>
        </div>
      </nav>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Logs de importação</h1>
          <p className="mt-1 text-sm text-gray-500">
            Auditoria completa dos arquivos processados e dos equipamentos criados pelo importador.
          </p>
          <p id={resumoAnunciadoId} className="sr-only">
            {resumo
              ? `Total de ${resumo.totalImportacoes} importações, ${resumo.totalSucesso} com sucesso e ${resumo.totalErro} com erro. Hoje foram ${resumo.totalImportacoesHoje} importações.`
              : 'Carregando resumo de auditoria'}
          </p>
        </div>
        <button
          type="button"
          onClick={exportarCSV}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Exportar relatório
        </button>
      </div>

      {resumo ? (
        <section aria-labelledby="auditoria-kpis-titulo" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <h2 id="auditoria-kpis-titulo" className="sr-only">Indicadores rápidos</h2>
          <KpiCard
            titulo="Total de importações"
            valor={String(resumo.totalImportacoes)}
            subtitulo="Desde o início do uso"
            icon="importacoes"
          />
          <KpiCard
            titulo="Importações hoje"
            valor={String(resumo.totalImportacoesHoje)}
            subtitulo={formatarDataHoje()}
            icon="calendario"
          />
          <KpiCard
            titulo="Taxa de sucesso"
            valor={`${resumo.taxaSucessoPercentual.toFixed(1)}%`}
            subtitulo={`${resumo.totalSucesso} processadas com sucesso`}
            icon="sucesso"
          />
          <KpiCard
            titulo="Campos importados hoje"
            valor={String(resumo.camposImportadosHoje)}
            subtitulo={`De ${resumo.camposEncontradosHoje} campos encontrados`}
            icon="campos"
          />
          <KpiCard
            titulo="Tempo médio"
            valor={formatarDuracao(resumo.tempoMedioMs)}
            subtitulo="Por processamento"
            icon="tempo"
          />
          <KpiCard
            titulo="Equipamentos criados"
            valor={String(resumo.totalEquipamentosCriados)}
            subtitulo={`${resumo.totalErro} importações com erro`}
            icon="equipamentos"
          />
        </section>
      ) : null}

      <section aria-label="Filtros" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" strokeWidth={1.75} />
          Filtros
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="auditoria-busca" className="mb-1 block text-xs font-medium text-gray-600">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} aria-hidden />
              <input
                id="auditoria-busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') aplicarFiltros() }}
                placeholder="Arquivo, usuário, IP ou equipamento"
                aria-describedby="auditoria-busca-ajuda"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p id="auditoria-busca-ajuda" className="sr-only">
                Pressione Enter para aplicar os filtros após digitar.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="auditoria-periodo" className="mb-1 block text-xs font-medium text-gray-600">
              Período
            </label>
            <select
              id="auditoria-periodo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {OPCOES_PERIODO.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="auditoria-usuario" className="mb-1 block text-xs font-medium text-gray-600">
              Usuário
            </label>
            <select
              id="auditoria-usuario"
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              {usuariosParaSelect.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="auditoria-status" className="mb-1 block text-xs font-medium text-gray-600">
              Status
            </label>
            <select
              id="auditoria-status"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as '' | StatusImportacaoWinAudit)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {OPCOES_STATUS_FILTRO.map((op) => (
                <option key={op.value || 'todos'} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          {showCustomDates ? (
            <>
              <div>
                <label htmlFor="auditoria-data-inicio" className="mb-1 block text-xs font-medium text-gray-600">
                  Data inicial
                </label>
                <input
                  id="auditoria-data-inicio"
                  type="date"
                  value={dataInicioCustom}
                  onChange={(e) => setDataInicioCustom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="auditoria-data-fim" className="mb-1 block text-xs font-medium text-gray-600">
                  Data final
                </label>
                <input
                  id="auditoria-data-fim"
                  type="date"
                  value={dataFimCustom}
                  onChange={(e) => setDataFimCustom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={aplicarFiltros}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Filter className="h-4 w-4" strokeWidth={1.75} />
            Filtrar
          </button>
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={1.75} />
            Limpar filtros
          </button>
        </div>
      </section>

      <section aria-label="Histórico de importações" className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Histórico de importações</h2>
        </div>

        {erro ? (
          <div className="px-5 py-4">
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          </div>
        ) : null}

        {conteudoHistorico}
      </section>

      {detalheId ? (
        <dialog
          ref={drawerRef}
          className="m-0 border-0 p-0 bg-transparent max-w-none max-h-none w-screen h-screen fixed inset-0 z-50 backdrop:bg-black/40"
          aria-labelledby="auditoria-detalhe-titulo"
          onCancel={fecharDetalhe}
          onClose={fecharDetalhe}
        >
          <div className="relative w-full h-full flex justify-end">
            <button
              type="button"
              aria-label="Fechar detalhes da importação"
              onClick={fecharDetalhe}
              tabIndex={-1}
              className="absolute inset-0 m-0 border-0 p-0 bg-transparent cursor-default"
            />
          <aside
            className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
            tabIndex={-1}
          >
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Auditoria</p>
                <h2 id="auditoria-detalhe-titulo" className="mt-1 text-lg font-semibold text-gray-900">
                  Detalhes da importação
                </h2>
              </div>
              <button
                type="button"
                data-drawer-close
                onClick={fecharDetalhe}
                className="inline-flex items-center rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar detalhes"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detalheCarregando && (
                <div className="py-10 text-center text-sm text-gray-500">Carregando detalhes...</div>
              )}
              {!detalheCarregando && !detalhe && (
                <div className="py-10 text-center text-sm text-gray-500">Não foi possível carregar os detalhes.</div>
              )}
              {!detalheCarregando && detalhe && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-800">Informações da importação</h3>
                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Usuário responsável</dt>
                          <dd className="text-right font-medium text-gray-800">{detalhe.usuario?.nome || '-'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Data e hora</dt>
                          <dd className="text-right font-medium text-gray-800 tabular-nums">{formatarDataHora(detalhe.dataHora)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Arquivo original</dt>
                          <dd className="max-w-[55%] truncate text-right font-medium text-gray-800" title={detalhe.arquivoOriginal}>
                            {detalhe.arquivoOriginal}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-gray-500">Status</dt>
                          <dd className="text-right">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CLASSES_BADGE_STATUS[detalhe.status] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                              {LABEL_STATUS_IMPORTCACAO[detalhe.status] || detalhe.status}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Equipamento criado</dt>
                          <dd className="max-w-[55%] truncate text-right font-medium text-gray-800">
                            {detalhe.equipamento?.nome || '—'}
                          </dd>
                        </div>
                        {detalhe.escola?.nome ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-gray-500">Escola</dt>
                            <dd className="text-right font-medium text-gray-800">{detalhe.escola.nome}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-800">Dados técnicos do arquivo</h3>
                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">IP da origem</dt>
                          <dd className="text-right font-medium text-gray-800 tabular-nums">{detalhe.ipOrigem || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Tipo do arquivo</dt>
                          <dd className="text-right font-medium text-gray-800">{detalhe.tipoArquivo || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Tamanho do arquivo</dt>
                          <dd className="text-right font-medium text-gray-800 tabular-nums">{formatarBytes(detalhe.tamanhoBytes)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Versão do importador</dt>
                          <dd className="text-right font-medium text-gray-800 tabular-nums">{detalhe.versaoImportador || '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:col-span-2">
                      <h3 className="mb-3 text-sm font-semibold text-gray-800">Resultado do processamento</h3>
                      <dl className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2 md:grid-cols-4">
                        <div className="flex justify-between gap-4 sm:block md:flex">
                          <dt className="text-gray-500">Campos encontrados</dt>
                          <dd className="font-semibold text-gray-800 tabular-nums">{detalhe.qtdCamposEncontrados ?? '-'}</dd>
                        </div>
                        <div className="flex justify-between gap-4 sm:block md:flex">
                          <dt className="text-gray-500">Campos importados</dt>
                          <dd className="font-semibold text-gray-800 tabular-nums">{detalhe.qtdCamposImportados ?? '-'}</dd>
                        </div>
                        <div className="flex justify-between gap-4 sm:block md:flex">
                          <dt className="text-gray-500">Duração</dt>
                          <dd className="font-semibold text-gray-800 tabular-nums">{formatarDuracao(detalhe.duracaoMs)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 sm:block md:flex">
                          <dt className="text-gray-500">Equipamento criado</dt>
                          <dd className="font-semibold text-gray-800">{detalhe.equipamento ? 'Sim' : '—'}</dd>
                        </div>
                      </dl>
                      {detalhe.erroMotivo ? (
                        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Motivo do erro</p>
                          <p className="mt-1 text-sm text-rose-700">{detalhe.erroMotivo}</p>
                        </div>
                      ) : null}
                      {detalhe.erros && Array.isArray(detalhe.erros) && detalhe.erros.length > 0 ? (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Erros coletados</p>
                          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-amber-800">
                            {detalhe.erros.map((err, idx) => (
                              <li key={`${String(err).slice(0, 40)}-${idx}`}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">Dados associados</h3>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Campo do arquivo
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Campo do sistema
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Valor importado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {linhasMapeamento.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                                Nenhum dado bruto associado a esta importação.
                              </td>
                            </tr>
                          ) : (
                            linhasMapeamento.map((linha) => (
                              <tr key={linha.campoSistema} className="hover:bg-gray-50/60">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{linha.campoArquivo}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{linha.campoSistema}</td>
                                <td className="px-4 py-3 text-gray-800">
                                  <span className="max-w-[380px] inline-block truncate align-bottom" title={linha.valorImportado}>
                                    {linha.valorImportado}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                data-drawer-close
                onClick={fecharDetalhe}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Fechar detalhes
              </button>
            </footer>
          </aside>
          </div>
        </dialog>
      ) : null}
    </div>
  )
}
