// Pure rules for the roadmap list: which tools are on it, their stage, the order
// and the 90-day Shipped window. No Firebase, so Node can run it.
export const SHIPPED_DAYS = 90
const DAY_MS = 86400000

/** 'YYYY-MM-DD' for `now` in Australia/Sydney. */
function sydneyDay(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(now)
}
const dayNumber = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/** True from the ship date through the 90th day after it; the 91st day is out. */
export function isRecentlyShipped(shipped, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shipped || '')) return false
  return dayNumber(sydneyDay(now)) - dayNumber(shipped) <= SHIPPED_DAYS
}

export const STAGE_WORD = { workshop: 'In the workshop', beta: 'In beta', live: 'Live' }
export const STAGE_STEPS = { workshop: 1, beta: 2, live: 3 }
const STAGE_RANK = { beta: 0, workshop: 1 }

export function stageOf(tool) {
  if (tool.soon) return 'workshop'
  if (tool.beta) return 'beta'
  return 'live'
}

/** 'vote' for exactly one, 'votes' otherwise (including 0). */
export const voteWord = (n) => (n === 1 ? 'vote' : 'votes')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** '2026-10-20' -> '20 Oct 2026'. */
export function formatShipped(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/**
 * The static half of each row, from createTools() output: open tools (soon or
 * beta) in tree order, and, when asked, live tools shipped inside the window.
 */
export function listTools(tools, { describe = () => '', shipped = false, now = new Date() } = {}) {
  const all = tools.map((t, i) => ({
    id: t.id, label: t.label, route: t.route, description: describe(t.id), stage: stageOf(t), shipped: t.shipped, tree: i,
  }))
  return {
    open: all.filter((t) => t.stage !== 'live'),
    shipped: shipped ? all.filter((t) => t.stage === 'live' && isRecentlyShipped(t.shipped, now)) : [],
  }
}

/** Most votes first, then beta before workshop, then tree order. */
export function orderIds(open, counts) {
  return [...open]
    .sort((a, b) => ((counts[b.id] ?? 0) - (counts[a.id] ?? 0)) || (STAGE_RANK[a.stage] - STAGE_RANK[b.stage]) || (a.tree - b.tree))
    .map((t) => t.id)
}
