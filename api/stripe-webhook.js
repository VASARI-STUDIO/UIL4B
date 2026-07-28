import { adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
  retrieveSessionWithCharge,
} from './_lib/billing.js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function upsertSubscription(subscription) {
  const uid = subscription.metadata?.firebaseUid
  if (!uid) {
    const userUid = await uidForCustomer(subscription.customer)
    if (!userUid) return
    return writeSubscription(userUid, subscription)
  }
  return writeSubscription(uid, subscription)
}

async function writeSubscription(uid, sub) {
  await adminDb().collection('users').doc(uid).set({
    subscription: {
      id: sub.id,
      status: sub.status,
      priceId: sub.items?.data?.[0]?.price?.id || null,
      interval: sub.items?.data?.[0]?.price?.recurring?.interval || null,
      currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      // Cleared by any healthy subscription update so a recovered payment
      // removes the "payment failed" banner automatically.
      paymentFailed: false,
      trialEndsAt: sub.trial_end ? sub.trial_end * 1000 : null,
      updatedAt: Date.now(),
    },
  }, { merge: true })
}

// Resolves the Firebase uid for a Stripe customer id (used by invoice events
// that don't carry firebaseUid in metadata).
//
// `stripeCustomerId` was client-writable until the firestore.rules lock, so a
// second document claiming the same customer id is a tampering signal, not a
// tie to break. Read two and refuse to guess — writing billing state onto the
// wrong account is worse than not writing it, and the log line is the alert.
async function uidForCustomer(customerId) {
  if (!customerId) return null
  const snap = await adminDb()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(2)
    .get()
  if (snap.empty) return null
  if (snap.size > 1) {
    console.error('stripe-webhook: MULTIPLE user documents claim the same Stripe customer id — refusing to guess', {
      customerId, uids: snap.docs.map((d) => d.id),
    })
    return null
  }
  return snap.docs[0].id
}

// Prefers the uid stamped on the PaymentIntent at checkout creation
// (api/create-checkout.js) over the stripeCustomerId lookup, because that
// metadata is written by Stripe from our server call and was never reachable
// by a client.
async function uidForPaymentIntent(stripe, paymentIntentId, fallbackCustomerId) {
  if (paymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      const uid = intent?.metadata?.firebaseUid
      if (typeof uid === 'string' && uid.length > 0) return uid
    } catch (err) {
      console.error('stripe-webhook: could not retrieve payment intent for uid resolution', {
        paymentIntentId, error: err?.message,
      })
    }
  }
  return uidForCustomer(fallbackCustomerId)
}

function paymentIntentIdOf(object) {
  const intent = object?.payment_intent
  if (typeof intent === 'string') return intent
  return intent?.id || null
}

async function grantLifetimeEntitlement(stripe, rawSession) {
  const uid = rawSession?.metadata?.firebaseUid
  if (!uid) return false

  // The webhook payload is a snapshot from when the event was created. Re-read
  // the session (with the charge expanded) so a replayed or retried delivery
  // cannot re-grant on money that has since been refunded or charged back.
  let session
  try {
    session = await retrieveSessionWithCharge(stripe, rawSession.id)
  } catch (err) {
    console.error('stripe-webhook: could not re-read checkout session before granting', {
      uid, sessionId: rawSession.id, error: err?.message,
    })
    return false
  }

  const health = lifetimeGrantHealth(session)
  if (!health.ok) {
    console.error('stripe-webhook: lifetime grant refused — payment is not clean', {
      uid, sessionId: session.id, reason: health.reason,
    })
    return false
  }

  const candidate = lifetimeEntitlementFromSession(session)
  if (!candidate) return false

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? snap.data() : {}

    if (current?.stripeCustomerId && candidate.customerId !== current.stripeCustomerId) {
      // A paid session we refuse to honour is money taken without access, so it
      // must never fail silently — this is the one branch an owner has to see.
      console.error('stripe-webhook: paid lifetime session rejected — customer mismatch', {
        uid, sessionId: session.id, sessionCustomer: candidate.customerId, userCustomer: current.stripeCustomerId,
      })
      return false
    }

    const decision = lifetimeGrantDecision(current, candidate)
    if (decision.action === 'noop') return true
    if (decision.action !== 'grant') {
      console.error('stripe-webhook: lifetime grant refused by entitlement state', {
        uid, sessionId: session.id, reason: decision.reason,
      })
      return false
    }

    tx.set(ref, {
      lifetimeEntitlement: { ...candidate, grantedAt: decision.grantedAt },
    }, { merge: true })
    return true
  })
}

