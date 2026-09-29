/**
 * Waitlist / pricing email consent helpers (CASL + Competition Act safe copy).
 * Persists into Neon audience_sessions + audience_consents when Postgres is live.
 */
import { createHash, randomBytes } from 'node:crypto'

/** Customer-facing opt-in text. Change = new consent_version hash. No em dashes. */
export const WAITLIST_CONSENT_TEXT =
  'I agree to receive WePrize emails about free Canada contests and optional assist packs. Contests stay free. Optional packs buy research and time only, not better odds. We cannot influence who wins. Unsubscribe anytime.'

export function waitlistConsentVersion() {
  const h = createHash('sha256').update(WAITLIST_CONSENT_TEXT).digest('hex')
  return `waitlist_v1-text-sha256:${h}`
}

export function newSessionHash(email) {
  return createHash('sha256')
    .update(`${String(email).toLowerCase().trim()}|${Date.now()}|${randomBytes(16).toString('hex')}`)
    .digest('hex')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeConsentEmail(raw) {
  const email = String(raw || '')
    .trim()
    .toLowerCase()
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return null
  return email
}

export const ALLOWED_SOURCES = new Set(['waitlist', 'pricing', 'home', 'qr', 'popup'])
