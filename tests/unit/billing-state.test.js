// The billing signals the Stripe webhook writes and — until this suite existed
// — nothing read. Every assertion here describes money: who keeps Pro, for how
// long, and what the user is told about it.
//
// The expensive mistake these guard against is the one the audit found: an
// expired card silently dropping a paying customer to Free, with no banner and
// no link to the retry page the webhook had already stored for them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  billingAlert, isWithinPastDueGrace, graceEndsAt, daysBetween,
  PAST_DUE_GRACE_MS, TRIAL_WARN_MS,
} from '../../src/utils/billingState.js'
import { planForUser, PAST_DUE_GRACE_MS as SERVER_GRACE_MS } from '../../api/_lib/plans.js'

const DAY = 86_400_000
// NOW is the REAL clock, deliberately — do not pin it back to a literal date.
//
// This was `Date.UTC(2026, 7, 12, 12, 0, 0)` and it was a time bomb that duly
// detonated: the suite passed 484/484 and then failed mid-session with nothing
// in the diff. `billingAlert` and `isWithinPastDueGrace` both accept an injected
// `now`, so they were never the problem — but `planForUser({ subscription })`
// takes no clock and reads `Date.now()` internally. Against a frozen fixture its
// 7-day grace window simply expired in real time, turning "keeps Pro" into
// "loses it" on a date nobody chose.
//
// Anchoring here to the real clock makes every fixture relative, so the offsets
// below mean what they say (`NOW - 3 * DAY` is genuinely three days ago) and the
// suite is stable forever. The margins absorb the few milliseconds between this
// line and `planForUser`'s own `Date.now()`: the tightest is a full day.
//
// The millisecond-precision boundary test stays exact because it passes NOW in
// explicitly and never calls `planForUser`.
//
// The real defect is upstream — a pure plan-resolution function reading an
// ambient clock is untestable by construction. The fix is an injectable `now`
// defaulting to `Date.now()`, which is additive and backwards-compatible, but
// `api/_lib/plans.js` is founder-gated. Logged in src/data/pipeline.js.
const NOW = Date.now()
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// A comment may legitimately NAME the thing it explains why we avoided — only
// shipped code can break the rule. Same reasoning as plan-limits.test.js.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

// ── The grace window ────────────────────────────────────────────────────────

test('the client and the server agree on the length of the grace window', () => {
  // A client that believes the window is longer than the server grants shows a
  // "you have 3 days left" banner to someone the server already cut off.
  assert.equal(PAST_DUE_GRACE_MS, SERVER_GRACE_MS)
})

test('grace is anchored on paymentFailedAt, never on currentPeriodEnd', () => {
  // This is the whole reason paymentFailedAt exists. Stripe advances
  // current_period_end BEFORE it finalises the renewal invoice, so a
  // subscription that fails on renewal already has a period end a month out.
  // Anchoring there would hand out ~37 free days instead of 7.
  const failedAt = NOW - 2 * DAY
  const sub = {
    status: 'past_due',
    paymentFailed: true,
    paymentFailedAt: failedAt,
    currentPeriodEnd: NOW + 28 * DAY,   // the trap
  }
  assert.equal(graceEndsAt(sub), failedAt + PAST_DUE_GRACE_MS)
  assert.ok(graceEndsAt(sub) < sub.currentPeriodEnd,
    'grace must expire well before the advanced period end')
})

test('a past_due subscription keeps Pro inside the window and loses it after', () => {
  const inside = { status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - 3 * DAY }
  const outside = { status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - 8 * DAY }
  assert.equal(isWithinPastDueGrace(inside, NOW), true)
  assert.equal(isWithinPastDueGrace(outside, NOW), false)
  assert.equal(planForUser({ subscription: inside }).id, 'pro')
  assert.equal(planForUser({ subscription: outside }).id, 'free')
})

test('the last moment of the window is inclusive, the first moment past it is not', () => {
  const at = (offset) => ({ status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - PAST_DUE_GRACE_MS + offset })
  assert.equal(isWithinPastDueGrace(at(0), NOW), true, 'exactly at the boundary must still be granted')
  assert.equal(isWithinPastDueGrace(at(-1), NOW), false, 'one millisecond past must not be')
})

test('no failure timestamp means no grace at all — it fails closed', () => {
  // A grace window with no start is one that never ends. If invoice.payment_failed
  // never landed, the honest answer is Free, not indefinite Pro.
  const sub = { status: 'past_due', paymentFailed: true, currentPeriodEnd: NOW + 20 * DAY }
  assert.equal(isWithinPastDueGrace(sub, NOW), false)
  assert.equal(planForUser({ subscription: sub }).id, 'free')
})

