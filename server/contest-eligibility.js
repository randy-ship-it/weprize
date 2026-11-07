/**
 * Paid assist may queue only contests that are still open.
 * A missing or unparseable close time is not treated as current.
 */

export function contestClosesAt(contest) {
  if (!contest?.close_at_et) return null
  const close = new Date(contest.close_at_et)
  return Number.isNaN(close.getTime()) ? null : close
}

export function isEligibleCurrentContest(contest, now = new Date()) {
  if (!contest || contest.auto_class !== 'AUTO_OK') return false
  if (contest.health === 'dead') return false
  const region = String(contest.region || '').toLowerCase()
  if (region !== 'ca' && region !== 'ca_us' && region !== 'ca_eligible_us') return false
  const close = contestClosesAt(contest)
  if (!close) return false
  const at = now instanceof Date ? now : new Date(now)
  return close.getTime() > at.getTime()
}
