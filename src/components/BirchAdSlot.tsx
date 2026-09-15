type SlotId =
  | 'home_hero_strip'
  | 'feed_right_rail'
  | 'feed_between_cards'
  | 'detail_mid'
  | 'pricing_footer'
  | 'exclusives_footer'

const VARIANT: Record<SlotId, { title: string; height: string }> = {
  home_hero_strip: { title: 'Home hero strip', height: 'min-h-[96px]' },
  feed_right_rail: { title: 'Feed right rail', height: 'min-h-[280px]' },
  feed_between_cards: { title: 'Between cards', height: 'min-h-[128px]' },
  detail_mid: { title: 'Detail mid', height: 'min-h-[96px]' },
  pricing_footer: { title: 'Pricing footer', height: 'min-h-[110px]' },
  exclusives_footer: { title: 'Exclusives footer', height: 'min-h-[110px]' },
}

export function BirchAdSlot({ slotId, className = '' }: { slotId: SlotId; className?: string }) {
  const v = VARIANT[slotId]
  return (
    <a
      href="https://birchreserve.net"
      target="_blank"
      rel="noopener noreferrer"
      data-slot={slotId}
      className={`group block w-full ${v.height} ${className} rounded-2xl border border-dashed border-navy-800/30 bg-gradient-to-br from-navy-950/[0.04] via-white to-teal-600/[0.06] p-4 transition hover:border-teal-600/50 hover:shadow-md`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Birch Reserve · {v.title}
        </p>
        <p className="text-sm font-semibold text-navy-950 group-hover:text-teal-600 transition">
          Advertise here
        </p>
        <p className="text-xs text-slate-600">birchreserve.net · private display on WePrize</p>
      </div>
    </a>
  )
}
