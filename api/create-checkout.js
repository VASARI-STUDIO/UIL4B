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
import { clientIp, consume } from './_lib/rateLimit.js'

// Opening a checkout creates a Stripe customer on first use and a session every
// time, and a free account costs nothing to make, so a script with a stream of
// throwaway accounts could otherwise create Stripe objects without limit. The
// per-account limit stops one login looping; the per-address limit stops many
// logins from one machine. A real buyer opens a checkout a handful of times.
export const CHECKOUT_LIMITS = Object.freeze({
  perUid: Object.freeze({ limit: 10, windowMs: 60 * 60 * 1000 }),
  perIp: Object.freeze({ limit: 30, windowMs: 60 * 60 * 1000 }),
})

/**
 * Counts this request against both limits. Returns null when it may go ahead,
 * or `{ retryAfter }` (whole seconds) for the first limit that is spent. The
 * account is checked first, so a refused account does not use up the shared
 * address allowance.
 */
export async function checkoutRateLimit(db, { uid, ip, now = Date.now() }) {
  const uidVerdict = await consume(db, { bucket: 'checkout-uid', key: uid, ...CHECKOUT_LIMITS.perUid, now })
  if (!uidVerdict.allowed) return { retryAfter: uidVerdict.retryAfter }
  const ipVerdict = await consume(db, { bucket: 'checkout-ip', key: ip, ...CHECKOUT_LIMITS.perIp, now })
  if (!ipVerdict.allowed) return { retryAfter: ipVerdict.retryAfter }
  return null
}

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
    return { status: 400, error: 'Pro is sold as a monthly or yearly subscription. There is no one-off purchase. No payment session was created.' }
  }
  return { status: 400, error: `interval must be one of: ${BILLING_INTERVALS.join(', ')}` }
}

/**
 * Whether Stripe refused a session because the account has no Terms of Service
 * URL set (Dashboard > Settings > Public details), which consent collection needs.
 * Stripe's wording is not a stable contract, so spaces, hyphens and the
 * `terms_of_service` parameter spelling all count. Only a Stripe invalid-request
 * error (HTTP 400) qualifies, so a network, auth or server failure whose text
 * happens to mention the Terms is never retried.
 */
export function isTermsUrlError(err) {
  if (!err) return false
  if (err.type !== 'StripeInvalidRequestError' && err.statusCode !== 400) return false
  const message = String(err.message || '')
  const termsMention = /terms[\s_-]*of[\s_-]*service/i.test(message) || /consent_collection/i.test(String(err.param || ''))
  return termsMention && /url/i.test(message)
}

// Logged when the Terms-URL fallback below drops consent collection.
export const CONSENT_DROPPED_TAG = '[checkout] consent_collection dropped: terms URL not set'

/**
 * Create the Checkout Session. If Stripe rejects it only because the account has
 * no Terms of Service URL yet, retry once without consent collection so checkout
 * keeps working; any other error is thrown unchanged.
 */
export async function createSession(stripe, params) {
  try {
    return await stripe.checkout.sessions.create(params)
  } catch (err) {
    if (!params.consent_collection || !isTermsUrlError(err)) throw err
    // An error, not a warning: sessions created on this path carry no recorded
    // Terms agreement, so it has to stand out in the logs. The tag is fixed text
    // only, with no error message, key or uid.
    console.error(CONSENT_DROPPED_TAG)
    const { consent_collection: _omitted, ...withoutConsent } = params
    return stripe.checkout.sessions.create(withoutConsent)
  }
}

/**
 * The currency (lowercase ISO) a session was actually created in, or null when
 * that is not known. The session's own currency wins; failing that, the
 * currency we asked for counts only while it is in the final params. A session
 * is never opened without the requested currency (createSessionInCurrency
 * refuses instead), so the answer never names a currency Stripe did not use.
 */
