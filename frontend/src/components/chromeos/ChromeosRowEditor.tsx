import { X, Pencil } from 'lucide-react'
import type { ChromeOSCampoEditavel, ChromeOSNormalizedInput } from '../../types/chromeos'
import type { UserRole, UseChromeosImportReturn } from '../../hooks/useChromeosImport'

type EscolaLite = { id: string; nome: string }

type Props = Pick<
  UseChromeosImportReturn,
  | 'crosRows'
  | 'crosEditIdx'
  | 'fecharEditorLinha'
  | 'setCrosRowEscola'
  | 'setCrosRowIgnorarDup'
  | 'setCrosRowField'
> & {
  escolas: ReadonlyArray<EscolaLite>
  userRole: UserRole
}

const CAMPOS_EDITAVEIS_FORM: ReadonlyArray<{
  key: ChromeOSCampoEditavel
  label: string
  placeholder?: string
  type?: 'text' | 'textarea' | 'date' | 'select-escola'
  required?: boolean
}> = [
  { key: 'patrimonio', label: 'Patrimônio', placeholder: 'Ex.: 12345' },
  { key: 'usuarioNome', label: 'Usuário / Responsável', placeholder: 'Ex.: Rodrigo Mota' },
  { key: 'modelo', label: 'Modelo', required: true },
  { key: 'serial', label: 'Serial / Service Tag', required: true },
  { key: 'localizacao', label: 'Localização', placeholder: 'Ex.: Laboratório 01, Bloco B' },
  { key: 'escolaId', label: 'Escola', type: 'select-escola' },
  { key: 'fabricante', label: 'Fabricante', placeholder: 'Ex.: Samsung, HP, Lenovo...' },
  { key: 'processador', label: 'Processador', placeholder: 'Ex.: Intel Celeron N3060' },
  { key: 'memoria', label: 'Memória RAM', placeholder: 'Ex.: 4 GB' },
  { key: 'dataAquisicao', label: 'Data Aquisição', type: 'date' },
]

const obterValorAtual = (
  equip: ChromeOSNormalizedInput | null | undefined,
  overrides: Partial<ChromeOSNormalizedInput> | undefined,
  key: ChromeOSCampoEditavel,
  escolaResolvidaId: string | null | undefined,
): string => {
  if (key === 'escolaId') {
    if (overrides && typeof overrides.escolaId === 'string') return overrides.escolaId
    return typeof escolaResolvidaId === 'string' ? escolaResolvidaId : (equip?.escolaId || '')
  }
  if (overrides && Object.hasOwn(overrides, key)) {
    const val = (overrides as unknown as Record<string, unknown>)[key]
    if (val == null) return ''
    if (typeof val === 'string') return val
    return ''
  }
  const base = equip ? (equip as unknown as Record<string, unknown>)[key] : null
  if (base == null) return ''
  if (typeof base === 'string') return base
  return ''
}

export default function ChromeosRowEditor(props: Props) {
  const {
    crosRows,
    crosEditIdx,
    fecharEditorLinha,
    setCrosRowEscola,
    setCrosRowIgnorarDup,
    setCrosRowField,
    escolas,
    userRole,
  } = props

  if (crosEditIdx == null) return null
  const row = crosRows[crosEditIdx]
  if (!row) return null

  const linha = row
  const equipBase = linha.equipamento

  const onChange = (campo: ChromeOSCampoEditavel, valor: unknown) => {
    if (campo === 'escolaId') {
      const idEscola = typeof valor === 'string' ? valor : ''
      setCrosRowEscola(crosEditIdx, idEscola)
      setCrosRowField(crosEditIdx, 'escolaId', idEscola.length ? idEscola : null)
      return
    }
    if (valor === '' || valor == null) {
      setCrosRowField(crosEditIdx, campo, null)
    } else if (typeof valor === 'string') {
      setCrosRowField(crosEditIdx, campo, valor)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm ring-1 ring-indigo-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Pencil size={18} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Editando linha #{crosEditIdx + 1}
            </p>
            <p className="text-sm text-slate-700 break-all">
              <span className="font-semibold">{equipBase?.nome || '—'}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-slate-600">{equipBase?.modelo || 'Modelo não definido'}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fecharEditorLinha}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <X size={16} /> Fechar
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {CAMPOS_EDITAVEIS_FORM.map((campo) => {
          const valor = obterValorAtual(equipBase, linha.overrides, campo.key, linha.escolaResolvidaId)
          if (campo.type === 'select-escola') {
            return (
              <div key={campo.key} className="flex flex-col gap-1">
                <label htmlFor={`edt-${crosEditIdx}-${campo.key}`} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {campo.label}
                </label>
                <select
                  id={`edt-${crosEditIdx}-${campo.key}`}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  value={valor || ''}
                  onChange={(e) => onChange(campo.key, e.target.value)}
                >
                  <option value="">Selecione a escola...</option>
                  {escolas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
            )
          }
          if (campo.type === 'date') {
            return (
              <div key={campo.key} className="flex flex-col gap-1">
                <label htmlFor={`edt-${crosEditIdx}-${campo.key}`} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {campo.label}
                </label>
                <input
                  id={`edt-${crosEditIdx}-${campo.key}`}
                  type="date"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  value={valor ? valor.slice(0, 10) : ''}
                  onChange={(e) => onChange(campo.key, e.target.value)}
                />
              </div>
            )
          }
          return (
            <div key={campo.key} className="flex flex-col gap-1">
              <label htmlFor={`edt-${crosEditIdx}-${campo.key}`} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {campo.label}
                {campo.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {(() => {
                let classeObrigatoria = ''
                if (campo.required && !valor) {
                  classeObrigatoria = 'ring-2 ring-amber-100 border-amber-300'
                }
                const classNameCampo = `h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${classeObrigatoria}`
                return (
                  <input
                    id={`edt-${crosEditIdx}-${campo.key}`}
                    type="text"
                    className={classNameCampo}
                    placeholder={campo.placeholder || ''}
                    value={valor || ''}
                    onChange={(e) => onChange(campo.key, e.target.value)}
                  />
                )
              })()}
            </div>
          )
        })}

        {userRole === 'ADMIN' && (linha.bloqueioSerial || linha.bloqueioSourceExternalId) && (
          <div className="sm:col-span-2 md:col-span-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <label
              htmlFor={`edt-ignorar-dup-${crosEditIdx}`}
              aria-label="Ignorar bloqueio de duplicidade para administrador"
              className="flex items-start gap-2 text-sm text-red-900 cursor-pointer select-none"
            >
              <input
                id={`edt-ignorar-dup-${crosEditIdx}`}
                type="checkbox"
                className="mt-0.5"
                checked={!!linha.ignorarDuplicidade}
                onChange={(e) => setCrosRowIgnorarDup(crosEditIdx, e.target.checked)}
                aria-labelledby={`edt-ignorar-dup-label-${crosEditIdx}`}
                aria-describedby={`edt-ignorar-dup-desc-${crosEditIdx}`}
              />
              <span>
                <span id={`edt-ignorar-dup-label-${crosEditIdx}`} className="font-semibold">
                  Ignorar bloqueio de duplicidade (admin)
                </span>
                <span id={`edt-ignorar-dup-desc-${crosEditIdx}`} className="block text-xs text-red-700 mt-0.5">
                  {linha.bloqueioSerial ? 'Serial já cadastrado. ' : ''}
                  {linha.bloqueioSourceExternalId ? 'DeviceId já importado.' : ''}
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <footer className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={fecharEditorLinha}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Concluir edição e voltar à lista
        </button>
      </footer>
    </div>
  )
}
