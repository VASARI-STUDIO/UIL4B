import { getStripeServer } from './_lib/stripe.js'
import { adminAuth, credentialProblem } from './_lib/firebase-admin.js'
// One list, shared with /api/verify-admin and /api/ai's diagnostic. It is the
// ADMIN_EMAILS environment variable, and an unset one grants admin to nobody.
import { isAdminEmail } from './_lib/adminEmails.js'
import { proProductDescription } from './_lib/plans.js'
import { allowedOrigins } from './_lib/origins.js'
import { adminDb } from './_lib/firebase-admin.js'
import { isReauthFresh } from './_lib/accountDeletion.js'
import { clientIp, hashKey } from './_lib/rateLimit.js'
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

// Every price change is recorded in this collection before it is made. It has
// no rule in firestore.rules, so only the Admin SDK can read or write it.
export const AUDIT_COLLECTION = 'admin-audit'

// A POST is refused (409) while another audit row is still 'applying' and is
// younger than this. A row older than this is a request that died without
// settling, and must not block price changes for ever.
export const APPLYING_GUARD_MS = 2 * 60 * 1000

// Marks the audit row with how the change ended. Never throws: the change has
// already happened (or failed), and the row still says 'applying' if this fails.
// `extra` is merged in as given: per-interval progress and a cleaned error.
async function settleAudit(ref, status, extra = {}) {
  if (!ref) return
  try {
    await ref.set({ status, settledAt: new Date().toISOString(), ...extra }, { merge: true })
  } catch (err) {
    console.error('setup-stripe: could not mark the audit row', { status, error: err?.message })
  }
}

// Best-effort progress write after each interval, so a request that dies
// mid-loop (a timeout) still leaves a row that says how far it got.
async function recordProgress(ref, progress) {
  if (!ref) return
  try {
    await ref.set({ progress }, { merge: true })
  } catch (err) {
    console.error('setup-stripe: could not record progress on the audit row', { error: err?.message })
  }
}

// An error message that is safe to keep in the audit row: Stripe object ids and
// keys are replaced, and the length is capped. Stripe's own messages name the
// object ("No such price: 'price_1Abc...'"), and a key can appear in an
// authentication error.
export function safeErrorMessage(err) {
  const raw = String(err?.message || 'Unknown error')
  return raw
    .replace(/\b(?:price|prod|cus|cs|sub|si|pi|in|ii|ch|re|evt|acct|pm|plan|req|txn|seti|sk|rk|pk|whsec)_[A-Za-z0-9_]{6,}/g, '[id]')
    .slice(0, 300)
}

// How a settled change is described: 'applied' when every interval was created
// and archived, 'partial' when some price changed but not all of the work was
// done, 'failed' when nothing changed.
export function auditStatusFor(progress, complete) {
  if (complete) return 'applied'
  return Object.values(progress).some((p) => p.created) ? 'partial' : 'failed'
}

// The audit fields that identify who asked. The address is hashed the way the
// rate limiter hashes it, so the raw address is not stored.
function auditActor(req, auth, authTimeMs) {
  const ip = clientIp(req)
  return {
    actorUid: auth.decoded.uid,
    actorEmail: auth.decoded.email || null,
    authTime: authTimeMs > 0 ? new Date(authTimeMs).toISOString() : null,
    ip: ip ? hashKey(ip) : null,
  }
}

// A refused attempt is recorded too. Best-effort: the refusal is already the
// answer, and a failed write must not turn it into a 500.
async function auditRefusal(req, auth, authTimeMs, reason, extra = {}) {
  try {
    await adminDb().collection(AUDIT_COLLECTION).doc().set({
      action: 'stripe-prices-update',
      status: 'refused',
      reason,
      at: new Date().toISOString(),
      ...auditActor(req, auth, authTimeMs),
      ...extra,
    })
  } catch (err) {
    console.error('setup-stripe: could not record a refused attempt', { reason, error: err?.message })
  }
}

// Writes the 'applying' row unless a recent one is still open. Both happen in
// one transaction so two saves arriving together cannot both pass the check.
// Returns { busy: true } when another save is under way.
async function openAudit(db, ref, row) {
  return db.runTransaction(async (tx) => {
    const open = await tx.get(db.collection(AUDIT_COLLECTION).where('status', '==', 'applying'))
    const now = Date.now()
    const recent = open.docs.some((d) => now - Date.parse(d.data().at) < APPLYING_GUARD_MS)
    if (recent) return { busy: true }
    tx.set(ref, row)
    return { busy: false }
  })
}

