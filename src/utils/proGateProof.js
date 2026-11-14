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

// ─────────────────────────────────────────────────────────────────────────────
// THE POPUP'S LEFT PANE: what it shows, and the words that name the lock
// ─────────────────────────────────────────────────────────────────────────────
// The upgrade popup draws one pane per wall, from what the caller already
// holds. A wall with nothing real to show gets no pane and a single column
// rather than decoration.
//
//   system    a clear strip in the Free system on the seed, then the Pro
//             system that was tried, blurred (callers pass `system`, `seed`)
//   colours   the colours already on the board, then the ones past the Free
//             limit, blurred (callers pass `colors`, `limit`, `max`)
//   projects  the saved projects that fill the Free quota (`projects`, `limit`)
//   proof     a node the caller drew from the user's own work (`proof`)
//   none      one column

/** @returns {'system'|'colours'|'projects'|'proof'|'none'} */
export function proGatePane(opts = {}) {
  const { pane, gate, proof, colors, projects, system } = opts
  if (pane) return pane
  const colourWall = showsColourRail(opts)
  if (proof && !colourWall) return 'proof'
  if (colourWall && opts.seed && system) return 'system'
  if (colourWall && Array.isArray(colors) && colors.length >= 2) return 'colours'
  if (Array.isArray(projects) && projects.length) return 'projects'
  if (proof) return 'proof'
  if (colourWall && opts.seed && gate === 'palette-harmony-system') return 'system'
  return 'none'
}

const fill = (text, opts) => text.replace('{name}', opts.name || '')

// lock: the line on the blurred half. reason: finishes "You were about to ...".
// Both can be overridden by the caller (`lock`, `reason`). `{name}` is the
// harmony, brand or scene the caller passes as `name`.
const GATE_META = {
  'palette-harmony-system': { lock: '{name} is a Pro colour system', reason: 'build with the {name} colour system' },
  'palette-colour-cap': { lock: 'More colours are Pro', reason: 'add another colour' },
  'palette-hct-picker': { lock: 'HCT editing is Pro', reason: 'fine-tune a colour in HCT' },
  'palette-variation-apply': { lock: 'More variations with Pro', reason: 'apply a colour variation' },
  'palette-brand-system': { lock: '{name} is a Pro brand system', reason: 'load the {name} brand system' },
  'palette-system-collapse': { lock: '{name} is a Pro colour system', reason: 'build with the {name} colour system' },
  'palette-contrast-view': { lock: 'Contrast view is Pro', reason: 'check contrast in light and dark' },
  'palette-preview-scene': { lock: '{name} is a Pro preview', reason: 'open the {name} preview' },
  'gradient-gallery-edit': { lock: 'Editing this gradient is Pro', reason: 'edit a gallery gradient' },
  'gradient-stop-tints': { lock: 'Applying a tint is Pro', reason: 'tint a gradient stop' },
  'gradient-guided': { lock: 'Guided gradients are Pro', reason: 'build a guided gradient' },
  'icon-copies': { lock: 'More copies are Pro', reason: 'copy another icon' },
  'icon-projects': { lock: 'More saved icon projects are Pro', reason: 'save another icon project' },
  'icon-line-style': { lock: 'Sharp is a Pro line style', reason: 'export in Sharp or Crisp' },
  'icon-export-size': { lock: 'Custom export sizes are Pro', reason: 'export at a custom size' },
  'icon-pro-preview': { lock: 'These export settings are Pro', reason: 'export your Pro settings' },
  'type-save-type-scale': { lock: 'Another saved type system is Pro', reason: 'save another type system' },
}

const UI_SYSTEM_META = { lock: 'Editing the UI system is Pro', reason: 'change the UI system' }

const ordinal = (n) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return n + 'th'
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th')
}

// Lines that name the real numbers the caller passes (limit, max), so the
// popup never states a count the tool does not hold.
function countMeta(opts, gate) {
  const { limit, max } = opts
  if (typeof limit !== 'number') return null
  if (gate === 'palette-colour-cap' && typeof max === 'number' && max > limit) {
    const span = max - limit
    return {
      lock: span === 1 ? `Colour ${max} is Pro` : span === 2 ? `Colours ${limit + 1} and ${max} are Pro` : `Colours ${limit + 1} to ${max} are Pro`,
      reason: `add a ${ordinal(limit + 1)} colour`,
    }
  }
  if (gate === 'type-save-type-scale') return { lock: `A ${ordinal(limit + 1)} project needs Pro` }
  if (gate === 'icon-projects') return { lock: `${limit} of ${limit} projects` }
  if (gate === 'icon-copies') return { lock: `${limit} of ${limit} copies today` }
  return null
}

/**
 * The words that name the lock for this wall.
 * @returns {{lock: string, reason: string, caption: string}}
 */
export function proGateMeta(opts = {}) {
  const gate = typeof opts.gate === 'string' ? opts.gate : ''
  const base = GATE_META[gate] || (gate.startsWith('ui-system-') ? UI_SYSTEM_META : null)
  const counted = countMeta(opts, gate) || {}
  const lock = opts.lock || counted.lock || (base ? fill(base.lock, opts) : 'This is a Pro feature')
  const reason = opts.reason || counted.reason || (base ? fill(base.reason, opts) : '')
  return { lock: lock.replace(/^\s+/, ''), reason, caption: opts.caption || '' }
}
