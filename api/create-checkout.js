import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import { CURRENCY_CODES } from './_lib/pricing.js'

const LOOKUP_KEYS = { monthly: 'uil4b_pro_monthly', yearly: 'uil4b_pro_yearly' }

let priceCache = {}

async function resolvePrice(stripe, interval) {
  const key = interval === 'yearly' ? 'yearly' : 'monthly'
  const envPrice = key === 'yearly' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY
  if (envPrice) return envPrice
  if (priceCache[key]) return priceCache[key]
  const found = await stripe.prices.list({ lookup_keys: [LOOKUP_KEYS[key]], active: true, limit: 1 })
  if (!found.data.length) return null
  priceCache[key] = found.data[0].id
  return found.data[0].id
}

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

  const cred = credentialProblem()
  if (cred) {
    return res.status(500).json({ error: `Server configuration issue: ${cred}` })
  }

  let uid
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch (e) {
    return res.status(401).json({ error: e?.code === 'auth/id-token-expired' ? 'Session expired — please sign in again' : 'Invalid auth token' })
  }

  try {
    const stripe = getStripeServer()

    const { interval, currency } = req.body || {}
    const isYearly = interval === 'yearly'
    const wantCurrency = typeof currency === 'string' && CURRENCY_CODES.includes(currency.toLowerCase())
      ? currency.toLowerCase()
      : null
    const priceId = await resolvePrice(stripe, interval)
    if (!priceId) {
      return res.status(500).json({ error: 'Stripe prices not found. Visit /admin and run Setup Stripe, or set STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY in Vercel.' })
    }

    const userDoc = await adminDb().collection('users').doc(uid).get()
    let customerId = userDoc.exists ? userDoc.data()?.stripeCustomerId : null

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { firebaseUid: uid },
      })
      customerId = customer.id
      await adminDb().collection('users').doc(uid).set(
        { stripeCustomerId: customerId },
        { merge: true }
      )
    }

    const ALLOWED_ORIGINS = ['https://uil4b.vercel.app', 'https://uil4b.com', 'https://www.uil4b.com', 'http://localhost:5173']
    const rawOrigin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '')
    const origin = ALLOWED_ORIGINS.find(o => rawOrigin?.startsWith(o)) || 'https://uil4b.vercel.app'

    const subscriptionData = { metadata: { firebaseUid: uid } }
    if (isYearly) {
      subscriptionData.trial_period_days = 7
      subscriptionData.trial_settings = {
        end_behavior: { missing_payment_method: 'cancel' },
      }
    }

    const sessionParams = {
      // Stripe renamed the embedded Checkout ui_mode: 'embedded' is rejected by
      // the live API ("no longer supported. Use 'embedded_page' instead."). The
      // client still consumes the same client_secret via <EmbeddedCheckout>.
      ui_mode: 'embedded_page',
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      subscription_data: subscriptionData,
    }
    // Present the customer's local currency (the price carries currency_options
    // for each supported currency). Falls back gracefully if a returning
    // customer already has a locked currency from a prior subscription.
    if (wantCurrency) sessionParams.currency = wantCurrency

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (e) {
      if (wantCurrency) {
        delete sessionParams.currency
        session = await stripe.checkout.sessions.create(sessionParams)
      } else {
        throw e
      }
    }

    return res.status(200).json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('create-checkout failed:', err)
    return res.status(500).json({ error: err?.message || 'Could not create checkout session' })
  }
}
