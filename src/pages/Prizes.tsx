import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useContests } from '../hooks/useContests'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { HealthPill } from '../components/HealthPill'
import { sortContests } from '../lib/filters'
import type { Contest } from '../types/contest'

function PrizeGalleryCard({ contest }: { contest: Contest }) {
  return (
    <article className="card-surface rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <HealthPill contest={contest} />
        {contest.exclusive || contest.source === 'scale_health' ? (
          <span className="inline-flex rounded-full border border-soft-gold/50 bg-soft-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-800">
            Exclusive
          </span>
        ) : null}
      </div>
      <h2 className="text-base font-semibold text-navy-950 leading-snug">
        <Link to={`/contests/${contest.slug}`} className="hover:text-teal-600 transition">
          {contest.name}
        </Link>
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed flex-1">{contest.prize_text}</p>
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-navy-950/5">
        <Link
          to={`/contests/${contest.slug}`}
          className="btn-primary inline-flex items-center px-3.5 py-1.5 text-sm"
        >
          View contest
        </Link>
        <a
          href={contest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost inline-flex items-center px-3.5 py-1.5 text-sm text-navy-950"
        >
          Official listing
        </a>
      </div>
    </article>
  )
}

export function Prizes() {
  const { contests } = useContests()

  const gallery = useMemo(() => {
    const live = contests.filter((c) => c.health === 'live')
    const healthy = live.length
      ? live
      : contests.filter((c) => c.health !== 'dead')
    return sortContests(healthy, 'ev_per_min')
  }, [contests])

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="section-kicker mb-2">Live prizes</p>
        <h1 className="text-3xl font-bold text-navy-950 tracking-tight mb-3">
          What you could win
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Real contests from the WePrize board — prize text straight from the listing. Tap a card for
          details, or open the official brand page to enter.
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Competition Act note: prize amounts and descriptions are estimates from public listings —
          not odds, not guarantees, and not WePrize inventing winners.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link to="/contests" className="btn-primary px-5 py-2.5 text-sm">
          Browse full contest board
        </Link>
        <Link to="/exclusives" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
          WePrize exclusives
        </Link>
      </div>

      {gallery.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((c) => (
            <PrizeGalleryCard key={c.id} contest={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-navy-950/20 bg-white p-10 text-center">
          <p className="text-navy-950 font-semibold mb-2">No live prizes right now</p>
          <Link to="/contests" className="text-teal-600 hover:underline text-sm">
            Check the contest board
          </Link>
        </div>
      )}

      <section className="card-surface rounded-2xl p-4">
        <DisclaimerStrip />
      </section>

      <BirchAdSlot slotId="exclusives_footer" />
    </div>
  )
}
