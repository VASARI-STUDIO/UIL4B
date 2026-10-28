// CHANGING A LIVE STRIPE PRICE NEEDS A FRESH SIGN-IN AND LEAVES A RECORD
// (security audit M7).
//
// An admin ID token lives an hour. Checkout resolves prices by lookup key, so
// whoever holds one could post new prices and the next customer would be
// charged them. The POST now needs `auth_time` within five minutes, writes an
// audit row before changing anything, and refuses a change beyond 10x unless the
// request says `force`. The real route runs against an in-memory Admin SDK and
// a recording Stripe fake (helpers/api-stub-loader.mjs); nothing here touches
// Firebase or Stripe.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { read, stripComments } from './helpers/source-text.js'

register('./helpers/api-stub-loader.mjs', import.meta.url)

const { fakeRes, fakeAuth, fakeDb, install, revokedError } = await import('./helpers/api-fakes.js')
const { default: setupStripe, AUDIT_COLLECTION, MAX_PRICE_CHANGE_FACTOR, describePriceChanges, oversizedChange } = await import('../../api/setup-stripe.js')
const { BILLING_INTERVALS, DEFAULT_PRICES, LOOKUP_KEYS, BASE_CURRENCY, toCents } = await import('../../api/_lib/pricing.js')

const ADMIN = 'owner@uil4b-test.example'
const nowSec = () => Math.floor(Date.now() / 1000)
const adminToken = (authAgeSec) => ({ uid: 'boss', email: ADMIN, email_verified: true, auth_time: nowSec() - authAgeSec })

/** A Stripe fake holding the live prices (the defaults, unless `live` says otherwise) and recording every write. */
function fakeStripe(live = DEFAULT_PRICES) {
  const writes = []
  const priceFor = (interval) => {
    const amounts = live[interval]
    const options = {}
    for (const [cur, amt] of Object.entries(amounts)) if (cur !== BASE_CURRENCY) options[cur] = { unit_amount: toCents(amt) }
    return { id: `price_old_${interval}`, currency: BASE_CURRENCY, unit_amount: toCents(amounts[BASE_CURRENCY]), currency_options: options }
  }
  return {
    writes,
    products: {
      list: async () => ({ data: [{ id: 'prod_1', name: 'UIL4B Pro', description: 'x' }] }),
      update: async (id) => { writes.push(['products.update', id]); return { id } },
      create: async () => { writes.push(['products.create']); return { id: 'prod_new' } },
    },
    prices: {
      list: async ({ lookup_keys: [lk] }) => {
        const interval = BILLING_INTERVALS.find((iv) => LOOKUP_KEYS[iv] === lk)
        return { data: [priceFor(interval)] }
      },
      create: async (params) => { writes.push(['prices.create', params.lookup_key, params.unit_amount]); return { id: `price_new_${params.lookup_key}` } },
      update: async (id) => { writes.push(['prices.update', id]); return { id } },
    },
  }
}

/** The prices a save posts: the live ones with `change` applied to the monthly USD amount. */
const pricesWith = (monthlyUsd) => ({ ...DEFAULT_PRICES, monthly: { ...DEFAULT_PRICES.monthly, usd: monthlyUsd } })

function run({ token, body, stripe = fakeStripe(), db = fakeDb(), method = 'POST', auth } = {}) {
  process.env.ADMIN_EMAILS = ADMIN
  const a = auth || fakeAuth({ tokens: { t: token } })
  install({ auth: a, db, stripe })
  const res = fakeRes()
  const req = { method, headers: { authorization: 'Bearer t', 'x-forwarded-for': '203.0.113.9' }, body }
  return setupStripe(req, res).then(() => ({ res, stripe, db, auth: a }))
}

const auditRows = (db) => db.inCollection(AUDIT_COLLECTION)

test('a token whose sign-in is older than five minutes cannot change prices, and nothing is written anywhere', async () => {
  const { res, stripe, db } = await run({ token: adminToken(6 * 60), body: { prices: pricesWith(8) } })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'reauth-required')
  assert.match(res.body.error, /sign in again/i)
  assert.deepEqual(stripe.writes, [], 'a stale session reached Stripe')
  assert.deepEqual(auditRows(db), [], 'a refused change left an audit row')
})

test('a token with no auth_time is treated as stale', async () => {
  const { res, stripe } = await run({ token: { uid: 'boss', email: ADMIN, email_verified: true }, body: { prices: pricesWith(8) } })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'reauth-required')
  assert.deepEqual(stripe.writes, [])
})

test('reading the prices (GET) does not need a fresh sign-in', async () => {
  const { res } = await run({ token: adminToken(30 * 60), method: 'GET' })
  assert.equal(res.statusCode, 200)
  assert.ok(res.body.prices.monthly, 'the live prices must be returned')
})

