/**
 * FunSpamCover (weprize.net/spamfun): forward unanswered calls to one shared screener number;
 * an automated assistant wastes spam callers' time and pitches WePrize.
 *
 * Mounted at /api/fsc. Minimal moving parts: one Checkout (subscription, 3-day trial, card upfront,
 * inline prices), the existing /api/stripe/webhook (checkout.session.completed), plus a lazy Stripe
 * re-check on calls so cancellations / failed payments stop service without extra webhook events.
 *
 *   POST /checkout {phone,email,plan,voice}   -> { url } (Stripe Checkout)
 *   GET  /session?sid=cs_...                  -> welcome-screen status
 *   POST /voice {sid,voice} | /portal {sid}   -> change voice | Stripe billing portal
 *   POST /route   (Twilio Function, x-fsc-secret) -> {action:"screen",voice_id} | {action:"say",text}
 *   POST /status  (Twilio number status callback, signed) -> records the real call cost
 *   POST /admin?a=stats|user|checkout|stripe  (x-fsc-admin)
 *
 * Env: FSC_DATABASE_URL (Neon, schema fsc), FSC_HOOK_SECRET, FSC_TWILIO_AUTH_TOKEN, FSC_ADMIN_KEY,
 *      STRIPE_SECRET_KEY (existing), RESEND_API_KEY/RESEND_FROM (existing),
 *      FSC_POOL_DAILY_CAP_USD (1.00), FSC_GLOBAL_DAILY_CAP_USD (3.00), FSC_OFF=1 (kill switch), FSC_CURRENCY (cad)
 */
import crypto from 'node:crypto'
import express from 'express'
import { decide, normPhone, callCostUsd, LIMITS, PLANS } from './fsc-core.js'

const SITE = 'https://weprize.net'
const PAGE = SITE + '/spamfun'
const VOICES = { default: 'Nq7wOXp8hWx3nJowzEwm', male: 'bIHbv24MWmeRgasZH58o', female: 'cgSgspJ2msm6clMCkdW9' }
const env = (n) => { const v = process.env[n]; return v && v.trim() ? v.trim() : null }
const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d }
const RECHECK_MS = 60 * 60 * 1000

// ---------- Neon over HTTP (no pool to leak in serverless) ----------
let schemaReady = null
async function q(query, params = []) {
  const url = env('FSC_DATABASE_URL')
  const host = url.match(/@([^/:?]+)/)[1]
  const r = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: { 'Neon-Connection-String': url, 'content-type': 'application/json' },
    body: JSON.stringify({ query, params }),
  })
  const t = await r.text()
  if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 160))
  return JSON.parse(t).rows
}
async function sql(query, params) {
  if (!schemaReady) schemaReady = q("select 1 from information_schema.tables where table_schema='fsc' and table_name='users'").then((r) => { if (!r.length) throw new Error('fsc schema missing') }).catch((e) => { schemaReady = null; throw e })
  await schemaReady
  return q(query, params)
}
const torontoDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(d)
const monthOf = (day) => day.slice(0, 7)
const hashCaller = (n) => crypto.createHmac('sha256', env('FSC_HOOK_SECRET') || 'x').update(String(n || 'none')).digest('hex').slice(0, 24)
async function event(kind, detail) { try { await sql('insert into fsc.events(kind, detail) values ($1, $2)', [kind, JSON.stringify(detail || {})]) } catch {} }
const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

