// The Palette Builder's global-adjust lens, and the hand-offs out of it.
//
// REGRESSION GUARD (the bug these tests exist for): the builder used to persist
// the ADJUSTED colours alongside the slider values, so the next mount re-applied
// the lens to an already-adjusted palette. Every save/reload cycle compounded
// the adjustment, and dragging a slider back to 0 restored a base that had
// already drifted. The fix is a strict split — `colors` is the derived result
// that the rest of the app reads, `baseColors` + `globalAdjust` are what the
// board re-derives from, and `applyAdjust` stays the single derivation between
// them. These tests assert that split end to end, including the migration of a
// project saved under the old shape.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAdjust, hctToHex, hexToHct } from '../../src/utils/colors.js'
import {
  ZERO_ADJUST,
  normaliseAdjust,
  persistedPalette,
  readSavedPalette,
} from '../../src/utils/paletteAdjust.js'
import {
  COLOR_HANDOFF_VERSION,
  GRADIENT_HANDOFF_MAX,
  buildGradientDraft,
  consumeGradientDraft,
  consumeTintDraft,
  readGradientDraft,
  readTintDraft,
  resetGradientDraft,
  resetTintDraft,
  setGradientDraft,
  setTintDraft,
} from '../../src/utils/colorHandoff.js'

const ZERO = { ...ZERO_ADJUST }
const BASE = ['#4338E0', '#7C6CF0', '#F59E0B', '#F1F0FE', '#1B1544']

const upper = (list) => list.map((c) => c.toUpperCase())
const same = (a, b) => upper(a).join(',') === upper(b).join(',')
const rgbDistance = (a, b) => {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16)
  return Math.hypot(ch(a, 1) - ch(b, 1), ch(a, 3) - ch(b, 3), ch(a, 5) - ch(b, 5))
}

// One full save → reload → re-derive cycle, exactly as a remount performs it,
// through the real functions the Palette Builder writes and reads with.
function cycle(state) {
  const restored = readSavedPalette(persistedPalette(state.colors, state.adjust))
  return { colors: restored.colors, adjust: restored.adjust }
}

/* ── the lens itself ─────────────────────────────────────────────────────── */

test('a zero lens is the identity, and returns the very same array', () => {
  assert.equal(applyAdjust(BASE, ZERO), BASE)
  assert.equal(applyAdjust(BASE, null), BASE)
})

test('every field of the lens actually changes the palette', () => {
  for (const field of ['h', 's', 'b', 'temp']) {
    const out = applyAdjust(BASE, { ...ZERO, [field]: 40 })
    assert.equal(out.length, BASE.length)
    assert.ok(!same(out, BASE), `${field} should move the colours`)
  }
})

test('the lens is pure — the base array is never mutated', () => {
  const base = [...BASE]
  applyAdjust(base, { ...ZERO, h: 90, s: 30, b: -20, temp: 60 })
  assert.deepEqual(base, BASE)
})

/* ── the round trip: this is the bug that must not come back ─────────────── */

test('saving and reloading does not compound the adjustment', () => {
  const adjust = { ...ZERO, h: 40, s: 25, b: -10, temp: 30 }
  const shownOnce = applyAdjust(BASE, adjust)

  let state = { colors: BASE, adjust }
  for (let i = 0; i < 10; i++) {
    state = cycle(state)
    assert.ok(same(state.colors, BASE), `cycle ${i + 1} kept the base intact`)
    assert.deepEqual(state.adjust, adjust, `cycle ${i + 1} kept the sliders`)
    assert.ok(same(applyAdjust(state.colors, state.adjust), shownOnce),
      `cycle ${i + 1} still shows the SAME colours — the lens applied once, not ${i + 2} times`)
  }
})

