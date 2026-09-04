// How wide is a brand glyph's INK, and how large may we draw it?
//
// The Icon Library grid gave every entry a 24 x 24 square slot. A large share of
// brand artwork is a horizontal lockup, so it letterboxed to an illegible strip:
// `logos/aerospike` measured 24 x 2.1px on /create/icons at 1440x900.
//
// Two different things make a glyph "wide", and a fix that handles one and not
// the other leaves half the grid broken:
//
//   1. A WIDE viewBox. The `logos` pack ships these — 839 of 1,880 entries are
//      off-square and 625 exceed 2:1, worst `rolldown` at 11.8:1 (512 x 43.39).
//      The element's own intrinsic aspect tells you about these.
//   2. A WIDE LOCKUP ON A SQUARE CANVAS. `devicon` ships 422 `-wordmark` entries
//      at 128 x 128 with the lockup drawn small in the middle. The intrinsic
//      aspect is 1:1 and says nothing; only the pixels do.
//
// So the caller rasterises the glyph into a SQUARE raster and hands us the
// bounding box of the opaque pixels. Because that raster is square, drawImage
// has stretched the artwork to fill it, and the ink box measured there is the
// true one divided by the artwork's own aspect — which is exactly what makes one
// number cover both cases when we multiply it back out.
//
// This module is pure so it can be tested without a canvas; the sampling itself
// lives in `sampleGlyph` in src/pages/IconLibrary.jsx.

// Above this ratio the ink is a horizontal lockup rather than a mark, and it
// earns the cell's full width instead of a 24px square. 2.2 rather than 2.0 so a
// 2:1 flag or a slightly oblong mark stays on the square chip it reads fine in.
export const WIDE_INK = 2.2

/**
 * @param {object} m
 * @param {number} m.naturalW  the element's intrinsic width  (img.naturalWidth)
 * @param {number} m.naturalH  the element's intrinsic height (img.naturalHeight)
 * @param {number} m.inkW      ink bounding-box width, in raster columns
 * @param {number} m.inkH      ink bounding-box height, in raster rows
 * @param {number} m.raster    the square raster's side, in pixels
 * @returns {{ar: number, cap: number}}
 *   `ar`  — the ink's TRUE aspect ratio. Compare against WIDE_INK.
 *   `cap` — how many multiples of the slot HEIGHT the element may be drawn wide
 *           before the ink itself grows taller than the slot. The CSS is
 *           `width: min(100%, calc(<slot height> * cap))`, so nothing is ever
 *           cropped: a two-line wordmark simply gets a narrower element than a
 *           one-line one.
 */
export function inkShape({ naturalW, naturalH, inkW, inkH, raster }) {
  const natural = naturalW > 0 && naturalH > 0 ? naturalW / naturalH : 1
  // No ink measured at all (a fully transparent or unreadable raster) degrades
  // to "square", which is the treatment every glyph had before this existed.
  if (!(inkW > 0) || !(inkH > 0) || !(raster > 0)) return { ar: 1, cap: 1 }

  // Undo the square raster's horizontal stretch to recover the true ink aspect.
  const ar = (inkW / inkH) * natural

  // inkHeightOnScreen = elementWidth * (inkH / raster) / natural  <=  slotHeight
  //   => elementWidth <= slotHeight * natural * raster / inkH
  const cap = (natural * raster) / inkH

  return { ar, cap }
}