function verifyTwilio(url, params, sig, token) {
  if (!sig || !token) return false
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  return safeEq(crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64'), sig)
}

// ---------- email: automated emails carry NO links, domains or paths ----------
function clean(text) {
  if (/https?:|www\.|\.(com|ca|org|net|io)\b|\/[a-z]/i.test(text)) throw new Error('email body failed the no-links scan')
  return text
}
async function mail(to, subject, text) {
  if (!env('RESEND_API_KEY') || !to) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env('RESEND_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('RESEND_FROM'), to: [to], subject, text: clean(text) }),
  })
  return r.ok
}
const UPGRADE = {
  to_premium: ['FunSpamCover: your assistant needs a bigger plan', "Hi! Your FunSpamCover Basic plan used up this month's screening allowance. Your callers kept the assistant busy!\n\nUntil your plan renews, new forwarded calls get a short voicemail-style message instead of the full spam-wasting show.\n\nWant the assistant back on duty? Open the FunSpamCover page on WePrize and pick Premium ($3.99 a month). Your Basic plan is cancelled automatically when you switch.\n\nThanks for wasting spammers' time with us.\nFunSpamCover"],
  to_super: ['FunSpamCover: that is a lot of spam', "Hi! Your FunSpamCover Premium plan used up this month's screening allowance.\n\nUntil your plan renews, new forwarded calls get a short voicemail-style message.\n\nIf you get mass inbound calls, Super ($6.99 a month) is built for that. Open the FunSpamCover page on WePrize and pick Super. Your Premium plan is cancelled automatically when you switch.\n\nFunSpamCover"],
  super_cap: ['FunSpamCover: monthly allowance used', "Hi! Your FunSpamCover Super plan used up this month's screening allowance. New forwarded calls get a short voicemail-style message until your plan renews.\n\nFunSpamCover"],
}

const STATUS = { trialing: 'trialing', active: 'active', past_due: 'past_due', unpaid: 'unpaid', canceled: 'canceled', incomplete: 'pending', incomplete_expired: 'canceled', paused: 'paused' }
const mask = (p) => (p ? '+1 (***) ***-' + p.slice(-4) : '')

