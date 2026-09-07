// TWO BILLING DEFECTS THAT HAD NO SYMPTOM: a swallowed Stripe failure, and a
// customer created twice.
//
// ─────────────────────────────────────────────────────────────────────────────
// A · /api/get-prices SERVED FALLBACK PRICES IN SILENCE
// ─────────────────────────────────────────────────────────────────────────────
// `fetchPrices()` ended in `catch { return responseFromLive() }` — no log line,
// no correlation id, nothing. A revoked STRIPE_SECRET_KEY or a Stripe outage
// therefore served the DEFAULT_PRICES table to every visitor, with
// `source: fallback` in the JSON and NOTHING server-side that anyone would ever
// read. The handler's outer catch does log, but it is unreachable: fetchPrices
// never throws.
//
// Empty catch bodies have bitten this repo twice this week — the feedback queue
// rendered a permission refusal as "No submissions yet". The founder's standing
// rule applies, and this is the version of it that costs money: the prices a
// visitor is quoted stop being the prices in Stripe, and no one finds out.
//
// ─────────────────────────────────────────────────────────────────────────────
// B · TWO FIRST CHECKOUTS CREATED TWO STRIPE CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
// api/create-checkout.js read `stripeCustomerId`, created a customer when it was
// absent, then merged the id back. A double click or two tabs meant both
// requests read null, both created, and the second write won — orphaning a
// Stripe customer whose `metadata.firebaseUid` points at the same account.
// `uidForCustomer` in the webhook guards the opposite direction (two accounts
// claiming one customer) and does nothing about this one.
//
// The fix is two guards, and the tests below are one per guard: a uid-derived
// IDEMPOTENCY KEY, so Stripe collapses the concurrent creates to one customer;
// and a TRANSACTION that re-reads before claiming, so the document can only ever
// name one.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import { customerIdempotencyKey, ensureStripeCustomer } from '../../api/_lib/billing.js'

const captureConsole = async (fn) => {
  const error = console.error
  const warn = console.warn
  const lines = []
  console.error = (...a) => lines.push(['error', ...a])
  console.warn = (...a) => lines.push(['warn', ...a])
  try { return { result: await fn(), lines } } finally { console.error = error; console.warn = warn }
}

function fakeRes() {
  const out = { statusCode: null, body: null, headers: {} }
  return Object.assign(out, {
    setHeader(k, v) { out.headers[k] = v },
    status(code) { out.statusCode = code; return this },
    json(body) { out.body = body; return this },
    end() { return this },
  })
}

test('the comment stripper works, so every source assertion below means something', () => {
  assertStripperWorks(assert)
})

// ─────────────────────────────────────────────────────────────────────────────
// A · The swallowed failure, exercised through the real handler
// ─────────────────────────────────────────────────────────────────────────────
//
// `getStripeServer()` throws when STRIPE_SECRET_KEY is unset, and it is called
// INSIDE the try — so unsetting the key drives the exact catch that was empty.
// No network, no stub: the failure is real and the path is the shipped one.
test('a Stripe failure in /api/get-prices is LOGGED before the fallback is served', async () => {
  const previous = process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_SECRET_KEY
  try {
    const { default: handler } = await import('../../api/get-prices.js')
    const res = fakeRes()
    const { lines } = await captureConsole(() => handler({ method: 'GET', headers: {} }, res))

    // The response is unchanged — visitors still see a price, which is why this
    // was invisible in the first place.
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.source.monthly, 'fallback')
    assert.equal(res.body.availability.monthly, false)

    const logged = lines.filter((l) => l[0] === 'error')
    assert.equal(logged.length > 0, true,
      'a Stripe failure served the fallback price table to every visitor with no server-side trace')
    assert.match(String(logged[0][1]), /get-prices/,
      'the log line does not name the endpoint, so nobody reading the logs could act on it')
    assert.match(String(logged[0][2]?.error || ''), /STRIPE_SECRET_KEY/,
      'the log line does not carry the error message — a log that says only "it failed" is not a log')
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = previous
  }
})

