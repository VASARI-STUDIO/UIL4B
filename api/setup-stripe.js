import { getStripeServer } from './_lib/stripe.js'
import { adminAuth, credentialProblem } from './_lib/firebase-admin.js'
// One list, shared with /api/verify-admin and /api/ai's diagnostic. It is the
// ADMIN_EMAILS environment variable, and an unset one grants admin to nobody.
import { isAdminEmail } from './_lib/adminEmails.js'
import { proProductDescription } from './_lib/plans.js'
import { allowedOrigins } from './_lib/origins.js'
import { adminDb } from './_lib/firebase-admin.js'
import { isReauthFresh } from './_lib/accountDeletion.js'
import { clientIp } from './_lib/rateLimit.js'
import { failRequest } from './_lib/http.js'
import {
  SUPPORTED_CURRENCIES, CURRENCY_CODES, BASE_CURRENCY, DEFAULT_PRICES,
  LOOKUP_KEYS, INTERVAL_MAP, INTERVAL_COUNTS, BILLING_INTERVALS,
  toCents, fromCents,
} from './_lib/pricing.js'

const PRODUCT_NAME = 'UIL4B Pro'
// DERIVED, not typed. Stripe prints this on the embedded checkout, on the
// receipt and on the invoice — it is the one copy of the promise that reaches a
// customer with money in hand, and it used to advertise 1,000 AI actions a day
// against a server that allows 30. See the note above proProductDescription()
// in _lib/plans.js; tests/unit/stripe-product-truth.test.js fails if this file
// and the enforced limits ever disagree again.
const PRODUCT_DESCRIPTION = proProductDescription()

async function requireAdmin(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing auth token', status: 401 }
  }
  try {
    // checkRevoked: a token from a session that was ended must not move prices.
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7), true)
    // Require a Firebase-verified email — an unverified signup could
    // otherwise register the admin address and pass the allowlist check.
    if (!decoded.email_verified || !isAdminEmail(decoded.email)) {
      return { error: 'Admin access required', status: 403 }
    }
    return { decoded }
  } catch (err) {
    if (err?.code === 'auth/id-token-revoked') {
      return { error: 'Your session was ended. Sign in again.', code: 'session-revoked', status: 401 }
    }
    return { error: credentialProblem() || 'Invalid auth token', status: 401 }
  }
}

// Creates the product, and — the half this was missing — CORRECTS a live one.
//
// This only ever created. So the moment a product existed in Stripe, the
// description on every future receipt and invoice was frozen at whatever the
// code said the day it was first run, and editing the constant changed nothing a
// customer would ever see. That is how "1,000 AI actions per day" stayed on the
// checkout page for months after the server had been lowered to 30.
//
// The update is unconditional on the description ONLY — the name, prices and
// everything else a founder may have tuned in the dashboard are left alone.
// Exported so tests/unit/stripe-product-truth.test.js can assert what THIS
// function does to a live product, rather than what a copy of it would do.
export async function findOrCreateProduct(stripe) {
  const existing = await stripe.products.list({ active: true, limit: 100 })
  const match = existing.data.find(p => p.name === PRODUCT_NAME)
  if (!match) {
    return stripe.products.create({ name: PRODUCT_NAME, description: PRODUCT_DESCRIPTION })
  }
  if (match.description !== PRODUCT_DESCRIPTION) {
    console.warn('setup-stripe: correcting a stale product description on the live product', {
      productId: match.id, was: match.description, now: PRODUCT_DESCRIPTION,
    })
    return stripe.products.update(match.id, { description: PRODUCT_DESCRIPTION })
  }
  return match
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
      const n = Number(amt)
      if (!isFinite(n) || n <= 0 || n > 100000) return `${interval} ${cur.toUpperCase()}: invalid amount`
    }
  }
  return null
}

// Marks the audit row with how the change ended. Never throws: the change has
// already happened (or failed), and the row still says 'applying' if this fails.
async function settleAudit(ref, status) {
  if (!ref) return
  try {
    await ref.set({ status, settledAt: new Date().toISOString() }, { merge: true })
  } catch (err) {
    console.error('setup-stripe: could not mark the audit row', { status, error: err?.message })
  }
}

// Every price change is recorded in this collection before it is made. It has
// no rule in firestore.rules, so only the Admin SDK can read or write it.
export const AUDIT_COLLECTION = 'admin-audit'

// A single save may not move any price by more than this factor, up or down,
// unless the request carries `force: true`. A mistyped extra zero is the likely
// error; a stolen session is the unlikely one; both are stopped by it.
export const MAX_PRICE_CHANGE_FACTOR = 10

