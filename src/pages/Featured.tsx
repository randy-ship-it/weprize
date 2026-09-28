import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type Feat = {
  brand_name: string
  slug: string
  prize_blurb: string
  image_url?: string
  cta_label?: string
  cta_url?: string
  approved?: boolean
}

export function Featured() {
  const { slug } = useParams()
  const [row, setRow] = useState<Feat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/partners/featured/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'not_found')
        setRow(d)
      })
      .catch((e) => setErr(e.message))
  }, [slug])

  if (err) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 mb-3">{err === 'not_found' || err === 'not_approved' ? 'Not available yet.' : err}</p>
        <Link to="/partners" className="text-teal-600 underline text-sm">
          Partner with WePrize
        </Link>
      </div>
    )
  }
  if (!row) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-xl mx-auto card-surface rounded-3xl p-8 text-center space-y-4">
      {row.image_url && <img src={row.image_url} alt="" className="mx-auto max-h-48 rounded-2xl object-contain" />}
      <p className="section-kicker">{row.brand_name}</p>
      <h1 className="text-2xl font-bold text-navy-950">Featured with WePrize</h1>
      <p className="text-slate-600">{row.prize_blurb}</p>
      {row.cta_url && (
        <a href={row.cta_url} className="btn-primary inline-flex px-5 py-2.5 text-sm" rel="noopener noreferrer">
          {row.cta_label || 'Learn more'}
        </a>
      )}
      <p className="text-xs text-slate-400">WePrize featured landing · not the open contest book</p>
    </div>
  )
}
