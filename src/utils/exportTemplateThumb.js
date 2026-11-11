// The picture on a template tile: a real render of the template's cover, written by
// scripts/export-templates/generate.mjs and listed in the generated manifest. A
// template with no entry gets no picture, so the tile stays a card of words.
import { EXPORT_TEMPLATE_THUMBS } from '../data/exportTemplateThumbs.generated.js'

// The tile's drawn width: a third of the phone sheet (100vw less 16px of sheet padding on
// each side and two 8px gaps), and 162px in the 560px dialog.
export const TILE_SIZES = '(max-width: 560px) calc((100vw - 48px) / 3), 162px'

/** ({ format, id }) -> { src, srcSet, sizes } for the tile, or null. `src` is the middle size. */
export function templateThumb({ format, id }) {
  const entry = EXPORT_TEMPLATE_THUMBS.tiles[format]?.[id]
  if (!entry?.files.length) return null
  const url = (f) => `${EXPORT_TEMPLATE_THUMBS.dir}${f.file}`
  const mid = entry.files[Math.floor(entry.files.length / 2)]
  return {
    src: url(mid),
    srcSet: entry.files.map((f) => `${url(f)} ${f.width}w`).join(', '),
    sizes: TILE_SIZES,
  }
}
