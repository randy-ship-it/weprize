import type { FilterState } from '../types/contest'
import { DEFAULT_FILTERS } from '../lib/filters'

const PROVINCES = ['', 'ON', 'BC', 'AB', 'MB', 'SK', 'NB', 'NS', 'NL', 'PE', 'YT', 'NT', 'NU']

type Props = {
  filters: FilterState
  setFilters: (next: FilterState | ((prev: FilterState) => FilterState)) => void
  resultCount: number
}

function Chip({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        checked
          ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
          : 'border-navy-950/10 bg-white text-navy-950 hover:border-teal-600/40'
      }`}
      aria-pressed={checked}
    >
      {label}
    </button>
  )
}

export function FilterBar({ filters, setFilters, resultCount }: Props) {
  return (
    <div className="card-surface rounded-2xl p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy-950">Filters</p>
        <p className="text-xs text-slate-600 tabular">{resultCount} shown</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip label="Canada-eligible" checked={filters.canadaEligible} onChange={(v) => setFilters({ ...filters, canadaEligible: v })} />
        <Chip label="Free / no-purchase" checked={filters.freeNoPurchase} onChange={(v) => setFilters({ ...filters, freeNoPurchase: v })} />
        <Chip label="Hide high-friction" checked={filters.hideHighFriction} onChange={(v) => setFilters({ ...filters, hideHighFriction: v })} />
        <Chip label="Hide dead" checked={filters.hideDead} onChange={(v) => setFilters({ ...filters, hideDead: v })} />
        <Chip label="Closing-soon" checked={filters.closingSoon} onChange={(v) => setFilters({ ...filters, closingSoon: v })} />
        <Chip label="New-live" checked={filters.newLive} onChange={(v) => setFilters({ ...filters, newLive: v })} />
        <Chip label="AUTO_OK only" checked={filters.autoOkOnly} onChange={(v) => setFilters({ ...filters, autoOkOnly: v })} />
        <Chip label="Soft-field" checked={filters.softFieldOnly} onChange={(v) => setFilters({ ...filters, softFieldOnly: v })} />
        <Chip label="Exclusive · Scale Health" checked={filters.scaleExclusiveOnly} onChange={(v) => setFilters({ ...filters, scaleExclusiveOnly: v })} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Province (QC not first-class)
          <select
            className="rounded-lg border border-navy-950/15 bg-ice-50 px-2 py-1.5 text-sm"
            value={filters.province}
            onChange={(e) => setFilters({ ...filters, province: e.target.value })}
          >
            {PROVINCES.map((p) => (
              <option key={p || 'all'} value={p}>
                {p || 'All'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Sort
          <select
            className="rounded-lg border border-navy-950/15 bg-ice-50 px-2 py-1.5 text-sm"
            value={filters.sort}
            onChange={(e) =>
              setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })
            }
          >
            <option value="ev_per_min">EV / minutes</option>
            <option value="closing">Closing soon</option>
            <option value="new">New live</option>
          </select>
        </label>
        <button
          type="button"
          className="text-xs text-teal-600 hover:underline"
          onClick={() => setFilters({ ...DEFAULT_FILTERS })}
        >
          Reset
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Default: live preferred · hide dead · EV mid / minutes · AUTO_OK first
      </p>
    </div>
  )
}
