import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DisclaimerStrip } from '../components/DisclaimerStrip'
import { createOrder } from '../lib/api'
import { isPackId, PACK_LABELS, type PackId } from '../types/assist'
import { useContests } from '../hooks/useContests'

export function Success() {
  const [params] = useSearchParams()
  const { autoOkCount } = useContests()
  const packParam = params.get('pack')
  const pack: PackId | null = isPackId(packParam) ? packParam : null
  const meta = pack ? PACK_LABELS[pack] : null

  useEffect(() => {
    if (!pack) return
    void createOrder({ pack, autoOkPrinted: autoOkCount || 42 })
  }, [pack, autoOkCount])

  const steps = useMemo(
    () => [
      { n: '1', title: 'Payment received', body: 'Your assist pack is unlocked.' },
      { n: '2', title: 'Share your identity', body: 'Legal name, email, and mailing address you own.' },
      { n: '3', title: 'We apply · you tap codes', body: 'AUTO_OK forms only. OTP stays with you.' },
    ],
    [],
  )

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/10 ring-1 ring-teal-600/25">
          <span className="text-2xl text-teal-600" aria-hidden>
            ✓
          </span>
        </div>
        <p className="section-kicker">You’re in</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">
          Payment received
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
          {meta ? (
            <>
              <span className="font-semibold text-navy-950">{meta.name}</span>
              {' · '}
              <span className="tabular">{meta.price}</span>
              {' — '}
              {meta.blurb}
            </>
          ) : (
            <>Thanks. Next, tell us who to apply as so we can start your queue.</>
          )}
        </p>
        {!pack ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 inline-block">
            Missing <code className="font-mono">?pack=</code>. You can still continue — pick a pack on Pricing if this was a mistake.
          </p>
        ) : null}
      </div>

      <div className="card-surface rounded-2xl p-5 sm:p-6 space-y-4">
        <p className="text-sm font-semibold text-navy-950">What happens next</p>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 text-xs font-bold">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-medium text-navy-950">{s.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link
          to={pack ? `/onboarding?pack=${pack}` : '/onboarding'}
          className="btn-primary w-full sm:w-auto inline-flex justify-center px-6 py-3 text-sm"
        >
          Continue to identity
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-navy-950/12 bg-white/60 p-4 space-y-2">
        <p className="text-xs font-semibold text-navy-950 uppercase tracking-wide">Competition Act · plain talk</p>
        <p className="text-xs text-slate-600 leading-relaxed">
          Contests are free. Your fee is for research and time on eligible AUTO_OK entries. Estimates are not a guarantee.
          We cannot influence who wins. You bring your own legal identity — we never invent emails or phones.
        </p>
        <DisclaimerStrip />
      </div>

      <p className="text-center text-xs text-slate-500">
        Already set up?{' '}
        <Link to="/dashboard" className="text-teal-600 hover:underline font-medium">
          Open your dashboard
        </Link>
      </p>
    </div>
  )
}
