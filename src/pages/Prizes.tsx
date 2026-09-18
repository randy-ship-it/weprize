import { Link } from 'react-router-dom'
import { PrizeCollage } from '../components/PrizeCollage'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { BirchAdSlot } from '../components/BirchAdSlot'

export function Prizes() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="section-kicker mb-2">Illustrative only</p>
        <h1 className="text-3xl font-bold text-navy-950 tracking-tight mb-3">
          What you could win
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Still photos of prize <em>types</em> that show up on free contest listings — cars, cash,
          travel, tickets, gadgets, wellness, and more. These are illustrations, not live contests,
          not current odds, and not prize values.
        </p>
      </header>

      <section className="card-surface rounded-2xl p-4 sm:p-5 bg-white">
        <p className="text-sm text-slate-600 leading-relaxed">
          WePrize does not invent dollar amounts or winners from this gallery. For what is actually
          open this week, use the contest board. Estimates on contest cards are estimates only.
        </p>
      </section>

      <PrizeCollage />

      <div className="flex flex-wrap gap-3">
        <Link to="/contests" className="btn-primary px-5 py-2.5 text-sm">
          Browse live contests
        </Link>
        <Link to="/exclusives" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
          WePrize exclusives
        </Link>
      </div>

      <section className="card-surface rounded-2xl p-4">
        <DisclaimerStrip />
      </section>

      <BirchAdSlot slotId="exclusives_footer" />
    </div>
  )
}
