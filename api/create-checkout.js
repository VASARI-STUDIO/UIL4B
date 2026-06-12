import Stripe from 'stripe'
import { adminAuth, adminDb } from './_lib/firebase-admin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
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

  let uid
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const { interval } = req.body || {}
  const isYearly = interval === 'yearly'
  const priceId = isYearly ? PRICES.yearly : PRICES.monthly
  if (!priceId) {
    return res.status(500).json({ error: 'Stripe price not configured' })
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
  // Yearly plans include a 7-day free trial. Monthly bills immediately.
  if (isYearly) {
    subscriptionData.trial_period_days = 7
    subscriptionData.trial_settings = {
      end_behavior: { missing_payment_method: 'cancel' },
    }
  }

  // Embedded Checkout: the payment form renders inside our own /checkout page
  // (see src/pages/Checkout.jsx) rather than redirecting to a Stripe-hosted
  // page. We return the session's client_secret for the embedded component and
  // the customer returns to /checkout/return to confirm the result.
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    subscription_data: subscriptionData,
  })

  return res.status(200).json({ clientSecret: session.client_secret })
}
