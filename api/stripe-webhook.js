import { adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  disputeRestoreDecision,
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
  retrieveSessionWithCharge,
  revocationUpdate,
  subscriptionChargeHealth,
  subscriptionRevocationStamp,
  subscriptionStatusGrantsAccess,
  writeSubscriptionDoc,
} from './_lib/billing.js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function upsertSubscription(stripe, subscription) {
  const uid = subscription.metadata?.firebaseUid
  if (!uid) {
    const userUid = await uidForCustomer(subscription.customer)
    if (!userUid) return
    return writeSubscription(userUid, subscription, null, stripe)
  }
  return writeSubscription(uid, subscription, null, stripe)
}

// The subscription document's SHAPE lives in _lib/billing.js, not here, for two
// reasons that both cost money when they are ignored:
//
//   · `current_period_end` is not a field on Subscription any more. Stripe moved
//     it onto SubscriptionItem in 2025-03-31.basil and stripe@22.2.0 pins
//     2026-05-27.dahlia, so the `sub.current_period_end` this used to read was
//     `undefined` on every SDK path and `currentPeriodEnd` was written null —
//     which silently disables the stale-period safety net in _lib/plans.js. The
//     long note in _lib/billing.js is the evidence.
//   · api/checkout-status.js has to write the SAME document when it reconciles a
//     subscription checkout the webhook never delivered. Two hand-written copies
//     of this object drift, and a drift here puts a customer on the wrong plan.
//
// `db` is injectable so tests/unit/subscription-period-end.test.js can assert
// what THIS CALL SITE writes, not merely what the helper returns.
//
// `stripe` is injectable for the same reason, and it is what makes a RENEWAL
// safe. Every customer.subscription.* delivery lands here, and the write is a
// { merge: true } — which is the only thing that ever made `accessRevoked`
// sticky. Merge onto a document that is not there and the flag is simply gone:
// a charged-back customer whose profile had been deleted was handed Pro back by
// the next renewal, with no action on their part at all. firestore.rules no
// longer lets a client delete that document, and this is the half that does not
// depend on the rule being published.
//
// Only a status that would GRANT access is checked, so an ordinary cancellation
// or past_due delivery costs nothing extra. A clean charge writes exactly the
// document it always wrote — byte for byte, which
// tests/unit/subscription-period-end.test.js pins.
export async function writeSubscription(uid, sub, db = null, stripe = null) {
  const database = db || adminDb()
  if (!stripe || !subscriptionStatusGrantsAccess(sub)) {
    await writeSubscriptionDoc(database, uid, sub)
    return
  }

  const health = await subscriptionChargeHealth(stripe, sub)
  if (health.ok) {
    await writeSubscriptionDoc(database, uid, sub)
    return
  }
  if (!health.dirty) {
    // The charge could not be read. Write the document as before — stamping a
    // revocation on a Stripe hiccup would drop a paying customer to Free, which
    // is worse than the gap this closes — but never silently.
    console.error('stripe-webhook: could not read the charge behind a subscription — written WITHOUT a revocation check', {
      uid, subscriptionId: sub?.id, reason: health.reason, error: health.error || null,
    })
    await writeSubscriptionDoc(database, uid, sub)
    return
  }

  console.warn('stripe-webhook: subscription written with access REVOKED — its latest charge has gone back', {
    uid, subscriptionId: sub?.id, stripeStatus: sub?.status, reason: health.reason,
  })
  await writeSubscriptionDoc(database, uid, sub, Date.now(), subscriptionRevocationStamp(sub, health))
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
    // An already-revoked entitlement is still re-written when a NEWER reason
    // arrives (a refund settling an open dispute, say), so the record always
    // names the most recent thing that happened to the money. Only a delivery
    // that says nothing new skips the write.
    const { changed, fields } = revocationUpdate(entitlement, { reason, chargeId, disputeId })
    if (!changed) return true // already recorded
    tx.set(ref, {
      lifetimeEntitlement: { ...entitlement, ...fields },
    }, { merge: true })
    return true
  })
  if (revoked) console.warn('stripe-webhook: lifetime entitlement revoked', { uid, reason, paymentIntentId })
  return revoked
}

