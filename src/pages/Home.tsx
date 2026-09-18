import { Link } from 'react-router-dom'
import tally from '../data/tally.json'
import exclusives from '../data/exclusives.json'
import { useContests } from '../hooks/useContests'
import { LiveTally } from '../components/LiveTally'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { PricingCards } from '../components/PricingCards'
import { ContestCard } from '../components/ContestCard'
import { ExclusiveCard } from '../components/ExclusiveCard'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { BrandReel } from '../components/BrandReel'
import { sortContests } from '../lib/filters'
import type { Exclusive, Tally } from '../types/contest'

export function Home() {
  const { contests, autoOkCount, exclusives: scaleContests } = useContests()
  const preview = sortContests(contests.filter((c) => c.health !== 'dead' && !c.exclusive)).slice(0, 6)
  const flagship = (exclusives as Exclusive[]).find((e) => e.lane === 'humanoid') ?? (exclusives as Exclusive[])[0]

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div>
          <p className="section-kicker mb-3">WePrize · Canada-first</p>
          <h1 className="text-3xl sm:text-[2.6rem] font-bold text-navy-950 leading-[1.12] tracking-tight mb-3">
            Don&apos;t gamble with your time.
          </h1>
          <p className="text-lg text-slate-700 mb-2 max-w-xl leading-relaxed">
            We apply to free contests for you.
          </p>
          <p className="text-sm text-slate-500 mb-6 max-w-xl leading-relaxed">
            You tap the codes when a contest asks. Estimates update from entries we submitted. Not a guarantee.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contests" className="btn-primary px-5 py-2.5 text-sm">
              Browse contests
            </Link>
            <Link to="/waitlist" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
              Start free
            </Link>
            <Link to="/submit" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
              Suggest a contest
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Ready to apply this week:{' '}
            <span className="tabular font-semibold text-navy-950">{autoOkCount}</span>
          </p>
        </div>
        <LiveTally tally={tally as Tally} autoOkLive={autoOkCount} />
      </section>

      <BrandReel />

      <p className="text-sm text-slate-600">
        Illustrative prize types only — not live contests.{' '}
        <Link to="/prizes" className="text-teal-600 hover:underline">
          What you could win →
        </Link>
      </p>

      <BirchAdSlot slotId="home_hero_strip" />

      <section>
        <h2 className="text-xl font-semibold text-navy-950 mb-4">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { step: '1', title: 'Browse', body: 'See contests before you click.' },
            { step: '2', title: 'We apply', body: 'We fill the forms for you.' },
            { step: '3', title: 'You confirm', body: 'Tap a code if a contest asks.' },
          ].map((s) => (
            <div key={s.step} className="card-surface rounded-2xl p-5">
              <p className="text-teal-600 font-bold text-sm mb-1">Step {s.step}</p>
              <h3 className="font-semibold text-navy-950 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <p className="section-kicker mb-1">Only here</p>
            <h2 className="text-xl font-semibold text-navy-950">Prizes on WePrize</h2>
          </div>
          <Link to="/exclusives" className="text-sm text-teal-600 hover:underline">
            See all
          </Link>
        </div>
        {flagship ? <ExclusiveCard exclusive={flagship} featured /> : null}
        {scaleContests.length > 0 ? (
          <p className="mt-3 text-xs text-slate-500">{scaleContests.length} Scale Health prizes on the board</p>
        ) : null}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold text-navy-950">Pricing</h2>
          <Link to="/pricing" className="text-sm text-teal-600 hover:underline">
            Details
          </Link>
        </div>
        <PricingCards autoOkLive={autoOkCount} teaser />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold text-navy-950">Live contests</h2>
          <Link to="/contests" className="text-sm text-teal-600 hover:underline">
            All contests
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {preview.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      </section>

      <section className="card-surface rounded-2xl p-4">
        <DisclaimerStrip />
      </section>
    </div>
  )
}
