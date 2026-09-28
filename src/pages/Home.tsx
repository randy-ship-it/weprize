import { Link } from 'react-router-dom'
import tally from '../data/tally.json'
import { useContests } from '../hooks/useContests'
import { LiveTally } from '../components/LiveTally'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { PricingCards } from '../components/PricingCards'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { ShareButton } from '../components/ShareButton'
import { BrandReel } from '../components/BrandReel'
import { PrizeSpinner } from '../components/PrizeSpinner'
import type { Tally } from '../types/contest'

/** Public home — energy + counts + spinner. No contest URLs / scrapeable book. */
export function Home() {
  const { autoOkCount } = useContests()
  const liveEnergy = Math.max(autoOkCount, (tally as Tally).unique_contests || 0)

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <div>
          <p className="section-kicker mb-3">WePrize · Health & wellness</p>
          <h1 className="text-3xl sm:text-[2.6rem] font-bold text-navy-950 leading-[1.12] tracking-tight mb-3">
            Win recovery, sleep, nutrition, and fitness gear.
          </h1>
          <p className="text-lg text-slate-700 mb-2 max-w-xl leading-relaxed">
            Free Canada-first contests. We mass-apply for you. You keep the wins.
          </p>
          <p className="text-sm text-slate-500 mb-6 max-w-xl leading-relaxed">
            <span className="tabular font-semibold text-navy-950">{liveEnergy}+</span> ready in the pool this week.
            We don&apos;t publish the full book — spin the vibe, then start free or grab an assist pack.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/waitlist" className="btn-primary px-5 py-2.5 text-sm">
              Start free
            </Link>
            <Link to="/pricing" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
              Assist packs
            </Link>
            <Link to="/qr" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
              DIY QR stickers
            </Link>
            <Link to="/jackpot" className="btn-ghost px-5 py-2.5 text-sm text-teal-800">
              Survey → +10 applies
            </Link>
            <ShareButton hint label="Share with a friend" />
          </div>
        </div>
        <PrizeSpinner liveCount={liveEnergy} />
      </section>

      <LiveTally tally={tally as Tally} autoOkLive={autoOkCount} />
      <BrandReel />
      <BirchAdSlot slotId="home_hero_strip" />

      <section>
        <h2 className="text-xl font-semibold text-navy-950 mb-4">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { step: '1', title: 'Start free', body: 'Tell us who you are. We handle the forms.' },
            { step: '2', title: 'We apply', body: 'Queue runs as contests open — you confirm only when needed.' },
            { step: '3', title: 'Spin for bonus', body: 'Solid survey unlocks a jackpot crank for +10 free applies.' },
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
        <div className="flex items-end justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-navy-950">Assist packs</h2>
          <Link to="/pricing" className="text-sm text-teal-600 hover:underline">
            Full pricing →
          </Link>
        </div>
        <PricingCards autoOkLive={autoOkCount} teaser />
      </section>

      <section className="card-surface rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">Partners & featured contests</p>
          <p className="text-sm text-slate-600">Host with us or submit a partnership brief — no public inventory dump.</p>
        </div>
        <Link to="/partners" className="btn-ghost text-sm px-4 py-2">
          Partner with WePrize
        </Link>
      </section>

      <DisclaimerStrip />
    </div>
  )
}
