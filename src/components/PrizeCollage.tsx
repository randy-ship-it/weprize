import prizes from '../data/prizeCollage.json'

type PrizeItem = {
  id: string
  src: string
  alt: string
  label: string
  aspect: 'square' | 'portrait'
}

const items = prizes as PrizeItem[]

export function PrizeCollage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <figure key={item.id} className="card-surface rounded-2xl overflow-hidden bg-white">
          <div
            className={`bg-white ${item.aspect === 'square' ? 'aspect-square' : 'aspect-[4/5]'}`}
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <figcaption className="border-t border-navy-950/10 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-navy-950">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">Illustrative only · not a live contest</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
