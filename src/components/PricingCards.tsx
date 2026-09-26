import { useState, type FormEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
import { createCheckout } from '../lib/api'
import { getInboundRef } from '../lib/shareRef'
import { loadPrepayIdentity, savePrepayIdentity } from '../lib/prepayIdentity'
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

export function PricingCards({ autoOkLive, teaser = false }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  const [pendingPack, setPendingPack] = useState<PackId | null>(null)
  const [busyPack, setBusyPack] = useState<PackId | null>(null)
  const checkoutBusy = busyPack !== null
  const [preEmail, setPreEmail] = useState('')
  const [preName, setPreName] = useState('')

  async function startCheckout(pack: PackId) {
    setBusyPack(pack)
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 12000)
    try {
      const { url } = await createCheckout(pack, inbound, ctrl.signal)
      if (url) {
        window.location.assign(url)
        return
      }
      throw new Error('missing_url')
    } catch {
      // Payment Link href is also on the anchor if script never runs.
      window.location.assign(paymentLinkWithRef(pack, inbound))
    } finally {
      window.clearTimeout(timer)
      setBusyPack(null)
      setPendingPack(null)
    }
  }

  function onUnlockClick(e: MouseEvent<HTMLAnchorElement>, pack: PackId) {
    e.preventDefault()
    if (checkoutBusy) return
    if (loadPrepayIdentity()) {
      void startCheckout(pack)
      return
    }
    setPendingPack(pack)
    setPreEmail('')
    setPreName('')
  }

  function onSavePrepay(e: FormEvent) {
    e.preventDefault()
    if (!pendingPack) return
    const email = preEmail.trim()
    const name = preName.trim()
    if (email.includes('@') && name) {
      savePrepayIdentity(email, name)
    }
    void startCheckout(pendingPack)
  }

  function onSkipPrepay() {
    if (!pendingPack) return
    void startCheckout(pendingPack)
  }

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
            busy={p.pack != null && busyPack === p.pack}
            checkoutBusy={checkoutBusy}
            onUnlock={onUnlockClick}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Max 10 purchases per person. The fee is research and time for free contest entries — not a win, and not better
        odds.
      </p>

      {pendingPack ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prepay-title"
        >
          <div className="card-surface w-full max-w-md space-y-4 rounded-2xl p-5 shadow-xl sm:p-6">
            <p id="prepay-title" className="text-sm font-semibold text-navy-950">
              Optional: save name and email before checkout
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              You can skip. Full mailing address is collected after payment on your order page. One personal profile;
              friends need consent and their identity. Max 10 purchases per person.
            </p>
            <form onSubmit={onSavePrepay} className="space-y-3">
              <div>
                <label htmlFor="prepay-name" className="text-xs font-medium text-navy-950">
                  Legal name
                </label>
                <input
                  id="prepay-name"
                  type="text"
                  autoComplete="name"
                  value={preName}
                  onChange={(e) => setPreName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="As on ID / contest forms"
                />
              </div>
              <div>
                <label htmlFor="prepay-email" className="text-xs font-medium text-navy-950">
                  Email
                </label>
                <input
                  id="prepay-email"
                  type="email"
                  autoComplete="email"
                  value={preEmail}
                  onChange={(e) => setPreEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Same email you will use at checkout"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={checkoutBusy}
                  onClick={onSkipPrepay}
                  className="btn-ghost inline-flex justify-center px-4 py-2.5 text-sm text-navy-950 disabled:opacity-60"
                >
                  Skip. Continue to pay
                </button>
                <button
                  type="submit"
                  disabled={checkoutBusy}
                  className="btn-primary inline-flex justify-center px-4 py-2.5 text-sm disabled:opacity-60"
                >
                  {checkoutBusy ? 'Starting checkout…' : 'Save & continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PlanCard({
  plan,
  teaser,
  href,
  busy,
  checkoutBusy,
  onUnlock,
}: {
  plan: Plan
  teaser: boolean
  href?: string
  busy: boolean
  checkoutBusy: boolean
  onUnlock: (e: MouseEvent<HTMLAnchorElement>, pack: PackId) => void
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
      {paid && href && plan.pack ? (
        <a
          href={href}
          aria-disabled={checkoutBusy}
          onClick={(e) => onUnlock(e, plan.pack!)}
          className={`btn-primary mt-4 inline-flex w-full items-center justify-center px-4 text-center ${
            plan.featured ? 'min-h-14 py-4 text-base sm:text-lg' : 'min-h-12 py-3.5 text-base'
          } ${checkoutBusy ? 'pointer-events-none opacity-60' : ''}`}
        >
          {busy ? 'Starting checkout…' : plan.cta}
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
