// `current_period_end` IS NOT A FIELD ON Subscription. It is on SubscriptionItem.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT
// ─────────────────────────────────────────────────────────────────────────────
// api/stripe-webhook.js wrote `currentPeriodEnd: sub.current_period_end ? … :
// null`. Stripe moved that field off Subscription and onto SubscriptionItem in
// API version 2025-03-31.basil, and stripe@22.2.0 pins 2026-05-27.dahlia — so
// on every path that goes through the SDK (checkout.session.completed retrieves
// the subscription, and so does the reversed-charge trace) the expression read
// `undefined` and the field was written NULL. Silently, on a healthy renewal.
//
// Three things went quiet, and the third one is why this is a P1 rather than a
// cosmetic bug:
//
//   1. Settings' "renews" / "access until" date vanished.
//   2. billingState.js's cancel-scheduled banner never fired, so a customer who
//      cancelled was never told when their access actually ends.
//   3. THE STALE-PERIOD SAFETY NET in api/_lib/plans.js — "an `active`
//      subscription whose period end is more than a day stale is not active any
//      more" — is written as `if (subscription.currentPeriodEnd && …)`. Against
//      a null it does not fire. A subscription whose webhooks stop arriving
//      therefore stays Pro on `status` alone, indefinitely.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE ASSERTS, AND WHY IT IS THE CALL SITE
// ─────────────────────────────────────────────────────────────────────────────
// Testing `subscriptionPeriodEnd()` alone would prove nothing: this repo has
// already shipped a green suite over a reverted call site. So the wiring test
// below imports api/stripe-webhook.js's OWN `writeSubscription` and hands it a
// fake Firestore, and asserts the document THAT function writes. Break line
// 49's read back to `sub.current_period_end` and this file goes red.
//
// The fixtures are the SDK's own shapes, taken from the type declarations that
// ship in node_modules/stripe — there is no live Stripe in this suite and the
// network is stubbed suite-wide. The first test reads those declarations
// directly, so the day Stripe moves the field again, this file says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  subscriptionDocFields,
  subscriptionPeriodEnd,
  writeSubscriptionDoc,
} from '../../api/_lib/billing.js'
import { planForSubscription } from '../../api/_lib/plans.js'
import { writeSubscription } from '../../api/stripe-webhook.js'

// The SDK's own declarations, read from the installed package. `stripe` blocks
// subpath imports of its internals through "exports", so this reads the tree
// directly — the same files the review cited.
const readStripe = (p) => fs.readFileSync(path.join(process.cwd(), 'node_modules', 'stripe', p), 'utf8')

const DAY = 86_400_000
const PERIOD_END = 1_800_000_000 // seconds

// ─── A Subscription exactly as stripe@22.2.0 returns one ─────────────────────
// No top-level current_period_end. The period lives on the item.
const dahliaSubscription = (overrides = {}, itemOverrides = {}) => ({
  id: 'sub_1',
  object: 'subscription',
  status: 'active',
  cancel_at_period_end: false,
  trial_end: null,
  customer: 'cus_1',
  metadata: { firebaseUid: 'uid_1' },
  items: {
    object: 'list',
    data: [{
      id: 'si_1',
      object: 'subscription_item',
      current_period_start: PERIOD_END - 30 * 86_400,
      current_period_end: PERIOD_END,
      price: { id: 'price_1', recurring: { interval: 'month' } },
      ...itemOverrides,
    }],
  },
  ...overrides,
})

// A raw customer.subscription.* payload from a webhook endpoint still pinned to
// an API version older than 2025-03-31.basil: the field is top-level and the
// item does not carry it. Stripe's dashboard decides this per endpoint and it
// cannot be read from here, so both shapes have to keep working.
const legacySubscription = () => {
  const sub = dahliaSubscription()
  delete sub.items.data[0].current_period_end
  delete sub.items.data[0].current_period_start
  sub.current_period_end = PERIOD_END
  return sub
}

