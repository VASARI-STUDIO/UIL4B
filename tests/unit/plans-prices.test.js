// planPriceFacts: what the homepage plans section says about money is worked
// out from the plan ladder, never typed.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPROVED_CURRENCY,
  cheapestPerMonth,
  formatMoney,
  resolvePlanLadder,
  savingsVsMonthly,
} from '../../src/config/planLadder.js'
import { BILLED_EVERY } from '../../src/utils/billingCadence.js'
import { freePrice, planPriceFacts } from '../../src/components/home/plansPrices.js'

const resolved = resolvePlanLadder({ currency: APPROVED_CURRENCY })
const best = cheapestPerMonth(resolved)
const usd = (n) => formatMoney(n, APPROVED_CURRENCY, { qualify: true })

test('the headline is the cheapest per-month rate on the ladder, in US dollars', () => {
  const facts = planPriceFacts()
  assert.equal(facts.perMonth, usd(best.perMonth))
  assert.match(facts.perMonth, /^US\$\d/, 'a bare $ would read as the visitor\'s own dollar')
  assert.equal(facts.billedLine, `a month, billed ${BILLED_EVERY[best.id]}`)
})

test('the saving is the ladder\'s own figure', () => {
  const facts = planPriceFacts()
  const saving = savingsVsMonthly(best, resolved)
  assert.equal(facts.saving, saving)
  assert.equal(facts.savingLabel, saving > 0 ? `Save ${saving}%` : '')
})

test('the terms sentence names the total and the month-to-month price from the ladder', () => {
  const facts = planPriceFacts()
  const monthly = resolved.find((p) => p.purchasable && p.months === 1)
  if (best.months > 1) assert.ok(facts.terms.includes(usd(best.total)), 'the yearly total is missing')
  if (monthly && monthly.id !== best.id) assert.ok(facts.terms.includes(usd(monthly.total)), 'the monthly price is missing')
  if (best.trialDays) assert.ok(facts.terms.startsWith(`${best.trialDays} days free, then `))
})

test('the call to action promises a trial only when the cadence has one', () => {
  const facts = planPriceFacts()
  if (best.trialDays) {
    assert.equal(facts.cta, `Start your ${best.trialDays}-day free trial`)
    assert.equal(facts.trialBadge, `${best.trialDays} days free`)
  } else {
    assert.equal(facts.cta, 'Start Pro')
    assert.equal(facts.trialBadge, '')
  }
})

test('the Free price is zero, formatted by the ladder', () => {
  assert.equal(freePrice(), formatMoney(0, APPROVED_CURRENCY))
})
