import type { ApplyStatus } from '../types/assist'
import { APPLY_STATUS_LABELS } from '../types/assist'

const styles: Record<ApplyStatus, string> = {
  queued: 'bg-slate-100 text-slate-700 ring-slate-200',
  applying: 'bg-teal-50 text-teal-800 ring-teal-200',
  applied: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  confirm_sent: 'bg-amber-50 text-amber-900 ring-amber-200',
  needs_you: 'bg-rose-50 text-rose-800 ring-rose-200',
  confirmed: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  failed: 'bg-slate-100 text-slate-500 ring-slate-200',
}

const dots: Record<ApplyStatus, string> = {
  queued: 'bg-slate-400',
  applying: 'bg-teal-500 animate-pulse',
  applied: 'bg-emerald-500',
  confirm_sent: 'bg-amber-500',
  needs_you: 'bg-rose-500',
  confirmed: 'bg-emerald-600',
  failed: 'bg-slate-400',
}

type Props = { status: ApplyStatus; className?: string }

export function StatusChip({ status, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${styles[status]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} aria-hidden />
      {APPLY_STATUS_LABELS[status]}
    </span>
  )
}
