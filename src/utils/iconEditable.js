// Which icons the customiser can restyle (line weight, ends, corners), decided
// without loading any markup so a gallery tile can say so up front.
import { matchesRegular } from '../data/iconRegularRules.js'
import { markupHasStroke } from './iconStroke.js'

// Packs that draw in their own colours: the stroke controls never apply.
export const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'token-branded',
  'meteocons',
])

// Packs whose default style is genuinely stroke-based (the stroke slider applies).
export const STROKE_PACKS = new Set(['lucide', 'tabler', 'iconoir', 'heroicons'])

// The pack-list guess for a CDN icon before its artwork is known.
export function cdnPackIsStroke(pack, name) {
  if (COLORED_PACKS.has(pack)) return false
  return STROKE_PACKS.has(pack) && matchesRegular(pack, name)
}

// Whether a gallery tile's icon is a stroke icon the customiser can restyle.
export function isGalleryEditable(icon) {
  if (!icon) return false
  if (icon.logo) return false
  if (icon.custom) return !!icon.isStroke
  if (icon.svg) return markupHasStroke(icon.svg)
  if (icon.cdn) return cdnPackIsStroke(icon.pack, icon.name)
  return !icon.filled
}
