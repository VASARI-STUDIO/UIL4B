// Central plan + entitlement config — shared shape with src/config/plans.js.
// Keep the limits here authoritative for the server (security boundary).
//
// The one import this module takes, and why it is safe: ./adminEmails.js has no
// dependencies of its own, so importing it here does not pull firebase-admin
// into the unit tests and client-adjacent tooling that read this plan table.
import { isAdminEmail } from './adminEmails.js'

// ─────────────────────────────────────────────────────────────────────────────
// WHY THESE NUMBERS ARE SMALL — read before raising any of them
// ─────────────────────────────────────────────────────────────────────────────
// Founder constraint: AI runs on FREE provider tiers only until the app earns.
// Free tiers are metered PER PROJECT, not per user, so every signed-in user is
// drawing from ONE shared bucket:
//
//   • Gemini's free tier caps requests per API project, shared site-wide.
//   • OpenRouter's `:free` model variants cap per account, likewise shared.
//
// That inverts the usual arithmetic. The old limits here were 40/day free and
// 1,000/day Pro, which is not oversold at a thousand users — it is oversold at
// TWO, because two Pro users maxing out would ask for 2,000 generations from a
// bucket holding a few hundred for everyone.
//
// So the limits are derived from the shared ceiling downward, not from what
// looks generous on a pricing page:
//
//   assumed shared ceiling      ~200 successful generations/day, site-wide
//   ÷ expected concurrent heavy users        ~6
//   = honest per-user daily allowance        ~30   → the Pro daily cap
//
// The ceiling is deliberately pessimistic: it leaves headroom for retries, the
// OpenRouter fallback path, and the fact that a provider may cut a free tier
// without notice. Free sits at 5/day — enough to genuinely evaluate the tool,
// small enough that unpaid volume can never crowd out paying users.
//
// The MONTHLY ceiling exists because a daily cap alone is the wrong shape for
// this cost. A daily-only cap punishes the batch worker (40 images on a
// Saturday) while doing nothing about the steady drip that actually exhausts a
// monthly free tier. Daily protects the shared pool on any given day; monthly
// protects the month. A user hits whichever they reach first.
//
// WHEN THIS CHANGES: raising these is a pricing decision, not a config tweak.
// Confirm the real provider ceiling first, then update Plans.jsx and
// SubscriptionContext.jsx in the same commit — the pricing page must never
// promise what this file will not honour.

export const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    limits: {
      'alt-text': 5,
      'prompts-ai': 5,
      'ai-default': 5,
    },
    monthlyLimits: {
      'alt-text': 40,
      'prompts-ai': 40,
      'ai-default': 40,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    limits: {
      'alt-text': 30,
      'prompts-ai': 30,
      'ai-default': 30,
    },
    monthlyLimits: {
      'alt-text': 300,
      'prompts-ai': 300,
      'ai-default': 300,
    },
  },
}

// Stripe retries a failed charge for days before giving up, so a subscription
// in `past_due` is a customer with an expired card, not a customer who left.
// Revoking Pro on the first failed charge is how you lose someone who would
// have paid — they hit a limit, get no explanation, and conclude the product
// broke. Seven days of continued access buys them time to fix the card.
//
// Deliberately NOT extended to `unpaid` or `canceled`: `unpaid` means Stripe
// exhausted the retry schedule, and by then this is a lapsed customer.
//
// ⚠️ SECURITY BOUNDARY. This grants Pro to an account that has not paid. It is
// bounded by paymentFailedAt — a timestamp only the webhook (admin SDK) can
// write, which firestore.rules makes unwritable from a browser. Mirrored in
// src/utils/billingState.js for the UI; tests/unit/plan-limits.test.js fails if
// the two numbers drift.
export const PAST_DUE_GRACE_MS = 7 * 86_400_000

// A subscription payment that was refunded or charged back.
//
// This is a SEPARATE, STICKY field rather than a status the webhook writes,
// because `customer.subscription.updated` overwrites `status` from Stripe on
// every delivery. A subscription whose charge was disputed usually still reads
// `active` in Stripe for a while, so a revocation written into `status` would
// be undone by the next event — silently, and in the customer's favour.
//
// It is cleared in exactly one place: a dispute closed in our favour, which is
// the same rule the lifetime entitlement already follows.
export function subscriptionAccessRevoked(subscription) {
  return subscription?.accessRevoked === true
}

export function planForSubscription(subscription) {
  if (!subscription) return PLANS.free
  // Checked before anything else, including the past-due grace: money that has
  // gone back is not a reason to keep serving the product, and the grace window
  // exists for a payment that is being RETRIED, not one that was reversed.
  if (subscriptionAccessRevoked(subscription)) return PLANS.free
  const active = subscription.status === 'active' || subscription.status === 'trialing'
  if (active) {
    // Guard against an expired period that the webhook hasn't cleaned up yet.
    if (subscription.currentPeriodEnd && Date.now() > subscription.currentPeriodEnd + 86_400_000) {
      return PLANS.free
    }
    return PLANS.pro
  }
  // Grace runs from the moment the payment broke, NOT from currentPeriodEnd.
  // Stripe advances the period end before it finalises the renewal invoice, so
  // by the time that invoice fails the period end is already a month out —
  // anchoring there would hand out ~37 free days instead of 7.
  if (subscription.status === 'past_due' && Number.isFinite(subscription.paymentFailedAt)
      && Date.now() <= subscription.paymentFailedAt + PAST_DUE_GRACE_MS) {
    return PLANS.pro
  }
  return PLANS.free
}

