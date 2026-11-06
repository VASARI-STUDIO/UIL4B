// THE PALETTE FRAME'S RULES, APART FROM THE SCREEN: WHAT RANDOMISE BUILDS AND KEEPS,
// WHERE THE SLIDERS SNAP, AND WHICH LINE THE FOOT READS.
//
// Each test names the mutation that makes it fail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADJ, SAMPLE, TEMP, build, mix, snap, statusLine } from '../../src/components/home/try/paletteLogic.js'

const HEX = /^#[0-9A-F]{6}$/
const field = (k) => ADJ.find((f) => f.k === k)
const base = { copied: '', failed: false, locked: [false, false, false, false, false], carried: false, fresh: false, note: '', noteIsVision: false, hexes: SAMPLE }

test('build returns five valid upper-case hexes at every hue', () => {
  // Mutation: let oklchHex skip the in-gamut chroma loop, or drop toUpperCase-style padding so a channel prints short.
  for (let h = 0; h < 360; h += 15) {
    const out = build(h)
    assert.equal(out.length, 5, `hue ${h}`)
    for (const c of out) assert.match(c, HEX, `hue ${h}: ${c}`)
  }
})

test('build lifts Secondary when it would sit too close to Primary', () => {
  // Mutation: delete the contrast fix-up line in build(); the Primary/Secondary pair at a dark hue then stays under 1.6 (about 1.45 near hue 246).
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const f = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
  }
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
  for (let h = 0; h < 360; h += 1) {
    const [p, s] = build(h)
    assert.ok(ratio(p, s) >= 1.6, `hue ${h}: ${p} against ${s} is ${ratio(p, s).toFixed(2)}`)
  }
})

test('mix keeps every locked colour and replaces the rest', () => {
  // Mutation: invert the test in mix (locked[i] ? fresh[i] : c) and a locked colour is overwritten.
  const fresh = build(200)
  const out = mix(SAMPLE, [true, false, true, false, false], fresh)
  assert.equal(out[0], SAMPLE[0])
  assert.equal(out[2], SAMPLE[2])
  assert.equal(out[1], fresh[1])
  assert.equal(out[3], fresh[3])
  assert.equal(out[4], fresh[4])
  assert.deepEqual(mix(SAMPLE, [true, true, true, true, true], fresh), SAMPLE)
})

test('sliders snap to their detents and not outside the radius', () => {
  // Mutation: change a radius in ADJ's snaps (4 to 3 for hue) or compare with < instead of <=.
  const hue = field('h')
  assert.equal(snap(hue, 4), 0)
  assert.equal(snap(hue, -4), 0)
  assert.equal(snap(hue, 5), 5)
  const sat = field('s')
  assert.equal(snap(sat, 8), 0)
  assert.equal(snap(sat, -9), -9)
  assert.equal(snap(field('b'), 7), 0)
})

test('temperature snaps at -50, 0 and 50, each with its own radius', () => {
  // Mutation: drop the [-50, 6] or [50, 6] detent from TEMP, or give 0 the radius 6 instead of 12.
  assert.equal(snap(TEMP, -45), -50)
  assert.equal(snap(TEMP, -44), -44)
  assert.equal(snap(TEMP, 56), 50)
  assert.equal(snap(TEMP, 57), 57)
  assert.equal(snap(TEMP, 12), 0)
  assert.equal(snap(TEMP, -13), -13)
})

test('statusLine: a copy beats everything, and a failed copy says so', () => {
  // Mutation: move the `copied` branch below the all-locked branch, or drop the `failed` ternary.
  const all = [true, true, true, true, true]
  assert.equal(statusLine({ ...base, copied: 'hex-1', locked: all }), 'Copied #1A1A1A.')
  assert.equal(statusLine({ ...base, copied: 'hex-1', failed: true }), 'Couldn’t copy. Try again.')
})

test('statusLine: all five locked asks for one to be unlocked', () => {
  // Mutation: change the n === 5 check to n > 5.
  assert.equal(statusLine({ ...base, locked: [true, true, true, true, true] }), 'All locked. Unlock one to randomise.')
})

test('statusLine: before any carry, the note, then the lock prompts', () => {
  // Mutation: drop `!noteIsVision` so a vision note replaces the lock prompt, or swap the two lock prompts.
  assert.equal(statusLine({ ...base, note: 'Hue 4 degrees.' }), 'Hue 4 degrees.')
  assert.equal(statusLine({ ...base, note: 'Seen as Protanopia.', noteIsVision: true }), 'Lock one you like, then randomise.')
  assert.equal(statusLine({ ...base }), 'Lock one you like, then randomise.')
  assert.equal(statusLine({ ...base, locked: [true, false, false, false, false] }), 'Locked. Now randomise the rest.')
})

test('statusLine: once the colours carry over, the line is read once, then the counts', () => {
  // Mutation: ignore `fresh` (always return the carry-over line) or ignore `carried`.
  assert.equal(statusLine({ ...base, carried: true, fresh: true }), 'These five colours carry over.')
  assert.equal(statusLine({ ...base, carried: true, note: 'All five, 10 warmer.' }), 'All five, 10 warmer.')
  assert.equal(statusLine({ ...base, carried: true, locked: [true, true, false, false, false] }), '2 locked. Randomise changes the rest.')
  assert.equal(statusLine({ ...base, carried: true }), 'Lock one you like, then randomise.')
})
