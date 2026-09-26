// A quarterly subscriber must never be told "Billed monthly".
//
// Stripe describes a quarterly price as `recurring: { interval: 'month',
// interval_count: 3 }`. The subscription document stores the count
// (api/_lib/billing.js subscriptionDocFields), and every label comes from
// utils/billingCadence.js, which planFacts.js imports rather than retyping.
import test from 'node:test'
import assert from 'node:assert/strict'
import { cadenceOf, billedLabel, BILLED_EVERY } from '../../src/utils/billingCadence.js'
import { CADENCE_LABEL, BILLED_EVERY as PLAN_BILLED_EVERY } from '../../src/config/planFacts.js'
import { subscriptionDocFields } from '../../api/_lib/billing.js'
import { read, stripComments } from './helpers/source-text.js'

const sub = (interval, count) => ({
  id: 'sub_1',
  status: 'active',
  items: { data: [{ price: { id: 'price_1', recurring: { interval, interval_count: count } } }] },
})

test('the subscription document keeps the interval count', () => {
  assert.equal(subscriptionDocFields(sub('month', 3), 1).intervalCount, 3)
  assert.equal(subscriptionDocFields(sub('month', 1), 1).intervalCount, 1)
  assert.equal(subscriptionDocFields(sub('year', 1), 1).intervalCount, 1)
  assert.equal(subscriptionDocFields({}, 1).intervalCount, null)
})

test('one helper names every cadence', () => {
  assert.equal(cadenceOf({ interval: 'month', intervalCount: 1 }), 'monthly')
  assert.equal(cadenceOf({ interval: 'month', intervalCount: 3 }), 'every three months')
  assert.equal(cadenceOf({ interval: 'year', intervalCount: 1 }), 'yearly')
  assert.equal(cadenceOf({ interval: 'month' }), 'monthly', 'a document written before the count was stored')
  assert.equal(cadenceOf(null), '')
  assert.equal(billedLabel({ interval: 'month', intervalCount: 3 }), 'Billed every three months')
  assert.equal(billedLabel({ interval: 'year', intervalCount: 1 }), 'Billed yearly')
  assert.equal(billedLabel({ interval: 'month', intervalCount: 1 }), 'Billed monthly')
})

test('the plan facts use the same cadence wording, not a copy of it', () => {
  assert.equal(PLAN_BILLED_EVERY, BILLED_EVERY)
  assert.equal(CADENCE_LABEL.quarterly, billedLabel({ interval: 'month', intervalCount: 3 }))
  assert.equal(CADENCE_LABEL.monthly, billedLabel({ interval: 'month', intervalCount: 1 }))
  assert.equal(CADENCE_LABEL.yearly, billedLabel({ interval: 'year', intervalCount: 1 }))
  const facts = stripComments(read('src/config/planFacts.js'))
  assert.ok(!/every (3|three) months/.test(facts), 'planFacts.js types its own cadence wording again')
})

test('Settings and Admin read the cadence from the helper, not from `interval`', () => {
  const settings = stripComments(read('src/pages/Settings.jsx'))
  assert.ok(!/interval === 'year' \? 'Billed yearly' : 'Billed monthly'/.test(settings),
    'Settings is back to a two-way monthly/yearly guess')
  // Settings names the cadence through the plan-facts module, which also
  // declines to guess for a `month` record with no stored count.
  assert.match(settings, /CADENCE_LABEL\[subscriptionCadence\(subscription\)\]/)
  const admin = stripComments(read('src/pages/Admin.jsx'))
  assert.ok(!/\{u\.subscription\.interval\}/.test(admin), 'Admin prints the raw Stripe interval again')
  assert.ok(!/r\.subscription\?\.interval \|\| ''/.test(admin), 'the CSV exports the raw Stripe interval again')
  assert.ok((admin.match(/cadenceOf\(/g) || []).length >= 2)
})

test('the admin user list carries the count to the page', () => {
  // api/verify-admin.js builds each Admin row's `subscription` by hand; a
  // field it leaves out never reaches cadenceOf().
  const src = stripComments(read('api/verify-admin.js'))
  assert.match(src, /subscription: \{[^}]*intervalCount: sub\.intervalCount/)
})
