import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { ReactElement } from 'react'
import { Plus, Pencil, Trash2, Save, RotateCcw, AlertTriangle, Barcode, FileUp, CheckCircle, XCircle, Info } from 'lucide-react'
import Pagination from '../components/Pagination'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast, showConfirmToast } from '../utils/toast'
import { getValidityYears } from '../services/settings'
import { useAppStore } from '../store/useAppStore'
import EquipmentIdCard from '../components/EquipmentIdCard'
import {
  gerarPreviewWinAudit,
  confirmarImportacaoWinAudit,
} from '../services/importarWinAudit'
import type {
  WinAuditPreviewResponse,
  StatusCampoWinAudit,
  WinAuditDuplicidadeEntry,
  WinAuditMapeamentoWizard,
} from '../types/winaudit'

// Formata Data: YYYY-MM-DDTHH:mm:ss.sssZ -> DD/MM/YYYY
function formatData(isoStr: string | undefined): string {
  if (!isoStr) return '-'
  return isoStr.split('T')[0].split('-').reverse().join('/')
}

function isExpired(isoStr: string | undefined): boolean {
  if (!isoStr) return false
  const dt = new Date(isoStr)
  if (Number.isNaN(dt.getTime())) return false
  
  const validityYears = getValidityYears()
  const limitDate = new Date(dt)
  limitDate.setFullYear(limitDate.getFullYear() + validityYears)
  
  // Comparar com a data atual
  return new Date() > limitDate
}

// Formata MAC: mantém apenas hex, agrupa em pares e insere ':'
function formatMac(raw: string): string {
  const hex = raw.replaceAll(/[^0-9a-fA-F]/g, '').toUpperCase()
  const pairs = hex.match(/.{1,2}/g) || []
  return pairs.join(':').slice(0, 17)
}

function isValidDateStr(input: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === mo && dt.getUTCDate() === d
}

type Equipamento = {
  id: string
  nome?: string
  nomeEquipamento?: string
  patrimonio?: string
  usuarioNome?: string
  tipo?: string
  modelo?: string
  serial?: string
  status?: string
  localizacao?: string
  fabricante?: string
  dataAquisicao?: string
  processador?: string
  memoria?: string
  observacoes?: string
  macaddress?: string
  escolaId?: string
  escola?: { nome?: string; sigla?: string }
}

type Escola = { id: string; nome: string; sigla?: string }

type WinAuditFluxo = 'idle' | 'uploading' | 'review' | 'wizard'

type TipoFrontend =
  | 'COMPUTADOR'
  | 'NOTEBOOK'
  | 'IMPRESSORA'
  | 'PROJETOR'
  | 'TABLET'
  | 'MONITOR'
  | 'ROTEADOR'
  | 'SWITCH'
  | 'OUTRO'

const TIPOS_EXATOS: Readonly<Record<string, TipoFrontend>> = {
  NOTEBOOK: 'NOTEBOOK',
  LAPTOP: 'NOTEBOOK',
  TABLET: 'TABLET',
  MONITOR: 'MONITOR',
  IMPRESSORA: 'IMPRESSORA',
  PROJETOR: 'PROJETOR',
  SWITCH: 'SWITCH',
  ROTEADOR: 'ROTEADOR',
  ROUTER: 'ROTEADOR',
  DESKTOP: 'COMPUTADOR',
  SERVIDOR: 'COMPUTADOR',
  COMPUTADOR: 'COMPUTADOR',
  PC: 'COMPUTADOR',
  REDE: 'OUTRO',
} as const

const TIPOS_PARCIAIS: ReadonlyArray<readonly [readonly string[], TipoFrontend]> = [
  [['SWITCH'], 'SWITCH'],
  [['ROUTE', 'ROTEAD'], 'ROTEADOR'],
  [['IMPRESS', 'PRINTER'], 'IMPRESSORA'],
  [['PROJET', 'PROJECTOR'], 'PROJETOR'],
  [['NOTE', 'LAPTOP'], 'NOTEBOOK'],
  [['DESK', 'SERVID', 'COMPUT'], 'COMPUTADOR'],
  [['MONIT', 'DISPLAY', 'TELA'], 'MONITOR'],
  [['TABLET'], 'TABLET'],
] as const

function mapearTipoBackendParaFrontend(raw: string): TipoFrontend {
  const up = String(raw || '').toUpperCase().trim()
  if (!up) return 'OUTRO'
  if (up in TIPOS_EXATOS) return TIPOS_EXATOS[up]
  for (const [padroes, tipo] of TIPOS_PARCIAIS) {
    if (padroes.some((p) => up.includes(p))) return tipo
  }
  return 'OUTRO'
}

const STATUS_CAMPO_LABEL: Readonly<Record<StatusCampoWinAudit, { label: string; classe: string; classeBg: string; classeTexto: string }>> = {
  ENCONTRADO: {
    label: 'Encontrado',
    classe: 'border-green-200 text-green-700 bg-green-50',
    classeBg: 'bg-green-600',
    classeTexto: 'text-green-700',
  },
  NAO_ENCONTRADO: {
    label: 'Não encontrado',
    classe: 'border-gray-200 text-gray-600 bg-gray-50',
    classeBg: 'bg-gray-400',
    classeTexto: 'text-gray-600',
  },
  INVALIDO: {
    label: 'Inválido',
    classe: 'border-red-200 text-red-700 bg-red-50',
    classeBg: 'bg-red-500',
    classeTexto: 'text-red-700',
  },
  POSSIVEL_DUPLICIDADE: {
    label: 'Possível duplicidade',
    classe: 'border-amber-200 text-amber-800 bg-amber-50',
    classeBg: 'bg-amber-500',
    classeTexto: 'text-amber-700',
  },
} as const

const ICONE_POR_STATUS_CAMPO: Readonly<Record<StatusCampoWinAudit, ReactElement>> = {
  ENCONTRADO: <CheckCircle size={12} />,
  NAO_ENCONTRADO: <XCircle size={12} />,
  INVALIDO: <AlertTriangle size={12} />,
  POSSIVEL_DUPLICIDADE: <Info size={12} />,
}

const ICONE_TAMANHO_14_POR_STATUS: Readonly<Record<StatusCampoWinAudit, ReactElement>> = {
  ENCONTRADO: <CheckCircle size={14} />,
  NAO_ENCONTRADO: <XCircle size={14} />,
  INVALIDO: <AlertTriangle size={14} />,
  POSSIVEL_DUPLICIDADE: <Info size={14} />,
}

type WizardStep = 1 | 2 | 3;
const LARGURA_BARRA_PROGRESSO_WIZARD: Readonly<Record<WizardStep, `${number}%`>> = {
  1: '10%',
  2: '45%',
  3: '100%',
}

const PORCENTAGEM_POR_STEP: Readonly<Record<1 | 2 | 3, number>> = {
  1: 10,
  2: 45,
  3: 100,
}

const LABEL_BOTAO_SUBMIT_POR_FLUXO: Readonly<Record<WinAuditFluxo, string>> = {
  idle: 'Salvar',
  uploading: 'Salvar',
  wizard: 'OK, carregar dados',
  review: 'Confirmar e cadastrar (WinAudit)',
}

function mergeEscolaIntoEquipamento(e: Equipamento, escolas: Escola[]): Equipamento {
  if (!e.escola && e.escolaId) {
    const esc = escolas.find((s) => s.id === e.escolaId)
    return esc ? { ...e, escola: { nome: esc.nome, sigla: esc.sigla } } : e
  }
  return e
}

