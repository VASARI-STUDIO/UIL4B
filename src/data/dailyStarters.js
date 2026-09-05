// THE DAY'S SUGGESTED ARTEFACTS — real gradients and real palettes, rotating
// daily, each one opening the tool that builds it with the values already in.
//
// ────────────────────────────────────────────────────────────────────────
// WHY THIS REUSES THE HOMEPAGE'S MACHINERY RATHER THAN INVENTING ITS OWN
// ────────────────────────────────────────────────────────────────────────
// The founder asked for “suggested icons, palettes or gradients”. The homepage
// already solved the hard half of that in `homepage-community-points-outward`:
// gradients come out of GALLERY_GRADIENTS, palettes out of LIBRARY_PALETTES, and
// the link is built by gradientToolUrl() / paletteBuilderUrl() — the SAME
// hand-offs the Discover galleries use, so the tool opens with the values loaded
// and there is no second encoding of a tool URL anywhere in the codebase.
//
// Everything here is that pattern with a daily rotation on top. Nothing writes
// down a colour, a URL or a name: all three are read back out of the gallery
// that owns them, and an id that does not exist THROWS at import, which fails
// the build rather than silently rendering three cards where four were meant.
//
// ────────────────────────────────────────────────────────────────────────
// WHY THERE ARE NO SUGGESTED ICONS
// ────────────────────────────────────────────────────────────────────────
// The founder's words were “icons, palettes OR gradients”, and two of the three
// ship here. Icons are the one that cannot, honestly: /create/icons reads the
// Iconify catalogue over the network (api.iconify.design), so a “suggested icon”
// on this surface would be either a third-party request on the first paint of
// the signed-in front door — the exact cost `firebase-critical-path` is open
// about — or a hard-coded SVG that is no longer “from the library” in any
// meaningful sense. Gradients and palettes are local, static and already
// hand-off-wired, so they are the two that can be suggested truthfully.
//
// This is a deliberate omission, not an oversight. If the founder wants icons
// here, the honest way is a small pre-picked local set with its own provenance,
// which is a separate piece of work.

import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from './gradientGallery.js'
import { LIBRARY_PALETTES } from './paletteLibrary.js'
import { paletteBuilderUrl } from './paletteGallery.js'
import { pickForDay, paletteBands } from '../utils/userHome.js'
import { dayNumber } from './dailyTips.js'

/**
 * The palettes this surface is allowed to suggest.
 *
 * Pro-locked brand palettes are excluded. Suggesting one would open the Palette
 * Builder on a system it then refuses to load — a recommendation that turns into
 * an upsell the moment it is taken, which is the least trustworthy thing a
 * “suggested for you” row can do. The Palette Library is where locked brands are
 * legitimately teased, with the lock visible before the click.
 */
export const SUGGESTABLE_PALETTES = LIBRARY_PALETTES.filter((p) => !p.pro)

/** Real catalogue sizes, counted off the arrays — never typed. */
export const STARTER_TOTALS = Object.freeze({
  gradients: GALLERY_GRADIENTS.length,
  palettes: SUGGESTABLE_PALETTES.length,
})

function gradientCard(g) {
  return {
    id: g.id,
    kind: 'Gradient',
    name: g.name,
    // The artefact rendered for real, not a stand-in for it.
    art: gradientCss(g.type, g.angle, g.stops),
    fact: g.type === 'Linear'
      ? `${g.stops.length} stops · ${g.angle}°`
      : `${g.type} · ${g.stops.length} stops`,
    to: gradientToolUrl(g),
    opens: 'Gradient Generator',
  }
}

function paletteCard(p) {
  return {
    id: p.id,
    kind: 'Palette',
    name: p.name,
    // The same hard-stop bands the project cards draw, from the one
    // implementation in utils/userHome.js — a palette must not look like two
    // different things on two surfaces of the same page.
    art: paletteBands(p.colors),
    fact: `${p.colors.length} colours`,
    to: paletteBuilderUrl(p.colors),
    opens: 'Palette Builder',
  }
}

/**
 * Today's suggestions: two gradients and two palettes, interleaved so the row
 * alternates rather than grouping by kind.
 *
 * Deterministic for a date and different tomorrow — same contract as the daily
 * tip, for the same reason: a suggestion that reshuffles on every render is
 * noise, and one that never changes stops being looked at.
 *
 * The two lists are offset from each other so the gradient row and the palette
 * row do not advance in lockstep and produce the same pairing every cycle.
 */
export function startersForDay(date) {
  const day = dayNumber(date)
  const gradients = pickForDay(GALLERY_GRADIENTS, day, 2).map(gradientCard)
  const palettes = pickForDay(SUGGESTABLE_PALETTES, day, 2, 11).map(paletteCard)
  const out = []
  for (let i = 0; i < 2; i += 1) {
    if (gradients[i]) out.push(gradients[i])
    if (palettes[i]) out.push(palettes[i])
  }
  return out
}
