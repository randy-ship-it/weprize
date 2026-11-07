import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { onceSliceSize } from './packs.js'
import { isEligibleCurrentContest } from './contest-eligibility.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let cached = null

/**
 * AUTO_OK + Canada / CA-eligible US + close_at_et still in the future.
 * Undated rows are not queued: a missing close time is not proof the contest is open.
 */
export function loadAutoOkSlice(now = new Date()) {
  const day = now.toISOString().slice(0, 10)
  if (cached && cached.day === day) return cached.slice
  const raw = JSON.parse(readFileSync(join(root, 'src/data/contests.json'), 'utf8'))
  const eligible = raw.filter((c) => isEligibleCurrentContest(c, now))
  const n = onceSliceSize(eligible.length)
  const slice = eligible.slice(0, n).map((c) => ({
    contest_id: c.id,
    contest_url: c.url,
    contest_title: c.name,
    close_at_et: c.close_at_et,
  }))
  cached = { day, slice }
  return slice
}

export function seedMeta(now = new Date()) {
  const slice = loadAutoOkSlice(now)
  return {
    n: slice.length,
    rule: 'min(25, AUTO_OK Canada / CA_ELIGIBLE_US with close_at_et still in the future)',
  }
}
