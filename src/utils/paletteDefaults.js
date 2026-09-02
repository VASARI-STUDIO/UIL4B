// What /create/palette opens on, and what Reset returns it to.
//
// Founder request, 2026-09-03: "the pallete page should auto load a random
// pallete on the default free settings. reset should reset the settings to
// default but randomise the colour."
//
// This lives apart from PaletteBuilder.jsx for the same reason utils/
// paletteSeed.js does: a plain module can be imported by a node:test unit
// without a DOM, and the two rules below are ones you want tested exhaustively
// rather than sampled through a browser.
//
// ── The two rules ───────────────────────────────────────────────────────────
//
// 1. THE DEFAULT IS THE FREE DEFAULT. Before this module, a fresh board was
//    built by `generateHarmony(seed, 'analogous')` and Reset returned to
//    `generateHarmony('#4338E0', 'analogous')` — while the system chip read
//    "Auto". Analogous is `free: false`. So the palette a free user was handed
//    on arrival, and the one Reset gave them, both came out of the PAID
//    harmony engine under a free label: output they could see but could not
//    reproduce, which is a paywall bug rather than a cosmetic one. P-004 had
//    already moved the chip and ProjectContext to 'auto' and missed these two
//    generator calls. DEFAULT_SYSTEM is now one constant, asserted against the
//    free list in tests/unit/palette-defaults.test.js.
//
// 2. A SHARED LINK BEATS THE RANDOM DRAW. `initialPaletteBoard` is the whole
//    precedence, in one pure function, so "does ?c= still win?" is a question
//    with an answer you can enumerate instead of a browser you have to trust.
//    An explicit ?c= is the strongest statement of intent there is — someone
//    sent that palette to a colleague — so it outranks a hand-off, a saved
//    project and the draw, in that order.
//
// ── Why the randomiser is injected ──────────────────────────────────────────
// `random` defaults to `randomSystemPalette`, the SAME engine behind the
// Randomise button and the Space key. It is a parameter only so a test can
// make the draw deterministic — never so a caller can supply a second source
// of randomness. Two randomisers would drift, and the board would eventually
// open on something the shuffle button could not produce.
import { randomSystemPalette } from './colors.js'
import { normaliseHex, ZERO_ADJUST } from './paletteAdjust.js'

// 'auto' is the tonal HCT engine: free for everyone, and already what
// ProjectContext's DEFAULT_DESIGN and the builder's system chip claim.
export const DEFAULT_SYSTEM = 'auto'

// Five roles — PRIMARY, SECONDARY, ACCENT, SUBTLE, DEEP. A board with fewer is
// not a palette, which is why every path below has a floor.
const MIN_COLORS = 5

/** Shared palettes arrive as /create/palette?c=4338E0,7C6CF0,… — parse or null.
 *  Takes the search string rather than reading `window` so it is testable and
 *  so the page keeps ownership of where the string comes from. */
export function colorsFromSearch(search, max = 10) {
  try {
    const c = new URLSearchParams(search || '').get('c')
    if (!c) return null
    const list = c.split(',').map(normaliseHex).filter(Boolean)
    return list.length >= 2 ? list.slice(0, max) : null
  } catch {
    return null
  }
}

/** A fresh board on the default free settings: a random palette drawn by the
 *  Randomise engine, on DEFAULT_SYSTEM, with the adjust lens at zero. */
export function defaultPaletteBoard(random = randomSystemPalette) {
  let colors = []
  try {
    colors = (random(DEFAULT_SYSTEM) || []).map(normaliseHex).filter(Boolean)
  } catch {
    colors = []
  }
  // The engine failing is not a reason to render an empty board. Falling back
  // to a fixed palette is honest here in a way it is not on arrival: nothing
  // downstream can tell the difference, and a board is better than a blank.
  if (colors.length < MIN_COLORS) colors = ['#4338E0', '#6F5BEB', '#9A8CF3', '#E8E5FB', '#241E7A']
  return { colors, seed: colors[0], system: DEFAULT_SYSTEM, adjust: { ...ZERO_ADJUST } }
}

/**
 * What the board opens on, in precedence order. Returns
 * `{ colors, seed, adjust, source }`; `source` is what lets the page tell an
 * untouched draw apart from something a person actually chose.
 *
 *   'query'   an explicit ?c= — a link someone sent. Wins over everything.
 *   'handoff' the visitor pressed Continue in another tool seconds ago.
 *   'saved'   the project on this device. Real work; never drawn over.
 *   'random'  nothing to preserve, so draw one.
 */
export function initialPaletteBoard(sources = {}, random = randomSystemPalette) {
  const { queryColors, handoff, saved } = sources
  if (queryColors?.length >= 2) {
    return { colors: queryColors, seed: queryColors[0], adjust: { ...ZERO_ADJUST }, source: 'query' }
  }
  if (handoff?.colors?.length >= 2) {
    return { colors: handoff.colors, seed: handoff.colors[0], adjust: { ...ZERO_ADJUST }, source: 'handoff' }
  }
  if (saved?.colors?.length >= 2) {
    return { colors: saved.colors, seed: saved.colors[0], adjust: saved.adjust, source: 'saved' }
  }
  const fresh = defaultPaletteBoard(random)
  return { colors: fresh.colors, seed: fresh.seed, adjust: fresh.adjust, source: 'random' }
}

/**
 * Is every SETTING already at its default? Colours are deliberately excluded.
 *
 * Reset used to detect "already reset" by comparing the whole board against a
 * fixed default palette. Now that Reset draws a new colour every press, no two
 * resets produce the same board and that comparison could never be true again
 * — which would have quietly disabled the guard that stops a defensive
 * double-click from overwriting the recoverable pre-reset snapshot. Settings
 * are the half that is genuinely idempotent, so they are the half that decides.
 */
export function isDefaultSettings(state = {}) {
  const adjust = state.adjust || {}
  return state.harmony === DEFAULT_SYSTEM
    && (state.locked?.length || 0) === 0
    && (state.vision || 'normal') === 'normal'
    && !state.showContrast
    && !state.importedGalleryId
    && Object.keys(ZERO_ADJUST).every((k) => (adjust[k] || 0) === ZERO_ADJUST[k])
}
