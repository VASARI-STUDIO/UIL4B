// derivePreviewRoles' onPrimary/primary pair, checked as NUMBERS.
//
// role.onPrimary is painted ON role.primary at 11-12px/700 by four surfaces:
// .plb-pv-cta, .plb-pvb-navcta and .plb-pvb-btn--primary in the Palette
// Builder (all three read --pv-onprimary on --pv-primary), and .hw-ui-btn on
// the homepage workbench. Small text, so the floor is 4.5:1.
//
// WHY THIS FILE EXISTS. The engine used to derive the pair as
//   let onPrimary = textColorOnSolid(primary)
//   ...
//   if (contrastRatio(onPrimary, primary) < 4.5) onPrimary = fixForeground(onPrimary, primary, 4.5)
// which READS like a clamp and is not one, because fixForeground returns its
// INPUT unchanged when nothing in its walk clears the target. Both halves also
// failed on the same narrow band of grounds:
//
//   * textColorOnSolid chose its pole from a fixed luminance threshold, 0.179.
//     That is the crossover for PURE black and white. The poles it returns are
//     #0A0B0D and #F2F3F5, whose crossover is 0.1749 and whose best case AT
//     that crossover is 4.20:1 - so on a band of mid-luminance grounds NEITHER
//     near-pole clears AA and the threshold could hand back the worse one.
//   * fixForeground takes its direction from the GROUND (bgLum < 0.5 => walk
//     the ink lighter), so from near-black on a mid-luminance chromatic fill it
//     walks toward the ground and tops out short. Same flaw #341 recorded for
//     mutedInk and #346 for the single-ground case.
//
// Measured before the fix, 6,000 generated palettes x 2 themes: 58 of 12,000
// pairs under 4.5, worst 4.378 (#0A0B0D on #506EE2). Roughly one palette in
// 170 - rare enough to ship, and the tools present the pair to the user as a
// checked, passing role, which is what made it worth fixing in the engine
// rather than at any call site. See [preview-onprimary-unmeasured].
//
// The rendered half of this is test 8d in tests/user-sim/10-home-chaos-to-calm.spec.js.
// This half is the cheap one and the wide one: it drives the engine directly
// over far more palettes than a browser could render.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, derivePreviewRoles, hslToHex, mixHex } from '../../src/utils/colors.js'

const AA = 4.5

// The homepage generator, reproduced: HomeWorkbench's L_RAMP is [34,47,60,73,86]
// with a +14deg hue step, +/-4 jitter and saturation 60-76. That mid-luminance
// band is exactly where the old pole choice collapsed, which is why the miss
// showed up on the homepage rather than on hand-picked palettes.
const L_RAMP = [34, 47, 60, 73, 86]

// Deterministic PRNG. A random seed here would make a rare failure intermittent,
// which for a defect at 0.48% is the difference between a guard and a coin toss.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const generatedPalette = (rnd) => {
  const baseHue = Math.floor(rnd() * 360)
  return L_RAMP.map((l, i) => hslToHex((baseHue + i * 14 + (rnd() * 8 - 4) + 360) % 360, 60 + rnd() * 16, l))
}

test('1 . the pair clears AA over the palettes the homepage actually generates', () => {
  const rnd = mulberry32(20260904)
  const misses = []
  let worst = Infinity
  let n = 0
  for (let i = 0; i < 4000; i++) {
    const pal = generatedPalette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePreviewRoles(pal, { mode })
      const cr = contrastRatio(r.onPrimary, r.primary)
      n++
      if (cr < worst) worst = cr
      if (cr < AA && misses.length < 10) misses.push(`  ${mode} ${r.onPrimary} on ${r.primary} = ${cr.toFixed(3)}:1`)
    }
  }
  assert.equal(n, 8000, 'the sweep did not run the palettes it claims to')
  assert.equal(misses.length, 0,
    `onPrimary is painted at 11-12px on primary and misses ${AA}:1:\n` + misses.join('\n')
    + `\n  worst overall ${worst.toFixed(3)}:1`)
})

