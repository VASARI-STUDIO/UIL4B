/**
 * Usage Tracker — per-user, per-tool daily usage tracking via localStorage.
 *
 * Keys are stored as  `vs-usage-<toolId>-<YYYY-MM-DD>`  so they automatically
 * expire / reset at midnight (the date portion changes).
 *
 * When no user is logged in, all checks should be handled by the calling code
 * (the UsageGate component) before these helpers are invoked.
 */

function todayKey(toolId) {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `vs-usage-${toolId}-${yyyy}-${mm}-${dd}`
}

/**
 * Return the number of times `toolId` has been used today.
 */
export function getUsageCount(toolId) {
  try {
    return parseInt(localStorage.getItem(todayKey(toolId)) || '0', 10)
  } catch {
    return 0
  }
}

/**
 * Record one usage of `toolId` for today.
 */
export function recordUsage(toolId) {
  try {
    const key = todayKey(toolId)
    const current = parseInt(localStorage.getItem(key) || '0', 10)
    localStorage.setItem(key, String(current + 1))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Check whether the user can still use `toolId` today.
 * Returns `true` if usage count is below `dailyLimit`.
 */
export function canUseFeature(toolId, dailyLimit) {
  return getUsageCount(toolId) < dailyLimit
}

/**
 * Return how many uses of `toolId` remain today.
 */
export function getRemainingUses(toolId, dailyLimit) {
  return Math.max(0, dailyLimit - getUsageCount(toolId))
}

/**
 * Return the Date at which today's limit resets (midnight tonight).
 */
export function getResetTime() {
  const now = new Date()
  const reset = new Date(now)
  reset.setDate(reset.getDate() + 1)
  reset.setHours(0, 0, 0, 0)
  return reset
}

/**
 * Purge stale usage keys older than today.  Call occasionally (e.g. on app
 * start) to keep localStorage tidy.
 */
export function purgeStaleUsage() {
  try {
    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vs-usage-')) {
        // Extract the date suffix (last 10 characters: YYYY-MM-DD)
        const datePart = key.slice(-10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart < todayStr) {
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
