import { useCallback, useMemo, useState } from 'react'
import type { Contest, FilterState } from '../types/contest'
import seed from '../data/contests.json'
import { applyFilters, DEFAULT_FILTERS } from '../lib/filters'

const FILTER_KEY = 'weprize-filters-v1'
const LEGACY_FILTER_KEY = 'wecontest-filters-v1'

function readFilters(): FilterState {
  try {
    let raw = localStorage.getItem(FILTER_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_FILTER_KEY)
      if (raw) {
        localStorage.setItem(FILTER_KEY, raw)
        localStorage.removeItem(LEGACY_FILTER_KEY)
      }
    }
    if (!raw) return { ...DEFAULT_FILTERS }
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) }
  } catch {
    return { ...DEFAULT_FILTERS }
  }
}

export function useContests() {
  const contests = seed as Contest[]
  const [filters, setFiltersState] = useState<FilterState>(readFilters)

  const setFilters = useCallback((next: FilterState | ((prev: FilterState) => FilterState)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      localStorage.setItem(FILTER_KEY, JSON.stringify(value))
      return value
    })
  }, [])

  const filtered = useMemo(() => applyFilters(contests, filters), [contests, filters])

  const getBySlug = useCallback(
    (slug: string) => contests.find((c) => c.slug === slug),
    [contests],
  )

  const autoOkCount = useMemo(
    () => contests.filter((c) => c.auto_class === 'AUTO_OK' && c.health === 'live').length,
    [contests],
  )

  const exclusives = useMemo(
    () => contests.filter((c) => c.exclusive || c.source === 'scale_health'),
    [contests],
  )

  return { contests, filtered, filters, setFilters, getBySlug, autoOkCount, exclusives }
}
