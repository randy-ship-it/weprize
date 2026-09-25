import { Link } from 'react-router-dom'
import type { Exclusive } from '../types/contest'
import { EstimateChip } from './EstimateChip'
import { addExclusivesWaitlistEmail, getExclusivesWaitlist } from '../lib/waitlist'
import { useState } from 'react'

const STATUS: Record<Exclusive['status'], string> = {
  preview: 'Preview',
  coming: 'Coming',
  live: 'Live',
}

export function ExclusiveCard({
  exclusive,
  featured = false,
}: {
  exclusive: Exclusive
  featured?: boolean
}) {
  const [msg, setMsg] = useState('')
  const [count, setCount] = useState(getExclusivesWaitlist().length)

  function notify() {
    const email = window.prompt('Email for exclusives notify (stored locally only)')
    if (!email) return
    const res = addExclusivesWaitlistEmail(email)
    setMsg(res.message)
    setCount(res.count)
  }

  return (
    <article
      className={`exclusive-accent card-surface rounded-2xl p-5 sm:p-6 ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex rounded-full border border-soft-gold/50 bg-soft-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-800">
          Exclusive · Scale Health
        </span>
        <span className="rounded-full bg-navy-950/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-navy-800">
          {STATUS[exclusive.status]}
        </span>
        <EstimateChip label="EXAMPLE" />
        {featured ? <EstimateChip label="FLAGSHIP" /> : null}
      </div>
      <h3 className={`font-semibold text-navy-950 mb-2 ${featured ? 'text-xl sm:text-2xl' : 'text-base'}`}>
        {exclusive.title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">{exclusive.summary}</p>
      <p className="text-sm font-medium text-navy-950 mb-3">{exclusive.prize_text}</p>
      {exclusive.arv_cad_estimate != null ? (
        <p className="text-xs text-slate-500 tabular mb-3">
          ESTIMATE ARV ~${exclusive.arv_cad_estimate.toLocaleString('en-CA')} CAD · not a guarantee · not a medical claim
        </p>
      ) : null}
      <ul className="text-xs text-slate-600 space-y-1 mb-4 list-disc pl-4">
        {exclusive.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 items-center">
        {exclusive.contest_slug ? (
          <Link to={`/contests/${exclusive.contest_slug}`} className="btn-primary px-4 py-2 text-sm">
            {exclusive.cta_label || 'Open exclusive'}
          </Link>
        ) : (
          <button type="button" onClick={notify} className="btn-primary px-4 py-2 text-sm">
            {exclusive.cta_label}
          </button>
        )}
        {exclusive.contest_slug ? (
          <button type="button" onClick={notify} className="btn-ghost px-4 py-2 text-sm text-navy-950">
            Notify me
          </button>
        ) : null}
        <a
          href={exclusive.sponsor_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:underline"
        >
          {exclusive.sponsor} · scalehealth.ca
        </a>
      </div>
      {msg ? (
        <p className="text-xs text-slate-500 mt-2">
          {msg} · {count} on notify list
        </p>
      ) : null}
    </article>
  )
}
