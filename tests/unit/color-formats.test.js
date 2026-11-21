// Reading and writing one colour in three notations, plus the shared
// recently-used list behind the picker's saved swatches.
//
// The picker EMITS `#rrggbb` whatever the dropdown says — every consumer stores
// hex, and widening that contract is a far larger change than a display
// preference earns. So `formatColor` is a lens over the same value and
// `parseColor` is its inverse, and the property that matters most is that they
// round-trip: a colour shown in rgb and typed straight back must be the same
// colour.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COLOR_FORMATS,
  formatColor,
  hexToRgb,
  hslToHex,
  normalizeHex,
  parseColor,
  rgbToHsl,
} from '../../src/utils/colorFormats.js'

// ── normalising ──────────────────────────────────────────────────────────────

test('hex is normalised from every shape people actually paste', () => {
  assert.equal(normalizeHex('#4338E0'), '#4338e0')
  assert.equal(normalizeHex('4338e0'), '#4338e0')
  assert.equal(normalizeHex('#abc'), '#aabbcc')
  assert.equal(normalizeHex('  #4338e0  '), '#4338e0')
  // An 8-digit hex keeps its colour and drops its alpha — the picker has no
  // surface that can store one.
  assert.equal(normalizeHex('#4338e080'), '#4338e0')
})

test('anything that is not a colour is null, not a guess', () => {
  for (const bad of ['', '#12', '#1234567', 'rebeccapurple', 'nonsense', null, undefined, 42, {}]) {
    assert.equal(normalizeHex(bad), null, String(bad))
  }
})

// ── formatting ───────────────────────────────────────────────────────────────

test('each notation renders the same colour', () => {
  assert.equal(formatColor('#4338e0', 'hex'), '#4338e0')
  assert.equal(formatColor('#4338e0', 'rgb'), 'rgb(67 56 224)')
  assert.equal(formatColor('#4338e0', 'hsl'), 'hsl(244 73% 55%)')
  assert.match(formatColor('#4338e0', 'oklch'), /^oklch\(\d{1,3}(\.\d)?% \d(\.\d{1,3})? \d{1,3}(\.\d)?\)$/)
})

test('oklch prints lightness as a percent, chroma to 3 places and hue to 1', () => {
  assert.equal(formatColor('#ff0000', 'oklch'), 'oklch(62.8% 0.258 29.2)')
  assert.equal(formatColor('#ffffff', 'oklch'), 'oklch(100% 0 0)')
  assert.equal(formatColor('#000000', 'oklch'), 'oklch(0% 0 0)')
  // A grey has no hue; it prints 0 rather than a meaningless angle.
  assert.match(formatColor('#808080', 'oklch'), /^oklch\(\d+(\.\d)?% 0 0\)$/)
  assert.equal(formatColor('#ff0000', 'oklch', 0.5), 'oklch(62.8% 0.258 29.2 / 0.5)')
})

test('an opaque colour never prints an alpha', () => {
  // A trailing `/ 1` on every value would be noise in a field people copy out
  // of, and `#rrggbbff` is not what anyone expects to see for a solid colour.
  for (const f of COLOR_FORMATS) {
    assert.doesNotMatch(formatColor('#4338e0', f, 1), /\//, f)
  }
  assert.equal(formatColor('#4338e0', 'hex', 1), '#4338e0')
})

test('a transparent colour prints alpha in the modern one-function form', () => {
  // `rgb(… / .5)`, not `rgba(…)`: CSS takes alpha in the same function now, and
  // printing the legacy name teaches the notation the browser is moving away
  // from.
  assert.equal(formatColor('#4338e0', 'rgb', 0.5), 'rgb(67 56 224 / 0.5)')
  assert.equal(formatColor('#4338e0', 'hsl', 0.5), 'hsl(244 73% 55% / 0.5)')
  assert.equal(formatColor('#4338e0', 'hex', 0.5), '#4338e080')
})

test('alpha is clamped and trailing zeros are trimmed', () => {
  assert.equal(formatColor('#000000', 'rgb', 2), 'rgb(0 0 0)')
  assert.equal(formatColor('#000000', 'rgb', -1), 'rgb(0 0 0 / 0)')
  assert.equal(formatColor('#000000', 'rgb', 0.5000001), 'rgb(0 0 0 / 0.5)')
  assert.equal(formatColor('#000000', 'rgb', Number.NaN), 'rgb(0 0 0)')
})

test('an unreadable colour formats as black rather than throwing', () => {
  // This is reached from a controlled input mid-typing, so it must never throw.
  assert.equal(formatColor('not a colour', 'rgb'), 'rgb(0 0 0)')
})

// ── parsing ──────────────────────────────────────────────────────────────────

test('the field takes all three notations, whatever the dropdown says', () => {
  // Someone pasting out of devtools should not have to change a setting first.
  assert.equal(parseColor('#4338e0').hex, '#4338e0')
  assert.equal(parseColor('rgb(67 56 224)').hex, '#4338e0')
  assert.equal(parseColor('RGB(67,56,224)').hex, '#4338e0')
})

test('comma and space separators are the same colour', () => {
  // CSS changed its preferred spelling; people paste both, and refusing one
  // would be pedantry aimed at the wrong audience.
  assert.deepEqual(parseColor('rgb(67, 56, 224)'), parseColor('rgb(67 56 224)'))
  assert.deepEqual(parseColor('hsl(244, 73%, 55%)'), parseColor('hsl(244 73% 55%)'))
})

test('percentage rgb channels are a fraction of 255, not of 100', () => {
  assert.equal(parseColor('rgb(100% 0% 0%)').hex, '#ff0000')
  assert.equal(parseColor('rgb(50% 50% 50%)').hex, '#808080')
})

test('alpha is read from every form that can carry it', () => {
  assert.equal(parseColor('rgb(0 0 0 / 0.5)').alpha, 0.5)
  assert.equal(parseColor('rgba(0, 0, 0, 0.25)').alpha, 0.25)
  assert.equal(parseColor('hsl(0 0% 0% / 50%)').alpha, 0.5)
  assert.ok(Math.abs(parseColor('#00000080').alpha - 0.5) < 0.01)
  // Absent means opaque, not "keep whatever was there" — someone typing
  // `rgb(0 0 0)` over a half-transparent colour means the solid one.
  assert.equal(parseColor('rgb(0 0 0)').alpha, 1)
})

test('nonsense parses to null rather than to black', () => {
  // The picker snaps back to the current colour on null. Returning a colour
  // here would silently overwrite the user's work with a typo.
  for (const bad of ['', 'rgb(', 'rgb(1 2)', 'hsl(nope 1% 2%)', 'rgb(300 0 0)', 'nonsense', null, 7]) {
    assert.equal(parseColor(bad), null, String(bad))
  }
})

// ── reading oklch ────────────────────────────────────────────────────────────

test('oklch reads a percent or a bare lightness', () => {
  const pct = parseColor('oklch(62.8% 0.258 29.2)')
  const bare = parseColor('oklch(0.628 0.258 29.2)')
  assert.ok(pct && bare)
  assert.equal(pct.hex, bare.hex)
  assert.equal(pct.alpha, 1)
})

test('oklch hue takes deg, wraps, and accepts a negative angle', () => {
  const base = parseColor('oklch(62.8% 0.258 29.2)').hex
  assert.equal(parseColor('oklch(62.8% 0.258 29.2deg)').hex, base)
  assert.equal(parseColor('oklch(62.8% 0.258 389.2)').hex, base)
  assert.equal(parseColor('oklch(62.8% 0.258 -330.8)').hex, base)
})

test('oklch reads alpha after a slash, and commas as separators', () => {
  assert.equal(parseColor('oklch(62.8% 0.258 29.2 / 50%)').alpha, 0.5)
  assert.equal(parseColor('oklch(62.8% 0.258 29.2 / 0.25)').alpha, 0.25)
  assert.equal(parseColor('oklch(62.8%, 0.258, 29.2)').hex, parseColor('oklch(62.8% 0.258 29.2)').hex)
})

test('oklch refuses out-of-range and non-numeric parts', () => {
  for (const bad of [
    'oklch(120% 0.1 10)', 'oklch(50% -0.1 10)', 'oklch(50% 0.6 10)',
    'oklch(none 0.1 10)', 'oklch(50% 0.1)', 'oklch(abc)', 'oklch(50% 0.1 10rad)',
  ]) {
    assert.equal(parseColor(bad), null, bad)
  }
})

test('oklch outside sRGB lands on a real colour instead of failing', () => {
  const out = parseColor('oklch(70% 0.4 150)')
  assert.ok(out)
  assert.match(out.hex, /^#[0-9a-f]{6}$/)
})

test('a percent chroma maps 100% to 0.4', () => {
  assert.equal(parseColor('oklch(62.8% 50% 29.2)').hex, parseColor('oklch(62.8% 0.2 29.2)').hex)
})

// The property the whole lens rests on.
test('every notation round-trips back to the same colour', () => {
  const colors = ['#4338e0', '#ffffff', '#000000', '#ff0000', '#00ff80', '#123456', '#7f7f7f']
  for (const hex of colors) {
    for (const format of COLOR_FORMATS) {
      const shown = formatColor(hex, format)
      const back = parseColor(shown)
      assert.ok(back, `${shown} did not parse back`)
      // HSL is lossy at 8 bits per channel — it prints whole degrees and whole
      // percents — so the round trip is asserted as "visually the same colour"
      // rather than byte-identical. Hex and rgb are exact.
      if (format === 'hsl' || format === 'oklch') {
        const a = hexToRgb(hex)
        const b = hexToRgb(back.hex)
        const drift = Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
        // OKLCH prints lightness to 0.1%, chroma to 0.001 and hue to 0.1 degrees,
        // which is coarser than 8-bit sRGB in the saturated greens and cyans. The
        // worst drift measured over random colours is 8 per channel.
        const limit = format === 'oklch' ? 8 : 4
        assert.ok(drift <= limit, `${hex} → ${shown} → ${back.hex} drifted ${drift}`)
      } else {
        assert.equal(back.hex, hex, `${hex} → ${shown} → ${back.hex}`)
      }
    }
  }
})

// ── the conversions underneath ───────────────────────────────────────────────

test('grey has no hue and no saturation, at any lightness', () => {
  for (const hex of ['#000000', '#808080', '#ffffff']) {
    const { h, s } = rgbToHsl(hexToRgb(hex))
    assert.equal(s, 0, hex)
    assert.equal(h, 0, hex)
  }
})

test('saturation folds around mid lightness rather than running off the end', () => {
  // Both are fully saturated red; only the lightness differs. A formula that
  // did not fold at l = 0.5 reports the light one as washed out.
  assert.ok(Math.abs(rgbToHsl(hexToRgb('#ff0000')).s - 1) < 0.001)
  assert.ok(Math.abs(rgbToHsl(hexToRgb('#ff8080')).s - 1) < 0.001)
})

test('hslToHex wraps the hue circle instead of clamping it', () => {
  assert.equal(hslToHex(0, 1, 0.5), '#ff0000')
  assert.equal(hslToHex(360, 1, 0.5), '#ff0000')
  assert.equal(hslToHex(720, 1, 0.5), '#ff0000')
  assert.equal(hslToHex(-120, 1, 0.5), '#0000ff')
})
