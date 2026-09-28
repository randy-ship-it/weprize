/**
 * Local-only JSON file store (data/weprize.json).
 * TODO(prod): prefer DATABASE_URL Postgres. Do not use this file store in production
 * Autoscale with multiple instances — it is single-process and not durable across hosts.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { nowIso, orderToken, uid } from './ids.js'
import { loadAutoOkSlice } from './contests.js'
import { slotsFor } from './packs.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(root, 'data')
const FILE = join(DATA_DIR, 'weprize.json')

function empty() {
  const stamp = new Date().toISOString()
  return {
    customers: [],
    orders: [],
    identities: [],
    assist_jobs: [],
    qr_settings: [
      { key: 'qr_affiliate_rate_bps', value: '5000', updated_at: stamp },
      { key: 'b2b_rep_rate_bps', value: '3500', updated_at: stamp },
      { key: 'b2b_rep_months', value: '24', updated_at: stamp },
      { key: 'trailer_multiple', value: '3', updated_at: stamp },
      { key: 'trailer_rate_bps', value: '1500', updated_at: stamp },
    ],
    qr_codes: [],
    qr_earnings: [],
    sticker_orders: [],
    b2b_reps: [],
    b2b_placements: [],
    qr_split_ledger: [],
    consumers: [],
    partner_submissions: [],
    featured_contests: [],
  }
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
      qr_settings: parsed.qr_settings || [
        { key: 'qr_affiliate_rate_bps', value: '5000', updated_at: new Date().toISOString() },
        { key: 'b2b_rep_rate_bps', value: '3500', updated_at: new Date().toISOString() },
        { key: 'b2b_rep_months', value: '24', updated_at: new Date().toISOString() },
        { key: 'trailer_multiple', value: '3', updated_at: new Date().toISOString() },
        { key: 'trailer_rate_bps', value: '1500', updated_at: new Date().toISOString() },
      ],
      qr_codes: parsed.qr_codes || [],
      qr_earnings: parsed.qr_earnings || [],
      sticker_orders: parsed.sticker_orders || [],
      b2b_reps: parsed.b2b_reps || [],
      b2b_placements: parsed.b2b_placements || [],
      qr_split_ledger: parsed.qr_split_ledger || [],
      consumers: parsed.consumers || [],
      partner_submissions: parsed.partner_submissions || [],
      featured_contests: parsed.featured_contests || [],
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


function shortCode(len = 7) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
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


    async getQrSetting(key, fallback = null) {
      const db = load()
      const row = (db.qr_settings || []).find((s) => s.key === key)
      return row?.value ?? fallback
    },

    async setQrSetting(key, value) {
      return withLock(() => {
        const db = load()
        if (!db.qr_settings) db.qr_settings = []
        const stamp = nowIso()
        const existing = db.qr_settings.find((s) => s.key === key)
        if (existing) {
          existing.value = String(value)
          existing.updated_at = stamp
        } else {
          db.qr_settings.push({ key, value: String(value), updated_at: stamp })
        }
        save(db)
        return { key, value: String(value), updated_at: stamp }
      })
    },

    async getAffiliateRateBps() {
      const v = await this.getQrSetting('qr_affiliate_rate_bps', '5000')
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5000
    },

    async claimQrCode({ email, termsVersion, acceptedTermsAt, logoUrl, brandName, recruitedByRepId }) {
      return withLock(() => {
        const db = load()
        if (!db.qr_codes) db.qr_codes = []
        const existing = db.qr_codes.find((c) => c.email === email && !c.revoked_at)
        if (existing) {
          let changed = false
          if (logoUrl !== undefined && logoUrl !== existing.logo_url) {
            existing.logo_url = logoUrl || null
            changed = true
          }
          if (brandName !== undefined && brandName !== existing.brand_name) {
            existing.brand_name = brandName || null
            changed = true
          }
          if (changed) save(db)
          return { ...existing, existing: true }
        }
        let code
        for (let i = 0; i < 12; i++) {
          code = shortCode()
          if (!db.qr_codes.some((c) => c.code === code)) break
          code = null
        }
        if (!code) throw new Error('code_gen_failed')
        const stamp = acceptedTermsAt || nowIso()
        const row = {
          code,
          email,
          accepted_terms_at: stamp,
          terms_version: termsVersion,
          logo_url: logoUrl || null,
          brand_name: brandName || null,
          stripe_connect_account_id: null,
          created_at: stamp,
          revoked_at: null,
        }
        db.qr_codes.push(row)
        if (recruitedByRepId) {
          if (!db.b2b_placements) db.b2b_placements = []
          const exists = db.b2b_placements.find((p) => p.business_code === code)
          if (!exists) {
            db.b2b_placements.push({
              id: uid(),
              business_code: code,
              recruited_by_rep_id: recruitedByRepId,
              recruited_at: stamp,
              trailer_purchased_at: null,
              trailer_rate_bps: null,
              trailer_stripe_session_id: null,
              // BIRCH_RESERVE_AD_HOOK — nullable ad_slot / sponsored_placement for later
              ad_slot: null,
              sponsored_placement: null,
            })
          }
        }
        save(db)
        return { ...row, existing: false }
      })
    },

    async getQrCode(code) {
      if (!code) return null
      const db = load()
      const r = (db.qr_codes || []).find((c) => c.code === String(code).toLowerCase())
      return r || null
    },

    async updateQrCode(code, patch) {
      return withLock(() => {
        const db = load()
        const r = (db.qr_codes || []).find((c) => c.code === String(code).toLowerCase())
        if (!r) return null
        Object.assign(r, patch)
        save(db)
        return r
      })
    },

    async creditQrEarnings({ code, stripeSessionId, orderId, amountCents, currency }) {
      return withLock(() => {
        const db = load()
        if (!db.qr_earnings) db.qr_earnings = []
        const owner = (db.qr_codes || []).find((c) => c.code === String(code).toLowerCase())
        if (!owner || owner.revoked_at) return null
        const dup = db.qr_earnings.find((e) => e.stripe_session_id === stripeSessionId)
        if (dup) return { ...dup, duplicate: true }
        const rateRow = (db.qr_settings || []).find((s) => s.key === 'qr_affiliate_rate_bps')
        const rateBps = Math.floor(Number(rateRow?.value ?? 5000)) || 5000
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
          transfer_id: null,
          created_at: nowIso(),
        }
        db.qr_earnings.push(row)
        save(db)
        return row
      })
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
      const db = load()
      const ledger = (db.qr_earnings || [])
        .filter((e) => e.code === owner.code)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
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
      const db = load()
      return (db.qr_earnings || [])
        .filter((e) => e.status === 'owed')
        .slice(0, limit)
    },

    async markEarningsPaid(id, transferId) {
      return withLock(() => {
        const db = load()
        const row = (db.qr_earnings || []).find((e) => e.id === id)
        if (!row) return null
        row.status = 'paid'
        row.transfer_id = transferId || null
        row.paid_at = nowIso()
        save(db)
        return row
      })
    },

    async createStickerOrder({ email, refCode, stripeSessionId, amountCents, currency, shipping }) {
      return withLock(() => {
        const db = load()
        if (!db.sticker_orders) db.sticker_orders = []
        if (stripeSessionId) {
          const found = db.sticker_orders.find((o) => o.stripe_session_id === stripeSessionId)
          if (found) return found
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
        db.sticker_orders.push(row)
        save(db)
        return row
      })
    },


    async createB2bRep({ email, name, termsVersion, acceptedTermsAt }) {
      return withLock(() => {
        const db = load()
        if (!db.b2b_reps) db.b2b_reps = []
        const existing = db.b2b_reps.find((r) => r.email === email && !r.revoked_at)
        if (existing) return { ...existing, existing: true }
        const stamp = acceptedTermsAt || nowIso()
        const row = {
          id: uid(),
          email,
          name: name || null,
          stripe_connect_account_id: null,
          accepted_terms_at: stamp,
          terms_version: termsVersion,
          created_at: stamp,
          revoked_at: null,
          rep_code: shortCode(6),
        }
        // ensure unique rep_code
        while (db.b2b_reps.some((r) => r.rep_code === row.rep_code)) row.rep_code = shortCode(6)
        db.b2b_reps.push(row)
        save(db)
        return { ...row, existing: false }
      })
    },

    async getB2bRep(idOrCodeOrEmail) {
      const db = load()
      const q = String(idOrCodeOrEmail || '').toLowerCase()
      return (
        (db.b2b_reps || []).find(
          (r) =>
            r.id === idOrCodeOrEmail ||
            String(r.rep_code || '').toLowerCase() === q ||
            String(r.email || '').toLowerCase() === q,
        ) || null
      )
    },

    async updateB2bRep(id, patch) {
      return withLock(() => {
        const db = load()
        const r = (db.b2b_reps || []).find((x) => x.id === id)
        if (!r) return null
        Object.assign(r, patch)
        save(db)
        return r
      })
    },

    async getPlacementByCode(code) {
      const db = load()
      return (db.b2b_placements || []).find((p) => p.business_code === String(code).toLowerCase()) || null
    },

    async linkPlacement({ businessCode, repId }) {
      return withLock(() => {
        const db = load()
        if (!db.b2b_placements) db.b2b_placements = []
        let p = db.b2b_placements.find((x) => x.business_code === businessCode)
        if (p) {
          if (!p.recruited_by_rep_id) {
            p.recruited_by_rep_id = repId
            p.recruited_at = nowIso()
            save(db)
          }
          return p
        }
        p = {
          id: uid(),
          business_code: businessCode,
          recruited_by_rep_id: repId,
          recruited_at: nowIso(),
          trailer_purchased_at: null,
          trailer_rate_bps: null,
          trailer_stripe_session_id: null,
          ad_slot: null, // BIRCH_RESERVE_AD_HOOK
          sponsored_placement: null,
        }
        db.b2b_placements.push(p)
        save(db)
        return p
      })
    },

    async markTrailerPurchased({ businessCode, repId, stripeSessionId, trailerRateBps, priceCents, trailingRevenueCents }) {
      return withLock(() => {
        const db = load()
        const p = (db.b2b_placements || []).find(
          (x) => x.business_code === businessCode && x.recruited_by_rep_id === repId,
        )
        if (!p) return null
        if (p.trailer_purchased_at) return { ...p, duplicate: true }
        p.trailer_purchased_at = nowIso()
        p.trailer_rate_bps = trailerRateBps
        p.trailer_stripe_session_id = stripeSessionId
        p.trailer_price_cents = priceCents
        p.trailer_trailing_revenue_cents = trailingRevenueCents
        save(db)
        return p
      })
    },

    async recordSplitLedger(row) {
      return withLock(() => {
        const db = load()
        if (!db.qr_split_ledger) db.qr_split_ledger = []
        const dup = db.qr_split_ledger.find((e) => e.stripe_session_id === row.stripe_session_id)
        if (dup) return { ...dup, duplicate: true }
        db.qr_split_ledger.push({ ...row, created_at: nowIso() })
        save(db)
        return row
      })
    },

    async trailingRevenueCents(businessCode, months = 12) {
      const db = load()
      const since = new Date()
      since.setMonth(since.getMonth() - months)
      const sinceIso = since.toISOString()
      return (db.qr_split_ledger || [])
        .filter((e) => e.business_code === businessCode && String(e.created_at) >= sinceIso)
        .reduce((s, e) => s + (Number(e.purchase_amount_cents) || 0), 0)
    },

    async listRepBusinesses(repId) {
      const db = load()
      return (db.b2b_placements || []).filter((p) => p.recruited_by_rep_id === repId)
    },

    async listRepLedger(repId) {
      const db = load()
      return (db.qr_split_ledger || [])
        .filter((e) => e.rep_id === repId)
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    },

    async listOwedSplits(limit = 50) {
      const db = load()
      return (db.qr_split_ledger || []).filter((e) => e.status === 'owed').slice(0, limit)
    },

    async markSplitPaid(id, transferId, party) {
      return withLock(() => {
        const db = load()
        const row = (db.qr_split_ledger || []).find((e) => e.id === id)
        if (!row) return null
        if (party === 'host') {
          row.host_status = 'paid'
          row.host_transfer_id = transferId
        } else if (party === 'rep') {
          row.rep_status = 'paid'
          row.rep_transfer_id = transferId
        }
        if (
          (row.host_share_cents === 0 || row.host_status === 'paid') &&
          (row.rep_share_cents === 0 || row.rep_status === 'paid')
        ) {
          row.status = 'paid'
        }
        save(db)
        return row
      })
    },


    async upsertConsumerProfile(profile) {
      return withLock(() => {
        const db = load()
        if (!db.consumers) db.consumers = []
        let row = db.consumers.find((c) => c.email === profile.email)
        if (!row) {
          row = {
            id: uid(),
            ...profile,
            bonus_applies: 0,
            jackpot_spun_at: null,
            created_at: nowIso(),
            updated_at: nowIso(),
          }
          db.consumers.push(row)
        } else {
          Object.assign(row, profile, { updated_at: nowIso() })
        }
        save(db)
        return row
      })
    },

    async spinJackpot(email) {
      return withLock(() => {
        const db = load()
        const row = (db.consumers || []).find((c) => c.email === email)
        if (!row) throw new Error('consumer_not_found')
        if (row.jackpot_spun_at) return row
        row.jackpot_spun_at = nowIso()
        row.bonus_applies = (Number(row.bonus_applies) || 0) + 10
        row.updated_at = nowIso()
        save(db)
        return row
      })
    },

    async listBirchLicensedConsumers() {
      const db = load()
      return (db.consumers || [])
        .filter((c) => c.birch_license_ok === true)
        .map((c) => ({
          email: c.email,
          name: c.name,
          age_band: c.age_band,
          city: c.city,
          province: c.province,
          interests: c.interests,
          household: c.household,
          created_at: c.created_at,
        }))
    },

    async createPartnerSubmission(row) {
      return withLock(() => {
        const db = load()
        if (!db.partner_submissions) db.partner_submissions = []
        db.partner_submissions.push(row)
        save(db)
        return row
      })
    },

    async createFeaturedContest(row) {
      return withLock(() => {
        const db = load()
        if (!db.featured_contests) db.featured_contests = []
        if (db.featured_contests.some((f) => f.slug === row.slug)) {
          const err = new Error('slug_taken')
          err.status = 400
          throw err
        }
        db.featured_contests.push(row)
        save(db)
        return row
      })
    },

    async getFeaturedContest(slug) {
      const db = load()
      return (db.featured_contests || []).find((f) => f.slug === String(slug).toLowerCase()) || null
    },

    async approveFeaturedContest(slug) {
      return withLock(() => {
        const db = load()
        const row = (db.featured_contests || []).find((f) => f.slug === String(slug).toLowerCase())
        if (!row) return null
        row.approved = true
        row.approved_at = nowIso()
        save(db)
        return row
      })
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
