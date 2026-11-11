import { isMulticolourSvg, isNearBlackMono, singlePaint } from './iconPaint.js'
import { contrastRatio, luminance, hexToRgb } from './colors.js'

// What the customiser's Colour row shows for an icon.
//
//   choose    the Default / Black / White choice and the picker
//   original  plain text: the art keeps its own colours, so there is nothing to choose
//   brand     one-colour art that is not near-black (a brand's red or blue): it is drawn
//             in that colour until another is chosen, so the row offers the colour
//             (`paint`) as "Original" beside the usual choices
//   wait      the art's markup has not arrived, so whether it has colours is unknown;
//             the row holds its height and shows nothing
//
// `coloured` is whether the art is drawn in its own colours. While the markup is
// unknown a coloured-pack icon counts as coloured (the stage sits on the theme
// ground until the art says otherwise), but the row stays neutral: a one-colour
// near-black logo must never flash "Original colours" before it settles on Black / White.
// A failed load will never settle, so it reads as coloured rather than waiting.
//
// One-colour near-black art is the page's ink in the grid, so it stays a mono icon here.
// `inkDarkMax` is the luminance below which the grid reads art as near-black; passing
// the grid's own limit keeps the two from disagreeing about a logo. Left out, it is the
// grid's limit as it stands (INK_DARK_MAX in IconLibrary.jsx), so a caller that omits it
// still reads art as the grid does.
//
// Once a colour is chosen (`colourChosen`) a brand logo is recoloured like a mono icon,
// so it is no longer drawn in its own colours (`coloured` false); the row stays 'brand'
// so "Original" is still there to go back to.
export function colourRowState({ inColouredPack, svg, failed = false, inkDarkMax = 0.05, colourChosen = false }) {
  if (!inColouredPack) return { coloured: false, row: 'choose' }
  if (!svg) return { coloured: true, row: failed ? 'original' : 'wait' }
  if (isMulticolourSvg(svg)) return { coloured: true, row: 'original' }
  const paint = singlePaint(svg)
  if (paint && !isNearBlackMono(svg, inkDarkMax)) return { coloured: !colourChosen, row: 'brand', paint }
  return { coloured: false, row: 'choose' }
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

// The ground colours of the editor's stage, per theme. This table is the one source:
// the contrast note measures these, the editor paints its Light and Dark plates and
// swatches from them (`groundVars`, written on the dialog root), and the upgrade
// preview draws on them. `page` is the stage's own colour (the CSS `--ied-stage`; a
// unit test keeps the two equal). The checker is a pair of squares in the CSS; the
// note measures the darker one, the harder case, and a unit test keeps the CSS pair
// equal to this one.
const GROUNDS_BY_THEME = Object.freeze({
  dark: Object.freeze({ page: '#060607', light: '#EFEEEA', dark: '#18181B', checker: ['#242426', '#393A3C'] }),
  light: Object.freeze({ page: '#F6F5F1', light: '#FFFFFF', dark: '#18181B', checker: ['#FAFAF8', '#DEDDD6'] }),
})
const themeGrounds = (theme) => GROUNDS_BY_THEME[theme === 'light' ? 'light' : 'dark']
const lum = (hex) => luminance(...hexToRgb(hex))
const darker = (pair) => (lum(pair[0]) <= lum(pair[1]) ? pair[0] : pair[1])
export const groundHex = (ground, theme) => {
  const g = themeGrounds(theme)
  return ground === 'checker' ? darker(g.checker) : g[ground]
}
// The custom properties the dialog root carries for the two fixed plates.
export const groundVars = (theme) => {
  const g = themeGrounds(theme)
  return { '--ied-g-light': g.light, '--ied-g-dark': g.dark }
}
// The checker as a data: URI (cell px square), for places that cannot read the stylesheet.
export function checkerUri(theme, cell = 8) {
  const [a, b] = themeGrounds(theme).checker
  const enc = (h) => `%23${h.slice(1)}`
  const s = cell * 2
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'%3E%3Crect width='${s}' height='${s}' fill='${enc(a)}'/%3E%3Crect width='${cell}' height='${cell}' fill='${enc(b)}'/%3E%3Crect x='${cell}' y='${cell}' width='${cell}' height='${cell}' fill='${enc(b)}'/%3E%3C/svg%3E`
}

// Below this the icon is hard to make out (WCAG's floor for graphical objects).
export const GROUND_MIN_CONTRAST = 3

// A note, never an automatic switch: the person decides. Returns null when the icon
// reads on the ground, else `{ suggest }`, the fixed ground it would read best on
// ('light' or 'dark'), or null when neither of those gets it to the floor either.
export function groundContrastNote({ ink, ground, theme }) {
  if (contrastRatio(ink, groundHex(ground, theme)) >= GROUND_MIN_CONTRAST) return null
  const onLight = contrastRatio(ink, groundHex('light', theme))
  const onDark = contrastRatio(ink, groundHex('dark', theme))
  const best = onLight >= onDark ? 'light' : 'dark'
  const ok = Math.max(onLight, onDark) >= GROUND_MIN_CONTRAST && best !== ground
  return { suggest: ok ? best : null }
}
