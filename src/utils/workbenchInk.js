// The workbench preview's colour maths, lifted out of HomeWorkbench.jsx so it
// can be driven directly by a unit test.
//
// WHY IT MOVED. 8c in 10-home-chaos-to-calm.spec.js used to prove these
// guarantees by clicking Generate 24 times per theme in a rendered browser,
// inside one 30s test budget, reading a full contrast walk between clicks. That
// is 48 rerolls paid for at browser round-trip prices, and it timed out on a
// contended machine while passing on its own - a flake indistinguishable at a
// glance from the real unreachable-Generate defect recorded on
// [workbench-handoff-overlays-controls]. Reproduced on demand at a 10x Chromium
// CPU throttle: 24 rounds busts the budget, 4 rounds finishes in 18.4s.
//
// These functions are pure and depend only on ./colors, so the exhaustive
// version of that proof costs milliseconds here instead of seconds there. 8c
// keeps a short rendered loop, because only the rendered page can show that the
// COMPONENT still calls these - and the estimate that skipped the render once
// already missed role.text by assuming the ground equalled role.surface.

import { contrastRatio, fixBackground, fixForeground } from './colors.js'

// The generator's lightness band. Exported because the sweep that proves the
// guarantees has to cover the same colours the Generate button can emit.
export const L_RAMP = [34, 47, 60, 73, 86]

/* ── colour maths (no dependency, deterministic) ────────────────────────── */

export function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}

/**
 * A readable ink for text on an arbitrary generated fill — one that actually
 * clears AA rather than assuming it does.
 *
 * This used to be a naive luminance sum against a hand-tuned 0.58 threshold,
 * which decides which POLE looks better and then hopes. Hoping is not enough
 * here: the palette is regenerated at random on every load, so a swatch like
 * #2887C8 took white ink at 3.9:1 and #5588DD at 3.53:1. Both are AA failures
 * on the homepage's own swatch labels, and because the input is random they
 * appeared only on some loads — which is exactly why they survived. Caught by
 * 39-accent-contrast on CI, on the run that also flagged the preview avatar.
 *
 * Now: pick the winning pole by MEASURED contrast, then let fixForeground walk
 * it until it clears 4.5:1. Same two starting colours, but the result is a
 * guarantee instead of an estimate, and it uses the sheet's own maths rather
 * than a private copy of it.
 *
 * EVERY CANDIDATE IS TRIED, NOT JUST THE ONE THAT MEASURED BEST, and that is
 * the difference between a guarantee and a near miss.
 *
 * The first version compared #141414 against #FFFFFF, took the winner, walked
 * it with fixForeground and returned whatever came back. Two things make that
 * a silent failure on a mid-luminance chromatic fill:
 *
 *   1. fixForeground walks in ONE direction, chosen from the background's own
 *      luminance — `isDk = bgLum < 0.5`, then lighter for a dark ground and
 *      darker for a light one. On #D1491F (luminance .184) it therefore only
 *      ever looks for a LIGHTER ink, and the search starts at white and has
 *      nowhere to go: [100,100] in HSL lightness returns white unchanged.
 *   2. #141414 is not black, and those missing 20 units of lightness are worth
 *      about half a contrast point.
 *
 * So on #D1491F white measures 4.48, #141414 measures 4.11, white wins the
 * comparison, the walk cannot improve it, and 4.48 ships. Pure black on that
 * same fill is 4.688 and was never asked. #000000 is now an explicit candidate
 * for exactly this case, tried LAST among the passing options so that the
 * house ink keeps its place everywhere it already works and only the fills
 * that genuinely need a harder pole get one.
 *
 * WHY IT WENT UNSEEN. Every caller until 2026-09-05 painted its ink on
 * labelGround(bg) rather than on bg, and labelGround's whole job is to move a
 * ground that admits no good ink — so it absorbed this, and the unit sweep,
 * which measures ink against the MOVED ground, could not see it. The homepage
 * Palette panel now renders the product's own `.plb-board`, where `.plb-name`,
 * `.plb-hex` and `.plb-role` sit on the raw generated fill with no chip
 * underneath, and the miss surfaced at once. Caught by the new sweep in
 * tests/unit/home-workbench-ink.test.js, which is what that test is for.
 *
 * Strictly an improvement for the older callers: a better ink means labelGround
 * moves a ground less often, never more.
 */
