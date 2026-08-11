// Central plan + entitlement config — shared shape with src/config/plans.js.
// Keep the limits here authoritative for the server (security boundary).
//
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

export function planForSubscription(subscription) {
  if (!subscription) return PLANS.free
  const active = subscription.status === 'active' || subscription.status === 'trialing'
  if (!active) return PLANS.free
  // Guard against an expired period that the webhook hasn't cleaned up yet.
  if (subscription.currentPeriodEnd && Date.now() > subscription.currentPeriodEnd + 86_400_000) {
    return PLANS.free
  }
  return PLANS.pro
}

export function hasLifetimeEntitlement(entitlement) {
  return entitlement?.active === true && !entitlement.revokedAt
}

// Founder/admin accounts get Pro entitlements without a Stripe subscription so
// the team can dog-food paid features. The email is read from a verified
// Firebase ID token on the server, so a non-admin can't spoof their way in.
// Keep this list in sync with src/utils/constants.js (ADMIN_EMAILS).
export const ADMIN_EMAILS = ['dylanjacob1100@gmail.com']

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

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