// ── Reversed SUBSCRIPTION payments ──────────────────────────────────────────
//
// revokeByPaymentIntent above only ever touches `lifetimeEntitlement`, and only
// when the entitlement's own paymentIntentId matches. A reversed SUBSCRIPTION
// charge has a PaymentIntent belonging to an invoice, not to the one-off
// purchase — so that transaction found nothing, returned false, and the yearly
// entitlement stayed active while the money went back.
//
// THE USER LINK IS THE HARD PART, and it is why this cannot reuse
// uidForPaymentIntent. That helper reads `metadata.firebaseUid` off the
// PaymentIntent, which api/create-checkout.js stamps at checkout — so it is
// there for the FIRST payment and absent from every renewal, because Stripe
// creates a fresh PaymentIntent per invoice and copies none of our metadata. A
// chargeback almost always lands on a renewal. The reliable link is the
// SUBSCRIPTION's own metadata, which checkout does stamp and which Stripe
// carries for the life of the subscription; the customer lookup stays as a
// fallback for subscriptions created before that was true.
// BOTH HOPS THIS USED TO TAKE WERE DELETED FROM THE API, AND IT WENT INERT.
//
// Until 2026-09-15 this walked `intent.invoice` and then `invoice.subscription`.
// Stripe's Basil release (2025-03-31) removed BOTH: "Removed the `invoice` field
// from the PaymentIntent and Charge objects", and the Invoice lost its top-level
// `subscription` in the same release. So `intent?.invoice` was undefined, the
// `!invoiceId` guard returned null on every single call, and the whole
// revocation path below it was unreachable — a chargeback or refund on a renewal
// left Pro active while the money went back. Exactly the defect the paragraph
// above describes as already fixed once.
//
// It was silent because it is INERT rather than wrong: nothing throws, nothing
// logs, the catch is never reached, and the function returns the same `null` it
// returns for a legitimate one-off payment. No test failed either —
// tests/unit/billing.test.js covers the decision helpers downstream of this
// lookup, not the lookup.
//
// CONFIRMED AGAINST THIS INSTALL, not just the changelog: node_modules/stripe is
// 22.2.0 and pins `ApiVersion = '2026-05-27.dahlia'`, two release trains past
// Basil, and api/_lib/stripe.js constructs `new Stripe(key)` with no apiVersion
// — so the SDK's pinned version is what every request uses and the account's
// dashboard default cannot rescue it.
//
// THE REPLACEMENT IS THE OBJECT BASIL ADDED FOR THIS. InvoicePayment is the
// connection between a payment and an invoice, because an invoice may now be
// paid by several payments. The filter shape is Stripe's own documented one,
// `payment[type]=payment_intent` plus `payment[payment_intent]=<id>`, and the
// subscription moved to `parent.subscription_details.subscription` — guarded on
// `parent.type`, since an invoice can have a different parent entirely.
//
// The PaymentIntent retrieve is gone with it: the list takes the id directly, so
// this is two API calls where it used to be three.
//
// Everything the paragraph above says about the USER link still holds and is
// untouched — the subscription's own metadata is still the reliable link, and
// this function still returns the Subscription for the caller to read it from.
// Exported for tests/unit/chargeback-lookup.test.js, the same way
// writeSubscription is. Vercel only ever reads the default export and `config`,
// so a named export costs the handler nothing — and this function went dead for
// months precisely because nothing could reach it to assert on.
export async function subscriptionForPaymentIntent(stripe, paymentIntentId) {
  if (!paymentIntentId) return null
  try {
    const payments = await stripe.invoicePayments.list({
      payment: { type: 'payment_intent', payment_intent: paymentIntentId },
      limit: 1,
    })
    const invoiceRef = payments?.data?.[0]?.invoice
    const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id
    if (!invoiceId) return null   // a one-off payment, not a subscription charge

    const invoice = await stripe.invoices.retrieve(invoiceId)
    const parent = invoice?.parent
    // `subscription_details` is one of several parent types; an invoice raised
    // for anything else is not a subscription charge and must not be guessed at.
    const subRef = parent?.type === 'subscription_details'
      ? parent?.subscription_details?.subscription
      : undefined
    const subId = typeof subRef === 'string' ? subRef : subRef?.id
    if (!subId) return null

    return await stripe.subscriptions.retrieve(subId)
  } catch (err) {
    console.error('stripe-webhook: could not trace a reversed charge to its subscription', {
      paymentIntentId, error: err?.message,
    })
    return null
  }
}

