import type { FrictionBadge as FrictionBadgeId } from '../types/contest'
import { FRICTION_LABELS, FRICTION_SEVERITY, frictionClass } from '../lib/friction'

export function FrictionBadgePill({ badge }: { badge: FrictionBadgeId }) {
  const severity = FRICTION_SEVERITY[badge]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${frictionClass(severity)}`}
      title={FRICTION_LABELS[badge]}
    >
      {FRICTION_LABELS[badge]}
    </span>
  )
}

export function FrictionBadgeRow({
  badges,
  emptyLabel = 'No friction flags',
}: {
  badges: FrictionBadgeId[]
  emptyLabel?: string
}) {
  if (!badges.length) {
    return <span className="text-xs text-slate-500">{emptyLabel}</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <FrictionBadgePill key={b} badge={b} />
      ))}
    </div>
  )
}

const LEGEND: FrictionBadgeId[] = [
  'form',
  'daily',
  'skill_q',
  'mail_npn',
  'gleam_actions',
  'otp',
  'captcha',
  'account_wall',
  'phone_required',
  'membership',
  'receipt',
  'essay',
  'geo_risk',
  'purchase_pin',
  'ig_only',
]

export function BadgeLegend() {
  return (
    <div className="card-surface rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-navy-950 mb-1">Friction badge legend</h3>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Badges show before you click. Info = mild · amber = warn · rose = block / high friction.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {LEGEND.map((b) => (
          <FrictionBadgePill key={b} badge={b} />
        ))}
      </div>
    </div>
  )
}
