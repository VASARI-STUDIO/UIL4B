// What's left of an AI allowance, and which ceiling is about to bite.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (2026-08-12 account lifecycle audit § B2)
// ─────────────────────────────────────────────────────────────────────────────
// `usageTracker.js` exported getRemainingUses and getResetTime — exactly the two
// functions needed to warn someone before they hit a wall. Neither was imported
// anywhere. The server returned `usage: { used, limit, remaining }` on every
// response and no caller read it.
//
// The sharper half: Free is 5/day AND 40/month, but the client only ever knew
// about the daily figure. So a free user could hit the MONTHLY wall on day 8
// having never been shown that a monthly ceiling existed, and the server's
// `period: 'month'` reply rendered as a generic error.
//
// Two rules this file exists to hold:
//
//   1. THE SERVER IS THE TRUTH. The localStorage tracker counts one browser;
//      the ceiling is per account. A second device, a cleared cache or a
//      private window all make the local count a guess. It is a reasonable
//      first paint and nothing more — the moment a response arrives, its
//      numbers win.
//   2. NEVER OVERSTATE WHAT'S LEFT. Where the two disagree the smaller figure
//      is shown. A quota that reads generous and then refuses is worse than one
//      that reads cautious, because it only fails at the moment of use.
//
// DOM-free and React-free, so the arithmetic is testable directly.

const clamp0 = (n) => (Number.isFinite(n) && n > 0 ? n : 0)

// A ceiling is "low" at a quarter left, with a floor of 1 so a 5/day allowance
// still warns (25% of 5 rounds to 2) rather than jumping straight to empty.
export function isLow(remaining, limit) {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) return false
  if (remaining <= 0) return false           // that's exhausted, not low
  return remaining <= Math.max(1, Math.ceil(limit * 0.25))
}

function bucket(used, limit) {
  const u = clamp0(used)
  const l = Number.isFinite(limit) && limit > 0 ? limit : 0
  const remaining = Math.max(0, l - u)
  return {
    used: u,
    limit: l,
    remaining,
    exhausted: l > 0 && remaining <= 0,
    low: isLow(remaining, l),
  }
}

// Midnight tonight, local time — when the DAILY bucket resets. The monthly one
// resets on the 1st, which is why they are reported separately: telling someone
// their monthly wall "resets at midnight" would be a lie they act on.
export function dailyResetAt(now = new Date()) {
  const reset = new Date(now)
  reset.setDate(reset.getDate() + 1)
  reset.setHours(0, 0, 0, 0)
  return reset
}

export function monthlyResetAt(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
}

// Merge what the server last told us with the local estimate.
//
// `server` is whatever came back in a response's `usage` field, or null before
// the first one. Rule 2 above is enforced here: where both know a figure, the
// HIGHER used-count wins, because that is the one that leaves less headroom.
export function reconcile(server, localUsed) {
  const local = clamp0(localUsed)
  if (!server) return { used: local, monthUsed: null, source: 'local' }
  const used = Number.isFinite(server.used) ? Math.max(server.used, local) : local
  const monthUsed = Number.isFinite(server.monthUsed) ? server.monthUsed : null
  return { used, monthUsed, source: 'server' }
}

// The whole picture, plus the one sentence worth saying about it.
export function quotaState({ server = null, localUsed = 0, dailyLimit = 0, monthlyLimit = 0, now = new Date() } = {}) {
  const { used, monthUsed, source } = reconcile(server, localUsed)

  const daily = bucket(used, Number.isFinite(server?.limit) ? server.limit : dailyLimit)
  // The monthly figure is only knowable from the server — nothing local counts
  // across days. Until a response arrives it stays null rather than guessed,
  // and the UI shows the daily line alone instead of inventing a number.
  const monthly = monthUsed === null
    ? null
    : bucket(monthUsed, Number.isFinite(server?.monthLimit) ? server.monthLimit : monthlyLimit)

  // Whichever ceiling the user reaches FIRST is the one that matters. Exhausted
  // beats low; between two of the same kind, the smaller remainder wins.
  let binding = null
  if (daily.exhausted) binding = 'day'
  if (monthly?.exhausted) binding = 'month'
  if (!binding && (daily.low || monthly?.low)) {
    if (daily.low && monthly?.low) binding = monthly.remaining <= daily.remaining ? 'month' : 'day'
    else binding = daily.low ? 'day' : 'month'
  }

  return {
    daily,
    monthly,
    source,
    binding,
    blocked: daily.exhausted || !!monthly?.exhausted,
    resetsAt: binding === 'month' ? monthlyResetAt(now) : dailyResetAt(now),
  }
}

// Plain English for the state above. Returns null when there is nothing worth
// saying, so a caller can render nothing rather than a reassuring non-message.
export function quotaMessage(state) {
  if (!state?.binding) return null
  const isMonth = state.binding === 'month'
  const b = isMonth ? state.monthly : state.daily
  if (!b) return null
  const period = isMonth ? 'this month' : 'today'
  const resets = isMonth ? 'It resets on the 1st.' : 'It resets at midnight.'
  if (b.exhausted) return `You've used all ${b.limit} AI generations ${period}. ${resets}`
  return `${b.remaining} AI generation${b.remaining === 1 ? '' : 's'} left ${period}. ${resets}`
}
