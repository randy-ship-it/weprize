import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const dir = mkdtempSync(join(tmpdir(), 'weprize-fulfill-'))
process.env.WEPRIZE_JSON_PATH = join(dir, 'weprize.json')
process.env.ALLOW_UNSIGNED_WEBHOOK = '1'
process.env.VERCEL = '1'
delete process.env.DATABASE_URL
delete process.env.STRIPE_SECRET_KEY
delete process.env.STRIPE_WEBHOOK_SECRET
delete process.env.RESEND_API_KEY
delete process.env.RESEND_FROM

const { isEligibleCurrentContest } = await import('../server/contest-eligibility.js')
const { fulfillmentMessage, isStoreOutage, jobWasSubmitted } = await import('../server/fulfillment.js')
const { loadAutoOkSlice } = await import('../server/contests.js')
const { getStore } = await import('../server/db.js')
const { default: app } = await import('../server/index.js')

const NOW = new Date('2026-11-07T18:00:00.000Z')

function contest(overrides) {
  return {
    id: 'c',
    auto_class: 'AUTO_OK',
    health: 'live',
    region: 'ca',
    close_at_et: '2026-12-01T00:00:00.000Z',
    ...overrides,
  }
}

test('eligible contests are open Canada AUTO_OK rows only', () => {
  assert.equal(isEligibleCurrentContest(contest(), NOW), true)
  assert.equal(isEligibleCurrentContest(contest({ close_at_et: '2026-09-16T00:00:00-04:00' }), NOW), false)
  assert.equal(isEligibleCurrentContest(contest({ close_at_et: '' }), NOW), false)
  assert.equal(isEligibleCurrentContest(contest({ health: 'dead' }), NOW), false)
  assert.equal(isEligibleCurrentContest(contest({ region: 'us' }), NOW), false)
  assert.equal(isEligibleCurrentContest(contest({ auto_class: 'NEEDS_YOU' }), NOW), false)
  assert.equal(isEligibleCurrentContest(contest({ health: 'unknown' }), NOW), true)
})

test('the live book slice has no closed contests', () => {
  const slice = loadAutoOkSlice(new Date())
  assert.ok(slice.length > 0, 'expected at least one open contest on  the current book')
  for (const row of slice) {
    assert.ok(row.close_at_et, row.contest_id)
    assert.ok(new Date(row.close_at_et).getTime() > Date.now(), row.contest_title)
    assert.equal(/jann arden/i.test(row.contest_title), false)
  }
  assert.ok(slice.length <= 25)
})

test('queue creation and the stub are not receipts', () => {
  assert.equal(jobWasSubmitted({ status: 'queued', confirm_ref: null, screenshot_path: null }), false)
  assert.equal(jobWasSubmitted({ status: 'applied', confirm_ref: 'dry_run' }), false)
  assert.equal(jobWasSubmitted({ status: 'needs_you', needs_you_reason: 'worker_stub_pending_browser_apply' }), false)
  assert.equal(jobWasSubmitted({ status: 'confirmed', confirm_ref: null }), false)
  assert.equal(jobWasSubmitted({ status: 'applied', confirm_ref: 'brand-ref-1' }), true)
  assert.equal(jobWasSubmitted({ status: 'applied', screenshot_path: '/tmp/shot.png' }), true)
  const msg = fulfillmentMessage({ year_round: true }, [{ status: 'queued' }])
  assert.match(msg.message, /Nothing has been submitted/)
  assert.match(msg.message, /Year-round repeat entry is not running/)
  assert.equal(msg.submitted_count, 0)
})

test('neon endpoint disabled is a store outage, not a bad webhook', () => {
  const err = new Error('The endpoint has been disabled. Enable it using the API and retry.')
  err.code = '28000'
  assert.equal(isStoreOutage(err), true)
  assert.equal(isStoreOutage(new Error('invalid_pack')), false)
})

function listen(handler) {
  const server = createServer(handler)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

async function jsonRequest(port, method, path, body) {
  const payload = body == null ? null : JSON.stringify(body)
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: payload ? { 'content-type': 'application/json' } : {},
    body: payload,
  })
  const text = await res.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { raw: text }
  }
  return { status: res.status, body: parsed }
}

