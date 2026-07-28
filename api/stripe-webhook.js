import { adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import { lifetimeEntitlementFromSession } from './_lib/billing.js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function upsertSubscription(subscription) {
  const uid = subscription.metadata?.firebaseUid
  if (!uid) {
    const customerId = subscription.customer
    const snap = await adminDb()
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get()
    if (snap.empty) return
    const userUid = snap.docs[0].id
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
async function uidForCustomer(customerId) {
  if (!customerId) return null
  const snap = await adminDb()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
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

async function grantLifetimeEntitlement(session) {
  const uid = session.metadata?.firebaseUid
  const candidate = lifetimeEntitlementFromSession(session)
  if (!uid || !candidate) return false

  const ref = adminDb().collection('users').doc(uid)
  const snap = await ref.get()
  const current = snap.exists ? snap.data() : {}
  if (current?.stripeCustomerId && candidate.customerId !== current.stripeCustomerId) {
    // A paid session we refuse to honour is money taken without access, so it
    // must never fail silently — this is the one branch an owner has to see.
    console.error('stripe-webhook: paid lifetime session rejected — customer mismatch', {
      uid, sessionId: session.id, sessionCustomer: candidate.customerId, userCustomer: current.stripeCustomerId,
    })
    return false
  }
  if (current?.lifetimeEntitlement?.checkoutSessionId === session.id
    && current.lifetimeEntitlement.active === true) return true

  await ref.set({
    lifetimeEntitlement: {
      ...candidate,
      grantedAt: current?.lifetimeEntitlement?.grantedAt || candidate.grantedAt,
    },
  }, { merge: true })
  return true
}

async function revokeLifetimeForFullRefund(charge) {
  if (!charge || charge.amount_refunded < charge.amount) return false
  const uid = await uidForCustomer(charge.customer)
  if (!uid) return false
  const ref = adminDb().collection('users').doc(uid)
  const snap = await ref.get()
  const entitlement = snap.data()?.lifetimeEntitlement
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id
  if (!entitlement?.active || !paymentIntentId || entitlement.paymentIntentId !== paymentIntentId) return false
  const now = Date.now()
  await ref.set({
    lifetimeEntitlement: {
      ...entitlement,
      active: false,
      revokedAt: now,
      revokedReason: 'full_refund',
      refundedChargeId: charge.id || null,
      updatedAt: now,
    },
  }, { merge: true })
  return true
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
        await grantLifetimeEntitlement(session)
      }
      break
    }
    case 'checkout.session.async_payment_succeeded': {
      await grantLifetimeEntitlement(event.data.object)
      break
    }
    case 'charge.refunded': {
      await revokeLifetimeForFullRefund(event.data.object)
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