test('grace covers past_due only — not unpaid, not canceled, not incomplete', () => {
  // `unpaid` means Stripe exhausted its retry schedule. By then this is a
  // lapsed customer, not one with a card problem.
  for (const status of ['unpaid', 'canceled', 'incomplete', 'incomplete_expired']) {
    const sub = { status, paymentFailed: true, paymentFailedAt: NOW - DAY }
    assert.equal(isWithinPastDueGrace(sub, NOW), false, `${status} must not receive grace`)
    assert.equal(planForUser({ subscription: sub }).id, 'free', `${status} must resolve to Free`)
  }
})

// ── What the user is told ───────────────────────────────────────────────────

test('a failing payment inside the window says access continues, and for how long', () => {
  const alert = billingAlert({
    status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - 2 * DAY,
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/test',
  }, { now: NOW })
  assert.equal(alert.kind, 'payment-failed')
  assert.equal(alert.severity, 'urgent')
  assert.equal(alert.daysLeft, 5)
  // The retry link is the entire point — the webhook stored it and nothing used it.
  assert.equal(alert.hostedInvoiceUrl, 'https://invoice.stripe.com/i/test')
})

test('a failing payment past the window says access has stopped, not that it will', () => {
  const alert = billingAlert({
    status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - 9 * DAY,
  }, { now: NOW })
  assert.equal(alert.kind, 'payment-lapsed')
  assert.equal(alert.daysLeft, 0)
})

test('a cancelled subscription does not shout about a stale failure flag', () => {
  // paymentFailed is never cleared on cancellation, and a retry link on a
  // cancelled subscription is a dead end. The honest next step is the plans
  // page, which already exists.
  const alert = billingAlert({
    status: 'canceled', paymentFailed: true, paymentFailedAt: NOW - DAY,
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/test',
  }, { now: NOW })
  assert.equal(alert, null)
})

test('a healthy subscription raises nothing', () => {
  assert.equal(billingAlert(null, { now: NOW }), null)
  assert.equal(billingAlert({ status: 'active', currentPeriodEnd: NOW + 20 * DAY }, { now: NOW }), null)
})

// ── Trials ──────────────────────────────────────────────────────────────────

test('a trial warns only inside the warning window', () => {
  const trial = (endsIn) => ({ status: 'trialing', trialEndsAt: NOW + endsIn })
  assert.equal(billingAlert(trial(TRIAL_WARN_MS - DAY), { now: NOW })?.kind, 'trial-ending')
  assert.equal(billingAlert(trial(TRIAL_WARN_MS + 5 * DAY), { now: NOW }), null,
    'a trial with a fortnight to run is not news')
})

test("Stripe's own trial_will_end flag is honoured even outside our window", () => {
  // trialEndingSoon is set from customer.subscription.trial_will_end, whose
  // timing is configured in the Stripe dashboard. If the merchant set it wider
  // than ours, theirs wins.
  const alert = billingAlert({
    status: 'trialing', trialEndsAt: NOW + 10 * DAY, trialEndingSoon: true,
  }, { now: NOW })
  assert.equal(alert.kind, 'trial-ending')
  assert.equal(alert.daysLeft, 10)
})

test('a trial that already ended never warns, even with the flag still set', () => {
  // Nothing in the webhook ever sets trialEndingSoon back to false, so on its
  // own it would announce a trial that ended months ago on every page load.
  // The live-status guard is what makes the banner self-clearing.
  for (const sub of [
    { status: 'trialing', trialEndsAt: NOW - DAY, trialEndingSoon: true },
    { status: 'active', trialEndsAt: NOW + DAY, trialEndingSoon: true },
  ]) {
    assert.equal(billingAlert(sub, { now: NOW }), null)
  }
})

// ── Scheduled cancellation ──────────────────────────────────────────────────

test('a scheduled cancellation states the date and that nothing is deleted', () => {
  const alert = billingAlert({
    status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: NOW + 12 * DAY,
  }, { now: NOW })
  assert.equal(alert.kind, 'cancel-scheduled')
  assert.equal(alert.severity, 'info')
  assert.equal(alert.daysLeft, 12)
  // Downgrade genuinely does not delete anything (ProjectContext blocks new
  // saves only). The copy in BillingBanner.jsx must keep saying so.
  const banner = read('src/components/BillingBanner.jsx')
  assert.ok(/Nothing is deleted/.test(banner),
    'the cancel-scheduled copy must keep promising that saved work survives')
})

test('a failing payment outranks an ending trial and a scheduled cancellation', () => {
  const alert = billingAlert({
    status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - DAY,
    cancelAtPeriodEnd: true, currentPeriodEnd: NOW + 2 * DAY,
    trialEndsAt: NOW + DAY, trialEndingSoon: true,
  }, { now: NOW })
  assert.equal(alert.kind, 'payment-failed')
})

