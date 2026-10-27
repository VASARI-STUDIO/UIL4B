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

// How far one 8-bit step in any channel can move a hex's hue and lightness.
// Near black a single step swings the hue by tens of degrees and the lightness
// by a hundredth or more, so a hex there cannot carry the numbers it was rolled
// with. The hue rules are checked only where a step moves the hue by <= 4
// degrees, and the lightness limits and gap allow one step of slack.
const HUE_SLACK_MAX = 4
const slackCache = new Map()
function stepSlack(hex) {
  if (slackCache.has(hex)) return slackCache.get(hex)
  const base = hexToOk(hex)
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const worst = { H: 0, L: 0 }
  for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
    const n = [v[0] + dr, v[1] + dg, v[2] + db].map((x) => Math.min(255, Math.max(0, x)))
    const o = hexToOk('#' + n.map((x) => x.toString(16).padStart(2, '0')).join(''))
    worst.H = Math.max(worst.H, hueDistance(base.H, o.H))
    worst.L = Math.max(worst.L, Math.abs(base.L - o.L))
  }
  slackCache.set(hex, worst)
  return worst
}

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
    for (const [o, hex] of [[A, a], [B, b]]) {
      const step = stepSlack(hex).L
      assert.ok(o.L + step >= lo && o.L - step <= L_LIMITS[1] + 0.01, `lightness: ${tag}`)
    }
    if (harmony === 'complementary') {
      assert.ok(Math.min(A.C, B.C) <= 0.12 + 0.005, `complementary chroma cap: ${tag}`)
      assert.ok(Math.abs(A.L - B.L) + stepSlack(a).L + stepSlack(b).L >= 0.12 - 0.01, `complementary lightness gap: ${tag}`)
    }
    if (A.C >= 0.05 && B.C >= 0.05 && stepSlack(a).H <= HUE_SLACK_MAX && stepSlack(b).H <= HUE_SLACK_MAX) {
      const d = hueDistance(A.H, B.H)
      if (harmony === 'monochrome') assert.ok(d <= 12 + 4, `monochrome hue: ${tag}`)
      if (harmony === 'analogous') assert.ok(d >= 20 - 4 && d <= 60 + 4, `analogous hue: ${tag}`)
      if (harmony === 'complementary') assert.ok(d >= 150 - 4, `complementary hue: ${tag}`)
    }
  }
})
