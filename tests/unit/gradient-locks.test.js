// Gradient locks (spec gradient-generation-v2 §4, tests T-C1 to T-C3): what Random
// and Shuffle keep, and how the old saved shapes migrate. Every roll is seeded
// (`mulberry32`), so nothing here depends on Math.random and nothing is flaky.
//
// The test seam is the pair the page calls on a press: `rollGradient` with the
// options from `lockedRollOptions`, then `rebuildStops` over the current stops.
//
// MUTATIONS (each turns the tests named red):
//   normaliseStop copies `locked` to lockColour only          -> "a stop saved with locked: true holds both locks"
//   parseGeometryLocks ignores the older filters entry         -> "keepAngle: true in the older filters becomes the angle lock"
//   parseGeometryLocks lets keepAngle beat a saved lock        -> "a saved lock beats the older keepAngle flag"
//   rebuildStops keeps `position` for a colour-locked stop     -> "a colour lock keeps the colour, and the position is re-spaced"
//   rebuildStops keeps `color` for a position-locked stop      -> "a position lock keeps the position, and the colour is re-rolled"
//   rebuildStops re-spaces a position-locked stop              -> "a position lock keeps the position, and the colour is re-rolled"
//   rebuildStops drops the lock flags from its output          -> "a colour lock survives 200 rolls in a row"
//   lockedRollOptions ignores hasStopLock                      -> "a stop lock fixes the count and beats the Stops filter"
//   rollGradient ignores locks.type                            -> "a type lock beats the Type filter, 200 rolls"
//   rollGradient does not map locks.type into `types`          -> "a locked Radial is never turned into Linear"
//   pickPaletteLook falls back to Linear when `types` leaves it out -> "a locked Radial from a palette keeps Radial ..."
//   rollGradient ignores locks.angle                         -> "an angle lock keeps the angle, 200 rolls"
//   rollGradient drops locks.space from its result             -> "an interpolation lock comes back from the roll"
//   rebuildStops skips the closeSeam block                     -> "a conic roll keeps the seam closed around a locked end"
//   rebuildStops resamples locked stops when all are locked    -> "with every colour locked the shape still rolls"
//   setStopLock writes lockColour for kind 'position'          -> "setStopLock flips one lock on the chosen stops only"
//   spacePositions ignores the locked neighbour                -> "free stops are spread between the locked positions"
//   rebuildStops spaces in array order (rampOrder = identity)  -> "a position lock on a stop added between the ends ...", "after Flip a lock ...", "a stop locked at 100 is not joined ..."
//   rebuildStops samples by array index, not ramp place       -> "a position lock on a stop added between the ends ..." (colours c0,c2,c1)
//   rampOrder drops the tie rule                              -> "a stop locked at 100 is not joined ...", "rampOrder sorts by position ..."
//   rebuildStops closes the seam on array first/last          -> "a rebuild with array order different from ramp order ..."
import test from 'node:test'
import assert from 'node:assert/strict'
import { rollGradient, mulberry32, pickPaletteLook, radialGatePasses } from '../../src/utils/gradientRandom.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'
import {
  NO_GEOMETRY_LOCKS, normaliseStop, normaliseStops, clearStopLocks, setStopLock, hasStopLock,
  parseGeometryLocks, geometryHolds, lockedRollOptions, rebuildStops, spacePositions, rampOrder,
} from '../../src/utils/gradientLocks.js'

const ROLLS = 200
const stop = (color, position, lockColour = false, lockPosition = false) => ({ color, position, lockColour, lockPosition })
const three = () => [stop('#112233', 0), stop('#445566', 20), stop('#778899', 100)]

