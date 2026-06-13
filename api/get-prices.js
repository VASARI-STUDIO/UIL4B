import { getStripeServer } from './_lib/stripe.js'
import { LOOKUP_KEYS, DEFAULT_PRICES, fromCents } from './_lib/pricing.js'

// Module-level cache with 5-minute TTL so we don't hit Stripe on every page load.
let cached = null
let cachedAt = 0
const TTL_MS = 5 * 60 * 1000

async function fetchPrices() {
  const now = Date.now()
  if (cached && now - cachedAt < TTL_MS) return cached

  try {
    const stripe = getStripeServer()
    const result = {}

    for (const [interval, lk] of Object.entries(LOOKUP_KEYS)) {
      const found = await stripe.prices.list({
        lookup_keys: [lk], active: true, limit: 1, expand: ['data.currency_options'],
      })
      if (!found.data.length) { result[interval] = null; continue }
      const p = found.data[0]
      const currencies = { [p.currency]: fromCents(p.unit_amount) }
      for (const [cur, opt] of Object.entries(p.currency_options || {})) {
        currencies[cur] = fromCents(opt.unit_amount)
      }
      result[interval] = currencies
    }

    // Only cache if we got at least one interval back from Stripe.
    if (result.monthly || result.yearly) {
      cached = result
      cachedAt = now
    }

    return result
  } catch {
    // Stripe not configured or network error — fall through to defaults.
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const prices = await fetchPrices()

    // Fall back to defaults if Stripe returned nothing or threw.
    const monthly = prices?.monthly ?? DEFAULT_PRICES.monthly
    const yearly = prices?.yearly ?? DEFAULT_PRICES.yearly

    return res.status(200).json({ monthly, yearly })
  } catch (err) {
    console.error('get-prices failed:', err)
    return res.status(200).json({
      monthly: DEFAULT_PRICES.monthly,
      yearly: DEFAULT_PRICES.yearly,
    })
  }
}