function filterEquipamento(e: Equipamento, texto: string, status: string): boolean {
  const nome = (e.nome || e.nomeEquipamento || '').toLowerCase()
  const matchesText = texto ? (
    nome.includes(texto) ||
    (e.usuarioNome || '').toLowerCase().includes(texto) ||
    (e.escola?.nome || '').toLowerCase().includes(texto) ||
    (e.escola?.sigla || '').toLowerCase().includes(texto)
  ) : true
  const matchesStatus = status === 'ALL' ? true : (e.status || '') === status
  return matchesText && matchesStatus
}

function EquipamentoRow({ item, onEdit, onDelete, onViewIdCard }: { readonly item: Equipamento, readonly onEdit: (e: Equipamento) => void, readonly onDelete: (id: string) => void, readonly onViewIdCard: (e: Equipamento) => void }) {
  const expired = isExpired(item.dataAquisicao)
  const equipName = item.nome || item.nomeEquipamento || 'equipamento'
  return (
    <tr key={item.id}>
      <td className="border px-3 py-2 text-center">{equipName === 'equipamento' ? '-' : equipName}</td>
      <td className="border px-3 py-2 text-center">{item.usuarioNome || '-'}</td>
      <td className="border px-3 py-2 text-center">{item.status || '-'}</td>
      <td className="border px-3 py-2 text-center">
        <div className={`flex items-center justify-center gap-1 ${expired ? 'text-red-600 font-bold' : ''}`}>
          {formatData(item.dataAquisicao)}
          {expired && (
            <span aria-label="Validade da aquisição vencida">
              <AlertTriangle size={16} aria-hidden />
            </span>
          )}
        </div>
      </td>
      <td className="border px-3 py-2 text-center">{item.escola?.nome || '-'}</td>
      <td className="border px-3 py-2 text-center">
        <div className="flex justify-center gap-2">
          <button type="button" className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 flex items-center gap-1" onClick={() => onViewIdCard(item)} aria-label={`Visualizar cartão de identificação do equipamento ${equipName}`}>
            <Barcode size={16} aria-hidden />
            <span>Identificação</span>
          </button>
          <button type="button" className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => onEdit(item)} aria-label={`Editar dados do equipamento ${equipName}`}>
            <Pencil size={16} aria-hidden />
            <span>Editar</span>
          </button>
          <button type="button" className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => onDelete(item.id)} aria-label={`Excluir o equipamento ${equipName}`}>
            <Trash2 size={16} aria-hidden />
            <span>Excluir</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

function EquipamentoCard({ item, onEdit, onDelete, onViewIdCard }: { readonly item: Equipamento, readonly onEdit: (e: Equipamento) => void, readonly onDelete: (id: string) => void, readonly onViewIdCard: (e: Equipamento) => void }) {
  const equipName = item.nome || item.nomeEquipamento || 'equipamento'
  const expired = isExpired(item.dataAquisicao)
  return (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">{equipName === 'equipamento' ? '-' : equipName}</h3>
          <p className="text-xs text-gray-500">{item.status || '-'}</p>
          <p className={`text-xs ${expired ? 'text-red-600 font-bold flex items-center gap-1' : 'text-gray-500'}`}>
            Aquisição: {formatData(item.dataAquisicao)}
            {expired && <AlertTriangle size={12} aria-label="Validade da aquisição vencida" aria-hidden />}
          </p>
          <p className="text-xs text-gray-500">Usuário: {item.usuarioNome || '-'}</p>
        </div>
        <span className="text-xs text-gray-500">{item.escola?.nome || '-'}</span>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" className="flex-1 rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-700 flex items-center justify-center gap-1" onClick={() => onViewIdCard(item)} aria-label={`Visualizar cartão de identificação do equipamento ${equipName}`}>
          <Barcode size={14} aria-hidden />
          <span>Identificação</span>
        </button>
        <button type="button" className="flex-1 rounded bg-yellow-600 px-2 py-1 text-white text-xs hover:bg-yellow-700 flex items-center justify-center gap-1" onClick={() => onEdit(item)} aria-label={`Editar dados do equipamento ${equipName}`}>
          <Pencil size={14} aria-hidden />
          <span>Editar</span>
        </button>
        <button type="button" className="flex-1 rounded bg-red-600 px-2 py-1 text-white text-xs hover:bg-red-700 flex items-center justify-center gap-1" onClick={() => onDelete(item.id)} aria-label={`Excluir o equipamento ${equipName}`}>
          <Trash2 size={14} aria-hidden />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  )
}

type ErroApiData = {
  readonly error?: string
  readonly message?: string
  readonly code?: string
  readonly statusCode?: number
  readonly requestId?: string
}

