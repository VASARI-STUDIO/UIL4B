// What the Palette Library's search field matches against — built once per
// palette at module scope by the page, and once per palette by the unit suite.
//
// MEASURED 2026-09-16 on the live /discover/palettes at 1280: "blue" 0,
// "green" 0, "warm" 0, "pastel" 0 — while /discover/gradients answered all
// four. The haystack was name + kind + hex, so a mood the page had already
// classified for its Mood control (utils/paletteMood.js) was invisible to the
// search field beside it, and a colour was reachable only by typing its hex.
//
// Lives here rather than in PaletteGallery.jsx for the reason the mood maths
// does: a haystack reachable only through a React page can only be checked in
// a browser, and tests/unit/palette-mood.test.js has to be able to prove that
// "blue" finds something without one.
import { classifyPalette, hueTerms, MOOD_LABELS } from './paletteMood.js'

/**
 * The lower-cased text a query is substring-matched against: name, kind, every
 * hex, every mood the palette holds, and the hue name of every swatch.
 *
 * `mood` is optional so a caller that has already classified the palette (the
 * page classifies every palette once at module scope) is not asked to run
 * CAM16 per swatch a second time.
 */
export function paletteHaystack(palette, mood = classifyPalette(palette.colors)) {
  const moods = Object.keys(mood).filter((id) => mood[id]).map((id) => MOOD_LABELS[id])
  return [
    palette.name,
    palette.kind === 'brand' ? 'brand system' : 'curated',
    ...palette.colors,
    ...moods,
    ...hueTerms(palette.colors),
  ].join(' ').toLowerCase()
}
