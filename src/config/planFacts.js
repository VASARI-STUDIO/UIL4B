// THE PLAN FACTS — one module every surface that describes Free and Pro reads.
//
// /plans, Settings → Subscription, the Pro upgrade modal and the checkout
// summary all describe what Free and Pro include. The lines live HERE, and
// every surface imports them — so a fact can only change in one place, and
// tests/unit/plan-facts.test.js fails if a surface grows its own list again.
//
// Every number is derived from the module that ENFORCES it; nothing is typed:
//   AI_LIMITS / FREE_SAVE_LIMITS → config/plans.js (mirror of api/_lib/plans.js)
//   COLOUR_SYSTEMS               → what the palette engine gates on
//   export formats               → config/exportFormats.js, which renders the buttons
//   cadences, trials             → config/planLadder.js (mirror of api/_lib/pricing.js)
//   prices                       → /api/get-prices, passed in; never typed
//   the tool count               → data/toolTree.js, live and not beta
//
// DOM-free, React-free.

import { AI_LIMITS, FREE_SAVE_LIMITS } from './plans.js'
import { COLOUR_SYSTEMS } from './colourSystems.js'
import { freeFormats, proOnlyFormats, styleGuideFormats } from './exportFormats.js'
import { PLAN_LADDER, formatMoney } from './planLadder.js'
import { createTools } from '../data/toolTree.js'
import { BILLED_EVERY } from '../utils/billingCadence.js'

const AI = AI_LIMITS

/** Live and not beta — the same count /plans and the landing print. */
export const TOOL_COUNT = createTools().filter((t) => !t.soon && !t.beta).length

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
export function numberWord(n) {
  return NUMBER_WORDS[n] || String(n)
}

const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length

// "Style guide (HTML)" → "HTML".
const shortName = (f) => {
  const inParens = /\(([^)]+)\)\s*$/.exec(f.name)
  return inParens ? inParens[1] : f.name
}
const listNames = (formats) => {
  const names = formats.map(shortName)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
export const FREE_EXPORT_NAMES = listNames(freeFormats())
/** The free formats other than the UI kit, which the Free card names on its own. */
export const STYLE_GUIDE_EXPORT_NAMES = listNames(styleGuideFormats())
export const PRO_EXPORT_NAMES = proOnlyFormats().map((f) => f.name).join(' and ')

/** What Free includes — /plans' Free card, in order. */
export const FREE_POINTS = Object.freeze([
  `All ${numberWord(TOOL_COUNT)} tools`,
  `${AI.free.daily} AI generations a day, ${AI.free.monthly} a month`,
  `The UI kit, and style guide exports in ${STYLE_GUIDE_EXPORT_NAMES}`,
  `${FREE_SAVE_LIMITS.projects} saved projects and ${FREE_SAVE_LIMITS.customIcons} custom icons`,
])

/** /plans' one minus line on the Free card. */
export const FREE_EXCLUSION = 'Small mark on exported files'

/** What Pro adds — /plans' Pro card, in order. */
export const PRO_POINTS = Object.freeze([
  `${AI.pro.daily} AI generations a day, ${AI.pro.monthly} a month`,
  `All ${SYSTEMS_TOTAL} colour systems, plus HCT editing`,
  'Style guides and the UI kit with no “Made with UIL4B” line',
  'Unlimited saved projects and custom icons',
  PRO_EXPORT_NAMES,
])

// ── Cadences ─────────────────────────────────────────────────────────────────

/** The cadences a person can buy — a tier with no checkout is never offered. */
export const BILLING_OPTIONS = Object.freeze(PLAN_LADDER.filter((p) => p.checkoutPlan))
export const DEFAULT_BILLING = (BILLING_OPTIONS.find((p) => p.best) || BILLING_OPTIONS[0]).id
// The cadence wording lives in utils/billingCadence.js, the one source.
export { BILLED_EVERY }

/** Rounded once, the way planLadder rounds it: $48/12 is $4, never $3.99. */
export const perMonth = (total, months) => Math.round((total / months) * 100) / 100

/**
 * Every buyable cadence resolved against the live prices, carrying exactly
 * what /plans prints for it: the per-month amount, the saving against monthly
 * ("17% off", nothing under 5%), the trial, and the billed line.
 *
 * `prices` is usePrices().prices; `loaded` is useProPrice().loaded. No price →
 * `amountLabel: null` and `priceServiceDown: true`: an offer is never shown
 * without its amount.
 */
export function resolveOffers({ prices, currency = 'usd', loaded = true } = {}) {
  const totalOf = (o) => (loaded ? prices?.[o.liveKey]?.[currency] : undefined)
  const monthly = BILLING_OPTIONS.find((o) => o.id === 'monthly')
  const monthlyTotal = monthly ? totalOf(monthly) : undefined
  const hasMonthly = typeof monthlyTotal === 'number'
  const offers = BILLING_OPTIONS.map((o) => {
    const total = totalOf(o)
    const has = typeof total === 'number'
    let saving = 0
    if (o.id !== 'monthly' && hasMonthly && has) {
      const pct = Math.round((1 - perMonth(total, o.months) / monthlyTotal) * 100)
      saving = pct >= 5 ? pct : 0
    }
    const trial = o.trialDays ? `, ${o.trialDays}-day free trial` : ''
    const billedNote = !has ? null : o.months > 1
      ? `Billed ${formatMoney(total, currency)} ${BILLED_EVERY[o.id]}${trial}, cancel any time. Keep every export you made.`
      : `Billed ${BILLED_EVERY[o.id]}${trial}, cancel any time. Keep every export you made.`
    return {
      id: o.id,
      label: o.label,
      months: o.months,
      checkoutPlan: o.checkoutPlan,
      trialDays: o.trialDays || 0,
      total: has ? total : null,
      amountLabel: has ? formatMoney(perMonth(total, o.months), currency) : null,
      totalLabel: has ? formatMoney(total, currency) : null,
      saving,
      savingLabel: saving > 0 ? `${saving}% off` : '',
      billedNote,
    }
  })
  return { offers, priceServiceDown: loaded && offers.every((o) => o.amountLabel === null) }
}

/**
 * Which cadence a live subscription is on, or null when the record cannot say.
 *
 * The subscription document carries Stripe's `recurring.interval` (see
 * api/_lib/billing.js subscriptionDocFields). A quarterly price is
 * `interval: 'month'` with `interval_count: 3`, stored as `intervalCount`.
 * A `month` record with no stored count could be monthly or quarterly, so it
 * returns null: such a subscription says when it renews and not how often.
 * `interval_count` and an explicit `billingInterval` ('monthly' | 'quarterly'
 * | 'yearly') are read too.
 */
export function subscriptionCadence(sub) {
  if (!sub) return null
  if (['monthly', 'quarterly', 'yearly'].includes(sub.billingInterval)) return sub.billingInterval
  // A record that already spells the cadence out (checkout-status reports
  // `interval` as the checkout's own 'monthly' | 'quarterly' | 'yearly').
  if (['monthly', 'quarterly', 'yearly'].includes(sub.interval)) return sub.interval
  if (sub.interval === 'year') return 'yearly'
  if (sub.interval === 'month') {
    const count = Number(sub.intervalCount ?? sub.interval_count)
    if (count === 3) return 'quarterly'
    if (count === 1) return 'monthly'
    return null
  }
  return null
}

export const CADENCE_LABEL = Object.freeze({
  monthly: `Billed ${BILLED_EVERY.monthly}`,
  quarterly: `Billed ${BILLED_EVERY.quarterly}`,
  yearly: `Billed ${BILLED_EVERY.yearly}`,
})
