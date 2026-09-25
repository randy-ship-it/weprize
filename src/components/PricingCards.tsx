import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
import { getInboundRef } from '../lib/shareRef'
import type { PackId } from '../types/assist'

type Props = { autoOkLive: number; teaser?: boolean }

type Plan = {
  name: string
  price: string
  print: string
  cta: string
  to?: string
  pack?: PackId
  featured?: boolean
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
    cta: 'Pay with Stripe',
    pack: 'once',
  },
  {
    name: 'Triple',
    price: '$15',
    print: 'Three people you know, or three apply rounds. Real identities only.',
    cta: 'Pay with Stripe',
    pack: 'triple',
  },
  {
    name: 'Year-round',
    price: '$19.99/mo',
    print: 'We keep applying for one person as new contests open.',
    cta: 'Subscribe with Stripe',
    pack: 'year_round',
  },
]

export function PricingCards({ autoOkLive, teaser = false }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  return (
    <div className={`grid gap-4 ${teaser ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
      {list.map((p) => {
        const href = p.pack ? paymentLinkWithRef(p.pack, inbound) : undefined
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
