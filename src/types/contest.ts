export type PrizeTier = {
  n: number
  arv_cad: number
  type: 'cash' | 'gc' | 'goods' | 'trip' | 'grand' | 'secondary' | 'instant'
}

export type FrictionBadge =
  | 'form'
  | 'gleam_actions'
  | 'daily'
  | 'mail_npn'
  | 'skill_q'
  | 'membership'
  | 'captcha'
  | 'otp'
  | 'receipt'
  | 'essay'
  | 'account_wall'
  | 'geo_risk'
  | 'phone_required'
  | 'purchase_pin'
  | 'ig_only'

export type AutoClass =
  | 'AUTO_OK'
  | 'ASSIST_QUEUE'
  | 'NEEDS_YOU'
  | 'HUMAN_ONLY'
  | 'SKIP'
  | 'BLOCKED'

export type PlatformFamily =
  | 'gleam'
  | 'woobox'
  | 'viralsweep'
  | 'brandsite'
  | 'radio'
  | 'castanet'
  | 'jotform'
  | 'form123'
  | 'ig'
  | 'first_party'
  | 'unknown'

export type Contest = {
  id: string
  slug: string
  name: string
  url: string
  rules_url?: string
  prize_text: string
  prize_tiers?: PrizeTier[]
  prize_pool_cad?: number
  close_at_et?: string
  days_left?: number
  region: 'ca' | 'ca_us' | 'us' | 'other'
  provinces?: string[]
  qc_ok?: boolean
  free_entry: boolean
  platform_family: PlatformFamily
  friction_badges: FrictionBadge[]
  auto_class: AutoClass
  household_rule?: 'person' | 'email' | 'household' | 'device' | 'unknown'
  field_prior_low?: number
  field_prior_mid?: number
  field_prior_high?: number
  ev_low?: number
  ev_mid?: number
  ev_high?: number
  minutes_to_enter?: number
  health: 'live' | 'dead' | 'unknown'
  last_ok_at?: string
  third_party_entry_banned?: boolean
  confirm_email_expected?: boolean
  pool_source?: 'rules_tiers' | 'top_only_unknown_tiers' | 'estimated'
  soft_field?: boolean
  source?: string
  new_live?: boolean
  exclusive?: boolean
  eligibility_summary?: string
}

export type Exclusive = {
  id: string
  slug: string
  title: string
  sponsor: 'Scale Health'
  sponsor_url: string
  summary: string
  prize_text: string
  arv_cad_estimate?: number
  status: 'preview' | 'coming' | 'live'
  first_party: true
  lane: 'humanoid' | 'home_pt' | 'align' | 'other'
  highlights: string[]
  cta_label: string
  contest_slug?: string
}

export type Tally = {
  label: string
  person_entries: number
  unique_contests: number
  face_pool_cad: number
  haircut_pool_cad: number
  est_ev_mid_cad: number
  est_ev_high_field_cad: number
  p_ge_100_pct: number
  open_inventory_range: string
  disclaimer: string
}

export type FilterState = {
  canadaEligible: boolean
  freeNoPurchase: boolean
  hideHighFriction: boolean
  closingSoon: boolean
  newLive: boolean
  autoOkOnly: boolean
  softFieldOnly: boolean
  scaleExclusiveOnly: boolean
  province: string
  sort: 'ev_per_min' | 'closing' | 'new'
}

export type ProfileStub = {
  id: string
  display_name: string
  email: string
  phone?: string
  address_line: string
  city: string
  province: string
  postal: string
  notes: string
}