// ── A Firestore double that records exactly what was merged ─────────────────
function fakeDb() {
  const writes = []
  return {
    writes,
    lastSubscription: () => writes.at(-1)?.data?.subscription,
    collection(name) {
      assert.equal(name, 'users', 'the subscription document is written under users/')
      return {
        doc(uid) {
          return {
            set(data, opts) {
              writes.push({ uid, data, opts })
              return Promise.resolve()
            },
          }
        },
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The SDK is the evidence, not this test's memory of it
// ─────────────────────────────────────────────────────────────────────────────
test('the installed SDK still keeps current_period_end on the ITEM, not the Subscription', () => {
  const apiVersion = readStripe('cjs/apiVersion.js')
  assert.match(apiVersion, /2026-05-27\.dahlia/,
    'stripe pinned a different API version — re-verify where current_period_end lives before trusting this file')

  const items = readStripe('cjs/resources/SubscriptionItems.d.ts')
  assert.match(items, /^\s*current_period_end: number;$/m,
    'SubscriptionItem no longer declares current_period_end — the fix below is aimed at the wrong object')

  // On Subscription the name survives only as a LIST FILTER and in the prose of
  // the cancel_at_period_end docstring. It is not a response field, which is the
  // whole defect. Assert the shape of every occurrence rather than the count, so
  // a docstring edit upstream cannot fail this for the wrong reason.
  const subs = readStripe('cjs/resources/Subscriptions.d.ts')
  const declarations = subs
    .split('\n')
    .filter((line) => /^\s*current_period_end[?]?\s*:/.test(line))
  assert.ok(declarations.length > 0, 'the name vanished from Subscriptions.d.ts entirely — re-read the SDK')
  for (const line of declarations) {
    assert.match(line, /current_period_end\?:/,
      `Subscriptions.d.ts declares a REQUIRED current_period_end (${line.trim()}) — Stripe may have moved it back`)
    assert.match(line, /RangeQueryParam/,
      `Subscriptions.d.ts declares a non-filter current_period_end (${line.trim()})`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The reader itself, both shapes
// ─────────────────────────────────────────────────────────────────────────────
test('the period end is read off the item, and the legacy top-level field still works', () => {
  assert.equal(subscriptionPeriodEnd(dahliaSubscription()), PERIOD_END * 1000)
  assert.equal(subscriptionPeriodEnd(legacySubscription()), PERIOD_END * 1000)

  // Positive control on the negative case: a subscription with neither really
  // does yield null, so a passing assertion above is not vacuous.
  const neither = dahliaSubscription()
  delete neither.items.data[0].current_period_end
  assert.equal(subscriptionPeriodEnd(neither), null)
  assert.equal(subscriptionPeriodEnd(null), null)
  assert.equal(subscriptionPeriodEnd({ items: { data: [] } }), null)
})

test('a multi-item subscription takes the LAST period end, never the first', () => {
  // Understating this revokes a paying customer a cycle early.
  const sub = dahliaSubscription()
  sub.items.data = [
    { current_period_end: PERIOD_END, price: { id: 'price_1', recurring: { interval: 'month' } } },
    { current_period_end: PERIOD_END + 30 * 86_400 },
  ]
  assert.equal(subscriptionPeriodEnd(sub), (PERIOD_END + 30 * 86_400) * 1000)

  // And order must not decide it.
  sub.items.data.reverse()
  assert.equal(subscriptionPeriodEnd(sub), (PERIOD_END + 30 * 86_400) * 1000)
})

test('a zero or nonsense period end is not mistaken for a real one', () => {
  for (const bad of [0, -1, null, undefined, 'soon', NaN]) {
    const sub = dahliaSubscription({}, { current_period_end: bad })
    assert.equal(subscriptionPeriodEnd(sub), null, `${String(bad)} was accepted as a period end`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE WIRING. What api/stripe-webhook.js's own writeSubscription writes.
// ─────────────────────────────────────────────────────────────────────────────
test('the webhook call site writes a real currentPeriodEnd for an SDK subscription', async () => {
  const db = fakeDb()
  await writeSubscription('uid_1', dahliaSubscription(), db)

  const written = db.lastSubscription()
  assert.equal(db.writes.length, 1)
  assert.equal(db.writes[0].uid, 'uid_1')
  assert.deepEqual(db.writes[0].opts, { merge: true }, 'the subscription write must stay a merge')
  assert.equal(written.currentPeriodEnd, PERIOD_END * 1000,
    'api/stripe-webhook.js is reading current_period_end off the Subscription again — it lives on the item')

  // The rest of the document is unchanged by the fix.
  assert.equal(written.id, 'sub_1')
  assert.equal(written.status, 'active')
  assert.equal(written.priceId, 'price_1')
  assert.equal(written.interval, 'month')
  assert.equal(written.cancelAtPeriodEnd, false)
  assert.equal(written.trialEndsAt, null)
})

test('the webhook call site still clears the failure flags only on a healthy status', async () => {
  // The ordering guard that predates this fix, re-asserted at the call site
  // because the field construction moved files. Losing it drops a retrying
  // customer straight to Free.
  const healthy = fakeDb()
  await writeSubscription('uid_1', dahliaSubscription({ status: 'trialing' }), healthy)
  assert.equal(healthy.lastSubscription().paymentFailed, false)
  assert.equal(healthy.lastSubscription().paymentFailedAt, null)

  const failing = fakeDb()
  await writeSubscription('uid_1', dahliaSubscription({ status: 'past_due' }), failing)
  assert.ok(!('paymentFailed' in failing.lastSubscription()),
    'a past_due write must not touch paymentFailed — the invoice event owns it')
  assert.ok(!('paymentFailedAt' in failing.lastSubscription()),
    'a past_due write must not touch paymentFailedAt — it is the grace window anchor')
})

test('the webhook call site never writes accessRevoked, so a revocation survives it', async () => {
  // `accessRevoked` is sticky by design: Stripe keeps reporting `active`
  // through a dispute, so a revocation written into `status` would be undone by
  // the next delivery. The merge must simply not mention the field.
  const db = fakeDb()
  await writeSubscription('uid_1', dahliaSubscription(), db)
  assert.ok(!('accessRevoked' in db.lastSubscription()))
  assert.ok(!('accessRevokedAt' in db.lastSubscription()))
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The consequence: the safety net is armed again
// ─────────────────────────────────────────────────────────────────────────────
test('the stale-period safety net actually fires on the document the webhook writes', async () => {
  const stale = Math.floor((Date.now() - 5 * DAY) / 1000)
  const db = fakeDb()
  await writeSubscription('uid_1', dahliaSubscription({}, { current_period_end: stale }), db)

  assert.equal(planForSubscription(db.lastSubscription()).id, 'free',
    'an active subscription five days past its period end is still being served Pro')

  // Positive control: a CURRENT period end on the same path is Pro, so the
  // assertion above is discriminating rather than always-free.
  const fresh = fakeDb()
  const soon = Math.floor((Date.now() + 20 * DAY) / 1000)
  await writeSubscription('uid_1', dahliaSubscription({}, { current_period_end: soon }), fresh)
  assert.equal(planForSubscription(fresh.lastSubscription()).id, 'pro')

  // And the control that names the bug: the document the OLD call site wrote —
  // currentPeriodEnd null — sails straight past the net.
  assert.equal(planForSubscription({ status: 'active', currentPeriodEnd: null }).id, 'pro',
    'planForSubscription changed shape; the null case is what made this defect invisible')
})

test('writeSubscriptionDoc and the webhook write byte-identical documents', async () => {
  // The two writers cannot drift, because there is only one. If someone
  // re-inlines the object into stripe-webhook.js, this is what notices.
  const now = 1_700_000_000_000
  const sub = dahliaSubscription()
  const direct = fakeDb()
  await writeSubscriptionDoc(direct, 'uid_1', sub, now)
  assert.deepEqual(direct.lastSubscription(), subscriptionDocFields(sub, now))
})
