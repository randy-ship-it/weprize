export function EstimateChip({ label = 'ESTIMATE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-teal-500/35 bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-500">
      {label}
    </span>
  )
}