// A ONE-COLOUR palette does NOT exercise this: primary === bg, the bg-clash
// guard rejects it, and the engine returns the brand-blue fallback - a sweep
// built that way measures #3B82F6 every time and proves nothing. Pairing the
// test colour with two achromatic anchors puts it in the primary role for real,
// and the assertion below on `reached` is what stops this test degrading into
// that silent no-op if the engine's selection rules ever change.
const ANCHORS = ['#FFFFFF', '#0B0B0B']

test('2 . the pair clears AA for every primary the engine can emit, not only generated ones', () => {
  // PaletteBuilder takes arbitrary user hexes, so the guarantee has to hold
  // across the gamut. Step 9 per channel keeps this a fast unit test while
  // still crossing the failing band in every hue direction; the full step-5
  // sweep (170,018 reached pairs, worst 4.5000) was run out of band.
  const misses = []
  let worst = Infinity
  let reached = 0
  let attempts = 0
  for (let r = 0; r <= 255; r += 9) {
    for (let g = 0; g <= 255; g += 9) {
      for (let b = 0; b <= 255; b += 9) {
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
        for (const mode of ['light', 'dark']) {
          attempts++
          const role = derivePreviewRoles([hex, ...ANCHORS], { mode })
          if (role.primary.toLowerCase() !== hex.toLowerCase()) continue
          reached++
          const cr = contrastRatio(role.onPrimary, role.primary)
          if (cr < worst) worst = cr
          if (cr < AA && misses.length < 10) misses.push(`  ${mode} ${role.onPrimary} on ${role.primary} = ${cr.toFixed(3)}:1`)
        }
      }
    }
  }
  // Positive control: a zero here would mean the sweep measured the fallback,
  // not the colour under test, and every assertion below it would be vacuous.
  assert.ok(reached > attempts * 0.5,
    `only ${reached} of ${attempts} colours reached the primary role - this sweep is measuring the brand fallback, not the palette`)
  assert.equal(misses.length, 0,
    `these primaries carry an onPrimary under ${AA}:1:\n` + misses.join('\n')
    + `\n  worst overall ${worst.toFixed(3)}:1 over ${reached} pairs`)
})

test('3 . the empty-palette fallback carries the same guarantee', () => {
  // The empty branch returns its own role set and used to call textColorOnSolid
  // with no clamp of any kind after it.
  for (const mode of ['light', 'dark']) {
    const r = derivePreviewRoles([], { mode })
    const cr = contrastRatio(r.onPrimary, r.primary)
    assert.ok(cr >= AA, `empty ${mode}: ${r.onPrimary} on ${r.primary} is ${cr.toFixed(3)}:1`)
  }
  for (const junk of [null, undefined, ['nope'], [42], ['#12345']]) {
    const r = derivePreviewRoles(junk, { mode: 'light' })
    const cr = contrastRatio(r.onPrimary, r.primary)
    assert.ok(cr >= AA, `junk input ${JSON.stringify(junk)}: ${cr.toFixed(3)}:1`)
  }
})

test('4 . the guards above are real, so this file cannot pass by being toothless', () => {
  // The exact pair the old engine emitted, and the crossover arithmetic that
  // explains why. If either of these ever stops being true, tests 1 and 2 have
  // stopped being able to catch what they were written for.
  assert.ok(contrastRatio('#0A0B0D', '#506EE2') < AA,
    'the recorded worst case now passes on its own - the failing band has moved')
  assert.ok(contrastRatio('#F2F3F5', '#506EE2') < AA,
    'the other near-pole clears it too, so no pole choice could have failed here')
  // ...and both PURE poles together always can, which is why the fix terminates.
  assert.ok(Math.max(contrastRatio('#000000', '#506EE2'), contrastRatio('#FFFFFF', '#506EE2')) >= AA)
})

