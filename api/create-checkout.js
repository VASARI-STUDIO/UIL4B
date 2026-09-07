import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  CURRENCY_CODES,
  LIFETIME_CURRENCY_CODES,
  LOOKUP_KEYS,
  PRICE_ENV_KEYS,
} from './_lib/pricing.js'
import { LIFETIME_SKU, ensureStripeCustomer, parseBillingInterval } from './_lib/billing.js'
import { planForUser } from './_lib/plans.js'
import { failRequest } from './_lib/http.js'
import { resolveOrigin } from './_lib/origins.js'

let priceCache = {}

async function resolvePrice(stripe, interval) {
  const key = parseBillingInterval(interval)
  if (!key) return null
  const envPrice = process.env[PRICE_ENV_KEYS[key]]
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
    // The credential explanation names the env var and the exact failure mode,
    // so it stays server-side; the browser gets the reference id instead.
    return failRequest(res, {
      status: 500,
      scope: 'create-checkout credential problem',
      message: 'Payments are temporarily unavailable due to a server configuration issue. No payment was taken.',
      context: { credential: cred },
    })
  }

  let uid
  let email
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
    email = decoded.email || null
  } catch (e) {
    return res.status(401).json({ error: e?.code === 'auth/id-token-expired' ? 'Session expired — please sign in again' : 'Invalid auth token' })
  }

  try {
    const { interval: rawInterval, currency } = req.body || {}
    const interval = parseBillingInterval(rawInterval)
    if (!interval) {
      return res.status(400).json({ error: 'interval must be one of: monthly, yearly, lifetime' })
    }
    const stripe = getStripeServer()
    const isYearly = interval === 'yearly'
    const isLifetime = interval === 'lifetime'
    const wantCurrency = typeof currency === 'string' && CURRENCY_CODES.includes(currency.toLowerCase())
      ? currency.toLowerCase()
      : null
    if (isLifetime && wantCurrency && !LIFETIME_CURRENCY_CODES.includes(wantCurrency)) {
      return res.status(400).json({ error: `One-off checkout is not available in ${wantCurrency.toUpperCase()} yet` })
    }
    const priceId = await resolvePrice(stripe, interval)
    if (!priceId) {
      console.error('create-checkout: no Stripe price resolved for interval', interval)
      return res.status(503).json({ error: `The ${isLifetime ? 'one-off' : interval} price is temporarily unavailable. No payment session was created.` })
    }

    const userDoc = await adminDb().collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}
    if (planForUser({
      subscription: userData?.subscription || null,
      lifetimeEntitlement: userData?.lifetimeEntitlement || null,
      email,
    }).id === 'pro') {
      return res.status(409).json({ error: 'This account already has Pro access. No payment session was created.' })
    }
    // Read-create-write used to live inline here, and two first checkouts in
    // flight (a double click, two tabs) both read null, both created a customer,
    // and the second write won — orphaning a Stripe customer whose
    // metadata.firebaseUid pointed at this same account. ensureStripeCustomer
    // closes it with a uid-derived idempotency key plus a transactional claim;
    // the long note is in _lib/billing.js.
    const customerId = await ensureStripeCustomer(
      stripe, adminDb(), uid, userData?.stripeCustomerId || null,
    )

    const origin = resolveOrigin(req)

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
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        firebaseUid: uid,
        billingInterval: interval,
        ...(isLifetime ? { entitlementSku: LIFETIME_SKU } : {}),
      },
    }
    if (isLifetime) {
      sessionParams.payment_intent_data = {
        metadata: { firebaseUid: uid, entitlementSku: LIFETIME_SKU },
      }
    } else {
      sessionParams.subscription_data = subscriptionData
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

    return res.status(200).json({
      clientSecret: session.client_secret,
      interval,
      mode: sessionParams.mode,
    })
  } catch (err) {
    return failRequest(res, {
      status: 500,
      scope: 'create-checkout',
      message: 'Could not start checkout. No payment was taken — please try again, or contact support with the reference below.',
      err,
      context: { uid, interval: parseBillingInterval(req.body?.interval) },
    })
  }
}
