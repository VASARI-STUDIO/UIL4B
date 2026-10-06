import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  CURRENCY_CODES,
  BILLING_INTERVALS,
  LOOKUP_KEYS,
  PRICE_ENV_KEYS,
  priceIsSellable,
  trialDaysFor,
} from './_lib/pricing.js'
import { ensureStripeCustomer, parseBillingInterval } from './_lib/billing.js'
import { planForUser } from './_lib/plans.js'
import { failRequest } from './_lib/http.js'
import { allowedOrigins, resolveOrigin } from './_lib/origins.js'

// Resolved price ids, per interval, for a few minutes. Short enough that a
// price archived in Stripe stops being sold on the next refresh; only a
// sellable price is ever cached, so a fixed configuration is picked up at once.
export const PRICE_CACHE_TTL_MS = 5 * 60 * 1000
const priceCache = new Map()

/**
 * The Stripe price a checkout for `interval` charges, or null when there is no
 * sellable one.
 *
 * A configured STRIPE_PRICE_* id is used only while Stripe reports it sellable
 * (active, on the right recurrence). Otherwise the interval's lookup key
 * decides, which is the same rule /api/get-prices uses to choose the price it
 * shows. A Stripe error while resolving also yields null, so the caller answers
 * with its "temporarily unavailable" response instead of a failed session.
 *
 * `env`, `cache` and `now` are injectable for tests/unit/checkout-price-guard.test.js.
 */
export async function resolvePrice(stripe, interval, { env = process.env, cache = priceCache, now = Date.now() } = {}) {
  const key = parseBillingInterval(interval)
  if (!key) return null
  const hit = cache.get(key)
  if (hit && now - hit.at < PRICE_CACHE_TTL_MS) return hit.id

  const envKey = PRICE_ENV_KEYS[key]
  const envPrice = env[envKey]
  if (envPrice) {
    try {
      const price = await stripe.prices.retrieve(envPrice)
      if (priceIsSellable(price, key)) {
        cache.set(key, { id: envPrice, at: now })
        return envPrice
      }
      console.error('create-checkout: the configured price is not sellable — resolving by lookup key instead', {
        interval: key, envKey, active: price?.active ?? null, recurring: price?.recurring?.interval ?? null,
      })
    } catch (err) {
      console.error('create-checkout: the configured price could not be read — resolving by lookup key instead', {
        interval: key, envKey, error: err?.message, type: err?.type,
      })
    }
  }

  try {
    const found = await stripe.prices.list({ lookup_keys: [LOOKUP_KEYS[key]], active: true, limit: 1 })
    const price = found?.data?.[0]
    if (!priceIsSellable(price, key)) return null
    cache.set(key, { id: price.id, at: now })
    return price.id
  } catch (err) {
    console.error('create-checkout: the price lookup failed', {
      interval: key, error: err?.message, type: err?.type,
    })
    return null
  }
}

/**
 * The 400 answer for an interval that cannot be bought, or null when it can.
 * Pro is sold as a subscription only, so a request for a one-off purchase gets
 * its own message rather than the generic list.
 */
export function intervalRefusal(rawInterval) {
  if (parseBillingInterval(rawInterval)) return null
  if (rawInterval === 'lifetime') {
    return { status: 400, error: 'Pro is sold as a monthly, quarterly or yearly subscription. There is no one-off purchase. No payment session was created.' }
  }
  return { status: 400, error: `interval must be one of: ${BILLING_INTERVALS.join(', ')}` }
}

export default async function handler(req, res) {
  // An allowlisted origin is reflected, anything else gets no CORS header at
  // all — the same allowlist and the same shape as api/support.js, which
  // records the reasoning. `*` was not a CSRF hole here (the bearer token below
  // is the only credential and a browser never attaches it by itself), it was
  // simply wider than anything that needs it.
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Checked first: an interval that cannot be bought needs no account, token
  // or Stripe call to refuse.
  const refusal = intervalRefusal(req.body?.interval)
  if (refusal) return res.status(refusal.status).json({ error: refusal.error })

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
    const stripe = getStripeServer()
    const wantCurrency = typeof currency === 'string' && CURRENCY_CODES.includes(currency.toLowerCase())
      ? currency.toLowerCase()
      : null
    const priceId = await resolvePrice(stripe, interval)
    if (!priceId) {
      console.error('create-checkout: no Stripe price resolved for interval', interval)
      return res.status(503).json({ error: `The ${interval} price is temporarily unavailable. No payment session was created.` })
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

    // THE TRIAL IS READ FROM THE CADENCE, NOT FROM `isYearly`.
    //
    // This was `if (isYearly) trial_period_days = 7` — one literal here and a
    // second one in src/pages/Checkout.jsx, with nothing holding them together.
    // A checkout page promising a trial that Stripe does not grant is a bug
    // whose only symptom is a card statement, so both now read the same table
    // and tests/unit/trial-cadence.test.js fails if they drift.
    //
    // Founder, 2026-09-15: monthly bills today, quarterly and yearly each get
    // seven days. Yearly is unchanged by this commit — it granted 7 before and
    // grants 7 now — so no existing promise moved.
    const subscriptionData = { metadata: { firebaseUid: uid } }
    const trialDays = trialDaysFor(interval)
    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays
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
      metadata: {
        firebaseUid: uid,
        billingInterval: interval,
      },
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
