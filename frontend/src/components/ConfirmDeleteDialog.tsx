import { useCallback, useRef, useState } from 'react'
import { Trash2, XCircle, AlertTriangle } from 'lucide-react'

type ConfirmDeleteDialogProps = {
  open: boolean
  itemName: string
  itemType: string
  onConfirm: () => void
  onCancel: () => void
  closeOnConfirm?: boolean
}

function ConfirmDeleteDialog({
  open,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  closeOnConfirm = true,
}: ConfirmDeleteDialogProps) {
  const [digitado, setDigitado] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const textoEsperado = 'CONFIRMAR'

  const podeConfirmar = digitado.trim().toUpperCase() === textoEsperado

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDigitado(e.target.value)
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm()
    if (closeOnConfirm) {
      setDigitado('')
    }
  }, [onConfirm, closeOnConfirm])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && podeConfirmar) {
      handleConfirm()
    }
  }, [podeConfirmar, handleConfirm])

  if (!open) return null

  return (
    <dialog
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      style={{ display: open ? 'flex' : 'none' }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
      <div className="mx-auto w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl ring-1 ring-red-900/10 text-center">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-50 p-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Confirmar exclusão</h2>
            <p className="mt-1 text-sm text-gray-600">
              Tem certeza que deseja excluir este <strong>{itemType}</strong>?
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              «{itemName}»
            </p>
            <p className="mt-3 text-xs text-red-600">
              Para confirmar, digite <strong className="font-mono">CONFIRMAR</strong> no campo abaixo:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={digitado}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="CONFIRMAR"
              className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              O texto deve ser escrito exatamente como mostrado acima.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!podeConfirmar}
            className={`rounded bg-red-600 px-4 py-2 text-sm text-white ${!podeConfirmar ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
          >
            <XCircle className="h-4 w-4 mr-1" /> Excluir «{itemName}»
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmDeleteDialog
