// Time to first value — the number that says whether the onboarding work paid.
//
// The trap this suite guards is a metric that flatters itself: a clock that
// clamps a negative elapsed time to the best bucket, a reading that fires on
// every save instead of the first, or one that quietly survives a storage
// failure as a zero.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  TTV_START_KEY, TTV_BUCKETS,
  ttvBucket, startTtvClock, readTtvClock, clearTtvClock, takeTimeToValue,
} from '../../src/utils/timeToValue.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

// A real-enough Storage. Kept local so no test can leak state into another.
const memStore = (seed = {}) => {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
  }
}

// Storage that throws on every operation — private mode, or a browser set to
// block site data. Analytics must never be the reason onboarding breaks.
const hostileStore = () => ({
  getItem() { throw new Error('blocked') },
  setItem() { throw new Error('blocked') },
  removeItem() { throw new Error('blocked') },
})

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// ── Buckets ─────────────────────────────────────────────────────────────────

test('each bucket covers the span it is named for', () => {
  assert.equal(ttvBucket(0), 'under-1m')
  assert.equal(ttvBucket(MIN - 1), 'under-1m')
  assert.equal(ttvBucket(MIN), '1-5m')
  assert.equal(ttvBucket(5 * MIN - 1), '1-5m')
  assert.equal(ttvBucket(5 * MIN), '5-30m')
  assert.equal(ttvBucket(30 * MIN - 1), '5-30m')
  assert.equal(ttvBucket(30 * MIN), '30m-2h')
  assert.equal(ttvBucket(2 * HOUR - 1), '30m-2h')
  assert.equal(ttvBucket(2 * HOUR), '2h-1d')
  assert.equal(ttvBucket(DAY - 1), '2h-1d')
  assert.equal(ttvBucket(DAY), 'over-1d')
  assert.equal(ttvBucket(40 * DAY), 'over-1d')
})

test('the buckets are exactly the ones the module publishes, and no gaps', () => {
  const seen = new Set([0, MIN, 5 * MIN, 30 * MIN, 2 * HOUR, DAY].map(ttvBucket))
  assert.deepEqual([...seen], [...TTV_BUCKETS])
})

test('a negative elapsed time is refused, not rounded down to the best bucket', () => {
  // A clock that went backwards must not make time-to-value look instant. This
  // is the difference between a metric and a flattering one.
  assert.equal(ttvBucket(-1), null)
  assert.equal(ttvBucket(-DAY), null)
})

test('a non-number is refused', () => {
  for (const bad of [null, undefined, NaN, Infinity, -Infinity, '60000', {}, []]) {
    assert.equal(ttvBucket(bad), null, `${String(bad)} must not produce a bucket`)
  }
})

test('bucket names are safe as Firestore counter fields', () => {
  // They are concatenated into `ttv__<bucket>` and pass through sanitizeKey,
  // which collapses / . ~ * [ ] — a name needing collapsing would silently
  // become a different counter.
  for (const b of TTV_BUCKETS) assert.match(b, /^[a-z0-9-]+$/, `${b} is not field-safe`)
})

// ── The clock ───────────────────────────────────────────────────────────────

test('starting the clock stores the stamp and reading it returns a number', () => {
  const s = memStore()
  assert.equal(startTtvClock(1_000_000, s), true)
  assert.equal(s.getItem(TTV_START_KEY), '1000000')
  assert.equal(readTtvClock(s), 1_000_000)
})

test('an unusable now is not written', () => {
  const s = memStore()
  for (const bad of [NaN, Infinity, '1000', null, undefined]) {
    assert.equal(startTtvClock(bad, s), false, `${String(bad)} must not be stamped`)
  }
  assert.equal(readTtvClock(s), null)
})

test('a blocked storage fails quietly instead of throwing into onboarding', () => {
  const s = hostileStore()
  assert.equal(startTtvClock(1_000_000, s), false)
  assert.equal(readTtvClock(s), null)
  assert.doesNotThrow(() => clearTtvClock(s))
  assert.equal(takeTimeToValue(2_000_000, s), null)
})

