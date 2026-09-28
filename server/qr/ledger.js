/**
 * Attribution ledger: host forever + optional B2B rep (24mo → trailer 15%).
 * Rates always read from DB settings at credit time.
 */
import {
  DEFAULT_AFFILIATE_RATE_BPS,
  DEFAULT_B2B_REP_MONTHS,
  DEFAULT_B2B_REP_RATE_BPS,
  DEFAULT_TRAILER_RATE_BPS,
  periodYYYYMM,
  resolveRepRateBps,
  SETTING_B2B_REP_MONTHS,
  SETTING_B2B_REP_RATE_BPS,
  SETTING_RATE_BPS,
  SETTING_TRAILER_RATE_BPS,
  splitPurchase,
} from './constants.js'
import { uid } from '../ids.js'

export async function loadRateBundle(store) {
  const host = Number(await store.getQrSetting(SETTING_RATE_BPS, String(DEFAULT_AFFILIATE_RATE_BPS)))
  const rep = Number(await store.getQrSetting(SETTING_B2B_REP_RATE_BPS, String(DEFAULT_B2B_REP_RATE_BPS)))
  const months = Number(await store.getQrSetting(SETTING_B2B_REP_MONTHS, String(DEFAULT_B2B_REP_MONTHS)))
  const trailer = Number(await store.getQrSetting(SETTING_TRAILER_RATE_BPS, String(DEFAULT_TRAILER_RATE_BPS)))
  return {
    host_rate_bps: Number.isFinite(host) ? Math.floor(host) : DEFAULT_AFFILIATE_RATE_BPS,
    b2b_rep_rate_bps: Number.isFinite(rep) ? Math.floor(rep) : DEFAULT_B2B_REP_RATE_BPS,
    b2b_rep_months: Number.isFinite(months) ? Math.floor(months) : DEFAULT_B2B_REP_MONTHS,
    trailer_rate_bps: Number.isFinite(trailer) ? Math.floor(trailer) : DEFAULT_TRAILER_RATE_BPS,
  }
}

/**
 * Credit ANY attributed checkout.session.completed amount.
 * Writes qr_earnings (host) + qr_split_ledger (full split incl. rep).
 */
export async function creditAttributionFromSession(store, session, order) {
  const refRaw =
    session.client_reference_id ||
    session.metadata?.weprize_ref ||
    session.metadata?.ref ||
    null
  if (!refRaw) return null

  // Trailer purchases are handled separately
  if (session.metadata?.weprize_product === 'b2b_trailer') {
    return handleTrailerPurchase(store, session)
  }

  const code = String(refRaw).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
  if (!code) return null

  const amountCents = session.amount_total ?? order?.amount_cents ?? 0
  const currency = session.currency || order?.currency || 'cad'
  const sessionId = session.id

  // Idempotent host credit
  const hostRow = await store.creditQrEarnings({
    code,
    stripeSessionId: sessionId,
    orderId: order?.id || null,
    amountCents,
    currency,
  })

  // Full split ledger (host + weprize + rep)
  let splitRow = null
  if (typeof store.recordSplitLedger === 'function') {
    const rates = await loadRateBundle(store)
    const placement =
      typeof store.getPlacementByCode === 'function' ? await store.getPlacementByCode(code) : null
    const { rate_bps: repBps, rule } = resolveRepRateBps({
      recruitedAt: placement?.recruited_at,
      repMonths: rates.b2b_rep_months,
      trailerPurchasedAt: placement?.trailer_purchased_at,
      inWindowRateBps: rates.b2b_rep_rate_bps,
      trailerRateBps: placement?.trailer_rate_bps || rates.trailer_rate_bps,
    })
    const split = splitPurchase({
      amountCents,
      hostRateBps: rates.host_rate_bps,
      repRateBps: repBps,
      repActive: repBps > 0,
    })
    splitRow = await store.recordSplitLedger({
      id: uid(),
      stripe_session_id: sessionId,
      business_code: code,
      host_email: hostRow?.email || null,
      rep_id: placement?.recruited_by_rep_id || null,
      purchase_amount_cents: split.purchase_amount_cents,
      host_share_cents: split.host_share_cents,
      weprize_share_cents: split.weprize_share_cents,
      rep_share_cents: split.rep_share_cents,
      weprize_net_cents: split.weprize_net_cents,
      host_rate_bps: rates.host_rate_bps,
      rep_rate_bps: repBps,
      rep_rule: rule,
      currency,
      status: 'owed',
      period: periodYYYYMM(),
      order_id: order?.id || null,
    })
  }

  // Sticker order capture
  if (
    (session.metadata?.pack === 'sticker_50' || order?.pack === 'sticker_50') &&
    typeof store.createStickerOrder === 'function'
  ) {
    const details = session.customer_details || {}
    const addr = details.address || session.shipping_details?.address || {}
    await store.createStickerOrder({
      email: String(
        details.email || session.customer_email || session.metadata?.email || 'unknown@weprize.local',
      ).toLowerCase(),
      refCode: code,
      stripeSessionId: sessionId,
      amountCents,
      currency,
      shipping: {
        name: details.name || session.shipping_details?.name || null,
        line1: addr.line1 || null,
        city: addr.city || null,
        province: addr.state || null,
        postal: addr.postal_code || null,
        country: addr.country || 'CA',
      },
    })
  }

  return { host: hostRow, split: splitRow }
}

async function handleTrailerPurchase(store, session) {
  const repId = session.metadata?.rep_id
  const businessCode = String(session.metadata?.business_code || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!repId || !businessCode || typeof store.markTrailerPurchased !== 'function') {
    return { trailer: null, error: 'missing_meta' }
  }
  const rates = await loadRateBundle(store)
  const rateBps = Number(session.metadata?.trailer_rate_bps) || rates.trailer_rate_bps
  const row = await store.markTrailerPurchased({
    businessCode,
    repId,
    stripeSessionId: session.id,
    trailerRateBps: rateBps,
    priceCents: session.amount_total,
    trailingRevenueCents: Number(session.metadata?.trailing_revenue_cents) || 0,
  })
  return { trailer: row }
}
