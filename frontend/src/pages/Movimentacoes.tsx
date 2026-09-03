import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination from '../components/Pagination'
import { Plus, Pencil, Trash2, Save, RotateCcw, X, Filter, ExternalLink } from 'lucide-react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast, showConfirmToast } from '../utils/toast'
import { useAppStore } from '../store/useAppStore'
import { getBloquearEditarExcluirDoado } from '../services/settings'

type Mov = {
  id: string
  equipamentoId: string
  equipamento?: {
    nome?: string
    modelo?: string
    marca?: string
    fabricante?: string
    patrimonio?: string
    serial?: string
    tipo?: string
    status?: string
  }
  tipo?: string
  origem?: string
  destino?: string
  data?: string
  descricao?: string
  escolaId?: string
  escola?: { nome?: string }
}

type EquipamentoOption = {
  id: string
  nome?: string
  localizacao?: string
  tipo?: string
  status?: string
  patrimonio?: string
  modelo?: string
  serial?: string
  fabricante?: string
  marca?: string
  escolaId?: string | null
  escolaNome?: string | null
  usuarioNome?: string
  dataAquisicao?: string | Date | null
  macaddress?: string
  processador?: string
  memoria?: string
  observacoes?: string
}
type EscolaOption = { id: string; nome: string; sigla?: string }

const STATUS_EQUIPAMENTO_MOV: readonly string[] = ['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO','EMPRESTADO','DOADO'] as const

const LABEL_STATUS_EQUIPAMENTO_MOV: Readonly<Record<string, string>> = {
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em uso',
  EM_MANUTENCAO: 'Em manutenção',
  DESCARTADO: 'Descartado',
  RESERVADO: 'Reservado',
  EMPRESTADO: 'Emprestado',
  DOADO: 'Doado',
} as const

const CLASSE_BADGE_STATUS_EDIT_MOV: Readonly<Record<string, string>> = {
  DISPONIVEL: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  EM_USO: 'bg-blue-100 text-blue-900 border-blue-200',
  EM_MANUTENCAO: 'bg-amber-100 text-amber-900 border-amber-200',
  DESCARTADO: 'bg-gray-100 text-gray-900 border-gray-300',
  RESERVADO: 'bg-violet-100 text-violet-900 border-violet-200',
  EMPRESTADO: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  DOADO: 'bg-rose-100 text-rose-900 border-rose-200',
} as const

type RegraLayoutStatusMov = {
  tituloBadge: string
  descricao: string
  severidade: 'info' | 'atencao' | 'terminal' | 'operacional'
  camposEditaveis: readonly string[]
}

const LAYOUT_POR_STATUS_MOV: Readonly<Record<string, RegraLayoutStatusMov>> = {
  DISPONIVEL: {
    tituloBadge: 'Estoque: disponível para uso',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'operacional',
    camposEditaveis: ['descricao'],
  },
  EM_USO: {
    tituloBadge: 'Atribuído / em uso',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'operacional',
    camposEditaveis: ['descricao'],
  },
  EM_MANUTENCAO: {
    tituloBadge: '🛾 Em fluxo de Manutenção / Oficina',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'atencao',
    camposEditaveis: ['descricao'],
  },
  RESERVADO: {
    tituloBadge: 'Reservado (separado)',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'info',
    camposEditaveis: ['descricao'],
  },
  EMPRESTADO: {
    tituloBadge: '🤝 Em empréstimo temporário',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'atencao',
    camposEditaveis: ['descricao'],
  },
  DESCARTADO: {
    tituloBadge: '🗑️ Descartado (terminal)',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'terminal',
    camposEditaveis: ['descricao'],
  },
  DOADO: {
    tituloBadge: '❤️ Doado (terminal)',
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'terminal',
    camposEditaveis: ['descricao'],
  },
} as const

function statusEquipamentoValidoMov(status: string): boolean {
  return STATUS_EQUIPAMENTO_MOV.includes(status)
}

function regraStatusOrDefaultMov(status: string): RegraLayoutStatusMov {
  const statusNormalizado = statusEquipamentoValidoMov(status) ? status : (STATUS_EQUIPAMENTO_MOV[0] ?? 'DISPONIVEL')
  return LAYOUT_POR_STATUS_MOV[statusNormalizado] ?? {
    tituloBadge: `Status: ${statusNormalizado}`,
    descricao: 'Para preservar a trilha de auditoria e o histórico de movimentações, apenas o campo Descrição pode ser ajustado nesta edição.',
    severidade: 'info' as const,
    camposEditaveis: ['descricao'],
  }
}

const COR_BANNER_POR_SEVERIDADE_MOV: Readonly<Record<RegraLayoutStatusMov['severidade'], { wrapper: string; badge: string; badgeTexto: string }>> = {
  operacional: { wrapper: 'border-emerald-200 bg-emerald-50/60', badge: 'bg-emerald-600', badgeTexto: 'text-white' },
  info:        { wrapper: 'border-blue-200 bg-blue-50/60',         badge: 'bg-blue-600',     badgeTexto: 'text-white' },
  atencao:     { wrapper: 'border-amber-200 bg-amber-50/60',       badge: 'bg-amber-600',    badgeTexto: 'text-white' },
  terminal:    { wrapper: 'border-rose-200 bg-rose-50/60',         badge: 'bg-rose-600',     badgeTexto: 'text-white' },
} as const

function podeEditarCampoEditMov(campo: string, editaveis: readonly string[]): boolean {
  return editaveis.includes(campo)
}

const TIPOS_COMPLETOS = [
  'ENTRADA','SAIDA','TRANSFERENCIA','MANUTENCAO','DESCARTE',
  'MANUTENCAO_ENVIO','MANUTENCAO_RETORNO','EMPRESTIMO','DEVOLUCAO','DOACAO','AJUSTE',
] as const

type TipoMovimento = (typeof TIPOS_COMPLETOS)[number]

type CategoriaTipo = 'BASICOS' | 'MANUTENCAO' | 'EMPRESTIMO' | 'DOACAO' | 'AJUSTES'

type OpcaoTipoFormulario = {
  value: TipoMovimento
  label: string
  categoria: CategoriaTipo
  descricao?: string
  terminal?: boolean
  apenasAdmin?: boolean
  endpoint?: string
  statusEquipamentoPermitidos?: string[] | null
}

type SnapshotAjusteEquipamento = {
  id: string
  nome: string
  patrimonio: string
  usuarioNome: string
  escolaId: string
  escolaNome: string
  tipo: string
  status: string
  modelo: string
  serial: string
  dataAquisicao: string
  localizacao: string
  macaddress: string
  fabricante: string
  processador: string
  memoria: string
  observacoes: string
  extraidoEm: string
}

function ajusteVazio(): SnapshotAjusteEquipamento {
  return {
    id: '', nome: '', patrimonio: '', usuarioNome: '', escolaId: '', escolaNome: '',
    tipo: '', status: '', modelo: '', serial: '', dataAquisicao: '', localizacao: '',
    macaddress: '', fabricante: '', processador: '', memoria: '', observacoes: '', extraidoEm: '',
  }
}

const TIPOS_EQUIPAMENTO_AJUSTE: readonly string[] = ['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO'] as const

const TIPOS_FORMULARIO: OpcaoTipoFormulario[] = [
  { value: 'ENTRADA',           label: 'Entrada',                     categoria: 'BASICOS',    descricao: 'Equipamento entra no estoque/instituição' },
  { value: 'SAIDA',             label: 'Saída',                       categoria: 'BASICOS',    descricao: 'Equipamento sai do estoque/instituição' },
  { value: 'TRANSFERENCIA',     label: 'Transferência',               categoria: 'BASICOS',    descricao: 'Muda escola/localização interna', endpoint: '/api/movimentacoes/transferencia' },
  { value: 'DESCARTE',          label: 'Descarte',                    categoria: 'BASICOS',    descricao: 'Equipamento descartado (terminal)', terminal: true, apenasAdmin: true },
  { value: 'AJUSTE',            label: 'Ajuste',                      categoria: 'AJUSTES',    descricao: 'Corrigir dados (estorno/inconsistência)' },

  { value: 'MANUTENCAO_ENVIO',  label: '🔧 Envio para Manutenção',    categoria: 'MANUTENCAO', descricao: 'Envia equipamento para fornecedor/oficina', endpoint: '/api/movimentacoes/manutencao/envio' },
  { value: 'MANUTENCAO_RETORNO',label: '🔩 Retorno de Manutenção',    categoria: 'MANUTENCAO', descricao: 'Equipamento volta de manutenção', endpoint: '/api/movimentacoes/manutencao/retorno', statusEquipamentoPermitidos: ['EM_MANUTENCAO'] },  
  { value: 'EMPRESTIMO',        label: '🤝 Empréstimo',                categoria: 'EMPRESTIMO', descricao: 'Saída temporária para terceiros/setores', endpoint: '/api/movimentacoes/emprestimo', statusEquipamentoPermitidos: ['DISPONIVEL','EM_USO'] },
  { value: 'DEVOLUCAO',         label: '↩️ Devolução de Empréstimo',   categoria: 'EMPRESTIMO', descricao: 'Retorno de empréstimo', endpoint: '/api/movimentacoes/devolucao', statusEquipamentoPermitidos: ['EMPRESTADO'] },
  { value: 'DOACAO',            label: '❤️ Doação',                    categoria: 'DOACAO',     descricao: 'Transferência definitiva para terceiro (terminal · retira do inventário)', terminal: true, apenasAdmin: true, endpoint: '/api/movimentacoes/doacao', statusEquipamentoPermitidos: ['DISPONIVEL','EM_USO'] },
]

const ROTULOS_CATEGORIA: Record<CategoriaTipo, { titulo: string; icone: string; ajuda?: string }> = {
  BASICOS:    { titulo: '📦 Movimentações Básicas',    icone: '📦', ajuda: 'Uso diário: entrada, saída, transferência e descarte.' },
  MANUTENCAO: { titulo: '🔧 Manutenção',               icone: '🔧', ajuda: 'Envio e retorno de equipamento para oficina/fornecedor.' },
  EMPRESTIMO: { titulo: '🤝 Empréstimo',               icone: '🤝', ajuda: 'Empréstimos e devoluções temporárias.' },
  DOACAO:     { titulo: '❤️ Doação',                   icone: '❤️', ajuda: 'Movimento terminal. Retira equipamento do inventário operacional.' },
  AJUSTES:    { titulo: '🔧 Ajustes',                  icone: '⚙️', ajuda: 'Ajustes e correções de consistência (auditáveis).' },
}

const TIPOS_SERVICO_MANUT = ['GARANTIA','CONTRATO','AVULSO','INTERNO','OUTRO'] as const

type FormManutencaoEnvio = {
  fornecedorNome: string
  fornecedorContato: string
  numeroOS: string
  tipoServico: string
  tecnicoResponsavel: string
  defeitoRelatado: string
  dataEnvio: string
  prazoRetorno: string
  observacoes: string
}

type FormManutencaoRetorno = {
  movimentacaoEnvioId: string
  dataRetornoEfetiva: string
  laudoTecnico: string
  solucao: string
  pecasTrocadasTexto: string
  valorServico: string
  statusFinal: 'DISPONIVEL' | 'EM_USO'
  observacoes: string
}

type FormDoacao = {
  beneficiarioNome: string
  beneficiarioCpfCnpj: string
  beneficiarioContato: string
  dataEntregaEfetiva: string
  numeroPortaria: string
  enderecoEntrega: string
  responsavelEntrega: string
  motivo: string
  observacoesInternas: string
}

type FormEmprestimo = {
  beneficiarioNome: string
  beneficiarioDocumento: string
  beneficiarioContato: string
  tomadorNome: string
  tomadorCargo: string
  localDestino: string
  dataSaida: string
  dataPrevistaDevolucao: string
  estadoConservacaoSaida: string
  termoAssinado: boolean
  termoUrl: string
  observacoesInternas: string
}

type FormDevolucao = {
  movimentacaoSaidaId: string
  dataDevolucaoEfetiva: string
  estadoConservacaoRetorno: string
  statusFinal: 'DISPONIVEL' | 'EM_USO'
  observacoesInternas: string
}