// Revoke access bought by a subscription payment that has gone back.
//
// `accessRevoked` is a SEPARATE, STICKY field and not a status, because
// writeSubscription() overwrites `status` from Stripe on every
// customer.subscription.* delivery. A disputed subscription commonly still
// reads `active` in Stripe for a while, so a revocation written into `status`
// would be quietly undone by the next event — in the customer's favour, on
// money we no longer hold. api/_lib/plans.js checks the flag ahead of both the
// active check and the past-due grace.
//
// Stripe's own subscription is deliberately NOT cancelled here. Cancelling is
// an irreversible outward action on a live billing account taken off the back
// of one webhook, so what happens to the subscription RECORD stays the founder's
// call and the log line below is what tells them there is one to make.
//
// CORRECTION, 2026-09-16. This comment used to add "and Stripe already cancels
// on a chargeback under its own rules". THAT IS FALSE, and it was load-bearing
// — it is why nobody worried that a disputed subscription keeps running.
// Stripe's own documentation (docs.stripe.com/billing/subscriptions/cancel,
// "Configure automatic cancellation after a dispute") describes
// cancel-on-dispute as a SETTING in the Billing dashboard, off unless the
// account turns it on. Until the founder switches it on, a disputed
// subscription keeps cycling:
// it renews, it invoices, and it fires customer.subscription.updated at this
// webhook every period. That is what turned a deleted user document into a
// repeatable wash rather than a one-off — see writeSubscription above, which now
// re-checks the charge instead of trusting the merge to carry the flag.
//
// Access stops either way, because the flag below is what plans.js reads.
async function revokeSubscriptionAccess(stripe, { paymentIntentId, customerId = null, chargeId = null, disputeId = null, reason }) {
  const sub = await subscriptionForPaymentIntent(stripe, paymentIntentId)
  if (!sub) return false

  const uid = sub.metadata?.firebaseUid || await uidForCustomer(sub.customer || customerId)
  if (!uid) {
    console.error('stripe-webhook: a subscription payment was reversed and no user could be resolved — ACCESS MAY STILL BE ACTIVE', {
      reason, paymentIntentId, chargeId, disputeId, subscriptionId: sub.id, customerId: sub.customer || customerId,
    })
    return false
  }

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  await db.runTransaction(async (tx) => {
    const existing = (await tx.get(ref)).data()?.subscription
    // Stamped ONCE, on the transition. A dispute produces two events (created,
    // then funds_withdrawn) and Stripe retries deliveries, so re-stamping would
    // move the banner's key and re-surface a notice the user had already read.
    // The reason is still updated, so the record names the most recent thing
    // that happened to the money.
    const revokedAt = existing?.accessRevoked === true && Number.isFinite(existing?.accessRevokedAt)
      ? existing.accessRevokedAt
      : Date.now()
    tx.set(ref, {
      subscription: {
        accessRevoked: true,
        accessRevokedAt: revokedAt,
        accessRevokedReason: reason,
        accessRevokedPaymentIntentId: paymentIntentId,
        accessRevokedSubscriptionId: sub.id,
        updatedAt: Date.now(),
      },
    }, { merge: true })
  })

  console.warn('stripe-webhook: subscription access revoked — the Stripe subscription itself was left alone', {
    uid, reason, paymentIntentId, subscriptionId: sub.id, stripeStatus: sub.status,
  })
  return true
}

