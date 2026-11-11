// planForSubscription and planForUser take an injectable `now`, so the
// period-end and past-due grace edges can be checked at a fixed instant rather
// than against the real clock, where a frozen fixture expires on its own.
//
// T is deliberately in the past: code that ignored `now` and read the real
// clock would call every subscription here expired, and the "keeps Pro" cases
// would fail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planForSubscription, planForUser, PAST_DUE_GRACE_MS } from '../../api/_lib/plans.js'

const DAY = 86_400_000
const T = Date.UTC(2026, 7, 12, 12, 0, 0)

test('an active subscription keeps Pro until a day past its period end, at the given instant', () => {
  const sub = { status: 'active', currentPeriodEnd: T }
  assert.equal(planForSubscription(sub, T).id, 'pro')
  assert.equal(planForSubscription(sub, T + DAY).id, 'pro')
  assert.equal(planForSubscription(sub, T + DAY + 1).id, 'free')
})

test('past-due grace runs exactly PAST_DUE_GRACE_MS from the failed payment', () => {
  const sub = { status: 'past_due', paymentFailedAt: T }
  assert.equal(planForSubscription(sub, T + PAST_DUE_GRACE_MS).id, 'pro')
  assert.equal(planForSubscription(sub, T + PAST_DUE_GRACE_MS + 1).id, 'free')
})

test('planForUser passes its clock through to the subscription check', () => {
  const subscription = { status: 'past_due', paymentFailedAt: T }
  assert.equal(planForUser({ subscription, now: T + DAY }).id, 'pro')
  assert.equal(planForUser({ subscription, now: T + PAST_DUE_GRACE_MS + 1 }).id, 'free')
})

test('with no clock given, the real clock is used', () => {
  const sub = { status: 'active', currentPeriodEnd: Date.now() + 20 * DAY }
  assert.equal(planForSubscription(sub).id, 'pro')
  assert.equal(planForSubscription({ status: 'active', currentPeriodEnd: T }).id, 'free')
})
