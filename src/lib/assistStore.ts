import type { Apply, AssistState, Identity, Order, PackId } from '../types/assist'

const KEY = 'weprize_assist_v1'

const empty: AssistState = {
  version: 1,
  order: null,
  identity: null,
  applies: [],
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export function loadAssistState(): AssistState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...empty }
    const parsed = JSON.parse(raw) as AssistState
    if (parsed?.version !== 1) return { ...empty }
    return {
      version: 1,
      order: parsed.order ?? null,
      identity: parsed.identity ?? null,
      applies: Array.isArray(parsed.applies) ? parsed.applies : [],
    }
  } catch {
    return { ...empty }
  }
}

export function saveAssistState(state: AssistState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearAssistState(): void {
  localStorage.removeItem(KEY)
}

export function upsertOrder(pack: PackId, autoOkPrinted = 42): Order {
  const state = loadAssistState()
  const order: Order = {
    id: state.order?.id ?? uid('ord'),
    pack,
    status: 'paid',
    autoOkPrinted,
    createdAt: state.order?.createdAt ?? new Date().toISOString(),
  }
  saveAssistState({ ...state, order })
  return order
}

export function saveIdentity(
  input: Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'country'> & { id?: string },
): Identity {
  const state = loadAssistState()
  const now = new Date().toISOString()
  const identity: Identity = {
    id: input.id ?? state.identity?.id ?? uid('id'),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    dob: input.dob?.trim() || undefined,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || undefined,
    city: input.city.trim(),
    province: input.province.trim().toUpperCase(),
    postal: input.postal.trim().toUpperCase(),
    country: 'CA',
    createdAt: state.identity?.createdAt ?? now,
    updatedAt: now,
  }
  const next: AssistState = { ...state, identity }
  if (state.order && state.applies.length === 0) {
    next.applies = seedDemoApplies(state.order.id)
  }
  saveAssistState(next)
  return identity
}

export function listApplies(): Apply[] {
  return loadAssistState().applies
}

export function updateApplyStatus(
  applyId: string,
  status: Apply['status'],
  patch?: Partial<Pick<Apply, 'nextStep' | 'actionHint'>>,
): Apply | null {
  const state = loadAssistState()
  const idx = state.applies.findIndex((a) => a.id === applyId)
  if (idx < 0) return null
  const updated: Apply = {
    ...state.applies[idx],
    status,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  const applies = [...state.applies]
  applies[idx] = updated
  saveAssistState({ ...state, applies })
  return updated
}

/** Demo inventory so /dashboard feels real without a backend. */
export function seedDemoApplies(orderId: string): Apply[] {
  const now = Date.now()
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString()
  const rows: Omit<Apply, 'id' | 'orderId'>[] = [
    {
      contestId: 'demo_jamieson',
      contestName: 'Jamieson Wellness · Recovery kit',
      contestSlug: 'jamieson-recovery',
      prizeText: 'Wellness recovery bundle',
      status: 'needs_you',
      nextStep: 'Check your email for a 6-digit code, then tap Confirm below once you enter it on the brand site.',
      actionHint: 'Open your inbox · search “Jamieson”',
      createdAt: iso(90),
      updatedAt: iso(12),
    },
    {
      contestId: 'demo_sleep',
      contestName: 'Sleep Country · Mattress draw',
      contestSlug: 'sleep-country-draw',
      prizeText: 'Mattress set (estimate)',
      status: 'confirm_sent',
      nextStep: 'Confirm link sent to your email. Open it to finish this entry.',
      actionHint: 'Open confirmation email',
      createdAt: iso(80),
      updatedAt: iso(25),
    },
    {
      contestId: 'demo_biosteel',
      contestName: 'BioSteel · Hydration giveaway',
      prizeText: 'Hydration prize pack',
      status: 'applying',
      createdAt: iso(40),
      updatedAt: iso(5),
    },
    {
      contestId: 'demo_castanet',
      contestName: 'Castanet soft-field · Grocery draw',
      prizeText: 'Grocery gift card',
      status: 'queued',
      createdAt: iso(30),
      updatedAt: iso(30),
    },
    {
      contestId: 'demo_physio',
      contestName: 'Home PT · Align clinic kit',
      prizeText: 'Physio home kit',
      status: 'applied',
      createdAt: iso(120),
      updatedAt: iso(55),
    },
    {
      contestId: 'demo_protein',
      contestName: 'Protein brand · Fitness gear',
      prizeText: 'Fitness gear bundle',
      status: 'confirmed',
      createdAt: iso(200),
      updatedAt: iso(100),
    },
    {
      contestId: 'demo_failed',
      contestName: 'Radio Gleam · Account wall',
      prizeText: 'Concert tickets',
      status: 'failed',
      nextStep: 'Skipped — account wall / CAPTCHA. Not billed as a completed apply.',
      createdAt: iso(150),
      updatedAt: iso(140),
    },
  ]
  return rows.map((r) => ({ ...r, id: uid('apl'), orderId }))
}

export function ensureDemoSeed(): AssistState {
  const state = loadAssistState()
  if (state.order && state.identity && state.applies.length === 0) {
    const applies = seedDemoApplies(state.order.id)
    const next = { ...state, applies }
    saveAssistState(next)
    return next
  }
  return state
}

export function progressSummary(applies: Apply[]) {
  const counts: Record<string, number> = {
    queued: 0,
    applying: 0,
    applied: 0,
    confirm_sent: 0,
    needs_you: 0,
    confirmed: 0,
    failed: 0,
  }
  for (const a of applies) counts[a.status] = (counts[a.status] ?? 0) + 1
  const active = applies.filter((a) => a.status !== 'failed').length
  const done = counts.confirmed + counts.applied
  const needsYou = counts.needs_you + counts.confirm_sent
  return { counts, active, done, needsYou, total: applies.length }
}
