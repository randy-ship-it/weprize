/**
 * QR affiliate / DIY stickers / Connect payout stubs.
 */
import { Router } from 'express'
import {
  APP_BASE,
  B2B_TERMS_TEXT,
  B2B_TERMS_VERSION,
  B2B_TRAILER_TERMS_SNIPPET,
  DEFAULT_AFFILIATE_RATE_BPS,
  DEFAULT_B2B_REP_MONTHS,
  DEFAULT_B2B_REP_RATE_BPS,
  DEFAULT_TRAILER_MULTIPLE,
  DEFAULT_TRAILER_RATE_BPS,
  JINGLES,
  QR_TERMS_TEXT,
  QR_TERMS_VERSION,
  SETTING_B2B_REP_MONTHS,
  SETTING_B2B_REP_RATE_BPS,
  SETTING_RATE_BPS,
  SETTING_TRAILER_MULTIPLE,
  SETTING_TRAILER_RATE_BPS,
  STICKER_SKU,
  TRAILER_WARN_DAYS,
  addMonths,
  resolveRepRateBps,
  shareUrlFor,
} from './constants.js'
import { loadRateBundle } from './ledger.js'
import { buildStickerPdf, listLayouts } from './sticker-pdf.js'

export function createQrRouter({ getStore, stripe }) {
  const router = Router()

  function adminOk(req) {
    const secret = process.env.WEPRIZE_QR_ADMIN_SECRET || ''
    if (!secret) return false
    const hdr = req.get('X-WePrize-QR-Admin') || req.get('x-weprize-qr-admin') || ''
    const q = req.query?.admin_secret || ''
    return hdr === secret || q === secret
  }

  function normalizeEmail(email) {
    const e = String(email || '')
      .trim()
      .toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null
    return e
  }

  function sanitizeLogoUrl(url) {
    if (!url) return null
    const s = String(url).trim()
    if (!s) return null
    if (s.length > 2048) return null
    try {
      const u = new URL(s)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
      return u.toString()
    } catch {
      return null
    }
  }

  router.get('/meta', async (_req, res) => {
    try {
      const store = await getStore()
      const rateBps = await store.getAffiliateRateBps()
      res.json({
        terms_version: QR_TERMS_VERSION,
        terms_text: QR_TERMS_TEXT,
        rate_bps: rateBps,
        rate_percent: rateBps / 100,
        jingles: JINGLES,
        layouts: listLayouts(),
        sticker_sku: STICKER_SKU,
        positioning: 'Do it yourself. Become a revenue distributor.',
        placement_ideas: [
          'Gambling / lottery stations in stores',
          'Restaurant table seats / menus',
          'Sports teams & local clubs',
          'Individuals sharing with friends',
          'Businesses (front counter, receipts, windows)',
        ],
        b2b: {
          terms_version: B2B_TERMS_VERSION,
          terms_text: B2B_TERMS_TEXT,
          trailer_snippet: B2B_TRAILER_TERMS_SNIPPET,
          pitch:
            'Get convenience stores signed up. They get a big commission. You get 35% of WePrize\'s cut for 24 months — then buy a Trailer to keep 15% forever.',
        },
        // BIRCH_RESERVE_AD_HOOK — QR surfaces can later host Birch Reserve sold ad spots
        birch_ad_hook: true,
      })
    } catch (err) {
      console.error('[qr/meta]', err)
      res.status(500).json({ error: 'server_error' })
    }
  })

  /** Claim or return existing code. Requires agree + terms. Optional logo_url / brand_name. */
  router.post('/claim', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email)
      if (!email) return res.status(400).json({ error: 'invalid_email' })
      const agree = req.body?.agree === true || req.body?.accepted_terms === true
      if (!agree) {
        return res.status(400).json({
          error: 'terms_required',
          message: 'You must agree to the QR distributor terms to claim a code.',
          terms_version: QR_TERMS_VERSION,
          terms_text: QR_TERMS_TEXT,
        })
      }
      const logoUrl = sanitizeLogoUrl(req.body?.logo_url || req.body?.logoUrl)
      const brandName = req.body?.brand_name || req.body?.brandName
        ? String(req.body.brand_name || req.body.brandName).trim().slice(0, 80)
        : null

      const store = await getStore()
      let recruitedByRepId = null
      const recruitedBy = req.body?.recruited_by || req.body?.recruitedBy || req.body?.rep_code
      if (recruitedBy && typeof store.getB2bRep === 'function') {
        const rep = await store.getB2bRep(String(recruitedBy).trim())
        if (rep) recruitedByRepId = rep.id
      }

      const row = await store.claimQrCode({
        email,
        termsVersion: QR_TERMS_VERSION,
        acceptedTermsAt: new Date().toISOString(),
        logoUrl,
        brandName,
        recruitedByRepId,
      })
      const rateBps = await store.getAffiliateRateBps()
      const shareUrl = shareUrlFor(row.code)
      res.status(row.existing ? 200 : 201).json({
        code: row.code,
        email: row.email,
        share_url: shareUrl,
        ref_url: `${APP_BASE()}/?ref=${encodeURIComponent(row.code)}`,
        sticker_pdf_url: `/api/qr/${row.code}/sticker.pdf`,
        accepted_terms_at: row.accepted_terms_at,
        terms_version: row.terms_version,
        logo_url: row.logo_url || null,
        brand_name: row.brand_name || null,
        stripe_connect_account_id: row.stripe_connect_account_id || null,
        rate_bps: rateBps,
        rate_percent: rateBps / 100,
        existing: Boolean(row.existing),
        jingles: JINGLES,
        connect_ready: Boolean(stripe && process.env.STRIPE_SECRET_KEY),
      })
    } catch (err) {
      console.error('[qr/claim]', err)
      res.status(500).json({ error: 'server_error', message: err?.message })
    }
  })

  /** Public resolve — used by SPA /r/:code or as JSON. */
  router.get('/resolve/:code', async (req, res) => {
    try {
      const store = await getStore()
      const row = await store.getQrCode(req.params.code)
      if (!row || row.revoked_at) return res.status(404).json({ error: 'code_not_found' })
      res.json({
        code: row.code,
        logo_url: row.logo_url || null,
        brand_name: row.brand_name || null,
        share_url: shareUrlFor(row.code),
        redirect: '/pricing',
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })

  router.get('/:code/sticker.pdf', async (req, res) => {
    try {
      const store = await getStore()
      const row = await store.getQrCode(req.params.code)
      if (!row || row.revoked_at) return res.status(404).json({ error: 'code_not_found' })
      const layout = String(req.query.layout || 'medium')
      const pdf = await buildStickerPdf(row.code, layout, {
        logoUrl: row.logo_url,
        brandName: row.brand_name,
      })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="weprize-stickers-${row.code}-${layout}.pdf"`,
      )
      res.send(pdf)
    } catch (err) {
      console.error('[qr/sticker.pdf]', err)
      res.status(500).json({ error: 'pdf_failed', message: err?.message })
    }
  })

  router.get('/:code/earnings', async (req, res) => {
    try {
      const email = normalizeEmail(req.query.email)
      if (!email) return res.status(400).json({ error: 'email_required' })
      const store = await getStore()
      const data = await store.getQrEarnings(req.params.code, email)
      if (!data) return res.status(404).json({ error: 'code_not_found' })
      res.json(data)
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: err.code || 'forbidden' })
      console.error('[qr/earnings]', err)
      res.status(500).json({ error: 'server_error' })
    }
  })

  /** Patch co-brand after claim (email verify). */
  router.post('/:code/branding', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email)
      const store = await getStore()
      const row = await store.getQrCode(req.params.code)
      if (!row || row.revoked_at) return res.status(404).json({ error: 'code_not_found' })
      if (!email || email !== String(row.email).toLowerCase()) {
        return res.status(403).json({ error: 'email_mismatch' })
      }
      const logoUrl = sanitizeLogoUrl(req.body?.logo_url || req.body?.logoUrl)
      const brandName =
        req.body?.brand_name || req.body?.brandName
          ? String(req.body.brand_name || req.body.brandName).trim().slice(0, 80)
          : null
      const updated = await store.updateQrCode(row.code, {
        logo_url: logoUrl,
        brand_name: brandName,
      })
      res.json({
        code: updated.code,
        logo_url: updated.logo_url,
        brand_name: updated.brand_name,
        share_url: shareUrlFor(updated.code),
      })
    } catch (err) {
      console.error('[qr/branding]', err)
      res.status(500).json({ error: 'server_error' })
    }
  })

  /** Stripe Connect Express onboarding link (optional — claim/PDF work without it). */
  router.post('/:code/connect/onboard', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          error: 'stripe_not_configured',
          hint: 'Set STRIPE_SECRET_KEY. Enable Connect in Stripe Dashboard (see STATUS.md).',
        })
      }
      const email = normalizeEmail(req.body?.email)
      const store = await getStore()
      const row = await store.getQrCode(req.params.code)
      if (!row || row.revoked_at) return res.status(404).json({ error: 'code_not_found' })
      if (!email || email !== String(row.email).toLowerCase()) {
        return res.status(403).json({ error: 'email_mismatch' })
      }

      let accountId = row.stripe_connect_account_id
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: row.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_profile: {
            product_description: 'WePrize QR affiliate / revenue distributor',
          },
          metadata: { weprize_qr_code: row.code },
        })
        accountId = account.id
        await store.updateQrCode(row.code, { stripe_connect_account_id: accountId })
      }

      const base = APP_BASE()
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${base}/qr?connect=refresh&code=${encodeURIComponent(row.code)}`,
        return_url: `${base}/qr?connect=return&code=${encodeURIComponent(row.code)}`,
        type: 'account_onboarding',
      })
      res.json({
        code: row.code,
        stripe_connect_account_id: accountId,
        url: link.url,
      })
    } catch (err) {
      console.error('[qr/connect/onboard]', err)
      res.status(500).json({
        error: 'connect_onboard_failed',
        message: err?.message,
        hint: 'Enable Stripe Connect (Express) in Dashboard if not already.',
      })
    }
  })

  /** Admin: change affiliate rate_bps without redeploy. */
  router.post('/admin/rate', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    try {
      const rateBps = Number(req.body?.rate_bps)
      if (!Number.isFinite(rateBps) || rateBps < 0 || rateBps > 10000) {
        return res.status(400).json({ error: 'invalid_rate_bps', hint: '0–10000 (5000 = 50%)' })
      }
      const store = await getStore()
      await store.setQrSetting(SETTING_RATE_BPS, Math.floor(rateBps))
      res.json({
        key: SETTING_RATE_BPS,
        rate_bps: Math.floor(rateBps),
        rate_percent: Math.floor(rateBps) / 100,
        default_was: DEFAULT_AFFILIATE_RATE_BPS,
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })

  router.get('/admin/rate', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    const store = await getStore()
    const rateBps = await store.getAffiliateRateBps()
    res.json({ rate_bps: rateBps, rate_percent: rateBps / 100 })
  })

  /**
   * Admin/cron stub: create Connect transfers for owed earnings where owner is connected.
   * Does not run automatically — call with admin secret.
   */
  router.post('/admin/payout-owed', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' })
    try {
      const store = await getStore()
      const limit = Math.min(100, Number(req.body?.limit) || 25)
      const dryRun = req.body?.dry_run === true
      const owed = await store.listOwedEarnings(limit)
      const results = []
      for (const row of owed) {
        const owner = await store.getQrCode(row.code)
        if (!owner?.stripe_connect_account_id) {
          results.push({ id: row.id, code: row.code, status: 'skipped_no_connect' })
          continue
        }
        if (dryRun) {
          results.push({
            id: row.id,
            code: row.code,
            credit_cents: row.credit_cents,
            status: 'dry_run',
            destination: owner.stripe_connect_account_id,
          })
          continue
        }
        try {
          const transfer = await stripe.transfers.create({
            amount: row.credit_cents,
            currency: row.currency || 'cad',
            destination: owner.stripe_connect_account_id,
            transfer_group: `weprize_qr_${row.code}`,
            metadata: {
              qr_earning_id: row.id,
              qr_code: row.code,
            },
          })
          await store.markEarningsPaid(row.id, transfer.id)
          results.push({
            id: row.id,
            code: row.code,
            credit_cents: row.credit_cents,
            status: 'paid',
            transfer_id: transfer.id,
          })
        } catch (err) {
          results.push({
            id: row.id,
            code: row.code,
            status: 'transfer_failed',
            message: err?.message,
          })
        }
      }
      res.json({ processed: results.length, results })
    } catch (err) {
      console.error('[qr/admin/payout-owed]', err)
      res.status(500).json({ error: 'server_error', message: err?.message })
    }
  })

  /** Create Checkout Session for hard stickers (uses existing STRIPE_SECRET_KEY). */
  router.post('/stickers/checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          error: 'stripe_not_configured',
          sku: STICKER_SKU,
          hint: 'Create Payment Link in Dashboard for sticker_50 or set STRIPE_SECRET_KEY for Checkout Sessions.',
        })
      }
      const email = normalizeEmail(req.body?.email)
      const ref =
        req.body?.ref || req.body?.client_reference_id
          ? String(req.body.ref || req.body.client_reference_id)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 16)
          : null
      const base = APP_BASE()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email || undefined,
        client_reference_id: ref || undefined,
        shipping_address_collection: { allowed_countries: ['CA', 'US'] },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: STICKER_SKU.currency,
              unit_amount: STICKER_SKU.amount_cents,
              product_data: {
                name: STICKER_SKU.name,
                description: 'Physical stickers shipped. Manual fulfill night-1. ' + STICKER_SKU.cogs_note,
              },
            },
          },
        ],
        metadata: {
          pack: STICKER_SKU.id,
          weprize_ref: ref || '',
        },
        success_url: `${base}/qr?sticker=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/qr?sticker=cancel`,
      })
      res.json({ url: session.url, session_id: session.id, sku: STICKER_SKU })
    } catch (err) {
      console.error('[qr/stickers/checkout]', err)
      res.status(500).json({ error: 'checkout_failed', message: err?.message })
    }
  })


  // —— B2B rep signup ——
  router.post('/b2b/claim', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email)
      if (!email) return res.status(400).json({ error: 'invalid_email' })
      const agree = req.body?.agree === true
      if (!agree) {
        return res.status(400).json({
          error: 'terms_required',
          terms_version: B2B_TERMS_VERSION,
          terms_text: B2B_TERMS_TEXT,
          trailer_snippet: B2B_TRAILER_TERMS_SNIPPET,
        })
      }
      const name = req.body?.name ? String(req.body.name).trim().slice(0, 80) : null
      const store = await getStore()
      const row = await store.createB2bRep({
        email,
        name,
        termsVersion: B2B_TERMS_VERSION,
        acceptedTermsAt: new Date().toISOString(),
      })
      const rates = await loadRateBundle(store)
      res.status(row.existing ? 200 : 201).json({
        ...row,
        rates,
        share_pitch:
          "Get convenience stores signed up. They get a big commission. You get 35% of WePrize's cut.",
        trailer_snippet: B2B_TRAILER_TERMS_SNIPPET,
      })
    } catch (err) {
      console.error('[qr/b2b/claim]', err)
      res.status(500).json({ error: 'server_error', message: err?.message })
    }
  })

  router.get('/b2b/:repCode/dashboard', async (req, res) => {
    try {
      const email = normalizeEmail(req.query.email)
      const store = await getStore()
      const rep = await store.getB2bRep(req.params.repCode)
      if (!rep) return res.status(404).json({ error: 'rep_not_found' })
      if (!email || email !== String(rep.email).toLowerCase()) {
        return res.status(403).json({ error: 'email_mismatch' })
      }
      const rates = await loadRateBundle(store)
      const businesses = await store.listRepBusinesses(rep.id)
      const ledger = await store.listRepLedger(rep.id)
      const now = new Date()
      const enriched = []
      for (const b of businesses) {
        const trailing = await store.trailingRevenueCents(b.business_code, 12)
        const multiple = Number(await store.getQrSetting(SETTING_TRAILER_MULTIPLE, String(DEFAULT_TRAILER_MULTIPLE))) || 3
        const trailerPrice = Math.floor(trailing * multiple)
        const end = b.recruited_at ? addMonths(b.recruited_at, rates.b2b_rep_months) : null
        const daysLeft = end ? Math.ceil((end - now) / (86400000)) : null
        const { rate_bps, rule } = resolveRepRateBps({
          recruitedAt: b.recruited_at,
          repMonths: rates.b2b_rep_months,
          trailerPurchasedAt: b.trailer_purchased_at,
          inWindowRateBps: rates.b2b_rep_rate_bps,
          trailerRateBps: b.trailer_rate_bps || rates.trailer_rate_bps,
          now,
        })
        const showTrailerCta =
          !b.trailer_purchased_at &&
          (rule === 'expired' || (daysLeft !== null && daysLeft <= TRAILER_WARN_DAYS))
        enriched.push({
          ...b,
          trailing_revenue_cents_12m: trailing,
          trailer_price_cents: trailerPrice,
          trailer_multiple: multiple,
          days_left_in_window: daysLeft,
          active_rep_rate_bps: rate_bps,
          active_rule: rule,
          show_trailer_cta: showTrailerCta,
          window_ends_at: end ? end.toISOString() : null,
        })
      }
      const owed = ledger.filter((e) => e.status === 'owed').reduce((s, e) => s + (e.rep_share_cents || 0), 0)
      const paid = ledger.filter((e) => e.status === 'paid' || e.rep_status === 'paid').reduce((s, e) => s + (e.rep_share_cents || 0), 0)
      res.json({
        rep: {
          id: rep.id,
          email: rep.email,
          name: rep.name,
          rep_code: rep.rep_code,
          stripe_connect_account_id: rep.stripe_connect_account_id,
        },
        rates,
        businesses: enriched,
        owed_cents: owed,
        paid_cents: paid,
        ledger: ledger.slice(0, 50),
        trailer_snippet: B2B_TRAILER_TERMS_SNIPPET,
      })
    } catch (err) {
      console.error('[qr/b2b/dashboard]', err)
      res.status(500).json({ error: 'server_error' })
    }
  })

  router.post('/b2b/:repCode/connect/onboard', async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' })
      const email = normalizeEmail(req.body?.email)
      const store = await getStore()
      const rep = await store.getB2bRep(req.params.repCode)
      if (!rep) return res.status(404).json({ error: 'rep_not_found' })
      if (!email || email !== String(rep.email).toLowerCase()) {
        return res.status(403).json({ error: 'email_mismatch' })
      }
      let accountId = rep.stripe_connect_account_id
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: rep.email,
          capabilities: { transfers: { requested: true } },
          metadata: { weprize_b2b_rep: rep.id, rep_code: rep.rep_code },
        })
        accountId = account.id
        await store.updateB2bRep(rep.id, { stripe_connect_account_id: accountId })
      }
      const base = APP_BASE()
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${base}/qr/b2b?connect=refresh&rep=${encodeURIComponent(rep.rep_code)}`,
        return_url: `${base}/qr/b2b?connect=return&rep=${encodeURIComponent(rep.rep_code)}`,
        type: 'account_onboarding',
      })
      res.json({ url: link.url, stripe_connect_account_id: accountId })
    } catch (err) {
      console.error('[qr/b2b/connect]', err)
      res.status(500).json({ error: 'connect_failed', message: err?.message })
    }
  })

  /** Trailer Checkout — 3× trailing 12mo revenue → perpetual trailer_rate_bps */
  router.post('/b2b/:repCode/trailer/checkout', async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' })
      const email = normalizeEmail(req.body?.email)
      const businessCode = String(req.body?.business_code || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const store = await getStore()
      const rep = await store.getB2bRep(req.params.repCode)
      if (!rep) return res.status(404).json({ error: 'rep_not_found' })
      if (!email || email !== String(rep.email).toLowerCase()) {
        return res.status(403).json({ error: 'email_mismatch' })
      }
      const placement = await store.getPlacementByCode(businessCode)
      if (!placement || placement.recruited_by_rep_id !== rep.id) {
        return res.status(404).json({ error: 'placement_not_found' })
      }
      if (placement.trailer_purchased_at) {
        return res.status(400).json({ error: 'trailer_already_purchased' })
      }
      const trailing = await store.trailingRevenueCents(businessCode, 12)
      const multiple = Number(await store.getQrSetting(SETTING_TRAILER_MULTIPLE, String(DEFAULT_TRAILER_MULTIPLE))) || 3
      const rates = await loadRateBundle(store)
      const priceCents = Math.max(100, Math.floor(trailing * multiple)) // min $1
      const base = APP_BASE()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'cad',
              unit_amount: priceCents,
              product_data: {
                name: `WePrize Trailer — ${businessCode}`,
                description: `Lock ${rates.trailer_rate_bps / 100}% of WePrize share forever on this business. 3× trailing 12mo ($${(trailing / 100).toFixed(2)} × ${multiple}).`,
              },
            },
          },
        ],
        metadata: {
          weprize_product: 'b2b_trailer',
          rep_id: rep.id,
          business_code: businessCode,
          trailing_revenue_cents: String(trailing),
          trailer_rate_bps: String(rates.trailer_rate_bps),
          price_cents: String(priceCents),
        },
        success_url: `${base}/qr/b2b?trailer=success&rep=${encodeURIComponent(rep.rep_code)}`,
        cancel_url: `${base}/qr/b2b?trailer=cancel&rep=${encodeURIComponent(rep.rep_code)}`,
      })
      res.json({
        url: session.url,
        session_id: session.id,
        trailing_revenue_cents: trailing,
        trailer_multiple: multiple,
        price_cents: priceCents,
        trailer_rate_bps: rates.trailer_rate_bps,
      })
    } catch (err) {
      console.error('[qr/b2b/trailer]', err)
      res.status(500).json({ error: 'trailer_checkout_failed', message: err?.message })
    }
  })

  /** Admin: set B2B / trailer knobs */
  router.post('/admin/b2b-settings', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'unauthorized' })
    try {
      const store = await getStore()
      const out = {}
      const map = {
        b2b_rep_rate_bps: SETTING_B2B_REP_RATE_BPS,
        b2b_rep_months: SETTING_B2B_REP_MONTHS,
        trailer_multiple: SETTING_TRAILER_MULTIPLE,
        trailer_rate_bps: SETTING_TRAILER_RATE_BPS,
        qr_affiliate_rate_bps: SETTING_RATE_BPS,
      }
      for (const [bodyKey, settingKey] of Object.entries(map)) {
        if (req.body?.[bodyKey] !== undefined) {
          const n = Number(req.body[bodyKey])
          if (!Number.isFinite(n) || n < 0) continue
          await store.setQrSetting(settingKey, Math.floor(n))
          out[bodyKey] = Math.floor(n)
        }
      }
      res.json({ updated: out, bundle: await loadRateBundle(store) })
    } catch (err) {
      res.status(500).json({ error: 'server_error' })
    }
  })


  return router
}
