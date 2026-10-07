// The `pure` entry fetches Stripe.js only when loadStripe is first called; the
// main entry fetches it as soon as this module is imported.
import { loadStripe } from '@stripe/stripe-js/pure'

// Stripe publishable key (client-side, not secret). Set in Vercel as
// VITE_STRIPE_PUBLISHABLE_KEY (must be VITE_-prefixed to reach the browser).
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

// loadStripe is memoised so the SDK is only fetched once per page load. A
// failed load is dropped, so the next call tries again.
let stripePromise = null

export function getStripe() {
  if (!PUBLISHABLE_KEY) return null
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY).catch((e) => {
      stripePromise = null
      throw e
    })
  }
  return stripePromise
}

export const hasStripeKey = !!PUBLISHABLE_KEY