test('api/get-prices.js has no silent catch left on the money path', () => {
  const src = stripComments(read('api/get-prices.js'))
  // The exact shape that shipped.
  assert.ok(!/catch\s*\{\s*return responseFromLive\(\)\s*\}/.test(src),
    'the empty catch around the fallback is back in api/get-prices.js')
  // No bare `catch {` anywhere in the file — the price-id fallthrough had one too,
  // which made a deleted STRIPE_PRICE_* id indistinguishable from an unset one.
  assert.ok(!/catch\s*\{/.test(src),
    'api/get-prices.js has a bare `catch {` again — every failure on this path has to say so')

  // Positive control: the pattern above can match the code it is banning.
  assert.ok(/catch\s*\{/.test('try { x() } catch { return y() }'),
    'the bare-catch pattern cannot match a bare catch — the assertion above is vacuous')
})

// ─────────────────────────────────────────────────────────────────────────────
// B · One customer per account, under concurrency
// ─────────────────────────────────────────────────────────────────────────────
function fakeCustomerStore() {
  // A Stripe double that honours idempotency keys the way Stripe does: a repeat
  // under the same key replays the FIRST response instead of creating again.
  const byKey = new Map()
  const created = []
  let n = 0
  return {
    created,
    stripe: {
      customers: {
        create: async (params, options) => {
          created.push({ params, options })
          const key = options?.idempotencyKey
          if (key && byKey.has(key)) return byKey.get(key)
          const customer = { id: `cus_${++n}`, ...params }
          if (key) byKey.set(key, customer)
          return customer
        },
      },
    },
  }
}

function fakeUserDb(initial = {}) {
  const doc = { ...initial }
  const state = { doc, transactions: 0, beforeTransaction: null }
  const ref = {
    get: async () => ({ data: () => ({ ...doc }) }),
  }
  return {
    state,
    collection: () => ({ doc: () => ref }),
    runTransaction: async (fn) => {
      state.transactions += 1
      if (state.beforeTransaction) { state.beforeTransaction(); state.beforeTransaction = null }
      return fn({
        get: async () => ({ data: () => ({ ...doc }) }),
        // Firestore's signature is set(ref, data, options) — writing the fake
        // with set(data) is how a "passing" concurrency test proves nothing.
        set: (_ref, data, options) => {
          assert.deepEqual(options, { merge: true }, 'the customer claim must stay a merge')
          Object.assign(doc, data)
        },
      })
    },
  }
}

test('the idempotency key is derived from the uid, and only from the uid', () => {
  assert.equal(customerIdempotencyKey('uid_1'), customerIdempotencyKey('uid_1'),
    'the key is not stable across calls, so Stripe cannot collapse two concurrent creates')
  assert.notEqual(customerIdempotencyKey('uid_1'), customerIdempotencyKey('uid_2'),
    'two accounts share an idempotency key — the second would be handed the first one’s customer')
  assert.match(customerIdempotencyKey('uid_1'), /uid_1/)
})

test('two first checkouts in flight end with ONE Stripe customer', async () => {
  // The defect, reproduced: both requests read a document with no
  // stripeCustomerId and both reach the create.
  const store = fakeCustomerStore()
  const db = fakeUserDb({})
  const [a, b] = await Promise.all([
    ensureStripeCustomer(store.stripe, db, 'uid_1'),
    ensureStripeCustomer(store.stripe, db, 'uid_1'),
  ])

  assert.equal(a, b, 'the two requests are using different Stripe customers')
  assert.equal(db.state.doc.stripeCustomerId, a)
  assert.equal(store.created.length, 2, 'the race was not actually reproduced — both requests must reach the create')
  const ids = new Set(store.created.map((c) => c.options?.idempotencyKey))
  assert.equal(ids.size, 1, 'the two creates went out under different idempotency keys, so Stripe made two customers')
  assert.ok([...ids][0], 'the create carries no idempotency key at all — this is the original defect')
})

test('every create carries the uid in metadata, which is what the webhook resolves on', async () => {
  const store = fakeCustomerStore()
  const db = fakeUserDb({})
  await ensureStripeCustomer(store.stripe, db, 'uid_1')
  assert.deepEqual(store.created[0].params, { metadata: { firebaseUid: 'uid_1' } })
})

test('a document that gained an id mid-flight wins — the claim is transactional', async () => {
  // The second guard, for the day an idempotency key has expired (Stripe keeps
  // them 24 hours). Another request stores an id between our read and our write.
  const store = fakeCustomerStore()
  const db = fakeUserDb({})
  db.state.beforeTransaction = () => { db.state.doc.stripeCustomerId = 'cus_from_the_other_request' }

  const id = await ensureStripeCustomer(store.stripe, db, 'uid_1')
  assert.equal(id, 'cus_from_the_other_request',
    'the later request overwrote a claimed stripeCustomerId — that is the lost update the orphan came from')
  assert.equal(db.state.doc.stripeCustomerId, 'cus_from_the_other_request')
})

test('an account that already has a customer never creates another', async () => {
  const store = fakeCustomerStore()

  // Known from the caller's own read of the user document — no round trip at all.
  const withKnown = fakeUserDb({ stripeCustomerId: 'cus_known' })
  assert.equal(await ensureStripeCustomer(store.stripe, withKnown, 'uid_1', 'cus_known'), 'cus_known')
  assert.equal(withKnown.state.transactions, 0)

  // And from the document, when the caller passed nothing.
  const stored = fakeUserDb({ stripeCustomerId: 'cus_stored' })
  assert.equal(await ensureStripeCustomer(store.stripe, stored, 'uid_1'), 'cus_stored')

  assert.equal(store.created.length, 0, 'a returning customer had a second Stripe customer created for them')
})

test('api/create-checkout.js creates no customer of its own any more', () => {
  const src = stripComments(read('api/create-checkout.js'))
  assert.match(src, /ensureStripeCustomer\(/,
    'create-checkout no longer routes through the guarded helper — the read-create-write race is back')
  assert.ok(!/stripe\.customers\.create\(/.test(src),
    'create-checkout is creating a Stripe customer inline again, outside the idempotency key and the transaction')

  // Positive control: this pattern really does match the call it is banning.
  assert.ok(/stripe\.customers\.create\(/.test('const c = await stripe.customers.create({ metadata })'),
    'the ban pattern cannot match the call it bans — the assertion above is vacuous')
})
