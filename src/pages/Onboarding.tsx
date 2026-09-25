import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { createOrder, fetchIdentity, postIdentity } from '../lib/api'
import { isPackId, PACK_LABELS, type PackId } from '../types/assist'
import { useContests } from '../hooks/useContests'

const PROVINCES = [
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
] as const

type FormState = {
  fullName: string
  email: string
  phone: string
  dob: string
  addressLine1: string
  addressLine2: string
  city: string
  province: string
  postal: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const empty: FormState = {
  fullName: '',
  email: '',
  phone: '',
  dob: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: 'ON',
  postal: '',
}

function validate(f: FormState): FieldErrors {
  const e: FieldErrors = {}
  if (f.fullName.trim().length < 2) e.fullName = 'Enter your legal full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a real email you can check for codes.'
  if (!f.addressLine1.trim()) e.addressLine1 = 'Mailing address is required for prize shipping.'
  if (!f.city.trim()) e.city = 'City is required.'
  if (!PROVINCES.includes(f.province as (typeof PROVINCES)[number])) e.province = 'Pick a province or territory.'
  const postal = f.postal.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) e.postal = 'Use a Canadian postal code (e.g. M5V 2T6).'
  if (f.phone.trim()) {
    const digits = f.phone.replace(/\D/g, '')
    if (digits.length < 10) e.phone = 'Phone looks short — include area code, or leave blank.'
  }
  if (f.dob.trim()) {
    const d = new Date(f.dob)
    if (Number.isNaN(d.getTime())) e.dob = 'Use a valid date.'
    else {
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
      if (age < 18) e.dob = 'You must be 18+ (legal adult).'
      if (age > 120) e.dob = 'Check the date of birth.'
    }
  }
  return e
}

function fieldClass(err?: string) {
  return `mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-600/30 ${
    err ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-white'
  }`
}

