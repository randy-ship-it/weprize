import type { ReactNode } from 'react'
import type { Contest } from '../types/contest'
import { ContestCard } from './ContestCard'
import { BirchAdSlot } from './BirchAdSlot'

export function ContestGrid({
  contests,
  insertBetweenAds = false,
}: {
  contests: Contest[]
  insertBetweenAds?: boolean
}) {
  if (!contests.length) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-950/20 bg-white/80 p-10 text-center">
        <p className="text-navy-950 font-semibold mb-1">No contests match</p>
        <p className="text-sm text-slate-600">
          Try clearing high-friction, Scale exclusive, or province filters. The free board always has more when filters relax.
        </p>
      </div>
    )
  }

  const nodes: ReactNode[] = []
  contests.forEach((c, i) => {
    nodes.push(<ContestCard key={c.id} contest={c} />)
    if (insertBetweenAds && (i + 1) % 6 === 0 && i !== contests.length - 1) {
      nodes.push(
        <div key={`ad-${i}`} className="lg:hidden sm:col-span-2">
          <BirchAdSlot slotId="feed_between_cards" />
        </div>,
      )
    }
  })

  return <div className="grid gap-4 sm:grid-cols-2">{nodes}</div>
}