type ErroApiShape = {
  readonly response?: {
    readonly data?: ErroApiData
    readonly status?: number
    readonly statusText?: string
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

export default function EquipamentosPage() {
  const [lista, setLista] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Filtros e paginação
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const buscarInputRef = useRef<HTMLInputElement | null>(null)

  const [nome, setNome] = useState('')
  const [patrimonio, setPatrimonio] = useState('')
  const [usuarioNome, setUsuarioNome] = useState('')
  const [tipo, setTipo] = useState('OUTRO')
  const [modelo, setModelo] = useState('')
  const [serial, setSerial] = useState('')
  const [dataAquisicao, setDataAquisicao] = useState<string>('')
  const [localizacao, setLocalizacao] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [processador, setProcessador] = useState('')
  const [memoria, setMemoria] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [macAddress, setMacAddress] = useState('')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [status, setStatus] = useState<string>('DISPONIVEL')
  const nomeInputRef = useRef<HTMLInputElement | null>(null)

  // Fluxo de importação WinAudit
  const [winauditFluxo, setWinauditFluxo] = useState<WinAuditFluxo>('idle')
  const [winauditFile, setWinauditFile] = useState<File | null>(null)
  const [winauditPreview, setWinauditPreview] = useState<WinAuditPreviewResponse | null>(null)
  const [winauditConfirming, setWinauditConfirming] = useState(false)
  const [winauditIgnorarDuplicidade, setWinauditIgnorarDuplicidade] = useState(false)
  const [winauditWizardStep, setWinauditWizardStep] = useState<1 | 2 | 3>(1)
  const winauditWizardTimerRef = useRef<number | null>(null)
  const winauditFileRef = useRef<HTMLInputElement | null>(null)
  const userRole = (localStorage.getItem('userRole') as 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO') || 'USUARIO'

  const keyOfMapeamento = (row: WinAuditMapeamentoWizard, idx: number) => {
    const base = `${row.campoRelatorio}|${row.campoCadastro}|${row.valorEncontrado}`
    let h = 0
    for (let k = 0; k < base.length; k++) h = (h * 31 + (base.codePointAt(k) ?? 0)) >>> 0
    return `${h.toString(36)}-${idx}`
  }

  const badgeStatusCampo = (status: StatusCampoWinAudit) => {
    const info = STATUS_CAMPO_LABEL[status] ?? STATUS_CAMPO_LABEL.NAO_ENCONTRADO
    const icone = ICONE_POR_STATUS_CAMPO[status] ?? ICONE_POR_STATUS_CAMPO.NAO_ENCONTRADO
    return (
      <span className={`mr-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${info.classe}`}>
        {icone}
        <span>{info.label}</span>
      </span>
    )
  }

  const fallbackMapeamentos = (preview: WinAuditPreviewResponse): readonly WinAuditMapeamentoWizard[] => {
    const p = preview.dados
    const rows: WinAuditMapeamentoWizard[] = [
      { campoRelatorio: 'Computer Name', campoCadastro: 'Nome', valorEncontrado: p.nome, status: preview.camposStatus.nome || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'User Account', campoCadastro: 'Nome do usuário', valorEncontrado: p.usuarioNome, status: preview.camposStatus.usuarioNome || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Manufacturer + Model', campoCadastro: 'Modelo', valorEncontrado: p.modelo, status: preview.camposStatus.modelo || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Serial Number', campoCadastro: 'Serial', valorEncontrado: p.serial, status: preview.camposStatus.serial || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Mac Address', campoCadastro: 'MAC Address', valorEncontrado: p.macPrincipal, status: preview.camposStatus.macaddress || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Manufacturer', campoCadastro: 'Fabricante', valorEncontrado: p.fabricante, status: preview.camposStatus.fabricante || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Processor Description', campoCadastro: 'Processador', valorEncontrado: p.processador, status: preview.camposStatus.processador || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Total Memory', campoCadastro: 'Memória', valorEncontrado: p.memoriaFormatada || p.memoria, status: preview.camposStatus.memoria || 'NAO_ENCONTRADO' },
      { campoRelatorio: 'Release Date', campoCadastro: 'Data de Aquisição', valorEncontrado: p.dataAquisicaoFormatada || p.dataAquisicao, status: preview.camposStatus.dataAquisicao || 'NAO_ENCONTRADO' },
    ]
    return rows.filter((r) => typeof r.valorEncontrado === 'string' && r.valorEncontrado.trim().length > 0)
  }

  const clearWinauditState = () => {
    if (winauditWizardTimerRef.current) {
      window.clearTimeout(winauditWizardTimerRef.current)
      winauditWizardTimerRef.current = null
    }
    setWinauditFluxo('idle')
    setWinauditFile(null)
    setWinauditPreview(null)
    setWinauditConfirming(false)
    setWinauditIgnorarDuplicidade(false)
    setWinauditWizardStep(1)
    if (winauditFileRef.current) {
      winauditFileRef.current.value = ''
    }
  }

  const adminOverrideDuplicidadeSerial = () => {
    if (winauditPreview?.bloqueioSerial) {
      if (!winauditIgnorarDuplicidade) return false
    }
    return true
  }

  const preencherFormularioComPreview = (preview: WinAuditPreviewResponse) => {
    const d = preview.dados
    if (d.nome) setNome(d.nome)
    if (d.usuarioNome) setUsuarioNome(d.usuarioNome)
    if (d.fabricante) setFabricante(d.fabricante.toUpperCase())
    if (d.modelo) setModelo(d.modelo.toUpperCase())
    if (d.serial) setSerial(d.serial.toUpperCase())
    if (d.macPrincipal) setMacAddress(formatMac(d.macPrincipal))
    if (d.processador) setProcessador(d.processador.toUpperCase())
    if (d.memoria) setMemoria(d.memoria.toUpperCase())
    if (d.dataAquisicao) setDataAquisicao(d.dataAquisicao)
    if (d.tipoSugerido && (!tipo || tipo === 'OUTRO')) {
      const tipoMapeado = mapearTipoBackendParaFrontend(d.tipoSugerido)
      setTipo(tipoMapeado)
    }
    if (d.escolaId && !escolaId) setEscolaId(d.escolaId)
  }

  const onWinauditFilePick = async (file: File | null) => {
    setWinauditFile(file)
    if (!file) {
      return
    }
    const maxMb = 5
    if (file.size > maxMb * 1024 * 1024) {
      showWarningToast(`Arquivo muito grande. O tamanho máximo é ${maxMb} MB.`)
      setWinauditFile(null)
      if (winauditFileRef.current) winauditFileRef.current.value = ''
      return
    }
    const extOk = /\.(html|htm)$/i.test(file.name)
    if (!extOk) {
      showWarningToast('Selecione um arquivo .html ou .htm gerado pelo WinAudit.')
      setWinauditFile(null)
      if (winauditFileRef.current) winauditFileRef.current.value = ''
      return
    }

    try {
      setWinauditFluxo('uploading')
      setWinauditWizardStep(1)
      const previewPromise = gerarPreviewWinAudit(file, escolaId || null)

      if (winauditWizardTimerRef.current) {
        window.clearTimeout(winauditWizardTimerRef.current)
      }
      winauditWizardTimerRef.current = window.setTimeout(() => setWinauditWizardStep(2), 900)
      const w = winauditWizardTimerRef.current
      window.setTimeout(() => {
        if (winauditWizardTimerRef.current === w) setWinauditWizardStep(3)
      }, 1700)

      const preview = await previewPromise
      setWinauditPreview(preview)
      setWinauditIgnorarDuplicidade(false)
      setWinauditWizardStep(3)
      setWinauditFluxo('wizard')
      if (preview.avisos && preview.avisos.length > 0) {
        preview.avisos.slice(0, 3).forEach((msg) => showWarningToast(msg))
      }
      if (preview.possivelDuplicidade) {
        showWarningToast('Possível equipamento já cadastrado detectado. Verifique a conferência antes de continuar.')
      }
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao importar relatório WinAudit.'))
      clearWinauditState()
    }
  }

  const montarPayloadConfirmacao = (): Record<string, unknown> => {
    const macFmt = formatMac(macAddress)
    return {
      nome,
      patrimonio: patrimonio || undefined,
      usuarioNome: usuarioNome || undefined,
      tipo,
      modelo,
      serial,
      dataAquisicao: dataAquisicao ? new Date(dataAquisicao).toISOString() : undefined,
      localizacao: localizacao || undefined,
      fabricante: fabricante || undefined,
      processador: processador || undefined,
      memoria: memoria || undefined,
      observacoes: observacoes || undefined,
      macaddress: macFmt || undefined,
      escolaId: escolaId || undefined,
      status,
    }
  }

  const confirmarImportacao = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!winauditPreview) {
      showWarningToast('Pré-visualização não disponível. Importe um arquivo primeiro.')
      return
    }
    if (winauditFluxo === 'wizard') {
      preencherFormularioComPreview(winauditPreview)
      setWinauditFluxo('review')
      showInfoToast('Dados carregados. Revise e corrija as informações antes de confirmar.')
      window.setTimeout(() => nomeInputRef.current?.focus(), 50)
      return
    }
    if (!nome.trim() || !modelo.trim() || !serial.trim() || !dataAquisicao || !usuarioNome.trim()) {
      showWarningToast('Preencha Nome, Modelo, Serial, Data de Aquisição e Nome do Usuário')
      return
    }
    if (!isValidDateStr(dataAquisicao)) {
      showWarningToast('Data de Aquisição inválida')
      return
    }
    if (!adminOverrideDuplicidadeSerial()) {
      showWarningToast('Foi detectado um equipamento ativo com o mesmo número de série. Confirme a caixa de override para prosseguir.')
      return
    }
    try {
      setWinauditConfirming(true)
      const payload = montarPayloadConfirmacao()
      const resp = await confirmarImportacaoWinAudit({
        previewId: winauditPreview.previewId,
        equipamento: payload,
        macSelecionado: formatMac(macAddress) || undefined,
        ignorarDuplicidade: winauditIgnorarDuplicidade,
      })
      const equip = resp.equipamento as { nome?: string; id?: string | null } | null | undefined
      let mensagemNome = 'sucesso'
      if (equip?.nome) {
        mensagemNome = String(equip.nome)
      } else if (equip?.id) {
        mensagemNome = `ID ${String(equip.id)}`
      }
      showSuccessToast(`Equipamento criado: ${mensagemNome}`)
      clearWinauditState()
      clearCreateForm()
      setShowCreate(false)
      await carregar()
    } catch (e: unknown) {
      const dadosErr = (e as { response?: { data?: { error?: string; message?: string; duplicidades?: readonly WinAuditDuplicidadeEntry[] } } })?.response?.data
      if (dadosErr?.duplicidades && dadosErr.duplicidades.length > 0) {
        showWarningToast('Duplicidade detectada; veja a lista abaixo do formulário.')
      }
      showErrorToast(formatarMensagemErro(e, 'Falha ao confirmar importação.'))
    } finally {
      setWinauditConfirming(false)
    }
  }

  const cancelarReviewWinAudit = () => {
    clearWinauditState()
  }

  // Visualização de Comprovante (ID Card)
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null)

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPatrimonio, setEditPatrimonio] = useState('')
  const [editUsuarioNome, setEditUsuarioNome] = useState('')
  const [editTipo, setEditTipo] = useState('OUTRO')
  const [editModelo, setEditModelo] = useState('')
  const [editSerial, setEditSerial] = useState('')
  const [editDataAquisicao, setEditDataAquisicao] = useState<string>('')
  const [editLocalizacao, setEditLocalizacao] = useState('')
  const [editFabricante, setEditFabricante] = useState('')
  const [editProcessador, setEditProcessador] = useState('')
  const [editMemoria, setEditMemoria] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [editMacAddress, setEditMacAddress] = useState('')
  const [editEscolaId, setEditEscolaId] = useState('')
  const [editStatus, setEditStatus] = useState<string>('DISPONIVEL')
  const editNomeInputRef = useRef<HTMLInputElement | null>(null)

  function clearCreateForm() {
    setNome('')
    setPatrimonio('')
    setUsuarioNome('')
    setTipo('OUTRO')
    setModelo('')
    setSerial('')
    setDataAquisicao('')
    setLocalizacao('')
    setFabricante('')
    setProcessador('')
    setMemoria('')
    setObservacoes('')
    setMacAddress('')
    setEscolaId('')
    setStatus('DISPONIVEL')
    clearWinauditState()
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await api.get('/api/equipamentos')
      const data: Equipamento[] = resp.data || []
      setLista(data)
      setCurrentPage(1)
    } catch (e: unknown) {
      setError(formatarMensagemErro(e, 'Erro ao carregar equipamentos'))
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarEscolas = useCallback(async () => {
    try {
      const resp = await api.get('/api/escolas')
      setEscolas(resp.data || [])
    } catch {
      // silencioso; formulário ainda funciona sem escolas
    }
  }, [])

  async function criarEquipamento(ev: React.FormEvent) {
    ev.preventDefault()
    if (!nome.trim() || !modelo.trim() || !serial.trim() || !dataAquisicao || !usuarioNome.trim()) {
      showWarningToast('Preencha Nome, Modelo, Serial, Data de Aquisição e Nome do Usuário')
      return
    }
    if (!isValidDateStr(dataAquisicao)) {
      showWarningToast('Data de Aquisição inválida')
      return
    }
    try {
      const macFmt = formatMac(macAddress)
      const payload: Record<string, unknown> = {
        nome,
        patrimonio: patrimonio || undefined,
        usuarioNome: usuarioNome || undefined,
        tipo,
        modelo,
        serial,
        dataAquisicao: new Date(dataAquisicao).toISOString(),
        localizacao: localizacao || undefined,
        fabricante: fabricante || undefined,
        processador: processador || undefined,
        memoria: memoria || undefined,
        observacoes: observacoes || undefined,
        macaddress: macFmt || undefined,
        escolaId: escolaId || undefined,
        status,
      }
      await api.post('/api/equipamentos', payload)
      showSuccessToast('Equipamento criado')
      clearCreateForm()
      await carregar()
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao criar equipamento'))
    }
  }

  function startEdit(e: Equipamento) {
    setEditingId(e.id)
    setEditNome(e.nome || e.nomeEquipamento || '')
    setEditPatrimonio(e.patrimonio || '')
    setEditUsuarioNome(e.usuarioNome || '')
    setEditTipo(e.tipo || 'OUTRO')
    setEditModelo(e.modelo || '')
    setEditSerial(e.serial || '')
    setEditDataAquisicao(e.dataAquisicao ? new Date(e.dataAquisicao).toISOString().split('T')[0] : '')
    setEditLocalizacao(e.localizacao || '')
    setEditFabricante(e.fabricante || '')
    setEditProcessador(e.processador || '')
    setEditMemoria(e.memoria || '')
    setEditObservacoes(e.observacoes || '')
    setEditMacAddress(e.macaddress || '')
    setEditEscolaId(e.escolaId || '')
    setEditStatus(e.status || 'DISPONIVEL')
    showInfoToast('Editando equipamento')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNome('')
    setEditPatrimonio('')
    setEditTipo('OUTRO')
    setEditModelo('')
    setEditSerial('')
    setEditDataAquisicao('')
    setEditLocalizacao('')
    setEditFabricante('')
    setEditProcessador('')
    setEditMemoria('')
    setEditObservacoes('')
    setEditMacAddress('')
  }

  async function salvarEdicao(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editingId) return
    if (!editNome.trim()) {
      showWarningToast('Preencha Nome')
      return
    }
    if (editDataAquisicao && !isValidDateStr(editDataAquisicao)) {
      showWarningToast('Data de Aquisição inválida')
      return
    }
    try {
      const macFmt = formatMac(editMacAddress)
      const payload: Record<string, unknown> = {
        nome: editNome,
        patrimonio: editPatrimonio || undefined,
        usuarioNome: editUsuarioNome || undefined,
        tipo: editTipo,
        modelo: editModelo || undefined,
        serial: editSerial || undefined,
        dataAquisicao: editDataAquisicao ? new Date(editDataAquisicao).toISOString() : undefined,
        localizacao: editLocalizacao || undefined,
        fabricante: editFabricante || undefined,
        processador: editProcessador || undefined,
        memoria: editMemoria || undefined,
        observacoes: editObservacoes || undefined,
        macaddress: macFmt || undefined,
        status: editStatus || undefined,
        escolaId: editEscolaId || undefined,
      }
      await api.put(`/api/equipamentos/${editingId}`, payload)
      showSuccessToast('Equipamento atualizado')
      await carregar()
      cancelEdit()
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao atualizar equipamento'))
    }
  }

  async function excluirEquipamento(id: string) {
    try {
      await api.delete(`/api/equipamentos/${id}`)
      showSuccessToast('Equipamento excluído')
      setLista((prev) => prev.filter((e) => e.id !== id))
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao excluir equipamento'))
    }
  }

  function confirmarExclusao(id: string) {
    showConfirmToast('Tem certeza que deseja excluir este equipamento?', () => excluirEquipamento(id))
  }

  const setExpiredCount = useAppStore((state) => state.setExpiredCount)
  const setMaintenanceCount = useAppStore((state) => state.setMaintenanceCount)
  const setDiscardedCount = useAppStore((state) => state.setDiscardedCount)

  // Dados filtrados e paginados
  const filtrada = useMemo(() => {
    const texto = filterText.toLowerCase()
    return lista.filter((e) => filterEquipamento(e, texto, filterStatus))
  }, [lista, filterText, filterStatus])

  useEffect(() => {
    const count = filtrada.filter(e => isExpired(e.dataAquisicao)).length
    setExpiredCount(count)
    const maintCount = filtrada.filter(e => e.status === 'EM_MANUTENCAO').length
    setMaintenanceCount(maintCount)
    const discCount = filtrada.filter(e => e.status === 'DESCARTADO').length
    setDiscardedCount(discCount)
  }, [filtrada, setExpiredCount, setMaintenanceCount, setDiscardedCount])
  const ordenada = filtrada.slice().sort((a, b) => {
    const an = (a.escola?.nome || '').toUpperCase()
    const bn = (b.escola?.nome || '').toUpperCase()
    const bySchool = an.localeCompare(bn)
    if (bySchool !== 0) return bySchool
    const ae = (a.nome || a.nomeEquipamento || '').toUpperCase()
    const be = (b.nome || b.nomeEquipamento || '').toUpperCase()
    return ae.localeCompare(be)
  })
  const totalPages = Math.max(1, Math.ceil(filtrada.length / pageSize))
  const current = Math.min(currentPage, totalPages)
  const startIdx = (current - 1) * pageSize
  const pagina = ordenada.slice(startIdx, startIdx + pageSize)

  useEffect(() => {
    carregarEscolas()
    carregar()
  }, [carregar, carregarEscolas])

  useEffect(() => {
    if (!escolas.length) return
    setLista((prev) => prev.map((e) => mergeEscolaIntoEquipamento(e, escolas)))
  }, [escolas])

  useEffect(() => {
    if (showCreate) {
      setTimeout(() => nomeInputRef.current?.focus(), 0)
    }
  }, [showCreate])

  useEffect(() => {
    if (editingId) {
      setTimeout(() => editNomeInputRef.current?.focus(), 0)
    }
  }, [editingId])

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Equipamentos</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-sm text-gray-500">Carregando...</span>}
            {!showCreate && (
              <button type="button" aria-label="Criar novo equipamento" className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} aria-hidden="true" />
                <span>Criar equipamento</span>
              </button>
            )}
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Filtrar por nome, usuário ou sigla</label>
            <input id="filterText" ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} placeholder="Digite nome do equipamento, usuário, escola ou sigla" />
          </div>
          <div>
            <label htmlFor="filterStatus" className="mb-1 block text-sm font-medium">Status</label>
            <select id="filterStatus" className="w-full rounded border px-3 py-2" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              {['ALL','DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'Todos' : s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pageSize" className="mb-1 block text-sm font-medium">Itens por página</label>
            <select id="pageSize" className="w-full rounded border px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {/* Tabela para desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-center">Nome</th>
                <th className="border px-3 py-2 text-center">Nome do Usuário</th>
                <th className="border px-3 py-2 text-center">Status</th>
                <th className="border px-3 py-2 text-center">Data Aquisição</th>
                <th className="border px-3 py-2 text-center">Escola</th>
                <th className="border px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((e) => (
                <EquipamentoRow key={e.id} item={e} onEdit={startEdit} onDelete={confirmarExclusao} onViewIdCard={setSelectedEquipamento} />
              ))}
              {filtrada.length === 0 && !loading && (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan={4}>Nenhum equipamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards para mobile */}
        <div className="md:hidden divide-y divide-gray-200 border">
          {pagina.map((e) => (
            <EquipamentoCard key={e.id} item={e} onEdit={startEdit} onDelete={confirmarExclusao} onViewIdCard={setSelectedEquipamento} />
          ))}
          {filtrada.length === 0 && !loading && (
            <div className="p-4 text-center text-sm text-gray-600">Nenhum equipamento encontrado.</div>
          )}
        </div>
        <div className="mt-3 hidden md:flex items-center justify-between">
          <div className="text-sm text-gray-600">Página {current} de {totalPages}</div>
          <Pagination current={current} totalPages={totalPages} onChange={setCurrentPage} windowSize={5} />
        </div>
      </section>

      {showCreate && (
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Criar Equipamento</h2>

        {/* Card info do arquivo (mostra durante upload E em wizard/review) */}
        {(winauditFluxo === 'uploading' || winauditFluxo === 'wizard' || winauditFluxo === 'review') && winauditFile && (
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 px-3 py-2 border border-indigo-100">
                <span className="text-[11px] font-bold tracking-widest text-indigo-700 uppercase">HTML</span>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 break-all">
                  {winauditPreview?.metadados?.arquivoOriginal || winauditFile.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Relatório de inventário · WinAudit · {(winauditFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium border border-green-200">
              <CheckCircle size={14} />
              Arquivo válido
            </span>
          </div>
        )}

        {/* Wizard WinAudit: step animado + progress bar (mostra em uploading E wizard, mas só tabela + botões quando wizard) */}
        {(winauditFluxo === 'uploading' || winauditFluxo === 'wizard') && (
          <div className={`mb-4 ${winauditFluxo === 'uploading' ? 'rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 sm:p-6' : 'rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4 sm:p-6'}`}>
            {winauditFluxo === 'wizard' && (
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Importando dados do equipamento</h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  O sistema está analisando o relatório WinAudit e preparando os dados para o cadastro.
                </p>
              </header>
            )}

            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              {([
                { n: 1 as const, titulo: 'Validar arquivo', desc: 'Confere se o arquivo enviado possui um formato compatível.' },
                { n: 2 as const, titulo: 'Ler informações', desc: 'Localiza as informações disponíveis no relatório do WinAudit.' },
                { n: 3 as const, titulo: 'Associar campos', desc: 'Relaciona cada informação encontrada ao campo correspondente.' },
              ] as const).map((passo) => {
                const feito = winauditWizardStep >= passo.n
                return (
                  <div
                    key={passo.n}
                    className={`rounded-2xl border-2 p-3 sm:p-4 bg-white ${feito ? 'border-green-300 shadow-[0_0_0_4px_rgba(34,197,94,0.05)]' : 'border-slate-200'}`}
                  >
                    <div className={`mb-2 inline-flex items-center justify-center w-9 h-9 rounded-full text-white font-bold text-sm ${feito ? 'bg-green-600' : 'bg-slate-400'}`}>
                      {feito ? <CheckCircle size={18} /> : passo.n}
                    </div>
                    <h4 className={`text-sm font-semibold ${feito ? 'text-slate-900' : 'text-slate-500'}`}>{passo.titulo}</h4>
                    <p className={`mt-1 text-xs ${feito ? 'text-slate-600' : 'text-slate-400'}`}>{passo.desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="mb-5">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">
                  {winauditFluxo === 'uploading' ? 'Processando arquivo...' : 'Preparando dados...'}
                </span>
                <span className="font-bold text-indigo-700 tabular-nums">
                  {PORCENTAGEM_POR_STEP[winauditWizardStep]}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{
                    width: LARGURA_BARRA_PROGRESSO_WIZARD[winauditWizardStep],
                  }}
                />
              </div>
            </div>

            {winauditFluxo === 'wizard' && winauditPreview && winauditWizardStep === 3 && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-300 bg-green-50 p-3 sm:p-4">
                <div className="mt-0.5 rounded-full bg-green-600 text-white p-1.5 shadow-sm">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-green-900">Dados encontrados</h4>
                  <p className="text-xs sm:text-sm text-green-800/90">
                    O arquivo foi processado com sucesso. Confira os campos antes de continuar.
                  </p>
                </div>
              </div>
            )}

            {winauditFluxo === 'wizard' && winauditPreview && (
              <>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Dados encontrados</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {(winauditPreview.metadados?.mapeamentosWizard?.length ?? 0)} campos identificados e associados
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-slate-200">Campo no relatório</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-slate-200">Campo no cadastro</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-slate-200">Valor encontrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((winauditPreview.metadados?.mapeamentosWizard?.length ?? 0) > 0
                        ? winauditPreview.metadados!.mapeamentosWizard!
                        : fallbackMapeamentos(winauditPreview)
                      ).map((row, idx) => (
                        <tr key={keyOfMapeamento(row, idx)} className="hover:bg-slate-50/60">
                          <td className="px-3 sm:px-4 py-2.5 text-slate-600">{row.campoRelatorio}</td>
                          <td className="px-3 sm:px-4 py-2.5 font-semibold text-slate-900">{row.campoCadastro}</td>
                          <td className="px-3 sm:px-4 py-2.5 font-medium text-slate-900 break-all">
                            {badgeStatusCampo(row.status)} {row.valorEncontrado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {winauditPreview.avisos && winauditPreview.avisos.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                    {winauditPreview.avisos.slice(0, 3).map((msg) => {
                      let h = 0
                      for (let k = 0; k < msg.length; k++) h = (h * 31 + (msg.codePointAt(k) ?? 0)) >>> 0
                      return (
                        <div key={`aviso-${h.toString(36)}-${msg.length}`} className="flex items-start gap-2 text-xs sm:text-sm text-amber-900">
                          <Info size={15} className="mt-0.5 text-amber-700" />
                          <span>{msg}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    aria-label="Reprocessar arquivo WinAudit"
                    onClick={() => {
                      clearWinauditState()
                      window.setTimeout(() => winauditFileRef.current?.click(), 60)
                    }}
                    className="rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 px-4 sm:px-6 py-3 text-sm font-medium"
                  >
                    Reprocessar
                  </button>
                  <button
                    type="submit"
                    form="form-criar-equipamento"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    OK, carregar dados
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upload WinAudit (fora de review e fora de wizard/uploading) */}
        {winauditFluxo !== 'review' && winauditFluxo !== 'wizard' && winauditFluxo !== 'uploading' && (
          <div className="mb-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-700" aria-hidden="true">
                  <FileUp size={22} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Importar dados do WinAudit
                  </h3>
                  <p className="text-xs text-slate-600">
                    Opção rápida: selecione um relatório <span className="font-semibold">.html</span> ou{' '}
                    <span className="font-semibold">.htm</span> gerado pelo WinAudit. Os campos serão preenchidos
                    automaticamente para você conferir, tamanho máximo do arquivo 5MB.
                  </p>
                  {winauditFile && (
                    <p className="mt-1 text-xs text-slate-700">
                      Arquivo selecionado: <span className="font-medium">{winauditFile.name}</span> (
                      {(winauditFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={winauditFileRef}
                  id="winauditFileInput"
                  type="file"
                  accept=".html,.htm,text/html"
                  className="hidden"
                  aria-label="Selecionar arquivo HTML do WinAudit para importação"
                  onChange={(e) => onWinauditFilePick(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  aria-label="Selecionar arquivo HTML do WinAudit"
                  aria-controls="winauditFileInput"
                  onClick={() => winauditFileRef.current?.click()}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 flex items-center gap-2"
                >
                  <FileUp size={16} aria-hidden="true" />
                  <span>Selecionar arquivo .html</span>
                </button>
                {winauditFile && (
                  <button
                    type="button"
                    aria-label="Limpar arquivo WinAudit selecionado"
                    onClick={() => {
                      clearWinauditState()
                    }}
                    className="rounded border px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tela de conferência WinAudit */}
        {winauditFluxo === 'review' && winauditPreview && (
          <div className="mb-4 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 sm:p-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-700" />
                Dados do arquivo carregados com sucesso
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-900">
                <span className="rounded-xl bg-white px-3 py-1.5 border border-amber-200 shadow-sm">
                  Arquivo: <span className="font-medium">{winauditPreview.metadados?.arquivoOriginal || 'winaudit.html'}</span>
                </span>
                <span className="rounded-xl bg-white px-3 py-1.5 border border-amber-200 shadow-sm">
                  Labels: <span className="font-medium">{winauditPreview.metadados?.labelsMatchCount ?? 0}</span>
                </span>
                <span className="rounded-xl bg-white px-3 py-1.5 border border-green-200 text-green-800 shadow-sm inline-flex items-center gap-1">
                  <CheckCircle size={13} />
                  {(((winauditPreview.metadados?.mapeamentosWizard?.length ?? 0) > 0
                    ? winauditPreview.metadados!.mapeamentosWizard!
                    : fallbackMapeamentos(winauditPreview)
                  ).filter((r) => r.status === 'ENCONTRADO').length)} campos preenchidos
                </span>
                <button
                  type="button"
                  onClick={cancelarReviewWinAudit}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-1.5 text-amber-800 hover:bg-amber-100 shadow-sm font-medium"
                >
                  Descartar importação
                </button>
              </div>
            </header>

            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm mb-4">
              <div className="px-4 py-3 bg-amber-100/60 border-b border-amber-200 flex flex-wrap items-end justify-between gap-2">
                <h4 className="text-sm font-semibold text-amber-900">Dados extraídos do arquivo</h4>
                <p className="text-xs text-amber-800/80">
                  Confira os valores; eles já foram preenchidos no formulário abaixo. Altere se precisar.
                </p>
              </div>
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-amber-50/80 text-amber-900">
                  <tr>
                    <th className="px-3 sm:px-4 py-2.5 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-amber-200">Campo no relatório</th>
                    <th className="px-3 sm:px-4 py-2.5 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-amber-200">Campo no cadastro</th>
                    <th className="px-3 sm:px-4 py-2.5 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-amber-200">Valor carregado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {(((winauditPreview.metadados?.mapeamentosWizard?.length ?? 0) > 0
                    ? winauditPreview.metadados!.mapeamentosWizard!
                    : fallbackMapeamentos(winauditPreview)
                  )).map((row, idx) => (
                    <tr key={keyOfMapeamento(row, idx)} className="hover:bg-amber-50/40">
                      <td className="px-3 sm:px-4 py-2.5 text-amber-800">{row.campoRelatorio}</td>
                      <td className="px-3 sm:px-4 py-2.5 font-semibold text-amber-950">{row.campoCadastro}</td>
                      <td className="px-3 sm:px-4 py-2.5 font-medium text-slate-900 break-all">
                        {badgeStatusCampo(row.status)} {row.valorEncontrado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Avisos */}
            {winauditPreview.avisos.length > 0 && (
              <div className="mb-4 space-y-1">
                {winauditPreview.avisos.slice(0, 5).map((msg) => {
                  let hash = 0
                  for (let k = 0; k < msg.length; k++) {
                    hash = (hash * 31 + (msg.codePointAt(k) ?? 0)) >>> 0
                  }
                  return (
                    <div key={`aviso-${hash.toString(36)}-${msg.length}`} className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs sm:text-sm text-amber-800 flex items-start gap-2">
                      <Info size={14} className="mt-0.5" />
                      <span>{msg}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabela de status por campo */}
            <details className="group rounded-2xl border border-amber-200 bg-white p-3 mb-4">
              <summary className="flex items-center justify-between cursor-pointer text-xs sm:text-sm font-semibold text-amber-900 list-none">
                <span>Resumo de status por campo (ENCONTRADO / NÃO ENCONTRADO / INVÁLIDO)</span>
                <span className="text-xs font-normal text-amber-700 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-amber-100/60 text-amber-900">
                    <tr>
                      <th className="border-b border-amber-200 px-3 py-2 text-left">Campo</th>
                      <th className="border-b border-amber-200 px-3 py-2 text-left">Valor importado</th>
                      <th className="border-b border-amber-200 px-3 py-2 text-center w-48">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { k: 'nome', label: 'Nome', valor: winauditPreview.dados.nome },
                      { k: 'usuarioNome', label: 'Nome do usuário', valor: winauditPreview.dados.usuarioNome },
                      { k: 'fabricante', label: 'Fabricante', valor: winauditPreview.dados.fabricante },
                      { k: 'modelo', label: 'Modelo (composto)', valor: winauditPreview.dados.modelo },
                      { k: 'serial', label: 'Serial', valor: winauditPreview.dados.serial },
                      { k: 'macaddress', label: 'MAC Address (principal)', valor: winauditPreview.dados.macPrincipal },
                      { k: 'processador', label: 'Processador', valor: winauditPreview.dados.processador },
                      { k: 'memoria', label: 'Memória', valor: winauditPreview.dados.memoriaFormatada || winauditPreview.dados.memoria },
                      { k: 'dataAquisicao', label: 'Data de Aquisição', valor: winauditPreview.dados.dataAquisicaoFormatada || winauditPreview.dados.dataAquisicao },
                      { k: 'tipo', label: 'Tipo (sugerido)', valor: winauditPreview.dados.tipoSugerido },
                    ] as const).map((row) => {
                      const status: StatusCampoWinAudit =
                        (winauditPreview.camposStatus[row.k] as StatusCampoWinAudit) || 'NAO_ENCONTRADO'
                      const style = STATUS_CAMPO_LABEL[status]
                      const icone = ICONE_TAMANHO_14_POR_STATUS[status]
                      return (
                        <tr key={row.k} className="border-b border-amber-100 last:border-b-0">
                          <td className="px-3 py-1.5 text-amber-900">{row.label}</td>
                          <td className="px-3 py-1.5 text-slate-900 font-medium break-words">
                            {row.valor ? String(row.valor) : <span className="text-slate-400 italic">não informado</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${style.classe}`}>
                              {icone}
                              <span>{style.label}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </details>

            {/* Múltiplos MACs (se houver) */}
            {winauditPreview.dados.macs.length > 1 && (
              <div className="mt-3 rounded border border-amber-200 bg-white p-2">
                <label htmlFor="winaudit-mac-principal" className="block text-xs font-semibold text-amber-900 mb-1">
                  Múltiplos endereços MAC — selecione o principal
                </label>
                <select
                  id="winaudit-mac-principal"
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={macAddress}
                  onChange={(e) => setMacAddress(formatMac(e.target.value))}
                >
                  {winauditPreview.dados.macs.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      [{m.tipo}] {m.valor}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Alerta de duplicidade + override ADMIN */}
            {winauditPreview.duplicidades.length > 0 && (
              <div className="mt-3 space-y-2 rounded border border-red-300 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <AlertTriangle size={16} />
                  Possível equipamento já cadastrado
                </div>
                <ul className="space-y-1 text-xs text-red-800">
                  {winauditPreview.duplicidades.map((dup) => (
                    <li key={`${dup.equipamentoId}-${dup.tipo}-${dup.campoValor}`} className="rounded bg-white border border-red-200 p-2">
                      <span className="inline-block mr-2 rounded px-2 py-0.5 text-[10px] font-medium bg-red-600 text-white uppercase">
                        {dup.tipo}
                      </span>
                      <span className="font-medium">{dup.nomeEquipamento}</span>
                      <span className="text-red-600 ml-2">{dup.campoValor}</span>
                      {dup.status && <span className="ml-2 text-red-700">· {dup.status}</span>}
                    </li>
                  ))}
                </ul>
                {winauditPreview.bloqueioSerial && (
                  <div className="rounded border border-red-300 bg-white p-2">
                    {userRole === 'ADMIN' ? (
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-red-800">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={winauditIgnorarDuplicidade}
                          onChange={(e) => setWinauditIgnorarDuplicidade(e.target.checked)}
                        />
                        <span>
                          <span className="font-semibold">
                            Existe um equipamento ativo com o mesmo número de série.
                          </span>{' '}
                          Como administrador, marque esta caixa se tiver certeza de que deseja criar mesmo assim.
                        </span>
                      </label>
                    ) : (
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">Operação bloqueada para este perfil:</span> existe um
                        equipamento <strong>ativo</strong> com o mesmo número de série. Contate um{' '}
                        <strong>administrador</strong> para criar mesmo assim.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="mt-2 text-xs sm:text-sm text-amber-900/80">
              Os dados extraídos foram carregados no formulário abaixo. Revise, corrija qualquer informação, complete os campos
              obrigatórios em branco, e depois clique em <strong>Confirmar e cadastrar (WinAudit)</strong>.
            </p>
          </div>
        )}

        <form
          id="form-criar-equipamento"
          onSubmit={winauditFluxo === 'wizard' || winauditFluxo === 'review' ? confirmarImportacao : criarEquipamento}
          className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="md:col-span-2 lg:col-span-3 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label htmlFor="nome" className="mb-1 block text-sm font-medium">Nome</label>
              <input id="nome" ref={nomeInputRef} className="w-full rounded border px-3 py-2" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="patrimonio" className="mb-1 block text-sm font-medium">Nº do Patrimônio</label>
              <input id="patrimonio" className="w-full rounded border px-3 py-2" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="usuarioNome" className="mb-1 block text-sm font-medium">Nome do Usuário</label>
              <input id="usuarioNome" className="w-full rounded border px-3 py-2" value={usuarioNome} onChange={(e) => setUsuarioNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="escolaId" className="mb-1 block text-sm font-medium">Escola</label>
              <select id="escolaId" className="w-full rounded border px-3 py-2" value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
                <option value="">Selecione...</option>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>{esc.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tipo" className="mb-1 block text-sm font-medium">Tipo</label>
              <select id="tipo" className="w-full rounded border px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
              <select id="status" className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="modelo" className="mb-1 block text-sm font-medium">Modelo</label>
              <input id="modelo" className="w-full rounded border px-3 py-2" value={modelo} onChange={(e) => setModelo(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="serial" className="mb-1 block text-sm font-medium">Serial</label>
              <input id="serial" className="w-full rounded border px-3 py-2" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="dataAquisicao" className="mb-1 block text-sm font-medium">Data de Aquisição</label>
              <input id="dataAquisicao" type="date" className="w-full rounded border px-3 py-2" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} />
            </div>
            <div>
              <label htmlFor="localizacao" className="mb-1 block text-sm font-medium">Localização</label>
              <input id="localizacao" className="w-full rounded border px-3 py-2" value={localizacao} onChange={(e) => setLocalizacao(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="macAddress" className="mb-1 block text-sm font-medium">MAC Address</label>
              <input
                id="macAddress"
                className="w-full rounded border px-3 py-2"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={macAddress}
                onChange={(e) => {
                  setMacAddress(formatMac(e.target.value))
                }}
              />
            </div>
            <div>
              <label htmlFor="fabricante" className="mb-1 block text-sm font-medium">Fabricante</label>
              <input id="fabricante" className="w-full rounded border px-3 py-2" value={fabricante} onChange={(e) => setFabricante(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="processador" className="mb-1 block text-sm font-medium">Processador</label>
              <input id="processador" className="w-full rounded border px-3 py-2" value={processador} onChange={(e) => setProcessador(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="memoria" className="mb-1 block text-sm font-medium">Memória</label>
              <input id="memoria" className="w-full rounded border px-3 py-2" value={memoria} onChange={(e) => setMemoria(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="observacoes" className="mb-1 block text-sm font-medium">Observações</label>
            <input id="observacoes" className="w-full rounded border px-3 py-2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={
                winauditConfirming ||
                (winauditFluxo === 'review' && winauditPreview?.bloqueioSerial && userRole !== 'ADMIN') ||
                (winauditFluxo === 'review' && winauditPreview?.bloqueioSerial && !winauditIgnorarDuplicidade)
              }
              className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
            >
              <Save size={16} aria-hidden="true" />
              <span>{LABEL_BOTAO_SUBMIT_POR_FLUXO[winauditFluxo]}</span>
            </button>
            {(winauditFluxo === 'review' || winauditFluxo === 'wizard') && (
              <button
                type="button"
                onClick={cancelarReviewWinAudit}
                aria-label={winauditFluxo === 'wizard' ? 'Descartar importação WinAudit' : 'Voltar para importação manual'}
                className="w-full sm:w-auto rounded border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 px-4 py-2 flex items-center gap-2"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>{winauditFluxo === 'wizard' ? 'Descartar importação' : 'Voltar para importação manual'}</span>
              </button>
            )}
            <button type="button" aria-label="Recarregar lista de equipamentos" onClick={carregar} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2">
              <RotateCcw size={16} aria-hidden="true" />
              <span>Recarregar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                clearCreateForm()
                setShowCreate(false)
                setTimeout(() => buscarInputRef.current?.focus(), 0)
              }}
              className="w-full sm:w-auto rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
      )}

      {editingId && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Editar Equipamento</h2>
          <form onSubmit={salvarEdicao} className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-3 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label htmlFor="editNome" className="mb-1 block text-sm font-medium">Nome</label>
                <input id="editNome" ref={editNomeInputRef} className="w-full rounded border px-3 py-2" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <div>
                <label htmlFor="editPatrimonio" className="mb-1 block text-sm font-medium">Nº do Patrimônio</label>
                <input id="editPatrimonio" className="w-full rounded border px-3 py-2" value={editPatrimonio} onChange={(e) => setEditPatrimonio(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label htmlFor="editUsuarioNome" className="mb-1 block text-sm font-medium">Nome do Usuário</label>
                <input id="editUsuarioNome" className="w-full rounded border px-3 py-2" value={editUsuarioNome} onChange={(e) => setEditUsuarioNome(e.target.value)} />
              </div>
              <div>
                <label htmlFor="editEscolaId" className="mb-1 block text-sm font-medium">Escola</label>
                <select id="editEscolaId" className="w-full rounded border px-3 py-2" value={editEscolaId} onChange={(e) => setEditEscolaId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {escolas.map((esc) => (
                    <option key={esc.id} value={esc.id}>{esc.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="editTipo" className="mb-1 block text-sm font-medium">Tipo</label>
                <select id="editTipo" className="w-full rounded border px-3 py-2" value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                  {['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="editStatus" className="mb-1 block text-sm font-medium">Status</label>
                <select id="editStatus" className="w-full rounded border px-3 py-2" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  {['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="editModelo" className="mb-1 block text-sm font-medium">Modelo</label>
                <input id="editModelo" className="w-full rounded border px-3 py-2" value={editModelo} onChange={(e) => setEditModelo(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label htmlFor="editSerial" className="mb-1 block text-sm font-medium">Serial</label>
                <input id="editSerial" className="w-full rounded border px-3 py-2" value={editSerial} onChange={(e) => setEditSerial(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label htmlFor="editDataAquisicao" className="mb-1 block text-sm font-medium">Data de Aquisição</label>
                <input id="editDataAquisicao" type="date" className="w-full rounded border px-3 py-2" value={editDataAquisicao} onChange={(e) => setEditDataAquisicao(e.target.value)} />
              </div>
              <div>
                <label htmlFor="editLocalizacao" className="mb-1 block text-sm font-medium">Localização</label>
                <input id="editLocalizacao" className="w-full rounded border px-3 py-2" value={editLocalizacao} onChange={(e) => setEditLocalizacao(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-3 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="editMacAddress" className="mb-1 block text-sm font-medium">MAC Address</label>
                <input
                  id="editMacAddress"
                  className="w-full rounded border px-3 py-2"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={editMacAddress}
                  onChange={(e) => setEditMacAddress(e.target.value.toUpperCase())}
                  onBlur={() => setEditMacAddress(formatMac(editMacAddress))}
                />
              </div>
              <div>
                <label htmlFor="editFabricante" className="mb-1 block text-sm font-medium">Fabricante</label>
                <input id="editFabricante" className="w-full rounded border px-3 py-2" value={editFabricante} onChange={(e) => setEditFabricante(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label htmlFor="editProcessador" className="mb-1 block text-sm font-medium">Processador</label>
                <input id="editProcessador" className="w-full rounded border px-3 py-2" value={editProcessador} onChange={(e) => setEditProcessador(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label htmlFor="editMemoria" className="mb-1 block text-sm font-medium">Memória</label>
                <input id="editMemoria" className="w-full rounded border px-3 py-2" value={editMemoria} onChange={(e) => setEditMemoria(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="editObservacoes" className="mb-1 block text-sm font-medium">Observações</label>
              <input id="editObservacoes" className="w-full rounded border px-3 py-2" value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2">
              <button type="submit" aria-label="Salvar alterações do equipamento" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
                <Save size={16} aria-hidden="true" />
                <span>Salvar alterações</span>
              </button>
              <button type="button" aria-label="Cancelar edição do equipamento" onClick={() => { cancelEdit(); setTimeout(() => buscarInputRef.current?.focus(), 0) }} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* Rodapé fixo para mobile */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-20">
        <div className="rounded-lg border bg-white shadow-md px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-700">Total: {filtrada.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Página anterior"
              className="rounded border px-2 py-1 text-xs"
              disabled={current <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >Anterior</button>
            <span className="text-xs px-2 py-1 rounded border bg-blue-600 text-white">
              {current}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              className="rounded border px-2 py-1 text-xs"
              disabled={current >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >Próxima</button>
          </div>
        </div>
      </div>

      {selectedEquipamento && (
        <EquipmentIdCard equipamento={selectedEquipamento} onClose={() => setSelectedEquipamento(null)} />
      )}
    </div>
  )
}
