// ships with the export themes
// The export pages the homepage showcase shows: eight page kinds in every theme.
//
// Each page is encoded twice, at a thumbnail size (600px tall) and a large size
// (1000px tall, for the page viewer), each as AVIF with a WebP fallback. The files
// are in public/home-showcase/<theme id>/<kind id>-<t|l>.<avif|webp>. Every page in
// a theme has the same shape, so the pixel sizes below are per theme.

/** The page kinds in picker order. `label` is the tab text and the word in alt text. */
export const SHOWCASE_KINDS = Object.freeze([
  Object.freeze({ id: 'guide-cover', label: 'Cover' }),
  Object.freeze({ id: 'guide-logo', label: 'Logo' }),
  Object.freeze({ id: 'guide-palette', label: 'Colour' }),
  Object.freeze({ id: 'guide-typefaces', label: 'Type' }),
  Object.freeze({ id: 'guide-signage', label: 'Signage' }),
  Object.freeze({ id: 'guide-social', label: 'Social' }),
  Object.freeze({ id: 'kit-buttons', label: 'Buttons' }),
  Object.freeze({ id: 'kit-screen-light', label: 'Screen' }),
])

/** How many of a theme's pages the viewer steps through. */
export const VIEWER_PAGE_COUNT = 5

/**
 * The page kinds the viewer opens for one theme: the kind that was clicked, then the
 * kinds after it in picker order, wrapping round. Every one is an existing export render.
 */
export function viewerKinds(kindId) {
  const from = SHOWCASE_KINDS.findIndex((k) => k.id === kindId)
  if (from < 0) throw new Error(`unknown showcase page kind ${kindId}`)
  return Array.from({ length: VIEWER_PAGE_COUNT }, (_, at) => SHOWCASE_KINDS[(from + at) % SHOWCASE_KINDS.length].id)
}

/** The kind selected on load. */
export const DEFAULT_KIND_ID = 'guide-palette'

// Pixel sizes of the encoded files: [width, height].
const SIZES = Object.freeze({
  '01-presentation': { thumb: [1067, 600], large: [1778, 1000] },
  '02-poster': { thumb: [1067, 600], large: [1778, 1000] },
  '03-broadsheet': { thumb: [1067, 600], large: [1778, 1000] },
  '04-standards': { thumb: [850, 600], large: [1416, 1000] },
  '05-specimen': { thumb: [424, 600], large: [706, 1000] },
  '06-studio': { thumb: [424, 600], large: [706, 1000] },
  '07-spec': { thumb: [424, 600], large: [706, 1000] },
  '08-monograph': { thumb: [424, 600], large: [706, 1000] },
  '09-blueprint': { thumb: [424, 600], large: [706, 1000] },
  '10-inuse': { thumb: [424, 600], large: [706, 1000] },
})

const DIR = '/home-showcase'

const variant = (themeId, kindId, tag, [width, height]) => ({
  avif: `${DIR}/${themeId}/${kindId}-${tag}.avif`,
  webp: `${DIR}/${themeId}/${kindId}-${tag}.webp`,
  width,
  height,
})

/** The two encodes of one page: `{ thumb, large }`, each `{ avif, webp, width, height }`. */
export function showcaseImage(themeId, kindId) {
  const size = SIZES[themeId]
  if (!size) throw new Error(`no showcase pages for theme ${themeId}`)
  if (!SHOWCASE_KINDS.some((k) => k.id === kindId)) throw new Error(`unknown showcase page kind ${kindId}`)
  return {
    thumb: variant(themeId, kindId, 't', size.thumb),
    large: variant(themeId, kindId, 'l', size.large),
  }
}

/** Width over height of a theme's pages. */
export const showcaseRatio = (themeId) => {
  const [w, h] = SIZES[themeId].thumb
  return w / h
}
