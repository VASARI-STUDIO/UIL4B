// One source of truth for what Free and Pro are.
//
// Every surface that describes a plan says the same thing: Settings, Checkout
// and the Pro upgrade modal must not keep their own feature lists, and
// Settings must name the real cadence. src/config/planFacts.js is the only place those
// lines are written; these tests hold every surface to it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  FREE_POINTS, PRO_POINTS, FREE_EXCLUSION, BILLING_OPTIONS, DEFAULT_BILLING, TOOL_COUNT,
  resolveOffers, subscriptionCadence, CADENCE_LABEL,
} from '../../src/config/planFacts.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { TOOL_COUNT as LANDING_TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const SURFACES = {
  settings: 'src/pages/Settings.jsx',
  checkout: 'src/pages/Checkout.jsx',
  modal: 'src/components/ProUpgradeModal.jsx',
}

test('every surface that describes Pro reads its lines from planFacts', () => {
  for (const [name, file] of Object.entries(SURFACES)) {
    assert.match(read(file), /from '\.\.\/config\/planFacts'/, `${name} does not import planFacts`)
    assert.match(code(file), /\bPRO_POINTS\b/, `${name} does not use PRO_POINTS`)
  }
  assert.match(code(SURFACES.settings), /\bFREE_POINTS\b/, 'Settings\' Free column does not use FREE_POINTS')
  assert.match(code(SURFACES.settings), /\bFREE_EXCLUSION\b/, 'Settings\' Free column drops /plans\' minus line')
})

test('no surface keeps a feature list of its own', () => {
  // The lines each surface used to type for itself. Any of them back is a
  // second description of Pro, which is the defect.
  const ownLines = [
    'Advanced colour controls',
    'All core design tools',
    'Unlimited palettes, scales',
    'Local browser saves',
    'Pro colour tools',
    '12-page A4 manual',
    'Everything in Free, plus',
  ]
  for (const [name, file] of Object.entries(SURFACES)) {
    const src = code(file)
    for (const line of ownLines) assert.ok(!src.includes(line), `${name} still says "${line}"`)
  }
})

test('the lines are derived from what the product enforces', () => {
  assert.ok(FREE_POINTS.some((l) => l.includes(`${AI_LIMITS.free.daily} AI generations a day`)))
  assert.ok(FREE_POINTS.some((l) => l.includes(`${FREE_SAVE_LIMITS.projects} saved projects`)))
  assert.ok(PRO_POINTS.some((l) => l.includes(`${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`)))
  assert.equal(TOOL_COUNT, LANDING_TOOL_COUNT, 'Settings and the landing count the tools differently')
  assert.equal(FREE_EXCLUSION, 'Small mark on exported files')
})

test('the cadences are exactly the buyable rungs of the ladder, yearly first choice', () => {
  assert.deepEqual(BILLING_OPTIONS.map((o) => o.id), PLAN_LADDER.filter((p) => p.checkoutPlan).map((p) => p.id))
  assert.equal(DEFAULT_BILLING, 'yearly')
})

test('prices, savings, trials and the billed line come out as /plans prints them', () => {
  const prices = { monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } }
  const { offers, priceServiceDown } = resolveOffers({ prices, currency: 'usd', loaded: true })
  assert.equal(priceServiceDown, false)
  const by = Object.fromEntries(offers.map((o) => [o.id, o]))
  assert.equal(by.monthly.amountLabel, '$7')
  assert.equal(by.monthly.billedNote, 'Billed monthly, cancel any time. Keep every export you made.')
  assert.equal(by.yearly.amountLabel, '$4')
  assert.equal(by.yearly.savingLabel, '43% off')
  assert.equal(by.yearly.billedNote, 'Billed $48 yearly, 7-day free trial, cancel any time. Keep every export you made.')
  if (by.quarterly) {
    // Quarterly is on once planLadder gives it a checkout.
    assert.equal(by.quarterly.amountLabel, '$6')
    assert.equal(by.quarterly.savingLabel, '14% off')
    assert.equal(by.quarterly.billedNote, 'Billed $18 every three months, 7-day free trial, cancel any time. Keep every export you made.')
  }
  for (const o of offers) {
    const rung = PLAN_LADDER.find((p) => p.id === o.id)
    assert.equal(o.trialDays, rung.trialDays || 0, `${o.id}: the trial disagrees with the ladder (and so with the server)`)
  }
})

test('no price means no amount, never a guess', () => {
  const down = resolveOffers({ prices: null, loaded: true })
  assert.equal(down.priceServiceDown, true)
  assert.ok(down.offers.every((o) => o.amountLabel === null && o.billedNote === null))
  const loading = resolveOffers({ prices: { monthly: { usd: 7 } }, loaded: false })
  assert.ok(loading.offers.every((o) => o.amountLabel === null))
})

test('a subscription names its cadence only when the record can say', () => {
  assert.equal(subscriptionCadence({ interval: 'year' }), 'yearly')
  assert.equal(subscriptionCadence({ interval: 'month', intervalCount: 3 }), 'quarterly')
  assert.equal(subscriptionCadence({ interval: 'month', interval_count: 1 }), 'monthly')
  assert.equal(subscriptionCadence({ billingInterval: 'quarterly' }), 'quarterly')
  assert.equal(subscriptionCadence({ interval: 'quarterly' }), 'quarterly')
  // The case that shipped wrong: `month` alone could be monthly OR quarterly.
  assert.equal(subscriptionCadence({ interval: 'month' }), null)
  assert.equal(subscriptionCadence(null), null)
  assert.equal(CADENCE_LABEL.quarterly, 'Billed every three months')
})

test('Settings never decides the cadence itself', () => {
  const src = code(SURFACES.settings)
  assert.ok(!/'Billed monthly'|"Billed monthly"/.test(src), 'Settings types "Billed monthly" again')
  assert.match(src, /subscriptionCadence\(/)
})

test('"no card needed" stays out of the surfaces that sell Pro, and cancelling is offered only to an account', () => {
  // Cancelling is real now (the Customer Portal), so the line may appear, but
  // only where the reader has a subscription to cancel from.
  for (const file of [SURFACES.settings, SURFACES.modal]) {
    assert.ok(!/no card/i.test(code(file)), `${file} promises "no card needed"`)
  }
  const lines = code(SURFACES.modal).split('\n').filter((l) => /cancel any ?time/i.test(l))
  for (const l of lines) {
    assert.match(l, /\buser \?/, `the upgrade modal offers cancelling to a visitor with no account: ${l.trim()}`)
  }
})
