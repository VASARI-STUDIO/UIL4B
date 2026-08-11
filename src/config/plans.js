// The client's view of the plan limits — the file api/_lib/plans.js has named
// as its counterpart since it was written, and which never actually existed.
//
// ⚠️ MIRROR ONLY. api/_lib/plans.js is the security boundary and the real
// answer; these numbers exist so the UI can quote a limit without a round trip.
// They must match it exactly, and tests/unit/plan-limits.test.js fails if they
// drift — a client that believes it has more headroom than the server grants
// produces a 429 the user was given no warning about, which reads as a broken
// product rather than a metered one.
//
// WHY THE AI NUMBERS ARE SMALL: AI runs on free provider tiers, which meter PER
// PROJECT rather than per user, so every user draws from one shared bucket. The
// full arithmetic is in api/_lib/plans.js. Read it before changing any of
// these, and change both files in the same commit.
//
// This lives outside SubscriptionContext because that file exports a component:
// a constant exported alongside it trips react-refresh/only-export-components
// and breaks fast refresh. Plain data belongs in a plain module.

export const AI_LIMITS = Object.freeze({
  free: Object.freeze({ daily: 5, monthly: 40 }),
  pro: Object.freeze({ daily: 30, monthly: 300 }),
})

export const FREE_SAVE_LIMITS = Object.freeze({ projects: 3, customIcons: 8 })