export function readableInk(bg) {
  const softer = contrastRatio('#141414', bg) >= contrastRatio('#FFFFFF', bg) ? '#141414' : '#FFFFFF'
  const other = softer === '#141414' ? '#FFFFFF' : '#141414'
  // Order is preference order: the house ink, then its opposite, then each of
  // them walked, and only then the absolute poles.
  const tries = [
    softer,
    other,
    fixForeground(softer, bg, 4.5),
    fixForeground(other, bg, 4.5),
    '#000000',
    '#FFFFFF',
  ]
  for (const ink of tries) {
    if (contrastRatio(ink, bg) >= 4.5) return ink
  }
  // Nothing clears AA on this fill: the fill is the problem, not the ink, which
  // is the case labelGround() exists for. Hand back the best available, so a
  // caller that cannot move its ground still gets the maximum and the shortfall
  // stays a measurable number rather than an exception.
  return tries.reduce((best, ink) => (contrastRatio(ink, bg) > contrastRatio(best, bg) ? ink : best), tries[0])
}

/**
 * The ground a label needs in order to be readable ON a generated colour.
 *
 * Choosing a better ink is not always enough, because for a mid-luminance
 * chromatic fill there is NO ink that clears 4.5:1 — #1A8993 tops out at 4.42
 * against black and 4.16 against white. The fill is the problem, so the label
 * gets its own ground: the swatch's own hue and saturation, walked in lightness
 * only as far as the ink requires.
 *
 * Usually it returns the swatch unchanged and nothing is drawn; #2D9EC3 and
 * #519AE1 both come back identical. It moves only where it must, and barely —
 * #1A8993 becomes #1B8D98. The swatch itself is NEVER touched: the large area a
 * visitor reads the colour from stays the exact value the hex claims, which is
 * the whole point of the control.
 *
 * Swept over all 16,200 colours the generator can emit (360 hues x 5 ramp steps
 * x the saturation band): every ink/ground pair clears 4.5:1, against 669 that
 * did not before.
 */
export function labelGround(bg) {
  const ink = readableInk(bg)
  return contrastRatio(ink, bg) >= 4.5 ? bg : fixBackground(ink, bg, 4.5)
}

/**
 * ONE INK FOR THE WHOLE CARD, and the smallest ground move that lets it work.
 *
 * Applying labelGround to `bg` and `surface` SEPARATELY is not enough, and the
 * reason is worth stating because it looks like it should be. Each ground then
 * gets whichever pole suits IT, and the two can disagree — measured on the
 * rendered page, bg #248721 (relative luminance .178) and surface #3b9738
 * (.234). Black clears surface at 5.10 but only 4.10 on bg; white clears bg at
 * 4.61 but only 3.70 on surface. Neither pole clears BOTH, so no single value
 * of `muted` or `text` can be right, and the card paints one label legibly and
 * the next one not.
 *
 * fixForeground cannot rescue that either: it takes its direction from the
 * ground (`bgLum < 0.5` ⇒ walk the ink lighter), so on a mid-luminance
 * chromatic ground, starting from black, it walks the ink toward the ground
 * rather than away and lands further short. That is the same flaw #346
 * documented for the single-ground case.
 *
 * So the pole is chosen ONCE for the card, and then whichever grounds do not
 * clear it are walked until they do — hue and saturation kept, lightness only,
 * by the sheet's own fixBackground. The pole that needs the LEAST total
 * movement wins, because every unit of movement is the preview showing a
 * colour the palette did not generate. On the pair above that is black, which
 * needs bg lifted from .178 to .200 and leaves surface untouched — against
 * white, which would have needed surface darkened by a fifth.
 *
 * THIS IS THE DESIGN COST THE BACKLOG ITEM FLAGGED, and it is real: on a
 * palette whose steps land mid-luminance, the card's chrome is no longer
 * exactly the generated hex. It is the same trade labelGround already makes
 * for .hw-pal-hex and .hw-ui-avatar, applied to the two containers, and the
 * swatch row underneath still shows every generated value untouched.
 */
