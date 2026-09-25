import { useContests } from '../hooks/useContests'
import tally from '../data/tally.json'
import { PricingCards } from '../components/PricingCards'
import { RangesCallout } from '../components/RangesCallout'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { DisclaimerStrip } from '../components/DisclaimerStrip'

export function Pricing() {
  const { autoOkCount } = useContests()

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker mb-1">Assist</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">Pricing</h1>
        <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
          You would never fill all these contests yourself. Not worth your time. What if it was worth your time, because you can apply to hundreds in the time it takes to apply to one?
        </p>
        <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
          Contests stay free. Unlock Once / Triple / year-round assist (CAD) when you want research and time back.
          One personal profile for you. Friends = apply-on-behalf with their consent and identity. You tap codes when asked. Estimates only. Never better odds for paying.
        </p>
      </div>
      <PricingCards autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />
      <RangesCallout autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />
      <div className="rounded-2xl border border-navy-950/10 bg-ice-50/80 p-4 space-y-2 text-sm text-slate-600 leading-relaxed">
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
      <p className="text-sm text-slate-600 leading-relaxed">
        Never &quot;3 emails = 3 odds,&quot; guaranteed returns, or &quot;we auto-enter everything.&quot;
      </p>
      <DisclaimerStrip />
      <BirchAdSlot slotId="pricing_footer" />
    </div>
  )
}