test('a corrupt stamp reads as absent, not as zero', () => {
  // Zero would date the clock to 1970 and put every reading in 'over-1d'.
  for (const junk of ['', 'yesterday', '{}', 'NaN']) {
    assert.equal(readTtvClock(memStore({ [TTV_START_KEY]: junk })), null, `"${junk}" must not parse`)
  }
})

// ── Taking the reading ──────────────────────────────────────────────────────

test('the first activation after the clock starts produces a reading', () => {
  const s = memStore()
  startTtvClock(1_000_000, s)
  const got = takeTimeToValue(1_000_000 + 3 * MIN, s)
  assert.deepEqual(got, { bucket: '1-5m', elapsedMs: 3 * MIN })
})

test('the reading is one-shot — the second activation reports nothing', () => {
  // Forty saves in an afternoon must contribute one time-to-value, or the
  // metric becomes a measure of enthusiasm among the already-activated.
  const s = memStore()
  startTtvClock(1_000_000, s)
  assert.ok(takeTimeToValue(1_000_000 + MIN, s))
  assert.equal(takeTimeToValue(1_000_000 + 2 * MIN, s), null)
  assert.equal(takeTimeToValue(1_000_000 + 9 * HOUR, s), null)
  assert.equal(s.has(TTV_START_KEY), false, 'the clock must be cleared')
})

test('no clock means no reading', () => {
  assert.equal(takeTimeToValue(1_000_000, memStore()), null)
})

test('a stamp from the future is refused AND cleared', () => {
  // Refused because we genuinely do not know the elapsed time. Cleared because
  // a stamp we will never measure would otherwise re-run this on every save,
  // for the life of the browser profile.
  const s = memStore()
  startTtvClock(5_000_000, s)
  assert.equal(takeTimeToValue(1_000_000, s), null)
  assert.equal(s.has(TTV_START_KEY), false, 'an unusable clock must not persist')
})

test('an unusable now clears the clock rather than measuring against it', () => {
  const s = memStore()
  startTtvClock(1_000_000, s)
  assert.equal(takeTimeToValue(NaN, s), null)
  assert.equal(s.has(TTV_START_KEY), false)
})

// ── Wired into the activation that already exists ───────────────────────────

test('the reading hangs off trackActivation, not off a second activation event', () => {
  const src = stripComments(read('src/utils/analytics.js'))
  const fn = src.slice(src.indexOf('export function trackActivation'),
    src.indexOf('export function startTimeToValue'))
  assert.ok(fn.includes('takeTimeToValue'),
    'time to value must be read where activation is recorded')
  // BOTH counters, asserted separately. A bare `includes('ttv__')` passed even
  // with the headline counter deleted, because the per-tool counter's name
  // contains that same prefix — the assertion looked strict and checked almost
  // nothing. Caught by mutation, not by reading it.
  assert.ok(fn.includes('recordAggregateTool(`ttv__${ttv.bucket}`)'),
    'the headline time-to-value distribution must be written')
  assert.ok(fn.includes('recordAggregateTool(`ttv__${ttv.bucket}__${id}`)'),
    'the per-tool time-to-value counter must be written')
  // One load/save pair around the whole event. Two would make the second read
  // stale data and drop the activation increment that preceded it.
  assert.equal((fn.match(/loadDesignAnalytics\(\)/g) || []).length, 1)
  assert.equal((fn.match(/saveDesignAnalytics\(/g) || []).length, 1)
})

test('choosing a start is counted separately from activating', () => {
  const src = stripComments(read('src/utils/analytics.js'))
  assert.match(src, /export function trackFirstWinChoice/)
  const fn = src.slice(src.indexOf('export function trackFirstWinChoice'))
  assert.ok(!fn.includes('activation'),
    'a click of intent must never be written as a piece of completed work')
})