// Clear a subscription revocation. Only ever called for a dispute closed in our
// favour, and only when it is THIS dispute's revocation being lifted — a won
// dispute on a subscription that was separately refunded stays revoked.
async function restoreSubscriptionAfterDisputeWon(stripe, dispute, paymentIntentId) {
  const sub = await subscriptionForPaymentIntent(stripe, paymentIntentId)
  if (!sub) return false
  const uid = sub.metadata?.firebaseUid || await uidForCustomer(sub.customer)
  if (!uid) return false

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  return db.runTransaction(async (tx) => {
    const existing = (await tx.get(ref)).data()?.subscription
    if (existing?.accessRevoked !== true) return false
    if (existing.accessRevokedPaymentIntentId !== paymentIntentId) return false
    // A refund is final; a won dispute does not undo one.
    if (existing.accessRevokedReason === 'full_refund') return false
    tx.set(ref, {
      subscription: {
        accessRevoked: false,
        accessRevokedAt: null,
        accessRevokedReason: null,
        accessRevokedPaymentIntentId: null,
        accessRevokedSubscriptionId: null,
        updatedAt: Date.now(),
      },
    }, { merge: true })
    console.warn('stripe-webhook: subscription access restored after a won dispute', { uid, paymentIntentId })
    return true
  })
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

  // The dispute payload carries no refund information, so the charge itself is
  // the only thing that can prove the money is actually ours. Without this read,
  // a merchant who refunds to settle a chargeback and then wins it anyway hands
  // the customer their money AND permanent Pro.
  const chargeId = typeof dispute?.charge === 'string' ? dispute.charge : dispute?.charge?.id || null
  let charge = null
  if (chargeId) {
    try {
      charge = await stripe.charges.retrieve(chargeId)
    } catch (err) {
      console.error('stripe-webhook: could not read the charge behind a won dispute — access not restored', {
        uid, disputeId: dispute?.id, chargeId, error: err?.message,
      })
      return false
    }
  }

  const db = adminDb()
  const ref = db.collection('users').doc(uid)
  let refusal = null
  const restored = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const entitlement = snap.data()?.lifetimeEntitlement
    if (!entitlement || entitlement.paymentIntentId !== paymentIntentId) return false
    const decision = disputeRestoreDecision(entitlement, charge, dispute?.id || null)
    if (!decision.ok) {
      refusal = decision.reason
      return false
    }
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
  if (restored) {
    console.warn('stripe-webhook: lifetime entitlement restored after a won dispute', { uid, paymentIntentId })
  } else if (refusal && refusal !== 'already_active') {
    // A won dispute that does NOT restore access is a support case (the buyer
    // stays on Free after we kept the money), so it must be visible in the log.
    console.error('stripe-webhook: won dispute did NOT restore access', {
      uid, disputeId: dispute?.id, chargeId, paymentIntentId, reason: refusal,
    })
  }
  return restored
}

async function flagPaymentFailed(invoice) {
  const uid = await uidForCustomer(invoice.customer)
  if (!uid) return
  const ref = adminDb().collection('users').doc(uid)

  // `paymentFailedAt` is the clock the seven-day grace window runs on
  // (api/_lib/plans.js), so it has to be stamped ONCE — on the transition into
  // failure — and then survive every retry. Stripe fires invoice.payment_failed
  // again on each Smart Retry; re-stamping here would push the window forward
  // each time, which is the same as having no window at all.
  let failedAt = Date.now()
  try {
    const existing = (await ref.get()).data()?.subscription
    if (existing?.paymentFailed === true && Number.isFinite(existing?.paymentFailedAt)) {
      failedAt = existing.paymentFailedAt
    }
  } catch (err) {
    // A read failure must not swallow the failure flag. Stamping "now" can only
    // ever be generous to the customer by at most one retry interval.
    console.error('stripe-webhook: could not read existing payment state', { uid, error: err?.message })
  }

  await ref.set({
    subscription: {
      paymentFailed: true,
      paymentFailedAt: failedAt,
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
      await upsertSubscription(stripe, event.data.object)
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await upsertSubscription(stripe, sub)
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
        const args = {
          paymentIntentId: paymentIntentIdOf(charge),
          customerId: charge.customer || null,
          chargeId: charge.id || null,
          reason: 'full_refund',
        }
        // Both, not either. A charge belongs to exactly one of the two — a
        // one-off purchase or a subscription invoice — and each call is a no-op
        // for the other, so running both removes the need to guess which kind of
        // charge this was before knowing what to revoke.
        await revokeByPaymentIntent(stripe, args)
        await revokeSubscriptionAccess(stripe, args)
      }
      break
    }
    // Stripe does NOT emit charge.refunded for a chargeback. Without these the
    // buyer keeps Pro after taking the money back.
    case 'charge.dispute.created':
    case 'charge.dispute.funds_withdrawn': {
      const dispute = event.data.object
      const args = {
        paymentIntentId: paymentIntentIdOf(dispute),
        chargeId: typeof dispute?.charge === 'string' ? dispute.charge : dispute?.charge?.id || null,
        disputeId: dispute?.id || null,
        reason: event.type === 'charge.dispute.created' ? 'dispute_created' : 'dispute_funds_withdrawn',
      }
      await revokeByPaymentIntent(stripe, args)
      await revokeSubscriptionAccess(stripe, args)
      break
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object
      if (dispute?.status === 'won') {
        await restoreAfterDisputeWon(stripe, dispute)
        await restoreSubscriptionAfterDisputeWon(stripe, dispute, paymentIntentIdOf(dispute))
      }
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
          // Clear the grace anchor and the retry link too, or a customer who
          // has paid keeps being shown a "fix your card" banner pointing at a
          // settled invoice.
          subscription: {
            paymentFailed: false, paymentFailedAt: null, hostedInvoiceUrl: null,
            updatedAt: Date.now(),
          },
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