// A save may not move any price by more than this factor, up or down, unless
// the request carries `force: true`. This is a guard against a mistyped extra
// zero. It is NOT a control against a stolen session: whoever holds a fresh
// admin session can send `force: true` themselves. The session controls are the
// fresh sign-in, the revocation check and the audit row.
export const MAX_PRICE_CHANGE_FACTOR = 10

// { lookupKey: { currency: { old, new, newCents } } } for the amounts a save
// would write. `new` is what the price will really be: the amount rounded
// through toCents, as it is sent to Stripe, so 7.999 is recorded as 8 and 800
// rather than as the 7.999 that was typed. `old` is null where no live price
// exists for that lookup key and currency.
export function describePriceChanges(before, prices) {
  const out = {}
  for (const interval of BILLING_INTERVALS) {
    const live = before?.[interval]?.currencies || {}
    out[LOOKUP_KEYS[interval]] = {}
    for (const [cur, amt] of Object.entries(prices[interval])) {
      const newCents = toCents(amt)
      out[LOOKUP_KEYS[interval]][cur] = { old: live[cur] ?? null, new: fromCents(newCents), newCents }
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

  // The audit row for this request, once it exists, so a failure can mark it,
  // and how far the interval loop got (`{ monthly: { created, archived } }`).
  let auditRef = null
  const progress = {}

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
      await auditRefusal(req, auth, authTimeMs, 'reauth-required')
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
      await auditRefusal(req, auth, authTimeMs, 'price-change-too-large', { forced: false, prices: changes })
      return res.status(400).json({
        code: 'price-change-too-large',
        error: `${oversized.lookupKey} ${oversized.currency.toUpperCase()} would change from ${oversized.old} to ${oversized.new}, more than ${MAX_PRICE_CHANGE_FACTOR}x. Nothing was changed.`,
      })
    }

    // Recorded BEFORE anything is changed: if the audit row cannot be written
    // the prices stay as they are, so no change is ever made without a record.
    // The same step refuses a save while another is still 'applying' (409), so
    // a double click or a second tab cannot run the interval loop twice at once.
    const db = adminDb()
    auditRef = db.collection(AUDIT_COLLECTION).doc()
    try {
      const { busy } = await openAudit(db, auditRef, {
        action: 'stripe-prices-update',
        status: 'applying',
        at: new Date().toISOString(),
        ...auditActor(req, auth, authTimeMs),
        forced: force,
        prices: changes,
      })
      if (busy) {
        auditRef = null
        return res.status(409).json({
          code: 'change-in-progress',
          error: 'Another price change is still being applied. Wait a minute, then check the prices and try again. Nothing was changed.',
        })
      }
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
      // The idempotency keys come from this request's audit id and the
      // interval, so Stripe replays the first result rather than making a
      // second price or a second archive if this call is repeated within its
      // own request (a network retry).
      progress[interval] = { created: false, archived: false }
      const newPrice = await stripe.prices.create(priceParams, { idempotencyKey: `${auditRef.id}-create-${interval}` })
      progress[interval].created = true

      if (existing.data[0] && existing.data[0].id !== newPrice.id) {
        await stripe.prices.update(existing.data[0].id, { active: false }, { idempotencyKey: `${auditRef.id}-archive-${interval}` })
      }
      // True also when there was no old price to archive.
      progress[interval].archived = true
      await recordProgress(auditRef, progress)

      out[interval] = { id: newPrice.id, currencies: amounts }
    }

    await settleAudit(auditRef, auditStatusFor(progress, true), { progress })

    return res.status(200).json({
      ok: true,
      product: product.id,
      prices: out,
      note: 'Prices saved. Checkout resolves each interval by lookup key.',
    })
  } catch (err) {
    console.error('setup-stripe failed:', err)
    // 'partial' when at least one interval's price was already created: the
    // live prices are then a mix of old and new, and the row says which.
    const status = auditStatusFor(progress, false)
    await settleAudit(auditRef, status, { progress, error: safeErrorMessage(err) })
    const message = err?.message || 'Setup failed'
    if (status === 'partial') {
      const applied = Object.keys(progress).filter((k) => progress[k].created)
      return res.status(500).json({
        partial: true,
        applied,
        error: `Only some prices were changed (${applied.join(', ')}) before this failed. Reload to see the live prices, then save again. ${message}`,
      })
    }
    return res.status(500).json({ error: message })
  }
}
