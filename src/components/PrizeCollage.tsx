import { useCallback, useState } from 'react'
import prizes from '../data/prizeCollage.json'

type PrizeItem = {
  id: string
  src: string
  alt: string
  label: string
  aspect: 'square' | 'portrait'
}

const items = prizes as PrizeItem[]

async function sharePrize(item: PrizeItem) {
  const url = new URL(item.src, window.location.origin).href
  const shareData = {
    title: 'WePrize',
    text: `${item.label} on WePrize`,
    url: window.location.origin + '/',
  }
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(shareData)
      return 'shared'
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(`${item.label} · WePrize\n${url}\n${shareData.url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function PrizeCollage() {
  const [toast, setToast] = useState<string | null>(null)

  const onShare = useCallback(async (item: PrizeItem) => {
    const result = await sharePrize(item)
    if (result === 'shared') setToast('Shared')
    else if (result === 'copied') setToast('Link copied')
    else if (result === 'failed') setToast('Could not share')
    else setToast(null)
    if (result !== 'cancelled' && result !== null) {
      window.setTimeout(() => setToast(null), 2200)
    }
  }, [])

  return (
    <section className="relative" aria-labelledby="prize-collage-heading">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <p className="section-kicker mb-1">WePrize prizes</p>
          <h2 id="prize-collage-heading" className="text-xl sm:text-2xl font-semibold text-navy-950">
            What you could win
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md leading-relaxed">
            Cars, cash, travel, tickets, gadgets, wellness, and more. Free contests. Estimates only.
          </p>
        </div>
        {toast ? (
          <p className="text-xs font-medium text-teal-600" role="status">
            {toast}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {items.map((item) => (
          <figure
            key={item.id}
            className={`group relative rounded-2xl overflow-hidden bg-navy-950/5 ${
              item.aspect === 'square' ? 'aspect-square' : 'aspect-[4/5]'
            }`}
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-navy-950/85 via-navy-950/40 to-transparent"
              aria-hidden
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 sm:p-3">
              <span className="text-[11px] sm:text-xs font-semibold text-white leading-snug drop-shadow-sm">
                {item.label}
              </span>
              <button
                type="button"
                onClick={() => onShare(item)}
                className="pointer-events-auto shrink-0 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors"
                aria-label={`Share ${item.label}`}
              >
                Share
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
