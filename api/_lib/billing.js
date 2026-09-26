import { planForSubscription } from './plans.js'
import { BILLING_INTERVALS, LOOKUP_KEYS } from './pricing.js'

export const LIFETIME_SKU = LOOKUP_KEYS.lifetime

// A Checkout Session's terminal fields (`status`, `payment_status`) are frozen
// the moment the payment completes — they keep reporting 'complete' / 'paid'
// forever, even after a full refund or a lost chargeback. So every grant path
// must ALSO look at the underlying charge, which is retrieved by expanding this
// path on the session.
export const LIFETIME_SESSION_EXPAND = ['payment_intent.latest_charge']

export function parseBillingInterval(value) {
  return typeof value === 'string' && BILLING_INTERVALS.includes(value) ? value : null
}

export function isPaidLifetimeSession(session) {
  return !!session
    && session.mode === 'payment'
    && session.status === 'complete'
    && session.payment_status === 'paid'
    && session.metadata?.entitlementSku === LIFETIME_SKU
    && typeof session.metadata?.firebaseUid === 'string'
    && session.metadata.firebaseUid.length > 0
}

// Retrieves a Checkout Session with the charge expanded, so the caller can see
// the money's CURRENT state rather than its state at purchase time.
export function retrieveSessionWithCharge(stripe, sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, { expand: LIFETIME_SESSION_EXPAND })
}

export function chargeForSession(session) {
  const intent = session?.payment_intent
  if (!intent || typeof intent === 'string') return null
  const charge = intent.latest_charge
  return charge && typeof charge === 'object' ? charge : null
}

export function chargeIsClean(charge) {
  return !!charge
    && charge.refunded === false
    && charge.amount_refunded === 0
    && charge.disputed !== true
}

// The single gate every lifetime grant must pass. Returns a machine-readable
// reason so the caller can log exactly why money was taken without access being
// granted — the one billing branch an owner always has to see.
export function lifetimeGrantHealth(session) {
  if (!isPaidLifetimeSession(session)) return { ok: false, reason: 'not_a_paid_lifetime_session' }
  const charge = chargeForSession(session)
  if (!charge) return { ok: false, reason: 'charge_not_expanded' }
  if (charge.disputed === true) return { ok: false, reason: 'charge_disputed' }
  if (charge.refunded !== false) return { ok: false, reason: 'charge_refunded' }
  if (charge.amount_refunded !== 0) return { ok: false, reason: 'charge_partially_refunded' }
  return { ok: true, reason: null, charge }
}

// Builds the entitlement fields a revocation writes, given what is already on
// the user document. Pure so it can be unit-tested without Firestore.
//
// A re-revocation keeps the ORIGINAL revokedAt — that is when access actually
// ended — but always adopts the newest reason and ids. The record has to
// describe the most recent thing that happened to the money, because
// disputeRestoreDecision reads revokedReason to decide whether access may ever
// come back: a refund landing after a dispute MUST overwrite 'dispute_created'
// rather than be swallowed as "already revoked", or winning the dispute later
// would hand a refunded customer permanent Pro.
//
// `changed: false` means the document already says exactly this, so the caller
// can skip the write and stay idempotent under webhook re-delivery.
export function revocationUpdate(entitlement, { reason, chargeId = null, disputeId = null }, now = Date.now()) {
  const fields = {
    active: false,
    revokedAt: entitlement?.revokedAt || now,
    revokedReason: reason,
    refundedChargeId: chargeId || entitlement?.refundedChargeId || null,
    disputeId: disputeId || entitlement?.disputeId || null,
    updatedAt: now,
  }
  const alreadyRecorded = entitlement?.active === false
    && !!entitlement?.revokedAt
    && entitlement.revokedReason === fields.revokedReason
    && (entitlement.refundedChargeId || null) === fields.refundedChargeId
    && (entitlement.disputeId || null) === fields.disputeId
  return { changed: !alreadyRecorded, fields }
}

