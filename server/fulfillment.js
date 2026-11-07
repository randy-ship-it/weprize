/**
 * A contest is submitted only when we stored a real receipt.
 * Queue rows, the browser-apply stub, and DRY_RUN markers are not receipts.
 */

export const BROWSER_APPLY_NOT_RUNNING = 'browser_apply_not_running'
export const LEGACY_STUB_REASON = 'worker_stub_pending_browser_apply'

const FAKE_RECEIPTS = new Set(['dry_run', LEGACY_STUB_REASON, BROWSER_APPLY_NOT_RUNNING])

export function jobWasSubmitted(job) {
  if (!job) return false
  if (job.screenshot_path) return true
  const ref = typeof job.confirm_ref === 'string' ? job.confirm_ref.trim() : ''
  return Boolean(ref) && !FAKE_RECEIPTS.has(ref)
}

export function isCustomerActionReason(reason) {
  return reason !== BROWSER_APPLY_NOT_RUNNING && reason !== LEGACY_STUB_REASON
}

export function fulfillmentMessage(order, jobs = []) {
  const submitted = jobs.filter(jobWasSubmitted).length
  const queued = jobs.length
  let message
  if (submitted > 0) {
    message = `Receipt on file for ${submitted} contest${submitted === 1 ? '' : 's'}. Tap a code only when a brand asks you to.`
  } else if (queued === 0) {
    message = 'Payment is recorded. No current eligible contest was queued, and nothing has been submitted to a brand site.'
  } else {
    message = `Payment is recorded. ${queued} current contest${queued === 1 ? ' is' : 's are'} queued. Nothing has been submitted to a brand site.`
  }
  if (order?.year_round) {
    message += ' Year-round repeat entry is not running.'
  }
  return { message, submitted_count: submitted }
}

/** Postgres/Neon outage and unreachable hosts. Not a bad customer request. */
export function isStoreOutage(err) {
  const code = String(err?.code || '')
  if (code === '28000' || code === '57P01' || code === '57P03' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
    return true
  }
  const msg = String(err?.message || err || '')
  return /endpoint has been disabled/i.test(msg) || /ECONNREFUSED|ENOTFOUND|timeout expired/i.test(msg)
}

/** The box worker does not open brand sites. DRY_RUN must not invent an applied receipt. */
export function workerJobPatch() {
  return {
    status: 'failed',
    needs_you_reason: BROWSER_APPLY_NOT_RUNNING,
    confirm_ref: null,
  }
}
