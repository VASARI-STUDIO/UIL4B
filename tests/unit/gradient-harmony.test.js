// T21: harmony and tone (spec section 4.2). The pickers take a roll, so the
// whole roll space is swept on a grid and the shares are exact, the way
// tests/unit/gradient-random.test.js does it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { hexToOk, hueDistance, mulberry32 } from '../../src/utils/gradientStyles.js'
import {
  DEEP_L_FLOOR, L_LIMITS, MAX_CHROMA_GAP, pickHarmony, pickTone, rollPair,
} from '../../src/utils/gradientHarmony.js'

const GRID = 100000
const share = (fn, value) => {
  let n = 0
  for (let i = 0; i < GRID; i++) if (fn(i / GRID) === value) n++
  return (n / GRID) * 100
}

test('T21: harmony shares are Analogous 60, Monochrome 25, Complementary 15 (+-1)', () => {
  for (const [name, want] of [['analogous', 60], ['monochrome', 25], ['complementary', 15]]) {
    assert.ok(Math.abs(share(pickHarmony, name) - want) <= 1, name)
  }
})

test('T21: tone shares are Clear 70, Muted 15, Deep 15 (+-1)', () => {
  for (const [name, want] of [['clear', 70], ['muted', 15], ['deep', 15]]) {
    assert.ok(Math.abs(share(pickTone, name) - want) <= 1, name)
  }
})

test('T21: 100k rolled pairs keep the chroma gap and lightness limits, and sit inside sRGB', () => {
  for (let seed = 1; seed <= GRID; seed++) {
    const rng = mulberry32(seed)
    const harmony = pickHarmony(rng())
    const tone = pickTone(rng())
    const [a, b] = rollPair(rng, harmony, tone)
    assert.match(a, /^#[0-9a-f]{6}$/)
    assert.match(b, /^#[0-9a-f]{6}$/)
    const A = hexToOk(a)
    const B = hexToOk(b)
    const tag = `${seed} ${harmony} ${tone} ${a} ${b}`
    assert.ok(Math.abs(A.C - B.C) <= MAX_CHROMA_GAP, `chroma gap: ${tag}`)
    const lo = (tone === 'deep' ? DEEP_L_FLOOR : L_LIMITS[0]) - 0.01
    for (const o of [A, B]) assert.ok(o.L >= lo && o.L <= L_LIMITS[1] + 0.01, `lightness: ${tag}`)
    if (harmony === 'complementary') {
      assert.ok(Math.min(A.C, B.C) <= 0.12 + 0.005, `complementary chroma cap: ${tag}`)
      assert.ok(Math.abs(A.L - B.L) >= 0.12 - 0.01, `complementary lightness gap: ${tag}`)
    }
    if (A.C >= 0.05 && B.C >= 0.05) {
      const d = hueDistance(A.H, B.H)
      if (harmony === 'monochrome') assert.ok(d <= 12 + 4, `monochrome hue: ${tag}`)
      if (harmony === 'analogous') assert.ok(d >= 20 - 4 && d <= 60 + 4, `analogous hue: ${tag}`)
      if (harmony === 'complementary') assert.ok(d >= 150 - 4, `complementary hue: ${tag}`)
    }
  }
})
