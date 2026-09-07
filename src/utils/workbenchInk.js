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

import { contrastRatio, nearestPassingLightness } from './colors.js'

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
 * Now: pick the winning pole by MEASURED contrast, then walk it until it clears
 * 4.5:1. Same two starting colours, but the result is a guarantee instead of an
 * estimate, and it uses the sheet's own maths rather than a private copy of it.
 *
 * EVERY CANDIDATE IS TRIED, NOT JUST THE ONE THAT MEASURED BEST, and that is
 * the difference between a guarantee and a near miss.
 *
 * The first version compared #141414 against #FFFFFF, took the winner, walked
 * it with fixForeground and returned whatever came back. Two things make that
 * a silent failure on a mid-luminance chromatic fill:
 *
 *   1. fixForeground walked in ONE direction, chosen from the background's own
 *      luminance — `isDk = bgLum < 0.5`, then lighter for a dark ground and
 *      darker for a light one. On #D1491F (luminance .184) it therefore only
 *      ever looked for a LIGHTER ink, and the search started at white and had
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
 * THE WALK IS NOW nearestPassingLightness, WHICH SCANS BOTH DIRECTIONS
 * [contrast-search-one-directional-callers]. Adding #000000/#FFFFFF above
 * bought back the AA guarantee but left the one-way walk in place underneath
 * it, and the pole fallback hid what that costs. MEASURED, through this
 * function, over the 16,200 colours the generator can emit: the walk is reached
 * 408 times per 4,000 light-mode palettes and 249 times per 4,000 dark-mode
 * ones, and it returned its INPUT on 100% of those reaches — every single time
 * it was asked, it did nothing. The candidate list then fell through to the raw
 * pole, so the ink still cleared AA and no test could see it; what shipped was
 * #000000 where #121212 passes, up to 7 lightness units farther from the house
 * ink than the smallest passing move. On #D1571F: shipped #000000, available
 * #121212. That is a fidelity loss, not a legibility one — the pole fallback
 * makes this the one site where the mask was genuinely real for contrast — but
 * it defeats the sentence directly above, which promises the house ink keeps
 * its place everywhere it already works.
 *
 * nearestPassingLightness returns null when NO move on this axis can clear, so
 * the candidate is filtered before the loop; the absolute poles below still
 * carry the guarantee.
 *
 * THERE USED TO BE TWO WALK CANDIDATES HERE AND THE SECOND IS DELETED. It read
 * `fixForeground(other, bg, 4.5)`, and it is unreachable: `softer` and `other`
 * are #141414 and #FFFFFF, which are BOTH at hue 0, saturation 0 — the same grey
 * axis — so the two walks search identical candidate sets and differ only in
 * where they start. The first is never null, because that axis runs from
 * #000000 to #FFFFFF and one absolute pole always clears; so the loop below
 * always returns at or before the first walk, and the second was never
 * evaluated. Keeping it cost nothing at runtime and cost a great deal in
 * review: the two masked each other, so reverting EITHER one to the old
 * one-way search changed nothing observable, and no mutation test could catch a
 * regression in either. Measured over 48,681 distinct colours: reverting
 * candidate A alone, 0 observable differences; reverting candidate B alone, 0.
 * Reverting both, 570 of 16,200 generated colours ship a worse ink. One walk
 * can be tested; two that shadow each other cannot.
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
  // Order is preference order: the house ink, then its opposite, then the
  // smallest move off the house ink that passes, and only then the absolute
  // poles. One walk, not two — see the note above on why the second was dead.
  const tries = [
    softer,
    other,
    nearestPassingLightness(softer, bg, 4.5),
    '#000000',
    '#FFFFFF',
  ].filter(Boolean)
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
 *
 * THE MOVE BRANCH IS NOW PROVABLY UNREACHABLE, and it is kept as a guard rather
 * than deleted [contrast-search-one-directional-callers]. readableInk lists
 * #000000 and #FFFFFF as explicit candidates, and the two pole curves —
 * contrast(black, C) = (L + .05)/.05 rising, contrast(white, C) = 1.05/(L + .05)
 * falling — cross at L = .1789 where both read 4.579:1. So for EVERY colour in
 * sRGB one absolute pole clears 4.579 > 4.5, readableInk always returns
 * something that passes, and the ternary above always takes `bg`. Measured, not
 * only derived: reached 0 times over the 216-colour review grid, 0 over the
 * 16,200 generated colours, and 0 over 8,000 palettes driven through
 * derivePreviewRoles in both modes.
 *
 * It still routes through nearestPassingLightness rather than fixBackground,
 * because a branch that can never run is exactly where a wrong rule survives
 * unnoticed — this one has already come back three times. Note the ARGUMENT
 * ORDER FLIP: contrast is symmetric, so nearestPassingLightness takes the
 * colour to MOVE first and the one to hold fixed second. Here the GROUND moves.
 */
