import { isMulticolourSvg } from './iconPaint.js'

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