// Decides whether a dispute closed in our favour may restore access. Pure so it
// can be unit-tested without Firestore or Stripe.
//
// The dispute payload says nothing about refunds, so the caller must retrieve
// the charge and pass it here. Without that, this sequence gives away Pro for
// free: dispute opened (revoked) → merchant refunds to settle → dispute closed
// 'won' → restored. The customer has their money AND their access.
export function disputeRestoreDecision(entitlement, charge, disputeId = null) {
  if (!entitlement) return { ok: false, reason: 'no_entitlement' }
  if (entitlement.active === true) return { ok: false, reason: 'already_active' }
  // Only a dispute-driven revocation is reversible here. A refund revocation
  // (or any other reason) stays put — that money did not come back.
  if (!String(entitlement.revokedReason || '').startsWith('dispute')) {
    return { ok: false, reason: 'not_revoked_for_a_dispute' }
  }
  // A second, still-open dispute overwrites disputeId when it revokes, so an
  // older dispute closing in our favour must not undo the newer revocation.
  if (disputeId && entitlement.disputeId && entitlement.disputeId !== disputeId) {
    return { ok: false, reason: 'revoked_for_a_different_dispute' }
  }
  if (!charge) return { ok: false, reason: 'charge_unavailable' }
  // `charge.disputed` is a historical marker: it records that a dispute happened
  // and is not reliably cleared when one closes, so demanding it be false could
  // mean a won dispute never restores access. This path is only reached from
  // charge.dispute.closed/won for THIS dispute — already matched above — so the
  // flag is the very condition being resolved. Every other cleanliness signal
  // chargeIsClean checks (refunded, amount_refunded) still has to hold.
  if (!chargeIsClean({ ...charge, disputed: false })) return { ok: false, reason: 'charge_refunded' }
  return { ok: true, reason: null }
}

export function lifetimeEntitlementFromSession(session, grantedAt = Date.now()) {
  if (!isPaidLifetimeSession(session)) return null
  return {
    active: true,
    sku: LIFETIME_SKU,
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
    grantedAt,
    updatedAt: grantedAt,
    revokedAt: null,
    revokedReason: null,
    // Cleared explicitly: these docs are written with { merge: true }, so a
    // stale id from a previous revocation would otherwise survive a repurchase.
    refundedChargeId: null,
    disputeId: null,
  }
}

