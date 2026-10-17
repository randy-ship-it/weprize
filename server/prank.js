/**
 * Prank a friend (they opt in first). Mounted at /api/fsc/prank. State lives in the private Vercel Blob
 * store under fsc/prank/* (works while the FSC database is down). Outbound calls are plain TwiML
 * (<Say> + speech <Gather>), no voice AI: cheapest and fully scripted, so the reveal always happens.
 *
 *  Sender:  POST /code {email,fp}  -> emails a 6-digit code (no links)
 *           POST /verify {email,fp,code} -> {stoken}
 *           POST /create {stoken,email,fp,phone,prank} -> texts the friend the opt-in; {id,k}
 *           GET  /state?id&k  | POST /reveal {id,k} | GET /clip?id&k (private recording)
 *  Public:  POST /block {phone} (never-call list, checked before any opt-in SMS)
 *  Twilio:  POST /sms (screener number inbound SMS), /voice, /status, /rec  (X-Twilio-Signature checked)
 *  Admin:   POST /admin?a=reset_test|stats (x-fsc-admin)
 * Spend: every send/call checks the same US$3/24h cap as the screener (Twilio log), and FSC_OFF kills it.
 */
import crypto from 'node:crypto'
import express from 'express'
import { normPhone } from './fsc-core.js'
import { PRANKS, LINES, OPT_IN_SMS, YES_REPLY, speakNumber, caMobile, nextMove, CALL_TIME_LIMIT_SEC, PRANK_WORST_USD, prankCallUsd, screenedCallUsd, PRANK_RATES } from './prank-core.js'

