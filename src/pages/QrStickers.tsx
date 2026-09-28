import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { JINGLE_SHARE, shareOrCopy } from '../lib/shareRef'

type Meta = {
  terms_text: string
  terms_version: string
  rate_bps: number
  rate_percent: number
  placement_ideas: string[]
  positioning: string
  layouts: { id: string; label: string }[]
  sticker_sku: { id: string; name: string; amount_cents: number; currency: string; cogs_note: string }
}

type Claimed = {
  code: string
  email: string
  share_url: string
  sticker_pdf_url: string
  logo_url?: string | null
  brand_name?: string | null
  rate_percent: number
  existing?: boolean
}

const DEFAULT_META: Meta = {
  terms_text:
    'By claiming a WePrize QR code, you earn the current affiliate share of every purchase attributed to your code (starts at 50%). WePrize can change that share anytime. Use your code honestly: no spam, no fake traffic, no fraud. Abuse can get a code shut off. Clicking Agree means you accept these terms.',
  terms_version: 'qr_terms_v1',
  rate_bps: 5000,
  rate_percent: 50,
  placement_ideas: [
    'Gambling / lottery stations in stores',
    'Restaurant table seats / menus',
    'Sports teams & local clubs',
    'Individuals sharing with friends',
    'Businesses (front counter, receipts, windows)',
  ],
  positioning: 'Do it yourself. Become a revenue distributor.',
  layouts: [
    { id: 'large', label: '6× large' },
    { id: 'medium', label: '15× medium' },
    { id: 'small', label: '30× small' },
  ],
  sticker_sku: {
    id: 'sticker_50',
    name: '50 hard stickers shipped',
    amount_cents: 2400,
    currency: 'cad',
    cogs_note: '',
  },
}