const TIPO_BADGE_CLASSES: Readonly<Record<string, string>> = {
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

function getClasseBadgeTipo(tipo?: string): string {
  if (!tipo) return 'bg-gray-100 text-gray-800'
  return TIPO_BADGE_CLASSES[tipo] ?? 'bg-gray-100 text-gray-800'
}

function formatarNomeEquipamento(eq?: Mov['equipamento'] | null): { titulo: string; detalhe: string | null } {
  if (!eq) return { titulo: 'Equipamento não informado', detalhe: null }
  const nome = (eq.nome || '').trim()
  const modelo = (eq.modelo || '').trim()
  const marca = (eq.marca || eq.fabricante || '').trim()
  const patrimonio = (eq.patrimonio || '').trim()
  const partesTitulo: string[] = []
  if (nome) partesTitulo.push(nome)
  if (modelo) partesTitulo.push(modelo)
  const titulo = partesTitulo.join(' · ') || (patrimonio ? `Patrimônio ${patrimonio}` : 'Equipamento')
  const detalhes: string[] = []
  if (marca && !nome.includes(marca) && !modelo.includes(marca)) detalhes.push(marca)
  if (patrimonio) detalhes.push(`Pat.: ${patrimonio}`)
  if (eq.tipo && !nome.includes(eq.tipo) && !modelo.includes(eq.tipo)) detalhes.push(eq.tipo)
  return { titulo, detalhe: detalhes.length ? detalhes.join(' • ') : null }
}

const doisDigitos = (n: number): string => n.toString().padStart(2, '0')

function formatarDateTimeLocal(d = new Date()): string {
  const ano = d.getFullYear()
  const mes = doisDigitos(d.getMonth() + 1)
  const dia = doisDigitos(d.getDate())
  const hora = doisDigitos(d.getHours())
  const minuto = doisDigitos(d.getMinutes())
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`
}

function formatarDateOnly(d = new Date()): string {
  const ano = d.getFullYear()
  const mes = doisDigitos(d.getMonth() + 1)
  const dia = doisDigitos(d.getDate())
  return `${ano}-${mes}-${dia}`
}

function getManutEnvioInit(): FormManutencaoEnvio {
  return {
    fornecedorNome:'', fornecedorContato:'', numeroOS:'', tipoServico:'AVULSO', tecnicoResponsavel:'',
    defeitoRelatado:'', dataEnvio: formatarDateTimeLocal(), prazoRetorno:'', observacoes:''
  }
}

function getManutRetornoInit(): FormManutencaoRetorno {
  return {
    movimentacaoEnvioId:'', dataRetornoEfetiva: formatarDateTimeLocal(),
    laudoTecnico:'', solucao:'', pecasTrocadasTexto:'', valorServico:'', statusFinal:'DISPONIVEL', observacoes:''
  }
}

function getDoacaoInit(): FormDoacao {
  return {
    beneficiarioNome:'', beneficiarioCpfCnpj:'', beneficiarioContato:'',
    dataEntregaEfetiva: formatarDateOnly(),
    numeroPortaria:'', enderecoEntrega:'', responsavelEntrega:'', motivo:'', observacoesInternas:''
  }
}

function getEmprestimoInit(): FormEmprestimo {
  return {
    beneficiarioNome:'', beneficiarioDocumento:'', beneficiarioContato:'',
    tomadorNome:'', tomadorCargo:'', localDestino:'',
    dataSaida: formatarDateTimeLocal(),
    dataPrevistaDevolucao:'', estadoConservacaoSaida:'BOM',
    termoAssinado:false, termoUrl:'', observacoesInternas:''
  }
}

function getDevolucaoInit(): FormDevolucao {
  return {
    movimentacaoSaidaId:'', dataDevolucaoEfetiva: formatarDateTimeLocal(),
    estadoConservacaoRetorno:'BOM', statusFinal:'DISPONIVEL', observacoesInternas:''
  }
}

export default function MovimentacoesPage() {
  const navigate = useNavigate()
  const setMaintenanceCount = useAppStore((state) => state.setMaintenanceCount)
  const setDiscardedCount = useAppStore((state) => state.setDiscardedCount)
  const setExpiredCount = useAppStore((state) => state.setExpiredCount)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([])
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [departamentoSel, setDepartamentoSel] = useState<'EQUIPAMENTOS' | 'CENTRO_MIDIA'>('EQUIPAMENTOS')
  const [showCreate, setShowCreate] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const equipamentoSelectRef = useRef<HTMLSelectElement | null>(null)
  const buscarInputRef = useRef<HTMLInputElement | null>(null)
  const ultimoHintAjusteRef = useRef<number>(0)

  const [equipamentoId, setEquipamentoId] = useState('')
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [data, setData] = useState<string>(() => formatarDateTimeLocal())
  const [descricao, setDescricao] = useState('')
  const [snapshotAjuste, setSnapshotAjuste] = useState<SnapshotAjusteEquipamento | null>(null)
  const [ajusteEquip, setAjusteEquip] = useState<SnapshotAjusteEquipamento>(() => ajusteVazio())
  const [ajusteDirty, setAjusteDirty] = useState(false)

  const [formManutEnvio, setFormManutEnvio] = useState<FormManutencaoEnvio>(() => getManutEnvioInit())
  const [formManutRetorno, setFormManutRetorno] = useState<FormManutencaoRetorno>(() => getManutRetornoInit())
  const [formDoacao, setFormDoacao] = useState<FormDoacao>(() => getDoacaoInit())
  const [formEmprestimo, setFormEmprestimo] = useState<FormEmprestimo>(() => getEmprestimoInit())
  const [formDevolucao, setFormDevolucao] = useState<FormDevolucao>(() => getDevolucaoInit())
  const [doacaoStep, setDoacaoStep] = useState<1 | 2>(1)
  const [countdownDoacao, setCountdownDoacao] = useState<number>(3)

  const [opcaoTipoSelecionada, setOpcaoTipoSelecionada] = useState<OpcaoTipoFormulario | undefined>(() => TIPOS_FORMULARIO.find(t => t.value === 'ENTRADA'))
  const role = (localStorage.getItem('userRole') as 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO') || 'USUARIO'
  const isAdmin = role === 'ADMIN'
  const bloquearEditarExcluirDoado = getBloquearEditarExcluirDoado()
  const statusEquipamentoDaMov = (m: Mov): string => ((m.equipamento?.status as string) || '').toUpperCase()
  const equipamentoEDoado = (m: Mov): boolean => statusEquipamentoDaMov(m) === 'DOADO'
  const podeEditarMovBaseFn = (m: Mov): boolean => {
    if (role === 'USUARIO') return false
    if (bloquearEditarExcluirDoado && equipamentoEDoado(m)) return false
    return true
  }
  const podeExcluirMovBaseFn = (m: Mov): boolean => {
    if (!isAdmin) return false
    if (bloquearEditarExcluirDoado && equipamentoEDoado(m)) return false
    return true
  }

  const TIPOS_PERMITIDOS_NA_CRIACAO = useMemo(() => {
    return TIPOS_FORMULARIO
      .filter((t) => !(t.apenasAdmin && !isAdmin))
      .map((t) => t.value as string)
  }, [isAdmin])

  const TIPOS_PERMITIDOS_FORM = useMemo(() => {
    return TIPOS_FORMULARIO.filter((t) => !(t.apenasAdmin && !isAdmin))
  }, [isAdmin])

  const CATEGORIAS_ORDENADAS: CategoriaTipo[] = ['BASICOS','MANUTENCAO','EMPRESTIMO','DOACAO','AJUSTES']

  function resetarFormulariosEspecificos() {
    setFormManutEnvio(getManutEnvioInit())
    setFormManutRetorno(getManutRetornoInit())
    setFormDoacao(getDoacaoInit())
    setFormEmprestimo(getEmprestimoInit())
    setFormDevolucao(getDevolucaoInit())
    setDoacaoStep(1)
    setCountdownDoacao(3)
  }

  // Filtro de tipo de equipamento no cadastro
  const [filterEquipType, setFilterEquipType] = useState('ALL')
  const [filterText, setFilterText] = useState('')
  const [filterTipo, setFilterTipo] = useState<'ALL' | typeof TIPOS_COMPLETOS[number]>('ALL')
  const [filterEscolaId, setFilterEscolaId] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMov, setEditingMov] = useState<Mov | null>(null)
  const [editEquipamentoId, setEditEquipamentoId] = useState('')
  const [editTipo, setEditTipo] = useState<string>('ENTRADA')
  const [editOrigem, setEditOrigem] = useState('')
  const [editDestino, setEditDestino] = useState('')
  const [editData, setEditData] = useState<string>('')
  const [editDescricao, setEditDescricao] = useState('')

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const resp = await api.get('/api/movimentacoes')
      setLista(resp.data || [])
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (e as { message?: string })?.message || 'Erro ao carregar movimentações')
    } finally {
      setLoading(false)
    }
  }

  const carregarItens = useCallback(async () => {
    setFilterEquipType('ALL')
    try {
      if (departamentoSel === 'CENTRO_MIDIA') {
        const resp = await api.get('/api/centro-midia')
        const data: EquipamentoOption[] = (resp.data || []).map((i: { id: string; nome?: string; tipo?: string }) => ({ id: i.id, nome: i.nome, tipo: i.tipo, status: 'DISPONIVEL' }))
        setEquipamentos(data)
      } else {
        const resp = await api.get('/api/equipamentos')
        const data: EquipamentoOption[] = (resp.data || []).map((e: {
          id: string; nome?: string; nomeEquipamento?: string; localizacao?: string; tipo?: string
          statusEquipamento?: string; status?: string
          patrimonio?: string; modelo?: string; serial?: string
          fabricante?: string; marca?: string
          escolaId?: string | null
          escola?: { nome?: string } | null
          usuarioNome?: string
          dataAquisicao?: string | Date | null
          macaddress?: string; processador?: string; memoria?: string; observacoes?: string
        }) => ({
          id: e.id,
          nome: e.nome || e.nomeEquipamento,
          localizacao: e.localizacao,
          tipo: e.tipo,
          status: e.statusEquipamento || e.status,
          patrimonio: e.patrimonio,
          modelo: e.modelo,
          serial: e.serial,
          fabricante: e.fabricante,
          marca: e.marca,
          escolaId: e.escolaId,
          escolaNome: e.escola?.nome,
          usuarioNome: e.usuarioNome,
          dataAquisicao: e.dataAquisicao,
          macaddress: e.macaddress,
          processador: e.processador,
          memoria: e.memoria,
          observacoes: e.observacoes,
        }))
        setEquipamentos(data)
      }
    } catch {
      void 0
    }
  }, [departamentoSel])

  const carregarEscolas = useCallback(async () => {
    try {
      const resp = await api.get('/api/escolas')
      setEscolas(resp.data || [])
    } catch {
      setEscolas([])
    }
  }, [])

  const tiposDisponiveis = useMemo(() => {
    const t = new Set(equipamentos.map(e => e.tipo).filter(Boolean))
    return Array.from(t).sort((a, b) => {
      if (a === null || a === undefined) return 1
      if (b === null || b === undefined) return -1
      return String(a).localeCompare(String(b), 'pt-BR')
    })
  }, [equipamentos])

  const rotuloFiltroEquipamentos = useMemo(() => {
    const t = opcaoTipoSelecionada?.value
    switch (t) {
      case 'ENTRADA':            return 'Exibindo apenas equipamentos EM USO'
      case 'SAIDA':              return 'Exibindo apenas equipamentos DISPONÍVEIS'
      case 'TRANSFERENCIA':      return 'Exibindo equipamentos exceto em manutenção e descartados'
      case 'DESCARTE':           return 'Exibindo todos os equipamentos'
      case 'MANUTENCAO_ENVIO':   return 'Exibindo equipamentos disponíveis / em uso (não em manutenção ou emprestados)'
      case 'MANUTENCAO_RETORNO': return 'Exibindo apenas equipamentos EM MANUTENÇÃO'
      case 'EMPRESTIMO':         return 'Exibindo equipamentos disponíveis / em uso (não em manutenção ou emprestados)'
      case 'DEVOLUCAO':          return 'Exibindo apenas equipamentos EMPRESTADOS'
      case 'DOACAO':             return 'Exibindo equipamentos exceto doados e descartados'
      case 'AJUSTE':             return 'Exibindo todos os equipamentos'
      case 'MANUTENCAO':         return 'Exibindo equipamentos exceto doados e descartados'
      default:                   return 'Exibindo todos os equipamentos'
    }
  }, [opcaoTipoSelecionada])

  const equipamentosElegiveisParaTipo = useMemo(() => {
    const t = opcaoTipoSelecionada?.value
    const semStatusDefinido = (eq: EquipamentoOption) => !eq.status
    switch (t) {
      case 'ENTRADA':
        return equipamentos.filter(eq => semStatusDefinido(eq) || eq.status === 'EM_USO')
      case 'SAIDA':
        return equipamentos.filter(eq => semStatusDefinido(eq) || eq.status === 'DISPONIVEL')
      case 'TRANSFERENCIA':
        return equipamentos.filter(eq => semStatusDefinido(eq) || (eq.status !== 'EM_MANUTENCAO' && eq.status !== 'DESCARTADO'))
      case 'DESCARTE':
        return equipamentos
      case 'MANUTENCAO_ENVIO':
      case 'EMPRESTIMO':
        return equipamentos.filter(eq =>
          semStatusDefinido(eq) ||
          (eq.status !== 'EM_MANUTENCAO' && eq.status !== 'EMPRESTADO' && eq.status !== 'DESCARTADO' && eq.status !== 'DOADO')
        )
      case 'MANUTENCAO_RETORNO':
        return equipamentos.filter(eq => semStatusDefinido(eq) || eq.status === 'EM_MANUTENCAO')
      case 'DEVOLUCAO':
        return equipamentos.filter(eq => semStatusDefinido(eq) || eq.status === 'EMPRESTADO')
      case 'DOACAO':
        return equipamentos.filter(eq => semStatusDefinido(eq) || (eq.status !== 'DOADO' && eq.status !== 'DESCARTADO'))
      case 'AJUSTE':
        return equipamentos
      case 'MANUTENCAO':
        return equipamentos.filter(eq => semStatusDefinido(eq) || (eq.status !== 'DOADO' && eq.status !== 'DESCARTADO'))
      default:
        return equipamentos
    }
  }, [opcaoTipoSelecionada, equipamentos])

  useEffect(() => {
    if (!equipamentoId) return
    const elegivelIds = new Set(equipamentosElegiveisParaTipo.map(e => e.id))
    if (!elegivelIds.has(equipamentoId)) {
      setEquipamentoId('')
      setOrigem('')
    }
  }, [equipamentosElegiveisParaTipo, equipamentoId])

  const escolasDisponiveis = useMemo(() => {
    const merged = new Map<string, EscolaOption>()
    escolas.forEach((escola) => {
      merged.set(escola.id, escola)
    })
    lista.forEach((mov) => {
      if (mov.escolaId && mov.escola?.nome && !merged.has(mov.escolaId)) {
        merged.set(mov.escolaId, {
          id: mov.escolaId,
          nome: mov.escola.nome,
        })
      }
    })
    return Array.from(merged.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [escolas, lista])

  const extrairSnapshotAjuste = useCallback((idEquip: string): SnapshotAjusteEquipamento | null => {
    if (!idEquip) return null
    const eqOp = equipamentos.find((eq) => eq.id === idEquip) || (null as EquipamentoOption | null)
    const mov = lista.find((m) => m.equipamentoId === idEquip)
    const eqDetalhe = mov?.equipamento
    const idEscolaResolvido = (mov?.escolaId ?? eqOp?.escolaId) || ''
    const opEscola = idEscolaResolvido ? escolasDisponiveis.find((sc) => sc.id === idEscolaResolvido) : undefined

    const dataAquStr = (v: unknown): string => {
      if (!v) return ''
      if (v instanceof Date) return formatarDateOnly(v)
      if (typeof v === 'string') {
        const s = v.trim()
        if (!s) return ''
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatarDateOnly(new Date(s))
        return s
      }
      if (typeof v === 'number' || typeof v === 'bigint') {
        const s = String(v).trim()
        if (!s) return ''
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatarDateOnly(new Date(s))
        return s
      }
      return ''
    }
    return {
      id: idEquip,
      nome: (eqDetalhe?.nome || eqOp?.nome || '').trim(),
      patrimonio: (eqDetalhe?.patrimonio || eqOp?.patrimonio || '').trim(),
      usuarioNome: (eqOp?.usuarioNome || '').trim(),
      escolaId: idEscolaResolvido,
      escolaNome: (opEscola?.nome || mov?.escola?.nome || eqOp?.escolaNome || '').trim(),
      tipo: (eqDetalhe?.tipo || eqOp?.tipo || '').trim() || 'não informado',
      status: String((eqDetalhe?.status || eqOp?.status || '—').toUpperCase()).replace(/^$/, '—'),
      modelo: (eqDetalhe?.modelo || eqOp?.modelo || '').trim(),
      serial: (eqDetalhe?.serial || eqOp?.serial || '').trim(),
      dataAquisicao: dataAquStr(eqOp?.dataAquisicao),
      localizacao: (eqOp?.localizacao || (eqDetalhe as { localizacao?: string } | undefined)?.localizacao || '').trim(),
      macaddress: (eqOp?.macaddress || '').trim(),
      fabricante: (eqDetalhe?.fabricante || eqDetalhe?.marca || eqOp?.fabricante || eqOp?.marca || '').trim(),
      processador: (eqOp?.processador || '').trim(),
      memoria: (eqOp?.memoria || '').trim(),
      observacoes: (eqOp?.observacoes || '').trim(),
      extraidoEm: formatarDateTimeLocal(),
    }
  }, [lista, equipamentos, escolasDisponiveis])

  useEffect(() => {
    if (opcaoTipoSelecionada?.value !== 'AJUSTE') {
      if (snapshotAjuste !== null) setSnapshotAjuste(null)
      if (ajusteEquip.id !== '' || ajusteDirty) {
        setAjusteEquip(ajusteVazio())
        setAjusteDirty(false)
      }
      return
    }
    if (!equipamentoId) {
      if (snapshotAjuste !== null) setSnapshotAjuste(null)
      if (ajusteEquip.id !== '' || ajusteDirty) {
        setAjusteEquip(ajusteVazio())
        setAjusteDirty(false)
      }
      return
    }
    if (snapshotAjuste?.id === equipamentoId) return
    const snap = extrairSnapshotAjuste(equipamentoId)
    setSnapshotAjuste(snap)
    if (snap && !ajusteDirty) {
      setAjusteEquip({ ...snap })
    }
  }, [opcaoTipoSelecionada, equipamentoId, extrairSnapshotAjuste, snapshotAjuste, ajusteEquip.id, ajusteDirty])

  const handleEquipamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    setEquipamentoId(selectedId)
    
    if (departamentoSel === 'EQUIPAMENTOS') {
      const selectedEquip = equipamentos.find(eq => eq.id === selectedId)
      if (selectedEquip?.localizacao) {
        setOrigem(selectedEquip.localizacao)
      } else {
        setOrigem('')
      }
    }
  }

  const cancelCreate = () => {
    setShowCreate(false)
    setEquipamentoId('')
    setOrigem('')
    setDestino('')
    setData('')
    setDescricao('')
    setSnapshotAjuste(null)
    setAjusteEquip(ajusteVazio())
    setAjusteDirty(false)
    setDepartamentoSel('EQUIPAMENTOS')
    const opcaoPadrao = TIPOS_FORMULARIO.find(t => t.value === 'ENTRADA')
    setOpcaoTipoSelecionada(opcaoPadrao)
    resetarFormulariosEspecificos()
  }

  const atualizarCampoAjuste = <K extends keyof SnapshotAjusteEquipamento>(campo: K, valor: SnapshotAjusteEquipamento[K]) => {
    setAjusteDirty(true)
    setAjusteEquip((prev) => ({ ...prev, [campo]: valor }))
  }

  async function registrarMovimentoAvancado(ev: React.FormEvent) {
    ev.preventDefault()
    if (departamentoSel !== 'EQUIPAMENTOS') {
      showWarningToast('Apenas Equipamentos podem ser movimentados')
      return
    }
    const opcao = opcaoTipoSelecionada
    if (!opcao) {
      showWarningToast('Selecione um tipo de movimentação')
      return
    }
    if (opcao.apenasAdmin && !isAdmin) {
      showWarningToast('Apenas administradores podem realizar esta operação')
      return
    }
    if (!equipamentoId.trim()) {
      showWarningToast('Informe o equipamento')
      return
    }

    let payload: Record<string, unknown>
    const endpoint = opcao.endpoint || '/api/movimentacoes'

    if (opcao.value === 'MANUTENCAO_ENVIO') {
      const f = formManutEnvio
      if (!f.fornecedorNome.trim()) return showWarningToast('Informe o fornecedor')
      if (!f.dataEnvio) return showWarningToast('Informe a data de envio')
      if (!f.defeitoRelatado.trim()) return showWarningToast('Descreva o defeito relatado')
      payload = {
        equipamentoId,
        tipoMovimento: 'MANUTENCAO_ENVIO',
        dataMovimento: f.dataEnvio ? new Date(f.dataEnvio).toISOString() : new Date().toISOString(),
        origem: origem || undefined,
        destino: destino || undefined,
        observacoes: [f.defeitoRelatado, f.observacoes].filter(Boolean).join('\n') || undefined,
        manutencao: {
          fornecedorNome: f.fornecedorNome.trim() || null,
          fornecedorContato: f.fornecedorContato.trim() || null,
          numeroOS: f.numeroOS.trim() || null,
          tipoServico: f.tipoServico || null,
          tecnicoResponsavel: f.tecnicoResponsavel.trim() || null,
          prazoRetorno: f.prazoRetorno ? new Date(f.prazoRetorno).toISOString() : null,
          laudoTecnico: f.defeitoRelatado.trim() || null,
          pecasTrocadas: null,
          valorServico: null,
          dataRetornoEfetiva: null,
        },
      }
    } else if (opcao.value === 'MANUTENCAO_RETORNO') {
      const f = formManutRetorno
      if (!f.dataRetornoEfetiva) return showWarningToast('Informe a data de retorno')
      if (!f.laudoTecnico.trim() && !f.solucao.trim()) return showWarningToast('Informe o diagnóstico ou a solução')
      const pecas = f.pecasTrocadasTexto
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
      const numeroValor = f.valorServico ? Number.parseFloat(f.valorServico) : Number.NaN
      const valor = !Number.isNaN(numeroValor) ? numeroValor.toFixed(2) : null
      payload = {
        equipamentoId,
        tipoMovimento: 'MANUTENCAO_RETORNO',
        dataMovimento: new Date(f.dataRetornoEfetiva).toISOString(),
        origem: origem || undefined,
        destino: destino || undefined,
        observacoes: [f.laudoTecnico, f.solucao, f.observacoes].filter(Boolean).join('\n') || undefined,
        statusDestino: f.statusFinal,
        manutencao: {
          dataRetornoEfetiva: new Date(f.dataRetornoEfetiva).toISOString(),
          laudoTecnico: f.laudoTecnico.trim() || f.solucao.trim() || null,
          pecasTrocadas: pecas.length ? pecas : null,
          valorServico: valor,
          movimentacaoEnvioId: f.movimentacaoEnvioId.trim() || null,
          numeroOS: null, fornecedorNome: null, fornecedorContato: null, tipoServico: null, tecnicoResponsavel: null, prazoRetorno: null,
        },
      }
    } else if (opcao.value === 'DOACAO') {
      if (doacaoStep === 1) {
        const f = formDoacao
        if (!f.beneficiarioNome.trim()) return showWarningToast('Informe o nome do beneficiário')
        if (!f.dataEntregaEfetiva) return showWarningToast('Informe a data da doação')
        if (!f.motivo.trim()) return showWarningToast('Informe o motivo da doação')
        setDoacaoStep(2)
        setCountdownDoacao(3)
        showInfoToast('Revise os dados antes de confirmar a doação')
        return
      }
      const f = formDoacao
      payload = {
        equipamentoId,
        tipoMovimento: 'DOACAO',
        dataMovimento: new Date(f.dataEntregaEfetiva).toISOString(),
        origem: origem || undefined,
        destino: destino || undefined,
        observacoes: f.motivo.trim() || undefined,
        doacao: {
          beneficiarioNome: f.beneficiarioNome.trim(),
          beneficiarioCpfCnpj: f.beneficiarioCpfCnpj.trim() || null,
          beneficiarioContato: f.beneficiarioContato.trim() || null,
          dataEntregaEfetiva: new Date(f.dataEntregaEfetiva).toISOString(),
          numeroPortaria: f.numeroPortaria.trim() || null,
          enderecoEntrega: f.enderecoEntrega.trim() || null,
          responsavelEntrega: f.responsavelEntrega.trim() || null,
          termoDoacaoUrl: null,
          observacoesInternas: f.observacoesInternas.trim() || null,
        },
      }
    } else if (opcao.value === 'EMPRESTIMO') {
      const f = formEmprestimo
      if (!f.beneficiarioNome.trim()) return showWarningToast('Informe o nome do beneficiário')
      if (!f.dataSaida) return showWarningToast('Informe a data de saída')
      if (!f.dataPrevistaDevolucao) return showWarningToast('Informe a data prevista de devolução')
      payload = {
        equipamentoId,
        tipoMovimento: 'EMPRESTIMO',
        dataMovimento: new Date(f.dataSaida).toISOString(),
        origem: origem || undefined,
        destino: destino || f.localDestino.trim() || undefined,
        observacoes: f.observacoesInternas.trim() || undefined,
        emprestimo: {
          beneficiarioNome: f.beneficiarioNome.trim(),
          beneficiarioDocumento: f.beneficiarioDocumento.trim() || null,
          beneficiarioContato: f.beneficiarioContato.trim() || null,
          tomadorNome: f.tomadorNome.trim() || null,
          tomadorCargo: f.tomadorCargo.trim() || null,
          localDestino: f.localDestino.trim() || null,
          dataSaida: new Date(f.dataSaida).toISOString(),
          dataPrevistaDevolucao: new Date(f.dataPrevistaDevolucao).toISOString(),
          dataDevolucaoEfetiva: null,
          estadoConservacaoSaida: f.estadoConservacaoSaida.trim() || null,
          estadoConservacaoRetorno: null,
          termoAssinado: Boolean(f.termoAssinado),
          termoUrl: f.termoUrl.trim() || null,
          observacoesInternas: f.observacoesInternas.trim() || null,
          movimentacaoSaidaId: null,
        },
      }
    } else if (opcao.value === 'DEVOLUCAO') {
      const f = formDevolucao
      if (!f.dataDevolucaoEfetiva) return showWarningToast('Informe a data de devolução')
      payload = {
        equipamentoId,
        tipoMovimento: 'DEVOLUCAO',
        dataMovimento: new Date(f.dataDevolucaoEfetiva).toISOString(),
        origem: origem || undefined,
        destino: destino || undefined,
        statusDestino: f.statusFinal,
        observacoes: f.observacoesInternas.trim() || undefined,
        emprestimo: {
          dataDevolucaoEfetiva: new Date(f.dataDevolucaoEfetiva).toISOString(),
          estadoConservacaoRetorno: f.estadoConservacaoRetorno.trim() || null,
          movimentacaoSaidaId: f.movimentacaoSaidaId.trim() || null,
        },
      }
    } else if (opcao.value === 'AJUSTE') {
      const ajustePayload: Record<string, unknown> | undefined = ((): Record<string, unknown> | undefined => {
        if (!ajusteDirty) return undefined
        const snapValido = Boolean(snapshotAjuste?.id && snapshotAjuste.id === ajusteEquip.id)
        const origemSnap: SnapshotAjusteEquipamento = snapValido ? (snapshotAjuste as SnapshotAjusteEquipamento) : ajusteVazio()
        const atual = ajusteEquip
        // Sem snapshot confiável: envia todos os campos (backend filtra só o que difere de valor nulo/undefined)
        if (!snapValido) {
          const completo: Record<string, unknown> = {}
          const todos: (keyof SnapshotAjusteEquipamento)[] = [
            'nome','patrimonio','usuarioNome','escolaId','tipo','status','modelo','serial',
            'dataAquisicao','localizacao','macaddress','fabricante','processador','memoria','observacoes'
          ]
          for (const campo of todos) {
            if (campo === 'id' || campo === 'extraidoEm') continue
            const v = atual[campo]
            if (campo === 'escolaId') {
              completo.escolaId = (String(v ?? '').trim() || null)
            } else if (campo === 'dataAquisicao') {
              completo.dataAquisicao = (String(v ?? '').trim() || null)
            } else {
              const str = String(v ?? '').trim()
              completo[campo as string] = str
            }
          }
          completo.marca = completo.fabricante
          return completo
        }
        // Com snapshot válido: envia apenas campos DIFERENTES para evitar sobrescritas acidentais
        const diff: Record<string, unknown> = {}
        const camposComparar: readonly (keyof SnapshotAjusteEquipamento)[] = [
          'nome','patrimonio','usuarioNome','escolaId','tipo','status','modelo','serial',
          'dataAquisicao','localizacao','macaddress','fabricante','processador','memoria','observacoes'
        ] as const
        for (const campo of camposComparar) {
          const valorAtual = atual[campo]
          const valorOrigem = origemSnap[campo]
          if (campo === 'escolaId') {
            const atualStr = String(valorAtual ?? '').trim()
            const origemStr = String(valorOrigem ?? '').trim()
            if (atualStr !== origemStr) {
              diff.escolaId = atualStr || null
            }
            continue
          }
          if (campo === 'dataAquisicao') {
            const atualStr = String(valorAtual ?? '').trim()
            const origemStr = String(valorOrigem ?? '').trim()
            if (atualStr !== origemStr) {
              diff.dataAquisicao = atualStr || null
            }
            continue
          }
          const atualStr = String(valorAtual ?? '').trim()
          const origemStr = String(valorOrigem ?? '').trim()
          if (atualStr !== origemStr) {
            diff[campo as string] = atualStr
          }
        }
        if (diff.fabricante !== undefined && diff.marca === undefined) {
          diff.marca = diff.fabricante
        } else if (diff.marca !== undefined && diff.fabricante === undefined) {
          diff.fabricante = diff.marca
        }
        return Object.keys(diff).length ? diff : undefined
      })()
      payload = {
        equipamentoId,
        tipo: 'AJUSTE',
        tipoMovimento: 'AJUSTE',
        origem: origem || undefined,
        destino: destino || undefined,
        descricao: descricao || undefined,
        observacoes: descricao || undefined,
        ajusteEquipamento: ajustePayload,
      }
      if (data) {
        payload.data = new Date(data).toISOString()
        payload.dataMovimento = payload.data
      }
    } else {
      if (!TIPOS_COMPLETOS.includes(opcao.value as (typeof TIPOS_COMPLETOS)[number])) {
        showWarningToast('Tipo inválido')
        return
      }
      payload = {
        equipamentoId,
        tipo: opcao.value,
        tipoMovimento: opcao.value,
        origem: origem || undefined,
        destino: destino || undefined,
        descricao: descricao || undefined,
        observacoes: descricao || undefined,
      }
      if (data) {
        payload.data = new Date(data).toISOString()
        payload.dataMovimento = payload.data
      }
    }

    try {
      const resp = await api.post(endpoint, payload)
      showSuccessToast(`${opcao.label} registrado(a) com sucesso`)
      setEquipamentoId('')
      setOrigem('')
      setDestino('')
      setData('')
      setDescricao('')
      resetarFormulariosEspecificos()
      setOpcaoTipoSelecionada(TIPOS_FORMULARIO.find(t => t.value === 'ENTRADA'))
      setLista((prev) => [resp.data, ...prev])
      void carregar()
      if (opcao.value === 'DOACAO') setShowCreate(false)
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Falha ao registrar movimentação')
    }
  }

  useEffect(() => {
    if (!showCreate) return
    if (opcaoTipoSelecionada?.value !== 'DOACAO' || doacaoStep !== 2) return
    if (countdownDoacao <= 0) return
    const t = setTimeout(() => setCountdownDoacao((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showCreate, opcaoTipoSelecionada?.value, doacaoStep, countdownDoacao])

  function startEdit(m: Mov) {
    if (!podeEditarMovBaseFn(m)) {
      const msg = equipamentoEDoado(m) && bloquearEditarExcluirDoado
        ? 'Esta movimentação pertence a um equipamento DOADO e não pode ser editada. Ajuste a configuração "Bloquear Editar e Excluir equipamentos Doados" para permitir.'
        : 'Você não tem permissão para editar movimentações.'
      showWarningToast(msg)
      return
    }
    setEditingId(m.id)
    setEditingMov(m)
    setEditEquipamentoId(m.equipamentoId || '')
    setEditTipo(m.tipo || 'ENTRADA')
    setEditOrigem(m.origem || '')
    setEditDestino(m.destino || '')
    setEditData(m.data ? new Date(m.data).toISOString().slice(0, 16) : '')
    setEditDescricao(m.descricao || '')
    showInfoToast('Editando movimentação')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingMov(null)
    setEditEquipamentoId('')
    setEditTipo('ENTRADA')
    setEditOrigem('')
    setEditDestino('')
    setEditData('')
    setEditDescricao('')
  }

  async function salvarEdicao(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editingId) return
    if (!editEquipamentoId.trim()) {
      showWarningToast('Informe o ID do equipamento')
      return
    }
    if (!TIPOS_COMPLETOS.includes(editTipo as (typeof TIPOS_COMPLETOS)[number])) {
      showWarningToast('Tipo inválido')
      return
    }
    const payload: Record<string, unknown> = {
      equipamentoId: editEquipamentoId,
      tipo: editTipo,
      origem: editOrigem || undefined,
      destino: editDestino || undefined,
      descricao: editDescricao || undefined,
    }
    if (editData) payload.data = new Date(editData).toISOString()
    try {
      const resp = await api.put(`/api/movimentacoes/${editingId}`, payload)
      showSuccessToast('Movimentação atualizada')
      setLista((prev) => prev.map((it) => (it.id === editingId ? { ...it, ...resp.data } : it)))
      cancelEdit()
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Falha ao atualizar movimentação')
    }
  }

  async function excluirMov(id: string) {
    const mov = lista.find(m => m.id === id)
    if (mov && !podeExcluirMovBaseFn(mov)) {
      const msg = equipamentoEDoado(mov) && bloquearEditarExcluirDoado
        ? 'Esta movimentação pertence a um equipamento DOADO e não pode ser excluída. Ajuste a configuração "Bloquear Editar e Excluir equipamentos Doados" para permitir.'
        : 'Você não tem permissão para excluir movimentações.'
      showWarningToast(msg)
      return
    }
    try {
      await api.delete(`/api/movimentacoes/${id}`)
      showSuccessToast('Movimentação excluída')
      setLista((prev) => prev.filter((m) => m.id !== id))
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Falha ao excluir movimentação')
    }
  }

  async function handleXLSX() {
    try {
      const XLSX = await import('xlsx-js-style')
      const headers = ['Equipamento','Escola','Tipo','Origem','Destino','Data','Descrição']
      const rows = filtrada.map((m) => [
        m.equipamento?.nome || m.equipamentoId,
        m.escola?.nome || '-',
        m.tipo || '-',
        m.origem || '-',
        m.destino || '-',
        m.data ? new Date(m.data).toLocaleString() : '-',
        m.descricao || '-',
      ])
      const wb = XLSX.utils.book_new()
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [28,24,12,18,18,20,36].map(w => ({ wch: w }))
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c })
        const cell = ws[addr] || { t: 's', v: headers[c] }
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
        ws[addr] = cell
      }
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          const isCenter = c === 2 || c === 5
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
      const finalRow = range.e.r + 2
      const totalAddr = XLSX.utils.encode_cell({ r: finalRow, c: 0 })
      ws[totalAddr] = {
        t: 's',
        v: `Total: ${filtrada.length}`,
        s: { font: { bold: true }, alignment: { horizontal: 'left', vertical: 'center' } }
      }
      ws['!merges'] = (ws['!merges'] || []).concat([{ s: { r: finalRow, c: 0 }, e: { r: finalRow, c: headers.length - 1 } }])
      XLSX.utils.book_append_sheet(wb, ws, 'Movimentacoes')
      const filename = `movimentacoes_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, filename)
      showSuccessToast('XLSX gerado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar XLSX: ${msg}`)
    }
  }

  // Dados filtrados e paginados
  const filtrada = useMemo(() => lista.filter((m) => {
    const texto = `${m.equipamento?.nome || ''} ${m.descricao || ''} ${m.origem || ''} ${m.destino || ''} ${m.equipamentoId} ${m.escola?.nome || ''}`.toLowerCase()
    const matchesText = filterText ? texto.includes(filterText.toLowerCase()) : true
    const matchesTipo = filterTipo === 'ALL' || (m.tipo || '') === filterTipo
    const matchesEscola = filterEscolaId === 'ALL' || (m.escolaId || '') === filterEscolaId
    return matchesText && matchesTipo && matchesEscola
  }), [lista, filterText, filterTipo, filterEscolaId])
  
  const totalPages = Math.max(1, Math.ceil(filtrada.length / pageSize))
  const current = Math.min(currentPage, totalPages)
  const startIdx = (current - 1) * pageSize
  const pagina = filtrada.slice(startIdx, startIdx + pageSize)

  useEffect(() => { carregar() }, [])
  useEffect(() => { carregarItens() }, [carregarItens])
  useEffect(() => { carregarEscolas() }, [carregarEscolas])

  useEffect(() => {
    if (!showCreate) return
    setEquipamentoId('')
    setOrigem('')
    setDestino('')
    setData(formatarDateTimeLocal())
    setDescricao('')
    resetarFormulariosEspecificos()
    setTimeout(() => equipamentoSelectRef.current?.focus(), 0)
  }, [showCreate])

  useEffect(() => {
    const maint = filtrada.filter(m => m.tipo === 'MANUTENCAO').length
    const disc = filtrada.filter(m => m.tipo === 'DESCARTE').length
    setMaintenanceCount(maint)
    setDiscardedCount(disc)
    setExpiredCount(0)
  }, [filtrada, setMaintenanceCount, setDiscardedCount, setExpiredCount])

  useEffect(() => {
    function handleFocusBuscar() {
      setTimeout(() => buscarInputRef.current?.focus(), 0)
    }
    globalThis.addEventListener('focus-buscar', handleFocusBuscar)
    return () => globalThis.removeEventListener('focus-buscar', handleFocusBuscar)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Movimentações</h2>
          <div className="flex w-full sm:w-auto items-center gap-2">
            {loading && <span className="text-sm text-gray-500">Carregando...</span>}
            <button type="button" className="flex-1 sm:flex-none justify-center rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 flex items-center gap-1" onClick={handleXLSX}>
              <span aria-hidden>📊</span>
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
            {!showCreate && (
              <button type="button" className="flex-1 sm:flex-none justify-center rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} aria-hidden />
                <span className="hidden sm:inline">Registrar movimentação</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}
            <button 
              type="button"
              aria-expanded={showFilters}
              aria-controls="movimentacoes-filters"
              aria-label={showFilters ? 'Ocultar filtros de busca' : 'Mostrar filtros de busca'}
              className="sm:hidden rounded border px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} aria-hidden />
            </button>
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        
        <div id="movimentacoes-filters" className={`mb-3 grid gap-2 sm:grid-cols-4 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Buscar</label>
            <input id="filterText" ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} />
          </div>
          <div>
            <label htmlFor="filterTipo" className="mb-1 block text-sm font-medium">Tipo</label>
            <select id="filterTipo" className="w-full rounded border px-3 py-2" value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value as typeof TIPOS_COMPLETOS[number] | 'ALL'); setCurrentPage(1) }}>
              {['ALL', ...TIPOS_COMPLETOS].map(t => <option key={t} value={t}>{t === 'ALL' ? 'Todos' : t.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filterEscola" className="mb-1 block text-sm font-medium">Escola</label>
            <select id="filterEscola" className="w-full rounded border px-3 py-2" value={filterEscolaId} onChange={(e) => { setFilterEscolaId(e.target.value); setCurrentPage(1) }}>
              <option value="ALL">Todas</option>
              {escolasDisponiveis.map((escola) => (
                <option key={escola.id} value={escola.id}>{escola.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pageSize" className="mb-1 block text-sm font-medium">Itens por página</label>
            <select id="pageSize" className="w-full rounded border px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Equipamento</th>
                <th className="border px-3 py-2 text-left">Escola</th>
                <th className="border px-3 py-2 text-left">Tipo</th>
                <th className="border px-3 py-2 text-left">Origem</th>
                <th className="border px-3 py-2 text-left">Destino</th>
                <th className="border px-3 py-2 text-left">Data</th>
                <th className="border px-3 py-2 text-left">Descrição</th>
                <th className="border px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((m) => {
                const eqFmt = formatarNomeEquipamento(m.equipamento)
                const eqId = m.equipamentoId
                const eqHref = eqId ? `/equipamentos/${eqId}/relatorio` : null
                const goEquip = () => eqHref && navigate(eqHref)
                const detalhe = eqFmt.detalhe ? ` (${eqFmt.detalhe})` : ''
                const eqLabel = `${eqFmt.titulo}${detalhe}`
                return (
                <tr key={m.id}>
                  <td className="border px-3 py-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={goEquip}
                          className="text-left font-medium text-blue-700 hover:text-blue-900 hover:underline disabled:no-underline disabled:text-inherit disabled:cursor-default truncate"
                          disabled={!eqHref}
                          title={eqLabel}
                          aria-label={`Abrir relatório do equipamento: ${eqLabel}`}
                        >
                          <span className="truncate">{eqFmt.titulo}</span>
                        </button>
                        {eqHref && (
                          <button
                            type="button"
                            onClick={goEquip}
                            className="text-blue-500 hover:text-blue-700 flex-shrink-0 p-0.5 rounded hover:bg-blue-50"
                            aria-label={`Abrir detalhe do equipamento ${eqLabel} em nova aba do histórico`}
                          >
                            <ExternalLink size={14} aria-hidden />
                          </button>
                        )}
                      </div>
                      {eqFmt.detalhe && (
                        <div className="text-xs text-gray-500 truncate">{eqFmt.detalhe}</div>
                      )}
                      {!m.equipamento && (
                        <div className="text-xs text-gray-400 font-mono truncate" title="ID de referência do equipamento">{m.equipamentoId}</div>
                      )}
                    </div>
                  </td>
                  <td className="border px-3 py-2">{m.escola?.nome || '-'}</td>
                  <td className="border px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${getClasseBadgeTipo(m.tipo)}`}>{m.tipo}</span></td>
                  <td className="border px-3 py-2">{m.origem || '-'}</td>
                  <td className="border px-3 py-2">{m.destino || '-'}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{m.data ? new Date(m.data).toLocaleString() : '-'}</td>
                  <td className="border px-3 py-2 max-w-xs truncate" title={m.descricao || ''}>{m.descricao || '-'}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      {podeEditarMovBaseFn(m) && (
                        <button type="button" className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => startEdit(m)} aria-label={`Editar a movimentação de ${eqLabel}`}>
                          <Pencil size={16} aria-hidden />
                          <span>Editar</span>
                        </button>
                      )}
                      {podeExcluirMovBaseFn(m) && (
                        <button type="button" className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => showConfirmToast('Tem certeza que deseja excluir esta movimentação?', () => excluirMov(m.id))} aria-label={`Excluir (estornar) a movimentação de ${eqLabel}`}>
                          <Trash2 size={16} aria-hidden />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
              {filtrada.length === 0 && !loading && (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan={8}>Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {pagina.map((m) => {
            const eqFmt = formatarNomeEquipamento(m.equipamento)
            const eqId = m.equipamentoId
            const eqHref = eqId ? `/equipamentos/${eqId}/relatorio` : null
            const goEquip = () => eqHref && navigate(eqHref)
            const eqLabelDetalhe = eqFmt.detalhe ? ` (${eqFmt.detalhe})` : ''
            const eqLabel = `${eqFmt.titulo}${eqLabelDetalhe}`
            return (
            <div key={m.id} className="border rounded-lg p-3 bg-white shadow-sm">
              <div className="space-y-2 text-sm">
                <div className="flex justify-start items-start gap-2">
                  <span className="font-medium flex-shrink-0">Equipamento:</span>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={goEquip}
                      className="text-left text-blue-700 hover:text-blue-900 hover:underline disabled:text-inherit disabled:no-underline disabled:cursor-default font-medium truncate w-full"
                      disabled={!eqHref}
                      title={eqLabel}
                    >
                      {eqFmt.titulo}
                    </button>
                    {eqFmt.detalhe && <div className="text-xs text-gray-500 truncate">{eqFmt.detalhe}</div>}
                    {!m.equipamento && <div className="text-xs text-gray-400 font-mono truncate">{m.equipamentoId}</div>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Escola:</span>
                  <span className="text-gray-600">{m.escola?.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tipo:</span>
                  <span className={`px-2 py-1 rounded text-xs ${getClasseBadgeTipo(m.tipo)}`}>{m.tipo}</span>
                </div>
                {m.origem && (
                  <div className="flex justify-between">
                    <span className="font-medium">Origem:</span>
                    <span className="text-gray-600">{m.origem}</span>
                  </div>
                )}
                {m.destino && (
                  <div className="flex justify-between">
                    <span className="font-medium">Destino:</span>
                    <span className="text-gray-600">{m.destino}</span>
                  </div>
                )}
                {m.data && (
                  <div className="flex justify-between">
                    <span className="font-medium">Data:</span>
                    <span className="text-gray-600 whitespace-nowrap">{new Date(m.data).toLocaleString()}</span>
                  </div>
                )}
                {m.descricao && (
                  <div>
                    <span className="font-medium block">Descrição:</span>
                    <span className="text-gray-600 text-xs">{m.descricao}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {podeEditarMovBaseFn(m) && (
                    <button type="button" className="flex-1 rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 text-xs flex items-center justify-center gap-1" onClick={() => startEdit(m)} aria-label={`Editar movimentação de ${eqFmt.titulo}`}>
                      <Pencil size={14} aria-hidden />
                      <span>Editar</span>
                    </button>
                  )}
                  {podeExcluirMovBaseFn(m) && (
                    <button type="button" className="flex-1 rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 text-xs flex items-center justify-center gap-1" onClick={() => showConfirmToast('Tem certeza que deseja excluir esta movimentação?', () => excluirMov(m.id))} aria-label={`Excluir movimentação de ${eqFmt.titulo}`}>
                      <Trash2 size={14} aria-hidden />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
          {filtrada.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">Nenhuma movimentação encontrada.</div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Página {current} de {totalPages}</div>
          <Pagination current={current} totalPages={totalPages} onChange={setCurrentPage} windowSize={5} />
        </div>
      </section>

      {showCreate && (
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl" aria-hidden>
            <Plus size={20} className="text-blue-700" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">Registrar Nova Movimentação</h2>
            <p className="text-xs text-gray-500">Preencha os dados abaixo para lançar uma movimentação de equipamento.</p>
          </div>
        </div>
        <form onSubmit={registrarMovimentoAvancado} className="grid gap-4 p-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Departamento</span>
            </div>
            <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <label htmlFor="dept_equip" className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 transition hover:border-gray-300 hover:bg-white hover:shadow-sm">
                <input id="dept_equip" type="checkbox" className="h-4 w-4 accent-blue-600" checked={departamentoSel === 'EQUIPAMENTOS'} onChange={() => setDepartamentoSel('EQUIPAMENTOS')} aria-label="Selecionar departamento Equipamentos" />
                <span className="text-sm font-medium text-gray-800">🖥️ Equipamentos</span>
              </label>
              <label htmlFor="dept_cm" className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 transition hover:border-gray-300 hover:bg-white hover:shadow-sm">
                <input id="dept_cm" type="checkbox" className="h-4 w-4 accent-blue-600" checked={departamentoSel === 'CENTRO_MIDIA'} onChange={() => setDepartamentoSel('CENTRO_MIDIA')} aria-label="Selecionar departamento Centro de Mídia" />
                <span className="text-sm font-medium text-gray-800">🎬 Centro de Mídia</span>
              </label>
            </div>
          </div>
          <div className="pt-3">
            <label htmlFor="filterEquipType" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Filtrar Equipamento por Tipo</label>
            <select id="filterEquipType" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" value={filterEquipType} onChange={(e) => { setFilterEquipType(e.target.value); setEquipamentoId('') }}>
              <option value="ALL">Todos os tipos</option>
              {tiposDisponiveis.map(t => <option key={t as string} value={t as string}>{t}</option>)}
            </select>
          </div>
          <div className="xl:col-span-3 pt-3">
            <label htmlFor="equipamentoId" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Equipamento <span className="text-red-600">*</span></label>
            <select id="equipamentoId" ref={equipamentoSelectRef} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" value={equipamentoId} onChange={handleEquipamentoChange}>
              <option value="">Selecione um equipamento...</option>
              {equipamentosElegiveisParaTipo
                .filter(eq => filterEquipType === 'ALL' || eq.tipo === filterEquipType)
                .map((eq) => (<option key={eq.id} value={eq.id}>{eq.nome || eq.id}{eq.localizacao ? ` · ${eq.localizacao}` : ''}{eq.status ? ` [${eq.status}]` : ''}</option>))}
            </select>
            <p className="mt-1.5 text-xs text-blue-700/90" role="status" aria-live="polite">{rotuloFiltroEquipamentos}</p>
          </div>

          {/* ETAPA C1: RADIO CARDS TIPO AGRUPADOS POR CATEGORIA (REDESIGN PREMIUM) */}
          <div className="xl:col-span-12 mt-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-700">Tipo de movimentação</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
              {CATEGORIAS_ORDENADAS.map((cat) => {
                const catOpcs = TIPOS_PERMITIDOS_FORM.filter(o => o.categoria === cat)
                if (!catOpcs.length) return null
                const info = ROTULOS_CATEGORIA[cat]
                const paletaCat: Record<CategoriaTipo, {
                  header: string
                  headerIcon: string
                  headerText: string
                  iconBg: string
                  iconText: string
                  cardActiveBg: string
                  cardActiveBorder: string
                  cardActiveRing: string
                }> = {
                  BASICOS: {
                    header: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    headerIcon: 'bg-emerald-100 text-emerald-700',
                    headerText: 'text-emerald-900',
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    iconText: 'text-emerald-800',
                    cardActiveBg: 'bg-emerald-50/70',
                    cardActiveBorder: 'border-emerald-400',
                    cardActiveRing: 'ring-emerald-300/40',
                  },
                  MANUTENCAO: {
                    header: 'bg-amber-50 text-amber-800 border-amber-200',
                    headerIcon: 'bg-amber-100 text-amber-700',
                    headerText: 'text-amber-900',
                    iconBg: 'bg-amber-100 text-amber-600',
                    iconText: 'text-amber-800',
                    cardActiveBg: 'bg-amber-50/70',
                    cardActiveBorder: 'border-amber-400',
                    cardActiveRing: 'ring-amber-300/40',
                  },
                  EMPRESTIMO: {
                    header: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    headerIcon: 'bg-indigo-100 text-indigo-700',
                    headerText: 'text-indigo-900',
                    iconBg: 'bg-indigo-100 text-indigo-600',
                    iconText: 'text-indigo-800',
                    cardActiveBg: 'bg-indigo-50/70',
                    cardActiveBorder: 'border-indigo-400',
                    cardActiveRing: 'ring-indigo-300/40',
                  },
                  DOACAO: {
                    header: 'bg-rose-50 text-rose-800 border-rose-200',
                    headerIcon: 'bg-rose-100 text-rose-700',
                    headerText: 'text-rose-900',
                    iconBg: 'bg-rose-100 text-rose-600',
                    iconText: 'text-rose-800',
                    cardActiveBg: 'bg-rose-50/70',
                    cardActiveBorder: 'border-rose-400',
                    cardActiveRing: 'ring-rose-300/40',
                  },
                  AJUSTES: {
                    header: 'bg-violet-50 text-violet-800 border-violet-200',
                    headerIcon: 'bg-violet-100 text-violet-700',
                    headerText: 'text-violet-900',
                    iconBg: 'bg-violet-100 text-violet-600',
                    iconText: 'text-violet-800',
                    cardActiveBg: 'bg-violet-50/70',
                    cardActiveBorder: 'border-violet-400',
                    cardActiveRing: 'ring-violet-300/40',
                  },
                }
                const pal = paletaCat[cat]
                return (
                  <div
                    key={cat}
                    className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${pal.header.split(' ').find((c) => c.startsWith('border-')) || 'border-gray-200'}`}
                  >
                    <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${pal.header}`}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${pal.headerIcon}`} aria-hidden>
                        {info.icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${pal.headerText}`}>{info.titulo}</p>
                        {info.ajuda && <p className="truncate text-[11px] opacity-80">{info.ajuda}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 p-3">
                      {catOpcs.map((opc) => {
                        const ativo = opcaoTipoSelecionada?.value === opc.value
                        const inputId = `tipo_${opc.value.toLowerCase()}`
                        return (
                          <label
                            key={opc.value}
                            htmlFor={inputId}
                            className={`group relative flex cursor-pointer items-stretch gap-3 overflow-hidden rounded-xl border-2 p-3 transition-all duration-150
                              ${ativo
                                ? `${pal.cardActiveBg} ${pal.cardActiveBorder} shadow-sm ring-4 ${pal.cardActiveRing}`
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'}
                              ${opc.terminal ? 'border-r-transparent' : ''}`}
                          >
                            {opc.terminal && (
                              <span className="absolute inset-y-0 right-0 w-1.5 rounded-r-xl bg-gradient-to-b from-rose-400 to-rose-600" aria-hidden />
                            )}
                            <span className={`pointer-events-none mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg transition
                              ${ativo ? pal.iconBg + ' shadow-inner' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200/80'}`}
                              aria-hidden
                            >
                              {opc.label.replace(/^[^\p{L}\p{N}]+/gu, '').slice(0, 2)}
                            </span>
                            <input
                              id={inputId}
                              type="radio"
                              className="sr-only"
                              name="tipoMov"
                              value={opc.value}
                              checked={ativo}
                              aria-label={`Selecionar tipo de movimentação: ${opc.label}`}
                              onChange={() => {
                                setOpcaoTipoSelecionada(opc)
                                resetarFormulariosEspecificos()
                                if (opc.value === 'AJUSTE' && !equipamentoId.trim()) {
                                  const agora = Date.now()
                                  if (agora - ultimoHintAjusteRef.current > 8000) {
                                    ultimoHintAjusteRef.current = agora
                                    showInfoToast(
                                      <div className="flex flex-col gap-1.5">
                                        <strong>Selecione um equipamento para ajustes</strong>
                                        <p className="m-0 text-xs opacity-90">
                                          Os 15 campos de dados do equipamento serão carregados automaticamente com o snapshot mais recente.
                                        </p>
                                      </div>
                                    )
                                  }
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`text-sm font-semibold ${ativo ? pal.iconText : 'text-gray-800'}`}>
                                  {opc.label.replace(/^[^\p{L}\p{N}]+/gu, '').trim()}
                                </span>
                                {opc.terminal && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                    <span className="h-1 w-1 rounded-full bg-rose-500" aria-hidden />
                                    <span>Terminal</span>
                                  </span>
                                )}
                                {ativo && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pal.headerIcon}`}>
                                    ✓ Selecionado
                                  </span>
                                )}
                              </div>
                              {opc.descricao && (
                                <p className={`mt-0.5 text-xs leading-snug ${ativo ? 'text-gray-600' : 'text-gray-500'}`}>
                                  {opc.descricao}
                                </p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* FORMULÁRIOS ESPECÍFICOS CONDICIONAIS — REDESIGN PREMIUM */}
          {opcaoTipoSelecionada?.value === 'MANUTENCAO_ENVIO' && (
            <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-xl" aria-hidden>🔧</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">Envio para Manutenção</h3>
                  <p className="text-xs text-amber-800/80">Dados do envio do equipamento para fornecedor ou oficina.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label htmlFor="me_origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                  <input id="me_origem" className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                </div>
                <div>
                  <label htmlFor="me_destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                  <input id="me_destino" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Oficina XYZ, Garantia Dell, etc." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_forn">Fornecedor <span className="text-red-600">*</span></label>
                  <input id="m_forn" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.fornecedorNome} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, fornecedorNome: e.target.value })} placeholder="Nome da empresa / técnico / oficina" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_tipo">Tipo de Serviço</label>
                  <select id="m_tipo" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.tipoServico} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, tipoServico: e.target.value })}>
                    {TIPOS_SERVICO_MANUT.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_os">Nº OS</label>
                  <input id="m_os" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.numeroOS} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, numeroOS: e.target.value })} placeholder="Ordem de Serviço" />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_cont">Contato do fornecedor (tel/email)</label>
                  <input id="m_cont" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.fornecedorContato} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, fornecedorContato: e.target.value })} placeholder="(51) 99999-0000 / oficina@empresa.com" />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_tec">Técnico responsável pelo envio</label>
                  <input id="m_tec" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.tecnicoResponsavel} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, tecnicoResponsavel: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_dataenv">Data envio <span className="text-red-600">*</span></label>
                  <input id="m_dataenv" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.dataEnvio} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, dataEnvio: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_prazo">Previsão retorno</label>
                  <input id="m_prazo" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.prazoRetorno} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, prazoRetorno: e.target.value })} />
                </div>
                <div className="xl:col-span-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_def">Defeito / Reclamação relatada <span className="text-red-600">*</span></label>
                  <textarea id="m_def" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.defeitoRelatado} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, defeitoRelatado: e.target.value })} placeholder="Não liga, tela com linhas horizontais, HD não reconhecido etc." />
                </div>
                <div className="xl:col-span-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_obs">Observações adicionais</label>
                  <textarea id="m_obs" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutEnvio.observacoes} onChange={(e) => setFormManutEnvio({ ...formManutEnvio, observacoes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {opcaoTipoSelecionada?.value === 'MANUTENCAO_RETORNO' && (
            <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-xl" aria-hidden>🔩</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">Retorno de Manutenção</h3>
                  <p className="text-xs text-amber-800/80">Dados do retorno do equipamento e status final após o serviço.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="mb-2 flex items-start gap-2 text-xs font-medium text-amber-900">
                    <span aria-hidden>ℹ️</span>
                    <span>Após retorno o equipamento sai de <strong className="font-bold">EM_MANUTENCAO</strong> para o status abaixo selecionado.</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-5">
                    <label htmlFor="m_status_disp" className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 shadow-sm transition hover:border-amber-300 hover:bg-amber-50">
                      <input id="m_status_disp" type="radio" name="m_status_final" value="DISPONIVEL" checked={formManutRetorno.statusFinal === 'DISPONIVEL'} onChange={() => setFormManutRetorno({ ...formManutRetorno, statusFinal: 'DISPONIVEL' })} className="h-4 w-4 accent-emerald-600" aria-label="Status final: Disponível em estoque" />
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                        <span>Disponível em estoque</span>
                      </span>
                    </label>
                    <label htmlFor="m_status_emuso" className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 shadow-sm transition hover:border-amber-300 hover:bg-amber-50">
                      <input id="m_status_emuso" type="radio" name="m_status_final" value="EM_USO" checked={formManutRetorno.statusFinal === 'EM_USO'} onChange={() => setFormManutRetorno({ ...formManutRetorno, statusFinal: 'EM_USO' })} className="h-4 w-4 accent-blue-600" aria-label="Status final: Devolvido para uso" />
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                        <span>Devolvido para uso (EM_USO)</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label htmlFor="mr_origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                  <input id="mr_origem" className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                </div>
                <div>
                  <label htmlFor="mr_destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                  <input id="mr_destino" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Retornou para estoque, setor de TI, etc." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_envid">Envio de manutenção associado</label>
                  <select id="m_envid" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.movimentacaoEnvioId} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, movimentacaoEnvioId: e.target.value })}>
                    <option value="">(vincular depois se preferir)</option>
                    {lista
                      .filter((m) => (m.tipo || '').includes('MANUTENCAO') && m.equipamentoId === equipamentoId)
                      .map((m) => (<option key={m.id} value={m.id}>Envio #{m.id.slice(0,8)} — {m.data ? new Date(m.data).toLocaleDateString('pt-BR') : ''} {m.origem ? `· Origem: ${m.origem}` : ''}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_dataret">Data retorno efetiva <span className="text-red-600">*</span></label>
                  <input id="m_dataret" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.dataRetornoEfetiva} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, dataRetornoEfetiva: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_valor">Valor serviço (R$)</label>
                  <input id="m_valor" inputMode="decimal" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" placeholder="0,00" value={formManutRetorno.valorServico} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, valorServico: e.target.value.replace(',', '.') })} />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_laudo">Diagnóstico / Laudo técnico <span className="text-red-600">*</span></label>
                  <textarea id="m_laudo" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.laudoTecnico} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, laudoTecnico: e.target.value })} placeholder="Defeito constatado: placa-mãe com capacitor estufado..." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_sol">Solução / Serviço executado</label>
                  <textarea id="m_sol" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.solucao} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, solucao: e.target.value })} placeholder="Troca de placa-mãe; atualização BIOS; limpeza e nova pasta térmica..." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_pecas">Peças trocadas (1 por linha)</label>
                  <textarea id="m_pecas" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.pecasTrocadasTexto} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, pecasTrocadasTexto: e.target.value })} placeholder={["Placa-mãe Dell 08XXKJ","SSD Kingston NV2 512GB","Pasta térmica Arctic MX-4"].join('\n')} />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="m_obsr">Observações gerais</label>
                  <textarea id="m_obsr" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" value={formManutRetorno.observacoes} onChange={(e) => setFormManutRetorno({ ...formManutRetorno, observacoes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {opcaoTipoSelecionada?.value === 'DOACAO' && doacaoStep === 1 && (
            <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-rose-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-rose-200 bg-rose-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-xl" aria-hidden>❤️</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-900">Doação</h3>
                  <p className="text-xs text-rose-800/80">Dados do beneficiário e entrega do equipamento doado.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-rose-900">
                    <span aria-hidden>⚠️</span>
                    <span>Doação é um movimento terminal. Após confirmação o equipamento receberá status <strong className="font-bold">DOADO</strong> e não poderá participar de movimentos operacionais (exceto AJUSTE).</span>
                  </p>
                </div>
                <div>
                  <label htmlFor="do_origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                  <input id="do_origem" className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                </div>
                <div>
                  <label htmlFor="do_destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                  <input id="do_destino" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Entrega na sede da associação, retirada no campus, etc." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_ben">Nome do beneficiário <span className="text-red-600">*</span></label>
                  <input id="d_ben" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.beneficiarioNome} onChange={(e) => setFormDoacao({ ...formDoacao, beneficiarioNome: e.target.value })} placeholder="Entidade / Pessoa Física" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_cpf">CPF / CNPJ</label>
                  <input id="d_cpf" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.beneficiarioCpfCnpj} onChange={(e) => setFormDoacao({ ...formDoacao, beneficiarioCpfCnpj: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_cont">Contato beneficiário</label>
                  <input id="d_cont" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.beneficiarioContato} onChange={(e) => setFormDoacao({ ...formDoacao, beneficiarioContato: e.target.value })} placeholder="Fone / email responsável" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_data">Data da doação <span className="text-red-600">*</span></label>
                  <input id="d_data" type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.dataEntregaEfetiva} onChange={(e) => setFormDoacao({ ...formDoacao, dataEntregaEfetiva: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_port">Nº Portaria / Ofício</label>
                  <input id="d_port" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.numeroPortaria} onChange={(e) => setFormDoacao({ ...formDoacao, numeroPortaria: e.target.value })} placeholder="ato jurídico da doação" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_resp">Responsável recebimento</label>
                  <input id="d_resp" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.responsavelEntrega} onChange={(e) => setFormDoacao({ ...formDoacao, responsavelEntrega: e.target.value })} placeholder="quem recebeu na entidade" />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_end">Endereço de entrega</label>
                  <input id="d_end" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.enderecoEntrega} onChange={(e) => setFormDoacao({ ...formDoacao, enderecoEntrega: e.target.value })} />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_motivo">Motivo da doação <span className="text-red-600">*</span></label>
                  <textarea id="d_motivo" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.motivo} onChange={(e) => setFormDoacao({ ...formDoacao, motivo: e.target.value })} placeholder="Equipamento excedente após upgrade, destinado à escola X de comunidade carente..." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_int">Observações internas (não públicas)</label>
                  <textarea id="d_int" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200" value={formDoacao.observacoesInternas} onChange={(e) => setFormDoacao({ ...formDoacao, observacoesInternas: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {opcaoTipoSelecionada?.value === 'DOACAO' && doacaoStep === 2 && (() => {
            const eq = equipamentos.find(e => e.id === equipamentoId)
            const eqDetalhe = lista.find(m => m.equipamentoId === equipamentoId)?.equipamento
            const eqNome = eqDetalhe?.nome || eq?.nome || `Equipamento #${equipamentoId.slice(0,8)}`
            const eqPatrimonio = eqDetalhe?.patrimonio
            const eqSerial = eqDetalhe?.serial
            const eqModelo = eqDetalhe?.modelo
            const eqMarca = eqDetalhe?.marca || eqDetalhe?.fabricante
            const eqEscola = (lista.find(m => m.equipamentoId === equipamentoId && m.escola?.nome)?.escola?.nome) || 'não informado'
            const eqStatus = eqDetalhe?.status || 'desconhecido'
            return (
              <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-rose-200 bg-rose-50/80 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-xl" aria-hidden>⚠️</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-rose-900">Confirmação Obrigatória de Doação</h3>
                    <p className="text-xs text-rose-800/80">Revise os dados abaixo antes de confirmar a transferência definitiva.</p>
                  </div>
                </div>
                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 md:grid-cols-2 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Equipamento</span>
                      <span className="font-semibold text-gray-900">{eqNome}{eqModelo ? ` · ${eqModelo}` : ''}{eqMarca ? ` (${eqMarca})` : ''}</span>
                    </div>
                    {eqPatrimonio && (
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Patrimônio</span>
                        <span className="font-semibold text-gray-900">{eqPatrimonio}</span>
                      </div>
                    )}
                    {eqSerial && (
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Nº Série</span>
                        <span className="font-mono text-sm text-gray-900">{eqSerial}</span>
                      </div>
                    )}
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Escola atual</span>
                      <span className="text-gray-800">{eqEscola}</span>
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Status agora</span>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getClasseBadgeTipo(eqStatus)||'bg-slate-200 text-slate-800'}`}>{eqStatus}</span>
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">Status após confirmação</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" aria-hidden />
                        <span>DOADO</span>
                      </span>
                    </div>
                  </div>
                  <dl className="grid md:grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Beneficiário</dt>
                      <dd className="mt-0.5 font-medium text-gray-900">{formDoacao.beneficiarioNome}</dd>
                    </div>
                    {formDoacao.beneficiarioCpfCnpj && (
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">CPF/CNPJ</dt>
                        <dd className="mt-0.5 text-gray-800">{formDoacao.beneficiarioCpfCnpj}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Data doação</dt>
                      <dd className="mt-0.5 text-gray-800">{new Date(formDoacao.dataEntregaEfetiva).toLocaleDateString('pt-BR')}</dd>
                    </div>
                    {formDoacao.numeroPortaria && (
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Portaria/Ofício</dt>
                        <dd className="mt-0.5 text-gray-800">{formDoacao.numeroPortaria}</dd>
                      </div>
                    )}
                    {formDoacao.motivo && (
                      <div className="md:col-span-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Motivo</dt>
                        <dd className="mt-0.5 text-gray-800">{formDoacao.motivo}</dd>
                      </div>
                    )}
                  </dl>
                  <div className={`rounded-xl border p-4 ${countdownDoacao > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-rose-200 bg-rose-50/50'}`}>
                    <p className={`text-sm font-medium ${countdownDoacao > 0 ? 'text-amber-900' : 'text-rose-900'}`}>
                      {countdownDoacao > 0
                        ? (
                            <span className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900" aria-live="polite">{countdownDoacao}</span>
                              Aguarde {countdownDoacao}s para confirmar (evita clique acidental)
                            </span>
                          )
                        : 'Confirme a doação. Esta ação é auditável e o equipamento sairá do inventário operacional.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      onClick={() => { setDoacaoStep(1); setCountdownDoacao(3) }}
                    >← Voltar e editar</button>
                    <button
                      type="submit"
                      disabled={countdownDoacao > 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >🔴 Confirmar Doação — Irreversível</button>
                  </div>
                </div>
              </div>
            )
          })()}

          {opcaoTipoSelecionada?.value === 'EMPRESTIMO' && (
            <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-indigo-200 bg-indigo-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-xl" aria-hidden>🤝</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Saída de Empréstimo</h3>
                  <p className="text-xs text-indigo-800/80">Dados do beneficiário, tomador e condições do empréstimo temporário.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label htmlFor="em_origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                  <input id="em_origem" className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                </div>
                <div>
                  <label htmlFor="em_destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                  <input id="em_destino" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Escola X, Setor Y, Reunião Z, etc." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_ben">Nome do beneficiário / setor <span className="text-red-600">*</span></label>
                  <input id="e_ben" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.beneficiarioNome} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, beneficiarioNome: e.target.value })} placeholder="Pessoa física ou órgão/setor receptor" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_doc">Documento (CPF/CNPJ)</label>
                  <input id="e_doc" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.beneficiarioDocumento} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, beneficiarioDocumento: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_cont">Contato (fone/email)</label>
                  <input id="e_cont" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.beneficiarioContato} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, beneficiarioContato: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_tom">Tomador / Responsável</label>
                  <input id="e_tom" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.tomadorNome} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, tomadorNome: e.target.value })} placeholder="Nome da pessoa que está recebendo" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_carg">Cargo do tomador</label>
                  <input id="e_carg" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.tomadorCargo} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, tomadorCargo: e.target.value })} />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_local">Local / Destino do empréstimo</label>
                  <input id="e_local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.localDestino} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, localDestino: e.target.value })} placeholder="Sala de reuniões, Escola X, Setor Y" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_saida">Data saída <span className="text-red-600">*</span></label>
                  <input id="e_saida" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.dataSaida} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, dataSaida: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_prev">Previsão de retorno <span className="text-red-600">*</span></label>
                  <input id="e_prev" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.dataPrevistaDevolucao} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, dataPrevistaDevolucao: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_cons">Estado conservação (saída)</label>
                  <select id="e_cons" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.estadoConservacaoSaida} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, estadoConservacaoSaida: e.target.value })}>
                    {['NOVO','BOM','REGULAR','RUIM','DANIFICADO'].map(o => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex w-full items-center gap-3 h-[42px] rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-0">
                    <label htmlFor="e_term" className="flex w-full cursor-pointer items-center gap-3 text-sm font-medium text-indigo-900 h-full">
                      <input id="e_term" type="checkbox" className="h-4 w-4 accent-indigo-600 shrink-0" checked={formEmprestimo.termoAssinado} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, termoAssinado: e.target.checked })} aria-label="Termo de empréstimo assinado" />
                      <span>Termo de empréstimo assinado</span>
                    </label>
                  </div>
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_url">URL do termo (opcional)</label>
                  <input id="e_url" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.termoUrl} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, termoUrl: e.target.value })} placeholder="https://drive.../termo-emprestimo.pdf" />
                </div>
                <div className="xl:col-span-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="e_int">Observações internas</label>
                  <textarea id="e_int" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formEmprestimo.observacoesInternas} onChange={(e) => setFormEmprestimo({ ...formEmprestimo, observacoesInternas: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {opcaoTipoSelecionada?.value === 'DEVOLUCAO' && (
            <div className="xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 border-indigo-300 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-indigo-200 bg-indigo-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-xl" aria-hidden>↩️</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Devolução de Empréstimo</h3>
                  <p className="text-xs text-indigo-800/80">Dados do retorno do equipamento e estado após o empréstimo.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                  <p className="mb-3 flex items-start gap-2 text-xs font-medium text-indigo-900">
                    <span aria-hidden>ℹ️</span>
                    <span>Após devolução o equipamento sai de <strong className="font-bold">EMPRESTADO</strong> para o status abaixo selecionado.</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label htmlFor="e_status_disp" className="flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50">
                      <input id="e_status_disp" type="radio" name="e_status_final" value="DISPONIVEL" checked={formDevolucao.statusFinal === 'DISPONIVEL'} onChange={() => setFormDevolucao({ ...formDevolucao, statusFinal: 'DISPONIVEL' })} className="h-4 w-4 accent-emerald-600" aria-label="Status final após devolução: Disponível em estoque" />
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                        <span>Disponível em estoque</span>
                      </span>
                    </label>
                    <label htmlFor="e_status_emuso" className="flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50">
                      <input id="e_status_emuso" type="radio" name="e_status_final" value="EM_USO" checked={formDevolucao.statusFinal === 'EM_USO'} onChange={() => setFormDevolucao({ ...formDevolucao, statusFinal: 'EM_USO' })} className="h-4 w-4 accent-blue-600" aria-label="Status final após devolução: Devolvido para uso" />
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                        <span>Devolvido para uso (EM_USO)</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label htmlFor="dv_origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                  <input id="dv_origem" className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                </div>
                <div>
                  <label htmlFor="dv_destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                  <input id="dv_destino" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Devolvido para estoque, setor de origem, etc." />
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_said">Empréstimo associado (opcional)</label>
                  <select id="d_said" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formDevolucao.movimentacaoSaidaId} onChange={(e) => setFormDevolucao({ ...formDevolucao, movimentacaoSaidaId: e.target.value })}>
                    <option value="">(vincular depois se preferir)</option>
                    {lista
                      .filter((m) => (m.tipo === 'EMPRESTIMO') && m.equipamentoId === equipamentoId)
                      .map((m) => (<option key={m.id} value={m.id}>Empréstimo #{m.id.slice(0,8)} — {m.data ? new Date(m.data).toLocaleDateString('pt-BR') : ''}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_datadev">Data devolução efetiva <span className="text-red-600">*</span></label>
                  <input id="d_datadev" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formDevolucao.dataDevolucaoEfetiva} onChange={(e) => setFormDevolucao({ ...formDevolucao, dataDevolucaoEfetiva: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_conr">Estado conservação (retorno)</label>
                  <select id="d_conr" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formDevolucao.estadoConservacaoRetorno} onChange={(e) => setFormDevolucao({ ...formDevolucao, estadoConservacaoRetorno: e.target.value })}>
                    {['NOVO','BOM','REGULAR','RUIM','DANIFICADO'].map(o => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600" htmlFor="d_intd">Observações internas</label>
                  <textarea id="d_intd" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={formDevolucao.observacoesInternas} onChange={(e) => setFormDevolucao({ ...formDevolucao, observacoesInternas: e.target.value })} placeholder="Itens devolvidos incompletos, avarias detectadas no retorno, etc." />
                </div>
              </div>
            </div>
          )}

          {/* FORM BÁSICO para tipos antigos (mantido para retrocompatibilidade) */}
          {opcaoTipoSelecionada && ['ENTRADA','SAIDA','TRANSFERENCIA','DESCARTE','MANUTENCAO'].includes(opcaoTipoSelecionada.value) && (() => {
            const cor = (() => {
              switch (opcaoTipoSelecionada.categoria) {
                case 'BASICOS':  return { border: 'border-emerald-200', header: 'bg-emerald-50/80 border-emerald-200', headerText: 'text-emerald-900', headerSub: 'text-emerald-800/80', headerIcon: 'bg-emerald-100', headerIconEmoji: '📦', focusRing: 'focus:ring-emerald-200', focusBorder: 'focus:border-emerald-400' }
                case 'AJUSTES':  return { border: 'border-violet-200', header: 'bg-violet-50/80 border-violet-200', headerText: 'text-violet-900', headerSub: 'text-violet-800/80', headerIcon: 'bg-violet-100', headerIconEmoji: '⚙️', focusRing: 'focus:ring-violet-200', focusBorder: 'focus:border-violet-400' }
                default:         return { border: 'border-slate-200', header: 'bg-slate-50/80 border-slate-200', headerText: 'text-slate-900', headerSub: 'text-slate-800/80', headerIcon: 'bg-slate-100', headerIconEmoji: '📋', focusRing: 'focus:ring-slate-200', focusBorder: 'focus:border-slate-400' }
              }
            })()
            return (
              <div className={`xl:col-span-12 mt-4 overflow-hidden rounded-2xl border-2 ${cor.border} bg-white shadow-sm`}>
                <div className={`flex items-center gap-3 border-b ${cor.header} px-5 py-3`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${cor.headerIcon} text-xl`} aria-hidden>{cor.headerIconEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-bold uppercase tracking-wide ${cor.headerText}`}>{opcaoTipoSelecionada.label.replace(/^[^\p{L}\p{N}]+/gu, '').trim()}</h3>
                    <p className={`text-xs ${cor.headerSub}`}>Campos básicos de localização e data da movimentação.</p>
                  </div>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label htmlFor="origem" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Origem</label>
                    <input id="origem" className={`w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm ${cor.focusRing} ${cor.focusBorder}`} value={origem} readOnly title="Origem automática pela localização atual do equipamento" />
                  </div>
                  <div>
                    <label htmlFor="destino" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Destino</label>
                    <input id="destino" className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${cor.focusRing} ${cor.focusBorder}`} value={destino} onChange={(e) => setDestino(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="createData" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Data</label>
                    <input id="createData" type="datetime-local" className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${cor.focusRing} ${cor.focusBorder}`} value={data} onChange={(e) => setData(e.target.value)} />
                  </div>
                  <div className="xl:col-span-2">
                    <label htmlFor="createDescricao" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Descrição</label>
                    <input id="createDescricao" className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${cor.focusRing} ${cor.focusBorder}`} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                  </div>
                </div>
              </div>
            )
          })()}

          {opcaoTipoSelecionada?.value === 'AJUSTE' && snapshotAjuste && (
            <div className="xl:col-span-12 mt-5 overflow-hidden rounded-2xl border-2 border-violet-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-violet-200 bg-violet-50/80 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-xl" aria-hidden>⚙️</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-violet-900">Ajuste dos dados do equipamento</h3>
                    {ajusteDirty && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800" title="Campos foram alterados neste ajuste">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Alterado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-800/80">
                    Dados carregados do último snapshot do equipamento e prontos para correção.
                    Snapshot extraído em: <span className="font-mono font-medium">{snapshotAjuste.extraidoEm}</span>
                  </p>
                </div>
              </div>
              <div className="grid gap-x-5 gap-y-4 p-5 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label htmlFor="ajust-nome" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Nome do equipamento</label>
                  <input id="ajust-nome" type="text" value={ajusteEquip.nome} onChange={(e) => atualizarCampoAjuste('nome', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-patrimonio" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Patrimônio</label>
                  <input id="ajust-patrimonio" type="text" value={ajusteEquip.patrimonio} onChange={(e) => atualizarCampoAjuste('patrimonio', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-tipo" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Tipo</label>
                  <select id="ajust-tipo" value={ajusteEquip.tipo} onChange={(e) => atualizarCampoAjuste('tipo', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    <option value="">Selecione…</option>
                    {TIPOS_EQUIPAMENTO_AJUSTE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ajust-status" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</label>
                  <select id="ajust-status" value={ajusteEquip.status} onChange={(e) => atualizarCampoAjuste('status', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    <option value="">Selecione…</option>
                    {STATUS_EQUIPAMENTO_MOV.map((s) => (
                      <option key={s} value={s}>{LABEL_STATUS_EQUIPAMENTO_MOV[s] || s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ajust-escolaId" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Escola</label>
                  <select id="ajust-escolaId" value={ajusteEquip.escolaId} onChange={(e) => {
                    const opc = escolasDisponiveis.find((sc) => sc.id === e.target.value)
                    atualizarCampoAjuste('escolaId', e.target.value)
                    atualizarCampoAjuste('escolaNome', opc?.nome || '')
                  }}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    <option value="">Selecione…</option>
                    {escolasDisponiveis.map((sc) => <option key={sc.id} value={sc.id}>{sc.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ajust-modelo" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Modelo</label>
                  <input id="ajust-modelo" type="text" value={ajusteEquip.modelo} onChange={(e) => atualizarCampoAjuste('modelo', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-serial" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Número de Série</label>
                  <input id="ajust-serial" type="text" value={ajusteEquip.serial} onChange={(e) => atualizarCampoAjuste('serial', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-localizacao" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Localização</label>
                  <input id="ajust-localizacao" type="text" value={ajusteEquip.localizacao} onChange={(e) => atualizarCampoAjuste('localizacao', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-fabricante" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Fabricante</label>
                  <input id="ajust-fabricante" type="text" value={ajusteEquip.fabricante} onChange={(e) => atualizarCampoAjuste('fabricante', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-usuarioNome" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Usuário atual</label>
                  <input id="ajust-usuarioNome" type="text" value={ajusteEquip.usuarioNome} onChange={(e) => atualizarCampoAjuste('usuarioNome', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-dataAquisicao" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Data de Aquisição</label>
                  <input id="ajust-dataAquisicao" type="date" value={ajusteEquip.dataAquisicao} onChange={(e) => atualizarCampoAjuste('dataAquisicao', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-macaddress" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">MAC Address</label>
                  <input id="ajust-macaddress" type="text" value={ajusteEquip.macaddress} onChange={(e) => atualizarCampoAjuste('macaddress', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-processador" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Processador</label>
                  <input id="ajust-processador" type="text" value={ajusteEquip.processador} onChange={(e) => atualizarCampoAjuste('processador', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label htmlFor="ajust-memoria" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Memória</label>
                  <input id="ajust-memoria" type="text" value={ajusteEquip.memoria} onChange={(e) => atualizarCampoAjuste('memoria', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div className="md:col-span-2 xl:col-span-5">
                  <label htmlFor="ajust-observacoes" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-600">Observações</label>
                  <textarea id="ajust-observacoes" rows={3} value={ajusteEquip.observacoes} onChange={(e) => atualizarCampoAjuste('observacoes', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 xl:col-span-4 mt-5 flex flex-col sm:flex-row gap-3 sm:justify-start border-t pt-5 border-gray-100">
            <button type="button" onClick={() => { cancelCreate(); setTimeout(() => buscarInputRef.current?.focus(), 0) }} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">
              <X size={16} />
              <span>Fechar</span>
            </button>
            <button type="button" onClick={carregar} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300">
              <RotateCcw size={16} />
              <span>Recarregar</span>
            </button>
            {(!(opcaoTipoSelecionada?.value === 'DOACAO' && doacaoStep === 2)) && (
              <button type="submit" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
                <Save size={16} />
                <span>{opcaoTipoSelecionada?.value === 'DOACAO' ? 'Avançar para confirmação' : 'Salvar Movimentação'}</span>
              </button>
            )}
          </div>
        </form>
      </section>
      )}

      {editingId && editingMov && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          {(() => {
            const statusAtual = statusEquipamentoDaMov(editingMov)
            const regra = regraStatusOrDefaultMov(statusAtual)
            const statusLabel = LABEL_STATUS_EQUIPAMENTO_MOV[statusAtual] || statusAtual
            const severidade = COR_BANNER_POR_SEVERIDADE_MOV[regra.severidade]
            const editaveis = regra.camposEditaveis
            const somenteLeitura = (campo: string): boolean => !podeEditarCampoEditMov(campo, editaveis)
            const classeLeitura = 'bg-gray-50 text-gray-600 cursor-not-allowed border-gray-200'
            return (
              <>
                <div className={`mb-4 rounded-xl border ${severidade.wrapper} p-3 sm:p-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">Editar Movimentação</h2>
                        <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${CLASSE_BADGE_STATUS_EDIT_MOV[statusAtual] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                          {statusLabel}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${severidade.badge} ${severidade.badgeTexto}`}>
                          {regra.tituloBadge}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 leading-6">{regra.descricao}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-gray-500">
                        Campos editáveis: <strong className="text-gray-800">{editaveis.length}</strong> de 6
                      </span>
                      <span className="text-gray-500">
                        Tipo de movimentação: <strong className="text-gray-800">{editingMov.tipo || '—'}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <form onSubmit={salvarEdicao} className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label htmlFor="editEquipamentoId" className="mb-1 block text-sm font-medium">Equipamento</label>
                    <select id="editEquipamentoId" className={`w-full rounded border px-3 py-2 ${somenteLeitura('equipamentoId') ? classeLeitura : ''}`} value={editEquipamentoId} disabled={somenteLeitura('equipamentoId')} tabIndex={somenteLeitura('equipamentoId') ? -1 : 0} aria-disabled={somenteLeitura('equipamentoId')} onChange={(e) => setEditEquipamentoId(e.target.value)}>
                      <option value="">Selecione...</option>
                      {equipamentos.map((eq) => (
                        <option key={eq.id} value={eq.id}>{eq.nome || eq.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="editTipo" className="mb-1 block text-sm font-medium">Tipo</label>
                    <select id="editTipo" className={`w-full rounded border px-3 py-2 ${somenteLeitura('tipo') ? classeLeitura : ''}`} value={editTipo} disabled={somenteLeitura('tipo')} tabIndex={somenteLeitura('tipo') ? -1 : 0} aria-disabled={somenteLeitura('tipo')} onChange={(e) => setEditTipo(e.target.value)}>
                      {TIPOS_PERMITIDOS_NA_CRIACAO.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="editOrigem" className="mb-1 block text-sm font-medium">Origem</label>
                    <input id="editOrigem" className={`w-full rounded border px-3 py-2 ${somenteLeitura('origem') ? classeLeitura : ''}`} value={editOrigem} readOnly={somenteLeitura('origem')} tabIndex={somenteLeitura('origem') ? -1 : 0} aria-readonly={somenteLeitura('origem')} onChange={(e) => setEditOrigem(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="editDestino" className="mb-1 block text-sm font-medium">Destino</label>
                    <input id="editDestino" className={`w-full rounded border px-3 py-2 ${somenteLeitura('destino') ? classeLeitura : ''}`} value={editDestino} readOnly={somenteLeitura('destino')} tabIndex={somenteLeitura('destino') ? -1 : 0} aria-readonly={somenteLeitura('destino')} onChange={(e) => setEditDestino(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="editData" className="mb-1 block text-sm font-medium">Data</label>
                    <input id="editData" type="datetime-local" className={`w-full rounded border px-3 py-2 ${somenteLeitura('data') ? classeLeitura : ''}`} value={editData} readOnly={somenteLeitura('data')} tabIndex={somenteLeitura('data') ? -1 : 0} aria-readonly={somenteLeitura('data')} onChange={(e) => setEditData(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="editDescricao" className="mb-1 block text-sm font-medium">
                      Descrição
                      {somenteLeitura('descricao') ? null : <span className="ml-2 text-xs font-normal text-emerald-700">(sempre disponível para ajustes)</span>}
                    </label>
                    <input id="editDescricao" className={`w-full rounded border px-3 py-2 ${somenteLeitura('descricao') ? classeLeitura : ''}`} value={editDescricao} readOnly={somenteLeitura('descricao')} tabIndex={somenteLeitura('descricao') ? -1 : 0} aria-readonly={somenteLeitura('descricao')} onChange={(e) => setEditDescricao(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:justify-start gap-2">
                    <button type="submit" aria-label="Salvar alterações da movimentação" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
                      <Save size={16} aria-hidden="true" />
                      <span>Salvar alterações</span>
                    </button>
                    <button type="button" aria-label="Cancelar edição da movimentação" onClick={cancelEdit} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
                  </div>
                </form>
              </>
            )
          })()}
        </section>
      )}
      
    </div>
  )
}
