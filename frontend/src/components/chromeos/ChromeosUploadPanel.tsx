import type { UseChromeosImportReturn } from '../../hooks/useChromeosImport'
import { CheckCircle, FileUp } from 'lucide-react'

type Props = Pick<
  UseChromeosImportReturn,
  | 'crosFluxo'
  | 'crosFile'
  | 'crosFileRef'
  | 'crosPreview'
  | 'clearCrosState'
  | 'onCrosFilePick'
>

export default function ChromeosUploadPanel(props: Readonly<Props>) {
  const {
    crosFluxo,
    crosFile,
    crosFileRef,
    crosPreview,
    clearCrosState,
    onCrosFilePick,
  } = props

  const temArquivoProcessado =
    (crosFluxo === 'uploading' || crosFluxo === 'review' || crosFluxo === 'resultado') &&
    Boolean(crosFile)

  return (
    <>
      {temArquivoProcessado && crosFile && (
        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-100">
              <span className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                CSV
              </span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 break-all">
                {crosFile.name}
              </h3>
              <p className="text-xs text-slate-500">
                Google Admin · ChromeOS Devices · {(crosFile.size / 1024).toFixed(1)} KB ·{' '}
                {crosPreview?.totalLinhas ?? 0} linha(s)
              </p>
            </div>
          </div>
          {crosFluxo !== 'uploading' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium border border-green-200">
              <CheckCircle size={14} />
              Arquivo processado
            </span>
          )}
        </div>
      )}

      {crosFluxo === 'idle' && (
        <div className="mb-4 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className="rounded-full bg-emerald-100 p-2 text-emerald-700"
                aria-hidden="true"
              >
                <FileUp size={22} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Importar Chromebooks (Google Admin CSV)
                </h3>
                <p className="text-xs text-slate-600">
                  Exporte a lista de dispositivos no Google Admin Console → ChromeOS →
                  Dispositivos. Tamanho máximo 5MB.
                </p>
                {crosFile && (
                  <p className="mt-1 text-xs text-slate-700">
                    Arquivo: <span className="font-medium">{crosFile.name}</span> (
                    {(crosFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={crosFileRef}
                id="crosFileInput"
                type="file"
                accept=".csv,text/csv,application/csv"
                className="hidden"
                aria-label="Selecionar arquivo CSV ChromeOS"
                onChange={(e) => onCrosFilePick(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => crosFileRef.current?.click()}
                className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 flex items-center gap-2"
              >
                <FileUp size={16} aria-hidden="true" />
                <span>Selecionar .csv</span>
              </button>
              {crosFile && (
                <button
                  type="button"
                  onClick={clearCrosState}
                  className="rounded border px-3 py-2 text-xs hover:bg-gray-50"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {crosFluxo === 'uploading' && (
        <div className="mb-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 sm:p-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"
              aria-hidden
            />
            {'Analisando CSV...'}
          </div>
        </div>
      )}
    </>
  )
}
