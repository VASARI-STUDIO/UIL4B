// Submitting a gradient for review, on the local-first pattern Community.jsx
// already uses. The contract these tests hold is HONESTY: a submission is a
// queue entry in this browser, it can never put itself in the library, and a
// corrupt or hostile record never reaches a renderer.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GRADIENT_SUBMISSIONS_KEY,
  GRADIENT_SUBMISSIONS_MAX,
  appendGradientSubmission,
  clearGradientSubmissions,
  readGradientSubmissions,
  sanitizeGradientSubmission,
  withdrawGradientSubmission,
} from '../../src/utils/gradientSubmissions.js'

// A stand-in for localStorage, including the one that throws — a browser with
// storage disabled or a full quota must not take the page down with it.
function memoryStorage({ throwOnWrite = false } = {}) {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (throwOnWrite) throw new Error('QuotaExceededError')
      map.set(k, String(v))
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  }
}

const STOPS = [{ color: '#7C3AED', position: 0 }, { color: '#F59E0B', position: 100 }]
const draft = (over = {}) => ({ id: 'g1', name: 'Harbour Dusk', type: 'Linear', angle: 90, stops: STOPS, ...over })

/* ── the record itself ───────────────────────────────────────────────────── */

test('a valid submission keeps its gradient and is queued as pending', () => {
  const out = sanitizeGradientSubmission(draft())
  assert.equal(out.name, 'Harbour Dusk')
  assert.equal(out.type, 'Linear')
  assert.equal(out.angle, 90)
  assert.deepEqual(out.stops, STOPS)
  assert.equal(out.status, 'pending')
  assert.ok(out.submittedAt > 0)
})

test('a client can never mark its own submission approved', () => {
  // This is the whole honesty guarantee: 'approved' is a reviewer's word and
  // there is no reviewer on the client, so it must be unreachable from here.
  for (const status of ['approved', 'published', 'live', 'PENDING', 42, null, undefined]) {
    assert.equal(sanitizeGradientSubmission(draft({ status })).status, 'pending',
      `status ${JSON.stringify(status)} must fall back to pending`)
  }
  assert.equal(sanitizeGradientSubmission(draft({ status: 'withdrawn' })).status, 'withdrawn')
})

test('anything that is not a gradient is dropped, never stored half-formed', () => {
  assert.equal(sanitizeGradientSubmission(null), null)
  assert.equal(sanitizeGradientSubmission('gradient'), null)
  assert.equal(sanitizeGradientSubmission([]), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: undefined })), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: [] })), null)
  assert.equal(sanitizeGradientSubmission(draft({ stops: [STOPS[0]] })), null, 'one stop is not a gradient')
  assert.equal(sanitizeGradientSubmission(draft({ stops: [{ color: 'red', position: 0 }, { color: 'blue', position: 100 }] })), null)
})

test('hostile or malformed fields are neutralised rather than rendered', () => {
  const out = sanitizeGradientSubmission(draft({
    name: '  <script>alert(1)</script>  ',
    author: 'x'.repeat(500),
    note: 'y'.repeat(500),
    type: 'Spiral',
    angle: 9999,
    stops: [{ color: '#7c3aed', position: -50 }, { color: '#F59E0B', position: 900 }],
  }))
  // Escaping is React's job; the storage layer's job is bounds and shape.
  assert.equal(out.name, '<script>alert(1)</script>', 'trimmed and length-capped, never executed as markup')
  assert.equal(out.author.length, 40)
  assert.equal(out.note.length, 200)
  assert.equal(out.type, 'Linear', 'an unknown gradient type falls back to a renderable one')
  assert.equal(out.angle, 360)
  assert.deepEqual(out.stops, [{ color: '#7C3AED', position: 0 }, { color: '#F59E0B', position: 100 }])
})

test('a submission with no name still renders as something', () => {
  const out = sanitizeGradientSubmission(draft({ name: '   ', author: '' }))
  assert.equal(out.name, 'Untitled gradient')
  assert.equal(out.author, 'Community member')
})

/* ── the queue ───────────────────────────────────────────────────────────── */

test('a submission round-trips through storage, newest first', () => {
  const s = memoryStorage()
  appendGradientSubmission(draft({ id: 'a', name: 'First' }), s)
  appendGradientSubmission(draft({ id: 'b', name: 'Second' }), s)
  const list = readGradientSubmissions(s)
  assert.deepEqual(list.map(x => x.name), ['Second', 'First'])
  assert.ok(list.every(x => x.status === 'pending'))
})

test('withdrawing removes exactly one submission', () => {
  const s = memoryStorage()
  appendGradientSubmission(draft({ id: 'a' }), s)
  appendGradientSubmission(draft({ id: 'b' }), s)
  const left = withdrawGradientSubmission('a', s)
  assert.deepEqual(left.map(x => x.id), ['b'])
  assert.deepEqual(readGradientSubmissions(s).map(x => x.id), ['b'])
  // Withdrawing something that isn't there is a no-op, not a crash.
  assert.deepEqual(withdrawGradientSubmission('nope', s).map(x => x.id), ['b'])
})

test('the queue is capped so a runaway submit cannot fill the quota', () => {
  const s = memoryStorage()
  for (let i = 0; i < GRADIENT_SUBMISSIONS_MAX + 12; i++) {
    appendGradientSubmission(draft({ id: `g${i}`, name: `G${i}` }), s)
  }
  const list = readGradientSubmissions(s)
  assert.equal(list.length, GRADIENT_SUBMISSIONS_MAX)
  assert.equal(list[0].name, `G${GRADIENT_SUBMISSIONS_MAX + 11}`, 'the newest submission always survives')
})

test('corrupt stored data heals instead of breaking the gallery', () => {
  const s = memoryStorage()
  s.setItem(GRADIENT_SUBMISSIONS_KEY, 'not json at all')
  assert.deepEqual(readGradientSubmissions(s), [])
  s.setItem(GRADIENT_SUBMISSIONS_KEY, JSON.stringify({ nope: true }))
  assert.deepEqual(readGradientSubmissions(s), [])
  s.setItem(GRADIENT_SUBMISSIONS_KEY, JSON.stringify([draft(), null, 7, { junk: 1 }]))
  assert.equal(readGradientSubmissions(s).length, 1, 'the salvageable entry survives, the rubbish does not')
})

test('storage being disabled or full never throws at the caller', () => {
  const s = memoryStorage({ throwOnWrite: true })
  assert.doesNotThrow(() => appendGradientSubmission(draft(), s))
  assert.doesNotThrow(() => readGradientSubmissions(s))
  assert.doesNotThrow(() => withdrawGradientSubmission('a', s))
  assert.doesNotThrow(() => clearGradientSubmissions(s))
  // A write that never landed reads back as an empty queue, not as a lie.
  assert.deepEqual(readGradientSubmissions(s), [])
})

test('clearing empties the queue', () => {
  const s = memoryStorage()
  appendGradientSubmission(draft(), s)
  clearGradientSubmissions(s)
  assert.deepEqual(readGradientSubmissions(s), [])
})
