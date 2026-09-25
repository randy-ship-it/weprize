/** Pack SKUs only: once | triple | year_round. Do not invent more. */

export const PACKS = {
  once: { slots: 1, yearRound: false, label: 'Once' },
  triple: { slots: 3, yearRound: false, label: 'Triple' },
  year_round: { slots: 1, yearRound: true, label: 'Year-round' },
}

/** Known Stripe Payment Link slugs (buy.stripe.com/…). */
export const PAYMENT_LINK_HINTS = {
  eVqcN52d75lE0Yu9hc8AE03: 'once',
  '14AfZh8Bv29sePkalg8AE04': 'triple',
  '5kQ7sLdVP15o7mS8d88AE02': 'year_round',
}

export function isPack(v) {
  return v === 'once' || v === 'triple' || v === 'year_round'
}

export function slotsFor(pack) {
  return PACKS[pack]?.slots ?? 1
}

/**
 * Infer pack from Checkout Session. Never invent SKUs.
 * Order: metadata.pack → payment_link slug → amount/mode heuristic → once.
 */
export function inferPack(session) {
  const meta = session?.metadata?.pack
  if (isPack(meta)) return meta

  const blob = [
    session?.payment_link,
    session?.metadata?.payment_link,
    session?.success_url,
    session?.cancel_url,
  ]
    .filter(Boolean)
    .join(' ')

  for (const [slug, pack] of Object.entries(PAYMENT_LINK_HINTS)) {
    if (String(blob).includes(slug)) return pack
  }

  const cents = Number(session?.amount_total)
  if (cents === 1999) return 'year_round'
  if (cents === 1500) return 'triple'
  if (cents === 900) return 'once'
  if (session?.mode === 'subscription') return 'year_round'
  return 'once'
}

/** Once-sized AUTO_OK slice for MVP. Documented in FULFILLMENT.md. */
export function onceSliceSize(available) {
  return Math.min(25, available)
}
