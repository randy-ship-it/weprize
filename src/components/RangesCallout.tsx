export function RangesCallout({ autoOkLive }: { autoOkLive: number }) {
  return (
    <div className="rounded-2xl border border-navy-950/10 bg-white p-4 text-sm text-slate-600">
      <p className="font-semibold text-navy-950 mb-1">Moving ranges (honesty)</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Open inventory ~150-400 CA contests · ~5-10 new/day</li>
        <li>
          AUTO_OK queued this week: <span className="tabular font-semibold text-navy-950">{autoOkLive} (live)</span>
        </li>
        <li>Never &quot;We enter 400.&quot;</li>
      </ul>
    </div>
  )
}
