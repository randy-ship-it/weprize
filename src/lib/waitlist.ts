const KEY = 'weprize_waitlist'
const EX_KEY = 'weprize_exclusives_waitlist'
const LEGACY_KEY = 'wecontest_waitlist'
const LEGACY_EX_KEY = 'wecontest_exclusives_waitlist'

function migrate(newKey: string, legacyKey: string) {
  try {
    if (localStorage.getItem(newKey)) return
    const legacy = localStorage.getItem(legacyKey)
    if (legacy) {
      localStorage.setItem(newKey, legacy)
      localStorage.removeItem(legacyKey)
    }
  } catch {
    /* ignore */
  }
}

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, emails: string[]) {
  localStorage.setItem(key, JSON.stringify(emails))
}

export function getWaitlistEmails(): string[] {
  migrate(KEY, LEGACY_KEY)
  return read(KEY)
}

export function addWaitlistEmail(email: string): { ok: boolean; count: number; message: string } {
  const clean = email.trim().toLowerCase()
  if (!clean || !clean.includes('@')) {
    return { ok: false, count: getWaitlistEmails().length, message: 'Enter a valid email.' }
  }
  const list = getWaitlistEmails()
  if (list.includes(clean)) {
    return { ok: true, count: list.length, message: 'You are already on the waitlist.' }
  }
  list.push(clean)
  write(KEY, list)
  return { ok: true, count: list.length, message: 'Added to the WePrize waitlist (local only).' }
}

export function getExclusivesWaitlist(): string[] {
  migrate(EX_KEY, LEGACY_EX_KEY)
  return read(EX_KEY)
}

export function addExclusivesWaitlistEmail(email: string): { ok: boolean; count: number; message: string } {
  const clean = email.trim().toLowerCase()
  if (!clean || !clean.includes('@')) {
    return { ok: false, count: getExclusivesWaitlist().length, message: 'Enter a valid email.' }
  }
  const list = getExclusivesWaitlist()
  if (list.includes(clean)) {
    return { ok: true, count: list.length, message: 'Already on the exclusives notify list.' }
  }
  list.push(clean)
  write(EX_KEY, list)
  return { ok: true, count: list.length, message: 'We will notify you when exclusives go live (local only).' }
}
