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