export function hasLifetimeEntitlement(entitlement) {
  return entitlement?.active === true && !entitlement.revokedAt
}

// Founder/admin accounts get Pro entitlements without a Stripe subscription so
// the team can dog-food paid features. The email is read from a verified
// Firebase ID token on the server, so a non-admin can't spoof their way in.
//
// THE LIST IS NOT HERE ANY MORE. It was a second copy of the literal in
// api/_lib/admin.js — the defect that file's own header names — and both were
// the founder's personal address in tracked, public source. It now comes from
// the ADMIN_EMAILS environment variable, defined once in ./adminEmails.js,
// which is a dependency-free module precisely so this one can import it without
// dragging firebase-admin into every consumer of the plan table.
//
// Re-exported under this name because src/utils/constants.js points at
// "`isAdminEmail` in api/_lib/plans.js" as the security boundary it mirrors,
// and a comment that names a symbol which is no longer there is a comment that
// sends the next reader to the wrong file.
export { isAdminEmail }

// Resolve the effective plan for a request: admins are always Pro; everyone
// else falls back to their real subscription.
//
// NOTE on lifetime: the one-off tier is no longer SOLD (it was removed from the
// pricing page — an unfinished checkout path advertised as a product). Existing
// entitlements are still honoured here, deliberately: someone who already holds
// one keeps it. Selling it again is a founder decision, not a code change.
export function planForUser({ subscription, lifetimeEntitlement, email } = {}) {
  if (isAdminEmail(email)) return PLANS.pro
  if (hasLifetimeEntitlement(lifetimeEntitlement)) return PLANS.pro
  return planForSubscription(subscription)
}

export function dailyLimitFor(plan, toolId) {
  return plan.limits[toolId] ?? plan.limits['ai-default'] ?? 5
}

export function monthlyLimitFor(plan, toolId) {
  return plan.monthlyLimits?.[toolId] ?? plan.monthlyLimits?.['ai-default'] ?? 40
}

// Gemini model ids (called directly via the Generative Language API).
// Alt-text uses gemini-2.5-flash for better image understanding.
// Set GEMINI_ALT_TEXT_MODEL to override (e.g. back to gemini-2.5-flash-lite).
//
// Free and Pro currently resolve to the SAME model. That is why no plan copy
// anywhere may claim Pro buys a "better" or "higher-quality" model — it buys
// capacity, and capacity only, until these diverge.
const MODELS = {
  free: { 'alt-text': process.env.GEMINI_ALT_TEXT_MODEL || 'gemini-2.5-flash' },
  pro: { 'alt-text': process.env.GEMINI_ALT_TEXT_MODEL || 'gemini-2.5-flash' },
}

export function modelFor(plan, toolId) {
  if (plan.id === 'pro') {
    return process.env.GEMINI_MODEL_PRO || MODELS.pro[toolId] || MODELS.pro['alt-text']
  }
  return process.env.GEMINI_MODEL_FREE || MODELS.free[toolId] || MODELS.free['alt-text']
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STRIPE PRODUCT DESCRIPTION — derived, never typed
// ─────────────────────────────────────────────────────────────────────────────
// api/setup-stripe.js used to carry this as a hand-typed constant reading
// "1,000 AI actions per day, unlimited project and custom-icon saves, advanced
// colour controls, and full design JSON export." Two of those claims were false
// against this file and against the export table:
//
//   · 1,000 A DAY. The server has enforced 30 since the limits were derived
//     downward from the shared free-tier ceiling (the long note above). A
//     customer buying on that sentence is oversold by 33×.
//   · FULL DESIGN JSON EXPORT. `json` in src/config/exportFormats.js has never
//     carried `live: true` — it renders a "Soon" badge over a disabled button
//     and ExportPanel has no branch that could build one. /plans, /checkout, the
//     upgrade modal and Settings were all corrected for this when
//     exportFormats.js was extracted. The Stripe PRODUCT is the copy nobody
//     went back for.
//
// And this string is the WORST place for a false promise, because it is not on a
// marketing page: Stripe prints the product description on the embedded
// checkout, on the emailed receipt and on the invoice. It is the one copy of the
// promise that reaches a customer with money already in hand.
//
// So it is derived from the same PLANS object the server enforces, and
// tests/unit/stripe-product-truth.test.js fails if the two ever disagree — the
// exportFormats.js / plans-truth.test.js pattern, applied to the receipt.
//
// The remaining half is not code: findOrCreateProduct now calls
// stripe.products.update when a live product's description differs, but nothing
// runs that until the founder POSTs /api/setup-stripe. That is logged in
// docs/OWNER-ACTIONS.md, which is local-only since 2026-09-16 and is not in this
// repository (.gitignore carries why). The DERIVATION below is the half that
// protects a customer and it is all here; only the founder's runbook entry is
// elsewhere.
export function proProductDescription(plan = PLANS.pro) {
  const daily = dailyLimitFor(plan, 'ai-default')
  const monthly = monthlyLimitFor(plan, 'ai-default')
  return `${daily} AI actions a day and ${monthly} a month, unlimited project and custom-icon saves, advanced colour controls, and the Pro export documents — the design system book (PDF) and the brand guidelines presentation.`
}
