// The project-aware preset groups the colour picker offers above its generic
// swatches: the colours of the working palette, then the semantic colours the
// project generates (Success, Warning, Error, Information).
//
// Pure and DOM-free so the grouping, de-duplication and wording can be tested
// without a browser. The picker only renders what this returns.

import { SEMANTIC_LABELS, SEMANTIC_ROLES, SEMANTIC_STEPS, semanticShades } from '../data/semanticPresets.js'
import { normalizeHex } from './colorFormats.js'
import { DEFAULT_DESIGN } from '../data/designDefaults.js'

export const PALETTE_GROUP_LABEL = 'Your palette'
export const SEMANTIC_GROUP_LABEL = 'Semantic'

// The semantic ramp step that stands for the role: the 500 shade, the one the
// Semantic Colour tool treats as the base.
const SEMANTIC_STEP_INDEX = SEMANTIC_STEPS.indexOf('500')

/**
 * `{ id, label, items: [{ hex, label }] }` groups, empty groups left out.
 *
 * - `palette`: the design's palette colours (`design.palette.colors`).
 * - `states`: the design's saved semantic selections (`design.states`). Absent,
 *   not an object, or still the defaults every new design starts with means the
 *   person has not chosen any, so there is no group: four colours nobody picked
 *   would only repeat the stock swatches.
 * - `exclude`: colours the picker already shows another way. They are dropped
 *   so a swatch never appears twice.
 *
 * `hex` is lowercase `#rrggbb`, the form the picker emits. `label` is the
 * swatch's accessible name, which spells the hex in capitals.
 * A colour is listed once across these groups: the palette keeps it ahead of
 * the semantic group. Recent is not excluded on purpose: choosing a palette
 * colour must not make it vanish from "Your palette" while the picker is open.
 */
const sameStates = (a, b) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  return [...keys].every((k) => a?.[k] === b?.[k])
}

export function buildPickerPresets({ palette, states, exclude = [] } = {}) {
  const seen = new Set((exclude || []).map(normalizeHex).filter(Boolean))
  const take = (raw) => {
    const hex = normalizeHex(raw)
    if (!hex || seen.has(hex)) return null
    seen.add(hex)
    return hex
  }

  const paletteItems = []
  for (const raw of Array.isArray(palette) ? palette : []) {
    const hex = take(raw)
    if (hex) paletteItems.push({ hex, label: `Use ${hex.toUpperCase()} from your palette` })
  }

  const semanticItems = []
  if (states && typeof states === 'object' && !Array.isArray(states) && !sameStates(states, DEFAULT_DESIGN.states)) {
    const shades = semanticShades(states)
    for (const role of SEMANTIC_ROLES) {
      const hex = take(shades[role][SEMANTIC_STEP_INDEX])
      if (hex) semanticItems.push({ hex, label: `Use ${SEMANTIC_LABELS[role]}, ${hex.toUpperCase()}` })
    }
  }

  return [
    { id: 'palette', label: PALETTE_GROUP_LABEL, items: paletteItems },
    { id: 'semantic', label: SEMANTIC_GROUP_LABEL, items: semanticItems },
  ].filter((group) => group.items.length > 0)
}
