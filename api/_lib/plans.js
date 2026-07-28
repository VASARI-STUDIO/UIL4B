// Central plan + entitlement config — shared shape with src/config/plans.js.
// Keep the daily limits here authoritative for the server (security boundary).
//
// NOTE: AI generation is currently FREE for all signed-in users. The "free"
// limits below are generous abuse-protection caps, not a paywall. Pro perks
// are non-AI for now (extra docs, cheatcodes, synced projects). To turn AI
// into a Pro feature later, lower the free limits here — nothing else changes.

export const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    limits: {
      'alt-text': 40,
      'prompts-ai': 40,
      'ai-default': 40,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    limits: {
      'alt-text': 1000,
      'prompts-ai': 1000,
      'ai-default': 1000,
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
// else falls back to their real subscription. Prefer this over
// planForSubscription in any authenticated endpoint that gates on plan.
export function planForUser({ subscription, lifetimeEntitlement, email } = {}) {
  if (isAdminEmail(email)) return PLANS.pro
  if (hasLifetimeEntitlement(lifetimeEntitlement)) return PLANS.pro
  return planForSubscription(subscription)
}

export function dailyLimitFor(plan, toolId) {
  return plan.limits[toolId] ?? plan.limits['ai-default'] ?? 40
}

// Gemini model ids (called directly via the Generative Language API).
// Alt-text uses gemini-2.5-flash for better image understanding.
// Set GEMINI_ALT_TEXT_MODEL to override (e.g. back to gemini-2.5-flash-lite).
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
