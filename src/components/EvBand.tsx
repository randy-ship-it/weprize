import type { Contest } from '../types/contest'
import { formatCad } from '../lib/filters'
import { EstimateChip } from './EstimateChip'

export function EvBand({ contest, compact = false }: { contest: Contest; compact?: boolean }) {
  const has =
    contest.ev_low != null && contest.ev_mid != null && contest.ev_high != null && contest.health !== 'dead'

  if (!has) {
    return (
      <span className="text-xs text-slate-600 italic">
        insufficient data
      </span>
    )
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-950">
        <EstimateChip />
        <span className="tabular">mid {formatCad(contest.ev_mid!)} CAD</span>
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-navy-950/10 bg-ice-50 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-navy-950">ESTIMATED EV band</p>
        <EstimateChip />
      </div>
      <p className="tabular text-lg font-semibold text-teal-600">
        {formatCad(contest.ev_low!)} – {formatCad(contest.ev_mid!)} – {formatCad(contest.ev_high!)} CAD
      </p>
      <p className="text-xs text-slate-600 mt-1">
        low / mid / high field priors · {contest.pool_source?.replace(/_/g, ' ') ?? 'estimated'} · not a guarantee
      </p>
    </div>
  )
}