// What a press of Random does in the page: roll with the locks laid over the
// filters, then rebuild the stops around the locked ones.
function press(rand, stops, { filters = {}, locks = NO_GEOMETRY_LOCKS, current = { type: 'Linear', angle: 135, space: 'oklch' } } = {}) {
  const g = rollGradient(rand, lockedRollOptions({ types: filters.types || [], counts: filters.counts || [] }, locks, current, stops))
  const out = rebuildStops(stops, (i) => g.stops[i % g.stops.length].color, g.stops.length, g.type === 'Conic')
  return { g, stops: out }
}
const run = (seed, fn) => { const rand = mulberry32(seed); return Array.from({ length: ROLLS }, () => fn(rand)) }

// ── Migration ──

test('a stop saved with locked: true holds both locks', () => {
  const s = normaliseStop({ color: '#112233', position: 40, locked: true })
  assert.equal(s.lockColour, true)
  assert.equal(s.lockPosition, true)
  assert.ok(!('locked' in s), 'the old flag is dropped')
  assert.equal(s.color, '#112233')
  assert.equal(s.position, 40)
})

test('an unlocked stop, and a stop with one lock, keep exactly what they had', () => {
  assert.deepEqual(normaliseStop({ color: '#000000', position: 0 }), { color: '#000000', position: 0, lockColour: false, lockPosition: false })
  assert.deepEqual(normaliseStop({ color: '#000000', position: 0, locked: false }), { color: '#000000', position: 0, lockColour: false, lockPosition: false })
  const colourOnly = normaliseStop({ color: '#000000', position: 0, lockColour: true })
  assert.equal(colourOnly.lockColour, true)
  assert.equal(colourOnly.lockPosition, false)
  assert.deepEqual(normaliseStops(undefined), [])
})

test('keepAngle: true in the older filters becomes the angle lock', () => {
  const locks = parseGeometryLocks(null, JSON.stringify({ types: ['Any'], counts: ['Any'], keepAngle: true }))
  assert.deepEqual(locks, { type: false, angle: true, interp: false })
  assert.deepEqual(parseGeometryLocks(null, JSON.stringify({ keepAngle: false })), NO_GEOMETRY_LOCKS)
})

test('a saved lock beats the older keepAngle flag', () => {
  const locks = parseGeometryLocks(JSON.stringify({ type: true, angle: false, interp: true }), JSON.stringify({ keepAngle: true }))
  assert.deepEqual(locks, { type: true, angle: false, interp: true })
})

test('nothing saved, or unreadable storage, means no geometry locks', () => {
  assert.deepEqual(parseGeometryLocks(null, null), NO_GEOMETRY_LOCKS)
  assert.deepEqual(parseGeometryLocks('{not json', '{also not'), NO_GEOMETRY_LOCKS)
  assert.deepEqual(parseGeometryLocks('42', '"x"'), NO_GEOMETRY_LOCKS)
})

// ── Stop locks ──

test('a colour lock keeps the colour, and the position is re-spaced', () => {
  const stops = three()
  stops[1].lockColour = true
  const outs = run(1, (rand) => press(rand, stops).stops)
  for (const out of outs) {
    assert.equal(out[1].color, '#445566')
    assert.equal(out[1].position, 50, 'the colour-locked stop is spaced with the others, not left at 20')
    assert.deepEqual(out.map((s) => s.position), [0, 50, 100])
  }
  const freeColours = new Set(outs.flatMap((out) => [out[0].color, out[2].color]))
  assert.ok(freeColours.size > 50, 'the free stops are re-rolled')
})

test('a position lock keeps the position, and the colour is re-rolled', () => {
  const stops = three()
  stops[1].position = 30
  stops[1].lockPosition = true
  const outs = run(2, (rand) => press(rand, stops).stops)
  for (const out of outs) assert.equal(out[1].position, 30)
  assert.ok(outs.every((out) => out[0].position === 0 && out[2].position === 100), 'free stops still reach both ends')
  const colours = new Set(outs.map((out) => out[1].color))
  assert.ok(colours.size > 50, `the position-locked stop gets new colours (${colours.size} distinct in ${ROLLS})`)
})

