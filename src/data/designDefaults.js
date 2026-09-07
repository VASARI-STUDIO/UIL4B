// The design a brand-new, untouched project starts from.
//
// LIFTED OUT OF ProjectContext.jsx, unchanged. It lived there because that is
// the only place that WROTE it — but it is now also the thing a saved project
// gets COMPARED AGAINST, by src/utils/userHome.js, to answer “what is actually
// in this project, and what has never been touched?”.
//
// That comparison has to be DOM-free and React-free to be testable, and
// ProjectContext.jsx is neither: importing it pulls in React, the auth context
// and the Firestore SDK. So the data moves here, the context imports it back and
// re-exports it (every existing `import { DEFAULT_DESIGN } from
// '../contexts/ProjectContext'` keeps working), and the progress read compares
// against the SAME object the save path writes.
//
// The alternative was to hard-code “Inter”, 16 and 1.25 into the progress logic.
// That is the defect this file exists to prevent: the day someone changes the
// default ratio, a page would start telling every user their type scale was
// untouched when they had set it, or vice versa, and nothing would fail.

export const DEFAULT_DESIGN = {
  palette: {
    base: '#0051FF',
    // P-004: Auto, not Analogous. Analogous is a PAID system, and the engine
    // silently collapses it to Auto for a free user — so a new board's first
    // impression was a system that did not do what its label said. Auto is free
    // for everyone and is what the board was actually rendering anyway.
    harmony: 'auto',
    extraColors: [],
    activeIdx: 0,
    colors: ['#0051FF'],
  },
  states: { success: 1, warning: 0, error: 0, info: 0 },
  tints: { lumBias: 82, satDecay: 12, oled: true, scale: [] },
  gradient: {
    stops: [{ color: null, position: 0 }, { color: null, position: 100 }],
    angle: 135,
    type: 'Linear',
  },
  fonts: {
    heading: { family: 'Inter', weight: 700, category: 'sans-serif' },
    body: { family: 'Inter', weight: 400, category: 'sans-serif' },
  },
  typeScale: {
    base: 16,
    ratio: 1.25,
    lineHeight: 1.5,
    headingSpacing: 0,
    bodySpacing: 0,
  },
}

/**
 * The tint configuration the Colour Studio builds out of a project's saved tint
 * settings — the shape of the `tintScale` memo in src/pages/ColorStudio.jsx.
 *
 * DERIVED HERE RATHER THAN COPIED AT THE CALL SITE for the same reason the rest
 * of this file exists: /help renders the ramp a brand-new project generates, and
 * the only way that strip can stay true is if it is built from the same object
 * the studio is built from. A hard-coded copy would go on rendering the old ramp
 * on the day the defaults change, and nothing would fail.
 *
 * `anchor: 5` is the 500 stop — the position in the eleven-stop ladder that
 * holds the base colour unchanged — and `hueShift: 0` means the ramp does not
 * drift in hue. Both are fixed in ColorStudio too; only the three project
 * settings vary.
 */
export function tintConfigFor(design = DEFAULT_DESIGN) {
  const { lumBias, satDecay, oled } = design.tints
  return {
    hex: design.palette.base,
    anchor: 5,
    hueShift: 0,
    satMin: -satDecay,
    satMax: satDecay / 2,
    lMin: oled ? 3 : 5,
    lMax: lumBias,
    mode: 'perceived',
  }
}
