import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
import { getInboundRef } from '../lib/shareRef'
import type { PackId } from '../types/assist'

type Props = { autoOkLive: number; teaser?: boolean; estEvMidCad?: number }

type Plan = {
  name: string
  price: string
  print: string
  cta: string
  to?: string
  pack?: PackId
  featured?: boolean
}

/** Rough pack EV band from operator mid EV / contests applied — estimates only. */
function packEvLine(pack: PackId | undefined, autoOkLive: number, estEvMidCad: number): string {
  if (!pack || estEvMidCad <= 0 || autoOkLive <= 0) return ''
  // Scale example book (~$198 mid over ~77 contests) onto this week's AUTO_OK count / pack size.
  const perContest = estEvMidCad / 77
  const rounds = pack === 'once' ? 1 : pack === 'triple' ? 3 : 4
  const n = Math.max(1, autoOkLive) * (pack === 'year_round' ? 1.25 : 1)
  const mid = Math.round(perContest * n * (pack === 'triple' ? 0.9 : 1) * Math.min(rounds, 2))
  const low = Math.max(1, Math.round(mid * 0.5))
  const high = Math.round(mid * 1.6)
  return `Suggested expected value ~$${low}–$${high} CAD if we apply to ~${Math.round(n)} contests this cycle — estimate only, not a guarantee.`
}

const plans = (n: number): Plan[] => [
  {
    name: 'Free',
    price: '$0',
    print: 'Browse and track. We apply to 10 contests for you. Refer a friend.',
    cta: 'Browse contests',
    to: '/contests',
    featured: true,
  },
  {
    name: 'Once',
    price: '$9',
    print: `One round of applies for one person. About ${n} contests ready this week.`,
    cta: 'Unlock Once pack',
    pack: 'once',
  },
  {
    name: 'Triple',
    price: '$15',
    print: 'Three people you know, or three apply rounds. Real identities only.',
    cta: 'Get Triple pack',
    pack: 'triple',
  },
  {
    name: 'Year-round',
    price: '$19.99/mo',
    print: 'We keep applying for one person as new contests open.',
    cta: 'Unlock year-round assist',
    pack: 'year_round',
  },
]

export function PricingCards({ autoOkLive, teaser = false, estEvMidCad = 198 }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  return (
    <div className={`grid gap-4 ${teaser ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
      {list.map((p) => {
        const href = p.pack ? paymentLinkWithRef(p.pack, inbound) : undefined
        const evLine = packEvLine(p.pack, autoOkLive, estEvMidCad)
        return (
          <div
            key={p.name}
            className={`rounded-2xl p-5 flex flex-col transition hover:-translate-y-0.5 ${
              p.featured
                ? 'card-surface border-teal-600 ring-1 ring-teal-600/25'
                : 'card-surface'
            }`}
          >
            <p className="section-kicker">{p.name}</p>
            <p className="tabular text-2xl font-bold text-navy-950 mt-1.5">{p.price}</p>
            <p className="text-sm text-slate-600 mt-2.5 flex-1 leading-relaxed">{p.print}</p>
            {evLine ? (
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{evLine}</p>
            ) : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex justify-center px-4 py-2.5 text-sm ${
                  p.featured ? 'btn-primary' : 'btn-ghost text-navy-950'
                }`}
              >
                {p.cta}
              </a>
            ) : (
              <Link
                to={p.to!}
                className={`mt-4 inline-flex justify-center px-4 py-2.5 text-sm ${
                  p.featured ? 'btn-primary' : 'btn-ghost text-navy-950'
                }`}
              >
                {p.cta}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
