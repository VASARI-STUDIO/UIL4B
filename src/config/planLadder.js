// The ONE client-side description of the Pro plan ladder: which intervals we
// offer, what each one costs per month, and which of them can actually reach
// checkout. Every surface that quotes a plan price imports from here.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  FLAG FOR THE FOUNDER — these display amounts are still NOT the amounts
//     Stripe will charge.
//
//     `approvedTotal` below is the ladder recorded in
//     docs/reference/design-language-v2.md ("Deviations from the mock",
//     founder-approved 2026-08-16) and re-approved as decision 2 of
//     2026-08-20, recorded in CHANGELOG.md: $7 monthly · $18 quarterly ·
//     $48 yearly.
//
//     SETTLED 2026-08-20: api/_lib/pricing.js used to disagree with this file —
//     its DEFAULT_PRICES read monthly.usd 4.99 and yearly.usd 39.99 with no
//     quarterly interval at all, so the same visitor could be shown either
//     number. Its USD fallbacks are now this ladder, and quarterly has its
//     DEFAULT_PRICES row, LOOKUP_KEYS entry and INTERVAL_MAP entry.
//     tests/unit/price-ladder.test.js fails the build if they drift again.
//
//     STILL OPEN, and the reason this flag stays: both files hold DISPLAY
//     fallbacks. The amounts Stripe charges live in Stripe price objects
//     (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY, or the lookup keys), which
//     are founder-configured in the dashboard and are not in this repository.
//     Creating/confirming $7/$18/$48 there — a RISE on yearly, $39.99 → $48 —
//     is tracked in docs/OWNER-ACTIONS.md.
//
//     Consequences, by design rather than by accident:
//       1. Live prices WIN. When /api/get-prices returns an amount for an
//          interval, that amount is displayed — we never advertise a number we
//          do not charge. `approvedTotal` is only the pre-settle fallback.
//       2. A tier with no `checkoutPlan` is NOT rendered by the upgrade modal.
//          src/pages/Checkout.jsx only accepts plan=monthly|yearly|lifetime, so
//          offering quarterly today would dead-end on "Invalid selection".
//          Quarterly stays defined here so it lights up the moment a founder
//          adds the Stripe price and the Checkout entry — nothing else changes.
//       3. The "from $X/month" headline is COMPUTED from whatever is actually
//          renderable, never typed. If the ladder changes, the headline follows.
// ─────────────────────────────────────────────────────────────────────────────

// Extension is explicit so plain Node ESM can load this module too — that is
// what lets tests/unit/price-ladder.test.js import the REAL ladder rather than
// regex-scraping this file's source. Vite resolves it identically.
import { PRICE_SYMBOLS } from '../utils/currency.js'

// `trialDays` mirrors src/pages/Checkout.jsx, which grants the 7-day trial on
// the YEARLY plan only. Saying "start your free trial" over a monthly plan that
// bills immediately would be exactly the manufactured promise
// docs/reference/growth-persuasion.md forbids, so the CTA reads the flag.
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
    // No Stripe price and no Checkout.jsx entry — see the flag above.
    checkoutPlan: null,
    approvedTotal: 18,
    trialDays: 0,
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
