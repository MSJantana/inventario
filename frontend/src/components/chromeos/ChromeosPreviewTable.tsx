import { AlertTriangle, CheckCircle, Info, Pencil, XCircle } from 'lucide-react'
import type { UserRole, UseChromeosImportReturn } from '../../hooks/useChromeosImport'
import ChromeosRowEditor from './ChromeosRowEditor'
import ChromeosLoteActions from './ChromeosLoteActions'

type EscolaLite = { id: string; nome: string }

type Props = Pick<
  UseChromeosImportReturn,
  | 'crosPreview'
  | 'crosRows'
  | 'crosPagina'
  | 'crosPage'
  | 'crosPageSize'
  | 'crosTotalPages'
  | 'setCrosPage'
  | 'crosSelecionadosCount'
  | 'crosTemEscolaPendenteSelecionado'
  | 'crosConfirmando'
  | 'crosFileRef'
  | 'clearCrosState'
  | 'crosSelecionarTodos'
  | 'crosDesmarcarTodos'
  | 'crosMarcarPendencias'
  | 'toggleCrosRowSelecionado'
  | 'setCrosRowEscola'
  | 'setCrosRowIgnorarDup'
  | 'confirmarCrosImportacao'
  | 'crosEditIdx'
  | 'abrirEditorLinha'
  | 'fecharEditorLinha'
  | 'setCrosRowField'
  | 'aplicarValorEmLote'
> & {
  escolas: ReadonlyArray<EscolaLite>
  userRole: UserRole
}