test('both locks on one stop leave it exactly as it was', () => {
  const stops = three()
  stops[2] = stop('#778899', 90, true, true)
  for (const out of run(3, (rand) => press(rand, stops).stops)) {
    assert.equal(out[2].color, '#778899')
    assert.equal(out[2].position, 90)
  }
})

test('a colour lock survives 200 rolls in a row', () => {
  // Each roll builds on the last, as repeated presses do.
  let stops = three()
  stops[0].lockColour = true
  const rand = mulberry32(4)
  for (let i = 0; i < ROLLS; i++) {
    stops = press(rand, stops).stops
    assert.equal(stops[0].color, '#112233')
    assert.equal(stops[0].lockColour, true, 'the lock flag is carried to the next roll')
    assert.equal(stops.length, 3)
  }
})

test('a stop lock fixes the count and beats the Stops filter', () => {
  const stops = [stop('#111111', 0), stop('#333333', 33, true), stop('#555555', 66), stop('#777777', 100)]
  for (const { g, stops: out } of run(5, (rand) => press(rand, stops, { filters: { counts: [2] } }))) {
    assert.equal(out.length, 4, 'four stops stay four although the filter says two')
    assert.equal(out[1].color, '#333333')
    assert.ok(g.stops.length === 4)
  }
  // Control: with no stop lock the filter decides (Linear, since a conic needs three).
  for (const { stops: out } of run(6, (rand) => press(rand, three(), { filters: { types: ['Linear'], counts: [2] } }))) assert.equal(out.length, 2)
})

test('a position lock alone also keeps the count', () => {
  const stops = [stop('#111111', 0), stop('#333333', 40, false, true), stop('#555555', 100)]
  assert.equal(hasStopLock(stops), true)
  for (const { stops: out } of run(7, (rand) => press(rand, stops, { filters: { counts: [2] } }))) assert.equal(out.length, 3)
})

test('with every colour locked the shape still rolls', () => {
  const stops = three().map((s) => ({ ...s, lockColour: true }))
  const results = run(8, (rand) => press(rand, stops))
  for (const { stops: out } of results) assert.deepEqual(out.map((s) => s.color), ['#112233', '#445566', '#778899'])
  assert.ok(new Set(results.map((r) => r.g.type)).size > 1, 'the type is drawn')
  assert.ok(new Set(results.map((r) => r.g.angle)).size > 3, 'the angle is drawn')
})

test('a conic roll keeps the seam closed around a locked end', () => {
  const conic = { locks: { ...NO_GEOMETRY_LOCKS, type: true }, current: { type: 'Conic', angle: 0, space: 'oklch' } }
  const first = three(); first[0].lockColour = true
  for (const { g, stops: out } of run(9, (rand) => press(rand, first, conic))) {
    assert.equal(g.type, 'Conic')
    assert.equal(out[2].color, out[0].color)
    assert.equal(out[0].color, '#112233')
  }
  const last = three(); last[2].lockColour = true
  for (const { stops: out } of run(10, (rand) => press(rand, last, conic))) {
    assert.equal(out[0].color, out[2].color)
    assert.equal(out[2].color, '#778899')
  }
})

test('free stops are spread between the locked positions', () => {
  assert.deepEqual(spacePositions([null, null]), [0, 100])
  assert.deepEqual(spacePositions([null, null, null, null, null]), [0, 25, 50, 75, 100])
  assert.deepEqual(spacePositions([null, 30, null]), [0, 30, 100])
  assert.deepEqual(spacePositions([null, null, 60, null]), [0, 30, 60, 100])
  assert.deepEqual(spacePositions([20, null, null]), [20, 60, 100])
  assert.deepEqual(spacePositions([10, null, 70, null, 90]), [10, 40, 70, 80, 90])
})

