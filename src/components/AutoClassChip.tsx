import type { AutoClass } from '../types/contest'

const STYLES: Record<AutoClass, string> = {
  AUTO_OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ASSIST_QUEUE: 'bg-teal-50 text-teal-800 border-teal-200',
  NEEDS_YOU: 'bg-amber-50 text-amber-800 border-amber-200',
  HUMAN_ONLY: 'bg-slate-100 text-slate-700 border-slate-200',
  SKIP: 'bg-slate-100 text-slate-500 border-slate-200',
  BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function AutoClassChip({ value }: { value: AutoClass }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${STYLES[value]}`}>
      {value.replace('_', ' ')}
    </span>
  )
}