test('zeroing the sliders restores the base palette exactly', () => {
  let state = { colors: BASE, adjust: { ...ZERO, h: 120, s: -40, b: 25, temp: -80 } }
  state = cycle(state)              // the user saves and comes back
  state = { ...state, adjust: ZERO } // then drags all four sliders back to 0
  assert.deepEqual(applyAdjust(state.colors, state.adjust), upper(BASE))
  // …and it still holds after another save/reload of the zeroed board.
  state = cycle(state)
  assert.deepEqual(state.colors, upper(BASE))
  assert.deepEqual(state.adjust, ZERO)
})

test('what the rest of the app reads is what the user sees', () => {
  // Tint, Gradient, exports, share cards and the dashboard all read
  // palette.colors and never re-apply the lens, so it must stay the RESULT.
  const adjust = { ...ZERO, s: 60, temp: 45 }
  const saved = persistedPalette(BASE, adjust)
  assert.ok(same(saved.colors, applyAdjust(BASE, adjust)))
  assert.ok(!same(saved.colors, saved.baseColors), 'a live lens really is baked into what is shown')
})

/* ── migration off the old shape ─────────────────────────────────────────── */

test('a project saved under the OLD shape opens unchanged, never re-adjusted', () => {
  // The old writer stored already-adjusted colours plus the sliders that made
  // them, and no base. The honest reading: those colours ARE the base now, and
  // the sliders start at zero — so nothing shifts on load.
  const adjust = { ...ZERO, h: 55, temp: 70 }
  const legacy = { colors: applyAdjust(BASE, adjust), globalAdjust: adjust }

  const restored = readSavedPalette(legacy)
  assert.deepEqual(restored.adjust, ZERO, 'the stale lens is dropped, not re-applied')
  assert.ok(same(applyAdjust(restored.colors, restored.adjust), legacy.colors),
    'the board opens on exactly the colours the project was saved with')

  // And from there the palette is stable forever.
  assert.ok(same(cycle(restored).colors, legacy.colors))
})

test('a base left behind by another tool is ignored rather than resurrected', () => {
  // Colour Studio and the Projects palette-apply write `colors` without knowing
  // about `baseColors`, so a stale base can sit next to fresh colours. It must
  // never win — that would silently restore a palette the user moved on from.
  const stale = {
    baseColors: BASE,
    colors: ['#101010', '#202020', '#303030'],
    globalAdjust: { ...ZERO, h: 40 },
  }
  const restored = readSavedPalette(stale)
  assert.deepEqual(restored.colors, upper(stale.colors))
  assert.deepEqual(restored.adjust, ZERO)
})

test('an unusable saved palette falls through to the tool default', () => {
  assert.equal(readSavedPalette(undefined), null)
  assert.equal(readSavedPalette({ colors: [] }), null)
  assert.equal(readSavedPalette({ colors: ['#4338E0'] }), null, 'one colour is not a palette')
  assert.equal(readSavedPalette({ colors: ['nonsense', '', null, 12] }), null)
})

test('a corrupt stored lens is clamped, never trusted raw', () => {
  assert.deepEqual(normaliseAdjust(null), ZERO)
  assert.deepEqual(normaliseAdjust('warm'), ZERO)
  assert.deepEqual(normaliseAdjust({ h: 9999, s: -9999, b: NaN, temp: '45' }),
    { h: 180, s: -100, b: 0, temp: 45 })
  // An out-of-range stored lens still round-trips without compounding.
  const restored = readSavedPalette({
    baseColors: BASE, colors: applyAdjust(BASE, { ...ZERO, h: 180 }), globalAdjust: { h: 9999 },
  })
  assert.ok(same(restored.colors, BASE))
  assert.equal(restored.adjust.h, 180)
})

/* ── temperature: no direction flip between neighbouring hues ────────────── */

test('warming a cool palette never splits neighbouring hues apart', () => {
  // The old shortest-arc rotation flipped direction either side of the warm
  // anchor's opposite (210°): a teal at 205° went green while the blue at 215°
  // beside it went purple. Measured on this exact sweep, a ONE degree change of
  // input produced a 143-unit jump in RGB. The pull is now continuous, so
  // neighbouring hues stay neighbours.
  const sweep = []
  for (let h = 195; h <= 225; h += 1) sweep.push(hctToHex(h, 45, 55))
  const warmed = applyAdjust(sweep, { ...ZERO, temp: 100 })

  let worst = 0
  for (let i = 1; i < warmed.length; i++) {
    worst = Math.max(worst, rgbDistance(warmed[i - 1], warmed[i]))
  }
  assert.ok(worst < 12, `1° of input hue moved the result by at most ${worst.toFixed(1)} in RGB`)
})

