import type { FrictionBadge } from '../types/contest'

export const FRICTION_LABELS: Record<FrictionBadge, string> = {
  form: 'Simple form',
  gleam_actions: 'Gleam actions',
  daily: 'Daily entry',
  mail_npn: 'Mail NPN',
  skill_q: 'Skill question',
  membership: 'Membership',
  captcha: 'CAPTCHA',
  otp: 'OTP / code',
  receipt: 'Receipt upload',
  essay: 'Essay',
  account_wall: 'Account wall',
  geo_risk: 'Geo risk',
  phone_required: 'Phone required',
  purchase_pin: 'Purchase / PIN',
  ig_only: 'IG-only',
}

export const FRICTION_SEVERITY: Record<FrictionBadge, 'info' | 'warn' | 'block'> = {
  form: 'info',
  daily: 'info',
  skill_q: 'info',
  mail_npn: 'warn',
  gleam_actions: 'warn',
  receipt: 'warn',
  essay: 'warn',
  phone_required: 'warn',
  otp: 'warn',
  geo_risk: 'warn',
  captcha: 'block',
  account_wall: 'block',
  membership: 'block',
  purchase_pin: 'block',
  ig_only: 'block',
}

export const HIGH_FRICTION: FrictionBadge[] = [
  'captcha',
  'account_wall',
  'purchase_pin',
  'membership',
  'ig_only',
]

export function frictionClass(severity: 'info' | 'warn' | 'block'): string {
  switch (severity) {
    case 'block':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'warn':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