// Decides whether an entitlement write may proceed, given what is already on
// the user document. Pure so it can be unit-tested without Firestore.
//
// - already active for THIS session → nothing to do (idempotent re-delivery)
// - revoked for THIS session        → refuse; a refunded/disputed purchase must
//                                     never be restored by a webhook re-delivery
// - revoked for a DIFFERENT session → allow; this is a legitimate repurchase,
//                                     and the new session's charge was already
//                                     proved clean by lifetimeGrantHealth
export function lifetimeGrantDecision(current, candidate) {
  const existing = current?.lifetimeEntitlement || null
  if (!candidate) return { action: 'skip', reason: 'no_candidate' }
  if (existing?.active === true && !existing.revokedAt) {
    return existing.checkoutSessionId === candidate.checkoutSessionId
      ? { action: 'noop', reason: 'already_granted' }
      : { action: 'noop', reason: 'already_active_other_session' }
  }
  if (existing?.revokedAt) {
    if (existing.checkoutSessionId === candidate.checkoutSessionId) {
      return { action: 'refuse', reason: 'revoked_session_replay' }
    }
    return { action: 'grant', reason: 'repurchase_after_revocation', grantedAt: candidate.grantedAt }
  }
  return { action: 'grant', reason: 'first_grant', grantedAt: existing?.grantedAt || candidate.grantedAt }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION PERIOD END — read it off the ITEM, never off the Subscription
// ─────────────────────────────────────────────────────────────────────────────
// Stripe moved `current_period_end` (and `current_period_start`) OFF the
// Subscription object and ONTO SubscriptionItem in API version
// 2025-03-31.basil. stripe@22.2.0 pins 2026-05-27.dahlia
// (node_modules/stripe/cjs/apiVersion.js), so every Subscription this SDK
// returns has NO top-level `current_period_end`:
//
//   · node_modules/stripe/cjs/resources/Subscriptions.d.ts mentions the name
//     only as a LIST FILTER (`current_period_end?: RangeQueryParam | number`)
//     and as prose inside the `cancel_at_period_end` docstring.
//   · node_modules/stripe/cjs/resources/SubscriptionItems.d.ts:54 declares
//     `current_period_end: number` — required, on the ITEM.
//
// The webhook used to read `sub.current_period_end` directly, so it wrote
// `currentPeriodEnd: null` on every path that goes through the SDK. Three
// things went quiet, and the third is the one that costs money:
//
//   1. Settings.jsx's "renews" / "access until" date disappears.
//   2. billingState.js's cancel-scheduled banner never fires, so a customer
//      who cancelled is never told when access actually ends.
//   3. THE STALE-PERIOD SAFETY NET at api/_lib/plans.js and
//      SubscriptionContext.jsx — "an active subscription whose period end is a
//      day stale is not active" — is INERT against a null. A subscription whose
//      webhooks stop arriving then stays Pro on `status` alone, forever.
//
// The raw `customer.subscription.*` webhook payload is a separate matter: its
// shape follows the API version configured on the endpoint in the Stripe
// dashboard, which cannot be read from here. So the top-level field is still
// honoured as a FALLBACK — an old-version endpoint keeps working — but the item
// is asked first, because that is where a current-version payload keeps it.
//
// The MAXIMUM across items, not the first: a subscription with items on
// different billing cycles has several period ends, and the one that matters
// for "when does access stop" is the last of them. Understating it would revoke
// a paying customer a cycle early.
function periodEndSeconds(sub) {
  const items = Array.isArray(sub?.items?.data) ? sub.items.data : []
  let latest = null
  for (const item of items) {
    const end = item?.current_period_end
    if (Number.isFinite(end) && end > 0 && (latest === null || end > latest)) latest = end
  }
  if (latest !== null) return latest
  const legacy = sub?.current_period_end
  return Number.isFinite(legacy) && legacy > 0 ? legacy : null
}

/** The subscription's period end in MILLISECONDS, or null if Stripe gave none. */
export function subscriptionPeriodEnd(sub) {
  const seconds = periodEndSeconds(sub)
  return seconds === null ? null : seconds * 1000
}

// The exact `subscription` document the webhook writes, as a pure value.
//
// It lives here rather than inside api/stripe-webhook.js because
// api/checkout-status.js has to write the SAME shape when it reconciles a
// subscription checkout the webhook never delivered. Two hand-written copies of
// this object is how the reconcile path and the webhook path drift, and a drift
// here is a customer on the wrong plan.
//
// WHY ONLY A HEALTHY STATUS CLEARS THE FAILURE FLAGS. This used to clear them
// unconditionally, and Stripe sends customer.subscription.updated (status →
// past_due) alongside invoice.payment_failed with no ordering guarantee — so
// whenever the subscription event landed second it wiped the flag the invoice
// event had just set. The visible symptom was the failure banner never
// appearing; the invisible one is that clearing `paymentFailedAt` destroys the
// grace window's anchor and drops a retrying customer straight to Free.
//
// `accessRevoked` is deliberately NOT written here. It is the sticky field that
// records money going back, it is cleared in exactly one place (a dispute closed
// in our favour), and these fields are merged — so a revocation survives every
// subsequent subscription write, which is the entire point of it being separate
// from `status`.
/**
 * The two Stripe statuses that hand out Pro (api/_lib/plans.js). One
 * definition, because two callers now branch on it: the document builder below,
 * which only clears the failure flags on a healthy status, and the charge check
 * further down, which only spends Stripe calls on a write that could grant.
 */
export function subscriptionStatusGrantsAccess(sub) {
  return sub?.status === 'active' || sub?.status === 'trialing'
}

export function subscriptionDocFields(sub, now = Date.now()) {
  const healthy = subscriptionStatusGrantsAccess(sub)
  const recovery = healthy
    ? { paymentFailed: false, paymentFailedAt: null, hostedInvoiceUrl: null }
    : {}
  return {
    id: sub?.id,
    status: sub?.status,
    priceId: sub?.items?.data?.[0]?.price?.id || null,
    interval: sub?.items?.data?.[0]?.price?.recurring?.interval || null,
    // Quarterly is interval 'month' with interval_count 3; readers need the
    // count to tell it from monthly (src/utils/billingCadence.js).
    intervalCount: sub?.items?.data?.[0]?.price?.recurring?.interval_count || null,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
    trialEndsAt: sub?.trial_end ? sub.trial_end * 1000 : null,
    ...recovery,
    updatedAt: now,
  }
}

/**
 * Merge the subscription document onto users/{uid}. The one writer.
 *
 * `extra` is how a caller adds the sticky revocation fields that
 * subscriptionDocFields deliberately refuses to know about. It is null on every
 * ordinary write, so the document this produces is unchanged for them.
 */
export function writeSubscriptionDoc(db, uid, sub, now = Date.now(), extra = null) {
  return db.collection('users').doc(uid).set({
    subscription: { ...subscriptionDocFields(sub, now), ...(extra || {}) },
  }, { merge: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MONEY BEHIND A SUBSCRIPTION — asked of Stripe, not of our own document
// ─────────────────────────────────────────────────────────────────────────────
// `subscription.accessRevoked` is sticky ONLY because every later write is a
// { merge: true } onto the document that carries it. That made users/{uid} the
// flag's single point of failure: while firestore.rules allowed the owner to
// delete their own profile, a customer could charge back, delete the document,
// and have the next subscription write rebuild it clean — on Free-to-Pro terms,
// with the money already returned. The rule is closed now; this is the half
// that does not depend on it.
//
// WHY THE LATEST INVOICE'S CHARGE. It is the same question the one-off LIFETIME
// path has always asked (lifetimeGrantHealth → chargeIsClean): a Checkout
// Session's `status` and a Subscription's `status` are both frozen or lagging
// with respect to the money. Stripe commonly keeps reporting `active` right
// through a dispute — and, unless the dashboard's cancel-on-dispute setting is
// switched on, keeps CYCLING the subscription too. The charge is the only object
// that says where the money actually is.
//
// TWO HOPS, and both were chosen against this install rather than from memory.
// Stripe's Basil release removed `Invoice.charge` and `Invoice.payment_intent`;
// stripe@22.2.0 pins 2026-05-27.dahlia, two trains past it. What replaced them
// is `Invoice.payments`, an expandable ApiList<InvoicePayment> whose
// `payment.payment_intent` is the link (node_modules/stripe/cjs/resources/
// Invoices.d.ts:353 and InvoicePayments.d.ts). Expanding
// `latest_invoice.payments` on the subscription and `latest_charge` on the
// intent keeps every expansion two levels deep — the five-segment path a single
// expand would need is past Stripe's limit, and a silently unexpanded field here
// is exactly how the old invoice walk went inert for months.
export const SUBSCRIPTION_CHARGE_EXPAND = ['latest_invoice.payments']

/**
 * The payment ids an expanded invoice points at. Pure, so the shape above can be
 * asserted without Stripe. `is_default` is preferred because Stripe creates that
 * InvoicePayment when the invoice is finalised and keeps it in step with the
 * amount due; the others are partial payments.
 */
export function invoicePaymentRefs(invoice) {
  const payments = Array.isArray(invoice?.payments?.data) ? invoice.payments.data : []
  const chosen = payments.find((p) => p?.is_default) || payments[0] || null
  const payment = chosen?.payment || null
  const intent = payment?.payment_intent
  const charge = payment?.charge
  return {
    paymentIntentId: typeof intent === 'string' ? intent : intent?.id || null,
    chargeId: typeof charge === 'string' ? charge : charge?.id || null,
    intent: intent && typeof intent === 'object' ? intent : null,
  }
}

/** The Charge behind a subscription's latest invoice, or null if there is none. */
export async function latestSubscriptionCharge(stripe, sub) {
  const ref = sub?.latest_invoice
  if (!ref) return null
  let invoice = ref && typeof ref === 'object' ? ref : null
  const invoiceId = typeof ref === 'string' ? ref : ref?.id || null
  if (!invoice?.payments && invoiceId) {
    invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payments'] })
  }
  const { paymentIntentId, chargeId, intent } = invoicePaymentRefs(invoice)
  // Already expanded by the caller's own expand — no second round trip.
  const expanded = chargeForSession({ payment_intent: intent })
  if (expanded) return expanded
  // InvoicePayment.payment.charge is only surfaced when the charge has no
  // PaymentIntent behind it (Stripe's own note on the field).
  if (chargeId) return await stripe.charges.retrieve(chargeId)
  if (!paymentIntentId) return null
  const fresh = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
  return chargeForSession({ payment_intent: fresh })
}

/**
 * Whether a subscription charge is money we still hold. Pure.
 *
 * `chargeIsClean` is the shared definition of a clean charge and is asked first.
 * What it CANNOT be used for on its own here is the dirty verdict: it also
 * refuses a partial refund, and on a subscription a partial refund is routinely
 * a goodwill credit to a customer who is still paying. Revoking Pro over one
 * would be a worse bug than the one this closes, so only the two conditions the
 * revocation webhooks themselves act on — a dispute, or a FULL refund
 * (api/stripe-webhook.js `charge.amount_refunded >= charge.amount`) — count as
 * dirty.
 *
 * The reasons are the webhook's own vocabulary on purpose: a refund writes
 * `full_refund`, which is the exact string restoreSubscriptionAfterDisputeWon
 * refuses to lift, so a customer who is refunded AND wins a dispute does not get
 * access back on a technicality.
 */
export function subscriptionMoneyHealth(charge) {
  if (!charge) return { ok: true, dirty: false, reason: 'no_charge_to_inspect' }
  if (chargeIsClean(charge)) return { ok: true, dirty: false, reason: null }
  if (charge.disputed === true) return { ok: false, dirty: true, reason: 'charge_disputed' }
  const refunded = Number(charge.amount_refunded) || 0
  const amount = Number(charge.amount) || 0
  if (charge.refunded === true || (refunded > 0 && refunded >= amount)) {
    return { ok: false, dirty: true, reason: 'full_refund' }
  }
  return { ok: true, dirty: false, reason: 'partial_refund_only' }
}

/**
 * The async wrapper. `dirty` and `ok` are separate answers on purpose, and the
 * two callers treat the gap between them differently:
 *
 *   · dirty  — Stripe positively says the money went back. Both callers stamp
 *              the revocation.
 *   · !ok and !dirty — the charge could not be read at all. The RECONCILE path
 *              refuses to write (it is about to grant access on an unverified
 *              charge, and the webhook remains the primary grant path), while
 *              the WEBHOOK path writes the ordinary document and logs. Stamping
 *              a revocation on a Stripe hiccup would drop a paying customer to
 *              Free, which is the worse of the two errors.
 */
export async function subscriptionChargeHealth(stripe, sub) {
  let charge = null
  try {
    charge = await latestSubscriptionCharge(stripe, sub)
  } catch (err) {
    return { ok: false, dirty: false, reason: 'charge_unreadable', charge: null, error: err?.message || String(err) }
  }
  return { ...subscriptionMoneyHealth(charge), charge }
}

/**
 * The sticky fields a charge-driven revocation adds to a subscription write.
 *
 * `accessRevokedAt` is deliberately absent. api/stripe-webhook.js stamps it ONCE
 * inside a transaction, on the transition, because it keys the customer's banner
 * and re-stamping re-surfaces a notice they have already read — and this write
 * happens on every subscription event, so it is exactly the caller that must not
 * touch it. A merge leaves any existing value alone.
 *
 * `accessRevokedPaymentIntentId` is only included when the charge names one, for
 * the same reason: it is what restoreSubscriptionAfterDisputeWon matches on, and
 * writing null over a good value would strand a customer who later wins.
 */
export function subscriptionRevocationStamp(sub, health, now = Date.now()) {
  const intent = health?.charge?.payment_intent
  const paymentIntentId = typeof intent === 'string' ? intent : intent?.id || null
  return {
    accessRevoked: true,
    accessRevokedReason: health?.reason || 'charge_disputed',
    accessRevokedSubscriptionId: sub?.id || null,
    ...(paymentIntentId ? { accessRevokedPaymentIntentId: paymentIntentId } : {}),
    updatedAt: now,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION RECONCILE — the safety net the one-off path already had
// ─────────────────────────────────────────────────────────────────────────────
// api/checkout-status.js reconciles a paid ONE-OFF session inside a transaction
// precisely because a completed payment must never depend on a single webhook
// delivery. A SUBSCRIPTION checkout had no equivalent: if
// checkout.session.completed and customer.subscription.created both failed to
// arrive (a wrong STRIPE_WEBHOOK_SECRET, a disabled endpoint, a 500 during a
// Firestore blip), a customer who had just paid sat on Free until a Stripe
// retry happened to succeed — while /checkout/return told them "Your Pro
// subscription is active".
//
// This decides whether to reconcile, and it refuses in the two cases where
// writing would be wrong rather than merely redundant.
export function subscriptionReconcileDecision(userData, session) {
  if (session?.mode !== 'subscription') return { reconcile: false, reason: 'not_a_subscription_session' }
  if (session?.status !== 'complete') return { reconcile: false, reason: 'session_not_complete' }
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id || null
  if (!subscriptionId) return { reconcile: false, reason: 'no_subscription_on_session' }
  const stored = userData?.subscription || null
  // Money that has gone back is not reconciled back into access. `accessRevoked`
  // is sticky for exactly this reason, and re-reading Stripe (which commonly
  // still reports `active` through a dispute) must not be a way around it.
  if (stored?.accessRevoked === true) return { reconcile: false, reason: 'access_revoked' }
  // Already Pro on the strength of this subscription — the webhook landed.
  if (stored?.id === subscriptionId && planForSubscription(stored).id === 'pro') {
    return { reconcile: false, reason: 'already_applied' }
  }
  return { reconcile: true, reason: stored?.id ? 'stored_state_is_stale' : 'webhook_never_landed', subscriptionId }
}

// Retrieve the subscription behind a completed checkout and write it through the
// same shape the webhook writes. Returns whether the account is Pro afterwards.
//
// The session has already been proved to belong to this account by the caller
// (checkout-status 403s on a firebaseUid mismatch before this runs), so this can
// only ever write what the webhook itself would have written — Stripe remains
// the authority on the subscription's status. It cannot fabricate access: a
// subscription Stripe calls `incomplete` reconciles to Free.
export async function reconcileSubscriptionCheckout({ stripe, db, uid, session, userData, customerId = null, now = Date.now() }) {
  const decision = subscriptionReconcileDecision(userData, session)
  if (!decision.reconcile) {
    return { reconciled: false, reason: decision.reason, isPro: planForSubscription(userData?.subscription || null).id === 'pro' }
  }
  let sub
  try {
    sub = await stripe.subscriptions.retrieve(decision.subscriptionId, { expand: SUBSCRIPTION_CHARGE_EXPAND })
  } catch (err) {
    // A paid subscription we could not confirm is a customer on Free with money
    // gone — never silent. (The founder's standing rule on empty catches.)
    console.error('checkout-status: could not retrieve the subscription behind a paid checkout — the account may still be on Free', {
      uid, sessionId: session?.id, subscriptionId: decision.subscriptionId, error: err?.message, type: err?.type,
    })
    return { reconciled: false, reason: 'retrieve_failed', isPro: false }
  }
  const subCustomer = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id || null
  if (customerId && subCustomer && subCustomer !== customerId) {
    console.error('checkout-status: subscription reconcile refused — customer mismatch', {
      uid, sessionId: session?.id, subscriptionId: decision.subscriptionId, subCustomer, customerId,
    })
    return { reconciled: false, reason: 'customer_mismatch', isPro: false }
  }
  // THE MONEY, not just our own flag. `subscriptionReconcileDecision` above
  // refuses on `stored.accessRevoked`, and until now that was the ONLY
  // revocation guard on this path — a flag read off the very document the
  // customer was allowed to delete. Deleting it made `stored` null, which made
  // the guard vacuous, and a Stripe subscription that keeps reporting `active`
  // through a dispute did the rest. So ask Stripe what happened to the charge,
  // which no client can delete.
  //
  // Only for a status that would GRANT: an `incomplete` or `canceled`
  // subscription reconciles to Free on its own and is not worth two API calls.
  let health = { ok: true, dirty: false, reason: 'status_grants_nothing', charge: null }
  if (subscriptionStatusGrantsAccess(sub)) {
    health = await subscriptionChargeHealth(stripe, sub)
  }
  if (!health.ok && !health.dirty) {
    // Could not read the charge. Refusing leaves a paying customer on Free until
    // the webhook lands, which is recoverable and loud; writing would grant Pro
    // on money nobody has verified, which is not.
    console.error('checkout-status: subscription reconcile refused — the charge behind this subscription could not be read', {
      uid, sessionId: session?.id, subscriptionId: sub?.id, reason: health.reason, error: health.error || null,
    })
    return { reconciled: false, reason: health.reason, isPro: false }
  }

  // A dirty charge is still WRITTEN DOWN, with the revocation stamped, rather
  // than skipped. Skipping would leave the document absent and let the next
  // renewal try again; writing puts the sticky flag back where every later
  // merge preserves it.
  const stamp = health.dirty ? subscriptionRevocationStamp(sub, health, now) : null
  await writeSubscriptionDoc(db, uid, sub, now, stamp)
  const isPro = planForSubscription({ ...subscriptionDocFields(sub, now), ...(stamp || {}) }).id === 'pro'
  if (stamp) {
    console.error('checkout-status: a reconcile rebuilt a subscription whose money had gone back — access stays REVOKED', {
      uid, sessionId: session?.id, subscriptionId: sub?.id, stripeStatus: sub?.status, reason: health.reason,
    })
    return { reconciled: false, reason: health.reason, isPro }
  }
  console.warn('checkout-status: reconciled a paid subscription the webhook had not applied', {
    uid, sessionId: session?.id, subscriptionId: sub?.id, stripeStatus: sub?.status, reason: decision.reason, isPro,
  })
  return { reconciled: true, reason: decision.reason, isPro }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE STRIPE CUSTOMER PER ACCOUNT, under concurrency
// ─────────────────────────────────────────────────────────────────────────────
// api/create-checkout.js used to read `stripeCustomerId`, create a customer when
// it was absent, then merge the id back. Two first checkouts in flight — a
// double click, two tabs — both read null, both create, and the second write
// wins. The first customer is orphaned in Stripe with metadata.firebaseUid
// pointing at the same account, and `uidForCustomer` in the webhook (which
// refuses to guess when two documents claim one customer) is not the same guard
// in the other direction: it protects one customer with two accounts, not one
// account with two customers.
//
// TWO GUARDS, because neither alone is enough:
//
//   1. AN IDEMPOTENCY KEY derived from the uid. Stripe replays the FIRST
//      response for a repeated create under the same key, so two concurrent
//      creates collapse to one customer instead of two. This is the half that
//      actually closes the race — a search-then-create still has a window
//      between the search and the create.
//   2. A TRANSACTION that re-reads the document before claiming it. If another
//      request stored an id first, that id wins and this one is discarded, so
//      the document can only ever name one customer. This is the half that
//      stops a lost update if Stripe's key ever expires (they last 24 hours).
export const customerIdempotencyKey = (uid) => `uil4b:create-customer:${uid}`

export async function ensureStripeCustomer(stripe, db, uid, known = null) {
  if (known) return known
  const ref = db.collection('users').doc(uid)
  const existing = (await ref.get()).data()?.stripeCustomerId
  if (existing) return existing
  const customer = await stripe.customers.create(
    { metadata: { firebaseUid: uid } },
    { idempotencyKey: customerIdempotencyKey(uid) },
  )
  return db.runTransaction(async (tx) => {
    const claimed = (await tx.get(ref)).data()?.stripeCustomerId
    // Another request in flight claimed the document first. Its id is the one
    // the webhook's customer lookup will resolve, so it wins; ours is at worst
    // the same customer replayed by the idempotency key.
    if (claimed) return claimed
    tx.set(ref, { stripeCustomerId: customer.id }, { merge: true })
    return customer.id
  })
}
