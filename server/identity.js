/**
 * BYO identity only. Never invent fields or values.
 * Accepts spec names (legal_name, address1) and Emma UI aliases (fullName, addressLine1).
 */

const REQUIRED = ['legal_name', 'email', 'address1', 'city', 'province', 'postal']

export function normalizeIdentity(body) {
  const src = body && typeof body === 'object' ? body : {}
  const mapped = {
    legal_name: pick(src, ['legal_name', 'fullName', 'full_name']),
    email: pick(src, ['email']),
    address1: pick(src, ['address1', 'addressLine1', 'address_line']),
    city: pick(src, ['city']),
    province: pick(src, ['province']),
    postal: pick(src, ['postal']),
    country: pick(src, ['country']) || 'CA',
    dob: pick(src, ['dob']),
    phone: pick(src, ['phone']),
  }

  const missing = REQUIRED.filter((k) => !String(mapped[k] || '').trim())
  if (missing.length) {
    const err = new Error(`Identity incomplete: ${missing.join(', ')}`)
    err.status = 400
    err.code = 'identity_incomplete'
    err.missing = missing
    throw err
  }

  const email = String(mapped.email).trim().toLowerCase()
  if (!email.includes('@') || email.length < 5) {
    const err = new Error('Identity incomplete: email')
    err.status = 400
    err.code = 'identity_incomplete'
    err.missing = ['email']
    throw err
  }

  return {
    legal_name: String(mapped.legal_name).trim(),
    email,
    address1: String(mapped.address1).trim(),
    city: String(mapped.city).trim(),
    province: String(mapped.province).trim().toUpperCase(),
    postal: String(mapped.postal).trim().toUpperCase(),
    country: String(mapped.country || 'CA').trim().toUpperCase().slice(0, 2) || 'CA',
    dob: mapped.dob ? String(mapped.dob).trim() : null,
    phone: mapped.phone ? String(mapped.phone).trim() : null,
  }
}

function pick(src, keys) {
  for (const k of keys) {
    if (src[k] != null && String(src[k]).trim() !== '') return src[k]
  }
  return ''
}

/** Public identity — customer-submitted fields only, no extras. */
export function publicIdentity(row) {
  if (!row) return null
  return {
    id: row.id,
    legal_name: row.legal_name,
    email: row.email,
    address1: row.address1,
    city: row.city,
    province: row.province,
    postal: row.postal,
    country: row.country,
    dob: row.dob || null,
    phone: row.phone || null,
    created_at: row.created_at,
  }
}
