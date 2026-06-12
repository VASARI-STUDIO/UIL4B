// Shared lazy Stripe client for serverless functions.
//
// Constructing Stripe at module scope crashes the whole function at import
// time when STRIPE_SECRET_KEY is unset (Vercel then returns an opaque
// FUNCTION_INVOCATION_FAILED 500). Lazy init lets handlers return a clear
// JSON error instead.

import Stripe from 'stripe'

let client = null

export function getStripeServer() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Stripe is not configured: STRIPE_SECRET_KEY is not set in the server environment')
  }
  if (!client) client = new Stripe(key)
  return client
}
