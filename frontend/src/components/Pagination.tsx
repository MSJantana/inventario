import { memo } from 'react'

type Props = {
  current: number
  totalPages: number
  onChange: (page: number) => void
  windowSize?: number
  label?: string
}

function Pagination({ current, totalPages, onChange, windowSize = 5, label = 'Paginação' }: Readonly<Props>) {
  const startBase = current - Math.floor(windowSize / 2)
  const start = Math.max(1, Math.min(startBase, Math.max(1, totalPages - windowSize + 1)))
  const end = Math.min(totalPages, start + windowSize - 1)
  const items: (number | 'start-ellipsis' | 'end-ellipsis')[] = []
  if (start > 1) {
    items.push(1)
    if (start > 2) items.push('start-ellipsis')
  }
  for (let p = start; p <= end; p++) items.push(p)
  if (end < totalPages) {
    if (end < totalPages - 1) items.push('end-ellipsis')
    items.push(totalPages)
  }
  return (
    <nav role="navigation" aria-label={label} className="flex items-center gap-2">
      <button
        type="button"
        className="rounded border px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={current <= 1}
        onClick={() => onChange(Math.max(1, current - 1))}
        aria-label="Página anterior"
      >
        Anterior
      </button>
      <ul className="flex items-center gap-2">
        {items.map((it, idx) => (
          typeof it === 'number' ? (
            <li key={`${it}-${idx}`}>
              <button
                type="button"
                className={`rounded border px-3 py-1 ${it === current ? 'bg-blue-600 text-white border-blue-600' : ''}`}
                onClick={() => onChange(it)}
                aria-label={`Página ${it} de ${totalPages}`}
                aria-current={it === current ? 'page' : undefined}
              >
                {it}
              </button>
            </li>
          ) : (
            <li key={`${it}-${idx}`} aria-hidden>
              <span className="px-2 text-gray-500">…</span>
            </li>
          )
        ))}
      </ul>
      <button
        type="button"
        className="rounded border px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={current >= totalPages}
        onClick={() => onChange(Math.min(totalPages, current + 1))}
        aria-label="Próxima página"
      >
        Próxima
      </button>
    </nav>
  )
}

export default memo(Pagination)
