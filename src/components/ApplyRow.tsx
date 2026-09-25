import type { Apply } from '../types/assist'
import { StatusChip } from './StatusChip'

type Props = { apply: Apply }

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ApplyRow({ apply }: Props) {
  return (
    <li className="card-surface rounded-xl px-4 py-3.5 flex flex-wrap items-center gap-3 justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy-950 text-sm truncate">{apply.contestName}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {apply.prizeText ? `${apply.prizeText} · ` : ''}
          Updated {formatWhen(apply.updatedAt)}
        </p>
      </div>
      <StatusChip status={apply.status} />
    </li>
  )
}
