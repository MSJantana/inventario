import { CheckCircle } from 'lucide-react'
import badgeStatusCros from './badgeStatusCros'
import type { UseChromeosImportReturn } from '../../hooks/useChromeosImport'

type Props = Pick<
  UseChromeosImportReturn,
  'crosResultado' | 'crosRows' | 'clearCrosState'
>

export default function ChromeosResultPanel(props: Readonly<Props>) {
  const { crosResultado, crosRows, clearCrosState } = props

  if (!crosResultado) return null

  return (
    <div className="mb-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-indigo-900 flex items-center gap-2">
          <CheckCircle size={18} className="text-indigo-700" /> Resultado da importação
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 shadow-sm font-medium">
            Sucesso: {crosResultado.totalSucesso || 0}
          </span>
          <span className="rounded-xl bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 shadow-sm font-medium">
            Erros: {crosResultado.totalErros || 0}
          </span>
          <span className="rounded-xl bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 shadow-sm">
            Cancelados: {crosResultado.totalCancelados || 0}
          </span>
          <button
            type="button"
            onClick={clearCrosState}
            className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-slate-800 hover:bg-slate-100 shadow-sm font-medium"
          >
            Nova importação
          </button>
        </div>
      </header>
      {(crosResultado.resultados || []).length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm mb-2">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-indigo-50/80 text-indigo-900 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-indigo-200">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-indigo-200">
                    Item
                  </th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-indigo-200">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-indigo-200">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {(crosResultado.resultados || []).slice(0, 200).map((r) => {
                  const linha = crosRows.find((x) => x.indice === r.indiceLinha)
                  const nome =
                    linha?.equipamento?.nome ?? `Linha ${(r.indiceLinha ?? 0) + 1}`
                  return (
                    <tr key={`rs-${r.indiceLinha}`} className="hover:bg-indigo-50/30">
                      <td className="px-3 py-1.5 text-slate-500 tabular-nums">
                        {(r.indiceLinha ?? 0) + 1}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-900 break-all">
                        {nome}
                      </td>
                      <td className="px-3 py-1.5">{badgeStatusCros(r.status)}</td>
                      <td className="px-3 py-1.5 text-slate-700 break-all max-w-sm">
                        {r.status === 'SUCESSO' ? (
                          <>
                            ID:{' '}
                            <code className="text-slate-900 font-medium">
                              {r.equipamentoId || '-'}
                            </code>
                          </>
                        ) : (
                          <span className="text-rose-700">{r.erroMotivo || '-'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
