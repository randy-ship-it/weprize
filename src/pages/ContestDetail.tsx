import { Link, useParams } from 'react-router-dom'
import { useContests } from '../hooks/useContests'
import { FrictionBadgeRow } from '../components/FrictionBadge'
import { AutoClassChip } from '../components/AutoClassChip'
import { HealthPill } from '../components/HealthPill'
import { EvBand } from '../components/EvBand'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { ContestCard } from '../components/ContestCard'
import { daysLeft, platformLabel, regionLabel } from '../lib/filters'

export function ContestDetail() {
  const { slug } = useParams()
  const { getBySlug, contests } = useContests()
  const contest = slug ? getBySlug(slug) : undefined

  if (!contest) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-950/20 bg-white p-10 text-center">
        <p className="text-navy-950 font-semibold mb-2">Contest not found</p>
        <p className="text-sm text-slate-600 mb-4">That contest is not on the board. Try Exclusives or Contests.</p>
        <Link to="/contests" className="text-teal-600 hover:underline text-sm">
          Back to feed
        </Link>
      </div>
    )
  }

  const left = contest.days_left ?? daysLeft(contest.close_at_et)
  const exclusive = contest.exclusive || contest.source === 'scale_health'
  const related = contests
    .filter(
      (c) =>
        c.id !== contest.id &&
        c.health !== 'dead' &&
        (c.soft_field === contest.soft_field ||
          c.platform_family === contest.platform_family ||
          (!!c.exclusive && !!contest.exclusive)),
    )
    .slice(0, 3)

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/contests" className="text-sm text-teal-600 hover:underline">
        ← Contests
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {exclusive ? (
            <span className="inline-flex rounded-full border border-soft-gold/50 bg-soft-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-800">
              Exclusive · Scale Health
            </span>
          ) : null}
          <AutoClassChip value={contest.auto_class} />
          <HealthPill contest={contest} />
          <span className="text-xs rounded-full bg-navy-950/5 px-2 py-0.5">{regionLabel(contest.region)}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">{contest.name}</h1>
        <p className="text-slate-600 leading-relaxed">{contest.prize_text}</p>
      </header>

      {exclusive && contest.source === 'scale_health' ? (
        <section className="card-surface rounded-2xl p-5 space-y-3 border border-soft-gold/30">
          <h2 className="text-sm font-semibold text-navy-950">Industry insider hubs</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Scale connects wellness supply brands to industry insider hubs. Example store on the network:{' '}
            <span className="font-medium text-navy-950">DR-HO</span>. If you win, your store credit works on any participating insider hub — pick the brand store you actually want.
          </p>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>Browse cool Scale supply brands on hub storefronts</li>
            <li>Example hub: DR-HO&apos;s store</li>
            <li>Prize = store credit across participating hubs (not locked to one SKU)</li>
            <li>Free entry · official rules when entry fully opens · estimates only</li>
          </ul>
          <a
            href="https://scalehealth.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm text-teal-600 hover:underline"
          >
            Scale Health →
          </a>
        </section>
      ) : null}

      <section className="card-surface rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-navy-950">Prize</h2>
        {contest.prize_tiers?.length ? (
          <ul className="text-sm text-slate-600 space-y-1">
            {contest.prize_tiers.map((t, i) => (
              <li key={i} className="tabular">
                {t.n}× ${t.arv_cad.toLocaleString('en-CA')} CAD ({t.type})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            {contest.pool_source === 'top_only_unknown_tiers'
              ? 'Top prize known; tier list incomplete (top_only_unknown_tiers).'
              : contest.prize_text}
          </p>
        )}
        {contest.prize_pool_cad != null ? (
          <p className="text-xs text-slate-600 tabular">
            Face pool ~${contest.prize_pool_cad.toLocaleString('en-CA')} CAD
          </p>
        ) : null}
      </section>

      <BirchAdSlot slotId="detail_mid" />

      <section className="card-surface rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-navy-950">Friction before you enter</h2>
        <FrictionBadgeRow badges={contest.friction_badges} />
        <EvBand contest={contest} />
      </section>

      <section className="card-surface rounded-2xl p-5 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-medium text-navy-950">Eligibility:</span>{' '}
          {contest.eligibility_summary ?? 'See official rules.'}
        </p>
        <p>
          <span className="font-medium text-navy-950">Provinces:</span>{' '}
          {contest.provinces?.join(', ') ?? 'See rules'} · QC ok:{' '}
          {contest.qc_ok == null ? 'unknown' : contest.qc_ok ? 'yes' : 'no'}
        </p>
        <p>
          <span className="font-medium text-navy-950">Household rule:</span>{' '}
          {contest.household_rule ?? 'unknown'}
        </p>
        <p>
          <span className="font-medium text-navy-950">Platform:</span> {platformLabel(contest.platform_family)}
        </p>
        <p>
          <span className="font-medium text-navy-950">Closes:</span>{' '}
          {contest.close_at_et
            ? new Date(contest.close_at_et).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) + ' ET'
            : 'TBD'}
          {left != null ? ` (${left}d)` : ''}
        </p>
        {contest.minutes_to_enter != null ? (
          <p>
            <span className="font-medium text-navy-950">Minutes to enter (est.):</span> {contest.minutes_to_enter}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <a
          href={contest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary px-5 py-2.5 text-sm"
        >
          {exclusive ? 'Visit Scale Health' : 'Enter on brand site'}
        </a>
        {contest.rules_url ? (
          <a
            href={contest.rules_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost px-5 py-2.5 text-sm text-navy-950"
          >
            Official rules
          </a>
        ) : null}
        {contest.auto_class === 'AUTO_OK' ? (
          <Link to="/waitlist" className="rounded-xl border border-teal-600/40 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-700">
            Assist waitlist (AUTO_OK)
          </Link>
        ) : null}
        {exclusive ? (
          <Link to="/exclusives" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
            All exclusives
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-navy-950/15 bg-white/70 p-4 text-xs text-slate-600">
        Receipt vault (coming) · assist statuses: queued → applied → confirm_sent → customer_otp → confirmed | failed · Contest Bot engine
      </div>

      {related.length ? (
        <section>
          <h2 className="text-lg font-semibold text-navy-950 mb-3">Related</h2>
          <div className="grid gap-4">
            {related.map((c) => (
              <ContestCard key={c.id} contest={c} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
