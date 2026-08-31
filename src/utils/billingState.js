// Billing state the user needs to be TOLD about, derived from the subscription
// document api/stripe-webhook.js writes to users/{uid}.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The webhook has always written `paymentFailed`, `hostedInvoiceUrl`,
// `trialEndsAt` and `trialEndingSoon`. Grepping src/ for any of them returned
// zero hits — finished backend work with no front end. The consequence for a
// real customer: an expired card silently removed Pro, and they found out by
// hitting a limit. No banner, no email, and no link to the Stripe retry page we
// had already stored for them.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY GRACE IS ANCHORED ON paymentFailedAt, NOT currentPeriodEnd
// ─────────────────────────────────────────────────────────────────────────────
// The obvious anchor is wrong. When a subscription renews, Stripe advances
// current_period_end FIRST and then finalises the invoice — so by the time an
// invoice fails, the period end is already a month out. Grace measured from it
// would run ~37 days, not 7.
//
// So the webhook stamps `paymentFailedAt` once, on the TRANSITION into failure,
// and leaves it alone across Stripe's retry attempts. Grace runs from the
// moment the payment actually broke, which is the only honest clock.
//
// Kept DOM-free and React-free: these are rules about money, and rules about
// money should be testable without a browser. See tests/unit/billing-state.test.js.

const DAY_MS = 86_400_000

// Stripe retries a failed charge for days (Smart Retries defaults to ~3 weeks)
// before giving up. Cutting a paying customer off on the first failed charge
// punishes an expired card as if it were a cancellation. Seven days keeps them
// working while they fix it, and is short enough that nobody farms it.
//
// ⚠️ This is mirrored in api/_lib/plans.js, which is the security boundary and
// the only number that actually grants anything. tests/unit/plan-limits.test.js
// fails if the two drift.
export const PAST_DUE_GRACE_MS = 7 * DAY_MS

// How close to the end of a trial we start saying so. Matches Stripe's own
// customer.subscription.trial_will_end timing, so the banner and the flag the
// webhook sets from that event agree rather than fighting.
export const TRIAL_WARN_MS = 3 * DAY_MS

// Statuses where Stripe is still trying to collect. `unpaid` is deliberately
// absent: it means the retry schedule is exhausted, which is a different
// message and no longer deserves access.
const RETRYING = new Set(['past_due'])

export function daysBetween(from, to) {
  return Math.max(0, Math.ceil((to - from) / DAY_MS))
}

// When Pro stops for a subscription whose payment is failing. Null when we have
// no failure timestamp — in which case there is no grace at all, because a
// grace window with no start is one that never ends.
export function graceEndsAt(sub) {
  const startedAt = sub?.paymentFailedAt
  if (!Number.isFinite(startedAt)) return null
  return startedAt + PAST_DUE_GRACE_MS
}

// True while a failing subscription should still be treated as Pro.
export function isWithinPastDueGrace(sub, now = Date.now()) {
  if (!sub || !RETRYING.has(sub.status)) return false
  const ends = graceEndsAt(sub)
  return ends !== null && now <= ends
}

// The one thing worth interrupting the user about, or null. Ordered by cost to
// them: losing access outranks about-to-lose-access outranks scheduled-to-end.
//
// Returns plain data — no copy, no markup. The component decides how to say it,
// this decides whether there is anything to say.
export function billingAlert(sub, { now = Date.now() } = {}) {
  if (!sub) return null

  // ── Payment reversed ───────────────────────────────────────────────────────
  // A refund or a chargeback on a subscription charge. FIRST, ahead of every
  // other alert, because it is the only one where the user has already lost
  // access — and because a "your card failed, update it" banner shown to
  // someone who charged the payment back would be both wrong and insulting.
  //
  // Not dismissible in practice: the key is stamped once at revocation, so it
  // stays keyed to that event rather than re-appearing on every write.
  if (sub.accessRevoked === true) {
    return {
      kind: 'payment-reversed',
      // 'dispute_created' | 'dispute_funds_withdrawn' | 'refund' — the banner
      // does not print this, but support needs it and so does a bug report.
      reason: sub.accessRevokedReason || null,
      revokedAt: sub.accessRevokedAt || null,
      severity: 'urgent',
      key: `reversed:${sub.accessRevokedAt || sub.updatedAt || 0}`,
    }
  }

  // ── Payment trouble ────────────────────────────────────────────────────────
  // `canceled` is excluded: once Stripe has cancelled, a retry link is a dead
  // end and the honest message is "resubscribe", which the plans page already
  // is. A stale paymentFailed flag on a cancelled subscription must not shout.
  if (sub.paymentFailed && sub.status !== 'canceled') {
    const ends = graceEndsAt(sub)
    const inGrace = isWithinPastDueGrace(sub, now)
    return {
      kind: inGrace ? 'payment-failed' : 'payment-lapsed',
      // The exact Stripe page where the card can be fixed. Written by the
      // webhook from invoice.hosted_invoice_url since the day it was built.
      hostedInvoiceUrl: sub.hostedInvoiceUrl || null,
      graceEndsAt: ends,
      daysLeft: inGrace && ends !== null ? daysBetween(now, ends) : 0,
      severity: 'urgent',
      // Keyed on the failure instant so a NEW failure re-surfaces a banner the
      // user dismissed for a previous one.
      key: `payment:${sub.paymentFailedAt || sub.updatedAt || 0}`,
    }
  }

  // ── Trial ending ───────────────────────────────────────────────────────────
  // Guarded on live status and a future date rather than on `trialEndingSoon`
  // alone: nothing in the webhook ever sets that flag back to false, so on its
  // own it would keep announcing a trial that ended months ago. Reading it as
  // one of the two ways in still honours whatever timing is configured in the
  // Stripe dashboard.
  if (sub.status === 'trialing' && Number.isFinite(sub.trialEndsAt) && sub.trialEndsAt > now) {
    const soon = sub.trialEndingSoon === true || sub.trialEndsAt - now <= TRIAL_WARN_MS
    if (soon) {
      return {
        kind: 'trial-ending',
        trialEndsAt: sub.trialEndsAt,
        daysLeft: daysBetween(now, sub.trialEndsAt),
        severity: 'notice',
        key: `trial:${sub.trialEndsAt}`,
      }
    }
  }

  // ── Cancellation scheduled ─────────────────────────────────────────────────
  // Downgrade behaviour is correct (nothing is deleted, only new saves are
  // blocked) but was never communicated. Saying the date is what makes it feel
  // deliberate rather than like something breaking.
  if (sub.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing')
      && Number.isFinite(sub.currentPeriodEnd) && sub.currentPeriodEnd > now) {
    return {
      kind: 'cancel-scheduled',
      endsAt: sub.currentPeriodEnd,
      daysLeft: daysBetween(now, sub.currentPeriodEnd),
      severity: 'info',
      key: `cancel:${sub.currentPeriodEnd}`,
    }
  }

  return null
}