// ─────────────────────────────────────────────────────────────────────────
// role.text and role.muted, on EVERY ground the engine says it paints them on.
//
// [preview-muted-on-surface]. The engine used to clamp `muted` against `bg`
// alone, and the scenes paint it on `surface` too — .plb-pv-field is 8px
// --pv-muted directly on --pv-surface, and .plb-pv-card, .plb-pv-side,
// .plb-pv-settings nav/label, .plb-pvb-schedule span and .plb-pvb-booking are
// all surface-grounded. `surface` is a 5% (light) or 10% (dark) step off bg in
// the direction that always costs contrast, so the pair failed almost always.
//
// Measured on the same 6,000-palette sweep that closed the onPrimary item:
//   muted on bg       2,314 of 12,000 under 4.5:1, worst 2.481
//   muted on surface 12,000 of 12,000 under 4.5:1, worst 2.951
//   text  on bg         243 of 12,000 under 4.5:1, worst 4.211
//   text  on surface    466 of 12,000 under 4.5:1, worst 3.481
//
// The engine now returns `inkGrounds`, so this file asserts the guarantee
// against the list the ENGINE declares rather than against a list copied here.
// A scene that adds a third ground adds it there and is covered on arrival;
// a scene that adds one WITHOUT declaring it is the defect that returns, and
// no unit test can see that — tests/user-sim/41-palette-preview-ink.spec.js
// is the half that reads the rendered page.
// ─────────────────────────────────────────────────────────────────────────

const INK_ROLES = ['text', 'muted']

test('5 . text and muted clear AA on every declared ground, over the generated palettes', () => {
  const rnd = mulberry32(20260904)
  const misses = []
  let worst = Infinity
  let checks = 0
  for (let i = 0; i < 4000; i++) {
    const pal = generatedPalette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePreviewRoles(pal, { mode })
      // Positive control on the CONTRACT itself: an engine that stopped
      // declaring its grounds would make every loop below run zero times.
      assert.ok(Array.isArray(r.inkGrounds) && r.inkGrounds.length >= 2,
        `the engine declared no ink grounds for ${mode} ${JSON.stringify(pal)}`)
      assert.ok(r.inkGrounds.includes(r.bg) && r.inkGrounds.includes(r.surface),
        `inkGrounds ${r.inkGrounds} omits bg ${r.bg} or surface ${r.surface}`)
      for (const role of INK_ROLES) {
        for (const ground of r.inkGrounds) {
          const cr = contrastRatio(r[role], ground)
          checks++
          if (cr < worst) worst = cr
          if (cr < AA && misses.length < 10) {
            misses.push(`  ${mode} ${role} ${r[role]} on ${ground} = ${cr.toFixed(3)}:1`)
          }
        }
      }
    }
  }
  assert.equal(checks, 32000, 'the sweep did not run the pairs it claims to')
  assert.equal(misses.length, 0,
    `these ink roles miss ${AA}:1 on a ground the engine itself declares:\n` + misses.join('\n')
    + `\n  worst overall ${worst.toFixed(3)}:1 over ${checks} pairs`)
})

test('6 . the same holds for an arbitrary user bg, not only a generated one', () => {
  // A ONE-COLOUR palette is the WRONG probe for the primary role (test 2) and
  // the RIGHT one for this: bg is the luminance-extreme member of the palette,
  // so any anchor colour would take the role instead and the sweep would
  // measure the anchor. Alone, the swept hex IS bg — asserted below rather
  // than assumed, which is the same guard test 2 carries for the other reason.
  const misses = []
  let worst = Infinity
  let reached = 0
  let attempts = 0
  for (let r = 0; r <= 255; r += 9) {
    for (let g = 0; g <= 255; g += 9) {
      for (let b = 0; b <= 255; b += 9) {
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
        for (const mode of ['light', 'dark']) {
          attempts++
          const role = derivePreviewRoles([hex], { mode })
          if (role.bg.toLowerCase() !== hex.toLowerCase()) continue
          reached++
          for (const name of INK_ROLES) {
            for (const ground of role.inkGrounds) {
              const cr = contrastRatio(role[name], ground)
              if (cr < worst) worst = cr
              if (cr < AA && misses.length < 10) {
                misses.push(`  ${mode} ${name} ${role[name]} on ${ground} (bg ${role.bg}) = ${cr.toFixed(3)}:1`)
              }
            }
          }
        }
      }
    }
  }
  assert.ok(reached > attempts * 0.9,
    `only ${reached} of ${attempts} colours reached the bg role - this sweep is not measuring the colour under test`)
  assert.equal(misses.length, 0,
    `these grounds carry an ink under ${AA}:1:\n` + misses.join('\n')
    + `\n  worst overall ${worst.toFixed(3)}:1 over ${reached} palettes`)
})

