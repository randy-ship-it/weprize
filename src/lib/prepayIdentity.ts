/** Soft pre-checkout identity hint (email + name). Full address stays post-pay. */

export type PrepayIdentity = {
  email: string
  legal_name: string
  saved_at: string
}

const KEY = 'weprize_prepay_identity'

export function loadPrepayIdentity(): PrepayIdentity | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PrepayIdentity
    if (!parsed?.email || !String(parsed.email).includes('@')) return null
    return parsed
  } catch {
    return null
  }
}

export function savePrepayIdentity(email: string, legalName: string): PrepayIdentity {
  const row: PrepayIdentity = {
    email: String(email).trim().toLowerCase(),
    legal_name: String(legalName).trim(),
    saved_at: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(row))
  return row
}

export function clearPrepayIdentity(): void {
  localStorage.removeItem(KEY)
}
