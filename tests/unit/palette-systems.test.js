// Randomise must respect the SELECTED colour system.
//
// REGRESSION GUARD (the bug these tests exist for): the Palette Builder routed
// BOTH 'auto' and 'monochromatic' to the tonal engine (autoTonalPalette). That
// engine deliberately puts the SECONDARY role on a *sibling* hue 20–45° away,
// so choosing "Mono" and hitting Randomise came back with two hues — the
// founder's "if I change the colour system to mono and randomise it should use
// the mono system". Only 'auto' is tonal now; every named harmony goes through
// generateHarmony. These tests assert the CONSTRAINT of each system on the
// actual output, not merely which function got called.
import test from 'node:test'
import assert from 'node:assert/strict'
import { autoTonalPalette, generateHarmony, hexToHsl, randomSystemPalette } from '../../src/utils/colors.js'

// The systems offered in the Palette Builder's Colour System dropdown
// (HARMONIES in src/pages/PaletteBuilder.jsx). If a system is added there it
// must be added here too — an unhandled id silently degrades to a 1-colour
// palette, which the builder then throws away as invalid.
const SYSTEMS = ['auto', 'monochromatic', 'analogous', 'complement', 'triadic', 'split', 'tetradic', 'custom']

// The hue offsets, in degrees from the seed, each harmony is defined by. Read
// straight off generateHarmony's own switch — this is the contract under test.
const EXPECTED_OFFSETS = {
  monochromatic: [0, 0, 0, 0, 0],
  analogous: [0, -30, 30, -15, 15],
  complement: [0, 180, 0, 180, 0],
  triadic: [0, 120, 240, 0, 120],
  split: [0, 150, 210, 0, 180],
  tetradic: [0, 90, 180, 270, 0],
  custom: [0, 60, 180, 0, 0],
}

const ROLES = 5
const HEX = /^#[0-9A-Fa-f]{6}$/
const RUNS = 60

// Signed shortest angular distance between two hues, in degrees.
const hueDelta = (a, b) => {
  const d = ((a - b) % 360 + 540) % 360 - 180
  return d
}

// Hue is meaningless for a near-neutral swatch, and hslToHex → hexToHsl also
// round-trips through 8-bit channels, so a very dark or very light member can
// drift a couple of degrees. Only judge hue where hue exists.
const hueIsMeaningful = ([, s, l]) => s >= 12 && l >= 8 && l <= 96

/* ── every system in the list, not just mono ─────────────────────────────── */

test('every colour system produces a full, well-formed palette', () => {
  for (const system of SYSTEMS) {
    for (let i = 0; i < 10; i++) {
      const out = randomSystemPalette(system)
      assert.ok(Array.isArray(out), `${system} returns an array`)
      assert.ok(out.length >= ROLES, `${system} fills all ${ROLES} roles (got ${out.length})`)
      for (const hex of out) assert.match(hex, HEX, `${system} produced a real hex`)
    }
  }
})

test('mono means ONE hue — the founder-reported bug', () => {
  for (let i = 0; i < RUNS; i++) {
    const out = randomSystemPalette('monochromatic')
    const hues = out.map(hexToHsl).filter(hueIsMeaningful).map(([h]) => h)
    assert.ok(hues.length >= 3, 'a mono palette still has colour in it')
    for (const h of hues) {
      assert.ok(Math.abs(hueDelta(h, hues[0])) <= 3,
        `every swatch shares the seed hue (got ${hues.join('/')}° in ${out.join(' ')})`)
    }
  }
})

test('mono varies tone and chroma instead — it is a ramp, not five copies of one colour', () => {
  for (let i = 0; i < RUNS; i++) {
    const out = randomSystemPalette('monochromatic')
    const hsl = out.map(hexToHsl)
    const lights = hsl.map(([, , l]) => l)
    const sats = hsl.map(([, s]) => s)
    assert.ok(Math.max(...lights) - Math.min(...lights) >= 25,
      `tone actually travels across the ramp (got ${lights.join('/')})`)
    assert.ok(new Set(sats).size > 1, 'chroma is not flat across the ramp')
    assert.equal(new Set(out.map(c => c.toUpperCase())).size, out.length,
      'no two swatches are the same colour')
  }
})

test('the tonal Auto engine is what mono must NOT be — it deliberately uses a sibling hue', () => {
  // This is the thing the old code was doing to a mono palette. Asserting the
  // engine really does split the hue proves the bug was a routing bug, and
  // stops anyone "simplifying" mono back onto this engine.
  let sawSecondHue = 0
  for (let i = 0; i < RUNS; i++) {
    const hues = autoTonalPalette().map(hexToHsl).filter(hueIsMeaningful).map(([h]) => h)
    if (hues.some(h => Math.abs(hueDelta(h, hues[0])) > 5)) sawSecondHue++
  }
  assert.ok(sawSecondHue > RUNS * 0.5,
    `the tonal engine routinely introduces a second hue (${sawSecondHue}/${RUNS}) — mono must not use it`)
})

test('each harmony lands on its own defined hue offsets', () => {
  for (const [system, offsets] of Object.entries(EXPECTED_OFFSETS)) {
    for (let i = 0; i < 20; i++) {
      const out = randomSystemPalette(system)
      const seedHue = hexToHsl(out[0])[0]
      out.slice(0, ROLES).forEach((hex, idx) => {
        const hsl = hexToHsl(hex)
        if (!hueIsMeaningful(hsl)) return
        const got = hueDelta(hsl[0], seedHue)
        const want = hueDelta(offsets[idx], 0)
        assert.ok(Math.abs(hueDelta(got, want)) <= 4,
          `${system} role ${idx}: expected ${want}° from the seed, got ${got.toFixed(1)}°`)
      })
    }
  }
})

test('auto is the only system that reaches the tonal engine', () => {
  // Structural, not statistical: the tonal engine returns exactly 5 swatches
  // built from HCT tones, whereas generateHarmony seeds role 0 with the seed
  // colour verbatim. Every named harmony therefore reproduces its own offsets
  // when re-run through generateHarmony from its own first colour.
  for (const system of SYSTEMS.filter(s => s !== 'auto')) {
    const out = randomSystemPalette(system)
    const rebuilt = generateHarmony(out[0], system)
    assert.deepEqual(out.map(c => c.toUpperCase()), rebuilt.map(c => c.toUpperCase()),
      `${system} is exactly generateHarmony(seed, '${system}')`)
  }
})

test('an unknown system degrades visibly rather than pretending to work', () => {
  // generateHarmony has no case for it, so only the seed comes back. The
  // builder checks `fresh.length < ROLES` and falls back — this asserts the
  // signal that check relies on still exists.
  const out = randomSystemPalette('not-a-system')
  assert.equal(out.length, 1)
  assert.ok(out.length < ROLES, 'the builder can detect it and fall back')
})
