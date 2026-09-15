import type { AutoClass, Contest, FilterState, PlatformFamily } from '../types/contest'
import { HIGH_FRICTION } from './friction'

export const DEFAULT_FILTERS: FilterState = {
  canadaEligible: true,
  freeNoPurchase: true,
  hideHighFriction: false,
  closingSoon: false,
  newLive: false,
  autoOkOnly: false,
  softFieldOnly: false,
  scaleExclusiveOnly: false,
  province: '',
  sort: 'ev_per_min',
}

export function daysLeft(closeAtEt?: string, now = new Date()): number | null {
  if (!closeAtEt) return null
  const close = new Date(closeAtEt)
  return Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function evPerMinute(c: Contest): number {
  if (c.ev_mid == null || !c.minutes_to_enter || c.minutes_to_enter <= 0) return -1
  return c.ev_mid / c.minutes_to_enter
}

export function sortContests(list: Contest[], mode: FilterState['sort'] = 'ev_per_min'): Contest[] {
  const autoRank = (a: AutoClass) =>
    a === 'AUTO_OK' ? 0 : a === 'ASSIST_QUEUE' ? 1 : a === 'NEEDS_YOU' ? 2 : 3
  return [...list].sort((a, b) => {
    if (a.health === 'dead' && b.health !== 'dead') return 1
    if (b.health === 'dead' && a.health !== 'dead') return -1
    if (mode === 'new') {
      const na = Number(!!a.new_live)
      const nb = Number(!!b.new_live)
      if (na !== nb) return nb - na
    }
    if (mode === 'closing') {
      const da = a.days_left ?? daysLeft(a.close_at_et) ?? 999
      const db = b.days_left ?? daysLeft(b.close_at_et) ?? 999
      if (da !== db) return da - db
    }
    const ar = autoRank(a.auto_class) - autoRank(b.auto_class)
    if (ar !== 0) return ar
    const ea = evPerMinute(a)
    const eb = evPerMinute(b)
    if (ea !== eb) return eb - ea
    const da = a.days_left ?? daysLeft(a.close_at_et) ?? 999
    const db = b.days_left ?? daysLeft(b.close_at_et) ?? 999
    if (da !== db) return da - db
    if (!!b.soft_field !== !!a.soft_field) return Number(!!b.soft_field) - Number(!!a.soft_field)
    return a.name.localeCompare(b.name)
  })
}

export function applyFilters(contests: Contest[], filters: FilterState): Contest[] {
  let list = [...contests]

  if (filters.canadaEligible) {
    list = list.filter((c) => c.region === 'ca' || c.region === 'ca_us')
  }
  if (filters.freeNoPurchase) {
    list = list.filter((c) => c.free_entry && !c.friction_badges.includes('purchase_pin'))
  }
  if (filters.hideHighFriction) {
    list = list.filter((c) => !c.friction_badges.some((b) => HIGH_FRICTION.includes(b)))
  }
  if (filters.closingSoon) {
    list = list.filter((c) => {
      const d = c.days_left ?? daysLeft(c.close_at_et)
      return d != null && d >= 0 && d <= 3
    })
  }
  if (filters.newLive) {
    list = list.filter((c) => c.new_live && c.health === 'live')
  }
  if (filters.autoOkOnly) {
    list = list.filter((c) => c.auto_class === 'AUTO_OK')
  }
  if (filters.softFieldOnly) {
    list = list.filter((c) => c.soft_field)
  }
  if (filters.scaleExclusiveOnly) {
    list = list.filter((c) => c.exclusive || c.source === 'scale_health')
  }
  if (filters.province) {
    const p = filters.province.toUpperCase()
    list = list.filter((c) => !c.provinces?.length || c.provinces.includes(p))
  }

  return sortContests(list, filters.sort)
}

export function regionLabel(region: Contest['region']): string {
  switch (region) {
    case 'ca':
      return 'Canada'
    case 'us':
      return 'US'
    case 'ca_us':
      return 'CA eligible US'
    default:
      return 'Other'
  }
}

export function platformLabel(platform: PlatformFamily): string {
  const map: Record<PlatformFamily, string> = {
    gleam: 'Gleam',
    woobox: 'Woobox',
    viralsweep: 'ViralSweep',
    brandsite: 'Brand site',
    radio: 'Radio',
    castanet: 'Castanet',
    jotform: 'Jotform',
    form123: 'Form',
    ig: 'Instagram',
    first_party: 'WePrize rails',
    unknown: 'Unknown',
  }
  return map[platform]
}

export function formatCad(n: number): string {
  if (n >= 100) return `$${Math.round(n)}`
  if (n >= 10) return `$${n.toFixed(1)}`
  return `$${n.toFixed(2)}`
}

export function formatPoolM(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`
  return `$${Math.round(n)}`
}

export function healthLabel(h: Contest['health']): string {
  switch (h) {
    case 'live':
      return 'Live'
    case 'dead':
      return 'Dead'
    default:
      return 'Unknown'
  }
}
