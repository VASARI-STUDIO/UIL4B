// THE TRIAL IS PROMISED IN ONE FILE AND GRANTED IN ANOTHER.
//
// src/pages/Checkout.jsx shows the customer a sentence. api/create-checkout.js
// tells Stripe a number. Two separate literals would drift with nothing holding
// them together, so both read one table.
//
// A page that promises a trial the server does not grant is the worst shape a
// billing bug can take, because nothing fails: checkout succeeds, the customer
// believes they have seven free days, and the only symptom is a charge on a
// card statement. There is no error to notice and no log line to read.
//
// THE TRIAL IS EARNED BY THE CADENCE. Monthly bills today and says so, yearly
// gets seven days. "quarterly is not sold anywhere" below pins that quarterly
// is gone from every place that sold it, and that a subscription already
// billing quarterly is still recognised.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { CADENCE_LABEL } from '../../src/config/planFacts.js'
import {
  TRIAL_DAYS, trialDaysFor, BILLING_INTERVALS, PRICE_ENV_KEYS, LOOKUP_KEYS, INTERVAL_COUNTS, INTERVAL_MAP, DEFAULT_PRICES,
} from '../../api/_lib/pricing.js'
import { stripJs } from '../helpers/strip-comments.js'

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

test('the cadence-to-trial rule is what is actually in both tables', () => {
  // Pinned as VALUES, not just as "they match" — two tables that agree on the
  // wrong number would satisfy the test above.
  assert.equal(trialDaysFor('monthly'), 0, 'monthly must bill today')
  assert.equal(trialDaysFor('yearly'), 7)
  assert.equal(trialDaysFor('quarterly'), 0, 'quarterly is not sold, so it earns no trial')
  assert.equal(trialDaysFor('lifetime'), 0, 'a one-off payment cannot have a trial')
  assert.equal(PLAN_LADDER.find((p) => p.id === 'monthly').trialDays, 0)
  assert.equal(PLAN_LADDER.find((p) => p.id === 'yearly').trialDays, 7)
})

test('an unknown cadence gets no trial rather than a crash', () => {
  // The server reads this from a request body. `undefined` days would reach
  // Stripe as trial_period_days: undefined and the failure would be a 400 at
  // best; a NaN would be worse.
  for (const bad of ['weekly', '', null, undefined, 'MONTHLY', 7]) {
    assert.equal(trialDaysFor(bad), 0, `trialDaysFor(${JSON.stringify(bad)}) must be 0`)
  }
})

test('quarterly is not sold anywhere', () => {
  // Quarterly is not sold for new purchases. Each place that could sell it is
  // checked where it lives, because one leftover (a checkout case, a client
  // allowlist entry, a price row) is enough to put it back on sale.
  assert.ok(!BILLING_INTERVALS.includes('quarterly'), 'quarterly is still a billing interval')
  const tables = { PRICE_ENV_KEYS, LOOKUP_KEYS, INTERVAL_COUNTS, INTERVAL_MAP, TRIAL_DAYS, DEFAULT_PRICES }
  for (const [name, table] of Object.entries(tables)) {
    assert.ok(!('quarterly' in table), `${name} still has a quarterly entry`)
  }
  assert.ok(
    !PLAN_LADDER.some((e) => e.id === 'quarterly' || e.checkoutPlan === 'quarterly' || e.liveKey === 'quarterly'),
    'the plan ladder still offers quarterly',
  )
  assert.doesNotMatch(stripJs(read('src/pages/Checkout.jsx')), /quarterly: \{/, 'the checkout page still has a quarterly case')
  assert.doesNotMatch(stripJs(read('src/hooks/usePrices.js')), /quarterly/i, 'useProPrice still prices a quarter')
  assert.doesNotMatch(stripJs(read('src/contexts/SubscriptionContext.jsx')), /'quarterly'/, 'the client will still start a quarterly checkout')
})

test('a subscription already billing quarterly is still recognised', () => {
  // Not selling it is not the same as forgetting it: existing subscribers keep
  // Pro and keep an honest cadence label, never "Billed monthly".
  // billing-cadence.test.js pins the wording itself.
  assert.ok(CADENCE_LABEL.quarterly, 'a quarterly subscriber would be shown no cadence at all')
  assert.match(CADENCE_LABEL.quarterly, /3|three/i)
  assert.notEqual(CADENCE_LABEL.quarterly, CADENCE_LABEL.monthly)
})

test('THE ONE THAT MATTERS: a recurring price carries its interval count', () => {
  // Stripe reads `recurring: { interval: 'month' }` as billing EVERY month. A
  // multi-month price created without `interval_count` charges a multiple of
  // the intended amount every month, on a real card, visible only on a
  // statement. The rule holds for every interval, sold or not.
  assert.equal(INTERVAL_COUNTS.monthly, 1)
  assert.equal(INTERVAL_COUNTS.yearly, 1)

  const setup = read('api/setup-stripe.js')
  assert.match(setup, /interval_count: INTERVAL_COUNTS\[interval\]/,
    'setup-stripe creates recurring prices without an interval count again')
  // Sent for EVERY recurring interval rather than as a special case, so the
  // next cadence added cannot reintroduce the bug by being forgotten.
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
  assert.equal(PLAN_LADDER.length, 2, `the ladder has ${PLAN_LADDER.length} entries; monthly and yearly are the two sold`)
  assert.deepEqual(Object.keys(TRIAL_DAYS).sort(), [...BILLING_INTERVALS].sort(),
    'every sellable interval has exactly one trial entry')
  const distinct = new Set(Object.values(TRIAL_DAYS))
  assert.ok(distinct.size > 1, 'every cadence has the same trial — the cadence rule has been flattened')
})
