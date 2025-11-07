import { useEffect, useState } from 'react'
import { Pencil, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/axios'

type Escola = {
  id: string
  nome: string
  sigla: string
  endereco?: string
  cidade: string
  estado: string
  cep?: string
  telefone?: string
  email?: string
  diretor?: string
  observacoes?: string
}
type EstadoOption = { id: number; sigla: string; nome: string }
type CidadeOption = { id: number; nome: string }

export default function EscolasPage() {
  const [lista, setLista] = useState<Escola[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // filtros e paginação
  const [filterText, setFilterText] = useState('')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  // criação
  const [nome, setNome] = useState('')
  const [sigla, setSigla] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [diretor, setDiretor] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [estados, setEstados] = useState<EstadoOption[]>([])
  const [cidades, setCidades] = useState<CidadeOption[]>([])
  const [showCreate, setShowCreate] = useState(false)

  // edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editSigla, setEditSigla] = useState('')
  const [editEndereco, setEditEndereco] = useState('')
  const [editCidade, setEditCidade] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editCep, setEditCep] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDiretor, setEditDiretor] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')

  // helpers de máscara/validação
  function formatTelefone(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    const ddd = digits.slice(0, 2)
    const resto = digits.slice(2)
    if (resto.length <= 4) return `(${ddd}) ${resto}`
    if (digits.length >= 11) {
      const a = resto.slice(0, 5)
      const b = resto.slice(5)
      return `(${ddd}) ${a}-${b}`
    } else {
      const a = resto.slice(0, 4)
      const b = resto.slice(4)
      return `(${ddd}) ${a}-${b}`
    }
  }
  function isTelefoneValido(input: string) {
    const digits = input.replace(/\D/g, '')
    return digits.length === 10 || digits.length === 11
  }
  function formatCep(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  function isCepValido(input: string) {
    return /^\d{5}-\d{3}$/.test(input)
  }
  function isEmailValido(input: string) {
    if (!input.trim()) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
  }

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const resp = await api.get('/api/escolas')
      setLista(resp.data || [])
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (e as Error)?.message ||
        'Erro ao carregar escolas'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])
  // Carregar lista de estados via IBGE
  useEffect(() => {
    async function carregarEstados() {
      try {
        const resp = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
        const data = await resp.json()
        setEstados(data.map((e: { id: number; sigla: string; nome: string }) => ({ id: e.id, sigla: e.sigla, nome: e.nome })))
      } catch {
        // silencioso: fallback continuará permitindo digitação manual se necessário
      }
    }
    carregarEstados()
  }, [])

  async function carregarCidadesByUF(ufSigla: string) {
    try {
      const found = estados.find((e) => e.sigla === ufSigla)
      if (!found) { setCidades([]); return }
      const resp = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${found.id}/municipios?orderBy=nome`)
      const data = await resp.json()
      setCidades(data.map((c: { id: number; nome: string }) => ({ id: c.id, nome: c.nome })))
    } catch {
      setCidades([])
    }
  }
  // derivados: filtrar e paginar
  const normalized = filterText.trim().toLowerCase()
  const filtered = normalized
    ? lista.filter((e) =>
        [e.nome, e.sigla, e.cidade, e.estado]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(normalized))
      )
    : lista
  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])
  const startIndex = (currentPage - 1) * pageSize
  const paginated = filtered.slice(startIndex, startIndex + pageSize)

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium">Escolas</h2>
        {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>
      {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Buscar:</label>
          <input
            className="w-64 rounded border px-3 py-2"
            placeholder="Nome, sigla, cidade, estado"
            value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Itens por página:</label>
          <select
            className="rounded border px-2 py-2"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600">{totalItems} resultado(s)</span>
          <button
            type="button"
            className="ml-2 rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 flex items-center gap-1"
            onClick={() => setShowCreate((v) => !v)}
          >{showCreate ? (<><X size={16} /><span>Fechar</span></>) : '+ Adicionar Escola'}</button>
        </div>
      </div>
      {/* Tabela para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">Nome</th>
              <th className="border px-3 py-2 text-left">Sigla</th>
              <th className="border px-3 py-2 text-left">Cidade</th>
              <th className="border px-3 py-2 text-left">Estado</th>
              <th className="border px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((e) => (
              <tr key={e.id}>
                <td className="border px-3 py-2">{e.nome}</td>
                <td className="border px-3 py-2">{e.sigla}</td>
                <td className="border px-3 py-2">{e.cidade}</td>
                <td className="border px-3 py-2">{e.estado}</td>
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
            {filtered.length === 0 && !loading && (
              <tr>
                <td className="border px-3 py-4 text-center" colSpan={5}>Nenhuma escola encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards para mobile */}
      <div className="md:hidden divide-y divide-gray-200">
        {paginated.map((e) => (
          <div key={e.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">{e.nome}</h3>
                <p className="text-xs text-gray-500">{e.sigla}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
              <div>
                <span className="font-medium">Cidade:</span>
                <p>{e.cidade}</p>
              </div>
              <div>
                <span className="font-medium">Estado:</span>
                <p>{e.estado}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center justify-center gap-1" 
                onClick={() => startEdit(e)}
              >
                <Pencil size={14} />
                <span>Editar</span>
              </button>
              <button 
                className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1" 
                onClick={() => setDeleteId(e.id)}
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="p-4 text-center text-sm text-gray-600">
            Nenhuma escola encontrada.
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-700">Página {currentPage} de {totalPages}</div>
        <div className="flex gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >Anterior</button>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >Próxima</button>
        </div>
      </div>

      {showCreate && (
      <section className="mt-6">
        <h3 className="mb-2 text-md font-semibold">Adicionar Nova Escola</h3>
        <form onSubmit={criarEscola} className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input className="w-full rounded border px-3 py-2" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sigla</label>
            <input className="w-full rounded border px-3 py-2" value={sigla} onChange={(e) => setSigla(e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Endereço</label>
            <input className="w-full rounded border px-3 py-2" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <select className="w-full rounded border px-3 py-2" value={estado} onChange={(e) => { const uf = e.target.value; setEstado(uf); setCidade(''); carregarCidadesByUF(uf) }}>
              <option value="">Selecione o estado (UF)</option>
              {estados.map((uf) => (
                <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <select className="w-full rounded border px-3 py-2" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={!estado}>
              <option value="">Selecione a cidade</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CEP</label>
            <input className="w-full rounded border px-3 py-2" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} placeholder="00000-000" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input className="w-full rounded border px-3 py-2" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))} placeholder="(DD) XXXXX-XXXX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input className="w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Diretor</label>
            <input className="w-full rounded border px-3 py-2" value={diretor} onChange={(e) => setDiretor(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Observações</label>
            <textarea className="w-full rounded border px-3 py-2" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
            <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
              <Save size={16} />
              <span>Salvar</span>
            </button>
            <button type="button" onClick={cancelCreate} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
          </div>
        </form>
      </section>
      )}

      {editingId && (
        <section className="mt-6">
          <h3 className="mb-2 text-md font-semibold">Editar Escola</h3>
          <form onSubmit={salvarEdicao} className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input className="w-full rounded border px-3 py-2" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sigla</label>
            <input className="w-full rounded border px-3 py-2" value={editSigla} onChange={(e) => setEditSigla(e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Endereço</label>
            <input className="w-full rounded border px-3 py-2" value={editEndereco} onChange={(e) => setEditEndereco(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <select className="w-full rounded border px-3 py-2" value={editEstado} onChange={(e) => { const uf = e.target.value; setEditEstado(uf); setEditCidade(''); carregarCidadesByUF(uf) }}>
              <option value="">Selecione o estado (UF)</option>
              {estados.map((uf) => (
                <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <select className="w-full rounded border px-3 py-2" value={editCidade} onChange={(e) => setEditCidade(e.target.value)} disabled={!editEstado}>
              <option value="">Selecione a cidade</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CEP</label>
            <input className="w-full rounded border px-3 py-2" value={editCep} onChange={(e) => setEditCep(formatCep(e.target.value))} placeholder="00000-000" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input className="w-full rounded border px-3 py-2" value={editTelefone} onChange={(e) => setEditTelefone(formatTelefone(e.target.value))} placeholder="(DD) XXXXX-XXXX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input className="w-full rounded border px-3 py-2" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@dominio.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Diretor</label>
            <input className="w-full rounded border px-3 py-2" value={editDiretor} onChange={(e) => setEditDiretor(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Observações</label>
            <textarea className="w-full rounded border px-3 py-2" rows={3} value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
            <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
              <Save size={16} />
              <span>Salvar</span>
            </button>
            <button type="button" onClick={cancelEdit} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
          </div>
        </form>
        </section>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mb-4 text-sm text-gray-700">Esta ação é permanente. Tem certeza que deseja excluir a escola?</p>
            <div className="flex justify-end gap-2">
              <button className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 flex items-center gap-2" onClick={() => deleteId && excluirEscola(deleteId)}>
                <Trash2 size={16} />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  
  async function criarEscola(ev: React.FormEvent) {
    ev.preventDefault()
    if (!nome.trim() || !sigla.trim() || !endereco.trim() || !cidade.trim() || !estado.trim() || !cep.trim()) {
      toast.error('Preencha Nome, Sigla, Endereço, Cidade, Estado e CEP')
      return
    }
    if (estado.trim().length !== 2) {
      toast.error('Estado deve ter 2 letras (UF)')
      return
    }
    if (!isCepValido(cep)) {
      toast.error('CEP inválido. Use 00000-000')
      return
    }
    if (telefone && !isTelefoneValido(telefone)) {
      toast.error('Telefone inválido. Use DDD + número (10 ou 11 dígitos)')
      return
    }
    if (!isEmailValido(email)) {
      toast.error('Email em formato inválido')
      return
    }
    try {
      await api.post('/api/escolas', { nome, sigla, endereco, cidade, estado, cep, telefone, email, diretor, observacoes })
      toast.success('Escola criada')
      setNome(''); setSigla(''); setEndereco(''); setCidade(''); setEstado(''); setCep(''); setTelefone(''); setEmail(''); setDiretor(''); setObservacoes('')
      setShowCreate(false)
      await carregar()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao criar escola')
    }
  }

  function startEdit(e: Escola) {
    setEditingId(e.id)
    setEditNome(e.nome)
    setEditSigla(e.sigla)
    setEditEndereco(e.endereco || '')
    setEditCidade(e.cidade)
    setEditEstado(e.estado)
    setEditCep(e.cep || '')
    setEditTelefone(e.telefone || '')
    setEditEmail(e.email || '')
    setEditDiretor(e.diretor || '')
    setEditObservacoes(e.observacoes || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNome('')
    setEditSigla('')
    setEditEndereco('')
    setEditCidade('')
    setEditEstado('')
    setEditCep('')
    setEditTelefone('')
    setEditEmail('')
    setEditDiretor('')
    setEditObservacoes('')
  }

  async function salvarEdicao(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editingId) return
    if (!editNome.trim() || !editSigla.trim() || !editEndereco.trim() || !editCidade.trim() || !editEstado.trim() || !editCep.trim()) {
      toast.error('Preencha Nome, Sigla, Endereço, Cidade, Estado e CEP')
      return
    }
    if (editEstado.trim().length !== 2) {
      toast.error('Estado deve ter 2 letras (UF)')
      return
    }
    if (!isCepValido(editCep)) {
      toast.error('CEP inválido. Use 00000-000')
      return
    }
    if (editTelefone && !isTelefoneValido(editTelefone)) {
      toast.error('Telefone inválido. Use DDD + número (10 ou 11 dígitos)')
      return
    }
    if (!isEmailValido(editEmail)) {
      toast.error('Email em formato inválido')
      return
    }
    try {
      await api.put(`/api/escolas/${editingId}`, { nome: editNome, sigla: editSigla, endereco: editEndereco, cidade: editCidade, estado: editEstado, cep: editCep, telefone: editTelefone, email: editEmail, diretor: editDiretor, observacoes: editObservacoes })
      toast.success('Escola atualizada')
      cancelEdit()
      await carregar()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao atualizar escola')
    }
  }

  async function excluirEscola(id: string) {
    try {
      await api.delete(`/api/escolas/${id}`)
      toast.success('Escola excluída')
      await carregar()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao excluir escola')
    } finally {
      setDeleteId(null)
    }
  }
  function cancelCreate() {
    setShowCreate(false)
    setNome('')
    setSigla('')
    setEndereco('')
    setCidade('')
    setEstado('')
    setCep('')
    setTelefone('')
    setEmail('')
    setDiretor('')
    setObservacoes('')
  }
}