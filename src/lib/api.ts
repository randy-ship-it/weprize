/**
 * WePrize customer assist API.
 * Prefer live /api (Express). Fall back to local mock store only when
 * VITE_ASSIST_MOCK=1 — so Emma’s dashboard stays demoable without secrets.
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

const API_BASE =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? '/api'

const forceMock =
  (import.meta as ImportMeta & { env?: { VITE_ASSIST_MOCK?: string } }).env?.VITE_ASSIST_MOCK === '1'

export type ServerOrder = {
  token: string
  pack: PackId
  pack_label: string
  status: string
  year_round: boolean
  amount_cents: number | null
  currency: string
  created_at: string
  identity_slots: number
  identities_count: number
  identities: ServerIdentity[]
  needs_identity: boolean
  job_counts: Record<string, number>
  jobs_total: number
  seed_n: number
  message: string
}

export type ServerIdentity = {
  id: string
  legal_name: string
  email: string
  address1: string
  city: string
  province: string
  postal: string
  country: string
  dob: string | null
  phone: string | null
  created_at: string
}

export type ServerJob = {
  id: string
  contest_id: string
  contest_url: string
  contest_title: string
  status: Apply['status']
  needs_you_reason: string | null
  confirm_ref: string | null
  screenshot_path: boolean
  updated_at: string
  created_at: string
  identity_id: string | null
  what_to_do?: string | null
}

export type IdentityBody = {
  legal_name: string
  email: string
  address1: string
  city: string
  province: string
  postal: string
  country?: string
  dob?: string
  phone?: string
  fullName?: string
  addressLine1?: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let detail: unknown
    try {
      detail = await res.json()
    } catch {
      detail = await res.text()
    }
    const err = new Error(`api ${res.status}`) as Error & { status: number; detail: unknown }
    err.status = res.status
    err.detail = detail
    throw err
  }
  return (await res.json()) as T
}

export async function fetchOrderBySession(sessionId: string): Promise<ServerOrder> {
  const data = await api<{ order: ServerOrder }>(
    `/orders/by-session/${encodeURIComponent(sessionId)}`,
  )
  return data.order
}

export async function fetchOrderByToken(token: string): Promise<ServerOrder> {
  const data = await api<{ order: ServerOrder }>(`/orders/${encodeURIComponent(token)}`)
  return data.order
}

export async function postOrderIdentity(
  token: string,
  body: IdentityBody,
): Promise<{ identity: ServerIdentity; seeded_jobs: number; order: ServerOrder }> {
  return api(`/orders/${encodeURIComponent(token)}/identity`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchOrderJobs(token: string): Promise<{
  jobs: ServerJob[]
  counts: Record<string, number>
}> {
  return api(`/orders/${encodeURIComponent(token)}/jobs`)
}

export async function ackOrderJob(token: string, jobId: string): Promise<ServerJob> {
  const data = await api<{ job: ServerJob }>(
    `/orders/${encodeURIComponent(token)}/jobs/${encodeURIComponent(jobId)}/ack`,
    { method: 'POST', body: '{}' },
  )
  return data.job
}

// —— Local mock helpers (Emma /dashboard + /onboarding demo) ——

export type CreateOrderBody = { pack: PackId; autoOkPrinted?: number }
export type CreateIdentityBody = Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'country'> & {
  id?: string
}

async function delay(ms = 200): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

export async function createOrder(body: CreateOrderBody): Promise<Order> {
  await delay()
  void forceMock
  return upsertOrder(body.pack, body.autoOkPrinted)
}

export async function fetchOrder(): Promise<Order | null> {
  await delay(80)
  return loadAssistState().order
}

export async function postIdentity(body: CreateIdentityBody): Promise<Identity> {
  await delay()
  return saveIdentity(body)
}

export async function fetchIdentity(): Promise<Identity | null> {
  await delay(80)
  return loadAssistState().identity
}

export async function fetchApplies(): Promise<Apply[]> {
  await delay(100)
  ensureDemoSeed()
  return listApplies()
}

export async function ackApplyNeedsYou(applyId: string): Promise<Apply | null> {
  await delay()
  return updateApplyStatus(applyId, 'confirmed', {
    nextStep: undefined,
    actionHint: undefined,
  })
}

export { API_BASE }
