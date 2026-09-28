import { useState } from 'react'

export function QrB2b() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [rep, setRep] = useState<{
    rep_code: string
    email: string
    id: string
  } | null>(null)
  const [dash, setDash] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const terms =
    'As a WePrize B2B rep, you earn a share of WePrize’s cut from purchases attributed to businesses you recruit (starts at 35% of WePrize’s share). Rep earnings last 24 months per business you bring in — after that, your share on that business stops unless you buy a Trailer at 3× trailing revenue, which locks 15% forever on that account. WePrize can change rates anytime. No spam, no fake signups, no fraud.'

  async function claim(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/qr/b2b/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, agree }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      setRep(data)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  async function loadDash() {
    if (!rep) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/qr/b2b/${encodeURIComponent(rep.rep_code)}/dashboard?email=${encodeURIComponent(rep.email)}`,
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDash(data)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  async function connect() {
    if (!rep) return
    const res = await fetch(`/api/qr/b2b/${encodeURIComponent(rep.rep_code)}/connect/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rep.email }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setErr(data.message || data.error || 'connect_failed')
  }

  async function buyTrailer(businessCode: string) {
    if (!rep) return
    const res = await fetch(`/api/qr/b2b/${encodeURIComponent(rep.rep_code)}/trailer/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rep.email, business_code: businessCode }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setErr(data.message || data.error || 'trailer_failed')
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <section>
        <p className="section-kicker mb-2">B2B recruitment</p>
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Get stores signed up. Keep a cut.</h1>
        <p className="text-slate-600">
          Get convenience stores signed up. They get a big commission. You get 35% of WePrize&apos;s cut for 24 months —
          then buy a Trailer to keep 15% forever.
        </p>
      </section>

      {!rep && (
        <form onSubmit={claim} className="card-surface rounded-2xl p-5 space-y-3">
          <label className="block text-sm">
            Name
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            Email
            <input required type="email" className="mt-1 w-full rounded-lg border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="text-sm bg-slate-50 border rounded-xl p-3 text-slate-700">{terms}</div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I agree
          </label>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={!agree || busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            Agree & become a rep
          </button>
        </form>
      )}

      {rep && (
        <div className="card-surface rounded-2xl p-5 space-y-3">
          <p className="font-mono text-teal-700">Rep code: {rep.rep_code}</p>
          <p className="text-sm text-slate-600">Businesses enter this when they claim a QR code (recruited by).</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost text-sm px-3 py-2" onClick={loadDash}>
              Refresh dashboard
            </button>
            <button type="button" className="btn-ghost text-sm px-3 py-2" onClick={connect}>
              Connect bank (Stripe)
            </button>
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {dash && (
            <div className="text-sm space-y-3">
              <p>
                Owed:{' '}
                <strong>${(((dash.owed_cents as number) || 0) / 100).toFixed(2)}</strong> · Paid:{' '}
                <strong>${(((dash.paid_cents as number) || 0) / 100).toFixed(2)}</strong>
              </p>
              <ul className="space-y-2">
                {((dash.businesses as Array<Record<string, unknown>>) || []).map((b) => (
                  <li key={String(b.business_code)} className="border rounded-xl p-3">
                    <p className="font-mono">{String(b.business_code)}</p>
                    <p className="text-xs text-slate-500">
                      Rule: {String(b.active_rule)} · days left: {String(b.days_left_in_window)} · trailing 12mo $
                      {((((b.trailing_revenue_cents_12m as number) || 0) / 100)).toFixed(2)}
                    </p>
                    {b.show_trailer_cta ? (
                      <button
                        type="button"
                        className="mt-2 btn-primary text-xs px-3 py-1.5"
                        onClick={() => buyTrailer(String(b.business_code))}
                      >
                        Buy trailer — keep 15% forever ($
                        {((((b.trailer_price_cents as number) || 0) / 100)).toFixed(0)})
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
