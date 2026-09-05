// Fluid type: two modular scales, one per breakpoint, joined by clamp().
//
// WHY THIS EXISTS. The Type Scale tool generated ONE ladder from one base and
// one ratio, and its "Mobile / Tablet / Desktop" control only narrowed the
// preview container — so an h1 was the same 41px on a 375px phone as on a
// 1440px desktop, which is not how any real design system behaves and is not
// what the breakpoint control appeared to promise. A ratio that reads as
// confident at desktop is shouting at mobile, because the ratio compounds: at
// 1.333 the sixth step is 5.6× the base, and 5.6× of anything is too big for a
// 375px viewport.
//
// So a scale needs its OWN base and ratio per breakpoint. What joins them is
// the interesting part.
//
// THE MATHS. Between the two breakpoints, size is linear in viewport width —
// the line through (minVw, minSize) and (maxVw, maxSize):
//
//     slope = (maxSize - minSize) / (maxVw - minVw)
//     intercept = minSize - slope * minVw
//     size(vw) = intercept + slope * vw
//
// CSS expresses `slope * vw` as a `vw` unit (1vw = 1% of viewport width, so the
// coefficient is slope * 100), and the intercept as a rem so it survives a
// user's root font-size change. Wrapping it in clamp() pins the ends:
//
//     clamp(minRem, interceptRem + slopeVw, maxRem)
//
// ACCESSIBILITY, and why the intercept must be in rem. A preferred value of
// pure `vw` ignores the user's font-size preference entirely and fails WCAG
// 1.4.4 (Resize Text), because zooming text changes nothing. Keeping the
// intercept in rem means the line still shifts when the root size does, so the
// text genuinely scales. This is the whole reason the intercept is not just
// baked into the vw term.
//
// Everything here is pure so the arithmetic is unit-testable without a browser.

/** The viewport range the fluid interpolation spans. Below/above, clamp pins. */
export const FLUID_VIEWPORTS = Object.freeze({ min: 375, max: 1440 })

/** Trim a number for CSS output: no trailing zeros, no 1e-7 noise. */
function n(value, places = 4) {
  const fixed = Number(value).toFixed(places)
  return fixed.replace(/\.?0+$/, '') || '0'
}

/**
 * One modular-scale step size in px. `size = base × ratio^exp`, rounded the way
 * the caller has chosen — rounding is a decision the user makes, not a hidden
 * toFixed, which is why it is threaded through rather than applied at the end.
 */
// A step's TOKEN NAME. `base` is the anchor; everything above walks lg -> 8xl
// and everything below walks sm -> 4xs, which is the naming most teams already
// read fluently from Tailwind. Beyond the named runs it falls back to
// `Nxl`/`Nxs` rather than running out of names on a deep scale.
//
// This lived in TypeScale.jsx. It is here because the homepage workbench's
// Typography preview now labels each step with the token name the generator
// will emit for it - which is the string a visitor actually carries into their
// code, and the thing the mini was not showing. Two copies of a naming table
// is how the preview and the export come to disagree about what a step is
// called.
const UP_NAMES = ['lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl']
const DOWN_NAMES = ['sm', 'xs', '2xs', '3xs', '4xs']

export function stepName(exp) {
  if (exp === 0) return 'base'
  if (exp > 0) return UP_NAMES[exp - 1] || `${exp}xl`
  return DOWN_NAMES[-exp - 1] || `${-exp}xs`
}

export function stepPx(base, ratio, exp, round) {
  const raw = base * Math.pow(ratio, exp)
  if (round === 'whole') return Math.round(raw)
  if (round === 'half') return Math.round(raw * 2) / 2
  return +raw.toFixed(2)
}

/**
 * The clamp() for one step, given its size at each end of the range.
 *
 * Returns the CSS string plus the parts, so a caller can show the user the
 * numbers rather than only the expression — the parts are what make it
 * checkable, and an opaque clamp() is exactly the sort of output people paste
 * without understanding and then cannot debug.
 *
 * Degenerate cases are handled honestly rather than emitting a clamp that
 * cannot do anything: when both ends are equal the size is genuinely fixed, so
 * it returns a plain rem value and says so via `fluid: false`.
 */
export function fluidClamp(minPx, maxPx, viewports = FLUID_VIEWPORTS) {
  const { min: minVw, max: maxVw } = viewports
  const minRem = minPx / 16
  const maxRem = maxPx / 16

  // Equal ends, or a nonsensical viewport range, means there is nothing to
  // interpolate. Emitting `clamp(1rem, …, 1rem)` would be theatre.
  if (minPx === maxPx || !(maxVw > minVw)) {
    return { css: `${n(maxRem)}rem`, fluid: false, minRem, maxRem, slopeVw: 0, interceptRem: maxRem }
  }

  // Slope in rem per px of viewport, then per 1vw (= maxVw/100 px of viewport).
  const slope = (maxRem - minRem) / (maxVw - minVw)
  const slopeVw = slope * 100
  const interceptRem = minRem - slope * minVw

  // clamp() needs its bounds in ascending order. A DESCENDING step — smaller at
  // desktop than at mobile — is legitimate (a caption can shrink as the layout
  // gains room), and putting the larger value in the min slot would silently
  // pin it there forever, which is the kind of bug that looks like "the export
  // is wrong" months later.
  const lo = Math.min(minRem, maxRem)
  const hi = Math.max(minRem, maxRem)

  const preferred = `${n(interceptRem)}rem + ${n(slopeVw)}vw`
  return {
    css: `clamp(${n(lo)}rem, ${preferred}, ${n(hi)}rem)`,
    fluid: true,
    minRem,
    maxRem,
    slopeVw,
    interceptRem,
  }
}

/**
 * The rendered size at a given viewport width — what the clamp actually
 * resolves to. This is what lets the preview show the TRUE size at each
 * breakpoint instead of re-deriving it and hoping the two agree.
 */
export function sizeAtViewport(minPx, maxPx, vw, viewports = FLUID_VIEWPORTS) {
  const { min: minVw, max: maxVw } = viewports
  if (minPx === maxPx || !(maxVw > minVw)) return maxPx
  if (vw <= minVw) return minPx
  if (vw >= maxVw) return maxPx
  const t = (vw - minVw) / (maxVw - minVw)
  return +(minPx + (maxPx - minPx) * t).toFixed(2)
}

/**
 * Build the paired ladder: every step with its mobile size, its desktop size
 * and the clamp that joins them.
 *
 * `names` comes from the caller because the token naming is the caller's
 * vocabulary (sm/base/lg/xl…), not this module's business.
 */
export function buildFluidScale({ mobile, desktop, exps, names, round = 'half' }) {
  return exps.map((exp, i) => {
    const minPx = stepPx(mobile.base, mobile.ratio, exp, round)
    const maxPx = stepPx(desktop.base, desktop.ratio, exp, round)
    return {
      exp,
      name: names[i],
      minPx,
      maxPx,
      ...fluidClamp(minPx, maxPx),
    }
  })
}
