// WHICH PRO WALL GETS THE COLOUR RAIL, and why it is not all of them.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────
// ProUpgradeModal renders ProHarmonyPreview beside the offer: five to eight
// colour systems, generated from the user's own seed by the same functions the
// palette tools run. On a palette wall that panel IS the product — it shows the
// thing the subscription buys, made from the thing the user was just working
// on.
//
// It used to render on EVERY wall. So the icon library's line-styles wall, the
// UI-system builder's walls and the type-system save wall all opened onto a
// column of colour harmonies — evidence for a product the person was not being
// sold. And because resolvePaletteSeed always finds a seed (the explicit one,
// then the last palette this browser touched, then the brand accent), it never
// degraded to nothing and never looked broken. It looked like proof.
//
// That is the most AI-slop thing a paywall can do: a panel that has the shape
// of evidence and the content of decoration, repeated identically on every
// surface so that no wall feels like it is about the thing you clicked.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE RULE
// ─────────────────────────────────────────────────────────────────────────────
// Two signals, both of which the call sites already send for other reasons, so
// no caller had to be changed:
//
//   · an explicit `seed` — which is a caller saying "this wall is about THIS
//     colour". ExportPanel passes design.palette.colors[0] because the export
//     it is gating is a document about that palette.
//   · a `gate` id in the palette family — the walls where colour systems, the
//     colour cap, HCT editing, contrast and brand systems are the product.
//
// Anything else gets no rail, and ProUpgradeModal narrows to a single column
// (`.ui-pro--norail`) rather than showing a 900px dialog with an empty half.
//
// Kept out of the component because src/config/plans.js already records why:
// a value exported alongside a component trips react-refresh and breaks fast
// refresh. It is also the only way to test this rule without a DOM.

/** Gate ids whose product is colour. Matched as a prefix, so `palette-hct-picker`
 *  and any wall added to PaletteBuilder later are covered by existing. */
export const COLOUR_GATE_PREFIX = 'palette'

/**
 * Should this Pro wall show the colour-systems rail?
 *
 * @param {object} [opts] the same object passed to openProModal
 * @param {string} [opts.gate] which wall fired
 * @param {string} [opts.seed] the exact colour the wall fired on, if the caller knows it
 * @returns {boolean} true when colour is genuinely what is being sold here
 */
export function showsColourRail(opts = {}) {
  if (opts.seed) return true
  return typeof opts.gate === 'string' && opts.gate.startsWith(COLOUR_GATE_PREFIX)
}
