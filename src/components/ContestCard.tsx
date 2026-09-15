import { Link } from 'react-router-dom'
import type { Contest } from '../types/contest'
import { daysLeft, platformLabel, regionLabel, formatCad } from '../lib/filters'
import { FrictionBadgeRow } from './FrictionBadge'
import { AutoClassChip } from './AutoClassChip'
import { HealthPill } from './HealthPill'
import { EvBand } from './EvBand'

export function ContestCard({ contest }: { contest: Contest }) {
  const left = contest.days_left ?? daysLeft(contest.close_at_et)
  const exclusive = contest.exclusive || contest.source === 'scale_health'
  const epm =
    contest.ev_mid != null && contest.minutes_to_enter
      ? contest.ev_mid / contest.minutes_to_enter
      : null

  return (
    <article
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 ${
        exclusive ? 'exclusive-accent card-surface' : 'card-surface'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2.5">
        <h2 className="text-[15px] font-semibold text-navy-950 leading-snug pr-2">
          <Link to={`/contests/${contest.slug}`} className="hover:text-teal-600 transition">
            {contest.name}
          </Link>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {exclusive ? (
            <span className="inline-flex rounded-full border border-soft-gold/50 bg-soft-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-800">
              Exclusive · Scale Health
            </span>
          ) : null}
          <AutoClassChip value={contest.auto_class} />
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3 leading-relaxed">{contest.prize_text}</p>

      <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
        <span className="rounded-full bg-navy-950/5 text-navy-800 px-2 py-0.5 font-medium">
          {regionLabel(contest.region)}
        </span>
        <span className="rounded-full bg-teal-50 text-teal-800 px-2 py-0.5">
          {platformLabel(contest.platform_family)}
        </span>
        {contest.free_entry ? (
          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Free</span>
        ) : null}
        {contest.soft_field ? (
          <span className="rounded-full bg-ice-50 text-navy-800 border border-navy-950/10 px-2 py-0.5">
            Soft-field
          </span>
        ) : null}
        {contest.new_live ? (
          <span className="rounded-full bg-teal-600/10 text-teal-600 px-2 py-0.5 font-medium">New live</span>
        ) : null}
      </div>

      <div className="mb-3">
        <FrictionBadgeRow badges={contest.friction_badges} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <HealthPill contest={contest} />
        <EvBand contest={contest} compact />
        {epm != null && epm > 0 ? (
          <span className="text-[11px] text-slate-500 tabular">
            ~{formatCad(epm)}/min
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-navy-950/5 text-xs text-slate-600">
        <span className="tabular">
          {left == null
            ? 'Close date TBD'
            : left > 0
              ? `${left}d left`
              : left === 0
                ? 'Closes today'
                : 'Closed / past'}
          {contest.minutes_to_enter != null ? ` · ~${contest.minutes_to_enter} min` : ''}
        </span>
        <Link
          to={`/contests/${contest.slug}`}
          className="btn-primary inline-flex items-center px-3.5 py-1.5 text-sm"
        >
          View
        </Link>
      </div>
    </article>
  )
}
