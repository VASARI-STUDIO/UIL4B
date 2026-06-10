/**
 * One-time Stripe setup for the UIL4B Pro subscription.
 *
 * Creates (or reuses) a single "UIL4B Pro" product with two recurring prices:
 *   • Monthly — $4.99 AUD / month
 *   • Yearly  — $39.99 AUD / year (7-day free trial applied at checkout)
 *
 * The script is idempotent: prices are looked up by their `lookup_key`, so
 * re-running it will reuse existing prices instead of creating duplicates.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe.js
 *   # or for test mode:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.js
 *
 * After it runs, copy the printed price IDs into your Vercel env vars:
 *   STRIPE_PRICE_MONTHLY=price_...
 *   STRIPE_PRICE_YEARLY=price_...
 */
import Stripe from 'stripe'

const SECRET = process.env.STRIPE_SECRET_KEY
if (!SECRET) {
  console.error('✗ STRIPE_SECRET_KEY is required.\n  Run: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe.js')
  process.exit(1)
}

const stripe = new Stripe(SECRET)
const mode = SECRET.startsWith('sk_live') ? 'LIVE' : 'TEST'

const CURRENCY = 'aud'
const PRODUCT_NAME = 'UIL4B Pro'
const PRODUCT_DESCRIPTION =
  '1,000 AI generations per day, higher-quality models, cross-device project sync, and advanced design-system exports.'

const PRICES = [
  { lookup_key: 'uil4b_pro_monthly', label: 'Monthly', amount: 499, interval: 'month' },
  { lookup_key: 'uil4b_pro_yearly', label: 'Yearly', amount: 3999, interval: 'year' },
]

async function findOrCreateProduct() {
  // Reuse an existing product with the same name if one is present.
  const existing = await stripe.products.list({ active: true, limit: 100 })
  const match = existing.data.find(p => p.name === PRODUCT_NAME)
  if (match) {
    console.log(`• Reusing product: ${match.id} (${PRODUCT_NAME})`)
    return match
  }
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
  })
  console.log(`✓ Created product: ${product.id} (${PRODUCT_NAME})`)
  return product
}

async function findOrCreatePrice(product, spec) {
  // Look up an existing price by its lookup_key first (idempotency).
  const existing = await stripe.prices.list({
    lookup_keys: [spec.lookup_key],
    active: true,
    limit: 1,
  })
  if (existing.data.length) {
    const price = existing.data[0]
    console.log(`• Reusing ${spec.label} price: ${price.id}`)
    return price
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: spec.amount,
    recurring: { interval: spec.interval },
    lookup_key: spec.lookup_key,
    nickname: `${PRODUCT_NAME} ${spec.label}`,
  })
  console.log(`✓ Created ${spec.label} price: ${price.id} ($${(spec.amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}/${spec.interval})`)
  return price
}

async function main() {
  console.log(`\nStripe setup — ${mode} mode\n${'─'.repeat(32)}`)
  const product = await findOrCreateProduct()

  const results = {}
  for (const spec of PRICES) {
    const price = await findOrCreatePrice(product, spec)
    results[spec.interval] = price.id
  }

  console.log(`\n${'─'.repeat(32)}\nAdd these to your Vercel environment variables:\n`)
  console.log(`STRIPE_PRICE_MONTHLY=${results.month}`)
  console.log(`STRIPE_PRICE_YEARLY=${results.year}`)
  console.log(`\nThe 7-day free trial for yearly plans is applied automatically`)
  console.log(`at checkout (see api/create-checkout.js) — no Stripe config needed.\n`)
}

main().catch(err => {
  console.error('\n✗ Setup failed:', err.message)
  process.exit(1)
})
