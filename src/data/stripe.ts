import type { PackId } from '../types/assist'

export const STRIPE_LINKS = {
  once: 'https://buy.stripe.com/eVqcN52d75lE0Yu9hc8AE03',
  triple: 'https://buy.stripe.com/14AfZh8Bv29sePkalg8AE04',
  year_round: 'https://buy.stripe.com/5kQ7sLdVP15o7mS8d88AE02',
} as const

/** Exact success_url values to set on each Stripe Payment Link (Dashboard). */
export const STRIPE_SUCCESS_URLS: Record<PackId, string> = {
  once: 'https://weprize.net/success?pack=once',
  triple: 'https://weprize.net/success?pack=triple',
  year_round: 'https://weprize.net/success?pack=year_round',
}

export const PACK_FROM_QUERY = STRIPE_SUCCESS_URLS

/**
 * Append Stripe Payment Link attribution when inbound peer ref is known.
 * client_reference_id is supported as a URL param on Payment Links.
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
