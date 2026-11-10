// The homepage hero's words. ONE module feeds the hydrated hero
// (src/components/home/HomeHero.jsx) and the served `/` shell
// (scripts/home-shell.mjs).
//
// The headline is READ from src/data/positioning.js, which holds it once for
// every surface that states it (this page, the served shell and the share
// card). This module only gives the landing the shape it renders: the three
// runs of the sentence, with the middle one painted in the full ink and the
// full stop outside it. Plain module, `.js` imports only, so the Node build
// scripts can import it.
import { HERO_HEADLINE, heroHeadlineText } from '../../data/positioning.js'

export const SPECTRUM_HERO = Object.freeze({
  text: heroHeadlineText(),
  lead: HERO_HEADLINE.lead,
  mark: HERO_HEADLINE.mark,
  tail: HERO_HEADLINE.tail,
})

export const SPECTRUM_HERO_SUB = 'Colours, type, icons and imagery. Exported as one file.'
