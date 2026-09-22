import { adminAuth, adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import { failRequest } from './_lib/http.js'
import { allowedOrigins, resolveOrigin } from './_lib/origins.js'

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

  try {
    const stripe = getStripeServer()

    const userDoc = await adminDb().collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : null
    const customerId = userData?.stripeCustomerId || null

    if (!customerId) {
      return res.status(400).json({ error: 'No subscription found' })
    }

    // `stripeCustomerId` lived on a client-writable document until the
    // firestore.rules lock, so the stored value alone is not proof of ownership.
    // Stripe's own copy of the customer is: its firebaseUid metadata was written
    // by this server at create-checkout time and has never been client-reachable.
    // Without this, a stale or tampered id could open someone else's billing
    // portal — full card details, invoices and cancellation rights.
    let customer
    try {
      customer = await stripe.customers.retrieve(customerId)
    } catch (err) {
      return failRequest(res, {
        status: 400,
        scope: 'create-portal customer lookup',
        message: 'We could not open your billing portal. Please contact support with the reference below.',
        err,
        context: { uid, customerId },
      })
    }
    const customerUid = customer?.deleted ? null : customer?.metadata?.firebaseUid || null
    if (customerUid !== uid) {
      // `missing_metadata` = a legacy or hand-made Stripe customer, fixable by
      // adding metadata firebaseUid=<uid> on the customer in the Stripe
      // dashboard. `uid_mismatch` = the stored id points at someone else's
      // customer, which is the attack this check exists for.
      console.error('create-portal: refused — Stripe customer does not belong to this account', {
        uid,
        customerId,
        customerUid,
        deleted: !!customer?.deleted,
        cause: customer?.deleted ? 'customer_deleted' : (customerUid ? 'uid_mismatch' : 'missing_metadata'),
      })
      return res.status(403).json({ error: 'This billing account is not linked to your login. Please contact support.' })
    }

    const origin = resolveOrigin(req)

    const params = {
      customer: customerId,
      return_url: `${origin}/settings`,
    }

    // Deep-link into Stripe's native cancellation flow, where Stripe presents
    // the configured retention coupon (real, server-side) before cancelling.
    const { flow } = req.body || {}
    const subId = userData?.subscription?.id
    if (flow === 'cancel' && subId) {
      const retentionCoupon = process.env.STRIPE_RETENTION_COUPON
      params.flow_data = {
        type: 'subscription_cancel',
        subscription_cancel: {
          subscription: subId,
          ...(retentionCoupon
            ? { retention: { type: 'coupon_offer', coupon_offer: { coupon: retentionCoupon } } }
            : {}),
        },
      }
    }

    let session
    try {
      session = await stripe.billingPortal.sessions.create(params)
    } catch (flowErr) {
      // If the portal isn't configured for the cancel/retention flow yet, fall
      // back to the default portal so the button still works.
      if (params.flow_data) {
        console.error('portal flow_data failed, falling back to default portal:', flowErr?.message)
        delete params.flow_data
        session = await stripe.billingPortal.sessions.create(params)
      } else {
        throw flowErr
      }
    }

    return res.status(200).json({ url: session.url })
  } catch (err) {
    return failRequest(res, {
      status: 500,
      scope: 'create-portal',
      message: 'Could not open the billing portal. Please try again, or contact support with the reference below.',
      err,
      context: { uid },
    })
  }
}
