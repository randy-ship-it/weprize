/**
 * SpamRoast (spamroast.com) customers. Mounted at /api/sr on weprize.net; spamroast.com proxies /api/sr/* here.
 * Storage: private Vercel Blob under sr/* (the FSC Postgres is down, Blob is free-tier and already wired).
 *
 *   POST /signup {name,email,phone,plan:'free'|'smart',consent,company(honeypot)}
 *        free  -> active now, welcome SMS with forwarding codes, Randy notified
 *        smart -> Stripe Checkout (subscription, C$9.99/mo) -> webhook activates + welcomes
 *   GET  /me?k=            welcome page status (k = private manage token from the signup response)
 *   POST /contacts {k,hashes[],replace}  Smart: sha256(E.164) of contacts, stored as HMACs
 *   POST /portal {k}       Stripe billing portal (cancel / card)
 *   POST /admin?a=...      x-fsc-admin: link | user | testcheckout | cancel | stats | smstest
 * Stripe (via the shared /api/stripe/webhook): checkout.session.completed, invoice.paid,
 *   customer.subscription.updated|deleted. Screener: srRoute() from fsc.js route(); srStatus() from fsc.js status().
 * Rules: automated emails carry no URLs/domains/paths; SMS also carry none. The owner's name is never spoken.
 */
import crypto from 'node:crypto'
import express from 'express'
import { normPhone } from './fsc-core.js'

const env = (n) => { const v = process.env[n]; return v && v.trim() ? v.trim() : null }
const SITE = 'https://spamroast.com'
const SCREENER = '+12893675302'
const PRO_AGENT = () => env('FSC_PRO_AGENT_ID') || 'agent_0101m55npptre8ev15wa2rg6ejrg'
const VOICES = { male: 'bIHbv24MWmeRgasZH58o', female: 'cgSgspJ2msm6clMCkdW9' }
export const SR_PLANS = {
  free: { name: 'Free', callsPerMonth: 5, callsPerDay: 3, maxSecs: 45, mode: 'shill' },
  biz: { name: 'Business', callsPerMonth: 600, callsPerDay: 80, maxSecs: 90, mode: 'professional', contacts: true },
  smart: { name: 'Smart', priceCents: 999, callsPerMonth: 25, callsPerDay: 8, maxSecs: 60, mode: 'jokes', contacts: true },
}
const CONSENT_TEXT = 'I agree that SpamRoast may text and call me at this number about my account and set-up. Reply STOP to opt out anytime.'
const secret = () => env('FSC_HOOK_SECRET') || 'x'
const hk = (x, n = 32) => crypto.createHmac('sha256', secret()).update(String(x)).digest('hex').slice(0, n)
const keyFor = (phone) => hk('sr:' + phone)
const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
const okEmail = (e) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)
const mask = (p) => (p ? '(***) ***-' + p.slice(-4) : '')
const month = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(d).slice(0, 7)
const day = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(d)
export const sha256hex = (x) => crypto.createHash('sha256').update(x).digest('hex')
export const contactKey = (key, digest) => crypto.createHmac('sha256', env('FSC_CONTACT_SECRET') || secret()).update('sr:' + key + ':' + digest).digest('hex').slice(0, 40)
// Text that goes into automated email/SMS: neutralise anything link- or domain-like.
const unlink = (t) => String(t || '').replace(/https?:\/\/\S+|www\.\S+/gi, '[link removed]').replace(/@/g, ' at ').replace(/\b([a-z0-9-]+)\.([a-z]{2,6})\b/gi, '$1 dot $2').replace(/\/(?=[a-z])/gi, ' ').slice(0, 300)
const NO_LINKS = /https?:|www\.|\.(com|ca|org|net|io|co|us|app)\b|\/[a-z]/i
function clean(t) { if (NO_LINKS.test(t)) throw new Error('message failed the no-links scan'); return t }

// ---------- blob ----------
let blobMod = null
const blob = async () => (blobMod ||= await import('@vercel/blob'))
async function bput(path, obj) { const { put } = await blob(); await put('sr/' + path + '.json', JSON.stringify(obj), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' }) }
async function bget(path) { try { const { get } = await blob(); const r = await get('sr/' + path + '.json', { access: 'private', useCache: false }); if (!r || !r.stream) return null; return JSON.parse(await new Response(r.stream).text()) } catch { return null } }
const getCust = (key) => (key ? bget('c/' + key) : null)
async function saveCust(c) { c.updated_at = new Date().toISOString(); await bput('c/' + c.key, c); return c }
async function custByToken(k) { if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(k || ''))) return null; const i = await bget('k/' + hk('tok:' + k, 40)); return i ? getCust(i.key) : null }

