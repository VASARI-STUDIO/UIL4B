import { loadStripe } from '@stripe/stripe-js'

// Stripe publishable key (client-side, not secret). Set in Vercel as
// VITE_STRIPE_PUBLISHABLE_KEY (must be VITE_-prefixed to reach the browser).
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

// loadStripe is memoised so the SDK is only fetched once per page load.
let stripePromise = null

export function getStripe() {
  if (!PUBLISHABLE_KEY) return null
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY)
  return stripePromise
}

export const hasStripeKey = !!PUBLISHABLE_KEY
