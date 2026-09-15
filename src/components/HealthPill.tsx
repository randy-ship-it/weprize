import type { Contest } from '../types/contest'
import { healthLabel } from '../lib/filters'

export function HealthPill({ contest }: { contest: Contest }) {
  const tone =
    contest.health === 'live'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : contest.health === 'dead'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-amber-50 text-amber-800 border-amber-200'

  const checked = contest.last_ok_at
    ? new Date(contest.last_ok_at).toLocaleString('en-CA', {
        timeZone: 'America/Toronto',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`} title={checked ? `Last OK ${checked} ET` : undefined}>
      {healthLabel(contest.health)}
      {checked ? <span className="font-normal opacity-80">· {checked} ET</span> : null}
    </span>
  )
}
