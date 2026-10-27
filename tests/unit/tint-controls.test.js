// The Tint Generator's three controls beyond Steps and Curve, and the maths
// under them:
//
//   Lightness and saturation (they replace hue and chroma): a lightness shift
//   that moves the middle of the scale and not its ends, and a saturation
//   percentage of the source's own chroma. 0 and 100 are the ramp as it was.
//
//   Perceived and linear: the lightness between the ends spaced evenly in OKLCH
//   (perceived) or evenly in linear-light sRGB (linear).
//
//   Contrast notes: every step measured against white and against black.
//
// The oracles are NOT the functions under test. The linear test decodes each
// grey's sRGB bytes with the standard transfer function and checks the light
// steps are evenly spaced; the perceived test reads each step's lightness back
// out of the pixels with hexToOklchRaw; the contrast test recomputes WCAG
// luminance inline. A ramp that ignored its options would fail all three.
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRamp, lightnessGamma, saturationScale, stepLightness, tintRampForHex,
  LIGHTNESS_RANGE, SATURATION_MAX, SPACINGS, TINT_LABELS,
} from '../../src/utils/tintRamp.js'
import { contrastGrade, contrastNotes, contrastSummary, GRADE_MARKS, POLES } from '../../src/utils/tintContrast.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'
import { read, stripComments } from './helpers/source-text.js'

const BLUE = '#2563EB'
const [, BLUE_C, BLUE_H] = hexToOklchRaw(BLUE)
const bytes = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const spread = (hex) => Math.max(...bytes(hex)) - Math.min(...bytes(hex))
const hexes = (ramp) => ramp.map((r) => r.hex)

// ── Lightness and saturation: the mapping ───────────────────────────────────

test('the lightness shift maps -50 / 0 / +50 to a power of 0.5 / 1 / 2', () => {
  assert.equal(LIGHTNESS_RANGE, 50)
  assert.equal(lightnessGamma(0), 1)
  assert.equal(lightnessGamma(50), 2)
  assert.equal(lightnessGamma(-50), 0.5)
  assert.ok(Math.abs(lightnessGamma(25) - Math.SQRT2) < 1e-12)
})

test('a lightness shift outside the slider, or not a number, cannot run the ramp off the scale', () => {
  assert.equal(lightnessGamma(500), 2)
  assert.equal(lightnessGamma(-500), 0.5)
  assert.equal(lightnessGamma(NaN), 1)
  assert.equal(lightnessGamma(undefined), 1)
})

test('saturation is a percentage of the source chroma, 100 being the source as it is', () => {
  assert.equal(SATURATION_MAX, 150)
  assert.equal(saturationScale(100), 1)
  assert.equal(saturationScale(0), 0)
  assert.equal(saturationScale(50), 0.5)
  assert.equal(saturationScale(150), 1.5)
  assert.equal(saturationScale(900), 1.5)
  assert.equal(saturationScale(-20), 0)
  assert.equal(saturationScale(NaN), 1)
})

test('lightness never moves the ends of the scale, on any curve, in either spacing', () => {
  for (const curve of [0, 1, 2]) {
    for (const spacing of SPACINGS) {
      const first = stepLightness(0, curve, spacing, 0)
      const last = stepLightness(1, curve, spacing, 0)
      for (const shift of [-50, -20, 20, 50]) {
        assert.ok(Math.abs(stepLightness(0, curve, spacing, shift) - first) < 1e-12, `curve ${curve} ${spacing} ${shift}: first step moved`)
        assert.ok(Math.abs(stepLightness(1, curve, spacing, shift) - last) < 1e-12, `curve ${curve} ${spacing} ${shift}: last step moved`)
      }
    }
  }
  assert.ok(Math.abs(stepLightness(0, 0) - 0.97) < 1e-12)
  assert.ok(Math.abs(stepLightness(1, 0) - 0.19) < 1e-12)
})

test('a lighter shift lifts the middle of the scale and a darker one lowers it', () => {
  // Even curve, perceived: the middle step is 0.97 - (0.5 ** power) * 0.78.
  assert.ok(Math.abs(stepLightness(0.5, 0, 'perceived', 0) - 0.58) < 1e-12)
  assert.ok(Math.abs(stepLightness(0.5, 0, 'perceived', 50) - (0.97 - 0.25 * 0.78)) < 1e-12)
  assert.ok(Math.abs(stepLightness(0.5, 0, 'perceived', -50) - (0.97 - Math.SQRT1_2 * 0.78)) < 1e-12)
})

test('every setting still runs light to dark, step by step', () => {
  for (const curve of [0, 1, 2]) {
    for (const spacing of SPACINGS) {
      for (const shift of [-50, 0, 50]) {
        let prev = Infinity
        for (let i = 0; i <= 12; i++) {
          const L = stepLightness(i / 12, curve, spacing, shift)
          assert.ok(L < prev, `curve ${curve} ${spacing} ${shift}: step ${i} (${L}) is not darker than the step before`)
          prev = L
        }
      }
    }
  }
})

