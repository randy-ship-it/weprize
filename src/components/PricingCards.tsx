import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
import { getInboundRef } from '../lib/shareRef'
import type { PackId } from '../types/assist'

type Props = { autoOkLive: number; teaser?: boolean }

type Plan = {
  name: string
  price: string
  cadence?: string
  print: string
  cta: string
  to?: string
  pack?: PackId
  featured?: boolean
}

const plans = (n: number): Plan[] => [
  {
    name: 'Once',
    price: '$9',
    cadence: 'CAD',
    print: `One round of research and applies for you. About ${n} contests ready this week. Hundreds of free entries in the time it takes to do one.`,
    cta: 'Unlock Once — $9 CAD',
    pack: 'once',
    featured: true,
  },
  {
    name: 'Triple',
    price: '$15',
    cadence: 'CAD',
    print: 'Three apply rounds, or three people you know — only with their consent and their real identity.',
    cta: 'Get Triple — $15 CAD',
    pack: 'triple',
  },
  {
    name: 'Year-round',
    price: '$19.99',
    cadence: '/mo',
    print: 'We keep researching and applying for one person as new free contests open.',
    cta: 'Go year-round — $19.99/mo',
    pack: 'year_round',
  },
  {
    name: 'Free',
    price: '$0',
    print: 'Browse and track the board. No assist pack.',
    cta: 'Browse contests',
    to: '/contests',
  },
]

/**
 * Paid buttons href Stripe Payment Links. POST /api/checkout stays on the server
 * for when STRIPE_SECRET_KEY is a live secret; it is not the only way to pay.
 */
export function PricingCards({ autoOkLive, teaser = false }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  const featured = list.find((p) => p.featured)
  const paidRest = list.filter((p) => p.pack && !p.featured)
  const free = list.find((p) => !p.pack)
  const ordered = teaser ? list : [featured, ...paidRest, free].filter((p): p is Plan => Boolean(p))

  return (
    <div className="space-y-3">
      <div
        className={
          teaser
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-4'
            : 'grid gap-4 md:grid-cols-2'
        }
      >
        {ordered.map((p) => (
          <PlanCard
            key={p.name}
            plan={p}
            teaser={teaser}
            href={p.pack ? paymentLinkWithRef(p.pack, inbound) : undefined}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Max 10 purchases per person. The fee is research and time for free contest entries — not a win, and not better
        odds.
      </p>
    </div>
  )
}

function PlanCard({
  plan,
  teaser,
  href,
}: {
  plan: Plan
  teaser: boolean
  href?: string
}) {
  const paid = Boolean(plan.pack)
  const span =
    !teaser && plan.featured ? 'md:col-span-2' : !teaser && !paid ? 'md:col-span-2' : ''

  return (
    <div
      className={`rounded-2xl flex flex-col ${span} ${
        plan.featured
          ? 'border-2 border-teal-500 bg-navy-950 text-white p-5 sm:p-6 shadow-[0_16px_40px_rgba(11,31,51,0.28)]'
          : paid
            ? 'card-surface p-5'
            : 'border border-dashed border-navy-950/15 bg-white/70 p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={plan.featured ? 'text-[0.7rem] font-bold uppercase tracking-[0.08em] text-teal-500' : 'section-kicker'}>
          {plan.name}
        </p>
        {plan.featured ? (
          <span className="rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Recommended
          </span>
        ) : null}
      </div>
      <p className={`tabular font-bold mt-1.5 ${plan.featured ? 'text-4xl text-white' : 'text-2xl text-navy-950'}`}>
        {plan.price}
        {plan.cadence ? (
          <span className={`ml-1 font-semibold ${plan.featured ? 'text-base text-teal-500' : 'text-sm text-slate-500'}`}>
            {plan.cadence}
          </span>
        ) : null}
      </p>
      <p
        className={`text-sm mt-2.5 flex-1 leading-relaxed ${
          plan.featured ? 'text-slate-200' : 'text-slate-600'
        }`}
      >
        {plan.print}
      </p>
      {paid && href ? (
        <a
          href={href}
          className={`btn-primary mt-4 inline-flex w-full items-center justify-center px-4 text-center leading-tight ${
            plan.featured ? 'min-h-14 py-4 text-base sm:text-lg' : 'min-h-12 py-3.5 text-base'
          }`}
        >
          {plan.cta}
        </a>
      ) : (
        <Link
          to={plan.to!}
          className="btn-ghost mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm text-navy-950"
        >
          {plan.cta}
        </Link>
      )}
    </div>
  )
}
