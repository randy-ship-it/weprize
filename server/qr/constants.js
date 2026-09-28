/** QR affiliate / sticker / B2B constants — rates live in DB; these are defaults + copy only. */

export const QR_TERMS_VERSION = 'qr_terms_v1'

export const QR_TERMS_TEXT =
  'By claiming a WePrize QR code, you earn the current affiliate share of every purchase attributed to your code (starts at 50%). WePrize can change that share anytime. Use your code honestly: no spam, no fake traffic, no fraud. Abuse can get a code shut off. Clicking Agree means you accept these terms.'

export const B2B_TERMS_VERSION = 'b2b_terms_v1'

export const B2B_TERMS_TEXT =
  'As a WePrize B2B rep, you earn a share of WePrize’s cut from purchases attributed to businesses you recruit (starts at 35% of WePrize’s share). Rep earnings last 24 months per business you bring in — after that, your share on that business stops and WePrize keeps the remainder. WePrize can change rates and the month cap anytime. No spam, no fake signups, no fraud. Abuse gets accounts shut off. Clicking Agree means you accept these terms.'

/** Defaults — migration / settings seed only. Read from DB at credit time. */
export const DEFAULT_AFFILIATE_RATE_BPS = 5000 // host 50%
export const DEFAULT_B2B_REP_RATE_BPS = 3500 // 35% of WePrize share
export const DEFAULT_B2B_REP_MONTHS = 24

export const SETTING_RATE_BPS = 'qr_affiliate_rate_bps'
export const SETTING_B2B_REP_RATE_BPS = 'b2b_rep_rate_bps'
export const SETTING_B2B_REP_MONTHS = 'b2b_rep_months'

export const JINGLES = [
  'Scan it. Share it. Cash it.',
  'Your code. Their buy. Your cut.',
  'Stick it. Scan it. Stack it.',
  'Print free. Get paid forever.',
  'Half the sale. All the hustle.',
]

export const STICKER_SKU = {
  id: 'sticker_50',
  name: '50 hard stickers shipped',
  amount_cents: 2400,
  currency: 'cad',
  cogs_note:
    '~$8–12 CAD print+ship (manual Sticker Mule / local). Gross ~$12–16 before affiliate. Affiliate credits current host rate_bps of sale when attributed.',
}

export const APP_BASE = () =>
  (process.env.APP_BASE_URL || 'https://weprize.net').replace(/\/$/, '')

export function shareUrlFor(code) {
  return `${APP_BASE()}/r/${encodeURIComponent(code)}`
}

export function creditCents(amountCents, rateBps) {
  const amt = Math.max(0, Number(amountCents) || 0)
  const bps = Math.max(0, Number(rateBps) || 0)
  return Math.floor((amt * bps) / 10000)
}

/**
 * Split purchase into host / weprize / rep shares.
 * Host gets hostRateBps of purchase forever.
 * Of WePrize remainder, rep gets repRateBps IF within months window; else rep=0.
 */
export function splitPurchase({ amountCents, hostRateBps, repRateBps, repActive }) {
  const amount = Math.max(0, Number(amountCents) || 0)
  const host = Math.floor((amount * Math.max(0, hostRateBps || 0)) / 10000)
  const weprizeGross = amount - host
  const rep = repActive
    ? Math.floor((weprizeGross * Math.max(0, repRateBps || 0)) / 10000)
    : 0
  const weprizeNet = weprizeGross - rep
  return {
    purchase_amount_cents: amount,
    host_share_cents: host,
    weprize_share_cents: weprizeGross,
    rep_share_cents: rep,
    weprize_net_cents: weprizeNet,
  }
}

export function addMonths(isoDate, months) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  const out = new Date(d)
  out.setMonth(out.getMonth() + Number(months))
  return out
}

export function repWindowActive(recruitedAt, months, now = new Date()) {
  if (!recruitedAt) return false
  const end = addMonths(recruitedAt, months)
  if (!end) return false
  return now < end
}

export function periodYYYYMM(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const DEFAULT_TRAILER_MULTIPLE = 3
export const DEFAULT_TRAILER_RATE_BPS = 1500 // 15% of WePrize share perpetual after trailer
export const SETTING_TRAILER_MULTIPLE = 'trailer_multiple'
export const SETTING_TRAILER_RATE_BPS = 'trailer_rate_bps'
export const TRAILER_WARN_DAYS = 90

export const B2B_TRAILER_TERMS_SNIPPET =
  'After 24 months your 35% ends unless you buy a Trailer at 3× trailing revenue (last 12 months attributed purchases for that business), which locks 15% forever on that account.'

/**
 * Resolve active rep rate for a placement link.
 * in-window → b2b_rep_rate_bps; post-window + trailer → trailer_rate_bps; else 0.
 */
export function resolveRepRateBps({
  recruitedAt,
  repMonths,
  trailerPurchasedAt,
  inWindowRateBps,
  trailerRateBps,
  now = new Date(),
}) {
  if (repWindowActive(recruitedAt, repMonths, now)) {
    return { rate_bps: inWindowRateBps, rule: 'in_window' }
  }
  if (trailerPurchasedAt) {
    return { rate_bps: trailerRateBps, rule: 'trailer' }
  }
  return { rate_bps: 0, rule: 'expired' }
}
