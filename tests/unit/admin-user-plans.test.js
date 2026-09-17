// THE ADMIN USER LIST MUST NOT CALL A PAYING CUSTOMER "FREE".
//
// ═══════════════════════════════════════════════════════════════════════════
// THE DEFECT
// ═══════════════════════════════════════════════════════════════════════════
// src/pages/Admin.jsx computed the Plan column like this, from the day the tab
// was written until 2026-09-16:
//
//   plan: status === 'active' || status === 'trialing' ? 'pro' : 'free'
//
// Stripe can send at least eight subscription statuses. Six of them landed in
// the word "Free" — and one of those six, `past_due`, is a subscriber whose
// card has just failed and who api/_lib/plans.js is STILL SERVING PRO to, for
// seven days, on purpose, so that an expired card does not read to them as the
// product breaking.
//
// So the one row on the dashboard that most needed finding was the one the
// dashboard hid, in the plainest possible way: by giving it the same label as
// the two hundred rows that had never paid anything.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS IS A UNIT TEST OVER A PURE MODULE AND NOT A RENDER TEST
// ═══════════════════════════════════════════════════════════════════════════
// The rule is about money and access. tests/unit/billing-state.test.js and
// tests/unit/moderation-role.test.js already make the same argument for the two
// modules next to this one: a rule that decides what somebody is entitled to
// should be checkable without a browser, and should not be able to change
// because a component moved.
//
// The RENDERING half — that the Plan column reads this module and not a fresh
// two-way expression of its own — is asserted in
// tests/unit/admin-is-site-wide.test.js, because an immaculate module nothing
// calls is exactly how this repository has shipped a correct fix twice before.
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_STATES, planStateOf, planSortKey, needsAttention, PLAN_STATE_ORDER } from '../../src/utils/adminUsers.js'

// Every status the Stripe API documents for a subscription, and what each one
// means for somebody standing in front of the founder's dashboard.
const STRIPE_STATUSES = [
  ['active', 'pro'],
  ['trialing', 'trial'],
  ['past_due', 'past-due'],
  ['unpaid', 'unpaid'],
  ['incomplete', 'incomplete'],
  ['incomplete_expired', 'incomplete'],
  ['canceled', 'canceled'],
  ['paused', 'paused'],
]

test('every Stripe status Stripe can send maps to a state of its own', () => {
  for (const [status, expected] of STRIPE_STATUSES) {
    assert.equal(planStateOf({ status }).id, expected,
      `Stripe status "${status}" no longer has a state of its own on the admin list`)
  }
  // AND THE ONE THAT STARTED IT: the two states that used to share the word
  // "Free" must not share anything now.
  assert.notEqual(planStateOf({ status: 'past_due' }).id, planStateOf({ status: null }).id,
    'a subscriber whose payment is failing is reported as an account that never paid — this is the '
    + 'exact defect the module was written for')
  assert.notEqual(planStateOf({ status: 'canceled' }).id, planStateOf({ status: null }).id,
    'a lapsed customer and somebody who never subscribed read as the same row')
})

test('only an account with no subscription at all is Free', () => {
  for (const nothing of [null, undefined, {}, { status: null }, { status: '' }]) {
    assert.equal(planStateOf(nothing).id, 'free',
      `${JSON.stringify(nothing)} should be the plain free account`)
  }
  // Nothing else may borrow the word.
  const free = Object.values(PLAN_STATES).filter(s => s.label === 'Free')
  assert.equal(free.length, 1, 'more than one state prints as "Free", which is how they blur back together')
})

test('a status this module has never heard of is loud, not Free', () => {
  // Stripe adds statuses. Swallowing an unrecognised one into "Free" is the
  // mechanism that hid `past_due` for as long as it was hidden, so the unknown
  // case is a state of its own that sorts up with the problems.
  for (const odd of ['something_new', 'ACTIVE_BUT_WEIRD', 'pending_cancellation']) {
    const state = planStateOf({ status: odd })
    assert.equal(state.id, 'unknown', `"${odd}" was quietly classified as ${state.id}`)
    assert.equal(state.attention, true, `"${odd}" does not raise its hand`)
  }
})

