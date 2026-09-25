import { useState, type FormEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { paymentLinkWithRef } from '../data/stripe'
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
  return `Suggested expected value ~$${low} to $${high} CAD if we apply to ~${Math.round(n)} contests this cycle. Estimate only, not a guarantee.`
}

const plans = (n: number): Plan[] => [
  {
    name: 'Free',
    price: '$0',
    print: 'Browse and track. We apply to 10 contests for you. Share a peer link. No cash rewards.',
    cta: 'Browse contests',
    to: '/contests',
    featured: true,
  },
  {
    name: 'Once',
    price: '$9',
    print: `One round of applies for one person (your profile). About ${n} contests ready this week. Hundreds vs one on time. Desire the queue, not bulk farm accounts.`,
    cta: 'Unlock Once pack',
    pack: 'once',
  },
  {
    name: 'Triple',
    price: '$15',
    print: 'Three people you know (with their consent + identity), or three apply rounds. Real adults only. Not a business entry desk.',
    cta: 'Get Triple pack',
    pack: 'triple',
  },
  {
    name: 'Year-round',
    price: '$19.99/mo',
    print: 'We keep applying for one person as new contests open. Personal use; max 10 purchases per buyer email.',
    cta: 'Unlock year-round assist',
    pack: 'year_round',
  },
]

export function PricingCards({ autoOkLive, teaser = false, estEvMidCad = 198 }: Props) {
  const list = plans(autoOkLive)
  const inbound = getInboundRef()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [preEmail, setPreEmail] = useState('')
  const [preName, setPreName] = useState('')

  function goCheckout(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
    setPendingHref(null)
  }

  function onUnlockClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
    if (loadPrepayIdentity()) return // already saved — navigate normally
    e.preventDefault()
    setPendingHref(href)
    setPreEmail('')
    setPreName('')
  }

  function onSavePrepay(e: FormEvent) {
    e.preventDefault()
    if (!pendingHref) return
    const email = preEmail.trim()
    const name = preName.trim()
    if (email.includes('@') && name) {
      savePrepayIdentity(email, name)
    }
    goCheckout(pendingHref)
  }

  function onSkipPrepay() {
    if (!pendingHref) return
    goCheckout(pendingHref)
  }

  return (
    <>
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
                  onClick={(e) => onUnlockClick(e, href)}
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

      {pendingHref ? (
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
                  placeholder="Same email you’ll use at checkout"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onSkipPrepay}
                  className="btn-ghost inline-flex justify-center px-4 py-2.5 text-sm text-navy-950"
                >
                  Skip. Continue to pay
                </button>
                <button type="submit" className="btn-primary inline-flex justify-center px-4 py-2.5 text-sm">
                  Save & continue
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
