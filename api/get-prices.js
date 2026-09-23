import { getStripeServer } from './_lib/stripe.js'
import { allowedOrigins } from './_lib/origins.js'
import {
  BILLING_INTERVALS,
  CURRENCY_CODES,
  DEFAULT_PRICES,
  LOOKUP_KEYS,
  PRICE_ENV_KEYS,
  fromCents,
} from './_lib/pricing.js'

let cached = null
let cachedAt = 0
const TTL_MS = 5 * 60 * 1000

function priceMatchesInterval(price, interval) {
  if (!price?.active) return false
  if (interval === 'lifetime') return !price.recurring
  return price.recurring?.interval === (interval === 'yearly' ? 'year' : 'month')
}

async function resolveLivePrice(stripe, interval) {
  const envId = process.env[PRICE_ENV_KEYS[interval]]
  if (envId) {
    try {
      const price = await stripe.prices.retrieve(envId, { expand: ['currency_options'] })
      if (priceMatchesInterval(price, interval)) return price
    } catch (err) {
      // Falling through to the lookup key is correct, but doing it in silence is
      // not: a STRIPE_PRICE_* env var pointing at a deleted or wrong-account
      // price would look identical to the var not being set at all.
      console.warn('get-prices: the configured price id could not be read — falling back to the lookup key', {
        interval, envKey: PRICE_ENV_KEYS[interval], error: err?.message, type: err?.type,
      })
    }
  }
  const found = await stripe.prices.list({
    lookup_keys: [LOOKUP_KEYS[interval]],
    active: true,
    limit: 1,
    expand: ['data.currency_options'],
  })
  const price = found.data[0]
  return priceMatchesInterval(price, interval) ? price : null
}

function currencyMap(price) {
  if (!price) return null
  const result = { [price.currency]: fromCents(price.unit_amount) }
  for (const [currency, option] of Object.entries(price.currency_options || {})) {
    if (option?.unit_amount != null) result[currency] = fromCents(option.unit_amount)
  }
  return result
}

function responseFromLive(live = {}) {
  const response = {
    availability: {},
    currencyAvailability: {},
    source: {},
  }
  for (const interval of BILLING_INTERVALS) {
    const map = live[interval] || null
    response[interval] = map || DEFAULT_PRICES[interval]
    response.availability[interval] = !!map
    response.source[interval] = map ? 'live' : 'fallback'
    response.currencyAvailability[interval] = Object.fromEntries(
      CURRENCY_CODES.map((currency) => [currency, !!map && map[currency] != null]),
    )
  }
  return response
}

async function fetchPrices() {
  const now = Date.now()
  if (cached && now - cachedAt < TTL_MS) return cached

  try {
    const stripe = getStripeServer()
    const live = {}
    for (const interval of BILLING_INTERVALS) {
      live[interval] = currencyMap(await resolveLivePrice(stripe, interval))
    }
    const response = responseFromLive(live)
    if (Object.values(response.availability).some(Boolean)) {
      cached = response
      cachedAt = now
    }
    return response
  } catch (err) {
    // THE ONE CATCH THAT MUST NEVER BE EMPTY. A revoked STRIPE_SECRET_KEY or a
    // Stripe outage serves the DEFAULT_PRICES table to every visitor, with
    // `source: fallback` in the JSON and — before this — nothing at all
    // server-side that anyone would ever read. The outer handler catch below
    // does log, but it is unreachable: this function never throws.
    //
    // Empty catch bodies have cost this repo twice already; the feedback queue
    // rendered a permission refusal as "No submissions yet".
    console.error('get-prices: Stripe lookup failed — serving the fallback price table to every visitor', {
      error: err?.message, type: err?.type, code: err?.code, statusCode: err?.statusCode,
    })
    return responseFromLive()
  }
}

export default async function handler(req, res) {
  // An allowlisted origin is reflected, anything else gets no CORS header at
  // all — the same allowlist and the same shape as api/support.js, which
  // records the reasoning. Nothing here is secret (these are the prices on the
  // pricing page), so `*` leaked nothing; it simply invited every page on the
  // internet to spend this route's Stripe rate limit from a visitor's browser.
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    return res.status(200).json(await fetchPrices())
  } catch (err) {
    console.error('get-prices failed:', err)
    return res.status(200).json(responseFromLive())
  }
}
