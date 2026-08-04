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
import {
  ADJUST_TRACK_STOPS,
  adjustHandleColors,
  adjustTrackGradients,
  adjustTrackStops,
  applyAdjust,
  hctToHex,
  hexToHct,
  hexToHsl,
  maxChromaFor,
  sampleAdjustTrack,
} from '../../src/utils/colors.js'
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

/* ── Saturation: gamut-aware interpolation (PR #190 follow-up) ───────────────
 * The bug: chroma was scaled multiplicatively (`c * (1 + s/100)`), so a
 * neutral (chroma 0) could never gain colour, and an already-vivid colour hit
 * hctToHex's internal gamut clamp partway up the slider — the whole top half
 * did nothing visible. The fix interpolates toward an explicit target instead
 * of scaling: rising walks from the current chroma toward maxChromaFor(h, t)
 * (the real sRGB gamut boundary at that hue/tone), falling walks toward 0. */

const GREY = '#808080'
// A mid-saturation swatch with real headroom on both sides of the slider.
const MID_SAT = '#4338E0'

test('s=0 leaves chroma untouched even when hue is rotating under it', () => {
  // A pure hue rotation at a fixed tone never has any reason to change the
  // chroma VALUE we hand hctToHex, so with s=0 pinned the chroma must survive
  // exactly — proving the s-branches really are skipped at s=0, not merely
  // multiplying by a no-op factor of 1 (which is what the old bug did, and
  // which this check would NOT have caught — this asserts the branch doesn't
  // run at all). Tone (`b`) is deliberately excluded here: shifting tone (or,
  // for a high-chroma swatch, even just rotating hue) can legitimately shrink
  // the gamut available at the new hue/tone, so hctToHex may clamp the SAME
  // chroma value down on its own — correct pre-existing gamut behaviour,
  // unrelated to the saturation lens under test. A near-neutral swatch keeps
  // this test clear of that: its chroma (~2) is nowhere near any hue/tone's
  // boundary, so any drop can only be this lens, not the gamut.
  const [, origC] = hexToHct(GREY)
  for (const other of [{ h: 90 }, { h: -150 }, { h: 45 }]) {
    const adj = { ...ZERO, ...other, s: 0 }
    const out = applyAdjust([GREY], adj)[0]
    const [, outC] = hexToHct(out)
    // Colours round-trip through an 8-bit hex, so allow the tiny quantisation
    // slack a hue move introduces — anything beyond that would mean s=0 is
    // still perturbing chroma.
    assert.ok(Math.abs(outC - origC) < 0.5,
      `chroma must survive s=0 alongside ${JSON.stringify(other)} (was ${origC.toFixed(2)}, got ${outC.toFixed(2)})`)
  }
})

test('s=0 is not a special case baked into the chroma step — a temperature-only move is unaffected by it', () => {
  const withTemp = applyAdjust(BASE, { ...ZERO, temp: 55 })
  const withTempAndZeroS = applyAdjust(BASE, { ...ZERO, temp: 55, s: 0 })
  assert.deepEqual(withTempAndZeroS, withTemp,
    'an explicit s: 0 must be indistinguishable from s being absent altogether')
})

test('a pure grey gains chroma as the slider rises, monotonically, with no dead zone', () => {
  const [h, , t] = hexToHct(GREY)
  let prevChroma = hexToHct(GREY)[1]
  for (let s = 5; s <= 100; s += 5) {
    const out = applyAdjust([GREY], { ...ZERO, s })[0]
    const chroma = hexToHct(out)[1]
    assert.ok(chroma >= prevChroma - 1e-6, `chroma must not fall as s rises (s=${s})`)
    prevChroma = chroma
  }
  // The far end is meaningfully more saturated than the untouched grey, not a
  // rounding whisker of it — the old multiplicative bug left this completely flat.
  const untouched = hexToHct(GREY)[1]
  assert.ok(prevChroma > untouched + 5, 'a full-throw slider visibly tints a pure grey')
  // And it heads toward the gamut boundary at that grey's own hue/tone, not an
  // arbitrary cap.
  assert.ok(prevChroma <= maxChromaFor(h, t) + 1, 'never overshoots the boundary it targets')
})

test('full negative (-100) fully neutralises any colour', () => {
  for (const hex of [GREY, MID_SAT, '#FF0000']) {
    const out = applyAdjust([hex], { ...ZERO, s: -100 })[0]
    const [, sat] = hexToHsl(out)
    assert.equal(sat, 0, `${hex} at s=-100 must be a true neutral (HSL saturation 0), got ${out}`)
  }
})

test('full positive (+100) lands at (or just inside) the hue/tone gamut boundary — no silent clamp', () => {
  const out = applyAdjust([MID_SAT], { ...ZERO, s: 100 })[0]
  const [h, c, t] = hexToHct(out)
  const boundary = maxChromaFor(h, t)
  assert.ok(c <= boundary + 0.01, 'never exceeds the boundary')
  assert.ok(c >= boundary - 2, `lands within a small epsilon of the boundary (got ${c.toFixed(2)}, boundary ${boundary.toFixed(2)})`)
})

test('a mid-saturation colour moves monotonically across the whole -100..+100 range', () => {
  let prevChroma = null
  for (let s = -100; s <= 100; s += 5) {
    const out = applyAdjust([MID_SAT], { ...ZERO, s })[0]
    const chroma = hexToHct(out)[1]
    if (prevChroma !== null) {
      assert.ok(chroma >= prevChroma - 0.1, `chroma must not fall as s rises through ${s}`)
    }
    prevChroma = chroma
  }
})