export function createFscRouter({ stripe }) {
  const router = express.Router()
  router.use(express.urlencoded({ extended: false }))

  async function syncSub(sub, stripeRef) {
    const uid = Number(sub.metadata?.fsc_user)
    if (!uid) return
    const u = (await sql('select id, status, stripe_sub from fsc.users where id = $1', [uid]))[0]
    if (!u) return
    const st = STATUS[sub.status] || sub.status
    const live = st === 'trialing' || st === 'active'
    if (u.stripe_sub && u.stripe_sub !== sub.id && !live) return // an old, replaced sub can't downgrade the user
    const plan = PLANS[sub.metadata?.plan] ? sub.metadata.plan : 'basic'
    await sql(`update fsc.users set status = $2, plan = $3, stripe_sub = $4, stripe_customer = $5, trial_end = to_timestamp($6),
                 trial_used = trial_used or $7, checked_at = now(), updated_at = now() where id = $1`,
      [uid, u.status === 'suspended' && live ? 'suspended' : st, plan, sub.id, typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, sub.trial_end || 0, !!sub.trial_end])
    if (u.stripe_sub && u.stripe_sub !== sub.id && live) {
      try { await stripeRef.subscriptions.cancel(u.stripe_sub); await event('old_sub_cancelled', { uid }) } catch (e) { await event('old_sub_cancel_failed', { uid, err: String(e.message).slice(0, 120) }) }
    }
  }

  async function sessionUser(sid) {
    if (!stripe || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(String(sid || ''))) return null
    const s = await stripe.checkout.sessions.retrieve(sid)
    if (s.metadata?.app !== 'fsc') return null
    const u = (await sql('select * from fsc.users where id = $1', [Number(s.metadata.fsc_user)]))[0]
    if (u && s.status === 'complete' && s.subscription && u.status === 'pending') {
      await syncSub(await stripe.subscriptions.retrieve(s.subscription), stripe) // webhook race: sync now
      return { s, u: (await sql('select * from fsc.users where id = $1', [u.id]))[0] }
    }
    return u ? { s, u } : null
  }

  async function checkout(req, res, admin = false) {
    const b = req.body || {}
    if (b.company) return res.json({ ok: true, url: PAGE })
    const phone = normPhone(b.phone)
    const email = String(b.email || '').trim().toLowerCase()
    const plan = PLANS[b.plan] ? b.plan : 'basic'
    const voice = b.voice === 'female' ? 'female' : 'male'
    const mode = ['jokes', 'shill', 'curious', 'professional'].includes(b.mode) ? b.mode : 'shill'
    if (!(b.consent === true || b.consent === 'on' || b.consent === 'true')) return res.status(400).json({ ok: false, error: 'Please tick the consent box to continue.' })
    if (!phone) return res.status(400).json({ ok: false, error: 'Enter the 10-digit Canadian or US mobile number you forward from.' })
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    if (!stripe) return res.status(503).json({ ok: false, error: 'Checkout is warming up. Try again shortly.' })
    const u = (await sql(
      `insert into fsc.users(phone, email, plan, voice, mode, consent_at, status) values ($1,$2,$3,$4,$5,now(),'pending')
       on conflict (phone) do update set consent_at = now(),
         mode = case when fsc.users.status in ('trialing','active') then fsc.users.mode else excluded.mode end,
         email = case when fsc.users.status in ('trialing','active') then fsc.users.email else excluded.email end,
         voice = case when fsc.users.status in ('trialing','active') then fsc.users.voice else excluded.voice end, updated_at = now()
       returning id, status, plan, trial_used, ref_code`, [phone, email, plan, voice, mode]))[0]
    if (!u.ref_code) await sql("update fsc.users set ref_code = $2 where id = $1 and ref_code is null", [u.id, 'SPAM' + crypto.randomBytes(3).toString('hex').toUpperCase()])
    const live = u.status === 'active' || u.status === 'trialing'
    if (live && u.plan === plan) return res.status(409).json({ ok: false, error: 'That number already has this plan. Manage it from the link on your welcome screen.' })
    if (u.status === 'suspended') return res.status(403).json({ ok: false, error: 'This number is paused for review.' })
    const trial = !u.trial_used && !live
    const meta = { app: 'fsc', fsc_user: String(u.id), plan }
    const p = PLANS[plan]
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ quantity: 1, price_data: { currency: env('FSC_CURRENCY') || 'cad', unit_amount: Math.round(p.priceCad * 100), recurring: { interval: 'month' }, product_data: { name: 'FunSpamCover ' + p.name } } }],
      customer_email: email,
      client_reference_id: String(u.id),
      metadata: meta,
      subscription_data: { metadata: meta, ...(trial ? { trial_period_days: 3 } : {}) },
      payment_method_collection: admin && b.noCard ? 'if_required' : 'always',
      allow_promotion_codes: true,
      success_url: PAGE + '?welcome={CHECKOUT_SESSION_ID}',
      cancel_url: PAGE + '?canceled=1#plans',
    })
    await event('checkout_created', { uid: u.id, plan, trial, admin })
    res.json({ ok: true, url: s.url, ...(admin ? { sid: s.id } : {}) })
  }

  async function route(req, res) {
    if (!safeEq(req.headers['x-fsc-secret'], env('FSC_HOOK_SECRET'))) return res.status(403).json({ error: 'forbidden' })
    const b = req.body || {}
    const callSid = String(b.callSid || '').slice(0, 64) || 'sim-' + crypto.randomUUID()
    const fwd = normPhone(b.fwd)
    const ch = hashCaller(normPhone(b.from) || String(b.from || '').toLowerCase())
    const day = torontoDay(), month = monthOf(day)
    const since = new Date(Date.now() - LIMITS.burstWindowSec * 1000).toISOString()
    const [g] = await sql(`select
        coalesce((select sum(cost_usd) from fsc.calls where day = $1),0)::float as global_today,
        coalesce((select sum(cost_usd) from fsc.calls where day = $1 and pool),0)::float as pool_today,
        (select count(*) from fsc.calls where caller_h = $2 and day = $1)::int as caller_today,
        (select count(*) from fsc.calls where caller_h = $2 and started_at > $3)::int as caller_burst,
        exists(select 1 from fsc.blocked_callers where caller_h = $2) as caller_blocked`, [day, ch, since])
    let u = fwd ? (await sql('select * from fsc.users where phone = $1', [fwd]))[0] : null
    if (u && u.stripe_sub && stripe && (!u.checked_at || Date.now() - new Date(u.checked_at).getTime() > RECHECK_MS)) {
      try { await syncSub(await stripe.subscriptions.retrieve(u.stripe_sub), stripe); u = (await sql('select * from fsc.users where id = $1', [u.id]))[0] } catch (e) { await event('recheck_failed', { uid: u.id }) }
    }
    let uc = null
    if (u) {
      ;[uc] = await sql(`select coalesce((select sum(cost_usd) from fsc.calls where user_id = $1 and month = $2),0)::float as month_usd,
          (select count(*) from fsc.calls where user_id = $1 and day = $3)::int as today,
          (select count(*) from fsc.calls where user_id = $1 and started_at > $4)::int as burst`, [u.id, month, day, since])
    }
    const d = decide({
      off: env('FSC_OFF') === '1',
      globalTodayUsd: g.global_today, globalCapUsd: num(env('FSC_GLOBAL_DAILY_CAP_USD'), 3),
      poolTodayUsd: g.pool_today, poolCapUsd: num(env('FSC_POOL_DAILY_CAP_USD'), 1),
      caller: { blocked: g.caller_blocked, today: g.caller_today, burst: g.caller_burst },
      user: u ? { status: u.status, plan: u.plan, voice: u.voice, monthUsd: uc.month_usd, today: uc.today, burst: uc.burst } : null,
    })
    await sql(`insert into fsc.calls(call_sid, user_id, caller_h, fwd_matched, pool, month, day, cost_usd, outcome, used_ai)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (call_sid) do nothing`,
      [callSid, u?.id ?? null, ch, !!u, !u, month, day, d.reserveUsd, d.reason, d.action === 'screen'])
    if (d.blockCaller) { await sql('insert into fsc.blocked_callers(caller_h, reason) values ($1,$2) on conflict do nothing', [ch, d.reason]); await event('flag_caller', { ch, today: g.caller_today, burst: g.caller_burst }) }
    if (d.suspendUser) { await sql("update fsc.users set status='suspended', flagged=$2, updated_at=now() where id=$1", [u.id, 'auto: ' + d.reason + ' ' + day]); await event('flag_user', { uid: u.id, today: uc.today, burst: uc.burst }) }
    if (d.upgradePrompt && u.upgrade_prompted_month !== month) {
      await sql('update fsc.users set upgrade_prompted_month=$2 where id=$1', [u.id, month])
      const [subj, text] = UPGRADE[d.upgradePrompt]
      const sent = await mail(u.email, subj, text).catch(() => false)
      await event('upgrade_prompt', { uid: u.id, kind: d.upgradePrompt, sent })
    }
    if (d.action === 'screen') return res.json({ action: 'screen', reason: d.reason, voice_id: d.voice === 'default' ? '' : VOICES[d.voice] || '', mode: u?.mode || 'shill', max_secs: d.maxSec || 60 })
    res.json({ action: 'say', reason: d.reason, text: d.text })
  }

  async function status(req, res) {
    const params = req.body || {}
    if (!verifyTwilio(SITE + '/api/fsc/status', params, req.headers['x-twilio-signature'], env('FSC_TWILIO_AUTH_TOKEN'))) return res.status(403).send('forbidden')
    const dur = Number(params.CallDuration || 0)
    const row = (await sql('select used_ai from fsc.calls where call_sid = $1', [params.CallSid]))[0]
    if (row) await sql('update fsc.calls set duration_s=$2, cost_usd=$3, final=true where call_sid=$1', [params.CallSid, dur, callCostUsd(dur, row.used_ai)])
    else {
      const day = torontoDay()
      await sql(`insert into fsc.calls(call_sid, caller_h, pool, month, day, cost_usd, outcome, used_ai, duration_s, final)
                 values ($1,$2,true,$3,$4,$5,'unrouted',false,$6,true) on conflict do nothing`,
        [params.CallSid, hashCaller(normPhone(params.From) || params.From), monthOf(day), day, callCostUsd(dur, false), dur])
    }
    res.type('text/plain').send('ok')
  }

  async function admin(req, res) {
    if (!env('FSC_ADMIN_KEY') || !safeEq(req.headers['x-fsc-admin'], env('FSC_ADMIN_KEY'))) return res.status(403).json({ error: 'forbidden' })
    const a = req.query.a
    if (a === 'checkout') return checkout(req, res, true)
    if (a === 'stripe') {
      const acct = await stripe.accounts.retrieve()
      const hooks = await stripe.webhookEndpoints.list({ limit: 20 })
      return res.json({ account: acct.id, name: acct.settings?.dashboard?.display_name || acct.business_profile?.name, country: acct.country, currency: acct.default_currency,
        mode: String(env('STRIPE_SECRET_KEY')).startsWith('sk_live') || String(env('STRIPE_SECRET_KEY')).startsWith('rk_live') ? 'live' : 'test',
        webhooks: hooks.data.map((h) => ({ url: h.url, events: h.enabled_events, status: h.status })) })
    }
    if (a === 'cancel') {
      const u = (await sql('select * from fsc.users where phone = $1', [normPhone(req.query.phone)]))[0]
      if (!u?.stripe_sub) return res.json({ ok: false })
      const sub = await stripe.subscriptions.cancel(u.stripe_sub)
      await syncSub(sub, stripe)
      return res.json({ ok: true, status: sub.status })
    }
    if (a === 'user') {
      const u = (await sql('select * from fsc.users where phone = $1', [normPhone(req.query.phone)]))[0]
      const c = u ? (await sql('select coalesce(sum(cost_usd),0)::float as month_usd, count(*)::int as calls from fsc.calls where user_id=$1 and month=$2', [u.id, monthOf(torontoDay())]))[0] : null
      return res.json({ user: u && { id: u.id, status: u.status, plan: u.plan, voice: u.voice, flagged: u.flagged, has_sub: !!u.stripe_sub, trial_used: u.trial_used, upgrade_prompted_month: u.upgrade_prompted_month }, month: c })
    }
    const day = torontoDay()
    res.json((await sql(`select (select count(*) from fsc.users)::int users, (select count(*) from fsc.users where status in ('trialing','active'))::int live,
      (select count(*) from fsc.users where status='suspended')::int suspended, coalesce((select sum(cost_usd) from fsc.calls where day=$1),0)::float today_usd,
      coalesce((select sum(cost_usd) from fsc.calls where day=$1 and pool),0)::float pool_today_usd, (select count(*) from fsc.blocked_callers)::int blocked_callers`, [day]))[0])
  }

  const wrap = (fn) => async (req, res) => {
    try { await fn(req, res) } catch (e) {
      console.error('[fsc]', req.path, String(e?.message || e).slice(0, 300))
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'Something went sideways. Please try again.' })
    }
  }
  router.post('/checkout', wrap((req, res) => checkout(req, res)))
  router.post('/route', wrap(route))
  router.post('/status', wrap(status))
  router.post('/admin', wrap(admin))
  router.get('/session', wrap(async (req, res) => {
    const r = await sessionUser(req.query.sid)
    if (!r) return res.status(404).json({ ok: false })
    res.json({ ok: true, plan: r.u.plan, status: r.u.status, voice: r.u.voice, mode: r.u.mode, ref_code: r.u.ref_code, rev_share_cad: 0, phone: mask(r.u.phone), trial_end: r.u.trial_end })
  }))
  router.post('/voice', wrap(async (req, res) => {
    const r = await sessionUser(req.body?.sid)
    if (!r) return res.status(404).json({ ok: false, error: 'Session not found.' })
    const v = req.body.voice === 'female' ? 'female' : 'male'
    await sql('update fsc.users set voice=$2, updated_at=now() where id=$1', [r.u.id, v])
    res.json({ ok: true, voice: v })
  }))
  router.post('/portal', wrap(async (req, res) => {
    const r = await sessionUser(req.body?.sid)
    if (!r) return res.status(404).json({ ok: false, error: 'Session not found.' })
    if (!r.u.stripe_customer) return res.status(409).json({ ok: false, error: 'Your plan is still activating. Try again in a minute.' })
    const p = await stripe.billingPortal.sessions.create({ customer: r.u.stripe_customer, return_url: PAGE })
    res.json({ ok: true, url: p.url })
  }))
  router.get('/', (_req, res) => res.json({ ok: true, service: 'funspamcover' }))

  // ---------- free try: verified email, one per device, no card ----------
  const h = (x) => crypto.createHmac('sha256', env('FSC_HOOK_SECRET') || 'x').update(String(x)).digest('hex')
  const okEmail = (e) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)
  router.post('/try/start', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase(), fp = String(req.body?.fp || '')
    if (req.body?.company) return res.json({ ok: true })
    if (!okEmail(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    if (fp.length < 16) return res.status(400).json({ ok: false, error: 'Please reload the page and try again.' })
    const fph = h('fp:' + fp)
    const [c] = await sql(`select exists(select 1 from fsc.tries where fp_hash=$1 and verified_at is not null) as used,
      (select count(*) from fsc.tries where (fp_hash=$1 or email=$2) and created_at > now() - interval '1 hour')::int as recent`, [fph, email])
    if (c.used) return res.status(409).json({ ok: false, used: true, error: "This device already used its free try. Start the 3-day trial to keep going!" })
    if (c.recent >= 3) return res.status(429).json({ ok: false, error: 'Too many codes requested. Try again in an hour.' })
    const code = String(crypto.randomInt(100000, 1000000))
    await sql('insert into fsc.tries(email, fp_hash, code_hash) values ($1,$2,$3)', [email, fph, h('code:' + email + ':' + code)])
    const sent = await mail(email, 'Your FunSpamCover code: ' + code, 'Your FunSpamCover verification code is ' + code + '.\n\nEnter it on the FunSpamCover page on WePrize to unlock your free test call. It expires in 15 minutes.\n\nDidn\'t ask for this? You can ignore this email.')
    if (!sent) return res.status(502).json({ ok: false, error: "We couldn't send the code. Check the email and try again." })
    res.json({ ok: true })
  }))
  router.post('/try/verify', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase(), fp = String(req.body?.fp || ''), code = String(req.body?.code || '').replace(/\D/g, '')
    const fph = h('fp:' + fp)
    const t = (await sql("select id, code_hash, attempts from fsc.tries where email=$1 and fp_hash=$2 and verified_at is null and created_at > now() - interval '15 minutes' order by id desc limit 1", [email, fph]))[0]
    if (!t) return res.status(400).json({ ok: false, error: 'Code expired. Request a new one.' })
    if (t.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many tries. Request a new code.' })
    if (!safeEq(h('code:' + email + ':' + code), t.code_hash)) { await sql('update fsc.tries set attempts=attempts+1 where id=$1', [t.id]); return res.status(400).json({ ok: false, error: "That code didn't match." }) }
    try { await sql('update fsc.tries set verified_at=now() where id=$1', [t.id]) } catch { return res.status(409).json({ ok: false, used: true, error: 'This device already used its free try.' }) }
    await event('free_try_verified', { tid: t.id })
    res.json({ ok: true, number: '+12893675302' })
  }))

  /** Called from the shared Stripe webhook for events whose object carries metadata.app === "fsc". */
  router.handleStripeEvent = async (evt) => {
    const o = evt.data.object
    if (evt.type === 'checkout.session.completed' && o.subscription) await syncSub(await stripe.subscriptions.retrieve(o.subscription), stripe)
    else if (evt.type.startsWith('customer.subscription.')) await syncSub(o, stripe)
    await event('stripe_' + evt.type, { uid: o.metadata?.fsc_user, status: o.status })
  }
  return router
}
