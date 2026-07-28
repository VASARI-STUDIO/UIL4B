// Shared multi-currency pricing config for the UIL4B Pro subscription.
//
// Only two-decimal currencies are supported — the .99 convention and the
// ×100 minor-unit maths below assume two decimal places (so zero-decimal
// currencies like JPY/KRW are intentionally excluded).

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

// Starting amounts (major units, all ending in .99), tuned roughly per economy.
// Fully editable from the admin Stripe panel — these are only the defaults
// shown before anything is saved to Stripe.
export const DEFAULT_PRICES = {
  monthly: { usd: 4.99, eur: 4.99, gbp: 3.99, aud: 7.99, nzd: 8.99, cad: 6.99, sgd: 6.99, chf: 4.99 },
  yearly:  { usd: 39.99, eur: 39.99, gbp: 34.99, aud: 79.99, nzd: 89.99, cad: 59.99, sgd: 59.99, chf: 39.99 },
  // Founder-approved canonical one-off amounts. SGD/CHF intentionally stay
  // unavailable until an owner approves canonical values for those currencies.
  lifetime: { usd: 89.99, eur: 84.99, gbp: 74.99, aud: 129, nzd: 139.99, cad: 119.99 },
}

export const LOOKUP_KEYS = {
  monthly: 'uil4b_pro_monthly',
  yearly: 'uil4b_pro_yearly',
  lifetime: 'uil4b_pro_lifetime',
}
export const INTERVAL_MAP = { monthly: 'month', yearly: 'year' }
export const PRICE_ENV_KEYS = {
  monthly: 'STRIPE_PRICE_MONTHLY',
  yearly: 'STRIPE_PRICE_YEARLY',
  lifetime: 'STRIPE_PRICE_LIFETIME',
}
export const BILLING_INTERVALS = Object.freeze(['monthly', 'yearly', 'lifetime'])
export const LIFETIME_CURRENCY_CODES = Object.freeze(Object.keys(DEFAULT_PRICES.lifetime))

export function toCents(amount) { return Math.round(Number(amount) * 100) }
export function fromCents(cents) { return Math.round(Number(cents)) / 100 }
