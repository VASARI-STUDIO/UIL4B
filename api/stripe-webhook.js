import { adminDb } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import {
  claimStripeEvent,
  completeStripeEvent,
  disputeRestoreDecision,
  lifetimeEntitlementFromSession,
  lifetimeGrantDecision,
  lifetimeGrantHealth,
  releaseStripeEvent,
  retrieveSessionWithCharge,
  revocationUpdate,
  subscriptionChargeHealth,
  subscriptionRevocationStamp,
  subscriptionStatusGrantsAccess,
  writeSubscriptionDoc,
  chargeHasWithdrawalRefund,
  finishWithdrawalRefund,
  withdrawalMarkerFor,
  writeSubscriptionForEvent,
} from './_lib/billing.js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function upsertSubscription(stripe, subscription, eventCreated) {
  const uid = subscription.metadata?.firebaseUid
  if (!uid) {
    const userUid = await uidForCustomer(subscription.customer)
    if (!userUid) return
    return writeSubscription(userUid, subscription, null, stripe, eventCreated)
  }
  return writeSubscription(uid, subscription, null, stripe, eventCreated)
}

// A refund is the 14-day withdrawal's (api/create-portal.js) when the refund itself
// says so: it carries the withdrawal reason and this subscription's id. Reading it
// off the refund, not off a marker on the user document, is what keeps a late
// event for an earlier withdrawal exempt after a later one has rewritten the marker.
// A full refund made by hand carries neither, so it still revokes.
const isWithdrawalRefundOf = (stripe, charge, sub) => chargeHasWithdrawalRefund(stripe, charge?.id, sub?.id)

