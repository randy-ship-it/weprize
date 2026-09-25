import { publicIdentity } from './identity.js'
import { PACKS, slotsFor } from './packs.js'
import { seedMeta } from './contests.js'

/** Public order payload — no Stripe secrets, no raw dump beyond customer needs. */
export function publicOrder(order, identities = [], jobs = []) {
  const slots = slotsFor(order.pack)
  const counts = {
    queued: 0,
    applying: 0,
    applied: 0,
    confirm_sent: 0,
    needs_you: 0,
    confirmed: 0,
    failed: 0,
  }
  for (const j of jobs) {
    if (counts[j.status] != null) counts[j.status] += 1
  }
  const meta = seedMeta()
  return {
    token: order.token,
    pack: order.pack,
    pack_label: PACKS[order.pack]?.label || order.pack,
    status: order.status,
    year_round: Boolean(order.year_round),
    amount_cents: order.amount_cents,
    currency: order.currency || 'cad',
    created_at: order.created_at,
    identity_slots: slots,
    identities_count: identities.length,
    identities: identities.map(publicIdentity),
    needs_identity: identities.length < slots,
    job_counts: counts,
    jobs_total: jobs.length,
    seed_n: meta.n,
    stripe_session_id: undefined, // never expose unless needed — omit
    message: 'We apply. You tap codes when asked.',
  }
}

export function publicJob(job) {
  return {
    id: job.id,
    contest_id: job.contest_id,
    contest_url: job.contest_url,
    contest_title: job.contest_title,
    status: job.status,
    needs_you_reason: job.needs_you_reason,
    confirm_ref: job.confirm_ref,
    screenshot_path: job.screenshot_path ? true : false, // existence only
    updated_at: job.updated_at,
    created_at: job.created_at,
    identity_id: job.identity_id,
  }
}

export function humanNeedsYou(reason) {
  if (!reason) {
    return 'Open the brand site or your inbox and finish the step they asked for (code, confirm link, or account). Then return here.'
  }
  if (reason === 'worker_stub_pending_browser_apply') {
    return 'Our apply worker has this contest ready. When the live browser apply hits CAPTCHA or OTP, you will get a clear next step here.'
  }
  if (reason === 'captcha') {
    return 'The brand site showed a CAPTCHA. Solve it on their page with your own browser — we stop before CAPTCHA on purpose.'
  }
  if (reason === 'otp' || reason === 'customer_otp') {
    return 'Check your email or SMS for a one-time code from the brand, enter it on their site, then mark yourself done here.'
  }
  return reason
}
