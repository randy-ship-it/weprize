/**
 * Email via Resend: NEEDS_YOU nudges + post-pay order-ready link.
 * No-op when RESEND_API_KEY or RESEND_FROM is missing — never invent mail.
 */

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendResend({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) {
    return { sent: false, reason: 'resend_not_configured' }
  }
  if (!to || !String(to).includes('@')) {
    return { sent: false, reason: 'no_recipient' }
  }
  // Never email placeholder / unknown checkout emails
  const dest = String(to).trim().toLowerCase()
  if (dest.endsWith('@weprize.local') || dest === 'unknown@weprize.local' || dest === 'demo@localhost') {
    return { sent: false, reason: 'placeholder_email' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [dest], subject, text, html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[nudge] resend failed', res.status, body.slice(0, 200))
      return { sent: false, reason: `resend_${res.status}` }
    }
    const data = await res.json().catch(() => ({}))
    return { sent: true, id: data.id }
  } catch (err) {
    console.warn('[nudge] resend error', err?.message || err)
    return { sent: false, reason: 'resend_error' }
  }
}

/**
 * @param {{
 *   to: string,
 *   orderToken: string,
 *   contestTitle: string,
 *   reason?: string | null,
 * }} opts
 */
export async function sendNeedsYouNudge(opts) {
  if (!opts?.to || !String(opts.to).includes('@')) {
    return { sent: false, reason: 'no_recipient' }
  }

  const base = (process.env.APP_BASE_URL || 'https://weprize.net').replace(/\/$/, '')
  const orderUrl = `${base}/order/${opts.orderToken}`
  const title = opts.contestTitle || 'a contest'
  const reason = opts.reason || 'A brand site needs a code or confirmation from you.'

  const subject = `WePrize — action needed: ${title}`
  const text = [
    'We apply. You tap codes when asked.',
    '',
    `Contest: ${title}`,
    `Why: ${reason}`,
    '',
    `Open your order: ${orderUrl}`,
    '',
    'WePrize never asks you to buy anything to finish a free entry.',
    'Official contest rules always govern. Estimates are not guarantees.',
  ].join('\n')

  const html = `
  <div style="font-family:Inter,Segoe UI,system-ui,sans-serif;color:#0B1F33;line-height:1.5;max-width:540px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0D9488;font-weight:700;margin:0 0 8px">WePrize</p>
    <h1 style="font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Action needed</h1>
    <p style="margin:0 0 16px;color:#475569">We apply. You tap codes when asked.</p>
    <div style="border:1px solid rgba(11,31,51,.1);border-radius:16px;padding:16px;background:#F4F8FB;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:12px;color:#0D9488;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Contest</p>
      <p style="margin:0 0 12px;font-weight:600">${escapeHtml(title)}</p>
      <p style="margin:0;color:#475569;font-size:14px">${escapeHtml(reason)}</p>
    </div>
    <p style="margin:0 0 24px">
      <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0D9488;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:12px">Open your order</a>
    </p>
    <p style="font-size:12px;color:#64748b;margin:0">WePrize never asks you to buy anything to finish a free entry. Official contest rules always govern. Estimates are not guarantees.</p>
  </div>`.trim()

  return sendResend({ to: opts.to, subject, text, html })
}

/**
 * After checkout.session.completed fulfill — email the /order/{token} link
 * so buyers can share legal identity even when success_url lacks session_id.
 *
 * @param {{
 *   to: string,
 *   orderToken: string,
 *   packLabel?: string,
 * }} opts
 */
export async function sendOrderReadyEmail(opts) {
  if (!opts?.orderToken) return { sent: false, reason: 'no_token' }

  const base = (process.env.APP_BASE_URL || 'https://weprize.net').replace(/\/$/, '')
  const orderUrl = `${base}/order/${opts.orderToken}`
  const pack = opts.packLabel || 'assist pack'

  const subject = 'WePrize — open your order & share identity'
  const text = [
    'Payment received. We apply. You tap codes when asked.',
    '',
    `Your ${pack} is ready.`,
    '',
    'Next: open your order and share the legal name, email, and mailing address you own so we can apply on eligible AUTO_OK contests.',
    '',
    `Open your order: ${orderUrl}`,
    '',
    'One personal profile for you. Friends = apply-on-behalf with their consent and identity. Max 10 purchases per buyer — not a bulk business tool.',
    'Contests stay free. Your fee is research + time assist. Estimates are not a guarantee. Official contest rules always govern.',
  ].join('\n')

  const html = `
  <div style="font-family:Inter,Segoe UI,system-ui,sans-serif;color:#0B1F33;line-height:1.5;max-width:540px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0D9488;font-weight:700;margin:0 0 8px">WePrize</p>
    <h1 style="font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Payment received</h1>
    <p style="margin:0 0 16px;color:#475569">We apply. You tap codes when asked. Your <strong>${escapeHtml(pack)}</strong> is ready.</p>
    <div style="border:1px solid rgba(11,31,51,.1);border-radius:16px;padding:16px;background:#F4F8FB;margin-bottom:20px">
      <p style="margin:0;color:#475569;font-size:14px">Next: share the legal name, email, and mailing address you own so we can apply on eligible AUTO_OK contests.</p>
    </div>
    <p style="margin:0 0 24px">
      <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0D9488;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:12px">Open your order</a>
    </p>
    <p style="font-size:12px;color:#64748b;margin:0 0 8px">One personal profile for you. Friends = apply-on-behalf with their consent and identity. Max 10 purchases per buyer — not a bulk business tool.</p>
    <p style="font-size:12px;color:#64748b;margin:0">Contests stay free. Your fee is research + time assist. Estimates are not a guarantee. Official contest rules always govern.</p>
  </div>`.trim()

  return sendResend({ to: opts.to, subject, text, html })
}

/**
 * After job → needs_you, email the identity if we have one.
 * Never invent PII — only the customer-submitted identity email.
 */
export async function maybeNudgeNeedsYou({ store, job, orderToken }) {
  if (!job || job.status !== 'needs_you') return { sent: false, reason: 'not_needs_you' }
  if (!job.identity_id) return { sent: false, reason: 'no_identity' }
  const identities = await store.listIdentities(job.order_id)
  const identity = identities.find((i) => i.id === job.identity_id)
  if (!identity?.email) return { sent: false, reason: 'no_email' }
  return sendNeedsYouNudge({
    to: identity.email,
    orderToken,
    contestTitle: job.contest_title,
    reason: job.needs_you_reason,
  })
}