export function cardGrounds(bgIn, surfaceIn) {
  // A monotone stand-in for lightness distance that needs no extra import:
  // how far each ground moved, measured as its contrast against white.
  const drift = (a, b) => Math.abs(contrastRatio(a, '#FFFFFF') - contrastRatio(b, '#FFFFFF'))
  let best = null
  for (const pole of ['#141414', '#FFFFFF']) {
    const bg = contrastRatio(pole, bgIn) >= 4.5 ? bgIn : fixBackground(pole, bgIn, 4.5)
    const surface = contrastRatio(pole, surfaceIn) >= 4.5
      ? surfaceIn
      : fixBackground(pole, surfaceIn, 4.5)
    const worst = Math.min(contrastRatio(pole, bg), contrastRatio(pole, surface))
    const moved = drift(bg, bgIn) + drift(surface, surfaceIn)
    const clears = worst >= 4.5
    if (best === null
      || (clears && !best.clears)
      || (clears === best.clears && moved < best.moved)) {
      best = { pole, bg, surface, worst, moved, clears }
    }
  }
  return best
}

/**
 * The muted role, guaranteed against EVERY ground the card actually paints it
 * on rather than only the one it was derived against.
 *
 * derivePreviewRoles already clamps `muted` to 4.5:1 — but against `bg` alone
 * (utils/colors.js, "muted + border: derived from text↔bg, contrast-clamped").
 * This card then paints it on `surface` too: .hw-ui-bar and .hw-ui-delta both
 * set background:role.surface. `surface` is only a 6% shift from `bg`, which
 * looks close enough to be safe and is not — for a saturated generated palette
 * that shift is worth more than the margin the clamp leaves. Measured over 80
 * generator rerolls before this: 216 of 480 samples under 4.5:1 (45%), worst
 * 2.53:1, e.g. #9999cc on #35399a at 3.53:1.
 *
 * Three steps, because the obvious one is not enough on its own:
 *
 * 1. Keep `muted` untouched when it already clears both grounds — the common
 *    case, and the one that preserves the palette's character.
 * 2. Otherwise let fixForeground walk it, which keeps the muted hue.
 * 3. If that still misses, take the better achromatic pole. fixForeground
 *    PRESERVES HUE AND SATURATION and picks its direction from the ground's
 *    luminance (`bgLum < 0.5` ⇒ walk lighter), so against a mid-luminance
 *    chromatic ground it can walk away from the reachable side and top out
 *    short: measured #14461a on #36983f at 2.98:1 and #493b12 on #967517 at
 *    2.53:1, where plain black clears both at 5.8 and 5.2. That is the same
 *    "no ink of this hue clears it" case labelGround was written for; here the
 *    ground is fixed by the layout, so legibility takes the hue's place.
 */
export function mutedInk(muted, grounds) {
  const worstOf = (ink) => Math.min(...grounds.map((g) => contrastRatio(ink, g)))
  if (worstOf(muted) >= 4.5) return muted
  let walked = muted
  for (const g of grounds) {
    if (contrastRatio(walked, g) < 4.5) walked = fixForeground(walked, g, 4.5)
  }
  if (worstOf(walked) >= 4.5) return walked
  // STEP 3 USED TO RETURN A RAW POLE and stop, which is not a guarantee — on an
  // impossible ground the better pole is still the better FAILING value. It now
  // walks each pole against every ground the way step 2 walks the hue, and keeps
  // whichever ends up further clear. Walking an achromatic keeps it achromatic,
  // so this only ever slides along the grey axis.
  let best = null
  for (const pole of ['#141414', '#FFFFFF']) {
    let ink = pole
    for (const g of grounds) {
      if (contrastRatio(ink, g) < 4.5) ink = fixForeground(ink, g, 4.5)
    }
    if (best === null || worstOf(ink) > worstOf(best)) best = ink
  }
  return best
}
