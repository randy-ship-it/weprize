import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Partners() {
  const [tab, setTab] = useState<'submit' | 'host' | 'featured'>('submit')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function post(path: string, body: Record<string, unknown>) {
    setErr(null)
    setMsg(null)
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || 'failed')
    return data
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="section-kicker mb-2">Partners</p>
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Run or feature a contest with WePrize</h1>
        <p className="text-slate-600 text-sm">
          We can host your contest, or give you a featured landing inside WePrize you can market — without dumping our
          public inventory book.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['submit', 'Partnership box'],
            ['host', 'WePrize hosts'],
            ['featured', 'Featured landing'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${tab === id ? 'border-teal-600 bg-teal-50' : 'border-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'submit' && (
        <PartnerForm
          title="Partnership submission"
          onSubmit={async (f) => {
            await post('/api/partners/submit', { ...f, kind: 'partnership' })
            setMsg('Thanks — we got your brief.')
          }}
        />
      )}
      {tab === 'host' && (
        <PartnerForm
          title="Ask WePrize to host your contest"
          extra
          onSubmit={async (f) => {
            await post('/api/partners/submit', { ...f, kind: 'host_request' })
            setMsg('Host request queued (status: host_request).')
          }}
        />
      )}
      {tab === 'featured' && (
        <FeaturedForm
          onSubmit={async (f) => {
            await post('/api/partners/featured', f)
            setMsg('Featured landing submitted — pending admin approve before public.')
          }}
        />
      )}

      {msg && <p className="text-teal-700 text-sm font-medium">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <p className="text-xs text-slate-500">
        Distributors: <Link to="/qr" className="underline text-teal-700">DIY QR stickers</Link> ·{' '}
        <Link to="/qr/b2b" className="underline text-teal-700">B2B reps</Link>
      </p>
    </div>
  )
}

function PartnerForm({
  title,
  onSubmit,
  extra,
}: {
  title: string
  extra?: boolean
  onSubmit: (f: Record<string, string>) => Promise<void>
}) {
  const [f, setF] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    about: '',
    contest_blurb: '',
  })
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="card-surface rounded-2xl p-5 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit(f)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 className="font-semibold text-navy-950">{title}</h2>
      {(['name', 'company', 'email', 'phone'] as const).map((k) => (
        <label key={k} className="block text-sm capitalize">
          {k}
          <input
            required={k === 'name' || k === 'email'}
            type={k === 'email' ? 'email' : 'text'}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        </label>
      ))}
      <label className="block text-sm">
        What you run / 1–2 sentences
        <textarea
          required
          className="mt-1 w-full rounded-lg border px-3 py-2"
          rows={3}
          value={f.about}
          onChange={(e) => setF({ ...f, about: e.target.value })}
        />
      </label>
      {extra && (
        <label className="block text-sm">
          Contest brief
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2"
            rows={3}
            value={f.contest_blurb}
            onChange={(e) => setF({ ...f, contest_blurb: e.target.value })}
          />
        </label>
      )}
      <button disabled={busy} className="btn-primary px-4 py-2 text-sm">
        Submit
      </button>
    </form>
  )
}

function FeaturedForm({ onSubmit }: { onSubmit: (f: Record<string, string>) => Promise<void> }) {
  const [f, setF] = useState({
    brand_name: '',
    slug: '',
    prize_blurb: '',
    image_url: '',
    cta_label: 'Learn more',
    cta_url: '',
    contact_email: '',
  })
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="card-surface rounded-2xl p-5 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit(f)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 className="font-semibold text-navy-950">Featured contest landing</h2>
      <p className="text-xs text-slate-500">Public only after admin approve. No full inventory dump.</p>
      {Object.keys(f).map((k) => (
        <label key={k} className="block text-sm">
          {k.replace(/_/g, ' ')}
          <input
            required={k === 'brand_name' || k === 'slug' || k === 'contact_email'}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={(f as Record<string, string>)[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        </label>
      ))}
      <button disabled={busy} className="btn-primary px-4 py-2 text-sm">
        Submit for review
      </button>
    </form>
  )
}
