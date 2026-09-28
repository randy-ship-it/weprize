import { useState } from 'react'
import { Link } from 'react-router-dom'

/** Survey gate → crank spin → +10 free applies. */
export function Jackpot() {
  const [form, setForm] = useState({
    email: '',
    name: '',
    age_band: '25-34',
    city: '',
    province: 'ON',
    interests: 'health,fitness',
    household: '1-2',
    birch_license_ok: false,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ bonus_applies: number; already?: boolean } | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/consumers/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'survey_failed')
      if (data.jackpot_already) {
        setResult({ bonus_applies: data.bonus_applies || 10, already: true })
        return
      }
      setSpinning(true)
      await new Promise((r) => setTimeout(r, 1800))
      setSpinning(false)
      setResult({ bonus_applies: data.bonus_applies || 10 })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="section-kicker mb-2">Jackpot crank</p>
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Solid survey → +10 free applies</h1>
        <p className="text-slate-600 text-sm">
          Tell us a bit about you. Pull the crank once. WePrize queues +10 free contest applies as openings show up.
        </p>
      </div>

      {!result && (
        <form onSubmit={submit} className="card-surface rounded-2xl p-5 space-y-3">
          {(
            [
              ['email', 'Email', 'email'],
              ['name', 'Name', 'text'],
              ['city', 'City', 'text'],
            ] as const
          ).map(([k, label, type]) => (
            <label key={k} className="block text-sm">
              {label}
              <input
                required={k === 'email' || k === 'name'}
                type={type}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
          <label className="block text-sm">
            Age band
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.age_band}
              onChange={(e) => set('age_band', e.target.value)}
            >
              {['18-24', '25-34', '35-44', '45-54', '55+'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Province
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.province}
              onChange={(e) => set('province', e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Interests (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.interests}
              onChange={(e) => set('interests', e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Household size
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.household}
              onChange={(e) => set('household', e.target.value)}
            >
              {['1', '1-2', '3-4', '5+'].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="flex gap-2 text-sm items-start">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.birch_license_ok}
              onChange={(e) => set('birch_license_ok', e.target.checked)}
            />
            <span>
              I consent to WePrize licensing anonymized / consented profile data via Birch Reserve for partner
              marketing. Optional — you still get +10 applies either way.
            </span>
          </label>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={busy || spinning} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
            {spinning ? 'Cranking the jackpot…' : busy ? 'Saving…' : 'Save & pull the crank'}
          </button>
        </form>
      )}

      {spinning && (
        <div className="card-surface rounded-3xl p-10 text-center animate-pulse bg-navy-950 text-white">
          <p className="text-4xl mb-2">🎰</p>
          <p className="font-bold text-xl">Jackpot spinning…</p>
        </div>
      )}

      {result && (
        <div className="card-surface rounded-3xl p-8 text-center border border-teal-600/40">
          <p className="text-4xl mb-2">🎉</p>
          <h2 className="text-2xl font-bold text-navy-950 mb-2">
            {result.already ? 'Already claimed' : 'JACKPOT'}
          </h2>
          <p className="text-teal-700 text-lg font-semibold mb-3">+{result.bonus_applies} free applies unlocked</p>
          <p className="text-sm text-slate-600 mb-4">
            WePrize will apply on your behalf as contests open. Estimates aren&apos;t a guarantee.
          </p>
          <Link to="/pricing" className="btn-primary inline-flex px-5 py-2.5 text-sm">
            Boost with a paid pack
          </Link>
        </div>
      )}
    </div>
  )
}