export function labelGround(bg) {
  const ink = readableInk(bg)
  if (contrastRatio(ink, bg) >= 4.5) return bg
  return nearestPassingLightness(bg, ink, 4.5) ?? bg
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
 * Walking the INK cannot rescue that either, if the walk takes its direction
 * from the ground (`bgLum < 0.5` ⇒ walk the ink lighter): on a mid-luminance
 * chromatic ground, starting from black, it walks the ink toward the ground
 * rather than away and lands further short. That is the same flaw #346
 * documented for the single-ground case.
 *
 * So the pole is chosen ONCE for the card, and then whichever grounds do not
 * clear it are walked until they do — hue and saturation kept, lightness only,
 * by the sheet's own nearestPassingLightness. The pole that needs the LEAST total
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
 *
 * THIS IS THE ONE SITE WHERE THE OLD ONE-WAY WALK WAS STRUCTURALLY SAFE, and it
 * is worth writing down rather than leaving as luck
 * [contrast-search-one-directional-callers]. fixBackground took its direction
 * from the INK's luminance (`fgLum > 0.5` ⇒ darken the ground), and the ink here
 * is always one of the two achromatic poles: #141414 sits at luminance .0069 and
 * #FFFFFF at 1.0. Both are unambiguously on the correct side of 0.5, so the
 * threshold that is wrong at the .179 crossover was never consulted near it. The
 * output is byte-identical either way: measured over the 216-colour review grid
 * cross-product (46,656 pairs), 41,580 realistic (bg, surface+6L) pairs swept
 * across the crossover band, and 8,000 palettes through derivePreviewRoles —
 * 0 differences, 0 AA failures on either side, and 0 cases where the shipped
 * grounds moved farther than the smallest passing move. The calls were reached
 * 8,000 (light) and 8,286 (dark) times per 4,000 palettes and were never a
 * no-op, so this is a live site with a real mask, not a dead one.
 *
 * It is rerouted anyway, for the reason the item was filed: leaving the last
 * caller of a helper that encodes the wrong rule is how the rule survives to be
 * copied again. The behaviour is unchanged and the sweep above is what says so.
 */
export function cardGrounds(bgIn, surfaceIn) {
  // A monotone stand-in for lightness distance that needs no extra import:
  // how far each ground moved, measured as its contrast against white.
  const drift = (a, b) => Math.abs(contrastRatio(a, '#FFFFFF') - contrastRatio(b, '#FFFFFF'))
  let best = null
  for (const pole of ['#141414', '#FFFFFF']) {
    // The GROUND is the side that moves, so it goes first.
    const bg = contrastRatio(pole, bgIn) >= 4.5 ? bgIn : (nearestPassingLightness(bgIn, pole, 4.5) ?? bgIn)
    const surface = contrastRatio(pole, surfaceIn) >= 4.5
      ? surfaceIn
      : (nearestPassingLightness(surfaceIn, pole, 4.5) ?? surfaceIn)
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
 * 2. Otherwise walk it, which keeps the muted hue.
 * 3. If that still misses, take the better achromatic pole. The walk PRESERVES
 *    HUE AND SATURATION, so against a mid-luminance chromatic ground there can
 *    be no ink of this hue that clears at all: measured #14461a on #36983f at
 *    2.98:1 and #493b12 on #967517 at 2.53:1, where plain black clears both at
 *    5.8 and 5.2. That is the same "no ink of this hue clears it" case
 *    labelGround was written for; here the ground is fixed by the layout, so
 *    legibility takes the hue's place.
 *
 * BOTH WALKS TOOK THEIR DIRECTION FROM THE GROUND UNTIL NOW, AND THE POLE
 * FALLBACK DID NOT COVER IT [contrast-search-one-directional-callers]. Steps 2
 * and 3 both called fixForeground, whose `bgLum < 0.5` rule is wrong on every
 * ground between relative luminance .179 and .5 — and step 3's poles are
 * #141414/#FFFFFF, not #000000/#FFFFFF, so their curves cross at 4.295:1 and
 * there is a band where NEITHER pole clears 4.5 unaided and the walk is the only
 * thing that can save it. Measured through this function over the 216-colour
 * review grid, every ink against every ground: 1,071 of 46,656 (2.30%) shipped
 * an ink under 4.5:1 that a both-directions search clears — worst #000066 on
 * #6666FF, which shipped #141414 at 4.31:1 where #000047 gives 4.50:1 — plus
 * 1,114 inks with lower contrast than the smallest passing move (worst gap 0.31)
 * and 16,112 that discarded the muted hue entirely where the hue could have been
 * kept.
 *
 * THE CURRENT HOMEPAGE DOES NOT REACH EITHER WALK — 0 reaches over 8,000
 * palettes in both modes, because derivePreviewRoles pre-clamps `muted` and
 * cardGrounds hands back grounds a pole already clears — so this site's mask
 * looked total and was not. The mask depends on two upstream functions this one
 * does not control, and the guarantee in the heading above is stated over EVERY
 * ground, not over the ones today's caller happens to pass. That is why the
 * measurement above is taken through this function's own contract rather than
 * through HomeWorkbench, and why the unit test that guards it drives grounds
 * that reach the walk.
 */
export function mutedInk(muted, grounds) {
  const worstOf = (ink) => Math.min(...grounds.map((g) => contrastRatio(ink, g)))
  if (worstOf(muted) >= 4.5) return muted
  let walked = muted
  for (const g of grounds) {
    // The INK is the side that moves, so it goes first. `null` means no ink of
    // this hue clears this ground, which is step 3's case, not a reason to stop.
    if (contrastRatio(walked, g) < 4.5) walked = nearestPassingLightness(walked, g, 4.5) ?? walked
  }
  if (worstOf(walked) >= 4.5) return walked
  // STEP 3 USED TO RETURN A RAW POLE and stop, which is not a guarantee — on an
  // impossible ground the better pole is still the better FAILING value. It
  // walks each pole against every ground the way step 2 walks the hue, and keeps
  // whichever ends up further clear. Walking an achromatic keeps it achromatic,
  // so this only ever slides along the grey axis.
  //
  // EVERY INTERMEDIATE IS A CANDIDATE, INCLUDING THE UNWALKED POLE, and that is
  // not tidiness — it is the fix for a regression that a like-for-like swap of
  // the search introduced here [contrast-search-one-directional-callers].
  //
  // The walk below is SEQUENTIAL over grounds: it moves the ink to clear g1,
  // then moves it again to clear g2, and the second move can break g1. That
  // oscillation was always in this loop, but the old one-way search hid it by
  // usually doing nothing at all — a walk that returns its input cannot
  // oscillate. Giving it a search that actually moves exposed it. MEASURED over
  // 787,968 reaching cases: on the pair [#787878, #000000], which no ink can
  // clear, the sequential walk lands on #757575 (worst 1.04:1) because it fixed
  // the second ground by abandoning the first, where the plain unwalked #FFFFFF
  // pole is worth 4.42:1. That is worse than what shipped, and it would have
  // been a real regression rather than a fix.
  //
  // Collecting the intermediates and choosing by worst-ground contrast makes
  // this monotone: the raw poles are always in the running, so step 3 can never
  // return anything worse than the pole it started from, and it still picks up
  // the walked value whenever the walk genuinely helps. #000000 joins the poles
  // for the same reason readableInk added it — #141414 is not black, and the
  // #141414/#FFFFFF curves cross at only 4.295:1, so there is a band of grounds
  // where neither of the two house poles clears 4.5 and the absolute one does.
  let best = null
  const consider = (ink) => { if (best === null || worstOf(ink) > worstOf(best)) best = ink }
  for (const pole of ['#141414', '#FFFFFF', '#000000']) {
    let ink = pole
    consider(ink)
    for (const g of grounds) {
      if (contrastRatio(ink, g) < 4.5) {
        ink = nearestPassingLightness(ink, g, 4.5) ?? ink
        consider(ink)
      }
    }
  }
  return best
}
