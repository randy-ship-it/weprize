import type { Apply } from '../types/assist'
import { StatusChip } from './StatusChip'

type Props = {
  apply: Apply
  onDone?: (id: string) => void
  busy?: boolean
}

export function NeedsYouCard({ apply, onDone, busy }: Props) {
  return (
    <article className="card-surface rounded-2xl p-5 border-l-4 border-l-rose-500 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 100% 0%, #e11d48, transparent 55%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-kicker mb-1">Action needed</p>
          <h3 className="font-semibold text-navy-950 text-base leading-snug">{apply.contestName}</h3>
          {apply.prizeText ? (
            <p className="text-sm text-slate-500 mt-1">{apply.prizeText}</p>
          ) : null}
        </div>
        <StatusChip status={apply.status} />
      </div>
      <p className="relative mt-3 text-sm text-slate-700 leading-relaxed">
        {apply.nextStep ??
          'A code or confirm link was sent to your email or phone. Complete it on the brand site, then mark done here.'}
      </p>
      {apply.actionHint ? (
        <p className="relative mt-2 text-xs font-medium text-teal-700">{apply.actionHint}</p>
      ) : null}
      <div className="relative mt-4 flex flex-wrap gap-2">
        {onDone ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDone(apply.id)}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'I entered the code'}
          </button>
        ) : null}
        <a
          href="mailto:"
          className="btn-ghost px-4 py-2 text-sm text-navy-950"
          onClick={(e) => e.preventDefault()}
          title="Open your mail app on your device"
        >
          Check email
        </a>
      </div>
    </article>
  )
}
