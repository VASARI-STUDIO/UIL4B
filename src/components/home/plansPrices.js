// What the plans section says about money, worked out from the plan ladder.
// Nothing here is typed: amounts, the saving, the trial and the cadence words
// all come from config/planLadder.js and utils/billingCadence.js, the modules
// /plans reads. DOM-free, so a test can call it with and without live prices.
//
// `prices` is usePrices().prices, or nothing. Without it, or where Stripe has no
// live USD price for a cadence, resolvePlanLadder quotes the approved fallback;
// a live price wins. Amounts are always USD and always say "US$", so a bare "$"
// never reads as the visitor's own dollar.

import {
  APPROVED_CURRENCY,
  cheapestPerMonth,
  formatMoney,
  resolvePlanLadder,
  savingsVsMonthly,
} from '../../config/planLadder.js'
import { BILLED_EVERY } from '../../utils/billingCadence.js'

const usd = (amount, plan) => formatMoney(amount, plan?.currency || APPROVED_CURRENCY, { qualify: true })

// "a year", "a month", "every three months": how a total reads after its amount.
const termOf = (months) => {
  if (months === 12) return 'a year'
  if (months === 1) return 'a month'
  return `every ${months} months`
}

export function planPriceFacts(prices) {
  const resolved = resolvePlanLadder({ prices, currency: APPROVED_CURRENCY })
  // The headline plan: the cheapest per-month rate among the cadences on sale.
  const best = cheapestPerMonth(resolved)
  const monthly = resolved.find((p) => p.purchasable && p.months === 1)
  if (!best) return null

  const saving = savingsVsMonthly(best, resolved)
  const trialDays = best.trialDays || 0
  const total = best.months > 1 ? usd(best.total, best) : null
  const monthToMonth = monthly && monthly.id !== best.id ? usd(monthly.total, monthly) : null

  const terms = [
    trialDays ? `${trialDays} days free, then ` : '',
    `${total || usd(best.perMonth, best)} ${termOf(best.months)}.`,
    monthToMonth ? ` Or ${monthToMonth} month to month.` : '',
  ].join('')

  return {
    perMonth: usd(best.perMonth, best),
    billedLine: `a month, billed ${BILLED_EVERY[best.id]}`,
    saving,
    savingLabel: saving > 0 ? `Save ${saving}%` : '',
    trialDays,
    trialBadge: trialDays ? `${trialDays} days free` : '',
    // "Start your 7-day free trial": the trial is the cadence's own, so a
    // ladder with no trial says "Start Pro" and promises nothing.
    cta: trialDays ? `Start your ${trialDays}-day free trial` : 'Start Pro',
    terms: terms.charAt(0).toUpperCase() + terms.slice(1),
  }
}

/** The Free card's price. */
export const freePrice = () => formatMoney(0, APPROVED_CURRENCY, { qualify: true })
