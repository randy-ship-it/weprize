import { useState } from 'react'
import { shareOrCopy, type ShareResult } from '../lib/shareRef'

type Props = {
  label?: string
  className?: string
  /** Longer label for Success post-pay CTA */
  variant?: 'ghost' | 'next'
}

export function ShareButton({
  label = 'Share WePrize',
  className = '',
  variant = 'ghost',
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
      {status === 'copied' ? (
        <span className="text-xs text-teal-700">Link copied</span>
      ) : status === 'shared' ? (
        <span className="text-xs text-teal-700">Thanks for sharing</span>
      ) : status === 'failed' ? (
        <span className="text-xs text-slate-500">Couldn’t share — copy from the address bar</span>
      ) : null}
    </span>
  )
}
