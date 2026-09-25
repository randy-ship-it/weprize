import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { onceSliceSize } from './packs.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let cached = null

/**
 * AUTO_OK + Canada / CA-eligible US only.
 * Matches src/data/contests.json: auto_class, region ca | ca_us.
 */
export function loadAutoOkSlice() {
  if (cached) return cached
  const raw = JSON.parse(readFileSync(join(root, 'src/data/contests.json'), 'utf8'))
  const eligible = raw.filter((c) => {
    if (c.auto_class !== 'AUTO_OK') return false
    if (c.health === 'dead') return false
    const region = String(c.region || '').toLowerCase()
    // Canada first; CA_ELIGIBLE_US stored as ca_us in this book
    return region === 'ca' || region === 'ca_us' || region === 'ca_eligible_us'
  })
  const n = onceSliceSize(eligible.length)
  cached = eligible.slice(0, n).map((c) => ({
    contest_id: c.id,
    contest_url: c.url,
    contest_title: c.name,
  }))
  return cached
}

export function seedMeta() {
  const slice = loadAutoOkSlice()
  return {
    n: slice.length,
    rule: 'min(25, AUTO_OK Canada / CA_ELIGIBLE_US live count)',
  }
}
