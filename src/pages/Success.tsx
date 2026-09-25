import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { ShareButton } from '../components/ShareButton'
import { fetchOrderBySession, recoverOrderByEmail, type ServerOrder } from '../lib/api'
import { isPackId, PACK_LABELS, type PackId } from '../types/assist'

export function Success() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const packParam = params.get('pack')
  const sessionId = params.get('session_id') || params.get('checkout_session_id')
  const pack: PackId | null = isPackId(packParam) ? packParam : null
  const meta = pack ? PACK_LABELS[pack] : null

  const [liveOrder, setLiveOrder] = useState<ServerOrder | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(Boolean(sessionId))

  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverBusy, setRecoverBusy] = useState(false)
  const [recoverError, setRecoverError] = useState<string | null>(null)

  const missingSession = Boolean(pack && !sessionId)

  // Live path: Checkout session → order token
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setResolving(true)
    void fetchOrderBySession(sessionId)
      .then((order) => {
        if (!cancelled) {
          setLiveOrder(order)
          setLiveError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveOrder(null)
          setLiveError(
            'Payment received. We are still confirming your order — refresh in a few seconds, or recover with the email you used at checkout.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const steps = useMemo(
    () => [
      { n: '1', title: 'Payment received', body: 'Your assist pack is unlocked.' },
      {
        n: '2',
        title: 'Share your identity',
        body: 'Legal name, email, and mailing address you own — required before we apply.',
      },
      { n: '3', title: 'We apply · you tap codes', body: 'AUTO_OK forms only. OTP stays with you.' },
    ],
    [],
  )

  async function onRecover(e: FormEvent) {
    e.preventDefault()
    setRecoverError(null)
    const email = recoverEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      setRecoverError('Enter the exact email you used at checkout.')
      return
    }
    setRecoverBusy(true)
    try {
      const order = await recoverOrderByEmail(email)
      setLiveOrder(order)
      navigate(`/order/${order.token}`, { replace: false })
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) {
        setRecoverError(
          'No paid order found for that email yet. Check spam for a WePrize order link, or wait a minute and try again after payment confirms.',
        )
      } else if (status === 429) {
        setRecoverError('Too many attempts. Wait a minute, then try again.')
      } else {
        setRecoverError('Could not look up that order. Try again in a moment.')
      }
    } finally {
      setRecoverBusy(false)
    }
  }

  const continueTo = liveOrder
    ? `/order/${liveOrder.token}`
    : null

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/10 ring-1 ring-teal-600/25">
          <span className="text-2xl text-teal-600" aria-hidden>
            ✓
          </span>
        </div>
        <p className="section-kicker">You’re in</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">Payment received</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-navy-950">We apply. You tap codes when asked.</span>
          {meta ? (
            <>
              {' '}
              <span className="font-semibold text-navy-950">{meta.name}</span>
              {' · '}
              <span className="tabular-nums">{meta.price}</span>
              {' — '}
              {meta.blurb}
            </>
          ) : liveOrder ? (
            <>
              {' '}
              {liveOrder.pack_label} is ready.
            </>
          ) : (
            <> Thanks. Next, tell us who to apply as so we can start your queue.</>
          )}
        </p>
        {resolving ? <p className="text-xs text-slate-500">Confirming your payment…</p> : null}
        {liveError ? (
          <p className="inline-block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {liveError}
          </p>
        ) : null}
        {!pack && !sessionId ? (
          <p className="inline-block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Missing <code className="font-mono">?session_id=</code> or <code className="font-mono">?pack=</code>. Recover
            your order below with the checkout email, or open the link from your WePrize email.
          </p>
        ) : null}
      </div>

      {missingSession && !liveOrder ? (
        <div className="card-surface space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 sm:p-6">
          <p className="text-sm font-semibold text-navy-950">Link your payment → identity form</p>
          <p className="text-xs leading-relaxed text-slate-600">
            Your success page is missing <code className="font-mono text-[11px]">session_id</code> (Stripe Dashboard
            redirect not set yet). Payment can still be live — recover with the <strong>exact email</strong> from
            checkout, or open the order link we email when Resend is configured. Then share legal identity on your order
            page so we can apply.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
            <li>Recover order (email below) or use the emailed /order link</li>
            <li>Submit legal name, email, address, city, province, postal (phone/DOB optional)</li>
            <li>We queue AUTO_OK applies — you tap codes when brands ask</li>
          </ol>
        </div>
      ) : null}

      <div className="card-surface space-y-4 rounded-2xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-navy-950">What happens next</p>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-xs font-bold text-teal-700">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-medium text-navy-950">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {continueTo ? (
          <Link to={continueTo} className="btn-primary inline-flex w-full justify-center px-6 py-3 text-sm sm:w-auto">
            Open your order — share identity
          </Link>
        ) : (
          <div className="space-y-3 rounded-xl bg-slate-50 ring-1 ring-slate-200/80 px-3.5 py-3">
            <p className="text-xs font-semibold text-navy-950">Recover my order</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Use the exact email from Stripe checkout. We return your latest paid order only — no other accounts.
            </p>
            <form onSubmit={onRecover} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor="recover-email">
                Checkout email
              </label>
              <input
                id="recover-email"
                type="email"
                autoComplete="email"
                required
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="submit"
                disabled={recoverBusy}
                className="btn-primary inline-flex shrink-0 justify-center px-4 py-2.5 text-sm disabled:opacity-60"
              >
                {recoverBusy ? 'Looking up…' : 'Find my order'}
              </button>
            </form>
            {recoverError ? <p className="text-xs text-amber-900">{recoverError}</p> : null}
          </div>
        )}

        <div className="space-y-1.5 rounded-xl bg-teal-50/70 ring-1 ring-teal-200/60 px-3.5 py-3">
          <p className="text-xs font-semibold text-teal-900">Know someone who wastes hours on contest forms?</p>
          <p className="text-[11px] leading-relaxed text-teal-800/90">
            Send your peer link. Free contests stay free — optional assist if they want it. No cash referral rewards.
          </p>
          <ShareButton label="Pass your link — help a friend skip the busywork" variant="next" />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-dashed border-navy-950/12 bg-white/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-950">Competition Act · plain talk</p>
        <p className="text-xs leading-relaxed text-slate-600">
          Contests are free. Your fee is for research and time on eligible AUTO_OK entries. Estimates are not a
          guarantee. We cannot influence who wins. One personal profile for you; friends = apply-on-behalf with their
          consent and identity. Max 10 purchases per buyer — not a bulk business tool. We never invent emails or phones.
        </p>
        <DisclaimerStrip />
      </div>

      <p className="text-center text-xs text-slate-500">
        Already set up?{' '}
        <Link
          to={liveOrder ? `/order/${liveOrder.token}` : '/dashboard'}
          className="font-medium text-teal-600 hover:underline"
        >
          Open your {liveOrder ? 'order' : 'dashboard'}
        </Link>
      </p>
    </div>
  )
}
