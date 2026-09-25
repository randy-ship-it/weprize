import { Link } from 'react-router-dom'

export function RangesCallout({
  autoOkLive,
  estEvMidCad = 198,
}: {
  autoOkLive: number
  estEvMidCad?: number
}) {
  const per = estEvMidCad / 77
  const mid = Math.round(per * Math.max(1, autoOkLive))
  const low = Math.max(1, Math.round(mid * 0.5))
  const high = Math.round(mid * 1.6)

  return (
    <div className="rounded-2xl border border-navy-950/10 bg-white p-4 text-sm text-slate-600 space-y-2">
      <p className="font-semibold text-navy-950 mb-1">Moving ranges (honesty)</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Open inventory growing · CA-eligible preferred · ~5–10 new/day</li>
        <li>
          AUTO_OK queued this week:{' '}
          <span className="tabular font-semibold text-navy-950">{autoOkLive} (live)</span>
        </li>
        <li>
          Suggested expected value if we apply to those AUTO_OK contests:{' '}
          <span className="tabular font-semibold text-navy-950">~${low}–${high} CAD</span>
        </li>
        <li>Never &quot;We enter 400&quot; or &quot;you will win $X.&quot;</li>
      </ul>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Competition Act note: expected value is an <strong>estimate only</strong> — based on listed prize ARVs × rough
        odds / field assumptions from our example operator book. Not a guarantee of winnings, not odds we control, and
        not advice to spend more than you can afford for assist time.{' '}
        <Link to="/methodology" className="text-teal-600 hover:underline">
          How we estimate
        </Link>
        .
      </p>
    </div>
  )
}