export function QrStickers() {
  const [meta, setMeta] = useState<Meta>(DEFAULT_META)
  const [email, setEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [brandName, setBrandName] = useState('')
  const [recruitedBy, setRecruitedBy] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<Claimed | null>(null)
  const [layout, setLayout] = useState('medium')
  const [copied, setCopied] = useState(false)

  // Calculator
  const [customers, setCustomers] = useState(1000)
  const [avgSpend, setAvgSpend] = useState(15)
  const rate = (claimed?.rate_percent ?? meta.rate_percent) / 100
  const payout = useMemo(() => customers * avgSpend * rate, [customers, avgSpend, rate])

  useEffect(() => {
    fetch('/api/qr/meta')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta({ ...DEFAULT_META, ...d }))
      .catch(() => undefined)
  }, [])

  async function claim(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch('/api/qr/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          agree,
          logo_url: logoUrl || undefined,
          brand_name: brandName || undefined,
          recruited_by: recruitedBy || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'claim_failed')
      setClaimed(data)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'claim_failed')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!claimed) return
    await shareOrCopy(claimed.share_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function pdfHref() {
    if (!claimed) return '#'
    return `${claimed.sticker_pdf_url}?layout=${encodeURIComponent(layout)}`
  }

  async function buyHardStickers() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/qr/stickers/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimed?.email || email, ref: claimed?.code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'checkout_failed')
      if (data.url) window.location.href = data.url
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'checkout_failed')
    } finally {
      setBusy(false)
    }
  }

  async function connectPayouts() {
    if (!claimed) return
    setBusy(true)
    try {
      const res = await fetch(`/api/qr/${claimed.code}/connect/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimed.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'connect_failed')
      if (data.url) window.location.href = data.url
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'connect_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <p className="section-kicker mb-2">QR · DIY stickers · affiliate</p>
        <h1 className="text-3xl font-bold text-navy-950 leading-tight mb-2">
          Do it yourself. Become a revenue distributor.
        </h1>
        <p className="text-slate-600 leading-relaxed">
          Claim a code, print free DIY stickers, stick them where people look. When they scan and buy, you earn{' '}
          <strong>{meta.rate_percent}%</strong> of every attributed purchase. WePrize can change the rate anytime.
        </p>
      </section>

      {/* Calculator */}
      <section className="card-surface rounded-2xl p-5">
        <h2 className="font-semibold text-navy-950 mb-1">Earnings calculator</h2>
        <p className="text-xs text-slate-500 mb-4">Visible math at the current affiliate rate (admin-editable).</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <label className="text-sm">
            Customers
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={customers}
              onChange={(e) => setCustomers(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            Avg spend (CAD)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={avgSpend}
              onChange={(e) => setAvgSpend(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            Your rate
            <input
              readOnly
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
              value={`${(rate * 100).toFixed(0)}%`}
            />
          </label>
        </div>
        <p className="text-lg font-bold text-teal-700 tabular">
          {customers.toLocaleString()} × ${avgSpend.toFixed(2)} × {(rate * 100).toFixed(0)}% ={' '}
          <span className="text-navy-950">${payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {[1000, 10000].map((n) => (
            <button
              key={n}
              type="button"
              className="btn-ghost text-xs px-3 py-1.5"
              onClick={() => setCustomers(n)}
            >
              Try {n.toLocaleString()}
            </button>
          ))}
        </div>
      </section>

      {/* Claim */}
      <section className="card-surface rounded-2xl p-5">
        <h2 className="font-semibold text-navy-950 mb-3">Claim your code</h2>
        <form onSubmit={claim} className="space-y-3">
          <label className="block text-sm">
            Email
            <input
              required
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.com"
            />
          </label>
          <label className="block text-sm">
            Brand name (optional co-brand)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your store / team"
            />
          </label>
          <label className="block text-sm">
            Logo URL (optional — https image)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
            />
          </label>
          <label className="block text-sm">
            Recruited by (B2B rep code — optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={recruitedBy}
              onChange={(e) => setRecruitedBy(e.target.value)}
              placeholder="rep code"
            />
          </label>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 leading-relaxed">
            {meta.terms_text}
            <p className="text-[11px] text-slate-400 mt-2">Version {meta.terms_version}</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>I agree — activate my distributor code</span>
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={busy || !agree} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {busy ? 'Claiming…' : 'Agree & claim code'}
          </button>
        </form>
      </section>

      {claimed && (
        <section className="card-surface rounded-2xl p-5 space-y-4 border border-teal-600/30">
          <p className="text-sm text-teal-700 font-medium">
            {claimed.existing ? 'Welcome back' : 'Code ready'} · <code className="font-mono">{claimed.code}</code>
          </p>
          <p className="text-sm break-all">
            Share link:{' '}
            <a className="text-teal-700 underline" href={claimed.share_url}>
              {claimed.share_url}
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm px-4 py-2" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy share text'}
            </button>
            <a
              className="btn-ghost text-sm px-4 py-2"
              href={`mailto:?subject=WePrize&body=${encodeURIComponent(JINGLE_SHARE[0] + ' ' + claimed.share_url)}`}
            >
              Email
            </a>
            <a
              className="btn-ghost text-sm px-4 py-2"
              href={`sms:?&body=${encodeURIComponent(JINGLE_SHARE[2] + ' ' + claimed.share_url)}`}
            >
              SMS
            </a>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">DIY sticker PDF (free)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {meta.layouts.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayout(l.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${
                    layout === l.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <a href={pdfHref()} className="btn-primary inline-flex text-sm px-4 py-2" target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-sm font-medium">Hard stickers shipped — ${((meta.sticker_sku.amount_cents || 2400) / 100).toFixed(0)} CAD</p>
            <p className="text-xs text-slate-500">{meta.sticker_sku.cogs_note || 'Manual fulfill morning-after. Money first.'}</p>
            <button type="button" className="btn-ghost text-sm px-4 py-2" onClick={buyHardStickers} disabled={busy}>
              Order 50 hard stickers
            </button>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium mb-1">Payouts to your bank (Stripe Connect)</p>
            <p className="text-xs text-slate-500 mb-2">Optional — DIY + PDF work without Connect.</p>
            <button type="button" className="btn-ghost text-sm px-4 py-2" onClick={connectPayouts} disabled={busy}>
              Connect bank for payouts
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-navy-950 mb-2">Where to stick them</h2>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          {meta.placement_ideas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-navy-950 text-slate-200 p-5">
        <p className="text-teal-400 text-xs font-semibold mb-1">Coming next</p>
        <p className="font-semibold text-white mb-1">QR tees · merch · homeless outreach</p>
        <p className="text-sm text-slate-400">Stub only tonight — Printful tees not built. {/* BIRCH_RESERVE_AD_HOOK */}</p>
        <p className="mt-3 text-sm">
          Recruit stores for WePrize?{' '}
          <Link to="/qr/b2b" className="text-teal-400 underline">
            B2B rep program →
          </Link>
        </p>
      </section>
    </div>
  )
}
