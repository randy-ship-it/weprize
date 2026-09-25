import exclusives from '../data/exclusives.json'
import { ExclusiveCard } from '../components/ExclusiveCard'
import { BirchAdSlot } from '../components/BirchAdSlot'
import { ContestCard } from '../components/ContestCard'
import { useContests } from '../hooks/useContests'
import type { Exclusive } from '../types/contest'

export function Exclusives() {
  const { exclusives: board } = useContests()
  const list = exclusives as Exclusive[]
  const flagship = list.find((e) => e.lane === 'humanoid')
  const rest = list.filter((e) => e.id !== flagship?.id)

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="section-kicker mb-2">Exclusive · Scale Health</p>
        <h1 className="text-3xl font-bold text-navy-950 tracking-tight mb-3">
          WePrize exclusives · powered with Scale Health
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          First-party giveaways on our rails. We write the household rules. Soft sponsor:{' '}
          <a href="https://scalehealth.ca" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
            ScaleHealth.ca
          </a>
          . Notify / interest list only. Not medical advice. No disease-cure claims.
        </p>
      </header>

      {flagship ? <ExclusiveCard exclusive={flagship} featured /> : null}

      <section>
        <h2 className="text-lg font-semibold text-navy-950 mb-3">Future exclusives lane</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rest.map((e) => (
            <ExclusiveCard key={e.id} exclusive={e} />
          ))}
        </div>
      </section>

      <section className="card-surface rounded-2xl p-5 text-sm text-slate-600 space-y-2">
        <h2 className="font-semibold text-navy-950">Fairness on our rails</h2>
        <p>
          Because these are first-party, WePrize can publish clear household rules, free-entry paths when live, and apply receipts. Contest Bot keeps health and inventory honest. Live entry waits for Randy + Emma greenlight.
        </p>
      </section>

      {board.length ? (
        <section>
          <h2 className="text-lg font-semibold text-navy-950 mb-3">On the contest board</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {board.map((c) => (
              <ContestCard key={c.id} contest={c} />
            ))}
          </div>
        </section>
      ) : null}

      <BirchAdSlot slotId="exclusives_footer" />
    </div>
  )
}