// The array is creation order, not ramp order: a stop added later sits at the end of
// the array wherever it was dropped, and Flip moves positions without moving stops.
test('a position lock on a stop added between the ends still lets the ramp reach 100', () => {
  const stops = [stop('#111111', 0), stop('#222222', 100), stop('#333333', 50, false, true)]
  const out = rebuildStops(stops, (r) => `c${r}`, 3)
  assert.deepEqual(out.map((s) => s.position), [0, 100, 50], 'the added stop keeps 50, the first stays at 0 and the second reaches 100')
  assert.deepEqual(out.map((s) => s.color), ['c0', 'c2', 'c1'], 'colours follow the ramp, not the array')
})

test('after Flip a lock on the stop now at 100 does not collapse the ramp', () => {
  const flipped = [stop('#111111', 100, false, true), stop('#222222', 50), stop('#333333', 0)]
  const out = rebuildStops(flipped, (r) => `c${r}`, 3)
  assert.deepEqual(out.map((s) => s.position), [100, 50, 0])
  assert.equal(new Set(out.map((s) => s.position)).size, 3, 'no two stops stack')
})

test('a stop locked at 100 is not joined by a free stop that comes later in the array', () => {
  const out = rebuildStops([stop('#111111', 0), stop('#222222', 100, false, true), stop('#333333', 60)], (r) => `c${r}`, 3)
  assert.deepEqual(out.map((s) => s.position), [0, 100, 50])
  // Tied at 100: the free stop goes on the inside of the lock, and the other way round at 0.
  const tie = rebuildStops([stop('#111111', 100, false, true), stop('#222222', 100), stop('#333333', 0)], (r) => `c${r}`, 3)
  assert.deepEqual(tie.map((s) => s.position), [100, 50, 0])
  const tie0 = rebuildStops([stop('#111111', 0, false, true), stop('#222222', 0), stop('#333333', 100)], (r) => `c${r}`, 3)
  assert.deepEqual(tie0.map((s) => s.position), [0, 50, 100])
})

test('a rebuild with array order different from ramp order keeps the array order and the seam at the ramp ends', () => {
  // Array: middle, last, first. The first stop on the ramp (index 2) holds the colour.
  const stops = [stop('#aaaaaa', 50), stop('#bbbbbb', 100), stop('#cccccc', 0, true)]
  const out = rebuildStops(stops, (r) => `c${r}`, 3, true)
  assert.deepEqual(out.map((s) => s.position), [50, 100, 0])
  assert.equal(out[1].color, '#cccccc', 'the ramp end takes the colour of the locked ramp start')
  assert.equal(out[2].color, '#cccccc')
  assert.equal(out[0].color, 'c1')
})

test('rampOrder sorts by position, free beside locked on the inside', () => {
  assert.deepEqual(rampOrder([stop('#1', 100), stop('#2', 0), stop('#3', 50)]), [1, 2, 0])
  assert.deepEqual(rampOrder([stop('#1', 100), stop('#2', 100, false, true)]), [0, 1])
  assert.deepEqual(rampOrder([stop('#1', 0), stop('#2', 0, false, true)]), [1, 0])
})

test('setStopLock flips one lock on the chosen stops only', () => {
  const before = three()
  const after = setStopLock(before, [0, 2], 'position', true)
  assert.deepEqual(after.map((s) => s.lockPosition), [true, false, true])
  assert.deepEqual(after.map((s) => s.lockColour), [false, false, false], 'the colour locks are untouched')
  const colours = setStopLock(after, [1], 'colour', true)
  assert.deepEqual(colours.map((s) => s.lockColour), [false, true, false])
  assert.deepEqual(colours.map((s) => s.lockPosition), [true, false, true], 'the position locks are untouched')
  assert.deepEqual(setStopLock(colours, [1], 'colour', false).map((s) => s.lockColour), [false, false, false])
  assert.deepEqual(before.map((s) => s.lockPosition), [false, false, false], 'the input is not changed')
})

test('clearStopLocks drops every stop lock and nothing else', () => {
  const stops = [stop('#111111', 5, true, true), stop('#222222', 95, false, true)]
  assert.deepEqual(clearStopLocks(stops), [stop('#111111', 5), stop('#222222', 95)])
})