// ── The defaults are the ramp as it was ─────────────────────────────────────

const BLUE_EVEN_11 = ['#F0F5FF', '#C9DCFF', '#A2C2FF', '#7BA8FF', '#538CFF', '#2F6EF7', '#2158D1', '#1343AC', '#062E89', '#001A67', '#000647']

test('left at its defaults, the generator makes the ramp it always made', () => {
  assert.deepEqual(hexes(buildRamp(BLUE_H, BLUE_C, 11, 0)), BLUE_EVEN_11)
  assert.deepEqual(hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, {})), BLUE_EVEN_11)
  assert.deepEqual(hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { spacing: 'perceived', lightness: 0, saturation: 100 })), BLUE_EVEN_11)
  assert.deepEqual(hexes(tintRampForHex(BLUE)), BLUE_EVEN_11)
})

test('moving lightness changes the middle steps and leaves the first and last as they were', () => {
  const lighter = hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { lightness: 50 }))
  const darker = hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { lightness: -50 }))
  assert.deepEqual(lighter, ['#F0F5FF', '#ECF3FF', '#E1EBFF', '#CDDFFF', '#B2CDFF', '#8FB5FF', '#6497FF', '#4176E4', '#2854B2', '#0C2F7D', '#000647'])
  assert.deepEqual(darker, ['#F0F5FF', '#77A4FC', '#5282E4', '#3468D4', '#1950C8', '#0039BD', '#002D9E', '#002384', '#00196C', '#001058', '#000647'])
  for (const ramp of [lighter, darker]) {
    assert.equal(ramp[0], BLUE_EVEN_11[0])
    assert.equal(ramp.at(-1), BLUE_EVEN_11.at(-1))
    assert.notDeepEqual(ramp.slice(1, -1), BLUE_EVEN_11.slice(1, -1))
  }
  // Read the lightness back out of the pixels: the middle step moved the right way.
  const mid = (list) => hexToOklchRaw(list[5])[0]
  assert.ok(mid(lighter) > mid(BLUE_EVEN_11) && mid(BLUE_EVEN_11) > mid(darker))
})

test('saturation 0 is a pure grey ramp, 100 is the source, and in between the chroma follows', () => {
  const grey = hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { saturation: 0 }))
  for (const h of grey) assert.ok(spread(h) <= 1, `${h} is not grey at saturation 0`)
  assert.deepEqual(grey, ['#F5F5F5', '#DBDBDB', '#C2C2C2', '#A9A9A9', '#919191', '#7A7A7A', '#646464', '#4E4E4E', '#393939', '#262626', '#141414'])
  assert.deepEqual(hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { saturation: 100 })), BLUE_EVEN_11)

  // The middle step's chroma at 50% is about half what it is at 100%.
  const chromaAt = (saturation) => hexToOklchRaw(buildRamp(BLUE_H, BLUE_C, 11, 0, { saturation })[5].hex)[1]
  const ratio = chromaAt(50) / chromaAt(100)
  assert.ok(ratio > 0.4 && ratio < 0.6, `50% saturation left ${(ratio * 100).toFixed(0)}% of the chroma`)
  assert.ok(chromaAt(25) < chromaAt(50) && chromaAt(50) < chromaAt(100))
})

test('saturation cannot tint a grey source, because a grey has no hue to push toward', () => {
  for (const hex of ['#808080', '#FFFFFF']) {
    const [, C, H] = hexToOklchRaw(hex)
    for (const h of hexes(buildRamp(H, C, 11, 0, { saturation: 150 }))) assert.ok(spread(h) <= 1, `${hex}: ${h} picked up a cast`)
  }
})

test('raising saturation past 100 stays inside sRGB: no step is clipped to a different hue', () => {
  const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180)
  for (const { hex, label } of buildRamp(BLUE_H, BLUE_C, 11, 0, { saturation: 150 })) {
    const [, C, H] = hexToOklchRaw(hex)
    if (C <= 0.04) continue
    assert.ok(hueGap(H, BLUE_H) < 10, `step ${label} (${hex}) drifted to hue ${H.toFixed(1)}`)
  }
})

// ── Perceived and linear ────────────────────────────────────────────────────

