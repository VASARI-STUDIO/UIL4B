// THE TWO SIZE CONTROLS, AND THE ORDER THEY HAVE TO BE APPLIED IN.
//
// The File Converter offers a resolution ceiling and a render scale. Until
// 2026-09-15 it multiplied them:
//
//   scale = (maxDim > 0 && longest > maxDim ? maxDim / longest : 1) * renderScale
//
// so a 4000px image with the ceiling set to 1920 and the scale set to @2x came
// out at 3840px. A control labelled "Max Dimension" that does not cap is not a
// rounding error, it is the label lying, and the encoder's own error string had
// already noticed — it read "Too large to export at @Nx — reduce Max Dimension",
// which is an admission that the maximum could be exceeded.
//
// THE ORDER IS: SCALE, THEN CAP. The render scale says what you want; the
// ceiling says what you will accept. A ceiling applied last is a ceiling.
//
// This lives outside the page component because the page needs the same answer
// twice — once to encode and once to TELL the user what they are about to get,
// which it never did — and because a helper exported from a component file
// trips react-refresh/only-export-components.

/** Longest side any browser will reliably hand back from canvas.toBlob. */
export const MAX_CANVAS_DIM = 16384

/**
 * Output pixel size for one source image.
 *
 * @param {number} iw source width
 * @param {number} ih source height
 * @param {{maxDim?: number, renderScale?: number}} opts
 *   maxDim 0 or absent means no ceiling; renderScale defaults to 1.
 * @returns {{w: number, h: number, scale: number, capped: boolean}}
 */
export function outputDimensions(iw, ih, { maxDim = 0, renderScale = 1 } = {}) {
  const sw = Number(iw) > 0 ? Number(iw) : 1
  const sh = Number(ih) > 0 ? Number(ih) : 1
  const wanted = Number(renderScale) > 0 ? Number(renderScale) : 1

  // 1 — what was asked for.
  const longestScaled = Math.max(sw, sh) * wanted
  // 2 — what the ceiling allows. Only ever reduces.
  const ceiling = Number(maxDim) > 0 ? Number(maxDim) : Infinity
  const capFactor = longestScaled > ceiling ? ceiling / longestScaled : 1

  const scale = wanted * capFactor
  return {
    w: Math.max(1, Math.round(sw * scale)),
    h: Math.max(1, Math.round(sh * scale)),
    scale,
    capped: capFactor < 1,
  }
}

/** True when the requested output cannot be encoded by a browser canvas. */
export function exceedsCanvasLimit(w, h) {
  return Math.max(w, h) > MAX_CANVAS_DIM
}

// ── The sizes offered, and why they are named rather than numbered ──────────
//
// Founder, 2026-09-15: "max dimensions should be resolution scales, such as 4k,
// 2k, 1k, 720p." The list read 3840 / 1920 / 1200 / 800 — four bare numbers,
// two of which (1200, 800) correspond to nothing anyone names.
//
// Each entry carries BOTH the name and the pixel count, because the two
// conventions genuinely disagree: "2K" is 2048px in the DCI sense and 2560px in
// the consumer QHD sense, and "1K" at 1024px is SMALLER than 720p at 1280px.
// Printing the number beside the name means the list never has to be guessed
// at, and the ordering below is by pixels descending so the menu reads as a
// ladder even where the names do not.
export const SIZE_PRESETS = [
  { id: 0, label: 'Keep original size' },
  { id: 3840, label: '4K — 3840 px' },
  { id: 2560, label: '2K — 2560 px' },
  { id: 1920, label: 'Full HD — 1920 px' },
  { id: 1280, label: '720p — 1280 px' },
  { id: 1024, label: '1K — 1024 px' },
  { id: 640, label: 'Small — 640 px' },
]

// Render scales. Everything below @1x is new: the control offered @1x and @2x
// only, so the tool could enlarge and could not shrink, and "export it smaller"
// had to be done through the ceiling — which is a different idea and, until the
// order was fixed above, did not work either.
export const EXPORT_SCALES = [
  { id: 0.25, label: '@0.25x' },
  { id: 0.5, label: '@0.5x' },
  { id: 0.75, label: '@0.75x' },
  { id: 1, label: '@1x' },
  { id: 2, label: '@2x' },
  { id: 3, label: '@3x' },
]
