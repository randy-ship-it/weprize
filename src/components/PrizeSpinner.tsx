import { useMemo, useState } from 'react'

/** Gamified prize-category spinner — NO contest URLs, NO entry mechanics. */
const REELS = [
  ['Recovery gear', 'Sleep upgrades', 'Nutrition kits', 'Fitness prizes', 'Wellness weekends'],
  ['Vitamins & more', 'Massage gear', 'Hydration kits', 'Yoga escapes', 'Skincare hauls'],
  ['Canada pool', 'Brand drops', 'Seasonal heat', 'Local exclusives', 'Mystery stack'],
]

type Props = { liveCount: number }

export function PrizeSpinner({ liveCount }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string[] | null>(null)
  const [ticks, setTicks] = useState([0, 1, 2])

  const vibe = useMemo(() => {
    if (!result) return null
    return `${result[0]} · ${result[1]} · ${result[2]}`
  }, [result])

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    let n = 0
    const id = window.setInterval(() => {
      setTicks([
        Math.floor(Math.random() * REELS[0].length),
        Math.floor(Math.random() * REELS[1].length),
        Math.floor(Math.random() * REELS[2].length),
      ])
      n++
      if (n > 14) {
        window.clearInterval(id)
        const final = [
          REELS[0][Math.floor(Math.random() * REELS[0].length)],
          REELS[1][Math.floor(Math.random() * REELS[1].length)],
          REELS[2][Math.floor(Math.random() * REELS[2].length)],
        ]
        setResult(final)
        setTicks([
          REELS[0].indexOf(final[0]),
          REELS[1].indexOf(final[1]),
          REELS[2].indexOf(final[2]),
        ])
        setSpinning(false)
      }
    }, 80)
  }

  return (
    <div className="card-surface rounded-3xl p-6 border border-teal-600/20 shadow-lg shadow-teal-900/5">
      <p className="section-kicker mb-2">Prize pool · spin it</p>
      <h2 className="text-xl font-bold text-navy-950 mb-1">What could drop this week?</h2>
      <p className="text-sm text-slate-600 mb-4">
        <span className="tabular font-semibold text-teal-700">{liveCount}</span> live contests in the Canada-first pool.
        Spin for vibes — details stay inside WePrize assist.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {REELS.map((reel, i) => (
          <div
            key={i}
            className={`rounded-2xl bg-navy-950 text-white text-center py-6 px-2 min-h-[5.5rem] flex items-center justify-center transition ${
              spinning ? 'animate-pulse' : ''
            }`}
          >
            <span className="text-sm font-semibold leading-snug">{reel[ticks[i]]}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="btn-primary w-full py-3 text-sm disabled:opacity-60"
      >
        {spinning ? 'Spinning…' : 'Pull the lever'}
      </button>
      {vibe && (
        <p className="mt-3 text-sm text-slate-700 text-center">
          Tonight&apos;s vibe: <span className="font-semibold text-navy-950">{vibe}</span>
        </p>
      )}
      <p className="mt-3 text-[11px] text-slate-500 text-center">
        Estimates aren&apos;t a guarantee. Contests stay free on brand sites — we don&apos;t publish the book.
      </p>
    </div>
  )
}
