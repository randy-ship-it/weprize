import { useMemo } from 'react'
import { useContests } from '../hooks/useContests'
import { PricingCards } from '../components/PricingCards'
import { PrizeTease } from '../components/PrizeTease'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { selectPrizeExamples } from '../lib/prizeTease'

export function Pricing() {
  const { autoOkCount, contests } = useContests()
  const examples = useMemo(() => selectPrizeExamples(contests), [contests])

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="section-kicker mb-1">Assist · CAD</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-navy-950 tracking-tight leading-[1.12]">
          Unlock the time. Leave the contests free.
        </h1>
        <p className="text-slate-700 text-base sm:text-lg mt-3 leading-relaxed">
          You would never fill all these contests yourself. Once, Triple, or year-round buys research and time so
          applying to hundreds takes about as long as applying to one.
        </p>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          The fee is research and time for free contest entries. One personal profile. Friends only with their consent
          and identity. You tap codes when a contest asks.
        </p>
      </header>

      <PrizeTease examples={examples} />

      <PricingCards autoOkLive={autoOkCount} />

      <div className="rounded-2xl border border-navy-950/10 bg-white p-4 space-y-2 text-sm text-slate-600 leading-relaxed">
        <p className="font-semibold text-navy-950 text-xs uppercase tracking-wide">Personal use</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-navy-950">1 profile for you.</strong> One primary legal identity on WePrize.
          </li>
          <li>
            <strong className="text-navy-950">Friends OK</strong> only with their consent and their real identity.
          </li>
          <li>
            <strong className="text-navy-950">Max 10 purchases per person.</strong> WePrize is personal contest assist,
            not a wholesale entry service.
          </li>
        </ul>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Competition Act: estimates are not guarantees. We cannot influence who wins. Never better odds for paying, never
        a promised return.
      </p>
      <DisclaimerStrip />
      <BirchAdSlot slotId="pricing_footer" />
    </div>
  )
}