// { lookupKey: { currency: { old, new } } } for the amounts a save would write.
// `old` is null where no live price exists for that lookup key and currency.
export function describePriceChanges(before, prices) {
  const out = {}
  for (const interval of BILLING_INTERVALS) {
    const live = before?.[interval]?.currencies || {}
    out[LOOKUP_KEYS[interval]] = {}
    for (const [cur, amt] of Object.entries(prices[interval])) {
      out[LOOKUP_KEYS[interval]][cur] = { old: live[cur] ?? null, new: Number(amt) }
    }
  }
  return out
}

// The first change beyond MAX_PRICE_CHANGE_FACTOR, or null.
export function oversizedChange(changes) {
  for (const [lookupKey, byCurrency] of Object.entries(changes)) {
    for (const [currency, { old, new: next }] of Object.entries(byCurrency)) {
      if (old > 0 && (next > old * MAX_PRICE_CHANGE_FACTOR || next < old / MAX_PRICE_CHANGE_FACTOR)) {
        return { lookupKey, currency, old, new: next }
      }
    }
  }
  return null
}

export default async function handler(req, res) {
  // An allowlisted origin is reflected, anything else gets no CORS header at
  // all — the same allowlist and the same shape as api/support.js, which
  // records the reasoning. `*` was not a CSRF hole here (the bearer token below
  // is the only credential and a browser never attaches it by itself), it was
  // simply wider than anything that needs it — and this route creates Stripe
  // products.
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  // Admin-only responses; never kept by a shared cache.
  res.setHeader('Cache-Control', 'private, no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await requireAdmin(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error, ...(auth.code ? { code: auth.code } : {}) })

  // The audit row for this request, once it exists, so a failure can mark it.
  let auditRef = null

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
    //
    // Changing a live price needs a sign-in from the last few minutes, checked
    // on the token's own `auth_time` exactly as api/delete-account.js does: an
    // hour-old admin token from a machine someone walked away from (or lifted)
    // cannot move prices. The admin page maps the code to "Sign in again".
    const authTimeMs = (auth.decoded.auth_time || 0) * 1000
    if (!isReauthFresh(authTimeMs)) {
      return res.status(401).json({
        code: 'reauth-required',
        error: 'For your security, please sign in again before changing prices.',
      })
    }

    const prices = req.body?.prices || DEFAULT_PRICES
    const invalid = validatePrices(prices)
    if (invalid) return res.status(400).json({ error: invalid })

    const force = req.body?.force === true
    const changes = describePriceChanges(await readPrices(stripe), prices)
    const oversized = oversizedChange(changes)
    if (oversized && !force) {
      return res.status(400).json({
        code: 'price-change-too-large',
        error: `${oversized.lookupKey} ${oversized.currency.toUpperCase()} would change from ${oversized.old} to ${oversized.new}, more than ${MAX_PRICE_CHANGE_FACTOR}x. Nothing was changed.`,
      })
    }

    // Recorded BEFORE anything is changed: if the audit row cannot be written
    // the prices stay as they are, so no change is ever made without a record.
    auditRef = adminDb().collection(AUDIT_COLLECTION).doc()
    try {
      await auditRef.set({
        action: 'stripe-prices-update',
        status: 'applying',
        at: new Date().toISOString(),
        actorUid: auth.decoded.uid,
        actorEmail: auth.decoded.email || null,
        authTime: new Date(authTimeMs).toISOString(),
        ip: clientIp(req) || null,
        forced: force,
        prices: changes,
      })
    } catch (err) {
      auditRef = null
      return failRequest(res, {
        status: 500,
        scope: 'setup-stripe audit write',
        message: 'The audit record could not be written, so no prices were changed.',
        err,
      })
    }

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
      // `recurring.interval` alone does not say how often a price bills:
      // Stripe reads { interval: 'month' } as every month, so the interval
      // count must be sent with it.
      //
      // Sent for every interval, so an interval with a count above 1 added to
      // INTERVAL_COUNTS later is created correctly without a special case.
      // Every interval is recurring: no one-off price is created here.
      priceParams.recurring = {
        interval: INTERVAL_MAP[interval],
        interval_count: INTERVAL_COUNTS[interval] ?? 1,
      }
      const newPrice = await stripe.prices.create(priceParams)

      if (existing.data[0] && existing.data[0].id !== newPrice.id) {
        await stripe.prices.update(existing.data[0].id, { active: false })
      }

      out[interval] = { id: newPrice.id, currencies: amounts }
    }

    await settleAudit(auditRef, 'applied')

    return res.status(200).json({
      ok: true,
      product: product.id,
      prices: out,
      note: 'Prices saved. Checkout resolves each interval by lookup key.',
    })
  } catch (err) {
    console.error('setup-stripe failed:', err)
    await settleAudit(auditRef, 'failed')
    return res.status(500).json({ error: err?.message || 'Setup failed' })
  }
}
