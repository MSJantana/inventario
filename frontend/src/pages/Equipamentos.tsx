import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Save, RotateCcw } from 'lucide-react'
import Pagination from '../components/Pagination'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } from '../utils/toast'

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
  const nomeInputRef = useRef<HTMLInputElement | null>(null)

  // Modal de confirmação de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
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
    if (!nome.trim() || !modelo.trim() || !serial.trim() || !dataAquisicao) {
      showWarningToast('Preencha Nome, Modelo, Serial e Data de Aquisição')
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
      }
      await api.post('/api/equipamentos', payload)
      showSuccessToast('Equipamento criado')
      setNome('')
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
      await carregar()
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao criar equipamento')
    }
  }

  function startEdit(e: Equipamento) {
    setEditingId(e.id)
    setEditNome(e.nome || e.nomeEquipamento || '')
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
    } finally {
      setDeleteId(null)
    }
  }

  // Dados filtrados e paginados
  const filtrada = lista.filter((e) => {
    const nome = (e.nome || e.nomeEquipamento || '').toLowerCase()
    const texto = filterText.toLowerCase()
    const matchesText = filterText ? (
      nome.includes(texto) ||
      (e.escola?.nome || '').toLowerCase().includes(texto) ||
      (e.escola?.sigla || '').toLowerCase().includes(texto)
    ) : true
    const matchesStatus = filterStatus === 'ALL' ? true : (e.status || '') === filterStatus
    return matchesText && matchesStatus
  })
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
    setLista((prev) =>
      prev.map((e) => {
        if (!e.escola && e.escolaId) {
          const esc = escolas.find((s) => s.id === e.escolaId)
          return esc ? { ...e, escola: { nome: esc.nome, sigla: esc.sigla } } : e
        }
        return e
      }),
    )
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
            {!showCreate ? (
              <button className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                <span>Criar equipamento</span>
              </button>
            ) : null}
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Filtrar por nome ou sigla</label>
            <input ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} placeholder="Digite nome do equipamento, escola ou sigla" />
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
                <th className="border px-3 py-2 text-left">Nome</th>
                <th className="border px-3 py-2 text-left">Status</th>
                <th className="border px-3 py-2 text-left">Escola</th>
                <th className="border px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((e) => (
                <tr key={e.id}>
                  <td className="border px-3 py-2">{e.nome || e.nomeEquipamento || '-'}</td>
                  <td className="border px-3 py-2">{e.status || '-'}</td>
                  <td className="border px-3 py-2">{e.escola?.nome || '-'}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => startEdit(e)}>
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>
                      <button className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => setDeleteId(e.id)}>
                        <Trash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
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
            <div key={e.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{e.nome || e.nomeEquipamento || '-'}</h3>
                  <p className="text-xs text-gray-500">{e.status || '-'}</p>
                </div>
                <span className="text-xs text-gray-500">{e.escola?.nome || '-'}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 rounded bg-yellow-600 px-2 py-1 text-white text-xs hover:bg-yellow-700 flex items-center justify-center gap-1" onClick={() => startEdit(e)}>
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>
                <button className="flex-1 rounded bg-red-600 px-2 py-1 text-white text-xs hover:bg-red-700 flex items-center justify-center gap-1" onClick={() => setDeleteId(e.id)}>
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
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
          <div className="md:col-span-2 lg:col-span-3">
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
            <button type="button" onClick={() => { setShowCreate(false); setTimeout(() => buscarInputRef.current?.focus(), 0) }} className="w-full sm:w-auto rounded border px-4 py-2 hover:bg-gray-50">
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
              <label htmlFor="editModelo" className="mb-1 block text-sm font-medium">Modelo</label>
              <input className="w-full rounded border px-3 py-2" value={editModelo} onChange={(e) => setEditModelo(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editSerial" className="mb-1 block text-sm font-medium">Serial</label>
              <input className="w-full rounded border px-3 py-2" value={editSerial} onChange={(e) => setEditSerial(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label htmlFor="editStatus" className="mb-1 block text-sm font-medium">Status</label>
              <select className="w-full rounded border px-3 py-2" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
            <div className="md:col-span-2 lg:col-span-3">
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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mb-4 text-sm text-gray-700">Esta ação é permanente. Tem certeza que deseja excluir o equipamento?</p>
            <div className="flex justify-end gap-2">
              <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 flex items-center gap-2" onClick={() => deleteId && excluirEquipamento(deleteId)}>
                <Trash2 size={16} />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