test('warming keeps a cool palette internally coherent', () => {
  const cool = [hctToHex(195, 45, 55), hctToHex(205, 45, 50), hctToHex(228, 45, 45)]
  const warmed = applyAdjust(cool, { ...ZERO, temp: 50 })
  const hues = warmed.map((hex) => hexToHct(hex)[0])
  // All three move the SAME way, and none of them laps the wheel to the far
  // side (the old model landed these on 154° / 161° / 268° — two greens and a
  // purple out of one nudge of the slider).
  const spread = Math.max(...hues) - Math.min(...hues)
  assert.ok(spread < 60, `the palette stayed together (hue spread ${spread.toFixed(0)}°)`)
})

test('temperature is symmetric: warm and cool are opposite pulls', () => {
  const warm = applyAdjust(BASE, { ...ZERO, temp: 60 })
  const cool = applyAdjust(BASE, { ...ZERO, temp: -60 })
  assert.ok(!same(warm, cool))
  assert.ok(!same(warm, BASE) && !same(cool, BASE))
})

/* ── the hand-offs out of the builder ────────────────────────────────────── */

test('a gradient draft is capped, deduped and version-stamped', () => {
  const draft = buildGradientDraft(['#4338E0', '#4338e0', '#7C6CF0', '#F59E0B', '#F1F0FE', '#1B1544', '#000000'])
  assert.equal(draft.version, COLOR_HANDOFF_VERSION)
  assert.equal(draft.colors.length, GRADIENT_HANDOFF_MAX)
  assert.deepEqual(draft.colors, ['#4338E0', '#7C6CF0', '#F59E0B', '#F1F0FE', '#1B1544'])
})

test('a draft that cannot make a gradient is never staged', () => {
  resetGradientDraft()
  assert.equal(buildGradientDraft(['#4338E0']), null, 'one colour is not a gradient')
  assert.equal(buildGradientDraft(['#4338E0', '#4338E0']), null, 'nor is the same colour twice')
  assert.equal(buildGradientDraft(['not-a-colour', 12, null]), null)
  assert.equal(setGradientDraft(['#4338E0']), false)
  assert.equal(readGradientDraft(), null)
})

test('the palette transfers to the Gradient Generator exactly once', () => {
  resetGradientDraft()
  assert.equal(setGradientDraft(['#4338e0', '#f59e0b']), true)
  // Reading before the commit is harmless — the destination may render more
  // than once before it mounts.
  assert.deepEqual(readGradientDraft().colors, ['#4338E0', '#F59E0B'])
  assert.deepEqual(readGradientDraft().colors, ['#4338E0', '#F59E0B'])
  consumeGradientDraft()
  assert.equal(readGradientDraft(), null, 'a reload or a direct visit falls back to the normal state')
})

test('the previewed colour transfers to the Tint Generator exactly once', () => {
  resetTintDraft()
  assert.equal(setTintDraft(['#7c6cf0']), true)
  assert.deepEqual(readTintDraft(), { version: COLOR_HANDOFF_VERSION, colors: ['#7C6CF0'] })
  consumeTintDraft()
  assert.equal(readTintDraft(), null)
})

test('a hand-off carries colours and nothing else', () => {
  resetTintDraft()
  setTintDraft(['#7C6CF0'])
  const taken = readTintDraft()
  assert.deepEqual(Object.keys(taken).sort(), ['colors', 'version'])
  // A tampered record never reaches a destination as-is.
  resetTintDraft()
  assert.equal(setTintDraft(['<script>alert(1)</script>']), false)
  assert.equal(readTintDraft(), null)
  resetGradientDraft()
})
