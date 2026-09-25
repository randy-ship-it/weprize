/**
 * Local-only JSON file store (data/weprize.json).
 * TODO(prod): prefer DATABASE_URL Postgres. Do not use this file store in production
 * Autoscale with multiple instances — it is single-process and not durable across hosts.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nowIso, orderToken, uid } from './ids.js'
import { loadAutoOkSlice } from './contests.js'
import { slotsFor } from './packs.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(root, 'data')
const FILE = join(DATA_DIR, 'weprize.json')

function empty() {
  return { customers: [], orders: [], identities: [], assist_jobs: [] }
}

function load() {
  if (!existsSync(FILE)) return empty()
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'))
    return {
      customers: parsed.customers || [],
      orders: parsed.orders || [],
      identities: parsed.identities || [],
      assist_jobs: parsed.assist_jobs || [],
    }
  } catch {
    return empty()
  }
}

function save(db) {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(db, null, 2))
  renameSync(tmp, FILE)
}

let chain = Promise.resolve()
function withLock(fn) {
  const run = chain.then(fn, fn)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function createJsonStore() {
  mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(FILE)) save(empty())

  return {
    kind: 'json',
    path: FILE,

    async health() {
      return { store: 'json', path: 'data/weprize.json' }
    },

    async getOrderByToken(token) {
      return load().orders.find((o) => o.token === token) || null
    },

    async getOrderById(id) {
      return load().orders.find((o) => o.id === id) || null
    },

    async getOrderBySession(sessionId) {
      if (!sessionId) return null
      return load().orders.find((o) => o.stripe_session_id === sessionId) || null
    },

    /**
     * Soft purchase cap helper: count paid orders for a buyer email.
     * Product rule: max 10 purchases per person/email (anti business/ROI farming).
     * TODO: harden to soft-block or support nudge when count >= 10 (do not invent payment infra).
     */
    async countPaidOrdersByEmail(email) {
      const e = String(email || '').trim().toLowerCase()
      if (!e || !e.includes('@')) return 0
      const db = load()
      const customer = db.customers.find((c) => String(c.email || '').toLowerCase() === e)
      if (!customer) return 0
      return db.orders.filter((o) => o.customer_id === customer.id && o.status === 'paid').length
    },

    /**
     * Recover latest paid order for exact buyer email (checkout email).
     * Exact match only — never fuzzy / never leak other emails.
     */
    async getLatestPaidOrderByEmail(email) {
      const e = String(email || '').trim().toLowerCase()
      if (!e || !e.includes('@')) return null
      const db = load()
      const customer = db.customers.find((c) => String(c.email || '').toLowerCase() === e)
      if (!customer) return null
      const paid = db.orders
        .filter((o) => o.customer_id === customer.id && o.status === 'paid')
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      return paid[0] || null
    },

    async upsertPaidOrderFromStripe({ sessionId, paymentLink, pack, email, amountCents, currency, clientReferenceId }) {
      return withLock(() => {
        const db = load()
        const existing = db.orders.find((o) => o.stripe_session_id === sessionId)
        if (existing) return existing

        let customer = db.customers.find((c) => c.email === email)
        if (!customer) {
          customer = { id: uid(), email, created_at: nowIso() }
          db.customers.push(customer)
        }

        const order = {
          id: uid(),
          token: orderToken(),
          stripe_session_id: sessionId || null,
          stripe_payment_link: paymentLink || null,
          pack,
          status: 'paid',
          customer_id: customer.id,
          amount_cents: amountCents ?? null,
          currency: currency || 'cad',
          year_round: pack === 'year_round',
          client_reference_id: clientReferenceId || null,
          created_at: nowIso(),
        }
        db.orders.push(order)
        save(db)
        return order
      })
    },

    async createDemoOrder(pack = 'once') {
      return withLock(() => {
        const db = load()
        const existing = db.orders.find((o) => o.token === 'demo' && o.pack === pack)
        if (existing) return existing
        const customer = { id: uid(), email: 'demo@localhost', created_at: nowIso() }
        db.customers.push(customer)
        const order = {
          id: uid(),
          token: `demo-${orderToken().slice(0, 8)}`,
          stripe_session_id: null,
          stripe_payment_link: null,
          pack,
          status: 'paid',
          customer_id: customer.id,
          amount_cents: pack === 'triple' ? 1500 : pack === 'year_round' ? 1999 : 900,
          currency: 'cad',
          year_round: pack === 'year_round',
          created_at: nowIso(),
        }
        db.orders.push(order)
        save(db)
        return order
      })
    },

    async listIdentities(orderId) {
      return load().identities.filter((i) => i.order_id === orderId)
    },

    async addIdentity(orderId, identity) {
      return withLock(() => {
        const db = load()
        const order = db.orders.find((o) => o.id === orderId)
        if (!order) {
          const err = new Error('order_not_found')
          err.status = 404
          throw err
        }
        const existing = db.identities.filter((i) => i.order_id === orderId)
        const slots = slotsFor(order.pack)
        if (existing.length >= slots) {
          const err = new Error(`This pack holds ${slots} identit${slots === 1 ? 'y' : 'ies'}`)
          err.status = 400
          err.code = 'identity_slots_full'
          throw err
        }
        const row = {
          id: uid(),
          order_id: orderId,
          ...identity,
          created_at: nowIso(),
        }
        db.identities.push(row)
        save(db)
        return row
      })
    },

    async listJobs(orderId) {
      return load()
        .assist_jobs.filter((j) => j.order_id === orderId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    },

    async seedJobsForIdentity(order, identity) {
      return withLock(() => {
        const db = load()
        const already = db.assist_jobs.some(
          (j) => j.order_id === order.id && j.identity_id === identity.id,
        )
        if (already) return db.assist_jobs.filter((j) => j.identity_id === identity.id)
        const slice = loadAutoOkSlice()
        const created = nowIso()
        const rows = slice.map((c) => ({
          id: uid(),
          order_id: order.id,
          identity_id: identity.id,
          contest_id: c.contest_id,
          contest_url: c.contest_url,
          contest_title: c.contest_title,
          status: 'queued',
          needs_you_reason: null,
          screenshot_path: null,
          confirm_ref: null,
          updated_at: created,
          created_at: created,
        }))
        db.assist_jobs.push(...rows)
        save(db)
        return rows
      })
    },

    async updateJob(id, patch) {
      return withLock(() => {
        const db = load()
        const job = db.assist_jobs.find((j) => j.id === id)
        if (!job) return null
        Object.assign(job, patch, { updated_at: nowIso() })
        save(db)
        return job
      })
    },

    async getJob(id) {
      return load().assist_jobs.find((j) => j.id === id) || null
    },

    async claimQueuedJobs(limit = 5) {
      return withLock(() => {
        const db = load()
        const queued = db.assist_jobs.filter((j) => j.status === 'queued').slice(0, limit)
        const stamp = nowIso()
        for (const j of queued) {
          j.status = 'applying'
          j.updated_at = stamp
        }
        save(db)
        return queued
      })
    },
  }
}
