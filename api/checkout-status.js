import { adminAuth, adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
  retrieveSessionWithCharge,
} from './_lib/billing.js'
import { failRequest } from './_lib/http.js'

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
      // Expanded so the CURRENT state of the money is visible: a fully refunded
      // session still reports status 'complete' / payment_status 'paid'.
      session = await retrieveSessionWithCharge(stripe, sessionId)
    } catch {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Only let a user read their own checkout session.
    //
    // `metadata.firebaseUid` is the ownership proof, and it is unconditional: it
    // is stamped server-side when the session is created (api/create-checkout.js)
    // and was never reachable by a client, so a session with no firebaseUid — or
    // someone else's — is not ours to disclose.
    //
    // `stripeCustomerId` is a WEAKER signal: it lives on a document the user is
    // allowed to delete (firestore.rules `allow delete: if isOwner()`), and a
    // self-deleted document used to 403 a paying customer out of their own
    // session with no recovery but founder intervention. So its absence no
    // longer blocks — but when it is present the session's customer must agree.
    const userDoc = await adminDb().collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}
    const customerId = userData?.stripeCustomerId || null
    const sessionCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null
    if (session.metadata?.firebaseUid !== uid || (customerId && sessionCustomerId !== customerId)) {
      return res.status(403).json({ error: 'Session does not belong to this account' })
    }

    // Safety net for one-off purchases: the webhook is the primary grant path,
    // but a completed payment must never depend on a single delivery. The
    // session has already been proved to belong to this account above, and
    // lifetimeGrantHealth only passes a complete, PAID session carrying the
    // lifetime SKU whose charge is not refunded or disputed — so this can add
    // access, never fabricate it. The read of the current entitlement and the
    // grant run inside one transaction, so a refund/dispute webhook landing at
    // the same moment cannot be clobbered by a stale read.
    let entitlementActive = userData?.lifetimeEntitlement?.active === true
      && !userData.lifetimeEntitlement.revokedAt
    if (!entitlementActive) {
      const health = lifetimeGrantHealth(session)
      const candidate = health.ok ? lifetimeEntitlementFromSession(session) : null
      // The customer comparison is a defence-in-depth repeat of the 403 above,
      // and like it, only applies when a stored customer id exists. Ownership
      // here rests on the session's server-stamped firebaseUid, not on a field
      // the client can delete.
      if (candidate && (!customerId || candidate.customerId === customerId)) {
        const db = adminDb()
        const ref = db.collection('users').doc(uid)
        entitlementActive = await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref)
          const current = snap.exists ? snap.data() : {}
          const decision = lifetimeGrantDecision(current, candidate)
          if (decision.action === 'noop') return true
          if (decision.action !== 'grant') return false
          tx.set(ref, {
            lifetimeEntitlement: { ...candidate, grantedAt: decision.grantedAt },
          }, { merge: true })
          return true
        })
        if (entitlementActive) {
          console.warn('checkout-status: reconciled a paid one-off entitlement the webhook had not applied', { uid, sessionId })
        }
      } else if (!health.ok && session.mode === 'payment') {
        console.warn('checkout-status: one-off session not granted', { uid, sessionId, reason: health.reason })
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
    return failRequest(res, {
      status: 500,
      scope: 'checkout-status',
      message: 'Could not verify this checkout. Please refresh, or contact support with the reference below.',
      err,
      context: { uid, sessionId },
    })
  }
}