// A withdrawal whose request died after the cancel but before the refund finished
// is finished here when Stripe reports the subscription deleted, from the amounts
// stored before anything was cancelled. The same idempotent path as the customer's
// own retry, so it can never refund twice. Throws on failure so Stripe redelivers.
export async function finishStrandedWithdrawal(stripe, sub, db = null, now = Date.now()) {
  const database = db || adminDb()
  const uid = sub?.metadata?.firebaseUid || await uidForCustomer(sub?.customer, database)
  if (!uid) return 'no_account'
  const stored = (await database.collection('users').doc(uid).get()).data()?.subscription
  const marker = withdrawalMarkerFor(stored, sub?.id)
  if (marker?.state !== 'pending') return 'nothing_to_finish'
  try {
    await finishWithdrawalRefund({ stripe, db: database, uid, subscriptionId: sub.id, marker, now })
  } catch (err) {
    console.error('stripe-webhook: a cancelled subscription was NOT refunded — its withdrawal refund could not be finished', {
      uid, subscriptionId: sub.id, error: err?.message,
    })
    throw err
  }
  return 'finished'
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
//
// `eventCreated` is the delivering event's `created` time. When it is given, the
// write goes through writeSubscriptionForEvent, which skips a delivery older
// than the stored state (the ordering rules are in _lib/billing.js).
export async function writeSubscription(uid, sub, db = null, stripe = null, eventCreated = null) {
  const database = db || adminDb()
  let extra = null
  if (stripe && subscriptionStatusGrantsAccess(sub)) {
    const health = await subscriptionChargeHealth(stripe, sub)
    if (!health.ok && !health.dirty) {
      // The charge could not be read. Write the document as before — stamping a
      // revocation on a Stripe hiccup would drop a paying customer to Free,
      // which is worse than the gap this closes — but never silently.
      console.error('stripe-webhook: could not read the charge behind a subscription — written WITHOUT a revocation check', {
        uid, subscriptionId: sub?.id, reason: health.reason, error: health.error || null,
      })
    } else if (health.dirty && health.reason === 'full_refund' && await isWithdrawalRefundOf(stripe, health.charge, sub)) {
      // A late delivery of the subscription's pre-cancel state, arriving after the
      // withdrawal refunded its charge. That refund is not a reason to revoke.
      console.warn('stripe-webhook: latest charge refunded by a 14-day withdrawal — no revocation stamped', {
        uid, subscriptionId: sub?.id, stripeStatus: sub?.status,
      })
    } else if (health.dirty) {
      console.warn('stripe-webhook: subscription written with access REVOKED — its latest charge has gone back', {
        uid, subscriptionId: sub?.id, stripeStatus: sub?.status, reason: health.reason,
      })
      extra = subscriptionRevocationStamp(sub, health)
    }
  }

  if (eventCreated == null) {
    await writeSubscriptionDoc(database, uid, sub, Date.now(), extra)
    return
  }
  const decision = await writeSubscriptionForEvent(database, uid, sub, eventCreated, Date.now(), extra)
  if (!decision.write) {
    console.warn('stripe-webhook: subscription delivery skipped — the stored state is newer', {
      uid, subscriptionId: sub?.id, stripeStatus: sub?.status, eventCreated, reason: decision.reason,
    })
  }
}

// Resolves the Firebase uid for a Stripe customer id (used by invoice events
// that don't carry firebaseUid in metadata).
//
// `stripeCustomerId` was client-writable until the firestore.rules lock, so a
// second document claiming the same customer id is a tampering signal, not a
// tie to break. Read two and refuse to guess — writing billing state onto the
// wrong account is worse than not writing it, and the log line is the alert.
async function uidForCustomer(customerId, db = null) {
  if (!customerId) return null
  const snap = await (db || adminDb())
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
//
// THE PAYMENT-TO-SUBSCRIPTION HOP GOES THROUGH InvoicePayment. Stripe's Basil
// API release (2025-03-31) removed `invoice` from the PaymentIntent and Charge
// objects and the top-level `subscription` from the Invoice, so neither can be
// walked. A lookup that tried would get `undefined`, return null on every call
// and leave the revocation path below unreachable, without throwing or logging.
// The SDK in node_modules pins its own ApiVersion and api/_lib/stripe.js passes
// none, so the account's dashboard default does not change this.
//
// InvoicePayment links a payment to an invoice, because an invoice may be paid
// by several payments. The filter is Stripe's documented shape,
// `payment[type]=payment_intent` plus `payment[payment_intent]=<id>`, and the
// subscription is read from `parent.subscription_details.subscription`, guarded
// on `parent.type`, since an invoice can have a different parent entirely. The
// list takes the PaymentIntent id directly, so no PaymentIntent retrieve is
// needed.
//
// The user link is still the subscription's own metadata: this function returns
// the Subscription for the caller to read it from.
// Exported for tests/unit/chargeback-lookup.test.js, the same way
// writeSubscription is. Vercel only ever reads the default export and `config`,
// so a named export costs the handler nothing and the lookup stays testable.
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
// of one webhook, so the subscription record is left for a person to act on,
// and the log line below records that it was left alone.
//
// Stripe does not cancel a disputed subscription by default: cancel-on-dispute
// is a Billing dashboard setting (docs.stripe.com/billing/subscriptions/cancel,
// "Configure automatic cancellation after a dispute"). Without it, a disputed
// subscription keeps renewing, invoicing and firing customer.subscription.updated
// at this webhook every period. writeSubscription above therefore re-checks the
// charge whenever a delivery would grant access, instead of trusting the merge
// to carry the flag.
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

  // The 14-day withdrawal (api/create-portal.js) refunds the whole charge, so
  // this is the normal path for it, not an edge case. The action has already
  // cancelled the subscription, and a sticky `accessRevoked` would keep the
  // customer on Free through a later, legitimate resubscription. Only a refund
  // that carries the withdrawal's stamp for THIS subscription is exempt; any
  // other full refund, and every dispute, still stamps.
  if (reason === 'full_refund' && chargeId
    && await isWithdrawalRefundOf(stripe, { id: chargeId }, sub)) {
    console.warn('stripe-webhook: full refund of a withdrawn subscription — already cancelled, no revocation stamped', {
      uid, paymentIntentId, subscriptionId: sub.id,
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

// Whether Stripe now reports the invoice as paid. A failure event can be
// delivered after a retry has already paid the invoice; flagging it then would
// show a paying customer the failure banner and start their grace window. If
// the invoice cannot be read, the flag is written as it always was.
async function invoiceNowPaid(stripe, invoice) {
  if (!stripe || !invoice?.id) return false
  try {
    const current = await stripe.invoices.retrieve(invoice.id)
    return current?.status === 'paid'
  } catch (err) {
    console.error('stripe-webhook: could not read the failed invoice — flagging it as failed', {
      invoiceId: invoice.id, error: err?.message,
    })
    return false
  }
}

/**
 * Flag a failed invoice payment on the customer's account, unless the invoice
 * has been paid since. Returns 'no_account', 'already_paid' or 'flagged'.
 */
export async function flagPaymentFailed(stripe, invoice, db = null) {
  const database = db || adminDb()
  const uid = await uidForCustomer(invoice.customer, database)
  if (!uid) return 'no_account'
  if (await invoiceNowPaid(stripe, invoice)) {
    console.warn('stripe-webhook: payment failure skipped — the invoice has been paid since', {
      uid, invoiceId: invoice.id,
    })
    return 'already_paid'
  }
  const ref = database.collection('users').doc(uid)

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
      // Which invoice the failure belongs to, so a later invoice.paid only clears
      // the failure it actually settles (clearPaymentFailure). Unlike
      // paymentFailedAt this follows the NEWEST failing invoice.
      failedInvoiceId: invoice.id || null,
      updatedAt: Date.now(),
    },
  }, { merge: true })
  return 'flagged'
}

/**
 * Clear the payment-failure flag when an invoice is paid, but only if that
 * payment settles the failure on record. invoice.paid can arrive late: a paid
 * event for an older invoice delivered after a newer invoice failed must not
 * wipe the newer failure, or the customer keeps Pro with no grace countdown.
 *
 * Returns 'no_account', 'nothing_to_clear', 'cleared' or 'kept_newer_failure'.
 *
 * · Paid invoice is the one that failed: clear.
 * · A different failed invoice is on record: ask Stripe about it and clear only
 *   if it is paid or void. If Stripe cannot be read this THROWS, so the delivery
 *   fails, the claim is released (processStripeEvent) and Stripe retries it;
 *   guessing either way risks a wrongly cleared or a wrongly kept failure.
 * · Legacy record (a failure stored before failedInvoiceId existed): clear unless
 *   the invoice was paid before the failure began. No paid_at: clear, as before.
 */
export async function clearPaymentFailure(stripe, invoice, db = null) {
  const database = db || adminDb()
  const uid = await uidForCustomer(invoice.customer, database)
  if (!uid) return 'no_account'
  const ref = database.collection('users').doc(uid)

  const existing = (await ref.get()).data()?.subscription
  if (existing?.paymentFailed !== true) return 'nothing_to_clear'

  const failedInvoiceId = typeof existing.failedInvoiceId === 'string' && existing.failedInvoiceId
    ? existing.failedInvoiceId
    : null

  if (failedInvoiceId && failedInvoiceId !== invoice.id) {
    const failed = await stripe.invoices.retrieve(failedInvoiceId)
    if (failed?.status !== 'paid' && failed?.status !== 'void') {
      console.warn('stripe-webhook: invoice.paid left the payment failure in place — a different invoice is still unpaid', {
        uid, paidInvoiceId: invoice.id, failedInvoiceId, failedInvoiceStatus: failed?.status ?? null,
      })
      return 'kept_newer_failure'
    }
  } else if (!failedInvoiceId) {
    const paidAt = invoice.status_transitions?.paid_at
    if (Number.isFinite(paidAt) && Number.isFinite(existing.paymentFailedAt) && paidAt * 1000 < existing.paymentFailedAt) {
      console.warn('stripe-webhook: invoice.paid left the payment failure in place — it was paid before the failure began', {
        uid, paidInvoiceId: invoice.id, paidAt: paidAt * 1000, paymentFailedAt: existing.paymentFailedAt,
      })
      return 'kept_newer_failure'
    }
  }

  await ref.set({
    // Clear the grace anchor and the retry link too, or a customer who
    // has paid keeps being shown a "fix your card" banner pointing at a
    // settled invoice.
    subscription: {
      paymentFailed: false, paymentFailedAt: null, hostedInvoiceUrl: null, failedInvoiceId: null,
      updatedAt: Date.now(),
    },
  }, { merge: true })
  return 'cleared'
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

  let outcome
  try {
    outcome = await processStripeEvent(event, { db: adminDb(), stripe })
  } catch (err) {
    // A non-2xx makes Stripe retry, and the released claim lets the retry run.
    console.error('stripe-webhook: event handling failed — Stripe will retry', {
      eventId: event.id, type: event.type, error: err?.message,
    })
    return res.status(500).json({ error: 'Event handling failed' })
  }
  if (outcome === 'in_progress') {
    return res.status(409).json({ error: 'Event is already being handled' })
  }
  return res.status(200).json({ received: true, ...(outcome === 'duplicate' ? { duplicate: true } : {}) })
}

/**
 * Handle a verified event at most once: claim its id, dispatch it, then mark it
 * done. Returns 'processed', 'duplicate' (already handled) or 'in_progress'
 * (another delivery holds the claim). A dispatch that throws releases the claim
 * and rethrows. `dispatch` is injectable for tests/unit/stripe-webhook-delivery.test.js.
 */
export async function processStripeEvent(event, { db, stripe, dispatch = dispatchStripeEvent, now = Date.now() }) {
  const claim = await claimStripeEvent(db, event, now)
  if (claim !== 'claimed') return claim

  try {
    await dispatch(stripe, event, { db })
  } catch (err) {
    try {
      await releaseStripeEvent(db, event.id)
    } catch (releaseErr) {
      console.error('stripe-webhook: could not release a failed event — its retry waits for the claim to lapse', {
        eventId: event.id, error: releaseErr?.message,
      })
    }
    throw err
  }

  try {
    await completeStripeEvent(db, event.id)
  } catch (err) {
    // The event WAS handled. Failing the delivery here would make Stripe send
    // it again, so the record is left to lapse and the response stays a 200.
    console.error('stripe-webhook: event handled but not recorded as done', {
      eventId: event.id, type: event.type, error: err?.message,
    })
  }
  return 'processed'
}

// `db` is the handler's database, passed through by processStripeEvent so the
// invoice handlers (and their tests) use the same one the claim was written to.
// Every other case still opens its own, as before.
async function dispatchStripeEvent(stripe, event, { db = null } = {}) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await upsertSubscription(stripe, event.data.object, event.created)
      break
    }
    case 'customer.subscription.deleted': {
      await upsertSubscription(stripe, event.data.object, event.created)
      await finishStrandedWithdrawal(stripe, event.data.object)
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await upsertSubscription(stripe, sub, event.created)
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
      await flagPaymentFailed(stripe, event.data.object, db)
      break
    }
    case 'invoice.paid': {
      // A successful (re)payment clears the failure it settles, and only that one.
      await clearPaymentFailure(stripe, event.data.object, db)
      break
    }
    case 'customer.subscription.trial_will_end': {
      await flagTrialEnding(event.data.object)
      break
    }
  }
}
