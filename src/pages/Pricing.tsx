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
          Browse free. Unlock Once / Triple / year-round assist (CAD) when you want us to apply for you. You bring your own identity. We apply; you tap codes when asked.
        </p>
      </div>
      <PricingCards autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />
      <RangesCallout autoOkLive={autoOkCount} estEvMidCad={tally.est_ev_mid_cad} />
      <p className="text-sm text-slate-600 leading-relaxed">
        Fee is for research and time to complete eligible free entries. Contests are free. We cannot influence the outcome. Never &quot;3 emails = 3 odds,&quot; guaranteed $50, or &quot;we auto-enter everything.&quot;
      </p>
      <DisclaimerStrip />
      <BirchAdSlot slotId="pricing_footer" />
    </div>
  )
}
