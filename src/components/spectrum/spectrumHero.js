// THE FRONT DOOR'S HEADLINE AND SUB-LINE — the lines from the Spectrum design
// (UIL4B - Spectrum.dc.html, the hero h1 and the paragraph under it).
//
// The headline is READ from src/data/positioning.js, which holds it once for
// every surface that states it (this page, the served `/` shell and the share
// card). This module only gives the landing the shape it renders: the whole
// sentence and the run it paints in the accent, as ONE revealed word with its
// full stop outside the accent. Plain module, `.js` imports only, so the Node
// build scripts can import it.
import { HERO_HEADLINE, heroHeadlineText } from '../../data/positioning.js'

export const SPECTRUM_HERO = Object.freeze({
  text: heroHeadlineText(),
  mark: HERO_HEADLINE.mark,
})

// The design's sentence as written: "kit" here is what gets EXPORTED, which
// is the one place the word applies.
export const SPECTRUM_HERO_SUB =
  'Pick your colours, type, icons and imagery in the browser, then export the whole kit as one file.'
