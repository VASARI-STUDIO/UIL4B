// Fluid type maths — the arithmetic behind the Type Scale's per-breakpoint
// ladders and the clamp() that joins them.
//
// WHAT THIS GUARDS. The tool used to generate ONE ladder and its
// Mobile/Tablet/Desktop control only narrowed the preview container, so an h1
// was the same size on a 375px phone as on a 1440px desktop. These tests assert
// the properties that make the replacement correct rather than merely
// different: that the clamp actually resolves to the sizes claimed at each end,
// that it never pins a descending step to the wrong bound, and that it stays
// zoom-accessible.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FLUID_VIEWPORTS, buildFluidScale, fluidClamp, sizeAtViewport, stepPx } from '../../src/utils/fluidType.js'

const parseClamp = (css) => {
  const m = /^clamp\(([-\d.]+)rem, ([-\d.]+)rem \+ ([-\d.]+)vw, ([-\d.]+)rem\)$/.exec(css)
  if (!m) return null
  return { lo: +m[1], intercept: +m[2], slopeVw: +m[3], hi: +m[4] }
}

/** What a browser would compute for this clamp at a given viewport width. */
const resolve = (css, vw) => {
  const p = parseClamp(css)
  if (!p) return null
  const preferred = p.intercept + (p.slopeVw / 100) * vw
  return Math.min(p.hi, Math.max(p.lo, preferred))
}

test('THE CONTRACT: the clamp resolves to exactly the sizes claimed at each end', () => {
  // This is the whole promise of the feature. If a designer says "24px on
  // mobile, 40px on desktop", the exported CSS must actually produce 24 and 40
  // at those viewports — not approximately, and not only in the middle.
  for (const [minPx, maxPx] of [[24, 40], [16, 18], [12, 14], [32, 72], [14, 14.5]]) {
    const { css } = fluidClamp(minPx, maxPx)
    const atMin = resolve(css, FLUID_VIEWPORTS.min) * 16
    const atMax = resolve(css, FLUID_VIEWPORTS.max) * 16
    assert.ok(Math.abs(atMin - minPx) < 0.02, `${minPx}→${maxPx}: got ${atMin.toFixed(3)}px at the small end`)
    assert.ok(Math.abs(atMax - maxPx) < 0.02, `${minPx}→${maxPx}: got ${atMax.toFixed(3)}px at the large end`)
  }
})

test('it is monotonic between the breakpoints — text never shrinks as the screen grows', () => {
  const { css } = fluidClamp(18, 48)
  let previous = -Infinity
  for (let vw = 320; vw <= 1600; vw += 20) {
    const size = resolve(css, vw)
    assert.ok(size >= previous - 1e-9, `size dipped at ${vw}px`)
    previous = size
  }
})

test('outside the range it pins, so a 320px phone and a 4K monitor both stay sane', () => {
  const { css } = fluidClamp(20, 44)
  assert.ok(Math.abs(resolve(css, 320) * 16 - 20) < 0.02, 'below the range it holds the small size')
  assert.ok(Math.abs(resolve(css, 3840) * 16 - 44) < 0.02, 'above the range it holds the large size')
})

test('A DESCENDING step is not silently pinned to the wrong bound', () => {
  // A caption legitimately shrinks as the layout gains room. Emitting the
  // larger value in clamp()'s min slot would pin it there forever — a bug that
  // surfaces months later as "the export is wrong" with no obvious cause.
  const { css } = fluidClamp(16, 13)
  const p = parseClamp(css)
  assert.ok(p, 'a descending step still emits a real clamp')
  assert.ok(p.lo < p.hi, 'clamp bounds must be in ascending order')
  assert.ok(Math.abs(resolve(css, FLUID_VIEWPORTS.min) * 16 - 16) < 0.02, '16px at the small end')
  assert.ok(Math.abs(resolve(css, FLUID_VIEWPORTS.max) * 16 - 13) < 0.02, '13px at the large end')
})

test('equal ends emit a plain rem, not a clamp that cannot do anything', () => {
  const fixed = fluidClamp(16, 16)
  assert.equal(fixed.fluid, false)
  assert.equal(fixed.css, '1rem')
  assert.ok(!fixed.css.includes('clamp'), 'clamp(1rem, …, 1rem) would be theatre')
})

test('ACCESSIBILITY: the preferred value always carries a rem term, never pure vw', () => {
  // A pure-vw preferred value ignores the user's font-size preference entirely
  // and fails WCAG 1.4.4 (Resize Text) — zooming text would change nothing.
  // The rem intercept is what keeps the line moving with the root size.
  for (const [a, b] of [[16, 24], [12, 60], [14, 15], [30, 31]]) {
    const p = parseClamp(fluidClamp(a, b).css)
    assert.ok(p, `${a}→${b} produced a parseable clamp`)
    assert.notEqual(p.intercept, 0, `${a}→${b}: the preferred value must keep a rem term`)
  }
})

test('sizeAtViewport agrees with the clamp the export emits', () => {
  // The preview reads sizeAtViewport; the user copies the clamp. If those two
  // ever disagreed, the tool would be showing one thing and shipping another —
  // exactly the fault the seed/hex readout had in the Palette Builder.
  for (const vw of [375, 500, 768, 1024, 1200, 1440]) {
    const direct = sizeAtViewport(18, 42, vw)
    const viaCss = resolve(fluidClamp(18, 42).css, vw) * 16
    assert.ok(Math.abs(direct - viaCss) < 0.05, `${vw}px: preview ${direct} vs export ${viaCss.toFixed(2)}`)
  }
})

test('rounding is applied per breakpoint, and is the mode the user picked', () => {
  assert.equal(stepPx(16, 1.25, 3, 'whole'), 31)
  assert.equal(stepPx(16, 1.25, 3, 'half'), 31.5)
  assert.equal(stepPx(16, 1.25, 3, 'none'), 31.25)
})

test('a built scale carries both sizes and a usable clamp for every step', () => {
  const exps = [4, 3, 2, 1, 0, -1]
  const names = ['4xl', '3xl', '2xl', 'xl', 'base', 'sm']
  const scale = buildFluidScale({
    mobile: { base: 16, ratio: 1.2 },
    desktop: { base: 18, ratio: 1.333 },
    exps,
    names,
  })
  assert.equal(scale.length, exps.length)
  for (const step of scale) {
    assert.ok(step.minPx > 0 && step.maxPx > 0, `${step.name} has real sizes`)
    assert.ok(step.css.length > 0, `${step.name} has CSS`)
    // The headline steps must genuinely differ between breakpoints — that is
    // the founder's actual request ("a header1 on desktop and mobile will be
    // different font sizes"), and a scale that produced identical values would
    // pass every other test here while failing the point of the feature.
    if (step.exp >= 2) {
      assert.ok(step.maxPx > step.minPx, `${step.name} must be larger on desktop than mobile`)
      assert.equal(step.fluid, true, `${step.name} must interpolate`)
    }
  }
  // …and the compounding is real: the top step should differ by more than the
  // base does, because the ratio multiplies.
  const top = scale[0], base = scale.find(s => s.exp === 0)
  assert.ok((top.maxPx - top.minPx) > (base.maxPx - base.minPx),
    'the ratio compounds, so the gap widens up the scale')
})
