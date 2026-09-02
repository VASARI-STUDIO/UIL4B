// When to tell a free user where they stand against the project cap.
//
// This is the "when do we warn" decision on its own, away from any DOM, because
// it is a judgement call and not a rendering detail. The founder's constraint on
// this surface is that a counter which nags is worse than no counter, and the
// audit's constraint is that a cap the user meets with no warning reads as the
// product being broken rather than as the product being paid. Those pull in
// opposite directions, and the resolution is a THRESHOLD rather than a boolean:
// stay quiet while the allowance is genuinely comfortable, speak once it is not.
//
// So the states are ordered by how much the user needs to hear from us:
//
//   unlimited  — Pro, or any plan without a finite cap. Never counted at all;
//                a Pro user has no allowance to be reminded of.
//   clear      — room to spare. SAY NOTHING. This is the state a free user
//                spends most of their life in, and P-003 ("the free tier is a
//                foot in the door") is not served by a countdown that starts on
//                their first project.
//   approaching— the cap is close enough that the next save or two is the last.
//                This is the warning the audit found missing.
//   full       — at or over the cap. New saves are refused, and the refusal has
//                to explain itself.
//
// WHY A FRACTION AND NOT "WARN AT ONE LEFT": the cap is not a constant. It is
// read live from plan.limits.projects (ProjectContext), so it can be changed on
// the plan without a deploy. At the current free cap of 3, a fraction and a flat
// "one left" agree — but if the cap ever moves to 20, "warn at 19 remaining"
// would be a warning that arrives too late to act on, and this module would have
// silently become wrong. The fraction keeps the warning proportional to the
// allowance. The floor of 1 keeps it meaningful at small caps, where 20% rounds
// to less than a whole project.
export const WARN_FRACTION = 0.2

/** Projects still saveable before the cap bites. Infinity when uncapped. */
export function remainingProjects(used, limit) {
  if (!Number.isFinite(limit)) return Infinity
  return Math.max(0, limit - normaliseUsed(used))
}

/** How few slots may remain before we say something. Always at least 1. */
export function warnThreshold(limit) {
  if (!Number.isFinite(limit) || limit <= 0) return 0
  return Math.max(1, Math.ceil(limit * WARN_FRACTION))
}

function normaliseUsed(used) {
  // A count is never negative and never fractional. Anything else is a caller
  // bug, and a caller bug must not be able to hide the cap.
  if (!Number.isFinite(used) || used < 0) return 0
  return Math.floor(used)
}

/**
 * Resolve the whole quota picture from the two numbers that decide it.
 *
 * @param {number} used  projects the user currently has saved
 * @param {number} limit the plan's cap; Infinity / null / undefined = uncapped
 * @returns {{state:'unlimited'|'clear'|'approaching'|'full', used:number,
 *            limit:number, remaining:number, atLimit:boolean, shouldTell:boolean}}
 */
export function projectQuota(used, limit) {
  const count = normaliseUsed(used)

  if (!Number.isFinite(limit)) {
    return { state: 'unlimited', used: count, limit: Infinity, remaining: Infinity, atLimit: false, shouldTell: false }
  }

  // A cap of zero or less is not a tier we sell, but it is expressible in plan
  // data, and "no saves at all" must not resolve to a comfortable 'clear'.
  const cap = Math.max(0, Math.floor(limit))
  const remaining = Math.max(0, cap - count)

  if (remaining === 0) {
    return { state: 'full', used: count, limit: cap, remaining: 0, atLimit: true, shouldTell: true }
  }
  if (remaining <= warnThreshold(cap)) {
    return { state: 'approaching', used: count, limit: cap, remaining, atLimit: false, shouldTell: true }
  }
  return { state: 'clear', used: count, limit: cap, remaining, atLimit: false, shouldTell: false }
}
