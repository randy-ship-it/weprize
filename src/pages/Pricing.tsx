import { useContests } from '../hooks/useContests'
import tally from '../data/tally.json'
import { PricingCards } from '../components/PricingCards'
import { GrandPrizeTease } from '../components/GrandPrizeTease'
import { RangesCallout } from '../components/RangesCallout'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { DisclaimerStrip } from '../components/DisclaimerStrip'

export function Pricing() {
  const { contests, autoOkCount } = useContests()

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <p className="section-kicker mb-1">Assist</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight leading-tight">
          Unlock applies. Chase the big prizes.
        </h1>
        <p className="text-slate-700 text-base mt-2 leading-snug max-w-2xl">
          Contests stay free. You would never fill hundreds yourself — Unlock Once, Get Triple, or Unlock year-round
          so we mass-apply eligible entries while you tap codes when asked.
        </p>
        <p className="text-slate-500 text-sm mt-1.5 leading-snug max-w-2xl">
          Fee = research and time assist. Estimates only. Never better odds for paying. One personal profile · friends
          with consent · max 10 purchases per buyer.
        </p>
      </div>

      <GrandPrizeTease contests={contests} />

      <PricingCards autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />

      <RangesCallout autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />

      <div className="rounded-2xl border border-navy-950/10 bg-ice-50/80 p-4 space-y-2 text-sm text-slate-600 leading-snug">
        <p className="font-semibold text-navy-950 text-xs uppercase tracking-wide">Personal use · not a bulk business tool</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <strong className="text-navy-950">1 profile for you</strong>. One primary legal identity on WePrize.
          </li>
          <li>
            <strong className="text-navy-950">Friends OK</strong>. Apply on their behalf only with their consent and their real identity (never fake emails).
          </li>
          <li>
            <strong className="text-navy-950">Max 10 purchases per buyer</strong>. Soft cap against ROI / farm accounts. WePrize is personal contest assist, not a wholesale entry service.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Fee = research and time on eligible free entries. Contests stay free. Estimates are not a guarantee. We cannot influence who wins.
        </p>
      </div>
      <p className="text-sm text-slate-600 leading-snug">
        Never &quot;3 emails = 3 odds,&quot; guaranteed returns, or &quot;we auto-enter everything.&quot;
      </p>
      <DisclaimerStrip />
      <BirchAdSlot slotId="pricing_footer" />
    </div>
  )
}
