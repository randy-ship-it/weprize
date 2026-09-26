import type { Contest } from '../types/contest'
import { daysLeft } from './filters'

export type PrizeKind = 'wellness' | 'vehicle' | 'cash' | 'trip'

export type PrizeExample = {
  id: string
  slug: string
  name: string
  prizeText: string
  kind: PrizeKind
  kindLabel: string
  arvCad: number
  /** Listing says "up to" a cap (voucher / toward a purchase), not a fixed award. */
  upTo: boolean
  /** Listing itself marks the figure as approximate. */
  approx: boolean
}

const KIND_LABEL: Record<PrizeKind, string> = {
  wellness: 'Health & wellness',
  vehicle: 'Vehicle',
  cash: 'Cash',
  trip: 'Trip',
}

const MIN_ARV = 1000

function isOpenLive(c: Contest, now: Date): boolean {
  if (c.health !== 'live' || c.exclusive || !c.free_entry) return false
  if (c.region !== 'ca' && c.region !== 'ca_us') return false
  const d = daysLeft(c.close_at_et, now)
  return d == null || d > 0
}

/**
 * Estimated ARV in CAD from the public listing.
 * Points totals stored as dollars (e.g. 250,000 Aeroplan) are not treated as CAD.
 * A tiny structured pool is ignored when the listing itself states a ~$ figure.
 */
export function estimatedArvCad(c: Contest): number | null {
  const text = `${c.name} ${c.prize_text || ''}`
  const explicit =
    text.match(/\(~?\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k)?\s*(?:CAD\s*)?(?:ARV|EST)\)/i) ||
    text.match(/~\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k)?\b/i)

  const tier = Math.max(0, ...(c.prize_tiers || []).map((t) => Number(t.arv_cad) || 0))
  const pool = Number(c.prize_pool_cad) || 0
  const structured = Math.max(tier, pool)

  const fromExplicit = (): number | null => {
    if (!explicit) return null
    const n = Number(explicit[1].replace(/,/g, ''))
    if (!Number.isFinite(n)) return null
    return Math.round(explicit[2] ? n * 1000 : n)
  }

  if (/points/i.test(text)) {
    const stated = fromExplicit()
    return stated != null && stated >= 100 ? stated : null
  }

  if (explicit && structured > 0 && structured < MIN_ARV) {
    const stated = fromExplicit()
    if (stated != null && stated >= MIN_ARV && stated > structured * 5) return stated
  }

  if (structured >= MIN_ARV) return Math.round(structured)

  const stated = fromExplicit()
  if (stated != null && stated >= 500) return stated
  return null
}

function kindOf(c: Contest): PrizeKind | null {
  const text = `${c.name} ${c.prize_text || ''}`
  if (/not automotive/i.test(text)) {
    // fall through — dealer credit that is explicitly not a vehicle
  } else if (
    /\b(gmc|chrysler|dodge|jeep|ram|fiat|alfa|suv|truck|vehicle|wheels)\b/i.test(text) &&
    /\$|voucher|toward/i.test(text)
  ) {
    return 'vehicle'
  }
  if (
    /\b(wellness|vitamin|jamieson|rexall|supplement|skincare|nin jiom|be well|health magazine|physio|massage gun|sleep country)\b/i.test(
      text,
    )
  ) {
    return 'wellness'
  }
  if (/\b(trip|cruise|voyage|vacation|getaway|aruba|yacht|airfare|whistler)\b/i.test(text)) {
    return 'trip'
  }
  if (/\bcash\b/i.test(text) || (/\$[0-9]/i.test(text) && /\bgrand\b/i.test(text))) {
    return 'cash'
  }
  return null
}

function toExample(c: Contest, kind: PrizeKind, arvCad: number): PrizeExample {
  const prizeText = c.prize_text || ''
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    prizeText,
    kind,
    kindLabel: KIND_LABEL[kind],
    arvCad,
    upTo: /up to/i.test(prizeText),
    approx: /~|ARV|EST|about/i.test(prizeText),
  }
}

/**
 * 3–5 live/open examples across cash, vehicle, trip, and health & wellness.
 * Wellness is included when its listing ARV clears the floor, even if a car is larger.
 */
export function selectPrizeExamples(contests: Contest[], now = new Date()): PrizeExample[] {
  const ranked = contests
    .filter((c) => isOpenLive(c, now))
    .map((c) => ({ c, kind: kindOf(c), arv: estimatedArvCad(c) }))
    .filter((row): row is { c: Contest; kind: PrizeKind; arv: number } => {
      return row.kind != null && row.arv != null && row.arv >= MIN_ARV
    })
    .sort((a, b) => b.arv - a.arv || a.c.name.localeCompare(b.c.name))

  const used = new Set<string>()
  const picks: PrizeExample[] = []

  function take(kind: PrizeKind) {
    const row = ranked.find((r) => r.kind === kind && !used.has(r.c.id))
    if (!row) return
    used.add(row.c.id)
    picks.push(toExample(row.c, row.kind, row.arv))
  }

  take('wellness')
  take('vehicle')
  take('cash')
  take('trip')

  const extraTrip = ranked.find((r) => r.kind === 'trip' && !used.has(r.c.id))
  if (extraTrip && picks.length < 5) {
    used.add(extraTrip.c.id)
    picks.push(toExample(extraTrip.c, extraTrip.kind, extraTrip.arv))
  }

  for (const row of ranked) {
    if (picks.length >= 5) break
    if (used.has(row.c.id)) continue
    used.add(row.c.id)
    picks.push(toExample(row.c, row.kind, row.arv))
  }

  const vehicle = picks.find((p) => p.kind === 'vehicle')
  const wellness = picks.find((p) => p.kind === 'wellness')
  const rest = picks
    .filter((p) => p !== vehicle && p !== wellness)
    .sort((a, b) => b.arvCad - a.arvCad)

  const ordered: PrizeExample[] = []
  if (vehicle) ordered.push(vehicle)
  if (wellness) ordered.push(wellness)
  ordered.push(...rest)
  return ordered.slice(0, 5)
}