const linearLight = (byte) => {
  const v = byte / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

test('perceived steps are evenly spaced in OKLCH lightness, read back out of the pixels', () => {
  const ramp = buildRamp(0, 0, 11, 0, { spacing: 'perceived' })
  ramp.forEach((r, i) => {
    const L = hexToOklchRaw(r.hex)[0]
    assert.ok(Math.abs(L - (0.97 - i * 0.078)) < 0.004, `step ${r.label}: lightness ${L.toFixed(3)}`)
  })
})

test('linear steps are evenly spaced in linear-light sRGB, decoded from the bytes', () => {
  const ramp = buildRamp(0, 0, 11, 0, { spacing: 'linear' })
  const lum = ramp.map((r) => linearLight(bytes(r.hex)[0]))
  const first = lum[0]
  const last = lum.at(-1)
  lum.forEach((y, i) => {
    const want = first + ((last - first) * i) / 10
    // One 8-bit step is about 0.004 in linear light near the top and far less below.
    assert.ok(Math.abs(y - want) < 0.005, `step ${ramp[i].label}: ${y.toFixed(4)} linear light, wanted ${want.toFixed(4)}`)
  })
  // And they are NOT evenly spaced in OKLCH: that is what the switch is for.
  const gaps = ramp.slice(1).map((r, i) => hexToOklchRaw(ramp[i].hex)[0] - hexToOklchRaw(r.hex)[0])
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 0.05)
})

test('flipping perceived to linear keeps both ends and lifts every step between', () => {
  const perceived = buildRamp(BLUE_H, BLUE_C, 11, 0, { spacing: 'perceived' })
  const linear = buildRamp(BLUE_H, BLUE_C, 11, 0, { spacing: 'linear' })
  assert.deepEqual(hexes(linear), ['#F0F5FF', '#E0EBFF', '#CEDFFF', '#BAD2FF', '#A5C4FF', '#8DB4FF', '#72A1FF', '#548BFA', '#4473D4', '#2C53A4', '#000647'])
  assert.equal(linear[0].hex, perceived[0].hex)
  assert.equal(linear.at(-1).hex, perceived.at(-1).hex)
  for (let i = 1; i < 10; i++) assert.ok(linear[i].L > perceived[i].L, `step ${linear[i].label} is not lighter in linear`)
  assert.notDeepEqual(hexes(linear), hexes(perceived))
})

test('linear spacing holds on every step count and curve, and an unknown spacing is perceived', () => {
  for (const steps of [9, 11, 13]) {
    for (const curve of [0, 1, 2]) {
      const p = buildRamp(BLUE_H, BLUE_C, steps, curve, { spacing: 'perceived' })
      const l = buildRamp(BLUE_H, BLUE_C, steps, curve, { spacing: 'linear' })
      assert.equal(l.length, TINT_LABELS[steps].length)
      assert.notDeepEqual(hexes(l), hexes(p), `${steps} steps, curve ${curve}: flipping changed nothing`)
    }
  }
  assert.deepEqual(hexes(buildRamp(BLUE_H, BLUE_C, 11, 0, { spacing: 'nonsense' })), BLUE_EVEN_11)
})

// ── Contrast against white and black ────────────────────────────────────────

