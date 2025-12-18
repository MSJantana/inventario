

interface RelatoriosFiltersProps {
  readonly filterDepartamento: 'EQUIPAMENTOS' | 'CENTRO_MIDIA'
  readonly setFilterDepartamento: (value: 'EQUIPAMENTOS' | 'CENTRO_MIDIA') => void
  readonly filterText: string
  readonly setFilterText: (value: string) => void
  readonly filterStatus: string
  readonly setFilterStatus: (value: string) => void
  readonly filterTipo: string
  readonly setFilterTipo: (value: string) => void
  readonly filterEscola: string
  readonly setFilterEscola: (value: string) => void
  readonly escolas: { id: string; nome: string }[]
}

export function RelatoriosFilters({
  filterDepartamento,
  setFilterDepartamento,
  filterText,
  setFilterText,
  filterStatus,
  setFilterStatus,
  filterTipo,
  setFilterTipo,
  filterEscola,
  setFilterEscola,
  escolas
}: RelatoriosFiltersProps) {
  const tiposEquip = ['COMPUTADOR','NOTEBOOK','IMPRESSORA','PROJETOR','TABLET','MONITOR','ROTEADOR','SWITCH','OUTRO']
  const tiposCm = ['AUDIO','VIDEO','CAMERA','MICROFONE','ILUMINACAO','OUTRO']
  const status = ['DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO']

  return (
    <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="departamentoSelect" className="mb-1 block text-sm font-medium">Departamento</label>
        <select
          id="departamentoSelect"
          className="w-full rounded border px-3 py-2"
          value={filterDepartamento}
          onChange={(e) => setFilterDepartamento(e.target.value as 'EQUIPAMENTOS' | 'CENTRO_MIDIA')}
        >
          <option value="EQUIPAMENTOS">Equipamentos</option>
          <option value="CENTRO_MIDIA">Centro de Midia</option>
        </select>
      </div>
      <div>
        <label htmlFor="searchInput" className="mb-1 block text-sm font-medium">Buscar</label>
        <input
          id="searchInput"
          className="w-full rounded border px-3 py-2"
          placeholder="Nome, modelo, serial, escola, sigla..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="statusSelect" className="mb-1 block text-sm font-medium">Status</label>
        <select
          id="statusSelect"
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
        <label htmlFor="tipoSelect" className="mb-1 block text-sm font-medium">Tipo</label>
        <select
          id="tipoSelect"
          className="w-full rounded border px-3 py-2"
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
        >
          <option value="ALL">Todos</option>
          {(filterDepartamento === 'CENTRO_MIDIA' ? tiposCm : tiposEquip).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="escolaSelect" className="mb-1 block text-sm font-medium">Escola</label>
        <select
          id="escolaSelect"
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
  )
}
