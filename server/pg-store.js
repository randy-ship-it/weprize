import pg from 'pg'
import { nowIso, orderToken, uid } from './ids.js'
import { loadAutoOkSlice } from './contests.js'
import { slotsFor } from './packs.js'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_link TEXT,
  pack TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  amount_cents INTEGER,
  currency TEXT,
  year_round BOOLEAN NOT NULL DEFAULT FALSE,
  client_reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  legal_name TEXT NOT NULL,
  email TEXT NOT NULL,
  address1 TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CA',
  dob TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS assist_jobs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  identity_id TEXT,
  contest_id TEXT,
  contest_url TEXT,
  contest_title TEXT,
  status TEXT NOT NULL,
  needs_you_reason TEXT,
  screenshot_path TEXT,
  confirm_ref TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS assist_jobs_order_idx ON assist_jobs(order_id);
CREATE INDEX IF NOT EXISTS assist_jobs_status_idx ON assist_jobs(status);
`

function mapOrder(r) {
  if (!r) return null
  return {
    id: r.id,
    token: r.token,
    stripe_session_id: r.stripe_session_id,
    stripe_payment_link: r.stripe_payment_link,
    pack: r.pack,
    status: r.status,
    customer_id: r.customer_id,
    amount_cents: r.amount_cents,
    currency: r.currency,
    year_round: Boolean(r.year_round),
    client_reference_id: r.client_reference_id || null,
    created_at: iso(r.created_at),
  }
}

function iso(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function mapIdentity(r) {
  if (!r) return null
  return {
    id: r.id,
    order_id: r.order_id,
    legal_name: r.legal_name,
    email: r.email,
    address1: r.address1,
    city: r.city,
    province: r.province,
    postal: r.postal,
    country: r.country,
    dob: r.dob,
    phone: r.phone,
    created_at: iso(r.created_at),
  }
}

function mapJob(r) {
  if (!r) return null
  return {
    id: r.id,
    order_id: r.order_id,
    identity_id: r.identity_id,
    contest_id: r.contest_id,
    contest_url: r.contest_url,
    contest_title: r.contest_title,
    status: r.status,
    needs_you_reason: r.needs_you_reason,
    screenshot_path: r.screenshot_path,
    confirm_ref: r.confirm_ref,
    updated_at: iso(r.updated_at),
    created_at: iso(r.created_at),
  }
}

export async function createPgStore(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    ssl: process.env.PGSSL === '0' ? false : { rejectUnauthorized: false },
  })
  await pool.query(SCHEMA)
  await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_reference_id TEXT')

  return {
    kind: 'postgres',

    async health() {
      await pool.query('SELECT 1')
      return { store: 'postgres' }
    },

    async getOrderByToken(token) {
      const { rows } = await pool.query('SELECT * FROM orders WHERE token = $1', [token])
      return mapOrder(rows[0])
    },

    async getOrderById(id) {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id])
      return mapOrder(rows[0])
    },

    async getOrderBySession(sessionId) {
      if (!sessionId) return null
      const { rows } = await pool.query('SELECT * FROM orders WHERE stripe_session_id = $1', [sessionId])
      return mapOrder(rows[0])
    },

    async upsertPaidOrderFromStripe({ sessionId, paymentLink, pack, email, amountCents, currency, clientReferenceId }) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        if (sessionId) {
          const found = await client.query('SELECT * FROM orders WHERE stripe_session_id = $1', [sessionId])
          if (found.rows[0]) {
            await client.query('COMMIT')
            return mapOrder(found.rows[0])
          }
        }
        let customer = (await client.query('SELECT * FROM customers WHERE email = $1', [email])).rows[0]
        if (!customer) {
          const id = uid()
          await client.query('INSERT INTO customers (id, email, created_at) VALUES ($1, $2, $3)', [
            id,
            email,
            nowIso(),
          ])
          customer = { id, email }
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
        await client.query(
          `INSERT INTO orders
            (id, token, stripe_session_id, stripe_payment_link, pack, status, customer_id, amount_cents, currency, year_round, client_reference_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            order.id,
            order.token,
            order.stripe_session_id,
            order.stripe_payment_link,
            order.pack,
            order.status,
            order.customer_id,
            order.amount_cents,
            order.currency,
            order.year_round,
            order.client_reference_id,
            order.created_at,
          ],
        )
        await client.query('COMMIT')
        return order
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },

    async createDemoOrder(pack = 'once') {
      const email = 'demo@localhost'
      return this.upsertPaidOrderFromStripe({
        sessionId: `demo_${pack}_${Date.now()}`,
        paymentLink: null,
        pack,
        email,
        amountCents: pack === 'triple' ? 1500 : pack === 'year_round' ? 1999 : 900,
        currency: 'cad',
      })
    },

    async listIdentities(orderId) {
      const { rows } = await pool.query(
        'SELECT * FROM identities WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId],
      )
      return rows.map(mapIdentity)
    },

    async addIdentity(orderId, identity) {
      const order = (await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])).rows[0]
      if (!order) {
        const err = new Error('order_not_found')
        err.status = 404
        throw err
      }
      const count = Number(
        (await pool.query('SELECT COUNT(*)::int AS n FROM identities WHERE order_id = $1', [orderId]))
          .rows[0].n,
      )
      const slots = slotsFor(order.pack)
      if (count >= slots) {
        const err = new Error(`This pack holds ${slots} identit${slots === 1 ? 'y' : 'ies'}`)
        err.status = 400
        err.code = 'identity_slots_full'
        throw err
      }
      const row = { id: uid(), order_id: orderId, ...identity, created_at: nowIso() }
      await pool.query(
        `INSERT INTO identities
          (id, order_id, legal_name, email, address1, city, province, postal, country, dob, phone, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.id,
          row.order_id,
          row.legal_name,
          row.email,
          row.address1,
          row.city,
          row.province,
          row.postal,
          row.country,
          row.dob,
          row.phone,
          row.created_at,
        ],
      )
      return row
    },

    async listJobs(orderId) {
      const { rows } = await pool.query(
        'SELECT * FROM assist_jobs WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId],
      )
      return rows.map(mapJob)
    },

    async seedJobsForIdentity(order, identity) {
      const existing = await pool.query(
        'SELECT id FROM assist_jobs WHERE order_id = $1 AND identity_id = $2 LIMIT 1',
        [order.id, identity.id],
      )
      if (existing.rows[0]) return this.listJobs(order.id)
      const slice = loadAutoOkSlice()
      const created = nowIso()
      const rows = []
      for (const c of slice) {
        const row = {
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
        }
        await pool.query(
          `INSERT INTO assist_jobs
            (id, order_id, identity_id, contest_id, contest_url, contest_title, status, needs_you_reason, screenshot_path, confirm_ref, updated_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            row.id,
            row.order_id,
            row.identity_id,
            row.contest_id,
            row.contest_url,
            row.contest_title,
            row.status,
            row.needs_you_reason,
            row.screenshot_path,
            row.confirm_ref,
            row.updated_at,
            row.created_at,
          ],
        )
        rows.push(row)
      }
      return rows
    },

    async updateJob(id, patch) {
      const current = (await pool.query('SELECT * FROM assist_jobs WHERE id = $1', [id])).rows[0]
      if (!current) return null
      const next = { ...mapJob(current), ...patch, updated_at: nowIso() }
      await pool.query(
        `UPDATE assist_jobs SET
          status=$2, needs_you_reason=$3, screenshot_path=$4, confirm_ref=$5, identity_id=$6, updated_at=$7
         WHERE id=$1`,
        [
          id,
          next.status,
          next.needs_you_reason,
          next.screenshot_path,
          next.confirm_ref,
          next.identity_id,
          next.updated_at,
        ],
      )
      return next
    },

    async getJob(id) {
      const { rows } = await pool.query('SELECT * FROM assist_jobs WHERE id = $1', [id])
      return mapJob(rows[0])
    },

    async claimQueuedJobs(limit = 5) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const { rows } = await client.query(
          `SELECT * FROM assist_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
          [limit],
        )
        const stamp = nowIso()
        const out = []
        for (const r of rows) {
          await client.query(`UPDATE assist_jobs SET status='applying', updated_at=$2 WHERE id=$1`, [
            r.id,
            stamp,
          ])
          out.push({ ...mapJob(r), status: 'applying', updated_at: stamp })
        }
        await client.query('COMMIT')
        return out
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
  }
}
