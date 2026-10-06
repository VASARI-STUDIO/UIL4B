// THE TRIAL IS PROMISED IN ONE FILE AND GRANTED IN ANOTHER.
//
// src/pages/Checkout.jsx shows the customer a sentence. api/create-checkout.js
// tells Stripe a number. Until 2026-09-15 those were two separate literals —
// the string "7-day free trial" next to `if (isYearly) trial_period_days = 7`
// — with nothing holding them together.
//
// A page that promises a trial the server does not grant is the worst shape a
// billing bug can take, because nothing fails: checkout succeeds, the customer
// believes they have seven free days, and the only symptom is a charge on a
// card statement. There is no error to notice and no log line to read.
//
// Founder, 2026-09-15: THE TRIAL IS EARNED BY THE CADENCE. Monthly bills today
// and says so, quarterly and yearly each get seven days. Yearly granted 7
// before that decision and grants 7 after it, so nothing already promised to a
// customer moved.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { TRIAL_DAYS, trialDaysFor, BILLING_INTERVALS, PRICE_ENV_KEYS, LOOKUP_KEYS, INTERVAL_COUNTS } from '../../api/_lib/pricing.js'

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8')

test('the ladder the UI reads and the table Stripe is given agree', () => {
  // THE WHOLE POINT OF THE FILE. Every cadence the checkout page can render
  // must promise exactly the number of days the server asks Stripe for.
  const drift = []
  for (const entry of PLAN_LADDER) {
    const server = trialDaysFor(entry.id)
    if (entry.trialDays !== server) {
      drift.push(`${entry.id}: the page says ${entry.trialDays} days, the server asks Stripe for ${server}`)
    }
  }
  assert.deepEqual(drift, [])
})

test('the founder decision is what is actually in both tables', () => {
  // Pinned as VALUES, not just as "they match" — two tables that agree on the
  // wrong number would satisfy the test above.
  assert.equal(trialDaysFor('monthly'), 0, 'monthly must bill today')
  assert.equal(trialDaysFor('quarterly'), 7)
  assert.equal(trialDaysFor('yearly'), 7)
  assert.equal(trialDaysFor('lifetime'), 0, 'a one-off payment cannot have a trial')
  assert.equal(PLAN_LADDER.find((p) => p.id === 'monthly').trialDays, 0)
})

test('an unknown cadence gets no trial rather than a crash', () => {
  // The server reads this from a request body. `undefined` days would reach
  // Stripe as trial_period_days: undefined and the failure would be a 400 at
  // best; a NaN would be worse.
  for (const bad of ['weekly', '', null, undefined, 'MONTHLY', 7]) {
    assert.equal(trialDaysFor(bad), 0, `trialDaysFor(${JSON.stringify(bad)}) must be 0`)
  }
})

test('quarterly is genuinely sellable, not half-wired', () => {
  // The four things pricing.js listed as missing before quarterly could be
  // switched on. Each is checked where it actually lives, because "quarterly
  // is in BILLING_INTERVALS" on its own produces a checkout that dead-ends.
  assert.ok(BILLING_INTERVALS.includes('quarterly'), 'quarterly cannot be sold')
  assert.ok(PRICE_ENV_KEYS.quarterly, 'no env override for the quarterly price')
  assert.ok(LOOKUP_KEYS.quarterly, 'no Stripe lookup key for quarterly')
  assert.match(read('src/pages/Checkout.jsx'), /quarterly: \{/, 'the checkout page has no quarterly case')
  assert.match(read('src/hooks/usePrices.js'), /quarterlyTotal/, 'useProPrice cannot price a quarter')
  // NOT checkoutPlan. That field is the switch that publishes the Offer and it
  // is deliberately still null until the Stripe price exists — see the tripwire
  // in price-ladder.test.js. Everything a buyer needs is built; the last step
  // is the founder creating the price in Stripe test mode.
  const ladder = PLAN_LADDER.find((entry) => entry.id === 'quarterly')
  assert.equal(ladder.trialDays, 7, 'quarterly lost the trial it was given')
  assert.equal(ladder.months, 3)
})

test('THE ONE THAT MATTERS: a recurring price carries its interval count', () => {
  // Stripe reads `recurring: { interval: 'month' }` as billing EVERY month. A
  // quarterly price created without `interval_count: 3` charges $18 a month —
  // three times the intended amount, on a real card, visible only on a
  // statement. INTERVAL_COUNTS held the right number from the day quarterly was
  // first described and nothing read it, which is exactly how that ships.
  assert.equal(INTERVAL_COUNTS.quarterly, 3)
  assert.equal(INTERVAL_COUNTS.monthly, 1)
  assert.equal(INTERVAL_COUNTS.yearly, 1)

  const setup = read('api/setup-stripe.js')
  assert.match(setup, /interval_count: INTERVAL_COUNTS\[interval\]/,
    'setup-stripe creates recurring prices without an interval count again')
  // Sent for EVERY recurring interval rather than as a quarterly special case,
  // so the next cadence added cannot reintroduce the bug by being forgotten.
  assert.doesNotMatch(setup, /interval === 'quarterly'/,
    'the interval count is back to being a special case')
})

test('create-checkout reads the table instead of asking if it is yearly', () => {
  // SOURCE ASSERTION. The table being right is worth nothing if the endpoint
  // stops reading it, and `isYearly` is the exact shape it had before.
  //
  // Comments are stripped first, and the reason is worth keeping: the file now
  // EXPLAINS the bug it used to have, so the first version of this test matched
  // the words `trial_period_days = 7` inside the comment describing them and
  // failed against the fixed code. A source assertion that reads prose is
  // asserting on documentation, not on behaviour.
  const src = read('api/create-checkout.js').replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /trialDaysFor\(interval\)/, 'the trial is no longer read from the cadence')
  assert.doesNotMatch(src, /trial_period_days = 7/, 'a hard-coded 7 is back')
  assert.doesNotMatch(src, /const isYearly/, 'the yearly special case is back')
  // The stripper must have left something: a regex that ate the whole file
  // would make both absences trivially true.
  assert.ok(src.includes('subscription_data'), 'the comment stripper ate the code')
})

test('this guard is not toothless — the tables are real and distinct', () => {
  // POSITIVE CONTROL. Every assertion above compares two things or matches a
  // string, and all of them would pass against an empty ladder or a TRIAL_DAYS
  // that had lost its entries.
  assert.ok(PLAN_LADDER.length >= 3, `the ladder has only ${PLAN_LADDER.length} entries`)
  assert.deepEqual(Object.keys(TRIAL_DAYS).sort(), [...BILLING_INTERVALS].sort(),
    'every sellable interval has exactly one trial entry')
  const distinct = new Set(Object.values(TRIAL_DAYS))
  assert.ok(distinct.size > 1, 'every cadence has the same trial — the cadence rule has been flattened')
})
