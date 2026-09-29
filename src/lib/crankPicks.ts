import type { Contest } from '../types/contest'
import { daysLeft } from './filters'

export type CrankPick = {
  id: string
  prize: string
  host: string
  emoji: string
  closesInDays: number | null
}

/** Open, free, Canada-eligible contests WePrize can enter without a CAPTCHA or purchase. */
export function crankPool(contests: Contest[], now = new Date()): Contest[] {
  return contests.filter((c) => {
    if (c.health !== 'live' || !c.free_entry || c.exclusive) return false
    if (c.auto_class !== 'AUTO_OK') return false
    if (c.region !== 'ca' && c.region !== 'ca_us') return false
    if (!c.prize_text || c.prize_text.length < 6) return false
    if (/\bTBD\b|\bsee\b|unknown|prize pool|\?/i.test(c.prize_text)) return false
    if ((Number(c.prize_pool_cad) || 0) < 100) return false
    const d = daysLeft(c.close_at_et, now)
    return d == null || d >= 1
  })
}

function emojiFor(text: string): string {
  const t = text.toLowerCase()
  if (/cash|\$[0-9].*(cash)|visa|mastercard/.test(t)) return '💵'
  if (/gift card|voucher|to spend|credit/.test(t)) return '🎁'
  if (/cruise|trip|getaway|escape|nights|hotel|flight|vacation|yacht/.test(t)) return '✈️'
  if (/gmc|car|vehicle|truck|suv/.test(t)) return '🚗'
  if (/ticket|concert|backstage|show|game/.test(t)) return '🎟️'
  if (/wellness|vitamin|spa|massage|laser|skincare|fitness|yoga/.test(t)) return '🌿'
  if (/cook|smoker|bbq|kitchen|food|beef|diaper/.test(t)) return '🍳'
  if (/tool|ryobi|sewing|furniture|patio/.test(t)) return '🛠️'
  return '🏆'
}

function hostOf(c: Contest): string {
  const clean = c.name
    .replace(/\(.*?\)/g, '')
    .replace(/\b(contest|giveaway|sweepstakes|sweeps)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > 42 ? `${clean.slice(0, 40).trim()}…` : clean
}

function prizeOf(c: Contest): string {
  const p = c.prize_text
    .replace(/\((?:[^)]*?(?:ARV|EST|approx)[^)]*)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return p.length > 64 ? `${p.slice(0, 62).trim()}…` : p
}

/** A varied random mix: bigger prizes first, no duplicate hosts. */
export function drawCrank(pool: Contest[], count = 12, now = new Date()): CrankPick[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const big = shuffled.filter((c) => (Number(c.prize_pool_cad) || 0) >= 1000)
  const rest = shuffled.filter((c) => (Number(c.prize_pool_cad) || 0) < 1000)
  const seen = new Set<string>()
  const out: CrankPick[] = []
  for (const c of [...big.slice(0, 5), ...rest, ...big.slice(5)]) {
    if (out.length >= count) break
    const host = hostOf(c)
    const key = host.split(' ').slice(0, 2).join(' ').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: c.id,
      prize: prizeOf(c),
      host,
      emoji: emojiFor(`${c.name} ${c.prize_text}`),
      closesInDays: daysLeft(c.close_at_et, now),
    })
  }
  return out
}
