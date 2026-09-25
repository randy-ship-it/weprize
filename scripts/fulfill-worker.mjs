#!/usr/bin/env node
/**
 * Box-side assist worker stub (not Replit Autoscale).
 * Reads the same store as the API (DATABASE_URL Postgres or data/weprize.json).
 * Picks queued jobs → applying → needs_you (reason worker_stub_pending_browser_apply)
 *   OR applied when DRY_RUN=1.
 *
 * Parent WePrize agent owns real browser apply. Do NOT invent PII here.
 *
 * Usage:
 *   node scripts/fulfill-worker.mjs
 *   DRY_RUN=1 LIMIT=10 node scripts/fulfill-worker.mjs
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { getStore } = await import(pathToFileURL(join(root, 'server/db.js')).href)
const { maybeNudgeNeedsYou } = await import(pathToFileURL(join(root, 'server/nudge.js')).href)

const LIMIT = Number(process.env.LIMIT || 5)
const DRY = process.env.DRY_RUN === '1'

const store = await getStore()
const claimed = await store.claimQueuedJobs(LIMIT)

if (!claimed.length) {
  console.log('[worker] no queued jobs')
  process.exit(0)
}

for (const job of claimed) {
  if (DRY) {
    const updated = await store.updateJob(job.id, {
      status: 'applied',
      needs_you_reason: null,
      confirm_ref: 'dry_run',
    })
    console.log('[worker] DRY_RUN applied', updated.id, updated.contest_id)
    continue
  }

  const updated = await store.updateJob(job.id, {
    status: 'needs_you',
    needs_you_reason: 'worker_stub_pending_browser_apply',
  })
  console.log('[worker] needs_you', updated.id, updated.contest_title)

  const order = await store.getOrderById(job.order_id)
  if (order?.token) {
    const nudge = await maybeNudgeNeedsYou({ store, job: updated, orderToken: order.token })
    if (nudge.sent) console.log('[worker] nudge sent', nudge.id)
    else console.log('[worker] nudge skip', nudge.reason)
  }
}

console.log('[worker] done', claimed.length)
