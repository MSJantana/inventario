import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Save, RotateCcw, AlertTriangle, Barcode } from 'lucide-react'
import Pagination from '../components/Pagination'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast, showConfirmToast } from '../utils/toast'
import { getValidityYears } from '../services/settings'
import { useAppStore } from '../store/useAppStore'
import EquipmentIdCard from '../components/EquipmentIdCard'

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
  return (
    <tr key={item.id}>
      <td className="border px-3 py-2 text-center">{item.nome || item.nomeEquipamento || '-'}</td>
      <td className="border px-3 py-2 text-center">{item.usuarioNome || '-'}</td>
      <td className="border px-3 py-2 text-center">{item.status || '-'}</td>
      <td className="border px-3 py-2 text-center">
        <div className={`flex items-center justify-center gap-1 ${isExpired(item.dataAquisicao) ? 'text-red-600 font-bold' : ''}`}>
          {formatData(item.dataAquisicao)}
          {isExpired(item.dataAquisicao) && <span title="Validade vencida"><AlertTriangle size={16} /></span>}
        </div>
      </td>
      <td className="border px-3 py-2 text-center">{item.escola?.nome || '-'}</td>
      <td className="border px-3 py-2 text-center">
        <div className="flex justify-center gap-2">
          <button className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 flex items-center gap-1" onClick={() => onViewIdCard(item)} title="Visualizar Identificação">
            <Barcode size={16} />
            <span>Identificação</span>
          </button>
          <button className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => onEdit(item)}>
            <Pencil size={16} />
            <span>Editar</span>
          </button>
          <button className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => onDelete(item.id)}>
            <Trash2 size={16} />
            <span>Excluir</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

