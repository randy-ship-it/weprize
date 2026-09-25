import { useState } from 'react'
import { shareOrCopy, type ShareResult } from '../lib/shareRef'

type Props = {
  label?: string
  className?: string
  /** Longer label for Success post-pay CTA */
  variant?: 'ghost' | 'next'
  /** Show a short alluring hint under the button (Home) */
  hint?: boolean
}

export function ShareButton({
  label = 'Share your WePrize link',
  className = '',
  variant = 'ghost',
  hint = false,
}: Props) {
  const [status, setStatus] = useState<ShareResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (busy) return
    setBusy(true)
    setStatus(null)
    const result = await shareOrCopy()
    setStatus(result)
    setBusy(false)
    if (result === 'copied' || result === 'shared') {
      window.setTimeout(() => setStatus(null), 2200)
    }
  }

  const base =
    variant === 'next'
      ? 'btn-ghost inline-flex w-full justify-center px-6 py-3 text-sm text-navy-950 sm:w-auto'
      : 'btn-ghost px-5 py-2.5 text-sm text-navy-950'

  return (
    <span className="inline-flex flex-col items-stretch gap-1 sm:items-start">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className={`${base} ${className}`.trim()}
        aria-live="polite"
      >
        {busy ? 'Sharing…' : label}
      </button>
      {hint && !status ? (
        <span className="max-w-xs text-[11px] leading-snug text-slate-500">
          Free contests · optional assist · peer link only — no cash rewards that break the rules.
        </span>
      ) : null}
      {status === 'copied' ? (
        <span className="text-xs text-teal-700">Link copied — send it to a friend</span>
      ) : status === 'shared' ? (
        <span className="text-xs text-teal-700">Thanks — you just shortened someone else’s form queue</span>
      ) : status === 'failed' ? (
        <span className="text-xs text-slate-500">Couldn’t share — copy from the address bar</span>
      ) : null}
    </span>
  )
}
