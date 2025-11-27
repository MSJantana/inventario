import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Save, RotateCcw } from 'lucide-react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast'

type Item = {
  id: string
  nome?: string
  tipo?: string
  modelo?: string
  serial?: string
  status?: string
  escolaId?: string
  escola?: { nome?: string }
}

type Escola = { id: string; nome: string }

const TIPOS = ['AUDIO','VIDEO','CAMERA','MICROFONE','ILUMINACAO','OUTRO'] as const
const STATUS = ['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO'] as const

export default function CentroMidiaPage() {
  const [lista, setLista] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<typeof TIPOS[number]>('OUTRO')
  const [modelo, setModelo] = useState('')
  const [serial, setSerial] = useState('')
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const nomeInputRef = useRef<HTMLInputElement | null>(null)
  const buscarInputRef = useRef<HTMLInputElement | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTipo, setEditTipo] = useState<typeof TIPOS[number]>('OUTRO')
  const [editModelo, setEditModelo] = useState('')
  const [editSerial, setEditSerial] = useState('')
  const [editEscolaId, setEditEscolaId] = useState('')
  const editNomeInputRef = useRef<HTMLInputElement | null>(null)

  function readLocal(): Item[] {
    try { return JSON.parse(localStorage.getItem('cm_items') || '[]') ?? [] } catch { return [] }
  }
  function writeLocal(items: Item[]) { try { localStorage.setItem('cm_items', JSON.stringify(items)) } catch { /* ignore */ } }

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await api.get('/api/centro-midia')
      setLista(resp.data || [])
      setCurrentPage(1)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        const local = readLocal()
        setLista(local)
      } else {
        setError((e as Error)?.message || 'Erro ao carregar itens')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarEscolas = useCallback(async () => {
    try {
      const resp = await api.get('/api/escolas')
      setEscolas(resp.data || [])
    } catch { setEscolas([]) }
  }, [])

  async function criarItem(ev: React.FormEvent) {
    ev.preventDefault()
    if (!nome.trim() || !modelo.trim() || !serial.trim()) {
      showWarningToast('Preencha Nome, Modelo e Serial')
      return
    }
    try {
      const payload: Record<string, unknown> = { nome, tipo, modelo, serial, escolaId: escolaId || undefined }
      await api.post('/api/centro-midia', payload)
      showSuccessToast('Item criado')
      await carregar()
      setNome(''); setTipo('OUTRO'); setModelo(''); setSerial(''); setEscolaId('')
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        const newItem: Item = {
          id: String(Date.now()), nome, tipo, modelo, serial, escolaId: escolaId || undefined as unknown as string,
        }
        const next = [newItem, ...lista]
        setLista(next)
        writeLocal(next)
        showSuccessToast('Item criado (armazenado localmente)')
        setNome(''); setTipo('OUTRO'); setModelo(''); setSerial(''); setEscolaId('')
        await carregar()
      } else {
        showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao criar item')
      }
    }
  }

  function startEdit(i: Item) {
    setEditingId(i.id)
    setEditNome(i.nome || '')
    setEditTipo((i.tipo as typeof TIPOS[number]) || 'OUTRO')
    setEditModelo(i.modelo || '')
    setEditSerial(i.serial || '')
    setEditEscolaId(i.escolaId || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNome('')
    setEditTipo('OUTRO')
    setEditModelo('')
    setEditSerial('')
    setEditEscolaId('')
  }

  async function salvarEdicao(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editingId) return
    if (!editNome.trim()) { showWarningToast('Preencha Nome'); return }
    try {
      const payload: Record<string, unknown> = {
        nome: editNome, tipo: editTipo, modelo: editModelo || undefined, serial: editSerial || undefined, escolaId: editEscolaId || undefined
      }
      await api.put(`/api/centro-midia/${editingId}`, payload)
      showSuccessToast('Item atualizado')
      await carregar()
      cancelEdit()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        const next = lista.map(it => it.id === editingId ? {
          ...it,
          nome: editNome,
          tipo: editTipo,
          modelo: editModelo || undefined,
          serial: editSerial || undefined,
          escolaId: editEscolaId || undefined,
        } : it)
        setLista(next)
        writeLocal(next)
        showSuccessToast('Item atualizado (armazenado localmente)')
        cancelEdit()
        await carregar()
      } else {
        showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao atualizar item')
      }
    }
  }

  async function excluirItem(id: string) {
    try {
      await api.delete(`/api/centro-midia/${id}`)
      showSuccessToast('Item excluído')
      await carregar()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        const next = lista.filter(i => i.id !== id)
        setLista(next)
        writeLocal(next)
        showSuccessToast('Item excluído (armazenado localmente)')
        await carregar()
      } else {
        showErrorToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao excluir item')
      }
    }
  }

  const filtrada = lista.filter((i) => {
    const nome = (i.nome || '').toLowerCase()
    const matchesText = filterText ? nome.includes(filterText.toLowerCase()) : true
    const matchesStatus = filterStatus === 'ALL' ? true : (i.status || '') === filterStatus
    return matchesText && matchesStatus
  })
  const totalPages = Math.max(1, Math.ceil(filtrada.length / pageSize))
  const current = Math.min(currentPage, totalPages)
  const startIdx = (current - 1) * pageSize
  const pagina = filtrada.slice(startIdx, startIdx + pageSize)

  useEffect(() => { carregar(); carregarEscolas() }, [carregar, carregarEscolas])
  useEffect(() => { if (showCreate) setTimeout(() => nomeInputRef.current?.focus(), 0) }, [showCreate])
  useEffect(() => { if (editingId) setTimeout(() => editNomeInputRef.current?.focus(), 0) }, [editingId])

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Centro de Midia</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-sm text-gray-500">Carregando...</span>}
            {!showCreate ? (
              <button className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                <span>Criar item</span>
              </button>
            ) : null}
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Filtrar por nome</label>
            <input ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} />
          </div>
          <div>
            <label htmlFor="filterStatus" className="mb-1 block text-sm font-medium">Status</label>
            <select className="w-full rounded border px-3 py-2" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              {(['ALL', ...STATUS] as string[]).map(s => <option key={s} value={s}>{s === 'ALL' ? 'Todos' : s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pageSize" className="mb-1 block text-sm font-medium">Itens por página</label>
            <select className="w-full rounded border px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Nome</th>
                <th className="border px-3 py-2 text-left">Tipo</th>
                <th className="border px-3 py-2 text-left">Status</th>
                <th className="border px-3 py-2 text-left">Escola</th>
                <th className="border px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((i) => (
                <tr key={i.id}>
                  <td className="border px-3 py-2">{i.nome || '-'}</td>
                  <td className="border px-3 py-2">{i.tipo || '-'}</td>
                  <td className="border px-3 py-2">{i.status || '-'}</td>
                  <td className="border px-3 py-2">{i.escola?.nome || '-'}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => startEdit(i)}>
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>
                      <button className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => excluirItem(i.id)}>
                        <Trash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrada.length === 0 && !loading && (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan={5}>Nenhum item encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Página {current} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button className="rounded border px-3 py-1" disabled={current <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <button className="rounded border px-3 py-1" disabled={current >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Próxima</button>
          </div>
        </div>
      </section>

      {showCreate && (
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Criar Item</h2>
        <form onSubmit={criarItem} className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
            <select className="w-full rounded border px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value as typeof TIPOS[number])}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
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
          <h2 className="mb-3 text-lg font-medium">Editar Item</h2>
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
              <select className="w-full rounded border px-3 py-2" value={editTipo} onChange={(e) => setEditTipo(e.target.value as typeof TIPOS[number])}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
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
    </div>
  )
}
