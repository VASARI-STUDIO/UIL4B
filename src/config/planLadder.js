// The ONE client-side description of the Pro plan ladder: which intervals we
// offer, what each one costs per month, and which of them can actually reach
// checkout. Every surface that quotes a plan price imports from here.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE AMOUNTS BELOW ARE DISPLAY FALLBACKS. THEY ARE NOT WHAT STRIPE CHARGES.
//
//     `approvedTotal` below is the approved ladder: $7 monthly · $18
//     quarterly · $48 yearly.
//
// api/_lib/pricing.js holds the same USD fallbacks; tests/unit/price-ladder.test.js fails if they differ.
//
//     Both files hold DISPLAY fallbacks. The amounts Stripe charges live in
//     Stripe price objects (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY, or the
//     lookup keys), which are configured in the Stripe dashboard, not in this
//     repository. The ladder below is the part a reader needs and it is all
//     here.
//
//     Consequences, by design rather than by accident:
//       1. Live prices WIN. When /api/get-prices returns an amount for an
//          interval, that amount is displayed — we never advertise a number we
//          do not charge. `approvedTotal` is only the pre-settle fallback.
//       2. A tier with no `checkoutPlan` is NOT rendered by the upgrade modal.
//       3. The "from $X/month" headline is COMPUTED from whatever is actually
//          renderable, never typed. If the ladder changes, the headline follows.
// ─────────────────────────────────────────────────────────────────────────────

// Extension is explicit so plain Node ESM can load this module too — that is
// what lets tests/unit/price-ladder.test.js import the REAL ladder rather than
// regex-scraping this file's source. Vite resolves it identically.
import { PRICE_SYMBOLS } from '../utils/currency.js'

// `trialDays` MIRRORS api/_lib/pricing.js#TRIAL_DAYS, which is what Stripe is
// actually told. Saying "start your free trial" over a plan that bills
// immediately would be exactly the manufactured promise this ladder must
// avoid, so the CTA reads the flag — and a flag that disagrees with the
// server is the same lie with an extra step, which is why
// tests/unit/trial-cadence.test.js compares the two tables.
//
// THE TRIAL IS EARNED BY THE CADENCE. Monthly bills today
// and says so; quarterly and yearly each get seven days. Yearly granted 7
// before this change and grants 7 after it, so no promise already made moved.
export const PLAN_LADDER = Object.freeze([
  Object.freeze({
    id: 'monthly',
    label: 'Monthly',
    cadence: 'billed monthly',
    months: 1,
    liveKey: 'monthly',
    checkoutPlan: 'monthly',
    approvedTotal: 7,
    trialDays: 0,
  }),
  Object.freeze({
    id: 'quarterly',
    label: 'Quarterly',
    cadence: 'billed every 3 months',
    months: 3,
    liveKey: 'quarterly',
    // Quarterly is buyable. It relies on BILLING_INTERVALS, PRICE_ENV_KEYS,
    // the Checkout.jsx case, useProPrice.quarterlyTotal, the trial, and
    // `interval_count` in setup-stripe. The Stripe price has the lookup key
    // `uil4b_pro_quarterly` and recurs { interval: 'month', interval_count: 3 },
    // so it bills once a quarter. /api/get-prices resolves it the same way
    // create-checkout does. Pro is granted by subscription status, not price id
    // (api/_lib/plans.js planForSubscription), so a quarterly subscriber gets
    // Pro exactly as a monthly or yearly one does.
    // tests/unit/price-ladder.test.js keeps the preconditions pinned.
    checkoutPlan: 'quarterly',
    approvedTotal: 18,
    trialDays: 7,
  }),
  Object.freeze({
    id: 'yearly',
    label: 'Yearly',
    cadence: 'billed once a year',
    months: 12,
    liveKey: 'yearly',
    checkoutPlan: 'yearly',
    approvedTotal: 48,
    trialDays: 7,
    best: true,
  }),
])

// Display currency for the `approvedTotal` fallbacks. The ladder was approved in
// USD; api/_lib/pricing.js also has BASE_CURRENCY = 'usd'.
export const APPROVED_CURRENCY = 'usd'

// Money for reading, not for arithmetic. `formatCurrency` in utils/currency.js
// always renders two decimals, which is right on an invoice and wrong on a
// 44px headline number — "$4.00/month" makes the eye check the cents. Whole
// amounts lose the cents here; anything with real cents keeps them.
export function formatMoney(amount, currency = APPROVED_CURRENCY) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null
  const symbol = PRICE_SYMBOLS[currency] || `${currency.toUpperCase()} `
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.005
  return `${symbol}${isWhole ? Math.round(amount) : amount.toFixed(2)}`
}

// Round a per-month figure the way a human would read it: $48/12 is exactly $4,
// but $39.99/12 is $3.3325 and must not be shown as "$3.33" one render and
// "$3.34" the next. One rule, applied once.
function perMonthOf(total, months) {
  if (typeof total !== 'number' || !months) return null
  return Math.round((total / months) * 100) / 100
}

// Resolve the ladder against whatever the live price service returned.
//
// `prices` is the raw payload from usePrices() — { monthly: { usd: 4.99 }, … } —
// NOT the pre-formatted useProPrice() view, because per-month arithmetic needs
// numbers. `settled` is that hook's flag; until it flips we are still loading
// and callers should hold a skeleton rather than flash the fallback.
export function resolvePlanLadder({ prices, currency = APPROVED_CURRENCY } = {}) {
  return PLAN_LADDER.map((plan) => {
    const live = prices?.[plan.liveKey]?.[currency]
    const isLive = typeof live === 'number' && Number.isFinite(live)
    const total = isLive ? live : plan.approvedTotal
    const planCurrency = isLive ? currency : APPROVED_CURRENCY
    const perMonth = perMonthOf(total, plan.months)
    return {
      ...plan,
      total,
      perMonth,
      currency: planCurrency,
      // True when this amount came from the price service, i.e. it is the amount
      // Stripe will charge. False means we are quoting the approved ladder.
      isLive,
      // Renderable at all: something has to accept the click.
      purchasable: !!plan.checkoutPlan,
      perMonthLabel: formatMoney(perMonth, planCurrency),
      totalLabel: formatMoney(total, planCurrency),
    }
  })
}

// Only the tiers a user can actually buy today.
export function purchasablePlans(resolved) {
  return resolved.filter((p) => p.purchasable)
}

// The honest headline: the cheapest per-month figure among the tiers we will
// actually sell. Never typed into copy.
export function cheapestPerMonth(resolved) {
  const candidates = purchasablePlans(resolved).filter((p) => typeof p.perMonth === 'number')
  if (!candidates.length) return null
  return candidates.reduce((low, p) => (p.perMonth < low.perMonth ? p : low), candidates[0])
}

// "Save 43%" against the monthly rate. Returns 0 rather than a negative or a
// rounding-noise 1% — a badge that says "save 1%" is worse than no badge.
export function savingsVsMonthly(plan, resolved) {
  const monthly = resolved.find((p) => p.id === 'monthly')
  if (!monthly?.perMonth || !plan?.perMonth || plan.id === 'monthly') return 0
  const pct = Math.round((1 - plan.perMonth / monthly.perMonth) * 100)
  return pct >= 5 ? pct : 0
}
