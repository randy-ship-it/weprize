import assert from 'node:assert/strict'
import test from 'node:test'
import { contactKey, decideSrCall, markSmartFromCheckout, sha256hex, SR_PLANS } from '../server/spamroast.js'

function customer(overrides = {}) {
  return {
    key: 'cust-key',
    plan: 'free',
    status: 'active',
    usage: {},
    daily: {},
    contacts: [],
    events: [],
    ...overrides,
  }
}

test('free caller under the cap is screened and attributed to the forwarding number plan', () => {
  const d = decideSrCall(customer(), '+14165550100', new Date('2026-11-07T16:00:00Z'))
  assert.equal(d.action, 'screen')
  assert.equal(d.reason, 'sr_free')
  assert.equal(d.pro, false)
  assert.equal(d.maxSecs, SR_PLANS.free.maxSecs)
})

test('monthly cap stops the roast without dropping the customer', () => {
  const now = new Date('2026-11-07T16:00:00Z')
  const d = decideSrCall(customer({ plan: 'smart', usage: { '2026-11': 25 } }), '+14165550100', now)
  assert.equal(d.action, 'say')
  assert.equal(d.reason, 'sr_cap')
})

test('a hashed contact on Smart gets the message-taker, an unknown caller does not', () => {
  const from = '+14165550199'
  const key = 'cust-key'
  const listed = contactKey(key, sha256hex(from))
  const known = decideSrCall(customer({ plan: 'smart', contacts: [listed] }), from, new Date('2026-11-07T16:00:00Z'))
  const unknown = decideSrCall(customer({ plan: 'smart', contacts: [listed] }), '+14165550100', new Date('2026-11-07T16:00:00Z'))
  assert.equal(known.pro, true)
  assert.equal(known.reason, 'sr_smart_contact')
  assert.equal(unknown.pro, false)
  assert.equal(unknown.reason, 'sr_smart')
})

test('an inactive forwarding number is not screened', () => {
  const d = decideSrCall(customer({ status: 'canceled' }), '+14165550100', new Date('2026-11-07T16:00:00Z'))
  assert.equal(d.reason, 'sr_inactive')
  assert.equal(d.action, 'say')
})

test('checkout completion marks Smart active once and ignores a replay', () => {
  const c = customer({ plan: 'free', status: 'new' })
  const session = { customer: 'cus_test', subscription: 'sub_test', livemode: false, amount_total: 999, mode: 'subscription' }
  const first = markSmartFromCheckout(c, session, 'evt_1')
  assert.equal(first.duplicate, false)
  assert.equal(c.plan, 'smart')
  assert.equal(c.status, 'active')
  assert.equal(c.stripe_sub, 'sub_test')
  const second = markSmartFromCheckout(c, session, 'evt_1')
  assert.equal(second.duplicate, true)
  assert.equal(c.events.filter((id) => id === 'evt_1').length, 1)
})
