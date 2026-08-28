import { getStripeServer } from './_lib/stripe.js'
import { adminAuth, credentialProblem } from './_lib/firebase-admin.js'
// One list, shared with /api/verify-admin and /api/ai's diagnostic.
import { ADMIN_EMAILS } from './_lib/admin.js'
import {
  SUPPORTED_CURRENCIES, CURRENCY_CODES, BASE_CURRENCY, DEFAULT_PRICES,
  LOOKUP_KEYS, INTERVAL_MAP, BILLING_INTERVALS, LIFETIME_CURRENCY_CODES, toCents, fromCents,
} from './_lib/pricing.js'

const PRODUCT_NAME = 'UIL4B Pro'
const PRODUCT_DESCRIPTION =
  '1,000 AI actions per day, unlimited project and custom-icon saves, advanced colour controls, and full design JSON export.'

async function requireAdmin(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing auth token', status: 401 }
  }
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    // Require a Firebase-verified email — an unverified signup could
    // otherwise register the admin address and pass the allowlist check.
    if (!decoded.email_verified || !ADMIN_EMAILS.includes(decoded.email?.toLowerCase())) {
      return { error: 'Admin access required', status: 403 }
    }
    return { decoded }
  } catch {
    return { error: credentialProblem() || 'Invalid auth token', status: 401 }
  }
}

async function findOrCreateProduct(stripe) {
  const existing = await stripe.products.list({ active: true, limit: 100 })
  const match = existing.data.find(p => p.name === PRODUCT_NAME)
  if (match) return match
  return stripe.products.create({ name: PRODUCT_NAME, description: PRODUCT_DESCRIPTION })
}

// Reads the live price for each interval and flattens base + currency_options
// into a { currency: amount } map so the admin UI can pre-fill its fields.
async function readPrices(stripe) {
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
    result[interval] = { id: p.id, currencies }
  }
  return result
}

function validatePrices(prices) {
  for (const interval of BILLING_INTERVALS) {
    const map = prices?.[interval]
    if (!map || typeof map !== 'object') return `Missing ${interval} prices`
    if (!(BASE_CURRENCY in map)) return `${interval}: base currency (${BASE_CURRENCY.toUpperCase()}) is required`
    for (const [cur, amt] of Object.entries(map)) {
      if (!CURRENCY_CODES.includes(cur)) return `Unsupported currency: ${cur}`
      if (interval === 'lifetime' && !LIFETIME_CURRENCY_CODES.includes(cur)) return `Lifetime pricing is not approved for ${cur.toUpperCase()}`
      const n = Number(amt)
      if (!isFinite(n) || n <= 0 || n > 100000) return `${interval} ${cur.toUpperCase()}: invalid amount`
    }
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAdmin(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  try {
    const stripe = getStripeServer()

    // GET — return current prices + defaults + currency metadata for the UI.
    if (req.method === 'GET') {
      const prices = await readPrices(stripe)
      return res.status(200).json({
        prices, defaults: DEFAULT_PRICES, currencies: SUPPORTED_CURRENCIES, baseCurrency: BASE_CURRENCY,
      })
    }

    // POST — create/update the product and both prices.
    const prices = req.body?.prices || DEFAULT_PRICES
    const invalid = validatePrices(prices)
    if (invalid) return res.status(400).json({ error: invalid })

    const product = await findOrCreateProduct(stripe)
    const out = {}

    for (const interval of BILLING_INTERVALS) {
      const lk = LOOKUP_KEYS[interval]
      const amounts = prices[interval]

      // Prices are immutable in Stripe, so "editing" means creating a fresh
      // price and transferring the lookup_key onto it (checkout resolves by
      // lookup_key), then archiving the old one.
      const existing = await stripe.prices.list({ lookup_keys: [lk], active: true, limit: 1 })

      const currency_options = {}
      for (const [cur, amt] of Object.entries(amounts)) {
        if (cur === BASE_CURRENCY) continue
        currency_options[cur] = { unit_amount: toCents(amt) }
      }

      const priceParams = {
        product: product.id,
        currency: BASE_CURRENCY,
        unit_amount: toCents(amounts[BASE_CURRENCY]),
        lookup_key: lk,
        transfer_lookup_key: true,
        currency_options,
        nickname: `${PRODUCT_NAME} ${interval}`,
      }
      if (interval !== 'lifetime') priceParams.recurring = { interval: INTERVAL_MAP[interval] }
      const newPrice = await stripe.prices.create(priceParams)

      if (existing.data[0] && existing.data[0].id !== newPrice.id) {
        await stripe.prices.update(existing.data[0].id, { active: false })
      }

      out[interval] = { id: newPrice.id, currencies: amounts }
    }

    return res.status(200).json({
      ok: true,
      product: product.id,
      prices: out,
      note: 'Prices saved. Recurring and one-off checkout resolve by lookup key; lifetime stays unavailable in currencies without an approved amount.',
    })
  } catch (err) {
    console.error('setup-stripe failed:', err)
    return res.status(500).json({ error: err?.message || 'Setup failed' })
  }
}
