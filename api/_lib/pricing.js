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
//     and edited in the Stripe dashboard by the founder and do not exist in
//     this repository. Editing this table changes the number a visitor is
//     SHOWN when /api/get-prices cannot answer. It changes no charge.
//
//     Making the charge match the display is an open owner action — see
//     docs/OWNER-ACTIONS.md. Note that yearly is a RISE from the previous
//     $39.99 default to $48.
// ─────────────────────────────────────────────────────────────────────────────
//
// USD follows the founder-approved ladder — $7 monthly · $18 quarterly ·
// $48 yearly — recorded as decision 2 in
// docs/build-plan/founder-batch-2026-08-20.md (2026-08-20), which supersedes
// the old $4.99 / $39.99 defaults. src/config/planLadder.js carries the same
// USD ladder as `approvedTotal` for the client, and
// tests/unit/price-ladder.test.js fails the build if the two ever drift again.
//
// Non-USD amounts are DERIVED, not invented. Each interval keeps the
// per-currency multiplier its own previous defaults already implied
// (old amount ÷ old USD amount); quarterly, which had no row at all, takes the
// midpoint of the monthly and yearly multipliers. Results are rounded to whole
// units to match the USD ladder's whole-number convention. The old "everything
// ends in .99" rule now applies to `lifetime` only, whose separately
// founder-approved one-off amounts this ladder does not touch.
//
// Still editable from the admin Stripe panel — these are only the defaults
// shown before anything is saved to Stripe.
export const DEFAULT_PRICES = {
  monthly:   { usd: 7,  eur: 7,  gbp: 6,  aud: 11, nzd: 13,  cad: 10, sgd: 10, chf: 7 },
  quarterly: { usd: 18, eur: 18, gbp: 15, aud: 32, nzd: 36,  cad: 26, sgd: 26, chf: 18 },
  yearly:    { usd: 48, eur: 48, gbp: 42, aud: 96, nzd: 108, cad: 72, sgd: 72, chf: 48 },
  // Founder-approved canonical one-off amounts. SGD/CHF intentionally stay
  // unavailable until an owner approves canonical values for those currencies.
  lifetime: { usd: 89.99, eur: 84.99, gbp: 74.99, aud: 129, nzd: 139.99, cad: 119.99 },
}

export const LOOKUP_KEYS = {
  monthly: 'uil4b_pro_monthly',
  quarterly: 'uil4b_pro_quarterly',
  yearly: 'uil4b_pro_yearly',
  lifetime: 'uil4b_pro_lifetime',
}

// Stripe's `recurring.interval`. Quarterly is a three-MONTH recurrence, so
// 'month' is only half of its definition — Stripe also needs
// `recurring.interval_count: 3` (INTERVAL_COUNTS, below), which
// api/setup-stripe.js does not currently send. Creating a quarterly price
// without it would produce an $18-per-MONTH subscription. That is one of the
// reasons quarterly is deliberately absent from BILLING_INTERVALS.
export const INTERVAL_MAP = { monthly: 'month', quarterly: 'month', yearly: 'year' }
export const INTERVAL_COUNTS = Object.freeze({ monthly: 1, quarterly: 3, yearly: 1 })

export const PRICE_ENV_KEYS = {
  monthly: 'STRIPE_PRICE_MONTHLY',
  quarterly: 'STRIPE_PRICE_QUARTERLY',
  yearly: 'STRIPE_PRICE_YEARLY',
  lifetime: 'STRIPE_PRICE_LIFETIME',
}

// HOW LONG A CADENCE IS FREE BEFORE THE FIRST CHARGE, and the only place that
// answer is written on the server. api/create-checkout.js read `isYearly` and
// hard-coded 7, which meant the promise a customer was shown on the checkout
// page and the promise Stripe actually honoured were two separate literals in
// two files with nothing holding them together.
//
// Founder, 2026-09-15: the trial is EARNED BY THE CADENCE. Monthly bills
// today and says so; quarterly and yearly each get seven days. That is the
// friction his own conversion note argues for — a card is taken either way,
// so the trial filters for intent — while the free tier stays the
// no-commitment way in.
//
// src/config/planLadder.js carries the same numbers for the UI, and
// tests/unit/trial-cadence.test.js fails if the two ever disagree. A CTA that
// promises a trial the server will not grant is the worst version of this bug
// because it only surfaces on the card statement.
export const TRIAL_DAYS = Object.freeze({
  monthly: 0,
  quarterly: 7,
  yearly: 7,
  lifetime: 0,
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
// QUARTERLY WAS SWITCHED ON 2026-09-15, on the founder's instruction and with
// his explicit approval for the gated payment files. The four things this
// comment used to list as missing were done in that one commit, in this order,
// because the third one is a way to charge somebody wrongly:
//
//   1. PRICE_ENV_KEYS.quarterly            above
//   2. src/pages/Checkout.jsx case         so the CTA has somewhere to go
//   3. `interval_count` in setup-stripe.js  THE ONE THAT MATTERS. Stripe reads
//      `recurring.interval` alone as a MONTHLY price. Creating quarterly
//      without `interval_count: 3` produces an $18-per-month subscription —
//      three times the intended charge, on a real card, and only visible on a
//      statement. The count was already sitting in INTERVAL_COUNTS above,
//      unused, which is exactly how that bug would have shipped.
//   4. this list
//
// The Stripe price itself is created in the DASHBOARD and is not in this
// repository. Until it exists, resolvePrice returns null and create-checkout
// answers 503 with "the quarterly price is temporarily unavailable" rather
// than charging anyone anything — see docs/OWNER-ACTIONS.md for the test-mode
// steps the founder asked to run first.
export const BILLING_INTERVALS = Object.freeze(['monthly', 'quarterly', 'yearly', 'lifetime'])
export const LIFETIME_CURRENCY_CODES = Object.freeze(Object.keys(DEFAULT_PRICES.lifetime))

export function toCents(amount) { return Math.round(Number(amount) * 100) }
export function fromCents(cents) { return Math.round(Number(cents)) / 100 }