export function Onboarding() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { autoOkCount } = useContests()
  const packParam = params.get('pack')
  const pack: PackId | null = isPackId(packParam) ? packParam : null
  const meta = pack ? PACK_LABELS[pack] : null

  const [form, setForm] = useState<FormState>(empty)
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverMsg, setServerMsg] = useState('')

  useEffect(() => {
    if (pack) void createOrder({ pack, autoOkPrinted: autoOkCount || 42 })
    void fetchIdentity().then((id) => {
      if (!id) return
      setForm({
        fullName: id.fullName,
        email: id.email,
        phone: id.phone ?? '',
        dob: id.dob ?? '',
        addressLine1: id.addressLine1,
        addressLine2: id.addressLine2 ?? '',
        city: id.city,
        province: id.province,
        postal: id.postal,
      })
    })
  }, [pack, autoOkCount])

  const errors = useMemo(() => validate(form), [form])
  const show = (k: keyof FormState): string | undefined =>
    submitAttempted || touched[k] ? errors[k] : undefined

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (Object.keys(validate(form)).length) return
    setSaving(true)
    setServerMsg('')
    try {
      await postIdentity({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        dob: form.dob || undefined,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        province: form.province,
        postal: (() => {
          const p = form.postal.replace(/\s+/g, '').toUpperCase()
          return p.length === 6 ? `${p.slice(0, 3)} ${p.slice(3)}` : p
        })(),
      })
      navigate('/dashboard')
    } catch {
      setServerMsg('Could not save right now. Your details stay on this device until the API is live.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <p className="section-kicker mb-2">BYO identity</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight mb-2">
          Who should we apply as?
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          One personal profile for you — a real legal adult. Applying for a friend? Use <em>their</em> consent and identity, not a fake email.
          We fill AUTO_OK forms with these details. You tap email/SMS codes when a brand asks — we stop before CAPTCHA and OTP.
          Max 10 purchases per buyer (not a bulk business tool).
        </p>
        {meta ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold px-3 py-1 ring-1 ring-teal-200">
            Pack · {meta.name} · {meta.price}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <div className="card-surface rounded-xl p-3.5">
          <p className="font-semibold text-navy-950 mb-0.5">We apply</p>
          <p className="text-slate-500 leading-relaxed">Eligible free AUTO_OK contests from the live book.</p>
        </div>
        <div className="card-surface rounded-xl p-3.5">
          <p className="font-semibold text-navy-950 mb-0.5">You tap codes</p>
          <p className="text-slate-500 leading-relaxed">Email / SMS OTP stays with you. Dashboard nudges when needed.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card-surface rounded-2xl p-5 sm:p-6 space-y-4" noValidate>
        <label className="block text-sm font-medium text-navy-950">
          Full legal name
          <input
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            className={fieldClass(show('fullName'))}
            placeholder="Jordan Lee"
            required
          />
          {show('fullName') ? <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p> : null}
        </label>

        <label className="block text-sm font-medium text-navy-950">
          Email
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className={fieldClass(show('email'))}
            placeholder="you@email.com"
            required
          />
          {show('email') ? (
            <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Codes and confirms land here.</p>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-navy-950">
            Phone <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              className={fieldClass(show('phone'))}
              placeholder="416…"
            />
            {show('phone') ? <p className="mt-1 text-xs text-rose-600">{errors.phone}</p> : null}
          </label>
          <label className="block text-sm font-medium text-navy-950">
            Date of birth <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="date"
              autoComplete="bday"
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, dob: true }))}
              className={fieldClass(show('dob'))}
            />
            {show('dob') ? <p className="mt-1 text-xs text-rose-600">{errors.dob}</p> : null}
          </label>
        </div>

        <label className="block text-sm font-medium text-navy-950">
          Mailing address
          <input
            autoComplete="address-line1"
            value={form.addressLine1}
            onChange={(e) => set('addressLine1', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, addressLine1: true }))}
            className={fieldClass(show('addressLine1'))}
            placeholder="Street number and name"
            required
          />
          {show('addressLine1') ? <p className="mt-1 text-xs text-rose-600">{errors.addressLine1}</p> : null}
        </label>

        <label className="block text-sm font-medium text-navy-950">
          Apt / suite <span className="font-normal text-slate-400">(optional)</span>
          <input
            autoComplete="address-line2"
            value={form.addressLine2}
            onChange={(e) => set('addressLine2', e.target.value)}
            className={fieldClass()}
            placeholder="Unit…"
          />
        </label>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <label className="block text-sm font-medium text-navy-950 col-span-2 sm:col-span-1">
            City
            <input
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, city: true }))}
              className={fieldClass(show('city'))}
              required
            />
            {show('city') ? <p className="mt-1 text-xs text-rose-600">{errors.city}</p> : null}
          </label>
          <label className="block text-sm font-medium text-navy-950">
            Province
            <select
              autoComplete="address-level1"
              value={form.province}
              onChange={(e) => set('province', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, province: true }))}
              className={fieldClass(show('province'))}
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-navy-950">
            Postal
            <input
              autoComplete="postal-code"
              value={form.postal}
              onChange={(e) => set('postal', e.target.value.toUpperCase())}
              onBlur={() => setTouched((t) => ({ ...t, postal: true }))}
              className={fieldClass(show('postal'))}
              placeholder="M5V 2T6"
              required
            />
            {show('postal') ? <p className="mt-1 text-xs text-rose-600">{errors.postal}</p> : null}
          </label>
        </div>

        <div className="rounded-xl bg-ice-50 border border-navy-950/8 px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
          <strong className="text-navy-950">No ROI promises.</strong> Fee = research + time on free eligible entries.
          Book value is an estimate from entries we submit — not a guarantee. Guardrails: 1 personal profile; friends =
          apply-on-behalf with consent; max 10 purchases per buyer email. Household rules: one identity per person;
          we refuse a second apply when rules say one-per-household.
        </div>

        {serverMsg ? <p className="text-sm text-rose-600">{serverMsg}</p> : null}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save identity & open dashboard'}
        </button>
      </form>

      <DisclaimerStrip />
      <p className="text-xs text-slate-500 text-center">
        Prefer to browse first?{' '}
        <Link to="/contests" className="text-teal-600 hover:underline">
          Contests
        </Link>
        {' · '}
        <Link to="/dashboard" className="text-teal-600 hover:underline">
          Dashboard
        </Link>
      </p>
    </div>
  )
}
