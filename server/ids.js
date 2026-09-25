import { randomBytes, randomUUID } from 'node:crypto'

export function uid() {
  return randomUUID()
}

export function orderToken() {
  return randomBytes(18).toString('base64url')
}

export function nowIso() {
  return new Date().toISOString()
}
