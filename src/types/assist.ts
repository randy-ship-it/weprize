/** Customer assist loop types — BYO identity, AUTO_OK applies, customer OTP. */

export type PackId = 'once' | 'triple' | 'year_round'

export type ApplyStatus =
  | 'queued'
  | 'applying'
  | 'applied'
  | 'confirm_sent'
  | 'needs_you'
  | 'confirmed'
  | 'failed'

export type Identity = {
  id: string
  fullName: string
  email: string
  phone?: string
  dob?: string
  addressLine1: string
  addressLine2?: string
  city: string
  province: string
  postal: string
  country: 'CA'
  createdAt: string
  updatedAt: string
}

export type Order = {
  id: string
  pack: PackId
  status: 'paid' | 'pending' | 'cancelled'
  /** Live AUTO_OK count printed at purchase time (demo). */
  autoOkPrinted?: number
  stripeSessionHint?: string
  createdAt: string
}

export type Apply = {
  id: string
  orderId: string
  contestId: string
  contestName: string
  contestSlug?: string
  prizeText?: string
  status: ApplyStatus
  /** Human next step when status is needs_you / confirm_sent. */
  nextStep?: string
  /** Optional deep link or mailto for the customer action. */
  actionHint?: string
  updatedAt: string
  createdAt: string
}

export type AssistState = {
  version: 1
  order: Order | null
  identity: Identity | null
  applies: Apply[]
}

export const PACK_LABELS: Record<PackId, { name: string; price: string; blurb: string }> = {
  once: {
    name: 'Once',
    price: '$9',
    blurb: 'One round of AUTO_OK applies for one person.',
  },
  triple: {
    name: 'Triple',
    price: '$15',
    blurb: 'Three legal adults you know, or three apply rounds.',
  },
  year_round: {
    name: 'Year-round',
    price: '$19.99/mo',
    blurb: 'Continuous AUTO_OK applies for one person as contests open.',
  },
}

export const APPLY_STATUS_LABELS: Record<ApplyStatus, string> = {
  queued: 'Queued',
  applying: 'Applying',
  applied: 'Applied',
  confirm_sent: 'Confirm sent',
  needs_you: 'Needs you',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

export function isPackId(v: string | null | undefined): v is PackId {
  return v === 'once' || v === 'triple' || v === 'year_round'
}
