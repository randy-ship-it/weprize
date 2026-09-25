import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import brands from '../data/brandReel.json'
import contests from '../data/contests.json'
import type { Contest } from '../types/contest'

type Brand = {
  name: string
  logo: string
  logoAlt: string
  eyebrow: string
  prize: string
  contest: string
  slug: string
}

const LOOP_MS = 3200

export function BrandReel() {
  const items = useMemo(() => {
    const valid = new Set((contests as Contest[]).map((c) => c.slug))
    return (brands as Brand[]).filter((b) => valid.has(b.slug))
  }, [])

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const active = items[index] ?? items[0]

  useEffect(() => {
    if (paused || items.length < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, LOOP_MS)
    return () => window.clearInterval(id)
  }, [paused, items.length])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setPaused(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (index >= items.length) setIndex(0)
  }, [index, items.length])

  if (!active) return null

  const slideHref = `/contests/${active.slug}`

  return (
    <section className="brand-reel" aria-label="Featured brands in contest listings">
      <div className="brand-reel-shell">
        <div className="brand-reel-header">
          <div>
            <p className="section-kicker mb-1">Brand rotation</p>
            <p className="brand-reel-heading">Real brands. Real prizes. Free contests.</p>
          </div>
          <button
            type="button"
            className="reel-motion-toggle"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? 'Play brand carousel' : 'Pause brand carousel'}
          >
            <span className={`reel-motion-mark${paused ? ' is-paused' : ''}`} aria-hidden />
            {paused ? 'Play' : 'Pause'}
          </button>
        </div>

        <div className="brand-reel-stage bg-white">
          <Link to={slideHref} className="reel-content block no-underline text-inherit hover:opacity-95 transition">
            <div className="reel-logo-frame">
              <img
                key={active.logo}
                src={active.logo}
                alt={active.logoAlt}
                className="reel-logo"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="reel-copy">
              <p className="reel-eyebrow">{active.eyebrow}</p>
              <h2>{active.prize}</h2>
              <p>{active.contest}</p>
              <span className="reel-detail-link">
                See contest <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
          <div className="reel-progress" aria-hidden>
            <span className={paused ? 'is-paused' : undefined} key={`${active.slug}-${paused}`} />
          </div>
        </div>

        <div className="reel-brand-selectors" role="tablist" aria-label="Brand selectors">
          {items.map((b, i) => (
            <button
              key={b.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`reel-brand-selector${i === index ? ' is-selected' : ''}`}
              onClick={() => setIndex(i)}
            >
              <img src={b.logo} alt="" />
              <span>{b.name}</span>
            </button>
          ))}
        </div>

        {/* continuous white logo strip under the stage */}
        <div className="brand-marquee" aria-hidden>
          <div className={`brand-marquee-track${paused ? ' is-paused' : ''}`}>
            {[...items, ...items].map((b, i) => (
              <div key={`${b.slug}-${i}`} className="brand-marquee-item">
                <img src={b.logo} alt="" />
              </div>
            ))}
          </div>
        </div>

        <p className="brand-reel-disclaimer">
          Brand marks identify contests listed on WePrize. Not affiliated with or endorsed by those brands unless stated
          on the contest page. Estimates only.
        </p>
      </div>
    </section>
  )
}