test('7 . the empty and junk fallbacks declare their grounds and clear them too', () => {
  for (const input of [[], null, undefined, ['nope'], [42], ['#12345']]) {
    for (const mode of ['light', 'dark']) {
      const r = derivePreviewRoles(input, { mode })
      assert.ok(Array.isArray(r.inkGrounds) && r.inkGrounds.length >= 2,
        `${JSON.stringify(input)} ${mode}: no ink grounds declared`)
      for (const name of INK_ROLES) {
        for (const ground of r.inkGrounds) {
          const cr = contrastRatio(r[name], ground)
          assert.ok(cr >= AA,
            `${JSON.stringify(input)} ${mode}: ${name} ${r[name]} on ${ground} is ${cr.toFixed(3)}:1`)
        }
      }
    }
  }
})

test('8 . tests 5-7 are not toothless: the derivation they replaced still fails', () => {
  // The old line was `muted = mixHex(text, bg, 0.45)` with a fixForeground
  // clamp against bg ONLY. Recreate it on a ground the sweep actually emits
  // and confirm it is still a failure — if this ever passes on its own, the
  // sweeps above have stopped being able to catch what they were written for.
  const rnd = mulberry32(20260904)
  let oldMisses = 0
  let samples = 0
  for (let i = 0; i < 500; i++) {
    const pal = generatedPalette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePreviewRoles(pal, { mode })
      const oldMuted = mixHex(r.text, r.bg, 0.45)
      samples++
      if (Math.min(contrastRatio(oldMuted, r.bg), contrastRatio(oldMuted, r.surface)) < AA) oldMisses++
    }
  }
  assert.ok(oldMisses > samples * 0.5,
    `the pre-fix derivation now clears ${AA}:1 on ${samples - oldMisses} of ${samples} samples - `
    + 'the failing band has moved and these sweeps no longer prove anything')
  // And the specific pair recorded on the item.
  assert.ok(contrastRatio('#144147', '#368f98') < AA,
    'the recorded worst muted/surface pair now passes on its own')
})

test('9 . the surface step is only ever SHORTENED, never flipped or lengthened', () => {
  // pvSurface gives up part of the tonal step where a full one would leave no
  // ink able to sit on both grounds. It must stay on the same side of bg -
  // a flipped step would read as an inset well rather than a raised panel -
  // and it must never travel further than the step it started from.
  const rnd = mulberry32(20260904)
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  let shortened = 0
  let n = 0
  for (let i = 0; i < 2000; i++) {
    const pal = generatedPalette(rnd)
    for (const mode of ['light', 'dark']) {
      const r = derivePreviewRoles(pal, { mode })
      const full = mixHex(r.bg, mode === 'dark' ? '#FFFFFF' : '#000000', mode === 'dark' ? 0.10 : 0.05)
      const lBg = lum(r.bg), lS = lum(r.surface), lFull = lum(full)
      n++
      if (mode === 'dark') {
        assert.ok(lS >= lBg - 1e-9, `dark surface ${r.surface} is darker than bg ${r.bg}`)
        assert.ok(lS <= lFull + 1e-9, `dark surface ${r.surface} overshot the full step ${full}`)
      } else {
        assert.ok(lS <= lBg + 1e-9, `light surface ${r.surface} is lighter than bg ${r.bg}`)
        assert.ok(lS >= lFull - 1e-9, `light surface ${r.surface} overshot the full step ${full}`)
      }
      if (r.surface !== full) shortened++
    }
  }
  // Positive control: if NOTHING is ever shortened this test is vacuous and
  // the guarantee in test 5 is being met some other way than the one claimed.
  assert.ok(shortened > 0 && shortened < n * 0.2,
    `${shortened} of ${n} surfaces were shortened - expected a small minority (measured 2.09%)`)
})
