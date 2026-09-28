import { Link } from 'react-router-dom'
import { useContests } from '../hooks/useContests'
import { sortContests } from '../lib/filters'
import { PrizeSpinner } from '../components/PrizeSpinner'

/** Browse — secondary soft list only. No outbound contest URLs. */
export function Contests() {
  const { contests, autoOkCount } = useContests()
  const live = sortContests(contests.filter((c) => c.health !== 'dead' && !c.exclusive)).slice(0, 12)

  return (
    <div className="space-y-8">
      <div>
        <p className="section-kicker mb-2">Pool · not the open book</p>
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Contests in motion</h1>
        <p className="text-slate-600 max-w-2xl">
          <span className="tabular font-semibold">{autoOkCount}</span> ready this week. We show vibes and closing heat —
          not scrapeable entry links. Start free or buy an assist pack and we apply for you.
        </p>
      </div>

      <PrizeSpinner liveCount={autoOkCount} />

      <div className="grid gap-3 sm:grid-cols-2">
        {live.map((c) => (
          <div key={c.slug || c.name} className="card-surface rounded-xl p-4">
            <p className="font-medium text-navy-950 truncate">{c.name}</p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.prize_text || 'Prize pool active'}</p>
            <div className="mt-2 flex gap-2 text-[11px]">
              {(c.days_left != null && c.days_left <= 7) ? (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Closing soon</span>
              ) : (
                <span className="rounded-full bg-teal-50 text-teal-800 px-2 py-0.5">Live</span>
              )}
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">Assist-ready</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Want the full apply engine?{' '}
        <Link to="/pricing" className="text-teal-600 underline">
          See packs
        </Link>{' '}
        or{' '}
        <Link to="/jackpot" className="text-teal-600 underline">
          unlock +10 free applies
        </Link>
        .
      </p>
    </div>
  )
}
