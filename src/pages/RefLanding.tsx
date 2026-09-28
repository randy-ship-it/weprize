import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { setRefFromCode } from '../lib/shareRef'

/** /r/:code — set attribution cookie, show co-brand, send to pricing. */
export function RefLanding() {
  const { code } = useParams()
  const nav = useNavigate()
  const [brand, setBrand] = useState<{ logo_url?: string | null; brand_name?: string | null } | null>(null)

  useEffect(() => {
    if (!code) return
    setRefFromCode(code)
    fetch(`/api/qr/resolve/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setBrand(d)
        // Soft delay so co-brand paints, then go pricing
        const t = window.setTimeout(() => nav('/pricing?ref=' + encodeURIComponent(code), { replace: true }), 900)
        return () => window.clearTimeout(t)
      })
      .catch(() => nav('/', { replace: true }))
  }, [code, nav])

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center text-center gap-4">
      <div className="flex items-center gap-4">
        {brand?.logo_url && (
          <img src={brand.logo_url} alt={brand.brand_name || 'Partner'} className="h-12 w-auto object-contain" />
        )}
        <span className="text-2xl font-bold text-navy-950">WePrize</span>
      </div>
      {brand?.brand_name && (
        <p className="text-slate-600">
          Brought to you with <strong>{brand.brand_name}</strong>
        </p>
      )}
      <p className="text-sm text-slate-500">Saving your code · taking you to pricing…</p>
      <Link to="/pricing" className="text-teal-600 text-sm underline">
        Continue now
      </Link>
    </div>
  )
}
