import { memo } from 'react'

type Props = {
  current: number
  totalPages: number
  onChange: (page: number) => void
  windowSize?: number
}

function Pagination({ current, totalPages, onChange, windowSize = 5 }: Readonly<Props>) {
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
    <div className="flex items-center gap-2">
      <button className="rounded border px-3 py-1" disabled={current <= 1} onClick={() => onChange(Math.max(1, current - 1))}>Anterior</button>
      {items.map((it) => (
        typeof it === 'number' ? (
          <button
            key={it}
            className={`rounded border px-3 py-1 ${it === current ? 'bg-blue-600 text-white border-blue-600' : ''}`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ) : (
          <span key={it} className="px-2 text-gray-500">…</span>
        )
      ))}
      <button className="rounded border px-3 py-1" disabled={current >= totalPages} onClick={() => onChange(Math.min(totalPages, current + 1))}>Próxima</button>
    </div>
  )
}

export default memo(Pagination)