test('paid webhook queues only open contests and does not claim submission', async () => {
  const server = await listen(app)
  const port = server.address().port
  try {
    const paid = await jsonRequest(port, 'POST', '/api/stripe/webhook', {
      id: 'evt_test_once',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_once_fulfillment',
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          mode: 'payment',
          amount_total: 900,
          currency: 'cad',
          customer_details: { email: 'buyer@example.com' },
          metadata: { pack: 'once' },
        },
      },
    })
    assert.equal(paid.status, 200, JSON.stringify(paid.body))

    const year = await jsonRequest(port, 'POST', '/api/stripe/webhook', {
      id: 'evt_test_year',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_year_fulfillment',
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          mode: 'subscription',
          amount_total: 1999,
          currency: 'cad',
          customer_details: { email: 'year@example.com' },
          metadata: { pack: 'year_round' },
        },
      },
    })
    assert.equal(year.status, 200, JSON.stringify(year.body))

    const created = await jsonRequest(port, 'GET', '/api/orders/by-session/cs_test_once_fulfillment')
    assert.equal(created.status, 200)
    const token = created.body.order.token
    assert.equal(created.body.order.submitted_count, 0)
    assert.match(created.body.order.message, /No current eligible contest was queued|Nothing has been submitted/)

    const ident = await jsonRequest(port, 'POST', `/api/orders/${token}/identity`, {
      legal_name: 'Test Buyer',
      email: 'buyer@example.com',
      address1: '1 Queen St',
      city: 'Toronto',
      province: 'ON',
      postal: 'M5V 2T6',
      country: 'CA',
    })
    assert.equal(ident.status, 201, JSON.stringify(ident.body))
    assert.ok(ident.body.seeded_jobs > 0)
    assert.equal(ident.body.order.submitted_count, 0)
    assert.match(ident.body.order.message, /Nothing has been submitted/)
    assert.equal(/we apply/i.test(ident.body.order.message), false)

    const jobsBefore = await jsonRequest(port, 'GET', `/api/orders/${token}/jobs`)
    assert.equal(jobsBefore.status, 200)
    assert.ok(jobsBefore.body.jobs.length > 0)
    for (const job of jobsBefore.body.jobs) {
      assert.equal(job.status, 'queued')
      assert.equal(job.submitted, false)
      assert.equal(job.confirm_ref, null)
    }

    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/fulfill-worker.mjs'], {
        cwd: join(import.meta.dirname, '..'),
        env: {
          ...process.env,
          WEPRIZE_JSON_PATH: process.env.WEPRIZE_JSON_PATH,
          LIMIT: '50',
          DRY_RUN: '1',
          DATABASE_URL: '',
          RESEND_API_KEY: '',
          RESEND_FROM: '',
        },
      })
      let err = ''
      child.stderr.on('data', (chunk) => {
        err += chunk
      })
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(err || `worker ${code}`))))
    })

    const jobsAfter = await jsonRequest(port, 'GET', `/api/orders/${token}/jobs`)
    assert.equal(jobsAfter.body.jobs.length, jobsBefore.body.jobs.length)
    for (const job of jobsAfter.body.jobs) {
      assert.equal(job.status, 'failed')
      assert.equal(job.needs_you_reason, 'browser_apply_not_running')
      assert.equal(job.submitted, false)
      assert.equal(job.customer_step, false)
      assert.match(job.what_to_do, /has not been submitted/)
      assert.equal(/receipt link/i.test(job.what_to_do), false)
    }
    const orderAfter = await jsonRequest(port, 'GET', `/api/orders/${token}`)
    assert.equal(orderAfter.body.order.submitted_count, 0)
    assert.match(orderAfter.body.order.message, /Nothing has been submitted/)

    const blocked = await jsonRequest(port, 'POST', `/api/orders/${token}/jobs/${jobsAfter.body.jobs[0].id}/ack`, {})
    assert.equal(blocked.status, 409)
    assert.equal(blocked.body.error, 'not_submitted')

    const store = await getStore()
    const otp = await store.updateJob(jobsAfter.body.jobs[1].id, {
      status: 'needs_you',
      needs_you_reason: 'otp',
    })
    const acked = await jsonRequest(port, 'POST', `/api/orders/${token}/jobs/${otp.id}/ack`, {})
    assert.equal(acked.status, 200)
    assert.equal(acked.body.job.status, 'confirmed')
    assert.equal(acked.body.job.submitted, false)

    const yearOrder = await jsonRequest(port, 'GET', '/api/orders/by-session/cs_test_year_fulfillment')
    assert.equal(yearOrder.body.order.year_round, true)
    assert.match(yearOrder.body.order.message, /Year-round repeat entry is not running/)
    assert.equal(yearOrder.body.order.submitted_count, 0)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