export default function ChromeosPreviewTable(props: Props) {
  const {
    crosPreview,
    crosRows,
    crosPagina,
    crosPage,
    crosPageSize,
    crosTotalPages,
    setCrosPage,
    crosSelecionadosCount,
    crosTemEscolaPendenteSelecionado,
    crosConfirmando,
    crosFileRef,
    clearCrosState,
    crosSelecionarTodos,
    crosDesmarcarTodos,
    crosMarcarPendencias,
    toggleCrosRowSelecionado,
    setCrosRowEscola,
    setCrosRowIgnorarDup,
    confirmarCrosImportacao,
    crosEditIdx,
    abrirEditorLinha,
    fecharEditorLinha,
    setCrosRowField,
    aplicarValorEmLote,
    escolas,
    userRole,
  } = props

  if (!crosPreview) return null

  const nomeEscola = (escolaId: string | null | undefined, fallback?: string | null) =>
    escolas.find((e) => e.id === (escolaId || fallback))?.nome || '-'

  return (
    <div className="mb-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-700" />
          Pré-visualização · {crosRows.length} linha(s) · {crosSelecionadosCount} selecionada(s)
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl bg-white px-3 py-1.5 border border-emerald-200 shadow-sm">
            Selecionados: <span className="font-semibold">{crosSelecionadosCount}</span>
          </span>
          <button
            type="button"
            onClick={clearCrosState}
            className="rounded-xl border border-rose-300 bg-white px-4 py-1.5 text-rose-800 hover:bg-rose-100 shadow-sm font-medium"
          >
            Descartar
          </button>
        </div>
      </header>

      <ChromeosLoteActions
        escolas={escolas}
        crosSelecionadosCount={crosSelecionadosCount}
        aplicarValorEmLote={aplicarValorEmLote}
      />

      {crosEditIdx != null && (
        <ChromeosRowEditor
          escolas={escolas}
          userRole={userRole}
          crosRows={crosRows}
          crosEditIdx={crosEditIdx}
          fecharEditorLinha={fecharEditorLinha}
          setCrosRowEscola={setCrosRowEscola}
          setCrosRowIgnorarDup={setCrosRowIgnorarDup}
          setCrosRowField={setCrosRowField}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={crosSelecionarTodos}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
        >
          Selecionar todas
        </button>
        <button
          type="button"
          onClick={crosDesmarcarTodos}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
        >
          Desmarcar todas
        </button>
        <button
          type="button"
          onClick={crosMarcarPendencias}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
        >
          Marcar prontas
        </button>
        <span className="ml-auto text-[11px] text-slate-500 self-center">
          Dica: clique em <Pencil size={12} className="inline mx-0.5 mb-0.5" /> para editar TODOS os campos faltantes da linha.
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-emerald-50/80 text-emerald-900">
              <tr>
                <th className="w-10 px-2 py-2 text-center border-b border-emerald-200">#</th>
                <th className="w-10 px-2 py-2 text-center border-b border-emerald-200">
                  <span className="sr-only">Sel</span>
                </th>
                <th className="w-10 px-2 py-2 text-center border-b border-emerald-200">
                  <span className="sr-only">Editar</span>
                </th>
                <th className="px-2 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-emerald-200">
                  Nome / Modelo
                </th>
                <th className="px-2 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-emerald-200">
                  Usuário / Local
                </th>
                <th className="px-2 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-emerald-200">
                  Ficha técnica
                </th>
                <th className="px-2 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-emerald-200 min-w-[200px]">
                  Escola
                </th>
                <th className="px-2 py-2 text-left font-semibold tracking-wide uppercase text-[11px] border-b border-emerald-200">
                  Alertas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {crosPagina.map((row, localIdx) => {
                const globalIdx = (crosPage - 1) * crosPageSize + localIdx
                const equip = row.equipamento
                const bloqueante = row.bloqueioSerial || row.bloqueioSourceExternalId
                const foiEditado = !!row.overrides && Object.keys(row.overrides).length > 0
                return (
                  <tr
                    key={`r-${row.indice}`}
                    className={`hover:bg-emerald-50/40 ${!row.selecionado ? 'opacity-70' : ''} ${crosEditIdx === globalIdx ? 'bg-indigo-50/60' : ''}`}
                  >
                    <td className="px-2 py-2 text-center tabular-nums text-slate-500 align-top">
                      {globalIdx + 1}
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                      <input
                        type="checkbox"
                        checked={row.selecionado}
                        onChange={() => toggleCrosRowSelecionado(globalIdx)}
                        aria-label={`Sel linha ${globalIdx + 1}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                      <button
                        type="button"
                        onClick={() => (crosEditIdx === globalIdx ? fecharEditorLinha() : abrirEditorLinha(globalIdx))}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
                          crosEditIdx === globalIdx
                            ? 'border-indigo-400 bg-indigo-100 text-indigo-700 shadow-sm'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'
                        }`}
                        aria-label={`Editar linha ${globalIdx + 1}`}
                        title="Editar dados do equipamento"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="font-semibold break-all">{equip?.nome || '-'}</div>
                          <div className="text-[11px] text-slate-500 break-all">
                            {equip?.modelo || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500 break-all">
                            SN: {equip?.serial || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400 break-all">
                            ID: {equip?.sourceExternalId || '-'}
                          </div>
                          {foiEditado && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Editado
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="break-all font-medium">{equip?.usuarioNome || '-'}</div>
                      <div className="text-[11px] text-slate-500 break-all">
                        Local: {equip?.localizacao || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 break-all">
                        MAC: {equip?.macaddress || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="text-[11px] text-slate-700">
                        <div><span className="text-slate-400">Fabricante:</span> {equip?.fabricante || '-'}</div>
                        <div><span className="text-slate-400">CPU:</span> {equip?.processador || '-'}</div>
                        <div><span className="text-slate-400">RAM:</span> {equip?.memoria || '-'}</div>
                        <div><span className="text-slate-400">Aquisição:</span> {equip?.dataAquisicao || '-'}</div>
                        <div><span className="text-slate-400">Patrimônio:</span> {equip?.patrimonio || '-'}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.escolaPendente ? (
                        <div>
                          <div className="text-[11px] font-semibold text-amber-700 mb-1 flex items-center gap-1">
                            <AlertTriangle size={12} /> Escola pendente
                          </div>
                          <select
                            className="w-full rounded border px-2 py-1 text-xs"
                            value={row.escolaResolvidaId || ''}
                            onChange={(e) => setCrosRowEscola(globalIdx, e.target.value)}
                            aria-label={`Escola linha ${globalIdx + 1}`}
                          >
                            <option value="">Selecione...</option>
                            {escolas.map((esc) => (
                              <option key={esc.id} value={esc.id}>
                                {esc.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                            <CheckCircle size={11} /> Resolvida
                          </span>
                          <div className="mt-1 font-medium">
                            {nomeEscola(row.escolaResolvidaId, equip?.escolaId)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 space-y-1.5 align-top">
                      {row.bloqueioSerial && (
                        <div className="flex items-start gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                          <XCircle size={12} className="mt-0.5" /> Serial duplicado
                        </div>
                      )}
                      {row.bloqueioSourceExternalId && (
                        <div className="flex items-start gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                          <XCircle size={12} className="mt-0.5" /> DeviceId já importado
                        </div>
                      )}
                      {bloqueante && userRole === 'ADMIN' && (
                        <label className="flex items-start gap-1.5 text-[11px] text-red-800 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={row.ignorarDuplicidade}
                            onChange={(e) => setCrosRowIgnorarDup(globalIdx, e.target.checked)}
                          />
                          {'Ignorar bloqueio (admin)'}
                        </label>
                      )}
                      {!bloqueante &&
                        row.avisos?.map((av, i) => (
                          <div
                            key={`a-${row.indice}-${i}`}
                            className="flex items-start gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800"
                          >
                            <Info size={12} className="mt-0.5" /> {av}
                          </div>
                        ))}
                    </td>
                  </tr>
                )
              })}
              {crosRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-500 text-sm">
                    Nenhuma linha encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div>
          Página {crosPage} de {crosTotalPages}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={crosPage <= 1}
            onClick={() => setCrosPage((p) => Math.max(1, p - 1))}
            className="rounded border px-2 py-1 disabled:opacity-50 hover:bg-slate-50"
          >
            Anterior
          </button>
          <span className="px-2 py-1 rounded border bg-white">{crosPage}</span>
          <button
            type="button"
            disabled={crosPage >= crosTotalPages}
            onClick={() => setCrosPage((p) => Math.min(crosTotalPages, p + 1))}
            className="rounded border px-2 py-1 disabled:opacity-50 hover:bg-slate-50"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            clearCrosState()
            window.setTimeout(() => crosFileRef.current?.click(), 60)
          }}
          className="rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 px-4 sm:px-6 py-3 text-sm font-medium"
        >
          Reprocessar
        </button>
        <button
          type="button"
          disabled={
            crosConfirmando ||
            crosSelecionadosCount === 0 ||
            crosTemEscolaPendenteSelecionado
          }
          onClick={confirmarCrosImportacao}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {crosConfirmando ? (
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
              aria-hidden
            />
          ) : (
            <CheckCircle size={16} aria-hidden="true" />
          )}
          Confirmar dados e importar ({crosSelecionadosCount})
        </button>
      </div>
      {crosTemEscolaPendenteSelecionado && (
        <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle size={12} /> Há itens selecionados com escola pendente. Resolva antes de
          confirmar.
        </p>
      )}
    </div>
  )
}