test('past due is neither entitled nor not — this list cannot know', () => {
  // api/_lib/plans.js serves Pro to a past-due subscription for seven days
  // measured from `paymentFailedAt`. api/verify-admin.js returns `status` and
  // `interval` and NOT that timestamp, so the dashboard genuinely cannot say
  // whether this person has Pro right now. Answering true or false would be a
  // guess, and it is the kind of guess that gets acted on.
  assert.equal(planStateOf({ status: 'past_due' }).entitled, 'grace',
    'the dashboard claims to know whether a past-due subscriber still has Pro. It does not have the '
    + 'timestamp that decides it — see PAST_DUE_GRACE_MS in api/_lib/plans.js')
  assert.equal(planStateOf({ status: 'active' }).entitled, true)
  assert.equal(planStateOf({ status: 'trialing' }).entitled, true)
  for (const status of ['unpaid', 'canceled', 'incomplete', 'paused']) {
    assert.equal(planStateOf({ status }).entitled, false, `${status} is being reported as entitled`)
  }
})

test('the states that need a human are exactly the ones where money is in flight and failing', () => {
  const attention = Object.values(PLAN_STATES).filter(s => s.attention).map(s => s.id).sort()
  assert.deepEqual(attention, ['incomplete', 'past-due', 'unknown', 'unpaid'],
    'the set of states that flag for attention changed. A settled outcome — cancelled, paused, free — '
    + 'is not a problem to solve, and flagging it teaches the founder to ignore the flag')
  assert.equal(needsAttention({ status: 'past_due' }), true)
  assert.equal(needsAttention({ status: 'active' }), false)
  assert.equal(needsAttention(null), false)
})

test('sorting by plan puts the exceptions at the top, not the commonest state', () => {
  // A list of users sorted by plan exists to surface the unusual rows. Sorting
  // them alphabetically, or by how common each state is, buries the four rows
  // the column was opened for under two hundred that need nothing.
  const problems = ['past-due', 'unpaid', 'incomplete', 'unknown']
  const settled = ['pro', 'trial', 'canceled', 'paused', 'free']
  for (const p of problems) {
    for (const s of settled) {
      assert.ok(PLAN_STATE_ORDER.indexOf(p) < PLAN_STATE_ORDER.indexOf(s),
        `${p} sorts below ${s}, so a failing payment is under a working one`)
    }
  }
  assert.ok(planSortKey({ status: 'past_due' }) < planSortKey({ status: 'active' }))
  assert.ok(planSortKey({ status: 'active' }) < planSortKey({ status: null }))
})

test('CONTROL: the order covers every state, so nothing sorts off the end by accident', () => {
  // Without this, adding a state and forgetting to place it gives it the
  // fallback rank — the very bottom — which is where a new failure mode would
  // be least likely to be seen.
  const declared = Object.keys(PLAN_STATES).sort()
  assert.deepEqual([...PLAN_STATE_ORDER].sort(), declared,
    'PLAN_STATE_ORDER and PLAN_STATES disagree about which states exist, so at least one state sorts '
    + 'to the bottom of the Plan column whatever it means')
  assert.ok(declared.length >= 8, `only ${declared.length} states — this test is checking almost nothing`)
})

test('CONTROL: every state carries a tone the dashboard already has a token for', () => {
  // A new colour for this table would make it a different product from the tab
  // beside it. These five are the signal roles the Submissions badges use.
  const allowed = new Set(['ok', 'warn', 'err', 'pending', 'neutral'])
  for (const state of Object.values(PLAN_STATES)) {
    assert.ok(allowed.has(state.tone), `${state.id} uses the tone "${state.tone}", which is not one of the dashboard's`)
    assert.ok(typeof state.label === 'string' && state.label.length > 0, `${state.id} has no label to render`)
  }
})
