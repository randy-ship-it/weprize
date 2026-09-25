/**
 * WePrize Express — SPA (dist/) + Stripe webhook + orders + identity + assist queue.
 * Bind 0.0.0.0:PORT (default 5000) for Replit Autoscale.
 */
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import { getStore } from './db.js'
import { normalizeIdentity, publicIdentity } from './identity.js'
import { inferPack } from './packs.js'
import { publicJob, publicOrder, humanNeedsYou } from './public.js'
import { maybeNudgeNeedsYou, resendConfigured } from './nudge.js'
import { seedMeta } from './contests.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const PORT = Number(process.env.PORT) || 5000

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

const app = express()
app.set('trust proxy', 1)

/** Stripe webhook needs raw body BEFORE json parser. */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const store = await getStore()
    let event
    if (stripe && webhookSecret) {
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } else if (process.env.ALLOW_UNSIGNED_WEBHOOK === '1') {
      event = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString('utf8'))
        : req.body
      console.warn('[webhook] ALLOW_UNSIGNED_WEBHOOK=1 — unsigned event accepted (dev only)')
    } else {
      return res.status(503).json({
        error: 'stripe_webhook_not_configured',
        hint: 'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET',
      })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      await fulfillCheckoutSession(store, session)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[webhook]', err?.message || err)
    res.status(400).json({ error: 'webhook_error', message: err?.message || 'failed' })
  }
})

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    const store = await getStore()
    const h = await store.health()
    res.json({
      ok: true,
      service: 'weprize',
      store: h,
      stripe: Boolean(stripe),
      webhook: Boolean(webhookSecret),
      resend: resendConfigured(),
      seed: seedMeta(),
      time: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'health_failed' })
  }
})

app.get('/api/orders/by-session/:sessionId', async (req, res) => {
  try {
    const store = await getStore()
    const sessionId = req.params.sessionId
    let order = await store.getOrderBySession(sessionId)

    if (!order && stripe && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
          order = await fulfillCheckoutSession(store, session)
        }
      } catch (err) {
        console.warn('[by-session] stripe retrieve', err?.message || err)
      }
    }

    if (!order) return res.status(404).json({ error: 'order_not_found' })
    const identities = await store.listIdentities(order.id)
    const jobs = await store.listJobs(order.id)
    res.json({ order: publicOrder(order, identities, jobs) })
  } catch (err) {
    console.error('[by-session]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

app.get('/api/orders/:token', async (req, res) => {
  try {
    const store = await getStore()
    const order = await store.getOrderByToken(req.params.token)
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    const identities = await store.listIdentities(order.id)
    const jobs = await store.listJobs(order.id)
    res.json({ order: publicOrder(order, identities, jobs) })
  } catch (err) {
    console.error('[order]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

app.post('/api/orders/:token/identity', async (req, res) => {
  try {
    const store = await getStore()
    const order = await store.getOrderByToken(req.params.token)
    if (!order) return res.status(404).json({ error: 'order_not_found' })

    const normalized = normalizeIdentity(req.body || {})
    const identity = await store.addIdentity(order.id, normalized)
    const seeded = await store.seedJobsForIdentity(order, identity)
    const identities = await store.listIdentities(order.id)
    const jobs = await store.listJobs(order.id)

    res.status(201).json({
      identity: publicIdentity(identity),
      seeded_jobs: seeded.length,
      order: publicOrder(order, identities, jobs),
    })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[identity]', err)
    res.status(status).json({
      error: err.code || 'identity_error',
      message: err.message,
      missing: err.missing,
    })
  }
})

app.get('/api/orders/:token/jobs', async (req, res) => {
  try {
    const store = await getStore()
    const order = await store.getOrderByToken(req.params.token)
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    const jobs = await store.listJobs(order.id)
    res.json({
      token: order.token,
      jobs: jobs.map((j) => ({
        ...publicJob(j),
        what_to_do: j.status === 'needs_you' || j.status === 'confirm_sent' ? humanNeedsYou(j.needs_you_reason) : null,
      })),
      counts: publicOrder(order, [], jobs).job_counts,
    })
  } catch (err) {
    console.error('[jobs]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

/** Customer marks OTP/confirm done — moves needs_you / confirm_sent → confirmed. */
app.post('/api/orders/:token/jobs/:jobId/ack', async (req, res) => {
  try {
    const store = await getStore()
    const order = await store.getOrderByToken(req.params.token)
    if (!order) return res.status(404).json({ error: 'order_not_found' })
    const job = await store.getJob(req.params.jobId)
    if (!job || job.order_id !== order.id) return res.status(404).json({ error: 'job_not_found' })
    if (job.status !== 'needs_you' && job.status !== 'confirm_sent') {
      return res.status(400).json({ error: 'job_not_ackable', status: job.status })
    }
    const updated = await store.updateJob(job.id, {
      status: 'confirmed',
      needs_you_reason: null,
    })
    res.json({ job: publicJob(updated) })
  } catch (err) {
    console.error('[ack]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

/** Dev-only: create a paid order without Stripe (never enable in prod without care). */
app.post('/api/dev/demo-order', async (req, res) => {
  if (process.env.ALLOW_DEMO_ORDER !== '1') {
    return res.status(404).json({ error: 'not_found' })
  }
  try {
    const pack = req.body?.pack || 'once'
    const store = await getStore()
    const order = await store.createDemoOrder(pack)
    const identities = await store.listIdentities(order.id)
    const jobs = await store.listJobs(order.id)
    res.status(201).json({ order: publicOrder(order, identities, jobs) })
  } catch (err) {
    console.error('[demo-order]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

/** Soft product cap: max paid purchases per buyer email (anti ROI/farm). Soft warn only — do not invent payment infra. */
const MAX_PURCHASES_PER_EMAIL = 10

async function fulfillCheckoutSession(store, session) {
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.email ||
    'unknown@weprize.local'
  const pack = inferPack(session)
  const paymentLink =
    typeof session.payment_link === 'string'
      ? session.payment_link
      : session.payment_link?.id || session.metadata?.payment_link || null

  const clientReferenceId =
    typeof session.client_reference_id === 'string' && session.client_reference_id.trim()
      ? session.client_reference_id.trim().slice(0, 64)
      : null

  const emailNorm = String(email).toLowerCase()
  // Soft check stub: log when buyer is at/over personal-use cap. TODO: optional soft-block / support flag.
  try {
    if (typeof store.countPaidOrdersByEmail === 'function') {
      const prior = await store.countPaidOrdersByEmail(emailNorm)
      if (prior >= MAX_PURCHASES_PER_EMAIL) {
        console.warn(
          `[caps] buyer email at/over max ${MAX_PURCHASES_PER_EMAIL} paid purchases (prior=${prior}) — personal use only, not a business entry factory`,
          { email: emailNorm, pack, sessionId: session.id },
        )
      }
    }
  } catch (err) {
    console.warn('[caps] countPaidOrdersByEmail failed (non-fatal)', err?.message || err)
  }

  const order = await store.upsertPaidOrderFromStripe({
    sessionId: session.id,
    paymentLink,
    pack,
    email: emailNorm,
    amountCents: session.amount_total ?? null,
    currency: session.currency || 'cad',
    clientReferenceId,
  })
  return order
}

// —— Static SPA ——
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(join(dist, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.status(503).send('dist/ missing — run npm run build')
  })
}

app.use((err, _req, res, _next) => {
  console.error('[express]', err)
  res.status(500).json({ error: 'server_error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[weprize] listening on 0.0.0.0:${PORT} (SPA+API)`)
})
