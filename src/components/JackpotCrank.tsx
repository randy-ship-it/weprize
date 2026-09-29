import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useContests } from '../hooks/useContests'
import { crankPool, drawCrank, type CrankPick } from '../lib/crankPicks'
import { createCheckout } from '../lib/api'
import { paymentLinkWithRef } from '../data/stripe'
import { getInboundRef } from '../lib/shareRef'
import { savePrepayIdentity } from '../lib/prepayIdentity'
import type { PackId } from '../types/assist'

const SYMBOLS = ['💵', '🎁', '✈️', '🎟️', '🌿', '🚗', '🏆', '🍳', '🛠️']
const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const FREE_COUNT = 12

type Plan = 'free' | PackId
type Phase = 'idle' | 'spinning' | 'won' | 'saving' | 'done'

export function JackpotCrank() {
  const { contests, autoOkCount } = useContests()
  const pool = useMemo(() => crankPool(contests), [contests])
  const allCount = Math.max(autoOkCount, pool.length)
  const [phase, setPhase] = useState<Phase>('idle')
  const [picks, setPicks] = useState<CrankPick[]>([])
  const [reels, setReels] = useState(['🏆', '🎁', '💵'])
  const [stopped, setStopped] = useState([true, true, true])
  const [lever, setLever] = useState(false)
  const timers = useRef<number[]>([])
  const stopRef = useRef([true, true, true])
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ name: '', email: '', city: '', province: 'ON', age_band: '25-34' })
  const [agree, setAgree] = useState(false)
  const [plan, setPlan] = useState<Plan>('free')
  const [err, setErr] = useState<string | null>(null)
  const [already, setAlready] = useState(false)

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  function pull() {
    if (phase === 'spinning' || phase === 'saving') return
    const drawn = drawCrank(pool, FREE_COUNT)
    setPicks([])
    setPhase('spinning')
    setLever(true)
    setStopped([false, false, false])
    stopRef.current = [false, false, false]
    timers.current.push(window.setTimeout(() => setLever(false), 450))
    const finals = drawn.slice(0, 3).map((p) => p.emoji)
    const spin = window.setInterval(() => {
      setReels((r) => r.map((v, j) => (stopRef.current[j] ? v : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])))
    }, 70)
    ;[900, 1350, 1800].forEach((ms, i) => {
      timers.current.push(
        window.setTimeout(() => {
          stopRef.current[i] = true
          setStopped((s) => s.map((v, j) => (j === i ? true : v)))
          setReels((r) => r.map((v, j) => (j === i ? finals[i] || '🏆' : v)))
          if (i === 2) {
            window.clearInterval(spin)
            setReels(finals.length === 3 ? finals : ['🏆', '🏆', '🏆'])
            setPicks(drawn)
            setPhase('won')
            timers.current.push(
              window.setTimeout(() => document.getElementById('crank-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500),
            )
          }
        }, ms),
      )
    })
  }

  const shown = reels

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function claim(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.name.trim().includes(' ')) return setErr('Add your first and last name, as contests need it.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErr('That email looks off.')
    if (!form.city.trim()) return setErr('Add your city.')
    if (!agree) return setErr('Tick the box so we can enter you and email you about it.')
    setPhase('saving')
    try {
      const res = await fetch('/api/consumers/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          name: form.name.trim(),
          household: '1',
          interests: `crank_free:${picks.map((p) => p.id).join(',')}`,
          free_count: picks.length,
          birch_license_ok: false,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Could not save. Try again.')
      setAlready(Boolean(data.jackpot_already))
      void fetch('/api/audience/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, consent: true, source: 'home', plan_interest: plan }),
      }).catch(() => {})
      if (plan !== 'free') {
        savePrepayIdentity(form.email, form.name)
        const ref = getInboundRef()
        try {
          const { url } = await createCheckout(plan, ref)
          if (url) {
            window.location.href = url
            return
          }
          throw new Error('missing_url')
        } catch {
          window.location.href = paymentLinkWithRef(plan, ref)
          return
        }
      }
      setPhase('done')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save. Try again.')
      setPhase('won')
    }
  }

  async function upgrade(pack: PackId) {
    savePrepayIdentity(form.email, form.name)
    const ref = getInboundRef()
    try {
      const { url } = await createCheckout(pack, ref)
      if (url) {
        window.location.href = url
        return
      }
    } catch {
      /* fall through */
    }
    window.location.href = paymentLinkWithRef(pack, ref)
  }

  return (
    <div className="w-full">
      {/* Machine */}
      <div className="mx-auto flex max-w-md items-center justify-center gap-3">
        <div className="relative flex-1 rounded-[28px] bg-navy-950 p-4 pb-5 shadow-2xl shadow-navy-950/30 ring-4 ring-soft-gold/60">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-soft-gold">WePrize</span>
            <span className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${phase === 'spinning' || (phase === 'won' && picks.length) ? 'crank-bulb' : 'bg-amber-500/70'}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2">
            {shown.map((s, i) => (
              <div
                key={i}
                className={`flex h-24 items-center justify-center overflow-hidden rounded-xl bg-ice-50 text-5xl sm:h-28 sm:text-6xl ${
                  stopped[i] ? 'crank-land' : 'crank-blur'
                }`}
                aria-hidden
              >
                {s}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-white" aria-live="polite">
            {phase === 'spinning'
              ? 'Spinning…'
              : picks.length
                ? `JACKPOT · ${picks.length} free contests`
                : 'Pull the crank to match your free contests'}
          </p>
        </div>

        {/* Lever */}
        <button
          type="button"
          onClick={pull}
          disabled={phase === 'spinning' || phase === 'saving'}
          aria-label="Pull the crank"
          className="group relative h-48 w-10 shrink-0 cursor-pointer disabled:cursor-wait"
        >
          <span className="absolute bottom-6 left-1/2 h-10 w-6 -translate-x-1/2 rounded-md bg-navy-800" />
          <span
            className={`absolute bottom-12 left-1/2 h-32 w-2.5 origin-bottom -translate-x-1/2 rounded-full bg-slate-300 transition-transform duration-300 ${
              lever ? 'rotate-[160deg]' : 'group-hover:-rotate-6'
            }`}
          >
            <span className="absolute -top-5 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-rose-600 shadow-lg ring-2 ring-white/40" />
          </span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={pull}
          disabled={phase === 'spinning' || phase === 'saving'}
          className="btn-primary px-8 py-4 text-lg font-bold disabled:opacity-60"
        >
          {picks.length ? 'Pull again' : 'Pull the crank'}
        </button>
      </div>

      {/* Results */}
      {picks.length > 0 && phase !== 'done' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <h2 id="crank-results" className="scroll-mt-4 text-center text-2xl font-bold text-navy-950">Your {picks.length} free contests</h2>
          <p className="mt-1 text-center text-sm text-slate-600">
            First time is free. We fill in the entry forms for you.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {picks.map((p, i) => (
              <li
                key={p.id}
                className="crank-pop flex items-center gap-3 rounded-xl border border-navy-950/10 bg-white px-3 py-2.5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-2xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-950">{p.prize}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {p.host}
                    {p.closesInDays != null ? ` · closes in ${p.closesInDays}d` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Claim form + upgrade nudge */}
          <div ref={formRef} className="mt-8 rounded-3xl border border-navy-950/10 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold text-navy-950">Claim your free entries</h3>
            <p className="mb-4 text-sm text-slate-600">Just what the entry forms ask for.</p>
            <form onSubmit={claim} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={form.name} onChange={(v) => set('name', v)} auto="name" />
                <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} auto="email" />
                <Field label="City" value={form.city} onChange={(v) => set('city', v)} auto="address-level2" />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-navy-950">
                    Province
                    <select
                      value={form.province}
                      onChange={(e) => set('province', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-navy-950">
                    Age
                    <select
                      value={form.age_band}
                      onChange={(e) => set('age_band', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      {['18-24', '25-34', '35-44', '45-54', '55+'].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Want more chances?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <PlanCard
                    active={plan === 'free'}
                    onClick={() => setPlan('free')}
                    title="Free"
                    price="$0"
                    body={`These ${picks.length} contests, once.`}
                  />
                  <PlanCard
                    active={plan === 'once'}
                    onClick={() => setPlan('once')}
                    title="All in"
                    price="$9"
                    body={`Every open contest we can enter, about ${allCount}.`}
                    badge="Most picked"
                  />
                  <PlanCard
                    active={plan === 'year_round'}
                    onClick={() => setPlan('year_round')}
                    title="Year-round"
                    price="$19.99/mo"
                    body="We keep entering you as new ones open."
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  WePrize can enter these free contests in my name and email me about them. Contests stay free; paid
                  plans pay for our time, not better odds. Unsubscribe anytime.
                </span>
              </label>

              {err ? <p className="text-sm text-rose-600">{err}</p> : null}

              <button
                type="submit"
                disabled={phase === 'saving'}
                className="btn-primary w-full py-4 text-base font-bold disabled:opacity-60"
              >
                {phase === 'saving'
                  ? 'Saving…'
                  : plan === 'free'
                    ? `Enter me in ${picks.length} free`
                    : plan === 'once'
                      ? `Enter me in all ${allCount} · $9`
                      : 'Start year-round · $19.99/mo'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-teal-600/30 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <h2 className="mt-2 text-2xl font-bold text-navy-950">
            {already ? 'Your free round is already claimed' : "You're in"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {already
              ? 'The free first round is one per person. Want us to keep going?'
              : `We'll enter you in your ${picks.length} free contests and email ${form.email} when they're done.`}
          </p>
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => upgrade('once')} className="btn-primary py-3 text-sm font-bold">
              Add all {allCount} open contests · $9
            </button>
            <button
              type="button"
              onClick={() => upgrade('year_round')}
              className="btn-ghost py-3 text-sm font-semibold text-navy-950"
            >
              Keep me entered all year · $19.99/mo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  auto?: string
}) {
  return (
    <label className="block text-xs font-medium text-navy-950">
      {props.label}
      <input
        type={props.type || 'text'}
        value={props.value}
        autoComplete={props.auto}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </label>
  )
}

function PlanCard(props: {
  active: boolean
  onClick: () => void
  title: string
  price: string
  body: string
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`relative rounded-2xl border p-3 text-left transition ${
        props.active ? 'border-teal-600 bg-teal-600/5 ring-2 ring-teal-600/30' : 'border-slate-200 hover:border-teal-500'
      }`}
    >
      {props.badge ? (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-navy-950">
          {props.badge}
        </span>
      ) : null}
      <span className="block text-xs font-semibold text-slate-500">{props.title}</span>
      <span className="block text-xl font-extrabold text-navy-950 tabular">{props.price}</span>
      <span className="mt-1 block text-xs leading-snug text-slate-600">{props.body}</span>
    </button>
  )
}