const SITE = 'https://weprize.net'
const BASE = SITE + '/api/fsc/prank'
const env = (n) => { const v = process.env[n]; return v && v.trim() ? v.trim() : null }
const FROM = () => env('PRANK_FROM') || '+12893675302'
const VOICE = () => env('PRANK_VOICE') || 'Polly.Joanna-Neural'
const OUR_NUMBERS = new Set(['+12893675302', '+16476926575'])
const SENDER_DAY = 3, IP_DAY = 3, ASK_TTL_MS = 24 * 3600e3
const secret = () => env('FSC_HOOK_SECRET') || 'x'
const h = (x) => crypto.createHmac('sha256', secret()).update(String(x)).digest('hex')
const hk = (x, n = 40) => h(x).slice(0, n)
const safeEq = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
const okEmail = (e) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)
const day = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(d)
const mask = (p) => (p ? '(***) ***-' + p.slice(-4) : '')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---------- blob ----------
let blobMod = null
const blob = async () => (blobMod ||= await import('@vercel/blob'))
async function bput(path, obj) { const { put } = await blob(); await put('fsc/prank/' + path + '.json', JSON.stringify(obj), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' }) }
async function bget(path) { try { const { get } = await blob(); const r = await get('fsc/prank/' + path + '.json', { access: 'private', useCache: false }); if (!r || !r.stream) return null; return JSON.parse(await new Response(r.stream).text()) } catch { return null } }
async function bdel(path) { try { const { del } = await blob(); await del('fsc/prank/' + path + '.json') } catch {} }

// ---------- twilio REST ----------
const auth = () => 'Basic ' + Buffer.from(env('FSC_TWILIO_ACCOUNT_SID') + ':' + env('FSC_TWILIO_AUTH_TOKEN')).toString('base64')
const API = () => 'https://api.twilio.com/2010-04-01/Accounts/' + env('FSC_TWILIO_ACCOUNT_SID')
async function tw(method, path, form) {
  const r = await fetch(API() + path, { method, headers: { authorization: auth(), ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) }, body: form ? new URLSearchParams(form).toString() : undefined, signal: AbortSignal.timeout(9000) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error('twilio ' + r.status + ' ' + (j.code || '') + ' ' + String(j.message || '').slice(0, 160)); e.code = j.code; e.status = r.status; throw e }
  return j
}
function verifyTwilio(req) {
  const sig = req.headers['x-twilio-signature'], token = env('FSC_TWILIO_AUTH_TOKEN')
  if (!sig || !token) return false
  const url = SITE + req.originalUrl, p = req.body || {}
  const data = url + Object.keys(p).sort().map((k) => k + p[k]).join('')
  return safeEq(crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64'), sig)
}

/** Spend on the shared screener number in the last 24h (inbound screened calls + prank calls + texts), same cap as the screener gate. */
async function spend24h() {
  const after = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  const since = Date.now() - 864e5, f = encodeURIComponent(FROM())
  const [inb, out, msgs] = await Promise.all([
    tw('GET', `/Calls.json?To=${f}&StartTime>=${after}&PageSize=500`), tw('GET', `/Calls.json?From=${f}&StartTime>=${after}&PageSize=500`), tw('GET', `/Messages.json?From=${f}&DateSent>=${after}&PageSize=500`)])
  const recent = (c) => new Date(c.start_time || c.date_created).getTime() >= since
  let usd = 0
  for (const c of inb.calls || []) { if (!recent(c) || (c.direction && c.direction !== 'inbound')) continue; usd += c.status === 'completed' ? screenedCallUsd(+c.duration || 0) : ['queued', 'ringing', 'in-progress'].includes(c.status) ? 0.122 : 0 }
  for (const c of out.calls || []) { if (!recent(c) || !String(c.direction).startsWith('outbound')) continue; usd += c.status === 'completed' ? prankCallUsd(+c.duration || 0) : ['queued', 'ringing', 'in-progress'].includes(c.status) ? prankCallUsd(CALL_TIME_LIMIT_SEC) : 0 }
  for (const m of msgs.messages || []) { if (new Date(m.date_created).getTime() >= since) usd += (+m.num_segments || 1) * PRANK_RATES.smsSeg }
  return usd
}
async function gate() {
  if (env('FSC_OFF') === '1' || env('PRANK_OFF') === '1') return { ok: false, why: 'off' }
  const cap = parseFloat(env('FSC_GLOBAL_DAILY_CAP_USD') || '3') || 3
  const usd = await spend24h()
  return usd + PRANK_WORST_USD > cap ? { ok: false, why: 'cap', usd } : { ok: true, usd }
}

// ---------- email (no links, domains or paths) ----------
function clean(t) { if (/https?:|www\.|\.(com|ca|org|net|io)\b|\/[a-z]/i.test(t)) throw new Error('email body failed the no-links scan'); return t }
async function mail(to, subject, text) {
  if (!env('RESEND_API_KEY') || !to) return false
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env('RESEND_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('FSC_EMAIL_FROM') || 'Spam Fun <hello@weprize.net>', to: [to], subject, text: clean(text) }) })
  return r.ok
}

const STOP_WORDS = /^(stop|stopall|unsubscribe|cancel|end|quit|no|revoke|optout|opt out)\b/i
const YES_WORDS = /^(yes|y|yep|yeah|yup|ok|okay|sure|si|oui)\b/i
const ip = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()

export function createPrankRouter({ recordCost } = {}) {
  const r = express.Router()
  r.use(express.urlencoded({ extended: false }))
  const wrap = (fn) => async (req, res) => { try { await fn(req, res) } catch (e) { console.error('[prank]', req.path, String(e?.message || e).slice(0, 300)); if (!res.headersSent) res.status(500).json({ ok: false, error: 'Something went sideways. Please try again.' }) } }
  const xml = (res, body) => res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response>' + body + '</Response>')
  const say = (t) => `<Say voice="${VOICE()}"><prosody rate="90%">${esc(t)}</prosody></Say>`
  const load = async (id) => (/^[a-f0-9]{20}$/.test(String(id || '')) ? bget('p/' + id) : null)
  const owner = async (q) => { const p = await load(q.id); return p && safeEq(h('k:' + String(q.k || '')).slice(0, 40), p.k_hash) ? p : null }

  // ----- sender verification (same pattern as the free-try code) -----
  r.post('/code', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase(), fp = String(req.body?.fp || '')
    if (req.body?.company) return res.json({ ok: true })
    if (!okEmail(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email.' })
    if (fp.length < 16) return res.status(400).json({ ok: false, error: 'Please reload the page and try again.' })
    const key = 'code/' + hk('c:' + email + ':' + fp), prev = await bget(key)
    const recent = (prev?.sent || []).filter((t) => Date.now() - t < 3600e3)
    if (recent.length >= 3) return res.status(429).json({ ok: false, error: 'Too many codes requested. Try again in an hour.' })
    const code = String(crypto.randomInt(100000, 1000000))
    await bput(key, { code_hash: h('code:' + email + ':' + code), attempts: 0, exp: Date.now() + 15 * 60e3, sent: [...recent, Date.now()] })
    const sent = await mail(email, 'Your WePrize code: ' + code, 'Your WePrize code is ' + code + '.\n\nEnter it on the Spam Fun page to send your friend a joke call. They get a text first and only get the call if they reply YES. It expires in 15 minutes.\n\nDidn\'t ask for this? You can ignore this email.')
    if (!sent) return res.status(502).json({ ok: false, error: "We couldn't send the code. Check the email and try again." })
    res.json({ ok: true })
  }))
  const stokenFor = (email, fp) => h('st:' + email + ':' + fp + ':' + day()).slice(0, 32)
  r.post('/verify', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase(), fp = String(req.body?.fp || ''), code = String(req.body?.code || '').replace(/\D/g, '')
    const key = 'code/' + hk('c:' + email + ':' + fp), t = await bget(key)
    if (!t || Date.now() > t.exp) return res.status(400).json({ ok: false, error: 'Code expired. Request a new one.' })
    if (t.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many tries. Request a new code.' })
    if (!safeEq(h('code:' + email + ':' + code), t.code_hash)) { await bput(key, { ...t, attempts: t.attempts + 1 }); return res.status(400).json({ ok: false, error: "That code didn't match." }) }
    await bput(key, { ...t, exp: 0 })
    res.json({ ok: true, stoken: stokenFor(email, fp) })
  }))

  // ----- create: checks, then the opt-in text -----
  r.post('/create', wrap(async (req, res) => {
    const b = req.body || {}
    const email = String(b.email || '').trim().toLowerCase(), fp = String(b.fp || '')
    if (!okEmail(email) || !safeEq(String(b.stoken || ''), stokenFor(email, fp))) return res.status(401).json({ ok: false, error: 'Please verify your email first.' })
    const prank = PRANKS[b.prank] ? b.prank : null
    if (!prank) return res.status(400).json({ ok: false, error: 'Pick a joke first.' })
    const to = normPhone(b.phone)
    if (!to || !caMobile(to)) return res.status(400).json({ ok: false, error: "Enter your friend's 10-digit Canadian number." })
    if (OUR_NUMBERS.has(to)) return res.status(400).json({ ok: false, error: "That number can't get joke calls." })
    const th = hk('to:' + to)
    if (await bget('block/' + th)) return res.status(403).json({ ok: false, error: "That number is on our never-call list, so we can't send it a joke." })
    if (await bget('to/' + th)) return res.status(409).json({ ok: false, error: 'That number has already been offered a joke call. Each number only ever gets one.' })
    const d = day(), sk = 'sender/' + hk('s:' + email) + '/' + d, ik = 'ip/' + hk('ip:' + ip(req)) + '/' + d
    const [sc, ic] = await Promise.all([bget(sk), bget(ik)])
    if ((sc?.n || 0) >= SENDER_DAY || (ic?.n || 0) >= IP_DAY) return res.status(429).json({ ok: false, error: "That's 3 jokes for today. Come back tomorrow!" })
    const g = await gate()
    if (!g.ok) return res.status(503).json({ ok: false, error: g.why === 'off' ? 'Joke calls are paused right now. Try again later.' : 'Our joke line is all booked up today. Try again tomorrow!' })
    const id = crypto.randomBytes(10).toString('hex'), k = crypto.randomBytes(12).toString('hex')
    // Claim the number BEFORE texting, so two senders can't both reach it.
    await bput('to/' + th, { id, at: Date.now() })
    await Promise.all([bput(sk, { n: (sc?.n || 0) + 1 }), bput(ik, { n: (ic?.n || 0) + 1 })])
    const rec = { id, k_hash: h('k:' + k).slice(0, 40), to, to_h: th, prank, sender_h: hk('s:' + email), status: 'asked', created: Date.now(), turns: [] }
    try {
      const m = await tw('POST', '/Messages.json', { To: to, From: FROM(), Body: OPT_IN_SMS, StatusCallback: BASE + '/smsstatus?id=' + id })
      rec.sms_sid = m.sid
    } catch (e) {
      rec.status = 'sms_failed'; rec.sms_error = String(e.message).slice(0, 200); await bput('p/' + id, rec)
      console.error('[prank] sms failed', rec.sms_error)
      return res.status(502).json({ ok: false, id, k, sms_failed: true, error: "We couldn't text that number. Ask your friend to open the never-call page or try another time." })
    }
    await bput('p/' + id, rec)
    res.json({ ok: true, id, k, number: mask(to), spoken: speakNumber(to) })
  }))

  r.get('/state', wrap(async (req, res) => {
    const p = await owner(req.query)
    if (!p) return res.status(404).json({ ok: false })
    if (p.status === 'asked' && Date.now() - p.created > ASK_TTL_MS) p.status = 'expired'
    const t0 = p.answered_at || 0
    res.json({ ok: true, status: p.status, prank: p.prank, prank_name: PRANKS[p.prank].name, number: mask(p.to), revealed: !!p.revealed, ended: p.ended || null, dur: p.dur || null,
      turns: (p.turns || []).map((x) => ({ who: x.who, text: x.text, at: t0 ? Math.max(0, Math.round((x.at - t0) / 1000)) : null })),
      clip: p.rec_sid ? { start: p.hl_start || 0, len: 15 } : null })
  }))
  r.post('/reveal', wrap(async (req, res) => {
    const p = await owner(req.body || {})
    if (!p) return res.status(404).json({ ok: false })
    if (p.status !== 'in_call' || !p.call_sid || p.revealed) return res.json({ ok: false, error: 'The call is not live right now.' })
    await tw('POST', '/Calls/' + p.call_sid + '.json', { Url: BASE + '/voice?s=reveal&id=' + p.id + '&by=sender', Method: 'POST' })
    res.json({ ok: true })
  }))
  r.get('/clip', wrap(async (req, res) => {
    const p = await owner(req.query)
    if (!p?.rec_sid) return res.status(404).send('not found')
    const a = await fetch(API() + '/Recordings/' + p.rec_sid + '.mp3', { headers: { authorization: auth() } })
    if (!a.ok) return res.status(502).send('unavailable')
    const buf = Buffer.from(await a.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Cache-Control', 'private, max-age=3600')
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
    if (m) { const s = m[1] ? +m[1] : 0, e = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1; res.status(206).setHeader('Content-Range', `bytes ${s}-${e}/${buf.length}`); return res.end(buf.subarray(s, e + 1)) }
    res.end(buf)
  }))

  // ----- public never-call list -----
  r.post('/block', wrap(async (req, res) => {
    const to = normPhone(req.body?.phone)
    if (req.body?.company) return res.json({ ok: true })
    if (!to) return res.status(400).json({ ok: false, error: 'Enter a 10-digit phone number.' })
    const th = hk('to:' + to)
    await bput('block/' + th, { at: Date.now(), src: 'web' })
    const pending = await bget('to/' + th)
    if (pending?.id) { const p = await load(pending.id); if (p && p.status === 'asked') { p.status = 'declined'; p.ended = 'blocked'; await bput('p/' + p.id, p) } }
    res.json({ ok: true })
  }))

  // ----- Twilio webhooks -----
  r.post('/sms', wrap(async (req, res) => {
    if (!verifyTwilio(req)) return res.status(403).send('forbidden')
    const from = normPhone(req.body.From), body = String(req.body.Body || '').trim()
    if (!from) return xml(res, '')
    const th = hk('to:' + from)
    if (STOP_WORDS.test(body)) {
      await bput('block/' + th, { at: Date.now(), src: 'sms' })
      const t = await bget('to/' + th); const p = t?.id && (await load(t.id))
      if (p && p.status === 'asked') { p.status = 'declined'; p.ended = 'stop'; await bput('p/' + p.id, p) }
      return xml(res, '') // Twilio's built-in STOP handling sends the carrier-required confirmation
    }
    if (!YES_WORDS.test(body)) return xml(res, '')
    const t = await bget('to/' + th); const p = t?.id && (await load(t.id))
    if (!p || p.status !== 'asked' || Date.now() - p.created > ASK_TTL_MS || (await bget('block/' + th))) return xml(res, '')
    p.status = 'calling'; p.yes_at = Date.now(); p.yes_sid = req.body.MessageSid; await bput('p/' + p.id, p)
    let g = null; try { g = await gate() } catch (e) { g = { ok: false, why: 'gate_error' } }
    if (!g.ok) { p.status = 'failed'; p.ended = 'cap_' + g.why; await bput('p/' + p.id, p); return xml(res, `<Message>${esc('Sorry, our joke line is all booked up right now. Have a great day!')}</Message>`) }
    try {
      const c = await tw('POST', '/Calls.json', { To: from, From: FROM(), Url: BASE + '/voice?s=open&id=' + p.id, Method: 'POST', StatusCallback: BASE + '/status?id=' + p.id, StatusCallbackMethod: 'POST',
        TimeLimit: String(CALL_TIME_LIMIT_SEC), Timeout: '25', Record: 'true', RecordingStatusCallback: BASE + '/rec?id=' + p.id, RecordingStatusCallbackMethod: 'POST' })
      p.call_sid = c.sid; await bput('p/' + p.id, p)
    } catch (e) { p.status = 'failed'; p.ended = 'call_error'; p.call_error = String(e.message).slice(0, 200); await bput('p/' + p.id, p); return xml(res, '') }
    xml(res, `<Message>${esc(YES_REPLY)}</Message>`)
  }))
  r.post('/smsstatus', wrap(async (req, res) => {
    if (!verifyTwilio(req)) return res.status(403).send('forbidden')
    const p = await load(req.query.id)
    if (p && req.body.MessageSid === p.sms_sid) { p.sms_status = req.body.MessageStatus; if (req.body.ErrorCode) p.sms_error = req.body.ErrorCode; await bput('p/' + p.id, p) }
    res.type('text/plain').send('ok')
  }))

  r.post('/voice', wrap(async (req, res) => {
    if (!verifyTwilio(req)) return res.status(403).send('forbidden')
    const p = await load(req.query.id)
    const s = String(req.query.s || '')
    if (!p || !PRANKS[p.prank] || req.body.CallSid !== p.call_sid) return xml(res, '<Hangup/>')
    const P = PRANKS[p.prank], now = Date.now()
    const act = (n, used) => `${BASE}/voice?s=turn&amp;id=${p.id}&amp;n=${n}&amp;u=${used.join('.')}`
    const gather = (n, used) => `<Gather input="speech" timeout="4" speechTimeout="auto" language="en-US" actionOnEmptyResult="true" action="${act(n, used)}" method="POST"></Gather><Redirect method="POST">${act(n, used)}</Redirect>`
    const botSay = (text) => { p.turns.push({ who: 'bot', text, at: now }); return say(text) }
    const finish = async (body, ended) => { p.ended = p.ended || ended; await bput('p/' + p.id, p); return xml(res, body + '<Hangup/>') }
    if (s === 'reveal') { if (p.revealed) return xml(res, '<Hangup/>'); p.revealed = true; return finish(botSay(P.reveal + ' ' + LINES.revealTail), req.query.by === 'sender' ? 'revealed_by_sender' : 'revealed') }
    if (s === 'open') {
      if (p.status !== 'calling' || p.answered_at) return xml(res, '<Hangup/>')
      p.status = 'in_call'; p.answered_at = now
      const body = botSay(P.opener(speakNumber(p.to))) + gather(1, [])
      await bput('p/' + p.id, p); return xml(res, body)
    }
    if (s === 'turn') {
      if (p.revealed || p.ended) return xml(res, '<Hangup/>')
      const n = Math.max(1, Math.min(9, parseInt(req.query.n, 10) || 1)), used = String(req.query.u || '').split('.').filter(Boolean)
      const said = String(req.body.SpeechResult || '').slice(0, 300)
      if (said) { p.turns.push({ who: 'friend', text: said, at: now }); if (p.hl_start == null) p.hl_start = Math.max(0, Math.round((now - p.answered_at) / 1000) - 8) }
      const mv = nextMove({ said, used, n, elapsedSec: (now - p.answered_at) / 1000 })
      if (mv.kind === 'stop') return finish(botSay(LINES.stop), 'stop')
      if (mv.kind === 'reveal') { p.revealed = true; return finish((mv.ai ? botSay(LINES.ai) : '') + botSay(P.reveal + ' ' + LINES.revealTail), mv.ai ? 'revealed_after_ai_question' : 'revealed') }
      const body = botSay(P[mv.line]) + gather(n + 1, [...used, mv.line])
      await bput('p/' + p.id, p); return xml(res, body)
    }
    xml(res, '<Hangup/>')
  }))
  r.post('/status', wrap(async (req, res) => {
    if (!verifyTwilio(req)) return res.status(403).send('forbidden')
    const p = await load(req.query.id)
    if (p && req.body.CallSid === p.call_sid) {
      const st = req.body.CallStatus
      if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(st)) {
        p.dur = +req.body.CallDuration || 0; p.call_status = st
        p.status = st === 'completed' && p.answered_at ? 'done' : 'missed'; p.ended = p.ended || (p.status === 'missed' ? st : 'hung_up')
        p.cost_est_usd = prankCallUsd(p.dur, p.turns.filter((t) => t.who === 'bot').length - (p.revealed ? 1 : 0))
        await bput('p/' + p.id, p)
        if (recordCost) await recordCost(p.call_sid, p.dur, p.cost_est_usd).catch(() => {})
      }
    }
    res.type('text/plain').send('ok')
  }))
  r.post('/rec', wrap(async (req, res) => {
    if (!verifyTwilio(req)) return res.status(403).send('forbidden')
    const p = await load(req.query.id)
    if (p && req.body.CallSid === p.call_sid && req.body.RecordingStatus === 'completed') { p.rec_sid = req.body.RecordingSid; p.rec_dur = +req.body.RecordingDuration || 0; await bput('p/' + p.id, p) }
    res.type('text/plain').send('ok')
  }))

  r.post('/admin', wrap(async (req, res) => {
    if (!env('FSC_ADMIN_KEY') || !safeEq(req.headers['x-fsc-admin'], env('FSC_ADMIN_KEY'))) return res.status(403).json({ error: 'forbidden' })
    const a = req.query.a
    if (a === 'reset_test') { // only ever Randy's test number
      const to = env('FSC_TEST_TO') || '+16479316278'
      await bdel('to/' + hk('to:' + to)); await bdel('block/' + hk('to:' + to)); return res.json({ ok: true })
    }
    if (a === 'get') { const p = await load(req.query.id); return res.json(p ? { ...p, to: mask(p.to), k_hash: undefined } : null) }
    if (a === 'spend') return res.json({ usd: await spend24h(), worst_per_prank: PRANK_WORST_USD })
    res.json({ ok: true })
  }))
  r.get('/', (_q, res) => res.json({ ok: true, service: 'prank', pranks: Object.fromEntries(Object.entries(PRANKS).map(([k, v]) => [k, v.name])) }))
  return r
}
