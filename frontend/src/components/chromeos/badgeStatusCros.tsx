import type { ReactNode } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { ChromeOSConfirmarResultadoItem } from '../../types/chromeos'

export type StatusCrosBadge = ChromeOSConfirmarResultadoItem['status'] | null | undefined

export const badgeStatusCros = (status: StatusCrosBadge): ReactNode => {
  if (status === 'SUCESSO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium">
        <CheckCircle size={11} /> SUCESSO
      </span>
    )
  }
  if (status === 'ERRO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 text-[11px] font-medium">
        <XCircle size={11} /> ERRO
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[11px] font-medium">
      CANCELADO
    </span>
  )
}

export default badgeStatusCros
