import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addWaitlistEmail, getWaitlistEmails } from '../lib/waitlist'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [count, setCount] = useState(() => getWaitlistEmails().length)
  const [msg, setMsg] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = addWaitlistEmail(email)
    setCount(res.count)
    setMsg(res.message)
    if (res.ok) setEmail('')
  }

  return (
    <div className="card-surface rounded-2xl p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-navy-950 mb-1">Join the WePrize waitlist</h2>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        Free board alerts · Canada new + closing-soon · digest times ET. Stored in this browser only. No ESP until greenlight.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-xl border border-navy-950/15 bg-ice-50 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
        />
        <button type="submit" className="btn-primary px-4 py-2.5 text-sm">
          Join waitlist
        </button>
      </form>
      {msg ? <p className="mt-3 text-xs text-slate-600">{msg}</p> : null}
      <p className="mt-3 text-xs text-slate-600 tabular">Local signups: {count}</p>
      <Link to="/contests" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
        Browse live feed
      </Link>
    </div>
  )
}
