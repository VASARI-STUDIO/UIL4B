// Shared multi-currency pricing config for the UIL4B Pro subscription.
//
// Only two-decimal currencies are supported — the ×100 minor-unit maths below
// assumes two decimal places (so zero-decimal currencies like JPY/KRW are
// intentionally excluded).

export const SUPPORTED_CURRENCIES = [
  { code: 'usd', label: 'US Dollar', symbol: '$' },
  { code: 'eur', label: 'Euro', symbol: '€' },
  { code: 'gbp', label: 'British Pound', symbol: '£' },
  { code: 'aud', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'nzd', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'cad', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'sgd', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'chf', label: 'Swiss Franc', symbol: 'Fr' },
]

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map(c => c.code)

// The price object's primary currency. Every Price carries this amount via
// unit_amount; all other currencies are attached as currency_options.
export const BASE_CURRENCY = 'usd'

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  THESE ARE DISPLAY FALLBACKS. THEY ARE NOT WHAT STRIPE CHARGES.
//
//     What a customer is actually billed comes from the live Stripe price
//     resolved via PRICE_ENV_KEYS / LOOKUP_KEYS below. Those prices are created
//     and edited in the Stripe dashboard and do not exist in
//     this repository. Editing this table changes the number a visitor is
//     SHOWN when /api/get-prices cannot answer. It changes no charge.
//
//     Keeping them in step is manual: change the Stripe price (dashboard or
//     the admin Stripe panel) and this table in the same release.
// ─────────────────────────────────────────────────────────────────────────────
//
// USD is $7 monthly · $48 yearly. src/config/planLadder.js carries the same
// USD ladder as `approvedTotal` for the client, and
// tests/unit/price-ladder.test.js fails the build if the two ever drift.
//
// Non-USD amounts are DERIVED, not invented, from each interval's
// per-currency multiplier and rounded to whole units to match the USD ladder's
// whole-number convention.
//
// Pro is sold as a subscription only. There is no one-off price: every entry
// below is a recurring interval.
//
// Still editable from the admin Stripe panel — these are only the defaults
// shown before anything is saved to Stripe.
export const DEFAULT_PRICES = {
  monthly:   { usd: 7,  eur: 7,  gbp: 6,  aud: 11, nzd: 13,  cad: 10, sgd: 10, chf: 7 },
  yearly:    { usd: 48, eur: 48, gbp: 42, aud: 96, nzd: 108, cad: 72, sgd: 72, chf: 48 },
}

export const LOOKUP_KEYS = {
  monthly: 'uil4b_pro_monthly',
  yearly: 'uil4b_pro_yearly',
}

// Stripe’s `recurring.interval`. Stripe also needs `recurring.interval_count`
// (INTERVAL_COUNTS below); setup-stripe.js sends it for every recurring interval.
export const INTERVAL_MAP = { monthly: 'month', yearly: 'year' }
export const INTERVAL_COUNTS = Object.freeze({ monthly: 1, yearly: 1 })

/**
 * Whether a Stripe price may be sold for a billing interval: it must be active
 * and recurring on the interval's unit AND count. Only Monthly and Yearly are
 * on sale; a three-month price shares the 'month' unit, so the count is what
 * keeps it from being sold as Monthly. (A three-month subscription is still
 * recognised when it already exists.) A one-off (non-recurring) price is never
 * sellable. The price list and checkout both apply this one check, so the price
 * a visitor is shown and the price a checkout charges are chosen by the same
 * rule.
 *
 * The price's product must be active too: an active price on an archived product
 * is rejected by Stripe at session create. The caller has to EXPAND the product
 * (`expand: ['product']` on a retrieve, `['data.product']` on a list); a product
 * that is still a bare id, missing or deleted cannot be checked, so the price is
 * refused rather than guessed at.
 */
export function priceIsSellable(price, interval) {
  if (!price?.active) return false
  const product = price.product
  if (!product || typeof product !== 'object' || product.active !== true) return false
  return !!INTERVAL_MAP[interval]
    && price.recurring?.interval === INTERVAL_MAP[interval]
    && price.recurring?.interval_count === INTERVAL_COUNTS[interval]
}

export const PRICE_ENV_KEYS = {
  monthly: 'STRIPE_PRICE_MONTHLY',
  yearly: 'STRIPE_PRICE_YEARLY',
}

// HOW LONG A CADENCE IS FREE BEFORE THE FIRST CHARGE, and the only place that
// answer is written on the server. api/create-checkout.js read `isYearly` and
// hard-coded 7, which meant the promise a customer was shown on the checkout
// page and the promise Stripe actually honoured were two separate literals in
// two files with nothing holding them together.
//
// The trial is earned by the cadence: monthly bills today, yearly gets seven
// days.
//
// src/config/planLadder.js carries the same numbers for the UI, and
// tests/unit/trial-cadence.test.js fails if the two ever disagree. A CTA that
// promises a trial the server will not grant is the worst version of this bug
// because it only surfaces on the card statement.
export const TRIAL_DAYS = Object.freeze({
  monthly: 0,
  yearly: 7,
})

/** Days of trial for a billing interval, 0 for anything unrecognised. */
export function trialDaysFor(interval) {
  return TRIAL_DAYS[interval] ?? 0
}

// The intervals that may be SOLD today. This is the allowlist
// api/_lib/billing.js#parseBillingInterval enforces on /api/create-checkout, the
// loop /api/get-prices publishes, and the loop /api/setup-stripe creates Stripe
// prices from — so adding a key here is a decision to sell that interval.
//
// Every table in this file that is keyed by interval holds exactly these keys,
// and tests/unit/billing-intervals-drift.test.js pins that. A subscription
// already billing on a retired interval keeps Pro: entitlement follows the
// subscription's status (plans.js), not this list.
//
// `interval_count` (INTERVAL_COUNTS) is sent for every recurring price, so a
// multi-month interval can never be created as a monthly one.
//
// The Stripe price itself is created in the DASHBOARD and is not in this
// repository. Until it exists, resolvePrice returns null and create-checkout
// answers 503 rather than charging anyone anything.
export const BILLING_INTERVALS = Object.freeze(['monthly', 'yearly'])

export function toCents(amount) { return Math.round(Number(amount) * 100) }
export function fromCents(cents) { return Math.round(Number(cents)) / 100 }
