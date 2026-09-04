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

// labelGround's OTHER promise, which is about fidelity rather than contrast and
// was written down only in prose: "Usually it returns the swatch unchanged and
// nothing is drawn... It moves only where it must, and barely." That matters
// because the swatch is a colour CONTROL - every unit the ground moves is the
// preview showing a colour the palette did not generate.
//
// MEASURED over the same 16,200: the ground is untouched on 96.5% of them, and
// where it moves the largest single-channel move is 9/255. The thresholds below
// carry headroom on both numbers so ordinary tuning does not trip them.
test('labelGround leaves the generated colour alone except where it cannot', () => {
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
  assert.ok(moved > 0,
    'labelGround moved NO ground at all across the whole space, so this test and the'
    + ' contrast sweep above are both measuring a function that has stopped working')
  assert.ok(moved / n <= 0.05,
    `labelGround moved the ground on ${(100 * moved / n).toFixed(1)}% of generated colours`
    + ' (was 3.5%). The swatch is a colour control; a preview that repaints the ground'
    + ' this often is showing colours the palette did not generate.')
  assert.ok(worst <= 12,
    `labelGround moved a channel by ${worst}/255 (was 9). It is meant to move only as`
    + ' far as the ink demands.')
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

  // labelGround must be capable of BOTH answers, or the first sweep proves
  // nothing: it returns the colour untouched where an ink already clears it,
  // and moves it where none can.
  assert.equal(labelGround('#FFFFFF'), '#FFFFFF', 'labelGround moved a ground that needed no move')
  assert.notEqual(labelGround('#1A8993'), '#1A8993',
    'labelGround left the mid-luminance fill that no ink can clear - the case it exists for')
})
