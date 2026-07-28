import { adminAuth, adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import { lifetimeEntitlementFromSession } from './_lib/billing.js'

// Returns the status of an embedded Checkout session so the /checkout/return
// page can confirm the result. The session is verified to belong to the
// authenticated user's Stripe customer before any details are returned.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

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

  const sessionId = req.query.session_id
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  try {
    const stripe = getStripeServer()

    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Only let a user read their own checkout session.
    const userDoc = await adminDb().collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}
    const customerId = userData?.stripeCustomerId || null
    if (!customerId || session.customer !== customerId
      || (session.metadata?.firebaseUid && session.metadata.firebaseUid !== uid)) {
      return res.status(403).json({ error: 'Session does not belong to this account' })
    }

    // Safety net for one-off purchases: the webhook is the primary grant path,
    // but a completed payment must never depend on a single delivery. The
    // session has already been proved to belong to this account above, and
    // lifetimeEntitlementFromSession only returns a grant for a complete, PAID
    // session carrying the lifetime SKU — so this can add access, never
    // fabricate it. A revoked (refunded) entitlement is never re-granted.
    let entitlementActive = userData?.lifetimeEntitlement?.active === true
    const revoked = !!userData?.lifetimeEntitlement?.revokedAt
    if (!entitlementActive && !revoked) {
      const candidate = lifetimeEntitlementFromSession(session)
      if (candidate && candidate.customerId === customerId && session.metadata.firebaseUid === uid) {
        await adminDb().collection('users').doc(uid).set({
          lifetimeEntitlement: {
            ...candidate,
            grantedAt: userData?.lifetimeEntitlement?.grantedAt || candidate.grantedAt,
          },
        }, { merge: true })
        entitlementActive = true
        console.warn('checkout-status: reconciled a paid one-off entitlement the webhook had not applied', { uid, sessionId })
      }
    }

    return res.status(200).json({
      status: session.status, // 'open' | 'complete' | 'expired'
      paymentStatus: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
      mode: session.mode,
      interval: session.metadata?.billingInterval || null,
      entitlementActive,
      customerEmail: session.customer_details?.email || null,
    })
  } catch (err) {
    console.error('checkout-status failed:', err)
    return res.status(500).json({ error: err?.message || 'Could not verify checkout' })
  }
}