// ── Geometry locks ──

test('a type lock beats the Type filter, 200 rolls', () => {
  for (const type of ['Linear', 'Radial', 'Conic']) {
    const other = type === 'Conic' ? ['Linear'] : ['Conic']
    const locks = { ...NO_GEOMETRY_LOCKS, type: true }
    const got = run(11, (rand) => press(rand, three(), { filters: { types: other }, locks, current: { type, angle: 90, space: 'oklch' } }).g.type)
    assert.ok(got.every((t) => t === type), `${type} locked against the filter ${other}`)
  }
  // Control: unlocked, the filter decides.
  const free = run(12, (rand) => press(rand, three(), { filters: { types: ['Conic'] } }).g.type)
  assert.ok(free.every((t) => t === 'Conic'))
})

test('a locked Radial is never turned into Linear', () => {
  const locks = { ...NO_GEOMETRY_LOCKS, type: true }
  const current = { type: 'Radial', angle: 0, space: 'oklch' }
  const results = Array.from({ length: 1000 }, (_, i) => {
    const rand = mulberry32(1000 + i)
    return press(rand, three(), { locks, current }).g
  })
  assert.ok(results.every((g) => g.type === 'Radial'), 'every roll stays Radial')
  const lc = (hex) => { const [L, C] = hexToOklchRaw(hex); return { L, C } }
  const passing = results.filter((g) => radialGatePasses(lc(g.stops[0].color), lc(g.stops.at(-1).color))).length
  // 982 of 1000 when measured: the re-rolls find a light or a vignette almost every time.
  assert.ok(passing / results.length > 0.9, `most locked Radial rolls pass the gate (${passing} of ${results.length})`)
})

test('a locked Radial from a palette keeps Radial even when no pair reads as a light', () => {
  // Two near-identical greys never pass the radial gate.
  const pool = ['#808080', '#818181']
  const rand = mulberry32(13)
  const held = pickPaletteLook(pool, 2, 'Radial', ['Radial'], rand)
  assert.equal(held.type, 'Radial')
  // Control: with Linear on offer the same pool does fall back.
  assert.equal(pickPaletteLook(pool, 2, 'Radial', [], mulberry32(13)).type, 'Linear')
})

test('an angle lock keeps the angle, 200 rolls', () => {
  const locks = { ...NO_GEOMETRY_LOCKS, angle: true }
  const got = run(14, (rand) => press(rand, three(), { locks, current: { type: 'Linear', angle: 77, space: 'oklch' } }).g.angle)
  assert.ok(got.every((a) => a === 77))
  // Control: unlocked, the angle is drawn.
  const free = run(14, (rand) => press(rand, three()).g.angle)
  assert.ok(new Set(free).size > 3)
})

test('an interpolation lock comes back from the roll', () => {
  const locks = { ...NO_GEOMETRY_LOCKS, interp: true }
  for (const space of ['srgb', 'oklch']) {
    const got = run(15, (rand) => press(rand, three(), { locks, current: { type: 'Linear', angle: 90, space } }).g.space)
    assert.ok(got.every((s) => s === space))
  }
  assert.equal(press(mulberry32(15), three()).g.space, undefined, 'unlocked, the roll leaves the space alone')
})

test('geometryHolds names the value to keep only for a lock that is on', () => {
  const current = { type: 'Conic', angle: 12, space: 'srgb' }
  assert.deepEqual(geometryHolds(NO_GEOMETRY_LOCKS, current), { type: null, angle: null, space: null })
  assert.deepEqual(geometryHolds({ type: true, angle: false, interp: true }, current), { type: 'Conic', angle: null, space: 'srgb' })
})

test('Reset starts from no geometry locks, and the set is frozen', () => {
  assert.deepEqual(NO_GEOMETRY_LOCKS, { type: false, angle: false, interp: false })
  assert.ok(Object.isFrozen(NO_GEOMETRY_LOCKS), 'a lock cannot be switched on in the shared default')
})
