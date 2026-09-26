import type { PackId } from '../types/assist'

export const STRIPE_LINKS = {
  once: 'https://buy.stripe.com/eVqcN52d75lE0Yu9hc8AE03',
  triple: 'https://buy.stripe.com/14AfZh8Bv29sePkalg8AE04',
  year_round: 'https://buy.stripe.com/5kQ7sLdVP15o7mS8d88AE02',
} as const

/**
 * Stripe Dashboard → each Payment Link → After payment → redirect.
 * MUST include `{CHECKOUT_SESSION_ID}` so /success can resolve /order/:token
 * via GET /api/orders/by-session/:id. Without it, buyers land with only ?pack=
 * and need recover-by-email or the post-pay Resend order link.
 *
 * Templates (hardcoded — copy into Dashboard exactly):
 *   https://weprize.net/success?pack=once&session_id={CHECKOUT_SESSION_ID}
 *   https://weprize.net/success?pack=triple&session_id={CHECKOUT_SESSION_ID}
 *   https://weprize.net/success?pack=year_round&session_id={CHECKOUT_SESSION_ID}
 *
 * Cancel URL: https://weprize.net/pricing
 */
export const STRIPE_SUCCESS_URLS: Record<PackId, string> = {
  once: 'https://weprize.net/success?pack=once&session_id={CHECKOUT_SESSION_ID}',
  triple: 'https://weprize.net/success?pack=triple&session_id={CHECKOUT_SESSION_ID}',
  year_round: 'https://weprize.net/success?pack=year_round&session_id={CHECKOUT_SESSION_ID}',
}

export const PACK_FROM_QUERY = STRIPE_SUCCESS_URLS

/**
 * Append Stripe Payment Link attribution when inbound peer ref is known.
 * client_reference_id is supported as a URL param on Payment Links.
 */

/**
 * Primary paid CTA while Checkout Sessions are not usable
 * (STRIPE_SECRET_KEY must be a live secret before POST /api/checkout is the default).
 * Payment Links still need the Dashboard After-payment redirect with {CHECKOUT_SESSION_ID}.
 */
export function paymentLinkWithRef(pack: PackId, ref?: string | null): string {
  const base = STRIPE_LINKS[pack]
  const code = (ref || '').trim().toLowerCase()
  if (!/^[a-z0-9]{6,8}$/.test(code)) return base
  const u = new URL(base)
  u.searchParams.set('client_reference_id', code)
  u.searchParams.set('utm_source', 'peer')
  u.searchParams.set('utm_medium', 'share')
  u.searchParams.set('utm_content', code)
  return u.toString()
}
