import { Link } from 'react-router-dom'
import type { Contest } from '../types/contest'

function formatCad(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? `$${Math.round(k)}k` : `$${k.toFixed(k % 1 === 0 ? 0 : 1)}k`
  }
  return `$${Math.round(n)}`
}

function shortPrize(c: Contest): string {
  const text = (c.prize_text || c.name || '').trim()
  if (text.length <= 72) return text
  return `${text.slice(0, 69)}…`
}

/** Top live / high-ARV prizes from inventory — tease only, no odds claims. */
export function GrandPrizeTease({ contests }: { contests: Contest[] }) {
  const pool = contests
    .filter((c) => c.health !== 'dead' && (c.prize_pool_cad ?? 0) > 0)
    .sort((a, b) => (b.prize_pool_cad ?? 0) - (a.prize_pool_cad ?? 0))
    .slice(0, 6)

  if (!pool.length) return null

  return (
    <section className="rounded-2xl border border-teal-600/25 bg-gradient-to-br from-teal-50/80 via-white to-ice-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <p className="section-kicker mb-0.5">On the board now</p>
          <h2 className="text-lg sm:text-xl font-bold text-navy-950 tracking-tight">
            Grand prizes we can apply you for
          </h2>
        </div>
        <Link to="/prizes" className="text-sm font-semibold text-teal-700 hover:underline">
          See all prizes →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pool.map((c) => (
          <li key={c.id}>
            <Link
              to={`/contests/${c.slug}`}
              className="flex items-start gap-3 rounded-xl border border-navy-950/8 bg-white/90 px-3 py-2.5 hover:border-teal-600/40 transition"
            >
              <span className="tabular shrink-0 rounded-lg bg-navy-950 text-white text-xs font-bold px-2 py-1">
                {formatCad(c.prize_pool_cad ?? 0)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy-950 leading-snug line-clamp-2">
                  {shortPrize(c)}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{c.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500 mt-3 leading-snug">
        Listed ARVs from public contest pages — estimates only. Contests stay free. Fee = research and time assist.
        Never a guarantee you will win.
      </p>
    </section>
  )
}
