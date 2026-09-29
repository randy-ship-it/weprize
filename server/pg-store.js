import pg from 'pg'
import { nowIso, orderToken, uid } from './ids.js'
import { randomBytes } from 'node:crypto'
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

CREATE TABLE IF NOT EXISTS qr_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS qr_codes (
  code TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  accepted_terms_at TIMESTAMPTZ NOT NULL,
  terms_version TEXT NOT NULL,
  logo_url TEXT,
  brand_name TEXT,
  stripe_connect_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
CREATE INDEX IF NOT EXISTS qr_codes_email_idx ON qr_codes(email);
CREATE TABLE IF NOT EXISTS qr_earnings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL REFERENCES qr_codes(code),
  stripe_session_id TEXT UNIQUE,
  order_id TEXT,
  amount_cents INTEGER NOT NULL,
  credit_cents INTEGER NOT NULL,
  rate_bps INTEGER NOT NULL,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'owed',
  transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE qr_earnings ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE qr_earnings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS qr_earnings_code_idx ON qr_earnings(code);
CREATE TABLE IF NOT EXISTS sticker_orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ref_code TEXT,
  stripe_session_id TEXT UNIQUE,
  amount_cents INTEGER,
  currency TEXT,
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal TEXT,
  shipping_country TEXT DEFAULT 'CA',
  status TEXT NOT NULL DEFAULT 'paid_pending_fulfill',
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sticker_orders_status_idx ON sticker_orders(status);


CREATE TABLE IF NOT EXISTS b2b_reps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  rep_code TEXT UNIQUE,
  stripe_connect_account_id TEXT,
  accepted_terms_at TIMESTAMPTZ NOT NULL,
  terms_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS b2b_placements (
  id TEXT PRIMARY KEY,
  business_code TEXT NOT NULL REFERENCES qr_codes(code),
  recruited_by_rep_id TEXT REFERENCES b2b_reps(id),
  recruited_at TIMESTAMPTZ,
  trailer_purchased_at TIMESTAMPTZ,
  trailer_rate_bps INTEGER,
  trailer_stripe_session_id TEXT,
  trailer_price_cents INTEGER,
  trailer_trailing_revenue_cents INTEGER,
  ad_slot TEXT,
  sponsored_placement TEXT,
  UNIQUE(business_code)
);
CREATE TABLE IF NOT EXISTS qr_split_ledger (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  business_code TEXT,
  host_email TEXT,
  rep_id TEXT,
  purchase_amount_cents INTEGER NOT NULL,
  host_share_cents INTEGER NOT NULL,
  weprize_share_cents INTEGER NOT NULL,
  rep_share_cents INTEGER NOT NULL,
  weprize_net_cents INTEGER NOT NULL,
  host_rate_bps INTEGER,
  rep_rate_bps INTEGER,
  rep_rule TEXT,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'owed',
  host_status TEXT,
  rep_status TEXT,
  host_transfer_id TEXT,
  rep_transfer_id TEXT,
  period TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS consumers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  age_band TEXT,
  city TEXT,
  province TEXT,
  interests TEXT,
  household TEXT,
  birch_license_ok BOOLEAN NOT NULL DEFAULT FALSE,
  consent_product BOOLEAN NOT NULL DEFAULT TRUE,
  bonus_applies INTEGER NOT NULL DEFAULT 0,
  jackpot_spun_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS partner_submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  about TEXT,
  contest_blurb TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS featured_contests (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand_name TEXT,
  prize_blurb TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  contact_email TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_reference_id TEXT;
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

function shortCode(len = 7) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}


function mapQr(r, existingFlag) {
  if (!r) return null
  const out = {
    code: r.code,
    email: r.email,
    accepted_terms_at: iso(r.accepted_terms_at),
    terms_version: r.terms_version,
    logo_url: r.logo_url || null,
    brand_name: r.brand_name || null,
    stripe_connect_account_id: r.stripe_connect_account_id || null,
    created_at: iso(r.created_at),
    revoked_at: iso(r.revoked_at),
  }
  if (existingFlag) out.existing = true
  return out
}

function mapSticker(r) {
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    ref_code: r.ref_code,
    stripe_session_id: r.stripe_session_id,
    amount_cents: r.amount_cents,
    currency: r.currency,
    shipping_name: r.shipping_name,
    shipping_line1: r.shipping_line1,
    shipping_city: r.shipping_city,
    shipping_province: r.shipping_province,
    shipping_postal: r.shipping_postal,
    shipping_country: r.shipping_country,
    status: r.status,
    created_at: iso(r.created_at),
  }
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
    // Vercel serverless: keep pool tiny; prefer Neon -pooler URL in DATABASE_URL.
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
  })
  await pool.query(SCHEMA)
  const seedSettings = [
    ['qr_affiliate_rate_bps', '5000'],
    ['b2b_rep_rate_bps', '3500'],
    ['b2b_rep_months', '24'],
    ['trailer_multiple', '3'],
    ['trailer_rate_bps', '1500'],
  ]
  for (const [k, v] of seedSettings) {
    await pool.query(
      `INSERT INTO qr_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [k, v],
    )
  }

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

        async countPaidOrdersByEmail(email) {
      const e = String(email || '').trim().toLowerCase()
      if (!e || !e.includes('@')) return 0
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE lower(c.email) = $1 AND o.status = 'paid'`,
        [e],
      )
      return rows[0]?.n ?? 0
    },

    /**
     * Recover latest paid order for exact buyer email (checkout email).
     * Exact match only — never fuzzy / never leak other emails.
     */

    async getLatestPaidOrderByEmail(email) {
      const e = String(email || '').trim().toLowerCase()
      if (!e || !e.includes('@')) return null
      const { rows } = await pool.query(
        `SELECT o.*
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE lower(c.email) = $1 AND o.status = 'paid'
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [e],
      )
      return mapOrder(rows[0])
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


    async getQrSetting(key, fallback = null) {
      const { rows } = await pool.query('SELECT value FROM qr_settings WHERE key = $1', [key])
      return rows[0]?.value ?? fallback
    },

    async setQrSetting(key, value) {
      const stamp = nowIso()
      await pool.query(
        `INSERT INTO qr_settings (key, value, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, String(value), stamp],
      )
      return { key, value: String(value), updated_at: stamp }
    },

    async getAffiliateRateBps() {
      const v = await this.getQrSetting('qr_affiliate_rate_bps', '5000')
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5000
    },

    async claimQrCode({ email, termsVersion, acceptedTermsAt, logoUrl, brandName, recruitedByRepId }) {
      const existing = (
        await pool.query(
          `SELECT * FROM qr_codes WHERE email = $1 AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1`,
          [email],
        )
      ).rows[0]
      if (existing) {
        if (logoUrl !== undefined || brandName !== undefined) {
          await pool.query(
            `UPDATE qr_codes SET logo_url = COALESCE($2, logo_url), brand_name = COALESCE($3, brand_name) WHERE code = $1`,
            [existing.code, logoUrl || null, brandName || null],
          )
        }
        const refreshed = (await pool.query('SELECT * FROM qr_codes WHERE code = $1', [existing.code])).rows[0]
        return mapQr(refreshed, true)
      }
      let code
      for (let i = 0; i < 12; i++) {
        code = shortCode()
        const clash = await pool.query('SELECT 1 FROM qr_codes WHERE code = $1', [code])
        if (!clash.rows[0]) break
        code = null
      }
      if (!code) throw new Error('code_gen_failed')
      const stamp = acceptedTermsAt || nowIso()
      await pool.query(
        `INSERT INTO qr_codes (code, email, accepted_terms_at, terms_version, logo_url, brand_name, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [code, email, stamp, termsVersion, logoUrl || null, brandName || null, stamp],
      )
      if (recruitedByRepId) {
        await pool.query(
          `INSERT INTO b2b_placements (id, business_code, recruited_by_rep_id, recruited_at, ad_slot, sponsored_placement)
           VALUES ($1,$2,$3,$4,NULL,NULL)
           ON CONFLICT (business_code) DO NOTHING`,
          [uid(), code, recruitedByRepId, stamp],
        )
      }
      return {
        code,
        email,
        accepted_terms_at: stamp,
        terms_version: termsVersion,
        logo_url: logoUrl || null,
        brand_name: brandName || null,
        stripe_connect_account_id: null,
        created_at: stamp,
        revoked_at: null,
        existing: false,
      }
    },

    async getQrCode(code) {
      if (!code) return null
      const { rows } = await pool.query('SELECT * FROM qr_codes WHERE code = $1', [String(code).toLowerCase()])
      return mapQr(rows[0])
    },

    async updateQrCode(code, patch) {
      const current = await this.getQrCode(code)
      if (!current) return null
      const next = { ...current, ...patch }
      await pool.query(
        `UPDATE qr_codes SET
          logo_url = $2, brand_name = $3, stripe_connect_account_id = $4, revoked_at = $5
         WHERE code = $1`,
        [
          current.code,
          next.logo_url ?? null,
          next.brand_name ?? null,
          next.stripe_connect_account_id ?? null,
          next.revoked_at ?? null,
        ],
      )
      return this.getQrCode(code)
    },

    async creditQrEarnings({ code, stripeSessionId, orderId, amountCents, currency }) {
      if (!code || !stripeSessionId) return null
      const owner = await this.getQrCode(code)
      if (!owner || owner.revoked_at) return null
      const existing = (
        await pool.query('SELECT * FROM qr_earnings WHERE stripe_session_id = $1', [stripeSessionId])
      ).rows[0]
      if (existing) {
        return {
          id: existing.id,
          code: existing.code,
          stripe_session_id: existing.stripe_session_id,
          order_id: existing.order_id,
          amount_cents: existing.amount_cents,
          credit_cents: existing.credit_cents,
          rate_bps: existing.rate_bps,
          currency: existing.currency,
          status: existing.status,
          created_at: iso(existing.created_at),
          duplicate: true,
        }
      }
      const rateBps = await this.getAffiliateRateBps()
      const credit = Math.floor((Math.max(0, Number(amountCents) || 0) * rateBps) / 10000)
      const row = {
        id: uid(),
        code: owner.code,
        stripe_session_id: stripeSessionId,
        order_id: orderId || null,
        amount_cents: Number(amountCents) || 0,
        credit_cents: credit,
        rate_bps: rateBps,
        currency: currency || 'cad',
        status: 'owed',
        created_at: nowIso(),
      }
      await pool.query(
        `INSERT INTO qr_earnings
          (id, code, stripe_session_id, order_id, amount_cents, credit_cents, rate_bps, currency, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          row.id,
          row.code,
          row.stripe_session_id,
          row.order_id,
          row.amount_cents,
          row.credit_cents,
          row.rate_bps,
          row.currency,
          row.status,
          row.created_at,
        ],
      )
      return row
    },

    async getQrEarnings(code, email) {
      const owner = await this.getQrCode(code)
      if (!owner) return null
      if (email && String(email).toLowerCase() !== String(owner.email).toLowerCase()) {
        const err = new Error('email_mismatch')
        err.status = 403
        err.code = 'email_mismatch'
        throw err
      }
      const rateBps = await this.getAffiliateRateBps()
      const { rows } = await pool.query(
        'SELECT * FROM qr_earnings WHERE code = $1 ORDER BY created_at DESC',
        [owner.code],
      )
      const ledger = rows.map((r) => ({
        id: r.id,
        amount_cents: r.amount_cents,
        credit_cents: r.credit_cents,
        rate_bps: r.rate_bps,
        currency: r.currency,
        status: r.status,
        stripe_session_id: r.stripe_session_id,
        created_at: iso(r.created_at),
      }))
      const owed = ledger.filter((e) => e.status === 'owed').reduce((s, e) => s + e.credit_cents, 0)
      const paid = ledger.filter((e) => e.status === 'paid').reduce((s, e) => s + e.credit_cents, 0)
      return {
        code: owner.code,
        email: owner.email,
        logo_url: owner.logo_url || null,
        brand_name: owner.brand_name || null,
        stripe_connect_account_id: owner.stripe_connect_account_id || null,
        rate_bps: rateBps,
        rate_percent: rateBps / 100,
        owed_cents: owed,
        paid_cents: paid,
        ledger,
      }
    },

    async listOwedEarnings(limit = 50) {
      const { rows } = await pool.query(
        `SELECT * FROM qr_earnings WHERE status = 'owed' ORDER BY created_at ASC LIMIT $1`,
        [limit],
      )
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        amount_cents: r.amount_cents,
        credit_cents: r.credit_cents,
        rate_bps: r.rate_bps,
        currency: r.currency,
        status: r.status,
        stripe_session_id: r.stripe_session_id,
        created_at: iso(r.created_at),
      }))
    },

    async markEarningsPaid(id, transferId) {
      const stamp = nowIso()
      await pool.query(
        `UPDATE qr_earnings SET status = 'paid', transfer_id = $2, paid_at = $3 WHERE id = $1`,
        [id, transferId || null, stamp],
      )
      const { rows } = await pool.query('SELECT * FROM qr_earnings WHERE id = $1', [id])
      const r = rows[0]
      if (!r) return null
      return {
        id: r.id,
        code: r.code,
        credit_cents: r.credit_cents,
        status: r.status,
        transfer_id: r.transfer_id,
        paid_at: iso(r.paid_at),
      }
    },

    async createStickerOrder({
      email,
      refCode,
      stripeSessionId,
      amountCents,
      currency,
      shipping,
    }) {
      if (stripeSessionId) {
        const found = (
          await pool.query('SELECT * FROM sticker_orders WHERE stripe_session_id = $1', [stripeSessionId])
        ).rows[0]
        if (found) return mapSticker(found)
      }
      const row = {
        id: uid(),
        email,
        ref_code: refCode || null,
        stripe_session_id: stripeSessionId || null,
        amount_cents: amountCents ?? null,
        currency: currency || 'cad',
        shipping_name: shipping?.name || null,
        shipping_line1: shipping?.line1 || null,
        shipping_city: shipping?.city || null,
        shipping_province: shipping?.province || null,
        shipping_postal: shipping?.postal || null,
        shipping_country: shipping?.country || 'CA',
        status: 'paid_pending_fulfill',
        created_at: nowIso(),
      }
      await pool.query(
        `INSERT INTO sticker_orders
          (id, email, ref_code, stripe_session_id, amount_cents, currency,
           shipping_name, shipping_line1, shipping_city, shipping_province, shipping_postal, shipping_country,
           status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          row.id,
          row.email,
          row.ref_code,
          row.stripe_session_id,
          row.amount_cents,
          row.currency,
          row.shipping_name,
          row.shipping_line1,
          row.shipping_city,
          row.shipping_province,
          row.shipping_postal,
          row.shipping_country,
          row.status,
          row.created_at,
        ],
      )
      return row
    },


    async createB2bRep({ email, name, termsVersion, acceptedTermsAt }) {
      const existing = (
        await pool.query(`SELECT * FROM b2b_reps WHERE email = $1 AND revoked_at IS NULL LIMIT 1`, [email])
      ).rows[0]
      if (existing) {
        return {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          rep_code: existing.rep_code,
          stripe_connect_account_id: existing.stripe_connect_account_id,
          accepted_terms_at: iso(existing.accepted_terms_at),
          terms_version: existing.terms_version,
          created_at: iso(existing.created_at),
          existing: true,
        }
      }
      const stamp = acceptedTermsAt || nowIso()
      let repCode
      for (let i = 0; i < 10; i++) {
        repCode = shortCode(6)
        const clash = await pool.query('SELECT 1 FROM b2b_reps WHERE rep_code = $1', [repCode])
        if (!clash.rows[0]) break
      }
      const id = uid()
      await pool.query(
        `INSERT INTO b2b_reps (id, email, name, rep_code, accepted_terms_at, terms_version, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, email, name || null, repCode, stamp, termsVersion, stamp],
      )
      return {
        id,
        email,
        name: name || null,
        rep_code: repCode,
        stripe_connect_account_id: null,
        accepted_terms_at: stamp,
        terms_version: termsVersion,
        created_at: stamp,
        existing: false,
      }
    },

    async getB2bRep(idOrCodeOrEmail) {
      const q = String(idOrCodeOrEmail || '')
      const { rows } = await pool.query(
        `SELECT * FROM b2b_reps WHERE id = $1 OR lower(rep_code) = lower($1) OR lower(email) = lower($1) LIMIT 1`,
        [q],
      )
      const r = rows[0]
      if (!r) return null
      return {
        id: r.id,
        email: r.email,
        name: r.name,
        rep_code: r.rep_code,
        stripe_connect_account_id: r.stripe_connect_account_id,
        accepted_terms_at: iso(r.accepted_terms_at),
        terms_version: r.terms_version,
        created_at: iso(r.created_at),
        revoked_at: iso(r.revoked_at),
      }
    },

    async updateB2bRep(id, patch) {
      const cur = await this.getB2bRep(id)
      if (!cur) return null
      const next = { ...cur, ...patch }
      await pool.query(
        `UPDATE b2b_reps SET name=$2, stripe_connect_account_id=$3, revoked_at=$4 WHERE id=$1`,
        [id, next.name ?? null, next.stripe_connect_account_id ?? null, next.revoked_at ?? null],
      )
      return this.getB2bRep(id)
    },

    async getPlacementByCode(code) {
      const { rows } = await pool.query(
        'SELECT * FROM b2b_placements WHERE business_code = $1',
        [String(code).toLowerCase()],
      )
      const r = rows[0]
      if (!r) return null
      return {
        id: r.id,
        business_code: r.business_code,
        recruited_by_rep_id: r.recruited_by_rep_id,
        recruited_at: iso(r.recruited_at),
        trailer_purchased_at: iso(r.trailer_purchased_at),
        trailer_rate_bps: r.trailer_rate_bps,
        trailer_stripe_session_id: r.trailer_stripe_session_id,
        ad_slot: r.ad_slot, // BIRCH_RESERVE_AD_HOOK
        sponsored_placement: r.sponsored_placement,
      }
    },

    async linkPlacement({ businessCode, repId }) {
      const existing = await this.getPlacementByCode(businessCode)
      if (existing) {
        if (!existing.recruited_by_rep_id) {
          await pool.query(
            `UPDATE b2b_placements SET recruited_by_rep_id=$2, recruited_at=NOW() WHERE business_code=$1`,
            [businessCode, repId],
          )
          return this.getPlacementByCode(businessCode)
        }
        return existing
      }
      await pool.query(
        `INSERT INTO b2b_placements (id, business_code, recruited_by_rep_id, recruited_at, ad_slot, sponsored_placement)
         VALUES ($1,$2,$3,NOW(),NULL,NULL)`,
        [uid(), businessCode, repId],
      )
      return this.getPlacementByCode(businessCode)
    },

    async markTrailerPurchased({ businessCode, repId, stripeSessionId, trailerRateBps, priceCents, trailingRevenueCents }) {
      const p = await this.getPlacementByCode(businessCode)
      if (!p || p.recruited_by_rep_id !== repId) return null
      if (p.trailer_purchased_at) return { ...p, duplicate: true }
      await pool.query(
        `UPDATE b2b_placements SET
          trailer_purchased_at = NOW(),
          trailer_rate_bps = $2,
          trailer_stripe_session_id = $3,
          trailer_price_cents = $4,
          trailer_trailing_revenue_cents = $5
         WHERE business_code = $1`,
        [businessCode, trailerRateBps, stripeSessionId, priceCents, trailingRevenueCents],
      )
      return this.getPlacementByCode(businessCode)
    },

    async recordSplitLedger(row) {
      const dup = (
        await pool.query('SELECT * FROM qr_split_ledger WHERE stripe_session_id = $1', [row.stripe_session_id])
      ).rows[0]
      if (dup) return { ...dup, duplicate: true }
      const stamp = nowIso()
      await pool.query(
        `INSERT INTO qr_split_ledger
          (id, stripe_session_id, business_code, host_email, rep_id,
           purchase_amount_cents, host_share_cents, weprize_share_cents, rep_share_cents, weprize_net_cents,
           host_rate_bps, rep_rate_bps, rep_rule, currency, status, period, order_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          row.id, row.stripe_session_id, row.business_code, row.host_email, row.rep_id,
          row.purchase_amount_cents, row.host_share_cents, row.weprize_share_cents, row.rep_share_cents, row.weprize_net_cents,
          row.host_rate_bps, row.rep_rate_bps, row.rep_rule, row.currency, row.status || 'owed',
          row.period, row.order_id, stamp,
        ],
      )
      return { ...row, created_at: stamp }
    },

    async trailingRevenueCents(businessCode, months = 12) {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(purchase_amount_cents),0)::int AS n FROM qr_split_ledger
         WHERE business_code = $1 AND created_at >= NOW() - ($2 || ' months')::interval`,
        [businessCode, String(months)],
      )
      return rows[0]?.n || 0
    },

    async listRepBusinesses(repId) {
      const { rows } = await pool.query(
        'SELECT * FROM b2b_placements WHERE recruited_by_rep_id = $1 ORDER BY recruited_at DESC',
        [repId],
      )
      return rows.map((r) => ({
        id: r.id,
        business_code: r.business_code,
        recruited_by_rep_id: r.recruited_by_rep_id,
        recruited_at: iso(r.recruited_at),
        trailer_purchased_at: iso(r.trailer_purchased_at),
        trailer_rate_bps: r.trailer_rate_bps,
      }))
    },

    async listRepLedger(repId) {
      const { rows } = await pool.query(
        'SELECT * FROM qr_split_ledger WHERE rep_id = $1 ORDER BY created_at DESC',
        [repId],
      )
      return rows
    },

    async listOwedSplits(limit = 50) {
      const { rows } = await pool.query(
        `SELECT * FROM qr_split_ledger WHERE status = 'owed' ORDER BY created_at ASC LIMIT $1`,
        [limit],
      )
      return rows
    },

    async markSplitPaid(id, transferId, party) {
      if (party === 'host') {
        await pool.query(
          `UPDATE qr_split_ledger SET host_status='paid', host_transfer_id=$2 WHERE id=$1`,
          [id, transferId],
        )
      } else if (party === 'rep') {
        await pool.query(
          `UPDATE qr_split_ledger SET rep_status='paid', rep_transfer_id=$2 WHERE id=$1`,
          [id, transferId],
        )
      }
      await pool.query(
        `UPDATE qr_split_ledger SET status='paid'
         WHERE id=$1
           AND (host_share_cents = 0 OR host_status = 'paid')
           AND (rep_share_cents = 0 OR rep_status = 'paid')`,
        [id],
      )
      const { rows } = await pool.query('SELECT * FROM qr_split_ledger WHERE id=$1', [id])
      return rows[0] || null
    },


    async upsertConsumerProfile(profile) {
      const existing = (await pool.query('SELECT * FROM consumers WHERE email=$1', [profile.email])).rows[0]
      if (existing) {
        await pool.query(
          `UPDATE consumers SET name=$2, age_band=$3, city=$4, province=$5, interests=$6, household=$7,
           birch_license_ok=$8, consent_product=$9, updated_at=NOW() WHERE email=$1`,
          [profile.email, profile.name, profile.age_band, profile.city, profile.province, profile.interests, profile.household, profile.birch_license_ok, profile.consent_product !== false],
        )
        return (await pool.query('SELECT * FROM consumers WHERE email=$1', [profile.email])).rows[0]
      }
      const id = uid()
      const stamp = nowIso()
      await pool.query(
        `INSERT INTO consumers (id,email,name,age_band,city,province,interests,household,birch_license_ok,consent_product,bonus_applies,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$11)`,
        [id, profile.email, profile.name, profile.age_band, profile.city, profile.province, profile.interests, profile.household, profile.birch_license_ok, true, stamp],
      )
      return (await pool.query('SELECT * FROM consumers WHERE email=$1', [profile.email])).rows[0]
    },

    async spinJackpot(email) {
      const row = (await pool.query('SELECT * FROM consumers WHERE email=$1', [email])).rows[0]
      if (!row) throw new Error('consumer_not_found')
      if (row.jackpot_spun_at) return row
      await pool.query(
        `UPDATE consumers SET jackpot_spun_at=NOW(), bonus_applies=bonus_applies+10, updated_at=NOW() WHERE email=$1`,
        [email],
      )
      return (await pool.query('SELECT * FROM consumers WHERE email=$1', [email])).rows[0]
    },

    async listBirchLicensedConsumers() {
      const { rows } = await pool.query(
        `SELECT email,name,age_band,city,province,interests,household,created_at FROM consumers WHERE birch_license_ok=TRUE ORDER BY created_at DESC`,
      )
      return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }))
    },

    async createPartnerSubmission(row) {
      await pool.query(
        `INSERT INTO partner_submissions (id,kind,name,company,email,phone,about,contest_blurb,status,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [row.id, row.kind, row.name, row.company, row.email, row.phone, row.about, row.contest_blurb, row.status, row.created_at],
      )
      return row
    },

    async createFeaturedContest(row) {
      await pool.query(
        `INSERT INTO featured_contests (id,slug,brand_name,prize_blurb,image_url,cta_label,cta_url,contact_email,approved,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9)`,
        [row.id, row.slug, row.brand_name, row.prize_blurb, row.image_url, row.cta_label, row.cta_url, row.contact_email, row.created_at],
      )
      return row
    },

    async getFeaturedContest(slug) {
      const { rows } = await pool.query('SELECT * FROM featured_contests WHERE slug=$1', [String(slug).toLowerCase()])
      const r = rows[0]
      if (!r) return null
      return { ...r, approved: Boolean(r.approved), approved_at: iso(r.approved_at), created_at: iso(r.created_at) }
    },

    async approveFeaturedContest(slug) {
      await pool.query(`UPDATE featured_contests SET approved=TRUE, approved_at=NOW() WHERE slug=$1`, [String(slug).toLowerCase()])
      return this.getFeaturedContest(slug)
    },

    async recordAudienceConsent({ email, source, planInterest, consentVersion, sessionHash }) {
      const clean = String(email || '').trim().toLowerCase()
      if (!clean) throw new Error('email_required')
      const src = String(source || 'waitlist').slice(0, 64)
      const version = String(consentVersion || 'waitlist_v1')
      const hash = String(sessionHash || '')
      if (!hash || hash.length < 32) throw new Error('session_hash_required')

      const existing = await pool.query(
        `SELECT session_hash, email, consent, consent_at, source, consent_version, plan_interest
         FROM audience_consents
         WHERE lower(email) = $1 AND consent = TRUE
         ORDER BY consent_at DESC LIMIT 1`,
        [clean],
      )
      if (existing.rows[0]) {
        return { ok: true, existing: true, email: existing.rows[0].email, source: existing.rows[0].source }
      }

      await pool.query(
        `INSERT INTO audience_sessions (session_hash, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         ON CONFLICT (session_hash) DO NOTHING`,
        [hash],
      )
      await pool.query(
        `INSERT INTO audience_consents
           (session_hash, email, consent, consent_at, consent_version, source, plan_interest, created_at, updated_at)
         VALUES ($1, $2, TRUE, NOW(), $3, $4, $5, NOW(), NOW())`,
        [hash, clean, version, src, planInterest || null],
      )
      return { ok: true, existing: false, email: clean, source: src }
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
