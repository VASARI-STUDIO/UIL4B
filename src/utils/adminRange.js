// The date range the admin overview reports on.
//
// A range is a window of local calendar days that ends today and includes it:
// "7 days" is today and the six days before it. Month ranges step back by
// calendar months, so "6 months" starts the day after the same date six months
// ago. Everything here is pure; callers pass `now` so the boundaries can be
// pinned.

export const DEFAULT_RANGE_ID = '30d'

// `label` names the option, `short` is the narrow-screen form of it, and
// `phrase` is what a heading or a stat caption says it covers.
export const ADMIN_RANGES = Object.freeze([
  { id: '7d', days: 7, label: '7 days', short: '7d', phrase: 'last 7 days' },
  { id: '30d', days: 30, label: '30 days', short: '30d', phrase: 'last 30 days' },
  { id: '60d', days: 60, label: '60 days', short: '60d', phrase: 'last 60 days' },
  { id: '90d', days: 90, label: '90 days', short: '90d', phrase: 'last 90 days' },
  { id: '6m', months: 6, label: '6 months', short: '6m', phrase: 'last 6 months' },
  { id: '1y', months: 12, label: '1 year', short: '1y', phrase: 'last 12 months' },
])

const pad = (n) => String(n).padStart(2, '0')

/** A date as YYYY-MM-DD in local time, the same form the daily documents use as their id. */
export function dayString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The range id for a query value, or the default when it is missing or unknown. */
export function parseRangeId(value) {
  const hit = ADMIN_RANGES.find(range => range.id === value)
  return hit ? hit.id : DEFAULT_RANGE_ID
}

// Midnight local, so a daylight-saving change never moves the calendar day.
function startOfDay(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// `date` moved back by whole months. A target month too short for the day
// (31 March back one month) lands on that month's last day, never the next month.
function monthsBack(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

// Whole calendar days from `a` to `b`, counted on UTC so an hour lost or gained
// to daylight saving cannot turn 7 days into 6.
function daysBetween(a, b) {
  const utc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

/**
 * The window for a range id: `startDay` and `endDay` (both YYYY-MM-DD, both
 * inside the window) and `days`, how many calendar days it spans.
 */
export function rangeWindow(id, now = new Date()) {
  const range = ADMIN_RANGES.find(r => r.id === id) || ADMIN_RANGES.find(r => r.id === DEFAULT_RANGE_ID)
  const end = startOfDay(now)
  let start
  if (range.months) {
    start = monthsBack(end, range.months)
    start.setDate(start.getDate() + 1)
  } else {
    start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (range.days - 1))
  }
  return {
    id: range.id,
    label: range.label,
    phrase: range.phrase,
    startDay: dayString(start),
    endDay: dayString(end),
    days: daysBetween(start, end) + 1,
  }
}

/**
 * Whether an ISO timestamp falls on a day inside the window. A missing or
 * unreadable timestamp is outside every window.
 */
export function inWindow(iso, window) {
  const when = new Date(iso)
  if (!iso || Number.isNaN(when.getTime())) return false
  const day = dayString(when)
  return day >= window.startDay && day <= window.endDay
}
