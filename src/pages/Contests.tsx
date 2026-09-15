import { useContests } from '../hooks/useContests'
import { FilterBar } from '../components/FilterBar'
import { ContestGrid } from '../components/ContestGrid'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { Link } from 'react-router-dom'

export function Contests() {
  const { filtered, filters, setFilters, autoOkCount } = useContests()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-kicker mb-1">Free board</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">Contests</h1>
          <p className="text-sm text-slate-600 mt-1">
            Friction badges before click. Canada-first. QC not first-class. AUTO_OK live:{' '}
            <span className="tabular font-semibold text-navy-950">{autoOkCount}</span>
          </p>
        </div>
        <Link to="/exclusives" className="text-sm text-teal-600 hover:underline">
          Scale exclusives →
        </Link>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} resultCount={filtered.length} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ContestGrid contests={filtered} insertBetweenAds />
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <BirchAdSlot slotId="feed_right_rail" />
            <div className="card-surface rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
              Sort favors EV mid / minutes, then AUTO_OK, then closing-soon and soft-field. Dead links drop from EV math.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
