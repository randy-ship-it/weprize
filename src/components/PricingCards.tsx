import { useState, type FormEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
import { createCheckout } from '../lib/api'
import { getInboundRef } from '../lib/shareRef'
import { loadPrepayIdentity, savePrepayIdentity } from '../lib/prepayIdentity'
import type { PackId } from '../types/assist'

type Props = { autoOkLive: number; teaser?: boolean; estEvMidCad?: number }

type Plan = {
  name: string
  price: string
  print: string
  cta: string
  to?: string
  pack?: PackId
  /** Visual emphasis for money CTAs */
  money?: boolean
  /** Soft secondary (Free) */
  soft?: boolean
}

/** Rough pack EV band from operator mid EV / contests applied - estimates only. */
function packEvLine(pack: PackId | undefined, autoOkLive: number, estEvMidCad: number): string {
  if (!pack || estEvMidCad <= 0 || autoOkLive <= 0) return ''
  // Scale example book (~$198 mid over ~77 contests) onto this week's AUTO_OK count / pack size.
  const perContest = estEvMidCad / 77
  const rounds = pack === 'once' ? 1 : pack === 'triple' ? 3 : 4
  const n = Math.max(1, autoOkLive) * (pack === 'year_round' ? 1.25 : 1)
  const mid = Math.round(perContest * n * (pack === 'triple' ? 0.9 : 1) * Math.min(rounds, 2))
  const low = Math.max(1, Math.round(mid * 0.5))
  const high = Math.round(mid * 1.6)
  return `Example value ~$${low} to $${high} CAD if ~${Math.round(n)} contests were entered. Estimate only, not a guarantee, and not a submission receipt.`
}

const plans = (n: number): Plan[] => [
  {
    name: 'Free',
    price: '$0',
    print: 'Browse and track the board. Free does not file contest entries.',
    cta: 'Browse contests',
    to: '/contests',
    soft: true,
  },
  {
    name: 'Once',
    price: '$9',
    print: `Queues up to ${n} currently open Canada contests for one person. Queued is not submitted. A brand site is entered only when your order shows a receipt.`,
    cta: 'Unlock Once',
    pack: 'once',
    money: true,
  },
  {
    name: 'Triple',
    price: '$15',
    print: 'Up to three people you know, with their consent and identity. Each person gets the current open queue. Queued is not submitted.',
    cta: 'Get Triple',
    pack: 'triple',
    money: true,
  },
  {
    name: 'Year-round',
    price: '$19.99/mo',
    print: 'Records a monthly plan for one person and queues the current open contests once. Repeat entry as new contests open is not running.',
    cta: 'Unlock year-round',
    pack: 'year_round',
    money: true,
  },
]

export function PricingCards({ autoOkLive, teaser = false, estEvMidCad = 198 }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  const [pendingPack, setPendingPack] = useState<PackId | null>(null)
  const [busyPack, setBusyPack] = useState<PackId | null>(null)
  const checkoutBusy = busyPack !== null
  const [preEmail, setPreEmail] = useState('')
  const [preName, setPreName] = useState('')

  async function startCheckout(pack: PackId) {
    setBusyPack(pack)
    try {
      const { url } = await createCheckout(pack, inbound)
      if (url) {
        window.location.href = url
        return
      }
      throw new Error('missing_url')
    } catch {
      // Fallback: Payment Links only if server Checkout fails. Prefer /api/checkout.
      const href = paymentLinkWithRef(pack, inbound)
      window.location.href = href
    } finally {
      setBusyPack(null)
      setPendingPack(null)
    }
  }

  function onUnlockClick(e: MouseEvent<HTMLButtonElement>, pack: PackId) {
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

  return (
    <>
      <div className={`grid gap-3 ${teaser ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
        {list.map((p) => {
          const evLine = packEvLine(p.pack, autoOkLive, estEvMidCad)
          return (
            <div
              key={p.name}
              className={`rounded-2xl p-4 sm:p-5 flex flex-col transition hover:-translate-y-0.5 ${
                p.money
                  ? 'card-surface border-teal-600 ring-2 ring-teal-600/30 shadow-md shadow-teal-600/10'
                  : 'card-surface'
              }`}
            >
              {p.money ? (
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-0.5">
                  Paid assist
                </p>
              ) : null}
              <p className="section-kicker">{p.name}</p>
              <p className="tabular text-3xl sm:text-4xl font-extrabold text-navy-950 mt-1">{p.price}</p>
              <p className="text-sm text-slate-600 mt-2 flex-1 leading-snug">{p.print}</p>
              {evLine ? (
                <p className="text-[11px] text-slate-500 mt-2 leading-snug">{evLine}</p>
              ) : null}
              {p.pack ? (
                <button
                  type="button"
                  disabled={checkoutBusy}
                  onClick={(e) => onUnlockClick(e, p.pack!)}
                  className={`mt-3 inline-flex w-full justify-center items-center px-5 py-4 text-base sm:text-lg font-bold disabled:opacity-60 ${
                    p.money ? 'btn-primary' : 'btn-ghost text-navy-950'
                  }`}
                >
                  {busyPack === p.pack ? 'Starting checkout…' : p.cta}
                </button>
              ) : (
                <Link
                  to={p.to!}
                  className={`mt-3 inline-flex w-full justify-center items-center px-5 py-3 text-sm font-semibold ${
                    p.soft ? 'btn-ghost text-navy-950' : 'btn-primary'
                  }`}
                >
                  {p.cta}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {pendingPack ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prepay-title"
        >
          <div className="card-surface w-full max-w-md space-y-4 rounded-2xl p-5 shadow-xl sm:p-6">
            <p id="prepay-title" className="text-sm font-semibold text-navy-950">
              Optional: save name and email before checkout
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              Soft step only. You can skip. Full mailing address is collected after payment on your order page (legal
              identity for applies). One personal profile; friends need consent + their identity. Max 10 purchases per
              buyer.
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
    </>
  )
}
