import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApplyRow } from '../components/ApplyRow'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { NeedsYouCard } from '../components/NeedsYouCard'
import { StatusChip } from '../components/StatusChip'
import { ackApplyNeedsYou, fetchApplies, fetchIdentity, fetchOrder } from '../lib/api'
import { progressSummary } from '../lib/assistStore'
import { PACK_LABELS, type Apply, type Identity, type Order } from '../types/assist'

export function Dashboard() {
  const [order, setOrder] = useState<Order | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [applies, setApplies] = useState<Apply[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [o, id, a] = await Promise.all([fetchOrder(), fetchIdentity(), fetchApplies()])
    setOrder(o)
    setIdentity(id)
    setApplies(a)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const summary = useMemo(() => progressSummary(applies), [applies])
  const needsYou = useMemo(
    () => applies.filter((a) => a.status === 'needs_you' || a.status === 'confirm_sent'),
    [applies],
  )
  const rest = useMemo(
    () => applies.filter((a) => a.status !== 'needs_you' && a.status !== 'confirm_sent'),
    [applies],
  )

  async function onAck(id: string) {
    setBusyId(id)
    await ackApplyNeedsYou(id)
    await refresh()
    setBusyId(null)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
        <div className="h-28 rounded-2xl bg-slate-200/60" />
        <div className="h-40 rounded-2xl bg-slate-200/50" />
      </div>
    )
  }

  const empty = !order && !identity && applies.length === 0

  if (empty) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-5 py-6">
        <p className="section-kicker">Assist dashboard</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">No pack yet</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Buy Once, Triple, or Year-round on Stripe, then we’ll guide you through identity and your apply queue.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/pricing" className="btn-primary px-5 py-2.5 text-sm">
            See pricing
          </Link>
          <Link to="/onboarding" className="btn-ghost px-5 py-2.5 text-sm text-navy-950">
            I already paid · set identity
          </Link>
        </div>
        <div className="card-surface rounded-2xl p-4 text-left text-xs text-slate-500 leading-relaxed">
          Demo tip: open{' '}
          <Link to="/success?pack=once" className="text-teal-600 hover:underline">
            /success?pack=once
          </Link>
          , continue to onboarding, then return here — local mock data seeds a realistic queue.
        </div>
      </div>
    )
  }

  if (order && !identity) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <p className="section-kicker">Almost there</p>
        <h1 className="text-2xl font-bold text-navy-950">Finish identity intake</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your {PACK_LABELS[order.pack].name} pack is ready. We need one BYO legal identity before Contest Bot queues AUTO_OK
          applies.
        </p>
        <Link
          to={`/onboarding?pack=${order.pack}`}
          className="btn-primary inline-flex px-5 py-2.5 text-sm"
        >
          Continue onboarding
        </Link>
      </div>
    )
  }

  const packLabel = order ? PACK_LABELS[order.pack] : null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker mb-1.5">Your assist</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-xl">
            We apply to free contests for you. Nudge cards appear when a brand needs a code or confirm — estimates only, never
            a guarantee.
          </p>
        </div>
        {packLabel ? (
          <div className="rounded-xl bg-navy-950 text-white px-4 py-3 text-right shadow-lg shadow-navy-950/15">
            <p className="text-[10px] uppercase tracking-wider text-teal-400 font-bold">Pack</p>
            <p className="font-semibold text-sm">{packLabel.name}</p>
            <p className="tabular text-xs text-slate-300">{packLabel.price}</p>
          </div>
        ) : null}
      </header>

      {identity ? (
        <div className="card-surface rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-medium text-navy-950">{identity.fullName}</p>
            <p className="text-xs text-slate-500">
              {identity.email}
              {identity.city ? ` · ${identity.city}, ${identity.province}` : ''}
            </p>
          </div>
          <Link to={`/onboarding${order ? `?pack=${order.pack}` : ''}`} className="text-xs font-semibold text-teal-600 hover:underline">
            Edit identity
          </Link>
        </div>
      ) : null}

      {/* Progress summary */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'In flight', value: summary.counts.queued + summary.counts.applying, tone: 'text-teal-700' },
          { label: 'Needs you', value: summary.needsYou, tone: 'text-rose-700' },
          { label: 'Applied / confirmed', value: summary.done, tone: 'text-emerald-700' },
          { label: 'Total in queue', value: summary.total, tone: 'text-navy-950' },
        ].map((s) => (
          <div key={s.label} className="card-surface rounded-2xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`tabular text-2xl font-bold mt-1 ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Status legend strip */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            'queued',
            'applying',
            'applied',
            'confirm_sent',
            'needs_you',
            'confirmed',
            'failed',
          ] as const
        ).map((st) => (
          <StatusChip key={st} status={st} />
        ))}
      </div>

      {/* Needs you */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-950">Needs you</h2>
          {needsYou.length === 0 ? (
            <p className="text-xs text-slate-400">All clear for now</p>
          ) : (
            <p className="text-xs font-medium text-rose-600">{needsYou.length} waiting</p>
          )}
        </div>
        {needsYou.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy-950/12 bg-white/70 px-5 py-8 text-center">
            <p className="text-sm font-medium text-navy-950">Nothing needs a tap right now</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              When a contest sends a confirm link or OTP, it shows up here with a clear next step.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {needsYou.map((a) => (
              <NeedsYouCard key={a.id} apply={a} onDone={onAck} busy={busyId === a.id} />
            ))}
          </div>
        )}
      </section>

      {/* All applies */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-950">All applies</h2>
        {applies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy-950/12 bg-white/70 px-5 py-8 text-center">
            <p className="text-sm font-medium text-navy-950">Queue is empty</p>
            <p className="text-xs text-slate-500 mt-1.5">Contest Bot will fill AUTO_OK applies after identity is saved.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rest.map((a) => (
              <ApplyRow key={a.id} apply={a} />
            ))}
            {/* keep needs_you also listed? They're in Needs you section — rest excludes them. Good. */}
          </ul>
        )}
      </section>

      <section className="card-surface rounded-2xl p-4 space-y-2">
        <DisclaimerStrip />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Demo store uses localStorage until Replit <code className="font-mono">/api</code> + Stripe webhooks are wired. No
          secrets in this SPA.
        </p>
      </section>
    </div>
  )
}