test('a fresh sign-in saves the prices and writes one audit row with who, when and old and new amounts per lookup key', async () => {
  const before = Date.now()
  const { res, stripe, db } = await run({ token: adminToken(60), body: { prices: pricesWith(8) } })
  assert.equal(res.statusCode, 200)
  assert.ok(stripe.writes.some(([op, lk, cents]) => op === 'prices.create' && lk === LOOKUP_KEYS.monthly && cents === 800))

  const rows = auditRows(db)
  assert.equal(rows.length, 1)
  const [row] = rows
  assert.equal(row.action, 'stripe-prices-update')
  assert.equal(row.status, 'applied')
  assert.equal(row.actorUid, 'boss')
  assert.equal(row.actorEmail, ADMIN)
  assert.equal(row.ip, '203.0.113.9')
  assert.equal(row.forced, false)
  assert.ok(Date.parse(row.at) >= before - 1000 && Date.parse(row.at) <= Date.now() + 1000, 'at must be the time of the request')
  assert.ok(Date.parse(row.authTime) <= Date.parse(row.at), 'authTime is when the admin last signed in')
  assert.deepEqual(row.prices[LOOKUP_KEYS.monthly].usd, { old: DEFAULT_PRICES.monthly.usd, new: 8 })
  assert.deepEqual(row.prices[LOOKUP_KEYS.yearly].usd, { old: DEFAULT_PRICES.yearly.usd, new: DEFAULT_PRICES.yearly.usd })
  assert.ok(Object.keys(row.prices).length === BILLING_INTERVALS.length, 'every lookup key is recorded')
})

test('if the audit row cannot be written, no price is changed', async () => {
  const db = fakeDb()
  const real = db.collection
  db.collection = (col) => ({ ...real(col), doc: () => ({ set: async () => { throw new Error('Firestore is down') } }) })
  const { res, stripe } = await run({ token: adminToken(60), body: { prices: pricesWith(8) }, db })
  assert.equal(res.statusCode, 500)
  assert.match(res.body.error, /no prices were changed/i)
  assert.deepEqual(stripe.writes, [], 'prices changed with no record of it')
})

test('a Stripe failure marks the audit row failed', async () => {
  const stripe = fakeStripe()
  stripe.prices.create = async () => { throw new Error('Stripe is down') }
  const { res, db } = await run({ token: adminToken(60), body: { prices: pricesWith(8) }, stripe })
  assert.equal(res.statusCode, 500)
  assert.equal(auditRows(db)[0].status, 'failed')
})

test('a change of more than 10x is refused unless force is sent', async () => {
  const refused = await run({ token: adminToken(60), body: { prices: pricesWith(DEFAULT_PRICES.monthly.usd * MAX_PRICE_CHANGE_FACTOR + 1) } })
  assert.equal(refused.res.statusCode, 400)
  assert.equal(refused.res.body.code, 'price-change-too-large')
  assert.deepEqual(refused.stripe.writes, [])
  assert.deepEqual(auditRows(refused.db), [])

  const tooLow = await run({ token: adminToken(60), body: { prices: pricesWith(0.5) } })
  assert.equal(tooLow.res.body.code, 'price-change-too-large', 'a drop of more than 10x is just as suspect')

  const forced = await run({ token: adminToken(60), body: { prices: pricesWith(500), force: true } })
  assert.equal(forced.res.statusCode, 200)
  assert.equal(auditRows(forced.db)[0].forced, true)
})

test('exactly 10x is allowed', () => {
  const changes = describePriceChanges({ monthly: { currencies: { usd: 7 } }, yearly: { currencies: { usd: 48 } } }, pricesWith(70))
  assert.equal(oversizedChange(changes), null)
})

test('a currency with no live price yet is not capped', () => {
  const changes = describePriceChanges({ monthly: null, yearly: null }, pricesWith(7000))
  assert.equal(oversizedChange(changes), null)
})

test('a revoked admin session is a 401 with a code the admin page can act on', async () => {
  const auth = fakeAuth({ tokens: { t: revokedError() } })
  const { res, stripe } = await run({ body: { prices: pricesWith(8) }, auth })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'session-revoked')
  assert.deepEqual(stripe.writes, [])
  assert.equal(auth.calls.verify[0].checkRevoked, true)
})

test('the audit collection has no client rule: only the Admin SDK can reach it', () => {
  // No `match` for it, and no catch-all, so Firestore denies every client.
  const rules = stripComments(read('firestore.rules'))
  assert.ok(!rules.includes(AUDIT_COLLECTION), `firestore.rules mentions ${AUDIT_COLLECTION}`)
  assert.ok(!/match \/\{[^}]*=\*\*\}/.test(rules), 'a catch-all match would open the audit collection')
})

test('the admin page turns the route codes into "Sign in again to change prices"', () => {
  const src = read('src/pages/Admin.jsx')
  assert.match(src, /reauth-required/)
  assert.match(src, /Sign in again to change prices/)
})
