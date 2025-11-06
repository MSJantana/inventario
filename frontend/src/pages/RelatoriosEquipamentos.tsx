import { useEffect, useState, useRef } from 'react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { generatePdf } from '../utils/html2pdfLoader'

type Equipamento = {
  id: string
  nome: string
  tipo: string
  modelo: string
  serial: string
  status: string
  localizacao?: string
  fabricante?: string
  dataAquisicao: string
  processador?: string
  memoria?: string
  observacoes?: string
  escola?: { nome: string }
}

export default function RelatoriosEquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | string>('ALL')
  const [filterTipo, setFilterTipo] = useState<'ALL' | string>('ALL')
  const [filterEscola, setFilterEscola] = useState<'ALL' | string>('ALL')
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  const tipos = ['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO']
  const status = ['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO']

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    setError(null)
    try {
      const [respEquip, respEscolas] = await Promise.all([
        api.get('/api/equipamentos'),
        api.get('/api/escolas')
      ])
      setEquipamentos(respEquip.data || [])
      setEscolas(respEscolas.data || [])
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const filtrados = equipamentos.filter(eq => {
    const texto = filterText.toLowerCase()
    const matchText = !texto || 
      eq.nome.toLowerCase().includes(texto) ||
      eq.modelo.toLowerCase().includes(texto) ||
      eq.serial.toLowerCase().includes(texto) ||
      eq.escola?.nome.toLowerCase().includes(texto)
    
    const matchStatus = filterStatus === 'ALL' || eq.status === filterStatus
    const matchTipo = filterTipo === 'ALL' || eq.tipo === filterTipo
    const matchEscola = filterEscola === 'ALL' || eq.escola?.nome === filterEscola
    
    return matchText && matchStatus && matchTipo && matchEscola
  })

  function handlePrint() {
    window.print()
  }

  async function handleCSV() {
    try {
      const { data } = await api.get('/api/equipamentos/export/csv', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `equipamentos_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('CSV baixado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(`Erro ao baixar CSV: ${msg}`)
    }
  }

  async function handlePDF() {
    try {
      const element = printRef.current
      if (!element) return
      
      const options = {
        filename: `relatorio_equipamentos_${new Date().toISOString().split('T')[0]}.pdf`,
        margin: 10,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
      }
      
      await generatePdf(element, options)
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(`Erro ao gerar PDF: ${msg}`)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Relatório de Equipamentos</h2>
        {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      </div>
      
      {error && (
        <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Buscar</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nome, modelo, serial, escola..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {status.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tipo</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {tipos.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Escola</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterEscola}
            onChange={(e) => setFilterEscola(e.target.value)}
          >
            <option value="ALL">Todas</option>
            {escolas.map(esc => (
              <option key={esc.id} value={esc.nome}>{esc.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handlePrint}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <span>🖨️</span>
          <span className="hidden sm:inline">Imprimir</span>
        </button>
        <button
          onClick={handleCSV}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 flex items-center gap-2"
        >
          <span>📥</span>
          <span className="hidden sm:inline">Baixar CSV</span>
        </button>
        <button
          onClick={handlePDF}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 flex items-center gap-2"
        >
          <span>📄</span>
          <span className="hidden sm:inline">Gerar PDF</span>
        </button>
        <button
          onClick={carregarDados}
          className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2"
        >
          <span>🔄</span>
          <span className="hidden sm:inline">Atualizar</span>
        </button>
        <span className="ml-auto text-sm text-gray-600">
          {filtrados.length} equipamento(s) encontrado(s)
        </span>
      </div>

      {/* Tabela para impressão */}
      <div ref={printRef} className="print-area">
        
        {/* Cabeçalho do relatório */}
        <div className="mb-4 hidden print:block">
          <h1 className="text-2xl font-bold text-center mb-2">Relatório de Equipamentos</h1>
          <p className="text-center text-sm text-gray-600 mb-4">
            Emitido em: {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <div className="text-sm mb-2">
            <p><strong>Filtros aplicados:</strong></p>
            <p>Status: {filterStatus === 'ALL' ? 'Todos' : filterStatus.replace('_', ' ')}</p>
            <p>Tipo: {filterTipo === 'ALL' ? 'Todos' : filterTipo}</p>
            <p>Escola: {filterEscola === 'ALL' ? 'Todas' : filterEscola}</p>
            {filterText && <p>Busca: {filterText}</p>}
          </div>
        </div>

        {/* Layout de Cards para Mobile */}
        <div className="lg:hidden">
          {filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum equipamento encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              {filtrados.map((eq) => (
                <div key={eq.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{eq.nome}</h3>
                    <span className="text-sm px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {eq.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><strong>Tipo:</strong> {eq.tipo}</div>
                    <div><strong>Modelo:</strong> {eq.modelo}</div>
                    <div><strong>Serial:</strong> {eq.serial}</div>
                    <div><strong>Escola:</strong> {eq.escola?.nome || '-'}</div>
                    <div><strong>Localização:</strong> {eq.localizacao || '-'}</div>
                    <div><strong>Fabricante:</strong> {eq.fabricante || '-'}</div>
                    <div><strong>Aquisição:</strong> {formatDate(eq.dataAquisicao)}</div>
                    <div><strong>Processador:</strong> {eq.processador || '-'}</div>
                    <div><strong>Memória:</strong> {eq.memoria || '-'}</div>
                  </div>
                  {eq.observacoes && (
                    <div className="mt-2 text-sm">
                      <strong>Observações:</strong> {eq.observacoes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabela para Desktop e Impressão */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Nome</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Tipo</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Modelo</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Serial</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Escola</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Localização</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Fabricante</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Aquisição</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Processador</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Memória</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Observações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">{eq.nome}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.tipo}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.modelo}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.serial}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.status.replace('_', ' ')}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.escola?.nome || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.localizacao || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.fabricante || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2">{formatDate(eq.dataAquisicao)}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.processador || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2">{eq.memoria || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 max-w-xs truncate">{eq.observacoes || '-'}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-4 text-center" colSpan={12}>
                      Nenhum equipamento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé do relatório */}
        <div className="mt-4 hidden print:block text-sm text-gray-600">
          <p>Total de equipamentos: {filtrados.length}</p>
          <p>Relatório gerado pelo Sistema de Inventário</p>
        </div>
      </div>
    </div>
  )
}