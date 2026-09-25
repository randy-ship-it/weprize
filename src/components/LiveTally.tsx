import type { Tally } from '../types/contest'
import { EstimateChip } from './EstimateChip'
import { Link } from 'react-router-dom'
import { formatPoolM } from '../lib/filters'

export function LiveTally({ tally, autoOkLive }: { tally: Tally; autoOkLive: number }) {
  const mid = tally.est_ev_mid_cad
  const low = Math.max(0, Math.round(mid * 0.7))
  const high = Math.round(mid * 1.3)
  const cells = [
    { label: 'Expected value', value: `~$${low}–$${high}` },
    { label: 'Total pot', value: `~${formatPoolM(tally.face_pool_cad)} CAD` },
    { label: 'Applied', value: String(tally.person_entries) },
    { label: 'Contests tracked', value: String(tally.unique_contests) },
    { label: 'Easy applies ready', value: String(autoOkLive) },
    { label: 'Open book', value: `~${tally.open_inventory_range}` },
  ]

  return (
    <div className="tally-glass rounded-2xl text-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-teal-500">Your book</h2>
        <EstimateChip label="EXAMPLE" />
        <EstimateChip label="ESTIMATE" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/[0.06] ring-1 ring-white/5 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{c.label}</p>
            <p className="tabular text-base sm:text-lg font-semibold text-teal-500 leading-tight">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-300 mb-2 leading-relaxed">
        Browse what&apos;s live, track closings, then we apply for you.
      </p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {tally.disclaimer} · Suggested expected $ is an estimate only (listed prize ARVs × rough odds assumptions) —
        not a guarantee of winnings.{' '}
        <Link to="/methodology" className="text-teal-500 hover:underline">
          How we estimate
        </Link>
        .
      </p>
    </div>
  )
}
