// The homepage workbench's generated-colour contrast guarantees, proved over
// the whole space the generator can emit instead of over a handful of rerolls.
//
// WHERE THIS CAME FROM.
// 8c in 10-home-chaos-to-calm.spec.js used to click Generate 24 times per theme
// in a rendered browser, inside ONE 30s test budget, running a full contrast
// walk between clicks. Forty-eight rerolls at browser round-trip prices. It
// passed on an idle machine and timed out on a contended one, and the failure
// was indistinguishable at a glance from the REAL unreachable-Generate defect
// on [workbench-handoff-overlays-controls] - same file, same locator, same
// timeout message. A flake that impersonates a live defect eventually gets one
// of them dismissed as the other.
//
// REPRODUCED ON DEMAND rather than waited for, with Chromium's
// Emulation.setCPUThrottlingRate: at 10x, 24 rounds busts the 30s budget (40.1s
// wall, timing out on the Generate click at line 1092), and 4 rounds finishes in
// 18.4s. So the loop length was the variable, not the machine.
//
// THE FIX IS NOT A LONGER TIMEOUT, and it is not simply a shorter loop either -
// that would just buy speed with coverage. The rerolls moved HERE, where the
// functions are pure and 16,200 colours cost milliseconds, and 8c keeps a short
// rendered loop for the one thing only a browser can show: that the COMPONENT
// still calls these functions, on the ground it actually composites.
//
// WHY BOTH HALVES ARE NEEDED, from this repo's own history: the estimate that
// skipped the render once already got it wrong, missing role.text entirely by
// assuming the ground equalled role.surface - it assumed the thing that was
// wrong. A model test alone would repeat that mistake. A render test alone is
// the flake above.
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  L_RAMP, cardGrounds, hslToHex, labelGround, mutedInk, readableInk,
} from '../../src/utils/workbenchInk.js'
import { contrastRatio, derivePreviewRoles } from '../../src/utils/colors.js'

const AA = 4.5
// Assertion messages below are multi-line. A named constant keeps the escape
// out of the template literals, where it is easy to mangle and hard to see.
const NL = String.fromCharCode(10)

// makeSwatch() emits `60 + Math.random() * 16`, so the saturation band is
// [60, 76). Nine samples across it, times 360 hues, times the five ramp steps,
// is the 16,200 colours the labelGround comment claims to have been swept -
// claimed in prose, never asserted, until this file.
const SATS = [60, 62, 64, 66, 68, 70, 72, 74, 76]

test('every swatch label clears AA on every colour the generator can emit', () => {
  const bad = []
  let measured = 0
  for (let h = 0; h < 360; h++) {
    for (const s of SATS) {
      for (const l of L_RAMP) {
        const hex = hslToHex(h, s, l)
        const ink = readableInk(hex)
        const ground = labelGround(hex)
        const ratio = contrastRatio(ink, ground)
        measured++
        if (ratio < AA) bad.push(`${hex} -> ink ${ink} on ${ground} = ${ratio.toFixed(2)}:1`)
      }
    }
  }
  assert.equal(measured, 360 * SATS.length * L_RAMP.length,
    'the sweep did not cover the space it claims to')
  assert.deepEqual(bad.slice(0, 12), [],
    `${bad.length} of ${measured} generated colours give a swatch label under ${AA}:1.\n`
    + 'readableInk picks the ink and labelGround moves the ground only as far as that\n'
    + 'ink demands; if this fails, one of them stopped guaranteeing its half. First\n'
    + 'twelve:\n  ' + bad.slice(0, 12).join('\n  '))
})