// WCAG 2 contrast, written out here so the test does not lean on utils/colors.
function wcagRatio(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = bytes(hex).map(linearLight)
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('the two poles are exactly white and black', () => {
  assert.deepEqual(POLES.map((p) => [p.key, p.hex]), [['white', '#FFFFFF'], ['black', '#000000']])
})

test('grades follow WCAG: 7 is AAA, 4.5 is AA, 3 is large text only, under 3 fails', () => {
  assert.equal(contrastGrade(21), 'AAA')
  assert.equal(contrastGrade(7), 'AAA')
  assert.equal(contrastGrade(6.99), 'AA')
  assert.equal(contrastGrade(4.5), 'AA')
  assert.equal(contrastGrade(4.49), 'large')
  assert.equal(contrastGrade(3), 'large')
  assert.equal(contrastGrade(2.99), 'fail')
  assert.equal(contrastGrade(1), 'fail')
})

test('white and black read as the extremes of each other', () => {
  const [onWhite, onBlack] = contrastNotes('#FFFFFF')
  assert.equal(onWhite.text, '1.0:1')
  assert.equal(onWhite.pass, false)
  assert.equal(onWhite.grade, 'fail')
  assert.equal(onBlack.text, '21.0:1')
  assert.equal(onBlack.grade, 'AAA')
  const [kWhite, kBlack] = contrastNotes('#000000')
  assert.equal(kWhite.text, '21.0:1')
  assert.equal(kBlack.text, '1.0:1')
})

test('the AA boundary: #767676 passes against white, #777777 does not and is shown as 4.4, not 4.5', () => {
  const pass = contrastNotes('#767676')[0]
  assert.equal(pass.pass, true)
  assert.equal(pass.text, '4.5:1')
  const near = contrastNotes('#777777')[0]
  assert.equal(near.pass, false)
  assert.equal(near.grade, 'large')
  assert.equal(near.text, '4.4:1', 'a ratio just under 4.5 must not be shown as 4.5')
})

test('every step of every ramp is measured against both white and black, and matches WCAG', () => {
  for (const steps of [9, 11, 13]) {
    for (const spacing of SPACINGS) {
      for (const { label, hex } of buildRamp(BLUE_H, BLUE_C, steps, 0, { spacing })) {
        const notes = contrastNotes(hex)
        assert.deepEqual(notes.map((n) => n.key), ['white', 'black'], `${label}: both poles`)
        notes.forEach((n, i) => {
          const want = wcagRatio(hex, POLES[i].hex)
          assert.ok(Math.abs(n.ratio - want) < 1e-9, `${label} ${n.key}: ${n.ratio} against ${want}`)
          assert.equal(n.pass, want >= 4.5, `${label} ${n.key}: tick disagrees with ${want.toFixed(3)}`)
        })
        // Either white or black always carries body text on any sRGB colour.
        assert.ok(notes.some((n) => n.pass), `${label} ${hex}: neither pole passes AA`)
      }
    }
  }
})

test('light steps carry black text and dark steps carry white text', () => {
  const ramp = buildRamp(BLUE_H, BLUE_C, 11, 0)
  const first = contrastNotes(ramp[0].hex)
  const last = contrastNotes(ramp.at(-1).hex)
  assert.deepEqual(first.map((n) => n.pass), [false, true])
  assert.deepEqual(last.map((n) => n.pass), [true, false])
})

test('the sentence a screen reader gets names both poles and a grade for each', () => {
  assert.equal(contrastSummary('#FFFFFF'), 'White text 1.0:1, Fails. Black text 21.0:1, Passes AAA')
})

// ── The page uses them ──────────────────────────────────────────────────────

test('the page offers lightness and saturation and no hue or chroma control', () => {
  const src = stripComments(read('src/pages/TintTool.jsx'))
  assert.match(src, /label="Lightness"/)
  assert.match(src, /label="Saturation"/)
  assert.ok(!/label="Hue"/.test(src), 'a Hue slider is back')
  assert.ok(!/label="Chroma"/.test(src), 'a Chroma slider is back')
  assert.ok(!/ariaLabel="(Hue|Chroma)"/.test(src))
})

test('the page has a perceived / linear switch that feeds the ramp', () => {
  const src = stripComments(read('src/pages/TintTool.jsx'))
  assert.match(src, /value: 'perceived', label: 'Perceived'/)
  assert.match(src, /value: 'linear', label: 'Linear'/)
  assert.match(src, /buildRamp\(H, C, steps, curve, \{ spacing, lightness, saturation \}\)/)
})

test('the tooltip mark: a tick for a pass, a dash for large text only (never a tick), a cross for a fail', () => {
  assert.equal(GRADE_MARKS.AAA, 'check')
  assert.equal(GRADE_MARKS.AA, 'check')
  assert.equal(GRADE_MARKS.large, 'minus')
  assert.notEqual(GRADE_MARKS.large, 'check', 'a large-text-only row must not wear the pass tick')
  assert.equal(GRADE_MARKS.fail, 'x')
  const icons = read('src/components/tool/ToolIcon.jsx')
  assert.match(icons, /^\s*minus:/m, 'ToolIcon draws the minus glyph the large grade uses')
  const src = stripComments(read('src/pages/TintTool.jsx'))
  assert.match(src, /name=\{GRADE_MARKS\[n\.grade\]\}/, 'the tooltip picks its mark from GRADE_MARKS')
  assert.match(src, /data-grade=\{n\.grade\}/, 'the row carries data-grade')
  const css = stripComments(read('src/styles/pages/tint.css'))
  assert.match(css, /\[data-grade="large"\] \.tt-tip-mark\s*\{\s*color: var\(--warn-strong\)/)
})

test('a contrast note opens on hover, focus and press, and closes on Escape', () => {
  const src = stripComments(read('src/pages/TintTool.jsx'))
  assert.match(src, /onPointerEnter=/)
  assert.match(src, /onFocus=/)
  assert.match(src, /pointerTypeRef\.current === 'touch'/)
  assert.match(src, /e\.key === 'Escape'/)
  assert.match(src, /role="tooltip"/)
  assert.match(src, /aria-describedby=\{tipId\}/)
})

test('the tint sheet has no transition: all and the tooltip honours reduced motion', () => {
  const css = stripComments(read('src/styles/pages/tint.css'))
  assert.ok(!/transition\s*:\s*all/.test(css))
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{[^}]*\.tt-tip\[data-open="true"\]\s*\{\s*animation: none/)
  assert.match(css, /html\[data-reduced-motion="true"\] \.tt \.tt-tip\[data-open="true"\]\s*\{\s*animation: none/)
})
