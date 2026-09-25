import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import {
  ackOrderJob,
  fetchOrderByToken,
  fetchOrderJobs,
  postOrderIdentity,
  type ServerJob,
  type ServerOrder,
} from '../lib/api'
import { APPLY_STATUS_LABELS, type ApplyStatus } from '../types/assist'

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const

type FormState = {
  legal_name: string
  email: string
  address1: string
  city: string
  province: string
  postal: string
  country: string
  phone: string
  dob: string
}

const EMPTY_FORM: FormState = {
  legal_name: '',
  email: '',
  address1: '',
  city: '',
  province: 'ON',
  postal: '',
  country: 'CA',
  phone: '',
  dob: '',
}

function statusPillClass(key: string) {
  if (key === 'needs_you' || key === 'confirm_sent') return 'bg-amber-50 text-amber-950 ring-amber-200'
  if (key === 'applied' || key === 'confirmed') return 'bg-emerald-50 text-emerald-950 ring-emerald-200'
  if (key === 'failed') return 'bg-rose-50 text-rose-950 ring-rose-200'
  if (key === 'applying') return 'bg-sky-50 text-sky-950 ring-sky-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

export function Order() {
  const { token = '' } = useParams()
  const [order, setOrder] = useState<ServerOrder | null>(null)
  const [jobs, setJobs] = useState<ServerJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [ackBusy, setAckBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const [nextOrder, jobsResponse] = await Promise.all([
        fetchOrderByToken(token),
        fetchOrderJobs(token),
      ])
      setOrder(nextOrder)
      setJobs(jobsResponse.jobs)
      setError(null)
    } catch (err) {
      const status = (err as { status?: number }).status
      setError(
        status === 404
          ? 'We could not find that order. Check the link from your receipt or success page.'
          : 'Something went wrong loading your order. Try again in a moment.',
      )
      setOrder(null)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), 20_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const needsYouJobs = useMemo(
    () => jobs.filter((j) => j.status === 'needs_you' || j.status === 'confirm_sent'),
    [jobs],
  )
  const appliedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'applied' || j.status === 'confirmed'),
    [jobs],
  )
  const otherJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.status !== 'needs_you' &&
          j.status !== 'confirm_sent' &&
          j.status !== 'applied' &&
          j.status !== 'confirmed',
      ),
    [jobs],
  )

  async function handleIdentitySubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setFormError(null)
    const body = {
      legal_name: form.legal_name.trim(),
      email: form.email.trim(),
      address1: form.address1.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal: form.postal.trim(),
      country: form.country.trim() || 'CA',
      phone: form.phone.trim() || undefined,
      dob: form.dob.trim() || undefined,
    }
    if (!body.legal_name || !body.email || !body.address1 || !body.city || !body.province || !body.postal) {
      setFormError('Please fill every required field. We only use what you provide.')
      setSaving(false)
      return
    }
    try {
      const res = await postOrderIdentity(token, body)
      setOrder(res.order)
      const jobsResponse = await fetchOrderJobs(token)
      setJobs(jobsResponse.jobs)
      setForm(EMPTY_FORM)
    } catch (err) {
      const detail = (err as { detail?: { message?: string } }).detail
      setFormError(detail?.message || 'Could not save identity. Check the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAck(jobId: string) {
    if (!token) return
    setAckBusy(jobId)
    try {
      await ackOrderJob(token, jobId)
      await refresh()
    } finally {
      setAckBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-slate-200/80" />
        <div className="h-28 rounded-2xl bg-slate-200/60" />
        <div className="h-48 rounded-2xl bg-slate-200/50" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg space-y-5 py-8 text-center">
        <p className="section-kicker">Order</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Link not found</h1>
        <p className="text-sm leading-relaxed text-slate-600">{error || 'Missing order token.'}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/pricing" className="btn-primary px-5 py-2.5 text-sm">
            See pricing
          </Link>
          <Link to="/dashboard" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
            Local demo dashboard
          </Link>
        </div>
      </div>
    )
  }

  const counts = order.job_counts || {}

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <p className="section-kicker">Your assist</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
          {order.pack_label} · we apply, you tap codes
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          {order.message || 'We apply. You tap codes when asked.'} Contests stay free on brand sites. Your fee is
          for research and time — not odds, not influence.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['queued', 'applying', 'applied', 'needs_you'] as const).map((key) => (
          <div key={key} className={`rounded-2xl px-4 py-3 ring-1 ${statusPillClass(key)}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">
              {APPLY_STATUS_LABELS[key as ApplyStatus] || key}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{counts[key] ?? 0}</p>
          </div>
        ))}
      </section>

      {order.needs_identity ? (
        <section className="card-surface space-y-5 rounded-2xl p-5 sm:p-7">
          <div>
            <p className="section-kicker mb-1">Step 1</p>
            <h2 className="text-lg font-semibold text-navy-950">Bring your own identity</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Legal name, email, and mailing address you own.
              {order.identity_slots > 1
                ? ` This pack holds up to ${order.identity_slots} people (${order.identities_count} saved).`
                : null}{' '}
              We never invent fields.
            </p>
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleIdentitySubmit}>
            {(
              [
                ['legal_name', 'Legal name', 'text', true],
                ['email', 'Email', 'email', true],
                ['address1', 'Address', 'text', true],
                ['city', 'City', 'text', true],
                ['postal', 'Postal code', 'text', true],
                ['phone', 'Phone (optional)', 'tel', false],
                ['dob', 'Date of birth (optional)', 'date', false],
              ] as const
            ).map(([key, label, type, required]) => (
              <label key={key} className={`block text-sm ${key === 'address1' ? 'sm:col-span-2' : ''}`}>
                <span className="font-medium text-navy-950">{label}</span>
                <input
                  required={required}
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-navy-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="font-medium text-navy-950">Province</span>
              <select
                required
                value={form.province}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-navy-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600/30"
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-navy-950">Country</span>
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-navy-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30"
              />
            </label>
            {formError ? (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save identity & queue applies'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div>
            <p className="text-sm font-semibold text-navy-950">Identity on file</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {order.identities_count}/{order.identity_slots} slot{order.identity_slots === 1 ? '' : 's'} ·{' '}
              {order.jobs_total} AUTO_OK jobs seeded (cap {order.seed_n}/person)
            </p>
          </div>
          {order.identities_count < order.identity_slots ? (
            <p className="text-xs font-medium text-teal-700">You can still add another person for this pack.</p>
          ) : null}
        </section>
      )}

      {needsYouJobs.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="section-kicker mb-1">Needs you</p>
            <h2 className="text-lg font-semibold text-navy-950">Tap a code or confirm link</h2>
          </div>
          {needsYouJobs.map((job) => (
            <article key={job.id} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-navy-950">{job.contest_title}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-900/80">
                    {APPLY_STATUS_LABELS[job.status as ApplyStatus] || job.status}
                  </p>
                </div>
                <a
                  href={job.contest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Open brand site
                </a>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {job.what_to_do ||
                  job.needs_you_reason ||
                  'Finish the brand OTP or confirm step, then mark yourself done.'}
              </p>
              <button
                type="button"
                disabled={ackBusy === job.id}
                onClick={() => void handleAck(job.id)}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {ackBusy === job.id ? 'Saving…' : 'I finished this step'}
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {appliedJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-950">Applied / confirmed</h2>
          <ul className="space-y-2">
            {appliedJobs.map((job) => (
              <li
                key={job.id}
                className="card-surface flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-navy-950">{job.contest_title}</p>
                  <p className="text-xs text-slate-500">{APPLY_STATUS_LABELS[job.status as ApplyStatus]}</p>
                </div>
                <a
                  href={job.contest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-600 hover:underline"
                >
                  Receipt link
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {otherJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-950">In progress</h2>
          <ul className="space-y-2">
            {otherJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-navy-950/8 bg-white px-4 py-3"
              >
                <p className="text-sm text-navy-950">{job.contest_title}</p>
                <span className="text-xs font-semibold text-slate-500">
                  {APPLY_STATUS_LABELS[job.status as ApplyStatus] || job.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!order.needs_identity && jobs.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-navy-950/15 bg-white/70 p-6 text-center">
          <p className="font-semibold text-navy-950">Queue is warming up</p>
          <p className="text-sm text-slate-600">
            Identity saved. AUTO_OK jobs appear here as Contest Bot seeds your slice.
          </p>
        </div>
      ) : null}

      <DisclaimerStrip />
    </div>
  )
}