export function sessionCurrency(session, params) {
  const reported = typeof session?.currency === 'string' ? session.currency.trim().toLowerCase() : ''
  if (reported) return reported
  const asked = typeof params?.currency === 'string' ? params.currency.trim().toLowerCase() : ''
  return asked || null
}

/**
 * The 400 answer for a currency the request names but this route does not
 * sell, or null when it is fine (or absent). An unrecognised currency used to
 * be dropped without a word, which opened the session in whatever currency
 * Stripe defaulted to, not the one the buyer saw.
 */
export function currencyRefusal(rawCurrency) {
  if (rawCurrency === undefined || rawCurrency === null) return null
  if (typeof rawCurrency === 'string' && CURRENCY_CODES.includes(rawCurrency.toLowerCase())) return null
  return { status: 400, error: `currency must be one of: ${CURRENCY_CODES.join(', ')}. No payment session was created.` }
}

// Stripe refuses a currency it cannot honour on this session: the price has no
// option for it, or the customer is locked to another currency by an earlier
// subscription. Both name the currency.
// Stripe's own `param` decides when it names one; the message is read only when
// it does not, so an error about another field never counts as a currency one.
function isCurrencyError(err) {
  if (typeof err?.param === 'string' && err.param) return err.param === 'currency'
  return /currenc/i.test(String(err?.message || ''))
}

/**
 * Opens the checkout session in the currency the buyer was shown. If Stripe
 * cannot honour that currency the answer is a refusal, never a retry without
 * it: a session with no currency opens in the price's base currency or the
 * customer's locked one, and the buyer would be charged an amount they were
 * not shown. Any other Stripe error is thrown for the caller's generic answer.
 *
 * Returns `{ session }` or `{ refusal: { status, error } }`.
 */
export async function createSessionInCurrency(stripe, sessionParams, wantCurrency) {
  const params = wantCurrency ? { ...sessionParams, currency: wantCurrency } : sessionParams
  try {
    return { session: await createSession(stripe, params) }
  } catch (err) {
    if (wantCurrency && isCurrencyError(err)) {
      console.error('create-checkout: Stripe cannot open the session in the requested currency — refusing rather than switching currency', {
        currency: wantCurrency, error: err?.message, type: err?.type, param: err?.param,
      })
      return {
        refusal: {
          status: 409,
          error: `Checkout can't be opened in ${wantCurrency.toUpperCase()} for this account right now. No payment session was created and nothing was charged.`,
        },
      }
    }
    throw err
  }
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
  const badCurrency = currencyRefusal(req.body?.currency)
  if (badCurrency) return res.status(badCurrency.status).json({ error: badCurrency.error })

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

  // After the token check, so only signed-in calls are counted, and before any
  // Stripe work.
  const limited = await checkoutRateLimit(adminDb(), { uid, ip: clientIp(req) })
  if (limited) {
    res.setHeader('Retry-After', String(limited.retryAfter))
    return res.status(429).json({
      error: 'Too many checkout attempts. Try again later, or contact support if you need help. No payment session was created.',
      retryAfter: limited.retryAfter,
    })
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
    // The rule: monthly bills today; yearly gets a seven-day trial.
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
      // Stripe shows the Terms checkbox and records the agreement on the session.
      consent_collection: { terms_of_service: 'required' },
    }
    // Present the customer's local currency (the price carries currency_options
    // for each supported currency). If Stripe cannot honour it — a returning
    // customer locked to another currency by a prior subscription, say — the
    // answer is a refusal the page shows, never a session in a different
    // currency (see createSessionInCurrency). The currency stays in
    // sessionParams so sessionCurrency can report it: a session is only ever
    // opened in the currency asked for.
    if (wantCurrency) sessionParams.currency = wantCurrency
    const { session, refusal: currencyRefused } = await createSessionInCurrency(stripe, sessionParams, wantCurrency)
    if (currencyRefused) return res.status(currencyRefused.status).json({ error: currencyRefused.error })

    return res.status(200).json({
      clientSecret: session.client_secret,
      currency: sessionCurrency(session, sessionParams),
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