// ---------- twilio / email ----------
const twAuth = () => 'Basic ' + Buffer.from(env('FSC_TWILIO_ACCOUNT_SID') + ':' + env('FSC_TWILIO_AUTH_TOKEN')).toString('base64')
async function sms(to, body) {
  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env('FSC_TWILIO_ACCOUNT_SID') + '/Messages.json', {
    method: 'POST', headers: { authorization: twAuth(), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: SCREENER, Body: clean(body) }).toString(), signal: AbortSignal.timeout(9000) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error('twilio ' + r.status + ' ' + (j.code || '') + ' ' + String(j.message || '').slice(0, 120))
  return j.sid
}
async function mail(to, subject, text) {
  if (!env('RESEND_API_KEY') || !to) return false
  const from = env('SR_EMAIL_FROM') || String(env('FSC_EMAIL_FROM') || '').replace(/^[^<]*</, 'SpamRoast <')
  if (!from) return false
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env('RESEND_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: String(to).split(',').map((s) => s.trim()), subject, text: clean(text) }), signal: AbortSignal.timeout(9000) })
  return r.ok
}
async function notifyRandy(subject, lines) {
  try { return await mail(env('SR_NOTIFY_EMAIL') || 'randy@silverbirchgrowth.com', 'SpamRoast: ' + subject, lines.map(unlink).join('\n') + '\n\nSpamRoast ops') } catch (e) { console.error('[sr] notify', String(e.message).slice(0, 120)); return false }
}
async function toFriday(c) {
  if (!env('FRIDAY_INTAKE_SECRET')) return null
  try {
    const r = await fetch('https://fridayapp.org/api/intake', { method: 'POST', headers: { 'content-type': 'application/json', 'x-intake-secret': env('FRIDAY_INTAKE_SECRET') },
      body: JSON.stringify({ org: env('SR_FRIDAY_ORG') || 'rdgdh', source: 'spamroast.com signup (' + c.intent + ')', path: '/', kind: 'form', externalId: 'spamroast:' + c.key,
        email: c.email, phone: c.phone, name: c.name, tags: ['SpamRoast customer', 'spamroast:' + c.intent, 'source:spamroast.com'],
        message: 'Signed up on spamroast.com (' + c.intent + ' plan). Consented to account texts and calls.', meta: { lead_source: 'spamroast-signup', plan: c.intent, ...(c.attr || {}), ...(c.test ? { is_test: true } : {}) } }),
      signal: AbortSignal.timeout(6000) })
    const j = await r.json().catch(() => ({}))
    return r.ok ? j.contactId || true : null
  } catch { return null }
}

export function welcomeText(plan) {
  const p = SR_PLANS[plan] || SR_PLANS.free
  return [
    `SpamRoast: you're in on the ${p.name} plan! Missed calls you forward to 289-367-5302 get roasted.`,
    'Dial ONE code from the phone you are protecting:',
    'Rogers, Fido, Telus, Koodo, Freedom, AT&T, T-Mobile: **004*12893675302#',
    'Verizon: *712893675302',
    'Bell or Virgin: phone Settings, Call forwarding, When unanswered: 2893675302',
    'If a code errors, try *61*12893675302# then *67*12893675302#',
    'Turn off: ##004# (Verizon *73). Carrier voicemail can block forwarding; your carrier can remove it.',
    'Reply STOP to opt out.',
  ].join('\n')
}

// ---------- stripe helpers ----------
const isSrMeta = (m) => m && (m.app === 'sr' || m.project === 'spamroast')
function srEventKey(o) {
  if (isSrMeta(o.metadata)) return o.metadata.sr_key || '_'
  const sd = o.subscription_details?.metadata || o.parent?.subscription_details?.metadata
  if (isSrMeta(sd)) return sd.sr_key || '_'
  for (const l of o.lines?.data || []) { if (isSrMeta(l.metadata)) return l.metadata.sr_key || '_' }
  const link = env('SR_PAYMENT_LINK'), price = env('SR_PRICE_SMART')
  if (link && o.payment_link === link) return '_'
  if (price) {
    if ((o.items?.data || []).some((i) => i.price?.id === price)) return '_'
    if ((o.lines?.data || []).some((l) => l.price?.id === price || l.pricing?.price_details?.price === price)) return '_'
  }
  return null
}
export const isSrEvent = (evt) => srEventKey(evt.data?.object || {}) !== null

// ---------- referrals: $500 payout once referred subs' Stripe billing hits C$1,000 (manual payout) ----------
const REF_GOAL_CENTS = 100000
const MUG_GOAL_CENTS = 5000
const refCodeFor = (c) => hk('ref:' + String(c.email || '').toLowerCase() + '|' + String(c.phone || ''), 8)
async function ensureRef(c) { if (!c.ref_code) c.ref_code = refCodeFor(c); await bput('r/' + c.ref_code, { key: c.key }); return c.ref_code }
async function custByRef(code) { if (!/^[a-f0-9]{8}$/.test(String(code || ''))) return null; const i = await bget('r/' + code); return i ? getCust(i.key) : null }
async function creditReferrer(c, cents, invoiceId) {
  const ref = c.referred_by?.key ? await getCust(c.referred_by.key) : null
  if (!ref || !cents) return
  ref.ref_stats = ref.ref_stats || { billed_cents: 0, invoices: [], referred: [] }
  if (ref.ref_stats.invoices.includes(invoiceId)) return
  ref.ref_stats.invoices = [...ref.ref_stats.invoices, invoiceId].slice(-500)
  ref.ref_stats.billed_cents += cents
  if (!ref.ref_stats.referred.includes(c.key)) ref.ref_stats.referred.push(c.key)
  if (ref.ref_stats.billed_cents >= MUG_GOAL_CENTS && !ref.ref_stats.mug_triggered) {
    ref.ref_stats.mug_triggered = new Date().toISOString()
    const led = (await bget('payouts')) || { owed: [] }
    led.owed.push({ at: ref.ref_stats.mug_triggered, referrer_key: ref.key, name: ref.name, email: ref.email, reward: 'mug', milestone_cad: 50, status: 'owed', test: !!(c.test || ref.test) })
    await bput('payouts', led)
    await notifyRandy((c.test ? '[TEST] ' : '') + 'SpamRoast referral reward owed: free mug', ['A referrer just crossed C$50 in referred Stripe billing and earned the free SpamRoast mug.', '', 'Name: ' + (ref.name || ''), 'Email: ' + ref.email, 'Collect their shipping address, then mark it shipped in the ledger. Check terms first (no self-referral).'])
  }
  const owedNow = Math.floor(ref.ref_stats.billed_cents / REF_GOAL_CENTS), owedBefore = ref.ref_stats.payouts_triggered || 0
  if (owedNow > owedBefore) {
    ref.ref_stats.payouts_triggered = owedNow
    const led = (await bget('payouts')) || { owed: [] }
    led.owed.push({ at: new Date().toISOString(), referrer_key: ref.key, name: ref.name, email: ref.email, amount_cad: 500, milestone_cad: owedNow * 1000, reward: 'cash', status: 'owed', test: !!(c.test || ref.test) })
    await bput('payouts', led)
    await notifyRandy((c.test ? '[TEST] ' : '') + 'SpamRoast referral payout owed: C$500', ['A referrer just crossed C$' + owedNow * 1000 + ' in referred Stripe billing.', '', 'Name: ' + (ref.name || ''), 'Email: ' + ref.email, 'Check terms before paying (referred subs paid 30+ days, no self-referral). Pay manually by Interac e-Transfer or PayPal, then mark it paid in the ledger.'])
  }
  await saveCust(ref)
}

/** New Smart/Business checkouts stay closed until SR_PAID_CHECKOUT=1. Existing customers are untouched. */
export function srPaidCheckoutOpen() {
  return process.env.SR_PAID_CHECKOUT === '1'
}

/** Pure call decision used by srRoute. Queue/cap/contact rules only; no I/O. */
export function decideSrCall(c, from, now = new Date()) {
  if (!c) return null
  if (c.status !== 'active') {
    return { action: 'say', reason: 'sr_inactive', text: "Hi! The person you're calling isn't available. Please try again later. Bye!" }
  }
  const plan = SR_PLANS[c.plan] || SR_PLANS.free
  const m = month(now)
  const d = day(now)
  if ((c.usage?.[m] || 0) >= plan.callsPerMonth || (c.daily?.[d] || 0) >= plan.callsPerDay) {
    return { action: 'say', reason: 'sr_cap', text: "Hi! You've reached a voicemail-style message. The person you're calling isn't available right now. Bye!" }
  }
  let pro = c.plan === 'biz'
  if (plan.contacts && from && (c.contacts || []).length) {
    pro = c.contacts.includes(contactKey(c.key, sha256hex(from)))
  }
  return {
    action: 'screen',
    reason: 'sr_' + c.plan + (pro ? '_contact' : ''),
    pro,
    month: m,
    day: d,
    maxSecs: plan.maxSecs,
    mode: pro ? 'professional' : plan.mode,
  }
}

/** Apply a paid Smart checkout onto a customer record. Does not talk to Stripe or Blob. */
export function markSmartFromCheckout(c, session, eventId) {
  if ((c.events || []).includes(eventId)) return { duplicate: true }
  c.plan = 'smart'
  c.status = 'active'
  c.activated_at = c.activated_at || new Date().toISOString()
  c.stripe_customer = typeof session.customer === 'string' ? session.customer : session.customer?.id || c.stripe_customer
  c.stripe_sub = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || c.stripe_sub
  c.livemode = !!session.livemode
  c.amount_total = session.amount_total
  c.events = [...(c.events || []), eventId].slice(-20)
  return { duplicate: false, upgradeWelcome: !!(c.welcomed_at && c.welcomed_plan !== 'smart') }
}

export function createSpamRoastRouter({ stripe }) {
  const r = express.Router()
  r.use(express.urlencoded({ extended: false }))
  const wrap = (fn) => async (req, res) => { try { await fn(req, res) } catch (e) { console.error('[sr]', req.path, String(e?.message || e).slice(0, 300)); if (!res.headersSent) res.status(500).json({ ok: false, error: 'Something went sideways. Please try again.' }) } }

  async function newToken(c) { const k = crypto.randomBytes(24).toString('base64url'); await bput('k/' + hk('tok:' + k, 40), { key: c.key }); c.token_h = hk('tok:' + k, 40); return k }

  async function welcome(c, why) {
    if (!c.phone || c.welcomed_at || c.sms_opt_out) return false
    try { c.welcome_sid = await sms(c.phone, welcomeText(c.plan)); c.welcomed_at = new Date().toISOString(); return true }
    catch (e) { c.welcome_error = String(e.message).slice(0, 160); console.error('[sr] welcome sms', why, c.welcome_error); return false }
  }

  async function checkoutFor(c, k, { coupon } = {}) {
    if (!stripe) throw new Error('stripe not configured')
    const meta = { app: 'sr', sr_key: c.key, plan: 'smart', ...(c.attr || {}), ...(c.ref_code ? { ref_code: c.ref_code } : {}) }
    const price = env('SR_PRICE_SMART')
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [price ? { price, quantity: 1 } : { quantity: 1, price_data: { currency: 'cad', unit_amount: SR_PLANS.smart.priceCents, recurring: { interval: 'month' }, product_data: { name: 'SpamRoast Smart' } } }],
      customer_email: c.email, client_reference_id: c.key, metadata: meta, subscription_data: { metadata: meta, description: 'SpamRoast Smart' },
      ...(coupon ? { discounts: [{ coupon }], payment_method_collection: 'if_required' } : { allow_promotion_codes: true }),
      success_url: SITE + '/welcome?k=' + k + '&paid=1', cancel_url: SITE + '/welcome?k=' + k + '&canceled=1',
    })
    return s
  }

  async function signup(req, res, { test = false, coupon } = {}) {
    const b = req.body || {}
    if (b.company) return res.json({ ok: true, plan: 'free' }) // honeypot
    const name = String(b.name || '').replace(/[^\p{L}\p{M}' .-]/gu, '').trim().slice(0, 60)
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120)
    const phone = normPhone(b.phone)
    const intent = b.plan === 'smart' ? 'smart' : 'free'
    if (intent === 'smart' && !srPaidCheckoutOpen()) {
      return res.status(503).json({ ok: false, paid_not_open: true, error: 'Smart is not open for new signups yet. Free is available.' })
    }
    if (!name) return res.status(400).json({ ok: false, error: 'Add your name.' })
    if (!okEmail(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    if (!phone) return res.status(400).json({ ok: false, error: 'Enter the 10-digit Canadian or US mobile number you want to protect.' })
    if (phone === SCREENER) return res.status(400).json({ ok: false, error: 'That is our number. Enter yours!' })
    if (!(b.consent === true || b.consent === 'on' || b.consent === 'true')) return res.status(400).json({ ok: false, error: 'Please tick the consent box so we can text you your set-up steps.' })
    const key = keyFor(phone)
    let c = await getCust(key)
    const now = new Date().toISOString()
    if (c && c.status === 'active' && (c.plan === intent || c.plan === 'smart')) return res.status(409).json({ ok: false, error: 'That number is already set up. Check your texts for your set-up steps, or email hello at spamroast dot com.' })
    if (c && c.status === 'blocked') return res.status(403).json({ ok: false, error: 'This number is paused for review.' })
    const fresh = !c
    c = Object.assign(c || { key, created_at: now, plan: 'free', status: 'new', usage: {}, contacts: [], events: [] }, {
      name, email, phone, intent, test: test || c?.test || false,
      consent: { text: CONSENT_TEXT, at: now, ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 45), ua: String(req.headers['user-agent'] || '').slice(0, 160), source: 'spamroast.com signup form' },
    })
    const at = b.attr && typeof b.attr === 'object' ? b.attr : {}
    const attr = {}
    for (const f of ['ref', 'utm_source', 'utm_medium', 'utm_campaign']) { const v = String(at[f] || '').replace(/[^\w.\-+ ]/g, '').trim().slice(0, 80); if (v) attr[f] = v }
    if (Object.keys(attr).length) c.attr = attr
    if (attr.ref && !c.referred_by && fresh) { const rr = await custByRef(attr.ref.toLowerCase()); if (rr && rr.key !== key && String(rr.email).toLowerCase() !== email) { c.referred_by = { code: rr.ref_code, key: rr.key, at: now }; c.attr.ref_by = rr.ref_code } }
    await ensureRef(c)
    const k = await newToken(c)
    if (intent === 'free') {
      if (c.status !== 'active') { c.plan = 'free'; c.status = 'active'; c.activated_at = now }
      await welcome(c, 'free')
      await saveCust(c)
      await bput('e/' + hk('em:' + email), { key })
      const fid = fresh ? await toFriday(c) : null
      await notifyRandy((test ? '[TEST] ' : '') + 'new Free signup', ['New SpamRoast Free signup.', '', 'Name: ' + name, 'Email: ' + email, 'Phone: ' + phone, 'Welcome text sent: ' + (c.welcomed_at ? 'yes' : 'no' + (c.welcome_error ? ' (' + c.welcome_error + ')' : '')), 'Friday contact: ' + (fid || 'not created')])
      return res.json({ ok: true, plan: 'free', k, texted: !!c.welcomed_at })
    }
    await saveCust(c)
    await bput('e/' + hk('em:' + email), { key })
    if (fresh) await toFriday(c)
    const s = await checkoutFor(c, k, { coupon })
    return res.json({ ok: true, plan: 'smart', k, url: s.url, ...(test ? { sid: s.id } : {}) })
  }

  // ---------- Stripe events ----------
  async function findCustForSession(s) {
    let key = s.metadata?.sr_key
    let c = key ? await getCust(key) : null
    const email = String(s.customer_details?.email || s.customer_email || '').toLowerCase()
    if (!c && email) { const i = await bget('e/' + hk('em:' + email)); if (i) c = await getCust(i.key) }
    const ph = normPhone(s.customer_details?.phone)
    if (!c && ph) c = await getCust(keyFor(ph))
    if (!c) { // payment-link buyer with no signup: keep the record, phone may be unknown
      const k2 = ph ? keyFor(ph) : 'nophone-' + hk('em:' + email, 24)
      c = { key: k2, created_at: new Date().toISOString(), name: s.customer_details?.name || '', email, phone: ph || '', intent: 'smart', plan: 'free', status: 'new', usage: {}, contacts: [], events: [], source: 'payment link' }
    }
    return c
  }
  async function handleStripeEvent(evt) {
    if (await handleBizStripe(evt)) return
    const o = evt.data.object
    let c = null
    if (evt.type === 'checkout.session.completed') {
      if (o.mode !== 'subscription' && o.mode !== 'payment') return
      c = await findCustForSession(o)
      const marked = markSmartFromCheckout(c, o, evt.id)
      if (marked.duplicate) return
      if (marked.upgradeWelcome) c.welcomed_at = null // upgrade from free: send the Smart text
      const texted = await welcome(c, 'paid'); if (texted) c.welcomed_plan = 'smart'
      if (c.stripe_sub) await bput('s/' + c.stripe_sub, { key: c.key })
      await bput('e/' + hk('em:' + c.email), { key: c.key })
      await saveCust(c)
      await notifyRandy((c.test ? '[TEST] ' : '') + 'new Smart customer (C$' + ((o.amount_total || 0) / 100).toFixed(2) + ')', ['A SpamRoast Smart subscription just started.', '', 'Name: ' + (c.name || 'not given'), 'Email: ' + c.email, 'Phone: ' + (c.phone || 'NOT GIVEN (paid through the old payment link, no phone on file)'), 'Charged today: C$' + ((o.amount_total || 0) / 100).toFixed(2) + (o.livemode ? '' : ' (test mode)'), 'Welcome text sent: ' + (c.welcomed_at ? 'yes' : 'no' + (c.welcome_error ? ' (' + c.welcome_error + ')' : ''))])
      return
    }
    const subId = evt.type.startsWith('customer.subscription.') ? o.id : (typeof o.subscription === 'string' ? o.subscription : o.subscription?.id || o.parent?.subscription_details?.subscription)
    const key = srEventKey(o) !== '_' ? srEventKey(o) : null
    c = key ? await getCust(key) : null
    if (!c && subId) { const i = await bget('s/' + subId); if (i) c = await getCust(i.key) }
    if (!c) { console.warn('[sr] no customer for', evt.type, subId); return }
    if ((c.events || []).includes(evt.id)) return
    if (subId && !c.stripe_sub) c.stripe_sub = subId
    if (typeof o.customer === 'string' && !c.stripe_customer) c.stripe_customer = o.customer
    if (evt.type === 'invoice.paid') {
      if (c.status !== 'blocked') { c.status = 'active'; c.plan = 'smart' }
      c.paid_through = o.lines?.data?.[0]?.period?.end ? new Date(o.lines.data[0].period.end * 1000).toISOString() : c.paid_through
      c.last_paid_cents = o.amount_paid
      if (c.referred_by && o.amount_paid > 0) await creditReferrer(c, o.amount_paid, o.id)
    } else if (evt.type === 'customer.subscription.deleted') {
      c.status = 'canceled'; c.canceled_at = new Date().toISOString()
      try { if (c.phone && !c.sms_opt_out) await sms(c.phone, 'SpamRoast: your Smart plan is cancelled. Calls you forward to us will not be roasted anymore. To turn forwarding off, dial ##004# (Verizon *73). Thanks for roasting with us!') } catch (e) { console.error('[sr] cancel sms', String(e.message).slice(0, 120)) }
      await notifyRandy((c.test ? '[TEST] ' : '') + 'Smart subscription cancelled', ['A SpamRoast Smart subscription was cancelled and the customer is now inactive.', '', 'Name: ' + (c.name || 'not given'), 'Email: ' + c.email, 'Phone: ' + (c.phone || 'none')])
    } else if (evt.type === 'customer.subscription.updated') {
      const st = o.status
      if (st === 'active' || st === 'trialing') { if (c.status !== 'blocked') c.status = 'active' }
      else if (st === 'past_due' || st === 'unpaid' || st === 'paused') c.status = 'past_due'
      else if (st === 'canceled' || st === 'incomplete_expired') c.status = 'canceled'
    } else return
    c.events = [...(c.events || []), evt.id].slice(-20)
    await saveCust(c)
  }

  // ---------- routes ----------
  r.post('/signup', wrap((req, res) => signup(req, res)))
  // B2B leads: /business (screener for businesses) and /partners (resellers). Stored in Blob, Randy emailed. No auto-reply.
  r.post('/lead', wrap(async (req, res) => {
    const b = req.body || {}
    if (b.company_url_hp) return res.json({ ok: true })
    const s = (v, n = 120) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n)
    const kind = b.kind === 'partner' ? 'partner' : b.kind === 'us_waitlist' ? 'us_waitlist' : 'business'
    if (kind === 'us_waitlist') { const em = s(b.email).toLowerCase(); if (!okEmail(em)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' }); await bput('lead/us-' + hk('us:' + em, 20), { at: new Date().toISOString(), kind, email: em, company: s(b.company), tier: s(b.tier, 20) }); return res.json({ ok: true }) }
    const lead = { at: new Date().toISOString(), kind, name: s(b.name, 80), email: s(b.email).toLowerCase(), phone: s(b.phone, 30), company: s(b.company), type: s(b.type, 60), lines: s(b.lines, 20), tier: s(b.tier, 20), note: s(b.note, 600), attr: b.attr && typeof b.attr === 'object' ? Object.fromEntries(['ref', 'utm_source', 'utm_medium', 'utm_campaign'].map((k) => [k, s(b.attr[k], 80)]).filter((x) => x[1])) : {} }
    if (!lead.name || !okEmail(lead.email) || !lead.company) return res.status(400).json({ ok: false, error: 'Add your name, a valid email and your company.' })
    const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex')
    await bput('lead/' + id, lead)
    await notifyRandy('new ' + (kind === 'partner' ? 'PARTNER inquiry' : 'BUSINESS lead') + ' (' + lead.company + ')', ['Type: ' + kind, 'Name: ' + lead.name, 'Email: ' + lead.email, 'Phone: ' + (lead.phone || 'n/a'), 'Company: ' + lead.company, 'Industry or partner type: ' + (lead.type || 'n/a'), 'Lines: ' + (lead.lines || 'n/a'), 'Tier: ' + (lead.tier || 'n/a'), 'Note: ' + (lead.note || 'none'), 'Source: ' + (JSON.stringify(lead.attr) || '{}'), 'Lead id: ' + id])
    res.json({ ok: true })
  }))
  r.get('/me', wrap(async (req, res) => {
    const c = await custByToken(req.query.k)
    if (!c) return res.status(404).json({ ok: false })
    res.json({ ok: true, first_name: String(c.name || '').split(' ')[0], plan: c.plan, intent: c.intent, status: c.status, phone: mask(c.phone), texted: !!c.welcomed_at, contacts: (c.contacts || []).length, smart: c.plan === 'smart' && c.status === 'active', calls_this_month: c.usage?.[month()] || 0, calls_included: (SR_PLANS[c.plan] || SR_PLANS.free).callsPerMonth, ref_code: c.ref_code || await ensureRef(c).then(() => saveCust(c)).then(() => c.ref_code), ref_billed_cents: c.ref_stats?.billed_cents || 0, ref_goal_cents: REF_GOAL_CENTS, mug_goal_cents: MUG_GOAL_CENTS })
  }))
  r.post('/contacts', wrap(async (req, res) => {
    const c = await custByToken(req.body?.k)
    if (!c) return res.status(404).json({ ok: false, error: 'Link expired. Email hello at spamroast dot com.' })
    if (!(c.plan === 'smart' && c.status === 'active')) return res.status(403).json({ ok: false, error: 'Contact matching is part of the Smart plan.' })
    const hs = [...new Set((Array.isArray(req.body.hashes) ? req.body.hashes : []).filter((x) => /^[a-f0-9]{64}$/.test(x)))].slice(0, 1000).map((x) => contactKey(c.key, x))
    c.contacts = [...new Set([...(req.body.replace ? [] : c.contacts || []), ...hs])].slice(0, 1000)
    await saveCust(c)
    res.json({ ok: true, count: c.contacts.length })
  }))
  r.post('/portal', wrap(async (req, res) => {
    const c = await custByToken(req.body?.k)
    if (!c?.stripe_customer) return res.status(404).json({ ok: false, error: 'No paid plan on this link yet.' })
    const p = await stripe.billingPortal.sessions.create({ customer: c.stripe_customer, return_url: SITE + '/' })
    res.json({ ok: true, url: p.url })
  }))
  r.get('/health', (_req, res) => res.json({ ok: true, service: 'spamroast', stripe: !!stripe, blob: !!env('BLOB_READ_WRITE_TOKEN'), friday: !!env('FRIDAY_INTAKE_SECRET'), price: !!env('SR_PRICE_SMART'), link: !!env('SR_PAYMENT_LINK') }))
  r.post('/admin', wrap(async (req, res) => {
    if (!env('FSC_ADMIN_KEY') || !safeEq(req.headers['x-fsc-admin'], env('FSC_ADMIN_KEY'))) return res.status(403).json({ error: 'forbidden' })
    const a = req.query.a
    if (a === 'link') { // inspect the existing Smart payment link (ids only)
      const links = await stripe.paymentLinks.list({ limit: 50, active: true })
      const out = []
      for (const l of links.data) { if (!String(l.url).endsWith(String(req.query.suffix || '8AE05'))) continue; const li = await stripe.paymentLinks.listLineItems(l.id); out.push({ id: l.id, url: l.url, metadata: l.metadata, after: l.after_completion, phone: l.phone_number_collection, price: li.data[0]?.price?.id, amount: li.data[0]?.price?.unit_amount, currency: li.data[0]?.price?.currency, product: li.data[0]?.price?.product }) }
      return res.json(out)
    }
    if (a === 'testcheckout') { // $0 live checkout via a single-use 100%-off coupon; no card, no charge
      const cp = await stripe.coupons.create({ percent_off: 100, duration: 'once', max_redemptions: 1, name: 'SpamRoast internal E2E test', metadata: { app: 'sr', test: '1' } })
      req.body = { ...req.body, plan: 'smart', consent: true }
      return signup(req, res, { test: true, coupon: cp.id })
    }
    if (a === 'testfree') { req.body = { ...req.body, plan: 'free', consent: true }; return signup(req, res, { test: true }) }
    if (a === 'user') { const c = await getCust(keyFor(normPhone(req.query.phone))); return res.json(c ? { ...c, contacts: (c.contacts || []).length, token_h: undefined, consent: c.consent && { at: c.consent.at, source: c.consent.source } } : null) }
    if (a === 'cancel') { const c = await getCust(keyFor(normPhone(req.query.phone))); if (!c?.stripe_sub) return res.json({ ok: false }); const s = await stripe.subscriptions.cancel(c.stripe_sub); return res.json({ ok: true, status: s.status }) }
    if (a === 'purge') { const c = await getCust(keyFor(normPhone(req.query.phone))); if (!c?.test) return res.json({ ok: false, error: 'only test records' }); const { del } = await blob(); await del('sr/c/' + c.key + '.json'); return res.json({ ok: true }) }
    if (a === 'bizlist' || a === 'bizpurge') { // list biz teams, or delete one PENDING (never-paid) team by id
      const { list, del } = await blob(); const out = []; let cursor
      do { const l = await list({ prefix: 'sr/t/', cursor }); cursor = l.cursor; for (const x of l.blobs) { const t = await bget(x.pathname.slice(3, -5)); if (t) out.push({ id: t.id, company: t.company, status: t.status, owner: t.owner_email, created_at: t.created_at }) } } while (cursor)
      if (a === 'bizlist') return res.json({ teams: out })
      const t = await tget(String(req.query.id || '')); if (!t || t.status !== 'pending') return res.json({ ok: false, error: 'only pending teams' })
      const idx = [...(t.members || []).map((m) => 'te/' + hk('te:' + m.email)), ...(t.invites || []).map((i) => 'ti/' + hk('ti:' + i.email))]
      for (const k of [...idx, ...(t.members || []).map((m) => 'lc/' + hk('lc:' + m.email))]) await del('sr/' + k + '.json').catch(() => {})
      await del('sr/t/' + t.id + '.json'); return res.json({ ok: true, deleted: t.id, company: t.company })
    }
    if (a === 'welcometext') return res.json({ text: welcomeText(req.query.plan || 'free'), chars: welcomeText(req.query.plan || 'free').length })
    if (a === 'route') return res.json(await srRoute({ fwd: req.body.fwd, from: req.body.from, callSid: 'sim-' + crypto.randomUUID(), dry: true }))
    res.json({ error: 'unknown' })
  }))
  mountBiz(r, { stripe, wrap })
  r.handleStripeEvent = handleStripeEvent
  return r
}

// ---------- screener ----------
let spendFn = null
export function setSpendGate(fn) { spendFn = fn }
const say = (reason, text) => ({ action: 'say', reason, text })
/** Decide a call to the screener for a SpamRoast customer. Returns null when the call is not a SpamRoast customer's. */
export async function srRoute(b) {
  const fwd = normPhone(b.fwd), from = normPhone(b.from)
  let c = fwd ? await getCust(keyFor(fwd)) : null
  if (!c && from && !fwd) { // the customer calling us from their own phone: quick self-check, no roast
    const self = await getCust(keyFor(from))
    if (self && self.status === 'active') return say('sr_self', `Hi! Your SpamRoast ${SR_PLANS[self.plan]?.name || 'Free'} plan is active. Forward your missed calls to this number and we'll take it from here. Bye for now!`)
    if (self) return say('sr_self_inactive', "Hi! Your SpamRoast plan isn't active right now. Bye for now!")
    return null
  }
  if (!c) return null
  const decision = decideSrCall(c, from)
  if (!decision) return null
  if (decision.action === 'say') return say(decision.reason, decision.text)
  if (process.env.FSC_OFF === '1') return say('off', "Hi! This line's assistant is taking a nap. Bye for now!")
  const plan = SR_PLANS[c.plan] || SR_PLANS.free
  const m = decision.month
  const d = decision.day
  const pro = decision.pro
  c.usage = c.usage || {}; c.daily = c.daily || {}
  if (spendFn) { try { const g = await spendFn(); if (!g.ok) return say('sr_global_cap', 'Hi! The assistant on this line is busy right now. Bye for now!') } catch { /* gate unreachable: plan caps still apply */ } }
  if (!b.dry) {
    c.usage = { [m]: (c.usage[m] || 0) + 1 }; c.daily = { [d]: (c.daily[d] || 0) + 1 }; c.last_call_at = new Date().toISOString()
    await saveCust(c)
    if (c.plan === 'biz' && c.team_id) await bizCount(c.team_id, 'calls').catch(() => {})
    if (pro && b.callSid) await bput('pend/' + String(b.callSid).replace(/[^A-Za-z0-9]/g, ''), { key: c.key, at: Date.now() })
  }
  return { action: 'screen', reason: 'sr_' + c.plan + (pro ? '_contact' : ''), voice_id: c.voice ? VOICES[c.voice] || '' : '', mode: pro ? 'professional' : plan.mode, max_secs: plan.maxSecs,
    ...(pro ? { agent_id: PRO_AGENT(), owner_name: 'none' } : {}), ...(c.plan === 'biz' ? { notice: 'This call may be screened and recorded.', business: true, allowlisted: !!(from && (c.contacts || []).includes(contactKey(c.key, sha256hex(from)))) } : {}) }
}

/** Twilio status callback while the FSC database is down: deliver Smart message-taking results by SMS. */
export async function srStatus(params) {
  const sid = String(params.CallSid || '').replace(/[^A-Za-z0-9]/g, '')
  if (!sid) return false
  const p = await bget('pend/' + sid)
  if (!p) return false
  const c = await getCust(p.key)
  const key = env('FSC_ELEVENLABS_KEY')
  if (!c || !key) return false
  const h = { 'xi-api-key': key }
  let conv = null
  for (let i = 0; i < 6 && !conv; i++) {
    const l = await fetch('https://api.elevenlabs.io/v1/convai/conversations?page_size=10&agent_id=' + PRO_AGENT(), { headers: h }).then((x) => x.json()).catch(() => ({}))
    for (const cv of l.conversations || []) {
      const d = await fetch('https://api.elevenlabs.io/v1/convai/conversations/' + cv.conversation_id, { headers: h }).then((x) => x.json()).catch(() => ({}))
      if (d.metadata?.phone_call?.call_sid === params.CallSid) { if (d.status === 'done' && d.analysis) conv = d; break }
    }
    if (!conv) await new Promise((r) => setTimeout(r, 2500))
  }
  if (!conv) return false
  const dc = conv.analysis.data_collection_results || {}
  const v = (k) => unlink(dc[k]?.value ?? '').slice(0, 120)
  const body = `SpamRoast: ${c.plan === 'biz' ? 'a caller left a message on your business line.' : 'someone in your contacts called and left a message.'}\nName: ${v('caller_name') || 'Not given'}\nCallback: ${v('callback_number') || 'Not given'}\nReason: ${v('reason') || unlink(conv.analysis.transcript_summary).slice(0, 200) || 'Not given'}`
  if (c.team_id) await bizMessage(c.team_id, { at: new Date().toISOString(), line: mask(c.phone), name: v('caller_name'), callback: v('callback_number'), reason: v('reason') || unlink(conv.analysis.transcript_summary).slice(0, 200) }).catch(() => {})
  try { for (const to of (c.alert_phones && c.alert_phones.length ? c.alert_phones : [c.phone])) await sms(to, body) } catch (e) { console.error('[sr] msg sms', String(e.message).slice(0, 120)); return false }
  const { del } = await blob(); await del('sr/pend/' + sid + '.json').catch(() => {})
  return true
}

// ======================= SpamRoast for Business (teams) =======================
// Team = one central account. Login = 6-digit email code (no passwords, no links in email). Roles: owner | member.
// Lines forward unanswered calls to the shared screener; the screener runs the polite professional message-taker (never roasts).
export const BIZ_TIERS = {
  team: { name: 'Team', cents: 4900, seats: 5, lines: 1 },
  office: { name: 'Office', cents: 12900, seats: 15, lines: 3 },
}
const BIZ_TRIAL_DAYS = 14
const tget = (id) => (id ? bget('t/' + id) : null)
async function tsave(t) { t.updated_at = new Date().toISOString(); await bput('t/' + t.id, t); return t }
async function bizCount(teamId, k) { const t = await tget(teamId); if (!t) return; const w = month(); t.stats = t.stats || {}; t.stats[w] = t.stats[w] || { calls: 0, messages: 0 }; t.stats[w][k] = (t.stats[w][k] || 0) + 1; await tsave(t) }
async function bizMessage(teamId, m) { const t = await tget(teamId); if (!t) return; t.messages = [m, ...(t.messages || [])].slice(0, 50); const w = month(); t.stats = t.stats || {}; t.stats[w] = t.stats[w] || { calls: 0, messages: 0 }; t.stats[w].messages++; await tsave(t) }
// keep each line's screener record in sync with the team (status, allowlist, alert phones)
async function syncLines(t) {
  const active = ['trialing', 'active'].includes(t.status)
  const allow = (t.allowlist || []).map((a) => a.d)
  for (const ln of t.lines || []) {
    const key = keyFor(ln.phone)
    const c = (await getCust(key)) || { key, created_at: new Date().toISOString(), usage: {}, daily: {}, events: [] }
    Object.assign(c, { phone: ln.phone, plan: 'biz', status: active ? 'active' : 'canceled', team_id: t.id, name: t.company, email: t.owner_email, alert_phones: t.alert_phones || [], contacts: allow.map((d) => contactKey(key, d)), test: !!t.test })
    await saveCust(c)
  }
}
function bizView(t, email) {
  const me = (t.members || []).find((m) => m.email === email)
  const w = month(), s = (t.stats || {})[w] || { calls: 0, messages: 0 }
  return { ok: true, me: { email, role: me?.role || 'member' }, team: { id: t.id, company: t.company, tier: t.tier, tier_name: BIZ_TIERS[t.tier]?.name, country: t.country, currency: t.currency, status: t.status, trial_end: t.trial_end || null,
    seats_used: (t.members || []).length + (t.invites || []).length, seats_limit: BIZ_TIERS[t.tier]?.seats, lines: (t.lines || []).map((l) => ({ phone: l.phone })), lines_limit: BIZ_TIERS[t.tier]?.lines,
    members: (t.members || []).map((m) => ({ email: m.email, role: m.role })), invites: (t.invites || []).map((i) => ({ email: i.email })), allowlist: (t.allowlist || []).map((a) => ({ id: a.id, label: a.label, phone: a.shown })),
    weekly_summary: !!t.weekly_summary, month: w, calls: s.calls || 0, messages: s.messages || 0, passed: Math.min(s.messages || 0, s.calls || 0), blocked: Math.max(0, (s.calls || 0) - (s.messages || 0)), recent: (t.messages || []).slice(0, 20),
    provisioning: t.provision || null, screener: '289-367-5302' } }
}

export function mountBiz(r, { stripe, wrap }) {
  const mailOK = (e) => okEmail(e)
  async function session(req) {
    const tok = String(req.headers['x-sr-session'] || '')
    if (!/^[A-Za-z0-9_-]{30,64}$/.test(tok)) return null
    const s = await bget('ss/' + hk('ss:' + tok, 40)); if (!s || s.exp < Date.now()) return null
    const t = await tget(s.team_id); if (!t || !(t.members || []).some((m) => m.email === s.email)) return null
    return { t, email: s.email, role: t.members.find((m) => m.email === s.email).role }
  }
  async function newSession(email, teamId) { const tok = crypto.randomBytes(30).toString('base64url'); await bput('ss/' + hk('ss:' + tok, 40), { email, team_id: teamId, exp: Date.now() + 30 * 864e5 }); return tok }
  const need = (fn, owner = false) => wrap(async (req, res) => { const s = await session(req); if (!s) return res.status(401).json({ ok: false, error: 'Please log in again.' }); if (owner && s.role !== 'owner') return res.status(403).json({ ok: false, error: 'Only the account owner can do that.' }); return fn(req, res, s) })
  const str = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n)

  // 1) start trial: create team (pending) -> Stripe Checkout with 14-day trial, card collected
  r.post('/biz/start', wrap(async (req, res) => {
    const b = req.body || {}
    if (b.hp) return res.json({ ok: true })
    if (!srPaidCheckoutOpen()) {
      return res.status(503).json({ ok: false, paid_not_open: true, error: 'Business trials are not open for new checkouts. Existing teams can still log in.' })
    }
    const tier = BIZ_TIERS[b.tier] ? b.tier : null
    const email = str(b.email, 120).toLowerCase(), name = str(b.name, 80), company = str(b.company, 100)
    if (b.country === 'US') return res.status(400).json({ ok: false, error: 'US is coming soon. Join the waitlist and we will let you know.' })
    const country = 'CA', currency = 'cad'
    const line = normPhone(b.line), alert = normPhone(b.alert)
    if (!tier) return res.status(400).json({ ok: false, error: 'Pick a plan.' })
    if (!name || !company) return res.status(400).json({ ok: false, error: 'Add your name and business name.' })
    if (!mailOK(email)) return res.status(400).json({ ok: false, error: 'Enter a valid work email.' })
    if (!line) return res.status(400).json({ ok: false, error: 'Enter the 10-digit business phone line to protect.' })
    if (!alert) return res.status(400).json({ ok: false, error: 'Enter a mobile number for message texts.' })
    if (line === SCREENER) return res.status(400).json({ ok: false, error: 'That is our number. Enter yours!' })
    if (!(b.terms === true || b.terms === 'on' || b.terms === 'true')) return res.status(400).json({ ok: false, error: 'Please accept the terms to continue.' })
    const lineCust = await getCust(keyFor(line)); if (lineCust && lineCust.team_id && lineCust.status === 'active') return res.status(409).json({ ok: false, error: 'That line is already on a SpamRoast team. Log in instead.' })
    const ex = await bget('te/' + hk('te:' + email)); if (ex) { const et = await tget(ex.team_id); if (et && ['trialing', 'active'].includes(et.status)) return res.status(409).json({ ok: false, error: 'That email already has a team. Log in instead.' }) }
    const id = 't' + crypto.randomBytes(8).toString('hex'), now = new Date().toISOString()
    const at = b.attr && typeof b.attr === 'object' ? Object.fromEntries(['ref', 'utm_source', 'utm_medium', 'utm_campaign'].map((k) => [k, str(b.attr[k], 80)]).filter((x) => x[1])) : {}
    const t = { id, created_at: now, status: 'pending', tier, country, currency, company, owner_email: email, owner_name: name, members: [{ email, role: 'owner', joined_at: now }], invites: [], lines: [{ phone: line }], alert_phones: [alert], allowlist: [], weekly_summary: true, attr: at, test: false,
      terms: { at: now, ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 45), text: 'Accepted SpamRoast Business terms and disclaimers at signup' } }
    await tsave(t); await bput('te/' + hk('te:' + email), { team_id: id })
    const meta = { app: 'sr', sr_key: '_', biz: '1', team_id: id, tier, country }
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription', customer_email: email, client_reference_id: id, metadata: meta,
      line_items: [{ quantity: 1, price_data: { currency, unit_amount: BIZ_TIERS[tier].cents, recurring: { interval: 'month' }, product_data: { name: 'SpamRoast Business ' + BIZ_TIERS[tier].name } } }],
      subscription_data: { trial_period_days: BIZ_TRIAL_DAYS, metadata: meta, description: 'SpamRoast Business ' + BIZ_TIERS[tier].name },
      payment_method_collection: 'always', allow_promotion_codes: true, adaptive_pricing: { enabled: false },
      custom_text: { submit: { message: 'Free for 14 days, then ' + (currency === 'usd' ? 'US$' : 'C$') + (BIZ_TIERS[tier].cents / 100) + '/month. Cancel anytime before then and you pay nothing. SpamRoast is a call filter with no guarantee: some legitimate calls may be screened, and liability is limited to fees paid. Inbound only.' } },
      success_url: SITE + '/team?welcome=1', cancel_url: SITE + '/business?canceled=1#plans',
    })
    const tok = await newSession(email, id)
    res.json({ ok: true, url: s.url, session: tok, ...(b._test ? { sid: s.id } : {}) })
  }))

  // 2) login with a 6-digit email code (owners, members and invitees)
  r.post('/biz/login', wrap(async (req, res) => {
    const email = str(req.body?.email, 120).toLowerCase()
    if (!mailOK(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    const idx = (await bget('te/' + hk('te:' + email))) || (await bget('ti/' + hk('ti:' + email)))
    const ok = { ok: true, message: 'If that email is on a SpamRoast team, a 6-digit code is on its way.' }
    if (!idx) return res.json(ok)
    const prev = await bget('lc/' + hk('lc:' + email)); if (prev && Date.now() - prev.sent < 45000) return res.json(ok)
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0')
    await bput('lc/' + hk('lc:' + email), { h: hk('code:' + email + ':' + code, 40), exp: Date.now() + 15 * 6e4, tries: 0, sent: Date.now(), team_id: idx.team_id })
    await mail(email, 'Your SpamRoast login code: ' + code, 'Your SpamRoast login code is ' + code + '\n\nEnter it on the log-in screen within 15 minutes. If you did not ask for this, you can ignore this email.\n\nSpamRoast')
    res.json(ok)
  }))
  r.post('/biz/verify', wrap(async (req, res) => {
    const email = str(req.body?.email, 120).toLowerCase(), code = String(req.body?.code || '').replace(/\D/g, '')
    const lc = await bget('lc/' + hk('lc:' + email))
    if (!lc || lc.exp < Date.now() || lc.tries >= 5) return res.status(400).json({ ok: false, error: 'That code expired. Ask for a new one.' })
    if (!safeEq(lc.h, hk('code:' + email + ':' + code, 40))) { lc.tries++; await bput('lc/' + hk('lc:' + email), lc); return res.status(400).json({ ok: false, error: 'Wrong code. Try again.' }) }
    lc.exp = 0; await bput('lc/' + hk('lc:' + email), lc)
    const t = await tget(lc.team_id); if (!t) return res.status(404).json({ ok: false, error: 'Team not found.' })
    let joined = false
    if (!(t.members || []).some((m) => m.email === email)) {
      if (!(t.invites || []).some((i) => i.email === email)) return res.status(403).json({ ok: false, error: 'That invite was removed. Ask your team owner.' })
      if ((t.members || []).length >= BIZ_TIERS[t.tier].seats) return res.status(403).json({ ok: false, error: 'Your team is out of seats. Ask your owner to upgrade.' })
      t.invites = t.invites.filter((i) => i.email !== email); t.members.push({ email, role: 'member', joined_at: new Date().toISOString() }); joined = true
      await tsave(t); await bput('te/' + hk('te:' + email), { team_id: t.id })
    }
    res.json({ ok: true, session: await newSession(email, t.id), joined })
  }))
  r.post('/biz/logout', wrap(async (req, res) => { const tok = String(req.headers['x-sr-session'] || ''); if (tok) await bput('ss/' + hk('ss:' + tok, 40), { exp: 0 }); res.json({ ok: true }) }))

  // 3) dashboard + team functions
  r.get('/biz/team', need(async (req, res, s) => res.json(bizView(s.t, s.email))))
  r.post('/biz/invite', need(async (req, res, s) => {
    const t = s.t, email = str(req.body?.email, 120).toLowerCase()
    if (!mailOK(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    if ((t.members || []).some((m) => m.email === email) || (t.invites || []).some((i) => i.email === email)) return res.status(409).json({ ok: false, error: 'Already on the team or invited.' })
    if ((t.members || []).length + (t.invites || []).length >= BIZ_TIERS[t.tier].seats) return res.status(403).json({ ok: false, error: 'All ' + BIZ_TIERS[t.tier].seats + ' seats are used. Upgrade to add more.' })
    const other = await bget('te/' + hk('te:' + email)); if (other && other.team_id !== t.id) return res.status(409).json({ ok: false, error: 'That email is already on another SpamRoast team.' })
    t.invites.push({ email, at: new Date().toISOString(), by: s.email }); await tsave(t); await bput('ti/' + hk('ti:' + email), { team_id: t.id })
    await mail(email, 'You are invited to the ' + unlink(t.company) + ' team on SpamRoast', 'Hi,\n\n' + unlink(s.email) + ' added you to the ' + unlink(t.company) + ' team on SpamRoast, the front-desk spam call screener.\n\nTo join, open the SpamRoast site, choose Business, then Log in, and enter this email address. We will email you a 6-digit code. No password needed.\n\nSpamRoast')
    res.json({ ok: true, ...bizView(t, s.email) })
  }, true))
  r.post('/biz/remove', need(async (req, res, s) => {
    const t = s.t, email = str(req.body?.email, 120).toLowerCase()
    if (email === t.owner_email) return res.status(400).json({ ok: false, error: 'The owner cannot be removed.' })
    t.members = t.members.filter((m) => m.email !== email); t.invites = t.invites.filter((i) => i.email !== email); await tsave(t)
    res.json({ ok: true, ...bizView(t, s.email) })
  }, true))
  r.post('/biz/allow', need(async (req, res, s) => {
    const t = s.t, b = req.body || {}
    if (b.remove) t.allowlist = (t.allowlist || []).filter((a) => a.id !== b.remove)
    else {
      const ph = normPhone(b.phone); if (!ph) return res.status(400).json({ ok: false, error: 'Enter a 10-digit phone number.' })
      if ((t.allowlist || []).length >= 500) return res.status(400).json({ ok: false, error: 'Allowlist is full (500).' })
      const d = sha256hex(ph); if ((t.allowlist || []).some((a) => a.d === d)) return res.status(409).json({ ok: false, error: 'Already on the list.' })
      t.allowlist = [...(t.allowlist || []), { id: crypto.randomBytes(5).toString('hex'), d, shown: mask(ph), label: str(b.label, 40), by: s.email, at: new Date().toISOString() }]
    }
    await tsave(t); await syncLines(t)
    res.json({ ok: true, ...bizView(t, s.email) })
  }))
  r.post('/biz/settings', need(async (req, res, s) => {
    const t = s.t, b = req.body || {}
    if (typeof b.weekly_summary === 'boolean') t.weekly_summary = b.weekly_summary
    if (s.role === 'owner' && b.line) {
      const ph = normPhone(b.line); if (!ph) return res.status(400).json({ ok: false, error: 'Enter a 10-digit line.' })
      if ((t.lines || []).length >= BIZ_TIERS[t.tier].lines) return res.status(403).json({ ok: false, error: 'Your plan includes ' + BIZ_TIERS[t.tier].lines + ' line(s).' })
      if (!(t.lines || []).some((l) => l.phone === ph)) t.lines.push({ phone: ph })
    }
    await tsave(t); await syncLines(t)
    res.json({ ok: true, ...bizView(t, s.email) })
  }))
  r.post('/biz/portal', need(async (req, res, s) => {
    if (!s.t.stripe_customer) return res.status(400).json({ ok: false, error: 'Billing is still being set up. Try again in a minute.' })
    const p = await stripe.billingPortal.sessions.create({ customer: s.t.stripe_customer, return_url: SITE + '/team' })
    res.json({ ok: true, url: p.url })
  }, true))
}

// Stripe events for business teams. Returns true when handled.
export async function handleBizStripe(evt) {
  const o = evt.data.object
  const m = o.metadata?.biz ? o.metadata : (o.subscription_details?.metadata || o.parent?.subscription_details?.metadata || {})
  if (!m.biz || !m.team_id) return false
  const t = await tget(m.team_id); if (!t) return true
  if ((t.events || []).includes(evt.id)) return true
  if (evt.type === 'checkout.session.completed') {
    t.stripe_customer = typeof o.customer === 'string' ? o.customer : o.customer?.id
    t.stripe_sub = typeof o.subscription === 'string' ? o.subscription : o.subscription?.id
    t.status = 'trialing'; t.livemode = !!o.livemode; t.started_at = new Date().toISOString(); t.trial_end = new Date(Date.now() + BIZ_TRIAL_DAYS * 864e5).toISOString()
    // provisioning: lines forward to the shared screener (no number purchase needed). US teams: a local US number is queued for manual set-up.
    t.provision = t.country === 'US' ? { status: 'queued', note: 'US local screener number queued for manual set-up; forwarding to the shared screener works meanwhile.' } : { status: 'ready', note: 'Forward to the shared screener.' }
    await syncLines(t)
    await notifyRandy((t.test ? '[TEST] ' : '') + 'new Business trial: ' + t.company + ' (' + BIZ_TIERS[t.tier].name + ', ' + t.country + ')', ['A SpamRoast Business 14-day trial started.', '', 'Company: ' + t.company, 'Owner: ' + t.owner_name + ' (' + t.owner_email + ')', 'Plan: ' + BIZ_TIERS[t.tier].name + ' ' + (t.currency === 'usd' ? 'US$' : 'C$') + BIZ_TIERS[t.tier].cents / 100 + '/mo', 'Lines: ' + t.lines.map((l) => l.phone).join(', '), t.country === 'US' ? 'ACTION: US team. A US local screener number is queued for manual set-up (about US$1.15 a month on Twilio).' : 'No action needed: forwarding to the shared screener.'])
    if (t.alert_phones?.[0]) { try { await sms(t.alert_phones[0], 'SpamRoast Business: your 14-day trial is on. To start screening, forward unanswered calls on your business line to 289-367-5302. Rogers, Fido, Telus, Koodo, Freedom, AT&T, T-Mobile: dial **004*12893675302# then Call. Verizon: *712893675302. Bell, Virgin: phone settings, call forwarding, when unanswered. Reply STOP to opt out.') } catch (e) { console.error('[sr biz] sms', String(e.message).slice(0, 120)) } }
  } else if (evt.type === 'customer.subscription.updated') {
    const st = o.status; t.status = st === 'trialing' ? 'trialing' : st === 'active' ? 'active' : ['past_due', 'unpaid', 'paused'].includes(st) ? 'past_due' : st === 'canceled' ? 'canceled' : t.status
    if (o.trial_end) t.trial_end = new Date(o.trial_end * 1000).toISOString()
    await syncLines(t)
  } else if (evt.type === 'customer.subscription.deleted') { t.status = 'canceled'; await syncLines(t) }
  else if (evt.type === 'invoice.paid') { if (o.amount_paid > 0) { t.status = 'active'; t.last_paid_cents = o.amount_paid; await syncLines(t) } }
  else return true
  t.events = [...(t.events || []), evt.id].slice(-30)
  await tsave(t)
  return true
}
