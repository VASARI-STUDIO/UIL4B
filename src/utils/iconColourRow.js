import { isMulticolourSvg } from './iconPaint.js'
import { contrastRatio } from './colors.js'

// What the customiser's Colour row shows for an icon.
//
//   choose    the Default / Black / White choice and the picker
//   original  plain text: the art keeps its own colours, so there is nothing to choose
//   wait      the art's markup has not arrived, so whether it has colours is unknown;
//             the row holds its height and shows nothing
//
// `coloured` is whether the art is drawn in its own colours. While the markup is
// unknown a coloured-pack icon counts as coloured (the stage sits on the theme
// ground until the art says otherwise), but the row stays neutral: a one-colour
// logo must never flash "Original colours" before it settles on Black / White.
// A failed load will never settle, so it reads as coloured rather than waiting.
export function colourRowState({ inColouredPack, svg, failed = false }) {
  if (!inColouredPack) return { coloured: false, row: 'choose' }
  if (!svg) return { coloured: true, row: failed ? 'original' : 'wait' }
  return isMulticolourSvg(svg) ? { coloured: true, row: 'original' } : { coloured: false, row: 'choose' }
}

// Which of the four colour choices a colour value is. The value is '' for "Text
// colour" (the file keeps currentColor), else a hex. Black and white are compared
// case-insensitively so a saved icon or the picker's own output still lands on its chip.
export function colourChoice(color) {
  if (!color) return 'text'
  const c = String(color).toLowerCase()
  return c === '#000000' ? 'black' : c === '#ffffff' ? 'white' : 'custom'
}

// The preview ground is its own choice and nothing else changes it. These are the
// four grounds; `page` follows the theme, the other three are fixed.
export const GROUNDS = Object.freeze(['page', 'light', 'dark', 'checker'])
export const GROUND_DEFAULT = 'page'
export const normaliseGround = (v) => (GROUNDS.includes(v) ? v : GROUND_DEFAULT)

// The ground colours the contrast note measures against. `page` is the theme's own
// page ground (--bg-0). The checker is measured on its darker square, the harder case.
// Light and Dark are each at least 1.2:1 from the page ground they share a theme with
// (Light #DEDEE2 against #F5F5F2 is 1.23:1, Dark #202024 against #060607 is 1.25:1),
// so choosing the matching fixed ground visibly changes the stage. White cannot do
// that on the light page (1.09:1). Keep these in step with the swatch and stage
// classes in icon-emoji-library.css and library.css; the unit test compares them.
const GROUND_HEX = Object.freeze({ light: '#DEDEE2', dark: '#202024', checker: '#D9D9DE' })
const PAGE_HEX = Object.freeze({ light: '#F5F5F2', dark: '#060607' })
export const groundHex = (ground, theme) => (
  ground === 'page' ? (theme === 'light' ? PAGE_HEX.light : PAGE_HEX.dark) : GROUND_HEX[ground]
)

// Below this the icon is hard to make out (WCAG's floor for graphical objects).
export const GROUND_MIN_CONTRAST = 3

// A note, never an automatic switch: the person decides. Returns null when the icon
// reads on the ground, else `{ suggest }`, the fixed ground it would read best on
// ('light' or 'dark'), or null when neither of those gets it to the floor either.
export function groundContrastNote({ ink, ground, theme }) {
  if (contrastRatio(ink, groundHex(ground, theme)) >= GROUND_MIN_CONTRAST) return null
  const onLight = contrastRatio(ink, GROUND_HEX.light)
  const onDark = contrastRatio(ink, GROUND_HEX.dark)
  const best = onLight >= onDark ? 'light' : 'dark'
  const ok = Math.max(onLight, onDark) >= GROUND_MIN_CONTRAST && best !== ground
  return { suggest: ok ? best : null }
}
