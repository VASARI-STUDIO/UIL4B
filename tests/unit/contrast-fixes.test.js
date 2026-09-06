// nearestPassingLightness — the solver behind the Contrast Checker's "Make it
// pass" row [contrast-checker-overhaul].
//
// WHAT THIS FILE IS FOR, AND WHAT IT IS NOT FOR. It proves the MATHS over every
// pair in a deterministic grid, which is not something a browser test can do at
// this scale. It deliberately does NOT prove that the page calls it: a correct
// helper beside a call site still wired to fixForeground would pass this whole
// file, and that exact shape — a right answer next to a call site nobody
// changed — is the one this repo keeps paying for. The wiring is asserted in
// tests/user-sim/06-colour-tool-workbenches.spec.js, which drives the page and
// reads the rendered fix chips.
//
// THE DEFECT THIS REPLACES. The row was built on fixForeground/fixBackground,
// which take their search direction from the OTHER colour's luminance
// (`bgLum < 0.5` => walk the ink lighter). 0.5 is not the crossover — black and
// white are equally readable at relative luminance 0.179 — so on every ground
// between them the walk went the wrong way and returned its INPUT. The page
// re-verified every candidate, so it never displayed a fix that failed; it
// displayed NO fix instead, which is why this was invisible for so long.
import test from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, nearestPassingLightness } from '../../src/utils/colors.js'

// 6 levels per channel = 216 colours = 46,656 ordered pairs. Deterministic, and
// small enough to run every one of them twice in well under a second.
const STEP = 51
const LEVELS = []
for (let v = 0; v <= 255; v += STEP) LEVELS.push(v)
const GRID = []
for (const r of LEVELS) for (const g of LEVELS) for (const b of LEVELS) {
  GRID.push('#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase())
}

// A single-side fix EXISTS iff a pure pole clears the ground, because the HSL
// lightness axis at fixed hue and saturation runs from #000000 at L=0 to
// #FFFFFF at L=100. That is the independent oracle this file measures against —
// it is computed from contrastRatio alone and shares no code with the solver.
const fixExists = (ground, target) =>
  contrastRatio('#000000', ground) >= target || contrastRatio('#FFFFFF', ground) >= target

test('the grid is the size this file claims, so a sweep cannot silently shrink', () => {
  assert.equal(LEVELS.length, 6)
  assert.equal(GRID.length, 216)
})

for (const target of [4.5, 7]) {
  test(`at ${target}:1 it finds a fix whenever one exists, and never lies`, () => {
    let failing = 0
    let solved = 0
    let refusedWithFixAvailable = 0
    let lies = 0
    const worstRefusal = []

    for (const bg of GRID) {
      for (const fg of GRID) {
        if (contrastRatio(fg, bg) >= target) continue
        failing++
        const fixed = nearestPassingLightness(fg, bg, target)
        if (fixed === null) {
          if (fixExists(bg, target)) {
            refusedWithFixAvailable++
            if (worstRefusal.length < 3) worstRefusal.push(`${fg} on ${bg}`)
          }
          continue
        }
        solved++
        // Everything it hands back must actually clear. A solver that returns
        // its input on failure — the defect — would trip this immediately.
        if (contrastRatio(fixed, bg) < target) lies++
      }
    }

    // POSITIVE CONTROL. An all-zero result is what a sweep over an empty grid
    // looks like, and it is indistinguishable from a perfect one unless the
    // work is counted. These numbers are pinned, not merely asserted non-zero.
    assert.equal(failing, target === 4.5 ? 38594 : 43464,
      `the sweep examined ${failing} failing pairs, which is not the known population`)
    assert.ok(solved > 0, 'no fix was produced at all — the sweep did no work')

    assert.equal(lies, 0, `${lies} returned colours do not reach ${target}:1`)
    assert.equal(refusedWithFixAvailable, 0,
      `${refusedWithFixAvailable} pairs were refused although a pole clears: ${worstRefusal.join(', ')}`)
  })
}

test('it returns null only when no single-side move can work', () => {
  // A mid-grey pair chasing AAA: neither pole clears 7:1 against #7F7F7F, so
  // there is genuinely nothing to offer and `null` is the honest answer.
  assert.equal(nearestPassingLightness('#808080', '#7F7F7F', 7), null)
  assert.ok(contrastRatio('#000000', '#7F7F7F') < 7)
  assert.ok(contrastRatio('#FFFFFF', '#7F7F7F') < 7)
})

test('a pair that already clears is returned unmoved', () => {
  // Distance zero is a distance. The page never asks in this state, but a
  // helper that answered `null` here would make null mean two things.
  assert.equal(nearestPassingLightness('#6B7280', '#FFFFFF', 4.5), '#6B7280')
})

test('it walks the direction a ground-derived rule refuses', () => {
  // THE RECORDED CASE. #009900 has relative luminance 0.228, so fixForeground's
  // `bgLum < 0.5` rule walks the ink LIGHTER — toward white, which tops out at
  // 3.78:1 and never clears — and then returns its input. Black clears 5.56:1.
  const bg = '#009900'
  assert.ok(contrastRatio('#FFFFFF', bg) < 4.5, 'white was supposed to be unreachable here')
  assert.ok(contrastRatio('#000000', bg) >= 4.5, 'black was supposed to clear here')

  const fixed = nearestPassingLightness('#000099', bg, 4.5)
  assert.notEqual(fixed, null, 'the pair is fixable and the solver refused it')
  assert.ok(contrastRatio(fixed, bg) >= 4.5)
  // And it moved along the seed's OWN lightness axis rather than jumping to a
  // pole, so the fix a designer is offered is still their blue.
  const [r, g, b] = [1, 3, 5].map(i => parseInt(fixed.slice(i, i + 2), 16))
  assert.ok(b > r && b > g, `the suggestion stopped being blue: ${fixed}`)
})

test('the smaller of the two movements wins', () => {
  // On a ground where BOTH directions can clear, the answer must be the nearer
  // one — that is what keeps a suggestion close to the colour already chosen.
  const bg = '#767676'
  const seed = '#6E6E6E'
  const fixed = nearestPassingLightness(seed, bg, 3)
  assert.notEqual(fixed, null)
  assert.ok(contrastRatio(fixed, bg) >= 3)

  const lOf = (hex) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
  }
  const moved = Math.abs(lOf(fixed) - lOf(seed))
  // Anything nearer than the answer must fail, in BOTH directions — which is
  // the definition of "nearest" rather than merely "passing".
  for (const dir of [-1, 1]) {
    for (let step = 1; step < Math.round(moved * 100); step++) {
      const l = Math.round(lOf(seed) * 100) + dir * step
      if (l < 0 || l > 100) break
      const nearer = hslGrey(l)
      assert.ok(contrastRatio(nearer, bg) < 3,
        `${nearer} is nearer than ${fixed} and also clears — not the nearest answer`)
    }
  }
})

// The seed above is achromatic, so its lightness axis is the grey ramp.
function hslGrey(l) {
  const v = Math.round(255 * (l / 100))
  return '#' + [v, v, v].map(n => n.toString(16).padStart(2, '0')).join('')
}
