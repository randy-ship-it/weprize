#!/usr/bin/env node
/**
 * Box-side assist worker stub (not Replit Autoscale).
 * Reads the same store as the API (DATABASE_URL Postgres or data/weprize.json).
 * Picks queued jobs and marks them failed (browser_apply_not_running).
 * Does not submit to brand sites. DRY_RUN does not invent an applied receipt.
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
const { workerJobPatch } = await import(pathToFileURL(join(root, 'server/fulfillment.js')).href)

const LIMIT = Number(process.env.LIMIT || 5)
const DRY = process.env.DRY_RUN === '1'

const store = await getStore()
const claimed = await store.claimQueuedJobs(LIMIT)

if (!claimed.length) {
  console.log('[worker] no queued jobs')
  process.exit(0)
}

for (const job of claimed) {
  const updated = await store.updateJob(job.id, workerJobPatch())
  console.log(DRY ? '[worker] DRY_RUN not submitted' : '[worker] not submitted', updated.id, updated.contest_id)
}

console.log('[worker] done', claimed.length)
