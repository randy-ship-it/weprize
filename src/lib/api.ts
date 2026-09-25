/**
 * Stub fetch helpers for future WePrize Bot /api on Replit.
 * Today: read/write the local mock store so UI is demoable without secrets.
 * When backend lands, set VITE_API_BASE + VITE_USE_LIVE_API=1.
 */

import type { Apply, Identity, Order, PackId } from '../types/assist'
import {
  ensureDemoSeed,
  listApplies,
  loadAssistState,
  saveIdentity,
  updateApplyStatus,
  upsertOrder,
} from './assistStore'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const USE_LIVE = import.meta.env.VITE_USE_LIVE_API === '1'

async function delay(ms = 280): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

export type CreateOrderBody = { pack: PackId; autoOkPrinted?: number }
export type CreateIdentityBody = Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'country'> & {
  id?: string
}

/** POST /api/orders — Stripe webhook will create these server-side later. */
export async function createOrder(body: CreateOrderBody): Promise<Order> {
  await delay()
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`orders ${res.status}`)
    return (await res.json()) as Order
  }
  return upsertOrder(body.pack, body.autoOkPrinted)
}

/** GET /api/orders/me */
export async function fetchOrder(): Promise<Order | null> {
  await delay(120)
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/orders/me`)
    if (!res.ok) throw new Error(`orders/me ${res.status}`)
    return (await res.json()) as Order | null
  }
  return loadAssistState().order
}

/** POST /api/identity — BYO profile for AUTO_OK fills. */
export async function postIdentity(body: CreateIdentityBody): Promise<Identity> {
  await delay()
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`identity ${res.status}`)
    return (await res.json()) as Identity
  }
  return saveIdentity(body)
}

/** GET /api/identity */
export async function fetchIdentity(): Promise<Identity | null> {
  await delay(120)
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/identity`)
    if (!res.ok) throw new Error(`identity ${res.status}`)
    return (await res.json()) as Identity | null
  }
  return loadAssistState().identity
}

/** GET /api/applies */
export async function fetchApplies(): Promise<Apply[]> {
  await delay(160)
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/applies`)
    if (!res.ok) throw new Error(`applies ${res.status}`)
    return (await res.json()) as Apply[]
  }
  ensureDemoSeed()
  return listApplies()
}

/** POST /api/applies/:id/ack — customer marks OTP done (future). */
export async function ackApplyNeedsYou(applyId: string): Promise<Apply | null> {
  await delay()
  if (USE_LIVE) {
    const res = await fetch(`${API_BASE}/applies/${applyId}/ack`, { method: 'POST' })
    if (!res.ok) throw new Error(`ack ${res.status}`)
    return (await res.json()) as Apply
  }
  return updateApplyStatus(applyId, 'confirmed', {
    nextStep: undefined,
    actionHint: undefined,
  })
}

export { API_BASE }