function EquipamentoCard({ item, onEdit, onDelete, onViewIdCard }: { readonly item: Equipamento, readonly onEdit: (e: Equipamento) => void, readonly onDelete: (id: string) => void, readonly onViewIdCard: (e: Equipamento) => void }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">{item.nome || item.nomeEquipamento || '-'}</h3>
          <p className="text-xs text-gray-500">{item.status || '-'}</p>
          <p className={`text-xs ${isExpired(item.dataAquisicao) ? 'text-red-600 font-bold flex items-center gap-1' : 'text-gray-500'}`}>
            Aquisição: {formatData(item.dataAquisicao)}
            {isExpired(item.dataAquisicao) && <AlertTriangle size={12} />}
          </p>
          <p className="text-xs text-gray-500">Usuário: {item.usuarioNome || '-'}</p>
        </div>
        <span className="text-xs text-gray-500">{item.escola?.nome || '-'}</span>
      </div>
      <div className="flex gap-2 pt-2">
        <button className="flex-1 rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-700 flex items-center justify-center gap-1" onClick={() => onViewIdCard(item)} title="Visualizar Identificação">
          <Barcode size={14} />
          <span>Identificação</span>
        </button>
        <button className="flex-1 rounded bg-yellow-600 px-2 py-1 text-white text-xs hover:bg-yellow-700 flex items-center justify-center gap-1" onClick={() => onEdit(item)}>
          <Pencil size={14} />
          <span>Editar</span>
        </button>
        <button className="flex-1 rounded bg-red-600 px-2 py-1 text-white text-xs hover:bg-red-700 flex items-center justify-center gap-1" onClick={() => onDelete(item.id)}>
          <Trash2 size={14} />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  )
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

  // Visualização de Comprovante (ID Card)
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null)

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
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
      setError((e as Error)?.message || 'Erro ao carregar equipamentos')
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
      showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao criar equipamento')
    }
  }

  function startEdit(e: Equipamento) {
    setEditingId(e.id)
    setEditNome(e.nome || e.nomeEquipamento || '')
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
      showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao atualizar equipamento')
    }
  }

  async function excluirEquipamento(id: string) {
    try {
      await api.delete(`/api/equipamentos/${id}`)
      showSuccessToast('Equipamento excluído')
      setLista((prev) => prev.filter((e) => e.id !== id))
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao excluir equipamento')
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
              <button className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                <span>Criar equipamento</span>
              </button>
            )}
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Filtrar por nome, usuário ou sigla</label>
            <input ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} placeholder="Digite nome do equipamento, usuário, escola ou sigla" />
          </div>
          <div>
            <label htmlFor="filterStatus" className="mb-1 block text-sm font-medium">Status</label>
            <select className="w-full rounded border px-3 py-2" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              {['ALL','DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'Todos' : s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pageSize" className="mb-1 block text-sm font-medium">Itens por página</label>
            <select className="w-full rounded border px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
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
        <form onSubmit={criarEquipamento} className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="nome" className="mb-1 block text-sm font-medium">Nome</label>
            <input ref={nomeInputRef} className="w-full rounded border px-3 py-2" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label htmlFor="usuarioNome" className="mb-1 block text-sm font-medium">Nome do Usuário</label>
            <input className="w-full rounded border px-3 py-2" value={usuarioNome} onChange={(e) => setUsuarioNome(e.target.value)} />
          </div>
          <div>
            <label htmlFor="escolaId" className="mb-1 block text-sm font-medium">Escola</label>
            <select className="w-full rounded border px-3 py-2" value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
              <option value="">Selecione...</option>
              {escolas.map((esc) => (
                <option key={esc.id} value={esc.id}>{esc.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tipo" className="mb-1 block text-sm font-medium">Tipo</label>
            <select className="w-full rounded border px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
            <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="modelo" className="mb-1 block text-sm font-medium">Modelo</label>
            <input className="w-full rounded border px-3 py-2" value={modelo} onChange={(e) => setModelo(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="serial" className="mb-1 block text-sm font-medium">Serial</label>
            <input className="w-full rounded border px-3 py-2" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="dataAquisicao" className="mb-1 block text-sm font-medium">Data de Aquisição</label>
            <input type="date" className="w-full rounded border px-3 py-2" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} />
          </div>
          <div>
            <label htmlFor="localizacao" className="mb-1 block text-sm font-medium">Localização</label>
            <input className="w-full rounded border px-3 py-2" value={localizacao} onChange={(e) => setLocalizacao(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="fabricante" className="mb-1 block text-sm font-medium">Fabricante</label>
            <input className="w-full rounded border px-3 py-2" value={fabricante} onChange={(e) => setFabricante(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="processador" className="mb-1 block text-sm font-medium">Processador</label>
            <input className="w-full rounded border px-3 py-2" value={processador} onChange={(e) => setProcessador(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="memoria" className="mb-1 block text-sm font-medium">Memória</label>
            <input className="w-full rounded border px-3 py-2" value={memoria} onChange={(e) => setMemoria(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="macAddress" className="mb-1 block text-sm font-medium">MAC Address</label>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="AA:BB:CC:DD:EE:FF"
              value={macAddress}
              onChange={(e) => {
                setMacAddress(formatMac(e.target.value))
              }}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <label htmlFor="observacoes" className="mb-1 block text-sm font-medium">Observações</label>
            <input className="w-full rounded border px-3 py-2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2">
            <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
              <Save size={16} />
              <span>Salvar</span>
            </button>
            <button type="button" onClick={carregar} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2">
              <RotateCcw size={16} />
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
            <div>
              <label htmlFor="editNome" className="mb-1 block text-sm font-medium">Nome</label>
              <input ref={editNomeInputRef} className="w-full rounded border px-3 py-2" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="editUsuarioNome" className="mb-1 block text-sm font-medium">Nome do Usuário</label>
              <input className="w-full rounded border px-3 py-2" value={editUsuarioNome} onChange={(e) => setEditUsuarioNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="editEscolaId" className="mb-1 block text-sm font-medium">Escola</label>
              <select className="w-full rounded border px-3 py-2" value={editEscolaId} onChange={(e) => setEditEscolaId(e.target.value)}>
                <option value="">Selecione...</option>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>{esc.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="editTipo" className="mb-1 block text-sm font-medium">Tipo</label>
              <select className="w-full rounded border px-3 py-2" value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                {['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editStatus" className="mb-1 block text-sm font-medium">Status</label>
              <select className="w-full rounded border px-3 py-2" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editModelo" className="mb-1 block text-sm font-medium">Modelo</label>
              <input className="w-full rounded border px-3 py-2" value={editModelo} onChange={(e) => setEditModelo(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editSerial" className="mb-1 block text-sm font-medium">Serial</label>
              <input className="w-full rounded border px-3 py-2" value={editSerial} onChange={(e) => setEditSerial(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editDataAquisicao" className="mb-1 block text-sm font-medium">Data de Aquisição</label>
              <input type="date" className="w-full rounded border px-3 py-2" value={editDataAquisicao} onChange={(e) => setEditDataAquisicao(e.target.value)} />
            </div>
            <div>
              <label htmlFor="editLocalizacao" className="mb-1 block text-sm font-medium">Localização</label>
              <input className="w-full rounded border px-3 py-2" value={editLocalizacao} onChange={(e) => setEditLocalizacao(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editFabricante" className="mb-1 block text-sm font-medium">Fabricante</label>
              <input className="w-full rounded border px-3 py-2" value={editFabricante} onChange={(e) => setEditFabricante(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editProcessador" className="mb-1 block text-sm font-medium">Processador</label>
              <input className="w-full rounded border px-3 py-2" value={editProcessador} onChange={(e) => setEditProcessador(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editMemoria" className="mb-1 block text-sm font-medium">Memória</label>
              <input className="w-full rounded border px-3 py-2" value={editMemoria} onChange={(e) => setEditMemoria(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editMacAddress" className="mb-1 block text-sm font-medium">MAC Address</label>
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={editMacAddress}
                onChange={(e) => setEditMacAddress(e.target.value.toUpperCase())}
                onBlur={() => setEditMacAddress(formatMac(editMacAddress))}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <label htmlFor="editObservacoes" className="mb-1 block text-sm font-medium">Observações</label>
              <input className="w-full rounded border px-3 py-2" value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2">
              <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
                <Save size={16} />
                <span>Salvar alterações</span>
              </button>
              <button type="button" onClick={() => { cancelEdit(); setTimeout(() => buscarInputRef.current?.focus(), 0) }} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
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
              className="rounded border px-2 py-1 text-xs"
              disabled={current <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >Anterior</button>
            <span className="text-xs px-2 py-1 rounded border bg-blue-600 text-white">
              {current}
            </span>
            <button
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
