import { useEffect, useRef, useState, useCallback } from 'react'
import Pagination from '../components/Pagination'
import { Plus, Pencil, Trash2, Save, RotateCcw, X } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast, showConfirmToast } from '../utils/toast'

type Mov = {
  id: string
  equipamentoId: string
  equipamento?: { nome?: string }
  tipo?: string
  origem?: string
  destino?: string
  data?: string
  descricao?: string
  escolaId?: string
  escola?: { nome?: string }
}

type EquipamentoOption = { id: string; nome?: string }

const TIPOS = ['ENTRADA','SAIDA','TRANSFERENCIA','MANUTENCAO','DESCARTE'] as const

export default function MovimentacoesPage() {
  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([])
  const [departamentoSel, setDepartamentoSel] = useState<'EQUIPAMENTOS' | 'CENTRO_MIDIA'>('EQUIPAMENTOS')
  const [showCreate, setShowCreate] = useState(false)
  const equipamentoSelectRef = useRef<HTMLSelectElement | null>(null)
  const buscarInputRef = useRef<HTMLInputElement | null>(null)

  const [equipamentoId, setEquipamentoId] = useState('')
  const [tipo, setTipo] = useState<string>('ENTRADA')
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [data, setData] = useState<string>('')
  const [descricao, setDescricao] = useState('')

  // Filtros e paginação
  const [filterText, setFilterText] = useState('')
  const [filterTipo, setFilterTipo] = useState<'ALL' | typeof TIPOS[number]>('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEquipamentoId, setEditEquipamentoId] = useState('')
  const [editTipo, setEditTipo] = useState<string>('ENTRADA')
  const [editOrigem, setEditOrigem] = useState('')
  const [editDestino, setEditDestino] = useState('')
  const [editData, setEditData] = useState<string>('')
  const [editDescricao, setEditDescricao] = useState('')
  const role = (localStorage.getItem('userRole') as 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO') || 'USUARIO'
  const isAdmin = role === 'ADMIN'

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
    try {
      if (departamentoSel === 'CENTRO_MIDIA') {
        const resp = await api.get('/api/centro-midia')
        const data: EquipamentoOption[] = (resp.data || []).map((i: { id: string; nome?: string }) => ({ id: i.id, nome: i.nome }))
        setEquipamentos(data)
      } else {
        const resp = await api.get('/api/equipamentos')
        const data: EquipamentoOption[] = (resp.data || []).map((e: { id: string; nome?: string; nomeEquipamento?: string }) => ({ id: e.id, nome: e.nome || e.nomeEquipamento }))
        setEquipamentos(data)
      }
    } catch {
      void 0
    }
  }, [departamentoSel])

  async function criar(ev: React.FormEvent) {
    ev.preventDefault()
    if (departamentoSel !== 'EQUIPAMENTOS') {
      showWarningToast('Apenas Equipamentos podem ser movimentados')
      return
    }
    if (!equipamentoId.trim()) {
      showWarningToast('Informe o ID do equipamento')
      return
    }
    if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
      showWarningToast('Tipo inválido')
      return
    }
    const payload: Record<string, unknown> = { equipamentoId, tipo, origem: origem || undefined, destino: destino || undefined, descricao: descricao || undefined }
    if (data) {
      payload.data = new Date(data).toISOString()
    }
    try {
      const resp = await api.post('/api/movimentacoes', payload)
      showSuccessToast('Movimentação registrada')
      setEquipamentoId('')
      setOrigem('')
      setDestino('')
      setData('')
      setDescricao('')
      setLista((prev) => [resp.data, ...prev])
    } catch (e: unknown) {
      showErrorToast((e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Falha ao registrar movimentação')
    }
  }

  useEffect(() => {
    if (showCreate) {
      setTimeout(() => equipamentoSelectRef.current?.focus(), 0)
    }
  }, [showCreate])

  function startEdit(m: Mov) {
    setEditingId(m.id)
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
    if (!TIPOS.includes(editTipo as (typeof TIPOS)[number])) {
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
      const headers = ['Equipamento','Tipo','Origem','Destino','Data','Descrição']
      const rows = filtrada.map((m) => [
        m.equipamento?.nome || m.equipamentoId,
        m.tipo || '-',
        m.origem || '-',
        m.destino || '-',
        m.data ? new Date(m.data).toLocaleString() : '-',
        m.descricao || '-',
      ])
      const wb = XLSX.utils.book_new()
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [28,12,18,18,20,36].map(w => ({ wch: w }))
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
          const isCenter = c === 1 || c === 4
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
  const filtrada = lista.filter((m) => {
    const texto = `${m.equipamento?.nome || ''} ${m.descricao || ''} ${m.origem || ''} ${m.destino || ''} ${m.equipamentoId}`.toLowerCase()
    const matchesText = filterText ? texto.includes(filterText.toLowerCase()) : true
    const matchesTipo = filterTipo === 'ALL' ? true : (m.tipo || '') === filterTipo
    return matchesText && matchesTipo
  })
  const totalPages = Math.max(1, Math.ceil(filtrada.length / pageSize))
  const current = Math.min(currentPage, totalPages)
  const startIdx = (current - 1) * pageSize
  const pagina = filtrada.slice(startIdx, startIdx + pageSize)

  useEffect(() => { carregar() }, [])
  useEffect(() => { carregarItens() }, [carregarItens])

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Movimentações</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-sm text-gray-500">Carregando...</span>}
            <button className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 flex items-center gap-1" onClick={handleXLSX}>
              <span>📊</span>
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
            {!showCreate ? (
              <button className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                <span>Registrar movimentação</span>
              </button>
            ) : null}
          </div>
        </div>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="filterText" className="mb-1 block text-sm font-medium">Buscar</label>
            <input ref={buscarInputRef} className="w-full rounded border px-3 py-2" value={filterText} onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1) }} />
          </div>
          <div>
            <label htmlFor="filterTipo" className="mb-1 block text-sm font-medium">Tipo</label>
            <select className="w-full rounded border px-3 py-2" value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value as typeof TIPOS[number] | 'ALL'); setCurrentPage(1) }}>
              {['ALL', ...TIPOS].map(t => <option key={t} value={t}>{t === 'ALL' ? 'Todos' : t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pageSize" className="mb-1 block text-sm font-medium">Itens por página</label>
            <select className="w-full rounded border px-3 py-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
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
                <th className="border px-3 py-2 text-left">Tipo</th>
                <th className="border px-3 py-2 text-left">Origem</th>
                <th className="border px-3 py-2 text-left">Destino</th>
                <th className="border px-3 py-2 text-left">Data</th>
                <th className="border px-3 py-2 text-left">Descrição</th>
                <th className="border px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((m) => (
                <tr key={m.id}>
                  <td className="border px-3 py-2">{m.equipamento?.nome || m.equipamentoId}</td>
                  <td className="border px-3 py-2">{m.tipo}</td>
                  <td className="border px-3 py-2">{m.origem || '-'}</td>
                  <td className="border px-3 py-2">{m.destino || '-'}</td>
                  <td className="border px-3 py-2">{m.data ? new Date(m.data).toLocaleString() : '-'}</td>
                  <td className="border px-3 py-2">{m.descricao || '-'}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 flex items-center gap-1" onClick={() => startEdit(m)}>
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>
                      {isAdmin && (
                        <button className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1" onClick={() => showConfirmToast('Tem certeza que deseja excluir esta movimentação?', () => excluirMov(m.id))}>
                          <Trash2 size={16} />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrada.length === 0 && !loading && (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan={7}>Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {pagina.map((m) => (
            <div key={m.id} className="border rounded-lg p-3 bg-white shadow-sm">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <span className="font-medium">Equipamento:</span>
                  <span className="text-gray-600">{m.equipamento?.nome || m.equipamentoId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tipo:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' :
                    m.tipo === 'SAIDA' ? 'bg-red-100 text-red-800' :
                    m.tipo === 'TRANSFERENCIA' ? 'bg-blue-100 text-blue-800' :
                    m.tipo === 'MANUTENCAO' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{m.tipo}</span>
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
                    <span className="text-gray-600">{new Date(m.data).toLocaleString()}</span>
                  </div>
                )}
                {m.descricao && (
                  <div>
                    <span className="font-medium block">Descrição:</span>
                    <span className="text-gray-600 text-xs">{m.descricao}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 rounded bg-yellow-600 px-2 py-1 text-white hover:bg-yellow-700 text-xs flex items-center justify-center gap-1" onClick={() => startEdit(m)}>
                    <Pencil size={14} />
                    <span>Editar</span>
                  </button>
                  {isAdmin && (
                    <button className="flex-1 rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 text-xs flex items-center justify-center gap-1" onClick={() => showConfirmToast('Tem certeza que deseja excluir esta movimentação?', () => excluirMov(m.id))}>
                      <Trash2 size={14} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Registrar Movimentação</h2>
        <form onSubmit={criar} className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Departamento</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={departamentoSel === 'EQUIPAMENTOS'} onChange={() => setDepartamentoSel('EQUIPAMENTOS')} />
                <span>Equipamentos</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={departamentoSel === 'CENTRO_MIDIA'} onChange={() => setDepartamentoSel('CENTRO_MIDIA')} />
                <span>Centro de Mídia</span>
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="equipamentoId" className="mb-1 block text-sm font-medium">Equipamento</label>
            <select ref={equipamentoSelectRef} className="w-full rounded border px-3 py-2" value={equipamentoId} onChange={(e) => setEquipamentoId(e.target.value)}>
              <option value="">Selecione...</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nome || eq.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="createTipo" className="mb-1 block text-sm font-medium">Tipo</label>
            <select className="w-full rounded border px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="origem" className="mb-1 block text-sm font-medium">Origem</label>
            <input className="w-full rounded border px-3 py-2" value={origem} onChange={(e) => setOrigem(e.target.value)} />
          </div>
          <div>
            <label htmlFor="destino" className="mb-1 block text-sm font-medium">Destino</label>
            <input className="w-full rounded border px-3 py-2" value={destino} onChange={(e) => setDestino(e.target.value)} />
          </div>
          <div>
            <label htmlFor="createData" className="mb-1 block text-sm font-medium">Data</label>
            <input type="datetime-local" className="w-full rounded border px-3 py-2" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label htmlFor="createDescricao" className="mb-1 block text-sm font-medium">Descrição</label>
            <input className="w-full rounded border px-3 py-2" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
            <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
              <Save size={16} />
              <span>Salvar</span>
            </button>
            <button type="button" onClick={carregar} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2">
              <RotateCcw size={16} />
              <span>Recarregar</span>
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setTimeout(() => buscarInputRef.current?.focus(), 0) }} className="w-full sm:w-auto rounded border px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
              <X size={16} />
              <span>Fechar</span>
            </button>
          </div>
        </form>
      </section>
      )}

      {editingId && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Editar Movimentação</h2>
          <form onSubmit={salvarEdicao} className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div>
              <label htmlFor="editEquipamentoId" className="mb-1 block text-sm font-medium">Equipamento</label>
              <select className="w-full rounded border px-3 py-2" value={editEquipamentoId} onChange={(e) => setEditEquipamentoId(e.target.value)}>
                <option value="">Selecione...</option>
                {equipamentos.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.nome || eq.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="editTipo" className="mb-1 block text-sm font-medium">Tipo</label>
              <select className="w-full rounded border px-3 py-2" value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editOrigem" className="mb-1 block text-sm font-medium">Origem</label>
              <input className="w-full rounded border px-3 py-2" value={editOrigem} onChange={(e) => setEditOrigem(e.target.value)} />
            </div>
          <div>
            <label htmlFor="editDestino" className="mb-1 block text-sm font-medium">Destino</label>
            <input className="w-full rounded border px-3 py-2" value={editDestino} onChange={(e) => setEditDestino(e.target.value)} />
          </div>
            <div>
              <label htmlFor="editData" className="mb-1 block text-sm font-medium">Data</label>
              <input type="datetime-local" className="w-full rounded border px-3 py-2" value={editData} onChange={(e) => setEditData(e.target.value)} />
            </div>
            <div>
              <label htmlFor="editDescricao" className="mb-1 block text-sm font-medium">Descrição</label>
              <input className="w-full rounded border px-3 py-2" value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
              <button type="submit" className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2">
                <Save size={16} />
                <span>Salvar alterações</span>
              </button>
              <button type="button" onClick={cancelEdit} className="w-full sm:w-auto rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">Cancelar</button>
            </div>
          </form>
        </section>
      )}
      
    </div>
  )
}
