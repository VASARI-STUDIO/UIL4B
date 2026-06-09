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

export function dailyLimitFor(plan, toolId) {
  return plan.limits[toolId] ?? plan.limits['ai-default'] ?? 40
}