test('tone and saturation share the gamut boundary at the shifted tone', () => {
  for (const toneShift of [-80, -40, 40, 80]) {
    const out = applyAdjust([MID_SAT], { ...ZERO, s: 100, b: toneShift })[0]
    const [h, c, tone] = hexToHct(out)
    const boundary = maxChromaFor(h, tone)
    assert.ok(c <= boundary + 0.01, `tone shift ${toneShift} stayed inside its rendered gamut`)
    assert.ok(c >= boundary - 2.5, `tone shift ${toneShift} still reaches the available chroma`)
  }
})

test('adjustment tracks preview all four real lens operations', () => {
  const tracks = adjustTrackGradients(BASE)
  assert.deepEqual(Object.keys(tracks), ['h', 's', 'b', 'temp'])
  for (const [key, gradient] of Object.entries(tracks)) {
    assert.match(gradient, /^linear-gradient\(90deg,/)
    assert.equal((gradient.match(/#[0-9A-F]{6}/gi) || []).length, 9, `${key} exposes nine real colour stops`)
    assert.match(gradient, /0\.00%/)
    assert.match(gradient, /100\.00%/)
  }
})

/* ── the slider handle is a LENS onto its own track ───────────────────────────
 * REGRESSION GUARD: the handle used to be a solid white disc sitting ON the
 * coloured track, hiding the very colour the position represents. It now shows
 * the track's colour at its own position. The only way that can never drift
 * from the bar is for both to come out of ONE stop list, so these tests assert
 * the two views agree by construction — not merely that they look similar. */

test('the painted gradient and the handle sample read the SAME stop list', () => {
  const tracks = adjustTrackStops(BASE)
  const gradients = adjustTrackGradients(BASE)
  assert.deepEqual(Object.keys(tracks), ['h', 's', 'b', 'temp'])
  for (const key of Object.keys(tracks)) {
    // Every stop the sampler can return is a stop the CSS actually paints.
    for (const stop of tracks[key].stops) {
      assert.ok(gradients[key].includes(stop.hex), `${key} track paints ${stop.hex}`)
    }
    assert.equal(tracks[key].stops.length, ADJUST_TRACK_STOPS)
  }
})

test('sampling a track AT a stop returns exactly that stop — the dot cannot disagree with the bar', () => {
  const tracks = adjustTrackStops(BASE)
  for (const key of Object.keys(tracks)) {
    const { min, max, stops } = tracks[key]
    for (const stop of stops) {
      const value = min + (max - min) * stop.pos
      assert.equal(sampleAdjustTrack(tracks[key], value), stop.hex.toUpperCase(),
        `${key} at ${value} must be the very colour painted there`)
    }
  }
})

test('between stops the handle interpolates exactly as the CSS gradient does', () => {
  const tracks = adjustTrackStops(BASE)
  const track = tracks.b
  const [a, b] = track.stops
  const midValue = track.min + (track.max - track.min) * ((a.pos + b.pos) / 2)
  const got = sampleAdjustTrack(track, midValue)
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  for (let i = 0; i < 3; i++) {
    const expected = Math.round((ch(a.hex, i) + ch(b.hex, i)) / 2)
    assert.ok(Math.abs(ch(got, i) - expected) <= 1,
      `channel ${i}: sRGB midpoint of the two bracketing stops (got ${got})`)
  }
})

test('the handle colour tracks the slider, and a zeroed lens sits on the track centre', () => {
  const tracks = adjustTrackStops(BASE)
  const centre = adjustHandleColors(tracks, ZERO)
  const mid = Math.floor(ADJUST_TRACK_STOPS / 2)
  for (const key of Object.keys(tracks)) {
    // Every track is symmetric around 0, so a zero lens lands on the middle stop.
    assert.equal(centre[key], tracks[key].stops[mid].hex.toUpperCase())
  }
  // …and moving a slider moves its own dot, without disturbing the other three.
  const moved = adjustHandleColors(tracks, { ...ZERO, b: 100 })
  assert.notEqual(moved.b, centre.b, 'the tone dot follows the tone slider')
  assert.equal(moved.b, tracks.b.stops[ADJUST_TRACK_STOPS - 1].hex.toUpperCase())
  for (const key of ['h', 's', 'temp']) assert.equal(moved[key], centre[key])
})

test('an out-of-range or junk slider value still lands on a real track colour', () => {
  const tracks = adjustTrackStops(BASE)
  const ends = [tracks.h.stops[0].hex.toUpperCase(), tracks.h.stops[ADJUST_TRACK_STOPS - 1].hex.toUpperCase()]
  assert.equal(sampleAdjustTrack(tracks.h, -9999), ends[0])
  assert.equal(sampleAdjustTrack(tracks.h, 9999), ends[1])
  assert.equal(sampleAdjustTrack(tracks.h, NaN), sampleAdjustTrack(tracks.h, 0))
  assert.equal(sampleAdjustTrack(tracks.h, undefined), sampleAdjustTrack(tracks.h, 0))
})

test('a palette with no usable colours yields no track and no handle, never a broken one', () => {
  assert.equal(adjustTrackStops([]), null)
  assert.equal(adjustTrackStops(['nope']), null)
  assert.equal(adjustTrackGradients([]), null)
  assert.equal(adjustHandleColors(null, ZERO), null)
  assert.equal(sampleAdjustTrack(null, 0), null)
  assert.equal(sampleAdjustTrack({ min: 0, max: 1, stops: [] }, 0), null)
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
