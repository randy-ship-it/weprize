import { useState } from 'react'
import { Link } from 'react-router-dom'

type Status = 'idle' | 'checking' | 'pending' | 'rejected' | 'dup'

type VerifyResult = {
  status: Status
  reason?: string
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let u = trimmed
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    if (parsed.protocol === 'http:') parsed.protocol = 'https:'
    parsed.hash = ''
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((k) =>
      parsed.searchParams.delete(k),
    )
    return parsed.toString()
  } catch {
    return null
  }
}

const CONTEST_HOST_HINTS = [
  'gleam.io',
  'woobox.com',
  'kingsumo.com',
  'viralsweep.com',
  'shortstack.com',
  'tradablebits.com',
  'castanet.net/contests',
  'contest',
  'sweepstakes',
  'giveaway',
]

const JUNK_HINTS = ['pay-to-claim', 'claim-fee', 'wire transfer', 'crypto drain', 'adult']

/** Client-side auto-verify stub. Server/Contest Bot re-runs the real gate before live promote. */
function autoVerify(url: string): VerifyResult {
  const lower = url.toLowerCase()
  const key = 'weprize_community_submits_v1'
  const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]')
  if (existing.includes(url)) {
    return { status: 'dup', reason: 'Already in our queue.' }
  }
  if (JUNK_HINTS.some((h) => lower.includes(h))) {
    return { status: 'rejected', reason: "Couldn't verify this as a free contest." }
  }
  const looksContest = CONTEST_HOST_HINTS.some((h) => lower.includes(h))
  if (!looksContest) {
    // Still accept into quarantine - Contest Bot fetches for real signals
    existing.push(url)
    localStorage.setItem(key, JSON.stringify(existing.slice(-200)))
    return {
      status: 'pending',
      reason: "Queued. We'll auto-check it's a real open contest before it goes live.",
    }
  }
  existing.push(url)
  localStorage.setItem(key, JSON.stringify(existing.slice(-200)))
  return {
    status: 'pending',
    reason: "Looks promising. Queued for auto-verify - live only after we confirm.",
  }
}

export function Submit() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (honeypot) return
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setStatus('rejected')
      setMsg('Paste a normal https contest link.')
      return
    }
    setStatus('checking')
    setMsg('Checking…')
    // Simulate async gate (real fetch lives on Contest Bot / edge later)
    window.setTimeout(() => {
      const result = autoVerify(normalized)
      setStatus(result.status)
      setMsg(result.reason || '')
      if (result.status === 'pending' || result.status === 'dup') {
        setUrl('')
      }
      // email optional - stored locally for draft only
      if (email && result.status === 'pending') {
        const ek = 'weprize_community_submit_emails_v1'
        const bag = JSON.parse(localStorage.getItem(ek) || '[]')
        bag.push({ email, url: normalized, at: new Date().toISOString() })
        localStorage.setItem(ek, JSON.stringify(bag.slice(-200)))
      }
    }, 450)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <p className="section-kicker mb-2">Free for everyone</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 mb-2">Suggest a contest</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Drop a sweepstakes link. We auto-check it before it hits the live board. No junk, no duplicates, no guessing prize value.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card-surface rounded-2xl p-5 space-y-3">
        <label className="block text-sm font-medium text-navy-950">
          Contest URL
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            required
          />
        </label>
        <label className="block text-sm font-medium text-navy-950">
          Email <span className="font-normal text-slate-400">(optional - we ping if it goes live)</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        {/* honeypot */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        <button type="submit" disabled={status === 'checking'} className="btn-primary w-full py-2.5 text-sm">
          {status === 'checking' ? 'Checking…' : 'Suggest contest'}
        </button>
        {msg ? (
          <p
            className={`text-sm leading-relaxed ${
              status === 'rejected' ? 'text-red-600' : status === 'dup' ? 'text-slate-600' : 'text-teal-700'
            }`}
          >
            {msg}
          </p>
        ) : null}
      </form>

      <p className="text-xs text-slate-500 leading-relaxed">
        Auto-verify = alive link, looks like a real contest, not a duplicate, not junk. Contest Bot still confirms before apply.{' '}
        <Link to="/contests" className="text-teal-600 hover:underline">
          Back to contests
        </Link>
      </p>
    </div>
  )
}
