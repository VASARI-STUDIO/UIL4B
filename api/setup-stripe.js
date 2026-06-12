import { getStripeServer } from './_lib/stripe.js'
import { adminAuth, credentialProblem } from './_lib/firebase-admin.js'
const ADMIN_EMAILS = ['dylanjacob1100@gmail.com']

const CURRENCY = 'aud'
const PRODUCT_NAME = 'UIL4B Pro'
const PRODUCT_DESCRIPTION =
  '1,000 AI generations per day, higher-quality models, cross-device project sync, and advanced design-system exports.'

const PRICES = [
  { lookup_key: 'uil4b_pro_monthly', label: 'Monthly', amount: 499, interval: 'month' },
  { lookup_key: 'uil4b_pro_yearly', label: 'Yearly', amount: 3999, interval: 'year' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    if (!ADMIN_EMAILS.includes(decoded.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' })
    }
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid auth token' })
  }

  try {
    const stripe = getStripeServer()

    // Find or create product
    const existing = await stripe.products.list({ active: true, limit: 100 })
    let product = existing.data.find(p => p.name === PRODUCT_NAME)
    if (!product) {
      product = await stripe.products.create({
        name: PRODUCT_NAME,
        description: PRODUCT_DESCRIPTION,
      })
    }

    // Find or create prices
    const results = {}
    for (const spec of PRICES) {
      const found = await stripe.prices.list({
        lookup_keys: [spec.lookup_key],
        active: true,
        limit: 1,
      })
      if (found.data.length) {
        results[spec.interval] = { id: found.data[0].id, reused: true }
      } else {
        const price = await stripe.prices.create({
          product: product.id,
          currency: CURRENCY,
          unit_amount: spec.amount,
          recurring: { interval: spec.interval },
          lookup_key: spec.lookup_key,
          nickname: `${PRODUCT_NAME} ${spec.label}`,
        })
        results[spec.interval] = { id: price.id, reused: false }
      }
    }

    return res.status(200).json({
      ok: true,
      product: product.id,
      prices: {
        monthly: results.month,
        yearly: results.year,
      },
      note: 'Prices are auto-discovered by lookup_key at checkout — no env vars needed for price IDs.',
    })
  } catch (err) {
    console.error('setup-stripe failed:', err)
    return res.status(500).json({ error: err?.message || 'Setup failed' })
  }
}
