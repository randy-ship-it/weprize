#!/usr/bin/env node
/**
 * Health-check stub (Phase 1 draft)
 *
 * Browser UI marks status via localStorage (see src/lib/health.ts).
 * This CLI sketches how a scheduled HEAD/GET worker would update the same
 * fields on a future server/DB. It does NOT hit live contest URLs in this
 * draft (example.com placeholders) and does NOT publish anything.
 *
 * Later plug-in:
 *  1. Load contest list from DB/JSON
 *  2. For each url: HEAD (fallback soft GET), timeout ~8s, follow redirects
 *  3. HTTP >= 400 or network error -> status = dead_link
 *  4. Body matches /contest closed|ended|no longer|expired/i -> status = ended
 *  5. Else status = live; always bump last_health_check_at
 *  6. Fail soft: never delete rows; store health_detail with code + snippet
 *
 * Usage:
 *   node scripts/health-check-stub.mjs
 *   node scripts/health-check-stub.mjs --demo-mark c-012 dead_link
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const seedPath = join(__dirname, '../src/data/contests.json')
const contests = JSON.parse(readFileSync(seedPath, 'utf8'))

const args = process.argv.slice(2)

if (args[0] === '--demo-mark' && args[1] && args[2]) {
  const id = args[1]
  const status = args[2]
  const allowed = new Set(['live', 'ended', 'dead_link', 'unknown'])
  if (!allowed.has(status)) {
    console.error('status must be live|ended|dead_link|unknown')
    process.exit(1)
  }
  const row = contests.find((c) => c.id === id || c.slug === id)
  if (!row) {
    console.error('contest not found:', id)
    process.exit(1)
  }
  const now = new Date().toISOString()
  console.log(
    JSON.stringify(
      {
        id: row.id,
        slug: row.slug,
        previous_status: row.status,
        status,
        last_health_check_at: now,
        health_detail: `CLI stub mark -> ${status}`,
        note: 'Draft only. Persist via API/DB in a later phase.',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

console.log('Contest Aggregator health-check stub')
console.log(`Seed contests: ${contests.length}`)
console.log('')
console.log('Statuses in seed:')
for (const c of contests) {
  console.log(`  ${c.id}  ${c.status.padEnd(10)}  ${c.slug}`)
}
console.log('')
console.log('Dry run only. No network probes in Phase 1 draft.')
console.log('Example mark: node scripts/health-check-stub.mjs --demo-mark c-012 dead_link')
console.log('UI path: open a contest detail page and use Mark live|ended|dead_link|unknown')
