/** Peer share codes + inbound ?ref= (no rewards). Competition Act–safe copy only. */

const SHARE_CODE_KEY = 'weprize_share_code'
const INBOUND_REF_KEY = 'weprize_inbound_ref'
const ORIGIN = 'https://weprize.net'

const CODE_RE = /^[a-z0-9]{6,8}$/

function randomSlug(len = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

/** Stable visitor share code in localStorage ([a-z0-9]{6–8}). */
export function getOrCreateShareCode(): string {
  try {
    const existing = localStorage.getItem(SHARE_CODE_KEY)
    if (existing && CODE_RE.test(existing)) return existing
    const code = randomSlug(8)
    localStorage.setItem(SHARE_CODE_KEY, code)
    return code
  } catch {
    return randomSlug(8)
  }
}

/**
 * First-touch inbound ?ref= → weprize_inbound_ref.
 * Does not overwrite own share code. Prefer keep URL on first paint.
 */
export function captureInboundRef(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('ref') || '').trim().toLowerCase()
    if (!CODE_RE.test(raw)) return getInboundRef()
    const existing = localStorage.getItem(INBOUND_REF_KEY)
    if (existing && CODE_RE.test(existing)) return existing
    localStorage.setItem(INBOUND_REF_KEY, raw)
    return raw
  } catch {
    return null
  }
}

export function getInboundRef(): string | null {
  try {
    const v = localStorage.getItem(INBOUND_REF_KEY)
    return v && CODE_RE.test(v) ? v : null
  } catch {
    return null
  }
}

export function buildShareUrl(code?: string): string {
  const c = code && CODE_RE.test(code) ? code : getOrCreateShareCode()
  return `${ORIGIN}/?ref=${c}`
}

/** Competition Act–safe: free contests + optional time-assist; no win/odds promises. */
export function SHARE_TEXT(url?: string): string {
  const link = url || buildShareUrl()
  return `WePrize — free Canada-first health & wellness contests. Optional time-assist packs if you want us to apply for you. Estimates aren’t a guarantee. ${link}`
}

export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareOrCopy(opts?: {
  title?: string
  text?: string
  url?: string
}): Promise<ShareResult> {
  const url = opts?.url || buildShareUrl()
  const title = opts?.title || 'WePrize'
  const text = opts?.text || SHARE_TEXT(url)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url })
      return 'shared'
    }
  } catch (err) {
    // User cancel → treat as failed without clipboard noise
    if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
  }

  try {
    const payload = `${text}`
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
      return 'copied'
    }
  } catch {
    /* fall through */
  }
  return 'failed'
}