// THE BOARD'S INK, WHICH IS A DIFFERENT GUARANTEE FROM THE ONE ABOVE.
//
// 2026-09-05 the Palette panel stopped rendering a bespoke `.hw-pal` swatch
// strip and started rendering the product's own `.plb-board`. That changed what
// the ink has to survive. The strip gave its hex label a chip of its own
// (`labelGround(hex)`) and put `readableInk(hex)` on it, so the test above
// measures ink against a ground that has ALREADY been moved to suit it. A board
// column has no chip: `.plb-name`, `.plb-hex` and `.plb-role` all inherit
// --plb-ink and sit directly on --plb-c, the raw generated colour, exactly as
// they do in Palette Builder.
//
// So the pair under test here is (readableInk(hex), hex) with nothing in
// between, and it is the harder of the two - labelGround exists precisely
// because some mid-luminance chromatic fills admit no good achromatic ink. What
// makes this pass is that readableInk does not stop at picking the better pole;
// it walks that pole with fixForeground until the pair clears 4.5:1. If someone
// ever "simplifies" readableInk back to a pole-picker - which is what
// PaletteBuilder's own textColorForBg still is - this is the test that fails.
test('every board label clears AA on the raw colour it sits on', () => {
  const bad = []
  let measured = 0
  for (let h = 0; h < 360; h++) {
    for (const s of SATS) {
      for (const l of L_RAMP) {
        const hex = hslToHex(h, s, l)
        const ink = readableInk(hex)
        const ratio = contrastRatio(ink, hex)
        measured++
        if (ratio < AA) bad.push(`${hex} -> ink ${ink} on the swatch itself = ${ratio.toFixed(2)}:1`)
      }
    }
  }
  assert.equal(measured, 360 * SATS.length * L_RAMP.length,
    'the sweep did not cover the space it claims to')
  assert.deepEqual(bad.slice(0, 12), [],
    `${bad.length} of ${measured} generated colours give a board label under ${AA}:1` + NL
    + 'against the column fill itself. The board has no label chip to fall back on,' + NL
    + 'so readableInk has to carry this alone. First twelve:' + NL
    + '  ' + bad.slice(0, 12).join(NL + '  '))
})

// labelGround's OTHER promise, which is about fidelity rather than contrast and
// was written down only in prose: "Usually it returns the swatch unchanged and
// nothing is drawn... It moves only where it must, and barely." That matters
// because the swatch is a colour CONTROL - every unit the ground moves is the
// preview showing a colour the palette did not generate.
//
// THIS TEST'S CLAIM WAS INVERTED ON 2026-09-05, and the reason is arithmetic
// rather than taste. It used to assert `moved > 0` as a liveness guard, on the
// measurement that labelGround repainted 3.5% of the space (worst single-channel
// move 9/255). It now asserts `moved === 0`, because readableInk gained #000000
// as an explicit candidate and that closes the gap completely:
//
//   contrast(black, C) = (L + .05) / .05          rises with L
//   contrast(white, C) = 1.05 / (L + .05)         falls with L
//
// The two curves cross at L = .1789, where both read 4.579:1. So for EVERY
// colour, one of the two absolute poles is at least 4.579:1 - there is no fill
// anywhere in sRGB that admits no legible achromatic ink, and therefore no fill
// whose ground labelGround has to move. Measured, not just derived: 0 of 16,200
// grounds moved, and readableInk's worst pair over the same sweep is 4.50:1.
//
// THAT MAKES THIS THE STRONGER PROMISE, NOT A WEAKER ONE. The swatch is a colour
// control, and it is now never repainted at all - which is exactly what the
// prose above wished for. The liveness worry the old `moved > 0` guarded
// against is covered instead by the sweep in the previous test: if readableInk
// stops guaranteeing AA, that fails loudly rather than this passing vacuously.
//
// FOLLOW-UP, NOT DONE HERE: labelGround is now provably an identity function for
// every input, so its remaining callers are paying for a no-op. Removing it
// touches PaletteStage's render path and cardGrounds/mutedInk, which solve a
// DIFFERENT problem (one ink shared across two grounds) and are not affected by
// this proof. Filed rather than folded into a fidelity change.
test('labelGround no longer has to repaint any ground the generator can emit', () => {
  let n = 0
  let moved = 0
  let worst = 0
  for (let h = 0; h < 360; h++) {
    for (const s of SATS) {
      for (const l of L_RAMP) {
        const hex = hslToHex(h, s, l)
        const ground = labelGround(hex)
        n++
        if (ground.toLowerCase() === hex.toLowerCase()) continue
        moved++
        for (const i of [1, 3, 5]) {
          worst = Math.max(worst, Math.abs(
            parseInt(hex.slice(i, i + 2), 16) - parseInt(ground.slice(i, i + 2), 16)))
        }
      }
    }
  }
  assert.equal(moved, 0,
    `labelGround repainted ${moved} of ${n} generated grounds (worst single-channel move`
    + ` ${worst}/255). Since readableInk gained #000000 as a candidate this should be`
    + ' zero: one of the two absolute poles clears 4.579:1 against every colour in sRGB,'
    + ' so no fill needs its ground moved. A non-zero count here means readableInk has'
    + ' stopped reaching for the pole that works, and the swatch a visitor reads the'
    + ' colour from is no longer the value the hex claims.')
  assert.equal(worst, 0, 'a ground moved without being counted')
})