// One revocation implementation for every way money can go back: full refund,
// dispute opened, and dispute funds withdrawn. Keyed on the PaymentIntent so a
// revocation can only ever hit the entitlement that payment actually bought.
async function revokeByPaymentIntent(stripe, {
  paymentIntentId,
  customerId = null,
  chargeId = null,
  disputeId = null,
  reason,
}) {
  if (!paymentIntentId) {
    console.error('stripe-webhook: revocation skipped — no payment intent on the event', { reason, chargeId })
    return false
  }
  const uid = await uidForPaymentIntent(stripe, paymentIntentId, customerId)
  if (!uid) {
    console.error('stripe-webhook: revocation could not resolve a user — access may still be active', {
      reason, paymentIntentId, chargeId, customerId,
    })
    return false
  }

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  const revoked = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const entitlement = snap.data()?.lifetimeEntitlement
    if (!entitlement || entitlement.paymentIntentId !== paymentIntentId) return false
    if (entitlement.revokedAt && entitlement.active === false) return true // already revoked
    const now = Date.now()
    tx.set(ref, {
      lifetimeEntitlement: {
        ...entitlement,
        active: false,
        revokedAt: now,
        revokedReason: reason,
        refundedChargeId: chargeId || entitlement.refundedChargeId || null,
        disputeId: disputeId || entitlement.disputeId || null,
        updatedAt: now,
      },
    }, { merge: true })
    return true
  })
  if (revoked) console.warn('stripe-webhook: lifetime entitlement revoked', { uid, reason, paymentIntentId })
  return revoked
}

// A dispute closed in our favour returns the money, so the access it bought
// comes back — but only if it was revoked FOR that dispute and the charge is
// otherwise clean (a won dispute on a separately refunded charge stays revoked).
async function restoreAfterDisputeWon(stripe, dispute) {
  const paymentIntentId = paymentIntentIdOf(dispute) || null
  if (!paymentIntentId) return false
  const uid = await uidForPaymentIntent(stripe, paymentIntentId, null)
  if (!uid) {
    console.error('stripe-webhook: won dispute could not resolve a user — access not restored', {
      disputeId: dispute?.id, paymentIntentId,
    })
    return false
  }

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  const restored = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const entitlement = snap.data()?.lifetimeEntitlement
    if (!entitlement || entitlement.paymentIntentId !== paymentIntentId) return false
    if (entitlement.active === true) return false
    // Only a dispute-driven revocation is reversible here. A refund revocation
    // (or any other reason) stays put — the money did not come back.
    if (!String(entitlement.revokedReason || '').startsWith('dispute')) return false
    const now = Date.now()
    tx.set(ref, {
      lifetimeEntitlement: {
        ...entitlement,
        active: true,
        revokedAt: null,
        revokedReason: null,
        disputeId: null,
        updatedAt: now,
      },
    }, { merge: true })
    return true
  })
  if (restored) console.warn('stripe-webhook: lifetime entitlement restored after a won dispute', { uid, paymentIntentId })
  return restored
}

async function flagPaymentFailed(invoice) {
  const uid = await uidForCustomer(invoice.customer)
  if (!uid) return
  await adminDb().collection('users').doc(uid).set({
    subscription: {
      paymentFailed: true,
      // Hosted invoice page the customer can use to retry payment.
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      updatedAt: Date.now(),
    },
  }, { merge: true })
}

async function flagTrialEnding(subscription) {
  const uid = subscription.metadata?.firebaseUid || await uidForCustomer(subscription.customer)
  if (!uid) return
  await adminDb().collection('users').doc(uid).set({
    subscription: {
      trialEndsAt: subscription.trial_end ? subscription.trial_end * 1000 : null,
      trialEndingSoon: true,
      updatedAt: Date.now(),
    },
  }, { merge: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — webhook events cannot be verified')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  let stripe
  try {
    stripe = getStripeServer()
  } catch (err) {
    console.error(err.message)
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await upsertSubscription(event.data.object)
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await upsertSubscription(sub)
      } else {
        await grantLifetimeEntitlement(stripe, session)
      }
      break
    }
    case 'checkout.session.async_payment_succeeded': {
      await grantLifetimeEntitlement(stripe, event.data.object)
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object
      // Partial refunds keep access — only a full refund removes it.
      if (charge && charge.amount_refunded >= charge.amount) {
        await revokeByPaymentIntent(stripe, {
          paymentIntentId: paymentIntentIdOf(charge),
          customerId: charge.customer || null,
          chargeId: charge.id || null,
          reason: 'full_refund',
        })
      }
      break
    }
    // Stripe does NOT emit charge.refunded for a chargeback. Without these the
    // buyer keeps Pro after taking the money back.
    case 'charge.dispute.created':
    case 'charge.dispute.funds_withdrawn': {
      const dispute = event.data.object
      await revokeByPaymentIntent(stripe, {
        paymentIntentId: paymentIntentIdOf(dispute),
        chargeId: typeof dispute?.charge === 'string' ? dispute.charge : dispute?.charge?.id || null,
        disputeId: dispute?.id || null,
        reason: event.type === 'charge.dispute.created' ? 'dispute_created' : 'dispute_funds_withdrawn',
      })
      break
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object
      if (dispute?.status === 'won') await restoreAfterDisputeWon(stripe, dispute)
      break
    }
    case 'invoice.payment_failed': {
      await flagPaymentFailed(event.data.object)
      break
    }
    case 'invoice.paid': {
      // A successful (re)payment clears any prior failure flag.
      const uid = await uidForCustomer(event.data.object.customer)
      if (uid) {
        await adminDb().collection('users').doc(uid).set({
          subscription: { paymentFailed: false, updatedAt: Date.now() },
        }, { merge: true })
      }
      break
    }
    case 'customer.subscription.trial_will_end': {
      await flagTrialEnding(event.data.object)
      break
    }
  }

  return res.status(200).json({ received: true })
}
