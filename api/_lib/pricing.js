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
}

export const LOOKUP_KEYS = { monthly: 'uil4b_pro_monthly', yearly: 'uil4b_pro_yearly' }
export const INTERVAL_MAP = { monthly: 'month', yearly: 'year' }

export function toCents(amount) { return Math.round(Number(amount) * 100) }
export function fromCents(cents) { return Math.round(Number(cents)) / 100 }
