import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addWaitlistEmail, getWaitlistEmails } from '../lib/waitlist'

const CONSENT_TEXT =
  'I agree to receive WePrize emails about free Canada contests and optional assist packs. Contests stay free. Optional packs buy research and time only, not better odds. We cannot influence who wins. Unsubscribe anytime.'

type Props = {
  source?: 'waitlist' | 'pricing' | 'home'
  planInterest?: string
  compact?: boolean
}

export function WaitlistForm({ source = 'waitlist', planInterest, compact }: Props) {
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [count, setCount] = useState(() => getWaitlistEmails().length)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!agreed) {
      setMsg('Check the box to agree to WePrize emails.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/audience/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consent: true,
          source,
          plan_interest: planInterest || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.message || 'Could not save email. Try again.')
        return
      }
      const local = addWaitlistEmail(email)
      setCount(local.count)
      setEmail('')
      setAgreed(false)
      setMsg(
        data.existing
          ? 'You are already on the WePrize email list.'
          : 'Thanks. You are on the WePrize email list. Unsubscribe anytime.',
      )
    } catch {
      const local = addWaitlistEmail(email)
      setCount(local.count)
      setMsg('Saved in this browser only. Server list is temporarily unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`card-surface rounded-2xl ${compact ? 'p-4' : 'p-6'} max-w-lg`}>
      <h2 className={`font-semibold text-navy-950 mb-1 ${compact ? 'text-base' : 'text-lg'}`}>
        Join the WePrize waitlist
      </h2>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        Free Canada contest alerts and optional assist tips. Email only. No forced account.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="flex-1 rounded-xl border border-navy-950/15 bg-ice-50 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
          />
          <button type="submit" disabled={busy} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-60">
            {busy ? 'Saving…' : 'Join waitlist'}
          </button>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-slate-300"
          />
          <span>{CONSENT_TEXT}</span>
        </label>
      </form>
      {msg ? <p className="mt-3 text-xs text-slate-600">{msg}</p> : null}
      {!compact ? (
        <>
          <p className="mt-3 text-xs text-slate-600 tabular">Local signups: {count}</p>
          <Link to="/contests" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
            Browse live feed
          </Link>
        </>
      ) : null}
    </div>
  )
}
