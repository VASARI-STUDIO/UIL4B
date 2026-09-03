// TIME TO FIRST VALUE — how long from "onboarding answered" to "something real
// was saved or exported".
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS ADDS TO WHAT ALREADY EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// upgrade-activation-events (P-001) already answers "did this user build
// something?" — trackActivation fires on a saved project and a completed
// style-guide export, and is kept apart from trackToolAction so ordinary
// clicking cannot inflate it.
//
// What it cannot answer is HOW LONG IT TOOK, which is the number the onboarding
// work is actually judged by. A flow can raise completion and lower activation
// at the same time; only elapsed-time-to-first-activation separates "they
// finished the flow" from "the flow got them somewhere".
//
// So this does not add a second activation event. It reads the one that already
// exists and reports the gap. If trackActivation never fires, nothing here
// fires either — which is the correct reading, not a gap in the data.
//
// ── WHY BUCKETS AND NOT MILLISECONDS ────────────────────────────────────────
//
// The shared aggregate in utils/analytics.js is INCREMENT-ONLY: every field on
// `analytics-daily/{day}` is a counter that many clients merge into at once
// (see bumpAggregate). There is nowhere in that shape to put a raw duration —
// a millisecond value written by one user would be overwritten or summed into
// nonsense by the next. Six named buckets are countable, so they survive the
// merge, and they are the resolution the decision actually needs: nobody
// changes an onboarding flow differently for 90 seconds versus 100.
//
// ── ONE-SHOT, AND WHY ───────────────────────────────────────────────────────
//
// The clock is taken and cleared on the FIRST activation. Someone who saves
// forty palettes in an afternoon must contribute one time-to-value reading, not
// forty, or the metric becomes a measure of enthusiasm among people who already
// activated — which is the opposite of what it is for.
//
// DOM-free: storage is injected, so every branch below is testable without a
// browser and without touching real localStorage.

/** When the first-win screen was answered. Cleared once value is reached. */
export const TTV_START_KEY = 'vs-first-win-started'

/**
 * The buckets, coarse-to-coarser. Names are Firestore-field-safe (letters,
 * digits and hyphens only) because they are concatenated into counter names —
 * see sanitizeKey in utils/analytics.js.
 */
export const TTV_BUCKETS = Object.freeze([
  'under-1m',
  '1-5m',
  '5-30m',
  '30m-2h',
  '2h-1d',
  'over-1d',
])

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Elapsed milliseconds → bucket name. Null for anything that is not a finite
 * count of milliseconds at or above zero.
 *
 * A NEGATIVE elapsed time is not clamped to 'under-1m'. It means the stored
 * stamp is in the future — a clock change, a restored backup, a hand-edited
 * value — and the honest answer to "how long did that take" is that we do not
 * know. Rounding it down to the best possible bucket would quietly make the
 * headline number better every time a clock went backwards.
 */
export function ttvBucket(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null
  if (ms < MINUTE) return 'under-1m'
  if (ms < 5 * MINUTE) return '1-5m'
  if (ms < 30 * MINUTE) return '5-30m'
  if (ms < 2 * HOUR) return '30m-2h'
  if (ms < DAY) return '2h-1d'
  return 'over-1d'
}

function store(storage) {
  try {
    return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  } catch {
    return null
  }
}

/**
 * Start the clock. Called once, when the first-win screen is answered —
 * including when it is skipped, because someone who declined a starting point
 * and then built something anyway is exactly the comparison this measures.
 */
export function startTtvClock(now, storage) {
  const s = store(storage)
  if (!s || typeof now !== 'number' || !Number.isFinite(now)) return false
  try {
    s.setItem(TTV_START_KEY, String(Math.trunc(now)))
    return true
  } catch {
    // Private mode / quota. Losing a metric must never cost the user the flow.
    return false
  }
}

/** The stored stamp as a number, or null when absent or unparseable. */
export function readTtvClock(storage) {
  const s = store(storage)
  if (!s) return null
  try {
    const raw = s.getItem(TTV_START_KEY)
    if (raw === null || raw === undefined || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function clearTtvClock(storage) {
  const s = store(storage)
  if (!s) return
  try { s.removeItem(TTV_START_KEY) } catch { /* ignore */ }
}

/**
 * TAKE the reading: returns `{ bucket, elapsedMs }` on the first activation
 * after the clock was started, and null every other time — no clock, a clock
 * that cannot be parsed, or a stamp from the future.
 *
 * The clock is cleared on ANY non-null clock, including the unusable-stamp
 * case. A stamp we have already refused to measure is not going to become
 * measurable later, and leaving it behind would re-run this arithmetic on every
 * subsequent save forever.
 */
export function takeTimeToValue(now, storage) {
  const started = readTtvClock(storage)
  if (started === null) return null
  clearTtvClock(storage)
  if (typeof now !== 'number' || !Number.isFinite(now)) return null
  const elapsedMs = now - started
  const bucket = ttvBucket(elapsedMs)
  return bucket ? { bucket, elapsedMs } : null
}
