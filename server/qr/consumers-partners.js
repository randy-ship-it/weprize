/**
 * Consumer survey / jackpot + partner submit / featured landings.
 * Uses store methods when present; falls back to in-memory+json file via getStore extensions.
 */
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { nowIso } from '../ids.js'

export function createConsumersPartnersRouter({ getStore }) {
  const router = Router()

  function adminOk(req) {
    const secret = process.env.WEPRIZE_QR_ADMIN_SECRET || ''
    if (!secret) return false
    const hdr = req.get('X-WePrize-QR-Admin') || ''
    return hdr === secret || req.query?.admin_secret === secret
  }

  function emailOk(e) {
    const v = String(e || '').trim().toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
  }

  // —— Survey + jackpot (+10 bonus applies) ——
  router.post('/consumers/survey', async (req, res) => {
    try {
      const store = await getStore()
      const email = emailOk(req.body?.email)
      if (!email) return res.status(400).json({ error: 'invalid_email' })
      const name = String(req.body?.name || '').trim().slice(0, 120)
      if (!name) return res.status(400).json({ error: 'name_required' })

      const profile = {
        email,
        name,
        age_band: String(req.body?.age_band || '').slice(0, 20),
        city: String(req.body?.city || '').slice(0, 80),
        province: String(req.body?.province || '').slice(0, 40),
        interests: String(req.body?.interests || '').slice(0, 2000),
        household: String(req.body?.household || '').slice(0, 40),
        birch_license_ok: req.body?.birch_license_ok === true,
        consent_product: true,
      }

      const saved = await store.upsertConsumerProfile(profile)
      if (saved.jackpot_spun_at) {
        return res.json({
          ok: true,
          jackpot_already: true,
          bonus_applies: saved.bonus_applies || 10,
          birch_license_ok: saved.birch_license_ok,
        })
      }
      const freeCount = Math.min(15, Math.max(10, Number(req.body?.free_count) || 10))
      const spun = await store.spinJackpot(email, freeCount)
      res.status(201).json({
        ok: true,
        jackpot_already: false,
        bonus_applies: spun.bonus_applies,
        jackpot_spun_at: spun.jackpot_spun_at,
        birch_license_ok: saved.birch_license_ok,
      })
    } catch (err) {
      console.error('[consumers/survey]', err)
      res.status(500).json({ error: 'server_error', message: err?.message })
    }
  })

  router.get('/admin/consumers/birch-export', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    try {
      const store = await getStore()
      const format = String(req.query.format || 'json')
      const rows = await store.listBirchLicensedConsumers()
      if (format === 'csv') {
        const cols = ['email', 'name', 'age_band', 'city', 'province', 'interests', 'household', 'created_at']
        const lines = [cols.join(',')]
        for (const r of rows) {
          lines.push(cols.map((c) => csvEscape(r[c])).join(','))
        }
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="birch-consumers.csv"')
        return res.send(lines.join('\n'))
      }
      res.json({
        count: rows.length,
        note: 'Only birch_license_ok=true. For Birch Reserve bot / monetization later.',
        rows,
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })

  // —— Partners ——
  router.post('/partners/submit', async (req, res) => {
    try {
      const store = await getStore()
      const email = emailOk(req.body?.email)
      if (!email) return res.status(400).json({ error: 'invalid_email' })
      const row = await store.createPartnerSubmission({
        id: randomUUID(),
        kind: req.body?.kind === 'host_request' ? 'host_request' : 'partnership',
        name: String(req.body?.name || '').slice(0, 120),
        company: String(req.body?.company || '').slice(0, 120),
        email,
        phone: String(req.body?.phone || '').slice(0, 40),
        about: String(req.body?.about || '').slice(0, 2000),
        contest_blurb: String(req.body?.contest_blurb || '').slice(0, 2000),
        status: req.body?.kind === 'host_request' ? 'host_request' : 'received',
        created_at: nowIso(),
      })
      // optional Resend notify if configured (best-effort)
      tryNotifyPartner(row)
      res.status(201).json({ ok: true, id: row.id, status: row.status })
    } catch (err) {
      console.error('[partners/submit]', err)
      res.status(500).json({ error: 'server_error' })
    }
  })

  router.post('/partners/featured', async (req, res) => {
    try {
      const store = await getStore()
      const email = emailOk(req.body?.contact_email)
      if (!email) return res.status(400).json({ error: 'invalid_email' })
      const slug = String(req.body?.slug || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 64)
      if (!slug) return res.status(400).json({ error: 'slug_required' })
      const row = await store.createFeaturedContest({
        id: randomUUID(),
        slug,
        brand_name: String(req.body?.brand_name || '').slice(0, 120),
        prize_blurb: String(req.body?.prize_blurb || '').slice(0, 1000),
        image_url: String(req.body?.image_url || '').slice(0, 500),
        cta_label: String(req.body?.cta_label || 'Learn more').slice(0, 60),
        cta_url: String(req.body?.cta_url || '').slice(0, 500),
        contact_email: email,
        approved: false,
        created_at: nowIso(),
      })
      res.status(201).json({ ok: true, slug: row.slug, approved: false })
    } catch (err) {
      console.error('[partners/featured]', err)
      res.status(500).json({ error: 'server_error', message: err?.message })
    }
  })

  router.get('/partners/featured/:slug', async (req, res) => {
    try {
      const store = await getStore()
      const row = await store.getFeaturedContest(req.params.slug)
      if (!row) return res.status(404).json({ error: 'not_found' })
      if (!row.approved && process.env.ALLOW_UNAPPROVED_FEATURED !== '1') {
        return res.status(404).json({ error: 'not_approved' })
      }
      res.json(row)
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })

  router.post('/admin/partners/featured/:slug/approve', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    const store = await getStore()
    const row = await store.approveFeaturedContest(req.params.slug)
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json(row)
  })

  return router
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function tryNotifyPartner(row) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const to = process.env.PARTNER_NOTIFY_EMAIL || process.env.RESEND_FROM
  if (!key || !from || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [String(to).replace(/.*</, '').replace(/>.*/, '')],
        subject: `[WePrize partner] ${row.kind} from ${row.name}`,
        text: JSON.stringify(row, null, 2),
      }),
    })
  } catch (err) {
    console.warn('[partners/notify]', err?.message || err)
  }
}
