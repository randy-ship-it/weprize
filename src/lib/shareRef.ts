/** Peer / QR attribution — /r/{code} + weprize_ref, Competition Act–safe share copy. */

const REF_KEY = 'weprize_ref'
const INBOUND_KEY = 'weprize_inbound_ref'
const OWN_KEY = 'weprize_share_code'
const ORIGIN = 'https://weprize.net'

const CODE_RE = /^[a-z0-9]{6,16}$/

function randomSlug(len = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

function normalizeRef(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16)
}

/** Stable visitor share code in localStorage. */
export function getOrCreateShareCode(): string {
  try {
    const existing = localStorage.getItem(OWN_KEY)
    if (existing && CODE_RE.test(existing)) return existing
    const code = randomSlug(8)
    localStorage.setItem(OWN_KEY, code)
    return code
  } catch {
    return randomSlug(8)
  }
}

/**
 * First-touch inbound ?ref= → weprize_ref + weprize_inbound_ref (+ cookie).
 */
export function captureInboundRef(
  search = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  if (typeof window === 'undefined' && !search) return null
  try {
    const params = new URLSearchParams(search)
    const ref = normalizeRef(params.get('ref') || '')
    if (!ref || !CODE_RE.test(ref)) return getInboundRef()
    const existing = localStorage.getItem(REF_KEY) || localStorage.getItem(INBOUND_KEY)
    if (existing && CODE_RE.test(existing)) return existing
    localStorage.setItem(REF_KEY, ref)
    localStorage.setItem(INBOUND_KEY, ref)
    document.cookie = `weprize_ref=${ref};path=/;max-age=31536000;SameSite=Lax`
    return ref
  } catch {
    return null
  }
}

/** First-touch set from /r/:code landing. */
export function setRefFromCode(code: string) {
  const ref = normalizeRef(code)
  if (!ref) return
  try {
    if (!localStorage.getItem(REF_KEY) && !localStorage.getItem(INBOUND_KEY)) {
      localStorage.setItem(REF_KEY, ref)
      localStorage.setItem(INBOUND_KEY, ref)
      document.cookie = `weprize_ref=${ref};path=/;max-age=31536000;SameSite=Lax`
    }
  } catch {
    /* ignore */
  }
}

export function getInboundRef(): string | null {
  try {
    const v = localStorage.getItem(REF_KEY) || localStorage.getItem(INBOUND_KEY)
    return v && CODE_RE.test(v) ? v : null
  } catch {
    return null
  }
}

export function buildShareUrl(code?: string): string {
  const c = code && CODE_RE.test(code) ? code : getOrCreateShareCode()
  const base = typeof window !== 'undefined' ? window.location.origin : ORIGIN
  return `${base}/r/${c}`
}

/** Append client_reference_id for QR/peer attribution on a Payment Link URL. */
export function paymentLinkWithRef(baseUrl: string, ref?: string | null): string {
  const r = ref || getInboundRef()
  if (!r) return baseUrl
  const u = new URL(baseUrl)
  u.searchParams.set('client_reference_id', r)
  u.searchParams.set('utm_source', 'peer')
  u.searchParams.set('utm_medium', 'qr')
  u.searchParams.set('utm_content', r)
  return u.toString()
}

export const JINGLE_SHARE = [
  'Scan it. Share it. Cash it.',
  'Your code. Their buy. Your cut.',
  'Stick it. Scan it. Stack it.',
  'Print free. Get paid forever.',
  'Half the sale. All the hustle.',
]

/** Competition Act–safe: free contests + optional time-assist; no win/odds promises. */
export function SHARE_TEXT(url?: string): string {
  const link = url || buildShareUrl()
  return `Skip the busywork: WePrize browses free Canada-first health & wellness contests and can apply for you (optional assist). Estimates aren't a guarantee — contests stay free. ${link}`
}

export function shareText(url: string): string {
  const j = JINGLE_SHARE[Math.floor(Math.random() * JINGLE_SHARE.length)]
  return `WePrize — free Canada-first health & wellness contests. Optional time-assist packs. Estimates aren't a guarantee. ${j} ${url}`
}

export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareOrCopy(
  optsOrUrl?:
    | string
    | {
        title?: string
        text?: string
        url?: string
      },
): Promise<ShareResult> {
  const opts =
    typeof optsOrUrl === 'string'
      ? { url: optsOrUrl, text: shareText(optsOrUrl) }
      : optsOrUrl || {}
  const url = opts.url || buildShareUrl()
  const title = opts.title || 'WePrize'
  const text = opts.text || SHARE_TEXT(url)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url })
      return 'shared'
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}`)
      return 'copied'
    }
  } catch {
    /* fall through */
  }
  return 'failed'
}
