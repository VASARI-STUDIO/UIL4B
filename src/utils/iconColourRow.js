import { isMulticolourSvg } from './iconPaint'

// What the customiser's Colour row shows for an icon.
//
//   choose    the Default / Black / White choice and the picker
//   original  plain text: the art keeps its own colours, so there is nothing to choose
//
// `coloured` is whether the art is drawn in its own colours. While the markup is
// unknown a coloured-pack icon counts as coloured: the stage sits on the theme
// ground until the art says otherwise.
export function colourRowState({ inColouredPack, svg }) {
  if (!inColouredPack) return { coloured: false, row: 'choose' }
  if (!svg || isMulticolourSvg(svg)) return { coloured: true, row: 'original' }
  return { coloured: false, row: 'choose' }
}
