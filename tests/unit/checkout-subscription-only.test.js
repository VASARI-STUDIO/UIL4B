// Pro is sold as a subscription only.
//
// A checkout request for a one-off ("lifetime") purchase is refused with a 400
// and a message that says so, before any token, Firestore or Stripe call — it
// is never a 500 and never a payment session. An entitlement already stored on
// an account is a separate matter: it is still read, so its holder stays Pro.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import {
  BILLING_INTERVALS, DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS, TRIAL_DAYS, priceIsSellable,
} from '../../api/_lib/pricing.js'
import { LIFETIME_SKU, parseBillingInterval } from '../../api/_lib/billing.js'
import { planForUser } from '../../api/_lib/plans.js'
import handler, { intervalRefusal, resolvePrice } from '../../api/create-checkout.js'

function fakeRes() {
  const res = {
    statusCode: null,
    body: undefined,
    headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
    end() { return res },
  }
  return res
}

const checkoutRequest = (body, headers = {}) => ({ method: 'POST', headers, body })

test('a lifetime checkout is refused with a 400 and a clear message', async () => {
  for (const headers of [{}, { authorization: 'Bearer not-a-real-token' }]) {
    const res = fakeRes()
    await handler(checkoutRequest({ interval: 'lifetime', currency: 'usd' }, headers), res)
    assert.equal(res.statusCode, 400, `expected 400 for a lifetime checkout, got ${res.statusCode}`)
    assert.match(res.body?.error || '', /no one-off purchase/i)
    assert.match(res.body?.error || '', /No payment session was created/)
  }
})

test('the refusal is specific to intervals that cannot be bought', () => {
  assert.equal(intervalRefusal('monthly'), null)
  assert.equal(intervalRefusal('quarterly'), null)
  assert.equal(intervalRefusal('yearly'), null)
  assert.match(intervalRefusal('lifetime').error, /no one-off purchase/i)
  assert.match(intervalRefusal('weekly').error, /interval must be one of: monthly, quarterly, yearly/)
  assert.equal(parseBillingInterval('lifetime'), null)
})

test('no lifetime price is resolved, and Stripe is not asked for one', async () => {
  const calls = []
  const stripe = {
    prices: {
      async retrieve(id) { calls.push(['retrieve', id]); return { id, active: true, recurring: null } },
      async list(params) { calls.push(['list', params]); return { data: [{ id: 'price_once', active: true, recurring: null }] } },
    },
  }
  const env = { STRIPE_PRICE_LIFETIME: 'price_once' }
  assert.equal(await resolvePrice(stripe, 'lifetime', { env, cache: new Map(), now: 1 }), null)
  assert.deepEqual(calls, [])
})

test('a one-off price is not sellable for any interval', () => {
  const oneOff = { id: 'p', active: true, recurring: null }
  for (const interval of [...BILLING_INTERVALS, 'lifetime']) {
    assert.equal(priceIsSellable(oneOff, interval), false, `a one-off price was sellable as ${interval}`)
  }
})

test('no pricing table carries a lifetime entry', () => {
  assert.deepEqual([...BILLING_INTERVALS], ['monthly', 'quarterly', 'yearly'])
  for (const [name, table] of Object.entries({ DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS, TRIAL_DAYS })) {
    assert.equal(Object.hasOwn(table, 'lifetime'), false, `${name} still has a lifetime entry`)
  }
  const checkout = stripComments(read('api/create-checkout.js'))
  assert.ok(checkout.includes('subscription_data'), 'the comment stripper ate the code')
  assert.doesNotMatch(checkout, /mode: 'payment'|payment_intent_data|entitlementSku/,
    'create-checkout can still open a one-off payment session')
})

test('the client offers no lifetime checkout', () => {
  const context = stripComments(read('src/contexts/SubscriptionContext.jsx'))
  const set = context.match(/const BILLING_INTERVALS = new Set\(\[([^\]]*)\]\)/)
  assert.ok(set, 'the client interval list was not found')
  assert.doesNotMatch(set[1], /lifetime/)

  const page = stripComments(read('src/pages/Checkout.jsx'))
  const plans = page.slice(page.indexOf('const PLANS = {'), page.indexOf('\n}\n', page.indexOf('const PLANS = {')))
  assert.ok(plans.includes('yearly:'), 'the checkout plan table was not found')
  assert.doesNotMatch(plans, /lifetime/)
})

test('an existing lifetime entitlement still reads as Pro', () => {
  const stored = {
    active: true, sku: LIFETIME_SKU, checkoutSessionId: 'cs_test_1', revokedAt: null, revokedReason: null,
  }
  assert.equal(LIFETIME_SKU, 'uil4b_pro_lifetime', 'the SKU on stored entitlements changed')
  assert.equal(planForUser({ subscription: null, lifetimeEntitlement: stored, email: null }).id, 'pro')
  assert.equal(planForUser({
    subscription: { status: 'canceled' }, lifetimeEntitlement: stored, email: null,
  }).id, 'pro', 'an ended subscription must not hide a lifetime entitlement')
  assert.equal(planForUser({
    lifetimeEntitlement: { ...stored, active: false, revokedAt: 1, revokedReason: 'full_refund' },
  }).id, 'free', 'a revoked entitlement must not read as Pro')

  // The client mirror reads the same field.
  const context = stripComments(read('src/contexts/SubscriptionContext.jsx'))
  assert.match(context, /lifetimeEntitlement\?\.active === true && !lifetimeEntitlement\.revokedAt\) return PRO_PLAN/)
  assert.match(context, /setLifetimeEntitlement\(data\?\.lifetimeEntitlement \|\| null\)/)
})