// ── Dismissal keys ──────────────────────────────────────────────────────────

test('a new failure produces a new key, so a dismissed banner comes back', () => {
  const first = billingAlert({ status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - DAY }, { now: NOW })
  const second = billingAlert({ status: 'past_due', paymentFailed: true, paymentFailedAt: NOW }, { now: NOW })
  assert.notEqual(first.key, second.key)
})

test('the same failure produces a stable key, so dismissing it actually sticks', () => {
  const sub = { status: 'past_due', paymentFailed: true, paymentFailedAt: NOW - DAY }
  assert.equal(
    billingAlert(sub, { now: NOW }).key,
    billingAlert(sub, { now: NOW + 3600_000 }).key,
    'the key must not drift with the clock or the banner returns on every render',
  )
})

test('dismissal is sessionStorage, so nothing about money is silenced forever', () => {
  const banner = stripComments(read('src/components/BillingBanner.jsx'))
  assert.ok(banner.includes('sessionStorage'), 'dismissal must use sessionStorage')
  assert.ok(!/localStorage/.test(banner),
    'localStorage would let one click permanently hide a failing payment')
})

// ── The wiring the audit found missing ──────────────────────────────────────

test('the webhook stamps paymentFailedAt once and clears it on recovery', () => {
  const hook = read('api/stripe-webhook.js')
  assert.ok(hook.includes('paymentFailedAt: failedAt'),
    'flagPaymentFailed must write the grace anchor')
  assert.ok(/existing\?\.paymentFailed === true && Number\.isFinite\(existing\?\.paymentFailedAt\)/.test(hook),
    'a retry must reuse the existing timestamp, not push the window forward')
  assert.ok(hook.includes('paymentFailedAt: null'),
    'a recovered payment must clear the anchor')
})

test('only a healthy status may clear the failure flags', () => {
  // customer.subscription.updated (status → past_due) and
  // invoice.payment_failed arrive with no ordering guarantee. Clearing
  // unconditionally meant whichever landed second wiped the other's work.
  //
  // The gate MOVED (not weakened) when `current_period_end` was fixed: the
  // subscription document's shape now lives in api/_lib/billing.js, because
  // api/checkout-status.js has to write the identical document when it
  // reconciles a subscription checkout the webhook never delivered. So this
  // asserts the gate where it lives, plus the delegation that stops the webhook
  // building a second copy of the document beside it.
  //
  // The behavioural counterpart — what writeSubscription actually writes for a
  // past_due subscription — is tests/unit/subscription-period-end.test.js,
  // which calls the webhook's own function with a fake Firestore.
  // The two statuses moved behind a NAME (subscriptionStatusGrantsAccess) when
  // the chargeback-wash fix gave them a second caller — the charge check only
  // spends Stripe calls on a write that could grant. Same two statuses, same
  // gate; this asserts the predicate's definition and the gate that uses it, so
  // widening either is still caught.
  const shape = read('api/_lib/billing.js')
  assert.ok(/export function subscriptionStatusGrantsAccess\(sub\)\s*\{\s*return sub\?\.status === 'active' \|\| sub\?\.status === 'trialing'/.test(shape),
    'the healthy-status predicate must still be exactly active|trialing')
  assert.ok(/const healthy = subscriptionStatusGrantsAccess\(sub\)/.test(shape),
    'subscriptionDocFields must gate the clear on a healthy status')
  assert.ok(/const recovery = healthy/.test(shape),
    'the cleared fields must be conditional on that gate')

  const hook = read('api/stripe-webhook.js')
  assert.ok(/writeSubscriptionDoc\(/.test(hook),
    'the webhook must write through the shared document builder, not a copy of it')
  assert.ok(!/paymentFailed: false/.test(hook.replace(/paymentFailed: false, paymentFailedAt: null, hostedInvoiceUrl: null,/g, '')),
    'the webhook is clearing the failure flags outside the healthy gate again')
})

test('the four webhook fields are read by src/ — the audit found zero readers', () => {
  const src = read('src/utils/billingState.js')
  for (const field of ['paymentFailed', 'hostedInvoiceUrl', 'trialEndsAt', 'trialEndingSoon']) {
    assert.ok(src.includes(`sub.${field}`), `${field} is still written by the webhook and read by nothing`)
  }
})

test('daysBetween rounds up and never goes negative', () => {
  // Rounding down would tell someone with 18 hours left that they have "0 days".
  assert.equal(daysBetween(NOW, NOW + DAY + 1), 2)
  assert.equal(daysBetween(NOW, NOW + 1), 1)
  assert.equal(daysBetween(NOW, NOW - 5 * DAY), 0)
})
