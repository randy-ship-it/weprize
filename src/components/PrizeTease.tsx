import { Link } from 'react-router-dom'
import type { PrizeExample } from '../lib/prizeTease'

function money(n: number): string {
  return `$${n.toLocaleString('en-CA')}`
}

export function PrizeTease({ examples }: { examples: PrizeExample[] }) {
  if (!examples.length) return null

  return (
    <section aria-labelledby="prize-tease-title" className="space-y-3">
      <div className="max-w-3xl">
        <p className="section-kicker mb-1">Examples in the book</p>
        <h2 id="prize-tease-title" className="text-lg sm:text-xl font-semibold text-navy-950 tracking-tight">
          Grand prizes on the board right now
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
          Dollar amounts are estimated ARV from public listings — examples of prizes in the book, not prizes you are
          guaranteed, and not odds. Paying does not change who wins.
        </p>
      </div>
      <div className="prize-tease-row">
        {examples.map((ex) => {
          const wellness = ex.kind === 'wellness'
          const prefix = ex.upTo ? 'Up to ' : ex.approx ? 'About ' : ''
          return (
            <Link
              key={ex.id}
              to={`/contests/${ex.slug}`}
              className={`prize-tease-card ${wellness ? 'prize-tease-card-wellness' : ''}`}
            >
              <span className={`prize-tease-kind ${wellness ? 'prize-tease-kind-wellness' : ''}`}>{ex.kindLabel}</span>
              <p className="text-sm font-semibold text-navy-950 leading-snug line-clamp-2 mt-2">{ex.name}</p>
              <p className="tabular text-xl font-bold text-navy-950 mt-2 leading-none">
                {prefix}
                {money(ex.arvCad)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mt-1">Est. ARV · CAD</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2 flex-1">{ex.prizeText}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
