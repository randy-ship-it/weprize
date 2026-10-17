import { useState } from 'react'
import { getOrCreateShareCode } from '../lib/shareRef'

type Props = { path?: string; text?: string; campaign?: string; refCode?: string | null }

/** One-tap share: native sheet on mobile, link row on desktop. Adds source=share + utm + ref. */
export function shareLink(path = '/', campaign = 'home', refCode?: string | null) {
  const u = new URL(path, 'https://weprize.net')
  u.searchParams.set('source', 'share')
  u.searchParams.set('utm_source', 'share')
  u.searchParams.set('utm_medium', 'friend')
  u.searchParams.set('utm_campaign', campaign)
  const ref = (refCode || getOrCreateShareCode() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ref) u.searchParams.set('ref', ref)
  return u.toString()
}

export default function ShareBar({ path = '/', text = 'Free Canadian contests, all in one place, and zero spam. Have a look:', campaign = 'home', refCode }: Props) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const url = shareLink(path, campaign, refCode)
  const enc = encodeURIComponent
  const msg = `${text} ${url}`
  const touch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const share = async () => {
    if (touch && navigator.share) {
      try { await navigator.share({ title: 'WePrize', text, url }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
    }
    setOpen((o) => !o)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {
      const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setToast(true); setTimeout(() => setToast(false), 1600)
  }
  const links: [string, string][] = [
    ['Text', `sms:?&body=${enc(msg)}`],
    ['WhatsApp', `https://wa.me/?text=${enc(msg)}`],
    ['X', `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ['Email', `mailto:?subject=${enc('Thought you would like this')}&body=${enc(msg)}`],
  ]
  const chip = 'rounded-full border border-navy-950/15 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 hover:border-teal-600 hover:text-teal-700'
  return (
    <div className="mt-5 text-center" data-share>
      <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
        <ShareIcon /> Share with a friend
      </button>
      {open && (
        <div className="mt-3 flex flex-wrap justify-center gap-2" data-share-row>
          <button type="button" onClick={copy} className={chip}>Copy link</button>
          {links.map(([l, h]) => <a key={l} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={chip}>{l}</a>)}
        </div>
      )}
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">Copied</div>}
      {touch && (
        <button type="button" aria-label="Share WePrize" onClick={share} className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-teal-600 text-white shadow-lg sm:hidden">
          <ShareIcon />
        </button>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v13" /><path d="M7 8l5-5 5 5" />
    </svg>
  )
}