// The palette the Generate button builds: a base hue, then five steps 14 degrees
// apart, one per lightness in L_RAMP. The live version jitters each step by
// +/-4 degrees; the sweep walks that jitter deterministically instead.
const paletteFor = (baseHue, sat, jitter) =>
  L_RAMP.map((l, i) => hslToHex((baseHue + i * 14 + jitter + 360) % 360, sat, l))

test('the product-card preview keeps muted and text ink over AA on both grounds', () => {
  const bad = []
  let measured = 0
  for (const mode of ['light', 'dark']) {
    for (let baseHue = 0; baseHue < 360; baseHue += 3) {
      for (const jitter of [-4, 0, 4]) {
        const hexes = paletteFor(baseHue, 68, jitter)
        const role = derivePreviewRoles(hexes, { mode })
        // Exactly what PaletteStage does, in the same order.
        const { bg, surface } = cardGrounds(role.bg, role.surface)
        const muted = mutedInk(role.muted, [bg, surface])
        const text = mutedInk(role.text, [bg, surface])
        for (const [name, ink] of [['muted', muted], ['text', text]]) {
          for (const [gname, ground] of [['bg', bg], ['surface', surface]]) {
            const ratio = contrastRatio(ink, ground)
            measured++
            if (ratio < AA) {
              bad.push(`[${mode}] hue ${baseHue}+${jitter} ${name} ${ink} on ${gname} `
                + `${ground} = ${ratio.toFixed(2)}:1`)
            }
          }
        }
      }
    }
  }
  assert.ok(measured >= 2800, `only ${measured} card-ink measurements were taken`)
  assert.deepEqual(bad.slice(0, 12), [],
    `${bad.length} of ${measured} card-ink pairs fall under ${AA}:1. cardGrounds picks ONE\n`
    + 'pole for the whole card and mutedInk walks each ink against BOTH grounds, so a\n'
    + 'failure here means one of those guarantees stopped holding. First twelve:\n  '
    + bad.slice(0, 12).join('\n  '))
})

// A positive control for the two sweeps above. Both report violations and would
// also report none on a space they never walked, or if contrastRatio started
// answering a constant. This states the numbers the sweeps depend on.
test('the sweep is measuring real, varied colour - not a constant', () => {
  assert.deepEqual(L_RAMP, [34, 47, 60, 73, 86], 'the generator lightness band moved')
  assert.equal(hslToHex(210, 68, 47), '#2678C9', 'hslToHex no longer emits the expected colour')
  assert.ok(contrastRatio('#000000', '#FFFFFF') > 20, 'contrastRatio is not measuring')
  assert.ok(contrastRatio('#777777', '#808080') < 1.3, 'contrastRatio is not measuring')

  // labelGround used to be required to give BOTH answers here, with #1A8993 as
  // the canonical fill "no ink can clear" - 4.42:1 against black and 4.16
  // against white, per its own doc comment. Both of those numbers were measured
  // against #141414 and #FFFFFF, and #141414 is not black. Against #000000 the
  // same fill reads 5.044:1, so readableInk now returns pure black for it and
  // the ground stays put. The pair below is the positive control that matters
  // now: the fill is untouched, AND the ink chosen for it genuinely clears AA.
  assert.equal(labelGround('#FFFFFF'), '#FFFFFF', 'labelGround moved a ground that needed no move')
  assert.equal(labelGround('#1A8993'), '#1A8993',
    'labelGround repainted the mid-luminance fill it no longer needs to touch')
  assert.ok(contrastRatio(readableInk('#1A8993'), '#1A8993') >= AA,
    'the fill labelGround now leaves alone has no legible ink, which would make the'
    + ' line above a regression rather than a simplification')
})
